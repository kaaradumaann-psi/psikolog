import { createPageQr } from '../form/pageIdentity';
import { baselineMm, headerLines, headerRules, MM_PER_PT } from '../form/headerLayout';
import { FORM_COPYRIGHT_LINE } from '../form/attribution';
import { COLUMN_WIDTH_MM, FORM } from '../omr/formDefinition';
import type { FormDefinition, PageDefinition } from '../omr/omrTypes';
import { addStream, embedTrueType, PdfDocument } from './pdfDocument';
import type { EmbeddedFont } from './pdfDocument';
import { parseTtf } from './ttfFont';

// Re-exported so the verifier and the tests keep reading one definition of the point size.
export { MM_PER_PT };
const PT_PER_MM = 72 / 25.4;

const FOOTER_TOP = 277;

const round = (value: number) => Math.round(value * 1000) / 1000;
const num = (value: number) => round(value).toString();

/** Baseline of a single line whose CSS line box starts at `top`. */
function baseline(top: number, sizePt: number, lineHeightMm?: number): number {
  return baselineMm(top, sizePt, lineHeightMm);
}

class Sheet {
  readonly ops: string[] = [];
  constructor(private readonly fonts: { regular: EmbeddedFont; bold: EmbeddedFont }) {}

  rect(x: number, top: number, width: number, height: number, gray = 0): void {
    if (width <= 0 || height <= 0) return;
    this.ops.push(`${gray} g`, `${num(x)} ${num(FORM.pageHeightMm - top - height)} ${num(width)} ${num(height)} re f`);
  }

  /** Stroked circle; `borderWidth` is drawn inward, matching the CSS border box. */
  circle(cx: number, cyTop: number, diameter: number, borderWidth: number): void {
    const radius = diameter / 2, path = radius - borderWidth / 2;
    if (path <= 0) { this.rect(cx - radius, cyTop - radius, diameter, diameter); return; }
    const cy = FORM.pageHeightMm - cyTop, kappa = 0.5522847498 * path, r = round(path);
    const p = (x: number, y: number) => `${num(x)} ${num(y)}`;
    this.ops.push('0 g', `${num(borderWidth)} w`,
      `${p(cx + path, cy)} m`,
      `${p(cx + path, cy + kappa)} ${p(cx + kappa, cy + r)} ${p(cx, cy + r)} c`,
      `${p(cx - kappa, cy + r)} ${p(cx - path, cy + kappa)} ${p(cx - path, cy)} c`,
      `${p(cx - path, cy - kappa)} ${p(cx - kappa, cy - r)} ${p(cx, cy - r)} c`,
      `${p(cx + kappa, cy - r)} ${p(cx + path, cy - kappa)} ${p(cx + path, cy)} c`, 'S');
  }

  /** Rendered width of a label in millimetres. */
  width(value: string, sizePt: number, bold = false): number {
    const font = bold ? this.fonts.bold : this.fonts.regular;
    return font.advance(value) / 1000 * sizePt * MM_PER_PT;
  }

  text(value: string, x: number, baselineTop: number, sizePt: number, options: {
    bold?: boolean; align?: 'left' | 'right' | 'center'; edge?: number; gray?: number;
  } = {}): number {
    const font = options.bold ? this.fonts.bold : this.fonts.regular;
    const sizeMm = sizePt * MM_PER_PT;
    const width = font.advance(value) / 1000 * sizeMm;
    const left = options.align === 'right' ? (options.edge ?? x) - width
      : options.align === 'center' ? x - width / 2 : x;
    this.ops.push('BT', `/${options.bold ? 'F2' : 'F1'} ${num(sizeMm)} Tf`, `${options.gray ?? 0} g`,
      `${num(left)} ${num(FORM.pageHeightMm - baselineTop)} Td`, `${font.text(value)} Tj`, 'ET');
    return width;
  }
}

function drawQr(sheet: Sheet, definition: FormDefinition, batchId: string, pageNumber: number): void {
  const qr = createPageQr(definition, batchId, pageNumber);
  const { area, size, data, quiet, moduleMm } = qr;
  sheet.rect(area.x, area.y, area.width, area.height, 1);
  const modules: string[] = [];
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      if (!data[row * size + column]) continue;
      modules.push(`${num(area.x + (column + quiet) * moduleMm)} ` +
        `${num(FORM.pageHeightMm - area.y - (row + quiet + 1) * moduleMm)} ${num(moduleMm)} ${num(moduleMm)} re`);
    }
  }
  if (modules.length) sheet.ops.push('0 g', ...modules, 'f');
}

function drawRegistrationMarks(sheet: Sheet): void {
  const { pageWidthMm, pageHeightMm, markerInsetMm: inset, markerSizeMm: size } = FORM;
  const corners: readonly (readonly [number, number])[] = [[inset, inset], [pageWidthMm - inset - size, inset],
    [inset, pageHeightMm - inset - size], [pageWidthMm - inset - size, pageHeightMm - inset - size]];
  for (const [x, y] of corners) {
    sheet.rect(x, y, size, size);
  }
  sheet.rect(inset + size + 2, inset, 1.5, size);
}

/**
 * Draws the paper header from `src/form/headerLayout.ts`, the same millimetre boxes the HTML
 * preview uses. The former hand-written offsets disagreed with the browser's flow layout and
 * one instruction line was wider than the sheet, so both renderers now read one layout.
 */
function drawHeader(sheet: Sheet, page: PageDefinition, definition: FormDefinition): void {
  for (const rule of headerRules(page, definition)) {
    sheet.rect(rule.xMm, rule.topMm, rule.widthMm, rule.heightMm);
  }
  // Every span of a line shares one baseline, exactly as inline boxes with a common line-height do.
  for (const line of headerLines(page, definition)) {
    const baseline = baselineMm(line.topMm, line.sizePt, line.boxMm);
    const widths = line.spans.map(span => sheet.width(span.text, span.sizePt, span.bold));
    const total = widths.reduce((sum, width) => sum + width, 0);
    let x = line.align === 'right' ? line.xMm - total : line.align === 'center' ? line.xMm - total / 2 : line.xMm;
    line.spans.forEach((span, index) => {
      sheet.text(span.text, x, baseline, span.sizePt, { bold: span.bold });
      x += widths[index]!;
    });
  }
  // “Örnek işaretleme” dolgulu dairesi kaldırıldı — başlıkta kayma (35 mm sağ rezerv)
  // ve adaylar için kafa karışıklığı yaratıyordu.  Artık çizim yok; `headerExample`
  // geriye uyum için `null` döndürür.
}

function drawGrid(sheet: Sheet, page: PageDefinition): void {
  const gridTop = FORM.gridTopMm, header = FORM.gridHeaderMm, pitch = FORM.rowPitchMm;
  const columnHeight = FORM.rowsPerColumn * pitch;
  page.columns.forEach((column, index) => {
    const left = FORM.contentLeftMm + index * (COLUMN_WIDTH_MM + FORM.columnGapMm);
    sheet.rect(left, gridTop, COLUMN_WIDTH_MM, 0.3);
    sheet.rect(left, gridTop + header - 0.2, COLUMN_WIDTH_MM, 0.2);
    sheet.text('No.', left + 12, baseline(gridTop, 8, header), 8, { bold: true, align: 'right' });
    for (const choice of FORM.choices) {
      sheet.text(choice.code, left + choice.centerInColumnMm, baseline(gridTop, 8, header), 8,
        { bold: true, align: 'center' });
    }
    for (const item of column) {
      const top = gridTop + header + item.rowIndex * pitch;
      sheet.text(String(item.itemNumber), left + 12, baseline(top, 9, pitch), 9, { align: 'right' });
      // Bubble geometry comes straight from the shared definition, never recomputed here.
      for (const area of item.responseAreas) {
        sheet.circle(area.x + area.width / 2, area.y + area.height / 2, area.width, 0.3);
      }
      const isLast = item.rowIndex === column.length - 1;
      if (isLast) sheet.rect(left, top + pitch - 0.2, COLUMN_WIDTH_MM, 0.2);
      else if ((item.rowIndex + 1) % 8 === 0) sheet.rect(left, top + pitch - 0.13, COLUMN_WIDTH_MM, 0.13, 0.6);
    }
    if (column.length < FORM.rowsPerColumn) {
      const top = gridTop + header + column.length * pitch + 6;
      sheet.text('FORM SONU', left + COLUMN_WIDTH_MM / 2, baseline(top, 6), 6, { bold: true, align: 'center' });
      sheet.text(`Son madde: ${FORM.totalItems}`, left + COLUMN_WIDTH_MM / 2, baseline(top + 5.4, 7), 7, { align: 'center' });
    }
    if (index < page.columns.length - 1) {
      sheet.rect(left + COLUMN_WIDTH_MM + FORM.columnGapMm / 2 - 0.15, gridTop, 0.15, header + columnHeight, 0.6);
    }
  });
}

function drawFooter(sheet: Sheet, page: PageDefinition, definition: FormDefinition, batchId: string): void {
  const left = FORM.contentLeftMm, right = left + FORM.contentWidthMm;
  sheet.rect(left, FOOTER_TOP, FORM.contentWidthMm, 0.25);
  const top = FOOTER_TOP + 0.25 + 2;
  sheet.text(FORM.templateId, left, baseline(top, 6.5), 6.5);
  sheet.text(FORM_COPYRIGHT_LINE, left, baseline(top + 3.6, 6.5), 6.5);
  // Printed on paper so four sheets of one set can be checked by eye before scanning.
  sheet.text(`Set kodu ${batchId}`, left, baseline(top + 7.2, 6.5), 6.5);
  sheet.text(`Sayfa ${page.pageNumber} / ${definition.totalPages}`, right, baseline(top, 6.5), 6.5, { align: 'right' });
  sheet.text('A4 · 210 × 297 mm · Tek yüz', right, baseline(top + 3.6, 6.5), 6.5, { align: 'right' });
  sheet.text('Dört sayfa aynı set kodunu taşır.', right, baseline(top + 7.2, 6.5), 6.5, { align: 'right' });
}

/** Renders one page as a PDF content stream in a millimetre user space. */
function renderPage(sheet: Sheet, page: PageDefinition, definition: FormDefinition, batchId: string): void {
  sheet.ops.push('0 g', '1 J', '1 j');
  drawRegistrationMarks(sheet);
  drawQr(sheet, definition, batchId, page.pageNumber);
  drawHeader(sheet, page, definition);
  drawGrid(sheet, page);
  drawFooter(sheet, page, definition, batchId);
}

export type RenderedFormPdf = { bytes: Uint8Array; missingGlyphs: string[]; pages: number };

/**
 * Builds the printable answer sheet from the same FormDefinition the OMR reader
 * uses, so bubble centres, registration squares and the QR area cannot drift
 * from the scanner. Labels are laid out independently of the CSS renderer.
 */
export async function renderFormPdf(definition: FormDefinition, batchId: string,
  faces: { regular: Uint8Array; bold: Uint8Array }): Promise<RenderedFormPdf> {
  const doc = new PdfDocument();
  const fonts = {
    regular: await embedTrueType(doc, parseTtf(faces.regular), 'LiberationSans'),
    bold: await embedTrueType(doc, parseTtf(faces.bold), 'LiberationSans-Bold'),
  };
  const pages = doc.allocate();
  const kids: number[] = [];
  const scale = PT_PER_MM;
  for (const page of definition.pages) {
    const sheet = new Sheet(fonts);
    renderPage(sheet, page, definition, batchId);
    const body = new TextEncoder().encode(`${num(scale)} 0 0 ${num(scale)} 0 0 cm\n${sheet.ops.join('\n')}\n`);
    const contents = await addStream(doc, '', body);
    kids.push(doc.add({
      dict: `<< /Type /Page /Parent ${pages} 0 R ` +
        `/MediaBox [0 0 ${num(definition.pageWidthMm * scale)} ${num(definition.pageHeightMm * scale)}] ` +
        `/Resources << /Font << /F1 ${fonts.regular.reference} 0 R /F2 ${fonts.bold.reference} 0 R >> >> ` +
        `/Contents ${contents} 0 R >>`,
    }));
  }
  doc.set(pages, { dict: `<< /Type /Pages /Kids [${kids.map(kid => `${kid} 0 R`).join(' ')}] /Count ${kids.length} >>` });
  const catalog = doc.add({ dict: `<< /Type /Catalog /Pages ${pages} 0 R >>` });
  await fonts.regular.finalize();
  await fonts.bold.finalize();
  const missingGlyphs = [...new Set([...fonts.regular.missing, ...fonts.bold.missing])];
  if (missingGlyphs.length) {
    throw new Error(`Yazı tipinde eksik glif: ${missingGlyphs.join(' ')}`);
  }
  return { bytes: await doc.finish(catalog), missingGlyphs, pages: kids.length };
}
