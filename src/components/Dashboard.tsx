import { useEffect, useState, useMemo } from 'react';
import type { AuthenticatedUser } from '../auth/authTypes';
import type {
  Client,
  SoapSession,
  Appointment,
  BeckDepressionResult,
  BeckAnxietyResult,
  Scl90Result,
} from '../clinical/clinicalTypes';
import {
  getClients,
  getSoapSessions,
  getAppointments,
  getBeckDepressionTests,
  getBeckAnxietyTests,
  getScl90Tests,
  subscribeClinicalStore,
} from '../clinical/clinicalStore';
import { DataManagementModal } from './clinical/DataManagementModal';
import { Icon } from './Icon';
import { navigate } from '../router';
import '../styles/dashboard.css';

type Props = { user: AuthenticatedUser };

export function Dashboard({ user }: Props) {
  const [clients, setClients] = useState<Client[]>(() => getClients());
  const [sessions, setSessions] = useState<SoapSession[]>(() => getSoapSessions());
  const [appointments, setAppointments] = useState<Appointment[]>(() => getAppointments());
  const [bdiTests, setBdiTests] = useState<BeckDepressionResult[]>(() => getBeckDepressionTests());
  const [baiTests, setBaiTests] = useState<BeckAnxietyResult[]>(() => getBeckAnxietyTests());
  const [scl90Tests, setScl90Tests] = useState<Scl90Result[]>(() => getScl90Tests());

  const [backupModalOpen, setBackupModalOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeClinicalStore(() => {
      setClients(getClients());
      setSessions(getSoapSessions());
      setAppointments(getAppointments());
      setBdiTests(getBeckDepressionTests());
      setBaiTests(getBeckAnxietyTests());
      setScl90Tests(getScl90Tests());
    });
    return unsub;
  }, []);

  const todayStr = new Date().toISOString().split('T')[0]!;

  const todayAppointments = useMemo(() => {
    return appointments
      .filter(a => a.date === todayStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, todayStr]);

  const activeClientsCount = useMemo(() => {
    return clients.filter(c => c.status === 'active').length;
  }, [clients]);

  // Riskli vakalar (BDI Madde 9 intihar, SOAP high risk veya SCL-90 GSI >= 1.8)
  const criticalAlerts = useMemo(() => {
    const alerts: { clientName: string; reason: string; type: 'danger' | 'warning' }[] = [];

    // BDI intihar riski
    bdiTests.forEach(t => {
      if (t.suicideRisk) {
        alerts.push({
          clientName: t.clientName,
          reason: `Beck Depresyon Madde 9 (İntihar düşünceleri) için ${t.suicideItemScore} puan bildirildi.`,
          type: 'danger',
        });
      }
    });

    // SOAP yüksek risk
    sessions.forEach(s => {
      if (s.riskLevel === 'high') {
        alerts.push({
          clientName: s.clientName,
          reason: `Seans #${s.sessionNumber} (${s.date}): Yüksek risk uyarısı (${s.riskNotes || 'Detay belirtilmedi'}).`,
          type: 'danger',
        });
      }
    });

    return alerts;
  }, [bdiTests, sessions]);

  return (
    <div className="dashboard-container clinical-container">
      {/* Karşılama ve Hızlı Yedekleme */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="clinical-kicker">
            <span className="clinical-kicker-dot" />
            <span>Klinik Yönetim Paneli</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 300, margin: '4px 0 2px' }}>
            İyi Çalışmalar, {user.firstName} {user.lastName}
          </h2>
          <div style={{ fontSize: 13, color: 'var(--soft)' }}>
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setBackupModalOpen(true)}
          >
            <Icon name="database" size={14} />
            <span>Veri Yedekleme &amp; Demo</span>
          </button>
        </div>
      </div>

      {/* 4 Ana Metrik Kartı */}
      <div className="stats-grid-4">
        <div className="metric-card">
          <div className="metric-card-head">
            <span>Aktif Danışanlar</span>
            <div className="metric-icon icon-accent">
              <Icon name="users" size={18} />
            </div>
          </div>
          <div className="metric-card-value">{activeClientsCount}</div>
          <span className="metric-card-sub">Toplam {clients.length} kayıtlı dosya</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-head">
            <span>Bugünkü Randevular</span>
            <div className="metric-icon icon-success">
              <Icon name="calendar" size={18} />
            </div>
          </div>
          <div className="metric-card-value">{todayAppointments.length}</div>
          <span className="metric-card-sub">{todayAppointments.filter(a => a.status === 'completed').length} seans tamamlandı</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-head">
            <span>Toplam Seans Notu</span>
            <div className="metric-icon">
              <Icon name="clipboard" size={18} />
            </div>
          </div>
          <div className="metric-card-value">{sessions.length}</div>
          <span className="metric-card-sub">Kayıtlı SOAP seans arşivi</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-head">
            <span>Psikometrik Testler</span>
            <div className="metric-icon icon-warning">
              <Icon name="pulse" size={18} />
            </div>
          </div>
          <div className="metric-card-value">{bdiTests.length + baiTests.length + scl90Tests.length}</div>
          <span className="metric-card-sub">MMPI, Beck ve SCL-90 kayıtları</span>
        </div>
      </div>

      {/* Kritik Güvenlik Uyarıları Paneli (Varsa) */}
      {criticalAlerts.length > 0 && (
        <div style={{ background: 'var(--danger-tint)', border: '1px solid var(--danger-border)', padding: '16px 20px', borderRadius: 'var(--radius-md)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger-ink)', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
            <Icon name="alert" size={18} />
            <span>DİKKAT: Kritik Klinik Risk Uyarıları ({criticalAlerts.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {criticalAlerts.map((alert, idx) => (
              <div key={idx} style={{ fontSize: 13, color: 'var(--danger-ink)' }}>
                • <strong>{alert.clientName}:</strong> {alert.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hızlı Eylem Başlatma Çubuğu */}
      <div className="modern-table-card" style={{ padding: 20, marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600 }}>Hızlı Klinik İşlemler</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            onClick={() => navigate('/danisanlar')}
          >
            <Icon name="users" size={16} />
            <span>Danışan Dosyaları</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            onClick={() => navigate('/seanslar')}
          >
            <Icon name="clipboard" size={16} />
            <span>SOAP Seans Notu Yaz</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            onClick={() => navigate('/islem')}
          >
            <Icon name="scan" size={16} />
            <span>MMPI-566 OMR / Başlat</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            onClick={() => navigate('/testler/beck-depresyon')}
          >
            <Icon name="pulse" size={16} />
            <span>Beck Depresyon (BDI)</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            onClick={() => navigate('/testler/beck-anksiyete')}
          >
            <Icon name="activity" size={16} />
            <span>Beck Anksiyete (BAI)</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            onClick={() => navigate('/testler/scl90')}
          >
            <Icon name="layers" size={16} />
            <span>SCL-90-R Testi</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            onClick={() => navigate('/takvim')}
          >
            <Icon name="calendar" size={16} />
            <span>Randevu Takvimi</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
            onClick={() => navigate('/raporlar')}
          >
            <Icon name="fileText" size={16} />
            <span>Klinik Rapor Üret</span>
          </button>
        </div>
      </div>

      {/* İki Kolonlu Panel: Bugünkü Randevular & Son Seanslar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {/* Bugünkü Randevular */}
        <div className="modern-table-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Bugünkü Seans Programı</h3>
            <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/takvim')}>
              Tüm Takvim
            </button>
          </div>

          {todayAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--soft)', fontSize: 13 }}>
              Bugün için planlanmış bir randevu bulunmuyor.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todayAppointments.map(a => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--bg-soft)',
                    borderRadius: 6,
                    border: '1px solid var(--hairline)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--accent-ink)' }}>
                      {a.time}
                    </div>
                    <div>
                      <strong style={{ fontSize: 13.5 }}>{a.clientName}</strong>
                      <div style={{ fontSize: 11.5, color: 'var(--soft)' }}>{a.sessionType} · {a.location}</div>
                    </div>
                  </div>
                  <span className={`badge ${a.status === 'completed' ? 'badge-active' : 'badge-followup'}`}>
                    {a.status === 'completed' ? 'Tamamlandı' : 'Planlandı'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Son SOAP Seansları */}
        <div className="modern-table-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Son Tamamlanan Seanslar</h3>
            <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/seanslar')}>
              Tüm Notlar
            </button>
          </div>

          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--soft)', fontSize: 13 }}>
              Henüz kaydedilmiş bir seans notu yok.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessions.slice(0, 4).map(s => (
                <div
                  key={s.id}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-soft)',
                    borderRadius: 6,
                    border: '1px solid var(--hairline)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13.5 }}>{s.clientName} (Seans #{s.sessionNumber})</strong>
                    <div style={{ fontSize: 11.5, color: 'var(--soft)', marginTop: 2 }}>
                      {s.date} · {s.sessionType}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => navigate(`/danisanlar/${s.clientId}`)}
                  >
                    Dosya
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Yedekleme Modalı */}
      {backupModalOpen && (
        <DataManagementModal onClose={() => setBackupModalOpen(false)} />
      )}
    </div>
  );
}
