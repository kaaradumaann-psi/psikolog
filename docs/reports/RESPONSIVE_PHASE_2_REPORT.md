# RESPONSIVE — PHASE 2 RAPORU (Navigasyon / Layout)

**Tarih:** 2026‑09‑23
**Branch:** `arena/01a0d039-repo123`
**Önceki commit:** `aa60c34` (`docs: phase 1 report`)

---

## Changed

| Dosya | Değişiklik |
| --- | --- |
| `src/styles/responsive.css` | Yeni bölüm **02 · ≤1100px tablet header guard**; yeni bölüm **04 · ≤720px navigasyon şeritleri ve sayfa kabukları**; ≤430px katmanına header/footer düzenlemeleri |
| `tests/responsiveContracts.test.ts` | +3 test (toplam 11): yönetim alt sekme kaydırması, tablet header kırpması, mobil sayfa kabuğu gutter'ı |

**Hiçbir mevcut kural silinmedi/değiştirilmedi.** Tüm eklemeler `@media screen` ve dar ekran sorguları içinde;
desktop (>1100px) görünümü aynen korunur.

---

## Fixed

### P0‑1 — Yönetim alt sekmeleri yatay taşması (KRİTİK)
*Önceki davranış (kanıt: `src/styles/auth.css:276`):* `.admin-subnav-tabs { display:flex; gap:8px }` —
`flex-wrap` ve `overflow-x` yok. Üç sekme (`Testler (n)`, `Psikologlar (n)`, `+ Yeni Psikolog`) +
`theme.css:552` dolguları ≈ 380–400 px yer kaplıyordu. 320–430 px ekranda **üçüncü sekme viewport dışında
kalıyor ve tüm sayfa yatay kayıyordu**; yani "Yeni Psikolog" ekranı mobilde pratikte erişilemiyordu.

*Yeni davranış:* ≤720 px'te şerit `flex-wrap: nowrap; overflow-x: auto` ile kendi içinde kaydırılır,
sekmeler `flex: 0 0 auto; white-space: nowrap` olur ve `scroll-margin-inline: 12px` ile odaklanan sekme
tam görünür kalır. Sekme sırası, ARIA rolleri ve klavye davranışı (`onSubnavKeyDown`) değişmedi.

### Header yoğunluğu
*Önceki:* 901–1100 px arasında header tek satır (marka + 3 sekme + site bağlantısı + kullanıcı + çıkış);
uzun ad–soyad veya uzun e‑posta satırı taşırabiliyordu (`.user-full-name` üzerinde `min-width: 0` yok).
*Yeni:* ≤1100 px'te `.header-left`, `.header-user`, `.user-profile-summary`, `.user-info-text` için
`min-width: 0`; `.user-full-name` 18ch, `.home-site-link span` 150px sonrası üç nokta ile kırpılır.

### Sayfa kabukları
*Önceki:* `.reports-page`/`.report-workspace` 28/24 px, `.app-main` 32/24 px dolgu — 320 px ekranda
kullanılabilir genişliğin %15'i kayboluyordu.
*Yeni:* ≤720 px → `20px 16px 36px` / `18px 14px 40px`; ≤430 px → `16px 12px 32px` / `16px 12px 40px`.

### Mobil header/footer ayrıntıları
≤430 px: `.header-inner` 10/12 px dolgu + 8 px boşluk, sekme dolgusu 8/11 px, footer içeriği ortalanmış
tek kolona döner (sıkışmış iki kolon yerine).

---

## Tested

| Kontrol | Komut | Sonuç |
| --- | --- | --- |
| Sözleşme testleri | `npx tsx --test tests/responsiveContracts.test.ts` | ✅ 11/11 |
| Tüm test paketi | `npm test` | ✅ **655 test / 0 hata** (phase 1: 652 → +3), 123 sn |
| Typecheck | `npm run typecheck` | ✅ 0 hata (bu commit'te tsx dosyası değişmedi; CSS‑only) |
| Yazdırma regresyonu | paket içindeki `printLayout`, `pdfForm`, `mmpiClinicalReportUi`, `reports` testleri | ✅ (bu phase `form.css`/`print.css`/`@media print` bloklarına dokunmadı) |

**Yeni testler:** ⑨ `.admin-subnav-tabs` ≤720 px'te `flex-wrap: nowrap` + `overflow-x: auto`, `.subnav-tab`
`flex: 0 0 auto`; ⑩ ≤1100 px katmanı var ve `.user-full-name` üç nokta ile kırpılıyor; ⑪ `.reports-page`
≤720 px ve `.app-main` ≤430 px gutter değerleri.

> Görsel doğrulama yapılmadı (ortamda tarayıcı yok) — bkz. Phase 0 §0.

---

## Remaining

* Header'da hamburger/drawer **yok ve eklenmedi**: mevcut tasarım ≤900 px'te zaten yığılan, kaydırılabilir
  bir sekme şeridine geçiyor (`theme.css:1427`). Yeni bir mobil menü mimarisi eklemek "mevcut akışı
  değiştirmemek" kuralıyla çelişirdi; bu yüzden mevcut çözüm korunup taşma hataları giderildi.
* `ScanResultPreview`/`CaseWorkspace` içindeki uzun akışların adım adım mobil optimizasyonu → Phase 6.
* Tablo okunabilirliği (P1‑4) → Phase 4 (bu phase'te tablolara dokunulmadı).

## Known Issues

1. Yönetim alt sekme şeridi ≤720 px'te kaydırılabilir; 320 px'te ilk açılışta üçüncü sekme kısmen
   görünür (kaydırılabilir olduğu ipucunu verir). Tüm sekmeleri görünür kılmak için sekme başına
   ~120 px gerekiyordu; bu da okunabilirliği bozardı.
2. `.user-full-name` 18ch kırpması 901–1100 px bandında da uygulanır (tasarım gereği); tam ad
   header'da değil, profil/oturum ekranlarında okunur.
3. ≤430 px'te footer ortalı tek kolona döner; bu, masaüstü hizalamasından **yalnızca bu genişlikte**
   ayrılır ve kasıtlıdır.

---

## Commit

```
93b8882  responsive: fix navigation and responsive layouts
```
(kod + testler + `optik-form.html` tek dosya çıktısı bu commit'te; bu rapor
`docs: phase 2 report` commit'i ile eklenir.)
