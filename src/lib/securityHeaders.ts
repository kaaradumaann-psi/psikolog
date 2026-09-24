/**
 * PHASE-10: Security headers check + CSP reporting stub
 * No PII logging, KVKK minimal
 */

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Resource-Policy': 'same-origin',
} as const;

export const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com",
  "font-src 'self' https://fonts.gstatic.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "worker-src 'self' blob:",
].join('; ');

export function checkSecurityHeaders(headers: Record<string, string>): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const key of Object.keys(SECURITY_HEADERS)) {
    if (!(key.toLowerCase() in Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])))) {
      missing.push(key);
    }
  }
  return { ok: missing.length === 0, missing };
}
