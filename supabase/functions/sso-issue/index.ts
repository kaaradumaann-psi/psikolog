import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { configuredOrigins, corsHeaders, isAllowedOrigin, jsonResponse } from '../_shared/edgeCors.ts';
import { mmpiSsoRedirect } from '../_shared/ssoProtocol.ts';
import { issueSsoCode, type SsoStore } from '../_shared/ssoPolicy.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
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

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function origins(): string[] {
  return configuredOrigins(Deno.env.get('ALLOWED_ORIGINS') ?? '');
}

function mmpiAllowedRedirects(): string[] {
  const raw = (Deno.env.get('MMPI_SSO_ORIGIN') ?? 'https://mmpi.halilkaraduman.com.tr')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return raw.flatMap((value) => {
    try {
      return [mmpiSsoRedirect(value)];
    } catch {
      return [];
    }
  });
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

    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse(request, allowed, 401, { error: 'Authentication required' });
    }
    const token = authorization.slice('Bearer '.length);
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authData.user) return jsonResponse(request, allowed, 401, { error: 'Authentication required' });

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id,role,active')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (profileError || !profile || profile.active !== true) {
      return jsonResponse(request, allowed, 403, { error: 'Account is not active' });
    }

    const declaredLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > 8 * 1024) {
      return jsonResponse(request, allowed, 413, { error: 'Request too large' });
    }
    let body: { state?: unknown; redirectUri?: unknown; userId?: unknown };
    try {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > 8 * 1024) {
        return jsonResponse(request, allowed, 413, { error: 'Request too large' });
      }
      body = JSON.parse(rawBody) as { state?: unknown; redirectUri?: unknown; userId?: unknown };
    } catch {
      return jsonResponse(request, allowed, 400, { error: 'Invalid request' });
    }

    if (typeof body.state !== 'string' || typeof body.redirectUri !== 'string') {
      return jsonResponse(request, allowed, 400, { error: 'Invalid request' });
    }

    const issued = await issueSsoCode(supabaseStore(), {
      userId: authData.user.id,
      audience: 'mmpi',
      redirectUri: body.redirectUri,
      state: body.state,
      allowedRedirects: mmpiAllowedRedirects(),
    });
    if (!issued.ok) return jsonResponse(request, allowed, issued.status, { error: issued.error });

    await adminClient.from('audit_logs').insert({
      organization_id: null,
      actor: authData.user.id,
      action: 'sso_issue',
      target_table: 'sso_authorization_codes',
      target_id: authData.user.id,
    });

    return jsonResponse(request, allowed, 200, {
      code: issued.code,
      expiresAt: new Date(issued.expiresAt).toISOString(),
    });
  } catch (error) {
    console.error('sso-issue handler failed', error);
    if (error instanceof ValidationError) return jsonResponse(request, allowed, 400, { error: error.message });
    return jsonResponse(request, allowed, 500, { error: 'İstek işlenemedi' });
  }
});
