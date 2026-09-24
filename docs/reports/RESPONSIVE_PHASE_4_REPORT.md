# RESPONSIVE — PHASE 4 RAPORU (Tablolar / Listeler / Kartlar)

**Tarih:** 2026‑09‑23
**Branch:** `arena/01a0d039-repo123`
**Önceki commit:** `6d88e66` (`docs: phase 3 report`)

---

## Changed

| Dosya | Değişiklik |
| --- | --- |
| `src/styles/responsive.css` | Yeni bölüm **05 · ≤720px veri tabloları** (kendi içinde kaydırma + sabit kimlik kolonu + hücre dolgusu) ve ≤430 px katmanına tablo/filtre/sayfalama kuralları |
| `tests/responsiveContracts.test.ts` | +2 test (toplam 16): tablo kaydırma/sabit kolon sözleşmesi, liste-kart ayakları sarma |

---

## Tespit edilen mevcut davranış (önce)

**Tablolar** (`screen.css:655–707`, `mobile.css:638–654`):
`.modern-table-card { overflow: hidden }` → `.table-responsive { overflow-x: auto }` → `.modern-data-table`
(`width: 100%`, `min-width` **yok**, `font-size: 13px`, hücre dolgusu `14px 18px`).
Yani taşma sayfaya yansımıyordu; ancak `min-width` olmadığı için tablo **viewport'a sıkıştırılıyordu**:
5–6 kolon 320–430 px'te 3–4 satıra kırılıyor, tarih/psikolog hücreleri dikey yığılıyordu. Veri kaybı yok,
kullanılabilirlik yok. Kullanılan tablolar: `MyRecordsPanel` (5 kolon), `AdminPanel` Testler (6 kolon),
`AdminPanel` Psikologlar (5 kolon), `ReportsPage` rapor listesi (4 kolon).

**Listeler/kartlar:** gruplu görünüm (`.modern-table-card` + zaman çizelgesi) ve sayfalama satırları
`MyRecordsPanel.tsx:401–411`, `ScanResultPreview.tsx:430` içinde satır içi stillerle (`display:flex`,
`flexWrap`) yazılmış; `.review-pagination-bar` (`scanner.css:524`) sarmıyordu.

---

## Fixed

### P1‑4 — Tablolar mobilde kullanılabilir hâle geldi
*Yeni davranış (≤720 px):*
1. `.table-responsive` `overflow-x: auto` + `scrollbar-width: thin` + dokunmatik kaydırma.
2. `.modern-data-table { min-width: 640px }` → **kolonlar artık sıkışmaz**; tablo kaydırılır, hücreler
   tek satırda ve hizalı kalır. **Hiçbir kolon/veri gizlenmedi** (priority-column veya kırpma yok).
3. `th:first-child, td:first-child { position: sticky; left: 0 }` + kendi arka planı ve
   `inset -1px 0 0` ayracı → yatay kaydırırken **danışan kimliği ekranda kalır**, satır karıştırılmaz.
   Başlık hücresi `z-index: 2` ile gövde hücresinin üstünde kalır.
4. Hücre dolgusu 14/18 → 12/14 px (mobilde daha çok kolon görünür).
5. ≤430 px'te `min-width: 600px` (bir tık daha az kaydırma; sabit kimlik kolonu sayesinde okunabilirlik
   korunur) + `.search-filter-box > div` ve `.review-pagination-bar` sarma.

### Filtre ve sayfalama satırları
*Önceki:* `.date-range-filter` (tarih + cinsiyet + 2 yaş alanı + "Filtreleri temizle"), "Danışana göre
grupla" onay kutusu ve "Sayfa boyutu" seçicisi 430 px'te iç içe geçiyordu; `.review-pagination-bar`
(Önceki / sayfa göstergesi / Sonraki) üç parçayı tek satıra sığdırmaya çalışıyordu.
*Yeni:* ≤430 px'te filtre satırları ve sayfalama sarma yapar, gösterge kendi satırına iner, 44 px
dokunma hedefleri korunur.

**Bu phase'te hiçbir bileşen dosyası değiştirilmedi** — mevcut veri/gösterim mantığı ve satır içi stiller
aynen bırakıldı; yalnızca CSS katmanı eklendi. Sayfalama davranışı (sayfa boyutu seçenekleri, sunucu
taraflı sayfalama, gruplama) değişmedi.

---

## Tested

| Kontrol | Komut | Sonuç |
| --- | --- | --- |
| Sözleşme testleri | `npx tsx --test tests/responsiveContracts.test.ts` | ✅ 16/16 |
| Tüm test paketi | `npm test` | ✅ **660 test / 0 hata** (phase 3: 658 → +2), 122 sn |
| Build | `npm run build` | ✅ `dist/index.html` 4.582,3 KB |
| Derleme içeriği | `dist/index.html` içinde `min-width:640px`, `position:sticky;left:0`, `max-width:560px`, `overflow-x:auto` | ✅ hepsi mevcut |
| Yazdırma regresyonu | `printLayout`, `pdfForm`, `mmpiClinicalReportUi`, `reports` | ✅ (tablo kuralları yalnızca `@media screen`) |
| `patientGrouping`, `recordDetailUi` | `npm test` içinde | ✅ |

**Yeni testler:** ⑮ `.modern-data-table` ≤720 px'te `min-width: 640px`, ilk hücre `position: sticky` +
arka plan, `.table-responsive` `overflow-x: auto`; ⑯ ≤430 px'te `.review-pagination-bar` ve
`.search-filter-box > div` sarma.

---

## Remaining

* Yaş filtrelerinin inline `width: 70` değeri korundu (bkz. Phase 3 "Remaining") — alanlar 44 px yükseklik
  ve 16 px font ile mobilde kullanılabilir.
* Uzun tablolar için sanal kaydırma / "kolon önceliği" yaklaşımı **bilinçli olarak uygulanmadı**: veri
  kaybettirmeden okunabilirlik sağlamak için kaydırma + sabit kimlik kolonu seçildi (istenen yöntemlerden
  ikisi: *horizontal scroll* + *priority column*).
* Yönetim "Psikologlar" tablosundaki durum/yetki pilleri mobilde kaydırmayla görünür → Phase 7'de
  görsel cila değerlendirmesi.
* Rapor listeleri (rapor geçmişi kartları) → Phase 5.

## Known Issues

1. Sabit (sticky) ilk kolon, satır hover arka planını (`#f8fafc`) yalnızca o hücre için ayrıca tanımlar;
   `.row-muted` (opacity 0.65) satırlarında ilk hücre tam opak görünür — küçük bir görsel tutarsızlık,
   veri kaybı yok. Kaydırma yoksa (tablet/desktop'ta ve 640 px'ten geniş alanlarda) sticky hiç devreye
   girmez, dolayısıyla etki yalnızca telefon genişliklerindedir.
2. `min-width: 640px` nedeniyle 360 px'te tablo ~%44 oranında yatay kaydırılır; bu, sıkıştırılmış
   okunamaz tabloya tercih edildi ve kaydırma çubuğu (`thin`) görünür kılındı.
3. `scrollbar-width: thin` yalnızca Firefox/Safari'de etkilidir; Chromium mobilde kaydırma çubuğu
   overlay olarak görünür (platform davranışı).

---

## Commit

```
e0af560  responsive: optimize tables lists and cards
```
(kod + testler + `optik-form.html` tek dosya çıktısı bu commit'te; bu rapor
`docs: phase 4 report` commit'i ile eklenir.)

**Doğrulama:** `git status` commit sonrası yalnızca bu raporu "untracked" gösterdi;
`dist/index.html` içinde dört yeni kuralın da bulunduğu ayrıca doğrulandı.
