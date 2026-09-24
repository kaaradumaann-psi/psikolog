# Verified MMPI Data

Kaynakta **kesin olarak doğrulanan** veriler. Hızlı referans dosyası.
Her değer `SOURCE_FACTS.md` içindeki bir ID'ye bağlıdır.

## ⚑ NORM KATMANI — `TURKISH_NORMS` 26/26 HÜCRE VERIFIED

Kaynak: **Tablo 30**, "Normal Türk, Erkek ve Kadınların MMPI Alt Testlerindeki
Ortalama ve Standart Sapmaları", **kitap s.195** (PDF p105 R) · `SOURCE-NORM-001`
Örneklem: 1003 erkek / 663 kadın (Bölüm 8 standardizasyon, s.191)
Doğrulama: tam sayfa görsel okuma (OCR bu sayfayı boş döndürdü) +
`scripts/mmpi-audit/compare-norms.py` → **MATCH=26 DIFF=0**
Kalıcı test: `tests/mmpiKeyIntegrity.test.ts` → "Türk normları — Tablo 30"

| Ölçek | Erkek X̄ | SD | Kadın X̄ | SD |
|---|---|---|---|---|
| L | 6.45 | 2.74 | 6.00 | 2.25 |
| F | 8.30 | 4.62 | 9.38 | 5.16 |
| K | 13.98 | 4.65 | 11.82 | 3.80 |
| Hs | 13.19 | 4.07 | 15.89 | 4.88 |
| D | 20.63 | 4.76 | 23.86 | 5.08 |
| Hy | 19.31 | 4.71 | 18.12 | 5.31 |
| Pd | 22.22 | 4.45 | 22.84 | 4.51 |
| Mf | 29.21 | 3.82 | 32.98 | 3.67 |
| Pa | 11.12 | 4.03 | 11.93 | 4.17 |
| Pt | 27.90 | 6.30 | 29.20 | 6.59 |
| Sc | 29.82 | 9.05 | 31.06 | 8.20 |
| Ma | 19.96 | 4.40 | 19.72 | 4.36 |
| Si | 23.86 | 7.97 | 29.88 | 7.52 |

**K düzeltmesi doğrulandı:** Tablo 30, K eklenmiş (Hs+.5K, Pd+.4K, Pt+1K,
Sc+1K, Ma+.2K) ve eklenmemiş satırları ayrı verir. Kod, T dönüşümünden önce
K düzeltmesini uyguladığı için **doğru satırları** kullanır.

**Kaynak iki yerde çelişir (kayıt):** Geçerlik bölümü dipnotları
(s.34: F kadın 10.11 · s.38: K erkek 13.90, K kadın 13.54) Tablo 30 ile
uyuşmaz. Kod Tablo 30'u izler → `CONFLICT-001`/`CONFLICT-002` **REJECTED**.

**Örneklem sınırı (yorum için önemli):** Örneklem "normal Türk toplumu" değil,
**16-30 yaş ağırlıklı, eğitimli, kentli** bir gruptur (%85 bekâr; %84.88 büyük
kent; orta+lise %54.29 + üniversite %47.21). Kaynak kitap da 31-50 yaş
aralığının **yetersiz temsil edildiğini** belirtir (s.192).

---

## Sürüm

| Alan | Değer | Kaynak | Durum |
|---|---|---|---|
| Ölçek | MMPI (orijinal) / 566 madde (550 + 16 tekrar) | s.1 · `SOURCE-VERSION-001` | VERIFIED |
| Geçerlik alt testleri | (?) L F K | s.1 · `SOURCE-VERSION-002` | VERIFIED |
| Klinik alt testler | Hs D Hy Pd Mf Pa Pt Sc Ma Si | s.1 · `SOURCE-VERSION-002` | VERIFIED |

---

## Geçerlik — (?) Bir şey diyemem

Ham puan bantları (Tablo 2, s.30 · `SOURCE-VALIDITY-CANNOTSAY-001`):

| Ham | Düzey | Kod karşılığı |
|---|---|---|
| 0 | Düşük | `CANNOT_SAY_RAW_BANDS[0]` ✅ MATCH |
| 1-5 | Normal | `[1]` ✅ MATCH |
| 6-30 | Orta | `[2]` ✅ MATCH |
| 31+ | Geçersiz | `[3]` ✅ MATCH (kod etiketi "Belirgin") |

---

## Geçerlik — L

### Madde anahtarı (Tablo 3, s.31 · `SOURCE-VALIDITY-L-001`) — **VERIFIED**

Yön: **tamamı Yanlış (Y)**

```
15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 195, 225, 255, 285
```

Kod (`mmpiKeys.ts` → `SCORING_KEYS.L.falseItems`): **birebir aynı** ✅ MATCH

### Normlar (Tablo 3 dipnotu, s.31 · `SOURCE-VALIDITY-L-002`) — **VERIFIED**

| Cinsiyet | Ortalama | Kod | Durum |
|---|---|---|---|
| Erkek | 6.45 | 6.45 | ✅ MATCH |
| Kadın | 6.00 | 6.00 | ✅ MATCH |

### T bantları (s.33 · `SOURCE-VALIDITY-L-003`) — **VERIFIED**

`≥69` · `64-68` · `59-63` · `36-55` · `≤35`
→ kod `56-63` kullanır: bkz. `CONFLICTS.md` CONFLICT-003

---

## Geçerlik — F

### Madde anahtarı (Tablo 4, s.34 · `SOURCE-VALIDITY-F-001`) — **VERIFIED**

Yön Doğru (44 madde):
```
14, 23, 27, 31, 34, 35, 40, 42, 48, 49, 50, 53, 56, 66, 85, 121, 123, 139, 146,
151, 156, 168, 184, 197, 200, 202, 205, 206, 209, 210, 211, 215, 218, 227, 245,
246, 247, 252, 256, 269, 275, 286, 291, 293
```
Yön Yanlış (20 madde):
```
17, 20, 54, 65, 75, 83, 112, 113, 115, 164, 169, 177, 185, 196, 199, 220, 257,
258, 272, 276
```

Kod (`SCORING_KEYS.F`): **birebir aynı** ✅ MATCH

### Normlar (Tablo 4 dipnotu, s.34 · `SOURCE-VALIDITY-F-002`) — **VERIFIED**

| Cinsiyet | Kaynak | Kod | Durum |
|---|---|---|---|
| Erkek | 8.30 | 8.30 | ✅ MATCH |
| Kadın | **10.11** | **9.38** | ❌ CONFLICT-001 (P0) |

### Ham puan bantları (s.34-35 · `SOURCE-VALIDITY-F-003`) — **VERIFIED**

`0-2` · `3-9` · `10-15` · `16-25` · `26+`
→ kod `0-2` · `3-7` · `8-15` · `16-22` · `23+`: bkz. CONFLICT-004

### T bantları (s.37 · `SOURCE-VALIDITY-F-005`) — **VERIFIED**

`≥80` · `70-79` · `55-69` · `44-54` · `<45`
→ kod eşdeğer bölümleme kullanır (CONFLICT-006, kabul edildi)

---

## Geçerlik — K

### Madde anahtarı (Tablo 5, s.38 · `SOURCE-VALIDITY-K-001`) — **VERIFIED**

Yön Doğru (1 madde): `96`
Yön Yanlış (28 madde):
```
30, 39, 71, 89, 124, 129, 134, 138, 142, 148, 170, 171, 180, 183, 217, 234,
267, 272, 296, 316, 322, 374, 383, 397, 398, 406, 461, 502
```

Kod (`SCORING_KEYS.K`): **birebir aynı** ✅ MATCH

### Normlar (Tablo 5 dipnotu, s.38 · `SOURCE-VALIDITY-K-002`) — **VERIFIED**

| Cinsiyet | Kaynak | Kod | Durum |
|---|---|---|---|
| Erkek | **13.90** | **13.98** | ❌ CONFLICT-002 (P0, yazım farkı) |
| Kadın | **13.54** | **11.82** | ❌ CONFLICT-002 (P0, maddi fark) |

### T bantları (s.40 · `SOURCE-VALIDITY-K-003`) — **VERIFIED**

`≥72` · `61-72` · `46-60` · `27-45`
→ kod `≥72` · `61-71` · `46-60` · `≤45`: eşdeğer bölümleme (CONFLICT-006)

### Yapısal kural (s.40 · `SOURCE-VALIDITY-K-004`) — **VERIFIED**

"K alt testi, profili geçersiz yapacak belirgin değerlerin olmadığı tek alt testtir."
→ K hiçbir zaman tek başına profili geçersiz kılmaz; kod bu davranışı
`VALIDITY_CUTOFFS` içinde yalnızca (?) ve F ile uygular ✅ davranış MATCH

---

# Ek 9 — Madde anahtarları (kitap s.244-256)

**Karşılaştırma sonucu (düzeltme sonrası): 46 MATCH / 0 DIFF / 0 MISSING**

Önceki durum: 41 MATCH / 5 DIFF → `CODE_CHANGES.md` CHANGE-001..005

Araç: `scripts/mmpi-audit/compare-keys.py`
Sütun `Doğrulama`: `V` = görsel doğrulandı · `O` = yalnızca OCR

## Geçerlik ve klinik ölçekler

| Ölçek | Madde | Kaynak | Kod | Sonuç | Doğrulama |
|---|---|---|---|---|---|
| L | 15 | 15 | 15 | ✅ MATCH | V |
| F | 64 | 64 | 64 | ✅ MATCH (düzeltildi) | V |
| K | 30 | 30 | 30 | ✅ MATCH | V |
| Hs | 33 | 33 | 33 | ✅ MATCH | O |
| D | 60 | 60 | 60 | ✅ MATCH | O |
| Hy | 60 | 60 | 60 | ✅ MATCH | O |
| Pd | 50 | 50 | 50 | ✅ MATCH | O |
| Mf (E) | 60 | 60 | 60 | ✅ MATCH | V |
| Mf (K) | 60 | 60 | 60 | ✅ MATCH | V |
| Pa | 40 | 40 | 40 | ✅ MATCH | O |
| Pt | 48 | 48 | 48 | ✅ MATCH | O |
| Sc | 78 | 78 | 78 | ✅ MATCH | O |
| Ma | 46 | 46 | 46 | ✅ MATCH | O |
| Si | 70 | 70 | 70 | ✅ MATCH | O |

**Kritik doğrulama (Mf cinsiyet kuralı):** Kitap s.245 dipnotu
"(*) işareti sorular kadınlarda ters yönde puan almaktadır" der ve
**69, 179, 231, 297, 133** maddelerini işaretler. Kodun kadın anahtarı bu beş
maddenin tamamını doğru şekilde ters çevirmiştir ✅

## Kişilik bozuklukları testi (kitap s.248-250)

| Ölçek | Kaynak | Kod | Sonuç | Doğrulama |
|---|---|---|---|---|
| PAR | 22 | 22 | ✅ MATCH | O |
| SZD | 22 | 22 | ✅ MATCH | O |
| STY | 36 | 36 | ✅ MATCH | O |
| ANT | 25 | 25 | ✅ MATCH | O |
| BDL | 22 | 22 | ✅ MATCH | V |
| HST | 20 | 20 | ✅ MATCH (düzeltildi) | V |
| NAR | 31 | 31 | ✅ MATCH | V |
| AVD | 38 | 38 | ✅ MATCH (düzeltildi) | V |
| DEP | 20 | 20 | ✅ MATCH | V |
| CPS | 15 | 15 | ✅ MATCH | O |
| PAG | 14 | 14 | ✅ MATCH | O |

## Alkol ölçekleri (kitap s.251)

| Ölçek | Kaynak | Kod | Sonuç | Doğrulama |
|---|---|---|---|---|
| MAC | 49 (dipnot: #215 ve #460 çıkarıldı) | 49 | ✅ MATCH | V |
| ICAS | 8 | 8 | ✅ MATCH | O |

## Wiggins içerik skalaları (kitap s.252-255)

| Ölçek | Kaynak | Kod | Sonuç | Doğrulama |
|---|---|---|---|---|
| SOC | 27 | 27 | ✅ MATCH | O |
| DEP_W | 33 | 33 | ✅ MATCH | O |
| FEM | 30 | 30 | ✅ MATCH (düzeltildi) | V |
| MOR | 23 | 23 | ✅ MATCH | O |
| REL | 12 | 12 | ✅ MATCH | O |
| AUT | 20 | 20 | ✅ MATCH | O |
| PSY | 48 | 48 | ✅ MATCH | O |
| ORG | 36 | 36 | ✅ MATCH | O |
| FAM | 16 | 16 | ✅ MATCH | O |
| HOS | 27 | 27 | ✅ MATCH | O |
| PHO | 27 | 27 | ✅ MATCH | O |
| HYP | 25 | 25 | ✅ MATCH | O |
| HEA | 28 | 28 | ✅ MATCH | O |

## Özel ölçekler (kitap s.255-256)

| Ölçek | Kaynak | Kod | Sonuç | Doğrulama |
|---|---|---|---|---|
| OH | 33 (başlık) / **31** (tablo) | 31 | ✅ MATCH (tablo izlenir) | V |
| Es | 68 | 68 | ✅ MATCH (düzeltildi) | V |
| A | 39 | 39 | ✅ MATCH | O |
| R | 40 | 40 | ✅ MATCH | O |
| Do | 28 | 28 | ✅ MATCH | O |
| Dy | 57 | 57 | ✅ MATCH | O |

---

# PHASE 4 — Tutarlılık endeksleri ve F-K (kitap s.56-61)

Doğrulama anahtarı: **V** = yüksek DPI görsel doğrulama · **O** = OCR (görsel
doğrulama yok) — sayısal tablolar için **V zorunludur**.

## Konfigürasyon 14 — erdemli görünme isteği (kitap s.56, p36 L)

| Ölçek | Kaynak koşulu | Kod koşulu | Sonuç | Doğrulama |
|---|---|---|---|---|
| L | > 55 | `v.L > 55` | ✅ MATCH | V |
| F | < 60 | `v.F < 60` | ✅ MATCH | V |
| K | 59-64 arası | `v.K >= 59 && v.K <= 64` | ✅ MATCH | V |

Kaynak aynen: "Konfigürasyon 14: L alt testi 55 T puanının üstünde, F alt testi
60 T puanının altında, K alt testi 59-64 T puanı arasındadır." (Şekil 14)
Ek uyarı (kaynak): "Eğer F ve K alt testleri 70 T puanının üstündeyse, bireyde
hastalığa içgörü yoktur ve prognoz kötüdür."

## Konfigürasyon 15 — katı / karmaşıklık örüntüsü (kitap s.57, p36 R)

| Ölçek | Kaynak koşulu | Kod koşulu | Sonuç | Doğrulama |
|---|---|---|---|---|
| L | **= 60** (nokta; şekilde de 60) | `55 ≤ v.L ≤ 65` | ⚠️ EXTRA (kaynak noktasının ±5 toleransı) | V |
| F | > 70 | `v.F > 70` | ✅ MATCH | V |
| K | < 40 | `v.K < 40` | ✅ MATCH | V |

Kaynak aynen: "Konfigürasyon 15: L alt testi **60 T puanında**, F alt testi 70 T
puanının üstünde ve K alt testi 40 T puanının altındadır." (Şekil 15)
Şekil 15 görsel doğrulaması: L noktası **60** seviyesinde, F noktası 70'in hemen
üstünde, K noktası 40'ın altında → metni doğrular.
→ DECISION-018 (bant kabul edildi), CONFLICT-014 REJECTED.

## K+ profili (Mark & Seeman 1963) — kitap s.57, p36 R

| Ölçüt | Kaynak | Kodda karşılığı | Sonuç |
|---|---|---|---|
| Klinik ölçekler | Hiçbiri T ≥ 70 | örüntü tanımı yok | ⚠️ kodda yok → UNVERIFIED |
| Klinik ölçekler | ≥ 6 ölçek T ≤ 60 | örüntü tanımı yok | ⚠️ kodda yok → UNVERIFIED |
| K ve L | K > F **ve** L > F | — | ⚠️ kodda yok |
| K − F | **≥ 5 T puanı** | — | ⚠️ kodda yok |
| Kişilik | sizoid, utangaç, kaygılı, ketlenmiş, pasif direnç | — | (yorum) |

Kaynak: "K+ profilinde K ve L alt testleri F'den yüksektir ve K alt testi, F alt
testinin en az 5 T puanı üstündedir." → **Kodda K+ profili tanımı yoktur**
(s.58'de Şekil 16 ile gösterilir). Bu bir **MISSING** kalemidir;
`P3` (rapor/yorum kapsamı) olarak kaydedilir.

## F-K endeksi (Gough) — kitap s.58-59

| Kural | Kaynak | Kod | Sonuç | Doğrulama |
|---|---|---|---|---|
| 0 ≤ F-K ≤ 9 | profil **geçerlidir** | `0 < value ≤ 9` → "Normal/Geçerli" | ✅ MATCH | V |
| F-K > 9 | **sahte-kötülük** | `value > 9` → "Sahte-Kötülük" | ✅ MATCH | V |
| F-K = 0 | **sahte-iyilik** | "Hafif Savunuculuk (Geçerli)" | ⚠️ kaynak içi gerilim → CONFLICT-013 REJECTED (DECISION-017) | V |
| 8 ≤ F-K ≤ 11 | sorunlar var **ama abartılıyor**; yardıma açık | her iki dalda da 8-11 notu | ✅ MATCH | V |
| F-K > 16 | kritik; psikoz **veya** simülasyon | `value > 16` → "Kritik Derecede Yüksek Abartma" | ✅ MATCH | V |
| Negatif bölge eşiği | **kaynakta sayısal eşik yok** | `value < -8` → sahte-iyilik | ⚠️ UNVERIFIED (kaynak yok) | V |
| Kesim puanı tarihçesi | 11 → **9** (Gough 1947, 1951) | — | bilgi | V |
| Klinik grup | X̄ = **8.66**, SD = **5.94** | — | bilgi | V |

## TR (test-tekrar test) endeksi — kitap s.59-60

| Kalem | Kaynak | Kod | Sonuç | Doğrulama |
|---|---|---|---|---|
| Madde çifti sayısı | **16** | 16 | ✅ MATCH | O |
| Çift listesi | Tablo 6 (s.60) | `TR_PAIRS` | ✅ **16/16 birebir** | O (tablo) |
| Bulunduğu ölçekler | 6, 7, 8 ve 0 alt testleri | — | bilgi | V |
| Kesme puanı | **≥ 3 → geçersizlik riski** | **düzeltildi** → `score <= 2` tutarlı | ✅ FIXED (CHANGE-007) | V |

## Dikkatsizlik alt testi — kitap s.61

| Kalem | Kaynak | Kod | Sonuç | Doğrulama |
|---|---|---|---|---|
| Çift sayısı | **12** | 12 | ✅ MATCH | O (tablo) |
| Çift listesi + yönü | Tablo 7 | `CARELESS_PAIRS` | ✅ **12/12 + yön birebir** | O (tablo) |
| Kesme puanı | kaynakta **bulunamadı** (yalnızca "4 ve üzeri" kodda) | `score < 4` | ⚠️ UNVERIFIED | — |


---

# PHASE 4 — Geçerlik Konfigürasyonları batch 2 (kitap s.43-47)

| # | Kaynak koşul | Kod | Sonuç | Doğrulama |
|---|---|---|---|---|
| 1 | L,K 50-60 ∧ F > 70 | `reverse-v` birebir | ✅ MATCH | V (önceki oturum) |
| 2 | L,K **≥ 60** ∧ F **≈50** | `v-shape`: L≥60 ∧ K≥60 ∧ F≤55 | L,K ✅ · F ⚠️ alt sınır yok | V |
| 3 | L,K **> 60** ∧ F **< 50** | `closed-v` birebir | ✅ MATCH | O |
| 4 | L **=40** ∧ F **45-55** ∧ K **=60** (L<F<K) | `ascending`: L<F<K ∧ L≤45 ∧ K≥55 | sıra+L+K ✅ · F aralığı ⚠️ yok | **V** (K=60 dikişte kesikti, görsel doğrulandı) |
| 5 | L **=60** ∧ F **≈50** ∧ K **40-45** (L>F>K) | `descending`: L>F>K ∧ L≥55 ∧ K≤45 | sıra+L ✅ · F ve K alt sınırı ⚠️ | O |

**Desen:** Kaynak çoğu konfigürasyonda **nokta değer** verir (40, 60, 50); kod
bu noktaların çevresine **±5 tolerans** koyar ve kaynak değeri daima bandın
içinde kalır → EXTRA (kabul edilebilir, DECISION-018 emsali).
Ancak kaynak **açık aralık** verdiğinde (F 45-55; K 40-45) kod aralığı
**tek yönlü** uygular → CONFLICT-016 (P1, OPEN).

Bölüm girişi kuralı (s.43): "? alt testi standart profil kağıdına işaret
edilmez" → geçerlik konfigürasyonları yalnızca L, F, K üzerinden kurulur
(kod da yalnızca L, F, K kullanır → ✅ uyumlu).

K düzeltmesi ek bilgi (s.46): klinik ölçeğe **5-10 T puanı** eklenir (Greene
1980); K, F'ten **20 ya da daha çok** T puanı yüksekse …


---

# PHASE 4 — Geçerlik Konfigürasyonları batch 3 (kitap s.48-55) — **TÜM 15 KONFİGÜRASYON TAMAM**

| # | Kaynak koşul | Kod | Sonuç | Doğrulama |
|---|---|---|---|---|
| 6 | L,K **=55**; F **>105** | `random`: F>105 ∧ L,K 50-60 | ✅ MATCH (nokta ±5) | **V** |
| 7 | L,K **≤35**; F **>120** | `all-true`: F>120 ∧ L,K≤35 | L,K ✅ (düzeltildi) · F **ulaşılamaz** → CONFLICT-019 | **V** |
| 8 | L,F,K **>80** | `all-false`: hepsi ≥75 | ⚠️ kaynak içi tutarsızlık → REJECTED (DECISION-020) | **V** |
| 9 | L,K **<66**; F **≈100 ya da altı** | `help-seeking`: L,K<66 ∧ F 70-100 | ✅ üst sınır düzeltildi · alt sınır kaynakta yok | **V** |
| 10 | L**<66** ∧ F**>69** ∧ K**>65** | `unconventional` birebir | ✅ MATCH | **V** |
| 11 | L**<55**; F**≈64**; K**<45** | `frank`: L<55 ∧ K<45 ∧ F 60-70 | ✅ MATCH (64 bantta) | **V** |
| 12 | L**≈50**; F**<70**; K**>50** | `credible`: L 45-55 ∧ F<70 ∧ K>50 ∧ K≤65 | ✅ MATCH · K≤65 kaynakta yok | **V** |
| 13 | L**>50**; F**≈K** ve **>55** | `acute-chronic`: L>50 ∧ F,K>55 ∧ |F−K|≤6 | ✅ birebir MATCH | **V** |

**Bölüm 4 tamamlandı: 15/15 konfigürasyon kaynakla karşılaştırıldı.**

## Ampirik profil testleri (bu oturumda koşuldu)

| Yanıt örüntüsü | L T | F T | K T | Tespit edilen konfigürasyon |
|---|---|---|---|---|
| Tümüne **"Yanlış"** | 81.2 (ham 15) | **75.3** (ham 20) | 82.3 (ham 29) | "Tümüne yanlış" ✅ |
| Tümüne **"Doğru"** | 26.5 (ham 0) | **120.0** (ham 44, üst sınır) | 22.1 (ham 1) | **YOK** ❌ (CONFLICT-019) |

Not: T puanları **[20, 120]** aralığına kırpılır (`mmpiScoring.ts`), bu yüzden
kaynağın "F > 120" koşulu matematiksel olarak sağlanamaz.

---

# PHASE 4 kapanışı — Dikkatsizlik endeksi (s.62, p39 L) → **KAPANDI**

| Kaynak (s.62, görsel doğrulandı) | Kod | Sonuç |
|---|---|---|
| **12 çift** görgül yolla seçilmiş, zıt içerikli madde | `CARELESS_PAIRS` = 12 çift (7 same + 5 different) | ✅ **MATCH** |
| En yüksek puan **12** | 12 çift × 1 puan | ✅ **MATCH** |
| Kesim puanı **4** (Greene 1980) | `normal = score < 4` (≥ 4 → uyarı) | ✅ **MATCH** |

→ Önceki `UNVERIFIED-TR-001` **kapandı**. Tablo 7 karşılaştırması (12/12 çift
birebir) bu sayfadaki "12 çift / max 12 / kesim 4" ifadeleriyle birlikte
**tam doğrulandı**.


---

# CONFLICT-019/020 düzeltmeleri — doğrulanan davranış (2026-09-21)

| Profil (L, F, K) | Önce | Sonra | Kaynak dayanağı |
|---|---|---|---|
| 26.5, **120**, 22.1 (tümüne "Doğru") | `YOK` | **Tümüne "Doğru"** | Konf. 7 (s.49), SOURCE-CONFIG-007 |
| 50, 65, **70** | `YOK` | **Güvenilir Cevaplayıcı** | Konf. 12 (s.54), SOURCE-CONFIG-012 |
| 81.2, 75.3, 82.3 (tümüne "Yanlış") | Tümüne "Yanlış" | değişmedi | Konf. 8 (s.50) |
| 62, 62, 45 | "Çok Kapalı" | değişmedi | Konf. 3 (s.45) |
| 62, 62, 52 | "V Şekli" | değişmedi | Konf. 2 (s.44) |
| 55, 80, 55 | Tersine V | değişmedi | Konf. 1 (s.43) |

---

# PHASE 8 — Wiggins içerik skalaları (kitap s.178-181) → **NORMLAR DOĞRULANDI**

## WIGGINS_NORMS ↔ Tablo 20 (Normal Grup, n=1000) — **26/26 MATCH**

| Skala | Kaynak M | Kod M | Kaynak SD | Kod SD | Sonuç |
|---|---|---|---|---|---|
| SOC | 10.52 | 10.52 | 4.36 | 4.36 | ✅ |
| DEP_W | 11.75 | 11.75 | 5.13 | 5.13 | ✅ |
| FEM | 14.77 | 14.77 | 3.87 | 3.87 | ✅ |
| MOR | 8.97 | 8.97 | 4.28 | 4.28 | ✅ |
| REL | 7.37 | 7.37 | 4.87 | 4.87 | ✅ |
| AUT | 11.04 | 11.04 | 3.36 | 3.36 | ✅ |
| PSY | 14.80 | 14.8 | 7.04 | 7.04 | ✅ |
| ORG | 10.40 | 10.4 | 5.31 | 5.31 | ✅ |
| FAM | 5.31 | 5.31 | 3.44 | 3.44 | ✅ |
| HOS | 11.35 | 11.35 | 3.67 | 3.67 | ✅ |
| PHO | 11.37 | 11.37 | 4.52 | 4.52 | ✅ |
| HYP | 13.32 | 13.32 | 3.90 | 3.9 | ✅ |
| HEA | 7.71 | 7.71 | 4.19 | 4.19 | ✅ |

## Madde sayıları ↔ kaynak metni — **12/13 match**

SOC hariç tüm skalalar kaynak metnindeki madde sayılarıyla birebir uyuşuyor
(SOC → kaynak içi tutarsızlık, DECISION-024). Madde **listeleri** Ek 9c
karşılaştırmasında **46/46 MATCH**.

## Kapatılan kısıt

`AUDIT_STATE` kısıtı "**`WIGGINS_NORMS` (13 ölçek) için hiç kaynak kanıtı yok**"
→ **KAPANDI** (DECISION-025). PHASE 8'in norm katmanı tamamlandı.

---

# PHASE 2/5 — Ek 1: MMPI madde metinleri (kitap s.215-233)

**Yöntem:** OCR yalnız numara konumu için; **metin 300-350 dpi görselden
okundu** (konum tabanlı kırpma aracı: `scripts/mmpi-audit/verify-items.py`).

## Doğrulanan yapı

| Bulgu | Sonuç |
|---|---|
| Madde numaralandırması | **1 → 566 kesintisiz** (boşluk/kopya yok) |
| Ek 1 başlangıç | s.215 — "Ek 1: MMPI Test Kitabı" + test yönergesi |
| Ek 1 bitiş | s.233 — madde 566 |
| Yönerge | D/Y işaretleme; **boş bırakma** (`?`) kuralı kaynakta açık |
| Kaynakta kritik madde listesi | **YOK** (Ek 1 metin, Ek 9 anahtar, Ek 10 norm) |

## Görsel doğrulanan kritik madde metinleri (39 kayıt / 38 madde)

Tam liste: `SOURCE_FACTS.md` → `SOURCE-ITEM-003`.
- **24 kayıt** kaynak metniyle **tutarlı** ✓
- **14 kayıt** kaynak metniyle **uyuşmuyor** → CONFLICT-023 (P2, OPEN)

Kanıt dosyaları: `.audit/items/gl2_1.png`, `gl2_2.png`, `gl2_3.png`,
`gl3.png` (20/37/74/133), `gl4.png` (85), `.audit/pages/v_item66*.png`,
`v_item139.png`, `v_item337.png`.

## Kritik madde olmayan ama doğrulanan metinler (örnekler)

| # | Metin (görsel) |
|---|---|
| 17 | Babam iyi bir adamdır |
| 19 | Yeni bir işe girince kimin gözüne girme gerektiğini öğrenmek isterim |
| 22 | Arasıra kontrol edemediğim gülme ve ağlama nöbetlerine tutulurum |
| 31 | Sık sık geceleri kabus geçiririm |
| 41 | Kendimi toparlayamadığım için günler, haftalar hatta aylarca hiçbir şeye el sürmediğim olur |
| 339 | Çoğu zaman ölmüş olmayı isterdim |

---

# PHASE 5 — Klinik ölçekler (kaynak tarafı doğrulaması)

## Hs (1) — Tablo 8, s.66 (görsel doğrulandı)

| Öğe | Kaynak | Kod | Sonuç |
|---|---|---|---|
| Doğru maddeler | 11 (23, 29, 43, 62, 72, 108, 114, 125, 161, 189, 273) | aynı 11 madde | ✅ **MATCH** |
| Yanlış maddeler | 22 (2, 3, 7, 9, 18, 51, 55, 63, 68, 103, 130, 153, 155, 163, 175, 188, 190, 192, 230, 243, 274, 281) | aynı 22 madde | ✅ **MATCH** |
| Toplam madde | **33** | 11 + 22 = 33 | ✅ **MATCH** |
| K düzeltmesi | "K Eklemmeli" | `K_ADDITION_TABLE` Hs oranı 0.5 | ✅ niteliksel MATCH (oran kaynakta yok → UNVERIFIED) |
| Erkek ortalaması | **13.19** (Savaşır 1981) | 13.19 | ✅ **MATCH** |
| Kadın ortalaması | **15.89** (Savaşır 1981) | 15.89 | ✅ **MATCH** |

Diğer klinik ölçeklerin madde anahtarları **Ek 9** (s.244-256) ile doğrulanmıştı
(46/46 MATCH, PHASE 2). Bölüm 5 ayrıca madde tablosu **içermez**
(`SOURCE-CL-005`) → klinik ölçek anahtar katmanı **kaynak tarafında kapandı**.

## Kod tipi yorum katmanı (Bölüm 5-6, s.63-170)

- Kod dosyası: `src/scoring/mmpiSourceCodes.ts` (kanonik ikili kodlar + yorum
  metni + olası tanılar + `seeAlso`).
- Örnek karşılaştırma `CODES['12']` (12/21) ↔ s.68: **birebir özet** ✓,
  kaynağın sayısal kuralı ("5 T puanı fark") korunmuş ✓.
- Kapsamlı karşılaştırma (tüm kodlar + üçlü/dörtlü kodlar) **PHASE 9/10**
  kapsamında sürüyor.


---

# PHASE 5/9 — D (2) alt testi anahtarı ve normu (kitap s.80)

## Tablo 9 — Depresyon (D) alt testi: **BİREBİR MATCH** ✅

| Katman | Kaynak | Kod | Sonuç |
|---|---|---|---|
| **Madde sayısı** | 60 (başlık) | 20 + 40 = **60** | ✅ |
| **Doğru maddeler** | 20 madde | 20 madde, aynı liste | ✅ **BİREBİR** |
| **Yanlış maddeler** | 40 madde | 40 madde, aynı liste | ✅ **BİREBİR** |
| **Norm (Erkek)** | 20.63 (Savaşır, 1981) | `20.63` | ✅ MATCH |
| **Norm (Kadın)** | 23.86 (Savaşır, 1981) | `23.86` | ✅ MATCH |

Doğru: `5, 13, 23, 32, 41, 43, 52, 67, 86, 104, 130, 138, 142, 158, 159, 182,
189, 193, 236, 259`
Yanlış: `2, 8, 9, 18, 30, 36, 39, 46, 51, 57, 58, 64, 80, 88, 89, 95, 98, 107,
122, 131, 145, 152, 153, 154, 155, 160, 178, 191, 207, 208, 233, 241, 242, 248,
263, 270, 271, 272, 285, 296`

**Doğrulama yöntemi:** OCR + 420 dpi görsel teyit + kod karşılaştırması
(`scripts/mmpi-audit/cmp-tablo9.ts`). OCR'ın "6" hatası görsel doğrulamayla
yakalandı (bkz. `OCR_ISSUES.md` DIGIT-6-9).

## D T-puan bantları (s.81-82)

| Kaynak bandı | Kod karşılığı | Sonuç |
|---|---|---|
| 85 ve üstü | `T ≥ 85` | ✅ |
| 79 ve üstü | `79-84` + `70-78` (sıralı çözüm) | ✅ |
| 70-79 | `70-78` | ✅ (kaynakta 79 iki bantta — kod tek anlamlı) |
| 60-69 | `60-69` | ✅ MATCH |
| 45-59 | `45-59` | ✅ MATCH |
| 28-44 | `28-44` (min 0) | ✅ MATCH (etiket) |


---

# PHASE 5/9 — Hy (3) alt testi anahtarı (kitap s.94)

## Tablo 10 — Histeri (Hy) alt testi: **BİREBİR MATCH** ✅

| Katman | Kaynak | Kod | Sonuç |
|---|---|---|---|
| **Madde sayısı** | 60 (başlık) | 13 + 47 = **60** | ✅ |
| **Doğru maddeler** | 13 madde | 13 madde, aynı liste | ✅ **BİREBİR** |
| **Yanlış maddeler** | 47 madde | 47 madde, aynı liste | ✅ **BİREBİR** |
| **Norm (Erkek)** | 19.31 (metin, Savaşır 1981) | `19.31` | ✅ MATCH |
| **Norm (Kadın)** | metin **22.33** ↔ Tablo 30 **18.12** | `18.12` | ⚠️ kaynak içi çelişki → CONFLICT-028 **REJECTED** (DECISION-028) |

Doğru: `10, 23, 32, 43, 44, 47, 76, 114, 179, 186, 189, 238, 253`
Yanlış: `2, 3, 6, 7, 8, 9, 12, 26, 30, 51, 55, 71, 89, 93, 103, 107, 109, 124,
128, 129, 136, 137, 141, 147, 153, 160, 162, 163, 170, 172, 174, 175, 180, 188,
190, 192, 201, 213, 230, 234, 243, 265, 267, 274, 279, 289, 292`

**Doğrulama yöntemi:** 400 dpi görsel okuma (OCR satır kayması nedeniyle **OCR
kullanılmadı**) + `scripts/mmpi-audit/cmp-tablo10.ts` → kaynak 60 = kod 60,
FAZLA 0, EKSİK 0.

**Doğrulanmış anahtar tablosu (P0 katmanı):** Tablo 8 (Hs) ✅ · Tablo 9 (D) ✅ ·
**Tablo 10 (Hy) ✅** · Ek 9 ile 46/46 ✅


---

# PHASE 9/10 batch 7 — D kod bloğu kapanışı (kitap s.88-92)

## Kodda VAR olan ve içeriği doğrulanan kod tipleri

| Kod | Kaynak | İçerik karşılaştırması | Sonuç |
|---|---|---|---|
| `29/92` | s.91-92 | 5 cümle = benmerkezci/narsisistik + yüksek enerji (kontrol kaybı telafisi) + **üç tip birey** (ajite depresyon / manik savunma / organik beyin sendromu) | ✅ **MATCH** (kaynağın "üçüncü en yüksek test 3 ya da 4" cümlesi eksik → CONFLICT-025) |
| `20/02` | s.92 | 6 cümle = sinirlilik/zayıflık/yorgunluk + kronik depresyon + ailevi/sosyal beceri + **"fiziksel olarak çekici olmadığını düşünür"** + uykusuzluk/suçluluk + **tanı: Pasif-agresif kişilik** | ✅ **MATCH** (kaynağın "üçüncü en yüksek test 7 ya da 4" cümlesi eksik → CONFLICT-025) |
| `28/82` | s.90-91 | anksiyete+ajitasyon şiddetli depresyon, tanı makinesi: manik depresif psikoz/melankoli/şizoaffektif, seeAlso 281/821·284/824·287/827 | ✅ **MATCH** |

## Metin kaynağı doğrulaması (kritik)

`codeInterpretation('274/724')` çağrısı `27/72` kaydını döndürür; **o kaydın 6
cümlesinin tamamı kaynağın s.88'deki `273/723` metniyle birebir aynıdır** →
kaynağın `27/72` **ana kod** metni (s.87) kodda yoktur → **CONFLICT-030**.


---

# PHASE 9/10 batch 8 — Hy (3) T bantları (kitap s.95) — **6/6 MATCH**

| Bant | Kaynak | Kod | Sonuç |
|---|---|---|---|
| 85 T ve üstü | "Aşırı immatür, benmerkezci ve bağımlı… bastırma savunması… içgörü eksikliği… ciddi rijidite" | `85–∞` | ✅ MATCH |
| 76-85 T | "konversif semptomlar; başağrısı, sırt ağrısı, göğüs ağrısı, güçsüzlük, baş dönmesi ve baygınlık" | `76–84` | ✅ MATCH (metin birebir) |
| 70-75 T | "bastırma ve inkâr… itaat eden (uyan)… ikincil kazanç… teşhirci ve seksüel" | `70–75` | ✅ MATCH |
| 60-69 T | "iki farklı örüntü" (Hs≈Hy ∧ D 10 T düşük · Hy, Hs'ten 10 T yüksek) | `60–69` | ✅ MATCH |
| 45-59 T | "Bu alana özgü bir tanımlama yoktur." | `45–59` | ✅ MATCH |
| 24-44 T | "sürekli eleştiri… olumlu ilişkileri inkâr… Si yükselme" | `0–44` | ✅ MATCH metin · etiket kodda "T 22-44" |

**"Sadece Hy alt testinin yükselmesi"** → kaynak kuralı ("Sadece 3'ün yüksek
olduğu ve diğer hiçbir alt testin **70 T puanının üstünde olmadığı** durumda")
↔ `SINGLE_HY.rule` → **birebir MATCH** ✅ · metin de MATCH ✅

## Hy bloğunda kodda VAR olan ve içeriği doğrulanan kod tipleri

| Kod | Kaynak | İçerik |
|---|---|---|
| `13/31` | s.96 (`31 Kodu`) | kaynak **"(Bakınız 13/31 Kodu)"** der → atıf doğru, kod D bloğundan hizmet ediyor ✅ |
| `34/43` | s.97-98 | "Her iki kod tipi de kızgın, immatür ve bencildir… kronik ve şiddetli öfke" → ✅ içerik MATCH |
| `36/63` | s.99-100 | "eleştiriye aşırı duyarlı, kuşkulu, gergin ve hatta şüpheci" → ✅ MATCH |
| `35/53` | s.99 | "erkekler pasif ve hatta geri çekilme eğiliminde… güçlü ilgi gereksinimleri" → ✅ MATCH |


---

# PHASE 9/10 batch 9 — Hy kod bloğu devamı (kitap s.100-101)

Kodun mevcut 5 kod tipinin içeriği kaynakla karşılaştırıldı (`cmp-hy-batch9.ts`):

| Kod | Kaynak | İçerik | Sonuç |
|---|---|---|---|
| `37/73` | s.100 | 8 cümle = gerginlik/anksiyete/uykusuzluk + düşük akademik başarı + çözümlenmemiş bağımlılık + tuhaf ve gariplik + yabancılaşma + psikotik epizodlar | ✅ **MATCH** (1, 2 ve 4 "üçüncü en yüksek test" cümlesi yok → CONFLICT-025/027) |
| `38/83` | s.101 | 8 cümle = ruhsal karmaşa + konsantrasyon + psikotik olabilir + düşünce bozukluğu değerlendirilmeli + enkoheran konuşma + **tanı: Şizofreni / histerik nevroz** | ✅ **MATCH** |
| `39/93` | s.101 | 5 cümle = girişken/dışadönük + **Si 40 T altı** yüzeysellik + sözel saldırganlık + baskıcı anne + çarpıntı/taşikardi/Gİ + semptomatik tedaviye yanıt | ✅ **MATCH** ("en sık üçlü kod tipi 394/934" cümlesi yok → CONFLICT-033/024) |
| `30/03` | s.101 | 3 cümle = nadir + pasif/bağımlı/geri çekilme + göreceli rahat + sosyal kaçınma | ✅ **MATCH** ("üçüncü en yüksek test 1 ve 2" yok) |

## NEVROTİK ÜÇLÜ PROFİLLERİ — kaynak koşulları (görsel doğrulandı)

| # | Konfigürasyon | Koşul | Doğrulama |
|---|---|---|---|
| 1 | Konversiyon vadisi | Hs ↑ ∧ Hy ↑ ∧ D ↓ | 140 dpi (s.103) |
| 2 | Basamak orantısı | üçü de **> 70 T** ∧ Hs > D > Hy | 300 dpi (s.104) |
| 3 | Şapka | **Hs < 70 T** ∧ D > 70 T ∧ Hy > 70 T (D en yüksek) | **340 dpi** (s.105) |
| 4 | Yükselen eğilim | üçü de **> 70 T** ∧ Hs < D < Hy | 300 dpi (s.106) |

→ Bu dört koşul **kodda yok** → CONFLICT-033 (P1).

---

# PHASE 9/10 batch 10 — Pd (4) anahtarı + bantları (kitap s.107-110)

## P0 KATMANI — Tablo 11 Pd anahtarı **BİREBİR MATCH** ✅

| | Kaynak (s.108, görsel) | Kod | Sonuç |
|---|---|---|---|
| Doğru | 24 madde | 24 madde | ✅ **fazla/eksik YOK** |
| Yanlış | 26 madde | 26 madde | ✅ **fazla/eksik YOK** |
| Toplam | **50** = kitabın "Madde Sayısı: 50" | 50 | ✅ |

Araç: `scripts/mmpi-audit/cmp-tablo11.ts` · Doğrulama: 400 dpi + **600 dpi dikiş
kadrajı** (spine tablonun 5. sütunundan geçiyor) · **Ek 9 ile çapraz kontrol** ✓

## Pd T-puan bantları **5/5 MATCH** ✅

| Bant | Kod | Sonuç |
|---|---|---|
| 80 T ve üstü | `80–∞` | ✅ metin birebir |
| 70-79 T | `70–79` | ✅ |
| 60-69 T | `60–69` | ✅ |
| 45-59 T | `45–59` | ✅ |
| 20-44 T | `0–44` | ✅ |


---

# PHASE 9/10 batch 14 — Mf (5) bloğu doğrulaması (kitap s.122-125)

| Katman | Kaynak | Kod | Sonuç |
|---|---|---|---|
| **Tablo 12 anahtarı (P0)** | Doğru **28** + Yanlış **32** = **60** | 28 + 32 = 60 | ✅ **BİREBİR MATCH** |
| (*) kadınlarda ters (5 madde: 69, 179, 231, 297, 133) | 5 madde | `female` listelerinde **5/5 ters** | ✅ **birebir** |
| Norm — erkek | 29.21 (Savaşır 1981) | 29.21 | ✅ MATCH |
| Norm — kadın | 32.98 (Savaşır 1981) | 32.98 | ✅ MATCH |
| **Mf T bantları — Erkek (5 bant)** | 80+/70-79/60-69/41-59/26-40 | `MF_MALE_T_BANDS` | ✅ **5/5 MATCH** |
| **Mf T bantları — Kadın (4 bant)** | >65/56-65/41-55/26-40 | `MF_FEMALE_T_BANDS` | ✅ **4/4 MATCH** |
| "Erkeklerde sadece Mf yükselmesi" metni | s.125 | `SINGLE_MF_MALE` | ✅ metin MATCH |
| **"sadece Mf" tespit eşiği** | **75 T ve üstü** | **≥ 70** | ❌ **FARK** → CONFLICT-027 (P1) |
| Mf kodları (7) | 51/15, 52/25, 53/35, 54/45, 56/65, **564/654**, 57/75 | 6 VAR / 1 YOK | ⚠️ `564/654` eksik |

**Kitabın kendi başlığı doğrulandı:** Tablo 12 "(Madde Sayısı: 60)" →
28 + 32 = **60** ✓ (kaynak içi tutarlılık, çapraz kontrol başarılı).

**Kanıt script'i:** `scripts/mmpi-audit/cmp-tablo12.ts` (kaynak listeleri gömülü,
yeniden koşulabilir).


---

# PHASE 9/10 batch 15 — Pa (6) anahtarı ve bantları (kitap s.127-130)

| Katman | Kaynak | Kod | Sonuç |
|---|---|---|---|
| **Tablo 13 anahtarı (P0)** | Doğru **25** + Yanlış **15** = **40** | 25 + 15 = 40 | ✅ **BİREBİR MATCH** |
| Norm — erkek | 11.12 (Savaşır 1981) | 11.12 | ✅ MATCH |
| Norm — kadın | 11.93 (Savaşır 1981) | 11.93 | ✅ MATCH |
| **Pa T bantları (5 bant)** | 80+/70-79/60-69/45-59/**27-44** | `PA_T_BANDS` | ✅ **5/5 MATCH** (metin + 55-59 alt notu dahil) |
| **Pa kontrol listeleri (4)** | yüksek (8) · orta-yüksek T:65-70 (6+) · düşük T:35-45 (18) · aşırı düşük T<35 (17) | **hiçbiri yok** | ❌ **MISSING** → CONFLICT-026 |
| Mf kodları II | `58/85`, `59/95`, `50/05` | **3/3 VAR** | ✅ MATCH |

**Kitabın kendi başlığı doğrulandı:** Tablo 13 "(Madde Sayısı: 40)" → 25 + 15 =
**40** ✓ (kaynak içi tutarlılık).

**Kanıt script'i:** `scripts/mmpi-audit/cmp-tablo13.ts`.

---

# PHASE 9/10 batch 18 — Pt kapanışı + Sc (8) girişi/anahtarı/bantları (kitap s.142-146)

| Katman | Kaynak | Kod | Sonuç |
|---|---|---|---|
| **Tablo 15 anahtarı (P0)** | s.144 — Doğru **59** + Yanlış **19** = **78** | `SCORING_KEYS.Sc` 59 + 19 = 78 | ✅ **BİREBİR MATCH** |
| Tablo 15 başlık sayımı | "(Madde Sayısı: **78**)" | 78 | ✅ kaynak içi tutarlılık |
| **K ekleme** | "K Eklemeli" | `K_CORRECTION.Sc = 1.0` | ✅ MATCH |
| Norm — erkek | 29.82 (Savaşır 1981, Tablo 15 dipnotu) | 29.82 (sd 9.05 ← Tablo 30) | ✅ MATCH |
| Norm — kadın | 31.06 | 31.06 (sd 8.2) | ✅ MATCH |
| **Sc T bantları (5 bant)** | 100+ / 75+ / 60-74 / 45-59 / 21-44 | `SC_T_BANDS` aynı sınırlar | ✅ **5/5 MATCH** |
| 100+ bandı "T>95" notu | s.145 | bant metninde mevcut | ✅ MATCH |
| 60-74 bandının 3 maddesi | s.145-146 | bant metninde (1)(2)(3) | ✅ MATCH |
| "Sadece Sc yükselmesi" | s.143-146 **YOK** | `SINGLE_*` setinde Sc yok | ✅ **uyumlu** (çelişki yok) |
| `794 Kodu` gövdesi | s.142 | — | ❌ YOK → CONFLICT-024/030 |
| `70/07` gövdesi | s.142 | `CODES['07']` | ✅ gövde VAR · 3 kesim eksik → CONFLICT-025 |
| Sc Graham listeleri (38 + 9) | s.143-145 | — | ❌ YOK → CONFLICT-026 |
| `86/68` gövdesi | s.146 | `68/86` içinde | ✅ VAR · "7 = 70 T" eşiği kayıp → CONFLICT-027 |
| `87/78` gövdesi | s.146 | — (Pt `78/87` metni dönüyor) | ❌ YOK → CONFLICT-031 |
| `8726/Yüksek 9` gövdesi | s.146 | — (`78/87`'ye kırpılıyor) | ❌ YOK → CONFLICT-030 |
| 5 çapraz ref (`81/18`…`85/58`) | s.146 | 5/5 çözülüyor | ✅ **uyumlu** ("Bakınız" — ayrı gövde yok) |

**Kitabın kendi başlığı doğrulandı:** Tablo 15 "(Madde Sayısı: 78)" → 59 + 19 =
**78** ✓ (kaynak içi tutarlılık; dikiş sütunları `156/251/320/354` bindirmeli iki
kırpımla teyit edildi — DECISION-003).

**Kanıt script'leri:** `scripts/mmpi-audit/cmp-sc-batch18.ts` · regresyon kilidi
`tests/mmpiKeyIntegrity.test.ts` (batch 18 blokları).

---

# PHASE 9/10 batch 19 — Sc bloğu kapanışı + Ma (9) Tablo 16 (kitap s.147-150)

| Katman | Kaynak | Kod | Sonuç |
|---|---|---|---|
| **Tablo 16 anahtarı (P0)** | s.150 — Doğru **35** + Yanlış **11** = **46** | `SCORING_KEYS.Ma` 35 + 11 = 46 | ✅ **BİREBİR MATCH** |
| Tablo 16 başlık sayımı | "(Madde Sayısı: **46**)" | 46 | ✅ kaynak içi tutarlılık |
| **K ekleme** | "(K Eklemeli)" | `K_CORRECTION.Ma = 0.2` | ✅ MATCH |
| Norm — erkek | 19.96 (Savaşır 1981, Tablo 16 dipnotu) | 19.96 (sd 4.4 ← Tablo 30) | ✅ MATCH |
| Norm — kadın | 19.72 | 19.72 (sd 4.36) | ✅ MATCH |
| **Sc bloğu kapsamı (s.143-148)** | 10 başlık | `CODES` | **8 VAR / 2 YOK** → CONFLICT-024/030/031 |
| `89/98` gövdesi + Olası Tanı | s.147-148 | `CODES['89']` + `diagnosis` | ✅ sadık (8/10 parça) · eksik: yaş 27 + üçüncü yükselen |
| `80/08` gövdesi + Olası Tanı | s.148 | `CODES['08']` + `diagnosis` | ✅ sadık (7/8 parça) · eksik: ilk cümle |
| **Şekil 22 Paranoid Vadi** | s.147 (Pa↑ Pt↓ Sc↑) | — | ❌ YOK → CONFLICT-033 (+1) |
| Ma Graham listeleri | 42 satır yüksek + düşük puan listesi | — | ❌ YOK → CONFLICT-026 |

**Kod değişikliği: YOK.** Batch 18'deki CHANGE-013 (Sc 21-44 "konformaldir")
kaldığı yerden geçerli; Tablo 16 ve norm çifti zaten doğruydu.

**Kanıt script'leri:** `scripts/mmpi-audit/cmp-ma-batch19.ts` ·
görsel kadrajlar `tbl16_L`/`tbl16_R` (430 dpi bindirmeli), `b19_ma89_age.png`,
`b19_ma8008.png` (300 dpi) · OCR sayım kanıtı `OCR_ISSUES.md` TABLO-NUMBERS.

---

## PHASE 9/10 batch 20 — Ma bant/kod bloğu + 🎯 Tablo 17 (Si anahtarı) (kitap s.151-156)

| Alan | Kaynak | Kod | Durum |
|---|---|---|---|
| **🎯 Tablo 17 — Si anahtarı (s.156)** | Doğru **34** + Yanlış **36** = **70** | `SCORING_KEYS.Si` | ✅ **BİREBİR MATCH** (500 dpi bindirmeli kadraj) |
| Yırtık hattındaki sütun | `124·304·427` / `119·309·451` | — | ✅ kesişimde iki kez okundu |
| Si normu (Kadın) | 29.88 (Tablo 17 dipnotu) | `TURKISH_NORMS.Kadın.Si.mean` | ✅ MATCH |
| Si normu (Erkek) | **dipnot 26.86 ↔ Tablo 30 (s.195) 23.86** | `23.86` | ✅ kod Tablo 30'u izler → **CONFLICT-040 REJECTED** |
| Si norm SD | 7.97 / 7.52 (Tablo 30) | aynı | ✅ MATCH |
| K ekleme | Tablo 17'de "(K Eklemeli)" **yok** | `K_CORRECTION`'da `Si` yok | ✅ tutarlı |
| **Ma T bantları (s.151-152)** | 5 bant (85+ / 70-84 / 60-69 / 45-59 / 21-44) | `MA_T_BANDS` | ✅ **23/23 kaynak parçası mevcut** |
| "60- 75 T" etiketi (s.151) | kaynak hatası (70-84 ile çakışır) | ayrı bant yok; metin 60-69'da | ✅ içerik korundu (çelişki değil) |
| `90/09` gövdesi (s.153) | 5 cümle | `CODES['09']` | ✅ **5/5 sadık** |
| `91/19` gövdesi (s.153) | 5 cümle ("Ender görülmektedir…") | `CODES['19']` = **s.77 Hs metni** | ❌ YOK → **CONFLICT-036 vaka 2** |
| `Yüksek 9/Yüksek K` + `Yüksek 9/Düşük K` (s.152-153) | 2 örüntü + 4 sayısal koşul | — | ❌ YOK → **CONFLICT-039** · 027 (40→44) |
| 7 `Bakınız` çapraz ref (s.153) | hedefler diğer bloklarda | `CODES['29','39','49','59','69','79','89']` | ✅ UYUMLU |
| "Eyleme vuruk davranış ile ilgilidir" (s.153) | `94/49` notu | — | ❌ YOK → CONFLICT-025 (+1) |
| s.152 "ilişki" paragrafı | 5 cümle | — | ❌ YOK → CONFLICT-025 (+5) |
| Si Graham listeleri (s.155-156) | 20 + 14 satır | — | ❌ YOK → CONFLICT-026 (+2) |
| **s.154** | **BOŞ SAYFA** (PDF p85 L; koyu piksel %4.2) | — | ✅ sayfa eşleme teyidi |

**Kod değişikliği: YOK.** **🎯 PHASE 5 KAYNAK TARAFI KAPANDI — Tablo 8-17'nin
tamamı birebir doğrulandı** (Hs 33 · D 60 · Hy 60 · Pd 50 · Mf 60 · Pa 40 · Pt 48 ·
Sc 78 · Ma 46 · **Si 70** = 10 klinik anahtar).

**Kanıt script'leri:** `scripts/mmpi-audit/cmp-ma-si-batch20.ts` · kadrajlar
`b20_t17_L/R` (500 dpi), `b20_t17_norm2` (560 dpi), `b20_tablo30_R` (250 dpi),
`b20_s151_top`/`b20_s151_bands`/`b20_ma_bands2`/`b20_s152_kkodu`/`b20_s153_codes`
· OCR sayım kanıtı `OCR_ISSUES.md` (TABLO-NUMBERS 2. ölçüm, ASCII-FOLD, BLANK-PAGE).

## Batch 21 — Si (0) kapanışı (kitap s.157-158) · 2026-09-22

| Alan | Kaynak | Kod | Sonuç |
|---|---|---|---|
| Si T bandı sayısı/etiketleri | s.157: `70 T puanı ve üstü` · `60-69 T` · `45-59 T` · `25-44 T` | `SI_T_BANDS` `T ≥ 70` · `T 60-69` · `T 45-59` · `T 25-44` (min 70/60/45/0) | ✅ **4/4 + eşikler birebir** |
| `60-69` bandı metni | "Bu kendini ortaya koymak istemeyen… Çekingen, utangaç kişilerdir." | aynı | ✅ **birebir** |
| `45-59` bandı metni | "Sosyal ilişki kurmada başarılı olan bireylere işaret etmektedir." | aynı | ✅ **birebir** |
| `25-44` bandı metni | 4 cümle (iyimser/manipülatif… dürtü kontrol… yalnız kalamayan… onaylanma gereksinimi) | 4/4 | ✅ **birebir** |
| `70+` bandı metni | 4 cümle | **2/4** | ⚠️ **eksik**: "Nevrotik üçlüde yükselme görülebilir" + "(Ayrıca bakınız, 2, 7 ve 8 alt testlerinin yükselmesi.)" → 025/033 |
| Bakınız hedefleri | `01/10`…`09/90` (9 çift) | `10/01`,`20/02`,`30/03`,`40/04`,`50/05`,`60/06`,`70/07`,`80/08`,`90/09` | ✅ **9/9 mevcut, etiket birebir** |
| `049 Kodu` gövdesi | "Psikiyatrik olgularda eyleme vurukluğun bastırılması" | **YOK** (`'049'` → `40/04` metni) | ❌ 024 YOK + **030 somut vaka** |
| `027(8) Kodu` gövdesi | "Bireyde güçlü ruminatif davranışlar görülebilir." | **YOK** (`'027(8)'` → `20/02` metni) | ❌ 024 YOK + **030 somut vaka** |
| s.157 giriş paragrafı | 3 cümle (20 puan farkı / Si+4+9 / 2-7+8) | **0/3** | ⚠️ 025 +3 · 027 +1 · 033 +2 |
| s.158 | **BOŞ SAYFA** | — | ✅ kayıt (`BLANK-PAGE` 2. ölçüm: %0.62 vs %4.36) |

**PHASE 9/10 KAYNAK SETİ: s.63-157 TAMAMI OKUNDU** (Bölüm 5 kapandı) · **Kod
değişikliği YOK** · `mmpiKeyIntegrity` **56/56 PASS** · `npm test` **343/343 PASS**.
→ **GÜNCEL (CHANGE-014, 2026-09-22):** DECISION-029 (A) onayı ile `src/` değişti ·
`mmpiKeyIntegrity` **63/63** · `npm test` **359/359 PASS** (34 suite)
→ **GÜNCEL (batch 22, 2026-09-22):** BÖLÜM 6 kaynak taraması bitti (s.159-169, s.170 boş) ·
`mmpiInterpretation` **44/44** · `npm test` **365/365 PASS** (35 suite) · `src/` değişmedi ·
eşik farkları **CONFLICT-041/042** olarak kayıtlı, düzeltme **DECISION-030** onayını bekliyor. · tsc **0** ·
build PASS (`optik-form.html` senkron).

→ **GÜNCEL (batch 23 / CHANGE-015, 2026-09-22):** DECISION-030 (A) onayı ile `src/`
değişti — BÖLÜM 6 eşikleri koda alındı (`conversion-v` 70/10 · `psychotic-v` 80/80/70) +
6 desen + `negatif-egim` (`manual`) + `MMPI_PATTERN_CAVEATS` arayüzde.
`mmpiInterpretation` **47/47** · `npm test` **368/368 PASS** (35 suite) · tsc **0** ·
build **PASS** (`optik-form.html` senkron) · kapanış kanıtı
`scripts/mmpi-audit/cmp-b6-batch23.ts` → **0 FARK** (sayı üretim denetimi dâhil).
→ **GÜNCEL (batch 24 / CHANGE-016, 2026-09-22):** BÖLÜM 5 gövdelerine dayanan dört desen
kartı kaynak atfı aldı (`cry-for-help` s.36 · `depressive-27` s.87+89 · `49` s.118-119 ·
`89` s.147-148); s.36’daki F-yükselme listesi `SOURCE-VALIDITY-F-006` olarak ilk kez yazıldı
(görsel okuma). **Eşik değişmedi** → CONFLICT-043 (P2, OPEN) + DECISION-032 adayı.
`mmpiInterpretation` **54/54** · `npm test` **375/375** (36 suite) · tsc **0** · build **PASS**
(`optik-form.html` senkron) · kapanış kanıtı `scripts/mmpi-audit/cmp-b6-batch24.ts` → **0 FARK**.

## Batch 25-33 — BÖLÜM 5 KOD GÖÇÜ VE KAPANIŞI (DECISION-031 / A) · 2026-09-22

| Blok | Kitap Sayfaları | Eklenen Kod Gövdesi | Eklenen Koşullu Kural | Mutabakat Scripti | Sonuç |
|---|---|---|---|---|---|
| **Hs (1)** | s.67-78 | 20 kod (`Hs:123` … `Hs:1469`) | 10 kural (17 koşul) | `cmp-hs-batch25.ts` | ✅ 0 FARK |
| **D (2)** | s.81-92 | 14 kod (`D:213` … `D:207`) | 11 kural (16 koşul) | `cmp-d-batch26.ts` | ✅ 0 FARK |
| **Hy (3)** | s.95-103 | 6 kod (`Hy:3_highK` … `Hy:346`) | 10 kural (18 koşul) | `cmp-hy-batch27.ts` | ✅ 0 FARK |
| **Pd (4)** | s.107-121 | 13 kod + 18 alias (`Pd:4_low5` … `Pd:498`) | 10 kural (18 koşul) | `cmp-pd-batch28.ts` | ✅ 0 FARK |
| **Mf (5)** | s.121-126 | Doğrulandı (`564/654` inline örnek, ayrı gövde yok) | — | s.125-126 görsel inceleme | ✅ Doğrulandı |
| **Pa (6)** | s.127-135 | 6 kod + 16 alias (`Pa:678` … `Pa:456_scarlett`) | 7 kural (15 koşul) | `cmp-pa-batch29.ts` | ✅ 0 FARK |
| **Pt (7)** | s.137-142 | 7 kod + 16 alias (`Pt:47` … `Pt:794`) | 4 kural (10 koşul) | `cmp-pt-batch30.ts` | ✅ 0 FARK |
| **Sc (8)** | s.143-148 | 4 kod + 10 alias (`Sc:68` … `Sc:paranoid_valley`) | 6 kural (7 koşul) | `cmp-sc-batch31.ts` | ✅ 0 FARK |
| **Ma (9)** | s.149-153 | 2 kod + 3 alias (`Ma:9_highK`, `Ma:9_lowK`) | 3 kural (5 koşul) | `cmp-ma-batch32.ts` | ✅ 0 FARK |
| **Si (0)** | s.154-158 | 2 kod (`Si:049`, `Si:027`) + 6 alias | 2 kural (2 koşul) | `cmp-si-batch33.ts` | ✅ 0 FARK |
| **TOPLAM** | **s.63-158** | **74 yeni gövde / 151 blok anahtarı** | **73 kural seti / 123 koşul** | **9 batch (25-33)** | **0 FARK** |

**Bölüm 5 Kod Tipi Kapsamı:** 148 kaynak başlığın 148'i de eksiksiz kodda tanımlı ve çözümlenmektedir (148 VAR / 0 YOK). `cmp-*-batch*.ts` scriptlerinin tümü 0 FARK ile doğrulanmıştır.

