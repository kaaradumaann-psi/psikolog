# P0 UYGULAMA PLANI — Veri Katmanı + Üretim Güvenliği

Taban: `340930b` · Dal: `arena/01a0d892-psikolog` · Başlangıç baseline: typecheck temiz, **90/90 test**, build başarılı.

---

## 1. Mevcut data model (uygulamanın gerçekten kullandığı)

Tüm klinik tipler `src/clinical/clinicalTypes.ts` + `practiceStore.ts` içinde. Tamamı **senkron**
okunuyor; bileşenler `useState(() => getX())` ile dolduruluyor. Bu, Supabase'in asenkron doğasıyla
çelişiyor — bu yüzden aşağıda cache + repository deseni seçildi.

## 2. localStorage modeli (15 anahtar + 2 bayrak)

| Anahtar | Tip | Klinik veri | Karşılık tablo | PK | FK |
| --- | --- | --- | --- | --- | --- |
| `psikolog_clients_v2` | `Client[]` | **Evet** | `clients` + `anamneses` | `id` (yerel string) | — |
| `psikolog_sessions_v2` | `SoapSession[]` | **Evet** | `sessions` | `id` | `clientId` |
| `psikolog_appointments_v2` | `Appointment[]` | **Evet** | `appointments` | `id` | `clientId` |
| `psikolog_bdi_tests_v2` | `BeckDepressionResult[]` | **Evet** | `test_administrations`+`test_results` | `id` | `clientId?` |
| `psikolog_bai_tests_v2` | `BeckAnxietyResult[]` | **Evet** | aynı | `id` | `clientId?` |
| `psikolog_scl90_tests_v2` | `Scl90Result[]` | **Evet** | aynı | `id` | `clientId?` |
| `psikolog_screenings_v2` | `RapidScreeningResult[]` | **Evet** | aynı (GAD-7/PHQ-9) | `id` | `clientId?` |
| `psikolog_reports_v2` | `ClinicalReport[]` | **Evet** | `reports` | `id` | `clientId?` |
| `psikolog_documents_v2` | `PracticeDocument[]` | **Evet** (+dosya gövdesi data URL) | `documents` + storage | `id` | `clientId` |
| `psikolog_notes_v2` | `PracticeNote[]` | **Evet** | `notes` | `id` | `clientId` |
| `psikolog_tasks_v2` | `PracticeTask[]` | **Evet** | `tasks` | `id` | `clientId?` |
| `psikolog_formulations_v2` | `CaseFormulation[]` | Evet | **tablo yok** | `clientId` | `clientId` |
| `psikolog_safety_v2` | `SafetyPlan[]` | Evet | **tablo yok** | `clientId` | `clientId` |
| `psikolog_settings_v2` | `PracticeSettings` | Hayır (antet) | `psychologist_settings` | — | — |
| `psikolog_audit_v2` | `AuditEvent[]` | Meta | `audit_logs` (trigger) | `id` | — |
| `psikolog-auth` | oturum | Hayır | — (sessionStorage) | — | — |
| `psikolog_legacy_demo_purged_v1` | bayrak | Hayır | — | — | — |

**Sahiplik / RLS:** tüm tablolar `created_by = auth.uid()` ve `organization_id` taşır.
SELECT: `is_admin() OR is_org_member(organization_id)`. INSERT ek olarak çocuğun aynı org'da
olduğunu `exists(...)` ile doğrular.

## 3. Supabase tablo modeli (mevcut, değiştirilmeden korunan)

18 tablo. Bu fazda 9'u bağlanıyor: `profiles`(zaten bağlı), `clients`, `anamneses`, `appointments`,
`sessions`, `test_administrations`+`test_results`, `reports`, `documents`, `tasks`.
Bağlanmayanlar: `organizations`(dolaylı), `assessments`, `test_definitions`(salt okunur seed),
`report_versions`, `report_templates`, `notes`(bu fazda kapsam dışı), `psychologist_settings`,
`audit_logs`(trigger yazar).

## 4. Mapping

### clients
`id→id(uuid)`, `fileNumber→file_number`, `firstName/lastName`, `birthDate→birth_date`, `phone`,
`email`, `occupation→profession`, `education`, `status`, `+organization_id`, `+created_by`.
**Çakışma:** yerel `status` dört değer (`active|followup|completed|archived`), DB CHECK iki değer.
→ Migration ile CHECK genişletilir (veri kaybı yok, daraltma yok).
Yerelde kalan (DB'de sütunu yok, **taşınmaz, localStorage'da kalır**): `tcNumber`, `gender`, `age`,
`maritalStatus`, `emergencyContact`, `diagnoses`. Bunlar KVKK açısından zaten minimize edilmeli;
DB'ye yeni hassas sütun eklenmiyor.

### anamneses (unique per client)
`presentingComplaint→reason`, `medicalHistory + medications → personal_history`,
`psychiatricHistory→previous_assessments`, `familyHistory→family_history`,
`education→education`, `occupation→profession`, `allergiesNotes→expert_notes`.
Client kaydedildiğinde otomatik upsert edilir; ayrı okuma/yazma yolu da açılır.

### appointments
`date + time → start_at` (Europe/Istanbul), `+durationMinutes → end_at`, `sessionType→title`,
`notes→description`, `location→location`, `status`: `noshow→no_show` (tersi de),
`fee`/`paymentStatus` → **yeni sütun** (migration).

### sessions
`date→date`, `startTime→start_time`(yeni), `durationMinutes→duration`, `sessionType→type`,
`subjective/objective/assessment` → **yeni sütunlar**, `plan→plan` (mevcut),
`riskLevel/riskNotes/homework/fee/paymentStatus/sessionNumber` → **yeni sütunlar**,
`appointment_id` → **yeni FK** (§8 randevu→seans ilişkisi).
Mevcut `notes/observation/key_points/follow_up` sütunlarına dokunulmaz (drop yok).

### test_administrations + test_results
Yerel her test kaydı → bir `test_administrations` (client_id, test_definition_id = seed UUID,
administration_date, status='completed', created_by) + bir `test_results`
(`result_data jsonb` = yerel kaydın tamamı: `answers` + hesaplanmış skorlar, `summary`).
**Puan üretilmiyor** — mevcut motorların (`beckDepression.ts`, `scl90.ts`, `rapidScreening.ts`)
zaten hesapladığı değerler olduğu gibi yazılıyor. `clientId` boşsa senkronize edilmez (DB `not null`).

### reports
`reportTitle→title`, `status` (`draft|completed`), yerel raporun tamamı → `content jsonb`,
`source_snapshot` = raporun üretildiği ölçüm/seans anlık görüntüsü, `source_version='v1'`.
`client_id not null` olduğu için danışansız rapor buluta yazılmaz (UI zaten danışan seçtiriyor).

### documents
Metadata `documents` tablosuna (`client_id`, `file_name`, `mime_type`, `size_bytes`,
`description`, `file_path`, `created_by`). **Dosya gövdesi** Supabase Storage `client-documents`
private bucket'a `<org_id>/<client_id>/<docId>_<ad>` yoluyla yüklenir; okuma imzalı URL ile.
Bucket ve politikalar migration 004'te zaten var — yeni özellik icat edilmiyor, mevcut şema kullanılıyor.

### tasks
Birebir: `title`, `description`, `due_date`, `status`, `priority`, `client_id`, `created_by`.

## 5. RLS

Mevcut politikalar **kaldırılmıyor.** Doğrulama gerçek PostgreSQL (PGlite/WASM) üzerinde,
gerçek migration'larla, `set role authenticated` + `set_config('request.jwt.claim.sub', …)` ile
iki psikolog (Elif Demir / Mehmet Kaya) ve iki org için koşulacak. IDOR: başka `client_id`,
`session_id`, `anamnesis_id`, `report_id`, `document_id`, `task_id`, `test_administration_id`
ile select/update/delete denemeleri.

**Bulunan engel:** `profiles.organization_id` null olan bir psikolog `is_org_member(null)` false
olduğu için hiçbir şey yazamaz. Tek uzmanlı pratikte bu, bulut yolunu tamamen kilitler.
→ Migration ile `ensure_personal_organization()` (security definer) eklenir: kullanıcının org'u
yoksa kişisel org oluşturur ve profili bağlar. Public signup açılmaz, rol yükseltme yapılmaz.

**Audit log (§17):** `audit_logs`'ta istemci için yalnız `grant select` var; INSERT/UPDATE/DELETE
zaten `revoke all`. Yani **DB tarafı zaten append-only.** Asıl sorun yerel `psikolog_audit_v2`'nin
kullanıcı tarafından değiştirilebilmesi → UI'da "değiştirilebilir" olarak açıkça işaretlenecek.

## 6. Repository / service yapısı

```
src/clinical/cloud/
  types.ts        — satır tipleri (snake_case), port arayüzleri
  ports.ts        — DbPort / StoragePort (dar, isimlendirilmiş işlemler)
  supabasePort.ts — üretim adaptörü (@supabase/supabase-js)
  pglitePort.ts   — TEST adaptörü: gerçek SQL + gerçek RLS (mock değil)
  mapping.ts      — saf fonksiyonlar: local ⇄ row (birim testli)
  ids.ts          — UUID üretimi/doğrulama + yerel id yükseltme
  repository.ts   — entity başına pull/push
  sync.ts         — orkestrasyon: pullAll, push, outbox, durum
  status.ts       — senkron durumu + `psikolog:sync-error` olayı
```

UI bileşenleri **değişmiyor.** Mevcut `clinicalStore` / `practiceStore` API'si korunur; içlerine
tek bir kanca eklenir: cache'e yazdıktan sonra `sync.push(entity, record)`. Girişten sonra
`sync.pullAll(user)` çalışır, cache buluttan doldurulur, sonra UI render edilir.
Böylece "sayfayı yenile → veri duruyor" ve "logout/login → veri duruyor" sağlanır.

**Kimlik:** yerel id'ler (`cli_xxx`) UUID değil. Buluta yazmadan önce bir kerelik, atomik
"id yükseltme" çalışır: UUID olmayan her kayda UUID atanır ve tüm referanslar
(`clientId`, `test_administration_id` …) aynı geçişte yeniden yazılır. Test edilir.

## 7. Migration ihtiyacı

Tek yeni dosya: `supabase/migrations/20260925000000_p0_clinical_workflow.sql`
- `clients.status` CHECK genişletme (+`followup`, +`completed`) — daraltma yok
- `appointments`: `fee numeric(10,2)`, `payment_status text`
- `sessions`: `appointment_id uuid → appointments on delete set null`, `session_number int`,
  `start_time time`, `subjective/objective/assessment text`, `risk_level text`, `risk_notes text`,
  `homework text`, `fee numeric(10,2)`, `payment_status text`
- `audit_logs_action_check`'e yeni eylemler gerekmez (mevcut liste yeterli)
- `ensure_personal_organization()` security definer RPC
- Hiçbir tablo drop edilmez, hiçbir sütun silinmez, RLS kapatılmaz.

## 8. Frontend değişiklikleri

1. `App.tsx` — üretimde auth zorunlu; `.env` yoksa ve `import.meta.env.DEV` false ise
   "çalışma alanı hazır değil" ekranı. Local mode yalnız development.
2. `ClientDetailPage.tsx` — canonical sekme anahtarı + `?sekme=` normalizasyonu (P0 bug).
3. `Dashboard.tsx` — canonical anahtarı kullan.
4. `clinicalStore.ts` / `practiceStore.ts` — sync kancası.
5. `AuditPage.tsx` — yerel izin değiştirilebilirliği uyarısı.
6. `CloudGate` — giriş sonrası `pullAll`.
7. Silinen: `src/auth/adminApi.ts` (ölü), `react-hook-form`, `@hookform/resolvers`, `zod`.

## Uygulama sırası (her adımda typecheck + test + build)

A. Formülasyon bug'ı + regresyon testi · B. bağımlılık/ölü kod temizliği ·
C. auth sertleştirme · D. migration · E. port + mapping + repository ·
F. store entegrasyonu · G. uçtan uca PGlite senaryosu (Elif Demir / Mehmet Kaya / IDOR) ·
H. localStorage denetimi + final rapor.
