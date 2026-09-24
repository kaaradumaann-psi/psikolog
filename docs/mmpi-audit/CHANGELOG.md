# CHANGELOG

Denetim günlüğü. Her oturum buraya bir kayıt ekler.

---

## 2026-09-21 — Oturum 1

- Denetim altyapısı kuruldu: `docs/mmpi-audit/` (15 dosya) + `scripts/mmpi-audit/extract.py`
- Kaynak künyesi doğrulandı: Ceyhun & Oral (2003), 2. Baskı, **MMPI-1 / 566 madde**
- PDF profillendi: 139 sayfa, **gömülü metin yok** (görüntü tabanlı tarama),
  yatay düzen; her PDF sayfası **iki kitap sayfası** içeriyor
- **Sayfa eşleme formülü** kuruldu ve doğrulandı: `leaf = kitap s. + 15`
- İçindekiler (kitap i-vi → PDF p3 R-p6 R) OCR ile çıkarıldı → `SOURCE_INDEX.md`
- OCR altyapısı kuruldu (RapidOCR); tesseract kurulamadı (apt erişilemez)
- Batch 1 işlendi: PDF p8-16 → Bölüm 1 tanımı, geçerlik testlerinin geliştirilmesi
- Batch 2 işlendi: PDF p22-29 → **Bölüm 3 (geçerlik değerlendirmesi), kitap s.29-42**
- **? / L / F / K** geçerlik alt testleri doğrulandı (madde anahtarları + normlar + bantlar)
- 6 SOURCE_FACT grubu oluşturuldu; hepsi görsel doğrulamalı
- **3 P0 çelişki bulundu**:
  - CONFLICT-001: F kadın normu (kaynak 10.11 ↔ kod 9.38)
  - CONFLICT-002: K normları (kaynak 13.90/13.54 ↔ kod 13.98/11.82)
  - (aynı kayıtta) K erkek normundaki yazım farkı
- 4 P1/P2 çelişki/kayıt: L ve F ham-T bant sınırları, kaynakta bulunmayan
  L/K ham bant tabloları, eksik `docs/kaynak-denetimi.md`
- **Kod değişikliği YOK** (DECISION-004); testler 287/287 PASS
- Sonraki: PDF p26 R → K alt testi devamı, sonra PHASE 4 ve Ek 9

### Doğrulanan hızlı özet

| Öğe | Sonuç |
|---|---|
| L madde anahtarı (15 madde) | ✅ birebir MATCH |
| F madde anahtarı (44 D + 20 Y) | ✅ birebir MATCH |
| K madde anahtarı (1 D + 28 Y) | ✅ birebir MATCH |
| L normu (6.45 / 6.00) | ✅ MATCH |
| F normu (8.30 / **10.11**) | ⚠️ kadın P0 CONFLICT |
| K normu (**13.90** / **13.54**) | ⚠️ iki P0 CONFLICT |
| (?) ham bantları (0/1-5/6-30/31+) | ✅ MATCH |

### Ek bulgu (aynı oturum)

- Kitap s.43 (PDF p29 R) okundu: **Bölüm 4 = geçerlik konfigürasyonlarının kaynağı**.
  "Konfigürasyon 1" = "Şekil 1. Tersine V" → kodun `VALIDITY_CONFIGS[0]` kuralıyla
  birebir aynı (`L 50-60 ∧ K 50-60 ∧ F > 70`) ✅ MATCH.
  → `SOURCE-VALIDITY-CONFIG-001`, `INTERPRETATION_AUDIT.md`
- Kaynak: "**(?)** alt testi standart profil kağıdına işaret edilmez" → kodda da
  ? ölçeği konfigürasyona girmez ✅

---

## 2026-09-21 — Oturum 2 (devam)

- **PHASE 3 kapanışı:** K T bantları (kitap s.40) görsel olarak doğrulandı →
  `72 T ve üstü` · `61-72` · `46-60` · `27-45`. Yapısal kural da teyit edildi:
  "K alt testi, profili geçersiz yapacak belirgin değerlerin olmadığı tek alt testtir."
- L tablosu (s.31) + normlar (6.45 / 6.00) görsel doğrulandı
- F tablosu (s.34) sütunlar arası boşluk kuralıyla yeniden okundu; normlar
  (8.30 / **10.11**) teyit edildi
- K tablosu (s.38) tam sayfa görüntüsüyle doğrulandı; **160 ve 322 maddelerinin
  dikişte kaybolmadığı** kanıtlandı; normlar (13.90 / 13.54) teyit edildi
- **PHASE 2 (madde anahtarları) işlendi:** Ek 9, kitap s.244-256 = PDF p130 L – p136 L
  - Yeni araç: `scripts/mmpi-audit/dump-keys.ts` (kod anahtarlarını JSON'a döker)
  - Yeni araç: `scripts/mmpi-audit/compare-keys.py` (46 anahtarı karşılaştırır)
  - **Sonuç: 41 MATCH / 5 DIFF / 0 MISSING**
- **5 yeni P0 çelişki bulundu ve görsel olarak doğrulandı:**
  - CONFLICT-008 — F anahtarında **69 ↔ 169** basamak hatası
  - CONFLICT-009 — Es (Ego Gücü) **13 madde yanlış yönde** (483, 488, 489, 494,
    510, 525, 541, 544, 548, 554, 555, 559, 561)
  - CONFLICT-010 — W_FEM **2 madde yanlış yönde** (126, 463)
  - CONFLICT-011 — AVD **13 madde eksik** (38 yerine 25)
  - CONFLICT-012 — HST **7 madde eksik** (20 yerine 13)
- Mf cinsiyet kuralı doğrulandı: kaynak dipnotundaki 5 glifli madde
  (69, 179, 231, 297, 133) kodda doğru şekilde ters çevrilmiş ✅
- MAC dipnotu doğrulandı: kitap #215 ve #460'ı çıkarıp 49 madde kullanır;
  kod aynısını yapar ✅ (DECISION-009)
- Ek 10 (s.257-260) OCR alındı ancak tablo yapısı çözülemedi → `NEEDS_REVIEW`
- **Kod değişikliği yine YOK** — 5 düzeltme `DECISION-008` ile PHASE 3
  kapanışından sonraya planlandı

### PHASE 2 sayısal özet

| Sonuç | Adet |
|---|---|
| MATCH | 41 |
| DIFF (hepsi P0) | 5 |
| MISSING | 0 |
| Toplam karşılaştırılan anahtar | 46 |
| Görsel doğrulanmış MATCH | 8 |
| OCR doğrulanmış MATCH (görsel bekliyor) | 33 |

### Güncel çelişki tablosu

| ID | Öncelik | Konu | Durum |
|---|---|---|---|
| CONFLICT-001 | P0 | F kadın normu (10.11 ↔ 9.38) | OPEN |
| CONFLICT-002 | P0 | K normları (13.90/13.54 ↔ 13.98/11.82) | OPEN |
| CONFLICT-003 | P1 | L T bandı alt sınırı (59 ↔ 56) | OPEN |
| CONFLICT-004 | P1 | F ham bant sınırları (3-9/16-25/26+ ↔ 3-7/16-22/23+) | OPEN |
| CONFLICT-005 | P1 | L/K ham bant tabloları kaynakta yok | INVESTIGATING |
| CONFLICT-006 | P2 | F/K T bant sınır yazımı | CONFIRMED (kabul) |
| CONFLICT-007 | P2 | `docs/kaynak-denetimi.md` depoda yok | CONFIRMED |
| **CONFLICT-008** | **P0** | **F anahtarı 69 ↔ 169** | **CONFIRMED** |
| **CONFLICT-009** | **P0** | **Es 13 madde yanlış yönde** | **CONFIRMED** |
| **CONFLICT-010** | **P0** | **W_FEM 2 madde yanlış yönde** | **CONFIRMED** |
| **CONFLICT-011** | **P0** | **AVD 13 madde eksik** | **CONFIRMED** |
| **CONFLICT-012** | **P0** | **HST 7 madde eksik** | **CONFIRMED** |

---

## 2026-09-21 — Oturum 3: DÜZELTME PAKETİ

**İlk kod değişiklikleri yapıldı.** `DECISION-008` uyarınca 5 P0 anahtar
hatası tek pakette düzeltildi ve kalıcı regresyon testi eklendi.

### Değişiklikler

| ID | Dosya | Ne |
|---|---|---|
| CHANGE-001 | `mmpiKeys.ts` | F: `69` → `169` (CONFLICT-008) |
| CHANGE-002 | `mmpiDerived.ts` | Es: 13 madde Doğru→Yanlış (CONFLICT-009) |
| CHANGE-003 | `mmpiDerived.ts` | W_FEM: `126, 463` Yanlış→Doğru (CONFLICT-010) |
| CHANGE-004 | `mmpiDerived.ts` | AVD: +13 madde, 25→38 (CONFLICT-011) |
| CHANGE-005 | `mmpiDerived.ts` | HST: +7 madde, 13→20 (CONFLICT-012) |
| CHANGE-006 | `tests/mmpiKeyIntegrity.test.ts` | **YENİ**: 7 test, anahtar bütünlüğü |

### Doğrulama

| Komut | Sonuç |
|---|---|
| `npx tsx scripts/mmpi-audit/dump-keys.ts` + `compare-keys.py` | **46/46 MATCH, 0 DIFF** |
| `npm run typecheck` | **PASS** |
| `npm test` | **294/294 PASS** (287 baseline + 7 yeni) |
| `npm run build` | **PASS** |

**REGRESSION: YOK.**

### Düzeltmelerin bilimsel etkisi

| Değişiklik | Önce | Sonra |
|---|---|---|
| F geçerlilik | Yanlış ölçek: madde 69 sayılıyor, 169 sayılmıyor → profil geçerlilik kararı hataya açık | Kaynakla birebir |
| Es ego gücü | 13 madde ters yönde → puan sistematik sapıyordu | Kaynakla birebir |
| W_FEM | 2 madde ters yönde | Kaynakla birebir |
| AVD çekingen kişilik | 25 madde → eşikler anlamsız, özellikler kaçırılıyordu | 38 madde, kaynakla birebir |
| HST histrionik | 13 madde → eşikler erişilemez | 20 madde, kaynakla birebir |

### Yeni keşif

Yeni `mmpiKeyIntegrity` testi ilk çalıştırmasında **OH ölçeğinde kaynak içi
tutarsızlık** buldu: başlık "Madde sayısı: 33", tablo 31 madde listeler.
Yüksek DPI görsel doğrulamayla teyit edildi → `SOURCE-INTERNAL-OH-001`,
`DECISION-012`. Kod tabloyu doğru izliyor, **değişiklik yok**.

### Güncel çelişki tablosu

| ID | Öncelik | Konu | Durum |
|---|---|---|---|
| CONFLICT-001 | P0 | F kadın normu (10.11 ↔ 9.38) | OPEN |
| CONFLICT-002 | P0 | K normları (13.90/13.54 ↔ 13.98/11.82) | OPEN |
| CONFLICT-003 | P1 | L T bandı alt sınırı (59 ↔ 56) | OPEN |
| CONFLICT-004 | P1 | F ham bant sınırları | OPEN |
| CONFLICT-005 | P1 | L/K ham bant tabloları kaynakta yok | INVESTIGATING |
| CONFLICT-006 | P2 | F/K T bant sınır yazımı | CONFIRMED (kabul) |
| CONFLICT-007 | P2 | `docs/kaynak-denetimi.md` depoda yok | CONFIRMED (ertelendi) |
| **CONFLICT-008..012** | **P0** | **5 anahtar hatası** | **✅ FIXED** |

Kalan açık: **7 çelişki** (2 P0 norm, 3 P1, 2 P2).

---

## 2026-09-21 — Oturum 4: PHASE 3 KAPANIŞI + PHASE 6 NORM DOĞRULAMASI

### PHASE 3 — DONE

- Kitap s.41-42 okundu ve **Bölüm 3 tamamlandı**
- Kitap s.42'nin boş olduğu görsel olarak doğrulandı (Bölüm 4'ün karşı sayfası)
- K T bantları TAM görsel doğrulandı: `72+` / `61-72` / `46-60` / `27-45`
- Yapısal kural teyit edildi: "K, profili geçersiz yapacak belirgin değerlerin
  olmadığı **tek** alt testtir" → bugünkü kod bu davranışı doğru uygular

### PHASE 6 — EN ÖNEMLİ BULGU: NORM KAYNAĞI BULUNDU

- **Tablo 30** (kitap s.195, PDF p105 R) bulundu ve tam sayfa görsel okundu:
  "Normal Türk, Erkek ve Kadınların MMPI Alt Testlerindeki Ortalama ve
  Standart Sapmaları", N = 1003 erkek / **663 kadın**
- OCR bu sayfayı **boş** döndürmüştü → yalnızca görsel okuma ile elde edildi
- Yeni araç: `scripts/mmpi-audit/compare-norms.py`
- **SONUÇ: `TURKISH_NORMS` 26/26 HÜCRE BİREBİR MATCH**

### ⚑ İKİ P0 ÇELİŞKİ REJECTED — kod doğruydu

| Çelişki | Sanılan | Gerçek |
|---|---|---|
| CONFLICT-001 (F kadın) | Kod 9.38 yanlış, kaynak 10.11 | **Kod doğru** (Tablo 30); geçerlik dipnotu (s.34) Tablo 30 ile çelişiyor |
| CONFLICT-002 (K normları) | Kod 13.98/11.82 yanlış | **Kod doğru** (Tablo 30); geçerlik dipnotu (s.38) Tablo 30 ile çelişiyor |

**Kitap kendi içinde tutarsız**: geçerlik bölümü dipnotları (s.34, s.38)
standardizasyon tablosu (s.195) ile uyuşmuyor. Kod standardizasyon tablosunu
izler — bu **doğru seçimdir**.

> `DECISION-004` ("kaynağı tam doğrulamadan kod değiştirme") burada kritik oldu:
> iki "P0 hata" erken düzeltilseydi **doğru olan kod bozulacaktı.**

### Ek doğrulama: K düzeltmesi tasarımı

Tablo 30, K düzeltmesi **uygulanmış ve uygulanmamış** satırları ayrı verir
(Hs+.5K, Pd+.4K, Pt+1K, Sc+1K, Ma+.2K). Kod T dönüşümünden önce K düzeltmesini
uyguladığı için **doğru satırları** kullanır → `K_CORRECTION` tasarımı
bağımsız olarak doğrulandı.

### Ek 10 — tanımlandı, norm kaynağı DEĞİL

Ek 10 (s.257-260), **tanı gruplarına** ait ortalamaları verir (Psikopati,
Şizofreni Akut/Kronik, Depresif Psikoz, Borderline, Psikotik, Nevrotik…).
Normal popülasyon değildir → `DECISION-016`. Kodda karşılığı yok.

### Örneklem sınırı (yorum katmanı için uyarı)

Norm örneklemi "normal Türk toplumu" değil: **16-30 yaş ağırlıklı, eğitimli,
kentli** (%85 bekâr, %84.88 büyük kent, orta+lise %54.29 + üniversite %47.21).
Kaynak kitap da 31-50 yaş aralığının **yetersiz temsil edildiğini** söyler
(s.192). Bu, yorum metinlerinde "norm sınırı" iddiaları için önemlidir
→ PHASE 10/13'te ele alınacak.

### Kod değişikliği

**YOK.** Bu oturumda yalnızca test (+3) ve dokümantasyon eklendi.
`compare-norms.py` aracı eklendi.

### Testler

**297/297 PASS** · typecheck **PASS** · build **PASS** · REGRESSION **YOK**

### Güncel çelişki tablosu

| ID | Öncelik | Konu | Durum |
|---|---|---|---|
| CONFLICT-001 | P0 | F kadın normu | ✅ **REJECTED** (kod doğru) |
| CONFLICT-002 | P0 | K normları | ✅ **REJECTED** (kod doğru) |
| CONFLICT-003 | P1 | L T bandı alt sınırı (59 ↔ 56) | OPEN |
| CONFLICT-004 | P1 | F ham bant sınırları | OPEN |
| CONFLICT-005 | P1 | L/K ham bant tabloları kaynakta yok | INVESTIGATING |
| CONFLICT-006 | P2 | F/K T bant sınır yazımı | CONFIRMED (kabul) |
| CONFLICT-007 | P2 | `docs/kaynak-denetimi.md` depoda yok | CONFIRMED |
| CONFLICT-008..012 | P0 | 5 anahtar hatası | ✅ FIXED |

**P0 açık çelişki kalmadı.** Kalan: 3 P1 + 2 P2.

---

## PHASE 4 — batch 1: Geçerlik konfigürasyonları, K+, F-K, TR endeksi

Tarih: 2026-09-21 · Kaynak: kitap **s.56-61** (PDF p36 L – p38 R)
Sayfa doğrulaması: her sayfanın numarası görsel olarak okundu
(p036_L=56, p036_R=57, p037_L=58, p037_R=59, p038_L=60, p038_R=61) —
eşleme formülüyle (`leaf = sayfa + 15`) tutarlı.

### İşlenen sayfalar

| Kitap s. | PDF | İçerik | Sonuç |
|---|---|---|---|
| 56 | p36 L | Konfigürasyon 14 (L>55, F<60, K 59-64) + Şekil 14 | ✅ birebir MATCH |
| 57 | p36 R | Konfigürasyon 15 (L=60, F>70, K<40) + Şekil 15 + **K+ profili** | ⚠️ CONFLICT-014 → **REJECTED** |
| 58 | p37 L | **F-K endeksi** (kesim 11→9, 0-9 geçerli, >9 sahte-kötülük, 0 sahte-iyilik) | ✅ MATCH (bir gerilim: CONFLICT-013) |
| 59 | p37 R | **TR kesme puanı ≥3** + F-K 8-11 / >16 bantları + Greene 1979 | ❌ CONFLICT-015 → **FIXED** |
| 60 | p38 L | **Tablo 6 — 16 tekrarlanmış madde çifti** | ✅ 16/16 birebir |
| 61 | p38 R | **Tablo 7 — Dikkatsizlik alt testi 12 çift + yön** | ✅ 12/12 birebir |

### Yeni SOURCE_FACT'ler

`SOURCE-FK-001..004` · `SOURCE-CONFIG-014` · `SOURCE-CONFIG-015` ·
`SOURCE-TR-001..003` · `SOURCE-CL-001` (9 yeni fact)

### Çelişkiler

| ID | Konu | Öncelik | Sonuç |
|---|---|---|---|
| CONFLICT-013 | F-K = 0: sahte-iyilik etiketi ↔ geçerlilik sınırı | P2 | **REJECTED** (kaynak içi gerilim, kod doğru) |
| CONFLICT-014 | Konf. 15: kaynak L=60 noktası ↔ kod 55-65 bandı | P2 | **REJECTED** (ilk P1 bulgum **hatalıydı**, düzeltildi) |
| CONFLICT-015 | TR kesme puanı 1 puan kaymış (3 tutarlı sayılıyordu) | P1 | **FIXED** (CHANGE-007) |

### Kod değişikliği

**CHANGE-007** — `src/scoring/mmpiConsistency.ts`:
`consistent = score <= 3` → `score <= 2`; kaynakta olmayan "üç-dört"
iddiası ve Gravitz & Gerton atfı kaldırıldı; +4 regresyon testi.

### Önemli süreç olayı

CONFLICT-014 ilk kaydedildiğinde **hatalıydı**: "kaynak başlığı 60 der, şekil 55
gösterir" iddiası, şeklin yüksek DPI okumasıyla **çürütüldü** (şekilde L noktası
tam 60'ta; kaynakta "55" diye bir değer yok). Kayıt silinmedi; **düzeltme geçmişi
korunarak** REJECTED'a çevrildi (Previous finding / New evidence / Resolution /
Reason). Aynı hata sınıfı için kural eklendi: **şekil içi eğri/ızgara değerleri
200 DPI OCR ile okunamaz, yüksek DPI görsel doğrulama zorunludur.**

### Güncel çelişki tablosu

| ID | Öncelik | Konu | Durum |
|---|---|---|---|
| CONFLICT-001 | P0 | F kadın normu | ✅ **REJECTED** (kod doğru) |
| CONFLICT-002 | P0 | K normları | ✅ **REJECTED** (kod doğru) |
| CONFLICT-003 | P1 | L T bandı alt sınırı (59 ↔ 56) | OPEN |
| CONFLICT-004 | P1 | F ham bant sınırları | OPEN |
| CONFLICT-005 | P1 | L/K ham bant tabloları kaynakta yok | INVESTIGATING |
| CONFLICT-006 | P2 | F/K T bant sınır yazımı | CONFIRMED (kabul) |
| CONFLICT-007 | P2 | `docs/kaynak-denetimi.md` depoda yok | CONFIRMED |
| CONFLICT-008..012 | P0 | 5 anahtar hatası | ✅ FIXED |
| CONFLICT-013 | P2 | F-K = 0 etiketi | ✅ **REJECTED** |
| CONFLICT-014 | P2 | Konf. 15 L nokta ↔ bant | ✅ **REJECTED** |
| CONFLICT-015 | P1 | TR kesme puanı | ✅ **FIXED** |

**P0 açık çelişki yok.** Kalan: 6 açık (4 P1 + 2 P2) · 4 REJECTED · 6 FIXED.

### Testler

`typecheck` 0 · `npm test` **301/301 PASS** (21 suite, 113 383 ms) ·
`build` 0 · **REGRESSION YOK**.

### Git kurtarma notu

Bu oturumun başında sandbox sıfırlaması nedeniyle yerel git geçmişi kaybolmuştu;
`git fetch` + `FETCH_HEAD` karşılaştırması içeriğin remote'ta **birebir aynı**
olduğunu gösterdi (`git diff FETCH_HEAD HEAD` boş) → `git reset --hard FETCH_HEAD`
ile geçmiş geri alındı. **Force-push gerekmedi.**

---

## PHASE 4 — batch 2: Bölüm 4 geçerlik konfigürasyonları 1-5

Tarih: 2026-09-21 · Kaynak: kitap **s.43-47** (PDF p29 R – p31 R)

### İşlenen sayfalar

| Kitap s. | PDF | İçerik | Sonuç |
|---|---|---|---|
| 43 | p29 R | Bölüm 4 girişi + **Konfigürasyon 1 — Tersine V** | ✅ birebir MATCH |
| 44 | p30 L | **Konfigürasyon 2** (L,K ≥60; F ≈50) | L,K ✅ · F ⚠️ → CONFLICT-016 |
| 45 | p30 R | **Konfigürasyon 3 — "V" / Çok Kapalı** | ✅ birebir MATCH |
| 46 | p31 L | **Konfigürasyon 4 — Yükselen Eğilim** | sıra+L+K ✅ · F ⚠️ → CONFLICT-016 |
| 47 | p31 R | **Konfigürasyon 5 — Azalan Eğilim** | sıra+L ✅ · F/K ⚠️ → CONFLICT-016 |

### Yeni SOURCE_FACT'ler

`SOURCE-CONFIG-001` … `SOURCE-CONFIG-005` (+ Bölüm 4 giriş kuralı:
"? alt testi standart profil kağıdına işaret edilmez")

### Sayısal görsel doğrulama (zorunlu adım)

Konfigürasyon 4'ün **K değeri** ilk OCR'da dikişte kesildi ("Kalttesti6").
Bindirmeli yüksek DPI kırpma ile netleştirildi: **K alt testi 60 T puanındadır**
(L=40, F=45-55). Sayı OCR'dan kabul edilmedi.

### Yeni çelişki

**CONFLICT-016 (P1, OPEN)** — Kaynak Konf. 2/4/5'te F ve K için **aralık**
verir (F 45-55; K 40-45; F ≈50), kod ise aralıkları **tek yönlü** uygular
(Konf. 4'te F için hiç sınır yok; Konf. 5'te K'nın alt sınırı yok).
→ Yorum katmanı etkisi; puanlama etkilenmez.
**Karar bilinçli olarak ertelendi:** tüm konfigürasyon seti (s.48-55) okunmadan
kural sıkılaştırılmamalıdır — CONFLICT-014'ün dersi.

### Gözlem (ileride karar için)

Kaynak çoğu konfigürasyonda **nokta değer** verir (40, 60, 50); kod bu noktaları
**±5 tolerans bandına** çevirir ve kaynak değeri daima bandın içinde kalır
(DECISION-018 ile tutarlı, kabul edilebilir). Sorun yalnızca kaynağın **açık
aralık** verdiği hâllerde ortaya çıkar.

### Durum

Bu batch'te **kod değişikliği yok** · yeni test yok.
Önceki doğrulama zinciri geçerli: 301/301 PASS · typecheck 0 · build 0.

---

## PHASE 4 — batch 3: Bölüm 4 konfigürasyonları 6-13 — **BÖLÜM TAMAMLANDI**

Tarih: 2026-09-21 · Kaynak: kitap **s.48-55** (PDF p32 L – p35 R)

| s. | PDF | İçerik | Sonuç |
|---|---|---|---|
| 48 | p32 L | Konf. 6 — Rastgele cevaplama (L,K=55; F>105) | ✅ MATCH |
| 49 | p32 R | Konf. 7 — Tümüne "doğru" (L,K≤35; F>120) | L,K düzeltildi · F **ulaşılamaz** → CONFLICT-019 |
| 50 | p33 L | Konf. 8 — Tümüne "yanlış" (L,F,K>80) | kaynak içi tutarsızlık → **REJECTED** |
| 51 | p33 R | Konf. 9 — Yardım isteği (L,K<66; F≈100↓) | ✅ düzeltildi |
| 52 | p34 L | Konf. 10 — Geleneksel olmayan (L<66; F>69; K>65) | ✅ **birebir MATCH** |
| 53 | p34 R | Konf. 11 — Açık ve tavizsiz (L<55; F≈64; K<45) | ✅ MATCH |
| 54 | p35 L | Konf. 12 — Güvenilir cevaplayıcı (L≈50; F<70; K>50) | ✅ MATCH |
| 55 | p35 R | Konf. 13 — Akut/süreğen (L>50; F≈K>55) | ✅ **birebir MATCH** |

**Bölüm 4 (15/15 konfigürasyon) tamamlandı.**

### Kod değişikliği

**CHANGE-008 (P1)** — `ascending` +F 45-55 · `descending` +K ≥ 40 ·
`all-true` 40→**35** · `help-seeking` 105→**100**. +6 regresyon testi.

### Çelişkiler

| ID | Konu | Sonuç |
|---|---|---|
| CONFLICT-017 | Konf. 4/5/7/9 eşikleri kaynaktan sapmış | ✅ **FIXED** (CHANGE-008) |
| CONFLICT-018 | Konf. 8 eşiği (80) kaynak içi tutarsız | ✅ **REJECTED** (DECISION-020) |
| CONFLICT-019 | Konf. 7 hiç tetiklenemiyor (F>120 vs [20,120] kırpma) | ⚠️ OPEN |
| CONFLICT-020 | Konf. 2/9/12'de kaynakta olmayan sınırlar | ⚠️ OPEN |

### Ampirik kanıtlar (bu turda koşuldu)

- **Tümüne "Yanlış"** → L 81.2 · **F 75.3** · K 82.3 → kaynağın "F>80" koşulu
  gerçek bir "tümüne yanlış" yanıtlayıcıda **sağlanamaz** → kaynak içi tutarsızlık.
- **Tümüne "Doğru"** → F 120.0 (kırpma sınırı) → kaynağın "F>120" koşulu
  **matematiksel olarak imkânsız** → konfigürasyon hiç raporlanmıyor.

### Testler

`typecheck` 0 · `npm test` **307/307 PASS** (22 suite) · `build` PASS ·
**REGRESSION YOK**.

### Güncel çelişki tablosu

Açık **8** (5 P1: 003/004/005/016-kısmi/019 · 3 P2: 006/007/020) ·
FIXED **7** (008-012, 015, 017) · REJECTED **5** (001, 002, 013, 014, 018).
**P0 açık çelişki yok.**

---

## PHASE 4 KAPANIŞI — kitap s.62-63

Tarih: 2026-09-21 · Kaynak: kitap **s.62** (p39 L) + **s.63** (p39 R)

### s.62 — Dikkatsizlik endeksi kesin sayıları (GÖRSEL DOĞRULANDI)

| Kaynak | Kod | Sonuç |
|---|---|---|
| "**12 çift** görgül yolla seçilmiş madde" | `CARELESS_PAIRS` = 12 çift | ✅ MATCH |
| "en yüksek puan **12**'dir" | 12 çift × 1 puan = 12 | ✅ MATCH |
| "**Greene (1980)** … **4'ün kesim puanı**" | `normal = score < 4` (≥4 uyarı) | ✅ MATCH |

→ **`UNVERIFIED-TR-001` KAPANDI** (DECISION-022). Kayıt: SOURCE-CL-002.

### s.63 — BÖLÜM 5 başlangıcı

"Minnesota Çok Yönlü Kişilik Envanteri **Klinik Testlerin Değerlendirilmesi**";
kod yorumlarının temel kaynak listesi (Archer, Butcher, Ceyhun, Dahlstrom,
Erol, Friedman & Graham, Greene, Lachar, Levitt, Savaşır, Webb); kapsam
sözleşmesi: "ikili kodların **hepsi**, üçlü ve dörtlü kodların **çoğunluğu**";
"kodların yorumlanması alt testlerin **sayısal sıralamasına** göre".
Kayıt: SOURCE-CL-003.

### Durum

**PHASE 4 (K düzeltmesi + geçerlik konfigürasyonları) ✅ DONE** — s.43-62
tamamen işlendi. Açık çelişki **8** (5 P1 · 3 P2), **açık P0 yok**.
Testler: **307/307 PASS** (22 suite) · typecheck 0 · build PASS · REGRESSION YOK.

---

## CONFLICT-016/019/020 kararları — konfigürasyon erişilebilirlik turu

Tarih: 2026-09-21

**Yöntem:** `detectValidityConfig` ilk-eşleşen-kazanır olduğu için önce 15
konfigürasyonun sırası/koşulları döküldü, sınır davranışı sınandı; kararlar
erişilebilirlik kanıtına dayandırıldı (DECISION-023).

| Çelişki | Karar |
|---|---|
| CONFLICT-019 (Konf. 7 ölü kural) | ✅ **FIXED** — `F > 120` → **`F >= 120`** (CHANGE-009) |
| CONFLICT-020 (Konf. 12 `K ≤ 65`) | ✅ **FIXED** — sınır **kaldırıldı** (CHANGE-010) |
| CONFLICT-020 (Konf. 9 `F ≥ 70`) | ⚠️ **korundu** — kaldırılırsa `frank`+`credible` erişilemez |
| CONFLICT-016 (Konf. 2 `F ≤ 55`) | ✅ **REJECTED** — `closed-v` sırası zaten F∈[50,55] verir |

**Kanıt (kod içi koşum):** tümüne-"Doğru" profili (L 26.5 / F 120.0 / K 22.1)
ve L=50, F=65, K=70 profili önceden **hiçbir konfigürasyona girmiyordu**;
her ikisi de artık doğru örüntüye eşleşiyor.

**Doğrulama:** typecheck 0 · `mmpiKeyIntegrity` 22/22 (+2 test) · tam suite
**309/309 PASS** (22 suite) · build PASS · `optik-form.html` senkron ·
**REGRESSION YOK**.

**Güncel çelişki tablosu:** açık **5** (3 P1: 003/004/005 · 2 P2: 006/007) ·
FIXED **9** · REJECTED **6**. **Açık P0 yok.**

---

## PHASE 8 — Wiggins normları doğrulandı (kitap s.178-181)

Tarih: 2026-09-21 · PDF p97 L – p98 R

### Bulgular

| Konu | Sonuç |
|---|---|
| **Tablo 20** (s.179) normları ↔ `WIGGINS_NORMS` | ✅ **26/26 BİREBİR MATCH** (Normal Grup n=1000) |
| Madde sayıları (13 skala) | ✅ 12/13 match · SOC metin "26" ↔ kitabın listesi 27 → **kaynak içi tutarsızlık** (DECISION-024) |
| SOC yorum yönü | ⚠️ **CONFLICT-022** (P2, OPEN) — kaynak "yüksek = kendinden emin" der; kod "yüksek = ketlenmiş". PHASE 10'da karar |
| Madde listeleri | ✅ Ek 9c karşılaştırması zaten **46/46 MATCH** |
| Türkçe uyarlama (s.181) | Akça & Ceyhun 1994 · n=2000 (400 K + 600 E hasta; 578 K + 422 E normal) |

### Yöntem (kalıcı ders)

Tablo ~**2.87° dönük** taranmış → sütunlar arası ~29 px dikey kayma → OCR
satırları 4. sütunda **bir alt satıra** yazıyordu (sessiz ±1 satır hatası).
**Çözüm:** deskew + sütun y-merkezi doğrulaması → `OCR_ISSUES.md`
**ROTATED-TABLE**.

### Kapanan kısıt

`AUDIT_STATE`: "WIGGINS_NORMS (13 ölçek) için hiç kaynak kanıtı yok" →
**KAPANDI** (DECISION-025). PHASE 8 tamamlandı.

### Güncel durum

Açık çelişki **6** (3 P1: 003/004/005 · 3 P2: 006/007/022) · FIXED **9** ·
REJECTED **7**. **Açık P0 yok.** Sonraki: **Bölüm 5 — kod tipleri (s.64+)**.

---

## PHASE 2/5 — Ek 1: MMPI madde metinleri (kitap s.215-233)

Tarih: 2026-09-21 · Kaynak: **Ek 1, s.215-233** (PDF p115 R – p124 R)

### Yöntem

- 19 sayfa **iki aşamalı OCR** (200 dpi → 300 dpi) ile alındı.
- **Kritik bulgu:** OCR, madde numarası ile metni farklı bloklarda ve
  sayfadan sayfaya **değişen sırada** döndürüyor → satır başı eşlemesi 1-2
  madde kayıyor. Bu yüzden madde metinleri **görselden** okundu.
- Yeni araç: **`scripts/mmpi-audit/verify-items.py`** — OCR yalnız numara
  **konumu** için; metin ≥300 dpi görselden; 13'lük parçalar hâlinde çıktı.
- Yeni OCR kuralları: `OCR_ISSUES.md` → **ITEM-ORDER**, **PAGE-NUMBER-AS-ITEM**.

### Bulgular

| Bulgu | Sonuç |
|---|---|
| Madde numaralandırması | **1 → 566 kesintisiz** (boşluk/kopya yok) |
| Kaynakta kritik madde listesi | **YOK** → `SOURCE-ITEM-002` (liste kaynak dışı) |
| 39 kritik madde kaydı (38 madde) | metinler görsel doğrulandı |
| Etiketi tutarlı | **24 kayıt** ✓ |
| Etiketi uyuşmayan | **14 kayıt** ❌ → **CONFLICT-023 (P2, OPEN)** |
| OCR'da kayıp madde | 25 numara → `UNVERIFIED_DATA.md` (2'si görsel okundu: 66, 139) |

**Örnek uyuşmazlıklar (görsel kanıtlı):**
- `#33` kod: "Sosyal Çekilme" ↔ kaynak: *"Başımdan çok garip ve tuhaf şeyler geçti"*
- `#151` kod: "Sosyal Çekilme / Yabancılaşma" ↔ kaynak: *"Biri beni zehirlemeye çalışıyor"*
- `#337` kod: "Depresif Çökkünlük" ↔ kaynak: *"Çoğunlukla bir takım şeyler ve kimseler için meraklanıp huzursuzlaşırım"*
- `#334` kod: "Depresif Çökkünlük" ↔ kaynak: *"Bazen tuhaf kokular duyarım"*
- `#20` kod: "Alkol/Madde Sorunları" ↔ kaynak: *"Cinsel yaşamımdan memnunum"*

**Lehte delil:** `#74` cinsiyet koşullu yön ayrımı kaynakla **tutarlı**;
24 kayıt doğru etiketli → liste tümüyle hatalı değil.

### Durum

- **Kod değişikliği YOK.** CONFLICT-023 kararı bekliyor (a) etiketleri kaynak
  metnine göre düzelt, (b) listeyi kaldır, (c) kaynak dışı işaretleyerek koru.
- Testler etkilenmedi (yalnız doküman + yeni araç eklendi).

---

## CONFLICT-023 kapanışı — kritik madde etiketleri (CHANGE-011)

Tarih: 2026-09-21 · Karar: DECISION-026 · Öncelik: P2

- **14 etiket** kaynak madde metnine göre düzeltildi (kanıt: 300-350 dpi görsel,
  s.216-226) — ör. `#151` "Sosyal Çekilme / Yabancılaşma" → **"Zehirlenme
  Sanrısı / Şüphecilik"**.
- Liste **kaynak dışı** olduğu için kod başlığında belgelendi (kaynakta kritik
  madde listesi yok — `SOURCE-ITEM-002`).
- Madde numaraları ve D/Y yönleri **değişmedi**; `#74` cinsiyet ayrımı korundu.
- Doğrulama: `typecheck` 0 · `mmpiKeyIntegrity` **26/26** · `npm test`
  **313/313 PASS** (23 suite) · `build` PASS · **REGRESSION YOK**.

---

## PHASE 9/10 — batch 1: Hs yorumu + ilk kod tipleri (kitap s.66-69)

Tarih: 2026-09-21 · Kaynak: kitap **s.66-69** (PDF p41 L – p42 R)

| s. | PDF | İçerik | Sonuç |
|---|---|---|---|
| 66 | p41 L | Tablo 8 (Hs maddeleri) + Hs düşük puan 5 maddesi + madde 22/23 | ✅ Tablo 8 teyit · 5 madde **eksik** (026) |
| 67 | p41 R | Hs T-puan bantları (85+/75-84/60-74/50-59/21-49) + Hs ilgili ölçekler | ✅ **5/5 bant sınırı birebir MATCH** |
| 68 | p42 L | 12/21 kodu (gövde + ergen paragrafları) + 123/213 başlangıcı | ✅ gövde MATCH · ergen **eksik** (025) · 123/213 **kodda yok** |
| 69 | p42 R | 12/21 koşullu ek yorumlar + 1234 + 1236 başlangıcı | ❌ **üçlü kodlar kodda yok** (024) |

### Kritik bulgu — CONFLICT-024 (P1)

Kaynak, Hs kod tipi bölümünde **üçlü ve dörtlü kodlar** tanımlıyor
(`123/213`, `1234`, `1236`, `1237`, `2134`, `213/231`) ve bunlar iki noktalı
kodlardan **farklı** yorumlar taşıyor. Kodda:
- `CODES` sözlüğünde **45 iki noktalı kod** var, **hiç üçlü kod yok**
- Kod üretimi `mmpiScoring.ts:258` → `slice(0, 2)` = yalnızca **en yüksek 2 ölçek**
- 12/21 için kaynağın **"5 T puanı fark"** kuralı yalnızca metin olarak var,
  **tespit edilmiyor**

Bu, kaynağın yorum katmanının önemli bir bölümünün hiç üretilmediği anlamına
gelir. Karar, kaynağın **tam üçlü kod seti** çıkarıldıktan sonra verilecek
(s.70-158).

### Diğer bulgular

- **CONFLICT-025 (P2):** 12/21 yorumunda "lise öğrencileri" ve "üniversite öncesi
  ergenler" paragrafları + koşullu Pd/Ma/Mf/L yorumları eksik.
- **CONFLICT-026 (P3):** Hs düşük puanın 5 özelliği, 40 yaş notu, "doktor doktor
  gezerler" cümlesi ve 21-49 bandının `2,6,7,8,0 > 70` örüntü koşulu eksik.

### Doğrulama

Görsel okuma (**≥300 dpi tam sayfa**, `v_p041_full.png`, `v_p042_full.png`) —
Tablo 8, Hs bant sayıları, 12/21 ve üçlü kod başlıkları **gözle teyit edildi**;
sayısal iddialar OCR'a bırakılmadı (OCR_ISSUES.md FIGURE-CURVE kuralı).

### Çelişki tablosu

Açık **9** (4 P1: 003/004/005/024 · 4 P2: 006/007/022/025 · 1 P3: 026) ·
FIXED 10 · REJECTED 7. **P0 açık çelişki yok.**

---

## PHASE 9/10 — batch 2: Hs kod bloğu TAMAMI (kitap s.70-78) + D girişi (s.79)

Tarih: 2026-09-21 · Kaynak: kitap **s.70-79** (PDF p43 L – p47 R)

### Hs (1) alt testi kod bloğu — KAPANDI (s.67-78)

**31 kod tipi bölümü** görsel olarak okundu. Kaynak bulguları
`SOURCE-CODE-005..010`, kapsam analizi `CONFLICT-024_KAPSAM.md`.

| Grup | Kodlar |
|---|---|
| **Kodda VAR (9)** | `12`, `13`, `14`, `15`, `16`, `17`, `18`, `19`, `01` — **gövdeler sadık MATCH** ✅ |
| **Kodda YOK (22)** | `123`, `1234`, `1236`, `1237`, `1270`, `12378`, `128`, `129`, `120`, `132`, `134`, `1342`, `136`, `137`, `138`, `1382`, `139`, `146`, `1469` + 3 alt-kod (`13/31 Yüksek K`, `13/31 Düşük 2`, `Yüksek 1/Düşük 4`) |
| **Yalnız atıf (kodda yok)** | `2134`, `213/231`, `182/812`, `183/813`, `187/817`, `143/413`, `142/412`, `172/712`, `173/713` |

### İki kök neden

1. **CONFLICT-024 (P1) — kod modeli 2 ölçekli.** `mmpiScoring.ts:258`
   `slice(0, 2)` yalnızca en yüksek 2 ölçeği alıyor; `CODES` sözlüğünde
   0 üçlü kod var. Kaynağın yorum katmanının büyük bölümü üretilmiyor.
2. **CONFLICT-025 (P2) — koşullu cümleler düşmüş.** Mevcut 9 kodun gövdesi
   sadık, ancak kaynak yorumu **üçüncü ölçeğe ve profilin geri kalanına** göre
   ayrıştırıyor ("8 ve 6 birlikte yükselmişse", "L ve K da yükselirse",
   "erkeklerde 2 ve 4'ün, kadınlarda 3 ve 8'in olduğu üçlü yükselme",
   "143/413 ve 142/412", "172/712 ve 173/713", "182/812, 183/813, 187/817").
   7 kodda belgelendi.

### Kritik sayısal koşullar (kaynaktan, görsel doğrulanmış)

- **13/31 Yüksek K:** 2, 7, 8 testleri **70'in altında** ∧ F **50'nin altında**
- **13/31:** "L ve K alt testleri de yükselirse" → ayrı yorum
- **136/316:** "Pa, Hy'den **10 T puanından** daha yüksekse şüphecilik ve
  kızgınlık"; "**Hy, Pa'dan 10 ya da daha fazla T puanı** yüksekse paranoid
  özellikler daha az belirgin olmak üzere fiziksel yakınmalar ön plana çıkar"
- **1382:** 138'e ek depresyon/konfüzyon/alkol/intihar
- **19/91:** "2 ve 3 alt testlerinin değerleri **5 T puanından aşağıda ise**
  129 ve 139 koduna bakınız"
- **12/21:** "1 ve 2 arasında **5 T puanı** fark varsa 21'e bakılır"
- **10/01:** "**T değeri 70'in üstünde ise** destek sistemleri zayıflamıştır"

### D (2) alt testi başlangıcı (s.79)

`SOURCE-CL-009`: D alt testi girişi + **"D alt testinde yüksek puan alan bir
birey (Graham 1987)" 21 maddelik listesi** kayda geçti. Kod karşılaştırması
sonraki batch'te (s.80-94, Tablo 9).

### Kod değişikliği

**YOK** — CONFLICT-024/025 tasarım kararı gerektiriyor; kaynağın **tüm** kod
seti (10 klinik ölçek × kod bloğu) çıkarılmadan karar verilmeyecek.

### Çelişki tablosu

Açık **9** (4 P1: 003/004/005/024 · 4 P2: 006/007/022/025 · 1 P3: 026) ·
FIXED 10 · REJECTED 7. **P0 açık çelişki yok.**

---

## PHASE 5/9 — batch 3: D (2) alt testi anahtarı + normu (kitap s.79-83)

Tarih: 2026-09-21 · Kaynak: kitap **s.79-83** (PDF p47 R – p49 R)

### P0 katmanı doğrulandı — Tablo 9 BİREBİR MATCH ✅

| Katman | Sonuç |
|---|---|
| Madde sayısı 60 | ✅ |
| Doğru 20 madde | ✅ **BİREBİR MATCH** |
| Yanlış 40 madde | ✅ **BİREBİR MATCH** |
| Norm Erkek 20.63 | ✅ MATCH |
| Norm Kadın 23.86 | ✅ MATCH |

**OCR hatası yakalandı:** Ham OCR Yanlış listesinin ilk maddesini "6" okudu;
420 dpi görsel doğrulama **"9"** olduğunu gösterdi. Yeni kural kaydı:
`OCR_ISSUES.md` → **DIGIT-6-9** (6/9, 0/8, 1/7, 5/6 görsel teyit zorunlu).

### D T-puan bantları — MATCH

Kaynak: 85+ / 79+ / 70-79 / 60-69 / 45-59 / 28-44 ·
Kod: 85+ / 79-84 / 70-78 / 60-69 / 45-59 / 28-44(min 0)
→ Bant **etiketleri birebir**; kaynağın **79 çakışması** (79 hem "79 ve üstü" hem
"70-79" içinde) kodda **ilk-eşleşen-kazanır** sırasıyla tek anlamlı hâle gelmiş.

### Kaynak bulguları

- `SOURCE-CL-010`: Tablo 9 (anahtar + norm)
- `SOURCE-CL-011`: D düşük puan 18 maddelik liste → kodda **yok**
- `SOURCE-CL-012`: "Alt test 2 ile ilişkin **açık davranışsal belirtiler yoksa,
  intihar riskine karşı dikkatli olmak gerekir**" → yorum katmanı kuralı
- `SOURCE-CL-013`: D T-bantları

### CONFLICT-024 kapsamı genişledi (D bloğu)

Kaynakta: `213/231`, **`231/321`, `234/324`, `237/327`** ("**en sık üçlü
kodlar**"), `237`, `239` … → kodda **hiçbiri yok**. Kaynak üçlü kodlar için
**frekans sıralaması** bile veriyor.

### Kod değişikliği

**YOK** — anahtar/norm/bant katmanı zaten MATCH; eksik olan **yorum katmanı**
(CONFLICT-024/025) tasarım kararı bekliyor.

---

## PHASE 9/10 — batch 4: D kod bloğu (kitap s.84-87)

Tarih: 2026-09-21 · Kaynak: kitap **s.84-87** (PDF p50 L – p51 R)

### 🔴 Yeni P1 çelişki — CONFLICT-027

Kaynak, kod yorumlarını **T-puan eşiklerine** bağlıyor; kodun veri modeli
(`CodeInterpretation = { code, text, diagnosis?, seeAlso? }`) **koşul taşımıyor**:

| Kod | Kaynak koşulu |
|---|---|
| `26/62` | "**Pa alt testi belirgin bir biçimde yükseldiğinde ve/veya 4 ve 8 alt testi 70 T puanının üzerinde ise**, bireyin psikozun erken dönemlerinde olma olasılığı artar." |
| `27/72` | "**Çok fazla yükselmeler (örneğin, 85 T puanının üstünde)** … **daha etkili müdahale formları (ilaç gibi) gerekli olabilir.**" |

→ Ayrıca `13/31` (2,7,8 < 70 ∧ F < 50), `138` (4 yüksek ∧ K düşük),
`19/91` (2,3 < 5 T farkı), `136/316` (Pa−Hy ≥ 10), `12/21` (1-2 farkı ≥ 5)
koşulları da kodda tespit edilmiyor. **7 örnek belgelendi.**

### Kaynak bulguları (SOURCE-CODE-011/012)

D kod bloğu: `23`, `24/42`, `243/432`, `247/427/472` + `742` + `274`,
`248` (+`Yüksek F` alt-kodu), `25/52`, `26/62`, `27/72` (+`275/725`,
`278/728`, `273/723`, `271/721`, `270/720`).
Kaynak ayrıca **"en sık üçlü kodlar"** listeleri veriyor (s.83, s.87).

### CONFLICT-024 kapsamı

Hs bloğu: 9 kod VAR / 22 YOK · **D bloğu: 4 kod VAR / 12+ YOK**
→ Bu artık **sistemik** bir eksik: kod modeli yalnızca **2 ölçekli**.

### Yeni araç

`scripts/mmpi-audit/inventory.py` — OCR metinlerinden **yalnızca kod başlıklarını
ve sayısal kuralları** çıkarır (bağlam ekonomisi: tam OCR metni okunmaz).

### Kod değişikliği

**YOK** — kanıt toplama aşaması sürüyor (kaynağın kalan klinik ölçek blokları).

---

## PHASE 9/10 — batch 7: D kod bloğu KAPANIŞI (kitap s.88-92)

Tarih: 2026-09-21 · Kaynak: **s.88-89 (p52)** + **s.92 (p54 L)**

| s. | PDF | İçerik | Sonuç |
|---|---|---|---|
| 88 | p52 L | `273/723`, `274/724`, `275/725` + **T-eşiği:** "test 4 ve 7 birbirlerinin **5 T puanı** alanı içindeyse" | 3 kod **kodda YOK** |
| 89 | p52 R | **`278/728`** + **T-eşiği:** "**K ve Hs, 50 T puanının altında** olduğunda ve/veya Ma yükseldiğinde intihar olasılığı dikkatle değerlendirilmelidir" | kod **YOK** (görsel doğrulandı) |
| 92 | p54 L | `29/92` kapanışı (3 tip birey) · **`20/02`** · **`207`** | `29/92` ✓ MATCH · `20/02` ✓ MATCH · `207` **YOK** |

**D (2) alt testi kod bloğu KAPANDI** (s.82-92).

### ⚠️ Kritik bulgu — CONFLICT-030 (P1, OPEN)

`src/scoring/mmpiSourceCodes.ts:305`:
```ts
return CODES[canonicalCode(code.slice(0, 2))];
```
**3+ ölçekli her kod ilk 2 haneye kırpılıyor.** Amprik olarak koşuldu: `273/723`,
`274/724`, `275/725`, `278/728`, `270` → hepsi **`27/72`** kaydını döndürüyor;
`207` → `20/02`; `213/231` → `12/21`; `231/321` → `23`; `248` → `24/42`;
`742` → `47/74`.

**Kapalı döngü kanıtı:** `27/72` kaydının `seeAlso` alanı *"273/723, 274/724,
275/725, 278/728, 270 kodlarına da bakınız"* diyor → kullanıcı `274/724` için
`27/72` metnini görür ve metin onu **tekrar `274/724`'e** yollar. **Bu kod
tiplerinin içeriği kullanıcıya asla ulaşmaz.**

**Yanlış metin eşlemesi:** `27/72` kaydının **6 cümlesinin tamamı** kaynağın
s.88'deki **`273/723`** metniyle birebir aynıdır; kaynağın `27/72` **ana kod**
metni (s.87) kodda **hiç yoktur** → `UNVERIFIED-CODE-001`.

### CONFLICT-027 genişletmesi

Altı yeni koşul belgelendi (`278/728` K·Hs<50 T; `274/724` 5 T fark;
`275/725` 4 düşük; `273/723` Hs yükselmiş; `274/724` 3 yükselmiş; `284/824`
4·2·8 5 T alanı) → kapsam **13 örneğe** çıktı. `CodeInterpretation` tipinde
**koşul alanı yok**.

### Yeni OCR kuralı

`OCR_ISSUES.md` → **SENTENCE-SKIP**: OCR, s.92'de bir cümleyi
("Çoğu (özellikle test 1 düşük ise) fiziksel olarak çekici olmadığını da düşünür.")
**tamamen atladı**; kod bu cümleyi içerdiği için OCR'a güvenilseydi **sahte
"kaynakta yok" bulgusu** üretilecekti.

### Kapsam tablosu (CONFLICT-024)

| Blok | Kodda VAR | Kodda YOK |
|---|---|---|
| Hs (s.63-78) | 9 | 22 (+3 alt-kod) |
| D (s.79-92) | 9 | 18 |
| **Toplam** | **18** | **40** |

### Doğrulama

Kod değişikliği **YOK** (karar tüm kod seti çıkarıldıktan sonra verilecek).
`npm run typecheck` · `npm test` · `npm run build` → aşağıda.

### Çelişki tablosu

Açık **11** → 0 P0 · **6 P1** (003, 004, 005, 024, 027, **030**) · 4 P2 (006,
007, 022, 025) · 1 P3 (026). FIXED 10 · REJECTED 7.

---

## PHASE 9/10 — batch 8: Hy (3) T bantları + Hy kod bloğu I (kitap s.95-99)

Tarih: 2026-09-21 · Kaynak: **s.95 (p55 R)** + **s.96-99 (p56 L – p57 R)**

### P0 katmanı — Hy T bantları **6/6 MATCH** ✅

| Bant | Kod | Sonuç |
|---|---|---|
| 85 T ve üstü | `85–∞` | ✅ |
| 76-85 T | `76–84` | ✅ metin birebir |
| 70-75 T | `70–75` | ✅ |
| 60-69 T | `60–69` (iki örüntü) | ✅ |
| 45-59 T | `45–59` ("özgü tanımlama yok") | ✅ |
| 24-44 T | `0–44` | ✅ metin · etiket kodda `T 22-44` |

**"Sadece Hy alt testinin yükselmesi"** kuralı — kaynak: "Sadece **3'ün yüksek**
olduğu ve **diğer hiçbir alt testin 70 T puanının üstünde olmadığı** durumda" ↔
kod `SINGLE_HY.rule` → **birebir MATCH** ✅ (metin de MATCH).

Doğrulama: **300 dpi görsel, 4 ayrı kadraj** (`v_s95_a..d.png`).

### Yorum katmanı — Hy kod bloğu I

Okunan kod tipleri: **Yüksek3/YüksekK**, `31`, **`32`**, `321`, `34/43`,
**Yüksek3/Düşük4**, `34`, **`345/435/534`**, `346/436`, `35/53`, `36/63`,
`54/45` notu → `SOURCE-CODE-017`.

### ⚠️ Yeni çelişki — CONFLICT-031 (P1, OPEN): kod yorumları **blok-bazlı**

Kaynak, iki-ölçekli kod yorumlarını **o ölçeğin blok başlığı altında** verir ve
**aynı rakam çifti farklı bloklarda farklı metin** taşır:

| Blok | Kaynak başlığı | Kodda dönen |
|---|---|---|
| D (s.82) | `23 Kodu` | `23` ✅ |
| **Hy (s.96)** | **`32 Kodu`** — "**23 kod tiplerinin aksine**… **menapoz güçlükleri**…" | **`23`** ❌ D bloğunun metni |

→ `codeInterpretation('32')` **yanlış ölçeğin metnini** döndürür. Kaynağın kendisi
`31 Kodu` için "(Bakınız 13/31 Kodu)" diyerek **bloklar arası atıf** yaptığından,
bu katman kaynağın yapısal bir özelliğidir; kodun tek `Record` modeli temsil edemez.

Ayrıca **CONFLICT-032 (P3, kayıt):** s.99 başlığı görselle **`345/435/534`**
(3 varyant) doğrulandı; kod `34/43`e düştüğü için `534` varyantı **erişilemez**.

### CONFLICT-027 genişletmesi (19 koşul)

Yeni: Hy 60-69 T (D 10 T düşük · Hy, Hs'ten 10 T yüksek) · `345/435/534`
(**3>4 ∧ K>50 T**) · `32` (2, 3'ün 5 T sınırında) · `346/436` (6, 3'ün 5 T
sınırında) · `34/43` (göreceli yükseklik) · "üçüncü en yüksek test" koşulları.

### Kapsam (CONFLICT-024)

| Blok | Kodda VAR | Kodda YOK |
|---|---|---|
| Hs (s.63-78) | 9 | 22 (+3 alt-kod) |
| D (s.79-92) | 9 | 18 |
| Hy (s.95-100) | 4 | 8 |
| **Toplam** | **22** | **48** |

### Doğrulama

Kod değişikliği **YOK**. `typecheck` · `npm test` · `build` → `TEST_AUDIT.md`.

### Çelişki tablosu

Açık **13** → 0 P0 · **7 P1** (003, 004, 005, 024, 027, 030, **031**) · 4 P2
(006, 007, 022, 025) · 2 P3 (026, **032**). FIXED 10 · REJECTED 7.

---

## PHASE 9/10 — batch 9: Hy bloğu KAPANDI + **NEVROTİK ÜÇLÜ PROFİLLERİ** (kitap s.100-107)

Tarih: 2026-09-21 · Kaynak: **s.100-101 (p58)** + **s.102-106 (p59-p61 L)** + **s.107 (p61 R)**

### Hy kod bloğu kapandı (s.100-101) — **5/5 kod kodda VAR ve MATCH**

| Kod | İçerik | Sonuç |
|---|---|---|
| `36/63` devamı | baş ağrıları/Gİ yakınmaları, aile üyelerine kızgınlık | ✅ MATCH |
| `37/73` | gerginlik/anksiyete/düşük akademik başarı + otistik geri çekilme + psikotik epizodlar | ✅ MATCH |
| `38/83` | ruhsal karmaşa + **Olası Tanı: Şizofreni** | ✅ MATCH |
| `39/93` | girişken/dışadönük + **Si 40 T altı** koşulu | ✅ MATCH |
| `30/03` | nadir + pasif/bağımlı | ✅ MATCH |

### 🆕 YENİ BÖLÜM — **NEVROTİK ÜÇLÜ PROFİLLERİ** (s.103-106)

Kaynak: "**Nevrotik üçlü içindeki üç alt testin ilişkileri çerçevesinde en sık
karşılaşılan DÖRT KONFİGÜRASYON vardır.**"

| # | Konfigürasyon | Koşul (**300-340 dpi görsel doğrulandı**) | Şekil |
|---|---|---|---|
| 1 | **Konversiyon vadisi** | Hs ↑ ∧ Hy ↑ ∧ **D ↓** | 17 |
| 2 | **Basamak orantısı** | **üçü de > 70 T** ∧ Hs > D > Hy | 18 |
| 3 | **Şapka** | **Hs < 70 T** ∧ **D > 70 T** ∧ **Hy > 70 T** (D en yüksek) | 19 |
| 4 | **Yükselen eğilim** | **üçü de > 70 T** ∧ Hs < D < Hy | 20 |

→ **CONFLICT-033 (P1, OPEN):** kodda üç ölçekli konfigürasyon tespiti **yok**
(yalnızca tek-ölçek bantları + iki noktalı kodlar). 4 konfigürasyon da
kullanıcıya gösterilmiyor.

### Diğer bulgular

- **s.102 boş sayfa** — `p059_L` OCR 1 satır döndürdü; görselle doğrulandı →
  yeni OCR kuralı **BLANK-PAGE-OCR** (boş sayfa iddiası görselle teyit edilir).
- **s.107:** Pd (4) alt testi girişi + Graham 1987 maddeleri (1-19) okundu → Pd
  bloğuna geçiş.
- CONFLICT-027 **23 koşula** genişletildi (s.100-101 örnekleri).
- CONFLICT-024 kapsamı: **26 VAR / 52 YOK** (nevrotik üçlü dahil).

### Doğrulama

Kod değişikliği **YOK**. `typecheck` · `npm test` · `build` → `TEST_AUDIT.md`.

### Çelişki tablosu

Açık **14** → 0 P0 · **8 P1** (003, 004, 005, 024, 027, 030, 031, **033**) ·
4 P2 (006, 007, 022, 025) · 2 P3 (026, 032). FIXED 10 · REJECTED 7.

---

## PHASE 9/10 — batch 10: Pd (4) anahtarı + T bantları (kitap s.107-110)

Tarih: 2026-09-21 · Kaynak: **s.107 (p61 R)** + **s.108-110 (p62 L – p63 L)**

### P0 katmanı — **Tablo 11 Pd anahtarı BİREBİR MATCH** ✅

| | Kaynak (s.108) | Kod (`SCORING_KEYS.Pd`) | Sonuç |
|---|---|---|---|
| Doğru | 24 madde | 24 madde | ✅ fazla/eksik yok |
| Yanlış | 26 madde | 26 madde | ✅ fazla/eksik yok |
| **Toplam** | **50** (kitabın "Madde Sayısı: 50") | 50 | ✅ |

- Araç: `cmp-tablo11.ts`
- Doğrulama: **400 dpi** okuma + **600 dpi dikiş kadrajı** — spine tablonun
  **5. sütunundan** geçiyor (`35/215`, `96/231` civarı); ayrı kadrajla teyit edildi
  (`33, 35, 38, 42` / `127, 215, 216, 224`).
- **Ek 9 ile çapraz doğrulama** ✓ · norm **16.62 / 18.12** ✓

### Pd T bantları **5/5 MATCH** ✅

`80+` · `70-79` · `60-69` · `45-59` · `20-44` — sınırlar **300 dpi görselle**
doğrulandı (`v_pd_band_a/b.png`).

### Ek içerik (s.107-109)

- Graham 1987 **Pd yüksek**: 43 madde (toplum kuralları, impulsivite, yalan/çalma,
  otoriteye isyankârlık, "**psikoterapi prognozu kötüdür**" dahil).
- **Pd düşük**: 12 madde (geleneksel/itaatkâr, pasif, samimi ve güvenilir,
  enerji düzeyi düşük, inatçı ve kuralcı…).
- "**Yüksek 4 profilleri (yetişkin normları kullanıldığında)**" → norm/yaş
  ilişkisi notu (CONFLICT-027).

### Doğrulama

Kod değişikliği **YOK**. `typecheck` · `npm test` · `build` → `TEST_AUDIT.md`.

### Çelişki tablosu

Değişmedi: açık **14** (0 P0 · 8 P1 · 4 P2 · 2 P3). Bu batch **yeni çelişki
üretmedi** — aksine bir P0 katmanını (Pd anahtarı) **doğrulayarak kapattı**.

---

## PHASE 9/10 — batch 11: Pd (4) kod bloğu I (kitap s.111-113)

Tarih: 2026-09-21 · Kaynak: **s.111-113** (PDF p63 R – p64 R)

| s. | PDF | İçerik | Sonuç |
|---|---|---|---|
| 111 | p63 R | Sadece Pd yükselmesi (en az 10 T) + Pd ilişkileri | ✅ metin MATCH · `Pd>=70` **UNVERIFIED** |
| 111-112 | p63 R–p64 L | **Yüksek 4/Düşük 5 Kodu** | ❌ **kodda YOK** |
| 112 | p64 L | **45/54 Kodu** + yaş/eğitim/cinsiyet zorunluluğu | ✅ gövde MATCH · ❌ direktif **YOK** |
| 113 | p64 R | **456 Kodu** | ❌ **kodda YOK** (üstelik `45/54` metnini döndürüyor) |
| 113 | p64 R | **46/64 Kodu** | ✅ gövde + diagnosis MATCH |

### Yeni bulgular

- **CONFLICT-034 (P2, OPEN):** "Bu kod tipi hastanın **yaşı, eğitimi ve
  cinsiyeti dikkate alınarak** yorumlanmalıdır." direktifi kod kayıtlarında yok.
  **Kaynak:** s.112.
- **CONFLICT-024 · genişletme:** Pd bloğunda **4 YOK** (Yüksek 4/Düşük 5, 456,
  468/648, 463/643) → kod seti toplamı **31 VAR / 56 YOK**.
- **CONFLICT-030 · genişletme:** kurpma ampirik kanıtı — `'456'`→`45/54`,
  `'468'`→`46/64`, `'463748'`→`46/64`, `'943'`→`49/94`. Örnek **13 → 17**.
- **CONFLICT-027 · genişletme:** `SINGLE_PD` kodda `Pd >= 70` koşulu ekliyor;
  kaynak cümlesinde yalnızca "en az 10 T yukarıda" var.
- **🆕 OCR kuralı `LOWCONF-GAP`:** OCR `<LOWCONF>` belirteci **tam bir cümleyi
  düşürmüş**; 340 dpi kadraj cümleyi kurtardı. Bu kural olmadan CONFLICT-034
  hiç bulunamazdı.

### Kod değişikliği

**YOK** (salt okuma + doğrulama turu).

### Testler

Değişiklik olmadığı için tam suite koşulmadı; karşılaştırma script'i
`scripts/mmpi-audit/cmp-pd-batch11.ts` eklendi (yeniden koşulabilir kanıt).

---

## PHASE 9/10 — batch 12: Pd (4) kod bloğu II (kitap s.114-117)

Tarih: 2026-09-21 · Kaynak: **s.114-117** (PDF p65 L – p66 R)

| s. | İçerik | Sonuç |
|---|---|---|
| 114-115 | 46/64 kapanışı (40 T koşulu) | ✅ gövde MATCH |
| 115 | **468/648 Kodu** | ❌ **YOK** (paranoid şizofreni + 3 sayısal koşul) |
| 115 | **469 Kodu** | ❌ **YOK** (tek cümle: test 9 > 70 T) |
| 115-116 | `47/74` | ✅ VAR · "en sık 3'lü kodlar 478/748 ve 472/742" **eksik** |
| 116 | **478/748**, **472/742**, **247/427**, **274** | ❌ **YOK** |
| 116-117 | `48/84` | ✅ VAR · `482/842`, `486/846`, `489/849` **YOK** |

### Yeni ampirik kanıt (CONFLICT-030 — kapalı döngü)

| Çağrı | Dönen | Beklenen |
|---|---|---|
| `'468'`,`'469'`,`'462'`,`'463'` | `46/64` | 468/648 · 469 · 462/642 · 463/643 |
| `'472'`,`'478'` | `47/74` | 472/742 · 478/748 |
| `'482'`,`'486'`,`'489'` | `48/84` | 482/842 · 486/846 · 489/849 |
| `'247'` | `24/42` | 247/427 · `'274'` → `27/72` |

→ **11 kod** hiç yok; `seeAlso` alanları **var olmayan kayıtlara** işaret ediyor.
CONFLICT-030: **17 → 28 örnek** · CONFLICT-024 toplamı: **33 VAR / 64 YOK** ·
CONFLICT-027: **23 → 26 koşul**.

### Görsel doğrulamalar

- `v_pd115_469.png` — 468/648 gövdesi (340 dpi)
- `v_pd115_469b.png` — **K<50 ∧ 5/4/6 5 T alanı ∧ 9&2>70 T** koşulu (birebir)
- `v_pd115_469c.png` — 469 kuralı ("test 9 da 70 T puanının üzerinde")

### Kod değişikliği

**YOK** (salt okuma + doğrulama turu).

---

## PHASE 9/10 — batch 13: Pd (4) kod bloğu III + **Pd BLOĞU KAPANIŞI** + Mf geçişi (kitap s.118-121)

Tarih: 2026-09-21 · Kaynak: **s.118-121** (PDF p67 L – p68 R)

| s. | İçerik | Sonuç |
|---|---|---|
| 118 | **482/842/824** Kodları | ❌ **YOK** |
| 118 | **489/849** Kodları | ❌ **YOK** |
| 118-119 | `49/94` Kodu + koşullar | ✅ VAR (gövde + diagnosis MATCH) · koşullar ❌ |
| 119 | **493/943** | ❌ **YOK** |
| 119 | **495/945** | ❌ **YOK** |
| 120 | **496/946** | ❌ **YOK** |
| 120 | **498/948** | ❌ **YOK** |
| 120 | `40/04` | ✅ VAR · **terim sapması** → CONFLICT-035 |
| **121** | **5. Mf Alt Testi girişi** | **yeni blok başladı** (Tablo 12 → sıradaki) |

### 🎯 Pd (4) bloğu TAMAMLANDI (s.107-120)

**20 kod incelendi · 7 VAR / 13 YOK** (kod kaydı olarak 9 VAR).
Pd bloğundan **2 yeni çelişki**: CONFLICT-034 (yaş/eğitim/cinsiyet direktifi),
CONFLICT-035 (terim sapması).

### Kod değişikliği — **CHANGE-012 (P2)**

`CODES['04']` → "**negatifik**" → "**vegetatif**" depresyon (kaynak s.120,
400 dpi görsel; DECISION-027). Gerekçe: **yanlış içerik bekletilmez**.

### Genişletilen çelişkiler

| ID | Önce | Sonra |
|---|---|---|
| CONFLICT-024 (kod seti kapsamı) | 33 VAR / 64 YOK | **36 VAR / 70 YOK** |
| CONFLICT-025 (koşullu cümle) | 7 örnek | **10 örnek** |
| CONFLICT-027 (T-eşiği koşulu) | 26 örnek | **32 örnek** |
| CONFLICT-030 (kırpma) | 28 örnek | **34 örnek** |

### Görsel doğrulamalar (hepsi 340-400 dpi)

`v_pd119_cond.png` (49/94 koşul cümlesi) · `v_pd120_496.png` (496/946 K<50) ·
`v_pd120_0404c/d/e.png` (40/04 üçüncü yüksek test + **vegetatif** terimi)

### Testler

`typecheck` 0 · `npm test` **316/316 PASS** (24 suite) · `build` PASS ·
**REGRESSION YOK**.

---

## PHASE 9/10 — batch 14: Mf (5) bloğu — Tablo 12 + T bantları + kodlar (kitap s.122-125)

Tarih: 2026-09-21 · Kaynak: **s.122-125** (PDF p69 L – p70 R)

### 🎯 P0 katmanı — **Tablo 12 (Mf anahtarı) BİREBİR MATCH**

| | Kaynak | Kod | Sonuç |
|---|---|---|---|
| Doğru (erkek) | 28 madde | 28 | ✅ |
| Yanlış (erkek) | 32 madde | 32 | ✅ |
| **Toplam** | **60** | **60** | kitabın "(Madde Sayısı: 60)" başlığıyla uyumlu |
| (*) kadınlarda ters (69, 179, 231, 297, 133) | 5 | `female` listelerinde **5/5 ters** | ✅ |
| Norm erkek / kadın | 29.21 / 32.98 | 29.21 / 32.98 | ✅ |

**Okuma yöntemi:** Tablo 12 **450 dpi, satır satır kadraj** (`v_mf_r12.png`,
`v_mf_r23.png`) — dönük/sıkışık tablo kuralı uygulandı.

### T bantları — tam MATCH

| Cinsiyet | Bant sayısı | Sonuç |
|---|---|---|
| Erkek | 5 (80+, 70-79, 60-69, 41-59, 26-40) | ✅ **5/5 MATCH** |
| Kadın | 4 (>65, 56-65, 41-55, 26-40) | ✅ **4/4 MATCH** |

### Yeni çelişki girdisi — **CONFLICT-027 genişletildi (P1)**

Kaynak (s.125): "Erkeklerde **5 testinde 75 T puanı ve üstü**…"
Kod (`mmpiInterpretation.ts:231`): `single('Mf')` = **`t >= 70`**
→ **5 puan erken tetikleme.** `SINGLE_MF_MALE` **metni** kaynağın 75'ini doğru
taşıyor, ama **tespit kuralı** 70 kullanıyor → metin ile kod çelişiyor.
CONFLICT-027: **32 → 33 örnek**.

### Mf kod bloğu

6/7 VAR ✅ (`51/15`, `52/25`, `53/35`, `54/45`, `56/65`, `57/75`) ·
**`564/654` YOK** ❌ → CONFLICT-024 (**36 VAR / 71 YOK**) · CONFLICT-030
(**34 → 35 örnek**, `'564'` → `56/65`).

### OCR kuralı — `LOWCONF-GAP` **2. kez doğrulandı**

İki Mf T bandı **etiketi** OCR'da `<LOWCONF>` ile kaybolmuştu:
"**26-40 T puanı:**" (s.124) ve "**80 ve üstü T puanı:**" (s.123).
360 dpi kadrajlarla kurtarıldı → kural, iki bant sınırının doğrulanmasını sağladı.

### Kod değişikliği

**YOK** (salt okuma + doğrulama; eşik farkı CONFLICT-027'de kayıtlı, karar
tüm kod seti çıkarıldıktan sonra verilecek).

---

## PHASE 9/10 — batch 15: Mf kodları II + **Pa (6) anahtarı ve bantları** (kitap s.126-130)

Tarih: 2026-09-21 · Kaynak: **s.126-130** (PDF p71 L – p73 L)

### 🎯 İki P0 katmanı daha TAM MATCH

| | Kaynak | Kod | Sonuç |
|---|---|---|---|
| **Tablo 13 (Pa anahtarı)** | 25 + 15 = **40** | 25 + 15 = 40 | ✅ **BİREBİR MATCH** |
| Pa normları | 11.12 / 11.93 | 11.12 / 11.93 | ✅ MATCH |
| **Pa T bantları** | 80+/70-79/60-69/45-59/27-44 | `PA_T_BANDS` | ✅ **5/5 MATCH** |

### Mf bloğu tam kapandı (s.121-126)

`58/85` ✅ · `59/95` ✅ · `50/05` ✅ → **Mf bloğu 9 VAR / 1 YOK**
(yalnız `564/654` eksik).

### Yeni bulgu — CONFLICT-026 genişletmesi

Kaynağın **Pa kontrol listeleri** kodda **yok** (4 liste):
- yüksek puan (Graham 1987, 8 madde)
- **orta düzeyde yüksek** puan, **T: 65-70** (6+ madde)
- **düşük** puan, **T: 35-45** (13+5 madde)
- **aşırı derecede düşük** puan, **T<35** (5+12 madde)

**Ek sorun:** kodun en düşük Pa bandı **T 27-44** olduğu için **T: 35-45** ve
**T<35** ayrımı **hiç üretilemez** (band ikisini de kapsıyor).

### Görsel doğrulamalar

`v_pa_tablo13_full.png` (125 dpi tam sayfa — Tablo 13 + Pa listeleri + 80+ bandı)

### Kod değişikliği

**YOK** (salt okuma + doğrulama).

---

## PHASE 9/10 — batch 16: Pa (6) kod bloğu (kitap s.130-135) — **Pa BLOĞU KAPANDI**

Tarih: 2026-09-22 · Kaynak: **s.130-135** (PDF p73 L – p75 R)

| s. | PDF | İçerik | Sonuç |
|---|---|---|---|
| 130 | p73 L | Pa T bantları (5 bant) + "Sadece Pa yükselmesi" + çapraz ref 61/16, 62/26, 63/36, 64/46 | ✅ bantlar 5/5 MATCH · SINGLE_PA birebir · **`64/46` gövdesi YOK** |
| 131 | p73 R | `648`, `65/56`, `67/76`, `678/876` | 1 VAR / 3 YOK |
| 132 | p74 L | `679`, `68/86` (+ **paranoid vadi** kuralı) | 1 VAR / 1 YOK |
| 133 | p74 R | `680/860`, `69/96`, `694/964` | 1 VAR / 2 YOK |
| 134 | p75 L | `698/968`, `60/06`, **456 Alt Testlerinin Örüntüsü** | 1 VAR / 1 YOK |
| 135 | p75 R | **Şekil 21 — Scarlett O'Hara vadisi** (Pd ↑ · Mf ↓ · Pa ↑) | **YOK** → CONFLICT-033 |
| 136 | p76 L | **BOŞ SAYFA** (görsel doğrulandı) | — |
| 137 | p76 R | **Pt (7) Alt Testi başlıyor** | sıradaki blok |

### Bulgular

- **Pa T bantları 5/5 MATCH** · **"Sadece Pa" birebir MATCH** (`SINGLE_PA`) ·
  Pa normları ve Tablo 13 (batch 15) tam uyumlu
- **9 VAR / 6 YOK** kod başlığı → kümülatif **115 başlık: 79 VAR / 38 YOK**
- **🔴 CONFLICT-036 (P1, yeni):** Pa bloğunun `64/46` gövdesi
  ("immatur, narsisistik, pasif-bağımlı…") kodda **hiç yok**; `64` çağrısı
  **Pd bloğunun `46/64`** metnini döndürüyor
- **CONFLICT-027 genişledi** — 3 sayısal kural kodda yok: paranoid vadi
  (`6≈8≈70 T`, `7 = 6/8 − 10 T`), `698/968 → 68/86` ("8, 6'dan 5 T aşağıda"),
  456 örüntüsü (`4,6 > 65 T` ∧ `5 = 35 T`)
- **CONFLICT-033 genişledi** — Scarlett O'Hara vadisi (Şekil 21) kodda yok

### Doğrulama

`typecheck` **0 hata** · `npm test` **316/316 PASS** (24 suite) · **REGRESSION
YOK** · **kod değişikliği yok** (FIX aşaması tüm kod seti çıkarıldıktan sonra).

---

## PHASE 9/10 — batch 17: Pt (7) Psikasteni bloğu (kitap s.137-141)

Tarih: 2026-09-22 · Kaynak: **s.137-141** (PDF p76 R – p78 R)

| s. | PDF | İçerik | Sonuç |
|---|---|---|---|
| 137 | p76 R | **Pt (7) Alt Testi** başlığı + Graham 1987 yüksek-puan listesi (1-22) | — |
| 138 | p77 L | **Tablo 14 (Pt anahtarı — 48 madde)** + norm + madde açıklamaları 23-38 | 🎯 **BİREBİR MATCH** · norm farkı → CONFLICT-037 |
| 139 | p77 R | Madde 39-41 + **"Sadece Pt yükselmesi"** + **düşük puan 5 maddesi** + **Pt T bantları** | bantlar 5/5 MATCH · SINGLE_PT MATCH · düşük liste kodda YOK |
| 140 | p78 L | Pt çapraz ilişkiler + `71/17`, `72/27`, `73/37`, `74/47`, `75/57`, `76/67`, `78/87` | 7/7 VAR |
| 141 | p78 R | `782`, `872`, `784/874`, `789`, `79/97` + "7<8 → 75 T" kuralı | 4 VAR (biri `diagnosis`) · `789` **YOK** |

### Bulgular

- **🎯 P0 — Tablo 14 birebir MATCH:** Doğru 39 + Yanlış 9 = **48** (kitap başlığı 48)
- **Pt T bantları 5/5 MATCH** (kaynağın 75-84 ⟷ 84+ örtüşmesi kodda 75-83/84+ olarak çözülür)
- **`SINGLE_PT` birebir MATCH** ✅
- **Kritik sayısal koşullar kodda mevcut:** "8'in 5 T altı" · "7<8 → 75 T üstü"
- **Pt bloğu: 14 VAR / 1 YOK** → kümülatif **130 başlık: 93 VAR / 39 YOK**
- **CONFLICT-037 (REJECTED):** s.138'deki kadın normu **29.90** Savaşır (1981)
  atıflıdır; kitabın Tablo 30'u **29.20**'dir ve kod onu izler → atıf farkı, kod doğru
- Pt **düşük-puan 5 maddesi** kodda yok → CONFLICT-026 sınıfı

### Doğrulama

`cmp-tablo14.ts` (anahtar birebir) · `cmp-pt-batch17.ts` (kod kapsamı) ·
typecheck **0** · testler **316/316 PASS** · **kod değişikliği YOK**.

---

## PHASE 9/10 — batch 18: Pt bloğu KAPANIŞI + Sc (8) girişi/anahtarı/bantları (kitap s.142-146)

Tarih: 2026-09-22 · Kaynak: **s.142-146** (PDF p79 L – p81 L)

| s. | PDF | İçerik | Sonuç |
|---|---|---|---|
| 142 | p79 L | `79/97` kapanışı + **`794 Kodu`** + **`70/07 Kodu`** → **Pt bloğu BİTER** | `70/07` VAR (3 kesim eksik) · `794` **YOK** |
| 143 | p79 R | **8. Şizofreni (Sc) Alt Testi** girişi + Graham 1987 yüksek puan **1-22** (T: 80-100) | listeler kodda YOK → CONFLICT-026 |
| 144 | p80 L | 🎯 **Tablo 15 (Sc anahtarı, 78 madde)** + "K Eklemeli" + norm 29.82/31.06 + Graham 23-38 + düşük puan 1 | **BİREBİR MATCH** (59+19=78) |
| 145 | p80 R | Sc düşük puan 2-9 + **Sc T bantları** 100+ ("T>95") · 75+ · 60-74 (3 madde) | bantlar MATCH · OCR **BAND-HEAD-DROP** |
| 146 | p81 L | bant kapanışı (T 45 · 45-59 · 21-44) + **5 çapraz ref** + `86/68` · `87/78` · `8726/Yüksek 9` | **5/5 MATCH** · ref **5/5 UYUMLU** · 2 gövde YOK |

### Bulgular

- **🎯 P0 — Tablo 15 birebir MATCH:** Doğru **59** + Yanlış **19** = **78** (kitabın
  "Madde Sayısı: 78" başlığıyla uyumlu) ✅ — **400 dpi bindirmeli iki kırpma**
  (`tbl15_L`/`tbl15_R`); dikiş `156·251·320·354` sütunundan geçiyor (DECISION-003).
- **Norm 29.82 / 31.06 MATCH** ✅ (Tablo 15 dipnotu = Savaşır 1981; sd Tablo 30) ·
  **"K Eklemeli"** ↔ `K_CORRECTION.Sc = 1.0` ✅
- **Sc T bantları 5/5 MATCH** ✅ (`100+ / 75+ / 60-74 / 45-59 / 21-44`) — 100+
  bandının `T>95` notu ve 60-74 bandının 3 maddesi kodda mevcut.
- **Kaynakta "Sadece Sc yükselmesi" paragrafı YOK** → koddaki `SINGLE_*` setinde
  Sc'nin bulunmaması **uyumlu**; çelişki yazılmadı ✅
- **Terim hatası bulundu ve düzeltildi:** `21-44` bandında kod "bakışları
  **konservatiftir**" diyordu; kaynak "bakış **açıları konformaldir**" →
  **CONFLICT-038 FIXED** (DECISION-028 / **CHANGE-013**)
- **Pt bloğu KAPANDI** (s.137-142): `789` ve `794` gövdeleri yok; `70/07`
  gövdesinde 3 kesim eksik → CONFLICT-024/025/030
- **Sc kod bloğu (s.146): 8 başlık → 6 VAR / 2 YOK** — `87/78` Sc gövdesi yok
  (`'87'` → Pt `78/87` metni) → **CONFLICT-031 +1**; `8726` → `78/87` kırpma →
  **CONFLICT-030 +1**
- **CONFLICT-027 +2 örnek (→ 38):** `70/07` "5 alt testi **40 T** altı" koşulu ve
  `86/68` "**7 de 70 T puanındadır**" eşiği (koddaki karşılığı "7 daha düşük")
- **Beş çapraz referans UYUMLU:** `81/18 · 82/28 · 83/38 · 84/48 · 85/58`
  kaynakta "Bakınız" → tek-kayıt tasarımı burada doğru davranır (CONFLICT-024
  iddia edilmez) — **olumlu bulgu**
- **Kümülatif kapsam: 140 başlık → 100 VAR / 42 YOK**
- **Yeni OCR kuralı:** `OCR_ISSUES.md` → **BAND-HEAD-DROP** (bant başlığı, kendi
  paragrafının ilk satırlarıyla birlikte OCR'dan düşebiliyor; bant sayımı OCR ile
  yapılmaz)

### Doğrulama

`cmp-sc-batch18.ts` (Tablo 15 + bantlar + kod kapsamı) · typecheck **0** ·
`mmpiKeyIntegrity.test.ts` **37/37** (+8) · testler **324/324 PASS** (26 suite) ·
`npm run build` **PASS** (`optik-form.html` senkron) · **CHANGE-013 tek metin
dizesi**, puanlama matematiği değişmedi.

---

## PHASE 9/10 — batch 19: Sc (8) bloğu KAPANIŞI + Ma (9) girişi ve Tablo 16 (kitap s.147-150)

Tarih: 2026-09-22 · Kaynak: **s.147-150** (PDF p81 R – p83 L)

| s. | PDF | İçerik | Sonuç |
|---|---|---|---|
| 147 | p81 R | **Şekil 22 Paranoid Vadi** (Pa↑ Pt↓ Sc↑) + `89/98 Kodu` girişi | gövde sadık · örüntü kodda YOK → CONFLICT-033 |
| 148 | p82 L | `89/98` kapanışı + Olası Tanılar + **`80/08 Kodu`** → **Sc bloğu BİTER** | 2/2 VAR · **2 eksik cümle** (yaş 27 · üçüncü yükselen) |
| 149 | p82 R | **9. Hipomani (Ma) Alt Testi** girişi + Graham yüksek puan 1-25 | liste kodda YOK → CONFLICT-026 |
| 150 | p83 L | 🎯 **Tablo 16 (Ma anahtarı, 46 madde)** + "(K Eklemeli)" + norm + Graham 26-42 | **BİREBİR MATCH** (35+11) |

### Bulgular

- **🎯 P0 — Tablo 16 birebir MATCH:** Doğru **35** + Yanlış **11** = **46**
  (kitabın "Madde Sayısı: 46" başlığıyla uyumlu) ✅ — **430 dpi bindirmeli iki kadraj**
  (`tbl16_L`/`tbl16_R`); dikiş `64·181·251·148` sütunundan geçiyor.
- **Norm 19.96 / 19.72 MATCH** ✅ · **"(K Eklemeli)" ↔ `K_CORRECTION.Ma = 0.2`** ✅
  → PHASE 5'te **kalan tek klinik anahtar: Tablo 17 (Si)**
- **Sc (8) bloğu KAPANDI (s.143-148): 10 başlık → 8 VAR / 2 YOK** — eksik gövdeler
  `87/78` (Sc metni yok, `87` çağrısı Pt `78/87`'yi döndürüyor) ve `8726/Yüksek 9`
- **CONFLICT-025 +2:** `89/98` "Yaşı 27'den küçük olanlarda görülür, üçüncü yükselen
  alt test 4, 7 ya da 6'dır" · `80/08` "7 ve 2 alt testleri en yüksek üçüncü testtir"
- **CONFLICT-027 → 40 örnek** (yukarıdaki iki üçüncü-yükselen/yaş koşulu sayısal
  olarak tespit edilmiyor) · **CONFLICT-034 +1** (yaş direktifi) ·
  **CONFLICT-033 → 6 konfigürasyon** (Şekil 22 + "hepsini doğru yanıtlama" ayrımı)
- **CONFLICT-026 +2:** Ma Graham yüksek puan **42 satır** + düşük puan listesi kodda yok
- **Yeni OCR kuralı (`TABLO-NUMBERS`) — ölçüldü:** Tablo 16'nın 46 numarasını 200 dpi
  OCR **44/46** okudu; **`180` ve `267` kayboldu**, 22 sahte token eklendi → OCR'a
  dayansaydı **iki yanlış P0 ÇELİŞKİ** üretilecekti. Kural: P0 liste kaynakları
  daima yüksek DPI görselden okunur ve `cmp-*.ts` içine gömülür.
- **Araç dersi:** kod cümleleri noktalı virgülle birleştiği için kaynak cümlesinin
  büyük harfli başlangıcı aranamıyor → `cmp-ma-batch19.ts` **küçük harfe
  indirgeyerek** karşılaştırıyor (ilk koşuda sahte "Danışmanlık görüşmelerinde YOK"
  bulgusu böyle elendi)
- **Kümülatif kapsam: 142 başlık → 102 VAR / 42 YOK** · **Kod değişikliği YOK**

### Doğrulama

`cmp-ma-batch19.ts` (Tablo 16 + Sc kapanış gövde denetimi) · typecheck **0** ·
`mmpiKeyIntegrity.test.ts` **43/43 PASS** (+6 kilit: Tablo 16 birebirlik, dikiş
`148` kontrolü, K+norm, `89/98` ve `80/08` regresyonu) · testler **330/330 PASS** ·
`npm run build` **PASS** (`optik-form.html` senkron).

---

## PHASE 9/10 — batch 20: Ma bantları + Ma kod bloğu KAPANIŞI + 🎯 Tablo 17 (Si) (kitap s.151-156)

Tarih: 2026-09-22 · Kaynak: **s.151-156** (PDF p83 R – p86 L)

| s. | PDF | İçerik | Sonuç |
|---|---|---|---|
| 151 | p83 R | Ma yüksek-puan listesi sonu + **Ma T bantları** (`85 T` · `70-84` · **`60- 75`** · `60-69` · `45-59`) | `MA_T_BANDS` kapsamı **tam** (23/23 parça) |
| 152 | p84 L | `21-44` bandı + "Yalnızca alt test 9'u…" paragrafı + **"Ma alt testinin diğer alt testlerle ilişkisi:"** + **Yüksek 9/Yüksek K Kodu** | 5 cümle YOK (025 +5) · K-örüntüsü YOK (**CONFLICT-039**) · 4 sayısal koşul → **027 40→44** |
| 153 | p84 R | **Yüksek 9/Düşük K** + **`91/19`** + 7 `Bakınız` + "Eyleme vuruk…" notu + **`90/09`** → **Ma bloğu BİTER** | 4 başlık → **1 VAR / 3 YOK** · `91/19` = **CONFLICT-036 vaka 2** |
| 154 | p85 L | **BOŞ SAYFA** | sayfa eşleme teyidi · `OCR_ISSUES.md` → **`BLANK-PAGE`** kuralı |
| 155 | p85 R | **0. Sosyal İçedönüklük (Si) girişi** + Graham yüksek 1-20 + düşük 1 | listeler kodda YOK → CONFLICT-026 (+2) |
| 156 | p86 L | 🎯 **Tablo 17 — Si anahtarı (Madde Sayısı: 70)** + norm dipnotu + Si düşük 2-14 + yorum paragrafları | **P0 BİREBİR MATCH** (34+36) |

### Bulgular

- **🎯 P0 — Tablo 17 (s.156) BİREBİR MATCH:** **Doğru 34 + Yanlış 36 = 70** ✅ →
  **PHASE 5 kaynak tarafı TAMAMI kapandı** (Tablo 8-17: Hs 33 · D 60 · Hy 60 ·
  Pd 50 · Mf 60 · Pa 40 · Pt 48 · Sc 78 · Ma 46 · **Si 70**). Kadraj 500 dpi
  **bindirmeli iki** kesit (`b20_t17_L`/`b20_t17_R`); fiziksel **yırtık çizgisi**
  `124·304·427 / 119·309·451` sütunundan geçtiği için bu 6 değer kesişimde ikinci
  kez okundu.
- **Si normları:** Tablo 17 dipnotu "Erkeklerde ortalama:**26.86**, kadınlarda
  29.88 (Savaşır 1981)" ↔ `TURKISH_NORMS` E **23.86** / K 29.88. **Tablo 30
  (s.195) bu oturumda yeniden okundu → `1003 · 23.86 · SD 7.97 / 663 · 29.88 ·
  7.52`** → **kod Tablo 30'u izler** → **CONFLICT-040 REJECTED**
  (CONFLICT-001/002/037 emsali; Si'de K düzeltmesi olmadığı için dipnot-Tablo 30
  eşitliği beklenir, kadın tarafı eşit, erkek değil → dipnot baskı hatası).
  **Tablo 17'de "(K Eklemeli)" yok** ↔ `K_CORRECTION`'da `Si` yok ✅.
- **CONFLICT-036 · 2. SOMUT VAKA:** `91/19 Kodu` (s.153, "Ender görülmektedir.
  Hastalar hipomanik durumdadırlar…") **5/5 YOK** — `codeInterpretation('91')`
  kanonik `'19'` kaydına düşüyor ve orada **s.77'deki Hs bloğu `19/91` gövdesi**
  duruyor. Kitap ikisini **ayrı başlık** olarak tutuyor ("Ayrıca 19/91 Koduna da
  Bakınız") → **kusur `slice(0,2)` kırpması olmadan, 2 haneli kodda da var**:
  blok-bazlı gövde tek-anahtarlı `CODES` modeline sığmıyor (CONFLICT-031'in en
  doğrudan kanıtı).
- **🆕 CONFLICT-039 (P2):** "X alt testinin diğer alt testlerle ilişkisi:" bölümü
  **her blokta var** (Sc s.146 · Ma s.152 · **Si s.157**) ve **K-ilişkili örüntüleri**
  taşıyor: `Yüksek 9/Yüksek K` (4 sayısal koşul: 9 ve K > 70 T · 2 < 50 T · K > 70 T ·
  5 < 40 T) + `Yüksek 9/Düşük K`. "K" rakam olmadığı için `CodeInterpretation`
  anahtarıyla **adreslenemez** → 030/031/036 ile **tek tasarımsal karar**.
- **Ma T bantları:** kod **5/5 bandı** eksiksiz taşıyor (85+/70-84/60-69/45-59/21-44;
  23/23 kaynak parçası) + **kaynak etiket hatası** belgelendi: kitap `60- 75 T`
  paragrafı veriyor (70-84 ile çakışır); kod bu metni **60-69 bandına birleştirerek**
  korumuş → **çelişki değil, kayıt**. Trivial farklar: "Kendilik değer**lerini**"→
  "değer**ini**", "aşırı çaba **göstermek**"→"**sarf etmek**".
- **CONFLICT-025 +6 cümle** (s.152 ilişki paragrafı 5 · s.153 "Eyleme vuruk davranış
  ile ilgilidir") · **CONFLICT-026 +2** (Si yüksek 1-20 + düşük 1-14) ·
  **CONFLICT-027 40 → 44** (K-örüntüsündeki 4 eşik).
- **Kapsam:** Ma bloğu **4 başlık → 1 VAR / 3 YOK** (7 `Bakınız` ref'i hedef
  kayıtlarda mevcut → uyumlu); kümülatif **146 → 103 VAR / 45 YOK**
  (TOPLAM satırlarındaki tarihî tutarsızlık FINAL'da yeniden sayılacak).
- **🆕 OCR kuralları:** **`ASCII-FOLD`** — OCR çıktıları diacritic'te tutarsız;
  `grep "ilişkisi"` 0 döndürüp Sc/Si'deki bölümü **"yok" gibi** gösterdi (python +
  katlama ile bulundu) → OCR üzerinde ham Türkçe arama **bulunamadı kanıtı olamaz**.
  **`BLANK-PAGE`** — 0 satır OCR = araç hatası değil, **boş sayfa** olabilir
  (s.154: koyu piksel %4.2 vs dolu sayfa %11.9). **`TABLO-NUMBERS`** 2. ölçüm:
  Tablo 17'nin 70 numarasından **69** kurtarıldı, `99` düştü (+25 gürültü token).
- **Kod değişikliği YOK** (yalnız `tests/` + denetim aracı/docs).

### Doğrulama

`cmp-ma-si-batch20.ts` · typecheck **0** · `mmpiKeyIntegrity.test.ts` **50/50 PASS**
(+7) · `npm test` **337/337 PASS** (30 suite) · `npm run build` PASS (üretim farkı
yok) · docs: SOURCE_FACTS (`SOURCE-MA-003/004`, `SOURCE-SI-001`), CONFLICTS
(036 vaka 2, **039 yeni**, **040 REJECTED**, 025/026/027 genişletmeleri),
CONFLICT-024_KAPSAM, SOURCE_INDEX (151-156 DONE · **s.154 boş** · bayat 155-158
satırı kaldırıldı), VERIFIED_DATA, OCR_ISSUES (3 kural), TEST_AUDIT, AUDIT_STATE.

---

## PHASE 9/10 — batch 21: Si (0) KAPANIŞI → **BÖLÜM 5 KAYNAK TARAMASI BİTTİ** (kitap s.157-158)

Tarih: 2026-09-22 · Kaynak: **s.157** (PDF p86 R) + **s.158 (BOŞ SAYFA)** (p87 L)

| s. | PDF | İçerik | Sonuç |
|---|---|---|---|
| 157 | p86 R | Si **T bantları** (4) + giriş paragrafı + **"diğer alt testlerle ilişkisi:"** (9 Bakınız) + **`049 Kodu`** + **`027(8) Kodu`** | bantlar **3/4 birebir**; 2 kod gövdesi **YOK** |
| 158 | p87 L | **BOŞ SAYFA** (koyu piksel %0.62) | **Bölüm 5 s.157'de kapanır** — plan "s.157-158"i düzeltti |
| (159) | p87 R | **BÖLÜM 6** girişi ("…körlemesine değerlendirme yapılmamalıdır… demografik özellikler: yaş, cinsiyet, eğitim…" ) | **PHASE 10 sınırı** teyit edildi |

### Bulgular

- **🏁 MİLESTONE:** **Bölüm 5 (kod tipleri) taraması TAMAMLANDI (s.63-157).**
  024 ailesine yeni sayfa gelmez → **tek tasarım kararı (DECISION-029 adayı) için
  kanıt seti kapandı**.
- **CONFLICT-030'a EN GÜÇLÜ İKİ VAKA:** `codeInterpretation('049')` → **`40/04`**
  metni, `codeInterpretation('027(8)')` → **`20/02`** metni (slice(0,2) + kanonik
  iki hane). Yani kırpma burada **alakasız bir kodun yorumunu** kullanıcıya gösteriyor;
  `027(8)` ayrıca **parantezli notasyon** taşıdığı için iki-haneli modelde hiç
  adreslenemiyor (**CONFLICT-031 +2**).
- **CONFLICT-024 +2 YOK** (`049`, `027(8)` gövdeleri yok) → kapsam **148 → 103 VAR / 47 YOK**
- **CONFLICT-025 +5 cümle:** `70+` bandı kuyruğu ("Nevrotik üçlüde yükselme
  görülebilir" + "Ayrıca bakınız, 2, 7 ve 8…") · s.156-157 süzülen paragraf
  (20 puanlık fark · Si+4+9 · 2/7+8)
- **CONFLICT-027 44 → 45** ("Alt test Si'de **20 puanlık** farklılık…" sayısal koşulu)
- **CONFLICT-033 → 9 örüntü** (+3 çok-ölçekli: nevrotik üçlü atfı · Si↑4↑9↑ · Si↑(2|7)↑8↑)
- **✅ Çelişki üretmeyen:** 9/9 **Bakınız hedefi mevcut ve etiketler birebir** ·
  `60-69`/`45-59`/`25-44` bandı **birebir** · kodun `25-44` bandını `min:0`'a
  genişletmesi **BİLGİ** · "bireylerdir**..**" kaynak yazım hatası
- **🆕 `INVENTORY-DOUBLE-COUNT`:** `inventory.py` s.157'de **20** kod başlığı saydı
  (gerçek **11**) — regex `X/Y`yi **her iki yönde** eşleştiriyor; parantezli
  `(8)` düşüyor → başlık sayımı daima görselden
- **Kod değişikliği YOK** (DECISION-028: eksik içerik bekletilir)

### Doğrulama

`cmp-si-batch21.ts` (6 fark, hepsi yorum katmanı) · typecheck **0** ·
`mmpiKeyIntegrity.test.ts` **56/56 PASS** (+6) · `npm test` **343/343 PASS** (30 suite) ·
`npm run build` **PASS** (`optik-form.html` üretim farkı yok).

---

## 2026-09-22 — Oturum 8 (devam 3): **DECISION-029 ONAYLANDI (A) → CHANGE-014 UYGULANDI**

- Kullanıcı onayı ("A'dan devam") ile **DECISION-029 seçenek (A)** kabul edildi →
  **ilk kez bu turda `src/` değişti** (4 dosya; daha önce 21 batch boyunca
  `src/` değiştirilmemişti)
- **Kod kimliği:** blok = kodun **ilk rakamı**; `parseCode()` + `CODE_DIGIT_SCALE` +
  ayrık **`BLOCK_CODES`** (4 kayıt) → `CODES` (45) olduğu gibi kaldı
- **Kırpma kaldırıldı:** `slice(0,2)` gitti → eşleşme yoksa `undefined`
  (CONFLICT-030 kapandı; 33 kalan örnek artık **yanlış metin değil** tanımsız)
- **Kaynağa sadık 4 yeni gövde:** `Ma:19` (s.153) · `Pa:46` (s.130-131) ·
  `Si:049` · `Si:027` `027(8)` (s.157) — hiçbiri uydurulmadı, hepsi görsel okumalı
- **Koşullu yorum katmanı:** `CodeCondition { source, quote, test?, manual? }` →
  **12 koşul** (`12 13 26 27 49 07 68 89 08` + `Pa:46`); yaş gibi profil-dışı
  veriler **`manual`** (elle değerlendirme notu) — `MMPIProfile`'da `age` yok
- **Örüntü katmanı:** nevrotik üçlü **3 yeni desen** (Şekil 18/19/20, s.103-106) +
  `PatternHit.source` → CONFLICT-033 **4/4 konfigürasyon** temsili
- **UI:** `MMPICodeTab` + `MMPIPrintReport` profil bağlamlı
  `codeInterpretationForProfile()`; "Koşullu ek yorum" kutusu ve blok etiketi;
  "yorum tanımlı değil" durumu kelimelendi
- **Test/CI:** tsc **0** · `mmpiKeyIntegrity` **63/63** · `mmpiInterpretation`
  **38/38** · `npm test` **359/359 PASS** (34 suite) · `npm run build` **PASS**
  (`optik-form.html` senkron, commit'te)
- **Bulunup düzeltilen kendi hatamız:** `CODE_CONDITIONS` anahtarları `'70'`/`'86'`
  olarak yazılmıştı, çözümleyici **sıralı** hane (`'07'`/`'68'`) ile arıyor →
  **2 koşul ölüydü**; anahtarlar düzeltildi ve **ölü-anahtar testi** eklendi
- **Kapsam güncellendi:** `CONFLICT-024_KAPSAM.md` **148 → 106 VAR / 44 YOK**
  (3 başlık YOK→VAR; `64/46` sayaç dışı) · **FIXED:** 030, 036 (2 vaka) ·
  **FIXED-kısmı:** 031 (`87` hâlâ Pt gövdesinde), 033 (kalan 5 örüntü) ·
  **OPEN:** 024, 025 (paragraflar), 027 (~33 koşul), 039
- **Sıradaki:** PHASE 10 — BÖLÜM 6, s.159-170 (render'lar hazır: `p088_R`,
  `p089_{L,R}` OCR bekliyor); gövde göçü (44 başlık) ayrı ve **batch batch** iş

---

## 2026-09-22 — Oturum 8 (devam 4): **PHASE 10 batch 22 — BÖLÜM 6 kaynak taraması BİTTİ (s.159-169; s.170 boş)**

- **BÖLÜM 6 “Minnesota Çok Yönlü Kişilik Envanterini Yorumlama Yaklaşımı”** kitabın
  yorum katmanının **çatısı**: s.159 girişi + s.160-169’da **10 numaralı profil örüntüsü**
  (Şekil 23-32, kutu içi sayısal eşiklerle) + 7 **Olgu** anlatısı; **s.170 BOŞ SAYFA**
  (PDF p93 L · koyu piksel **%0.24** · OCR **0 satır**) → bölüm **s.169'da kapandı**;
  s.171 = p93 R = **BÖLÜM 7** girişi (PHASE 8 zaten DONE)
- **Yöntem:** `render --pages 90-93 --dpi 150` → `ocr --pages 90-93 --dpi 200` →
  **her sayfa tam görselden okundu**; eşikler **görselden** (`TABLO-NUMBERS`): #10’daki
  “**54 T**” OCR’da “S4T” diye düşmüştü, #9’un “**45-54**” aralığı ölçek bandı `45-59`
  ile karıştırılmadı
- **Kod ↔ kaynak (10 desen):** #3 `Pd Yükselliği` → `SINGLE_PD` **BİREBİR** ✅ ·
  #1 `Konversiyon V` kaynak **Hs/Hy ≥ 70 T + D’den ≥ 10 T** ↔ kod **65/5** ·
  #2 `Paranoid V` kaynak **Pa/Sc 80 T, Pt 70 T** ↔ kod **70/70** → **ikisi de yanlış
  pozitif üretiyor** · #4 Kuş Kanadı · #5 Pasif-Agresif V (Kadın) · #6 pozitif eğim ·
  #7 negatif eğim · #8 “Yüzen” · #9 Batık · #10 Sınır → **7 desen KODDA YOK** ·
  `multi-high` (3+ ≥ 65) #8’in **yerine geçmez**
- **Kök neden notu:** #1/#2 eşikleri BÖLÜM 5’te **nicel olmadığı** için koda sabit sayı
  olarak girmişti; kitabın **tek sayısal** tanımı BÖLÜM 6’da → **CONFLICT-041 (P1)**
- **#7’de kaynak sayı vermiyor** (“belirgin düşüklük”) → kodlanırsa yalnız **metin/`manual`**
  (DECISION-028: sayı uydurulmaz)
- **CONFLICT-042 (P2) açıldı:** çekince direktifleri arayüzde yok — “tanısının konulması
  **doğru değildir**” (s.166) · “bu profil tipiyle bağlantılı **kod tipi verilemez**” (s.167) ·
  “**en düşük** olduğu alt testlere bakılmalı” (s.168) · “**hiçbir zaman körlemesine**
  değerlendirme yapılmamalıdır” + yaş/cinsiyet/eğitim/medenî durum/meslek (s.159) ·
  “zekâ 80 üstü + ortaokul” (s.159) · “60-64 T ise **MMPI’dan geliştirilen diğer testler**
  daha yararlı olabilir (Butcher 1984)” (s.169, `MMPIDerived` ile **UYUMLU**, gerekçe metni yok)
- **CONFLICT-034** kanıtı **genelleşti** (tek kod direktifi değil, bölümün ön koşulu) ·
  **CONFLICT-033**’e BÖLÜM 6 notu eklendi (Şekil 23-32 ile 033’ün kapsamı birleşiyor)
- **DECISION-030 adayı yazıldı (PENDING):** (A) eşikleri kaynağa çek + 6 deseni ekle +
  UI çekince notları · (B) yalnız eşikler · (C) yalnız çekinceler — **öneri (A)**;
  **bu turda `src/` DEĞİŞMEDİ**
- **Yeni kanıt aracı:** `scripts/mmpi-audit/cmp-b6-batch22.ts` → **SONUÇ: 9 FARK**,
  **P0 bulgu yok**
- **Testler (+6 kilit, `mmpiInterpretation` 38 → 44):** #1/#2 sapmaları `rule` equality,
  #3 davranış (1 pozitif + 2 negatif), #4-#10 **yokluk + aday profiller**, `multi-high`
  ≠ “Yüzen”, 042 `doesNotMatch` ×4 — **desen eklenince testler bilinçli kırılacak**

### Doğrulama

`npx tsc --noEmit` → **0 hata** · `npx tsx --test tests/mmpiInterpretation.test.ts` →
**44/44 PASS** · `npm test` → **365/365 PASS** (35 suite) · `npm run build` → **PASS**
(`src/` değişmedi → `optik-form.html` üretim farkı **YOK**) · `git diff --check` temiz

## Batch 23 — DECISION-030 ONAYLANDI (A) → CHANGE-015 UYGULANDI (2026-09-22)

**Tetikleyen:** kullanıcının “**A’dan devam et. DECISION-030 = A olarak onaylandı.**”
onayı + 6 maddelik kapsamı (eşikler · desenler · #7 `manual` · `source` · çekinceler ·
“kaynakta olmayan hiçbir sayı veya yorum üretme”).

**Sıra (kullanıcı talimatı: önce kayıt, sonra kod):** `DECISIONS.md` → DECISION-030
**KABUL (A)** + onay tablosu + uygulama notları · `CODE_CHANGES.md` → **CHANGE-015**
planı · **ardından** `src/` · **sonra** testler ve kapanış kayıtları.

**Kod (3 dosya + stil):**
- `src/scoring/mmpiInterpretation.ts` — `conversion-v` **65/5 → 70/10** · `psychotic-v`
  **70/70 → 80/80/70** (+ vadi şekli) · **6 yeni desen + `negatif-egim` (`manual`)** →
  **11 → 18 kayıt** · `PatternHit` alanları `quote`/`caveat`/`manual`/`manualNote` ·
  yeni dışa aktarım **`MMPI_PATTERN_CAVEATS`** (8 kayıt, tamamı kaynak sayfalı)
- `src/components/results/MMPIExtraTab.tsx` — kartlarda “Kaynak: s.1xx · Şekil 2x” +
  birebir alıntı + “Kaynak çekincesi” kutusu + “elle doğrulanacak” notu; `manual`
  kayıtlar **“Elle değerlendirilir”** listesinde (görülmeyenlere karışmıyor); sekmenin
  altında **“Yorum Çekinceleri (BÖLÜM 6)”**
- `src/styles/workspace.css` — `.mmpi-pattern-source` · `.mmpi-pattern-quote` ·
  `.mmpi-pattern-note` · `.mmpi-pattern-manual`

**Sayı üretimi denetimi (DECISION-028):** #7 “belirgin düşüklük” sayısız kaldı
(`manual`); `yuzen-profil`in F ayağı ve `sinir-profil`in geçerlik ayağı **sayı
vermediği için kurala girmedi** (`manualNote`); `kus-kanadi` kadın Mf koşulu
kaynağın kendi sayısı (50 T) ile ve tam-sayı okuma düzeninde (`Math.round`) karşılandı;
erkek profilinde Mf koşulu **aranmaz** (kaynak koşulu “kadınlarda” diye veriyor).
Otomatik denetim: `cmp-b6-batch23.ts` (6) bölümü — 9 kaydın içindeki **tüm** sayılar
`SOURCE-B6-001/002` corpus’unda (küme: 4 6 10 45 50 54 60 70 80).

**Kapanış:** **CONFLICT-041 (P1) → FIXED** · **CONFLICT-042 (P2) → FIXED** · sayaçlar
**15 açık** (0 P0 · 5 P1 · 6 P2 · 2 P3 + 2 FIXED-kısmı) · **FIXED 16 · REJECTED 9 ·
42 kayıt** · `CONFLICT-024` sayacı (148/106/44) **değişmedi** · **DECISION-031 adayı
(PENDING)** açıldı (024’ün 44 gövdesi + 027’nin ~33 koşulu).

**Doğrulama:** tsc **0** · `mmpiInterpretation` **44 → 47/47** · `npm test`
**365 → 368/368** (35 suite) · `npm run build` **PASS** → `optik-form.html` yeniden
üretildi ve commit’e dâhil · `cmp-b6-batch23.ts` → **0 FARK** (batch-22 aracı 9 → 7
FARK; (4)/(5) bölümleri yokluk ölçtüğü için tarihsî) · `git diff --check` temiz.

---

## 2026-09-22 — PHASE 10 · batch 24 — CHANGE-016: kalan desen kartlarında kaynak atfı

**Kapsam:** DECISION-030/A’nın 5. maddesinin BÖLÜM 6 dışındaki kısmı kapatıldı. BÖLÜM 5 kod
gövdelerine dayanan dört desen kartı atıf aldı: `cry-for-help` (s.36 · 4. madde) ·
`depressive-27` (s.87 + s.89 kritik koşul) · `49` (s.118-119) · `89` (s.147-148).
`source` + `quote` (+ eşiği ilgilendiren yerlerde `manualNote`) arayüzde; **hiçbir `hit`
koşulu değişmedi**.

**Yeni kaynak kaydı:** `SOURCE-VALIDITY-F-006` — s.36’daki 5 maddelik F-yükselme listesi
**ilk kez** SOURCE_FACTS’ta (`SOURCE_INDEX` sayfayı “DONE” saymış ama listeyi yazmamıştı).
Okuma: 150 dpi tam sayfa (satır başları) + 225 dpi kadrajlar (satır sonları, omuz boşluğuna
kadar) — `TABLO-NUMBERS` kuralı gereği OCR kullanılmadı.

**Bulgu:** `cry-for-help` ilişkisi kaynakta birebir, **eşiği yok**; liste “80 ve üstü T
puanı” bandı altında → **CONFLICT-043 (P2) AÇILDI**, eşik değiştirilmedi; kapı
**DECISION-032 (ADAY · PENDING)**. `neurotic-triad` ve `multi-high` **bilerek** kaynaksız.

**Kapanış:** sayaçlar **16 açık** (0 P0 · 5 P1 · 7 P2 · 2 P3 + 2 FIXED-kısmı) ·
**FIXED 16 · REJECTED 9 · 43 kayıt** · `CONFLICT-024` sayacı (148/106/44) **değişmedi** ·
`DECISION-031` adayı duruyor (44 gövde + ~33 koşul).

**Doğrulama:** tsc **0** · `mmpiInterpretation` **47 → 54/54** · `npm test` **368 → 375/375**
(36 suite) · `npm run build` **PASS** → `optik-form.html` yeniden üretildi ·
`cmp-b6-batch24.ts` → **0 FARK** · `cmp-b6-batch23.ts` → **0 FARK** · `git diff --check` temiz.

**Ortam notu:** tur başlarken sandbox snapshot’ı `f3794ed` üzerine sıfırlanmıştı (denetim
dizinleri untracked, `node_modules` yok); `git fetch` + `git reset --mixed fae032a` ile
worktree’nin push edilmiş halle **birebir** olduğu doğrulandı, `npm ci` + `pip install pymupdf`
yeniden kuruldu — kayıp iş yok.

---

## 2026-09-22 — PHASE 9/10 · batch 25 — CHANGE-018: Hs (1) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Kapsam:** DECISION-031 = A (Bölüm 5 kod göçü blok-blok tamamlama) kapsamında ilk blok olan
Hs (1) bloğu tamamlandı. 20 kod gövdesi kitaptaki tanı ve yönlendirmeleriyle `BLOCK_CODES`'a
eklendi (`123/213`, `1234`, `1236`, `1237`, `1270`, `12378`, `128/218`, `129/219`, `120/210`,
`132/312`, `134/314`, `1342`, `136/316`, `137`, `138/318`, `1382`, `139`, `Yüksek 1 / Düşük 4`,
`146`, `1469`); 10 koşul makinece değerlendirilebilir testlerle bağlandı; çakışma (123 vs 132) engellendi.

**Doğrulama:** tsc **0** · `cmp-hs-batch25.ts` **0 FARK** · `tests/mmpiHsBlock.test.ts` **16/16 PASS** ·
`tests/mmpiKeyIntegrity.test.ts` **63/63 PASS** · `npm run build` **PASS**.

---

## 2026-09-22 — PHASE 9/10 · batch 26 — CHANGE-019: D (2) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Kapsam:** DECISION-031 = A kapsamında ikinci blok olan D (2) bloğu (s.81-92) tamamlandı.
14 yeni kod kaydı kitaptaki tanı ve yönlendirmeleriyle `BLOCK_CODES`'a eklendi (`213/231`, `243/432`,
`247/427/472/742`, `248`, `248 / Yüksek F`, `273/723`, `274/724`, `275/725`, `278/728`, `270`,
`281/821`, `284/824`, `287/827`, `207`); 11 koşul makinece değerlendirilebilir testlerle bağlandı
(özellikle kritik intihar riski koşulları: 278/728 K/Hs < 50 veya Ma >= 70, 287/827 K < 50 ∧ Ma >= 70);
`248/F` ayrıştırma desteği eklendi.

**Doğrulama:** tsc **0** · `cmp-d-batch26.ts` **0 FARK** · `tests/mmpiDBlock.test.ts` **16/16 PASS** ·
`tests/mmpiKeyIntegrity.test.ts` **63/63 PASS** · `tests/mmpiHsBlock.test.ts` **16/16 PASS** ·
`npm run build` **PASS** (`optik-form.html` güncellendi ve senkron).

---

## 2026-09-22 — PHASE 9/10 · batch 27 — CHANGE-020: Hy (3) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Kapsam:** DECISION-031 = A kapsamında üçüncü blok olan Hy (3) bloğu (s.95-103) tamamlandı.
6 yeni kod kaydı kitaptaki tanı ve yönlendirmeleriyle `BLOCK_CODES`'a eklendi (`Yüksek 3 / Yüksek K`,
`Hy:32`, `321`, `Yüksek 3 / Düşük 4`, `345/435/534`, `346/436`); 10 kod için 18 koşullu kural
makinece değerlendirilebilir testlerle bağlandı (özellikle 34/43 cinsiyet ve yükseklik farkları,
32 5 T farkı ve cinsiyet rolleri, 345 ve 346 kuralları); `parseCode` güncellendi.

**Doğrulama:** tsc **0** · `cmp-hy-batch27.ts` **0 FARK** · `tests/mmpiHyBlock.test.ts` **16/16 PASS** ·
`tests/mmpiKeyIntegrity.test.ts` **63/63 PASS** · `tests/mmpiDBlock.test.ts` **16/16 PASS** ·
`tests/mmpiHsBlock.test.ts` **16/16 PASS** · `npm run build` **PASS** (`optik-form.html` güncellendi ve senkron).

---

## 2026-09-22 — PHASE 9/10 · batch 28 — CHANGE-021: Pd (4) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Kapsam:** DECISION-031 = A kapsamında dördüncü blok olan Pd (4) bloğu (s.107-121) tamamlandı.
13 yeni kod kaydı kitaptaki tanı ve yönlendirmeleriyle `BLOCK_CODES`'a eklendi (`Pd:4_low5`, `Pd:456`,
`Pd:462`, `Pd:463`, `Pd:468`, `Pd:469`, `Pd:48_highF_low2`, `Pd:482`, `Pd:489`, `Pd:493`, `Pd:495`,
`Pd:496`, `Pd:498`), 18 çapraz ölçek takma adı ve 10 kod için koşullu kurallar bağlandı.

**Doğrulama:** tsc **0** · `cmp-pd-batch28.ts` **0 FARK** · `tests/mmpiPdBlock.test.ts` **17/17 PASS** ·
`tests/mmpiKeyIntegrity.test.ts` **63/63 PASS** · `npm run build` **PASS** (`optik-form.html` güncellendi ve senkron).

---

## 2026-09-22 — PHASE 9/10 · batch 29 — CHANGE-022: Pa (6) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Kapsam:** DECISION-031 = A kapsamında beşinci blok olan Pa (6) bloğu (s.127-135) tamamlandı.
6 yeni kod kaydı kitaptaki tanı ve yönlendirmeleriyle `BLOCK_CODES`'a eklendi (`Pa:678`, `Pa:679`,
`Pa:680`, `Pa:694`, `Pa:698`, `Pa:456_scarlett`), 16 çapraz ölçek takma adı ve 7 kod için koşullu
kurallar bağlandı (Psikotik Vadi, Paranoid Vadi, Scarlett O'Hara Vadisi, cinayet potansiyeli uyarısı).

**Doğrulama:** tsc **0** · `cmp-pa-batch29.ts` **0 FARK** · `tests/mmpiPaBlock.test.ts` **14/14 PASS** ·
`tests/mmpiKeyIntegrity.test.ts` **63/63 PASS** · `npm run build` **PASS** (`optik-form.html` güncellendi ve senkron).

---

## 2026-09-22 — PHASE 9/10 · batch 30 — CHANGE-023: Pt (7) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Kapsam:** DECISION-031 = A kapsamında altıncı blok olan Pt (7) bloğu (s.137-142) tamamlandı.
7 yeni kod kaydı kitaptaki tanı ve yönlendirmeleriyle `BLOCK_CODES`'a eklendi (`Pt:47`, `Pt:67`,
`Pt:782`, `Pt:872`, `Pt:784`, `Pt:789`, `Pt:794`), 16 çapraz ölçek takma adı ve 4 kod için koşullu
kurallar bağlandı (`78/87`, `79/97`, `70/07`, `Pt:47/74`).

**Doğrulama:** tsc **0** · `cmp-pt-batch30.ts` **0 FARK** · `tests/mmpiPtBlock.test.ts` **11/11 PASS** ·
`tests/mmpiKeyIntegrity.test.ts` **63/63 PASS** · `npm run build` **PASS** (`optik-form.html` güncellendi ve senkron).

---

## 2026-09-22 — PHASE 9/10 · batch 31 — CHANGE-024: Sc (8) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Kapsam:** DECISION-031 = A kapsamında yedinci blok olan Sc (8) bloğu (s.143-148) tamamlandı.
4 yeni kod kaydı kitaptaki tanı ve yönlendirmeleriyle `BLOCK_CODES`'a eklendi (`Sc:68`, `Sc:78`,
`Sc:8726`, `Sc:paranoid_valley`), 10 çapraz ölçek takma adı ve 6 kod için koşullu kurallar
bağlandı (`Sc:86`, `Sc:87`, `8726`, `paranoid_valley`, `89`, `08`). `parseCode()` motoruna `8726` ve
`paranoid_valley` kalıp tanıma kuralları eklendi.

**Doğrulama:** tsc **0** · `cmp-sc-batch31.ts` **0 FARK** · `tests/mmpiScBlock.test.ts` **13/13 PASS** ·
`tests/mmpiKeyIntegrity.test.ts` **63/63 PASS** · `tests/mmpiInterpretation.test.ts` **54/54 PASS** ·
`npm run build` **PASS** (`optik-form.html` güncellendi ve senkron).

---

## 2026-09-22 — PHASE 9/10 · batch 32 — CHANGE-025: Ma (9) bloğu kod göçü ve koşullu yorumlar (DECISION-031/A)

**Kapsam:** DECISION-031 = A kapsamında sekizinci blok olan Ma (9) bloğu (s.149-153) tamamlandı.
2 yeni kod kaydı kitaptaki tanı ve yönlendirmeleriyle `BLOCK_CODES`'a eklendi (`Ma:9_highK`,
`Ma:9_lowK`), 3 çapraz ölçek takma adı bağlandı (`Ma:9K`, `Ma:high9_highK`, `Ma:high9_lowK`).
Koşullu yorumlar katmanına `Ma:9_highK` (D < 50, K > 70, Kadın Mf < 40), `Ma:9_lowK` (Kadın
eksibisyonizm kuralı), `90/09` (erkeklerde nadirlik kuralı) ve `49/94` s.153 eyleme vurukluk
notu bağlandı. `parseCode()` motoruna Yüksek 9 kalıpları eklendi.

**Doğrulama:** tsc **0** · `cmp-ma-batch32.ts` **0 FARK** · `tests/mmpiMaBlock.test.ts` **9/9 PASS** ·
`tests/mmpiKeyIntegrity.test.ts` **63/63 PASS** · `npm run build` **PASS** (`optik-form.html` güncellendi ve senkron).

---

## 2026-09-22 — PHASE 9/10 · batch 33 — CHANGE-026: Si (0) bloğu kod göçü ve Bölüm 5 Kod Bloğu Göçü Kapanışı (DECISION-031/A)

**Kapsam:** DECISION-031 = A kapsamında dokuzuncu ve son klinik blok olan Si (0) bloğu (s.154-158)
tamamlandı. `Si:049` ve `Si:027` kodlarına koşullu yorum kuralları (`Si, Pd, Ma >= 70` eyleme vurukluk
bastırılması; `D/Pt >= 70 && Sc >= 70` ruminatif davranışlar) eklendi. 6 çapraz ölçek takma adı
(`Pd:049`, `Ma:049`, `D:027`, `Pt:027`, `Sc:027`, `Si:0278`) bağlandı.
Böylece Bölüm 5'teki 9 klinik ölçek bloğunun tüm kod göçleri (Hs, D, Hy, Pd, Pa, Pt, Sc, Ma, Si)
eksiksiz tamamlanarak kilitlendi.

**Doğrulama:** tsc **0** · `cmp-si-batch33.ts` **0 FARK** · `tests/mmpiSiBlock.test.ts` **6/6 PASS** ·
`tests/mmpiKeyIntegrity.test.ts` **63/63 PASS** · `npm run build` **PASS** (`optik-form.html` güncellendi ve senkron).

---

## 2026-09-22 — PHASE 12 & 13 — CHANGE-027: UI ve Yazdırma Raporu Denetimi (CONFLICT-007 FIXED)

**Kapsam:**
- **UI (`src/components/results/MMPICodeTab.tsx`):**
  - Çok noktalı kod analizi (üçlü ve dörtlü kodlar) bağlandı; profilde 1. ve 2. ölçeğe ek olarak 3. veya 4. ölçek yükselmesi kitapta tanımlı bir koda karşılık geldiğinde (ör. `123/213`, `278/728`, `782/872`, `8726`) ek analiz kartı basılır.
  - Kod ölçek sıralama etiketleri (`1. en yüksek`, `2. ölçek`, `3. ölçek`...) 3+ ölçekli kodlar için düzeltildi.
- **Rapor (`src/components/results/MMPIPrintReport.tsx`):**
  - Çok noktalı kod analizleri basılı klinik rapora aktarıldı.
  - Bölüm 6 profil örüntüleri (`detectPatterns`) tetiklendiğinde basılı rapora "Profil Örüntüleri & Konfigürasyonları (Bölüm 6)" bölümü eklendi.
- **Kaynak Sayfası (`src/components/SourcesPage.tsx`):**
  - Ceyhun, A. A., & Oral, G. (2003) el kitabı **Status A** (Özgün kaynak doğrulandı) APA 7 künyesine yükseltildi.
  - Bölüm 05 ve 06'daki künyesiz arşiv atıfları güncellendi.
  - Dipnot atıfları `docs/kaynak-denetimi.md` ve `docs/mmpi-audit/` ile hizalandı.
- **Dokümantasyon (`docs/kaynak-denetimi.md`):**
  - `docs/kaynak-denetimi.md` ana bileşen–kaynak eşleştirme tablosu ve dürüstlük kaydıyla oluşturuldu (**CONFLICT-007 FIXED**).
- **Testler (`tests/mmpiUiReport.test.ts`):**
  - 5 yeni birim testi eklendi (**5/5 PASS**). Toplam test: **503/503 PASS** (64 suite).

---

## 2026-09-22 — Klinik Ölçekler Sekmesi — CHANGE-030: Ölçek dosyası kartının tasarım ve açılır bölüm yeniden yapımı

**Kapsam:**
- **UI (`src/components/results/MMPIClinicalTab.tsx`):**
  - Graham (1987) listesi, demografik notlar ve madde numarası tabloları **kendi açılır-kapanır bölümlerine** alındı; diğer sekmelerle aynı `DisclosureRow` / `DisclosureControls` bileşenleri kullanılır.
  - Yalnız en belirgin (en yüksek T) ölçeğin Graham listesi açık gelir; "Tümünü aç / Tümünü kapat" toplu denetimi eklendi.
  - Rapor başlığına hızlı gezinme çipleri, kart başlığına T çubuğu (50 ortalama / 70 klinik eşik işaretli) eklendi.
  - Koşullu ek yorumlarda sağlanan ve sağlanmayan koşullar ayrıştı.
- **Tasarım (`src/styles/workspace.css`, `src/styles/screen.css`):**
  - Kartın tüm kuralları `@media screen` içine alındı — blok dosyanın kök düzeyinde duruyor ve yazdırılabilir A4 sayfaya sızıyordu.
  - Serif/italik karttan çıkarıldı, 9.5px metin kaldırıldı, ağırlıklar 400/600/700 ile sınırlandı (`font-src 'none'` altında sahte kalın üretimi engellendi).
  - 3px renkli sol kenarlık ve doygun avatar dairesi yerine sitenin 9px durum noktası + saç teli çerçeve dili kullanıldı; `--danger-ink` token'ı eklendi.
  - `@media print`: katlanmış gövdeler kâğıtta açılır, denetimler gizlenir.
- **Testler:**
  - `tests/mmpiClinicalReportUi.test.ts` (yeni) — **16/16 PASS**.
  - `tests/mmpiInterpretation.test.ts` — eski `aria-expanded` yokluğu beklentisi yeni açılır bölüm sözleşmesiyle değiştirildi.
  - Toplam: **589/589 PASS** (103 suite).

---

## 2026-09-23 — CHANGE-031: Klinik kart kullanılabilirliği, PDF'e Graham 1987 aktarımı, Tablo 12 denetim betiği onarımı

**Kapsam:**
- **Klinik kart (`MMPIClinicalTab.tsx`):**
  - Ölçü satırı grid → **flex**: sağdaki gri boşluk kalktı, K düzeltmesi (`+0.5K` … `+0.2K` / `Uygulanmaz`) aynı satıra sığdı; kaynak cümlesi + klasik ekleme oranı altına alındı.
  - **Kart başlığı katlanabilir** (tüm satır düğme, `aria-expanded`/`aria-controls`); özet bilgiler kapalıyken de görünür.
  - Norm atfı **"(Savaşır, 1981) — Tablo 30"** olarak netleşti (dipnot çelişkileri CONFLICT-028/037/040 REJECTED).
- **PDF (`MMPIPrintReport.tsx`):**
  - **"Ölçek Bazlı Detaylı Klinik Yorum (Graham 1987)"** bölümü eklendi: belirgin ölçekler için Graham listesi, demografik notlar, sağlanan koşullu yorumlar, Tablo özeti ve künye.
  - Klasik K ekleme tablosu dipnotu ve rapor altlığında onaylı künye.
- **Kayıt detayı (`RecordDetailPage.tsx`):** revizyon şeridi `RevisionNotice` bileşenine ayrıldı ve **kapatılabilir**; durum yalnız bellekte, `[recordId]` ile sıfırlanır → **F5'te geri gelir**.
- **Denetim aracı:** `cmp-tablo12.ts` Mf'nin cinsiyete özel anahtarına uyarlandı (betik `TypeError` ile çöküyordu, Tablo 12 denetlenmiyordu) → **0 FARK**.
- **Kaynak doğrulaması:** Tablo 9-17 madde sayıları, K oranları ve 26 norm hücresi; Tablo 15/16/30 OCR metninden (p80 L, p83 L, p105) doğrudan okundu.
- **Testler:** `auditScripts.test.ts` (7) + `recordDetailUi.test.ts` (4) yeni; `mmpiClinicalReportUi.test.ts` 24. Toplam **608/608 PASS** (106 suite) · tsc **0** · build **PASS**.

---

## 2026-09-23 — CHANGE-032: PDF'te sayfa yükü azaltıldı, kâğıt tipografisi yapılandırıldı

**Kapsam:**
- **PDF (`MMPIPrintReport.tsx`):** "Ölçek Bazlı Klinik Yorum (Graham 1987)" bölümü artık kâğıda **çıktı** basıyor: düzey rozeti, demografik/klinik notlar, bu profilde sağlanan koşullu yorumlar, Tablo özeti ve künye. 20-45 maddelik **kaynak enumerasyonu kâğıttan kaldırıldı** — ekran raporundaki katlanabilir kartlarda eksiksiz duruyor; bölüm açıklaması okuru oraya yönlendiriyor.
- **Ölçüm:** aynı profilde bölüm 9 647 → **3 118 karakter**, 194 → **43 satır** (%68 küçülme; ~2 sayfa → yarım sayfa).
- **Bulgu verisine dokunulmadı** (`src/scoring/**` değişmedi); hiçbir klinik cümle silinmedi ya da yeniden yazılmadı.
- **Kâğıt tasarımı:** `.pr-note` sol çizgi + başlık/gövde ayrımı (Klinik Ölçek Yorumları artık ad · renkli T · düzey rozeti ile yapılandırılmış), `.pr-table`'da sayfa başında tekrarlanan başlık + zebra + tabular rakam, `.pr-block h2` vurgu çubuğu, `widows/orphans: 2`.
- **Testler:** `mmpiClinicalReportUi.test.ts` 24 → **26**; Graham testi tersine çevrildi (madde listesi kâğıtta **basılmamalı**). Toplam **610/610 PASS** (106 suite) · tsc **0** · build **PASS**.
