import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePage, PAGE_MARGIN_OVERSHOOT_LIMIT_MM } from '../src/omr/analyzePage';
import { describeQrDisagreement, evaluateQrConsistency, QR_AGREEMENT_MM } from '../src/omr/alignmentVerification';
import { formDefinition } from '../src/omr/formDefinition';
import type { Homography } from '../src/omr/perspectiveCorrection';
import { fitHomography, inspectFeatureContainment, mapPoint, pageCorners } from '../src/omr/perspectiveCorrection';
import { createPageQr } from '../src/form/pageIdentity';
import { cropSynthetic, renderSyntheticPage, shadowBandSynthetic, SYNTHETIC_BATCH, SYNTHETIC_MARGIN } from './fixtures/omrSynthetic';

const succeeded = (result: Awaited<ReturnType<typeof analyzePage>>) => {
  assert.equal(result.ok, true, result.ok ? '' : `${result.code}: ${result.message}`);
  assert.ok(result.ok);
  return result;
};

test('QR agreement budget is physical: photo-scale noise passes, a structural mismatch fails', () => {
  // A real capture: 6 px/mm, 17 degrees, the four squares located with about a pixel of noise and
  // the QR symbol decoded with about a pixel of noise per corner. The old fixed 4 px limit rejected
  // exactly this although every square was in the right place.
  const angle = 17 * Math.PI / 180, scale = 6;
  const truth: Homography = [scale * Math.cos(angle), -scale * Math.sin(angle), 620,
    scale * Math.sin(angle), scale * Math.cos(angle), 35, 0, 0, 1];
  const symbol = createPageQr(formDefinition, SYNTHETIC_BATCH, 1).innerCorners;
  const page = formDefinition.pages[0]!;
  const markNoise = [{ x: .8, y: -.4 }, { x: -.6, y: .7 }, { x: .4, y: -1.1 }, { x: -.2, y: .5 }];
  const marks = page.alignmentMarks.map(mark => ({
    x: mark.x + mark.width / 2, y: mark.y + mark.height / 2,
  }));
  const transform = fitHomography(marks, marks.map((point, index) => {
    const mapped = mapPoint(truth, point), offset = markNoise[index]!;
    return { x: mapped.x + offset.x, y: mapped.y + offset.y };
  }));
  const observed = symbol.map((point, index) => {
    const mapped = mapPoint(truth, point), offset = markNoise[(index + 1) % 4]!;
    return { x: mapped.x + offset.x * 1.4, y: mapped.y + offset.y * 1.4 };
  });
  const consistent = evaluateQrConsistency(transform, symbol, observed, scale);
  assert.equal(consistent.ok, true, consistent.ok ? '' : describeQrDisagreement(consistent.agreement));
  assert.ok(consistent.agreement.errorMm < QR_AGREEMENT_MM, `${consistent.agreement.errorMm} mm`);
  assert.equal(consistent.agreement.limitPx, Math.min(24, Math.max(4, QR_AGREEMENT_MM * scale)));
  // A whole marker spacing of disagreement is structural: the symbol is not where the squares say
  // the sheet is, so the page is refused.
  const shifted = observed.map(point => ({ x: point.x + 72, y: point.y }));
  const broken = evaluateQrConsistency(transform, symbol, shifted, scale);
  assert.equal(broken.ok, false);
  assert.ok(broken.agreement.errorPx > broken.agreement.limitPx);
  assert.match(describeQrDisagreement(broken.agreement), /tutarsız/);
  assert.match(describeQrDisagreement(broken.agreement), /mm/);
});

test('feature containment measures printed content, not the sheet outline', () => {
  const features = [{ id: 'mark', x: 10, y: 10, width: 5, height: 5 },
    { id: 'bubble', x: 20, y: 60, width: 3.5, height: 3.5 }];
  const upright: Homography = [6, 0, 32, 0, 6, 32, 0, 0, 1];
  const inside = inspectFeatureContainment(upright, features, { width: 1324, height: 1846 }, 6);
  assert.ok(inside.minMarginMm > 5, `${inside.minMarginMm}`);
  // The sheet outline may already stick out (a rendered PDF or a borderless scan) without any
  // printed feature being lost: containment stays positive.
  const fullBleed: Homography = [6, 0, -.5, 0, 6, -.5, 0, 0, 1];
  const pdfRaster = inspectFeatureContainment(fullBleed, features, { width: 1260, height: 1782 }, 6);
  assert.ok(pdfRaster.minMarginMm > 0);
  // A capture that cuts into printed content is reported with the worst feature and the side.
  const page = formDefinition.pages[0]!;
  const printed = [...page.alignmentMarks, page.qrArea, ...page.items.flatMap(item => item.responseAreas)]
    .map((rect, index) => ({ ...rect, id: index < 4 ? page.alignmentMarks[index]!.id : `feature-${index}` }));
  const full: Homography = [6, 0, 32, 0, 6, 32, 0, 0, 1];
  // The capture ends 9 mm inside the right-hand squares, which is printed content, not blank margin.
  const cutWidth = 32 + 186 * 6;
  const cutRight = inspectFeatureContainment(full, printed, { width: cutWidth, height: 1846 }, 6);
  assert.equal(cutRight.side, 'right');
  assert.equal(cutRight.featureId, 'top-right');
  assert.ok(cutRight.minMarginMm < -7, `${cutRight.minMarginMm}`);
  assert.ok(inspectFeatureContainment(full, printed, { width: 1680, height: 2376 }, 6).minMarginMm > 0);
});

test('a printed square bridged to the paper edge by a hairline is still used as a page anchor', async () => {
  // A 0.5 mm grey bridge from the left edge to the top-left square: one connected component at the
  // search threshold. The square is still found, so the page is read, not refused.
  const image = shadowBandSynthetic(renderSyntheticPage(), { xMm: 0, yMm: 12.2, widthMm: 12, heightMm: 0.6, value: 120 });
  const result = succeeded(await analyzePage(image, formDefinition));
  assert.equal(result.items.length, formDefinition.pages[0]!.items.length);
  assert.ok(result.items.every(item => item.status === 'blank'));
});

test('a wide shadow band over a printed square is not promoted to a page anchor', async () => {
  const image = shadowBandSynthetic(renderSyntheticPage(), { xMm: 0, yMm: 0, widthMm: 16, heightMm: 20, value: 110 });
  const result = await analyzePage(image, formDefinition);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, 'ALIGNMENT_MISSING');
    assert.match(result.message, /sol üst kare/);
    assert.ok(result.diagnostics?.some(entry => entry.reason.length > 10));
  }
});

test('a sheet whose blank margin is missing keeps every item; an absurd frame is refused', async () => {
  // 6.7 mm of blank margin missing: the reported print output. All four squares, the QR code and
  // every bubble are inside the capture, so the page must be read with the right item numbers.
  const marginLoss = cropSynthetic(renderSyntheticPage(), SYNTHETIC_MARGIN + 40, SYNTHETIC_MARGIN + 40,
    SYNTHETIC_MARGIN + 6, SYNTHETIC_MARGIN + 6);
  const result = succeeded(await analyzePage(marginLoss, formDefinition));
  assert.equal(result.pageNumber, 1);
  assert.equal(result.items[0]!.itemNumber, 1);
  assert.equal(result.items.length, formDefinition.pages[0]!.items.length);
  // The page frame is allowed to stick out of the capture; it may not be wildly larger than it,
  // because then the four observed squares do not describe this sheet at all.
  const geometry = inspectFeatureContainment([6, 0, -300, 0, 6, -300, 0, 0, 1],
    [{ id: 'mark', x: 10, y: 10, width: 5, height: 5 }], { width: 1324, height: 1846 }, 6);
  assert.ok(geometry.minMarginMm < 0);
  assert.ok(PAGE_MARGIN_OVERSHOOT_LIMIT_MM <= 20, 'the margin budget must stay small and physical');
  const corners = pageCorners(210, 297).map(point => mapPoint([6, 0, -300, 0, 6, -300, 0, 0, 1], point));
  assert.ok(corners.some(point => point.x < 0));
});
