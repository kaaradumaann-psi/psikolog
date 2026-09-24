import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { analyzePage } from '../src/omr/analyzePage';
import { formDefinition } from '../src/omr/formDefinition';
import type { PixelImage } from '../src/omr/omrTypes';
import { SCAN_LIMITS } from '../src/scanner/imageIO';
import { acceptPage, createScanSet, missingPageNumbers } from '../src/scanner/pageSequence';

const pdfPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'MMPI-566-optik-cevap-formu.pdf');

// Rasterising a PDF needs a canvas, which the browser supplies and Node does not. The suite skips
// rather than fails when this platform has no prebuilt binary; every pure-geometry path stays
// covered by the other test files either way.
type ContextLike = { getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray } };
type CanvasLike = { width: number; height: number; getContext(type: '2d'): ContextLike };
let createCanvas: ((width: number, height: number) => CanvasLike) | undefined;
try { ({ createCanvas } = await import('@napi-rs/canvas')); } catch { createCanvas = undefined; }

/** Rasterises the shipped form exactly as src/scanner/pdfIO.ts does in the browser. */
async function pdfPages(): Promise<PixelImage[]> {
  // The legacy build exposes destroy() on the loading task, not on the document proxy.
  const loading = getDocument({ data: new Uint8Array(readFileSync(pdfPath)), useSystemFonts: true,
    isOffscreenCanvasSupported: false, isImageDecoderSupported: false, maxImageSize: 0, useWorkerFetch: false });
  const document = await loading.promise;
  try {
    const pages: PixelImage[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(SCAN_LIMITS.pdfWidth / base.width, SCAN_LIMITS.longSide / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas!(Math.max(1, Math.round(viewport.width)), Math.max(1, Math.round(viewport.height)));
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport, background: '#ffffff' } as never).promise;
      pages.push({ width: canvas.width, height: canvas.height,
        data: new Uint8ClampedArray(context.getImageData(0, 0, canvas.width, canvas.height).data) });
    }
    return pages;
  } finally { await loading.destroy(); }
}

const skip = createCanvas ? false : '@napi-rs/canvas bu platformda yuklenemedi';

test('the shipped PDF passes the real scanner pipeline on every page', { skip }, async () => {
  const pages = await pdfPages();
  assert.equal(pages.length, formDefinition.pages.length);
  // A rendered PDF is full-bleed: the sheet edge sits on the image border. This is the regression
  // that made every PDF upload fail with "the edges are cut" although the sheet was whole.
  assert.deepEqual(pages.map(page => [page.width, page.height]), Array.from({ length: 4 }, () => [1680, 2376]));
  for (const [index, image] of pages.entries()) {
    const result = await analyzePage(image, formDefinition);
    assert.equal(result.ok, true, `sayfa ${index + 1}: ${result.ok ? '' : `${result.code}: ${result.message}`}`);
    if (result.ok) {
      assert.equal(result.pageNumber, index + 1);
      assert.equal(result.items.length, formDefinition.pages[index]!.items.length);
      // A blank form must read as blank, never as marked.
      assert.deepEqual(result.items.map(item => item.status), Array.from({ length: result.items.length }, () => 'blank'));
    }
  }
});

test('pages of the shipped PDF are accepted one at a time and missing pages stay visible', { skip }, async () => {
  const pages = await pdfPages();
  let scan = createScanSet();
  assert.deepEqual(missingPageNumbers(scan, formDefinition), [1, 2, 3, 4]);
  const accepted: number[] = [];
  for (const image of pages) {
    const result = await analyzePage(image, formDefinition);
    assert.equal(result.ok, true, result.ok ? '' : `${result.code}: ${result.message}`);
    if (!result.ok) continue;
    const decision = acceptPage(scan, result, formDefinition, { sourceName: 'test.pdf', previewUrl: '' });
    assert.equal(decision.ok, true, decision.ok ? '' : decision.message);
    if (!decision.ok) continue;
    scan = decision.state;
    accepted.push(result.pageNumber);
    // Uploading a single page is never a dead end: it is stored and the rest stays listed.
    assert.deepEqual(missingPageNumbers(scan, formDefinition),
      formDefinition.pages.map(page => page.pageNumber).filter(number => !accepted.includes(number)));
  }
  assert.deepEqual(accepted, [1, 2, 3, 4]);
  assert.deepEqual(missingPageNumbers(scan, formDefinition), []);
  assert.equal(scan.clinicalTransferAllowed, false);
  // All four pages carry one printed batch id, so a single upload of the whole PDF stays coherent.
  assert.equal(scan.batchId, formDefinition.fingerprint.slice(0, 24));
});
