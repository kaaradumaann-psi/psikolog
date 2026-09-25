import { requireSupabase } from './supabaseClient';

export async function consumeMmpiSso(code: string, state: string): Promise<void> {
  if (!code || !state || /access_token|refresh_token/i.test(code) || /access_token|refresh_token/i.test(state)) {
    throw new Error('SSO kodu geçersiz.');
  }
  const { data, error } = await requireSupabase().functions.invoke('sso-consume', {
    body: { code, state },
  });
  if (error) throw new Error('MMPI oturumu kurulamadı.');
  const payload = data as { error?: string; email?: string; tokenHash?: string; access_token?: string };
  if (payload?.error || !payload?.email || !payload?.tokenHash) throw new Error('MMPI oturumu kurulamadı.');
  if (payload.access_token) throw new Error('MMPI oturumu kurulamadı.');
  const { error: otpError } = await requireSupabase().auth.verifyOtp({
    email: payload.email,
    token_hash: payload.tokenHash,
    type: 'email',
  });
  if (otpError) throw new Error('MMPI oturumu kurulamadı.');
}
