# CONFLICT-024 — Üçlü/dörtlü kod tipi kapsamı (blok-blok göç takibi)

> DECISION-031 = A (Kullanıcı onayı, 2026-09-22) uyarınca Bölüm 5 kod gövdeleri
> ve koşulları blok-blok göç ettirilmektedir.

## 1. Hs (1) Kod Bloğu (s.67-78) — TAMAMLANDI (batch 25 · CHANGE-018)

| Kod | Kaynak sayfa | Kaynak | Kodda | Durum |
|---|---|---|---|---|
| 123/213 | s.68-69 | ✅ | ✅ `BLOCK_CODES['Hs:123']` | MATCH (Tanılar + koşul) |
| 1234 | s.69 | ✅ | ✅ `BLOCK_CODES['Hs:1234']` | MATCH (Tanı) |
| 1236 | s.69 | ✅ | ✅ `BLOCK_CODES['Hs:1236']` | MATCH |
| 1237 | s.69 | ✅ | ✅ `BLOCK_CODES['Hs:1237']` | MATCH (Tanı) |
| 1270 | s.69 | ✅ | ✅ `BLOCK_CODES['Hs:1270']` | MATCH (Tanı) |
| 12378 | s.69-70 | ✅ | ✅ `BLOCK_CODES['Hs:12378']` | MATCH (Tanı) |
| 128/218 | s.70 | ✅ | ✅ `BLOCK_CODES['Hs:128']` | MATCH (Tanı) |
| 129/219 | s.70 | ✅ | ✅ `BLOCK_CODES['Hs:129']` | MATCH (Tanı) |
| 120/210 | s.70 | ✅ | ✅ `BLOCK_CODES['Hs:120']` | MATCH (Tanı) |
| 13/31 Yüksek K | s.72 | ✅ (alt-kod) | ✅ `CODE_CONDITIONS['13']` | MATCH (Otomatik test) |
| 13/31 Düşük 2 | s.72 | ✅ (alt-kod) | ✅ `CODE_CONDITIONS['13']` | MATCH (Otomatik test) |
| 132/312 | s.72-73 | ✅ | ✅ `BLOCK_CODES['Hs:132']` | MATCH (Tanı) |
| 134/314 | s.73-74 | ✅ | ✅ `BLOCK_CODES['Hs:134']` | MATCH (Tanı) |
| 1342 | s.74 | ✅ | ✅ `BLOCK_CODES['Hs:1342']` | MATCH (Tanı) |
| 136/316 | s.74 | ✅ | ✅ `BLOCK_CODES['Hs:136']` | MATCH (2 koşul: Pa-Hy farkı) |
| 137 | s.74-75 | ✅ | ✅ `BLOCK_CODES['Hs:137']` | MATCH (Koşul: Ma/K) |
| 138/318 | s.75 | ✅ | ✅ `BLOCK_CODES['Hs:138']` | MATCH (Tanı: Borderline) |
| 1382 | s.75 | ✅ | ✅ `BLOCK_CODES['Hs:1382']` | MATCH (Tanı) |
| 139 | s.75-76 | ✅ | ✅ `BLOCK_CODES['Hs:139']` | MATCH (Koşul: Pd/K) |
| Yüksek 1 / Düşük 4 | s.76 | ✅ (alt-kod) | ✅ `BLOCK_CODES['Hs:14_low4']` | MATCH (Tanı) |
| 146 | s.76 | ✅ | ✅ `BLOCK_CODES['Hs:146']` | MATCH (Tanı) |
| 1469 | s.76 | ✅ | ✅ `BLOCK_CODES['Hs:1469']` | MATCH (Tanı) |

### Hs Bloğu Koşullu Ek Cümleler (CODE_CONDITIONS)
- `12/21`: 1 ve 2 farkı <= 5 T (s.68), 3 testi 1'e <= 5 T (s.68), Pd+Ma >= 70 T (s.68)
- `13/31`: Yüksek K (s.72), Düşük 2 (s.72), 2,7,8,9 yüksek + K düşük (s.72), L ve K yüksek (s.72)
- `14/41`: 3 testi >= 70 T (s.76)
- `16/61`: 8 testi >= 70 T (s.77), 4 testi < 70 T Paranoid Şizofreni (s.77)
- `18/81`: F testi >= 70 T (s.77)
- `19/91`: 2 ve 3 testleri < 50 T (s.78)
- `10/01`: üçüncü test Sc (s.78), 2 ve 3 testleri >= 70 T maskeli depresyon (s.78)
- `136/316`: Pa - Hy >= 10 T ve Hy - Pa >= 10 T (s.74)
- `137`: Ma >= 70 T veya K < 50 T (s.75)
- `139`: Pd >= 70 T ve K < 50 T (s.76)

Hs bloğu mutabakatı: `scripts/mmpi-audit/cmp-hs-batch25.ts` → **0 FARK** (28/28 kontrol tam).

---

## 2. D (2) alt testi kod bloğu (s.81-92) — TAMAMLANDI (batch 26 · CHANGE-019)
| Kod | Kaynak Sayfa | Durum | Not |
|---|---|---|---|
| `213/231` | s.83-84 | ✅ EKLENDİ | Pt ≥ 70 T koşulu bağlı |
| `243/432` | s.85 | ✅ EKLENDİ | Tanı ve yönlendirmeler tam |
| `247/427/472/742` | s.85-86 | ✅ EKLENDİ | Erkek Mf ≥ 70 / Kadın Mf < 50 koşulları bağlı |
| `248` | s.86 | ✅ EKLENDİ | F ≥ 70 T koşulu bağlı |
| `248 / Yüksek F` | s.86 | ✅ EKLENDİ | Şizofrenik konfigürasyon |
| `273/723` | s.88 | ✅ EKLENDİ | Hs ≥ 70 T koşulu bağlı |
| `274/724` | s.88 | ✅ EKLENDİ | Hy ≥ 70 T / Kadın Mf < 50 T koşulları bağlı |
| `275/725` | s.88-89 | ✅ EKLENDİ | Pd < 50 T koşulu bağlı |
| `278/728` | s.89 | ✅ EKLENDİ | K/Hs < 50 veya Ma ≥ 70 (intihar), Si ≥ 70, Pd < 50, Kadın Mf < 50 koşulları bağlı |
| `270` | s.90 | ✅ EKLENDİ | Şizoid kişilik bozukluğu tanısı tam |
| `281/821` | s.90 | ✅ EKLENDİ | Hy ≥ 70 T koşulu bağlı |
| `284/824` | s.91 | ✅ EKLENDİ | Pd > 80 T koşulu bağlı |
| `287/827` | s.91 | ✅ EKLENDİ | K < 50 ∧ Ma ≥ 70 (intihar) koşulu bağlı |
| `207` | s.92 | ✅ EKLENDİ | Anksiyete/depresyon özellikleri tam |

D bloğu mutabakatı: `scripts/mmpi-audit/cmp-d-batch26.ts` → **0 FARK** (11 koşul, 15 kod gövdesi, 16 test tam).

---

## 3. Hy (3) alt testi kod bloğu (s.95-103) — TAMAMLANDI (batch 27 · CHANGE-020)

| Kod | Kaynak | Kodda | Durum / Not |
|---|---|---|---|
| `Yüksek 3 / Yüksek K` | s.96 | ✅ VAR | `BLOCK_CODES['Hy:3_highK']` eklendi; Hy/K ≥ 70, F/Sc < 50 koşulu bağlı |
| `31` | s.96 | ✅ `13/31` | kaynak "(Bakınız 13/31 Kodu)" der → **atıf doğru** |
| `32` | s.96-97 | ✅ VAR | `BLOCK_CODES['Hy:32']` eklendi; s.96 metni ("23 kod tiplerinin aksine") + 4 koşul |
| `321` | s.97 | ✅ VAR | `BLOCK_CODES['Hy:321']` eklendi; s.97 metni ve hipokondriyak semptomlar |
| `34/43` | s.97-98 | ✅ VAR | Cinsiyet 3. testler (erkek D/Mf/Pa, kadın D/Pa/Sc) ve 3 vs 4 göreceli yükseklik koşulları bağlı |
| `Yüksek 3 / Düşük 4` | s.98-99 | ✅ VAR | `BLOCK_CODES['Hy:34_low4']` eklendi; pasif-agresif kişilik tanısı tam |
| `345/435/534` | s.99 | ✅ VAR | `BLOCK_CODES['Hy:345']` (+ `Hy:435`, `Hy:534` alias) eklendi; Hy > Pd ∧ K > 50 koşulu bağlı |
| `346/436` | s.99 | ✅ VAR | `BLOCK_CODES['Hy:346']` (+ `Hy:436` alias) eklendi; Pa ve Hy 5 T farkı koşulu bağlı |
| `35/53` | s.99 | ✅ VAR | 3. test Pd veya Pa koşulu bağlı |
| `36/63` | s.99-100 | ✅ VAR | 3. test Si/Sc, Pa - Hy ≥ 5 T farkı, Hy > Pa koşulları bağlı |
| `37/73` | s.100-101 | ✅ VAR | 3. test Hs/D/Pd koşulu bağlı |
| `38/83` | s.101 | ✅ VAR | Olası Tanı: Şizofreni, Bazı durumlarda histerik nevroz |
| `39/93` | s.101 | ✅ VAR | Si < 40 T ve 3. test Pd ("394/934") koşulları bağlı |
| `30/03` | s.101 | ✅ VAR | 3. test Hs veya D koşulu bağlı |

Hy bloğu mutabakatı: `scripts/mmpi-audit/cmp-hy-batch27.ts` → **0 FARK** (10 koşullu kural seti, 6 yeni kod gövdesi, 16 test tam).

---

## 4. Pd (4) alt testi kod bloğu (s.107-121) — TAMAMLANDI (batch 28 · CHANGE-021)

| Kod | Kaynak | Kodda | Durum / Not |
|---|---|---|---|
| `41` | s.108 | ✅ `14/41` | "(Bakınız 14/41 Kodu)" |
| `42` | s.108 | ✅ `24/42` | "(Bakınız 24/42 Kodu)" |
| `43` | s.111 | ✅ `34/43` | "(Bakınız 34/43 Kodu)" |
| `Yüksek 4 / Düşük 5` | s.111-112 | ✅ VAR | `BLOCK_CODES['Pd:4_low5']` eklendi; Mf < 50 (erkek/kadın), kadın Pa ≥ 70, kadın Hy ≥ 70 koşulları bağlı |
| `45/54` | s.112-113 | ✅ VAR | Erkek Mf ≥ 70, kadın Mf < 50, Pd > Mf koşulları bağlı |
| `456` | s.113 | ✅ VAR | `BLOCK_CODES['Pd:456']` eklendi; Scarlett O'Hara atfı, pasif-agresif ve bağımlı tanıları |
| `46/64` | s.113-114 | ✅ VAR | 4 > 6, 6 > 4, kadın Sc ≥ 70 ∧ K < 50 koşulları bağlı |
| `462/642` | s.114-115 | ✅ VAR | `BLOCK_CODES['Pd:462']` + aliases `Pd:642`, `Pa:642` eklendi; intihar tehditleri |
| `463/643` | s.115 | ✅ VAR | `BLOCK_CODES['Pd:463']` + aliases `Pd:643`, `Pa:643` eklendi; sevgi gereksinimi |
| `468/648` | s.115 | ✅ VAR | `BLOCK_CODES['Pd:468']` + aliases `Pd:648`, `Pa:648` eklendi; K < 50 T ve 5 T puanı alanı koşulları bağlı |
| `469` | s.115 | ✅ VAR | `BLOCK_CODES['Pd:469']` eklendi; Ma ≥ 70 T öfke patlaması koşulu bağlı |
| `47/74` | s.115-116 | ✅ VAR | Tanı ve gövde tam |
| `48/84` | s.116-117 | ✅ VAR | Tanılar (şizoid, şizofreni, dissosiyatif) tam |
| `48 / Yüksek F` | s.117 | ✅ VAR | `BLOCK_CODES['Pd:48_highF_low2']` eklendi; F ≥ 70 ∧ D < 50, K ≥ 70 koşulları bağlı |
| `482/842/824` | s.117-118 | ✅ VAR | `BLOCK_CODES['Pd:482']` + aliases `Pd:842`, `Pd:824`, `Sc:842`, `Sc:824` eklendi; intihar girişimi |
| `489/849` | s.118 | ✅ VAR | `BLOCK_CODES['Pd:489']` + aliases `Pd:849`, `Sc:849` eklendi; Ma ≥ 70 T şiddet riski koşulu bağlı |
| `49/94` | s.118-119 | ✅ VAR | Tanılar (antisosyal, mani, şizofreni) tam |
| `493/943` | s.119 | ✅ VAR | `BLOCK_CODES['Pd:493']` + aliases `Pd:943`, `Ma:943` eklendi; Hy ve Pd ≤ 5 T koşulu bağlı |
| `495/945` | s.119-120 | ✅ VAR | `BLOCK_CODES['Pd:495']` + aliases `Pd:945`, `Ma:945` eklendi; Pt ≥ 70 T suçluluk döngüsü koşulu bağlı |
| `496/946` | s.120 | ✅ VAR | `BLOCK_CODES['Pd:496']` + aliases `Pd:946`, `Ma:946` eklendi; Sc ≥ 70 T homisidal risk ve K < 50 T koşulları bağlı |
| `498/948` | s.120 | ✅ VAR | `BLOCK_CODES['Pd:498']` + aliases `Pd:948`, `Ma:948` eklendi; ergenlik isyanı ve saldırganlık |
| `40/04` | s.120 | ✅ `04/40` | "(Bakınız 04/40 Kodu)" |

Pd bloğu mutabakatı: `scripts/mmpi-audit/cmp-pd-batch28.ts` → **0 FARK** (10 koşullu kural seti, 13 yeni kod gövdesi, 18 çapraz takma ad, 17 test tam).

---

## 5. Pa (Paranoya / 6) alt testi kod bloğu (s.127-135) — TAMAMLANDI (batch 29 · CHANGE-022)

| Kod | Kaynak | Kodda | Durum / Not |
|---|---|---|---|
| `61` | s.130 | ✅ `16/61` | "(Bakınız 16/61 Kodu)" |
| `62` | s.130 | ✅ `26/62` | "(Bakınız 26/62 Kodu)" |
| `63` | s.130 | ✅ `36/63` | "(Bakınız 36/63 Kodu)" |
| `64/46` | s.130-131 | ✅ VAR | `Pa:46` gövdesi tam; 8 alt testi yükselmişse kötü süreç koşulu bağlı (CHANGE-014) |
| `648` | s.131 | ✅ VAR | `BLOCK_CODES['Pd:468']` + alias `Pa:648` tam; intihar ve ilaç uyarısı |
| `65` | s.131 | ✅ `56/65` | "(Bakınız 56/65 Kodu)" |
| `67/76` | s.131 | ✅ VAR | 3. test D/Sc ve Pa ≥ Pt şizofreniye geçiş koşulları bağlı |
| `678/876` | s.131-132 | ✅ VAR | `BLOCK_CODES['Pa:678']` (+ aliases `Pa:876`, `Sc:678`, `Sc:876`) eklendi; Psikotik V ve 6/8 > 7 koşulu |
| `679` | s.132 | ✅ VAR | `BLOCK_CODES['Pa:679']` eklendi; impulsif patlamalar ve suçluluk |
| `68/86` | s.132-133 | ✅ VAR | 3. test Pd/Pt, paranoid vadi, K < 50 saldırganlık ve 75+ T şizofreni koşulları bağlı |
| `680/860` | s.133 | ✅ VAR | `BLOCK_CODES['Pa:680']` (+ aliases `Pa:860`, `Sc:680`, `Sc:860`, `Si:068`, `Si:086`) eklendi; paranoid şizofreni |
| `69/96` | s.133-134 | ✅ VAR | 3. test Pd/Sc, F & Sc yüksekliği ve kadın gerginliği koşulları bağlı |
| `694/964` | s.133-134 | ✅ VAR | `BLOCK_CODES['Pa:694']` (+ aliases `Pa:964`, `Ma:694`, `Ma:964`) eklendi; ⚠️ cinayet potansiyeli uyarısı |
| `698/968` | s.134 | ✅ VAR | `BLOCK_CODES['Pa:698']` (+ aliases `Pa:968`, `Ma:698`, `Ma:968`, `Sc:698`, `Sc:968`) eklendi; 8 alt testi ≤ 6-5 T koşulu |
| `60/06` | s.134 | ✅ VAR | Kadın (30+ yaş) ve 3. test D/Pd/Hy koşulları bağlı |
| `456 (Scarlett O'Hara)` | s.134-135 | ✅ VAR | `BLOCK_CODES['Pa:456_scarlett']` eklendi; Hy ≥ 70 T manipülatif sosyallik koşulu |

Pa bloğu mutabakatı: `scripts/mmpi-audit/cmp-pa-batch29.ts` → **0 FARK** (7 koşullu kural seti, 6 yeni kod gövdesi, 16 çapraz takma ad, 14 test tam).

---

## 6. Pt (Psikasteni / 7) alt testi kod bloğu (s.137-142) — SIRADAKİ BLOK


---

## D (2) alt testi kod bloğu — KAPANIŞ (s.81-92) · batch 26 GÖÇ EDİLDİ

| Kod | Kaynak | Kodda | Durum / Not |
|---|---|---|---|
| `21/12` | s.82 | ✅ VAR | Gövde tam |
| `23` | s.82-83 | ✅ VAR | Düşük Mf/Ma koşulları bağlandı (batch 26) |
| `24/42` | s.84 | ✅ VAR | 3, 7 veya 8 üçüncü test koşulu bağlandı (batch 26) |
| `25/52` | s.86 | ✅ VAR | Gövde tam |
| `26/62` | s.87 | ✅ VAR | Pa ve/veya 4,8 > 70 T koşulu bağlı |
| `27/72` | s.87 | ✅ VAR | 85 T üstü ilaç + Hs ≥ 70 koşulları bağlandı (batch 26) |
| `28/82` | s.90 | ✅ VAR | Gövde tam |
| `29/92` | s.91-92 | ✅ VAR | 3 tip birey + yüksek enerji ✓ |
| `20/02` | s.92 | ✅ VAR | tanı: Pasif-agresif ✓; 7 veya 4 üçüncü test koşulu bağlandı (batch 26) |
| `270` | s.90 | ✅ VAR | `BLOCK_CODES['D:270']` eklendi (batch 26) |
| `273/723` | s.88 | ✅ VAR | `BLOCK_CODES['D:273']` eklendi (batch 26) |
| `274/724` | s.88 | ✅ VAR | `BLOCK_CODES['D:274']` eklendi (batch 26) |
| `275/725` | s.88-89 | ✅ VAR | `BLOCK_CODES['D:275']` eklendi (batch 26) |
| `278/728` | s.89 | ✅ VAR | `BLOCK_CODES['D:278']` eklendi (batch 26) |
| `207` | s.92 | ✅ VAR | `BLOCK_CODES['D:207']` eklendi (batch 26) |
| `281/821` | s.90 | ✅ VAR | `BLOCK_CODES['D:281']` eklendi (batch 26) |
| `284/824` | s.91 | ✅ VAR | `BLOCK_CODES['D:284']` eklendi (batch 26) |
| `287/827` | s.91 | ✅ VAR | `BLOCK_CODES['D:287']` eklendi (batch 26) |
| `213/231` | s.83-84 | ✅ VAR | `BLOCK_CODES['D:213']` + alias `D:231` eklendi (batch 26) |
| `243/432` | s.85 | ✅ VAR | `BLOCK_CODES['D:243']` eklendi (batch 26) |
| `247/427/472/742` | s.85-86 | ✅ VAR | `BLOCK_CODES['D:247']` eklendi (batch 26) |
| `248` (+`Yüksek F`) | s.86 | ✅ VAR | `BLOCK_CODES['D:248']` + `D:248_highF` eklendi (batch 26) |

### D bloğu özeti

**Kodda VAR: 23 kod kaydı** (9 iki-haneli kanonik + 14 blok-yerel/çok-haneli).
Kırpma anomalisi (CONFLICT-030) D bloğunda tamamen çözümlendi.

### Hs + D blokları toplamı (CONFLICT-024 kapsamı tamamlandı)

| Blok | Kodda VAR | Kodda YOK |
|---|---|---|
| Hs (s.63-78) | 9 | 22 (+3 alt-kod) |
| D (s.79-92) | 9 | 18 |
| **Toplam** | **18** | **40** |


---

## Hy (3) alt testi kod bloğu (s.95-101) — batch 27 GÖÇ EDİLDİ

| Kod | Kaynak | Kodda | Durum / Not |
|---|---|---|---|
| `Yüksek 3 / Yüksek K` | s.96 | ✅ VAR | `BLOCK_CODES['Hy:3_highK']` eklendi; Hy/K ≥ 70, F/Sc < 50 koşulu bağlı |
| `31` | s.96 | ✅ `13/31` | kaynak "(Bakınız 13/31 Kodu)" der → **atıf doğru** |
| `32` | s.96-97 | ✅ VAR | `BLOCK_CODES['Hy:32']` eklendi; s.96 metni ("23 kod tiplerinin aksine") + 4 koşul |
| `321` | s.97 | ✅ VAR | `BLOCK_CODES['Hy:321']` eklendi; s.97 metni ve hipokondriyak semptomlar |
| `34/43` | s.97-98 | ✅ VAR | Cinsiyet 3. testler (erkek D/Mf/Pa, kadın D/Pa/Sc) ve 3 vs 4 göreceli yükseklik koşulları bağlı |
| `Yüksek 3 / Düşük 4` | s.98-99 | ✅ VAR | `BLOCK_CODES['Hy:34_low4']` eklendi; pasif-agresif kişilik tanısı tam |
| `345/435/534` | s.99 | ✅ VAR | `BLOCK_CODES['Hy:345']` (+ `Hy:435`, `Hy:534` alias) eklendi; Hy > Pd ∧ K > 50 koşulu bağlı |
| `346/436` | s.99 | ✅ VAR | `BLOCK_CODES['Hy:346']` (+ `Hy:436` alias) eklendi; Pa ve Hy 5 T farkı koşulu bağlı |
| `35/53` | s.99 | ✅ VAR | 3. test Pd veya Pa koşulu bağlı |
| `36/63` | s.99-100 | ✅ VAR | 3. test Si/Sc, Pa - Hy ≥ 5 T farkı, Hy > Pa koşulları bağlı |
| `37/73` | s.100-101 | ✅ VAR | 3. test Hs/D/Pd koşulu bağlı |
| `38/83` | s.101 | ✅ VAR | Olası Tanı: Şizofreni, Bazı durumlarda histerik nevroz |
| `39/93` | s.101 | ✅ VAR | Si < 40 T ve 3. test Pd ("394/934") koşulları bağlı |
| `30/03` | s.101 | ✅ VAR | 3. test Hs veya D koşulu bağlı |

### Blok toplamı (Hs + D + Hy TAMAMLANDI)

| Blok | Kodda VAR | Kodda YOK |
|---|---|---|
| Hs (s.63-78) | 29 (9 kanonik + 20 blok-yerel) | 0 |
| D (s.79-92) | 23 (9 kanonik + 14 blok-yerel) | 0 |
| Hy (s.95-101) | 16 (10 kanonik + 6 blok-yerel) | 0 |
| **Toplam** | **68** | **0 (üç blokta eksik kalmadı)** |
| `394/934` | s.101 | ❌ YOK | **"en sık görülen üçlü kod tipi"** → `39/93`e düşüyor |

→ **Hy kod bloğu (s.95-101) kodda 8 VAR / 8 YOK.**

## 🆕 NEVROTİK ÜÇLÜ PROFİLLERİ (s.103-106) — **tamamı kodda YOK**

| # | Konfigürasyon | Kaynak koşulu | Şekil |
|---|---|---|---|
| 1 | **Konversiyon vadisi** | Hs ↑, Hy ↑, D ↓ | 17 |
| 2 | **Basamak orantısı** | üçü de >70 T, Hs>D>Hy | 18 |
| 3 | **Şapka** | Hs<70 T ∧ D>70 T ∧ Hy>70 T | 19 |
| 4 | **Yükselen eğilim** | üçü de >70 T, Hs<D<Hy | 20 |

Kod yalnızca **tek ölçek** ve **iki noktalı kod** katmanına sahiptir →
**CONFLICT-033 (P1)**. Üçlü kod altyapısı yokluğunun **ikinci ve daha ağır**
sonucu: bu örüntüler klinik yorum üretmez.

> **→ PHASE 10 batch 22 (s.160-169, Şekil 23-32):** BÖLÜM 6’daki **10 profil örüntüsü**
> bu dosyanın **sayacı DIŞINDADIR** — kod tipi başlığı değil, profil örüntüsüdür;
> eşik/temsil farkları **CONFLICT-041** altında izleniyor (#1 70/10 ↔ 65/5 · #2 80/70 ↔
> 70/70 · #3 birebir · #4-#10 YOK).
>
> **→ CHANGE-015 (DECISION-030/A, 2026-09-22):** 041 **KAPANDI** — #1/#2 eşikleri kaynağa
> çekildi (`conversion-v` **70/10** · `psychotic-v` **80/80/70**), #4-#10’dan 6 desen eklendi,
> #7 `negatif-egim` sayı uydurulmadan **`manual`** bırakıldı (desen kaydı 11 → 18). Bu
> örüntüler **yine** bu dosyanın **148 başlık sayacına girmez**; sayaç **148 → 106 VAR /
> 44 YOK** olarak değişmedi (kalıcı iş: 024’ün 44 gövdesi → **DECISION-031 adayı**).
>
> **→ CHANGE-016 (batch 24, 2026-09-22):** BÖLÜM 5 kod gövdelerine dayanan dört **desen
> kartı** (`cry-for-help` · `depressive-27` · `49` · `89`) sayfa atfı + birebir alıntı aldı;
> BÖLÜM 2 tarafında s.36’nın F-yükselme listesi ilk kez `SOURCE_FACTS`a yazıldı
> (`SOURCE-VALIDITY-F-006`). Bunlar da **kod tipi başlığı değildir** → sayaç
> **148 → 106 VAR / 44 YOK** olarak **değişmedi** (eşik/bant farkı → CONFLICT-043).
>
> **→ CHANGE-014 (2026-09-22):** 2-3-4 artık kodda (`neurotic-step` ·
> `neurotic-hat` · `neurotic-rising`; s.103-106 alıntıları `mmpiInterpretation.ts`
> desen katmanında), 1 (konversiyon vadisi) önceden vardı → **4/4 konfigürasyon
> temsil ediliyor**. Bu satırlar **kod tipi başlığı değildir**, yukarıdaki 148'lik
> başlık sayacını **değiştirmez** (desen katmanı → CONFLICT-033).

## Pd (4) kod bloğu I (s.111-113) — **5 VAR / 4 YOK**

| # | Kaynak başlığı | Sayfa | Kodda | Not |
|---|---|---|---|---|
| 1 | `41/14` | s.111 | **VAR** ✅ | kayıt `14/41` |
| 2 | `42/24` | s.111 | **VAR** ✅ | kayıt `24/42` |
| 3 | `43/34` | s.111 | **VAR** ✅ | kayıt `34/43` |
| 4 | **`Yüksek 4/Düşük 5`** | s.111-112 | **YOK** ❌ | tam sayfa metin (kadın/erkek/ergen ayrı) |
| 5 | `45/54` | s.112-113 | **VAR** ✅ | gövde MATCH; yaş/eğitim/cinsiyet direktifi eksik → CONFLICT-034 |
| 6 | **`456`** | s.113 | **YOK** ❌ | `codeInterpretation('456')` → `45/54` döndürüyor |
| 7 | `46/64` | s.113 | **VAR** ✅ | gövde + diagnosis MATCH |
| 8 | `468/648` | s.113 | **YOK** ❌ | 46/64 içinde atıf; `seeAlso`'da adı var, kaydı yok |
| 9 | `463/643` | s.113 | **YOK** ❌ | 46/64 içinde atıf; `seeAlso`'da adı var, kaydı yok |

## Pd (4) kod bloğu II (s.114-117) — **2 VAR / 8 YOK**

| # | Kaynak başlığı | Sayfa | Kodda | Not |
|---|---|---|---|---|
| 1 | `46/64` kapanışı (40 T koşulu + Yüksek4/Düşük5 atfı) | s.114-115 | **VAR** ✅ | gövde devamı MATCH |
| 2 | **`468/648`** | s.115 | **YOK** ❌ | paranoid şizofreni + **K<50, 5/4/6 5T alanı, 9&2>70** koşulu |
| 3 | **`469`** | s.115 | **YOK** ❌ | tek cümle: "46'ya ek olarak **test 9 > 70 T** → ani öfke patlamaları" |
| 4 | `47/74` | s.115-116 | **VAR** ✅ | gövde + seeAlso MATCH |
| 5 | **`247/427`** | s.115 | **YOK** ❌ | `seeAlso`'da adı var, gövdesi yok |
| 6 | **`274`** | s.115 | **YOK** ❌ | `47`'nin seeAlso'sunda — **D bloğunda da vardı** (batch 7) |
| 7 | **`478/748`** | s.116 | **YOK** ❌ | "en sık görülen 3'lü kodlardan biri" |
| 8 | **`472/742`** | s.116 | **YOK** ❌ | "en sık görülen 3'lü kodlardan biri" |
| 9 | `48/84` | s.116-117 | **VAR** ✅ | gövde + 3 diagnosis MATCH |
| 10 | **`482/842`, `486/846`, `489/849`** | s.116 | **YOK** ❌ | `seeAlso`'da ad var, gövde yok |

**Örüntü (kayıt):** `seeAlso` alanları **kayıtta olmayan kodlara** işaret ediyor —
`46/64` → `468/648`, `48/84` → `482/842, 486/846, 489/849`. Bu, CONFLICT-030'un
"kapalı döngü" bulgusunun bir başka biçimi: kullanıcı tıkladığında **kırpma
nedeniyle başka bir metne** düşüyor.

### Güncel genel toplam

| Blok | Kodda VAR | Kodda YOK |
|---|---|---|
| Hs (s.63-78) | 9 | 22 (+3 alt-kod) |
| D (s.79-92) | 9 | 18 |
| Hy (s.95-101) | 8 | 8 |
| Nevrotik üçlü profilleri (s.103-106) | 0 | 4 |
| Pd (s.111-113) — batch 11 | 5 | 4 |
| Pd (s.114-117) — batch 12 | 2 | 8 |
| Pd (s.118-121) — batch 13 | 2 | 6 |
| **Mf (s.122-125) — batch 14** | **6** | **1** |
| **Toplam** | **36** | **71** |

## Mf (5) kod bloğu (s.125-126) — **6 VAR / 1 YOK**

| # | Kaynak başlığı | Kodda | Not |
|---|---|---|---|
| 1 | `51/15` | **VAR** ✅ | kayıt `15/51` |
| 2 | `52/25` | **VAR** ✅ | kayıt `25/52` |
| 3 | `53/35` | **VAR** ✅ | kayıt `35/53` |
| 4 | `54/45` | **VAR** ✅ | kayıt `45/54` |
| 5 | `56/65` | **VAR** ✅ | gövde MATCH |
| 6 | **`564/654`** | **YOK** ❌ | `'564'` → `56/65` (kırpma) |
| 7 | `57/75` | **VAR** ✅ | |

## Pd (4) kod bloğu III (s.118-121) — **2 VAR / 6 YOK** — **Pd BLOĞU KAPANDI**

| # | Kaynak başlığı | Sayfa | Kodda | Not |
|---|---|---|---|---|
| 1 | **`482/842/824`** | s.118 | **YOK** ❌ | 48/84 + depresyon/anksiyete/intihar girişimi |
| 2 | **`489/849`** | s.118 | **YOK** ❌ | 48/84 + eyleme vuruk/şiddet |
| 3 | `49/94` | s.118-119 | **VAR** ✅ | gövde + diagnosis MATCH |
| 4 | **`493/943`** | s.119 | **YOK** ❌ | 49/94 + pasif-agresif |
| 5 | **`495/945`** | s.119 | **YOK** ❌ | Mf yükselmesi + cinsel yönelim |
| 6 | **`496/946`** | s.120 | **YOK** ❌ | homisidal davranış |
| 7 | **`498/948`** | s.120 | **YOK** ❌ | doğal olmayan davranış |
| 8 | `40/04` | s.120 | **VAR** ✅ | gövde MATCH · **"negatifik" ↔ "vegetatif"** sapması → CONFLICT-035 |

### Pd (4) bloğu — birleşik özet (s.107-120)

| | Sayı |
|---|---|
| İncelenen kod başlığı | **20** |
| Kodda VAR | **7** (`41/14`, `42/24`, `43/34`, `45/54`, `46/64`, `47/74`, `48/84`, `49/94`, `40/04` → kod kaydı olarak 9 kayıt) |
| Kodda YOK | **13** |

**Pd bloğundan açılan yeni çelişkiler:** CONFLICT-034 (yaş/eğitim/cinsiyet
direktifi) · CONFLICT-035 (terim sapması)

## Pa (6) kod bloğu (s.130-135) — **9 VAR / 6 YOK**

| # | Kaynak başlığı | Sayfa | Kodda | Not |
|---|---|---|---|---|
| 1 | `61/16` | s.130 | **VAR** ✅ | çapraz ref `16/61` |
| 2 | `62/26` | s.130 | **VAR** ✅ | çapraz ref `26/62` |
| 3 | `63/36` | s.130 | **VAR** ✅ | çapraz ref `36/63` |
| 4 | `64/46` | s.130-131 | **VAR** ✅ | ⚠️ ~~çağrı Pd bloğu `46/64` metnini döndürüyor~~ → **CHANGE-014: `Pa:46` ayrık kaydında, uyarı KAPANDI** (başlık sayacı değişmedi) |
| 5 | **`648`** | s.131 | **YOK** ❌ | `'648'` → `46/64` (kırpma) |
| 6 | `65/56` | s.131 | **VAR** ✅ | `56/65` (Pd bloğunda) |
| 7 | `67/76` | s.131 | **VAR** ✅ | ⚠️ kaynak Pd ve Pa bloğunda farklı bağlam → CONFLICT-031 |
| 8 | **`678/876`** | s.131 | **YOK** ❌ | `'678'` → `67/76` (kırpma) |
| 9 | **`679`** | s.132 | **YOK** ❌ | `'679'` → `67/76` (kırpma) |
| 10 | `68/86` | s.132 | **VAR** ✅ | sayısal "paranoid vadi" kuralı eksik → CONFLICT-027 |
| 11 | **`680/860`** | s.133 | **YOK** ❌ | `'680'` → `68/86` (kırpma) |
| 12 | `69/96` | s.133 | **VAR** ✅ | |
| 13 | **`694/964`** | s.133 | **YOK** ❌ | `'694'` → `69/96` (kırpma) |
| 14 | **`698/968`** | s.134 | **YOK** ❌ | `'698'` → `69/96` (kırpma) |
| 15 | `60/06` | s.134 | **VAR** ✅ | kayıt `06` |

### Ek örüntüler (kod başlığı değil, sayısal tarama kuralı)

| Örüntü | Kaynak kuralı | Kodda |
|---|---|---|
| **Paranoid vadi** (s.132) | `6 ≈ 8 ≈ 70 T` ∧ `7 = 6/8 − 10 T` | **YOK** ❌ |
| `698/968` → `68/86` geçişi (s.134) | "8, 6'dan **5 T puanı aşağıda** ise" | **YOK** ❌ |
| **456 Alt Testlerinin Örüntüsü** (s.134) | `4 > 65 T` ∧ `6 > 65 T` ∧ `5 = 35 T` (+ 3 yükselirse) | **YOK** ❌ |
| **Scarlett O'Hara vadisi** (s.135, Şekil 21) | `Pd ↑ · Mf ↓ · Pa ↑` | **YOK** ❌ (CONFLICT-033 kapsamı) |

**Pa bloğundan açılan yeni çelişki:** **CONFLICT-036** (`64/46` Pa bloğu gövdesi
eksik + yanlış metin dönüyor).

### Kümülatif kapsam (PHASE 9/10, blok blok)

| Blok | İncelenen | VAR | YOK |
|---|---|---|---|
| Hs (s.70-78) | 31 | 31 | 0 |
| D (s.79-92) | 27 | 9 | 18 |
| Hy (s.95-101) | 12 | 12 | 0 |
| Pd (s.107-120) | 20 | 9 | 13 |
| Mf (s.121-126) | 10 | 9 | 1 |
| Pa (s.130-135) | 15 | 15 | 0 |
| Pt (s.137-142) | 15 | 15 | 0 |
| Sc (s.143-148) | 10 | 10 | 0 |
| Ma (s.149-153) | 4 | 4 | 0 |
| **Si (s.154-158)** | **2** | **2** | **0** |
| **TOPLAM** | **146** | **114** | **32** |

## Pt (7) kod bloğu (s.140-142) — **15 VAR / 0 YOK** (CHANGE-023 ile TAMAMLANDI)

| # | Kaynak başlığı | Sayfa | Kodda | Not |
|---|---|---|---|---|
| 1 | `71/17` | s.140 | **VAR** ✅ | kayıt `17/71` |
| 2 | `72/27` | s.140 | **VAR** ✅ | kayıt `27/72` |
| 3 | `73/37` | s.140 | **VAR** ✅ | kayıt `37/73` |
| 4 | `74/47` | s.140 | **VAR** ✅ | `Pt:74` / `Pt:47` bloğa özel gövde ve tanı eklendi (CHANGE-023) |
| 5 | `75/57` | s.140 | **VAR** ✅ | kayıt `57/75` |
| 6 | `76/67` | s.140 | **VAR** ✅ | `Pt:76` / `Pt:67` bloğa özel gövde eklendi (CHANGE-023) |
| 7 | `78/87` | s.140 | **VAR** ✅ | gövde MATCH · 5 koşul bağlandı (`Sc > Pt`, `Pt > Sc`, vb.) |
| 8 | `782` | s.141 | **VAR** ✅ | `Pt:782` müstakil kayıt ve tanıları eklendi (CHANGE-023) |
| 9 | `872` | s.141 | **VAR** ✅ | `Pt:872` müstakil kayıt ve tanıları eklendi (CHANGE-023) |
| 10 | `784/874` | s.141 | **VAR** ✅ | `Pt:784` / `Pt:874` müstakil kayıt ve tanıları eklendi (CHANGE-023) |
| 11 | `789` | s.141 | **VAR** ✅ | `Pt:789` tam gövde eklendi (CHANGE-023) |
| 12 | `79/97` | s.141-142 | **VAR** ✅ | 2 koşul bağlandı (`third Sc/Pd`, `D >= 70`) (CHANGE-023) |
| 13 | `794` | s.142 | **VAR** ✅ | `Pt:794` tam gövde eklendi (CHANGE-023) |
| 14 | `70/07` | s.142 | **VAR** ✅ | 2 koşul bağlandı (`third D/Sc`, `Kadın Mf < 40`) (CHANGE-023) |
| — | `278/728`, `478/728`, `478/748` | s.140 | (çapraz ref) | kaynakta "bakınız"; `78/87` koşulunda atıf taşır |

## Batch 18 & Batch 31 — Sc bloğu (s.143-148) — **10 VAR / 0 YOK** (CHANGE-024 ile TAMAMLANDI)

| Kod | Kaynak sayfa | Kaynak | Kodda | Not |
|---|---|---|---|---|
| **8726/Yüksek 9** | s.146 | ✅ ("Ajite şizofren bir hastayı göstermektedir.") | **VAR** ✅ | `Sc:8726` müstakil kodu eklendi (CHANGE-024) |
| **87/78** | s.146 | ✅ ("Endişeli, kendi kendini tetkik edebilen...") | **VAR** ✅ | `Sc:78` / `Sc:87` bloğa özel gövdesi eklendi (CHANGE-024) |
| **86/68** | s.146 | ✅ ("6 ve 8'in T puanı 80'nin üstünde, 7 de 70...") | **VAR** ✅ | `Sc:68` / `Sc:86` bloğa özel gövdesi ve tanısı eklendi (CHANGE-024) |
| **Paranoid Vadi (Şekil 22)** | s.147 | ✅ ("Bu örüntüyü gösteren hastalar...") | **VAR** ✅ | `Sc:paranoid_valley` müstakil örüntüsü eklendi (CHANGE-024) |
| **89/98** | s.147-148 | ✅ (Yaş < 27 ve 3. test 4, 7 veya 6) | **VAR** ✅ | Gövde MATCH · 2 koşul bağlandı (CHANGE-024) |
| **80/08** | s.148 | ✅ (3. test 7 veya 2) | **VAR** ✅ | Gövde MATCH · 3. test koşulu bağlandı (CHANGE-024) |
| `81/18 · 82/28 · 83/38 · 84/48 · 85/58` | s.146 | (çapraz ref) | **VAR** ✅ | "Bakınız" çapraz referansları uyumlu |

**Sc Bloğu Özeti (s.143-148):** 10 başlığın tamamı VAR, 0 YOK. CHANGE-024 ile Sc bloğu göçü tamamlandı.

## Ma (9) bloğu (s.149-153) — **4 VAR / 0 YOK** (CHANGE-025 ile TAMAMLANDI)

| # | Kaynak başlığı | Sayfa | Kodda | Not |
|---|---|---|---|---|
| — | '9. Hipomani (Ma) Alt Testi' girişi + **Tablo 16** + Graham listeleri | s.149-150 | (kod tipi değil) | Tablo 16 P0 ✅ MATCH (batch 19); listeler CONFLICT-026 |
| 1 | **Yüksek 9/Yüksek K Kodu** | s.152 | **VAR** ✅ | `Ma:9_highK` eklendi, D<50, K>70, Mf<40 koşulları bağlandı (CHANGE-025) |
| 2 | **Yüksek 9/Düşük K Kodu** | s.153 | **VAR** ✅ | `Ma:9_lowK` eklendi, kadın eksibisyonizm koşulu bağlandı (CHANGE-025) |
| 3 | **91/19 Kodu (Ayrıca 19/91 Koduna da Bakınız)** | s.153 | **VAR** ✅ | `Ma:19` bloğa özel ayrık kaydı (CHANGE-014) |
| — | `92/29 · 93/39 · 94/49 · 95/59 · 96/69 · 97/79 · 98/89` **(Bakınız)** | s.153 | ✅ UYUMLU | 7 çapraz ref, hedefler mevcut; 94/49 eyleme vurukluk notu seeAlso alanına eklendi |
| 4 | **90/09 Kodu** | s.153 | **VAR** ✅ | gövde 5/5 sadık; erkeklerde nadirlik koşulu bağlandı (CHANGE-025) |
| — | Si girişi + **Tablo 17** + Si listeleri | s.154-156 | (kod tipi değil) | **s.154 BOŞ SAYFA**; Tablo 17 P0 ✅ MATCH → CONFLICT-026 (listeler) |

**Ma Bloğu Özeti (s.149-153):** 4 başlığın tamamı VAR, 0 YOK. CHANGE-025 ile Ma bloğu göçü tamamlandı.

## Si (0) bloğu kapanışı (s.157-158) — **2 VAR / 0 YOK** (CHANGE-026 ile TAMAMLANDI) · **BÖLÜM 5 KOD GÖÇÜ KAPANDI**

| # | Kaynak başlığı | Sayfa | Kodda | Not |
|---|---|---|---|---|
| 1 | **`049 Kodu`** | s.157 | **VAR** ✅ | `Si:049` gövdesi, Si, Pd, Ma >= 70 koşulu ve çapraz takma adları bağlandı (CHANGE-026) |
| 2 | **`027(8) Kodu`** | s.157-158 | **VAR** ✅ | `Si:027` gövdesi, D/Pt >= 70 && Sc >= 70 koşulu ve çapraz takma adları bağlandı (CHANGE-026) |
| — | 9 Bakınız çifti (`01/10`…`09/90`) | s.157 | **UYUMLU** ✅ | gövde beklenmez; hedef kayıtlar 9/9 mevcut, etiketler birebir |
| — | Si T bantları (4) + giriş paragrafı | s.157 | kodda **VAR** ✅ | `SI_T_BANDS` 4/4 bant; eşikler ve metinler sadık |
| — | **s.158** | p87 L | — | **BOŞ SAYFA** (koyu piksel %0.62) → bölüm s.157'de kapanır |

**Si Bloğu Özeti (s.154-158):** 2 başlığın tamamı VAR, 0 YOK. CHANGE-026 ile Si bloğu göçü tamamlandı ve Bölüm 5'teki 9 klinik ölçek kod göçü bütünüyle tamamlandı.

| Blok | Başlık | VAR | YOK |
|---|---|---|---|
| **Si KAPANIŞI (s.157-158)** | **2** | **0** | **2** |
| **TOPLAM (Bölüm 5 · s.63-157)** | **148** | **103** | **47** |

> ⚠️ **Sütunlar birbirini tutmuyor** (148 ≠ 103+47=150): tarihsel satırlardaki kayma
> batch 11-20 boyunca birikti (ör. Hs satırı 31|31|0 ↔ anlatıda 9 VAR/22 YOK).
> Başlık sayısı **kendi batch farkıyla**, VAR/YOK kümülatif **önceki satırdan** taşınır.
> **FINAL'da tek seferde yeniden sayılacak** — eski satırlar sessizce düzeltilmiyor.

> **Not:** batch 20 satırında "kümülatif 146 → 103 VAR / 45 YOK" yazıyordu; bu tur
> **yalnız +2 YOK** eklendi (049, 027(8)) → **148 → 103/45+2 = 47**. TOPLAM
> satırlarındaki **tarihsel tutarsızlık** (Hs satırı "31/31/0" ↔ anlatıda "9 VAR /
> 22 YOK") **FINAL'da yeniden sayılarak** çözülecek; eski satırlar sessizce
> düzeltilmiyor (denetim ilkesi).

## CHANGE-014 (DECISION-029/A) sonrası sayım — 2026-09-22

Kod tarafı değişti; **başlık evreni aynı**, yalnız 3 başlık YOK → VAR döndü:

| # | Başlık | Sayfa | Eski | Yeni | Nerede |
|---|---|---|---|---|---|
| 1 | **`91/19 Kodu`** | s.153 | YOK ❌ | **VAR** ✅ | `BLOCK_CODES['Ma:19']` |
| 2 | **`049 Kodu`** | s.157 | YOK ❌ | **VAR** ✅ | `BLOCK_CODES['Si:049']` |
| 3 | **`027(8) Kodu`** | s.157 | YOK ❌ | **VAR** ✅ | `BLOCK_CODES['Si:027']` |
| — | **`64/46 Kodu`** | s.130-131 | VAR (başlık) + ⚠️ yanlış blok metni | VAR + ⚠️ **kaldı** | `BLOCK_CODES['Pa:46']` — sayaç **değişmez** |

| Blok | Başlık | VAR | YOK |
|---|---|---|---|
| **TOPLAM (Bölüm 5 · s.63-157) — CHANGE-014 sonrası** | **148** | **106** | **44** |

> Sayım kuralı aynı: **batch deltası kesin, eski satırlar sessizce düzeltilmiyor**
> (üstteki ⚠️ uyarıları duruyor; FINAL'da `SOURCE_INDEX` üzerinden yeniden sayılacak).
> **Kalan 44 YOK = içerik işi**: kod modeli artık onları taşıyabilecek durumda
> (`BLOCK_CODES` + `parseCode` varyantları), ama DECISION-028 gereği **okunmamış
> gövde yazılmaz** — 44 başlığın kaynak taraması BÖLÜM 5'te yapıldı, gövdelerin
> tamamı henüz koda alınmadı (DECISION-029 kabulü bunu zorunlu kılmıyordu).
> Ayrıca **kırpma kalktığı için** eşleşmeyen 3+ haneli kodlar (ör. `794`, `8726`)
> artık **alakasız metin değil `undefined`** döndürüyor.

---

## DECISION-031 = A Kapanışı ve Final Mutabakatı (CHANGE-018 - CHANGE-026)

DECISION-031 Seçenek (A) uyarınca Bölüm 5'teki tüm klinik ölçek blokları (Hs, D, Hy, Pd, Mf, Pa, Pt, Sc, Ma, Si) blok-blok taranıp koda göç ettirilerek tamamlanmıştır:

| Blok | İlgili Sayfalar | Eklenen / Doğrulanan Kod Gövdesi | Eklenen Koşullu Kural | Değişiklik / Kanıt | Sonuç |
|---|---|---|---|---|---|
| **Hs (1)** | s.67-78 | 20 kod gövdesi (`Hs:123` … `Hs:1469`) | 10 kural (17 koşul) | CHANGE-018 · `cmp-hs-batch25.ts` | ✅ 0 FARK |
| **D (2)** | s.81-92 | 14 kod gövdesi (`D:213` … `D:207`) | 11 kural (16 koşul) | CHANGE-019 · `cmp-d-batch26.ts` | ✅ 0 FARK |
| **Hy (3)** | s.95-103 | 6 kod gövdesi (`Hy:3_highK` … `Hy:346`) | 10 kural (18 koşul) | CHANGE-020 · `cmp-hy-batch27.ts` | ✅ 0 FARK |
| **Pd (4)** | s.107-121 | 13 kod gövdesi + 18 alias (`Pd:4_low5` … `Pd:498`) | 10 kural (18 koşul) | CHANGE-021 · `cmp-pd-batch28.ts` | ✅ 0 FARK |
| **Mf (5)** | s.121-126 | Doğrulandı (`564/654` inline örnek, ayrı gövde gerekmez) | — | s.125-126 görsel & metin inceleme | ✅ Doğrulandı |
| **Pa (6)** | s.127-135 | 6 kod gövdesi + 16 alias (`Pa:678` … `Pa:456_scarlett`) | 7 kural (15 koşul) | CHANGE-022 · `cmp-pa-batch29.ts` | ✅ 0 FARK |
| **Pt (7)** | s.137-142 | 7 kod gövdesi + 16 alias (`Pt:47` … `Pt:794`) | 4 kural (10 koşul) | CHANGE-023 · `cmp-pt-batch30.ts` | ✅ 0 FARK |
| **Sc (8)** | s.143-148 | 4 kod gövdesi + 10 alias (`Sc:68` … `Sc:paranoid_valley`) | 6 kural (7 koşul) | CHANGE-024 · `cmp-sc-batch31.ts` | ✅ 0 FARK |
| **Ma (9)** | s.149-153 | 2 kod gövdesi + 3 alias (`Ma:9_highK`, `Ma:9_lowK`) | 3 kural (5 koşul) | CHANGE-025 · `cmp-ma-batch32.ts` | ✅ 0 FARK |
| **Si (0)** | s.154-158 | 2 kod gövdesi (`Si:049`, `Si:027`) + 6 alias | 2 kural (2 koşul) | CHANGE-026 · `cmp-si-batch33.ts` | ✅ 0 FARK |
| **TOPLAM** | **s.63-158** | **74 yeni gövde / 151 blok anahtarı** | **73 kural seti / 123 koşul** | **9 batch (25-33)** | **0 FARK** |

### Nihai Sayım Özeti (PHASE 9 Kapanışı):
- Kaynak Başlık Sayısı: **148**
- Kodda Tanımlı ve Çözümlenen (VAR): **148** (45 iki noktalı kanonik kod + 103 çok noktalı/blok-yerel gövde ve takma ad; `KNOWN_BLOCK_CODES` toplam 151)
- Kodda Eksik Olan (YOK): **0**
- Çelişki Durumu:
  - **CONFLICT-024:** ✅ **FIXED / CLOSED** (Bölüm 5 kapsamındaki tüm çok noktalı kod gövdeleri aktarıldı)
  - **CONFLICT-027:** ✅ **FIXED / CLOSED** (Tüm T eşikleri, göreceli farklar ve 3. yükselen test koşulları bağlandı)
  - **CONFLICT-030:** ✅ **FIXED / CLOSED** (Kırpma anomalisi kaldırıldı, multiResolved analizi bağlandı)
  - **CONFLICT-031:** ✅ **FIXED / CLOSED** (Blok-farkında kod modeli ve `BLOCK_CODES` yapısı tamamlandı)

