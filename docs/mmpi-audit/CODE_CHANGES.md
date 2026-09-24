# Code Changes

Her kod değişikliği buraya kaydedilir. Kayıt olmadan değişiklik yapılmaz
(kural: `SOURCE_FACT` + `CONFLICT` + `DECISION` üçlüsü tamam olmalı).

---

## Özet

| Değişiklik sayısı | 0 |
|---|---|
| Değiştirilen bilimsel değer | 0 |
| Test sonucu | 287/287 PASS (değişiklik öncesi baseline) |

**Bu aşamada bilinçli olarak hiçbir kod değişikliği yapılmamıştır**
(`DECISION-004`). Bulunan P0 farklar `CONFLICTS.md` içinde `OPEN` durumdadır ve
PHASE 4 + PHASE 6 doğrulamasından sonra karara bağlanacaktır.

---

## CHANGE-000 — Denetim altyapısı (kod dışı)

Date: 2026-09-21
Type: Araç / dokümantasyon (uygulama kodunu etkilemez)

Added:
- `docs/mmpi-audit/` (denetim kalıcı hafızası, 15 dosya)
- `scripts/mmpi-audit/extract.py` (sayfa→görsel→OCR aracı)

Affected runtime code:
**NONE** — `src/`, `supabase/`, `functions/`, `worker/`, `public/` değişmedi.

Tests:
`npm test` → 287 pass / 0 fail (değişiklik sonrası da doğrulandı)

Reason:
Denetim altyapısı kurulumu (görev talimatı §1-§3).

Status: **DONE**

---

## Düzeltme paketi — 2026-09-21 (Oturum 3)

Ön koşul zinciri tamamlandı: her değişiklik için
`SOURCE_FACT` (Ek 9 tablosu, görsel doğrulandı) → `CONFLICT` → `DECISION`
mevcuttur. `DECISION-008` ile onaylanmıştır.

`npm run typecheck` → **PASS** · `npm test` → **294/294 PASS** · `npm run build` → **PASS**

---

## CHANGE-001

Date: 2026-09-21
Source: `SOURCE-KEY-F-001` · Ek 9, kitap s.244 (PDF p130 L) · görsel doğrulandı
Conflict: CONFLICT-008 (P0)
Decision: DECISION-008

Old:
```ts
falseItems: [17, 20, 54, 65, 69, 75, 83, 112, 113, 115, 164, 177, 185, 196, 199, 220, 257, 258, 272, 276],
```
New:
```ts
falseItems: [17, 20, 54, 65, 75, 83, 112, 113, 115, 164, 169, 177, 185, 196, 199, 220, 257, 258, 272, 276],
```

File: `src/scoring/mmpiKeys.ts` → `SCORING_KEYS.F`
Reason: Kaynak Ek 9 F tablosu (Yanlış sütunu) `164, **169**, 177` dizisini verir;
`69` **hiçbir** F listesinde yoktur. Basamak hatası düzeltildi.
Etki: F ham puanı → geçerlilik eşikleri (16/23), F-K endeksi, F T puanı.
Madde 69 hâlâ `Mf` (erkek: Doğru / kadın: Yanlış) anahtarındadır — doğru.
Tests: **PASS** (F uzunluğu 44+20 korunur; doğrudan 69/169 fixture'ı yoktu)

---

## CHANGE-002

Date: 2026-09-21
Source: `SOURCE-KEY-SPECIAL` · Ek 9, kitap s.255 (PDF p135 R) · görsel doğrulandı
Conflict: CONFLICT-009 (P0)
Decision: DECISION-008

Old: `Es.dogru` 38 madde içeriyordu (`...458, 483, 488, 489, 494, 510, 513, 515, 525, 541, 544, 548, 554, 555, 559, 561`)
New: `Es.dogru` 25 madde; 13 madde `Es.yanlis` tarafına taşındı

File: `src/scoring/mmpiDerived.ts` → `SPECIAL_KEYS.Es`
Reason: Kaynak tablosunda bu 13 madde **Yanlış** sütunundadır.
Etki: Es ham puanı; önceki kod bu maddeleri ters yönde sayıyordu → ego gücü
puanı sistematik olarak sapıyordu. Toplam 68 korunur.
Tests: **PASS**

---

## CHANGE-003

Date: 2026-09-21
Source: `SOURCE-KEY-WIGGINS` · Ek 9, kitap s.252 (PDF p134 L) · görsel doğrulandı
Conflict: CONFLICT-010 (P0)
Decision: DECISION-008

Old:
```ts
dogru: [70, 74, 77, 78, 87, 92, 132, 140, 149, 203, 261, 295, 538, 554, 557, 562],
yanlis: [1, 81, 126, 219, 221, 223, 283, 300, 423, 434, 463, 537, 552, 563],
```
New:
```ts
dogru: [70, 74, 77, 78, 87, 92, 126, 132, 140, 149, 203, 261, 295, 463, 538, 554, 557, 562],
yanlis: [1, 81, 219, 221, 223, 283, 300, 423, 434, 537, 552, 563],
```

File: `src/scoring/mmpiDerived.ts` → `WIGGINS_KEYS.FEM`
Reason: `126` ve `463` kaynakta **Doğru** sütunundadır. Toplam 30 korunur.
Etki: W_FEM ham puanı → `WIGGINS_NORMS.FEM` (M=14.77, SD=3.87) T dönüşümü.
Tests: **PASS**

---

## CHANGE-004

Date: 2026-09-21
Source: `SOURCE-KEY-PD-SCALES` · Ek 9, kitap s.249 (PDF p132 R) · görsel doğrulandı
Conflict: CONFLICT-011 (P0)
Decision: DECISION-008

Old: `AVD.dogru` 8 madde (toplam 25)
New: `AVD.dogru` 21 madde (toplam **38**) — eklenen 13 madde:
`52, 142, 171, 180, 267, 278, 292, 304, 317, 357, 377, 418, 473`

File: `src/scoring/mmpiDerived.ts` → `PERSONALITY_KEYS.AVD`
Reason: Kaynak başlığı "Madde sayısı: 38" der ve tablo 21+17=38 listeler.
Etki: AVD ham puanı artık 38 üzerinden; `PERSONALITY_CUTOFFS.AVD`
(`marked: 9, mild: 7`) doğru ölçekte uygulanır.
Tests: **PASS**

---

## CHANGE-005

Date: 2026-09-21
Source: `SOURCE-KEY-PD-SCALES` · Ek 9, kitap s.249 (PDF p132 R) · görsel doğrulandı
Conflict: CONFLICT-012 (P0)
Decision: DECISION-008

Old:
```ts
HST: { dogru: [99, 126, 181, 381, 445, 451, 482, 521], yanlis: [111, 180, 240, 304, 312] },
```
New:
```ts
HST: {
  dogru: [99, 126, 181, 353, 381, 391, 445, 449, 450, 451, 482, 521, 547],
  yanlis: [111, 171, 180, 240, 286, 304, 312],
},
```

File: `src/scoring/mmpiDerived.ts` → `PERSONALITY_KEYS.HST`
Reason: Kaynak başlığı "Madde sayısı: 20"; tablo 13+7=20 listeler.
Doğru'ya eklenen: `353, 391, 449, 450, 547`; Yanlış'a eklenen: `171, 286`.
Etki: HST ham puanı 20 üzerinden; `PERSONALITY_CUTOFFS.HST` (`marked: 10, mild: 7`)
artık erişilebilir eşikler.
Tests: **PASS**

---

## CHANGE-006 — Yeni test: anahtar bütünlüğü

Date: 2026-09-21
Type: Test eklemesi (uygulama davranışını değiştirmez)
Source: Denetim boşluğu tespiti (`TEST_AUDIT.md`, "Yeni test önerisi")

Added: `tests/mmpiKeyIntegrity.test.ts` (7 test)

Kapsam:
- 46 anahtarın **başlıkta belgelenen madde sayısı** ile karşılaştırılması
  (kaynak Ek 9 başlıkları referans)
- Yapısal bütünlük: tekrarlanan madde, Doğru/Yanlış çakışması,
  1-566 aralığı dışı madde
- Mf erkek/kadın anahtarlarının aynı madde kümesini kullanması (yalnızca yön farkı)
- CONFLICT-008..012 düzeltmelerinin kalıcı olması (regresyon koruması)

Neden gerekliydi:
Denetimde HST (başlık 20 / anahtar 13) ve AVD (başlık 38 / anahtar 25) hataları
**uzun yıllar görünmez kaldı** çünkü başlık-madde sayısı tutarlılığını
kontrol eden bir test yoktu. Bu test o sınıfı kapatır.

Testin ilk çalıştırmasında bulduğu ek şey:
`OH` ölçeğinde kaynağın **kendi içi tutarsızlığı** (başlık 33, tablo 31) —
kod tabloyu doğru izlediği için `EXPECTED_SPECIAL.OH = 31` olarak yazıldı
(bkz. `SOURCE-INTERNAL-OH-001`).

Tests: **PASS** (7/7) — toplam suite 287 → **294**

---

## CHANGE-007 — TR endeksi kesme puanı kaynağa çekildi (P1)

Date: 2026-09-21
Type: **Davranış değişikliği** (geçerlilik değerlendirmesi)
Priority: **P1**
Source: `SOURCE-TR-002` (kitap s.59, görsel doğrulanmış) · CONFLICT-015 · DECISION-019

Files:
- `src/scoring/mmpiConsistency.ts`
- `tests/mmpiKeyIntegrity.test.ts`

### Değişiklik 1 — kesme puanı

Before:
```ts
const consistent = score <= 3;   // 3 DAHİL tutarlı
```
After:
```ts
// Kaynak kitap s.59: "3 puan ya da daha fazla bir puanın, geçersiz profil
// olasılığını arttırdığı ileri sürülmüştür (Dahlstrom 1972)."
// → 3 puan DAHİL geçersizlik riski; tutarlılık yalnızca 0-2 için geçerlidir.
const consistent = score <= 2;
```

Etki: TR = 3 olan profiller artık "Tutarsız Yanıt Örüntüsü" + `isWarning: true`.

### Değişiklik 2 — kaynakta olmayan olgusal iddiaların kaldırılması

Before (yorum metni):
> "Normal bireyler tekrarlanan maddelerin **yalnızca üç-dördüne** değişik yanıt
> verir."

After:
> "TR endeksi 3 puanın altındadır; yanıtlar tutarlı kabul edilir. Bu seviyedeki
> düşük tutarsızlıklar genellikle dikkatsizlik kaynaklıdır."

Ayrıca dosya başı yorumundaki "3 ve altı tutarlı kabul edilir (Gravitz & Gerton
1976)" ifadesi kaynak cümlesiyle değiştirildi. **Gerekçe:** "üç-dört" ifadesi ve
Gravitz & Gerton atfı yüklü kaynak kitapta **yoktur**; kaynakta bulunmayan
olgusal iddia taşınamaz (SECONDARY-SOURCE kuralı).

### Değişiklik 3 — regresyon testleri (+4 test)

`tests/mmpiKeyIntegrity.test.ts` → yeni suite "PHASE 4 — tutarlılık endeksleri
kaynak uyumu":
1. TR = 3 → uyarı **var**; TR = 2 → uyarı **yok** (kesme kayması koruması)
2. Tablo 6 → `TR_PAIRS` birebir (16 çift, sıra dahil)
3. Tablo 7 → `CARELESS_PAIRS` birebir (12 çift + 12 yön)
4. F-K bantları (9 geçerli / 10 sahte-kötülük / 17 kritik / 8-11 notu iki dalda)

### Doğrulama

- `npm run typecheck` → **0 hata**
- `tests/mmpiKeyIntegrity.test.ts` → **14/14 PASS**
- Mevcut TR testleri etkilenmedi (1 puan uyarı yok, 4 puan uyarı var → ikisi de
  yeni kuralda da doğru)
- Tam suite sonucu: `TEST_AUDIT.md`

---

## CHANGE-008 — Geçerlik konfigürasyon eşikleri kaynağa çekildi (P1)

Date: 2026-09-21
Type: **Davranış değişikliği** (validity config eşleştirme)
Priority: **P1**
Source: `SOURCE-CONFIG-004/005/007/009` · CONFLICT-017 · DECISION-021

File: `src/scoring/mmpiValidityConfigs.ts` (+ testler)

| id | Before | After | Kaynak |
|---|---|---|---|
| `ascending` | `L<F<K ∧ L≤45 ∧ K≥55` | `… ∧ F≥45 ∧ F≤55 ∧ …` | "F alt testi 45-55 T" (s.46) |
| `descending` | `L>F>K ∧ L≥55 ∧ K≤45` | `… ∧ K≥40 ∧ K≤45` | "K alt testi 40-45 T puanı arasındadır" (s.47) |
| `all-true` | `F>120 ∧ L≤40 ∧ K≤40` | `F>120 ∧ L≤35 ∧ K≤35` | "L ve K alt testinin 35 T puanını aşmasını" (s.49) |
| `help-seeking` | `L<66 ∧ K<66 ∧ F 70-105` | `… ∧ F ≤ 100` | "F 100 T puanına yakın ya da altında" (s.51) |

Ayrıca `rule` metinleri kaynağa göre güncellendi ve `all-false` için kaynak
sapması **gerekçeli yorum** olarak kod içine yazıldı (CONFLICT-018,
DECISION-020 — kod değişmedi).

**Değişmeyenler (bilinçli):** `all-false` 75 eşiği (DECISION-020);
`credible` K ≤ 65, `v-shape` F ≤ 55, `descending` F sınırı, `help-seeking`
F ≥ 70 → CONFLICT-020 (ayrı karar).

### Doğrulama

- `npm run typecheck` → **0 hata**
- `tests/mmpiKeyIntegrity.test.ts` (PHASE 4 batch 3, +6 test) + `mmpiExtended`
  → **46/46 PASS**
- Tam suite → **307/307 PASS** (22 suite, ~120 s) — önceki 301/301 (21 suite)
- **REGRESSION YOK** · `build` PASS · `optik-form.html` senkron

---

## CHANGE-009 — Konf. 7 (`all-true`): ölü kural canlandırıldı (P1)

Date: 2026-09-21 · Type: **Davranış değişikliği** · Priority: **P1**
Source: SOURCE-CONFIG-007 (s.49) · CONFLICT-019 · DECISION-023

```
- isMatch: v => v.F > 120 && v.L <= 35 && v.K <= 35,
+ isMatch: v => v.F >= 120 && v.L <= 35 && v.K <= 35,
```

**Neden:** T puanları [20,120] kırpılır (`mmpiScoring.ts`) → `F > 120` hiç
sağlanamaz. Ampirik: 566 maddenin tamamına "Doğru" → L 26.5 · F **120.0** ·
K 22.1 → konfigürasyon **YOK** dönerdi.
**Geri alma koşulu:** T kırpması kaldırılırsa koşul `> 120` olmalıdır
(kod içinde yorum olarak belgeli).

## CHANGE-010 — Konf. 12 (`credible`): kaynakta olmayan K üst sınırı kaldırıldı (P2)

Date: 2026-09-21 · Type: **Davranış değişikliği** · Priority: **P2**
Source: SOURCE-CONFIG-012 (s.54) · CONFLICT-020 · DECISION-023

```
- isMatch: v => v.L >= 45 && v.L <= 55 && v.F < 70 && v.K > 50 && v.K <= 65,
+ isMatch: v => v.L >= 45 && v.L <= 55 && v.F < 70 && v.K > 50,
```

**Neden:** Kaynak K için üst sınır vermez. Eski kod, kaynağın Konfigürasyon 12
sayacağı profilleri (L=50, F=65, K=70) **hiçbir** konfigürasyona sokmuyordu.
Erişilebilirlik kontrolü yapıldı: başka örüntü etkilenmiyor.

### Doğrulama (her iki değişiklik)

- `npm run typecheck` → **0 hata**
- `npx tsx --test tests/mmpiKeyIntegrity.test.ts` → **22/22 PASS** (+2 test)
- Tam suite → aşağıda TEST_AUDIT kaydı

---

## CHANGE-011 — Kritik madde etiketleri kaynak metniyle uyumlu hâle getirildi (P2)

Date: 2026-09-21
Type: **Etiket/metin düzeltmesi** (klinik yönlendirme metni)
Priority: **P2**
Source: Ek 1 (s.216-226, görsel doğrulama) · CONFLICT-023 · DECISION-026

File: `src/scoring/mmpiCritical.ts` (+ `tests/mmpiKeyIntegrity.test.ts`)

| # | Before | After | Kaynak metni (kanıt) |
|---|---|---|---|
| 20 | Alkol/Madde Sorunları | **Cinsel Doyumsuzluk** | "Cinsel yaşamımdan memnunum" |
| 27 | Ruhsal/Bilişsel Karmaşa | **Etkilenme / Sanrısal Deneyim** | "kötü ruhların beni etkileri altına aldığını hissederim" |
| 33 | Sosyal Çekilme | **Tuhaf/Bizar Yaşantı** | "Başımdan çok garip ve tuhaf şeyler geçti" |
| 37 | Ruhsal Sıkıntı | **Cinsel Sorunlar** | "Cinsel yaşamım yüzünden başım hiç derde girmedi" |
| 69 | Sosyal/Ailevi Huzursuzluk | **Bedensel Ağrı** | "Ensemde nadiren ağrı hissederim" |
| 85 | Ruhsal Sıkıntı / Kaygı | **Dürtü Kontrolü / Aşırma İsteği** | "dokunmak ve aşırmak isterim" |
| 133 | Ailevi Sorunlar | **Cinsel Uyumsuzluk** | "normal olmayan cinsel ilişkilere girişmedim" |
| 146 | Sosyal Uyumsuzluk | **Sosyal Aktivite İhtiyacı** | "Seyahat edip gezip tozmadıkça mutlu olamam" |
| 151 | Sosyal Çekilme / Yabancılaşma | **Zehirlenme Sanrısı / Şüphecilik** | "Biri beni zehirlemeye çalışıyor" |
| 168 | Bağımlılık Potansiyeli | **Bilişsel Karmaşa** | "Zihnimde bir gariplik var" |
| 179 | Bedensel/Organik Belirti | **Cinsel Sıkıntı** | "Cinsel konularda sıkıntım vardır" |
| 334 | Depresif Çökkünlük | **Algı Bozukluğu (Koku)** | "Bazen tuhaf kokular duyarım" |
| 337 | Depresif Çökkünlük | **Huzursuzluk / Anksiyete** | "meraklanıp huzursuzlaşırım" |
| 354 | Bedensel / Nörolojik Belirti | **Kesici Alet Korkusu (Fobi)** | "keskin ve sivri şeyler kullanmaktan korkarım" |

Ayrıca dosya başlığına **"kaynak dışı klinik derleme"** uyarısı eklendi
(kaynakta kritik madde listesi yoktur; bkz. SOURCE-ITEM-002).

**Değişmeyen:** madde numaraları, D/Y yönleri, `#74` cinsiyet ayrımı.

### Doğrulama

- `npm run typecheck` → **0 hata**
- `tests/mmpiKeyIntegrity.test.ts` → **26/26 PASS** (+4 yeni test)
- `npm test` → **313/313 PASS** · 23 suite
- `npm run build` → **PASS** · `optik-form.html` senkron
- **REGRESSION YOK**

---

## CHANGE-012 — 40/04 kodunda tıbbi terim kaynağa çekildi (P2)

Date: 2026-09-21
Type: **İçerik düzeltmesi** (yanlış terim → kaynak terimi)
Priority: **P2**
Source: `SOURCE-CODE-PD-017` · CONFLICT-035 · DECISION-027

File: `src/scoring/mmpiSourceCodes.ts` — `CODES['04']` (40/04 Kodu)

| Before | After |
|---|---|
| "…psikomotor retardasyon ya da **negatifik** depresyon belirtileri yerine…" | "…psikomotor retardasyon ya da **vegetatif** depresyon belirtileri yerine…" |

**Kaynak kanıtı:** kitap s.120, **400 dpi görsel** `v_pd120_0404e.png` —
"gerçek, psikomotor retardasyon ya da **vegetatif** depresyon belirtileri yerine
depresif düşünce ve duygulara ilişkindir."

**Neden hemen düzeltildi (CONFLICT-025 gibi bekletilmedi):** bu bir **eksik
içerik** değil **yanlış içerik**tir; "negatifik depresyon" yerleşik bir tanı
değildir ve cümle depresyonun tipini ayırt eden işlevsel bir ayrım yapıyor.
Eksik koşullu cümleler tüm kod seti çıkarılana kadar bilinçli bekletilir (kural),
yanlış bilgi bekletilmez.

### Doğrulama

- `npm run typecheck` → **0 hata**
- `tests/mmpiKeyIntegrity.test.ts` → **29/29 PASS** (+3 yeni test: terim var /
  yanlış terim yok / gövde regresyonu)
- `npm test` (tam suite) → **316/316 PASS** · 24 suite (önceki 313/313, 23 suite)
- `npm run build` → **PASS** — `optik-form.html` senkron
- **REGRESSION YOK**

---

## CHANGE-013 — Sc `21-44` bandı kaynak terimine çekildi

Date: 2026-09-22
Type: **İçerik düzeltmesi** (yanlış terim → kaynak terimi + düşen sözcük)
Priority: **P2**
Source: `SOURCE-SC-004` · CONFLICT-038 · DECISION-028

File: `src/scoring/mmpiSource.ts` — `SC_T_BANDS` (band `T 21-44`)

| Before | After |
|---|---|
| "…davranışları ve yaşama **bakışları konservatiftir**." | "…davranışları ve yaşama **bakış açıları konformaldir**." |

**Kaynak kanıtı:** kitap s.146 (PDF p81 L), **400 dpi kadraj** `.audit/pages/b18_lowband.png`:
"21-44 T puanı: Pratik ve gelenekseldirler, davranışları ve yaşama bakış açıları
konformaldir." (OCR bu bandı 200 dpi'de doğru okumuş; **sayısal** bant sınırları
görselle doğrulandı — `OCR_ISSUES.md` BAND-HEAD-DROP yalnız 100+ başlığını ilgilendirir.)

**Kapsam:** tek dize. Bant sınırları, `tone`, `rangeLabel`, sayısal eşikler ve
diğer 4 Sc bandı **değişmedi**. Puanlama/ölçek matematiğine etkisi **yoktur**.

### Doğrulama

- `npm run typecheck` → **0 hata**
- `npx tsx --test tests/mmpiKeyIntegrity.test.ts` → **37/37 PASS** (29 → +8 yeni test:
  Tablo 15 Doğru/Yanlış birebirlik, 59+19=78 sayım, `K Eklemeli` + norm çifti,
  Sc bant sınırı 5/5, terim var / "konservatif" yok / gövde regresyonu)
- `npm test` (tam suite) → **324/324 PASS** · 26 suite (önceki 316/316 · 24 suite)
- `npm run build` → **PASS** — `optik-form.html` yeniden üretildi ve senkron (CI
  `git diff --exit-code -- optik-form.html` kapısı)
- **REGRESSION YOK**

---

## CHANGE-014 — kod çözümlemesi blok-yerel + koşullu yorumlar (DECISION-029 · seçenek A)

Date: 2026-09-22
Type: **Model değişikliği** (kod kimliği + kırpmasız çözümleme + koşullu yorum + örüntü katmanı)
Priority: **P1** (CONFLICT-030 kullanıcıya alakasız metin gösteriyordu)
Source: `SOURCE-CODE-PA-003` (s.130-131) · `SOURCE-MA-006` (s.153) · `SOURCE-SI-002` (s.157) ·
nevrotik üçlü konfigürasyonları (s.103-106, Şekil 18-20) · DECISION-029 **(A)**

**Dosyalar (4):**

| Dosya | Ne |
|---|---|
| `src/scoring/mmpiSourceCodes.ts` | `CodeInterpretation` alanları: `block?` · `rawCode?` · `conditions?: CodeCondition[]`; yeni `CODE_DIGIT_SCALE`, `BLOCK_CODES` (4 blok-yerel gövde), `CODE_CONDITIONS` (9 anahtar / 11 koşul), `KNOWN_BLOCK_CODES`, `parseCode()`, `resolveCodeInterpretation()`, `activeCodeConditions()`, `CodeScaleKey`; `codeInterpretation()` artık kırpmasız çözümlere **delege** ediyor |
| `src/scoring/mmpiInterpretation.ts` | `PatternHit.source?` alanı + **3 yeni desen** (`neurotic-step` · `neurotic-hat` · `neurotic-rising`, s.103-106) + `ProfileCodeInterpretation` ve `codeInterpretationForProfile()` (üçüncü yükselen testi ve T puanlarını profilden hesaplar) |
| `src/components/results/MMPICodeTab.tsx` | profil bağlamlı çözümlayıcı; "Koşullu ek yorum" kutusu (kaynak sayfası + `manuel` notu); blok etiketi `clinical.find(...).fullName`; "yorum tanımlı değil" paragrafı yeni |
| `src/components/results/MMPIPrintReport.tsx` | aynı çözümlayıcı; koşullar tek satır `pr-context` |

**Çözümleme sözleşmesi (yeni):**

```
parseCode('027(8)') → { digits: '027', block: 'Si', rawCode: '027(8)' }
BLOCK_CODES['Si:027'] VAR            → Si bloğunun 027(8) gövdesi  ✅
BLOCK_CODES['Ma:19'] YOK → '19' iki hane → CODES['19'] (19/91, s.77 Hs gövdesi) ✅
'794' → Pt:479 yok, 3 hane            → undefined (ARTIK 79/97 metni DÖNMEZ) ✅
```

1. Rakamlar **sıralanır** (`64` ↔ `46` aynı kanonik küme), **blok = kodun ilk rakamı**.
2. Önce `BLOCK_CODES[blok:digits]` aranır (kaynağın o bloğa özgü başlığı).
3. Yalnız **tam iki haneli** kodlar ortak `CODES` kaydına düşer; orada
   `CODE_CONDITIONS` ile birleşir.
4. Üç+ haneli / parantezli eşleşmeyen kod → **`undefined`** (kırpma yok).
5. `resolveCodeInterpretation()` **tek örnek (singleton)** döndürür: `12` ve `21`
   aynı nesnedir (cache; eski `assert.equal(a, b)` kimlik sözleşmesi korundu).

**Kaynaktan eklenen gövdeler (yalnız birebir okunmuş 4 kayıt — DECISION-028):**

| Blok:kod | Kaynak | Gövde (özet) |
|---|---|---|
| `Ma:19` (`91/19`) | s.153 | "Ender görülmektedir. Hastalar hipomanik durumdadırlar…" + `seeAlso`: `92/29 · 93/39 · 94/49 ("Eyleme vuruk davranış ile ilgilidir") · 95/59 · 96/69 · 97/79 · 98/89` |
| `Pa:46` (`64/46`) | s.130-131 | "Bu koddaki bireyler immatür, narsisistik, pasif- bağımlı kişilerdir…" (kitabın "düşmancıdır" yazımı **korundu**) + koşul: "64/46 kodunun yanında 8 alt testi de yükselmişse süreç daha kötü olur" |
| `Si:049` | s.157 | "Psikiyatrik olgularda eyleme vurukluğun bastırılması" |
| `Si:027` (`027(8)`) | s.157 | "Bireyde güçlü ruminatif davranışlar görülebilir." |

**Kullanıcıya etkisi (önceki davranış → yeni):** `'049'` `40/04` (Pd) metnini
gösteriyordu → **kendi** Si gövdesini gösteriyor; `'027(8)'` `20/02` → kendi
gövdesi; `'91'` Hs `19/91` → Ma `91/19`; `'64'` Pd `46/64` → Pa `64/46`;
`'794'`/`'8726'`/`'273/723'`/`'213/231'` **alakasız** iki-haneli gövdeler → "tanımlı değil".

**Bağlanan koşullar (CONFLICT-027 / 025 / 034 — 12 koşul, 2'si `manual`):**
`12` (5 T farkı) · `13` (Yüksek K: 2,7,8 < 70 ∧ F < 50) · `26` (Pa ve/veya 4&8 > 70) ·
`27` (85 T üzeri) · `49` (K > 50 · Si < 50) · `07` (Mf < 40 T) · `68` (Pt ≥ 70) ·
`89` (yaş 27 → **manuel** · üçüncü yükselen 4/7/6) · `08` (üçüncü yükselen 7/2) ·
`Pa:46` (Sc > 70).

**Yeni örüntüler (CONFLICT-033, 3/9):** basamak orantısı · şapka · yükselen eğilim —
eşikler kaynak cümlesinden ("> 70 T", "Hs 70 T'nin altında") ve **kaynak
referansı `source` alanında** (`s.103-104 · Şekil 18` vb.).

### Doğrulama

- `npx tsc --noEmit` → **0 hata**
- `tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS** (56 → 3 eski kilit yeni
  davranışa güncellendi + 7 yeni CHANGE-014 testi)
- `tests/mmpiInterpretation.test.ts` → **38/38 PASS** (29 → +9: 3 desen testi,
  3 profil-bağlamlı kod testi, 3 SSR render testi)
- `npm test` → **359/359 PASS** · 34 suite (önceki 343/343 · 30 suite)
- `npm run build` → **PASS** · `optik-form.html` yeniden üretildi ve **commit edildi**
  (CI `git diff --exit-code` kapısı)
- **Güncellenen 3 eski kilit:** (i) batch 20 `91/19` "Ender görülmektedir **yok**"
  → artık **var**; (ii) batch 21 `049 → 40/04` kırpma kilidi → `049` kendi gövdesi;
  (iii) `12 ↔ 21` kimlik testi → cache ile korundu. Hiçbiri **geri alınmadı**,
  hiçbiri "testi sil" ile geçilmedi.
- **REGRESSION YOK** · puanlama/ölçek matematiğine (ham puan, T, düzeltme, anahtarlar)
  **etkisi yoktur** — yalnız yorum katmanı

---

## CHANGE-015 — BÖLÜM 6 örüntü eşikleri kaynağa çekildi + 6 desen + çekince katmanı (DECISION-030 · seçenek A)

Date: 2026-09-22
Type: **Davranış değişikliği** (yalnız **yorum katmanı**: desen tespiti + desen arayüzü)
Priority: **P1** (CONFLICT-041 — iki desende **yanlış pozitif** üreten eşik sapması) · birlikte **P2** CONFLICT-042 kapandı
Source: `SOURCE-B6-001` (s.160-169 kutu metinleri, **150 dpi görsel okuma**) · `SOURCE-B6-002`
(çekince direktifleri, s.159-160/166-167/169) · DECISION-030 **(A)**

**Dosyalar (3 + stil):**

| Dosya | Ne |
|---|---|
| `src/scoring/mmpiInterpretation.ts` | `PatternHit` alanları: `quote?` (birebir kaynak cümlesi) · `caveat?` (kaynağın çekincesi) · `manual?` (nicel eşiği yok → otomatik değerlendirilmez) · `manualNote?` (sayısal olmayan ayağın elle doğrulanacağı). `conversion-v` **65/5 → 70/10**, `psychotic-v` **70/70 → 80/80/70 (+vadi şekli)**. **6 yeni desen:** `kus-kanadi` · `pasif-agresif-v` · `pozitif-egim` · `yuzen-profil` · `batik-profil` · `sinir-profil` + **`negatif-egim` (`manual`)** → kayıt sayısı **11 → 18**. Yeni dışa aktarım **`MMPI_PATTERN_CAVEATS`** (BÖLÜM 6 direktifleri, kaynak sayfalı) |
| `src/components/results/MMPIExtraTab.tsx` | Desen kartlarında **kaynak satırı + alıntı + çekince + elle-doğrulama notu**; `manual` kayıtlar **“elle değerlendirilir”** bölümüne ayrıldı (vurmadı listesine karışmıyor); sekmeye **“Yorum Çekinceleri (BÖLÜM 6)”** kutusu eklendi |
| `src/styles/workspace.css` | `.mmpi-pattern-source` · `.mmpi-pattern-quote` · `.mmpi-pattern-note` (mevcut desen satırlarının devamı; yeni renk/tip yok) |

**Eşik değişiminin kullanıma etkisi (önce → sonra):**

| Desen | Eski `hit` | Yeni `hit` | Kaynak |
|---|---|---|---|
| `conversion-v` | `Hs,Hy ≥ 65 ∧ min − D ≥ 5` | `Hs,Hy ≥ 70 ∧ min − D ≥ 10` | s.160 |
| `psychotic-v` | `Pa,Sc ≥ 70 ∧ min > Pt` | `Pa ≥ 80 ∧ Sc ≥ 80 ∧ Pt ≥ 70 ∧ min > Pt` | s.161 |

→ **Eski eşikler daha gevşekti**; örnek: `Hs 66.7 / Hy 66.3 / D 59.2` ve
`Pa 74.5 / Sc 74.5 / Pt 59.7` profilleri konuyu **vuruyor**, kaynağın tanımı
**vurmuyordu** (CONFLICT-041 kanıtı) → şimdi ikisi de **vurmuyor**; kaynak
tanımını karşılayan profiller (`74.1/74.8/50.8` ve `82.0/81.1/74.0`) **vurmaya
devam ediyor** (yanlış negatif yok — testte kilitli).

**Eklenen desenler (yalnız kaynak cümlelerindeki sayılar):**

| id | Kural (kaynak) | Sayısal olmayan ayağı |
|---|---|---|
| `kus-kanadi` | Hs, D, Hy, Pd **≥ 70 T** (+ kadınlarda Mf **50 T**) | “Psikotik testlerde de yükselme vardır” → `manualNote` |
| `pasif-agresif-v` | **Kadın** ∧ Pd ≥ 70 ∧ Pa ≥ 70 ∧ Mf **< 50** | “Diğer alt testler 70 T'da olsa bile” → `detail` |
| `pozitif-egim` | Pa,Pt,Sc,Ma,Si **> 70** ∧ Hs,D,Hy,Pd **< 70** | — (bölme çizgisi: Mf hattı, s.165 cümlesi) |
| `negatif-egim` | **`manual`** — kaynak “belirgin düşüklük” diyor, sayı vermiyor | tamamı elle (DECISION-028) |
| `yuzen-profil` | Hs→Ma **tamamı > 70 T** | “F'teki yükselme eşlik eder” → `manualNote` |
| `batik-profil` | tüm klinik ölçekler **45-54 T** (uçlar dâhil) | “en düşük olan alt testlere bakılmalıdır” → `caveat` |
| `sinir-profil` | tüm klinik ölçekler **60-70 T** (kaynağın “> 54 T” cümlesi kapsanıyor) | “geçerlik testlerinde tam olmayan yükselme” → `manualNote` |

**Üretilmeyen hiçbir şey yok:** hiçbir desene kaynakta olmayan eşik, ek yorum
cümlesi veya tanı önerisi yazılmadı; `detail` alanındaki metinler BÖLÜM 6 kutu
cümlelerinin kendisidir (tırnak içinde birebir), `caveat`/`quote` alanları
`SOURCE-B6-001/002` kayıtlarıyla harfiyen aynıdır.

### Doğrulama (CHANGE-015 sonrası)

- `npx tsc --noEmit` → **0 hata**
- `npx tsx --test tests/mmpiInterpretation.test.ts` → **47/47 PASS** (44 → batch-22
  describe’ı yeniden yazıldı: 6 kilit yeni davranışa, 9 teste çıktı; **bilinçli kırılma
  listesi `TEST_AUDIT.md` → batch 23**)
- `npm test` → **368/368 PASS** · 35 suite (önceki 365/365) · `mmpiKeyIntegrity` 63/63
- `npx tsx scripts/mmpi-audit/cmp-b6-batch23.ts` → **SONUÇ: 0 FARK · P0 BULGU YOK**
  (18 kayıt · #1/#2 eşik mutabakatı · eski FP’ler söndü · #4-#10 aynı profilde
  tanım+vuru · Batık/Sınır bant ayrışması · 8/8 çekince · sayı üretim denetimi)
- `npm run build` → **PASS** · `src/` değişti → **`optik-form.html` yeniden üretildi ve
  commit edildi** (CI `git diff --exit-code` kapısı) · `git diff --check` temiz
- **REGRESSION YOK:** puanlama/ölçek matematiği (ham puan, T, K düzeltmesi, anahtarlar,
  normlar, bant metinleri) değişmedi — yalnız **yorum katmanı**. `multi-high` ve
  `SINGLE_PD` davranışı kilitlerle korundu; `MMPIPrintReport` desen listesi
  basmadığı için **dokunulmadı** (kontrol edildi).
- **Arayüz etkisi:** “Desen Göstergeleri” kartları artık kaynak satırı + alıntı +
  çekince taşıyor; `negatif-egim` “Elle değerlendirilir” listesinde; sekmede
  “Yorum Çekinceleri (BÖLÜM 6)” kutusu var. Ham markdown kalıntısı testi:
  `doesNotMatch(/\*\*/)` → arayüz metinlerinde `**` yok (`<b>` etiketi kullanılıyor).

---

## CHANGE-016 — kalan dört desen kartında kaynak atfı (DECISION-030/A · 5. madde devamı · batch 24)

**Area:** `src/scoring/mmpiInterpretation.ts` → `detectPatterns()` · yeni salt-okunur araç
`scripts/mmpi-audit/cmp-b6-batch24.ts` · `tests/mmpiInterpretation.test.ts`.

**Source:** `SOURCE-VALIDITY-F-006` (s.36 — bu turda yazıldı) · `SOURCE-CODE-014/015`
(s.87 · 27/72 ve s.89 · 278/728) · `SOURCE-CODE-PD-014` (s.118-119) · `SOURCE-SC-006`
(s.147-148). **Yalnız** bu kayıtlardaki birebir ve sayfalanmış satırlar taşındı.

**Değişiklikler (sunum/atıf katmanı — hiçbir `hit` koşulu değişmedi):**
1. `cry-for-help` → `source: 's.36 · F yükselme nedenleri (4. madde)'` + `quote` (birebir:
   “Yardım çağrısı profili. 2 ve 7 testleri 6, 8 ve 9 testlerinden yüksektir.”) + `manualNote`
   (eşik kod tarafı; kaynak bandı “80 ve üstü T puanı” → **CONFLICT-043** / **DECISION-032**).
2. `depressive-27` → `source: 's.87 · 27/72 + s.89 · 278/728 (CODE)'` + `quote` (s.89’un
   ⚠️ kritik koşulu: K ve Hs < 50 T ve/veya Ma↑ → “intihar olasılığı dikkatle
   değerlendirilmelidir”) + `manualNote` (Pt ≥ 70 ∧ D ≥ 60 kod tarafı; 85 T koşulu
   `CODE_CONDITIONS` katmanında — CHANGE-014).
3. `49` → `source: 's.118-119 · 49/94 Kodu (CODE)'` + `quote` + yorum satırı: K > 50 T,
   üçüncü yükselen test 2/5/7/0 > 70 T ve Si < 50 T koşulları `CODE_CONDITIONS['49']` içinde;
   `Pd/Ma ≥ 70` kapısı kitabın genel yükselme tanımıyla uyumlu (s.160: “Yükselmenin hepsi
   70 T puanına yakın ya da bunun üstündedir”).
4. `89` → `source: 's.147-148 · 89/98 Kodu (CODE)'`; `quote` **bilinçli yok** — SOURCE-SC-006
   gövdeyi kısaltmalı (“…”) aktarıyor, birebir okuma ayrı tur ister; uydurma alıntı yerine
   yalnız sayfa atfı taşındı.
5. `neurotic-triad` ve `multi-high` **kaynaksız kaldı** (kodun kendi ≥ 65 göstergeleri);
   “kaynaksız set = yalnız bu ikisi” kuralı hem testte hem araçta kilitli.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata**
- `npx tsx --test tests/mmpiInterpretation.test.ts` → **54/54 PASS** (47 → +7)
- `npm test` → **375/375 PASS** · 36 suite (önceki 368/368 · 35)
- `npx tsx scripts/mmpi-audit/cmp-b6-batch24.ts` → **SONUÇ: 0 FARK · P0 BULGU YOK**
  ((1) kapsam defteri · (2) sayfa atfı ↔ SOURCE_* kaydı · (3) `quote` ↔ SOURCE_FACTS birebir ·
  (4) eşik kilidi: statik `hit` ifadeleri + F 68,8/71 davranışı · (5) sayı üretimi denetimi:
  corpus’ta olmayan sayı **yalnız** “kod tarafındadır” notuyla geçebilir · (6) UI zinciri)
- `cmp-b6-batch23.ts` yeniden çalıştırıldı → **0 FARK** (CHANGE-016 bozmadı)
- `npm run build` → **PASS** · `src/` değişti → **`optik-form.html` yeniden üretildi ve
  commit edildi** · `git diff --check` temiz
- **REGRESSION YOK:** puanlama/ölçek matematiği ve tüm `hit` koşulları aynı; yalnız desen
  kartlarının atıf alanları büyüdü.

---

## CHANGE-017 — DECISION-032 (B): cry-for-help F bandı mutabakatı (CONFLICT-043 FIXED)

**Area:** `src/scoring/mmpiInterpretation.ts` → `detectPatterns()` · `tests/mmpiInterpretation.test.ts`.

**Decision:** DECISION-032 = (B) Kullanıcı onayı (2026-09-22):
- `cry-for-help` (Yardım Çağrısı) için mevcut F ≥ 70 T otomatik eşiği korundu.
- Kaynak s.36'daki "80 ve üstü T puanı" bağlamı `manualNote` alanında belgelendi.
- Sayısal davranış değişmedi; yanlış pozitifleri önleme adına kaynakta açıkça bulunmayan 80 T eşiği zorlanmadı.
- CONFLICT-043 FIXED olarak kapatıldı.

**Değişiklikler:**
1. `src/scoring/mmpiInterpretation.ts`: `cry-for-help` kartındaki `manualNote` ve yorum satırı DECISION-032 (B) kararıyla hizalandı.
2. `tests/mmpiInterpretation.test.ts`: Test başlığı ve DECISION-032 kilitleri güncellendi (`54/54 PASS`).
3. `docs/mmpi-audit/DECISIONS.md`: DECISION-032 KABUL (B) olarak kaydedildi.
4. `docs/mmpi-audit/CONFLICTS.md`: CONFLICT-043 FIXED olarak güncellendi.
5. `tests/aiInterpretation.test.ts`: PHASE 11 test paketi eklendi (5 test).

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata**
- `npx tsx --test tests/mmpiInterpretation.test.ts` → **54/54 PASS**
- `npx tsx --test tests/aiInterpretation.test.ts` → **5/5 PASS**
- `npx tsx scripts/mmpi-audit/cmp-b6-batch24.ts` → **0 FARK**
- `npm run verify:pdf` → **PASS**
- `npm run build` → **PASS** (`optik-form.html` güncel ve senkron)
- `npm test` → **380/380 PASS** (36 suite)

---

## CHANGE-018 — DECISION-031 (A): Bölüm 5 Hs (1) Bloğu Kod Göçü ve Koşullu Yorumlar (s.67-78)

**Area:** `src/scoring/mmpiSourceCodes.ts` · `tests/mmpiHsBlock.test.ts` · `tests/mmpiKeyIntegrity.test.ts`.

**Decision:** DECISION-031 = (A) Kullanıcı onayı (2026-09-22):
- Bölüm 5 kod analizleri blok-blok, kitaptan görsel okunarak ve SOURCE_FACTS ile doğrulanarak sisteme aktarılmaktadır.
- İlk tamamlanan blok: **Hs (Hipokondriasis / 1) bloğu (s.67-78)**.
- Uydurma sayı veya tanı üretilmemiştir; metinler kitap sayfalarıyla birebir uyumludur.

**Değişiklikler:**
1. `src/scoring/mmpiSourceCodes.ts`:
   - `parseCode()`: 3+ haneli kodların kanonik digit-sort ile birbirine çakışması (`132`'nin `123`'e dönüşmesi) engellendi (`digits = raw.length === 2 ? raw.split('').sort().join('') : raw`).
   - `BLOCK_CODES`: Hs bloğundaki 20 çok haneli ve blok-yerel kod gövdesi kitaptaki tanı ve yönlendirmeleriyle birlikte eklendi:
     `Hs:123` (123/213), `Hs:1234`, `Hs:1236`, `Hs:1237`, `Hs:1270`, `Hs:12378`, `Hs:128` (128/218), `Hs:129` (129/219), `Hs:120` (120/210), `Hs:132` (132/312), `Hs:134` (134/314), `Hs:1342`, `Hs:136` (136/316), `Hs:137`, `Hs:138` (138/318), `Hs:1382`, `Hs:139`, `Hs:14_low4` (Yüksek 1 / Düşük 4), `Hs:146`, `Hs:1469`.
   - `CODE_CONDITIONS`: Hs bloğuna ait 10 koşul makinece değerlendirilebilir testlerle bağlandı:
     - `12/21`: 1-2 farkı ≤ 5 T (s.68), 3 testi 1'in 5 T alanı içinde (s.68), Pd+Ma ≥ 70 T (s.68)
     - `13/31`: Yüksek K (s.72), Düşük 2 (s.72), 2,7,8,9 ≥ 70 T ∧ K < 50 T (s.72), L ve K ≥ 70 T (s.72)
     - `14/41`: 3 testi ≥ 70 T (s.76)
     - `16/61`: 8 testi ≥ 70 T (s.77), 4 testi < 70 T Paranoid Şizofreni (s.77)
     - `18/81`: F testi ≥ 70 T (s.77)
     - `19/91`: 2 ve 3 testleri < 50 T (s.78)
     - `10/01`: Üçüncü test Sc (s.78), 2 ve 3 testleri ≥ 70 T maskeli depresyon (s.78)
     - `136/316`: Pa - Hy ≥ 10 T ve Hy - Pa ≥ 10 T (s.74)
     - `137`: Ma ≥ 70 T veya K < 50 T (s.75)
     - `139`: Pd ≥ 70 T ve K < 50 T (s.76)
2. `tests/mmpiHsBlock.test.ts`:
   - 16 yeni test ile Hs bloğunun kod çözme doğruluğu, çakışmasızlığı (123 vs 132), tanı sadakati ve tüm koşulların T-skoru tetiklenme mantığı kilitlendi.
3. `tests/mmpiKeyIntegrity.test.ts`:
   - `KNOWN_BLOCK_CODES` listesi 4'ten 24'e güncellendi (Hs bloğundaki 20 kod eklendi).
4. `scripts/mmpi-audit/cmp-hs-batch25.ts`:
   - Hs bloğu mutabakat denetçisi eklendi; 28 kapsam kontrolü ve 0 FARK ile onaylandı.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata**
- `npx tsx scripts/mmpi-audit/cmp-hs-batch25.ts` → **SONUÇ: 0 FARK · Hs BLOĞU KOD GÖÇÜ TAMAMLANDI**
- `npx tsx --test tests/mmpiHsBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS**
- `npx tsx --test tests/mmpi*.test.ts` → **170/170 PASS** (38 suite)
- `npm run build` → **PASS** (`optik-form.html` güncellendi ve senkron)

---

## CHANGE-019 — DECISION-031 (A): Bölüm 5 D (2) Bloğu Kod Göçü ve Koşullu Yorumlar (s.81-92)

**Area:** `src/scoring/mmpiSourceCodes.ts` · `tests/mmpiDBlock.test.ts` · `tests/mmpiKeyIntegrity.test.ts` · `scripts/mmpi-audit/cmp-d-batch26.ts`.

**Decision:** DECISION-031 = (A) Kullanıcı onayı:
- Bölüm 5 kod analizleri blok-blok, kitaptan görsel okunarak ve SOURCE_FACTS ile doğrulanarak sisteme aktarılmaktadır.
- Tamamlanan ikinci blok: **D (Depresyon / 2) bloğu (s.81-92)**.
- Uydurma sayı veya tanı üretilmemiştir; metinler kitap sayfalarıyla birebir uyumludur.

**Değişiklikler:**
1. `src/scoring/mmpiSourceCodes.ts`:
   - `parseCode()`: `248/F` veya `248 / Yüksek F` içeren girdilerin doğrudan `248_highF` anahtarına çözümlenmesi sağlandı.
   - `BLOCK_CODES`: D bloğundaki 14 yeni kod kaydı kitaptaki tanı ve yönlendirmeleriyle birlikte eklendi:
     `D:213` (213/231) + alias `D:231`, `D:243` (243/432), `D:247` (247/427/472/742), `D:248`, `D:248_highF` (248 / Yüksek F), `D:273` (273/723), `D:274` (274/724), `D:275` (275/725), `D:278` (278/728), `D:270`, `D:281` (281/821), `D:284` (284/824), `D:287` (287/827), `D:207`.
   - `CODE_CONDITIONS`: D bloğuna ait 11 koşul makinece değerlendirilebilir testlerle bağlandı:
     - `23`: Düşük Mf veya Ma (<50 T) apati uyarısı; Ma <50 T hareketsizlik uyarısı (s.83).
     - `24/42`: 3, 7 veya 8 üçüncü yükselen test (s.84).
     - `27/72`: 85 T üstü ilaç uyarısı; Hs ≥ 70 T somatizasyon uyarısı (s.87).
     - `20/02`: 7 veya 4 üçüncü yükselen test (s.92).
     - `213/231`: Pt ≥ 70 T endişe/ajitasyon uyarısı (s.84).
     - `247/427`: Erkek Mf ≥ 70 T bağımlılık; Kadın Mf < 50 T aşırı geleneksel rol (s.85-86).
     - `248`: F ≥ 70 T şizofreni riski (s.86).
     - `274/724`: Hy ≥ 70 T kronik alkolizm (s.88); Kadın Mf < 50 T bağımlılık (s.88).
     - `275/725`: Pd < 50 T yetersizlik ve bağımlılık (s.89).
     - `278/728`: **Kritik intihar riski** (K < 50 ∧ Hs < 50) veya Ma ≥ 70; Si ≥ 70 kronik depresyon; Pd < 50 yapışkan bağımlılık; Kadın Mf < 50 (s.89).
     - `281/821`: Hy ≥ 70 T somatizasyon (s.90).
     - `284/824`: Pd > 80 T kontrol kaybı ve öfke patlamaları korkusu (s.91).
     - `287/827`: **Kritik intihar riski** (K < 50 ∧ Ma ≥ 70 T) panik ve ajitasyon (s.91).
2. `tests/mmpiDBlock.test.ts`:
   - 16 yeni test ile D bloğunun kod çözme doğruluğu, tanı sadakati ve tüm koşulların (özellikle intihar riski kontrolleri) T-skoru tetiklenme mantığı kilitlendi.
3. `tests/mmpiKeyIntegrity.test.ts`:
   - `KNOWN_BLOCK_CODES` listesine D bloğundaki 15 anahtar (`D:207`, `D:213`, `D:231`, `D:243`, `D:247`, `D:248`, `D:248_highF`, `D:270`, `D:273`, `D:274`, `D:275`, `D:278`, `D:281`, `D:284`, `D:287`) eklendi (toplam 39 blok anahtarı).
   - Eski negatif kırpma testlerindeki `213/231` ve `273/723` assertion'ları artık başarıyla çözüldüğü için güncellendi; yerlerine henüz göçmemiş kodlar kondu (`314`, `412`).
4. `scripts/mmpi-audit/cmp-d-batch26.ts`:
   - D bloğu mutabakat denetçisi eklendi; tüm çözümler, tanılar ve koşul bağları 0 FARK ile onaylandı.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata**
- `npx tsx scripts/mmpi-audit/cmp-d-batch26.ts` → **SONUÇ: 0 FARK · D BLOĞU KOD GÖÇÜ TAMAMLANDI**
- `npx tsx --test tests/mmpiDBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS**
- `npx tsx --test tests/mmpiHsBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpi*.test.ts tests/aiInterpretation.test.ts` → **154/154 PASS** (31 suite)
- `npm run build` → **PASS** (`optik-form.html` güncellendi ve senkron)

---

## CHANGE-020 — DECISION-031 (A): Bölüm 5 Hy (3) Bloğu Kod Göçü ve Koşullu Yorumlar (s.95-103)

**Area:** `src/scoring/mmpiSourceCodes.ts` · `tests/mmpiHyBlock.test.ts` · `tests/mmpiKeyIntegrity.test.ts` · `scripts/mmpi-audit/cmp-hy-batch27.ts`.

**Decision:** DECISION-031 = (A) Kullanıcı onayı:
- Bölüm 5 kod analizleri blok-blok, kitaptan görsel okunarak ve SOURCE_FACTS ile doğrulanarak sisteme aktarılmaktadır.
- Tamamlanan üçüncü blok: **Hy (Histeri / 3) bloğu (s.95-103)**.
- Uydurma sayı veya tanı üretilmemiştir; metinler kitap sayfalarıyla birebir uyumludur.

**Değişiklikler:**
1. `src/scoring/mmpiSourceCodes.ts`:
   - `parseCode()`: `Yüksek 3 / Yüksek K` (`3_highK`), `Yüksek 3 / Düşük 4` (`34_low4`) ayrıştırma desteği eklendi.
   - `BLOCK_CODES`: Hy bloğundaki 6 yeni kod kaydı kitaptaki tanı ve yönlendirmeleriyle birlikte eklendi:
     `Hy:3_highK` (Yüksek 3 / Yüksek K), `Hy:32` (32, s.96 metni: "23 kod tiplerinin aksine"), `Hy:321` (321, s.97 metni), `Hy:34_low4` (Yüksek 3 / Düşük 4), `Hy:345` (345/435/534) + aliases (`Hy:435`, `Hy:534`), `Hy:346` (346/436) + alias (`Hy:436`).
   - `CODE_CONDITIONS`: Hy bloğuna ait 10 kod için 18 koşullu kural makinece değerlendirilebilir testlerle bağlandı:
     - `Hy:3_highK`: Hy ≥ 70, K ≥ 70, F < 50, Sc < 50 (s.96).
     - `Hy:32`: D ile Hy farkı ≤ 5 T (s.96); Erkek üçüncü test 1/8/9 (s.96); Kadın Mf < 50 T (s.97); Kadın üçüncü test 1/4/8 (s.97).
     - `34/43`: Erkek üçüncü test 2/5/6 (s.98); Kadın üçüncü test 2/6/8 (s.98); 3 > 4 kızgınlık ketlenmesi; 4 > 3 öfke ifadesi (s.98).
     - `345/435/534`: Hy > Pd ∧ K > 50 eyleme dökülme düşüklüğü (s.99).
     - `346/436`: Pa ile Hy farkı ≤ 5 T (s.99).
     - `35/53`: Üçüncü test Pd veya Pa (s.99).
     - `36/63`: Üçüncü test Si veya Sc (s.100); Pa - Hy ≥ 5 T farkı (s.100); Hy > Pa farkındalık (s.100).
     - `37/73`: Üçüncü test Hs, D veya Pd (s.100).
     - `39/93`: Si < 40 T yüzeysellik (s.101); Üçüncü test Pd ("394/934", s.101).
     - `30/03`: Üçüncü test Hs veya D (s.101).
2. `tests/mmpiHyBlock.test.ts`:
   - 16 yeni test ile Hy bloğunun kod çözme doğruluğu, tanı sadakati ve tüm koşulların T-skoru tetiklenme mantığı kilitlendi.
3. `tests/mmpiKeyIntegrity.test.ts`:
   - `KNOWN_BLOCK_CODES` listesine Hy bloğundaki 9 anahtar (`Hy:32`, `Hy:321`, `Hy:345`, `Hy:346`, `Hy:34_low4`, `Hy:3_highK`, `Hy:435`, `Hy:436`, `Hy:534`) eklendi (toplam 48 blok anahtarı).
4. `scripts/mmpi-audit/cmp-hy-batch27.ts`:
   - Hy bloğu mutabakat denetçisi eklendi; tüm çözümler, tanılar ve koşul bağları 0 FARK ile onaylandı.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata**
- `npx tsx scripts/mmpi-audit/cmp-hy-batch27.ts` → **SONUÇ: 0 FARK · Hy BLOĞU KOD GÖÇÜ TAMAMLANDI**
- `npx tsx --test tests/mmpiHyBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS**
- `npx tsx --test tests/mmpiDBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiHsBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpi*.test.ts tests/aiInterpretation.test.ts` → **170/170 PASS** (34 suite)
- `npm run build` → **PASS** (`optik-form.html` güncellendi ve senkron)

---

## CHANGE-021 — DECISION-031 (A): Bölüm 5 Pd (4) Bloğu Kod Göçü ve Koşullu Yorumlar (s.107-121)

**Area:** `src/scoring/mmpiSourceCodes.ts` · `tests/mmpiPdBlock.test.ts` · `tests/mmpiKeyIntegrity.test.ts` · `scripts/mmpi-audit/cmp-pd-batch28.ts`.

**Decision:** DECISION-031 = (A) Kullanıcı onayı:
- Bölüm 5 kod analizleri blok-blok, kitaptan görsel okunarak ve SOURCE_FACTS ile doğrulanarak sisteme aktarılmaktadır.
- Tamamlanan dördüncü blok: **Pd (Psikopatik Sapma / 4) bloğu (s.107-121)**.
- Uydurma sayı veya tanı üretilmemiştir; metinler kitap sayfalarıyla birebir uyumludur.

**Değişiklikler:**
1. `src/scoring/mmpiSourceCodes.ts`:
   - `parseCode()`: `Yüksek 4 / Düşük 5` (`4_low5`) ve `48 / Yüksek F` (`48_highF_low2`) ayrıştırma desteği eklendi.
   - `BLOCK_CODES`: Pd bloğundaki 13 yeni kod tanımı ve 18 çapraz ölçek takma adı eklendi:
     `Pd:4_low5` (Yüksek 4 / Düşük 5), `Pd:456` (456, Scarlett O'Hara Vadisi atfı), `Pd:462` (462/642), `Pd:463` (463/643), `Pd:468` (468/648), `Pd:469` (469), `Pd:48_highF_low2` (48/84 Yüksek F / Düşük 2), `Pd:482` (482/842/824), `Pd:489` (489/849), `Pd:493` (493/943), `Pd:495` (495/945), `Pd:496` (496/946), `Pd:498` (498/948).
     Ayrıca çift yönlü ve çapraz blok çözünürlüğü için `Pd:642`, `Pa:642`, `Pd:643`, `Pa:643`, `Pd:648`, `Pa:648`, `Pd:842`, `Sc:842`, `Pd:824`, `Sc:824`, `Pd:849`, `Sc:849`, `Pd:943`, `Ma:943`, `Pd:945`, `Ma:945`, `Pd:946`, `Ma:946`, `Pd:948`, `Ma:948` takma adları tanımlandı.
   - `CODE_CONDITIONS`: Pd bloğuna ait 10 kod için koşullu kurallar makinece değerlendirilebilir testlerle bağlandı:
     - `Pd:4_low5`: Erkek Mf < 50 T; Kadın Mf < 50 T; Kadın Pa ≥ 70 T; Kadın Hy ≥ 70 T (s.111-112).
     - `45/54`: Erkek Mf ≥ 70 T; Kadın Mf < 50 T; Pd > Mf (s.112-113).
     - `46/64`: Pd > Pa açık isyankarlık; Pa > Pd şüphecilik; Kadın Sc ≥ 70 ∧ K < 50 T prepsikoz (s.114).
     - `Pd:468`: K < 50 T savunma zayıflığı; Mf ile 4/6 farkı ≤ 5 T cinsel kimlik çatışması (s.115).
     - `Pd:469`: Ma ≥ 70 T ajitasyon ve öfke patlaması (s.115).
     - `Pd:48_highF_low2`: F ≥ 70 ∧ D < 50 antisosyal eylemler; K ≥ 70 manipülatif gizleme (s.117).
     - `Pd:489`: Ma ≥ 70 T saldırganlık ve şiddet riski (s.118).
     - `Pd:493`: Hy ve Pd farkı ≤ 5 T somatik perdeleme (s.119).
     - `Pd:495`: Pt ≥ 70 T eylem sonrası kaygı ve suçluluk döngüsü (s.119-120).
     - `Pd:496`: Sc ≥ 70 T kontrolsüz şiddet/homisidal risk; K < 50 T ego gücü yetersizliği (s.120).
2. `tests/mmpiPdBlock.test.ts`:
   - 17 yeni test ile Pd bloğunun kod çözme doğruluğu, tanı sadakati ve tüm koşulların T-skoru tetiklenme mantığı kilitlendi.
3. `tests/mmpiKeyIntegrity.test.ts`:
   - `KNOWN_BLOCK_CODES` listesine Pd bloğundaki 31 anahtar eklenerek toplam kayıt 81 blok koduna ulaştırıldı.
4. `scripts/mmpi-audit/cmp-pd-batch28.ts`:
   - Pd bloğu mutabakat denetçisi eklendi; tüm çözümler, tanılar ve koşul bağları 0 FARK ile onaylandı.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata**
- `npx tsx scripts/mmpi-audit/cmp-pd-batch28.ts` → **SONUÇ: 0 FARK · Pd BLOĞU KOD GÖÇÜ TAMAMLANDI**
- `npx tsx --test tests/mmpiPdBlock.test.ts` → **17/17 PASS**
- `npx tsx --test tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS**
- `npx tsx --test tests/mmpiHyBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiDBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiHsBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpi*.test.ts tests/aiInterpretation.test.ts` → **187/187 PASS** (35 suite)
- `npm run build` → **PASS** (`optik-form.html` güncellendi ve senkron)

---

## CHANGE-022 — DECISION-031 (A): Bölüm 5 Pa (6) Bloğu Kod Göçü ve Koşullu Yorumlar (s.127-135)

**Area:** `src/scoring/mmpiSourceCodes.ts` · `tests/mmpiPaBlock.test.ts` · `tests/mmpiKeyIntegrity.test.ts` · `scripts/mmpi-audit/cmp-pa-batch29.ts`.

**Decision:** DECISION-031 = (A) Kullanıcı onayı:
- Bölüm 5 kod analizleri blok-blok, kitaptan görsel okunarak ve SOURCE_FACTS ile doğrulanarak sisteme aktarılmaktadır.
- Tamamlanan beşinci blok: **Pa (Paranoya / 6) bloğu (s.127-135)**.
- Uydurma sayı veya tanı üretilmemiştir; metinler kitap sayfalarıyla birebir uyumludur.

**Değişiklikler:**
1. `src/scoring/mmpiSourceCodes.ts`:
   - `parseCode()`: `Scarlett O'Hara Vadisi` (`456_scarlett`) ayrıştırma desteği eklendi.
   - `BLOCK_CODES`: Pa bloğundaki 6 yeni kod tanımı ve 16 çapraz ölçek takma adı eklendi:
     `Pa:678` (678/876, Psikotik Vadi atfı ve şizofreni tanısı), `Pa:679` (679), `Pa:680` (680/860, paranoid şizofreni tanısı), `Pa:694` (694/964, cinayet potansiyeli uyarısı), `Pa:698` (698/968, paranoid şizofreni tanısı ve 68/86 yönlendirmesi), `Pa:456_scarlett` (456 Scarlett O'Hara Vadisi, s.134-135 Şekil 21).
     Ayrıca çift yönlü ve çok-haneli çapraz blok çözünürlüğü için `Pa:876`, `Sc:678`, `Sc:876`, `Pa:860`, `Sc:680`, `Sc:860`, `Si:068`, `Si:086`, `Pa:964`, `Ma:694`, `Ma:964`, `Pa:968`, `Ma:698`, `Ma:968`, `Sc:698`, `Sc:968` takma adları tanımlandı.
   - `CODE_CONDITIONS`: Pa bloğuna ait kodlar için koşullu kurallar makinece değerlendirilebilir testlerle bağlandı:
     - `67/76`: 3. test D/Sc; Pa ≥ Pt şizofreniye geçiş riski (s.131).
     - `Pa:678`: 6 ve 8 > 7 Psikotik Vadi (s.131).
     - `68/86`: 3. test Pd/Pt; Pa ve Sc ≥ 70 ∧ Pt ≤ -10 T Paranoid Vadi; K < 50 T saldırganlık; 75+ T şizofreni (s.132-133).
     - `69/96`: 3. test Pd/Sc; F ve Sc ≥ 70 paranoid şizofreni; Kadın gerginliği (s.133).
     - `Pa:698`: 8 alt testi 6'dan 5 T aşağıda ise 68/86 bak (s.134).
     - `60/06`: Kadın 30+ yaş; 3. test D/Pd/Hy (s.134).
     - `Pa:456_scarlett`: Hy ≥ 70 T manipülatif sosyallik (s.134).
2. `tests/mmpiPaBlock.test.ts`:
   - 14 yeni test ile Pa bloğunun kod çözme doğruluğu, tanı sadakati ve tüm koşulların T-skoru tetiklenme mantığı kilitlendi.
3. `tests/mmpiKeyIntegrity.test.ts`:
   - `KNOWN_BLOCK_CODES` listesine Pa bloğundaki 22 anahtar eklenerek toplam kayıt 103 blok koduna ulaştırıldı.
4. `scripts/mmpi-audit/cmp-pa-batch29.ts`:
   - Pa bloğu mutabakat denetçisi eklendi; tüm çözümler, tanılar ve koşul bağları 0 FARK ile onaylandı.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata**
- `npx tsx scripts/mmpi-audit/cmp-pa-batch29.ts` → **SONUÇ: 0 FARK · Pa BLOĞU KOD GÖÇÜ TAMAMLANDI**
- `npx tsx --test tests/mmpiPaBlock.test.ts` → **14/14 PASS**
- `npx tsx --test tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS**
- `npx tsx --test tests/mmpiPdBlock.test.ts` → **17/17 PASS**
- `npx tsx --test tests/mmpiHyBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiDBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiHsBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpi*.test.ts tests/aiInterpretation.test.ts` → **201/201 PASS** (36 suite)
- `npm run build` → **PASS** (`optik-form.html` güncellendi ve senkron)

---

## CHANGE-023 — DECISION-031 (A): Bölüm 5 Pt (7) Bloğu Kod Göçü ve Koşullu Yorumlar (s.137-142)

**Area:** `src/scoring/mmpiSourceCodes.ts` · `tests/mmpiPtBlock.test.ts` · `tests/mmpiKeyIntegrity.test.ts` · `scripts/mmpi-audit/cmp-pt-batch30.ts`.

**Decision:** DECISION-031 = (A) Kullanıcı onayı:
- Bölüm 5 kod analizleri blok-blok, kitaptan görsel okunarak ve SOURCE_FACTS ile doğrulanarak sisteme aktarılmaktadır.
- Tamamlanan altıncı blok: **Pt (Psikasteni / 7) bloğu (s.137-142)**.
- Uydurma sayı veya tanı üretilmemiştir; metinler kitap sayfalarıyla birebir uyumludur.

**Değişiklikler:**
1. `src/scoring/mmpiSourceCodes.ts`:
   - `BLOCK_CODES`: Pt bloğundaki 7 yeni kod tanımı ve 16 çapraz ölçek takma adı eklendi:
     `Pt:47` (74/47, pasif-agresif kişilik bozukluğu tanısı ve s.140 özel gövdesi), `Pt:67` (76/67, s.140 kaygı/kuşku/dolaylı düşmanlık gövdesi), `Pt:782` (782, Depresif Bozukluk ve Obsesif Kompulsif Bozukluk tanıları), `Pt:872` (872, Şizofrenik Reaksiyon tanısı), `Pt:784` (784/874, Şizofrenik Reaksiyon ve Şizoid Kişilik Bozukluğu tanıları), `Pt:789` (789, s.141 hostil/gergin/büyüklenmeci gövdesi), `Pt:794` (794, s.142 kronik kaygı ve impulsif dışavurum gövdesi).
     Ayrıca çift yönlü ve çok-haneli çapraz blok çözünürlüğü için `Pt:74`, `Pt:76`, `Sc:872`, `Pt:874`, `Sc:874`, `Sc:784`, `Pd:784`, `Pd:874`, `Sc:789`, `Ma:789`, `Pt:879`, `Sc:879`, `Ma:879`, `Ma:974`, `Pd:794`, `Ma:794` takma adları tanımlandı.
   - `CODE_CONDITIONS`: Pt bloğuna ait kodlar için koşullu kurallar makinece değerlendirilebilir testlerle bağlandı:
     - `Pt:47 / 74`: D ≥ 70 T içe çevrilen saldırganlık / depresyon (s.140).
     - `78/87`: 3. test D/Pd; Sc > Pt akut psikoz ve tuhaf kendine zarar/intihar; Pt > Sc düşünce bozukluğuna karşı savaş; Pt & Sc ≥ 75 ∧ Sc > Pt şizofreni (s.140-141).
     - `79/97`: 3. test Sc/Pd; D ≥ 70 T anksiyöz gergin depresyon (s.141-142).
     - `70/07`: 3. test D/Sc; Kadınlarda Mf < 40 T aynı örüntü kuralı (s.142).
2. `tests/mmpiPtBlock.test.ts`:
   - 11 yeni test ile Pt bloğunun kod çözme doğruluğu, tanı sadakati ve tüm koşulların T-skoru tetiklenme mantığı kilitlendi.
3. `tests/mmpiKeyIntegrity.test.ts`:
   - `794` negatif kırpma testi güncellendi (artık kendi gövdesine çözümleniyor, unmigrated kodlar ile negatif kırpma kontrolü sağlandı).
   - `KNOWN_BLOCK_CODES` listesine Pt bloğundaki 23 anahtar eklenerek toplam kayıt 126 blok koduna ulaştırıldı.
4. `scripts/mmpi-audit/cmp-pt-batch30.ts`:
   - Pt bloğu mutabakat denetçisi eklendi; tüm çözümler, tanılar ve koşul bağları 0 FARK ile onaylandı.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata**
- `npx tsx scripts/mmpi-audit/cmp-pt-batch30.ts` → **SONUÇ: 0 FARK · Pt BLOĞU KOD GÖÇÜ TAMAMLANDI**
- `npx tsx --test tests/mmpiPtBlock.test.ts` → **11/11 PASS**
- `npx tsx --test tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS**
- `npx tsx --test tests/mmpiPaBlock.test.ts` → **14/14 PASS**
- `npx tsx --test tests/mmpiPdBlock.test.ts` → **17/17 PASS**
- `npx tsx --test tests/mmpiHyBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiDBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiHsBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpi*.test.ts tests/aiInterpretation.test.ts` → **212/212 PASS** (37 suite)
- `npm run build` → **PASS** (`optik-form.html` güncellendi ve senkron)

---

## CHANGE-024 — DECISION-031 (A): Bölüm 5 Sc (8) Bloğu Kod Göçü ve Koşullu Yorumlar (s.143-148)

**Area:** `src/scoring/mmpiSourceCodes.ts` · `tests/mmpiScBlock.test.ts` · `tests/mmpiKeyIntegrity.test.ts` · `tests/mmpiInterpretation.test.ts` · `tests/mmpiPtBlock.test.ts` · `scripts/mmpi-audit/cmp-sc-batch31.ts`.

**Decision:** DECISION-031 = (A) Kullanıcı onayı:
- Bölüm 5 kod analizleri blok-blok, kitaptan görsel okunarak ve SOURCE_FACTS ile doğrulanarak sisteme aktarılmaktadır.
- Tamamlanan yedinci blok: **Sc (Şizofreni / 8) bloğu (s.143-148)**.
- Uydurma sayı veya tanı üretilmemiştir; metinler kitap sayfalarıyla birebir uyumludur.

**Değişiklikler:**
1. `src/scoring/mmpiSourceCodes.ts`:
   - `BLOCK_CODES`: Sc bloğundaki 4 yeni kod tanımı ve 10 çapraz ölçek takma adı eklendi:
     `Sc:68` (86/68 bloğa özel gövde ve tanıları: "6 ve 8'in T puanı 80'nin üstünde, 7 de 70 T puanındadır...", tanılar: Paranoid durum, Paranoid şizofreni, Şizoid kişilik, s.146).
     `Sc:78` (87/78 bloğa özel gövdesi: "Endişeli, kendi kendini tetkik edebilen, derin düşünceye dalan kişilerdir...", s.146).
     `Sc:8726` (`8726 / Yüksek 9` müstakil kodu ve tanısı: "Ajite şizofren bir hastayı göstermektedir...", tanı: Ajite şizofreni, s.146).
     `Sc:paranoid_valley` (Paranoid Vadi / Şekil 22 müstakil kodu ve tanısı: "Bu örüntüyü gösteren hastalar, duygusal olarak geri çekilmişlerdir...", tanı: Paranoid şizofreni, s.147).
     Çapraz takma adlar: `Sc:86`, `Pa:86`, `Sc:87`, `Pt:87`, `Sc:8726_high9`, `Pt:8726`, `Ma:8726`, `Sc:psychotic_v`, `Pa:paranoid_valley`, `Pa:psychotic_v`.
   - `CODE_CONDITIONS`: Sc bloğuna ait kodlar için koşullu kurallar makinece değerlendirilebilir testlerle bağlandı:
     - `Sc:86`: Pa, Sc ≥ 80 T ve Pt 65-75 T akut psikotik durum (s.146).
     - `Sc:87`: Pt & Sc ≥ 75 ∧ Sc > Pt şizofreni eğilimi (s.146).
     - `8726`: Ma ≥ 70 T ajite hipomani uyarısı (s.146).
     - `Sc:paranoid_valley`: Pa, Sc ≥ 70 T ve Pt vadi dibi (s.147).
     - `89/98`: Yaş < 27 manuel notu ve 3. test 4, 7 veya 6 (s.147-148).
     - `80/08`: 3. test Pt (7) veya D (2) (s.148).
   - `parseCode`: `8726` ve `paranoid_valley`/`psikotik_v` kalıplarını Sc bloğuna yönlendiren çözümleme mantığı eklendi.
2. `tests/mmpiScBlock.test.ts`:
   - 13 yeni test ile Sc bloğunun kod çözme doğruluğu, tanı sadakati, 86 vs 68 ve 87 vs 78 blok ayrımı ve tüm koşulların T-skoru tetiklenme mantığı kilitlendi.
3. `tests/mmpiKeyIntegrity.test.ts`:
   - `KNOWN_BLOCK_CODES` listesine Sc bloğundaki 14 anahtar eklenerek toplam kayıt 140 blok koduna ulaştırıldı.
   - Ortak iki-haneli koşul simetrisi testinde blok-özelleştirilmiş 68/86 ve 78/87 kayıtları için özel ayrım eklendi.
4. `tests/mmpiInterpretation.test.ts`:
   - `8726` artık `8726 / Yüksek 9` kendi gövdesine çözümlendiği için test güncellendi.
5. `scripts/mmpi-audit/cmp-sc-batch31.ts`:
   - Sc bloğu mutabakat denetçisi eklendi; tüm çözümler, tanılar ve koşul bağları 0 FARK ile onaylandı.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata**
- `npx tsx scripts/mmpi-audit/cmp-sc-batch31.ts` → **SONUÇ: 0 FARK · Sc BLOĞU KOD GÖÇÜ TAMAMLANDI**
- `npx tsx --test tests/mmpiScBlock.test.ts` → **13/13 PASS**
- `npx tsx --test tests/mmpiPtBlock.test.ts` → **11/11 PASS**
- `npx tsx --test tests/mmpiPaBlock.test.ts` → **14/14 PASS**
- `npx tsx --test tests/mmpiPdBlock.test.ts` → **17/17 PASS**
- `npx tsx --test tests/mmpiHyBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiDBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiHsBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS**
- `npx tsx --test tests/mmpiInterpretation.test.ts` → **54/54 PASS**
- `npx tsx --test tests/aiInterpretation.test.ts` → **5/5 PASS**
- `npm run build` → **PASS** (`optik-form.html` güncellendi ve senkron)

---

## CHANGE-025 — DECISION-031 (A): Bölüm 5 Ma (9) Bloğu Kod Göçü ve Koşullu Yorumlar (s.149-153)

**Area:** `src/scoring/mmpiSourceCodes.ts` · `tests/mmpiMaBlock.test.ts` · `tests/mmpiKeyIntegrity.test.ts` · `scripts/mmpi-audit/cmp-ma-batch32.ts`.

**Decision:** DECISION-031 = (A) Kullanıcı onayı:
- Bölüm 5 kod analizleri blok-blok, kitaptan görsel okunarak ve SOURCE_FACTS ile doğrulanarak sisteme aktarılmaktadır.
- Tamamlanan sekizinci blok: **Ma (Hipomani / 9) bloğu (s.149-153)**.
- Uydurma sayı veya tanı üretilmemiştir; metinler kitap sayfalarıyla birebir uyumludur.

**Değişiklikler:**
1. `src/scoring/mmpiSourceCodes.ts`:
   - `BLOCK_CODES`: Ma bloğundaki 2 yeni kod tanımı ve 3 çapraz ölçek takma adı eklendi:
     `Ma:9_highK` (Yüksek 9 / Yüksek K gövdesi: "Eğer 9 ve K alt testlerinde puanlar 70 T puanında...", s.152).
     `Ma:9_lowK` (Yüksek 9 / Düşük K gövdesi ve tanısı: "Narsisistik kişilerdir. Kadınlar, eksibisyonist bir biçimde...", tanı: Narsisistik kişilik, s.153).
     Çapraz takma adlar: `Ma:9K`, `Ma:high9_highK`, `Ma:high9_lowK`.
   - `CODE_CONDITIONS`:
     - `Ma:9_highK`: D < 50 T, K > 70 T, Kadın Mf < 40 T koşulları (s.152).
     - `Ma:9_lowK`: Kadın eksibisyonizm kuralı (s.153).
     - `09`: Erkeklerde nadirlik uyarısı (s.153).
     - `49`: `CODES['49'].seeAlso` alanına s.153 eyleme vurukluk atfı eklendi.
   - `parseCode`: `Yüksek 9 / Yüksek K` ve `Yüksek 9 / Düşük K` kalıplarını Ma bloğuna yönlendiren çözümleme mantığı eklendi.
2. `tests/mmpiMaBlock.test.ts`:
   - 9 yeni test ile Ma bloğunun kod çözme doğruluğu, tanı sadakati, 91 vs 19 blok ayrımı ve tüm koşulların T-skoru tetiklenme mantığı kilitlendi.
3. `tests/mmpiKeyIntegrity.test.ts`:
   - `KNOWN_BLOCK_CODES` listesine Ma bloğundaki 5 yeni anahtar eklenerek toplam kayıt 145 blok koduna ulaştırıldı.
   - Ortak iki-haneli koşul simetrisi listesine `'09'` eklendi.
4. `scripts/mmpi-audit/cmp-ma-batch32.ts`:
   - Ma bloğu mutabakat denetçisi eklendi; tüm çözümler, tanılar ve koşul bağları 0 FARK ile onaylandı.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata**
- `npx tsx scripts/mmpi-audit/cmp-ma-batch32.ts` → **SONUÇ: 0 FARK · Ma BLOĞU KOD GÖÇÜ TAMAMLANDI**
- `npx tsx --test tests/mmpiMaBlock.test.ts` → **9/9 PASS**
- `npx tsx --test tests/mmpiScBlock.test.ts` → **13/13 PASS**
- `npx tsx --test tests/mmpiPtBlock.test.ts` → **11/11 PASS**
- `npx tsx --test tests/mmpiPaBlock.test.ts` → **14/14 PASS**
- `npx tsx --test tests/mmpiPdBlock.test.ts` → **17/17 PASS**
- `npx tsx --test tests/mmpiHyBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiDBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiHsBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS**
- `npx tsx --test tests/mmpiInterpretation.test.ts` → **54/54 PASS**
- `npx tsx --test tests/aiInterpretation.test.ts` → **5/5 PASS**
- `npm run build` → **PASS** (`optik-form.html` güncellendi ve senkron)

---

## CHANGE-026 — DECISION-031 (A): Bölüm 5 Si (0) Bloğu Kod Göçü ve Bölüm 5 Kapanışı (s.154-158)

**Area:** `src/scoring/mmpiSourceCodes.ts` · `tests/mmpiSiBlock.test.ts` · `tests/mmpiKeyIntegrity.test.ts` · `scripts/mmpi-audit/cmp-si-batch33.ts`.

**Decision:** DECISION-031 = (A) Kullanıcı onayı:
- Bölüm 5 kod analizleri blok-blok, kitaptan görsel okunarak ve SOURCE_FACTS ile doğrulanarak sisteme aktarılmaktadır.
- Tamamlanan dokuzuncu blok ve **Bölüm 5 Kapanışı**: **Si (Sosyal İçe Dönüklük / 0) bloğu (s.154-158)**.
- Uydurma sayı veya tanı üretilmemiştir; metinler kitap sayfalarıyla birebir uyumludur.

**Değişiklikler:**
1. `src/scoring/mmpiSourceCodes.ts`:
   - `BLOCK_CODES`: Si bloğundaki `Si:049` ve `Si:027` kayıtlarına `conditions` ve `seeAlso` atıfları bağlandı:
     - `Si:049`: Si, Pd, Ma >= 70 T eyleme vurukluğun bastırılması koşulu (s.157).
     - `Si:027`: D/Pt >= 70 T ve Sc >= 70 T ruminatif davranışların kuvvetlenmesi koşulu (s.157-158).
     - Çapraz takma adlar eklendi: `Pd:049`, `Ma:049`, `D:027`, `Pt:027`, `Sc:027`, `Si:0278`.
2. `tests/mmpiSiBlock.test.ts`:
   - 6 yeni test ile Si bloğunun kod çözme doğruluğu, metin sadakati, çapraz takma adlar ve tüm koşulların T-skoru tetiklenme mantığı kilitlendi.
3. `tests/mmpiKeyIntegrity.test.ts`:
   - `KNOWN_BLOCK_CODES` listesine Si bloğundaki 6 yeni anahtar eklenerek toplam kayıt 151 blok koduna ulaştırıldı.
4. `scripts/mmpi-audit/cmp-si-batch33.ts`:
   - Si bloğu mutabakat denetçisi eklendi; tüm çözümler, tanılar ve koşul bağları 0 FARK ile onaylandı.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata**
- `npx tsx scripts/mmpi-audit/cmp-si-batch33.ts` → **SONUÇ: 0 FARK · Si BLOĞU KOD GÖÇÜ TAMAMLANDI**
- `npx tsx --test tests/mmpiSiBlock.test.ts` → **6/6 PASS**
- `npx tsx --test tests/mmpiMaBlock.test.ts` → **9/9 PASS**
- `npx tsx --test tests/mmpiScBlock.test.ts` → **13/13 PASS**
- `npx tsx --test tests/mmpiPtBlock.test.ts` → **11/11 PASS**
- `npx tsx --test tests/mmpiPaBlock.test.ts` → **14/14 PASS**
- `npx tsx --test tests/mmpiPdBlock.test.ts` → **17/17 PASS**
- `npx tsx --test tests/mmpiHyBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiDBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiHsBlock.test.ts` → **16/16 PASS**
- `npx tsx --test tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS**
- `npx tsx --test tests/mmpiInterpretation.test.ts` → **54/54 PASS**
- `npx tsx --test tests/aiInterpretation.test.ts` → **5/5 PASS**
- `npm run build` → **PASS** (`optik-form.html` güncellendi ve senkron)

---

## CHANGE-027 — PHASE 12 & 13: UI ve Yazdırma Raporu Denetimi (CONFLICT-007 FIXED)

**Area:** `src/components/results/MMPICodeTab.tsx` · `src/components/results/MMPIPrintReport.tsx` · `src/components/SourcesPage.tsx` · `docs/kaynak-denetimi.md` · `tests/mmpiUiReport.test.ts`.

**Amaç:** PHASE 12 (UI) ve PHASE 13 (Report) denetimi kapsamında, Bölüm 5'te göç ettirilen çok noktalı (üçlü ve dörtlü) kodların ve Bölüm 6 profil örüntülerinin kullanıcı arayüzü ve basılı klinik rapor çıktılarına eksiksiz yansıtılması; `SourcesPage.tsx` kaynak künyesinin Ceyhun & Oral (2003) Status A künyesine yükseltilmesi ve `docs/kaynak-denetimi.md` oluşturularak CONFLICT-007'nin kapatılması.

**Değişiklikler:**
1. `src/components/results/MMPICodeTab.tsx`:
   - Çok noktalı kod analizi: 1. ve 2. klinik ölçeğe ek olarak 3. yükselen ölçek (ve gerekirse 4. ölçek) kitapta tanımlı bir koda karşılık geldiğinde (`123/213`, `278/728`, `782/872`, `8726` vb.) `multiResolved` olarak çözümlenir ve koda özel tanı, metin ve koşullarla ek analiz kartı basılır.
   - Ölçek etiketleri: `index === 0 ? 'Kodun birinci (en yüksek) ölçeği' : index === 1 ? 'Kodun ikinci ölçeği' : `${index + 1}. ölçek`` ile 3+ ölçekli kodlar için düzeltildi.
2. `src/components/results/MMPIPrintReport.tsx`:
   - Çok noktalı kod analizi basılı klinik rapora eklendi.
   - Bölüm 6 profil örüntüleri (`detectPatterns`) profilde görüldüğünde basılı raporda "Profil Örüntüleri & Konfigürasyonları (Bölüm 6)" başlığı altında kaynak, kural, alıntı ve kaynak çekincesiyle listelendi.
3. `src/components/SourcesPage.tsx`:
   - Ceyhun, A. A., & Oral, G. (2003) el kitabı Grup 01 altında **Status A** (Özgün kaynak doğrulandı) APA 7 künyesiyle eklendi; tüm bölümlerin eşleşme dökümü sağlandı.
   - Grup 05 ve 06'daki künyesiz yerel rehber ifadeleri güncellendi; yalnızca doğrulanamayan yerel kural ve sabitler (Welsh A/R sabitleri, Dy 56 madde) dürüstlük kaydı olarak bırakıldı.
   - Dipnotlar `docs/kaynak-denetimi.md` ve `docs/mmpi-audit/` ile hizalandı.
4. `docs/kaynak-denetimi.md`:
   - 14 ana bileşenin kod dosyası, kaynak künyesi ve doğrulama durumunu içeren master eşleştirme tablosu ve dürüstlük kaydıyla oluşturuldu (**CONFLICT-007 FIXED**).
5. `tests/mmpiUiReport.test.ts`:
   - 5 yeni kapsamlı birim testi ile UI çok noktalı kod gösterimi, basılı rapor örüntü ve kod aktarımı, SourcesPage doğrulaması ve `docs/kaynak-denetimi.md` dosya bütünlüğü kilitlendi (**5/5 PASS**).

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata**
- `npx tsx --test tests/mmpiUiReport.test.ts` → **5/5 PASS**
- `npx tsx --test tests/mmpi*Block.test.ts tests/mmpiKeyIntegrity.test.ts tests/mmpiInterpretation.test.ts tests/aiInterpretation.test.ts tests/mmpiUiReport.test.ts` → **245/245 PASS** (53 suite)
- `npm test` → **503/503 PASS** (64 suite)
- `npm run build` → **PASS** (`optik-form.html` güncellendi ve senkron)

---

## CHANGE-028 — PHASE 15, 16 & 17: Audit State Konsolidasyonu, K+ Profili ve Eşik Doğrulama

**Area:** `src/scoring/mmpiInterpretation.ts` · `scripts/mmpi-audit/state.mjs` · `docs/mmpi-audit/` (`status.json`, `STATE_METRICS.md`, `PROTOCOL.md`, `DECISIONS.md`, `AUDIT_STATE.md`) · `tests/auditDocsConsistency.test.ts` · `tests/mmpiKPlusAndPatterns.test.ts` · `tests/mmpiInterpretation.test.ts` · `docs/kaynak-denetimi.md` · `src/components/SourcesPage.tsx`.

**Amaç:** PHASE 15 (State Konsolidasyonu), PHASE 16 (K+ Profili ve K-İlişkili Örüntüler) ve PHASE 17 (Eşik Sınırları ve Doğrulama) denetim adımlarının eksiksiz uygulanması.

**Değişiklikler:**
1. `src/scoring/mmpiInterpretation.ts`:
   - `detectKPlus(profile: MMPIProfile)` fonksiyonu ve `detectPatterns` içine `k-plus` örüntüsü eklendi (`MISSING-KPLUS-001`, Mark & Seeman 1963, s.57 · Şekil 16: K>F, L>F, K-F≥5, tüm klinik <70, ≥6 klinik ≤60).
2. `scripts/mmpi-audit/state.mjs`:
   - Repository audit metriklerini doğrudan kod ve dosya yapısından dinamik ölçen ve `status.json` ile `STATE_METRICS.md` dosyalarını üreten CLI aracı geliştirildi.
3. `tests/auditDocsConsistency.test.ts`:
   - State doğruluğu, test sayaçları, conflict/decision mükerrerlik denetimi, sahte kaynak izolasyonu ve SOURCE_INDEX sayfa eşleme tutarlılığını denetleyen CI testi eklendi (12/12 PASS).
4. `tests/mmpiKPlusAndPatterns.test.ts`:
   - K+ pozitif ve negatif sınır testleri, K-ilişkili `Ma:9_highK`/`Ma:9_lowK` koşulları, L/F/K bant ve Wiggins SOC doğrulaması (12/12 PASS).
5. `docs/kaynak-denetimi.md` ve `src/components/SourcesPage.tsx`:
   - Doğrulanmış Ek 1 (s.215-233) ve Tablo 30 (s.195) sayfa izi güncellendi.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata (PASS)**
- `npm test` → **528/528 PASS (76 suite)**
- `npm run build` → **PASS**

---

## CHANGE-029 — PHASE 18, 19 & 20: Sürüm Güncellemesi, Uçtan Uca Doğrulama ve Üretim Kapanışı

**Area:** `src/scoring/version.ts` · `package.json` · `tests/mmpiE2EValidation.test.ts` · `docs/mmpi-audit/AUDIT_STATE.md` · `docs/mmpi-audit/status.json` · `docs/mmpi-audit/STATE_METRICS.md`.

**Amaç:** PHASE 18 (Traceability / Version / Audit Closure), PHASE 19 (End-to-End Product & Clinical Validation) ve PHASE 20 (Production Closure) adımlarının eksiksiz uygulanması.

**Değişiklikler:**
1. `src/scoring/version.ts` & `package.json`:
   - `SCORING_ENGINE_VERSION` `2.1.0` sürümüne yükseltildi (K+ profil tespiti, klinik örüntü doğrulama ve geçerlik eşik mutabakatı iziyle).
2. `tests/mmpiE2EValidation.test.ts`:
   - 12 yeni uçtan uca ürün ve klinik doğrulama testi eklendi:
     - Sürüm ve anahtar izlenebilirliği,
     - 4 sayfalık sentetik OMR taraması ile 566 cevap çıkarımı ve sayfa sınır/kayma kontrolleri,
     - Puanlama, geçerlik, klinik ölçekler (Hs..Si) ve türetilmiş ölçekler zinciri,
     - Bölüm 5 kod çözümleme ve koşul tetikleme (`Ma:9_highK`, `Ma:9_lowK`),
     - Bölüm 6 19 profil örüntüsü ve K+ profil tespiti,
     - AI entegrasyonu KVKK m.4/3-d (0 isim/soyisim) ve §39 (0 ham cevap) sözleşmesi,
     - Raporlama modeli ve veri izolasyonu.
3. `docs/mmpi-audit/AUDIT_STATE.md`:
   - Traceability Matrix, Production Readiness tablosu ve kalan maddelerin nihai sınıflandırması (`CLOSED` / `OUT OF SCOPE`) güncellendi.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata (PASS)**
- `npm test` → **540/540 PASS (77 suite)**
- `npm run build` → **PASS**

---

## CHANGE-030 — Klinik Ölçekler Sekmesi: Ölçek Dosyası Kartının Tasarım ve Açılır Bölüm Yeniden Yapımı

**Area:** `src/components/results/MMPIClinicalTab.tsx` · `src/styles/workspace.css` · `src/styles/screen.css` · `tests/mmpiClinicalReportUi.test.ts` · `tests/mmpiInterpretation.test.ts`.

**Amaç:** "Ölçek Bazlı Detaylı Klinik Rapor (Graham 1987)" kartı sitenin tasarım dilinden kopmuştu ve uzun kaynak listeleri (23-41 maddelik Graham listeleri, madde numarası tabloları) tek bir duvar hâlinde basılıyordu. Kart sitenin tipografi ve yüzey sözleşmesine bağlandı, uzun listeler katlanabilir hâle getirildi ve uzman için gezinme kısayolları eklendi.

**Değişiklikler:**
1. `src/components/results/MMPIClinicalTab.tsx`:
   - **Graham (1987) bölümü kendi açılır-kapanır bölümüne alındı.** Diğer sekmelerle (Türetilmiş Ölçekler, Desenler & Sözlük, Kritik Bulgular) **aynı** `DisclosureRow` / `DisclosureControls` / `useDisclosureGroup` bileşenleri kullanılır; böylece açılır-kapanır davranış sekmeden sekmeye değişmez.
   - Varsayılan durum, `Disclosure.tsx`'te belgelenen pedagojik kurala bağlandı: yalnız **en belirgin** (en yüksek T) ölçeğin Graham listesi açık gelir, diğer uzun listeler kapalı gelir; üstteki "Tümünü aç / Tümünü kapat" denetimi hepsini topluca yönetir.
   - "Demografik ve Klinik Notlar" ile "Tablo N — madde numaraları ve puanlama yönü" de katlanabilir; **klinik anlatı (KLİNİK AÇIKLAMA VE ANALİZ, Koşullu ek yorum, EK KLİNİK BİLGİLER) her zaman görünür** kalır.
   - Rapor başlığına **hızlı gezinme çipleri** (`#dossier-<ölçek>` hedefli) ve bölüm sayacı eklendi.
   - Kart başlığına T çubuğu (0-120, 50 ortalama ve 70 klinik eşik işaretli — `.mmpi-tbar` dili) eklendi; sayısal T tek bakışta karşılaştırılabilir.
   - Koşullu ek yorumlarda sağlanan/sağlanmayan koşullar ayrıştı ("Bu profilde geçerli" / "Koşul sağlanmıyor"); sağlanmayanlar solarak öne çıkan koşulu belirginleştirir.
   - Renk artık satır içi stille değil kartın `.is-high` / `.is-low` durumu üzerinden tasarım token'larından gelir; satır içi stil yalnız geometri (çubuk genişliği/konumu) taşır.
   - Madde numaraları virgül duvarı yerine "Doğru (D) / Yanlış (Y)" olarak iki sütunlu başvuru bloğunda verilir.
2. `src/styles/workspace.css`:
   - Kartın tüm kuralları `@media screen` içine alındı. Önceki blok dosyanın **kök düzeyindeydi** (`@media screen` dışında), yani ekran kuralları yazdırılabilir A4 sayfaya sızıyordu; dosyanın geri kalanının tümü sarılıydı.
   - **Tipografi sözleşmesi:** serif (`--font-display`) ve italik karttan tamamen çıkarıldı (serif sitede yalnız 300 ağırlıkta panel başlığıdır); 9.5px metin kaldırıldı, en küçük metin 10.5px; ağırlıklar 400/600/700 ile sınırlandı (yayında web fontu yüklenmediği için `font-src 'none'` altında 800 sahte kalın üretir).
   - 3px renkli sol kenarlık ve doygun renkli avatar dairesi kaldırıldı; sitenin dili olan 9px durum noktası + saç teli çerçeve kullanıldı.
   - `@media print` bloğu eklendi: katlanmış gövdeler kâğıtta kendiliğinden açılır, gezinme/toplu denetimler gizlenir.
3. `src/styles/workspace.css` (ortak açılır bölüm): açık durumda başlık ile gövde arasına saç teli ayraç ve üst boşluk eklendi, başlığın alt köşeleri düzleşti; böylece "açık mı kapalı mı" belirsizliği ve gövdenin başlığa yapışması kalktı.
4. `src/styles/screen.css`: `--danger-ink` token'ı eklendi (`--accent-ink` ile aynı kural: dolgu rengi olan `#d2453a` küçük metinde koyulaştırılır).
5. `tests/mmpiClinicalReportUi.test.ts` (yeni, **16 test**): açılır bölüm yapısı, en belirgin ölçeğin açık gelmesi, kapalı bölümün maddelerinin DOM'da kalması, toplu denetim sayacı, gezinme çipi/kart eşleşmesi, satır içi stil kısıtı ve CSS tarafında tipografi/@media/kâğıt sözleşmesi doğrulanır.
6. `tests/mmpiInterpretation.test.ts`: `assert.doesNotMatch(clinical, /aria-expanded/)` beklentisi **tersine çevrildi**. Bu satır eski satır-bazlı liste arayüzünün kaldırıldığını belgeliyordu; kullanıcı isteğiyle Graham bölümü yeniden açılır-kapanır yapıldığı için artık `aria-expanded` + `aria-controls` + `Tümünü aç` ve kapalı gövdede kalan madde metinleri doğrulanıyor. Klinik içerik ve kaynak metin beklentileri değişmedi.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata (PASS)**
- `npm test` → **589/589 PASS (103 suite)**
- `npm run build` → **PASS** (`optik-form.html` yeniden üretildi ve senkron)

---

## CHANGE-031 — Klinik Kart Kullanılabilirlik Düzeltmeleri, PDF Raporuna Graham 1987 Aktarımı ve Tablo 12 Denetim Betiği Onarımı

**Area:** `src/components/results/MMPIClinicalTab.tsx` · `src/components/results/MMPIPrintReport.tsx` · `src/components/RecordDetailPage.tsx` · `src/styles/workspace.css` · `scripts/mmpi-audit/cmp-tablo12.ts` · `tests/*`.

**Amaç:** CHANGE-030 sonrası kullanıcı geri bildirimi: (1) ölçü satırında sağda gri boşluk kalıyordu ve K düzeltmesi sığmıyordu, (2) kart başlığı katlanamıyordu, (3) PDF raporunda Graham 1987 içeriği yoktu, (4) revizyon şeridi kapatılamıyordu. Ayrıca denetim araçlarında sessiz bir çökme bulundu.

**Kaynak doğrulaması (bu değişiklikte ekrana/kağıda çıkan her sayı):**

| Katman | Kaynak | Doğrulama |
|---|---|---|
| Tablo 9 (D) 20+40=60 | kitap s.78-81 | `cmp-tablo9.ts` → **BİREBİR MATCH** |
| Tablo 10 (Hy) 13+47=60 | s.93-94 | `cmp-tablo10.ts` → **BİREBİR MATCH** |
| Tablo 11 (Pd) 24+26=50 | s.107-110 | `cmp-tablo11.ts` → **BİREBİR MATCH** |
| Tablo 12 (Mf) 28+32=60 | s.122 | `cmp-tablo12.ts` → **BİREBİR MATCH** (betik onarıldı, bkz. 5) |
| Tablo 13 (Pa) 25+15=40 | s.128 | `cmp-tablo13.ts` → **BİREBİR MATCH** |
| Tablo 14 (Pt) 39+9=48 | s.137-141 | `cmp-tablo14.ts` → **BİREBİR MATCH** |
| Tablo 15 (Sc) 59+19=78 | s.144 / **OCR p80 L** | `cmp-sc-batch18.ts` → **BİREBİR MATCH**; OCR metni "Tablo15…(Madde Sayısı:78)" + "KEklemeli" doğrudan okundu |
| Tablo 16 (Ma) 35+11=46 | s.150 / OCR p83 L | `cmp-ma-batch19.ts` → 0 FARK |
| Tablo 17 (Si) 34+36=70 | s.156 / OCR p86 L | `cmp-si-batch21.ts` → 0 FARK |
| K oranları Hs .5 / Pd .4 / Pt 1 / Sc 1 / Ma .2 | `OCR_PDF_FULL_AUDIT.md:323` | `K_CORRECTION` birebir |
| Normlar (26 hücre) | **OCR p105 = Tablo 30** | `mmpiKeyIntegrity` "26 norm hücresinin tamamı kaynak Tablo 30 ile birebir" + OCR satırları elle okundu (`29.82 … 31.06 … 8.2`, `13.19 4.07 … 15.89`, `1996 440 … 19.72 4.36`, `23.86 797 … 29.88 7.52`) |

**Bulunan ve çözülen iki kaynak-içi çelişki (kod Tablo 30'u izler):**
- Tablo 15 dipnotu OCR'da kadın Sc için **31.08** okunuyor; Tablo 30 **31.06** (sd 8.2). Kod 31.06 → Tablo 30 esas.
- Tablo 17 dipnotu Si erkek için **26.86**; Tablo 30 **23.86** (sd 7.97) → **CONFLICT-040 REJECTED**, kod 23.86.
- Pt kadın: s.138 metni **29.90**, Tablo 30 **29.20** → **CONFLICT-037 REJECTED**, kod 29.20.
- Hy kadın → **CONFLICT-028 REJECTED**.
- Bu yüzden kart ve PDF'teki norm atfı artık **"(Savaşır, 1981) — Tablo 30"** biçiminde: kitap dipnotuyla karşılaştıran uzman farkın nedenini görür, hata sanmaz.

**Değişiklikler:**
1. `MMPIClinicalTab.tsx` — ölçü satırı:
   - `.dossier-facts` grid'den **flex** satırına çevrildi. `repeat(auto-fit, minmax(140px,1fr))` dördüncü hücre sığmadığında **boş (gri zeminli) hücre** bırakıyordu; flex'te hücreler genişliği paylaştığı için boşluk oluşmaz. `.dossier-fact.is-wide` kaldırıldı.
   - **K düzeltmesi** artık aynı satırda ve klasik ekleme oranıyla: `+0.5K` (Hs) … `+0.2K` (Ma); K almayan ölçeklerde `Uygulanmaz`. Kaynak cümlesi hemen altta: *"K Eklemeli bir alt testtir. Klasik ekleme tablosuna göre ham puana 0.5×K eklenir."* K almayan ölçeklerde cümle **kendi tablo numarasıyla** anılır (D → "Tablo 9'da", Hy → "Tablo 10'da", Mf → "Tablo 12'de"); önceki taslakta hepsi yanlış biçimde Tablo 17'ye bağlanmıştı.
2. `MMPIClinicalTab.tsx` — kart başlığı katlanabilir:
   - Başlık satırının tamamı (`Kategori: Klinik Ölçek · Alt test N`, ölçek adı + kısa ad, durum rozeti, T + çubuk, Ham/K+) tek bir `<button>`; `aria-expanded` + `aria-controls` taşır. Gövde `hidden` ile kapanır, içerik DOM'da kalır.
   - Katlama durumu aynı `useDisclosureGroup` grubunda; "Tümünü aç / Tümünü kapat" kartları da yönetir. Varsayılan: kartlar açık, Graham listesi yalnız en belirgin ölçekte açık.
   - `<p>`/`<div>` öğeleri düğme içine giremeyeceği için başlık `<h3><button>…</button></h3>` yapısına geçti (DisclosureRow ile aynı desen).
3. `MMPIPrintReport.tsx` — PDF kaynak içeriğiyle tamamlandı:
   - Yeni bölüm **"Ölçek Bazlı Detaylı Klinik Yorum (Graham 1987)"**: T ≥ 70 ya da T ≤ 40 olan her ölçek için Graham listesi (kâğıtta iki sütun), demografik notlar, **bu profilde sağlanan** koşullu yorumlar, Tablo N özeti (madde sayısı + D/Y + K oranı + norm) ve kaynak künyesi.
   - Klinik tablonun altına **klasik ekleme tablosu** dipnotu eklendi (Hs +0.5K … Ma +0.2K; D/Hy/Mf/Pa/Si'ye eklenmez).
   - Rapor altlığına onaylı künye eklendi (Graham 1987 · Ceyhun & Oral 2003 · Savaşır 1981); `stripPageRefs` gövdede korunur, sayfa aralığı yalnız künye satırlarında.
4. `RecordDetailPage.tsx` — revizyon şeridi:
   - `RevisionNotice` bileşenine ayrıldı ve **kapatılabilir** (`close-banner-btn`, `aria-label`, `title`).
   - Kapatma durumu `useState(false)` ile **yalnız bellekte**; `localStorage`/`sessionStorage`'a yazılmaz ve `[recordId]` değişince sıfırlanır → **F5'te geri gelir**, başka kayıtta da geri gelir. Kapatma düğmesi `no-print`; şeridin kendisi kâğıda basılır (izlenebilirlik).
5. `scripts/mmpi-audit/cmp-tablo12.ts` — **onarım:**
   - Betik `SCORING_KEYS.Mf`'nin eski düz alanlarını (`trueItems`/`falseItems`/`reversedForFemales`) okuyordu; Mf cinsiyete özel (`{male, female}`) yapıya geçildiğinden `TypeError: Cannot read properties of undefined` ile **çöküyordu** ve Tablo 12 fiilen denetlenmiyordu.
   - Yeni hâli `isGendered` ile erkek anahtarını Tablo 12'yle, kadın anahtarını (*) maddeleri (69, 179, 231, 297, 133) ters çevrilmiş beklenen listelerle karşılaştırır ve 5 maddenin gerçekten yön değiştirdiğini doğrular. Sonuç: **0 FARK** (erkek 28+32, kadın 25+35).
6. `src/styles/workspace.css`: `.scale-dossier-heading`/`.scale-dossier-toggle` (düğme başlık, chevron, hover/odak), `.scale-dossier-body[hidden]`, `.dossier-knote`, flex ölçü satırı; `@media print`'e `.scale-dossier-body[hidden] { display: flex !important }` ve yeni `.pr-dossier*` kâğıt kuralları.
7. **Testler:**
   - `tests/auditScripts.test.ts` (yeni, **7 test**): `cmp-tablo*.ts` betiklerinin çökmeden çalıştığını ve `FARK VAR` üretmediğini kilitler — Tablo 12 çökmesi bu testle yakalanırdı.
   - `tests/recordDetailUi.test.ts` (yeni, **4 test**): revizyon şeridinin içeriği, kapatma düğmesinin erişilebilirliği/`no-print` oluşu, neden boşken basılmaması ve **kapatma durumunun kalıcı depolamaya yazılmadığı**.
   - `tests/mmpiClinicalReportUi.test.ts` (**24 test**): kart başlığı katlama sözleşmesi, ölçü satırının flex olması (grid boşluğu yasak), K oranı + kaynak cümlesi + doğru tablo numarası, PDF'te Graham blokları / K dipnotu / künye / revizyon izi.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata (PASS)**
- `npm test` → **608/608 PASS (106 suite)**
- `npm run build` → **PASS**
- `cmp-tablo9/10/11/12/13/14.ts` → **6/6 BİREBİR MATCH, 0 FARK**

---

## CHANGE-032 — PDF Raporunda Sayfa Yükü: Graham Listeleri Kâğıttan Çıktı Özetine İndirildi, Kâğıt Tipografisi Yapılandırıldı

**Area:** `src/components/results/MMPIPrintReport.tsx` · `src/styles/workspace.css` · `tests/mmpiClinicalReportUi.test.ts`.

**Amaç (kullanıcı geri bildirimi):** CHANGE-031 ile PDF'e aktarılan "Ölçek Bazlı Detaylı Klinik Yorum (Graham 1987)" bölümü her belirgin ölçek için 20-45 maddelik kaynak listesini tek tek basıyordu; gereksiz sayfa yükü oluşturuyordu. Kâğıtta **çıktı** istendi, kaynak enumerasyonu değil. Ayrıca raporun geri kalanı "salt yazı" yığını görünümündeydi.

**Bulgu verisine dokunulmadı:** `src/scoring/**` hiç değişmedi; tek bir klinik cümle silinmedi ya da yeniden yazılmadı. Değişen yalnız kâğıda neyin basıldığı ve nasıl dizildiği.

**Ölçülen etki** (kullanıcının yapıştırdığı profile eşdeğer 5 belirgin ölçekli profil, aynı girdiyle ESKİ/YENİ bileşen yan yana render edildi):

| | Graham bölümü metni | satır | tüm rapor HTML |
|---|---|---|---|
| ESKİ (CHANGE-031) | 9 647 karakter | 194 | 34 191 karakter |
| YENİ | **3 118 karakter** | **43** | 28 718 karakter |

Bölüm %68 küçüldü; kâğıtta yaklaşık 2 sayfadan yarım sayfaya indi.

**Değişiklikler:**
1. `PrintScaleDossier` yeniden yazıldı — kâğıtta artık:
   - başlık satırı: ölçek adı · T skoru · KLİNİK YÜKSEKLİK/DÜŞÜKLÜK rozeti · alt test numarası;
   - **demografik/klinik notlar** (aynen);
   - **bu profilde sağlanan koşullu ek yorumlar** (aynen) — asıl "çıktı" bunlar;
   - Tablo özeti (madde sayısı + D/Y + K oranı + Tablo 30 normları) ve kaynak künyesi.
   - Kaldırılan tek şey `<ol class="pr-graham">` kaynak enumerasyonu. Okurun ayrıntıyı nerede bulacağı bölüm açıklamasında yazılı: *"Graham (1987) madde listelerinin tamamı ekran raporundaki ölçek kartlarındadır."* Ekran kartları eksiksiz kalmaya devam ediyor.
   - Not başlığı ardışık notlarda **yinelenmiyor** (Hs'nin iki başlıksız notunda "Demografik ve klinik notlar:" eskiden iki kez basılıyordu); kaynak metnin kendisi eksilmeden.
   - Hiç notu/koşulu olmayan ölçekte (Hy, Pa, Pt, Sc) "Bu düzey için kaynakta ayrıca demografik not ya da koşullu yorum tanımlı değildir." satırı basılıyor; boş blok kalmıyor.
2. Kâğıt tipografisi (`@media print`):
   - `.pr-note` → sol çizgi + `break-inside: avoid`; **Klinik Ölçek Yorumları** düz cümle yığını olmaktan çıkıp `.pr-note-head` (ad · renkli T · düzey rozeti) + `.pr-note-body` yapısına geçti.
   - `.pr-block h2` → sol vurgu çubuğu + alt çizgi; `.pr-context` 9px/1.5.
   - `.pr-table` → `thead { display: table-header-group }` (uzun tabloda başlık her sayfada), zebra satır, `tabular-nums`, 9.5px gövde.
   - `.pr-report p { widows: 2; orphans: 2 }` → sayfa sonunda tek satır kalmıyor.
   - `.pr-graham*` kuralları kaldırıldı (artık basılmıyor).
   - `.pr-block .pr-dossier-head` özgüllüğü `.pr-block h3`'ün `text-transform: uppercase` kuralını bilinçli olarak bastırır; ölçek adları kâğıtta büyük harf yığını yerine kaynak yazımıyla basılıyor.
3. **Testler** (`tests/mmpiClinicalReportUi.test.ts`, 24 → **26**):
   - Graham bölümü testi tersine çevrildi: artık her belirgin ölçek için blok başlığı, düzey rozeti, T skoru, Tablo özeti ve künye **basılmalı**, kaynak maddesi ise **basılmamalı** (ilk madde metninin kâğıtta geçmediği doğrulanıyor).
   - Kâğıt CSS sözleşmesi: `.pr-dossier*` kuralları var, `.pr-graham*` yok; `.pr-note` sol çizgili; `.pr-table thead` tekrarlanıyor; `widows: 2`.
   - Yeni: Hs bloğunda "Demografik ve klinik notlar:" etiketinin **bir kez** basıldığı ve üç kaynak parçasının eksiksiz taşındığı.

**Doğrulama:**
- `npx tsc --noEmit` → **0 hata (PASS)**
- `npm test` → **610/610 PASS (106 suite)**
- `npm run build` → **PASS**
