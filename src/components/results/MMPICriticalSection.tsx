import type { MMPIProfile } from '../../scoring/mmpiScoring';
import type { ImpressionTone } from '../../scoring/mmpiCritical';
import { DisclosureCard } from './Disclosure';
import { Icon } from '../Icon';
import type { IconName } from '../Icon';

const toneIcon: Record<ImpressionTone, IconName> = { ok: 'checkCircle', watch: 'info', alert: 'alert' };

/**
 * Kritik Bulgular ve İzlenimler — profilden ve kritik maddelerden türetilen
 * yapılandırılmış uyarılar (intihar riski, yardım çağrısı, tedaviye yanıt
 * notu vb.) ile tetiklenen kritik maddelerin listesi. Tanı değil, uygulayıcı
 * uzman için kontrol listesidir.
 */
export function MMPICriticalSection({ profile }: { profile: MMPIProfile }) {
  const itemLevel = profile.itemLevel;

  if (!itemLevel) {
    return (
      <div className="mmpi-tab-panel">
        <div className="mmpi-box info">
          <Icon name="info" size={14} />
          <span>
            {' '}Kritik madde analizi madde düzeyinde (566) cevap verisi gerektirir. Bu kayıt ham puan yöntemiyle
            girildiği için kritik maddeler listelenemiyor; ölçek temelli uyarılar “Geçerlik Analizleri” bölümünde yer
            alır.
          </span>
        </div>
      </div>
    );
  }

  const { impressions, criticalItems } = itemLevel;
  const alertCount = impressions.filter(i => i.tone === 'alert').length;
  const criticalByCategory = new Map<string, number>();
  for (const hit of criticalItems) {
    criticalByCategory.set(hit.label, (criticalByCategory.get(hit.label) ?? 0) + 1);
  }

  return (
    <div className="mmpi-tab-panel">
      <div>
        <h4 className="mmpi-section-title">Klinik İzlenimler &amp; Bulgular</h4>
        {impressions.length === 0 ? (
          <div className="mmpi-box ok">
            <Icon name="checkCircle" size={14} />
            <span> Profil üzerinden otomatik uyarı üretilmedi.</span>
          </div>
        ) : (
          <div className="impression-list">
            {impressions.map((impression, index) => (
              <div key={index} className={`impression-item tone-${impression.tone}`}>
                <Icon name={toneIcon[impression.tone]} size={16} />
                <div>
                  <b>{impression.title}</b>
                  <p>{impression.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {alertCount > 0 && (
          <p className="mmpi-summary-note">
            {alertCount} acil dikkat gerektiren bulgu var — bu bulgular tanı değil, klinik görüşme ve güvenlik
            değerlendirmesi için uyarıdır.
          </p>
        )}
      </div>

      <div className="mmpi-section-block">
        <h4 className="mmpi-section-title">Kritik Patolojik Maddeler</h4>

        {criticalItems.length === 0 ? (
          <div className="mmpi-box ok">
            <Icon name="checkCircle" size={14} />
            <span> Kritik maddelerden hiçbiri doğrulanmadı.</span>
          </div>
        ) : (
          <DisclosureCard
            title="Tetiklenen Maddeler"
            note={`${criticalItems.length} madde işaretlendi — madde listesi varsayılan olarak kapalıdır`}
            value={<span className="mmpi-disc-hint">{criticalItems.length} madde</span>}
            tone="alert"
          >
            <div className="mmpi-summary-table-wrap">
              <table className="mmpi-summary-table critical-table">
                <thead>
                  <tr>
                    <th className="row-head">Madde No</th>
                    <th>Cevap</th>
                    <th>Klinik Kategori</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalItems.map(hit => (
                    <tr key={hit.id}>
                      <th className="row-head mono-sub">{hit.id}</th>
                      <td>
                        <span className={`ans-chip ${hit.response === 1 ? 'chip-d' : 'chip-y'}`}>
                          {hit.response === 1 ? 'DOĞRU' : 'YANLIŞ'}
                        </span>
                      </td>
                      <td>{hit.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mmpi-summary-note">
              Madde metinleri telifli olduğu için gösterilmez; numaralar MMPI-566 formundaki sırayı izler. Kritik
              maddeler tek başına tanı koydurmaz — içerikleri klinik görüşmede doğrudan sorulmalıdır.
            </p>
          </DisclosureCard>
        )}
      </div>
    </div>
  );
}
