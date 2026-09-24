# Source Index

Kaynak: `docs/sources/mmpi-kitap.pdf` — *Minnesota Çok Yönlü Kişilik Envanteri,
Değerlendirme Kitabı*, 2. Baskı, Ankara 2003, Ceyhun & Oral.
Ölçek sürümü: **MMPI (orijinal / MMPI-1), 566 maddelik kitap formu.**

## Sayfa eşleme (zorunlu formül)

```
leaf        = kitap_sayfası + 15
PDF sayfası = ceil(leaf / 2)
yarı        = "R" (sağ)  eğer leaf çift,  "L" (sol) eğer leaf tek
```

Doğrulanmış örnekler: kitap s.1 = PDF p8 R · kitap s.34 = PDF p25 L ·
kitap s.244 (Ek 9) = PDF p130 L · kitap s.257 (Ek 10) = PDF p136 R.

> **Merkez kırpma uyarısı:** Tarama sayfasının tam ortasından bölündüğünde
> bazı tablo sütunları kaybolur (bkz. `OCR_ISSUES.md` → SPINE-CLIP).
> Tablolarda `--half both` yerine **bindirme payı olan** kırpma kullanılmalıdır.

## Bölüm haritası

| Kitap s. | PDF (yarı) | Bölüm / Konu | Durum |
|---|---|---|---|
| i-vi | p3 R – p6 R | İçindekiler | **DONE** |
| vii-viii | p7 R | Önsöz | DONE |
| 1-4 | p8 R – p9 R | Bölüm 1: Tanım, MMPI'ın geliştirilmesi | DONE |
| 4-6 | p9 R – p10 R | Geçerlik testlerinin geliştirilmesi; ? / L / F / K tanıtımı | DONE |
| 7-16 | p11 L – p15 R | Klinik alt testlerin geliştirilmesi (Hs…Si), norm grupları | IN_PROGRESS |
| 17-28 | p16 R – p22 L | Bölüm 2: Formlar ve Uygulaması (test yönergesi, puanlama, profil çizimi) | NOT_STARTED |
| 29 | p22 R | Bölüm 3 girişi + **(?) Bir şey diyemem** alt testi | **DONE** |
| 30 | p23 L | **Tablo 2 — ? alt testi yorumu** (0 / 1-5 / 6-30 / 31+) | **DONE** |
| 31 | p23 R | **Tablo 3 — L maddeleri (15 madde)** + L alt testi | **DONE** |
| 32-33 | p24 L-R | **L T bantları** (69+ / 64-68 / 59-63 / 36-55 / ≤35) + L–klinik ilişkisi | **DONE** |
| 34 | p25 L | **F alt testi + Tablo 4 — F maddeleri (64 madde)** + F normu | **DONE** |
| 35 | p25 R | **F ham puan bantları** (0-2 / 3-9 / 10-15 / 16-25 / 26+) | **DONE** |
| 36 | p26 L | F yükselme nedenleri, araştırma özetleri | DONE |
| 37 | p26 R | **F T bantları** (≥80 / 70-79 / 55-69 / 44-54 / <45) + K alt testi girişi | **DONE** |
| 38 | p27 L | **Tablo 5 — K maddeleri (30 madde)** + K normu + K yüksek/ortalama | **DONE** |
| 39 | p27 R | K düşük puan profili; K ekleme tartışması | DONE |
| 40 | p28 L | **K T bantları** (≥72 / 61-72 / 46-60 / 27-45) + K'nin tek gecersiz-yapmayan alt test olmasi | **DONE** (gorsel dogrulandi) |
| 41-42 | p28 R – p29 L | K–klinik ilişkisi, K düzeyi–SED etkileşimi | **DONE** (s.42 boş doğrulandı) |
| **43** | **p29 R** | **Bölüm 4 girişi + Konfigürasyon 1 — Tersine V** (L,K 50-60 ∧ F>70) | **DONE** |
| **44** | **p30 L** | **Konfigürasyon 2** (L,K ≥60 ∧ F ≈50) + Şekil 2 | **DONE** |
| **45** | **p30 R** | **Konfigürasyon 3 — "V" (Çok Kapalı)** (F<50 ∧ L,K>60) + Şekil 3 | **DONE** |
| **46** | **p31 L** | **Konfigürasyon 4 — Yükselen Eğilim** (L=40, F 45-55, K=60) + Şekil 4 | **DONE** (K değeri görsel doğrulandı) |
| **47** | **p31 R** | **Konfigürasyon 5 — Azalan Eğilim** (L=60, F≈50, K 40-45) + Şekil 5 | **DONE** |
| **48** | **p32 L** | **Konfigürasyon 6 — Rastgele cevaplama** (L,K=55; F>105) | **DONE** (görsel doğrulandı) |
| **49** | **p32 R** | **Konfigürasyon 7 — Tümüne "doğru"** (L,K≤35; F>120) | **DONE** (görsel doğrulandı) |
| **50** | **p33 L** | **Konfigürasyon 8 — Tümüne "yanlış"** (L,F,K>80) | **DONE** (görsel doğrulandı) |
| **51** | **p33 R** | **Konfigürasyon 9 — Yardım isteği** (L,K<66; F≈100 veya altı) | **DONE** (görsel doğrulandı) |
| **52** | **p34 L** | **Konfigürasyon 10 — Geleneksel olmayan** (L<66; F>69; K>65) | **DONE** (görsel doğrulandı) |
| **53** | **p34 R** | **Konfigürasyon 11 — Açık ve tavizsiz** (L<55; F≈64; K<45) | **DONE** (görsel doğrulandı) |
| **54** | **p35 L** | **Konfigürasyon 12 — Güvenilir cevaplayıcı** (L≈50; F<70; K>50) | **DONE** |
| **55** | **p35 R** | **Konfigürasyon 13 — Akut/süreğen** (L>50; F≈K>55) | **DONE** |
| 56 | p36 L | **Konfigürasyon 14** | **DONE** (görsel) |
| 57 | p36 R | **Konfigürasyon 15** + **K+ profili** (Mark & Seeman 1963) | **DONE** (görsel) |
| 58 | p37 L | **F-K Endeksi** (kesim 9; 0-9 geçerli / >9 sahte-kötülük / 0 sahte-iyilik) | **DONE** (görsel ×2) |
| 59 | p37 R | F-K bantları (8-11 abartma / >16) + **TR endeksi** (≥3 risk, Dahlstrom 1972) | **DONE** (görsel) |
| 60 | p38 L | **Tablo 6** — TR endeksi 16 çifti | **DONE** (16/16 MATCH) |
| 61 | p38 R | **Tablo 7** — Dikkatsizlik 12 çifti | **DONE** (12/12 MATCH) |
| **62** | **p39 L** | **Dikkatsizlik kapanışı** (12 çift · max 12 · kesim 4, Greene 1980) | **DONE** (görsel) |
| 63 | p39 R | **BÖLÜM 5 başlangıcı** — klinik testler/kod tipleri; kaynak listesi; kapsam sözleşmesi | **DONE** (görsel) |
| **56** | **p36 L** | **Konfigürasyon 14 — erdemli görünme isteği** (L>55, F<60, K 59-64) + Şekil 14 | **DONE** (görsel doğrulandı) |
| 57 | p36 R | **Konfigürasyon 15** (L=60, F>70, K<40) + Şekil 15 + **K+ profili** tanımı (Mark & Seeman 1963) | **DONE** (şekil görsel doğrulandı) |
| 58 | p37 L | **F-K endeksi** (kesim 11→9; 0-9 geçerli, >9 sahte-kötülük, 0 sahte-iyilik; X̄ 8.66/SD 5.94) | **DONE** (görsel doğrulandı) |
| 59 | p37 R | **TR endeksi kesme puanı (≥3)** + F-K 8-11 / >16 bantları + Greene 1979 | **DONE** (görsel doğrulandı) |
| 60 | p38 L | **Tablo 6 — TR: aynı olan 16 madde çifti** | **DONE** |
| 61 | p38 R | **Tablo 7 — Dikkatsizlik alt testi: 12 çift + puanlama yönü** | **DONE** |
| 62 | p39 L | TR/dikkatsizlik kapanışı (dikkatsizlik kesmesi 4 — DECISION-022) | **DONE** |
| 63-66 | p39 R – p41 L | Bölüm 5 girişi + **Tablo 8 (Hs: 11 Doğru / 22 Yanlış, madde 33; X̄ 13.19/15.89)** | **DONE** (Tablo 8 görsel doğrulandı) |
| **67-69** | **p41 R – p42 R** | **Hs T-puan bantları** (85+/75-84/60-74/50-59/21-49) + Hs yorumu + **12/21**, **123/213**, **1234**, **1236** kodları | **DONE** (görsel doğrulandı) |
| **70-78** | **p43 L – p47 L** | **Hs kod bloğu TAMAMI** — 1237, 1270, 12378, 128/218, 129/219, 120/210, 13/31 (+Yüksek K, Düşük 2), 132/312, 134/314, 1342, 136/316, 137, 138/318, 1382, 139, 14/41, Yüksek1/Düşük4, 146, 1469, 15/51, 16/61, 17/71, 18/81, 19/91, 10/01 | **DONE** (görsel doğrulandı) · 22 kod tipi kodda YOK → CONFLICT-024 |
| **79** | **p47 R** | **D (2) alt testi girişi** + yüksek puan 21 maddesi (Graham 1987) | **DONE** (görsel doğrulandı) |
| **80-87** | **p48 L – p51 R** | **Tablo 9 (D anahtarı, 60 madde) + D T bantları + D kod bloğu (23, 24/42, 243/432, 247/427, 248, 25/52, 26/62, 27/72 …)** | **DONE** (görsel doğrulandı) · anahtar/norm/norm bantları MATCH · 12+ kod tipi kodda YOK → CONFLICT-024 · **T-eşiği koşulları** → CONFLICT-027 |
| **88-89** | **p52 L – p52 R** | **D kod bloğu IV-V**: 273/723, 274/724, 275/725, **278/728** + T-eşiği koşulları (5 T fark; K/Hs<50 T) | **DONE** (300 dpi görsel doğrulandı) · 4 kod kodda YOK · **CONFLICT-030** · CONFLICT-027 genişletildi |
| **90-92** | **p53 L – p54 L** | **D kod bloğu VI + kapanış**: 270, 28/82, 281/821, 284/824, 482/842, 287/827, 29/92, **20/02**, **207** | **DONE** · 29/92 ve 20/02 içeriği ✓ MATCH · 6 kod YOK · **D kod bloğu KAPANDI** |
| **93-94** | **p54 R – p55 L** | **Hy (3) alt testi girişi + Tablo 10 (Hy anahtarı)** | **DONE** (birebir MATCH — `SOURCE-CL-014/015`) |
| **95** | **p55 R** | **Hy (3) T-puan bantları** (85+/76-85/70-75/60-69/45-59/24-44) + "Sadece Hy yükselmesi" kuralı | **DONE** (300 dpi görsel ×4) · **6/6 bant + tek-yükselme MATCH** |
| **96-99** | **p56 L – p57 R** | **Hy kod bloğu I**: Yüksek3/YüksekK, `31`, **`32`**, `321`, `34/43`, Yüksek3/Düşük4, `34`, **`345/435/534`**, `346/436`, `35/53`, `36/63`, `54/45` notu | **DONE** (300 dpi görsel doğrulandı) · **CONFLICT-031** (blok-bazlı kod) · CONFLICT-027 genişletildi |
| **100-101** | **p58 L – p58 R** | **Hy kod bloğu II** — `36/63` devamı, `37/73`, `38/83` (tanı Şizofreni), `39/93`, `30/03` | **DONE** · **5/5 kod kodda VAR, içerik MATCH** · `394/934` YOK |
| **102** | **p59 L** | *(boş sayfa — OCR 1 satır döndü, görselle doğrulandı)* | **DONE (boş)** |
| **103-106** | **p59 R – p61 L** | 🆕 **NEVROTİK ÜÇLÜ PROFİLLERİ** — 4 konfigürasyon: konversiyon vadisi (Şek.17), basamak orantısı (Şek.18), şapka (Şek.19), yükselen eğilim (Şek.20) | **DONE** (300-340 dpi görsel ×4) · **CONFLICT-033** (kodda hiç yok) |
| **107** | **p61 R** | **Pd (4) alt testi girişi** + Tablo 11 + Graham 1987 maddeleri 1-19 | **DONE** (Pd bloğuna geçiş) |
| **107-110** | **p61 R – p63 L** | **Pd (4)** girişi + **Tablo 11 (Pd anahtarı, 50 madde)** + Graham maddeleri + **Pd T bantları** | **DONE** · anahtar **BİREBİR MATCH** (24+26=50, 600 dpi dikiş kontrolü) · bantlar **5/5 MATCH** |
| **111** | **p63 R** | **Sadece Pd yükselmesi** (en az 10 T) + **Pd diğer alt testlerle ilişkisi** (41/14, 42/24, 43/34, **Yüksek 4/Düşük 5**) | **DONE** (340 dpi görsel) |
| **112** | **p64 L** | **Yüksek 4/Düşük 5** devamı + **45/54 Kodu** (+ **yaş/eğitim/cinsiyet zorunluluğu**) | **DONE** (OCR `<LOWCONF>` → görsel kurtarma) |
| **113** | **p64 R** | **456 Kodu** + **46/64 Kodu** | **DONE** (340 dpi görsel) |
| **114** | **p65 L** | 46/64 kapanışı (40 T koşulu) | **DONE** |
| **115** | **p65 R** | **468/648 Kodu** + **469 Kodu** + **47/74 Kodu** başlangıcı | **DONE** (340 dpi görsel ×3) |
| **116** | **p66 L** | **47/74** devamı (478/748 · 472/742 atıfları) + **48/84 Kodu** başlangıcı | **DONE** |
| **117** | **p66 R** | **48/84** devamı (ergen + yetişkin) | **DONE** |
| **118** | **p67 L** | **482/842/824** Kodları + **489/849** Kodları + **49/94** Kodu | **DONE** |
| **119** | **p67 R** | 49/94 devamı (koşullar) + **493/943** + **495/945** | **DONE** (340 dpi görsel) |
| **120** | **p68 L** | **496/946** + **498/948** + **40/04** Kodu (**Pd bloğu kapanışı**) | **DONE** (400 dpi görsel ×4) |
| **121** | **p68 R** | **5. Kadınlık-Erkeklik (Mf) Alt Testi girişi** + Tablo 12 atfı | **DONE** |
| **122** | **p69 L** | **Tablo 12 — Mf anahtarı (60 madde)** + (*) notu + ortalama | **DONE** · **P0 BİREBİR MATCH** (450 dpi satır kadrajı) |
| **123** | **p69 R** | Mf yüksek puan (15 madde) + **eğitim düzeyi düşük/yüksek kadınlar** + **"Erkeklerde Mf değerlendirilmesi: 80 ve üstü T"** | **DONE** |
| **124** | **p70 L** | **Mf T bantları — Erkek** (80+/70-79/60-69/41-59/**26-40**) + **Kadın >65** | **DONE** · **5/5 MATCH** (LOWCONF kurtarma ×2) |
| **125** | **p70 R** | **Mf T bantları — Kadın** (56-65/41-55/26-40) + **"Erkeklerde sadece Mf yükselmesi"** + **Mf kodları** (51/15 … 57/75) | **DONE** · **4/4 MATCH** · eşik farkı → CONFLICT-027 |
| **126** | **p71 L** | **Mf kodları II** (58/85, 59/95, 50/05) | **DONE** · 3/3 VAR · **Mf bloğu kapandı** |
| **127** | **p71 R** | **6. Paranoya (Pa) Alt Testi girişi** + yüksek puan listesi (Graham 1987) + orta düzey liste (T: 65-70) | **DONE** · listeler ❌ yok → CONFLICT-026 |
| **128** | **p72 L** | **Tablo 13 — Pa anahtarı (40 madde)** + norm + düşük/aşırı düşük listeleri | **DONE** · **P0 BİREBİR MATCH** (125 dpi görsel) |
| **129** | **p72 R** | Pa listeleri devamı + **80 ve üstü T puanı** | **DONE** |
| **130** | **p73 L** | **Pa T bantları** (70-79/60-69/45-59/27-44) | **DONE** · **5/5 MATCH** |
| 111-158 | p63 R – p87 L | Pd kod bloğu + Mf (5), Pa (6), Pt (7), Sc (8), Ma (9), Si (0) | ✅ **DONE** — batch 11-21 (satır batch 21'de düzeltildi: bayat `NOT_STARTED` idi; ayrıntı aşağıdaki sayfa sayfa satırlarda) |
| 103 | p59 L | **Nevrotik üçlü profilleri** | NOT_STARTED |
| 111-120 | p63 L – p67 R | Pd (4) alt testi + kod tipleri (45/54, 468, 48/84, 489, 49/94 …) | NOT_STARTED |
| 121-129 | p68 L – p72 L | Mf (5) alt testi, **erkeklerde/kadınlarda Mf değerlendirmesi** | NOT_STARTED |
| 130-136 | p72 R – p75 R | Pa (6) alt testi + kod tipleri (64/46, 678, 68/86, 60/06) | NOT_STARTED |
| **137-141** | **p76 R – p78 R** | **Pt (7) girişi + Tablo 14 + T bantları + kod bloğu** | **DONE** (batch 17) · Tablo 14 **birebir MATCH** (39+9=48) · bantlar 5/5 · 14 VAR / 1 YOK (`789`) |
| **142** | **p79 L** | **Pt bloğu KAPANIŞI**: `79/97` kapanışı + **`794 Kodu`** + **`70/07 Kodu`** | **DONE** (batch 18) · `70/07` VAR (3 kesim eksik → CONFLICT-025) · `794` **YOK** → CONFLICT-024/030 · **Pt bloğu burada biter** |
| **143** | **p79 R** | **8. Şizofreni (Sc) Alt Testi girişi** + Graham 1987 yüksek-puan listesi 1-22 (T: 80-100) | **DONE** (batch 18) · listeler kodda YOK → CONFLICT-026 |
| **144** | **p80 L** | 🎯 **Tablo 15 — Sc anahtarı (Madde Sayısı: 78)** + "K Eklemeli" + norm 29.82/31.06 + Graham 23-38 + düşük puan 1 | **DONE** (batch 18) · **P0 BİREBİR MATCH** (Doğru **59** + Yanlış **19**) — 400 dpi **bindirmeli iki kırpma** (`tbl15_L/R`, dikiş 156/251/320/354 sütununda) |
| **145** | **p80 R** | Sc düşük puan listesi 2-9 + **Sc T bantları**: 100+ ("T>95" notu) · 75+ · 60-74 (3 madde) | **DONE** (batch 18) · bantlar MATCH · **OCR uyarısı:** `100 T puanı ve üstü` başlığı 200 dpi OCR'da düştü → `OCR_ISSUES.md` **BAND-HEAD-DROP** |
| **146** | **p81 L** | Sc bantları kapanışı (Düşük Puanlar T 45 · 45-59 · 21-44) + **5 çapraz ref** + `86/68` + `87/78` + `8726/Yüksek 9` | **DONE** (batch 18) · bant **5/5 MATCH** ("konformaldir" terimi → **CONFLICT-038 FIXED**) · çapraz ref **5/5 UYUMLU** · `87/78`+`8726` **YOK** → CONFLICT-031/030 |
| **147** | **p81 R** | **Şekil 22 — Paranoid Vadi** (Pa↑ Pt↓ Sc↑, ızgara 30/50/70/90) + **`89/98 Kodu`** başlangıcı | **DONE** (batch 19) · örüntü kodda YOK → CONFLICT-033 (+1) · gövde sadık |
| **148** | **p82 L** | `89/98` kapanışı (Olası Tanı: Şizofreni · Madde kullanımına bağlı psikoz; "Yaşı 27'den küçük…" notu) + **`80/08 Kodu`** (+ Şizoid Kişilik) → **Sc bloğu BİTER** | **DONE** (batch 19) · 2/2 başlık **VAR** · 2 eksik cümle → CONFLICT-025/027/034 |
| **149** | **p82 R** | **9. Hipomani (Ma) Alt Testi girişi** + Graham 1987 yüksek puan **1-25** | **DONE** (batch 19) · liste kodda YOK → CONFLICT-026 |
| **150** | **p83 L** | 🎯 **Tablo 16 — Ma anahtarı (Madde Sayısı: 46)** + "(K Eklemeli)" + norm 19.96/19.72 + Graham 26-42 + Ma düşük puan 1-2 | **DONE** (batch 19) · **P0 BİREBİR MATCH** (35+11) · 430 dpi bindirmeli kadraj; OCR `180/267`yi kaçırdı → `OCR_ISSUES.md` TABLO-NUMBERS |
| **151** | **p83 R** | Ma yüksek-puan listesinin sonu (3-14) + **Ma T bantları**: `85 T ve üstü`, `70-84 T`, **'60- 75 T'** (kaynak hatası), `60- 69 T`, `45-59 T` başlangıcı | **DONE** (batch 20) · 420 dpi kadraj · `MA_T_BANDS` kapsamı **tam** (23/23 parça) |
| **152** | **p84 L** | `21-44 T` bandı + **'Yalnızca alt test 9'u kullanarak…'** paragrafı + **'Ma alt testinin diğer alt testlerle ilişkisi:'** + **Yüksek 9/Yüksek K Kodu** | **DONE** (batch 20) · 5 cümle kodda YOK → CONFLICT-025 · K-örüntüsü YOK → CONFLICT-039 (+4 sayısal koşul → 027) |
| **153** | **p84 R** | **Yüksek 9/Düşük K** + **`91/19` (Ayrıca `19/91`)** + 7 `Bakınız` ref + 'Eyleme vuruk…' notu + **`90/09`** → **Ma bloğu BİTER** | **DONE** (batch 20) · 4 başlık → **1 VAR (`90/09`) / 3 YOK** · `91/19` = **CONFLICT-036 vaka 2** |
| **154** | **p85 L** | **BOŞ SAYFA** (kaynak yerleşimi; OCR 0 satır = doğru sonuç) | **DONE** (batch 20) · sayfa eşleme teyidi: s.154 boş, Si bloğu s.155'te (sağ sayfa) başlıyor |
| **155** | **p85 R** | **0. Sosyal İçedönüklük (Si) Alt Testi** girişi + Graham yüksek puan **1-20** + düşük puan 1 | **DONE** (batch 20) · listeler kodda YOK → CONFLICT-026 |
| **156** | **p86 L** | 🎯 **Tablo 17 — Si anahtarı (Madde Sayısı: 70)** + norm dipnotu (E 26.86 / K 29.88, Savaşır 1981) + Si düşük puan 2-14 + yorum paragrafları | **DONE** (batch 20) · **P0 BİREBİR MATCH** (34+36) · 500 dpi bindirmeli kadraj (`b20_t17_L/R`) · **PHASE 5 kaynak tarafı KAPANDI** |
| **157** | **p86 R** | **Si T bantları** (`70+` · `60-69` · `45-59` · `25-44`) + s.156'dan süzülen giriş paragrafı + **"Si alt testinin diğer alt testlerle ilişkisi:" 9 Bakınız çifti** + **`049 Kodu`** + **`027(8) Kodu`** | **DONE** (batch 21) · bantlar **3/4 birebir**; `70+` bandında **2 cümle eksik** (nevrotik üçlü + 2/7/8 atfı) · **`049`/`027(8)` gövdeleri YOK** → CONFLICT-024 +2, **030 somut vaka** (`'049'`→`40/04`, `'027(8)'`→`20/02`), **031 +2**, 025 +5, 027 → 45, 033 → 9 · **9/9 Bakınız hedefi VAR ve etiket birebir** (uyumlu) · `INVENTORY-DOUBLE-COUNT` (envanter 20 saydı, gerçek 11) |
| **158** | **p87 L** | — | **DONE** (batch 21) · **BOŞ SAYFA** (OCR 1 satır, koyu piksel **%0.62** vs dolu sayfa %4.36) → **BÖLÜM 5 s.157'DE BİTER** (`BLANK-PAGE` 2. ölçüm) |
| **—** | — | **BÖLÜM 5 (kitap s.63-157) KAYNAK TARAMASI** | ✅ **TAMAMLANDI** (batch 21) → kapsam **148 başlık / 103 VAR / 47 YOK**; DECISION-029 adayı için kanıt seti kapandı · **CHANGE-014 sonrası: 106 VAR / 44 YOK** (DECISION-029 (A) onaylandı ve uygulandı) |
| **159** | **p87 R** | **BÖLÜM 6 girişi** (künye + bağlam paragrafları) + **“Kod tipini belirleme”** alt başlığı | **DONE** (150 dpi tam sayfa görsel) · demografik direktif (yaş·cinsiyet·eğitim·medenî durum·meslek) · “zekâ düzeyleri 80’in üzerinde… eğitim düzeyi ortaokul” · Hs ve D yaşla yükselir · **K↑ = “anlaşılması zor”un açıklaması** · yatan/ayaktan bilgisi → **CONFLICT-034 kanıtı tamamlandı** |
| **160-169** | **p88 L – p92 R** | **BÖLÜM 6 örüntü listesi #1-#10** (Şekil 23-32) + Olgu anlatıları + Butcher (1984) notu | **DONE** (batch 22) · #3 `Pd Yükselliği` **birebir** (`SINGLE_PD`) · #1 `Konversiyon V` (70/10 ↔ kod 65/5) ve #2 `Paranoid V` (80/70 ↔ kod 70) **EŞİK SAPMASI** · #4-#10 **YOK** → **CONFLICT-041 (yeni, P1)** + **042 (uyarı direktifleri)** · uyarılar: “kod tipi verilemez” (s.167), “tanı konulması doğru değildir” (s.166), “en düşük alt testlere bakılmalı” (s.168) |
| **170** | **p93 L** | — |  **BOŞ SAYFA** (koyu piksel **%0.24**, OCR **0 satır**) → **BÖLÜM 6 s.159-169**; s.171 = **p93 R** = **BÖLÜM 7** girişi (“MMPI’INDAN GELİŞTİRİLEN DİĞER TESTLER”, PHASE 8 kapsamı, bitti) |
| 171-177 | p93 R – p96 R | Bölüm 7: Kişilik bozuklukları, intihar davranışı, alkol ölçekleri | NOT_STARTED |
| 178-179 | p97 L – p97 R | **Wiggins içerik skalaları** — tanımlar + **Tablo 20 (normlar)** | **DONE** (deskew görsel; normlar 26/26) |
| 180-181 | p98 L – p98 R | Wiggins madde sayıları (FAM 16 · HOS 27 · PHO 27) + Türkçe uyarlama (Akça & Ceyhun 1994) | **DONE** (görsel) |
| 182-188 | p98 R – p102 L | Aşırı Kontrol-Hostilite, Ego gücü, Welsh A/R, Üstünlük, Bağımlılık | NOT_STARTED |
| 189-190 | p102 R – p103 L | Bölüm 8: Türkiye uyarlanması, tarihçe | NOT_STARTED |
| 191-194 | p103 R – p105 L | Standardizasyon çalışması: örneklem, yöntem, demografi (N=1003 E / 663 K) | **DONE** |
| **195** | **p105 R** | **Tablo 30 — NORMAL TÜRK NORMLARI** ← **norm kaynağı** | **DONE** (görsel; OCR boş döndü) |
| 196-200 | p106 L – p108 L | Türk toplumu için geçerlik çalışması | NOT_STARTED |
| 201-208 | p108 R – p112 L | Bölüm 9: Türkiye'de kullanıldığı araştırma ve yayınlar | NOT_STARTED |
| 209-214 | p112 R – p115 L | Bölüm 10: Kaynaklar (künye listesi) | NOT_STARTED |
| 215-233 | p115 R – p124 R | **Ek 1: MMPI test kitabı (566 madde metni)** | **DONE** (yapı; madde 1-566 kesintisiz) · kritik madde metinleri görsel doğrulandı (39 kayıt) → **CONFLICT-023** (14 etiket uyuşmuyor) |
| 234-235 | p124 R – p125 R | Ek 2-3: Kitap / bilgisayar formu cevap kağıdı | NOT_STARTED |
| 236-239 | p125 R – p127 L | Ek 4-6: Kart formu işaretleme, profil örnekleri (E/K) | NOT_STARTED |
| 240-243 | p127 R – p129 L | Ek 7-8: Madde değişim tabloları (kart↔kitap formu) | NOT_STARTED |
| 244-247 | p130 L – p131 R | **Ek 9a: MMPI madde numaraları ve puanlama yönü** ← PHASE 2 | **DONE** (görsel doğrulandı) |
| 248-250 | p132 L – p133 L | Ek 9b: Kişilik bozuklukları testi maddeleri | **DONE** (11 ölçek; 2'si görsel) |
| 251-256 | p133 R – p136 L | Ek 9c: Alkol, Wiggins, OH, Es, A, R, Do, Dy maddeleri | **DONE** (21 ölçek; 4'ü görsel) |
| 257-260 | p136 R – p138 L | **Ek 10: Ayrıntılı tanılara göre ortalama ve SD (Tablo 35-38)** ← PHASE 6 | **NEEDS_REVIEW** (OCR alındı, tablo yapısı çözülemedi) |
| — | p138 R, p139 | Kapak / arka sayfa | DONE |

## Durum kodları

`NOT_STARTED` · `IN_PROGRESS` · `DONE` · `NEEDS_REVIEW` · `BLOCKED`

## Bağımlılık notu

Projenin `src/scoring/mmpiSource.ts` içindeki yorum bantları yorum satırlarında
**"klinik yorum rehberi s.X"** kaynağına atıf yapar; `mmpiKeys.ts` ise normlar
için **Savaşır (1981)** der. Bu kitap (Ceyhun & Oral 2003) Savaşır 1981
değerlerini Tablo 3/4/5 dipnotlarında **doğrudan** vermektedir. Bu nedenle
`SOURCE_FACTS.md` içindeki norm değerleri birincil kanıttır.
`src/scoring/mmpiSource.ts` içindeki yorum metinleri ise bu kitaptan çevrilmiş
gibi görünmekle birlikte **sayfa numaraları bu kitaba değil** başka bir
rehbere ("klinik yorum rehberi") işaret etmektedir → bkz. `UNVERIFIED_DATA.md`.

---

## Norm kaynağı — kesin referans (Oturum 4)

**`TURKISH_NORMS`'un kaynağı: Tablo 30, kitap s.195 (PDF p105 R).**

> Bölüm 8 standardizasyon (s.191-194) + Tablo 30 (s.195), birlikte norm künyesini
> oluşturur. Ek 10 (s.257-260) norm kaynağı **değildir** (`DECISION-016`).

Metinde geçen diğer tablolar (norm olmayan): Tablo 23-29 demografi (s.192-194),
Tablo 35-38 tanı grupları = Ek 10 (s.257-260).
