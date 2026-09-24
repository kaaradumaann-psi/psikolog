# Launch Checklist — psikolog.halilkaraduman.com.tr

**Tarih:** 2026-09-24
**Durum:** PHASE-12 DONE, ready for deploy

## Supabase
- [ ] New project created, separate from MMPI
- [ ] VITE_SUPABASE_URL and ANON_KEY in .env and Cloudflare Builds Variables
- [ ] `supabase db push` migrations 20260924000000_initial_schema + 20260924000001_phase03 + 20260924000002_phase04 + 20260924000003_phase05 + 20260924000004_phase06 + 20260924000005_phase07 applied
- [ ] Storage bucket client-documents private exists (migration creates), file_size 50MB, allowlist pdf/jpg/png/webp/doc/docx/txt
- [ ] Auth Email provider Allow new users OFF (public registration closed)
- [ ] First admin: `update profiles set role='ADMIN', active=true where email='ilk-admin@example.com'`
- [ ] Edge Function admin-users deployed: `supabase functions deploy admin-users` + secrets `ALLOWED_ORIGINS=https://psikolog.halilkaraduman.com.tr`
- [ ] RLS enabled all tables, anon revoked, policies checked
- [ ] Audit logs trigger active

## Cloudflare Workers
- [ ] `wrangler.jsonc` name psikolog, assets dist SPA fallback auto-trailing-slash, routes custom_domain psikolog.halilkaraduman.com.tr/*
- [ ] `public/_headers` CSP/HSTS/COOP/COEP/CORP + Cache-Control immutable deployed
- [ ] `npm run build` dist contains index.html, assets js/css
- [ ] `npx wrangler deploy` or Cloudflare Builds auto deploy from main
- [ ] Custom domain DNS CNAME + Cloudflare proxy
- [ ] ENV VITE_SUPABASE_URL/ANON_KEY in Cloudflare Builds

## Security
- [ ] No service_role in frontend, no VITE_ secret
- [ ] _headers CSP: default-src self, connect-src self supabase fonts, img-src self data blob, object-src none, script-src self, style-src self unsafe-inline fonts, frame-ancestors none, HSTS preload
- [ ] Storage PRIVATE, no public URL, signed URL 1h only
- [ ] IDOR tests 21 subtests pass
- [ ] Anon/expired 0 rows or 42501
- [ ] Role escalation blocked (profiles update revoked)
- [ ] Audit logs server-side only
- [ ] Rate limiting design documented, KV pseudo for Edge
- [ ] KVKK minimizasyon, no PII logging, no 3rd party

## Responsive & A11y
- [ ] Viewport meta device-width + viewport-fit=cover
- [ ] responsive.css last import, no !important, no @media print
- [ ] dvh 100dvh
- [ ] Mobile inputs ≥16px @760px
- [ ] Touch ≥44px @720px
- [ ] Skip-link #main-content
- [ ] Desktop 1280px, tablet 768px, mobile 375px manual check

## Tests & CI
- [ ] `npm run typecheck` OK
- [ ] `npm test` 69 pass
- [ ] `npm run build` 693kB gzip 192kB
- [ ] CI .github/workflows/ci.yml verify on main/arena/*
- [ ] E2E specs e2e/critical.spec.ts present, `npx playwright test` manual

## Features
- [ ] Login → Dashboard
- [ ] Clients CRUD file_number auto F-YYYY-XXXXXX unique org retry
- [ ] Client file tabs genel/anamnez/görüşmeler/değerlendirmeler/testler/raporlar/belgeler/notlar/geçmiş
- [ ] Anamnez 1-1 upsert
- [ ] Sessions date Istanbul not future
- [ ] Assessments + test_definitions system+org + test_administrations external_source mmpi + test_results summary
- [ ] Reports block model + autosave 1.4s + versioning 10min + preview safe placeholders + PDF print + optimistic concurrency
- [ ] Documents PRIVATE BUCKET signed URL + notes pinned + audit logs + appointments + tasks + settings antet/logo/imza data URL + admin RPCs + audit page + export/import KVKK + AI stub no diagnosis

## Docs
- [ ] docs/architecture/* PHASE-00
- [ ] docs/ai-progress/PHASE-00..12
- [ ] README fazlar DONE
- [ ] supabase/README.md
- [ ] docs/launch-checklist.md (this file)

## Final
- [ ] `git push origin main` (or arena branch)
- [ ] Cloudflare deploy live https://psikolog.halilkaraduman.com.tr
- [ ] Smoke test live: login, create client, upload doc, create report, print PDF
