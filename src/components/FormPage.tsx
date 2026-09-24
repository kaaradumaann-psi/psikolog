import type { CSSProperties } from 'react';
import type { FormDefinition, PageDefinition } from '../omr/omrTypes';
import { FORM } from '../form/layout';
import { FORM_COPYRIGHT_LINE } from '../form/attribution';
import { AnswerColumn } from './AnswerColumn';
import { PageQr } from './PageQr';
import { PaperHeader } from './PaperHeader';
import { RegistrationMarks } from './RegistrationMarks';

const geometryStyle = {
  '--paper-width': `${FORM.pageWidthMm}mm`,
  '--paper-height': `${FORM.pageHeightMm}mm`,
  '--content-left': `${FORM.contentLeftMm}mm`,
  '--content-width': `${FORM.contentWidthMm}mm`,
  '--header-width': `${FORM.qrArea.x - FORM.contentLeftMm - 4}mm`,
  '--grid-top': `${FORM.gridTopMm}mm`,
  '--grid-header': `${FORM.gridHeaderMm}mm`,
  '--column-gap': `${FORM.columnGapMm}mm`,
  '--column-count': FORM.columnCount,
  '--row-pitch': `${FORM.rowPitchMm}mm`,
  '--bubble-diameter': `${FORM.bubbleDiameterMm}mm`,
  '--column-height': `${FORM.rowsPerColumn * FORM.rowPitchMm}mm`,
} as CSSProperties;

export function FormPage({ page, definition, batchId, active }: {
  page: PageDefinition;
  definition: FormDefinition;
  batchId: string;
  active: boolean;
}) {
  return <article className={`form-page${active ? ' is-active' : ''}`} style={geometryStyle}
    data-page={page.pageNumber} data-identity={page.pageNumber === 1 ? 'cover' : 'continuation'}
    aria-label={`Cevap formu, sayfa ${page.pageNumber}, ${page.firstItem}–${page.lastItem}. maddeler`}>
    <RegistrationMarks />
    <PageQr definition={definition} batchId={batchId} pageNumber={page.pageNumber} />
    <PaperHeader page={page} definition={definition} />
    <div className="answer-columns">{page.columns.map((column, index) =>
      <AnswerColumn key={index} column={column} />)}</div>
    <footer className="paper-footer">
      <div><strong>{FORM.templateId}</strong><span className="paper-copyright">{FORM_COPYRIGHT_LINE}</span>
        <span>Set kodu {batchId}</span></div>
      <div><strong>Sayfa {page.pageNumber} / {definition.totalPages}</strong><span>A4 · 210 × 297 mm · Tek yüz</span>
        <span>Dört sayfa aynı set kodunu taşır.</span></div>
    </footer>
  </article>;
}
