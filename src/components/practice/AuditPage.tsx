import { useEffect, useState } from 'react';
import { auditActionLabel, auditEntityLabel, getAuditLog, subscribePracticeStore, type AuditEvent } from '../../clinical/practiceStore';
import { Icon } from '../Icon';
import { navigate } from '../../router';

export function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>(() => getAuditLog());
  useEffect(() => subscribePracticeStore(() => setEvents(getAuditLog())), []);

  return (
    <div className="clinical-container">
      <div className="clinical-header">
        <div className="clinical-title-wrap">
          <div className="clinical-kicker"><span className="clinical-kicker-dot" /><span>Kayıt izi</span></div>
          <h1>Denetim kaydı</h1>
          <p>Bu cihazdaki son kaydetme ve silme işlemleri. Bulut açıksa sunucu kendi kaydını ayrıca tutar.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => navigate('/ayarlar')}>
          <Icon name="left" size={14} />
          <span>Ayarlara dön</span>
        </button>
      </div>

      {/*
        The local log is browser storage: the person holding the device can edit or
        clear it. It must not be presented as a trustworthy record. The authoritative
        log is the server-side `audit_logs` table, which is append-only for
        `authenticated` (see supabase/migrations/20260925000000_p0_clinical_workflow.sql).
      */}
      <div className="warning-banner" role="note">
        <strong>Bu liste tarayıcı belleğinde tutulur ve bu cihazda değiştirilebilir;</strong> hukuki bir
        kanıt olarak kullanılamaz. Yetkili kayıt izi veritabanındaki <code>audit_logs</code> tablosudur —
        o tablo yalnızca ekleme kabul eder, giriş yapmış kullanıcılardan
        <code> UPDATE / DELETE / TRUNCATE</code> yetkileri veritabanı seviyesinde kaldırılmıştır.
      </div>

      {events.length === 0 ? (
        <div className="empty-state-card"><h4>Kayıt yok</h4><p>Kaydetme ve silme işlemleri burada görünür.</p></div>
      ) : (
        <div className="client-table-wrap mobile-card-table">
          <table className="client-table" data-mobile-cards>
            <thead>
              <tr><th>Zaman</th><th>İşlem</th><th>Varlık</th><th>Özet</th></tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td data-label="Zaman">{new Date(event.at).toLocaleString('tr-TR')}</td>
                  <td data-label="İşlem">{auditActionLabel(event.action)}</td>
                  <td data-label="Varlık">{auditEntityLabel(event.entity)}</td>
                  <td data-label="Özet">{event.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
