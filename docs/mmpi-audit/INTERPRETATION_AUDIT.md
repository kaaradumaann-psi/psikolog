# Interpretation Audit (PHASE 10)

Yorum katmanı denetimi. **Scoring düzeltilmeden yorum katmanı düzeltilmez**
(görev talimatı §38). Bu nedenle bu dosya şu an çoğunlukla keşif/kayıt içerir.

---

## Denetlenen modüller

| Modül | İşlev | Durum |
|---|---|---|
| `src/scoring/mmpiInterpretation.ts` | Klinik ölçek yorumu, profil örüntüleri ve desen göstergeleri | ✅ **DONE** — CHANGE-014 (profil bağlamlı kod + 12 koşul), CHANGE-015 (Bölüm 6 18 örüntü kaydı, eşikler, kaynak çekinceleri), CHANGE-016 (kalan 4 desen kartında kaynak atfı); kanıt: `cmp-b6-batch23/24.ts` → 0 FARK |
| `src/scoring/mmpiSource.ts` | Kaynak tabanlı bant metinleri | ✅ **DONE** — `? L F K` + `Hs · D · Hy · Pd · Mf · Pa · Pt · Sc · Ma · Si` 10 klinik alt test bantları görsel doğrulamalı karşılaştırıldı (Tablo 8-17 + T bantları tamamı; Ma/Si batch 20-21'de kapandı) |
| `src/scoring/mmpiValidityConfigs.ts` | L/F/K konfigürasyon örüntüleri | **DONE (kaynak karşılaştırması)** — 15/15 konfigürasyon metin + şekil olarak okundu (PHASE 4); **CHANGE-008/009/010** ile 5 eşik kaynağa çekildi; CONFLICT-016/018/019/020 karara bağlandı |
| `src/scoring/mmpiCritical.ts` | Kritik maddeler + klinik izlenimler | **DONE (etiket denetimi)** — Ek 1 (s.215-233) 39 kritik madde kaydı görsel okundu; 14 etiket uyuşmazlığı **CONFLICT-023 → FIXED (CHANGE-011)**; kaynakta kritik madde **listesi yok** (SOURCE-ITEM-002) |
| `src/scoring/mmpiConsistency.ts` | TR endeksi, dikkatsizlik, F-K | **DONE (kaynak karşılaştırması)** — Tablo 6 (16/16) · Tablo 7 (12/12) · TR kesme puanı **CHANGE-007** · dikkatsizlik kesmesi 4 (Greene 1980) doğrulandı · F-K bantları MATCH; `UNVERIFIED-FK-001` (−8) ve `MISSING-KPLUS-001` açık |

---

## Bugüne kadar bulunan yapısal bulgular

### FINDING-I-001 — Künye sayfa numaraları bu kitapla uyuşmuyor

`mmpiSource.ts` başlığı der ki: "tüm kesme noktaları, aralıklar ve yorum
metinleri depodaki **klinik yorum rehberi** raporundan alınmıştır."
Yorum satırları `s.1-3`, `s.3-47`, `s.48-52` gibi sayfa numaraları verir.

Sorun:
Bu kitapta L bantları s.33, F bantları s.37, K bantları s.40'tadır. Yani
atıf yapılan "klinik yorum rehberi" **bu kitap değildir** ve depoda yoktur.

Etki:
- Yorum **içerikleri** bu kitapla yüksek oranda örtüşüyor (çeviri/aynı gelenek),
  ama bant **sınırlarında** farklar var (CONFLICT-003, CONFLICT-004).
- Kullanıcıya/yapay zekâya "kaynak: klinik yorum rehberi s.X" demek
  doğrulanabilir bir kaynak izi değildir.

Status: OPEN → PHASE 10/13

### FINDING-I-002 — Geçerlik konfigürasyonları bu kitabın Bölüm 4'ünde

`mmpiValidityConfigs.ts` içindeki 13 konfigürasyonun (V, tersine V, tümü
doğru/yanlış, rastgele, yardım isteği …) kaynağı **kitap Bölüm 4**
(kitap s.43-62, PDF p29 R-p39 L) olmalıdır.

**Kanıt (2026-09-21):** kitap s.43 okundu →
"Konfigürasyon 1: L ve K alt testlerinin T değerinin 50-60 ve F alt testinin T
değerinin 70'in üzerinde olduğu durumlar" + "Şekil 1. **Tersine V**."
Kodun `VALIDITY_CONFIGS[0]` (id `reverse-v`) kuralı birebir aynıdır:
`L 50-60 ∧ K 50-60 ∧ F > 70` ✅ **MATCH**.

Ayrıca kaynak şunu söyler: "**(?)** alt testi standart profil kağıdına işaret
edilmez." → kodda `?` ölçeğinin geçerlik konfigürasyonuna girmemesi doğrudur ✅

Kalan iş: **YOK — PHASE 4 kapandı (kitap s.43-62).** 15/15 konfigürasyonun adı,
sırası ve T eşikleri Bölüm 4'te karşılaştırıldı; bulunamayan örüntü çıkmadı
(`all-true` F>120 kırpma sorunu **CONFLICT-019 → CHANGE-009** ile çözüldü;
`credible` K≤65 sınırı kaynakta olmadığı için **CHANGE-010** ile kaldırıldı).

Status: **DONE** (PHASE 4, DECISION-018/020/022/023)

### FINDING-I-003 — K düzeltmesinin kullanımı kaynakta eleştirel

Kaynak (s.39) K eklemeli profillerin uygunluğunun yeterince
araştırılmadığını açıkça yazar; ayrıca yüksek K durumunda (ham 16-20, 21+)
**"K ile düzeltilmemiş profilleri kullanmalıdır"** der (`K_RAW_BANDS` metni
kodda zaten bu uyarıyı taşıyor ✅).

Denetim sorusu (PHASE 4):
Kod K düzeltmesini koşulsuz uyguluyor mu, yoksa yüksek K durumunda
düzeltilmemiş profili de raporluyor mu? — `mmpiScoring.ts` içinde hem
`rawScore` hem `kCorrectedRaw` tutulduğu görülüyor; rapor/UI tarafı kontrol
edilecek.

Status: OPEN → PHASE 4/13

---

## Sonraki eylem

1. ~~PHASE 4 madde-madde karşılaştırması~~ ✅ **tamamlandı** (bkz. yukarıda FINDING-I-002).
2. ~~PHASE 10: klinik ölçek bant metinleri `Ma (9)` ve `Si (0)` ile tamamlanır; ardından Bölüm 6 yorumlama (s.159-170)~~ ✅ **tamamlandı** (batch 20-24; Bölüm 6 10 desen, eşikler, 6 yeni desen + negatif eğim, kaynak çekinceleri ve 4 desen kartı atfı koda alındı → CHANGE-015 ve CHANGE-016).
3. Kaynak izi (source trace) alanları FINAL raporuna taşınır; FINDING-I-001
   (`klinik yorum rehberi` künye uyuşmazlığı) FINAL'da kapanır — kod künyeleri
   artık bu kitaba (Ceyhun & Oral 2003) sayfa numarasıyla atıf verebilir,
   çünkü bantlar bu kitapta görsel doğrulandı. `docs/kaynak-denetimi.md`
   atıf sorununa ek olarak `docs/mmpi-audit/` bu izi taşır (CONFLICT-007 OPEN).
4. Sıradaki fazlar: **PHASE 11 (AI Interpretation)** ve açık karar kapıları
   (**DECISION-032** cry-for-help F bandı, **DECISION-031** Bölüm 5 içerik göçü).
