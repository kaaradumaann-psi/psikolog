# MMPI Kaynak Denetimi ve Künye–Bileşen Eşleştirme Raporu

**Tarih:** Eylül 2026  
**Standart:** MMPI-1 Türkiye Standardizasyonu (566 Madde)  
**Temel Kaynak:** Ceyhun, A. A., & Oral, G. (2003). *MMPI Profillerini Yorumlama El Kitabı*. Ankara: Çizgi Tıp Yayınevi. ISBN 975-8490-33-0.  
**Norm Kaynağı:** Savaşır, I. (1981). *Minnesota Çok Yönlü Kişilik Envanteri El Kitabı (Türk Standardizasyonu)*. Ankara: Sevinç Matbaası.  
**Ayrıntılı Denetim Belgeleri:** `docs/mmpi-audit/` (AUDIT_STATE, SOURCE_FACTS, CONFLICTS, DECISIONS, CODE_CHANGES, TEST_AUDIT, AI_AUDIT, STATE_METRICS, PROTOCOL)

---

## 1. Amaç ve Kapsam

Bu belge, MMPI-566 puanlama ve yorumlama motorunda kullanılan tüm algoritmik, istatistiksel ve klinik bileşenlerin bilimsel kaynak karşılıklarını, doğrulama durumlarını ve dürüstlük kaydını sunar.

Sistemde hiçbir klinik veri, puanlama katsayısı, kesme noktası veya tanı uydurulmamış; her bileşen basılı el kitabının sayfaları taranarak (300-500 dpi görsel denetim ve OCR) doğrulanmıştır.

---

## 2. Künye–Bileşen Eşleştirme Tablosu

| # | Bileşen | Kod Dosyası | Kaynak Künyesi / Kitap Bölümü | Durum |
|---|---|---|---|---|
| 1 | **Geçerlik Ölçekleri (?, L, F, K) Puanlama Anahtarları** | `src/scoring/mmpiKeys.ts` | Ceyhun & Oral (2003), Ek 9a (s.244-245); Hathaway & McKinley (1942) | ✅ DOĞRULANDI (P0 MATCH) |
| 2 | **10 Temel Klinik Ölçek Puanlama Anahtarları** (Hs, D, Hy, Pd, Mf, Pa, Pt, Sc, Ma, Si) | `src/scoring/mmpiKeys.ts` | Ceyhun & Oral (2003), Tablo 8–17 (s.63-158) & Ek 9a | ✅ DOĞRULANDI (P0 MATCH) |
| 3 | **Türk Yetişkin Normları (Tablo 30)** (M, SD, K-düzeltme oranları) | `src/scoring/mmpiKeys.ts` (`TURKISH_NORMS`) | Savaşır (1981); Ceyhun & Oral (2003), Tablo 30 (kitap s.195 / PDF p105 R); Bölüm 8 (s.191-195) | ✅ DOĞRULANDI (26/26 MATCH) |
| 4 | **Geçerlik Ölçekleri Ham ve T Bant Yorumları** (?, L, F, K) | `src/scoring/mmpiSource.ts` | Ceyhun & Oral (2003), Bölüm 3 (s.29-42) | ✅ DOĞRULANDI |
| 5 | **Geçerlik Konfigürasyonları (Şekil 1–15 / Şekil 8–22)** (V-profili, Ters-V, vb.) | `src/scoring/mmpiValidityConfigs.ts` | Ceyhun & Oral (2003), Bölüm 4 (s.43-62) | ✅ DOĞRULANDI |
| 6 | **Klinik Ölçek T-Bant Yorumları (Bölüm 5)** | `src/scoring/mmpiSource.ts` | Ceyhun & Oral (2003), Bölüm 5 (s.63-158) | ✅ DOĞRULANDI |
| 7 | **İki Noktalı ve Üç Noktalı Kod Tipleri (Bölüm 5)** (Hs, D, Hy, Pd, Pa, Pt, Sc, Ma, Si blokları) | `src/scoring/mmpiSourceCodes.ts` | Ceyhun & Oral (2003), Bölüm 5 (s.63-158); 151 blok kodu ve koşulları | ✅ DOĞRULANDI (CHANGE-018..026) |
| 8 | **Profil Örüntüleri ve Konfigürasyonları (Bölüm 6)** (Şekil 23–32) | `src/scoring/mmpiInterpretation.ts` | Ceyhun & Oral (2003), Bölüm 6 (s.159-170) | ✅ DOĞRULANDI (CHANGE-015..016) |
| 9 | **Türetilmiş ve Özel Ölçekler** (Ego Gücü, MacAndrew Alkolizm, O-H, Do, Dy, Welsh A/R) | `src/scoring/mmpiDerived.ts` | Ceyhun & Oral (2003), Bölüm 7 (s.171-188) & Ek 9c | ✅ DOĞRULANDI |
| 10 | **Wiggins İçerik Ölçekleri ve Normları** | `src/scoring/mmpiDerived.ts` (`WIGGINS_NORMS`) | Ceyhun & Oral (2003), Tablo 20 (s.183); Wiggins (1966) | ✅ DOĞRULANDI (26/26 MATCH) |
| 11 | **Kritik Maddeler Listesi (39 Madde)** | `src/scoring/mmpiCritical.ts` | Ceyhun & Oral (2003), Ek 1 (kitap s.215-233 / PDF p115 R – p124 R, madde metinleri); Koss & Butcher (1973) | ✅ DOĞRULANDI (CHANGE-011) |
| 12 | **TR ve Dikkatsizlik Endeksleri** | `src/scoring/mmpiConsistency.ts` | Greene (1979, 1980); Gravitz & Gerton (1976); Ceyhun & Oral (2003), Tablo 6-7 (s.60-62) | ✅ DOĞRULANDI |
| 13 | **F–K Ayrım Endeksi** | `src/scoring/mmpiConsistency.ts` | Gough (1947, 1950); Ceyhun & Oral (2003), Bölüm 4 (s.58-59) | ✅ DOĞRULANDI |
| 14 | **Yapay Zekâ Yorumlama Katmanı** | `src/ai/aiInterpretation.ts` | Sağlık Bakanlığı §39 Klinik Karar Destek Güvenlik İlkeleri & KVKK m.4/3-d | ✅ DOĞRULANDI (PHASE 11) |

---

## 3. Doğrulanamayan veya Yerel Kalan Kesimlerin Dürüstlük Kaydı

Aşağıdaki unsurlar literatürde farklı araştırmacılar tarafından farklı şekillerde tanımlanmış olup kod içindeki durumları şeffaflıkla belirtilmiştir:

1. **Welsh A/R Sabitleri:** Welsh Anksiyete (A) ve Represyon (R) T-dönüşüm sabitleri ($M=15, SD=8$ ve $M=16, SD=5$) klasik klinik yazılım geleneğine dayanır; Türkçe norm standardizasyonunda resmi ayrı bir norm tablosu yayınlanmamıştır.
2. **K = 15 Prognoz Notu (Ries 1966):** Ries (1966) makalesinde K ölçeğinin tedavi yanıtı korelasyonu yer alır; ham kesme puanı klinik uygulama notu olarak değerlendirilir.
3. **Profil Kodu Hesabında Mf ve Si Ayrımı:** İki noktalı profil kodunda Mf (5) ve Si (0) ölçeklerinin en yüksek iki klinik ölçek seçiminde atlanması, klasik MMPI literatürünün (Dahlstrom 1972; Graham 1987; Ceyhun & Oral 2003) yaygın klinik konvansiyonudur.

---

## 4. Denetim İzi ve Metodoloji

Tüm denetim adımları `docs/mmpi-audit/` dizininde 15 fazlık yapılandırılmış denetim protokolü ile belgelenmiştir:
- `AUDIT_STATE.md`: Güncel denetim durumu ve faz haritası.
- `PROTOCOL.md`: PHASE 15 durum tutarlılığı ve denetim kuralları protokolü.
- `STATE_METRICS.md`: Koddan ve dosyalardan otomatik üretilen güncel sayaçlar.
- `status.json`: Makine tarafından okunabilir consolidated audit durumu.
- `SOURCE_FACTS.md`: Kitaptan görsel olarak okunan ve doğrulanmış tüm olgular.
- `CONFLICTS.md`: Tespit edilen farklar, çözümler ve kapanış gerekçeleri.
- `DECISIONS.md`: Mimari ve klinik kararlar (DECISION-001'den DECISION-032'ye).
- `CODE_CHANGES.md`: Yapılan tüm kod değişikliklerinin tarihçesi (CHANGE-001'den CHANGE-026'ya).
- `TEST_AUDIT.md`: 503+ adet birim ve entegrasyon testinin doğrulama dökümü.
- `AI_AUDIT.md`: KVKK ve §39 klinik karar destek uyumluluk denetimi.
