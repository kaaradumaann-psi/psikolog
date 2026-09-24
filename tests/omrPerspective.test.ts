import assert from 'node:assert/strict';
import test from 'node:test';
import { CROP_TOLERANCE_MM, fitHomography, fitSimilarity, inspectPageGeometry, mapPoint, pageCorners, warpPerspective } from '../src/omr/perspectiveCorrection';
import type { Homography } from '../src/omr/perspectiveCorrection';

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

test('synthetic homography recovers known projective mapping, including unseen interior points', () => {
  const known: Homography = [5.9, -.45, 90, .35, 6.2, 52, .00038, -.00021, 1];
  const source = [{ x: 12.5, y: 12.5 }, { x: 197.5, y: 12.5 }, { x: 197.5, y: 284.5 }, { x: 12.5, y: 284.5 }];
  const fitted = fitHomography(source, source.map(point => mapPoint(known, point)));
  for (const point of [...source, { x: 47, y: 69.125 }, { x: 182, y: 268.875 }, { x: 0, y: 0 }]) {
    const actual = mapPoint(fitted, point), expected = mapPoint(known, point);
    assert.ok(Math.hypot(actual.x - expected.x, actual.y - expected.y) < 1e-8);
  }
});

test('synthetic degenerate and non-finite homographies are rejected', () => {
  const line = [0, 1, 2, 3].map(x => ({ x, y: 0 }));
  assert.throws(() => fitHomography(line, pageCorners(20, 30)));
  assert.throws(() => fitHomography(pageCorners(20, 30), line));
  assert.throws(() => fitHomography(line.slice(0, 3), line));
  assert.throws(() => fitHomography([{ x: NaN, y: 0 }, ...line.slice(1)], line));
  assert.throws(() => mapPoint([1, 0, 0, 0, 1, 0, 1, 0, 0], { x: 0, y: 1 }));
});

test('synthetic geometry allows rotation, detects cropping, rejects reflection and extreme perspective', () => {
  const upright: Homography = [6, 0, 32, 0, 6, 32, 0, 0, 1];
  assert.equal(inspectPageGeometry(upright, 210, 297, { width: 1324, height: 1846 }).cropped, false);
  assert.equal(inspectPageGeometry([6, 0, -20, 0, 6, 32, 0, 0, 1], 210, 297, { width: 1324, height: 1846 }).cropped, true);
  const rotated = inspectPageGeometry([0, -6, 1814, 6, 0, 32, 0, 0, 1], 210, 297, { width: 1846, height: 1324 });
  assert.equal(rotated.cropped, false);
  assert.equal(rotated.pixelsPerMm, 6);
  assert.throws(() => inspectPageGeometry([-6, 0, 1300, 0, 6, 32, 0, 0, 1], 210, 297, { width: 1324, height: 1846 }));
  assert.throws(() => inspectPageGeometry([6, 0, 32, 0, 6, 32, .02, 0, 1], 210, 297, { width: 1324, height: 1846 }));
});

test('synthetic full-bleed digital page is not reported as cropped', () => {
  // A rendered PDF or a borderless scan puts the sheet edge exactly on the image border, so the
  // fitted corner lands half a pixel outside it. This is the regression: a fixed 1.5 px margin
  // rejected every such page, even for edge losses of a quarter of a millimetre.
  const fullBleed: Homography = [8, 0, -.5, 0, 8, -.5, 0, 0, 1];
  const page = inspectPageGeometry(fullBleed, 210, 297, { width: 1680, height: 2376 });
  assert.equal(page.cropped, false);
  assert.ok(page.cropOvershootMm < CROP_TOLERANCE_MM, `beklenenden buyuk: ${page.cropOvershootMm}`);
  // 0.25 mm trimmed off every edge leaves all four marks and every answer bubble intact.
  assert.equal(inspectPageGeometry(fullBleed, 210, 297, { width: 1676, height: 2372 }).cropped, false);
  // 8 mm off every edge is a genuinely cut sheet: still rejected, with the loss measured.
  const cut = inspectPageGeometry(fullBleed, 210, 297, { width: 1552, height: 2248 });
  assert.equal(cut.cropped, true);
  assert.ok(cut.cropOvershootMm > 8, `\u00f6l\u00e7\u00fclen kay\u0131p \u00e7ok k\u00fc\u00e7\u00fck: ${cut.cropOvershootMm}`);
});

test('synthetic similarity fit recovers rotation and scale, and extrapolates far better than a projective fit', () => {
  // Known similarity: 6 px/mm, rotated 17 degrees, translated.
  const angle = 17 * Math.PI / 180, cosine = Math.cos(angle), sine = Math.sin(angle), scale = 6;
  const truth: Homography = [scale * cosine, -scale * sine, 620, scale * sine, scale * cosine, 35, 0, 0, 1];
  const symbol = [{ x: 166.31, y: 20.31 }, { x: 187.69, y: 20.31 }, { x: 187.69, y: 41.69 }, { x: 166.31, y: 41.69 }];
  // Sub-pixel corner noise, as produced by a real detector on a resampled photo.
  const noise = [{ x: .9, y: -.6 }, { x: -.5, y: .8 }, { x: .5, y: -1.4 }, { x: -.1, y: .6 }];
  const observed = symbol.map((point, index) => {
    const mapped = mapPoint(truth, point), offset = noise[index]!;
    return { x: mapped.x + offset.x, y: mapped.y + offset.y };
  });
  const similarity = fitSimilarity(symbol, observed);
  // A far corner 254 mm from the symbol: the bounded fit stays near, the free projective fit does not.
  const far = { x: 197.5, y: 284.5 };
  const expected = mapPoint(truth, far);
  const similarityError = distance(mapPoint(similarity, far), expected);
  const projectiveError = distance(mapPoint(fitHomography(symbol, observed), far), expected);
  assert.ok(similarityError < 25, `similarity extrapolation drifted ${similarityError.toFixed(1)} px`);
  assert.ok(projectiveError > 4 * similarityError, `projective fit was unexpectedly stable: ${projectiveError.toFixed(1)} px`);
  // Recovers an exact similarity with no noise, including interior points.
  const exact = fitSimilarity(symbol, symbol.map(point => mapPoint(truth, point)));
  for (const point of [...symbol, { x: 12.5, y: 12.5 }, { x: 105, y: 148.5 }]) {
    const actual = mapPoint(exact, point), wanted = mapPoint(truth, point);
    assert.ok(distance(actual, wanted) < 1e-8);
  }
});

test('synthetic degenerate similarity correspondences are rejected', () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  assert.throws(() => fitSimilarity(square.slice(0, 1), square.slice(0, 1)));
  assert.throws(() => fitSimilarity(square, square.slice(0, 3)));
  assert.throws(() => fitSimilarity(square.map(() => ({ x: 4, y: 4 })), square));
  assert.throws(() => fitSimilarity([{ x: NaN, y: 0 }, ...square.slice(1)], square));
});

test('synthetic inverse warp samples centres bilinearly and bounds output allocation', () => {
  const source = { width: 4, height: 4, data: Uint8Array.from({ length: 16 }, (_, i) => Math.floor(i / 4) * 40 + (i % 4) * 10) };
  const identity: Homography = [1, 0, -.5, 0, 1, -.5, 0, 0, 1];
  assert.deepEqual(warpPerspective(source, identity, 4, 4, 1), source);
  const shifted: Homography = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  assert.deepEqual([...warpPerspective(source, shifted, 2, 2, 1).data], [25, 35, 65, 75]);
  assert.throws(() => warpPerspective(source, identity, 100_000, 100_000));
  assert.throws(() => warpPerspective(source, identity, 4, 4, 0));
  assert.throws(() => warpPerspective({ ...source, data: new Uint8Array(0) }, identity, 4, 4, 1));
});
