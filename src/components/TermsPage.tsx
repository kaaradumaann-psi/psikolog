import { CONTACT_EMAIL, COPYRIGHT_HOLDER, POLICY_EFFECTIVE_DATE, SITE_URL } from '../form/attribution';
import { PolicyDoc, PolicyList, type PolicySection } from './PolicyDoc';

/**
 * Kullanım Koşulları (/kullanim).
 *
 * Uygulamanın karar destek niteliğini, hesap ve lisans kurallarını,
 * kullanıcı yükümlülüklerini ve sorumluluk sınırlarını düzenler. Metin,
 * Türkiye'de barındırılan bir klinik yazılım için yaygın şartları, bu
 * uygulamanın gerçek çalışma biçimiyle (cihaz içi puanlama, Supabase kayıt,
 * yönetici onaylı hesaplar) birleştirir.
 */

const SECTIONS: PolicySection[] = [
  {
    id: 'kosullar-taraflar',
    title: 'Taraflar ve Kapsam',
    body: (
      <>
        <p>
          Bu Kullanım Koşulları; MMPI-566 Çalışma Alanı yazılımının ve barındırıldığı web adresinin
          kullanımını, yazılımın yayıncısı <b>{COPYRIGHT_HOLDER}</b> (“sağlayıcı”) ile yazılımı
          yetkili hesabıyla kullanan ruh sağlığı profesyoneli (“kullanıcı”) arasında düzenler.
          Siteyi ziyaret eden ve hesabı olmayan kişiler için de bilgi sayfalarına ilişkin hükümler
          uygulanır.
        </p>
        <p>
          Uygulamayı kullanmak, bu koşulları ve Gizlilik & KVKK Politikası’nı okuduğunuzu ve kabul
          ettiğinizi gösterir. Koşulları kabul etmiyorsanız uygulamayı kullanmamalısınız.
        </p>
      </>
    ),
  },
  {
    id: 'kosullar-hizmetin-niteligi',
    title: 'Hizmetin Niteliği — Karar Desteği',
    body: (
      <>
        <p>
          Uygulama; Minnesota Çok Yönlü Kişilik Envanteri’nin 566 maddelik biçimi için optik form
          üretimi, optik okuma (OMR), T puanı dönüşümü, geçerlik–tutarlılık analizleri ve klinik
          kaynaklara dayalı yorum özetleri sunan bir <b>klinik karar destek yazılımıdır</b>.
        </p>
        <PolicyList
          items={[
            'Uygulama tanı aracı değildir; ürettiği puan ve yorumlar tanı koymaz, tedavi planlamaz.',
            'Tüm klinik değerlendirme, tanı ve tedavi kararı; testi uygulayan ve yorumlayan ruh sağlığı profesyonelinin mesleki sorumluluğundadır. Bulgular daima klinik görüşme, öykü ve diğer verilerle birlikte değerlendirilmelidir.',
            'Yorum metinleri, kaynağı Kaynakça sayfasında listelenen bilimsel yayınlardan derlenmiştir; her vakanın birebir karşılığı olmayabilir.',
            'Optik okuma, görüntü kalitesine bağlı olasılıksal bir süreçtir; onay öncesi gözden geçirme ekranındaki kontrolleri atlamamak kullanıcının sorumluluğundadır.',
          ]}
        />
      </>
    ),
  },
  {
    id: 'kosullar-hesap',
    title: 'Hesap, Yetkinlik ve Güvenlik',
    body: (
      <>
        <PolicyList
          ordered
          items={[
            <>
              <b>Yetkinlik:</b> Hesap, yalnızca MMPI uygulamaya yetkili ruh sağlığı
              profesyonellerine (psikolog, psikiyatrist ve ilgili mevzuatla yetkili diğer meslek
              mensuplarına) açılır. Uygulamada halka açık kayıt yoktur; hesaplar yalnızca yönetici
              tarafından oluşturulur.
            </>,
            <>
              <b>Tek kullanıcı:</b> Hesaplar kişiseldir; kimlik bilgileri ve oturum başka kişilerle
              paylaşılamaz. Yetkisiz kullanım saptandığında hesap askıya alınabilir.
            </>,
            <>
              <b>Güvenlik:</b> Kullanıcı, parolasını gizli tutmaktan ve hesabındaki tüm işlemlerden
              sorumludur. Şüpheli erişim hâlinde derhal yöneticiye bilgi vermelidir.
            </>,
            <>
              <b>Kapatma:</b> Kullanıcı hesabının kapatılmasını yöneticiye talep edebilir; bu
              koşulların hesabı sona erdirmesi, önceden oluşturulmuş kayıtlara erişim düzenini
              değiştirmez.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: 'kosullar-kullanici-yukumlulukleri',
    title: 'Kullanıcı Yükümlülükleri',
    body: (
      <>
        <p>Kullanıcı; aşağıdakiler dahil olmak üzere mesleki ve yasal yükümlülüklerine uyar:</p>
        <PolicyList
          items={[
            'Testi uygulamadan önce danışanı aydınlatmasını ve gereken onamı almasını, aydınlatma yükümlülüğünün KVKK uyğunluğunu kendisinin sağlamasını,',
            'Kayıt formlarına girdiği danışan bilgilerinin doğru ve güncel olmasını,',
            'Test materyalinin (form, madde içerikleri) yetkisiz kişilerle paylaşılmamasını ve test güvenliğinin korunmasını,',
            'Rapor ve çıktıları yalnızca yetkili kişiler ve meşru amaçlar için kullanmasını, danışan verisini rıza ve mevzuat dışı üçüncü taraflarla paylaşmamasını,',
            'Uygulamayı hukuka, ruh sağlığı meslek etiğine ve bu koşullara aykırı biçimde kullanmamasını.',
          ]}
        />
        <p>
          Ayrıca kullanıcı; uygulamayı tersine mühendislik, kod çözme, yetkisiz otomatik erişim
          (bot/scraper) veya hizmetin bütünlüğünü bozan girişimlerde bulunmama konusunda sorumludur.
        </p>
      </>
    ),
  },
  {
    id: 'kosullar-fikri-mulkiyet',
    title: 'Fikri Mülkiyet',
    body: (
      <>
        <p>
          Yazılımın arayüzü, kod tabanı, optik form tasarımı ve belgelendirmesi {COPYRIGHT_HOLDER}
          ’ne aittir; © {new Date().getFullYear()} tüm hakları saklıdır. Yazılım, kullanıcıya
          kişisel ve devredilemez, mesleki kullanım amacıyla sınırlı bir kullanım izni verir; satış,
          yeniden lisanslama, dağıtım veya türev ürün oluşturma kapsamaz.
        </p>
        <p>
          <b>MMPI</b> (Minnesota Multiphasic Personality Inventory) adı ve envanteri, hak
          sahiplerine (University of Minnesota) aittir; telifli bir çıkarım aracıdır. Bu uygulama
          bağımsız bir yazılımdır; Minnesota Üniversitesi veya envanterin yasal dağıtıcılarıyla
          bağlantılı değildir ve onların onayını ya da desteğini ifade etmez. Envanterin klinik
          kullanımı için gereken lisansları almak, kullanıcı ve/veya kurumunun sorumluluğundadır.
        </p>
      </>
    ),
  },
  {
    id: 'kosullar-degisiklikler',
    title: 'Hizmetin Değiştirilmesi ve Erişilebilirlik',
    body: (
      <>
        <p>
          Sağlayıcı; hizmeti geliştirebilir, özelliklerini değiştirebilir veya bakım nedeniyle geçici
          olarak erişilemez kılabilir. Uygulama çevrimdışı çalışabilen bileşenler (optik okuma,
          puanlama) içerir; ancak oturum ve kayıt işlemleri, barındırma altyapısının (Supabase)
          erişilebilirliğine bağlıdır.
        </p>
        <p>
          Sağlayıcı, kesintisiz ve hatasız hizmet garantisi vermez. Kullanıcı, kritik klinik
          kullanım öncesinde kayıtlarının kendi tarafında gerekli yedeklemelerinin yapıldığından
          emin olmalıdır.
        </p>
      </>
    ),
  },
  {
    id: 'kosullar-sorumluluk',
    title: 'Sorumluluğun Sınırlanması',
    body: (
      <>
        <p>
          Uygulama “olduğu gibi” sunulur. Sağlayıcı; puanlama algoritmasının doğruluğu için makul
          özeni gösterir, ancak tarama kalitesi, kullanıcı girişi hataları, yanlış yapılandırma veya
          veri kaybından doğabilecek sonuçlar için sorumluluk kabul etmez.
        </p>
        <p>
          Türk hukukunun izin verdiği azami ölçüde; sağlayıcı, uygulamanın kullanımından veya
          kullanılamamasından doğan dolaylı zararlar, kâr kaybı ve veri kaybı dahil hiçbir zarardan
          sorumlu tutulamaz. Klinik kararların sonucuna ilişkin sorumluluk daima kararları veren
          uzmana aittir (2. maddenin devamı niteliğindedir).
        </p>
        <p>
          Uygulamanın kötüye kullanılmasından veya koşullara aykırı kullanımdan doğan taleplerde,
          sorumluluk aykırılığı gerçekleştiren kullanıcıya aittir.
        </p>
      </>
    ),
  },
  {
    id: 'kosullar-hukuk',
    title: 'Uygulanacak Hukuk ve Uyuşmazlıklar',
    body: (
      <>
        <p>
          Bu koşullardan doğan uyuşmazlıklarda Türk hukuku uygulanır. Öncelikle dostane yolla
          çözülemeyen uyuşmazlıklarda, sağlayıcının yerleşim yeri mahkemeleri ve icra daireleri
          yetkilidir.
        </p>
        <p>
          Koşulların herhangi bir hükmünün geçersiz sayılması, diğer hükümlerin yürürlüğünü
          etkilemez.
        </p>
      </>
    ),
  },
  {
    id: 'kosullar-iletisim-yururluk',
    title: 'İletişim ve Yürürlük',
    body: (
      <>
        <p>
          Bu koşullara ilişkin soru, bildirim ve telif ihlali talepleri için:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Güncel metin {SITE_URL} adresinde
          yayımlanır.
        </p>
        <p>
          {POLICY_EFFECTIVE_DATE} tarihinde yayımlanan bu koşullar, aynı tarihte yürürlüğe girer.
          Önemli değişiklikler uygulama içinde duyurulur; duyurudan sonra hizmeti kullanmaya devam
          etmek, güncel koşulları kabul etmek anlamına gelir.
        </p>
      </>
    ),
  },
];

/** Kullanım Koşulları sayfası — tam metin, numaralı bölüm düzeniyle. */
export function TermsPage() {
  return (
    <PolicyDoc
      lede="Bu metin; MMPI-566 Çalışma Alanı’nın hangi amaçla, kimler tarafından ve hangi şartlarla kullanılabileceğini belirler. Uygulama bir klinik karar destek aracıdır; kullanımının tüm hukuki sonuçları, koşullarda belirtilen sorumluluk dağılımına tabidir."
      sections={SECTIONS}
    />
  );
}
