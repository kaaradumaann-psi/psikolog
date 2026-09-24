import { useEffect, useMemo, useState } from 'react';
import type { AuthenticatedUser } from '../auth/authTypes';
import {
  addDays,
  buildAttention,
  buildSessionPreps,
  localDateISO,
} from '../clinical/casework';
import type { CaseSnapshot, SessionPrep } from '../clinical/casework';
import {
  getAppointments,
  getBeckAnxietyTests,
  getBeckDepressionTests,
  getClients,
  getScl90Tests,
  getSoapSessions,
  subscribeClinicalStore,
} from '../clinical/clinicalStore';
import {
  getFormulations,
  getSafetyPlans,
  getScreenings,
  getTasks,
  subscribePracticeStore,
} from '../clinical/practiceStore';
import { DataManagementModal } from './clinical/DataManagementModal';
import { ScoreChips } from './clinical/ScoreChips';
import { Icon } from './Icon';
import { navigate } from '../router';
import '../styles/dashboard.css';

type Props = { user: AuthenticatedUser };

const STATUS_LABEL: Record<SessionPrep['status'], string> = {
  scheduled: 'Planlandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  noshow: 'Gelmedi',
};

function loadSnapshot(today: string): CaseSnapshot {
  return {
    today,
    clients: getClients().map((client) => ({ id: client.id, firstName: client.firstName, lastName: client.lastName })),
    sessions: getSoapSessions(),
    appointments: getAppointments(),
    bdi: getBeckDepressionTests(),
    bai: getBeckAnxietyTests(),
    scl: getScl90Tests(),
    screenings: getScreenings(),
    tasks: getTasks(),
    formulations: getFormulations(),
    safetyPlans: getSafetyPlans(),
  };
}

export function Dashboard({ user }: Props) {
  const today = localDateISO();
  const [snapshot, setSnapshot] = useState<CaseSnapshot>(() => loadSnapshot(today));
  const [backupModalOpen, setBackupModalOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setSnapshot(loadSnapshot(localDateISO()));
    const unsubClinical = subscribeClinicalStore(refresh);
    const unsubPractice = subscribePracticeStore(refresh);
    return () => {
      unsubClinical();
      unsubPractice();
    };
  }, []);

  const preps = useMemo(() => buildSessionPreps(snapshot), [snapshot]);
  const attention = useMemo(() => buildAttention(snapshot), [snapshot]);
  const tomorrow = addDays(snapshot.today, 1);
  const tomorrowAppointments = snapshot.appointments
    .filter((item) => item.date === tomorrow && item.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));
  const openTasks = snapshot.tasks.filter((task) => task.status === 'todo' || task.status === 'in_progress').length;
  const activeClients = snapshot.clients.length;

  const nextPrep = preps.find((item) => item.status === 'scheduled') ?? preps[0];
  const todayLabel = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Istanbul',
  });

  return (
    <div className="dashboard-container clinical-container day-board">
      <section className="desk">
        <div className="desk-date">
          <p>{todayLabel}</p>
          <h1>Bugünün tahtası</h1>
          <span>{user.firstName} {user.lastName}</span>
        </div>
        <div className="desk-now">
          {nextPrep ? (
            <>
              <p>Sıradaki görüşme</p>
              <strong>{nextPrep.time}</strong>
              <span>{nextPrep.clientName}</span>
              <button type="button" className="btn-primary btn-sm" onClick={() => navigate(`/danisanlar/${nextPrep.clientId}`)}>Dosyayı aç</button>
            </>
          ) : (
            <>
              <p>Bugün için randevu yok</p>
              <strong>Tahta boş</strong>
              <span>İlk dosyayı açın veya takvime bir saat yazın.</span>
              <div className="desk-now-actions">
                <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/danisanlar')}>Dosya aç</button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/takvim')}>Takvim</button>
              </div>
            </>
          )}
        </div>
        <button type="button" className="btn-secondary btn-sm desk-backup" onClick={() => setBackupModalOpen(true)}>
          <Icon name="database" size={14} />
          <span>Yedek</span>
        </button>
      </section>

      <nav className="desk-rail" aria-label="Günün özeti">
        <button type="button" onClick={() => navigate('/takvim')}>
          <strong>{preps.length}</strong>
          <span>Bugünkü seans</span>
        </button>
        <button type="button" onClick={() => navigate('/danisanlar')}>
          <strong>{attention.length}</strong>
          <span>Dikkat</span>
        </button>
        <button type="button" onClick={() => navigate('/gorevler')}>
          <strong>{openTasks}</strong>
          <span>Açık görev</span>
        </button>
        <button type="button" onClick={() => navigate('/danisanlar')}>
          <strong>{activeClients}</strong>
          <span>Dosya</span>
        </button>
      </nav>

      {snapshot.clients.length === 0 && (
        <section className="modern-table-card empty-prep">
          <h3>İlk dosya sizden</h3>
          <p>Örnek kayıt yok. Danışan, seans ve ölçek bu dosyaya bağlanır.</p>
          <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/danisanlar')}>Danışan dosyası aç</button>
        </section>
      )}

      {attention.length > 0 && (
        <section className="attention-panel">
          <h3><Icon name="alert" size={16} /> Seans öncesi bakılacaklar</h3>
          <ul>
            {attention.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => navigate(`/danisanlar/${item.clientId}`)}>
                  <strong className={item.severity === 'danger' ? 'attention-danger' : ''}>{item.clientName}</strong>
                  <span>{item.title}</span>
                  <small>{item.detail}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="section-row">
          <h3>Bugünkü hazırlık</h3>
          <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/takvim')}>Takvim</button>
        </div>
        {preps.length === 0 ? (
          <div className="modern-table-card empty-prep">Bugün için randevu yok. Yarınki liste aşağıda.</div>
        ) : (
          <div className="prep-list">
            {preps.map((prep) => (
              <article key={prep.appointmentId} className={`prep-card status-${prep.status}`}>
                <div className="prep-time">
                  <strong>{prep.time}</strong>
                  <span>{prep.durationMinutes} dk</span>
                </div>
                <div className="prep-body">
                  <div className="prep-title">
                    <h4>{prep.clientName}</h4>
                    <span className={`badge ${prep.status === 'completed' ? 'badge-active' : prep.status === 'noshow' ? 'badge-risk-high' : 'badge-followup'}`}>
                      {STATUS_LABEL[prep.status]}
                    </span>
                  </div>
                  <p className="prep-meta">{prep.sessionType} · {prep.location}</p>
                  {prep.lastAssessment && (
                    <p className="prep-last">Son seans #{prep.lastSessionNumber} · {prep.lastSessionDate}: {prep.lastAssessment}</p>
                  )}
                  <ScoreChips readings={prep.scores} />
                  {prep.checks.length > 0 && (
                    <ul className="prep-checks">
                      {prep.checks.map((check) => <li key={check}>{check}</li>)}
                    </ul>
                  )}
                  <div className="prep-actions">
                    <button type="button" className="btn-primary btn-sm" onClick={() => navigate(`/danisanlar/${prep.clientId}`)}>Dosyayı aç</button>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => navigate(`/danisanlar/${prep.clientId}?sekme=formulasyon`)}>Formülasyon</button>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/seanslar')}>Seans notu</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {tomorrowAppointments.length > 0 && (
        <section className="modern-table-card tomorrow-card">
          <h3>Yarın</h3>
          <ul>
            {tomorrowAppointments.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => navigate(`/danisanlar/${item.clientId}`)}>
                  <strong>{item.time}</strong> {item.clientName}
                  <span>{item.sessionType}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="day-board-note">Ölçek bantları tarama içindir. Güvenlik maddesi pozitifse karar ölçeğe değil, görüşmeye aittir.</p>
      {backupModalOpen && <DataManagementModal onClose={() => setBackupModalOpen(false)} />}
    </div>
  );
}
