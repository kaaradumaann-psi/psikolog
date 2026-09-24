# MMPI Kaynak Denetimi — Kalıcı Mühendislik Hafızası

Bu klasör, MMPI puanlama/yorum sisteminin **kaynak kitaba karşı denetiminin**
kalıcı hafızasıdır. Amaç tek seferde her şeyi bitirmek değil; denetimin
**nerede kaldığını kaybetmemek** ve her bulgunun izini kaynak sayfasına kadar
sürebilmektir.

## Kaynak künyesi (doğrulandı)

| Alan | Değer |
|---|---|
| Dosya | `docs/sources/mmpi-kitap.pdf` |
| Kitap | Minnesota Çok Yönlü Kişilik Envanteri — **Değerlendirme Kitabı** |
| Baskı | 2. Baskı, Ankara 2003 |
| Yazarlar | Prof. Dr. Birsen CEYHUN, Uz. Psk. Nursen ORAL |
| Ölçek sürümü | **MMPI (orijinal / MMPI-1), 566 maddelik kitap formu** |
| PDF sayfa sayısı | 139 (görüntü-tabanlı tarama; gömülü metin yok) |
| Tarama düzeni | Yatay; **her PDF sayfası iki kitap sayfası** içerir (sol/sağ) |

> **SÜRÜM NOTU:** Kaynak MMPI-1 (566 madde) Türkçe değerlendirme kitabıdır.
> MMPI-2 / MMPI-2-RF madde, norm, ölçek veya yorum bilgisi bu kaynaktan
> **devralınamaz**. Proje de MMPI-566 kullandığı için sürüm uyumludur
> (bkz. `SOURCE_FACTS.md` → `SOURCE-VERSION-001`).

## Sayfa eşleme formülü (kritik altyapı)

Taramada kitap sayfası numarası ile PDF sayfası farklıdır:

```
leaf        = kitap_sayfası + 15
PDF sayfası = ceil(leaf / 2)          # tarama sayfası
yarı        = "R" (sağ)  eğer leaf çift,  "L" (sol) eğer leaf tek
```

Doğrulanmış örnekler: kitap s.1 = PDF p8 R · kitap s.29 = PDF p22 R ·
kitap s.244 (Ek 9 madde anahtarları) = PDF p130 L · kitap s.257 = PDF p136 R.

Ayrıntılı harita: `SOURCE_INDEX.md`.

## Çalışma protokolü (her oturumda)

**Başlangıç:**
1. `AUDIT_STATE.md` oku → nerede kalındı?
2. `CHANGELOG.md`, `SOURCE_INDEX.md`, `CONFLICTS.md`, `VERIFIED_DATA.md`,
   `UNVERIFIED_DATA.md`, `DECISIONS.md` kontrol et.
3. Yalnızca sıradaki batch'i işle. `DONE` sayfaları yeniden OCR etme.
4. Kod değişikliği **yapma**; önce `SOURCE_FACT → CONFLICT → DECISION` zinciri.

**Bitiş:**
1. Son işlenen sayfayı `AUDIT_STATE.md`'ye yaz.
2. Yeni `SOURCE_FACT`, `CONFLICT`, `DECISION`, `CODE_CHANGE`, test sonucu kaydet.
3. `CHANGELOG.md` güncelle, sonraki eylemi belirt.

**Kesinti olursa:** önce `AUDIT_STATE.md` güncellenir (`Status: INTERRUPTED`),
bir sonraki oturum oradan devam eder — baştan başlamaz.

## Araçlar

OCR/görsel çıkarma aracı: `scripts/mmpi-audit/extract.py` (açıklamalar dosya başında).

```bash
python3 scripts/mmpi-audit/extract.py render --pages 22-29 --dpi 300   # görsel
python3 scripts/mmpi-audit/extract.py ocr    --pages 22-29 --dpi 200   # OCR
```

Çıktılar `.audit/` altına yazılır ve **git'e girmez** (telif + boyut).
`.audit/` silinirse denetim kaybolmaz: kalıcı bilgi bu klasördeki dosyalardadır.

Gereksinimler: `pip install --break-system-packages pymupdf rapidocr-onnxruntime opencv-python-headless`

## İşlem paketi boyutu

| İçerik | Sayfa/batch |
|---|---|
| Düz metin | 8-10 |
| Tablo / yoğun görsel | 1-3 |
| Çok basit metin | 10-15 |

## Dosya haritası

| Dosya | İşlev |
|---|---|
| `AUDIT_STATE.md` | **En önemli.** Nerede kaldığımız, sıradaki eylem |
| `SOURCE_INDEX.md` | Kaynak haritası: bölüm → PDF sayfa aralığı → durum |
| `SOURCE_FACTS.md` | Kaynaktan doğrulanan bilimsel bilgiler (ID'li) |
| `CONFLICTS.md` | Kaynak ↔ kod farkları |
| `VERIFIED_DATA.md` | Hızlı referans: doğrulanmış değerler |
| `UNVERIFIED_DATA.md` | Doğrulanamayan / OCR-belirsiz veriler |
| `DECISIONS.md` | Alınan teknik kararlar (tekrar tartışılmaz) |
| `CODE_CHANGES.md` | Kod değişiklikleri + test sonuçları |
| `INTERPRETATION_AUDIT.md` | Yorum katmanı denetimi |
| `AI_AUDIT.md` | AI yorum katmanı denetimi |
| `TEST_AUDIT.md` | Test/regresyon sonuçları |
| `OCR_ISSUES.md` | OCR belirsizlik kaydı |
| `CHANGELOG.md` | Kronolojik işlem kaydı |
| `TOOLING.md` | Araç kurulumu ve yeniden üretim komutları |
