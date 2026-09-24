# MMPI Repository Analizi — Repo123 (mmpi.halilkaraduman.com.tr)

Tarih: 2026-09-24
Repo: `kaaradumaann-psi/Repo123` — public, 193M (çoğu PDF kaynak), 316 dosya, 17+ commit, branch arena
Versiyon: 2.1.0, Node >=22

---

## 1. Frontend architecture

- **Stack:** React 19.2.0 + TypeScript 5.9.3 + Vite 7.3.6 (dev) + custom esbuild build (`scripts/build.mjs`)
- **Build çıktısı:** Tek dosya SPA `dist/index.html` — inline JS (module) + inline CSS + blob URL pdf.js worker. CSP hash'li. `import.meta.env` replace ile `VITE_SUPABASE_URL/ANON_KEY` embed. Supabase yapılandırılmamışsa offline build uyarısı ve sadece `/onizleme` rotası çalışır.
- **Dev:** `vite --host 0.0.0.0` + allowedHosts `.e2b.app` (arena preview uyumlu)
- **Router:** Hash router değil, History API tabanlı pathname router `src/router.ts`:
  - `parseRoute(pathname)` → `AppRoute` union: home, islem, form, kayitlar, kayit/:id, raporlar/:id/:reportId?, yonetim, sss, gizlilik, kullanim, kaynaklar, onizleme, bulunamadi
  - `navigate(to, {replace})` + `navigationGuards` Set (sadece editör kayıt eder)
  - `useRoute()` hook popstate + internal listeners
  - `installLinkInterceptor()` document-level click interceptor: aynı origin `<a>` SPA yapar, hash/mailto/tel/blob/data/download/target=_blank/cross-origin/api/* ve modifier key'leri atlar
  - SPA fallback: Cloudflare Workers `assets.not_found_handling: single-page-application` — `_redirects` üretmez (Workers 100324 sonsuz döngü hatası)

### Component architecture

```
src/App.tsx → AuthGate → (InfoPageShell|DesignPreviewPage|SignedInApp)
SignedInApp:
  - Dashboard (landing home)
  - CaseWorkspace (islem) — case lifecycle: intake → method → OMR/quick/raw → review → save
  - FormKit (form) — PDF hazırlık
  - MyRecordsPanel (kayitlar) — kendi kayıtları, search/date/gender/age filter + pagination
  - RecordDetailPage (kayit/:id) — sekmeli: Özet/Geçerlik/Klinik/Kod/Türetilmiş/Desenler/Kritik/Soru Yanıtları + expert_notes + rapor sayısı
  - ReportsPage (kayitlar/:id/raporlar + :reportId) — liste + editör
  - AdminPanel (yonetim) — psikolog listesi + tüm kayıtlar + audit_logs okuma
  - SiteFooter (her ekranda aynı düzen)
  - MobileNav, ConnectivityBanner, ConfirmDialog, Icon, etc.

results/:
  MMPIResultsPanel → tab router → Validity/Clinical/Code/Derived/Critical/Answers + MMPIScoreChart (profil grafiği)
  MMPIPrintReport → print-only, @media print içinde görünür, browser print → PDF, filename MMPI_Klinik_Raporu_<Danisan>_<tarih>

reports/:
  ReportEditor (694 satır) → blok editör (heading1/2/paragraph/bullet/numbered/table/dataField/dataTable) + autosave + undo/redo + letterhead + version history
  ReportPreview → React güvenli text output, HTML tablo
  ReportSettings → antet/logo/imza (data URL)
  ReportsPage → liste/oluştur/kopyala/sil/örnek/Tam Rapor
  templateEngine → block model, {{path}} resolver, when conditional, dataCatalog
  reportDataAdapter → mevcut sonuçların biçimlendirilmesi, anlık görüntü (snapshot) — yeni puanlama yok
  reportsApi → UUID doğrulamalı Supabase işlemleri, revision conflict kontrol
  useReportAutosave → 1.4s debounce, sıralı kaydetme, ayrılma uyarısı
  loadReportContext → getRecordDetail + parseRecordPayload + profileFromRecord (mevcut yol)

omr/ + scanner/ + form/:
  Form tanımı: formDefinition.ts → FormDefinition {formId,title,version,source:'unverified-template', fingerprint, pages[]}
  OMR pipeline: analyzePage → alignmentDetector → perspectiveCorrection → markDetector → bubbleRingRefinement → qrDecoder → pageIsolation → imageQuality → orientation
  Scanner: documentDetection → documentScan → enhancement → shadowNormalization → qualityGate → manualWarp → pageSequence → pdfIO
  UI: CameraCapture, CameraOverlay, ScannerWorkspace, ManualCornerEditor, ScanResultPreview, RegistrationMarks
```

- **Reusable:** FormKit, Icon, ConfirmDialog, PaperViewport, PageQr, QuickEntry, RawScoreEntry
- **Responsive:** `src/styles/responsive.css` son sırada, `!important`/`@media print` içermez. `mobile.css` + `scanner.css`. Kurallar:
  - viewport meta + notch safe area
  - 100vh yerine dvh
  - Mobilde (≤720px) input ≥16px (iOS zoom engel), kompakt kontroller ≥44px touch target
  - Tüm kurallar ekran medya sorgusu içinde
  - container `min(var(--max), 100% - 40px)`

### State management

- Redux/Zustand yok. React useState/useEffect + localStorage + sessionStorage.
- `workspace/caseTypes.ts`: CaseStep, ClientIntake, EntryMethod, validation
- `workspace/draftStorage.ts` (566 satır): localStorage ayna, DRAFT_VERSION=1, TTL 30 gün, key `mmpi566:case-draft:v1:<userId>`, OUTBOX `mmpi566:case-outbox:v1:<userId>`. OMR ham görselleri saklanmaz (MB, türetilmiş), sadece danışan + hızlı giriş + ham puan + OMR madde sonuçları + manuel düzeltmeler korunur. Kayıt ağ hatasıyla düşerse aynı `idempotencyKey` ile outbox'a alınır, bağlantı gelince retry. Hızlı giriş cevapları tek string: 'D'/'Y'/'B'/'-' (JSON undefined/null ayırt edemediği için)
- `workspace/useOnlineStatus.ts` + `ConnectivityBanner`
- Auth storage: `authStorage.ts` → sessionStorage (F5 korur, sekme kapanınca ölür), memory fallback private mode için
- `supabaseClient.ts`: safeSupabaseOrigin — sadece https origin (localhost http/https istisna), pathname '/', no username/password/search/hash

### Form yapısı

- Client intake: first_name, last_name, gender enum, age 16-120, occupation, education, application_date (Europe/Istanbul gün sınırı), requested_by
- Validation: `caseTypes.ts` + `validation/dateGuards.ts`, hem client hem DB trigger'da tekrar
- QuickEntry: 566 madde D/Y/B
- RawScoreEntry: scales object
- OMR: 4 sayfa, batchId regex `[A-F0-9]{24}`, pageNumber 1-4 distinct

### Table yapısı

- Ağır tablo yok. MyRecordsPanel/AdminPanel liste: search (sanitizeIlike `%_,` temizler), dateFrom/dateTo, gender, ageMin/Max, pagination `DEFAULT_PAGE_SIZE 50, MAX_PAGE_SIZE 100`, `hasMore` + `count` visible, sessiz kırpma yok

### Error handling

- `ValidationError` class → istemciye gösterilebilir
- `explainEdgeFunctionError` → FunctionsHttpError/RelayError/FetchError ayrımı, serverMessage() sadece `{error:string}` okur, 4096 byte limit, kontrol karakteri temizleme, 200 char slice — ham stack/SQL sızdırmaz
- `isDatabaseSideError` → GoTrue mesajları "Database error creating new user"/"unexpected_failure" + Postgres kodları 23502/23503/23505/23514/42501/42703/42P01/PGRST + audit/trigger/RLS/policy kelimeleri → 500 + `supabase db push` önerisi, diğerleri 400
- `isNetworkError` → outbox'a alma kararı
- Record payload: octet_length ≤8MB, array length 2 veya 5, kind/version check

### Loading state

- ConnectivityBanner, `useOnlineStatus`, autosave durum göstergesi (kaydediliyor/kaydedildi/hata), outbox retry

### Notification

- Empty state cards, confirm dialog, toast yok (psikolog sitesinde var), hata mesajları doğrudan panel içinde

---

## 2. Authentication

- Supabase Auth: PKCE, persistSession true, autoRefreshToken true, detectSessionInUrl false, storage sessionStorage
- `supabaseAuth.ts`: `profileFromRow` runtime doğrulama (UUID regex, email 254, name 2-80, control char check, role enum), `profileForUser`, `signIn` (email normalize lower, active check → signOut local), `userFromSession`, `onAuthChange`, `getSession`, `signOut` scope local
- `AuthGate.tsx` (328 satır): session hydration, profil/aktiflik doğrulama, yeni giriş vs mevcut session ayrımı, eski async cevap logout sonrası kullanıcıyı geri yükleyemez (race koruması)
- Protected route: App.tsx içinde route → workspace resolve, `supabaseConfig.configured` false ise sadece info sayfaları + onizleme, yoksa AuthGate içinde role bazlı yönlendirme (PSYCHOLOG → /kayitlar, ADMIN → /yonetim)
- Role: `user_role` enum ADMIN/PSYCHOLOG, least privilege: yeni Auth user trigger'ı `PSYCHOLOG` olarak ekler, ilk Admin SQL ile `update profiles set role='ADMIN'`
- Public signup kapalı: Supabase Dashboard Email provider "Allow new users" kapalı, `config.toml` aynı
- Kullanıcı yönetimi: sadece Edge Function `admin-users` üzerinden create/set_active/delete, password Auth'ta, uygulama tablolarına parola yazılmaz, delete önce Auth silinir sonra FK cascade profiles + mmpi_records temizler

## 3. Database

### Tablolar

- **profiles**: id uuid PK FK auth.users cascade, email text, first_name/last_name text not null, role user_role default PSYCHOLOG, active bool default true, created_at/updated_at timestamptz, check name length 2-80, index role+active, trigger set_updated_at
- **mmpi_records**: id uuid PK gen_random_uuid, idempotency_key uuid unique, client_first_name/last_name, gender check (Kadın/Erkek/Belirtmek istemiyor/Diğer), age int 16-120, occupation, education, application_date date, requested_by, raw_omr_answers jsonb not null (array), created_by uuid FK profiles cascade, created_at, expert_notes text default '' ≤4000, notes_updated_at timestamptz, indexes created_by+created_at desc, constraints: name length 1-80, answers object, raw payload size 8MB, age check not valid, future date check Istanbul timezone
- **audit_logs**: id uuid PK, actor uuid (auth.uid()), action check (record_insert/update/delete), target_table, target_id uuid, created_at, indexes created_at desc + target_table+target_id, RLS admin only, client insert/delete yok, trigger yazar
- **mmpi_report_templates**: id uuid PK, created_by FK profiles cascade nullable, name 1-180, content jsonb object, is_system bool default false, created_at/updated_at, check (is_system and created_by null) or (not system and created_by not null), system template id 000...0001
- **mmpi_reports**: id uuid PK, mmpi_record_id FK mmpi_records cascade, template_id FK templates set null, template_name, created_by FK profiles cascade, title 1-180 trim, content jsonb object ≤8MB, status draft/completed, source_data_snapshot jsonb object, source_data_version text, generated_at/created_at/updated_at/completed_at, revision int default 1, version_number int default 1, last_version_at, save_reason enum create/autosave/manual/complete/refresh/restore, check draft/completed_at null/not null
- **mmpi_report_versions**: id uuid PK, report_id FK reports cascade, version_number int, content jsonb, snapshot jsonb (to_jsonb report), created_by FK profiles set null, created_at, reason text, unique report_id+version_number, client tarafından değiştirilemez (trigger)
- **psychologist_report_settings**: created_by PK FK profiles cascade, letterhead jsonb object ≤2MB, updated_at

### Migration sistemi

- Supabase CLI `supabase db push`, `supabase/config.toml` içinde project ref, 6 migration:
  1. 20260915000000_initial_schema — profiles, mmpi_records, is_active/is_psychologist/is_admin func, RLS, grants
  2. 20260919000000_expert_notes_and_audit — expert_notes + audit_logs + trigger log_mmpi_record_change security definer
  3. 20260919010000_record_integrity — profiles update/delete revoke, age check not valid, raw payload size not valid, RLS tightened
  4. 20260919020000_record_immutability — validate_mmpi_record_intake (application_date Istanbul, array length 2/5, kind/version, method quick/raw/omr, batchId regex, page numbers distinct), protect_mmpi_record_fields (klinik alanlar immutable)
  5. 20260920000000_record_actions — expert_notes columns if not exists, update policy admin or owner, delete admin or owner, grant update (expert_notes, notes_updated_at)
  6. 20260923000000_psychologist_reports — report tables + prepare_mmpi_report trigger (revision+1, version_number 10min autosave kuralı, completed_at), version_mmpi_report trigger security definer, RLS reports/templates/versions/settings, grants

- `diagnose-supabase.mjs` — migration geçmişi, kolon/politika/grant/trigger, audit_logs sözleşmesi, Edge Function CORS doğrulaması, bağımsız teşhis betiği

### Foreign key ilişkileri

- profiles.id → auth.users.id cascade
- mmpi_records.created_by → profiles.id cascade
- mmpi_reports.mmpi_record_id → mmpi_records.id cascade (rapor silinmez, kayıt silinince rapor silinir; tersi değil)
- mmpi_reports.created_by → profiles.id cascade
- mmpi_reports.template_id → templates.id set null
- mmpi_report_versions.report_id → reports.id cascade
- psychologist_report_settings.created_by → profiles.id cascade
- Silme: Auth user silinince profiles + mmpi_records + reports cascade — bilinçli, veri minimizasyonu

### Indexes

- profiles_role_active_idx, mmpi_records_created_by_created_at_idx, audit_logs_created_at_idx, audit_logs_target_idx, mmpi_reports_record_idx (record_id+updated_at desc), mmpi_reports_owner_idx

### RLS

- Detaylı yukarıda. Kritik: `is_active_user()`, `is_psychologist()`, `is_admin()` security definer stable functions, search_path=public
- profiles: select (uid=id or is_admin), no update/delete via RLS
- mmpi_records: select is_admin or (created_by=uid and is_active), insert created_by=uid and is_psychologist, update (is_admin or owner+psychologist), delete same
- audit_logs: select is_admin, revoke all from authenticated, grant select only
- reports: select is_admin or (created_by=uid and is_psychologist and exists record owned), insert created_by=uid and is_active and (is_admin or psychologist owns record) and template exists (system or own), update same, delete same
- versions: select exists report ( dolaylı olarak aynı RLS zinciri)
- templates: select is_active and (is_system or created_by=uid or is_admin), insert not system and created_by=uid and (psychologist or admin), update/delete not system and (admin or owner+psychologist)
- settings: select/write is_admin or owner+psychologist
- anon: revoke all

### Kullanıcı/rol modeli

- Enum ADMIN/PSYCHOLOG, active bool, ban_duration via Auth admin API (active false → 876000h ban)
- Admin tüm kayıtları görür, audit log okur, psikolog hesapları yönetir
- Psychologist sadece kendi kayıtları, kendi raporları

### Veri erişim modeli

- `supabaseRecords.ts` (614 satır): `SavedAnswerPage`, `MMPIRecord`, `RecordSummary`, `FullRecordDetail`, `RecordInput`, `RecordsQuery`, `PagedRecords`, `sanitizeIlike`, `toPagedRange`, `applyCommonFilters`, `RAW_PAYLOAD_MAX_BYTES`, `OWN_RECORDS_LIMIT 100, ALL_RECORDS_LIMIT 200, DEFAULT_PAGE_SIZE 50, MAX_PAGE_SIZE 100`
- Upsert idempotency_key ile çift kayıt engeli
- `recordEdit.ts` — expert_notes update
- `patientGrouping.ts` — danışan gruplama

---

## 4. Supabase

- **Edge Functions:**
  - admin-users (284 satır): Deno, service_role, ALLOWED_ORIGINS parse (sadece https origin, localhost http/https, pathname '/', no user/pass/search/hash), isAllowedOrigin (configured varsa sadece onlar, yoksa localhost-only), CORS headers Access-Control-Allow-Headers/Methods + Vary Origin, Bearer JWT → adminClient.auth.getUser, caller profile ADMIN+active, content-length 32KB, body 32KB, actions: create (firstName 2-80, lastName 2-80, email 5-254 regex, password 10-128, no control char, email_confirm true, user_metadata first/last, rollback Auth if profile read fails, safeProfile validation), set_active (UUID regex, target role PSYCHOLOG, Auth ban_duration update + profile active update with rollback), delete (UUID, target PSYCHOLOG, Auth delete first then cascade), error classification isDatabaseSideError, ValidationError 400 vs 500+db push, outer try/catch CORS başlıksız yanıt engeli
  - ai-interpretation (542 satır): Deno, service_role, ALLOWED_ORIGINS aynı, rate limit best-effort Map: 1 req/10s + 20 req/hour per user, MAX_BODY 64KB, SCALE_IDS Set, AiSummary {gender, method, client:{age}|null, scales[], validity, profileCode, maxT, minT} — isim/soyisim yok KVKK, boundedString control char check, detect provider: AI_MODEL startsWith gemini → gemini, gpt/o1/o3/o4/chatgpt → openai, AI_PROVIDER explicit, AI_API_BASE contains generativelanguage → gemini, API key prefix AIza./AQ. → gemini, callGemini: base https://generativelanguage.googleapis.com/v1beta, models/<model>:generateContent, header x-goog-api-key, callOpenAiCompatible: base https://api.openai.com/v1 default, /chat/completions, Authorization Bearer, callModel wrapper, RequestBody {mode record/draft, recordId, profile}, mode record → service role ile kayıt okunur + RLS sahiplik doğrulama (owner or admin) → IDOR koruması, 503 if AI_API_KEY yok, 502 with distinguishable messages 401/403 key, 404 model, 429 kota, safety block, logUpstreamFailure only server log, FunctionError class code'lu, client only numeric summary gönderir

- **Storage:** Kullanılmıyor. Logo/imza data URL olarak letterhead jsonb ve rapor content içine kopyalanır. Storage bucket yok, private bucket ihtiyacı yok bu repo'da
- **Database:** Yukarıda detaylı
- **Auth:** Yukarıda
- **RLS:** Yukarıda
- **Environment variables:** VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (frontend), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (Edge Function auto), ALLOWED_ORIGINS, AI_API_KEY, AI_MODEL, AI_API_BASE, AI_PROVIDER

---

## 5. Güvenlik

- RLS her hassas tabloda, anon revoke
- Security definer functions search_path=public, revoke public
- Origin allowlist strict parsing, localhost-only fallback
- Content-Length + body byte length double check
- Validation: email regex, UUID regex, control char /[\\u0000-\\u001f\\u007f]/ rejection, length checks, HTML escape
- No service_role in frontend, no VITE_ secret prefix for service keys
- Audit logs trigger, server-side, client bypass yok
- IDOR: ai-interpretation record mode + reports RLS record ownership check + mmpi_records ownership
- XSS: escapeHtml in worker, templateEngine safe text, ReportPreview React güvenli
- CSRF: Same-origin + Bearer, no cookie auth
- Secrets: .env.example only, .dev.vars gitignore, wrangler secret put
- File upload: yok (kamera/file input OMR için, ama Storage'a yazmaz, client-side işler)
- SQL Injection: Supabase client parameterized, ilike sanitize %_, 
- Session: PKCE, sessionStorage, active check, ban_duration
- Role escalation: profiles update/delete revoked, only Edge Function, trigger least privilege
- Data URL logo: <2MB limit, PNG/JPEG/WebP check client-side
- CSP: single inline script hash, connect-src only Supabase origin, no remote fonts/scripts in production build, _headers in psikolog sitesi but MMPI build also CSP via build.mjs

---

## 6. Test

- 66 test, `tsx --test tests/*.test.ts`, Node test runner
- **Unit:** mmpiScoring, mmpiKeyIntegrity, mmpiClinical blocks (Hs/D/Hy/Pd/Pa/Pt/Sc/Ma/Si), mmpiInterpretation, mmpiScaleDossiers, mmpiKPlusAndPatterns, mmpiExtended, mmpiE2EValidation, omrEngine, omrPerspective, omrSafety, omrBackwardCompatibility, omrPeripheralIsolation, bubbleRing, layout, formIdentity, captureGates, captureRobustness, cameraAdvisor, comparison, enhancement, manualWarp, shadowNormalization, fileIdentify, diagnostics, draftStorage, authStorage, caseWorkspace, patientGrouping, recordProfile, rawScoreRoundTrip, savedPage, printLayout, printPath, pdfForm, pdfScanPipeline, pdfWorkerHardening, mmpiUiReport, mmpiClinicalReportUi, recordDetailUi, responsiveContracts, etc.
- **Integration:** reportDatabase.test.ts → PGlite WASM real Postgres, migrations + ownership + admin + immutable history + atomic versioning + cascades, 90s timeout
- **Browser:** responsiveContracts, cloudflareDeploy, build.test.ts (single-file build contains one intact inline script, no src import, site footer, author meta, CSP, print footer hidden, etc.)
- **E2E:** mmpiE2EValidation, caseWorkspace lifecycle
- **Build:** build.test.ts, pdfForm, cloudflareDeploy
- **Regression:** omrBackwardCompatibility, responsive final reports (docs/reports/)
- **Security:** edgeFunctions.test.ts (syntax via esbuild transform, Error subclass, no raw error.message, 500+db push classification, outer try/catch), auditDocsConsistency, recordErrors (IDOR), aiSummaryPrivacy (no name to LLM), authStorage, adminApiErrors

---

## 7. OMR / Scanner

### OMR

- `src/omr/formDefinition.ts`: FormDefinition, PageDefinition, ItemDefinition, ResponseArea, AlignmentMark, fingerprint, version
- `analyzePage.ts`: ana pipeline
- `alignmentDetector.ts`: hizalama markaları bulma
- `alignmentVerification.ts`: doğrulama
- `markDetector.ts`: bubble doluluk algılama
- `bubbleRingRefinement.ts`: halka iyileştirme
- `imageQuality.ts`: bulanıklık/ışık kalitesi
- `orientation.ts`: rotasyon
- `pageIsolation.ts`: sayfa izolasyon
- `perspectiveCorrection.ts`: perspektif düzeltme (4 köşe)
- `qrDecoder.ts`: jsqr ile QR decode, page identity
- `omrTypes.ts`: RectMm (mm from A4 top-left), Point, PixelImage, GrayImage, PageIdentity
- `form/` : layout.ts (mm cinsinden dikdörtgenler), pageIdentity.ts (version/fingerprint/batchId/pageNumber/totalPages), formSet.ts, headerLayout.ts, attribution.ts

### Scanner

- `documentDetection.ts`: kağıt kenar bulma
- `documentScan.ts`: tarama
- `cameraAdvisor.ts`: kamera tavsiyesi (ışık, mesafe)
- `comparison.ts`: karşılaştırma
- `enhancement.ts`: iyileştirme
- `imageIO.ts`: image load
- `manualWarp.ts`: manuel köşe düzeltme (ManualCornerEditor)
- `pageSequence.ts`: ScanSet, 4 sayfa aynı batch
- `pdfIO.ts`: PDF sayfa ayırma (pdfjs-dist)
- `qualityGate.ts`: kalite kapısı
- `reviewGeometry.ts`: review geometri
- `scanAndAnalyze.ts`: tarama + analiz orkestrasyon
- `shadowNormalization.ts`: gölge normalizasyon
- UI: CameraCapture, CameraOverlay, ImageEnhancer, RecordCapture, ScanResultPreview

### Mimari karar

- Tüm OMR client-side, sunucuya ham piksel gitmez
- Ham görseller saklanmaz, sadece madde sonuçları + manuel düzeltmeler + reviewHistory (kim/ne zaman/önceki/sonraki)
- BatchId ile 4 sayfa aynı form seti olduğu doğrulanır
- Quality report + warnings

---

## 8. Scoring / Raporlama

### Scoring

- `mmpiScoring.ts` 463 satır: ham puan → K düzeltme → T puanı (Savaşır 1981 Türk normları), klasik K ekleme tablosu
- `mmpiKeys.ts`: 566 madde anahtarları
- `mmpiSource.ts` + `mmpiSourceCodes.ts`: kaynak kitaba dayalı geçerlik ve klinik yorumlar (T bantları, Mf erkek/kadın ayrı, tek ölçek yükselmeleri, iki noktalı kod)
- `mmpiValidityConfigs.ts`: 15 geçerlik profili konfigürasyonu (V Şekli, Tersine V, tümüne yanlış vb.)
- `mmpiConsistency.ts`: TR (tekrarlanmış maddeler) + Dikkatsizlik endeksi
- `mmpiDerived.ts`: Goldberg/Taulbee/Peterson ayırma endeksleri
- `mmpiCritical.ts`: 11 kişilik bozukluğu ölçeği (PDI-IV), alkol/madde (MacAndrew vb.)
- `mmpiInterpretation.ts`: klinik yorum üretimi
- `mmpiScaleDossiers.ts`: ölçek dosyaları
- `version.ts`: data version
- Geçersizlik: ? ≥31 veya F ham ≥23 → GECERSIZ, F-K >16, status GECERLI/SUPHELI/GECERSIZ
- Tüm puanlama cihazda, sunucuda değil

### Test sonucu / Report / Graph / PDF

- `results/`: `recordProfile.ts` (profil oluşturma), `resultNormalizer.ts` (isEffectiveItem), `resultValidator.ts`, `scanResultTypes.ts` (ItemReadResult, ManualReview, QualityReport, StoredScanPage)
- `MMPIScoreChart`: profil grafiği (T puanları)
- `MMPIPrintReport.tsx` 589 satır: profesyonel klinik rapor, ekran gizli print-only, @media print görünür, tarayıcının PDF filename önerisi `MMPI_Klinik_Raporu_<Danisan>_<gg-AA-yyyy>`
- `reports/`: Psikolog raporları (yukarıda) + Tam Rapor (MMPIPrintReport aynen)
- Kaynaklar: `/kaynaklar` sayfası, sabit içindekiler şeridi, numaralı bölümler, künye + uygulamadaki karşılığı, raporlara sadece kısa yöntem notu
- PDF form: custom PdfDocument writer (PDF 1.7, xref, Flate), ttfFont, formPdf, renderFormPdf, scripts/generate-pdf.ts, verify-pdf.ts

---

## 9. Deployment

- **Cloudflare Workers Static Assets:** `wrangler.jsonc` name mmpi, compatibility_date 2026-09-18, routes pattern mmpi.halilkaraduman.com.tr custom_domain true, workers_dev false, preview_urls false, observability enabled, assets directory ./dist, not_found_handling single-page-application
- **Build:** `scripts/build.mjs` esbuild, bundle src/main.tsx, minify, write false, outdir dist, jsx automatic, target es2022, define import.meta.env JSON, asset-imports plugin ?raw ?inline (data URI), shell index.html read, scriptBody escape </script + \t, sha256 hash, CSP connect-src Supabase origin + wss/ws variant, supabaseOrigin validation
- **CI:** `.github/workflows/ci.yml` — push main + PR, ubuntu-latest, node 22, npm ci, typecheck, test, verify:pdf, build, git diff --exit-code optik-form.html (takip edilen single-file deliverable byte-identical kalmalı)
- **Strix:** manual workflow_dispatch, pipx strix-agent==1.6.2, -n -t ./ --scan-mode quick, hedef kaynak+dist, canlı Supabase'e istek yok (KVKK), secret STRIX_LLM/LLM_API_KEY, artifact strix_runs/
- **ENV:** Cloudflare Builds → Variables and secrets: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY; Edge Functions: ALLOWED_ORIGINS, AI_API_KEY, etc. via `supabase secrets set`

---

## 10. Strengths (Alınacak Dersler)

1. **RLS + Trigger + Edge Function üç katmanlı güvenlik:** Client doğrulaması yetki değil, DB trigger immutable, Edge Function service_role. Yeni platform için örnek.
2. **PGlite ile gerçek RLS/trigger testi:** Network yok, production DB'ye dokunmadan güvenlik testi. Mutlaka tekrar kullanılmalı.
3. **Idempotency + Outbox:** `idempotency_key` + `localStorage` outbox + auto retry, çift kayıt yok. Danışan platformunda da gerekli.
4. **SessionStorage auth:** F5 korur, sekme kapanınca ölür — KVKK için iyi. Memory fallback private mode.
5. **Origin allowlist strict parsing:** pathname '/', no user/pass/search/hash, localhost-only fallback — güvenli CORS.
6. **Error sınıflandırma:** `isDatabaseSideError` ile 400 vs 500+`supabase db push` ayrımı, teşhis kolay.
7. **Tek dosya build + CSP hash:** Offline-first, remote font yok, connect-src sadece Supabase origin. Güvenlik + performans.
8. **OMR pipeline ayrışması:** alignment/mark/qr/quality ayrı modüller, test edilebilir. Yeni platformda belge tarama için ilham.
9. **Draft TTL + minimal saklama:** Ham görseller saklanmaz, sadece gerekli JSON, 30 gün TTL — veri minimizasyonu.
10. **Audit logs trigger:** Sunucu taraflı, client atlayamaz, actor auth.uid().
11. **Report versioning atomic:** Trigger ile revision + version_number, autosave 10min kuralı, optimistic concurrency, history immutable.
12. **Data URL logo/imza:** Storage bucket karmaşası yok, rapor içine kopyalanır, eski rapor etkilenmez.
13. **Responsive sözleşme testleri:** dvh, 16px input, 44px touch, no !important — test ile kilitli.
14. **AI KVKK:** İsim/soyisim LLM'e gitmez, sadece yaş+cinsiyet+sayısal özet, 24h local cache, mode=record IDOR koruması.

## 11. Weaknesses / Technical Debt

1. **Monolitik App.tsx + büyük componentler:** AdminPanel 877 satır, ReportEditor 694, CaseWorkspace vs. Ayrışması zor.
2. **Custom esbuild build:** Vite plugin değil, maintenance zor, Vite config ile senkron değil.
3. **Single-file build:** Tüm JS inline, cache yok, her deploy full download. Büyük app için uygun değil.
4. **No multi-tenancy:** `organization_id` yok, tek kurum varsayımı. Yeni platformda gerekli.
5. **Storage yok:** OMR görselleri saklanmıyor — bazen gerekebilir (yasal saklama). Ama KVKK için bilinçli.
6. **Rate limiting in-memory Map:** Worker isolate ölünce sıfırlanır, persistent değil. WAF + KV/DO gerekir.
7. **PGlite sadece reportDatabase testinde:** Diğer RLS testleri yok, sadece o tabloda var.
8. **Scoring hard-coded:** MMPI-1 566, MMPI-2/2-RF yok, normlar kod içinde. Yeni platform scoring motoru yazmamalı.
9. **Form tanımı unverified-template:** Lisanslı MMPI materyali değil, disclaimer gerekli.
10. **AI cache localStorage:** Aynı cihazda iki hesap aynı key kullanırsa çakışma — user-specific key ile çözülmüş ama yine localStorage.
11. **No pagination UI test:** Backend pagination var ama UI test eksik.
12. **No E2E browser test:** Sadece Node test, Playwright/Cypress yok.

## 12. What should NOT be copied

- ❌ MMPI scoring motoru, normlar, sorular, anahtarlar, yorum metinleri — yeni platforma taşınmamalı
- ❌ Single-file build — yeni platformda Vite standard build + Cloudflare Workers Static Assets ayrı olmalı
- ❌ Monolitik App.jsx — yeni platformda feature-based folder + small components
- ❌ OMR kodunun birebir kopyası — yeni platformda OMR yok, ama belge tarama için ilham alınabilir
- ❌ `mmpi_records` tablosu doğrudan — yeni platformda `clients`, `assessments`, `sessions` ayrı
- ❌ Custom PDF writer — yeni platformda `react-pdf` veya browser print + `puppeteer`? Ama önce browser print yeterli
- ❌ In-memory rate limit — KV ile yapılmalı
- ❌ `optik-form.html` tracked deliverable — yeni platformda gerek yok

## 13. Architecture lessons to reuse

- ✅ Supabase Auth PKCE + sessionStorage + active check + least privilege trigger
- ✅ RLS helper functions is_active/is_psychologist/is_admin security definer
- ✅ Profiles update/delete revoke, Edge Function only
- ✅ Audit logs trigger server-side
- ✅ Idempotency key + outbox + TTL
- ✅ Origin allowlist strict parsing + localhost-only fallback
- ✅ Error classification 400 vs 500 + db push hint
- ✅ PGlite real Postgres RLS/trigger tests
- ✅ Report versioning trigger atomic + revision optimistic concurrency
- ✅ Data URL for small private files (logo/imza) to avoid bucket
- ✅ Draft storage minimal + TTL + no derived artifacts
- ✅ Responsive contracts via tests (dvh, 16px, 44px)
- ✅ AI KVKK: no PII to LLM, numeric summary only, IDOR check
- ✅ SPA History API router + link interceptor + navigation guards
- ✅ Connectivity banner + offline handling
- ✅ CSP + _headers hardening
