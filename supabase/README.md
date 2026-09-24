# Supabase kurulumu

Bu klasör, uygulamanın şemasını, RLS politikalarını ve Admin'in psikolog hesabı
oluşturmak için kullandığı Edge Function'ları içerir:

- `admin-users` — Admin'in psikolog hesabı oluşturması ve aktiflik yönetimi.
- `ai-interpretation` — MMPI sonuçlarının yapay zekâ destekli yorumu (karar desteği).

## 1. Proje değişkenleri

Kök dizinde `.env` oluşturun:

```sh
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Frontend'e yalnızca publishable/anon anahtar konur. `service_role` anahtarı
frontend'e, `.env` içine `VITE_` önekiyle veya Git'e kesinlikle konmaz.

## 2. Şema ve RLS

Supabase CLI ile proje ref'ini `supabase/config.toml` içine yazıp tüm migration'ları canlı veritabanına uygulayın:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Uygulamadan sonra canlı projeyi bağımlılıksız teşhis betiğiyle doğrulayın
(migration geçmişi, kolon/politika/grant/trigger, `audit_logs` sözleşmesi ve iki
Edge Function'ın CORS davranışı):

```sh
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
SUPABASE_SERVICE_KEY=<service_role> \
SITE_ORIGIN=https://your-app.example.com \
npm run diagnose:supabase
```

Belirti → kök neden → komut eşlemesi için [`../TROUBLESHOOTING.md`](../TROUBLESHOOTING.md).

Özellikle `20260920000000_record_actions.sql`, not kaydı ve silme akışındaki
RLS/şema uyumunu düzeltir; bu migration uygulanmadan uygulama kodu tek başına
canlı Supabase yetkilerini değiştiremez.

Migration'lar şunları oluşturur:

- `profiles`: Auth kullanıcı profili, `ADMIN` / `PSYCHOLOG` rolü ve aktiflik.
- `mmpi_records`: danışan alanları, ham OMR JSON'u, oluşturan psikolog ve idempotency anahtarı.
- `mmpi_records.expert_notes` + `notes_updated_at`: kayıt sonrası uzman değerlendirme
  notu (en fazla 4000 karakter; rapora aktarılır; Admin tüm görünür kayıtlara,
  aktif psikolog kendi kaydına yazabilir).
- `audit_logs`: sunucu taraflı denetim izi — `mmpi_records` üzerindeki her
  insert/update/delete, security-definer trigger ile (aktör, eylem, hedef, zaman)
  olarak yazılır; istemciden yazılamaz/silinemez, yalnızca Admin okuyabilir.
- `mmpi_reports`: psikolog raporunun JSON belgesi, durumu, kaynak MMPI anlık görüntüsü, veri sürümü ve revizyon numarası.
- `mmpi_report_versions`: sunucu trigger'ıyla atomik oluşturulan, istemciden değiştirilemeyen sürüm geçmişi.
- `mmpi_report_templates`: salt okunur sistem şablonu kaydı ve kullanıcı şablonları.
- `psychologist_report_settings`: isteğe bağlı antet, logo ve imza (PNG/JPEG/WebP data URL).
- Auth kullanıcı trigger'ı.
- Psikoloğun yalnızca kendi kayıtlarını, Admin'in tüm kayıtları görebildiği RLS.
- Aktif olmayan kullanıcının kayıt okuyup yazmasını engelleyen RLS fonksiyonları.
- Yaş, tarih, ham veri yükü boyutu ve kayıt değişmezliği için veritabanı tarafı korumalar; yalnızca aktif psikolog kayıt yazabilir, profil UPDATE/DELETE işlemleri yalnızca Edge Function üzerinden yapılır.

Supabase Dashboard → Authentication → Providers → Email bölümünde **Allow new
users / Enable email signup** seçeneğini kapatın. `config.toml` yerel CLI
konfigürasyonunu da aynı şekilde ayarlar; uzak projeye dashboard ayarı olarak
kontrol edilmelidir.

## 3. İlk Admin

Public signup kapalıyken ilk Admin'i Supabase Dashboard → Authentication → Users
→ Add user ile oluşturun. Migration trigger'ı hesabı önce en düşük yetki olan
`PSYCHOLOG` olarak profile ekler. SQL Editor'da yalnızca bir kez:

```sql
update public.profiles
set role = 'ADMIN', active = true
where email = 'ilk-admin@example.com';
```

Bu işlemden sonra psikolog hesapları yalnızca uygulamanın Admin panelinden
oluşturulabilir.

## 4. Edge Function

Function, service role anahtarını yalnızca Supabase sunucusunda kullanır:

```sh
supabase functions deploy admin-users
supabase secrets set ALLOWED_ORIGINS=https://your-app.example.com
```

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ve `SUPABASE_ANON_KEY` Supabase
Edge Functions ortamında otomatik bulunur. Production'da `ALLOWED_ORIGINS` boş
bırakılmamalı; birden fazla origin virgülle ayrılarak yazılmalıdır. Boş allowlist
yalnızca `http://localhost` ve `http://127.0.0.1` geliştirme origin'lerine izin
verir. Arena preview origin'i de açıkça eklenmelidir. Hesap silme işlemi Auth
kullanıcısını siler; `profiles` ve `mmpi_records` üzerindeki `on delete cascade`
ilişkileri ilişkili uygulama verisini birlikte kaldırır.

`admin-users` ayrıca veritabanı kaynaklı hataları (denetim izi/kısıt/RLS) **500 +
`supabase db push`** mesajıyla, Auth/istemci kaynaklıları **400** ile ayırır; böylece
arayüz "şema eksik" ile "geçersiz istek" durumunu karıştırmaz. Password Auth kullanıcısı
Supabase Auth'ta oluşturulur; uygulamanın tablolarına parola yazılmaz.

## 5. AI karar desteği (ai-interpretation)

Sonuç panelinin son sekmesi "Yapay Zekâ Yorumu", bir LLM sağlayıcısına istek atar.
Anahtar **yalnız Edge Function çalışma zamanında** yaşar; frontend'e, `.env`'e
veya Git'e asla yazılmaz.

### 5.1 Google Gemini (önerilen/yerel yol)

```sh
supabase functions deploy ai-interpretation
supabase secrets set AI_API_KEY=AQ.Ab... AI_MODEL=gemini-2.5-flash \
  ALLOWED_ORIGINS=https://your-app.example.com
```

- Fonksiyon, `AI_MODEL` "gemini" ile başladığı için sağlayıcıyı **otomatik**
  Gemini seçer ve Google'ın yerel `generateContent` ucuna
  (`https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`)
  istek atar; anahtar `x-goog-api-key` başlığıyla taşınır.
- **Neden yerel uç nokta şart:** Google 2026'da anahtar biçimini `AIza…` yerine
  `AQ.…` ("Auth key") olarak değiştirdi. Yeni anahtarlar yerel uç noktada sorunsuz
  çalışır ama OpenAI uyumlu `/chat/completions` yolunda **401/403 ile reddedilir**
  ("Multiple authentication credentials received" / "ACCESS_TOKEN_TYPE_UNSUPPORTED").
  Belirti, arayüzde "Yapay zekâ servisi anahtar doğrulaması geçmedi…" + 502'dir.
- Google **Cloud Console**'dan oluşturulan anahtarlarda projede **Generative
  Language API** açık olmalı (APIs & Services → Library) ve anahtar **uygulama
  kısıtlı (application restriction) olmamalı** ya da sunucu taraflı kullanıma
  uygun tanımlanmalıdır; aksi halde 401/403 sürer.
- Anahtarı taşırken biçimiyle oynamayın (kısaltmayın, boşluk bırakmayın);
  `supabase secrets list` ile tanımlı olduğunu doğrulayın.
- Alternatif otomatik seçim ipuçları: `AI_PROVIDER=gemini` açıkça verilebilir;
  `AI_API_BASE` bir `generativelanguage.googleapis.com` adresine işaret ediyorsa
  ya da `AI_MODEL` unutulmuş ama anahtar `AIza.`/`AQ.` ile başlıyorsa gene Gemini
  seçilir. Biçim kontrolü yalnız sağlayıcı seçimi içindir; anahtar doğrulaması
  Google tarafında yapılır.

### 5.2 OpenAI uyumlu uç nokta (alternatif)

```sh
supabase secrets set AI_API_KEY=sk-... AI_PROVIDER=openai \
  AI_MODEL=gpt-4o-mini ALLOWED_ORIGINS=https://your-app.example.com
```

- `AI_API_BASE` (opsiyonel, varsayılan `https://api.openai.com/v1`) — herhangi
  bir OpenAI uyumlu `/chat/completions` uç noktası. `AI_PROVIDER=openai` ile
  Gemini model adlı bir geçiş/proxy servis de zorlanabilir.

### 5.3 Ortak sözleşme

- `AI_API_KEY` tanımlı değilken fonksiyon 503 döner; arayüz "henüz
  yapılandırılmamış" gösterir ve AI sekmesi bilgi kutusuyla sınırlı kalır.
- Sağlayıcı hataları ayırt edilebilir mesajlara çevrilir (hepsi 502 ile):
  401/403 → anahtar doğrulaması (Gemini'de Generative Language API/kısıt ipucuyla),
  404 → `AI_MODEL` bulunamadı, 429 → kota/hız sınırı, safety bloklaması → filtre
  mesajı. Ham sağlayıcı mesajı istemciye taşınmaz; durum kodu + kısa özet
  yalnız sunucu günlüğüne yazılır.
- İstemci yalnız **sayısal profil özetini** gönderir (ham metin/prompt yok);
  fonksiyon bu özetin her alanını bağımsız doğrular. `mode=record` ise kayıt,
  service role ile okunur ve çağrının o kayda RLS ile erişme hakkı taşıdığı
  (sahip veya Admin) doğrulanmadan yorum üretilmez (IDOR koruması).
- `ALLOWED_ORIGINS` `admin-users` ile **aynı değeri** taşır; boş bırakılırsa
  yalnız localhost dev origin'leri izinli olur.

## Psikolog raporları (2026-09-23)

`20260923000000_psychologist_reports.sql` migration'ını `supabase db push` ile uygulayın.
Mevcut `profiles`, Auth ve `mmpi_records` politikaları değiştirilmez. Yeni rapor tabloları
anon erişimine kapalıdır. Aktif psikolog kendi kaydına bağlı kendi raporlarına erişir;
aktif Admin tüm raporları denetleyebilir. Sistem şablonu Admin dahil istemcilerce değiştirilemez.
Rapor sahibi/kaynak kayıt sonradan değiştirilemez. Rapor silinince sürümleri; test kaydı
silinince bağlı raporlar silinir. Rapor silmek test kaydını silmez.

Sürümleme transaction içindeki trigger ile yapılır: oluşturma, elle kaydetme,
tamamlama, veri yenileme, geri yükleme ve son sürümden 10 dakika sonraki ilk otomatik kayıt.
Diğer otomatik kayıtlar belgeyi günceller ama yeni sürüm oluşturmaz. `revision` koşulu
aynı raporu açan iki oturumun sessizce birbirinin değişikliklerini ezmesini önler.

Logo ve imza Storage bucket gerektirmez; ayarlar ve rapor belgesi içine kopyalanır.
Antet güncellemeleri eski raporları kendiliğinden değiştirmez. Rapor belgeleri/sürümleri
kişisel sağlık verisi içerebilir: mevcut yedekleme, saklama ve yetkilendirme süreçlerine dahil edin.
Detaylı uygulama ve test notları: [docs/raporlar.md](../docs/raporlar.md).
