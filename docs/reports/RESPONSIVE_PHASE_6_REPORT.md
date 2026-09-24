# Responsive Faz 6 Raporu — Tarayıcı, Kamera ve OMR Akışları

**Kapsam:** `ScannerWorkspace`, `CameraCapture`, `CameraOverlay`, `RecordCapture`,
`ManualCornerEditor`, `ImageEnhancer`, `ScanResultPreview` — yani gerçek bir telefonla
optik formun fotoğraflandığı ve OMR sonucunun elle incelendiği tüm yüzeyler.

**Yöntem:** Statik analiz (CSS + TSX okuması). Bu ortamda headless tarayıcı kurulamadığı
için **piksel/görsel doğrulama yapılmadı**; aşağıdaki tüm ifadeler stil dosyalarının ve
bileşen kaynaklarının okunmasına dayanır.

---

## 1. Bulunan gerçek sorunlar

### P1 — `.scan-primary` sınıfının hiçbir CSS karşılığı yok (işlevsel stil kaybı)

`CameraCapture.tsx` içinde kamera akışının **iki ana eylemi** şu sınıfı kullanıyordu:

```
src/components/CameraCapture.tsx:161  <button className="scan-primary">Kamerayı başlat</button>
src/components/CameraCapture.tsx:163  <button className="scan-primary">Sayfayı çek ve oku</button>
```

Tüm stil dosyalarında (`grep -rn "\.scan-primary" src/styles/*.css`) bu seçici için **tek
bir kural bulunmuyor**. Yani iki birincil eylem, tarayıcı varsayılan `button` görünümünde
kalıyordu: uygulamanın her yerindeki mavi/dolgulu düğme diliyle uyumsuz, "Kamerayı durdur"
ikincil düğmesiyle görsel olarak ayırt edilemeyen düğmeler.

- **Mevcut davranış (değişiklik öncesi):** düğmeler global `button { background: none; border: none; }`
  (screen.css:101) kuralına düşüyor → metin gibi görünen, dolgusuz, çerçevesiz eylemler.
- **Değişiklik:** sınıflar mevcut tasarım sisteminin düğmelerine bağlandı —
  birincil eylemler `btn-primary`, durdurma eylemi `btn-secondary`. Yeni sınıf/stil icat
  edilmedi; davranış (`onClick`, `disabled`, koşullu render) **hiç değişmedi**.
- **Neden güvenli:** yalnızca `className` değişti; kamera başlatma/durdurma/yakalama
  mantığı, izin akışı ve OMR çağrısı aynen korundu.

### P2 — `.scan-actions` satırı telefonda taşıyor (yatay sıkışma)

`scanner.css:779` `.scan-actions { display:flex; justify-content:center; gap:12px; }` —
**`flex-wrap` yok**, `min-width` yok. Kamera açıkken "Kamerayı durdur" + "Sayfayı çek ve oku"
yan yana gelir; 320–360px genişlikte bu iki düğme metinlerini kırıp sıkışır veya taşar.
Faz 3'te oluşturulan genel eylem satırı kuralı (`.action-row`, `.form-actions` vb.) bu
satıra uygulanmamıştı.

### P2 — Manuel köşe düzenleyicisinin önizleme tuvali sabit 280px

`.manual-corner-preview-canvas` için mobil.css'te yalnızca `<720px` kuralı
(`max-width: 100%`) var; tuval 280px sabit genişlikte kalıyor ve kolonun tamamını
kullanmıyor. Köşe sürükleme tuvalin üzerinde yapıldığı için (SVG, pointer events) küçük
telefonda hedef alan gereğinden dar kalıyor.

### P3 — Tarayıcı inceleme yüzeylerinin dolgusu masaüstü ölçeğinde

`.item-inspection-box { padding: 20px }` (scanner.css:538) ve `.scan-crop-figure` dolgusu
telefonda kolonu gereksiz darlaştırıyor; `.scanner-metrics-strip > *` hücrelerinin
dokunma yüksekliği garanti değil (Faz 0'da P1 olarak işaretlenen ≥44px hedefi).

### Bilinçli olarak değiştirilmeyenler

- Kamera izni/durum metinleri (`scan-camera-wait`, `scan-camera-overlay`) ve HUD etiketleri
  (`scanner-enhancements.css` `.scan-camera-hud*`) küçük tipografiyle kaldı: bunlar
  görüntünün **üzerine** binen katmanlar, büyütülmeleri vizörü kapatır.
- `getUserMedia`, kamera `facingMode`, çözünürlük ve OMR işleme akışlarına dokunulmadı
  (kullanıcı kısıtı: veri/hesaplama akışları değişmez).
- `ImageEnhancer` / `RecordCapture` düğmeleri zaten `btn-primary`/`btn-secondary`
  kullanıyor; değişiklik gerekmedi.

---

## 2. Uygulanan değişiklikler

| Dosya | Değişiklik |
| --- | --- |
| `src/components/CameraCapture.tsx` | `.scan-primary` → `btn-primary` (×2), durdurma düğmesi → `btn-secondary`. Davranış aynı. |
| `src/styles/responsive.css` §03 | `.btn-primary`, `.btn-secondary`, `.btn-danger` de ≤720px `min-height:44px` dokunma hedefi grubuna eklendi. |
| `src/styles/responsive.css` §09 (yeni) | ≤720px tarayıcı/kamera bloğu: kamera sahnesi tam genişlik, `.scan-actions` wrap + `> button { flex:1 1 auto; min-width:140px }`, `.item-inspection-box` dolgu 14px, inceleme hücreleri ≥44px, `.manual-corner-preview` dikey akış + tuval `width:100%; max-width:280px`, `.manual-corner-actions` wrap. |
| `tests/responsiveContracts.test.ts` | +4 test (26/26): kamerada stilsiz sınıf kalmadığı, `btn-primary`/`btn-secondary` 44px hedefi, kamera sahnesi/tuval taşma kuralları, inceleme dolgusu + metrik hücresi yüksekliği. |

Yeni bölüm 09, mevcut bölüm numaralandırmasına (01–08) ek olarak **en sona** yazıldı; önceki
fazların kuralları değiştirilmedi, yalnızca §03'teki dokunma hedefi listesi genişletildi
(aynı değer, aynı kapsam).

---

## 3. Viewport değerlendirmesi (statik)

| Viewport | Tarayıcı/kamera sonucu |
| --- | --- |
| 320 / 360 / 375 | Sahne 100% genişlik; iki eylem düğmesi `min-width:140px` + wrap ile alt alta; 44px yükseklik; köşe tuvali kolon genişliği (≤280px). |
| 390 / 414 / 430 | Aynı kurallar; düğmeler tek satırda sığar (≥390 – 2×140 + 10 gap = 290px). |
| 768 / 820 / 1024 | ≤720 kuralı devre dışı; kamera sahnesi 520px (mevcut tasarım), `.scan-review-columns` ≤900'de tek kolon (mobile.css). |
| ≥1280 | Masaüstü yerleşimi değişmedi; `.scan-actions` ortalı flex olarak kaldı. |

---

## 4. Test ve derleme sonuçları

```
npm run typecheck   → çıkış 0 (hata yok)
tests/responsiveContracts.test.ts → 26/26 PASS
npm test            → # tests 670  # pass 670  # fail 0   (~115 s)
npm run build       → PASS, dist/index.html 4583.66 KB
dist içerik kontrolü → flex-wrap:wrap / scan-actions / btn-primary /
                       manual-corner-preview-canvas / @page psych-report / viewport-fit  → 6/6 PASS
```

**Görsel doğrulama:** YAPILMADI (bkz. yöntem notu). Bu fazda hiçbir ekran görüntüsü alınmadı;
tüm iddialar CSS/TSX statik analizine dayanır.

---

## 5. Kalan riskler

- Düğme sınıfı değişikliği kamera ekranının **görünümünü** değiştirdi (istenen düzeltme),
  davranışını değiştirmedi; kamera donanımı olmayan ortamda canlı test edilemedi.
- `.scan-actions > button { min-width: 140px }` çok dar (≤320px) ekranlarda iki düğmeyi alt
  alta alır — kasıtlı: sıkışmış tek satır yerine okunabilir iki satır.
- `ManualCornerEditor` önizlemesi telefonda hâlâ tek sütun; sürükleme sırasında görüntünün
  tamamı için pinch-zoom eklenmedi (kapsam dışı, davranış değişikliği olurdu).

---

## 6. Sonraki adımlar

- Faz 7: UX/UI tutarlılık ve görsel cila (tipografi ölçeği, ölü kurallar, odak halkası
  boşlukları).
- Faz 8: Nihai regresyon + birleşik rapor.

**Faz 6 commit'leri**

| Commit | İçerik |
| --- | --- |
| `4fea123` | `responsive: optimize scanner and camera workflows` — CameraCapture.tsx, responsive.css, responsiveContracts.test.ts, optik-form.html (4 dosya, +109/−6) |

Bu rapor, kod commit'inden **sonra** ayrı olarak işlendi; dosya içine kendi commit hash'i
yazılamadığı için doğrulanmış hash yukarıdaki tabloda belirtilmiştir.
