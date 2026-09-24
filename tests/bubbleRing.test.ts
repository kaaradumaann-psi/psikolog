import assert from 'node:assert/strict';
import test from 'node:test';
import { formDefinition } from '../src/omr/formDefinition';
import { fitRingCenter, RING_REFINE } from '../src/omr/bubbleRingRefinement';
import { inspectResponse } from '../src/omr/markDetector';
import type { GrayImage } from '../src/omr/omrTypes';

/**
 * Ring refinement regression — mirrors OMRChecker’s auto_align block shift
 * but at bubble granularity, and the “Madde 21” translated-ring problem.
 *
 * OMRChecker’s `core.py: ImageInstanceOps.read_omr_response` shifts each
 * FieldBlock horizontally by searching a vertical morphology signal
 * (Open 2×10 → threshold → iterative left_mean/right_mean).  Here the same
 * idea is applied per bubble using its geometric printed ring:
 *   r(θ) = R + dx·cosθ + dy·sinθ
 * with Huber robust fitting, max |offset| 0.55 mm, RMS ≤0.18 mm,
 * completeness ≥0.60, R ≈1.60 ±0.32 mm.
 *
 * The previous “neighbour mask” fix removes cross-bubble bleed, but cannot
 * fix a bubble’s *own* ring translating inside its measurement band — the
 * Madde 21 case where Y’s ring appears 0.5 mm inside and inner/sentinel
 * reads 0.59/0.48 vs border 0.08 (peripheralEvidence true, blank becomes
 * `ambiguous` when D is marked).
 */

function makeCanonical(width = Math.round(210 * 8), height = Math.round(297 * 8)) {
  return { width, height, data: new Uint8Array(width * height).fill(250) };
}
function paintRing(data: Uint8Array, width: number, height: number, cxMm: number, cyMm: number, ppm = 8, value = 30) {
  const cx = cxMm * ppm, cy = cyMm * ppm, r = 1.75 * ppm;
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const outer = Math.max(0, Math.min(1, r + 0.5 - dist));
      const inner = Math.max(0, Math.min(1, r - 0.3 * ppm + 0.5 - dist));
      const cov = outer - inner;
      if (cov > 0) {
        const idx = y * width + x;
        if (idx >= 0 && idx < data.length) data[idx] = Math.round(250 * (1 - cov) + value * cov);
      }
    }
  }
}
function eraseRing(data: Uint8Array, width: number, height: number, cxMm: number, cyMm: number, ppm = 8) {
  const cx = cxMm * ppm, cy = cyMm * ppm, r = 1.75 * ppm;
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const outer = Math.max(0, Math.min(1, r + 0.5 - dist));
      const inner = Math.max(0, Math.min(1, r - 0.3 * ppm + 0.5 - dist));
      const cov = outer - inner;
      if (cov > 0) {
        const idx = y * width + x;
        if (idx >= 0 && idx < data.length) data[idx] = 250;
      }
    }
  }
}

test('translated blank ring: refinement recovers offset and cancels peripheralEvidence', () => {
  const ppm = 8, width = Math.round(210 * ppm), height = Math.round(297 * ppm);
  const data = new Uint8Array(width * height).fill(250);
  const page = formDefinition.pages[0]!;
  const item21 = page.items.find(i => i.itemNumber === 21)!;
  const target = item21.responseAreas.find(a => a.choiceId === 'Y')!;
  const dArea = item21.responseAreas.find(a => a.choiceId === 'D')!;
  const all = page.items.flatMap(i => i.responseAreas);

  // Paint nominal rings for every bubble
  for (const item of page.items) for (const area of item.responseAreas) {
    paintRing(data, width, height, area.x + area.width / 2, area.y + area.height / 2);
  }
  // Translate Y’s ring by ~0.5 mm inside (Madde 21 geometry)
  const dx = 0.52, dy = -0.31;
  eraseRing(data, width, height, target.x + target.width / 2, target.y + target.height / 2);
  paintRing(data, width, height, target.x + target.width / 2 + dx, target.y + target.height / 2 + dy);
  // Strong D mark (ink at nominal centre, not shifted with the ring)
  {
    const cx = (dArea.x + dArea.width / 2) * ppm, cy = (dArea.y + dArea.height / 2) * ppm;
    for (let y = Math.floor(cy - 1.22 * ppm - 1); y <= Math.ceil(cy + 1.22 * ppm + 1); y++)
      for (let x = Math.floor(cx - 1.22 * ppm - 1); x <= Math.ceil(cx + 1.22 * ppm + 1); x++)
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= 1.22 * ppm) data[y * width + x] = 20;
  }
  const image: GrayImage = { width, height, data };
  // Without refinement Y looks like peripheral evidence (the bug)
  const nominal = inspectResponse(image, target, all);
  assert.equal(nominal.peripheralEvidence, true, 'nominal centre must see the translated ring as peripheral ink');
  assert.equal(nominal.centralEvidence, false);
  // Fit must recover the translation geometrically, not photometrically
  const fit = fitRingCenter(image, target, all);
  assert.equal(fit.ok, true, fit.reason ?? 'fit should be confident on a clean translated ring');
  assert.ok(Math.hypot(fit.dx - dx, fit.dy - dy) < 0.14, `offset error too large: got (${fit.dx.toFixed(2)},${fit.dy.toFixed(2)}) vs (${dx},${dy})`);
  assert.ok(fit.residual < RING_REFINE.maxResidualMm);
  assert.ok(fit.completeness >= RING_REFINE.minCompleteness);
  // With the refined centre the ring falls back into the border band
  const refined = inspectResponse(image, target, all, { centreOffset: { dx: fit.dx, dy: fit.dy } });
  assert.equal(refined.peripheralEvidence, false, 'refined centre must move the ring out of the peripheral band');
  assert.equal(refined.centralEvidence, false);
  // A strong D nearby must NOT be chased — fit must fail gracefully
  const fitD = fitRingCenter(image, dArea, all);
  assert.equal(fitD.ok, false, 'strong ink must not pull the ring centre toward the mark');
  assert.ok(Math.hypot(fitD.dx, fitD.dy) < RING_REFINE.minOffsetMm || !fitD.ok);
  const dInspect = inspectResponse(image, dArea, all);
  assert.equal(dInspect.centralEvidence, true);
});

test('nominal blank ring: refinement stays on nominal centre (no jitter)', () => {
  const ppm = 8, width = Math.round(210 * ppm), height = Math.round(297 * ppm);
  const data = new Uint8Array(width * height).fill(250);
  const page = formDefinition.pages[0]!;
  const all = page.items.flatMap(i => i.responseAreas);
  for (const item of page.items) for (const area of item.responseAreas)
    paintRing(data, width, height, area.x + area.width / 2, area.y + area.height / 2);
  const image: GrayImage = { width, height, data };
  const target = page.items[0]!.responseAreas[0]!;
  const fit = fitRingCenter(image, target, all);
  assert.equal(fit.ok, false, 'a correctly centred ring must not trigger a correction');
  assert.match(fit.reason ?? '', /kayma çok küçük|nominal/i);
});

test('hand-drawn thick annulus inside the bubble is not mistaken for a shifted ring', () => {
  const ppm = 8, width = Math.round(210 * ppm), height = Math.round(297 * ppm);
  const data = new Uint8Array(width * height).fill(250);
  const page = formDefinition.pages[0]!;
  const all = page.items.flatMap(i => i.responseAreas);
  for (const item of page.items) for (const area of item.responseAreas)
    paintRing(data, width, height, area.x + area.width / 2, area.y + area.height / 2);
  const target = page.items[0]!.responseAreas[1]!;
  // Thick annular scribble 1.02–1.58 mm (safety test) — must remain peripheralEvidence
  const cx = (target.x + target.width / 2) * ppm, cy = (target.y + target.height / 2) * ppm;
  for (let y = Math.floor(cy - 1.58 * ppm - 1); y <= Math.ceil(cy + 1.58 * ppm + 1); y++)
    for (let x = Math.floor(cx - 1.58 * ppm - 1); x <= Math.ceil(cx + 1.58 * ppm + 1); x++) {
      const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / ppm;
      if (r >= 1.02 && r <= 1.58) data[y * width + x] = 20;
    }
  const image: GrayImage = { width, height, data };
  const fit = fitRingCenter(image, target, all);
  assert.equal(fit.ok, false, 'thick annular ink must not be reinterpreted as a shifted printed ring');
  const insp = inspectResponse(image, target, all);
  assert.equal(insp.peripheralEvidence, true, 'thick annulus must remain safety evidence → ambiguous');
});

test('OMRChecker auto_align analogy: ring fit never follows darkest pixel', () => {
  // Strong D at (0,0) vs blank Y nearby — the darkest pixel is at D, but Y’s ring is at Y.
  // The geometric fit for Y must not “snap” to D’s ink even though D is far darker.
  const ppm = 8, width = Math.round(210 * ppm), height = Math.round(297 * ppm);
  const data = new Uint8Array(width * height).fill(250);
  const page = formDefinition.pages[0]!;
  const item = page.items[0]!;
  const areaD = item.responseAreas.find(a => a.choiceId === 'D')!;
  const areaY = item.responseAreas.find(a => a.choiceId === 'Y')!;
  const all = page.items.flatMap(i => i.responseAreas);
  for (const a of [areaD, areaY]) paintRing(data, width, height, a.x + a.width / 2, a.y + a.height / 2);
  // Strong D ink
  {
    const cx = (areaD.x + areaD.width / 2) * ppm, cy = (areaD.y + areaD.height / 2) * ppm;
    for (let y = Math.floor(cy - 1.22 * ppm - 1); y <= Math.ceil(cy + 1.22 * ppm + 1); y++)
      for (let x = Math.floor(cx - 1.22 * ppm - 1); x <= Math.ceil(cx + 1.22 * ppm + 1); x++)
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= 1.22 * ppm) data[y * width + x] = 12;
  }
  const image: GrayImage = { width, height, data };
  const fitY = fitRingCenter(image, areaY, all);
  // Y is blank and correctly centred → no correction
  assert.equal(fitY.ok, false);
  // Even if Y’s ring were faintly bleeded toward D, the fit must stay within the
  // search budget and never jump 16 mm to the neighbouring bubble.
  assert.ok(Math.hypot(fitY.dx, fitY.dy) < RING_REFINE.maxOffsetMm);
});

test('2.06 mm mixed translation (C-series residual) is recovered without chasing the neighbour', () => {
  // C-series NOT_FOUND rings sit at 1.75–2.50 mm with a lateral component, not a
  // pure row-pitch slide.  A purely-vertical 2.1 mm slide clips the far arc
  // against the next-row disc and can land at 67% completeness; the measured
  // residuals do not look like that.
  const ppm = 8, width = Math.round(210 * ppm), height = Math.round(297 * ppm);
  const data = new Uint8Array(width * height).fill(250);
  const page = formDefinition.pages[0]!;
  const item = page.items.find(i => i.itemNumber === 21)!;
  const target = item.responseAreas.find(a => a.choiceId === 'Y')!;
  const all = page.items.flatMap(i => i.responseAreas);
  for (const area of all) paintRing(data, width, height, area.x + area.width / 2, area.y + area.height / 2);
  const dx = -1.00, dy = 1.80;
  eraseRing(data, width, height, target.x + target.width / 2, target.y + target.height / 2);
  paintRing(data, width, height, target.x + target.width / 2 + dx, target.y + target.height / 2 + dy);
  const image: GrayImage = { width, height, data };
  const fit = fitRingCenter(image, target, all);
  assert.equal(fit.ok, true, fit.reason ?? '2.06 mm translated ring must be recovered');
  assert.ok(Math.hypot(fit.dx - dx, fit.dy - dy) < 0.30, `offset error (${fit.dx.toFixed(2)},${fit.dy.toFixed(2)}) vs (${dx},${dy})`);
  const neighbour = page.items.find(i => i.itemNumber === 22)!.responseAreas.find(a => a.choiceId === 'Y')!;
  const distToNeighbour = Math.hypot(
    (target.x + target.width / 2 + fit.dx) - (neighbour.x + neighbour.width / 2),
    (target.y + target.height / 2 + fit.dy) - (neighbour.y + neighbour.height / 2),
  );
  assert.ok(distToNeighbour > 1.75, 'refined centre must stay outside the next-row bubble');
  const refined = inspectResponse(image, target, all, { centreOffset: { dx: fit.dx, dy: fit.dy } });
  assert.equal(refined.peripheralEvidence, false);
  assert.equal(refined.centralEvidence, false);
});

test('erased ring plus a live neighbour ring is not a translation', () => {
  const ppm = 8, width = Math.round(210 * ppm), height = Math.round(297 * ppm);
  const data = new Uint8Array(width * height).fill(250);
  const page = formDefinition.pages[0]!;
  const item = page.items.find(i => i.itemNumber === 21)!;
  const target = item.responseAreas.find(a => a.choiceId === 'Y')!;
  const all = page.items.flatMap(i => i.responseAreas);
  for (const area of all) paintRing(data, width, height, area.x + area.width / 2, area.y + area.height / 2);
  eraseRing(data, width, height, target.x + target.width / 2, target.y + target.height / 2);
  const image: GrayImage = { width, height, data };
  const fit = fitRingCenter(image, target, all);
  assert.equal(fit.ok, false, 'a missing ring must not snap to the next-row ring');
  assert.ok(Math.hypot(fit.dx, fit.dy) < 2.6);
});

test('adjacent-row fill does not pull a blank ring off its centre', () => {
  const ppm = 8, width = Math.round(210 * ppm), height = Math.round(297 * ppm);
  const data = new Uint8Array(width * height).fill(250);
  const page = formDefinition.pages[0]!;
  const item = page.items.find(i => i.itemNumber === 21)!;
  const target = item.responseAreas.find(a => a.choiceId === 'Y')!;
  const below = page.items.find(i => i.itemNumber === 22)!.responseAreas.find(a => a.choiceId === 'Y')!;
  const all = page.items.flatMap(i => i.responseAreas);
  for (const area of all) paintRing(data, width, height, area.x + area.width / 2, area.y + area.height / 2);
  {
    const cx = (below.x + below.width / 2) * ppm, cy = (below.y + below.height / 2) * ppm;
    for (let y = Math.floor(cy - 1.22 * ppm - 1); y <= Math.ceil(cy + 1.22 * ppm + 1); y++)
      for (let x = Math.floor(cx - 1.22 * ppm - 1); x <= Math.ceil(cx + 1.22 * ppm + 1); x++)
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= 1.22 * ppm) data[y * width + x] = 20;
  }
  const image: GrayImage = { width, height, data };
  const fit = fitRingCenter(image, target, all);
  assert.equal(fit.ok, false, 'blank ring with a filled neighbour must stay nominal');
  assert.match(fit.reason ?? '', /kayma çok küçük|nominal/i);
});
