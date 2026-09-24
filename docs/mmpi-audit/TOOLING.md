# Tooling — OCR ve sayfa görüntüsü araç zinciri

Denetim tamamen yeniden üretilebilir olmalıdır: `.audit/` klasörü silinse bile
aşağıdaki komutlarla aynı çıktı geri üretilebilir.

## Kurulum (sandbox'ta doğrulandı)

```bash
# node tarafı
npm install

# python tarafı (apt deposu sandbox'ta erişilemez: tesseract kurulamaz)
pip3 install --break-system-packages pymupdf rapidocr-onnxruntime opencv-python-headless
```

`opencv-python-headless` şart: `rapidocr-onnxruntime` normalde
`opencv-python` çeker ve bu paket headless olmayan libGL gerektirir
(`ImportError: libGL.so.1`). Headless sürüm sorunu çözer.

Kurulu sürümler (2026-09-21): PyMuPDF 1.28.2, Python 3.11.

## Kullanım

```bash
# görsel çıkarma (tablo doğrulaması için)
python3 scripts/mmpi-audit/extract.py render --pages 25 --half left --dpi 300

# OCR (yalnızca istenen aralık; DONE sayfalar atlanır)
python3 scripts/mmpi-audit/extract.py ocr --pages 26-29 --dpi 200

# yeniden OCR zorlamak (yalnızca NEEDS_REVIEW için)
python3 scripts/mmpi-audit/extract.py ocr --pages 26 --force
```

## Çıktılar (git'e girmez)

```
.audit/pages/pNNN_L.png / pNNN_R.png     sayfa yarımları
.audit/pages/v_*.png, tbl_*.png          doğrulama kırpmaları
.audit/ocr/pNNN_L.txt / pNNN_R.txt       OCR metni (<LOWCONF> işaretli)
```

`.gitignore` içinde `.audit/` kayıtlıdır (telif + boyut).

## Bilinen kısıtlar

| Kısıt | Etki | Önlem |
|---|---|---|
| Türkçe OCR modeli yok | aksan/birleşik kelime hataları | sayısal veride görsel doğrulama |
| Tesseract kurulamıyor | ikinci OCR motoru yok | iki bağımsız **kırpma** ile çapraz okuma |
| Merkez dikişi | tablo sütunu kaybı | bindirme paylı kırpma (DECISION-003) |
| OCR hızı ~5.5 sn/yarım sayfa | uzun PDF'te maliyet | yalnızca sıradaki batch işlenir |

## Puanlama / test komutları

```bash
npm run typecheck    # tsc --noEmit
npm test             # 287 test (baseline)
npm run build        # tsc --noEmit && node scripts/build.mjs
```

Bir scoring değişikliğinden sonra üçü de çalıştırılır ve sonuç
`TEST_AUDIT.md` + `CODE_CHANGES.md` içine yazılır.
