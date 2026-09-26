import { useState, useMemo } from 'react';
import type { Gender } from '../../clinical/clinicalTypes';
import {
  BECK_ANXIETY_SYMPTOMS,
  BAI_SEVERITY_OPTIONS,
  calculateBeckAnxiety,
} from '../../clinical/beckAnxiety';
import {
  getClients,
  saveBeckAnxietyTest,
} from '../../clinical/clinicalStore';
import { clinicToday } from '../../clinical/recordRules';
import { cloudContext } from '../../clinical/cloud/sync';
import { asCompleteAnswers, emptyAnswers, parseOptionalAge } from '../../clinical/scaleIntake';
import { Icon } from '../Icon';
import { navigate } from '../../router';
import {
  AssessmentLegalNotice,
  AssessmentPaperSheet,
  AssessmentResultPrintHeader,
  printAssessmentPaper,
  printAssessmentResult,
} from './AssessmentPrint';

export function BeckAnxietyPage() {
  const clients = useMemo(() => getClients(), []);

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientGender, setClientGender] = useState<Gender | ''>('');
  const [clientAge, setClientAge] = useState('');
  const [testDate, setTestDate] = useState<string>(clinicToday());

  const [answers, setAnswers] = useState(() => emptyAnswers(21));
  const [toast, setToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleClientSelect(id: string) {
    setSelectedClientId(id);
    const c = clients.find(cl => cl.id === id);
    if (c) {
      setClientName(`${c.firstName} ${c.lastName}`);
      setClientGender(c.gender);
      setClientAge(c.birthDate ? String(c.age) : '');
    }
  }

  function handleOptionSelect(symptomIndex: number, score: number) {
    const updated = [...answers];
    updated[symptomIndex] = score;
    setAnswers(updated);
  }

  const completeAnswers = asCompleteAnswers(answers);
  const parsedAge = parseOptionalAge(clientAge);
  const liveResult = useMemo(() => {
    if (!completeAnswers || (clientGender !== 'KADIN' && clientGender !== 'ERKEK') || parsedAge === null) return null;
    return calculateBeckAnxiety(completeAnswers, {
      clientId: selectedClientId || undefined,
      name: clientName.trim() || 'Danışan',
      gender: clientGender,
      age: parsedAge,
      testDate,
    });
  }, [completeAnswers, selectedClientId, clientName, clientGender, parsedAge, testDate]);

  function handleSave() {
    setSaveError(null);
    setToast(null);
    const cloud = Boolean(cloudContext());
    if (cloud && !clients.some((client) => client.id === selectedClientId)) {
      setSaveError('Bulutta kaydetmek için kayıtlı danışan dosyası seçin.');
      return;
    }
    if (!clientName.trim()) { setSaveError('Danışan adı gerekli.'); return; }
    if (clientGender !== 'KADIN' && clientGender !== 'ERKEK') { setSaveError('Cinsiyet seçin.'); return; }
    if (parsedAge === null) { setSaveError('Yaş girildiyse 0–120 arası tam sayı olmalı.'); return; }
    if (!completeAnswers) { setSaveError('İşaretlenmeyen madde var. Boş madde 0 sayılmaz.'); return; }
    const result = calculateBeckAnxiety(completeAnswers, {
      clientId: selectedClientId || undefined,
      name: clientName.trim(),
      gender: clientGender,
      age: parsedAge,
      testDate,
    });
    try {
      saveBeckAnxietyTest(result);
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
            <span>Beck Anksiyete Envanteri (BAI)</span>
          </div>
          <h1>Anksiyete Değerlendirme Formu</h1>
          <p>21 Belirti · Subjektif kaygı, otonomik uyarılma ve somatik belirti şiddeti ölçümü.</p>
        </div>

        <div className="clinical-actions">
          <button type="button" className="btn-secondary" onClick={() => printAssessmentPaper('bai')}>
            <Icon name="fileText" size={16} />
            <span>Yanıt formu / PDF</span>
          </button>
          <button type="button" className="btn-secondary" onClick={() => printAssessmentResult('bai')}>
            <Icon name="print" size={16} />
            <span>Sonuç özeti / PDF</span>
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            <Icon name="save" size={16} />
            <span>Sonucu Kaydet</span>
          </button>
        </div>
      </div>

      <AssessmentPaperSheet
        assessment="bai"
        respondentName={clientName}
        date={testDate}
        items={BECK_ANXIETY_SYMPTOMS.map((symptom) => ({ id: symptom.id, text: symptom.title }))}
        options={BAI_SEVERITY_OPTIONS.map((option) => ({ score: option.score, label: option.label }))}
      />
      <AssessmentResultPrintHeader assessment="bai" respondentName={clientName} date={testDate} />

      {saveError && <p className="record-lock-error" role="alert">{saveError}</p>}
      {toast && (
        <div className="modern-table-card" role="status" style={{ background: 'var(--success-tint)', border: '1px solid var(--success-border)', color: 'var(--success)', padding: '12px 16px', marginBottom: 20 }}>
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
            <label>Cinsiyet &amp; Yaş</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={clientGender}
                onChange={e => setClientGender(e.target.value === 'ERKEK' || e.target.value === 'KADIN' ? e.target.value : '')}
              >
                <option value="">Seçin</option>
                <option value="KADIN">Kadın</option>
                <option value="ERKEK">Erkek</option>
              </select>
              <input
                type="number"
                style={{ width: 80 }}
                min={0}
                max={120}
                value={clientAge}
                placeholder="Yaş"
                onChange={e => setClientAge(e.target.value)}
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

      <AssessmentLegalNotice assessment="bai" />

      {/* Canlı Skor & Sonuç Kartı */}
      <div className="assessment-result-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--soft)', fontWeight: 600 }}>
              BAI Toplam Skoru
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 36, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)' }}>
                {liveResult ? liveResult.totalScore : '—'}
              </span>
              <span style={{ fontSize: 16, color: 'var(--muted)' }}>/ 63</span>
              <span className={`badge ${liveResult?.severity === 'Şiddetli' ? 'badge-risk-high' : liveResult?.severity === 'Orta' ? 'badge-risk-moderate' : 'badge-active'}`} style={{ fontSize: 14, padding: '4px 12px' }}>
                {liveResult ? `${liveResult.severity} Anksiyete` : 'Puan yok'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Subjektif Kaygı</div>
              <strong style={{ fontSize: 16, color: 'var(--text)' }}>{liveResult ? liveResult.subjectiveScore : '—'}</strong>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Nörovejetatif</div>
              <strong style={{ fontSize: 16, color: 'var(--text)' }}>{liveResult ? liveResult.neurovegetativeScore : '—'}</strong>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Otonomik Uyarılma</div>
              <strong style={{ fontSize: 16, color: 'var(--text)' }}>{liveResult ? liveResult.autonomicScore : '—'}</strong>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Motor Belirtiler</div>
              <strong style={{ fontSize: 16, color: 'var(--text)' }}>{liveResult ? liveResult.motorScore : '—'}</strong>
            </div>
          </div>
        </div>

        <div className="assessment-result-note">
          <strong>Klinik Değerlendirme &amp; Özet:</strong> {liveResult ? liveResult.clinicalInterpretation : 'Tüm maddeler işaretlenmeden puan üretilmez. Boş madde 0 sayılmaz.'}
        </div>
      </div>

      {/* 21 Belirti Soru Listesi */}
      <div className="btn-print-hide">
        <h3 style={{ fontSize: 18, marginBottom: 16 }}>Belirtiler ve Şiddet Puanlaması (1 - 21)</h3>
        {BECK_ANXIETY_SYMPTOMS.map((sym, idx) => (
          <div
            key={sym.id}
            className={`question-item-card ${answers[idx] !== null ? 'answered' : ''}`}
          >
            <div className="question-header">
              <span className="question-num">Belirti {sym.id}</span>
              <strong className="question-title">{sym.title}</strong>
              <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>
                {sym.category}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              {BAI_SEVERITY_OPTIONS.map(opt => (
                <label
                  key={opt.score}
                  className={`option-label ${answers[idx] === opt.score ? 'selected' : ''}`}
                  onClick={() => handleOptionSelect(idx, opt.score)}
                >
                  <input
                    type="radio"
                    name={`sym_${sym.id}`}
                    checked={answers[idx] === opt.score}
                    onChange={() => handleOptionSelect(idx, opt.score)}
                    className="option-radio"
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--soft)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Alt Butonlar */}
      <div className="assessment-print-actions btn-print-hide">
        <button type="button" className="btn-secondary" onClick={() => printAssessmentPaper('bai')}>
          <Icon name="fileText" size={16} />
          <span>Yanıt formu / PDF</span>
        </button>
        <button type="button" className="btn-secondary" onClick={() => printAssessmentResult('bai')}>
          <Icon name="print" size={16} />
          <span>Sonuç özeti / PDF</span>
        </button>
        <button type="button" className="btn-primary" onClick={handleSave}>
          <Icon name="save" size={16} />
          <span>Testi Danışan Dosyasına Kaydet</span>
        </button>
      </div>
    </div>
  );
}
