# MMPI Audit Protokolü ve Durum Tutarlılığı İlkeleri

**Sürüm:** 1.0 (PHASE 15 — Audit State Konsolidasyonu)  
**Tarih:** Eylül 2026  
**Kapsam:** MMPI-566 Değerlendirme Sistemi Bilimsel ve Mühendislik Denetim Protokolü

---

## 1. Amaç ve Kapsam

Bu protokol, MMPI-566 puanlama ve yorumlama motorunun bilimsel kaynak denetimi sürecinde üretilen tüm ölçüm, sayaç, karar ve bulguların tek, doğrulanabilir ve otomatik olarak üretilebilir bir standartta yönetilmesini sağlar.

Audit süreci, yalnızca manuel olarak yazılmış doküman notlarına güvenmek yerine, doğrudan çalışan koddan ve dosya sisteminden ölçülen duruma dayanır.

---

## 2. Temel İlkeler ve Kurallar

### İlke 1: Otomatik Durum Ölçümü (Tek Gerçek Kaynağı)
Audit sayaçları (test sayıları, kanonik kodlar, blok kodları, takma adlar, çelişki başlıkları, karar ID'leri) mümkün olduğunca elle yazılmak yerine `scripts/mmpi-audit/state.mjs` aracı vasıtasıyla doğrudan repository dosyalarından ve test koşularından otomatik olarak ölçülür.

### İlke 2: Eski Sayaçların Durum Kaynağı Olmaması
Eski audit belgelerinde (örn. önceki fazlarda kaydedilmiş geçici sayaçlar) yer alan sayılar güncel durum kaynağı (source of truth) kabul edilemez. Güncel sistem durumu yalnızca `docs/mmpi-audit/status.json` ve `docs/mmpi-audit/STATE_METRICS.md` üzerinden okunur.

### İlke 3: Tarihsel Kayıtların Korunması
Tarihsel audit notları (örneğin "At checkpoint X: 375 tests", "PHASE 9 öncesi 106/150 kod") geçmişin denetim izi ve mühendislik hafızası olarak korunmalıdır. Tutarlılık sağlamak adına tarihsel kayıtlar körü körüne silinmez veya geçmiş revizyonlar yok edilmez.

### İlke 4: Tarihsel Eksik Sayıları ve Güncel Durum Ayrımı
Tarihsel `44 missing` (Bölüm 5 kod göçü öncesindeki eksik kodlar) bilgisi geçmiş bir ara aşama tespitidir. BÖLÜM 5 kod göçü tamamlandıktan sonra (CHANGE-018..026) bu sayı güncel eksik sayısı olarak gösterilemez; güncel durum 151 blok kodunun tamamının tanımlı ve doğrulanmış olduğunu yansıtır.

### İlke 5: Duplicate ID'lerin Sessizce Birleştirilmemesi
`DECISIONS.md` içerisindeki mükerrer `DECISION-028` (veya `CONFLICTS.md` içerisindeki `CONFLICT-016`, `CONFLICT-027` vb. çoklu başlıklar) durumu, PHASE 15 kapsamında otomatik olarak veya sessizce yeniden adlandırılıp birleştirilemez. Bunlar mimari karar kapıları (Decision Gates) olarak açıkça izlenir.

### İlke 6: ID Tekilliğinin Ayrı Bir Kalite Metriği Olması
Conflict ve Decision kayıtlarının ID tekilliği bağımsız bir dokümantasyon kalite metriğidir. Mükerrer ID'lerin varlığı testler tarafından tespit edilir ve raporlanır; tekilleştirme işlemi ancak klinik ve mimari onay alındıktan sonra PHASE 16/17 karar kapılarında gerçekleştirilebilir.

### İlke 7: Klinik Kararların Değişmezliği (Scope Boundary)
PHASE 15 bir state konsolidasyonu fazıdır. Bu fazda klinik puanlama, ham-K-T dönüşümleri, norm tabloları, geçerlik kuralları, konfigürasyon eşikleri veya kod yorumları kesinlikle değiştirilmez (`clinicalLogicChanged: false`).

### İlke 8: Kaynak Sayfa Referanslarının `SOURCE_INDEX.md` ile Uyumu
Tüm audit dokümanlarındaki ve sistem künyelerindeki sayfa referansları, birincil kaynak olan Ceyhun & Oral (2003) el kitabının `SOURCE_INDEX.md` dosyasındaki doğrulanmış yaprak/sayfa formülüyle (`leaf = kitap_sayfası + 15`) uyumlu olmalıdır.

### İlke 9: Gerçek Olmayan Kaynak Referanslarının Yasaklanması
Depoda fiziksel karşılığı bulunmayan "klinik yorum rehberi", "s.1-3", "s.48-52" gibi harici/sahte kaynak atıfları gerçek ve bilimsel kaynakmış gibi gösterilemez. Kaynak izi her zaman birincil taranmış esere (Ceyhun & Oral 2003) veya norm araştırmasına (Savaşır 1981) dayanmalıdır.

### İlke 10: PHASE 15 Kapsamının Dokümantasyon ve Durum Tutarlılığı Olması
PHASE 15'in yegane gayesi dokümantasyon ve durum tutarlılığını sağlamak, çelişkileri gidermek, ölçümleri otomatikleştirmek ve CI testleriyle koruma altına almaktır. Yeni klinik hipotez üretimi veya kural icadı bu fazın kapsamı dışındadır.

---

## 3. Çalıştırma ve Doğrulama Prosedürü

1. **State Ölçümü ve Güncelleme:**
   ```bash
   node scripts/mmpi-audit/state.mjs
   ```
2. **Doküman Tutarlılık Testi:**
   ```bash
   npx tsx --test tests/auditDocsConsistency.test.ts
   ```
3. **Tam Regresyon ve CI Doğrulaması:**
   ```bash
   npm test
   npm run typecheck
   npm run build
   ```
