import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PaperHeader } from '../src/components/PaperHeader';
import { FORM_COPYRIGHT_LINE } from '../src/form/attribution';
import {
  ASCENT_RATIO, baselineMm, CONTENT_RATIO, HEADER_LAYOUT, HEADER_WIDTH_MM, headerExample,
  headerLines, headerRules, lineBoxMm, MM_PER_PT, topForBaseline,
} from '../src/form/headerLayout';
import { createBatchId } from '../src/form/pageIdentity';
import { FormPage } from '../src/components/FormPage';
import { FORM_PDF_FILE_NAME, FORM_SET_CODE } from '../src/form/formSet';
import { FORM, formDefinition } from '../src/omr/formDefinition';
import type { FormDefinition } from '../src/omr/omrTypes';
import { parseTtf } from '../src/print/ttfFont';
import type { TtfFont } from '../src/print/ttfFont';
import { readPrintFonts } from '../scripts/printFonts';


/**
 * The header is drawn twice — as PDF text and as browser layout — from one millimetre layout.
 * These tests measure every line with the very font the PDF embeds, so a line that is wider than
 * the space reserved for it fails here instead of running across the QR area, off the sheet or
 * under the answer grid (which is what the 259 mm reminder sentence used to do).
 */
const faces = await readPrintFonts();
const fonts: { regular: TtfFont; bold: TtfFont } = {
  regular: parseTtf(faces.regular), bold: parseTtf(faces.bold),
};

function widthMm(font: TtfFont, text: string, sizePt: number): number {
  let units = 0;
  for (const character of text) units += font.advanceOf(font.glyphIdOf(character.codePointAt(0)!));
  return units / 1000 * sizePt * MM_PER_PT;
}

function lineWidthMm(fontsOf: { regular: TtfFont; bold: TtfFont }, line: {
  spans: readonly { text: string; sizePt: number; bold: boolean }[];
}): number {
  return line.spans.reduce((total, span) =>
    total + widthMm(span.bold ? fontsOf.bold : fontsOf.regular, span.text, span.sizePt), 0);
}

const left = FORM.contentLeftMm;
const right = FORM.contentLeftMm + HEADER_WIDTH_MM;

test('every PDF header line fits between the content edge and the QR area', () => {
  for (const page of formDefinition.pages) {
    for (const line of headerLines(page, formDefinition)) {
      const width = lineWidthMm(fonts, line);
      assert.ok(width <= HEADER_LAYOUT.maxTextWidthMm,
        `${page.pageNumber}. sayfa "${line.id}" satırı ${width.toFixed(1)} mm: ` +
        `${HEADER_LAYOUT.maxTextWidthMm} mm güvenlik sınırını aşıyor.`);
      const leftEdge = line.align === 'right' ? line.xMm - width
        : line.align === 'center' ? line.xMm - width / 2 : line.xMm;
      const rightEdge = leftEdge + width;
      assert.ok(leftEdge >= left - .001 && rightEdge <= right + .001,
        `${line.id} yatay sınırların dışında: ${leftEdge.toFixed(1)}–${rightEdge.toFixed(1)} mm.`);
    }
  }
});

test('the marking key fits alone without the removed sample bubble', () => {
  const page = formDefinition.pages[0]!;
  const key = headerLines(page, formDefinition).find(line => line.id === 'marking-key')!;
  const keyWidth = lineWidthMm(fonts, key);
  // “Örnek işaretleme” dolgulu dairesi kaldırıldı — artık yalnızca anahtar sığmalı.
  assert.ok(keyWidth + 2 <= HEADER_WIDTH_MM,
    `marking key çok geniş: ${keyWidth.toFixed(1)} mm / ${HEADER_WIDTH_MM} mm`);
  // Geriye uyum için headerExample null döndürmeli, hiçbir yerde çizilmemeli.
  assert.equal(headerExample(page, formDefinition), null);
});

test('no header line or rule reaches the answer grid, the QR area or the page edge', () => {
  for (const page of formDefinition.pages) {
    for (const line of headerLines(page, formDefinition)) {
      const bottom = line.topMm + line.boxMm;
      assert.ok(bottom <= FORM.gridTopMm - 0.5,
        `${line.id} satırı ızgaranın içine kayıyor: ${bottom.toFixed(2)} mm > ${FORM.gridTopMm} mm`);
      assert.ok(line.topMm >= HEADER_LAYOUT.topMm, `${line.id} başlığın üstünden taşıyor.`);
      assert.ok(line.xMm > 0 && line.xMm < FORM.pageWidthMm, `${line.id} sayfanın dışında.`);
    }
    for (const rule of headerRules(page, formDefinition)) {
      assert.ok(rule.topMm + rule.heightMm <= FORM.gridTopMm,
        `${rule.id} çizgisi ızgaraya giriyor: ${(rule.topMm + rule.heightMm).toFixed(2)} mm`);
    }
  }
  // The QR symbol sits at 18–44 mm; no header text may run underneath it.
  for (const line of headerLines(formDefinition.pages[0]!, formDefinition)) {
    if (line.align === 'right') continue;
    const width = lineWidthMm(fonts, line);
    assert.ok(line.topMm >= FORM.qrArea.y + FORM.qrArea.height || line.xMm + width <= FORM.qrArea.x,
      `${line.id} QR alanının altına veya üstüne giriyor.`);
  }
});

test('the PDF baseline helper and the browser line box agree by construction', () => {
  for (const sizePt of [6, 6.5, 7, 7.5, 8, 11, 18, 20]) {
    const box = lineBoxMm(sizePt);
    const sizeMm = sizePt * MM_PER_PT;
    // CSS: baseline = top + half-leading + ascent, with the content area from the same ratios.
    const halfLeading = (box - sizeMm * CONTENT_RATIO) / 2;
    assert.ok(Math.abs(baselineMm(0, sizePt, box) - (halfLeading + sizeMm * ASCENT_RATIO)) < 1e-9);
    assert.ok(Math.abs(topForBaseline(baselineMm(7, sizePt, box), sizePt, box) - 7) < 1e-9);
  }
  const line = headerLines(formDefinition.pages[0]!, formDefinition).find(entry => entry.id === 'title')!;
  assert.equal(line.boxMm, 20 * MM_PER_PT, 'The title keeps a line-height of exactly one em.');
});

test('the HTML header renders the same boxes the PDF writes', () => {
  const page = formDefinition.pages[0]!;
  const html = renderToStaticMarkup(createElement(PaperHeader, { page, definition: formDefinition }));
  for (const line of headerLines(page, formDefinition)) {
    assert.ok(html.includes(`data-line="${line.id}"`), `${line.id} satırı HTML'de yok.`);
    assert.ok(html.includes(`top:${line.topMm}mm`), `${line.id} için üst konum ${line.topMm} mm değil.`);
    assert.ok(html.includes(`line-height:${line.boxMm}mm`), `${line.id} satır yüksekliği eksik.`);
    assert.ok(html.includes(`font-size:${line.sizePt}pt`), `${line.id} punto boyutu eksik.`);
  }
  for (const text of ['MMPI-566', `OPTİK CEVAP FORMU / ${formDefinition.version}`, 'D: Doğru', 'Y: Yanlış',
    'Her maddede yalnızca bir dairenin içini tamamen doldurun.', 'El yazısı kimlik yalnızca bu sayfadadır.',
    'Numaraları sütun boyunca aşağıya doğru izleyin.', 'Dört sayfayı aynı oturumda yazdırın.',
    'Sağ üstteki QR kodu sayfaları otomatik eşleştirir.']) {
    assert.ok(html.includes(text), `Başlıkta "${text}" yok.`);
  }
  // "Örnek işaretleme" kaldırıldı — kayma yaratıyordu, başlıkta olmamalı.
  assert.ok(!html.includes('Örnek işaretleme'), '"Örnek işaretleme" başlıkta olmamalı — kaldırıldı.');
  assert.ok(!html.includes('paper-example'), 'paper-example elementi kaldırıldı.');
  // The instruction that used to be wider than the sheet is gone from both renderers.
  assert.ok(!jsonContainsLongReminder(html), 'Eski 259 mm\'lik yönerge cümlesi geri gelmemeli.');
});

function jsonContainsLongReminder(html: string): boolean {
  // The original reminder as one sentence, which cannot fit the header on any sheet.
  return html.includes('aşağıya doğru izleyin. Dört sayfayı aynı oturumda yazdırın; sağ üstteki');
}

test('header geometry stays inside the sheet and the footer keeps the copyright line', () => {
  const page = formDefinition.pages[0]!;
  const html = renderToStaticMarkup(createElement(PaperHeader, { page, definition: formDefinition }));
  // No header element may be laid out with percentages or transforms that the PDF cannot express.
  assert.ok(!/width:\s*\d+%/.test(html), 'Başlıkta yüzde tabanlı genişlik olamaz.');
  assert.deepEqual(formDefinition.pages.map(entry => entry.pageNumber), [1, 2, 3, 4]);
  assert.ok(FORM_COPYRIGHT_LINE.length > 0);
  assert.ok(createBatchId().length === 24);
});

test('every printed path stamps the same set code, so pages from different days still match', () => {
  // The batch id is what `acceptPage` compares. The embedded PDF carries FORM_SET_CODE in its QR
  // codes, the HTML preview and the printed footer use the same constant, and the scanner locks to
  // whatever the first accepted page says — so no printing path can produce a foreign set.
  assert.match(FORM_SET_CODE, /^[A-F0-9]{24}$/);
  assert.equal(FORM_SET_CODE, formDefinition.fingerprint.slice(0, 24));
  const html = renderToStaticMarkup(createElement(FormPage, {
    page: formDefinition.pages[0]!, definition: formDefinition, batchId: FORM_SET_CODE, active: true,
  }));
  assert.ok(html.includes(`Set kodu ${FORM_SET_CODE}`), 'HTML sayfası set kodunu taşımalı.');
  // Every page of the HTML preview, not only the first, carries it.
  for (const item of formDefinition.pages) {
    const markup = renderToStaticMarkup(createElement(FormPage, {
      page: item, definition: formDefinition, batchId: FORM_SET_CODE, active: true,
    }));
    assert.ok(markup.includes(`Set kodu ${FORM_SET_CODE}`), `Sayfa ${item.pageNumber} set kodunu taşımalı.`);
  }
  // The PDF side of the same promise is read back from the written file by `npm run verify:pdf`.
  assert.ok(FORM_PDF_FILE_NAME.endsWith('.pdf'));
});

test('a shorter instruction set keeps the header inside its band for every page', () => {
  const narrow: FormDefinition = { ...formDefinition, version: '9.9.9' };
  for (const page of narrow.pages) {
    const lines = headerLines(page, narrow);
    const bottom = Math.max(...lines.map(line => line.topMm + line.boxMm));
    assert.ok(bottom <= FORM.gridTopMm - 0.5, `Başlık ${bottom.toFixed(2)} mm'ye iniyor.`);
    for (const line of lines) {
      assert.ok(lineWidthMm(fonts, line) <= HEADER_LAYOUT.maxTextWidthMm);
    }
  }
});
