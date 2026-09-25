import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { configuredOrigins, corsHeaders, isAllowedOrigin, jsonResponse } from '../_shared/edgeCors.ts';
import { canonicalJson, randomToken, signRequest } from '../_shared/ssoProtocol.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const hmacSecret = Deno.env.get('SSO_HMAC_SECRET') ?? '';
const redeemUrl = Deno.env.get('PSYCHOLOGY_SSO_REDEEM_URL') ?? '';
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
    if (!hmacSecret || !redeemUrl) return jsonResponse(request, allowed, 503, { error: 'Server misconfigured' });

    const declaredLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > 8 * 1024) {
      return jsonResponse(request, allowed, 413, { error: 'Request too large' });
    }
    let body: { code?: unknown; state?: unknown };
    try {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > 8 * 1024) {
        return jsonResponse(request, allowed, 413, { error: 'Request too large' });
      }
      body = JSON.parse(rawBody) as { code?: unknown; state?: unknown };
    } catch {
      return jsonResponse(request, allowed, 400, { error: 'Invalid request' });
    }
    if (typeof body.code !== 'string' || typeof body.state !== 'string') {
      return jsonResponse(request, allowed, 400, { error: 'Invalid request' });
    }

    const payload = { code: body.code, state: body.state, audience: 'mmpi' };
    const signed = await signRequest({
      secret: hmacSecret,
      timestampMs: Date.now(),
      nonce: randomToken(16),
      body: payload,
    });
    const redeemResponse = await fetch(redeemUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sso-timestamp': signed.timestamp,
        'x-sso-nonce': signed.nonce,
        'x-sso-signature': signed.signature,
      },
      body: canonicalJson(payload),
    });
    const redeemJson = (await redeemResponse.json().catch(() => ({}))) as {
      error?: string;
      email?: string;
      psychologyUserId?: string;
      firstName?: string;
      lastName?: string;
      globalUserId?: string;
    };
    if (!redeemResponse.ok) {
      const status = redeemResponse.status === 409 || redeemResponse.status === 401 || redeemResponse.status === 403
        ? redeemResponse.status
        : 401;
      return jsonResponse(request, allowed, status, { error: 'SSO verification failed' });
    }
    const email = typeof redeemJson.email === 'string' ? redeemJson.email.trim().toLowerCase() : '';
    if (!email) return jsonResponse(request, allowed, 403, { error: 'MMPI account required' });

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id,email,role,active,global_user_id')
      .ilike('email', email)
      .maybeSingle();
    if (profileError || !profile || profile.active !== true) {
      return jsonResponse(request, allowed, 403, { error: 'MMPI account required' });
    }
    if (profile.role !== 'PSYCHOLOG' && profile.role !== 'ADMIN') {
      return jsonResponse(request, allowed, 403, { error: 'MMPI account required' });
    }

    if (typeof redeemJson.psychologyUserId === 'string') {
      await adminClient.from('identity_links').upsert({
        mmpi_user_id: profile.id,
        psychology_user_id: redeemJson.psychologyUserId,
        email,
        updated_at: new Date().toISOString(),
      });
    }
    if (typeof redeemJson.globalUserId === 'string' && !profile.global_user_id) {
      await adminClient.from('profiles').update({ global_user_id: redeemJson.globalUserId }).eq('id', profile.id);
    }

    const { data: link, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkError) {
      console.error('sso-consume generateLink failed');
      return jsonResponse(request, allowed, 500, { error: 'SSO verification failed' });
    }
    const tokenHash = (link as { properties?: { hashed_token?: string } } | null)?.properties?.hashed_token;
    if (!tokenHash) return jsonResponse(request, allowed, 500, { error: 'SSO verification failed' });

    return jsonResponse(request, allowed, 200, { email, tokenHash });
  } catch (error) {
    console.error('sso-consume handler failed', error);
    return jsonResponse(request, allowed, 500, { error: 'İstek işlenemedi' });
  }
});
