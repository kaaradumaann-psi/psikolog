# Test Audit

Test/regresyon sonuçları. Bir scoring değişikliğinden sonra
`npm run typecheck` + `npm test` + `npm run build` çalıştırılır ve sonuç
buraya + `CODE_CHANGES.md`'ye yazılır.

---

## BASELINE — 2026-09-21 (Oturum 1, değişiklik öncesi)

Komut:
```bash
npm install     # 74 paket, 4 sn
npm test        # tsx --test tests/*.test.ts
```

Sonuç:
```
# tests  287
# suites 18
# pass   287
# fail   0
# duration_ms 118802
```

Yorum:
Denetim öncesi motor sağlıklı. Bu baseline, ileride yapılacak scoring
değişikliklerinde **regresyon referansı** olarak kullanılacaktır.

`npm run typecheck` ve `npm run build` bu oturumda çalıştırılmadı
(kod değişikliği yok); ilk kod değişikliğinde çalıştırılacaktır.

### Regresyon riski notu

CONFLICT-001/002 (norm düzeltmeleri) uygulandığında:
- `tests/` içinde T puanı doğrulayan fixture'lar varsa bunlar **kırılacaktır**
  (beklenen: norm değişirse T puanı değişir). Bu bir regresyon **değil**,
  kasıtlı davranış değişikliğidir; ama testlerin hangi normları varsaydığı
  kayda geçirilmelidir.
- Etkilenecek test dosyaları kod değişikliğinden önce tarandı mı? → **HAYIR**
  (PHASE 6'da yapılacak).

---

## MEVCUT TEST KAPSAMI (keşif)

`tests/` altında MMPI puanlamasıyla doğrudan ilgili test dosyaları
tarandı mı? → **PARTIAL**: 20+ test dosyasının adı görüldü
(`comparison.test.ts`, `fixtures/omrSynthetic.ts`, `build.test.ts` …).

Not: `SCORING_ENGINE_VERSION = '2.0.0'` ve `version.ts` içindeki
"NORM_SOURCE_LABEL" testlerde doğrulanıyor olabilir; norm değişikliği
etkisi PHASE 6'da tam listelenecek.

Kapsam boşluğu (aday):
Kaynak kitabın Tablo 3/4/5 madde anahtarlarına karşı bir **"key integrity"
testi** yok gibi görünüyor: kod anahtarlarının madde sayıları (L=15, F=64,
K=30) ve toplam madde sayıları test edilmiyor. PHASE 14'te bu testin
eklenmesi önerilecek (kaynak tablosundan üretilen golden fixture ile).

---

## PHASE 2 bulguları için regresyon analizi (2026-09-21)

Henüz kod değiştirilmedi; aşağısı **düzeltme uygulanmadan önce** yapılan
etki analizidir. Amaç: hangi testlerin kırılacağını önceden bilmek.

### Etkilenecek kod dosyaları

| Değişiklik | Dosya | Etki alanı |
|---|---|---|
| CHANGE-001 (F: 69→169) | `src/scoring/mmpiKeys.ts` | F ham puanı → geçerlilik eşikleri, F T puanı, F-K endeksi, `fkIndexAnalysis`, Es/Do anahtarlarıyla kesişim |
| CHANGE-002 (Es yön) | `src/scoring/mmpiDerived.ts` | Es ham puanı → `SPECIAL_META`, `specialInterpretation` |
| CHANGE-003 (FEM yön) | `src/scoring/mmpiDerived.ts` | W_FEM ham → `WIGGINS_NORMS.FEM` T puanı |
| CHANGE-004 (AVD anahtar) | `src/scoring/mmpiDerived.ts` | AVD ham → `PERSONALITY_CUTOFFS.AVD` eşikleri, eşik çipleri |
| CHANGE-005 (HST anahtar) | `src/scoring/mmpiDerived.ts` | HST ham → `PERSONALITY_CUTOFFS.HST` eşikleri |

### Taranan test dosyaları (anahtar/norm bağımlılığı)

`grep -l "SCORING_KEYS\|TURKISH_NORMS\|SPECIAL_KEYS\|PERSONALITY_KEYS\|WIGGINS_" tests/`:

| Test dosyası | Risk |
|---|---|
| `tests/mmpiScoring.test.ts` | **YÜKSEK** — F ham puanı ve geçerlilik eşikleri doğrulanıyorsa CHANGE-001 kırar |
| `tests/mmpiExtended.test.ts` | **YÜKSEK** — türetilmiş ölçekler (Es/FEM/AVD/HST) doğrulanıyorsa CHANGE-002..005 kırar |
| `tests/rawScoreRoundTrip.test.ts` | **ORTA** — ham puan ↔ cevap matrisi turu; anahtar değişirse fixture güncellenmeli |
| `tests/build.test.ts` | **DÜŞÜK** — yalnızca derleme/PDF eşleşmesi |

### Ön koşul (düzeltme öncesi yapılacak)

1. `tests/mmpiScoring.test.ts` ve `tests/mmpiExtended.test.ts` içindeki
   fixture'ların hangi **sabit ham puanı / T puanını** beklediği çıkarılacak.
2. Kaynak değerlere göre **doğru beklenen çıktı** elle hesaplanacak.
3. Düzeltme sonrası kırılan testler ya fixture güncellemesi (kasıtlı davranış
   değişikliği) ya da **REGRESSION** (istenmeyen yan etki) olarak sınıflanacak.

### Yeni test önerisi (PHASE 14)

Kaynak anahtarlarından üretilen **"key integrity" golden testi** eklenmeli:

```
L=15, F=44+20, K=30, Hs=33, D=60, Hy=60, Pd=50, Mf=60/60, Pa=40, Pt=48,
Sc=78, Ma=46, Si=70, PAR=22, SZD=22, STY=36, ANT=25, BDL=22, HST=20, NAR=31,
AVD=38, DEP=20, CPS=15, PAG=14, MAC=49, ICAS=8, SOC=27, DEP_W=33, FEM=30,
MOR=23, REL=12, AUT=20, PSY=48, ORG=36, FAM=16, HOS=27, PHO=27, HYP=25,
HEA=28, OH=33, Es=68, A=39, R=40, Do=28, Dy=57
```

Bu test, başlıktaki madde sayısı ile `dogru.length + yanlis.length` uyuşmazlığını
**derleme zamanında değil test zamanında** yakalar. HST (13 vs 20) ve
AVD (25 vs 38) hataları bu testle otomatik yakalanırdı.

Mevcut durumda böyle bir test **yoktur** → bu, test kapsamındaki en büyük boşluktur.

---

## Düzeltme paketi sonrası — 2026-09-21 (Oturum 3)

### Komut sonuçları

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | **PASS** (tsc --noEmit, hata yok) |
| `npm test` | **294 / 294 PASS** (18 → **19 suite**) |
| `npm run build` | **PASS** (`dist/index.html` + `optik-form.html` üretildi) |

Baseline 287 testti; **+7 yeni test** (`tests/mmpiKeyIntegrity.test.ts`).

### REGRESSION kaydı

**REGRESSION YOK.** Düzeltme paketinden sonra hiçbir mevcut test kırılmadı.

Neden beklenen kırılma olmadı:
- `tests/mmpiScoring.test.ts` F için yalnızca **uzunluk** doğrular
  (`trueItems.length === 44`, `falseItems.length === 20`) → 69→169 değişimi
  uzunluğu değiştirmez.
- Doğrudan `69` / `169` madde numarasına bağlı hiçbir assertion yok
  (`grep -rn "\b69\b\|\b169\b" tests/*.ts` → yalnızca sayısal değer olarak
  kullanılanlar).
- Türetilmiş ölçekler (`Es`, `FEM`, `AVD`, `HST`) için **madde düzeyi doğrulama
  yapan test yoktu**; yalnızca `derivedScales.length === 33` sayısı kontrol
  ediliyordu, o da değişmedi.

> **Test kapsamı bulgusu:** Yukarıdaki üç madde, 5 P0 hatasının neden
> yıllarca görünmez kaldığını açıklar. Düzeltmeden önceki `TEST_AUDIT.md`
> analizi bunu doğru öngörmüştü ("hangi testler kırılacak" listesi boş çıktı —
> çünkü kapsam yoktu).

### `optik-form.html` değişikliği

`npm run build` çıktısı olarak yeniden üretildi. Diff **yalnızca** CSP
`script-src` sha256 hash'idir:

```
- script-src 'sha256-pdI1uXrCpu0+Y5Uqz9b2zYlM/Wde1Trr0lYHPlc1U/g='
+ script-src 'sha256-tEjXQus+swxg+7Kj/G4kPRq2vXry2YGHh/5SHiLSPvg='
```

Kaynak kod değiştiği için beklenen ve zorunludur (`DECISION-014`).
`tests/build.test.ts` bu dosyanın gömülü PDF ile tutarlılığını doğrular → PASS.

### Yeni test — `tests/mmpiKeyIntegrity.test.ts` (7 test)

Testin **denetim değeri** kanıtlandı: ilk çalıştırmada daha önce bilinmeyen
bir kaynak içi tutarsızlığı ortaya çıkardı (`OH`: başlık 33, tablo 31).

| Test | Ne doğrular |
|---|---|
| geçerlik + klinik ölçekler | 12 ölçeğin madde sayısı = kaynak Ek 9 başlığı |
| Mf cinsiyet çifti | İki anahtar 60 madde + **aynı madde kümesi** (yalnızca yön farkı) |
| kişilik bozuklukları | 11 ölçek (PAR…PAG) madde sayısı |
| alkol ölçekleri | MAC 49 (dipnot kuralı), ICAS 8 |
| Wiggins | 13 içerik skalası |
| özel ölçekler | OH 31, Es 68, A 39, R 40, Do 28, Dy 57 |
| regresyon koruması | CONFLICT-008..012 düzeltmeleri kalıcı mı |

Ek yapısal kontroller (tüm ölçekler): tekrarlanan madde yok, Doğru/Yanlış
kümeleri ayrık, tüm maddeler 1-566 aralığında.

### Sıradaki test işleri (PHASE 14)

1. `tests/mmpiScoring.test.ts` içine **madde düzeyi** doğrulama eklenmeli
   (şu an yalnızca uzunluk). Öneri: `compare-keys.py` çıktısından üretilen
   golden fixture ile F/Es/FEM/AVD/HST için tam liste karşılaştırması.
2. `TURKISH_NORMS` 24 hücresi için kaynak kanıtı (Ek 10 + Bölüm 8) → PHASE 6.

---

## Norm denetimi sonrası — 2026-09-21 (Oturum 4)

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm test` | **297 / 297 PASS** (20 suite) |
| `npm run build` | **PASS** |

Test sayısı: 294 → **297** (+3 norm testi, `mmpiKeyIntegrity.test.ts` içinde).

### Yeni norm testleri (aynı dosyaya eklendi)

| Test | Ne doğrular |
|---|---|
| 26 norm hücresi | `TURKISH_NORMS` = Tablo 30 (kitap s.195) birebir |
| K-eklenmiş satır kontrolü | K düzeltmeli ölçekler ham (K'sız) satırları kullanmıyor |
| Regresyon koruması | Geçerlik bölümünün **tutarsız** dipnotları (10.11 / 13.90 / 13.54) koda sızmamış |

Üçüncü test kasıtlı olarak bir **"yanlış düzeltme önleyici"** testtir: gelecekte
biri kitabın s.34/s.38 dipnotuna bakıp "kod yanlış" diye düzeltme yaparsa,
test kırmızıya döner ve gerekçeyi (`CONFLICT-001/002 → REJECTED`) hatırlatır.

### REGRESSION kaydı

**REGRESSION YOK.** Bu oturumda **hiç kod değişikliği yapılmadı** — yalnızca
test ve dokümantasyon eklendi. Denetim sonucu iki P0 çelişki **REJECTED**
(kod doğruydu).

### Test kapsamı boşluğu — KAPANDI

`TEST_AUDIT.md` (Oturum 1) şunu kaydetmişti:
> "`TURKISH_NORMS` (13 ölçek × 2 cinsiyet = 26 hücre) ve `WIGGINS_NORMS` buradan
> doğrulanacak. `mmpiKeys.ts` içinde L, F, K dışındaki 24 norm hücresi için şu an
> **hiçbir kaynak kanıtı yok**."

Artık 26 hücrenin tamamı kaynaklı ve testle korunuyor.

Kalan açık: **`WIGGINS_NORMS`** (13 ölçek) için hâlâ kaynak kanıtı yok.
Wiggins normları kitapta Ek 9'da verilmez; Bölüm 7 (s.178-181) metni
okunmalıdır → PHASE 8.

---

# Oturum 3 (devam) — PHASE 4: konfigürasyonlar, F-K, TR endeksi

Tarih: 2026-09-21 · Kapsam: kitap s.56-61 (PDF p36 L – p38 R)

## Yapılan kod değişikliği

`CHANGE-007` — TR endeksi kesme puanı kaynağa çekildi (P1):
`consistent = score <= 3` → `score <= 2`; kaynakta olmayan yorum iddiaları
kaldırıldı. Ayrıntı: `CODE_CHANGES.md`.

## Komutlar ve sonuçlar

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | **0 hata** |
| `npx tsx --test tests/mmpiKeyIntegrity.test.ts` | **14/14 PASS** (10 mevcut + 4 yeni) |
| `npm test` (tam suite) | **301/301 PASS** · 21 suite · 113 383 ms |
| `npm run build` | **0** — `dist/index.html` + `optik-form.html` üretildi |

Önceki tur: 297/297 (20 suite). Şimdi 301/301 (21 suite) → **+4 test, +1 suite**.

## Yeni testler (PHASE 4 suite — `tests/mmpiKeyIntegrity.test.ts`)

1. **TR = 3 → uyarı var / TR = 2 → uyarı yok.** Kaynak s.59'daki "3 puan ya da
   daha fazla" kuralını sabitler. Eski kodda 3 puan uyarısızdı → bu test o
   kaymayı bir daha geri getirmez.
2. **Tablo 6 → `TR_PAIRS` birebir** (16 çift, sıra dahil). Kaynak tablosundaki
   çift değişirse kırmızıya döner.
3. **Tablo 7 → `CARELESS_PAIRS` birebir** (12 çift + 12 yön: Aynı/Farklı).
4. **F-K bantları**: 9 geçerli · 10 sahte-kötülük · 17 kritik · 8-11 notu her iki
   dalda. Kaynağın 8-11 ve >16 bantlarını sabitler.

## Neden bu testler gerekliydi

- TR kesme puanı kayma sınıfı **görünmezdi**: kod kendi yorumunda Dahlstrom 1972'ye
  atıf yapıyordu ama sayıyı 1 puan kaydırmıştı; bunu kontrol eden test yoktu.
- Tablo 6/7 çiftleri **madde numarası** verisidir; tek basamak hatası (ör. 24↔42)
  sessizce yanlış tutarlılık puanı üretir. Artık kaynak tabloya bağlıdır.

## REGRESSION kaydı

**REGRESSION YOK.**
- Mevcut TR testleri (1 puan uyarısız, 4 puan uyarılı) yeni kesme puanında da
  doğrudur → değişmedi.
- Başka hiçbir suite etkilenmedi (301/301).
- `optik-form.html` build ile yeniden üretildi ve **senkron** durumda
  (`build.test.ts` bu senkronu zorunlu kılar).

## Kapsam boşlukları (açık)

- **`WIGGINS_NORMS`** (13 ölçek): hâlâ kaynak kanıtı yok → PHASE 8 (s.178-181).
- **Dikkatsizlik kesme puanı (4)** ve **F-K negatif eşiği (−8)**: kaynakta
  bulunamadı → `UNVERIFIED_DATA.md`.
- **K+ profili örüntüsü**: kaynakta tanımlı, kodda yok → `MISSING-KPLUS-001` (P3).

---

# Oturum 3 (devam) — PHASE 4 batch 3: Konfigürasyon 6-13

Tarih: 2026-09-21 · Kapsam: kitap s.48-55 (PDF p32 L – p35 R)

## Kod değişikliği

`CHANGE-008` (P1) — dört konfigürasyon eşiği kaynağa çekildi:
`ascending` (+F 45-55) · `descending` (+K ≥ 40) · `all-true` (40→35) ·
`help-seeking` (105→100). Ayrıntı: `CODE_CHANGES.md`.

## Komutlar ve sonuçlar

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | **0 hata** |
| `npx tsx --test tests/mmpiKeyIntegrity.test.ts tests/mmpiExtended.test.ts` | **46/46 PASS** |
| `npm test` (tam suite) | **307/307 PASS** · 22 suite · ~120 s |
| `npm run build` | **PASS** — `optik-form.html` senkron |

Önceki tur: 301/301 (21 suite) → **+6 test, +1 suite**.

## Yeni testler (PHASE 4 batch 3 — 6 test)

1. Konf. 7: L,K = 30 → "tümüne doğru"; L,K = 38 → değil (kaynak 35)
2. Konf. 9: F = 100 → "yardım isteği"; F = 101 → değil
3. Konf. 4: F = 50 → "yükselen"; F = 62 → değil (kaynak aralığı 45-55)
4. Konf. 5: K = 42 → "azalan"; K = 35 → değil (kaynak aralığı 40-45)
5. Konf. 10: F = 70 → "geleneksel olmayan"; F = 69 → değil (sınır > 69)
6. Konf. 13: |F−K| = 2 → "akut/süreğen"; |F−K| = 10 → değil (sınır ≤ 6)

Ayrıca `mmpiExtended.test.ts` içindeki "tümüne yanlış" testi, kaynak içi
tutarsızlığı (DECISION-020) yorumlayacak biçimde gerekçelendirildi.

## Ampirik keşif (bu turda koşuldu)

| Yanıt | L T | F T | K T | Konfigürasyon |
|---|---|---|---|---|
| Tümüne "Yanlış" | 81.2 | **75.3** | 82.3 | "Tümüne yanlış" ✅ |
| Tümüne "Doğru" | 26.5 | **120.0** (kırpma sınırı) | 22.1 | **YOK** → CONFLICT-019 |

Bu iki koşum, kaynağın Konf. 8 (80) ve Konf. 7 (120) eşiklerinin
uygulanabilirliğini **kanıta dayalı** olarak değerlendirmeyi sağladı:
biri kaynak içi tutarsızlık (REJECTED), diğeri gerçek bir uygulama boşluğu
(OPEN).

## REGRESSION kaydı

**REGRESSION YOK.** 307/307 geçti; `optik-form.html` build ile yeniden
üretildi ve senkron.

---

# Oturum 3 (devam 2) — PHASE 4 kapanışı + CONFLICT-019/020 düzeltmeleri

Tarih: 2026-09-21

## Kod değişiklikleri

- `CHANGE-009` (P1): `all-true` `F > 120` → `F >= 120` (T kırpma nedeniyle ölü
  kural canlandırıldı)
- `CHANGE-010` (P2): `credible` `K <= 65` sınırı kaldırıldı (kaynakta yok)

## Komutlar ve sonuçlar

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | **0 hata** |
| `npx tsx --test tests/mmpiKeyIntegrity.test.ts` | **22/22 PASS** (+2 test) |
| `npm test` (tam suite) | **309/309 PASS** · 22 suite · ~116 s (301 → 307 → 309) |
| `npm run build` | **PASS** — `optik-form.html` yeniden üretildi ve senkron |

## Yeni testler (+2)

1. **Konf. 7 kırpma farkındalığı:** `detectValidityConfig(26.5, 120, 22.1)` →
   "Tümüne Doğru" (end-to-end profil değerleriyle; önceden `YOK` dönüyordu)
2. **Konf. 12 sınır düzeltmesi:** `detectValidityConfig(50, 65, 70)` →
   "Güvenilir Cevaplayıcı" (önceden `YOK` dönüyordu)

## Erişilebilirlik analizi (regresyon güvencesi)

`detectValidityConfig` ilk-eşleşen-kazanır olduğundan, sınır değişikliklerinin
diğer örüntüleri erişilemez kılmadığı **15 konfigürasyonun sırası ve koşulları
dökülerek** doğrulandı (DECISION-023). Etkilenmeyenler: `reverse-v`,
`closed-v`, `v-shape`, `ascending`, `descending`, `random`, `all-false`,
`help-seeking`, `unconventional`, `frank`, `acute-chronic`, `virtuous`,
`rigid`.

## REGRESSION kaydı

**REGRESSION YOK.** 309/309; `optik-form.html` build ile güncel.

---

# Oturum 4 — PHASE 9/10 batch 1 (s.66-69): kod değişikliği YOK

Tarih: 2026-09-21 · Kapsam: kitap s.66-69 (PDF p41 L – p42 R)

## Kod değişikliği

**Yok.** Bu batch yalnızca kaynak okuma + karşılaştırma + çelişki kaydıdır.
CONFLICT-024 (üçlü kod tipleri) **tasarım kararı** gerektirdiği ve kaynağın
tam üçlü kod seti henüz çıkarılmadığı için kod değiştirilmedi.

## Testler

Bu batch'te kod dosyaları değişmedi; regresyon riski yok. Kaynak okuma
sırasında koşulan doğrulama:

| Komut | Sonuç |
|---|---|
| `python3 scripts/mmpi-audit/extract.py ocr --pages 41-42 --dpi 200` | 4 dosya üretildi (p041_L/R, p042_L/R) |
| Görsel doğrulama (pymupdf dpi 135, tam sayfa) | `v_p041_full.png` · `v_p042_full.png` |
| `grep` kod karşılaştırması | `CODES`: 45 iki noktalı, 0 üçlü kod · `slice(0, 2)` |

**REGRESSION: YOK** (kod değişmedi).

## Ortam notu

Sandbox sıfırlanması sonrası ortam yeniden kuruldu:
`npm install` (58 paket) · `pip3 install --break-system-packages pymupdf
opencv-python-headless rapidocr-onnxruntime` · `opencv-python-headless`
**force-reinstall** (libGL.so.1 hatası → çözüldü).


---

# Oturum 5 — PHASE 9/10 batch 7: D kod bloğu kapanışı (s.88-92)

Kod değişikliği **YOK** (salt okuma + karşılaştırma turu; CONFLICT-024/027/030
kararı tüm kod seti çıkarıldıktan sonra verilecek).

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` | **0 hata** |
| `npm test` (tam suite) | **313/313 PASS** · 23 suite |
| `npm run build` | **PASS** — `optik-form.html` **değişmedi** (senkron korundu) |

**REGRESSION YOK.**

Yeni araç: `scripts/mmpi-audit/cmp-d-batch7.ts` — `codeInterpretation()` çağrısının
**kırpma davranışını** (CONFLICT-030) kanıtlayan karşılaştırma scripti
(`273/723` → `27/72` vb. eşlemesi + `seeAlso` döngü testi).

---

# Oturum 5 — PHASE 9/10 batch 8: Hy T bantları + Hy kod bloğu I (s.95-99)

Kod değişikliği **YOK** (salt okuma + karşılaştırma; CONFLICT-024/030/031 kararı
tüm klinik ölçek blokları çıkarıldıktan sonra verilecek).

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` | **0 hata** |
| `npx tsx --test tests/mmpiKeyIntegrity.test.ts` | **26/26 PASS** |
| `npm test` (tam suite) | **313/313 PASS** · 23 suite |
| `npm run build` | **PASS** — `optik-form.html` senkron |

**REGRESSION YOK.**

Yeni araç: `scripts/mmpi-audit/cmp-hy-batch8.ts` — Hy bloğu kod kimliği
çakışmasını kanıtlar (`32` → `23`, `321` → `23`, `345/435` → `34/43`,
`346/436` → `36/63`); CONFLICT-031'in ampirik dayanağı.

---

# Oturum 5 — PHASE 9/10 batch 9: Hy bloğu kapanışı + nevrotik üçlü (s.100-107)

Kod değişikliği **YOK** (salt okuma + karşılaştırma; CONFLICT-024/030/031/033
kararı tüm klinik ölçek blokları çıkarıldıktan sonra verilecek).

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` | **0 hata** |
| `npx tsx --test tests/mmpiKeyIntegrity.test.ts` | **26/26 PASS** |
| `npm test` (tam suite) | **313/313 PASS** · 23 suite |
| `npm run build` | **PASS** — `optik-form.html` senkron |

**REGRESSION YOK.**

Yeni araç: `scripts/mmpi-audit/cmp-hy-batch9.ts` — Hy bloğu II kod
karşılaştırması (`37/73`, `38/83`, `39/93`, `30/03` → hepsi kendi kaydına
eşleşiyor; `394/934` → `39/93`e kırpılıyor).

---

# Oturum 5 — PHASE 9/10 batch 10: Pd anahtarı + T bantları (s.107-110)

Kod değişikliği **YOK** (salt P0 doğrulama turu).

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` | **0 hata** |
| `npx tsx --test tests/mmpiKeyIntegrity.test.ts` | **26/26 PASS** |
| `npm run build` | **PASS** — `optik-form.html` senkron |

Yeni araç: `scripts/mmpi-audit/cmp-tablo11.ts` — Tablo 11 ↔ `SCORING_KEYS.Pd`
birebir karşılaştırma (**24+26=50 MATCH**).


---

# Oturum 6 (devam) — PHASE 9/10 batch 13: Pd bloğu III + kapanış

Tarih: 2026-09-21 · Kapsam: kitap s.118-121 (PDF p67 L – p68 R)

## Kod değişikliği

`CHANGE-012` (P2) — `CODES['04']` (40/04): "**negatifik**" → "**vegetatif**"
depresyon (kaynak s.120, 400 dpi görsel · DECISION-027).

## Komutlar ve sonuçlar

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | **0 hata** |
| `npx tsx --test tests/mmpiKeyIntegrity.test.ts` | **29/29 PASS** (+3) |
| `npm test` (tam suite) | **316/316 PASS** · 24 suite · ~150 s |
| `npm run build` | **PASS** — `optik-form.html` senkron |

Önceki tur: 313/313 (23 suite) → **+3 test, +1 suite**.

## Yeni testler (PHASE 9/10 batch 13 — 3 test)

1. `40/04` metni kaynağın "**vegetatif depresyon**" terimini taşır
2. `40/04` metni kaynakta olmayan "**negatifik**" terimini **taşımaz**
3. `40/04` gövdesinin kalanı kaynakla uyumlu kalır (regresyon: kızgın / geri
   çekilmiş / pasif olarak direnme / psikomotor retardasyon)

## REGRESSION kaydı

**REGRESSION YOK.** 316/316 geçti; `optik-form.html` build ile yeniden üretildi
ve senkron.

## Not

Bu turda **sandbox bağımlılıkları yeniden kuruldu** (`npm install`, `tsx` +
`typescript`): `tsc: not found` hatası alındı → bağımlılıklar kuruldu →
typecheck/build yeniden koşuldu ve geçti.

---

# PHASE 9/10 batch 18 — Pt kapanışı + Sc (8) (kitap s.142-146)

Tarih: 2026-09-22 · Kapsam: kitap s.142-146 (PDF p79 L – p81 L)

## Kod değişikliği

`CHANGE-013` (P2) — `SC_T_BANDS` `T 21-44`: "bakışları konservatiftir" →
"**bakış açıları konformaldir**" (kaynak s.146, 400 dpi kadraj · DECISION-028).

## Komutlar ve sonuçlar

| Komut | Sonuç |
|---|---|
| `python3 scripts/mmpi-audit/extract.py render --pages 79-81 --dpi 150` | tam sayfa görseller (`p079_L…p081_L`) |
| 400 dpi bindirmeli kırpma (`tbl15_L` / `tbl15_R`) | Tablo 15 sütun kaybı olmadan okundu |
| `npx tsx scripts/mmpi-audit/cmp-sc-batch18.ts` | **Tablo 15: Doğru 59 + Yanlış 19 = 78 → BİREBİR MATCH** · norm 29.82/31.06 MATCH · bantlar 5/5 · kod kapsamı 7 VAR / 3 YOK |
| `npm run typecheck` | **0 hata** |
| `npx tsx --test tests/mmpiKeyIntegrity.test.ts` | **37/37 PASS** (+8) |
| `npm test` (tam suite) | **324/324 PASS** · 26 suite · ~119 s |
| `npm run build` | **PASS** — `optik-form.html` senkron |

## Yeni testler (8 test)

1. Sc madde sayısı kitap başlığıyla uyumlu (59 + 19 = 78)
2. Sc **Doğru** listesi Tablo 15 ile birebir (fazla/eksik yok)
3. Sc **Yanlış** listesi Tablo 15 ile birebir (fazla/eksik yok)
4. Sc `K Eklemeli` → `K_CORRECTION.Sc = 1` + norm çifti (29.82 / 31.06)
5. `21-44` bandı "konformaldir" terimini taşır
6. `21-44` bandı "konservatif" terimini **taşımaz**
7. `21-44` bandının kalanı kaynakla uyumlu (regresyon)
8. Sc bant sınırları `[100,∞) · [75,99] · [60,74] · [45,59] · [0,44]` + 100+ bandında "95" notu

## REGRESSION kaydı

**REGRESSION YOK.** 324/324 geçti; `optik-form.html` build ile yeniden üretildi.
Değişiklik yorum **metni** katmanındadır; ham puan/T-skoru hesabı, bant sınırları
ve geçerlik kapıları aynı kaldı (puanlama testleri dahil tüm suite yeşil).

---

# PHASE 9/10 batch 19 — Sc kapanışı + Ma Tablo 16 (kitap s.147-150)

Tarih: 2026-09-22 · Kapsam: kitap s.147-150 (PDF p81 R – p83 L)

## Kod değişikliği

**YOK.** Denetim turu; P0 katmanı (Tablo 16) temiz çıktı, bulunanlar "eksik
içerik" sınıfında → CONFLICT-024/025/026/027/033/034'e işlendi (DECISION-027).

## Komutlar ve sonuçlar

| Komut | Sonuç |
|---|---|
| `extract.py render --pages 81-84 --dpi 150` + 430 dpi bindirmeli kadraj | Tablo 16 ve kapanış cümleleri görselden okundu |
| `extract.py ocr --pages 82-84 --dpi 200` + `inventory.py` | başlık envanteri: s.147 `89/98` · s.148 `80/08` · s.150-151 bant etiketleri |
| `npx tsx scripts/mmpi-audit/cmp-ma-batch19.ts` | **Tablo 16: 35 + 11 = 46 → BİREBİR MATCH** · norm 19.96/19.72 MATCH · `K_CORRECTION.Ma = 0.2` · Sc kapanışı 8/10 ve 7/8 parça |
| `npm run typecheck` | **0 hata** |
| `npx tsx --test tests/mmpiKeyIntegrity.test.ts` | **43/43 PASS** (37 → **+6**) |
| `npm test` (tam suite) | **330/330 PASS** · 26 suite |
| `npm run build` | **PASS** — `optik-form.html` senkron (kod değişmedi, build idempotent) |

## Yeni testler (6 test)

1. Ma madde sayısı kitap başlığıyla uyumlu (35 + 11 = 46)
2. Ma **Doğru** listesi Tablo 16 ile birebir (fazla/eksik yok)
3. Ma **Yanlış** listesi Tablo 16 ile birebir — **dikiş hattındaki `148` dahil**
4. Ma `(K Eklemeli)` → `K_CORRECTION.Ma = 0.2` + norm çifti (19.96 / 19.72)
5. `89/98` gövdesi + `diagnosis` regresyonu (şizofreni / madde psikozu)
6. `80/08` gövdesi + `diagnosis` regresyonu (Şizoid Kişilik; küçük harfli
   "danışmanlık görüşmelerinde" biçimi dahil)

## REGRESSION kaydı

**REGRESSION YOK.** 330/330 geçti; puanlama matematiğine dokunulmadı.
Not: **büyük/küçük harf duyarsız** karşılaştırma kuralı ilk kez bir bulguyu
yanlış positivesizlemeden kurtardı (`cmp-ma-batch19.ts`).

**Denetim aracı (batch 19 — `scripts/mmpi-audit/cmp-ma-batch19.ts`):** Tablo 16'yı
**birebir** (`toSorted` dizi karşılaştırması; kadraj `64·181·251·148` sütunundan
kestiği için `148` ayrıca doğrulanır) ve Ma norm + K eklemesini doğruluyor; Sc
kapanışında `89/98` ve `80/08` gövdelerini **10 ve 8 parçalı** cümle kontrolünden
geçiriyor.
**İlk koşutta bulunan eksik (test edilmeden önce yakalandı):** cümle eşleştirmesi
**büyük/küçük harfe duyarlı** yazılmıştı; kaynak cümlesi kodda `"; "` ile
birleştirildiği için ortadaki cümleler küçük harfle başlıyor → "Danışmanlık
görüşmelerinde…" ve "Bu kod tipindeki 7 ve 2…" **olmadığı halde YOK** göründü.
İki taraf da `toLowerCase()` ile düzeltildi → `89/98` 8/10, `80/08` 7/8.
**Kural:** `cmp-*.ts` coverage kontrolleri **her zaman case-insensitive** yapılır.
**Kalıcı testlere alınanlar:** Tablo 16 Doğru/Yanlış **birebirlik**, 46 toplam,
Ma norm + `K_CORRECTION.Ma`, `89/98` (yaş/üçüncü yükselen **hariç** tam metin) ve
`80/08` gövde + Olası Tanı kilitleri. **Kod değişikliği yok** → `npm test`
**330/330 PASS** (28 suite), `mmpiKeyIntegrity` **43/43 PASS**, `npm run build`
**PASS** (`optik-form.html` senkron).

---

## batch 20 (2026-09-22) — Ma bant/kod bloğu + 🎯 Tablo 17 (Si)

**Koşulan komutlar:**

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` | ✅ **0 hata** |
| `npx tsx scripts/mmpi-audit/cmp-ma-si-batch20.ts` | **6/6 P0 OK** (Tablo 17 birebir + norm/K) · Ma bantları **23/23 parça** · **7 FARK** = beklenen içerik eksikleri (025/026/027/036/039) |
| `npx tsx --test tests/mmpiKeyIntegrity.test.ts` | **50/50 PASS** (batch 19: 43 → +7) |
| `npm test` | **337/337 PASS** · 30 suite |
| `npm run build` | ✅ PASS (`optik-form.html` değişmedi — `src/` dokunulmadı) |

**Eklenen 7 kalıcı test:**
1. `Si madde sayısı kitabın başlığıyla uyumlu: 34 + 36 = 70`
2. `Si Doğru listesi Tablo 17 ile birebir` (fazla/eksik iki yönlü küme farkı)
3. `Si Yanlış listesi Tablo 17 ile birebir` — **OCR'ın düştüğü `99`** ve
   **yırtık hattındaki `119/309/451`** ayrıca doğrulanır + 70 benzersiz madde
4. `Si normları Tablo 30'u izler; Tablo 17 dipnotundaki 26.86 kaynak içi çelişkidir`
   (23.86/29.88 + SD 7.97/7.52 + **`K_CORRECTION`'da `Si` OLMAMALI** negatifi)
5. `Ma bant kapsamı kaynakla birebir: 85+ / 70-84 / 60-69 / 45-59 / 21-44`
   (bant sınırları `deepEqual` + 5 kaynak cümlesi; `60-75` paragrafının 60-69'da
   korunduğu dahil)
6. `BİLİNEN EKSİK (CONFLICT-026/025)` — **negatif kilit**: `doesNotMatch(/Yalnızca alt test 9/)`;
   içerik eklendiğinde test **bilinçli** güncellenmek zorunda (sessiz düzelme yok)
7. `90/09 gövdesi sadık; 91/19 gövdesi kanonik anahtar çarpışmasına kurban gidiyor`
   — `codeInterpretation('91').code === '19/91'` ve `doesNotMatch(/Ender görülmektedir/)`
   (**CONFLICT-036 vaka 2** kilidi)

**Araç notu:** `cmp-ma-si-batch20.ts` batch 19 kuralını uygular — tüm parça
aramaları `toLowerCase()` + boşluk/noktalama katlaması (`norm()`); ayrıca Tablo 17
kaynak listesi **script içine gömülü** (OCR'dan alınmadı, `TABLO-NUMBERS`).
`CODES` dışa aktarılmadığı için denetim `KNOWN_CODES` + `codeInterpretation()`
üzerinden yapılıyor (kamusal API üzerinden test = kırılgan olmayan bağlantı).
`src/` değişmedi → `optik-form.html` yeniden üretildi, **fark yok** (doğrulandı).

> **Sayaç notu (batch 20):** `npm test` çıktısındaki `# suites` değeri node'un
> `describe`/dosya sayımına göre değiştiği için tarihsel satırlarda (24/26/28)
> tutarsız görünüyor; **yetkili sayı `# tests` / `# pass`** değerleridir
> (batch 18: 324 · batch 19: 330 · batch 20: **337**, hepsi fail 0). Yeni
> kayıtlarda suite sayısı yerine test sayısı yazılacak.

## Batch 21 — Si (0) KAPANIŞI (kitap s.157-158) · 2026-09-22

**Yeni denetim aracı:** `scripts/mmpi-audit/cmp-si-batch21.ts` (6 bölüm: bant
kapsamı+eşikler · bant metinleri cümle cümle · 70+ kuyruğu · 9 Bakınız hedefi ·
`049`/`027(8)` gövde ve kırpma çözümü · s.157 giriş paragrafı · boş sayfa kaydı).
Çıktı: **6 FARK** — hepsi **yorum katmanı** kaydı (eksik içerik), **P0 bulgu yok**.

**Kalıcı testler (6) — `tests/mmpiKeyIntegrity.test.ts` +1→56:**
1. Si bant kapsamı/eşikleri `[70,∞) (60,69) (45,59) (0,44)` + `rangeLabel` dizisi
2. `60-69` · `45-59` · `25-44` bandı metinleri **kaynak cümleleriyle** regex kilidi
3. **BİLİNEN EKSİK** (025/033): `70+` bandında "Nevrotik üçlüde yükselme" ve
   "Ayrıca bakınız, 2, 7 ve 8" **yoktur** → bir gün eklenirse test bilinçli kırılacak
4. s.157 Bakınız listesi: `01/10`…`09/90` → `10/01`…`90/09` **kayıt + etiket birebir**
5. **CONFLICT-030 kilidi:** `KNOWN_CODES` **tamamı iki haneli**; `codeInterpretation('049')`
   → `40/04`, `codeInterpretation('027(8)')` → `20/02`; iki kaynak cümlesi **yok**
6. s.157 giriş paragrafının 3 cümlesi kodda **yok** (20 puan · eyleme vurukluk · ruminatif)

**Çalıştırılanlar:** `npx tsc --noEmit` → **0 hata** · `npx tsx --test
tests/mmpiKeyIntegrity.test.ts` → **56/56 PASS** · `npm test` → **343/343 PASS**
(30 suite) · `npm run build` → **PASS** (`src/` değişmediği için `optik-form.html`
üretim farkı **YOK**) · `git diff --check` temiz.

**Kural uygulaması:** coverage kontrolleri `toLowerCase()` + noktalama kırpan `norm()`
ile (cmp'de parantezler de soyuldu: "(Ayrıca bakınız…)" fragmenti böyle bulundu);
bant/kod başlıkları **görselden** sayıldı (`BAND-HEAD-DROP` + `INVENTORY-DOUBLE-COUNT`).

## CHANGE-014 — kod çözümlemesi blok-yerel + koşullu yorumlar · 2026-09-22

**Kod değişikliği olduğu için test ZORUNLU (protokol).** `mmpiKeyIntegrity`
**56 → 63** · `mmpiInterpretation` **29 → 38** · tam suite **343 → 359 PASS** (34 suite).

**3 eski kilit YENİ davranışa güncellendi (geri alınmadı, silinmedi):**
1. batch 20 `91/19`: eskiden `doesNotMatch(/Ender görülmektedir/)` (kırpma kurbanı
   kanıtı) → artık `codeInterpretation('91')` **`91/19` + `block:'Ma'`** ve cümleler
   **VAR**; `'19'` için tersine "Hs gövdesi etkilenmedi" kilidi eklendi
2. batch 21 `049`/`027(8)`: eskiden `code === '40/04'` / `'20/02'` → artık kendi
   gövdeleri + **kırpmanın gittiğinin negatif kanıtı** (`794`·`8726`·`273/723`·
   `213/231` → `undefined`)
3. `12 ↔ 21` **kimlik** testi (`assert.equal`) — `withConditions()` her çağrıda yeni
   nesne üretip kırdı → çözümlenen kayıt **cache**'lendi (`RESOLVED_CACHE`), test
   eski haliyle geçiyor (davranış sözleşmesi korundu)

**Yeni `tests/mmpiKeyIntegrity.test.ts` (+7):** `91/19` ve `64/46` gövde sadakati
(alıntı regex'leri) · `KNOWN_BLOCK_CODES` = tam 4 kayıt · `12↔21` singleton +
blok/ortak ayrımı · `activeCodeConditions` **49** (K>50 ∧ Si<50; ikisi de
sağlanmazsa `[]`) · **89** `manual` + üçüncü-yükselen koşulu · **13/12** eşikleri
(fark ≤ 5 T) · **64/46** Sc > 70 koşulu · **ölü anahtar testi**: 9 koşullu
anahtarın tamamı her iki sıralamadan çözümleniyor (`70`→`07`, `86`→`68` düzeltmesi
bu testle yakalandı)

**Yeni `tests/mmpiInterpretation.test.ts` (+9):** 3 desen testi (Şekil 18/19/20;
eşik sınır vakaları dâhil: Hs 70+ çıkarsa şapka **bozulur**) · `codeInterpretationForProfile`
(`049` → `Si`; `794`/`8726` → `undefined`; `27` 85 T koşulu profil T'siyle açılıyor) ·
**SSR render** ×3 (`MMPICodeTab`: `64/46` + "Paranoya (6)" blok etiketi + koşul
kutusu **yok**; Sc yükselince "8 alt testi de yükselmişse…" + `s.131` **var**;
`MMPIPrintReport` aynı kaydı kullanıyor) · "normal profilde hiçbir kritik desen
görülmez" (`deepEqual([])`) testi **yeni desenlerle de geçiyor** (yanlış pozitif yok)

**Çalıştırılanlar:** `npx tsc --noEmit` → **0 hata** · `npm test` → **359/359 PASS** ·
`npm run build` → **PASS** (`optik-form.html` yeniden üretildi — `src/` değiştiği için
üretim **farklı**, commit'e dâhil) · `git diff --check` temiz.

**Not:** `KNOWN_CODES` kilidi (`every(/^\d{2}$/)`) **anlamlı kalmaya devam ediyor** —
blok kayıtları **ayrı** `BLOCK_CODES` kayıt defterinde; `CODES` iki haneli ortak
kayıtlar olarak duruyor.

## PHASE 10 batch 22 — BÖLÜM 6 örüntü eşikleri (kitap s.159-169) · 2026-09-22

**Kod değişikliği YOK** (DECISION-029 (A) kapsamı bitti; yeni iş **DECISION-030** onayına
bağlı) → bu turun testleri **yalnız kilit** işlevi görüyor: düzeltme yapıldığında **bilinçli
kırılacak** testler.

**Yeni denetim aracı:** `scripts/mmpi-audit/cmp-b6-batch22.ts` (5 bölüm: #1 eşiği · #2
eşiği · #3 `SINGLE_PD` davranışı · #4-#10 “kaynağın tanimini GERÇEKTEN karşılayan profil”
taraması · 042 çekince metinleri) → **SONUÇ: 9 FARK** (2 eşik sapması + 7 eksik desen);
**P0 bulgu yok.** #4-#10 için aday profillerin gerçekten eşiği karşıladığı betikte
T-değerleriyle basılıyor (ör. Batık: Hs=47 … Si=50 → 45-54 aralığı).

**Yeni `tests/mmpiInterpretation.test.ts` describe’ı “PHASE 10 batch 22” (+6 test, 38 → 44):**
1. **#1 Konversiyon V sapması:** Hs 66.7 / Hy 66.3 / D 59.2 profilinde `conversion-v.hit === true`
   (kaynak vurmayacak) + `rule` dizesi **equality** kilidi (“Hs ≥ 65 ve Hy ≥ 65 … en az 5 T”)
   + kaynak tanımını karşılayan profilin de vurması (yanlış negatif yok)
2. **#2 Paranoid V sapması:** Pa 74.5 / Sc 74.5 / Pt 59.7 → `psychotic-v.hit === true` +
   `rule` equality + 80 T’lik profil de vuruyor
3. **#3 Pd Yükselliği BİREBİR:** `detectSingleElevations()` → Pd 72.0 T & en yüksek öteki 50.8 T
   → **VAR**; Sc 74.5 T eklenince (fark < 10) → **YOK**; Pd 67.5 T → **YOK** (eşik altı)
4. **#4-#10 YOK:** `detectPatterns()` kimlik listesi **11 kayıtla `deepEqual`** + 7 aday
   `id`’nin yokluğu + **kaynak tanımını GERÇEKTEN karşılayan 7 profil** (kadın profilleri dâhil:
   Kuş Kanadı Hs 70.7/D 71.9/Hy 70.5/Pd 72.5/Mf 47.2; Pasif-Agresif V Pd 72.5/Pa 74.1/Mf 41.8)
   için **desen adı üretilmediğinin** regex kontrolü — yani “test var ama bir şey iddia etmiyor”
   tuzağı yok
5. **#8 `multi-high` ≠ “Yüzen” Profili:** Hs→Ma tamamı > 70 T (Si dışarıda, `assert` bunu
   doğruluyor) + `multi-high.rule` = “3 veya daha fazla klinik ölçek T ≥ 65” equality +
   `detail` içinde “borderline” **geçmiyor** (kaynak cümlesi kodda yok)
6. **042 uyarı direktifleri:** birleştirilmiş desen metninde `kod tipi verilemez` /
   `tanısının konulması doğru değil` / `en düşük olduğu alt testlere` / `zekâ düzeyleri 80`
   **yok** (dört `doesNotMatch`)

**Ham puan → T hesabı** testlerde `K: 0` verilerek K düzeltmesi devre dışı bırakıldı
(aksi halde Hs/Pd/Pt/Sc/Ma’da 0.2-1.0 T kayma); eşik yakınlığı nedeniyle her profil
**sayısal olarak yazdırılıp** doğrulandı (T’ler test yorumunda not edildi).

**Çalıştırılanlar:** `npx tsc --noEmit` → **0 hata** · `npx tsx --test
tests/mmpiInterpretation.test.ts` → **44/44 PASS** · `npm test` → **365/365 PASS** (35 suite)
· `npm run build` → **PASS** (`src/` değişmedi → `optik-form.html` üretim farkı **YOK**).

**Kural uygulaması:** sayısal eşikler **yalnız görselden** (`TABLO-NUMBERS`): #10’daki
“54 T” OCR’da “S4T” diye düşmüştü; #9’un “45-54” aralığı ölçek bandı `45-59` ile
karıştırılmadı. `p093_L` (s.170) **0 satır OCR + %0.24 koyu piksel** → `BLANK-PAGE`.

## Batch 23 — DECISION-030/A (CHANGE-015): desen eşikleri + 7 örüntü + bilinçli kırılan kilitler

**Test dosyası:** `tests/mmpiInterpretation.test.ts` → **44 → 47 test** (batch-22
describe’ı `PHASE 10 batch 22 → DECISION-030/A (CHANGE-015)` başlığıyla yeniden
yazıldı; 6 test 9 teste çıktı).

**Bilinçli kırılan 5 kilit (kod değişikliğinden ÖNCE koşularak doğrulandı — 5 fail /
39 pass):**

| # | Kilit (batch 22 hâli) | Neden kırıldı | Yeni hâli |
|---|---|---|---|
| 1 | `konversiyon vadisi: Hs ve Hy yüksek, D düşük` — `profile({K:0,Hs:22,Hy:27,D:23})` vuruyor | eşik 70/10’a çekildi → bu profil artık **vurmuyor** | aynı profil **negatif** vaka; kaynak-uyumlu profil (`Hs 23/Hy 31/D 21`) pozitif vaka |
| 2 | `psikotik V: Pa ve Sc yüksek, Pt daha düşük` — `Pa:24,Sc:55,Pt:20` | Pa/Sc eşiği 80 T oldu | `Pa 24/Sc 58/Pt 43` (82.0/81.1/74.0) pozitif · `Pa 21/Sc 52/Pt 34` (74.5) negatif |
| 3 | `#1 … BİLİNEN SAPMA` — `rule` equality “Hs ≥ 65 … 5 T” | `rule` metni kaynağa göre değişti | yeni `rule` dizesi + `source`/`quote` eşitlikleri + **kural↔davranış döngüsü** (6 profil) |
| 4 | `#2 … BİLİNEN SAPMA` — `rule` equality “Pa ≥ 70 …” + FP `hit:true` | eşik 80/80/70 | yeni `rule` + FP artık `false` + Pt eşiği ayrı vaka + kural↔davranış döngüsü (6 profil) |
| 5 | `#4-#10 altı örüntü kodda temsil edilmiyor` — `deepEqual(ids, 11)` + 7 `!ids.includes` + “aday profiller desen üretmesin” | 7 desen eklendi → 18 kayıt | `deepEqual(ids, 18)` + her desen için **kaynak tanımı karşılanınca vurur / karşılanınca vurmaz** kilitleri (Kadın Mf=50 tam-sayı okuması, cinsiyet kapısı, bant ayrışması) |

**Yönü çevrilen kilit:** `BÖLÜM 6 uyarı direktifleri hiçbir desen metninde geçmiyor
(CONFLICT-042)` `doesNotMatch` ×4 → `assert.match` (çekinceler artık `caveat`/`quote` ve
`MMPI_PATTERN_CAVEATS`ta) + **UI render kilidi** (`Kaynak: s.167 · Şekil 30`,
`Kaynak çekincesi:`, `Yorum Çekinceleri (BÖLÜM 6)`, `Elle değerlendirilir`,
`Butcher 1984`, `doesNotMatch(/\*\*/)` = arayüzde ham markdown kalıntısı yok).

**Dokunulmayan kilitler:** `#3 SINGLE_PD` (birebirdi, öyle kaldı — CHANGE-015 kapsamı
dışı) · `multi-high.rule` equality (kodun kendi göstergesi; `source === undefined`
olarak **kilitlendi**: kaynak deseni #8 ayrı kayıt) · `cry-for-help`/`depressive-27`/
`49`/`89`/nevrotik üçlü testleri · `normal profilde hiçbir kritik desen görülmez`
(K:12 taban profili `45-54` bandında **değil** → yeni `batik-profil` vurmuyor; sayı
kontrolüyle doğrulandı) · `mmpiKeyIntegrity` 63/63.

**Yeni davranış testte nasıl doğrulandı:** ham puanlar `TURKISH_NORMS` üzerinden
**önce hesaplandı** (`.audit/probe1.ts`, `probe2.ts` — geçici), sonra testlere yazıldı;
eşik sınır vakalarında (T 70.0 / 80.0 / 69.9 gibi) tam isabet veren ham puan olmadığı
için **kural↔davranış eşdeğerliği** (`hit === kaynak formülü`, profilin kendi
T-değerleriyle) kilitlendi — norm tablosu değişse de test bozulmayı yakalar.

**Kanıt aracı:** `scripts/mmpi-audit/cmp-b6-batch23.ts` (salt-okunur, 6 bölüm) →
**SONUÇ: 0 FARK · P0 BULGU YOK**. (1) 18 kayıt · (2) #1/#2 eşikleri kaynakla birebir +
eski FP’ler vurmuyor + kaynak tanımı vuruyor + #3 korundu · (3) #4-#10 aynı profilde
tanım+vuru · (4) Batık/Sınır bant ayrışması · (5) 8/8 çekince taşındı + tüm çekinceler
kaynak sayfalı · (6) **sayı üretim denetimi** (desen metnindeki sayılar `SOURCE-B6-001/002`
corpus’unda).

**Çalıştırılanlar:** `npx tsc --noEmit` → **0 hata** · `npx tsx --test
tests/mmpiInterpretation.test.ts` → **47/47 PASS** · `npm test` → **368/368 PASS**
(35 suite) · `npm run build` → **PASS** (`src/` değişti → `optik-form.html` yeniden
üretildi ve commit’e dâhil) · `git diff --check` temiz.

## PHASE 10 batch 24 — CHANGE-016 · kalan desen kartlarında kaynak atfı (DECISION-030/A 5. madde)

**Amaç:** BÖLÜM 6 kartları CHANGE-015 ile kaynaklanmıştı; BÖLÜM 5 kod gövdelerine dayanan
`cry-for-help`, `depressive-27`, `49`, `89` kartlarında `source`/`quote` yoktu. Kural:
**yalnız** SOURCE_FACTS’ta birebir ve sayfalanmış satır taşınır; kaynakta olmayan sayı
üretilmez, eşiğe dokunulmaz.

**Eklenen testler (7):** `tests/mmpiInterpretation.test.ts` → **47 → 54/54 PASS**
1. dört kartın `source` değeri **birebir** (s.36 · s.87+89 · s.118-119 · s.147-148),
2. `cry-for-help` alıntısının s.36 4. maddeyle birebirliği + `manualNote`ta bant (80 T) ve
   CONFLICT-043 atfı,
3. **eşik kilidi:** F 68,8 T → vurmuyor · F 71 T → vuruyor (sayı sessizce değiştirilemez;
   DECISION-032 onayı olmadan (A) seçeneği testte kırılır),
4. `depressive-27` alıntısının s.89 ⚠️ kritik koşulu olduğu + eşiğin kod tarafı olduğunun
   kartta açık beyan edilmesi,
5. `49` alıntısının kod katmanındaki `CODES['49']` gövdesiyle (noktalama duyarsız) uyumu ve
   `89`da **bilinçli `quote` yokluğu**,
6. **kapsam kapanışı:** `detectPatterns()` 18 kayıt → kaynaksız set **yalnız**
   `['neurotic-triad','multi-high']`,
7. UI render: `Kaynak: s.36 · F yükselme nedenleri (4. madde)` + alıntı metni sekmede çıkıyor.

**Kanıt aracı:** `scripts/mmpi-audit/cmp-b6-batch24.ts` (salt-okunur, 6 bölüm) →
**SONUÇ: 0 FARK · P0 BULGU YOK**. (5) bölümü kart sayılarını SOURCE_FACTS’ın **alıntı
satırları** + kod-gövdesi + BÖLÜM 6 çekinceleri corpus’unda arar; bulamazsa kartın
“eşik kod tarafındadır” notunu şart koşar — yani **sayı üretimini değil, sayının
sahiplenilmesini** denetler. `cmp-b6-batch23.ts` hâlâ **0 FARK**; `cmp-b6-batch22.ts`
tarihsî (7 FARK, yokluk ölçümü).

**Çalıştırılanlar:** `npx tsc --noEmit` → **0** · `mmpiInterpretation` → **54/54** ·
`npm test` → **375/375** (36 suite) · `npm run build` → **PASS** (`src/` değişti →
`optik-form.html` yeniden üretildi, commit’e dâhil) · `git diff --check` temiz.

## PHASE 9/10 batch 25 — CHANGE-018 · Hs (1) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Amaç:** Bölüm 5 Hs (1) bloğundaki çok haneli ve eksik kodların (`123/213`, `1234`, `1236`,
`1237`, `1270`, `12378`, `128/218`, `129/219`, `120/210`, `132/312`, `134/314`, `1342`,
`136/316`, `137`, `138/318`, `1382`, `139`, `Yüksek 1 / Düşük 4`, `146`, `1469`)
`BLOCK_CODES`'a taşınması ve koşulların bağlanması.

**Eklenen testler (16):** `tests/mmpiHsBlock.test.ts` → **16/16 PASS**
1. Kod çözme doğruluğu: 123/213, 1234, 1236, 1237, 1270, 12378, 128, 129, 120, 134, 1342, 136, 137, 138, 1382, 139, 14_low4, 146, 1469.
2. Çakışma önleme: 123 ve 132'nin sıralama bozulmadan ayrık kalması.
3. Koşul testleri: 12/21 (Hy 5 T farkı, Pd+Ma), 13/31 (düşük 2, 2/7/8/9 yüksekliği), 14/41 (Hy ≥ 70), 16/61 (Sc ≥ 70, Pd < 70), 18/81 (F ≥ 70), 19/91 (2 ve 3 < 50), 10/01 (üçüncü 8, 2 ve 3 > 70), 136/316 (Pa - Hy 10 T farkı), 137 (Ma yüksek / K < 50), 139 (Pd yüksek / K < 50).

**Kanıt aracı:** `scripts/mmpi-audit/cmp-hs-batch25.ts` → **SONUÇ: 0 FARK · Hs BLOĞU KOD GÖÇÜ TAMAMLANDI**.

## PHASE 9/10 batch 26 — CHANGE-019 · D (2) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Amaç:** Bölüm 5 D (2) bloğundaki çok haneli ve eksik kodların (`213/231`, `243/432`,
`247/427/472/742`, `248`, `248 / Yüksek F`, `273/723`, `274/724`, `275/725`, `278/728`,
`270`, `281/821`, `284/824`, `287/827`, `207`) `BLOCK_CODES`'a taşınması ve koşulların bağlanması.

**Eklenen testler (16):** `tests/mmpiDBlock.test.ts` → **16/16 PASS**
1. Kod çözme doğruluğu ve tanı sadakati: 213/231, 243/432, 247/427, 248, 248/F, 273, 274, 275, 278, 270, 281, 284, 287, 207.
2. Koşul testleri: 23 (düşük Mf/Ma), 24/42 (3, 7 veya 8 üçüncü test), 27/72 (Hs ≥ 70 T), 20/02 (7 veya 4 üçüncü test), 213/231 (Pt ≥ 70 T), 247/427 (Erkek Mf ≥ 70 / Kadın Mf < 50), 274/724 (Hy ≥ 70 T kronik alkolizm), 275/725 (Pd < 50 T yetersizlik), 278/728 (K & Hs < 50 veya Ma ≥ 70 intihar riski / Si ≥ 70), 284/824 (Pd > 80 T kontrol kaybı), 287/827 (K < 50 ∧ Ma ≥ 70 intihar riski).

**Güncellenen testler:** `tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS** (D bloğu 15 anahtarı `KNOWN_BLOCK_CODES`'a eklendi; çözümlenen 213/231 ve 273/723 assertion'ları güncellendi).

**Kanıt aracı:** `scripts/mmpi-audit/cmp-d-batch26.ts` → **SONUÇ: 0 FARK · D BLOĞU KOD GÖÇÜ TAMAMLANDI**.

**Çalıştırılanlar:** `npx tsc --noEmit` → **0** · `mmpiHsBlock` → **16/16** · `mmpiDBlock` → **16/16** · `mmpiKeyIntegrity` → **63/63** · `mmpiInterpretation` → **54/54** · `aiInterpretation` → **5/5** · `npm run build` → **PASS** · `git diff --check` temiz.

## PHASE 9/10 batch 27 — CHANGE-020 · Hy (3) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Amaç:** Bölüm 5 Hy (3) bloğundaki çok haneli ve eksik kodların (`Yüksek 3 / Yüksek K`, `Hy:32`,
`321`, `Yüksek 3 / Düşük 4`, `345/435/534`, `346/436`) `BLOCK_CODES`'a taşınması ve
ilgili 10 kod için 18 koşulun bağlanması.

**Eklenen testler (16):** `tests/mmpiHyBlock.test.ts` → **16/16 PASS**
1. Kod çözme doğruluğu ve tanı sadakati: Yüksek 3 / Yüksek K, Hy:32, 321, Yüksek 3 / Düşük 4, 345/435/534, 346/436, 34, 35, 36, 37, 38, 39, 03.
2. Koşul testleri:
   - Hy:3_highK (Hy/K ≥ 70, F/Sc < 50),
   - Hy:32 (D ile Hy farkı ≤ 5 T, erkek üçüncü 1/8/9, kadın Mf < 50 T, kadın üçüncü 1/4/8),
   - 34/43 (erkek üçüncü 2/5/6, kadın üçüncü 2/6/8, 3 > 4 ketlenme, 4 > 3 ifade),
   - 345/435/534 (Hy > Pd ∧ K > 50),
   - 346/436 (Pa ile Hy farkı ≤ 5 T),
   - 35/53 (üçüncü Pd veya Pa),
   - 36/63 (üçüncü Si/Sc, Pa - Hy ≥ 5 T, Hy > Pa),
   - 37/73 (üçüncü Hs/D/Pd),
   - 39/93 (Si < 40 T, üçüncü Pd),
   - 30/03 (üçüncü Hs veya D).

**Güncellenen testler:** `tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS** (Hy bloğundaki 9 anahtar `KNOWN_BLOCK_CODES`'a eklendi).

**Kanıt aracı:** `scripts/mmpi-audit/cmp-hy-batch27.ts` → **SONUÇ: 0 FARK · Hy BLOĞU KOD GÖÇÜ TAMAMLANDI**.

**Çalıştırılanlar:** `npx tsc --noEmit` → **0** · `mmpiHsBlock` → **16/16** · `mmpiDBlock` → **16/16** · `mmpiHyBlock` → **16/16** · `mmpiKeyIntegrity` → **63/63** · `mmpiInterpretation` → **54/54** · `aiInterpretation` → **5/5** · `npm run build` → **PASS** · `git diff --check` temiz.

## PHASE 9/10 batch 28 — CHANGE-021 · Pd (4) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Amaç:** Bölüm 5 Pd (4) bloğundaki çok haneli ve eksik kodların (`Yüksek 4 / Düşük 5`, `456`,
`462/642`, `463/643`, `468/648`, `469`, `48 / Yüksek F`, `482/842/824`, `489/849`,
`493/943`, `495/945`, `496/946`, `498/948`) `BLOCK_CODES`'a taşınması ve ilgili 10 kod için koşulların bağlanması.

**Eklenen testler (17):** `tests/mmpiPdBlock.test.ts` → **17/17 PASS**
1. Kod çözme doğruluğu ve tanı sadakati: Yüksek 4 / Düşük 5 (erkek/kadın ayrımı), 456 (Scarlett O'Hara Vadisi atfı), 462/642, 463/643, 468/648, 469, 48 / Yüksek F, 482/842/824, 489/849, 493/943, 495/945, 496/946, 498/948, 45, 46, 47, 48, 49, 04.
2. Koşul testleri:
   - Pd:4_low5 (erkek/kadın Mf < 50, kadın Pa ≥ 70, kadın Hy ≥ 70),
   - 45/54 (erkek Mf ≥ 70, kadın Mf < 50, Pd > Mf),
   - 46/64 (Pd > Pa açık isyankarlık, Pa > Pd şüphecilik, kadın Sc ≥ 70 ∧ K < 50 prepsikoz),
   - 468/648 (K < 50 T savunma zayıflığı, 5 T puanı alanı),
   - 469 (Ma ≥ 70 T öfke patlaması),
   - 48 / Yüksek F (F ≥ 70 ∧ D < 50, K ≥ 70 manipülatif gizleme),
   - 489/849 (Ma ≥ 70 T şiddet riski),
   - 493/943 (Hy ve Pd farkı ≤ 5 T),
   - 495/945 (Pt ≥ 70 T eylem sonrası suçluluk döngüsü),
   - 496/946 (Sc ≥ 70 T homisidal risk ve K < 50 T ego gücü yetersizliği).

**Güncellenen testler:** `tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS** (`KNOWN_BLOCK_CODES` listesine Pd bloğundaki 31 anahtar eklendi, toplam 81 blok kodu).

**Kanıt aracı:** `scripts/mmpi-audit/cmp-pd-batch28.ts` → **SONUÇ: 0 FARK · Pd BLOĞU KOD GÖÇÜ TAMAMLANDI**.

**Çalıştırılanlar:** `npx tsc --noEmit` → **0** · `mmpiHsBlock` → **16/16** · `mmpiDBlock` → **16/16** · `mmpiHyBlock` → **16/16** · `mmpiPdBlock` → **17/17** · `mmpiKeyIntegrity` → **63/63** · `mmpiInterpretation` → **54/54** · `aiInterpretation` → **5/5** · `npm run build` → **PASS** · `git diff --check` temiz.

## PHASE 9/10 batch 29 — CHANGE-022 · Pa (6) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Amaç:** Bölüm 5 Pa (6) bloğundaki çok haneli ve eksik kodların (`678/876`, `679`,
`680/860`, `694/964`, `698/968`, `456 (Scarlett O'Hara Vadisi)`) `BLOCK_CODES`'a taşınması ve ilgili 7 kod için koşulların bağlanması.

**Eklenen testler (14):** `tests/mmpiPaBlock.test.ts` → **14/14 PASS**
1. Kod çözme doğruluğu ve tanı sadakati: 678/876 (Psikotik V atfı, paranoid tip şizofreni tanısı), 679, 680/860 (paranoid şizofreni tanısı), 694/964 (cinayet potansiyeli uyarısı), 698/968 (şizofreni paranoid tip tanısı ve 68/86 yönlendirmesi), Scarlett O'Hara Vadisi (456 kadın örüntüsü), 67, 68, 69, 60, 64.
2. Koşul testleri:
   - 67/76 (3. test D/Sc, Pa ≥ Pt şizofreniye geçiş),
   - 678/876 (6 ve 8 > 7 Psikotik Vadi),
   - 68/86 (3. test Pd/Pt, Paranoid Vadi, K < 50 T saldırganlık, 75+ T şizofreni),
   - 69/96 (3. test Pd/Sc, F ve Sc yüksekliği, kadın gerginliği),
   - 698/968 (8 alt testi 6'dan 5 T aşağıda ise 68/86 bak),
   - 60/06 (kadın 30+ yaş, 3. test D/Pd/Hy),
   - Pa:456_scarlett (Hy ≥ 70 T manipülatif sosyallik).

**Güncellenen testler:** `tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS** (`KNOWN_BLOCK_CODES` listesine Pa bloğundaki 22 anahtar eklendi, toplam 103 blok kodu).

**Kanıt aracı:** `scripts/mmpi-audit/cmp-pa-batch29.ts` → **SONUÇ: 0 FARK · Pa BLOĞU KOD GÖÇÜ TAMAMLANDI**.

**Çalıştırılanlar:** `npx tsc --noEmit` → **0** · `mmpiHsBlock` → **16/16** · `mmpiDBlock` → **16/16** · `mmpiHyBlock` → **16/16** · `mmpiPdBlock` → **17/17** · `mmpiPaBlock` → **14/14** · `mmpiKeyIntegrity` → **63/63** · `mmpiInterpretation` → **54/54** · `aiInterpretation` → **5/5** · `npm run build` → **PASS** · `git diff --check` temiz.

## PHASE 9/10 batch 30 — CHANGE-023 · Pt (7) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Amaç:** Bölüm 5 Pt (7) bloğundaki çok haneli ve bloğa özel kodların (`Pt:47`, `Pt:67`, `Pt:782`, `Pt:872`, `Pt:784`, `Pt:789`, `Pt:794`) `BLOCK_CODES`'a taşınması ve ilgili 4 kod grubu için koşulların bağlanması.

**Eklenen testler (11):** `tests/mmpiPtBlock.test.ts` → **11/11 PASS**
1. Kod çözme doğruluğu ve tanı sadakati: Pt:74/47 (pasif-agresif kişilik bozukluğu tanısı), Pt:76/67 (kaygı/kuşku/dolaylı düşmanlık), 782 (Depresif Bozukluk ve Obsesif Kompulsif Bozukluk tanıları), 872 (Şizofrenik Reaksiyon tanısı), 784/874 (Şizofrenik Reaksiyon ve Şizoid Kişilik Bozukluğu tanıları), 789 (hostil/gergin/büyüklenmeci gövdesi), 794 (kronik kaygı ve impulsif dışavurum gövdesi), 78, 79, 70, 71, 72, 73, 75.
2. Koşul testleri:
   - Pt:74 (D ≥ 70 T depresyon / içe dönen saldırganlık),
   - 78/87 (3. test D/Pd, Sc > Pt akut psikoz/tuhaf intihar riski, 7 > 8 savaş, 7 < 8 şizofreni),
   - 79/97 (3. test Sc/Pd, D ≥ 70 T anksiyöz gergin depresyon),
   - 70/07 (3. test D/Sc, Kadın Mf < 40 T aynı örüntü kuralı).

**Güncellenen testler:** `tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS** (`794` negatif kırpma testi çözünürlük doğrulamasına çevrildi; `KNOWN_BLOCK_CODES` listesine Pt bloğundaki 23 anahtar eklendi, toplam 126 blok kodu).

**Kanıt aracı:** `scripts/mmpi-audit/cmp-pt-batch30.ts` → **SONUÇ: 0 FARK · Pt BLOĞU KOD GÖÇÜ TAMAMLANDI**.

**Çalıştırılanlar:** `npx tsc --noEmit` → **0** · `mmpiHsBlock` → **16/16** · `mmpiDBlock` → **16/16** · `mmpiHyBlock` → **16/16** · `mmpiPdBlock` → **17/17** · `mmpiPaBlock` → **14/14** · `mmpiPtBlock` → **11/11** · `mmpiKeyIntegrity` → **63/63** · `mmpiInterpretation` → **54/54** · `aiInterpretation` → **5/5** · `npm run build` → **PASS** · `git diff --check` temiz.

## PHASE 9/10 batch 31 — CHANGE-024 · Sc (8) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Amaç:** Bölüm 5 Sc (8) bloğundaki kod gövdelerinin (`Sc:68`, `Sc:78`, `Sc:8726`, `Sc:paranoid_valley`), tanı ve çapraz takma adlarının `BLOCK_CODES`'a taşınması ve ilgili 6 kod grubu için koşulların bağlanması (`Sc:86`, `Sc:87`, `8726`, `paranoid_valley`, `89`, `08`).

**Eklenen testler (13):** `tests/mmpiScBlock.test.ts` → **13/13 PASS**
1. Kod çözme doğruluğu ve tanı sadakati:
   - `Sc:86` / `86/68` bloğa özel gövdesi ve tanıları (Paranoid durum, Paranoid şizofreni, Şizoid kişilik),
   - `Sc:87` / `87/78` bloğa özel gövdesi (endişeli, pasif bağımlı, cinsel sorunlar),
   - `8726 / Yüksek 9` müstakil kodu ve tanısı (Ajite şizofreni),
   - `Paranoid Vadi (Şekil 22)` örüntüsü, gövdesi ve tanısı (Paranoid şizofreni),
   - `89/98` ve `80/08` kodları gövde sadakati ve tanıları,
   - 86 vs 68 ve 87 vs 78 blok ayrım doğrulamaları,
   - İki haneli Sc kodları ve Bakınız yönlendirmeleri.
2. Koşul testleri:
   - Sc:86 (Pa, Sc ≥ 80 T ve Pt 65-75 T akut psikotik durum),
   - Sc:87 (Pt & Sc ≥ 75 ∧ Sc > Pt şizofreni eğilimi),
   - 8726 (Ma ≥ 70 T ajite hipomani),
   - Paranoid Vadi (Pa, Sc ≥ 70 T ve Pt vadi dibi),
   - 89/98 (Yaş < 27 manuel notu ve 3. test 4, 7 veya 6),
   - 80/08 (3. test 7 veya 2).

**Güncellenen testler:**
- `tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS** (`8726` artık kendi gövdesine çözümlendi; `KNOWN_BLOCK_CODES` listesine Sc bloğundaki 14 anahtar eklendi, toplam 140 blok kodu; 68/86 ve 78/87 blok-özelleştirilmiş koşul kontrolleri ayrıldı).
- `tests/mmpiInterpretation.test.ts` → **54/54 PASS** (`8726` kendi gövdesine çözümlenme testi güncellendi).
- `tests/mmpiPtBlock.test.ts` → **11/11 PASS** (`Pt:87` testi netleştirildi).

**Kanıt aracı:** `scripts/mmpi-audit/cmp-sc-batch31.ts` → **SONUÇ: 0 FARK · Sc BLOĞU KOD GÖÇÜ TAMAMLANDI**.

**Çalıştırılanlar:** `npx tsc --noEmit` → **0** · `mmpiHsBlock` → **16/16** · `mmpiDBlock` → **16/16** · `mmpiHyBlock` → **16/16** · `mmpiPdBlock` → **17/17** · `mmpiPaBlock` → **14/14** · `mmpiPtBlock` → **11/11** · `mmpiScBlock` → **13/13** · `mmpiKeyIntegrity` → **63/63** · `mmpiInterpretation` → **54/54** · `aiInterpretation` → **5/5** · `npm run build` → **PASS** · `git diff --check` temiz.

## PHASE 9/10 batch 32 — CHANGE-025 · Ma (9) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Amaç:** Bölüm 5 Ma (9) bloğundaki kod gövdelerinin (`Ma:9_highK`, `Ma:9_lowK`), tanı ve çapraz takma adlarının `BLOCK_CODES`'a taşınması ve ilgili 4 kod grubu için koşulların bağlanması (`Ma:9_highK`, `Ma:9_lowK`, `90/09`, `49/94`).

**Eklenen testler (9):** `tests/mmpiMaBlock.test.ts` → **9/9 PASS**
1. Kod çözme doğruluğu ve tanı sadakati:
   - `Ma:9_highK` / `Yüksek 9 / Yüksek K` bloğa özel gövdesi (enerjik, organize, otorite istemez, iyi yönetici, yarışmacı, kadın teşhirciliği) (s.152),
   - `Ma:9_lowK` / `Yüksek 9 / Düşük K` bloğa özel gövdesi ve tanısı (Narsisistik kişilik, kadın eksibisyonizmi) (s.153),
   - `Ma:19` / `91/19` bloğa özel gövdesi ve 19/91 ayrımı (ender görülür, hipomanik, gergin, başarısızlıkla engellenmiş) (s.153),
   - `90/09` kodu gövde sadakatiyle çözümlenmesi (s.153),
   - İki haneli Ma kodları ve Bakınız yönlendirmeleri (92, 93, 94, 95, 96, 97, 98, 90).
2. Koşul testleri:
   - Ma:9_highK (D < 50 T, K > 70 T, Kadın Mf < 40 T),
   - Ma:9_lowK (Kadın eksibisyonizm kuralı),
   - 90/09 (erkeklerde nadirlik uyarısı),
   - 49/94 s.153 eyleme vurukluk klinik notu.

**Güncellenen testler:**
- `tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS** (`KNOWN_BLOCK_CODES` listesine Ma bloğundaki 5 anahtar eklendi, toplam 145 blok kodu; `kosullu` dizisine `'09'` eklendi).

**Kanıt aracı:** `scripts/mmpi-audit/cmp-ma-batch32.ts` → **SONUÇ: 0 FARK · Ma BLOĞU KOD GÖÇÜ TAMAMLANDI**.

**Çalıştırılanlar:** `npx tsc --noEmit` → **0** · `mmpiHsBlock` → **16/16** · `mmpiDBlock` → **16/16** · `mmpiHyBlock` → **16/16** · `mmpiPdBlock` → **17/17** · `mmpiPaBlock` → **14/14** · `mmpiPtBlock` → **11/11** · `mmpiScBlock` → **13/13** · `mmpiMaBlock` → **9/9** · `mmpiKeyIntegrity` → **63/63** · `mmpiInterpretation` → **54/54** · `aiInterpretation` → **5/5** · `npm run build` → **PASS** · `git diff --check` temiz.

## PHASE 9/10 batch 33 — CHANGE-026 · Si (0) bloğu kod göçü ve Bölüm 5 Kapanışı (DECISION-031/A)

**Amaç:** Bölüm 5 Si (0) bloğundaki kodların (`Si:049`, `Si:027`) koşullu yorum kurallarının bağlanması, çapraz takma adların eklenmesi ve Bölüm 5 kod göçünün nihai olarak kapatılması.

**Eklenen testler (6):** `tests/mmpiSiBlock.test.ts` → **6/6 PASS**
1. Kod çözme doğruluğu ve sadakati:
   - `049` kodu gövdesi, bloğu ve takma adları (`Si:049`, `Pd:049`, `Ma:049`) (s.157),
   - `027(8)` kodu gövdesi, bloğu ve takma adları (`027`, `Si:027`, `Si:0278`, `D:027`, `Pt:027`, `Sc:027`) (s.158),
   - İki haneli Si kodları ve Bakınız yönlendirmeleri (01, 02, 03, 04, 05, 06, 07, 08, 09),
   - 068 ve 086 kodlarının 680/860 hedefine yönlendirilmesi.
2. Koşul testleri:
   - 049 (Si, Pd ve Ma >= 70 T eyleme vurukluğun bastırılması),
   - 027(8) (D/Pt >= 70 T ve Sc >= 70 T ruminatif davranışların kuvvetlenmesi).

**Güncellenen testler:**
- `tests/mmpiKeyIntegrity.test.ts` → **63/63 PASS** (`KNOWN_BLOCK_CODES` listesine Si bloğundaki 6 yeni anahtar eklenerek toplam kayıt 151 blok koduna ulaştırıldı).

**Kanıt aracı:** `scripts/mmpi-audit/cmp-si-batch33.ts` → **SONUÇ: 0 FARK · Si BLOĞU KOD GÖÇÜ TAMAMLANDI**.

**Çalıştırılanlar:** `npx tsc --noEmit` → **0** · `mmpiHsBlock` → **16/16** · `mmpiDBlock` → **16/16** · `mmpiHyBlock` → **16/16** · `mmpiPdBlock` → **17/17** · `mmpiPaBlock` → **14/14** · `mmpiPtBlock` → **11/11** · `mmpiScBlock` → **13/13** · `mmpiMaBlock` → **9/9** · `mmpiSiBlock` → **6/6** · `mmpiKeyIntegrity` → **63/63** · `mmpiInterpretation` → **54/54** · `aiInterpretation` → **5/5** · `npm run build` → **PASS** · `git diff --check` temiz.

## PHASE 12 & 13 batch 34 — CHANGE-027 · UI ve Yazdırma Raporu Denetimi (CONFLICT-007 FIXED)

**Amaç:** PHASE 12 (UI) ve PHASE 13 (Report) kapsamında, çok noktalı kod analizlerinin (`123/213`, `278/728`, `782/872` vb.) ekranda ve raporda basılması, Bölüm 6 profil örüntülerinin basılı rapora aktarılması, SourcesPage Ceyhun & Oral (2003) Status A künyesine yükseltilmesi ve `docs/kaynak-denetimi.md` oluşturularak CONFLICT-007'nin kapatılması.

**Eklenen testler (5):** `tests/mmpiUiReport.test.ts` → **5/5 PASS**
1. `MMPICodeTab`: 123 üçlü kodu eşleştiğinde hem 12/21 ana kodunu hem 123 genişletilmiş analizini gösterir.
2. `MMPICodeTab`: 278 intihar riski üçlü kodu eşleştiğinde 278 gövdesi basılır.
3. `MMPIPrintReport`: Çok noktalı kod analizi ve Bölüm 6 profil örüntüleri basılı rapora aktarılır.
4. `SourcesPage`: Ceyhun & Oral (2003) Status A olarak künyelenmiştir ve `docs/kaynak-denetimi.md` atfı vardır.
5. `CONFLICT-007`: `docs/kaynak-denetimi.md` dosyası depoda mevcuttur ve temel eşleştirme tablosunu içerir.

**Çalıştırılanlar:** `npx tsc --noEmit` → **0** · `tests/mmpiUiReport.test.ts` → **5/5 PASS** · tüm blok testleri + bütünlük + yorum + AI → **245/245 PASS** (53 suite) · `npm test` → **503/503 PASS** (64 suite) · `npm run build` → **PASS** · `git diff --check` temiz.
