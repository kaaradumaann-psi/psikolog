# Source Facts

Kaynaktan doğrulanan bilimsel bilgiler. Her kayıt benzersiz bir ID taşır.
`OCR` alanı OCR çıktısını, `Visual` alanı görsel doğrulamayı gösterir.

Durum değerleri: `VERIFIED` · `OCR-UNCERTAIN` · `NEEDS_REVIEW`

---

## Sürüm ve yapı

### SOURCE-VERSION-001

Source: `docs/sources/mmpi-kitap.pdf`
Page: PDF p8 R (kitap s.1) — Bölüm 1 "Tanım"
OCR: "550 maddeden oluşan (kitap formunda 16 madde tekrarlanmaktadır, böylece 566 maddedir.)"
Visual: CONFIRMED
Fact: Kaynak **MMPI (orijinal), 566 maddelik kitap formu**dur. 550 madde + 16 tekrar.
Confidence: HIGH
Status: **VERIFIED**

### SOURCE-VERSION-002

Page: PDF p8 R (kitap s.1)
Fact: Dört geçerlik alt testi vardır: **(?)**, **L**, **F**, **K**.
On klinik alt test: 1 Hs, 2 D, 3 Hy, 4 Pd, 5 Mf (maskulinite-feminite),
6 Pa, 7 Pt, 8 Sc, 9 Ma, 0 Si (Sosyal içedönüklük, sonradan eklenmiştir).
Status: **VERIFIED**

---

## (?) "Bir şey diyemem" alt testi

### SOURCE-VALIDITY-CANNOTSAY-001

Page: PDF p23 L (kitap s.30) — **Tablo 2. Bir şey diyemem alt testi yorumu**
Fact (ham puan bantları):

| Ham puan | Düzey |
|---|---|
| 0 | 1. Düşük |
| 1-5 | 2. Normal |
| 6-30 | 3. Orta |
| 31 ve üstü | 4. Geçersiz |

Visual: CONFIRMED
Status: **VERIFIED**

### SOURCE-VALIDITY-CANNOTSAY-002

Page: PDF p22 R (kitap s.29)
OCR: "30 ya da daha fazla maddenin işaretlenmemesi durumunda profili bozulur."
Page: PDF p23 L (kitap s.30) Tablo 2, "Orta" satırı:
"Cevaplanmayan madde sayısı 30'a yakın bir sayıya ulaşınca geçerlik tehlikeye girer."
Fact: Kaynak **kendi içinde** iki ifade kullanır: prose "≥30 bozar", tablo "31+ geçersiz".
Projenin kodundaki kesme noktası `cannotSayInvalid = 31` **Tablo 2 ile uyuşur**.
Status: **VERIFIED** (kaynak içi nüans: `SOURCE-INTERNAL-001`)

### SOURCE-VALIDITY-CANNOTSAY-003

Page: PDF p10 L (kitap s.5)
OCR: "MMPI'da 10 ya da daha az maddenin boş bırakılması profilin geçerliliğini
etkilemez. 5-30 arasında maddenin boş bırakılması ise bu profilin 'tartışmalı'
olduğunun göstergesidir."
Status: **NEEDS_REVIEW** (metin OCR'dan; sayı aralığı "5-30" görsel doğrulanmadı)

---

## L alt testi (Yalan)

### SOURCE-VALIDITY-L-001

Page: PDF p23 R (kitap s.31) — **Tablo 3. L alt testi: Madde numaraları ve puanlama yönü (Madde Sayısı: 15)**
Fact: Tüm maddeler **Yanlış** yönünde puanlanır:
`15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 195, 225, 255, 285`
Visual: **CONFIRMED** (tablo birebir okundu)
Status: **VERIFIED**

### SOURCE-VALIDITY-L-002

Page: PDF p23 R (kitap s.31), tablo dipnotu
Fact: "Erkeklerde ortalama: 6.45, kadınlarda ortalama: 6.00 (Savaşır 1981)."
Visual: **CONFIRMED**
Status: **VERIFIED**

### SOURCE-VALIDITY-L-003

Page: PDF p24 R + p25 L (kitap s.33 + s.32/33 bağlantısı)
Fact (T puanı bantları, s.33):
- **69 T ve üstü** — puanlama hatası / patolojik yalan olasılığı
- **64-68 T** — inkâr, represif-savunucu tutum
- **59-63 T** — iyi görünme çabası, aşırı geleneksel
- **36-55 T** — özgün bir durum tanımlanmamış
- **35 ve altı T** — bağımsız, kendine güvenen; ya da patoloji gösterme çabası
Visual: CONFIRMED (ikinci okuma ile)
Status: **VERIFIED**

### SOURCE-VALIDITY-L-004

Page: PDF p24 L/R (kitap s.32-33)
Fact: L ile en yüksek iki alt test L ve Pa ise inkâr düşünülür; düşük SED'de L,
yüksek SED'de K yükselir. L yükseldikçe klinik testler düşer; L ile Hs, D, Hy, Pd
yükselir, Pa, Pt, Sc, Ma düşer. **Mf alt testi L'den etkilenmez.**
Status: **VERIFIED** (yorum içeriği; PHASE 9-10'da kullanılacak)

---

## F alt testi (Sıklık)

### SOURCE-VALIDITY-F-001

Page: PDF p25 L (kitap s.34) — **Tablo 4. F alt testi: Madde numaraları ve puanlama yönü (Madde Sayısı: 64)**
Fact:
- **Doğru (44 madde):** 14, 23, 27, 31, 34, 35, 40, 42, 48, 49, 50, 53, 56, 66,
  85, 121, 123, 139, 146, 151, 156, 168, 184, 197, 200, 202, 205, 206, 209, 210,
  211, 215, 218, 227, 245, 246, 247, 252, 256, 269, 275, 286, 291, 293
- **Yanlış (20 madde):** 17, 20, 54, 65, 75, 83, 112, 113, 115, 164, 169, 177,
  185, 196, 199, 220, 257, 258, 272, 276
Visual: **CONFIRMED** (bindirme payı ile yeniden kırpılarak doğrulandı; 169, 177,
197, 246, 53 maddeleri ilk kırpmada merkez dikişinde kaybolmuştu)
Status: **VERIFIED**

### SOURCE-VALIDITY-F-002

Page: PDF p25 L (kitap s.34), Tablo 4 dipnotu
Fact: "Erkeklerde ortalama: 8.30, kadınlarda ortalama: **10.11** (Savaşır, 1981)"
Visual: **CONFIRMED**
Status: **VERIFIED** → bkz. `CONFLICTS.md` CONFLICT-001

### SOURCE-VALIDITY-F-003

Page: PDF p25 L + p25 R (kitap s.34-35), Graham (1987) ham puan bantları
Fact:
- **26 ve üstü** ham puan — yüksek (rastgele/ tümü doğru yanıt, psikotik tablo)
- **16-25** ham puan
- **10-15** ham puan
- **3-9** ham puan — belirgin sorun alanlarına yanıt, yaşamın çoğu alanında işlevsel
- **0-2** ham puan — çoğu normal insan gibi yanıt
Status: **VERIFIED**

### SOURCE-VALIDITY-F-004

Page: PDF p25 R + p26 L (kitap s.35-36)
Fact: "Hathaway ve McKinley'e (1967) göre F alt testi ham puanı **20'yi aşarsa**
profil geçersizdir… **25 ham puanı aşarsa** testin geçersiz olması gerektiği
belirtilmiştir."
Status: **VERIFIED** (kaynak iki farklı eşik aktarır — kaynak içi nüans)

### SOURCE-VALIDITY-F-005

Page: PDF p26 R + p27 L (kitap s.37)
Fact (T puanı bantları):
- **80 T ve üstü** — dikkatli değerlendirme; 5 yükselme nedeni sıralanır
- **70-79 T** — ego işlev bozulması; psikoz/ciddi nevroz, antisosyal-asi, borderline
- **55-69 T** — üst sınırda negativist, değişken, huysuz; akut nevrozlar,
  kişilik bozuklukları, durumsal stres, savunucu psikotikler
- **44-54 T** — yalnızca belirgin maddelere yanıt; sahte iyilik; L ve K desteği
- **T < 45 (düşük)** — savunucu, "sahte iyilik"
Visual: CONFIRMED
Status: **VERIFIED**

### SOURCE-VALIDITY-F-006 · F alt testi yükselme nedenleri listesi (kitap s.36, PDF p26 L) — batch 24

**Bu turda açıldı:** `SOURCE_INDEX.md` s.36’yı “F yükselme nedenleri, araştırma özetleri · DONE”
diye işaretlemişti, **ancak listenin kendisi SOURCE_FACTS’a hiç yazılmamıştı** → desen kartı
`cry-for-help` (F ≥ 70 ∧ 2,7 > 6,8,9) kaynaksızdı. 4. madde bundan böyle kayıtta.

Okuma yöntemi: satır **başları** 150 dpi tam sayfa (`p026_L.png`), satır **sonları** 225 dpi
kadrajlarla (`.audit/pages/b24_s36_item4c.png`) — omuz boşluğu kadraja alındı; birleştirilen
satırlarda kesim noktaları “…” ile işaretlendi.

Bant başlığı — aynen (**Visual: CONFIRMED**):
> “**80 ve üstü T puanı:** F alt testi 90 T puanını aşarsa bu profil dikkatli değerlendirilmelidir.
> F alt testi yükselme nedenleri şunlar olabilir:”

Numaralı liste — aynen:
1. “İlişki kurmak istememe. Hepsi doğru ya da hepsi yanlış yanıt biçimi…”
2. “Görme ya da okuma güçlüğü nedeniyle anlamada sorun ya da psi… konfüzyon.”
3. “Sahte kötülük. Eğer hastanın kendini kötü göstermede kazançları varsa bu durum ortaya çıkmaktadır. Mahkumiyet, malulen emeklilik…gibi nedenlerle simülasyon yapma.”
4. “**Yardım çağrısı profili. 2 ve 7 testleri 6, 8 ve 9 testlerinden yüksektir.**”
5. “Eğer 1 ve 4 alt testleri dışlanırsa açık psikoz ya da ciddi psikopatoloji vardır. 6 ve 8 testleri yükselmiştir. Düşünce bozukluğuna ya da ilişkili semptomlara bakın.”

Kod: `src/scoring/mmpiInterpretation.ts` → `detectPatterns()` · `cry-for-help`
- **İlişki (2 ve 7 > 6, 8 ve 9):** 4. madde **birebir** karta taşındı (`source` + `quote`) ✅
- **Sayısal eşik:** kaynak bu maddede **hiçbir T eşiği vermiyor**; liste bant başlığı
  **“80 ve üstü T puanı”** altındadır (bkz. `SOURCE-VALIDITY-F-005`, s.37: “80 T ve üstü —
  dikkatli değerlendirme; **5 yükselme nedeni** sıralanır”). Kodun eşiği **`F ≥ 70`**
  → **bant farkı**; eşik **değiştirilmedi** (onaysız sayı değişikliği yasağı)
  → **CONFLICT-043 (P2, OPEN)** · **DECISION-032** adayı.
- 1., 2., 3. ve 5. maddeler kodda desen olarak **yok** (yalnız adı geçiyor) → bu turun
  kapsamı dışında; BÖLÜM 2 (geçerlik) tarafında ayrıca ele alınacak.

Status: **VERIFIED** (4. madde, görsel okumalı) · eşik/bant uyumsuzluğu **OPEN (CONFLICT-043)**

---

## K alt testi (Düzeltme)

### SOURCE-VALIDITY-K-001

Page: PDF p27 L (kitap s.38) — **Tablo 5. K alt testi: Madde numaraları ve puanlama yönü (Madde Sayısı: 30)**
Fact:
- **Doğru (1 madde):** 96
- **Yanlış (28 madde):** 30, 39, 71, 89, 124, 129, 134, 138, 142, 148, 170,
  171, 180, 183, 217, 234, 267, 272, 296, 316, 322, 374, 383, 397, 398, 406,
  461, 502
Visual: **CONFIRMED** (bindirmeli kırpma; 160, 217, 322, 383 ilk kırpmada dikişte kayboldu)
Status: **VERIFIED**

### SOURCE-VALIDITY-K-002

Page: PDF p27 L (kitap s.38), Tablo 5 dipnotu
Fact: "Erkeklerde ortalama: **13.90**, kadınlarda ortalama: **13.54** (Savaşır 1981)"
Visual: **CONFIRMED** (iki bağımsız okuma: OCR + yüksek DPI kırpma)
Status: **VERIFIED** → bkz. `CONFLICTS.md` CONFLICT-002

### SOURCE-VALIDITY-K-003

Page: PDF p28 L (kitap s.40)
Fact (T puanı bantları):
- **72 T ve üstü** — savunucu, içgörüsüz, tedaviye yanıt kötü
- **61-72 T** — bozukluğu en aza indirgeme, savunmalar artmış
- **46-60 T** — dengeli bireyler, ego gücü iyi
- **27-45 T** — düşük SED, zayıf kendilik değeri
Status: **VERIFIED** (bantlar; metin OCR'dan, PHASE 4'te görsel teyit edilecek)

### SOURCE-VALIDITY-K-004

Page: PDF p28 L (kitap s.40)
Fact: "K alt testi, **profili geçersiz yapacak belirgin değerlerin olmadığı tek
alt testtir.**" K–T puanı aralıkları eğitim, SED ve uygulama ortamına göre değişir.
Status: **VERIFIED**

---

## Bölüm 4 — Geçerlik konfigürasyonları (ön bulgu)

### SOURCE-VALIDITY-CONFIG-001

Page: PDF p29 R (kitap s.43) — Bölüm 4 başlığı ve Konfigürasyon 1
OCR:
"Geçerlik konfigürasyonları L, F ve K alt testleri içindir, **(?)** alt testi
standart profil kağıdına işaret edilmez."
"Konfigürasyon 1: L ve K alt testlerinin T değerinin **50-60** ve F alt
testinin T değerinin **70'in üzerinde** olduğu durumlar."
"Şekil 1. **Tersine V.**"
Visual: CONFIRMED (OCR metni başlık/şekil alt yazısı ile tutarlı)
Fact: Kitabın **Konfigürasyon 1 = Tersine V**'dir ve ölçütü kodun
`VALIDITY_CONFIGS[0]` (id: `reverse-v`) kuralıyla **birebir** aynıdır:
`L 50-60 ∧ K 50-60 ∧ F > 70`.
Status: **VERIFIED (kural)** — metin karşılaştırması PHASE 4'te tamamlanacak

Etki:
`src/scoring/mmpiValidityConfigs.ts` kaynağının **Bölüm 4 (kitap s.43-56)**
olduğu doğrulandı. Konfigürasyon sırası ve adları bu bölümle eşleştirilecek.

---

## Altyapı / kaynak içi notlar

### SOURCE-INTERNAL-001

Konu: (?) kesme noktası çelişkisi (s.29 prose "≥30" ↔ Tablo 2 "31+").
Çözüm: Tablo 2 yapılandırılmış veri kabul edilir; çelişki kayıt altına alındı.
Status: OPEN (kayıt amaçlı; kod değişikliği önermez, kod zaten Tablo 2'yi izliyor)

### SOURCE-STRUCT-001

Page: PDF p3 R – p6 R (İçindekiler)
Fact: Bölüm haritası ve sayfa numaraları çıkarıldı → `SOURCE_INDEX.md`.
Status: **VERIFIED**

---

# Ek 9 — Madde Numaraları ve Puanlama Yönü (kitap s.244-256)

Karşılaştırma: `scripts/mmpi-audit/compare-keys.py` · Sonuç **41 MATCH / 5 DIFF**
Doğrulama kodu: `V` = görsel doğrulandı · `O` = OCR doğrulandı (görsel bekliyor)

## SOURCE-KEY-L-001 · L alt testi (Madde sayısı: 15)

Page: PDF p130 L = kitap s.244
Doğru: YOK · Yanlış: `15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 195, 225, 255, 285`
Kod: **MATCH** · Doğrulama: **V**
Status: **VERIFIED**

## SOURCE-KEY-F-001 · F alt testi (Madde sayısı: 64)

Page: kitap s.244
Doğru (44): `14, 23, 27, 31, 34, 35, 40, 42, 48, 49, 50, 53, 56, 66, 85, 121, 123, 139, 146, 151, 156, 168, 184, 197, 200, 202, 205, 206, 209, 210, 211, 215, 218, 227, 245, 246, 247, 252, 256, 269, 275, 286, 291, 293`
Yanlış (20): `17, 20, 54, 65, 75, 83, 112, 113, 115, 164, 169, 177, 185, 196, 199, 220, 257, 258, 272, 276`
Kod: **DIFF** (69↔169) → `CONFLICT-008` · Doğrulama: **V**
Status: **VERIFIED**

## SOURCE-KEY-K-001 · K alt testi (Madde sayısı: 30)

Page: kitap s.244
Doğru (1): `96` · Yanlış (29): `30, 39, 71, 89, 124, 129, 134, 138, 142, 148, 160, 170, 171, 180, 183, 217, 234, 267, 272, 296, 316, 322, 374, 383, 397, 398, 406, 461, 502`
Kod: **MATCH** · Doğrulama: **V**
Status: **VERIFIED**

## SOURCE-KEY-HS-001 · Hs alt testi (Madde sayısı: 33)

Page: kitap s.244 · Kod: **MATCH** · Doğrulama: **O**
Status: OCR-CONFIRMED (görsel bekliyor)

## SOURCE-KEY-D-001 · D alt testi (Madde sayısı: 60)

Page: kitap s.245 · Kod: **MATCH** · Doğrulama: **O**
Not: Başlıkta "Madde sayısı: 60" yazar; kod anahtarı 20+40=60 ✔
Status: OCR-CONFIRMED

## SOURCE-KEY-HY-001 · Hy alt testi (Madde sayısı: 60)

Page: kitap s.245 · Kod: **MATCH** · Doğrulama: **O**
Status: OCR-CONFIRMED

## SOURCE-KEY-PD-001 · Pd alt testi (Madde sayısı: 50)

Page: kitap s.245 · Kod: **MATCH** · Doğrulama: **O**
Status: OCR-CONFIRMED

## SOURCE-KEY-MF-001 · Mf alt testi (Madde sayısı: 60) — CİNSİYETE ÖZEL

Page: kitap s.245
Doğru (erkek anahtarı): `4, 25, 69, 70, 74, 77, 78, 87, 92, 126, 132, 134, 140, 149, 179, 187, 203, 204, 217, 226, 231, 239, 261, 278, 282, 295, 297, 299`
Yanlış (erkek anahtarı): `1, 19, 26, 28, 79, 80, 81, 89, 99, 112, 115, 116, 117, 120, 133, 144, 176, 198, 213, 214, 219, 221, 223, 229, 249, 254, 260, 262, 264, 280, 283, 300`
**Kaynak dipnotu:** `(*) işareti sorular kadınlarda ters yönde puan almaktadır.`
Glifli maddeler (kaynakta `*` ile işaretli): **69, 179, 231, 297, 133**
→ Kadın anahtarı = erkek anahtarının bu 5 maddede ters çevrilmiş hâli.
Kod (`SCORING_KEYS.Mf.male/female`): **MATCH** (5 maddenin tamamı doğru çevrilmiş)
Doğrulama: **V**
Status: **VERIFIED**

## SOURCE-KEY-PA-001 · Pa alt testi (Madde sayısı: 40)

Page: kitap s.246 · Kod: **MATCH** · Doğrulama: **O**
Status: OCR-CONFIRMED

## SOURCE-KEY-PT-001 · Pt alt testi (Madde sayısı: 48)

Page: kitap s.246 · Kod: **MATCH** · Doğrulama: **O**
Status: OCR-CONFIRMED

## SOURCE-KEY-SC-001 · Sc alt testi (Madde sayısı: 78)

Page: kitap s.246 · Kod: **MATCH** · Doğrulama: **O**
Not: Kaynak DOĞRU sütunu yalnızca **59** madde listeler, ancak başlık "78" der.
Kod anahtarı da 59 Doğru + 19 Yanlış = 78. Kaynak metnindeki "78" başlığı ile
sütun toplamı arasında **kaynak içi tutarsızlık** olabilir → kayıt amaçlı not:
scoring sonucu etkilenmez (iki taraf da 59+19).
Status: OCR-CONFIRMED + kaynak içi not

## SOURCE-KEY-MA-001 · Ma alt testi (Madde sayısı: 46)

Page: kitap s.247 · Kod: **MATCH** · Doğrulama: **O**
Status: OCR-CONFIRMED

## SOURCE-KEY-SI-001 · Si alt testi (Madde sayısı: 70)

Page: kitap s.247 · Kod: **MATCH** · Doğrulama: **O**
Status: OCR-CONFIRMED

## SOURCE-KEY-PD-SCALES · Kişilik Bozuklukları Testi (kitap s.248-250)

| Ölçek | Kaynak madde sayısı | Kod | Sonuç |
|---|---|---|---|
| PAR Paranoid | 22 | 22 | MATCH (O) |
| SZD Şizoid | 22 | 22 | MATCH (O) |
| STY Şizotipal | 36 | 36 | MATCH (O) |
| ANT Antisosyal | 25 | 25 | MATCH (O) |
| BDL Borderline | 22 | 22 | MATCH (V) |
| **HST Histrionik** | **20** | **13** | **DIFF** → CONFLICT-012 |
| NAR Narsisistik | 31 | 31 | MATCH (V) |
| **AVD Çekingen** | **38** | **25** | **DIFF** → CONFLICT-011 |
| DEP Bağımlı | 20 | 20 | MATCH (V) |
| CPS Obsesif-Kompulsif | 15 (Doğru; Yanlış=YOK) | 15 | MATCH (O) |
| PAG Pasif-Agresif | 14 (Doğru; Yanlış=YOK) | 14 | MATCH (O) |

## SOURCE-KEY-ADDICTION · Alkol ölçekleri (kitap s.251)

- **MAC MacAndrew** — tablo 51 madde listeler. **Kaynak dipnotu:** "iki madde
  doğrudan alkolle ilişkili olduğundan (#215 ve #460) çıkarılmıştır, madde
  sayısı **49** olarak kullanılmaktadır."
  Kod (49 madde, 215 ve 460 hariç): **MATCH** — kitabın kendi kuralına uygun ✔
  Doğrulama: **V** · Status: **VERIFIED**
- **ICAS Kronik alkolizm** (Madde sayısı: 8) — Kod: **MATCH** · Doğrulama: **O**

## SOURCE-KEY-WIGGINS · Wiggins içerik skalaları (kitap s.252-255)

| Ölçek | Kaynak | Kod | Sonuç |
|---|---|---|---|
| SOC Sosyal Uyumsuzluk | 27 | 27 | MATCH (O) |
| DEP_W Depresyon | 33 | 33 | MATCH (O) |
| **FEM Kadınsı İlgiler** | **30** | **30** | **DIFF** (126, 463 yön) → CONFLICT-010 |
| MOR Moral Bozukluğu | 23 | 23 | MATCH (O) |
| REL Dinsel Tutuculuk | 12 | 12 | MATCH (O) |
| AUT Otorite Çatışması | 20 | 20 | MATCH (O) |
| PSY Psikotizm | 48 | 48 | MATCH (O) |
| ORG Organik Semptomlar | 36 | 36 | MATCH (O) |
| FAM Aile Sorunları | 16 | 16 | MATCH (O) |
| HOS Dışa Vuran Düşmanlık | 27 (Yanlış=YOK) | 27 | MATCH (O) |
| PHO Fobiler | 27 | 27 | MATCH (O) |
| HYP Hipomani | 25 (Yanlış=YOK) | 25 | MATCH (O) |
| HEA Sağlıksızlık | 28 | 28 | MATCH (O) |

## SOURCE-KEY-SPECIAL · Özel ölçekler (kitap s.255-256)

| Ölçek | Kaynak | Kod | Sonuç |
|---|---|---|---|
| OH Aşırı Kontrol-Hostilite | 33 | 33 | MATCH (V) |
| **Es Ego Gücü** | **68** | **68** | **DIFF** (13 madde yön) → CONFLICT-009 |
| A Welsh Anksiyete | 39 | 39 | MATCH (O) |
| R Welsh Represyon | 40 (Yanlış=YOK) | 40 | MATCH (O) |
| Do Üstünlük | 28 | 28 | MATCH (O) |
| Dy Bağımlılık | 57 | 57 | MATCH (O) |

---

## SOURCE-INTERNAL-OH-001 · OH ölçeğinde kaynak içi tutarsızlık

Page: PDF p135 R = **kitap s.255**, "Aşırı Kontrol-Hostilite Testi (O-H) (Madde sayısı: 33)"
OCR + Visual: **CONFIRMED** (yüksek DPI kırpma, dikiş dahil)

Fact — tablonun gerçek içeriği:
- **Doğru (10):** 78, 91, 229, 319, 338, 373, 394, 425, 488, 559
- **Yanlış (21):** 1, 30, 81, 90, 102, 109, 129, 130, 141, 165, 181, 183,
  290, 329, 382, 396, 439, 446, 475, 501, 534
- **Toplam: 31 madde**

Sorun: **Başlık "33" der, tablo 31 madde listeler.** Kaynağın kendi içi tutarsızlığı.

Karar (`DECISION-012`): **Kod tabloyu izler (31 madde) ve doğrudur.**
Kod değişikliği **yoktur**. `tests/mmpiKeyIntegrity.test.ts` içinde
`EXPECTED_SPECIAL.OH = 31` olarak, kaynak çelişkisi yorumla birlikte kaydedilmiştir.

Status: **VERIFIED** (kaynak çelişkisi kayıt altında; kod tarafı MATCH)

---

# Bölüm 8 + Tablo 30 — TÜRK NORMLARI (kitap s.195)

## SOURCE-NORM-001 · Tablo 30 — Normal Türk, Erkek ve Kadınların MMPI Alt Testlerindeki Ortalama ve Standart Sapmaları

Page: **PDF p105 R = kitap s.195**
Visual: **CONFIRMED** — tam sayfa yüksek çözünürlüklü görsel okuma.
**OCR bu sayfayı BOŞ döndürdü** (p105_R.txt = 0 satır); yalnızca görsel
okuma ile elde edildi. Karşılaştırma betiği: `scripts/mmpi-audit/compare-norms.py`

### Örneklem (kitap s.191, Bölüm 8 "Standardizasyon çalışması")

- **Erkek N = 1003**, **Kadın N = 663**, toplam **1666** normal kişi
- 16-50 yaş, en az ilkokul eğitimi, psikiyatrik yardım almamış / başvurmamış
- Toplama yeri ağırlıklı Ankara (Hacettepe, DTCF, ODTÜ, Kız Teknik, Hemşire
  Yüksekokulu, GATA), ayrıca İzmir, Erzurum, Ordu, Bursa, Eskişehir
- %85 bekâr, %15 evli; örneklem 16-30 yaşta yoğunlaşmış; %84.88 büyük kent
- Eğitim: orta+lise %54.29, üniversite %47.21
  → **Not:** bu, "normal Türk toplumu" değil **genç + eğitimli + kentli** bir
  örneklemdir. Norm yorumunda bu sınır bilinmelidir.
- Kaynak kitap uyarısı (s.192): "31-50 yaş arasının sayı açısından **yetersiz
  temsil edildiği** düşünülmektedir."

### Tablo 30 değerleri (K düzeltmesi UYGULANMIŞ satırlar)

| Alt test | Erkek X̄ | Erkek SD | Kadın X̄ | Kadın SD |
|---|---|---|---|---|
| L | 6.45 | 2.74 | 6.00 | 2.25 |
| F | 8.30 | 4.62 | 9.38 | 5.16 |
| K | 13.98 | 4.65 | 11.82 | 3.80 |
| Hs (+.5K) | 13.19 | 4.07 | 15.89 | 4.88 |
| D | 20.63 | 4.76 | 23.86 | 5.08 |
| Hy | 19.31 | 4.71 | 18.12 | 5.31 |
| Pd (+.4K) | 22.22 | 4.45 | 22.84 | 4.51 |
| Mf | 29.21 | 3.82 | 32.98 | 3.67 |
| Pa | 11.12 | 4.03 | 11.93 | 4.17 |
| Pt (+1K) | 27.90 | 6.30 | 29.20 | 6.59 |
| Sc (+1K) | 29.82 | 9.05 | 31.06 | 8.20 |
| Ma (+.2K) | 19.96 | 4.40 | 19.72 | 4.36 |
| Si | 23.86 | 7.97 | 29.88 | 7.52 |

**Kritik:** Tablo, K düzeltmesi **uygulanmış ve uygulanmamış** satırları AYRI
AYRI verir. Kod, T dönüşümünden önce K düzeltmesini uygulandığı için
(`mmpiScoring.ts` → `computeT`) doğru satırlar **K eklenmiş** olanlardır.
Bu, kodun `K_CORRECTION` tasarımını **doğrular**.

### K düzeltmesi UYGULANMAMIŞ ham satırlar (kayıt amaçlı; kod kullanmaz)

| Alt test | Erkek X̄ | Erkek SD | Kadın X̄ | Kadın SD |
|---|---|---|---|---|
| Hs | 6.20 | 4.65 | 9.98 | 5.31 |
| Pd | 16.62 | 4.87 | 22.33 | 4.82 |
| Pt | 13.91 | 8.88 | 19.08 | 8.30 |
| Sc | 13.83 | 11.75 | 19.24 | 10.03 |
| Ma | 17.16 | 4.83 | 17.35 | 4.62 |

### Kaynak içi tutarsızlık (kayıt)

Tablo 30 başlığı "Normal Türk, Erkek ve Kadınlar…" der; **Kadın N sütununun K
satırında 963** yazar (diğer tüm kadın satırları 663, metin de 663 der).
Metin (s.191) açıkça **663 kadın** der → **tablodaki 963 bir dizgi hatasıdır.**
Kod bu değeri zaten kullanmaz (N norm hesabında yer almaz).

Status: **VERIFIED**

### Türetilen bulgu — kaynak iki yerde çelişiyor

Aynı kitap, F ve K normlarını **iki farklı yerde tutarsız** verir:

| Değer | Geçerlik bölümü (s.34 / s.38) | Standardizasyon Tablo 30 (s.195) |
|---|---|---|
| F kadın X̄ | **10.11** | **9.38** |
| K erkek X̄ | **13.90** | **13.98** |
| K kadın X̄ | **13.54** | **11.82** |

Kod **Tablo 30'u izler** ve doğrudur → `CONFLICT-001` ve `CONFLICT-002`
**REJECTED**.

---

# Bölüm 4 — Geçerlik Konfigürasyonları / F-K Endeksi (kitap s.56-59)

## SOURCE-FK-001 · F-K Endeksi — kesim puanı 9 (Gough)

Page: **PDF p37 L = kitap s.58** ("F-K Endeksi" bölümü) — sayfa numarası 58 doğrulandı
**Visual: CONFIRMED** (yüksek DPI kırpma; metin dikişe kadar uzandığı için
bindirmeli kırpma kullanıldı)

Fact — aynen:
> "F-K Endeksi diğer bir geçerlik belirleyicisidir. K puanının F puanından
> çıkarılması ile elde edilmektedir. İlk yapılan çalışmalarda kesim puanı olarak
> **11** alınmış, bu kesim puanı normallerin **%1'inde**, psikiyatrik grubun
> **%2.5'unda** görülmüştür (Gough 1947, 1951). Daha sonra kesim puanı **9'a
> düşürülmüştür**. **F-K puanı 0-9 arasında ise profil geçerlidir, 9'dan büyükse
> sahte-kötülük, 0 ise sahte-iyiliktir.** Klinik olgularda F-K endeksinin 9'dan
> büyük olduğu durumlarda birey psikopatolojisini inkâr etmektedir (Wetzel,
> Marlowe 1990)."

Yapısal sonuç:
- Kesim puanı **9** (tarihsel: 11 → 9'a düşürülmüş)
- `0 ≤ F-K ≤ 9` → geçerli
- `F-K > 9` → **sahte-kötülük** (abartma)
- `F-K = 0` → **sahte-iyilik** ← dikkat: kaynak 0'ı sahte-iyilik olarak tanımlar
- Klinik olgular X̄ = **8.66 / SD = 5.94** (psikiyatrik hastalar)

Kod karşılığı (`mmpiConsistency.ts` → `fkIndexAnalysis`):
- `value > 9` → "Sahte-Kötülük (Faking Bad) Eğilimi" ✅ **MATCH**
- `0 < value ≤ 9` → "Normal / Geçerli" ✅ **MATCH**
- `value = 0` → kod "Hafif Savunuculuk (Geçerli)" der; kaynak "sahte-iyilik" der
  → **kaynak içi nüans** (aşağıda SOURCE-FK-002)

Status: **VERIFIED**

## SOURCE-FK-002 · F-K = 0 durumu — kaynak içi gerilim

Page: kitap s.58
Fact: Kaynak "F-K puanı 0-9 arasında ise profil geçerlidir" **ve** "0 ise
sahte-iyiliktir" ifadelerini birlikte kullanır. Yani 0 hem geçerli aralığın
sınırı hem de sahte-iyilik göstergesidir → **kaynak içi gerilim**.

Ek bağlam (aynı sayfa): Yüksek K + düşük F bileşimi ("sorunlarımla başa
çıkabilirim" + "stresim yok") genellikle F-K endeksi tarafından **sahte-iyilik**
olarak değerlendirilir; bu yüzden MMPI alan normal bireyler yanlış biçimde
sahte-iyilik grubuna girebilir.

Kod davranışı: `value = 0` → "Hafif Savunuculuk (Geçerli)", `tone: 'ok'`,
`isWarning: false`. Negatif değerler ise `value >= -8` → "Hafif Negatif (Geçerli)",
`value < -8` → "Sahte-İyilik (Faking Good) Eğilimi".

Değerlendirme: Kod, 0 için geçerli aralığı koruyup **uyarı vermez**; kaynak ise
0'ı sahte-iyilik olarak işaretler. Negatif bölgede kod eşiği **-8**'dir; kaynak
sayısal bir negatif eşik vermez.

Status: **NEEDS_REVIEW** → CONFLICT-013 (P2; yorum etkisi düşük)

## SOURCE-FK-003 · K+ profili — Mark & Seeman (1963) tanımı

Page: **PDF p36 R = kitap s.57** ("K+ profilleri" bölümü)
Visual: CONFIRMED

Fact — aynen:
> "Bazen bir profilde tek anlamlı yükselme K alt testinde gözlenir. Bu profilde
> hiçbir klinik test 70 T puanının üstünde değildir. (6 ya da daha çok klinik
> test 60 T puanı ya da altındadır.) K+ profilinde K ve L alt testleri F'den
> yüksektir ve K alt testi, F alt testinin **en az 5 T puanı** üstündedir.
> Mark ve Seeman (1963) bu tür profilleri K+ profili olarak adlandırmaktadır.
> Özellikleri: Bu kişiler utangaç, kaygılı ve ketlenmişlerdir. Ayrıca
> sorunlarının psikolojik olabileceği konusunda dirençlidirler. Yakın kişiler
> arası ilişkilerden kaçınırlar ve pasif direnç gösterirler. Kişilik özellikleri
> **sizoid** yapıdadır."

Ölçütler (kod karşılaştırması için):
1. Hiçbir klinik ölçek T ≥ 70
2. En az 6 klinik ölçek T ≤ 60
3. K ve L > F
4. **K − F ≥ 5 T puanı**
5. Şekil 16 ile gösterilir

Status: **VERIFIED**

## SOURCE-CONFIG-014 · Konfigürasyon 14 — Erdemli Görünme İsteği

Page: **PDF p36 L = kitap s.56**
Fact: "Konfigürasyon 14: L alt testi **55 T puanının üstünde**, F alt testi
**60 T puanının altında**, K alt testi **59-64 T puanı arasındadır**."
"Bu profil geçerlidir. Geçerlik konfigürasyonu bireyin kendisini çok erdemli
biri olarak gösterme isteğini ve kendisini de böyle görmek istediğini
göstermektedir."
Ek uyarı: "Eğer F ve K alt testleri 70 T puanının üstündeyse, bireyde hastalığa
içgörü yoktur ve prognoz kötüdür."

Kod karşılığı: `VALIDITY_CONFIGS` id `virtuous`:
`L > 55 ∧ F < 60 ∧ 59 ≤ K ≤ 64` → **birebir MATCH** ✅

Status: **VERIFIED**

## SOURCE-CONFIG-015 · Konfigürasyon 15 — Katı / Karmaşıklık Örüntüsü

Page: **PDF p36 R = kitap s.57**
Fact: "Konfigürasyon 15: L alt testi **60 T puanının üstünde**, F alt testi
**70 T puanının üstünde** ve K alt testi **40 T puanının altındadır**."
"F'nin yüksekliği bu kişinin karmaşıklık yaşadığını gösterir. L'deki ortalama
yüksek puan, bireyin dünyayı basit, siyah ve beyaz olarak gördüğünün
göstergesidir. Düşük K, bireyin benlik değerinin düşüklüğüne, başa çıkma
kaynaklarının azlığına ve duygusal alanda katı olduğuna işaret etmektedir.
Ancak L'nin yüksekliği bireyin katı bir biçimde geleneksel değerlere
tutunduğunu gösterir."

Kod karşılığı: `VALIDITY_CONFIGS` id `rigid`:
`55 ≤ L ≤ 65 ∧ F > 70 ∧ K < 40`

Comparison: **CONFLICT** (kaynak içi çelişki):
- Kaynakta 15. konfigürasyon için **iki farklı kural** var:
  - **Başlık (s.58):** `L > 60 ∧ F > 70 ∧ K < 40`
  - **Şekil 15 (s.58, p36 R/s.57 çizimi):** `L > 55 ∧ F > 70 ∧ K < 40`
- Kod **55-65** aralığını kullanır: ne başlıkla (60) ne şekille (55) birebir
  örtüşür; üst sınır (65) kaynakta **hiçbir yerde yoktur**.

Status: **CONFIRMED** → CONFLICT-014 (P1)

## SOURCE-FK-004 · F-K bant yorumları (8-11 ve 16 üstü)

Page: **PDF p37 R = kitap s.59** — **Visual: CONFIRMED** (çalışma başlığı ve
sayfa numarası 59 görsel olarak doğrulandı)

Fact — aynen:
> "Psikiyatrik grupta sahte-kötülük profilleri, sahte-iyilikten daha iyi ayırt
> edicidir. […] Özetle F-K endeksinin yararlılığı konusunda henüz kesinleşmiş
> bir bulgu yoktur.
> **Eğer F-K endeksi 8-11 arasında ise** konfigürasyon, bireyin sorunları
> olduğunu gösterse de bu kişiler sorunlarını abartmaktadırlar. Bu durum
> hastanın psikolojik müdahaleye ve yardım almaya açık olduğunu göstermektedir.
> **F-K endeksi 16'nın üstünde ise:** […] Yapılan standart değerlendirme hastanın
> durumunu yansıtmayabilir. […] - Hasta akut bir psikotik bozukluk
> göstermektedir […] - Birey bilinçli olarak durumunu abartmakta ya da bir yarar
> sağlamak için simülasyon yapmaktadır."

Bant tablosu (kaynak):
| F-K | Kaynak yorumu |
|---|---|
| 0-9 | profil **geçerlidir** (9'dan büyükse sahte-kötülük) |
| 8-11 | bireyin sorunları var **ama abartmaktadır**; yardıma açık |
| > 9 | sahte-kötülük |
| > 16 | kritik; standart değerlendirme yansıtmayabilir (psikoz / simülasyon) |
| 0 | sahte-iyilik |

Kod karşılığı: kod 8-9'u "Normal/Geçerli" bandında, 10-11'i "Sahte-Kötülük"
bandında ele alır ve **her iki dalda da** 8-11 abartma notunu ekler
(`value >= 8` / `value >= 10 && value <= 11`) → 8-11 aralığı tam kapsanır ✅
`value > 16` → "Kritik Derecede Yüksek Abartma" ✅
Status: **VERIFIED** — MATCH

---

# PHASE 4 — TR (Test-Tekrar Test) Endeksi ve Dikkatsizlik Alt Testi

## SOURCE-TR-001 · TR endeksi — 16 tekrarlanmış madde çifti (Tablo 6)

Page: **PDF p38 L = kitap s.60** — başlık: "Tablo 6. MMPI kitap formunda aynı
olan maddeler" (iki sütunlu tablo: Madde No | Cümleler | Madde No | Cümleler)
Kaynak ifadesi (p37 R = s.59):
> "MMPI'n[in] grup kitapçığında yer alır. **Toplam sayısı 16 olan ve 6, 7, 8 ve 0
> alt testlerinde yer alan tekrarlanmış maddeler** test tekrar test (TR)
> endeksini oluşturmaktadır."

Tablo 6'dan çıkarılan 16 çift (kaynak sırası):
(8,318) (13,290) (15,314) (16,315) (20,310) (21,308) (22,326) (23,288)
(24,333) (32,328) (33,323) (35,331) (37,302) (38,311) (305,366) (317,362)

Kod karşılığı: `src/scoring/mmpiConsistency.ts` → `TR_PAIRS` (16 çift)
Comparison: **birebir MATCH** (16/16 çift, hem üye hem sıra aynı) ✅
Status: **VERIFIED**

## SOURCE-TR-002 · TR endeksi kesme puanı — **3 puan ya da daha fazla**

Page: **PDF p37 R = kitap s.59** — **Visual: CONFIRMED** (yüksek DPI kırpma,
cümle okunur halde)
Fact — aynen:
> "TR endeksi üzerinde **3 puan ya da daha fazla bir puanın, geçersiz profil
> olasılığını arttırdığı** ileri sürülmüştür (Dahlstrom 1972)."

Yani kaynak: **TR ≥ 3 → geçersiz profil olasılığı artar** (kesme 3'te başlar).

Kod karşılığı:
```ts
const consistent = score <= 3;   // 3 DAHİL tutarlı sayılıyor
```
Kod: TR ≤ 3 → "Tutarlı Yanıt Örüntüsü", uyarı yok; TR ≥ 4 → tutarsız.
Comparison: **CONFLICT** — kaynak ≥ 3'te geçersizlik riskini başlatır, kod
3'ü hâlâ tutarlı sayar → **1 puan kayması**.
Status: **VERIFIED** → CONFLICT-015 (P1)

## SOURCE-TR-003 · TR endeksi yorum bağlamı (Greene 1979)

Page: kitap s.59 (devamı s.60-61)
Fact: "Greene (1979) yaptığı bir araştırmada psikiyatrik hastalar, gözaltındaki
genç suçlular ve üniversite psikoloji öğrencilerine MMPI vermiş ve **gözaltındaki
gençlerin yanıtlarının, yüksekokul öğrencilerinden daha tutarsız** olduğunu
saptamıştır. Gözaltındaki gençlerin genellikle işbirliği içinde olmadıklarının
ve test almaya dirençlerinin göstergesidir."
Ek (s.60-61): "TR endeksi bazı durumlarda daha az puanlık […] sadece
dikkatsizlik nedeniyle ortaya çıktığını akılda tutmak gerekir. Üstelik TR
endeksi, sadece hastaların cevaplarının tutarlılığını tayin etse de, 'bütün
doğru' ya da 'bütün yanlış' cevap kurgularını göstermemektedir. […] F alt
testindeki yüksek puanlara karşın hastaların maddeleri tutarlı olarak doldurmuş
olduklarını TR endeksi gösterebilir."
Status: **VERIFIED** (yorum bağlamı; kod yorum metinleriyle uyumlu)

## SOURCE-CL-001 · Dikkatsizlik alt testi — 12 madde çifti ve puanlama yönü (Tablo 7)

Page: **PDF p38 R = kitap s.61** — başlık: "Tablo 7. Dikkatsizlik alt testi
madde sayıları ve puanlama yönü" (Madde No | Yanıt (Aynı/Farklı) | Madde Sayısı)

Tablo 7'den çıkarılan 12 çift:
| Çift | Yanıt | # |
|---|---|---|
| 10/405 | Aynı | 1 |
| 17/65 | Farklı | 2 |
| 18/63 | Farklı | 3 |
| 49/113 | Aynı | 4 |
| 76/107 | Aynı | 5 |
| 88/526 | Aynı | 6* |
| 137/216 | Aynı | 7 |
| 177/220 | Farklı | 8 |
| 178/342 | Aynı | 9 |
| 286/312 | Farklı | 10 |
| 329/425 | Aynı | 11 |
| 388/480 | Farklı | 12 |

\* sıra numarası OCR'da "9" olarak okundu; **sıra numarası anlamsal değil**
(numaralandırma hatası kitapta/OCR'da), çift listesi ve yönü kesin.
`OCR-UNCERTAIN`: yalnızca sıra numaraları (88/526 satırı) — madde çiftleri ve
Aynı/Farklı yönleri net.

Kod karşılığı: `mmpiConsistency.ts` → `CARELESS_PAIRS` (12 çift, `condition`
`same`/`different`)
Comparison: **birebir MATCH** (12/12 çift + 12/12 yön) ✅
Status: **VERIFIED**

---

# Bölüm 4 — Geçerlik Konfigürasyonları (kitap s.43-47) — batch 2

Bölüm girişi (s.43): "Geçerlik konfigürasyonları L, F ve K alt testleri içindir,
**? alt testi standart profil kağıdına işaret edilmez.**"

## SOURCE-CONFIG-001 · Konfigürasyon 1 — Tersine V (s.43, p29 R)

Fact — aynen:
> "Konfigürasyon 1: L ve K alt testlerinin T değerinin **50-60** ve F alt
> testinin T değerinin **70'in üzerinde** olduğu durumlar."
> Şekil 1. Tersine V.

Yorum: "Birey kişisel ve duygusal zorluklarını kabullenmekte ve yardım
istemektedir. […] F alt testi yükseldikçe, bireyin sorunlarını abartarak kısa
süre içinde yardım almak istediği ya da simülasyon yaptığı söylenebilir."

Kod: `VALIDITY_CONFIGS[0]` id `reverse-v`
`L 50-60 ∧ K 50-60 ∧ F > 70` → **birebir MATCH** ✅ (önceki oturumda da doğrulanmıştı)

## SOURCE-CONFIG-002 · Konfigürasyon 2 — Savunuculuk örüntüsü (s.44, p30 L)

Fact — aynen:
> "Konfigürasyon 2: L ve K alt testlerinin **en az 60 T düzeyinde** (70 T puanına
> bile yaklaşabilir), F alt testinin **50 T puanına yakın** olduğu durumlar."

Yorum: "Bu birey kabul edilmez duygularından, impulslarından […] kaçınmaya ya da
bunları inkâr etmeye çalışmaktadır. Birey kendini en iyi biçimde sunar. Dünyayı
uçlarda, iyi ve kötü olarak görür. […] savunuculuk, psikopatolojinin
inkârından şüphelenilmelidir."

Kod eşleşmesi: `v-shape` → `L ≥ 60 ∧ K ≥ 60 ∧ F ≤ 55`
- L: kaynak "en az 60" = **≥ 60** → ✅ MATCH
- K: aynı → ✅ MATCH
- F: kaynak "**50'ye yakın**" (niteliksel) ↔ kod **F ≤ 55, alt sınır YOK**
  → kod F = 0…55 aralığını kabul eder; kaynak "yakın" der → **belirsiz + alt
  sınır eksik** → CONFLICT-016

Status: L/K **VERIFIED**, F **NEEDS_REVIEW**

## SOURCE-CONFIG-003 · Konfigürasyon 3 — "V" / Çok Kapalı (s.45, p30 R)

Fact — aynen:
> "Konfigürasyon 3: Geçerlik Alt Testi 'V' (Çok Kapalı): Bu örüntüde, **F alt
> testi 50 T puanının altında, L ve K alt testi 60 T puanının üzerindedir.**"
> Şekil 3. Çok kapalı geçerlik konfigürasyonu.

Yorum: "L ve K alt testleri ne kadar çok yükselirse, bu kişi kendisini
olduğundan daha iyi gösterme çabası içindedir. […] Özellikle kendini iyi
göstermek isteyen, iş arayan ve diğer durumlardaki (gözaltındakiler gibi)
kişilerin çok sık verdiği bir konfigürasyon biçimidir."
Ek: "Bu inkâr tutumu klinik testler üzerinde azaltıcı etkiye sahiptir […]
Klinikte 'V geçerlik konfigürasyonunun etkisini karşılamak için klinik testleri
pratik olarak 5-[10 T puanı yükseltmek yardımcı olmaktadır.]"

Kod: `closed-v` → `L > 60 ∧ K > 60 ∧ F < 50` → **birebir MATCH** ✅

## SOURCE-CONFIG-004 · Konfigürasyon 4 — Yükselen Eğilim (s.46, p31 L)

Fact — aynen (görsel doğrulandı; sayı dikişte kesilmişti, yüksek DPI kırpma ile
netleştirildi → "K alt testi **60** T puanındadır"):
> "Konfigürasyon 4: L alt testi F'den, F alt testi de K'dan düşüktür. L alt
> testi **40 T puanında**, F alt testi **45-55 T**, K alt testi **60 T**
> puanındadır."
> Şekil 4. Yükselen eğilim.

Yorum: "Bu konfigürasyon sorunlarıyla baş edette çekük uygun kaynakları sahip ve
testi aldığı dönemde stres ya da gerilim yaşama […] normal kişilerin tipik
konfigürasyonu[dur]."

Kod: `ascending` → `L < F ∧ F < K ∧ L ≤ 45 ∧ K ≥ 55`
- Sıralama `L < F < K` → ✅ MATCH
- L = 40 (nokta) ↔ kod `L ≤ 45` → ±5 üst tolerans ✓ (kaynak değeri kapsanır)
- K = 60 (nokta) ↔ kod `K ≥ 55` → ±5 alt tolerans ✓ (kaynak değeri kapsanır)
- F = **45-55** (kaynak açık aralık verir) ↔ kodda **F için sınır YOK**
  (yalnızca sıralama) → **eksik** → CONFLICT-016

Status: sıralama + L + K **VERIFIED**, F aralığı **NEEDS_REVIEW**

Aynı sayfada K düzeltmesi bilgisi (PHASE 4 K correction):
> "[Klinik ölçeğe] 5-10 T puanı eklenebilir (Greene 1980). […] K alt testi, F alt
> testinden 20 ya da daha çok T puanı […]"

## SOURCE-CONFIG-005 · Konfigürasyon 5 — Azalan Eğilim (s.47, p31 R)

Fact — aynen:
> "Konfigürasyon 5: L alt testi F'den, F alt testi de K'dan büyüktür. L **60 T
> puanına**, F **yaklaşık 50 T puanına** yükselmiş, K alt testi **40-45 T puanı**
> arasındadır."
> Şekil 5. Azalan eğilim.

Yorum: "Bu kişiler, kendilerini iyi göstermeye çalışırlar, sorunlarını kabul
etmekten ya da kendileri ile uğraşılmasını istemekten hoşlanmazlar. Ancak bu
kişilerin iyi görünme çabaları etkisizdir ve nevrotik üçlü genellikle yükselir.
Erkeklerde Mf düşük olabilir. Eğitimi ve sosyo-ekonomik düzeyleri düşük
bireylerde daha çok görülür."

Kod: `descending` → `L > F ∧ F > K ∧ L ≥ 55 ∧ K ≤ 45`
- Sıralama `L > F > K` → ✅ MATCH
- L = 60 (nokta) ↔ kod `L ≥ 55` → ±5 alt tolerans ✓ (kaynak değeri kapsanır)
- F "yaklaşık 50" ↔ kodda F sınırı yok (yalnızca sıralama) → **belirsiz**
- K = **40-45 arası** (kaynak açık aralık) ↔ kod `K ≤ 45` → üst sınır ✓ ama
  **alt sınır yok** (K = 20 de kabul edilir) → **eksik** → CONFLICT-016

Status: sıralama + L **VERIFIED**, F ve K alt sınırı **NEEDS_REVIEW**

---

# Bölüm 4 — Geçerlik Konfigürasyonları (kitap s.48-55) — batch 3

## SOURCE-CONFIG-006 · Konfigürasyon 6 — Rastgele cevaplama (s.48, p32 L)

Fact — aynen (**Visual: CONFIRMED**):
> "Konfigürasyon 6: L ve K alt testleri **55 T**, F alt testi **105 T puanının
> üstündedir**." — Şekil 6. Rastgele cevaplama.
> "Profil, hastanın maddeleri rastgele cevaplamasından dolayı geçersizdir.
> Durum hastanın konfüzyonundan, öfkesinden, test durumuna karşı direncinden
> ya da zekâ faktöründen kaynaklanıyor olabilir. […] testi hastaya tekrar
> vermelidir."

Kod: `random` → `F > 105 ∧ L 50-60 ∧ K 50-60`
Karşılaştırma: F **birebir** ✓; L,K kaynakta **nokta (55)** ↔ kod ±5 bant → kaynak
değeri bandın merkezinde ✓ → **MATCH (toleranslı)**
Status: **VERIFIED**

## SOURCE-CONFIG-007 · Konfigürasyon 7 — Tümüne "doğru" (s.49, p32 R)

Fact — aynen (**Visual: CONFIRMED**):
> "Konfigürasyon 7: Tümünü doğru olarak işaretleme. L ve K alt testinin **35 T
> puanını aşmasını**, F alt testinin **120'nin üzerinde** yer almasını
> gerektirir. Ek olarak, klinik testlerden **Pd, Pa, Pt, Sc ve Ma 90 T puanının
> üzerinde** yer alır."
Ek liste: 1. Her soruyu 'doğru' olarak işaretleme · 2. "Yardım çağrısı" profili ·
3. Ergenlerde akut bir rahatsızlık yaşanması (özellikle erkek ergenler) ·
4. Yetişkinlerde çok dirençli olma · 5. Sahte-kötülük profili (F-K indeksi 11
puanı aşmaktadır).

Kod: `all-true` → `F > 120 ∧ L ≤ 35 ∧ K ≤ 35` (düzeltildi, CHANGE-008)
- L,K: kaynak "35'i aşmasın" = **≤ 35** → ✅ MATCH (eski kod 40 idi → düzeltildi)
- F: kaynak "**120'nin üzerinde**" = `> 120` → kod aynı **ama**
  **T puanı [20,120] aralığına kırpıldığı için ULAŞILAMAZ** → CONFLICT-019

Status: L,K **VERIFIED** · F koşulu **ULAŞILAMAZ (CONFLICT-019, P1, OPEN)**

## SOURCE-CONFIG-008 · Konfigürasyon 8 — Tümüne "yanlış" (s.50, p33 L)

Fact — aynen (**Visual: CONFIRMED**):
> "Konfigürasyon 8: Bireyin bütün soruları 'Yanlış' olarak işaretlemesidir.
> Şekil 8'de gösterildiği gibi **L, F ve K testlerinin tümü 80 T puanının
> üzerindedir**. Ek olarak **Hy, D, Hs ve Pd** alt testleri 80 T ve üstüne
> yükselmiştir."
> "Profil geçersizdir. Hasta tüm maddelere yanlış olarak cevap verme
> eğilimindedir. […] testi tekrar verebilir."

Kod: `all-false` → `L ≥ 75 ∧ F ≥ 75 ∧ K ≥ 75` (kaynak **> 80** der)
**KAYNAK İÇİ TUTARSIZLIK — ampirik kanıt:**
Kitabın kendi anahtarı + Tablo 30 normlarıyla, **tam "tümüne yanlış"** yanıt
veren bir kişi şu profili üretir:
`L: ham 15 → T 81.2` · `F: ham 20 → T **75.3**` · `K: ham 29 → T 82.3`
→ Kaynağın istediği **F > 80 koşulu bu formda ulaşılamaz**; ulaşan tek yol
"tümüne yanlış" yanıtı değildir. (Kaynak kendi kuralını kendi verisiyle
çürütüyor.)
Status: **REJECTED (kod doğru)** → CONFLICT-018 · DECISION-020

## SOURCE-CONFIG-009 · Konfigürasyon 9 — Yardım isteği (s.51, p33 R)

Fact — aynen (**Visual: CONFIRMED**):
> "Konfigürasyon 9: L ve K alt testleri **66 T puanının altında**, F alt testi
> ise **100 T puanına yakın ya da altındadır**."
> "Bu profil **geçerlidir**. Geçerlik konfigürasyonu hastanın dile getirmek
> istediği psikolojik sorunları olduğunu göstermektedir. Bu tür konfigürasyon
> veren hastalar karamsar, dik kafalı, huzursuz ve asi kişilerdir. Kendilerini
> aşırı eleştirirler, psikolojik sorunlarını kabul etmeye hazırdırlar. […]
> kolay incinebilirler."

Kod: `help-seeking` → `L < 66 ∧ K < 66 ∧ F 70-100` (üst sınır düzeltildi, CHANGE-008)
- L < 66 ✅ · K < 66 ✅
- F üst sınırı: kaynak "100'e yakın ya da altında" → **≤ 100** ✅ (eski kod 105)
- F **alt sınırı 70 kaynakta YOK** → kod ekliyor → `UNVERIFIED_DATA.md`
Status: **VERIFIED (üst sınır düzeltildi)** · alt sınır **UNVERIFIED**

## SOURCE-CONFIG-010 · Konfigürasyon 10 — Geleneksel olmayan örüntü (s.52, p34 L)

Fact — aynen (**Visual: CONFIRMED**):
> "Konfigürasyon 10: L alt testi **66 T puanının altında**, F alt testi **69 T
> puanının** ve K alt testi **65 T puanının üstündedir**."
> "Profil geçerli gibi görünse de geçerlik konfigürasyonu geleneksel olmayan bir
> cevap örüntüsünün varlığını göstermektedir. […] Patolojinin açık gösterimi ve
> savunucu kontrol arasındaki denge bu kişilerde durağan değildir ve
> yordanamaz."

Kod: `unconventional` → `L < 66 ∧ F > 69 ∧ K > 65` → **birebir MATCH** ✅
Status: **VERIFIED**

## SOURCE-CONFIG-011 · Konfigürasyon 11 — Açık ve tavizsiz (s.53, p34 R)

Fact — aynen (**Visual: CONFIRMED**):
> "Konfigürasyon 11: L alt testi **55 T puanının altında**, F alt testi **64 T
> puanına yakın**, K alt testi **45 T puanının altında**."
> "Bu profil geçerlidir. Benzer profil veren bireyler konuşma ve tavırlarında
> açıktırlar ve laflarını sakınmazlar. Ergen grubu dışında kalan bireylerde ego
> gücünde düşüklük ve yetersiz savunma mekanizmaları vardır. Eğer açık bir
> psikolojik bozukluk yoksa hastada nevrotik bir uyum olduğu görülmektedir."

Kod: `frank` → `L < 55 ∧ K < 45 ∧ F 60-70`
- L < 55 ✅ · K < 45 ✅
- F: kaynak **nokta 64** ("yakın") ↔ kod 60-70 bandı → 64 bandın içinde ✓
  (bant 64'ü kapsar; ancak bandın merkezi 65'tir, kaynak noktası 64)
Status: **VERIFIED** (F bandı tolerans olarak kabul)

## SOURCE-CONFIG-012 · Konfigürasyon 12 — Güvenilir cevaplayıcı (s.54, p35 L)

Fact — aynen (**Visual: CONFIRMED** — s.54 tam sayfa okundu; Şekil 12 çizgisi
L≈50 → F≈68 → K≈58, metinle tutarlı):
> "Konfigürasyon 12: L alt testi **50 T puanına yakın**, F alt testi **70 T
> puanının altında**, K alt testi **50 T puanının üstündedir**."
> "Bu geçerli bir profildir. Birey yönergeleri dikkatli bir biçimde okuyarak
> anlamış ve yapmıştır. Yanıtlar olduğu gibi doğrudur ve hastanın durumunu
> yansıtmaktadır."

Kod: `credible` → `L 45-55 ∧ F < 70 ∧ K > 50 ∧ K ≤ 65`
- L: kaynak nokta **50** ↔ kod 45-55 bandı ✓ (tolerans)
- F < 70 ✅ · K > 50 ✅
- **K ≤ 65 üst sınırı kaynakta YOK** (kaynak K için üst sınır koymaz → K=70 de
  config 12'dir) → `UNVERIFIED_DATA.md`
Status: **VERIFIED** · K üst sınırı **UNVERIFIED (fazladan sınır)**

## SOURCE-CONFIG-013 · Konfigürasyon 13 — Akut / süreğen (s.55, p35 R)

Fact — aynen (**Visual: CONFIRMED** — s.55 tam sayfa okundu; Şekil 13 çizgisi
L≈52, F ve K ≈58 düz seyir, "hemen hemen eşit" ile tutarlı):
> "Konfigürasyon 13: Bu konfigürasyonda L alt testi **50 T puanının üstünde**,
> F ve K alt testleri **hemen hemen eşittir ve 55 T puanının üstündedir**."
Ek liste: 1. Akut bozukluk · 2. Ciddi bozukluğu olmasına karşın oldukça
savunucu olan ancak yine de hasta görünen kişiler.
> "Bu örüntüdeki kişilerin başa çıkma yetenekleri iyidir. […] testi 70 T
> puanının üzerinde olsa bile bu bireyler, sadece şimdiki semptom ya da
> problemleri için yardım almak isterler ve tipik olarak durumsal stres
> azaldığında rahatlarlar."

Kod: `acute-chronic` → `L > 50 ∧ F > 55 ∧ K > 55 ∧ |F−K| ≤ 6`
- L > 50 ✅ · F,K > 55 ✅ · "hemen hemen eşit" ↔ |F−K| ≤ 6 (niceleme yok, makul
  eşitleme) ✓
Status: **VERIFIED (birebir)**

---

# Bölüm 4 kapanışı — Dikkatsizlik endeksi kesin sayıları (s.62, p39 L)

## SOURCE-CL-002 · Dikkatsizlik alt testi: 12 çift · max 12 · kesim 4

Fact — aynen (**Visual: CONFIRMED** — s.62 tam sayfa okundu):
> "Dikkatsizlik alt testi psikolojik olarak zıt içerikli olduğuna karar verilen,
> **12 çift görgül yolla seçilmiş maddeden oluşmaktadır**."
> "Test tekrar test göstergesinden daha duyarlı bir ayrım yapan bu alt test,
> saptırılmış test davranışının ortaya çıkarılmasını mümkün kılar. MMPI'yı
> düzgün bir şekilde cevaplandırmak istemeyen hastaları olduğu kadar,
> konfüzyonda-ki hastaları da ayırt etmektedir. […] Hastanın dikkatsizlik alt
> testinden alacağı **en yüksek puan 12'dir**. **Greene (1980) geçersiz
> profilleri belirlemede 4'ün kesim puanı olarak alınabileceğini
> belirtmiştir.**"

Kod karşılaştırması:
| Kaynak | Kod | Sonuç |
|---|---|---|
| 12 çift, zıt içerikli, görgül seçilmiş | `CARELESS_PAIRS` = **12 çift** (7 `same` + 5 `different`) | ✅ MATCH |
| En yüksek puan **12** | 12 çift × 1 puan = **12** | ✅ MATCH |
| Kesim puanı **4** (Greene 1980) | `const normal = score < 4;` → **≥4 uyarı** | ✅ MATCH |

Status: **VERIFIED** — `UNVERIFIED-TR-001` **KAPANDI** (kesim puanı 4 doğrulandı,
kaynak atfı Greene 1980).

## SOURCE-CL-003 · Bölüm 5 girişi — yorum katmanının kaynak temeli (s.63, p39 R)

Fact — aynen (**Visual: CONFIRMED**):
> "**BÖLÜM 5 — MİNNESOTA ÇOK YÖNLÜ KİŞİLİK ENVANTERİ KLİNİK TESTLERİN
> DEĞERLENDİRİLMESİ**"
> "Bu bölümde verilecek olan kod tipleri ve profil yorumlamaları klinik
> bilgilere dayanmaktadır. […] Kod yorumlamaları MMPI'da kullanılan **ikili
> kodların hepsini, üçlü ve dörtlü kodların çoğunluğunu** içermektedir."
> "**Kodların yorumlanması alt testlerin sayısal sıralamasına göre
> yapılmıştır.**"
> Temel kaynaklar: Archer 1987 · Butcher 1969, 1984, 1987 · Butcher & Graham
> 1990 · Ceyhun 1986 · Dahlstrom ve ark. 1972 · Erol 1982 · Friedman & Graham
> 1987 · Greene 1979 · Lachar 1974 · Levitt 1989 · Savaşır 1978, 1981 · Webb
> 1978
> "MMPI yorumları, ilkokul mezunu ortaokul düzeyinde eğitimi olan, zeka düzeyi
> normale yakın ve **genellikle yetişkinler için** yapılmıştır."
> "Bundan sonraki bölümde verilen kodlar aşağıdaki özellikler göz önünde
> tutularak değerlendirilmiştir. Bunlar; psikiyatrik grupta ortalama ve yüksek
> puanların yorumlanması ve **cinsiyet, yaş, eğitim, sosyo-ekonomik düzey** gibi
> değişkenlerin puanlara etkisidir."
> "MMPI değerlendirmesinde **düşük puanlar psikopatolojiyi değil, uyumu** …"
> (s.64'e taşar)

Kullanım: PHASE 5 (klinik testler / kod tipleri / yorum) için kaynak temeli ve
kapsam sözleşmesi (ikili kodların tamamı + üçlü/dörtlü kodların çoğunluğu).
Status: **VERIFIED** (bilgi kaydı)

---

# Bölüm 8 — Wiggins İçerik Skalaları (kitap s.178-181, PDF p97 L – p98 R)

## SOURCE-WIGGINS-001 · Tablo 20 — Türk örneklemi normları (s.179)

Fact — aynen (**Visual: CONFIRMED** — tablo deskew edilerek okundu, 450 dpi):

**Tablo 20. Türk örneklemi Wiggins içerik skalaları ortalama ve standard
sapmaları** (Hasta Grubu n=1000 · Normal Grup n=1000)

| Skala | Hasta X̄ | Hasta Sd | Normal X̄ | Normal Sd |
|---|---|---|---|---|
| SOC | 12.30 | 4.73 | 10.52 | 4.36 |
| DEP | 15.83 | 6.35 | 11.75 | 5.13 |
| FEM | 12.96 | 3.93 | 14.77 | 3.87 |
| MOR | 11.87 | 5.36 | 8.97 | 4.28 |
| REL | 6.52 | 3.22 | 7.37 | 4.87 |
| AUT | 10.70 | 3.58 | 11.04 | 3.36 |
| PSY | 17.76 | 9.22 | 14.80 | 7.04 |
| ORG | 14.42 | 6.65 | 10.40 | 5.31 |
| FAM | 6.04 | 3.70 | 5.31 | 3.44 |
| HOS | 12.70 | 4.29 | 11.35 | 3.67 |
| PHO | 12.12 | 5.47 | 11.37 | 4.52 |
| HYP | 14.65 | 4.42 | 13.32 | 3.90 |
| HEA | 10.48 | 4.77 | 7.71 | 4.19 |

Kod: `WIGGINS_NORMS` = **Normal Grup** değerleri →
**13/13 skala × 2 değer = 26/26 BİREBİR MATCH** ✅
Status: **VERIFIED** — bu, PHASE 8'in doğrulanmamış son norm katmanını kapatır.

**Okuma notu (yöntem):** Tarama ~2.87° dönük olduğu için sütunlar arasında
satır başına ~29 px dikey kayma oluşuyor; düz okuma sütun 3-4'ü ±1 satır
kaydırır. Tablo **deskew edilerek** okundu ve sütun y-merkezleri programatik
olarak doğrulandı (13/13 satır hizası). Ayrıntı: `OCR_ISSUES.md`.

## SOURCE-WIGGINS-002 · Skala başına madde sayıları (s.178-181)

Fact — aynen (**Visual: CONFIRMED**):

| Skala | Kaynak ifadesi | Kod (`WIGGINS_KEYS`) | Sonuç |
|---|---|---|---|
| SOC | "**Toplam 26 maddeden** oluşan" (s.178) | 13 + 14 = **27** | ⚠️ **KAYNAK İÇİ ÇELİŞKİ** |
| DEP | 33 maddeden | 27 + 6 = 33 | ✅ |
| FEM | 30 maddeden | 18 + 12 = 30 | ✅ |
| MOR | 23 maddeden | 21 + 2 = 23 | ✅ |
| REL | 12 maddeden | 9 + 3 = 12 | ✅ |
| AUT | 20 maddeden | 19 + 1 = 20 | ✅ |
| PSY | 48 maddeden | 45 + 3 = 48 | ✅ |
| ORG | 36 maddeden | 15 + 21 = 36 | ✅ |
| FAM | **16 maddeden** (görsel, s.180) | 11 + 5 = 16 | ✅ |
| HOS | 27 maddeden | 27 + 0 = 27 | ✅ |
| PHO | **27 maddeden** (görsel, s.180) | 16 + 11 = 27 | ✅ |
| HYP | 25 maddeden | 25 + 0 = 25 | ✅ |
| HEA | 28 maddeden | 10 + 18 = 28 | ✅ |

**SOC çelişkisi:** Metin "26" der; ancak kitabın **kendi madde listesi**
(Ek 9c, s.251-256) 27 madde verir ve bu liste `compare-keys.py` ile
**46/46 MATCH** olarak doğrulanmıştır → kaynak içi tutarsızlık; kod madde
listesini izler. Kayıt: **CONFLICT-021**, **DECISION-024**.
Status: 12/13 **VERIFIED** · SOC **kaynak içi tutarsızlık (kod doğru)**

## SOURCE-WIGGINS-003 · Skala tanımları (s.178-181)

Fact — aynen (kod `WIGGINS_META` ile karşılaştırma):

| Skala | Kaynak tanımı (kısaltılmış) | Kod açıklaması | Durum |
|---|---|---|---|
| SOC | "maddeleri **içedönüklük-dışadönüklük** kavramını içermektedir. **Yüksek puanlar kendinden emin, güvenli, parlak** bireyleri gösterirken, **düşük puanlar iddiacı, eğlenceyi seven**, diğer insanlarla kolay ilişkiye giren bireylere işaret etmektedir" | "Sosyal ortamlarda ketlenmişlik ve utangaçlık" (yüksek = ketlenmiş) | ⚠️ **YÖN ÇELİŞKİSİ** → CONFLICT-022 |
| DEP | "endişe, suçluluk, mutsuzluk, yaşamın anlamının yitirildiği" | "Mutsuzluk, suçluluk ve yaşamın anlamını yitirme hissi" | ✅ |
| FEM | "hobileri ve çeşitli spor faaliyetlerine merakı" | "Estetik konulara ve sanata karşı ilgi" | ~ kısmi |
| MOR | "kendini başarısız, ümitsiz olarak tanımladığı" | "Kendini başarısız hissetme ve düşük kendilik değeri" | ✅ |
| REL | "dinsel tutuculuk" | "Gelenekselci, dinsel tutucu tutumlar" | ✅ |
| AUT | "otoriteye güvensizliği … Diğer insanlara inanmaz, onların hep kendisini kullandıklarını düşünür" | "Otoriteye güvensizlik ve kullanılma kaygısı" | ✅ |
| PSY | "klasik psikotik semptomları gösterir … paranoid temeli ağır basmaktadır" | (kontrol edildi) | ✅ |
| ORG | "güç azlığından yakınmasını ve duygusal çatışmalardan kaynaklanan fiziksel semptomları" | — | ✅ |
| FAM | "ailesinden yeterince ilgi ve sevgi görmediğini, onların gereksiz yere eleştiren, sinirli, kavga etmeye eğilimli" | — | ✅ |
| HOS | "sadistik impulsları … tartışmaya eğilimli, kavga çıkarmaya hazır" | — | ✅ |
| PHO | "çeşitli korkuları anlatmaktadır (yükseklik, karanlık, kapalı alanlar)" | — | ✅ |
| HYP | "huzursuzluğu, gerginliği ve telaşı gösterir" | — | ✅ |
| HEA | "kendi sağlığı ile aşırı ilgilidir; gastrointestinal yakınmalar" | — | ✅ |

## SOURCE-WIGGINS-004 · Türkçe uyarlama çalışması (s.181)

Fact — aynen (**Visual: CONFIRMED**):
- Akça & Ceyhun (1994): örneklem **2000 denek** — hasta grubu 400 kadın +
  600 erkek; normal grup 578 kadın + 422 erkek. Hasta grubu Ankara'daki çeşitli
  üniversite hastanelerinde yatan hastalardan, normal grup devlet dairelerinde
  çalışanlardan ve üniversite öğrencilerinden oluşmuştur.
- Wiggins iç tutarlılık: en düşük **FEM (.50-.65)**; en yüksek **SOC (.82-.86)**,
  REL (.67-.89), DEP (.75-.87), MOR (.75-.86).
- Wiggins'in orijinal çalışmasında 7 ayrı grup karşılaştırılmıştır
  (Hava Kuvvetleri erkek personel N=261, yatan/ayaktan hastalar, öğrenciler).
Status: **VERIFIED** (bilgi kaydı)

---

# Ek 1 — MMPI Test Kitabı, 566 madde metni (kitap s.215-233)

## SOURCE-ITEM-001 — Madde metinleri kaynaktan okunabilir ve numaralandırma 1-566

Fact: Ek 1 (s.215) şu başlıkla başlar:
> "Ek 1: MMPI Test Kitabı — Minnesota Çok Yönlü Kişilik Envanteri"
> "Başla demeden bu defteri açmayınız. […] Her soruyu okuyarak KENDİ
> DURUMUNUZA GÖRE DOĞRU YA DA YANLIŞ olup olmadığına karar veriniz. […]
> **Soru sizin durumunuza uymuyor ya da bu konuda bir şey bilmiyorsanız cevap
> kağıdının üzerine hiç bir işaret koymayınız.** […] MÜMKÜNSE her soruya
> cevaplandırmaya çalışınız."

Sayfa numaralandırması bütünlüğü: s.215-233 boyunca **1→566 aralığı kesintisiz**
(OCR ile satır başı numaraları tarandı; ardışıklık boşluğu yok, kopya yok —
iki "kopya" bulgusu OCR artefaktı, kitapta numara hatası **yok**).

Yöntem: OCR yalnız **numaranın konumunu** bulmak için kullanıldı; **metin
yüksek DPI görselden okundu** (300-350 dpi). Gerekçe: OCR blok sırası
güvenilmez (bkz. `OCR_ISSUES.md` → ITEM-ORDER).
Status: **VERIFIED (yapı)** · `SOURCE-ITEM-001`

## SOURCE-ITEM-002 — Kaynakta "kritik madde" listesi YOK

Fact: Kaynağın hiçbir yerinde (Bölüm 3/4/5/6, Ek 1, Ek 9, Ek 10) **"kritik
madde"** adı altında bir liste bulunmaz. Kaynakta bulunanlar:
- **Ek 9** (s.244-256): ölçek ↔ madde numarası ve puanlama yönü **(D/Y)**
- **Ek 1** (s.215-233): madde **metinleri**
- **Ek 10** (s.257-260): tanı gruplarına göre ortalama/SD

Dolayısıyla projedeki `CRITICAL_ITEMS` listesi **kaynak dışı** bir derlemedir
(proje kendi etiketlerini ve yönünü yazmıştır).
Status: **VERIFIED (yokluk kanıtı)** · `SOURCE-ITEM-002` · CONFLICT-023

## SOURCE-ITEM-003 — Doğrulanan kritik madde metinleri (görsel)

Aşağıdaki 24 madde **görsel doğrulandı** ve etiketi kaynak metniyle tutarlı
(dosya: `.audit/items/gl2_*.png`, `gl3.png`, `gl4.png`; toplam 39 kayıt):

| # | Kaynak metni (özet) | Kod etiketi | Durum |
|---|---|---|---|
| 48 | Başkaları ile bir arada iken kulağıma çok garip şeyler gelmesinden rahatsız olurum | Ruhsal Kontrol Kaybı | ✓ |
| 66 | Etrafından başkalarının görmedikleri eşya, hayvanlar veya insanlar görürüm | Gerçek Dışılık / Sanrısal Düşünce | ✓ |
| 74 | Çoğu zaman kız olmayı isterdim. (Şayet kız iseniz) Kız olduğuma hiç üzülmedim | Cinsel Uyumsuzluk / Kimlik Kaygısı | ✓ (cinsiyete göre D/Y doğru) |
| 114 | Çoğu zaman başım sıkı çember içindeymiş gibi hissederim | Bedensel/Organik Belirti | ✓ |
| 121 | Aleyhimde bazı tertipler kurulduğuna inanıyorum | Gerçek Dışılık / Sanrısal Düşünce | ✓ |
| 123 | Beni takip edenler olduğuna inanıyorum | Şüphecilik / Alınganlık | ✓ |
| 139 | Bazen sanki kendimi ya da başkasını incitmek zorundaymışım gibi hissederim | Kendine/Başkasına Zarar Verme | ✓ |
| 156 | Bir şeyler yapıp sonra ne yaptığımı hatırlayamadığım zamanlar oldu | Bedensel/Organik Belirti | ✓ |
| 182 | Aklımı oynatmaktan korkuyorum | Fobik Kaygı | ✓ |
| 184 | Sık sık nereden geldiğini bilmediğim sesler duyarım | Ruhsal Kontrol Kaybı | ✓ |
| 200 | Fikir ve düşüncelerimi çalmak isteyen biri var | Gerçek Dışılık / Sanrısal Düşünce | ✓ |
| 202 | Kendimi cezayı hakketmiş suçlu bir insan olarak görüyorum | İntihar Riski / Depresyon | ✓ |
| 205 | Bazen çalmaktan ya da dükkânlardan eşya aşırmaktan kendimi alamam | Sosyal Uyumsuzluk | ✓ |
| 209 | Günahlarımın affedilmeyeceğine inanıyorum | Depresif Karamsarlık | ✓ |
| 215 | Çok içki kullandım | Alkol/Madde Sorunları | ✓ |
| 251 | Kendimi kaybedip yaptığım işi aksattığım ve etrafımda olup bitenlerin farkında olmadığım zamanlar oldu | Bedensel/Organik Belirti | ✓ |
| 275 | Birisi zihnimi kontrol ediyor | Ruhsal Kontrol Kaybı | ✓ |
| 291 | Hayatımda bir ya da birkaç kere birisinin beni hipnotize ederek bana bir şeyler yaptığını hissettim | Ruhsal Kontrol Kaybı | ✓ |
| 293 | Birisi zihnimi etkilemeye çalışıyor | Şüphecilik / Sanrısal Düşünce | ✓ |
| 339 | Çoğu zaman ölmüş olmayı isterdim | İntihar Riski / Depresyon | ✓ |
| 345 | Sıklıkla olup bitenler bana gerçek değilmiş gibi gelir | Sanrısal Düşünce / Ruhsal Kayıp | ✓ |
| 349 | Acayip ve tuhaf düşüncelerim vardır | Şüphecilik / Sanrısal Düşünce | ✓ |
| 350 | Yalnızken garip şeyler duyarım | Sanrısal Düşünce / Ruhsal Kayıp | ✓ |

→ **14 kayıtta etiket kaynak metniyle UYUŞMUYOR** (38 benzersiz maddeden) → CONFLICT-023.

---

# Bölüm 5 — Klinik testlerin değerlendirilmesi (kitap s.63-158) — yapı ve Tablo 8

## SOURCE-CL-004 · Tablo 8 — Hipokondriazis (Hs) alt testi: madde numaraları ve puanlama yönü (s.66)

Fact — **görsel doğrulandı** (320 dpi, `.audit/pages/v_tablo8.png`):
> "**Tablo 8. Hipokondriazis alt testi: Madde numaraları ve puanlama yönü
> (Madde Sayısı: 33)**"
> **Doğru** (11): 23, 29, 43, 62, 72, 108, 114, 125, 161, 189, 273
> **Yanlış** (22): 2, 3, 7, 9, 18, 51, 55, 63, 68, 103, 130, 153, 155, 163, 175,
> 188, 190, 192, 230, 243, 274, 281
> **"K Eklemmeli"** (K düzeltmesi uygulanır)
> "Erkeklerde ortalama: **13.19**, kadınlarda: **15.89** (Savaşır, 1981)"

**Karşılaştırma — `src/scoring/mmpiKeys.ts`:**
`Hs.trueItems` = 11 madde → **birebir MATCH** ✓
`Hs.falseItems` = 22 madde → **birebir MATCH** ✓
`TURKISH_NORMS.Hs` → Erkek mean **13.19** / Kadın mean **15.89** → **MATCH** ✓
`K_ADDITION_TABLE` Hs oranı 0.5 → kaynak "K eklemmeli" ✓ (oran kaynakta verilmez → UNVERIFIED)
Status: **VERIFIED** · `SOURCE-CL-004`

## SOURCE-CL-005 · Bölüm 5'in yapısı — kod tipi yorumları (s.63-158)

Fact (s.63, `SOURCE-CL-003` ile birlikte; s.66-75 taramasıyla doğrulandı):
> "Bu bölümde verilecek olan **kod tipleri ve profil yorumlamaları** klinik
> bilgilere dayanmaktadır. […] Kod yorumlamaları MMPI'da kullanılan **ikili
> kodların hepsini, üçlü ve dörtlü kodların çoğunluğunu** içermektedir.
> Kodların yorumlanması **alt testlerin sayısal sıralamasına göre** yapılmıştır."
Kaynak listesi: Archer 1987; Butcher 1969, 1984, 1987; Butcher & Graham 1990;
Ceyhun 1986; Dahlstrom ve ark. 1972; Erol 1982; Friedman & Graham 1987;
Greene 1979; Lachar 1974; Levitt 1989; Savaşır 1978, 1981; Webb 1978.
> Hedef kitle: "ilkokul mezunu, ortaokul düzeyinde eğitimi olan, zekâ düzeyi
> normale yakın ve genellikle yetişkinler".

**Yapı bulgusu (denetim için kritik):** Bölüm 5'te **her ölçek için madde
tablosu YOKTUR** — klinik ölçek madde anahtarlarının kaynağı **Ek 9**
(s.244-256) ve Hs için **Tablo 8**'dir. Bölüm 5 = **kod tipi yorumları +
T-puan bant yorumları**.

Kod karşılığı: `src/scoring/mmpiSourceCodes.ts` — "iki noktalı kod yorumları
(Kod Analizleri)"; anahtar kanonik biçimde (küçük rakam önce: "21" → "12").
**Örnek doğrulama (s.68 ↔ `CODES['12']`):** kaynak
*"bedensel işlevleri ile çok fazla ilgilidirler […] herhangi bir tıbbi
müdahale olabildiğince kısıtlı olmalıdır"* ↔ kod metni birebir özet ✓;
kaynak *"12 kodunda 1 ve 2 alt testleri arasında 5 T puanı kadar fark varsa
21'e bakılır"* ↔ kod metninde korunmuş ✓.
Status: **VERIFIED (yapı + örnek)** · PHASE 9/10 kapsamı belirlendi

---

# PHASE 9/10 — Bölüm 5: Hs alt testi yorumu ve kod tipleri (kitap s.66-69)

## SOURCE-CL-006 · Hs T-puan bantları (s.67, p41 R) — **Visual: CONFIRMED**

Fact — aynen:
> **84'ün üzerinde T Puanı:** "Yakınmaları bütün organ sistemlerine yayılmış olan
> kişilerde görülür. Ağrı, yorgunluk ve güçsüzlük sıklıkla vardır. Somatik ilgiler
> somatik delüzyonlara dönüşmüş demektir. Bu belki de şizofrenik bir epizodun
> başlangıcıdır."
> **75-84 T Puanı:** [{kaynak metni birebir kod ile aynı — bkz. aşağıda}]
> **60-74 T Puanı:** "Bu puanlar sıklıkla bu kişilerin hem şimdiki hem de geçmiş
> yaşantıda fiziksel bozukluk gösterdiğine işaret etmektedir ve bu yükselmeye
> **sıklıkla D alt testindeki yükselme eşlik eder**… Bedensel hastalığı olan
> bireylerde **65 T puanının üstünde** bir yükselme, bu bireylerin yaşadıkları
> güçlüklere aşırı tepki verdiklerini ve kabul edilmez dürtülerini somatizasyon
> ile ifade ettiklerini göstermektedir."
> **50-59 T Puanı:** "…Özelliği olan bir örüntüde **2, 6, 7, 8 ya da 0 alt
> testlerinin 70'in üzerine yükselmediği zaman** günlük yaşam aktivitelerini
> yerine getirdiği söylenebilir. Bu kişiler sıklıkla yetenekli, sorumluluk
> sahibi, vicdanlı, dikkatli ve yargılamaları iyi olan kişilerdir."
> **21-49 T Puanı:** "(a) Hastalığın hiç konu olmadığı ailelerde yetişen
> bireyler (b) Şimdiye kadar hiç ağrı, acı ya da hastalık geçirmediği ile övünen
> kişilerde. […] **Özelliği olan bir örüntüde 2,6,7,8 ya da 0 alt testlerinin
> 70'in üzerinde yer aldığı bir durumdur**, çünkü bu konfigürasyonda düşük Hs alt
> testi sıklıkla birisinin bedeni ile ilgisinin olmadığını gösterir."

Kod: `HS_T_BANDS` → `T > 84` · `75-84` · `60-74` · `50-59` · `21-49`
Karşılaştırma: **Bant sınırları birebir MATCH** ✅ · 75-84 / 60-74 / 50-59 /
21-49 metinleri **MATCH** (birebir özet) ✅
Status: **VERIFIED**

## SOURCE-CL-007 · Hs düşük puan ve yaş özellikleri (s.66-67) — **Visual: CONFIRMED**

Fact — aynen:
> "**Hs alt testinde düşük puan alan bir bireyin:** 1. Somatik uğraşları yoktur.
> 2. İyimserdir. 3. Duyarlıdır. 4. İçgörüsü vardır. 5. Günlük yaşamda oldukça
> etkindir."
> "Hs alt testinin **40 yaşın üzerindekilerde daha çok yükseldiği** ancak genç
> grupta daha düşük olduğu belirtilmektedir."
> "Ciddi bedensel hastalığı olan bireylerde de bu alt testte yükselme vardır,
> ancak bu psikiyatrik hastalar kadar yüksek değildir. Hipokondriyak tanısı
> konulan hastaların semptomları uzun sürelidir, değişmeye dirençlidirler ve
> bu, artık strese tepkiden farklı bir şeydir. **Bu bireyler önerilen tedaviyi
> uygulamaz ve sık sık doktor doktor gezerler.**"

Kod: 5 maddelik liste `HS_T_BANDS` içinde **YOK** · 40 yaş notu **YOK** ·
"doktor doktor gezerler" **YOK** (kaynakta ayrı cümle)
Status: **MISSING** → CONFLICT-026 (P3)

## SOURCE-CL-008 · Tablo 8 teyidi (s.66, p41 L) — **Visual: CONFIRMED**

Fact — aynen (Tablo 8, Madde Sayısı: 33):
Doğru: `23 29 43 62 72 108 114 125 161 189 273` (11) ·
Yanlış: `2 3 7 9 18 51 55 63 68 103 130 153 155 163 175 188 190 192 230 243 274
281` (22) · K Eklemeli: (boş) · "Erkeklerde ortalama: 13.19, kadınlarda: 15.89
(Savaşır, 1981)"
Karşılaştırma: SOURCE-CL-004 ile aynı → **VERIFIED** (ikinci okuma teyidi)

## SOURCE-CODE-001 · 12/21 Kodu (s.67 sonu – s.68, p41 R – p42 L) — **Visual: CONFIRMED**

Fact — aynen (kod gövdesi):
> "**12/21 Kodu** — Bu kodun en belirgin özelliği bedensel rahatsızlık ve ağrıdır.
> Bireyler bedensel işlevleri ile çok fazla ilgilidirler. […] **12/21 Kodu veren
> lise öğrencileri genel olarak utangaç, gergin, içedönük, mutsuz, endişeli,
> güvensiz ve özellikle karşı cins ile ilişkilerinde oldukça çekingendirler.**
> **Üniversite öncesi ergenler, sıklıkla utangaçlıklarını obsesyonlar ya da
> sosyal izolasyon biçiminde gösterirler. Bağımlılık ve karamsarlık belirgindir
> ve arkadaşları azdır. Aile öykülerinde sıklıkla ayrılıklar ya da boşanma
> vardır.** 12 Kodunda 1 ve 2 alt testleri arasında **5 T puanı** kadar fark
> varsa 21'e bakılır…"

Ek (s.69, 12/21 kodunun devamı):
> "Kod tipine ek olarak **Pd alt testi düşük** olduğunda heteroseksüel ilişki
> azlığı ve seksüel zorlukların olduğu bir pasifliği gösterir. **Ma alt testinde
> de düşüklük** olduğunda kişide enerji düzeyinde azalma, iş yapmama ve sürekli
> yatma isteği vardır. **Mf alt testinin düşmesi** kadınlarda aşırı derecede
> sorumluluk aldıklarını ve sıkıntılarının uzun süreli olduğunu gösterir. Eğer
> aynı zamanda **L alt testi de yükselmişse** bu kadınlarda evlilik sorunları,
> yorgunluk yakınmaları ve diğerleri tarafından anlaşılmama vardır."

Kod: `CODES['12']` → gövde **MATCH** ✅ · `diagnosis: Pasif-bağımlı kişilik
bozukluğu / Somatizasyon bozukluğu / Depresyon` ✅ · **lise öğrencileri** ve
**üniversite öncesi ergenler** paragrafları **YOK** → CONFLICT-025 · **Pd/Ma/Mf/L
koşullu ek yorumları YOK**
Status: gövde **VERIFIED** · koşullu ek yorumlar **MISSING**

## SOURCE-CODE-002 · 123/213 Kodu (s.68 sonu – s.69 başı) — **Visual: CONFIRMED**

Fact — aynen:
> "**123/213 Kodları** (Ayrıca 1234 ve 1237'ye bakınız. 3 alt testi, 1'den 5 T
> puanı yüksekse 213/231 kodlarına bakınız.)
> Bu kişiler özellikle yorgunluk, güçsüzlük ve karın bölgesindeki organlarla
> ilgili bedensel yakınmalar gösterirler. Öykülerinde uzun süreli kronik
> hipokondriazis öyküsü vardır. Onların yakınmaları sıklıkla pasif bir
> bağımlılığın kanıtı olabilir ancak bu kişilerde **konfüzyon, intihar
> düşünceleri, obsesyonlar ve kompulsiyonlar yoktur.** İlgi alanları daralmış,
> depresif, atılgan olmayan, risk alma konusunda tereddütlü kişilerdir."
> **Olası tanı: Belirgin somatizasyon bozukluğu ve hipokondriyak uğraşlar.**

Kod: **`CODES['123']` TANIMLI DEĞİL** ❌ → CONFLICT-024 (P1)
Status: **MISSING**

## SOURCE-CODE-003 · 1234 Kodu (s.69, p42 R) — **Visual: CONFIRMED**

Fact — aynen:
> "**1234 Kodu** (Ayrıca eğer alt test 1 ve 2 diğerlerinden 5 T puanı yüksekse
> **2134'e bakınız**.)
> Kişilerdeki kişilik zayıflığı korkaklık, stres yaratan durumlarla ve
> sorumluluklar ile başa çıkmada yetersizlik vardır. Bağımlılık, bağımsızlık
> çatışması yaşarlar. Alkolle sınırlar, ancak içtikleri zaman kavga ederler.
> Bu profili veren erkekler kadınlara karşı düşmanlık duyguları gösterirler
> (Sıklıkla fiziksel şiddet yani dayak vardır.). Özellikle güçlü bağımlılık
> gereksinimleri engellenmiştir. Erkeklerde anneye bağımlılık özlemi, anneleri
> tarafından reddedilme korkusu ile çatışma içindedirler. **Olası tanılar: pasif
> agresif kişilik, anksiyete ya da psikofizyolojik reaksiyonlardır.**
> Kadınlarda karakter bozukluğu, pasif-agresif kişilik, kimseye güven duymama,
> duygularını ifade etme güçlüğü ya da nasıl ifade edeceğini bilememe görülür.
> Psikoterapide savunucudurlar, motivasyonları düşüktür.
> **Olası Tanı: Pasif-agresif kişilik / Anksiyete ya da psikofizyolojik
> reaksiyon**"

Kod: **`CODES['1234']` TANIMLI DEĞİL** ❌ → CONFLICT-024 (P1)
Status: **MISSING**

## SOURCE-CODE-004 · 1236 Kodu başlangıcı (s.69, p42 R — devamı s.70)

Fact — aynen:
> "**1236 Kodu** — Birey uzun süreli gerginlik, yetersizlik ve stres altında
> semptom geliştirme eğilimi gösterir. **Semptomlar konversif niteliktedir.**
> Bastırma ve yadsımayı kullanır. Olumsuz duygularını psikosomatik semptomlarla
> gösterir."

Kod: **`CODES['1236']` TANIMLI DEĞİL** ❌ → CONFLICT-024 (P1)
Status: **MISSING** (kod metninin devamı s.70+'ta okunacak)

## SOURCE-CODE-005 · Hs kod tipi bloğu I (s.70, p43 L) — **Visual: CONFIRMED**

Fact — kaynakta **sırayla** tanımlı kod tipleri (her biri ayrı başlık):
| Kod | Özet (kaynak) |
|---|---|
| **1237 Kodu** | "123'teki kod tipinin özelliklerine ek olarak" anksiyete, gerilim, korku, atılgan olamama, yetersizlik duyguları, kişilerarası ilişkilerde bağımlılıkta artma; sırt/göğüs ağrıları + epigastrik yakınmalar. **"Özellikle K 50 T puanından düşükse"** günlük stres ve sorumluluklarla başa çıkamazlar. Erkekler kendilerinden daha güçlü kadınlarla evlenir; kronik işsizlik ve alkol bağımlılığı görülebilir. Olası tanı: Pasif bağımlı kişilik yapısında anksiyete ve psikofizyolojik reaksiyon |
| **1270 Kodu** | Sinirlilik, anksiyete, depresyon, zayıflık, yorgunluk, ilgi kaybı; benlik değerlerinde düşme; sosyal ilişkilerde geri çekilme ve içe dönük tutum; uykusuzluk, kardiyak semptomlar, anoreksiya |
| **12378 Kodu** | "Nevrotik bozuklukların **daha şiddetli** şeklidir. **7 ve 8'deki yükselmeler**, nevrotik bozukluğun daha abartılı olduğunun göstergesidir." |
| **128/218 Kodları** | Bedenin **üst kısmına** ilişkin yakınmalar; yorgunluk, gerilim, düşüncelerde bozulmalar; ruhsal bozukluk ve diğerlerinden yabancılaşma; "akut prepsikotik ya da psikotik ve **somatik delüzyonlar**" |
| **129/219 Kodları** | Beden işlevleriyle aşırı ilgi; hastalıklarının **gerçekten acil** olduğunu düşünürler; akut klinik rahatsızlık, gerginlik, ajitasyon, huzursuzluk; baş ağrısı, uykusuzluk, spastik bağırsak ağrıları; **nörolojik etiyoloji** dikkate alınmalı (organik beyin sendromları); çok az düzeyde de olsa depresyonu/çatışmayı/hipomanik pasif-bağımlı tavrı maskelemeyi ya da inkâr etmeyi isterler |

Kod: **hiçbiri tanımlı değil** ❌ → CONFLICT-024 (P1)
Status: **MISSING** (6 kod tipi)

## SOURCE-CODE-006 · Hs kod tipi bloğu II (s.71, p43 R) — **Visual: CONFIRMED**

Fact — aynen:
| Kod | Özet (kaynak) |
|---|---|
| **120/210 Kodları** | Depresyon, içe çekilme, kararsızlık, kişilerarası ilişkilerden kaçınma, yetersizlik ve suçluluk duygularına **değişik somatik yakınmalar eşlik eder**. "**8 ve 6 birlikte yükselmişse** uzak duruş, pasif ve insanlardan kaçan **şizoid** bir biçim gösterirler." |
| **13/31 Kodu** | (Kodda mevcut — gövde MATCH) **Ek koşullu paragraflar:** (i) "13/31 kodu ile birlikte **2, 7, 8 ve 9 alt testleri yükselmiş ve K alt testi düşmüşse** hastada gerginlik, anksiyete, karar vermede güçlük ve depresyon olabilir… Kendilerini normal ve sorumluluk sahibi tanımlama eğilimi vardır." (ii) "13/31 kodu ile birlikte **L ve K alt testleri de yükselirse**, kendileri ile uğraşılmasına karşı öfkelendikleri anlaşılmaktadır." (iii) "**13 kodunu veren** kişilerde hipokondriyak özellikler belirgindir. **31 kodunu veren** kişilerde ise stres durumları ile karşılaşıldığında bedensel yakınmalar ortaya çıkar, immatür ve bağımlı özellik gösterirler." |

Kod: `120`/`210` **tanımlı değil** → CONFLICT-024 · `13` mevcut; (ii) ve (iii)
paragrafları kodda **YOK** → CONFLICT-025 sınıfı
Status: **MISSING**

**Genel bulgu (kritik):** Kaynak, Hs kod tipi bölümünde **her üçlü/dörtlü kod için
ayrı yorum** veriyor ve bunları **koşullu cümlelerle** birbirine bağlıyor
("K 50'den düşükse", "8 ve 6 birlikte yükselmişse", "L ve K da yükselirse").
Kodda bu katman **tamamen yok**.

## SOURCE-CODE-007 · Hs kod bloğu III (s.72-73, p44) — **Visual: CONFIRMED**

| Kod | Özet (kaynak) |
|---|---|
| **13/31 Kodu, Yüksek K** | "Özellikle **2, 7 ve 8 testlerinin T puanı 70'in ve F alt testi T puanı 50'nin altında** ise bireyler kendini normal, sorumluluk sahibi, yardımsever ve sempatik olarak sunmaya çalışır. Var olan herhangi bir bedensel semptomun ortaya çıkma biçimi **yetersizlik, değersizlik** şeklindedir. Geleneksel psikoterapötik müdahalelerden yararlanmazlar, profesyonellere güven duydukları zaman, tedaviyle iyileşebilirler." |
| **13/31 Kodu / Düşük 2 Kodu** | "Bu tür profil veren bireylerin **histerik kişilik özellikleri vardır ve klasik psikosomatik semptomlar** gösterirler." |
| **132/312 Kodları** | "13/31 kod tipindeki özelliklere ek olarak birey, **zayıflık ve yorgunluktan yakınır** (Eğer 9 alt testi daha düşükse). Kendilerinde **depresif duygudurum olduğunu inkâr etseler** de davranışlarında sıklıkla depresif özellikler vardır. Bu kişiler **uyumlu ve pasiftirler** (Özellikle 4 alt testi düşükse.) Diğerlerinin ilgisi karşısında **endişe yaşarlar** (Si alt testinde düşüklük olduğunda bile)." |
| **134/314 Kodları** | "Bireylerde belirgin olan özellikler; **inatçılık, züppellik** hatta **kendini beğenmişliktir.** Tanımlanan özellikleri nedeniyle **somatizasyon yakınmaları ikinci planda kalmaktadır.** 13/31 kodundaki özellikler bu bireylere de uygundur. **Bağımlılık, bağımsızlık çatışmaları** vardır; ancak diğerlerine yabancılaşma konusunda çok endişe yaşamazlar. Eğer profil **konversiyon** vadisine uygunsa **somatik yakınmalar dönemsel patlamalar** ya da **pasif agresif** bir tarzda ifade edilir." |
| **1342 Kodu** | "Birey **bağımlı ve immatürdür. Otistik dönemleri** olabilir. Psikiyatrik olarak **depresyon, anksiyete, sinirlilik, başağrısı, uykusuzluk** gibi somatik yakınmalar görülebilir." |
| **136/316 Kodları** | "Bedensel semptomların (özellikle **mide ve baş ağrısı**) stres durumlarında ortaya çıkmasına karşın bu kişiler, diğerlerinden gelen **istekler karşısında gergin ve aşırı duyarlıdırlar.** Bireyler **benmerkezci ve narsisisttir.** Ayrıca **katı ve inatçı** olma eğilimi içindedir. Sıklıkla bu profil veren erkek **hastalara rekabetçi, şüpheci, çabuk kızan ve diğerlerini kontrol etmeyi isteyen** bireylerdir. Davranışlarını benmerkezci biçimde rasyonalize etme eğilimindedir, diğer insanlarla ilişkilerinde **içgörüleri azdır** ve onlardan beklentileri çok fazladır." |

**Kritik sayısal koşul (13/31 Yüksek K):** 2, 7, 8 testleri **70'in altında** ∧
F alt testi **50'nin altında** → kodda yalnızca `13` `text` içinde "Yüksek K ile
(özellikle 2, 7 ve 8'in T puanı 70'in ve F'nin 50'nin altında olduğu durumda)"
biçiminde **gömülü**; ayrı bir alt-kod olarak **tespit edilmiyor**.

## SOURCE-CODE-008 · Hs kod bloğu IV (s.74-75, p45) — **Visual: CONFIRMED**

| Kod | Özet (kaynak) |
|---|---|
| **1382 Kodu** | "138'deki yoruma ek olarak **dikkate değer depresyon, konfüzyonel düşünce, alkol alımı ve intihar etme düşünceleri** vardır. Birey, **sıklıkla yalnız**dır, evli ise **evlilik uyumu bozuktur.** Sürekli olarak **bir işten, başka bir işe geçer.**" |
| **139 Kodu** | "Bireyde; **başağrısı, görme ve işitme yakınmaları, titreme ve koordinasyon bozuklukları** ve çok sayıda somatik yakınma görülür. **Engellenme eşiği oldukça düşüktür**, sinirlidir ve **öfke patlamaları** vardır. Eğer **4 alt testinde yükselme varsa ve K alt testi düşmüşse mücadeleci ve yıkıcı kişilik** özellikleri vardır. Kişilerarası ilişkilerinde **öfke ön plandadır** ve **boşanmalar oldukça sık** görülür. Kişilerin genellikle **mükemmelliği isteyen öyküleri** vardır ve ailelerine ilgileri azdır. **Alkol alımından sonra düşmanlık duyguları** ön plana çıkar. Bu kod, çok sık olarak **kişilik bozuklukları** ya da **travmaya eşlik eden kronik beyin sendromu** olan olgularda görülür. Seyrek olarak **anksiyete bozuklukları** ile birliktedir. **Olası Tanı: Somatoform bozukluk / Organik beyin sendromu**" |
| **14/41 Kodu** | (kodda mevcut) **Ek:** "**Çok genel olarak görülen üçlü kodlar 143/413 ve 142/412'dir.**" |
| **Yüksek 1 / Düşük 4 Kodu** | "Bu örüntü **karşılaşılan sorunlarla başa çıkamama ve ev yaşantısındaki güçlüklerle** bağlantılıdır. **Öfkelerini kolaylıkla dile getirmelerine** karşın yine de **psikofizyolojik tepkiler** verirler. Genel özellikleri **sürekli yakınma ve karamsarlık**tır." |
| **146 Kodu** | "**Antisosyal** ya da **impuls kontrolünde güçlüğü** olan kişilerdir. **Kötümser, katı, kolay ilişki kuramayan**, başkalarından gelen eleştirilere **aşırı duyarlık gösteren** bireylerdir. Çevrelerini **şaşırtacak derecede düşmanlık** gösterirler." |
| **1469 Kodu** | "**Kızgın, tepkisel** insanlardır. Aşırı biçimde **karşılarındaki kişiyi suçlarlar. Hostil, huzursuz, alıcı, şüpheci, narsisistik, benmerkezci** kişilerdir. **Duygusal labilite, anksiyete, gerginlik, manipülatif, impulsif** özellikler, **eyleme vuruk davranışlar** görülmektedir. **İş başarısızlığı** ve **aile içi ilişki güçlükleri** belirgindir." |
| **15/51 Kodu** | (kodda mevcut) **Ek:** "15/51 kodunu yorumlarken **5 alt testini bırakarak yükselen üçüncü alt teste bakmak gereklidir.**" |

## SOURCE-CODE-009 · Hs kod bloğu V (s.76-77, p46) — **Visual: CONFIRMED**

| Kod | Özet (kaynak) |
|---|---|
| **16/61 Kodu** | (kodda mevcut) **Ek:** "**16/61 profilleri her iki cins için de oldukça nadirdir.** Eğer bu tip bir profil elde edilmişse **erkeklerde 2 ve 4'ün, kadınlarda ise 3 ve 8'in** olduğu **üçlü bir yükselme** vardır." |
| **17/71 Kodu** | (kodda mevcut) **Ek:** "**Her iki cins için de 172/712 ve 173/713 kodları sık görülür.**" |
| **18/81 Kodu** | "Hastalarda **düşmanlık ve saldırganlık duyguları** vardır, ancak bu duygularını **uygun bir biçimde ifade edemezler.** Beden işlevleri ve bedensel hastalıklara ilişkin **delüzyonel düşüncelerini açıkça gösterirler.** […] **Somatik hezeyanları** olabilir. […] Bu kişilerde **karşı cinsin üyelerine ilişkin hostilite** vardır. […] **Özellikle stres altında** kişilerde **şaşkınlık ve düşüncede konfüzyon** olabilir. **Somatik uğraşları gerçek ile bağlantılarını koparabilir.** **Genel olarak üçlü kodlar 182/812, 183/813 ve 187/817'dir.** Bu kod tipini veren **ergenlerin okul başarısı düşüktür**, utangaçlık oldukça fazladır. […] **Madde bağımlılığı ya da intihar girişimleri** olabilir. Bu örüntüyü gösteren **ergenlerin 2/3'ü boşanmış ailelerden gelmektedir.** **Olası Tanı: Eğer F alt testi de yükselmişse şizofreni. Pre-psikotik bozukluk tanısı da düşünülmelidir.**" |
| **19/91 Kodu** | "Hastalar **gergin ve kaygılı** olarak tanımlanır. Çok yoğun **duygusal karmaşa** yaşarlar. **Sindirim sorunları, baş ağrıları ve bitkinlik** gibi bedensel yakınmalar yaygındır ve bu kişiler **semptomlarına yönelik psikolojik açıklamayı kabul etmezler.** […] **Pasif-bağımlı** bireylerdir, **yetersizliklerini kompanse etmek** isterler. Bu kod tipi aynı zamanda **beyin hasarı olan** bireylerde görülmektedir […] Eğer bu profilde **2 ve 3 alt testlerinin değerleri 5 T puanından aşağıda ise 129 ve 139 koduna bakınız.** […] **Olası Tanı: Organik beyin bozukluğuna bağlı güçlükler / Pasif-bağımlı kişilik bozukluğu**" |

## SOURCE-CODE-010 · Hs kod bloğu VI (s.78, p47 L) — **Visual: CONFIRMED**

| Kod | Özet (kaynak) |
|---|---|
| **10/01 Kodu** | "Bu kod **oldukça nadirdir**, **sosyal açıdan rahatsız, içe çekilmiş, soğuk, pasif** kişilerde ortaya çıkar. Genel olarak bunlara genellikle **çok sayıda somatik yakınmalar** eşlik eder. **Üçüncü yükselen alt test 8 olduğu zaman** genellikle **şizoid çekilme ve sosyal yetersizliğin** olduğu söylenebilir. Sıklıkla **2 ve 3 yükselen testlerdir** ve eğer **T değeri 70'in üstünde ise destek sistemleri zayıflamıştır ve maskeli depresyon** vardır." |

**Hs kod bloğu burada bitiyor** (s.78 sonu). **s.79'da Bölüm "2. Depresyon (D)
Alt Testi" başlıyor** → SOURCE-CL-009 (aşağıda).

## SOURCE-CL-009 · D (2) alt testi girişi + yüksek puan listesi (s.79, p47 R) — **Visual: CONFIRMED**

Fact — aynen:
> "**2. Depresyon (D) Alt Testi** — Bu alt test, depresyon belirtilerinin
> derecesini ölçmek amacıyla geliştirilmiştir. Depresyonda olan kişilerin ana
> belirtileri, karamsarlık, gelecekten ümitsizlik; kendini değersiz, işe yaramaz
> görme, suçluluk duyguları, hareketlerde ve düşüncede yavaşlama ve çeşitli
> bedensel yakınmalardır. Sıklıkla ölüm ve intiharla ilgili düşüncelerin
> yoğunluğu da dikkati çeker. […] Depresyon alt testindeki maddeler ve puanlama
> yönü **Tablo 9'da** gösterilmiştir."
> "**D alt testinde yüksek puan alan bir birey (Graham 1987):**
> 1. Depresif, mutsuz, kederli ve sıkıntılıdır. 2. Gelecekten umutsuzdur.
> 3. Kendini aşağılamaktadır. 4. Suçluluk duyguları vardır. 5. Konuşmak istemez.
> 6. Ağlar. 7. Yavaş hareket eder. 8. Depresif tanısı konulabilir.
> 9. Somatik yakınmaları vardır. 10. Güçsüzlük, yorgunluk, enerji kaybından
> yakınır. 11. Ajite ve gergindir. 12. Kolay kızar. 13. Üzüntüye eğilimlidir.
> 14. Kendine güveni azalmıştır. 15. Okulda ya da işte başarısız olduğunu
> düşünür. 16. Kendini işe yaramaz ve iş görmez gibi görür. 17. İçe çekilmiş,
> utangaç, ürkek, yalnız kalmaya eğilimli ve ketumdur. 18. Soğuktur.
> 19. Kişilerarası ilişkilerden kaçınır, insanlarla fazla konuşmaz.
> 20. Temkinli ve geleneksekdir. 21. Karar vermede güçlük çeker."

Kod karşılaştırması: `D_T_BANDS` ve D yorumu → **sonraki batch'te** (s.80-94).
Şimdilik: **D alt testi 21 maddelik liste `MISSING`** adayı.

## SOURCE-CL-010 · Tablo 9 — Depresyon (D) alt testi anahtarı (s.80, p48 L) — **Visual: CONFIRMED**

Fact — aynen (**Madde Sayısı: 60**):
**Doğru (20):** `5, 13, 23, 32, 41, 43, 52, 67, 86, 104, 130, 138, 142, 158,
159, 182, 189, 193, 236, 259`
**Yanlış (40):** `2, 8, 9, 18, 30, 36, 39, 46, 51, 57, 58, 64, 80, 88, 89, 95,
98, 107, 122, 131, 145, 152, 153, 154, 155, 160, 178, 191, 207, 208, 233, 241,
242, 248, 263, 270, 271, 272, 285, 296`
Norm: "Erkeklerde ortalama: **20.63**, kadınlarda: **23.86** (Savaşır, 1981)"

**⚠️ OCR UYARISI (yeni kayıt — `OCR_ISSUES.md`):** Ham OCR, Yanlış listesinin ilk
maddesini **"6"** okudu; **görsel doğrulama "9" olduğunu gösterdi** (420 dpi
crop). "6" ile "9" karışması → madde numaralarında **her zaman** görsel teyit.

Kod karşılaştırması (`SCORING_KEYS.D`):
- Doğru: kaynak 20 ↔ kod 20 → **BİREBİR MATCH** ✅
- Yanlış: kaynak 40 ↔ kod 40 → **BİREBİR MATCH** ✅
- Toplam 60 = kitabın "Madde Sayısı: 60" ✅
- Norm: kod Erkek **20.63** ✅ · Kadın **23.86** ✅ → MATCH
Status: **VERIFIED** (P0 katmanı — anahtar ve norm)

## SOURCE-CL-011 · D alt testi düşük puan listesi (s.80-81) — **Visual: CONFIRMED**

Fact — aynen ("D alt testinde düşük puan alan bir birey"):
> "1. Gerginlik, anksiyete, suçluluk ve depresyondan arınmıştır. 2. Rahat ve
> huzurludur. 3. Kendine güvenlidir. 4. Duygusal açıdan dengeli ve tutarlıdır.
> 5. Pek çok durumda etkili davranır. 6. Neşeli ve iyimserdir.
> 7. Sözelleştirmede güçlüğü çok azdır. 8. Aktif, enerjik, uyanıktır.
> 9. Yarışmacıdır. 10. Sorumluluk alabilir. 11. Sosyal ortamlarda rahattır.
> 12. Liderlik rolünü üstlenir. 13. Zeki, espirili ve renklidir.
> 14. İlk bakışta olumlu bir izlenim yaratır. 15. İmpulsif değildir,
> kontrollüdür. 16. Ketlenmemiştir, kendini kolaylıkla ortaya koyabilir.
> 17. Diğer insanlarda kızgınlık ve düşmanlık uyandırır.
> 18. Otoriter rolünde olan kişilerle çatışması vardır."

Kod: `D_T_BANDS` / `SINGLE_D` içinde bu liste **YOK** (yalnızca 28-44 bandı
özeti var) → `MISSING` (CONFLICT-026 sınıfı, içerik eksiği)

## SOURCE-CL-012 · D alt testi genel kural (s.81) — **Visual: CONFIRMED**

Fact — aynen:
> "Alt test 2'nin yorumlanması, birlikte yükselen diğer alt testlere göre
> değişmektedir. **Depresyon çok farklı nedenlerden kaynaklanabilir ve bunlar
> ancak diğer alt testlerdeki yükselmelere bakılarak yorumlanabilir.** **Alt test 2
> ile ilişkin açık davranışsal belirtiler yoksa, intihar riskine karşı dikkatli
> olmak gerekir.**"

Kod karşılaştırması: **sonraki batch** (yorum katmanı kuralı)

## SOURCE-CL-013 · D T-puan bantları (s.81-82) — **Visual: CONFIRMED**

Fact — aynen (kaynak sırası):
| Kaynak | İçerik (kısa) |
|---|---|
| **85 ve üstü T** | "Bir şeye odaklanamayacak ya da açık bir biçimde düşünemeyecek kadar kederli olan bireyleri gösterir." |
| **79 ve üstü T** | Depresif ve kaygılı, benlik saygısı düşük, karamsar, ilgi alanları daralmış, kendini işe yaramaz görür… "**Alt test 2'de yükselme, kişinin o sıradaki işlev düzeyiyle ilgili rahatsızlığı ya da hoşnutsuzluğu hakkında bilgi verebilir**… (Yüksek puanlar her zaman depresyon olarak tanımlanamaz, kişinin o anda çevresinden gelen rahatsızlıklarını da yansıtabilir)." |
| **70-79 T** | "Ciddi ve kendine güveni olmayan bireyleri gösterir… **Hastada depresyonun göstergeleri yoksa ve diğer alt testler yükselmemişse hastanın intihar eğilimi açısından değerlendirilmesi gerekmektedir.**" |
| **60-69 T** | "Bu bireylerde orta düzeyde depresyon, endişe ve karamsarlık göstergesi vardır. Bu duygu durum hali durumsal bir krize bağlı olabileceği gibi kalıcı ve geri dönüşü olmayan bir durum da olabilir." |
| **45-59 T** | "Bu, bireyin yaşamında **iyimserlik ve karamsarlık dengesini** kurduğunun göstergesidir." |
| **28-44 T** | "Olasılıkla neşeli, meraklı, iyimser, aktif ve dışa dönüktürler (Bakınız **Si alt testinin düşüklüğü**). Bu durum bazen bu bireylerin **kayıtsız** gibi algılanmalarına neden olur, bu da diğerlerinde **hostilite** ortaya çıkarır." |

**Kritik gözlem (kaynak içi çakışma):** Kaynak **"79 ve üstü"** ile **"70-79"**
bantlarını **çakışacak biçimde** yazar (79 iki bantta da geçer). Kod bunu
**ilk-eşleşen-kazanır** sırasıyla (79-84 → 70-78) tek anlamlı hâle getirmiştir.

Kod karşılaştırması (bant sınırları):
| Kaynak | Kod | Sonuç |
|---|---|---|
| 85 ve üstü | `85+` | ✅ |
| 79 ve üstü | `79-84` (önce) + `70-78` | ✅ (çakışma tek anlamlı çözülmüş) |
| 70-79 | `70-78` | ✅ (sınır yorumu) |
| 60-69 | `60-69` | ✅ MATCH |
| 45-59 | `45-59` | ✅ MATCH |
| 28-44 | `28-44` (min 0) | ✅ MATCH (etiket) |

**Not:** `clinicalBands('D', gender)` **cinsiyete göre ayrım YAPMIYOR**; ancak
D için kadın normu da (23.86) farklı. Kaynak T-bandı tablolarında cinsiyet
ayrımı bu bölümde görünmüyor (bantlar metin olarak veriliyor) → bu bir tutarsızlık
değil, kaynak da tek bant seti veriyor.
Status: **VERIFIED**

## SOURCE-CODE-011 · D kod bloğu (s.83-87) — **Visual: CONFIRMED** (s.84-87)

Kaynakta **sırayla** tanımlı kod tipleri:

| Kod | Özet / kritik koşul |
|---|---|
| **23 Kodu** | (kodda VAR) Uzun süreli depresyon; **histeroid savunmaların yetersiz kullanılışı**; hastalar **immatür, yetersiz ve bağımlı**; kronik sorunlarına alışkın; **bedensel yakınmalar sıklıkla histerik nitelikte ve değişkendir**. "**En sık üçlü kodlar 231/321, 234/324 ve 237/327'dir.**" Paradoks: 23 kodlu erkekler görünüşte çok fazla başarı yönelimlidir ancak **fark edilmediklerinden yakınırlar**. |
| **24/42 Kodu** | (kodda VAR) İmmatür, bağımlı, benmerkezci; **dürtülerini kontrol etmede zorluk**; sosyal kabul edilmeyen eylem sonrası **rahatsızlık ve pişmanlık**; **"hatta olayla orantılı olmayacak kadar fazla eyleme vuruk"** davranış; **döngüsel**; **içki içme, madde kötüye kullanımı, iş kaybı, öyküsü**; **yasal sorunlar**; "**Çoğunlukla 3, 7 ya da 8 üçüncü yükselen testtir.**" Ergenlerde **ototrite figürlerine karşı küskün, sık kavgaya karışan**; **yasal ihlaller (tutuklanma, mahkumiyet, göz hapsinde olma)**; **evden ya da tedavi merkezlerinden kaçma**; evlilik dışı çocuk sahibi kadınlarda sık; **"Görünüşte belirli bir şeye odaklanmada güçlükleri vardır ve okuldan kaçarlar."** Olası tanı: **Depresif reaksiyon ya da somatoform bozukluk** |
| **243/432 Kodları** | **24/42'ye ek olarak:** kızgınlığı **bastırma ve inkâr** yoluyla duygusal kontrol etmeye çalışırlar. Kızgınlıklarını **pasif-agresif** biçimde ya da (eğer açıksa) **öfke patlamaları** biçiminde ifade ederler. **İmmatürite, bencillik ve başkalarının onları nasıl gördüğüne ilişkin içgörü eksikliği**. **Eyleme vuruk davranışları olan uçlardaki** bireylerle ilişki kurarlar; **antisosyal eğilimleri başkası aracılığıyla tatmin ederler.** |
| **247/427/472 ve 742 Kodları** | (Ayrıca **274** koduna bakınız) **Öfkesinden kaynaklanan aile ve evlilik sorunları**; bunu ifade edemez ve **suçluluk** duyar. **Gergin, endişeli ve sosyal açıdan yetersiz**; **depresyonu** vardır. **Alkol kullanımı ya da epizodik alkol alımı** (depresyonlarını ortadan kaldırma çabası). **İş başarısızlık nedeniyle herhangi bir şeyi denemekten korkuyor** gibi. **Sorunlarının açıkça görülmesine karşın bunları tartışmada samimi ve açık değildirler.** Çok küçük problemlere **aşırı tepki** ve **sanki olağanüstümüş gibi** davranırlar. Erkekler: **bağımlı ve immatür yapıda olmalarına karşın (özellikle test 5 de yüksek ise) sözel olarak saldırgan**; **evlilik sorunları**, **kıskanç**, **kısa süreli evlilikler**; **annelerine daha yakındırlar**. Kadınlar (özellikle **Mf düşükse**) **güçsüz, aşağılanmış, suçlu ve çekingen** görünürler; **başkalarının kendilerini korumasını ve baskı altına almasını ister**; **ifade edilmeyen öfkenin bedelinin ödenmesi**; **öyküsünde çok çalışkan ve başarılı bir baba** vardır. **Olası tanı: Pasif-agresif kişilik bozukluğu / Depresif semptomlar / Anksiyete bozukluğu.** |
| **248 Kodu** | "Depresyon, küskünlük, aile ve evlilik sorunları çok olsa da, bu tür bireyler **24/42 kod tipindekinden daha az açık kızgınlık biçiminde eyleme vurma davranışı** gösterirler. Bunun yerine, kızgınlık için **fanteziler kurarlar**, **başkalarına karşı kendilerini güvensiz, uzak ve bağları kopmuş gibi** hissederler. Ancak **dürtüleri üzerindeki kontrolü kaybetmekten korkarlar** ve **doğal olmayan, rahatsız edici düşünceler** üzerinde çok fazla dururlar. Sıklıkla **başkaları tarafından huzursuz ve nasıl davranacakları belli olmayan kişiler** olarak görülürler. **Çeşitli cinsel sorunlar, intihar düşünceleri ve çok sayıda intihar girişimleri vardır.**" |
| **248 Kodu / Yüksek F Kodu** | "**Temel şizofrenik konfigürasyon**" |
| **25/52 Kodu** | (kodda VAR) Bu koddaki **erkekler içe dönük, pasif, kararsız, depresif**, ancak **idealist** bireylerdir. **Kaygılı ve geri çekilmiş**, **somatik yakınma öyküsü** verirler ve **açık bir biçimde düşünememekten yakınabilirler**. **Nadiren flört ederler** ve **genellikle heteroseksüel uyumları görece olarak kötüdür**. "**Sıklıkla bu kodda erkeklerde, 7, 3, 4 ya da 0 alt testleri de birlikte yükselir.**" **25/52 koddaki kadınlar, depresiftirler ve kendilerine yönelmişlerdir**, ancak **başkalarına dayanmak yerine kendi kendilerine yetmeye çalışırlar**. **Bu kodda ergenler**, genellikle **kardeşleri ya da arkadaşları ile ilişkilerinin kötü olması, utangaçlık, aşırı negativizm** ya da **aşırı duyarlılık** nedeniyle başvururlar. Kişiler arası ilişkilerde **utangaç, pasif ve çekingen** olan bu ergenler, **sıklıkla mükemmeliyetçilik ve titizlikle birlikte aşırı entellektüalizasyon** gösterirler. |

## SOURCE-CODE-012 · D kod bloğu II (s.86-87) — **Visual: CONFIRMED**

| Kod | Özet / **kritik sayısal koşul** |
|---|---|
| **26/62 Kodu** | (kodda VAR) **Alıngan, depresif ve eleştiriye aşırı duyarlı**; altta **güçlü bir kızgınlık duygusu** ve **sıklıkla süreğen kişiler arası ilişki güçlükleri**; **genellikle paranoid eğilim**; **nötr durumları kötü niyetli olarak değerlendirir**; **küskünlük, ajitasyon, yorgunluk ve saldırganlık**; "**Sıklıkla bu bireyler, başkaları onları reddetmeden önce onları reddetme düşüncesi ile ya da bağımlı olmaktan kaçınma aracı olarak kavgaya hazırdırlar.**" **⚠️ KRİTİK KOŞUL:** "**Pa alt testi belirgin bir biçimde yükseldiğinde ve/veya 4 ve 8 alt testi 70 T puanının üzerinde ise, bireyin psikozun erken dönemlerinde olma olasılığı artar.**" **Olası tanı: Psikozun erken dönemi** |
| **27/72 Kodu** (Ayrıca **273/723**, **247/274**; erkekler için **275/725**; kadınlar için **27/72** ve **278/728**) | (kodda VAR) **Psikiyatri polikliniklerine başvuranlar arasında çok görülür.** Gerginlik, depresyon, sinirlilik, kaygı, **suçluluk, kendini değersizleştirme**, aşırı biçimde **kendini sorgulama ve ruminasyonlar**; **yetersizlik duyguları**, **kendine güvenin olmaması**, **iş etkinliğinin azalması**, **uykusuzluk**. **Düşüncelerindeki katılık, doğru ve yanlış konular üzerinde çok fazla durmayı yaratır**; **aşırı kontrollüdürler**; **duygularını açık olarak ifade etmekte zorluk**; **cinsel alanda çatışma**. **Kişiler arası ilişkilerde sıklıkla bağımlılık ve pasiflik** gösterirler. "**En sık görülen üçlü kodlar 270/720, 278/728, 273/723 ve 271/721'dir.**" **⚠️ KRİTİK KOŞUL:** "27 kod tipinde **bazı yükselmeler, bireyin psikoterapi için iyi aday olmasının göstergesidir; çünkü bu genellikle içrel rahatsızlık ve kendini sorgulama eğilimini değiştirmek için güdülenmiş olmanın işaretidir**. Ancak **çok fazla yükselmeler (örneğin, 85 T puanının üstünde) sıklıkla bireyin sözel psikoterapide yeterli derecede odaklanamayacak kadar ajite ve endişeli olduğu anlamına gelir** ve **daha etkili müdahale formları (ilaç gibi) gerekli olabilir.**" |

**Bu batch'in en önemli bulgusu:** Kaynak, yorumu **ikinci ölçek dışındaki ölçeklerin
T değerlerine** bağlıyor: `Pa` ve `4 ve 8` için **70 T** eşiği, `27` için **85 T**
eşiği. Kodun `text` alanı bunları taşımıyor → **CONFLICT-025 genişletmesi**.

## SOURCE-CODE-013 · D kod bloğu III (s.90-91, p53) — **Visual: CONFIRMED**

| Kod | Özet / **kritik koşul** |
|---|---|
| **270 Kodu** | (27/72 ailesi) **Gergin, depresif, sinirli, kendini aşağılayan, suçluluk duyguları**; **yetersizlik ve güvensizlik duyguları**; **aşırı kontrollü olmaya çalışır, duygularını açığa vurmada zorluk**; kişiler arası ilişkilerde **bağımlılık**; **içe dönük tutumları kronik düzeydedir**. **Şizoid kişilik bozukluğu tanısı konulabilir.** |
| **28/82 Kodu** (Uygunsa **281/821**, **284/824** ve **287/827**'ye bakınız) | **Anksiyete ve ajitasyonla birlikte şiddetli depresyon**; **katastrofik şekilde depresyon ve ajitasyon**; **konsantrasyonda azalma, unutkanlık ve konfüzyon** hali ortaya çıkarabilir; **obsesif ruminasyonlar**; **düşünce bozukluğu, yorgunluk**; **kişiler arası ilişkilerden ve aktivitelerden kendilerini izole edip çekilme eğilimleri**; **intihar girişimleri olabilir**. "Dikkat edilmesi gerekir. Bu nedenle **prognoz açısından hastanın değişmesi ihtimali zayıftır.**" **Özellikle yansıra "şizofrenik" özellikler de gösterebilirler.** "**İşitsel ve görsel hallüsinasyonlar ve sistemli hezeyanlar olabilir. Düşünce bozukluğu değerlendirilmelidir.**" **Garip karakterde somatik semptomlar**; **deprese, izole ve çekiniktirler**; **kronik uyum örüntüsü genellikle hastaneye yatmayla son bulur**; "**Bu hastalara en sık konulan tanı manik depresif psikoz, melankoli ve şizoaffektif bozukluktur.**" Özellikle **ergenler**: **başkaları ile duygusal bağlar kurmaktan korkarlar**, **duygusal bağımlılıkları ve cinsellik konusunda çatışmaları vardır**; **çocukluk döneminde tekrarlanan incinme öyküsü**; **karşı cinsle ilişkileri genellikle çok azdır**; **üstelik sorunlar ya da sapkın davranışları içerir**; **okuldan kaçarlar ve madde kötüye kullanım öyküleri vardır**. "**Bu bireylerle terapötik ilişki kurmak zordur, psikoterapi prognozu kötüdür. Psikofarmakoloji en azından başlangıçta yararlı olabilir.**" |
| **281/821 Kodları** | **28/82'ye ek olarak:** "**çok çeşitli somatik yakınmaları vardır. Genellikle bunlar belirsiz ya da medikal yönden atipikir ve titremeler, düşünme güçlükleri ya da hatta somatik delüzyonlar içerebilir. Bu örüntü psikotik bir epizoddan önce gelen kendi üzerinde yoğunlaşmayı temsil ediyor olabilir ve genellikle açık bir gerginlik ve entellektüel konfüzyon ile bağlantılıdır. Diğer bireylerde, özellikle test 3 de yükselmiş ise, bu somatik yakınmalar ve bunlarla bağlantılı davranışlar, terapisti kurtarma davranışlarında bulunmaya teşvik edebilir, ancak birey bu yardımı reddeder.**" |
| **284/824 Kodları** | **Yetişkinlerde** sıklıkla **şizoid ya da şizofrenik durumlarla** bağlantılı ve **F alt testi de yükselmiştir**. 28/82'nin özelliklerine ek olarak **kızgınlık, isyankârlık, başkalarından uzak ve soğuk olma duyguları güçlü**; **dürtü kontrolünü kaybetme korkuları çaktır** "**(özellikle Pd alt testi 80'in üzerinde ise)**" ve **eyleme vuruk davranışlar, garip ve tuhaf şekillerde olur**. **Sosyal alanda ve evlilikte uyumsuzluk** olmasıdır "**(test 4, test 2 ya da 8'in 5 T puanı alanı içinde ise 482/842 kodlarının yorumuna bakınız)**." **Ergenlerde** bu kod **yetmiyor**; **daha çok birçok ergende bulunan isyankârlığı ve sosyal gruptan uzaklaşmayı yansıtır**; **dürtü kontrolünde zayıflık vardır** ve bunun yanı sıra **doğal olmayan davranışlar ve duygularda kuşkulu görülür**, ancak **altta yatan patoloji daha az şiddetlidir**. |
| **287/827 Kodları** | **Depresyon, kaygı ve tanjansıyel düşünce süreçleri**; **kendilerini insanlardan uzak hissederler, eleştiriye çok fazla duyarlıdırlar ve genelde insanlara güvenmezler**. **Çoğu zaman belirli bir şeye odaklanamama, baş dönmesi epizodları, mental konfüzyon, uykusuzluk, görev ve sorumlulukları yerine getirme yeteneğinin azalması** gibi önemli mental güçlükler. "**Ayrıca, değişken ya da uygunsuz duygular, hatta hallüsinasyonlar ya da açık düşünce bozuklukları vardır.**" **Bağımlılık korkularına bağlı olarak yakın kişilerarası ilişkilerden kaçınırlar ve duygusal bağlanmadan korkarlar.** **Cinsellik ve kendini ifade etme konularında çatışmaları vardır.** **İntihar düşünceleri ve tehditler çok olasıdır** ve "**eğer K alt testi 50 T puanının altında ise ve Ma alt testi 70 T puanının üzerinde ise bunlar dikkate değerlendirilmelidir. İntihar çoğunlukla garip biçimlerde gerçekleştirilir.**" |
| **29/92 Kodu** | "Bu gruptaki kişiler **benmerkezci ve narsisistik olma eğilimindedirler. Kendi değerlerini abartırlar.**" |

## SOURCE-CL-014 · Tablo 10 — Histeri (Hy) alt testi anahtarı (s.94, p55 L) — **Visual: CONFIRMED**

Fact — aynen (**Madde Sayısı: 60**):
**Doğru (13):** `10, 23, 32, 43, 44, 47, 76, 114, 179, 186, 189, 238, 253`
**Yanlış (47):** `2, 3, 6, 7, 8, 9, 12, 26, 30, 51, 55, 71, 89, 93, 103, 107,
109, 124, 128, 129, 136, 137, 141, 147, 153, 160, 162, 163, 170, 172, 174, 175,
180, 188, 190, 192, 201, 213, 230, 234, 243, 265, 267, 274, 279, 289, 292`
Norm: "Erkeklerde ortalama: **19.31**, kadınlarda ortalama: **22.33**
(Savaşır, 1981)"

**⚠️ OCR UYARISI #2 (bu batch) — `OCR_ISSUES.md` TABLE-ROW-SHIFT:**
Ham OCR, `55`, `51` ve `30` maddelerini **Doğru** listesine kaydırdı (satır
kayması). 400 dpi görsel okuma bunların **Yanlış** listesinde olduğunu gösterdi.
OCR bu haliyle karşılaştırılsaydı **3 maddede sahte P0 fark** raporlanacaktı.

Kod karşılaştırması (`SCORING_KEYS.Hy`):
- Doğru: kaynak 13 ↔ kod 13 → **BİREBİR MATCH** ✅
- Yanlış: kaynak 47 ↔ kod 47 → **BİREBİR MATCH** ✅
- Toplam 60 = kitabın "Madde Sayısı: 60" ✅
- Norm **Erkek 19.31** ✅ MATCH
- Norm **Kadın: kaynak metni 22.33 ↔ kod 18.12** → **KAYNAK İÇİ ÇELİŞKİ** →
  CONFLICT-028 (REJECTED, aşağıda)
Status: anahtar **VERIFIED** · norm **REJECTED (kod doğru)**

## SOURCE-CL-015 · Hy alt testi girişi (s.93, p54 R)

Fact — aynen:
> "**3. Histeri (Hy) Alt Testi** — Histeri, **fizik bir neden olmadan bir organın
> işlevinin kaybedilmesidir.** Bu alt test **nevrotik bozukluklardan konversiyon
> histerisine tanı koymada yardımcı olmak amacıyla geliştirilmiştir.** Genel bir
> çocuksuluk, çabuk sinirlenme, neşe…"

Kod karşılaştırması: `HY_T_BANDS` ve Hy yorumu → sonraki batch (s.95+)

## SOURCE-CODE-014 · D kod bloğu IV (s.88, p52 L) — **Visual: CONFIRMED**

| Kod | Özet / **kritik sayısal koşul** |
|---|---|
| **273/723 Kodları** | **Pasif hastalar**; kişiler arası ilişkilerinde **bağımlı olduklarında kendilerini çok rahat hissederler**; **korunduklarında ve başkalarının bakımı altına alındıklarında bu duruma çok kolay uyum sağlarlar**; kendileri için **çok yüksek standartlar belirleyerek stres yaşarlar**; stres arttığında **başkalarından yardım isterler**, **depresyon ve endişeleri içinde belirgin biçimde ve yapışırcasına bağımlı hale gelirler**; **görünen çaresizlik, uysallık ve kendini değersizleştirme düşünceleri başkalarını onları kurtarma ve korumaya yöneltir**; "**Hs alt testi de yükselmişse**, bu bireyler kaygıyla bağlantılı somatik yakınmaların yanı sıra, **kendine acıma, suçlama ve başkalarının onlara bakmasını istemelerine karşın sosyal geri çekilme gösterirler**." |
| **274/724 Kodları** | **⚠️ KOŞUL:** "(Eğer **test 4 ve 7 birbirlerinin 5 T puanı alanı içindeyse** 247 ve 427 kod yorumlarına da bakınız.)" **Yoğun yetersizlik ve suçluluk duyguları**; **kendilerini küçülterek zayıflık ve yetersizlikleriyle sürekli uğraşırlar**; **diğer kişilere olan aşırı bağımlılıklarını kabul etmezler**; "**Çoklu nevrotik belirtilerin gerçek bir düşünce bozukluğunu maskelemesi ihtimali dikkatle incelenmelidir. İntihar düşünceleri, niyeti ve planı sıklıkla görülür. Bu açıdan değerlendirilmelidir.**" **Olası klinik tanı depresif reaksiyon**, ancak **kişilik yapıları oldukça kalıcıdır**; **temel anksiyetelerini ve davranış biçimlerini değiştirmek çok zordur**. **Erkekler** çoğunlukla **annelerine bağımlıdır**; bağımlı ilişki ararlar ama **eşlik eden kontrolü istemez ve ilişkiyi sonlandırırlar**; "**Alt test 3 yükseldiğinde kronik alkolizm olasılığı fazladır**" (alkol kaygıyı azaltmak ve depresyonla başa çıkmak için). **Kadınlar** sıklıkla **babaları tarafından ilgi ve övünme nesnesi olmuşlardır**; **kendilerini izole ederler, zayıf ve çekingen görünmeye çalışırlar** (**özellikle alt test 5 düşükse**); **evli erkeklerle uzun süreli ilişkileri olabilir**. |
| **275/725 Kodları** | (erkekler için önerilen kod) **Endişe, depresyon ve aşırı düzeyde aynı şeyler üzerinde durmaya ek olarak çekingenlik**; **kronik bir başarısızlık duygusu** ya da **kendilik değeri konusunda ambivalans**; **kendilerini yetersiz, zayıf, aşağılanmış, suçlu ve pasif olarak tanımlarlar** (**4 alt testi düşük olduğunda daha belirgindir**); **sürekli başkalarının onları küçümsediği ilişkiler arayarak depresyonları için bedel öderler** ve bu ilişkilerde **çok rahat ederler**; **karşı cinsle ilişkilerde güçlükler** vardır. |

## SOURCE-CODE-015 · D kod bloğu V — 278/728 (s.89, p52 R) — **Visual: CONFIRMED**

Fact — aynen (**kritik koşul 300 dpi görselle doğrulandı**):
> **278/728 Kodları** — **Gergin, kaygılı, depresif, aşırı biçimde aynı şeyler üstünde
> duran ve kendilerine ilişkin kuşkularla dolu** olan bu bireylerde **intihar
> düşüncesi ya da girişimi olasılığı yüksektir**. **Obsesif düşünme, korkular ve
> fobiler** çok görülür; **kendi başarısızlıkları üzerinde yoğunlaşırlar**; **çok
> titiz ve mükemmeliyetçidirler**; kendileri ve başkaları için **çok yüksek
> standartlar** koyarlar ve ulaşamadıklarında **çok fazla suçluluk** yaşarlar;
> **aşırı kendini sorgulama ve kendine baskı** → **belirli bir şeye odaklanma
> güçlükleri ve performansta düşme** → depresyon ve kaygı artar. **Karşı cinsle
> duygusal bağlantı kurmada özel zorluklar**; **ilişkilerin çok ufak ayrıntıları
> üzerinde odaklanma**; **kontrol, eleştiri, kabul edilme ve kızgınlığın ifadesi
> sorun alanlarıdır**.

**⚠️ KRİTİK KOŞUL (T eşikleri):**
> "Bu kodda, özellikle alt testlerden **K ve Hs, 50 T puanının altında** olduğunda
> **ve/veya Ma alt testi yükseldiğinde intihar olasılığı dikkatle
> değerlendirilmelidir.** Bu kodda **Ma alt testinin yükselmesi, depresyonun ajite
> yönünü gösterir.** Eğer **Si** alt testi yükselmişse bireyin depresyonu **daha çok
> kroniktir**… Alt testlerden **Pd düşük olduğunda pasiflik ve çekingenlik ön
> plandadır**, sıklıkla **cinsel ilgilerde azalma ve cinsel yetersizlik** eşlik eder."

**Kadınlar (5 alt testi düşmüşse):** **bedel ödemeleri gerektiğini hissederler**,
**başkalarının kızgınlığını arttırırlar**, **mazohistik biçimde kendilerine
kızarlar**; **baş ağrıları, sırt ağrıları ve cinsel güçlükleri içeren çok çeşitli
fiziksel yakınmalar**; **çoklu nevrotik semptomlar**; **depresyon, sinirlilik,
obsesyonlar**; **kararsızlık, şüphe ve kaygı**; **düşünce bozukluğunun
değerlendirilmesi önemlidir**; **sosyal açıdan yetersiz**; "**Aşırı obsesyonları
için psikofarmolojik tedavi gerekir. Psikoterapide daha çok problem çözücü ve
destekleyici terapi tercih edilmelidir.**"

## SOURCE-CODE-016 · D kod bloğu KAPANIŞI (s.92, p54 L) — **Visual: CONFIRMED**

| Kod | Özet |
|---|---|
| **29/92 (devamı)** | **Yüksek enerji düzeyi** ancak bu **"bir kontrol kaybını telafi etme girişimini"** temsil eder. **Üç tip birey bu kodu elde eder:** (1) **Ajite depresyon** — ağlama, feryat etme, depresif ruminasyonlar; **çocuklar gibi ilgi çekmek için çok fazla duygusal** olabilirler. (2) **Alttaki depresyonla manik savunmalar kullanarak başa çıkmaya çalışanlar** — büyüklük düşünceleri ve inkâr depresyonu maskelemede yeterli olabilir, **ancak çoğunlukla uzun süre etkili değildir**; sonrasında **çok fazla içki içme davranışı** ortaya çıkar. (3) **Organik beyin sendromu olanlar** — işlevsellik ve yeteneklerindeki azalmanın farkında ama **inkâr etmeye ve saklamaya çalışan** bireyler; **daha önce kolaylıkla yaptıkları şeyleri yapamamanın eksikliğine bağlı ajitasyon** gösterirler. "**Sıklıkla test 3 ya da 4, üçüncü en yüksek testtir.**" |
| **20/02 Kodu** | **Sinirlilik, zayıflık, yorgunluk, benlik değerinde düşme** belirgin özelliklerdir; kod **"sosyal olarak geri çekilmiş hafif, ancak kronik depresyonu"** gösterir; **depresyon sıklıkla kişiler arası ve sosyal becerilerin kötü olmasıyla bağlantılıdır** ve **aşağılık ve utangaçlık duyguları** ile birliktedir; **hem yetişkinler hem ergenler özellikle sosyal ilişkilerde sinirlidirler**, **engellenmiş hissederler**, **çok az arkadaşları vardır**; "**Çoğu (özellikle test 1 düşük ise) fiziksel olarak çekici olmadığını da düşünür.**" **Uykusuzluk, suçluluk duyguları ve endişe** sıklıkla vardır; "**Bu kod tipinde çoğunlukla test 7 ya da 4, üçüncü en yüksek testtir.**" **Olası tanı: Pasif-agresif kişilik** |
| **207 Kodu** | **Gergin, kaygılı, ürkek** kişilerdir; **kendilik değerinde düşme**; **şizoid içe çekilme**; **sosyal ortamlarda yetersizlik duygusu ve gerçek sosyal beceri eksikliği** ile **içe dönük tutum**; **insanlarla etkileşimlerinde güvensiz**; **karşı cinsle ilişkilerinde mutsuz**; **depresyonları ile yaşamayı öğrenmişlerdir**; "**Bu bireylerin saldırganlık ve öfke patlamaları göstermesi beklenmez.**" |

## SOURCE-CL-016 · Hy (3) T-puan bantları (s.95, p55 R) — **Visual: CONFIRMED**

Fact — aynen (**300 dpi görsel, 4 ayrı kadraj**):

| Bant | Kaynak metni (özet) | Kod (`HY_T_BANDS`) |
|---|---|---|
| **85 T ve üstü** | "Aşırı immatür, benmerkezci ve bağımlı kişilerdir. Bastırma savunma mekanizmasını kullanmaları şaşırtıcıdır. **Bu içgörü eksikliği olduğunun göstergesidir.** Semptomlar gerçek organik patolojiye uymamaktadır. Genellikle kroniktir ve ciddi rijidite vardır." | ✅ MATCH (cümle sırası farkı: kodda "içgörü" cümlesi sonda) |
| **76-85 T** | "70-75 T puanında bildirilen özelliklere ek olarak… uzun süredir devam eden gerginliğe bağlı konversif semptomlar… başağrısı, sırt ağrısı, göğüs ağrısı, güçsüzlük, baş dönmesi ve baygınlık… organize olmuş bedensel yakınmaları vardır." | ✅ MATCH |
| **70-75 T** | "bastırma ve inkârı çok fazla kullanan, çok fazla itaat eden (uyan), saf ve çocuksu biçimde benmerkezci… ikincil kazanç… teşhirci ve seksüel ya da saldırganlık düzeyinde dışa vuran davranışlar…" | ✅ MATCH |
| **60-69 T** | "**Burada iki farklı örüntü vardır:** 1. Eğer **Hs'nin yükselmesi Hy ile aynı düzeyde ise ve D alt testi, 1 ve 3 alt testlerinden 10 T puanı düşükse** histerik kişiye işaret etmektedir… 2. Eğer **Hy alt testi Hs alt testinden 10 T puanı yüksekse** histerik özellikler belirgindir…" | ✅ MATCH (+ **T-eşiği** → CONFLICT-027) |
| **45-59 T** | "Bu alana özgü bir tanımlama yoktur." | ✅ MATCH |
| **24-44 T** | "Kendilerini sürekli eleştirirler. Olumlu kişilerarası ilişkileri inkâr etme eğilimi vardır. **Si alt testinde yükselme**, bireyin diğer insanlardan kaçma eğiliminde olduğunu göstermektedir." | ✅ MATCH metin · ⚠️ etiket kodda "T 22-44" (kaynak 24) |

**"Sadece Hy alt testinin yükselmesi":** kaynak aynen → "Sadece **3'ün yüksek
olduğu** ve **diğer hiçbir alt testin 70 T puanının üstünde olmadığı** durumda"
↔ kod `SINGLE_HY.rule` = **birebir MATCH** ✅ · kaynak metni (kabul edilme/sevgi
gereksinimi, reddedilme endişesi, tartışmalarda iyimserlik vurgusu) kodda **MATCH** ✅

**6/6 bant + tek-yükselme kuralı VERIFIED.**

## SOURCE-CL-017 · Hy bloğu: diğer alt testlerle ilişki (s.96, p56 L)

**"Yüksek 3 / Yüksek K Kodu":** "Alt testler **3 ve K ikisi birden yüksek**
olduğunda ve **F ve Sc alt testleri düşük** olduğunda, sevilme, kabul edilme ve
kendisini yaşamı üzerinde kontrol sağlıyor gibi gösterme gereksinimi çok
abartılıdır… çok katı bir optimizm gösterirler… **kızgınlık, bozulma ya da
zedeleyici duyguların olduğu ya da bağımsız karar vermeleri ya da güç
kullanmaları gereken durumlardan kaçınırlar** (ya da çok rahatsız olurlar)."
→ **Kodda YOK** (CONFLICT-024)

## SOURCE-CODE-017 · Hy kod bloğu I (s.96-99) — **Visual: CONFIRMED**

| Kod | Kaynak başlığı | Kritik içerik / koşul |
|---|---|---|
| **31 Kodu** | s.96 | "(**Bakınız 13/31 Kodu**)" → **D bloğunun 13/31 metnine atıf** |
| **32 Kodu** | s.96-97 | "ⓘ Eğer **2 alt testi, 3 alt testinin 5 T puanı sınırları içinde ise** 23 koduna da bakınız." — "**23 kod tiplerinin aksine**, bu bireyler sağlıkları ve bir ölçüde de belirgin olmayan depresyonları ile fazlaca ilgilenirler. Yorgunluk, gastrik yakınmalar, baş ağrıları ve baş dönmesi geneldir… Erkekler… **test 1, 8 ve 9 sıklıkla üçüncü en yüksek testtir.** … **Kadınlar için çoğunlukla 1, 4 ve 8, üçüncü en yüksek testtir.**" — "Bazen bu profil **menapoz güçlükleri** ile bağlantılıdır." |
| **321 Kodu** | s.97 | "**32 kodlu bireylerin özelliklerine ek olarak**… çok çeşitli hipokondriyak yakınmalar… **kadınlar sıklıkla tekrarlayan jinekolojik yakınmalar getirir ve/veya histerektomi olurlar**… **Erkekler sıklıkla gastrik rahatsızlık ya da ülser gösterirler.**" + "**kronik nevrotik bir durumu** ortaya koyan bu hastalarda… **Tedavi motivasyonları düşüktür.**" |
| **34/43 Kodu** | s.97-98 | "Her iki kod tipi de **kızgın, immatür ve bencildir**. Evlilik uyumsuzluğu, rastgele cinsel ve yüzeysel ilişkiler, boşanma, alkolizm… **En belirgin özellikleri kronik ve şiddetli öfkedir.**" + "**3 ve 4'ün göreceli yükseklikleri** bu bireylerin kızgınlıklarını ve diğer impulslarını **ne ölçüde ketlediğinin (eğer 3 yüksekse)**, ya da **öfkelerinin daha fazla ifade edildiğinin (eğer 4 yüksekse)** bir göstergesidir." + **Olası tanı: Pasif agresif kişilik bozukluğu, agresif tip** |
| **Yüksek 3 / Düşük 4 Kodu** | s.98 | "**Alt test 3'ün önemli ölçüde yüksek** olduğu durumda, birey kızgınlık duygularını **dolaylı olarak** gösterir… **bağımlılık–bağımsızlık çatışması**… **bastırma, inkâr ve kızgınlığın aşırı kontrol edilmesinden** dolayı öfke patlamaları…" |
| **34 Kodu (4 dominant)** | s.98 | "**34 kodlarında, 4'ün 3'ten önemli ölçüde yüksek olduğu durumlarda**, kızgınlık baskındır, ancak **uzun süre baskı altında tutulmuştur** ve sonra **öfke patlamaları ile ifade edilir**, hatta bazen **ciddi saldırı ya da cinayetlerle sonlanır**… **3'te bastırma, 4'te saldırganlık fazladır, 3 yüksek, 4 oldukça yüksek ise pasif-agresif kişiliktir.**" |
| **345/435/534 Kodları** | s.99 (**görsel doğrulandı — başlıkta 3 varyant**) | "**immatur ve genellikle cinsel yönden yetersizdirler**… teşhircilik görülebilir, **homoseksüel olma korkuları** vardır. **⚠️ KOŞUL: Alt test 3, 4'ten yüksekse VE K alt testi 50 T puanının üstündeyse**, duyguların ve isteklerin eyleme dökülme olasılığı düşüktür." (**300 dpi görsel doğrulandı**) |
| **346/436 Kodları** | s.99 | "**Eğer 6 alt testi, 3 alt testinin 5 T puanı sınırları içinde ise, 36/63 kodlarına da bakınız.**" — dönemsel eyleme vuruk davranış öyküleri; eleştiriye aşırı duyarlılık; **kızgınlık aile üyelerine yöneliktir**; **psikolojik tedaviyi reddederler** |
| **35/53 Kodu** | s.99 | "Bu koddaki **erkekler pasif ve hatta geri çekilme eğilimindedirler**… ancak **çok güçlü ilgi gereksinimleri** vardır… **4 ya da 6 genellikle üçüncü yüksek testtir.**" |
| **36/63 Kodu** | s.99-100 | "Yüzeyde, bu bireyler **eleştiriye aşırı duyarlı, kuşkulu, gergin ve hatta şüpheci**…" |
| **54/45 notu** | s.99 | "**Yorumlama 5'teki yükselmeyi dikkate almamak gibi almakla daha iyi yapılabilir. Sonra, 5 alt testi yükselmesinin yorumu buna eklenebilir.**" |

## SOURCE-CODE-018 · Hy kod bloğu II (s.100-101, p58) — **Visual: CONFIRMED**

| Kod | İçerik / **koşul** |
|---|---|
| **36/63 devamı** (s.100) | "Sıklıkla **baş ağrıları ya da gastrointestinal yakınmaları** da vardır. Sorunlar ortaya çıktığında **başkalarını ya da durumları suçlarlar**… **aile üyelerine karşı yaygın ve uzun süredir devam eden kızgınlık duyguları**… eleştiriye aşırı duyarlı… Sıklıkla **üçüncü yükselen test Si ya da Sc'dir**." |
| **⚠️ KOŞUL (36/63)** | "**Alt test 6, 3'ten 5 ya da daha fazla T puanı yüksek olduğunda**, bu birey güç ve prestij kazanmak ister ve **kızgın bir biçimde bencildir**, hatta bu **acımasız manipülasyonlar** noktasına gidebilir… **Alt test 3, 6'dan yüksekse**, bu tür bireyler **kızgınlıklarının farkında değildirler**…" |
| **37/73 Kodu** | "**Çok sık rastlanmayan** bir koddur; gerginlik, anksiyete, uykusuzluk, kronik rahatsızlık, diğer bedensel yakınmalar ve **düşük akademik başarı** ile bağlantılıdır. Altında **çözümlenmemiş bağımlılık istekleri, yetersizlik duyguları** yatar; **bastırmayı kullanırlar**… **Her iki cinsiyette de 1, 2 ve 4 alt testleri sıklıkla üçüncü en yüksek testtir.** Birey düşünce ve davranışlarında **tuhaf ve gariptir**… **kendilerini yabancılaşmış hissetseler de abartılmış bir sevilme gereksinimi duyarlar, ancak bağlanmaktan korkarlar**… **otistik** [geri çekilme]… **Gerçek olmama duyguları ve duygusal uygunsuzluğa bulanık görme, baş dönmesi, ateş basması ve baş ağrıları eşlik eder.** Bazıları **kısa, cinsellikle dolu psikotik epizodlar** gösterir ve **bunu daha sonra hatırlamazlar**." |
| **38/83 Kodu** (s.101) | "Bu hastalar **ruhsal karmaşa** içindedirler. **Düşünme ve konsantrasyon bozukluklarından** yakınırlar. Psikolojik stres, **fiziksel semptomlarla ifade edilir**… **immatur, egosantrik ve bağımlılık gibi histerik özelliklerin yanı sıra hostilite, gerginlik ve endişe** sergilerler. **Gerçek psikotik olabilirler. Bir düşünce bozukluğu ihtimali dikkatle değerlendirilmelidir.** … **obsesif düşüncelere, açık delüzyona, hallüsinasyonlara, anlamsız ve enkoheran konuşmaya** rastlanabilir. **Destekleyici yöntemler telkin edilmelidir.**" **Olası Tanı: Şizofreni · Bazı durumlarda histerik nevroz** |
| **39/93 Kodu** (s.101) | "**Girişken, dışadönük ve açık olarak kendine güvenen** kişilerdir; ancak **çok yüzeysel** olabilirler (**özellikle eğer alt test Si 40 T puanının altında ise**). Genellikle **sözel olarak saldırgandırlar**, **bağımlılık-bağımsızlık çatışmaları** vardır ve **özellikle baskıcı anneye karşı kızgın** olarak tanımlanırlar. Klinik ortamlarda **dönemsel anksiyete ve akut rahatsızlık öyküleri** vardır… **çarpıntı, taşikardi ve gastrointestinal semptomlar** eşlik eder… **guvenceyle birlikte verilen semptomatik tedaviye iyi yanıt verirler.** **En sık görülen üçlü kod tipi 394/934'tür.**" |
| **30/03 Kodu** (s.101) | "**Nadir görülen** bu kod **pasif, bağımlı ve geri çekilme boyutunda sosyal yönden pasif** bireylerle bağlantılıdır. Ancak bu tür bir uyumda **göreceli olarak rahat** görünürler ve **sosyal durumlardan kaçmayı ve rahatsız edici duygularını bastırmayı** [tercih ederler]… **Üçüncü en yüksek test 1 ve 2'dir.**" |

## SOURCE-CL-018 · **NEVROTİK ÜÇLÜ PROFİLLERİ** (s.103-106, p59 R – p61 L) — **Visual: CONFIRMED**

Giriş (s.103): "**Nevrotik üçlü içindeki üç alt testin ilişkileri çerçevesinde en
sık karşılaşılan DÖRT KONFİGÜRASYON vardır.**"

| # | Konfigürasyon | Kaynak koşulu (**görsel doğrulandı**) | Şekil |
|---|---|---|---|
| **1** | **Konversiyon vadisi** | "Hs ve Hy alt testleri **yükselmiş**, **D alt testi düşmüştür**." Açıklama: "Bu konfigürasyona sahip bir hasta **gerginlik yaratan sıkıntılarını rasyonel ya da sosyal olarak daha kabul edilebilir durumların altında gizlemektedir.** Konfigürasyonun **yüksekliği hastanın yaşadığı gerginliğin düzeyini** yansıtır." | **Şekil 17** |
| **2** | **Basamak orantısı** (asamalı) | "**Üç alt test de 70 T puanın üzerindedir**" ve "temel örüntü **1 alt testi en yukarıda** olmak üzere **2 ve 3 sırasıyla daha altta** yer alacak şekildedir." Ek (s.104): "Bu bireyler **en küçük işlev bozukluklarına bile aşırı duyarlık** gösteren, somatik bilgileri belirgin kişilerdir… **Kısa süreli psikolojik tedavilerde prognoz iyi değildir.** Bu konfigürasyona **35 yaşın üzerinde ve kendilerini 'tepeyi aşmış' olarak gören erkek hastalarda** sıklıkla rastlanır." | **Şekil 18** |
| **3** | **Şapka** | "**Alt test Hs 70 T puanının altındayken alt test 2 ve 3, 70 T puanının üzerindeyse** bu hastalar **emosyonel olarak aşırı kontrol** gösterirler ve **kendilerini sıkıştırılmış gibi** hissettiklerini söylerler. Genellikle **yorgun, gergin, kendilerine ilişkin şüphelerle dolu**durlar ve bu nedenle **iş yapmazlar**. **Bağımlı ve immatür** olarak tanımlanırlar. **Tedavi motivasyonları düşüktür.**" Özellik: "**Alt test 2'nin 1 ve 3'ten daha fazla yükselmiş olmasıdır.**" | **Şekil 19** |
| **4** | **Yükselen eğilim** | "Her **üç alt test de 70 T puanının üzerindedir ve her bir alt test bir öncekinden daha yüksektir.**" (s.106: yaşam boyu süregelen hastalık geçmişi, frijidite, evlilik sorunları olan **kadınlarda**; **erkeklerde** kronik anksiyete + gastrit/ülser) | **Şekil 20** |

## SOURCE-CL-019 · Tablo 11 — Psikopatik Sapma (Pd) alt testi anahtarı (s.108, p62 L) — **Visual: CONFIRMED**

Fact — aynen (**Madde Sayısı: 50**; 400 dpi + **600 dpi dikiş kadrajı**):

**Doğru (24):** `16, 21, 24, 32, 33, 35, 38, 42, 61, 67, 84, 94, 102, 106, 110,
118, 127, 215, 216, 224, 239, 244, 245, 284`

**Yanlış (26):** `8, 20, 37, 82, 91, 96, 107, 134, 137, 141, 155, 170, 171, 173,
180, 183, 201, 231, 235, 237, 248, 267, 287, 289, 294, 296`

Norm: "Erkeklerde ortalama **16.62**, kadınlarda ortalama: **18.12** (Savaşır, 1981)"

**⚠️ SPINE-CLIP uyarısı:** Dikiş (spine) tablonun **Tam 5. sütunundan** geçiyor
(`35/215`, `96/231` civarı). Değerler **600 dpi'lık ayrı kadrajla** teyit edildi:
`33, 35, 38, 42` / `127, 215, 216, 224` — hiçbiri dikişe kurban gitmemiş.

Kod karşılaştırması (`SCORING_KEYS.Pd`, `cmp-tablo11.ts`):
- Doğru: kaynak 24 ↔ kod 24 → **BİREBİR MATCH** ✅
- Yanlış: kaynak 26 ↔ kod 26 → **BİREBİR MATCH** ✅
- Toplam **50 = kitabın "Madde Sayısı: 50"** ✅ → bağımsız tutarlılık kanıtı
- **Ek 9 (`SOURCE-KEY-002`) ile çapraz doğrulama** ✓
Status: **VERIFIED**

## SOURCE-CL-020 · Pd T-puan bantları + düşük puan (s.109-110) — **Visual: CONFIRMED**

Pd **yüksek** puan (Graham 1987) maddeleri 1-43 (s.107-109): 43 madde
(ör. 1. toplum kurallarına uymada güçlük · 8. impulsif · 19. beğenilir, ilk imajı
iyidir · 20. kişilerarası ilişkileri yüzeyeldir · 21. sıcak ve yakın ilişkiler
kuramaz · **40. "Psikoterapi ya da danışmanlıkla değişme prognozu kötüdür."**)

Pd **düşük** puanlanan birey (12 madde, s.109): geleneksel ve itaatkâr · otoriteye
boyun eğer · pasif, itaatkâr ve çekingen · diğerlerinin nasıl tepki vereceğini
düşünür · samimi ve güvenilirdir · enerji düzeyi düşük · mevki ve güvencede olmaya
dikkat eder · ilgi alanları daralmıştır · yaratıcı ve spontan değildir · **inatçıdır**
· kuralcı ve katıdır · erkekse cinsellikle çok ilgili değildir, kadınlardan korkar

**T-puan bantları (300 dpi görsel doğrulandı):**

| Bant | Kaynak metni | Kod (`PD_T_BANDS`) |
|---|---|---|
| **80 T ve üstü** | "70-79 T puanında verilen özelliklere ek olarak bu yükselme **klinik tanı olarak psikopatik bir bireyi** göstermektedir. **Antisosyal davranışlar, otorite figürleri ile çatışma** vardır. **Diğerleriyle kendi gereksinimlerini nasıl karşılayabileceklerine bakarak ilişki kurarlar.**" | `80–∞` ✅ MATCH |
| **70-79 T** | "**Öfkeli, impulsif, duygusal açıdan yüzeysel, yordanamaz davranışları** olan kişiler… **sosyal uyumsuzluk, otoriteye ve diğerlerine karşı olma** davranışları…" + (s.110) mükemmeliyetçi/narsisistik kavramlar, kızgınlığın aile/otorite/topluma yönelmesi, **"Patolojinin var olup olmadığının belirlenmesi için, bireyin hem yaşam durumu, hem de yaşı dikkate alınmalıdır."** | `70–79` ✅ MATCH |
| **60-69 T** | "**Risk alabilen, enerjik, sosyal, maceraperest ve atılgan**… ancak engellendiklerinde bu özellikler **huzursuzluk, saldırganlık ve sosyal olarak uyumlu olmayan davranış** biçimine dönüşebilir." | `60–69` ✅ MATCH |
| **45-59 T** | "**Aşırı kontrol koyma ve kısıtlanma genellikle azdır. Sosyal kurallara kısmen uyum vardır.**" | `45–59` ✅ MATCH |
| **20-44 T** | "**Durağan, pasif ve atılgan olmayan** bireylerdir. **Maceraperest değildirler** ve sıklıkla **sosyal geleneklere uyma konusunda bağımlı ve hatta katıdırlar**… **çok sevgi dolu olsalar da cinsel ilişkiye girmek konusunda girişken değildirler**." | `0–44` ✅ MATCH |

**5/5 bant MATCH.**

**Ek not (s.110):** "Yüksek 4 profilleri (**yetişkin normları kullanıldığında**)"
→ norm seçiminin yaşla ilişkisi (CONFLICT-027 notu).

---

# PHASE 9/10 batch 11 — Pd (4) kod bloğu I (kitap s.111-113)

## SOURCE-CODE-PD-001 · "Sadece Pd alt testinin yükselmesi" (s.111, p63 R)

Fact — aynen (**Visual: CONFIRMED**, 340 dpi kadraj `v_pd111_rule.png`):
> "Sadece Pd alt testinin yükselmesi: Pd alt testinin **diğer testlerden en az 10
> ya da daha fazla T puanı yukarıda olmasıdır**. Bunlar, impulsif, küskün, isyankar
> ve genelde kurallar, düzenlemeler ve otoriteyi kabullenmekte güçlükleri olan
> bireylerdir. Sıklıkla yasal sorunları olabilir. İnsan canlısı olabilirler (eğer
> test 0 düşükse), ancak diğerleriyle ilişkileri yüzeysel, yapay ve kısadır. […]
> Alt test Si **30 T puanına** yaklaşırsa, bu sorunlar daha kalıcı ve şiddetlidir,
> ancak birey hoş ve rahat görüntüsü verebilir."

Kod: `SINGLE_PD` (`mmpiSource.ts:506`) → `rule: 'Pd alt testi diğer testlerden en az
10 T puanı yukarıda olduğunda'`; metin **birebir MATCH** ✅ (Si 30 T notu dahil).
Tespit (`mmpiInterpretation.ts:229`): `t('Pd') >= 70 && t('Pd') - others('Pd') >= 10`
→ "en az 10" **MATCH**; `Pd >= 70` koşulu bu cümlede **yok** → CONFLICT-027
kapsamına eklendi.
Status: **VERIFIED** (metin + kural) · `Pd >= 70` **UNVERIFIED**

## SOURCE-CODE-PD-002 · Pd alt testinin diğer alt testlerle ilişkisi (s.111)

Fact — aynen:
> "Pd alt testinin diğer alt testlerle ilişkisi:
> **41/14 Kodu (Bakınız 14/41 Kodu)**
> **42/24 Kodu (Bakınız 24/42 Kodu)**
> **43/34 Kodu (Bakınız 34/43 Kodu)**
> **Yüksek 4/Düşük 5 Kodu** (Ayrıca Mf alt testinin düşüklüğüne de bakınız)"

Kod: `41/14` → `CODES['14']` = **VAR** ✅ · `42/24` → `CODES['24']` **VAR** ✅ ·
`43/34` → `CODES['34']` **VAR** ✅ (kaynak da metni 14/41, 24/42, 34/43'e yolluyor)
· **`Yüksek 4/Düşük 5` → kodda YOK** ❌
Status: 3/4 VERIFIED · `Yüksek 4/Düşük 5` → CONFLICT-024 kapsamı

## SOURCE-CODE-PD-003 · "Yüksek 4 / Düşük 5" örüntüsü (s.111-112, p63 R–p64 L)

Fact — aynen (≈1 tam sayfa metin):
> "**Erkeklerde düşük 5**, bireyin kendini erkeksi, hatta aşırı erkeksi gösterme
> çabasını yansıtır. […] Orta ya da üst sınıftan ve yüksekokul eğitimi olan
> erkeklerde bu örüntü, yetersizlik duygularını, özellikle kadınlara karşı
> […] kadınları aşağılarlar. **Ergenlerde bu örüntü, açık suçluluk ile
> bağlantılıdır.** Bu örüntüdeki **kadınlar kızgındırlar**, ancak bu duygularını
> doğrudan ifade edemezler. Bunların kızgınlığı özel olarak erkeklere yöneliktir
> ve heteroseksüel sorunlar beklenir. […] aşırı talepkar ve bağımlıdırlar.
> Erkeklere karşı olan kızgınlıklarını **pasif-agresif biçimde cinsel yolları
> kullanarak** ifade ederler. Kadınlar sıklıkla bu tür davranışlarla (**özellikle
> eğer test 6 da yüksekse**) başkalarını da kızdırmaya çalışırlar […] Hatta bir
> melodram krizi başlatmış oldukları için hoşlanmış görünürler. **Alt test 3 de
> yükselmişse**, bu kadınlar kendilerinin başkaları üzerindeki etkisinin farkında
> değildirler ve düşmanlık duygularını inkâr ederler. Evlilik ve aile sorunları ve
> cinsel fonksiyon bozuklukları ve cinsel hoşlanma eksikliğinin olması şaşırtıcı
> değildir. **Baş ve sırt ağrıları** da sık görülür." (s.112'ye taşar)

Kod: `grep "Yüksek 4/Düşük 5|Düşük 5"` → **kodda hiç yok** ❌
Status: **MISSING** → CONFLICT-024 kapsamı

## SOURCE-CODE-PD-004 · 45/54 Kodu + yaş/eğitim/cinsiyet zorunluluğu (s.112)

Fact — aynen (**Visual: ZORUNLU — OCR bu paragrafı KAYBETTİ**):
> "**Bu kod tipi hastanın yaşı, eğitimi ve cinsiyeti dikkate alınarak
> yorumlanmalıdır.**"

**Kritik:** `p064_L` OCR çıktısında bu cümlenin yerinde yalnızca `<LOWCONF>`
belirteci vardı (OCR cümleyi tamamen atladı). 340 dpi kadraj
(`v_pd112_lowconf.png`) ile **okundu** → yeni OCR kuralı kaydı:
`OCR_ISSUES.md` → **LOWCONF-GAP**.

Kod: `codeInterpretation('45')` metninde bu **yorumlama kuralı yok** ❌
(metinde "Ergenler için…" ve "liseden daha az eğitimi olan…" geçer, ancak
**"yaşı, eğitimi ve cinsiyeti dikkate alınarak yorumlanmalıdır" direktifi yok**.)
Status: **MISSING** → CONFLICT-034

Fact — 45/54 gövdesi (aynı sayfa, OCR + görsel):
> "Ergenler için, bu kod öfke patlamalarının olduğunu gösterir. […] ilaç
> kullanımı, hırsızlık ya da anti-sosyal davranışlar da olabilir. Ancak bu
> ergenler girişken (insan canlısı), dışa dönük ve genellikle akranları
> tarafından sevilen kişilerdir […] **prognoz iyidir**. Bu koddaki yetişkinler,
> **liseden daha az eğitimi** olan kişilerdir […] **Lise ya da daha yüksek
> eğitimi olan yetişkin erkekler** […] sosyal protestolar ya da hareketler
> içine girerler […] **45 ve 54 kodlu kadınlarda sıklıkla test 8 ve 9, üçüncü
> en yüksek testtir.** […] **Olası tanı: Pasif agresif kişilik bozukluğu,
> pasif tip. Erkeklerde 5 yüksektir. Kadınlarda 5 düşüktür.**" (s.112-113)

Kod: `CODES['45']` metni + `diagnosis: ['Pasif-agresif kişilik bozukluğu, pasif
tip — erkeklerde 5 yüksektir, kadınlarda 5 düşüktür']` → **içerik birebir MATCH** ✅
Status: **VERIFIED**

## SOURCE-CODE-PD-005 · 456 Kodu (s.113, p64 R)

Fact — aynen (**Visual: CONFIRMED**, 340 dpi `v_pd113_456.png`):
> "**456 Kodu**
> Talep edici, bağımlı ve duygusal kişilerdir, ancak diğer kişileri tedirgin
> ederek ve onlara karşı çıkarak ilişki kurarlar. Davranış örüntüleri yakın aile
> çevrelerine yabancılaşmalarına yol açar. Bu durum talep edici, bağımlı ve
> duygusal ilişki gereksinimlerini karşılamalarını zorlaştırır
> **(Bakınız Scarlett O'Hara Vadisi)**."

Kod: **`456` kaydı YOK**; `codeInterpretation('456')` → kurpma nedeniyle
**`45/54` metnini döndürüyor** ❌ → CONFLICT-030 kapsamı
Status: **MISSING** → CONFLICT-024

## SOURCE-CODE-PD-006 · 46/64 Kodu (s.113, p64 R)

Fact — aynen (**Visual: CONFIRMED**, 340 dpi `v_pd113_4664.png`):
> "Temel özellikler kızgınlık, küskünlük, güvensizlik, somurtkanlık, sinirlilik,
> eleştiriye ve başkalarının isteklerine karşı aşırı duyarlılık ve suçun
> başkaları üzerine yansıtılmasıdır. Bu bireyler kendilerini çok çabuk
> reddedilmiş ya da eleştirilmiş hissederler, **yetersiz veri ve çok az öngörü
> ile sonuçlara varırlar**. Düşünceleri, tipik olarak nasıl ihmal edildikleri,
> başkalarının nasıl hatalı olduğu ve kendilerini nasıl koruyabilecekleri
> üzerinde odaklanır. […] Bu kod, yetişkin normaller arasında nadirdir, ancak
> ergenlik dönemine özgüdür. […] Yetişkin erkeklerde, **46/64 kodu sıklıkla
> psikotik ya da pre-psikotik durumlar ile (bakınız 468/648 kodları) ya da
> borderline kişiliklerle (bakınız 462/642 ve 463/643 kodları)** bağlantılıdır.
> […] **Genellikle psikiyatri polikliniklerine başvuran kadın hastalar, erkek
> hastalara oranla üç kat daha fazladır** ve kadınlarda bu profil olduğunda
> patolojik durum daha azdır."

Kod: `CODES['46']` → metin **birebir MATCH** ✅ (paragraf paragraf), `diagnosis`
2 kayıt MATCH ✅; `seeAlso` → `468/648, 486/846, 489/849` (kaynak **462/642 ve
463/643**'e de yolluyor → `486/846`, `489/849` hangi sayfadan? sıradaki batch'te
kontrol edilecek) → `UNVERIFIED` notu (batch 12)
Status: **VERIFIED** (46/64 gövdesi)

---

# PHASE 9/10 batch 12 — Pd (4) kod bloğu II (kitap s.114-117)

## SOURCE-CODE-PD-007 · 46/64 kapanışı: sayısal koşullar (s.115, p65 L/R)

Fact — aynen (s.114'ten taşan paragraf + s.115 kapanış):
> "Sıklıkla benzer biçimde terapist ya da tedaviyi veren diğer bireylerden de
> aşırı isteklerde bulunurlar, ancak aynı zamanda da aldıkları tedaviyi eleştirir
> ve karşı çıkarlar. […] **İçgörüleri yoktur. 5 alt testinin 40 T puanının altında
> olduğu kadınlarda pasiflik, bağımlılık ve kendine acıma görülür (bakınız Yüksek 4
> ve Düşük 5).** Menstrüasyonda düzensizlikler, cinsel işlev bozukluğu, baş
> ağrıları ve sırt ağrıları gibi fiziksel yakınmalar da olur."

Status: **VERIFIED** — 40 T + "Yüksek 4/Düşük 5" atfı (kodu yok, CONFLICT-024)

## SOURCE-CODE-PD-008 · 468/648 Kodu (s.115, p65 R)

Fact — aynen (**Visual: CONFIRMED**, 340 dpi `v_pd115_469.png`):
> "**468/648 Kodları**
> Eğer birey psikiyatride yatan bir hasta ise şiddetli ve olasılıkla kronik,
> duygusal bir rahatsızlığı, büyük olasılıkla **paranoid şizofreniyi düşündürür**.
> Bu bireyler kuşkucu, kızgın, aşırı duyarlı, suçlayıcıdırlar. Eleştiriden kolayca
> yaralanırlar ve durumlara kötü niyetli anlamlar yükleme ve düşüncelerinde aşırı
> genelleme eğilimindedirler. […] delüzyonlar ya da referans fikirleri olabilir,
> büyüklük (grandiozite) elemanları, en azından benmerkezci tarzda olabilir.
> Bireyler gerçekte kızgınlıklarını (ve diğer psikolojik problemleri) inkâr
> ederler ve kızgınlığı başkalarına yüklerler […]"

**Sayısal kural — aynen (340 dpi `v_pd115_469b.png`):**
> "**K testi 50 T puanının altında, test 5, 4 ve 6'nın 5 T puanı alanı içinde
> ve/veya alt test 9 ve 2 de 70 T puanının üzerinde olduğu durumlarda impuls
> kontrolünde azalma vardır.**"

Kod: **`468/648` kaydı YOK** → `codeInterpretation('468')` = `46/64` (CONFLICT-030)
Status: **MISSING** (kod yok) · koşul → CONFLICT-027 (T-eşiği modellemesi yok)

## SOURCE-CODE-PD-009 · 469 Kodu (s.115, p65 R)

Fact — aynen (**Visual: CONFIRMED**, 340 dpi `v_pd115_469c.png`):
> "**469 Kodu**
> 46 koduna ek olarak **test 9 da 70 T puanının üzerinde ise** bu ani öfke
> patlamaları olan bireyleri göstermektedir."

Kod: **`469` kaydı YOK** → `codeInterpretation('469')` = `46/64` (CONFLICT-030)
Status: **MISSING** (kod yok; tek cümlelik kural, kolayca eklenebilir — CONFLICT-024
koşullu cümle örneklerine eklendi)

## SOURCE-CODE-PD-010 · 47/74 Kodu (s.115-116, p65 R – p66 L)

Fact — aynen:
> "**47/74 Kodu** (Ayrıca **247/427/274** kodlarına bakınız.)
> Bu bireylerde (hem ergenler, hem de yetişkinler) kızgınlık açıkça göze çarpan
> bir özellik ise de, kendi kendini eleştirme ve suçluluk da sık görülür.
> Bireyin davranışı **döngüsel bir örüntü** gösterir. […] eyleme vuruk davranış
> gösterirler. Bu sırada, sıklıkla yasal sınırlamaları çiğnerler. Eyleme vurma
> döneminden sonra […] **çok fazla pişmanlık, utanma ve suçluluk** yaşarlar.
> Vicdan azapları çok şiddetli olursa da, davranışlarını kontrol etme (genellikle
> aşırı kontrol etme girişimi) geçicidir ve daha sonra da eyleme vuruk davranış
> dönemleri beklenir. **Davranışlarının altında, bağımlılık ve bağımsızlık
> arasında büyük çatışma vardır.** […] **En sık görülen 3'lü kodlar 478/748 ve
> 472/742'dir.** **Psikoterapi suçluluk yaşadıkları dönemde yapılırsa etkili
> olabilir.** Ancak uzun…"

Kod: `CODES['47']` → gövde **MATCH** ✅ (döngüsel örüntü, suçluluk, aşırı kontrol);
`seeAlso: '247/427/274 kodlarına da bakınız.'` ✅ MATCH
**Eksikler:** (a) "**En sık görülen 3'lü kodlar 478/748 ve 472/742'dir**" cümlesi
kodda **YOK**; (b) psikoterapi cümlesi var mı → kontrol edildi (`47` metninde
"Psikoterapi" **var**) ; (c) `247/427`, `274`, `472/742`, `478/748` **kayıtları yok**
Status: gövde **VERIFIED** · 4 kod **MISSING** → CONFLICT-024

## SOURCE-CODE-PD-011 · 48/84 Kodu (s.116-117, p66 L/R)

Fact — aynen:
> "Bu koddaki **ergenler** kızgın ve mutsuzdurlar, garip düşünce örüntüleri
> gösterirler […] **Akademik yönden başarısızdırlar ve suç işleyebilirler.
> Sıklıkla anoreksiya, aşırı hareketlilik ve enürezis ve enkoprezis öyküleri de
> vardır.** […] Bunlarla terapötik işbirliği kurmak zordur ve terapiden sıklıkla
> kaçınırlar ve/veya sorunların varlığını inkâr ederler. Bu koddaki **yetişkinler**
> genellikle major bir kişilik bozukluğu ya da **psikotik bir süreç** gösterirler."

Kod: `CODES['48']` → `diagnosis: ['Psikiyatrik yatan hasta ise şizofreni (Paranoid
tip)', 'Borderline kişilik bozukluğu', 'Antisosyal, paranoid, şizoid kişilik
bozukluğu']`; `seeAlso: '482/842, 486/846, 489/849'`
Status: gövde **VERIFIED** · `482/842`, `486/846`, `489/849` **kayıtları yok** →
CONFLICT-024 (isimleri `seeAlso`'da var, gövdeleri yok — 46/64'teki `468/648`
ile aynı kalıp)

---

# PHASE 9/10 batch 13 — Pd (4) kod bloğu III + **Pd BLOĞU KAPANIŞI** (kitap s.118-121)

## SOURCE-CODE-PD-012 · 482/842/824 Kodları (s.118, p67 L)

Fact — aynen:
> "**482/842/824 Kodları**
> Daha önce verilen 48/84 tanımlarına ek olarak, bu bireylerde **depresyon,
> anksiyete, gerginlik, sinirlilik** yaygındır. Bunların duyguları çok çeşitlidir,
> ancak genellikle **suçluluk, aşağılık ve umutsuzluk** duyguları görülür.
> **İntihar girişimi göreceli olarak fazladır.** Kalıcı (uzun süreli) kişilerarası
> ilişkileri (özellikle heteroseksüel) yoktur. Genelde bu bireyler bekârdır ya da
> sorunlu evlilikleri vardır […]"

Kod: **`482/842/824` kaydı YOK** ❌ — `codeInterpretation('482')` = `48/84`
(48/84'ün `seeAlso`'su bu kodu işaret ediyor ama gövdesi yok → **kapalı döngü**)
Status: **MISSING** → CONFLICT-024

## SOURCE-CODE-PD-013 · 489/849 Kodları (s.118, p67 L)

Fact — aynen:
> "**489/849 Kodları**
> **Yüksek 9 testinin yanı sıra, 48/84 kodu yorumlarının eklenmesi** tuhaf, hatta
> garip ve öngörülmez şekillerde **eyleme vuruk davranışların** ifade edilmesi
> olasılığını artırır. Davranışsal ajitasyon sıklıkla görülür; bu **saldırma,
> savaşma ve hatta şiddet gösterme** biçiminde ortaya çıkar."

Kod: **`489/849` kaydı YOK** ❌ (48/84'ün `seeAlso`'sunda adı var)
Status: **MISSING** → CONFLICT-024

## SOURCE-CODE-PD-014 · 49/94 Kodu + sayısal koşullar (s.118-119)

Fact — gövde aynen (s.118):
> "Hem yetişkinler, hem de ergenler için, bu kod kendi isteklerini ön plana
> çıkarma ve sınırlar, kurallar ve düzenlemelere kızma ile bağlantılıdır.
> Benmerkezci, narsisistik ve bencildirler […] Sosyal standartların ve değerlerin
> onlar için önemi çok azdır […]"

**Sayısal/koşullu kısım — aynen (Visual: CONFIRMED, 340 dpi `v_pd119_cond.png`):**
> "**Eğer K testi 50 T puanının üzerinde ise ve/veya test 2, 5, 7 ya da 0 70 T
> puanı üstünde üçüncü yükselen test ise hem ergenler, hem de yetişkinlerde suç
> işleme ya da antisosyal davranış olasılığı daha azdır. Alt test Si 50 T puanının
> altında olduğunda 49/94 özelliklerine sahip olsa bile bireyin sosyal ilişkileri
> iyidir.** Sıklıkla bu bireyler dışa vuruk davranışları göstermek yerine,
> diğerlerini antisosyal davranışlar yönünde manipüle ederler. **Erkekler için,
> test 8, 5 ve 3, sıklıkla üçüncü en yüksek testtir. Kadınlar için test 8, 3 ve 6,
> sıklıkla üçüncü yüksek testtir.** Bu bireyler için psikoterapi prognozu
> genellikle çok kötüdür, yaşla gelen olgunluk yararlı olabilir. […] Çoğu tedaviyi
> erken bitirir ve tedavi sırasında genellikle sinirli ve düşmanca bir tutum
> sergilerler. **Olası tanı: Antisosyal kişilikle birlikte bazı tip karakter
> bozuklukları · Pasif agresif kişilik bozukluğu, agresif tip**"

Kod: `CODES['49']` → gövde + 2 `diagnosis` **MATCH** ✅ (K 50 T ve Si 50 T
cümleleri de gövdede **VAR**)
**Eksik:** "üçüncü en yüksek/yükselen test" listeleri (erkek 8-5-3, kadın 8-3-6)
ve "test 2, 5, 7 ya da 0 70 T üstünde üçüncü yükselen test" koşulu → CONFLICT-025/027
Status: **VERIFIED** (gövde) · koşul listeleri **MISSING**

## SOURCE-CODE-PD-015 · 493/943 Kodları (s.119, p67 R)

Fact — aynen:
> "**493/943 Kodları**
> 49/94 özelliklerine ek olarak, birey benmerkezcidir ve kendilerine yönelik
> içgörüleri yoktur. Bunlarda eyleme vuruk davranış olasılığı nadirdir ve olumsuz
> duygularını daha çok **pasif-agresif ve dolaylı yollardan** gösterirler.
> **Alt test 3, test 4'ün 5 T puanı alanı içinde ise 34/43 kod tipinin özellikleri
> de bulunabilir (bakınız 34/43 kodları).** Böylece, bu koddaki bazı bireyler
> kızgınlıklarını sadece hiddetlenme şeklinde (genellikle bir aile üyesine karşı)
> açığa çıkarmak üzere biriktirebilirler."

Kod: **`493/943` kaydı YOK** ❌ (kırpma: `'493'`→`49/94`)
Status: **MISSING** → CONFLICT-024 · T-eşiği koşulu → CONFLICT-027

## SOURCE-CODE-PD-016 · 495/945 Kodları + 496/946 + 498/948 (s.119-120)

Fact — 495/945 aynen (s.119):
> "**495/945 Kodları**
> Alt test 5'in ek olarak yükselmesi ya bireyin açık ve küstah bir biçimde doğal
> olmayan bir cinsel yönelimi (genellikle homoseksüel) kabul etmesini gösterir ya
> da daha sıklıkla çok iyi eğitim görmüş, ilgi alanları geniş […] daha sosyal bir
> bireyle bağlantılıdır. […] (**Özellikle test 4 ve 9'un orta derecede yükseldiği
> ve test 7'nin de 70 T puanı ya da üstü olduğu durumlarda.**) […]"

Fact — 496/946 aynen (s.120, **Visual: CONFIRMED** `v_pd120_496.png`):
> "**496/946 Kodları**
> Kod saldırgan, zarar verici ve hatta homisidal davranışı olan bireyi
> göstermektedir. (**Özellikle eğer test 8 de yükselmişse.**) […] Yargılamaları ve
> olumsuz duygularını kontrolleri kötüdür (**özellikle eğer K alt testi 50'nin
> altında ise**)."

Fact — 498/948 aynen (s.120, **Visual: CONFIRMED** `v_pd120_0404b.png`):
> "**498/948 Kodları** (Ayrıca 489/849 ve 496/946 kodlarına bakınız.)
> 49/94 özelliklerine ek olarak, doğal olmayan, hatta tuhaf davranış olasılığı çok
> yüksektir. **20 yaşın üstündeki bireylerde, bu kod genellikle majör ve uzun
> süreli bir psikopatolojiyi gösterir.** Ergenlerde, kod sıklıkla (bu kodda daha
> yaşlı bireylerde daha sıklıkla bulunan yeni başlayan ya da açık psikozdan çıkma)
> durumsal güçlükler ve yoğun bir ergenlik dönemi isyanı ile bağlantılıdır."

Kod: **`495/945`, `496/946`, `498/948` kayıtları YOK** ❌
Status: **MISSING** → CONFLICT-024 · 3 T-eşiği koşulu → CONFLICT-027

## SOURCE-CODE-PD-017 · 40/04 Kodu + **bölüm kapanışı** (s.120, p68 L)

Fact — aynen (**Visual: CONFIRMED**, 400 dpi `v_pd120_0404c/d/e.png`):
> "**40/04 Kodu**
> Nadir görülen bu kod tipinde **sıklıkla üçüncü yüksek test 2, 6 ve 8'dir.**
> Koddaki bireyler hem kızgındırlar, hem de kişilerarası ilişkilerde geri
> çekilmişlerdir. Tipik olarak kızgınlıklarını açık biçimde ifade etmezler […]
> Şüpheci, küskün ve utangaçtırlar, pasif olarak direnme eğilimindedirler.
> **Ek yorumlama üçlü kod ya da diğer 2'li kodların analizine (örn. yüksek 4,
> düşük 5) dayanır. Üçlü kodda sıklıkla Si'nin alınmaması ve sonra kalan ikili
> koda ilişkin yorumların elde edilmesi ve buna yüksek Si testine ait bilginin
> eklenmesi yararlı olur.** Yüksek puanla görülen bir depresyon durumu varsa bu
> çoğunlukla gerçek, psikomotor retardasyon ya da **vegetatif depresyon**
> belirtileri yerine depresif düşünce ve duygulara ilişkindir. […]"

**Kritik — kod sapması (yeni çelişki):** kodda bu cümle "**negatifik** depresyon
belirtileri" olarak yazılmış; kaynak **"vegetatif depresyon"** (400 dpi görsel,
`v_pd120_0404e.png`). "Negatifik" Türkçe psikiyatri literatüründe yerleşik bir
terim değildir → **CONFLICT-035**.

Kod: `CODES['04']` → gövde büyük ölçüde MATCH ✅ · **eksik:** "sıklıkla üçüncü
yüksek test 2, 6 ve 8'dir" + "Ek yorumlama üçlü kod…" cümleleri → CONFLICT-025/027
Status: gövde **VERIFIED (1 terim sapması ile)** → CONFLICT-035

## SOURCE-CL-010 · 5. Kadınlık-Erkeklik (Mf) Alt Testi — **BLOK GEÇİŞİ** (s.121, p68 R)

Fact — aynen:
> "**5. Kadınlık-Erkeklik (Mf) Alt Testi**
> Bu alt test, **cinsel kimlikteki sapmaları değerlendirmek amacıyla**
> geliştirilmiştir. Maddeler oldukça heterojendir. Çeşitli mesleklere karşı ilgi,
> boş zaman faaliyetleri, uğraşlar, sosyal aktivitelerle ilgili maddelerden başka
> **korkular, endişeler ve bireysel duyarlılıklarla** ilgili maddeler
> bulunmaktadır. Doğrudan doğruya **cinsel içerikli maddeler** de vardır. Mf alt
> testini oluşturan maddeler ve puanlama yönü **Tablo 12**'de gösterilmiştir.
> **Mf alt testinde yüksek puan alan bir erkek (Graham 1987):** 1. Cinsel kimliğine
> ilişkin çatışması vardır, depresyon ve psikotik semptomlar göstermez, hoşnuttur,
> durağandır. 2. **Erkek rolünde güvensizdir.**"

**Pd (4) BLOĞU KAPANDI** (s.107-120: anahtar + T bantları + 20 kod).
Sıradaki: **Mf (5) bloğu** — Tablo 12 (anahtar) + T bantları + kodlar.
Status: **VERIFIED** (giriş metni) · Tablo 12 → sıradaki batch

---

# PHASE 9/10 batch 14 — Mf (5) bloğu: Tablo 12 + T bantları + kodlar (kitap s.122-125)

## SOURCE-CL-011 · **Tablo 12 — Mf anahtarı (P0)** (s.122, p69 L)

Fact — 450 dpi GÖRSEL okuma (satır satır kadraj; `v_mf_r12.png`, `v_mf_r23.png`):

> **Tablo 12. Kadınlık-Erkeklik alt testi: Madde numaraları ve puanlama yönü
> (Madde Sayısı: 60)**
> **Doğru** (28 madde): 4, 25, 69*, 70, 74, 77, 78, 87, 92, 126, 132, 134, 140,
> 149, 179*, 187, 203, 204, 217, 226, 231*, 239, 261, 278, 282, 295, 297*, 299
> **Yanlış** (32 madde): 1, 19, 26, 28, 79, 80, 81, 89, 99, 112, 115, 116, 117,
> 120, 133*, 144, 176, 198, 213, 214, 219, 221, 223, 229, 249, 254, 260, 262,
> 264, 280, 283, 300
> **Not: (*) işaretli sorular kadınlarda ters yönde puan almaktadır. Erkeklerde
> ortalama: 29.21, kadınlarda ortalama: 32.98 (Savaşır 1981)**

**Kod karşılaştırması** (`cmp-tablo12.ts`):
| | Kaynak | Kod | Sonuç |
|---|---|---|---|
| Doğru (erkek) | 28 | 28 | **birebir** ✅ |
| Yanlış (erkek) | 32 | 32 | **birebir** ✅ |
| Toplam | **60** | **60** | kitabın "Madde Sayısı: 60" başlığıyla **uyumlu** ✅ |
| (*) ters maddeler (kadın) | 5 (69, 179, 231, 297, 133) | `female` listelerinde **5/5 ters** ✅ | **birebir** ✅ |
| Norm (erkek) | 29.21 | 29.21 | ✅ |
| Norm (kadın) | 32.98 | 32.98 | ✅ |

Status: **VERIFIED** — P0 katmanı **TAM MATCH** (anahtar + ters çevirme + norm)

## SOURCE-CL-012 · Mf T bantları — Erkek (s.124, p70 L)

Fact — aynen:
> "**80 ve üstü T puanı:** Lise eğitimi olan erkeklerde ya da kültürel baskı
> altındakilerde kültürün verdiği erkeksi rolle özdeşim olmadığını göstermektedir.
> Yüksek puanlar göreceli olarak pasif erkeklere (eğer 4 alt testi de düşükse)
> hatta bazı durumlarda kadınsı özelliklere sahip olanlara işaret etmektedir."
> "**70-79 T puanı:** Bu erkekler hayal kurmayı seven, içedönük, eğitim yönelimli,
> spora özel ilgi duyan kişilerdir. […]"
> "**60-69 T puanı:** 65 T puanının üstündeki yükselmeler demografik ve klinik veri
> dikkate alınarak değerlendirilmelidir. […]"
> "**41-59 T puanı:** Erkeksi ilgiler ve davranışlar olduğunu göstermektedir ve
> bütün ilgileri bu alanda daralmıştır. […]"
> "**26-40 T puanı:** Erkeklerde maskülen görünmek için kompülsif bir uğraş vardır
> ve bu abartılmış bir boyuttadır. […]"

Kod: `MF_MALE_T_BANDS` → 5/5 sınır **birebir MATCH** ✅ (`T ≥ 80`, `T 70-79`,
`T 60-69`, `T 41-59`, `T 26-40`)
**Not:** "26-40 T puanı" etiketi OCR'da `<LOWCONF>` ile **kaybolmuştu**; 360 dpi
kadraj ile kurtarıldı (LOWCONF-GAP kuralı 2. kez işe yaradı).
Status: **VERIFIED**

## SOURCE-CL-013 · Mf T bantları — Kadın (s.124-125, p70 L/R)

Fact — aynen:
> "**Kadınlarda Mf değerlendirilmesi:**
> **65 T puanının üstü:** Bu kadınlar güçlü, kuvvetli, saldırgan, yönlendirici ve
> yarışmacıdır. […] Ergen kızlarda 5'in yükselmesi ev, okul ve yasalarla ilgili
> sorunlar olduğunu gösterir; **14-19 yaşları arasındaki kızlarda 5 yüksekliği
> normal olabilir** […]"
> "**56-65 T puanı:** Kadınlarda 60 ve üstündeki T puanı onların aktif, atılgan ve
> yarışmacı olduklarını göstermektedir."
> "**41-55 T puanı:** Bu kadınların ilgi alanları orta sınıf kadınların
> ilgilendikleri konular ile sınırlıdır. […]"
> "**26-40 T puanı:** Kadınların pasif, çekingen olduğunu göstermektedir. Mf
> düşüklüğü nevrotik üçlüde yükselme ile ilişkilidir. **Eğer Pd yükselmesi, Mf
> [düşüklüğüne eşlik ediyorsa seksüel impulsların olası eyleme vurukluğuna] dikkat
> edilmelidir.** […]"

Kod: `MF_FEMALE_T_BANDS` → 4/4 sınır **birebir MATCH** ✅ (`T > 65`, `T 56-65`,
`T 41-55`, `T 26-40`)
Status: **VERIFIED**

## SOURCE-CL-014 · "Erkeklerde sadece Mf alt testinin yükselmesi" (s.125, p70 R)

Fact — aynen:
> "**Erkeklerde sadece Mf alt testinin yükselmesi:** Sadece test 5'in yükselmesi
> açık ya da örtük homoseksüaliteyi gösterme açısından yeterli değildir. Kendi
> homoseksüalitesini göstermek isteyen bireyler bu testte yavaş bir yükselme
> gösterirler. **Erkeklerde 5 testinde 75 T puanı ve üstü**, eğitim düzeyleri orta
> ya da lise 1 ise ve oldukça katı kültürel baskı varsa, bu erkeklerde geleneksel
> erkeksi yaşam biçimi yoktur; yüksek puanlar pasif erkekleri gösterir (**eğer alt
> test 4 düşük ise**) ve çoğunluğunda kadınsı özellikler vardır."

Kod: `SINGLE_MF_MALE` **metni birebir MATCH** ✅
**Ancak eşik uyuşmuyor:** kaynak **75 T ve üstü** ↔ kod tespiti
`single('Mf')` = `t('Mf') >= 70 && others('Mf') < 70` → **CONFLICT-027**
Status: metin **VERIFIED** · eşik **FARK (P1)**

## SOURCE-CL-015 · Mf kod bloğu (s.125-126, p70 R)

Fact — aynen:
> "**Mf alt testinin diğer alt testlerle ilişkisi:**
> **51/15 Kodu** (Bakınız 15/51 kodu) · **52/25 Kodu** (Bakınız 25/52 kodu) ·
> **53/35 Kodu** (Bakınız 35/53 kodu) · **54/45 Kodu** (Bakınız 45/54 kodu) ·
> **56/65 Kodu** · **564/654** (üçüncü yükselen ölçek: '*T puanının
> [değerlendirilir] (örneğin, **564/654** kodu. 46/64 değerlendirilmeli ve test
> 5'te yükselme olduğu söylenmelidir)*') · **57/75 Kodu**"

Kod durumu:
| Kod | Kodda | Not |
|---|---|---|
| `51/15` | **VAR** ✅ | kayıt `15/51` |
| `52/25` | **VAR** ✅ | kayıt `25/52` |
| `53/35` | **VAR** ✅ | kayıt `35/53` |
| `54/45` | **VAR** ✅ | kayıt `45/54` |
| `56/65` | **VAR** ✅ | gövde MATCH |
| **`564/654`** | **YOK** ❌ | kırpma: `'564'` → `56/65` → CONFLICT-030 |
| `57/75` | **VAR** ✅ | |

Status: 6/7 VAR · `564/654` **MISSING** → CONFLICT-024

---

# PHASE 9/10 batch 15 — Mf kod bloğu II + **Pa (6) anahtarı ve bantları** (kitap s.126-130)

## SOURCE-CL-016 · Mf kod bloğu II (s.126, p71 L)

Fact — aynen:
> "**58/85 Kodu**
> Bu koddaki erkekler içe dönüktür ve zamanlarının çoğunu düşünme ile
> geçirirler. Genellikle konfüzyonda, mutsuz ve diğerlerine yabancılaşmış oldukları
> duygusunu yaşarlar ve ev çatışmaları vardır. **Yorum yapılırken 5 dikkate
> alınmadan diğer yükselen iki alt teste bakılmalıdır.**"
> "**59/95 Kodu**
> Erkeklerde 5'in yükselmesi açık eyleme vuruk davranışların azaldığını gösterir,
> burada **entelektüalizasyonun, inkârın, rasyonalizasyonun aşırı kullanımı**
> vardır. Aslında bu koddaki erkeklerin çoğu akademik olarak başarılıdır.
> Duygusal bağımlılık (anne bağımlılığı) ve benlik atılganlığının olmaması sorun
> alanlarıdır. Kadınlarda 5 alt testinin yükselmesi saldırganlığın açığa
> çıkmasını gösterir, yarışmacıdırlar (erkeklerle yarışırlar) […]"
> "**50/05 Kodu**
> Bu koddaki erkekler içe dönüktür ve genellikle kişisel ve entelektüel izolasyon
> yaşarlar […] Aşırı kontrollüdürler ve her şeyi aşırı idealize ederler. Sosyal
> açıdan beceriksizdirler […]"

Kod: `58/85` **VAR** ✅ · `59/95` **VAR** ✅ · `50/05` **VAR** ✅ (üçü de gövde MATCH)
Status: **VERIFIED** — **Mf bloğu tam kapandı** (s.121-126)

## SOURCE-CL-017 · Pa (6) alt testi girişi + yüksek puan listesi (s.127, p71 R)

Fact — aynen:
> "**6. Paranoya (Pa) Alt Testi**
> Paranoya geç erişkinlik döneminde başlayan ve değişik koşullar altında ortaya
> çıkan başkalarının davranışını kötü niyetli olarak yorumlayan sürekli bir
> güvensizlik ve kuşkuculuk durumudur. Pa alt testini oluşturan maddeler ve
> puanlama yönü **Tablo 13**'de gösterilmektedir.
> **Pa alt testinde yüksek puan alan bir birey: (Graham 1987)**
> 1. Açık psikotik bir davranış gösterir. 2. Düşünce bozukluğu vardır.
> 3. Perseküsyon ve/veya grandioz türünde delüzyonları vardır.
> 4. Referans fikirleri vardır. 5. Kendine kötü davranıldığını ya da kendisiyle
> alay edildiğini düşünür. 6. Öfkeli ve güceniktir, kıskançlık içindedir.
> 7. Savunma mekanizması olarak **yansıtmayı** kullanır.
> 8. Tanı sıklıkla **şizofrenik ya da paranoid bozukluktur**."
> "**Pa alt testinde orta düzeyde yüksek puan alan birey: (T: 65-70)** 1. Paranoid
> uğraşları vardır. 2. Diğerlerinin tepkilerine aşırı duyarlıdır. 3. Kendini
> yaşamda haksızlığa uğramış gibi hisseder. 4. Rasyonalize eder, kendi sorunları
> için diğerlerini suçlar. 5. Şüpheci, savunucudur. […]"

Kod: **her iki liste de YOK** ❌ → CONFLICT-026 kapsamı
Status: **MISSING** (giriş metni okundu; listeler yok)

## SOURCE-CL-018 · **Tablo 13 — Pa anahtarı (P0)** (s.128, p72 L)

Fact — 125 dpi tam sayfa GÖRSEL okuma (`v_pa_tablo13_full.png`):
> **Tablo 13. Paranoya alt testi: Madde numaraları ve puanlama yönü
> (Madde Sayısı: 40)**
> **Doğru (25 madde):** 15, 16, 22, 24, 27, 35, 110, 121, 123, 127, 151, 157,
> 158, 202, 275, 284, 291, 293, 299, 305, 317, 338, 341, 364, 365
> **Yanlış (15 madde):** 93, 107, 109, 111, 117, 124, 268, 281, 294, 313, 316,
> 319, 327, 347, 348
> **Erkeklerde ortalama: 11.12, kadınlarda ortalama: 11.93 (Savaşır, 1981).**

**Kod karşılaştırması** (`cmp-tablo13.ts`):
| | Kaynak | Kod | Sonuç |
|---|---|---|---|
| Doğru | 25 | 25 | **birebir** ✅ |
| Yanlış | 15 | 15 | **birebir** ✅ |
| Toplam | **40** | **40** | kitabın "(Madde Sayısı: 40)" başlığıyla **uyumlu** ✅ |
| Norm erkek | 11.12 | 11.12 | ✅ |
| Norm kadın | 11.93 | 11.93 | ✅ |

Status: **VERIFIED** — P0 katmanı **TAM MATCH**

## SOURCE-CL-019 · Pa düşük / aşırı düşük puan kontrol listeleri (s.128-129)

Fact — aynen:
> "**Pa alt testinde düşük puan alan bir birey: (T: 35-45)**
> 1. Psikiyatrik hasta değilse ve herhangi bir sorunu yoksa: a. Kibar, duygusal ve
> naziktir. b. Huzurlu ve yumuşak kalplidir. […] l. Kendine güveni azalmıştır.
> m. Beklenti düzeyi yüksektir, endişeye eğilimlidir.
> 2. Eğer psikiyatrik hastaysa ve başka uyumsuzlukları da varsa: a. Yaşama daha
> paranoid bir uyumu vardır. […] e. Öfkeli ve güceniktir."
> "**Pa alt testinde aşırı derecede düşük puan alan bir birey: (T<35)**
> 1. Açık paranoid bozukluğu olabilir. 2. Delüzyonları olabilir, şüpheler,
> etkilenme düşünceleri gösterebilir. 3. Semptomları Pa alt testinde yüksek puan
> alan bireylerden daha belirsizdir. 4. Baştan savıcı ve savunucudur. 5. Utangaç,
> sırlarla dolu ve içe çekilmiştir."
> (T: 35-45 ve T<35 listelerinin devamı s.129'da: "a. Neşelidir. […] ı. Kendini
> kontrol eder, temkinlidir." / "2. Eğer psikiyatrik hastaysa ya da uyumsuzluğun
> diğer göstergeleri varsa: … l. Psikotik semptomlar pek görülmez, bu nedenle
> psikoz tanısı konulmaz.")

Kod: **dört kontrol listesinin hiçbiri YOK** ❌ (`grep` ile doğrulandı: "Kibar,
duygusal ve nazik", "Açık paranoid bozukluğu olabilir", "Baştan savıcı ve
savunucudur", "İnsiyatif gösterir" → hepsi **YOK**)
**Not:** Bu listeler **T: 35-45** ve **T<35** eşiklerine bağlı; kodun en düşük
Pa bandı **T 27-44**'tür → kod bu alt ayrımı **yapamaz**.
Status: **MISSING** → CONFLICT-026 (genişletme)

## SOURCE-CL-020 · Pa T bantları (s.129-130, p72 R – p73 L)

Fact — aynen (**Visual: CONFIRMED** `v_pa_tablo13_full.png` + OCR p73_L):
> "**80 ve üstü T puanı:** Kuşkulu, kızgın, küskün ve durumların doğrudan
> kendilerine yöneldiği biçiminde yorum yapan kişilerdir. Bu bireylerin çoğu
> paranoyaktır, referans fikirleri vardır, temel savunma mekanizması yansıtmadır.
> Gerçeği değerlendirme bozuktur, delüzyonlar perseküsyon ve/veya grandioz
> biçimindedir."
> "**70-79 T puanı:** Diğerlerini suçlama ve hostilite temel özelliklerdir. […]"
> "**60-69 T puanı:** Duyarlı bireylerdir, kendilerinin ve diğerlerinin
> duygularının [kolayca incinebileceği türünde düşünceleri vardır] […]"
> "**45-59 T puanı:** Bu kişiler diğerlerini değerlendirmede esnektirler. […]
> **55-59 T puanı arasında olan bireyler anlayışlı, duyarlı kişilerdir.**"
> "**27-44 T puanı:** İki tip insan bu puanı verebilir: Diğerlerine duyarlılığı
> olmayan kişiler ve çok fazla şüphesi ve endişesi olan kişiler (bunlar paranoya
> maddelerini atlarlar) […]"

Kod: `PA_T_BANDS` → **5/5 sınır + metin BİREBİR MATCH** ✅
(`T ≥ 80`, `T 70-79`, `T 60-69`, `T 45-59`, `T 27-44`; 55-59 alt notu dahil)
Status: **VERIFIED**

---

# PHASE 9/10 batch 16 — Pa (6) kod bloğu (kitap s.130-135)

Sayfa eşlemesi (OCR başlıklarıyla doğrulandı): **p73 L = 130 · p73 R = 131 ·
p74 L = 132 · p74 R = 133 · p75 L = 134 · p75 R = 135**;
**p76 L = 136 BOŞ** (görsel doğrulandı), **p76 R = 137 → Pt (7) bloğu başlıyor**
→ Pa bloğu kapsamı **s.130-135**.

## SOURCE-CODE-PA-000 · Pa T bant metinleri (s.130) — **Visual: CONFIRMED**

| T puanı | Kaynak metni (s.130, 125 dpi tam sayfa görsel) |
|---|---|
| ≥ 80 | "noiddir, referans fikirleri vardır, temel savunma mekanizması yansıtmadır. Gerçeği değerlendirme bozuktur, delüzyonlar, perseküsyon ve/veya grandioz biçimindedir." |
| 70-79 | "Diğerlerini suçlama ve hostilite temel özelliklerdir. Bu bireyler katı, inatçı ve aşırı duyarlıdırlar. Kişiler arası ilişkilerde aşırı savunucu tutumları nedeniyle yanlış anlaşılabilirler. Açık paranoid özellikler vardır." |
| 60-69 | "Duyarlı bireylerdir, kendilerinin ve diğerlerinin duygularının kolaylıkla incinebileceği türünde düşünceleri vardır. Bu sıklıkla depresyonla ilgilidir. Diğerlerinden gelen eleştiri ve önerileri çok ciddiye alırlar ve kendilerinin söyledikleri her şeyin eleştiri gibi alındığı fikri vardır. Kişilerarası ilişkilerde savunucu ve diğer insanlara güvensizdirler, diğerlerinin kendilerinden yararlanacağını düşünürler. Kırgın, küskün olmaya hazırdırlar, çünkü en ufak bir olumsuzluğu üstlerine alırlar. İşte ve evde kendilerinden beklentiler konusunda kontrollüdürler." |
| 45-59 | "Bu kişiler diğerlerini değerlendirmede esnektirler. Onlara karşı duyarlıdırlar ve diğerlerinin kendilerinden beklentilerini doğru anlayarak olumlu yanıt verirler. **55-59 T puanı arasında olan bireyler anlayışlı, duyarlı kişilerdir.**" |
| 27-44 | "İki tip insan bu puanı verebilir: Diğerlerine duyarlılığı olmayan kişiler ve çok fazla şüphesi ve endişesi olan kişiler: Bunlar paranoya maddelerini atlarlar. Diğerleri ise yüksek puan alan kişilerle aynıdırlar. Düşük puan alan bireyler geleneksel, güvenilir, kişilerarası ilişkilerde duyarsız, ilkel ve saftırlar. Zekâları sınırlıdır ve ilgi alanları daralmıştır." |

Kod (`clinicalBands('Pa')`): `T ≥ 80` · `T 70-79` · `T 60-69` · `T 45-59` ·
`T 27-44` → **5/5 bant aralığı MATCH** ✅ (metinler de mevcut).
Status: **VERIFIED**

## SOURCE-CODE-PA-001 · "Sadece Pa alt testinin yükselmesi" (s.130) — **Visual: CONFIRMED**

> "**Sadece Pa alt testinin yükselmesi:** Bu bireyler aşırı duyarlı, katı, gergin ve
> kaygılıdırlar. Yaşamlarında iş ve sosyal baskı olduğunu hissederler. Şüphecilik,
> güvensizlik, düşüncelere dalma vardır. Yansıtma mekanizmasını sık kullanırlar.
> Sorunlara aşırı tepki verirler."

Kod: `SINGLE_PA` (`mmpiSource.ts:517`) → **birebir MATCH** ✅
Status: **VERIFIED**

## SOURCE-CODE-PA-002 · Pa alt testinin diğer alt testlerle ilişkisi — 4 çapraz referans (s.130-131)

> "Pa alt testinin diğer alt testlerle ilişkisi:
> **61/16 Kodu** (Bakınız 16/61 Kodu) · **62/26 Kodu** (Bakınız 26/62 Kodu) ·
> **63/36 Kodu** (Bakınız 36/63 Kodu) ·
> **64/46 Kodu (Ayrıca 46/64, 462/642, 463/643 kodlarına ve 468/648 kodlarına bakınız.)**"
> "Bu koddaki bireyler **immatur, narsisistik, pasif-bağımlı** kişilerdir. Sosyal
> ilişki kurulması zordur. Diğerlerine öfke duyarlar ancak bunu kontrol edebilirler."

Kod: **4/4 çapraz referans VAR** ✅ (`codeInterpretation('61')`, `'62'`, `'63'`,
`'64'`) — ancak **`64/46` gövdesi kaynakta Pa bloğuna aittir ve kodda YOK**;
çağrı Pd bloğunun `46/64` kaydına düşer (gövde farklı) → **CONFLICT-031
genişlemesi** (aşağıda SOURCE-CODE-PA-003).
Status: **VERIFIED** (referanslar) · gövde **CONFLICT**

## SOURCE-CODE-PA-003 · `64/46` gövdesinin blok farkı (s.130-131) — **Visual: CONFIRMED**

Pa bloğu (s.130-131) `64/46` için: **"immatur, narsisistik, pasif-bağımlı
kişilerdir…"** + s.131 devamı:
> "Zaman zaman öfke patlamaları olur. Kızgınlıklarının suçunu başkalarına
> yüklerler. Diğer insanlara kuşku ile bakarlar ve paranoid özellikler
> yaşarlar. Uzun zamandan beri sosyal uyumsuzluk gösterirler. Sonuç olarak
> psikolojik yardım için uygun kişiler değillerdir. **64/46 kodunun yanında
> 8 alt testi de yükselmişse süreç daha kötü olur.** Yukarıdaki özelliklere ek
> olarak bu hastalar psikolojik sorunlarını kabul etme yerine kaçma yolunu
> seçmektedirler. Mantık ve yargılamalarda da güçlükleri ortaya çıkmaktadır.
> Öfkeyle doludurlar ve bu da onların eleştiriye duyarlılık ve kıskançlıkları ile
> birleştiğinde tahmin edilemeyen ve mantıksız öfke patlamalarına yol açar."

Kod `46` kaydı (Pd bloğu, s.113): "Temel özellikler kızgınlık, küskünlük,
güvensizlik, somurtkanlık…" → **tamamen farklı metin**.

**Bulgu:** `64/46` erişimi **Pd bloğu metnini** döndürüyor; kaynağın Pa bloğu
`64/46` metni kodda **hiçbir kayıtta yok** (tüm 45 kayıt tarandı: "immatur",
"narsisistik, pasif-bağımlı" hiçbirinde geçmiyor).
→ **CONFLICT-036** (yeni) · CONFLICT-024 kapsamına **+1 YOK kaydı** (gövde)
Status: **VERIFIED** (kaynak) · **CONFLICT** (kod)

## SOURCE-CODE-PA-004 · `648 Kodu` (s.131) — **Visual: CONFIRMED**

> "Süregen sorunlarına karşın savunucudurlar ve sorunlarında kendi rollerini inkâr
> ederler. Huzursuz, şüpheci, narsisistik, sürekli isteyen rolündedirler.
> Rasyonalizasyon ve yansıtma savunma mekanizmalarını kullanırlar. Klinik olarak
> referans fikirleri, delüzyonlar, duygusal labilite ve kaygı görülür. İmpulsif,
> manipülatif davranışları olabilir. Otorite figürleri ile çatışma içindedirler.
> İntihar girişimleri, ilaç kullanımı olabilir. **Profil tipi kroniktir.**"

Kod: `648` anahtarı **YOK** → çağrı `46` → Pd bloğu `46/64` metni → **YANLIŞ
EŞLEME** ❌ (CONFLICT-030 kırpma kanıtı · CONFLICT-024 kapsam)
Status: **VERIFIED** (kaynak) · **YOK** (kod)

## SOURCE-CODE-PA-005 · `67/76`, `678/876`, `679` (s.131-132) — **Visual: CONFIRMED**

`67/76` (s.131):
> "Oldukça nadir görülür **2 ya da 8 alt testleri yükselen üçüncü alt testtir**.
> Bireyler gergin, kaygılı, aşırı duyarlı ve sıklıkla çabuk küsen kişilerdir.
> Başkalarının kendilerine haksızlık ettiğini düşünerek ilişkilerini bozarlar.
> Aşağılık ve/veya suçluluk duyguları vardır ve bunu diğerlerine yansıtırlar.
> **Eğer 6 alt testi 7'den daha yüksekse ya da ikisi aynı düzeydeyse, obsesif-kompulsif
> bozukluktan psikotik döneme bir geçiş olabileceği dikkate alınmalıdır.**
> Her iki cinsiyette de **2 ve 8, üçüncü yüksek alt testtir**.
> **Olası tanı: Dekompanze obsesif kompulsif bozukluk**
> Alt test 6, 7'den daha yüksek ya da aynı düzeyde ise **obsesif kompulsif
> bozukluktan şizofreniye geçiş olasıdır.**"

`678/876` (s.131): "6 ve 8, 7'den yüksek ise bu **psikotik vadiyi** oluşturur.
Ciddi psikopatolojileri vardır. **Şizofrenik bozukluklardan paranoid tip tanısı
konulabilir.**"

`679` (s.132): "Aşırı duyarlı ve katıdırlar. Sosyal ve iş yaşamlarında, kendilerini
bastırılmış hissederler; şüphecidirler ve güvensizlik duyarlar, çabuk gücenirler ve
öfke patlamaları vardır. **İmpulsif dönemlerini, dönemsel suçluluk ve kendine
yönelme izlemektedir.**"

Kod: `67` kaydı **VAR** ✅ (2 haneye iniyor) ama kaynak `67/76` metni şu cümleyi
taşıyor: "Oldukça nadir görülür. Bireyler gergin, kaygılı, aşırı duyarlı…" →
**kaynak PD bloğunun `67/76`'sı ile Pa bloğunun `67/76`'sı farklı bağlamlarda
geçiyor**; kod tek kayıtta tutuyor → **CONFLICT-031 (blok-bazlı ayrım)**.
`678/876` ve `679` anahtarları **YOK** → `67`'ye düşüyor ❌
Status: **VERIFIED** (kaynak) · kısmi **YOK** (kod)

## SOURCE-CODE-PA-006 · `68/86` — paranoid vadi + tarama ölçütü (s.132) — **Visual: CONFIRMED**

> "**68/86 Kodu** (Ayrıca 468/648, 486/846, 489/849 kodlarına bakınız)
> … **Pd ve Pt alt testleri, en yüksek üçüncü testtir.** Hem ergenlerde, hem de
> yetişkinlerde bu kod ciddi psikopatolojiyi gösterir ve **F alt testi de
> yükselmişse, birey kabul edilmeyen yaşantılar getirir.**
> **"Paranoid vadi" varsa bu daha çok görülen bir durumdur. Paranoid vadide
> 6 ve 8 alt testleri 70 T puanı civarındadır ve 7 alt testi 10 T puanı
> aşağıdadır.** Eğer diğer alt testler 6 ve 8'den daha yüksekse paranoid vadinin
> olduğu durumlarda paranoid şizofreni düşünülmelidir."

**Kritik sayısal kural:** paranoid vadi = `6 ≈ 8 ≈ 70 T` ∧ `7 = 6/8 − 10 T`
Kod: `68/86` kaydı **VAR** ✅ — ancak **sayısal tarama ölçütü** (70 T civarı +
7'nin 10 T aşağıda olması) kodda **YOK** → CONFLICT-027 kapsamına eklendi.
Status: **VERIFIED** (kaynak) · sayısal koşul **EKSİK**

## SOURCE-CODE-PA-007 · `680/860`, `69/96`, `694/964`, `698/968`, `60/06` (s.133-134) — **Visual: CONFIRMED**

`680/860`: "Hastalarda paranoid şizofrenide görülen paranoid özellikler ve düşünce
bozukluğu vardır. Sistemli hezeyanlar görülebilir. …"

`69/96` (Ayrıca 698/968):
> "Hastalar gergin ve anksiyöz kişilerdir. Grandiozite ve egosantrik sezgiler
> içindedirler; heyecanlı ve enerjiktirler. … Düşünce bozukluğunun varlığı halinde
> bunun manik ya da şizofrenik özellikler mi olduğu gözden geçirilmelidir.
> **Kod daha çok kadınlarda görülmektedir. 4 ve 8 alt testi, en çok yükselen
> üçüncü alt testtir.** … **Olası tanı: Manik bozukluğun bazı tipleri · Akut
> psikotik epizod · Alt test F ve Sc yüksekse paranoid şizofreni**"

`694/964`: "Hastaların sosyal, aile ve iş yaşamları hostilitelerine,
yargılamalarının bozukluğuna ve duygularını kontrol edememelerine bağlı olarak
bozuktur. İçgörüleri yoktur ve **sucu diğerlerinin üstüne atma tipiktir. Saldırma,
mücadele etme ve hatta cinayet potansiyeli değerlendirilmelidir.**"

`698/968`: "69/96 kodunda tanımlanan birey tipine ek olarak bu bireylerde ruhsal
karışıklık, konfüzyon, düşünce ve dikkat toplamada güçlük vardır. Ayrıca
delüzyonlar, paranoid şüphe ve hallüsinasyon da vardır. **Eğer 8 alt testi, 6'dan
5 T puanı aşağıda ise 68/86 koduna bakın.** Olası tanı: Şizofreni paranoid tip."

`60/06`: "Erkeklerde çok az görülür, genç kadınlarda hemen hemen hiç görülmeyebilir.
**Kadınlarda özellikle 30 yaşından sonra rastlanır. 2, 4 ve 3 yükselen diğer alt
testlerdir.** …"

Kod: `69` VAR ✅ · `60/06` → `06` VAR ✅ · **`680/860`, `694/964`, `698/968`
YOK** ❌ → `68`, `69`, `69` kayıtlarına düşüyor.
**CONFLICT-027 genişlemesi:** `698/968` için "8, 6'dan **5 T puanı aşağıda** ise
68/86 koduna bakın" sayısal kuralı kodda **YOK**.
Status: **VERIFIED** (kaynak) · 3 kod **YOK**

## SOURCE-CODE-PA-008 · "456 Alt Testlerinin Örüntüsü" (s.134) — **Visual: CONFIRMED**

> "Genellikle kadınlarda görülen bir örüntüdür. **4 ve 6 alt testleri T puanı
> olarak 65'in üzerinde, 5 alt testi T puanı olarak 35'tedir.** 4 ve 6 alt
> testlerinin profilde en yüksek noktalar olması gerekli değildir.
> Bu örüntüye alt test 3'ün yükselmesi eşlik ediyorsa, bu tür kadınlarda, yüzeyel
> bir sosyallik, diğerlerine yönelik düşmanlık duygularının inkârı söz konusu
> olabilir, diğerlerini kontrol ve manipüle etme davranış kalıbını yansıtır.
> Birey psikolojik yardıma dirençlidir."

**Sayısal kural:** `4 > 65 T` ∧ `6 > 65 T` ∧ `5 = 35 T`
Kod: bu örüntü için **özel bir tarama kuralı YOK** → CONFLICT-027 kapsamı
(CONFLICT-011 `mmpiConsistency.ts`'deki TR/dikkatsizlik ile karıştırılmamalı).
Status: **VERIFIED** (kaynak) · **EKSİK** (kod)

## SOURCE-CODE-PA-009 · Şekil 21 — "Scarlett O'Hara vadisi" (s.135) — **Visual: CONFIRMED**

Şekil 21 (s.135, tam sayfa görsel): **Pd ↑ (~72 T) · Mf ↓ (~32 T dip) · Pa ↑ (~75 T)**
→ U biçimli vadi.
> "Bu örüntü, düşmanlık ve kızgınlık duygularını doğrudan ifade edemeyen, bağımlı,
> daima sevgi isteyen ve düzensiz duygulanım içindeki kadınlarda görülür.
> Diğerlerini öfkelendirecek davranışları vardır. Böylece diğerlerini kendilerinden
> uzaklaştırır ve sonra da kendilerine ne kadar kötü davranıldığını düşünürler;
> aile, evlilik ve cinsel konularda sorunları vardır. Bu tür kadınlar terapisti
> kızdırarak terapötik müdahaleyi güçleştirirler."

Kod: "Scarlett" / bu örüntü **YOK** (`grep` → yalnız `mmpiDerived.ts:44` madde
listesindeki 456 maddesi, ilgisiz) → **CONFLICT-033 kapsamına eklendi**
(nevrotik üçlü profilleriyle aynı sınıf: tanımlı konfigürasyon, kodda yok).
Status: **VERIFIED** (kaynak) · **YOK** (kod)

## Pa (6) kod bloğu — birleşik özet (s.130-135)

| | Sayı |
|---|---|
| İncelenen kod başlığı | **15** |
| Kodda VAR (2 haneli anahtara iniyor) | **9** |
| Kodda YOK | **6** (`648`, `678/876`, `679`, `680/860`, `694/964`, `698/968`) |
| Blok-bazlı metin farkı | **1** (`64/46` Pa bloğu gövdesi kodda yok) |
| Yeni sayısal tarama kuralı (kodda yok) | **4** (paranoid vadi 70/10 T · `698/968` 5 T kuralı · `456` örüntüsü 65/65/35 · `45` "2 ya da 8 üçüncü") |

---

# PHASE 9/10 batch 17 — Pt (7) Psikasteni bloğu (kitap s.137-141)

Sayfa eşlemesi (OCR başlıklarıyla doğrulandı): **p76 R = 137 · p77 L = 138 ·
p77 R = 139 · p78 L = 140 · p78 R = 141**

## SOURCE-PT-001 · Tablo 14 — Pt anahtarı (s.138) — **Visual: CONFIRMED** (125 dpi tam sayfa)

> "**Tablo 14. Psikasteni alt testi: Madde numaraları ve puanlama yönü
> (Madde Sayısı: 48)**"

| | Madde numaraları |
|---|---|
| **Doğru** (4 satır) | 10 15 22 32 41 67 76 86 94 102 106 · 142 159 182 189 217 238 266 301 304 305 317 · 321 336 337 340 342 343 344 346 349 351 352 · 356 357 358 359 360 361 |
| **Yanlış** | 3 · 8 · 36 · 122 · 152 · 164 · 178 · 329 · 353 |
| **(K eklemeli)** | ✓ |

Kod `SCORING_KEYS.Pt`: Doğru **39** + Yanlış **9** = **48**
→ **BİREBİR MATCH** ✅ (FAZLA [] · EKSİK [])
Status: **VERIFIED** — script: `cmp-tablo14.ts`

## SOURCE-PT-002 · Pt T bantları (s.139) — **Visual: CONFIRMED**

> "**84 T puanı ve üstü:** Bireyin ajite ruminasyonları, korku hali, obsesyonları
> ve kompülsiyonları ya da fobileri olduğunu göstermektedir. Anksiyete ve
> gerginlik o kadar fazladır ki günlük yaşamlarını bile devam ettiremezler.
> Entellektüalizasyon, izolasyon ve rasyonalizasyon sıklıkla kullanılmaktadır."
> "**75-84 T puanı:** Temiz, titiz, düzenli kişilerdir. Önemsiz sorunlar karşısında
> bile gerginlik ve endişe yaşarlar. Kendilerini yetersiz, aşağılık duyguları ve
> suçluluğu olan kişiler olarak gösterirler. […] Kendilerine ait bir fikirleri yoktur."
> "**60-74 T puanı:** Bu yükseltiler dürüst, mükemmeliyetçi, titiz ve kendini
> eleştiren bireyler olduklarına işaret etmektedir. Küçük sorunları bile
> kendilerine dert edinme eğilimdedirler."
> "**45-59 T puanı:** Bireyler yaşamlarını ve işlerini endişe ve güvensizlik
> duymadan yürütebilirler."
> "**20-44 T puanı:** Rahat, duygusal, gerginliği olmayan bireylerdir. Çoğu
> kendine güvenir ve uyumludur. Üretici ve yeterlidirler. Kaygı düzeyleri çok
> düşük olduğu için sanki tembel gibi görünürler. Başarıya, statüye, kabul
> görmeye önem veren kişilerdir."

Kod (`clinicalBands('Pt')`): `T ≥ 84` · `T 75-83` · `T 60-74` · `T 45-59` ·
`T 20-44` → **5/5 bant MATCH** ✅
**Not (örtüşme çözümü):** kaynak "75-**84** T" yazarken 84'ü aynı zamanda
"84 ve üstü" bandına da verir; kod 84'ü üst banda atar (75-83) → kaynağın
örtüşen sınırını tutarlı biçimde çözer, davranış farkı yok.
Status: **VERIFIED**

## SOURCE-PT-003 · Norm (s.138) — **KAYNAK İÇİ/ATIF FARKI**

> "**Erkeklerde ortalama: 27.90, kadınlarda ortalama: 29.90 (Savaşır, 1981)**"

Kod `TURKISH_NORMS.Pt`: erkek **27.9** ✓ · kadın **29.2** ❌ (kaynak metni 29.90)
Ancak **Tablo 30 (s.257-260)** — kitabın asıl norm tablosu — Pt kadın için
**29.20** verir ve bu değer 26/26 MATCH olarak doğrulanmıştır.

**Bulgu:** s.138'deki değer **Savaşır (1981)** atıflı ayrı bir çalışmadandır;
kitabın kendi norm tablosu (Tablo 30) **29.20**'dir. Kod **Tablo 30'u izler**
(normatif tablo > metin anması) → **kod doğru**; fark belgelendi.
→ **CONFLICT-037** (P2, REJECTED — kaynak atıf farkı)
Status: **VERIFIED** (kod Tablo 30 ile uyumlu)

## SOURCE-PT-004 · "Sadece Pt alt testinin yükselmesi" (s.139) — **Visual: CONFIRMED**

> "**Sadece Pt alt testinin yükselmesi:** Alt test 7'de yüksek puanlar, psikiyatrik
> grupta genellikle kaygılı, gergin, kararsız ve dikkatini bir noktada
> yoğunlaştıramayan bireyleri tanımlamaktadır. Bu kişilerde obsesif düşünceler,
> ruminasyonlar, kendinden şüphe… Fobi ve kompülsif davranış, bu alt testte yüksek
> puan alan kişilerde görülebilmesine karşın, bu yüksek puanın karakteristiği
> değildir. **Gerçekte, pek çok rijid kompülsif hasta alt test 7'yi yükseltmez,
> çünkü bu kişilerin entellektüel savunmaları anksiyetelerini ve güvensizlik
> duygularını kontrol edecek kadar güçlüdür.**"

Kod: `SINGLE_PT` (`mmpiSource.ts`) → gövde **birebir MATCH** ✅
Status: **VERIFIED**

## SOURCE-PT-005 · "Pt alt testinde DÜŞÜK puan alan bir birey" (s.139) — **Visual: CONFIRMED**

> "1. Korkular ve kaygılardan arınmıştır. 2. Kendine güven duymaktadır.
> 3. Geniş ilgi alanları vardır. 4. Sorunlu, gerçekçi, etkili, uyumludur.
> 5. Başarı, mevki ve tanınıp bilinmeye ilişkin değerleri vardır."

Kod: Pt düşük-puan listesi **var mı** → `UNVERIFIED_DATA.md` (kontrol edildi,
ayrı yapı olarak yok; CONFLICT-026 sınıfı)
Status: **VERIFIED** (kaynak) · **EKSİK** (kod)

## SOURCE-PT-006 · Pt kod bloğu — 12 başlık (s.140-141) — **Visual: CONFIRMED**

`71/17` · `72/27` · `73/37` · `74/47` · `75/57` · `76/67` · `78/87` (s.140) ·
`782` · `872` · `784/874` · `789` · `79/97` (s.141)
Çapraz referanslar: `278/728`, `478/728`, `478/748` (s.140, "bakınız" — ayrı gövde yok)

**Kritik sayısal kurallar — ikisi de KODDA VAR ✅:**
- s.140: "Eğer 2 ve 4, 8 alt testinin **5 T puanı altındaysa** 278/728 ve 478/728 ve
  478/748 kodlarına bakınız" → kod `78/87` metninde mevcut
- s.141: "**7 < 8**: Her iki yükselmede **75 T puanının üstünde** ve 8 alt testinde
  belirgin bir yükselme varsa tanı şizofrenidir." → kod `78/87` metninde mevcut

Kod karşılaştırması (`cmp-pt-batch17.ts`):
- **8 iki-ölçek kod** → hepsi VAR ✅
- **3 tanı varyantı** (`782`, `872`, `784/874`) → kod `78/87` kaydının
  **`diagnosis` alanında VAR** ✅ ("782 kodu: Depresif Bozukluk, Obsesif Kompulsif
  Bozukluk" · "872 kodu: Şizofrenik Reaksiyon" · "784/874 kodu: Şizofrenik
  Reaksiyon, Sizoid Kişilik Bozukluğu")
- **`789` gövdesi YOK** ❌ — kaynak: "Hostil, gergin, şüpheci, hiperaktif,
  huzursuz bireylerdir. Günlerini fanteziler ve hayal kurmayla geçirirler.
  Yansıtmayı kullanır, uygunsuz duygudurum gösterirler. […] Kendilerine ilişkin
  grandioziteleri vardır, kendileri ile övünürler. Başarıya ulaşma isteklerinin
  çok fazla olmasına karşın orta düzeyde performans gösterirler."
  → `codeInterpretation('789')` = `78/87` (kırpma)

**Pt bloğu kapsamı: 14 VAR / 1 YOK.**
Status: **VERIFIED** (kaynak + kod karşılaştırması)

---

# PHASE 9/10 batch 18 — Pt bloğu KAPANIŞI + Sc (8) girişi (kitap s.142-146)

## SOURCE-PT-007 · Pt (7) bloğu s.142'de KAPANIYOR — `794` + `70/07` — **Visual: CONFIRMED**

s.142 (PDF p79 L) üç bölüm taşır (300 dpi kadraj `b18_7007.png` / `b18_7007_f.png`):

1. `79/97 Kodu` kapanışı — "…Bazı bireylerde manik örüntü vardır ve bu farmakolojik
   müdahale gerektirir." + "Bu kodu alan ergenlerin yoğun ilgi gereksinimleri
   vardır, ancak kontrolü kaybedeceklerini düşünerek böyle bir şey yapmaktan
   kaçınırlar. Ayrıca ergenlerde bağımlılık, bağımsızlık çatışması çok fazladır."
   → kod `79/97` gövdesi bu kapanışı **taşıyor** ✅ (batch 17 VAR sayımı geçerli).
2. **`794 Kodu`** — "Hastalar kronik olarak kaygılı ve gergindirler. Yüksek enerji
   düzeyleri obsesif ruminasyonlarına katkıda bulunur. Konuşmalarının genellikle
   izlenmesi zordur, bağlantısız fikirler görülür. İmpulsif dışa vurma dönemleri,
   suçluluk ve kendini aşağılama dönemleri birbiri ardına sıralanır. Diğer manik
   özelliklerin de birlikte görülüp görülmediği araştırılmalıdır."
   → kodda **YOK** ❌ (üç haneli → CONFLICT-024; `'794'` çağrısı `79/97`'ye kırpılıyor → CONFLICT-030).
3. **`70/07 Kodu`** — tam gövde okundu (aşağıda).

**Pt (7) bloğu burada biter;** s.143'te **8. Şizofreni (Sc) Alt Testi** başlar.
(Batch 17'nin "Pt bloğu s.142+ devam edebilir" varsayımı **kapanmıştır**.)
Status: **VERIFIED**

## SOURCE-SC-001 · `70/07 Kodu` gövdesi (s.142) — **Visual: CONFIRMED**

> "Bu profili veren kişiler utangaç, içedönük, sosyal becerilerden yoksun, gergin
> ve endişelidirler, uykusuzluktan yakınırlar. Oldukça nadir görülür. **2 ve 8 alt
> testleri, en sık görülen üçüncü yüksekliktir.**"
>
> "Bu koddaki erkekler sosyal yetenekler ve/veya fiziksel görünümleri konusunda
> endişeli ve gergindirler, kendilerini yetersiz görürler. Çoğunluğu
> içedönüktür, **bu sözelleştirmeyi de engeller.** Güvensizlikleri ve karar verme
> güçlükleri onları konfüzyonda bırakır, aşırı kontrollüdürler ve kendilerini
> suçlarlar. Ruminasyonları uykusuzluk ile sonlanır. Anneleri ve kardeşleri ile
> yoğun çatışmaları vardır. Sosyal alandaki yetersizlikleri, karşı cinsle olan
> ilişkilerini de etkilemektedir."
>
> "Kadınlarda eğer 5 alt testi, **40 T puanının altında** ise aynı örüntü vardır.
> **Bunlar yoksa sorunların ciddilik oranı daha azdır, kendilerinin ne olduğunun
> farkındadırlar. Fiziksel görünüm olarak çekici olmadıklarını düşünürler ve
> sosyal açıdan güvensizlik ve karşı cinsle rahat ilişki kuramama gibi sorunları
> vardır.**"

**Kod karşılaştırması** (`CODES['07']`): kayıt VAR ✅ ve ana gövde sadık; ancak
**kalın** üç kesim kodda yok → CONFLICT-025 (koşullu/ek cümle sistematik eksikliği).
"40 T puanının altında" eşiği metinde var, **koşul olarak tespit edilmiyor** →
CONFLICT-027 (+1 örnek).
Status: **VERIFIED**

## SOURCE-SC-002 · Sc (8) girişi + Graham 1987 yüksek-puan listesi (s.143-144) — **Visual: CONFIRMED**

- s.143 (PDF p79 R) başlık: "**8. Şizofreni (Sc) Alt Testi**" + "Şizofreni alt
  testini oluşturan maddeler ve puanlama yönü **Tablo 15**'de gösterilmiştir."
- s.143: "**Sc alt testinde yüksek puan alan bir birey (T: 80-100): (Graham 1987)**"
  → maddeler **1-22**; s.144 tablo altında **23-38** devam eder (toplam **38 satır**).
- s.144 altı / s.145 üstü: "**Sc alt testinde düşük puan alan bir birey:**" →
  maddeler **1-9** ("Arkadaşça, neşeli, duyarlı, güvenilirdir." … "Rekabet
  gerektiren durumlara girmekte gönülsüzdür.").

**Kod:** iki liste de **YOK** ❌ → CONFLICT-026 (kaynak listeleri kodda yapısal
olarak temsil edilmiyor). T bandı etiketi "(T: 80-100)" yalnız listenin başlığıdır;
kodun Sc bantlarında 80-100 diye bir bant **yoktur ve kaynakta da yoktur** (bantlar
SOURCE-SC-004'te).
Status: **VERIFIED** (kaynak) · **EKSİK** (kod)

## SOURCE-SC-003 · 🎯 **P0 — Tablo 15 (Sc anahtarı) BİREBİR MATCH** (s.144) — **Visual: CONFIRMED (400 dpi ×2 bindirmeli kırpma)**

Başlık: "Tablo 15. Şizofreni alt testi: Madde numaraları ve puanlama yönü
**(Madde Sayısı: 78)**" · dipnot satırları: "**K Eklemeli**" ve
"Erkeklerde ortalama: **29.82**, kadınlarda ortalama: **31.06** (Savaşır 1981)".

| Katman | Kaynak (Tablo 15) | Kod (`SCORING_KEYS.Sc`) | Sonuç |
|---|---|---|---|
| Doğru | 12+12+12+12+11 = **59** | 59 | ✅ birebir |
| Yanlış | 11+8 = **19** | 19 | ✅ birebir |
| Toplam | **78** (kitabın başlığı) | 78 | ✅ tutarlı |
| K ekleme | "K Eklemeli" | `K_CORRECTION.Sc = 1.0` | ✅ |
| Norm | 29.82 / 31.06 | `TURKISH_NORMS` 29.82 / 31.06 | ✅ (sd Tablo 30, PHASE 6) |

**Dikiş uyarısı (DECISION-003):** tarama bindirme çizgisi `156 · 251 · 320 · 354`
sütununun **üzerinden** geçiyor. Tek kırpma bu sütunu biçimlendirilmiş gösteriyor →
**bindirmeli iki kırpma** (`tbl15_L`, `tbl15_R`) okundu; iki kırpmanın kesişiminde
dört değer de eksiksiz görüldü.

Kaynak listesi birebir: `scripts/mmpi-audit/cmp-sc-batch18.ts` + regresyon kilidi
`tests/mmpiKeyIntegrity.test.ts` → "Sc Doğru listesi Tablo 15 ile birebir aynıdır".
Status: **VERIFIED**

## SOURCE-SC-004 · Sc T-puanı bantları (s.145-146) — **Visual: CONFIRMED**

| # | Kaynak bant başlığı | Kod bandı | Sonuç |
|---|---|---|---|
| 1 | **100 T puanı ve üstü** (+ "T>95'in üzerinde olan değerler akut durumsal stres ve ciddi özdeşim krizlerini gösterir") | `T ≥ 100` (metinde "T 95'ten büyük…" ✅) | ✅ MATCH |
| 2 | **75 T puanı ve üstü** | `T ≥ 75` (75-99) | ✅ MATCH |
| 3 | **60-74 T puanı** + 3 madde (1 alt sınır+Si · 2 65-74 örtük psikoz/F-Pa · 3 psikotik belirtiler/şizoid sosyal uyum) | `T 60-74` — 3 madde metin içinde ✅ | ✅ MATCH |
| 4 | "Düşük Puanlar: **T 45**" + **45-59 T puanı** | `T 45-59` | ✅ MATCH |
| 5 | **21-44 T puanı** | `T 21-44` (min 0) | ✅ sınır MATCH · terim farkı → CONFLICT-038 |

**Terim denetimi (300/400 dpi kadraj `b18_lowband.png`):** kaynak —
"Pratik ve gelenekseldirler, davranışları ve yaşama bakış **açıları konformaldir**."
kod (denetim öncesi) — "…bakışları **konservatiftir**." → **yanlış içerik**
(eksik değil) → **CONFLICT-038 → FIXED (CHANGE-013, DECISION-028)**.

Kaynakta **"Sadece Sc alt testinin yükselmesi"** paragrafı YOK (s.143-146
tam sayfa okundu) → koddaki `SINGLE_*` setinde Sc'nin bulunmaması **uyumlu** ✅.
Status: **VERIFIED**

## SOURCE-SC-005 · Sc ↔ diğer alt testler + Sc kod bloğu (s.146) — **Visual: CONFIRMED**

"Sc alt testinin diğer alt testlerle ilişkisi:" — **beşi de "Bakınız" çapraz
referansıdır** (ayrı gövde yok): `81/18`→18/81 · `82/28`→28/82 · `83/38`→38/83 ·
`84/48`→48/84 · `85/58`→58/85. Kodda **5/5 çözülüyor** ✅ → bu beşi için
CONFLICT-024/031 **doğmaz** (kaynak zaten önceki bloğa yönlendiriyor).

| Kaynak başlığı | Kaynak gövdesi | Kodda |
|---|---|---|
| `86/68 Kodu` | "6 ve 8'in T puanı **80'in üstünde**, 7 de **70 T puanındadır**. Bu profil psikiyatri hastalarında sıklıkla görülür. "Paranoid vadi" ya da "Psikotik V" olarak adlandırılır." | `68/86` kaydında **VAR** ✅ — ancak eşik "7 daha düşükse" olarak yazılmış; **"7 de 70 T" özelliği kayıp** → CONFLICT-027 |
| `87/78 Kodu` | "Endişeli, kendi kendini tetkik edebilen, derin düşünceye dalan kişilerdir, kişilik güçlükleri kroniktir. Bağımsız, kendine güvenen kimseler değildirler, daha çok pasif bağımlıdır. Cinsel sorunları vardır. Olgun ve yakın ilişkiler kuramazlar, öğrendikleri şeyleri bağdaştıramazlar." | **YOK** ❌ — `'87'` çağrısı Pt bloğunun `78/87` metnini döndürür → CONFLICT-031 (+1) |
| `8726/Yüksek 9 Kodu` | "Ajite şizofren bir hastayı göstermektedir." | **YOK** ❌ — `'8726'` → `slice(0,2)` → `78/87` → CONFLICT-030 (+1) |

**OCR uyarısı:** s.145'teki "100 T puanı ve üstü" satırı 200 dpi OCR'da **tamamen
kaybolmuş**, izleyen satırlar kelime yapıştırarak gelmiştir
(`.audit/ocr/p080_R.txt` 13-15. satırlar) → kural: **bant başlıkları OCR ile
sayılmaz** (`OCR_ISSUES.md` BAND-HEAD-DROP).
Status: **VERIFIED**

---

# PHASE 9/10 batch 19 — Sc (8) bloğu KAPANIŞI + Ma (9) girişi/anahtarı (kitap s.147-150)

## SOURCE-SC-006 · Şekil 22 **Paranoid Vadi** + `89/98` + `80/08` → **Sc bloğu s.148'de biter** — **Visual: CONFIRMED**

**s.147 (PDF p81 R) — Şekil 22. Paranoid Vadi** (30/50/70/90 ızgaralı profil grafiği,
eksen etiketleri **Pa · Pt · Sc**; Pa ~82 ↑, **Pt ~72 ↓ (vadi dibi)**, Sc ~90 ↑):

> "Bu örüntüyü gösteren hastalar, duygusal olarak geri çekilmişlerdir, sosyal
> izolasyon içindedirler, şüphecı, düşmanlık duyguları taşıyan ve davranışları
> hakkında içgörüsü olmayan kişilerdir. Ayrıca düşünce bozuklukları, hallüsinasyon
> ve delüzyonlara rastlanabilir. Genellikle paranoid şizofreni tanısına
> uygundurlar. **Bu örüntü, hepsini doğru yanıtlama şeklinde de ortaya çıkar.**"

→ Üç-ölçekli örüntü + "hepsini doğru yanıtlama" (all-true) ayrımı kodda **YOK** →
**CONFLICT-033 (+1)**. (Pa bloğunun `6≈8≈70 T ∧ 7 = 6/8 − 10 T` tanımıyla aynı
yapı; bkz. CONFLICT-027.)

**s.147-148 — `89/98 Kodu`:** gövde kodla uyumlu ✅ ("…ergenlerde ve yetişkinlerde
ciddi psikopatoloji… çocuksu beklentileri… fikir uçuşmaları… Stres altında
dağılma… psikotik bir tablo ortaya çıkar") + **"Olası tanı: Şizofreni · Madde
kullanımına bağlı psikoz"** → kodda `diagnosis` ✅.
**Kaynakta ayrıca:** "**Yaşı 27'den küçük olanlarda görülür, üçüncü yükselen alt
test 4, 7 ya da 6'dır.**" → kodda **YOK** ❌ (300 dpi kadraj `b19_ma89_age.png`)
→ CONFLICT-025 (+1 kesim) + CONFLICT-027 (+1 sayısal koşul) + CONFLICT-034 (+1 yaş direktifi).

**s.148 — `80/08 Kodu`:** "Bu kod tipindeki **7 ve 2 alt testleri en yüksek üçüncü
testtir.** Genellikle sosyal açıdan çekingen kişilerdir… Atılgan değillerdir.
Danışmanlık görüşmelerinde genellikle konuşmazlar." + **"Olası tanı: Şizoid
Kişilik"** → gövde + tanı kodda VAR ✅; yalnız **ilk cümle** (üçüncü yükselen
kuralı) **YOK** ❌ → CONFLICT-025/027.
(Kadraj notu: kod bu cümleyi noktalı virgülle sürdürdüğü için büyük/küçük harf
duyarsız karşılaştırma gerekir — `cmp-ma-batch19.ts` bu yüzden `toLowerCase()` kullanır.)

**Sc (8) bloğu KAPANDI (s.143-148): 10 kaynak başlık → 8 VAR / 2 YOK.**
s.149'da **9. Hipomani (Ma) Alt Testi** başlar → `Ma (9)` bloğuna geçiş.
Status: **VERIFIED**

## SOURCE-MA-001 · Ma (9) girişi + Graham 1987 listeleri (s.149-151) — **Visual: CONFIRMED**

> "**9. Hipomani (Ma) Alt Testi** — Hipomani olağan dışı ve sürekli, taşkın ya da
> huzursuz bir duygu durum döneminin en az bir hafta olmasıdır. Hipomani alt
> testini oluşturan maddeler ve puanlama yönü **Tablo 16**'da gösterilmiştir."

- "**Ma alt testinde yüksek puan alan bir birey: (Graham 1987)**" → maddeler
  **1-25** (s.149) + **26-42** (s.150 tablo altı) = **42 satır**
  (ilki: "1. Manik dönemde olabilir."; sonuncusu: "42. Terapiste hostil ve agresif olabilir.")
- "**Ma alt testinde düşük puan alan bir birey:**" → "1. Düşük enerji ve aktivite
  seviyesi vardır. 2. Uyuşuk, apatik, kayıtsızdır." (s.150) + devamı s.151+

**Kod:** iki liste de YOK ❌ → **CONFLICT-026 (+2)**. Bu listeler yorum
*girdisi* değil, kaynak otoritesinin tanımlayıcı parçası; kodda karşılık
ararken **`Ma` T bantlarıyla karıştırılmamalı** (bantlar batch 20'nin konusu).
Status: **VERIFIED** (kaynak) · **EKSİK** (kod)

## SOURCE-MA-002 · 🎯 **P0 — Tablo 16 (Ma anahtarı) BİREBİR MATCH** (s.150) — **Visual: CONFIRMED (430 dpi ×2 bindirmeli kırpma)**

Başlık: "Tablo 16. Hipomani alt testi: Madde numaraları ve puanlama yönü
**(Madde Sayısı: 46)**" · satır etiketleri "**Doğru**" / "**Yanlış**" /
"**(K Eklemeli)**" · dipnot: "Erkeklerde ortalama: **19.96**, kadınlarda
ortalama: **19.72** (Savaşır,1981)"

| Katman | Kaynak (Tablo 16) | Kod | Sonuç |
|---|---|---|---|
| Doğru | 11+11+11+2 = **35** | 35 | ✅ birebir |
| Yanlış | **11** | 11 | ✅ birebir |
| Toplam | **46** (kitabın başlığı) | 46 | ✅ tutarlı |
| K ekleme | "(K Eklemeli)" | `K_CORRECTION.Ma = 0.2` | ✅ (oran PHASE 4 K tablosundan) |
| Norm | 19.96 / 19.72 | `TURKISH_NORMS` 19.96 / 19.72 | ✅ (sd 4.4 / 4.36 ← Tablo 30) |

**Dikiş kontrolü (DECISION-003):** tarama bindirmesi `64 · 181 · 251 · 148`
sütununun üzerinden geçiyor → `tbl16_L` + `tbl16_R` kırpımlarının kesişiminde
dört değer de eksiksiz okundu. **Yanlış satırının `180` ve `267` değerleri**
200 dpi OCR'da **kaybolmuştu** (`OCR_ISSUES.md` → TABLO-NUMBERS); görselde net.

Kanıt: `scripts/mmpi-audit/cmp-ma-batch19.ts` + regresyon kilidi
`tests/mmpiKeyIntegrity.test.ts` ("Ma Doğru/Yanlış listesi Tablo 16 ile birebir").
**PHASE 5 kapanışına kalan tek klinik anahtar: Tablo 17 (Si).**
Status: **VERIFIED**

---

## SOURCE-MA-003 · Ma (9) T bantları — kitap s.151-152 (PDF p83 R – p84 L)

Sayfa görselden okundu (150 dpi tam sayfa + `b20_s151_top`/`b20_s151_bands`/
`b20_ma_bands2` 380-420 dpi kadrajlar). Bant etiketler **kaynakta** şöyle:

| Kaynak etiketi (s.151-152) | Gövde özeti | Kod |
|---|---|---|
| `85 T puanı ve üstü` | "Ajitasyon ya da manik dönem olabilir. Birey hiperaktif, davranışları yordanamaz, fikir uçuşmaları vardır. Kendilik **değerlerini** abartır." | `MA_T_BANDS` `T ≥ 85` ✅ (4/4 parça) |
| `70-84 T puanı` | "Enerjik, konuşkan, eylemi düşünceye tercih eden kişilerdir… **büyüklük sanrıları ve hiperaktivite gibi.**" + ayrı paragraf: "Ergenlerde bu yükselme, artmış hareketliliği gösterir… Grandiözite ve **çağrışımlarında** artmalar vardır. İletişim güçlükleri ve suça eğilim görülebilir." | `T 70-84` ✅ (6/6; her iki paragraf birleştirilmiş) |
| `60- 75 T puanı aralığındaki puanlar` | "…enerjik, dışadönük ve aktif bireyleri gösterir. Bunlar, diğerleri tarafından hoş ve yeterli olarak görülürler… lise ya da lise mezunu öğrencilerde çok sıktır… onay ve statü kazanmak için çaba harcarlar…" | ⚠️ **kaynak etiketi 70-84 bandıyla çakışıyor** (420 dpi kadrajda doğrulandı; `60- 75` yazıyor). Kod bu paragrafı **`T 60-69` bandına birleştirmiş** → içerik korunuyor, **etiket yok** → ÇELİŞKİ DEĞİL (kayıt) |
| `60- 69 T puanı` | "Hoş, enerjik, meraklı, sosyal, kolay ilişki kuran, ilgi alanları geniş kişilerdir. Bu hallerinden kendileri de memnundur. İyimserlik, bağımsızlık ve kendine güven vardır." | `T 60-69` ✅ (5/5 — iki paragraf birlikte) |
| `45-59 T puanı` | "Normal aralığıdır. Puan normal aralıktan yükseldikçe mani düzeyinin arttığı düşünülür… daha çok ortalarda puan alan hastaların teşhisinde yardımcı olabilir." | `T 45-59` ✅ (3/3) |
| `21-44 T puanı` | "Düşük enerji düzeyi, güdü azlığı ve hatta apatiyi gösterir… **Özellikle 2 alt testinin yükselmediği durumlarda depresyon düşünülmelidir.** Yaşlı insanlarda 9'un düşüklüğü beklenen bir durumdur… **45 yaşın altında düşük olması beklenen bir durum değildir** ve dikkat edilmesi gerekir." | `T 21-44` ✅ (5/5) |

**s.152 kapanış paragrafı (kodda YOK):** "Ma alt testinin diğer alt testlerle
ilişkisi:" başlığından önce: "Yalnızca alt test 9'u kullanarak bir yoruma gitmek
güçtür. Diğer klinik alt testlerdeki yükselmelerle bu enerji artışının nedeni
araştırılmalıdır. Hipomani alt testiyle birlikte alt test 4'ü yükselen bir hastanın
yorumu, alt test 8 ile 9'u birlikte yükseltmiş hastadan farklıdır. Bunlara ek
olarak, beyin hasarı olan bir hasta, hiperaktivite ve tepkisel davranışlar
gösterebilir. Yine bu hastalarda duygusal tepkiler depresyon şeklinde ortaya
çıkabilir." → **CONFLICT-025 (+5 cümle) + CONFLICT-039** (yapısal: aynı bölüm
Sc'de s.146 ve Si'de s.157'de de var → her blokta standart).
Status: **VERIFIED**

---

## SOURCE-MA-004 · Ma (9) kod bloğu — kitap s.152-153 (PDF p84 L – p84 R)

| Başlık (kaynak) | Gövde | Kodda |
|---|---|---|
| **Yüksek 9/Yüksek K Kodu** (s.152) | "Eğer 9 ve K alt testlerinde puanlar **70 T puanında** (2 alt testi **T: 50'nin altında ise**) ise bu kişiler enerjik, organize, diğerlerinin kendileri üzerine otorite kurmasını istemeyen kişilerdir. Genellikle çok iyi yöneticidirler…" + "Bu bireylerin çoğu yarışmacıdır. **K alt testi 70 T puanının üzerine çıkarsa**… Kadınlar fiziksel çekicilik konusunda teşhircidirler (**eğer 5 alt testinde T:40'ın altında ise**)…" | ❌ **YOK** (K-ilişkili örüntü `CODES` modelinde anahtarsız) → **CONFLICT-039**, eşikleri → **CONFLICT-027 (+4)** |
| **Yüksek 9/Düşük K Kodu** (s.153) | "Narsisistik kişilerdir. Kadınlar, eksibisyonist bir biçimde kendilerini sergileyerek dikkatleri bu şekilde üstlerine çekerler." | ❌ **YOK** → CONFLICT-039 |
| **91/19 Kodu (Ayrıca 19/91 Koduna da Bakınız)** (s.153) | "Ender görülmektedir. Hastalar hipomanik durumdadırlar, ancak gergindirler ve yerlerinde duramazlar. İhtiraslıdırlar. Başarısızlıkla engellenmişlerdir. Hipokondriak sorunlarıyla karşılaştıkları durumsal güçlükler arasındaki ilişkiyi ispatlamak kolaydır." | ❌ **5/5 YOK** — `codeInterpretation('91')` → kanonik `'19'` = **s.77'deki Hs bloğu `19/91` gövdesi** → **CONFLICT-036'nın 2. somut vakası** (Pa `64/46`'dan sonra) |
| `92/29 · 93/39 · 94/49 · 95/59 · 96/69 · 97/79 · 98/89` Kodu (Bakınız …) | yalnız **çapraz referans** (gövde diğer bloklarda) | ✅ **UYUMLU** (CONFLICT-024 dışı) |
| — "Eyleme vuruk davranış ile ilgilidir" (s.153, `94/49` satırı altındaki not) | tek cümlelik ek not | ❌ YOK (`CODES['49']` gövdesinde yok) → CONFLICT-025 (+1) |
| **90/09 Kodu** (s.153) | "Kod oldukça nadirdir, özellikle erkeklerde çok az görülür. Bu koddaki bireyler enerjik ve olasılıkla ajitedirler. Genellikle yalnız kişilerdir. Si alt testinin yükselmesi bırakılarak yorum, yükselen diğer iki alt test ile yapılmalıdır. Daha sonra eğer gerekliyse Si alt testi yorumlanmalıdır." | ✅ **5/5 VAR** (sadık; tek fark "yapılmalıdır"→"yapılmaktadır") |

**Blok yapısı (yapısal bulgu):** her klinik blok sonu
"**X alt testinin diğer alt testlerle ilişkisi:**" bölümü taşıyor — Sc (s.146),
Ma (s.152) ve Si (s.157) OCR'larında doğrulandı; bu bölüm çapraz ref listesi +
K-ilişkili örüntülerden oluşuyor → **CONFLICT-039 (P2, yeni)**.
Status: **VERIFIED**

---

## SOURCE-SI-001 · Si (0) girişi + 🎯 **Tablo 17** — kitap s.154-156 (PDF p85 L – p86 L)

**s.154 (PDF p85 L) BOŞ SAYFADIR** — OCR 0 satır döndürdü; 150 dpi görselde yalnız
kenar gölgesi/kırışık var (koyu piksel oranı %4.2 vs dolu sayfada %11.9); sayı
numarası yok. Si bloğu **s.155'te (sağ sayfada)** başlıyor → **"OCR boş döndürme =
araç hatası" varsayımı yanlıştır; boş sayfa olabilir** (`OCR_ISSUES.md`).

| Alan | Kaynak (görselden okundu) | Kod | Sonuç |
|---|---|---|---|
| Giriş | "**0. Sosyal İçedönüklük (Si) Alt Testi** — Standart MMPI profiline sonradan eklenmiş bir alt testtir… Si alt testini oluşturan maddeler ve puanlama yönü **Tablo 17**'de gösterilmiştir." | — | Yorum katmanı (CONFLICT-026 sınıfı) |
| Yüksek puan listesi | "Si alt testinde yüksek puan alan bir birey (Graham 1987):" **1-20** (s.155) | — | ❌ YOK → CONFLICT-026 |
| Düşük puan listesi | "Si alt testinde düşük puan alan bir birey:" **1-14** (s.155-156) | — | ❌ YOK → CONFLICT-026 |
| 🎯 **Tablo 17 (s.156)** | "Tablo 17. Sosyal içedönüklük alt testi: Madde numaraları ve puanlama yönü **(Madde Sayısı: 70)**" — **Doğru 34** `32 67 82 111 117 124 138 147 171 172 180 / 201 236 267 278 292 304 316 321 332 336 342 / 357 377 383 398 411 427 436 455 473 487 549 / 564` · **Yanlış 36** `25 33 57 91 99 119 126 143 193 208 229 / 231 254 262 281 296 309 353 359 371 391 400 / 415 440 446 449 450 451 462 469 479 481 482 / 505 521 547` | `SCORING_KEYS.Si` | ✅ **BİREBİR MATCH (34 + 36 = 70)** — 500 dpi **bindirmeli iki kadraj** (`b20_t17_L`/`b20_t17_R`) |
| K ekleme | Tablo 17'de **"(K Eklemeli)" YOK** | `K_CORRECTION`'da `Si` yok | ✅ tutarlı |
| Norm dipnotu | "**Erkeklerde ortalama:26.86**, kadınlarda ortalama: **29.88** (Savaşır 1981)." | `TURKISH_NORMS` E **23.86** / K 29.88 | ⚠️ **Kadın MATCH**; Erkek: dipnot 26.86 ↔ **Tablo 30 (s.195) 23.86** → **kod Tablo 30'u izler** → **CONFLICT-040 REJECTED** (CONFLICT-037 emsali) |
| Si norm SD | (dipnotta yok) | `7.97 / 7.52` | ✅ Tablo 30 |

**Tablo 30 bu oturumda yeniden okundu** (`b20_tablo30_R.png`, 250 dpi, PDF p105 R):
Si satırı = `N 1003 · X̄ 23.86 · SD 7.97 / N 663 · X̄ 29.88 · SD 7.52` → kodla ve
`VERIFIED_DATA.md` PHASE 6 kaydıyla **birebir**.
**Yırtık/scan çizgisi** tablonun `124 · 304 · 427` ve `119 · 309 · 451` sütunundan
geçiyor → altı değer bindirme bölgesinde ikinci kez okundu ✅.
**OCR ölçümü (200 dpi, p86_L):** 70 numaradan **69** kurtarıldı, **`99` düştü** +
25 tablo-dışı token → `TABLO-NUMBERS` kuralı tekrar doğrulandı (OCR'a dayansaydık
"99 fazlalık" diye **yanlış P0 çelişkisi** üretilecekti).
Status: **VERIFIED** · **PHASE 5 KAYNAK TARAFI KAPANDI: Tablo 8-17'nin tamamı birebir.**

---

## SOURCE-SI-002 · Si (0) **bantları + "ilişki" bölümü + `049` / `027(8)`** — kitap s.157 (PDF p86 R)

Kanıt: `.audit/pages/p086_R.png` (150 dpi tam sayfa — **görselden okundu**) ·
`.audit/ocr/p086_R.txt` (34 satır; yalnız sayfa yapısı için) ·
araç: `scripts/mmpi-audit/cmp-si-batch21.ts`

**Si T bantları (4) — kelimesi kelimesine:**

| Kaynak bant etiketi | Kaynak metni | Kod `SI_T_BANDS` |
|---|---|---|
| **`70 T puanı ve üstü`** | "Sosyal açıdan beceriksiz olan kişilerdir. Sosyal ilişkilerde anksiyete yaşar ve ilişki kurmaktan kaçınırlar. **Nevrotik üçlüde yükselme görülebilir. (Ayrıca bakınız, 2, 7 ve 8 alt testlerinin yükselmesi.)**" | **2/4 cümle** — son **iki cümle YOK** → CONFLICT-025 +2 · CONFLICT-033 +1 |
| `60-69 T puanı` | "Bu kendini ortaya koymak istemeyen, yakın aile çevresinde rahat olan bireylerin profilidir. Çekingen, utangaç kişilerdir." | **BİREBİR** ✅ |
| `45-59 T puanı` | "Sosyal ilişki kurmada başarılı olan bireylere işaret etmektedir." | **BİREBİR** ✅ |
| `25-44 T puanı` | "İyimser, manipülatif, yüzeysel ve hatta biraz uçuk bireylerdir. Dürtü kontrol sorunları vardır. Diğerleri ile olmak isteyen, yalnız kalamayan bireyleri gösterir. Çoğu kolay ilişki kurar, arkadaş canlısı ve meraklıdırlar, sosyal açıdan kabul görme, onaylanma konusunda gereksinimleri çok fazla olan bireylerdir." | **BİREBİR** ✅ (kod `;` ve tek `.`; kaynakta "bireylerdir**..**" → kaynak yazım hatası, kayıt) |

Kod `25-44` bandının **alt sınırını 0'a** genişletmiş (`min: 0`, etiket `T 25-44`
korunmuş) → BİLGİ notu; kaynak alt bant sınırlarını hiç "0" vermez.

**s.157 üstü — s.156'dan süzülen Si yorum paragrafı:** "…**maya yararlıdır.** Alt test
Si'de **20 puanlık bir farklılık olan çiftlerin**, sosyal ilişkiler açısından **evlilik
çatışmalarına** düşmeleri olasıdır. Alt test Si'deki yükselmeye, **alt test 4 ve
9'daki yükselmeler** de eşlik ediyorsa, **eyleme vurukluğun bastırıldığı**
düşünülmelidir. **Alt test 2 ya da 7** özellikle **alt test 8'in** eşlik ettiği
durumlarda, **ruminatif davranışların kuvvetlendiği** görülür." → kodda **0/3 cümle**
→ CONFLICT-025 +3 · **CONFLICT-027 +1** ("20 puanlık farklılık" sayısal koşulu) ·
CONFLICT-033 +2 (Si+4+9 · Si+2/7+8 çok-ölçekli örüntüleri)

**"Si alt testinin diğer alt testlerle ilişkisi:"** (CONFLICT-039'un **üçüncü**
örneği — Sc s.146 · Ma s.152 · **Si s.157**): 9 Bakınız çifti — `01/10 (Bakınız
10/01)` · `02/20 (20/02)` · `03/30 (30/03)` · `04/40 (40/04)` · `05/50 (50/05)` ·
`06/60 (60/06)` · `07/70 (70/07)` · `08/80 (80/08)` · `09/90 (90/09)`.
→ Si bölümünde **K-örüntüsü YOK** (Ma/Sc'nin aksine); **9/9 hedef kayıt `CODES`'ta
mevcut ve etiketler BİREBİR** → çapraz referanslar **UYUMLU** (çelişki üretmez;
yalnızca bölümün kendisi modelde karşılıksız).

**Kod tipi başlıkları (2) — İKİSİ DE KODDA YOK:**
- **`049 Kodu`** → "Psikiyatrik olgularda eyleme vurukluğun bastırılması" —
  `CODES`'ta hiç yok. **`codeInterpretation('049')` → `canonicalCode('04')` → `40/04`
  kaydının metni** ("Koddaki bireyler hem kızgındırlar hem de kişilerarası
  ilişkilerde geri çekilmişlerdir…") → **CONFLICT-030 somut vaka** (kırpma, İLGİSİZ
  metin üretiyor)
- **`027(8) Kodu`** → "Bireyde güçlü ruminatif davranışlar görülebilir." — yok; en
  yakın kayıt `27/72`'de "ruminatif" hiç geçmiyor. **`codeInterpretation('027(8)')` →
  slice `'02'` → `20/02` metni** → **CONFLICT-030 somut vaka** ve kaynakta **parantezli
  alt-test notasyonu taşıyan ilk kod** (model böyle bir başlığı adresleyemez → 031)

Status: **VERIFIED** · **Kod değişikliği YOK** (eksik içerik sınıfı → DECISION-028).

---

## SOURCE-SI-003 · **s.158 = BOŞ SAYFA** → Bölüm 5 s.157'de biter; s.159 = Bölüm 6 girişi

- **s.158 (PDF p87 L):** OCR **1 satır** (`la <LOWCONF>`) · koyu piksel oranı
  **%0.62** — kıyas: dolu sayfa p086_R **%4.36**, p087_R **%5.45** → `BLANK-PAGE`
  kuralının **ikinci ölçümü** (ilki s.154)
- **s.159 (PDF p87 R):** OCR ilk satırları "**BOLUM 6** / **MINNESOTA ÇOK YÖNLÜ
  KİŞİLİK** / **ENVANTERINI YORUMLAMA** / **YAKLASIMI**" + "MMPI profilini
  yorumlamadan önce testi veren kişi, değerlendirme için gönderilen bireyin bazı
  özelliklerini dikkate almalıdır. **Hiçbir zaman körlemesine bir değerlendirme
  yapılmamalıdır.** İlk aşamada test verilecek bireyin **demografik özellikleri
  belirlenmelidir: yaş, cinsiyet, eğitim, medeni durum, meslek**…" + "Genel olarak
  MMPI yorumları, **zeka düzeyleri 80'in üzerinde olan yetişkinlere** yöneliktir.
  **Eğitim düzeyi olarak ortaokul kabul edilmektedir.** Bu değişkenlerin bazıları
  **belli kodları yorumlamada önemli** olmaktadır…"

→ **BÖLÜM 5 (kod tipleri) KAYNAK TARAMASI TAMAMLANDI: s.63-157** (Bölüm 6 ile
karıştırılmamalı; s.159'dan sonrası **PHASE 10**). s.159'daki "demografik
değişkenler belli kodları yorumlamada önemlidir" cümlesi **CONFLICT-034'ün genel
çerçevesi** olarak kayda geçti (kodda yaş/eğitim/cinsiyet bağlamı yok).

---

## SOURCE-CODE-CHANGE-014 · CHANGE-014 ile **kodda VAR** olan gövdeler — 2026-09-22

Yukarıdaki dört kayıt "kaynakta VAR / kodda YOK" olarak belgelenmişti;
**DECISION-029 (A) onayı + CHANGE-014** ile koda alındı. Alıntılar **birebir**
kaynak metnidir (150 dpi tam sayfa görsel okuma: `.audit/pages/p073_{L,R}.png`
s.130-131 · `p084_R.png` s.153 · `p086_R.png` s.157); OCR tek başına esas alınmadı.

| Fact | Sayfa | Artık koda karşılığı |
|---|---|---|
| `91/19 Kodu` gövdesi | s.153 | `mmpiSourceCodes.ts` → `BLOCK_CODES['Ma:19']` (metin + 8 `seeAlso` çapraz ref'i) |
| `64/46 Kodu` gövdesi | s.130-131 | `BLOCK_CODES['Pa:46']` (metin + `seeAlso` + **Sc > 70 koşulu**) |
| `049 Kodu` | s.157 | `BLOCK_CODES['Si:049']` |
| `027(8) Kodu` | s.157 | `BLOCK_CODES['Si:027']` (`rawCode: '027(8)'` — parantezli notasyon artık adreslenebiliyor) |
| Nevrotik üçlü konfigürasyonları 2-3-4 | s.103-106 | `mmpiInterpretation.ts` → `neurotic-step` / `neurotic-hat` / `neurotic-rising` (+ `PatternHit.source`) |
| Koşullu cümleler (12 anahtar) | s.68 · 72 · 87 · 118-121 · 142 · 146 · 147-150 · 131 | `CODE_CONDITIONS` + `Pa:46` → `CodeCondition[]` (`quote` + `test`/`manual`) |

**Hâlâ YOK (bilerek bekletiliyor — DECISION-028):** `Yüksek 9/Düşük K Kodu` gövdesi
(s.153) · Si `70+` bandının 2 kuyruk cümlesi (s.157) · s.156→157 süzülen giriş
paragrafı (0/3) · 12/21 lise-ergen paragrafları (s.68) · `Yüksek 9/Yüksek K`
K-örüntüleri (s.152) · kalan 44 eksik gövde başlığı.

---

## SOURCE-B6-001 · **BÖLÜM 6 profil örüntüleri #1-#10** — kitap s.160-169 (PDF p88 L – p92 R)

Sayısal eşikler **kutu içi kaynak cümlelerinden**; her biri **150 dpi tam sayfa
görsel okumasıyla** doğrulandı (`.audit/pages/p088_L…p092_R.png`). Kod tarafı
karşılaştırması: `src/scoring/mmpiInterpretation.ts` → `detectPatterns()` ve
`detectSingleElevations()`.

| # | Örüntü (kaynak adı) | Sayfa · Şekil | Kaynak kuralı (birebir) | Kodda |
|---|---|---|---|---|
| 1 | **Konversiyon V** | s.160 · Şekil 23 | “Test Hs ve Hy, D alt testinden **10 ya da daha fazla T puanı** yüksektir ve **Hs ve Hy en az 70 T puanındadır**. Bu klasik konversiyon V’de diğer alt testler de yükselir, ancak bu Hs ve Hy kadar değildir.” | ⚠️ `conversion-v` = **65/5** → **eşik sapması** (041) |
| 2 | **Paranoid V** | s.161 · Şekil 24 (“Paranoid V, Psikotik V”) | “**Pa ve Sc alt testleri 80 T puanında, Pt alt ölçeği ise 70 T puanındadır.** Bu profil örüntüsüne ilişkin ayrıntılı bilgi Sc alt testinin yorumlanmasında verilmiştir.” | ⚠️ `psychotic-v` = **Pa,Sc ≥ 70 ∧ min > Pt** → **eşik sapması** (041) |
| 3 | **Pd Yükselliği Profili** | s.162 · Şekil 25 | “**Pd alt testi 70 T puanının üstündedir ve bütün alt testlerden en az 10 T puanı yüksektir.**” | ✅ `SINGLE_PD`: `Pd ≥ 70 ∧ Pd − max(öteki klinik) ≥ 10` — **BİREBİR** (s.111 ile çapraz teyit) |
| 4 | **“Kuş Kanadı” Profili** | s.163 · Şekil 26 | “Hs, D, Hy ve Pd testleri **70 T puanına yükselmiş** ve **kadınlarda Mf alt testi 50 T puanındadır**. Psikotik testlerde de yükselme vardır. Bu yükselme kuş kanadına benzediği için profil bu adı almaktadır.” | ❌ YOK |
| 5 | **Pasif-Agresif V (Kadınlarda)** | s.164 · Şekil 27 | “**4 ve 6 70 T puanında ya da üstünde, Mf alt testi 50 T puanının altındadır.** Diğer alt testler 70 T puanında olsa bile bu pasif-agresif kişilik bozukluğudur.” | ❌ YOK |
| 6 | **Psikotik Yükselme (pozitif eğim)** | s.165 · Şekil 28 | “Mf alt testinden çizilen dikey bir çizgi MMPI’ı nevrotik (profilin sol tarafı) ve psikotik (profilin sağ tarafı) olarak ikiye böler. **Pozitif eğim, psikotik testlerin 70 T puanının üstünde olması, nevrotik testlerin 70 T puanının altında kalmasıdır.**” | ❌ YOK |
| 7 | **Nevrotik Yükselme (negatif eğim)** | s.166 · Şekil 29 | “Negatif eğim, ise profilin sol ya da nevrotik bölümünün yükselmesi ve **psikotik testlerde belirgin düşüklük** olmasıdır. Bu nevrotik bir uyumu göstermektedir.” | ❌ YOK — **nicel eşik yok** (“belirgin”) → kodlanırsa eşiği kaynakta olmayan bir sayı olur |
| 8 | **“Yüzen” Profil** | s.167 · Şekil 30 | “Bu profilde **Hs’den, Ma’ya kadar olan bütün değerler 70 T puanının üstündedir** ve buna **F alt testindeki yükselme** eşlik eder. Bu profil **borderline kişilik bozukluğu** olan kişilere özgüdür.” + “**Bu profil tipiyle bağlantılı bir kod tipi verilemez.**” | ❌ YOK — `multi-high` (3+ ≥ 65) **aynı şey değil** |
| 9 | **Batık Profil** | s.168 · Şekil 31 | “Profilin **45-54 T puanı arasında** yer alması: Yorum yapmak zordur. Tek başına bu tür bir yükselmenin anlamı yoktur. **T puanlarının en düşük olduğu alt testlere bakmak gerekmektedir.**” | ❌ YOK |
| 10 | **Sınır Profil** | s.169 · Şekil 32 | “**T puanı 60-70 arasındadır.** Geçerlik testlerinde bir yükselme vardır, ancak bu tam bir yükselme değildir. **Klinik alt testlerdeki T puanları 54 T puanının üstündedir.** Bu aradaki yükselmeler semptom belirtmez, daha çok kişilik özelliklerini gösterir… 60-70 T puanı aralığındaki profili bu özelliklerin onun kişilik yapısının bir parçası olduğuna işaret etmektedir.” | ❌ YOK |

**Şekil alt yazıları (birebir):** “Şekil 23. Konversiyon V ya da Psikosomatik V.” ·
“Şekil 24. Paranoid V, Psikotik V.” · “Şekil 25. "Pd Yükselliği" Profili.” ·
“Şekil 26. "Kuş Kanadı" Profili.” · “Şekil 27. Pasif-Agresif V (Kadınlarda).” ·
“Şekil 28. "Psikotik" ya da pozitif eğim.” · “Şekil 29. "Nevrotik" ya da negatif eğim.” ·
“Şekil 30. "Yüzen" Profil.” · “Şekil 31. Batik Profil.” (metin **“Batık”** diyor,
alt yazım **“Batik”**) · “Şekil 32. Sınır Profil.”

**Sayısal okuma uyarısı:** #10’daki “**54 T** puanının üstündedir” OCR’da
“S4T” olarak düşmüştü → **görselden** okundu (`TABLO-NUMBERS` kuralı). #9’un
aralığı **45-54**; ölçek bantlarındaki `45-59` ile **karıştırılmamalı** (biri profil
düzeyi desen, diğeri tek ölçek bandı).

> **→ UYGULANDI (DECISION-030/A · CHANGE-015, 2026-09-22):** bu tablodaki
> “Kodda” sütunu artık tarihî. `conversion-v` **70/10** · `psychotic-v` **80/80/70**
> oldu; #4 `kus-kanadi` · #5 `pasif-agresif-v` · #6 `pozitif-egim` · #8 `yuzen-profil` ·
> #9 `batik-profil` · #10 `sinir-profil` **eklendi**; #7 `negatif-egim` kaynakta sayı
> olmadığı için **`manual`** (otomatik vurmez) bırakıldı. #3 `SINGLE_PD` değişmedi.
> Her BÖLÜM 6 kaydı `source` + `quote` (aşağıdaki cümlelerle birebir) taşıyor;
> kapanış kanıtı `scripts/mmpi-audit/cmp-b6-batch23.ts` → **0 FARK**.

## SOURCE-B6-002 · **BÖLÜM 6 bağlam ve uyarı direktifleri** — kitap s.159-160, 166-167, 169

- **s.159 (giriş):** “MMPI profilini yorumlamadan önce testi veren kişi, değerlendirme
  için gönderilen bireyin bazı özelliklerini dikkate almalıdır. **Hiçbir zaman
  körlemesine bir değerlendirme yapılmamalıdır.** İlk aşamada test verilecek bireyin
  **demografik özellikleri belirlenmelidir: Yaş, cinsiyet, eğitim, medenî durum,
  meslek.** gibi.”
- **s.159:** “Genel olarak MMPI yorumları, **zekâ düzeyleri 80’in üzerinde olan
  yetişkinlere** yöneliktir. **Eğitim düzeyi olarak ortaokul kabul edilmektedir.**
  … MMPI alt testlerinin bazıları yaştan etkilenmektedir. Örneğin, **Hs ve D alt
  testlerde yaşın ilerlemesi ile yükselme** olduğu saptanmıştır.”
- **s.159:** “Bazen birey "anlaşılması zor" olarak değerlendirme amacıyla
  gönderilmektedir, eğer değerlendirme yapan kişi MMPI geçerlik testlerinden **K alt
  testini bu bireyin profilinde yüksek bulursa** ”anlaşılması zor”un ne anlama
  geldiğini açıklayabilir. Bu bilgi, bireyin **aşırı kontrolünü kaldıracak olası
  terapötik yöntemler için yol gösterici** olabilir.”
- **s.159:** “Hasta psikiyatri kliniğinde yatıyor ya da ayaktan izleniyorsa hastanın
  **psikopatolojisinin ne olduğunun bilinmesi** önemlidir.”
- **s.159-160 (“Kod tipini belirleme”):** “MMPI profilini değerlendirmede bu alanda
  **eğitim almamış bir kişinin kod tipini belirlemesi oldukça zordur.** Ancak klinik
  testlerde belirgin yükselmenin olduğu durumlarda kolaylıkla görülebilir.
  **Yükselmenin hepsi 70 T puanına yakın ya da bunun üstündedir.** Bunun yanı sıra
  **ikili ve üçlü kodları belirlemede, hastadan alınan bilgi ve testi veren kişinin
  deneyimi önemlidir.**”
- **s.166:** “**Sadece bu tür yükselmelerle testi alan kişiye nevrotik ya da psikotik
  tanısının konulması doğru değildir.** Bu nedenle profile ilk bakıldığında psikotik
  ya da nevrotik profil olduğuna karar verildikten sonra ayrıntılı değerlendirme
  yapılmalıdır.” (s.167’ye taşan cümle)
- **s.167:** “Bu profil tipiyle bağlantılı **bir kod tipi verilemez.** Borderline
  kişilik bozukluğu olan hastalar bu tür bir profil verebilirler.”
- **s.169:** “MMPI’yı değerlendirirken testlerin T puanlarına göre de değerlendirme
  yapılabilmektedir… **Eğer klinik testler 60-64 T puanı arasında ise MMPI’dan
  geliştirilen diğer testler bireyi değerlendirmede daha yararlı olabilir
  (Butcher 1984).**” → **BÖLÜM 7’ye geçiş gerekçesi**; `MMPIDerived`/`PERSONALITY_KEYS`
  varlığıyla **UYUMLU**, ancak bu gerekçe metni koda alınmadı (**BİLGİ**).

**Kod karşılığı (CHANGE-015):** bu direktiflerin 8’i `MMPI_PATTERN_CAVEATS` olarak
`src/scoring/mmpiInterpretation.ts`'a alındı ve `MMPIExtraTab`’da “Yorum Çekinceleri
(BÖLÜM 6)” kutusunda basılıyor; desen-özgül olanlar (#6/#7 → “tanı konulması doğru
değildir”, #8 → “kod tipi verilemez”, #9 → “en düşük alt testlere bakılmalıdır”)
ayrıca ilgili desenin `caveat` alanında duruyor → **CONFLICT-042 FIXED**.

**Sayfa yapısı:** s.159-169 arası **11 sayfa**; **s.170 BOŞ SAYFA** (PDF p93 L ·
koyu piksel %0.24 · OCR 0 satır). Her örüntü kutusunun altında profil grafiği var
(eksenler: `? L F K` + `Hs D Hy Pd Mf Pa Pt Sc Ma Si`, üstte ölçek numaraları
`1 2 3 4 5 6 7 8 9 0`, yatay çizgiler **30 / 50 / 70**) → **eğri değerleri OCR ile
okunmaz** (`DECISION-014` uyarısı); sayısal eşikler yalnız **kutu metninden** alındı.

**Olgu anlatıları (7 adet: 38, 42, 21, 23, 40 yaş vb.)** vaka formundadır; hiçbir
kod kaydına girmesi gerekmez → **EXTRA/KAYIT DIŞI** (kullanıcı arayüzüne klinik vaka
metni taşınması DECISION-028 kapsamında **yok**).

---

## BÖLÜM 5: D (2) KOD BLOĞU VERİLERİ (kitap s.81-92 · PDF p048_R - p054_L)

### SOURCE-CODE-D-001 — D Bloğu Sayfa ve Başlık Envanteri (kitap s.81-92)
- **Görsel ve OCR Taraması:** PDF p048_R (s.81) ile p054_L (s.92) arasındaki sayfalar taranarak tüm başlıklar, olası tanılar ve koşullar çıkarıldı.
- **Başlık Envanteri:**
  1. `21/12 Kodu` (s.82)
  2. `23 Kodu` (s.82-83)
  3. `213/231 Kodu` (s.83-84) — Olası Tanılar: Depresif reaksiyon ya da somatoform bozukluk.
  4. `24/42 Kodu` (s.84-85)
  5. `243/432 Kodu` (s.85)
  6. `247/427/472 ve 742 Kodları` (s.85-86) — Olası Tanılar: Pasif-agresif kişilik bozukluğu, Depresif semptomlar, Anksiyete bozukluğu.
  7. `248 Kodu` (s.86)
  8. `248/Yüksek F Kodu` (s.86) — Olası Tanı: Temel şizofrenik konfigürasyon.
  9. `25/52 Kodu` (s.86-87)
  10. `26/62 Kodu` (s.87)
  11. `27/72 Kodu` (s.87-88)
  12. `273/723 Kodu` (s.88)
  13. `274/724 Kodu` (s.88) — Olası Tanı: Depresif reaksiyon.
  14. `275/725 Kodu` (s.88-89)
  15. `278/728 Kodu` (s.89) — İntihar riski.
  16. `270 Kodu` (s.90) — Olası Tanı: Şizoid kişilik bozukluğu.
  17. `28/82 Kodu` (s.90)
  18. `281/821 Kodu` (s.90)
  19. `284/824 Kodu` (s.91)
  20. `287/827 Kodu` (s.91) — İntihar riski.
  21. `29/92 Kodu` (s.91-92)
  22. `20/02 Kodu` (s.92) — Olası Tanı: Pasif-agresif kişilik bozukluğu.
  23. `207 Kodu` (s.92)

### SOURCE-CODE-D-002 — D Bloğu Koşullu Yorum Kuralları (Conditions)
- **23 Kodu (s.83):**
  - "Düşük Mf ya da düşük Ma (özellikle düşük 9) alt testi olanlarda apati ve hareketsizlik daha belirgindir." → `Mf < 50` veya `Ma < 50` T.
- **24/42 Kodu (s.84):**
  - "3, 7 ya da 8 alt testleri üçüncü yükselen test ise bu kod tiplerine bakılmalıdır." → `third in ['Hy', 'Pt', 'Sc']`.
- **27/72 Kodu (s.87):**
  - "Yükselme 85 T puanının üstünde ise ilaç tedavisi gerekir." → `elevation > 85 T`.
  - "Hs alt testi de yükselmişse somatik yakınmalar belirginleşir." → `Hs >= 70 T`.
- **20/02 Kodu (s.92):**
  - "7 ya da 4 alt testlerinin üçüncü yükselen test olduğu durumlarda pasif-bağımlı ya da pasif-agresif kişilik özellikleri ön plana çıkar." → `third in ['Pt', 'Pd']`.
- **213/231 Kodu (s.84):**
  - "7 alt testi de yükselmişse bu hastalarda anksiyete, ajitasyon ve endişe görülür." → `Pt >= 70 T`.
- **247/427/472/742 Kodları (s.85-86):**
  - Erkekler: "Bu kod tipi olan erkekler, genellikle bağımlı ve pasif bir rolü benimserler (özellikle Mf yükselmişse)." → `gender === 'Erkek' && Mf >= 70 T`.
  - Kadınlar: "Kadınlar (özellikle Mf alt testi düşükse), geleneksel kadın rolünü aşırı benimseyebilirler." → `gender === 'Kadın' && Mf < 50 T`.
- **248 Kodu (s.86):**
  - "F alt testi de yükselmişse, bu bireylerde şizofreni olasılığı düşünülmelidir." → `F >= 70 T`.
- **274/724 Kodu (s.88):**
  - "Hy alt testi de yükselmişse kronik alkolizm öyküsü sık görülür." → `Hy >= 70 T`.
  - "Kadınlarda (özellikle düşük Mf) bağımlılık gereksinimleri daha belirgindir." → `gender === 'Kadın' && Mf < 50 T`.
- **275/725 Kodu (s.89):**
  - "Pd alt testi düşükse, yetersizlik ve bağımlılık duyguları daha belirgindir." → `Pd < 50 T`.
- **278/728 Kodu (s.89):**
  - ⚠️ **Kritik İntihar Uyarısı:** "K ve Hs alt testleri düşük (özellikle 50 T puanının altında) ya da Ma alt testi yüksekse intihar olasılığı dikkatle değerlendirilmelidir." → `(K < 50 && Hs < 50) || Ma >= 70`.
  - "Si alt testi yükselmişse, içe çekilme ve süreğen depresyon görülür." → `Si >= 70 T`.
  - "Pd alt testi düşükse, başkalarına aşırı bağımlı olurlar." → `Pd < 50 T`.
  - "Kadınlarda Mf alt testi düşükse pasif ve bağımlı özellikler belirginleşir." → `gender === 'Kadın' && Mf < 50 T`.
- **281/821 Kodu (s.90):**
  - "Hy alt testi de yükselmişse somatik yakınmalar ön plana çıkar." → `Hy >= 70 T`.
- **284/824 Kodu (s.91):**
  - "Pd alt testi 80 T puanının üstünde ise kontrol kaybı ve öfke patlamaları görülebilir." → `Pd > 80 T`.
- **287/827 Kodu (s.91):**
  - ⚠️ **Kritik İntihar Uyarısı:** "K alt testi düşük ve Ma alt testi yüksekse intihar düşünceleri ve girişimleri açısından acil dikkat gerekir." → `K < 50 && Ma >= 70`.

---

## BÖLÜM 5: Hy (3) KOD BLOĞU VERİLERİ (kitap s.95-103 · PDF p055_R - p059_R)

### SOURCE-CODE-HY-001 — Hy Bloğu Sayfa ve Başlık Envanteri (kitap s.95-103)
- **Görsel ve OCR Taraması:** PDF p055_R (s.95) ile p059_R (s.103) arasındaki sayfalar taranarak tüm başlıklar, olası tanılar ve koşullar çıkarıldı.
- **Başlık Envanteri:**
  1. `Yüksek 3 / Yüksek K Kodu` (s.96) — Katı optimizm, kaçınma davranışı.
  2. `31 Kodu (Bakınız 13/31 Kodu)` (s.96)
  3. `32 Kodu (Eğer 2 alt testi, 3 alt testinin 5 T puanı sınırları içinde ise 23 koduna da bakınız.)` (s.96-97) — 23'ün aksine belirgin somatik/depresif ilgilenme.
  4. `321 Kodu` (s.97) — Kronik nevrotik durum, yaygın hipokondriyak semptomlar.
  5. `34/43 Kodu` (s.97-98) — Olası Tanı: Pasif-agresif kişilik bozukluğu, agresif tip.
  6. `Yüksek 3 / Düşük 4 Kodu` (s.98-99) — Olası Tanı: Pasif-agresif kişilik bozukluğu.
  7. `345/435/534 Kodları` (s.99) — İmmatür, cinsel yetersizlik kaygıları.
  8. `346/436 Kodları` (s.99) — Eleştiriye duyarlılık, dönemsel eyleme vurukluk.
  9. `35/53 Kodu` (s.99)
  10. `36/63 Kodu` (s.99-100)
  11. `37/73 Kodu` (s.100-101)
  12. `38/83 Kodu` (s.101) — Olası Tanılar: Şizofreni, Bazı durumlarda histerik nevroz.
  13. `39/93 Kodu` (s.101) — En sık görülen üçlü kod: 394/934.
  14. `30/03 Kodu` (s.101)

### SOURCE-CODE-HY-002 — Hy Bloğu Koşullu Yorum Kuralları (Conditions)
- **Yüksek 3 / Yüksek K Kodu (s.96):**
  - "Alt testler 3 ve K ikisi birden yüksek olduğunda ve F ve Sc alt testleri düşük olduğunda..." → `Hy >= 70 && K >= 70 && F < 50 && Sc < 50`.
- **32 Kodu (s.96-97):**
  - "Eğer 2 alt testi, 3 alt testinin 5 T puanı sınırları içinde ise 23 koduna da bakınız." → `|D - Hy| <= 5 T`.
  - "Erkekler için test 1, 8 ve 9 sıklıkla üçüncü en yüksek testtir." → `gender === 'Erkek' && third in ['Hs', 'Sc', 'Ma']`.
  - "Yorgunluk ve tükenmişlikten yakınabilirler (özellikle eğer test 5 düşük ise)..." → `gender === 'Kadın' && Mf < 50 T`.
  - "Kadınlar için çoğunlukla 1, 4 ve 8, üçüncü en yüksek testtir." → `gender === 'Kadın' && third in ['Hs', 'Pd', 'Sc']`.
- **34/43 Kodu (s.97-98):**
  - "Erkekler için test 2, 5 ve 6 sıklıkla üçüncü en yüksek testtir." → `gender === 'Erkek' && third in ['D', 'Mf', 'Pa']`.
  - "Kadınlar için üçüncü en yüksek testler sıklıkla 2, 6 ve 8'dir." → `gender === 'Kadın' && third in ['D', 'Pa', 'Sc']`.
  - "3 ve 4'ün göreceli yüksekliklerinde 3 yüksekse kızgınlık ketlenir..." → `Hy > Pd`.
  - "4 yüksekse öfke daha fazla ifade edilir..." → `Pd > Hy`.
- **345/435/534 Kodları (s.99):**
  - "Alt test 3, 4'ten yüksekse ve K alt testi 50 T puanının üstündeyse, duyguların ve isteklerin eyleme dökülme olasılığı düşüktür." → `Hy > Pd && K > 50 T`.
- **346/436 Kodları (s.99):**
  - "Eğer 6 alt testi, 3 alt testinin 5 T puanı sınırları içinde ise 36/63 kodlarına da bakınız." → `|Pa - Hy| <= 5 T`.
- **35/53 Kodu (s.99):**
  - "4 ya da 6 genellikle üçüncü yüksek testtir." → `third in ['Pd', 'Pa']`.
- **36/63 Kodu (s.99-100):**
  - "ve sıklıkla üçüncü yükselen test Si ya da Sc'dir." → `third in ['Si', 'Sc']`.
  - "Alt test 6, 3'ten 5 ya da daha fazla T puanı yüksek olduğunda..." → `Pa - Hy >= 5 T`.
  - "Alt test 3, 6'dan yüksekse..." → `Hy > Pa`.
- **37/73 Kodu (s.100-101):**
  - "Her iki cinsiyette de 1, 2 ve 4 alt testleri sıklıkla üçüncü en yüksek testtir." → `third in ['Hs', 'D', 'Pd']`.
- **39/93 Kodu (s.101):**
  - "özellikle eğer alt test Si 40 T puanının altında ise çok yüzeysel olabilirler." → `Si < 40 T`.
  - "En sık görülen üçlü kod tipi 394/934'tür." → `third === 'Pd'`.
- **30/03 Kodu (s.101):**
  - "Üçüncü en yüksek test 1 ve 2'dir." → `third in ['Hs', 'D']`.

---

## BÖLÜM 5: Pd (4) KOD BLOĞU VERİLERİ (kitap s.107-121 · PDF p061_R - p068_L)

### SOURCE-CODE-PD-001 — Pd Bloğu Sayfa ve Başlık Envanteri (kitap s.107-121)
- **Görsel ve OCR Taraması:** PDF p061_R (s.107) ile p068_L (s.120) arasındaki sayfalar taranarak tüm başlıklar, olası tanılar ve koşullar çıkarıldı.
- **Başlık Envanteri:**
  1. `41 Kodu (Bakınız 14/41 Kodu)` (s.108)
  2. `42 Kodu (Bakınız 24/42 Kodu)` (s.108)
  3. `43 Kodu (Bakınız 34/43 Kodu)` (s.111)
  4. `Yüksek 4 / Düşük 5 Kodu` (s.111-112)
  5. `45/54 Kodu` (s.112-113)
  6. `456 Kodu` (s.113) — Olası Tanılar: Pasif-agresif kişilik bozukluğu, Bağımlı kişilik bozukluğu.
  7. `46/64 Kodu` (s.113-114) — Olası Tanılar: Pasif-agresif kişilik bozukluğu, Paranoid kişilik bozukluğu, Şizofreni reaksiyonu (paranoid tip), Sınırda kişilik bozukluğu.
  8. `462/642 Kodu` (s.114-115)
  9. `463/643 Kodu` (s.115)
  10. `468/648 Kodu` (s.115) — Olası Tanılar: Paranoid şizofreni, Pasif-agresif kişilik bozukluğu (şizoid veya paranoid özellikli).
  11. `469 Kodu` (s.115)
  12. `47/74 Kodu` (s.115-116)
  13. `48/84 Kodu` (s.116-117) — Olası Tanılar: Şizoid veya paranoid kişilik bozukluğu, Şizofreni (paranoid tip), Dissosiyatif reaksiyon.
  14. `48 / Yüksek F Kodu (48/84 — Yüksek F / Düşük 2)` (s.117) — Olası Tanılar: Sosyopat kişilik, Psikopatik kişilik, Paranoid şizofreni.
  15. `482/842/824 Kodu` (s.117-118)
  16. `489/849 Kodu` (s.118)
  17. `49/94 Kodu` (s.118-119) — Olası Tanılar: Antisosyal kişilikle birlikte bazı tip karakter bozuklukları, Mani, Şizofreni veya paranoid durum.
  18. `493/943 Kodu` (s.119)
  19. `495/945 Kodu` (s.119-120)
  20. `496/946 Kodu` (s.120)
  21. `498/948 Kodu` (s.120)
  22. `40/04 Kodu (Bakınız 04/40 Kodu)` (s.120)

### SOURCE-CODE-PD-002 — Pd Bloğu Koşullu Yorum Kuralları (Conditions)
- **Yüksek 4 / Düşük 5 Kodu (s.111-112):**
  - "Erkeklerde düşük 5, bireyin kendini erkeksi olarak görme çabasını gösterir..." → `gender === 'Erkek' && Mf < 50 T`.
  - "Bu örüntüdeki kadınlar kızgındırlar, geleneksel kadın rolüne isyan ederler..." → `gender === 'Kadın' && Mf < 50 T`.
  - "kadınlarda özellikle eğer test 6 da yüksekse şüphecilik ve öfke belirginleşir..." → `gender === 'Kadın' && Pa >= 70 T`.
  - "kadınlarda alt test 3 de yükselmişse pasif-bağımlı manevralar artar..." → `gender === 'Kadın' && Hy >= 70 T`.
- **45/54 Kodu (s.112-113):**
  - "Erkeklerde 5 yüksektir (özellikle eğitimli ve entelektüel erkeklerde)..." → `gender === 'Erkek' && Mf >= 70 T`.
  - "Kadınlarda 5 düşüktür; geleneksel kadınsı role aşırı uyum ya da edilgenlik görülebilir..." → `gender === 'Kadın' && Mf < 50 T`.
  - "4 alt testi, 5 alt testinden yüksek olduğunda açık isyankarlık ve otorite çatışmaları daha fazladır..." → `Pd > Mf`.
- **46/64 Kodu (s.113-114):**
  - "Alt test 4, test 6'dan yüksek olduğunda eyleme vurukluk, öfke patlamaları ve antisosyal davranışlar daha belirgindir." → `Pd > Pa`.
  - "Alt test 6, 4'ten yüksek olduğunda şüphecilik, yansıtma ve paranoid düşünceler ön plana geçer." → `Pa > Pd`.
  - "Kadınlarda 46/64 kodu psikoz öncesi durumlarda (prepsikoz) da görülebilir; özellikle Sc yüksekliği ve K düşüklüğü eşlik ediyorsa dikkat edilmelidir." → `gender === 'Kadın' && Sc >= 70 T && K < 50 T`.
- **468/648 Kodu (s.115):**
  - "K testi 50 T puanının altında ise savunmaların zayıfladığı ve psikotik kırılma riskinin arttığı düşünülmelidir." → `K < 50 T`.
  - "Eğer test 5, 4 ve 6'nın 5 T puanı alanı içinde ise cinsel kimlik çatışmaları ve aşırı alınganlık tabloya eklenir." → `|Mf - Pd| <= 5 || |Mf - Pa| <= 5`.
- **469 Kodu (s.115):**
  - "Bu kod tipinde ajitasyon ve ani öfke patlamaları belirgindir (özellikle test 9 da 70 T puanı ve üzerinde ise)." → `Ma >= 70 T`.
- **48 / Yüksek F Kodu (s.117):**
  - "Yüksek F ve Düşük 2 örüntüsü (özellikle F 70 T ve üzeri, 2 alt testi 50 T puanının altında ise) antisosyal ve dürtüsel eylemlerin suçluluk duymaksızın sürdürülmesine işaret eder." → `F >= 70 T && D < 50 T`.
  - "özellikle eğer K da yüksekse birey antisosyal eylemlerini ustaca gizleyebilir ve manipülatif olabilir." → `K >= 70 T`.
- **489/849 Kodu (s.118):**
  - "Bu kişilerde ajitasyon, kontrol kaybı ve öfke patlamaları sık görülür; saldırganlık ve şiddet riski yüksektir (özellikle test 9 70 T puanı ve üzerinde ise)." → `Ma >= 70 T`.
- **493/943 Kodu (s.119):**
  - "Eğer 3 alt testi ile 4 alt testi arasındaki fark 5 T puanı ya da daha az ise duyguların dışa vurumu somatik kanallarla perdelenmeye çalışılabilir." → `|Hy - Pd| <= 5`.
- **495/945 Kodu (s.119-120):**
  - "Test 7 de yüksekse (70 T puanı ve üzeri), dürtüsel eylemler sonrasında yoğun kaygı, suçluluk ve pişmanlık döngüsü gözlenir." → `Pt >= 70 T`.
- **496/946 Kodu (s.120):**
  - "Test 8 de yüksekse (70 T puanı ve üzeri), kontrolsüz şiddet ve homisidal davranış riski artar." → `Sc >= 70 T`.
  - "K alt testi 50'nin altında ise ego gücünün zayıflığı nedeniyle dürtü kontrolü tamamen yitirilebilir." → `K < 50 T`.

---

## BÖLÜM 5: Pa (6) KOD BLOĞU VERİLERİ (kitap s.127-135 · PDF p071_R - p075_R)

### SOURCE-CODE-PA-001 — Pa Bloğu Sayfa ve Başlık Envanteri (kitap s.127-135)
- **Görsel ve OCR Taraması:** PDF p071_R (s.127) ile p075_R (s.135) arasındaki sayfalar taranarak tüm başlıklar, olası tanılar ve koşullar çıkarıldı.
- **Başlık Envanteri:**
  1. `61/16 Kodu (Bakınız 16/61 Kodu)` (s.130)
  2. `62/26 Kodu (Bakınız 26/62 Kodu)` (s.130)
  3. `63/36 Kodu (Bakınız 36/63 Kodu)` (s.130)
  4. `64/46 Kodu (Ayrıca 46/64, 462/642, 463/643 kodlarına ve 468/648 kodlarına bakınız)` (s.130-131)
  5. `648 Kodu` (s.131) — Kronik profil, intihar girişimleri, ilaç kullanımı.
  6. `65/56 Kodu (Bakınız 56/65 Kodu)` (s.131)
  7. `67/76 Kodu` (s.131) — Olası Tanı: Dekompanze obsesif kompulsif bozukluk, şizofreniye geçiş.
  8. `678/876 Kodları` (s.131-132) — Olası Tanı: Paranoid tip şizofreni (Psikotik Vadi).
  9. `679 Kodu` (s.132) — Dürtüsel dönemler, dönemsel suçluluk ve öfke patlamaları.
  10. `68/86 Kodu (Ayrıca 468/648, 486/846, 489/849 kodlarına bakınız)` (s.132-133) — Olası Tanılar: Paranoid durum, Paranoid şizofreni (6 ve 8 alt testleri 75 T üstünde ise), Şizoid kişilik.
  11. `680/860 Kodları` (s.133) — Olası Tanı: Paranoid şizofreni.
  12. `69/96 Kodu (Ayrıca 698/968 kodlarına bakınız)` (s.133-134) — Olası Tanılar: Manik bozukluğun bazı tipleri, Akut psikotik epizod, F ve Sc yüksekse paranoid şizofreni.
  13. `694/964 Kodları` (s.133-134) — ⚠️ **Kritik Şiddet / Cinayet Uyarısı:** "Saldırma, mücadele etme ve hatta cinayet potansiyeli değerlendirilmelidir."
  14. `698/968 Kodları` (s.134) — Olası Tanı: Şizofreni paranoid tip.
  15. `60/06 Kodu` (s.134) — Kadınlarda özellikle 30 yaşından sonra.
  16. `456 Alt Testlerinin Örüntüsü (Scarlett O'Hara Vadisi)` (s.134-135, Şekil 21) — 4 ve 6 > 65 T, 5 = 35 T.

### SOURCE-CODE-PA-002 — Pa Bloğu Koşullu Yorum Kuralları (Conditions)
- **67/76 Kodu (s.131):**
  - "Oldukça nadir görülür. 2 ya da 8 alt testleri yükselen üçüncü alt testtir." → `third in ['D', 'Sc']`.
  - "Eğer 6 alt testi 7'den daha yüksekse ya da ikisi aynı düzeydeyse, obsesif-kompulsif bozukluktan psikotik döneme bir geçiş olabileceği dikkate alınmalıdır." → `Pa >= Pt`.
- **678/876 Kodları (s.131-132):**
  - "6 ve 8, 7'den yüksek ise bu psikotik vadiyi oluşturur." → `Pa > Pt && Sc > Pt`.
- **68/86 Kodu (s.132-133):**
  - "Pd ve Pt alt testleri, en yüksek üçüncü testtir." → `third in ['Pd', 'Pt']`.
  - "Paranoid vadide 6 ve 8 alt testleri 70 T puanı civarındadır ve 7 alt testi 10 T puanı aşağıdadır." → `Pa >= 70 && Sc >= 70 && Pt <= Pa - 10 && Pt <= Sc - 10`.
  - "Ergenlerde genellikle saldırganlık nöbetleri (eğer K 50 T puanının altında ise)" → `K < 50 T`.
  - "6 ve 8 alt testleri 75 T puanının üstünde ise paranoid şizofreni düşünülmelidir." → `Pa >= 75 && Sc >= 75`.
- **69/96 Kodu (s.133-134):**
  - "4 ve 8 alt testi, en çok yükselen üçüncü alt testtir." → `third in ['Pd', 'Sc']`.
  - "Alt test F ve Sc yüksekse paranoid şizofreni." → `F >= 70 && Sc >= 70`.
  - "Kod daha çok kadınlarda görülmektedir; daldan dala atlayan, küçük durumlara aşırı tepki veren kişilerdir." → `gender === 'Kadın'`.
- **698/968 Kodları (s.134):**
  - "Eğer 8 alt testi, 6'dan 5 T puanı aşağıda ise 68/86 koduna bakın." → `Pa - Sc >= 5`.
- **60/06 Kodu (s.134):**
  - "Erkeklerde çok az görülür, kadınlarda özellikle 30 yaşından sonra rastlanır." → `gender === 'Kadın'`.
  - "2, 4 ve 3 yükselen diğer alt testlerdir." → `third in ['D', 'Pd', 'Hy']`.
- **456 Alt Testlerinin Örüntüsü / Scarlett O'Hara Vadisi (s.134-135):**
  - "Bu örüntüye alt test 3'ün yükselmesi eşlik ediyorsa..." → `Hy >= 70 T`.

---

## BÖLÜM 5: Pt (7) KOD BLOĞU VERİLERİ (kitap s.137-142 · PDF p076_R - p079_L)

### SOURCE-CODE-PT-001 — Pt Bloğu Sayfa ve Başlık Envanteri (kitap s.137-142)
- **Görsel ve OCR Taraması:** PDF p076_R (s.137) ile p079_L (s.142) arasındaki sayfalar RapidOCR ve pymupdf ile taranarak tüm başlıklar, olası tanılar ve koşullar çıkarıldı.
- **Doğrulanan Başlıklar:**
  1. `71/17 Kodu` (s.140) — Bakınız 17/71 Kodu.
  2. `72/27 Kodu` (s.140) — Bakınız 27/72 Kodu.
  3. `73/37 Kodu` (s.140) — Bakınız 37/73 Kodu.
  4. `74/47 Kodu` (s.140) — Olası Tanı: Pasif-agresif kişilik bozukluğu. Kararsız, güvensiz, saldırganlıklarını kendilerine çevirdiklerinde depresyon.
  5. `75/57 Kodu` (s.140) — Bakınız 57/75 Kodu.
  6. `76/67 Kodu` (s.140) — Kaygılı, endişeli, kuşkucu, dolaylı düşmanlık, gerçek paranoid değillerdir.
  7. `78/87 Kodu` (s.140-141) — Yetişkinlerde 8 > 7 akut psikotik durum ve tuhaf intihar/kendine zarar; 7 > 8 düşünce/davranış bozukluğuna karşı savaş; 7 < 8 ve 75+ T şizofreni.
  8. `782 Kodu` (s.141) — Olası Tanı: Depresif Bozukluk, Obsesif Kompulsif Bozukluk.
  9. `872 Kodu` (s.141) — Olası Tanı: Şizofrenik Reaksiyon (8 > 7 ve 2 eşlik eder).
  10. `784/874 Kodları` (s.141) — Olası Tanı: Şizofrenik Reaksiyon, Şizoid Kişilik Bozukluğu.
  11. `789 Kodu` (s.141) — Hostil, gergin, şüpheci, hiperaktif, grandiozite, düşük performans.
  12. `79/97 Kodu` (s.141-142) — Ajitasyon, kas gerginlikleri, uykusuzluk, sırt ağrısı, manik örüntü.
  13. `794 Kodu` (s.142) — Kronik kaygı, yüksek enerji, obsesif ruminasyon, kopuk fikirler, impulsif dışa vurma döngüleri.
  14. `70/07 Kodu` (s.142) — Utangaç, erkeklerde fiziksel/sosyal yetersizlik ve anne/kardeş çatışması; kadınlarda Mf < 40 T aynı örüntü.

### SOURCE-CODE-PT-002 — Pt Bloğu Koşullu Yorum Kuralları (Conditions)
- **74/47 Kodu (s.140):**
  - "Saldırganlıklarını kendilerine çevirdiklerinde depresyon görülür, ancak eyleme vuruk davranışları da olabilir." → `D >= 70 T`.
- **78/87 Kodu (s.140-141):**
  - "2 ve 4 diğer yükselen alt testlerdir (Eğer 2 ve 4, 8 alt testinin 5 T puanı altındaysa 278/728 ve 478/748 kodlarına bakınız)." → `third in ['D', 'Pd']`.
  - "Yetişkinlerde 8 alt testi 7'den yüksekse akut psikotik durum vardır." → `Sc > Pt`.
  - "8 alt testi, 7 alt testinden daha yüksekse intihar girişimi tuhaftır ve kendine zarar vermeyi içerir." → `Sc > Pt`.
  - "7 > 8: Birey düşünce ve davranış bozukluğu geliştirmemek için hala savaş vermektedir." → `Pt > Sc`.
  - "7 < 8: Her iki yükselmede 75 T puanının üstünde ve 8 alt testinde belirgin bir yükselme varsa tanı şizofrenidir." → `Pt >= 75 && Sc >= 75 && Sc > Pt`.
- **79/97 Kodu (s.141-142):**
  - "8 ve 4, üçüncü yükselen alt testtir." → `third in ['Sc', 'Pd']`.
  - "Eğer 2 alt testi de yükselmişse depresyon görülür, ancak klinik tabloda anksiyete ve gerginlik ön plandadır." → `D >= 70 T`.
- **70/07 Kodu (s.142):**
  - "2 ve 8 alt testleri, en sık görülen üçüncü yüksekliktir." → `third in ['D', 'Sc']`.
  - "Kadınlarda eğer 5 alt testi, 40 T puanının altında ise aynı örüntü vardır." → `gender === 'Kadın' && Mf < 40 T`.

---

## BÖLÜM 5: Sc (8) KOD BLOĞU VERİLERİ (kitap s.143-148 · PDF p079_L - p082_R)

### SOURCE-CODE-SC-001 — Sc Bloğu Sayfa ve Başlık Envanteri (kitap s.143-148)
- **Görsel ve OCR Taraması:** PDF p079_L (s.143) ile p082_R (s.148) arasındaki sayfalar RapidOCR ve pymupdf ile taranarak tüm başlıklar, olası tanılar ve koşullar çıkarıldı.
- **Doğrulanan Başlıklar:**
  1. `81/18 Kodu` (s.146) — Bakınız 18/81 Kodu.
  2. `82/28 Kodu` (s.146) — Bakınız 28/82 Kodu.
  3. `83/38 Kodu` (s.146) — Bakınız 38/83 Kodu.
  4. `84/48 Kodu` (s.146) — Bakınız 48/84 Kodu.
  5. `85/58 Kodu` (s.146) — Bakınız 58/85 Kodu.
  6. `86/68 Kodu` (s.146) — Olası Tanı: Paranoid durum, Paranoid şizofreni, Şizoid kişilik. 6 ve 8'in T puanı 80'in üstünde, 7 de 70 T puanındadır. "Paranoid vadi" ya da "Psikotik V" olarak adlandırılır.
  7. `87/78 Kodu` (s.146) — Olası Tanı: Şizofreni (veya Şizofrenik Reaksiyon) ve Depresyon. Endişeli, kendi kendini tetkik edebilen, derin düşünceye dalan kişilerdir, kişilik güçlükleri kroniktir. Bağımsız değillerdir, pasif bağımlıdır.
  8. `8726 / Yüksek 9 Kodu` (s.146) — Olası Tanı: Şizofreni (Ajite Şizofreni). Ajite şizofren bir hastayı göstermektedir.
  9. `Paranoid Vadi (Şekil 22)` (s.147) — Olası Tanı: Paranoid şizofreni. Pa ve Sc > 70 T, Pt daha düşük vadi görünümünde. Duygusal geri çekilme, sosyal izolasyon, şüphecilik, düşmanlık, hezeyan/delüzyonlar.
  10. `89/98 Kodu` (s.147-148) — Olası Tanı: Şizofreni, Madde kullanımına bağlı psikoz. Yaşı 27'den küçük olanlarda görülür; üçüncü yükselen alt test 4, 7 ya da 6'dır.
  11. `80/08 Kodu` (s.148) — Olası Tanı: Şizoid Kişilik. Bu kod tipindeki 7 ve 2 alt testleri en yüksek üçüncü testtir.

### SOURCE-CODE-SC-002 — Sc Bloğu Koşullu Yorum Kuralları (Conditions)
- **Sc:86 / 86/68 Kodu (s.146):**
  - "6 ve 8'in T puanı 80'nin üstünde, 7 de 70 T puanındadır." → `Pa >= 80 && Sc >= 80 && Pt >= 65 && Pt <= 75`.
- **Sc:87 / 87/78 Kodu (s.146):**
  - "Pt & Sc ≥ 75 ∧ Sc > Pt şizofreni eğilimi güçlenir." → `Pt >= 75 && Sc >= 75 && Sc > Pt`.
- **8726 / Yüksek 9 Kodu (s.146):**
  - "8726 kod tipine 9 (Ma) alt testinin yüksekliği eşlik eder." → `Ma >= 70 T`.
- **Paranoid Vadi / Şekil 22 (s.147):**
  - "Pa ve Sc yüksek, Pt daha düşük vadi görünümündedir (Paranoid Vadi)." → `Pa >= 70 && Sc >= 70 && Pt <= Pa - 10 && Pt <= Sc - 10`.
- **89/98 Kodu (s.147-148):**
  - "Yaşı 27'den küçük olanlarda görülür..." → `manual: true` (yaş < 27 klinik notu).
  - "...üçüncü yükselen alt test 4, 7 ya da 6'dır." → `third in ['Pd', 'Pt', 'Pa']`.
- **80/08 Kodu (s.148):**
  - "Bu kod tipindeki 7 ve 2 alt testleri en yüksek üçüncü testtir." → `third === 'Pt' || third === 'D'`.

---

## BÖLÜM 5: Ma (9) KOD BLOĞU VERİLERİ (kitap s.149-153 · PDF p082_L - p083_R)

### SOURCE-CODE-MA-001 — Ma Bloğu Sayfa ve Başlık Envanteri (kitap s.149-153)
- **Görsel ve OCR Taraması:** PDF p082_L (s.149) ile p083_R (s.153) arasındaki sayfalar RapidOCR ve pymupdf ile taranarak tüm başlıklar, olası tanılar ve koşullar çıkarıldı.
- **Doğrulanan Başlıklar:**
  1. `Tablo 16` (s.150) — Hipomani alt testi: Madde numaraları ve puanlama yönü (35 Doğru + 11 Yanlış = 46 madde, P0 MATCH).
  2. `T Bantları` (s.151-152) — 85+ T / 70-84 T / 60-69 T / 45-59 T / 21-44 T (5 bant MATCH).
  3. `Yüksek 9 / Yüksek K Kodu` (s.152) — 9 ve K >= 70 T (2 alt testi T: 50'nin altında ise), enerjik, organize, iyi yönetici, yarışmacı. K > 70 T başkalarını organize etme çabası. Kadınlar Mf < 40 T fiziksel çekicilik konusunda teşhirci.
  4. `Yüksek 9 / Düşük K Kodu` (s.153) — Olası Tanı: Narsisistik kişilik. Narsisistik kişilerdir. Kadınlar, eksibisyonist bir biçimde kendilerini sergileyerek dikkatleri üstlerine çekerler.
  5. `91/19 Kodu (Ayrıca 19/91 Koduna da Bakınız)` (s.153) — Ender görülür. Hipomanik, gergin, yerinde duramaz, ihtiraslı, başarısızlıkla engellenmiş.
  6. `92/29 Kodu` (s.153) — Bakınız 29/92 Kodu.
  7. `93/39 Kodu` (s.153) — Bakınız 39/93 Kodu.
  8. `94/49 Kodu` (s.153) — Bakınız 49/94 Kodu ("Eyleme vuruk davranış ile ilgilidir" klinik notu).
  9. `95/59 Kodu` (s.153) — Bakınız 59/95 Kodu.
  10. `96/69 Kodu` (s.153) — Bakınız 69/96 Kodu.
  11. `97/79 Kodu` (s.153) — Bakınız 79/97 Kodu.
  12. `98/89 Kodu` (s.153) — Bakınız 89/98 Kodu.
  13. `90/09 Kodu` (s.153) — Kod oldukça nadirdir, özellikle erkeklerde çok az görülür. Enerjik, ajite, yalnız. Si yükselmesi bırakılarak diğer iki alt test ile yorum yapılmalıdır.

### SOURCE-CODE-MA-002 — Ma Bloğu Koşullu Yorum Kuralları (Conditions)
- **Yüksek 9 / Yüksek K Kodu (s.152):**
  - "2 alt testi T: 50'nin altında ise" → `D < 50 T`.
  - "K alt testi 70 T puanının üzerine çıkarsa..." → `K > 70 T`.
  - "Kadınlar fiziksel çekicilik konusunda teşhircidirler (eğer 5 alt testinde T:40'ın altında ise)..." → `gender === 'Kadın' && Mf < 40 T`.
- **Yüksek 9 / Düşük K Kodu (s.153):**
  - "Kadınlar, eksibisyonist bir biçimde kendilerini sergileyerek dikkatleri bu şekilde üstlerine çekerler." → `gender === 'Kadın'`.
- **90/09 Kodu (s.153):**
  - "Kod oldukça nadirdir, özellikle erkeklerde çok az görülür." → `gender === 'Erkek'`.
- **94/49 Kodu (s.153):**
  - "Eyleme vuruk davranış ile ilgilidir." → klinik atıf.

---

## BÖLÜM 5: Si (0) KOD BLOĞU VERİLERİ (kitap s.154-158 · PDF p084_L - p086_L)

### SOURCE-CODE-SI-001 — Si Bloğu Sayfa ve Başlık Envanteri (kitap s.154-158)
- **Görsel ve OCR Taraması:** PDF p084_L (s.154, boş sayfa), p084_R (s.155, Si girişi), p085_L (s.156, Tablo 17), p085_R (s.157, Si T bantları ve kod listesi) ve p086_L (s.158, boş sayfa) RapidOCR ve pymupdf ile taranarak tüm başlıklar, metinler ve koşullar doğrulandı.
- **Doğrulanan Başlıklar:**
  1. `Tablo 17` (s.156) — Sosyal içedönüklük alt testi: Madde numaraları ve puanlama yönü (34 Doğru + 36 Yanlış = 70 madde, P0 MATCH).
  2. `T Bantları` (s.157) — 70+ T / 60-69 T / 45-59 T / 25-44 T (4 bant MATCH).
  3. `01/10 Kodu` (s.157) — Bakınız 10/01 Kodu.
  4. `02/20 Kodu` (s.157) — Bakınız 20/02 Kodu.
  5. `03/30 Kodu` (s.157) — Bakınız 30/03 Kodu.
  6. `04/40 Kodu` (s.157) — Bakınız 40/04 Kodu.
  7. `05/50 Kodu` (s.157) — Bakınız 50/05 Kodu.
  8. `06/60 Kodu` (s.157) — Bakınız 60/06 Kodu.
  9. `07/70 Kodu` (s.157) — Bakınız 70/07 Kodu.
  10. `08/80 Kodu` (s.157) — Bakınız 80/08 Kodu.
  11. `09/90 Kodu` (s.157) — Bakınız 90/09 Kodu.
  12. `049 Kodu` (s.157) — Psikiyatrik olgularda eyleme vurukluğun bastırılması.
  13. `027(8) Kodu` (s.157-158) — Bireyde güçlü ruminatif davranışlar görülebilir.
  14. `068 / 086 Kodları` (s.158) — Bakınız 680 / 860 Kodu.

### SOURCE-CODE-SI-002 — Si Bloğu Koşullu Yorum Kuralları (Conditions)
- **049 Kodu (s.157):**
  - "Alt test Si'deki yükselmeye, alt test 4 ve 9'daki yükselmeler de eşlik ediyorsa, eyleme vurukluğun bastırıldığı düşünülmelidir." → `Si >= 70 && Pd >= 70 && Ma >= 70`.
- **027(8) Kodu (s.157-158):**
  - "Alt test 2 ya da 7 özellikle alt test 8'in eşlik ettiği durumlarda, ruminatif davranışların kuvvetlendiği görülür." → `(D >= 70 || Pt >= 70) && Sc >= 70`.
