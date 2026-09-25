import { MMPI_ORIGIN } from '../lib/mmpiOrigin';
import { buildSsoRedirectUrl, randomToken } from '../lib/ssoRedirect';
import { requireSupabase } from './supabaseClient';

const STATE_KEY = 'psikolog-sso-state';

export async function startMmpiSso(): Promise<void> {
  const state = randomToken(24);
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch {
    /* private mode */
  }
  const redirectUri = `${MMPI_ORIGIN}/sso`;
  const { data, error } = await requireSupabase().functions.invoke('sso-issue', {
    body: { state, redirectUri },
  });
  if (error) throw new Error('MMPI oturumu başlatılamadı.');
  const payload = data as { error?: string; code?: string };
  if (payload?.error || typeof payload?.code !== 'string') {
    throw new Error('MMPI oturumu başlatılamadı.');
  }
  const target = buildSsoRedirectUrl(MMPI_ORIGIN, payload.code, state);
  window.location.assign(target);
}
