import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeShadows } from '../src/scanner/shadowNormalization';
import type { GrayImage } from '../src/omr/omrTypes';

function makeImage(width: number, height: number, fill: (x: number, y: number) => number): GrayImage {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data[y * width + x] = fill(x, y);
  return { width, height, data };
}

test('returns input unchanged on small images without force', () => {
  const image = makeImage(120, 120, () => 200);
  const result = normalizeShadows(image);
  assert.equal(result, image);
});

test('returns input unchanged on flat backgrounds without force', () => {
  const image = makeImage(640, 480, () => 210);
  const result = normalizeShadows(image);
  // Background is uniform so the estimate matches every pixel and no contrast is removed.
  for (let i = 0; i < image.data.length; i++) {
    assert.equal(result.data[i], image.data[i]);
  }
});

test('flattens a linear gradient shadow when forced', () => {
  // Simulate a phone shadow falling from the top-left (brighter) to the bottom-right (darker).
  const image = makeImage(640, 480, (x, y) => Math.round(220 - 0.2 * x - 0.15 * y));
  const result = normalizeShadows(image, { force: true });
  // Pick sample points across the diagonals. The estimate should be near-uniform after flatten.
  const corners = [[0, 0], [639, 0], [0, 479], [639, 479]].map(([x, y]) => result.data[y * 640 + x]!);
  const range = Math.max(...corners) - Math.min(...corners);
  assert.ok(range < 18, `flattened corners should be close, got range=${range}: ${corners.join(',')}`);
});

test('preserves small high-contrast marks inside the page', () => {
  // Mostly paper; a small dark square in the middle (simulating a printed mark).
  const image = makeImage(640, 480, () => 220);
  const cx = 320, cy = 240;
  for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) image.data[y * 640 + x] = 30;
  const result = normalizeShadows(image, { force: true });
  const center = result.data[cy * 640 + cx];
  assert.ok(center < 60, `centre mark should remain dark, got ${center}`);
  // And the surroundings should still look like paper.
  const around = result.data[100 * 640 + 100];
  assert.ok(around > 180, `surrounding paper should remain bright, got ${around}`);
});

test('handles rectangular (tall) images without overflow', () => {
  const image = makeImage(360, 800, (x, y) => Math.round(210 - 0.2 * y));
  const result = normalizeShadows(image, { force: true });
  const top = result.data[0];
  const bottom = result.data[799 * 360];
  assert.ok(Math.abs(top - bottom) < 18, `top/bottom delta should shrink, got ${Math.abs(top - bottom)}`);
});

test('rejects a too-small image even when forced on a non-existent dimension', () => {
  const image = makeImage(10, 10, () => 200);
  // Force option is allowed but the algorithm must not crash on tiny inputs.
  const result = normalizeShadows(image, { force: true });
  assert.equal(result.data.length, image.data.length);
});
