# Tasarım değerlendirmesi ve uygulama

Bu belge klinik çalışma alanının **ekran tasarımı** kararlarını özetler. Puanlama, tanı, kayıt biçimi ve A4 çıktı kuralları değiştirilmedi.

| Önceki durum | Uygulanan çözüm |
| --- | --- |
| Sekiz ana bölüm masaüstünde bile yalnızca hamburger menüdeydi. | Geniş ekranda gruplu ve aktif konumu belirgin kalıcı yan gezinme; ≤1050 px'te odak tuzaklı, Escape ile kapanan menü. |
| Açılış sayfasında birkaç tekrarlı boş kutu vardı. | Gerçek verilere bağlı günlük özet, sıradaki **planlanan** görüşme, doğru boş durum ve ilk kayıt için doğrudan açılan form. Örnek danışan eklenmez. |
| Düz gri/beyaz kartlar, küçük etiketler ve farklı düğme yüzeyleri hiyerarşiyi zayıflatıyordu. | Ortak orman yeşili/adaçayı paleti, editorial serif başlıklar, okunaklı sistem sans metin, tutarlı köşe yarıçapı, durum ve odak stilleri. |
| Test sayfası dört ayrı inline-stil kartıydı; kısa taramalar geçmiş listesinde yoktu. | Tek tip araç kartları, klinik uyarının ayrılması ve BDI/BAI/SCL-90-R yanında PHQ-9/GAD-7 kayıtlarının tarihe göre ortak geçmişte görünmesi. |
| SCL-90-R'nin dokuz sayfa düğmesi dar ekranda taşarken boş yanıtlar işaretli sıfır gibi görünüyordu. | Sayfa düğmeleri dar ekranda 5+4 diziliyor; boş yanıtlar işaretlenmemiş kalıyor ve açıkça 0 seçilmedikçe doldurulmuş sayılmıyor. |
| Danışan ve randevu tablolarının işlemleri telefonda yana kaydırma gerektiriyordu. | `data-mobile-cards` ile alan adı taşıyan, işlemleri altta erişilebilir kayıt kartları. Danışan adı artık klavye ile açılabilen gerçek bir düğme. |
| Klinik formlarının açılır pencerelerinde semantik diyalog ve odak yönetimi eksikti. | Ortak `ClinicalDialog`: `aria-modal`, başlık ilişkisi, Escape, odak döngüsü/geri dönüş, arka plan kaydırma kilidi ve kaydırılabilir form gövdesi. |
| Yerel verinin nerede durduğu gezinme sırasında görünmüyordu. | Yan panelde tarayıcıda saklama/şifrelenmeme bilgisi ve yedek bağlantısı. Bulut oturumu ile yerel kayıt ayrımı açık. |

## Tasarım sistemi

- **Renkler:** ana mürekkep `#1a3028`, eylem yeşili `#205c48`, açık zemin `#f5f7f3`, beyaz içerik yüzeyi. Normal metinde kullanılan soluk `#66796e` renginin beyaza karşı kontrastı yaklaşık **4,64:1**, ana eylem renginin beyaz metne karşı kontrastı yaklaşık **7,82:1**. Tehlike, uyarı ve başarı renkleri ayrı anlam taşır; renkli rozetlerde metin etiketi de bulunur.
- **Tipografi:** veri/form metninde sistem sans, sayfa ve bölüm başlıklarında yerel serif yığını. Harici yazı tipi isteği yoktur.
- **Boş durumlar:** gerçek boş kayıt ile filtre sonucu bulunmamasını ayırır; her durumda işe yarayan bir sonraki adımı sunar. Güvenlik göstergesi veya hasta verisi uydurulmaz.
- **Etkileşim:** aktif gezinme `aria-current`, odak görünürlüğü, küçük ekranda en az 44 px dokunma alanı, 16 px form girişi, azaltılmış hareket tercihi. Uzun klinik formun üst başlığı ve alt kaydetme alanı diyalog içinde kalır.
- **Uyumluluk:** `screen.css` değişkenleri ortak kaynaktır; `workspace.css` güncel ekran katmanıdır; `responsive.css` en son yüklenir. Yazdırılabilir rapor ayrı `@media print` kurallarını korur.

## Denetim kontrol listesi

1. Masaüstünde gezinme yan panelden; tablette/telefonda menüden tüm sekmelere erişin. Aktif bölümü ve klavyeyle Escape/Tab davranışını kontrol edin.
2. Boş kurulumda ana sayfadaki “İlk danışanı ekle” düğmesinin doğrudan forma gittiğini ve ilk kayıttan sonra gerçek sayaçların güncellendiğini doğrulayın.
3. 320, 390, 720 ve 1024 px genişliklerde danışan/randevu/denetim tablolarının alan etiketlerini ve işlem düğmelerini kontrol edin; sayfa düzeyinde yatay kaydırma olmamalı.
4. Bir klinik diyalogu klavyeyle açıp kapatın; odak tetikleyiciye dönmeli. Formun altındaki işlem düğmeleri dar ekran yüksekliğinde görünür olmalı.
5. Ölçek geçmişinde kısa tarama kaydını, güvenlik uyarısını ve raporun A4 yazdırma önizlemesini kontrol edin. Ölçek puanı tanı değildir.

## Doğrulama (24 Eylül 2026)

- `npm run typecheck`, `npm run build`, `git diff --check` başarılı; `npm test`: **90/90**.
- Başsız Chromium'da masaüstü ve Pixel 5 projelerindeki Playwright senaryoları: **12/12**. Bu ortamda tarayıcı indirme ağı çalışmadığından, koşular için yalnızca yerel, geçici bir Chromium yürütülebilir dosya ayarı kullanıldı; test çalıştırıcısı geliştirme bağımlılığıdır, tarayıcı ikilisi depoya eklenmedi.
- 17 rota, 320 / 390 / 720 / 1024 / 1440 px genişliklerinde (85 görünüm) sayfa düzeyinde yatay taşma ve JavaScript hataları için tarandı. Masaüstü/telefon ekran görüntüleri ve kayıt akışı başsız tarayıcıda kontrol edildi.
- Firefox, WebKit, fiziksel cihaz ve klinik çıktıların manuel A4 baskı denetimi bu koşunun kapsamı dışındadır. `e2e/` senaryoları standart Playwright tarayıcıları yüklü ortamlarda tekrar çalıştırılabilir.
