import type { MouseEvent } from 'react';
import { Icon } from './Icon';

/**
 * SSS — Sıkça Sorulan Sorular (/sss).
 *
 * Yanıtlar uygulamanın gerçek davranışını yansıtır: puanlama hattı
 * (T dönüşümü, geçerlik ölçekleri, F-K endeksi), 4 sayfalık optik form ve
 * OMR akışı, veri saklama modeli (cihaz içi hesaplama + Supabase kayıt) ve
 * hesap/erişim kuralları. Bilgi bankası değildir; soru seti bilinçli olarak
 * uygulama kapsamında tutulur.
 */

type FaqItem = {
  q: string;
  a: string[];
};

type FaqGroup = {
  id: string;
  kicker: string;
  title: string;
  items: FaqItem[];
};

const GROUPS: FaqGroup[] = [
  {
    id: 'genel',
    kicker: '01',
    title: 'Genel',
    items: [
      {
        q: 'Bu uygulama nedir ve kimler için tasarlandı?',
        a: [
          'MMPI-566 Çalışma Alanı; Minnesota Çok Yönlü Kişilik Envanteri’nin (MMPI) 566 maddelik biçiminin standardizasyonuna dayalı puanlamasını yapan bir dijital asistandır. A4 optik cevap formu üretimi, taranmış formların optik okunması (OMR), T puanı dönüşümü, geçerlik–tutarlılık analizleri ve kod yorumlamasını tek akışta toplar.',
          'Arayüz yalnızca yetkilendirilmiş ruh sağlığı profesyonelleri (psikolog/psikiyatrist) tarafından kullanılır. Hesaplar yönetici onayıyla açılır; uygulama danışanların doğrudan kullanımına açık değildir.',
        ],
      },
      {
        q: 'Uygulama tanı koyar mı?',
        a: [
          'Koymaz. Uygulama bir karar destek aracıdır: puanları hesaplar, geçerlik sinyallerini özetler ve klinik kaynaklara dayalı yorum metinleri sunar. Nihai klinik değerlendirme, tanı ve tedavi kararı daima testi uygulayan ve değerlendiren uzmanın sorumluluğundadır; bulgular klinik görüşme, öykü ve diğer veri kaynaklarıyla birlikte ele alınmalıdır.',
        ],
      },
      {
        q: 'MMPI telifli bir envanterdir; bu uygulama hangi izinle çalışır?',
        a: [
          'MMPI ve MMPI-2, hak sahiplerinin (University of Minnesota / Pearson) telif kapsamındaki çıkarım araçlarıdır; envanterin ticari çoğaltılması ve dağıtımı hak sahiplerinin iznine tabidir. Bu yazılım, envanteri uygulama yetkisi olan profesyonellerin elindeki mevcut uygulama–değerlendirme akışını dijitalleştiren bağımsız bir puanlama ve kayıt aracıdır; hak sahipleriyle bağlantılı değildir ve onların resmi onayını ifade etmez.',
          'Envanteri klinik ya da araştırma amaçlı kullanacak kurumların, ilgili ülkedeki yasal dağıtıcıdan gereken lisansı aldığından emin olması kullanıcının sorumluluğundadır. Ayrıntılar için Kullanım Koşulları sayfasına bakınız.',
        ],
      },
    ],
  },
  {
    id: 'puanlama',
    kicker: '02',
    title: 'Uygulama ve Puanlama',
    items: [
      {
        q: 'Test kaç maddeden oluşur ve nasıl uygulanır?',
        a: [
          'Envanterin 566 maddelik biçimi temel alınır. Danışan, dört sayfalık A4 optik cevap formunda her maddeyi Doğru / Yanlış olarak işaretler. Form uygulama içindeki Form sekmesinden doğrulanmış PDF olarak yazdırılır; kalemle işaretlenen formlar tarayıcı ya da kamera ile sisteme okutulur.',
        ],
      },
      {
        q: 'T puanı nedir, hangi normlara göre hesaplanır?',
        a: [
          'T puanı, ham puanın ortalaması 50 ve standart sapması 10 olan standart ölçeğe dönüştürülmesidir (T = 50 + 10 × (X − M) / SD). Bu uygulamada dönüşüm, cinsiyete özgü Türk normlarına (Savaşır, 1981) göre yapılır; Mf ölçeğinde kadın normunda ters çevirim dahil klasik standardizasyon uygulanır.',
          'Profil grafiği ve yorum bantları bu T puanları üzerinden üretilir. Norm kaynaklarının tam künyesi için Kaynakça sayfasındaki “01 · Norm ve Puanlama” bölümüne bakınız.',
        ],
      },
      {
        q: 'K düzeltmesi nasıl uygulanır?',
        a: [
          'Savunuculuğu ölçen K ölçeğinin ham puanı, klasik düzeltme tablosuna göre Hs, Pd, Pt, Sc ve Ma ölçeklerine eklenir. Düzeltme, kodun içinde standart ekleme tablosu olarak sabitlenmiştir; uygulama ayrıca K ham puanı için yorum bantları üretir.',
        ],
      },
      {
        q: 'Profil geçerliliği nasıl değerlendirilir?',
        a: [
          'Üç katman birlikte çalışır: (1) geçerlik ölçekleri — “Hiç Bir Şey Diyemem” (?), L, F ve K ham puanları ile T bant yorumları; (2) F−K endeksi — Gough’un abartma göstergesi, 16 üzerindeki değerler kritik uyarı üretir; (3) tutarlılık endeksleri — 16 çiftlik TR (tekrarlanmış madde) endeksi ve 12 çiftlik Dikkatsizlik endeksi.',
          'Boş madde sayısı 31 ve üzerindeyse ya da F ham puanı 23 ve üzerindeyse profil geçersiz sayılır ve yorum ekranında bu açıkça bildirilir. Ayrıca V şekli, tersine V, tümüne Doğru/Yanlış gibi 15 geçerlik konfigürasyonu otomatik tanınır.',
        ],
      },
      {
        q: 'Temel ölçeklerin dışında hangi analizler hesaplanıyor?',
        a: [
          'Cevap dizisi bulunan kayıtlarda madde düzeyi analiz katmanı devreye girer: Goldberg, Taulbee ve Peterson ayırma endeksleri; DSM temelli 11 kişilik bozukluğu eğilim ölçeği (PDI-IV bağlamı); MacAndrew (MAC), MAC-R, AAS, ICAS ve SAP alkol/madde ölçekleri; 13 Wiggins içerik ölçeği; Barron ego gücü (Es), Welsh A/R, aşikâr anksiyete gibi özel ölçekler; intihar, zarar verme, alkol/madde, ajitasyon ve paranoya temalarını tarayan kritik madde listesi ve bunlardan türeyen otomatik klinik izlenimler.',
          'Ham puan ya da cevap dizisi el ile girildiğinde (hızlı giriş) bu katman yerine kaynak tablo bantları gösterilir; madde düzeyi analiz yalnızca 566 maddenin tamamının okunduğu kayıtlarda hesaplanır.',
        ],
      },
      {
        q: 'İki noktalı kod nasıl belirlenir?',
        a: [
          'Kod, klinik ölçek T puanlarındaki en yüksek iki ölçeğin numaralarından oluşturur; klasik uygulama pratiğiyle uyumlu olarak Mf ve Si kod seçimine katılmaz. Yorum metinleri seçilen kod çiftine göre klinik kaynak üzerinden üretilir.',
        ],
      },
    ],
  },
  {
    id: 'tarama',
    kicker: '03',
    title: 'Optik Form ve Tarama',
    items: [
      {
        q: 'Optik formu nereden alırım, nasıl yazdırılır?',
        a: [
          'Form sekmesindeki “Yazdır”, “İndir” ve “Yeni sekmede aç” eylemleri aynı doğrulanmış dört sayfalık A4 PDF’yi kullanır. Formun geometrisi (işaret alanları, hizalama işaretleri ve sayfa QR kodları) depoda otomatik testlerle doğrulanır; yazdırmada sayfa ölçeğinin %100 (fit-to-page kapalı) ve siyah-beyaz olması yeterlidir.'
        ],
      },
      {
        q: 'Taramayı hangi cihazla yapabilirim?',
        a: [
          'İki yol vardır: (1) düz yataklı tarayıcıdan elde edilen görüntü/dosya yükleme — önerilen yöntem; (2) doğrudan kamera ile çekim. Kamera yalnızca güvenli bağlamda (HTTPS) çalışır; yerel geliştirmede localhost güvenli bağlam istisnasıdır. Her iki yolda da sayfa QR kodları sayfa kimliğini belirler, hizalama işaretleri perspektif düzeltmesini sağlar.'
        ],
      },
      {
        q: 'Taramada bir madde yanlış okunursa ne olur?',
        a: [
          'Tara ve gözden geçir akışı, dört sayfanın kabulünden sonra madde düzeyinde inceleme yapmanızı ister; güven ve keskinlik göstergeleri düşük okumalar işaretlenir ve her madde elle düzeltilebilir. Sonuç kaydı ancak gözden geçirmeyi onayladıktan sonra oluşturulur.',
        ],
      },
      {
        q: 'Cevap dizisini elle girebilir miyim?',
        a: [
          'Evet. Hızlı giriş ekranı, 566 maddenin Doğru/Yanlış/boş dizisini ya da ölçek ham puanlarını el ile girmenizi sağlar. Ham puan girişinde profil ve yorum katmanı aynı hesaplama hattıyla üretilir; yalnızca madde düzeyi analizler (tutarlılık endeksleri, içerik ölçekleri, kritik madde taraması) cevap dizisi olmadan hesaplanamaz.',
        ],
      },
    ],
  },
  {
    id: 'gizlilik',
    kicker: '04',
    title: 'Kayıt ve Gizlilik',
    items: [
      {
        q: 'Verilerim nerede saklanır?',
        a: [
          'Optik okuma (OMR) ve profil hesaplamasının tamamı kullanıcının cihazında yapılır; tarayıcı dışına ham görüntü gönderilmez. Kayıt aşamasında ise onaylanan cevap verisi, danışan bilgi formu ve psikolog kimliği kendi kurulumunuza ait Supabase (PostgreSQL) veritabanına yazılır. Uygulama, Google Analytics gibi üçüncü taraf izleyiciler içermez.',
        ],
      },
      {
        q: 'Danışan verisini kimler görebilir?',
        a: [
          'Erişim, veritabanı düzeyinde satır güvenliği (RLS) ile sınırlandırılmıştır: psikolog yalnızca kendi kayıtlarını, Admin ise yönetim görevi için tüm kayıtları görür. Not ve silme işlemleri de bu role göre sınırlandırılır; parolalar uygulama tablolarına hiçbir zaman yazılmaz.',
        ],
      },
      {
        q: 'Oturumum nasıl korunuyor, çerez kullanılıyor mu?',
        a: [
          'Uygulama izleme çerezi kullanmaz. Kimlik oturumu tarayıcının sessionStorage alanında tutulur: aynı sekmede sayfa yenileme (F5) oturumu korur, sekme kapatıldığında oturum düşer. İşlem taslağı ayrı bir yerel depoda tutulur. Veri işleme ayrıntıları için Gizlilik & KVKK Politikası sayfasına bakınız.',
        ],
      },
    ],
  },
  {
    id: 'hesap',
    kicker: '05',
    title: 'Hesap ve Erişim',
    items: [
      {
        q: 'Nasıl hesap açılır?',
        a: [
          'Uygulamada public kayıt ekranı bilinçli olarak yoktur. İlk yönetici hesabı kurulum sırasında Supabase yönetimi (Dashboard/SQL) ile bir kez oluşturulur; sonraki psikolog hesaplarını yalnızca oturum açmış yönetici, yönetim panelinden açar. Böylece her hesabın gerçek bir sorumlu uzmana bağlı olması garanti edilir.',
        ],
      },
      {
        q: 'Şifremi unuttum, ne yapmalıyım?',
        a: [
          'Giriş ekranındaki yönergeyi izleyerek kurum yöneticinizle (Admin) iletişime geçin. Yönetici, hesabınızı sıfırlayabilir ya da size yeni bir erişim oluşturabilir. Hesap güvenliği için parolanızı kimseyle paylaşmayın; uygulama parolayı kendi tablolarında saklamaz.',
        ],
      },
      {
        q: 'Uygulama çevrimdışı çalışır mı?',
        a: [
          'Form yazdırma, optik okuma ve profil hesaplaması tamamen cihazda çalıştığı için bu adımlar çevrimdışı da işler. Oturum açma, kayıt oluşturma ve kayıt listelerine erişim için Supabase bağlantısı gerekir. Yayımlanan tek dosyalık derleme dış kaynak yüklemez.',
        ],
      },
    ],
  },
];

function FaqQuestion({ item }: { item: FaqItem }) {
  return (
    <details className="faq-item">
      <summary className="faq-question">
        <Icon name="arrowRight" size={15} />
        <span>{item.q}</span>
      </summary>
      <div className="faq-answer">
        {item.a.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </details>
  );
}

/** SSS sayfası — gruplanmış sıkça sorulan sorular, doğal accordion davranışıyla. */
export function FaqPage() {
  return (
    <div className="faq-page">
      <p className="info-lede">
        Bu sayfa, uygulamanın kullanımı hakkında en sık gelen soruları toplar. Yanıtlar, yazılımın
        belgelenmiş davranışını ve dayandığı puanlama standardını yansıtır; klinik öneri içermez.
      </p>
      <nav className="faq-toc" aria-label="SSS bölümleri">
        {GROUPS.map(group => (
          <a key={group.id} href={`#sss-${group.id}`} className="faq-toc-link" onClick={goToSection(group.id)}>
            <span className="faq-toc-no">{group.kicker}</span>
            <span>{group.title}</span>
            <span className="faq-toc-count">{group.items.length} soru</span>
          </a>
        ))}
      </nav>

      {GROUPS.map(group => (
        <section key={group.id} id={`sss-${group.id}`} className="faq-group" aria-label={group.title}>
          <header className="faq-group-head">
            <span className="sources-kicker">{group.kicker} · {group.title.toUpperCase()}</span>
            <h2>{group.title}</h2>
          </header>
          <div className="faq-list">
            {group.items.map(item => (
              <FaqQuestion key={item.q} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Sayfa içi bölüm atlaması: uygulama rotası korunur, içerik içinde kaydırılır. */
function goToSection(id: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(`sss-${id}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}
