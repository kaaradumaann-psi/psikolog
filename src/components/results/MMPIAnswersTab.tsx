import { useMemo } from 'react';
import type { ItemAnswer } from '../../workspace/caseTypes';
import { countAnswers } from '../../workspace/caseTypes';
import { Icon } from '../Icon';

type Props = {
  answers?: ItemAnswer[];
};

const ROW_SIZE = 10;

/**
 * Soru Yanıtları sekmesi — 566 maddenin tamamı onarlı satırlarda,
 * D (Doğru) / Y (Yanlış) / Boş renk kodlarıyla.
 */
export function MMPIAnswersTab({ answers }: Props) {
  const counts = useMemo(() => (answers ? countAnswers(answers) : null), [answers]);

  const rows = useMemo(() => {
    if (!answers) return [];
    const out: { num: number; answer: ItemAnswer }[][] = [];
    for (let i = 0; i < answers.length; i += ROW_SIZE) {
      out.push(
        answers.slice(i, i + ROW_SIZE).map((answer, j) => ({
          num: i + j + 1,
          answer,
        })),
      );
    }
    return out;
  }, [answers]);

  if (!answers || !counts) {
    return (
      <div role="tabpanel" className="mmpi-tab-panel">
        <div className="mmpi-box info">
          <Icon name="info" size={14} />
          <span>
            {' '}
            Bu işlemin madde düzeyinde yanıt verisi yok (ham puan yöntemiyle girildi). T puanları “Klinik
            Ölçekler” sekmesinde yer alır.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div role="tabpanel" className="mmpi-tab-panel">
      <div className="mmpi-answers-stats">
        <span className="ans-chip">
          Toplam <b>{counts.total}</b>
        </span>
        <span className="ans-chip chip-d">
          D (Doğru) <b>{counts.correct}</b>
        </span>
        <span className="ans-chip chip-y">
          Y (Yanlış) <b>{counts.wrong}</b>
        </span>
        <span className="ans-chip chip-blank">
          Boş (?) <b>{counts.blank}</b>
        </span>
        {counts.pending > 0 && (
          <span className="ans-chip">
            Girmemiş <b>{counts.pending}</b>
          </span>
        )}
      </div>

      <div className="mmpi-answers-grid">
        {rows.map((row, rowIndex) => (
          <div className="mmpi-answers-row" key={rowIndex}>
            {row.map(cell => (
              <div
                key={cell.num}
                className={`ans-cell ${
                  cell.answer === 'D' ? 'a-d' : cell.answer === 'Y' ? 'a-y' : cell.answer === null ? 'a-blank' : 'a-pending'
                }`}
              >
                <span className="ans-num">{cell.num}</span>
                <span className="ans-letter">{cell.answer ?? (cell.answer === null ? 'Boş' : '—')}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
