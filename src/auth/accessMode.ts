/**
 * Access mode gate.
 *
 * The workspace used to open with a hard-coded psychologist identity whenever
 * Supabase was not configured, which meant a production build without `.env`
 * served the full clinical dashboard with no authentication at all. Access is
 * now decided in one place:
 *
 *   cloud     — Supabase configured, real login required
 *   local-dev — no Supabase, but a development build; local workspace allowed
 *   not-ready — no Supabase in a production build; nothing clinical is served
 *
 * `isDev` must come from `import.meta.env.DEV`, which Vite replaces statically
 * at build time, so a production bundle can never resolve to `local-dev`.
 */

export type AccessMode = 'cloud' | 'local-dev' | 'not-ready';

export function resolveAccessMode(input: { configured: boolean; isDev: boolean }): AccessMode {
  if (input.configured) return 'cloud';
  return input.isDev ? 'local-dev' : 'not-ready';
}

export function clinicalAccessAllowed(mode: AccessMode): boolean {
  return mode !== 'not-ready';
}
