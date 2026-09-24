import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePage } from '../src/omr/analyzePage';
import { formDefinition } from '../src/omr/formDefinition';
import type { PixelImage, ResponseArea } from '../src/omr/omrTypes';
import { renderSyntheticPage, SYNTHETIC_MARGIN } from './fixtures/omrSynthetic';

/**
 * The "slightly crooked handheld photo reads every bubble as belirsiz" regression.
 *
 * A phone lens with motion blur and JPEG/ISO noise smears the printed ring of every bubble into a
 * faint dark annulus that hugs the ring *inside* its border while the circle core stays clean.
 * That band lands exactly in the detector's peripheral evidence window, and the old threshold
 * counted any faint periphery as "silik/silinmiş iz", flooding a whole page with `ambiguous`.
 * Real pencil marks darken the core instead, which the blank-darkness clause still reports; a
 * genuinely dark stray or scribble is far darker than the smear. The detector now demands that
 * periphery reach `strayPeripheralDarkness` before it counts as evidence without core ink.
 */

/** Paints a faint annulus inside every bubble's printed ring, mm from each bubble centre. */
function bubbleBleed(image: PixelImage, innerMm: number, outerMm: number, value: number): PixelImage {
  const ppm = (image.width - SYNTHETIC_MARGIN * 2) / formDefinition.pageWidthMm;
  const data = new Uint8ClampedArray(image.data);
  const paint = (x: number, y: number, v: number) => {
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
    const at = (y * image.width + x) * 4;
    data[at] = data[at + 1] = data[at + 2] = Math.min(v, data[at]!);
  };
  for (const item of formDefinition.pages[0]!.items) for (const area of item.responseAreas) {
    const cx = SYNTHETIC_MARGIN + (area.x + area.width / 2) * ppm;
    const cy = SYNTHETIC_MARGIN + (area.y + area.height / 2) * ppm;
    for (let y = Math.floor(cy - outerMm * ppm - 1); y <= Math.ceil(cy + outerMm * ppm + 1); y++) {
      for (let x = Math.floor(cx - outerMm * ppm - 1); x <= Math.ceil(cx + outerMm * ppm + 1); x++) {
        const r = Math.hypot(x + .5 - cx, y + .5 - cy) / ppm;
        if (r >= innerMm && r <= outerMm) paint(x, y, value);
      }
    }
  }
  return { ...image, data };
}

/** Paints a dark annular scribble on one bubble, strictly inside the evidence band (1.02–1.58 mm). */
function strayAnnulus(image: PixelImage, area: ResponseArea, value: number): PixelImage {
  const ppm = (image.width - SYNTHETIC_MARGIN * 2) / formDefinition.pageWidthMm;
  const data = new Uint8ClampedArray(image.data);
  const cx = SYNTHETIC_MARGIN + (area.x + area.width / 2) * ppm;
  const cy = SYNTHETIC_MARGIN + (area.y + area.height / 2) * ppm;
  for (let y = Math.floor(cy - 1.58 * ppm - 1); y <= Math.ceil(cy + 1.58 * ppm + 1); y++) {
    for (let x = Math.floor(cx - 1.58 * ppm - 1); x <= Math.ceil(cx + 1.58 * ppm + 1); x++) {
      const r = Math.hypot(x + .5 - cx, y + .5 - cy) / ppm;
      if (r >= 1.02 && r <= 1.58) {
        const at = (y * image.width + x) * 4;
        data[at] = data[at + 1] = data[at + 2] = Math.min(value, data[at]!);
      }
    }
  }
  return { ...image, data };
}

function statusOf(result: Awaited<ReturnType<typeof analyzePage>>, itemNumber: number) {
  assert.equal(result.ok, true, result.ok ? '' : `${result.code}: ${result.message}`);
  if (!result.ok) return '';
  return result.items.find(item => item.itemNumber === itemNumber)!.status;
}

test('handheld ring bleed must not turn clean bubbles into ambiguous', async () => {
  const marked = renderSyntheticPage({ marks: [
    { itemNumber: 1, choiceId: 'D', kind: 'strong' },
    { itemNumber: 144, choiceId: 'Y', kind: 'strong' },
  ] });
  const scene = bubbleBleed(marked, 1.05, 1.5, 190);
  const result = await analyzePage(scene, formDefinition);
  assert.equal(result.ok, true, result.ok ? '' : `${result.code}: ${result.message}`);
  if (!result.ok) return;
  assert.equal(result.items.filter(item => item.status === 'ambiguous').length, 0,
    'ring bleed flooded the page with ambiguous readings');
  assert.equal(result.items[0]!.status, 'reliable');
  assert.equal(result.items.at(-1)!.status, 'reliable');
  assert.ok(result.items.slice(1, -1).every(item => item.status === 'blank' && item.choiceId === null));
});

test('handheld ring bleed keeps a faint pencil mark ambiguous without flooding neighbours', async () => {
  const marked = renderSyntheticPage({ marks: [{ itemNumber: 3, choiceId: 'Y', kind: 'faint' }] });
  const scene = bubbleBleed(marked, 1.05, 1.5, 190);
  const result = await analyzePage(scene, formDefinition);
  assert.equal(result.ok, true, result.ok ? '' : `${result.code}: ${result.message}`);
  if (!result.ok) return;
  assert.equal(statusOf(result, 3), 'ambiguous', 'a real faint mark must stay for review');
  assert.equal(result.items.filter(item => item.status === 'ambiguous').length, 1,
    'only the genuinely marked item may stay ambiguous');
});

test('handheld ring bleed keeps an erased opposing trace ambiguous without flooding the page', async () => {
  const marked = renderSyntheticPage({ marks: [
    { itemNumber: 7, choiceId: 'D', kind: 'strong' }, { itemNumber: 7, choiceId: 'Y', kind: 'erased' },
  ] });
  const scene = bubbleBleed(marked, 1.05, 1.5, 190);
  const result = await analyzePage(scene, formDefinition);
  assert.equal(result.ok, true, result.ok ? '' : `${result.code}: ${result.message}`);
  if (!result.ok) return;
  assert.equal(statusOf(result, 7), 'ambiguous');
  assert.equal(result.items.filter(item => item.status === 'ambiguous').length, 1);
});

test('a dark annular stray is still ambiguous, never silently a blank', async () => {
  const marked = renderSyntheticPage({ marks: [{ itemNumber: 1, choiceId: 'D', kind: 'strong' }] });
  for (const value of [150, 20]) {
    const scene = strayAnnulus(marked, formDefinition.pages[0]!.items[1]!.responseAreas[0]!, value);
    const result = await analyzePage(scene, formDefinition);
    assert.equal(result.ok, true, result.ok ? '' : `${result.code}: ${result.message}`);
    if (!result.ok) return;
    assert.equal(statusOf(result, 2), 'ambiguous',
      `a stray of darkness ${value} was downgraded to blank paper`);
  }
});
