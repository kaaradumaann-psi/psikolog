/** Portable SSO crypto (Node 22 + Deno). No secrets, no Node-only APIs. */

export const SSO_TTL_MS = 60_000;
export const HMAC_MAX_SKEW_MS = 60_000;
export const SSO_AUDIENCE_MMPI = 'mmpi';
export const MIN_HMAC_SECRET_LENGTH = 32;

const encoder = new TextEncoder();

export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary);
  return base64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return bytesToHex(new Uint8Array(signature));
}

export function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

export function looksLikeJwtOrAccessToken(value: string): boolean {
  if (/access_token|refresh_token|service_role/i.test(value)) return true;
  if (value.split('.').length === 3 && value.length > 80) return true;
  return false;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

export async function signRequest(input: {
  secret: string;
  timestampMs: number;
  nonce: string;
  body: unknown;
}): Promise<{ timestamp: string; nonce: string; signature: string; bodyHash: string }> {
  if (input.secret.length < MIN_HMAC_SECRET_LENGTH) throw new Error('HMAC secret too short');
  const bodyHash = await sha256Hex(canonicalJson(input.body));
  const timestamp = String(Math.floor(input.timestampMs / 1000));
  const signingString = `${timestamp}.${input.nonce}.${bodyHash}`;
  const signature = await hmacSha256Hex(input.secret, signingString);
  return { timestamp, nonce: input.nonce, signature, bodyHash };
}

export async function verifySignedRequest(input: {
  secret: string;
  timestamp: string;
  nonce: string;
  signature: string;
  body: unknown;
  nowMs?: number;
}): Promise<{ ok: true; bodyHash: string } | { ok: false; error: string; status: number }> {
  if (input.secret.length < MIN_HMAC_SECRET_LENGTH) return { ok: false, error: 'Server misconfigured', status: 503 };
  if (!/^[0-9]{10}$/.test(input.timestamp)) return { ok: false, error: 'Invalid signature', status: 401 };
  if (!input.nonce || input.nonce.length < 16 || input.nonce.length > 128) {
    return { ok: false, error: 'Invalid signature', status: 401 };
  }
  const nowMs = input.nowMs ?? Date.now();
  const tsMs = Number(input.timestamp) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs(nowMs - tsMs) > HMAC_MAX_SKEW_MS) {
    return { ok: false, error: 'Expired signature', status: 401 };
  }
  const expected = await signRequest({
    secret: input.secret,
    timestampMs: tsMs,
    nonce: input.nonce,
    body: input.body,
  });
  if (!timingSafeEqual(expected.signature, input.signature.toLowerCase()) && !timingSafeEqual(expected.signature, input.signature)) {
    return { ok: false, error: 'Invalid signature', status: 401 };
  }
  return { ok: true, bodyHash: expected.bodyHash };
}

export function isAllowedRedirect(redirectUri: string, allowed: readonly string[]): boolean {
  try {
    const parsed = new URL(redirectUri);
    if (parsed.username || parsed.password || parsed.hash) return false;
    const normalized = `${parsed.origin}${parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '')}`;
    return allowed.some((candidate) => candidate === normalized);
  } catch {
    return false;
  }
}

export function mmpiSsoRedirect(origin: string): string {
  const parsed = new URL(origin);
  return `${parsed.origin}/sso`;
}

export function buildSsoRedirectUrl(origin: string, code: string, state: string): string {
  if (!code || !state) throw new Error('SSO parametreleri eksik.');
  if (looksLikeJwtOrAccessToken(code) || looksLikeJwtOrAccessToken(state)) {
    throw new Error('SSO kodu geçersiz.');
  }
  if (code.length > 128 || state.length > 128) throw new Error('SSO kodu geçersiz.');
  const url = new URL(mmpiSsoRedirect(origin));
  url.searchParams.set('code', code);
  url.searchParams.set('state', state);
  const href = url.toString();
  if (/access_token|refresh_token/i.test(href)) throw new Error('SSO yönlendirmesi reddedildi.');
  return href;
}
