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

Sıra atlanırsa tipik belirtiler (canlı koşularda görüldü):

| Belirti | Anlamı | Çözüm |
|---|---|---|
| `kurum ataması → FAIL` (profil `org=YOK`, admin `rol=PSYCHOLOG`) | Seed çalıştırılmadı ya da e-postalar eşleşmedi | §3 — **`node scripts/live-validation/emit-seed.mjs`** ile SQL üretip SQL Editor'da çalıştırın |
| `SEMA` grubunda `missing-object` / `PGRST205` | Canlı şemada PHASE 7 nesneleri yok | §2 (`supabase db push --include-all`) |
| `anon → clients ... → FAIL` + `[object Object]` | **(düzeltildi)** eski koşucu PostgREST hata nesnesini string'e çeviriyordu | Bu sürüm gerçek `HTTP status · code · message · details · hint` yazar |
| `anon → clients ... → DENY` + `code=42501` (HTTP 401) | **Beklenen**: `anon` rolünün `public.*` tablolarında hiç yetkisi yok (GRANT katmanı reddi) | Yok — bu bir kanıttır |
| `locked UPDATE/DELETE → DENY` + `HTTP 400 · code=P0001` | **Beklenen**: imza/kilit trigger'ı kaydı değiştirmiyor/silmiyor | Yok — bu bir kanıttır |
| `B read A → DENY` + `code=NoSuchKey` | **Beklenen**: Storage nesnesi sahibi olmayana görünmüyor | Yok — bu bir kanıttır |
| `CLEANUP → FAIL` (42501, hint `TO anon`) | Koşucu hatası: silme, oturum kapandıktan sonra denenmişti (düzeltildi) | Koşuyu güncel commit ile tekrarlayın |
| `CLEANUP` grubunda `DENY` + `SKIP` | **Beklenen**: zincirde kilitli (LOCKED) klinik kayıt var; DB trigger'ı danışan silinmesini (cascade dahil) engelliyor | İsteğe bağlı: `cleanup-live-test-data.sql` §3 (arşivle) veya §4 (tam silme, uyarılı) |
| **REAL BROWSER:** kayıt detayda görünüyor, listede 30 sn sonra YOK (`element(s) not found`) | **(düzeltildi, koşu #2)** bulut aktivasyonu tamamlanmadan yapılan yazım kuyruğa alınmıyordu ve hidrasyon yerel önbelleği sunucu anlık görüntüsüyle değiştiriyordu → sessiz veri kaybı | Güncel commit ile koşun: uygulama artık `[data-cloud-gate="loading"]` kapısı kalkmadan klinik içerik göstermez; yazım hiçbir durumda düşürülmez |
| **REAL BROWSER:** `strict mode violation: getByRole('button', …) resolved to N elements` | **(düzeltildi, koşu #3)** satırda aynı adı taşıyan 3 düğme var (ad + düzenle/sil `aria-label`) | Güncel spec: satır `ownRow` (benzersiz protokol no), ad `nameButton` (`exact: true`) |
| **REAL BROWSER:** `kayıt sunucuya yazılmadı (POST /rest/v1/clients → 2xx yok)` | Yerel önbellekte görünmek yetmez: kayıt Supabase'e yazılmadı | Test çıktısındaki anotasyonlara bakın: `bulut kaydı` (POST durumu + gövde), `senkronizasyon şeridi`, `yerel depo` (kapsamlı/kapsamsız anahtar), `başarısız istekler` |
| **REAL BROWSER (çevrimdışı suite):** `Bugünün tahtası` / `Danışan Dosyaları` / `Psikolojik Değerlendirme Araçları` bulunamıyor | **Mod uyuşmazlığı**: `e2e/critical.spec.ts` çevrimdışı (yerel) mod sözleşmesidir; Supabase env verildiğinde uygulama bulut modunda **giriş kapısı** gösterir (uygulama hatası değil) | Env'siz koşun: `npm run test:e2e:local`. Güncel suite bu durumda SKIP eder (gerekçesiyle) |

### Koşucunun kendi yapamadığı tek şey: kurum ataması

`kurum ataması → FAIL` mesajını görürseniz bu bir hata değil, **tasarımın sonucudur**:

- `profiles_insert_self` politikası INSERT için `organization_id is null` şartı arar,
- `authenticated` rolünün `public.profiles` üzerinde `update` yetkisi yoktur.

Bu yüzden kurum/rol ataması **yönetici bağlamında** (SQL Editor) yapılır; koşucu bunu kendi başına
yapamaz ve yapmamalıdır. Koşu bu kapıda durur ve yalnız AUTH + SEMA + anon kontrollerini raporlar.

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
2. Seed'i **SQL Editor'da** çalıştırın (alternatif: `psql "$DATABASE_URL" -f …`).

   **Kolay yol — e-postaları elle düzenlemeden (önerilen):**

   ```bash
   node scripts/live-validation/run.mjs        # kurum ataması yoksa live-seed.local.sql ÜRETİR
   # (isteğe bağlı, ayrı komut) node scripts/live-validation/emit-seed.mjs
   # → dosya içeriğini Supabase Dashboard → SQL Editor'a yapıştırıp çalıştırın
   ```

   Üretilen dosyada e-postalar **koşunun giriş yaptığı gerçek hesaplardan** gelir; parola okunmaz/yazılmaz
   ve ekranda e-postalar maskelenir. Dosya `.gitignore` içindedir (`live-seed.local.sql`).

   **Tanı (salt-okur):** SQL Editor'da `verify-migrations.sql` §13, her auth kullanıcısı için
   `profil_var / rol / kurum / durum` tablosunu ve tanımlı kurumları listeler — seed'in neden
   çalışmadığını buradan görürsünüz.

   **Elle yol:** `scripts/live-validation/seed-live-test-orgs.sql` içindeki üç e-posta sabitini
   (`email_a`, `email_b`, `email_admin`) kendi test kullanıcılarınızla değiştirin.

Bu SQL:

- iki kurum oluşturur (`LIVE-TEST A`, `LIVE-TEST B`) — idempotent, ikinci çalıştırmada ikizlenmez,
- A/B profillerini bu kurumlara bağlar (rol: `PSYCHOLOG`),
- admin profilini `ADMIN` yapar,
- **hiçbir satırı silmez**, `auth.users` ve klinik tablolara dokunmaz,
- eşleşmeyen e-posta varsa **istisna fırlatır** (sessizce geçmez) ve mevcut auth kullanıcılarını listeler,
- sonunda `HAZIR / KURUM ATANMAMIŞ / KULLANICI YOK` satırlarıyla durumu tablo hâlinde yazdırır.

Seed ve emit-seed davranışı gerçek PostgreSQL üzerinde test edilir:
`npx tsx --test tests/liveValidationSeed.test.ts` — **7 kontrol**: kurum/rol ataması, idempotency,
sessiz geçmeme (`EŞLEŞME YOK` istisnası), admin eksikliği, placeholder doldurma, e-posta doldurma +
parola yazmama, eksik ortam değişkeninde çıkış kodu 2.

Seed SQL'i tek `do $$` bloğudur (geçici tablo yok) ve sonunda **atamanın gerçekten yapıldığını
kendisi doğrular**: kurum atanamazsa `SEED TAMAM` bildirimi yerine istisna görürsünüz.

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
- **CLEANUP:** silme **oturum açıkken** denenir (çıkıştan sonra istek `anon` rolüne düşer → 42501).
  - Zincirde kilitli kayıt **yoksa** → silinir ve `Sentetik zincir gerçekten silindi` **PASS**.
  - Kilitli kayıt **varsa** → `Kilitli klinik kayıt danışan silinmesini engelledi` **DENY**
    (`HTTP 400 · P0001`) + `Kilitli kayıt hâlâ yerinde` **PASS** + `Sentetik zincir temizliği`
    **SKIP**. Bu, imza/kilit tasarımının istenen sonucudur: kilitli klinik kayıt cascade ile
    bile silinemez.

> Koşu #4'ten (#4, #5) sonra sentetik zincirlerin bir kısmı bu nedenle **canlıda kalır**.
> Bu yüzden `CLEANUP` FAIL değil `DENY + SKIP` raporlar; güvenlik kontrolü değil, bakım adımıdır.

### Artık veri (opsiyonel)

`scripts/live-validation/cleanup-live-test-data.sql` (SQL Editor):

1. **§1–2 önizleme** (kilitli kayıt sayısı dahil), 2. **§3 arşivle** (önerilen; klinik kayıtlar korunur),
   3. **§4 tam silme** (uyarılı: kilit trigger'ları yalnız işlem süresince kapatılır, hedef yalnız
   `file_number LIKE 'LIVE-%'` satırları, sonunda trigger'lar yeniden açılır), 4. **§5 doğrulama**
   (trigger'lar `O` = açık mı?).

### Kapsam dışı (ayrı raporlanır)

- **REAL BROWSER:** gerçek Chromium koşusu gerekir. Bu kit için hazır spec:
  `e2e/live-multi-user.spec.ts` — **koşu #4 ile PASS** (13,5 sn: `POST /rest/v1/clients → 201`,
  `localStorage.clear()` + yenileme sonrası kayıt sunucudan geri geldi, B göremedi, A yeniden gördü,
  arayüzden silindi). Akış: A ekler → **kaydın sunucuya yazıldığı `POST → 2xx` ve yanıt gövdesindeki
  dosya numarası ile doğrulanır** →
  yerel depo temizlenir + sayfa yenilir → kayıt yine görünür → çıkış → B göremez → A yeniden görür →
  arayüzden siler. Uygulama, sunucu anlık görüntüsü yüklenene kadar klinik içerik göstermez
  (`[data-cloud-gate="loading"]`); spec bu kapının kalkmasını bekler.

  ```bash
  npx playwright install chromium
  VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… \
  LIVE_PSY_A_EMAIL=… LIVE_PSY_A_PASSWORD=… LIVE_PSY_B_EMAIL=… LIVE_PSY_B_PASSWORD=… \
  npx playwright test e2e/live-multi-user.spec.ts --project=chromium
  ```
- **PRODUCTION:** production bundle + dağıtım ortamı doğrulaması gerekir. **Yalnız canlı spec koşulur**
  (spec yolu zorunlu):

  ```bash
  VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… npm run build
  npm run preview
  E2E_BASE_URL=http://localhost:4173 \
  VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… \
  LIVE_PSY_A_EMAIL=… LIVE_PSY_A_PASSWORD=… LIVE_PSY_B_EMAIL=… LIVE_PSY_B_PASSWORD=… \
  npx playwright test e2e/live-multi-user.spec.ts --project=chromium
  ```

  > ⚠️ `npx playwright test --project=chromium` (spec yolu olmadan) **iki katmanı karıştırır**:
  > `e2e/critical.spec.ts` çevrimdışı mod için yazılmıştır ve Supabase env'i verilmiş bir koşuda
  > uygulama giriş kapısı gösterdiği için düşer (gerçek tarayıcı koşusu #5). Katman komutları:
  > `npm run test:e2e:local` (env'siz) · `npm run test:e2e:live` (env + kimlikler).

  `E2E_BASE_URL` verildiğinde dev sunucusu başlatılmaz; testler doğrudan o adrese koşar.
  Statik kaynak incelemesi PRODUCTION PASS yerine geçmez.

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

Sınıflandırma kümeleri: `grant-deny` (42501 / GRANT katmanı), `rls-deny` (politika reddi),
`lock-deny` (kilit trigger'ı: `P0001` + "değiştirilemez/silinemez"), `not-found-deny`
(storage `NoSuchKey`), `missing-object` (şema), `auth`, `network`, `trigger-error`, `other`.
DENY bekleyen kontroller için ilk dördü **kanıt** sayılır; `missing-object`/`auth`/`network` FAIL'dir.

Ağ olmadan doğrulanabilir: `node scripts/live-validation/run.mjs --selftest`
(**13/13** sınıflandırma + **5/5** CLEANUP rapor planı; canlı koşularda görülen birebir
payload'larla — `P0001` kilit mesajları, `NoSuchKey` — ilgisiz bir `P0001`'in FAIL kalması ve
kilitli kayıt senaryosunun `DENY + PASS + SKIP` üretmesi kontrolleri).
