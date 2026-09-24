/**
 * Real-PDF integration test: rasterises the shipped `MMPI-566-optik-cevap-formu.pdf`, runs the
 * existing OMR pipeline directly, then runs it again through `applyManualCorners` with the same
 * identity quadrilateral, and compares the two answer sets.
 *
 * This is the closest we can get to a "real photo" without a phone in the room: the form is the
 * exact same artifact the production scanner reads in production. Skips silently on platforms
 * where `@napi-rs/canvas` is not prebuilt.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { analyzePage } from '../src/omr/analyzePage';
import { applyManualCorners } from '../src/scanner/manualWarp';
import { formDefinition } from '../src/omr/formDefinition';
import { SCAN_LIMITS } from '../src/scanner/imageIO';
import type { PixelImage, Point } from '../src/omr/omrTypes';

const pdfPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'MMPI-566-optik-cevap-formu.pdf');

type ContextLike = { getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray } };
type CanvasLike = { width: number; height: number; getContext(type: '2d'): ContextLike };
let createCanvas: ((width: number, height: number) => CanvasLike) | undefined;
try { ({ createCanvas } = await import('@napi-rs/canvas')); } catch { createCanvas = undefined; }

async function rasterise(): Promise<PixelImage[]> {
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

test('REAL PDF: identity manual corners keep the same blank read on every page', { skip }, async () => {
  const pages = await rasterise();
  assert.equal(pages.length, formDefinition.pages.length);
  for (const [index, image] of pages.entries()) {
    // (A) The production pipeline, untouched.
    const before = await analyzePage(image, formDefinition);
    assert.equal(before.ok, true, `sayfa ${index + 1} A: ${before.ok ? '' : `${before.code}: ${before.message}`}`);
    // (B) Through applyManualCorners with the identity quadrilateral.
    const corners: [Point, Point, Point, Point] = [
      { x: 0, y: 0 },
      { x: image.width - 1, y: 0 },
      { x: image.width - 1, y: image.height - 1 },
      { x: 0, y: image.height - 1 },
    ];
    const warp = applyManualCorners({
      source: image, corners,
      pageWidthMm: formDefinition.pageWidthMm, pageHeightMm: formDefinition.pageHeightMm,
    });
    const after = await analyzePage({
      ...image, width: warp.normalized.width, height: warp.normalized.height,
      data: rgbaFromGray(warp.normalized),
    }, formDefinition);
    assert.equal(after.ok, true, `sayfa ${index + 1} B: ${after.ok ? '' : `${after.code}: ${after.message}`}`);
    // The PDF is blank; every item must still be blank on both paths.
    assert.equal(before.items.length, after.items.length, `sayfa ${index + 1}: item count diverged`);
    for (let i = 0; i < before.items.length; i++) {
      const a = before.items[i]!; const b = after.items[i]!;
      assert.equal(a.choiceId, b.choiceId,
        `sayfa ${index + 1} madde ${a.itemNumber}: A=${a.choiceId ?? 'null'} B=${b.choiceId ?? 'null'}`);
    }
  }
});

function rgbaFromGray(image: { width: number; height: number; data: Uint8Array }): Uint8ClampedArray {
  const data = new Uint8ClampedArray(image.width * image.height * 4);
  for (let i = 0; i < image.data.length; i++) {
    const value = image.data[i]!;
    data[i * 4] = value; data[i * 4 + 1] = value; data[i * 4 + 2] = value; data[i * 4 + 3] = 255;
  }
  return data;
}
