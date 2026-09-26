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
  getClientById,
  getSessionsByClientId,
  saveSoapSession,
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
import { RevisionDialog } from './RevisionDialog';
import { ConfirmDialog } from '../ConfirmDialog';
import { Icon } from '../Icon';
import { FormulationPanel } from './FormulationPanel';
import { ScoreChips } from './ScoreChips';
import { ClientDocuments, ClientNotes } from '../practice/ClientRecordsPanel';
import { navigate } from '../../router';

type Tab = 'overview' | 'sessions' | 'formulation' | 'tests' | 'progress' | 'reports' | 'notes' | 'documents';

const FILE_SECTIONS: { id: Tab; label: string; short?: string }[] = [
  { id: 'overview', label: 'Genel Bakış', short: 'Özet' },
  { id: 'sessions', label: 'Seanslar' },
  { id: 'formulation', label: 'Formülasyon' },
  { id: 'tests', label: 'Testler / Ölçekler', short: 'Ölçekler' },
  { id: 'progress', label: 'Gelişim' },
  { id: 'reports', label: 'Raporlar' },
  { id: 'notes', label: 'Notlar' },
  { id: 'documents', label: 'Belgeler' },
];

function tabFromLocation(): Tab {
  const sekme = new URLSearchParams(window.location.search).get('sekme');
  const allowed: Tab[] = ['overview', 'sessions', 'formulation', 'tests', 'progress', 'reports', 'notes', 'documents'];
  return allowed.includes(sekme as Tab) ? (sekme as Tab) : 'overview';
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
  const [deleteSoapId, setDeleteSoapId] = useState<string | null>(null);
  const [revisionOpen, setRevisionOpen] = useState(false);
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
  const nextAppointmentHint = (() => {
    // simple: no appointment data per client in local store grouping? Use empty
    return null;
  })();

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
    // If editing existing, require revision flow instead of direct overwrite
    if (editingSession) {
      setRevisionOpen(true);
      return;
    }
    const sessionToSave: SoapSession = {
      id: 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveSoapSession(sessionToSave);
    setSoapModalOpen(false);
  }

  function handleRevisionConfirm(reason: string) {
    if (!client || !editingSession) return;
    const base = soapForm;
    // Create new revision as new record — locked original stays untouched (DB trigger would deny update)
    const revision: SoapSession = {
      id: 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      sessionNumber: Number(base.sessionNumber) || editingSession.sessionNumber,
      date: base.date || editingSession.date,
      startTime: base.startTime || editingSession.startTime,
      durationMinutes: Number(base.durationMinutes) || editingSession.durationMinutes,
      sessionType: (base.sessionType as SessionType) || editingSession.sessionType,
      subjective: (base.subjective?.trim() || editingSession.subjective) ?? '',
      objective: (base.objective?.trim() || editingSession.objective) ?? '',
      assessment: `[Revizyon nedeni: ${reason}] ${base.assessment?.trim() || editingSession.assessment || ''}`.trim(),
      plan: base.plan?.trim() || editingSession.plan || '',
      riskLevel: (base.riskLevel as RiskLevel) || editingSession.riskLevel || 'none',
      riskNotes: base.riskNotes?.trim() || editingSession.riskNotes || '',
      homework: base.homework?.trim() || editingSession.homework || '',
      fee: Number(base.fee) || editingSession.fee || 0,
      paymentStatus: (base.paymentStatus as PaymentStatus) || editingSession.paymentStatus || 'paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveSoapSession(revision);
    setRevisionOpen(false);
    setSoapModalOpen(false);
    setEditingSession(null);
  }

  const identityStatusLabel =
    client.status === 'active' ? 'Aktif Terapi' : client.status === 'followup' ? 'Takipte' : client.status === 'completed' ? 'Tamamlandı' : 'Arşiv';

  return (
    <div className="clinical-container">
      <button
        type="button"
        className="btn-secondary btn-sm"
        style={{ marginBottom: 14 }}
        onClick={() => navigate('/danisanlar')}
      >
        <Icon name="left" size={14} />
        <span>Danışan Listesine Dön</span>
      </button>

      {/* Identity summary — priority 1 */}
      <section className="client-identity-card modern-table-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, padding: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--primary-tint)', border: '1px solid var(--primary-border)', color: 'var(--primary)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18, flex: 'none' }}>
            {client.firstName.charAt(0)}{client.lastName.charAt(0)}
          </div>
          <div style={{ minWidth: 220, flex: '1 1 320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>{client.firstName} {client.lastName}</h1>
              <span className={`badge ${client.status === 'active' ? 'badge-active' : client.status === 'followup' ? 'badge-followup' : 'badge-completed'}`} style={{ fontSize: 11 }}>{identityStatusLabel}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>#{client.fileNumber}</span>
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--soft)' }}>
              <span>{client.gender === 'ERKEK' ? 'Erkek' : 'Kadın'}{client.birthDate ? ` · ${client.age} yaş` : ''}{client.occupation ? ` · ${client.occupation}` : ''}</span>
              <span>Tel: {client.phone || '—'}</span>
              <span>E-posta: {client.email || '—'}</span>
            </div>
            {(client.diagnoses.length > 0 || safetyNeeded) && (
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {client.diagnoses.map((d, i) => (
                  <span key={i} className="badge badge-followup" style={{ fontSize: 11 }}>{d}</span>
                ))}
                {safetyNeeded && <span className="badge badge-risk-high" style={{ fontSize: 11 }}><Icon name="alert" size={12} /> Güvenlik izlemi</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)' }}>Dosya özeti</div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
              {lastSession ? (
                <>
                  Son seans <strong>#{lastSession.sessionNumber}</strong> · {lastSession.date}
                  {lastSession.homework && <div style={{ color: 'var(--soft)', fontSize: 12 }}>Ödev: {lastSession.homework}</div>}
                </>
              ) : (
                <span style={{ color: 'var(--soft)' }}>Henüz seans notu yok.</span>
              )}
            </div>
            {nextAppointmentHint === null && lastSession && (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sessions.length} seans kaydı</div>
            )}
          </div>
        </div>
        <ScoreChips readings={readings} />
        {safetyNeeded && safetyPlanIsEmpty(getSafetyPlan(client.id)) && (
          <p className="safety-callout" style={{ margin: '0 20px 16px' }}>Güvenlik uyarısı var, plan boş.</p>
        )}
      </section>

      {/* Quick actions — priority 2 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
        <button type="button" className="btn-primary" onClick={openNewSessionModal}>
          <Icon name="plus" size={16} />
          <span>Yeni Seans Notu</span>
        </button>
        <button type="button" className="btn-secondary" onClick={() => navigate('/takvim')}>
          <Icon name="calendar" size={16} />
          <span>Randevu Planla</span>
        </button>
        <button type="button" className="btn-secondary" onClick={() => setActiveTab('tests')}>
          <Icon name="activity" size={16} />
          <span>Ölçek / Test Başlat</span>
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setActiveTab('formulation')}>
            Formülasyon
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => window.print()} style={{ color: 'var(--soft)' }}>
            <Icon name="print" size={14} />
            <span>Dosyayı Yazdır</span>
          </button>
        </div>
      </div>

      {/* Navigation: desktop tabs, mobile dropdown */}
      <div className="clinical-tabs" style={{ marginBottom: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {FILE_SECTIONS.map((section) => {
          const count =
            section.id === 'sessions'
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
              className={`clinical-tab-btn ${activeTab === section.id ? 'active' : ''}`}
              onClick={() => setActiveTab(section.id)}
            >
              {section.label}
              {count !== undefined && count > 0 && <span className="tab-badge">{count}</span>}
            </button>
          );
        })}
      </div>
      <div className="file-section" style={{ marginTop: 12 }}>
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

      {/* Content */}
      {activeTab === 'overview' && (
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
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

      {activeTab === 'sessions' && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Seans notları</h3>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sessions.length} kayıt</span>
          </div>
          {sessions.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon"><Icon name="clipboard" size={22} /></div>
              <h4>Henüz seans bulunmuyor</h4>
              <p>Bu danışan için henüz bir seans notu başlatılmamış.</p>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge badge-risk-${s.riskLevel}`}>
                        Risk: {s.riskLevel === 'none' ? 'Yok' : s.riskLevel === 'low' ? 'Düşük' : s.riskLevel === 'moderate' ? 'Orta' : 'Yüksek!'}
                      </span>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => openEditSessionModal(s)} aria-label={`${s.sessionNumber} nolu seansı düzenle`}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button type="button" className="btn-secondary btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteSoapId(s.id)} aria-label={`${s.sessionNumber} nolu seansı sil`}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="soap-sections-grid">
                    <div className="soap-box">
                      <div className="soap-box-label"><span className="soap-letter">S</span><span>Subjektif</span></div>
                      <div className="soap-box-content">{s.subjective || '—'}</div>
                    </div>
                    <div className="soap-box">
                      <div className="soap-box-label"><span className="soap-letter">O</span><span>Objektif</span></div>
                      <div className="soap-box-content">{s.objective || '—'}</div>
                    </div>
                    <div className="soap-box">
                      <div className="soap-box-label"><span className="soap-letter">A</span><span>Analiz</span></div>
                      <div className="soap-box-content">{s.assessment || '—'}</div>
                    </div>
                    <div className="soap-box">
                      <div className="soap-box-label"><span className="soap-letter">P</span><span>Plan</span></div>
                      <div className="soap-box-content">
                        {s.plan || '—'}
                        {s.homework && <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--hairline)', fontSize: 12, color: 'var(--accent-ink)' }}><strong>Ev Ödevi:</strong> {s.homework}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tests' && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Testler / Ölçekler</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/testler/beck-depresyon')}>+ Beck Depresyon</button>
              <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/testler/beck-anksiyete')}>+ Beck Anksiyete</button>
              <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/testler/scl90')}>+ SCL-90-R</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/testler/tarama')}>+ GAD-7 / PHQ-9</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bdiTests.map(t => (
              <div key={t.id} className="modern-table-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-tint)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="pulse" size={18} /></div>
                    <div><strong style={{ fontSize: 15 }}>Beck Depresyon Envanteri (BDI)</strong><div style={{ fontSize: 12, color: 'var(--soft)' }}>Uygulama Tarihi: {t.testDate}</div></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{t.totalScore} / 63</span>
                    <span className={`badge ${t.severity === 'Şiddetli' ? 'badge-risk-high' : t.severity === 'Orta' ? 'badge-risk-moderate' : 'badge-active'}`}>{t.severity} Depresyon</span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text)', background: 'var(--bg-soft)', padding: 10, borderRadius: 6, margin: 0 }}>{t.clinicalInterpretation}</p>
              </div>
            ))}
            {baiTests.map(t => (
              <div key={t.id} className="modern-table-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--warning-tint)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="activity" size={18} /></div>
                    <div><strong style={{ fontSize: 15 }}>Beck Anksiyete Envanteri (BAI)</strong><div style={{ fontSize: 12, color: 'var(--soft)' }}>Uygulama Tarihi: {t.testDate}</div></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{t.totalScore} / 63</span>
                    <span className={`badge ${t.severity === 'Şiddetli' ? 'badge-risk-high' : t.severity === 'Orta' ? 'badge-risk-moderate' : 'badge-active'}`}>{t.severity} Anksiyete</span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text)', background: 'var(--bg-soft)', padding: 10, borderRadius: 6, margin: 0 }}>{t.clinicalInterpretation}</p>
              </div>
            ))}
            {scl90Tests.map(t => (
              <div key={t.id} className="modern-table-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-soft)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="layers" size={18} /></div>
                    <div><strong style={{ fontSize: 15 }}>SCL-90-R</strong><div style={{ fontSize: 12, color: 'var(--soft)' }}>Uygulama Tarihi: {t.testDate}</div></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>GSI</div><strong style={{ fontSize: 16 }}>{t.gsi}</strong></div>
                    <span className={`badge ${t.gsi >= 1.0 ? 'badge-risk-moderate' : 'badge-active'}`}>{t.gsi >= 1.0 ? 'Klinik Eşik Üzerinde' : 'Normal'}</span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text)', background: 'var(--bg-soft)', padding: 10, borderRadius: 6, margin: 0 }}>{t.clinicalInterpretation}</p>
              </div>
            ))}
            {bdiTests.length === 0 && baiTests.length === 0 && scl90Tests.length === 0 && (
              <div className="empty-state-card">
                <div className="empty-state-icon"><Icon name="activity" size={20} /></div>
                <h4>Henüz ölçek bulunmuyor</h4>
                <p>Bu danışan için henüz bir ölçek başlatılmamış.</p>
                <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/testler/beck-depresyon')}>Ölçek Başlat</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'formulation' && <div style={{ marginTop: 16 }}><FormulationPanel clientId={client.id} safetyNeeded={safetyNeeded} /></div>}

      {activeTab === 'progress' && (
        <div style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>Gelişim</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.55 }}>{measurementNote(readings)}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            <div className="modern-table-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><Icon name="pulse" size={18} /><h4 style={{ margin: 0, fontSize: 15 }}>Depresyon (BDI)</h4></div>
              {sortedBdi.length === 0 ? (
                <div className="empty-state-card" style={{ padding: 20 }}><p style={{ margin: 0 }}>Kayıtlı BDI testi bulunmuyor.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sortedBdi.map((b, i) => (
                    <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>Test #{i + 1} ({b.testDate})</span><strong>{b.totalScore} ({b.severity})</strong></div>
                      <div style={{ height: 10, borderRadius: 5, background: 'var(--bg-soft)', border: '1px solid var(--hairline)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, (b.totalScore / 63) * 100)}%`, background: b.totalScore >= 30 ? 'var(--danger)' : b.totalScore >= 17 ? 'var(--warning)' : 'var(--accent)', borderRadius: 5 }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modern-table-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><Icon name="activity" size={18} /><h4 style={{ margin: 0, fontSize: 15 }}>Anksiyete (BAI)</h4></div>
              {sortedBai.length === 0 ? (
                <div className="empty-state-card" style={{ padding: 20 }}><p style={{ margin: 0 }}>Kayıtlı BAI testi bulunmuyor.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sortedBai.map((b, i) => (
                    <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>Test #{i + 1} ({b.testDate})</span><strong>{b.totalScore} ({b.severity})</strong></div>
                      <div style={{ height: 10, borderRadius: 5, background: 'var(--bg-soft)', border: '1px solid var(--hairline)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, (b.totalScore / 63) * 100)}%`, background: b.totalScore >= 26 ? 'var(--danger)' : b.totalScore >= 16 ? 'var(--warning)' : 'var(--accent)', borderRadius: 5 }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notes' && <div style={{ marginTop: 16 }}><ClientNotes clientId={client.id} /></div>}
      {activeTab === 'documents' && <div style={{ marginTop: 16 }}><ClientDocuments clientId={client.id} /></div>}

      {activeTab === 'reports' && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Raporlar</h3>
            <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/raporlar')}>+ Yeni Rapor Oluştur</button>
          </div>
          {reports.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon"><Icon name="fileText" size={20} /></div>
              <h4>Henüz rapor bulunmuyor</h4>
              <p>Bu danışan için henüz bir klinik rapor oluşturulmamış.</p>
              <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/raporlar')}>Rapor Oluştur</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reports.map(r => (
                <div key={r.id} className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div><strong style={{ fontSize: 15 }}>{r.reportTitle}</strong><div style={{ fontSize: 12, color: 'var(--soft)' }}>Tarih: {r.reportDate} · {r.evaluator}</div></div>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/raporlar')}><Icon name="eye" size={14} /><span>İncele</span></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {deleteSoapId && (
        <ConfirmDialog
          title="Seans notunu sil"
          description="Bu seans notu silinecek. Geri alınamaz."
          confirmLabel="Sil"
          onCancel={() => setDeleteSoapId(null)}
          onConfirm={() => {
            const id = deleteSoapId;
            setDeleteSoapId(null);
            if (id) deleteSoapSession(id);
          }}
        />
      )}
      {revisionOpen && (
        <RevisionDialog
          titleId="revision-dialog-title"
          onClose={() => setRevisionOpen(false)}
          onConfirm={handleRevisionConfirm}
        />
      )}

      {soapModalOpen && !revisionOpen && (
        <ClinicalDialog titleId="client-session-dialog-title" onClose={() => setSoapModalOpen(false)} wide>
            <div className="clinical-modal-head">
              <h3 id="client-session-dialog-title">{editingSession ? 'SOAP Seans Notunu Düzenle' : `Yeni Seans Notu (SOAP) — ${client.firstName} ${client.lastName}`}</h3>
              <button type="button" className="btn-icon" aria-label="Pencereyi kapat" onClick={() => setSoapModalOpen(false)}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSoap}>
              <div className="clinical-modal-body">
                {editingSession && (
                  <div className="status-banner info-banner" style={{ margin: 0 }}>
                    <Icon name="shield" size={15} />
                    <span>Bu kayıt kilitli. Kaydet dendiğinde revizyon nedeni istenecek ve yeni bir revizyon oluşturulacak.</span>
                  </div>
                )}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Seans No</label>
                    <input type="number" min={1} value={soapForm.sessionNumber || 1} onChange={e => setSoapForm({ ...soapForm, sessionNumber: Number(e.target.value) })} required />
                  </div>
                  <div className="form-group">
                    <label>Seans Türü</label>
                    <select value={soapForm.sessionType || 'Bireysel Terapi'} onChange={e => setSoapForm({ ...soapForm, sessionType: e.target.value as SessionType })}>
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
                    <input type="date" value={soapForm.date || ''} onChange={e => setSoapForm({ ...soapForm, date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Başlangıç Saati &amp; Süre (dk)</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="time" value={soapForm.startTime || '14:00'} onChange={e => setSoapForm({ ...soapForm, startTime: e.target.value })} />
                      <input type="number" style={{ width: 90 }} value={soapForm.durationMinutes || 50} onChange={e => setSoapForm({ ...soapForm, durationMinutes: Number(e.target.value) })} />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="soap-letter" style={{ width: 16, height: 16, background: '#0d0d0d', color: '#fff', borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>S</span><span>Subjektif</span></label>
                  <textarea rows={3} value={soapForm.subjective || ''} onChange={e => setSoapForm({ ...soapForm, subjective: e.target.value })} placeholder="Danışanın ifadeleri..." />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="soap-letter" style={{ width: 16, height: 16, background: '#0d0d0d', color: '#fff', borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>O</span><span>Objektif</span></label>
                  <textarea rows={3} value={soapForm.objective || ''} onChange={e => setSoapForm({ ...soapForm, objective: e.target.value })} placeholder="Gözlemler..." />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="soap-letter" style={{ width: 16, height: 16, background: '#0d0d0d', color: '#fff', borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>A</span><span>Analiz</span></label>
                  <textarea rows={3} value={soapForm.assessment || ''} onChange={e => setSoapForm({ ...soapForm, assessment: e.target.value })} placeholder="Formülasyon..." />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="soap-letter" style={{ width: 16, height: 16, background: '#0d0d0d', color: '#fff', borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>P</span><span>Plan</span></label>
                  <textarea rows={3} value={soapForm.plan || ''} onChange={e => setSoapForm({ ...soapForm, plan: e.target.value })} placeholder="Plan..." />
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Ev Ödevi</label>
                    <input type="text" value={soapForm.homework || ''} onChange={e => setSoapForm({ ...soapForm, homework: e.target.value })} placeholder="Düşünce kaydı..." />
                  </div>
                  <div className="form-group">
                    <label>Risk Düzeyi</label>
                    <select value={soapForm.riskLevel || 'none'} onChange={e => setSoapForm({ ...soapForm, riskLevel: e.target.value as RiskLevel })}>
                      <option value="none">Risk Yok</option>
                      <option value="low">Düşük Risk</option>
                      <option value="moderate">Orta Risk</option>
                      <option value="high">Yüksek Risk!</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="clinical-modal-foot">
                <button type="button" className="btn-secondary" onClick={() => setSoapModalOpen(false)}>Vazgeç</button>
                <button type="submit" className="btn-primary">{editingSession ? 'Revizyon oluştur' : 'Seans Notunu Kaydet'}</button>
              </div>
            </form>
        </ClinicalDialog>
      )}
    </div>
  );
}
