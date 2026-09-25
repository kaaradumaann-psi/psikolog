# PHASE 7 / P0-8 — Canlı Supabase doğrulama kiti

Bu kit, PHASE 7'nin **gerçek Supabase** üzerindeki doğrulamasını (AUTH, RLS, klinik zincir,
imza/kilit/revizyon, Storage, çıkış izolasyonu) tek komutla çalıştırır.

> Sonuç etiketleri birbirine karıştırılmaz:
> `LOCAL/PGlite` ≠ `LIVE SUPABASE` ≠ `REAL BROWSER` ≠ `PRODUCTION`.
> Bu kit **LIVE SUPABASE** katmanını ölçer; tarayıcı ve production bundle doğrulaması ayrıdır.

## KOŞU SIRASI (önemli)

1. **Migration'lar** push edilir (§2) → şema canlıya çıkar.
2. **Test kullanıcıları** Dashboard → Authentication → Users'tan oluşturulur (§3).
3. **Seed** çalıştırılır: `seed-live-test-orgs.sql` (§3) → kurum + rol ataması.
4. `verify-migrations.sql` ile şema doğrulanır (§2 sonu).
5. `run.mjs` koşulur (§4).

Sıra atlanırsa tipik belirtiler (ilk canlı koşuda görüldü):

| Belirti | Anlamı | Çözüm |
|---|---|---|
| `kurum ataması → FAIL` (profil `org=YOK`, admin `rol=PSYCHOLOG`) | Seed çalıştırılmadı ya da e-postalar eşleşmedi | §3 (seed) — e-postaları düzeltip tekrar çalıştırın |
| `SEMA` grubunda `missing-object` / `PGRST205` | Canlı şemada PHASE 7 nesneleri yok | §2 (`supabase db push --include-all`) |
| `anon → clients ... → FAIL` + `[object Object]` | **(düzeltildi)** eski koşucu PostgREST hata nesnesini string'e çeviriyordu | Bu sürüm gerçek `HTTP status · code · message · details · hint` yazar |

## 0) Gerekli bilgiler (paylaşılmasına gerek yok)

Bu kit **`service_role` anahtarı gerektirmez**; yalnızca:

| Değişken | Açıklama |
|---|---|
| `VITE_SUPABASE_URL` | Proje URL'i (ör. `https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | anon/publishable anahtar |
| `LIVE_PSY_A_EMAIL` / `LIVE_PSY_A_PASSWORD` | A test psikologu |
| `LIVE_PSY_B_EMAIL` / `LIVE_PSY_B_PASSWORD` | B test psikologu |
| `LIVE_ADMIN_EMAIL` / `LIVE_ADMIN_PASSWORD` | Admin test kullanıcısı |

Değerler **sohbete yazılmaz**; yerel `.env.live` dosyasına veya ortam değişkeni olarak verilir.
`.env.live` `.gitignore` içindedir; repoya girmez.

## 1) Ağ/tarayıcı notu

Bu kit, Supabase'e **erişimi olan herhangi bir makinede** çalışır (geliştirici makinesi, CI).
Kısıtlı egress'e sahip bir sandbox'ta canlı koşu yapılamaz: o durumda `LIVE SUPABASE: BLOCKED`
olarak raporlanır, asla PASS sayılmaz.

## 2) Migration'ları uygula

```bash
# (bir kez) oturum açma — tarayıcıda onaylanır
npx supabase login

# projeyi bağla (DB parolası istenir; parola sohbete yazılmaz)
npx supabase link --project-ref <PROJECT_REF>

# önce hangi migration'ların uygulanacağını/hâlihazırda uygulandığını gör
npx supabase migration list

# PHASE 7 dahil tüm migration'ları uygula (11 dosya; tamamı non-destructive)
npx supabase db push --include-all
```

Uygulanacak PHASE 7 migration'ları (uygulama sırası):

| # | Dosya | Etki | Yıkıcı? |
|---|---|---|---|
| 1 | `20260925100000_phase07_ownership_rls.sql` | `owner_user_id` kolonları, `can_access_client()`, politika yenileme, Storage politikaları | Hayır |
| 2 | `20260925110000_phase07_formulations_safety_plans.sql` | `formulations` + `safety_plans` tabloları, trigger/policy/audit | Hayır |
| 3 | `20260925120000_phase07_session_chain_lock.sql` | `sessions.appointment_id`, imza/kilit/revizyon kolonları, trigger'lar | Hayır |
| 4 | `20260925130000_phase07_anamnesis_fields.sql` | danışan/randevu/anamnez ek alanları + durum akışı | Hayır |

Uygulama sonrası **read-only** nesne + migration geçmişi kontrolü (SQL Editor'da):

```
scripts/live-validation/verify-migrations.sql
```

Çıktının sonundaki `semptom` satırı `PHASE 7 ŞEMASI CANLIDA GÖRÜNÜYOR` demiyorsa
RLS matrisini koşmadan önce `db push` adımını tamamlayın.

## 3) Test kullanıcıları + seed

1. Supabase Dashboard → Authentication → Users: üç kullanıcı oluşturun (A psikolog, B psikolog, admin).
   **Public sign-up kapalı kalmalı**; kullanıcılar Dashboard'dan açılır.
2. `scripts/live-validation/seed-live-test-orgs.sql` dosyasını **SQL Editor'da** çalıştırın
   (alternatif: `psql "$DATABASE_URL" -f scripts/live-validation/seed-live-test-orgs.sql`).
   Düzenlenecek tek yer dosyanın başındaki `live_test_slots` INSERT'idir (üç e-posta).

Bu SQL:

- iki kurum oluşturur (`LIVE-TEST A`, `LIVE-TEST B`) — idempotent, ikinci çalıştırmada ikizlenmez,
- A/B profillerini bu kurumlara bağlar (rol: `PSYCHOLOG`),
- admin profilini `ADMIN` yapar,
- **hiçbir satırı silmez**, `auth.users` ve klinik tablolara dokunmaz,
- eşleşmeyen e-posta varsa **istisna fırlatır** (sessizce geçmez) ve mevcut auth kullanıcılarını listeler,
- sonunda `HAZIR / KURUM ATANMAMIŞ / KULLANICI YOK` satırlarıyla durumu tablo hâlinde yazdırır.

Seed SQL'i gerçek PostgreSQL üzerinde test edilir: `npx tsx --test tests/liveValidationSeed.test.ts`
(4 kontrol: atama, idempotency, sessiz geçmeme, admin eksikliği).

## 4) Doğrulamayı koş

```bash
node scripts/live-validation/run.mjs --selftest  # hata biçimlendirme + sınıflandırma öz-testi (ağ yok)
node scripts/live-validation/run.mjs --dry-run   # yalnız ortam kontrolü (ağ yok)
node scripts/live-validation/run.mjs             # tam canlı koşu
```

Koşucunun ürettiği kanıt: `live-validation-result.json` (yalnız durum/kimlik bilgisi ve
gerçek HTTP/kod alanları; sır yok).

### RLS doğrulaması `DENY` nasıl kanıtlanır?

- RLS satırı **filtrelediğinde** PostgREST `HTTP 200` + **0 satır** döner → `DENY` (0 satır kanıtı).
- Politika **hata** ürettiğinde PostgREST `HTTP 403/401` + `code=42501` döner → `DENY` (kod kanıtı).
- Beklenen DENY durumunda veri görünür/etkilenirse → `FAIL` + `RLS SIZINTISI` uyarısı.
- `missing-object` (örn. `code=PGRST205`, `42P01`) → `FAIL` + "canlı şemada nesne yok" yorumu;
  bu bir RLS sonucu değildir, **migration/şema** sorunudur.
- Beklenen PASS reddedilirse → `FAIL` (gerçek kod ile) — PGlite PASS'ı canlı PASS yerine geçmez.

### Kapsam

- **AUTH:** A, B, admin girişi + anon (oturumsuz).
- **RLS:** A→A SELECT/INSERT/UPDATE/DELETE; A→B ve B→A DENY; admin yetkili kapsam PASS;
  anon DENY (tablo SELECT/INSERT + geçici satır üzerinde SELECT/UPDATE/DELETE — geçici satır
  yalnız bu ölçüm için oluşturulur ve silinir, ana test zincirine dokunulmaz).
- **SEMA:** canlı şemada `clients.owner_user_id`, `sessions.appointment_id/status/locked_at`,
  `appointments.fee`, `formulations`, `safety_plans`, `reports.locked_at`, `anamneses`,
  `documents.file_path` ve `client-documents` bucket varlığı (salt-okur ön kontrol).
- **CLINICAL DATA:** Client → Appointment → Session → Note → Anamnesis → Formulation → Safety Plan →
  Test Result → Report sentetik zinciri; `session.appointment_id` bağı.
- **PERSISTENCE:** istemci önbelleği sıfırlanmış gibi yeni oturumla tüm zincirin sunucudan okunması
  (**not:** bu bir tarayıcı/localStorage testi değildir).
- **SIGN/LOCK:** DRAFT update PASS → SIGN PASS → LOCK PASS → locked UPDATE/DELETE DENY →
  amendment/revision PASS + eski sürümün `superseded_by` işaretlenmesi.
- **STORAGE:** A upload/read PASS; B read/update/delete A DENY; A temizlik.
- **LOGOUT:** A çıkış → B girişinde A verisi görünmez → A yeniden girişte veri geri gelir.
- **CLEANUP:** sentetik zincir A tarafından silinir (cascade).

### Kapsam dışı (ayrı raporlanır)

- **REAL BROWSER:** Playwright/Chromium koşusu gerekir (`npm run test:e2e`).
- **PRODUCTION:** production bundle + dağıtım ortamı doğrulaması gerekir.

## 5) Hata raporlama (P0-8 teşhis düzeltmesi)

`supabase-js`, başarısız HTTP yanıtında `error` alanına PostgREST gövdesini **düz nesne**
olarak koyar (`{ code, message, details, hint }`); HTTP kodu ise yanıtın `status`/`statusText`
alanındadır. Bu yüzden `String(error)` / `${error}` kullanmak **`[object Object]`** üretir ve
gerçek hata kodu kaybolur (ilk canlı koşuda `anon` kontrolleri bu nedenle teşhis edilemedi).

Bu sürüm:

- hatayı `DbError` ile sarar ve `HTTP <status> · code=… · message="…" · details=… · hint=…`
  biçiminde yazar,
- hatayı sınıflandırır: `rls-deny` / `missing-object` / `auth` / `network` / `other`,
- JSON çıktısına `httpStatus`, `code`, `kind` alanlarını ekler,
- koşu sonunda `--- FAIL nedenleri (gerçek HTTP durumu / PostgREST kodu) ---` özetini basar,
- anahtar/JWT benzeri dizeleri **ayıklayarak** yazar (`[gizlendi]`).

Ağ olmadan doğrulanabilir: `node scripts/live-validation/run.mjs --selftest` (8/8 sınıflandırma kontrolü).
