import { useState, useMemo } from 'react';
import {
  GAD7_QUESTIONS,
  PHQ9_QUESTIONS,
  RAPID_SCALE_OPTIONS,
  calculateGad7,
  calculatePhq9,
} from '../../clinical/rapidScreening';
import { getClients } from '../../clinical/clinicalStore';
import { saveScreening } from '../../clinical/practiceStore';
import { clinicToday } from '../../clinical/recordRules';
import { cloudContext } from '../../clinical/cloud/sync';
import { asCompleteAnswers, emptyAnswers } from '../../clinical/scaleIntake';
import { Icon } from '../Icon';
import { navigate } from '../../router';

export function RapidScreeningPage() {
  const clients = useMemo(() => getClients(), []);

  const [activeTool, setActiveTool] = useState<'gad7' | 'phq9'>('gad7');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [testDate, setTestDate] = useState<string>(clinicToday());

  const [gadAnswers, setGadAnswers] = useState(() => emptyAnswers(7));
  const [phqAnswers, setPhqAnswers] = useState(() => emptyAnswers(9));
  const [toast, setToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleClientSelect(id: string) {
    setSelectedClientId(id);
    const c = clients.find(cl => cl.id === id);
    if (c) {
      setClientName(`${c.firstName} ${c.lastName}`);
    }
  }

  const completeGad = asCompleteAnswers(gadAnswers);
  const completePhq = asCompleteAnswers(phqAnswers);
  const liveGadResult = useMemo(() => {
    if (!completeGad) return null;
    return calculateGad7(completeGad, {
      name: clientName.trim() || 'Danışan',
      clientId: selectedClientId || undefined,
      testDate,
    });
  }, [completeGad, clientName, selectedClientId, testDate]);

  const livePhqResult = useMemo(() => {
    if (!completePhq) return null;
    return calculatePhq9(completePhq, {
      name: clientName.trim() || 'Danışan',
      clientId: selectedClientId || undefined,
      testDate,
    });
  }, [completePhq, clientName, selectedClientId, testDate]);

  function handleSave() {
    setSaveError(null);
    setToast(null);
    const cloud = Boolean(cloudContext());
    if (cloud && !clients.some((client) => client.id === selectedClientId)) {
      setSaveError('Bulutta kaydetmek için kayıtlı danışan dosyası seçin.');
      return;
    }
    if (!clientName.trim()) { setSaveError('Danışan adı gerekli.'); return; }
    const result = activeTool === 'gad7' ? liveGadResult : livePhqResult;
    if (!result) { setSaveError('İşaretlenmeyen madde var. Boş madde 0 sayılmaz.'); return; }
    try {
      saveScreening({ ...result, clientName: clientName.trim() });
      setToast(cloud ? 'Sonuç sunucuya gönderiliyor; durumu üstteki şeritten kontrol edin.' : 'Sonuç bu cihaza kaydedildi.');
      setTimeout(() => setToast(null), 3000);
    } catch {
      setSaveError('Sonuç saklanamadı. Alan açıp tekrar deneyin; kayıt sunucuya gönderilmedi.');
    }
  }

  return (
    <div className="clinical-container">
      {/* Üst Başlık */}
      <div className="clinical-header btn-print-hide">
        <div className="clinical-title-wrap">
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ marginBottom: 10 }}
            onClick={() => navigate('/testler')}
          >
            <Icon name="left" size={14} />
            <span>Test Bataryasına Dön</span>
          </button>
          <div className="clinical-kicker">
            <span className="clinical-kicker-dot" />
            <span>Hızlı Seans İçi Tarama Ölçekleri</span>
          </div>
          <h1>GAD-7 &amp; PHQ-9 Tarama Bataryası</h1>
          <p>Seans içi 2 dakikada uygulanabilen anksiyete ve depresyon semptom yükü tarama araçları.</p>
        </div>

        <div className="clinical-actions">
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            <Icon name="print" size={16} />
            <span>Raporu Yazdır</span>
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            <Icon name="save" size={16} />
            <span>Sonucu Kaydet</span>
          </button>
        </div>
      </div>

      {saveError && <p className="record-lock-error" role="alert">{saveError}</p>}
      {toast && (
        <div className="modern-table-card" role="status" style={{ background: 'var(--success-tint)', border: '1px solid var(--success-border)', color: 'var(--success)', padding: '12px 16px', marginBottom: 20 }}>
          {toast}
        </div>
      )}

      {/* Araç Seçimi Tabları */}
      <div className="clinical-tabs btn-print-hide">
        <button
          type="button"
          className={`clinical-tab-btn ${activeTool === 'gad7' ? 'active' : ''}`}
          onClick={() => setActiveTool('gad7')}
        >
          <Icon name="activity" size={16} />
          <span>GAD-7 Yaygın Anksiyete (7 Soru)</span>
        </button>
        <button
          type="button"
          className={`clinical-tab-btn ${activeTool === 'phq9' ? 'active' : ''}`}
          onClick={() => setActiveTool('phq9')}
        >
          <Icon name="pulse" size={16} />
          <span>PHQ-9 Depresyon Taraması (9 Soru)</span>
        </button>
      </div>

      {/* Danışan Seçim Kartı */}
      <div className="modern-table-card btn-print-hide" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Danışan Bilgileri</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <div className="form-group">
            <label>Kayıtlı Danışanlardan Seç</label>
            <select
              value={selectedClientId}
              onChange={e => handleClientSelect(e.target.value)}
            >
              <option value="">{cloudContext() ? 'Danışan dosyası seçin' : 'Doğrudan İsim Gir / Seçilmedi'}</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.fileNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Danışan Adı Soyadı *</label>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Danışanın adı"
            />
          </div>

          <div className="form-group">
            <label>Uygulanma Tarihi</label>
            <input
              type="date"
              value={testDate}
              onChange={e => setTestDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* GAD-7 Görünümü */}
      {activeTool === 'gad7' && (
        <div>
          {/* Canlı Skor */}
          <div className="modern-table-card" style={{ padding: 20, marginBottom: 24, background: '#fafcff', border: '2px solid var(--primary-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--soft)', fontWeight: 600 }}>
                  GAD-7 Anksiyete Toplam Puanı
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                  <span style={{ fontSize: 32, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    {liveGadResult ? liveGadResult.totalScore : '—'}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>/ 21</span>
                  <span className={`badge ${liveGadResult && liveGadResult.totalScore >= 10 ? 'badge-risk-moderate' : 'badge-active'}`}>
                    {liveGadResult ? liveGadResult.severity : 'Puan yok'}
                  </span>
                </div>
              </div>
              <div style={{ maxWidth: 450, fontSize: 13, color: 'var(--soft)' }}>
                {liveGadResult ? liveGadResult.clinicalNote : 'Tüm maddeler işaretlenmeden puan üretilmez. Boş madde 0 sayılmaz.'}
              </div>
            </div>
          </div>

          {/* Sorular */}
          <div className="btn-print-hide">
            <h3 style={{ fontSize: 17, marginBottom: 14 }}>Son 2 Hafta İçinde Aşağıdaki Sorunlar Sizi Ne Sıklıkla Rahatsız Etti?</h3>
            {GAD7_QUESTIONS.map((q, idx) => (
              <div key={q.id} className="question-item-card">
                <div className="question-header">
                  <span className="question-num">Soru {q.id}</span>
                  <strong className="question-title">{q.text}</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 }}>
                  {RAPID_SCALE_OPTIONS.map(opt => (
                    <label
                      key={opt.score}
                      className={`option-label ${gadAnswers[idx] === opt.score ? 'selected' : ''}`}
                      onClick={() => {
                        const updated = [...gadAnswers];
                        updated[idx] = opt.score;
                        setGadAnswers(updated);
                      }}
                    >
                      <input
                        type="radio"
                        name={`gad_${q.id}`}
                        checked={gadAnswers[idx] === opt.score}
                        onChange={() => {}}
                        className="option-radio"
                      />
                      <div style={{ fontSize: 12.5 }}>
                        <strong>{opt.label}</strong>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PHQ-9 Görünümü */}
      {activeTool === 'phq9' && (
        <div>
          {/* Canlı Skor */}
          <div className="modern-table-card" style={{ padding: 20, marginBottom: 24, background: '#fafcff', border: '2px solid var(--primary-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--soft)', fontWeight: 600 }}>
                  PHQ-9 Depresyon Toplam Puanı
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                  <span style={{ fontSize: 32, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    {livePhqResult ? livePhqResult.totalScore : '—'}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>/ 27</span>
                  <span className={`badge ${livePhqResult && livePhqResult.totalScore >= 10 ? 'badge-risk-moderate' : 'badge-active'}`}>
                    {livePhqResult ? livePhqResult.severity : 'Puan yok'}
                  </span>
                </div>
              </div>
              <div style={{ maxWidth: 450, fontSize: 13, color: 'var(--soft)' }}>
                {livePhqResult ? livePhqResult.clinicalNote : 'Tüm maddeler işaretlenmeden puan üretilmez. Boş madde 0 sayılmaz.'}
              </div>
            </div>
          </div>

          {/* Sorular */}
          <div className="btn-print-hide">
            <h3 style={{ fontSize: 17, marginBottom: 14 }}>Son 2 Hafta İçinde Aşağıdaki Sorunlar Sizi Ne Sıklıkla Rahatsız Etti?</h3>
            {PHQ9_QUESTIONS.map((q, idx) => (
              <div key={q.id} className={`question-item-card ${q.id === 9 && phqAnswers[idx]! > 0 ? 'critical' : ''}`}>
                <div className="question-header">
                  <span className="question-num">Soru {q.id}</span>
                  <strong className="question-title">{q.text}</strong>
                  {q.id === 9 && (
                    <span className="badge badge-risk-high" style={{ fontSize: 11 }}>İntihar / Zarar Maddesi</span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 }}>
                  {RAPID_SCALE_OPTIONS.map(opt => (
                    <label
                      key={opt.score}
                      className={`option-label ${phqAnswers[idx] === opt.score ? 'selected' : ''}`}
                      onClick={() => {
                        const updated = [...phqAnswers];
                        updated[idx] = opt.score;
                        setPhqAnswers(updated);
                      }}
                    >
                      <input
                        type="radio"
                        name={`phq_${q.id}`}
                        checked={phqAnswers[idx] === opt.score}
                        onChange={() => {}}
                        className="option-radio"
                      />
                      <div style={{ fontSize: 12.5 }}>
                        <strong>{opt.label}</strong>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alt Butonlar */}
      <div className="btn-print-hide" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          <Icon name="print" size={16} />
          <span>Yazdır / PDF</span>
        </button>
        <button type="button" className="btn-primary" onClick={handleSave}>
          <Icon name="save" size={16} />
          <span>Tarama Sonucunu Kaydet</span>
        </button>
      </div>
    </div>
  );
}
