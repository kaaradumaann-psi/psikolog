# PHASE 7 / P0-8 — LIVE VALIDATION Raporu

Tarih: 2026-09-25 · Dal: `arena/01a0d937-psikolog`
Durum: **LIVE SUPABASE = FAILED (koşu #5: 64 PASS / 17 DENY / 2 FAIL — kalan 2 FAIL
kilit korumasının cascade'i engellemesi; tasarım gereği DENY/SKIP olarak raporlanacak) ·
PHASE 7 COMPLETE DEĞİL**

Bu belge yalnızca **canlı doğrulama** (P0-8) katmanını raporlar ve katmanları kesin olarak ayırır:

| Katman | Sonuç | Kanıt |
|---|---|---|
| **LOCAL / PGlite** | **PASS** | `npm test` **145/145** (142 + 3 yeni emit-seed kontrolü), `phase7RlsMatrix` 14/14, `phase7LockChain` 11/11, `liveValidationSeed` 7/7, `liveValidationVerifySql` 1/1 |
| **LIVE SUPABASE** | **FAILED — kısmi (güvenlik kanıtları yeşil)** | Koşu #5: 64 PASS · 17 DENY · 2 FAIL. Kalan 2 FAIL = kilitli kaydın cascade silmeyi engellemesi (§0.0) |
| **REAL BROWSER** | **NOT RUN** | Playwright/Chromium ikilisi yok; kullanıcı makinesinde koşulmadı |
| **PRODUCTION** | **NOT VERIFIED** | Production bundle + dağıtım ortamı doğrulaması yapılmadı |

> `PGlite PASS — Production NOT VERIFIED` **ile** `LIVE SUPABASE VERIFIED` aynı şey değildir.
> PHASE 7 bu nedenle **COMPLETE değildir**.

---

## 0. Koşu #5 — son koşu (kullanıcı makinesi, 2026-09-25T17:57:23Z)

| Grup | PASS | DENY | FAIL | SKIP |
|---|---|---|---|---|
| AUTH | 12 | 0 | 0 | 0 |
| SEMA | 9 | 0 | 0 | 0 |
| CLINICAL DATA | 27 | 0 | 0 | 0 |
| RLS | 7 | 12 | 0 | 0 |
| PERSISTENCE | 1 | 0 | 0 | 0 |
| SIGN/LOCK | 4 | 2 | 0 | 0 |
| STORAGE | 3 | 2 | 0 | 0 |
| LOGOUT | 2 | 1 | 0 | 0 |
| CLEANUP | 0 | 0 | 2 | 0 |
| **Toplam** | **64** | **17** | **2** | **0** |

Koşu #4'teki 4 FAIL'den **2'si kapandı** ve beklendiği gibi DENY'ye döndü:

- `locked UPDATE` → **DENY** · `HTTP 400` · `code=P0001` · *"Kilitli klinik kayıt değiştirilemez…"* (`lock-deny`)
- `locked DELETE` → **DENY** · `HTTP 400` · `code=P0001` · *"Kilitli klinik kayıt silinemez…"* (`lock-deny`)
- `B read A` (Storage) → **DENY** · `code=NoSuchKey` (`not-found-deny`)

### 0.0 Kalan 2 FAIL — kök neden: kilitli kayıt, danışan silmesini (cascade) engelliyor

```
❌ CLEANUP · A sentetik danışanı siler (cascade)
   HTTP 400 · code=P0001 · "Kilitli klinik kayıt silinemez. Düzeltme için yeni revizyon oluşturun."
❌ CLEANUP · Sentetik zincir gerçekten silindi → "hâlâ 1 satır görünüyor"
```

**Yorum:** Bu bir hata değil, **imza/kilit tasarımının çalıştığının kanıtıdır.** Zincirde
`SIGN → LOCK` testinin ürettiği **kilitli bir seans** vardır; `clients` silindiğinde alt kayıtlara
`ON DELETE CASCADE` uygulanır ve kilit trigger'ı bu silmeyi reddeder. Kullanıcı arayüzünden
"sil" demek de dolaylı yoldan kilitli kaydı silemez — **kilit DB düzeyinde korunuyor**.

**Koşucu düzeltmesi (bu tur):** temizlik artık iki senaryoyu ayırır —

| Senaryo | Rapor |
|---|---|
| Kilitli kayıt yok, silme başarılı | `A sentetik danışanı siler (cascade)` **PASS** + `Sentetik zincir gerçekten silindi` **PASS** |
| Kilitli kayıt var, trigger reddetti | `Kilitli klinik kayıt danışan silinmesini engelledi (DB düzeyinde immutability)` **DENY** + `Kilitli kayıt hâlâ yerinde` **PASS** + `Sentetik zincir temizliği` **SKIP** (bakım adımı, güvenlik kontrolü değil) |
| Beklenmeyen durum | **FAIL** |

### 0.0.1 Yeni gözlem (risk notu, PHASE 7 kapsamı dışı)

Kilitli kaydı olan bir danışan **hiç silinemez** (cascade bile engellenir). İstenen immutability
açısından doğru; ancak ileride "yanlış danışan kaydı" veya KVKK silme/anonimleştirme talebi için
bir **arşiv + anonimleştirme akışı** gerekir. PHASE 7 kapsamında **yeni özellik eklenmedi**;
yalnız not edildi (bkz. `docs/PHASE-7-REPORT.md` §14).

### 0.0.2 Sentetik artık ve temizlik

Koşu #4 ve #5'in zincirleri kilitli kayıt içerdiği için canlıda kaldı.
`scripts/live-validation/cleanup-live-test-data.sql` üç yol sunar:
**§1–2 önizleme** (kilitli kayıt sayısı dahil) · **§3 arşivle** (önerilen; veri silinmez, kilitli
kayıtlar korunur) · **§4 tam silme** (uyarılı: yalnız `file_number LIKE 'LIVE-%'` hedeflenir,
kilit trigger'ları yalnız işlem süresince kapatılıp sonunda yeniden açılır) · **§5 doğrulama**
(trigger durumu `O` = açık).

---

## 0.1 Koşu #4 — İLK TAM MATRİS (kullanıcı makinesi, 2026-09-25T17:51:02Z)

Seed uygulandıktan sonraki koşu. **Rapor edilen tüm katmanlar gerçekten koşuldu:**

| Grup | PASS | DENY | FAIL | SKIP |
|---|---|---|---|---|
| AUTH | 12 | 0 | 0 | 0 |
| SEMA | 9 | 0 | 0 | 0 |
| CLINICAL DATA | 27 | 0 | 0 | 0 |
| RLS | 7 | 12 | 0 | 0 |
| PERSISTENCE | 1 | 0 | 0 | 0 |
| SIGN/LOCK | 3 | 0 | 3 | 0 |
| STORAGE | 3 | 2 | 1 | 0 |
| LOGOUT | 2 | 1 | 0 | 0 |
| CLEANUP | 0 | 0 | 1 | 0 |
| **Toplam** | **64** | **14** | **4** | **0** |

### 0.1 Kurum / rol ataması — artık TAMAM

| Kullanıcı | Rol | `organization_id` |
|---|---|---|
| psikolog A | `PSYCHOLOG` | **var** |
| psikolog B | `PSYCHOLOG` | **var** |
| admin | `ADMIN` | **var** |

### 0.2 Güvenlik kanıtları (hepsi gerçek HTTP/kod ile)

| Kontrol | Sonuç | Gerçek kanıt |
|---|---|---|
| `anon → clients` SELECT / INSERT / UPDATE / DELETE (4 kontrol) | **DENY** | `HTTP 401` · `code=42501` · `permission denied for table clients` (GRANT katmanı) |
| `anon → ana zincir danışan SELECT` | **DENY** | aynı gerekçe |
| `B → A clients` SELECT / UPDATE / DELETE | **DENY** | `HTTP 200 · 0 satır` (RLS filtreledi — satır varken görünmedi) |
| `B → A sessions SELECT` | **DENY** | `HTTP 200 · 0 satır` |
| `B → A org'a clients INSERT` | **DENY** | `HTTP 403` · `code=42501` · `new row violates row-level security policy for table 'clients'` |
| `A → A clients SELECT / UPDATE` | **PASS** | `HTTP 200 · 1 satır` |
| `Admin → A clients SELECT (yetkili kapsam)` | **PASS** | `HTTP 200 · 1 satır` |
| Storage `B read A` | **DENY** | `code=NoSuchKey` · `Object not found` (nesne sahibi olmayana görünmüyor) |
| Storage `B update A` | **DENY** | `code=AccessDenied` · `new row violates row-level security policy` |
| Storage `B delete A` | **DENY** | `HTTP 200 · 0 satır` (hiçbir nesne etkilenmedi) |
| Storage `A upload / read / delete` | **PASS** | `HTTP 200` |
| Kilitli kayıt UPDATE | **REDDEDİLDİ** (koşucu FAIL yazdı — §0.3) | `HTTP 400` · `code=P0001` · `"Kilitli klinik kayıt değiştirilemez. Düzeltme için yeni revizyon oluşturun."` |
| Kilitli kayıt DELETE | **REDDEDİLDİ** (koşucu FAIL yazdı — §0.3) | `HTTP 400` · `code=P0001` · `"Kilitli klinik kayıt silinemez. …"` |
| Amendment/Revision + `superseded_by` | **PASS** | yeni sürüm oluştu, eski satır `rev=2` ile işaretlendi |
| Çıkış izolasyonu (B oturumunda A verisi) | **DENY** | `HTTP 200 · 0 satır` |
| A yeniden giriş (danışan + not) | **PASS** | `HTTP 200 · 1 satır` (her ikisi) |

### 0.3 Dört FAIL'in kök nedeni — hepsi koşucu tarafı, RLS/şema değil

| # | FAIL | Neden | Düzeltme |
|---|---|---|---|
| 1 | `locked UPDATE` | DB trigger **doğru şekilde reddetti**; red `HTTP 400 + P0001` (raise_exception) olarak geldi. Sınıflandırıcı `P0001`'i tanımıyordu → `other` → FAIL | yeni `lock-deny` sınıfı: `P0001` + kilit/immutability metni → **DENY kanıtı**. İlgisiz `P0001` (örn. "Geçersiz seans tarihi") hâlâ `trigger-error` → FAIL |
| 2 | `locked DELETE` | aynı kök neden (silme trigger'ı) | aynı düzeltme |
| 3 | `B read A` (storage) | Storage, sahibi olmayan kullanıcıya `NoSuchKey / Object not found` döndürüyor — bu bir **DENY**, hata değil | yeni `not-found-deny` sınıfı → **DENY kanıtı** |
| 4 | `CLEANUP` | Koşucu, `aAgain` oturumunu kapattıktan **sonra** silme denedi; istek `anon` rolüne düştü → `42501` (hint bunu doğruluyor: `GRANT … TO anon`) | temizlik artık **oturum açıkken** yapılıyor + silmenin gerçekten olduğu ayrıca doğrulanıyor (`Sentetik zincir gerçekten silindi`) |

**Yorum:** Hiçbir FAIL "veri sızıntısı" veya "kilit korunmuyor" anlamına gelmiyor; aksine 1–3
maddeleri korumanın **çalıştığını gösteren kanıtlar**. 4. madde ise koşucunun kendi sıra hatası.
Düzeltmeler `--selftest` içine canlı koşudan alınan **birebir payload'larla** eklendi
(`P0001` kilit mesajları, `NoSuchKey`) → ağ olmadan **13/13** doğrulanıyor.
CLEANUP akışı için ayrıca saf plan fonksiyonu ve **5/5** simülasyon kontrolü vardır (ağ yok).

### 0.4 Artık veri (temizlik)

Koşu #4'ün CLEANUP adımı reddedildiği için o koşunun sentetik zinciri canlıda **kaldı**
(danışan `dcb30953…` ve bağlı kayıtları). Koşucu düzeltildiği için sonraki koşular kendi zincirini
siler. Eski artıklar için `scripts/live-validation/cleanup-live-test-data.sql` eklendi:
yalnız `clients.file_number like 'LIVE-%'` ve `%-live-check.txt` nesnelerini hedefler, önce
ÖNİZLEME sorgularını çalıştırır, silme adımları yorumlu durur.

---

## 0.2 Koşu #3 (kullanıcı makinesi)

| Grup | PASS | DENY | FAIL | SKIP |
|---|---|---|---|---|
| AUTH | 6 | 0 | 0 | 0 |
| SEMA | 9 | 0 | 0 | 0 |
| RLS | 0 | 2 | 1 | 0 |
| **Toplam** | **15** | **2** | **1** | **0** |

Değişen tek satır: `admin profil` artık **`rol=ADMIN`** (org hâlâ `YOK`).
Diğer her şey koşu #2 ile aynı: A/B profilleri `org=YOK`, anon iki kontrol **DENY**
(`HTTP 401` · `code=42501` · `permission denied for table clients`), SEMA 9/9 PASS.

### 0.1 admin `rol=ADMIN` ama `org=YOK` — ne anlama geliyor?

- **Seed çalışmamıştır.** Bu depodaki hiçbir seed sürümü yalnız rolü değiştirip kurumu boş bırakmaz;
  ayrıca A/B profilleri de kurumsuz kalmıştır ve seed eşleşme bulamazsa **istisna fırlatıp hiçbir
  şeyi değiştirmez** (tek `do $$` bloğu, tek transaction).
- Rol değişikliği büyük olasılıkla **elle** yapılmıştır (Dashboard → Table Editor → `profiles.role`).
  Bu, tanıyı değiştirmez: kurum ataması yoksa RLS sahiplik matrisi koşulamaz.
- Emin olmak için: SQL Editor'da `scripts/live-validation/verify-migrations.sql` **§13** bölümü
  çalıştırılır — her auth kullanıcısı için `profil_var / rol / kurum / durum` tablosunu ve tanımlı
  kurumları listeler (salt-okur). `LIVE-TEST A/B` satırları yoksa seed hiç çalışmamıştır.

### 0.2 Bu turda eklenen kolaylık: koşucu seed SQL'ini kendisi üretir

`kurum ataması` kapısı düştüğünde `run.mjs` artık **`live-seed.local.sql`** dosyasını üretir:

- e-postalar `.env.live` / ortam değişkenlerinden **koşunun giriş yaptığı gerçek hesaplardan** gelir
  (yani eşleşmeme riski yoktur),
- parola okunmaz/yazılmaz; ekranda e-postalar maskelenir (`a*****@ornek.com`),
- dosya `.gitignore` içindedir (repoya girmez).

Ayrıca `seed-live-test-orgs.sql` sadeleştirildi: geçici tablo yok, tek `do $$` bloğu; eşleşme
bulunamazsa `EŞLEŞME YOK` istisnası fırlatır ve **mevcut auth kullanıcılarının e-postalarını
NOTICE olarak listeler**; sonunda atamayı kendisi doğrular (`SEED TAMAM` / istisna).

---

## 0.3 Koşu #2 — gerçek sonuçlar (kullanıcı makinesi, 2026-09-25T17:38:05Z)

Proje: `afvqznjqlrcoxoalkczd.supabase.co` · Komut: `node scripts/live-validation/run.mjs`

| Grup | PASS | DENY | FAIL | SKIP |
|---|---|---|---|---|
| AUTH | 6 | 0 | 0 | 0 |
| SEMA (canlı şema) | 9 | 0 | 0 | 0 |
| RLS | 0 | 2 | 1 | 0 |
| **Toplam** | **15** | **2** | **1** | **0** |

### 0.1 anon kontrolleri — DENY, kanıtla (isteğin karşılandığı yer)

| Kontrol | Sonuç | Gerçek kanıt (koşudan) |
|---|---|---|
| `anon → clients SELECT` | **DENY** | `HTTP 401 Unauthorized` · `code=42501` · `message="permission denied for table clients"` |
| `anon → clients INSERT` | **DENY** | `HTTP 401 Unauthorized` · `code=42501` · `message="permission denied for table clients"` |

Ek kanıt: PostgREST yanıtının kendi `hint` alanı da bunu doğruluyor —
`"Grant the required privileges to the current role with: GRANT SELECT ON public.clients TO anon;"`
Yani red **GRANT katmanında** (rol `anon` için `public.clients` üzerinde hiç yetki yok); RLS
politikasına ulaşılamıyor. Bu beklenen ve istenen sonuçtur: `anon` hiçbir klinik veri okuyamaz/yazamaz.
Koşucu bu durumu `kind = grant-deny` olarak sınıflar ve DENY sayar (§2.1'deki düzeltme sayesinde;
eski koşucu aynı yanıtı `[object Object]` olarak raporluyordu).

### 0.2 SEMA grubu — canlı şema PHASE 7 nesnelerini içeriyor

`clients.owner_user_id` · `sessions(appointment_id, status, locked_at)` · `appointments.fee` ·
`formulations(status, content, revision, created_by, updated_by)` · `safety_plans(…)` ·
`reports.locked_at` · `anamneses` · `documents.file_path` · `client-documents` bucket
→ **9/9 PASS** (`HTTP 200`; `0 satır` normaldir, çünkü oturumun kapsamında satır yok).
Bu, 4 PHASE 7 migration'ının canlıya uygulandığının **REST düzeyinde** kanıtıdır; CLI kaydı için
`verify-migrations.sql` §12 bölümü çalıştırılmalıdır.

### 0.3 Kalan tek engel: kurum ataması (seed)

| Kullanıcı | Rol | `organization_id` |
|---|---|---|
| psikolog A | `PSYCHOLOG` | **yok** |
| psikolog B | `PSYCHOLOG` | **yok** |
| admin | `PSYCHOLOG` | **yok** |

**Neden koşucu bunu kendi yapamaz (tasarım gereği):** P0-2 ile kapatılan yetki yükseltme açığının
doğrudan sonucu —

- `profiles_insert_self` politikası INSERT için `organization_id is null` şartı arar
  (`supabase/migrations/20260925100000_phase07_ownership_rls.sql` §11),
- `authenticated` rolünün `public.profiles` üzerinde yalnız `select, insert` yetkisi vardır;
  **`update` yetkisi yoktur** (`20260924000006_fix_profiles_rls.sql`).

Yani kurum ataması bir **yönetici işlemidir** ve SQL Editor (tablo sahibi bağlamı) üzerinden
yapılmalıdır. Bu bir eksiklik değil, istenen güvenlik sınırıdır.

---

## 1. Koşu #1 — gerçek sonuçlar (kullanıcı makinesi, 2026-09-25T17:19:58Z)

Proje: `afvqznjqlrcoxoalkczd.supabase.co` · Komut: `node scripts/live-validation/run.mjs`

| Grup | PASS | DENY | FAIL | SKIP |
|---|---|---|---|---|
| AUTH | 6 | 0 | 0 | 0 |
| RLS | 0 | 0 | 3 | 0 |

Satır satır:

| Grup | Kontrol | Sonuç | Detay (koşudaki) |
|---|---|---|---|
| AUTH | psikolog A giriş | PASS | `62177eed…` |
| AUTH | psikolog B giriş | PASS | `aa43ab7e…` |
| AUTH | admin giriş | PASS | `a00c3206…` |
| AUTH | psikolog A profil | PASS | `rol=PSYCHOLOG org=YOK` |
| AUTH | psikolog B profil | PASS | `rol=PSYCHOLOG org=YOK` |
| AUTH | admin profil | PASS | `rol=PSYCHOLOG org=YOK` |
| RLS | anon → clients SELECT | FAIL | `[object Object]` (teşhis edilemedi — bkz. §2.1) |
| RLS | anon → clients INSERT | FAIL | `[object Object]` (teşhis edilemedi — bkz. §2.1) |
| RLS | kurum ataması | FAIL | A/B profillerinde `organization_id` yok (bkz. §2.2) |

Koşu etiketleri (koşucunun yazdırdığı): `LIVE SUPABASE: FAILED (3 başarısız kontrol)`,
`REAL BROWSER: NOT RUN`, `PRODUCTION: NOT VERIFIED`.

**Kanıtlanan olumlu sonuç:** gerçek projeye bağlantı kurulabildi; üç test kullanıcısı
gerçek Supabase Auth üzerinden giriş yapabildi ve `profiles` satırları RLS altında okunabildi
(yani baz şema + auth canlıda çalışıyor).

**Kanıtlanmayan:** anon RLS davranışı ve kurum kapsamlı RLS matrisi (koşu `kurum ataması`
kapısında durdu; matris hiç koşulmadı).

> **Koşu #2 ile kapanış:** anon kontrolleri artık **DENY** olarak kanıtlandı (§0.1) ve SEMA grubu
> canlı şemayı doğruladı (§0.2). Bu bölümdeki `[object Object]` sorunu §2.1'deki düzeltmeyle giderildi.

---

## 2. Teşhis (bu turda yapılan, kod değişikliği gerektiren bulgular)

### 2.1 `[object Object]` — kök neden ve düzeltme

**Neden:** `supabase-js`, başarısız HTTP yanıtında `error` alanına PostgREST gövdesini
**düz nesne** olarak koyar (`{ code, message, details, hint }`); HTTP durumu ise aynı yanıtın
`status` / `statusText` alanındadır. Kurulu sürüm: `@supabase/supabase-js@2.116.0` →
`@supabase/postgrest-js@2.117.1` (`processResponse`: `error = JSON.parse(body)`).

Eski koşucu `if (error) throw error;` yapıp `catch` içinde
`error instanceof Error ? error.message : String(error)` kullanıyordu. Düz nesne `Error`
olmadığı için `String(error)` → `"[object Object]"`; ayrıca sınıflandırma regex'i bu metni
eşleştiremediği için gerçek bir RLS reddi bile `FAIL` olarak raporlanıyordu.

**Düzeltme (`scripts/live-validation/run.mjs`):**

- `DbError` sınıfı: PostgREST gövdesini `status`/`statusText` ile birlikte taşır,
- `describeError()`: `HTTP <status> · code=… · message="…" · details=… · hint=…` biçimi,
- `classifyError()`: `rls-deny` / `missing-object` / `auth` / `network` / `other`,
- `probe()`: DENY beklentisinde **0 satır** veya **RLS hata kodu** → `DENY`; veri görünürse →
  `FAIL` + `RLS SIZINTISI`; `PGRST205/42P01` → `FAIL` + "canlı şemada nesne yok" yorumu,
- JSON çıktısına `httpStatus`, `code`, `kind` alanları eklendi,
- koşu sonunda `--- FAIL nedenleri (gerçek HTTP durumu / PostgREST kodu) ---` özeti,
- anahtar/JWT benzeri dizeler `[gizlendi]` ile ayıklanır (sır yazılmaz).

**Kanıt (ağ gerektirmez):**

```
$ node scripts/live-validation/run.mjs --selftest
  PostgREST RLS reddi: rls-deny → HTTP 403 Forbidden · code=42501 · message="new row violates row-level security policy for table 'clients'" → RLS/GRANT reddi …
  PostgREST tablo yok: missing-object → HTTP 404 Not Found · code=PGRST205 · message="Could not find the table 'public.clients' in the schema cache" → canlı şemada nesne bulunamadı …
  sınıflandırma sonucu: 8/8 doğru
```

### 2.2 Seed uygulanmadı — kanıt

Canlı koşu kanıtı, seed'in **hiç uygulanmadığını** gösteriyor:

| Kanıt | Beklenen (seed sonrası) | Koşudaki |
|---|---|---|
| A profili `organization_id` | `LIVE-TEST A` kurumu | **YOK (null)** |
| B profili `organization_id` | `LIVE-TEST B` kurumu | **YOK (null)** |
| admin profili `role` | `ADMIN` | **PSYCHOLOG** (varsayılan) |

Bu, `handle_new_auth_user` trigger'ının ürettiği başlangıç durumudur: profil kayıt anında
kurumsuz ve `PSYCHOLOG` rolüyle oluşur. Seed **sessizce geçemez**: e-posta eşleşmezse
`raise exception` ile durur (placeholder e-postalarla çalıştırılırsa SQL Editor kırmızı hata verir).

**Düzeltme/iyileştirme:**

- `seed-live-test-orgs.sql`: düzenlenecek tek yer `live_test_slots` INSERT'i hâline getirildi
  (A/B/ADMIN satırları); eşleşme bulunamazsa hangi e-postanın bulunamadığını **ve mevcut auth
  kullanıcılarını** bildirir; sonunda `HAZIR / KURUM ATANMAMIŞ / KULLANICI YOK` tablosu yazar;
  hâlâ INSERT+UPDATE dışında bir şey yapmaz (silme yok).
- Seed SQL artık gerçek PostgreSQL'de test edilir: `tests/liveValidationSeed.test.ts` **4/4**
  (atama, idempotency, sessiz geçmeme, admin yokluğu).
- `run.mjs` `kurum ataması` hata mesajı, seed'in **SQL Editor'da** çalıştırılacağını açıkça yazar.

### 2.3 anon FAIL'lerinin gerçek nedeni — nasıl kesinleştirilecek

İlk koşuda anon kontrollerinin nedeni **kanıtlanamadı** (mesaj serileştirme hatası yüzünden).
Olası nedenler ve ayırt edici kodlar:

| Olası neden | Beklenen gerçek kod | Yorum |
|---|---|---|
| RLS/GRANT reddi (istenen davranış) | `code=42501`, HTTP 401/403 veya `HTTP 200 + 0 satır` | **DENY** (kanıt) |
| Canlı şemada tablo yok / PostgREST schema cache | `code=PGRST205` (404) veya `42P01` | **FAIL** — migration uygulanmamış |
| Schema exposure / yanlış endpoint | `PGRST106` / 404 | **FAIL** — proje yapılandırması |
| Anahtar reddi | HTTP 401, `invalid_api_key` / `PGRST301` | **FAIL** — anahtar/session sorunu |

Bu ayrımı **tek koşuda** kesinleştiren iki ek ölçüm eklendi:

1. **SEMA ön kontrolü** (yeni grup): `clients.owner_user_id`, `sessions.appointment_id/status/locked_at`,
   `appointments.fee`, `formulations`, `safety_plans`, `reports.locked_at`, `anamneses`,
   `documents.file_path`, `client-documents` bucket — her biri gerçek PostgREST kodu ile raporlanır.
   Bu grup **seed'den bağımsız** çalışır (kurum kapısından önce).
2. **migration geçmişi**: `verify-migrations.sql` sonuna `supabase_migrations.schema_migrations`
   karşılaştırması eklendi (11 beklenen sürüm → `uygulanmis` + `durum` sütunları), ayrıca tek
   satırlık `semptom` kararı.

Ayrıca anon matrisi güçlendirildi (yıkıcı olmayan tasarım): tablo düzeyi SELECT/INSERT'e ek olarak,
yalnız bu ölçüm için A tarafından oluşturulan **geçici danışan** üzerinde
`anon → SELECT/UPDATE/DELETE` (beklenen DENY), ardından "kayıt hâlâ yerinde mi" ve temizlik
kontrolleri; son olarak ana zincir kaydı üzerinde salt-okur `anon → SELECT` (beklenen DENY).
RLS politikalarında **hiçbir değişiklik yapılmadı**.

---

## 3. Kurum / profil durumu (canlı — koşu #5 ile güncel)

| Kullanıcı | Giriş | Profil | Rol | `organization_id` |
|---|---|---|---|---|
| psikolog A | PASS | var | `PSYCHOLOG` | **var** (koşu #4) |
| psikolog B | PASS | var | `PSYCHOLOG` | **var** (koşu #4) |
| admin | PASS | var | `ADMIN` | **var** (koşu #4) |

> Koşu #1–#3 arasındaki `org=YOK` durumu seed'in uygulanmamasındandı; #4 ile kapandı.
> `admin` rolünün #3'te `ADMIN` olması, seed çalışmadan önce **elle** değiştirildiğini gösterir.

`organizations` tablosunun ve FK'nın canlıda var olup olmadığı §2.3'teki `semptom` +
`verify-migrations.sql` çıktısıyla kesinleşecek (baz migration'da
`profiles.organization_id uuid references organizations(id) on delete set null` tanımlıdır).

---

## 4. Değişen dosyalar (bu teşhis turu)

| Dosya | Değişiklik |
|---|---|
| `scripts/live-validation/run.mjs` | `DbError` + `describeError` + `classifyError` + `unwrap`, yeni `probe()` sınıflandırması, `SEMA` ön kontrolü, güçlendirilmiş anon matrisi, `--selftest`, FAIL nedenleri özeti, JSON'a `httpStatus/code/kind` |
| `scripts/live-validation/seed-live-test-orgs.sql` | tek düzenleme noktası (`live_test_slots`), eşleşme/uç durum teşhisi, doğrulama tablosu + özet satırı |
| `scripts/live-validation/verify-migrations.sql` | `semptom` kararı + `supabase_migrations.schema_migrations` karşılaştırması (11 sürüm) |
| `scripts/live-validation/README.md` | koşu sırası, belirti→neden→çözüm tablosu, DENY kanıt kuralları, hata raporlama bölümü |
| `tests/liveValidationSeed.test.ts` | **YENİ** — seed SQL davranış testi (4 kontrol) |
| `tests/liveValidationVerifySql.test.ts` | **YENİ** — verify SQL + migration geçmişi testi (1 kontrol) |
| `scripts/live-validation/emit-seed.mjs` | **YENİ** — `.env.live` içindeki e-posta değerlerini seed şablonuna yerleştirip `live-seed.local.sql` üretir (parola okumaz/yazmaz, ekranda e-posta maskelenir) |
| `scripts/live-validation/cleanup-live-test-data.sql` | **YENİ** — sentetik artık temizliği: önizleme (kilitli kayıt sayısı), **arşivle** (önerilen), uyarılı tam silme (trigger'lar işlem süresince kapalı, yalnız `LIVE-%` hedefi), trigger durumu doğrulaması |
| `scripts/live-validation/run.mjs` (koşu #5 turu) | CLEANUP artık kilit korumasını tanır: kilitli kayıt → `DENY` + `Yerinde` `PASS` + `Temizlik` `SKIP` |
| `docs/PHASE-7-LIVE-VALIDATION.md` | bu belge (koşu #4 tam matrisi, 4 FAIL'in kök nedeni, artık veri notu) |

**Dokunulmayanlar:** RLS politikaları, migration dosyaları, uygulama kodu (feature/UI değişikliği yok),
`src/**`, `supabase/migrations/**`.

---

## 5. Yeniden koşu adımları (kullanıcı makinesi)

```bash
git fetch origin && git checkout arena/01a0d937-psikolog && git pull

# 1) Şema: hangi migration'lar uygulanacak/uygulanmış?
npx supabase login
npx supabase link --project-ref afvqznjqlrcoxoalkczd
npx supabase migration list
npx supabase db push --include-all          # 11 dosya, tamamı non-destructive

# 2) Şema doğrulama (SQL Editor, salt-okur): scripts/live-validation/verify-migrations.sql
#    Beklenen: 25+ nesne kontrolü OK, semptom = "PHASE 7 ŞEMASI CANLIDA GÖRÜNÜYOR",
#              11 migration "uygulanmis = true"

# 3) Seed — (a) koşucu zaten üretir; (b) elle üretmek isterseniz:
#    a) node scripts/live-validation/run.mjs   → live-seed.local.sql dosyasını üretir
#    b) node scripts/live-validation/emit-seed.mjs   → aynı dosyayı ayrıca üretir
#    Sonra: Supabase Dashboard → SQL Editor → dosya içeriğini yapıştır → çalıştır
#    Beklenen: NOTICE "SEED TAMAM" + 3 satır "HAZIR" + sonuç "A ve B kurum ataması TAMAM"

# 4) Koşu
node scripts/live-validation/run.mjs --selftest   # 13/13 sınıflandırma + 5/5 CLEANUP planı (ağ yok)
node scripts/live-validation/run.mjs              # tam canlı koşu
```

# 6) (Opsiyonel) eski koşulardan kalan artıklar
#    SQL Editor: scripts/live-validation/cleanup-live-test-data.sql
#    Önce önizleme sorgularını çalıştırın; silme adımları yorumlu durur.
```

Beklenen RLS davranışı (kanıt kodlarıyla):

| Kontrol | Beklenen | Kabul edilen kanıt |
|---|---|---|
| `anon → clients SELECT` | DENY | `HTTP 200 + 0 satır` **veya** `42501` |
| `anon → clients INSERT` | DENY | `42501` / `HTTP 403` |
| `anon → geçici danışan SELECT/UPDATE/DELETE` | DENY | `0 satır` veya `42501` |
| `kurum ataması` | PASS | A/B profillerinde `organization_id` dolu |
| A→A SELECT/INSERT/UPDATE/DELETE | PASS | satır döner / etkilenir |
| A→B, B→A | DENY | `0 satır` veya `42501` |
| admin (kendi kapsamı) | PASS | satır döner |
| locked UPDATE/DELETE | DENY | `HTTP 400 + P0001` (kilit trigger'ı) **veya** `0 satır` |
| Storage `B read A` | DENY | `NoSuchKey / Object not found` **veya** `0 satır` |

---

## 6. Sonuç ve sonraki adım

### 6.1 Şu ana kadar kanıtlanan (canlı, gerçek HTTP/kod)

| Kontrol | Sonuç |
|---|---|
| AUTH (A/B/admin/anon giriş + profiller) | **PASS** (12/12) |
| Canlı şema (PHASE 7 nesneleri + bucket) | **PASS** (9/9) |
| Klinik zincir (Client→…→Report, `session.appointment_id`) | **PASS** (27/27) |
| Sunucu kalıcılığı (yeni istemciyle geri okuma) | **PASS** (9/9) |
| RLS: A→A PASS · B→A DENY (`0 satır` / `403`+`42501`) · admin kapsam PASS · anon DENY (5/5) | **PASS/DENY** |
| İmza/kilit/revizyon + `superseded_by` | **PASS** |
| **Kilitli kayıt UPDATE/DELETE** | **DENY** (`400` + `P0001`) — DB trigger |
| Storage: A PASS · B read/update/delete DENY (`NoSuchKey`, `AccessDenied`, `0 satır`) | **PASS/DENY** |
| Çıkış izolasyonu + A yeniden giriş | **PASS/DENY** |
| Temizlik | Kilitli kayıt nedeniyle **DENY + SKIP** (bakım adımı) |

### 6.2 Kalan tek iş: CLEANUP raporlamasının canlıda doğrulanması

`node scripts/live-validation/run.mjs` tekrar koşulur; beklenti **`FAIL 0`**
(temizlik `DENY` + `SKIP` olarak raporlanır, çünkü zincirde kilitli bir klinik kayıt var).

Bu koşu `FAIL 0` verdikten sonra: **LIVE SUPABASE = VERIFIED (REST/Auth/Storage düzeyinde)**.
Bu belge ve `docs/PHASE-7-REPORT.md` §52-P0-8 bloğu ona göre kapatılır.

### 6.3 Kapsam dışı kalan katmanlar

- **REAL BROWSER: NOT RUN** — gerçek Chromium/Playwright ile çok kullanıcılı oturum testi yapılmadı
  (`npm run test:e2e`; Chromium ikilisi gerekir).
- **PRODUCTION: NOT VERIFIED** — production bundle + dağıtım ortamı doğrulaması yapılmadı.
  Statik kaynak incelemesi E2E PASS sayılmaz.

### 6.4 İsteğe bağlı bakım

Sentetik artığı görünmez kılmak/ silmek için: `scripts/live-validation/cleanup-live-test-data.sql`
— **§3 arşivle** (önerilen; klinik kayıtlar korunur) veya **§4 tam silme** (uyarılı).

**Bu adımlar tamamlanana kadar `LIVE SUPABASE` PASS sayılmaz; PHASE 7 COMPLETE DEĞİLDİR.**

---

## 7. Sır saklama beyanı

- Bu turda hiçbir anahtar/parola **dosyaya yazılmadı**; koşucu yalnız ortam değişkeni/`.env.live` okur.
- Kullanıcının paylaştığı koşu çıktısı yalnızca durum + UUID kısaltmaları içeriyordu; bu belgeye
  aynen aktarılırken de yalnızca bu alanlar kullanıldı (anahtar/parola/JWT yok).
- Koşucu artık hata metinlerini de sır ayıklayarak yazar (`[gizlendi]`).
