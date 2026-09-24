import type { CSSProperties } from 'react';
import type { ItemDefinition } from '../omr/omrTypes';
import { FORM } from '../form/layout';

export function AnswerColumn({ column }: { column: readonly ItemDefinition[] }) {
  const first = column[0];
  const last = column.at(-1);
  if (!first || !last) return null;
  return <section className="answer-column" aria-label={`${first.itemNumber}–${last.itemNumber}. maddeler`}>
    <div className="column-heading" aria-hidden="true">
      <span className="item-number">No.</span>
      {FORM.choices.map(choice => <span key={choice.code} className="choice-heading"
        style={{ '--choice-x': `${choice.centerInColumnMm}mm` } as CSSProperties}>{choice.code}</span>)}
    </div>
    <div className="column-rows">
      {column.map(item => <div className="answer-row" key={item.itemId} data-item={item.itemNumber}>
        <span className="item-number">{item.itemNumber}</span>
        {FORM.choices.map(choice => <span key={choice.code} className="answer-bubble"
          role="img" aria-label={`${item.itemNumber}. madde, ${choice.label}: boş işaretleme alanı`}
          data-choice={choice.code}
          style={{ '--choice-x': `${choice.centerInColumnMm}mm` } as CSSProperties} />)}
      </div>)}
      {column.length < FORM.rowsPerColumn && <div className="column-end">
        <span>FORM SONU</span><br />Son madde: {FORM.totalItems}
      </div>}
    </div>
  </section>;
}
