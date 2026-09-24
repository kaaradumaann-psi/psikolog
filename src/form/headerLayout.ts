import type { FormDefinition, PageDefinition } from '../omr/omrTypes';
import { FORM } from '../omr/formDefinition';

/**
 * The single source of truth for the paper header.
 *
 * The header used to be laid out twice: as flowing HTML in `form.css` and as absolute
 * millimetre text in `renderFormPdf.ts`. The two drifted apart — the reminder sentence was
 * 259 mm wide at 6 pt, so the PDF drew it across the QR area and off the sheet, while the
 * browser wrapped it into four lines that ran underneath the answer grid, which is the
 * "texts slid down" report. Every line below is an explicit millimetre box that both
 * renderers consume, and `tests/printLayout.test.ts` measures each line with the embedded
 * font so a line can never be longer than the space reserved for it again.
 */

export const MM_PER_PT = 25.4 / 72;
/** Liberation Sans/Arial vertical metrics. The browser resolves the same baseline from
 * `top + line-height` because Arial and Liberation Sans share these ratios. */
export const ASCENT_RATIO = 1854 / 2048;
export const CONTENT_RATIO = (1854 + 434) / 2048;

/** Width of the printed header block: everything between the left content edge and the QR area. */
export const HEADER_WIDTH_MM = FORM.qrArea.x - FORM.contentLeftMm - 4;

export const HEADER_LAYOUT = Object.freeze({
  topMm: 20,
  titleRowHeightMm: 14,
  titleRuleHeightMm: .35,
  subtitleGapMm: 1.5,
  identityTopMm: 36.5,
  identityLabelBoxMm: 2.2,
  identityRuleGapMm: .7,
  identityRuleHeightMm: 4,
  identityRuleThicknessMm: .2,
  identityColumnWidthMm: 51,
  identityColumnGapMm: 4,
  identityDateWidthMm: 30,
  instructionsTopMm: 44,
  /** Guard band for the test that measures real glyph advances. */
  maxTextWidthMm: 132,
});

/** Line box height for a point size; identical in the PDF and in the browser. */
export function lineBoxMm(sizePt: number): number {
  return sizePt * MM_PER_PT * CONTENT_RATIO;
}

/** Baseline of a line whose box top is `topMm`, as CSS and the PDF writer both compute it. */
export function baselineMm(topMm: number, sizePt: number, boxMm = lineBoxMm(sizePt)): number {
  const sizeMm = sizePt * MM_PER_PT;
  return topMm + (boxMm - sizeMm * CONTENT_RATIO) / 2 + sizeMm * ASCENT_RATIO;
}

/** Top edge of a line box whose baseline is fixed. */
export function topForBaseline(baseline: number, sizePt: number, boxMm = lineBoxMm(sizePt)): number {
  return baseline - (baselineMm(0, sizePt, boxMm));
}

export type HeaderSpan = { text: string; sizePt: number; bold: boolean };
export type HeaderAlign = 'left' | 'right' | 'center';
export type HeaderLine = {
  id: string;
  spans: readonly HeaderSpan[];
  /** Point size of the first span; it fixes the baseline every span shares. */
  sizePt: number;
  /** CSS/PDF line box height in millimetres. */
  boxMm: number;
  /** Left edge, right edge or centre, depending on `align`. */
  xMm: number;
  topMm: number;
  align: HeaderAlign;
  /** `first` only on page 1, `continuation` only on pages 2+, `all` everywhere. */
  visibility: 'first' | 'continuation' | 'all';
};
export type HeaderRule = { id: string; xMm: number; topMm: number; widthMm: number; heightMm: number };
export type HeaderExample = {
  /** Vertical centre of the sample bubble, in millimetres from the top. */
  cyMm: number;
  diameterMm: number;
  gapMm: number;
  /** Right edge the caption is aligned to; the bubble sits `gapMm` to its left. */
  rightMm: number;
  label: HeaderLine;
};

export type HeaderPageInfo = Pick<PageDefinition, 'pageNumber' | 'firstItem' | 'lastItem'>;

const PAD = '\u00a0\u00a0';

/**
 * Every printed header line, in millimetres from the sheet's top-left corner.
 * Sizes are chosen so each line fits inside `HEADER_WIDTH_MM` with room to spare:
 * the longest first-page line measures 124.3 mm at 6 pt.
 */
export function headerLines(page: HeaderPageInfo, definition: FormDefinition): HeaderLine[] {
  const layout = HEADER_LAYOUT;
  const left = FORM.contentLeftMm;
  const right = left + HEADER_WIDTH_MM;
  const number = String(page.pageNumber).padStart(2, '0');
  const total = String(definition.totalPages).padStart(2, '0');
  const numberBox = 18 * MM_PER_PT;
  const instructions: HeaderLine[] = [];
  const pushInstruction = (id: string, text: string, sizePt: number, bold = false) => {
    const previous = instructions.at(-1);
    const topMm = previous ? previous.topMm + previous.boxMm : layout.instructionsTopMm;
    instructions.push({ id, spans: [{ text, sizePt, bold }], sizePt, boxMm: lineBoxMm(sizePt),
      xMm: left, topMm, align: 'left', visibility: 'first' });
  };
  if (page.pageNumber === 1) {
    pushInstruction('marking-key', `D: Doğru${PAD} Y: Yanlış`, 7.5, true);
    pushInstruction('rule-fill', 'Her maddede yalnızca bir dairenin içini tamamen doldurun.', 6.5);
    pushInstruction('rule-handwriting', 'El yazısı kimlik yalnızca bu sayfadadır.', 6.5);
    // The reminder was one 259 mm-long sentence at 6 pt, i.e. wider than the whole sheet, so the PDF
    // drew it off the page and the browser wrapped it under the answer grid. The same words are
    // printed on three lines instead (94.0 / 69.9 / 95.1 mm measured with the embedded font).
    pushInstruction('rule-order', 'Numaraları sütun boyunca aşağıya doğru izleyin.', 6);
    pushInstruction('rule-session', 'Dört sayfayı aynı oturumda yazdırın.', 6);
    pushInstruction('rule-qr', 'Sağ üstteki QR kodu sayfaları otomatik eşleştirir.', 6);
  } else {
    instructions.push({ id: 'continuation-rule',
      spans: [{ text: 'Devam sayfası. İşaretleme kuralı ilk sayfadakiyle aynıdır.', sizePt: 7, bold: false }],
      sizePt: 7, boxMm: lineBoxMm(7), xMm: left, topMm: layout.topMm + layout.titleRowHeightMm + 4,
      align: 'left', visibility: 'continuation' });
  }

  const lines: HeaderLine[] = [
    { id: 'title', spans: [{ text: 'MMPI-566', sizePt: 20, bold: true }], sizePt: 20,
      boxMm: 20 * MM_PER_PT, xMm: left, topMm: layout.topMm, align: 'left', visibility: 'all' },
    { id: 'subtitle',
      spans: [{ text: `OPTİK CEVAP FORMU / ${definition.version}`, sizePt: 8, bold: true }],
      sizePt: 8, boxMm: 8 * MM_PER_PT, xMm: left, topMm: layout.topMm + 20 * MM_PER_PT + layout.subtitleGapMm,
      align: 'left', visibility: 'all' },
    { id: 'page-number', spans: [{ text: number, sizePt: 18, bold: true },
      { text: ` / ${total}`, sizePt: 11, bold: false }], sizePt: 18, boxMm: numberBox,
      xMm: right, topMm: layout.topMm, align: 'right', visibility: 'all' },
    { id: 'page-range', spans: [{ text: `${page.firstItem}\u2013${page.lastItem}. maddeler`, sizePt: 7.5, bold: false }],
      sizePt: 7.5, boxMm: lineBoxMm(7.5), xMm: right, topMm: layout.topMm + numberBox + 1.5,
      align: 'right', visibility: 'all' },
    { id: 'identity-form',
      spans: [{ text: 'FORM KİMLİĞİ', sizePt: 6, bold: true }], sizePt: 6,
      boxMm: layout.identityLabelBoxMm, xMm: left, topMm: layout.identityTopMm, align: 'left', visibility: 'first' },
    { id: 'identity-participant',
      spans: [{ text: 'KATILIMCI KODU', sizePt: 6, bold: true }], sizePt: 6,
      boxMm: layout.identityLabelBoxMm, xMm: left + layout.identityColumnWidthMm + layout.identityColumnGapMm,
      topMm: layout.identityTopMm, align: 'left', visibility: 'first' },
    { id: 'identity-date',
      spans: [{ text: 'TARİH', sizePt: 6, bold: true }], sizePt: 6,
      boxMm: layout.identityLabelBoxMm, xMm: right, topMm: layout.identityTopMm, align: 'right', visibility: 'first' },
    { id: 'date-slash-left',
      spans: [{ text: '/', sizePt: 8, bold: false }], sizePt: 8, boxMm: lineBoxMm(8),
      xMm: right - layout.identityDateWidthMm * 2 / 3, topMm: topForBaseline(dateSlashBaseline(), 8),
      align: 'center', visibility: 'first' },
    { id: 'date-slash-right',
      spans: [{ text: '/', sizePt: 8, bold: false }], sizePt: 8, boxMm: lineBoxMm(8),
      xMm: right - layout.identityDateWidthMm / 3, topMm: topForBaseline(dateSlashBaseline(), 8),
      align: 'center', visibility: 'first' },
    ...instructions,
  ];
  // Page-specific lines are filtered here so a renderer cannot leak the handwriting block
  // onto pages 2-4 or the "continuation" note onto page 1.
  return lines.filter(line => page.pageNumber === 1
    ? line.visibility !== 'continuation' : line.visibility !== 'first');
}

function dateSlashBaseline(): number {
  const layout = HEADER_LAYOUT;
  return layout.identityTopMm + layout.identityLabelBoxMm + layout.identityRuleGapMm + layout.identityRuleHeightMm - .1;
}

/** Horizontal rules of the header: the title rule and the three handwriting lines. */
export function headerRules(page: HeaderPageInfo, definition: FormDefinition): HeaderRule[] {
  void definition;
  const layout = HEADER_LAYOUT;
  const rules: HeaderRule[] = [{ id: 'title-rule', xMm: FORM.contentLeftMm,
    topMm: layout.topMm + layout.titleRowHeightMm - layout.titleRuleHeightMm,
    widthMm: HEADER_WIDTH_MM, heightMm: layout.titleRuleHeightMm }];
  if (page.pageNumber === 1) {
    const top = layout.identityTopMm + layout.identityLabelBoxMm + layout.identityRuleGapMm +
      layout.identityRuleHeightMm - layout.identityRuleThicknessMm;
    const columns = identityColumns();
    for (const [index, column] of columns.entries()) {
      rules.push({ id: `identity-rule-${index}`, xMm: column.xMm, topMm: top,
        widthMm: column.widthMm, heightMm: layout.identityRuleThicknessMm });
    }
  }
  return rules;
}

/** Handwriting-line columns: form id, participant code, date. Shared by the rules and the slashes. */
export function identityColumns(): { id: string; xMm: number; widthMm: number }[] {
  const layout = HEADER_LAYOUT;
  const left = FORM.contentLeftMm;
  const right = left + HEADER_WIDTH_MM;
  return [
    { id: 'identity-form', xMm: left, widthMm: layout.identityColumnWidthMm },
    { id: 'identity-participant', xMm: left + layout.identityColumnWidthMm + layout.identityColumnGapMm,
      widthMm: layout.identityColumnWidthMm },
    { id: 'identity-date', xMm: right - layout.identityDateWidthMm, widthMm: layout.identityDateWidthMm },
  ];
}

/**
 * Eski “Örnek işaretleme” dolgulu dairesi artık basılmıyor — hem PDF’te hem
 * HTML’de formu neredeyse hiç kullanmayan adayları yanıltıyor ve başlıkta
 * 35 mm’lik sağ rezerv nedeniyle “D: Doğru Y: Yanlış” satırının kaymış
 * görünmesine neden oluyordu.  Kaldırıldı; fonksiyon geriye uyum için
 * `null` döndürmeye devam ediyor fakat hiçbir çağrıcı artık çizim yapmıyor.
 */
export function headerExample(_page: HeaderPageInfo, _definition: FormDefinition): HeaderExample | null {
  return null;
}

/** Lowest printed pixel of the header; the answer grid starts at `FORM.gridTopMm`. */
export function headerBottomMm(page: HeaderPageInfo, definition: FormDefinition): number {
  return Math.max(...headerLines(page, definition).map(line => line.topMm + line.boxMm));
}
