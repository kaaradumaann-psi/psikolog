import { useState } from 'react';
import type { SoapSession } from '../../clinical/clinicalTypes';
import { summarizeWithAI } from '../../features/ai/aiTypes';
import { Icon } from '../Icon';

export function SessionSummaryButton({ sessions }: { sessions: SoapSession[] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function draft() {
    setError(null);
    const owners = new Set(sessions.map((session) => session.clientId));
    if (owners.size !== 1) {
      setError('Özet için listeden tek bir danışanı süzün. Başka danışanın notu karışmaz.');
      return;
    }
    const latest = [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))[0];
    if (!latest) {
      setError('Özetlenecek seans kaydı yok.');
      return;
    }
    setSourceLabel(`${latest.clientName} · ${latest.date} · seans #${latest.sessionNumber}`);
    const source = `S: ${latest.subjective}\nO: ${latest.objective}\nA: ${latest.assessment}\nP: ${latest.plan}`;
    try {
      const result = await summarizeWithAI({ text: source, type: 'session_notes' });
      setText(result.summary);
      setWarnings(result.warnings);
      setOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Özet üretilemedi');
    }
  }

  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => void draft()}>
        <Icon name="sparkles" size={16} />
        <span>Özet taslağı</span>
      </button>
      {error && <span style={{ fontSize: 12, color: 'var(--danger-ink)' }}>{error}</span>}
      {open && (
        <div className="clinical-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="clinical-modal" onClick={(event) => event.stopPropagation()}>
            <div className="clinical-modal-head">
              <h3>Ayıklayıcı özet — tanı değildir</h3>
              <button type="button" className="btn-icon" onClick={() => setOpen(false)} aria-label="Kapat"><Icon name="close" size={18} /></button>
            </div>
            <div className="clinical-modal-body">
              <p style={{ marginTop: 0, color: 'var(--soft)', fontSize: 13 }}>{sourceLabel}</p>
              <p>{text}</p>
              <ul style={{ color: 'var(--soft)', fontSize: 13 }}>
                {warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
