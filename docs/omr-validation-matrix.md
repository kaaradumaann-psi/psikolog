# OMR Gerçek Kâğıt Doğrulama Matrisi — Stage 8

> Tarih: 2026-09-23 — mimariyi koruma, üretim doğrulaması, psikolog hızlandırma, OMR güvenilirlik ölçümü
> Tek doğruluk kaynağı: `src/form/layout.ts` FormDefinition (566 madde, 4 sayfa, OMR geometri), `src/scoring/*` (Savaşır 1981 Tablo 30), `src/omr/*`

## Amaç
Sentetik raster ve depo PDF raster dışında **gerçek baskı + gerçek kalem + gerçek telefon kamerası** koşullarında OMR okuma doğruluğunu ölçmek. Sonuçlar sentetik başarıdan ayrı raporlanır; fotokopi kayması ve perspektif hatası kalibre edilene kadar üretimde **manuel inceleme (review) kapısı** zorunludur.

## Kapsam — DEĞİŞMEZLER
- FormDefinition, 566 madde, OMR koordinat sistemi, scoring mimarisi, Savaşır 1981 Türk normları, K düzeltme, validite eşikleri, klinik anahtarlar **değişmez**. Bu matris yalnızca ölçüm ve eşik önerisi üretir.
- Her test baskısı Forms/OMR geometriyle aynıdır; fotokopi küçültme/büyütme tespit edilirse sayfa `quality.reasons` ile reddedilir.

## Test Matrisi

| # | Değişken | Seviyeler | Ground truth yöntemi | Geçme eşiği |
|---|----------|-----------|----------------------|-------------|
| A | Yazıcı | Lazer (600dpi), Mürekkep püskürtmeli, Ofis fotokopi baskı | Ground truth cevap şablonunu (anahtar) yazıcıdan ayrı oluştur; optik form üzerine **bilinen** D/Y deseni işaretle (ör. tek-çift, çapraz). Her sayfa için beklenen `items[].choiceId` listesi elde saklanır. | Okuma hatası ≤ %1 (≤6/566) ideal, ≤ %2 (≤12/566) kabul |
| B | Kâğıt | 80 g beyaz, 90 g mat, geri dönüştürülmüş gri | Aynı listedeki 3 kâğıda aynı desen işaretlenir; taramada kağıt emiciliği nedeniyle coverage darkening farkı ölçülür | blank/ambiguous artışı < %1.5 |
| C | Kalem | G2 jel siyah, kurşun kalem (2B), tükenmez mavi | Aynı form 3 kalemle işaretlenir; OMR darkness threshold farklı kalemlerde ayrı kalibre edilir | Tüm kalemlerde reliable ≥ %98 |
| D | Işık | Ofis floresan 500lux, gün ışığı gölge, düşük ışık 150lux | Aynı işaretli form 3 ışıkta, aynı telefonda (sabitleyici ile) taranır; `quality.metrics.brightness/shadowSpread` izlenir | Düşük ışıkta quality.fatal == false ve hata ≤ %2 |
| E | Perspektif | Tam karşı (0°), 15° eğik, masa üstü elde 30° | Her açıda aynı form; detector corner bulma `sourceCorners` RMSE ve `pixelsPerMm` izlenir | 15°’de ≥ %99 doğru, 30°’de ≥ %97 veya `quality.ok==false` ile güvenli reddetme |
| F | Telefon | iPhone 13, Android orta sınıf (Redmi), düşük segment | Aynı baskı, 3 cihaz, aynı ışık ve açıda; çözünürlük/blur `laplacianVariance` farkı | En zayıf cihazda bile hata ≤ %2.5 veya güvenli reddetme |
| G | Fotokopi | Orijinal → %98, %100, %102 fotokopi (küçült/büyüt) | Bilerek kaydırılmış baskılar; form `fingerprint` ve borderContrast ile reddedilmeli | %98 ve %102’de sistem **kaydı engellemeli** (fingerprint/batchId uyuşmazlığı), yanlış okuma yapmamalı |
| H | İşaret biç‏‏imi | Tam dolu daire, yarım gölgeli, tik, çift işaret | Kasitli edge case’ler; `multiple`/`ambiguous` doğru sınıflanmalı | Çift/ belirsiz işaretler ≥ %95 `ambiguous`/`multiple` olarak işaretlenmeli, asla sessizce D/Y’ye çevrilmemeli |

## Prosedür (Ground Truth)

1. **Anahtar üretimi**: `src/omr/`’deki sentetik form üreticisi veya elle doldurulmuş şablon; her madde için beklenen D/Y/null, `groundTruth.json` olarak saklanır (orijinal repo’ya değil, test artefakt deposuna).
2. **Baskı**: Her varyant için aynı PDF, aynı FormDefinition fingerprint’iyle yazdırılır. Yazıcı sürücüsünde “sayfaya sığdır” kapalı, %100 ölçek zorunlu.
3. **İşaretleme**: Ground truth listesine sadık kalınır; 566 maddenin tamamı işaretlenir (boş bırakılanlar bilinçli `null` olarak).
4. **Tarama**: Her varyant ≥ 3 tekrar (aynı formun 3 fotoğrafı — hafif el titremesi dahil). `supabaseRecords` kaydı oluşturulmaz; yalnızca OMR pipeline (`enhancement`, `captureGates`, `fileIdentify`) koşulur.
5. **Ölçüm**: `items[].choiceId` ile ground truth karşılaştırılır. Hata kategorileri: `single↔blank`, `D↔Y`, `multiple/ambiguous` yanlış sınıflandırma, `quality.ok` yanlış `true/false`.
6. **Raporlama**: Her hücre için “doğru / toplam, hata % , reliable % , blank % , reddedilen sayfa %”.

## Kabul Kriterleri (Canlıya Geçiş İçin)

- **Güvenli reddetme > sessiz yanlış okuma.** Fotokopi kayması veya düşük ışıkta sistem **kaydı engellemeli**; yanlış D/Y üretmemeli.
- Toplam ≥ 21 form × 3 tekrar = 63 tarama. Hata matrisinde medyan hata ≤ %1.5 ve P95 hata ≤ %2.5 ise OMR “kalibre” kabul edilir; aşılırsa threshold/kapı ayarları değiştirilir, norm/puanlama dokunulmaz.
- Sonuçlar bu dosyaya eklenir (`## Sonuçlar — 2026-09-` bölümü), artefakt olarak `docs/omr-validation-matrix.md` versiyonlanır.

## Sentetik vs Gerçek — Mevcut Durum (2026-09-23)

- **Sentetik raster**: 240/240 test geçiyor (node + jsdom + canvas raster), skor doğruluğu 26/26 Tablo 30 eşleşiyor.
- **Depo PDF raster**: `captureGates` ile doğrulanıyor, fakat gerçek kâğıt/kalem/ışık varyasyonu içermiyor.
- **Gerçek kâğıt**: henüz ölçülmedi (bu matris prosedürü onaylandı, saha testi TODO). Canlıda OMR gate **manualReview = true** olana kadar kayda izin vermez; bu, gerçek kâğıt kalibrasyonu bitene kadar güvenliği korur.

## Artefakt Saklama

- Ham fotoğraflar KVKK nedeniyle depoya konmaz; yalnızca groundTruth JSON ve özet metrikler saklanır.
- Gerçek form fotoğrafları (varsa) `fixtures/omr-real/*` altında `.gitignore` ile dışarıda tutulmalı; matris burada yalnızca metriği belgeler.

## Sonraki Adım

Saha testi koşulduğunda bu dosyanın altına `## Sonuçlar` ekle ve `docs/reports/KAPSAMLI_DEGERLENDIRME_2026-09-23.md`’deki OMR bölümünü güncelle.
