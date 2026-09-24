import { CONTACT_EMAIL, COPYRIGHT_HOLDER, SITE_URL } from '../form/attribution';
import { PolicyDoc, PolicyList, type PolicySection } from './PolicyDoc';

/**
 * Gizlilik & KVKK Politikası (/gizlilik).
 *
 * Metin, uygulamanın belgelenmiş veri akışını esas alır: optik okuma ve
 * profil hesaplaması tamamen kullanıcının cihazında yapılır; kayıt verisi
 * kurulumun kendi Supabase veritabanında satır güvenliği (RLS) ile saklanır;
 * oturum tarayıcının sessionStorage'ında tutulur; izleme çerezi ve üçüncü
 * taraf analitik kullanılmaz.
 */

const SECTIONS: PolicySection[] = [
  {
    id: 'gizlilik-amacl-kapsam',
    title: 'Amaç ve Kapsam',
    body: (
      <>
        <p>
          Bu politika; MMPI-566 Çalışma Alanı yazılımının (uygulama) ve onun barındırıldığı web
          adresinin kullanımı sırasında işlenen kişisel verilerin, 6698 sayılı Kişisel Verilerin
          Korunması Kanunu (“KVKK”) ve ilgili mevzuata uygun olarak ele alınmasını düzenler.
        </p>
        <p>
          Politika; uygulama arayüzünü kullanan ruh sağlığı profesyonellerinin, kayıtları
          oluşturulan danışanların ve web sitesini ziyaret eden tüm kullanıcıların kişisel
          verilerine ilişkin esasları içerir. Uygulamanın yazılım lisansını düzenleyen hükümler
          Kullanım Koşulları sayfasında yer alır.
        </p>
      </>
    ),
  },
  {
    id: 'gizlilik-veri-sorumlusu',
    title: 'Veri Sorumlusu ve İletişim',
    body: (
      <>
        <p>
          Uygulamanın yayıncısı ve altyapı hesaplarının (uzman/yönetici kayıtları) veri sorumlusu{' '}
          <b>{COPYRIGHT_HOLDER}</b>’dır. Başvuru ve bilgilendirme talepleriniz için:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
        <p>
          Danışanlara ait klinik kayıtlar açısından sorumluluk dengesi şöyledir: testi uygulayan
          ruh sağlığı profesyoneli (ve bağlı olduğu kurum), danışan verisinin <b>veri sorumlusu</b>
          sıfatıyla aydınlatma yükümlülüğü, hukuki sebebin varlığı ve saklama–imha süreleri dahil
          tüm yükümlülükleri üstlenir. Uygulama ve yayıncısı, profesyonelin talimatları doğrultusunda
          ve yalnızca hizmetin sunulması amacıyla veri işleyen konumundadır.
        </p>
      </>
    ),
  },
  {
    id: 'gizlilik-islenen-veriler',
    title: 'İşlenen Kişisel Veriler',
    body: (
      <>
        <p>Uygulama üç ayrı veri kümesiyle çalışır; hiçbiri reklam veya profilleme amacıyla kullanılmaz:</p>
        <PolicyList
          ordered
          items={[
            <>
              <b>Hesap verileri:</b> Ad, soyad, iş e-postası, rol (psikolog/yönetici) ve hesap
              aktiflik durumu. Parola uygulamanın tablolarına yazılmaz; kimlik doğrulama Supabase Auth
              tarafından yürütülür. Public kayıt yoktur; hesaplar yalnızca yönetici tarafından açılır.
            </>,
            <>
              <b>Danışan kayıt verileri:</b> Kaydı oluşturan uzman tarafından girilen ad, soyad,
              cinsiyet, yaş, meslek, eğitim düzeyi, uygulama tarihi, istekte bulunan bilgisi; optik
              okuma sonucunda elde edilen 566 maddelik Doğru/Yanlış/boş yanıt dizisi veya ölçek ham
              puanları; kayıt üst verileri (oluşturma zamanı, uygulama yöntemi).
            </>,
            <>
              <b>Teknik veriler:</b> Oturumun çalışması için zorunlu tarayıcı depolama kayıtları
              (aşağıdaki “Çerezler ve Yerel Depolama” bölümü). Sunucu tarafında yalnızca hizmetin
              güvenliği için gereken asgari altyapı kayıtları tutulur.
            </>,
          ]}
        />
        <p>
          Taranan form görüntüleri (fotoğraf/tarama dosyaları) yalnızca optik okuma için tarayıcının
          belleğinde işlenir; tamamı değil, yalnızca onayladığınız kayıt verileri sunucuya yazılır.
        </p>
      </>
    ),
  },
  {
    id: 'gizlilik-amaclar-hukuki-sebep',
    title: 'İşleme Amaçları ve Hukuki Sebep',
    body: (
      <>
        <p>Kişisel veriler yalnızca aşağıdaki amaçlarla işlenir:</p>
        <PolicyList
          items={[
            'Hesap oluşturma, kimlik doğrulama ve yetkilendirme; rol bazlı erişim denetiminin uygulanması;',
            'Test sonuçlarının (T puanları, geçerlik ve tutarlılık analizleri, kod yorumları) kayıt sahibi uzmana sunulması ve daha sonra yeniden üretilmesi;',
            'Kayıtların güvenliğinin, bütünlüğünün ve kullanılabilirliğinin sağlanması; kötüye kullanımın önlenmesi;',
            'Kullanıcıların talep ve şikâyetlerinin yanıtlanması;',
            'Yürürlükteki mevzuattan doğan yükümlülüklerin yerine getirilmesi.',
          ]}
        />
        <p>
          Hesap ve teknik veriler için hukuki sebep, hizmetin sunulmasına ilişkin sözleşmenin ifası
          ve meşru menfaattir. Danışan klinik verileri ise özel nitelikli sağlık verisidir; KVKK
          m.6/3 uyarınca bu veriler, gizlilik yükümlülüğü altındaki sağlık meslek mensuplarınca
          <i> koruyucu hekimlik, tıbbi teşhis, tedavi ve bakım hizmetlerinin yürütülmesi</i> amacıyla
          işlenebilir. Uygulayan uzman, bu koşulların kendi vakasında sağlanıp sağlanmadığını
          değerlendiren veri sorumlusudur; rızaya dayalı işleme tercih ediliyorsa aydınlatılmış
          açık rızası belgelemek de yine uzmanın yükümlülüğüdür.
        </p>
      </>
    ),
  },
  {
    id: 'gizlilik-ozel-nitelikli',
    title: 'Özel Nitelikli Kişisel Veriler',
    body: (
      <>
        <p>
          MMPI yanıtları ve bunlardan türeyen psikolojik değerlendirme verileri, <b>sağlık ve cinsel
          hayat</b> verisi niteliğinde özel nitelikli kişisel veridir. Bu veriler; yalnızca yetkili
          bir ruh sağlığı profesyonelinin hesabıyla, testin uygulanması ve yorumlanması amacıyla,
          satır güvenliği kurallarıyla sınırlandırılmış olarak işlenir.
        </p>
        <p>
          Uygulama, özel nitelikli verileri reklam, pazarlama, profilleme veya model eğitimi
          amacıyla kullanmaz; verileri hiçbir üçüncü tarafla analiz/araştırma amacıyla paylaşmaz.
        </p>
      </>
    ),
  },
  {
    id: 'gizlilik-aktarim',
    title: 'Kişisel Verilerin Aktarımı',
    body: (
      <>
        <p>
          Kayıt verileri, kurulumun kendi veritabanı altyapısında (Supabase; PostgreSQL tabanlı,
          satır güvenliği etkin) saklanır. Bu barındırma hizmeti, veri işleyen olarak yalnızca
          depolama, kimlik doğrulama ve veritabanı hizmetlerini sağlar.
        </p>
        <PolicyList
          items={[
            'Kayıt verilerine, satır güvenliği (RLS) kuralları gereği psikolog kendi kayıtlarıyla, Admin ise yönetim görevi kapsamında tüm kayıtlarla sınırlı olarak erişebilir;',
            'Veriler, yasa gereği talep yetkili mercilerin dışında hiçbir üçüncü kişi/kuruma satılmaz, devredilmez veya paylaşılır hâle getirilmez;',
            'Uygulama üçüncü taraf analitik, reklam veya izleme servisi kullanmaz; yayımlanan derleme yalnızca yapılandırılan veritabanı adresiyle iletişim kurar.',
          ]}
        />
        <p>
          <b>Yapay zekâ yorumu (isteğe bağlı):</b> Sonuç ekranındaki “Yapay Zekâ Yorumu” bölümü
          etkinleştirildiğinde, yorum üretilmesi için yalnızca <b>isimsiz</b> sayısal profil
          (ölçek ham/T puanları, geçerlik değerleri, cinsiyet ve yaş) harici bir dil
          modeline iletilir; danışanın adı/soyadı ve form görselleri gönderilmez. Yorum
          metni cihazınızda kısa süreli önbelleğe alınır. Bu hizmet kullanılmadığında hiçbir
          veri dış modele iletilmez.
        </p>
        <p>
          Barındırma altyapısının yurt dışında konumlanması hâlinde, KVKK m.9 koşullarının
          sağlanması veri sorumlusu uzmanın/kurumun değerlendirmesine tabidir; kurumsal
          kurulumlarda veritabanının Türkiye içinde barındırılması önerilir.
        </p>
      </>
    ),
  },
  {
    id: 'gizlilik-saklama-imha',
    title: 'Saklama ve İmha',
    body: (
      <>
        <p>
          Hesap verileri, hesap aktif kaldığı sürece saklanır; hesabın kapatılmasıyla amaçlı olarak
          silinir. Danışan kayıtları, kaydı oluşturan uzman tarafından silinene kadar saklanır; uzman,
          kayıtlarını listeden dilediği zaman kalıcı olarak kaldırabilir.
        </p>
        <p>
          Sağlık kayıtlarına ilişkin asgari saklama süreleri (ör. ilgili mevzuatta öngörülen dosya
          saklama süreleri) uzmanın/kurumun mevzuat yükümlülüğüdür; bu süreler boyunca silme talebi,
          yasal saklama yükümlülüğü kapsamında sınırlanabilir. Silinen kayıtların imhası,
          KVKK’daki tanımlara uygun olarak yapılır.
        </p>
      </>
    ),
  },
  {
    id: 'gizlilik-guvenlik',
    title: 'Veri Güvenliği Önlemleri',
    body: (
      <PolicyList
        items={[
          'Kimlik yönetimi Supabase Auth altyapısıyla yapılır; parolalar uygulamanın kendi tablolarında hiçbir biçimde saklanmaz ve uygulama koduna geri döndürülmez;',
          'Kayıt erişimi, veritabanı düzeyinde satır güvenliği (RLS) + kullanıcı aktiflik bayrağıyla denetlenir; yetkisiz roller kayıt listelerini hiçbir sorguyla göremez;',
          'Yönetim işlemleri (hesap oluşturma, aktiflik değişikliği) doğrulanmış sunucu işlevi (Edge Function) üzerinden yapılır; bu işlevler yayın kökeni (origin) kısıtlamasıyla korunur;',
          'Oturum anahtarları tarayıcının sessionStorage alanında tutulur; sekme kapanınca oturum düşer;',
          'Yayımlanan derleme tek dosyalıktır ve dış kaynak yüklemez; içerik güvenlik politikası (CSP) betik ve bağlantı kaynaklarını kısıtlar;',
          'Kamera erişimi yalnızca kullanıcı onayıyla ve yalnızca form görüntüsü almak için kullanılır; görüntüler cihazdan ayrılmaz.',
        ]}
      />
    ),
  },
  {
    id: 'gizlilik-cerezler',
    title: 'Çerezler ve Yerel Depolama',
    body: (
      <>
        <p>
          Uygulama <b>izleme çerezi kullanmaz</b> ve üçüncü taraflara çerez göndermez. Yalnızca
          çalışma için zorunlu tarayıcı depolaması kullanılır:
        </p>
        <PolicyList
          items={[
            'Oturum anahtarı — sessionStorage: aynı sekmede sayfa yenilemede korunur, sekme kapandığında silinir;',
            'İşlem taslağı ve çevrimdışı kayıt kuyruğu — kullanıcıya özel anahtarla tarayıcının yerel depolama alanında, cihazınızda tutulur; görüntü pikselleri ve blob URL’leri taslağa yazılmaz.',
          ]}
        />
        <p>
          Bu kayıtları tarayıcı ayarlarından dilediğiniz zaman temizleyebilirsiniz. Yerel depolama
          temizlenirse taslak ve bekleyen çevrimdışı kayıt kuyruğu kaybolur; oturum anahtarı ayrı
          sessionStorage alanında tutulduğu için yalnızca sessionStorage temizlenirse oturum kapanır.
        </p>
      </>
    ),
  },
  {
    id: 'gizlilik-haklar',
    title: 'KVKK m.11 Kapsamındaki Haklarınız',
    body: (
      <>
        <p>KVKK’nın 11. maddesi uyarınca veri sorumlusuna başvurarak;</p>
        <PolicyList
          ordered
          items={[
            'Kişisel verilerinizin işlenip işlenmediğini öğrenme,',
            'İşlenmişse buna ilişkin bilgi talep etme,',
            'İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,',
            'Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme,',
            'Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme,',
            'KVKK’da öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme,',
            'Bu işlemlerin, verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,',
            'Münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhe bir sonucun ortaya çıkmasına itiraz etme,',
            'Kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme',
          ]}
        />
        <p>haklarına sahipsiniz.</p>
      </>
    ),
  },
  {
    id: 'gizlilik-basvuru',
    title: 'Başvuru Yolu',
    body: (
      <>
        <p>
          Taleplerinizi <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> adresine e-posta
          ile iletebilirsiniz. Başvurunuzda ad-soyad ve kimliğinizi/oturumunuzu doğrulamaya yarayan
          bilgileri belirtmeniz, talebin doğru kişiye ait olduğunun doğrulanmasını kolaylaştırır.
        </p>
        <p>
          Başvurular en geç <b>30 (otuz) gün</b> içinde ücretsiz olarak yanıtlanır; işin
          ayrıntılılığı gereği gerekirse bu süre bir kez daha, toplamda 30 günü aşmayacak biçimde
          uzatılabilir ve sizden bilgi istenir. Danışan kayıtlarına ilişkin taleplerde, kaydın
          veri sorumlusu olan uzmanın/kurumun doğrulaması istenebilir.
        </p>
      </>
    ),
  },
  {
    id: 'gizlilik-yururluk',
    title: 'Değişiklikler ve Yürürlük',
    body: (
      <>
        <p>
          Bu politika {SITE_URL} üzerinde yayımlanmakla yürürlüğe girer. Mevzuat veya hizmet
          değişikliklerinde güncellenir; önemli değişiklikler uygulama içinde duyurulur. Güncel
          metnin yayınlandığı tarih sayfanın altında “Son güncelleme” olarak gösterilir.
        </p>
      </>
    ),
  },
];

/** Gizlilik & KVKK Politikası sayfası — tam metin, numaralı bölüm düzeniyle. */
export function PrivacyPolicyPage() {
  return (
    <PolicyDoc
      lede="Bu metin; MMPI-566 Çalışma Alanı’nın kullanımı sırasında hangi kişisel verilerin, hangi amaçlarla işlendiğini, saklandığını ve korunduğunu açıklar. Kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve ikincil düzenlemelerine uygun olarak işlenir."
      sections={SECTIONS}
    />
  );
}
