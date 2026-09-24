import assert from 'node:assert/strict';
import test from 'node:test';
import { applyManualCorners } from '../src/scanner/manualWarp';
import type { PixelImage } from '../src/omr/omrTypes';

function makeFlatRgba(width: number, height: number, gray = 200): PixelImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = gray; data[i + 1] = gray; data[i + 2] = gray; data[i + 3] = 255;
  }
  return { width, height, data };
}

test('identity-like corners produce a centred normalised page at the expected resolution', () => {
  const source = makeFlatRgba(800, 1000);
  const corners = [
    { x: 100, y: 50 },
    { x: 700, y: 50 },
    { x: 700, y: 950 },
    { x: 100, y: 950 },
  ] as const;
  const result = applyManualCorners({ source, corners, pageWidthMm: 210, pageHeightMm: 297 });
  assert.equal(result.normalized.width, Math.round(210 * 8));
  assert.equal(result.normalized.height, Math.round(297 * 8));
  // The warp on a flat input should remain flat; the centre of the page should be paper-grey.
  const centre = result.normalized.data[(result.normalized.height >> 1) * result.normalized.width + (result.normalized.width >> 1)]!;
  assert.ok(centre > 150, `centre should be paper, got ${centre}`);
});

test('rejects non-finite corners', () => {
  const source = makeFlatRgba(200, 200);
  assert.throws(() => applyManualCorners({
    source,
    corners: [{ x: NaN, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    pageWidthMm: 210, pageHeightMm: 297,
  }), /sonlu/);
});

test('rejects a triangle (two coincident corners)', () => {
  const source = makeFlatRgba(200, 200);
  assert.throws(() => applyManualCorners({
    source,
    corners: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    pageWidthMm: 210, pageHeightMm: 297,
  }), /yakın/);
});

test('rejects a self-intersecting (bowtie) quadrilateral', () => {
  const source = makeFlatRgba(400, 400);
  // TL, BR, TR, BL order → edges cross.
  assert.throws(() => applyManualCorners({
    source,
    corners: [{ x: 50, y: 50 }, { x: 350, y: 350 }, { x: 350, y: 50 }, { x: 50, y: 350 }],
    pageWidthMm: 210, pageHeightMm: 297,
  }), /kesen/);
});

test('rejects a reflected clockwise corner order', () => {
  const source = makeFlatRgba(400, 400);
  assert.throws(() => applyManualCorners({
    source,
    corners: [{ x: 50, y: 50 }, { x: 50, y: 350 }, { x: 350, y: 350 }, { x: 350, y: 50 }],
    pageWidthMm: 210,
    pageHeightMm: 297,
  }), /yansıtılmış|ters sırada/);
});

test('rejects corners that fall outside the source image', () => {
  const source = makeFlatRgba(200, 200);
  assert.throws(() => applyManualCorners({
    source,
    corners: [{ x: -50, y: 0 }, { x: 250, y: 0 }, { x: 250, y: 200 }, { x: -50, y: 200 }],
    pageWidthMm: 210, pageHeightMm: 297,
  }), /dışına/);
});

test('rejects a source whose RGBA buffer is the wrong length', () => {
  const broken = { width: 100, height: 100, data: new Uint8ClampedArray(100) } as unknown as PixelImage;
  assert.throws(() => applyManualCorners({
    source: broken,
    corners: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }],
    pageWidthMm: 210, pageHeightMm: 297,
  }), /RGBA/);
});

test('rotated quadrilateral still produces a clean rectangular page', () => {
  // A sheet rotated 17° in the source frame.
  const source = makeFlatRgba(900, 1100);
  const angle = 17 * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const cx = 450, cy = 550, w = 300, h = 500;
  const corners = [
    { x: cx + (-w / 2) * cos - (-h / 2) * sin, y: cy + (-w / 2) * sin + (-h / 2) * cos },
    { x: cx + ( w / 2) * cos - (-h / 2) * sin, y: cy + ( w / 2) * sin + (-h / 2) * cos },
    { x: cx + ( w / 2) * cos - ( h / 2) * sin, y: cy + ( w / 2) * sin + ( h / 2) * cos },
    { x: cx + (-w / 2) * cos - ( h / 2) * sin, y: cy + (-w / 2) * sin + ( h / 2) * cos },
  ] as const;
  const result = applyManualCorners({ source, corners, pageWidthMm: 210, pageHeightMm: 297 });
  assert.equal(result.normalized.width, Math.round(210 * 8));
  assert.equal(result.normalized.height, Math.round(297 * 8));
  // Every corner of the normalised page should land inside the source frame.
  assert.ok(result.sourceBounds.minX >= 0);
  assert.ok(result.sourceBounds.minY >= 0);
  assert.ok(result.sourceBounds.maxX <= source.width);
  assert.ok(result.sourceBounds.maxY <= source.height);
});
