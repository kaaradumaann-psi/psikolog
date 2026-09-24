import type { CSSProperties } from 'react';
import type { FormDefinition, PageDefinition } from '../omr/omrTypes';
import { FORM } from '../omr/formDefinition';
import { HEADER_WIDTH_MM, headerLines, headerRules } from '../form/headerLayout';
import type { HeaderLine } from '../form/headerLayout';

/**
 * The HTML twin of `renderFormPdf`'s header. Both read `src/form/headerLayout.ts`, so a line
 * cannot be positioned in one renderer and drift in the other: the reminder sentence that used
 * to wrap into the answer grid is now a fixed millimetre box on both sides.
 */
function lineStyle(line: HeaderLine): CSSProperties {
  const place: CSSProperties = line.align === 'right'
    ? { right: `${FORM.pageWidthMm - line.xMm}mm`, textAlign: 'right' }
    : line.align === 'center'
      ? { left: `${line.xMm}mm`, transform: 'translateX(-50%)' }
      : { left: `${line.xMm}mm` };
  return {
    ...place,
    top: `${line.topMm}mm`,
    lineHeight: `${line.boxMm}mm`,
    fontSize: `${line.sizePt}pt`,
    fontWeight: line.spans[0]?.bold ? 700 : 400,
  };
}

export function PaperHeader({ page, definition }: { page: PageDefinition; definition: FormDefinition }) {
  const lines = headerLines(page, definition);
  const rules = headerRules(page, definition);
  // “Örnek işaretleme” kaldırıldı — kayma yaratıyordu, artık çizilmiyor.
  return <div className="paper-header" data-header-width={HEADER_WIDTH_MM}>
    {rules.map(rule => <span key={rule.id} className="paper-rule" style={{ left: `${rule.xMm}mm`,
      top: `${rule.topMm}mm`, width: `${rule.widthMm}mm`, height: `${rule.heightMm}mm` }} />)}
    {lines.map(line => <span key={line.id} className="paper-line" data-line={line.id} style={lineStyle(line)}>
      {line.spans.map((span, index) => <span key={index} style={{ fontSize: `${span.sizePt}pt`,
        fontWeight: span.bold ? 700 : 400 }}>{span.text}</span>)}
    </span>)}
  </div>;
}
