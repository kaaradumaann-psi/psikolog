import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { configuredOrigins, corsHeaders, isAllowedOrigin, jsonResponse } from '../_shared/edgeCors.ts';
import { consumeSignedNonce, redeemSsoCode, type SsoStore } from '../_shared/ssoPolicy.ts';
import { randomToken } from '../_shared/ssoProtocol.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const hmacSecret = Deno.env.get('SSO_HMAC_SECRET') ?? '';
let adminClient: ReturnType<typeof createClient> | null = null;
try {
  if (supabaseUrl && serviceRoleKey) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
} catch {
  adminClient = null;
}

function origins(): string[] {
  return configuredOrigins(Deno.env.get('ALLOWED_ORIGINS') ?? '');
}

function supabaseStore(): SsoStore {
  if (!adminClient) throw new Error('missing admin');
  const db = adminClient;
  return {
    async putCode(row) {
      const { error } = await db.from('sso_authorization_codes').insert({
        code_hash: row.codeHash,
        user_id: row.userId,
        audience: row.audience,
        redirect_uri: row.redirectUri,
        state_hash: row.stateHash,
        expires_at: new Date(row.expiresAt).toISOString(),
        used_at: null,
      });
      if (error) throw error;
    },
    async getCodeByHash(codeHash) {
      const { data, error } = await db
        .from('sso_authorization_codes')
        .select('code_hash,user_id,audience,redirect_uri,state_hash,expires_at,used_at')
        .eq('code_hash', codeHash)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        codeHash: data.code_hash as string,
        userId: data.user_id as string,
        audience: data.audience as string,
        redirectUri: data.redirect_uri as string,
        stateHash: data.state_hash as string,
        expiresAt: new Date(data.expires_at as string).getTime(),
        usedAt: data.used_at ? new Date(data.used_at as string).getTime() : null,
      };
    },
    async markUsed(codeHash, usedAt) {
      const { data, error } = await db
        .from('sso_authorization_codes')
        .update({ used_at: new Date(usedAt).toISOString() })
        .eq('code_hash', codeHash)
        .is('used_at', null)
        .select('code_hash');
      if (error) throw error;
      return (data ?? []).length === 1;
    },
    async putNonce(nonceHash, expiresAt) {
      await db.from('sso_replay_nonces').delete().lt('expires_at', new Date().toISOString());
      const { error } = await db.from('sso_replay_nonces').insert({
        nonce_hash: nonceHash,
        expires_at: new Date(expiresAt).toISOString(),
      });
      if (error) {
        if (String((error as { code?: string }).code) === '23505') return false;
        throw error;
      }
      return true;
    },
  };
}

Deno.serve(async (request) => {
  const allowed = origins();
  try {
    const origin = request.headers.get('origin');
    if (origin && !isAllowedOrigin(origin, allowed)) {
      return jsonResponse(request, allowed, 403, { error: 'Origin not allowed' });
    }
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request, allowed) });
    if (request.method !== 'POST') return jsonResponse(request, allowed, 405, { error: 'Method not allowed' });
    if (!supabaseUrl || !serviceRoleKey || !adminClient) {
      return jsonResponse(request, allowed, 500, { error: 'Function configuration is incomplete' });
    }
    if (!hmacSecret) return jsonResponse(request, allowed, 503, { error: 'Server misconfigured' });

    const timestamp = request.headers.get('x-sso-timestamp') ?? '';
    const nonce = request.headers.get('x-sso-nonce') ?? '';
    const signature = request.headers.get('x-sso-signature') ?? '';

    const declaredLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > 8 * 1024) {
      return jsonResponse(request, allowed, 413, { error: 'Request too large' });
    }
    let body: { code?: unknown; state?: unknown; audience?: unknown };
    try {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > 8 * 1024) {
        return jsonResponse(request, allowed, 413, { error: 'Request too large' });
      }
      body = JSON.parse(rawBody) as { code?: unknown; state?: unknown; audience?: unknown };
    } catch {
      return jsonResponse(request, allowed, 400, { error: 'Invalid request' });
    }

    const signed = await consumeSignedNonce(supabaseStore(), {
      secret: hmacSecret,
      timestamp,
      nonce,
      signature,
      body,
    });
    if (!signed.ok) return jsonResponse(request, allowed, signed.status, { error: signed.error });

    if (typeof body.code !== 'string' || typeof body.state !== 'string') {
      return jsonResponse(request, allowed, 400, { error: 'Invalid request' });
    }
    const audience = typeof body.audience === 'string' ? body.audience : 'mmpi';
    const redeemed = await redeemSsoCode(supabaseStore(), {
      code: body.code,
      state: body.state,
      audience,
    });
    if (!redeemed.ok) return jsonResponse(request, allowed, redeemed.status, { error: redeemed.error });

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id,email,first_name,last_name,role,active,global_user_id')
      .eq('id', redeemed.userId)
      .maybeSingle();
    if (profileError || !profile || profile.active !== true) {
      return jsonResponse(request, allowed, 403, { error: 'Account is not active' });
    }

    let globalUserId = typeof profile.global_user_id === 'string' ? profile.global_user_id : null;
    if (!globalUserId) {
      globalUserId = crypto.randomUUID();
      const { error: globalError } = await adminClient
        .from('profiles')
        .update({ global_user_id: globalUserId })
        .eq('id', profile.id)
        .is('global_user_id', null);
      if (globalError) console.error('sso-redeem global_user_id update failed');
    }

    await adminClient.from('audit_logs').insert({
      organization_id: null,
      actor: profile.id,
      action: 'sso_redeem',
      target_table: 'sso_authorization_codes',
      target_id: profile.id,
    });

    return jsonResponse(request, allowed, 200, {
      psychologyUserId: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      role: profile.role,
      globalUserId,
      nonce: randomToken(16),
    });
  } catch (error) {
    console.error('sso-redeem handler failed', error);
    return jsonResponse(request, allowed, 500, { error: 'İstek işlenemedi' });
  }
});
