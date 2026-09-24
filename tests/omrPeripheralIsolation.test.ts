import assert from 'node:assert/strict';
import test from 'node:test';
import { detectItemMarks, inspectResponse } from '../src/omr/markDetector';
import { formDefinition } from '../src/omr/formDefinition';
import type { GrayImage, ItemDefinition, ResponseArea } from '../src/omr/omrTypes';
import type { QualityReport } from '../src/results/scanResultTypes';

const page = formDefinition.pages[0]!;
const quality: QualityReport = {
  ok: true, score: 1, reasons: [],
  metrics: { brightness: 220, shadowSpread: 0, laplacianVariance: 300, borderContrast: .8, pixelsPerMm: 8 },
};

function blankCanonical(): GrayImage {
  return { width: 1680, height: 2376, data: new Uint8Array(1680 * 2376).fill(248) };
}

function paintDisk(image: GrayImage, area: ResponseArea, radiusMm: number, value: number) {
  const ppm = 8, cx = (area.x + area.width / 2) * ppm, cy = (area.y + area.height / 2) * ppm;
  for (let y = Math.max(0, Math.floor(cy - radiusMm * ppm - 1)); y <= Math.min(image.height - 1, Math.ceil(cy + radiusMm * ppm + 1)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radiusMm * ppm - 1)); x <= Math.min(image.width - 1, Math.ceil(cx + radiusMm * ppm + 1)); x++) {
      if (Math.hypot(x + .5 - cx, y + .5 - cy) <= radiusMm * ppm) image.data[y * image.width + x] = value;
    }
  }
}

function moveAbove(area: ResponseArea, distanceMm: number): ResponseArea {
  const currentCentre = area.y + area.height / 2;
  return { ...area, responseId: `${area.responseId}-neighbour`, y: currentCentre - distanceMm - area.height / 2 };
}

function collisionScene(currentChoice: 'D' | 'Y') {
  const item = page.items[1]!;
  const selectedChoice = currentChoice === 'D' ? 'Y' : 'D';
  const current = item.responseAreas.find(area => area.choiceId === currentChoice)!;
  const selected = item.responseAreas.find(area => area.choiceId === selectedChoice)!;
  const neighbour = moveAbove(current, 2.2);
  const image = blankCanonical();
  paintDisk(image, neighbour, 1.22, 20);
  paintDisk(image, selected, 1.22, 20);
  return { image, item, current, neighbour, selected, allAreas: [current, selected, neighbour] };
}

test('diagnostic A/B confirms adjacent-bubble peripheral contamination and the isolated mask removes it', () => {
  for (const currentChoice of ['D', 'Y'] as const) {
    const scene = collisionScene(currentChoice);
    const unmasked = inspectResponse(scene.image, scene.current, scene.allAreas, { isolatePeripheral: false });
    const isolated = inspectResponse(scene.image, scene.current, scene.allAreas);
    assert.equal(unmasked.centralEvidence, false);
    assert.equal(unmasked.peripheralEvidence, true,
      `A/B setup did not reproduce contamination on ${currentChoice}`);
    assert.equal(isolated.centralEvidence, false);
    assert.equal(isolated.peripheralEvidence, false);
    assert.ok(isolated.excludedNeighborPixels > 0);
    assert.ok(isolated.peripheralMaskPixelCount > 0);
    assert.equal(detectItemMarks(scene.image, scene.item, quality, scene.allAreas).choiceId, scene.selected.choiceId);
    assert.equal(detectItemMarks(scene.image, scene.item, quality, scene.allAreas).status, 'reliable');
    // The requested temporary diagnostic variant is not the production path and is kept only for A/B.
    const peripheralOff = detectItemMarks(scene.image, scene.item, quality, scene.allAreas,
      { disablePeripheralEvidence: true });
    assert.equal(peripheralOff.choiceId, scene.selected.choiceId);
  }
});

test('a printed line outside the current bubble is counted as rejected geometry, not peripheral evidence', () => {
  const item = page.items[1]!;
  const area = item.responseAreas[0]!;
  const image = blankCanonical();
  const ppm = 8, cx = (area.x + area.width / 2) * ppm, cy = (area.y + area.height / 2) * ppm;
  // The line is 0.18 mm outside the 1.75 mm bubble radius and crosses its debug probe only.
  const lineY = Math.round(cy + (area.height / 2 + .18) * ppm);
  for (let x = Math.round(cx - 2.1 * ppm); x <= Math.round(cx + 2.1 * ppm); x++) image.data[lineY * image.width + x] = 10;
  const inspection = inspectResponse(image, area, item.responseAreas);
  assert.equal(inspection.peripheralEvidence, false);
  assert.ok(inspection.excludedOutsideBubblePixels > 0);
  assert.equal(detectItemMarks(image, item, quality).status, 'blank');
});

test('central evidence remains separate from the isolated peripheral safety evidence', () => {
  const item = page.items[0]!;
  const image = blankCanonical();
  paintDisk(image, item.responseAreas[0]!, 1.22, 20);
  const inspection = inspectResponse(image, item.responseAreas[0]!, item.responseAreas);
  assert.equal(inspection.centralEvidence, true);
  // A strong fill may also darken the inner peripheral band; it remains current-bubble evidence,
  // not neighbouring evidence, and never weakens the central decision.
  assert.equal(inspection.peripheralEvidence, true);
  assert.ok(inspection.centralDarkness > .6);
  assert.ok(inspection.centralCoverage > .75);
});

// This keeps the fixture's complete current-item decision visible in the regression suite.
// The broader exact-form and safety suites cover faint, erased, double and annular ink values.
test('debug report fields are sufficient to explain a peripheral-only decision', () => {
  const item: ItemDefinition = page.items[1]!;
  const image = blankCanonical();
  const inspection = inspectResponse(image, item.responseAreas[0]!, item.responseAreas);
  assert.deepEqual(Object.keys(inspection).sort(), [
    'centralDarkness', 'centralCoverage', 'centralEvidence', 'excludedBubbleBorderPixels',
    'excludedNeighborPixels', 'excludedOutsideBubblePixels', 'invalid', 'measurement',
    'peripheralCoverage', 'peripheralDarkness', 'peripheralEvidence', 'peripheralMaskPixelCount',
  ].sort());
  assert.equal(inspection.peripheralEvidence, false);
  assert.equal(inspection.measurement.darkness, inspection.centralDarkness);
});
