import { inflateSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
// Node 22 has no Promise.try, which pdfjs-dist 6 requires; the legacy build is the
// documented Node entry point and needs no browser or Poppler.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { COLUMN_WIDTH_MM, FORM } from '../src/omr/formDefinition';
import { formDefinition } from '../src/omr/formDefinition';
import { FORM_COPYRIGHT_LINE } from '../src/form/attribution';
import { FORM_SET_CODE } from '../src/form/formSet';
import { MM_PER_PT } from '../src/print/renderFormPdf';

/**
 * Verifies a printed answer sheet with pdf.js only, no Poppler and no browser:
 * page count, A4 geometry, every printed item number at its defined coordinate,
 * and the handwriting block confined to the first page.
 */
const PT_PER_MM = 1 / MM_PER_PT;
const file = process.argv[2] ?? fileURLToPath(new URL('../MMPI-566-optik-cevap-formu.pdf', import.meta.url));
const raw = new Uint8Array(await readFile(file));
const IDENTITY_LABELS = ['FORM KİMLİĞİ', 'KATILIMCI KODU', 'TARİH'];
/** CSS line box for a 9 pt number inside a 4.25 mm row. */
const CONTENT_RATIO = (1854 + 434) / 2048, ASCENT_RATIO = 1854 / 2048;
const numberBaseline = (rowIndex: number) => {
  const top = FORM.gridTopMm + FORM.gridHeaderMm + rowIndex * FORM.rowPitchMm;
  const sizeMm = 9 * MM_PER_PT;
  return top + (FORM.rowPitchMm - sizeMm * CONTENT_RATIO) / 2 + sizeMm * ASCENT_RATIO;
};

// `raw` is already the whole file; pdf.js transfers the buffer it is given, so hand it a copy.
const loadingTask = getDocument({
  data: new Uint8Array(raw),
  useSystemFonts: true, useWorkerFetch: false, disableAutoFetch: true, stopAtErrors: true,
  isOffscreenCanvasSupported: false, isImageDecoderSupported: false,
});
const document = await loadingTask.promise;

/**
 * The answer bubbles are the OMR-critical geometry, so they are read back out of
 * the written file rather than trusted from the generator: locate each page's
 * content stream, inflate it and recover every stroked circle's centre.
 */
function pageContentStream(pageNumber: number): string {
  const text = Buffer.from(raw).toString('latin1');
  const offsets = new Map<number, number>();
  for (const match of text.matchAll(/(\d+) 0 obj/g)) offsets.set(Number(match[1]), match.index!);
  let pageReference: number | undefined;
  let seen = 0;
  for (const [reference, offset] of offsets) {
    const body = text.slice(offset, offset + 400);
    if (!/\/Type\s*\/Page[^s]/.test(body)) continue;
    if (++seen === pageNumber) { pageReference = reference; break; }
  }
  if (pageReference === undefined) throw new Error(`Sayfa ${pageNumber} nesnesi bulunamadı.`);
  const pageBody = text.slice(offsets.get(pageReference)!);
  const contents = Number(/\/Contents\s+(\d+)\s+0\s+R/.exec(pageBody)?.[1]);
  if (!contents) throw new Error(`Sayfa ${pageNumber} içerik akışı bulunamadı.`);
  const body = text.slice(offsets.get(contents)!);
  const start = body.indexOf('stream\n') + 7, end = body.indexOf('\nendstream');
  const bytes = raw.subarray(offsets.get(contents)! + start, offsets.get(contents)! + end);
  return (/\/FlateDecode/.test(body.slice(0, start)) ? inflateSync(bytes) : Buffer.from(bytes)).toString('latin1');
}

/** Recovers stroked circle centres, in millimetres from the sheet's top-left corner. */
function bubbleCentres(content: string): { x: number; y: number; diameter: number }[] {
  const lines = content.split('\n');
  const found: { x: number; y: number; diameter: number }[] = [];
  let lineWidth = 0;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!.trim();
    const width = /^([\d.]+) w$/.exec(line);
    if (width) { lineWidth = Number(width[1]); continue; }
    const move = /^([\d.-]+) ([\d.-]+) m$/.exec(line);
    if (!move) continue;
    // The four curve endpoints follow the moveTo point; take the bbox of all five
    // so the result does not depend on where the path starts.
    const points = [{ x: Number(move[1]), y: Number(move[2]) }];
    let at = index + 1;
    for (; at < lines.length && points.length < 5; at++) {
      const parts = lines[at]!.trim().split(/\s+/);
      if (parts.length !== 7 || parts[6] !== 'c') break;
      points.push({ x: Number(parts[4]), y: Number(parts[5]) });
    }
    if (points.length !== 5 || lines[at]?.trim() !== 'S') continue;
    const xs = points.map(point => point.x), ys = points.map(point => point.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    found.push({ x: (minX + maxX) / 2, y: FORM.pageHeightMm - (Math.min(...ys) + Math.max(...ys)) / 2,
      diameter: maxX - minX + lineWidth });
  }
  return found;
}

const failures: string[] = [];
const check = (condition: boolean, message: string) => { if (!condition) failures.push(message); };
const setCodes = new Set<string>();
check(document.numPages === formDefinition.totalPages,
  `Sayfa sayısı ${document.numPages}, beklenen ${formDefinition.totalPages}.`);

for (let number = 1; number <= document.numPages; number++) {
  const page = await document.getPage(number);
  const viewport = page.getViewport({ scale: 1 });
  const widthMm = viewport.width * MM_PER_PT, heightMm = viewport.height * MM_PER_PT;
  check(Math.abs(widthMm - formDefinition.pageWidthMm) < .2 && Math.abs(heightMm - formDefinition.pageHeightMm) < .2,
    `Sayfa ${number} A4 değil: ${widthMm.toFixed(1)} × ${heightMm.toFixed(1)} mm.`);

  const content = await page.getTextContent();
  const items = content.items.filter((item): item is { str: string; transform: number[]; width: number } =>
    'str' in item && Array.isArray(item.transform));
  const text = items.map(item => item.str).join(' ');
  const expected = formDefinition.pages.find(candidate => candidate.pageNumber === number)!;

  let matched = 0, worst = 0;
  for (const item of expected.items) {
    const rightMm = FORM.contentLeftMm + item.columnIndex * (COLUMN_WIDTH_MM + FORM.columnGapMm) + 12;
    const wantedX = rightMm * PT_PER_MM, wantedY = (formDefinition.pageHeightMm - numberBaseline(item.rowIndex)) * PT_PER_MM;
    const hit = items.find(candidate => candidate.str === String(item.itemNumber) &&
      Math.abs(candidate.transform[5]! - wantedY) < 2.5 &&
      Math.abs(candidate.transform[4]! + candidate.width - wantedX) < 2.5);
    if (hit) {
      matched++;
      worst = Math.max(worst, Math.abs(hit.transform[5]! - wantedY), Math.abs(hit.transform[4]! + hit.width - wantedX));
    }
  }
  check(matched === expected.items.length,
    `Sayfa ${number}: ${expected.items.length} madde numarasından yalnızca ${matched} tanesi tanımlı koordinatında bulundu.`);

  const identity = IDENTITY_LABELS.filter(label => text.includes(label));
  check(number === 1 ? identity.length === IDENTITY_LABELS.length : identity.length === 0,
    number === 1 ? `Sayfa 1 kimlik alanları eksik: ${identity.join(', ')}`
      : `Sayfa ${number} kimlik alanı içeriyor: ${identity.join(', ')}`);
  check(text.includes(`${expected.firstItem}\u2013${expected.lastItem}. maddeler`),
    `Sayfa ${number} madde aralığı etiketi bulunamadı.`);
  check(text.includes(`Sayfa ${number} / ${formDefinition.totalPages}`),
    `Sayfa ${number} alt bilgi sayfa numarası bulunamadı.`);
  const hasCopyright = text.includes(FORM_COPYRIGHT_LINE);
  check(hasCopyright, `Sayfa ${number} alt bilgi telif satırı (${FORM_COPYRIGHT_LINE}) bulunamadı.`);
  // The set code is printed on paper so four sheets of one set can be checked by eye. It is also
  // what the QR encodes and what the scanner compares, so it has to be present and identical.
  const setCode = /Set kodu ([A-F0-9]{24})/.exec(text)?.[1];
  check(!!setCode, `Sayfa ${number} alt bilgisinde set kodu bulunamadı.`);
  if (setCode) setCodes.add(setCode);

  const circles = bubbleCentres(pageContentStream(number));
  const wanted = expected.items.flatMap(item => item.responseAreas.map(area =>
    ({ x: area.x + area.width / 2, y: area.y + area.height / 2, diameter: area.width })));
  let bubbles = 0, bubbleDrift = 0;
  for (const area of wanted) {
    const hit = circles.find(circle => Math.abs(circle.x - area.x) < .05 &&
      Math.abs(circle.y - area.y) < .05 && Math.abs(circle.diameter - area.diameter) < .05);
    if (hit) { bubbles++; bubbleDrift = Math.max(bubbleDrift, Math.abs(hit.x - area.x), Math.abs(hit.y - area.y)); }
  }
  check(bubbles === wanted.length,
    `Sayfa ${number}: ${wanted.length} işaretleme dairesinden yalnızca ${bubbles} tanesi dosyada tanımlı konumunda.`);
  console.log(`Sayfa ${number}: A4, ${matched}/${expected.items.length} madde numarası doğru koordinatta ` +
    `(en büyük sapma ${worst.toFixed(2)} pt = ${(worst * MM_PER_PT).toFixed(3)} mm), ` +
    `telif satırı ${hasCopyright ? 'var' : 'yok'}, ` +
    `kimlik alanı ${identity.length ? 'var' : 'yok'}, ` +
    `${bubbles}/${wanted.length} işaretleme dairesi yerinde (en büyük sapma ${bubbleDrift.toFixed(3)} mm).`);
  page.cleanup();
}
await loadingTask.destroy();

check(setCodes.size === 1, `Sayfalar farklı set kodları taşıyor: ${[...setCodes].join(', ')}.`);
const [printedSetCode] = [...setCodes];
check(printedSetCode === FORM_SET_CODE,
  `Basılı set kodu ${printedSetCode ?? 'yok'}, uygulamanın kullandığı kod ${FORM_SET_CODE} değil.`);
const totalItems = formDefinition.pages.reduce((count, page) => count + page.items.length, 0);
check(totalItems === FORM.totalItems, `Toplam madde ${totalItems}, beklenen ${FORM.totalItems}.`);
if (failures.length) {
  console.error('PDF doğrulanamadı:\n' + failures.map(message => ' - ' + message).join('\n'));
  process.exit(1);
}
console.log(`Set kodu: ${printedSetCode ?? 'yok'} (dört sayfada aynı, QR ile aynı kaynaktan).`);
console.log(`Doğrulandı: ${document.numPages} A4 sayfa, ${totalItems} madde numarası tanımlı koordinatlarında, ` +
  'kimlik alanları yalnızca 1. sayfada.');
