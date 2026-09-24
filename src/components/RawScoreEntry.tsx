import { useState } from 'react';
import { MMPI_MAX_BLANK, RAW_SCORE_FIELDS, RAW_SCORE_MAX } from '../workspace/caseTypes';
import type { RawScoreKey, RawScores } from '../workspace/caseTypes';

type RawScoreEntryProps = {
  scores: RawScores;
  onChange: (next: RawScores) => void;
};

export function RawScoreEntry({ scores, onChange }: RawScoreEntryProps) {
  /** Sınır dışı giriş sessizce yutulmaz: alan altında açık uyarı gösterilir. */
  const [rangeError, setRangeError] = useState<Partial<Record<RawScoreKey, string>>>({});

  function setField(key: RawScoreKey, raw: string) {
    if (raw === '') {
      setRangeError(previous => ({ ...previous, [key]: undefined }));
      onChange({ ...scores, [key]: '' });
      return;
    }
    if (!/^\d+$/.test(raw)) return;
    const number = Number(raw);
    const max = RAW_SCORE_MAX[key];
    if (number > max) {
      setRangeError(previous => ({ ...previous, [key]: `En fazla ${max} girilebilir.` }));
      return;
    }
    setRangeError(previous => ({ ...previous, [key]: undefined }));
    onChange({ ...scores, [key]: number });
  }

  const validity = RAW_SCORE_FIELDS.filter(field => field.group === 'validity');
  const clinical = RAW_SCORE_FIELDS.filter(field => field.group === 'clinical');
  const entered = RAW_SCORE_FIELDS.filter(field => scores[field.key] !== '').length;
  const missing = RAW_SCORE_FIELDS.filter(field => scores[field.key] === '').map(field => field.label);
  const blank = scores.blank === '' ? 0 : scores.blank;
  const blankOver = typeof blank === 'number' && blank > MMPI_MAX_BLANK;

  return (
    <section className="ws-panel" aria-labelledby="raw-title">
      <header className="ws-panel-head">
        <div>
          <span className="section-badge badge-primary">03 · Veri</span>
          <h2 id="raw-title" className="ws-panel-title">
            Ham <em>puan</em>
          </h2>
          <p className="ws-muted">
            Hs, Pd, Pt, Sc ve Ma <strong>K düzeltmesi yapılmadan</strong> girilir. Her alan anında taslağa yazılır;
            F5 ve internet kesintisinde korunur.
          </p>
        </div>
        <div className="qe-counts" aria-label="İlerleme">
          <span>{entered} / {RAW_SCORE_FIELDS.length}</span>
          {blankOver ? <span className="ws-chip qe-blank-over">Boş {blank}</span> : null}
        </div>
      </header>

      {blankOver && (
        <p className="qe-blank-warning" role="alert">
          Boş ({blank}) {MMPI_MAX_BLANK} sınırını aşıyor; bu durum testi geçersiz sayabilir. Kontrol adımında kayıt
          engellenecek.
        </p>
      )}

      {missing.length > 0 ? (
        <p className="ws-hint" role="status">
          Eksik: {missing.join(', ')}. Kontrol adımı için {RAW_SCORE_FIELDS.length} alanın tamamı doldurulmalı.
        </p>
      ) : (
        <p className="ws-hint" role="status">Tüm ölçekler girildi; Kontrol adımına geçebilirsiniz.</p>
      )}

      <div className="raw-grid-wrap">
        <fieldset className="raw-group">
          <legend>Geçerlik göstergeleri</legend>
          <p className="ws-hint">Boş (?) + L + F + K. Profilin yorumlanabilirliğini belirler.</p>
          <div className="raw-grid">
            {validity.map(field => (
              <label key={field.key} className="raw-field">
                <span>{field.label}</span>
                <input
                  inputMode="numeric"
                  type="number"
                  min={0}
                  max={field.max}
                  value={scores[field.key]}
                  onChange={event => setField(field.key, event.target.value)}
                  aria-label={`${field.label} ham puanı, 0 ile ${field.max} arası`}
                  aria-invalid={rangeError[field.key] ? true : undefined}
                />
                {rangeError[field.key] ? (
                  <small className="ws-hint is-error">{rangeError[field.key]}</small>
                ) : (
                  <small>0–{field.max}</small>
                )}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="raw-group">
          <legend>Klinik ölçekler</legend>
          <p className="ws-hint">Hs · D · Hy · Pd · Mf · Pa · Pt · Sc · Ma · Si. K’li beş ölçek düzeltmesiz girilir.</p>
          <div className="raw-grid">
            {clinical.map(field => (
              <label key={field.key} className="raw-field">
                <span>
                  {field.label}
                  {field.kRaw ? <em> K−</em> : null}
                </span>
                <input
                  inputMode="numeric"
                  type="number"
                  min={0}
                  max={field.max}
                  value={scores[field.key]}
                  onChange={event => setField(field.key, event.target.value)}
                  aria-label={`${field.label} ham puanı${field.kRaw ? ' (K düzeltmesiz)' : ''}, 0 ile ${field.max} arası`}
                  aria-invalid={rangeError[field.key] ? true : undefined}
                />
                {rangeError[field.key] ? (
                  <small className="ws-hint is-error">{rangeError[field.key]}</small>
                ) : (
                  <small>0–{field.max}{field.kRaw ? ' · K’sız' : ''}</small>
                )}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
