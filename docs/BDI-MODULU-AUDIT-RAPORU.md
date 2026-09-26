# BDI MODÜLÜ AUDIT RAPORU

**Denetim tarihi:** 26.09.2026  
**Kapsam:** Klinik kimlik, telif/yetki, 21 maddelik yapı, puanlama, güvenlik, istemci akışı, yerel/bulut kalıcılığı, rapor/PDF ve testler  
**Kod sürümü:** `BDI-original-1961-TR-Hisli-1988/1989` · puanlayıcı `bdi-original-total-v1`

> **Telif güvenliği notu:** Bu rapor hiçbir BDI maddesini veya yanıt seçeneğini yayımlamaz, kopyalamaz, yeniden yazmaz ya da tahmin etmez. “Kavram/metin” denetiminin yapılamadığı yerler açıkça **DOĞRULANAMADI / FAIL-SAFE** olarak işaretlenmiştir.

## 1. Yönetici özeti ve nihai karar

| Alan | Denetim sonucu | Uygulanan karar |
|---|---|---|
| Ölçek kimliği | **KISMİ PASS** | Modül, Beck, Ward, Mendelson, Mock ve Erbaugh’ın 1961 BDI ailesi ile Hisli’nin 1988/1989 Türkçe çalışmalarına bağlandı. **BDI-II değildir.** |
| BDI mi, BDI-IA mı? | **DOĞRULANAMADI** | Depodan kaldırılan Türkçe metnin yetkili bir özgün BDI veya 1978 revizyonu/BDI-IA formuyla bire bir eşdeğerliği kanıtlanamadı. Bu nedenle ürün “özgün BDI ailesi/Hisli bağlamı”ndan daha dar bir sürüm iddiası kurmaz. |
| Yetkili Türkçe madde içeriği | **FAIL-SAFE** | Depoda lisans/yetki ve doğrulanmış madde bankası kanıtı yoktur. Madde ve seçenek metinleri koddan kaldırıldı; ekran yalnız 1–21 için 0–3 puan aktarır. |
| Yapı ve aritmetik | **PASS** | Tam 21 benzersiz madde kimliği, yalnız tam sayı 0–3, toplam 0–63. |
| Eksik/geçersiz yanıt | **PASS** | Eksik, `null`, `undefined`, metin, kesir, aralık dışı, bilinmeyen ve yinelenen kimlik puanlanmaz. |
| Türkçe kesme puanı | **KISMİ PASS** | 17 yalnız Hisli BDI literatüründeki **tarama referansı** olarak “altında / eşikte veya üzerinde” biçiminde gösterilir; tanı veya şiddet sınıfı değildir. |
| Alt ölçekler | **PASS** | Doğrulanmamış “Bilişsel-Duygusal” ve “Somatik-Performans” klinik alt puanları kaldırıldı. |
| Madde 9 | **PASS** | Nötr “klinik değerlendirme gerekebilir” bayrağıdır; intihar tanısı, risk düzeyi/yüzdesi veya otomatik karar üretilmez. |
| Tek sonuç kaynağı | **PASS (kod/test)** | Ekran, saklama, rapor ve sonuç PDF’si aynı katı puanlama nesnesinden beslenir. |
| Gerçek tarayıcı kanıtı | **PASS** | İstenen 13 Playwright senaryosu gerçek Chromium’da 13/13 ve Mobile Chrome profilinde 13/13 geçti. Firefox/WebKit ikilileri bu ortamda yoktur ve PASS iddiası yapılmaz. |

**Nihai karar:** Modül artık yetkisiz/test metni dağıtan bir anket değildir; yetkili Hisli Türkçe BDI formu yanında kullanılacak kontrollü puan aktarımı, kayıt ve sonuç özetidir. Yetkili form sağlanmadan madde düzeyinde içerik eşdeğerliği iddia edilemez.

## 2. Sürüm kimliği: BDI, BDI-IA ve BDI-II ayrımı

### 2.1 Doğrulanabilen kimlik

- Özgün makale: **Beck, A. T.; Ward, C. H.; Mendelson, M.; Mock, J.; Erbaugh, J. (1961), “An Inventory for Measuring Depression.”**
- Özgün araç 21 klinik belirti/tutum grubuyla tanımlanır. Kodun yürütülebilir yapısı da 21 numaralı puan yuvasıdır.
- Hisli’nin 1988 ve 1989 yayınları Türkçe BDI bağlamının bibliyografik dayanağıdır.
- Uygulamada görünen ve saklanan açık sürüm: `BDI-original-1961-TR-Hisli-1988/1989`.

### 2.2 Neden BDI-II değildir?

BDI-II, Beck, Steer ve Brown tarafından 1996’da yayımlanan ayrı revizyondur; Pearson ürün bilgisinde iki haftalık dönem, 13–80 yaş aralığı ve BDI/BDI-1A’dan değişen içerik belirtilir. Kapçı, Uslu, Türkçapar ve Karaoğlan’ın Türkçe yetişkin çalışması da **BDI-II** içindir. Bu bilgiler ve BDI-II’ye ait 0–12 / 13–18 / 19–28 / 29–63 aralıkları mevcut özgün-BDI/Hisli modülüne taşınmamıştır.

### 2.3 Neden kesin “BDI-IA” denmedi?

1978 revizyonu literatürde BDI-IA/BDI-1A olarak ayrılır. Fakat depoda daha önce bulunan Türkçe kelimelerin hangi yetkili baskıdan geldiğini gösteren yayıncı formu, form kodu, lisans kaydı veya kontrollü metin karşılaştırması yoktu. Başlık, madde sayısı veya toplam puan tek başına BDI ile BDI-IA arasında bire bir form kimliği kanıtlamaz. Sonuç bu nedenle:

- **BDI-II:** FAIL / dışlandı.
- **Özgün BDI ailesi + Hisli Türkçe bağlamı:** PASS.
- **Tam olarak özgün 1961 form mu, BDI-IA mı:** DOĞRULANAMADI.

## 3. Klinik özellik matrisi

| Özellik | Sonuç | Not |
|---|---|---|
| Tam ad | Beck Depression Inventory (BDI) / Beck Depresyon Envanteri | PASS; 1961 makalesi ve APA özeti. |
| Yazarlar | Aaron T. Beck, C. H. Ward, M. Mendelson, J. Mock, J. Erbaugh | PASS; 1961 birincil yayın. |
| İlk yıl | 1961 | PASS. |
| Türkçe bağlam | Nesrin Hisli, 1988 ve 1989 | PASS bibliyografik düzeyde. |
| Madde sayısı | 21 | PASS. |
| Yanıt/puan modeli | Her numaralı grup için 0–3 puan | PASS puanlayıcı düzeyinde. Yetkili seçenek ifadeleri depoda yoktur. |
| En yüksek toplam | 63 | PASS: 21 × 3. |
| Uygulama dönemi | Yetkili formun yönergesi | **DOĞRULANAMADI.** BDI-II’nin “son iki hafta” yönergesi bu forma aktarılmadı. UI zaman aralığı icat etmez. |
| Yaş aralığı | Yetkili form/el kitabı belirlemeli | **DOĞRULANAMADI.** BDI-II için yayımlanan 13–80 bilgisi özgün/Hisli forma aktarılmadı. Yaş yalnız kayıt metadatasıdır, puanı değiştirmez. |
| Türkçe tarama referansı | 17 | KISMİ PASS; tanısal sınır veya şiddet bandı değildir. |
| Türkçe şiddet bantları | Yok | PASS: kanıtlanmayan dört bant kaldırıldı. |
| Faktör/alt ölçek | Klinik alt puan üretilmez | PASS: çalışmalardaki örnekleme bağlı faktör yapıları resmî alt ölçek gibi kullanılmaz. |

## 4. Lisans, yetki ve içerik sınırı

Pearson’ın yasal politikası test soruları, yanıtları, formları ve el kitaplarını korunan test materyali olarak ele alır. Depoda eski Türkçe metnin yetkili kaynaktan geldiğini veya yeniden dağıtılabildiğini kanıtlayan kayıt bulunmadı. Bu nedenle:

1. Türkçe madde ve seçenek metni `src/clinical/beckDepression.ts` ile UI’dan kaldırıldı.
2. Hiçbir metin internet kopyasından tamamlanmadı, “düzeltilmedi”, çevrilmedi veya yeniden ifade edilmedi.
3. Ekran ve boş PDF yalnız **Madde 1…21 / Puan 0…3** aktarım altyapısıdır.
4. Yetkili formun dönem ve yaş yönergesi UI tarafından tahmin edilmez.
5. BDI-II ürün/metadatası bu modülün klinik kuralı yapılmaz.

**Yetkili madde metni ileride sağlanırsa:** içerik, puanlayıcıdan ayrı erişim kontrollü bir materyal sağlayıcı katmanında tutulmalı; form kimliği, yayıncı/form kodu, dil, baskı, lisans kapsamı ve geçerlilik tarihi zorunlu olmalıdır. Puanlama çekirdeği metne bağımlı hale getirilmemelidir.

## 5. Madde 1–21 audit matrisi (korunan metin yayımlanmadan)

Lejant: **PASS** = kod ve eşleme doğrulandı; **FAIL-SAFE** = yetkili içerik olmadan iddia reddedildi; **N/A** = özel güvenlik bayrağı uygulanmaz. “Kavram/seçenek” sütunu bilerek metin içermez.

| ID | Sıra ve tekillik | Kavram/seçenek eşdeğerliği | Değer/yön | Güvenlik | DB ve rapor eşlemesi | Sonuç |
|---:|---|---|---|---|---|---|
| 1 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=1]` | KISMİ PASS |
| 2 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=2]` | KISMİ PASS |
| 3 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=3]` | KISMİ PASS |
| 4 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=4]` | KISMİ PASS |
| 5 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=5]` | KISMİ PASS |
| 6 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=6]` | KISMİ PASS |
| 7 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=7]` | KISMİ PASS |
| 8 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=8]` | KISMİ PASS |
| 9 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | **PASS · >0 nötr değerlendirme bayrağı** | PASS · puan + yapılandırılmış bayrak | KISMİ PASS |
| 10 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=10]` | KISMİ PASS |
| 11 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=11]` | KISMİ PASS |
| 12 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=12]` | KISMİ PASS |
| 13 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=13]` | KISMİ PASS |
| 14 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=14]` | KISMİ PASS |
| 15 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=15]` | KISMİ PASS |
| 16 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=16]` | KISMİ PASS |
| 17 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=17]` | KISMİ PASS |
| 18 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=18]` | KISMİ PASS |
| 19 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=19]` | KISMİ PASS |
| 20 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=20]` | KISMİ PASS |
| 21 | PASS | FAIL-SAFE | PASS · 0–3, yüksek değer toplama eklenir | N/A | PASS · `responses[itemId=21]` | KISMİ PASS |

**Matris kararı:** Kimlik, sıra, değer, yön ve teknik eşleme PASS’tir. Yetkili form olmadan kavram ve seçenek cümlelerinin bire bir doğrulanması mümkün değildir; bu alanın PASS sayılması sahte kanıt olurdu. Güvenli ürün kararı içerik dağıtmamak ve yetkili formu zorunlu tutmaktır.

## 6. Puanlama ve klinik yorum audit’i

### 6.1 Tek puanlama motoru

`scoreBeckDepression` şu sözleşmeyi uygular:

- Girdi `{ itemId, score }[]` biçimindedir.
- Yalnız 1–21 kimlikleri ve 0–3 tam sayıları kabul edilir.
- Her kimlik tam bir kez bulunmalıdır.
- Eksik veri “0” yapılmaz; toplam alanı dahi üretilmez.
- Geçerli tam formda toplam 0–63’tür.
- Yanıt sırası sonucu değiştirmez; kalıcı çıktı 1–21 sıralanır.
- Aynı nesne web sonucu, kayıt, rapor ve PDF’ye gider.

### 6.2 17 puan bağlamı

17 değeri Türkçe özgün-BDI literatüründe tarama amacıyla kullanılan bir referanstır. Uygulama yalnız iki ifade üretir:

- `Tarama eşiğinin altında`
- `Tarama eşiğinde veya üzerinde`

Bu ifade tanı, depresyon şiddeti, tedavi emri, prognoz veya risk yüzdesi değildir. Önceki “Minimal / Hafif / Orta / Şiddetli” BDI dört-bandı kaldırılmış; eski kayıtlar yalnız geriye dönük okunabilir tutulmuştur.

### 6.3 Alt ölçek kararı

Depoda önceki “Bilişsel-Duygusal” (1–13) ve “Somatik-Performans” (14–21) ayrımını bu sürüm için resmîleştiren yayıncı kuralı veya Türkçe doğrulama kanıtı yoktu. Faktör yapılarının örnekleme göre değişebilmesi nedeniyle bu toplamlar kaldırıldı. Yeni kayıt, rapor ve PDF’de üretilmez.

## 7. Madde 9, güvenlik ve klinik sorumluluk

- Madde 9 puanı yapılandırılmış sonuçta ayrıca korunur.
- Değer `>0` ise `criticalItemEndorsed=true` ve `item-9-endorsed` bayrağı kaydedilir.
- Görünen dil: “Toplam puandan bağımsız klinik değerlendirme gerekebilir.”
- Sistem “intihar riski var/yok”, düşük/orta/yüksek risk, yüzde, tanı veya otomatik tedavi kararı üretmez.
- Bayrağın olmaması bağımsız güvenlik değerlendirmesinin yerine geçmez.
- Uzman notu otomatik özetten ayrıdır ve kullanıcı tarafından yazılır.
- Tarihsel `suicideRisk` / `suicideItemScore` yalnız eski kayıt okuma uyumluluğudur; yeni kayıtta yazılmaz.

## 8. UI ve tek iş akışı audit’i

| Gereksinim | Sonuç | Uygulama |
|---|---|---|
| Demografi + uygulama + yanıt + ilerleme + sonuç + kayıt + PDF | PASS | Tek sayfa ve tek sonuç nesnesi. |
| Kayıtlı danışan senkronu | PASS | ID, ad, doğum tarihinden uygulama-tarihi yaşı ve mevcut modeldeki cinsiyet dosyadan gelir; alanlar salt okunurdur. |
| Manuel/kayıtlı çakışması | PASS | Modlar ayrıdır; kayıtlı seçim manuel adı sonuca taşımaz. Manuel taslak ayrıca geri gelir. |
| Danışanlar arası taslak sızıntısı | PASS (kod/test) | Anahtar; ölçüm sürümü + varlık + uygulama kimliğine bağlıdır ve `sessionStorage` kullanır. |
| Tarih güvenliği | PASS | Gerçek `YYYY-MM-DD`, gelecek tarih reddi, Europe/Istanbul “bugün”; gösterim `Date` nesnesine çevrilmeden yapılır. |
| Erişilebilir seçim | PASS (kod) | Her satır gerçek `fieldset`/`legend` ve aynı isimli gerçek radio grubudur; klavye odağı görünürdür. |
| Mobil | PASS | Dört puan seçeneği tek satırda, bölümler tek sütuna düşer; Mobile Chrome profilindeki 13/13 senaryo geçti ve 390 px yatay taşma denetlendi. |
| Görsel sınır | PASS | Sol menü, üst bar, navigasyon, rota ve footer değiştirilmedi. BDI alanı sade çizgi/boşluk hiyerarşisidir; gradyan, glass/neon veya mavi sol şerit kart yoktur. |
| PDF | PASS (kod) | Boş aktarım çıktısı test kitapçığı değildir. Sonuç çıktısı aynı kimlik, tarih, demografi, toplam, 21 puan, kritik bayrak ve uzman notunu kullanır. |

## 9. Veri modeli, kalıcılık ve revizyon audit’i

Yeni tamamlanmış sonuçta şu alanlar vardır:

- `id`, `clientId`, `clientName`, `clientGender`, `clientAge`, `testDate`
- `instrumentId`, `instrumentVersion`, `scoringVersion`
- `completionStatus: complete`
- `responses: [{itemId, score}]` ve eski okuyucular için aynı veriden türetilen `answers`
- `totalScore`, `maximumScore`, `screeningThreshold`, `screeningThresholdReached`, nötr `scoreBand`
- nötr `criticalItemEndorsed`, `criticalItemScore`, `criticalItemFlags`
- otomatik klinik özet ve ayrı `notes`
- `createdAt`, `updatedAt`, `revision`, `revisionOf`

Kayıttan hemen önce mevcut puanlayıcı sürümündeki yanıtlar yeniden hesaplanır; toplam, 63 üst sınırı, eşik, bant, kritik alan, bayraklar ve eski-okuyucu yanıt dizisi uyuşmuyorsa kayıt reddedilir.

Her yeni uygulama yeni `id` alır. Tamamlanmış kayıt üzerinde değişiklik kaydetmek eski satırı güncellemez; yeni `id` ve `revisionOf` ile yeni revizyon oluşturur. Aynı değişmemiş formun ikinci “kaydet” işlemi yinelenen satır üretmez. Genel mağazanın tarihsel aynı-ID upsert davranışı, diğer modüller ve senkron sözleşmeleri bozulmasın diye korunmuştur; BDI UI yeni uygulama/revizyon için kimliği değiştirir.

Bulut şeması zaten her uygulamayı `test_administrations`, sonucunu `test_results.result_data` JSONB içinde tutar; geniş şema değişikliği gerekmez. Küçük bir sistem tanımı düzeltme migrasyonu özgün BDI/Hisli kimliğini, 21 × 0–3 modeli ve yetkili-form gereğini yazar.

## 10. Testler ve doğrulama durumu

### 10.1 Birim/entegrasyon kapsamı

Eklenen veya yenilenen testler:

- 0/63 ve 63/63 sınırları
- 16 ve 17 tarama referansı sınırı
- madde 9 nötr bayrağı
- yanıt sırasından bağımsız toplam
- eksik 1 madde ve tamamen boş form
- yinelenen ve bilinmeyen kimlik
- `null`, `undefined`, metin, kesir, `NaN`, sonsuz ve aralık dışı puan
- bozuk yanıt nesnesi
- boş yuvaların 0’a çevrilmemesi
- sonuç metadatası/revizyonu
- tamamlanmamış sonuç oluşturma reddi
- kayıt öncesi bütünlük yeniden hesaplaması
- eski kayıt okuma uyumluluğu
- taslakta sürüm/varlık/uygulama izolasyonu
- gerçek/imkânsız/gelecek date-only değerleri ve doğum günü yaş sınırı

### 10.2 İstenen 13 gerçek tarayıcı senaryosu

`e2e/bdi-audit.spec.ts` içinde aşağıdaki 13 senaryo uygulanmıştır:

1. Sürüm ve hak/yetki bildirimi
2. Boş formun puanlanmaması
3. 21 sıfır = 0/63
4. 16 puan eşik altı
5. 17 puan tanısız tarama referansı
6. 63/63 üst sınır
7. Madde 9 nötr uyarısı
8. Radio/klavye/mobil yatay taşma
9. Danışan A/B taslak izolasyonu
10. Manuel/kayıtlı kimlik ayrımı
11. Gelecek tarih reddi ve tarih kaymaması
12. Yinelenen kaydı önleme + değişiklikte bağlı revizyon
13. Sonuç PDF’sinde tek kaynak, 21 yanıt ve uzman notu

Playwright keşfi başarılıdır: 13 senaryo Chromium, Firefox, WebKit ve Mobile Chrome projelerinde toplam 52 vaka olarak listelenmiştir. Standart Playwright indirmesi TLS `ECONNRESET` / `SSL_ERROR_SYSCALL` nedeniyle çalışmadı; repo bağımlılıklarını değiştirmeden geçici dizine kurulan `@sparticuz/chromium@153.0.0` ikilisi ve kendi AL2023 çalışma kitaplıkları kullanıldı. **Gerçek koşular:** Chromium masaüstü 13/13 PASS; Mobile Chrome 13/13 PASS. Firefox ve WebKit ikilileri mevcut olmadığından o projeler için sonuç iddia edilmez.

### 10.3 Çalıştırma kayıtları

Rapor hazırlanırken:

- `npm run typecheck` → PASS
- BDI odaklı 24 test → PASS
- Tam `npm test` → PASS: 228/228 test, 0 başarısız.
- `npm run build` → PASS: TypeScript + Vite üretim derlemesi.
- `npx playwright test e2e/bdi-audit.spec.ts --list` → PASS (52 keşfedilen vaka)
- Gerçek Chromium masaüstü koşusu → PASS: 13/13
- Gerçek Mobile Chrome profil koşusu → PASS: 13/13
- Firefox/WebKit → ÇALIŞTIRILMADI; bu ikililer ortamda yok

## 11. Kaynaklar, sınırlılıklar ve kapanış

### 11.1 Birincil/otoritatif ve hak sahibi kaynaklar

1. Beck AT, Ward CH, Mendelson M, Mock J, Erbaugh J. **An Inventory for Measuring Depression.** *Archives of General Psychiatry.* 1961;4(6):561–571. DOI: [10.1001/archpsyc.1961.01710120031004](https://doi.org/10.1001/archpsyc.1961.01710120031004). [PubMed PMID 13688369](https://pubmed.ncbi.nlm.nih.gov/13688369/).
2. American Psychological Association. **Depression Assessment Instruments.** BDI’nin 21 maddeli öz bildirim aracı olduğunu açıklar; 1961 özgün yayını 1996 BDI-II el kitabından ayırır ve erişim için Pearson’a yönlendirir. <https://www.apa.org/depression-guideline/assessment>
3. Pearson Clinical. **Beck Depression Inventory-II product information.** BDI-II’nin 1996, Beck/Steer/Brown, 13–80 yaş ve son iki hafta özellikleri yalnız ayrı sürümü ayırt etmek için kullanıldı. <https://www.pearsonclinical.in/products/programs/beck-depression-inventory.html>
4. Pearson. **Legal Policies / Test Materials.** Soru, yanıt, form ve el kitaplarının korunan materyal olduğuna ilişkin hak politikası. <https://www.pearsonassessments.com/footer/legal-policies.html>
5. Kapçı EG, Uslu R, Türkçapar H, Karaoğlan A. **Beck Depression Inventory II: evaluation of the psychometric properties and cut-off points in a Turkish adult population.** *Depression and Anxiety.* 2008;25(10):E104–E110. DOI: [10.1002/da.20371](https://doi.org/10.1002/da.20371); [PubMed PMID 17876817](https://pubmed.ncbi.nlm.nih.gov/17876817/). Bu çalışma BDI-II içindir ve mevcut modüle kesme bandı taşımak için kullanılmamıştır.
6. Türk Psikologlar Derneği yayın indeksi. Hisli’nin 1989 makalesi için dergi/yıl/sayfa bibliyografik kaydı. <https://psikolog.org.tr/yayinlar/turk-psikoloji-dergisi>
7. Hisli N. **Beck Depresyon Envanteri’nin geçerliği üzerine bir çalışma.** *Psikoloji Dergisi.* 1988;6(22):118–126.
8. Hisli N. **Beck Depresyon Envanteri’nin üniversite öğrencileri için geçerliği, güvenirliği.** *Psikoloji Dergisi.* 1989;7(23):3–13.
9. Cambridge Core / *International Psychogeriatrics*. Özgün BDI, BDI-IA ve BDI-II sürüm ayrımını tartışan hakemli kaynak. <https://www.cambridge.org/core/journals/international-psychogeriatrics/article/beck-depression-inventoryii-selfreport-or-interviewbased-administrations-show-different-results-in-older-persons/DBA93C0B7E8FCC4BCBB7D38A0FE79B1A>
10. Turkish Journal of Clinical Psychiatry (hakemli klinik kaynak). Türkçe özgün BDI kullanımında 17 puan referansına örnek; referans tanı bandına dönüştürülmemiştir. <https://www.tandfonline.com/doi/full/10.1080/24750573.2019.1635673>
11. Wang YP, Gorenstein C. **Psychometric properties of the Beck Depression Inventory-II: a comprehensive review.** Faktör/kesme değerlerinin bağlama göre değişebildiğini ve tanısal aşırı yoruma karşı dikkat gereğini destekler; BDI-II metadatası mevcut forma aktarılmamıştır. <https://rbppsiquiatria.org.br/details/245/en-US/psychometric-properties-of-the-beck-depression-inventory-ii--a-comprehensive-review>

### 11.2 Açık sınırlılıklar

- Hisli Türkçe formunun yetkili tam metni ve form kodu depoda olmadığı için madde kavramı/seçenek eşdeğerliği doğrulanmamıştır.
- Türk Psikologlar Derneği indeksinde görünen Hisli 1989 kaydı denetim sırasında doğrudan sayfada 404 verebilmiştir. İndekste gösterilen `10.31828/tpd1300443319890000m000366` dizgesi doi.org’da çözülmediği için bu rapor onu geçerli DOI olarak sunmaz.
- Yetkili özgün/Hisli el kitabı olmadan kesin uygulama dönemi ve yaş aralığı iddia edilmemiştir.
- 17 puanın farklı örneklemlerdeki performansı klinik tanı doğruluğu garantisi değildir.
- Chromium ve Mobile Chrome kanıtı alınmıştır; Firefox, WebKit ve gerçek işletim sistemi print-dialog görsel karşılaştırması ayrıca çalıştırılmamıştır. Sonuç-PDF testinde print modu, başlık, kimlik, sürüm, toplam, 21 yanıt ve uzman notunun aynı DOM/sonuç kaynağından geldiği doğrulanmıştır.

### 11.3 Değişmeden bırakılan alanlar

Sol sidebar, sidebar footer, üst header/top bar, navigasyon yapısı, rotalar, genel footer ve uygulamanın mevcut chrome görsel dili değiştirilmemiştir. Backend tablosu yeniden tasarlanmamış; yalnız sistem BDI tanımı düzeltilmiş ve mevcut JSONB sonuç alanı kullanılmıştır.

**Kapanış:** Klinik olarak savunulabilir durum “metni biliyormuş gibi davranmak” değil, sürüm belirsizliğini ve hak sınırını görünür kılıp katı puanlama/persistans sözleşmesi kurmaktır. Bu modül bu güvenli sınıra çekilmiştir; madde düzeyinde tam PASS ancak yetkili Türkçe form ve kullanım hakkı üzerinden kontrollü bir karşılaştırmayla verilebilir.
