# UX / UI Faz 7 Raporu — Tutarlılık ve Görsel Cila

**Kapsam:** Faz 1–6'da yerleşen responsive temelin üzerine, kullanıcı akışlarını
bozan **gerçek** UX/UI tutarsızlıkları: erişilebilirlik (klavye odağı), hata durumu
tutarlılığı, telefonda okunabilirlik tabanı ve taşma yapan metin/çip grupları.

**Yöntem:** Statik analiz (CSS + TSX). Headless tarayıcı bu ortamda kurulamadığı için
**görsel doğrulama yapılmadı**; tüm ifadeler kaynak okuması ve papatya testlerle
doğrulanmıştır.

---

## 1. Bulunan gerçek sorunlar ve düzeltmeler

### P1 — Klavye odağı checkbox/radio üzerinde görünmüyordu (erişilebilirlik)

`theme.css` içindeki odak kuralı bu iki kontrol tipini açıkça dışlıyordu:

```css
input:focus-visible:not([type='checkbox']):not([type='radio']),
select:focus-visible, textarea:focus-visible { outline: 2px solid var(--text); }
```

Tüm CSS dosyalarında checkbox/radio için başka bir `:focus` kuralı **yok**
(`grep -rn "checkbox\|radio" src/styles/*.css | grep -i focus` → yalnızca bu dışlama).
Aynı dosyanın reset'i tarayıcının varsayılan halkasını kaldırdığı için, "Kabul ediyorum"
onayı (CaseWorkspace:1740) ve "Kayıtları grupla" anahtarı (MyRecordsPanel:213) gibi
kontrollerde klavye kullanıcısı odağını **hiç göremiyordu**.

- **Önce:** odak göstergesi yok (WCAG 2.4.7 başarısız).
- **Sonra:** `input[type='checkbox']:focus-visible, input[type='radio']:focus-visible`
  için `outline: 2px solid var(--text); outline-offset: 2px;` — tasarım sisteminin mevcut
  odak diliyle aynı (siyah 2px halka).
- **Davranış değişikliği:** yok; yalnızca klavye odağında görsel halka.

### P2 — Bir hata mesajı stilsizdi (durum tutarlılığı)

20 `role="alert"` kullanımının 19'u `.status-banner` + varyant sınıfını kullanıyor;
tek istisna `src/reports/ReportsPage.tsx:62` idi:

```tsx
<p role="alert">Raporlar yüklenemedi. {error}</p>
```

Aynı ekrandaki diğer hatalar (`ReportsPage.tsx:147`, `ReportEditor.tsx:306`) banner
olarak çizilirken bu satır düz metin olarak kalıyordu — kullanıcı için "hata" sinyali
kayboluyordu. `className="status-banner error-banner"` eklendi; metin ve `role` aynı.

### P2 — Telefonda 9–10px etiketler (okunabilirlik tabanı)

Ekranda görünen (print **değil**) küçük tipografi envanteri çıkarıldı; 9–10px kullanan
ve anlam taşıyan etiketler şunlardı: `.user-role-badge`, `.brand-subtitle`,
`.btn-multiline small`, `.ws-method-flag`, `.level-badge`, `.mv-band`, `.qe-cell` (9px),
`.item-select-chip .item-ans`, alt bilgi `.site-footer-sep/-disclaimer/-credit`.

- **Karar:** görsel dil bozulmasın diye masaüstü **değiştirilmedi**; ≤720px'te bu
  etiketlere `font-size: 11px` tabanı verildi.
- Print (`.pr-*`, `@page mmpi-report`) ve A4 kağıt önizlemesindeki 8–10px metinlere
  **dokunulmadı**: orada küçük punto kâğıt ölçeğinin parçası.

### P2 — Madde seçim çipleri 44px dokunma hedefinin altındaydı

`.item-select-chip` (1–60 madde ızgarası, `scanner.css:485`) `padding: 8px 4px` ile ~36px
yükseklikteydi; yanlış okunan bir OMR maddesini düzeltmenin **tek yolu** bu çipler.
≤720px'te `min-height: 44px` + `justify-content: center` eklendi (≤900'de 6 sütuna inen
ızgara genişliği yeterli; sütun sayısı değiştirilmedi).

### P3 — Dar ekranda `nowrap` metinler viewport'u aşıyordu

`.site-footer-copyright` ve `.site-footer-meta` `white-space: nowrap` (site.css:73/89);
≤430px'te 320px genişlikte telif satırı viewport kenarının altına kaçıyordu. Aynı şekilde
`.dossier-stat` (`white-space: nowrap`) ve `.dossier-fact dd` skor çipleri kart dışına
taşabiliyordu. ≤430px'te bu seçiciler `white-space: normal` + `text-align: center` ve
`.scale-dossier-stats` / `.dossier-stats` `flex-wrap: wrap` aldı. Masaüstü görünümü aynı.

---

## 2. Değiştirilmeyenler (bilinçli)

| Konu | Neden dokunulmadı |
| --- | --- |
| Ölü seçici `.modal-quicknav` (workspace.css:1737) | Hiçbir TSX dosyasında kullanılmıyor (`.report-quicknav` ve `.quicknav-chip` canlı). Silme işlevsel risk taşımadığı hâlde "gereksiz değişiklik yapma" kuralı gereği dokunulmadı; temizlik önerisi olarak burada kayda geçti. |
| 39 `<button>` öğesinde `type` özniteliği yok | Hepsi `<form>` dışında (multi-line JSX taramasıyla doğrulandı) → varsayılan `submit` davranışı tetiklenmiyor, gerçek bir hata yok. Yalnızca bakım notu. |
| Print/A4 küçük tipografi (8–10px) | Kâğıt ölçeğinin parçası; değiştirmek PDF düzenini bozardı. |
| `.psych-draft-banner` 9px (rapor kağıdı içi) | Kağıt önizlemesinin içinde, ekran kabuğunda değil; tutarlılık için kağıt ölçeğinde kaldı. |
| Kişisel zevk düzeyindeki renk/boşluk tercihleri | "Kendi tasarım tercihini dayatma" kuralı gereği kapsam dışı bırakıldı. |

---

## 3. Uygulanan değişiklikler

| Dosya | Değişiklik |
| --- | --- |
| `src/styles/theme.css` | checkbox/radio `:focus-visible` halkası (a11y). |
| `src/reports/ReportsPage.tsx` | Stilsiz `<p role="alert">` → `status-banner error-banner`. |
| `src/styles/responsive.css` §03 | ≤720px etiket okunabilirlik tabanı (11px) + `.item-select-chip` `min-height: 44px`. |
| `src/styles/responsive.css` §05 | ≤430px: alt bilgi metinleri sarar/ortalanır, dossier istatistik grupları sarar. |
| `tests/responsiveContracts.test.ts` | +5 test (31/31): odak halkası, 11px tabanı, çip yüksekliği, sarma kuralları, hata banner tutarlılığı. |

---

## 4. Test ve derleme sonuçları

```
npm run typecheck                    → çıkış 0
tests/responsiveContracts.test.ts    → 31/31 PASS
npm test                             → # tests 675  # pass 675  # fail 0  (~122 s)
npm run build                        → PASS, dist/index.html 4584.3 KB
dist içerik kontrolü                 → checkbox:focus-visible / item-select-chip /
                                        site-footer-copyright / status-banner error-banner /
                                        font-size:11px  → 5/5 PASS
```

**Görsel doğrulama:** YAPILMADI (bkz. yöntem notu).

---

## 5. Kalan UX/UI işleri (kapatılmayanlar)

1. `.modal-quicknav` ölü kuralı — temizlik adayı (işlevsel risk yok).
2. `type` özniteliği eksik 39 `<button>` — kozmetik/bakım işi.
3. Rapordaki 8–10px kağıt tipografisi — tasarım kararı, değiştirilmedi.
4. Odak sırasının sayfa bazında tam denetimi (tab order) yalnızca statik olarak
   incelendi; gerçek tarayıcı ile doğrulanmadı.

---

## 6. Commit'ler

| Commit | İçerik |
| --- | --- |
| `c597fd9` | `ui: improve ux consistency and visual polish` — theme.css (+9), ReportsPage.tsx (±1), responsive.css (+47), responsiveContracts.test.ts (+35), optik-form.html (5 dosya, +134/−43) |

Bu rapor kod commit'inden sonra ayrı olarak işlendi (rapor kendi commit hash'ini
içeremez). Faz 8'de tam regresyon ve birleşik değerlendirme yapılacak.
