import assert from 'node:assert/strict';
import test from 'node:test';
import { applyEnhancement, ENHANCEMENT_MODES, binarize, enhanceLocal, stretchContrast } from '../src/scanner/enhancement';
import type { GrayImage } from '../src/omr/omrTypes';

function makeImage(width: number, height: number, fill: (x: number, y: number) => number): GrayImage {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data[y * width + x] = fill(x, y);
  return { width, height, data };
}

test('original mode returns a defensive clone with identical content', () => {
  const image = makeImage(40, 40, () => 200);
  const result = applyEnhancement(image, 'original');
  assert.notEqual(result.data, image.data);
  assert.deepEqual([...result.data], [...image.data]);
});

test('contrast stretch maps the 1st/99th percentile to 0 and 255', () => {
  const image = makeImage(64, 64, (x, y) => Math.round(100 + (x * y) % 80));
  const result = stretchContrast(image);
  // The brightest and darkest pixels must reach the extremes.
  const max = Math.max(...result.data), min = Math.min(...result.data);
  assert.equal(max, 255, `max should reach 255, got ${max}`);
  assert.equal(min, 0, `min should reach 0, got ${min}`);
});

test('local enhancement preserves dimensions and does not increase dynamic range above 255', () => {
  const image = makeImage(128, 128, (x, y) => ((x + y) * 13) % 256);
  const result = enhanceLocal(image);
  assert.equal(result.width, image.width);
  assert.equal(result.height, image.height);
  for (let i = 0; i < result.data.length; i++) {
    assert.ok(result.data[i]! <= 255, `byte overflow at ${i}: ${result.data[i]}`);
  }
});

test('Sauvola binarisation yields only two levels', () => {
  const image = makeImage(64, 64, (x, y) => ((x * y * 7) + 30) % 250);
  const result = binarize(image);
  const seen = new Set<number>();
  for (let i = 0; i < result.data.length; i++) seen.add(result.data[i]!);
  assert.ok(seen.size <= 2, `expected ≤2 levels, got ${seen.size}: ${[...seen].join(',')}`);
});

test('OMR mode produces a sharper, shadow-flattened image', () => {
  // Gradient background (simulated shadow) + small dark mark in the centre.
  const image = makeImage(320, 240, (x, y) => Math.max(40, Math.round(200 - 0.4 * x - 0.3 * y)));
  for (let y = 115; y < 125; y++) for (let x = 155; x < 165; x++) image.data[y * 320 + x] = 20;
  const result = applyEnhancement(image, 'omr');
  assert.equal(result.width, image.width);
  // The background should be flattened: extreme corners should be much closer than in the input.
  const corners = [image.data[0]!, image.data[319]!, image.data[(239 * 320)]!, image.data[(239 * 320) + 319]!];
  const originalRange = Math.max(...corners) - Math.min(...corners);
  const resultCorners = [result.data[0]!, result.data[319]!, result.data[(239 * 320)]!, result.data[(239 * 320) + 319]!];
  const resultRange = Math.max(...resultCorners) - Math.min(...resultCorners);
  assert.ok(resultRange < originalRange, `range should shrink: input=${originalRange}, omr=${resultRange}`);
});

test('every named mode is exposed and returns the same dimensions', () => {
  const image = makeImage(80, 80, (x, y) => ((x + y) * 11) % 256);
  for (const mode of ENHANCEMENT_MODES) {
    const result = applyEnhancement(image, mode);
    assert.equal(result.width, image.width, `${mode} width mismatch`);
    assert.equal(result.height, image.height, `${mode} height mismatch`);
  }
});
