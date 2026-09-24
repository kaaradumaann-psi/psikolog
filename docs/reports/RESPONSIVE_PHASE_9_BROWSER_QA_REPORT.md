# Responsive Faz 9 — Gerçek Tarayıcı Mobile QA Raporu

**Tarih:** 2026-09-24 · **Dal:** `arena/01a0d039-repo123`
**Kod commit'leri:** `b3b58a3` (`qa: complete real browser responsive audit`),
`7e4786a` (`qa: extend touch target coverage to coarse pointer devices`)

---

## 1. Test Environment

| Bileşen | Ayrıntı |
| --- | --- |
| Ortam | Debian 12 (bookworm) sandbox, Node 22.22.3 |
| Uygulama | `npm run dev` (Vite 7.3.6, SPA), `http://127.0.0.1:5199` |
| Supabase | **Gerçek backend yok.** Kimlik doğrulamalı ekranlar için `/tmp/qa/stub-api.mjs` adlı **yerel sahte PostgREST + GoTrue** (JWT üretir, `profiles`/`mmpi_records`/`mmpi_reports` uçlarını yanıtlar). Uygulama kodu, RLS veya gerçek Supabase yapılandırması **değiştirilmedi**. |
| Kamera | Chromium `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` (sanal kamera akışı). Gerçek kamera donanımı yok. |
| PDF/OMR | Repo'nun kendi `MMPI-566-optik-cevap-formu.pdf` dosyası tarayıcıya yüklendi (gerçek OMR boru hattı çalıştı). |
| Harness dosyaları | `/tmp/qa/qa.mjs` (72 kombinasyonluk tarama), `deep.mjs`, `camera-qa2.mjs`, `omr-review.mjs`, `modal2.mjs`, `report-qa3.mjs`, `print2.mjs` vb. (repo dışında; üretim koduna girmedi) |

### Tarayıcı nasıl çalıştırıldı (ortam kısıtı çözümü)

Playwright/Puppeteer indirmesi ve `apt-get` bu ortamda **engelli**
(`storage.googleapis.com`/`cdn.playwright.dev`/`deb.debian.org` → bağlantı yok; `libnss3`,
`libgbm`, `libatk` gibi sistem kütüphaneleri kurulu değil). Çözüm: npm deposundan
(`registry.npmjs.org` çalışıyor) `@sparticuz/chromium` paketi alındı; paketin içindeki
Amazon Linux 2023 kütüphane paketi (`al2023.tar.br`) açılıp `LD_LIBRARY_PATH` ile
kullanıldı. Sonuç: **gerçek Chromium 153.0.8010.0 (HeadlessChrome)** senaryolarla
çalıştırıldı — bu bir emülasyon katmanı değil, gerçek tarayıcı motorudur.

## 2. Browser

```
Chromium 153.0.8010.0 · HeadlessChrome · CDP üzerinden Puppeteer-core
```

Doğrulandı: `navigator.userAgent`, ekran görüntüleri (`/tmp/qa/shots/*.png`),
`window.print`/`emulateMediaType('print')` ve `page.pdf()` çıktısı.

## 3. Viewport Matrix

12 viewport × 6 rota (72 kombinasyon) + derin taramalar; hepsi bu fazda gerçekten koşuldu:

| Telefon | 320×800 · 360×800 · 375×812 · 390×844 · 414×896 · 430×932 (+ yatay 844×390, 932×430) |
| Tablet | 768×1024 · 820×1180 · 1024×768 |
| Masaüstü | 1280×800 · 1440×900 · 1920×1080 |
| Rapor eşiği | 1240×900 · 1241×900 (medya sorgusu sınırı) |

## 4. Route Matrix

Rotalar **koddan** (`src/router.ts`, `parseRoute`) çıkarıldı: `/`, `/islem`, `/form`,
`/kayitlar`, `/kayit/:id`, `/kayitlar/:id/raporlar`, `/kayitlar/:id/raporlar/:reportId`,
`/yonetim`, `/sss`, `/gizlilik`, `/kullanim`, `/kaynaklar`, `/onizleme`, 404.

| Rota | Tarayıcıda durumu | Not |
| --- | --- | --- |
| `/`, `/islem` | ✅ Gerçek (stub auth ile giriş sonrası) | Landing, adım 1 formu, yöntem seçimi, tarayıcı adımı |
| `/form` | ⛔ Doğrulanamadı | Oturum gerektiriyor; `FormPage` bu rotada bağlı değil (dormant, Faz 0'dan beri bilinen) |
| `/kayitlar` | ✅ Gerçek | Tablo, satır eylemleri, silme diyaloğu |
| `/kayit/:id` | ✅ Gerçek (stub kayıt) | Kayıt detayı, rapor listesi |
| `/kayitlar/:id/raporlar` | ✅ Gerçek (stub) | Rapor oluşturma ekranı, şablon seçimi |
| `/kayitlar/:id/raporlar/:reportId` | ✅ Gerçek (stub rapor) | **Editör + A4 önizleme split'i ölçüldü** |
| `/yonetim` | ✅ Gerçek (ADMIN stub) | Alt sekmelerin yatay kaydırması, tablolar |
| `/sss`, `/gizlilik`, `/kullanim`, `/kaynaklar` | ✅ Gerçek (oturumsuz) | SSS akordeonu, politika sayfaları |
| `/onizleme` | ✅ Gerçek (yapılandırılmamış yapıyla) | **MMPI sonuç panelinin 10 sekmesi + grafik + yazdırma raporu** |
| 404 | ✅ Gerçek | Boş durum kartı |

## 5. Mobile Findings

- Referans rotalarda **sayfa düzeyinde yatay taşma yok**: 72 kombinasyonluk son taramada
  `scrollWidth == clientWidth` (2. tur).
- Kirli veriyle test: `Örnek Danışan Çok Uzun Soyadlı Kişi` adı, uzun kimlikler ve
  `www.halilkaraduman.com.tr` adresi hiçbir rota'da taşma üretmedi (satır sonu/kırpma yok).
- Form doğrulaması gerçek tarayıcıda tetiklendi: geçersiz "İlkokul" eğitimi
  `role="alert"` banner'ı ile engellendi (uygulama doğru davrandı; hata benim sentetik
  girdimdi).
- Adım geçişleri (`1. Danışan → 2. Yöntem → 3. Veri`) gerçek fare tıklamalarıyla çalıştı;
  adım göstergesi ve "Devam" akışı doğru.
- Tarayıcı (OMR) akışı 390px'te tamamen kullanılabilir: kamera vizörü, HUD uyarısı
  ("Sayfa çerçeveye alınmamış…"), iki eylem düğmesi 44px ve tek satırda.

## 6. Tablet Findings

- 768×1024 / 820×1180 / 1024×768: hiçbir rota'da taşma yok; header 175px (tabs + kullanıcı
  satırı) → içerik 17% aşağıdan başlıyor.
- **1024×768 rapor editörü:** split artık **tek kolon 920px + sekmeler**; Faz 0'daki
  "editör 198px'e sıkışıyor" hatasının gerçek tarayıcı karşılığı **yok**.
- 768px'te tarayıcı `scan-pages-grid` 2 kolon, `scan-review-columns` tek kolon.

## 7. Desktop Findings

- 1280/1440/1920: tüm rotalarda taşma yok, konsol hatası yok.
- Rapor editörü 1440px'te `558px | 760px` iki kolon; 1280px'te `398px | 760px` (daralan
  editör kolonu, sabit A4 önizleme) — Faz 5 raporundaki gerçek davranış doğrulandı.
- Masaüstünde dokunmatik yoğunluk artışı **yok** (aşağıdaki CR-5 bulgusu için ayrıca
  `touch=false` kontrolü yapıldı).

## 8. Report System Findings

| Ölçüm | Sonuç |
| --- | --- |
| ≤1240px (`1240×900`) | Tek kolon `1136px`, **Editör/A4 Önizleme sekmeleri görünür** (563×37px), önizleme yalnız sekme seçilince çizilir |
| >1240px (`1241×900`) | İki kolon `359px 760px`, sekmeler gizli |
| 1024×768 | `920px` tek kolon + sekmeler |
| 768×1024 | `680px` tek kolon + sekmeler |
| 430×932 / 320×800 | `382px` / `272px`; sekmeler 44px yüksekliğinde, araç çubuğu düğmeleri 44px |
| A4 önizleme | 1241px'te `.psych-paper` 722×202px ölçekli; taşma yok |
| Yazdırma | `emulateMediaType('print')`: `.print-only` görünür, `.screen-only` gizli, `.pr-report` **tam 794px = 210mm (A4 genişliği)**, 8 bölüm, 4 tablo, kağıt dışına taşan öğe **0**; `page.pdf()` → **5 sayfa, MediaBox 595.92×841.92pt (A4)** |

## 9. Scanner / Camera / OMR Findings

| Adım | Gerçek tarayıcı sonucu |
| --- | --- |
| Kamera modu | `.scan-camera-overlay` görünür; **"Kamerayı başlat" 336×44px, siyah dolgu, radius 999px** → Faz 6'nın `.scan-primary` düzeltmesi doğrulandı |
| Canlı akış | Sanal cihazla `video` akışı başladı; HUD "A4 · tüm sayfa" + uyarı katmanı çizildi |
| Kamera eylemleri | "Kamerayı durdur" 150×44px, "Sayfayı çek ve oku" 176×44px — yan yana, taşma yok |
| Çekim | "Sayfayı çek ve oku" → durum şeridi: *"Sayfa kabuğu bulunamadı"* (sanal kamera görüntüsünde form yok) — hata akışı düzgün bildirildi, konsol hatası yok |
| Dosya yükleme | Gerçek form PDF'i yüklendi → **4 sayfa kuyruğa alındı**, "1. sayfa başarıyla okundu ve kabul edildi", "2. sayfa başarıyla okundu" |
| İnceleme paneli | `.scan-review-panel` 366×2680px (390px'te), `scan-review-columns` tek kolon, inceleme kontrolleri 44px |
| Madde çipleri | **51×52px** (`.item-select-chip`), ızgara 6 kolon → Faz 7'nin 44px düzeltmesi doğrulandı |
| Geliştirme pilleri | 6 pil, hepsi **44px** (önce 29px) → bu fazda düzeltildi |
| Taşma | Tarayıcı/inceleme ekranlarında sayfa taşması yok; `sw == cw` |

## 10. Modal Findings

| Ölçüm (320×691, `kayitlar` → kaydı sil) | Önce | Sonra |
| --- | --- | --- |
| Diyalog kutusu ölçüsü | 320×691 (viewport'a tam oturuyor) | aynı |
| Tab sırası | İlk Tab'dan sonra odak **arka plana kaçıyordu** (`BUTTON[OUT]` → SSS/Gizlilik/Kullanım) | 8 ileri + 3 geri Tab'ın tamamı `.confirm-dialog` içinde döndü `[IN]` |
| Arka plan kaydırması | `body.overflow: visible` → arka plan kayıyordu | `hidden` (açıkken) → `visible` (kapanınca) |
| Kaydırma çubuğu telafisi | yok | ölçüldü: masaüstünde `padding-right` = kaydırma çubuğu genişliği (bu viewport'ta 0) |
| Esc | kapanıyor | kapanıyor |
| Arka plana tıklama | kapanıyor | kapanıyor |
| Odak dönüşü | yok | kapanınca tetikleyiciye döndü (`action-btn-danger`) |
| Düğmeler | Vazgeç 106×44, Evet kaydı sil 149×44, kapat 44×44 | aynı |

## 11. Accessibility Findings

| Kontrol | Sonuç |
| --- | --- |
| Checkbox klavye odağı | `input[type=checkbox]` → `outline: 2px solid rgb(13,13,13)`, offset 2px, `:focus-visible` eşleşiyor (Faz 7 düzeltmesi doğrulandı), 20×20px + `label` ile sarmalı |
| Tab/Shift+Tab (diyalog) | Düzeltildi (bkz. §10) |
| Escape | Diyalog ve SSS/panel kapanışları çalışıyor |
| Radyo/düğme erişimi | Form radyo grupları gerçek tıklamayla seçildi; `aria-label`'lar mevcut |
| Etiketler | Form alanlarının hepsi `<label>` ile bağlı (ölçülen 22 alanda etiketsiz alan yok) |
| İnceleme | Odak halkaları görünür; `role="alert"` hata mesajları gerçekten duyuruluyor (tarayıcı ağacında `role=alert` düğümü doğrulandı) |
| **Sınırlama** | Ekran okuyucu (NVDA/VoiceOver) ve gerçek klavye-tuş akışının tamamı test edilmedi; yalnızca CDP ile üretilen gerçek klavye olayları kullanıldı |

## 12. Horizontal Overflow Findings

| Rota | Viewport | Ölçüm | Değerlendirme |
| --- | --- | --- | --- |
| `/kaynaklar` | 320/360/375/390/414 | `scrollWidth 425` > `clientWidth 320…414` | **HATA (düzeltildi)** — CR-1 |
| `Soru Yanıtları` sekmesi | tümü | `.mmpi-answers-grid` 466px içerik / 236px kutu | Kabul edilebilir: **kendi konteynerinde** kontrollü yatay kaydırma (sayfa taşmıyor) |
| Tablolar (`modern-data-table`) | ≤430 | 600–623px tablo / 334–364px konteyner | Kabul edilebilir: `.table-responsive` içinde kaydırma + sabit ilk kolon (Faz 4 kuralı doğrulandı) |
| Diğer tüm rota × viewport | hepsi | `sw == cw` | Taşma yok |

## 13. Touch Target Findings (gerçek DOM ölçümü, 375/390px)

| Öğe | Ölçüm | Durum |
| --- | --- | --- |
| `.scan-enhancer-pill` (geliştirme pilleri) | **29px** | Düzeltildi → 44px |
| `.report-block-controls > button` (blok yukarı/aşağı/sil) | **28×28** | Düzeltildi → 44×44 (kaba imleç bandı) |
| Yatay telefon (844×390) tarayıcı düğmeleri | **34px** | Düzeltildi (kaba imleç bandı) |
| `a.site-footer-link` | 22×16 (masaüstü) / 80×44 (dokunmatik) | Dokunmatikte ≥44px ✔ |
| `.item-select-chip` | 51×52 | ✔ (Faz 7) |
| Tarayıcı/kamera düğmeleri | 44px | ✔ |
| Kayıt silme diyaloğu düğmeleri | 44px | ✔ |
| Rapor sekmeleri | 44px (320–430) | ✔ |
| `input[type=checkbox]` | 20×20 görsel + `label` hedefi | ✔ (satır içi, kabul edilen istisna) |
| 4 eylem düğmesi (bilinçli istisna) | 44×44 hedefe çıkarılmadı | Sayfa birincil akışı çalışıyor |

## 14. Bugs Found

| ID | Rota | Viewport | Önem | Problem | Kanıt |
| --- | --- | --- | --- | --- | --- |
| CR-1 | `/kaynaklar` | 320–414 | **YÜKSEK** | Sayfanın tamamı yatay kayıyordu (`scrollWidth 425`) | `p.sources-citation` 69→425px; en uzun kelime 45 karakterlik DOI; ebeveyn `.sources-entry-head` flex + `min-width:auto` |
| CR-2 | `/kayitlar` (silme diyaloğu) | 320–430 | **YÜKSEK (a11y)** | `aria-modal="true"` olmasına rağmen odak tuzağı yoktu; Tab ile odak arka plandaki sayfa bağlantılarına kaçıyordu | Tab izi: `Evet, kaydı sil[IN] → Yeni Veri Girişi[OUT] → SSS[OUT] → Gizlilik[OUT]` |
| CR-3 | aynı | 320–430 | ORTA (a11y) | Diyalog açıkken arka plan kaydırması kilitlenmiyordu (`body.overflow: visible`) | Tarayıcı ölçümü |
| CR-4 | Tarayıcı inceleme paneli | ≤720 | ORTA | Geliştirme pilleri 29px (44px hedefin altı) | 6 pilin hepsi 29px ölçüldü |
| CR-5 | Tüm rotalar | 844×390 (yatay telefon) | ORTA | Genişlik tabanlı bantlar yatay telefonu masaüstü sayıyordu → dokunmatik cihazda 34px/16px hedefler | `pointer: coarse` true iken `.site-footer-link` 80×16; tarayıcı düğmeleri 34px |
| CR-6 | Rapor editörü | ≤1024 (dokunmatik) | ORTA | Blok sıralama/silme düğmeleri 28×28px | 6 düğme 28×28 ölçüldü |

**Bulgu olmayan (kayda değer gözlemler):** sticky header telefon dikeyinde 167px
(viewpor'un ~%21'i) — mevcut navigasyon tasarımının parçası, değiştirilmedi; rapor
başlığı alanı `clamp(19px,5.2vw,24px)`; `.mmpi-answers-row` madde numaraları 8.5px
(veri yoğun okuma ızgarası, bilinçli).

## 15. Fixes Applied

| ID | Düzeltme | Dosya |
| --- | --- | --- |
| CR-1 | `.sources-citation { min-width: 0; overflow-wrap: anywhere }` + `.sources-entry-head { min-width: 0 }` (≤720px) | `src/styles/responsive.css` §08b |
| CR-2 | `ConfirmDialog`: `dialogRef` + Tab/Shift+Tab odak tuzağı; kapanışta odak tetikleyiciye döner | `src/components/ConfirmDialog.tsx` |
| CR-3 | Aynı bileşende gövde kaydırma kilidi + kaydırma çubuğu telafisi (aç/kapa simetrik) | `src/components/ConfirmDialog.tsx` |
| CR-4 | `.scan-enhancer-pill { min-height: 44px }` + pillerin sarması (≤720px) | `src/styles/responsive.css` §03 |
| CR-5 | Yeni bant: `@media screen and (pointer: coarse) and (max-width: 1024px)` → düğmeler/tabs/piller/çipler 44px; ≥1280px masaüstü etkilenmez | `src/styles/responsive.css` §08c |
| CR-6 | Aynı bantta `.report-block-controls > button { min-width/height: 44px }` | `src/styles/responsive.css` §08c |
| — | 7 yeni sözleşme testi (31 → 36) | `tests/responsiveContracts.test.ts` |

## 16. Remaining Issues

> Ek (2026-09-24): Faz 10 sonrası takip düzeltmesiyle **TAM RAPOR önizlemesinin ekranda
> stilsiz görünmesi** giderildi (`5dccadf`; ayrıntı: `FINAL_RESPONSIVE_REGRESSION_REPORT.md` §8
> ve `FINAL_RESPONSIVE_UI_UX_REPORT.md` EK-A). Aşağıdaki liste Faz 9 sonundaki durumdur.

| # | Sorun | Önem | Durum |
| --- | --- | --- | --- |
| R1 | Gerçek Supabase + RLS ile uçtan uca akış doğrulanamadı (yerel sahte API kullanıldı) | Orta | Ortam kısıtı; kod değişmedi |
| R2 | Gerçek kamera donanımı / iOS Safari / Android Chrome doğrulaması yok (sanal kamera + masaüstü Chromium) | Orta | Ortam kısıtı |
| R3 | Rapor **oluşturma** ve **kaydetme** akışı mock dışında denenmedi (yerel Supabase yok) | Orta | Ortam kısıtı |
| R4 | `.mmpi-answers-row` madde numaraları 8.5px; ızgara yalnız konteyner kaydırmasıyla okunuyor | Düşük | Bilinçli veri yoğunluğu; tam sayılar özet tabloda |
| R5 | Sticky header telefon dikeyinde 167px (%21) | Düşük | Navigasyon tasarımı; değiştirilmedi |
| R6 | 4 küçük eylem düğmesi (44×44'e çıkarılmadı) | Düşük | Birincil akış çalışıyor; raporda kayıtlı |
| R7 | `/form` rotası oturum arkasında ve `FormPage` bağlı değil (dormant) | Düşük | Faz 0'dan beri bilinen durum |
| R8 | Ekran okuyucu ile tam erişilebilirlik denetimi yapılmadı | Düşük | CDP klavye olayları kullanıldı |

## 17. Screens/Routes Not Verifiable

- `/form` (oturum arkasında, bağlı değil) — hiç doğrulanmadı.
- Supabase'e yazan tüm akışlar (rapor kaydetme/tamamlama, kayıt silme **sunucu tarafı**,
  admin kullanıcı oluşturma) — yerel sahte API ile yalnızca **arayüz** davranışı görüldü.
- Gerçek AI yorumu (Supabase Edge Function) — panel çizildi, yanıt üretimi doğrulanmadı.
- Gerçek kamera donanımı, gerçek PDF çıktısının yazıcıya gönderilmesi, gerçek mobil
  tarayıcı (iOS/Android) davranışları.

## 18. Final Phase 9 Status

- **Gerçek tarayıcı QA: YAPILDI** (Chromium 153, 12 viewport, 13 rota, ~250 ölçüm turu).
- **6 bulgu (2 YÜKSEK, 4 ORTA) bulundu; 6'sı da düzeltildi ve gerçek tarayıcıda yeniden
  doğrulandı.**
- Regresyon taraması: 72 kombinasyon 1. tur → 2. tur `fixed=5, worse=0, unchanged=67`.
- Doğrulama komutları: `npm run typecheck` 0 · `npm test` **679/679** · `npm run build`
  PASS (4585.4 KB) · `git diff --check` temiz.
- **Doğrulanamayanlar gizlenmedi** (bkz. §16–17): gerçek Supabase/RLS, gerçek kamera,
  gerçek mobil işletim sistemi ve rapor yazma akışı.
