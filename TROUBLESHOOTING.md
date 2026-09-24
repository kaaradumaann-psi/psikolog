# Sorun giderme: canlı ortamda "400", "Kayıt bulunamadı…", "Kullanıcı hesabı silinemedi"

Bu dosya, **kod doğru ama canlı Supabase projesi eksik/güncel değil** durumunda
görülen hata kümesini, kök nedenlerini ve kesin çözüm sırasını anlatır.
Uygulama tarafının hangi hatayı hangi mesaja çevirdiği `src/records/supabaseRecords.ts`
(`describeMutationError`) ve `src/auth/adminApi.ts` (`explainEdgeFunctionError`)
içinde tanımlıdır.

Tarayıcı konsolunda/ekranda görülebilen tipik tablo:

```text
Failed to load resource: the server responded with a status of 400 ()
https://<proje>.supabase.co/rest/v1/mmpi_records?id=eq.<uuid> ... 400
Kayıt işlemleri için veritabanı güncellemesi gerekiyor; yöneticiniz supabase db push çalıştırmalı.
Kayıt bulunamadı veya bu kayıt üzerinde silme yetkiniz bulunmuyor.
Kullanıcı hesabı silinemedi: canlı veritabanı şeması güncel değil. Yönetici supabase db push çalıştırmalı…
```

## Tek cümlelik teşhis

**Kod değil, canlı projenin şeması/RLS'i ve Edge Function secret'ı eksik olabilir.**
Dört ayrı katman aynı anda kırılabilir ve hepsi yalnızca yöneticinin çalıştıracağı
komutlarla düzelir:

| # | Katman | Belirti | Neden | Çözüm |
| - | --- | --- | --- | --- |
| 1 | Veritabanı şeması | `rest/v1/mmpi_records?id=eq...` → **400**; psikolog oluşturma → **500** "Kullanıcı hesabı oluşturulamadı: canlı veritabanı şeması güncel değil" | `mmpi_records.expert_notes` / `notes_updated_at` kolonları canlıda yok → PostgREST `42703 undefined_column`; Auth kullanıcısı `profiles` trigger'ı ile yazıldığı için eksik şema **kullanıcı oluşturmayı da** durdurur (GoTrue "Database error creating new user"). | `supabase db push` |
| 2 | RLS / grant | "Kayıt bulunamadı veya bu kayıt üzerinde silme yetkiniz bulunmuyor" (sunucu hatası **yok**, 0 satır) | `20260920000000_record_actions.sql` uygulanmadıysa Admin için UPDATE/DELETE politikası yoktur; RLS yetkisiz isteği hata vermeden **0 satır** olarak filtreler. | `supabase db push` |
| 3 | Edge Function CORS | "Edge Function isteği tarayıcıdan tamamlanamadı" / "Kullanıcı hesabı silinemedi" | `ALLOWED_ORIGINS` secret'ı boş → fonksiyon yalnızca `http://localhost`'a izin verir, yayın origin'i **403 Origin not allowed** ile reddedilir ve tarayıcı isteği keser. | `supabase secrets set ALLOWED_ORIGINS=…` |
| 4 | Denetim izi sözleşmesi | 3 düzeltilse bile silme/not yazma hata veriyor | `audit_logs` / `mmpi_records` üzerindeki trigger ve kısıtlar canlıda farklıysa (ör. `audit_logs.actor` NOT NULL, eksik trigger) CASCADE silme veya kayıt yazımı geri alınır. | `supabase db push` |

Not: Admin panelindeki psikolog listesi çalışmaya devam eder, çünkü `profiles`
tablosu ilk migration'dan beri mevcuttur. Bu yüzden "yarısı çalışıyor, yarısı
çalışmıyor" hissi oluşur.

`admin-users` bu tabloyu **ayırt edilebilir** biçimde döndürür: doğrulama hataları
`400` (ör. "E-posta geçersiz"), şema/RLS/trigger kaynaklı hatalar `500` + `supabase
db push` mesajı, oturum/yetki sorunları `401`/`403`. İstemci tarafında hangi durumun
hangi mesaja döndüğü `src/auth/adminApi.ts` → `explainEdgeFunctionError()` içinde ve
`tests/adminApiErrors.test.ts` ile kilitlidir. Edge Function kaynaklarının sözdizimi
ve bu sözleşmeler `tests/edgeFunctions.test.ts` ile CI'da doğrulanır.

## Otomatik teşhis (önce bunu çalıştırın)

`scripts/diagnose-supabase.mjs` harici bağımlılık kullanmaz (Node 22 `fetch`).
Migration geçmişini, tablo/kolonları, RLS politikalarını, grant'ları, trigger'ları,
`audit_logs` sözleşmesini ve **her iki** Edge Function'ın (`admin-users`,
`ai-interpretation`) erişilebilirliğini + `ALLOWED_ORIGINS` davranışını canlı
projeden okur ve hangi maddenin eksik olduğunu tek tek söyler:

```sh
SUPABASE_URL=https://<PROJE_REF>.supabase.co \
SUPABASE_SERVICE_KEY=<service_role veya sb_secret_...> \
SITE_ORIGIN=https://UYGULAMA-ADRESINIZ \
npm run diagnose:supabase                       # salt-okunur
npm run diagnose:supabase -- --allow-destructive  # uçtan uca yazma/silme testi
```

* `SUPABASE_SERVICE_KEY` verilmezse yalnızca şema (PostgREST) ve Edge Function
  CORS kontrolleri yapılır; katalog ve yazma testleri atlanır.
* `--allow-destructive` geçici bir **diagnostik** kullanıcısı + kaydı oluşturur;
  uçtan uca `INSERT → uzman notu → DELETE → Auth CASCADE silme` akışını gerçek
  hata kodlarıyla test eder ve sonunda hepsini siler. Gerçek danışan verisine
  dokunmaz. Üretimde yalnızca onaylı bir bakım penceresinde çalıştırın.
* `ADMIN_JWT=<access_token>` verilirse fonksiyonun Admin doğrulaması da test edilir
  (token'ı tarayıcı `sessionStorage`'ındaki oturumdan alın; paylaşmayın).
* Çıkış kodu: sorun bulunduysa `1`, beklenmeyen hata `2`.

## Çözüm: sırayla çalıştırın

Yönetici makinesinde [Supabase CLI](https://supabase.com/docs/guides/cli) kurulu ve
`supabase login` yapılmış olmalı. Proje ref'i Dashboard → Project Settings → API'de yazar.

```sh
# 1) Şema + RLS + trigger'lar (5 migration, sıralı)
supabase link --project-ref <PROJE_REF>
supabase db push

# 2) Edge Function'ları güncel kodla yayınla
supabase functions deploy admin-users
supabase functions deploy ai-interpretation   # yapay zekâ yorumu kullanılacaksa

# 3) Uygulamanın yayın adresini allowlist'e ekle (birden çok adres virgülle)
supabase secrets set ALLOWED_ORIGINS=https://UYGULAMA-ADRESINIZ,http://localhost:5173
supabase secrets list        # ALLOWED_ORIGINS görünüyor mu?

# 4) Yapay zekâ yorumu için (opsiyonel) — Gemini anahtarları (AIza.* / AQ.*) için:
supabase secrets set AI_API_KEY=AQ.Ab... AI_MODEL=gemini-2.5-flash
#    OpenAI uyumlu uç nokta kullanılacaksa:
#    supabase secrets set AI_API_KEY=sk-... AI_PROVIDER=openai AI_MODEL=gpt-4o-mini

# 5) Doğrula
npm run diagnose:supabase

# 6) Uygulamayı yeniden derleyip yayınla
npm run build                # dist/ (ve depo kökünde optik-form.html)
```

`ALLOWED_ORIGINS` değeri **tam origin** olmalıdır: şema + host + (varsa) port,
sonda `/` yok. Boş bırakılırsa fonksiyonlar üretimde hiçbir siteye izin vermez.

## Hata kodu → neden tablosu

Uygulama, teşhis için PostgREST hata `code`unu ve kısa mesajını konsola yazar
(`[supabase] kayıt işlemi hatası { code, message }`). **Satır içeriği (`details`)
bilinçli olarak yazılmaz**: PostgreSQL kısıt ihlallerinde `details` alanına satırın
tamamını koyabilir ve bu danışan verisini konsola/log toplayıcısına taşır.

| code | Anlamı | Çözüm |
| --- | --- | --- |
| `42703` / `PGRST204` | Kolon yok (`expert_notes`, `notes_updated_at`) | `supabase db push` |
| `42P01` / `PGRST205` | Tablo yok | `supabase db push` |
| `42501` | Grant/RLS yetkisi yok | `supabase db push` |
| `23502` | NOT NULL ihlali (`audit_logs`) | `supabase db push` |
| `P0001` | Trigger `raise exception` (mesaj ekranda gösterilir) | Mesajı okuyun: tarih, veri yükü veya değişmezlik kuralı |
| `PGRST116` | `.single()` 0/multiple satır: kayıt yok, silinmiş ya da RLS görünürlüğü engelliyor | Kayıt gerçekten var mı? Yoksa ve şema eskiyse `supabase db push` |
| `PGRST301` / `PGRST302` | JWT süresi dolmuş / geçersiz | Çıkış yapıp yeniden giriş yapın |
| `23503` / `23505` / `23514` | FK, uniqueness veya CHECK ihlali | Girilen veriyi/tekrar denemeyi kontrol edin |
| CORS / `Failed to fetch` | `ALLOWED_ORIGINS` eksik | `supabase secrets set ALLOWED_ORIGINS=…` |
| `503` (AI) | `AI_API_KEY` tanımlı değil | `supabase secrets set AI_API_KEY=… AI_MODEL=gemini-2.5-flash` (AI sekmesi bilgi kutusuyla sınırlı kalır) |
| `502` (AI) "anahtar doğrulaması geçmedi" | Gemini (`AQ.…`/`AIza…`) anahtarı OpenAI uyumlu `/chat/completions` yolunda kullanıldı; ya da anahtar geçersiz/kısıtlı | `AI_MODEL=gemini-…` ile yerel Gemini yolu açılır (bkz. `supabase/README.md` §5.1). Hâlâ sürerse: Cloud Console'da Generative Language API açık mı, anahtar uygulama kısıtlı mı, anahtar tam/pastalandı mı? |
| `502` (AI) "modeli bulunamadı" | `AI_MODEL` değeri o sağlayıcıda yok | `supabase secrets set AI_MODEL=gemini-2.5-flash` (ya da sağlayıcıdaki geçerli ad) |
| `502` (AI) "kota/hız sınırına takıldı" | Google/OpenAI kotası ya da hız limiti doldu | Bir süre bekleyin; Google Cloud'da faturalandırma/kota ayarlarını kontrol edin |
| `502` (AI) "güvenlik filtreleri nedeniyle" | Sağlayıcı safety filtresi yanıtı engelledi | Tekrar deneyin; sürerse farklı bir `AI_MODEL` deneyin |

## İlk Admin hesabı

Public signup kapalı olduğu için ilk Admin elle kurulur:

1. Dashboard → Authentication → Users → **Add user** (e-posta + parola, "Auto Confirm" işaretli).
2. `on_auth_user_created` trigger'ı profili en düşük yetkiyle (`PSYCHOLOG`) oluşturur.
3. Dashboard → SQL Editor'da **bir kez**:

   ```sql
   update public.profiles
   set role = 'ADMIN', active = true
   where email = 'ilk-admin@example.com';
   ```

4. Admin ile giriş yapın; psikolog hesapları artık Admin panelinden oluşturulur.

Bu adım atlanırsa Edge Function her isteği `403 Admin role required` ile reddeder
ve paneldeki **tüm** hesap işlemleri (oluştur / pasifleştir / sil) çalışmaz.

## Bunlar da kontrol edildi mi?

* Dashboard → Authentication → Providers → Email → **Allow new users to sign up: KAPALI**.
* `supabase functions deploy` sonrası Edge Functions sekmesinde her iki fonksiyonun
  "Updated" zamanı güncel mi?
* Uygulama, `.env` içindeki `VITE_SUPABASE_URL` ile **aynı** projeye mi bakıyor?
  İki farklı proje ref'i karıştırıldığında "tablo yok / 400" belirtileri birebir aynı görünür.
* Yayınlanan dosya güncel mi? `npm run build` sonrası `optik-form.html` / `dist`
  çıktısı yüklenmediyse tarayıcı eski kodu çalıştırmaya devam eder (hard refresh).
* HTTP güvenlik başlıkları yayında mı? `curl -I https://UYGULAMA-ADRESINIZ` çıktısında
  `Strict-Transport-Security`, `X-Frame-Options: DENY`, `Content-Security-Policy:
  frame-ancestors 'none'` görünmelidir (`dist/_headers` dosyasından gelir).
* Silme 0 satır döndüyse kayıt zaten silinmiş olabilir; listeyi yenileyip tekrar deneyin.
