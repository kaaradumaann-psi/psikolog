# PHASE 0 — Psikoloji ↔ MMPI entegrasyon audit raporu

**Durum:** Yalnızca inceleme. Bu fazda mevcut dosya, migration, RLS, Edge Function veya UI değiştirilmedi.

**Tarih:** 2026-09-25  
**Kaynaklar:** bu checkout (`kaaradumaann-psi/psikolog` @ `340930b`) ve salt-okunur klon `kaaradumaann-psi/Repo123` (canlı domain: `mmpi.halilkaraduman.com.tr`).  
**Kısıt:** Bu Arena oturumu yalnızca `psikolog` deposuna bağlıdır. MMPI kodu bu repoya taşınamaz (`tests/retiredInstrumentGuard.test.ts` scoring/OMR/PDF vendoring’ini yasaklar). Uygulama iki ayrı PR/depo gerektirir.

---

## 0. Yönetici özeti

İki uygulama **bağımsız Supabase Auth + bağımsız PostgreSQL** üzerinde duruyor. Birleştirilmemelidir.

Kullanıcının beklediği “tek ekosistem” bugün **yoktur**:

| Beklenen | Gerçek |
| --- | --- |
| Psikolog danışan profilinden “MMPI İste” | Psikoloji UI’da MMPI yok; Ölçekler sekmesi yalnız BDI/BAI/SCL/PHQ-9/GAD-7 |
| Talep MMPI “Bekleyen Kuyruk”a düşer | MMPI’deki “Bekleyen kuyruk” **sunucu kuyruğu değil**, tarayıcı `localStorage` outbox’ıdır (çevrimdışı kayıt gönderme) |
| MMPI uzmanı kuyruktan açar | MMPI’de ayrı uzman rolü yok; kayıt yazan rol `PSYCHOLOG` |
| Tamamlanınca psikoloji “Tamamlandı” | Karşılıklı API, request tablosu, callback yok |
| Tek kimlik / ikinci login yok | İki ayrı Auth, iki `sessionStorage` anahtarı, `detectSessionInUrl: false` |
| Danışan `client_id` ile eşleşir | MMPI danışanı ad+soyad serbest metin; psikoloji UI `cli_<timestamp>_<rand>` yerel id kullanır |
| Ayşe Halil’in Ahmet’ini göremez | Bulut RLS **kurum (org)** izolasyonu; aynı org’daki psikologlar SELECT ile birbirinin danışanını görür. UI ise zaten buluta yazmaz |

Entegrasyon **yeni bir CRM, yeni dashboard, yeni scoring veya yeni kuyruk sayfası yazmadan**, mevcut tabloları/ekranları uzatarak yapılabilir. Yeni tablo yalnızca kanıtlanmış boşluklarda açılmalıdır.

---

## 1. Mevcut architecture

### 1.1 Psikoloji — `psikolog.halilkaraduman.com.tr`

- React 19 + Vite + History API router (`src/router.ts`).
- Cloudflare Worker statik SPA (`wrangler.jsonc` → `psikolog.halilkaraduman.com.tr/*`).
- **Çift katman:**
  1. **UI gerçeği:** danışan, SOAP, ölçek, not, belge, denetim `localStorage` (`src/clinical/clinicalStore.ts`, `practiceStore.ts`). Anahtarlar `psikolog_*_v2`. Kullanıcıya göre izole değil.
  2. **Bulut şeması:** `supabase/migrations/` içinde org/multi-tenant PostgreSQL + RLS. Frontend `clients`, `sessions`, `anamneses`, `test_administrations` tablolarına **hiç yazmaz**.
- Supabase yoksa uygulama **yerel çalışma alanı** olarak açılır (`LOCAL_USER`, giriş duvarı yok).
- Supabase varsa `CloudGate` e-posta/şifre ister; klinik veri yine tarayıcıdadır.
- Mevcut ölçekler cihaz-içi puanlanır (BDI, BAI, SCL-90-R, GAD-7, PHQ-9). MMPI scoring bu repoda yoktur ve olmamalıdır.

### 1.2 MMPI — `mmpi.halilkaraduman.com.tr` (`Repo123`)

- React 19 + özel tek-dosya build (`scripts/build.mjs`) + Cloudflare Worker.
- Supabase proje ref (config): `lgtahyruhyfozhueawft`.
- Kabuk: `AuthGate` → `SignedInApp`. Public signup yok.
- Klinik gerçek kaynak: `public.mmpi_records` (ham OMR/hızlı giriş/ham puan JSON). Puanlama **cihazda** (`src/scoring/*`). Kayıt immutabledır.
- Rapor: `mmpi_reports` + sürümler; scoring’den bağımsız snapshot.
- Taslak: `localStorage` kullanıcı anahtarlı (`mmpi566:case-draft:v1:<userId>`).
- Outbox: aynı tarayıcıda ağ hatası sonrası idempotent upsert kuyruğu.

### 1.3 Bilinçli sınırlar (korunacak)

- İki Supabase projesi ayrı kalır.
- MMPI scoring, Türk normları, K düzeltmesi, geçerlik, klinik ölçek, kod, kritik madde, türetilmiş ölçek **dokunulmaz**.
- Psikoloji CRM/UI baştan yazılmaz.
- `retiredInstrumentGuard` MMPI motorunun bu repoya kopyalanmasını engeller.

---

## 2. Auth architecture

### Psikoloji

| Öğe | Değer |
| --- | --- |
| İstemci | `src/auth/supabaseClient.ts` |
| Storage | `sessionStorage`, anahtar `psikolog-auth` |
| Akış | `persistSession: true`, `autoRefreshToken: true`, `flowType: 'pkce'`, **`detectSessionInUrl: false`** |
| Giriş | `signInWithPassword` (`src/auth/supabaseAuth.ts`) |
| Kabuk | `App.tsx` içindeki `CloudGate` (ayrı `AuthGate` bileşeni yok) |
| Signup | Kapalı (`enable_signup = false`); hesap yalnız `admin-users` Edge Function |
| JWT | 3600s (`supabase/config.toml`) |

Profil `auth.users` insert trigger’ı ile `public.profiles` satırı oluşturur (varsayılan `PSYCHOLOG`). Pasif profil local sign-out edilir.

### MMPI

Aynı kalıp, ayrı proje:

| Öğe | Değer |
| --- | --- |
| Storage anahtarı | `mmpi-566-auth` |
| Kabuk | `src/components/AuthGate.tsx` (signin vs session hydration ayrımı) |
| `detectSessionInUrl` | **false** — hash/query token ile oturum kurulmaz |
| Signup | Kapalı; Admin paneli + `admin-users` |

**Sonuç:** İki Auth session’ı tarayıcıda yan yana durabilir (farklı storage key + farklı origin) ama **otomatik paylaşılmaz**. URL’ye uzun ömürlü access token koymak mevcut tasarıma da aykırıdır.

---

## 3. Role architecture

### Psikoloji `public.user_role`

`ADMIN` | `ORG_ADMIN` | `PSYCHOLOG`

- `ADMIN`: tüm org/danışan, admin RPC, `admin-users`.
- `ORG_ADMIN`: kendi org.
- `PSYCHOLOG`: org üyesi; insert’te `created_by = auth.uid()`.

Frontend `ROLE_LABEL` bu üç rolü tanır. MMPI Expert diye bir enum **yoktur**.

### MMPI `public.user_role`

`ADMIN` | `PSYCHOLOG`

| Eylem | PSYCHOLOG | ADMIN |
| --- | --- | --- |
| `mmpi_records` INSERT | Evet (aktif + `created_by = auth.uid()`) | Hayır |
| Kendi kayıtlarını okuma | Evet | Tüm kayıtlar |
| Uzman notu | Kendi kaydı | Tüm kayıtlar |
| Hesap yönetimi | Hayır | Edge Function |

**Karar (rol adlarını değiştirmeyin):** MMPI tarafındaki mevcut `PSYCHOLOG` = “MMPI uzmanı”. Yeni `MMPI_EXPERT` enum’u AuthGate, RLS helper’ları ve Edge Function’ları bozar. Psikoloji `PSYCHOLOG` = talep eden klinisyen. Aynı gerçek kişi iki projede ayrı `profiles.id` taşır; eşleme e-posta + `identity_links` ile yapılır. SSO, MMPI’de **önceden provision edilmiş** hesaba bağlanır; yetkisiz psikoloğa sessizce kayıt yazma hakkı verilmez.

---

## 4. Client ownership architecture

### Psikoloji UI

- Id üretimi: `'cli_' + Date.now().toString(36) + '_' + Math.random()...` — **UUID değil**.
- Sahiplik alanı yok; depo cihaz-seviyesi. Halil ve Ayşe aynı tarayıcıda aynı listeyi görür.
- Durum kümesi UI’da `active|followup|completed|archived`; bulut CHECK yalnız `active|archived`.

### Psikoloji bulut `public.clients`

- `id uuid`, `organization_id`, `file_number` (org içi unique), `created_by → profiles`.
- SELECT: `is_admin() OR is_org_member(organization_id)` → **aynı org’daki tüm psikologlar okur**.
- UPDATE/DELETE: owner veya `ORG_ADMIN` veya `ADMIN`.
- Testler org izolasyonunu ve aynı-org UPDATE IDOR’unu doğrular; **aynı-org SELECT gizliliğini doğrulamaz**.

### MMPI

- Kalıcı danışan tablosu yok. Her kayıtta `client_first_name/last_name` + demografik kopya.
- `requested_by text` aslında **başvuru nedeni** (`applicationReason`); psikolog kimliği değil.
- Eşleme ada göre yapılırsa (“Ahmet CE = Ahmet CE”) mevcut veri modeli zaten yanlış pozitif üretir.

**Karar:** `psychologist_clients` M2M **şimdi açılmayacak**. Mevcut model tek sahiplik (`created_by`) + org paylaşımı. MMPI talebi/sonucu **owner-only** (`created_by = auth.uid()` veya ADMIN). TEST 2 API katmanında owner ile kapanır. Aynı-org SELECT’i CRM davranışı olarak bırakılır; daraltmak klinik paylaşımı kırar. İleride paylaşım gerekirse o zaman M2M eklenir.

---

## 5. MMPI queue architecture

Dashboard özeti (`src/components/Dashboard.tsx`):

```
{ icon: 'alert', label: 'Bekleyen kuyruk', value: outbox.length, path: '/islem' }
```

`outbox` = `loadOutbox(user.id)` → **yerel** çevrimdışı gönderim kuyruğu. Sunucu tablosu, uzman ataması, “Talep eden: Halil Karaduman” alanı yoktur.

`mmpi_records` pending satır tutamaz: INSERT yaş, cinsiyet, isim ve geçerli ham yük (quick 566 / raw / 4 sayfa OMR) ister; immutability trigger klinik alanları kilitler.

**Karar:** Yeni paralel kuyruk **sayfası** yok. Mevcut Dashboard “Bekleyen kuyruk” kartı sunucu `mmpi_requests` (pending/in_progress) ile doldurulur. Yerel outbox “Eşitleme bekliyor” olarak aynı tahtada kalır (zaten ayrı panel metni var). Scoring/OMR akışı `CaseWorkspace` olarak kalır; kuyruk satırı intake’i prefiller.

---

## 6. Mevcut Supabase tabloları

### Psikoloji

| Tablo | Entegrasyon rolü |
| --- | --- |
| `organizations` | Multi-tenant; dokunulmaz |
| `profiles` | Auth profil; SSO eşlemesi için e-posta + opsiyonel `global_user_id` |
| `clients` | **Kanonik danışan UUID**. Talep anında UI `cli_*` → bu satıra map |
| `anamneses`, `sessions` | Kullanılmaz (UI localStorage) |
| `assessments` | Kullanılmaz |
| `test_definitions` | Sistem ölçekleri; MMPI satırı **yeni migration ile eklenir** (`source='other'` veya CHECK genişletmesi) |
| `test_administrations` | **Psikoloji request kaydı.** `status` zaten `planned\|in_progress\|completed\|cancelled`. `external_source` + `external_assessment_id` hazır |
| `test_results` | Özet JSON (ham 566 yok), `summary` |
| `reports` / `report_templates` | İsteğe bağlı rapor referansı; MMPI raporu MMPI DB’de kalır |
| `documents`, `notes`, `appointments`, `tasks` | Dokunulmaz |
| `psychologist_settings` | Dokunulmaz |
| `audit_logs` | Trigger tabanlı; action CHECK listesi kapalı — yeni action’lar migration ile eklenir |

### MMPI

| Tablo | Entegrasyon rolü |
| --- | --- |
| `profiles` | Uzman kimliği |
| `mmpi_records` | Klinik SoT; scoring çıktısı burada. Mümkünse kolon eklemeyin (immutability trigger kırılgan) |
| `audit_logs` | `record_insert/update/delete` — action CHECK dar |
| `mmpi_reports`, `mmpi_report_versions`, `mmpi_report_templates` | Rapor SoT |
| `psychologist_report_settings` | Dokunulmaz |

**Yeni tablo gerekçesi (MMPI):** `mmpi_requests` — pending kuyruk `mmpi_records` ile temsil edilemez. Psikoloji tarafında yeni request tablosu **gerekmez**; `test_administrations` yeter.

**Yeni tablo gerekçesi (her iki taraf, ince):** `sso_authorization_codes` (tek kullanımlık kod) ve `identity_links` (psychology_user_id ↔ mmpi_user_id). Mevcut şemada eşdeğer yok.

---

## 7. Mevcut RLS

### Psikoloji kalıbı

Security definer: `is_active_user`, `is_psychologist`, `is_org_admin`, `is_admin`, `is_org_member`, `my_organization_id`.  
`search_path = public`. Anon revoke. Audit istemciden yazılamaz.

`test_administrations` insert: `created_by = auth.uid()` + org üye + client aynı org. Select: org üyesi. **Owner-only select yok.**

### MMPI kalıbı

`mmpi_records` select/insert owner veya admin. Insert yalnız aktif psikolog. Klinik alanlar UPDATE’te trigger ile kilitli; not alanı ayrı.

### Entegrasyon etkisi

Yeni tablolarda RLS sıfırdan, mevcut politikalara paralel:

- Psikolog yalnız kendi `test_administrations` MMPI satırını görür/oluşturur (`created_by` + client ownership).
- MMPI uzmanı `mmpi_requests` SELECT (aktif PSYCHOLOG veya ADMIN); INSERT tarayıcıdan değil Psychology→MMPI service çağrısından (service role veya imzalı ingest).
- Service-role yalnız Edge Function içinde.

---

## 8. Mevcut Edge Functions

### Psikoloji — `admin-users`

Create / set_active / set_org / delete. CORS `ALLOWED_ORIGINS` (dokümante: `https://psikolog.halilkaraduman.com.tr`). JWT kapıda. Service role sunucuda. Origin parse sıkı (HTTPS, path `/`).

### MMPI — `admin-users` + `ai-interpretation`

Aynı CORS kalıbı. `verify_jwt = true`. AI anahtarı yalnız secret.

**Yeniden kullanılacak:** origin allowlist parser, ValidationError, `isDatabaseSideError`, JWT + profil aktiflik kontrolü.

**Yeni fonksiyonlar (mevcutları şişirmeyin):**

| Taraf | Ad | JWT | İş |
| --- | --- | --- | --- |
| Psikoloji | `sso-issue` | evet | Kısa ömürlü tek kullanımlık kod |
| Psikoloji | `sso-redeem` | hayır (HMAC) | MMPI sunucusunun kodu yakması |
| Psikoloji | `mmpi-request-create` | evet | Owner kontrol + `test_administrations` + MMPI ingest |
| Psikoloji | `mmpi-complete` | hayır (HMAC) | Idempotent status/result sync |
| MMPI | `sso-consume` | hayır (kod+state POST) | Kod doğrula, session mint, OTP gövde |
| MMPI | `request-ingest` | hayır (HMAC) | Kuyruk insert, duplicate no-op |
| MMPI | `request-complete` | evet | Kayıt bağla, psychology callback |

`admin-users` ve `ai-interpretation` imzası değişmez.

---

## 9. Mevcut MMPI request/record yapısı

Request tablosu **yok**.

Kayıt oluşturma: `src/records/supabaseRecords.ts` → `upsert` `idempotency_key` unique. `created_by` oturumdan. Payload: `case-meta` + yöntem.

`requested_by` kolonu psikolog kimliği taşımaz.

Rapor: `mmpi_reports.mmpi_record_id`. Psikolojiye kopyalanmaz; referans id yeter.

Draft/outbox entegrasyon talebi değildir; bozulmamalıdır.

---

## 10. SSO için en güvenli uygulanabilir yöntem

**Elendi**

- İki Auth projesini birleştirmek
- Şifreyi karşı sisteme göndermek
- Access/refresh token’ı URL’ye koymak
- `detectSessionInUrl: true` + magic link hash (token sızıntısı, mevcut istemci kasıtlı kapalı)
- Üçüncü IdP / yeni kullanıcı sistemi

**Seçilen: Authorization Code + HMAC redeem + mint-on-POST**

```
[Psikoloji oturumu]
    │  POST /functions/v1/sso-issue   (JWT)
    │  ← { code, expires_in: 60 }
    │  state = CSPRNG; sessionStorage
    ▼
GET https://mmpi…/sso?code=…&state=…     (opaque code, ~32 byte)
    │  MMPI /sso ekranı kodu URL’den temizler (replaceState)
    │  POST sso-consume { code, state }   (body, Referrer-Policy zaten strict-origin)
    │     MMPI → Psychology sso-redeem
    │        Authorization: Bearer <SSO_HMAC>
    │        tek kullanımlık, TTL, hash(code) lookup
    │        ← { email, first_name, last_name, psychology_user_id, role, nonce }
    │     e-posta ile MMPI profiles eşle (yoksa 403 — auto-provision yok)
    │     identity_links upsert; global_user_id yoksa üret, her iki profiles’a yaz
    │     auth.admin.generateLink({ type:'magiclink', email })
    │     ← { email, token_hash, type }     // access_token değil
    ▼
MMPI client verifyOtp({ token_hash, type })  // mevcut PKCE storage
AuthGate userFromSession → rol/aktiflik
```

Korumalar:

- Kod SHA-256 hash olarak saklanır, plaintext DB’de yok.
- `used_at` not null olunca ikinci redeem 409; replay güvenli.
- TTL 60s.
- `sso-issue` caller `auth.uid()`; body’deki user id yok sayılır.
- State CSRF için; opsiyonel `.halilkaraduman.com.tr` cookie (`Secure; SameSite=Lax`) — top-level GET cookie gönderir.
- PKCE code_verifier iki origin arasında paylaşılmaz; HMAC + one-time code yeterli.
- Logout bağımsız (iki sessionStorage). SLO yok — token çapraz kullanılmaz.
- COOP/CSP: her frontend yalnız kendi Supabase origin’ine konuşur (`connect-src`).

`global_user_id`: yeni IdP değil. İlk başarılı SSO’da üretilen UUID, her iki `profiles` satırında nullable kolon. Eşlemenin SoT’si `identity_links` + doğrulanmış e-posta.

---

## 11. İki sistem arasında taşınacak minimum veri

**Psychology → MMPI (request-ingest)**

```
request_id, psychology_client_id,
client_display_name,          -- gösterim; eşleme anahtarı değil
birth_date?, gender?, age?, occupation?, education?,
requested_by_user_id, requested_by_display_name,  -- sunucu profilinden
source = "psychology"
```

**MMPI → Psychology (mmpi-complete)**

```
request_id,
status = completed | failed,
mmpi_record_id,
mmpi_report_id?,
completed_at,
summary: { applicationDate, validityFlags?, codeType?, blankCount? }
```

**Taşınmaz:** 566 madde, OMR sayfa JSON, T-skor tam profil, uzman notunun tamamı, ham ölçek anahtarları.

Psikoloji `test_results.result_data` üst sınır 2 MiB; pratikte birkaç KB özet.

---

## 12. Gerekli migrationlar

Mevcut SQL dosyaları **değiştirilmez/silinmez**. Yalnızca yeni timestamp’li dosyalar.

### Psikoloji (bu repo)

1. `…_mmpi_test_definition.sql`  
   - Sistem `test_definitions` satırı: MMPI-566.  
   - İsteğe bağlı: `source` CHECK’e `'mmpi'` eklemek yerine `source='other'` kullan (CHECK’e dokunmama).
2. `…_mmpi_administration_constraints.sql`  
   - Partial unique: bir danışanda aynı anda tek açık MMPI (`status in ('planned','in_progress')`, `test_definition_id = MMPI`).  
   - Unique `(external_source, external_assessment_id)` where `external_assessment_id is not null`.
3. `…_sso_and_identity.sql`  
   - `profiles.global_user_id uuid unique`  
   - `sso_authorization_codes (id, code_hash unique, user_id, expires_at, used_at, nonce)`  
   - `identity_links (psychology_user_id pk, mmpi_user_id, email, created_at)`  
   - RLS: kodlara istemci erişemez; yalnız service role.
4. `…_audit_mmpi_actions.sql`  
   - `audit_logs_action_check` genişlet: `mmpi_request_insert/update`, `sso_issue/redeem` (hassas veri yok).

`planned` = kullanıcı dilindeki `pending`. Status çoğaltılmaz.

### MMPI (`Repo123`)

1. `mmpi_requests`  
   - `id`, `psychology_request_id uuid unique`, `psychology_client_id uuid`, `client_display_name`, `requested_by_user_id`, `requested_by_display_name`, `status check (pending|in_progress|completed|cancelled|failed)`, `mmpi_record_id uuid unique references mmpi_records`, `mmpi_report_id`, timestamps, `claimed_by`.
2. SSO kod/identity tabloları (aynı fikir, MMPI tarafı consume kaydı: `sso_consumed_jti`).
3. Audit CHECK genişletmesi: `request_ingest`, `request_complete`.
4. `mmpi_records` kolon eklemesi **yok** — bağ `mmpi_requests.mmpi_record_id`.

Idempotent: `if not exists`, `on conflict do nothing`.

---

## 13. Gerekli API / Edge Function değişiklikleri

Mevcut `admin-users` action seti aynı kalır.

Yeni sözleşmeler (özet):

**`mmpi-request-create`** (psikoloji, JWT)

- Body: `{ clientId }` (UUID). Frontend `cli_*` ise önce `clients` upsert (sunucu `auth.uid()` + org).
- Server: profil aktif PSYCHOLOG/ADMIN, `clients.created_by = auth.uid()` (ADMIN hariç), danışan `archived` ise 409.
- Insert `test_administrations` `status=planned`, `external_source='mmpi'`.
- Unique ihlali → mevcut satırı döndür (duplicate yok).
- HMAC ile MMPI `request-ingest`. Ağ koparsa psikoloji satırı `planned` kalır; istemci retry aynı unique’e düşer.

**`request-ingest`** (MMPI, HMAC)

- `on conflict (psychology_request_id) do nothing returning *`.

**`request-complete`** (MMPI, JWT uzman)

- `mmpi_record_id` RLS ile görünür mü (oluşturan uzman veya admin).
- Status completed; ikinci çağrı no-op.
- Psychology `mmpi-complete` HMAC.

**`mmpi-complete`** (psikoloji, HMAC)

- `test_administrations` `completed` + `test_results` upsert by administration id.
- Replay: aynı `request_id` ikinci kez → 200, yeni result satırı yok.

Hata gövdesi: kısa Türkçe, şema/secret yok.

---

## 14. Gerekli frontend değişiklikleri

Mevcut tasarım bozulmaz; yeni dashboard yok.

### Psikoloji (bu repo)

| Dosya | Değişiklik |
| --- | --- |
| `src/components/clinical/ClientDetailPage.tsx` | Ölçekler sekmesine MMPI kartı: İste / Bekliyor / Tamamlandı / Raporu gör |
| `src/components/clinical/AssessmentHubPage.tsx` | 5. araç kartı “MMPI-566” — scoring değil, talep kısayolu |
| yeni `src/clinical/mmpiRequests.ts` | Edge invoke + liste (RLS altındaki `test_administrations`) |
| `src/App.tsx` / Settings | “MMPI çalışma alanı” linki → SSO başlat (yeni nav grubu yok) |
| `src/lib` veya `src/auth/sso.ts` | `sso-issue` + redirect |
| E2E | `e2e/mmpi-integration.spec.ts` |

Local mode: buton “Bulut hesabı gerekli” — localStorage’a sahte MMPI yazılmaz.

### MMPI (`Repo123`)

| Dosya | Değişiklik |
| --- | --- |
| `src/components/Dashboard.tsx` | Bekleyen kuyruk = `mmpi_requests` pending; satır: ad, talep eden, durum |
| `src/router.ts` | `/sso` public rota (AuthGate dışında) |
| `src/components/AuthGate.tsx` | `/sso` çocukları login formunu atlar |
| `src/components/CaseWorkspace.tsx` | `?talep=<id>` ile intake prefill; `requested_by` psikolog adını sunucudan |
| `src/records/supabaseRecords.ts` | Kayıt sonrası `request-complete` (scoring’e dokunmadan) |
| Scoring/OMR | **sıfır satır** |

---

## 15. Güvenlik riskleri

| Risk | Şiddet | Mitigasyon |
| --- | --- | --- |
| UI danışanları localStorage, cloud RLS’den kopuk | Yüksek | MMPI yolu yalnız JWT + `public.clients` |
| Aynı org SELECT (Ayşe Halil’in dosyasını okur) | Orta | Talep API owner-only; CRM SELECT bilinçli bırakıldı |
| Ada göre eşleme | Yüksek | Yalnız UUID `psychology_client_id` |
| `requested_by` form alanı | Yüksek | Ingest’te MMPI bu alanı Psychology HMAC gövdesinden alır |
| SSO code URL | Orta | 60s, tek kullanımlık, hash storage, POST consume, replaceState |
| Auto-provision MMPI PSYCHOLOG | Yüksek | Eşleşmeyen e-posta → 403 |
| Service role frontend | Kritik | Yeni `VITE_` yok; HMAC secret Edge secret |
| Callback duplicate | Orta | Unique + idempotent upsert |
| Cross-origin fetch + CSP | — | Frontend karşı Supabase’e konuşmaz |
| Client silindi | Orta | Ingest/complete 409; kuyruk `cancelled` |
| Uzman yetkisi kaldırıldı | Orta | `active=false` AuthGate + RLS insert keser; yarım draft yerel kalır |
| Replay complete | Düşük | Aynı request_id no-op |
| Hata mesajı sızıntısı | Düşük | Mevcut ValidationError kalıbı |
| COOP/CSP MMPI iframe | — | iframe yok, top-level redirect |

---

## 16. E2E test planı

Mevcut testler regression kapısıdır. Psikoloji: `npm test` (PGlite RLS dahil), `npm run test:e2e`, `npm run build`. MMPI: `npm test` (scoring/OMR 67 suite), `npm run build`. MMPI scoring testleri kırmızıysa entegrasyon başarısız sayılır.

Playwright bugün psikolojide **Supabase’siz** local mode çalışır. Entegrasyon E2E’si iki canlı (veya local) Supabase + iki origin ister.

**TEST 1 — Normal akış**  
Halil login → Ahmet CE oluştur (cloud `clients`) → MMPI İste → `test_administrations.planned` → MMPI kuyruk “Ahmet CE / Talep eden: Halil Karaduman” → uzman açar → mevcut giriş + scoring → record + report → psychology Tamamlandı → Raporu gör (MMPI kayıt URL’si SSO ile).

**TEST 2 — İkinci psikolog**  
Ayşe kendi danışanını görür. Ahmet `client_id` ile `mmpi-request-create` → 403. (Aynı org UI listesi ayrı konu.)

**TEST 3 — SSO**  
Halil psychology’de oturum açık, MMPI’ye geçer, şifre yok. Rol MMPI profilinden. Logout MMPI’yi düşürür; psychology sessionStorage ayrı kalır. Tersi de.

**TEST 4 — Duplicate**  
Aynı danışan için ikinci İste açık kayıt varken unique → tek request.

**TEST 5 — Callback retry**  
Complete ilk sefer 500 simüle; ikinci aynı body → tek `test_results`, status completed.

**TEST 6 — Yetki**  
Pasif uzman kuyruk göremez. Admin psychology admin RPC’leri korunur.

**Hata senaryoları (1–13)** unit/PGlite + birer E2E: network drop (planned kalır), ingest fail + retry, tarayıcı kapanışı (draft, request `in_progress`), expired/reused SSO code, archived client, role change.

**Yeni PGlite testleri (psikoloji):** owner-only request insert, IDOR client_id, audit action, unique open MMPI, complete idempotency.

---

## Önerilen veri akışı

```
Halil (psychology JWT)
  → mmpi-request-create
      → clients (uuid, created_by=Halil)
      → test_administrations planned
      → HMAC request-ingest
          → mmpi_requests pending

Uzman (mmpi JWT)
  → Dashboard Bekleyen kuyruk
  → CaseWorkspace prefill (mevcut scoring)
  → createRecord / idempotency_key   [DEĞİŞMEZ]
  → request-complete
      → mmpi_requests completed + mmpi_record_id
      → HMAC mmpi-complete
          → test_administrations completed
          → test_results özet
```

Source of truth: ham MMPI → MMPI DB. Psychology yalnız pointer + status + özet.

---

## Önerilen migration / uygulama planı (fazlar)

Kod bu fazda yazılmaz. Sonraki fazlar:

| Faz | Kapsam | Repo |
| --- | --- | --- |
| 1 | SSO issue/redeem/consume + identity_links | her ikisi |
| 2 | `cli_*` → `clients` uuid map, owner kontrol | psikolog |
| 3 | test_administrations + mmpi_requests + Dashboard kuyruk | her ikisi |
| 4 | createRecord sonrası complete callback | her ikisi |
| 5 | RLS/HMAC/CORS/audit | her ikisi |
| 6 | ClientDetail Ölçekler + AssessmentHub kartı | psikolog |
| 7 | E2E + mevcut test/build | her ikisi |

Her faz sonunda: değişen dosyalar, yeni dosyalar, migration, RLS, Edge, contract, test, build, güvenlik, kalan risk.

---

## Uygulama öncesi değişiklik listesi

### Bu repo (`psikolog`) — yeni

- `supabase/migrations/20260925*_mmpi_test_definition.sql`
- `supabase/migrations/20260925*_mmpi_administration_constraints.sql`
- `supabase/migrations/20260925*_sso_and_identity.sql`
- `supabase/migrations/20260925*_audit_mmpi_actions.sql`
- `supabase/functions/sso-issue/index.ts`
- `supabase/functions/sso-redeem/index.ts`
- `supabase/functions/mmpi-request-create/index.ts`
- `supabase/functions/mmpi-complete/index.ts`
- `src/clinical/mmpiRequests.ts`
- `src/auth/sso.ts`
- `tests/mmpiIntegrationRls.test.ts`
- `e2e/mmpi-request.spec.ts`

### Bu repo — mevcut dosyada dar UI

- `ClientDetailPage.tsx` (Ölçekler sekmesi)
- `AssessmentHubPage.tsx` (kart)
- `App.tsx` veya `SettingsPage.tsx` (MMPI’ye geç SSO)
- `supabase/config.toml` (yeni function `verify_jwt` bayrakları)
- `.env.example` yalnız yorum: Edge secret isimleri (`SSO_HMAC`, `MMPI_INGEST_URL`) — `VITE_` yok

### Bu repo — dokunulmaz

- Tüm mevcut migration içerikleri
- `src/clinical/*` scoring (BDI/BAI/SCL)
- `retiredInstrumentGuard.test.ts` yasaklı yollar
- `admin-users` davranış sözleşmesi (yalnız allowlist’e MMPI origin eklenmez; SSO kendi fonksiyonunda)

### `Repo123` (ayrı PR)

- Yeni migration `mmpi_requests` + SSO consume
- `sso-consume`, `request-ingest`, `request-complete`
- `Dashboard.tsx` kuyruk veri kaynağı
- `router.ts` `/sso`
- `AuthGate.tsx` sso bypass login
- `CaseWorkspace.tsx` prefill
- `supabaseRecords.ts` kayıt sonrası complete çağrısı
- **`src/scoring/*`, OMR, PDF, immutability trigger imzası: dokunulmaz**

### Tablolar

| Aksiyon | Tablo |
| --- | --- |
| Yeniden kullan | `clients`, `test_administrations`, `test_results`, `test_definitions`, `profiles`, `audit_logs`, `mmpi_records`, `mmpi_reports` |
| Yeni | `sso_authorization_codes`, `identity_links`, `mmpi_requests` |
| Açılmayacak | `psychologist_clients`, ikinci kuyruk, ham madde kopyası, birleşik Auth |

### Secret’lar (Edge, Git yok)

- `SSO_HMAC` (her iki proje, aynı değer)
- `PSYCHOLOGY_REDEEM_URL` / `MMPI_INGEST_URL` / `PSYCHOLOGY_COMPLETE_URL`
- Mevcut `ALLOWED_ORIGINS` her sitede kendi origin’i

---

## Bilinçli non-goals

Yeni CRM, yeni kullanıcı sistemi, bildirim, chat, analytics, mikroservis, ortak DB, MMPI motor rewrite, AuthGate rol enum değişikliği, localStorage klinik verisinin toplu buluta göçü.

---

*PHASE 0 tamam. Uygulama, bu mimarinin onayından sonra PHASE 1 (SSO) ile başlar.*
