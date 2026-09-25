import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AUTH_STORAGE_KEY, createAuthStorage } from './authStorage';

export { AUTH_STORAGE_KEY, createAuthStorage } from './authStorage';

// `import.meta.env` is undefined under the Node test runner (tsx), so read it
// defensively. Vite replaces the whole expression at build time, which is what
// makes the production gate static rather than runtime-negotiable.
const viteEnv = import.meta.env as ImportMetaEnv | undefined;

/**
 * Vite replaces `import.meta.env.DEV` statically: `true` under `vite dev`,
 * `false` in `vite build`. Under the Node test runner it is undefined, which is
 * treated as NOT development — tests must never inherit a development-only
 * bypass by accident.
 */
export const isDevRuntime: boolean = viteEnv?.DEV === true;

function safeSupabaseOrigin(value: string | undefined): string {
  if (!value?.trim()) return '';
  try {
    const parsed = new URL(value.trim());
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (
      (!local && parsed.protocol !== 'https:') ||
      (local && !['http:', 'https:'].includes(parsed.protocol)) ||
      parsed.pathname !== '/' ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      return '';
    return parsed.origin;
  } catch {
    return '';
  }
}

const url = safeSupabaseOrigin(viteEnv?.VITE_SUPABASE_URL);
const anonKey = viteEnv?.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const supabaseConfig = {
  url,
  anonKey,
  configured: Boolean(url && anonKey),
};

export const supabase: SupabaseClient | null = supabaseConfig.configured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        storage: createAuthStorage(),
        storageKey: AUTH_STORAGE_KEY,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase)
    throw new Error(
      'Supabase bağlantısı yapılandırılmamış. VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değişkenlerini tanımlayın.',
    );
  return supabase;
}
