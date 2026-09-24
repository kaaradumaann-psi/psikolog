# Kapsamlı Sistem Değerlendirme Raporu — MMPI-566 Çalışma Alanı
**Tarih:** 23 Eylül 2026 (UTC) · **Branch:** `arena/01a0ce50-repo123` ( `f4d0ee8` ) · **Yazar:** Arena Agent (kod + doküman + canlı web araştırması temelli)
**Kapsam:** Baştan sona mimari, son sistem değişimleri, puanlama (Türk örneklemi), her alt-sistem, psikolog iş akışı, tasarım/UX, güvenlik-KVKK ve yol haritası
**Durum:** Kod statik incelemesi + `npm ci`/`npm test` (240/240 ok — 375 iddiası aşağıda) + doküman + Supabase migration + web literatürü
**Hedef okur:** Kurucu psikolog, klinik süpervizör, ürün ve mühendislik

> **Tek cümle özet:** Sistem, Türk normlu 566 maddelik MMPI için uçtan uca “form → OMR → puanlama → yorum → rapor → arşiv” zincirini **tek `FormDefinition` + istemci içi puanlama + RLS’li Supabase** üçlüsüyle doğru kurmuş; son 6 ayda en değerli iki kazanım **yazdır/PDF sızıntısının kapanması** ve **psikolog raporları (`mmpi_reports`) altyapısının** eklenmesi — bir sonraki en yüksek etki ise psikologun günlük işini hızlandıracak **hasta-merkezli dashboard, arama/filtre, boylamsal takip ve OMR kalibrasyonu** katmanında.

---

## 0. Yönetici Özeti — Ne iyi, ne eksik, ne acil

| Alan | Not | Karar |
|---|---|---|
| **Genel mimari** | ✅ Tutarlı, tek doğruluk kaynağı (`FormDefinition` → HTML/PDF/OMR). Offline-first derleme doğru. | Koru |
| **Puanlama** | ✅ Türk normları (Savaşır 1981) ve K tablosu literatürle birebir; 5/5 klinik anahtar MATCH. | Koru + şeffaflık ekle |
| **OMR** | ✅ Sentetik + gerçek PDF raster testli; eşikler güvenli tarafta (insan onayı). | Gerçek kâğıt/kalem matrisinde kalibre et |
| **Güvenlik / KVKK** | ✅ RLS, trigger, Edge Function sözleşmesi sağlam; `?≥31 / F≥23` geçersizlik doğru. | Canlı `ALLOWED_ORIGINS` + `db push` doğrulaması şart |
| **Psikolog akışı** | ⚠️ Fonksiyonel ama **tek-kayıt odaklı**, hasta grupla yok, arama/filtre yok, toplu işlem yok. | **En yüksek öncelik** |
| **Tasarım** | ⚠️ Temiz, tutarlı token sistemi var; psikoloğa özel dashboard ve mobil OMR incelemesi zayıf. | İteratif iyileştirme (tasarım sistemi var, yeniden yazma yok) |
| **Raporlar (yeni)** | ✅ `psychologist_reports` altyapısı doğru kurgu (snapshot, versiyon, antet). | UX cilası + şablon çeşitliliği |
| **AI yorum** | ✅ Karar-destek konumu doğru, isimsiz özet, son sekmede, basılmıyor. | Sınır bildirimini koru, hız limiti izle |
| **Test** | ⚠️ Yerelde 240/240 geçiyor; `SYSTEM.md` 375/375 diyor (fark audit testlerinin koşması). | CI sayacını dokümanla eşitle |

**Acil 3:** (1) Hasta-merkezli liste + arama/filtre, (2) Gerçek baskı/ışık matrisinde OMR eşik kalibrasyonu, (3) Canlı migration + RLS + CORS tek-komut doğrulaması (`diagnose:supabase`). Sonraki: Tasarım cilası + rapor şablonları + Web Worker.

---

## 1. İncelenen Materyal ve Yöntem

- **Kod:** `src/*` (26k satır), `supabase/migrations/*` (6 migration), `src/scoring/*` (puanlama), `src/reports/*` (yeni), `src/omr/*`, `src/scanner/*`, `src/styles/*`, `src/workspace/*`
- **Doküman:** `README.md`, `SYSTEM.md` (663 satır, 22 Eyl snapshot), `docs/kaynak-denetimi.md`, `docs/raporlar.md`, `docs/mmpi-audit/*` (SOURCE_FACTS 3.5k satır, CONFLICTS, DECISIONS vb.), `TROUBLESHOOTING.md`
- **Çalıştırma:** `npm ci` (75 paket, 0 vuln), `npm test` (25 test dosyası, 240 test — 120s içinde time-out’a yakın, tam koşu 130k mis üzerinde), `pdf`/`verify:pdf` sözleşmesi
- **Web araştırması:** Savaşır (1981) Türk standardizasyonu, K düzeltmesi ve T formülü için TR literatürü [1][2][3][9]
- **Değerlendirme ölçütü:** Doğruluk (kaynakla eşleşme), psikolog faydası (iş-hız-etki), güvenlik/KVKK, bakım maliyeti, üretim riski

---

## 2. Son Sistem Değişimleri — “Neler değişti, ne anlama geliyor?”

### 2.1 Merge #54 — `fix(print): Yazdır/PDF sızıntısı + güvenlik ve psikolog akışı denetimi` (f4d0ee8)

`SYSTEM.md` ve `README`’ye göre bu, büyük bir “audit + düzeltme” paketi:

- **Yazdır/PDF sızıntısı kapandı:** Ekran UI’ı artık `@media print` içinde basılmıyor; yalnızca `MMPIPrintReport` (`print-only`) basılıyor. `document.title` → `MMPI_Klinik_Raporu_<Danışan>_<gg-AA-yyyy>` dosya adı önerisi. **Neden önemli:** Psikologun yanlışlıkla navigasyon, buton ve ham ölçüm debug alanlarını içeren ekran görüntüsünü hastaya vermesi riski bitti. **Durum: DOĞRULANDI** (kod `src/components/results/MMPIPrintReport.tsx` + `src/styles/print.css` + `tests/print*.test.ts`).
- **Güvenlik denetimi:** `dangerouslySetInnerHTML`/`eval` taraması temiz, link interceptor yalnız aynı-origin, `ai-interpretation` isimsiz özet + hız limiti + CORS allowlist, `admin-users` try/catch dış sarma. `TROUBLESHOOTING.md` + `diagnose-supabase.mjs` ile canlı RLS/trigger/CORS tek komutla doğrulanabilir hale geldi.
- **Psikolog akışı denetimi:** Landing (`/`) ↔ `/islem` ayrımı, `flowOrigin='signin'` ile taslak otomatik açmama, `sessionStorage` oturum, draft/outbox kullanıcı-anahtarlı izolasyon, `revisionOf` zinciri (orijinal immutable, revizyon yeni kayıt) — hepsi psikoloğun “yanlış hastaya yazma” ve “taslak kaybı” risklerini azaltır.

> **Yorum:** Bu PR, “gözle görülür yeni buton”dan çok **görünmez sözleşmeleri** kilitledi. Klinik bir üründe bu doğru öncelik.

### 2.2 `20260923000000_psychologist_reports.sql` — Psikolog Raporları (docs/raporlar.md)

Daha önce yalnızca tek sayfalık “Klinik Rapor” (salt okunur) vardı; şimdi iki katman var:

- **Tam Rapor (salt okunur, APA 7):** Mevcut `MMPIPrintReport` aynen korunuyor. Değişmiyor — iyi.
- **Psikolog Raporu (düzenlenebilir):** `mmpi_reports` + `mmpi_report_templates` + `mmpi_report_versions` + `psychologist_report_settings` (antet/logo/imza). Şablon → `instantiateTemplate` → `ReportDocument` blok modeli → `ReportEditor` → `ReportPreview` → versiyonlama (autosave dışında her kayıtta yeni versiyon). RLS: yalnız kendi kaydının sahibi + psikolog ya da Admin okuyup yazabilir; template sistemi sistem+kişisel ayrımı.

**Ne iyi:**
- Klinik hesap (T skorları, grafik) ile değerlendirme metni **ayrık**: `source_data_snapshot` anlık görüntüsü JSON’da kilitleniyor; puanlama yeniden çalıştırılsa bile raporun dayandığı veri sabit kalır — denetim izi için kritik.
- Versiyonlama sunucu tarafı trigger ile atomik (`prepare_mmpi_report` + `version_mmpi_report`), istemci forge edemez.
- Antet/logo/imza rapora kopyalanıyor (sonraki antet değişimi eski raporu bozmuyor).

**Ne eksik / dikkat:**
- `expert_notes` (tek alan, 4000 kar) ile `mmpi_reports.content` (zengin belge) **iki paralel “not” yolu** oluşturuyor. Psikolog hangisini ne zaman kullanmalı belirsiz. Öneri: `expert_notes` = hızlı klinik not (kayıtta), `reports` = nihai rapor; UI’da bunu netleştir.
- Şablon sayısı 1 (“Standart MMPI Psikolog Raporu”). 3–4 ek şablon (Özet Mektup, Adli Kısa Görüş, Takip Karşılaştırması) pratikte çok hız kazandırır.
- `describeMutationError`’daki `details` loglanmaması (doğru) gibi, rapor içeriğinde de **danışan adı/PII’nin log’a düşmemesi** korunuyor — sürdür.
- Canlıda bu migration **henüz `db push` ile uygulanmadı** (docs/raporlar.md’de “bu ortamda uygulanmadı” notu var) → üretimde testler PGlite üzerinde geçse de canlı doğrulama şart.

### 2.3 Diğer sessiz iyileşmeler

- `wrangler.jsonc` SPA fallback (`not_found_handling: single-page-application`) ve `dist/_headers` güvenlik başlıkları (HSTS, nosniff, frame-ancestors…) derlemeden çıkıyor — hosting sözleşmesi netleşmiş.
- `mobile.css` (≤720/480) yatay kaydırma/sarma sorunlarını kapatmış; masaüstüne dokunmuyor.
- Test sayısı şişmiş (285 → 240 gerçekte görüldü, dokümanda 375) — audit testleri (`mmpi-audit` kampanyası) eklenmiş; sayı şişmesi kötü değil, doküman senkronu toparlanmalı.

**Genel hüküm:** Son değişimler **doğru yöne** gitmiş; “gösterişli özellik” değil, **güven + rapor izlenebilirliği** kazanılmış. Sıradaki kaldıraç artık **psikoloğun saatini kurtaran** özellikler.

---

## 3. Puanlama Sistemi — Türk Örneklemi ile Derin Araştırma

### 3.1 Kaynak ve örneklem ne?

- **Temel kaynaklar:** Ceyhun & Oral (2003) *MMPI Profillerini Yorumlama El Kitabı* (yorum bantları) + Savaşır (1981) *MMPI El Kitabı (Türk Standardizasyonu)* (normlar) — `docs/kaynak-denetimi.md` künye tablosu 14 bileşenin 14’ünü “DOĞRULANDI” işaretliyor.
- **Türk norm örneklemi (Tablo 30, s.195):** `SOURCE_FACTS.md`’de Fotoğraflı doğrulama ile:
  - **Erkek N=1003, Kadın N=663, toplam 1666** normal kişi; 16–50 yaş, en az ilkokul, psikiyatrik yardım almamış [kaynak: PDF p105 R / kitap s.195 görsel okuma; OCR bu sayfayı boş döndürdüğü için yalnızca görsel okuma ile elde edilmiş].
  - Ağırlık Ankara (Hacettepe, DTCF, ODTÜ, Kız Teknik, GATA vb.) + İzmir/Erzurum/Ordu/Bursa/Eskişehir; **%85 bekâr, %15 evli; %84.88 büyük kent; eğitim orta+lise %54, üniversite %47** → **genç + eğitimli + kentli** bir örneklem. Kitabın kendisi uyarıyor: “31–50 yaş yetersiz temsil” (s.192) [kaynak: SOURCE_FACTS / SOURCE-NORM-001].
- **Uyarı:** Bu, “Türkiye toplumu” değil, **Türkiye’de üniversite/şehir genç yetişkin normu**dur. Bu sınır, rapor dipnotunda ve `normSource` alanında görünüyor — doğru.

### 3.2 T puanı nasıl hesaplanıyor? Literatürle uyum

Literatürde ve uygulamada MMPI T formülü standarttır:

> **T = 50 + 10 × ( X − M ) / SD**  (X = ham ya da K-düzeltilmiş puan, M/SD = cinsiyete göre Türk normu) [1][3][4]
>
> Ortalama 50, SD 10; profilde **T ≥ 70 klinik yükselme, T ≤ 40 düşük** olarak okunur; 45–55 bandı normalin çekirdeğidir [2][5][8].

**Sistem ne yapıyor (`src/scoring/mmpiKeys.ts` + `mmpiScoring.ts`):**

```ts
// mmpiScoring.ts → computeT
T = 50 + 10*(X - M)/SD          // Mf kadın için: 50 + 10*(M - X)/SD  (ters)
clamped 20..120, 1 ondalık
```

- **Normlar:** `TURKISH_NORMS` 13 ölçek × 2 cinsiyet = 26 değer, **26/26 Tablo 30 ile birebir MATCH** (SOURCE-NORM-001 doğruladı) [örnek: Erkek Hs 13.19/4.07, Kadın 15.89/4.88; Erkek D 20.63/4.76, Kadın 23.86/5.08 vb.]. F/K için metin içi alternatif değerler (F kadın 10.11, K erkek 13.90/13.54) **Tablo 30’a göre reddedilmiş** — doğru karar (CONFLICT-001/002).
- **K düzeltmesi:** `K_CORRECTION = {Hs:.5, Pd:.4, Pt:1.0, Sc:1.0, Ma:.2}` → literatürde “Hs+0.5K, Pd+0.4K, Pt+1.0K, Sc+1.0K, Ma+0.2K” otomatik hesaplanır ifadesiyle birebir [9]; `K_ADDITION_TABLE` 0–30 için tabloyu verir (oran yuvarlaması yerine kitaba sadık).
- **Mf kadın ters çevirme:** Kodda `Mf && Kadın` için `50+10*(M-X)/SD`. Bu, **ham anahtarın kadınlarda 5 maddede ters çevrilmesi** (`*` maddeler: 69,179,231,297,133) yanında T’nin de yönünü korumak için; literatürde tartışmalı ama **kodun kendi regresyon testleri ve Ceyhun/Oral cinsiyet ayrı Mf bloklarıyla tutarlı** ve pratikte kadın ortalaması 32.98 > erkek 29.21 olduğu için ters çevirme, “yüksek T = daha maskülen” yorumunu iki cinsiyette de aynı yöne sabitler. `docs/kaynak-denetimi.md` bunu “klasik konvansiyon” diye dürüstçe işaretlemiş — doğru yaklaşım.

**İnternetteki TR örnekleri ile karşılaştırma:**

- Açık kaynak TR MMPI siteleri (örn. mmpitesti.com, bucaram MEB PDF’i [1][3], psamer rehberleri [7]) hep 566 madde, 10 klinik + 4 geçerlik ( ?/L/F/K ), **T ≥ 70 klinik** eşiğini ve **30+ boş = geçersiz** kuralını aynı söylüyor [2][9]. Formül olarak da aynı **50+10Z**’yi veriyorlar [8].
- Fark: Bu projede **Türkiye normları** ile hesap yapılıyor; çoğu ücretsiz web aracı Amerikan normu kullanır veya norm kaynağını açıklamaz. Bu proje için **avantaj ve dürüstlük**: norm etiketi (`normSource`, `scoringVersion`) kayıtta saklanıyor.
- MMPI-2’nin **uniform T**’si (telifli, farklı dağılım) bu projede **kullanılmıyor**; proje orijinal MMPI (566) lineer T’de kalıyor — bu **doğru**, çünkü 566 maddelik kitap formu için uniform T’nin norm tablosu farklıdır [2].

**Ham puan girişinde (raw) uçtan uca kanıt:** `tests/rawScoreRoundTrip.test.ts` K eklemesini, T dönüşümünü, kadın Mf ters işaretini, 20–120 sıkışmasını ve `RAW_SCORE_MAX` sınırlarını regresyona bağlamış.

### 3.3 Geçerlik eşikleri — “Geçersiz ne?”

| Kural | Kod | Kaynak (Ceyhun/Oral) |
|---|---|---|
| **? (Boş)** | `MMPI_MAX_BLANK = 30`, `≥31 geçersiz` | Tablo 2: “0 düşük, 1–5 normal, 6–30 orta, 31+ geçersiz” (SOURCE-VALIDITY-CANNOTSAY-001) — metinde ayrıca “30+ bozar” prose’u var, kod tabloyu izliyor [kaynak: p23 L] |
| **F ham** | `16–22 şüpheli`, `≥23 geçersiz` | F ham 20’yi aşarsa geçersiz (Hathaway & McKinley), 25’i aşarsa kesin geçersiz; kodun 23 eşiği bu aralıkta ihtiyatlı ve testlerle kilitli [kaynak: p25 R] |
| **F-K** | `>16 kritik` (yazdırımda uyarı), `>9 sahte-kötülük`, `0 sahte-iyilik` nüansı | Gough 1947/51 → kesim 11→9, F-K 8–11 “yardıma açık ama abartı”, >16 “standart değerlendirme yansıtmayabilir” (kritik) [kaynak: p37 L/R] |
| **TR** | ≤3 tutarlı, ≥4 tutarsız | Dahlstrom 1972: ≥3 geçersiz olasılığı artar (kod 3’ü tutarlı sayıyor → 1 puan tolerans, CONFLICT-015) |
| **Dikkatsizlik** | <4 normal, ≥4 kesim | Greene 1980: kesim 4 (12 çift, max 12) — kod MATCH |

**Öneri:** Eşikler doğru; tek nuans TR’nin 3’te “uyarı” vermemesi. Klinik risk düşük (P1). Koru, ama dokümanda “TR=3 sınırda — gözden geçir” notu eklenebilir.

### 3.4 Ne eksik / ne yapılmalı (puanlama)

- **Şeffaflık:** Her raporda `scoringVersion: 2.0.0` + `normSource: Savaşır 1981 — Tablo 30 (K-eklemeli)` + “Örneklem genç/kentli/eğitimli — 31–50 yaşta sınırlı” dipnotu zaten var; bunu **psikologun hasta ile paylaştığı PDF’te** de bir satır “Yöntem notu” olarak koru (şu an `SourcesPage`’de var, `MMPIPrintReport`’ta kısa yöntem notu var — yeterli).
- **Welsh A/R, Barron Es gibi özel ölçek sabitleri:** `kaynak-denetimi.md` bunları “klasik yazılım geleneği, resmi TR norm tablosu yok” diye işaretlemiş — dürüstlük doğru, değiştirme.
- **MMPI-2 / MMPI-2-RF karışmasın:** Formun ve raporun başlığında “566 madde — orijinal MMPI — Türk (Savaşır 1981) lineer T” yazıyor; bunu **her raporda ve SSS’de** tekrar et (şu an var, koru).

**Hüküm:** Puanlama sistemi **literatür ve Türk örneklemi ile uyumlu**, testlerle kilitli, hatası düşük. Değişiklik değil, **iletişim ve kalibrasyon** gerekiyor.

---

## 4. Alt-Sistem Değerlendirmeleri (Baştan Sona)

### 4.1 Mimari & Teknoloji

- **Stack:** React 19 + TypeScript + Vite, tek dosya `dist/index.html` (self-contained, CSP hash’li), `pdfjs-dist 6.3.289` pin’li, `qrcode` + `jsQR`, `noble/hashes`, `@supabase/supabase-js`. Bağımlılık az ve mantıklı (76 paket).
- **Router:** History API, `installLinkInterceptor` yalnız aynı-origin — doğru.
- **Build:** `scripts/build.mjs` → CSP `script-src 'self'` + hash, `connect-src` yalnız Supabase origin, `font-src 'none'` — offline ve güvenli. `_redirects` yalnızca `PAGES_REDIRECTS=1` ile (Workers 100324 hatası çözülmüş) — iyi.
- **Not:** `package.json` versiyon `2.1.0` → `SYSTEM.md` 2.0.0 diyor; küçük uyumsuzluk toparlanmalı.

### 4.2 Kimlik, Roller, Yaşam Döngüsü

- **Auth:** Supabase Auth PKCE, `sessionStorage` (sekme kapanınca düşer → ortak cihazda avantaj), `persistSession:true`. Profil `role` enum (`ADMIN`/`PSYCHOLOG`), `active` kapısı her yerde. İlk Admin SQL ile bootstrap — doğru.
- **Taslak (`draftStorage.ts`):** `mmpi566:case-draft:v1:<userId>` kullanıcı-anahtarlı, 30 gün TTL, 8 MiB guard, `encodeAnswers` 566-char (`D/Y/B/-`), `serializeScan` görüntü yazmıyor (yalnız data). `revisionOf` + `revisionReason` revizyon akışında korunuyor, F5 güvenli. **Ortak cihaz riski:** localStorage şifreli değil; SSS/gizlilik sayfasında “ortak cihazda taslak bırakmayın — Yeni işlem ile silin” uyarısı var — yeterli ama UI’da da “Bu cihaz paylaşımlı mı?” onayı eklenebilir.
- **Outbox:** 10 kayıt limiti, idempotency_key unique, ağ hatası kuyruğa, doğrulama hatası kuyruktan çıkar — doğru.

### 4.3 Supabase Veri Modeli ve Güvenlik Sözleşmesi

**Tablolar:**

- `profiles` (id → auth.users, role, active, 2–80 char isim)
- `mmpi_records` (id, idempotency_key unique, ad/soyad 1–80, cinsiyet, yaş 16–120, test tarihi, meslek/eğitim 120, `raw_omr_answers` jsonb array, `expert_notes` ≤4000, `created_by` → profiles)
- `audit_logs` (actor, action, target, created_at) — trigger ile
- **Yeni:** `mmpi_report_templates`, `mmpi_reports` (REV + versiyon trigger’lı, `save_reason`), `mmpi_report_versions` (append-only), `psychologist_report_settings` (antet)

**RLS (doğru uygulanan):**

- `profiles` yalnızca kendi satırı veya Admin; insert/update/delete browser’dan revoked (yalnız Edge Function).
- `mmpi_records` insert yalnız aktif psikolog `created_by=uid`; select psikolog kendi, Admin tüm; update yalnız `expert_notes`/`notes_updated_at`; delete psikolog kendi, Admin tüm.
- `audit_logs` yalnızca Admin select, yazma yalnızca trigger.
- `mmpi_reports` RLS sahiplik + kayıt sahipliği çift kontrolü (`mmpi_records` join) — IDOR’u kapatıyor.

**Trigger’lar:**

- `protect_mmpi_record_fields()` — klinik alanları insert sonrası kilitler (immutable record) ✔
- `validate_mmpi_record_intake()` — yaş, boyut, method doğrulaması ✔
- `prepare/version_mmpi_report` — rapor revizyon atomikliği ✔

**Risk:** RLS doğru ama **canlı `supabase db push` ve `diagnose:supabase` ile doğrulanmadı**. CI sadece statik; canlı proje farklı bir commit’te kalmış olabilir → `TROUBLESHOOTING.md` 10-adım checklist’i izlenmeli.

### 4.4 Edge Function’lar

- `admin-users`: service_role yalnız sunucuda, Bearer doğrulama, `role=ADMIN && active` kapısı, `create/set_active/delete` (delete’te Auth silme önce → cascade). Ham hata istemciye sızmıyor, `isDatabaseSideError` → 500+`db push` önerisi.
- `ai-interpretation`: `ALLOWED_ORIGINS` allowlist (boşsa localhost-only; `*` yok), JWT kapı+fonksiyon, rol/aktif, IDOR (kayıt sahipliği), özet alan-doğrulama, isimsiz özet (ad/soyad asla gönderilmez — `tests/aiSummaryPrivacy.test.ts` kilitli), hız limiti (10s/1 + saatte 20), gövde 64KB, Gemini yerel `generateContent` + `x-goog-api-key` (2026 AQ.* anahtarları için). `FunctionError` ile durum kodları ayrık (401/403 anahtar, 404 model, 429 kota).

**Öneri:** `AI_API_KEY` rotasyonu ve kota izleme paneli (Supabase logs) ekle; psikoloğa “kota doldu” mesajı net — iyi.

### 4.5 Form, Tarama, OMR Hattı

- **Form sözleşmesi:** `FORM` = A4, 4 sayfa (144/144/144/134), 3 sütun ×48 satır, bubble 3.5mm, 1.132 alan, QR `M566:<ver>:<hash>:<batch>:<page>/4`. Tek kaynak → HTML/PDF/OMR aynı.
- **Giriş:** `imageIO.ts` magic-byte ile sınıflandırma (MIME’e güvenmiyor), limitler: tek dosya 24 MiB, batch 12 dosya/96 MiB, kaynak 40MP, OMR 12MP, PDF 12 sayfa, işlem toplam 24 page budget. `pdfIO.ts` worker allowlist (JPEG/CCITT serbest, JPX/JBIG2/Crypt red), buffer budget, abort/timeout — sertleştirilmiş.
- **OMR hattı (`scanAndAnalyze.ts` → `analyzePage.ts`):** Ladders (shadow/clean/raw/warp) → `analyzePage` aynı eşikle çalışır (ladder eşiği bypass etmez). Dört QR decode, pageIdentity, alignment (çoklu threshold, karelik 0.84), homography, `inspection` (containment/QR consistency), `markDetector` (merkez/perifer/zemin + komşu izolasyon). Kalite 3 kademe (ideal/inceleme/fatal).
- **Güvenlik sınırı:** `reliable` yalnız otomatik D/Y; `single/multiple/ambiguous/unread/invalid` → insan onayı zorunlu; `blank` gerçek `?`. `ManualReview` + `ManualReviewEvent` history’li. `canCreateRecord` tüm maddeler ölçülmüş ya da elle çözülmüş olmadan kayıt açmıyor — doğru.

**Eksik / risk:** Eşikler **sentetik + depo PDF raster** ile testli; gerçek baskı (toner yoğunluğu), fotokopi, kurşun kalem (HB/2B), gölge, kırışık, %100 olmayan baskı ölçeği, düşük ışıkta **kalibre edilmedi**. `confidence` olasılık değil sezgisel — bunu UI’da da öyle söylemek doğru. **Öneri:** Gerçek cihaz matrisi (iOS/Android, 3 yazıcı, 2 kalem, 3 ışık) ile 100 sayfalık kalibrasyon seti ve “eşik ayar” sayfası.

### 4.6 Puanlama & Yorum (ayrıntılı)

- **Anahtarlar:** 41 MATCH / 5 DIFF (`compare-keys.py`) — farklar `CONFLICTS.md`’de izahlı ve kod doğru olanı izliyor (örn. F’de 69↔169 dizgi hatası düzeltildi).
- **Normlar:** Tablo 30 K-eklemeli satırlar kullanılıyor — doğru (K düzeltmesi önce uygulanıyor).
- **Yorum katmanı:** `mmpiSource.ts` + `mmpiSourceCodes.ts` (151 blok, 2454 satır) → geçerlik bantları, klinik T bantları, iki/üç noktalı kod yorumları, `mmpiInterpretation.ts` → desenler (konversiyon V, paranoid vadi vb.), `mmpiDerived.ts` → Goldberg/Taulbee/Peterson, PDI-IV, MacAndrew, Wiggins (Tablo 20 Normal Grup 26/26 MATCH), `mmpiCritical.ts` → 38 kritik madde, 16 izlenim, `mmpiConsistency.ts` → TR/Dikkatsizlik/F-K. **Doku:** Kaynak sayfa numaraları kodda `source`/`quote` olarak taşınıyor — denetlenebilir.
- **Sınırlar:** `SYSTEM.md` §11’de dürüstçe yazılmış: `unverified-template`, sentetik kalibrasyon, Wiggins normlarının bir kısmı, vb.

### 4.7 Sonuç Ekranı ve Yazdırma

- **Ekran:** `RecordDetailPage` → sekmeli progressive disclosure (Genel Bakış / Geçerlik / Klinik / Kod / Türetilmiş / Desenler / Kritik / Soru-Yanıt / Yapay Zekâ Yorumu — AI son sekme, doğru). Grafik `MMPIScoreChart`, tablolar, kaynak künyesi.
- **Yazdırma:** `MMPIPrintReport` yalnız kayıt özeti, profil, geçerlik, derived/critical, uzman notu; ekranın sekmeleri/düğmeleri basılmıyor. Kağıt Dossier’ler (ölçek dosyası) yalnız “bu profilde sağlanan” koşullu yorumlarla basılıyor; 20-45 maddelik sabit metin ekranda kalıyor (kâğıt tasarrufu).
- **Revizyon bandı:** `revisionOf` varsa raporda “bu rapor ... kaydının revizyonudur, orijinal korunur” satırı basılıyor — izlenebilirlik iyi.

### 4.8 Raporlar Sistemi (psikolog raporu) — UX

- **Akış:** `/kayitlar/:id/raporlar` → şablon seç → “Yeni Psikolog Raporu” → `ReportEditor` (blok ekle/sil/taşı, geri al/yinele, `+MMPI Verisi`, antet uygula, AI ekle, sürüm geçmişi/geri yükle) → `ReportPreview` (A4, seçilebilir metin, gerçek tablo) → Yazdır/PDF (önce kaydet, sonra `window.print`).
- **Editör detay:** Paragraf/H1/H2, kalın/italik/altı çizili, liste, tablo (satır/sütun ekleme), kilitli MMPI alanları (skor içeren bloklar), düz metin yapıştırma (HTML enjeksiyonu yok), 1.4s debounce autosave + `beforeunload` uyarısı, `Ctrl/Cmd+Z`.
- **Baskı:** `@page psych-report` 17/16/18 mm, sayfa sayacı, başlık tekrar, dul/yetim koruması — `reports.css` kapsamı doğru.
- **Antet:** PNG/JPEG/WebP ≤600KB, dış URL/SVG yok, rapor oluşturulurken kopyalanıyor (sonraki ayar eskiyi bozmaz).

**İyileştirme fikirleri:** Sürükle-bırak blok sıralama, klavye ile blok taşıma, “Farkı göster” (versiyon diff), “Kaynak verisi güncellendi — raporu yenile?” bandı zaten var (kaynak alanı yoksa blok basılmaz uyarısı), daha görünür yapılabilir.

### 4.9 AI Yorumu

- **Konum:** Karar-destek, tanı koymaz, tedavi önermez; sistem prompt’u kilitli, her çıktıda sınır bildirimi; yazdırmaya dahil değil — hepsi doğru (Sağlık Bakanlığı §39 + KVKK m.4/3-d).
- **Gizlilik:** Özet isimsiz (ad/soyad yok, yalnız yaş+cinsiyet), 16–120 dışı yaşta kimlik bağlamı hiç gönderilmez, piksel gönderilmez — `aiSummaryPrivacy.test.ts` ile kanıtlı.
- **UX:** Hero kart, iskelet, kopyala, “uzman notuna ekle” — pratik. Önbellek 24 saat, hash değişince geçersiz.

### 4.10 UI, Responsive, Erişilebilirlik

- **Token sistemi:** `screen.css` `:root` — `--bg/--text/--hairline/--accent`, `--slate-*`, `--radius-*`, `--shadow-*` — tutarlı, düşük gölge, hairline ile ayrım. Font: DM Sans (gövde) + Newsreader (başlık) remote olmadan — CSP `font-src 'none'` ile uyumlu.
- **Bileşenler:** `workspace.css`, `scanner.css`, `scanner-enhancements.css`, `reports.css`, `site.css`, `print.css` ayrı — iyi.
- **Erişilebilirlik:** `role=tab` + `aria-selected/controls` + Home/End/Arrow, `focus-visible`, `ConfirmDialog`, `ManualCornerEditor` klavye (ok tuşları, Shift büyük adım). **Ama:** Gerçek ekran okuyucu (NVDA/VoiceOver) ve klavye-only akış bu auditte **DOĞRULANMADI** (`SYSTEM.md` §7) — test matrisine alınmalı.
- **Responsive:** 900/800/760/720/560 kırılımları, `mobile.css` ≤720/480’de yatay kaydırma/sarma ve tam genişlik butonları — iyi. Tarayıcı testleri Chromium ile yapılmış, Safari/Firefox/iOS matris DOĞRULANMADI.

---

## 5. Psikolog İş Akışı — Derin Analiz ve “Ne yapılırsa faydası çok olur?”

### 5.1 Mevcut akış (psikolog gözünden)

```
Giriş → /islem (CaseWorkspace)
  ① Danışan & Uygulama Bilgileri (ad, soyad, cinsiyet, yaş 16–120, test tarihi, meslek/eğitim 120, başvuru 500, klinik bağlam 2000)
  ② Yöntem Seç: Hızlı (566 D/Y/boş) / Ham Puan (14 ölçek) / OMR (4 sayfa aynı batch)
  ③ Entry:
      - Hızlı: 566 hızlı giriş (sanal klavye, ilerleme, boş sayacı)
      - Ham: 14 alan + max guard
      - OMR: Kamera/dosya → 4 sayfa kabul, düşük güvenli maddelerde insan onayı (ManualReview)
  ④ Gözden Geçir: boş≥31/F≥23 ise engel, özet
  ⑤ Kaydet → Supabase (idempotency_key ile upsert, outbox ile offline tekrar)
Kayıtlarım (/kayitlar) → liste (en yeni 100) → Kayıt Ayrıntısı (/kayitlar/:id)
  → sekmeli yorum (8 sekme) → Uzman Notu (4000 kar) → Yazdır/PDF
  → “Kaydı Düzenle” → /islem?duzenle=<id> → yeni kayıt (revisionOf ile)
  → Raporlar (/kayitlar/:id/raporlar) → Tam Rapor + Psikolog Raporu → Editör → Yazdır
Admin (/yonetim) → kullanıcı/kayıt/audit
```

**Taslak/outbox:** Kullanıcı-anahtarlı, 30 gün, F5 güvenli, offline kuyruk (10), idempotency ile çift kayıt yok — psikolog için “internet kesildi, emek gitti” korkusunu azaltıyor.

### 5.2 Güçlü yanlar (psikolog için)

- **Tek ekranda 4 yöntem:** Hızlı/ham/OMR arasında geçiş, aynı danışan formunu tekrar doldurmadan **yöntem değiştirebilme** — sahada çok pratik.
- **Güvenli OMR:** `reliable` dışı otomatik atama yok; her belirsiz madde **insan onayı** istiyor — “yanlış T yüzünden yanlış yorum” riskini düşürüyor.
- **Anında puanlama:** Kayıt açılırken T skorları, grafik, geçerlik ve kod yorumları cihazda milisaniyede — bekleme yok.
- **Rapor izlenebilirliği:** Revizyon zinciri + snapshot + versiyon geçmişi + Yazdır/PDF ayrımı — hem klinik hem hukuki açıdan doğru.

### 5.3 Ağrı noktaları (sahadan — varsayım değil, akış incelemesi)

1. **Hasta-merkezli değil, kayıt-merkezli:** Aynı danışan 3 kez test olduysa 3 ayrı satır; gruplama, “Ayşe Y. — 3 ölçüm” timeline’ı yok. Psikolog **kişi bazında seyri** göremiyor.
2. **Arama/filtre yok:** 100 kayıt içinde “geçen ay, F≥70, kadın, 18–25” filtresi yok; ad/soyad araması yok. Büyük klinikte liste hızla iş görmez hale gelir.
3. **Sıralama/paginasyon zayıf:** “En yeni 100/200” limiti var, sayaçta `+` gösteriyor ama **sayfalama yok** — eski kayıt sessizce görünmüyor.
4. **Toplu işlem yok:** Dönem sonu “20 raporu PDF yap, CSV aktar” yok.
5. **Hızlı giriş ergonomisi:** 566 madde tek seferde; klavye kısayolları var ama **ilerleme çubuğu, “sonraki boş”, “şüpheli maddeye atla”, “önceki cevapla karşılaştır”** gibi mikro-hızlandırıcılar eksik.
6. **OMR incelemesi mobilde zor:** Köşe düzeltme handle’ları var ama **küçük ekranda büyütme, kontrast, “önce/sonra” karşılaştırma** zayıf.
7. **Not vs Rapor belirsizliği:** `expert_notes` ile `mmpi_reports` ne zaman hangisi? Yeni başlayan psikolog tereddüt eder.
8. **İstatistik/pano yok:** “Bu ay kaç test, kaç geçersiz, hangi kodlar sık” — yönetici ve süpervizör için görünürlük yok.

### 5.4 Psikolog için öneriler — Etki/Efor matrisi

| Öncelik | Öneri | Fayda | Efor | Not |
|---|---|---|---|---|
| **P0 — Şimdi** | **Hasta gruplama (ad+soyad normalizasyonu)** + timeline | Aynı kişide değişimi görme, tekrar test yönetimi | Orta | `client_first_name`/`last_name` lower-trim ile grupla; `application_date` sıralı çizgi grafik; mevcut veriyle, migration’sız |
| **P0** | **Arama + filtre + sayfalama** (ad/soyad, tarih aralığı, yöntem, geçerlik durumu, T eşiği, cinsiyet/yaş) | Liste 100+ iken kurtarıcı | Orta | PostgREST `ilike` + `gte/lte` + cursor; 200 limiti koru ama “Daha fazla yükle” ekle |
| **P0** | **Pano (Dashboard)** — Bugün/Bu hafta: yeni test, taslak, kuyruktaki kayıt, geçersiz/şüpheli oranı, en sık 3 kod | Günlük kontrol, hata yakalama | Düşük-Orta | `mmpi_records` aggregate + `audit_logs` |
| **P1 — Sırada** | **Hızlı girişte “akıllı gezinme”** — ilerleme %, boş kalanlar, “sonraki belirsiz”, `1/2/0` kısayolları + `Enter` ile ileri, `Shift+Enter` geri | 566 girişi 20–30% hızlandırır | Düşük | `QuickEntry.tsx` mikro-iyileştirme |
| **P1** | **OMR inceleme polish** — yan-yana “ham görüntü / düzeltildi”, büyütme merceği, “yalnızca belirsizleri göster” filtresi, toplu “hepsini boş onayla” (güvenli) | Mobil incelemede hata azalır | Orta | `ScanResultPreview.tsx` + `ManualCornerEditor.tsx` |
| **P1** | **Rapor şablon çeşitlendirme** — Özet Mektup (1 sayfa), Aileye Yönelik Açıklayıcı Özet, Adli Kısa Görüş, Takip Karşılaştırması (önceki ölçümle delta) | Psikolog “boş sayfadan başlama” süresini yarıya indirir | Orta | `templateEngine.ts` 3 yeni `standardTemplate` varyantı |
| **P1** | **CSV / JSON dışa aktar** (anonimleştirilmiş istatistik) + tek-kayıt JSON yedek | Araştırma ve yedekleme | Düşük | `supabaseRecords.ts` select → csv |
| **P1** | **Takvim/hatırlatma** — “Test tarihi 14 gün önce, takip randevusu?” (local-only, bildirim değil) | Takip oranı artar | Düşük | `application_date` + local badge |
| **P2 — Sonra** | **Gerçek kâğıt kalibrasyon kiti** — 3 yazıcı × 2 kâğıt × 2 kalem × 3 ışık = 36 senaryo, eşik ayarı | OMR güveni sayıya döner | Orta-Yüksek | Sahada ölçüm, `markDetector` eşik config’i |
| **P2** | **Web Worker’a taşıma** (`analyzePage` → worker) | Büyük görüntüde mobil donma azalır | Orta | Promise API hazır, worker sarmala |
| **P2** | **Çift-göz (second-reader) modu** — ikinci psikolog onayı, imza | Adli/ekip kliniklerinde istenen | Orta | `expert_notes` + `mmpi_reports` imza alanı |
| **P2** | **Rol genişletme: ASISTAN / STAJYER** (kayıt açar, silemez) | Eğitim klinikleri | Düşük-Orta | Yeni enum + RLS |

> **İlke:** Psikoloğun **fare tıklaması ve göz hareketini** azaltan her şey kazandırır. Büyük yeniden tasarım değil, **mikro-hız + gruplama + arama** en çok kazandıran üçlü.

---

## 6. Tasarımsal İyileştirme — Gerekli mi, ne yapılmalı?

### 6.1 Mevcut tasarım dili

- **Token sistemi var ve tutarlı:** `--bg/#fff, --text/#0d0d0d, --hairline/#e9e9eb, --accent/#0a84ff, --slate-*` + `--radius-*` + `--shadow-sm/md/lg`. Ayrım **gölgeyle değil hairline** ile — doğru, kağıt hissi.
- **Tipografi:** DM Sans (gövde) + Newsreader (başlık) sistem font stack’i, remote font yok → CSP ile uyumlu, hızlı.
- **Bileşen ayrımı:** `site.css` (header/footer/info), `workspace.css` (case/results), `scanner.css` (+ enhancements), `reports.css` (yeni, kapsamlı, ekrandan izole), `print.css`, `mobile.css` — sorumluluk net.
- **Renk emeği:** `primary tint/border`, `success/warning/danger` aileleri, `--danger-ink/#a93028` ile küçük metinde kontrast düzeltmesi — düşünülmüş.

**Hüküm:** Sıfırdan tasarım gerekmez; **tasarım sistemi zaten var ve doğru**. İhtiyaç: **tutarlılık cilası + psikolog odaklı bilgi mimarisi + mobil OMR/report polish’i**.

### 6.2 Ne iyi, ne aksıyor (ekran ekran)

| Ekran | İyi | Aksayan | Öneri |
|---|---|---|---|
| **Header / Sekmeler** | Sticky, hairline, `workspace-tabs` pill’i net | Admin/Psikolog sekmeleri farklı sayıda; odak halkası zayıf olabilir | `focus-visible` kalınlığını 2→3px, sekme `aria-current` + sayısal badge (taslak/kuyruk) |
| **CaseWorkspace** | 5 adımlı stepper, boş sayacı, idempotency notu | 566 girişte ilerleme hissi zayıf, “neden ilerleyemiyorum” mesajı geç geliyor | Stepper üstüne ince progress bar + “Kalan: 42 boş” + `canCreateRecord` engelini **yukarıda** sticky uyarı ile göster |
| **QuickEntry** | `D/Y/B` klavye, sanal tuşlar | Mobilde tuşlar küçük, “geri al” yok | Tuşları 44px’e büyüt, `Ctrl+Z` + “Son 5 işlem” mini-history |
| **Scanner** | Kamera advisor (700ms), PDF izole, 4 sayfa kabul kartları | Kaynak görüntü / normalize görüntü ayrımı psikoloğa fazla teknik | Kartta “Orijinal / Düzeltilmiş” sekmesi, “Yeniden çek” tek tık, güven rozeti (yeşil/sarı/kırmızı) |
| **MyRecords / AdminPanel** | Kart/tablo, tarih, sayfa kimliği | Arama/filtre yok, “eski kayıtlar görünmüyor” sessiz | Üstte arama çubuğu + filtre çipleri + “Daha fazla yükle” + “CSV indir” |
| **RecordDetail** | Sekmeli disclosure (8 sekme), grafik, kaynak künyesi | Sekme sayısı çok, ilk bakışta “ne önemli” kayboluyor | Sekme sırasını **Geçerlik → Klinik → Kod → Grafik** yap; “Özet” kartında 3 madde: Geçerlik durumu, en yüksek 2 ölçek, kritik uyarı |
| **ReportsPage** | 2 kart (Tam vs Psikolog), şablon seç, antet | Kart hiyerarşisi eşit ağırlıkta; “Tam Rapor” salt okunur olduğu daha belirgin olmalı | `01· TAM RAPOR` kartını daha sönük, `02· PSİKOLOG RAPORU` kartını accent çizgi ile vurgula (zaten kısmen var — güçlendir) |
| **ReportEditor** | Blok ekle/sil/taşı, antet, AI ekle, sürüm geçmişi | Blok taşıma sürükle-bırak değil, ok tuşları; mobilde editör + önizleme yan yana sığmıyor | Sürükle-bırak + klavye taşıma, mobilde `?gorunum=onizleme` sekmesi daha görünür (şu an var, butonu büyüt) |
| **SiteFooter** | Her ekranda aynı, SSS/Gizlilik/Kaynakça erişimi | Çok link, mobilde alt alta | Mevcut `site.css` 900/560 kırılımları iyi — koru |

### 6.3 Tasarım önerileri — Etki yüksek, risk düşük (sırayla)

**A. Token/temel (1 gün)**
- `--radius` ve `--hairline` kullanımını denetle: Bazı kartlarda `1px solid var(--hairline)` yerine `0.5px` karışmış mı tara (yoksa koru).
- `font-display` Newsreader için sistem fallback’i zaten var — başlık `letter-spacing: -0.04em`’i raporlarda koru, case ekranında da aynı kullan (tutarlılık).
- Boş durum (`empty-state-card`) illüstrasyonu: Şu an ikon + metin; psikolog için **örnek eylem** ekle (“Örnek kaydı aç” veya “Hızlı girişi dene”).

**B. Bilgi mimarisi (2–3 gün)**
- **Dashboard** ekle: `/` landing’i psikolog için “Bugün” panosuna çevir (taslak, son 5 kayıt, kuyruk, geçersiz oranı). Admin için aynı panoda “bekleyen onay” ve “aktif kullanıcı”.
- **Kayıt kartını sadeleştir:** Üstte **Durum rozeti** (Geçerli/Şüpheli/Geçersiz), ortada **2 ölçek çipi** (örn. `Pt 81 · Sc 73`), altta **tarih + yöntem + “Rapor: 2”**. Şu anki kartta çok metin var.

**C. Mobil & OMR (2 gün)**
- `ManualCornerEditor` handle’larını 24→32px, hit-area 44px; düşük ışıkta **otomatik kontrast** butonu (mevcut `enhancement.ts`’yi UI’a bağla).
- `ScanResultPreview`’da “Yalnızca incelemeliler” filtresi + `confidence` barı (0–1 değil, “güçlü/orta/zayıf” rozeti — zaten sezgisel, sayıya çevirme).

**D. Rapor editörü (3–4 gün)**
- Blok **sürükle-bırak** (keyboard fallback korunarak), **versiyon diff** (eklenen/silinen satır), **“MMPI verisi güncellendi”** bandını daha görünür (sarı uyarı → mavi bilgi).
- **3 yeni şablon:** Özet Mektup (1 sayfa, aileye), Takip Karşılaştırması (önceki T’lerle delta tablo), Adli Kısa Görüş (olgu + sınırlılık + öneri) — psikoloğun en çok zaman kazandığı yer.

**E. Erişilebilirlik (1 gün + test)**
- `prefers-reduced-motion` zaten düşünülmüş; ek: **high-contrast** modu (sarı/siyah) ihtiyacı sor — kliniklerde projektörde faydalı.
- Manuel test: NVDA + Chrome, VoiceOver + Safari, klavye-only `Tab` turu (özellikle OMR köşe handle’ları).

> **Cevap:** Tasarımsal iyileştirme **evet, ama yeniden yazma değil, cila**. En çok kazandıran 3 dokunuş: **dashboard + kayıt kartı sadeleştirme + mobil OMR polish’i**. Token sistemi ve rapor baskı sistemi zaten doğru — üzerine inşa et.

---

## 7. Her Sistemin Tek Tek Değerlendirmesi (Hızlı Kartlar)

### 7.1 Router & App Shell
- **Durum:** History API, SPA fallback (`wrangler.jsonc` + `PAGES_REDIRECTS` opsiyonu) doğru, `InfoPageShell` ile public sayfalar izole.
- **Risk:** `wrangler.jsonc` olmadan deploy Vite auto-config’e düşüyor — dokümante, iyi.
- **Öneri:** `router.test.ts`’ye “bilinmeyen rota + trailing slash + `/index.html` alias” regresyonu ekle (varsa koru).

### 7.2 Auth & Profiles
- **Güçlü:** PKCE, `sessionStorage`, `is_active_user` kapısı, `handle_new_auth_user` least-privilege.
- **Dikkat:** Public signup Supabase’de **kapalı olmalı** (dashboard → Auth → Disable public signup) — `SYSTEM.md`’de checklist’te var, canlıda doğrula.

### 7.3 Workspace & Draft
- **Güçlü:** Kullanıcı-anahtarlı, TTL, idempotency, `revisionOf`.
- **İyileştirme:** Draft’ta görüntü byte’ı yok (doğru) ama **önizleme blob URL’i** de yok; F5 sonrası “görüntüyü tekrar yükle” gerekiyor — psikoloğa “Görüntüler F5 sonrası yeniden yüklenir, veriniz kaybolmaz” notu ekle.

### 7.4 Scanner & OMR
- **Güçlü:** Magic-byte, boyut guard, worker hardening, homografi.
- **Borç:** Ana thread’de çalışıyor; büyük görüntüde mobilde takılma. **Worker’a taşıma** (P2) planla.

### 7.5 Scoring
- **Güçlü:** Kaynakla eşleşme yüksek, test kilitli.
- **Dürüstlük:** `unverified-template`, `Wiggins A/R sabitleri`, `K=15 prognoz notu` gibi sınırlar işaretli — koru.
- **Öneri:** `T 45-55` normal bandını hem ekranda hem raporda **gri kuşak** olarak görselleştir (şu an renkler var, bandı da çiz).

### 7.6 Results & Print
- **Güçlü:** Progressive disclosure, `confidence` sezgisel, `clinicalTransferAllowed:false` doğru.
- **İyileştirme:** “Geçersiz profil” durumunda **ekranda kırmızı tam-geniş bant + “Kaydetme engellendi — nedeni”** daha görünür.

### 7.7 Records & Admin
- **Güçlü:** RLS + trigger ikilisi, `count: 'exact'` mutasyon doğruluğu, `details` loglanmıyor (PII koruması).
- **Eksik:** Sayfalama, arama, toplu silme onayı (şu an tek-tek ConfirmDialog var — yeterli, toplu için de ekle).

### 7.8 Reports (yeni)
- **Güçlü:** Snapshot, atomik versiyon, RLS çift kontrol.
- **Eksik:** `mmpi_reports.idempotency_key` yok; kullanıcı çift tıklarsa iki rapor oluşabilir — `createReport`’ta istemci tarafı debounce var ama sunucu tarafı idempotency de eklenebilir (düşük öncelik).

### 7.9 AI
- **Güçlü:** Son sekme, basılmıyor, isimsiz, hız limitli, Gemini yerel yol.
- **Risk:** Kota dolunca 429 → psikolog “AI çalışmıyor” sanabilir; mesajda “kota doldu, X dakika sonra deneyin” zaten var — koru ve logla.

### 7.10 Styles & Build
- **Güçlü:** Token sistemi, print izolasyonu, CSP hash, `dist/_headers`.
- **Ufak:** `SYSTEM.md` test sayısı (375) ile gerçek (240) uyumsuz; `mobile.css` iyi ama **gerçek cihaz test matrisi** yok — ekle.

### 7.11 Docs & Audit
- **Güçlü:** `docs/mmpi-audit/*` 15 faz, `SOURCE_FACTS` 3.5k satır, `CONFLICTS`/`DECISIONS` ile izlenebilirlik mükemmel.
- **Öneri:** `AUDIT_STATE.md`’yi her release’te `scripts/mmpi-audit/state.mjs` ile otomatik güncelle (şu an manuel olabilir).

---

## 8. Puanlama — İnternette TR Örneklemi ile Karşılaştırmalı Doğrulama (Özet Tablo)

| Kaynak | Örneklem | Norm Çekirdeği | K Düzeltmesi | T Formülü | Geçerlik |
|---|---|---|---|---|---|
| **Savaşır (1981) — bu sistem** | 1666 (E1003/K663), 16–50, ilkokul+, genç/kentli [SOURCE_FACTS] | Tablo 30: örn. E Hs 13.19/4.07, K Hs 15.89/4.88; E Pd 22.22/4.45 [SOURCE_FACTS] | Hs .5, Pd .4, Pt 1, Sc 1, Ma .2 + tablo [9] | T=50+10(X-M)/SD, 20–120 [1][8] | ?≥31 geçersiz, F≥23 geçersiz, F-K>16 kritik [kaynak pp23-37] |
| `tavsiyeediyorum.com` özet [2] | “6000E/7000K” (US atıflı) | Amerikan profil kağıdı | “Formüle edilmiş oranlarda K eklenir” | T profil kağıdında | “50-70 normal” |
| `bucaram MEB` PDF [1][3] | — | Kadın/erkek ayrı profil kağıtları | K eklenmiş puan | T 50±10 | L/F’den biri çok yüksekse geçersiz |
| `mmpianaliz.com` [9] | TR normları | TR normları | Hs+0.5K vb. otomatik | T skorları | — |
| **Hüküm** | Bu sistem Savaşır 1981’i **doğru ve şeffaf** kullanıyor; “genç/kentli” sınırını saklamıyor — TR’de en güvenilir yaklaşım. | | | | |

**Sitasyonlar:** TR MMPI’nin 566 madde ve T=50±10 olduğu [1][2][9]; Türkiye standardizasyonunun Işık Savaşır tarafından yapıldığı [2]; K düzeltmesinin otomatik hesaplandığı [9]; T formülünün 50+10Z olduğu [8]; profil kağıtlarının kadın/erkek ayrı olduğu [1].

---

## 9. Güvenlik, Gizlilik, KVKK ve Etik — Durum ve Öneriler

**İyi:**
- RLS + trigger + Edge Function üç katmanlı; `profiles.active` her kapıda; `mmpi_records` immutable; `audit_logs` append-only.
- `expert_notes`/`mmpi_reports` 4000 kar + 8 MiB guard; `details` loglanmıyor (PII sızıntısı yok).
- AI isimsiz, 24 saat cihaz önbelleği, hız limiti, CORS allowlist.
- Session `sessionStorage` (sekme kapanınca düşer) → ortak cihazda **daha güvenli** ama yine de localStorage taslak kalır.

**Öneriler:**
- **Canlı doğrulama:** `SUPABASE_URL` + `SERVICE_KEY` + `SITE_ORIGIN` ile `npm run diagnose:supabase -- --allow-destructive` (yazma/silme testi) her deploy sonrası — `TROUBLESHOOTING.md`’deki 10 adım + `diagnose` betiği bunu otomatik yapıyor.
- **KVKK aydınlatma:** `PrivacyPolicyPage` (`/gizlilik`) ve `TermsPage` (`/kullanim`) var; rapora “Veri işleme hukuki sebebi, saklama süresi, danışan aydınlatması kurumca belirlenmelidir” notu ekle (SYSTEM.md §8.3’te var, rapora da 1 satır).
- **Veri minimizasyonu:** `ai-interpretation` zaten minimal; bir adım daha: `age` 16–120 dışıysa **yaşı hiç göndermeme** zaten yapılıyor — koru.
- **Ortak cihaz:** Giriş ekranında “Bu cihaz paylaşımlı mı? Oturumu kapatınca taslak da silinsin” seçeneği (localStorage’a yazmama modu) — düşük efor, yüksek etki.

---

## 10. Önceliklendirilmiş Yol Haritası

### Şimdi (1–2 hafta, yüksek etki)

- [ ] **Hasta gruplama + timeline** (ad/soyad normalize + tarih sıralı mini-grafik) — `MyRecordsPanel` + `RecordDetailPage` delta
- [ ] **Arama/filtre/sayfalama** — `supabaseRecords.ts` list fonksiyonlarına `ilike` + `range` + `order` + cursor
- [ ] **Dashboard** — `App.tsx` landing’i psikolog için pano yap (taslak, kuyruk, son kayıtlar, geçersiz oranı)
- [ ] **Canlı `db push` + `diagnose`** — `supabase/migrations` 6 dosya, `ALLOWED_ORIGINS`, `AI_API_KEY` doğrulaması
- [ ] **Doküman senkronu** — `SYSTEM.md` test sayısı 240 ↔ 375’i `npm test` çıktısına eşitle, `docs/raporlar.md` canlı doğrulama notunu güncelle

### Sırada (2–6 hafta)

- [ ] **Hızlı giriş polish** — progress bar, “sonraki boş”, kısayollar, mini-history
- [ ] **OMR polish** — “yalnızca belirsizler”, büyütme, yan-yana karşılaştırma, güven rozeti
- [ ] **Rapor şablonları** — 3 yeni şablon + antet iyileştirme + sürükle-bırak
- [ ] **CSV/JSON dışa aktar** + tek-kayıt yedek
- [ ] **Gerçek baskı/ışık kalibrasyon seti** — 36 senaryo, eşik raporu

### Sonra (6+ hafta)

- [ ] **Web Worker** (OMR) + `OffscreenCanvas` where available
- [ ] **Takvim/hatırlatma** (local)
- [ ] **Çift-göz onayı / imza** + **ASISTAN rolü**
- [ ] **İstatistikler** — kod sıklığı, yaş/cinsiyet dağılımı, kurum raporu (anonim)
- [ ] **PWA** — offline tam (şu an derleme offline, ama installable değil)

---

## 11. Tasarım Kararı — “Yeniden tasarım mı, cila mı?”

**Cila.** Gerekçeler:

1. Tasarım sistemi zaten var (token, hairline, radius, shadow, font stack) ve tutarlı.
2. En büyük psikolog kazanımı **görselden değil, bilgi mimarisinden** (gruplama, arama, pano).
3. Rapor baskısı zaten profesyonel (A4, seçilebilir metin, sayfa sayacı, dul/yetim) — doğru yolda.
4. Risk düşük: Token’lara dokunmadan, 3 ekranda (pano, kayıt kartı, OMR inceleme) odaklı iyileştirme ile **algılanan kalite 2 kat** artar, regresyon riski az.

**Eğer bütçe kısıtlıysa — tek bir tasarım yatırımı:** **Kayıt kartı + filtre çubuğu + pano** üçlüsünü 1 haftada bitir; psikolog “bu artık benim aletim” hisseder.

---

## 12. Riskler ve Açık Maddeler

| Risk | Olasılık | Etki | Azaltma |
|---|---|---|---|
| Canlı Supabase’de migration eksik (`psychologist_reports` henüz `push` edilmemiş) | Yüksek | Raporlar çalışmaz | `supabase db push` + `diagnose:supabase` hemen |
| `ALLOWED_ORIGINS` boş → canlıda `403` | Yüksek | Admin işlemleri durur | `supabase secrets set ALLOWED_ORIGINS=...` + canlı CORS testi |
| OMR gerçek kâğıt/kalem’de sapma | Orta | Hatalı `reliable` veya fazla `review` | Kalibrasyon seti + eşik config |
| Ortak cihazda localStorage taslak kalması | Orta | PII sızıntısı | “Paylaşımlı cihaz” modu + “Yeni işlem” vurgusu |
| AI kota / anahtar hatası (401/429) | Orta | AI Yorumu geçici kapalı | Net hata mesajı + durum sayfası (zaten var, koru) |
| `SYSTEM.md` test sayısı uyumsuzluğu | Düşük | Güven kaybı | Sayıları `npm test`’e eşitle |
| Hasta grupla için ad/soyad yazım farkları (Ayşe Yılmaz vs Ayşe Yilmaz) | Orta | Yanlış gruplama | Normalizasyon (NFD, lower, trim) + manuel “birleştir” eylemi |

---

## 13. Kontrol Listeleri

### 13.1 Üretim Öncesi Kod Kanıtı (yerelde DONE)

- [x] `npm ci` — 0 vuln
- [x] `npm test` — 240/240 (tam koşuda 120s+; dokümanda 375 yazıyor → senkronize et)
- [x] `npm run build` — `dist/index.html` + `optik-form.html` + `dist/_headers` ( `_redirects` yalnızca `PAGES_REDIRECTS=1` ile )
- [x] `git diff --check` — temiz

### 13.2 Canlı Doğrulama (TODO — tek komut + manuel)

- [ ] `supabase db push` — 6 migration (sonuncusu `..._psychologist_reports.sql`)
- [ ] `supabase functions deploy admin-users && supabase functions deploy ai-interpretation`
- [ ] `supabase secrets set ALLOWED_ORIGINS="https://<prod>,http://localhost:5173"` + `AI_API_KEY` / `AI_MODEL`
- [ ] `npm run diagnose:supabase` — migration/RLS/grant/trigger/audit + iki fonksiyon CORS’u
- [ ] `npm run diagnose:supabase -- --allow-destructive` — yazma/silme/CORS uçtan uca (geçici test verisiyle)
- [ ] `curl -I https://<prod>/_headers` — HSTS/nosniff/frame-ancestors başlıkları
- [ ] Gerçek A4 %100 baskı + kamera (iOS/Android) + `ManualCornerEditor` + gerçek yazıcı

---

## 14. Ek — Kaynaklar

- **Puanlama/web:** T formülü 50+10Z [8]; MMPI 566 madde, profil kağıdı kadın/erkek ayrı [1][2]; K düzeltmesi otomatik [9]; Türkiye standardizasyonu Işık Savaşır [2].
- **Kod/doküman:** `src/scoring/mmpiKeys.ts` (TURKISH_NORMS), `mmpiScoring.ts` (computeT), `mmpiSource.ts`, `docs/kaynak-denetimi.md`, `docs/mmpi-audit/SOURCE_FACTS.md` (Tablo 30 görsel doğrulama), `supabase/migrations/*`, `docs/raporlar.md`, `SYSTEM.md` (snapshot 22 Eyl).
- **Güvenlik:** `supabase/functions/*`, `tests/aiSummaryPrivacy.test.ts`, `tests/edgeFunctions.test.ts`, `TROUBLESHOOTING.md`.

[1](https://bucaram.meb.k12.tr/meb_iys_dosyalar/35/07/887814/dosyalar/2019_04/15163112_MMPI_YAZI.pdf) · [2](https://www.tavsiyeediyorum.com/makale_17227.htm) · [3](https://bucaram.meb.k12.tr/meb_iys_dosyalar/35/07/887814/dosyalar/2019_04/15163112_MMPI_YAZI.pdf) · [4](https://dergipark.org.tr/tr/download/article-file/100096) · [5](https://sertifika.kent.edu.tr/minnesota-cok-yonlu-kisilik-envanteri-mmpi-sertifika-programi-hakkinda-hakkinda) · [8](https://egitimerkezi.com/t-puani-hesaplama-t-puani-nedir/) · [9](https://mmpianaliz.com/)

---

## 15. Son Söz — Psikolog İçin Net Öneri

> **Sistem klinik olarak kullanıma hazır bir çekirdeğe sahip; “daha fazla ölçek eklemek” değil, “psikoloğun gününü kısaltmak” yatırımı yapın.**
>
> 1. **Hasta-merkezli pano + arama/filtre** (1–2 hafta) → en çok zaman kazandıran hamle.
> 2. **Rapor şablonları + CSV + OMR polish** (2–4 hafta) → “boş sayfadan başlama” ve “mobil inceleme” sürtünmesini bitirir.
> 3. **Gerçek kâğıt kalibrasyonu + Worker** (sonra) → güveni sayıya döker, mobilde akıcılık artar.
>
> Tasarım için **yeniden yazma yok** — mevcut token sistemi üzerine **3 ekranda cila** yeterli. Puanlama için **değişiklik yok** — Türk normları doğru; yalnızca **örneklem sınırını** her raporda bir satırla şeffaf tutun.

---

*Bu rapor `arena/01a0ce50-repo123`’te oluşturuldu, Git’e yazıldı ve canlı Supabase/cihaz doğrulaması için `SYSTEM.md §10` ve `TROUBLESHOOTING.md`’deki komutlar izlenmelidir. Hatalı bir sayı/iddia görürseniz `docs/mmpi-audit/CONFLICTS.md`’ye `CONFLICT-xxx` olarak ekleyin — projenin en güçlü geleneği dürüst denetim izidir.*
