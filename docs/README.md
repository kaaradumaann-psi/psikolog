# Dokümantasyon düzeni

Kök, projenin giriş ve teslim yüzeyi olarak kalır. Açıklama, kaynak ve tarihsel
raporlar bu klasördedir.

| Konum | Ne durur | Neden burada |
|---|---|---|
| `/` | `README.md`, `SYSTEM.md`, `TROUBLESHOOTING.md`, yapılandırma, `index.html`, `optik-form.html`, `MMPI-566-optik-cevap-formu.pdf` | Giriş, derleme sözleşmesi ve izlenen teslim dosyaları. Form PDF’si `src/print/formPdf.ts` tarafından gömülür; indirme adı ve testler bu kök yolu okur. |
| `docs/sources/` | Kaynak kitap ve rapor şablonu PDF’leri | İkili kaynaklar kodun yanında değil, sabit ve makine-güvenli adlarla durur. Eşleme: `docs/sources/README.md`. |
| `docs/mmpi-audit/` | Kaynak kitabına karşı denetimin kalıcı kaydı | Denetim durumu, kararlar ve çelişkiler tek yerde. Canlı kod buradaki yolları `scripts/mmpi-audit/state.mjs` ile doğrular. |
| `docs/reports/` | Tarihsel faz ve değerlendirme raporları | Teslim kökünü şişirmez. Güncel sözleşme `README.md` ve `SYSTEM.md` içindedir. |
| `docs/kaynak-denetimi.md`, `docs/omr-validation-matrix.md` | Yaşayan eşleştirme ve saha matrisi | Kullanıcıya gösterilen kaynak izi ve OMR doğrulama kaydı. |

Yeni bir tarihsel rapor köke değil `docs/reports/` altına yazılır. Yeni bir kaynak
PDF `docs/sources/` altına, boşluk ve parantez içermeyen bir adla konur; yolu
kullanan betik aynı değişiklikte güncellenir.
