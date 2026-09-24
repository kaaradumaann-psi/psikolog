import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AUTH_STORAGE_KEY, createAuthStorage } from './authStorage';

export { AUTH_STORAGE_KEY, createAuthStorage } from './authStorage';

// import.meta.env only in Vite/esbuild, not in Node test runner (tsx) — safe access
const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

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

const url = safeSupabaseOrigin(viteEnv.VITE_SUPABASE_URL);
const anonKey = viteEnv.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

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
