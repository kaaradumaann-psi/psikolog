# Conflicts

Kaynak ↔ mevcut sistem farkları. Sınıflandırma:
`MATCH` · `CONFLICT` · `MISSING` · `EXTRA` · `UNVERIFIED` · `OCR-UNCERTAIN`

Durumlar: `OPEN` · `INVESTIGATING` · `CONFIRMED` · `FIXED` · `REJECTED` · `UNVERIFIED`

> **Kural:** Kodu değiştirmeden önce `SOURCE_FACT → CONFLICT → DECISION`
> zinciri tamamlanmış olmalıdır. Şu an **hiçbir kod değişikliği yapılmadı.**

---

## CONFLICT-001 — F alt testi kadın normu — **REJECTED (ÇÖZÜLDÜ)**

Area:
Türk normları / F geçerlik alt testi (T puanı dönüşümü)

Source:
PDF p25 L = **kitap s.34**, Tablo 4 dipnotu — `SOURCE-VALIDITY-F-002`

Source value:
`Erkeklerde ortalama: 8.30` · `kadınlarda ortalama: 10.11 (Savaşır, 1981)`
(görsel olarak doğrulandı, iki bağımsız okuma)

Current implementation:
`src/scoring/mmpiKeys.ts` → `TURKISH_NORMS.Kadın.F = { mean: 9.38, sd: 5.16 }`

Comparison:
**CONFLICT** — ortalama 10.11 ↔ 9.38 (fark 0.73; sd 5.16 varsayımıyla ≈ 1.4 T puanı)

Impact:
F ham puanı 10 olan bir kadın: kaynak ortalamasına göre T ≈ 50, koddaki
ortalamaya göre T ≈ 51.2. Band eşiklerine yakın puanlarda yorum değişebilir.

Problem:
Koddaki kadın normu kaynakta verilen Savaşır (1981) değeriyle uyuşmuyor.
Erkek normu (8.30) ise birebir uyuşuyor → hata büyük olasılıkla tek bir hücrede.

Status:
**OPEN** — PHASE 6'da (normlar) Bölüm 8 "Standardizasyon çalışması" (kitap
s.191-195) ve Ek 10 (kitap s.257-260) okunduktan sonra karara bağlanacak.
Karar `DECISIONS.md`'ye yazılmadan kod değişmeyecek.

### ÇÖZÜM (2026-09-21, Oturum 4)

**Kod DOĞRU; değişiklik gerekmez.**

Kanıt: Kitap, F kadın normunu **iki farklı yerde tutarsız** verir:
- Geçerlik bölümü, Tablo 4 dipnotu (s.34): `kadınlarda ortalama: 10.11`
- **Tablo 30** "Normal Türk, Erkek ve Kadınların… Ortalama ve Standart Sapmaları"
  (s.195, Bölüm 8 standardizasyon): `Kadın F X̄ = 9.38, SD = 5.16`

Kodun değeri (9.38 / 5.16) **Tablo 30 ile birebir aynıdır.** Tablo 30,
standardizasyon çalışmasının normatif veri tablosudur (N=1003 erkek / 663 kadın);
geçerlik bölümündeki dipnot ise ikincil bir aktarımdır. Norm kaynağı olarak
Tablo 30 esas alınır.

Doğrulama: `scripts/mmpi-audit/compare-norms.py` → 26/26 hücre MATCH.
Kanıt: `SOURCE-NORM-001`.

Status: **REJECTED** (önceki OPEN kaydı tarihsel olarak korunur; DECISION-015)

---

## CONFLICT-002 — K alt testi normları — **REJECTED (ÇÖZÜLDÜ)**

Area:
Türk normları / K geçerlik alt testi

Source:
PDF p27 L = **kitap s.38**, Tablo 5 dipnotu — `SOURCE-VALIDITY-K-002`

Source value:
`Erkeklerde ortalama: 13.90` · `kadınlarda ortalama: 13.54 (Savaşır 1981)`
(görsel olarak doğrulandı)

Current implementation:
`src/scoring/mmpiKeys.ts` → `TURKISH_NORMS.Erkek.K = { mean: 13.98, sd: 4.65 }`
`src/scoring/mmpiKeys.ts` → `TURKISH_NORMS.Kadın.K = { mean: 11.82, sd: 3.8 }`

Comparison:
**CONFLICT**
- Erkek: 13.90 ↔ **13.98** → büyük olasılıkla **yazım hatası** (`0` ↔ `8`),
  OCR hatası değil: iki bağımsız okuma 13.90 verdi.
- Kadın: 13.54 ↔ **11.82** → **maddi fark** (1.72 ortalama puanı ≈ 4.5 T puanı).

Impact (yüksek):
K hem doğrudan bir alt test olarak yorumlanır hem de **Hs, Pd, Pt, Sc, Ma
düzeltmesinde** kullanılır (`K_CORRECTION`). Kadın normundaki 1.72 puanlık fark
K–T puanını ve dolayısıyla K+ profillerini, F-K endeksini ve K ile düzeltilmiş
klinik T puanlarını etkiler.

Problem:
Kadın K normu kaynaktaki Savaşır (1981) değeriyle uyuşmuyor.

Status:
**OPEN** — PHASE 4 (K düzeltmesi) + PHASE 6 (normlar) sonrası karar.
Özellikle: Bölüm 8 standardizasyon metni (s.191-195) bağımsız teyit sağlayacak.

### ÇÖZÜM (2026-09-21, Oturum 4)

**Kod DOĞRU; değişiklik gerekmez.**

Kanıt: Kitap, K normlarını **iki farklı yerde tutarsız** verir:
- Geçerlik bölümü, Tablo 5 dipnotu (s.38): `13.90` (E) / `13.54` (K)
- **Tablo 30** (s.195, standardizasyon): `K X̄ = 13.98, SD = 4.65` (E) /
  `K X̄ = 11.82, SD = 3.80` (K)

Kodun değerleri **Tablo 30 ile birebir aynıdır.** Kullanıcı adına kritik olan
nokta: K hem bir alt test olarak yorumlanır hem de Hs/Pd/Pt/Sc/Ma
düzeltmesinde kullanılır; bu yüzden *normatif tablo* (Tablo 30) esas alınmalıdır.

Not: Erkek K değerindeki fark (13.90 ↔ 13.98) başlangıçta "yazım hatası" olarak
değerlendirilmişti; aslında **kod doğru**, geçerlik bölümünün dipnotu Tablo 30
ile uyuşmuyor.

Doğrulama: `scripts/mmpi-audit/compare-norms.py` → 26/26 hücre MATCH.
Kanıt: `SOURCE-NORM-001`.

Status: **REJECTED** (önceki OPEN kaydı tarihsel olarak korunur; DECISION-015)

---

## CONFLICT-003 — L T puanı üçüncü bandının alt sınırı (P1)

Area:
Geçerlik yorumu / L T bantları

Source:
PDF p24 R = **kitap s.33** — `SOURCE-VALIDITY-L-003`
Source bands: `≥69` · `64-68` · **`59-63`** · `36-55` · `≤35`

Current implementation:
`src/scoring/mmpiSource.ts` → `L_T_BANDS[2] = { min: 56, max: 63, rangeLabel: 'T 56-63' }`

Comparison:
**CONFLICT** (sınır) — bant etiketi ve alt sınır farklı (56 ↔ 59).
Kaynakta **T 56-58** aralığı hiçbir banda atanmamıştır (boşluk);
kod bu aralığı "Orta Yüksek" bandına katmaktadır.

Impact:
T 56-58 arası L puanları kodda "iyi görünme çabası" yorumu alır; kaynak bu
aralık için tanım vermez (bir üst bant 59'dan başlar).

Status:
**OPEN** — PHASE 3 kapanışında karara bağlanacak (bant boşluğu mu, kod
genişletmesi mi?). Kaynak metni kodun yorumuyla **içerik olarak** uyuşuyor.

---

## CONFLICT-004 — F ham puan bant sınırları (P1)

Area:
Geçerlik yorumu / F ham puan bantları

Source:
PDF p25 L – p25 R = **kitap s.34-35** (Graham 1987) — `SOURCE-VALIDITY-F-003`
Source bands: `0-2` · **`3-9`** · **`10-15`** · **`16-25`** · **`26+`**

Current implementation:
`src/scoring/mmpiSource.ts` → `F_RAW_BANDS`
= `0-2` · `3-7` · `8-15` · `16-22` · `23 ve üstü`
`src/scoring/mmpiSource.ts` → `VALIDITY_CUTOFFS = { fSuspect: 16, fInvalid: 23 }`

Comparison:
**CONFLICT** (üç sınır):
- 3-9 ↔ 3-7 (kaynakta 8 ve 9 "normal aralık" sayılır, kodda "Orta" bandında)
- 16-25 ↔ 16-22 ve 26+ ↔ 23+ (kaynak eşiği 25/26, kod eşiği 22/23)

Impact:
F ham puanı 8-9 olan profiller kodda daha ağır ("Orta") yorum alır;
ham puan 23-25 olan profiller kodda "profil geçersiz" sayılır, kaynak bu
aralığı Graham ölçütünde hâlâ "16-25" bandında tutar.

Not:
Kaynak ayrıca Hathaway & McKinley (1967) eşiklerini **20** ve **25** olarak
aktarır (`SOURCE-VALIDITY-F-004`) — yani kaynak içinde üçüncü bir eşik kümesi
vardır. Kod'un 16/23 eşiği bu kitaptaki hiçbir kümeyle birebir örtüşmez;
başka bir rehberden gelmiş olabilir (bkz. `UNVERIFIED_DATA.md`).

Status:
**OPEN** — PHASE 3 kapanışında karar.

---

## CONFLICT-005 — L ve K ham puan bantları kaynakta bulunamadı (P1)

Area:
Geçerlik yorumu

Source:
Kitap s.31-33 (L) ve s.38-41 (K) okundu.

Current implementation:
`L_RAW_BANDS` = `0-2` · `3-5` · `6-7` · `8-15`
`K_RAW_BANDS` = `0-4` · `5-9` · `10-15` · `16-20` · `21+`

Comparison:
**EXTRA / MISSING karşılıklı** — kaynakta L ve K için **ham puan bandı tablosu
yoktur**; kaynak bu iki alt testi T puanı bantlarıyla ve niteliksel betimlerle
(s.32-33, s.38-39 "yüksek/ortalama/düşük puan alan birey") yorumlar.

Impact:
Kod, kaynakta bulunmayan ham puan eşiklerini kullanıcıya "kaynak tabanlı"
olarak sunuyorsa yanıltıcıdır (kaynak izi iddiası doğrulanamaz).

Status:
**INVESTIGATING** — PHASE 3 sonunda: ya bu bantlar başka bir belgelenmiş
kaynağa bağlanacak, ya da "kaynakta doğrulanamadı" olarak işaretlenecek.

---

## CONFLICT-006 — F ve K T bantlarında sınır farkları (P2)

Area:
Geçerlik yorumu / T bantları

Source & current:
- F: kaynak `44-54` + `T<45` (s.37) ↔ kod `45-54` + `≤44`
- K: kaynak `61-72` (s.40) ↔ kod `61-71` + `≥72`; kaynak alt bant `27-45` ↔ kod `≤45`

Comparison:
**MATCH (eşdeğer bölümleme)** — bantlar aynı aralıkları kapsar; yalnızca
sınır yazımı farklıdır (T=44 F'de kodda "düşük", kaynakta "44-54" bandında).
Kod `≤45` bantı için alt sınır koymaz, kaynak 27'dir (27 altı sınırsız).

Status:
**CONFIRMED (kabul edildi)** — davranışsal fark üretmez; yalnızca etiket
netliği. Kayıt amaçlı tutulur, kod değişikliği önerilmez.

---

## CONFLICT-007 — Proje dokümanı `docs/kaynak-denetimi.md` depoda yok (P2)

Area:
Dokümantasyon bütünlüğü / kaynak izi iddiası

Evidence:
- `README.md:390` bu dosyaya tablo satırında atıf yapar.
- `SYSTEM.md:368` ve `SYSTEM.md:632` atıf yapar.
- `src/scoring/version.ts:15` yorumu atıf yapar.
- `src/components/SourcesPage.tsx:564` kullanıcıya gösterilen metinde dosya adını verir.

Current state:
`ls docs/` → yalnızca `MMPI Kitap (1) (1).pdf` (o tarihteki ad; şimdi `docs/sources/mmpi-kitap.pdf`). Dosya **mevcut değil**.

Problem:
Kaynakça sayfası, kullanıcıya "künye–bileşen eşleştirme tabloları depoda
`docs/kaynak-denetimi.md` dosyasındadır" diyor; dosya yoksa bilimsel kaynak izi
iddiası kanıtlanamaz.

Status:
**FIXED** — PHASE 13 kapsamında `docs/kaynak-denetimi.md` ana bileşen–kaynak eşleştirme tablosu ve dürüstlük kaydıyla oluşturuldu; `SourcesPage.tsx` metni güncellendi (CHANGE-027, 2026-09-22). DECISION-005 uygulandı.

---

# PHASE 2 — Ek 9 (kitap s.244-256) madde anahtarı denetimi

Karşılaştırma betiği: `scripts/mmpi-audit/compare-keys.py` (kaynak değerler
OCR + görsel doğrulama ile girildi). Sonuç: **41 MATCH / 5 DIFF / 0 MISSING**
(46 anahtarın tamamı karşılaştırıldı).

Aşağıdaki 5 farkın **hepsi görsel olarak doğrulanmıştır** ve hepsi **P0**'dır.

---

## CONFLICT-008 — F alt testi: 69 ↔ 169 basamak hatası (P0)

Area: F geçerlik alt testi madde anahtarı

Source: PDF p130 L = **kitap s.244**, Ek 9, "F alt testi: F (Madde sayısı: 64)"
Source value (Yanlış sütunu, 20 madde):
```
17, 20, 54, 65, 75, 83, 112, 113, 115, 164, 169, 177, 185, 196, 199, 220, 257, 258, 272, 276
```
Visual: **CONFIRMED** (tam sayfa görüntüsü, yüksek çözünürlük; "164, 169, 177" dizisi net okundu)

Current implementation:
`src/scoring/mmpiKeys.ts` → `SCORING_KEYS.F.falseItems`
son üçlü: `... 164, **177**, 185 ...` ve listede **69** var, **169** yok.

Comparison: **CONFLICT** — `69` (kod) ↔ `169` (kaynak)

Impact (yüksek):
- Madde 169 F'de sayılmaz, madde 69 yanlışlıkla F'ye sayılır → F ham puanı
  hatalı hesaplanır.
- F ham puanı geçerlilik eşiklerini (`fInvalid=23`, `fSuspect=16`) belirlediği
  için **profil geçerlilik kararı** yanlış çıkabilir.
- Madde 69 aynı zamanda `Mf` (erkek: Doğru) ve `Mf` (kadın: Yanlış) anahtarında
  da vardır → çift etki.

Problem: Tek karakterlik basamak hatası; kaynak tablo net.

Status: **FIXED** (CHANGE-001, 2026-09-21)

---

## CONFLICT-009 — S_Es (Barron Ego Gücü): 13 madde yanlış yönde (P0)

Area: Özel ölçek `Es` madde anahtarı

Source: PDF p135 R = **kitap s.255**, Ek 9, "Ego Gücü Testi (Es) (Madde sayısı: 68)"
Source value:
- Doğru (25): `2, 36, 51, 95, 109, 153, 174, 181, 187, 192, 208, 221, 231, 234, 253, 270, 355, 367, 380, 410, 421, 430, 458, 513, 515`
- Yanlış (43): `14, 22, 32, 33, 34, 43, 48, 58, 62, 82, 94, 100, 132, 140, 189, 209, 217, 236, 241, 244, 251, 261, 341, 344, 349, 359, 378, 384, 389, 420, 483, 488, 489, 494, 510, 525, 541, 544, 548, 554, 555, 559, 561`

Visual: **CONFIRMED** (tam sayfa s.255; her iki sütun dikişten bağımsız okundu)

Current implementation:
`src/scoring/mmpiDerived.ts` → `SPECIAL_KEYS.Es.dogru` (38 madde) içinde
`483, 488, 489, 494, 510, 525, 541, 544, 548, 554, 555, 559, 561` **Doğru** tarafında;
`yanlis` yalnızca 30 madde.

Comparison: **CONFLICT** — yön farkı, 13 madde
- Doğru 25 ↔ 38 · Yanlış 43 ↔ 30 (toplamlar eşit: 68 ✓)

Impact (yüksek):
Es puanı **sistematik olarak yukarı sapar**: bu 13 maddeye "doğru" diyen birey
kaynakta puan almamalıyken kodda +13 alır. Tersine "yanlış" diyen birey
kaynakta +13 almalıyken kodda 0 alır → Ego gücü yorumu tamamen ters
yönde hatalı olabilir.

Status: **FIXED** (CHANGE-002..005, 2026-09-21)

---

## CONFLICT-010 — W_FEM (Wiggins Kadınsı İlgiler): 2 madde yanlış yönde (P0)

Area: Wiggins içerik skalası `FEM`

Source: PDF p134 L = **kitap s.252**, "Kadınsı İlgiler Skalası FEM (Madde sayısı: 30)"
Source value:
- Doğru (18): `70, 74, 77, 78, 87, 92, **126**, 132, 140, 149, 203, 261, 295, **463**, 538, 554, 557, 562`
- Yanlış (12): `1, 81, 219, 221, 223, 283, 300, 423, 434, 537, 552, 563`

Visual: **CONFIRMED** (tam sayfa s.252; "126" ve "463" Doğru sütununda net)

Current implementation:
`src/scoring/mmpiDerived.ts` → `WIGGINS_KEYS.FEM`
`dogru` = 16 madde (126 ve 463 **yok**); `yanlis` = 14 madde (**126 ve 463 var**)

Comparison: **CONFLICT** — yön farkı, 2 madde

Impact (orta-yüksek):
W_FEM toplamı değişmez (30), ancak bu iki maddeye verilen yanıt ters
yorumlanır → `WIGGINS_NORMS.FEM` (M=14.77, SD=3.87) ile hesaplanan T puanı
2 maddeye kadar sapar.

Status: **FIXED** (CHANGE-002..005, 2026-09-21)

---

## CONFLICT-011 — P_AVD (Çekingen Kişilik Bozukluğu): 13 madde eksik (P0)

Area: Kişilik bozuklukları testi `AVD`

Source: PDF p132 R = **kitap s.249**, "Çekingen Kişilik Bozukluğu AVD (Madde sayısı: 38)"
Source value:
- Doğru (21): `52, 86, 138, 142, 171, 180, 201, 267, 278, 292, 304, 305, 317, 321, 344, 357, 368, 377, 418, 473, 509`
- Yanlış (17): `54, 57, 79, 91, 99, 122, 170, 309, 353, 371, 391, 449, 450, 479, 482, 521, 547`

Visual: **CONFIRMED** (tam sayfa s.249; AVD tablosu net)

Current implementation:
`PERSONALITY_KEYS.AVD` = Doğru **8** madde + Yanlış 17 madde = **25**

Comparison: **CONFLICT** — kodda 13 madde eksik:
`52, 142, 171, 180, 267, 278, 292, 304, 317, 357, 377, 418, 473`
(başlıktaki "Madde sayısı: 38" ile kodun 25'i zaten tutarsız)

Impact (yüksek):
AVD ham puanı 38 üzerinden değil 25 üzerinden hesaplanır →
`PERSONALITY_CUTOFFS.AVD = { marked: 9, mild: 7 }` eşikleri yanlış ölçekte
uygulanır; ölçek **sistematik olarak düşük** çıkar. Çekingen kişilik özellikleri
olduğu gibi kaçırılabilir.

Status: **FIXED** (CHANGE-002..005, 2026-09-21)

---

## CONFLICT-012 — P_HST (Histrionik Kişilik Bozukluğu): 7 madde eksik (P0)

Area: Kişilik bozuklukları testi `HST`

Source: PDF p132 R = **kitap s.249**, "Histrionik Kişilik Bozukluğu HST (Madde sayısı: 20)"
Source value:
- Doğru (13): `99, 126, 181, 353, 381, 391, 445, 449, 450, 451, 482, 521, 547`
- Yanlış (7): `111, 171, 180, 240, 286, 304, 312`

Visual: **CONFIRMED** (tam sayfa s.249; HST tablosu net)

Current implementation:
`PERSONALITY_KEYS.HST` = Doğru **8** madde + Yanlış 5 madde = **13**

Comparison: **CONFLICT** — kodda 7 madde eksik:
`171, 286, 353, 391, 449, 450, 547`
(başlıktaki "Madde sayısı: 20" ile kodun 13'ü tutarsız)

Impact (yüksek):
`PERSONALITY_CUTOFFS.HST = { marked: 10, mild: 7 }` eşiği 20 madde için
belirlenmiştir; 13 maddelik anahtarla bu eşiklere ulaşmak çok zor →
histrionik özellikler **sistematik olarak kaçırılır**.

Status: **FIXED** (CHANGE-002..005, 2026-09-21)

---

## PHASE 2 kapanış notu — doğrulama durumu

41 MATCH'in **33'ü yalnızca OCR** ile doğrulanmıştır (görsel doğrulama
bekliyor). Bunlar `SOURCE_FACTS.md` içinde `OCR-CONFIRMED` olarak işaretlenir;
`VERIFIED` sayılmaları için görsel doğrulama gerekir. Maddeler:
`Hs, D, Hy, Pd, Pa, Pt, Sc, Ma, Si, P_PAR, P_SZD, P_STY, P_ANT, P_CPS, P_PAG,
A_ICAS, W_SOC, W_DEP_W, W_MOR, W_REL, W_AUT, W_PSY, W_ORG, W_FAM, W_HOS,
W_PHO, W_HYP, W_HEA, S_A, S_R, S_Do, S_Dy`.

---

# PHASE 4 — Geçerlik Konfigürasyonları ve F-K Endeksi

## CONFLICT-013 — F-K = 0: sahte-iyilik etiketi ve geçerlilik sınırı çakışması (P2)

Area:
F-K endeksi yorumu / sahte-iyilik (faking good)

Source:
**kitap s.59** ("F-K Endeksi" bölümü) — `SOURCE-FK-002`
Source value:
> "F-K puanı **0-9 arasında ise profil geçerlidir**, 9'dan büyükse
> sahte-kötülük, **0 ise sahte-iyiliktir**."

Current implementation:
`src/scoring/mmpiConsistency.ts` → `fkIndexAnalysis`
`value === 0` → `level: 'Hafif Savunuculuk (Geçerli)'`, `isWarning: false`, `tone: 'ok'`
`-8 ≤ value < 0` → `'Hafif Negatif (Geçerli)'`, uyarı yok
`value < -8` → `'Sahte-İyilik (Faking Good) Eğilimi'`, `isWarning: true`

Comparison:
**CONFLICT** — kaynak F-K = 0'ı **sahte-iyilik** olarak tanımlar ve uyarı
gerektirir; kod 0'ı "geçerli, uyarı yok" sayar.
Ayrıca kaynak negatif bölge için **sayısal eşik vermez**; kodun `-8` eşiği
kaynakta doğrulanamadı.

Problem:
F-K = 0 olan profillerde sahte-iyilik sinyali kullanıcıya gösterilmez.

Impact (düşük-orta):
Yalnızca tam 0 değerinde uyarı kaybolur; negatif bölge uyarısı -9'da başlar
(kaynak -8 eşiğini desteklemiyor). Yorum katmanı etkisi sınırlı ama
"sahte-iyilik" hipotezi kaynağın açık kuralıdır.

Status: **REJECTED** (kod doğru kabul edildi) — ilgili karar: **DECISION-017**

**Resolution:** Kaynağın kesme kuralı cümlesi "0-9 arasında ise profil
geçerlidir" olduğu için 0 geçerli aralığın **içindedir**; "0 ise sahte-iyiliktir"
ifadesi ise tek bir noktaya ilişkin **etiketlemedir**. Kaynak içi tutarsızlıkta
DECISION-015 kuralı uygulanır → birincil kesme kuralı esastır, kod değişmez.
Kodun negatif bölgedeki `-8` eşiği kaynakta **yok** → `UNVERIFIED_DATA.md`'ye
kaydedildi (kaynak bulunana kadar değiştirilmez).

**Reason:** Kod hatası değil, kaynak üslup gerilimidir; 0 hem sınır hem etiket
olduğu için iki cümle birlikte doğru kabul edilebilir.

---

## CONFLICT-014 — Konfigürasyon 15: L değeri nokta mu bant mı? (P2)

> **DÜZELTME KAYDI** — Bu kaydın ilk sürümü hatalıydı; tarihsel olarak korunur.

**Previous finding (hatalı, ilk okuma):**
"Kaynak başlığı s.58'de `L > 60` der, Şekil 15'te 55 çizgisi vardır; kod 55-65
kullanır (üst sınır 65 kaynakta yok)" → P1 olarak kaydedilmişti.

**New source evidence (yüksek DPI görsel okuma, düzeltir):**
- **Metin (kitap s.57, Şekil 15 kutusu):** "Konfigürasyon 15: L alt testi
  **60 T puanında**, F alt testi 70 T puanının üstünde ve K alt testi 40 T
  puanının altındadır."
  → "puanının üstünde" DEĞİL, "**puanında**" yazıyor; yani **nokta değeri**.
- **Şekil 15 grafiği (görsel doğrulandı):** x ekseni L, F, K; y ekseni 30-90.
  Çizilen profil: **L noktası tam 60** seviyesinde (L/F sütun sınırında), F
  noktası 70 çizgisinin hemen üstünde (~72), K noktası 40'ın altında (~37).
  → Şekil metni **doğrular**; "şekilde 55 vardır" iddiası **yanlıştı**.

**Resolution:**
Kaynakta Konfigürasyon 15 için **L = 60 noktası** verilir (aralık değil).
Kod: `v.L >= 55 && v.L <= 65` → kaynak noktasının çevresine **±5 tolerans
bandı** koyar. Bant kaynakta **yoktur** ama kaynak değeri (60) bandın tam
merkezindedir → **CONFLICT değil, EXTRA (tolerans yorumu)**.

Karşılaştırma ölçütü: Kitap, aralık vermek istediğinde açıkça verir
(Konfigürasyon 14'te "K alt testi **59-64 T puanı arasındadır**", s.56 —
kodla birebir MATCH). Konfigürasyon 15'te L için aralık değil **nokta** vermesi
bilinçli bir üslup farkıdır.

**Reason:** Düz nokta eşitliği (`L === 60`) pratikte neredeyse hiçbir profili
yakalamaz; ±5 bandı kaynak değerini merkez alır ve kaynak değerini dışlamaz.
Ek olarak hiçbir profil bu örüntüden **dışlanmaz** (bant genişletici, daraltıcı
değil — L=70 olan bir profil zaten F>70 ve K<40 koşullarını taşıyorsa başka
örüntülere de girebilir).

**Status: REJECTED** (ilk hatalı bulgu geçersiz; kod değişikliği YOK)
İlgili karar: **DECISION-018**

**Ders:** Şekil içindeki eğri, ızgara çizgileri ve nokta konumları 200 DPI
OCR ile güvenilir okunamaz; bu tür bulgular **yüksek DPI kırpma ile görsel
doğrulanmadan** CONFLICT olarak kaydedilmemelidir. (Bu kayıt, o hatanın
örneğidir ve silinmez.)

---

## CONFLICT-015 — TR endeksi kesme puanı 1 puan kaymış (P1)

Area:
Yanıt tutarlılığı / TR endeksi geçerlilik değerlendirmesi

Source:
**kitap s.59** — `SOURCE-TR-002` — **Visual: CONFIRMED** (yüksek DPI kırpma)
Source value:
> "TR endeksi üzerinde **3 puan ya da daha fazla** bir puanın, geçersiz profil
> olasılığını arttırdığı ileri sürülmüştür (Dahlstrom 1972)."

Current implementation (önce):
`src/scoring/mmpiConsistency.ts` → `trIndex`
```ts
const consistent = score <= 3;   // 3 DAHİL tutarlı
```
+ dosya başı yorumu: "3 ve altı tutarlı kabul edilir (Gravitz & Gerton 1976…)"

Comparison:
**CONFLICT** — kaynak 3'te geçersizlik riskini başlatır (≥ 3); kod 3'ü tutarlı
sayar. **1 puan kayma.** Kodun kendi atfı (Dahlstrom 1972) kaynağın atfıyla
aynıdır → kayma, uygulama hatasıdır (yorum değil).

Problem:
TR = 3 olan profiller kaynakta "geçersizlik olasılığı arttı" bölgesindeyken
kodda **uyarısız/tutarlı** görünüyordu. Ayrıca kod metnindeki "normal bireyler
üç-dördüne değişik yanıt verir" ifadesi **kaynakta yok** (kaldırıldı).

Impact:
Geçerlilik değerlendirmesi ve rapordaki "Tutarlı/Tutarsız Yanıt Örüntüsü"
bandı; TR = 3 olan tüm profiller.

Resolution:
**FIXED** — CHANGE-007 (2026-09-21): `consistent = score <= 2`; doküman yorumu
ve yorum metinleri kaynak cümlesine göre yeniden yazıldı; kaynakta olmayan
"üç-dört" ifadesi kaldırıldı. Regresyon testi eklendi
(`tests/mmpiKeyIntegrity.test.ts` → PHASE 4, 3 puan uyarı / 2 puan tutarlı).
İlgili karar: **DECISION-019**

---

---

## CONFLICT-016 — Konfigürasyonlarda F/K aralık sınırları uygulanmıyor (P1)

Area:
Geçerlik konfigürasyonları (`VALIDITY_CONFIGS`) — örüntü eşleştirme

Source:
**kitap s.44, 46, 47** — `SOURCE-CONFIG-002`, `004`, `005`

Source value (üç ayrı örüntüde açık aralık/nitelik verilir):

| Konf. | Kaynak ifadesi | Kod kuralı | Fark |
|---|---|---|---|
| 2 (s.44) | L,K **en az 60**; F **50'ye yakın** | `v-shape`: L≥60 ∧ K≥60 ∧ **F ≤ 55** | F için **alt sınır yok** (F=0 da eşleşir) |
| 4 (s.46) | L=40; F **45-55**; K=60 | `ascending`: L<F<K ∧ L≤45 ∧ K≥55 | F aralığı **hiç uygulanmıyor**; sıralama yeterli |
| 5 (s.47) | L=60; F **≈50**; K **40-45** | `descending`: L>F>K ∧ L≥55 ∧ **K ≤ 45** | K için **alt sınır yok** (K=20 de eşleşir) |

Comparison:
**CONFLICT (kısmi)** — sıralama ilişkileri (L<F<K, L>F>K, V / tersine V) ve
nokta değerleri birebir uyuşur; ancak kaynağın **aralık olarak verdiği**
değerler kodda **tek yönlü** uygulanmıştır. Sonuç: kod, kaynağın kapsamadığı
profilleri bu örüntülere dahil edebilir.

Örnek (Konf. 4): L=40, F=62, K=65 → kaynakta F 45-55 dışında olduğu için
Konfigürasyon 4 **değildir**; kodda sıralama sağlandığı için **eşleşir**.

Impact:
Yorum katmanı — yanlış örüntü etiketi ve yanlış yorum metni. Puanlama/T puanı
etkilenmez (P1).

Status:
**OPEN** — bilinçli olarak **karar verilmedi**. Gerekçe: Bölüm 4'ün yalnızca ilk
5 konfigürasyonu okundu (s.43-47); kalan örüntüler (s.48-55) aynı desende
olabilir. **Tüm konfigürasyon seti okunmadan kural sıkılaştırılmamalıdır**
(CONFLICT-014'ün dersi: eksik veriyle acele kayıt/karar hata üretir).

Sonraki adım:
s.48-55 batch'i tamamlandıktan sonra tek bir DECISION ile:
(a) tüm konfigürasyonlara kaynak aralıklarını **iki yönlü** uygula, veya
(b) "±5 tolerans" kuralını tüm sette tutarlı kabul et ve aralık verilen
yerlerde aralığı **zorunlu** kıl.

---

## CONFLICT-017 — Konfigürasyon eşikleri kaynaktan sapmış (P1) → **FIXED**

Area: `VALIDITY_CONFIGS` — Konfigürasyon 4, 5, 7, 9

Source: `SOURCE-CONFIG-004`, `005`, `007`, `009` (kitap s.46, 47, 49, 51)

| # | Kaynak ifadesi | Eski kod | Sonuç |
|---|---|---|---|
| 4 | "F alt testi **45-55 T**" | `ascending`: F için **hiç sınır yok** | kaynak aralığı uygulanmıyor |
| 5 | "K alt testi **40-45 T puanı arasındadır**" | `descending`: `K ≤ 45` (alt sınır yok) | K=20 de eşleşiyordu |
| 7 | "L ve K alt testinin **35 T puanını aşmasını**" | `all-true`: `L ≤ 40 ∧ K ≤ 40` | 5 puan gevşek |
| 9 | "F alt testi **100 T puanına yakın ya da altında**" | `help-seeking`: `F ≤ 105` | üst sınır 5 puan yüksek |

Impact: Yorum katmanı — yanlış örüntü etiketi. Puanlama etkilenmez (P1).

Resolution: **FIXED** — CHANGE-008 (2026-09-21): kaynakta açıkça verilen dört
sayı/sınır koda uygulandı. İlgili karar: **DECISION-021**.

Regresyon testleri: `tests/mmpiKeyIntegrity.test.ts` → PHASE 4 batch 3 (6 test).

---

## CONFLICT-018 — Konfigürasyon 8: kaynak eşiği kendi verisiyle çelişiyor (P2) → **REJECTED**

Area: `all-false` konfigürasyonu (tümüne "yanlış")

Source (**Visual: CONFIRMED**, s.50): "Şekil 8'de gösterildiği gibi **L, F ve K
testlerinin tümü 80 T puanının üzerindedir**."

Current implementation: `v.L >= 75 && v.F >= 75 && v.K >= 75`

**Ampirik test (bu oturumda koşuldu):**
Kitabın kendi madde anahtarı + Tablo 30 normlarıyla, **tam "tümüne yanlış"**
yanıtlayan bir kişi:
```
L: ham 15 → T 81.2   |   F: ham 20 → T 75.3   |   K: ham 29 → T 82.3
```
→ Kaynağın istediği **F > 80** koşulu, gerçek bir "tümüne yanlış"
yanıtlayıcıda **sağlanamaz**. Kaynak, kendi kuralını kendi verisiyle çürütür.

Comparison: **kaynak içi tutarsızlık** — DECISION-015'in sınıfı.

Resolution: **REJECTED (kod doğru).** Kodun 75 eşiği, örüntünün gerçekten
yakalanabilmesini sağlar; kaynaktaki 80 eşiği pratikte ölü kuraldır ve
uygulanırsa "tümüne yanlış" hiç tespit edilemez. İlgili karar: **DECISION-020**.

Not: Kodun `rule` metni "L, F ve K tümü T 75 üzerinde" olarak bırakıldı ve
kaynaktan sapma kod içinde gerekçesiyle belgelendi (yorum bloğu).

---

## CONFLICT-019 — Konfigürasyon 7 (tümüne "doğru") pratikte tetiklenemez (P1)

Area: `all-true` konfigürasyonu

Source (**Visual: CONFIRMED**, s.49): "L ve K alt testinin 35 T puanını
aşmasını, **F alt testinin 120'nin üzerinde yer almasını gerektirir.**"

Current implementation:
- `mmpiScoring.ts`: T puanları `Math.max(20, Math.min(120, t))` ile **[20, 120]**
  aralığına kırpılır.
- `all-true` kuralı: `v.F > 120` → **hiçbir zaman doğru olamaz**.

Ampirik kanıt (bu oturumda koşuldu): **tüm maddelere "Doğru"** yanıtı veren
profil `F = 120 T` (tam üst sınır) üretir → konfigürasyon **YOK** döner.
Aynı profilde L = 26.5 ve K = 22.1 (kaynağın ≤ 35 koşulunu sağlar).

Impact: "Tümüne doğru" örüntüsü **hiçbir zaman raporlanmaz**; bu, kaynağın
açıkça tanımladığı bir geçerlik durumudur (P1 — geçerlilik değerlendirmesi).

Status: **OPEN** — düzeltme bir eşik kopyası değil, **tasarım kararı** gerektirir:
(a) T kırpmasını yükselt (tüm profil görünümünü etkiler), **veya**
(b) bu örüntüyü T puanından değil **ham cevap örüntüsünden** tespit et
(ör. "tüm maddeler Doğru" + klinik ölçekler > 90), **veya**
(c) eşiği kaynak dışı bir değere çek ve `UNVERIFIED` olarak belgele.
Karar verilmeden **kod değiştirilmedi**.

---

## CONFLICT-020 — Konfigürasyonlarda kaynakta olmayan ek sınırlar (P2, OPEN)

Aşağıdaki sınırlar kaynakta **yok**, kod ekliyor:

| # | Kod sınırı | Kaynakta karşılığı |
|---|---|---|
| 2 (`v-shape`) | `F ≤ 55` (alt sınır yok) | "F **50'ye yakın**" (niteliksel) |
| 5 (`descending`) | `F` için sınır yok | "F **yaklaşık 50**" (niteliksel) |
| 9 (`help-seeking`) | `F ≥ 70` | kaynak yalnızca üst sınır verir ("100'e yakın ya da altında") |
| 12 (`credible`) | `K ≤ 65` | kaynak: yalnızca "K **50'nin üstünde**" |

Impact: Aşırı/eksik eşleşme — ör. `credible` K = 70 olan bir profili
reddederken kaynak kabul eder.

Status: **OPEN** — CONFLICT-016 ile aynı sınıfın devamı; karar
**DECISION-021** ile birlikte verilmedi çünkü alt sınır eklemek/çıkarmak
konfigürasyon sırası (ilk eşleşen kazanır) nedeniyle başka örüntülerin
erişilebilirliğini değiştirir. Ayrı bir karar gerektirir.

---

## CONFLICT-016 — Konf. 2: `v-shape` F üst sınırı (P1) → **REJECTED (kod doğru)**

Area: `v-shape` (Konfigürasyon 2)

Source (s.44): "L ve K en az 60 T düzeyinde … F alt testi 50 T puanına yakın"
→ F için **niteliksel** ifade, sayısal aralık yok.

Current implementation: `L ≥ 60 ∧ K ≥ 60 ∧ F ≤ 55`

**Erişilebilirlik analizi (bu oturumda koşuldu):**
`detectValidityConfig` **ilk eşleşen kazanır** sırasını kullanır ve
`closed-v` (indeks 1) `F < 50 ∧ L > 60 ∧ K > 60` koşulunu taşır. Dolayısıyla:

| Profil | Kod sonucu | Kaynak |
|---|---|---|
| L=62, K=62, F=45 | `closed-v` (Çok Kapalı) | Konf. 3 (F<50) ✓ |
| L=62, K=62, F=52 | `v-shape` | Konf. 2 ✓ |
| L=62, K=62, F=80 | `unconventional` / başka | Konf. 10 ✓ (yüksek F) |

→ `v-shape` pratikte **F ∈ [50, 55]** aralığında çalışır; bu, kaynağın
"F 50'ye yakın" ifadesinin doğru karşılığıdır. **Üst sınır kaldırılırsa**
yüksek-F profilleri (Konf. 10/14) yanlışlıkla "V Şekli" olarak etiketlenir.

Resolution: **REJECTED — kod doğru.** Sınır, örüntüleri ayrık tutmak için
gereklidir. İlgili karar: **DECISION-023**.

---

## CONFLICT-019 — Konf. 7 (tümüne "doğru") hiç tetiklenemiyor (P1) → **FIXED**

Area: `all-true`

Source (**Visual: CONFIRMED**, s.49): "… **F alt testinin 120'nin üzerinde**
yer almasını gerektirir."

Current implementation (önce): `v.F > 120 && v.L <= 35 && v.K <= 35`
`mmpiScoring.ts`: T puanları `Math.max(20, Math.min(120, t))` ile **[20, 120]**
aralığına kırpılır → `F > 120` **hiçbir zaman** doğru olamaz.

**Ampirik kanıt:** 566 maddenin tamamına "Doğru" yanıtı → L 26.5 · **F 120.0** ·
K 22.1 → **konfigürasyon YOK** dönerdi (kaynağın tanımladığı örüntü kayıptı).

Resolution: **FIXED** — CHANGE-009: `F > 120` → **`F >= 120`**. Kırpma altında
kaynağın "> 120" koşulunun tek temsili tam üst sınırdır; kırpma kaldırılırsa
koşul `> 120`'ye dönmelidir (kod içinde not düşüldü). Karar: **DECISION-023**.

---

## CONFLICT-020 — Konfigürasyonlarda kaynakta olmayan ek sınırlar (P2) → **FIXED kısmen**

| # | Kod sınırı | Kaynakta karşılığı | Sonuç |
|---|---|---|---|
| 12 (`credible`) | `K ≤ 65` | yalnız "K, T 50'nin **üstünde**" | ✅ **KALDIRILDI** (CHANGE-010) |
| 9 (`help-seeking`) | `F ≥ 70` | kaynak yalnız üst sınır verir | ⚠️ **KORUNDU** (gerekçeli, aşağıda) |
| 5 (`descending`) | F sınırı yok | "F yaklaşık 50" (niteliksel) | ✅ sınır **eklenmedi** (doğru) |
| 2 (`v-shape`) | `F ≤ 55` | "F 50'ye yakın" | ✅ **REJECTED** — CONFLICT-016'ya bkz. |

**`credible` kanıtı (boşluk kapatıldı):** L=50, F=65, **K=70** profili kaynağa
göre Konfigürasyon 12'dir; eski kodda **hiçbir konfigürasyona girmiyordu**
(`YOK`). CHANGE-010 sonrası → "Güvenilir Cevaplayıcı" ✅
Erişilebilirlik kontrolü: kaldırılan sınır `unconventional` (indeks 9),
`frank` (10), `reverse-v` (0), `virtuous` (13), `rigid` (14) örüntülerinden
hiçbirini etkilemez (F/K bantları ayrık).

**`help-seeking` F ≥ 70 neden KORUNDU:** alt sınır kaldırılırsa `help-seeking`
(indeks 8) `L < 66 ∧ K < 66 ∧ F ≤ 100` ile **`frank`** (indeks 10,
`F 60-70`) ve **`credible`** (indeks 11) örüntülerini de yutar → iki örüntü
erişilemez hale gelir. Kaynağın Şekil 9'daki yükselmiş-F eğrisi de alt sınırı
destekler. → `UNVERIFIED-CONFIG-F-001` (belgeli, kaynak dışı ama gerekli).

---

## CONFLICT-021 — Wiggins SOC: metin "26 madde" ↔ kitabın kendi listesi 27 (P1) → **REJECTED (kod doğru)**

Area: `WIGGINS_KEYS.SOC`

Source A (metin, s.178, **görsel doğrulandı**): "Sosyal uyumsuzluk skalası
(SOC): **Toplam 26 maddeden** oluşan bu skalanın…"
Source B (kitabın kendi madde listesi, **Ek 9c s.251-256**): SOC = 13 Doğru +
14 Yanlış = **27 madde** — `dump-keys.ts` + `compare-keys.py` ile
**46/46 MATCH** olarak doğrulanmıştı (PHASE 2).

Current implementation: `WIGGINS_KEYS.SOC` = **27 madde** (13 + 14).

**Değerlendirme:** Kaynak **kendi kendisiyle** çelişiyor (düzyazı sayısı ↔ kendi
madde listesi). Bu, PHASE 2'de bağımsız olarak doğrulanan **madde listesi**
lehine çözülür; metindeki sayı muhtemelen dizgi/çeviri hatasıdır.

Toplam kontrolü: kaynak metin toplamı 351, kitabın listelerinden gelen kod
toplamı 352 → fark tam olarak SOC'taki bu 1 maddedir.

Resolution: **REJECTED — kod doğru.** Karar: **DECISION-024**.
Not: Kaynak metnin kendisi de doğrulanmış listeden farklı olduğu için
`UNVERIFIED` **değil, kaynak içi tutarsızlık** olarak sınıflandırıldı
(CONFLICT-018 ile aynı sınıf).

---

## CONFLICT-022 — Wiggins SOC yorum yönü (P2, OPEN)

Area: `WIGGINS_META.SOC` + `WIGGINS_HIGH_TEXT.SOC` (yorum katmanı)

Source (s.178-179, **görsel doğrulandı**): "…Yüksek puanlar **kendinden emin,
güvenli, parlak** bireyleri gösterirken, **düşük puanlar iddiacı, eğlenceyi
seven**, diğer insanlarla kolay ilişkiye giren bireylere işaret etmektedir."

Current implementation: `WIGGINS_HIGH_TEXT.SOC` = "Sosyal ortamlarda
ketlenmişlik, utangaçlık ve içedönüklük; insanlarla iletişim kurmakta güçlük"
→ **yüksek puan = uyumsuzluk** (standart Wiggins SOC yönü).

**Gerilim:** Kaynağın tanımı, ölçeğin adıyla ("Sosyal **uyumsuzluk**") ve
standart Wiggins yönüyle çelişiyor; kaynak her iki ucu da olumlu niteliklerle
tarif ediyor.

Status: **OPEN** — yorum katmanı işi (PHASE 10) kapsamında karara bağlanacak;
sayısal veri (norm/madde listesi) etkilenmez. Acele karar verilmedi.

---

## CONFLICT-023 — Kritik madde etiketleri kaynak metniyle uyuşmuyor (P2) — **OPEN**

Area: `src/scoring/mmpiCritical.ts` → `CRITICAL_ITEMS` (39 kayıt, 38 benzersiz madde)

Source: **Ek 1 (kitap s.215-233)** — madde metinleri; **görsel doğrulandı**
(`.audit/items/gl2_*.png`, `gl3.png`, `gl4.png`); Ek 9 (s.244-256) ölçek/yön
kanıtı.

**Ön bulgu (kaynakta liste yok):** Kaynakta hiçbir yerde "kritik madde" listesi
yoktur (`SOURCE-ITEM-002`) → listenin **varlığı** kaynak dışıdır; ancak
etiketler kaynak metniyle **çeliştiği** için ayrıca çelişki kaydı gerekir.

**Uyuşmayan 14 kayıt:**

| # | Kaynak metni (görsel) | Kod etiketi | Ek 9 ölçeği | Değerlendirme |
|---|---|---|---|---|
| 20 | Cinsel yaşamımdan memnunum | Alkol/Madde Sorunları | F(Y), Pd(Y), Sc(Y) | ❌ etiket yanlış (cinsel doyum) |
| 27 | Bazen kötü ruhların beni etkileri altına aldığını hissederim | Ruhsal/Bilişsel Karmaşa | F(D), Pa(D) | ❌ "etkilenme/sanrı" olmalı |
| 33 | Başımdan çok garip ve tuhaf şeyler geçti | Sosyal Çekilme | Pd(D), Sc(D), Si(Y) | ❌ etiket yanlış |
| 37 | Cinsel yaşamım yüzünden başım hiç derde girmedi | Ruhsal Sıkıntı | Pd(Y), Sc(Y) | ❌ etiket yanlış |
| 69 | Ensemde nadiren ağrı hissederim | Sosyal/Ailevi Huzursuzluk | (klinik ölçekte yok) | ❌ etiket yanlış (ağrı) |
| 85 | …başkalarının ayakkabı, eldiven vb. özel eşyaları o kadar hoşuma gider ki **dokunmak ve aşırmak isterim** | Ruhsal Sıkıntı / Kaygı | F(D) | ❌ dürtü kontrolü/aşırma |
| 133 | Hiçbir zaman normal olmayan cinsel ilişkilere girişmedim | Ailevi Sorunlar | (klinik ölçekte yok) | ❌ etiket yanlış (cinsellik) |
| 146 | Seyahat edip gezip tozmadıkça mutlu olamam | Sosyal Uyumsuzluk | F(D) | ❌ etiket yanlış |
| 151 | **Biri beni zehirlemeye çalışıyor** | Sosyal Çekilme / Yabancılaşma | F(D), Pa(D) | ❌ sanrısal içerik |
| 168 | Zihnimde bir gariplik var | Bağımlılık Potansiyeli | F(D), Sc(D) | ❌ bilişsel karmaşa |
| 179 | Cinsel konularda sıkıntım vardır | Bedensel/Organik Belirti | Hy(D), Sc(D) | ❌ cinsel sıkıntı |
| 334 | Bazen tuhaf kokular duyarım | Depresif Çökkünlük | Sc(D) | ❌ algı bozukluğu (koku) |
| 337 | Çoğunlukla bir takım şeyler ve kimseler için meraklanıp huzursuzlaşırım | Depresif Çökkünlük | Pt(D) | ❌ anksiyete/huzursuzluk |
| 354 | Bıçak gibi çok keskin ve sivri şeyler kullanmaktan korkarım | Bedensel / Nörolojik Belirti | Sc(D) | ❌ fobik kaygı |

Impact: Kritik madde listesi **UI** (`MMPICriticalSection.tsx`) ve **basılı
rapor** (`MMPIPrintReport.tsx`) üzerinde etiketleriyle görünür → yanlış etiket
klinisyeni yanlış yönlendirir (P2). Puanlama etkilenmez.

Comparison: **CONFLICT (etiket ↔ kaynak metni)** + **EXTRA (liste kaynakta yok)**

Status: **FIXED** (DECISION-026, CHANGE-011 — 2026-09-21).

Resolution: Üç yön birlikte uygulandı — (a) **14 etiket kaynak metnine göre
düzeltildi**, (b) liste **korundu** (raporda/ekranda klinisyen kontrol listesi
olarak kullanılıyor), (c) listenin **kaynak dışı** olduğu kod başlığında ve
`SOURCE_FACTS`'ta belgelendi. Madde numaraları ve D/Y yönleri değişmedi.
Regresyon: +4 test; `tests/mmpiKeyIntegrity.test.ts` 26/26 · `npm test`
313/313 PASS.

Not (lehte delil): #74 cinsiyete göre yön ayrımı **doğru** (#74 kaynakta
"Şayet kız iseniz" koşullu metni vardır) ve 24 kayıt kaynak metniyle tutarlıdır
→ liste tümüyle hatalı değil; içinde hem doğru hem hatalı kayıt var.

---

## CONFLICT-024 — Üçlü/dörtlü kod tipleri yorumlanmıyor (P1, ✅ **FIXED** — DECISION-031 / CHANGE-018…026)
> **→ CHANGE-018…026 (2026-09-22 · DECISION-031/A):** Bölüm 5'teki tüm klinik ölçek blokları (Hs, D, Hy, Pd, Mf, Pa, Pt, Sc, Ma, Si) taranarak kitaptaki 148 kod başlığı eksiksiz koda göç ettirilmiştir. Toplam 151 blok kodu ve takma adı `BLOCK_CODES` yapısına eklenmiş, UI (`MMPICodeTab`) ve Yazdırma Raporu (`MMPIPrintReport`) çok noktalı kod analizlerini çözümleyecek şekilde genişletilmiştir. Kapsam: 148 VAR / 0 YOK. **DURUM: FIXED (KAPANDI).**

Area: `src/scoring/mmpiSourceCodes.ts` + `mmpiScoring.ts` kod üretimi

Source: `SOURCE-CODE-002/003/004` (kitap s.68-69) — kaynak, Hs kod tipi
bölümünde **123/213**, **1234**, **1236**, **1237**, **2134**, **213/231**
kodlarını ayrı ayrı tanımlar. Ayrıca 12/21 için "1 ve 2 alt testleri arasında
**5 T puanı** kadar fark varsa 21'e bakılır" gibi **fark kuralları** verir.

Current implementation:
```ts
// mmpiScoring.ts:258
const sortedClin = [...clinical].filter(s => s.id !== 'Mf' && s.id !== 'Si')
  .sort((a, b) => b.tScore - a.tScore);
const topTwo = sortedClin.slice(0, 2);   // ← yalnızca 2 ölçek
```
`CODES` sözlüğünde **45 iki noktalı kod** var; **hiç üçlü kod yok**
(`grep "'123'\|'1234'\|'1236'"` → 0 sonuç).

Impact: Kaynağın yorum katmanının önemli bir bölümü (üçüncü ölçeğin yükselmesiyle
**değişen** yorumlar) hiç üretilmiyor. Örnek: yalnızca 1-2 yükselmiş profil ile
1-2-**3** yükselmiş profil kodda aynı yorumu alır; kaynakta farklıdır (12/21 vs
123/213). Ayrıca 12/21 kodu için kaynağın **5 T farkı** kuralı kodda yalnızca
`seeAlso` metni olarak var, **tespit edilmiyor**.

Status: **OPEN** — çözüm tasarım kararı gerektirir:
(a) kod üretimini 3. ölçeğe genişlet + üçlü `CODES` girişleri ekle, **veya**
(b) iki noktalı kod korunup üçüncü ölçek **yüksek** olduğunda "ek yorum" olarak
göster. Karar için önce kaynağın üçlü kod seti **tamamı** çıkarılmalı
(s.70-158). Bu yüzden **şimdi kod değiştirilmedi**; kaynak tarama devam ediyor.

---

## CONFLICT-025 — 12/21 yorumunda ergen/lise paragrafları eksik (P2, OPEN — kısmi)
> **→ CHANGE-014 (2026-09-22 · DECISION-029/A):** **Koşul tarafı bağlandı** (`12`: "5 T puanı kadar fark varsa 21'e bakılır" artık makinede; `27` 85 T; `07` 40 T; `68` 70 T; `49` K/Si; `13` Yüksek K; `89`/`08` üçüncü yükselen + yaş `manual`). **Lise/ergen paragrafları hâlâ YOK** — kaynak cümleleri kodda yok, eksik içerik bekletilir (DECISION-028).


Area: `CODES['12']` metni

Source (**Visual: CONFIRMED**, s.68): "12/21 Kodu veren **lise öğrencileri**
genel olarak utangaç, gergin, içedönük, mutsuz, endişeli, güvensiz ve özellikle
karşı cins ile ilişkilerinde oldukça çekingendirler. **Üniversite öncesi
ergenler**, sıklıkla utangaçlıklarını obsesyonlar ya da sosyal izolasyon
biçiminde gösterirler. Bağımlılık ve karamsarlık belirgindir ve arkadaşları
azdır. Aile öykülerinde sıklıkla ayrılıklar ya da boşanma vardır."

Current implementation: `CODES['12'].text` — bu iki paragraf **yok**
(kontrol: `lise` · `ergen` · `utangaç` · `ayrılık` · `boşanma` → hepsi 0 sonuç).
Kod metni doğrudan "12 kodunda 5 T puanı fark varsa 21'e bakılır" bölümüne geçer.

Ayrıca kaynak s.69'daki **Pd / Ma / Mf / L koşullu** ek yorumları
(`SOURCE-CODE-001`) kodda yok.

Impact: Yorum içeriği eksik; ayrıntı düzeyi düşük (yanlış yorum üretilmiyor).
Status: **OPEN** — içerik eklemesi; metin kaynaktan birebir alınmalı.

**GENİŞLETME (s.70-78 taraması sonrası):** Bu eksik *tek kod değil, sistemik*.
Hs bloğunda kodda **mevcut olan 9 kodun gövdesi sadık (MATCH)**, ancak
**koşullu ek cümleler sistematik olarak düşmüş**:

| Kod | Kaynakta olan, kodda olmayan koşullu/atıf cümlesi | Kaynak |
|---|---|---|
| 12 | lise öğrencileri + üniversite öncesi ergenler paragrafları | s.68 |
| 13 | "L ve K da yükselirse" + "13 vs 31 kodu" ayrımı | s.71 |
| 14 | "Çok genel olarak görülen üçlü kodlar 143/413 ve 142/412'dir." | s.75 |
| 16 | "erkeklerde 2 ve 4'ün, kadınlarda 3 ve 8'in üçlü yükselmesi" | s.76 |
| 17 | "Her iki cins için de 172/712 ve 173/713 kodları sık görülür." | s.76 |
| 18 | "Genel olarak üçlü kodlar 182/812, 183/813 ve 187/817'dir." | s.77 |
| 19 | "2 ve 3 alt testleri 5 T puanından aşağıda ise 129 ve 139 koduna bakınız." | s.77 |

Kaynak, yorumu **ikinci ölçekle sınırlamıyor**; üçüncü ölçeğin kimliğine ve
profilin geri kalanına göre **ayrı yorum** veriyor. Kodun `text + seeAlso`
modeli bu katmanı taşımıyor. Bu, CONFLICT-024 ile **aynı kök nedeni** paylaşır
(kod modeli 2 ölçekli) → karar birlikte verilmeli.

---

## CONFLICT-026 — Hs düşük puan özellikleri ve yaş notu eksik (P3, OPEN)

Area: `HS_T_BANDS` (21-49 bandı) ve Hs genel yorumu

Source (**Visual: CONFIRMED**, s.66-67):
1. "Hs alt testinde düşük puan alan bir bireyin: **1. Somatik uğraşları
   yoktur. 2. İyimserdir. 3. Duyarlıdır. 4. İçgörüsü vardır. 5. Günlük yaşamda
   oldukça etkindir.**" → kodda **yok**
2. "Hs alt testinin **40 yaşın üzerindekilerde** daha çok yükseldiği ancak genç
   grupta daha düşük olduğu belirtilmektedir." → kodda **yok**
3. "Bu bireyler önerilen tedaviyi uygulamaz ve **sık sık doktor doktor
   gezerler.**" → kodda **yok**
4. 21-49 bandı: "Özelliği olan bir örüntüde **2,6,7,8 ya da 0 alt testlerinin
   70'in üzerinde yer aldığı** bir durumdur" → kodda **yok**

Impact: Bilgi eksikliği; tespit kuralı (4) uygulanmıyor ama yanlış sonuç
üretilmiyor. Status: **OPEN**


---

## CONFLICT-027 — Kod yorumlarındaki **T-puan eşikleri** tespit edilmiyor (P1, ✅ **FIXED** — DECISION-031 / CHANGE-018…026)
> **→ CHANGE-014 (2026-09-22 · DECISION-029/A):** `CodeInterpretation.conditions` alanı açıldı: `quote` (birebir kaynak cümlesi) + `test(profil)` makine koşulu + `manual` bayrağı.
> **→ CHANGE-018…026 (2026-09-22 · DECISION-031/A):** Bölüm 5'teki tüm klinik ölçek blokları boyunca tespit edilen sayısal koşullu kuralların tamamı (toplam 73 kural seti, 123 birebir kaynak koşulu) makinece değerlendirilebilir `test()` fonksiyonları ve kaynak alıntılarıyla `CODE_CONDITIONS` ve `BLOCK_CODES` yapılarına bağlanmıştır. Demografik (yaş/eğitim) kurallar `manual: true` olarak klinisyen incelemesine sunulmuştur. **DURUM: FIXED (KAPANDI).**


Area: kod tipi yorum katmanı (`mmpiSourceCodes.ts` + `mmpiInterpretation.ts`)

Source (**Visual: CONFIRMED**): Kaynak, kod yorumlarını yalnızca **ilk iki ölçeğe**
bağlamıyor; **ek ölçeklerin T değerlerine** bağlı koşullar koyuyor:

| Kod | Kaynak koşulu | Kaynak |
|---|---|---|
| `26/62` | "**Pa alt testi belirgin bir biçimde yükseldiğinde ve/veya 4 ve 8 alt testi 70 T puanının üzerinde ise**, bireyin psikozun erken dönemlerinde olma olasılığı artar." | s.87 |
| `27/72` | "**Çok fazla yükselmeler (örneğin, 85 T puanının üstünde)** sıklıkla bireyin sözel psikoterapide yeterli derecede odaklanamayacak kadar ajite ve endişeli olduğu anlamına gelir ve **daha etkili müdahale formları (ilaç gibi) gerekli olabilir.**" | s.87 |
| `13/31` Yüksek K | "özellikle **2, 7 ve 8 testlerinin T puanı 70'in ve F alt testi T puanı 50'nin altında** olduğu durumda" | s.72 |
| `138` | "**4 alt testinde yükselme varsa ve K alt testi düşmüşse** mücadeleci ve yıkıcı kişilik özellikleri" | s.74 |
| `19/91` | "**2 ve 3 alt testlerinin değerleri 5 T puanından aşağıda ise** 129 ve 139 koduna bakınız" | s.77 |
| `136/316` | "**Pa alt testi, Hy alt testinden 10 T puanından daha yüksekse** şüphecilik ve kızgınlık oldukça belirgindir"; "**Hy alt testi, Pa alt testinden 10 ya da daha fazla T puanı yüksekse** paranoid özellikler daha az belirgin olmak üzere fiziksel yakınmalar ön plana çıkabilir." | s.73 |
| `12/21` | "**1 ve 2 alt testleri arasında 5 T puanı kadar fark varsa** 21'e bakılır" | s.68 |
| `287/827` | "**eğer K alt testi 50 T puanının altında ise ve Ma alt testi 70 T puanının üzerinde ise** bunlar dikkate değerlendirilmelidir. **İntihar çoğunlukla garip biçimlerde gerçekleştirilir.**" | s.91 |
| `284/824` | "**dürtü kontrolünü kaybetme korkuları çaktır (özellikle Pd alt testi 80'in üzerinde ise)**" | s.91 |
| `281/821` | "Diğer bireylerde, **özellikle test 3 de yükselmiş ise**, bu somatik yakınmalar ve bunlarla bağlantılı davranışlar, terapisti kurtarma davranışlarında bulunmaya teşvik edebilir" | s.90 |
| `284/824` | "test 4, test 2 ya da 8'in 5 T puanı alanı içinde ise 482/842 kodlarının yorumuna bakınız" | s.91 |

Current implementation: `CodeInterpretation = { code, text, diagnosis?, seeAlso? }`
— **koşul alanı yok**. `codePointInterpretation()` yalnızca kod dizesine bakar;
T değerleri **hiç okunmuyor**. Koşullu cümlelerin bir kısmı `text` içinde
gömülü (13/31 Yüksek K), çoğu **hiç yok**. **Toplam 11 koşul örneği belgelendi
(s.68-91).**

Impact: Klinik olarak anlamlı ayrımlar kayboluyor. Örnek: `27/72` profilinde
**85 T üstü** bir yükselme olduğunda kaynak **"ilaç gerekli olabilir"** diyor;
kod bunu hiçbir koşulda söylemiyor. `26/62` + `Pa`/`4`/`8` **> 70 T** durumunda
kaynak **"psikozun erken dönemi"** diyor; kod demiyor.

Status: **OPEN** — CONFLICT-024 ile **aynı kök neden** (kod modeli tek boyutlu:
yalnızca kod dizesi). Çözüm önerisi: `CodeInterpretation`'a
`conditions?: Array<{ rule: string; test: (t: Record<ScaleId, number>) => boolean; text: string }>`
ekleyip `codePointInterpretation(code, tScores)` imzasını genişletmek.
Bu, **kaynağın tüm kod seti** çıkarıldıktan sonra 024 ile **birlikte**
kararlaştırılmalı.

---

## CONFLICT-028 — Hy **kadın** normu: kaynak kendi kendisiyle çelişiyor (P2) → **REJECTED**

Area: `TURKISH_NORMS.Kadın.Hy`

**Kaynak kanıtı A (metin, s.94, 400 dpi GÖRSEL doğrulandı):**
> "Erkeklerde ortalama: **19.31**, kadınlarda ortalama: **22.33** (Savaşır, 1981)"

**Kaynak kanıtı B (Tablo 30, s.195, `SOURCE-NORM-001`, 26/26 doğrulanmış):**
> Hy kadın: X̄ **18.12** · SD 5.31

**Kod:** `TURKISH_NORMS.Kadın.Hy = { mean: 18.12, sd: 5.31 }` → **Tablo 30'u izler**

**Karşılaştırma:** Aynı kitap, aynı ölçek (Hy), aynı örneklem için **iki farklı
kadın ortalaması** veriyor (22.33 ↔ 18.12). Bu, **CONFLICT-001 (F kadın normu)**
ve **CONFLICT-002 (K normları)** ile **aynı sınıfın üçüncü örneğidir**:

| Çelişki | Metin (Bölüm 3-5) | Tablo 30 (s.195) | Kod |
|---|---|---|---|
| 001 | F kadın 10.11 | 9.38 | Tablo 30 ✅ REJECTED |
| 002 | K erkek 13.90 / kadın 13.54 | 13.98 / 11.82 | Tablo 30 ✅ REJECTED |
| **028** | **Hy kadın 22.33** | **18.12** | **Tablo 30 ✅ REJECTED** |

**Resolution: REJECTED (kod doğru).** Gerekçe (DECISION-015/016 emsali):
1. **Tablo 30**, "Normal Türk Erkek ve Kadınların MMPI Alt Testlerindeki Ortalama
   ve Standart Sapmaları" başlıklı **asıl norm tablosudur** (n=1003/663).
2. Gövde metnindeki sayılar **ikincil atıflardır** ("Savaşır, 1981").
3. Tablo 30'un **tamamı** (26 hücre) doğrulanmıştır; metin atıflarında ise
   **3 farklı hata** bulunmuştur (F kadın, K × 2, Hy kadın) — metin atıflarının
   güvenilirliği sistematik olarak düşüktür.
4. Kod tek bir tutarlı kaynağı izlemelidir; karışık kaynak kullanımı iç
   tutarsızlık üretir.

**Karar kaydı:** `DECISION-028`.

**Tarihsel kayıt (silinmedi):** İlk bulgu (bu oturum) "Hy kadın normu P0 hatalı"
yönündeydi; Tablo 30 kanıtı ile **tam tersi** sonuca bağlandı — kod doğrudur,
metin atfı hatalıdır.

---

## CONFLICT-029 — Tablo 10'da OCR satır kayması (P3, kayıt) → **OCR-UNCERTAIN (çözüldü)**

Kaynak: `SOURCE-CL-014`. Ham OCR, `55`, `51`, `30` maddelerini **Doğru**
listesine kaydırdı; görsel okuma bunların **Yanlış** listesinde olduğunu
gösterdi. OCR ile karşılaştırma yapılsaydı **sahte 3 maddelik P0 fark**
raporlanacaktı.

Resolution: **OCR-UNCERTAIN → görsel ile ÇÖZÜLDÜ.** Kod anahtarı kaynakla
birebir uyumlu. Kural kaydı: `OCR_ISSUES.md` → **TABLE-ROW-SHIFT**.

---

## CONFLICT-030 — 3+ ölçekli kodlar **yanlış yoruma** eşleniyor (P1, ✅ **FIXED** — CHANGE-014)
> **→ CHANGE-014 (2026-09-22 · DECISION-029/A):** `codeInterpretation()` içindeki **`slice(0,2)` kırpması kaldırıldı** → eşleşme yoksa `undefined` (UI "kaynak yorumu tanımlı değil" der). Kanıtı okunmuş 4 üç/parantez-haneli kod **kendi gövdesini** aldı: `91/19` (Ma), `64/46` (Pa), `049`, `027(8)` (Si). **Kalan 33 örnek için gövde YOK ve üretilmedi** — bunlar artık *sessizce yanlış* değil **açıkça tanımsız** döner; gövde içeriği CONFLICT-024 kapsam işidir. Kilit testleri: `049`/`027(8)` kendi gövdesi + `794`/`8726`/`273/723`/`213/231` → `undefined`.


Area: `src/scoring/mmpiSourceCodes.ts:305` — `codeInterpretation()`

**Kök neden (satır kanıtı):**
```ts
// src/scoring/mmpiSourceCodes.ts:303
export function codeInterpretation(code: string | undefined): CodeInterpretation | undefined {
  if (!code || code.length < 2) return undefined;
  return CODES[canonicalCode(code.slice(0, 2))];   // ← ilk 2 karakter, gerisi ATILIR
}
```
`CODES` yalnızca **45 adet iki-ölçekli** anahtar içerir
(`12 13 14 … 09`). Bu yüzden **üç ve dört ölçekli her kod sessizce kırpılır**.

**Amprik kanıt (bu oturumda koşuldu — `cmp-d-batch7.ts`):**

| Çağrı | Dönen kayıt | Sorun |
|---|---|---|
| `codeInterpretation('273/723')` | `27/72` | kaynakta **ayrı başlık** (s.88) |
| `codeInterpretation('274/724')` | `27/72` | kaynakta **ayrı başlık** (s.88) — intihar düşünce/planı, kronik alkolizm |
| `codeInterpretation('275/725')` | `27/72` | kaynakta **ayrı başlık** (s.88/89) |
| `codeInterpretation('278/728')` | `27/72` | kaynakta **ayrı başlık** (s.89) — obsesif/mükemmeliyetçi + intihar eşikleri |
| `codeInterpretation('270')` | `27/72` | kaynakta **ayrı başlık** (s.90) — şizoid kişilik bozukluğu |
| `codeInterpretation('207')` | `20/02` | kaynakta **ayrı başlık** (s.92) — şizoid içe çekilme |
| `codeInterpretation('213/231')` | `12/21` | "Ayrıca 123 koduna bakınız" (s.83) |
| `codeInterpretation('231/321')` | `23` | **"En sık üçlü kodlar"** (s.83) |
| `codeInterpretation('247/427')` | `24/42` | kaynakta atıf (s.85) |
| `codeInterpretation('248')` | `24/42` | kaynakta ayrı (s.86) |
| `codeInterpretation('742')` | `47/74` | kaynakta ayrı (s.85) |

**Ağırlaştırıcı kanıt — KAPALI DÖNGÜ:**
`codeInterpretation('274/724')` → `27/72` kaydını döndürür; **o kaydın `seeAlso`
alanı ise şunu yazar:** *"273/723, 274/724, 275/725, 278/728, 270 kodlarına da
bakınız."* → Kullanıcı `274/724` için **daima `27/72` metnini** görür ve metin onu
**yine `274/724`'e** yollar. **274/724'ün kendi yorumu sisteme hiç girmediği için
bu kod tipinin içeriği kullanıcıya ASLA ulaşmaz.**

**Yanlış metin eşlemesi (içerik kanıtı):**
`27/72` kaydının 6 cümlesinin **tamamı kaynağın s.88'deki `273/723` alt-kodunun
metniyle birebir aynıdır** ("Bu hastalar pasiftir…", "Korunduklarında…", "Çok
yüksek standartlar…", "Stresleri arttığında…", "Bu görünen çaresizlik…",
"Hs alt testi de yükselmişse…"). Kaynağın **`27/72` ana kodunun** metni (s.87:
"Psikiyatri polikliniklerine başvuranlar arasında çok görülür… aşırı kontrollüdürler…
duygularını açık olarak ifade etmekte zorluk… cinsel alanda çatışma") kodda
**hiç yoktur** (`SOURCE-CODE-012`). → Kod, `27/72` etiketi altında `273/723`
içeriğini sunmaktadır.

Impact: **Yanlış klinik yorum.** Örnek: `278/728` (obsesif-mükemmeliyetçi örüntü,
intihar eşikleriyle) bir kullanıcıya `27/72` metni gösterilir; `284/824`
(şizoid/şizofrenik, F yükselmiş) `28/82` metnini alır. P1.

Status: **OPEN** — düzeltme `CONFLICT-024` (üçlü kod seti yok) ile **aynı tasarım
kararına** bağlıdır: kod modeli tek-anahtarlı olduğu sürece kırpma sürer. Karar
**tüm klinik ölçek blokları çıkarıldıktan sonra** verilecek (bkz. `AUDIT_STATE`).

**Kod değişikliği YAPILMADI** (karar bekliyor).

---

## CONFLICT-027 (GENİŞLETME — s.88-89 örnekleri)

Mevcut tabloya ek **T-eşiği / ölçek-koşulu** örnekleri:

| Kod | Kaynak koşulu | Kaynak |
|---|---|---|
| `278/728` | "**K ve Hs, 50 T puanının altında** olduğunda **ve/veya Ma alt testi yükseldiğinde** intihar olasılığı dikkatle değerlendirilmelidir" + **Si**/**Pd** ölçek koşulları | s.89 (**görsel doğrulandı**) |
| `274/724` | "**test 4 ve 7 birbirlerinin 5 T puanı alanı içindeyse** 247 ve 427 kod yorumlarına da bakınız" | s.88 (**görsel doğrulandı**) |
| `275/725` | "**4 alt testi düşük olduğunda** daha belirgindir" | s.88 |
| `273/723` | "**Hs alt testi de yükselmişse**… sosyal geri çekilme gösterirler" | s.88 |
| `274/724` | "**Alt test 3 yükseldiğinde** kronik alkolizm olasılığı fazladır" | s.88 |
| `284/824` | "**test 4, test 2 ya da 8'in 5 T puanı alanı içinde ise** 482/842 kodlarının yorumuna bakınız" | s.91 |

→ CONFLICT-027 kapsamı **13 örneğe** çıktı; hiçbiri kodda koşul olarak yok
(`CodeInterpretation` tipinde koşul alanı bulunmuyor).

---

## CONFLICT-031 — Kod yorumları **blok-bazlı**, kod modeli **tek-anahtarlı** (P1, ✅ **FIXED-kısmı** — CHANGE-014)
> **→ CHANGE-014 (2026-09-22 · DECISION-029/A):** **Model kararı çözüldü:** kimlik artık `(blok, sıralı kod, varyant)`; blok = kodun ilk rakamı. Kaynağın ayrı başlık verdiği **4** vaka ayrık kayda taşındı. **Kalan kısım içerik işi:** kaynakta ayrı başlığı olan diğer blok gövdeleri (ör. `32 Kodu` s.96) hâlâ ortak kayda düşüyor; `87` sorgusu Pt `78/87` gövdesine düşmeye **devam ediyor** (kaynak `87` için ayrı başlık vermiyor → uydurma gövde yazılmadı). Bu yüzden kayıt **tamamen kapatılmadı**, kapsam 024 ile birlikte izleniyor.


Area: `src/scoring/mmpiSourceCodes.ts` — `CODES` (tek `Record`)

**Kaynak yapısı (görsel doğrulandı):** Kaynak, iki-ölçekli kod yorumlarını
**o ölçeğin blok başlığı altında** verir. Aynı iki rakam çifti, **farklı bloklarda
farklı başlık ve farklı metin** taşıyabilir:

| Blok | Kaynak başlığı | Kodda dönen kayıt | Sonuç |
|---|---|---|---|
| **D (2) bloğu** (s.82-83) | `23 Kodu` — "Bireyler kendilerini sıklıkla (özellikle düşük 9) zayıf, yorgun ya da tükenmiş hissederler…" | `23` | ✅ kendi metni |
| **Hy (3) bloğu** (s.96) | `32 Kodu` — "**23 kod tiplerinin aksine**, bu bireyler sağlıkları ve belirgin olmayan depresyonları ile fazlaca ilgilenirler… **menapoz güçlükleri**…" | **`23`** | ❌ **D bloğunun metni gösterilir** |
| **D (2) bloğu** (s.83) | `32` (D bloğu anlamı) | `23` | ⚠️ D bloğu bağlamı ayrı çözülmeli |

**Ayrıca:** `31 Kodu` (Hy bloğu, s.96) kaynakta **açıkça** "(Bakınız 13/31 Kodu)"
diyerek komşu bloğa atıfta bulunur → yani **bloklar arası atıf kaynağın kendi
yapısıdır**; kodun tek `Record` modeli bu katmanı temsil edemez.

**Amprik kanıt (`cmp-hy-batch8.ts`):**
```
31      -> 13/31
32      -> 23        ← Hy bloğunun 32'si D bloğunun 23 metnini alıyor
321     -> 23
345/435 -> 34/43     ← başlıktaki üçüncü varyant (534) hiç erişilemiyor
346/436 -> 36/63
34      -> 34/43
35/53   -> 35/53
```

Impact: Kullanıcı `32/23` kodunu aldığında **hangi blok bağlamında** olduğunu
belirleyen bir seçim yapılmıyor; kod, Hy bağlamında **yanlış ölçeğin metnini**
gösterir. P1.

Status: **OPEN** — çözüm, kod kimliğine **bağlam (birincil blok / T-puan sırası)**
eklemeyi gerektirir; CONFLICT-024 ve CONFLICT-030 ile **aynı tasarım kararına**
bağlıdır. Karar tüm klinik ölçek blokları çıkarıldıktan sonra verilecek.

**Kod değişikliği YAPILMADI.**

---

## CONFLICT-027 (GENİŞLETME 2 — Hy bloğu, s.95-99)

| Kod | Kaynak koşulu | Kaynak |
|---|---|---|
| `Hy 60-69 T` | "Eğer Hs'nin yükselmesi Hy ile aynı düzeyde ise ve **D alt testi, 1 ve 3 alt testlerinden 10 T puanı düşükse**…" / "Eğer **Hy alt testi Hs alt testinden 10 T puanı yüksekse**…" | s.95 (**görsel**) |
| `345/435/534` | "**Alt test 3, 4'ten yüksekse ve K alt testi 50 T puanının üstündeyse**, duyguların ve isteklerin eyleme dökülme olasılığı düşüktür." | s.99 (**görsel**) |
| `32` | "**2 alt testi, 3 alt testinin 5 T puanı sınırları içinde ise** 23 koduna da bakınız" | s.96 |
| `346/436` | "**6 alt testi, 3 alt testinin 5 T puanı sınırları içinde ise** 36/63 kodlarına da bakınız" | s.99 |
| `34/43` | "**3 ve 4'ün göreceli yükseklikleri**… **eğer 3 yüksekse**… **eğer 4 yüksekse**…" · "**4'ün 3'ten önemli ölçüde yüksek olduğu durumlarda**…" | s.97-98 |
| `35/53`, `32`, `34/43`, `29/92`, `20/02` | "**üçüncü en yüksek test**" koşulları (Hy: `1,8,9` / `1,4,8` / `4 ya da 6`; D: `3 ya da 4` / `7 ya da 4`) | s.97-98, s.92 |

→ CONFLICT-027 kapsamı **19 koşula** çıktı. `CodeInterpretation` tipinde
**koşul alanı yok**; metinler koşulu anlatır ama **tespit edilmez**.

---

## CONFLICT-032 — Hy bloğunda erişilemeyen başlık varyantı (P3, kayıt)

`s.99` başlığı **300 dpi görselle** `345/435/534` olarak doğrulandı (3 varyant).
Kod yalnızca `34/43` anahtarını taşıdığı için **`534` sıralaması hiçbir zaman
`345/435` metnine erişemez** (kırpma `34`e düşürür → `34/43` döner; içerik
kaybolur). CONFLICT-030/031 ile aynı kök neden.

---

## CONFLICT-033 — **Nevrotik üçlü profil konfigürasyonları** kodda yok (P1, ✅ **FIXED-kısmı** — CHANGE-014)

> **→ PHASE 10 batch 22:** BÖLÜM 6, s.160-169’da **10 numaralı örüntü listesini** veriyor
> (Şekil 23-32) — bu kayıt için yeni kanıt katmanı: **#1 Konversiyon V ve #2 Paranoid V
> burada sayısal olarak TEKRARLANIYOR ve FARKLI eşikle** (70/10 ve 80/70); kodun
> `conversion-v` (65/5) ve `psychotic-v` (70/70) eşikleri **BÖLÜM 5’te nicel tanım
> olmadığı için** kaynak-dışıydı → ayrıntı ve sınıflandırma **CONFLICT-041**’de.
> **#4-#10 (Kuş Kanadı · Pasif-Agresif V · pozitif/negatif eğim · Yüzen · Batık · Sınır)
> kodda YOK** → bu yüzden 033 “kısmi” durumda.
> **→ CHANGE-014 (2026-09-22 · DECISION-029/A):** Nevrotik üçlünün **4/4 konfigürasyonu** artık kodda: `konversiyon-vadisi` önceden vardı; `neurotic-step` (Şekil 18) · `neurotic-hat` (Şekil 19) · `neurotic-rising` (Şekil 20) eklendi, eşikler kaynak cümlesinden (>70 T / Hs<70 T) ve `PatternHit.source` alanı geldi. **033'ün diğer 5 örüntüsü (Paranoid Vadi Şekil 22 · Si↑+4↑+9↑ · Si↑+(2|7)↑+8↑ · K-örüntüleri) hâlâ YOK** → kayıt bu yüzden tamamen kapatılmadı.


Area: yorum katmanı (`mmpiSource.ts` / `mmpiInterpretation.ts`)

**Kaynak (s.103-106, 4/4 konfigürasyon 300-340 dpi GÖRSEL doğrulandı):**
"**Nevrotik üçlü içindeki üç alt testin ilişkileri çerçevesinde en sık
karşılaşılan dört konfigürasyon vardır.**"

| # | Konfigürasyon | Kaynak koşulu | Şekil |
|---|---|---|---|
| 1 | **Konversiyon vadisi** | Hs ↑, Hy ↑, **D ↓** | 17 |
| 2 | **Basamak orantısı** | **üçü de > 70 T**, Hs > D > Hy | 18 |
| 3 | **Şapka** | **Hs < 70 T** ∧ **D > 70 T** ∧ **Hy > 70 T** (+ D, Hs ve Hy'den yüksek) | 19 |
| 4 | **Yükselen eğilim** | **üçü de > 70 T**, Hs < D < Hy | 20 |

**Kod tarafı (kanıt):**

- `src/scoring/mmpiSource.ts` → yalnızca **tek ölçek** bantları (`HS_T_BANDS`,
  `D_T_BANDS`, `HY_T_BANDS`), **tek yükselme** kuralları (`SINGLE_HS/D/HY/…`) ve
  `"Sadece Hy yüksek ve diğer hiçbir alt test 70 T puanının üstünde değilse"`
  kuralı vardır.
- `src/scoring/mmpiInterpretation.ts:192` → **yalnızca iki noktalı** kod:
  `codePointInterpretation(code)` → `codeInterpretation(code)`
  (`mmpiSourceCodes.ts`, **45 iki-ölçekli anahtar**).
- **Üç ölçekli (nevrotik üçlü) bir konfigürasyon tespiti hiçbir dosyada yok**
  (`grep -i "nevrotik\|konversiyon\|triad"` → yalnızca Goldberg/Taulbee/Peterson
  gibi **türetilmiş endeksler** ve L-nevrotik ölçek ilişkisi).

Impact: Kaynağın **en sık karşılaşılan** dört nevrotik profil örüntüsü — her biri
**kendi yorumunu, prognozunu ve hatta yaş/cinsiyet notunu taşıyan** dört ayrı
klinik tablo — kullanıcıya **hiç gösterilmiyor**. P1.

Status: **OPEN** — düzeltme, CONFLICT-024/030/031 ile **aynı kod-modeli
kararına** bağlıdır (üçlü kod altyapısı). Karar tüm klinik ölçek blokları
çıkarıldıktan sonra verilecek.

**Kod değişikliği YAPILMADI.**

---

## CONFLICT-027 (GENİŞLETME 3 — s.100-101)

| Kod | Kaynak koşulu | Kaynak |
|---|---|---|
| `36/63` | "**Alt test 6, 3'ten 5 ya da daha fazla T puanı yüksek olduğunda**… güç ve prestij kazanmak ister… **Alt test 3, 6'dan yüksekse**… kızgınlıklarının farkında değildirler" | s.100 |
| `39/93` | "**özellikle eğer alt test Si 40 T puanının altında ise**" (yüzeysellik) | s.101 |
| `394/934` | "**En sık görülen üçlü kod tipi 394/934'tür.**" (üçlü kod → CONFLICT-024) | s.101 |
| `36/63`, `37/73`, `30/03` | "**üçüncü en yüksek test**" koşulları (`Si ya da Sc` · `1, 2 ve 4` · `1 ve 2`) | s.100-101 |

→ CONFLICT-027 kapsamı **23 koşula** çıktı.

---

## CONFLICT-034 — Kod yorumlarında "yaş/eğitim/cinsiyet" zorunluluğu yok (P2, OPEN — kanıtı BÖLÜM 6 ile genelleşti)

Area: `mmpiSourceCodes.ts` — tüm kod kayıtları

**→ PHASE 10 batch 22 (s.159):** bölümün **genel direktifi** bulundu — “Hiçbir zaman
körlemesine bir değerlendirme yapılmamalıdır. İlk aşamada test verilecek bireyin
**demografik özellikleri belirlenmelidir: Yaş, cinsiyet, eğitim, medenî durum, meslek.**
gibi” + “**zekâ düzeyleri 80’in üzerinde olan yetişkinlere… eğitim düzeyi olarak
ortaokul**” + “**Hs ve D alt testlerde yaşın ilerlemesi ile yükselme**”. Yani bu direktif
tek bir kodun değil **BÖLÜM 6’nın tamamının** ön koşulu. `MMPIProfile`'da `age`/`education`
**yok** → CHANGE-014’ün `conditions[].manual` kanalı tek taşınabilir biçim (UI “elle
değerlendirilmelidir” der). Kayıt **OPEN** — kod değişikliği DECISION-030 onayına bağlı.

Source (**Visual: CONFIRMED**, s.112, `v_pd112_lowconf.png`):
> "**Bu kod tipi hastanın yaşı, eğitimi ve cinsiyeti dikkate alınarak
> yorumlanmalıdır.**" — 45/54 Kodu girişi

Current implementation: `codeInterpretation()` gövde metnini döndürür; kod
kayıtlarında **yorumlamanın yaş/eğitim/cinsiyete göre koşullanması gerektiğini
söyleyen bir alan/direktif yoktur**. Arayüz bu uyarıyı gösteremez.

Impact: Kaynak, bu kod bloğunun **koşullu** yorumlanmasını zorunlu kılıyor;
uygulama gövde metnini bağlamsız sunuyor → yanlış genelleme riski (P2).

Ek kanıt: Aynı blokta kaynak **koşullu cümleler** kuruyor ("**özellikle eğer test
6 da yüksekse**", "**Alt test 3 de yükselmişse**", "**Eğer test 0 düşükse**") →
CONFLICT-025 ve CONFLICT-027 ile aynı kökten (koşul modellemesi yok).

Status: **OPEN**

---

## CONFLICT-024 · genişletme (Pd bloğu I — s.111-113)

Pd (4) bloğunda kodda **YOK** olanlar:

| # | Kaynak başlığı | Sayfa | Not |
|---|---|---|---|
| 1 | **Yüksek 4/Düşük 5 Kodu** | s.111-112 | tam sayfa metin; Mf düşüklüğüne atıf; kadın/erkek/ergen ayrımı |
| 2 | **456 Kodu** | s.113 | kendi metni var; **`codeInterpretation('456')` şu an `45/54` döndürüyor** |
| 3 | `468/648` | s.113 | 46/64 içinde atıf; kod `seeAlso`'da var, **kaydı yok** |
| 4 | `463/643` | s.113 | 46/64 içinde atıf; kod `seeAlso`'da var, **kaydı yok** |

## CONFLICT-030 · genişletme (Pd bloğu — ampirik kanıt)

`codeInterpretation()` kurpma testi (bu oturumda koşuldu):

| Çağrı | Dönen kayıt | Beklenen |
|---|---|---|
| `'456'` | **`45/54`** | 456 Kodu |
| `'468'` | **`46/64`** | 468/648 Kodu |
| `'463748'` | **`46/64`** | 463/643 Kodu |
| `'943'` | **`49/94`** | 943 (Sc bloğu) |

→ `slice(0,2)` kırpması **Pd bloğunda da** yanlış metne düşürüyor. CONFLICT-030
örnekleri **13 → 17**'ye çıktı.

---

## CONFLICT-027 · genişletme (Pd bloğu II — s.115-116)

Yeni T-eşiği koşulları (hepsi **görsel doğrulandı**):

| # | Kaynak koşulu | Sayfa | Kod |
|---|---|---|---|
| 1 | **468/648:** "K testi **50 T puanının altında**, test **5, 4 ve 6'nın 5 T puanı alanı içinde** ve/veya alt test **9 ve 2 de 70 T puanının üzerinde** olduğu durumlarda impuls kontrolünde azalma vardır" | s.115 | `468` kaydı yok → koşul da yok |
| 2 | **469:** "46 koduna ek olarak **test 9 da 70 T puanının üzerinde ise**… ani öfke patlamaları" | s.115 | `469` kaydı yok |
| 3 | **46/64:** "**5 alt testinin 40 T puanının altında** olduğu kadınlarda pasiflik, bağımlılık ve kendine acıma" | s.115 | koşul yok |

→ CONFLICT-027 örnekleri **23 → 26**'ya çıktı. Ortak kök: `CodeInterpretation`
modelinde **koşul alanı yok** (`rule`/`text`/`diagnosis`/`seeAlso` dışında).

## CONFLICT-030 · genişletme (Pd bloğu II — ampirik)

| Çağrı | Dönen kayıt | Beklenen |
|---|---|---|
| `'468'` | `46/64` | 468/648 |
| `'469'` | `46/64` | 469 |
| `'462'`/`'463'` | `46/64` | 462/642 · 463/643 |
| `'472'`/`'478'` | **`47/74`** | 472/742 · 478/748 |
| `'482'`/`'486'`/`'489'` | `48/84` | 482/842 · 486/846 · 489/849 |
| `'247'`/`'274'` | `24/42` / `27/72` | 247/427 · 274 |

**Toplam 11 kayıt** (`462, 463, 468, 469, 472, 478, 482, 486, 489, 247, 274`)
kodda hiç yok → CONFLICT-030 örnekleri **17 → 28**'e çıktı.

**Kapalı döngü kanıtı:** `47/74`'ün `seeAlso`'su kullanıcıyı `247/427/274`'e
yolluyor; bu kodların **kaydı yok**, çağrıldıklarında **başka metin** dönüyor.
`48/84`'ün `seeAlso`'su `482/842, 486/846, 489/849`'a yolluyor → aynı durum.

---

## CONFLICT-035 — 40/04 kodunda tıbbi terim sapması: "negatifik" ↔ "vegetatif" (P2)

Area: `mmpiSourceCodes.ts` → `CODES['04']` (40/04)

Source (**Visual: CONFIRMED**, 400 dpi `v_pd120_0404e.png`, s.120):
> "Yüksek puanla görülen bir depresyon durumu varsa bu çoğunlukla gerçek,
> psikomotor retardasyon ya da **vegetatif depresyon** belirtileri yerine
> depresif düşünce ve duygulara ilişkindir."

Current implementation:
> "…gerçek psikomotor retardasyon ya da **negatifik** depresyon belirtileri
> yerine depresif düşünce ve duygulara ilişkindir;"

Impact: **Klinik terim** yanlış aktarılmış. "Negatifik depresyon" yerleşik bir
tanı/terim değildir; kaynağın kastettiği **vegetatif (bitkisel) belirtiler**dir
(DSM'deki "vegetative symptoms"). Bu cümle, depresyonun **tipini** ayırt eden
işlevsel bir ayrım yapıyor → yanlış terim yorumu saptırır (P2 — yorum katmanı,
sayısal değer değil).

Status: **FIXED** — CHANGE-012 ile "vegetatif" olarak düzeltildi (2026-09-22).
Not: Kaynak cümlesinin geri kalanı birebir; sapma giderildi.

---

## CONFLICT-024 · genişletme (Pd bloğu III — s.118-121)

| # | Kaynak başlığı | Sayfa | Durum |
|---|---|---|---|
| 1 | **`482/842/824`** | s.118 | **YOK** ❌ (`48/84.seeAlso` işaret ediyor) |
| 2 | **`489/849`** | s.118 | **YOK** ❌ (`48/84.seeAlso` işaret ediyor) |
| 3 | **`493/943`** | s.119 | **YOK** ❌ |
| 4 | **`495/945`** | s.119 | **YOK** ❌ |
| 5 | **`496/946`** | s.120 | **YOK** ❌ (`498/948.seeAlso` işaret ediyor) |
| 6 | **`498/948`** | s.120 | **YOK** ❌ |
| 7 | `49/94` | s.118-119 | **VAR** ✅ |
| 8 | `40/04` | s.120 | **VAR** ✅ (1 terim sapması → CONFLICT-035) |

→ **Pd (4) bloğu TAMAMLANDI** (s.107-120): **20 kod incelendi · 7 VAR /
13 YOK** (batch 11: 5/4 · batch 12: 2/8 · batch 13: 2/6 — `49/94` ve `40/04`
batch 11-12'de sayılanlarla aynı kayıtlar, toplamda tekrar sayılmadı).

**Kod seti güncel toplam: 36 VAR / 70 YOK.**

## CONFLICT-025 · genişletme ("üçüncü yüksek test" kuralları)

Kaynak **her kod bloğunda** "üçüncü en yüksek/yükselen test" listesi veriyor;
kodda bunların **hiçbiri yok**:

| Kod | Kaynak listesi | Sayfa |
|---|---|---|
| `49/94` | "**Erkekler için test 8, 5 ve 3**; **kadınlar için test 8, 3 ve 6**, sıklıkla üçüncü en yüksek testtir" | s.119 |
| `40/04` | "sıklıkla **üçüncü yüksek test 2, 6 ve 8**'dir" | s.120 |
| `40/04` | "**Üçlü kodda sıklıkla Si'nin alınmaması** ve sonra kalan ikili koda ilişkin yorumların elde edilmesi ve buna yüksek Si testine ait bilginin eklenmesi yararlı olur" | s.120 |

→ CONFLICT-025 örnekleri **7 → 10**'a çıktı.

## CONFLICT-027 · genişletme (Pd bloğu III — s.119-120, hepsi görsel doğrulandı)

| # | Kaynak koşulu | Sayfa |
|---|---|---|
| 1 | **49/94:** "Eğer **K testi 50 T puanının üzerinde** ise ve/veya **test 2, 5, 7 ya da 0 70 T puanı üstünde üçüncü yükselen test** ise … suç işleme ya da antisosyal davranış olasılığı daha azdır" | s.119 |
| 2 | **49/94:** "**Alt test Si 50 T puanının altında** olduğunda … bireyin sosyal ilişkileri iyidir" | s.119 |
| 3 | **493/943:** "**Alt test 3, test 4'ün 5 T puanı alanı içinde** ise 34/43 kod tipinin özellikleri de bulunabilir" | s.119 |
| 4 | **495/945:** "Özellikle **test 4 ve 9'un orta derecede yükseldiği ve test 7'nin de 70 T puanı ya da üstü** olduğu durumlarda" | s.119 |
| 5 | **496/946:** "özellikle eğer **K alt testi 50'nin altında** ise" | s.120 |
| 6 | **498/948:** "**20 yaşın üstündeki** bireylerde … majör ve uzun süreli psikopatoloji" | s.120 |

→ CONFLICT-027 örnekleri **26 → 32**'ye çıktı.

## CONFLICT-030 · genişletme (Pd bloğu III)

| Çağrı | Dönen | Beklenen |
|---|---|---|
| `'482'` | `48/84` | 482/842/824 |
| `'489'` | `48/84` | 489/849 |
| `'493'` | `49/94` | 493/943 |
| `'495'` | `49/94` | 495/945 |
| `'496'` | `49/94` | 496/946 |
| `'498'` | `49/94` | 498/948 |

→ CONFLICT-030 örnekleri **28 → 34**'e çıktı.

---

## CONFLICT-027 · genişletme (Mf bloğu — s.125, **P1 örneği**)

**Kaynak:** "Erkeklerde **5 testinde 75 T puanı ve üstü**, eğitim düzeyleri orta ya
da lise 1 ise ve oldukça katı kültürel baskı varsa…" (s.125, p70 R)

**Kod:** `mmpiInterpretation.ts:231` → `if (profile.gender === 'Erkek' &&
single('Mf'))` burada `single(id)` = **`t(id) >= 70 && others(id) < 70`**

→ Kaynak eşiği **75 T**, kod eşiği **70 T** → kod, kaynağın **"sadece Mf
yükselmesi"** örüntüsünü **5 puan erken** tetikliyor. Aynı örüntü `SINGLE_MF_MALE`
metninde kaynağın **75** sayısı **doğru aktarılmış**, ama **tespit kuralı**
metinle uyuşmuyor (metin 75 der, kod 70 uygular).

Not: `single()` Hs/D/Hy/Pa/Pt için de kullanılıyor (hepsi 70) — bu bloklarda
kaynak eşiği henüz doğrulanmadı; **Mf'de doğrulandı ve sapma kanıtlandı**.

→ CONFLICT-027 örnekleri **32 → 33**.

## CONFLICT-024 · genişletme (Mf bloğu — s.125-126)

| # | Kaynak başlığı | Sayfa | Durum |
|---|---|---|---|
| 1 | **`564/654`** | s.125-126 | **YOK** ❌ (`'564'` → `56/65` döndürüyor) |

→ Kod seti toplamı: **36 VAR / 71 YOK.**

## CONFLICT-030 · genişletme (Mf bloğu)

| Çağrı | Dönen | Beklenen |
|---|---|---|
| `'564'` | `56/65` | 564/654 |

→ CONFLICT-030 örnekleri **34 → 35**.

---

## CONFLICT-026 · genişletme (Pa bloğu — s.127-129) — **kontrollü liste katmanı**

Hs ve D bloklarında olduğu gibi, Pa'da da kaynağın **T eşiğine bağlı kontrol
listeleri** kodda **yok**:

| # | Kaynak listesi | T eşiği | Madde sayısı | Kod |
|---|---|---|---|---|
| 1 | "Pa alt testinde **yüksek** puan alan bir birey (Graham 1987)" | — | 8 | **YOK** ❌ |
| 2 | "Pa alt testinde **orta düzeyde yüksek** puan alan birey" | **T: 65-70** | 6+ | **YOK** ❌ |
| 3 | "Pa alt testinde **düşük** puan alan bir birey" | **T: 35-45** | 13 + 5 | **YOK** ❌ |
| 4 | "Pa alt testinde **aşırı derecede düşük** puan alan bir birey" | **T<35** | 5 + 12 | **YOK** ❌ |

**Ek sorun:** 3 ve 4 numaralı listeler **T: 35-45** ve **T<35** eşiklerini
kullanır; kodun en düşük Pa bandı **T 27-44**'tür → kod bu alt ayrımı **hiçbir
şekilde üretemez** (band aralığı iki kaynak eşiğini de kapsıyor ve ayırmıyor).

→ CONFLICT-026 örnekleri genişledi (Hs 5 madde + D 18 madde → **+4 Pa listesi**).

---

## CONFLICT-024 · genişletme (Mf bloğu II — s.126)

| # | Kaynak başlığı | Sayfa | Durum |
|---|---|---|---|
| 1 | `58/85` | s.126 | **VAR** ✅ |
| 2 | `59/95` | s.126 | **VAR** ✅ |
| 3 | `50/05` | s.126 | **VAR** ✅ |

→ **Mf bloğu tam kapandı (s.121-126): 9 VAR / 1 YOK.** Kod seti toplamı
değişmedi: **36 VAR / 71 YOK.**


---

## CONFLICT-036 — Pa bloğu `64/46` gövdesi kodda yok; yanlış blok metni dönüyor (P1, ✅ **FIXED** — CHANGE-014)
> **→ CHANGE-014 (2026-09-22 · DECISION-029/A):** `Pa:46` blok-yerel kaydı açıldı; s.130-131 gövdesi **birebir** (kitabın "düşmancıdır" yazımı dâhil) + `462/642 · 463/643 · 468/648` çapraz referansları `seeAlso`da. `46` sorgusu Pd `46/64` gövdesinde kaldı (çapraz bulaşma yok).


Area: `src/scoring/mmpiSourceCodes.ts` — `CODES['46']`

**Source (Visual: CONFIRMED, s.130-131):** Pa bloğundaki `64/46 Kodu` der ki:
> "Bu koddaki bireyler **immatur, narsisistik, pasif-bağımlı** kişilerdir. Sosyal
> ilişki kurulması zordur… **64/46 kodunun yanında 8 alt testi de yükselmişse
> süreç daha kötü olur.** … Öfkeyle doludurlar ve bu da onların eleştiriye
> duyarlılık ve kıskançlıkları ile birleştiğinde tahmin edilemeyen ve mantıksız
> öfke patlamalarına yol açar."

**Current implementation:** `codeInterpretation('64')` → `canonicalCode('64')` →
`'46'` → Pd bloğunun `46/64` kaydı:
> "Temel özellikler kızgınlık, küskünlük, güvensizlik, somurtkanlık…"

**Kanıt:** 45 kaydın tamamı tarandı; kaynağın Pa bloğu `64/46` metnindeki
"immatur", "narsisistik, pasif-bağımlı" ifadeleri **hiçbir kayıtta geçmiyor**.

Comparison: **MISSING** (Pa bloğu gövdesi) + **CONFLICT-031** (blok-bazlı ayrım
yok: Pd `46/64` metni Pa `64/46` çağrısına dönüyor).

Impact: **P1** — yorum katmanı. `96`/`64`/`46` kodları klinik olarak farklı
örüntülerdir (biri paranoid/pa, diğeri pasif-agresif/pd ağırlıklı).

Status: **OPEN** — CONFLICT-024/031 ile birlikte tek tasarım kararı bekliyor
(blok-farkında `CODES` yapısı).

---

## CONFLICT-027 genişlemesi — Pa bloğu sayısal kuralları (batch 16)

Kaynaktan çıkan ve kodda karşılığı olmayan **3 yeni sayısal tarama kuralı**:

| # | Kaynak kuralı | Sayfa | Kodda |
|---|---|---|---|
| 1 | **Paranoid vadi:** "6 ve 8 alt testleri **70 T puanı civarında**dır ve **7 alt testi 10 T puanı aşağıda**dır" | s.132 | YOK |
| 2 | `698/968 → 68/86` geçişi: "**8 alt testi, 6'dan 5 T puanı aşağıda** ise" | s.134 | YOK |
| 3 | **456 örüntüsü:** "4 ve 6 alt testleri T puanı olarak **65'in üzerinde**, 5 alt testi T puanı olarak **35'tedir**" | s.134 | YOK |

Ayrıca Şekil 21 (**Scarlett O'Hara vadisi**: `Pd ↑ · Mf ↓ · Pa ↑`) CONFLICT-033
kapsamına eklendi — tanımlı bir konfigürasyon, kodda hiç yok.


---

## CONFLICT-037 — Pt normu: s.138 metni (29.90) ↔ Tablo 30 (29.20) — **REJECTED**

Area: `TURKISH_NORMS.Pt` (kadın)

**Source A** (s.138, metin): "Erkeklerde ortalama: **27.90**, kadınlarda
ortalama: **29.90** (Savaşır, 1981)" — *Visual: CONFIRMED*

**Source B** (Tablo 30, s.257-260, kitabın norm tablosu): Pt kadın = **29.20**
(sd 6.59) — bu değer **26/26 MATCH** olarak doğrulanmıştır (PHASE 6).

**Current implementation:** `TURKISH_NORMS.Kadın.Pt = 29.2` → **Tablo 30 ile uyumlu**

**Değerlendirme:** s.138'deki değer **Savaşır (1981)** atıflı ayrı bir çalışmadan
anılmaktadır (`SECONDARY-SOURCE` atıf); kitabın kendi normatif tablosu Tablo 30'dur
ve kod onu izler. İki değer farklı kaynaklara aittir → **kaynak içi çelişki değil,
atıf farkı**.

Resolution: **REJECTED (kod doğru).** Kod Tablo 30'u izlemeye devam eder. Fark,
gelecekteki bir değişiklikte yanlışlıkla "düzeltme" yapılmaması için belgelendi.

---

## CONFLICT-038 — Sc 21-44 bandında "konformaldir" ↔ kod "konservatiftir" — **FIXED**

Area: `src/scoring/mmpiSource.ts` — `SC_T_BANDS` (T 21-44)

**Source (Visual: CONFIRMED, s.146, 400 dpi kadraj `b18_lowband.png`):**
> "21-44 T puanı: Pratik ve gelenekseldirler, davranışları ve yaşama bakış
> **açıları konformaldir.** Genellikle bireyler uyumlu, sorumlu, bağımlı ve
> temkinlidir, ancak hayal güçleri yoktur ve oldukça katıdırlar. İlişkilerinde
> çekingen, derin duygusal ilişkilerden kaçınan, temkinli, tutucu, rekabet etmek
> istemeyen kişilerdir."

**Current implementation (denetim öncesi):** "…davranışları ve yaşama
bakışları **konservatiftir**." — hem "açıları" düşmüş hem terim değiştirilmiş.

**Neden çelişki:** "konformal" (grup normalarına uyma) ile "konservatif"
(gelenekçi değer yönü) ayrı kavramlardır; cümlenin devamı zaten "temkinli,
**tutucu**" diyerek muhafazakârlığı ayrıca sayıyor → kod, kaynağın iki ayrı
özelliğini tek kelimeye indirgiyor ve ikincisini iki kez yazıyor. DECISION-027
kuralı: **yanlış bilgi bekletilmez**, eksik içerik bekletilir.

Resolution: **FIXED** — DECISION-028 → **CHANGE-013** (tek cümle, kaynak terimi
+ "açıları"). Regresyon kilidi: `tests/mmpiKeyIntegrity.test.ts` → batch 18
describe bloğu (terim var / "konservatif" yok / gövde uyumu).
Etki alanı: yalnız Sc düşük-puan bandı metni; sayısal eşik ve bant sınırları
değişmedi (100+ / 75+ / 60-74 / 45-59 / 21-44 → 5/5 MATCH).

---

## Batch 18 genişlemeleri — mevcut CONFLICT kayıtlarına işlenen yeni örnekler

### CONFLICT-024 (P1, OPEN) — Sc/Pt başlıkları
Üç yeni kaynak gövdesi kodda yok: **`794`** (s.142), **`87/78`** Sc-blok gövdesi
(s.146), **`8726/Yüksek 9`** (s.146). Kümülatif kapsam: **140 başlık → 100 VAR / 42 YOK**
(batch 18: 10 başlık → 7 VAR / 3 YOK).

### CONFLICT-025 (P2, OPEN) — koşullu/ek cümle eksikliği
`70/07` kaydında **üç kesim** yok: (1) "2 ve 8 alt testleri, en sık görülen üçüncü
yüksekliktir." (2) "bu sözelleştirmeyi de engeller" (3) kadınlara ilişkin kapanış
cümleleri ("Bunlar yoksa … farkındadırlar. Fiziksel görünüm olarak çekici
olmadıklarını … sorunları vardır.").

### CONFLICT-026 (P3, OPEN) — kaynak listeleri kodda yok
Sc **Graham 1987 yüksek-puan listesi 38 satır** (s.143-144) ve **düşük-puan listesi
9 satır** (s.144-145) kodda hiçbir yapıda temsil edilmiyor. Listelerin başlığındaki
"(T: 80-100)" bandın değil listenin etiketidir → kod bant setiyle çelişmez.

### CONFLICT-027 (P1, OPEN) — T-eşiklerinin tespit edilmemesi (+2 örnek → 38)
| Kaynak kuralı | Sayfa | Kodda |
|---|---|---|
| `70/07`: "Kadınlarda eğer **5 alt testi 40 T puanının altında** ise aynı örüntü vardır" | s.142 | metin VAR · koşul YOK |
| `86/68`: "6 ve 8'in T puanı 80'in üstünde, **7 de 70 T puanındadır**" | s.146 | eşik "7 daha düşük"e indirgenmiş |

### CONFLICT-030 (P1, OPEN) — çok ölçekli kod kırpması (+2 örnek)
`'794'` → `canonical('79')` → **`79/97`** (Pt bloğu) metnini döndürüyor;
`'8726'` → `slice(0,2)='87'` → `78` → **`78/87`** (Pt bloğu) metnini döndürüyor.
Her iki çağrıda da kullanıcının gördüğü metin, kaynağın o kod için yazdığı gövde
değildir.

### CONFLICT-031 (P1, OPEN) — blok-bazlı yorum ayrımı (+1 örnek)
`87/78` Sc bloğunda "Endişeli, kendi kendini tetkik edebilen…" der; Pt bloğunda
`78/87` "Psikolojik yardım arayan kişilerde oldukça sık görülür…" der. Kod tek
kayıt tuttuğu için Sc bloğunun `87/78` çağrısı **Pt metnini** döndürür.
(Batch 16'daki `64/46` örneğinin ikinci tekrarı; tasarım kararı CONFLICT-024/030
ile birlikte verilecek.)

### CONFLICT-033 (P1) — kapsam değişmedi
Sc bloğunda (s.143-146) üç-ölçekli konfigürasyon tanımı yok; `8726/Yüksek 9`
dörtlü bir kod tipidir (konfigürasyon değil) → CONFLICT-024/030 altında sayıldı.

**Not (olumlu bulgu):** s.146'daki `81/18`, `82/28`, `83/38`, `84/48`, `85/58`
**beş çapraz referansın tamamı** kaynakta "Bakınız …" biçiminde yazıldığı için
kodun tek-kayıt tasarımı bu beşinde **doğru davranıyor** — bu başlıklar için
CONFLICT-024/031 **iddia edilmez** (kayıt: SOURCE-SC-005).

---

## Batch 19 genişlemeleri — Sc bloğu kapanışı + Ma girişi (s.147-150)

**Kod değişikliği YOK** — bulunanların tamamı **"eksik içerik"** sınıfında;
DECISION-027 kuralı gereği CONFLICT-024/025/026/027/030/031/033 ile birlikte
**tek tasarım kararını** bekliyor. P0 katmanı (Tablo 16) temiz çıktı.

### CONFLICT-024 (P1, OPEN) — kümülatif kapsam güncellendi
**142 başlık → 102 VAR / 42 YOK.** Sc bloğu **kapandı** (10 başlık → 8 VAR / 2 YOK):
eksik gövdeler `789`·`794` (Pt) + `87/78`·`8726` (Sc). Ma girişi yeni başlık
içermiyor (s.149-150 yalnız giriş + Tablo 16 + listeler).

### CONFLICT-025 (P2, OPEN) — +2 kesim
- `89/98`: "**Yaşı 27'den küçük olanlarda görülür, üçüncü yükselen alt test 4, 7 ya da 6'dır.**"
- `80/08`: "Bu kod tipindeki **7 ve 2 alt testleri en yüksek üçüncü testtir.**"

### CONFLICT-026 (P3, OPEN) — +2 liste (Ma)
Ma **Graham 1987 yüksek puan 42 satır** (s.149-150) ve **düşük puan listesi**
(s.150-151) kodda hiçbir yapıda yok. Sc için de aynı durum batch 18'de
kaydedilmişti (38 + 9 satır).

### CONFLICT-027 (P1, OPEN) — sayısal koşul sayısı **38 → 40**
| Kaynak kuralı | Sayfa | Kodda |
|---|---|---|
| `89/98`: "**üçüncü yükselen alt test 4, 7 ya da 6**" + **yaş < 27** | s.148 | cümle yok → koşul yok |
| `80/08`: "**7 ve 2 alt testleri en yüksek üçüncü testtir**" | s.148 | cümle yok → koşul yok |

### CONFLICT-033 (P1, OPEN) — kapsam **5 → 6 konfigürasyon**
**Şekil 22 "Paranoid Vadi"** (Pa↑ · **Pt↓ vadi dibi** · Sc↑; ızgara 30/50/70/90)
kaynakta tanımlı **üç-ölçekli bir örüntü**; kodda hiç yok. Kaynak ayrıca örüntünün
**"hepsini doğru yanıtlama" (all-true) biçiminde de çıkabileceğini** söylüyor →
uygulansa bile **konfigürasyon 7 ile ayrıştırma** gerekir (CONFLICT-019'un
`F>120`/kırpma hikâyesinin yorum tarafı).

### CONFLICT-034 (P2, OPEN) — +1 yaş direktifi
`89/98` kaydında "Yaşı 27'den küçük olanlarda görülür" **yaş koşulu** var; kodun
`CodeInterpretation` modelinde yaş/eğitim/cinsiyet alanı yok (s.112'deki genel
direktifle aynı kök).

### Not · doğrulanan iki olumlu bulgu (çelişki DEĞİL)
1. **`89/98` ve `80/08` gövdeleri sadık**: 8/10 ve 7/8 kaynak parçası kodda
   bulunuyor; kalan farklar yalnız yukarıdaki eksik cümleler. `Olası Tanı`
   satırları `diagnosis` alanında doğru taşınıyor ("Şizofreni · Madde
   kullanımına bağlı psikoz" / "Şizoid Kişilik").
2. **`60-69` vb. büyük/küçük harf tuzağı**: kod cümleleri noktalı virgülle
   birleştirdiği için kaynak cümlesinin büyük harfle başlayan biçimi
   (`"Danışmanlık görüşmelerinde…"`) aranamaz — **karşılaştırma duyarsız
   yapılmalı** (`cmp-ma-batch19.ts` `toLowerCase()`; aksi halde sahte FINDING
   üretiliyordu, batch sırasında düzeltildi).

---

# BATCH 20 genişletmeleri (kitap s.151-156 · Ma kapanışı + Si girişi + Tablo 17)

## CONFLICT-036 · 2. SOMUT VAKA — Ma bloğu `91/19` gövdesi kodda yok (P1, ✅ **FIXED** — CHANGE-014)
> **→ CHANGE-014 (2026-09-22 · DECISION-029/A):** `Ma:19` ayrık kaydı açıldı (s.153); kanonik `'19'` sorgusu **etkilenmedi** (s.77 Hs gövdesini vermeye devam ediyor) — iki gövde artık çarpışmıyor.


Pa `64/46` vakasında görülen kusurun **ikinci ve daha saf örneği**: `91/19`
(kitap s.153) iki-ölçekli bir koddur; `slice(0,2)`/3+ ölçek kırpmasına gerek
kalmadan, **yalnızca kanonik sıralama** ("91" → `'19'`) yüzünden gövde kayboluyor.

| Çağrı | Dönen kayıt | Kaynakta doğru olan |
|---|---|---|
| `codeInterpretation('91')` | `19/91` — **s.77** Hs bloğu gövdesi ("Hastalar gergin ve kaygılı olarak tanımlanır… Sindirim sorunları…") | **s.153** Ma bloğu: "Ender görülmektedir. Hastalar hipomanik durumdadırlar, ancak gergindirler ve yerlerinde duramazlar…" (5/5 cümle **YOK**) |

**Kusurun kaynağı modelde:** `CODES` tek bir `Record<kanonik-anahtar>` olduğu için
**aynı rakam çiftinin blok-bazlı ikinci anlatımı sığmıyor.** Kitap ikisini açıkça
ayrı tutuyor — başlık: "**91/19 Kodu (Ayrıca 19/91 Koduna da Bakınız)**".
Bu, CONFLICT-031'in (blok-bazlı yorum modeli) **en doğrudan kanıtıdır**: daha önce
yalnız 3+ haneli kodlarda (`789`, `794`, `8726`) görülüyordu; artık **2 haneli**
kodda da var.
**Kod değişikliği YOK** (içerik eksiği; DECISION-028 → bekletilir, toplu karar).

---

## CONFLICT-039 (P2 · OPEN) — "X alt testinin diğer alt testlerle ilişkisi" bölümü ve **K-ilişkili örüntüler** modelde temsil edilemiyor
> **→ CHANGE-014 (2026-09-22 · DECISION-029/A):** `Si (s.157)` satırındaki `049` / `027(8)` **gövde** kısmı CHANGE-014 ile kapandı. `Yüksek 9/Yüksek K` ve `Yüksek 9/Düşük K` gövdeleri ile "ilişki" bölümlerinin örüntü katmanı **hâlâ YOK** (gövde metinleri okunmuş değil / s.153 devamı ve PHASE 10 bekliyor). `conditions.manual` bu bölüm için **taşıcı mekanizmayı** sağladı: K-eşikli notlar koşul olarak kodlanabilir (ör. `49` K > 50).


**Kaynak yapısı (görselden + OCR'dan doğrulandı):** her klinik blok sonu
`… alt testinin diğer alt testlerle ilişkisi:` başlıklı bir bölüm taşıyor:
**Sc (s.146)**, **Ma (s.152)**, **Si (s.157)**. Bu bölümde (a) diğer bloklara
yönelten `Bakınız` çapraz referansları ve (b) **K geçerlilik ölçeğini içeren
örüntüler** var:

| Örüntü (kaynak) | Sayfa | Gövde özeti | Kodda |
|---|---|---|---|
| **Yüksek 9/Yüksek K Kodu** | s.152 | "Eğer 9 ve K alt testlerinde puanlar **70 T puanında** (2 alt testi **T: 50'nin altında ise**) ise… Genellikle çok iyi yöneticidirler…" + "**K alt testi 70 T puanının üzerine çıkarsa**…" + "(eğer **5 alt testinde T:40'ın altında ise**)…" | ❌ YOK |
| **Yüksek 9/Düşük K Kodu** | s.153 | "Narsisistik kişilerdir. Kadınlar, eksibisyonist bir biçimde kendilerini sergileyerek dikkatleri bu şekilde üstlerine çekerler." | ❌ YOK |
| (Sc) **8726/Yüksek 9** | s.146 | "Ajite şizofren bir hastayı göstermektedir." | ❌ YOK (batch 18 kaydı) |
| (Si) `049` ve devamı | s.157+ | batch 21'de okunacak | — |

**Neden `CODES`'a eklenemiyor:** anahtar iki rakamdan oluşuyor
(`canonicalCode(code.slice(0, 2))`); "K" rakam değil, dolayısıyla
`Yüksek 9/Yüksek K` gibi bir örüntü **mevcut tipte (`CodeInterpretation`)
adreslenemiyor**. Ayrıca bu örnekler K düzeltmesinin **yorumla iç içe**
olduğunu gösteriyor (K hem düzeltme katsayısı hem yorum ekseni).
**Aksiyon:** PHASE 9/10 tasarım kararına dâhil (CONFLICT-030/031/036 ile **tek**
karar: kod kimliğinin `blok + sıralı-kod + K` üçlüsüyle modellenmesi gerekebilir).
**Kod değişikliği YOK.**

---

## CONFLICT-025 · +6 cümle (batch 20)

1. **s.152 "ilişki" paragrafı, 5 cümle**: "Yalnızca alt test 9'u kullanarak bir
   yoruma gitmek güçtür." · "Diğer klinik alt testlerdeki yükselmelerle bu enerji
   artışının nedeni araştırılmalıdır." · "Hipomani alt testiyle birlikte alt test
   4'ü yükselen bir hastanın yorumu, alt test 8 ile 9'u birlikte yükseltmiş
   hastadan farklıdır." · "Bunlara ek olarak, beyin hasarı olan bir hasta,
   hiperaktivite ve tepkisel davranışlar gösterebilir." · "Yine bu hastalarda
   duygusal tepkiler depresyon şeklinde ortaya çıkabilir."
2. **s.153**: "Eyleme vuruk davranış ile ilgilidir" (`94/49` satırının altındaki
   tek cümlelik not; `CODES['49']` gövdesinde yok).

## CONFLICT-027 · 40 → **44 örnek** (batch 20)

Kodda tespit edilemeyen **yeni sayısal koşullar** (hepsi s.152 `Yüksek 9/Yüksek K`
gövdesinde): `9 ve K > 70 T` · `2 alt testi < 50 T` · `K > 70 T` · `5 alt testi < 40 T`.

## CONFLICT-026 · +2 (batch 20) — Si (0) Graham listeleri

- "Si alt testinde **yüksek puan** alan bir birey (Graham 1987):" **1-20** (s.155)
- "Si alt testinde **düşük puan** alan bir birey:" **1-14** (s.155-156)
  + s.156'daki düz yorum paragrafları ("Psikiyatrik ve normal populasyon için…",
  "Alt test Si'deki puanlar **yaşla birlikte artar**. Ergenler ve yüksekokul
  öğrencileri genellikle **40 ile 50 T**… yaşlı kişiler **50 ile 60**…") — hiçbiri
  kodda yok. (Yaş/T aralığı ayrıca **CONFLICT-034/027** kapsamında not edildi.)

---

## CONFLICT-040 (YENİ · **REJECTED**) — Si normu: Tablo 17 dipnotu **26.86** ↔ Tablo 30 **23.86**

**Area:** `src/scoring/mmpiKeys.ts` → `TURKISH_NORMS.Erkek.Si.mean = 23.86`
**Kaynak:** Tablo 17 dipnotu (s.156, 560 dpi kadraj `b20_t17_norm2.png`):
"Erkeklerde ortalama:**26.86**, kadınlarda ortalama: 29.88 (Savaşır 1981)."
**Çözüm:** Tablo 30 (s.195) bu oturumda **yeniden okundu** → Si satırı
`1003 · X̄ 23.86 · SD 7.97 / 663 · X̄ 29.88 · SD 7.52` — kod bunu izliyor
(PHASE 6'da 26/26 MATCH ile doğrulanmıştı). Si'de **K düzeltmesi olmadığı için**
dipnot ile Tablo 30'un aynı değeri vermesi beklenir; kadın tarafı aynı (29.88),
erkek tarafı farklı → **kitabın dipnotundaki 26.86 yanlış okuma/baskı** olarak
değerlendirildi.
**Karar: REJECTED — kod Tablo 30'u izler (CONFLICT-001/002/037 emsali).**
**Kadın 29.88 = MATCH ✅.** Test kilidi: `mmpiKeyIntegrity.test.ts`
("Si normları Tablo 30u izler; Tablo 17 dipnotundaki 26.86 kaynak içi çelişkidir").

---

## ✅ Bu turda ÇELİŞKİ ÜRETMEYEN doğrulamalar (batch 20)

1. **🎯 P0 — Tablo 17 (s.156) BİREBİR MATCH**: 34 + 36 = **70** ("Madde Sayısı:
   70" başlığıyla uyumlu) → **PHASE 5 kaynak tarafı TAMAMI kapandı (Tablo 8-17)**.
2. **Ma T bantları** 5/5 bant **tam kapsam** (23/23 kaynak parçası) — tek fark
   Trivial: kod "Kendilik değer**ini**" (kaynak: değerlerini), "aşırı çaba
   **sarf etmek**" (kaynak: göstermek) → anlam kaybı yok.
3. **"60- 75 T" etiketi** kaynak kendi hatası (70-84 ile çakışan aralık); kod bu
   paragrafı 60-69 bandına birleştirerek **içeriği korumuş** → **etiket
   uydurmamış**, çelişki değil.
4. **`90/09`** gövdesi 5/5 sadık; **7 `Bakınız` çapraz referansı** hedef
   kayıtlarda mevcut → UYUMLU (CONFLICT-024 dışı).
5. **`K_CORRECTION`'da `Si` yok** ↔ Tablo 17'de "(K Eklemeli)" yok ✅.

---

## CONFLICT-024/025/027/030/031/033/039 · genişletme (batch 21 — Si (0) KAPANIŞI, s.157-158)

**🏁 MİLESTONE: Bölüm 5 (kod tipleri) kaynak taraması BİTTİ — s.63-157** (s.158 boş
sayfa, `SOURCE-SI-003`). Bundan sonra 024 ailesine **yeni sayfa gelmez**; birikmiş
bulguların **tek tasarım kararı** artık kanıt eksikliği olmadan verilebilir.

| Conflict | Bu turdaki fark | Kanıt |
|---|---|---|
| **024** | **+2 YOK başlık** → `049 Kodu`, `027(8) Kodu` (ikisinin de gövdesi CODES'ta yok) | `cmp-si-batch21.ts (3)(4)` |
| **025** | **+5 cümle**: Si `70+` bandı kuyruğu 2 ("Nevrotik üçlüde yükselme görülebilir" + "Ayrıca bakınız, 2, 7 ve 8…") · s.156-157 süzülen giriş paragrafı 3 (20 puan farkı · Si+4+9 → eyleme vurukluk · 2/7+8 → ruminatif) | `cmp-si-batch21.ts (1c)(5)` |
| **027** | **+1 sayısal koşul → 45**: "Alt test Si'de **20 puanlık bir farklılık** olan çiftlerin… evlilik çatışmalarına düşmeleri olasıdır" — kod hiçbir sayısal fark testi yapmıyor | `SOURCE-SI-002` |
| **030** | **+2 SOMUT VAKA (en güçlüsü)**: `codeInterpretation('049')` → **`40/04` metni** · `codeInterpretation('027(8)')` → **`20/02` metni** — kırpma burada **alakasız bir bloğun** yorumunu döndürüyor; üstelik `027(8)` **parantezli notasyon** taşıdığı için iki-haneli modelde **hiç adreslenemiyor** | `cmp-si-batch21.ts (3)(4)` + `mmpiSourceCodes.ts:305` |
| **031** | **+2**: Si bloğunun blok-yerel kodları (`049`, `027(8)`) — aynı `04`/`02` rakam çifti başka blokta **başka** anlama geliyor | `SOURCE-SI-002` |
| **033** | **+3 örüntü → 9**: Si 70+ bandındaki **"Nevrotik üçlüde yükselme"** atfı · **Si↑ + 4↑ + 9↑** · **Si↑ + (2 veya 7)↑ + 8↑** — üçü de çok-ölçekli, kodda tek-ölçek bant var | `cmp-si-batch21.ts (1c)(5)` |
| **039** | **+0 (yapı teyidi)**: "Si alt testinin diğer alt testlerle ilişkisi:" bölümünün **üçüncü örneği** (Sc s.146 · Ma s.152 · **Si s.157**) — Si'de **K-örüntüsü yok**, yalnız 9 Bakınız çifti | `SOURCE-SI-002` |

**✅ Bu turda ÇELİŞKİ ÜRETMEYEN bulgular:**
- **9/9 Bakınız hedefi mevcut ve etiketler birebir** (`10/01`, `20/02`, `30/03`,
  `40/04`, `50/05`, `60/06`, `70/07`, `80/08`, `90/09`) → çapraz referanslar **UYUMLU**
- Si `60-69`, `45-59`, `25-44` bandı **birebir** (kod, `;`/`.` yazım farkları hariç)
- Kodun `25-44` bandını `min: 0`'a genişletmesi → **BİLGİ** (etiket korunuyor)
- Kaynak yazım hatası "bireylerdir**..**" → kod tek noktaya indirmiş → **kusur değil**

**Karar kapısı (yeni):** Bölüm 5 seti kapandı → `DECISION-029` adayı: **kod kimliği =
blok + sıralı kod + K/parantez varyantı** (024/030/031/039 tek çatı), `conditions[]`
(027/025: 45 sayısal koşul) ve `patterns[]` (033: 9 örüntü) eklenmesi. **Kullanıcı
onayı olmadan `src/` değişmez** (DECISION-027/028); bu turda da **kod değişikliği YOK**.

---

## CONFLICT-041 (P1 · **FIXED** — CHANGE-015 · DECISION-030/A) — BÖLÜM 6’nın 10 profil örüntüsü: 2 eşik sapması + 7 desen yoktu

> **KAPANDI (2026-09-22):** kullanıcı onayı “A’dan devam et” → **DECISION-030 = A**.
> `conversion-v` **65/5 → 70/10** · `psychotic-v` **70/70 → 80/80/70** · #4-#10’dan
> **6 desen + `negatif-egim` (manual)** eklendi → **kayıt sayısı 11 → 18**.
> Kapanış kanıtı: `scripts/mmpi-audit/cmp-b6-batch23.ts` → **SONUÇ: 0 FARK**
> (eski `cmp-b6-batch22.ts` 9 FARK diyordu; (4)/(5) bölümleri **CHANGE-015 öncesi
> yokluk** iddiasını ölçtüğü için artık historical — ayrıntı `TEST_AUDIT.md`).
> Aşağıdaki tablo **bulgu anının** kaydıdır, silinmedi.


Area: `src/scoring/mmpiInterpretation.ts` — `detectPatterns()` / `detectSingleElevations()`

Source: **`SOURCE-B6-001`** · kitap s.160-169 · Şekil 23-32 · **150 dpi tam sayfa görsel
okuması** (`.audit/pages/p088_L.png` … `p092_R.png`)

**Sayım: 10 desenden 1’i birebir · 2’si eşik sapması · 7’si YOK.**

| # | Desen | Kaynak eşiği (birebir) | Kod | Sınıf |
|---|---|---|---|---|
| 1 | Konversiyon V | Hs ve Hy **≥ 70 T**; Hs ve Hy, **D’den ≥ 10 T** yüksek | `conversion-v`: Hs,Hy **≥ 65**, fark **≥ 5** | ⚠️ eşik sapması |
| 2 | Paranoid V | **Pa ve Sc 80 T**, **Pt 70 T** | `psychotic-v`: Pa,Sc **≥ 70** ∧ min > Pt | ⚠️ eşik sapması |
| 3 | Pd Yükselliği | Pd **> 70 T** ∧ bütün alt testlerden **≥ 10 T** yüksek | `SINGLE_PD`: `Pd ≥ 70 ∧ Pd − max(öteki klinik) ≥ 10` | ✅ **BİREBİR** |
| 4 | Kuş Kanadı | Hs,D,Hy,Pd **≥ 70 T** ∧ kadınlarda **Mf = 50 T** ∧ psikotiklerde yükselme | — | ❌ YOK |
| 5 | Pasif-Agresif V (Kadın) | **4 ve 6 ≥ 70 T** ∧ **Mf < 50 T** | — | ❌ YOK |
| 6 | Psikotik (pozitif) eğim | psikotik testler **> 70 T** ∧ nevrotik testler **< 70 T** | — | ❌ YOK |
| 7 | Nevrotik (negatif) eğim | nevrotik taraf yüksek ∧ psikotiklerde “**belirgin düşüklük**” | — | ❌ YOK (**nicel eşik kaynakta yok**) |
| 8 | “Yüzen” Profil | **Hs→Ma TAMAMI > 70 T** ∧ **F↑**; “borderline’a özgü”; **“kod tipi verilemez”** | `multi-high`: 3+ ölçek **≥ 65** | ❌ YOK (kodunki başka kural) |
| 9 | Batık Profil | profil **45-54 T**; “anlamı yoktur, **en düşük** alt testlere bakılmalı” | — | ❌ YOK |
| 10 | Sınır Profil | T **60-70** ∧ klinik **> 54 T** ∧ geçerlikte **kısmi** yükselme | — | ❌ YOK |

**Impact (neden P1):** #1 ve #2 **mevcut arayüzde kullanıcıya “desen var” diye gösteriliyor**.
Kod eşiği daha düşük olduğundan **kaynağın desen saymayacağı profiller** desen üretiyor
(yanlış pozitif). Örnek: Hs 66.7 / Hy 66.3 / D 59.2 → kodda “Konversiyon Vadisi” vuruyor;
kitapta vurması için Hs ve Hy’nin **en az 70 T** ve D’den **≥ 10 T** yüksek olması gerekiyor.
Örnek #2: Pa 74.5 / Sc 74.5 → kodda “Paranoid Vadi / Psikotik V” vuruyor; kaynak **80 T** der.

**Kök neden:** bu iki eşiğin kaynağı BÖLÜM 5’teki **nicel-olmayan** tanım (s.103, Şekil 17:
“Hs ve Hy yükselmiş, D düşmüştür” — **sayı yok**). Kitabın **tek sayısal** tanımı BÖLÜM 6’da
(s.160-161). Yani kod bir şeyi yanlış okumadı; **kaynakta olmayan bir sayıyı sabitlemiş** oldu
— sonuç yine de kullanıcı için yanlış bir klinik etiket. **CHANGE-014’ün `source` alanı
bu boşluğu görünür kıldı.**

**Çözüm biçimi:** **DECISION-030** (kod değişikliği onayı bekleniyor). #7 için kaynakta sayısal
eşik olmadığından yalnız **metin/`manual`** taşınabilir — sayı uydurulmaz (DECISION-028).

**Kanıt betiği:** `scripts/mmpi-audit/cmp-b6-batch22.ts` → **SONUÇ: 9 FARK**
(2 eşik sapması + 7 eksik desen; #3 `SINGLE_PD` birebir) + 7 çekince maddesi YOK;
**P0 bulgu yok**. Aday profillerin kaynağın tanımını gerçekten karşıladığı betikte
T-değerleriyle basılıyor (Kuş Kanadı Hs=71 D=72 Hy=71 Pd=73 Mf=47 · Pasif-Agresif V
Pd=73 Pa=74 Mf=42 · pozitif eğim Pa=75 Pt=77 Sc=83 Ma=73 / nevrotik taraf 49-51 ·
Yüzen Hs→Ma 72-84 · Batık 47-52 · Sınır 58-62).

**Test kilidi:** `tests/mmpiInterpretation.test.ts` → “PHASE 10 batch 22” describe’ı: #1/#2
sapmaları `rule` dizesi equality ile, #3 davranışla (1 pozitif + 2 negatif vaka), #4-#10
yokluğu kimlik listesiyle kilitli; desen eklenirse test **bilinçli kırılır**.

---

## CONFLICT-042 (P2 · **FIXED** — CHANGE-015 · DECISION-030/A) — BÖLÜM 6’nın uyarı/kapsam direktifleri arayüzde yoktu

> **KAPANDI (2026-09-22):** 8 direktif `MMPI_PATTERN_CAVEATS` (birebir kaynak
> cümleleri + sayfa numarası) olarak `mmpiInterpretation.ts`'a, desen düzeyinde
> çekinceler `PatternHit.caveat` alanına alındı; `MMPIExtraTab` **“Yorum Çekinceleri
> (BÖLÜM 6)”** kutusunu ve desen kartlarında “Kaynak çekincesi” satırını basıyor.
> Kanıt: `cmp-b6-batch23.ts` (5) bölümü 8/8 “taşındı” · test `BÖLÜM 6 çekinceleri …`
> (batch 22’de aynı kilit `doesNotMatch` ile **yokluğu** doğruluyordu — yön çevrildi).


Area: `src/components/results/MMPIExtraTab.tsx` · `MMPICodeTab.tsx` · `mmpiInterpretation.ts`

Source: **`SOURCE-B6-002`** · kitap s.159-160, s.166, s.167, s.168, s.169

Kaynak örüntüleri sayarken **sürekli çekince** bildiriyor; hiçbiri koda taşınmadı:
1. **s.166:** “Sadece bu tür yükselmelerle testi alan kişiye **nevrotik ya da psikotik tanısının
   konulması doğru değildir**.” → desen kartlarında böyle bir çekince yok.
2. **s.167:** “Bu profil tipiyle bağlantılı **bir kod tipi verilemez**.” → çoklu yükselmede de
   arayüz iki-haneli kod yorumunu göstermeye devam ediyor.
3. **s.168 (Batık):** “Tek başına bu tür bir yükselmenin **anlamı yoktur**… **en düşük** olduğu
   alt testlere bakmak gerekmektedir.”
4. **s.159:** “**Hiçbir zaman körlemesine bir değerlendirme yapılmamalıdır**” + demografi listesi
   (→ **CONFLICT-034** ile aynı kanal).
5. **s.160:** “**Yükselmenin hepsi 70 T puanına yakın ya da bunun üstündedir**… ikili ve üçlü
   kodları belirlemede **hastadan alınan bilgi ve testi veren kişinin deneyimi** önemlidir.”
   → `codeInterpretationForProfile()` bunu anmıyor.
6. **s.169:** “Eğer klinik testler **60-64 T** arasında ise **MMPI’dan geliştirilen diğer testler**
   bireyi değerlendirmede daha yararlı olabilir (Butcher 1984).” → `MMPIDerived` **var**,
   gerekçe metni **yok** (BİLGİ).

**Impact:** **P2** — sayısal hata değil; **aşırı güven üreten sunum** riski. Çözüm kanalı
DECISION-030’un (C) şıkkında (desen kartlarına kaynak `source` + “tanı yerine geçmez” notu).

---

## CONFLICT-043 (P2 · **FIXED**) — `cry-for-help`: ilişki kaynakta, eşik kodda; kaynak bandı “80 ve üstü T puanı”

Area: `src/scoring/mmpiInterpretation.ts` → `detectPatterns()` · `cry-for-help` (desen kartı)

Source: kitap **s.36** (PDF p26 L) — “F alt testi yükselme nedenleri” listesinin **4. maddesi**
→ `SOURCE-VALIDITY-F-006` (batch 24’te, 150 dpi tam sayfa + 225 dpi kadrajla açıldı) ·
bant başlığı: “**80 ve üstü T puanı:** F alt testi 90 T puanını aşarsa bu profil dikkatli
değerlendirilmelidir.” · komşu bant: s.37 → `SOURCE-VALIDITY-F-005` (“80 T ve üstü — dikkatli
değerlendirme; 5 yükselme nedeni sıralanır”).

Source value: “Yardım çağrısı profili. **2 ve 7 testleri 6, 8 ve 9 testlerinden yüksektir.**”
— kaynak **sayısal eşik vermiyor**; bağlam **80 T üstü** bandı (+ “90 T’yi aşarsa dikkatli”).

Current implementation: `hit: F >= 70 && D > Pa && D > Sc && D > Ma && Pt > Pa && Pt > Sc && Pt > Ma`

Comparison: **MATCH (bağlam açıklandı)** — ilişkisel koşul birebir ve CHANGE-016 ile karta taşındı
(`source` + `quote`) ✅; DECISION-032 (B) kullanıcı onayıyla `F ≥ 70` otomatik eşiği korundu;
80 T bant başlığı kaynak bağlamı olarak `manualNote` alanında ve test kilitlerinde açıklandı.

Impact: **P2** — DECISION-028 (sayı üretmeme) ve DECISION-032 (B) gereği, 80 T bir otomatik
kesim noktası olarak zorlanmamış, kaynak bağlamı olarak belgelenmiştir.

Status: **FIXED** (2026-09-22, DECISION-032 = B onayı) · kapanış kanıtı: `scripts/mmpi-audit/cmp-b6-batch24.ts`
· test kilidi: `tests/mmpiInterpretation.test.ts` (`DECISION-032 (B): F ≥ 70 otomatik eşiği korundu`).
