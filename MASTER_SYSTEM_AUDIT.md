# MASTER SYSTEM AUDIT

**Repo:** `kaaradumaann-psi/psikolog` @ `340930b` (branch: `arena/01a0d937-psikolog`)
**Tarih:** 2026-09-25
**Kapsam:** PHASE 0 – PHASE 6 (yalnızca inceleme). **Bu fazda hiçbir repo dosyası değiştirilmedi** (`git status` temiz).
**Yöntem:** kaynak okuma + migration okuma + PGlite (gerçek PostgreSQL/WASM) RLS denemeleri + gerçek store modülleriyle sentetik workflow denemesi + `npm run typecheck` / `npm test` / `npm run build` + GitHub PR geçmişi.

## 0. Yönetici özeti (en kritik 6 bulgu)

| # | Bulgu | Kanıt | Sonuç |
|---|---|---|---|
| 1 | **Klinik verinin tamamı yalnızca `localStorage`'da.** Supabase şeması (17 tablo + RLS + Storage) var ama arayüz klinik tablolara **tek satır bile yazmıyor/okumuyor.** | `src/clinical/clinicalStore.ts:19-25`, `src/clinical/practiceStore.ts:90-97`; `src/` içinde Supabase kullanan tek yerler: `src/auth/*`, `src/features/admin/adminApi.ts` (`grep "\.from("` klinik kodda 0 sonuç) | Ürün "bulut klinik platformu" değil, **tek tarayıcıya bağlı yerel bir dosya uygulaması**. Cihaz değişince, depo temizlenince veya tarayıcı değişince veri yok. |
| 2 | **Aynı tarayıcıda oturum açan her psikolog aynı veriyi görüyor.** LocalStorage anahtarları kullanıcı/kurum ile adlandırılmamış. | `psikolog_clients_v2`, `psikolog_sessions_v2`, `psikolog_*_v2` sabit anahtarlar; `src/auth/authStorage.ts` yalnızca oturumu `sessionStorage`'da tutuyor; çıkışta kayıtlar silinmiyor | Kimlik doğrulama var, **veri izolasyonu yok**. Aynı cihazı kullanan iki uzman birbirinin dosyasını görür. |
| 3 | **Yerel veri buluta hiç yazılmadığı için RLS fiilen kullanılmıyor**; üstelik var olan RLS'te aynı kurum içi okuma ve tenant sızma boşlukları ölçüldü. | PGlite denemesi: PSY_A2, aynı org'daki PSY_A1'in danışanını **okuyabiliyor**; `sessions`/`anamneses` insert'te `client_id`'nin aynı org'a ait olduğu **doğrulanmıyor** | İstenen "Psychologist A → Client B ✗" matrisi **kurum içinde sağlanmıyor**; `clients_select` org seviyesinde (`20260924000000_initial_schema.sql:356-361`). |
| 4 | **Randevu → Seans → Not zinciri bağlı değil.** `SoapSession`'da `appointmentId` yok; "Görüşmeyi tamamla" yalnızca durumu değiştirip dosyayı açıyor; seans bilgileri elle yeniden giriliyor. | `src/clinical/clinicalTypes.ts` (SoapSession alanları), `src/components/clinical/AppointmentsPage.tsx:126-129`; store denemesi: `SoapSession keys: ... (appointmentId yok)` | Aynı iş iki kez giriliyor; randevu ile not arasında doğrulanabilir bağ yok; seans numarası çakışabilir. |
| 5 | **Klinik notta imza/kilit/sürüm yok.** Seans notu serbestçe düzenlenir ve silinir; değişiklik denetim izine de yazılmaz. | `sessions` tablosu kolonları: `id, client_id, organization_id, date, type, duration, notes, observation, key_points, plan, follow_up, created_by, created_at, updated_at` (imza/status yok); `saveSoapSession`/`deleteSoapSession` içinde `recordAudit` çağrısı yok (`clinicalStore.ts:158-177`) | Savunulabilir klinik dokümantasyon ve "imza bekliyor" görevi üretilemez. |
| 6 | **Veri kaybı tuzakları:** belgeler base64 `dataUrl` olarak ~5-10 MB'lık localStorage kotasına yazılıyor (dosya başına 1.5 MB); kota dolunca yazma bloke oluyor; taslak/outbox modülü ölü kod. | `practiceStore.ts:86-88` (`MAX_LOCAL_DOCUMENT_BYTES = 1_500_000`), `clinicalStore.ts:57-65` (`reportStorageError`), `src/workspace/draftStorage.ts` yalnızca testlerden çağrılıyor | Sessiz veri kaybı riski; "kaydedildi" görünen işlem kota nedeniyle düşebilir. |

---

## 1. Architecture Map

| Katman | Gerçek karşılık | Durum / not |
|---|---|---|
| Frontend | React 19 + Vite 7 SPA, `src/main.tsx`, `src/App.tsx` (366 satır) | Tek paket; kod bölme yalnızca `manualChunks` (react, supabase) |
| Router | **Kendi History API router'ı**: `src/router.ts` (`parseRoute`, `navigate`, `useRoute`, `registerNavigationGuard`, `installLinkInterceptor`) | React Router **yok** (bağımlılık eklenmemiş — korunmalı) |
| Backend | Yok (sunucu uygulaması yok). Yalnızca Supabase + 1 Edge Function | API katmanı yok; tüm mantık tarayıcıda |
| Supabase (istemci) | `src/auth/supabaseClient.ts` — anon/publishable key ile `createClient`, `pkce`, `detectSessionInUrl: false`, oturum `sessionStorage` (`psikolog-auth`) | `service_role` tarayıcıda yok (doğrulandı) |
| Auth | `src/auth/supabaseAuth.ts` (`signInWithPassword`, `profileForUser`, self-heal insert, `signOut` local), `src/App.tsx` içinde `CloudGate` | Ayrı `AuthGate` bileşeni yok; kayıt kapalı (`supabase/config.toml: enable_signup=false`) |
| Database | `supabase/migrations/*.sql` — 7 migration, 17 tablo + `storage.buckets/objects` politikaları | **Arayüz tarafından kullanılmıyor** (bkz. §3, §10) |
| Storage | `client-documents` private bucket (migration ile `storage.buckets` kaydı), politika yolu `<org_id>/<client_id>/...` | Kodda hiçbir `storage.upload/download` çağrısı yok |
| Edge Functions | `supabase/functions/admin-users/index.ts` (423 satır: origin allowlist, JWT doğrulama, rol kontrolü, create/set_active/set_org/delete) | Tek Edge Function; UI yalnızca `create` + `list` kullanıyor |
| State management | React `useState/useMemo` + iki modül seviyesi store (`clinicalStore`, `practiceStore`) ve basit listener yayını (`subscribeClinicalStore`, `subscribePracticeStore`) | Redux/Zustand **yok** (eklenmemiş — korunmalı) |
| Repository / Sync | **Yok.** Ne repository katmanı, ne sync kuyruğu, ne outbox. `src/workspace/draftStorage.ts` (draft + outbox) tanımlı ama **hiçbir üretim kodundan çağrılmıyor** (yalnız `tests/draftStorage.test.ts`) | "localStorage cache / cloud kaynak" ayrımı **mevcut değil** |
| Routes | 17 sayfa yönü (`src/router.ts:22-53`) + `/kayitlar`, `/clients`, `/dashboard`, `/login`, `/appointments`, `/tasks`, `/settings`, `/audit` takma adları | Detay: §2 |
| Tests | `tests/*.test.ts` — 20 dosya, **90 test/90 pass**; `node:test` + `tsx`; PGlite ile gerçek PostgreSQL RLS testleri; `vite` SSR ile DOM render testi | Build testi `npm run build`'i de tetikliyor |
| Build | `npm run build` = `tsc --noEmit && vite build`; `vite.config.ts` (host 0.0.0.0, `allowedHosts: ['.e2b.app']`) | Geçti (bkz. §36 kanıt) |
| Deployment | Cloudflare Workers statik SPA (`wrangler.jsonc` → `psikolog.halilkaraduman.com.tr/*`), güvenlik başlıkları `public/_headers` | DNS/production canlı doğrulaması bu ortamda yapılamadı |
| CI | `.github/workflows/ci.yml`: `npm ci` → `typecheck` → `test` → `build` | Yerel eşdeğeri geçti |

**Mimari özet:** iki paralel veri modeli var — (a) ürünün gerçekten kullandığı localStorage modeli, (b) ürünün hiç kullanmadığı Supabase modeli. Bu ikilik raporun ana temasıdır.

---

## 2. Route Map

Kaynak: `src/router.ts`. Rol sütunu: bu repoda **rota bazlı rol koruması yok**; yalnızca "Supabase yapılandırılmışsa giriş zorunlu" (CloudGate) ve Ayarlar içinde `canAdmin` (ADMIN/ORG_ADMIN) koşulu var.

| Route | Sayfa | Rol | Amaç | Veri kaynağı | Auth | RLS | Mevcut sorun |
|---|---|---|---|---|---|---|---|
| `/`, `/index.html`, `/dashboard`, `/login` | `Dashboard` | Tümü | Günün tahtası: bugünkü görüşmeler, takip uyarıları, yarın | localStorage (`casework.buildSessionPreps/buildAttention`) | Var (supabase varsa) | Kullanılmıyor | `/login` ayrı bir giriş rotası değil; giriş yapmış kullanıcı için anlamsız takma ad |
| `/danisanlar`, `/clients`, `/kayitlar` | `ClientListPage` | Tümü | Danışan listesi, arama, filtre, intake modalı | localStorage `psikolog_clients_v2` | Var | Kullanılmıyor | Anamnez alanları buradaki **tek modaldan** giriliyor (uzun form, adım yok) |
| `/danisanlar/:id` (`/clients/:id`) | `ClientDetailPage` | Tümü | Dosya: sekmeler (sessions/formulation/tests/progress/overview/notes/documents/reports) | localStorage (client + bağlı kayıtlar) | Var | Kullanılmıyor | Randevu sekmesi ve timeline **yok**; sekme değişimi URL'ye yazılmıyor (`?sekme=` yalnız okunuyor); seans için kalıcı bağlantı yok |
| `/seanslar` | `SoapSessionsPage` | Tümü | SOAP seans listesi + arama/filtre + modal | localStorage `psikolog_sessions_v2` | Var | Kullanılmıyor | Seans oluşturma formu **dosyadaki formun kopyası**, alanları farklı (burada ücret alanı var, dosyada yok) |
| `/testler` | `AssessmentHubPage` | Tümü | Ölçek kütüphanesi + tamamlanan değerlendirme geçmişi | localStorage (BDI/BAI/SCL90 + screenings) | Var | Kullanılmıyor | Geçmişte bağlantısız kayıtlar "Danışan" adıyla görünebiliyor |
| `/testler/beck-depresyon` | `BeckDepressionPage` | Tümü | BDI uygulama + canlı puan + kayıt | localStorage | Var | Kullanılmıyor | Dosyadan gelindiğinde **danışan seçili gelmiyor** (`?danisan=` okunmuyor) |
| `/testler/beck-anksiyete` | `BeckAnxietyPage` | Tümü | BAI | localStorage | Var | Kullanılmıyor | Aynı sorun |
| `/testler/scl90` | `Scl90Page` | Tümü | SCL-90-R (90 madde, 9 sayfa) | localStorage | Var | Kullanılmıyor | Aynı sorun |
| `/testler/tarama` | `RapidScreeningPage` | Tümü | GAD-7 / PHQ-9 | localStorage `psikolog_screenings_v2` | Var | Kullanılmıyor | Aynı sorun |
| `/takvim`, `/appointments` | `AppointmentsPage` | Tümü | Randevu listesi + modal, "Görüşmeyi tamamla" | localStorage `psikolog_appointments_v2` | Var | Kullanılmıyor | Ücret/ödeme alanı **arayüzde yok** (state'te var); tekrar eden seans, hatırlatma, çakışma uyarısı yok; takvim görünümü yok (liste) |
| `/raporlar` | `ClinicalReportsPage` | Tümü | 5 rapor tipi, otomatik doldurulan bölümler, yazdırma | localStorage `psikolog_reports_v2` (+ test/seans/formülasyon okumaları) | Var | Kullanılmıyor | Sürüm/versiyonlama ve şablon yönetimi yok; **sadece `window.print()`**; rapor kalıcı kilitlenmiyor |
| `/gorevler`, `/tasks` | `TasksPage` | Tümü | Elle görev listesi | localStorage `psikolog_tasks_v2` | Var | Kullanılmıyor | Görevler sistem durumundan **türetilmiyor** (eksik anamnez/imzasız not vb. otomatik çıkmıyor) |
| `/ayarlar`, `/settings` | `SettingsPage` (+`CloudAdminPanel`) | Tümü; bulut paneli ADMIN/ORG_ADMIN | Antet, logo, imza, ücret, yedek | localStorage `psikolog_settings_v2` | Var | Admin RPC'ler | "Bulut" metni yanıltıcı: bulutta danışan verisi olduğu izlenimi veriyor (yok) |
| `/denetim`, `/audit` | `AuditPage` | Tümü | Yerel denetim izi (son 200 olay) | localStorage `psikolog_audit_v2` | Var | Kullanılmıyor (sunucudaki `audit_logs` hiç okunmuyor) | Kapsam eksik: seans/randevu/ölçek/rapor olayları yazılmıyor |
| `/sss`, `/gizlilik`, `/kullanim`, `/kaynaklar` | `FaqPage`, `PrivacyPolicyPage`, `TermsPage`, `SourcesPage` | Genel (girişsiz) | Bilgi sayfaları | Statik | **Hayır** | — | Bilinçli ve doğru (halka açık bilgi sayfaları) |
| `/islem`, `/form`, `/optik-form.html` | 404 (`bulunamadi`) | — | Emekli MMPI/OMR yolları | — | — | — | Doğru: geri getirilmemeli |
| Eşleşmeyen diğer yollar | 404 kartı | — | — | — | — | — | `/testler/xyz` gibi derin bağlantılar 404'e düşer (kabul edilebilir) |

**Kırık/yanlış rota tespiti:** Kırık bağlantı bulunmadı (tüm `navigate()`/`href` hedefleri `parseRoute` ile eşleşiyor; `git`/test doğrulaması `tests/clinicalRouter.test.ts` + `tests/workspaceUi.test.ts`). Sorunlar *eksik rota*: danışan dosyasında randevu, seans detayı (permalink), rapor detayı, görev detayı yok. Bu, "görevden kayda git" ve "bildirimden kayda git" akışlarını şimdiden imkânsız kılıyor.

---

## 3. Database Map

17 tablo (`supabase/migrations/*.sql`) + 1 private bucket. **Hiçbiri klinik UI tarafından kullanılmıyor**; yalnızca `profiles` (auth profil) ve admin RPC'leri canlı.

| Table | Purpose | PK | Önemli FK | created_by | organization_id | RLS | Policy özeti (select / insert / update / delete) | Trigger | Audit |
|---|---|---|---|---|---|---|---|---|---|
| `organizations` | Kurum | id | — | — | — | ✅ | admin veya üye / admin / admin+org_admin / admin | `set_updated_at`, `*_audit` | ✅ |
| `profiles` | Auth profili | id→`auth.users` | organization_id | — | ✅ | ✅ | kendi satırı, admin, org üyeleri / yalnızca **self-insert** (role=PSYCHOLOG) / — / — | `set_updated_at`, `handle_new_auth_user`, `*_audit` | ✅ |
| `clients` | Danışan | id | organization_id, created_by | ✅ | ✅ | ✅ | admin veya **org üyesi (org geneli)** / org+rol+created_by / owner veya org_admin / owner veya org_admin | `set_updated_at`, `*_audit` | ✅ |
| `audit_logs` | Sunucu denetim izi | id | organization_id | actor | ✅ | ✅ | admin veya org_admin(member) / **yazma yok** | `log_audit_change()` yazar | — |
| `anamneses` | Anamnez (danışan başına 1) | id | client_id, organization_id | ✅ | ✅ | ✅ | org / created_by+org+rol (**client-org kontrolü yok**) / owner veya org_admin / owner veya org_admin | `set_updated_at`, `*_audit` | ✅ |
| `sessions` | Görüşme/SOAP | id | client_id, organization_id | ✅ | ✅ | ✅ | org / created_by+org+rol (**client-org kontrolü yok**) / owner veya org_admin / owner veya org_admin | `set_updated_at`, `validate_session_date`, `*_audit` | ✅ |
| `assessments` | Klinik değerlendirme kaydı | id | client_id, organization_id | ✅ | ✅ | ✅ | org / created_by+org+rol / owner veya org_admin / owner veya org_admin | `set_updated_at`, `validate_assessment_date`, `*_audit` | ✅ |
| `test_definitions` | Ölçek tanımı (5 sistem + org) | id | organization_id | — | nullable | ✅ | sistem veya org / org+rol (not is_system) / admin veya org_admin (not is_system) / aynı | — | ✅ |
| `test_administrations` | Ölçek uygulaması | id | client_id, assessment_id, test_definition_id | ✅ | ✅ | ✅ | org / created_by+org+rol+client-org / owner veya org_admin / aynı | `set_updated_at`, `*_audit` | ✅ |
| `test_results` | Özet sonuç (jsonb, ham madde yok) | id | test_administration_id | — | ✅ | ✅ | org / rol+org+parent-org / **her org üyesi** / **her org üyesi** | `set_updated_at`, `*_audit` | ✅ |
| `report_templates` | Rapor şablonu (2 sistem kaydı) | id | organization_id, created_by | ✅ | nullable | ✅ | sistem veya org / org+rol / owner veya org_admin / aynı | `set_updated_at`, `*_audit` | ✅ |
| `reports` | Rapor (sürüm alanları) | id | client_id, assessment_id, test_administration_id, template_id | ✅ | ✅ | ✅ | **admin, creator veya org_admin** / created_by+org+client-template kontrolleri / owner veya org_admin / aynı | `prepare_report`, `version_report`, `*_audit` | ✅ |
| `report_versions` | Immutable sürüm geçmişi | id | report_id | `created_by` | — | ✅ | **`versions_select`: `is_org_member(reports.organization_id)`** → org geneli | sadece select | — |
| `psychologist_settings` | Antet/logo/imza | created_by | organization_id | = PK | ✅ | ✅ | org / **her org üyesi yazabilir** (`settings_write for all`) | `set_updated_at` | ✅ (trigger eklenmemiş) |
| `documents` | Belge meta | id | client_id, organization_id | ✅ | ✅ | ✅ | org / created_by+org+rol+client-org / owner veya org_admin / aynı | `set_updated_at`, `*_audit` | ✅ |
| `notes` | Klinik not | id | client_id, organization_id | ✅ | ✅ | ✅ | org / created_by+org+rol+client-org / owner veya org_admin / aynı | `set_updated_at`, `*_audit` | ✅ |
| `appointments` | Randevu | id | client_id (nullable), organization_id | ✅ | ✅ | ✅ | org / created_by+org+rol+client-org / owner veya org_admin / aynı | `set_updated_at`, `*_audit` | ✅ |
| `tasks` | Görev | id | client_id (nullable), assigned_to | ✅ | ✅ | ✅ | org / created_by+org+rol+client-org / owner, org_admin veya **assigned_to** / owner veya org_admin | `set_updated_at`, `*_audit` | ✅ |
| `storage.objects` (`client-documents`) | Private belge kovası | id | — | owner | yolun 1. klasörü | ✅ | org üyesi (yol öneki) / org üyesi + `[2] is not null` / org üyesi / org üyesi | — | — |

### Duplicate / kullanılmayan / erişilmeyen yapılar

- **Duplicate veri modeli:** localStorage modeli ile Supabase modeli aynı kavramları ayrı ayrı tanımlıyor (clients, sessions, reports, tasks, notes, documents, screenings↔test_administrations). Şu an ikisi arasında hiç köprü yok.
- **UI'dan erişilmeyen tablolar (13/17):** `organizations` (yalnız RPC), `audit_logs`, `anamneses`, `sessions`, `assessments`, `test_definitions`, `test_administrations`, `test_results`, `report_templates`, `reports`, `report_versions`, `psychologist_settings`, `documents`, `notes`, `appointments`, `tasks` — yani `profiles` dışındaki her şey.
- **Migration ile oluşup UI'da karşılığı olmayan yapılar:** `report_templates` (sistem şablonları), `test_definitions` (5 sistem ölçeği — UI kendi sabit listesini kullanıyor), `psychologist_settings` (UI `psikolog_settings_v2` kullanıyor), `report_versions`, `identity_links` yok ama `clients.gender`/`legacy_client_id` **bu repoda yok** (kapalı PR #5'te eklenmişti).
- **`formulations` / `safety_plans` tabloları YOK.** Formülasyon (`psikolog_formulations_v2`) ve güvenlik planı (`psikolog_safety_v2`) yalnızca localStorage'da (`practiceStore.ts:281-307`). Talep edilen "P0.6 cloud persistence" bu repoda **doğrulanamadı**.
- **`appointment → session` bağı YOK:** `sessions` tablosunda `appointment_id` kolonu, UI tipinde `appointmentId` alanı yok.
- **İmza/kilit alanı YOK:** `sessions` ve `reports` tablolarında `signed_at/signed_by/locked/status(revision)` benzeri kolon yok (reports'ta yalnızca draft/completed + revision var, UI bunları kullanmıyor).
- **Kimlik alanı minimizasyonu:** `clients` tablosunda T.C. kimlik no kolonu yok (iyi: veri minimizasyonu), ancak UI bu alanı localStorage'da tutuyor → aynı veri iki modelde tutarsız.
- **Audit kısıtı operasyonel borç:** `audit_logs.action` check kısıtı her fazda elle genişletiliyor; yeni tablo/olay eklenirse migration'da tekrar genişletilmeli (aksi halde trigger `check` ihlaliyle yazma işlemini bozar).

---

## 4. Auth / RLS Map

### Kimlik ve roller
- Roller: `ADMIN`, `ORG_ADMIN`, `PSYCHOLOG` (`public.user_role`). `ROLE_LABEL/ROLE_ORDER`: `src/auth/authTypes.ts`.
- Profil: `auth.users` insert trigger'ı `public.profiles` satırı üretir (varsayılan `PSYCHOLOG`, **organization_id NULL**); eksikse istemci self-heal INSERT dener (`supabaseAuth.ts:78-105`).
- Pasif hesap giriş anında local sign-out edilir (`signIn`, `userFromSession`).
- Halka açık kayıt kapalı; hesap yalnızca `admin-users` Edge Function ile açılıyor.
- UI rol kullanımı: yalnızca `canAdmin` (Ayarlar → CloudAdminPanel). Başka rol kontrolü yok.

### İstenen izolasyon matrisi (PGlite ile ölçüldü)

| Senaryo | Beklenen | Ölçülen | Kanıt |
|---|---|---|---|
| PSY_A1 → kendi danışanı (Org A) | ✓ | ✅ 1 satır | probe |
| PSY_A1 → Org B danışanı | ✗ | ✅ 0 satır (engellendi) | probe |
| **PSY_A2 → aynı org'daki PSY_A1'in danışanı** | **✗** | ❌ **1 satır (okunuyor)** | `clients_select` = `is_org_member(organization_id)` (`initial_schema.sql:356-361`) |
| PSY_A2 → aynı org'daki danışanı **güncelleme** | ✗ | ✅ 0 satır | `clients_update` owner şartı |
| PSY_A1 → Org B `client_id` ile **session insert** | ✗ | ❌ **1 satır (kabul)** | `sessions_insert` client-org kontrolü yok (`phase03:235-242`) |
| PSY_A1 → Org B `client_id` ile **anamnesis insert** | ✗ | ❌ **1 satır (kabul)** | `anamneses_insert` (`phase03:209-216`) |
| PSY_A1 → Org B `client_id` ile randevu | ✗ | ✅ engellendi | `phase07:100` client-org kontrolü var |
| Profili silinmiş kullanıcı → kendi profilini **Org B ile** ekleme | ✗ | ❌ **kabul; ardından Org B danışanını okuyabildi ve Org B'ye seans yazabildi** | `profiles_insert_self` yalnız `id=uid, role='PSYCHOLOG', active` kontrol ediyor (`fix_profiles_rls.sql:30-37`) |
| `report_versions` okuma (own-scope raporlar) | raporun sahibi/org_admin | ❌ **org üyesi herkes** (rapor satırı görünmese bile sürümleri okunur) | `phase05:versions_select` `is_org_member(r.organization_id)` |
| `test_results` güncelleme/silme | kaydı oluşturan | ❌ **her org üyesi** | `phase04:test_results_update/delete` |
| `psychologist_settings` başkasının satırını yazma | ✗ | ❌ **her org üyesi** (`settings_write for all`, created_by kontrolü yok) | `phase05:settings_write` |
| Storage: Org A üyesi → Org B yol öneki | ✗ | ✅ engellendi | probe (RLS açık) |
| Storage: Org A üyesi → **Org B'ye ait `client_id` klasörü** (org öneki Org A) | ✗ | ❌ **kabul** | politika yalnız 1. klasörü (org) doğruluyor (`phase06:32-40`) |
| Storage: UUID olmayan klasör adı | ✗ | ⚠️ `invalid input syntax for type uuid` hatası (sızma yok, kullanıcıya anlamsız hata) | `((storage.foldername(name))[1])::uuid` |

### Değerlendirme
- **UI gizleme güvenlik kanıtı değildir** ilkesi bu üründe henüz test edilemiyor: klinik veri sunucuya hiç gitmediği için RLS pratikte devre dışı. Şema hazır ama kullanılmıyor.
- Kurum içi okuma modeli **bilinçli olabilir** (klinik ekip paylaşımı), ancak bu karar üründe hiç belgelenmemiş ve "A → B ✗" beklentisiyle çelişiyor. Karar verilmesi gereken tek soru: **tek uzman izolasyonu mu, kurum içi paylaşım mı?** (Bkz. §17 P0-2.)
- `sessions`/`anamneses` FK-tenant boşluğu hem veri bütünlüğü hem çapraz kiracı referans sızması riski taşıyor (rapor/join ekranlarında yabancı danışan kimliği görünebilir).
- Edge Function tarafı sağlam: origin allowlist (strict URL parse), `getUser(token)` ile JWT doğrulama, ADMIN/ORG_ADMIN rol kontrolü, ADMIN hedeflerini koruma, org_admin için org'a sabitleme (`supabase/functions/admin-users/index.ts:66-90, 181-207, 229-236, 345-380`).

---

## 5. Existing Feature Map

Durum yalnızca: **Mevcut / Kısmi / Yok / Hatalı**.

| Feature | Durum | Kanıt | Sorun |
|---|---|---|---|
| Dashboard | **Mevcut** | `src/components/Dashboard.tsx`, `casework.buildSessionPreps/buildAttention`; `tests/casework.test.ts` | Bulut verisiyle çalışmaz; "bekleyen iş" listesi gerçek durumdan türetilmez (görevler elle) |
| Clients | **Mevcut** | `ClientListPage.tsx` (795 satır), `clinicalStore.getClients/saveClient` | Yalnız cihazda; dosya numarası tekilliği cihaz içi; ortak kullanımda görünür |
| Client profile (dosya) | **Kısmi** | `ClientDetailPage.tsx` (873 satır, 8 sekme) | Randevu sekmesi yok, timeline yok, seans permalink yok, sekme URL'ye yazılmıyor |
| Intake | **Kısmi** | `ClientListPage` modalı (demografik + şikayet + tıbbi/psikiyatrik geçmiş + ilaç + aile + tanılar) | Tek uzun modal; DB `anamneses` alan taksonomisiyle **uyuşmuyor**; onam/rıza akışı yok |
| Anamnesis | **Kısmi** | `Client.presentingComplaint/medicalHistory/...` alanları; `overview` sekmesi salt-okunur | Düzenleme yalnız listeden modal ile; `anamneses` tablosu kullanılmıyor; tamamlanma durumu/tarihi yok; seansla ilişki yok |
| Appointments | **Mevcut** | `AppointmentsPage.tsx` (430 satır) | Tekrar eden seans, hatırlatma, çakışma kontrolü, haftalık görünüm yok; ücret alanı arayüzde yok |
| Sessions | **Mevcut** | `SoapSessionsPage.tsx`, `clinicalStore` | Randevuya bağlı değil; imza/kilit/sürüm yok; denetim izi yok |
| Session notes (SOAP) | **Mevcut** | SOAP alanları + risk düzeyi + ev ödevi | İki ayrı oluşturma formu (dosya + seanslar sayfası) alanları farklı; kopyala-yapıştır/şablon yok |
| Forms | **Yok** | `src/` içinde form/submission modeli yok (yalnız bilgi sayfaları) | Danışan onamı, rıza, ölçek daveti akışı yok |
| Documents | **Kısmi** | `ClientRecordsPanel.ClientDocuments`, `practiceStore` (`dataUrl`) | Bulut kovası kullanılmıyor; 1.5 MB sınırı; kota riski; önizleme yok; imzalı URL yok |
| Tests | **Mevcut** | `beckDepression.ts` (21 madde, kesme bantları, madde 9), `beckAnxiety.ts`, `scl90.ts` | Danışan bağı isteğe bağlı → bağlantısız kayıt; dosyadan gelindiğinde danışan seçili gelmiyor |
| Scales | **Mevcut** | `rapidScreening.ts` (GAD-7/PHQ-9, PHQ-9 madde 9) | Aynı sorunlar; ayrı storage ama raporlarda birleşiyor |
| MMPI | **Yok (emekli)** | `tests/retiredInstrumentGuard.test.ts`, `clinicalRouter.test.ts` (`/mmpi` → 404) | Doğru: geri getirilmemeli; ayrı repo ile yalnız mimari entegrasyon değerlendirmesi |
| Formulation | **Mevcut (yerel)** | `FormulationPanel.tsx`, `casework.CaseFormulation` | Cloud yok; tedavi hedefi tek yerde; seansla bağ yok |
| Safety plan | **Mevcut (yerel)** | `FormulationPanel` güvenlik kartı, `safetyPlanIsEmpty` | Cloud yok; tetikleyici otomatik görev üretmiyor (yalnız dashboard uyarısı) |
| Treatment plan | **Kısmi** | Formülasyon içinde `goals[]` (metin + ölçüt + durum) | Problem→hedef→müdahale→izlem yapısı yok; seans notuyla (P bölümü) ilişkilendirme yok |
| Progress | **Kısmi** | `progress` sekmesi BDI/BAI bar grafiği; `measurementNote` tüm ölçekleri listeliyor | GAD-7/PHQ-9/GSI trendleri çizilmiyor; zaman serisi (grafik) yok; dışa aktarma yok |
| Reports | **Kısmi** | `ClinicalReportsPage.tsx` (5 tip, otomatik metin), `progressSections` | Yerel; sürüm yok; şablon UI'si yok; kalıcı/immutable değil |
| PDF | **Hatalı (Kısmi)** | Yalnız `window.print()` (9 çağrı); yazdırma CSS'i 7 dosyada | Gerçek PDF üretimi yok; A4 taşma/Türkçe karakter doğrulaması gerçek tarayıcıda yapılamadı |
| Tasks | **Kısmi** | `TasksPage.tsx`, `practiceStore` | Sistem durumundan türetilmiyor; seans notu eksiği/imza bekleme gibi otomatik işler yok |
| Notifications | **Yok** | Yalnız `ConnectivityBanner` (çevrimdışı şeridi) | Hatırlatma/bildirim yok |
| Messaging | **Yok** | — | Danışan iletişimi yok |
| Payments | **Hatalı** | `fee`/`paymentStatus` tiplerde ve dashboard kontrolünde (`casework.ts:315`) | **Arayüzde giriş alanı yok** → veri girilemiyor; defter/makbuz yok |
| Admin | **Kısmi** | `CloudAdminPanel` + `features/admin/adminApi.ts` | Yalnız "hesap oluştur" ve "listele"; kullanıcı pasifleştirme/silme/org atama arayüzü yok (API fonksiyonları var, kullanılmıyor); org oluşturma RPC'si UI'sız |
| Audit log | **Kısmi** | `AuditPage` + `practiceStore.recordAudit` | Yerel; seans/randevu/ölçek/rapor olayları yazılmıyor; 200 kayıt sınırı; sunucu `audit_logs` hiç görüntülenmiyor |
| Client portal | **Yok** | — | Danışan tarafı tamamen yok |

---

## 6. Client 360 Audit

```
CLIENT
├── Profile            ✅ Mevcut (localStorage)
├── Intake             ⚠️ Kısmi (liste modalı; onam yok)
├── Anamnesis          ⚠️ Kısmi (Client alanları; ayrı kayıt/tarih yok)
├── Appointments       ❌ DOSYA İÇİNDE YOK (yalnız /takvim)
├── Sessions           ✅ Mevcut (sekme)
├── Notes (SOAP)       ✅ Mevcut
├── Forms              ❌ Yok
├── Tests              ✅ Mevcut (danışan bağı isteğe bağlı)
├── Scales             ✅ Mevcut (GAD-7/PHQ-9)
├── Formulation        ✅ Mevcut (yerel)
├── Safety Plan        ✅ Mevcut (yerel)
├── Treatment Plan     ⚠️ Kısmi (hedefler formülasyon içinde)
├── Progress           ⚠️ Kısmi (BDI/BAI bar; GSI/GAD-7/PHQ-9 trendi yok)
├── Documents          ⚠️ Kısmi (cihaz içi, kota riskli)
└── Reports            ⚠️ Kısmi (listelenir, düzenleme /raporlar sayfasında)
```

**Bağlantı analizi (store denemesiyle doğrulandı):**

| Zincir | Durum | Kanıt |
|---|---|---|
| Randevu ↔ Danışan | ✅ | `Appointment.clientId` |
| Randevu ↔ Seans | ❌ | `SoapSession` alanlarında `appointmentId` yok |
| Seans ↔ Danışan | ✅ | `SoapSession.clientId` |
| Seans ↔ Ölçek | ❌ | Ölçek kaydında `sessionId` yok; yalnız tarih yakınlığı |
| Seans ↔ Formülasyon/Tedavi hedefi | ❌ | P bölümü serbest metin; hedef güncellemesi elle |
| Ölçek ↔ Danışan | ⚠️ İsteğe bağlı | `clientId?: string` (`clinicalTypes.ts`); boş bırakılırsa kayıt dosyadan **görünmez** (probe: "orphan record is invisible to the file") |
| Ölçek ↔ Rapor | ✅ | `readingsForClient` + `measurementNote` |
| Rapor ↔ Kayıt kaynağı | ⚠️ Kısmi | Otomatik metin üretiliyor ama `sourceSnapshot` yok (DB'de var, UI'da yok) |
| Belge ↔ Danışan | ✅ | `PracticeDocument.clientId` |
| Görev ↔ Danışan | ✅ (isteğe bağlı) | `PracticeTask.clientId?` |
| Timeline (olay akışı) | ❌ | Yok; `buildAttention` yalnız uyarı listesi |

**Sonuç:** Dosya, dağınık sayfaların bir listesi; "danışanın tek nesne" olduğu bir kayıt defteri değil. En somut zarar: randevu bilgisi dosyada görünmediği için seans öncesi hazırlık iki ekran arasında bölünüyor ve seans notu randevuyla eşleştirilemiyor.

---

## 7. Clinical Workflow Audit

Zincir: **Yeni Danışan → Başvuru → Randevu → Form/Onam → Anamnez → İlk Görüşme → Değerlendirme → Test/Ölçek → Formülasyon → Tedavi Planı → Seanslar → Seans Notları → İlerleme → Rapor → Takip**

| Adım | Veri kayboluyor mu? | Tekrar giriş? | Yanlış danışana bağlanabilir mi? | Sonraki adım kolay mı? | Klinik / operasyonel ayrımı | Başka psikolog erişir mi? | Refresh sonrası kalır mı? |
|---|---|---|---|---|---|---|---|
| Yeni danışan | Hayır (cihazda) | — | Hayır (dosya no tekilliği cihaz içi) | ✅ kaydettikten sonra dosyaya gidiyor | Karışık (aynı modalda klinik + demografik + tanı) | ⚠️ Aynı tarayıcıda evet (kullanıcı ayrımı yok) | ✅ |
| Başvuru (şikayet) | — | Şikayet **hem intake modalında hem raporda** elle | — | ✅ | Karışık | ⚠️ | ✅ |
| Randevu | Hayır | Seans oluştururken tarih/saat/tür **tekrar girilir** | ❌ Seans, randevudan bağımsız oluşturulabilir → yanlış saat/tür | ⚠️ "Görüşmeyi tamamla" → dosya, ama seans yok | Operasyonel alanlar klinik notla aynı nesnede | ⚠️ | ✅ |
| Form / Onam | **Adım yok** | — | — | — | — | — | — |
| Anamnez | Kısmi (aile/ilaç/tanı alanları var; tarih/sürüm yok) | Evet (anamnez alanları intake modalında; overview'da salt-okunur) | — | ❌ Tamamlanma durumu yok | Karışık | ⚠️ | ✅ |
| İlk görüşme | ✅ SOAP | Seans no elle (formüllerden türetiliyor ama bağımsız) | ⚠️ Seans no çakışması olası | ✅ | ✅ SOAP | ⚠️ | ✅ |
| Değerlendirme (ölçek) | ⚠️ Bağlantısız kayıt riski | ❌ Dosyadan "+ Beck Depresyon" → **danışan seçimi sıfırdan** | **Evet** (serbest isim + boş `clientId`) | ⚠️ | ✅ Puanlama deterministik | ⚠️ | ✅ |
| Formülasyon | ✅ yerel | — | — | ✅ sekme | ✅ | ⚠️ | ✅ (bulut yok) |
| Tedavi planı | ⚠️ Hedefler serbest metin; seansla bağ yok | Hedef ilerlemesi her seansta elle | — | ⚠️ | ✅ | ⚠️ | ✅ |
| Seanslar | ✅ | 20. seansı yazarken ilk 20 seansı taramak gerekiyor (özet/filtre var) | ⚠️ Dosya dışından seans oluştururken yanlış danışan seçilebilir (liste uzunsa) | ⚠️ | ✅ | ⚠️ | ✅ |
| Seans notları | ✅ | Aynı bilgi iki ekranda girilebiliyor | ⚠️ | ✅ | ✅ | ⚠️ | ✅ |
| İlerleme | ⚠️ GAD-7/PHQ-9/GSI trendi gösterilmiyor | — | — | ⚠️ | ✅ | ⚠️ | ✅ |
| Rapor | ✅ | Bölümler otomatik; tarih/isim otomatik | ⚠️ Rapor danışanı seçimle belirlenir (yanlış seçim uyarı yok) | ✅ | ✅ disclaimers | ⚠️ | ✅ |
| Takip (follow-up) | ⚠️ Otomatik takip görevi/hatırlatma yok | — | — | ❌ manuel görev | ✅ | ⚠️ | ✅ |

**Zincirdeki en zayıf üç halka:** randevu↔seans bağı, ölçek↔danışan zorunluluğu, imza/görev türetimi. Bunlar PHASE 7'nin çekirdeği olmalı.

---

## 8. UX/UI Problems

Biçim: **Problem — Evidence — Impact — Proposed solution**

1. **Dosyadan ölçek başlatınca danışan seçili gelmiyor.** `ClientDetailPage` "+ Beck Depresyon" → `navigate('/testler/beck-depresyon')`; hedef sayfa `selectedClientId=''` ile açılıyor (`BeckDepressionPage.tsx:17-45`). → Her ölçekte 3-4 fazla tıklama + yanlış danışana kayıt riski. → Öneri: bağlamı URL ile taşı (`?danisan=<id>`), dosyadan gelindiğinde danışan/cinsiyet/yaş otomatik dolsun.
2. **Randevu ve seans ayrı ekranlarda, bağlantısız.** Seans oluştururken tarih/saat/tür tekrar giriliyor; `AppointmentsPage.tsx` "Görüşmeyi tamamla" yalnız durumu değiştiriyor. → Double entry, randevu-seans tutarsızlığı. → Öneri: randevu kartından "Seansı başlat" (ön dolgulu SOAP), kaydedince randevu `completed`.
3. **Aynı nesnenin iki farklı formu.** SOAP formu hem `ClientDetailPage` (ücret alanı yok) hem `SoapSessionsPage` (ücret var) içinde; randevu formu ücret alanı içeriyor ama modalda göstermiyor. → Alan kaybı, tutarsız kayıt. → Öneri: tek ortak form bileşeni.
4. **Ölçek kaydı danışansız oluşturulabiliyor.** `calculateBeckDepression({... clientId: selectedClientId || undefined})` + serbest isim. → Dosyada görünmeyen "kayıp" kayıtlar; aynı isimle mükerrer kayıt. → Öneri: kayıtlı danışan seçimi zorunlu; serbest isim yalnız "kayıtsız tarama" olarak açıkça işaretlensin ve dosyaya bağlanana kadar geçici sayılsın.
5. **Yıkıcı işlemler tarayıcı `confirm/prompt`, hatalar `alert`.** 32 kullanım (`ClientListPage`, `SoapSessionsPage`, `DataManagementModal` vb.). → Erişilebilirlik ve mobil UX zayıf; `ConfirmDialog.tsx` bileşeni var ama **kullanılmıyor**. → Öneri: mevcut `ClinicalDialog` + `ConfirmDialog` ile değiştir; `alert` yerine satır içi doğrulama mesajı.
6. **Danışan dosyasında dinamik sekme çubuğu eksik.** Sekmeler menü düğmesiyle açılıyor (`file-section-toggle`); aktif sekme URL'ye yazılmıyor. → "Hangi bölümdeyim?" karışıklığı; geri tuşu sekmeyi değiştirmiyor; derin bağlantı paylaşılamıyor. → Öneri: sekmeleri görünür sekme şeridi + `?sekme=` senkronu (history replace).
7. **Görevler ile gerçek işler bağlantısız.** `TasksPage` yalnız elle görev; dashboard uyarıları ayrı bir liste (`buildAttention`). → Psikolog "ne kaldı?" sorusunu iki farklı yerde yanıtlıyor. → Öneri: türetilmiş görev listesi (eksik anamnez, imzasız not, rapor taslağı, ödeme bekliyor) + manuel görevler tek yerde.
8. **Boş/hatalı durumlarda yol gösterici metin iyi ama bazı yeni kayıt akışları eksik.** Örn. ölçek kaydedince toast var, "Şimdi dosyaya/rapora git" yok; rapor oluşturunca önizleme aynı sayfada ama PDF/yazdır yönlendirmesi bağlamsız. → Sonraki adım motivasyonu düşük. → Öneri: kayıt sonrası "sıradaki adım" eylemi.
9. **Yanıltıcı bulut mesajı.** `SettingsPage`: "Supabase bağlı. Kurum verisi RLS ile ayrılır. Yerel dosya yine bu cihazda kalır; **bulut danışanları ayrı şemadadır**." → Kullanıcı verisinin bulutta sanabilir; gerçekte hiçbir klinik kayıt buluta yazılmıyor. → Öneri: metni gerçek davranışa göre düzelt (P0-1 kapsamında).
10. **Terminoloji tutarsızlığı:** "Testler/Değerlendirmeler/Klinik araçlar/Ölçek kütüphanesi", "Seanslar/Seans notları (SOAP)", "Raporlar/Klinik raporlar" aynı işlev için farklı adlar; `clientName` "Danışan" varsayılanı ile karışık. → Zihinsel yük. → Öneri: tek sözlük (kısa liste), menü ve başlıkları eşle.
11. **Sessiz kaydetme geri bildirimi.** `saveSoapSession` gibi çağrılar hata fırlatabilir (kota) ama dosya içindeki kaydetme akışı try/catch'siz; hata yalnız global storage-error şeridine düşüyor (`App.tsx:262-273`). → Kullanıcı kaydın düştüğünü fark etmeyebilir. → Öneri: form düzeyinde hata gösterimi + kaydedilmedi bilgisi.
12. **Bilgi kalabalığı:** dosya özeti + `ScoreChips` + `safety-callout` + 3 rozet satırı üst üste; klinik olarak en kritik bilgi (açık risk, imzasız not) görsel olarak öne çıkmıyor. → Öneri: tek "dikkat" şeridi hiyerarşisi.

---

## 9. Security Problems

| # | Problem | Kanıt | Etki | Öneri |
|---|---|---|---|---|
| S1 | **Klinik veri sunucuya yazılmadığı için RLS/denetim devrede değil** | §0/§3; `src/clinical/*` içinde Supabase yok | Kurumsal izolasyon vaat edilemez; ürün "tek cihaz" güvenliğinde kalır | P0-1: kontrollü bulut persistansı (mevcut tablolar) |
| S2 | **Aynı tarayıcıda kullanıcılar arası veri paylaşımı** | sabit localStorage anahtarları; sign-out veriyi silmiyor | İki uzman aynı cihazı kullanırsa mahremiyet ihlali | P0-1/P0-2: kullanıcı/kurum ad alanı veya bulut-tek kaynak; "bu cihazdaki kayıtları temizle" güvenli çıkışı |
| S3 | Kurum içi geniş okuma (`clients`, `sessions`, `notes`, `documents`, `test_results`, `report_versions`) | PGlite probe + `initial_schema.sql:356` | Meslektaş dosyası görünür | P0-2: sahiplik modeli kararı + policy sıkılaştırma |
| S4 | `sessions`/`anamneses` insert'te client-org doğrulaması yok | `phase03:235-242`, `209-216`; probe | Çapraz kiracı referans bütünlüğü bozulur | P0-2: `exists(... clients c where c.id=client_id and c.organization_id=organization_id)` |
| S5 | `profiles_insert_self` ile keyfî `organization_id` seçme | `fix_profiles_rls.sql:30-37`; probe (Org B'yi okuyup yazdı) | Profili eksik kullanıcı başka kuruma sızabilir | P0-2: `organization_id is null` şartı (self-heal akışı zaten null gönderiyor) |
| S6 | `psychologist_settings` ve `test_results` yazma org geneli | `phase05:settings_write`, `phase04:test_results_update/delete` | Başka kullanıcının anteti/imzası değiştirilebilir; test sonucu bozulabilir | P0-2: `created_by = auth.uid() or is_org_admin()` |
| S7 | Storage politika yalnız org önekini kontrol ediyor | `phase06:32-40`; probe | Yabancı `client_id` klasörüne yazma (dosya satırı FK'sı olmadan orphan nesne) | P1: 2. klasörün org'a ait danışan olduğunu doğrula |
| S8 | **Giriş denemesinde hız sınırı yok** | `src/lib/rateLimit.ts` var, **hiçbir yerden çağrılmıyor**; `signIn` doğrudan `signInWithPassword` | Kaba kuvvet denemesi (Supabase tarafı sınırı dışında uygulama katmanı koruması yok) | P1: mevcut modülü bağla (yeni bağımlılık gerekmez) veya Supabase auth limitlerine güvenip 429 mesajını kullan |
| S9 | Denetim izi boşlukları | seans/randevu/ölçek/rapor mutasyonlarında `recordAudit` yok | Kayıt bütünlüğü savunulamaz | P0-3 |
| S10 | URL'de veri yok (iyi), ancak oturum `sessionStorage` + klinik veri `localStorage` asimetrisi | `authStorage.ts` vs store'lar | Sekme kapanınca kimlik gider, hasta verisi kalır (paylaşılan bilgisayarda ters etki) | P0-2 |

**Vurgu (istenen):** "UI gizleme güvenlik kanıtı değildir" — bu üründe zaten UI gizleme yok; ancak sunucu tarafı doğrulama da fiilen devrede değil çünkü veri oraya hiç gitmiyor. İstenen `Psychologist A → Client B ✗` matrisi **ancak P0-1 + P0-2 birlikte yapılırsa** gerçek olur.

---

## 10. Data Persistence Problems

| # | Problem | Kanıt | Etki |
|---|---|---|---|
| P1 | Kaynak veri yerel; bulut yalnız şema | `clinicalStore.ts:19-25` vs `supabase/migrations` | Cihaz/hesap değişiminde veri yok; çoklu cihaz yok; sunucu denetimi yok |
| P2 | Kota tükenmesi → yazma hatası | `MAX_LOCAL_DOCUMENT_BYTES=1.5MB` base64 (≈2 MB string), tipik kota 5-10 MB; `reportStorageError()` kullanıcıya şerit gösteriyor | 2-3 PDF sonrası klinik kayıt yazılamaz hale gelebilir |
| P3 | Taslak/outbox ölü | `src/workspace/draftStorage.ts` yalnız testlerden çağrılıyor | "Kaydedilmemiş form yenilenince kaybolabilir" (uygulamanın kendi metni) |
| P4 | Formülasyon/güvenlik planı yalnız yerel | `practiceStore.ts:281-307` | En kritik klinik karar metinleri cihazda; yedek JSON'da |
| P5 | Yedek geri yükleme **tüm veriyi değiştirir** (birleştirme yok) | `importClinicalBackup` + `importPracticeData` doğrudan yazar | Yanlış yedek yüklemek mevcut kaydı siler (onay var, geri alma yok) |
| P6 | Audit izi 200 olayla sınırlı ve yerel | `recordAudit` `slice(0, 200)` | Uzun dönem kayıt izi yok |
| P7 | Kimlik alanı (`tcNumber`) yalnız yerel, bulutta kolonu yok | `clinicalTypes.ts` vs `clients` tablosu | Bulut persistansına geçişte alan haritalaması kararı gerekir (minimizasyon avantajı) |
| P8 | İki model arasında alan adı/taksonomi farkı | `Client.presentingComplaint/medicalHistory/...` ↔ `anamneses.reason/current_status/personal_history/...` | Bulut açılışında veri göçü + dönüşüm planı zorunlu |

---

## 11. Mobile Problems

Bulgular statik CSS analizine dayanır; **gerçek tarayıcı ölçümü bu ortamda yapılamadı** (Playwright tarayıcı indirmesi başarısız — §36).

| # | Problem | Kanıt | Etki |
|---|---|---|---|
| M1 | Danışan dosyasında `minmax(320px, 1fr)` inline grid'ler ≤368 px ekranlarda yatay taşma yapar | `ClientDetailPage.tsx:545` (Gelişim) ve `:621` (Anamnez/Profil); ≤720 px'te `.app-main` padding `28px 24px 56px` (`coherence.css:39-44`); responsive.css'te bu inline grid'leri nötralize eden kural yok | Küçük telefonlarda (320-360 px) sayfa yatay kayar |
| M2 | Mobil tablo kartları bazı tablolarda kullanılmıyor | `data-mobile-cards` yalnız `AppointmentsPage`, `ClientListPage`, `AuditPage`; `responsive.css:442-463` sınıfı olmayan tabloları 640 px'e zorluyor | Ölçek/rapor tablolarında yatay kaydırma |
| M3 | `alert/confirm/prompt` mobilde kaba | §8/5 | Dokunma hedefi ve odak yönetimi kaybolur |
| M4 | 90 maddelik SCL-90-R'de ilerleme göstergesi sayfa düğmeleriyle sınırlı | `Scl90Page` (10'arlı sayfalar), e2e testi `320px` taşma kontrolü içeriyor | Uzun formda yön duygusu ve terk riski |
| M5 | Yazdırma akışı mobilde anlamsız (A4) | 9 `window.print()` çağrısı; mobilde PDF paylaşımı yok | Mobilde rapor teslimi imkânsız |
| M6 | PWA/offline yok | manifest/service worker yok; yalnız `ConnectivityBanner` | Çevrimdışı çalışma iddiası kısmi (veri yerel ama uygulama yüklenemez) |

---

## 12. Reporting Problems

| # | Problem | Kanıt | Etki |
|---|---|---|---|
| R1 | Tekrar veri girişi | Bölümler otomatik ama "ruhsal durum muayenesi" ve birçok alan elle; şikayet intake'te ayrıca yazılıyor | Rapor yazma süresi uzun |
| R2 | Danışan/tarih/test sonuçları otomatik | ✅ `handleCreateNew` (`readingsForClient`, `progressSections`) | Bu kısım iyi; korunmalı |
| R3 | Grafikler yok | Rapor metin tabanlı; `progress` sekmesindeki bar grafiği rapora girmiyor | "Gelişim" iddiası zayıf kalıyor (yine de klinik yorum psikologda) |
| R4 | PDF yok | Yalnız `window.print()` | Kurumsal teslim/arşiv için zayıf; paylaşılabilir dosya üretilemiyor |
| R5 | Sürüm/immutability yok | DB'de `reports`+`report_versions` hazır ama UI kullanmıyor; yerel raporda `version` alanı yok | "Final" rapor sonradan değişebilir; hukuki savunulabilirlik düşük |
| R6 | Şablon seçimi yok | `report_templates` (2 sistem şablonu) DB'de; UI sabit 5 tip kullanıyor | Kurumsal antet/şablon esnekliği yok |
| R7 | Türkçe karakter / sayfa taşması | Yazdırma CSS'i var (`clinical.css:955-996` vb.), ancak gerçek A4 doğrulaması yapılamadı | Doğrulanmamış risk (PHASE 13'te tarayıcıyla ölçülmeli) |
| R8 | Rapor danışanını yanlış seçme koruması yok | `handleCreateNew` yalnız seçim yokluğunu uyarıyor | Yanlış dosyaya rapor |

---

## 13. External Product Findings (yalnız problem çözme mantığı)

| Ürün | Çözdüğü problem | Bizde karşılığı | Alınacak **mantık** (kod/UI kopyası değil) |
|---|---|---|---|
| TherapyNotes | Kayıttan **türetilen iş listesi**: randevu → "not yaz" görevi; imzalı belge → işlem hatırlatması; "golden thread": tedavi planı yoksa ilerleme notu yazılamaz; **e-imza ile not kilitlenir**, revizyon geçmişi + aktivite kaydı tutulur | Türetilmiş görev yok; imza/kilit yok; aktivite kaydı kısmi | P0-3 + P1: (a) durumdan türetilen görev kuyruğu, (b) notu imzala/kitle + revizyon, (c) seans notunda tedavi hedefi ilerlemesi alanı |
| SimplePractice | Danışan portalında dijital intake + e-imza + ödeme; ölçüm tabanlı bakım (PHQ-9/GAD-7 otomatik puan + grafik); otomatik hatırlatma | Portal yok; ölçekler var ama grafik yok | P2: portal/onam; P1: ölçek trend grafiği (mevcut verilerle, yeni bağımlılık gerekmez) |
| Cliniko / Jane | Sade takvim + tekrarlayan randevu + otomatik hatırlatma + bekleme listesi; notlar finalize edilince değişmez | Takvim listeden ibaret; tekrar/hatırlatma yok | P1: tekrarlayan randevu (haftalık seri), iptal/erteleme akışı; P2: hatırlatma sağlayıcı entegrasyonu |
| Carepatron | Şablon kütüphanesi + form builder + online booking; ölçek takibi | Şablon/form yok | P2 (form builder), P1 (onam/intake şablonu) |
| Ortak desen | Danışan kaydı = işin merkezi; her modül aynı kayda bağlanır (randevu, not, ölçek, form, ödeme) | Dosya merkezî ama bağlar eksik | P0-4/P0-5/P1: bağları kur, yeni modül ekleme |

**Uyarı:** "X'te var, bizde de olsun" yaklaşımı **kullanılmadı**. Yukarıdaki maddeler yalnızca mevcut workflow'daki somut boşluklarla eşleştiği için listelendi (örn. portal/hatırlatma Türkiye filtresini geçemezse P2'de kalır).

---

## 14. Turkey-specific Findings

Hukuki uygunluk **iddiası değildir**; yalnızca tasarım kararlarını etkileyen teknik/operasyonel referanslardır (hukukçu incelemesi gerekir).

1. **KVKK ihlal bildirimi:** Kurul'un 2019/10 sayılı kararı ile ihlalin öğrenilmesinden itibaren **72 saat** içinde bildirim yükümlülüğü; çalışan sayısı/ciro sınırı yok — muayenehane ölçeğinde de geçerli [1](https://hukukcularevi.com/kvkk-veri-ihlali-bildirim-72-saat-6698-12-madde/). Teknik karşılığı: erişim kayıtları, ihlal tespit edilebilirliği ve veri sahibine bildirim listesi üretilebilirliği. Bugün ürün **tek cihazda** çalıştığı için ihlal tespiti ve kanıt üretimi mümkün değil.
2. **VERBİS eşiği:** Ana faaliyeti özel nitelikli veri işleme olan veri sorumluları (sağlık kuruluşları vb.) VERBİS kaydı kapsamında sayılıyor [5](https://bilalalyar.av.tr/kvkk-verbis-kayit-sirket-uyum-rehberi-2026/). Teknik karşılığı: veri işleme envanteriyle uyumlu **kayıt türü + amaç + saklama süresi** meta verisi; ürün tarafında "veri envanteri dışa aktarımı" faydalı olur (yeni tablo gerekmeden mevcut kayıtlardan türetilebilir).
3. **Saklama süreleri dağınık:** Kurum arşivi için 20 yıl, poliklinik defterleri için 5-25 yıl, "psikolojik görüşme kartı" için 5 yıl gibi farklı süreler raporlanıyor [2](https://www.hanyaloglu-acar.av.tr/malpraktis-tazminat/hasta-kay%C4%B1tlar%C4%B1-saklama-s%C3%BCresi); solo psikolog pratiği için tek bir net sayı yok. Sonuç: üründe **yapılandırılabilir saklama/silme politikası** (danışan arşivleme + imha tarihi + "arşivden sil" kaydı) gerekli; kesin süre iddia edilmemeli.
4. **Ölçek telif/lisans riski:** SCL-90-R (Dağ 1991 uyarlaması, Derogatis 1994) ve Beck envanterleri ticari/telifli araçlardır; dijital uygulama ve rapor dağıtımı için hak sahibi izni gerekebileceği belirtiliyor [1](https://psikoterapiolcekleri.com/olcekler/semptom-tarama-listesi-scl-90). Uygulama zaten `SourcesPage`'de "kısaltılmış karşılıklar, basılı telifli formun yerine geçmez" diyor — bu doğru bir sınır; **dijital dağıtım/kopya üretimi ticari yayın öncesi hukuk kontrolü gerektirir** (P1 risk kaydı, kod işi değil).
5. **Pazar beklentisi randevu/hatırlatma ve ödeme takibi:** Türkiye'de psikologlara yönelik yaygın SaaS teklifleri SMS/WhatsApp hatırlatma, sesli teyit, online randevu ve ödeme takibini öne çıkarıyor [1](https://randevunet.com/psikolog-randevu-programi) [3](https://bulutrandevu.com/psikolog-randevu-programi). Bu ürünün farkı klinik dokümantasyon ve ölçüm; ancak **veri cihazda kaldığı sürece** bu farkı satmak zor. Bu nedenle P0-1 (bulut persistans) Türkiye pazarında rekabet için de ön koşul.
6. **Tek kişilik pratik gerçeği:** Ürün kurumsal çok-uzmanlı model (org, ORG_ADMIN, audit_logs) kurmuş ama tek uzmanlı kullanımda bu katman görünmez; buna karşılık **tek uzmanın en çok ihtiyaç duyduğu şey (yedek/kurtarma, cihaz değişimi, imzalı rapor)** zayıf. Öneri: P0-1'de "tek uzman + cihazlar arası süreklilik" senaryosunu birincil kabul et, çok-uzmanlı izolasyonu ikinci aşamada netleştir.

---

## 15. Existing / Duplicate / Broken / Missing Features

**Mevcut (korunmalı):** router, CloudGate + profil/rol modeli, admin Edge Function, deterministik puanlama motorları (BDI/BAI/SCL-90-R/GAD-7/PHQ-9, kesme bantları, güvenlik maddeleri), formülasyon/güvenlik planı alan modeli, SOAP alan seti, rapor otomatik doldurma, `buildSessionPreps/buildAttention`, yedek/geri yükleme, KVKK metinleri ve kaynakça, tasarım sistemi + responsive katmanı, retired-instrument guard, PGlite RLS testleri, 90 birim testi.

**Duplicate:**
- İki veri modeli (localStorage ↔ Supabase) — kavramsal kopya.
- İki SOAP oluşturma formu (`ClientDetailPage` ↔ `SoapSessionsPage`), alan farklarıyla.
- İki admin API modülü: `src/auth/adminApi.ts` (**ölü**) ↔ `src/features/admin/adminApi.ts` (aktif).
- Danışan kaydı iki sekmeye bölünmüş rapor görünümü (`ClientDetailPage.reports` ↔ `/raporlar`).

**Broken / yarım (var ama çalışmıyor ya da erişilemez):**
- `fee`/`paymentStatus`: veri modeli + dashboard kuralı var, **giriş arayüzü yok**.
- `draftStorage` (taslak + outbox): yalnız testlerden çağrılıyor.
- `rateLimit` (giriş denemesi), `validation`, `dateGuards`, `pagination`, `securityHeaders` (kod içi), `ConfirmDialog`: **ölü kod**.
- Bulut yönetim paneli: kullanıcı pasifleştirme/silme/org atama UI'sı yok (API hazır).
- Bulut "ayarlar/antet" yazımı: `psychologist_settings` tablosu ve RLS politikası var, kod yok.
- Sunucu `audit_logs`: UI'da hiç görünmüyor.

**Missing (eksik):**
- Bulut persistans + sync (en kritik), onam/rıza ve form/submission akışı, danışan portalı, mesajlaşma, bildirim/hatırlatma, imza-kilit-revizyon, tedavi planı yapısı (problem→hedef→müdahale→izlem), timeline, türetilmiş görev kuyruğu, PDF üretimi, çoklu cihaz/çoklu uzman senaryosunun uçtan uca desteği, veri saklama/silme politikası (retention), dışa aktarım (danışan bazlı).

---

## 16. Previously Completed P0–P0.6 Work (repo gerçeği)

> Rol: **ikinci kez yapılmaması gerekenler** listesi. Aşağıdaki ancak **repoda kanıtı olan** işlerdir.

### 16.1 Doğrulanan ve korunacak işler

| Alan | Kanıt | Durum |
|---|---|---|
| Supabase şema + RLS (faz 03-07) | `supabase/migrations/2026092400000{0..5}_*.sql` (initial, anamnesis+sessions, assessments+tests, reports+templates+versions+settings, documents+notes, appointments+tasks+admin RPC) | Mevcut |
| `profiles` RLS düzeltmesi + backfill + self-insert | `20260924000006_fix_profiles_rls.sql` | Mevcut |
| Storage private bucket + politikalar | `20260924000004` (bucket private, 50 MB, mime whitelist) | Mevcut |
| Audit trigger'ları + `audit_logs` check kısıtları | Her fazda genişletilmiş | Mevcut |
| Admin Edge Function (origin allowlist, JWT, rol) | `supabase/functions/admin-users/index.ts` | Mevcut |
| Production auth gate + public signup kapalı | `App.tsx` CloudGate; `config.toml: enable_signup=false` | Mevcut |
| Retired instrument guard (MMPI/OMR/optik form geri gelmesin) | `tests/retiredInstrumentGuard.test.ts`, `tests/clinicalRouter.test.ts` (`/mmpi`,`/islem`,`/form`,`/optik-form.html` → 404) | Mevcut |
| Deterministik ölçek motorları + testleri | `beckDepression.ts`, `beckAnxiety.ts`, `scl90.ts`, `rapidScreening.ts`, `scaleIntake.ts`; 4+3+4+2+2 test | Mevcut |
| RLS/IDOR testleri (gerçek PostgreSQL/WASM) | `tests/clientDatabase.test.ts` (13), `tests/security.test.ts` (11), `tests/securityExtended.test.ts` (12) | 90/90 geçiyor |
| Tasarım + erişilebilirlik + responsive katmanı | `docs/TASARIM.md` (24 Eylül 2026 doğrulama: 90/90 test, 12/12 Playwright), `responsiveContracts.test.ts`, `workspaceUi.test.ts` | Mevcut |
| Yedek/geri yükleme + yerel denetim + güvenli belge URL doğrulaması | `DataManagementModal`, `recordRules.isSafeDocumentUrl/isSafeImageUrl`, `practiceStore` | Mevcut |
| AI guardrail iskeleti (tanı/puanlama yok, ağ çağrısı yok) | `src/features/ai/aiTypes.ts` (stub extractive), `SessionSummaryButton` | Mevcut |
| GitHub geçmişi | PR #1-#4 (birleşti: klinik arayüz sadeleştirme, hamburger menü, tasarım yenileme, mavi-beyaz palet) | Mevcut |

### 16.2 Talepte geçen ancak bu repoda **doğrulanamayan** işler

| İddia | Repo gerçeği |
|---|---|
| "P0.6 ile `formulations` / `safety_plans` cloud persistence" | **Yok.** Tablo yok, sorgu yok; ikisi de localStorage (`psikolog_formulations_v2`, `psikolog_safety_v2`) |
| "appointment → session bağlantısı" | **Yok.** Ne DB'de `appointment_id`, ne UI tipinde alan |
| "clinical persistence / repository / sync mimarisi" | **Yok.** `clientCloud.ts`/`clientIds.ts` yalnızca **kapalı (birleşmemiş) PR #5**'te vardı; mevcut `main`'de hiç bulunmuyor |
| "RLS + Storage isolation doğrulanmış" | Şema/RLS **var**, testler **geçiyor**, ancak uygulama veriyi buluta yazmadığı için uçtan uca doğrulanmış sayılmaz; ayrıca §4'te 7 somut boşluk ölçüldü |
| "production validation PASS" | Bu repoda production'a ait hiçbir kanıt yok. PR #5 kapanış raporu kanıtı: `psikolog.halilkaraduman.com.tr` **NXDOMAIN**, `supabase/config.toml` project_id **boş**, Edge deploy **yok**, test hesapları **yok** → **PHASE 1 STATUS: BLOCKED**. Bu rapor da production'ı **doğrulamadı** (bkz. §36) |

### 16.3 MMPI sınırı (korunacak)

- Bu repoda MMPI **yok** ve olmamalı; `retiredInstrumentGuard` bunu test ediyor; `/mmpi` rotası 404.
- Ayrı uygulama (`mmpi.halilkaraduman.com.tr`) farklı Supabase projesi ve cihaz-içi puanlama ile çalışıyor (kapanan PR #5 audit'i).
- Bu raporun kapsamı yalnızca **mimari düzeyde entegrasyon değerlendirmesidir**; scoring/norm/geçerlik/kod/kritik madde hesaplarına dokunulmadı ve önerilmiyor. Kapanmış SSO/`mmpiAdministration` işini yeniden canlandırmak **önerilmez**; karar gerekiyorsa ayrı ve onaylı bir faz olarak ele alınmalıdır.

---

## 17. P0 / P1 / P2 Prioritization

### P0 — Çekirdek workflow / güvenlik / veri bütünlüğü

**P0-1 · Klinik çekirdeğin buluta taşınması (tek doğruluk kaynağı)** — en yüksek etki
```
Problem:   Danışan, anamnez, seans, ölçek, formülasyon, güvenlik planı, rapor verisi yalnız cihazda.
Evidence:  clinicalStore.ts:19-25; practiceStore.ts:90-97; src/clinical'de Supabase yok; SettingsPage "bulut danışanları ayrı şemadadır" metni gerçeği yansıtmıyor.
Impact:    Veri kaybı, cihaz değişiminde süreklilik yok, RLS/denetim devre dışı, çok uzmanlı kullanım imkânsız, KVKK teknik yükümlülükleri karşılanamaz.
Solution:  Fazlı yazma: (1) clients, (2) anamnesis+sessions+appointments, (3) ölçek/uygulama+sonuç, (4) formülasyon+güvenlik planı, (5) notes/documents/tasks, (6) reports(+versions). LocalStorage yalnızca cache/draft olarak kalır (kaynak: Supabase). Mevcut tablolar kullanılır; **yeni tablo yalnız formülasyon/güvenlik planı için** ve gerekçeli (aşağıda).
Files:     src/clinical/clinicalStore.ts, practiceStore.ts, yeni repository/sync katmanı (mevcut dosya düzenine uygun), components (yükleme/hata durumları), App.tsx
Tables:    clients, anamneses, sessions, appointments, test_administrations, test_results, notes, documents, tasks, reports, report_versions, psychologist_settings (hepsi mevcut)
Migration: (a) `formulations` + `safety_plans` (client_id tekilliği, organization_id, created_by, updated_at, review_date) VEYA alternatif: mevcut `notes` tablosuna yapısal jsonb yazmak (önerilmez: kayıt tekilliği ve sorgulanabilirlik kaybı). Karar onaya sunulur. (b) `sessions.appointment_id uuid references appointments(id)`, (c) imza kolonları, (d) eksik FK-tenant kontrolleri (P0-2).
RLS:       Yeni tablolarda mevcut desen (org + created_by + org_admin); policy'ler P0-2 ile uyumlu hale getirilir; audit trigger + action check genişletmesi.
Auth:      Değişmez (CloudGate + profil modeli korunur).
UI:        Bulut/yerel durum göstergesi, yükleme iskeletleri, çakışma/hata mesajları; "kaydedildi" geri bildirimi gerçek yazma sonucuna bağlı.
Mobile:    Yeni ağ çağrıları için iskelet + çevrimdışı kuyruk (mevcut draftStorage modülü canlandırılarak, yeni bağımlılık olmadan).
Tests:     Repository birim testleri, PGlite RLS testleri (yeni tablolar), çevrimdışı→çevrimiçi kuyruk testi, uçtan uca zincir testi (PGlite + bellek istemcisi), mevcut 90 testin korunması.
Risk:      Veri göçü (mevcut localStorage kayıtlarının bir kez yüklenmesi) — geri dönüşsüz olmamalı; yedek zorunlu, çift yazma fazı, kuru çalıştırma raporu.
Priority:  P0
```

**P0-2 · RLS sahiplik modeli + tenant bütünlüğü (yeni tablo yok)**
```
Problem:   Aynı kurumda herkes her danışanı okuyor; sessions/anamneses client-org doğrulaması yok; self-insert org seçebiliyor; settings/test_results org geneli yazılabiliyor; report_versions rapor sahibinden bağımsız okunuyor.
Evidence:  PGlite probe (bkz. §4 tablosu); initial_schema.sql:356-361; phase03:209-242; phase04:test_results_update/delete; phase05:settings_write, versions_select; fix_profiles_rls.sql:30-37.
Impact:    Beklenen "A → B ✗" matrisi sağlanmıyor; çapraz kiracı referans; başka kullanıcının anteti/imzası değiştirilebilir.
Solution:  Karar noktası: (i) tek-uzman sahiplik mi, (ii) kurum içi paylaşım mı? Öneri: varsayılan **sahiplik** (created_by = auth.uid() OR is_org_admin() OR is_admin()), paylaşım sonradan açık bir "vaka ataması" ile. Ek olarak: sessions/anamneses insert'e client-org `exists` şartı; `profiles_insert_self`'e `organization_id is null`; settings/test_results/report_versions policy sıkılaştırma.
Files:     supabase/migrations/<yeni>.sql (policy değişiklikleri), tests/securityExtended.test.ts (yeni senaryolar)
Tables:    Mevcut tablolar (yeni tablo yok)
Migration: Yalnızca `drop policy if exists ... create policy ...` (idempotent, geri alınabilir); veri kaybı yok.
RLS:       Yukarıdaki policy seti; IDOR matrisi + FK-tenant testleri genişletilir.
Auth:      Değişmez.
UI:        Yetkisiz erişimde anlaşılır hata; liste boş durumu "bu dosyaya erişim yetkiniz yok" ayrımı.
Mobile:    Etki yok.
Tests:     PGlite: A→A ✓, A→B(farklı org) ✗, A2→A1(aynı org) ✗, cross-tenant insert ✗, self-insert org ✗, storage yol testleri.
Risk:     Kurum içi paylaşım bilinçli bir gereksinimse erişim kaybı olur → karar onaya bağlı.
Priority:  P0
```

**P0-3 · Randevu → Seans → Not zinciri + doğruluk (double entry'yi bitir)**
```
Problem:   Randevu seansa bağlı değil; seans bilgileri elle yeniden giriliyor; seans numarası çakışabilir.
Evidence:  SoapSession alan listesi (appointmentId yok); AppointmentsPage.tsx:126-129; probe çıktısı.
Impact:    Zaman kaybı, tutarsız kayıt, "hangi randevunun notu eksik?" sorusu yanıtlanamıyor.
Solution:  sessions.appointment_id + UI'da "Randevudan seans başlat" (ön dolgu), kaydetmede randevu tamamlandı; randevu başına tek seans (kısmi unique index, iptal hariç); seans numarası otomatik.
Files:     clinicalTypes.ts, clinicalStore.ts, AppointmentsPage.tsx, ClientDetailPage.tsx, SoapSessionsPage.tsx
Tables:    sessions (+appointment_id), appointments (mevcut)
Migration: `alter table sessions add column if not exists appointment_id uuid references appointments(id) on delete set null;` + `create unique index ... where appointment_id is not null;`
RLS:       Mevcut policy'ler korunur (appointment_id için ek kontrol: aynı org).
Auth:      Değişmez.
UI:        Randevu kartında tek birincil eylem; dosyada randevu sekmesi.
Mobile:    Randevu kartı eylemleri 44px hedef.
Tests:     Store birim testi (bağ kurulumu, tekillik), PGlite (cross-tenant appointment_id reddi), e2e senaryosu.
Risk:     Mevcut localStorage kayıtlarında appointment_id boş olur (geriye dönük uyumlu).
Priority:  P0
```

**P0-4 · Klinik kayıt bütünlüğü: denetim + imza/kilit/revizyon**
```
Problem:   Seans/randevu/ölçek/rapor mutasyonları denetim izine yazılmıyor; notlar imzalanıp kilitlenemiyor.
Evidence:  recordAudit çağrı listesi (clinicalStore.ts:158-200'de yok); sessions kolonları; probe "session delete/edit audit trail: audit entries: 1".
Impact:    Savunulabilir dokümantasyon yok; "imza bekliyor" iş akışı kurulamaz.
Solution:  (a) Tüm mutasyonlarda denetim olayı (yerel + bulutta sunucu trigger'ı zaten var), (b) `sessions.status('draft'|'signed')`, `signed_at`, `signed_by`, `revision`; imzalı satırda update'i engelleyen trigger + düzeltme = yeni revizyon kaydı, (c) `reports` için mevcut `report_versions` mekanizmasının UI'da kullanılması.
Files:     clinicalStore.ts, practiceStore.ts, SoapSessionsPage.tsx, ClinicalReportsPage.tsx, yeni migration
Tables:    sessions (+kolonlar), reports/report_versions (mevcut)
Migration: `alter table sessions add column if not exists status text not null default 'draft' check (status in ('draft','signed')), add column signed_at timestamptz, add column signed_by uuid references profiles(id);` + immutability trigger.
RLS:       İmzalı satır için update policy'si `status='draft'` şartı.
Auth:      İmza atan kullanıcı `auth.uid()`.
UI:        "İmzala ve kilitle" + düzeltme akışı (revizyon notu zorunlu); imzalı not görsel olarak kilitli.
Mobile:    İmza eylemi onay diyaloğu ile.
Tests:     "İmzalı not güncellenemez", "revizyon oluşur", "denetim olayı yazılır" testleri (store + PGlite).
Risk:     Fazla sürtünme yaratmamak için imza opsiyonel olmalı (draft kalabilir).
Priority:  P0 (dokümantasyon güvenliği hedefi) — onay ile P1'e çekilebilir.
```

**P0-5 · Ölçek kaydının danışana bağlanması (veri bütünlüğü)**
```
Problem:   Ölçek kaydı danışansız oluşturulabiliyor; dosyadan gelindiğinde danışan seçili gelmiyor.
Evidence:  clientId?: string (clinicalTypes.ts); BeckDepressionPage.tsx:49,75; ClientDetailPage tests sekmesi navigate('/testler/beck-depresyon'); probe "orphan record is invisible to the file".
Impact:    Kayıp/kopya kayıt, yanlış danışana değerlendirme, rapora girmeyen sonuç.
Solution:  Kayıtlı danışan seçimi zorunlu (kayıtsız tarama = açıkça işaretli geçici kayıt); URL ile danışan bağlamı; kaydedince "dosyaya/rapora git" eylemi; aynı gün/ölçek için mükerrer uyarısı. Puanlama motorlarına dokunulmaz.
Files:     BeckDepressionPage/BeckAnxietyPage/Scl90Page/RapidScreeningPage, ClientDetailPage, clinicalTypes, clinicalStore
Tables:    test_administrations/test_results (bulut fazı)
Migration: Gerekmez (bulut fazına kadar); bulutta `status='planned'` kullanımı.
RLS:       Bulut fazında mevcut policy'ler yeterli (client-org kontrolü var).
Auth:      Değişmez.
UI:        Danışan seçici ön planda; serbest isim alanı ikincil.
Mobile:    Ölçek formlarında ilerleme çubuğu ve danışan adı sabit başlık.
Tests:     Store testi (danışansız kayıt reddi), router testi (?danisan), e2e (ölçek kaydı → dosyada görünür).
Risk:     Eski danışansız kayıtlar için geçiş: "bağla" ekranı (silme yok).
Priority:  P0
```

### P1 — Ciddi kullanıcı değeri

| # | Problem | Evidence | Impact | Proposed solution | Dependencies | Risk | Priority |
|---|---|---|---|---|---|---|---|
| P1-1 | Görevler gerçek durumdan türetilmiyor | `TasksPage` yalnız elle; `buildAttention` ayrı liste | "Ne kaldı?" iki yerde; eksik iş kayboluyor | Türetilmiş iş kuyruğu: imzasız not, eksik anamnez, bağlanmamış ölçek, rapor taslağı, ödeme bekliyor, gelmedi (noshow) takibi | P0-3/P0-4 | Yanlış pozitif gürültü → filtre/önem sırası | P1 |
| P1-2 | Danışan dosyasında randevu/timeline yok | ClientDetailPage sekmeleri | Dosya "tek nesne" değil | Randevu sekmesi + tarih→olay→kayıt timeline'ı (mevcut kayıtlardan türetilir, tıklayınca kayda gider) | P0-1/P0-3 | Timeline performansı → sayfalama | P1 |
| P1-3 | İlerleme grafiği eksik (GAD-7/PHQ-9/GSI) | Progress sekmesi yalnız BDI/BAI bar | Ölçüm izlemi zayıf | Mevcut `ScoreReading` verisiyle çizgi/trend görünümü (yeni bağımlılık yok, SVG) | — | Klinik yorum iddiası → metin sınırı korunur | P1 |
| P1-4 | Tedavi planı yapısı yok | `CaseFormulation.goals[]` | Problem→hedef→müdahale→izlem izlenemez | Mevcut formülasyon nesnesini genişlet (problem, müdahale, izlem alanları) + seans notunda hedef ilerlemesi bölümü | P0-1 | Alan fazlalığı → kademeli | P1 |
| P1-5 | Onam/rıza akışı yok | `src/` içinde form/submission yok | Klinik ve hukuki süreç eksik | P1: psikolog tarafında onam kaydı (metin şablonu, imza/taraf bilgisi, belge eki) + yazdırılabilir çıktı | P0-1 | Metin şablonu hukuk incelemesi gerektirir | P1 |
| P1-6 | PDF/teslim edilebilir rapor yok | 9 `window.print()` | Arşiv/paylaşım zayıf | A4 yazdırma doğrulaması + "PDF olarak kaydet" yönlendirmesi; gerekirse sunucu tarafı PDF (bağımlılık onayıyla) | — | Yeni bağımlılık → onay şartı | P1 |
| P1-7 | Rapor sürümü/immutability UI'da yok | `report_versions` hazır, UI yok | Final rapor değişebilir | Sürüm listesi + "final" işaretleme + karşılaştırma | P0-1/P0-4 | Veri hacmi | P1 |
| P1-8 | Giriş denemesi sınırsız | `lib/rateLimit.ts` ölü | Kaba kuvvet | Mevcut token bucket modülünü bağla; 429 mesajı | — | Yanlış pozitif kilitleme → nazik geri sayım | P1 |
| P1-9 | Ölü kod / yanıltıcı metinler | 7 ölü modül; "bulut danışanları" metni | Bakım + güven | Ölü modülleri ya bağla ya kaldır (onayla); metinleri gerçek davranışa göre düzelt | P0-1 | Düşük | P1 |
| P1-10 | Mobil yatay taşma riski | §11 M1/M2 | Küçük ekranda kullanılamaz | Inline `minmax(320px)` grid'leri CSS sınıfına taşı; `data-mobile-cards` genişlet | — | Masaüstünü bozma riski → görsel regresyon | P1 |

### P2 — Sonraki aşamalar

| # | Feature | Neden beklemede |
|---|---|---|
| P2-1 | Danışan portalı (görüntüleme, form doldurma, randevu talebi) | Kimlik doğrulama/davet modeli, e-posta altyapısı, KVKK aydınlatma+onam, yeni RLS yüzeyi gerektirir |
| P2-2 | SMS/WhatsApp hatırlatma | 3. taraf sağlayıcı = yeni bağımlılık + maliyet + veri işleyen sözleşmesi; onay şart |
| P2-3 | Online ödeme / defter / e-Arşiv | Finansal entegrasyon; çekirdek klinik değer değil |
| P2-4 | Form builder (özel intake/ölçek formları) | Önce sabit onam/intake şablonları (P1-5) |
| P2-5 | Session/rapor şablon kütüphanesi + kopyala-yapıştır | Mevcut metin alanları yeterli; önce imza/sürüm |
| P2-6 | Teletherapy (görüntülü görüşme) | Altyapı + KVKK + maliyet; ürünün farkı dokümantasyon |
| P2-7 | AI özet genişletmesi | Yalnız mevcut stub guardrail'lerle; klinik hesaplama asla AI'a verilmez. Gerçek LLM = yeni bağımlılık + veri aktarımı (onay şart) |
| P2-8 | MMPI ekosistem entegrasyonu (mimari) | Ayrı repo/proje; bu repoda kod yazılmaz; kapanmış SSO işi yeniden açılmaz |

---

## 18. Implementation Roadmap (PHASE 7 sonrası öneri)

```text
PHASE 7  (P0-2 + P0-3 + P0-4)
         RLS sahiplik/tenant düzeltmeleri (migration + PGlite testleri)
         Randevu → Seans → Not bağı (appointment_id + ön dolgu + tekillik)
         Denetim kapsamı + imza/kilit/revizyon altyapısı
         Kapı: 90 mevcut test + yeni testler; build; typecheck

PHASE 8  (P0-1, fazlı)
         8a clients → 8b anamnez/seans/randevu → 8c ölçek → 8d formülasyon/güvenlik planı
         → 8e not/belge/görev → 8f rapor(+versions)
         Her alt faz: göç (localStorage → bulut, tek yönlü, yedekli) + çift yazma penceresi
         Kapı: veri bütünlüğü testi, çevrimdışı kuyruk testi, RLS testi, geri alma planı

PHASE 9  (P0-5 + P1-1 + P1-2 + P1-3)
         Ölçek↔danışan zorunluluğu ve bağlam aktarımı
         Türetilmiş iş kuyruğu, dosyada randevu + timeline, ölçüm trendi

PHASE 10 (P1-4 + P1-5 + P1-6 + P1-7)
         Tedavi planı yapısı, onam kaydı, PDF/teslim, rapor sürümleme

PHASE 11 Güvenlik + regresyon
         Tüm IDOR matrisi yeniden ölçülür (A→A ✓, A→B ✗, A2→A1 ✗, cross-tenant insert ✗)
         Denetim izi kapsam testi; rate limit; ölü kod temizliği

PHASE 12 Responsive + erişilebilirlik (P1-10)
         320/390/720/1024/1440 px gerçek tarayıcı ölçümü; masaüstü regresyonu

PHASE 13 Production doğrulama (ayrı rapor: Local/PGlite · Live Supabase · Real Browser · Production Artifact)
         Mock/yerel PASS ile production PASS iddiası yok
```

**PHASE 7'ye girmeden önce onayınız gereken 3 karar:**
1. **İzolasyon modeli:** tek uzman sahipliği mi (A→A ✓, A2→A1 ✗), yoksa kurum içi paylaşım mı? (P0-2 tüm policy setini belirler.)
2. **Formülasyon/güvenlik planı için yeni tablo mu** (`formulations`, `safety_plans`) yoksa mevcut bir tabloya yapısal jsonb mı? (Öneri: iki tablo, tek satır/danışan, audit'li, rollback kolay.)
3. **İmza/kilit zorunlu mu, opsiyonel mi?** (Öneri: opsiyonel — kaydederken "imzala ve kilitle" seçeneği.)

---

## 36. Verification Ledger (dürüst durum)

| Kontrol | Sonuç | Kanıt |
|---|---|---|
| `git status` (repo değişmedi) | **PASS** | Temiz; audit yalnız okuma + `tests/dist` artefaktı (gitignore'lu) |
| `npm run typecheck` | **PASS** | `tsc --noEmit` hatasız |
| `npm test` | **PASS** | 90/90 (20 dosya), 25.6 s |
| `npm run build` | **PASS** | `build.test.ts` içinde çalıştı; `dist/index.html` + assets + `_headers` üretildi |
| PGlite RLS/IDOR probu | **PASS (ölçüm)** + **7 boşluk bulundu** | `/.arena/audit/audit_rls.mjs`, `audit_rls2.mjs`, `audit_rls3.mjs` (repo dışı, `supabase/migrations` üzerine) |
| Sentetik klinik workflow (store düzeyi) | **Kısmi PASS** | `/.arena/audit/workflow_probe.ts`: intake/randevu/seans/ölçek/formülasyon/rapor çalışıyor; bağ ve denetim boşlukları raporlandı |
| Gerçek tarayıcı (Playwright) | **BLOCKED** | `npx playwright install chromium` → download failure (bu ortamda ağ kısıtlı); ikili depoda yok. Mevcut e2e (6 senaryo × 4 proje) yeniden koşulamadı |
| Live Supabase | **BLOCKED** | Bu repoda `supabase/config.toml` project_id boş; oturumda Supabase erişimi/proje kimliği yok. `db push`/`functions deploy` **çalıştırılmadı** |
| Production | **NOT VERIFIED** | Sitede DNS/oturum kanıtı bu raporun kapsamı dışında; hiçbir production işlemi yapılmadı |

**Kaynakların doğruluğu:** Tüm bulgular dosya/satır referanslı veya yeniden üretilebilir komutlarla verildi. Mock ile PASS iddiası yoktur. Hukuki uygunluk iddiası yoktur; KVKK/Türkiye bölümü yalnızca tasarım kararlarını etkileyen teknik referanslardır ve hukukçu incelemesi gerektirir.

---

**DURUM: PHASE 0–6 tamam. PHASE 7 için kod yazılmadı; onay bekleniyor.**
