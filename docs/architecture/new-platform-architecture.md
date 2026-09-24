# Yeni Platform Mimarisi — psikolog.halilkaraduman.com.tr

Tarih: 2026-09-24
Durum: PHASE-00 — Tasarım, kod yok
İlke: MMPI clone değil, psikolog sitesi clone değil — profesyonel çalışma platformu

---

## 1. Vizyon ve Kapsam

```
Login → Dashboard → Danışanlar → Danışan Dosyası → Anamnez → Görüşmeler → Değerlendirmeler → Test Sonuçları → Rapor → Önizleme → PDF → Arşiv
```

Psikolog sisteme girdiğinde tek akışta danışan dosyasını yönetebilmeli. İlk MVP bu zincir.

### Ana Modüller (Hedef)

```
Dashboard
Danışanlar
Danışan Dosyası (Genel/Anamnez/Görüşmeler/Değerlendirmeler/Testler/Raporlar/Belgeler/Notlar/Geçmiş)
Anamnez
Görüşmeler
Değerlendirmeler
Test Sonuçları (TestDefinition/TestAdministration/TestResult ayrımı)
Belgeler (private bucket)
Raporlar + Rapor Şablonları (versiyonlu)
PDF (A4 profesyonel)
Randevular (faz 2)
Görevler (faz 2)
Ayarlar
Yönetim (kullanıcı/organizasyon)
Audit Log
```

MVP'de sadece zincirdeki modüller, faz 2'de randevu/görev.

---

## 2. Frontend Architecture

### Stack Kararı

**Decision:** React 19 + TypeScript 5 + Vite 7 (standard build, single-file değil)

**Reason:** MMPI'de React 19 TS kanıtlandı, psikolog sitesinde React 19 JS sade ama TS eksik. TS zorunlu (güvenlik, refactor, KVKK). Vite standard build cache'ler, single-file değil — MMPI single-file maintenance zor ve her deploy full download.

**Alternative:** Next.js

**Why rejected:** Cloudflare Workers Static Assets + SPA yeterli, SSR ilk MVP'de gereksiz, KVKK için client-side + Supabase RLS daha sade. Next.js ek karmaşıklık, edge runtime uyumu.

### Folder Structure

```
src/
  app/
    router.ts (History API, parseRoute, navigate, useRoute, link interceptor, guards) — MMPI router iyileştirilmiş
    App.tsx (shell, protected routes, role-based)
    routes/
      Login, Dashboard, Clients, ClientFile, Anamnesis, Sessions, Assessments, Tests, Reports, Documents, Settings, Admin
  features/
    clients/ (ClientList, ClientForm, ClientCard, clientApi, clientTypes, useClients)
    anamnesis/ (AnamnesisForm, anamnesisTypes, anamnesisApi)
    sessions/ (SessionList, SessionForm, sessionTypes)
    assessments/ (AssessmentForm, assessmentTypes)
    tests/ (TestDefinition, TestAdministration, TestResult, testApi)
    reports/ (ReportEditor, ReportPreview, ReportSettings, ReportsPage, templateEngine, reportDataAdapter, reportsApi, useReportAutosave)
    documents/ (DocumentList, DocumentUpload, documentApi)
  components/
    ui/ (Button, Card, Input, Textarea, Select, Modal, Table, Badge, Toast, ConfirmDialog, PaperViewport, etc. — her biri ≤200 satır)
    layout/ (Header, Sidebar, MobileNav, SiteFooter, ConnectivityBanner)
  auth/
    supabaseClient.ts (safeSupabaseOrigin, sessionStorage, PKCE)
    supabaseAuth.ts (profileForUser, signIn, signOut, etc.)
    authTypes.ts (UserRole ADMIN/PSYCHOLOG/ORG_ADMIN, AuthenticatedUser)
    authStorage.ts (sessionStorage + memory fallback)
    adminApi.ts (list users, Edge Function invoke, explainEdgeFunctionError)
  lib/
    validation.ts (email regex, UUID, control char, length)
    dateGuards.ts (isValidDateOnly, Istanbul timezone)
    pagination.ts (toPagedRange, DEFAULT_PAGE_SIZE 50, MAX_PAGE_SIZE 100, sanitizeIlike)
  styles/
    tokens.css (:root --bg, --text, --muted, --border, --accent, --radius, --max, --nav-h — psikolog sitesi + MMPI)
    theme.css
    responsive.css (son sırada, dvh, 16px input, 44px touch, no !important/print)
    print.css (@media print)
  supabase/
    types.ts (generated or manual)
  tests/ (unit/integration/e2e)
```

### Component Architecture

- **UI primitives:** Button (primary/ghost/full, pill 999px, black/white — psikolog sitesi), Card (white border radius 14px), Input/Textarea (11px label uppercase muted), Modal (ConfirmDialog pattern), Table (TanStack or custom, search+filter+pagination hasMore+count visible), Badge (kicker pill with dot), Toast (psikolog sitesi + MMPI connectivity)
- **Layout:** Header sticky backdrop blur (psikolog sitesi nav), Sidebar (desktop), MobileNav hamburger (ikisi de), SiteFooter ortak, ConnectivityBanner (MMPI)
- **Feature components:** Her feature kendi api/types/hooks, ≤200 satır, reusable
- **Form:** React Hook Form + Zod — client validation + DB trigger double, honeypot where needed

### State Management

**Decision:** Zustand (veya Jotai) + localStorage draft + sessionStorage auth

**Reason:** MMPI'de useState/useEffect + localStorage draft TTL 30g + sessionStorage auth kanıtlandı, Redux ağır. Zustand hafif, TypeScript uyumlu, devtools var. Jotai de benzer, ama Zustand daha yaygın. Draft pattern MMPI'deki gibi: minimal JSON, ham görseller yok, TTL, outbox idempotency.

**Alternative:** Redux Toolkit

**Why rejected:** Boilerplate fazla, MVP için ağır, Zustand yeterli.

### Routing

**Decision:** History API custom router (MMPI router.ts iyileştirilmiş)

**Reason:** MMPI router kanıtlandı: parseRoute union, navigate with guards, useRoute hook, link interceptor document-level. Hash router değil (psikolog sitesi hash scroll, yeni platform multi-page). TanStack Router da olabilir ama custom router daha az bağımlılık, KVKK için sade. Navigation guards sadece editör için (MMPI).

**Alternative:** TanStack Router, React Router

**Why rejected:** TanStack Router iyi ama ek bağımlılık, custom router yeterli ve test edildi. React Router daha ağır, link interceptor manuel.

### Responsive

- Responsive from start (ikisi de öyle)
- Breakpoints: 600px container 40→32px, 760px grid collapse, 520px single column (psikolog sitesi) + MMPI dvh, 16px input (iOS zoom engel), 44px touch
- Container `min(var(--max), 100% - 40px)` pattern
- MobileNav + Sidebar
- responsive.css son sırada, no !important/print (MMPI sözleşme testleri)
- Tailwind? Karar: **Vanilla CSS with tokens** (psikolog sitesi :root + MMPI responsive.css) — Tailwind ek bağımlılık, KVKK minimal, ama ileride Tailwind eklenebilir. Faz 1 vanilla.

---

## 3. Backend Architecture

### Supabase

**Decision:** Yeni Supabase project, ayrı DB — MMPI DB'si kullanılmayacak

**Reason:** Prompt'ta zorunlu, güvenlik + izolasyon. MMPI DB'sine yeni danışan sistemi kurma.

**Alternative:** Aynı Supabase project farklı schema

**Why rejected:** İzolasyon zayıf, RLS karışır, KVKK risk.

### Auth

- Supabase Auth PKCE, persistSession true, autoRefreshToken true, detectSessionInUrl false, storage sessionStorage (MMPI)
- `safeSupabaseOrigin`: sadece https origin, localhost http/https istisna, pathname '/', no user/pass/search/hash
- Role: ADMIN (sistem), ORG_ADMIN (kurum), PSYCHOLOG (psikolog) — enum `user_role`
- Public registration kapalı: Supabase Dashboard Email provider Allow new users kapalı, `config.toml` aynı
- First admin: SQL `update profiles set role='ADMIN' where email=...` (MMPI)
- User management: Edge Function `admin-users` only (MMPI pattern), password Auth'ta, app tablolarına parola yok, delete önce Auth sonra cascade

### Database Architecture

#### Core Tables (MVP)

```sql
-- Organizasyon (multi-tenancy)
organizations (id uuid PK, name text 1-180, created_at)

-- Profil (org FK)
profiles (
  id uuid PK FK auth.users cascade,
  organization_id uuid FK organizations cascade,
  email text, first_name/last_name 2-80, role user_role default PSYCHOLOG, active bool default true,
  created_at/updated_at, check name length, index org+role+active
)

-- Danışan
clients (
  id uuid PK gen_random_uuid,
  organization_id uuid FK organizations cascade not null,
  file_number text unique (org içinde),
  first_name/last_name 1-80,
  birth_date date,
  phone text, email text,
  profession text, education text,
  status text (active/archived) default active,
  created_by uuid FK profiles cascade,
  created_at/updated_at,
  constraint org+file_number unique,
  index org+created_at desc + org+status
)

-- Anamnez (1-1 veya 1-N versiyonlu, MVP 1-1)
anamneses (
  id uuid PK,
  client_id uuid FK clients cascade,
  organization_id uuid FK organizations cascade,
  reason text, current_status text, personal_history text, family_history text,
  education text, profession text, social_life text, relationships text,
  previous_applications text, previous_assessments text, expert_notes text,
  created_by uuid FK profiles,
  created_at/updated_at,
  index client_id
)

-- Görüşmeler
sessions (
  id uuid PK,
  client_id uuid FK clients cascade,
  organization_id uuid FK organizations cascade,
  date date not null, type text, duration int, notes text, observation text,
  key_points text, plan text, follow_up text,
  created_by uuid FK profiles,
  created_at/updated_at,
  index client_id+date desc
)

-- Değerlendirmeler
assessments (
  id uuid PK,
  client_id uuid FK clients cascade,
  organization_id uuid FK organizations cascade,
  reason text, assessment_date date, method text,
  interview text, observation text,
  findings text, expert_evaluation text, result text, recommendations text,
  created_by uuid FK profiles,
  created_at/updated_at,
  index client_id
)

-- Test Tanımları (sistem + kullanıcı)
test_definitions (
  id uuid PK,
  organization_id uuid nullable (null=system),
  name text 1-180, description text, source text (mmpi, other),
  is_system bool default false,
  created_at
)

-- Test Uygulamaları
test_administrations (
  id uuid PK,
  client_id uuid FK clients cascade,
  assessment_id uuid FK assessments set null nullable,
  test_definition_id uuid FK test_definitions,
  organization_id uuid FK organizations cascade,
  administration_date date,
  status text,
  external_source text nullable (mmpi),
  external_assessment_id uuid nullable, -- MMPI kaydı ile ilişki, yeniden hesaplamaz
  created_by uuid FK profiles,
  created_at
)

-- Test Sonuçları (bağımsız entity, ham veri yok, sadece özet)
test_results (
  id uuid PK,
  test_administration_id uuid FK test_administrations cascade,
  organization_id uuid FK organizations cascade,
  result_data jsonb (object, ≤2MB),
  summary text,
  created_at
)

-- Raporlar
report_templates (
  id uuid PK,
  organization_id uuid FK organizations cascade nullable,
  created_by uuid FK profiles cascade nullable,
  name text 1-180, content jsonb object, is_system bool default false,
  created_at/updated_at,
  check (is_system and created_by null and org null) or (not system and created_by not null)
)

reports (
  id uuid PK,
  client_id uuid FK clients cascade,
  assessment_id uuid FK assessments set null nullable,
  test_administration_id uuid FK test_administrations set null nullable,
  template_id uuid FK report_templates set null,
  organization_id uuid FK organizations cascade,
  created_by uuid FK profiles cascade,
  title text 1-180 trim, content jsonb object ≤8MB, status draft/completed,
  source_snapshot jsonb object (danışan+değerlendirme+test özet anlık görüntü),
  source_version text,
  revision int default 1, version_number int default 1, last_version_at,
  save_reason enum create/autosave/manual/complete/refresh/restore,
  completed_at nullable,
  created_at/updated_at,
  index client_id+updated_at desc + org
)

report_versions (
  id uuid PK,
  report_id uuid FK reports cascade,
  version_number int,
  content jsonb, snapshot jsonb,
  created_by uuid FK profiles set null,
  created_at, reason text,
  unique report_id+version_number
)

-- Belgeler (private bucket)
documents (
  id uuid PK,
  client_id uuid FK clients cascade,
  organization_id uuid FK organizations cascade,
  file_name text, file_size int, mime_type text,
  storage_path text (private bucket),
  description text,
  created_by uuid FK profiles,
  created_at,
  index client_id
)

-- Randevular (faz 2)
appointments (id, client_id, org_id, date, duration, status, notes, created_by)

-- Görevler (faz 2)
tasks (id, client_id nullable, org_id, title, description, status, due_date, created_by)

-- Denetim izi
audit_logs (
  id uuid PK,
  organization_id uuid,
  actor uuid, action text check (client_insert/update/delete, anamnesis_..., session_..., assessment_..., report_..., document_...),
  target_table text, target_id uuid, created_at,
  index org+created_at desc + target
)

-- Ayarlar (antet/logo/imza)
psychologist_settings (
  created_by uuid PK FK profiles cascade,
  organization_id uuid FK organizations cascade,
  letterhead jsonb object ≤2MB (name,title,institution,phone,email,address,logo data URL, signature data URL),
  updated_at
)
```

#### Constraints & Triggers (MMPI'den ders)

- `set_updated_at()` trigger her tabloda
- `validate_client_intake()` — birth_date not future Istanbul, phone/email format, name length
- `protect_client_fields()` — file_number immutable after create? Tartışmalı, ama klinik alanlar immutable değil, anamnez versiyonlu olabilir
- `prepare_report()` — revision+1, version_number 10min autosave kuralı (MMPI), completed_at
- `version_report()` — security definer, immutable history
- `log_audit()` — after insert/update/delete → audit_logs, security definer, actor auth.uid()
- Payload size checks: result_data ≤2MB, content ≤8MB, letterhead ≤2MB
- `organization_id` her tabloda not null (except system templates), RLS org isolation

### RLS

**Decision:** Her hassas tabloda RLS, anon revoke, security definer helpers

**Helpers:**

```sql
is_active_user() → exists profiles where id=auth.uid() and active true
is_psychologist() → role PSYCHOLOG and active
is_admin() → role ADMIN and active
is_org_admin() → role ORG_ADMIN and active
is_org_member(org_id uuid) → exists profiles where id=auth.uid() and organization_id=org_id and active
```

**Policies (örnek):**

- profiles: select (uid=id or is_admin or is_org_admin same org), no direct update/delete (Edge Function only) — MMPI
- organizations: select is_org_member or is_admin, insert is_admin, update is_admin or is_org_admin
- clients: select is_admin or is_org_member(org_id), insert created_by=uid and is_psychologist and is_org_member, update is_admin or (owner+psychologist+org_member), delete same, plus org isolation
- anamneses/sessions/assessments: select via client org membership + is_admin, insert owner+psychologist+org_member, update same, delete same
- test_definitions: select is_system or org_member, insert not system and org_member, update/delete not system and (org_admin or owner)
- test_administrations/results: select via client org + admin, insert owner+psychologist+org_member, etc.
- reports: select is_admin or (created_by=uid and psychologist and org_member and exists client owned via org), insert created_by=uid and is_active and (admin or psychologist owns client via org) and template exists (system or own org), update same, delete same — MMPI pattern + org
- report_versions: select exists report (dolaylı)
- templates: select is_active and (is_system or org_member or admin), insert not system and created_by=uid and org_member, etc.
- documents: select is_admin or org_member, insert owner+psychologist+org_member, etc.
- audit_logs: select is_admin or is_org_admin same org, no client insert
- settings: select is_admin or owner+psychologist+org_member, write same

**Grants:** revoke all from anon, grant select/insert/update/delete to authenticated where appropriate, versions only select

### Storage

**Decision:** Private bucket `client-documents`, RLS + storage policies, no public URL

**Reason:** MMPI'de storage yoktu (data URL), ama danışan belgeleri için private bucket gerekli. Public URL asla. Signed URL short-lived where needed.

**Policies:**

- Bucket private, anon no access
- Policy: authenticated can upload where organization_id matches profile org and client org same
- Policy: select where org_member or admin
- Policy: delete where owner or org_admin or admin
- File size limit 10MB, mime whitelist (pdf, jpg, png, docx)
- Storage path: `org_id/client_id/filename-uuid`

### Routing

- History API router (MMPI) + protected routes
- Routes: / (login or dashboard), /dashboard, /clients, /clients/:id (file with tabs: genel/anamnez/görüşmeler/değerlendirmeler/testler/raporlar/belgeler/notlar/geçmiş), /clients/:id/anamnesis/:anamnesisId?, /clients/:id/sessions/:sessionId?, /clients/:id/assessments/:assessmentId?, /clients/:id/tests/:testId?, /clients/:id/reports/:reportId?, /documents, /settings, /admin (users/orgs), /audit-logs, 404
- Query params: ?tab=anamnesis, ?view=preview
- Navigation guards: report editor unsaved changes

### Component Architecture

- UI: Button, Card, Input, Textarea, Select, Modal, Table, Badge, Toast, ConfirmDialog, PaperViewport
- Layout: Header (sticky blur), Sidebar, MobileNav, Footer, ConnectivityBanner
- Feature: ClientList (search+filter+pagination), ClientForm, ClientFile tabs, AnamnesisForm, SessionList/Form, AssessmentForm, TestResult, ReportEditor (block editor MMPI templateEngine), ReportPreview, DocumentList/Upload

### State Management

- Zustand stores: authStore, clientStore, uiStore (toast, modal)
- localStorage draft: key `psikolog:client-draft:v1:<userId>`, TTL 30g, minimal JSON, no derived, outbox `psikolog:outbox:v1:<userId>` with idempotency_key uuid
- sessionStorage auth: AUTH_STORAGE_KEY `psikolog-auth`, memory fallback

### Forms

- React Hook Form + Zod
- Validation: client + DB trigger double (MMPI)
- Fields: Danışan file_number auto generate org içinde, first_name/last_name required 1-80, birth_date date not future Istanbul, phone/email optional but format, profession/education optional
- Anamnez: reason, current_status, personal_history, family_history, education, profession, social_life, relationships, previous_applications, previous_assessments, expert_notes — all text, no length hard but DB check ≤5000 each?
- Görüşme: date, type (select), duration int, notes, observation, key_points, plan, follow_up
- Değerlendirme: reason, assessment_date, method, interview, observation, tests (relation), findings, expert_evaluation, result, recommendations

### Reports & PDF

**Decision:** Browser print for preview + @react-pdf/renderer for professional PDF, HTML preview ≈ PDF

**Reason:** MMPI'de browser print (MMPIPrintReport) kanıtlandı, A4, sayfa no, header/footer. Custom PdfDocument writer sadece optik form içindi, yeni platformda gerek yok. @react-pdf/renderer ile profesyonel PDF, ama önce browser print yeterli MVP için. Faz 1 browser print, faz 2 @react-pdf.

**TemplateEngine:** MMPI templateEngine block model reuse: TextKind heading1/2/paragraph/bulletList/numberedList + table + dataField + dataTable, Inline bold/italic/underline, when conditional, {{path}} resolver, dataCatalog group Danışan/Değerlendirme/Geçerlik/Klinik/Profil/İzlenimler/Uzman

**Letterhead:** name,title,institution,phone,email,address,logo data URL, signature data URL — settings table, eski rapor etkilenmez (kopyalanır)

**PDF:** A4, profesyonel, okunaklı, sayfa numarası, başlık, footer, uzman bilgisi, tarih, HTML preview ile aynı görünüm — test ile kilitle

### Testing

- **Unit:** validation, dateGuards, pagination, templateEngine, reportDataAdapter, client grouping
- **Integration:** Supabase client api, RLS via PGlite (MMPI reportDatabase.test.ts pattern), report versioning
- **E2E:** Playwright — critical path Login→Dashboard→Create Client→Open→Anamnesis→Session→Assessment→Test Result→Report→Preview→PDF→Archive
- **DB:** PGlite real Postgres for all RLS/trigger, no network
- **Security:** IDOR (User A → User B client, org B, wrong report/doc id, anon private page, expired session, role escalation), storage policies, auth
- **Build:** Vite build + typecheck
- **Browser:** responsiveContracts (dvh, 16px, 44px, no !important)
- **Regression:** PDF/HTML parity

### Security

- RLS her tabloda, anon revoke, security definer search_path=public, revoke public
- Origin allowlist strict (MMPI admin-users), content-length double, control char rejection, escapeHtml, no service_role frontend, no VITE_ secret for service keys
- Audit logs trigger server-side
- IDOR: reports via client org, test_administrations external_assessment_id check, documents org isolation
- Storage: private bucket, no public URL, signed URL short-lived
- XSS: React escapes, templateEngine safe text, ReportPreview safe
- CSRF: Bearer, no cookie
- Secrets: .env.example only, .dev.vars gitignore, wrangler secret put
- File upload: size 10MB, mime whitelist, storage path org/client/uuid
- SQL injection: Supabase client parameterized, ilike sanitize
- Session: PKCE, sessionStorage, active check, ban_duration
- Role escalation: profiles update/delete revoked, Edge Function only, least privilege trigger
- KVKK: veri minimizasyonu, gereksiz 3rd party yok, hassas veri loglanmaz, public URL yok, PII LLM'e gitmez (AI varsa)

### Deployment

- Cloudflare Workers Static Assets (ikisi de aynı), Vite standard build, assets directory dist, not_found_handling SPA, routes psikolog.halilkaraduman.com.tr custom_domain true, workers_dev false
- CI: GitHub Actions verify: checkout, node 22, npm ci, typecheck, test, build
- ENV: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY via Cloudflare Builds Variables, Edge Functions secrets via supabase secrets set ALLOWED_ORIGINS, etc.
- No tracked single-file diff (MMPI'deki optik-form.html yok)

### Future MMPI Integration

```
psikolog.halilkaraduman.com.tr (yeni platform)
  ↓
assessment / test_administration
  ↓
external_source = "mmpi"
external_assessment_id = mmpi_records.id (UUID)
  ↓
mmpi.halilkaraduman.com.tr (bağımsız)
  ↓
Test sonucu (yeniden hesaplanmaz, sadece özet)
  ↓
Rapor (psikolog platformunda)
```

- Yeni sistem MMPI sonucunu yeniden hesaplamaz, scoring motoru kopyalamaz
- `test_administrations.external_source` + `external_assessment_id` ile ilişki
- `test_results.result_data` MMPI özetini tutar (T skorları, geçerlik, profil kodu) — ham sorular değil, sadece sonuç özet
- RLS: external_assessment_id erişimi için ek doğrulama gerekmez, çünkü sonuç zaten psikolog platformunda kopya, MMPI DB'sine bağlanmaz
- İleride MMPI Edge Function ile token exchange? Ama MVP'de manuel: psikolog MMPI'de raporu alır, özetini yeni platforma ekler veya link ile ilişkilendirir
- Ayrı Supabase project olduğu için cross-DB join yok, sadece external id

---

## 4. Mimari Kararlar Özeti

| Karar | Neden | Alternatif | Neden reddedildi |
|-------|-------|------------|------------------|
| Supabase yeni project | Prompt zorunlu, izolasyon, güvenlik | Aynı project farklı schema | RLS karışır, KVKK risk |
| React 19 + TS + Vite standard | MMPI kanıtlandı, TS zorunlu, cache | Next.js | SSR gereksiz, ek karmaşıklık |
| Vanilla CSS tokens | Psikolog sitesi sade tokens + MMPI responsive.css, minimal, KVKK | Tailwind | Ek bağımlılık, ama ileride eklenebilir |
| History API custom router | MMPI kanıtlandı, hash değil, hafif | TanStack/React Router | Ek bağımlılık, custom yeterli |
| Zustand | Hafif, TS, MMPI useState pattern iyileştirmesi | Redux | Ağır, boilerplate |
| RHF + Zod | TS, performans, validation double | Formik | Daha ağır, RHF daha modern |
| Private bucket, no public URL | KVKK, hassas belge | Public bucket | Sızıntı risk |
| Browser print + @react-pdf | MMPI print kanıtlandı, A4 profesyonel | Custom PdfDocument | Maintenance zor, sadece optik form içindi |
| PGlite RLS tests | MMPI kanıtlandı, network yok, gerçek Postgres | Mock | Gerçek RLS test etmez |
| SessionStorage auth | F5 korur, sekme kapanınca ölür, KVKK | localStorage | Sekme kapanınca kalır, risk |
| No MMPI scoring copy | Prompt zorunlu, etik, lisans | Kopyala | Yasal/etika risk, prompt yasak |

---

## 5. Faz Planı

### PHASE-00 (bu faz) — Mevcut proje analizi

- Repo123 + halilkaraduman.com.tr incele, karşılaştır, yeni mimari tasarla
- Çıktı: 4 doküman (bu dosya dahil) + PHASE-00.md
- Kod yok

### PHASE-01 — Proje iskeleti + Auth + DB

- Vite + React + TS init, design tokens, responsive.css, router, layout (Header/Sidebar/MobileNav/Footer)
- Supabase project kurulum, migrations (organizations, profiles, clients, audit_logs, is_active helpers), RLS, seed first admin SQL
- AuthGate, login, sessionStorage, protected routes, role ADMIN/PSYCHOLOG/ORG_ADMIN
- CI: typecheck + test + build
- Test: authStorage, RLS PGlite, responsiveContracts, build

### PHASE-02 — Danışanlar + Dosya

- Clients CRUD, file_number auto, search/filter/pagination (hasMore+count), status active/archived
- ClientFile tabs: Genel/Anamnez/Görüşmeler/Değerlendirmeler/Testler/Raporlar/Belgeler/Notlar/Geçmiş
- Draft + outbox + TTL + idempotency
- RLS + IDOR tests

### PHASE-03 — Anamnez + Görüşmeler

- Anamneses 1-1, form + validation
- Sessions 1-N, date/type/duration/notes/observation/key_points/plan/follow_up
- Pagination, audit logs

### PHASE-04 — Değerlendirmeler + Test Sonuçları

- Assessments + test_definitions + test_administrations + test_results
- External source mmpi link (no scoring)
- TestResult summary

### PHASE-05 — Raporlar + Şablonlar

- report_templates (system + user), reports, report_versions
- TemplateEngine block model (MMPI reuse), dataCatalog, when conditional, {{path}}
- ReportEditor autosave 1.4s, undo/redo, version history, restore, letterhead
- ReportPreview safe HTML

### PHASE-06 — PDF + Belgeler

- Browser print (MMPIPrintReport pattern) + @react-pdf A4
- Documents private bucket, upload, list, signed URL, storage policies
- PDF/HTML parity test

### PHASE-07 — Randevular + Görevler + Ayarlar + Yönetim + Audit Log

- Appointments, tasks, settings (letterhead logo/signature data URL), admin panel users/orgs, audit_logs read admin/org_admin

### PHASE-08 — Güvenlik + Test + Responsive Audit

- IDOR, RLS, storage, role escalation, anon, expired session tests
- E2E Playwright critical path
- Responsive audit (dvh, 16px, 44px, no !important)
- Build + browser tests
- Strix manual scan

### PHASE-09 — Polish + Deploy

- SEO, _headers, CSP, performance, accessibility
- Cloudflare Workers deploy, custom domain psikolog.halilkaraduman.com.tr
- Docs final

---

## 6. Riskler ve Önlemler

| Risk | Önlem |
|------|-------|
| KVKK sızıntı | RLS her tablo + org_id + anon revoke + private bucket + no public URL + no PII log + no 3rd party + data minimizasyonu + audit logs |
| IDOR | RLS + PGlite tests + E2E negative tests (User A→B, org B, wrong IDs) |
| Multi-tenancy unutulması | Her tabloda organization_id not null + RLS is_org_member + tests |
| PDF/HTML farkı | Print CSS + @react-pdf aynı tokens, parity test |
| Scope creep | MVP zincir, faz planı, her özellik için "gerçek ihtiyaç mı?" sorusu |
| MMPI scoring kopyalanması | Mimari external_source only, scoring yok, code review + docs |
| Offline veri kaybı | Draft + outbox + TTL + idempotency + connectivity banner |
| Auth public registration | Supabase dashboard kapalı + Edge Function only + first admin SQL |
| Rate limit bypass | KV/DO persistent rate limit (MMPI in-memory değil) + WAF |
| Secret sızması | .env.example only, .dev.vars gitignore, wrangler secret, no VITE_ service_role, no frontend secret |

---

## 7. Başarı Kriterleri (MVP)

- Login → Dashboard → Yeni Danışan → Dosya → Anamnez → Görüşme → Değerlendirme → Test Sonucu (external mmpi link) → Rapor → Önizleme → PDF → Arşiv zinciri çalışıyor
- RLS + IDOR tests yeşil
- PGlite RLS/trigger tests yeşil
- E2E Playwright critical path yeşil
- Responsive: desktop/tablet/mobile, dvh, 16px input, 44px touch
- Build + typecheck yeşil
- Security headers + CSP
- Private bucket, no public URL
- Audit logs yazıyor
- No MMPI scoring copy
- Docs PHASE-XX.md her faz
