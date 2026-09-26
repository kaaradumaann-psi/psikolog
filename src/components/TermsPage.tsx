import { PolicyDoc } from './PolicyDoc';
import { APP_NAME, COPYRIGHT_HOLDER } from '../site';

export function TermsPage() {
  return (
    <PolicyDoc
      lede={`${APP_NAME}, yetkili ruh sağlığı profesyonelleri için klinik dosya ve karar destek aracıdır. Tanı, tedavi ve güvenlik kararının sorumluluğu uygulayıcıdadır.`}
      sections={[
        {
          id: 'kapsam',
          title: 'Kapsam',
          body: (
            <p>
              Yazılım; danışan kaydı, anamnez, formülasyon, güvenlik planı, SOAP seans, randevu, görev, not, belge, rapor ve Beck Depresyon, Beck Anksiyete, SCL-90-R, GAD-7, PHQ-9 uygulamalarını kapsar.
            </p>
          ),
        },
        {
          id: 'yetki',
          title: 'Yetkinlik',
          body: (
            <p>
              Hesabı yalnızca ölçek uygulamaya ve psikolojik değerlendirme yürütmeye yetkili kişiler kullanır. Halka açık kayıt kapalıdır. Yönetici, kullanıcı oluşturma yetkisini Edge Function dışında tarayıcıdan genişletemez.
            </p>
          ),
        },
        {
          id: 'olcek',
          title: 'Ölçeklerin sınırı',
          body: (
            <p>
              Puanlar ve şiddet bantları tarama amaçlıdır. İntihar maddesi uyarısı bir protokol hatırlatıcısıdır, risk değerlendirmesinin yerine geçmez. Yapay özet tanı cümlesi üretmez ve test puanı uydurmaz.
            </p>
          ),
        },
        {
          id: 'telif',
          title: 'Telif',
          body: (
            <p>
              Arayüz ve bu deponun özgün kodu {COPYRIGHT_HOLDER}’a aittir. Beck envanterleri ile SCL-90-R® telif, marka ve test güvenliği koruması altındaki lisanslı materyallerdir; çalışma alanı bunlar için kullanım veya çoğaltma lisansı sağlamaz. Uygulayıcı resmî materyali ve gerekli hakkı ayrıca temin eder. PHQ-9 ve GAD-7, geliştiricilerinin ve Pfizer Inc. erişim beyanı uyarınca izin gerekmeksizin çoğaltılabilir, çevrilebilir, gösterilebilir ve dağıtılabilir. Tüm araçlarda mesleki yetkinlik ve klinik sorumluluk uygulayıcıya aittir.
            </p>
          ),
        },
      ]}
    />
  );
}
