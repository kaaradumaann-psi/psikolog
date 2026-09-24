# Kaynak dosyaları

Bu klasör, puanlama ve yorum katmanının dayandığı kaynak PDF’lerini tutar.
Dosya adları kasıtlı olarak kısa ve makine-güvenlidir: boşluk, parantez ve
Türkçe karakter yoktur, böylece betikler ve kabuk tırnak hatasına düşmez.

| Güncel yol | Eski ad | Rol |
|---|---|---|
| `docs/sources/mmpi-kitap.pdf` | `docs/MMPI Kitap (1) (1).pdf` | Ceyhun & Oral, Değerlendirme Kitabı, 2. Baskı, Ankara 2003. Görüntü taraması, 139 sayfa. `scripts/mmpi-audit/state.mjs` bu yolu varlık kontrolü olarak okur. |
| `docs/sources/mmpi-kaynak-2.pdf` | `docs/yeni/mmpiKaynak2 (AsılKaynak) without ocr.pdf` | Aynı kitap kopyasının görüntü-tabanlı ikizi. `mmpi-kitap.pdf` ile bayt bayt aynıdır. |
| `docs/sources/mmpi-kaynak-2-ocr.pdf` | `docs/yeni/mmpiKaynak2 (AsılKaynak) with ocr.pdf` | Aynı kitabın aranabilir OCR katmanlı kopyası. Klinik dosya yorumlarının görsel teyit kaynağı (`src/scoring/mmpiScaleDossiers.ts`). |
| `docs/sources/mmpi-kaynak-1.pdf` | `docs/yeni/mmpiKaynak1 (ÇokDikkateAlma).pdf` | İkincil bant özeti. Ağır kaynak olarak kullanılmaz. |
| `docs/sources/rapor-sablonu-1.pdf` | `docs/Rapor Şablonu 1.pdf` | Rapor düzeni referansı. Çalışma zamanı bu dosyayı gömmez; şablon motoru kendi düzenini üretir. |

Eski adlar yalnızca tarihsel denetim cümlelerinde, o günkü gözlemi korumak için
geçer. Yeni atıf her zaman bu tablodaki güncel yolu kullanır.
