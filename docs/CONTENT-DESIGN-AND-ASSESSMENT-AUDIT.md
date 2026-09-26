# İçerik tasarımı, kurum kurulumu ve ölçek çıktısı denetimi

**Tarih:** 26 Eylül 2026  
**Kapsam:** Yalnız içerik alanları, ilk kurum kurulumu, hata kurtarma, favicon ve ölçeklerin kağıt/PDF kullanımı. Backend, Supabase, veritabanı, route yapısı, sidebar, sidebar footer, üst header ve mevcut navigation yapısı değiştirilmedi.

## 1. Korunan alanlar

Aşağıdaki uygulama chrome'u olduğu gibi bırakıldı:

- `.workspace-sidebar` ve iç navigasyon grupları
- `.sidebar-bottom` / sidebar footer
- `.app-header` / top bar
- `NAV_GROUPS`, mevcut route ve sidebar destination yapısı
- `SiteFooter` bileşeninin yapısı

Bu sınırı kalıcı olarak denetlemek için `tests/contentDesignGuard.test.ts`, yeni içerik tasarım katmanında sidebar/header/footer seçicisi bulunmasını hata sayar.

## 2. Mavi accent envanteri ve yeni kategori davranışı

### A — Normal content

Örnekler: normal rapor kartı, bilgi/form kartı, test kartı, SOAP kartı, metrik kart, standart liste satırı.

- Beyaz yüzey
- `1px` nötr `--hairline` border
- 10–12 px radius
- Gölge yok
- Dekoratif mavi sol çizgi yok

### B — Selected content

Örnek: `report-list-item.is-selected`, yönetimde seçili kurum özeti.

- Beyaz yüzey
- Kontrollü mavi sol accent
- Açık seçili durum, ek gradient/glow yok

### C — Active content

Örnek: aktif sekme, seçilmiş soru yanıtı, sürmekte olan görev.

- Aktif kontrolün kendisinde mavi underline/tint
- `task-card.status-in_progress` için mavi sol durum çizgisi
- Normal görevlerde accent yok

### D — Important content

Örnek: kritik güvenlik maddesi, yüksek öncelikli görev, seans hazırlık uyarısı.

- Tehlike için kırmızı; dikkat için amber
- Yalnız semantik gerektiğinde sol çizgi veya hafif yüzey
- Animasyonlu/neon/gradient vurgu yok

### E — Status/state content

Örnek: aktif/pasif hesap, imzalı/kilitli kayıt, puan bandı.

- Küçük semantik etiket
- Renk yalnız durumu iletir
- Normal içerik kartının tamamı renklendirilmez

Paylaşılan kurallar `src/styles/content-system.css` içindedir. Sayfa başına aynı kart reçetesi kopyalanmadı.

## 3. Kurum ve hesap yönetimi

İlk girişteki kurumsuz ADMIN ekranı artık tek büyük, iç içe kart yerine sıralı bir kurulum akışıdır:

1. İşlem yapılacak kurum seçilir veya yeni kurum oluşturulur.
2. Kurumsuz mevcut hesaplar doğru kuruma atanabilir.
3. Seçili kurumda yeni ekip hesabı açılır.
4. Hesaplar ad/e-posta/kurum ile aranır ve kapsama göre filtrelenir.

Ekran ayrıca şunları açıkça anlatır:

- Kurumun bir güvenlik/tenant sınırı olduğu
- Yönetim yapmak için ADMIN'in kendine kurum atamak zorunda olmadığı
- Klinik dosyaları açmak için kendi hesabına doğru kurumu açıkça ataması gerektiği
- Aynı kurum üyeliğinin başka psikoloğun dosyasına otomatik erişim vermediği
- Kurum oluşturmanın kullanıcıyı otomatik bağlamadığı

Sunucu fonksiyonları, RLS, profil modeli ve route'lar değiştirilmedi.

## 4. “Çalışma alanı açılamadı” kurtarma akışı

Genel hata ekranı artık kullanıcıyı yalnız “Yenile” döngüsüne bırakmaz:

- React ağacını veri silmeden yeniden kuran **Yeniden dene**
- Route'u güvenli Ayarlar ekranına taşıyan **Güvenli Ayarlar ekranını aç**
- Son seçenek olarak tam sayfa yenileme
- Açık “Tarayıcı verilerini silmeyin” ve “bu işlem kayıt silmez” metni

Kurum yönetim bölümü ayrıca yerel bir `WorkspaceSectionBoundary` ile çevrilidir. Yönetim panelindeki render hatası çıkış düğmesini ve bütün uygulamayı global hata ekranına düşürmez.

## 5. Ölçekler: tek tek telif ve kağıt/PDF kararı

Hak ve uygulama metadatasının tek kaynağı `src/clinical/assessmentCatalog.ts` dosyasıdır. Kartlar, ekrandaki yasal not, kağıt formu, sonuç çıktısı ve kaynakça aynı kaydı kullanır.

| Araç | Durum | Kağıt/PDF davranışı |
| --- | --- | --- |
| Beck Depresyon Envanteri (BDI) | Ticari/lisanslı, ilgili hak sahipleri ve Pearson politikalarına tabi | Madde metni çoğaltılmaz. Resmî lisanslı kitapçık yanında kullanılacak numaralı **yanıt aktarım formu** verilir. |
| Beck Anksiyete Envanteri (BAI) | Ticari/lisanslı, ilgili hak sahipleri ve Pearson politikalarına tabi | Madde metni çoğaltılmaz. Resmî lisanslı kitapçık yanında kullanılacak numaralı **yanıt aktarım formu** verilir. |
| SCL-90-R® | Ticari/lisanslı, test güvenliği ve yayıncı koşullarına tabi | 90 maddelik metinsiz **yanıt aktarım formu** verilir. Bu çıktı test kitapçığı değildir. |
| GAD-7 | Çoğaltmak/çevirmek/göstermek/dağıtmak için izin gerektirmeyen araç | Danışanın elle işaretleyebileceği tam boş form ve tarayıcıdan PDF kaydı verilir. |
| PHQ-9 | Çoğaltmak/çevirmek/göstermek/dağıtmak için izin gerektirmeyen araç | Danışanın elle işaretleyebileceği tam boş form ve tarayıcıdan PDF kaydı verilir; madde 9 uyarısı korunur. |

### Kaynak/politika bağlantıları

- Pearson, test materyallerini çoğaltma politikası: <https://www.pearsonassessments.com/footer/legal-policies.html>
- Pearson, satış ve kullanım koşulları: <https://www.pearsonassessments.com/footer/terms-of-sale---use.html>
- Pfizer, PHQ ve GAD araçlarına ücretsiz/kısıtsız erişim duyurusu: <https://www.pfizer.com/news/press-release/press-release-detail/pfizer_to_offer_free_public_access_to_mental_health_assessment_tools_to_improve_diagnosis_and_patient_care>

Bu ayrımın amacı telif satırı ekleyerek izinsiz çoğaltmayı meşrulaştırmak değildir. Lisanslı araçlarda resmî materyali uygulayıcının ayrıca temin etmesi zorunluluğu ekranda ve çıktıda açıkça yazılır.

## 6. Kağıttan dijitale klinik akış

1. Uzman ilgili araç ekranını açar.
2. PHQ-9/GAD-7 için **Boş form / PDF**; lisanslı araçlar için **Yanıt formu / PDF** seçilir.
3. Danışan formu elle doldurur (lisanslı araçlarda resmî test kitapçığıyla birlikte).
4. Uzman işaretleri aynı dijital forma aktarır.
5. Eksik madde kontrolünden sonra sonucu danışan dosyasına kaydeder.
6. **Sonuç özeti / PDF** ile madde metinlerini yeniden üretmeyen klinik özet alınır.

Çıktılarda araç kaynağı, hak/kullanım notu, “tek başına tanı değildir” sınırı ve uygulamanın `© 2026 Halil Karaduman` ürün çıktısı notu yer alır.

## 7. Favicon

Eski köşe/nokta glifi yerine, ana site sahibini doğrudan anımsatan yüksek kontrastlı **HK** işareti üretildi:

- `favicon.svg`
- `favicon-16x16.png`
- `favicon-32x32.png`
- `favicon.ico`
- `apple-touch-icon.png`

`index.html` bağlantılarına `?v=2` sürümü eklenerek eski tarayıcı favicon cache'inin yeni işareti saklaması önlendi.

## 8. Otomatik doğrulama

- `tests/assessmentPrint.test.ts`
  - Lisanslı/çoğaltıma açık araç matrisi
  - Lisanslı formda madde metninin çıktıya girmemesi
  - GAD-7 boş formunda madde metninin bulunması
  - print/PDF CSS sözleşmesi ve telif alanı
- `tests/contentDesignGuard.test.ts`
  - İçerik CSS'inin sidebar/header/footer'a dokunmaması
  - Normal/seçili/aktif/önemli kart ayrımı
  - Global hata ekranında veri silmeyen kurtarma yolları
- Mevcut psikometri hesap testleri
  - BDI, BAI, SCL-90-R, GAD-7 ve PHQ-9 soru sayıları, puan bantları ve güvenlik bayrakları
