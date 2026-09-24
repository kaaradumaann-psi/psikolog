import { useEffect, useState } from 'react';
import { getAuditLog, subscribePracticeStore, type AuditEvent } from '../../clinical/practiceStore';
import { Icon } from '../Icon';
import { navigate } from '../../router';

export function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>(() => getAuditLog());
  useEffect(() => subscribePracticeStore(() => setEvents(getAuditLog())), []);

  return (
    <div className="clinical-container">
      <div className="clinical-header">
        <div className="clinical-title-wrap">
          <div className="clinical-kicker"><span className="clinical-kicker-dot" /><span>İz</span></div>
          <h1>Denetim kaydı</h1>
          <p>Bu cihazdaki son işlemler. Bulut modunda tablo tetikleyicileri ayrıca sunucu tarafında yazar; istemci o izi silemez.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => navigate('/ayarlar')}>
          <Icon name="left" size={14} />
          <span>Ayarlara dön</span>
        </button>
      </div>
      {events.length === 0 ? (
        <div className="empty-state-card"><h4>Kayıt yok</h4><p>Kaydetme ve silme işlemleri burada görünür.</p></div>
      ) : (
        <div className="client-table-wrap">
          <table className="client-table">
            <thead>
              <tr><th>Zaman</th><th>İşlem</th><th>Varlık</th><th>Özet</th></tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.at).toLocaleString('tr-TR')}</td>
                  <td>{event.action}</td>
                  <td>{event.entity}</td>
                  <td>{event.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
