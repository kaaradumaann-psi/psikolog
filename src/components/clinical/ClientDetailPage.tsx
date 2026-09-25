import { useState, useEffect, useMemo } from 'react';
import type {
  Client,
  SoapSession,
  BeckDepressionResult,
  BeckAnxietyResult,
  Scl90Result,
  ClinicalReport,
  RiskLevel,
  SessionType,
  PaymentStatus,
} from '../../clinical/clinicalTypes';
import {
  createSessionRevision,
  getClientById,
  getSessionsByClientId,
  lockSoapSession,
  saveSoapSession,
  signSoapSession,
  deleteSoapSession,
  getBeckDepressionTests,
  getBeckAnxietyTests,
  getScl90Tests,
  getClinicalReports,
  subscribeClinicalStore,
} from '../../clinical/clinicalStore';
import { readingsForClient, measurementNote, safetyPlanIsEmpty } from '../../clinical/casework';
import type { RapidScreeningResult } from '../../clinical/rapidScreening';
import { getSafetyPlan, getScreenings, getSettings, subscribePracticeStore } from '../../clinical/practiceStore';
import { clinicToday, maskTc } from '../../clinical/recordRules';
import { ClinicalDialog } from './ClinicalDialog';
import { ConfirmDialog } from '../ConfirmDialog';
import { RecordLockActions, RecordStatusBadge } from './RecordLockActions';
import { Icon } from '../Icon';
import { FormulationPanel } from './FormulationPanel';
import { ScoreChips } from './ScoreChips';
import { ClientDocuments, ClientNotes } from '../practice/ClientRecordsPanel';
import { navigate } from '../../router';

type Tab = 'overview' | 'sessions' | 'formulation' | 'tests' | 'progress' | 'reports' | 'notes' | 'documents';

const FILE_SECTIONS: { id: Tab; label: string }[] = [
  { id: 'sessions', label: 'Seans notları' },
  { id: 'formulation', label: 'Formülasyon' },
  { id: 'tests', label: 'Ölçekler' },
  { id: 'progress', label: 'Gelişim' },
  { id: 'overview', label: 'Anamnez' },
  { id: 'notes', label: 'Notlar' },
  { id: 'documents', label: 'Belgeler' },
  { id: 'reports', label: 'Raporlar' },
];

function tabFromLocation(): Tab {
  const sekme = new URLSearchParams(window.location.search).get('sekme');
  const allowed: Tab[] = ['overview', 'sessions', 'formulation', 'tests', 'progress', 'reports', 'notes', 'documents'];
  return allowed.includes(sekme as Tab) ? (sekme as Tab) : 'sessions';
}

export function ClientDetailPage({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<Client | undefined>(() => getClientById(clientId));
  const [activeTab, setActiveTab] = useState<Tab>(tabFromLocation);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);

  const [sessions, setSessions] = useState<SoapSession[]>(() => getSessionsByClientId(clientId));
  const [bdiTests, setBdiTests] = useState<BeckDepressionResult[]>([]);
  const [baiTests, setBaiTests] = useState<BeckAnxietyResult[]>([]);
  const [scl90Tests, setScl90Tests] = useState<Scl90Result[]>([]);
  const [reports, setReports] = useState<ClinicalReport[]>([]);
  const [screenings, setScreenings] = useState<RapidScreeningResult[]>([]);

  // SOAP modal state
  const [soapModalOpen, setSoapModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SoapSession | null>(null);
  const [pendingSoapDelete, setPendingSoapDelete] = useState<SoapSession | null>(null);
  const [soapForm, setSoapForm] = useState<Partial<SoapSession>>({
    sessionNumber: 1,
    date: clinicToday(),
    startTime: '14:00',
    durationMinutes: 50,
    sessionType: 'Bireysel Terapi',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    riskLevel: 'none',
    riskNotes: '',
    homework: '',
    fee: getSettings().defaultFee,
    paymentStatus: 'pending',
  });

  useEffect(() => {
    function refreshData() {
      const c = getClientById(clientId);
      setClient(c);
      setSessions(getSessionsByClientId(clientId));
      setBdiTests(getBeckDepressionTests().filter(t => t.clientId === clientId));
      setBaiTests(getBeckAnxietyTests().filter(t => t.clientId === clientId));
      setScl90Tests(getScl90Tests().filter(t => t.clientId === clientId));
      setReports(getClinicalReports().filter(r => r.clientId === clientId));
    }
    function refreshPractice() {
      setScreenings(getScreenings().filter((item) => item.clientId === clientId));
    }
    refreshData();
    refreshPractice();
    const unsub = subscribeClinicalStore(refreshData);
    const unsubPractice = subscribePracticeStore(refreshPractice);
    return () => {
      unsub();
      unsubPractice();
    };
  }, [clientId]);

  const sortedBdi = useMemo(() => {
    return [...bdiTests].sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime());
  }, [bdiTests]);

  const sortedBai = useMemo(() => {
    return [...baiTests].sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime());
  }, [baiTests]);

  const readings = useMemo(
    () => readingsForClient(clientId, { bdi: bdiTests, bai: baiTests, scl: scl90Tests, screenings }),
    [clientId, bdiTests, baiTests, scl90Tests, screenings],
  );
  const safetyNeeded = readings.some((item) => item.flag) || sessions.some((item) => item.riskLevel === 'high' || item.riskLevel === 'moderate');
  const lastSession = [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.sessionNumber - a.sessionNumber)[0];

  if (!client) {
    return (
      <div className="clinical-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Icon name="alert" size={40} />
        <h2>Danışan Kaydı Bulunamadı</h2>
        <p style={{ color: 'var(--soft)' }}>Aradığınız danışan dosyası mevcut değil veya silinmiş olabilir.</p>
        <button type="button" className="btn-primary" onClick={() => navigate('/danisanlar')}>
          Danışan Listesine Dön
        </button>
      </div>
    );
  }

  function openNewSessionModal() {
    const nextNum = (sessions.length > 0 ? Math.max(...sessions.map(s => s.sessionNumber)) + 1 : 1);
    setEditingSession(null);
    setSoapForm({
      sessionNumber: nextNum,
      date: clinicToday(),
      startTime: '14:00',
      durationMinutes: 50,
      sessionType: 'Bireysel Terapi',
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      riskLevel: 'none',
      riskNotes: '',
      homework: '',
      fee: getSettings().defaultFee,
      paymentStatus: 'pending',
    });
    setSoapModalOpen(true);
  }

  function openEditSessionModal(s: SoapSession) {
    setEditingSession(s);
    setSoapForm({ ...s });
    setSoapModalOpen(true);
  }

  function handleSaveSoap(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;

    const sessionToSave: SoapSession = {
      id: editingSession ? editingSession.id : 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      sessionNumber: Number(soapForm.sessionNumber) || 1,
      date: soapForm.date || clinicToday(),
      startTime: soapForm.startTime || '14:00',
      durationMinutes: Number(soapForm.durationMinutes) || 50,
      sessionType: (soapForm.sessionType as SessionType) || 'Bireysel Terapi',
      subjective: soapForm.subjective?.trim() || '',
      objective: soapForm.objective?.trim() || '',
      assessment: soapForm.assessment?.trim() || '',
      plan: soapForm.plan?.trim() || '',
      riskLevel: (soapForm.riskLevel as RiskLevel) || 'none',
      riskNotes: soapForm.riskNotes?.trim() || '',
      homework: soapForm.homework?.trim() || '',
      fee: Number(soapForm.fee) || 0,
      paymentStatus: (soapForm.paymentStatus as PaymentStatus) || 'paid',
      createdAt: editingSession ? editingSession.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSoapSession(sessionToSave);
    setSoapModalOpen(false);
  }

  function handleDeleteSoap(session: SoapSession) {
    setPendingSoapDelete(session);
  }

  function confirmDeleteSoap() {
    const session = pendingSoapDelete;
    if (!session) return;
    try {
      deleteSoapSession(session.id);
    } finally {
      setPendingSoapDelete(null);
    }
  }

  return (
    <div className="clinical-container">
      {/* Üst Başlık & Geri Dön */}
      <div className="clinical-header">
        <div className="clinical-title-wrap">
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ marginBottom: 10 }}
            onClick={() => navigate('/danisanlar')}
          >
            <Icon name="left" size={14} />
            <span>Danışan Listesine Dön</span>
          </button>
          <div className="clinical-kicker">
            <span className="clinical-kicker-dot" />
            <span>Klinik Vaka Dosyası · Protokol {client.fileNumber}</span>
          </div>
          <h1>{client.firstName} {client.lastName}</h1>
          <p>{client.gender === 'ERKEK' ? 'Erkek' : 'Kadın'}{client.birthDate ? `, ${client.age} yaş` : ''} · {client.occupation || 'Meslek belirtilmedi'} · Tel: {client.phone || '—'}</p>
        </div>

        <div className="clinical-actions">
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            <Icon name="print" size={16} />
            <span>Dosyayı Yazdır</span>
          </button>
          <button type="button" className="btn-primary" onClick={openNewSessionModal}>
            <Icon name="plus" size={16} />
            <span>Yeni Seans Notu (SOAP)</span>
          </button>
        </div>
      </div>

      {/* Tanı & Risk Rozetleri */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <span className={`badge badge-${client.status}`}>
          Durum: {client.status === 'active' ? 'Aktif Terapi' : client.status === 'followup' ? 'Takipte' : 'Tamamlandı'}
        </span>
        {client.diagnoses.map((d, i) => (
          <span key={i} className="badge badge-followup">
            {d}
          </span>
        ))}
      </div>

      <section className="modern-table-card file-brief">
        <div className="formulation-head">
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>Dosya özeti</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--soft)', fontSize: 13 }}>
              {lastSession
                ? `Son seans #${lastSession.sessionNumber} · ${lastSession.date}${lastSession.homework ? ` · Ödev: ${lastSession.homework}` : ''}`
                : 'Henüz seans notu yok.'}
            </p>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setActiveTab('formulation')}>Formülasyon</button>
        </div>
        <ScoreChips readings={readings} />
        {readings.length === 0 && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => setActiveTab('tests')}>
            Ölçek başlat
          </button>
        )}
        {safetyNeeded && safetyPlanIsEmpty(getSafetyPlan(client.id)) && (
          <p className="safety-callout">Güvenlik uyarısı var, plan boş.</p>
        )}
      </section>

      <div className="file-section">
        <button
          type="button"
          className="file-section-toggle"
          aria-expanded={sectionMenuOpen}
          aria-controls="file-section-panel"
          onClick={() => setSectionMenuOpen((open) => !open)}
        >
          <Icon name="menu" size={18} />
          <span>{FILE_SECTIONS.find((section) => section.id === activeTab)?.label}</span>
          <small>{sectionMenuOpen ? 'Kapat' : 'Bölümler'}</small>
        </button>
        {sectionMenuOpen && (
          <div className="file-section-panel" id="file-section-panel" role="menu">
            {FILE_SECTIONS.map((section) => {
              const count = section.id === 'sessions'
                ? sessions.length
                : section.id === 'tests'
                  ? bdiTests.length + baiTests.length + scl90Tests.length
                  : section.id === 'reports'
                    ? reports.length
                    : undefined;
              return (
                <button
                  key={section.id}
                  type="button"
                  role="menuitem"
                  className={activeTab === section.id ? 'is-current' : ''}
                  onClick={() => {
                    setActiveTab(section.id);
                    setSectionMenuOpen(false);
                  }}
                >
                  {section.label}
                  {count !== undefined && <span>{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ----------------- TAB: SEANS NOTLARI ----------------- */}
      {activeTab === 'sessions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Kronolojik Seans Geçmişi</h3>
            <button type="button" className="btn-primary btn-sm" onClick={openNewSessionModal}>
              + Seans Notu Ekle
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="empty-state-card">
              <Icon name="clipboard" size={32} />
              <h4>Henüz Seans Notu Eklenmedi</h4>
              <p>Bu danışan için henüz bir SOAP seans notu girilmemiştir.</p>
              <button type="button" className="btn-primary btn-sm" onClick={openNewSessionModal}>
                İlk Seans Notunu Gir
              </button>
            </div>
          ) : (
            <div className="soap-grid">
              {sessions.map(s => (
                <div key={s.id} className="soap-card">
                  <div className="soap-card-header">
                    <div className="soap-title-wrap">
                      <div className="soap-num-pill">#{s.sessionNumber}</div>
                      <div>
                        <strong>{s.sessionType}</strong>
                        <div className="soap-date-text">{s.date} · Saat {s.startTime} ({s.durationMinutes} dk)</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <RecordStatusBadge status={s.status} revision={s.revision} />
                      <span className={`badge badge-risk-${s.riskLevel}`}>
                        Risk: {s.riskLevel === 'none' ? 'Yok' : s.riskLevel === 'low' ? 'Düşük' : s.riskLevel === 'moderate' ? 'Orta' : 'Yüksek!'}
                      </span>
                      {s.status !== 'locked' && (
                        <button type="button" className="btn-secondary btn-sm" title="Seans notunu düzenle" onClick={() => openEditSessionModal(s)}>
                          <Icon name="edit" size={14} />
                        </button>
                      )}
                      {s.status !== 'locked' && (
                        <button type="button" className="btn-secondary btn-sm" style={{ color: 'var(--danger)' }} title="Seans notunu sil" onClick={() => handleDeleteSoap(s)}>
                          <Icon name="trash" size={14} />
                        </button>
                      )}
                      <RecordLockActions
                        status={s.status}
                        onSign={() => signSoapSession(s.id)}
                        onLock={() => lockSoapSession(s.id)}
                        onRevise={reason => createSessionRevision(s.id, reason)}
                      />
                    </div>
                  </div>

                  <div className="soap-sections-grid">
                    <div className="soap-box">
                      <div className="soap-box-label">
                        <span className="soap-letter">S</span>
                        <span>Subjektif (Danışanın İfadeleri)</span>
                      </div>
                      <div className="soap-box-content">{s.subjective || '—'}</div>
                    </div>

                    <div className="soap-box">
                      <div className="soap-box-label">
                        <span className="soap-letter">O</span>
                        <span>Objektif (Klinik Gözlemler)</span>
                      </div>
                      <div className="soap-box-content">{s.objective || '—'}</div>
                    </div>

                    <div className="soap-box">
                      <div className="soap-box-label">
                        <span className="soap-letter">A</span>
                        <span>Analiz (Formülasyon &amp; Değerlendirme)</span>
                      </div>
                      <div className="soap-box-content">{s.assessment || '—'}</div>
                    </div>

                    <div className="soap-box">
                      <div className="soap-box-label">
                        <span className="soap-letter">P</span>
                        <span>Plan (Hedefler &amp; Ev Ödevleri)</span>
                      </div>
                      <div className="soap-box-content">
                        {s.plan || '—'}
                        {s.homework && (
                          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--hairline)', fontSize: 12, color: 'var(--accent-ink)' }}>
                            <strong>Ev Ödevi:</strong> {s.homework}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB: TEST BATARYASI ----------------- */}
      {activeTab === 'tests' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Danışana Uygulanan Testler</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => navigate('/testler/beck-depresyon')}
              >
                + Beck Depresyon
              </button>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => navigate('/testler/beck-anksiyete')}
              >
                + Beck Anksiyete
              </button>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => navigate('/testler/scl90')}
              >
                + SCL-90-R
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => navigate('/testler/tarama')}
              >
                + GAD-7 / PHQ-9
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Beck Depresyon Kayıtları */}
            {bdiTests.map(t => (
              <div key={t.id} className="modern-table-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-tint)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="pulse" size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: 15 }}>Beck Depresyon Envanteri (BDI)</strong>
                      <div style={{ fontSize: 12, color: 'var(--soft)' }}>Uygulama Tarihi: {t.testDate}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text)' }}>
                      {t.totalScore} / 63
                    </span>
                    <span className={`badge ${t.severity === 'Şiddetli' ? 'badge-risk-high' : t.severity === 'Orta' ? 'badge-risk-moderate' : 'badge-active'}`}>
                      {t.severity} Depresyon
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text)', background: 'var(--bg-soft)', padding: 10, borderRadius: 6, margin: 0 }}>
                  {t.clinicalInterpretation}
                </p>
              </div>
            ))}

            {/* Beck Anksiyete Kayıtları */}
            {baiTests.map(t => (
              <div key={t.id} className="modern-table-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--warning-tint)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="activity" size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: 15 }}>Beck Anksiyete Envanteri (BAI)</strong>
                      <div style={{ fontSize: 12, color: 'var(--soft)' }}>Uygulama Tarihi: {t.testDate}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text)' }}>
                      {t.totalScore} / 63
                    </span>
                    <span className={`badge ${t.severity === 'Şiddetli' ? 'badge-risk-high' : t.severity === 'Orta' ? 'badge-risk-moderate' : 'badge-active'}`}>
                      {t.severity} Anksiyete
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text)', background: 'var(--bg-soft)', padding: 10, borderRadius: 6, margin: 0 }}>
                  {t.clinicalInterpretation}
                </p>
              </div>
            ))}

            {/* SCL-90-R Kayıtları */}
            {scl90Tests.map(t => (
              <div key={t.id} className="modern-table-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-soft)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="layers" size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: 15 }}>SCL-90-R Belirti Tarama Listesi</strong>
                      <div style={{ fontSize: 12, color: 'var(--soft)' }}>Uygulama Tarihi: {t.testDate}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Genel Semptom İndeksi</div>
                      <strong style={{ fontSize: 16 }}>GSI: {t.gsi}</strong>
                    </div>
                    <span className={`badge ${t.gsi >= 1.0 ? 'badge-risk-moderate' : 'badge-active'}`}>
                      {t.gsi >= 1.0 ? 'Klinik Eşik Üzerinde' : 'Normal Sınırlar'}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text)', background: 'var(--bg-soft)', padding: 10, borderRadius: 6, margin: 0 }}>
                  {t.clinicalInterpretation}
                </p>
              </div>
            ))}

            {bdiTests.length === 0 && baiTests.length === 0 && scl90Tests.length === 0 && (
              <div className="empty-state-card">
                <Icon name="activity" size={32} />
                <h4>Uygulanmış Test Bulunmuyor</h4>
                <p>Bu danışana henüz bir psikometrik test uygulanmamıştır.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB: GELİŞİM VE KLİNİK TREND ----------------- */}
      {activeTab === 'formulation' && <FormulationPanel clientId={client.id} safetyNeeded={safetyNeeded} />}

      {activeTab === 'progress' && (
        <div>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>Psikolojik Gelişim ve Tedavi Yanıtı</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.55 }}>{measurementNote(readings)}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Depresyon Trend Kartı */}
            <div className="modern-table-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Icon name="pulse" size={18} />
                <h4 style={{ margin: 0, fontSize: 15 }}>Depresyon Seviyesi Değişimi (BDI)</h4>
              </div>

              {sortedBdi.length === 0 ? (
                <div style={{ color: 'var(--soft)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                  Kayıtlı BDI testi bulunmuyor.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sortedBdi.map((b, i) => (
                    <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>Test #{i + 1} ({b.testDate})</span>
                        <strong>{b.totalScore} Puan ({b.severity})</strong>
                      </div>
                      <div style={{ height: 10, borderRadius: 5, background: 'var(--bg-soft)', border: '1px solid var(--hairline)', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, (b.totalScore / 63) * 100)}%`,
                            background: b.totalScore >= 30 ? 'var(--danger)' : b.totalScore >= 17 ? 'var(--warning)' : 'var(--accent)',
                            borderRadius: 5,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anksiyete Trend Kartı */}
            <div className="modern-table-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Icon name="activity" size={18} />
                <h4 style={{ margin: 0, fontSize: 15 }}>Anksiyete Seviyesi Değişimi (BAI)</h4>
              </div>

              {sortedBai.length === 0 ? (
                <div style={{ color: 'var(--soft)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                  Kayıtlı BAI testi bulunmuyor.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sortedBai.map((b, i) => (
                    <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>Test #{i + 1} ({b.testDate})</span>
                        <strong>{b.totalScore} Puan ({b.severity})</strong>
                      </div>
                      <div style={{ height: 10, borderRadius: 5, background: 'var(--bg-soft)', border: '1px solid var(--hairline)', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, (b.totalScore / 63) * 100)}%`,
                            background: b.totalScore >= 26 ? 'var(--danger)' : b.totalScore >= 16 ? 'var(--warning)' : 'var(--accent)',
                            borderRadius: 5,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB: ANAMNEZ VE PROFİL ----------------- */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <div className="modern-table-card" style={{ padding: 20 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>Kişisel &amp; İletişim Bilgileri</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div><strong>Ad Soyad:</strong> {client.firstName} {client.lastName}</div>
              <div><strong>T.C. kimlik:</strong> {maskTc(client.tcNumber)}</div>
              <div><strong>Doğum Tarihi / Yaş:</strong> {client.birthDate} ({client.age} Yaş)</div>
              <div><strong>Cinsiyet:</strong> {client.gender === 'ERKEK' ? 'Erkek' : 'Kadın'}</div>
              <div><strong>Medeni Durum:</strong> {client.maritalStatus || '—'}</div>
              <div><strong>Meslek:</strong> {client.occupation || '—'}</div>
              <div><strong>Telefon:</strong> {client.phone || '—'}</div>
              <div><strong>E-posta:</strong> {client.email || '—'}</div>
            </div>
          </div>

          <div className="modern-table-card" style={{ padding: 20 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>Acil Durum İletişimi</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div><strong>İsim:</strong> {client.emergencyContact.name || '—'}</div>
              <div><strong>Telefon:</strong> {client.emergencyContact.phone || '—'}</div>
              <div><strong>Yakınlık:</strong> {client.emergencyContact.relation || '—'}</div>
            </div>
          </div>

          <div className="modern-table-card" style={{ padding: 20, gridColumn: '1 / -1' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>Klinik Anamnez &amp; Şikayetler</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div>
                <strong>Başvuru Nedeni:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--soft)' }}>{client.presentingComplaint || 'Belirtilmedi'}</p>
              </div>
              <div>
                <strong>Tıbbi özgeçmiş:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--soft)' }}>{client.medicalHistory || 'Belirtilmedi'}</p>
              </div>
              <div>
                <strong>Psikiyatrik geçmiş:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--soft)' }}>{client.psychiatricHistory || 'Belirtilmedi'}</p>
              </div>
              <div>
                <strong>Kullandığı ilaçlar:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--soft)' }}>{client.medications || 'Belirtilmedi'}</p>
              </div>
              <div>
                <strong>Aile öyküsü:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--soft)' }}>{client.familyHistory || 'Belirtilmedi'}</p>
              </div>
              <div>
                <strong>Notlar / alerjiler:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--soft)' }}>{client.allergiesNotes || 'Belirtilmedi'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notes' && <ClientNotes clientId={client.id} />}
      {activeTab === 'documents' && <ClientDocuments clientId={client.id} />}

      {/* ----------------- TAB: RAPORLAR ----------------- */}
      {activeTab === 'reports' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Hazırlanan Klinik Raporlar</h3>
            <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/raporlar')}>
              + Yeni Rapor Oluştur
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="empty-state-card">
              <Icon name="fileText" size={32} />
              <h4>Kayıtlı Rapor Yok</h4>
              <p>Bu danışan için henüz oluşturulmuş bir klinik rapor bulunmamaktadır.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reports.map(r => (
                <div key={r.id} className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: 15 }}>{r.reportTitle}</strong>
                    <div style={{ fontSize: 12, color: 'var(--soft)' }}>Tarih: {r.reportDate} · Değerlendiren: {r.evaluator}</div>
                  </div>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/raporlar')}>
                    <Icon name="eye" size={14} />
                    <span>İncele</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {pendingSoapDelete && (
        <ConfirmDialog
          title="Seans notunu sil"
          description={`#${pendingSoapDelete.sessionNumber} · ${pendingSoapDelete.date} seans notu silinecek. Bu işlem geri alınamaz.`}
          confirmLabel="Seans notunu sil"
          onConfirm={confirmDeleteSoap}
          onCancel={() => setPendingSoapDelete(null)}
        />
      )}

      {/* SOAP Modal */}
      {soapModalOpen && (
        <ClinicalDialog titleId="client-session-dialog-title" onClose={() => setSoapModalOpen(false)} wide>
            <div className="clinical-modal-head">
              <h3 id="client-session-dialog-title">{editingSession ? 'SOAP Seans Notunu Düzenle' : `Yeni Seans Notu (SOAP) — ${client.firstName} ${client.lastName}`}</h3>
              <button type="button" className="btn-icon" aria-label="Pencereyi kapat" onClick={() => setSoapModalOpen(false)}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSoap}>
              <div className="clinical-modal-body">
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Seans No</label>
                    <input
                      type="number"
                      min={1}
                      value={soapForm.sessionNumber || 1}
                      onChange={e => setSoapForm({ ...soapForm, sessionNumber: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Seans Türü</label>
                    <select
                      value={soapForm.sessionType || 'Bireysel Terapi'}
                      onChange={e => setSoapForm({ ...soapForm, sessionType: e.target.value as SessionType })}
                    >
                      <option value="Bireysel Terapi">Bireysel Terapi</option>
                      <option value="Çift / Aile Terapisi">Çift / Aile Terapisi</option>
                      <option value="İlk Görüşme / Anamnez">İlk Görüşme / Anamnez</option>
                      <option value="Psikolojik Değerlendirme">Psikolojik Değerlendirme</option>
                      <option value="Kriz Müdahalesi">Kriz Müdahalesi</option>
                      <option value="Online Terapi">Online Terapi</option>
                      <option value="Takip Seansı">Takip Seansı</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Tarih</label>
                    <input
                      type="date"
                      value={soapForm.date || ''}
                      onChange={e => setSoapForm({ ...soapForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Başlangıç Saati &amp; Süre (dk)</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="time"
                        value={soapForm.startTime || '14:00'}
                        onChange={e => setSoapForm({ ...soapForm, startTime: e.target.value })}
                      />
                      <input
                        type="number"
                        style={{ width: 90 }}
                        value={soapForm.durationMinutes || 50}
                        onChange={e => setSoapForm({ ...soapForm, durationMinutes: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="soap-letter" style={{ width: 16, height: 16, background: '#0d0d0d', color: '#fff', borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>S</span>
                    <span>Subjektif (Danışanın İfadeleri &amp; Ruh Hali)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={soapForm.subjective || ''}
                    onChange={e => setSoapForm({ ...soapForm, subjective: e.target.value })}
                    placeholder="Danışanın seans esnasındaki sözel paylaşımları, haftalık deneyimleri ve şikayetleri..."
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="soap-letter" style={{ width: 16, height: 16, background: '#0d0d0d', color: '#fff', borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>O</span>
                    <span>Objektif (Klinisyenin Gözlemleri &amp; Bilişsel/Davranışsal Durum)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={soapForm.objective || ''}
                    onChange={e => setSoapForm({ ...soapForm, objective: e.target.value })}
                    placeholder="Duygulanım (afekt), düşünce akışı hızı, göz teması, motor gerginlik, test puanları..."
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="soap-letter" style={{ width: 16, height: 16, background: '#0d0d0d', color: '#fff', borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>A</span>
                    <span>Analiz / Değerlendirme (Klinik Formülasyon &amp; Şemalar)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={soapForm.assessment || ''}
                    onChange={e => setSoapForm({ ...soapForm, assessment: e.target.value })}
                    placeholder="BDT bilişsel kavramsallaştırma, otomatik düşünceler, savunma mekanizmaları..."
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="soap-letter" style={{ width: 16, height: 16, background: '#0d0d0d', color: '#fff', borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>P</span>
                    <span>Plan (Müdahaleler, Ev Ödevleri &amp; Gelecek Seans)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={soapForm.plan || ''}
                    onChange={e => setSoapForm({ ...soapForm, plan: e.target.value })}
                    placeholder="Uygulanan teknikler, sonraki seans gündemi, sevk/konsültasyon kararı..."
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Ev Ödevi</label>
                    <input
                      type="text"
                      value={soapForm.homework || ''}
                      onChange={e => setSoapForm({ ...soapForm, homework: e.target.value })}
                      placeholder="Düşünce kaydı formu, nefes egzersizi..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Risk Düzeyi</label>
                    <select
                      value={soapForm.riskLevel || 'none'}
                      onChange={e => setSoapForm({ ...soapForm, riskLevel: e.target.value as RiskLevel })}
                    >
                      <option value="none">Risk Yok / Güvenli</option>
                      <option value="low">Düşük Risk</option>
                      <option value="moderate">Orta Risk (Yakın Takip)</option>
                      <option value="high">Yüksek Risk! (Acil Protokol)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="clinical-modal-foot">
                <button type="button" className="btn-secondary" onClick={() => setSoapModalOpen(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn-primary">
                  {editingSession ? 'Seans Notunu Güncelle' : 'Seans Notunu Kaydet'}
                </button>
              </div>
            </form>
        </ClinicalDialog>
      )}
    </div>
  );
}
