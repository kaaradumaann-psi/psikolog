import { useState, useEffect } from 'react';
import type {
  ClinicalReport,
  ClinicalReportType,
  Client,
  ReportSection,
} from '../../clinical/clinicalTypes';
import {
  createClinicalReportRevision,
  getClinicalReports,
  lockClinicalReport,
  saveClinicalReport,
  signClinicalReport,
  deleteClinicalReport,
  getClients,
  getBeckDepressionTests,
  getBeckAnxietyTests,
  getScl90Tests,
  subscribeClinicalStore,
} from '../../clinical/clinicalStore';
import { measurementNote, progressSections, readingsForClient } from '../../clinical/casework';
import { getFormulation, getScreenings, getSettings } from '../../clinical/practiceStore';
import { getSessionsByClientId } from '../../clinical/clinicalStore';
import { clinicToday, isSafeImageUrl } from '../../clinical/recordRules';
import { Icon } from '../Icon';
import { ConfirmDialog } from '../ConfirmDialog';
import { RecordLockActions, RecordStatusBadge } from './RecordLockActions';

export function ClinicalReportsPage() {
  const [reports, setReports] = useState<ClinicalReport[]>(() => getClinicalReports());
  const [clients, setClients] = useState<Client[]>(() => getClients());
  const [reportClientId, setReportClientId] = useState('');
  const [activeReport, setActiveReport] = useState<ClinicalReport | null>(() => reports[0] || null);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ClinicalReport | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form State
  const [reportForm, setReportForm] = useState<Partial<ClinicalReport>>({
    clientId: '',
    clientName: '',
    clientGender: undefined,
    clientAge: undefined,
    reportType: 'comprehensive',
    reportTitle: 'Kapsamlı Psikolojik Değerlendirme Raporu',
    reportDate: clinicToday(),
    evaluator: getSettings().evaluatorName,
    sections: [],
    recommendations: [],
    formalDiagnosis: '',
  });

  useEffect(() => {
    const unsub = subscribeClinicalStore(() => {
      const reps = getClinicalReports();
      setReports(reps);
      setClients(getClients());
      if (activeReport) {
        const updated = reps.find(r => r.id === activeReport.id);
        if (updated) setActiveReport(updated);
      }
    });
    return unsub;
  }, [activeReport]);

  function handleCreateNew(type: ClinicalReportType = 'comprehensive') {
    const firstClient = clients.find((client) => client.id === reportClientId);
    if (!firstClient) {
      setCreateError('Rapor hangi danışana aitse onu seçin.');
      return;
    }
    setCreateError(null);
    const cName = `${firstClient.firstName} ${firstClient.lastName}`;
    const cId = firstClient.id;

    let title = 'Kapsamlı Psikolojik Değerlendirme Raporu';
    let defaultSections: ReportSection[] = [];

    const recorded = (value: string | undefined) => value?.trim() || 'Kayıtta yok. Klinisyen yazmadan bu bölüm olgu içermez.';
    const readings = readingsForClient(cId, {
      bdi: getBeckDepressionTests(),
      bai: getBeckAnxietyTests(),
      scl: getScl90Tests(),
      screenings: getScreenings(),
    });
    const formulation = getFormulation(cId);
    const sessions = getSessionsByClientId(cId);
    const lastSession = [...sessions].sort((a, b) => a.date.localeCompare(b.date) || a.sessionNumber - b.sessionNumber).at(-1);

    if (type === 'comprehensive') {
      title = 'Kapsamlı Psikolojik Değerlendirme Raporu';
      defaultSections = [
        { id: 's1', title: '1. Başvuru nedeni', content: recorded(firstClient.presentingComplaint) },
        { id: 's2', title: '2. Ruhsal durum muayenesi', content: 'Bu bölüm otomatik doldurulmaz. Gözlem yazılmadan raporda davranış iddiası yer almaz.' },
        { id: 's3', title: '3. Ölçek bulguları', content: readings.length ? measurementNote(readings) : 'Bu danışan için kayıtlı ölçek yok. Uygulanmamış ölçek rapora yazılmaz.' },
        {
          id: 's4',
          title: '4. Formülasyon',
          content: formulation
            ? [formulation.modality && `Yaklaşım: ${formulation.modality}`, formulation.precipitating && `Tetikleyen: ${formulation.precipitating}`, formulation.perpetuating && `Sürdüren: ${formulation.perpetuating}`, formulation.protective && `Koruyucu: ${formulation.protective}`].filter(Boolean).join('\n') || 'Formülasyon kaydı boş.'
            : 'Formülasyon kaydı yok.',
        },
        { id: 's5', title: '5. Plan', content: recorded(lastSession?.plan) },
      ];
    } else if (type === 'beck') {
      const bdi = getBeckDepressionTests().find((item) => item.clientId === cId);
      const bai = getBeckAnxietyTests().find((item) => item.clientId === cId);
      title = 'Beck Envanterleri Duygu-Durum Raporu';
      defaultSections = [
        { id: 's1', title: '1. Uygulama', content: `Kayıtlı BDI: ${bdi ? 'var' : 'yok'}. Kayıtlı BAI: ${bai ? 'var' : 'yok'}. Uygulanmamış envanter rapora yazılmaz. Puanlar tarama bandıdır, tanı değildir.` },
        { id: 's2', title: '2. Puanlar', content: `BDI: ${bdi ? `${bdi.totalScore}/63 (${bdi.severity})${bdi.suicideRisk ? ' — Madde 9 uyarısı' : ''}` : 'kayıt yok'}. BAI: ${bai ? `${bai.totalScore}/63 (${bai.severity})` : 'kayıt yok'}.` },
        { id: 's3', title: '3. Klinik yorum', content: 'Şiddet bandı, görüşme ve işlevsellik ile birlikte okunmalıdır. Güvenlik maddesi pozitifse protokol işletilir.' },
      ];
    } else if (type === 'scl90') {
      const scl = getScl90Tests().find((item) => item.clientId === cId);
      title = 'SCL-90-R Semptom Profili Raporu';
      defaultSections = [
        { id: 's1', title: '1. Genel indeksler', content: scl ? `GSI ${scl.gsi}, PST ${scl.pst}, PSDI ${scl.psdi}.` : 'Bu danışan için SCL-90-R kaydı yok.' },
        { id: 's2', title: '2. Boyutlar', content: scl ? `SOM ${scl.dimensionScores.somatization}, O-C ${scl.dimensionScores.obsessiveCompulsive}, DEP ${scl.dimensionScores.depression}, ANX ${scl.dimensionScores.anxiety}, HOS ${scl.dimensionScores.hostility}.` : 'Boyut puanı üretilemedi.' },
        { id: 's3', title: '3. Sınır', content: 'GSI ≥ 1.0 klinik eşik uyarısıdır. Norm tek başına tanı koymaz.' },
      ];
    } else if (type === 'referral') {
      title = 'Psikiyatrik Konsültasyon & Sevk Raporu';
      defaultSections = [
        { id: 's1', title: '1. Sevk nedeni', content: 'Sevk nedeni klinisyen tarafından yazılır. Otomatik tıbbi talep üretilmez.' },
        { id: 's2', title: '2. Kayıttaki özet', content: recorded(firstClient.presentingComplaint) },
        { id: 's3', title: '3. Test sonuçları', content: readings.length ? measurementNote(readings) : 'Kayıtlı ölçek yok.' },
      ];
    } else {
      title = 'Klinik İlerleme & Seans Özet Raporu';
      defaultSections = progressSections({
        clientName: cName,
        sessions: cId ? getSessionsByClientId(cId) : [],
        readings: cId
          ? readingsForClient(cId, {
              bdi: getBeckDepressionTests(),
              bai: getBeckAnxietyTests(),
              scl: getScl90Tests(),
              screenings: getScreenings(),
            })
          : [],
        formulation: cId ? getFormulation(cId) : undefined,
      });
    }

    const newDoc: ClinicalReport = {
      id: 'rep_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      clientId: cId,
      clientName: cName,
      clientGender: firstClient.gender,
      clientAge: firstClient.birthDate ? firstClient.age : undefined,
      reportType: type,
      reportTitle: title,
      reportDate: clinicToday(),
      evaluator: getSettings().evaluatorName,
      sections: defaultSections,
      recommendations: [],
      formalDiagnosis: firstClient.diagnoses.join(', '),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveClinicalReport(newDoc);
    setActiveReport(newDoc);
    setIsEditing(false);
  }

  function handleSaveEdit() {
    if (!activeReport) return;
    const updated: ClinicalReport = {
      ...activeReport,
      ...reportForm,
      id: activeReport.id,
      updatedAt: new Date().toISOString(),
    } as ClinicalReport;

    try {
      saveClinicalReport(updated);
      setLockError(null);
      setActiveReport(updated);
      setIsEditing(false);
    } catch {
      setLockError('Rapor saklanamadı. Verileri silmeyin; senkronizasyon durumunu kontrol edip yeniden deneyin.');
    }
  }

  function startEdit(rep: ClinicalReport) {
    if (rep.lockedAt) {
      setLockError('Kilitli rapor düzenlenemez. Düzeltme için yeni revizyon oluşturun.');
      return;
    }
    setActiveReport(rep);
    setReportForm({ ...rep });
    setIsEditing(true);
  }

  function handleDelete(rep: ClinicalReport) {
    setPendingDelete(rep);
  }

  function confirmDeleteReport() {
    const report = pendingDelete;
    if (!report) return;
    try {
      deleteClinicalReport(report.id);
      const remaining = reports.filter(r => r.id !== report.id);
      setActiveReport(remaining[0] || null);
      setIsEditing(false);
      setLockError(null);
    } catch (error) {
      setLockError(error instanceof Error ? error.message : 'Rapor silinemedi.');
    } finally {
      setPendingDelete(null);
    }
  }

  function runLockAction(action: () => void) {
    try {
      action();
      setLockError(null);
    } catch (error) {
      setLockError(error instanceof Error ? error.message : 'İşlem tamamlanamadı.');
    }
  }

  return (
    <div className="clinical-container">
      {/* Üst Başlık */}
      <div className="clinical-header btn-print-hide">
        <div className="clinical-title-wrap">
          <div className="clinical-kicker">
            <span className="clinical-kicker-dot" />
            <span>Resmi Klinik Belgelendirme</span>
          </div>
          <h1>Klinik Raporlar &amp; Epikriz</h1>
          <p>Kapsamlı psikolojik değerlendirme, sevk ve ilerleme raporu üretici.</p>
        </div>

        <div className="clinical-actions">
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            <Icon name="print" size={16} />
            <span>A4 Raporu Yazdır</span>
          </button>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button type="button" className="btn-primary" onClick={() => handleCreateNew('comprehensive')}>
              <Icon name="plus" size={16} />
              <span>Yeni Kapsamlı Rapor</span>
            </button>
          </div>
        </div>
      </div>

      <div className="report-split">
        <div className="report-list btn-print-hide">
          <div className="report-list-label">Kayıtlı raporlar ({reports.length})</div>

          {reports.length === 0 ? (
            <div className="empty-state-card">
              <p>Kayıtlı rapor yok.</p>
            </div>
          ) : (
            reports.map(r => (
              <button
                type="button"
                key={r.id}
                className={`report-list-item${activeReport?.id === r.id ? ' is-selected' : ''}`}
                onClick={() => {
                  setActiveReport(r);
                  setIsEditing(false);
                }}
              >
                <strong>{r.clientName}</strong>
                <span>{r.reportTitle}</span>
                <small>{r.reportDate}</small>
                <div style={{ marginTop: 4 }}>
                  <RecordStatusBadge status={r.lockedAt ? 'locked' : r.signedAt ? 'signed' : 'draft'} revision={r.revision} />
                </div>
              </button>
            ))
          )}

          {createError && <p className="record-lock-error" role="alert">{createError}</p>}
          <label className="form-group" style={{ marginTop: 8 }}>
            <span>Raporun danışanı</span>
            <select
              value={reportClientId}
              onChange={(event) => { setReportClientId(event.target.value); setCreateError(null); }}
            >
              <option value="">Danışan seçin</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.fileNumber} · {client.firstName} {client.lastName}</option>
              ))}
            </select>
          </label>
          <div className="report-create">
            <button type="button" className="btn-secondary btn-full btn-sm" onClick={() => handleCreateNew('referral')}>
              Psikiyatrik Sevk Raporu
            </button>
            <button type="button" className="btn-secondary btn-full btn-sm" onClick={() => handleCreateNew('session_progress')}>
              Seans İlerleme Raporu
            </button>
            <button type="button" className="btn-secondary btn-full btn-sm" onClick={() => handleCreateNew('beck')}>
              Beck Raporu
            </button>
            <button type="button" className="btn-secondary btn-full btn-sm" onClick={() => handleCreateNew('scl90')}>
              SCL-90-R Raporu
            </button>
          </div>
        </div>

        {/* Sağ Kolon: Rapor Görüntüleme & Düzenleme (A4 Dokümanı) */}
        <div>
          {activeReport ? (
            <div>
              {/* Düzenle / Sil Barı */}
              <div className="btn-print-hide" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
                {isEditing ? (
                  <>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => setIsEditing(false)}>
                      İptal
                    </button>
                    <button type="button" className="btn-primary btn-sm" onClick={handleSaveEdit}>
                      Değişiklikleri Kaydet
                    </button>
                  </>
                ) : (
                  <>
                    {!activeReport.lockedAt && (
                      <button type="button" className="btn-secondary btn-sm" onClick={() => startEdit(activeReport)}>
                        <Icon name="edit" size={14} />
                        <span>Raporu Düzenle</span>
                      </button>
                    )}
                    {!activeReport.lockedAt && !activeReport.amendmentOf && !activeReport.supersededBy && (
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        title="Raporu sil"
                        onClick={() => handleDelete(activeReport)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                    <RecordLockActions
                      status={activeReport.lockedAt ? 'locked' : activeReport.signedAt ? 'signed' : 'draft'}
                      onSign={() => runLockAction(() => { const next = signClinicalReport(activeReport.id); if (next) setActiveReport(next); })}
                      onLock={() => runLockAction(() => { const next = lockClinicalReport(activeReport.id); if (next) setActiveReport(next); })}
                      onRevise={reason => runLockAction(() => {
                        const next = createClinicalReportRevision(activeReport.id, reason);
                        if (next) {
                          setActiveReport(next);
                          setReportForm({ ...next });
                        }
                      })}
                    />
                  </>
                )}
              </div>
              {lockError && <p className="record-lock-error" role="alert">{lockError}</p>}

              {/* A4 Kağıt Düzeni */}
              <div
                className="print-report-sheet modern-table-card"
                style={{
                  padding: '40px 48px',
                  background: '#ffffff',
                  boxShadow: 'var(--shadow-md)',
                  minHeight: 800,
                }}
              >
                {/* Antet Başlığı */}
                <div className="print-header-letterhead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0d0d0d', paddingBottom: 16, marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <img src={isSafeImageUrl(getSettings().logoDataUrl) ? getSettings().logoDataUrl : '/logo-mark.png'} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        {getSettings().evaluatorName}
                      </h2>
                      <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.04em' }}>
                        {getSettings().clinicName}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11.5, color: '#444' }}>
                    <div>{getSettings().email}</div>
                    <div>{getSettings().phone || '—'}</div>
                  </div>
                </div>

                {/* Rapor Başlığı */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    {activeReport.reportTitle}
                  </h1>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    Rapor Tarihi: {activeReport.reportDate}
                  </div>
                </div>

                {/* Danışan Bilgi Tablosu */}
                <div style={{ background: '#f8f8fa', border: '1px solid #e0e0e4', padding: '12px 16px', borderRadius: 6, marginBottom: 24, fontSize: 12.5, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 20px' }}>
                  <div><strong>Danışan Adı Soyadı:</strong> {activeReport.clientName}</div>
                  <div><strong>Cinsiyet / Yaş:</strong> {activeReport.clientGender === 'ERKEK' ? 'Erkek' : 'Kadın'}{typeof activeReport.clientAge === 'number' ? `, ${activeReport.clientAge} yaş` : ', yaş belirtilmedi'}</div>
                  <div><strong>Değerlendiren Uzman:</strong> {activeReport.evaluator}</div>
                  <div><strong>Tanısal Formülasyon:</strong> {activeReport.formalDiagnosis || '—'}</div>
                </div>

                {/* Rapor Bölümleri */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 13, lineHeight: 1.65, color: '#1a1a1a' }}>
                  {activeReport.sections.map((sec, idx) => (
                    <div key={sec.id || idx}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 4, margin: '0 0 8px', textTransform: 'uppercase', color: '#0d0d0d' }}>
                        {sec.title}
                      </h3>
                      {isEditing ? (
                        <textarea
                          rows={4}
                          value={sec.content}
                          onChange={e => {
                            const updatedSecs = [...(reportForm.sections || [])];
                            updatedSecs[idx] = { ...sec, content: e.target.value };
                            setReportForm({ ...reportForm, sections: updatedSecs });
                          }}
                          style={{ width: '100%', padding: 8, fontSize: 13 }}
                        />
                      ) : (
                        <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{sec.content}</p>
                      )}
                    </div>
                  ))}

                  {/* Öneriler */}
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 4, margin: '0 0 8px', textTransform: 'uppercase', color: '#0d0d0d' }}>
                      Klinik Sonuç &amp; Öneriler
                    </h3>
                    {isEditing ? (
                      <textarea
                        rows={3}
                        value={(reportForm.recommendations || []).join('\n')}
                        onChange={e => setReportForm({
                          ...reportForm,
                          recommendations: e.target.value.split('\n').map((line) => line.trim()).filter(Boolean),
                        })}
                        placeholder="Her satır bir öneri. Boş bırakılırsa öneri üretilmez."
                        style={{ width: '100%', padding: 8, fontSize: 13 }}
                      />
                    ) : activeReport.recommendations.length ? (
                      <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                        {activeReport.recommendations.map((rec, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: 0 }}>Öneri yazılmadı.</p>
                    )}
                  </div>
                </div>

                {/* İmza & Kaşe Alanı */}
                <div className="print-signature-box" style={{ marginTop: 40, display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'center', width: 220, borderTop: '1px solid #333', paddingTop: 8 }}>
                    {isSafeImageUrl(getSettings().signatureDataUrl) && (
                      <img src={getSettings().signatureDataUrl} alt="" style={{ height: 56, objectFit: 'contain', margin: '0 auto 6px' }} />
                    )}
                    <strong style={{ display: 'block', fontSize: 13 }}>{activeReport.evaluator}</strong>
                    <span style={{ fontSize: 11, color: '#555' }}>{getSettings().title || 'Klinik Psikolog'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state-card">
              <Icon name="fileText" size={40} />
              <h4>Görüntülenecek Rapor Yok</h4>
              <p>Soldaki menüden bir rapor seçebilir veya yeni bir klinik rapor oluşturabilirsiniz.</p>
              <button type="button" className="btn-primary btn-sm" onClick={() => handleCreateNew('comprehensive')}>
                Kapsamlı Rapor Oluştur
              </button>
            </div>
          )}
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Klinik raporu sil"
          description={`${pendingDelete.clientName} · ${pendingDelete.reportTitle} (${pendingDelete.reportDate}) silinecek. Bu işlem geri alınamaz.`}
          confirmLabel="Raporu sil"
          onConfirm={confirmDeleteReport}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
