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
import type { IconName } from './Icon';
import { navigate } from '../router';

type Props = { user: AuthenticatedUser };

const STATUS_LABEL: Record<SessionPrep['status'], string> = {
  scheduled: 'Planlandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  noshow: 'Gelmedi',
};

const SHORTCUTS: { icon: IconName; title: string; detail: string; path: string }[] = [
  { icon: 'clipboard', title: 'Seans notları', detail: 'SOAP kayıtlarını görüntüle', path: '/seanslar' },
  { icon: 'activity', title: 'Değerlendirmeler', detail: 'Ölçekleri ve sonuçları aç', path: '/testler' },
  { icon: 'fileText', title: 'Klinik raporlar', detail: 'Raporları hazırla ve izle', path: '/raporlar' },
];

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
  const [clock, setClock] = useState(() => new Date());
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date());
      const currentDay = localDateISO();
      setSnapshot((current) => current.today === currentDay ? current : loadSnapshot(currentDay));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const preps = useMemo(() => buildSessionPreps(snapshot), [snapshot]);
  const attention = useMemo(() => buildAttention(snapshot), [snapshot]);
  const tomorrow = addDays(snapshot.today, 1);
  const tomorrowAppointments = snapshot.appointments
    .filter((item) => item.date === tomorrow && item.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));
  const openTasks = snapshot.tasks.filter((task) => task.status === 'todo' || task.status === 'in_progress').length;
  const nowTime = clock.toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false });
  const nextPrep = preps.find((item) => item.status === 'scheduled' && item.time >= nowTime);
  const todayLabel = clock.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  });
  const summary: { icon: IconName; label: string; value: number; path: string; alert?: boolean }[] = [
    { icon: 'calendar', label: 'Bugünkü görüşme', value: preps.filter((item) => item.status !== 'cancelled').length, path: '/takvim' },
    { icon: 'alert', label: 'İzlem uyarısı', value: attention.length, path: '/danisanlar', alert: attention.length > 0 },
    { icon: 'checkCircle', label: 'Açık görev', value: openTasks, path: '/gorevler' },
    { icon: 'users', label: 'Danışan dosyası', value: snapshot.clients.length, path: '/danisanlar' },
  ];

  return (
    <div className="dashboard-container day-board">
      <section className="desk" aria-labelledby="dashboard-title">
        <div className="desk-intro">
          <div className="desk-eyebrow"><span className="desk-eyebrow-dot" /> GÜNLÜK ÇALIŞMA ALANI <span className="desk-eyebrow-sep">/</span> {todayLabel}</div>
          <h1 id="dashboard-title">Bugünün tahtası<span className="desk-title-dot" aria-hidden="true">.</span></h1>
          <p>Merhaba {user.firstName}. Danışanlarınız, görüşmeleriniz ve klinik notlarınız için sakin bir başlangıç noktası.</p>
          <div className="desk-actions">
            <button type="button" className="btn-primary" onClick={() => navigate('/danisanlar?yeni=1')}>
              <Icon name="plus" size={17} /> Yeni danışan
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/takvim')}>
              Takvimi aç <Icon name="arrowRight" size={16} />
            </button>
          </div>
        </div>
        <div className="desk-now">
          <div className="desk-now-top">
            <span className="desk-now-symbol"><Icon name="calendar" size={19} /></span>
            <span>{nextPrep ? 'SIRADAKİ GÖRÜŞME' : 'BUGÜNKÜ PLAN'}</span>
          </div>
          {nextPrep ? (
            <>
              <strong>{nextPrep.time}</strong>
              <span className="desk-now-name">{nextPrep.clientName}</span>
              <span className="desk-now-detail">{nextPrep.sessionType} · {nextPrep.durationMinutes} dk</span>
              <button type="button" onClick={() => navigate(`/danisanlar/${nextPrep.clientId}`)}>
                Danışan dosyasını aç <Icon name="arrowRight" size={16} />
              </button>
            </>
          ) : (
            <>
              <strong>Takvim sakin.</strong>
              <span className="desk-now-detail">Bugün için planlanmış yeni bir görüşme yok.</span>
              <button type="button" onClick={() => navigate('/takvim')}>
                Takvime göz at <Icon name="arrowRight" size={16} />
              </button>
            </>
          )}
        </div>
      </section>

      <nav className="desk-rail" aria-label="Çalışma alanı özeti">
        {summary.map((item) => (
          <button type="button" key={item.label} className={item.alert ? 'has-attention' : ''} onClick={() => navigate(item.path)} aria-label={`${item.label}: ${item.value}`}>
            <span className="desk-rail-icon"><Icon name={item.icon} size={19} /></span>
            <strong>{item.value}</strong>
            <span className="desk-rail-label">{item.label}</span>
            <Icon name="arrowRight" size={16} className="desk-rail-arrow" />
          </button>
        ))}
      </nav>

      {snapshot.clients.length === 0 ? (
        <>
          <section className="onboarding-panel" aria-labelledby="onboarding-title">
            <div className="onboarding-intro">
              <span className="board-eyebrow">İLK ADIMLAR</span>
              <h2 id="onboarding-title">Her şey bir dosyayla başlar.</h2>
              <p>Henüz kayıtlı danışan yok. Önce bir dosya oluşturun; ardından randevuları, seans notlarını ve değerlendirmeleri aynı dosyada takip edin.</p>
              <button type="button" className="btn-primary" onClick={() => navigate('/danisanlar?yeni=1')}>
                İlk danışanı ekle <Icon name="arrowRight" size={16} />
              </button>
            </div>
            <ol className="onboarding-steps">
              <li><span>01</span><div><strong>Danışan dosyasını açın</strong><small>Temel bilgileri dosyada düzenleyin.</small></div><Icon name="users" size={19} /></li>
              <li><span>02</span><div><strong>Görüşmeyi planlayın</strong><small>Takvimde randevularınızı izleyin.</small></div><Icon name="calendar" size={19} /></li>
              <li><span>03</span><div><strong>Süreci kaydedin</strong><small>Seans ve ölçekleri dosyaya bağlayın.</small></div><Icon name="clipboard" size={19} /></li>
            </ol>
          </section>
          <section className="board-tool-section">
            <div className="board-section-head">
              <div><span className="board-eyebrow">KISA YOLLAR</span><h2>Çalışma araçları</h2></div>
            </div>
            <div className="board-tool-grid">
              {SHORTCUTS.map((item) => (
                <button type="button" key={item.path} className="board-tool" onClick={() => navigate(item.path)}>
                  <span className="board-tool-icon"><Icon name={item.icon} size={20} /></span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                  <Icon name="arrowRight" size={16} className="board-tool-arrow" />
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="board-grid">
          <section className="board-schedule" aria-labelledby="prep-title">
            <div className="board-section-head">
              <div><span className="board-eyebrow">GÜN AKIŞI</span><h2 id="prep-title">Bugünkü hazırlık</h2></div>
              <button type="button" className="board-text-link" onClick={() => navigate('/takvim')}>Takvim <Icon name="arrowRight" size={16} /></button>
            </div>
            {preps.length === 0 ? (
              <div className="board-empty">
                <span className="board-empty-icon"><Icon name="calendar" size={25} /></span>
                <h3>Bugün görüşme planlanmamış.</h3>
                <p>Yeni bir randevu için takvime gidin. Planlanan görüşmeler burada hazırlık notlarıyla birlikte görünecek.</p>
                <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/takvim')}>Takvime git <Icon name="arrowRight" size={15} /></button>
              </div>
            ) : (
              <div className="prep-list">
                {preps.map((prep) => (
                  <article key={prep.appointmentId} className={`prep-card status-${prep.status}`}>
                    <div className="prep-time"><strong>{prep.time}</strong><span>{prep.durationMinutes} dk</span></div>
                    <div className="prep-body">
                      <div className="prep-title">
                        <h3>{prep.clientName}</h3>
                        <span className={`badge ${prep.status === 'completed' ? 'badge-active' : prep.status === 'noshow' ? 'badge-risk-high' : 'badge-followup'}`}>
                          {STATUS_LABEL[prep.status]}
                        </span>
                      </div>
                      <p className="prep-meta">{prep.sessionType} · {prep.location}</p>
                      {prep.lastAssessment && <p className="prep-last">Son seans #{prep.lastSessionNumber} · {prep.lastSessionDate}: {prep.lastAssessment}</p>}
                      <ScoreChips readings={prep.scores} />
                      {prep.checks.length > 0 && <ul className="prep-checks">{prep.checks.map((check) => <li key={check}>{check}</li>)}</ul>}
                      <div className="prep-actions">
                        <button type="button" className="btn-primary btn-sm" onClick={() => navigate(`/danisanlar/${prep.clientId}`)}>Dosyayı aç</button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => navigate(`/danisanlar/${prep.clientId}?sekme=formulasyon`)}>Formülasyon</button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/seanslar')}>Seans notları</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <aside className="board-side" aria-label="Takip ve kısayollar">
            {attention.length > 0 ? (
              <section className="attention-panel">
                <div className="attention-head"><span><Icon name="alert" size={18} /></span><div><small>TAKİP GEREKİYOR</small><h2>Seans öncesi bakılacaklar</h2></div></div>
                <ul>
                  {attention.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => navigate(`/danisanlar/${item.clientId}`)}>
                        <strong className={item.severity === 'danger' ? 'attention-danger' : ''}>{item.clientName}</strong>
                        <span>{item.title}</span>
                        <small>{item.detail}</small>
                        <Icon name="arrowRight" size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section className="board-clear">
                <span className="board-clear-icon"><Icon name="checkCircle" size={21} /></span>
                <span className="board-eyebrow">TAKİP DURUMU</span>
                <h2>Şu an uyarı yok.</h2>
                <p>Dosya, görev ve ölçümlerden gelen bir izlem uyarısı olursa burada görünür.</p>
              </section>
            )}
            <section className="board-shortcuts">
              <span className="board-eyebrow">HIZLI ERİŞİM</span>
              <h2>Çalışma araçları</h2>
              {SHORTCUTS.map((item) => (
                <button type="button" key={item.path} onClick={() => navigate(item.path)}>
                  <Icon name={item.icon} size={18} /> <span>{item.title}</span> <Icon name="arrowRight" size={15} />
                </button>
              ))}
            </section>
          </aside>
        </div>
      )}

      {tomorrowAppointments.length > 0 && (
        <section className="tomorrow-card">
          <div className="board-section-head"><div><span className="board-eyebrow">BİR SONRAKİ GÜN</span><h2>Yarınki görüşmeler</h2></div></div>
          <ul>
            {tomorrowAppointments.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => navigate(`/danisanlar/${item.clientId}`)}>
                  <strong>{item.time}</strong><span>{item.clientName}<small>{item.sessionType}</small></span><Icon name="arrowRight" size={17} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="day-board-note">
        <Icon name="info" size={17} />
        <span>Ölçek bantları tarama içindir. Güvenlik maddesi pozitifse karar ölçeğe değil, görüşmeye aittir.</span>
        <button type="button" onClick={() => setBackupModalOpen(true)}><Icon name="database" size={15} /> Yedek al</button>
      </div>
      {backupModalOpen && <DataManagementModal onClose={() => setBackupModalOpen(false)} />}
    </div>
  );
}
