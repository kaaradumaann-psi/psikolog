# PHASE 00 — EXISTING PROJECT ARCHITECTURE AUDIT

Status: Completed
Date: 2026-09-24
Branch: arena/01a0d39c-psikolog
Author: Arena AI Agent

---

## Completed

- Repo123 (MMPI) klonlandı ve detaylı incelendi: package.json, src/, src/components/, src/pages (yok, App.tsx içinde), src/omr/, src/scanner/, src/services (yok, auth/records/reports), src/lib, src/utils (yok, validation/lib), supabase/migrations (6), supabase/functions (admin-users, ai-interpretation), vite.config, tsconfig, tests (66), build sistemi (scripts/build.mjs esbuild single-file), deployment (wrangler.jsonc, Cloudflare Workers Static Assets, CI, Strix)
- halilkaraduman.com.tr klonlandı ve incelendi: package.json, src/App.jsx, src/index.css, src/main.jsx, public/_headers, worker/index.js, vite.config.js, wrangler.jsonc, deployment Cloudflare Workers + Resend
- İki repo karşılaştırıldı, tablo oluşturuldu (existing-project-analysis.md)
- Yeni platform mimarisi tasarlandı (new-platform-architecture.md)
- 4 doküman oluşturuldu:
  - docs/architecture/mmpi-analysis.md (13 bölüm, frontend/auth/db/RLS/storage/edge/OMR/scoring/PDF/testing/deployment/security/responsive/strengths/weaknesses/lessons)
  - docs/architecture/psychology-site-analysis.md (12 bölüm, frontend/UI/design system/responsive/routing/Cloudflare/deployment/API/env/security/strengths/weaknesses/lessons)
  - docs/architecture/existing-project-analysis.md (karşılaştırma tablosu + MMPI dersler + psikolog sitesi dersler + sentez + riskler)
  - docs/architecture/new-platform-architecture.md (vizyon, frontend/backend, DB, RLS, storage, routing, component, state, forms, reports/PDF, testing, security, deployment, future MMPI integration, kararlar, faz planı, riskler, başarı kriterleri)
- Kod yazılmadı (PHASE-00 kuralı)

## Files changed

- docs/architecture/mmpi-analysis.md (new, ~800 satır)
- docs/architecture/psychology-site-analysis.md (new, ~500 satır)
- docs/architecture/existing-project-analysis.md (new, ~400 satır)
- docs/architecture/new-platform-architecture.md (new, ~900 satır)
- docs/ai-progress/PHASE-00.md (this file)

## Database changes

- None (PHASE-00 analysis only, no Supabase project yet)

## Tests

- No code tests yet, but existing repos tests analyzed:
  - MMPI: 66 tests, PGlite real Postgres RLS/trigger, build, responsiveContracts, edgeFunctions, security (IDOR, aiSummaryPrivacy)
  - Psych site: no tests
- New platform test plan documented in new-platform-architecture.md: unit+integration+E2E Playwright+DB PGlite+security IDOR+build+browser

## Build

- No build yet (new repo only README)
- Existing repos build analyzed:
  - MMPI: custom esbuild single-file dist/index.html + CSP hash, `npm run typecheck`, `npm test`, `npm run verify:pdf`, `npm run build`, CI checks diff optik-form.html
  - Psych site: Vite build + wrangler deploy, `npm run lint && npm run build`

## Security

- Existing repos security analyzed:
  - MMPI: RLS everywhere, anon revoke, security definer helpers, origin strict, content-length double, control char rejection, escapeHtml, no service_role frontend, audit logs trigger, IDOR, CSP single inline hash, PGlite tests
  - Psych site: _headers CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, honeypot, rate limit Map (in-memory), escapeHtml, Resend key Worker only
- New platform security plan: RLS + storage private + origin strict + audit logs + IDOR tests + CSP + KV rate limit + KVKK minimizasyon + no public URL + no PII to LLM

## Known issues

- None for PHASE-00 (analysis only)
- Risks documented in new-platform-architecture.md: KVKK, IDOR, multi-tenancy, PDF/HTML parity, scope creep, MMPI scoring copy, offline, auth public registration, rate limit, secret leakage

## Next phase

### PHASE-01 — Proje iskeleti + Auth + DB

**Yapılacaklar:**

1. Vite + React 19 + TypeScript init
   - package.json, tsconfig.json (strict, noUncheckedIndexedAccess, noUnusedLocals/Params), vite.config.ts (host 0.0.0.0 allowedHosts .e2b.app), eslint
   - Design tokens: tokens.css (psikolog sitesi :root + MMPI), theme.css, responsive.css (son sırada, dvh, 16px, 44px), print.css
   - Folder structure: src/app/router.ts (MMPI router iyileştirilmiş), src/app/App.tsx, src/features/*, src/components/ui/*, src/components/layout/*, src/auth/*, src/lib/*, src/styles/*
   - UI primitives: Button, Card, Input, Textarea, Select, Modal, Table, Badge, Toast, ConfirmDialog

2. Supabase project kurulum (yeni project)
   - supabase/config.toml, .env.example (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
   - Migrations: organizations, profiles (org FK, role ADMIN/ORG_ADMIN/PSYCHOLOG, active), clients (org_id, file_number unique org içinde), audit_logs, helpers is_active/is_psychologist/is_admin/is_org_member/is_org_admin, set_updated_at trigger, log_audit trigger
   - RLS: her tabloda, anon revoke, org isolation, profiles update/delete revoke (Edge Function only)
   - Seed: first admin SQL instructions in supabase/README.md
   - Storage: private bucket client-documents (faz 6'da kullanılacak ama bucket şimdiden oluştur)

3. Auth
   - supabaseClient.ts safeSupabaseOrigin + sessionStorage PKCE (MMPI)
   - supabaseAuth.ts profileForUser + signIn + signOut + active check
   - authTypes.ts UserRole, AuthenticatedUser
   - authStorage.ts sessionStorage + memory fallback
   - adminApi.ts list users + Edge Function invoke + explainEdgeFunctionError (MMPI)
   - AuthGate.tsx session hydration + race protection
   - Login page + protected routes + role-based redirect
   - Public registration kapalı (Supabase dashboard + config.toml)

4. Layout + Router
   - router.ts: parseRoute, navigate, useRoute, link interceptor, navigation guards (MMPI)
   - App.tsx shell: Header sticky blur (psikolog sitesi), Sidebar, MobileNav, Footer, ConnectivityBanner (MMPI)
   - Routes: / (login/dashboard), /dashboard, /clients, /clients/:id, /settings, /admin, 404
   - useOnlineStatus + ConnectivityBanner

5. CI + Tests
   - GitHub Actions: typecheck + test + build
   - Tests: authStorage, draftStorage, responsiveContracts (dvh, 16px, 44px, no !important), build, PGlite RLS (organizations, profiles, clients)

6. Docs
   - README.md update (kurulum, mimari, faz planı)
   - docs/ai-progress/PHASE-01.md

**Do not repeat:**
- MMPI scoring, norm, soru, anahtar kopyalama
- Single-file build
- Monolitik App.jsx
- In-memory rate limit
- No tests

---

## Özet (Prompt Madde 47)

### 1. Mevcut MMPI mimarisi

- React 19 TS + Vite dev + custom esbuild single-file build, History API router, sessionStorage auth PKCE, role ADMIN/PSYCHOLOG, public signup kapalı, Edge Function admin-users only, Supabase Postgres profiles/mmpi_records/audit_logs/mmpi_reports+versions+templates+settings, RLS her tabloda + security definer helpers + anon revoke + immutable trigger + audit trigger + versioning trigger atomic + revision optimistic, no Storage (data URL), OMR pipeline client-side (alignment/mark/qr/quality/manual warp), scoring device-side Savaşır 1981 Türk normları + K düzeltme + 15 validity config + TR consistency + Goldberg/PDI-IV/MacAndrew, reports: MMPIPrintReport browser print + ReportEditor block model + templateEngine + autosave 1.4s + version history, PDF custom PdfDocument writer for optik form, 66 tests tsx --test + PGlite real RLS/trigger + build + responsiveContracts + edgeFunctions + security IDOR, deployment Cloudflare Workers Static Assets SPA fallback + CI typecheck+test+verify:pdf+build+diff optik-form.html, security RLS+origin strict+control char+escape+no service_role frontend+audit+IDOR+CSP hash

### 2. Mevcut psikolog sitesi mimarisi

- React 19 JS (no TS) + Vite, single App.jsx 385 satır, SOCIALS + CERTS placeholder + PHOTO_SOURCES fallback, hash scroll go() + IntersectionObserver reveal + toast, design tokens :root --bg white --bg-soft #F6F6F6 --text #0D0D0D --muted #8E8E93 --border #E9E9EB --accent #0A84FF --radius 14px --max 780px --nav-h 64px, typography DM Sans + Newsreader 300/400/500/600 -0.04em, pill buttons 999px black primary ghost secondary, card white border radius 14px max-width 520px, avatar 120px circle fallback HK monogram, kicker pill dot, section 40px padding border-top, resume grid 1fr 1fr + certs, contact grid 1fr 1.1fr, footer, socials 38px circle, reveal opacity 0 translateY 8px, responsive 760/600/520 breakpoints grid collapse mobile menu, no router, Cloudflare Workers Static Assets + run_worker_first /api/* + vars CONTACT_FROM/TO + .dev.vars RESEND_API_KEY, worker/index.js POST /api/contact 32KB + rate limit Map 5/10min + honeypot + email regex + escapeHtml + Resend API, _headers CSP default-src self + font-src gstatic + style unsafe-inline + X-Content-Type-Options nosniff + Referrer-Policy + Permissions-Policy + immutable assets, SEO meta og twitter canonical, no CI, no tests, minimal deps

### 3. İki projeden alınacak iyi fikirler

- MMPI: RLS+trigger+Edge üç katman güvenlik, PGlite gerçek RLS test, idempotency+outbox+TTL, sessionStorage auth, origin strict, error sınıflandırma 400 vs 500+db push, report versioning atomic + revision optimistic + 10min autosave, data URL küçük private dosyalar, draft minimal + TTL, audit logs trigger, responsive sözleşme testleri dvh/16px/44px, AI KVKK no PII, SPA router + link interceptor + guards, connectivity banner, CSP hash
- Psych site: sade tasarım tokens 780px 14px radius pill buton serif+sans Newsreader italic, responsive from start, Workers Static Assets run_worker_first secret frontend'e gitmez, security headers CSP, minimal deps, SEO+a11y focus-visible, honeypot+mailto fallback, foto fallback marka, reveal+reduced-motion

### 4. Alınmayacak yaklaşımlar

- MMPI: scoring motoru/norm/soru/anahtar, single-file build, monolitik büyük componentler, custom esbuild, no multi-tenancy, in-memory rate limit, form unverified-template, no E2E browser
- Psych site: monolitik App.jsx no TS no tests, hash scroll no router, single page sections, no auth, in-memory rate limit, Google Fonts CDN, hardcoded links, no CMS

### 5. Yeni sistem mimarisi

- React 19 TS + Vite standard (single-file değil), vanilla CSS tokens (psikolog :root + MMPI responsive.css), History API custom router (MMPI iyileştirilmiş) + protected + role, Zustand + localStorage draft TTL 30g + sessionStorage auth, RHF+Zod + DB trigger double, feature-based folders clients/anamnesis/sessions/assessments/tests/reports/documents + ui primitives Button/Card/Input/Modal/Table/Badge/Toast, layout Header sticky blur Sidebar MobileNav Footer ConnectivityBanner, Supabase yeni project Auth PKCE sessionStorage role ADMIN/ORG_ADMIN/PSYCHOLOG public signup kapalı Edge Function admin-users, DB organizations/profiles/clients/anamneses/sessions/assessments/test_definitions/test_administrations/test_results/report_templates/reports/report_versions/documents/appointments/tasks/audit_logs/psychologist_settings + organization_id her tabloda + constraints + triggers set_updated_at/validate/protect/prepare_version/log_audit, RLS her tablo anon revoke helpers is_active/is_psychologist/is_admin/is_org_member + org isolation + IDOR, Storage private bucket client-documents no public URL signed short-lived, Reports templateEngine block model MMPI reuse + dataCatalog + when + {{path}} + letterhead data URL + autosave 1.4s + undo/redo + version history, PDF browser print + @react-pdf A4 sayfa no header/footer, Testing unit+integration+E2E Playwright+DB PGlite+security IDOR+build+browser, Deployment Cloudflare Workers Static Assets SPA fallback custom domain psikolog.halilkaraduman.com.tr + CI typecheck+test+build

### 6. Database planı

- Yeni Supabase project, ayrı DB, 6 migration faz 1'de: organizations, profiles (org FK, role enum, active, name length, index org+role+active, trigger updated_at), clients (org FK, file_number unique org, first/last 1-80, birth_date, phone/email, profession/education, status active/archived, created_by FK profiles cascade, indexes org+created_at + org+status), audit_logs (org, actor, action enum client_*/anamnesis_*/session_*/assessment_*/report_*/document_*, target_table/id, created_at, indexes), helpers is_active/is_psychologist/is_admin/is_org_admin/is_org_member security definer search_path public, RLS anon revoke + org isolation, storage bucket private
- Faz 2-7: anamneses, sessions, assessments, test_definitions, test_administrations, test_results, report_templates, reports, report_versions, documents, appointments, tasks, psychologist_settings + triggers validate/protect/prepare_version/log_audit + RLS

### 7. Auth/RLS planı

- Auth: Supabase PKCE sessionStorage, safeSupabaseOrigin https only localhost exception, profileForUser runtime validation UUID/email 254/name 2-80/control char/role enum, signIn email normalize lower active check signOut local, AuthGate session hydration race protection, protected routes role-based, public registration kapalı dashboard + config.toml, first admin SQL, Edge Function admin-users service_role origin strict content-length 32KB ValidationError 400 vs isDatabaseSideError 500+db push rollback
- RLS: her tablo, anon revoke, security definer helpers, profiles select own or admin/org_admin same org no update/delete via RLS (Edge only), organizations select org_member or admin, clients select admin or org_member insert owner+psychologist+org_member update admin or owner+psychologist+org_member delete same + org isolation, anamneses/sessions/assessments via client org, test_definitions system or org_member, test_administrations/results via client org, reports via client org + template exists system or own org + created_by, versions via report exists, templates system or org_member, documents org_member, audit_logs admin or org_admin same org no client insert, settings owner+psychologist+org_member, grants selective, PGlite tests for all, IDOR tests User A→B org B wrong IDs anon expired role escalation

### 8. Report/PDF planı

- TemplateEngine: block type heading1/2/paragraph/bulletList/numberedList/table/dataField/dataTable, Inline bold/italic/underline, when conditional, {{path}} resolver safe __proto__ check, hasData, dataCatalog group Danışan/Değerlendirme/Geçerlik/Klinik/Profil/İzlenimler/Uzman, fieldValue, resolvePlaceholders, displayValue MISSING
- ReportDataAdapter: mevcut danışan+değerlendirme+test özet snapshot, no new scoring, clinicalBandFor/codeInterpretationForProfile reuse where applicable but no MMPI copy
- ReportsApi: UUID validation, revision conflict check, sequential save, separate mutation count
- UseReportAutosave: 1.4s debounce, sequential, status/error, beforeunload warning
- ReportEditor: editör + undo/redo + dataField insert + letterhead apply + AI text (future) + version history + restore
- ReportPreview: React safe text, HTML table, raster değil
- ReportSettings: letterhead/logo/signature data URL ≤2MB PNG/JPEG/WebP
- ReportsPage: liste + oluştur + kopyala + sil + şablon örneği + Tam Rapor + kayıt özeti
- PDF: faz 1 browser print (MMPIPrintReport pattern) print-only @media print visible, filename Rapor_<Danisan>_<tarih>, A4 profesyonel okunaklı sayfa no başlık footer uzman bilgisi tarih, HTML preview ≈ PDF parity test, faz 2 @react-pdf/renderer

### 9. MMPI entegrasyon planı

```
psikolog.halilkaraduman.com.tr (yeni)
  → assessment / test_administration
    → external_source = "mmpi"
    → external_assessment_id = mmpi_records.id (UUID, MMPI DB'sinden değil, sadece referans)
      → mmpi.halilkaraduman.com.tr bağımsız kalır
        → Test sonucu yeniden hesaplanmaz, sadece özet result_data tutulur (T skorları, geçerlik, profil kodu) — ham sorular yok
          → Rapor psikolog platformunda
```

- Yeni sistem MMPI scoring motoru yazmaz, norm kopyalamaz, soru kopyalamaz
- test_administrations.external_source + external_assessment_id ile ilişki, result_data özet
- Ayrı Supabase project, cross-DB join yok, sadece external id
- MVP manuel: psikolog MMPI'de raporu alır, özetini yeni platforma ekler veya link
- İleride Edge Function token exchange? Faz 2+

### 10. Faz planı

- PHASE-00: Analiz (bu faz) — 4 doküman, kod yok — DONE
- PHASE-01: İskelet + Auth + DB — Vite TS init, tokens, responsive.css, router, layout, Supabase migrations org/profiles/clients/audit_logs, RLS, AuthGate login sessionStorage protected role, CI, tests authStorage/draft/responsive/build/PGlite RLS
- PHASE-02: Danışanlar + Dosya — Clients CRUD file_number auto search/filter/pagination hasMore+count, ClientFile tabs Genel/Anamnez/Görüşmeler/Değerlendirmeler/Testler/Raporlar/Belgeler/Notlar/Geçmiş, draft+outbox+TTL+idempotency, RLS+IDOR tests
- PHASE-03: Anamnez + Görüşmeler — Anamneses 1-1 form validation, Sessions 1-N date/type/duration/notes/observation/key_points/plan/follow_up, pagination audit
- PHASE-04: Değerlendirmeler + Test Sonuçları — Assessments + test_definitions + test_administrations + test_results external mmpi link no scoring
- PHASE-05: Raporlar + Şablonlar — report_templates system+user, reports, report_versions, templateEngine block model MMPI reuse, ReportEditor autosave 1.4s undo/redo version history restore letterhead, ReportPreview safe HTML
- PHASE-06: PDF + Belgeler — Browser print + @react-pdf A4, Documents private bucket upload list signed URL storage policies, PDF/HTML parity test
- PHASE-07: Randevular + Görevler + Ayarlar + Yönetim + Audit Log — appointments, tasks, settings letterhead data URL, admin panel users/orgs, audit_logs read admin/org_admin
- PHASE-08: Güvenlik + Test + Responsive Audit — IDOR RLS storage role escalation anon expired tests, E2E Playwright critical path, responsive audit dvh 16px 44px no !important, build+browser tests, Strix manual scan
- PHASE-09: Polish + Deploy — SEO _headers CSP performance a11y, Cloudflare Workers deploy custom domain, docs final

### 11. Riskler

- KVKK: hassas veri, minimizasyon, 3rd party yok, log yok, public URL yok, audit logs, RLS org isolation, private bucket, no PII to LLM
- IDOR: User A→B, org B, wrong IDs, anon, expired, role escalation — RLS + PGlite + E2E negative
- Multi-tenancy: organization_id her tabloda not null + RLS is_org_member + tests
- PDF/HTML parity: print CSS + @react-pdf same tokens, parity test
- Scope creep: MVP zincir, faz planı, "gerçek ihtiyaç mı?" sorusu
- MMPI scoring copy: external_source only, no scoring, code review
- Offline: draft+outbox+TTL+idempotency+connectivity banner
- Auth public registration: dashboard kapalı + Edge Function only + first admin SQL
- Rate limit: KV/DO persistent (MMPI in-memory değil) + WAF
- Secret: .env.example only, .dev.vars gitignore, wrangler secret, no VITE_ service_role

### 12. PHASE 01'de yapılacaklar

1. Vite + React 19 + TS init, tsconfig strict, vite.config host 0.0.0.0 allowedHosts .e2b.app, eslint, design tokens tokens.css + theme.css + responsive.css + print.css, folder structure app/router, features/*, components/ui, components/layout, auth, lib, styles
2. Supabase yeni project, config.toml, .env.example, migrations organizations/profiles/clients/audit_logs + helpers is_active/is_psychologist/is_admin/is_org_member/is_org_admin + set_updated_at + log_audit + RLS anon revoke org isolation + storage bucket private, seed first admin SQL in README
3. Auth: supabaseClient safeSupabaseOrigin sessionStorage PKCE, supabaseAuth profileForUser signIn signOut active check, authTypes UserRole ADMIN/ORG_ADMIN/PSYCHOLOG, authStorage sessionStorage+memory fallback, adminApi list+invoke+explainEdgeFunctionError, AuthGate hydration race protection, Login page + protected routes role-based, public registration kapalı
4. Layout + Router: router.ts parseRoute navigate useRoute link interceptor navigation guards, App.tsx shell Header sticky blur Sidebar MobileNav Footer ConnectivityBanner, routes / /dashboard /clients /clients/:id /settings /admin 404, useOnlineStatus + ConnectivityBanner
5. CI + Tests: GitHub Actions typecheck+test+build, tests authStorage draftStorage responsiveContracts build PGlite RLS organizations/profiles/clients
6. Docs: README update + PHASE-01.md
