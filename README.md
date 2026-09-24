# Psikolog Platformu — psikolog.halilkaraduman.com.tr

Psikologların danışan, anamnez, görüşme, değerlendirme, test sonucu, belge, rapor ve PDF süreçlerini tek profesyonel çalışma ortamında yönetmesini sağlayan sistem.

> **PHASE-01 — Proje iskeleti + Auth + DB**
> Mevcut projeler (MMPI + psikolog sitesi) analiz edildi, yeni mimari tasarlandı, iskelet + auth + RLS kuruldu.

## Hızlı Başlangıç

Node 22+ gerekir.

```sh
npm install
cp .env.example .env   # VITE_SUPABASE_URL ve ANON_KEY doldur
npm run dev            # http://localhost:5173
```

Supabase migration ve Edge Function kurulumu için `supabase/README.md`.

## Mimari

```
Login → Dashboard → Danışanlar → Danışan Dosyası → Anamnez → Görüşmeler → Değerlendirmeler → Test Sonuçları → Rapor → Önizleme → PDF → Arşiv
```

**Stack:** React 19 + TypeScript + Vite + Supabase (Auth/Postgres/RLS/Storage private) + Cloudflare Workers Static Assets

**Tasarım:** Psikolog sitesi sade tokens (--bg white, --radius 14px, --max 780px/1280px, DM Sans + Newsreader) + MMPI responsive dersleri (dvh, 16px input, 44px touch, no !important)

**Routing:** History API custom router (MMPI pattern) + link interceptor + navigation guards, hash değil

**State:** Zustand/Jotai yerine useState + localStorage draft TTL 30g + sessionStorage auth (MMPI)

**Güvenlik:** RLS her tabloda, anon revoke, security definer helpers is_active/is_psychologist/is_admin/is_org_admin/is_org_member/my_organization_id, org isolation organization_id her tabloda, audit_logs trigger server-side, private bucket, no public URL, no service_role frontend, KVKK minimizasyon

**Test:** tsx --test, 37 test (authStorage, draftStorage, responsiveContracts, build, clientDatabase PGlite RLS/IDOR), CI typecheck+test+build

## Fazlar

- PHASE-00: Mevcut proje analizi — DONE (docs/architecture/*)
- PHASE-01: İskelet + Auth + DB — DONE
- PHASE-02: Danışanlar + Dosya — DONE (CRUD + file tabs + file_number auto + search/pagination + RLS)
- PHASE-03: Anamnez + Görüşmeler — DONE (anamneses 1-1 upsert, sessions date Istanbul validation, audit, RLS, RHF+Zod)
- PHASE-04: Değerlendirmeler + Test Sonuçları — DONE (assessments, test_definitions system+org seed MMPI harici, test_administrations external_source mmpi, test_results jsonb summary only, no scoring copy)
- PHASE-05: Raporlar + Şablonlar — DONE (report_templates system+org, reports block model, source_snapshot, revision/version_number, prepare_report trigger autosave 10min versioning, version_report security definer, report_versions immutable, psychologist_settings letterhead, templateEngine safe placeholders, reportDataAdapter, autosave 1.4s, ReportEditor + ReportPreview + PDF print, optimistic concurrency)
- PHASE-06: Belgeler + Notlar + Geçmiş — DONE (PRIVATE BUCKET private 50MB allowlist, storage policies foldername org isolation, documents file_path org/client/fileId-name, notes pinned, signed URL 1h)
- PHASE-07: Randevular+Görevler+Ayarlar+Yönetim+Audit — DONE (appointments tasks, settings antet/logo/imza data URL 1MB, admin RPCs security definer is_admin, audit_logs server-side)
- PHASE-08: Güvenlik+Test+Responsive Audit — DONE (RLS her tablo, IDOR 21 subtests, storage private, audit trigger, 69 tests, responsive viewport/dvh/16px/44px)
- PHASE-09: Polish + Deploy — DONE (vite manualChunks vendor/supabase/zod/rhf, index.html SEO og tags skip-link, _headers CSP/HSTS/COOP/COEP/CORP Cache-Control immutable, wrangler custom_domain psikolog.halilkaraduman.com.tr SPA fallback, lazy routes React.lazy Suspense, accessibility skip-link)
- PHASE-10: E2E Playwright + Rate Limiting — DONE (rateLimit token bucket + debounce + KV pseudo, securityHeaders check, playwright.config.ts chromium/firefox/webkit/mobile, e2e/critical.spec.ts critical path IDOR responsive security headers no public registration)
- PHASE-11: AI Optional + Export/Import — DONE (aiTypes guardrails tanı koymaz test puanı üretmez norm uydurmaz, stub extractive summary, exportApi bundle v1 meta only KVKK portability, ExportSection JSON download + import validate no auto-create)
- PHASE-12: Final QA + Launch Checklist — DONE (build 693kB gzip 192kB 234 modules, typecheck OK, 69 tests, security/responsive/E2E manual checklist, performance manualChunks lazy, accessibility skip-link, docs PHASE-00..12, launch-checklist.md, deployment ready)

## Supabase

Yeni Supabase project, ayrı DB — MMPI DB'si kullanılmaz.

Tablolar PHASE-01: organizations, profiles (org FK, role ADMIN/ORG_ADMIN/PSYCHOLOG, active, least privilege trigger), clients (org FK, file_number unique org, status active/archived, created_by cascade), audit_logs (org, actor auth.uid(), action enum, trigger)

RLS: her tabloda, anon revoke, org isolation, profiles update/delete revoked Edge Function only

Storage: private bucket client-documents (faz 6'da aktif)

İlk admin:

```sql
update public.profiles set role='ADMIN', active=true where email='ilk-admin@example.com';
```

## Güvenlik

- RLS + storage policies + origin strict + content-length double + control char rejection + escapeHtml + no service_role frontend + audit logs + IDOR + CSP + rate limit KV (MMPI in-memory değil) + KVKK
- Public registration kapalı
- Secret'lar frontend'e konmaz, .env.example only, .dev.vars gitignore

## MMPI Entegrasyonu

```
psikolog.halilkaraduman.com.tr → assessment → external_source="mmpi" + external_assessment_id → mmpi.halilkaraduman.com.tr bağımsız → test sonucu yeniden hesaplanmaz, sadece özet
```

MMPI scoring motoru, norm, soru, anahtar kopyalanmaz — sadece external link.

## Deployment

Cloudflare Workers Static Assets, `wrangler.jsonc` SPA fallback, `dist/` from Vite build, `_headers` CSP, CI GitHub Actions.

```sh
npm run build
npx wrangler deploy
```

## Dokümantasyon

- docs/architecture/mmpi-analysis.md
- docs/architecture/psychology-site-analysis.md
- docs/architecture/existing-project-analysis.md
- docs/architecture/new-platform-architecture.md
- docs/ai-progress/PHASE-00.md
- docs/ai-progress/PHASE-01.md (this phase)
