# MMPI-566 Çalışma Alanı — Sistem Dokümanı

**Belgenin amacı:** Bu dosya, depo kodundan türetilmiş güncel mimari ve üretim işletim sözleşmesidir. Yeni bir özellik tasarımı değildir; uygulamanın gerçekten yaptığı şeyleri, güvenlik sınırlarını, doğrulanmış kontrolleri ve doğrulanamayan üretim bağımlılıklarını ayırır.

**Denetim snapshot'ı:** 22 Eylül 2026 · teslim branch'i · yerel doğrulama: `npm run typecheck`, `npm test` **375/375** (36 suite), `npm run verify:pdf`, `npm run build`, `git diff --check`.

> Önceki snapshot (21 Eylül 2026): `npm ci` + `npm test` **285/285** + `npm audit
> --audit-level=high`. Sayı, MMPI denetim testi kilitleriyle birlikte büyüdü
> (`docs/mmpi-audit/TEST_AUDIT.md`); 285 → 375 arası **yorum katmanı** testleridir (22 Eylül
> ara snapshot’ı 368/368 idi); puanlama/OMR matematiği değişmedi.

Durum etiketleri:

- **DOĞRULANDI:** Bu checkout'ta komutla veya kod/test incelemesiyle görüldü.
- **TASARIM:** Kodda uygulanmış sözleşme; canlı altyapı davranışı ayrıca sınanmış değildir.
- **DOĞRULANMADI:** Bu ortamda gerekli gerçek proje, cihaz, tarayıcı veya manuel akış yoktu.
- **SINIR:** Ürünün bilinçli veya mevcut teknik kısıtı.

> Güncel rota, dosya haritası, test durumu ve üretim checklist'i için bu dosya yetkili kaynaktır.

---

## 1. Ürün kapsamı ve güven sınırı

MMPI-566 Çalışma Alanı, yetkili ruh sağlığı profesyonellerinin 566 maddelik bir cevap formu akışını yönetmesi için hazırlanmış tek sayfalı bir web uygulamasıdır:

1. danışan/uygulama bilgileri alınır;
2. veri yöntemi seçilir: hızlı cevap girişi, ham puan veya OMR/kamera;
3. OMR ise dört sayfalık aynı baskı seti okunur, düşük güvenli maddeler insan tarafından incelenir;
4. doğrulanmış veri cihazda puanlanır ve sonuç ekranı gösterilir;
5. psikolog kaydı Supabase'e yazar; Admin kayıtları ve uzman hesaplarını yönetir;
6. kaydedilmiş kayıt yeniden hesaplanır, incelenir ve profesyonel rapor olarak yazdırılır.

**Güven sınırı:** Tarayıcı istemcisi OMR ve puanlama hesabını yapar; Supabase Auth kimliği, PostgreSQL RLS'si ve migration trigger'ları kayıt erişimini ve yazma bütünlüğünü sınırlar. İstemci doğrulaması yetki kanıtı değildir. Kritik kurallar istemcide, RLS/Edge Function'da ve mümkün olduğunda veritabanı trigger'ında tekrar edilir.

Uygulama tanı koyan, tedavi öneren veya klinik kararı otomatik veren bir sistem olarak konumlandırılmaz. Ekran ve yazdırma raporu, kaynak tabanlı yorumlar ve uyarılar sunar; nihai değerlendirme uygulayıcı uzmana aittir. Uzman notu alanında tanısal kesin ifadelerden kaçınılması istenir ve sunucu tarafında **4.000 karakter** sınırı vardır.

Form tanımı kod içinde `source: 'unverified-template'` olarak işaretlidir. Depodaki form, lisanslı/yetkili MMPI materyalinin birebir eşdeğeri olduğu iddiasını taşımaz.

---

## 2. Çalışma zamanı ve frontend mimarisi

### 2.1 Giriş ve kabuk

- `src/main.tsx` React 19 root'unu, StrictMode'u ve stil katmanlarını yükler; `installLinkInterceptor()` aynı origin bağlantıları History API'ye taşır.
- `src/App.tsx` bilgi sayfalarını, yapılandırılmamış kurulum/önizleme ekranını, 404'ü ve oturum açılmış uygulama kabuğunu seçer.
- `src/components/AuthGate.tsx` Supabase oturumunu hydrate eder, profil/aktiflik durumunu doğrular ve yeni giriş ile mevcut session hydration'ını ayırır. Profil sorgusu asenkron olduğu için eski bir cevap logout veya yeni session sonrasında kullanıcıyı geri yükleyemez.
- `src/components/ConnectivityBanner.tsx` ağ durumunu görünür kılar.
- `src/components/SiteFooter.tsx` çalışma alanı, giriş/kurulum ve bilgi sayfalarında ortak footer'ı sağlar.

### 2.2 Gerçek rotalar

Router hash router değildir; `src/router.ts` `window.location.pathname` okuyup History API `pushState`/`replaceState` kullanır. Aynı origin `<a>` tıklamaları SPA olarak yakalanır; `mailto:`, `tel:`, `blob:`/`data:`, `download`, `target="_blank"`, modifier tuşları ve dış origin'ler normal davranır.

| Rota | Davranış | Erişim |
| --- | --- | --- |
| `/` | Temiz landing (`home`); persisted taslağı otomatik açmaz | Oturum kapalıysa login/kurulum, açık ise workspace |
| `/index.html`, `/optik-form.html` | Landing alias'ı | Aynı |
| `/islem` | Case workspace; mevcut taslak bu rotada session hydration ile açılabilir | Yetkili oturum |
| `/form` | Doğrulanmış optik form PDF hazırlık ekranı | Yetkili oturum |
| `/kayitlar` | Psikoloğun kendi kayıtları | Yalnız `PSYCHOLOG`; Admin `/yonetim`e yönlendirilir |
| `/kayitlar/<id>` | Tam kayıt inceleme, not ve yazdırma | RLS belirler; Admin tüm kayıtları, psikolog erişebildiği kaydı görür |
| `/yonetim` | Admin kullanıcı/kayıt yönetimi | Yalnız aktif `ADMIN` |
| `/sss` | SSS | Public |
| `/gizlilik` | Gizlilik & KVKK | Public |
| `/kullanim` | Kullanım Koşulları | Public |
| `/kaynaklar` | Kaynakça ve kaynak denetimi | Public |
| `/onizleme` | Deterministik sonuç tasarım önizlemesi; gerçek kayıt yazmaz | Yalnız Supabase yapılandırılmamışken |
| bilinmeyen | 404 | Public kabuk |

Bilgi sayfasındaki üst **Geri dön**, marka bağlantısı ve 404 düğmesi doğrudan `/`e gider. Bu eylemler son taslağı resume ederek iç rotaya yönlendirmez. Footer'daki **Yeni Veri Girişi** ise oturum açık uygulamada bilinçli olarak `/islem`e gider.

Production'da pathname rotalarının doğrudan açılabilmesi için hosting tarafında SPA fallback gerekir. Cloudflare Workers yayınında bu davranış `wrangler.jsonc` içindeki `assets.not_found_handling: single-page-application` ile sağlanır ve `dist/_redirects` üretilmez: Workers API'si `/* /index.html 200` catch-all kuralını sonsuz döngü sayıp version oluşturmayı reddeder (code 100324). Cloudflare Pages / Netlify için kural `PAGES_REDIRECTS=1 npm run build` ile üretilir; Vercel/nginx/S3 benzeri ortamlarda eşdeğer fallback ayrıca yapılandırılmalıdır.

### 2.3 Kaynak haritası

| Alan | Gerçek kaynaklar |
| --- | --- |
| Shell/auth/routing | `src/main.tsx`, `src/App.tsx`, `src/router.ts`, `src/components/AuthGate.tsx` |
| Case lifecycle | `src/components/CaseWorkspace.tsx`, `src/workspace/caseTypes.ts`, `src/workspace/draftStorage.ts` |
| Auth | `src/auth/supabaseClient.ts`, `supabaseAuth.ts`, `authStorage.ts`, `adminApi.ts` |
| Form/layout/identity | `src/omr/formDefinition.ts`, `src/form/layout.ts`, `form/pageIdentity.ts`, `form/formSet.ts` |
| OMR | `src/omr/*`, özellikle `analyzePage.ts`, `alignmentDetector.ts`, `perspectiveCorrection.ts`, `markDetector.ts` |
| Scanner | `src/scanner/*`, `CameraCapture.tsx`, `ScannerWorkspace.tsx`, `ManualCornerEditor.tsx` |
| Results/safety boundary | `src/results/*`, `src/scoring/omrAnswers.ts`, `src/results/recordProfile.ts` |
| Scoring/interpretation | `src/scoring/*` |
| Records | `src/records/supabaseRecords.ts`, `RecordDetailPage.tsx`, `MyRecordsPanel.tsx`, `AdminPanel.tsx` |
| Form PDF | `src/print/*`, `scripts/generate-pdf.ts`, `scripts/verify-pdf.ts` |
| Screen/PDF styles | `src/styles/screen.css`, `theme.css`, `site.css`, `workspace.css`, `scanner*.css`, `form.css`, `print.css` |
| Tests/diagnostics | `tests/*.test.ts`, `tests/fixtures/omrSynthetic.ts` |
| Backend/deployment | `supabase/migrations/*`, `supabase/functions/admin-users/index.ts`, `scripts/build.mjs`, `wrangler.jsonc`, `.github/workflows/ci.yml` |

`src/components/FormPage.tsx` ve ilgili HTML form bileşenleri runtime Form sekmesinin ana yolu değildir; HTML/PDF geometri eşdeğerliğini test etmek için korunur.

---

## 3. Kimlik, roller ve çalışma yaşam döngüsü

### 3.1 Oturum ve roller

- Supabase Auth `persistSession: true`, `autoRefreshToken: true`, `flowType: 'pkce'`, `detectSessionInUrl: false` ile çalışır.
- Auth storage, `sessionStorage` kullanır: aynı sekmede F5 oturumu korur; sekme kapanınca storage kaybolur. Storage erişilemezse no-op memory store kullanılır ve uygulama güvenli şekilde yapılandırılmamış/oturumsuz kalır.
- `VITE_SUPABASE_URL` yalnızca HTTPS origin'i (localhost/127.0.0.1 geliştirme istisnası) kabul eder. Frontend'de yalnız publishable/anon key bulunabilir; service-role anahtarı istemciye girmez.
- Profil `id`, e-posta, ad, soyad, `role` ve `active` alanlarında runtime doğrulanır. Pasif profil session'dan çıkarılır.
- Roller migration enum'unda `ADMIN` ve `PSYCHOLOG` olarak tanımlıdır.

| Eylem | PSYCHOLOG | ADMIN |
| --- | --- | --- |
| Case akışında veri hazırlamak | Evet | UI'da inceleyebilir; veritabanı klinik kaydı oluşturamaz |
| Yeni `mmpi_records` oluşturmak | Yalnız aktif hesap | Hayır; RLS insert yalnız aktif psikolog içindir |
| Kendi kayıtlarını listelemek | Evet | Ayrı Admin listesi kullanır |
| Tüm kayıtları listelemek | Hayır | Evet |
| Kendi kaydına not/silme | Evet, aktif ve owner | Evet, görünür tüm kayıtlar |
| Uzman hesabı oluşturmak/aktiflik/silmek | Hayır | Yalnız Edge Function üzerinden |
| Audit log okumak | Hayır | Evet |

Admin'in kayıt ayrıntısında klinik cevap ve profil görmesi mevcut bilinçli yönetim tasarımıdır; RLS Admin'e tüm kayıtları seçme hakkı verir. Canlı ortamda bu kararın kurumun en az yetki ve KVKK politikasıyla ayrıca onaylanması gerekir.

### 3.2 Yeni giriş, F5 ve landing ayrımı

- Yeni `signIn` tamamlandığında `flowOrigin='signin'` olur ve URL `/`e replace edilir. Landing boş başlar; kullanıcıya aynı hesap için localStorage'da bulunan taslak varsa **Devam et** seçeneği gösterilir. Taslak otomatik açılmaz.
- F5 veya mevcut session hydration'ında `/islem` doğrudan açılırsa `CaseWorkspace` taslağı hydrate eder. `/` landing olarak açılırsa taslak state'e yüklenmez.
- Public SSS/gizlilik/kaynakça/üst geri akışı AuthGate'e girmeden `/`e döner; bu dönüş resume davranışını tetiklemez.
- Admin `/yonetim`, psikolog `/kayitlar` rol korumasıyla engellenir.

### 3.3 Taslak ve outbox

`src/workspace/draftStorage.ts`:

- Taslak anahtarı `mmpi566:case-draft:v1:<userId>`, outbox anahtarı `mmpi566:case-outbox:v1:<userId>`; kullanıcı anahtarı izolasyonu uygulanır.
- Taslak TTL'i 30 gündür. JSON parse öncesi 8 MiB sınırı, en fazla dört sayfa, canonical page key, batch/page tutarlılığı, UUID, review timestamp ve metin sınırları doğrulanır.
- `serializeScan()` cevap/ölçüm/review verisini tutar; normalize piksel buffer'ı, preview blob URL'i ve original blob URL'i yazmaz. Taslaktan geri gelen sayfa veriyle kullanılabilir, görsel inceleme için yeniden okutma gerekir.
- Hızlı cevap dizisi `D`, `Y`, `B` (bilinçli boş) ve `-` (henüz girilmedi) alfabesiyle 566 karakter saklanır; `null` ile `undefined` karışmaz.
- "Kaydı Düzenle" çalışmaları taslağa `revisionOf` (UUID) ve `revisionReason` (≤200 karakter) alanlarıyla yazılır; F5 ve yeniden açılışta revizyon bağlamı korunur, `?duzenle` parametresi uygulama anında temizlendiği için iki kez tetiklenmez.
- Ağ hatası sonrası outbox en fazla 10 kayıt tutar. Aynı UUID v4 idempotency anahtarıyla yeniden gönderir; `mmpi_records.idempotency_key` unique/upsert sınırı çift kayıt riskini azaltır. Outbox girdileri de `revisionOf/revisionReason` taşır; kuyruktan yazılan revizyon bağlantısı kaybolmaz.
- Validation/auth/sunucu hatası ağ hatası değildir; outbox'tan çıkarılır ve kullanıcıya gösterilir. Sadece bağlantı belirtileri kuyruğa alınır.
- “Yeni işlem” açık onayla draft'ı ve aktif case state'ini siler; kuyruktaki başka kayıtları silmez. Sayfa/stream/blob temizliği reset, page remove, manual editor kapanışı ve workspace unmount noktalarında yapılır.

### 3.4 Case yöntemleri ve kayıt kapısı

- **Hızlı giriş:** 566 D/Y/boş cevabı tamamlanmadan ilerlemez.
- **Ham puan:** `RAW_SCORE_FIELDS` alanlarının tamamı ve tanımlı maksimumlar gerekir.
- **OMR:** dört farklı page number, tek 24 haneli batch ID, doğru fingerprint ve her maddenin ölçülmüş reliable/blank veya açık manual review kararı gerekir.
- Danışan formunda yaş 16–120, yerel takvim tarihi bugün/öncesi, cinsiyet ve zorunlu metinler doğrulanır; klinik bağlam 2.000, başvuru nedeni 500, meslek/eğitim 120 karakter sınırındadır.
- Kaydetme öncesi boş madde eşiği `MMPI_MAX_BLANK=30` aşılırsa durur. `clinicalTransferAllowed` her zaman `false` olan teknik sonuç özeti klinik kararı otomatik yetkilendirmez.

**Kaydı Düzenle (revizyon modeli):** Orijinal kayıt immutable olduğundan (bkz. 4.6),
cevaplar düzenlemek `src/records/recordEdit.ts` ile **yeni bir kayıt** üretir:
kayıt sayfasındaki "Kaydı Düzenle" (yalnız aktif psikolog + yalnız kendi kaydı)
`/islem?duzenle=<id>` açar; `CaseWorkspace` bu parametreyi RLS ile okur
(`getRecordDetail`), `buildEditStateFromRecord` danışan + cevap/ham puan durumunu
yükseltir ve `revisionOf=<orijinal id>` ile işaretlenmiş revizyon taslağına geçer.
OMR kaynaklı kayıtlar revizyonda optik payload kopyası DEĞİL, son optik durumun
(manuel düzeltmeler dahil) 566 cevabı quick yükü olarak taşınır (kayıt başına
~2-4 KB; MB'larca revizyon zinciri oluşmaz). Optik formun son hali, manuel
düzeltmeler ve denetim izi her zaman orijinal kayıtta kalır ve "Testi İncele"
ekranından görünür. Revizyon bağlantısı `CaseMeta.revisionOf/revisionReason`
(DB trigger'ı `case-meta` içeriğini method dışında sınırlamadığından mevcut
şemayla uyumlu) ile yazılır; kayıt detayında ve akışta "orijinali görüntüle"
bağlantılı revizyon bandı gösterilir. Yarım bir çalışma varsa düzenleme önce
açık onay ister; F5 güvenli (taslak `revisionOf` taşır).

---

## 4. Supabase veri modeli, mimarisi ve güvenlik sözleşmesi

### 4.1 Supabase mimarisi ve migration sistemi

Uygulamanın backend veri katmanı Supabase (PostgreSQL, Supabase Auth, PostgREST ve Deno Edge Functions) üzerinde çalışır. Depo (`supabase/migrations/`), veritabanı şemasının tek gerçek kaynağıdır (source of truth).

Migration'lar zaman damgalı beş SQL dosyasından oluşur ve kesin sıralı uygulanmalıdır:

1. `20260915000000_initial_schema.sql`: Temel `profiles` ve `mmpi_records` tabloları, `user_role` enum'u (`ADMIN`, `PSYCHOLOG`), Auth trigger'ı (`handle_new_auth_user`), temel RLS politikaları ve security-definer yardımcı fonksiyonları (`is_admin`, `is_psychologist`, `is_active_user`).
2. `20260919000000_expert_notes_and_audit.sql`: `mmpi_records` tablosuna `expert_notes` (≤ 4000 karakter) ve `notes_updated_at` kolonlarının eklenmesi; sunucu taraflı `audit_logs` denetim tablosu ve her insert/update/delete işlemini kaydeden `log_mmpi_record_change()` security-definer trigger'ı.
3. `20260919010000_record_integrity.sql`: İstemci tarafından doğrudan `profiles` mutasyonlarının engellenmesi (revoke insert/update/delete); aktif psikolog kontrolünün güncellenmesi; `mmpi_records` için yaş (`16-120`) ve ham veri yükü boyutu (`<= 8 MiB`) constraint'leri.
4. `20260919020000_record_immutability.sql`: Klinik kayıt alanlarının (`client_*`, `gender`, `age`, `raw_omr_answers`, `created_by`, `created_at` vb.) oluşturulduktan sonra değiştirilmesini engelleyen `protect_mmpi_record_fields()` trigger'ı ve yeni kayıt yükünü doğrulayan `validate_mmpi_record_intake()` trigger'ı.
5. `20260920000000_record_actions.sql`: Admin'in tüm kayıtlara uzman notu ekleyebilmesini, aktif psikoloğun ise kendi kaydına not ekleyebilmesini sağlayan güncel `mmpi_records_update` RLS politikası; Admin'in her kaydı, psikoloğun yalnızca kendi kaydını silebilmesini sağlayan `mmpi_records_delete` politikası; eksik kurulumlar için `expert_notes` kolonlarının güvenli idempotency kontrolü.

**Öncelik ve senkronizasyon kuralı:** Elle ad-hoc SQL çalıştırmak yerine `supabase db push` ile migration geçmişinin uygulanması esastır. Öncelik sırası:
`migration history → schema → RLS → functions → secrets`.

### 4.2 Veritabanı şeması ve kısıtlamaları

- **`public.profiles`**:
  * `id uuid primary key references auth.users(id) on delete cascade`
  * `email text`, `first_name text not null`, `last_name text not null`
  * `role public.user_role not null default 'PSYCHOLOG'`
  * `active boolean not null default true`
  * `created_at timestamptz`, `updated_at timestamptz`
  * İsim uzunluk constraint'i (2–80 karakter). Browser'dan INSERT/UPDATE/DELETE revoked; mutasyonlar yalnızca servis rolü kullanan Edge Function tarafından yapılır.

- **`public.mmpi_records`**:
  * `id uuid primary key default gen_random_uuid()`
  * `idempotency_key uuid not null unique`
  * `client_first_name text not null`, `client_last_name text not null` (1–80 karakter)
  * `gender text not null check (gender in ('Kadın', 'Erkek', 'Belirtmek istemiyor', 'Diğer'))`
  * `age integer not null check (age between 16 and 120)`
  * `occupation text not null`, `education text not null`
  * `application_date date not null` (Türkiye yerel saatine göre geleceğe kaçamaz)
  * `requested_by text not null`
  * `raw_omr_answers jsonb not null check (jsonb_typeof(raw_omr_answers) = 'array')`
  * `expert_notes text not null default '' check (char_length(expert_notes) <= 4000)`
  * `notes_updated_at timestamptz null`
  * `created_by uuid not null references public.profiles(id) on delete cascade`
  * `created_at timestamptz not null default timezone('utc', now())`

- **`public.audit_logs`**:
  * `id uuid primary key default gen_random_uuid()`
  * `actor uuid null` (işlemi yapan `auth.uid()`)
  * `action text not null check (action in ('record_insert', 'record_update', 'record_delete'))`
  * `target_table text not null` (`mmpi_records`)
  * `target_id uuid null`
  * `created_at timestamptz not null default timezone('utc', now())`
  * İstemciden INSERT/UPDATE/DELETE revoked; yalnızca Admin SELECT yetkisine sahiptir.

### 4.3 RLS (Row Level Security) ve rol matrisi

RLS, veritabanı seviyesinde açık (`enable row level security`) tutulur; hiçbir koşulda `disable row level security` veya `using (true)` uygulanmaz.

| Tablo / Eylem | Anonim | Psikolog (`PSYCHOLOG`, aktif) | Yönetici (`ADMIN`, aktif) |
| --- | --- | --- | --- |
| `profiles` SELECT | Engelli | Yalnız kendi profili (`auth.uid() = id`) | Tüm profiller |
| `profiles` INSERT/UPDATE/DELETE | Engelli | Engelli (Edge Function) | Engelli (Edge Function) |
| `mmpi_records` SELECT | Engelli | Yalnız kendi oluşturduğu kayıtlar (`created_by = auth.uid()`) | Tüm kayıtlar |
| `mmpi_records` INSERT | Engelli | Yalnız kendi adına (`created_by = auth.uid()`) | Engelli (klinik kayıt açamaz) |
| `mmpi_records` UPDATE | Engelli | Yalnız kendi kaydında uzman notu (`expert_notes`, `notes_updated_at`) | Tüm kayıtlarda uzman notu |
| `mmpi_records` DELETE | Engelli | Yalnız kendi oluşturduğu kaydı silebilir | Tüm kayıtları silebilir |
| `audit_logs` SELECT | Engelli | Engelli | Tüm loglar (`is_admin()`) |
| `audit_logs` YAZMA | Engelli | Yalnız trigger (`security definer`) | Yalnız trigger (`security definer`) |

### 4.4 Edge Function'lar (`admin-users`, `ai-interpretation`)

#### 4.4a Admin Edge Function (`admin-users`)

- **Konum:** `supabase/functions/admin-users/index.ts`
- **Yetki:** `SUPABASE_SERVICE_ROLE_KEY` yalnızca bu sunucu tarafı çalışma zamanında kullanılır.
- **Doğrulama:**
  1. Gelen isteğin `Authorization: Bearer <token>` başlığı çözülür ve Supabase Auth üzerinden doğrulanır.
  2. Çağıran kullanıcının `profiles` tablosundaki kaydı sorgulanır; `role === 'ADMIN'` ve `active === true` değilse işlem `403 Forbidden` ile reddedilir.
- **Desteklenen Eylemler:**
  * `create`: Yeni psikolog hesabı oluşturur (Auth `createUser` → `profiles` senkronizasyonu; profil oluşturulamazsa Auth kullanıcısı rollback edilir).
  * `set_active`: Psikolog hesabını aktif veya pasif yapar (Auth `ban_duration` ve profil `active` senkronizasyonu).
  * `delete`: Psikolog hesabını siler. Veri bütünlüğü için **önce Auth kullanıcısı silinir** (`adminClient.auth.admin.deleteUser(userId)`). `profiles` ve `mmpi_records` üzerindeki `ON DELETE CASCADE` ilişkisi sayesinde ilişkili tüm profil ve test kayıtları veritabanı tarafından temizlenir.
- **Hata Yönetimi:** Tüm reddedilmeler yapılandırılmış `{ error: string }` JSON yanıtı döner; istemciye hassas yığın izi sızdırılmaz.
  Veritabanı kaynaklı düşüşler (denetim izi/kısıt/RLS → `23502`, `42501`, `42703`, `42P01`, trigger) **500 + `supabase db push`** mesajıyla, Auth/istemci kaynaklılar **400** ile döner (`isDatabaseSideError`).
  İstemci tarafında `src/auth/adminApi.ts` → `explainEdgeFunctionError()` hatayı gerçek nedene göre ayırır:
  `FunctionsFetchError` (CORS/`ALLOWED_ORIGINS` ya da deploy yok), `FunctionsRelayError`, 401 (oturum), 403 (origin ya da rol),
  404 (hedef yok), 413, 429, 500 (deploy/schema). Bu yüzden "Edge Function bağlantısını kontrol edin" gibi ayırt edilemez tek
  cümle yerine eyleme dönüştürülebilir mesaj gösterilir (`tests/adminApiErrors.test.ts`).
  Doğrulama hataları `ValidationError` ile `400` (mesaj gösterilir), beklenmeyen istisnalar günlüğe yazılıp **ham mesaj istemciye
  taşınmadan** `500` döner; işleyicinin tamamı en dışta `try/catch` içindedir (yakalanmayan istisna CORS başlıksız yanıt üretip
  tarayıcıda "bağlantı hatası" gibi görünürdü). Aynı sözleşme `tests/edgeFunctions.test.ts` ile kilitlidir.

#### 4.4b AI karar desteği Edge Function (`ai-interpretation`)

- **Konum:** `supabase/functions/ai-interpretation/index.ts`; istemci `src/ai/aiInterpretation.ts`, arayüz `src/components/results/AiInterpretationPanel.tsx` (kayıt detayı + İşlem kontrol adımı).
- **Amaç:** Hesaplanan MMPI profilinin (T skorları, geçerlik bulguları) Türkçe, yapılandırılmış, ≤650 kelimelik **karar destek** yorumu. Tanı koymaz, tedavi önermez; model sistem prompt'u bu kurallarla kilitlenir ve her çıktının altında kalıcı sınır bildirimi vardır.
- **Doğrulama katmanları (admin-users ile aynı sözleşme +):**
  1. CORS yalnız `ALLOWED_ORIGINS` (boşsa localhost-only); JWT kapıda (`config.toml` `verify_jwt = true`) ve fonksiyonda (`auth.getUser`) doğrulanır; profil aktif + ADMIN/PSYCHOLOG olmalı.
  2. `mode=record` ise kayıt service role ile okunur ve çağrının o kayda erişim hakkı (sahip veya Admin) doğrulanmadan yorum üretilmez — IDOR koruması.
  3. LLM'e giden içerik yalnız istemcinin gönderdiği profil özetinin **alan alan doğrulanmış** halidir (`safeSummary`: sayı aralıkları, ölçek kümesi, metin uzunlukları); serbest metin prompt'u istemcide yaşamaz. Görüntü/piksel verisi asla gönderilmez. Özet **isimsizdir**: danışan ad/soyadı hiçbir istem alanına katılmaz (yalnız yaş + cinsiyet); istemci yine de ad gönderse bile sunucu onu özete almaz (`tests/aiSummaryPrivacy.test.ts` regresyonla kanıtlar).
  4. `AI_API_KEY` yalnız fonksiyon çalışma zamanında; tanımlı değilken **503 "henüz yapılandırılmamış"** döner ve arayüz bunu
     gösterir. Durum kodlu hatalar `FunctionError` (Error alt sınıfı) ile taşınır: düz nesne fırlatmak `instanceof Error`
     kontrolünü bozar ve 503/502 mesajlarını genel "tekrar deneyin"e düşürürdü (`tests/edgeFunctions.test.ts` bunu kilitler).
     LLM sağlayıcı hatası **ayırt edilebilir mesajlarla** `502` döner: 401/403 → anahtar doğrulaması (Gemini'de Generative
     Language API/kısıt ipucu), 404 → `AI_MODEL` bulunamadı, 429 → kota/hız sınırı, safety bloklaması → filtre mesajı;
     beklenmeyen istisnalar `500` döner. Ham sağlayıcı mesajı istemciye taşınmaz; durum kodu + kısa özet yalnız sunucu
     günlüğüne yazılır (`logUpstreamFailure`). Ağ/zaman aşımı da `502`.
     En iyi çaba hız limiti: kullanıcı başına 1 istek/10 sn + 20 istek/saat.
  5. **LLM sağlayıcı yolu:** `callModel` → `resolveAiProvider()` (gemini|openai); seçim sırası `AI_PROVIDER` > `AI_API_BASE`
     hostu > `AI_MODEL` adı (`gemini*`) > anahtar biçimi ipucu (`AIza.*`/`AQ.*`) > OpenAI uyumlu varsayılan. Gemini **yerel**
     `generateContent` ucuna `x-goog-api-key` başlığıyla gider (OpenAI uyumlu `/chat/completions` yolu Google'ın 2026 `AQ.*`
     "Auth key"lerini 401/403 ile reddettiği için kullanılmaz); OpenAI yolu `Bearer` + `/chat/completions` kullanır.
     Anahtar biçimi yalnız sağlayıcı seçimi ipucudur — anahtar doğrulaması Google tarafında yapılır, hiçbir zaman anahtarın
     biçimsel doğrulaması yapılmaz (`tests/edgeFunctions.test.ts` Gemini yolunu ve mesaj ayrımını kilitler).
  6. İstemci tarafı 24 saatlik cihaz önbelleği `mmpi566:ai:record:<id>` / `mmpi566:ai:draft` anahtarlarında; özet hash'i değişince geçersiz sayılır, "Yeniden Oluştur" önbelleği atlar.
- **Secrets:** `AI_API_KEY` (zorunlu), `AI_MODEL` (Gemini için `gemini-2.5-flash`, OpenAI için `gpt-4o-mini`; `gemini*` ile başlıyorsa sağlayıcı otomatik Gemini), `AI_PROVIDER` (opsiyonel `gemini`/`openai`), `AI_API_BASE` (opsiyonel; Gemini yerel uç noktası `https://generativelanguage.googleapis.com/v1beta`, OpenAI uyumlu `https://api.openai.com/v1`), `ALLOWED_ORIGINS` (admin-users ile aynı). `supabase/README.md` §5 dağıtım komutlarını içerir.

### 4.5 Secrets, CORS ve `ALLOWED_ORIGINS` güvenlik sözleşmesi

- Edge Function, tarayıcıdan gelen `Origin` başlığını sıkı bir kontrolden geçirir (`isAllowedOrigin`).
- **`ALLOWED_ORIGINS` secret'ı:** Production ortamında uygulamanın barındırıldığı gerçek alan adları (örn. `https://app.example.com`, `http://localhost:5173`) Supabase Dashboard veya CLI üzerinden secret olarak tanımlanmalıdır:
  `supabase secrets set ALLOWED_ORIGINS="https://alanadiniz.com,http://localhost:5173"`
- **Boş allowlist davranışı:** `ALLOWED_ORIGINS` tanımlanmamışsa güvenlik gereği `*` (wildcard) uygulanmaz; yalnızca yerel `localhost` ve `127.0.0.1` origin'lerine izin verilir. Canlı ortamda secret ayarlanmadığında harici origin istekleri `403 Forbidden` veya CORS preflight engeliyle karşılaşır.
- Secret değerleri asla koda, commit'e, `.env.example` dosyasına veya frontend bundle'ına yazılmaz.

### 4.6 Kayıt yaşam döngüsü, değişmezlik ve uzman notu

1. **Oluşturma (Insert):** Aktif psikolog tarafından istemcide tamamlanan test `upsertRecord` ile `mmpi_records` tablosuna yazılır. İdempotency anahtarı ile mükerrer gönderim önlenir.
2. **Değişmezlik (Immutability):** `protect_mmpi_record_fields()` trigger'ı sayesinde klinik alanlar (`client_*`, `gender`, `age`, `raw_omr_answers`, `created_by`, `created_at` vb.) oluşturulduktan sonra asla güncellenemez.
3. **Uzman Değerlendirme Notu:** Kayıt sonrasında `updateExpertNotes()` ile güncellenir. Yalnızca `expert_notes` ve `notes_updated_at` kolonları mutasyona uğrar. Metin istemcide ve veritabanı check constraint'i ile **en fazla 4000 karakter** olarak sınırlandırılır. Bu not yazdırma raporunda (`MMPIPrintReport`) "Uzman Değerlendirme Notu" başlığı altında rapora aktarılır.
4. **Silme (Delete):** Admin her kaydı, psikolog ise kendi kaydını kalıcı olarak silebilir. `count: 'exact'` doğrulaması kullanılır. Silme işlemi sonrasında `audit_logs` tablosuna `record_delete` kaydı işlenir. Soft-delete yoktur.
5. **Liste üst sınırları:** Psikolog kendi kayıtlarında en yeni **100**, Admin tüm kayıtlarda en yeni **200** satırı görür
   (`OWN_RECORDS_LIMIT` / `ALL_RECORDS_LIMIT`). Sınıra ulaşıldığında arayüz sayaçta `+` gösterir ve "daha eski kayıtlar
   listelenmiyor" bilgisini verir; sessiz kırpma yoktur. Sayfalama henüz yoktur.
6. **Hata çevirisi:** `describeMutationError()` PostgREST kodlarını (42703/PGRST204, 42P01/PGRST205, 42501, 23502, P0001,
   PGRST301, 22P02, 23503/23505/23514) kullanıcı mesajına çevirir ve `code`/`message`ı konsola yazar. PostgreSQL'in
   `details` alanı **bilinçli olarak loglanmaz**: kısıt ihlallerinde satırın tamamını içerebilir (danışan verisi).
7. **Revizyon:** Cevaplar "Kaydı Düzenle" ile orijinali değiştirilmeden yeni kayda yazılır (bkz. 3.4): yeni `case-meta` `revisionOf` (orijinal UUID) + `revisionReason` taşır; `validate_mmpi_record_intake` payload şemasını method üzerinden doğruladığı için revizyon meta alanları mevcut şemaya migration gerektirmeden uyumludur. OMR revizyonları optik payload taşımaz — optik formun son hali orijinalde kalır.

---

## 5. Form, scanner ve OMR hattı

### 5.1 Form sözleşmesi

Tek `FormDefinition` (`src/omr/formDefinition.ts`) HTML/PDF geometri ve OMR coordinate source'tur:

- A4 portrait: 210 × 297 mm;
- 4 sayfa, 1–144 / 145–288 / 289–432 / 433–566;
- 3 sütun × 48 satır, merkezler arası 4,25 mm;
- iki cevap alanı D/Y, toplam 566 × 2 = 1.132 bubble;
- 5 × 5 mm dört alignment mark; QR alanı x=164, y=18, 26 × 26 mm;
- canonical raster 8 px/mm = 1680 × 2376;
- QR metni `M566:<version>:<fingerprint>:<batchId>:<page>:<total>`; batch ID 24 uppercase hex.

`src/print/renderFormPdf.ts` aynı tanımdan bağımsız, canvas/browser gerektirmeyen PDF çizer; `tests/pdfForm.test.ts` ve `verify:pdf` PDF geometrisini dosyadan geri okur. Runtime Form sekmesi `MMPI-566-optik-cevap-formu.pdf` byte'larını kullanır. Bu PDF ve `FORM_SET_CODE`, farklı günlerde üretilen aynı doğrulanmış setin birbiriyle okunabilmesini sağlar; yeni danışan için scanner **Yeni Set / Sıfırla** ile eski sayfaları kilitler.

### 5.2 Dosya ve kamera girişleri

`src/scanner/imageIO.ts` dosyayı MIME/uzantıya güvenmeden magic-byte ile sınıflandırır: JPEG, PNG, WEBP, GIF, HEIC/HEIF, AVIF ve PDF. Görüntü decode edilmeden önce dosya/dimensions sınırları uygulanır. Kamera `getUserMedia` ile `facingMode: environment` idealini ister, canlı 700 ms advisory frame'i brightness/sharpness/contrast/page-box tahminiyle gösterir, capture sonrası stream'i durdurur. Kamera için HTTPS gerekir; localhost geliştirme istisnasıdır.

PDF `src/scanner/pdfIO.ts` içinde pdf.js worker'ı bundle içinden oluşturulur; remote/CDN worker veya remote PDF fetch kullanılmaz. Worker stream filter allowlist, JPX/JBIG2/Crypt reddi, decoded buffer budget, page/render timeout, abort ve worker/port/blob cleanup uygular. PDF görüntüleri browser canvas'ta rasterize edilip ortak scanner hattına girer.

Giriş limitleri (`src/scanner/imageIO.ts`):

| Limit | Değer |
| --- | ---: |
| Tek dosya | 24 MiB |
| Batch dosya sayısı | 12 |
| Batch byte | 96 MiB |
| Kaynak görüntü | 40 MP, 16.000 px kenar |
| OMR input | 12 MP, 8.000 px kenar |
| PDF dosya sayfası | 12 |
| İşlem toplam page budget | 24 |
| OMR canonical warp | 8.000.000 px |

### 5.3 Otomatik scanner ve OMR

Kamera/dosya görüntüsü `src/scanner/scanAndAnalyze.ts` strateji ladder'ından geçer:

1. document quad detection → paper crop → homography/perspective warp → shadow/white/contrast/sharpen cleanup;
2. 8 px/mm shadow-clean veya raw warp fallback;
3. gerekirse warp'sız isotropic upscale fallback.

Her strateji sonunda aynı `src/omr/analyzePage.ts` çağrılır; strategy ladder OMR karar sınırını bypass etmez. `analyzePage` sırasıyla grayscale/isolation, dört yön QR decode, page identity parse, QR-to-page prediction, four alignment square detection, homography, geometry/containment/QR consistency, canonical warp, bubble-ring refinement, image quality ve item mark detection yapar.

Alignment kareleri bağlı bileşen + çoklu threshold/square-likeness/salvage pass ile bulunur. Kalite raporu ideal/inceleme/fatal ayrımı yapar; fatal kalite cevap üretmeden sayfayı reddeder. Bubble detector merkez/peripheral/background örnekleri ve komşu izolasyonu kullanır. `confidence` işaret gücü sezgisidir; olasılık değildir.

### 5.4 Sonuç güvenlik sınırı ve manuel inceleme

`ReadStatus`: `unread`, `blank`, `single`, `multiple`, `ambiguous`, `reliable`, `invalid`.

- Yalnız measured `reliable` otomatik D/Y cevabıdır.
- Measured `blank`, gerçek boş (`?`) cevaptır.
- `single`, `multiple`, `ambiguous`, `unread`, `invalid` otomatik klinik D/Y/null'a çevrilmez.
- `ManualReview` D/Y/null ve timestamp taşır; `ManualReviewEvent` reviewer, recordedAt, previous/next ve undo olayını append-only history olarak tutar.
- Review hedefi form item'ı olmalı; timestamp geleceğe kaçamaz (en fazla 60 saniye clock skew). `canCreateRecord`, `isEffectiveItem`, `scanToAnswers` tüm maddelerin ölçülmüş veya açıkça insan tarafından çözümlenmiş olmasını ister.
- Original normalized görüntü ve manual crop yalnız client blob/canvas yaşam döngüsündedir; raw camera image Supabase'e gönderilmez.

Manual corner editor pointer/touch sürükleme, focusable corner handle'ları, düşük çözünürlüklü canlı warp preview ve confirm'da production-resolution warp kullanır. Bu fallback, kullanıcı köşeleri seçtikten sonra yine `analyzePage`'e döner; ayrı ve doğrulanmamış bir OMR motoru değildir. Keyboard/AT kod sözleşmesi uygulanmıştır; gerçek browser ve yardımcı teknolojiyle corner hareketi bu audit ortamında **DOĞRULANMADI**.

---

## 6. Puanlama, sonuç ve PDF raporu

- `src/scoring/mmpiKeys.ts` D/Y anahtarlarını, Türk norm M/SD değerlerini, cinsiyetli Mf dönüşümünü, K correction table'ı ve ölçek metadata'sını taşır.
- `src/scoring/mmpiScoring.ts` T dönüşümü, raw/k-corrected klinik ölçekler, `?`/L/F/K validity ve iki noktalı profil kodunu üretir. K düzeltmesi Hs, Pd, Pt, Sc, Ma için uygulanır.
- Geçerlik analizi: boş ≥31 veya F ham ≥23 geçersiz; F ham 16–22 şüpheli uyarı; F-K kritik sınırı 16; L/F/K kaynak bantları ve 15 validity configuration ayrıca gösterilir.
- Cevap dizisi varsa TR endeksi, Dikkatsizlik, Goldberg/Taulbee/Peterson, PDI-IV bağlamlı 11 ölçek, MAC/MAC-R/AAS/ICAS/SAP, Wiggins içerik, özel ölçekler, kritik madde ve otomatik izlenim katmanı hesaplanır. Ham puan girişinde madde düzeyi katman bulunmaz; kaynak tablo bantları gösterilir.
- `recordProfile.ts` kayıt ayrıntısında relational gender ile payload gender çelişirse profil üretmez. OMR'de unresolved item varsa kayıt profili sessizce üretmez.
- Scoring engine `2.0.0` ve norm etiketi `CaseMeta` içine yazılır. Kaynak kesinliği `src/components/SourcesPage.tsx` ve `docs/kaynak-denetimi.md` ile dürüstçe sınıflandırılır; doğrulanamayan yerel rehber künyelenmiş bilimsel kaynak gibi sunulmaz.

### Ekran raporu ve yazdırma

`RecordDetailPage` sonuçları sekmeli progressive-disclosure düzeninde gösterir: Genel Bakış, Geçerlik, Klinik Ölçekler, Kod, Türetilmiş, Desenler/Sözlük, Kritik, Soru Yanıtları ve **en sonda Yapay Zekâ Yorumu**. Ekran yazdırılmaz. `MMPIPrintReport` yalnızca kayıt özeti, profil/tablolar, validity, derived/critical bulgular ve varsa uzman notunu profesyonel print-only DOM'a koyar; `window.print()` bu raporu `@media print` ile yazdırır. `document.title`, `MMPI_Klinik_Raporu_<Danisan>_<gg-AA-yyyy>` dosya adı önerisine ayarlanır.

Rapor ve ekrandaki kaynak tabanlı “olası tanı”/izlenim ifadeleri tanı değildir; footer, FAQ, kullanım koşulları ve uzman notu yardım metni klinik kararı uzmana bırakır. Uzman notu `maxLength=4000` ve DB check ile korunur; not rapora aktarılır.

**Yapay Zekâ Yorumu:** Sonuç panelinin **son sekmesi** (`MmpiResultsTab='ai'`, etiket "Yapay Zekâ Yorumu") — kayıt detayı + İşlem akışının kontrol adımı aynı `MMPIResultsPanel` içinde görür; ayrı bir sayfa bölümü ya da yüzen baloncuk DEĞİLDİR. `AiInterpretationPanel` sekmeye özel hero kartı, iskeletli yoğun durumu, sonuç kartı ve kalıcı sınır bildirimiyle hesaplanan profilin yapay zekâ destekli karar destek yorumunu `ai-interpretation` Edge Function'ı üzerinden üretir (güvenlik sözleşmesi bkz. 4.4b). Yorum kopyalanabilir ve (yetkiliyse) uzman notu taslağına eklenebilir. Yazdırma raporuna dahil DEĞİLDİR — karar destek çıktısı yalnız ekran katmanındadır.

Form PDF yazdırma ile klinik rapor yazdırma ayrıdır: FormKit'in **Yazdır/İndir/Yeni sekmede aç** eylemleri doğrulanmış optik form PDF'sini kullanır; klinik rapor düğmesi tarayıcının print pipeline'ını kullanır.

---

## 7. UI, responsive ve accessibility

- Stil katmanları ekran token'ları (`screen.css`), tema (`theme.css`), site chrome (`site.css`), workspace/results (`workspace.css`), scanner (`scanner.css`, `scanner-enhancements.css`), form (`form.css`) ve print (`print.css`) olarak ayrıdır. `theme.css` yalnız screen media içinde olduğu için A4 form/PDF print geometrisini etkilemez.
- DM Sans gövde, Newsreader başlık font stack'i remote font yüklemeden kullanılır. Standalone CSP `font-src 'none'` olduğu için fallback font normaldir.
- Workspace header, scanner source tablist, status/alert, confirm dialogs, form labels, image alt text, results disclosure ve focus-visible stilleri mevcuttur. Ana workspace, Admin ve scanner source tab listelerinde `role=tab`, `aria-selected`, `aria-controls` ve Home/End/Arrow klavye dolaşımı uygulanmıştır. Gerçek browser/AT davranışı bu auditte **DOĞRULANMADI**.
- Responsive kırılımlar `screen.css`/`theme.css`/`workspace.css`/`scanner*.css` içinde 900, 800, 760, 720 ve 560 px civarındadır; scanner grid ve sonuç tabloları mobilde taşma/stack düzenlerine iner.
- `src/styles/mobile.css` yalnızca ≤720/480 px medya sorguları içerir ve `main.tsx`'te diğer katmanlardan **sonra** yüklendiği için masaüstü görünümü değişmez. Hedefleri: sıfır yatay kaydırma (küresel taşma koruması + `min-width:0` + `overflow-wrap`), başlık/kullanıcı alanı sarmalama, yükleme kutusu ve hata kartlarının ekrana sığması, 2x2 sayfa kartı, 2 sütunlu metrik şeridi, tam genişlik eylem düğmeleri.
- `ManualCornerEditor` pointer/touch yanında dört köşe handle'ı focusable `role=button` olarak sunar; ok tuşlarıyla küçük/büyük (Shift) adımlı taşıma ve Türkçe aria label'ları vardır. Gerçek ekran okuyucu ve browser keyboard testi **DOĞRULANMADI**.
- Reduced-motion, mobil browser, iOS camera izinleri, gerçek Safari/Firefox/Chrome PDF viewer ve ekran okuyucu kombinasyonları **DOĞRULANMADI**. Bu, automated test PASS'i değildir; release öncesi cihaz matrisi gerekir.

---

## 8. Güvenlik, gizlilik ve bağımlılıklar

### 8.1 Frontend güvenliği

- İlk statik taramada `src` içinde `dangerouslySetInnerHTML`, `eval`, service-role frontend referansı veya debug `console.log` bulunmadı. React text rendering escape edilir.
- Upload görüntüleri/PDF sunucuya gönderilmez; blob URL'ler revoke edilir. SVG MIME'ı magic-byte imzası olmadığı için kabul edilmez.
- Standalone build `scripts/build.mjs` yalnız `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` değerlerini üretime alır; inline script SHA-256 CSP ile pinlenir, default-deny `connect-src` yapılandırılan Supabase origin'iyle sınırlanır, dış font/script yoktur.
- PDF worker CDN'e gitmez; worker patch sürümü `pdfjs-dist 6.3.289` ile pinlidir.
- Draft localStorage'dadır ve aynı origin'deki browser JavaScript erişim modeline tabidir; ortak cihazda taslak bırakılmamalıdır. Taslakta görüntü byte'ı tutulmaz, ancak danışan ve cevap verisi tutulur.
- Supabase anon/publishable key gizli kabul edilmez; gerçek güvenlik Auth/RLS/Edge Function'dadır. Service-role secret yalnız server-side Function'da olmalıdır.
- 2026-09-21 ek denetimi (revizyon + AI + mobil): `src` yeniden tarandı — `dangerouslySetInnerHTML`/`eval`/`innerHTML` hâlâ yok; link interceptor yalnız aynı-origin `<a>`'yı yakalar (`javascript:` asla). `ai-interpretation` fonksiyonu statik olarak denetlendi: CORS allowlist, JWT (kapı + fonksiyon), rol/aktiflik, IDOR (kayıt sahipliği), sayısal özet doğrulama, hız limiti, 64 KB gövde sınırı, secret yalnız runtime. `recordEdit` yalnız RLS'li `getRecordDetail` üzerinden çalışır; `revisionOf` istemciden UUID olarak DB'ye gitmeden önce `buildCaseMeta` içinde doğrulanır. Depoda service-role/anon secret veya API key commit'i bulunamadı (yalnız `.env.example` şablonu).

### 8.2 Backend ve operasyon güvenliği

- RLS canlı PostgREST davranışı, migration uygulanma durumu ve Edge Function CORS/Auth **DOĞRULANMADI**; yalnız SQL/TypeScript statik incelemesi yapıldı.
- Supabase production origin'i `ALLOWED_ORIGINS` içine eklenmeden Admin kullanıcı işlemleri çalışmamalıdır. Preview origin'i de geçici test için ayrıca izin ister.
- `npm ci` lockfile'a bağlıdır; package sürümleri `package.json`/`package-lock.json` ile sabittir. Runtime dependency'ler React, Supabase, jsQR, qrcode, pdfjs-dist ve noble hashes; build/test dev dependency'leri Vite, TypeScript, tsx, esbuild, canvas/types paketleridir.
- Lint veya browser E2E script'i yoktur. SAST/DAST, npm audit ve gerçek secret scanning bu auditin otomatik CI contract'ında değildir; her release'te ayrıca çalıştırılmalıdır.

### 8.3 KVKK veri akışı özeti

| Veri | Nerede | Süre/temizleme |
| --- | --- | --- |
| Auth session | `sessionStorage` | Sekme kapanışı veya kullanıcı logout/temizleme |
| Taslak/outbox | kullanıcı anahtarlı `localStorage` | Taslak 30 gün TTL; “Yeni işlem”/tarayıcı temizliği |
| Raw camera/PDF pixels | client memory/blob/canvas | Akış, page removal/reset/unmount; server'a gönderilmez |
| Onaylı intake/raw/OMR payload | Supabase `mmpi_records` | Kurumun retention/silme politikasına bağlı; delete kalıcıdır |
| Action metadata | Supabase `audit_logs` | DB retention politikasına bağlı; yalnız Admin select |
| AI yorum isteği (yalnız isteğe bağlı bölüm) | dış dil modeli sağlayıcısına | **isimsiz**: yalnız sayısal profil + cinsiyet/yaş; ad/soyad ve görsel gönderilmez (KVKK m.4/3-d); sonuç 24 saat cihaz önbelleğinde |

Bu teknik davranış KVKK hukuki danışmanlığı değildir. Barındırma bölgesi, veri işleme hukuki
sebebi, saklama/imha süresi, danışan aydınlatması ve (AI etkinse) dil modeli sağlayıcısıyla
veri işleme sözleşmesi kurum/uzman tarafından belirlenmelidir.

---

## 9. Test ve doğrulama sözleşmesi

### 9.1 Otomatik komutlar

| Komut | Kapsam | Bu audit snapshot'ı |
| --- | --- | --- |
| `npm ci` | lockfile ile temiz bağımlılık kurulumu | **DOĞRULANDI** — 74 paket, 0 vulnerability |
| `npm run typecheck` | `tsc --noEmit`, strict/noUnused | **DOĞRULANDI** |
| `npm test` | `tsx --test tests/*.test.ts`; OMR/scanner, draft, result safety, PDF, build, print, router, kayıt/Edge Function hata çevirisi, MMPI puanlama/yorum denetim kilitleri ve teşhis betiği sözleşmesi | **375/375 DOĞRULANDI** (36 suite; 21 Eylül snapshot'ında 285/285 idi) |
| `npm run diagnose:supabase` | canlı proje teşhisi (migration/RLS/grant/trigger + iki Edge Function CORS); yazma testi yalnız `--allow-destructive` ile | **DOĞRULANMADI** — bu ortamdan canlı projeye erişim yok (betiğin kendisi ve sözleşmesi `tests/diagnostics.test.ts` ile doğrulanır) |
| `npm run verify:pdf` | hazır/üretilmiş form PDF byte/geometri/QR doğrulaması | **DOĞRULANDI** — 4 A4, 566 madde, 1.132 bubble |
| `npm run build` | typecheck + standalone `dist/index.html`, tracked `optik-form.html` üretimi (`dist/_redirects` yalnızca `PAGES_REDIRECTS=1` ile; `dist/_headers` HTTP güvenlik başlıkları her derlemede) | **DOĞRULANDI** |
| `git diff --check` | whitespace/diff hygiene | **DOĞRULANDI** |
| `npm audit --audit-level=high` | advisory scan | **DOĞRULANDI** — 0 vulnerability |

### 9.2 Test kategorileri

- Form layout: 4 A4 sayfa, item ranges, header/QR/registration mark containment, HTML/PDF eşleşmesi.
- Identity/QR: fingerprint, batch/page/total parse, foreign/missing/duplicate page protections.
- Geometry/OMR: homography/similarity, orientation 90/180/270, 17°/projective distortion, page isolation, alignment, bubble rings, peripheral isolation, blur/shadow/low-light, multiple/ambiguous/blank/reliable statuses.
- Scanner: magic-byte file gate, dimensions/bytes, PDF worker allowlist/buffer/timeouts, camera advisor, enhancement, comparison, manual warp.
- Lifecycle: user-key draft isolation, TTL/corrupt JSON, no image persistence, outbox shape/size/attempts, exact local date, landing/resume decisions at code level.
- Result boundary: unresolved OMR remains pending, measured blank is distinct, manual review/history/undo and record gate do not grant unearned clinical transfer.
- Scoring/report: Turkish norms/K correction/validity/config/derived/critical/source labels, report rendering, print path separation.
- **Raw-score round trip** (`tests/rawScoreRoundTrip.test.ts`): ham puan yönteminin uçtan uca regresyon testi. Elle hesaplanmış referans T puanları (yayınlanan Türk normları + K=3 düzeltme tablosu) üzerinden K düzeltmesi, T dönüşümü, Kadın Mf ters işareti, 20–120 sıkışması, profil kodu ve `RAW_SCORE_MAX`/`buildRawPayload` sınır doğrulaması kanıtlanır.
- **AI privacy** (`tests/aiSummaryPrivacy.test.ts`): yapay zekâ istemine giden özetin isimsiz olduğunu (ad/soyad hiçbir alana sızmaz, yalnız sayısal profil + yaş/cinsiyet) ve yaş sınırı dışındaysa kimlik bağlamının hiç gönderilmediğini kanıtlar.
- Standalone build: no source imports, one inline script, CSP hash, embedded PDF bytes and footer/print separation.
- **Kayıt/Edge Function hata çevirisi** (`tests/recordErrors.test.ts`, `tests/adminApiErrors.test.ts`): PostgREST kodlarının (42703/PGRST204, 42P01/PGRST205, 42501, 23502, P0001, PGRST116, PGRST301/302) eyleme dönüştürülebilir mesaja çevrildiğini; `details` alanının (satır içeriği) mesaja sızmadığını; Edge Function hata sınıflarının (Fetch/Relay/Http) ve HTTP durumlarının (401/403/404/413/429/500) ayrı mesajlara gittiğini kanıtlar.
- **Edge Function sözleşmesi** (`tests/edgeFunctions.test.ts`): iki fonksiyonun kaynağı esbuild ile derlenir (Deno kodunun
  tsconfig kapsamı dışında olması nedeniyle sözdizimi hatası ancak deploy'da görülürdü); işleyicinin en dışta `try/catch` ile
  sarıldığı, ham `error.message`'ın istemciye taşınmadığı, `console.log` ile gövde verisinin loglanmadığı, CORS allowlist'i ve
  Bearer doğrulamasının korunduğu, `ai-interpretation`'da durum kodlarının `FunctionError` ile taşındığı ve `admin-users`'ta
  doğrulama/veritabanı hatası ayrımının (`ValidationError` → 400, `isDatabaseSideError` → 500 + `db push`) sürdüğü kanıtlanır.
  `ai-interpretation` için ayrıca **Gemini yerel yolu** (`generateContent` + `x-goog-api-key`, `callGemini` gövdesinde
  `Authorization` başlığı olmaması), sağlayıcı otomatik seçimi (`AI_PROVIDER` / model adı / `AIza.*`-`AQ.*` anahtar ipucu) ve
  sağlayıcı hata mesajlarının ayrımı (401/403-anahtar, 404-`AI_MODEL`, 429-kota, safety filtresi) kilitlenir — Google'ın 2026'da
  `AIza.*` yerine vermeye başladığı `AQ.*` anahtarlarının OpenAI uyumlu yolda 401 ile kırılması regresyonu.
- **Teşhis sözleşmesi** (`tests/diagnostics.test.ts`): `scripts/diagnose-supabase.mjs` sözdizimi, beklenen migration listesinin `supabase/migrations/` ile birebir aynı kalması, yazma testinin yalnız açık bayrakla çalışması ve `TROUBLESHOOTING.md` çözüm sırasının belgelenmesi.

### 9.3 Manuel veya canlı doğrulama gerektirenler

Aşağıdakiler otomatik testler sayesinde PASS sayılamaz ve bu ortamda **DOĞRULANMADI**:

- gerçek Supabase project üzerinde migration `db push`, login/logout/expired session;
- iki farklı kullanıcıyla cross-user RLS/IDOR, Admin/psychologist note/delete, audit log ve Edge Function rollback;
- `ai-interpretation` fonksiyonunun `AI_API_KEY` ile canlı LLM çağrısı, hız limitine düşme ve `ALLOWED_ORIGINS` dışı origin'in CORS ile reddi (secret canlı ortamda ayarlanmalı);
- gerçek iOS/Android kamera, HTTPS permission, Safari/Firefox/Chrome PDF viewer, gerçek yazıcı/kâğıt/kalem/fotokopi;
- gerçek fotoğraf kalibrasyonu ve klinik kabul doğruluğu;
- responsive cihaz matrisi, keyboard-only manual corners, ekran okuyucu ve reduced-motion;
- production hosting SPA fallback, `ALLOWED_ORIGINS`, Supabase region/backup/retention.
  (HTTP güvenlik başlıkları — HSTS, nosniff, frame-ancestors/X-Frame-Options, Referrer-Policy,
  Permissions-Policy, COOP/CORP — artık `dist/_headers` ile derlemeden çıkıyor; canlı yayında
  başlıkların uygulandığı `curl -I` ile bir kez doğrulanmalıdır.)

CI (`.github/workflows/ci.yml`) `npm ci`, typecheck, test, PDF verify, build ve tracked `optik-form.html` diff kontrolü yapar. Lint/E2E/manual Supabase step'i yoktur.

---

## 10. Production Deployment (Üretim Dağıtım Kılavuzu)

Bu bölüm, repository'deki güncel kod tabanı ile canlı Supabase ve frontend barındırma ortamlarının uçtan uca senkronizasyonu için gerçek operasyonel adımları tanımlar.

### Mantıksal ve Operasyonel Dağıtım Akışı (10 Adım)

1. **Pull latest code:**
   ```bash
   git checkout main
   git pull origin main
   ```
   Çalışma ağacının temiz olduğunu (`git status`) ve conflict bulunmadığını doğrulayın.

2. **Verify migrations:**
   `supabase/migrations/` altındaki 5 migration dosyasının varlığını ve sırasını kontrol edin:
   - `20260915000000_initial_schema.sql`
   - `20260919000000_expert_notes_and_audit.sql`
   - `20260919010000_record_integrity.sql`
   - `20260919020000_record_immutability.sql`
   - `20260920000000_record_actions.sql`

3. **Apply migrations:**
   Supabase CLI ile projeye bağlanın ve tüm bekleyen migration'ları uygulayın:
   ```bash
   npx supabase login
   npx supabase link --project-ref <SUPABASE_PROJECT_REF>
   npx supabase db push
   ```
   *(CLI kullanılamıyorsa, `supabase/migrations/` dosyalarındaki SQL ifadeleri Supabase Dashboard SQL Editor üzerinden sırayla çalıştırılabilir).*

4. **Deploy Edge Functions:**
   Kullanıcı oluşturma, aktiflik yönetimi ve kullanıcı silme işlemlerini yürüten güncel Edge Function'ı deploy edin:
   ```bash
   npx supabase functions deploy admin-users
   npx supabase functions deploy ai-interpretation   # yapay zekâ yorumu kullanılacaksa
   ```

5. **Verify secrets & CORS:**
   Uygulamanın çalıştığı origin'lerin (production domain ve localhost) Edge Function tarafından kabul edilmesi için `ALLOWED_ORIGINS` secret'ını ayarlayın:
   ```bash
   npx supabase secrets set ALLOWED_ORIGINS="https://app.example.com,http://localhost:5173"
   ```
   `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` Supabase çalışma zamanı tarafından otomatik sağlanır.
   Yapay zekâ karar desteği kullanılacaksa anahtar yalnızca fonksiyon çalışma zamanında tutulur.
   Google Gemini anahtarları (`AIza.*` / 2026'dan itibaren `AQ.*`) için (yerel `generateContent` yolu otomatik seçilir):
   ```bash
   npx supabase secrets set AI_API_KEY=AQ.Ab... AI_MODEL=gemini-2.5-flash
   ```
   OpenAI uyumlu uç nokta için:
   ```bash
   npx supabase secrets set AI_API_KEY=sk-... AI_PROVIDER=openai AI_MODEL=gpt-4o-mini
   ```
   Aynı adımda canlı projeyi otomatik doğrulayın (salt-okunur):
   ```bash
   npm run diagnose:supabase        # migration/şema/RLS/grant/trigger + iki fonksiyonun CORS'u
   ```

   Canlıda hata görülürse (`400`, "Kayıt bulunamadı…", "Kullanıcı hesabı silinemedi")
   kök neden tablosu ve kesin çözüm sırası `TROUBLESHOOTING.md` içindedir.

6. **Build frontend:**
   ```bash
   npm ci
   npm run build
   ```
   Bu komut strict typecheck yapar, `dist/index.html` (tek dosya SPA) ve kök dizindeki tracked `optik-form.html` dosyasını derler. Cloudflare Workers SPA fallback'i `wrangler.jsonc` içindeki `assets.not_found_handling` ile sağlanır; `dist/_redirects` yalnızca Pages/Netlify için (`PAGES_REDIRECTS=1`) üretilir, çünkü Workers API'si catch-all kuralı code 100324 ile reddeder.

7. **Deploy frontend:**
   `dist/index.html` çıktısını barındırma sağlayıcınıza (Cloudflare Workers/Pages, Vercel, Netlify, S3/CloudFront) yükleyin. Pathname routing için SPA fallback'in aktif olduğunu doğrulayın (Workers'ta `wrangler.jsonc`, Pages/Netlify'da `PAGES_REDIRECTS=1` ile üretilen `_redirects`).

   Cloudflare Workers statik varlık yayını için depodaki `wrangler.jsonc` (`assets.directory: ./dist`, `not_found_handling: single-page-application`) kullanılır: `npm run deploy`. Bu dosya olmadan `wrangler deploy` Vite otomatik yapılandırmasına girer ve `Cannot modify Vite config` hatasıyla durur; ayrıntı için README'deki *Cloudflare Workers'a yayınlama* bölümüne bakın.

8. **Run smoke tests:**
   Yayınlanan URL'ye tarayıcıdan gidin:
   - `/` (temiz landing) yüklenmeli,
   - Public rotalar (`/sss`, `/gizlilik`, `/kullanim`, `/kaynaklar`) oturum açmadan açılmalı,
   - Bilinmeyen rota (`/rastgele`) 404 sayfasına düşmeli.

9. **Verify auth & RLS:**
   - İlk Admin kullanıcısının aktif ve ADMIN rolünde olduğunu doğrulayın.
   - Admin olarak giriş yapın: `/yonetim` açılmalı.
   - Psikolog hesabı oluşturun ve psikolog olarak giriş yapın: `/kayitlar` açılmalı, `/yonetim`e erişim engellenmeli.

10. **Verify critical CRUD:**
    - **Psychologist:** Test oluştur → Kaydet → Test detayında Uzman Notu gir ve kaydet → Notun kalıcı olduğunu doğrula (F5) → Raporu yazdır/PDF incele → Kendi kaydını sil.
    - **Admin:** Tüm kayıtlar listesinde testi görüntüle → Uzman notu ekle/düzenle → Kaydı sil → Kullanıcılar sekmesinden psikolog hesabını sil (`delete` action).
    - **Audit Log:** Silme ve güncelleme işlemlerinin `audit_logs` tablosuna `record_delete`, `record_update` olarak işlendiğini SQL ile teyit edin.

---

## 11. Bilinen sınırlamalar ve üretim riskleri

1. Form geometrisi ve `D/Y` düzeni `unverified-template` varsayımıdır; yetkili lisans/form materyaliyle eşdeğerlik kanıtı yoktur.
2. OMR eşikleri sentetik raster ve depo PDF'sinin raster pipeline'ı ile testlidir; gerçek telefon, kalem, kağıt, fotokopi ve yazıcı dağılımı için doğruluk yüzdesi iddia edilmez.
3. `confidence` probability değildir; insan review kapısı zorunludur.
4. Klinik skor/yorum kaynaklarının bir kısmı kaynakça statüsü C/D/E ile işaretlidir; uygulama klinik tanı veya otomatik tedavi kararı üretmez.
5. Sunucuda T score/profile saklanmaz; raw payload ve metadata saklanır, profil kayıt açılırken cihazda yeniden üretilir. Scoring engine/norm değişimi legacy görünümü etkileyebilir; `scoringVersion` bu izi sağlar.
6. Ayrı patient/entity tablosu yoktur; her assessment `mmpi_records` satırıdır. Patient-level grouping yoktur.
7. Delete kalıcıdır; soft delete yoktur. FK cascade ile Auth user deletion ilişkili profile/records'ı kaldırabilir; kurum retention politikasını buna göre kurmalıdır.
8. Taslak localStorage ortak bilgisayarda kalabilir; browser/origin güvenliği dışında şifreli kasa değildir.
9. OMR CPU hattı ana thread'de çalışır. `analyzePage` Promise API ile worker'a taşınabilir ama uygulama kendisi Web Worker kullanmaz; büyük görüntüler mobilde yavaşlayabilir.
10. Form print ve clinical report print iki farklı akıştır; browser print dialog, PDF viewer ve gerçek yazıcı davranışı manuel kabul testidir.

---

## 12. Üretim checklist'i

Bu liste “PASS” yerine gerçek kanıt gerektirir:

### Kod ve artifact

- [x] `npm run typecheck`.
- [x] `npm test` 375/375 (36 suite).
- [x] `npm ci` ile lockfile kurulumu: 74 paket, 0 vulnerability.
- [x] `npm run verify:pdf`: 4 A4, 566 madde ve 1.132 bubble doğrulandı.
- [x] `npm run build`: `dist/index.html` ve `optik-form.html` üretildi; standalone build testleri başarılı (SPA fallback Workers'ta `wrangler.jsonc`, Pages/Netlify'da `PAGES_REDIRECTS=1` + `_redirects`).
- [x] `git diff --check`.
- [x] `npm audit --audit-level=high`: 0 vulnerability.
- [x] `SYSTEM.md` rota/auth/RLS/scanner/OMR/PDF/help/privacy/limitations sözleşmesini içeriyor.
- [x] Belirsiz generated-looking scanner evidence dosyaları silinmedi; yalnız doğrulanmış stale açıklamalar düzeltildi.

### Backend/hosting

- [ ] `supabase db push` canlı project'te beş migration ile tamamlandı.
- [ ] İki rol ile canlı RLS/IDOR/note/delete/audit testleri.
- [ ] Edge Function deploy, secret ve exact `ALLOWED_ORIGINS`.
- [ ] Public signup kapalı, ilk Admin bootstrap tamam.
- [ ] SPA fallback, HTTPS, CSP/proxy ve backup/retention politikası.

### İnsan kabulü

- [ ] Gerçek yazıcıda A4 %100 baskı, 4 sayfa batch, QR/mark ölçümü.
- [ ] Gerçek iOS/Android kamera, izin, ışık/blur, manual fallback.
- [ ] Screen reader, keyboard-only, mobile/responsive ve reduced-motion.
- [ ] Klinik uzman tarafından yorum/rapor/safety wording ve lisanslı materyal kabulü.

Checklist'teki `[ ]` maddeler, yerel testlerin başarısız olduğu anlamına gelmez; bu ortamda gerekli canlı/manuel kanıtın bulunmadığını gösterir.

---

## 13. Teslim düzeni

- `src/components/FormPage.tsx` test/rendering twin olarak `formIdentity.test.ts` ve `printLayout.test.ts` tarafından kullanıldığı için korunur.
- `FormKit`, `FormPage`, standalone `optik-form.html` ve gömülü doğrulanmış PDF farklı roller taşır (runtime, geometri testi, çevrimdışı teslim).
- Ad-hoc `scripts/validation/` ve `docs/TestGorselleri/` teslimden çıkarıldı. Tarihsel faz raporları `docs/reports/` altındadır. Kökte yalnızca giriş, yapılandırma ve izlenen teslim dosyaları durur (`README.md`, `SYSTEM.md`, `TROUBLESHOOTING.md`, `optik-form.html`, `MMPI-566-optik-cevap-formu.pdf`). Kaynak PDF’leri `docs/sources/`, denetim kaydı `docs/mmpi-audit/` ve `docs/kaynak-denetimi.md` altındadır.
- Supabase migration, fixture ve config dosyaları “import grep” ile dead kabul edilmez.

## 14. Üretim senkronizasyonu

Canlı Supabase projesinin migration geçmişi, Edge Function sürümü ve `ALLOWED_ORIGINS` secret'ı depo şemasıyla **ayrıca** doğrulanmalıdır. Bu ortamda canlı `db push` yapılmadı.

Doğrulama kanıtları (yerel):

- **TypeScript:** `npm run typecheck` temiz.
- **Test:** `npm test` **375/375 PASS** (36 suite).
- **Canlı ortam arızaları:** `TROUBLESHOOTING.md` belirti → kök neden → komut tablosunu, ilk Admin bootstrap'ını ve hata kodu
  eşlemesini içerir; `npm run diagnose:supabase` aynı kontrolleri canlı projede tek komutla yapar (migration geçmişi, kolonlar,
  RLS politikaları, grant'lar, trigger'lar, `audit_logs` sözleşmesi ve iki Edge Function'ın CORS davranışı).
- **PDF:** `npm run verify:pdf` (4 A4, 566 madde, 1.132 bubble).
- **Build:** `npm run build` (`dist/index.html`, `optik-form.html`; `_redirects` yalnızca `PAGES_REDIRECTS=1` ile).
- **Güvenlik:** `npm audit --audit-level=high` 0; `git diff --check` temiz.

Canlı dağıtım için `supabase db push`, `supabase functions deploy admin-users` ve
`supabase secrets set ALLOWED_ORIGINS=...` zorunludur.

Canlı ortam belirtileri (400, "Kayıt bulunamadı…", "Kullanıcı hesabı silinemedi") ve
kesin çözüm sırası `TROUBLESHOOTING.md` içinde; `npm run diagnose:supabase` aynı
kontrolleri canlı projede otomatik yapar (migration geçmişi, kolon/politika/grant/trigger,
`audit_logs` sözleşmesi, `admin-users` + `ai-interpretation` CORS'u ve isteğe bağlı
uçtan uca yazma/silme testi).
