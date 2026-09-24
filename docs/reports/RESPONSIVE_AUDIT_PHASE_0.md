# RESPONSIVE / UI‑UX DENETİMİ — PHASE 0 (AUDIT)

**Tarih:** 2026‑09‑23
**Branch:** `arena/01a0d039-repo123`
**Başlangıç commit'i:** `30045d1` (çalışma ağacı temiz)
**Durum:** Kod değişikliği yapılmadı — bu rapor yalnızca denetim çıktısıdır.

---

## 0. Doğrulama sınırları (şeffaflık beyanı)

Bu ortamda **gerçek tarayıcı çalıştırılamıyor**: sandbox'ta Chromium/Playwright ikilisi indirilemiyor
(CSP/egress), sistem paketleri (`libnss3`, `libx11`, `libgtk` vb.) kurulu değil ve `apt` deposuna ağ erişimi
kapalı. Bu nedenle:

* **Pixel düzeyinde görsel doğrulama YAPILMADI.** Hiçbir aşamada "visually verified" iddiasında
  bulunmayacağım.
* Bunun yerine kullanılan yöntemler:
  1. **Statik CSS/DOM analizi** — 12 CSS dosyası ve 40+ TSX bileşeni satır satır incelendi; sabit
     genişlikler, `100vh`, `nowrap`, çok kolonlu grid'ler, sabit `position: fixed` katmanları ve
     media‑query kapsamı çıkarıldı (kanıtlar `dosya:satır` olarak aşağıda).
  2. **Otomatikleştirilebilir ölçüm** — görünüm hesapları (ör. `.report-split` kolonlarının
     1024/1280 px'te efektif genişliği) CSS kurallarından aritmetik olarak türetildi.
  3. **Mevcut test paketi + yeni responsive sözleşme testleri** — her phase sonunda çalıştırılır.
* Rapor ve phase raporlarındaki "Test edildi" ifadesi **statik/otomatik test** anlamına gelir;
  cihazda/görsel test anlamına gelmez. Bu ayrım bilinçli olarak korunmuştur.

---

## 1. Proje envanteri

| Alan | Değer |
| --- | --- |
| Ürün | MMPI‑566 optik cevap formu, OMR okuyucu, sonuç/rapor çalışma alanı |
| Stack | React 19.2 + TypeScript 5.9 + Vite 7 (SPA, History API router) |
| Backend | Supabase Auth + RLS (istemci tarafı), Edge Function'lar |
| Stil | 12 saf CSS dosyası (yaklaşık 10.300 satır) — Tailwind yok, CSS‑in‑JS yok |
| Test | `tsx --test tests/*.test.ts` — **66 dosya, 644 test, hepsi PASS** (baseline) |
| Typecheck | `tsc --noEmit` — temiz |
| Build | `node scripts/build.mjs` (esbuild, tek dosya çıktı) — başarılı |
| Lint | **Yok** (package.json'da lint script'i yok — uydurulmadı) |
| CSS yükleme sırası | `screen → form → print → auth → workspace → theme → site → mobile → reports` |

### 1.1 CSS dosya haritası ve breakpoint kapsamı

| Dosya | Satır | Mevcut media sorguları | Not |
| --- | --- | --- | --- |
| `screen.css` | 1201 | `900`, `print` | Temel token'lar (`:root`), header, tablo, kart, buton |
| `auth.css` | 803 | `900`, `print` | Login kabuğu, admin paneli, modal, danışan formu |
| `workspace.css` | 3650 | `800`, `900`, `620`, `720`, `560`, `print` | İşlem akışı, sonuç panelleri, yazdırma raporu |
| `scanner.css` | 809 | `900` | Tarama/inceleme ekranları, kamera stage'i |
| `scanner-enhancements.css` | 362 | `900 (min)`, `720`, `hover` | Manuel köşe, karşılaştırma, dokunma alanları |
| `reports.css` | 1137 | **yalnızca `980`** + `print` | Rapor listesi + APA editör/önizleme |
| `site.css` | 772 | `900`, `560`, `print` | Bilgi sayfaları, footer |
| `theme.css` | 1481 | `901 (min)`, `900`, `560` | Yazar tasarım katmanı (tümü `@media screen` içinde) |
| `mobile.css` | 683 | `720`, `480` | Mevcut mobil katman |
| `dashboard.css` | 60 | **yok** | `auto-fit minmax(180px)` olduğu için güvenli |
| `form.css` | 44 | **yok (tasarım gereği)** | A4 kağıt geometrisi (mm) — dokunulmamalı |
| `print.css` | 46 | `print`, `@page` | A4 portrait, `margin: 0` |

**Kırılma noktası envanteri (kullanılan):** 980, 901/900, 800, 760, 720, 620, 560, 480.
Kullanıcının istediği ölçek (320/360/390/430/768/1024/1280/1440/1920) bu set ile **kısmen** karşılanıyor;
en büyük boşluklar **≤430 px (küçük telefon)** ve **768–1024 px (tablet)** bandında.

---

## 2. Route ve ekran envanteri

| # | Route | Ekran / bileşen | Erişim |
| --- | --- | --- | --- |
| 1 | `/` | Landing (İşlem sekmesi, `ws-home` hero) + Psikolog için `Dashboard` | Oturum |
| 2 | `/islem` | `CaseWorkspace`: adım 1 Danışan → 2 Yöntem → 3 Giriş → 4 Kontrol → Sonuç | Oturum |
| 3 | `/islem` (yöntem: kamera) | `CameraCapture` + `CameraOverlay` | Oturum |
| 4 | `/islem` (yöntem: OMR) | `ScannerWorkspace` → `ScanResultPreview` → `ImageEnhancer` / `ManualCornerEditor` | Oturum |
| 5 | `/islem` (yöntem: hızlı/ham) | `QuickEntry`, `RawScoreEntry` | Oturum |
| 6 | `/islem?duzenle=…` | Düzenleme modu (`ws-edit-panel`) | Oturum |
| 7 | `/form` | `FormKit` (yazdır/indir/önizle) | Oturum |
| 8 | `/kayitlar` | `MyRecordsPanel` (arama, tarih/cinsiyet/yaş filtresi, gruplama, sayfalama, tablo) | Psikolog |
| 9 | `/kayitlar/:id` | `RecordDetailPage` + `MMPIResultsPanel` (10 sekme) + `ReportEditor` bağlantısı | Sahip/Admin |
| 10 | `/kayitlar/:id/raporlar` | `ReportsPage` (rapor seç, şablon, örnek, geçmiş) | Sahip/Admin |
| 11 | `/kayitlar/:id/raporlar/:rid` | `ReportEditor` (editör + A4 önizleme split, araç çubuğu, sürüm) | Sahip/Admin |
| 12 | `/yonetim` | `AdminPanel`: Testler / Psikologlar / Yeni Psikolog sekmeleri + metrikler + tablolar | Admin |
| 13 | `/sss`, `/gizlilik`, `/kullanim`, `/kaynaklar` | `InfoPageShell` + içerik + `SiteFooter` | Herkese açık (oturumsuz) |
| 14 | `/onizleme` | `DesignPreviewPage` (yalnızca Supabase yapılandırılmamışsa) | Herkese açık |
| 15 | `*` | 404 `empty-state-card` + footer | Herkese açık |
| 16 | — | `AuthGate`: giriş formu, kurulum rehberi, yükleniyor, hata | Herkese açık |
| 17 | — | `ConfirmDialog` (silme/sıfırlama onayı) — tek gerçek modal | Bağlamsal |
| 18 | — | `ConnectivityBanner` (çevrimdışı şeridi) | Oturum |

**Ortak bileşenler:** `Icon`, `FormKit`, `InfoPageShell`, `SiteFooter`, `PaperHeader`, `RegistrationMarks`,
`PageQr`, `AnswerColumn`, `PolicyDoc`, `Disclosure`, `MMPIPrintReport` (yazdırma), `results/*` (9 panel).

---

## 3. Ekran × viewport matrisi (statik denetim sonucu)

**Gösterim:** ✅ kod düzeyinde sorun bulunmadı · ⚠️ iyileştirme gerekli · ❌ bilinen kusur
(Not: bu tablo **statik analiz** sonucudur; görsel doğrulama yapılamadı — bkz. §0.)

| Sayfa/Route | Desktop (1280–1920) | Tablet (768–1024) | Mobile (320–430) | Kritik Sorun | UX Sorunu | Öncelik |
| --- | --- | --- | --- | --- | --- | --- |
| Login / AuthGate | ✅ | ✅ | ⚠️ | iOS'ta input focus zoom (14 px) | Kurulum rehberi 320 px'te sıkışık | P1 |
| Landing (`/`) | ✅ | ✅ | ✅ | — | Hero tipografisi 320 px'te 30 px (kabul edilebilir) | P3 |
| İşlem — Danışan formu | ✅ | ✅ | ⚠️ | `<select>`/input 14 px → iOS zoom | Etiket/ipucu hiyerarşisi mobilde sıkışıyor | P1 |
| İşlem — Yöntem seçimi | ✅ | ✅ | ✅ | 3 kart ≤800 px'te tek kolon | — | P3 |
| İşlem — Hızlı/Ham giriş | ✅ | ✅ | ⚠️ | `.raw-grid` mobilde 2 kolon (120 px min) | sayı alanları küçük | P2 |
| İşlem — Kamera | ✅ | ⚠️ | ⚠️ | `scan-camera-stage` 520 px sabit üst limit; `aspectRatio` görüntü oranına bağlı | Yön değişiminde (orientation) ipucu yok | P2 |
| İşlem — OMR tarama | ✅ | ⚠️ | ⚠️ | `.scan-review-columns` ≤900 tek kolon; inceleme paneli uzun | Çok adımlı, mobilde kaydırma yükü yüksek | P2 |
| İşlem — Manuel köşe | ✅ | ✅ | ⚠️ | `.manual-corner-preview-canvas` sabit **280 px** | Dokunma hedefi canvas üzerinde elle ayar | P2 |
| İşlem — Sonuç/Kontrol | ✅ | ⚠️ | ❌ | 10 sekmeli `.mmpi-tabs` 320 px'te ~5 satıra sarıyor; `.mmpi-chart-wrap` **640 px min** yatay kaydırma | Grafik kaydırma ipucu yok | P1 |
| Kayıtlar listesi | ✅ | ⚠️ | ❌ | 5 kolonlu tablo mobilde eziliyor; `.date-filter-field input` **36 px** yükseklik | Sayfalama/filtre metinleri 12 px | P1 |
| Kayıt detay | ✅ | ✅ | ⚠️ | `.mmpi-summary-table` yatay kaydırma (sarmalayıcı var ✅) | Uzun sayfa, hızlı gezinme mobilde statik | P2 |
| Soru Yanıtları (10×40 px) | ✅ | ✅ | ❌ | `.mmpi-answers-row` min **400 px** → 430 px altı yatay kaydırma | Kaydırma affordance'ı yok, 8.5 px numara | P2 |
| Raporlar listesi | ✅ | ✅ | ⚠️ | `reports.css` yalnızca 980 px kırılma noktası içeriyor | Kart içi metinler 320 px'te yoğun | P2 |
| Rapor editörü (`/raporlar/:id`) | ❌ (1024–1280) | ❌ | ⚠️ | `.report-split` sabit **760 px** önizleme kolonu; 981–1240 px arasında editör ~200 px'e iniyor | Editör/A4 geçişi yalnızca ≤980 px'te | **P0** |
| A4 önizleme (`psych-paper`) | ✅ | ✅ | ⚠️ | 320 px'te metin kolonu ~200 px | Kenar boşluğu 22 px sabit | P2 |
| Admin paneli | ✅ | ⚠️ | ❌ | `.admin-subnav-tabs` wrap/scroll yok → 320–430 px yatay taşma | Metrik kartları tek kolona iniyor (iyi), sekme şeridi taşıyor | **P0** |
| Bilgi sayfaları | ✅ | ✅ | ⚠️ | `.policy-layout`/`.sources-layout` ≤900 tek kolon ✅ | 10 px yardımcı metinler | P3 |
| 404 | ✅ | ✅ | ✅ | — | — | P3 |
| Modal (ConfirmDialog) | ✅ | ✅ | ⚠️ | Backdrop dolgusu 24 px, `max-height: 90vh` (URL çubuğu) | 320 px'te içerik genişliği 272 px | P1 |
| Yazdırma / PDF | ✅ | ✅ | — | `@page A4 portrait` net; responsive düzeltmeler `@media screen` dışına çıkmamalı | — | **Korumalı** |

---

## 4. Tespit edilen somut sorunlar (kanıtlı)

### P0 — işlev kullanılamıyor

**P0‑1 · `.admin-subnav-tabs` yatay taşması (Yönetim)**
`src/styles/auth.css:276` → `display: flex; gap: 8px;` — `flex-wrap` yok, `overflow-x` yok.
Üç sekme (`Testler (n)`, `Psikologlar (n)`, `+ Yeni Psikolog`) + `theme.css:552` (`padding: 10px 4px;
margin-right: 18px`) toplamı ≈ 380–400 px. 320–430 px viewport'ta sayfa yatay kayar, üçüncü sekme
kırpılır. **Etki:** yeni psikolog ekleme akışı mobilde erişilemez.

**P0‑2 · `.report-split` sabit 760 px önizleme kolonu (Rapor editörü)**
`src/styles/reports.css:234` → `grid-template-columns: minmax(0, 1.1fr) 760px;`
Tek kolona inişi yalnızca `reports.css:843` (`max-width: 980px`).
Hesap (page padding 24 px × 2, gap 18 px):

| Viewport | Editör kolonu |
| --- | --- |
| 1024 px | ≈ **198 px** |
| 1280 px | ≈ 454 px |
| 1440 px | ≈ 614 px |

**Etki:** 1024 px'lik tablet ve 1280 px'lik dizüstünde metin editörü kullanılamaz hâle geliyor.

### P1 — ciddi responsive/UX problemi

**P1‑1 · iOS Safari input zoom (tüm form ekranları)**
Form kontrolleri 16 px altında: `.form-group input/select` → `auth.css:115` (14 px);
`.search-input-wrapper input` → `screen.css:600` (13,5 px); `.date-filter-field input` → `screen.css:641`
(13 px); `.reports-page input/select` → `reports.css:112` (14 px). iOS, focus'ta sayfayı otomatik
büyütür ve kullanıcı geri küçültmek zorunda kalır. **Düzeltme:** ≤720 px'te 16 px.

**P1‑2 · Dokunma hedefleri 44 px altında**
`.date-filter-field input { height: 36px }` (`screen.css:635`); `.btn-sm { padding: 6px 12px;
font-size: 12px }` (`screen.css:429`) ≈ 30 px; `.icon-close-btn { width/height: 36px }` (`auth.css:546`);
`.report-toolbar button` (`reports.css:349`) 28–34 px; `.action-btn-*` ve `.table-row-actions`
(`mobile.css:643`) sarmalıyor ama yükseklik artmıyor.

**P1‑3 · `.mmpi-chart-wrap` 640 px sabit minimum + affordance yok**
`workspace.css:1274` (`min-width: 640px`), kapsayıcı `workspace.css:1275` (`.mmpi-chart-card {
overflow-x: auto }`). Taşma sayfaya yansımıyor ✅, ancak 320–430 px'te grafiğin yarısı görünmez ve
kaydırılabildiğine dair hiçbir görsel ipucu yok; kaydırma kabı klavye ile erişilebilir de değil
(tarayıcılar yalnızca `tabindex` verilen kapları kaydırmaya izin verir).

**P1‑4 · Kayıt tablosu 320–430 px'te okunamaz**
`.modern-data-table` (`screen.css:667`) `min-width` içermiyor; `.table-responsive` (`screen.css:663`)
`overflow-x: auto`. Sarmalayıcı olduğu için sayfa taşmıyor, ama tablo viewport'a **sıkıştırılıyor**:
5–6 kolon 320 px'te 3–4 satıra kırılıyor, tarih/kullanıcı hücreleri dikey yığılıyor. Veri kaybolmuyor
ancak kullanılabilir değil.

**P1‑5 · Modal mobilde fazla iç boşluk + `vh` bağımlılığı**
`.modal-backdrop { padding: 24px }` (`auth.css:504`), `.modal-container { max-height: 90vh }`
(`auth.css:516`), `.modal-body { padding: 24px }` (`auth.css:563`). 320 px'te içerik alanı 272 px'e
düşüyor; mobil tarayıcı URL çubuğu `90vh` hesabını kaydırdığı için içerik ekran dışına taşabiliyor.

### P2 — belirgin tasarım problemi

**P2‑1 · Breakpoint kapsamı:** `reports.css` yalnızca 980 px içeriyor (480/560 kuralı yok);
`dashboard.css` ve `form.css` hiç media sorgusu içermiyor (form.css tasarım gereği dokunulmaz).
**P2‑2 · `.mmpi-answers-row` 10 × `minmax(40px, 1fr)`** (`workspace.css:1688`) → 400 px minimum;
430 px altında her satır kaydırmalı (`.mmpi-answers-grid { overflow: auto }` sayesinde taşma yok).
**P2‑3 · `.manual-corner-preview-canvas { width: 280px }`** (`scanner-enhancements.css:215`) —
sabit piksel genişlik; ≤320 px'te sıkışıyor (taşma yok, küçülme yok).
**P2‑4 · `100vh` bağımlılıkları** — `.portal-layout` (`screen.css:118`), `.auth-shell` (`auth.css:1`),
`.info-shell` (`site.css:211`), `.report-preview-pane { max-height: calc(100vh - 96px) }`
(`reports.css:447`). Mobil tarayıcı çubuğu nedeniyle zıplama.
**P2‑5 · Küçük tipografi:** 93 kuralda `8–10.5 px` font‑size (ör. `.ans-num` 8,5 px
`workspace.css:1712`); mobilde okunabilirlik sınırında.
**P2‑6 · `.mmpi-tabs` 320 px'te ~5 satıra sarıyor** (`workspace.css:1200` `flex-wrap: wrap`) —
modal içinde içeriği aşağı itiyor.

### P3 — polish / iyileştirme

* `reports.css:1733` `.modal-container.modal-wide` ve `modal-quicknav` stilleri **kullanılmıyor** (ölü CSS).
* `src/components/FormPage.tsx` App tarafından import edilmiyor (yalnızca test/preview) — silinmedi, not edildi.
* Admin panelinde dekoratif `+` işareti inline `fontSize: 16` (tasarım diliyle uyumsuz, `AdminPanel.tsx:350`).
* Boşluk ölçeği token'laşmamış (6/8/10/12/14/16/18/20/22/24/28 elle); tutarlılık iyi ama sistematik değil.
* Toast sistemi yok; geri bildirim satır içi `status-banner`/`role=status` ile veriliyor — **mevcut davranış
  korunacak**, yeni toast sistemi eklenmeyecek.
* `button` öğelerinin bir bölümünde `type` belirtilmemiş (ör. `ReportEditor.tsx` 28 adet). Form içinde
  değiller (`<form>` yalnızca 4 dosyada: `AuthGate:267`, `CaseWorkspace:1308`, `RecordCapture:134`,
  `AdminPanel:739`), bu yüzden bugün işlevsel risk düşük; tutarlılık için not edildi.

### Pozitif bulgular (korunacak davranışlar)

* Global `overflow-x` yatay taşma yok (`mobile.css:18` küresel koruma, `img/canvas/video max-width: 100%`).
* Erişilebilirlik temeli iyi: tıklanabilir `div` yok, `alt` eksik görsel yok, 96 `aria-label`,
  `ConfirmDialog` Esc/backdrop/aria‑modal, admin ve header sekme şeritlerinde klavye desteği,
  `role="status"`/`aria-live` geri bildirimleri.
* Yazdırma hattı (`@page A4 portrait`, `.form-page{210×297mm}`, `psych-report`/`mmpi-report` isimli sayfalar,
  `print-color-adjust: exact`) sağlam; tüm responsive çalışma `@media screen` içinde kalacak.
* Loading/empty/error durumları sistematik: 10 `empty-state-card`, 5 `loading-state-card`, spinner'lar,
  hata banner'larında "Tekrar dene".

---

## 5. Test / doğrulama stratejisi

Her phase sonunda:

```bash
npm run typecheck          # tsc --noEmit
npm test                   # tsx --test tests/*.test.ts  (644 test baseline)
npm run build              # tsc --noEmit && node scripts/build.mjs
```

Yeni eklenecek ölçüm (Phase 1'de): `tests/responsiveContracts.test.ts` —
(a) yatay taşma yaratan desen taraması (media‑query'siz sabit `min-width`/`width` ≥ 320 px),
(b) mobilde form kontrolü `font-size: 16px` sözleşmesi,
(c) dokunma hedefi ≥44 px seçicileri,
(d) tüm `@media print` bloklarının dokunulmadığının doğrulanması,
(e) kritik ekranların (login, işlem, kayıtlar, rapor, admin, kamera) mobil kural setine sahip olması.

Bu testler "görsel doğrulama" yerine geçmez; **regresyon önleyici sözleşme testi**dir ve raporlarda bu
şekilde adlandırılacaktır.

---

## 6. Phase planı

| Phase | İçerik | Commit mesajı | Ana dokunulacak dosyalar |
| --- | --- | --- | --- |
| 0 | Denetim (bu rapor) | `audit: complete responsive and ux audit` | `RESPONSIVE_AUDIT_PHASE_0.md` |
| 1 | Global temel: `100dvh`, input 16 px, dokunma hedefi, küresel taşma sigortaları, sözleşme testi | `responsive: establish global responsive foundation` | `mobile.css`, `screen.css`, `theme.css`, yeni test |
| 2 | Navigasyon/layout: header, sekme şeritleri, `.admin-subnav-tabs` taşması, sidebar+panel geçişleri | `responsive: fix navigation and responsive layouts` | `auth.css`, `mobile.css`, `theme.css` |
| 3 | Formlar/modallar/etkileşim: modal mobil geometrisi, alan yükseklikleri, iOS zoom, buton/ikon hedefleri | `responsive: optimize forms and interactive components` | `auth.css`, `mobile.css`, `scanner-enhancements.css` |
| 4 | Tablolar/listeler/kartlar: tablo okunabilirliği (min-width + kaydırma affordance'ı), filtre yerleşimi, sayfalama | `responsive: optimize tables lists and cards` | `screen.css`, `mobile.css` |
| 5 | Raporlar/grafikler/print: `.report-split` tablet kırılması, `psych-paper` ≤480, grafik kaydırma ipucu, print regresyon kontrolü | `responsive: optimize reports charts and print layouts` | `reports.css`, `workspace.css` |
| 6 | Kamera/OMR: kamera sahnesi, yönlendirme, manuel köşe canvas'ı, inceleme paneli | `responsive: optimize scanner and camera workflows` | `scanner.css`, `scanner-enhancements.css`, `mobile.css` |
| 7 | UX/görsel cila: küçük tipografi, büyük harf etiketler, ölü CSS, sekme a11y | `ui: improve ux consistency and visual polish` | `theme.css`, `workspace.css`, `reports.css` |
| 8 | Tam regresyon + matris + final rapor | `docs: final responsive regression report` | `FINAL_RESPONSIVE_REGRESSION_REPORT.md`, `FINAL_RESPONSIVE_UI_UX_REPORT.md` |

### Kapsam dışı (bilinçli)

* Backend/Supabase/RLS/rol/scoring/OMR/veri akışı değişikliği yok.
* Yeni özellik, yeni toast/dialog sistemi, yeni mimari katman yok.
* `form.css` + `print.css` A4 geometrisi ve `@page` kuralları değiştirilmeyecek; tüm responsive kurallar
  `@media screen` içinde kalacak.
* Mevcut masaüstü görünümü korunacak: düzeltmeler mümkün olduğunca dar ekran media sorgularında
  eklenecek, mevcut kırılma noktaları (900/800/720/620/560) kullanılacak.

---

## 7. Riskler

| Risk | Etki | Azaltım |
| --- | --- | --- |
| Görsel doğrulama yapılamıyor | Kaçırılan kırılmalar olabilir | Değişiklikler dar media sorguları içinde tutulacak; mevcut kurallar ezilmeyecek; sözleşme testleri eklenecek |
| `!important` kullanımı artabilir | Bakım maliyeti | Mevcut `!important` sayısı korunacak, yeni `!important` yalnızca yazdırma/kağıt katmanında |
| Yazdırma çıktısının bozulması | Kritik (PDF/form) | Tüm kurallar `@media screen`; `printLayout.test.ts`, `pdfForm.test.ts` regresyon kapısı |
| Masaüstü görünümünün istemsiz değişmesi | İstenmeyen UI değişikliği | Düzeltmeler ≤1024 px media sorgularına yazılacak; desktop kurallarına dokunulmayacak |

---

**PHASE 0 DURUM:** tamamlandı → commit `audit: complete responsive and ux audit`.
