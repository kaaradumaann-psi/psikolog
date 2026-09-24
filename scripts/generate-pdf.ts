import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { formDefinition } from '../src/omr/formDefinition';
import { renderFormPdf } from '../src/print/renderFormPdf';
import { readPrintFonts } from './printFonts';

/**
 * Writes the printable answer sheet. Geometry comes from the same FormDefinition
 * the OMR reader uses, so the printed bubble centres cannot drift from the scanner.
 */
const target = process.argv[2] ?? fileURLToPath(new URL('../MMPI-566-optik-cevap-formu.pdf', import.meta.url));
// A blank template needs a stable set id so the committed sheet is reproducible;
// the app's own print flow passes a fresh createBatchId() per session instead.
const batchId = process.argv[3] ?? formDefinition.fingerprint.slice(0, 24);
const faces = await readPrintFonts();
const { bytes, pages } = await renderFormPdf(formDefinition, batchId, faces);
await writeFile(target, bytes);
console.log(`${target}`);
console.log(`${pages} sayfa · A4 dikey · ${(bytes.length / 1024).toFixed(0)} KB · baskı seti ${batchId}`);
console.log('Yazdırma: A4, dikey, %100 (gerçek boyut), kenar boşluğu yok, tek yüz.');
