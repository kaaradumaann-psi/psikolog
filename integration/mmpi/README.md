# PHASE 1 MMPI SSO files

These files belong in `kaaradumaann-psi/Repo123`. They do not change scoring, OMR, CaseWorkspace, or `mmpi_records`.

Copy onto the MMPI tree:

- `supabase/migrations/20260925100000_phase1_sso_identity.sql`
- `supabase/functions/_shared/ssoProtocol.ts`
- `supabase/functions/_shared/ssoPolicy.ts`
- `supabase/functions/_shared/edgeCors.ts`
- `supabase/functions/sso-consume/index.ts`
- `src/components/SsoConsumePage.tsx`
- `src/auth/ssoConsume.ts`

Then apply the small router/App/config edits in `PATCHES.md`.

Edge secrets (never `VITE_`):

- `SSO_HMAC_SECRET` — same value as Psychology
- `PSYCHOLOGY_SSO_REDEEM_URL` — `https://<psychology-ref>.supabase.co/functions/v1/sso-redeem`
- `ALLOWED_ORIGINS` — `https://mmpi.halilkaraduman.com.tr`
