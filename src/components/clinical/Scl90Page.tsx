import { useState, useMemo } from 'react';
import type { Gender } from '../../clinical/clinicalTypes';
import {
  SCL90_ITEMS,
  SCL90_SCALE_OPTIONS,
  SCL90_DIMENSION_NAMES,
  calculateScl90,
} from '../../clinical/scl90';
import {
  getClients,
  saveScl90Test,
} from '../../clinical/clinicalStore';
import { clinicToday } from '../../clinical/recordRules';
import { asCompleteAnswers, emptyAnswers, parseOptionalAge } from '../../clinical/scaleIntake';
import { Icon } from '../Icon';
import { navigate } from '../../router';

export function Scl90Page() {
  const clients = useMemo(() => getClients(), []);

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientGender, setClientGender] = useState<Gender | ''>('');
  const [clientAge, setClientAge] = useState('');
  const [testDate, setTestDate] = useState<string>(clinicToday());

  const [answers, setAnswers] = useState(() => emptyAnswers(90));
  const [pageIndex, setPageIndex] = useState<number>(0); // 10'arlı sayfalar (0-8)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function handleClientSelect(id: string) {
    setSelectedClientId(id);
    const c = clients.find(cl => cl.id === id);
    if (c) {
      setClientName(`${c.firstName} ${c.lastName}`);
      setClientGender(c.gender);
      setClientAge(c.birthDate ? String(c.age) : '');
    }
  }

  function handleOptionSelect(itemIndex: number, score: number) {
    const updated = [...answers];
    updated[itemIndex] = score;
    setAnswers(updated);
  }

  const completeAnswers = asCompleteAnswers(answers);
  const parsedAge = parseOptionalAge(clientAge);
  const liveResult = useMemo(() => {
    if (!completeAnswers || (clientGender !== 'KADIN' && clientGender !== 'ERKEK') || parsedAge === null) return null;
    return calculateScl90(completeAnswers, {
      clientId: selectedClientId || undefined,
      name: clientName.trim() || 'Danışan',
      gender: clientGender,
      age: parsedAge,
      testDate,
    });
  }, [completeAnswers, selectedClientId, clientName, clientGender, parsedAge, testDate]);

  function handleSave() {
    if (saving) return;
    if (!clientName.trim()) {
      setNotice({ tone: 'error', text: 'Danışan adı gerekli. Varsayılan ad atanmaz.' });
      return;
    }
    if (clientGender !== 'KADIN' && clientGender !== 'ERKEK') {
      setNotice({ tone: 'error', text: 'Cinsiyet seçin. Varsayılan atanmaz.' });
      return;
    }
    if (parsedAge === null) {
      setNotice({ tone: 'error', text: 'Yaş boş bırakılabilir; girildiyse 0–120 arası tam sayı olmalı.' });
      return;
    }
    if (!completeAnswers) {
      setNotice({ tone: 'error', text: 'İşaretlenmeyen madde var. Boş madde 0 sayılmaz.' });
      return;
    }
    const result = calculateScl90(completeAnswers, {
      clientId: selectedClientId || undefined,
      name: clientName.trim(),
      gender: clientGender,
      age: parsedAge,
      testDate,
    });
    setSaving(true);
    try {
      saveScl90Test(result);
      setNotice({ tone: 'ok', text: 'SCL-90-R kaydedildi. Yanıtlanmamış madde yoktur; 0 da bir cevaptır.' });
    } catch (reason) {
      setNotice({ tone: 'error', text: reason instanceof Error ? reason.message : 'Sonuç kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  }

  const currentPageItems = SCL90_ITEMS.slice(pageIndex * 10, (pageIndex + 1) * 10);

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
            <span>SCL-90-R (Belirti Tarama Listesi)</span>
          </div>
          <h1>Psikopatoloji Belirti Taraması</h1>
          <p>90 Madde · 9 Semptom Boyutu (SOM, O-C, I-S, DEP, ANX, HOS, PHOB, PAR, PSY) &amp; Global İndeksler (GSI, PST, PSDI).</p>
        </div>

        <div className="clinical-actions">
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            <Icon name="print" size={16} />
            <span>Raporu Yazdır</span>
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving} aria-busy={saving}>
            <Icon name="save" size={16} />
            <span>Sonucu Kaydet</span>
          </button>
        </div>
      </div>

      {notice && (
        <div
          className="modern-table-card"
          role={notice.tone === 'error' ? 'alert' : 'status'}
          style={{
            background: notice.tone === 'error' ? 'var(--danger-tint)' : 'var(--success-tint)',
            border: `1px solid ${notice.tone === 'error' ? 'var(--danger-border)' : 'var(--success-border)'}`,
            color: notice.tone === 'error' ? 'var(--danger-ink)' : 'var(--success)',
            padding: '12px 16px',
            marginBottom: 20,
          }}
        >
          {notice.text}
        </div>
      )}

      {/* Danışan Seçim Kartı */}
      <div className="modern-table-card btn-print-hide" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Danışan Bilgileri</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div className="form-group">
            <label htmlFor="scl-client-select">Kayıtlı Danışanlardan Seç</label>
            <select
              id="scl-client-select"
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
            <label htmlFor="scl-client-name">Danışan Adı Soyadı *</label>
            <input
              id="scl-client-name"
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Danışanın adı"
            />
          </div>

          <div className="form-group">
            <fieldset className="form-fieldset">
              <legend>Cinsiyet ve yaş</legend>
              <div style={{ display: 'flex', gap: 8 }}>
              <select
                aria-label="Cinsiyet"
                value={clientGender}
                onChange={e => setClientGender(e.target.value === 'ERKEK' || e.target.value === 'KADIN' ? e.target.value : '')}
              >
                <option value="">Seçin</option>
                <option value="KADIN">Kadın</option>
                <option value="ERKEK">Erkek</option>
              </select>
              <input
                aria-label="Yaş"
                type="number"
                style={{ width: 80 }}
                min={0}
                max={120}
                value={clientAge}
                placeholder="Yaş"
                onChange={e => setClientAge(e.target.value)}
              />
              </div>
            </fieldset>
          </div>

          <div className="form-group">
            <label htmlFor="scl-test-date">Uygulanma Tarihi</label>
            <input
              id="scl-test-date"
              type="date"
              value={testDate}
              onChange={e => setTestDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Canlı Skor & Global İndeksler Kartı */}
      <div className="modern-table-card" style={{ padding: 24, marginBottom: 24, border: '2px solid var(--hairline)', background: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--soft)', fontWeight: 600 }}>
              Genel Semptom İndeksi (GSI)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 36, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)' }}>
                {liveResult ? liveResult.gsi : '—'}
              </span>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>/ 4.00</span>
              <span className={`badge ${liveResult && liveResult.gsi >= 1.0 ? 'badge-risk-moderate' : 'badge-active'}`} style={{ fontSize: 13, padding: '4px 10px' }}>
                {liveResult ? (liveResult.gsi >= 1.0 ? 'Klinik Eşik Üzerinde (>1.00)' : 'Eşik altında') : 'Puan yok'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Pozitif Semptom Toplamı (PST)</div>
              <strong style={{ fontSize: 20, color: 'var(--text)' }}>{liveResult ? `${liveResult.pst} / 90` : '—'}</strong>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Semptom Şiddet İndeksi (PSDI)</div>
              <strong style={{ fontSize: 20, color: 'var(--text)' }}>{liveResult ? `${liveResult.psdi} / 4.00` : '—'}</strong>
            </div>
          </div>
        </div>

        {/* 9 Boyut Çubukları */}
        <div className="scl-bar-grid">
          {liveResult && (Object.keys(liveResult.dimensionScores) as (keyof typeof liveResult.dimensionScores)[]).map(key => {
            const score = liveResult.dimensionScores[key];
            const meta = SCL90_DIMENSION_NAMES[key];
            const percentage = Math.min(100, (score / 4.0) * 100);
            const isHigh = score >= 1.5;
            const isModerate = score >= 1.0 && score < 1.5;

            return (
              <div key={key} className="scl-bar-item">
                <div className="scl-bar-header">
                  <strong>{meta.tr} ({meta.abbr})</strong>
                  <span style={{ fontWeight: 600, color: isHigh ? 'var(--danger-ink)' : 'var(--text)' }}>
                    {score} / 4.00
                  </span>
                </div>
                <div className="scl-bar-track">
                  <div
                    className={`scl-bar-fill ${isHigh ? 'high' : isModerate ? 'moderate' : ''}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 8, border: '1px solid var(--hairline)', fontSize: 13.5, lineHeight: 1.6, marginTop: 16 }}>
          <strong>Klinik Yorum &amp; Değerlendirme:</strong> {liveResult ? liveResult.clinicalInterpretation : '90 maddenin tümü işaretlenmeden indeks üretilmez. Boş madde 0 sayılmaz.'}
        </div>
      </div>

      {/* Soru Listesi (Sayfalı 10'arlı görünüm) */}
      <div className="btn-print-hide">
        <div className="scl-question-pagination">
          <h3>Maddeler ({pageIndex * 10 + 1} - {Math.min(90, (pageIndex + 1) * 10)} / 90)</h3>
          <div className="scl-page-buttons" role="group" aria-label="Madde sayfaları">
            {Array.from({ length: 9 }).map((_, i) => (
              <button
                key={i}
                type="button"
                className={`btn-secondary btn-sm ${pageIndex === i ? 'active' : ''}`}
                aria-label={`${i + 1}. sayfa: ${i * 10 + 1}–${(i + 1) * 10}. maddeler`}
                aria-current={pageIndex === i ? 'page' : undefined}
                style={{ fontWeight: pageIndex === i ? 700 : 400, background: pageIndex === i ? 'var(--text)' : undefined, color: pageIndex === i ? 'var(--bg)' : undefined }}
                onClick={() => setPageIndex(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {currentPageItems.map((item, localIdx) => {
          const globalIdx = pageIndex * 10 + localIdx;
          const currentVal = answers[globalIdx];

          return (
            <div
              key={item.id}
              className={`question-item-card ${currentVal !== null ? 'answered' : ''} ${item.id === 15 && (currentVal ?? 0) > 0 ? 'critical' : ''}`}
            >
              <div className="question-header">
                <span className="question-num">Madde {item.id}</span>
                <strong className="question-title">{item.text}</strong>
                {item.id === 15 && (
                  <span className="badge badge-risk-high" style={{ fontSize: 11 }}>İntihar Maddesi</span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 }}>
                {SCL90_SCALE_OPTIONS.map(opt => (
                  <label
                    key={opt.score}
                    className={`option-label ${currentVal === opt.score ? 'selected' : ''}`}
                    onClick={() => handleOptionSelect(globalIdx, opt.score)}
                  >
                    <input
                      type="radio"
                      name={`scl_${item.id}`}
                      checked={currentVal === opt.score}
                      onChange={() => handleOptionSelect(globalIdx, opt.score)}
                      className="option-radio"
                    />
                    <div style={{ fontSize: 12.5 }}>
                      <strong>{opt.label}</strong>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        {/* Sayfa Gezinme Butonları */}
        <div className="scl-page-stepper">
          <button
            type="button"
            className="btn-secondary"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex(p => Math.max(0, p - 1))}
          >
            <Icon name="left" size={16} />
            <span>Önceki 10 Madde</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={pageIndex === 8}
            onClick={() => setPageIndex(p => Math.min(8, p + 1))}
          >
            <span>Sonraki 10 Madde</span>
            <Icon name="right" size={16} />
          </button>
        </div>
      </div>

      {/* Alt Kaydet & Yazdır */}
      <div className="scl-form-actions btn-print-hide">
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          <Icon name="print" size={16} />
          <span>Yazdır / PDF</span>
        </button>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving} aria-busy={saving}>
          <Icon name="save" size={16} />
          <span>SCL-90-R Sonucunu Kaydet</span>
        </button>
      </div>
    </div>
  );
}
