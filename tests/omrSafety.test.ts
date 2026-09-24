import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePage } from '../src/omr/analyzePage';
import { detectAlignmentMarks } from '../src/omr/alignmentDetector';
import { formDefinition } from '../src/omr/formDefinition';
import { assessImageQuality, toGrayscale } from '../src/omr/imageQuality';
import { detectItemMarks, measureResponse } from '../src/omr/markDetector';
import { warpPerspective } from '../src/omr/perspectiveCorrection';
import type { GrayImage, PixelImage, ResponseArea } from '../src/omr/omrTypes';
import type { PageReadResult } from '../src/results/scanResultTypes';
import { blurSynthetic, renderSyntheticPage, SYNTHETIC_MARGIN } from './fixtures/omrSynthetic';

const page = formDefinition.pages[0]!;
const sourceTransform = [6, 0, SYNTHETIC_MARGIN - .5, 0, 6, SYNTHETIC_MARGIN - .5, 0, 0, 1] as const;

function normalized(image: PixelImage) {
  return warpPerspective(toGrayscale(image), [...sourceTransform], 210, 297);
}

function rejected(result: PageReadResult) {
  assert.equal(result.ok, false, 'Damaged scenes must not expose automatic answers');
  assert.ok(!('items' in result));
  assert.ok(!('normalized' in result));
}

/** Hybrid quality: a damaged scene may be accepted for review, but never as `reliable`. */
function noAutomaticAnswers(result: PageReadResult) {
  if (!result.ok) {
    rejected(result);
    return;
  }
  assert.equal(result.quality.ok, false);
  assert.ok(result.items.every(item => item.status !== 'reliable'), 'Damaged scenes must not produce reliable answers');
}

function paint(image: PixelImage, area: ResponseArea, inner: number, outer: number, value: number, offsetY = 0) {
  const cx = SYNTHETIC_MARGIN + (area.x + area.width / 2) * 6;
  const cy = SYNTHETIC_MARGIN + (area.y + area.height / 2 + offsetY) * 6;
  for (let y = Math.max(0, Math.floor(cy - outer * 6)); y < Math.min(image.height, Math.ceil(cy + outer * 6)); y++) {
    for (let x = Math.max(0, Math.floor(cx - outer * 6)); x < Math.min(image.width, Math.ceil(cx + outer * 6)); x++) {
      const radius = Math.hypot(x + .5 - cx, y + .5 - cy) / 6;
      if (radius < inner || radius > outer) continue;
      const at = (y * image.width + x) * 4;
      image.data[at] = image.data[at + 1] = image.data[at + 2] = value;
    }
  }
}

test('safety: oversized ink or an opaque patch cannot become a blank or a reliable opposing choice', async () => {
  const clean = normalized(renderSyntheticPage());
  const quality = assessImageQuality(clean, page, 6);
  assert.equal(quality.ok, true);
  for (const value of [0, 20, 135]) {
    const image = renderSyntheticPage({ marks: [{ itemNumber: 1, choiceId: 'D', kind: 'strong' }] });
    paint(image, page.items[0]!.responseAreas[1]!, 0, 2.9, value);
    const canonical = normalized(image);
    const item = detectItemMarks(canonical, page.items[0]!, quality);
    assert.equal(item.status, 'invalid');
    assert.equal(item.choiceId, null);
    assert.equal(item.confidence, 0);
    assert.ok(measureResponse(canonical, page.items[0]!.responseAreas[1]!).darkness > .4);
    assert.equal(assessImageQuality(canonical, page, 6).ok, false);
    noAutomaticAnswers(await analyzePage(image, formDefinition));
  }
});

test('safety: peripheral annular ink is review evidence, not blank or an automatically selected answer', async () => {
  for (const opposingMark of [false, true]) {
    const image = renderSyntheticPage({ marks: opposingMark ? [{ itemNumber: 1, choiceId: 'D', kind: 'strong' }] : [] });
    paint(image, page.items[0]!.responseAreas[1]!, 1.02, 1.58, 20);
    const result = await analyzePage(image, formDefinition);
    assert.ok(result.ok, result.ok ? '' : result.message);
    assert.equal(result.items[0]!.status, 'ambiguous');
    assert.equal(result.items[0]!.choiceId, null);
    assert.ok(result.items.slice(1).every(item => item.status === 'blank'));
  }
});

test('safety: every choice and row is checked, including a single formerly unsampled Y outline', async () => {
  for (const removeAll of [false, true]) {
    const image = renderSyntheticPage();
    for (const item of page.items) {
      if (removeAll || item.itemNumber === 2) paint(image, item.responseAreas[1]!, 0, 2, 248);
    }
    assert.equal(assessImageQuality(normalized(image), page, 6).ok, false);
    noAutomaticAnswers(await analyzePage(image, formDefinition));
  }
});

test('safety: a locally blurred Y outline cannot borrow sharpness from other responses', async () => {
  const image = renderSyntheticPage(), blurred = blurSynthetic(image, 3);
  const area = page.items[1]!.responseAreas[1]!;
  const cx = SYNTHETIC_MARGIN + (area.x + area.width / 2) * 6;
  const cy = SYNTHETIC_MARGIN + (area.y + area.height / 2) * 6;
  for (let y = Math.floor(cy - 18); y <= Math.ceil(cy + 18); y++) {
    for (let x = Math.floor(cx - 18); x <= Math.ceil(cx + 18); x++) {
      const at = (y * image.width + x) * 4;
      image.data.set(blurred.data.subarray(at, at + 4), at);
    }
  }
  assert.equal(assessImageQuality(normalized(image), page, 6).ok, false);
  noAutomaticAnswers(await analyzePage(image, formDefinition));
});

test('safety: a local one-pitch warp cannot become the next item\'s automatic answer', async () => {
  const image = renderSyntheticPage();
  const column = page.items.filter(item => item.columnIndex === 0);
  for (const item of column) for (const area of item.responseAreas) paint(image, area, 0, 2, 248);
  for (const item of column) {
    const r = item.rowIndex;
    const shift = 4.25 * Math.max(0, Math.min(1, (r - 12) / 4, (32 - r) / 4));
    for (const area of item.responseAreas) {
      paint(image, area, 1.625, 1.875, 30, shift);
      if (item.itemNumber === 20 && area.choiceId === 'D') paint(image, area, 0, 1.22, 20, shift);
    }
  }
  const canonical = normalized(image), quality = assessImageQuality(canonical, page, 6);
  assert.equal(quality.ok, false);
  assert.ok(quality.reasons.length > 0);
  assert.notEqual(detectItemMarks(canonical, page.items[20]!, quality).status, 'reliable');
  const warped = await analyzePage(image, formDefinition);
  noAutomaticAnswers(warped);
  if (warped.ok) assert.notEqual(warped.items[20]!.status, 'reliable');
});

test('safety: same-area circular blobs cannot replace the four square markers', async () => {
  const image = renderSyntheticPage({ missingMarkers: page.alignmentMarks.map(mark => mark.id) });
  for (const mark of page.alignmentMarks) {
    paint(image, { ...mark, responseId: mark.id, choiceId: '', label: '' }, 0, Math.sqrt(25 / Math.PI), 12);
  }
  assert.equal(detectAlignmentMarks(toGrayscale(image), page.alignmentMarks, [sourceTransform], { x: 177, y: 31 }), null);
  rejected(await analyzePage(image, formDefinition));
  assert.equal(detectAlignmentMarks(toGrayscale(renderSyntheticPage()), page.alignmentMarks, [sourceTransform], { x: 177, y: 31 })?.length, 4);
});

test('safety: inward CSS borders with raster interpolation stay blank while strong centres remain readable', () => {
  // Independent raster model of border-box circles: .3 mm inward border, not the fixture's centred stroke.
  for (const ppm of [4, 6, 8, 10]) for (const phase of [.15, .65]) {
    const margin = 16 + phase;
    const source: GrayImage = { width: Math.ceil(210 * ppm + 34), height: Math.ceil(297 * ppm + 34), data: new Uint8Array(0) };
    source.data = new Uint8Array(source.width * source.height).fill(255);
    for (const item of page.items) for (const area of item.responseAreas) {
      const cx = margin + (area.x + area.width / 2) * ppm, cy = margin + (area.y + area.height / 2) * ppm;
      const radius = area.width / 2 * ppm;
      for (let y = Math.floor(cy - radius - 1); y <= Math.ceil(cy + radius + 1); y++) {
        for (let x = Math.floor(cx - radius - 1); x <= Math.ceil(cx + radius + 1); x++) {
          const distance = Math.hypot(x + .5 - cx, y + .5 - cy);
          const outer = Math.max(0, Math.min(1, radius + .5 - distance));
          const inner = Math.max(0, Math.min(1, radius - .3 * ppm + .5 - distance));
          let coverage = outer - inner;
          if (item.itemNumber === 1 && area.choiceId === 'D') coverage = Math.max(coverage, Math.max(0, Math.min(1, 1.22 * ppm + .5 - distance)));
          source.data[y * source.width + x] = Math.round(255 * (1 - coverage));
        }
      }
    }
    const canonical = warpPerspective(source, [ppm, 0, margin - .5, 0, ppm, margin - .5, 0, 0, 1], 210, 297);
    const quality = assessImageQuality(canonical, page, ppm);
    assert.ok(quality.ok, `${ppm} px/mm, phase ${phase}: ${JSON.stringify(quality)}`);
    const results = page.items.map(item => detectItemMarks(canonical, item, quality));
    assert.equal(results[0]!.choiceId, 'D');
    assert.ok(['single', 'reliable'].includes(results[0]!.status));
    assert.ok(results.slice(1).every(item => item.status === 'blank'), `${ppm} px/mm, phase ${phase}: false ink from printed borders`);
  }
});
