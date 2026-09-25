/** Frontend-safe SSO redirect helpers. Crypto lives in supabase/functions/_shared/ssoProtocol.ts. */

export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

export function buildSsoRedirectUrl(origin: string, code: string, state: string): string {
  if (!code || !state) throw new Error('SSO parametreleri eksik.');
  if (/access_token|refresh_token/i.test(code) || /access_token|refresh_token/i.test(state)) {
    throw new Error('SSO kodu geçersiz.');
  }
  if (code.split('.').length === 3 && code.length > 80) throw new Error('SSO kodu geçersiz.');
  if (code.length > 128 || state.length > 128) throw new Error('SSO kodu geçersiz.');
  const url = new URL(`${new URL(origin).origin}/sso`);
  url.searchParams.set('code', code);
  url.searchParams.set('state', state);
  const href = url.toString();
  if (/access_token|refresh_token/i.test(href)) throw new Error('SSO yönlendirmesi reddedildi.');
  return href;
}
