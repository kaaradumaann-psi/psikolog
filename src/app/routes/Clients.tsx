import { useEffect, useState } from 'react';
import { navigate } from '../router';
import { ClientList } from '../../features/clients/ClientList';
import { ClientForm } from '../../features/clients/ClientForm';
import { getClient, archiveClient, activateClient, deleteClient } from '../../features/clients/clientApi';
import type { Client } from '../../features/clients/clientTypes';
import { CLIENT_STATUS_LABEL } from '../../features/clients/clientTypes';
import { formatDateTR } from '../../lib/dateGuards';
import { showToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/Modal';
import type { AuthenticatedUser } from '../../auth/authTypes';

import { AnamnesisForm } from '../../features/anamnesis/AnamnesisForm';
import { SessionForm } from '../../features/sessions/SessionForm';
import { SessionList } from '../../features/sessions/SessionList';
import { AssessmentForm } from '../../features/assessments/AssessmentForm';
import { AssessmentList } from '../../features/assessments/AssessmentList';
import { TestAdminForm, TestAdminList, TestResultForm } from '../../features/tests/TestForms';
import { listReportsByClient, getReport, createReport, updateReport, deleteReport, listTemplates, listReportVersions } from '../../features/reports/reportsApi';
import type { Report, ReportVersion } from '../../features/reports/reportsApi';
import type { ReportDocument } from '../../features/reports/templateEngine';
import { buildSourceData } from '../../features/reports/reportDataAdapter';
import { ReportPreview } from '../../features/reports/ReportPreview';
import { getAnamnesisByClient } from '../../features/anamnesis/anamnesisApi';
import { listSessionsByClient } from '../../features/sessions/sessionApi';
import { listAssessmentsByClient } from '../../features/assessments/assessmentApi';
import { listTestAdministrationsByClient } from '../../features/tests/testApi';
import type { ReportSourceData } from '../../features/reports/templateEngine';
import { DocumentSection } from '../../features/documents/DocumentList';
import { NoteSection } from '../../features/notes/NoteSection';
import { listAuditLogsByClient } from '../../features/audit/auditApi';
import type { AuditLog } from '../../features/audit/auditApi';
import { listAppointmentsByClient } from '../../features/appointments/appointmentApi';
import type { Appointment } from '../../features/appointments/appointmentTypes';
import { listTasksByClient } from '../../features/tasks/taskApi';
import type { Task } from '../../features/tasks/taskTypes';
import { ExportSection } from '../../features/export/ExportSection';
import { summarizeWithAI } from '../../features/ai/aiTypes';

export function ClientsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Danışanlar</h1>
          <p>Danışan dosyanızı yönetin — arama, filtre, sayfalama (hasMore+count visible)</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/clients/new')}>
          + Yeni Danışan
        </button>
      </div>

      <ClientList />
    </div>
  );
}

export function ClientNewPage({ user }: { user: AuthenticatedUser }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="kicker">
            <span className="kicker-dot" /> Yeni Danışan
          </div>
          <h1>Yeni Danışan Oluştur</h1>
          <p>KVKK minimizasyon — sadece gerekli alanlar, file_number org içinde unique auto</p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/clients')}>
          ← Listeye Dön
        </button>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <ClientForm
          userId={user.id}
          onSuccess={(c) => navigate(`/clients/${c.id}`, { replace: true })}
          onCancel={() => navigate('/clients')}
        />
      </div>
    </div>
  );
}

export function ClientFilePage({ id, tab, user }: { id: string; tab?: string; user: AuthenticatedUser }) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [sessionRefresh, setSessionRefresh] = useState(0);
  const [assessmentRefresh, setAssessmentRefresh] = useState(0);
  const [testRefresh, setTestRefresh] = useState(0);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);
  const [testResultFor, setTestResultFor] = useState<string | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportVersions, setReportVersions] = useState<ReportVersion[]>([]);
  const [sourceData, setSourceData] = useState<ReportSourceData | null>(null);
  const [reportDraftContent, setReportDraftContent] = useState<ReportDocument | null>(null);
  const [templates, setTemplates] = useState<{ id: string; name: string; content: ReportDocument; isSystem: boolean }[]>([]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const activeTab = tab || 'genel';
  const tabs = ['genel','anamnez','görüşmeler','değerlendirmeler','testler','raporlar','belgeler','notlar','geçmiş'] as const;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getClient(id).then((c) => { if (!cancelled) setClient(c); }).catch((e) => { if (!cancelled) setError((e as Error).message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'raporlar' || !client) return;
    listReportsByClient(client.id).then(setReports).catch((e) => showToast((e as Error).message, 'error'));
    listTemplates().then(setTemplates).catch(() => {});
  }, [activeTab, client, testRefresh, assessmentRefresh, sessionRefresh]);

  useEffect(() => {
    if (!selectedReportId) { setSelectedReport(null); setReportVersions([]); return; }
    getReport(selectedReportId).then((r) => { setSelectedReport(r); setReportDraftContent(r.content); }).catch((e) => showToast((e as Error).message, 'error'));
    listReportVersions(selectedReportId).then(setReportVersions).catch(() => {});
  }, [selectedReportId]);

  useEffect(() => {
    if (!client || activeTab !== 'raporlar') return;
    let cancelled = false;
    (async () => {
      try {
        const [anamnesis, sessions, assessments, testAdmins] = await Promise.all([
          getAnamnesisByClient(client.id).catch(() => null),
          listSessionsByClient(client.id).catch(() => []),
          listAssessmentsByClient(client.id).catch(() => []),
          listTestAdministrationsByClient(client.id).catch(() => []),
        ]);
        if (cancelled) return;
        const data = buildSourceData({ client, assessment: assessments[0] || null, anamnesis, sessions, testAdministrations: testAdmins, psychologist: { firstName: '—', lastName: '—' } });
        setSourceData(data);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [client, activeTab, assessmentRefresh, sessionRefresh, testRefresh]);

  useEffect(() => {
    if (!client) return;
    if (activeTab === 'geçmiş') {
      listAuditLogsByClient(client.id).then(setAuditLogs).catch((e) => showToast((e as Error).message, 'error'));
    }
    if (activeTab === 'genel') {
      listAppointmentsByClient(client.id).then(setAppointments).catch(() => {});
      listTasksByClient(client.id).then(setTasks).catch(() => {});
    }
  }, [client, activeTab]);

  const handleArchive = async () => {
    if (!client) return;
    try {
      const updated = client.status === 'active' ? await archiveClient(client.id) : await activateClient(client.id);
      setClient(updated);
      showToast(updated.status === 'archived' ? 'Arşivlendi' : 'Aktifleştirildi', 'success');
    } catch (e) { showToast((e as Error).message, 'error'); }
  };

  const handleDelete = async () => {
    if (!client) return;
    try {
      await deleteClient(client.id);
      showToast('Danışan silindi', 'success');
      navigate('/clients', { replace: true });
    } catch (e) { showToast((e as Error).message, 'error'); }
  };

  const handleCreateReport = async (templateId: string) => {
    if (!client) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    try {
      const newReport = await createReport({
        clientId: client.id,
        title: `Rapor — ${client.firstName} ${client.lastName} — ${new Date().toLocaleDateString('tr-TR')}`,
        content: tpl.content,
        templateId,
        context: { client, assessment: null, anamnesis: null, sessions: [], testAdministrations: [] },
      });
      setReports((prev) => [newReport, ...prev]);
      setSelectedReportId(newReport.id);
      showToast('Rapor oluşturuldu', 'success');
    } catch (e) { showToast((e as Error).message, 'error'); }
  };

  const handleSaveReport = async (content: ReportDocument, reason: 'manual' | 'complete') => {
    if (!selectedReport) return;
    const status = reason === 'complete' ? 'completed' : selectedReport.status;
    const updated = await updateReport(selectedReport.id, { content, status, saveReason: reason }, selectedReport.revision);
    setSelectedReport(updated);
    setReportDraftContent(updated.content);
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  if (loading) return <div className="card" style={{ textAlign: 'center', padding: 32 }}>Yükleniyor…</div>;

  if (error || !client) {
    return (
      <div>
        <div className="page-header">
          <div><h1>Danışan Bulunamadı</h1><p>{error || 'ID geçersiz'}</p></div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/clients')}>← Listeye Dön</button>
        </div>
        <div className="card">
          <div className="empty-state-card">
            <div className="empty-state-icon">!</div><h4>Danışan bulunamadı</h4>
            <p>IDOR koruması: bu danışan sizin organizasyonunuzda değil veya silinmiş olabilir</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>ID: {id}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <div className="kicker"><span className="kicker-dot" /> {client.fileNumber}</div>
            <span className={`badge badge--${client.status === 'active' ? 'success' : 'default'}`}>{CLIENT_STATUS_LABEL[client.status]}</span>
          </div>
          <h1>{client.firstName} {client.lastName}</h1>
          <p>{client.birthDate ? formatDateTR(client.birthDate) + ' • ' : ''}{client.profession || ''} {client.profession && client.education ? ' • ' : ''}{client.education || ''} • Oluşturulma {new Date(client.createdAt).toLocaleDateString('tr-TR')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/clients')}>← Liste</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing((v) => !v)}>{editing ? 'Vazgeç' : 'Düzenle'}</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmArchive(true)}>{client.status === 'active' ? 'Arşivle' : 'Aktifleştir'}</button>
          <button type="button" className="btn btn--danger btn--sm" onClick={() => setConfirmDelete(true)}>Sil</button>
        </div>
      </div>

      <div className="client-tabs">
        {tabs.map((t) => (
          <button key={t} type="button" className={`client-tab ${activeTab === t ? 'active' : ''}`} onClick={() => navigate(`/clients/${id}?tab=${t}`)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {editing ? (
        <div className="card" style={{ maxWidth: 640 }}>
          <ClientForm userId={user.id} initial={client} onSuccess={(c) => { setClient(c); setEditing(false); }} onCancel={() => setEditing(false)} />
        </div>
      ) : (
        <>
          {activeTab === 'genel' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 12 }}>Genel Bilgiler</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, fontSize: 14 }}>
                  <span style={{ color: 'var(--muted)' }}>Dosya No</span><b>{client.fileNumber}</b>
                  <span style={{ color: 'var(--muted)' }}>Ad Soyad</span><b>{client.firstName} {client.lastName}</b>
                  <span style={{ color: 'var(--muted)' }}>Doğum</span><span>{client.birthDate ? formatDateTR(client.birthDate) : '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>Telefon</span><span>{client.phone || '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>E-posta</span><span>{client.email || '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>Meslek</span><span>{client.profession || '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>Eğitim</span><span>{client.education || '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>Durum</span><span>{CLIENT_STATUS_LABEL[client.status]}</span>
                  <span style={{ color: 'var(--muted)' }}>Oluşturan</span><span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{client.createdBy.slice(0, 8)}…</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="card">
                  <h4 style={{ fontSize: 13, marginBottom: 8 }}>Yakın Randevular ({appointments.length})</h4>
                  {appointments.length === 0 ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>Randevu yok</div> : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {appointments.slice(0, 3).map((a) => <div key={a.id} style={{ fontSize: 12 }}><b>{a.title}</b> • {new Date(a.startAt).toLocaleString('tr-TR')} • <span className="badge">{a.status}</span></div>)}
                    </div>
                  )}
                </div>
                <div className="card">
                  <h4 style={{ fontSize: 13, marginBottom: 8 }}>Açık Görevler ({tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length})</h4>
                  {tasks.length === 0 ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>Görev yok</div> : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {tasks.slice(0, 3).map((t) => <div key={t.id} style={{ fontSize: 12 }}><b>{t.title}</b> • {t.status} • {t.priority}{t.dueDate ? ` • ${t.dueDate}` : ''}</div>)}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <ExportSection clientId={client.id} fileNumber={client.fileNumber} />
                <div className="card">
                  <h4 style={{ fontSize: 13, marginBottom: 8 }}>AI Özet Yardımcısı (stub, tanı koymaz)</h4>
                  <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>AI ilk sürümde zorunlu değil; eklenirse tanı koymayacak, test puanı üretmeyecek, norm uydurmayacak. Sadece uzmanın yazdığı metni özetler.</p>
                  <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 8 }} onClick={async () => {
                    try {
                      const result = await summarizeWithAI({ text: `Danışan ${client.firstName} ${client.lastName} ile yapılan görüşmede ${client.profession || 'meslek belirtilmedi'} ve ${client.education || 'eğitim'} bilgileri değerlendirildi.`, type: 'session_notes' });
                      showToast(`AI özet: ${result.summary.slice(0, 80)}…`, 'success');
                    } catch (e) { showToast((e as Error).message, 'error'); }
                  }}>Özet Dene (stub)</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'anamnez' && <div className="card"><h3 style={{ fontSize: 14, marginBottom: 12 }}>Anamnez (1-1, upsert)</h3><AnamnesisForm clientId={client.id} /></div>}

          {activeTab === 'görüşmeler' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14 }}>Yeni Görüşme</h3>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowSessionForm((v) => !v)}>{showSessionForm ? 'Kapat' : '+ Ekle'}</button>
                </div>
                {showSessionForm && <SessionForm clientId={client.id} onSuccess={() => { setShowSessionForm(false); setSessionRefresh((k) => k + 1); }} />}
              </div>
              <SessionList clientId={client.id} refreshKey={sessionRefresh} />
            </div>
          )}

          {activeTab === 'değerlendirmeler' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14 }}>Yeni Değerlendirme</h3>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowAssessmentForm((v) => !v)}>{showAssessmentForm ? 'Kapat' : '+ Ekle'}</button>
                </div>
                {showAssessmentForm && <AssessmentForm clientId={client.id} onSuccess={() => { setShowAssessmentForm(false); setAssessmentRefresh((k) => k + 1); }} />}
              </div>
              <AssessmentList clientId={client.id} refreshKey={assessmentRefresh} />
            </div>
          )}

          {activeTab === 'testler' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14 }}>Yeni Test Uygulaması (MMPI harici kaynak)</h3>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowTestForm((v) => !v)}>{showTestForm ? 'Kapat' : '+ Ekle'}</button>
                </div>
                {showTestForm && <TestAdminForm clientId={client.id} onSuccess={() => { setShowTestForm(false); setTestRefresh((k) => k + 1); }} />}
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Not: MMPI scoring/norms/questions kopyalanmaz — sadece özet ilişkilendirilir (source="mmpi"). Ham soru yok.</div>
              </div>
              <TestAdminList clientId={client.id} refreshKey={testRefresh} onAddResult={(aid) => setTestResultFor(aid)} />
              {testResultFor && (
                <div className="card">
                  <h4 style={{ fontSize: 13, marginBottom: 8 }}>Test Sonucu Ekle — {testResultFor.slice(0, 8)}</h4>
                  <TestResultForm administrationId={testResultFor} onSuccess={() => { setTestResultFor(null); setTestRefresh((k) => k + 1); }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}><button type="button" className="btn btn--ghost btn--sm" onClick={() => setTestResultFor(null)}>Kapat</button></div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'raporlar' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 12 }}>Raporlar — block model + autosave + versioning + PDF</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {templates.map((tpl) => <button key={tpl.id} type="button" className="btn btn--soft btn--sm" onClick={() => handleCreateReport(tpl.id)}>+ {tpl.name} {tpl.isSystem ? '(sistem)' : ''}</button>)}
                </div>
                {reports.length === 0 ? (
                  <div className="empty-state-card"><div className="empty-state-icon">—</div><h4>Henüz rapor yok</h4><p>Şablondan yeni rapor oluştur — block editor, otomatik kayıt, sürüm geçmişi, PDF</p></div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {reports.map((r) => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 10px', border: `1px solid ${selectedReportId === r.id ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, background: selectedReportId === r.id ? 'var(--bg-soft)' : 'var(--card)' }}>
                        <div><div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>v{r.versionNumber} • rev {r.revision} • {r.status} • {new Date(r.updatedAt).toLocaleString('tr-TR')}</div></div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedReportId(r.id)}>Aç</button>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={async () => { if (!confirm('Rapor silinsin mi?')) return; try { await deleteReport(r.id); setReports((prev) => prev.filter((x) => x.id !== r.id)); if (selectedReportId === r.id) setSelectedReportId(null); showToast('Rapor silindi', 'success'); } catch (e) { showToast((e as Error).message, 'error'); } }}>Sil</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedReport && reportDraftContent && sourceData && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14 }}>Düzenle: {selectedReport.title}</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>v{selectedReport.versionNumber} • rev {selectedReport.revision} • {selectedReport.saveReason}</span>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedReportId(null)}>Kapat</button>
                    </div>
                  </div>
                  <ReportEditorInline reportId={selectedReport.id} content={reportDraftContent} revision={selectedReport.revision} sourceData={sourceData} onSave={handleSaveReport} />
                  <div style={{ marginTop: 16 }}>
                    <h4 style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Sürüm Geçmişi (immutable)</h4>
                    <div style={{ display: 'grid', gap: 4 }}>
                      {reportVersions.map((v) => (
                        <div key={v.id} style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8 }}>
                          <span>v{v.versionNumber}</span><span>{new Date(v.createdAt).toLocaleString('tr-TR')}</span><span>{v.reason}</span>
                          <button type="button" className="btn btn--ghost" style={{ fontSize: 10, padding: '0 4px', height: 18 }} onClick={async () => { if (!confirm(`v${v.versionNumber} içeriğine dön?`)) return; try { const restored = await updateReport(selectedReport.id, { content: v.content, saveReason: 'restore' }, selectedReport.revision); setSelectedReport(restored); setReportDraftContent(restored.content); setReports((prev) => prev.map((r) => (r.id === restored.id ? restored : r))); showToast('Sürüm geri yüklendi', 'success'); } catch (e) { showToast((e as Error).message, 'error'); } }}>Geri Yükle</button>
                        </div>
                      ))}
                      {reportVersions.length === 0 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Sürüm yok</div>}
                    </div>
                  </div>
                </div>
              )}

              {selectedReport && sourceData && reportDraftContent && (
                <div>
                  <h3 style={{ fontSize: 13, marginBottom: 8 }}>Önizleme + PDF (print)</h3>
                  <ReportPreview doc={reportDraftContent} sourceData={sourceData} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()}>PDF Yazdır</button></div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'belgeler' && <DocumentSection clientId={client.id} />}
          {activeTab === 'notlar' && <NoteSection clientId={client.id} />}
          {activeTab === 'geçmiş' && (
            <div className="card">
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Geçmiş — Audit Log (danışan)</h3>
              {auditLogs.length === 0 ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>Log yok — sadece ADMIN/ORG_ADMIN görebilir (RLS)</div> : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {auditLogs.map((l) => (
                    <div key={l.id} style={{ display: 'flex', gap: 8, fontSize: 12, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{new Date(l.createdAt).toLocaleString('tr-TR')}</span>
                      <span className="badge">{l.action}</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{l.targetTable}:{l.targetId?.slice(0, 8)}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>actor:{l.actor?.slice(0, 8) || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>Tüm tablo audit: appointments, tasks, documents, notes, sessions, assessments, reports, templates — trigger server-side, client atlayamaz</div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog open={confirmArchive} onClose={() => setConfirmArchive(false)} onConfirm={handleArchive} title={client.status === 'active' ? 'Arşivle?' : 'Aktifleştir?'} description={client.status === 'active' ? 'Danışan arşive taşınacak, listede arşiv filtresiyle görünecek.' : 'Danışan aktif hale getirilecek.'} confirmLabel={client.status === 'active' ? 'Arşivle' : 'Aktifleştir'} variant="primary" />
      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={handleDelete} title="Danışanı sil?" description="Bu işlem geri alınamaz. Danışana bağlı anamnez/görüşme/değerlendirme/rapor/belge de silinebilir (cascade). Audit log kalır." confirmLabel="Sil" variant="danger" />
    </div>
  );
}

function ReportEditorInline({ reportId, content, revision: _revision, sourceData, onSave }: { reportId: string; content: ReportDocument; revision: number; sourceData: ReportSourceData; onSave: (content: ReportDocument, reason: 'manual' | 'complete') => Promise<void>; }) {
  const [doc, setDoc] = useState<ReportDocument>(content);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDoc(content); }, [content, reportId]);
  const updateBlockText = (blockId: string, text: string) => {
    setDoc((prev) => ({ ...prev, blocks: prev.blocks.map((b) => (b.id === blockId ? { ...b, runs: [{ text }] } : b)) }));
  };
  const handleManual = async () => {
    setSaving(true);
    try { await onSave(doc, 'manual'); showToast('Kaydedildi', 'success'); } catch (e) { showToast((e as Error).message, 'error'); } finally { setSaving(false); }
  };
  const handleComplete = async () => {
    setSaving(true);
    try { await onSave(doc, 'complete'); showToast('Tamamlandı', 'success'); } catch (e) { showToast((e as Error).message, 'error'); } finally { setSaving(false); }
  };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn--ghost btn--sm" onClick={handleManual} disabled={saving}>Kaydet</button>
        <button type="button" className="btn btn--primary btn--sm" onClick={handleComplete} disabled={saving}>Tamamla</button>
      </div>
      {doc.blocks.map((block) => (
        <div key={block.id} className="card" style={{ padding: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{block.type} {block.path ? `• ${block.path}` : ''}</div>
          {block.type === 'dataField' || block.type === 'dataTable' ? (
            <div style={{ fontSize: 12 }}><b>{block.label || block.path}:</b> {block.path ? (() => { try { const parts = block.path.split('.'); let cur: unknown = sourceData.fields; for (const p of parts) { if (!cur || typeof cur !== 'object') { cur = undefined; break; } cur = (cur as Record<string, unknown>)[p]; } return typeof cur === 'string' ? cur : cur ? JSON.stringify(cur) : '—'; } catch { return '—'; } })() : '—'}</div>
          ) : (
            <textarea className="textarea" value={(block.runs?.[0]?.text || '') as string} onChange={(e) => updateBlockText(block.id, e.target.value)} rows={block.type.startsWith('heading') ? 1 : 3} />
          )}
        </div>
      ))}
    </div>
  );
}
