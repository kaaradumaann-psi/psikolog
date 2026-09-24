import type { GrayImage, ItemDefinition, ResponseArea } from './omrTypes';
import type { ItemReadResult, QualityReport, ResponseMeasurement } from '../results/scanResultTypes';
import { percentile, QUALITY_THRESHOLDS } from './imageQuality';
import { CANONICAL_PIXELS_PER_MM } from './perspectiveCorrection';

/** Provisional technical evidence thresholds. Confidence is a heuristic strength, never a probability. */
export const MARK_THRESHOLDS = Object.freeze({
  blankDarkness: .045, blankCoverage: .035, pixelDarkness: .3,
  markDarkness: .25, markCoverage: .38, strongDarkness: .62, strongCoverage: .75,
  /**
   * A faint phone-camera ring/halo is not an answer. A genuinely dark annulus still remains
   * review evidence; this is deliberately not the geometry fix below.
   */
  strayPeripheralDarkness: .2,
});

/** The printed ring and interpolation are not part of the answer's ink measurement. */
const BUBBLE_BORDER_INSET_MM = .6;
/** Probe a little outside the bubble solely so debug output can prove those pixels were rejected. */
const OUTSIDE_BUBBLE_PROBE_MM = .45;
const REFERENCE_RINGS = { backgroundInner: .35, backgroundOuter: .95, paperInner: 1.25, paperOuter: 1.85 };

export type CentreOffset = { dx: number; dy: number };

type InspectionOptions = {
  /** Diagnostic A/B switch only. Scanner code always uses the default isolated mask. */
  isolatePeripheral?: boolean;
  /** Per-bubble ring-centre refinement (mm) from fitRingCenter; shifts all sampling coordinates. */
  centreOffset?: CentreOffset;
  /** Offsets of *neighbouring* bubbles, used to mask neighbour interiors at their refined positions. */
  neighbourOffsets?: ReadonlyMap<string, CentreOffset>;
};

type SampledPixels = {
  values: number[];
  excludedNeighborPixels: number;
  excludedOutsideBubblePixels: number;
  excludedBubbleBorderPixels: number;
};

/** Full technical evidence for one response. It is intentionally separate from the stored result. */
export type ResponseInspection = {
  measurement: ResponseMeasurement;
  invalid: boolean;
  centralDarkness: number;
  centralCoverage: number;
  peripheralDarkness: number;
  peripheralCoverage: number;
  peripheralMaskPixelCount: number;
  excludedNeighborPixels: number;
  excludedOutsideBubblePixels: number;
  excludedBubbleBorderPixels: number;
  centralEvidence: boolean;
  peripheralEvidence: boolean;
};

export type MarkDetectionOptions = {
  /** Diagnostic A/B switch; never used by the production scanner. */
  disablePeripheralEvidence?: boolean;
};

export type MarkDebugReport = {
  item: ItemReadResult;
  responses: ResponseInspection[];
};

function radiusMm(area: ResponseArea) {
  return Math.min(area.width, area.height) / 2;
}

function centreMm(area: ResponseArea, offset?: CentreOffset) {
  const base = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
  if (!offset) return base;
  return { x: base.x + offset.dx, y: base.y + offset.dy };
}

/** Elliptical containment keeps the mask tied to the declared bubble geometry, not a loose ROI. */
function insideBubble(area: ResponseArea, xMm: number, yMm: number, insetMm = 0, offset?: CentreOffset) {
  const rx = Math.max(.05, area.width / 2 - insetMm), ry = Math.max(.05, area.height / 2 - insetMm);
  const centre = centreMm(area, offset);
  return ((xMm - centre.x) / rx) ** 2 + ((yMm - centre.y) / ry) ** 2 <= 1;
}

function offsetFor(area: ResponseArea, offsets?: ReadonlyMap<string, CentreOffset>): CentreOffset | undefined {
  return offsets?.get(area.responseId);
}

function nearbyResponseAreas(area: ResponseArea, allAreas: readonly ResponseArea[], centreOffset?: CentreOffset,
  neighbourOffsets?: ReadonlyMap<string, CentreOffset>) {
  const centre = centreMm(area, centreOffset), samplingRadius = radiusMm(area) + OUTSIDE_BUBBLE_PROBE_MM;
  const referenceRadius = radiusMm(area) + REFERENCE_RINGS.paperOuter;
  return allAreas.filter(candidate => {
    if (candidate.responseId === area.responseId) return false;
    const other = centreMm(candidate, offsetFor(candidate, neighbourOffsets));
    return Math.hypot(other.x - centre.x, other.y - centre.y) <= samplingRadius + referenceRadius + radiusMm(candidate);
  });
}

function isCoveredByNeighbour(xMm: number, yMm: number, neighbours: readonly ResponseArea[],
  neighbourOffsets?: ReadonlyMap<string, CentreOffset>) {
  return neighbours.some(neighbour => insideBubble(neighbour, xMm, yMm, 0, offsetFor(neighbour, neighbourOffsets)));
}

function collectRing(image: GrayImage, area: ResponseArea, allAreas: readonly ResponseArea[],
  innerRadiusMm: number, outerRadiusMm: number, kind: 'central' | 'peripheral' | 'reference',
  isolate: boolean, centreOffset?: CentreOffset, neighbourOffsets?: ReadonlyMap<string, CentreOffset>): SampledPixels {
  const ppm = CANONICAL_PIXELS_PER_MM, centre = centreMm(area, centreOffset);
  const neighbours = isolate ? nearbyResponseAreas(area, allAreas, centreOffset, neighbourOffsets) : [];
  const cx = centre.x * ppm, cy = centre.y * ppm;
  const values: number[] = [];
  let excludedNeighborPixels = 0, excludedOutsideBubblePixels = 0, excludedBubbleBorderPixels = 0;
  for (let y = Math.max(0, Math.floor(cy - outerRadiusMm * ppm)); y <= Math.min(image.height - 1, Math.ceil(cy + outerRadiusMm * ppm)); y++) {
    for (let x = Math.max(0, Math.floor(cx - outerRadiusMm * ppm)); x <= Math.min(image.width - 1, Math.ceil(cx + outerRadiusMm * ppm)); x++) {
      const xMm = (x + .5) / ppm, yMm = (y + .5) / ppm;
      const distance = Math.hypot(xMm - centre.x, yMm - centre.y);
      if (distance < innerRadiusMm || distance > outerRadiusMm) continue;
      if (kind === 'reference') {
        if (isolate && isCoveredByNeighbour(xMm, yMm, neighbours, neighbourOffsets)) excludedNeighborPixels++;
        else values.push(image.data[y * image.width + x]!);
        continue;
      }
      if (isolate && isCoveredByNeighbour(xMm, yMm, neighbours, neighbourOffsets)) {
        excludedNeighborPixels++;
        continue;
      }
      if (kind === 'peripheral') {
        if (distance > radiusMm(area)) {
          excludedOutsideBubblePixels++;
          continue;
        }
        if (!insideBubble(area, xMm, yMm, BUBBLE_BORDER_INSET_MM, centreOffset)) {
          excludedBubbleBorderPixels++;
          continue;
        }
      }
      values.push(image.data[y * image.width + x]!);
    }
  }
  return { values, excludedNeighborPixels, excludedOutsideBubblePixels, excludedBubbleBorderPixels };
}

function normalizedDarkness(value: number, reference: number) {
  return Math.max(0, Math.min(1, (reference - value) / Math.max(1, reference)));
}

/**
 * Inspect one bubble without allowing its peripheral evidence to borrow pixels from another
 * response. `allResponseAreas` should be the page's complete response list when available.
 *
 * The optional `isolatePeripheral: false` mode exists only for the regression A/B test: it
 * reproduces the old unmasked measurement and must not be passed by the scanner.
 */
export function inspectResponse(image: GrayImage, area: ResponseArea,
  allResponseAreas: readonly ResponseArea[] = [area], options: InspectionOptions = {}): ResponseInspection {
  const isolatePeripheral = options.isolatePeripheral !== false;
  const centreOffset = options.centreOffset;
  const neighbourOffsets = options.neighbourOffsets;
  const radius = radiusMm(area);
  const centralRadius = Math.min(.9, radius * .55);
  const background = collectRing(image, area, allResponseAreas, radius + REFERENCE_RINGS.backgroundInner,
    radius + REFERENCE_RINGS.backgroundOuter, 'reference', true, centreOffset, neighbourOffsets).values;
  const paper = collectRing(image, area, allResponseAreas, radius + REFERENCE_RINGS.paperInner,
    radius + REFERENCE_RINGS.paperOuter, 'reference', true, centreOffset, neighbourOffsets).values;
  const backgroundLevel = percentile(background, .8), paperLevel = percentile(paper, .8);
  const reference = Math.max(backgroundLevel, paperLevel);
  const disk = collectRing(image, area, allResponseAreas, 0, centralRadius, 'central', true, centreOffset, neighbourOffsets).values;
  const invalid = !disk.length || !background.length || !paper.length ||
    backgroundLevel < QUALITY_THRESHOLDS.fatalTileBrightness || paperLevel < QUALITY_THRESHOLDS.fatalTileBrightness ||
    backgroundLevel < paperLevel * .75;
  let centralDarknessTotal = 0, centralCovered = 0;
  for (const value of disk) {
    const darkness = normalizedDarkness(value, reference);
    centralDarknessTotal += darkness;
    if (darkness >= MARK_THRESHOLDS.pixelDarkness) centralCovered++;
  }
  const centralDarkness = disk.length ? centralDarknessTotal / disk.length : 0;
  const centralCoverage = disk.length ? centralCovered / disk.length : 0;
  const centralEvidence = centralDarkness > MARK_THRESHOLDS.blankDarkness || centralCoverage > MARK_THRESHOLDS.blankCoverage;

  // The measurement band remains inside the real bubble. The larger probe is used only to account
  // for rejected pixels in diagnostics; printed lines outside the bubble can never enter `values`.
  const peripheralOuter = Math.max(centralRadius, radius - BUBBLE_BORDER_INSET_MM);
  const peripheralProbeOuter = isolatePeripheral ? radius + OUTSIDE_BUBBLE_PROBE_MM : peripheralOuter;
  const peripheral = collectRing(image, area, allResponseAreas, centralRadius, peripheralProbeOuter,
    'peripheral', isolatePeripheral, centreOffset, neighbourOffsets);
  // In diagnostic unmasked mode, preserve the historical band exactly; the probe is not measured.
  const peripheralValues = isolatePeripheral ? peripheral.values : collectRing(image, area, allResponseAreas,
    centralRadius, peripheralOuter, 'central', false, centreOffset, neighbourOffsets).values;
  let peripheralDarknessTotal = 0, peripheralCovered = 0;
  for (const value of peripheralValues) {
    const darkness = normalizedDarkness(value, reference);
    peripheralDarknessTotal += darkness;
    if (darkness >= MARK_THRESHOLDS.pixelDarkness) peripheralCovered++;
  }
  const peripheralDarkness = peripheralValues.length ? peripheralDarknessTotal / peripheralValues.length : 0;
  const peripheralCoverage = peripheralValues.length ? peripheralCovered / peripheralValues.length : 0;
  const peripheralEvidence = peripheralValues.length > 0 && (peripheralDarkness > MARK_THRESHOLDS.strayPeripheralDarkness ||
    peripheralCoverage > MARK_THRESHOLDS.blankCoverage);
  const measurement: ResponseMeasurement = { responseId: area.responseId, choiceId: area.choiceId,
    darkness: centralDarkness, coverage: centralCoverage };
  return { measurement, invalid, centralDarkness, centralCoverage, peripheralDarkness, peripheralCoverage,
    peripheralMaskPixelCount: peripheralValues.length, excludedNeighborPixels: peripheral.excludedNeighborPixels,
    excludedOutsideBubblePixels: peripheral.excludedOutsideBubblePixels,
    excludedBubbleBorderPixels: peripheral.excludedBubbleBorderPixels, centralEvidence, peripheralEvidence };
}

export function measureResponse(image: GrayImage, area: ResponseArea, offset?: CentreOffset,
  neighbourOffsets?: ReadonlyMap<string, CentreOffset>): ResponseMeasurement {
  return inspectResponse(image, area, [area], { centreOffset: offset, neighbourOffsets }).measurement;
}

export function inspectItemResponses(image: GrayImage, item: ItemDefinition,
  allResponseAreas: readonly ResponseArea[] = item.responseAreas,
  offsets?: ReadonlyMap<string, CentreOffset>): ResponseInspection[] {
  return item.responseAreas.map(area => inspectResponse(image, area, allResponseAreas,
    { centreOffset: offsets?.get(area.responseId), neighbourOffsets: offsets }));
}

function decideItemMarks(inspected: readonly ResponseInspection[], item: ItemDefinition, quality: QualityReport,
  options: MarkDetectionOptions = {}): ItemReadResult {
  const limits = MARK_THRESHOLDS;
  const measurements = inspected.map(response => response.measurement);
  const base = { itemId: item.itemId, itemNumber: item.itemNumber, measurements };
  const result = (status: ItemReadResult['status'], choiceId: string | null, confidence: number, reason: string): ItemReadResult =>
    ({ ...base, status, choiceId, confidence: Math.max(0, Math.min(1, confidence)), reason });
  if (!measurements.length) return result('invalid', null, 0, 'Görüntü kalitesi uygun değil.');
  if (inspected.some(response => response.invalid)) return result('invalid', null, 0,
    'Yanıt alanının zemini kirli; yanıt kabul edilmedi.');
  const marked = measurements.filter(m => m.darkness >= limits.markDarkness && m.coverage >= limits.markCoverage);
  const evidence = inspected.filter(response => response.centralEvidence ||
    (!options.disablePeripheralEvidence && response.peripheralEvidence));
  if (marked.length > 1) return result('multiple', null, Math.min(...marked.map(m => Math.min(m.darkness, m.coverage))),
    'Birden fazla seçenek işaretli.');
  if (marked.length === 1) {
    const selected = marked[0]!;
    if (evidence.length > 1) return result('ambiguous', null, .25, 'Diğer seçenekte de silik veya silinmiş iz var; elle inceleyin.');
    const strength = Math.min(selected.darkness, selected.coverage);
    if (quality.ok && selected.darkness >= limits.strongDarkness && selected.coverage >= limits.strongCoverage
      && quality.score >= QUALITY_THRESHOLDS.cleanScore) {
      return result('reliable', selected.choiceId, Math.min(.98, strength * quality.score),
        'Tek ve belirgin işaret.');
    }
    return result('single', selected.choiceId, Math.min(.69, strength * quality.score),
      'Tek işaret; elle doğrulayın.');
  }
  if (evidence.length) return result('ambiguous', null, .2, 'Silik veya silinmiş iz var; elle inceleyin.');
  return result('blank', null, Math.min(.95, quality.score * (1 - Math.max(...measurements.map(m => m.darkness)))),
    'Belirgin işaret yok.');
}

export function detectItemMarks(image: GrayImage, item: ItemDefinition, quality: QualityReport,
  allResponseAreas: readonly ResponseArea[] = item.responseAreas, options: MarkDetectionOptions = {},
  offsets?: ReadonlyMap<string, CentreOffset>): ItemReadResult {
  return decideItemMarks(inspectItemResponses(image, item, allResponseAreas, offsets), item, quality, options);
}

/** Test/debug-only structured output; the UI does not render these diagnostics. */
export function debugItemMarks(image: GrayImage, item: ItemDefinition, quality: QualityReport,
  allResponseAreas: readonly ResponseArea[] = item.responseAreas,
  offsets?: ReadonlyMap<string, CentreOffset>): MarkDebugReport {
  const responses = inspectItemResponses(image, item, allResponseAreas, offsets);
  return { responses, item: decideItemMarks(responses, item, quality) };
}
