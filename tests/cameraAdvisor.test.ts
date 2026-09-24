import assert from 'node:assert/strict';
import test from 'node:test';
import { adviseCameraFrame, detectPageBox, hintLabel, pageBoxCorners } from '../src/scanner/cameraAdvisor';
import type { GrayImage } from '../src/omr/omrTypes';

function makeImage(width: number, height: number, fill: (x: number, y: number) => number): GrayImage {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data[y * width + x] = fill(x, y);
  return { width, height, data };
}

test('rejects a too-small preview without crashing', () => {
  const image = makeImage(40, 40, () => 200);
  const result = adviseCameraFrame(image);
  assert.equal(result.pageDetected, false);
  assert.equal(result.hint, 'no-page');
});

test('flags a too-dark frame with a clear hint', () => {
  const image = makeImage(240, 180, () => 30);
  const result = adviseCameraFrame(image);
  assert.equal(result.hint, 'too-dark');
  assert.ok(hintLabel(result.hint).includes('aydınlık'), 'Turkish hint should mention aydınlık');
});

test('flags a too-bright frame', () => {
  const image = makeImage(240, 180, () => 250);
  const result = adviseCameraFrame(image);
  assert.equal(result.hint, 'too-bright');
});

test('detects an A4-ish bright rectangle on a dark background', () => {
  // Dark desk + A4 portrait sheet (white) in the centre.
  const image = makeImage(240, 320, (x, y) => {
    const left = 60, right = 180, top = 50, bottom = 290;
    return (x >= left && x <= right && y >= top && y <= bottom) ? 230 : 30;
  });
  const result = adviseCameraFrame(image);
  assert.equal(result.pageDetected, true, 'page should be detected');
  assert.ok(result.pageBox, 'page box should be present');
  assert.equal(result.hint, 'page-detected');
});

test('returns no-page hint when there is no sheet-shaped cluster', () => {
  const image = makeImage(240, 180, (x, y) => (x + y) % 2 ? 200 : 50);
  const result = adviseCameraFrame(image);
  assert.equal(result.pageDetected, false);
});

test('pageBoxCorners returns the four corners in TL/TR/BR/BL order', () => {
  const box = { x: 10, y: 20, width: 100, height: 200 };
  const corners = pageBoxCorners(box);
  assert.deepEqual(corners, [
    { x: 10, y: 20 },
    { x: 110, y: 20 },
    { x: 110, y: 220 },
    { x: 10, y: 220 },
  ]);
});

test('detectPageBox returns null on a fully-flat image', () => {
  const image = makeImage(240, 180, () => 220);
  assert.equal(detectPageBox(image), null);
});
