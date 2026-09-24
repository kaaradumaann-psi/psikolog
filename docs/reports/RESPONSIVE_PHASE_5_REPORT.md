# RESPONSIVE — PHASE 5 RAPORU (Raporlar / Grafikler / Yazdırma)

**Tarih:** 2026‑09‑23
**Branch:** `arena/01a0d039-repo123`
**Önceki commit:** `3a1c034` (`docs: phase 4 report`)

---

## Changed

| Dosya | Değişiklik |
| --- | --- |
| `src/styles/reports.css` | `.report-split` / `.report-mobile-tabs` / önizleme paneli davranışı **≤980px → ≤1240px** bandına taşındı (yeni blok). `.report-choice-grid`, `.psych-paper` tipografisi vb. 980px'te kaldı. |
| `src/styles/responsive.css` | Önizleme paneli yükseklik sınırı `≥1241px`'e kapsamlandı; yeni **08 · ≤720px rapor/grafik/kağıt** bölümü (kaydırma affordance'ı, `dvh` sınırları, ipucu) |
| `src/components/results/MMPIResultsPanel.tsx` | Grafik kartına **telefonda görünen tek satır ipucu** eklendi |
| `tests/responsiveContracts.test.ts` | +6 test (toplam 22) |

---

## Tespit edilen mevcut davranış (önce)

**P0‑2 — Rapor editörü tablet/dizüstü bandında kullanılamaz hâle geliyordu.**
`reports.css:229`: `.report-split { grid-template-columns: minmax(0, 1.1fr) 760px }` — önizleme kolonu
**sabit 760px**. Tek kolona iniş yalnızca `@media (max-width: 980px)` bloğundaydı (`reports.css:843`).
Hesaplanan sonuç (sayfa dolgusu 24×2, boşluk 18):

| Viewport | Editör kolonu | Durum |
| --- | --- | --- |
| 1024 px | ≈ 198 px | kullanılamaz |
| 1180 px | ≈ 354 px | çok dar |
| 1280 px | ≈ 454 px | sınırda |
| 1440 px+ | ≈ 614 px+ | iyi |

Ayrıca `ReportEditor.tsx:330` `.report-split.show-${mobileView}` sınıfını her genişlikte basıyor,
`mobileView` varsayılanı `editor`; ama sekmeler yalnızca ≤980px'te görünüyordu — yani 981–1240 px
bandında kullanıcı ne sekmeye ne de geniş bir editöre sahipti.

**Grafik (`mmpi-chart-card` + `MMPIScoreChart`)**: SVG viewBox sabit **1400×470**, yazı boyutları
12–13 px (`MMPIScoreChart.tsx:88/104/118/132/168`). `.mmpi-chart-wrap { min-width: 640px }`
(`workspace.css:1274`), kap `overflow-x: auto`. Telefonda grafik 640 px'e ölçekleniyor →
etkin yazı boyutu **~5,7 px**; hem yarısı görünüyor hem okunamıyor, kaydırılabildiğine dair **hiçbir
işaret yok**.

---

## Fixed

### P0‑2 — Rapor bölünmüş görünümü artık iki farklı rejimde çalışıyor
*Yeni davranış:*
* **≥1241 px:** iki kolon aynen korunur (önizleme 760 px, editör ≥438 px). **Masaüstü görünümü değişmedi.**
* **≤1240 px:** tek kolon + **editör/önizleme sekmeleri**. Editör tam genişliği alır (1024 px'te ~928 px,
  önce 198 px'ti). A4 önizlemesi sekme ile açılır, sayfa kaydırması eşitlenir.
* Sekme görünürlüğü ve pane gizleme kuralları 980 px bloğundan **1240 px bloğuna taşındı**
  (kopyalanmadı, yeri değişti) — tek kaynak, çakışma yok.
* ≤980 px'te yalnızca o banda özgü kurallar kaldı (`report-choice-grid`, `psych-paper` tipografisi,
  filigran, `report-settings-grid`).

### Grafik: okunabilirlik + kaydırma affordance'ı
* ≤720 px: `.mmpi-chart-card` `scrollbar-width: thin`, `overscroll-behavior-x: contain`,
  dokunmatik kaydırma ve daha az yan dolgu (12/10 px) — telefonda grafiğin görünen kısmı artar ve
  kaydırma sayfayı zıplatmak yerine kartın içinde kalır.
* Grafik kartına **telefonda görünen, masaüstünde gizli** tek satırlık ipucu eklendi:
  *"Grafik yatay kaydırılabilir; T puanlarının tamamı özet tabloda."* — kullanıcı grafiğin yarım
  göründüğünü bir hata sanmaz ve tam T değerlerinin nerede olduğunu bilir.
* Aynı kaydırma davranışı `.mmpi-summary-table-wrap`, `.mmpi-answers-grid`, `.report-table-scroll`
  ve `.table-responsive` için de tutarlı hâle getirildi.
* Grafik **küçültülmedi**: `min-width: 640px` korundu; grafiği telefona sığdırmak yazıları ~6 px'e
  düşüreceği için bilinçli olarak tercih edilmedi (istenen "okunabilir kal, gerektiğinde yatay kaydır"
  kuralı).

### Kağıt önizlemelerinin yüksekliği
* `.report-full-preview-body { max-height: 78vh }` → ≤720 px'te `70dvh`,
  `.report-sample-frame { max-height: 620px }` → ≤720 px'te `60dvh`. Böylece mobil tarayıcı çubuğu
  önizleme kutusunun altını kesmez.
* Önizleme paneli `dvh` sınırı yalnızca iki kolonlu rejimde (>1240 px) uygulanır; aksi hâlde
  raporlar.css'in `max-height: none` kuralıyla çakışırdı (bu çakışma tespit edildi ve kapsamlandırıldı).

### Yazdırma / PDF
**Hiçbir yazdırma kuralı değiştirilmedi.** Doğrulandı: `print.css` `@page { size: A4 portrait }` ve
`.form-page { 210×297mm }`, `reports.css` `@page psych-report`, `workspace.css` `@page mmpi-report`,
tüm `@media print` blokları aynen duruyor. Bu phase'in tüm kuralları `@media screen` içindedir ve
testle kilitlenmiştir. Yeni `report-mobile-tabs` kuralı yazdırmada zaten `display: none !important`
ile gizlenir (`reports.css:1122`).

---

## Tested

| Kontrol | Komut | Sonuç |
| --- | --- | --- |
| Sözleşme testleri | `npx tsx --test tests/responsiveContracts.test.ts` | ✅ 22/22 |
| Tüm test paketi | `npm test` | ✅ **666 test / 0 hata** (phase 4: 660 → +6), 120 sn |
| Typecheck | `npm run typecheck` | ✅ 0 hata |
| Build | `npm run build` | ✅ `dist/index.html` 4.583,0 KB |
| Derleme içeriği | `max-width:1240px`, `mmpi-chart-hint`, `@page psych-report`, `@page mmpi-report` | ✅ hepsi derlemede |
| Yazdırma regresyonu | `printLayout`, `pdfForm`, `pdfScanPipeline`, `mmpiClinicalReportUi`, `reports` | ✅ |
| Sonuç paneli testleri | `mmpiUiReport`, `resultsSafety`, `recordDetailUi` | ✅ (ipucu `<p>`'si render edilen panelde) |

**Yeni testler:** ⑰ iki kolonlu `.report-split` korunur + ≤1240 px tek kolon ve sekmeler;
⑱ `.report-preview-pane` yükseklik sınırı yalnızca >1240 px; ⑲ grafik/tablo kaydırma affordance'ı ve
ipucunun masaüstünde gizli olması; ⑳ ipucunun DOM'da gerçekten basılması; ㉑ kağıt önizlemesi `dvh`
sınırları; ㉒ `@page` + `@media print` dokunulmazlığı.

---

## Remaining

* Grafik telefonda hâlâ yatay kaydırılır (640 px min). Alternatif "grafiği sığdır" yaklaşımı etiketleri
  ~6 px'e indirdiği için reddedildi; **öneri (kapsam dışı)**: `MMPIScoreChart`'a ≤480 px için
  dikey/kompakt bir varyant eklemek bileşen değişikliği gerektirir.
* `.report-examples-head .btn-secondary { white-space: nowrap }` (`reports.css:811`) ≤360 px'te başlıkla
  yarışabilir; başlık bloğu `flex-wrap` ile sarıyor, ölçülen toplam genişlik 320 px'te sınıra yakın →
  Phase 7'de görsel cila listesine alındı.
* Rapor editörünün zengin metin içeriği (`contentEditable`) mobil klavye davranışı **test edilmedi**
  (tarayıcı yok).

## Known Issues

1. ≤1240 px'te editör ve önizleme aynı anda görünmez (sekme ile geçilir). 1024–1240 px bandında
   "yan yana çalışma" alışkanlığı olan kullanıcı için davranış değişikliğidir; önceki davranış
   (198 px'lik editör) kullanılamaz olduğu için bilinçli tercih.
2. Grafik ipucu metni CSS'te değil DOM'da; masaüstünde `display: none` ile gizlenir, ekran okuyucular
   masaüstünde de duyar (metin zararsız ve yönlendirici).
3. `scrollbar-width: thin` Firefox/Safari; Chromium mobilde overlay kaydırma çubuğu platform davranışı.

---

## Commit

```
6973e36  responsive: optimize reports charts and print layouts
```
(kod + testler + `optik-form.html` tek dosya çıktısı bu commit'te; bu rapor
`docs: phase 5 report` commit'i ile eklenir. `git show --stat 6973e36` ile doğrulandı.)
