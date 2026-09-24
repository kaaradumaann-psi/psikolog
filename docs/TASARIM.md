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
| Marka işareti “HK” monogramıydı; psikoloji pratiğini anlatmıyordu ve favicon hâlâ kullanılmayan yeşil palette (`#205c48`) çizilmiş, “MMPI kamerası” gibi bir tarama çerçevesini andırıyordu. | İşaret **danışan figürüne** dönüştü: baş + omuz, tek renk. Favicon aynı geometriden üretilir; tarayıcı sekmesi, iOS ana ekran simgesi ve rapor antedi tek kaynaktan gelir. |
| Randevu formunda ücret/ödeme alanı yoktu, tabloda ödeme kolonu yoktu; buna karşılık `pending` varsayılanı yüzünden **henüz yapılmamış** görüşmeler için “Ücret bekliyor” uyarısı çıkıyordu. | Formda “Seans Ücreti” ve “Ödeme Durumu”, tabloda/kartta Ödeme kolonu. Ücret uyarısı yalnızca görüşme **tamamlandığında veya danışan gelmediğinde** ve ödeme hâlâ beklemedeyse doğar; gün tahtasında rozet, “takip gerekiyor” panelinde tek satır. |

## Marka işareti

İşaret tek bir geometriden gelir ve `src/components/BrandMark.tsx` içinde tanımlıdır; yan panel, üst şerit, giriş ekranı, bilgi sayfası ve alt bilgi aynı bileşeni kullanır. Eskiden her bileşende kopyalanmış “tarama köşeleri + dört nokta” çizimi kaldırıldı.

- **Baş:** masada karşı karşıya oturulan kişi, yani danışan.
- **Omuz/gövde yayı:** görüşmenin taşıyıcı zemini.
- **Zemin çizgisi:** figürü taşıyan ince taban.

İşaret **tek renklidir**: `currentColor` ile çizilir, zemin rengi CSS katmanından (`--forest`, mürekkep `#0d0d0d`) gelir. Başın içindeki mavi vurgu çekirdeği kaldırıldı; marka artık hiçbir ikinci renk taşımıyor, bu yüzden boyuta bağlı sadeleştirme (`simplified`) seçeneği de gereksiz kaldı — aynı geometri 16 px'te de 320 px'te de kullanılır.

Yayınlanan marka dosyaları `public/` altındadır ve `favicon.svg` kaynaktır:

| Dosya | Kullanım |
| --- | --- |
| `favicon.svg` | Tarayıcı sekmesi (`<link rel="icon">`), mask-icon, kaynak geometri |
| `apple-touch-icon.png` (180 px) | iOS ana ekran simgesi; köşeleri iOS yuvarladığı için zemin taşar |
| `logo-mark.png` (320 px) | Rapor antedi varsayılanı (`ClinicalReportsPage`) |
| `logo-full.svg` / `.png` | Yatay kilit: işaret + sözcük markası, basılı materyal |

`tests/brand.test.ts` işaretin tek kaynaktan gelmesini, favicon'un paletle uyumunu ve eski “HK”/yeşil palet artıklarının geri dönmemesini denetler.

## Tasarım sistemi

- **Renkler:** ana mürekkep `#0d0d0d` (beyaza karşı **19,4:1**), beyaz içerik yüzeyi, `#f6f6f6` yumuşak zemin. Normal metinde kullanılan soluk `#6e6e73` beyaza karşı **5,07:1**, bağlantı/vurgu metni `--accent-ink #0a5ac1` **6,47:1** — ikisi de AA'yı geçer.
- **Dolgu ve vurgu ayrımı:** marka vurgusu `--primary #0a84ff` beyaz metinle yalnızca **3,65:1** verir, bu yüzden **dolgu buton ve beyaz etiketli yüzeylerde kullanılmaz**; onlar `--action #0071e3` (**4,70:1**, hover `--action-hover #0a5ac1` **6,47:1**) kullanır. Vurgu rengi ikon, kenarlık, odak halkası ve `aria-current` işareti gibi metin taşımayan yerlerde kalır. Bu ayrım `tests/contrast.test.ts` ile kilitlidir.
- **Diğer anlam renkleri:** tehlike `--danger #d2453a` beyaz metinle **4,51:1** (AA). Uyarı ve başarı renkleri metin taşıyan dolgularda kullanılmaz; yalnızca tint zemin + koyu metin olarak görünür. Renkli rozetlerin hepsi metin etiketi de taşır, anlam yalnızca renge bırakılmaz. Mobil tarayıcı çubuğu `theme-color` ile beyazdır.
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
6. Randevuyu planlanmış olarak kaydedin: gün tahtasında ödeme uyarısı **çıkmamalı**. “Görüşmeyi tamamla” dedikten sonra ödeme hâlâ beklemedeyse kart üzerinde “Ödeme bekliyor · 1.500 ₺” rozeti ve “takip gerekiyor” panelinde tek satır görünmeli.
7. 16 px ve 32 px favicon'u tarayıcı sekmesinde kontrol edin; kişi figürü tek renk olarak ayırt edilebilir olmalı.

## Doğrulama (24 Eylül 2026)

- `npm run typecheck`, `npm run build`, `git diff --check` başarılı; `npm test`: **104/104** (marka ve kontrast sözleşmeleri dâhil).
- Başsız Chromium'da masaüstü ve Pixel 5 projelerindeki Playwright senaryoları: **12/12**. Bu ortamda tarayıcı indirme ağı çalışmadığından, koşular için yalnızca yerel, geçici bir Chromium yürütülebilir dosya ayarı kullanıldı; test çalıştırıcısı geliştirme bağımlılığıdır, tarayıcı ikilisi depoya eklenmedi.
- 13 rota, **320 / 360 / 390 / 414 / 768 / 1024 / 1280 / 1440 px** genişliklerinde (104 görünüm) iki kez tarandı: boş kurulum ve gerçekçi veri tohumlanmış hâlde. Ölçülen: sayfa düzeyinde yatay taşma yok, JavaScript/konsol hatası yok, 430 px altında 24 px'ten küçük dokunma hedefi yok. Masaüstü/telefon ekran görüntüleri ve kayıt akışı başsız tarayıcıda kontrol edildi.
- Ölçümle bulunan ve giderilen iki kusur: başlıktaki marka işareti eski “tarama çerçevesi” çizimini taşıyordu; `client-name-button` (19 px) ile gün tahtasındaki yedek düğmesi (17 px) dokunma eşiğinin altındaydı.
- Kontrast varsayımları hesapla doğrulandı (WCAG 2.1 bağıl parlaklık). Bulunan kusur: dolgu buton `--primary` kullanırken beyaz metin **3,65:1** ile AA'yı geçmiyordu; `--action`/`--action-hover` ayrımı bu yüzden eklendi.
- Firefox, WebKit, fiziksel cihaz ve klinik çıktıların manuel A4 baskı denetimi bu koşunun kapsamı dışındadır. `e2e/` senaryoları standart Playwright tarayıcıları yüklü ortamlarda tekrar çalıştırılabilir.
