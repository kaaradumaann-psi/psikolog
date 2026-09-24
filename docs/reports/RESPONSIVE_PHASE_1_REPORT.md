# RESPONSIVE — PHASE 1 RAPORU (Global Responsive Foundation)

**Tarih:** 2026‑09‑23
**Branch:** `arena/01a0d039-repo123`
**Önceki commit:** `0afb6bf` — `audit: complete responsive and ux audit`

---

## Changed

| Dosya | Değişiklik |
| --- | --- |
| `src/styles/responsive.css` **(yeni)** | Global responsive temel katmanı — 4 bölüm: ① viewport yükseklik birimleri + iOS güvenli alan, ② yatay taşma güvenlik ağı, ③ ≤720px dokunma ergonomisi, ④ ≤430px küçük telefon katmanı |
| `src/main.tsx` | `import './styles/responsive.css';` **en sona** eklendi (tüm katmanların üzerinde çalışır) |
| `index.html` | `viewport` meta: `viewport-fit=cover` eklendi (çentik/home-indicator güvenli alanı) |
| `tests/responsiveContracts.test.ts` **(yeni)** | 8 responsive sözleşme testi |

### Neden yeni dosya (mevcut dosyaları düzenlemek yerine)

`mobile.css` başlık sözleşmesi "bu dosyadaki **her** kural bir dar-ekran medya sorgusu içindedir" diyor;
Phase 1 kurallarının bir kısmı (dvh, safe-area, min-width güvenlik ağı) globaldir ve bu sözleşmeyi bozardı.
`screen.css`/`auth.css`/`site.css` içine dağıtmak ise davranışı üç dosyaya yayardı. Tek, son yüklenen ve
`@media screen` ile sınırlanmış bir temel katman; geri alınabilir, test edilebilir ve yazdırma hattına
dokunmaz. **Mevcut hiçbir kural silinmedi veya değiştirilmedi.**

---

## Fixed

1. **Mobil tarayıcı çubuğu zıplaması** — `.portal-layout`, `.auth-page`, `.auth-shell`, `.info-shell`,
   `.report-workspace` için `min-height: 100vh → 100dvh` (vh fallback korunur); `.modal-container`
   `max-height: 90dvh`; `.report-preview-pane` `calc(100dvh - 96px)`.
2. **Çentik / home indicator** — `.app-header` üstünde `env(safe-area-inset-top)`,
   `.site-footer-inner` altında `max(12px, env(safe-area-inset-bottom))`.
3. **Yatay taşma güvenlik ağı** — `.app-main`, `.app-main > *`, `.reports-page`, `.report-workspace`,
   `.ws-panel`, `.ws-flow`, `.dashboard-section`, `.card-elevated`, `.report-section` için `min-width: 0`
   (flex/grid çocuklarının `min-width: auto` kaynaklı taşması).
   Uzun kimlik metinleri (`.record-ref-code`, `.record-page-id`, `.mono-sub`, `.batch-code`,
   `input[type=search]`, `.form-kit-file strong`, `.ws-edit-panel-id`) `overflow-wrap: anywhere`.
4. **iOS Safari focus zoom (P1‑1)** — ≤720px'te form kontrolleri 16px: catch-all `input/select/textarea`
   + tasarım sisteminin küçük boyut verdiği 18 seçicinin açık override'ı. APA rapor başlığı
   (display tipografi) clamp(19–24px) olarak korunur.
5. **Dokunma hedefleri (P1‑2)** — ≤720px'te ≥44px: `.btn-sm`, `.action-btn-*`, `.icon-close-btn`,
   `.portal-tab`, `.subnav-tab`, `.mode-tab`, `.mmpi-tab`, `.quicknav-chip`, `.report-toolbar button`,
   `.report-preview-actions button`, `.scan-comparison-toggle button`, `.close-banner-btn`,
   `.site-footer-link`, `.btn-logout`; `.date-filter-field input/select` ve `.raw-field input` 44px yükseklik.
6. **≤430px küçük telefon katmanı** — 12px gutter, sığ filtre alanları, kart iç dolgusu 14px,
   modal backdrop 12px.

**Komut:** `date-field` genişliklerini inline `style={{ width: 70 }}` belirlediği için (satır içi stil CSS'i
yener) filtre alanlarının tam genişliğe yayılması **Phase 4**'e bırakıldı — bileşen değişikliği gerektirir.

---

## Tested

| Kontrol | Komut | Sonuç |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | ✅ 0 hata |
| Test paketi | `npm test` | ✅ **652 test / 0 hata** (baseline 644 + 8 yeni sözleşme testi), ~122 sn |
| Build | `npm run build` | ✅ `dist/index.html` + `optik-form.html` üretildi (beklenen Supabase uyarısı) |
| Derleme içeriği | `dist/index.html` içinde `100dvh`, `viewport-fit=cover`, `safe-area-inset-top`, `min-height:44px`, `font-size:16px`, `max-width:430px`, `@page` | ✅ hepsi mevcut |
| Yazdırma hattı | `printLayout`, `pdfForm`, `reports`, `mmpiClinicalReportUi` testleri | ✅ dokunulmadı |

**Yeni sözleşme testleri (`tests/responsiveContracts.test.ts`):**
1. `viewport` meta `width=device-width` + `viewport-fit=cover` içerir.
2. `responsive.css` en son import edilir; `!important` ve `@media print`/`@page` içermez.
3. Tüm responsive kurallar `@media screen` içindedir.
4. `100vh → dvh` çiftleri hedef seçicilerde mevcut.
5. Mobilde 16px catch-all + 11 kritik kontrolün açık override'ı var.
6. Mobilde 44px dokunma hedefi seçicileri var.
7. ≤430px katmanı ve `.app-main` gutter'ı tanımlı.
8. Temel CSS'te kalan **her** <16px kontrol ya mobil katmanda düzeltilir ya da istisna listesindedir
   (test bu maddeyi uygularken `theme.css: .field input/.field textarea` eksiğini yakaladı → düzeltildi).

> Not: Bu testler **görsel doğrulama değildir**; sözleşmeyi kilitler. Görsel doğrulama bu ortamda
> yapılamıyor (bkz. Phase 0 §0).

---

## Remaining

* Masaüstü ölçekte (1280–1920) hiçbir kural değişmedi; bu phase'te masaüstü görünümü etkilenmedi.
* `.report-split` tablet kırılması (P0‑2), `.admin-subnav-tabs` taşması (P0‑1), tablo okunabilirliği (P1‑4),
  grafik kaydırma affordance'ı (P1‑3), modal iç dolgusu (P1‑5) → Phase 2/3/4/5.
* Inline `style={{ width/minWidth }}` ile verilen filtre genişlikleri → Phase 4.
* `mobile.css` başlık yorumu hâlâ "yalnızca ≤720px" sözleşmesini taşıyor; Phase 1 kuralları ayrı dosyada
  olduğu için bu sözleşme **bozulmadı**.

## Known Issues

1. **Görsel doğrulama yok** — bu ortamda tarayıcı çalıştırılamıyor; tüm doğrulama statik/otomatik.
2. `100dvh` desteği olmayan eski tarayıcılarda `vh` fallback geçerli olur (kabul edilen davranış).
3. `.site-footer-inner` alt dolgusu `max(12px, env(safe-area-inset-bottom))` ile site.css'teki 12px kuralını
   yalnızca çentikli cihazlarda büyütür (diğer cihazlarda aynı görünüm).
4. Sed/parse tabanlı testler yorum içindeki metinlerden etkilenebilir; bu yüzden testler yorumları
   temizleyerek çalışır (`!important` / `@media print` yalnızca gerçek kurallarda aranır).

---

## Commit

```
fad2b04  responsive: establish global responsive foundation
```
(kod + testler + `optik-form.html` tek dosya çıktısı bu commit'te; bu rapor dosyası
`docs: phase 1 report` commit'i ile eklenir — böylece raporda yazan hash **gerçek ve doğrulanabilir** olur.)
