# PHASE 7 — Bulut Klinik Kalıcılık, Sahiplik/RLS, İmza-Kilit ve Denetim Raporu

Tarih: 2026-09-25 · Dal: `arena/01a0d937-psikolog` · Temel commit: `340930b`
Bu rapor PHASE 7 çalışmasının **durum** raporudur: doğrulanan (LOCAL/PGlite/unit/build) işler
kanıtla, doğrulanamayan işler **BLOCKED** olarak yazılmıştır. Canlı Supabase ve gerçek tarayıcı
bu ortamda kullanılamadığı için **PRODUCTION NOT VERIFIED**.

---

## 1. Executive Summary

PHASE 0–6 denetiminde ölçülen yedi veri-sahiplik/RLS açığı ve "localStorage tek doğruluk kaynağı"
mimarisi kapatılmak üzere çalışıldı. Bu fazda:

- **P0-2 (Sahiplik + RLS)** tamamlandı: `clients/appointments/sessions.owner_user_id`, `can_access_client()`
  yardımcısı, tüm klinik tablolar için sahiplik tabanlı politikalara geçiş, `profiles_insert_self`
  keyfî kurum atamasının kapatılması, `psychologist_settings` / `test_results` / `report_versions`
  daraltmaları ve **Storage politikalarının org öneki yerine danışan sahipliğini doğrulaması**.
  A→A PASS, A→B DENY, Admin izinli matrisi PGlite üzerinde yeşil.
- **P0-3 (Klinik kalıcılık)** tamamlandı: UI → store → repository → port → Supabase katmanı,
  `queueWrite` + outbox, kimlik eşleme (yerel id → kalıcı UUID), `applyClinicalSnapshot`,
  "kaydedildi" yalnızca gerçek yazımda, ağ hatasında `offline` durumu ve kuyruk.
- **P0-4 (Randevu→Seans→Not)** tamamlandı: `sessions.appointment_id` (tek seans per randevu,
  kısmi unique index), "Görüşmeyi tamamla" randevudan danışan/ücret/tarih otomatik dolu taslak
  SOAP notu üretir; tekrar tıklama kopya üretmez; not yeniden kaydı günceller.
- **P0-5 (İmza/Kilit/Revizyon + Audit)** tamamlandı: `sessions`, `reports`, `formulations`,
  `safety_plans` için `draft → signed → locked`, `signed_at/by`, `locked_at/by`, `revision`,
  `amendment_of/reason/superseded_by`; kilitli kayıt **DB trigger'ı ile** korunur (UPDATE/DELETE
  reddedilir), düzeltme yalnızca yeni revizyon satırı ile; audit eylem listesi genişletildi.
- **P0-6 (localStorage rolü + kapsamlama)** tamamlandı: anahtarlar `psikolog:{org}:{user}:…`
  önekli cache'e taşındı, çıkışta kullanıcı cache'i temizlenir, yerel veri buluta
  **export→transform→import→verify** ile aktarılır ve doğrulama başarısızsa yerel veri silinmez.
- **P0-7 (Storage/belgeler)** veri katmanı ve RLS düzeyinde tamamlandı: belge nesnesi Supabase
  Storage'a yüklenir, metadata satırı (`file_path/mime_type/size_bytes/created_by/org/client`)
  yazılır, A→B nesne okuma/güncelleme/silme reddedilir.
- **P0-8 (Regresyon/üretim doğrulaması)** kısmen yapıldı: tam test paketi, typecheck ve production
  build yeşil; **canlı Supabase + gerçek tarayıcı + production validation BLOCKED**.

Doğrulama özeti (bu raporda kanıtlarıyla):
`npm test` → **137/137 PASS**, `tsc --noEmit` → **PASS**, `vite build` → **PASS**.
Canlı Supabase → **BLOCKED**, gerçek tarayıcı (Playwright/Chromium) → **BLOCKED**, üretim doğrulaması → **NOT VERIFIED**.

> **P0-8 canlı doğrulama turu (2026-09-25):** CLI oturumu yok, repo link yok ve sandbox'ta
> `*.supabase.co` / `api.supabase.com` TLS erişimi engelli (ölçümler:
> `docs/PHASE-7-LIVE-VALIDATION.md` §1.1). Bu nedenle canlı koşu yapılamadı;
> **PHASE 7 COMPLETE DEĞİLDİR**. Gerekli project ref ve komutlar aynı belgede §2'dedir.

---

## 2. Kritik Altı Problemin Durumu (Önce → Yapılan → Sonuç → Kanıt)

### 2.1 Klinik veri tarayıcıya hapsedilmişti (kaynak localStorage)
- **Önce:** danışan/randevu/seans/anamnez/rapor yalnızca `localStorage`'da; cihaz kaybı = klinik kayıt kaybı.
- **Yapılan:** `src/clinical/cloud/{port,rows,repository,sync,migrate}.ts`; store'lar yazma yolunda `queueWrite`
  kullanıyor; oturum açılışında `startClinicalCloud()` sunucudan anlık görüntüyü çekip cache'i tazeliyor.
- **Sonuç:** Supabase klinik doğruluk kaynağı; localStorage yalnızca hız/çevrimdışı yansısı.
- **Kanıt:** `tests/phase7CloudSync.test.ts` (12 test) — yazım/okuma/kimlik eşleme/kuyruk; `npx tsc --noEmit` PASS.

### 2.2 Sahiplik ve IDOR (ölçülen 7 RLS açığı)
- **Önce:** org içi geniş SELECT politikaları, `profiles_insert_self` ile keyfî `organization_id`, sahiplik kolonu yok.
- **Yapılan:** `owner_user_id` kolonları + `can_access_client()`; clients/anamneses/sessions/assessments/
  test_administrations/test_results/reports/report_versions/documents/notes/appointments/tasks/formulations/
  safety_plans politikaları sahiplik tabanlı yazıldı; Storage politikaları danışan doğruluyor.
- **Sonuç:** A kendi verisine erişir, A→B okuma/yazma/silme reddedilir, admin izinlidir.
- **Kanıt:** `tests/phase7RlsMatrix.test.ts` 14 test PASS (A→A PASS, A→B DENY, B→A DENY, admin PASS,
  storage update/delete DENY); `tests/security.test.ts` + `securityExtended.test.ts` yeşil.

### 2.3 Randevu → Seans → Not zinciri kopuktu
- **Önce:** "Görüşmeyi tamamla" yalnızca randevu durumunu değiştiriyordu; seans bağı yoktu.
- **Yapılan:** `sessions.appointment_id` (FK + `sessions_appointment_unique_idx` kısmi unique index),
  `completeAppointmentWithSession()` idempotent, UI randevu→seans akışı ve "Seans #N notu" bağlantısı.
- **Sonuç:** Tek randevudan tek seans; danışan/ücret/tarih/saat otomatik; yeniden kayıt günceller.
- **Kanıt:** `tests/phase7SessionChain.test.ts` (10 test) + `tests/phase7LockChain.test.ts` (11 test, PGlite).

### 2.4 İmza/kilit/revizyon yoktu
- **Önce:** kayıt sonrası serbest düzenleme; kim imzaladı/kilitledi izlenmiyordu.
- **Yapılan:** dört klinik varlık için durum makinesi + `enforce_locked_record()` BEFORE UPDATE/DELETE trigger'ı
  + `mark_superseded()` revizyon zinciri + `prepare_*_record()` revizyon/version yönetimi; UI'da
  `RecordLockActions` ("İmzala", "İmzala ve Kilitle", "Yeni Revizyon" – gerekçe zorunlu, ConfirmDialog ile).
- **Sonuç:** Kilitli kayıt DB'de değiştirilemez/silinemez; düzeltme yeni revizyon satırı açar.
- **Kanıt:** `phase7LockChain.test.ts` (kilitli UPDATE/DELETE reddi, revizyon `revision+1`, `superseded_by`);
  `phase7SessionChain.test.ts` (UI-düzeyi akış).

### 2.5 Denetim izi eksikti
- **Önce:** yalnızca danışan kaydı ve bazı pratik akışları denetleniyordu; seans/randevu/test/rapor sessizdi.
- **Yapılan:** `audit_logs_action_check` genişletildi; `log_audit_change()` eylem eşlemesi yenilendi
  (`session_sign/lock/revision`, `report_sign/lock/revision`, `formulation_*`, `safety_plan_*`,
  `appointment_*`, `task_*`, `document_*`, `note_*`); store katmanında audit kancaları korundu.
- **Sonuç:** Klinik mutasyonların izi `audit_logs`'ta; uygulama tarafında `recordAudit` yerel iz (200 kayıt).
- **Kanıt:** `phase7LockChain.test.ts` audit okumaları (`asService`), PGlite.

### 2.6 Belgeler base64 olarak localStorage'daydı
- **Önce:** dosya içerikleri `dataUrl` biçiminde tarayıcıda; kota ve gizlilik riski.
- **Yapılan:** `documents` metadata satırı + Storage nesnesi (`<org>/<client>/<id>-<ad>`), yükleme/silme
  `CloudPort.upload/removeObject` üzerinden; kimlikler bulut UUID'sine eşlenerek yol yazılıyor.
- **Sonuç:** Dosya Storage'da, meta veri DB'de; Storage RLS danışan sahipliğini doğruluyor.
- **Kanıt:** `phase7CloudSync.test.ts` (yükleme/silme sözleşmesi) + `phase7RlsMatrix.test.ts` (storage DENY).
- **Sınır** : Uygulama UI'sinde büyük dosyaların doğrudan Storage'a yüklenmesi uçtan uca **canlı ortamda
  doğrulanmadı** (bkz. BLOCKED).

---

## 3. Veri Mimarisi

Katmanlar (istemci):

```
UI (React bileşenleri)
  → store (clinicalStore / practiceStore)          ← tek yazma noktası, audit kancaları
    → cloud/sync (queueWrite, outbox, cacheKey, id eşleme, SyncState)
      → cloud/repository (TABLES, upsertRow, loadSnapshot, push*/remove*)
        → cloud/rows (saf satır ↔ domain dönüşümleri)
          → cloud/port (CloudPort) → Supabase
```

- Bileşenler doğrudan `supabase.from(...)` çağırmaz; tek geçiş noktası `CloudPort`.
- `ClinicalPort` yerine geçebilir (testlerde `MemoryPort`).
- Kimlikler: yerel kimlikler (`cli_…`, `sess_…`) `toCloudId()` ile kalıcı UUID'ye eşlenir; sunucudan okunan
  anlık görüntü `remapSnapshotIds()` ile yerel kimliklere geri çevrilir, böylece UI bağlantıları kopmaz.
- Tablolar: `organizations, profiles, clients, anamneses, appointments, sessions, assessments,
  test_definitions, test_administrations, test_results, reports, report_versions, report_templates,
  psychologist_settings, documents, notes, tasks, formulations, safety_plans, audit_logs`.
- Anamnez danışanla 1:1 (`anamneses.client_id` unique) ve `pushClient()` içinde birlikte yazılır.
- Ölçekler: sistem test tanımları sabit UUID'ler (BAI/BDI/SCL-90-R/GAD-7/PHQ-9);
  sonuçlar `test_administrations` + `test_results.result_data` (jsonb) olarak.

---

## 4. RLS Matrisi (PGlite ile doğrulandı)

| Özne | clients | sessions | anamneses | formulations/safety | test_results | reports | storage |
|---|---|---|---|---|---|---|---|
| PSY_A → kendi kaydı | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| PSY_A → PSY_B kaydı | DENY (0 satır) | DENY | DENY | DENY | DENY | DENY | DENY |
| PSY_B → PSY_A kaydı | DENY | DENY | DENY | DENY | DENY | DENY | DENY |
| Aynı org, farklı psikolog | DENY | DENY | DENY | DENY | DENY | DENY | DENY (oku/güncelle/sil) |
| ORG_ADMIN (kendi org) | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| ADMIN (platform) | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| anon / süresi geçmiş oturum | DENY | DENY | DENY | DENY | DENY | DENY | DENY |

Kanıt: `tests/phase7RlsMatrix.test.ts` (14/14), `tests/security.test.ts` (11/11),
`tests/securityExtended.test.ts` (12/12). Ayrıca IDOR negatif testleri: yanlış UUID, yanlış `file_number`,
başka org'a INSERT, rol yükseltme (`profiles.role` → ADMIN), `audit_logs` okuma.

---

## 5. Migration Listesi

| # | Dosya | Amaç | Etkilenen tablolar | RLS | Yıkıcı? |
|---|---|---|---|---|---|
| 1 | `20260925100000_phase07_ownership_rls.sql` | Sahiplik kolonları, `can_access_client`, politika yenileme, `profiles_insert_self` sertleştirme, settings/test_results/report_versions daraltma, Storage politikaları | clients, appointments, sessions, anamneses, assessments, test_administrations, test_results, reports, report_versions, documents, notes, tasks, psychologist_settings, profiles, storage.objects | Tümü | **Hayır** (ADD COLUMN + POLICY; geri alınabilir) |
| 2 | `20260925110000_phase07_formulations_safety_plans.sql` | Ayrı `formulations` ve `safety_plans` tabloları: FK, sahiplik, audit, created_by/updated_by, status/revision, kilit/revizyon trigger'ları | formulations, safety_plans, audit_logs (kısıt genişletme) | Var | **Hayır** (yeni tablo) |
| 3 | `20260925120000_phase07_session_chain_lock.sql` | Randevu→seans bağı ve imza/kilit/revizyon: `appointment_id`, `status`, `signed_*`, `locked_*`, `revision`, `amendment_*`, kısmi unique index, trigger'lar; reports kilit kolonları | sessions, reports | Var | **Hayır** (ADD COLUMN; mevcut satırlar `draft`) |
| 4 | `20260925130000_phase07_anamnesis_fields.sql` | İstemci modeliyle hizalama: danışan cinsiyet/medeni durum/acil iletişim, durum akışı, randevu ücret/ödeme, anamnez tıbbi alanları | clients, appointments, anamneses | Var | **Hayır** (ADD COLUMN + CHECK genişletme) |

Önceki fazlardan devralınan 7 migration dosyası değiştirilmedi. **Hiçbir tablo/kolon silinmedi**,
veri kaybı yok. `supabase db push` **çalıştırılmadı** (canlı ortam yok, bkz. §13).

---

## 6. Klinik İş Akışı (uygulama)

1. Giriş → `AuthGate` → klinik veri sunucudan yüklenir (`startClinicalCloud`), üstte durum şeridi.
2. Danışan kaydı (`clients` + `anamneses` 1:1) → ücret/randevu alanları aynı modelde.
3. Randevu oluştur → **"Görüşmeyi tamamla"** → taslak SOAP notu otomatik dolar (danışan, seans no, tarih,
   saat, süre, ücret). Aynı randevu ikinci kez tamamlanamaz (tek seans/randevu).
4. Seans notu düzenlenir → kaydet (güncelleme, kopya yok).
5. Seans/rapor/formülasyon/güvenlik planı → **İmzala** → **İmzala ve Kilitle** → kilitli kayıt
   yalnızca **Yeni Revizyon** (gerekçe ≥ 3 karakter) ile düzeltilir; eski sürüm `superseded_by` ile korunur.
6. Her klinik mutasyon audit'e yazılır; kullanıcıya "kaydedildi" yalnızca gerçek yazım sonucunda gösterilir.

---

## 7. İmza / Kilit / Revizyon

- Durumlar: `draft → signed → locked`. `revision` ve `version_number` içerik değişiminde artar
  (imza/kilit geçişleri revizyonu şişirmez — `ignored_columns` yaklaşımı).
- DB koruması: `enforce_locked_record()` — kilitli satırda UPDATE/DELETE `raise exception`;
  istisna yalnızca `superseded_by` işaretlemesi (revizyon zinciri) içindir.
- İmzalı kayıt taslağa çevrilemez (DB düzeyinde de reddedilir).
- Revizyon: yeni satır (`amendment_of`, `amendment_reason` zorunlu), eski satır `superseded_by` alır;
  `unique … where superseded_by is null` canlı satırın tek olmasını garanti eder.
- UI: `RecordLockActions` (ConfirmDialog ile onay), kilitli kayıtta düzenle/sil düğmeleri gizlenir;
  formülasyon/güvenlik planında salt-okunur görünüm + store düzeyinde `throw` koruması.
- Kanıt: `phase7LockChain.test.ts` (11), `phase7SessionChain.test.ts` (10), `phase7CloudSync.test.ts` (kilit satırı).

---

## 8. Storage / Belgeler

- Bucket: `client-documents`. Yol: `<organization_id>/<client_id>/<document_id>-<dosya_adı>`.
- Metadata: `documents(file_path, file_name, mime_type, size_bytes, description, client_id, organization_id, created_by, created_at, updated_at)`.
- Storage RLS: `is_active_user()` + org üyeliği + **`can_access_client(folder[2])`**; bozuk klasör yolu
  hata fırlatmaz, erişim vermez.
- A→B: yükleme reddi, okuma 0 satır, güncelleme/silme reddi, sahibin nesnesi yerinde (test edildi).
- localStorage'da ham base64 tutulmaz; yalnızca küçük önizleme/kapak verisi (mevcut davranış) ve
  Storage yolu saklanır.

---

## 9. localStorage Rolleri

| Rol | Anahtar biçimi | Not |
|---|---|---|
| Bulut cache (danışan/seans/randevu/test/rapor) | `psikolog:{org}:{user}:psikolog_*_v2` | Sunucudan tazelenir; çıkışta silinir |
| Bulut cache (not/görev/belge/ayar/formülasyon/güvenlik/tarama) | `psikolog:{org}:{user}:psikolog_*_v2` | Aynı |
| Outbox (gönderilemeyen yazımlar) | `psikolog:{org}:{user}:psikolog_outbox` | Bağlantı gelince sırayla gönderilir |
| Kimlik eşlemesi | `psikolog:{org}:{user}:id-map` | Yerel id → kalıcı UUID |
| Yerel mod (Supabase yok) | `psikolog_*_v2` | Tek cihaz davranışı korunur (regresyon yok) |
| Taslak yardımcıları | `psikolog:client-draft:v1:{user}` | **Üretimde bağlı değil** (sınıflandırma: kuyruk işini bulut outbox yapıyor) |

Çıkışta: `stopClinicalCloud({purge:true})` → kapsamlı cache, outbox ve id-map temizlenir.
Kaynak-of-truth testi: localStorage temizlenip yeniden yüklenince veri Supabase'den geri gelir
(`phase7CloudSync.test.ts` → "localStorage temizlense bile veri Supabase'den geri gelir").

---

## 10. Güvenlik / IDOR

- RLS tek güvenlik sınırıdır; istemci kontrolleri yalnızca UX'tir (kayıt kilitliyse düzenleme gizlenir,
  ancak DB trigger'ı asıl korumadır).
- Kapatılan açıklar: org-geneli okuma, INSERT'te danışan/kurum doğrulaması, `profiles_insert_self`
  ile keyfî org, settings/test_results/report_versions geniş politika, Storage org-öneki yetersizliği.
- IDOR negatif testleri: yanlış UUID, yanlış `file_number`, başka org INSERT, rol yükseltme denemesi,
  `audit_logs` okuma (PSYCHOLOG → 0 satır; admin → izinli).
- `service_role` tarayıcıda yok; anon anahtar yalnız RLS'in izin verdiği kadar erişir.

---

## 11. Audit

- `audit_logs` eylem listesi genişletildi: `session_insert/update/delete/sign/lock/revision`,
  `report_*` (sign/lock/revision dahil), `formulation_*`, `safety_plan_*`, `appointment_*`, `task_*`,
  `document_*`, `note_*`, `test_admin_*`, `test_result_*`, `client_*`, `profile_*`, `org_*`, `template_*`.
- `log_audit_change()` alan karşılaştırması `to_jsonb(new) ? 'kolon'` ile yapılır (kolon yoksa hata vermez).
- Denetim kayıtları org + actor ile yazılır; raporlanan mutasyon listesi kapsanır.
- Kanıt: PGlite testlerinde `asService` ile okunan audit satırları (jwt bağlamı olmadan okunamaz).

---

## 12. Testler

| Kategori | Durum | Kanıt |
|---|---|---|
| Unit (store, eşleme, UI sözleşmeleri) | **PASS** | `tests/*.test.ts` (23 dosya) |
| Entegrasyon (store ↔ sahte CloudPort) | **PASS** | `tests/phase7CloudSync.test.ts` (12) |
| PGlite / SQL davranışı | **PASS** | `tests/phase7LockChain.test.ts` (11), `phase7SessionChain.test.ts` (10) |
| RLS/IDOR matrisi | **PASS** | `tests/phase7RlsMatrix.test.ts` (14), `security*` (23) |
| Canlı Supabase kiti (`scripts/live-validation/run.mjs`) | **HAZIR / koşulamadı** | `--dry-run` PASS (ortam kontrolü); canlı koşu **BLOCKED** (ağ) |
| Tarayıcı (Playwright, gerçek Chromium) | **BLOCKED** | Chromium ikili dosyası yok (`~/.cache/ms-playwright` boş, sistem tarayıcısı yok) |
| Üretim (canlı Supabase + dağıtım) | **NOT VERIFIED** | Sandbox'tan Supabase egress engelli; production site DNS çözülemedi |

Toplam: `npm test` → **137 test, 137 PASS, 0 FAIL** (~40.7 s). `npx tsc --noEmit` → **PASS**.
`npm run build` → **PASS** (vite 7.3.6, `dist/assets/index-*.js` 498.66 kB / gzip 139.37 kB).

---

## 13. BLOCKED (gerekçeleriyle)

1. **Canlı Supabase doğrulaması — BLOCKED.** İki bağımsız engel ölçüldü:
   (a) **CLI oturumu ve link yok** (`SUPABASE_ACCESS_TOKEN` tanımsız, `supabase/.temp/project-ref` yok,
   `config.toml` `project_id` şablon halinde); (b) **sandbox ağ filtresi**: `afvqznjqlrcoxoalkczd.supabase.co`
   ve `api.supabase.com` için TCP 443 açık olsa da TLS el sıkışması düşürülüyor (HTTP 000,
   `SSL_ERROR_SYSCALL`), `db.<ref>.supabase.co:5432` tamamen kapalı. Bu nedenle `supabase login`,
   `supabase link`, `supabase db push` ve PostgREST/Auth/Storage çağrıları bu ortamdan yapılamadı.
   Ayrıntılı ölçümler ve gerekli komutlar: `docs/PHASE-7-LIVE-VALIDATION.md`.
   Migration'lar yalnız **PGlite (PostgreSQL uyumlu motor)** üzerinde doğrulandı; gerçek Supabase
   RLS/JWT davranışı, Storage yükleme/indirme ve Edge Function entegrasyonu **NOT VERIFIED**.
2. **Gerçek tarayıcı doğrulaması — BLOCKED.** Playwright 1.63.0 kurulu ancak tarayıcı ikilisi yok
   (`~/.cache/ms-playwright` boş; sistemde `chromium`/`google-chrome` yok) ve indirme adımı başarısız
   ("Failed to download Chrome for Testing"). Bu yüzden responsive/erişilebilirlik ve uçtan uca
   kullanıcı akışı tarayıcıda kanıtlanmadı; UI davranışı SSR/render ve store testleriyle sınırlı.
3. **Üretim doğrulaması — NOT VERIFIED.** Dağıtım ortamına çıkılmadı; gerçek kullanıcı trafiğinde
   çok kullanıcılı senaryo (A oluştur → çıkış → B giriş → görünmezlik → A giriş → görünürlük)
   yalnızca RLS/store düzeyinde kanıtlandı.
4. **KVKK/VERBİS uyum beyanı yapılmadı** (teknik denetim kapsamı; hukuki beyan bu raporun dışındadır).

---

## 14. Kalan Riskler

1. **Yazım sonrası uzlaştırma:** Yerel yankı anında gösterilir; bulut yazımı hata verirse kayıt yerelde
   kalır ve şerit hata gösterir. Kritik akışlarda otomatik geri alma yerine kullanıcıya dürüst hata
   gösterilir; sonraki açılışta sunucu durumu esas alınır.
2. **Çok sekmeli eşzamanlı düzenleme:** `revision` sunucuda artar ancak istemci iyimser kilit/çakışma
   kontrolü yapmaz; kilitli kayıtlar DB'de korunur, imzalı-taslak geçişleri reddedilir. Çakışma
   tespiti (ör. `updated_at` karşılaştırması) P0-8 kapsamında ele alınmalı.
3. **Taslak yardımcıları:** `draftStorage`'ın taslak/outbox fonksiyonları üretimde kullanılmıyor
   (kuyruk işini bulut outbox üstleniyor); "güvenlik ağı" olarak sunulmuyor, sınıflandırma koda yazıldı.
4. **Anamnez UI'si:** Anamnez alanları danışan kaydı üzerinden yazılır; ayrı bir anamnez formu
   yoktur. Alan eşlemesi `anamnesisToRow` ile 1:1'dir.
5. **Migration doğrulaması:** PGlite ile doğrulanan SQL'in canlı Supabase'e uygulanması ve geri alma
   provası yapılmadı.
6. **Kısmi UI kapsaması:** İmza/kilit/revizyon akışları seans, rapor, formülasyon ve güvenlik planında
   bağlandı; diğer ekranlardaki bazı yerel `confirm/alert` çağrıları bu fazda değiştirilmedi
   (yalnızca klinik silme/kilit/imza akışları önceliklendirildi).
7. **Ağ hatası senaryosu** kuyruk düzeyinde test edildi; tarayıcıda gerçek ağ kesintisi senaryosu
   doğrulanmadı (BLOCKED).

---

## 15. Depo Durumu

```
$ git status --short
 M .gitignore
 M src/App.tsx
 M src/clinical/casework.ts
 M src/clinical/clinicalStore.ts
 M src/clinical/clinicalTypes.ts
 M src/clinical/practiceStore.ts
 M src/components/clinical/AppointmentsPage.tsx
 M src/components/clinical/ClientDetailPage.tsx
 M src/components/clinical/ClinicalReportsPage.tsx
 M src/components/clinical/FormulationPanel.tsx
 M src/components/clinical/SoapSessionsPage.tsx
 M src/styles/clinical.css
 M src/styles/workspace.css
 M src/workspace/draftStorage.ts
?? MASTER_SYSTEM_AUDIT.md
?? docs/PHASE-7-LIVE-VALIDATION.md
?? docs/PHASE-7-PLAN.md
?? docs/PHASE-7-REPORT.md
?? scripts/
?? src/clinical/cloud/
?? src/components/CloudSyncBanner.tsx
?? src/components/clinical/RecordLockActions.tsx
?? supabase/migrations/20260925100000_phase07_ownership_rls.sql
?? supabase/migrations/20260925110000_phase07_formulations_safety_plans.sql
?? supabase/migrations/20260925120000_phase07_session_chain_lock.sql
?? supabase/migrations/20260925130000_phase07_anamnesis_fields.sql
?? tests/pgliteHarness.ts
?? tests/phase7CloudSync.test.ts
?? tests/phase7LockChain.test.ts
?? tests/phase7RlsMatrix.test.ts
?? tests/phase7SessionChain.test.ts

$ git diff --stat          # (izlenen dosyalar)
 14 files changed, 834 insertions(+), 69 deletions(-)

$ git log -1
 340930b Merge pull request #4 from kaaradumaann-psi/arena/01a0d514-psikolog
```

Not: `supabase/.temp/` (CLI yerel durumu), `.env.live` ve `live-validation-result.json`
`.gitignore`'a eklendi; hiçbir sır dosyası repoya girmiyor.


---

## Ek: Alt-Faz Durum Blokları (§52 biçimi)

### P0-2 — Veri Sahipliği ve RLS
- CHANGED FILES: `supabase/migrations/20260925100000_phase07_ownership_rls.sql`, `tests/pgliteHarness.ts`, `tests/phase7RlsMatrix.test.ts`
- MIGRATIONS: 1 (yıkıcı değil)
- TESTS: `phase7RlsMatrix` 14/14, `security*` 23/23 (PGlite)
- TYPECHECK: PASS · BUILD: PASS
- LIVE SUPABASE: BLOCKED · REAL BROWSER: BLOCKED
- SECURITY: A→A PASS, A→B/B→A DENY, admin PASS, anon DENY, storage DENY (oku/güncelle/sil)
- BLOCKERS: canlı Supabase yok

### P0-3 — Klinik Kalıcılık
- CHANGED FILES: `src/clinical/cloud/{port,rows,repository,sync,migrate}.ts`, `src/clinical/cloud/bootstrap.ts`, `src/components/CloudSyncBanner.tsx`, `src/App.tsx`, `src/clinical/{clinicalStore,practiceStore}.ts`, `src/clinical/cloud/…`, `tests/phase7CloudSync.test.ts`
- MIGRATIONS: `20260925130000_phase07_anamnesis_fields.sql` (alan hizalaması)
- TESTS: `phase7CloudSync` 12/12 · TYPECHECK: PASS · BUILD: PASS
- LIVE SUPABASE: BLOCKED · REAL BROWSER: BLOCKED
- SECURITY: yazma yolu tek geçiş noktası (`CloudPort`), `service_role` yok
- BLOCKERS: canlı Supabase yok; ağ kesintisi yalnız birim düzeyinde test edildi

### P0-4 — Randevu → Seans → Not
- CHANGED FILES: `src/clinical/clinicalStore.ts`, `src/clinical/clinicalTypes.ts`, `src/components/clinical/{AppointmentsPage,SoapSessionsPage,ClientDetailPage}.tsx`
- MIGRATIONS: `20260925120000_phase07_session_chain_lock.sql`
- TESTS: `phase7SessionChain` 10/10, `phase7LockChain` (zincir kısmı) 11/11
- TYPECHECK: PASS · BUILD: PASS · LIVE SUPABASE: BLOCKED · REAL BROWSER: BLOCKED
- BLOCKERS: —

### P0-5 — Audit + İmza/Kilit/Revizyon
- CHANGED FILES: `src/components/clinical/RecordLockActions.tsx`, `src/components/clinical/{SoapSessionsPage,ClientDetailPage,ClinicalReportsPage,FormulationPanel}.tsx`, `src/clinical/{clinicalStore,practiceStore,clinicalTypes,casework}.ts`
- MIGRATIONS: M2 + M3 (formulations/safety_plans, session/report kilit kolonları, trigger'lar, audit listesi)
- TESTS: `phase7LockChain` 11/11, `phase7SessionChain` 10/10 · TYPECHECK: PASS · BUILD: PASS
- SECURITY: kilitli satır UPDATE/DELETE reddi; revizyon zorunlu gerekçe
- BLOCKED: canlı ortamda audit okuma/uzun dönem saklama politikası doğrulanmadı

### P0-6 — localStorage Kapsamlama ve Aktarım
- CHANGED FILES: `src/clinical/cloud/{sync,migrate}.ts`, store'lar (`cacheKey` kullanımı), `src/App.tsx` (çıkış temizliği), `src/workspace/draftStorage.ts` (sınıflandırma)
- MIGRATIONS: yok
- TESTS: `phase7CloudSync` (kapsam/temizlik/aktarım/kurtarma senaryoları) 12/12 · TYPECHECK: PASS · BUILD: PASS
- BLOCKED: gerçek tarayıcıda çok kullanıcılı oturum testi

### P0-7 — Storage / Belgeler
- CHANGED FILES: `src/clinical/cloud/repository.ts` (yükleme/silme/yol), `src/clinical/practiceStore.ts` (storagePath), `supabase/migrations/…ownership_rls.sql` (Storage politikaları)
- TESTS: `phase7CloudSync` (belge), `phase7RlsMatrix` (storage DENY) · TYPECHECK: PASS · BUILD: PASS
- BLOCKED: canlı Storage'a gerçek yükleme/indirme ve imzalı URL akışı

### P0-8 — Regresyon / Canlı Doğrulama (BLOCKED)
- CHANGED FILES: `scripts/live-validation/{run.mjs,README.md,seed-live-test-orgs.sql,verify-migrations.sql}`, `docs/PHASE-7-LIVE-VALIDATION.md`
- TESTS: `npm test` 137/137 · TYPECHECK: PASS · BUILD: PASS
- LIVE KIT: `--dry-run` PASS (ortam kontrolü), `node --check` PASS; **canlı koşu BLOCKED**
- LIVE SUPABASE: **BLOCKED** (CLI oturumu yok + `*.supabase.co`/`api.supabase.com` TLS engelli, `:5432` kapalı)
- REAL BROWSER: **BLOCKED** (Chromium ikilisi yok) · PRODUCTION: **NOT VERIFIED**
- GEREKLİ: project ref `afvqznjqlrcoxoalkczd` → `npx supabase login` → `npx supabase link --project-ref afvqznjqlrcoxoalkczd`
  → `npx supabase db push --include-all` → `node scripts/live-validation/run.mjs`
- **PHASE 7 COMPLETE DEĞİL** (canlı doğrulama tamamlanmadı)

---

**Kanıt etiketi özeti:** Yukarıdaki PASS ifadeleri *LOCAL/PGlite/birim+build* düzeyindedir.
**Canlı Supabase PASS'ı, gerçek tarayıcı PASS'ı ve üretim doğrulaması YOKTUR.**
