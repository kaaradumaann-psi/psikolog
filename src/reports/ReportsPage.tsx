import { useEffect, useMemo, useState } from 'react';
import type { AuthenticatedUser } from '../auth/authTypes';
import { type FullRecordDetail } from '../records/supabaseRecords';
import { methodLabel, parseRecordPayload } from '../workspace/caseTypes';
import { profileFromRecord } from '../results/recordProfile';
import { navigate } from '../router';
import { MMPIPrintReport } from '../components/results/MMPIPrintReport';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { reportDataAdapter } from './reportDataAdapter';
import { loadReportContext } from './loadReportContext';
import {
  createReport,
  createTemplate,
  deleteReport,
  getReport,
  getSettings,
  listReports,
  listTemplates,
  type ReportSummary,
  type ReportTemplate,
  type SavedReport,
} from './reportsApi';
import {
  EMPTY_LETTERHEAD,
  instantiateTemplate,
  standardTemplate,
  SYSTEM_TEMPLATE_ID,
  SYSTEM_TEMPLATE_NAME,
  type Letterhead,
} from './templateEngine';
import { ReportEditor } from './ReportEditor';
import { ReportSettings } from './ReportSettings';
import { ReportPreview } from './ReportPreview';
import { PaperViewport } from '../components/PaperViewport';

export function ReportsSummary({ recordId }: { recordId: string }) {
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    setReports(null);
    setError('');
    listReports(recordId)
      .then((r) => {
        if (alive) setReports(r);
      })
      .catch((e) => {
        if (alive) setError(String(e));
      });
    return () => {
      alive = false;
    };
  }, [recordId]);
  return (
    <section className="report-summary-card">
      <div className="section-heading">
        <h3>Raporlar {reports ? `(${reports.length}${reports.length === 200 ? '+' : ''})` : ''}</h3>
        <a className="btn-secondary" href={`/kayitlar/${recordId}/raporlar`}>
          Raporları Aç
        </a>
      </div>
      {error ? (
        <p className="status-banner error-banner" role="alert">Raporlar yüklenemedi. {error}</p>
      ) : !reports ? (
        <p>Yükleniyor…</p>
      ) : !reports.length ? (
        <p>Henüz psikolog raporu yok. Tam Raporu açabilir veya yeni rapor oluşturabilirsiniz.</p>
      ) : (
        reports.slice(0, 3).map((r) => (
          <p key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href={`/kayitlar/${recordId}/raporlar/${r.id}`}>{r.title}</a>
            <span className={`status-pill ${r.status === 'draft' ? 'status-draft' : 'status-completed'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
              <span className="status-dot" aria-hidden="true" />
              {r.status === 'draft' ? 'Taslak' : 'Tamamlandı'}
            </span>
            <span style={{ color: 'var(--soft)', fontSize: 12 }}>{new Date(r.updated_at).toLocaleDateString('tr-TR')}</span>
          </p>
        ))
      )}
    </section>
  );
}
export function ReportsPage({
  recordId,
  reportId,
  viewer,
}: {
  recordId: string;
  reportId?: string;
  viewer: AuthenticatedUser;
}) {
  const [record, setRecord] = useState<FullRecordDetail | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [settings, setSettings] = useState<Letterhead>(EMPTY_LETTERHEAD);
  const [report, setReport] = useState<SavedReport | null>(null);
  const [templateId, setTemplateId] = useState(SYSTEM_TEMPLATE_ID);
  const [title, setTitle] = useState('MMPI Psikolog Raporu');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [deleting, setDeleting] = useState<ReportSummary | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setReport(null);
    Promise.all([
      loadReportContext(recordId),
      listReports(recordId),
      listTemplates(),
      getSettings(viewer.id),
      reportId ? getReport(reportId, recordId) : Promise.resolve(null),
    ])
      .then(([r, list, t, h, selected]) => {
        if (!alive) return;
        setRecord(r.record);
        setReports(list);
        setTemplates(t);
        setSettings(h);
        setReport(selected);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Raporlar yüklenemedi.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [recordId, reportId, viewer.id, reload]);
  const parsed = useMemo(() => (record ? parseRecordPayload(record.rawOmrAnswers) : null), [record]);
  const profile = useMemo(
    () => (record && parsed ? profileFromRecord(record, parsed) : null),
    [record, parsed],
  );
  const source = useMemo(
    () => (record && parsed ? reportDataAdapter(record, parsed, profile) : null),
    [record, parsed, profile],
  );
  if (loading) return <div className="loading-state-card">Raporlar yükleniyor…</div>;
  if (error || !record || !source || !parsed)
    return (
      <div className="status-banner error-banner" role="alert">
        <p>{error || 'Kayıt bulunamadı.'}</p>
        <button onClick={() => setReload((x) => x + 1)}>Yeniden Dene</button>
        <a href={`/kayitlar/${recordId}`}>Testi İncele</a>
      </div>
    );
  if (reportId && report)
    return (
      <ReportEditor
        key={report.id}
        initial={report}
        latestSource={source}
        profile={profile}
        parsed={parsed}
        viewer={viewer}
        letterhead={settings}
        previewInitially={new URLSearchParams(window.location.search).get('gorunum') === 'onizleme'}
      />
    );
  const selectedTemplate = templates.find((t) => t.id === templateId);
  const templateDocument = templateId === SYSTEM_TEMPLATE_ID ? standardTemplate() : selectedTemplate?.content;
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  }
  const c = parsed.client;
  const fullMeta = {
    fullName: `${c?.firstName ?? record.firstName} ${c?.lastName ?? record.lastName}`.trim(),
    testDate: parsed.client?.testDate || record.applicationDate,
    reportDate: new Date().toLocaleDateString('tr-TR'),
    psychologist: record.psychologistName || '',
    gender: c?.gender ?? record.gender ?? '',
    age: (c?.age ?? record.age) == null ? '—' : String(c?.age ?? record.age),
    occupation: c?.occupation ?? record.occupation ?? '',
    education: c?.education ?? record.education ?? '',
    method: parsed.method ? methodLabel(parsed.method) : '',
    duration: parsed.testDuration || '',
    reason: parsed.applicationReason || record.requestedBy || '',
    followUp: parsed.followUp || '',
    marital: parsed.maritalStatus || '',
    expertNotes: record.expertNotes,
    notesUpdatedAt: record.notesUpdatedAt || '',
    scoringVersion: parsed.scoringVersion,
    revisionOf: parsed.revisionOf,
    revisionReason: parsed.revisionReason,
  };
  return (
    <div className="reports-page">
      <div className="screen-only">
        <a href={`/kayitlar/${recordId}`}>← Testi İncele</a>
        <header className="reports-heading">
          <span className="section-badge badge-primary">MMPI · RAPORLAR</span>
          <h1>Rapor çalışma alanı</h1>
          <p>
            {record.firstName} {record.lastName} · {record.applicationDate}
          </p>
        </header>
        <div className="report-choice-grid">
          <section className="report-choice-card">
            <span className="section-badge">01 · TAM RAPOR</span>
            <h2>Tüm MMPI sonuçları</h2>
            <p>APA 7 uyumlu ham çıktı — grafik ve yorumlar salt okunur. Düzenleme gerektirmez.</p>
            <div className="report-actions">
              <a className="btn-secondary" href={`/kayitlar/${recordId}`}>
                Aç
              </a>
              <button className="btn-secondary" disabled={!profile} onClick={() => setFullOpen((v) => !v)}>
                Önizle
              </button>

            </div>
          </section>
          <section className="report-choice-card">
            <span className="section-badge badge-primary">02 · PSİKOLOG RAPORU</span>
            <h2>Değerlendirmenizi yazın</h2>
            <p>Doğrulanmış MMPI verilerini şablona aktarın; metninizi düzenleyin ve sürümleri saklayın.</p>
            <label>
              Rapor Şablonu
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.is_system ? ' · Sistem' : ' · Kişisel'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rapor adı
              <input maxLength={180} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <button
              className="btn-primary"
              disabled={busy || !title.trim() || !templateDocument}
              onClick={() =>
                void run(async () => {
                  if (!templateDocument) return;
                  const content = { ...instantiateTemplate(templateDocument, source), letterhead: settings };
                  const id = await createReport({
                    mmpi_record_id: recordId,
                    created_by: viewer.id,
                    template_id: templateId,
                    template_name: selectedTemplate?.name || SYSTEM_TEMPLATE_NAME,
                    title: title.trim(),
                    content,
                    source_data_snapshot: source,
                  });
                  navigate(`/kayitlar/${recordId}/raporlar/${id}`);
                })
              }
            >
              {busy ? 'İşleniyor…' : 'Yeni Psikolog Raporu'}
            </button>
          </section>
        </div>
        {fullOpen && profile && (
          <section className="report-full-preview-card" aria-label="Tam rapor önizleme">
            <div className="report-full-preview-head">
              <div>
                <span className="section-badge">TAM RAPOR · SALT OKUNUR</span>
                <h2>Tam rapor — MMPI Klinik Raporu</h2>
                <p>APA 7 uyumlu ham çıktı; grafik ve yorumlar salt okunur. Düzenlenemez. Yazdır/PDF için tarayıcı Yazdır işlevini kullanın.</p>
              </div>
              <button className="btn-secondary" onClick={() => setFullOpen(false)}>Kapat</button>
            </div>
            <PaperViewport frameClassName="report-full-preview-body" label="Tam rapor kâğıdı">
              <MMPIPrintReport profile={profile} meta={fullMeta} />
            </PaperViewport>
          </section>
        )}
        <section className="report-examples-card" aria-label="Örnek raporlar ve şablonlar">
          <div className="report-examples-head">
            <div>
              <span className="section-badge badge-primary">ŞABLON · ÖNİZLEME</span>
              <h2>Örnek raporlar ve şablonlar</h2>
              <p>
                Seçili şablonun bu kaydın <strong>gerçek MMPI verileriyle</strong> canlı önizlemesi. Yeni klinik yorum
                üretilmez; Sistem şablonu salt okunurdur. Kopyasını oluşturarak kendi şablonunuzu türetebilirsiniz.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
              <button
                className="btn-secondary"
                disabled={busy || !templateDocument}
                onClick={() =>
                  void run(async () => {
                    if (!templateDocument) return;
                    const id = await createTemplate(
                      `${selectedTemplate?.name || 'Yeni Şablon'} — Kopya`.slice(0, 180),
                      templateDocument,
                      viewer.id,
                    );
                    setTemplates(await listTemplates());
                    setTemplateId(id);
                    setSampleOpen(true);
                  })
                }
              >
                Kopyasını oluştur
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: 12 }}
                onClick={() => setSampleOpen((v) => !v)}
                aria-expanded={sampleOpen}
              >
                {sampleOpen ? 'Önizlemeyi gizle' : 'Önizlemeyi göster'}
              </button>
            </div>
          </div>
          {sampleOpen && templateDocument ? (
            <div className="report-examples-body">
              <PaperViewport frameClassName="report-sample-frame" label="Şablon önizleme kâğıdı">
                <ReportPreview
                  title={title || SYSTEM_TEMPLATE_NAME}
                  content={instantiateTemplate(templateDocument, source)}
                  source={source}
                  date={new Date().toISOString()}
                  status="draft"
                />
              </PaperViewport>
              <p className="report-examples-footnote">
                Önizleme yalnızca iskeleti gösterir; antet/imza ayarlarınız dahil edilir. Taslak filigranı ekranda
                görünür, basılı PDF’te görünmez.
              </p>
            </div>
          ) : (
            <div className="report-examples-body">
              <div className="report-examples-empty">
                <p style={{ margin: 0, color: 'var(--soft)', fontSize: 13, lineHeight: 1.6 }}>
                  Önizleme gizli. “Önizlemeyi göster” ile A4 APA önizlemeyi açın — gerçek verilerle, yazdırımla
                  birebir.
                </p>
              </div>
            </div>
          )}
        </section>
        <ReportSettings userId={viewer.id} initial={settings} onSaved={setSettings} />
        <section className="modern-table-card">
          <div className="section-heading">
            <h2>
              Psikolog raporları <small>({reports.length})</small>
            </h2>
          </div>
          {!reports.length ? (
            <div className="empty-state-card">
              Henüz rapor oluşturulmadı. Yukarıdan bir şablon seçerek başlayın.
            </div>
          ) : (
            <div className="report-table-scroll">
              <table className="modern-data-table" data-mobile-cards>
                <thead>
                  <tr>
                    <th>Rapor adı</th>
                    <th>Şablon</th>
                    <th>Durum</th>
                    <th>Oluşturulma</th>
                    <th>Son düzenleme</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td data-label="Rapor adı">{r.title}</td>
                      <td data-label="Şablon">{r.template_name}</td>
                      <td data-label="Durum">
                        <span className={`status-pill ${r.status === 'draft' ? 'status-draft' : 'status-completed'}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                          <span className="status-dot" aria-hidden="true" />
                          {r.status === 'draft' ? 'Taslak' : 'Tamamlandı'}
                        </span>
                      </td>
                      <td data-label="Oluşturulma">{new Date(r.created_at).toLocaleDateString('tr-TR')}</td>
                      <td data-label="Son düzenleme">{new Date(r.updated_at).toLocaleString('tr-TR')}</td>
                      <td data-label="İşlemler">
                        <div className="table-row-actions">
                          <a href={`/kayitlar/${recordId}/raporlar/${r.id}`} className="action-btn-primary">
                            Aç / Düzenle
                          </a>
                          <a
                            href={`/kayitlar/${recordId}/raporlar/${r.id}?gorunum=onizleme`}
                            className="action-btn-secondary"
                          >
                            Önizle / PDF / Yazdır
                          </a>
                          <button
                            disabled={busy}
                            className="action-btn-secondary"
                            onClick={() =>
                              void run(async () => {
                                const old = await getReport(r.id, recordId);
                                const id = await createReport({
                                  mmpi_record_id: recordId,
                                  created_by: viewer.id,
                                  template_id: null,
                                  template_name: old.template_name,
                                  title: `${old.title} — Kopya`.slice(0, 180),
                                  content: old.content,
                                  source_data_snapshot: old.source_data_snapshot,
                                });
                                navigate(`/kayitlar/${recordId}/raporlar/${id}`);
                              })
                            }
                          >
                            Kopyala
                          </button>
                          <button
                            disabled={busy}
                            className="action-btn-danger"
                            onClick={() => setDeleting(r)}
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {reports.length === 200 && <p>Son 200 rapor gösteriliyor.</p>}
        </section>
        {deleting && (
          <ConfirmDialog
            title="Raporu sil"
            description={`“${deleting.title}” ve tüm sürümleri kalıcı olarak silinecek. MMPI test kaydı silinmez.`}
            confirmLabel="Raporu Sil"
            busy={busy}
            onCancel={() => setDeleting(null)}
            onConfirm={() =>
              void run(async () => {
                await deleteReport(deleting.id);
                setReports(reports.filter((r) => r.id !== deleting.id));
                setDeleting(null);
              })
            }
          />
        )}
      </div>
      {profile && (
        <div className="print-only">
          <MMPIPrintReport profile={profile} meta={fullMeta} />
        </div>
      )}
    </div>
  );
}
