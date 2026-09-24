/**
 * BEFORE/AFTER A/B test for the new scanner layer.
 *
 * This is the regression guarantee required by the scanner spec: any change in the new
 * `manualWarp` / overlay / enhancement stack MUST NOT alter the OMR answer set on the canonical
 * pipeline. We render a synthetic page that already has alignment marks, QR symbol and bubble
 * rings (the same fixture the existing OMR tests use — `omrSynthetic`), mark a small set of
 * items, then run:
 *
 *   (A) `analyzePage` on the rendered image (no rotation, no shadow, no warp).
 *   (B) `applyManualCorners` → wrap as PixelImage → `analyzePage` again.
 *
 * Choice comparison is item-for-item: `choiceId` is the actual answer the pipeline returns,
 * `status` is its confidence (`reliable`/`single`/`ambiguous`/etc.) and may legitimately change
 * across a 6 px/mm → 8 px/mm resample — what matters is that the same bubble is read as the
 * same answer, not that the threshold test produces the same confidence label. A change in
 * `choiceId` is a real regression and fails the test loudly.
 *
 * We also test three perspective scenarios (light, medium, rotated) to make sure manual corners
 * still drive a correct result when the source is non-axis-aligned.
 *
 * The test reuses `renderSyntheticPage` + `projectSynthetic` + `SYNTHETIC_BATCH` so any failure
 * here points directly at a behaviour change in `applyManualCorners` — never at the rendering.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { formDefinition } from '../src/omr/formDefinition';
import { analyzePage } from '../src/omr/analyzePage';
import { applyManualCorners } from '../src/scanner/manualWarp';
import {
  projectSynthetic, renderSyntheticPage,
} from './fixtures/omrSynthetic';
import type { SyntheticMark } from './fixtures/omrSynthetic';
import type { PixelImage, Point } from '../src/omr/omrTypes';

const PPM = 6; // matches `renderSyntheticPage` default
const PAGE_W = formDefinition.pageWidthMm * PPM;
const PAGE_H = formDefinition.pageHeightMm * PPM;
// Synthetic fixture pads every side by 32 px (the SYNTHETIC_MARGIN inside `omrSynthetic`).
const MARGIN = 32;

const MARKS_PAGE1: SyntheticMark[] = [
  { itemNumber: 1, choiceId: 'D', kind: 'strong' },
  { itemNumber: 7, choiceId: 'Y', kind: 'strong' },
  { itemNumber: 23, choiceId: 'D', kind: 'strong' },
  { itemNumber: 56, choiceId: 'Y', kind: 'strong' },
];
const MARKS_PAGE2: SyntheticMark[] = [
  { itemNumber: 145, choiceId: 'Y', kind: 'strong' },
  { itemNumber: 200, choiceId: 'D', kind: 'strong' },
  { itemNumber: 250, choiceId: 'D', kind: 'strong' },
];

function isOk<T extends { ok: true } | { ok: false }>(result: T): asserts result is T & { ok: true } {
  assert.equal(result.ok, true, `pipeline failed: ${result.ok ? '' : (result as { code: string; message: string }).message}`);
}

/** Item-by-item diff, choice-only (status may vary across resamples without being a regression). */
function diffChoices(before: readonly { itemNumber: number; choiceId: string | null }[],
  after: readonly { itemNumber: number; choiceId: string | null }[]): string {
  const rows: string[] = [];
  for (let i = 0; i < before.length; i++) {
    const a = before[i]!; const b = after[i]!;
    if (a.choiceId !== b.choiceId) rows.push(`item ${a.itemNumber}: A=${a.choiceId ?? 'null'} B=${b.choiceId ?? 'null'}`);
  }
  return rows.length ? rows.slice(0, 20).join('\n') + (rows.length > 20 ? `\n... and ${rows.length - 20} more` : '') : '(no divergence)';
}

test('A: canonical synthetic page 1 reads without warp', async () => {
  const image = renderSyntheticPage({ pageNumber: 1, marks: MARKS_PAGE1 });
  const result = await analyzePage(image, formDefinition);
  isOk(result);
  const byNumber = new Map(result.items.map(item => [item.itemNumber, item]));
  for (const expected of MARKS_PAGE1.filter(mark => mark.kind === 'strong')) {
    assert.equal(byNumber.get(expected.itemNumber)?.choiceId, expected.choiceId,
      `strong mark on item ${expected.itemNumber} lost: ${JSON.stringify(byNumber.get(expected.itemNumber))}`);
  }
});

test('B/A: identity-corners manual warp keeps the same answers on page 1', async () => {
  const image = renderSyntheticPage({ pageNumber: 1, marks: MARKS_PAGE1 });
  const before = await analyzePage(image, formDefinition);
  isOk(before);

  // The synthetic fixture has SYNTHETIC_MARGIN=32 px on every side; the sheet itself sits at
  // (32..32+1260, 32..32+1782). The user picks those four corners; manualWarp must accept them
  // and produce a normalised A4 that the existing pipeline still reads.
  const corners: [Point, Point, Point, Point] = [
    { x: MARGIN, y: MARGIN },
    { x: MARGIN + PAGE_W - 1, y: MARGIN },
    { x: MARGIN + PAGE_W - 1, y: MARGIN + PAGE_H - 1 },
    { x: MARGIN, y: MARGIN + PAGE_H - 1 },
  ];
  const warp = applyManualCorners({
    source: image, corners, pageWidthMm: formDefinition.pageWidthMm, pageHeightMm: formDefinition.pageHeightMm,
    pixelsPerMm: PPM,
  });
  // Re-wrap the warped grayscale buffer as RGBA, then run the same `analyzePage`.
  const rgba = rgbaFromGray(warp.normalized);
  const after = await analyzePage({ ...image, width: warp.normalized.width, height: warp.normalized.height, data: rgba },
    formDefinition);
  isOk(after);

  assert.equal(before.pageNumber, after.pageNumber, 'page number changed across warp');
  assert.equal(before.batchId, after.batchId, 'batch id changed across warp');
  assert.equal(before.items.length, after.items.length, 'item count diverged');
  for (let i = 0; i < before.items.length; i++) {
    const a = before.items[i]!; const b = after.items[i]!;
    assert.equal(a.itemId, b.itemId, `item id mismatch at index ${i}`);
  }
  // Choice comparison — `status` may differ across resamples without being a regression, but
  // `choiceId` is the answer that goes to scoring and must be byte-stable.
  const beforeChoices = before.items.map(i => ({ itemNumber: i.itemNumber, choiceId: i.choiceId }));
  const afterChoices = after.items.map(i => ({ itemNumber: i.itemNumber, choiceId: i.choiceId }));
  assert.equal(diffChoices(beforeChoices, afterChoices), '(no divergence)',
    `choice diverged:\n${diffChoices(beforeChoices, afterChoices)}`);
  // Spot-check: every strong mark must round-trip with the same choice.
  const byNumber = new Map(after.items.map(item => [item.itemNumber, item]));
  for (const expected of MARKS_PAGE1.filter(mark => mark.kind === 'strong')) {
    assert.equal(byNumber.get(expected.itemNumber)?.choiceId, expected.choiceId,
      `strong mark on item ${expected.itemNumber} lost across manual warp`);
  }
});

test('B/A: identity-corners manual warp keeps the same answers on page 2', async () => {
  const image = renderSyntheticPage({ pageNumber: 2, marks: MARKS_PAGE2 });
  const before = await analyzePage(image, formDefinition);
  isOk(before);
  const corners: [Point, Point, Point, Point] = [
    { x: MARGIN, y: MARGIN }, { x: MARGIN + PAGE_W - 1, y: MARGIN },
    { x: MARGIN + PAGE_W - 1, y: MARGIN + PAGE_H - 1 }, { x: MARGIN, y: MARGIN + PAGE_H - 1 },
  ];
  const warp = applyManualCorners({
    source: image, corners, pageWidthMm: formDefinition.pageWidthMm, pageHeightMm: formDefinition.pageHeightMm,
    pixelsPerMm: PPM,
  });
  const after = await analyzePage({
    ...image, width: warp.normalized.width, height: warp.normalized.height,
    data: rgbaFromGray(warp.normalized),
  }, formDefinition);
  isOk(after);
  const beforeChoices = before.items.map(i => ({ itemNumber: i.itemNumber, choiceId: i.choiceId }));
  const afterChoices = after.items.map(i => ({ itemNumber: i.itemNumber, choiceId: i.choiceId }));
  assert.equal(diffChoices(beforeChoices, afterChoices), '(no divergence)',
    `choice diverged:\n${diffChoices(beforeChoices, afterChoices)}`);
});

test('PERSPECTIVE: light trapezoid reads without warp', async () => {
  const base = renderSyntheticPage({ pageNumber: 1, marks: MARKS_PAGE1 });
  const corners: Point[] = [
    { x: 38, y: 30 },
    { x: base.width - 25, y: 36 },
    { x: base.width - 30, y: base.height - 35 },
    { x: 30, y: base.height - 28 },
  ];
  const { image: skewed } = projectSynthetic(base, base.width, base.height, corners);
  const result = await analyzePage(skewed, formDefinition);
  isOk(result);
  const byNumber = new Map(result.items.map(item => [item.itemNumber, item]));
  for (const expected of MARKS_PAGE1.filter(mark => mark.kind === 'strong')) {
    assert.equal(byNumber.get(expected.itemNumber)?.choiceId, expected.choiceId,
      `light-skew lost strong mark on item ${expected.itemNumber}: ${JSON.stringify(byNumber.get(expected.itemNumber))}`);
  }
});

test('PERSPECTIVE: medium trapezoid via manual corners converges on the same strong marks', async () => {
  const base = renderSyntheticPage({ pageNumber: 1, marks: MARKS_PAGE1 });
  const corners: Point[] = [
    { x: 50, y: 40 },
    { x: base.width - 40, y: 60 },
    { x: base.width - 35, y: base.height - 50 },
    { x: 40, y: base.height - 35 },
  ];
  const { image: skewed } = projectSynthetic(base, base.width, base.height, corners);
  // The user provides the same corners they can see on screen — applyManualCorners must accept
  // them and `analyzePage` must still read every strong mark.
  const warp = applyManualCorners({
    source: skewed, corners: corners as [Point, Point, Point, Point],
    pageWidthMm: formDefinition.pageWidthMm, pageHeightMm: formDefinition.pageHeightMm,
    pixelsPerMm: PPM,
  });
  const after = await analyzePage({
    ...skewed, width: warp.normalized.width, height: warp.normalized.height,
    data: rgbaFromGray(warp.normalized),
  }, formDefinition);
  isOk(after);
  const byNumber = new Map(after.items.map(item => [item.itemNumber, item]));
  for (const expected of MARKS_PAGE1.filter(mark => mark.kind === 'strong')) {
    assert.equal(byNumber.get(expected.itemNumber)?.choiceId, expected.choiceId,
      `medium perspective + manual corners lost strong mark on item ${expected.itemNumber}: ${JSON.stringify(byNumber.get(expected.itemNumber))}`);
  }
});

test('PERSPECTIVE: rotated quadrilateral (5°) via manual corners keeps the strong marks', async () => {
  const base = renderSyntheticPage({ pageNumber: 2, marks: MARKS_PAGE2 });
  // A 5° rotation around the sheet centre. The corners must stay strictly inside the padded
  // synthetic image, so the manual-warp containment check accepts them. We tighten the quad
  // by 70 px on every side to leave headroom for the rotated outer corner.
  const angle = 5 * Math.PI / 180;
  const cx = base.width / 2, cy = base.height / 2;
  const w = PAGE_W - 140, h = PAGE_H - 140;
  const rotate = (px: number, py: number) => ({
    x: cx + (px - cx) * Math.cos(angle) - (py - cy) * Math.sin(angle),
    y: cy + (px - cx) * Math.sin(angle) + (py - cy) * Math.cos(angle),
  });
  const corners: Point[] = [
    rotate(MARGIN + 70, MARGIN + 70),
    rotate(MARGIN + w, MARGIN + 70),
    rotate(MARGIN + w, MARGIN + h),
    rotate(MARGIN + 70, MARGIN + h),
  ];
  const { image: skewed } = projectSynthetic(base, base.width, base.height, corners);
  const warp = applyManualCorners({
    source: skewed, corners: corners as [Point, Point, Point, Point],
    pageWidthMm: formDefinition.pageWidthMm, pageHeightMm: formDefinition.pageHeightMm,
    pixelsPerMm: PPM,
  });
  const after = await analyzePage({
    ...skewed, width: warp.normalized.width, height: warp.normalized.height,
    data: rgbaFromGray(warp.normalized),
  }, formDefinition);
  isOk(after);
  const byNumber = new Map(after.items.map(item => [item.itemNumber, item]));
  for (const expected of MARKS_PAGE2.filter(mark => mark.kind === 'strong')) {
    assert.equal(byNumber.get(expected.itemNumber)?.choiceId, expected.choiceId,
      `rotated + manual corners lost strong mark on item ${expected.itemNumber}: ${JSON.stringify(byNumber.get(expected.itemNumber))}`);
  }
});

test('QUALITY: both paths agree on quality.ok for the canonical synthetic page', async () => {
  const image = renderSyntheticPage({ pageNumber: 1, marks: MARKS_PAGE1 });
  const before = await analyzePage(image, formDefinition);
  isOk(before);
  const corners: [Point, Point, Point, Point] = [
    { x: MARGIN, y: MARGIN }, { x: MARGIN + PAGE_W - 1, y: MARGIN },
    { x: MARGIN + PAGE_W - 1, y: MARGIN + PAGE_H - 1 }, { x: MARGIN, y: MARGIN + PAGE_H - 1 },
  ];
  const warp = applyManualCorners({
    source: image, corners, pageWidthMm: formDefinition.pageWidthMm, pageHeightMm: formDefinition.pageHeightMm,
    pixelsPerMm: PPM,
  });
  const after = await analyzePage({
    ...image, width: warp.normalized.width, height: warp.normalized.height,
    data: rgbaFromGray(warp.normalized),
  }, formDefinition);
  isOk(after);
  // The synthetic fixture is a clean raster → both passes must read `quality.ok === true`.
  assert.equal(before.quality.ok, true, 'baseline quality should be ok');
  assert.equal(after.quality.ok, true, 'manual-warped quality should be ok');
});

/** Wrap a grayscale buffer as RGBA — used when the manual-warp output (a GrayImage) has to be
 *  fed back into `analyzePage`, which only accepts RGBA `PixelImage`. */
function rgbaFromGray(image: { width: number; height: number; data: Uint8Array }): Uint8ClampedArray {
  const data = new Uint8ClampedArray(image.width * image.height * 4);
  for (let i = 0; i < image.data.length; i++) {
    const value = image.data[i]!;
    data[i * 4] = value; data[i * 4 + 1] = value; data[i * 4 + 2] = value; data[i * 4 + 3] = 255;
  }
  return data;
}
