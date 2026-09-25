export function configuredOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => {
      try {
        const parsed = new URL(value);
        const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
        if (
          (!local && parsed.protocol !== 'https:') ||
          (local && !['http:', 'https:'].includes(parsed.protocol)) ||
          parsed.pathname !== '/' ||
          parsed.username ||
          parsed.password ||
          parsed.search ||
          parsed.hash
        ) {
          return [];
        }
        return [parsed.origin];
      } catch {
        return [];
      }
    });
}

export function isAllowedOrigin(origin: string, configured: string[]): boolean {
  if (configured.length > 0) return configured.includes(origin);
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

export function corsHeaders(request: Request, configured: string[]): HeadersInit {
  const origin = request.headers.get('origin');
  const result: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sso-timestamp, x-sso-nonce, x-sso-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
  if (origin && isAllowedOrigin(origin, configured)) result['Access-Control-Allow-Origin'] = origin;
  return result;
}

export function jsonResponse(request: Request, configured: string[], status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request, configured) });
}
