import { PolicyDoc } from './PolicyDoc';
import { APP_NAME, CONTACT_EMAIL } from '../site';

export function PrivacyPolicyPage() {
  return (
    <PolicyDoc
      lede={`${APP_NAME} çalışma alanı, ruh sağlığı profesyonellerinin danışan dosyası ve ölçek kayıtlarını yönetmesi içindir. Bu metin, uygulamanın gerçek veri akışını esas alır.`}
      sections={[
        {
          id: 'veri',
          title: 'İşlenen veriler',
          body: (
            <p>
              Danışan kimlik ve iletişim bilgileri, anamnez, SOAP seans notu, randevu, görev, belge, ölçek yanıtları ve bunlardan türetilen puan özetleri işlenir. Ölçek yanıtları sağlık verisi niteliğindedir. Uygulama kamera, mikrofon veya konum istemez.
            </p>
          ),
        },
        {
          id: 'amac',
          title: 'Amaç ve hukukî sebep',
          body: (
            <p>
              Amaç, yetkili uzmanın kendi danışan dosyasını yürütmesidir. Hukukî sebep, uzmanın mesleki faaliyetini yürütmesi ve — bulut kullanılıyorsa — açık yapılandırma ile sınırlı hizmet sağlayıcı ilişkisidir. Halka açık kayıt ve pazarlama profili yoktur.
            </p>
          ),
        },
        {
          id: 'yer',
          title: 'Saklama yeri',
          body: (
            <p>
              Varsayılan mod cihaz içidir (tarayıcı yerel deposu). Bu depo şifreli bir kasa değildir; cihaz erişimi kullanıcının sorumluluğundadır. JSON yedek, kullanıcının indirdiği dosyadır. Supabase yapılandırılırsa kayıtlar kurum kimliği ile ayrılır, anon rolü tabloya yazamaz, belgeler özel kovada imzalı bağlantı ile okunur.
            </p>
          ),
        },
        {
          id: 'aktarim',
          title: 'Aktarım',
          body: (
            <p>
              Yerel modda veri üçüncü bir sunucuya gitmez. Özet taslağı özelliği metni modele göndermez; tarayıcıda ilk cümleleri ayıklar. Bulut modunda altyapı sağlayıcısı yalnızca yapılandırılan projenin işletmecisidir. Hizmet rolü anahtarı tarayıcıya konmaz.
            </p>
          ),
        },
        {
          id: 'haklar',
          title: 'Haklar',
          body: (
            <p>
              Danışan, verisine ilişkin taleplerini kendisini değerlendiren uzmana iletir. Uzman yedek indirebilir, kaydı silebilir veya bulutta kurum politikasına göre başvuru işletebilir. İletişim: {CONTACT_EMAIL}.
            </p>
          ),
        },
      ]}
    />
  );
}
