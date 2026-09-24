import { useState, useEffect } from 'react';
import type {
  ClinicalReport,
  ClinicalReportType,
  Client,
  ReportSection,
} from '../../clinical/clinicalTypes';
import {
  getClinicalReports,
  saveClinicalReport,
  deleteClinicalReport,
  getClients,
  subscribeClinicalStore,
} from '../../clinical/clinicalStore';
import { Icon } from '../Icon';

export function ClinicalReportsPage() {
  const [reports, setReports] = useState<ClinicalReport[]>(() => getClinicalReports());
  const [clients, setClients] = useState<Client[]>(() => getClients());
  const [activeReport, setActiveReport] = useState<ClinicalReport | null>(() => reports[0] || null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [reportForm, setReportForm] = useState<Partial<ClinicalReport>>({
    clientId: '',
    clientName: '',
    clientGender: 'KADIN',
    clientAge: 30,
    reportType: 'comprehensive',
    reportTitle: 'Kapsamlı Psikolojik Değerlendirme Raporu',
    reportDate: new Date().toISOString().split('T')[0]!,
    evaluator: 'Uzm. Psk. Halil Karaduman',
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
    const firstClient = clients[0];
    const cName = firstClient ? `${firstClient.firstName} ${firstClient.lastName}` : 'Danışan';
    const cId = firstClient ? firstClient.id : '';

    let title = 'Kapsamlı Psikolojik Değerlendirme Raporu';
    let defaultSections: ReportSection[] = [];

    if (type === 'comprehensive') {
      title = 'Kapsamlı Psikolojik Değerlendirme Raporu';
      defaultSections = [
        {
          id: 's1',
          title: '1. Başvuru Nedeni ve Klinik Anamnez',
          content: firstClient ? firstClient.presentingComplaint || 'Danışanın başvuru şikayetleri...' : 'Başvuru şikayetleri...',
        },
        {
          id: 's2',
          title: '2. Davranışsal Gözlemler ve Ruhsal Durum Muayenesi',
          content: 'Danışanın yönelimi tam, bilinci açıktır. Görüşmeye iş birliği yüksektir.',
        },
        {
          id: 's3',
          title: '3. Uygulanan Psikometrik Test Bulguları',
          content: 'MMPI-566, Beck Depresyon ve Beck Anksiyete envanterleri uygulanmıştır.',
        },
        {
          id: 's4',
          title: '4. Dinamik ve Bilişsel Değerlendirme / Formülasyon',
          content: 'Danışanın kişilik örüntüsü, savunma mekanizmaları ve temel inançları...',
        },
        {
          id: 's5',
          title: '5. Sonuç, Tanı ve Terapi Planı',
          content: 'Yapılandırılmış bireysel psikoterapi desteği önerilmektedir.',
        },
      ];
    } else if (type === 'referral') {
      title = 'Psikiyatrik Konsültasyon & Sevk Raporu';
      defaultSections = [
        { id: 's1', title: '1. Sevk Nedeni', content: 'İlaç tedavisi ve tıbbi değerlendirme talebi.' },
        { id: 's2', title: '2. Psikolojik Değerlendirme Özeti', content: 'Psikoterapi seanslarında gözlemlenen semptom şiddeti...' },
        { id: 's3', title: '3. Test Sonuçları', content: 'Depresyon ve anksiyete ölçek puanları...' },
      ];
    } else {
      title = 'Klinik İlerleme & Seans Özet Raporu';
      defaultSections = [
        { id: 's1', title: '1. Terapi Süreci ve Çalışılan Temalar', content: 'Seanslarda ele alınan ana temalar...' },
        { id: 's2', title: '2. Danışanın Gelişimi ve Kazanımları', content: 'Süreçteki bilişsel ve davranışsal değişimler...' },
      ];
    }

    const newDoc: ClinicalReport = {
      id: 'rep_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      clientId: cId,
      clientName: cName,
      clientGender: firstClient ? firstClient.gender : 'KADIN',
      clientAge: firstClient ? firstClient.age : 30,
      reportType: type,
      reportTitle: title,
      reportDate: new Date().toISOString().split('T')[0]!,
      evaluator: 'Uzm. Psk. Halil Karaduman',
      sections: defaultSections,
      recommendations: [
        'Haftalık düzenli bireysel psikoterapi sürecinin sürdürülmesi',
        'Gevşeme egzersizleri ve BDT ev ödevlerinin takibi',
      ],
      formalDiagnosis: firstClient && firstClient.diagnoses.length > 0 ? firstClient.diagnoses.join(', ') : 'F41.1 Yaygın Anksiyete Bozukluğu',
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

    saveClinicalReport(updated);
    setActiveReport(updated);
    setIsEditing(false);
  }

  function startEdit(rep: ClinicalReport) {
    setActiveReport(rep);
    setReportForm({ ...rep });
    setIsEditing(true);
  }

  function handleDelete(id: string) {
    if (confirm('Bu klinik raporu silmek istediğinize emin misiniz?')) {
      deleteClinicalReport(id);
      const remaining = reports.filter(r => r.id !== id);
      setActiveReport(remaining[0] || null);
      setIsEditing(false);
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

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Sol Kolon: Rapor Listesi */}
        <div className="btn-print-hide" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--soft)' }}>
            Kayıtlı Raporlar ({reports.length})
          </div>

          {reports.length === 0 ? (
            <div className="empty-state-card" style={{ padding: 24 }}>
              <p style={{ margin: 0, fontSize: 13 }}>Kayıtlı rapor yok.</p>
            </div>
          ) : (
            reports.map(r => (
              <div
                key={r.id}
                className={`modern-table-card ${activeReport?.id === r.id ? 'active' : ''}`}
                style={{
                  padding: 14,
                  cursor: 'pointer',
                  border: activeReport?.id === r.id ? '2px solid var(--accent)' : '1px solid var(--hairline)',
                  background: activeReport?.id === r.id ? '#fcfdff' : 'var(--bg)',
                }}
                onClick={() => {
                  setActiveReport(r);
                  setIsEditing(false);
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{r.clientName}</div>
                <div style={{ fontSize: 12, color: 'var(--soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.reportTitle}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{r.reportDate}</div>
              </div>
            ))
          )}

          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn-secondary btn-full btn-sm"
              style={{ marginBottom: 6 }}
              onClick={() => handleCreateNew('referral')}
            >
              + Psikiyatrik Sevk Raporu
            </button>
            <button
              type="button"
              className="btn-secondary btn-full btn-sm"
              onClick={() => handleCreateNew('session_progress')}
            >
              + Seans İlerleme Raporu
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
                    <button type="button" className="btn-secondary btn-sm" onClick={() => startEdit(activeReport)}>
                      <Icon name="edit" size={14} />
                      <span>Raporu Düzenle</span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => handleDelete(activeReport.id)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </>
                )}
              </div>

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
                    <img src="/logo-mark.png" alt="Halil Karaduman" style={{ width: 44, height: 44 }} />
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        UZM. PSK. HALİL KARADUMAN
                      </h2>
                      <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.04em' }}>
                        KLİNİK PSİKOLOJİ VE DEĞERLENDİRME HİZMETLERİ
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11.5, color: '#444' }}>
                    <div>contact@halilkaraduman.com.tr</div>
                    <div>www.halilkaraduman.com.tr</div>
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
                  <div><strong>Cinsiyet / Yaş:</strong> {activeReport.clientGender === 'ERKEK' ? 'Erkek' : 'Kadın'}, {activeReport.clientAge} Yaş</div>
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
                    <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                      {activeReport.recommendations.map((rec, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* İmza & Kaşe Alanı */}
                <div className="print-signature-box" style={{ marginTop: 40, display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'center', width: 220, borderTop: '1px solid #333', paddingTop: 8 }}>
                    <strong style={{ display: 'block', fontSize: 13 }}>{activeReport.evaluator}</strong>
                    <span style={{ fontSize: 11, color: '#555' }}>Klinik Psikolog</span>
                    <div style={{ height: 40 }} />
                    <span style={{ fontSize: 10, color: '#888' }}>[İmza / Kaşe]</span>
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
    </div>
  );
}
