import { useState, useMemo } from 'react';
import type { Gender } from '../../clinical/clinicalTypes';
import {
  BECK_DEPRESSION_QUESTIONS,
  calculateBeckDepression,
} from '../../clinical/beckDepression';
import {
  getClients,
  saveBeckDepressionTest,
} from '../../clinical/clinicalStore';
import { Icon } from '../Icon';
import { navigate } from '../../router';

export function BeckDepressionPage() {
  const clients = useMemo(() => getClients(), []);

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientGender, setClientGender] = useState<Gender>('KADIN');
  const [clientAge, setClientAge] = useState<number>(30);
  const [testDate, setTestDate] = useState<string>(new Date().toISOString().split('T')[0]!);

  const [answers, setAnswers] = useState<number[]>(new Array(21).fill(0));
  const [toast, setToast] = useState<string | null>(null);

  function handleClientSelect(id: string) {
    setSelectedClientId(id);
    const c = clients.find(cl => cl.id === id);
    if (c) {
      setClientName(`${c.firstName} ${c.lastName}`);
      setClientGender(c.gender);
      setClientAge(c.age);
    }
  }

  function handleOptionSelect(questionIndex: number, score: number) {
    const updated = [...answers];
    updated[questionIndex] = score;
    setAnswers(updated);
  }

  const liveResult = useMemo(() => {
    return calculateBeckDepression(answers, {
      clientId: selectedClientId || undefined,
      name: clientName.trim() || 'Danışan',
      gender: clientGender,
      age: clientAge,
      testDate,
    });
  }, [answers, selectedClientId, clientName, clientGender, clientAge, testDate]);

  function handleSave() {
    if (!clientName.trim() && !selectedClientId) {
      alert('Lütfen danışan adı giriniz veya listeden bir danışan seçiniz.');
      return;
    }
    const result = calculateBeckDepression(answers, {
      clientId: selectedClientId || undefined,
      name: clientName.trim() || (selectedClientId ? clients.find(c => c.id === selectedClientId)?.firstName + ' ' + clients.find(c => c.id === selectedClientId)?.lastName : 'Danışan'),
      gender: clientGender,
      age: clientAge,
      testDate,
    });
    saveBeckDepressionTest(result);
    setToast('Beck Depresyon Envanteri başarıyla kaydedildi ✓');
    setTimeout(() => setToast(null), 3000);
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
            <span>Beck Depresyon Envanteri (BDI)</span>
          </div>
          <h1>Depresyon Değerlendirme Formu</h1>
          <p>21 Madde · Bilişsel, duygusal ve somatik depresif belirtilerin şiddetini derecelendirme.</p>
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

      {toast && (
        <div className="modern-table-card" style={{ background: 'var(--success-tint)', border: '1px solid var(--success-border)', color: 'var(--success)', padding: '12px 16px', marginBottom: 20 }}>
          {toast}
        </div>
      )}

      {/* Danışan Seçim Kartı */}
      <div className="modern-table-card btn-print-hide" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Danışan Bilgileri</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div className="form-group">
            <label>Kayıtlı Danışanlardan Seç</label>
            <select
              value={selectedClientId}
              onChange={e => handleClientSelect(e.target.value)}
            >
              <option value="">Doğrudan İsim Gir / Seçilmedi</option>
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
            <label>Cinsiyet &amp; Yaş</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={clientGender}
                onChange={e => setClientGender(e.target.value as Gender)}
              >
                <option value="KADIN">Kadın</option>
                <option value="ERKEK">Erkek</option>
              </select>
              <input
                type="number"
                style={{ width: 80 }}
                value={clientAge}
                onChange={e => setClientAge(Number(e.target.value))}
              />
            </div>
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

      {/* Canlı Skor & Sonuç Kartı */}
      <div className="modern-table-card" style={{ padding: 24, marginBottom: 24, border: '2px solid var(--primary-border)', background: '#fafcff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--soft)', fontWeight: 600 }}>
              BDI Toplam Skoru
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 36, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)' }}>
                {liveResult.totalScore}
              </span>
              <span style={{ fontSize: 16, color: 'var(--muted)' }}>/ 63</span>
              <span className={`badge ${liveResult.severity === 'Şiddetli' ? 'badge-risk-high' : liveResult.severity === 'Orta' ? 'badge-risk-moderate' : 'badge-active'}`} style={{ fontSize: 14, padding: '4px 12px' }}>
                {liveResult.severity} Depresyon
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Bilişsel - Duygusal</div>
              <strong style={{ fontSize: 18, color: 'var(--accent-ink)' }}>{liveResult.cognitiveAffectiveScore} / 39</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Somatik - Performans</div>
              <strong style={{ fontSize: 18, color: 'var(--accent-ink)' }}>{liveResult.somaticPerformanceScore} / 24</strong>
            </div>
          </div>
        </div>

        {liveResult.suicideRisk && (
          <div style={{ background: 'var(--danger-tint)', border: '1px solid var(--danger-border)', color: 'var(--danger-ink)', padding: '12px 16px', borderRadius: 8, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="alert" size={20} />
            <div>
              <strong>KRİTİK GÜVENLİK ALARMI:</strong> Danışan Madde 9 (İntihar Düşünceleri) sorusuna {liveResult.suicideItemScore} puan vermiştir. Yakın intihar riski değerlendirmesi yapılmalıdır!
            </div>
          </div>
        )}

        <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 8, border: '1px solid var(--hairline)', fontSize: 13.5, lineHeight: 1.6 }}>
          <strong>Klinik Değerlendirme &amp; Özet:</strong> {liveResult.clinicalInterpretation}
        </div>
      </div>

      {/* 21 Madde Soru Listesi */}
      <div className="btn-print-hide">
        <h3 style={{ fontSize: 18, marginBottom: 16 }}>Envanter Maddeleri (1 - 21)</h3>
        {BECK_DEPRESSION_QUESTIONS.map((q, idx) => (
          <div
            key={q.id}
            className={`question-item-card ${answers[idx] !== 0 ? 'answered' : ''} ${q.critical && answers[idx]! > 0 ? 'critical' : ''}`}
          >
            <div className="question-header">
              <span className="question-num">Madde {q.id}</span>
              <strong className="question-title">{q.title}</strong>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {q.category === 'cognitive_affective' ? 'Bilişsel/Duygusal' : 'Somatik/Performans'}
              </span>
            </div>

            <div className="options-group">
              {q.options.map(opt => (
                <label
                  key={opt.score}
                  className={`option-label ${answers[idx] === opt.score ? 'selected' : ''}`}
                  onClick={() => handleOptionSelect(idx, opt.score)}
                >
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    checked={answers[idx] === opt.score}
                    onChange={() => handleOptionSelect(idx, opt.score)}
                    className="option-radio"
                  />
                  <span>
                    <strong>[{opt.score}]</strong> {opt.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Alt Butonlar */}
      <div className="btn-print-hide" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          <Icon name="print" size={16} />
          <span>Yazdır / PDF</span>
        </button>
        <button type="button" className="btn-primary" onClick={handleSave}>
          <Icon name="save" size={16} />
          <span>Testi Danışan Dosyasına Kaydet</span>
        </button>
      </div>
    </div>
  );
}
