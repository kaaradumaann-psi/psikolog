# Mevcut Projeler Karşılaştırması ve Dersler

Tarih: 2026-09-24
İncelenen repolar: `Repo123` (MMPI) + `halilkaraduman.com.tr` (Psikolog sitesi)

---

## 1. Özet

| Alan | MMPI Repo123 | Psikolog Website | Yeni Platform İçin Öneri |
|------|--------------|------------------|--------------------------|
| **Amaç** | Yetkili psikologların 566 maddelik optik formu OMR ile okuyup cihazda puanlaması, kayıt yönetimi, raporlama | Kişisel tanıtım, özgeçmiş, iletişim, MMPI'ye link | Psikologların danışan/anamnez/görüşme/değerlendirme/test/rapor/PDF akışını yönettiği profesyonel çalışma platformu — MMPI harici değerlendirme kaynağı olarak bağlanabilir |
| **Frontend** | React 19 TS + Vite dev + custom esbuild single-file build | React 19 JS (no TS) + Vite | React 19 + TypeScript + Vite standard build (single-file değil) — feature-based folders, small components, strict TS |
| **Routing** | History API pathname router, parseRoute, navigate, useRoute, link interceptor, navigation guards, SPA fallback via Workers | Hash scroll, go() + scrollTo + replaceState, no router | History API router (MMPI'deki gibi) + protected routes + role-based redirect, TanStack Router veya custom router (MMPI router'ı iyileştirerek) — hash değil |
| **State** | useState/useEffect + localStorage draft+outbox (TTL 30g) + sessionStorage auth + memory fallback | useState only | Zustand veya Jotai + localStorage draft (MMPI'deki TTL + minimal pattern) + sessionStorage auth (MMPI) — Redux değil, hafif |
| **Auth** | Supabase Auth PKCE, sessionStorage, active check, role ADMIN/PSYCHOLOG, public signup kapalı, Edge Function admin-users only | Yok (public) | Supabase Auth PKCE + sessionStorage (MMPI) + role ADMIN/PSYCHOLOG/ (opsiyonel ORG_ADMIN) + public registration kapalı + Edge Function user management (MMPI) + first admin SQL bootstrap |
| **Database** | Supabase Postgres: profiles, mmpi_records (immutable trigger), audit_logs (trigger), mmpi_reports + versions + templates + settings | Yok | Yeni Supabase project, ayrı DB — MMPI DB'si kullanılmayacak. Tablolar: organizations, profiles (org FK), clients (danışan), anamnesis, sessions (görüşmeler), assessments (değerlendirmeler), test_definitions, test_administrations, test_results (external_source), reports, report_templates, report_versions, documents, appointments, tasks, audit_logs — organization_id ile multi-tenant |
| **Supabase** | Auth + RLS + Edge Functions (admin-users, ai-interpretation) + no Storage (data URL) | Yok (Cloudflare Worker + Resend) | Auth + RLS + Edge Functions (admin-users + future integrations) + Storage private bucket (belgeler) + no service_role in frontend |
| **RLS** | Her tabloda, anon revoke, security definer helpers is_active/is_psychologist/is_admin, profiles update/delete revoke, reports ownership via linked records, audit_logs admin only | Yok | Her hassas tabloda RLS, anon revoke, is_active/is_psychologist/is_admin + is_org_member helpers, organization_id ile tenant isolation, IDOR testleri, storage policies private |
| **Components** | Monolitik App + büyük AdminPanel/ReportEditor/CaseWorkspace, reusable Icon/ConfirmDialog/PaperViewport | Monolitik App.jsx 385 satır, no split | Feature-based: `features/clients`, `features/anamnesis`, `features/sessions`, `features/assessments`, `features/tests`, `features/reports`, `features/documents`, `components/ui` (Button, Card, Input, Modal, Table, Badge, etc.) — her component ≤200 satır, reusable |
| **Forms** | Client intake + quick/raw/OMR, validation caseTypes + dateGuards + DB trigger double | Contact form (ad/email/mesaj + honeypot) | React Hook Form + Zod (TS) + client + DB trigger double validation, honeypot where public, length + control char + regex checks (MMPI) |
| **Tables** | Liste + search/sanitize + pagination (hasMore+count visible) | Yok | TanStack Table veya custom Table component, search + filter + pagination (MMPI pattern), server-side pagination, hasMore visible |
| **Responsive** | responsive.css son sırada, no !important/print, dvh, 16px input, 44px touch, MobileNav, container min() | 760px/600px/520px breakpoints, grid collapse, mobile menu, container min() | Responsive from start (ikisi de), mobile first değil ama desktop first with mobile breakpoints, dvh, 16px input, 44px touch, container min(), Tailwind veya CSS modules? Karar: Tailwind veya vanilla CSS with tokens (psikolog sitesi tokens + MMPI responsive.css) — Tailwind daha hızlı ama custom CSS de olabilir, şimdilik vanilla + tokens önerilir (KVKK, minimal) |
| **Testing** | 66 test tsx --test, PGlite real Postgres RLS/trigger, build.test, responsiveContracts, edgeFunctions, security | Yok | Minimum: unit + integration + E2E (Playwright) + DB RLS (PGlite) + security (IDOR) + build + browser. MMPI'deki PGlite pattern mutlaka tekrar. Critical E2E: Login→Dashboard→Create Patient→Open→Anamnesis→Session→Assessment→Test Result→Report→Preview→PDF→Archive |
| **Deployment** | Cloudflare Workers Static Assets, wrangler.jsonc, assets not_found_handling SPA, routes mmpi.halilkaraduman.com.tr, custom esbuild build, CI GitHub Actions (typecheck+test+verify:pdf+build+diff optik-form.html) | Cloudflare Workers Static Assets, wrangler.jsonc, assets binding ASSETS run_worker_first /api/*, Vite build, _headers, no CI | Cloudflare Workers Static Assets (ikisi de aynı), Vite standard build (single-file değil), wrangler.jsonc SPA fallback, routes psikolog.halilkaraduman.com.tr, CI: typecheck+test+build, no tracked single-file diff |
| **Error handling** | ValidationError class, explainEdgeFunctionError, isDatabaseSideError 400 vs 500+db push, isNetworkError outbox | Toast + mailto fallback | ValidationError + explainEdgeFunctionError pattern (MMPI) + toast/notification system (psikolog sitesi toast) + connectivity banner (MMPI) |
| **Security** | RLS, security definer, anon revoke, origin strict, content-length double, control char rejection, escapeHtml, no service_role frontend, audit logs, IDOR, CSP single inline hash, connect-src only Supabase | _headers CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, honeypot, rate limit Map, escapeHtml, no secret frontend, Resend key Worker only | RLS + storage policies + origin strict + content-length + control char + escape + no service_role frontend + audit logs + IDOR + CSP (Vite build için _headers) + rate limit persistent (KV) + KVKK: veri minimizasyonu, gereksiz 3rd party yok, hassas veri loglanmaz, public URL yok |
| **PDF** | Custom PdfDocument writer (PDF 1.7) for optik form + browser print for clinical report (MMPIPrintReport) | Yok | Browser print for preview + PDF generation via @react-pdf/renderer veya puppeteer? Karar: önce browser print (MMPIPrintReport gibi) + sonra @react-pdf for professional PDF, HTML preview ≈ PDF. A4, sayfa no, header/footer, uzman bilgisi, tarih |
| **Storage** | Yok (data URL logo/imza) | Yok | Private bucket, RLS + storage policies, no public URL, signed URL short-lived where needed, documents linked to client_id + organization_id |
| **OMR/Scanner** | Full OMR pipeline client-side, document detection, perspective, mark detection, QR, quality gate, manual warp | Yok | Yeni platformda OMR yok, ama belge tarama için ilham: documentDetection + perspectiveCorrection + qualityGate patterni, future'da belge upload için kullanılabilir |
| **AI** | ai-interpretation Edge Function, Gemini native vs OpenAI compatible, no PII to LLM (only age+gender+numeric), rate limit, IDOR, 24h local cache | Yok | İlk sürümde AI zorunlu değil. Eklenirse: tanı koymaz, test puanı üretmez, norm uydurmaz, klinik karar vermez — sadece uzman kontrollü yardımcı metin. MMPI AI KVKK patterni (no name/surname, numeric summary only, IDOR, cache user-specific) örnek |

---

## 2. MMPI'den Öğrenilenler

### Olumlu — Tekrar Kullan

1. **Üç katmanlı güvenlik:** Client validation + RLS + DB trigger immutable — yetki kanıtı client değil, DB. Yeni platformda aynı.
2. **PGlite WASM ile gerçek RLS/trigger testi:** Network yok, prod DB'ye dokunmadan güvenlik testi. Mutlaka.
3. **Idempotency + Outbox + TTL:** Çift kayıt yok, offline dayanıklı. Danışan oluştururken de gerekli.
4. **SessionStorage auth:** F5 korur, sekme kapanınca ölür — KVKK için iyi.
5. **Origin allowlist strict:** Pathname '/', no user/pass/search/hash, localhost-only fallback — CORS güvenli.
6. **Error sınıflandırma:** 400 vs 500+db push — teşhis kolay.
7. **Report versioning atomic:** Trigger ile revision + version_number, 10min autosave, optimistic concurrency, immutable history.
8. **Data URL küçük private dosyalar:** Storage bucket karmaşası yok.
9. **Draft minimal + TTL:** Ham görseller yok, sadece gerekli JSON.
10. **Audit logs trigger:** Server-side, client atlayamaz.
11. **Responsive sözleşme testleri:** dvh, 16px, 44px kilitli.
12. **AI KVKK:** No PII to LLM.
13. **SPA router + link interceptor + navigation guards:** Hash değil, History API.
14. **Connectivity banner:** Offline UX.

### Olumsuz — Tekrar Kullanma

1. **Monolitik büyük componentler:** AdminPanel 877, ReportEditor 694 — split gerekli.
2. **Custom esbuild single-file build:** Maintenance zor, cache yok, her deploy full download. Yeni platform Vite standard.
3. **No multi-tenancy:** organization_id yok. Yeni platformda olmalı.
4. **In-memory rate limit:** Persistent değil.
5. **Scoring hard-coded:** Yeni platform scoring yazmamalı, sadece external_source link.
6. **Form tanımı unverified-template:** Disclaimer.
7. **No E2E browser test:** Playwright ekle.

## 3. Psikolog Sitesinden Öğrenilenler

### Olumlu

1. **Sade tasarım dili:** 780px max, beyaz, 14px radius, pill buton, serif+sans, Newsreader italic — profesyonel, güvenilir. Yeni platformda da sade, okunaklı, az renk.
2. **Tipografi sistemi:** DM Sans + Newsreader, 300 weight statement — rapor başlıklarında kullanılabilir.
3. **Responsive from start:** Sonradan değil, baştan.
4. **Workers Static Assets + run_worker_first:** Secret frontend'e gitmez.
5. **Security headers + CSP:** _headers.
6. **Minimal deps:** Hızlı, bakımı kolay.
7. **SEO + a11y:** meta, og, focus-visible.
8. **Honeypot + fallback mailto:** UX.
9. **Foto fallback:** Marka.
10. **Reveal + reduced-motion:** a11y.

### Olumsuz

1. **Monolitik App.jsx, no TS, no tests:** Split + TS + test zorunlu.
2. **No router:** Hash scroll, yeni platform multi-page.
3. **In-memory rate limit.**
4. **Google Fonts CDN:** Self-host tercih (KVKK).

---

## 4. Yeni Platform İçin Sentez

### Mimari Prensipler

1. **Ayrı repository, ayrı Supabase project:** MMPI DB'si kullanılmayacak.
2. **Güvenlik önce:** RLS her tabloda, anon revoke, storage private, audit logs, IDOR test, KVKK minimizasyon.
3. **Responsive from start:** İlk componentten itibaren.
4. **MVP odaklı:** Login→Dashboard→Danışan→Dosya→Anamnez→Görüşme→Değerlendirme→Test→Rapor→PDF→Arşiv zinciri çalışmadan gereksiz özellik yok.
5. **Kopyalama yok:** MMPI scoring, norm, soru, anahtar kopyalanmayacak. Psikolog sitesi clone olmayacak. Yeni platform profesyonel çalışma platformu.
6. **Gelecek entegrasyon:** assessment.source = "mmpi" + external_assessment_id, MMPI sonucunu yeniden hesaplamaz, sadece ilişkilendirir.
7. **AI yok ilk sürümde:** Varsa tanı koymaz, puan üretmez, norm uydurmaz, klinik karar vermez.
8. **Test zorunlu:** Unit + integration + E2E + DB RLS + security + build + browser. Critical E2E otomatik.
9. **Dokümantasyon:** docs/architecture + docs/ai-progress PHASE-XX.md, her faz commit.

### Teknik Kararlar (Ön)

- **Frontend:** React 19 + TypeScript + Vite (standard build, single-file değil)
- **Styling:** Vanilla CSS with design tokens (psikolog sitesi :root + MMPI responsive.css) + CSS modules veya Tailwind — karar faz 1'de, ama token sistemi kesin
- **Routing:** History API custom router (MMPI router iyileştirilmiş) veya TanStack Router — hash değil
- **State:** Zustand/Jotai + localStorage draft (TTL) + sessionStorage auth
- **Forms:** React Hook Form + Zod
- **Table:** TanStack Table veya custom, pagination hasMore+count visible
- **Backend:** Supabase (Auth + Postgres + RLS + Storage private + Edge Functions)
- **PDF:** Browser print (MMPIPrintReport pattern) + @react-pdf/renderer for A4 professional
- **Deployment:** Cloudflare Workers Static Assets, SPA fallback, CI GitHub Actions
- **Security:** RLS + storage policies + origin strict + audit logs + IDOR + CSP + rate limit KV + KVKK

### Riskler

1. **KVKK:** Hassas psikolojik veriler, gereksiz veri toplama, 3rd party, loglama, public URL — hepsi engellenmeli
2. **IDOR:** User A → User B patient, org B, wrong IDs — RLS + tests
3. **Multi-tenancy:** organization_id unutulursa veri sızar — her tabloda + RLS
4. **PDF/HTML parity:** Önizleme ile PDF aynı görünmeli — test ile kilitle
5. **Scope creep:** MVP dışı özellik ekleme — faz planı ile engelle
6. **MMPI entegrasyonu:** Scoring kopyalanmamalı, sadece external link — mimari ile korunmalı
7. **Offline:** Draft + outbox gerekli, yoksa veri kaybı
8. **Auth:** Public registration kapalı olmalı, ilk admin SQL
