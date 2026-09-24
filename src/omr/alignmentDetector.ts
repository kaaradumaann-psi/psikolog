import type { AlignmentMark, GrayImage, Point } from './omrTypes';
import { fitHomographyLeastSquares, mapPoint } from './perspectiveCorrection';
import type { Homography } from './perspectiveCorrection';

export type DetectedAlignmentMark = { id: string; center: Point; area: number; fill: number; predictionError: number };

/** One failed attempt, in words a person can act on. */
export type AlignmentFailure = { markId: string; reason: string };

type Candidate = DetectedAlignmentMark & { cost: number };
type LocateResult = { ok: true; mark: DetectedAlignmentMark } | { ok: false; reason: string };

type Rejections = {
  size: number; shape: number; square: number; solid: number; distance: number;
  /** Dark blob merged with a shadow, a rule line or the paper edge. */
  unstable: number;
  /** Too dark over too large an area: a shadowed sheet region rather than a printed square. */
  blob: number;
};

function failReason(rejected: Rejections): string {
  const found = Object.values(rejected).some(count => count > 0);
  if (!found) return 'beklenen konumda koyu bir alan yok (kare kadrajda değil, çok soluk veya gölge/parlama altında)';
  const detail: string[] = [];
  if (rejected.size) detail.push(`${rejected.size} aday boyut veya dolgunluk ölçütünü geçmedi`);
  if (rejected.distance) detail.push(`${rejected.distance} aday tahmin edilen konuma çok uzaktı`);
  if (rejected.square) detail.push(`${rejected.square} aday kare biçiminde değildi`);
  if (rejected.solid) detail.push(`${rejected.solid} adayın içi yeterince dolu değildi`);
  if (rejected.unstable) detail.push(`${rejected.unstable} aday gölgeye veya çizgiye bağlıydı`);
  if (rejected.blob) detail.push(`${rejected.blob} aday sayfadaki koyu bölgeyle birleşiyordu`);
  if (rejected.shape) detail.push(`${rejected.shape} aday biçim ölçütünü geçmedi`);
  return detail.join('; ');
}

/** A dark region more than this many times the printed square, or clipped by the whole search window,
 * cannot be a 5 mm mark: it is a shadow, a fold or a merged rule line. Rejecting it here is what
 * stops the "largest dark component" rank from preferring shade over the printed square. */
const MAX_COMPONENT_FACTOR = 6;

/** Frame around a candidate square that is expected to be paper, and how much stray ink it may hold. */
const MARGIN_PX = 4;
const MARGIN_INK_LIMIT = 0.15;
/** A printed square touching a soft shadow is still usable when the observed head is this close to the
 * prediction, is essentially square and is the size of a printed square; it stays a measurement. */
const TOUCHING_PREDICTION_RATIO = .25;
const TOUCHING_SQUARE_FILL = .95;

/**
 * Locates one printed square for one predicted transform; never substitutes a predicted centre.
 * Every rejection path reports why, so a real capture can be diagnosed instead of guessed at.
 */
function locateMark(image: GrayImage, mark: AlignmentMark, prediction: Homography, qrCenter: Point): LocateResult {
  const mmCenter = { x: mark.x + mark.width / 2, y: mark.y + mark.height / 2 };
  const predicted = mapPoint(prediction, mmCenter);
  const corners = [
    { x: mark.x, y: mark.y }, { x: mark.x + mark.width, y: mark.y },
    { x: mark.x + mark.width, y: mark.y + mark.height }, { x: mark.x, y: mark.y + mark.height },
  ].map(p => mapPoint(prediction, p));
  const area = Math.abs(corners.reduce((sum, p, i) => {
    const next = corners[(i + 1) % 4]!;
    return sum + p.x * next.y - p.y * next.x;
  }, 0)) / 2;
  const scale = Math.sqrt(area / (mark.width * mark.height));
  if (!Number.isFinite(scale) || scale < 1.5 || scale > 30) {
    return { ok: false, reason: `kare görüntüde beklenen boyutta değil (ölçek ${scale.toFixed(1)})` };
  }
  const distanceMm = Math.hypot(mmCenter.x - qrCenter.x, mmCenter.y - qrCenter.y);
  // The prediction extrapolates from the 26 mm QR symbol; under strong
  // perspective its scale error grows with distance, so the window widens
  // linearly. Candidate filters (square fill, solidity, margin, size) still
  // reject everything that is not a printed square of the right size.
  const radius = Math.min(500, Math.ceil(scale * (8 + distanceMm * .22)));
  const left = Math.max(0, Math.floor(predicted.x - radius)), top = Math.max(0, Math.floor(predicted.y - radius));
  const right = Math.min(image.width - 1, Math.ceil(predicted.x + radius)), bottom = Math.min(image.height - 1, Math.ceil(predicted.y + radius));
  const width = right - left + 1, height = bottom - top + 1;
  if (width < 5 || height < 5) return { ok: false, reason: 'karenin bulunması gereken alan görüntünün dışında' };
  const histogram = new Uint32Array(256);
  let samples = 0;
  for (let y = top; y <= bottom; y += 4) for (let x = left; x <= right; x += 4) {
    const value = image.data[y * image.width + x]!;
    histogram[value] = histogram[value]! + 1;
    samples++;
  }
  let background = 255, cumulative = 0;
  for (let value = 0; value < 256; value++) {
    cumulative += histogram[value]!;
    if (cumulative >= samples * .85) { background = value; break; }
  }
  let otsu = 128, histSum = 0;
  for (let i = 0; i < 256; i++) histSum += i * histogram[i]!;
  let sumB = 0, wB = 0, maxVar = 0;
  for (let t = 0; t < 256; t++) {
    wB += histogram[t]!;
    if (!wB) continue;
    const wF = samples - wB;
    if (!wF) break;
    sumB += t * histogram[t]!;
    const mB = sumB / wB, mF = (histSum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > maxVar) { maxVar = between; otsu = t; }
  }
  const thresholds = [...new Set([
    Math.max(20, Math.round(background * .55)),
    Math.max(20, Math.round(background * .70)),
    Math.max(20, otsu),
  ])];

  let lastFail: LocateResult = { ok: false, reason: 'beklenen konumda koyu bir alan yok (kare kadrajda değil, çok soluk veya gölge/parlama altında)' };
  for (const threshold of thresholds) {
    const result = searchAtThreshold(image, mark, prediction, mmCenter, predicted, area, radius, left, top, width, height, threshold);
    if (result.ok) return result;
    lastFail = result;
  }
  return lastFail;
}

function searchAtThreshold(
  image: GrayImage, mark: AlignmentMark, prediction: Homography, mmCenter: Point, predicted: Point,
  area: number, radius: number, left: number, top: number, width: number, height: number, threshold: number,
): LocateResult {
  const visited = new Uint8Array(width * height), queue = new Int32Array(width * height);
  const candidates: Candidate[] = [];
  const rejected: Rejections = { size: 0, shape: 0, square: 0, solid: 0, distance: 0, unstable: 0, blob: 0 };
  for (let start = 0; start < visited.length; start++) {
    if (visited[start]) continue;
    visited[start] = 1;
    const startX = start % width, startY = Math.floor(start / width);
    if (image.data[(top + startY) * image.width + left + startX]! > threshold) continue;
    let read = 0, count = 1, sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    queue[0] = start;
    while (read < count) {
      const at = queue[read++]!, x = at % width, y = Math.floor(at / width);
      sumX += x; sumY += y; sumXX += x * x; sumYY += y * y; sumXY += x * y;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * width + nx;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || visited[next]) continue;
        visited[next] = 1;
        if (image.data[(top + ny) * image.width + left + nx]! <= threshold) queue[count++] = next;
      }
    }
    const cx = sumX / count, cy = sumY / count;
    if (count > area * MAX_COMPONENT_FACTOR) { rejected.blob++; continue; }
    // A shadow gradient, a separator line or the paper edge can be connected to the printed square
    // at the search threshold. The square is the largest *square window* around the centroid that
    // still holds a square's worth of ink; everything merged beyond it is discarded.
    const head = squareWindow(queue, count, width, cx, cy, area);
    if (!head) { rejected.unstable++; continue; }
    const headWidth = head.right - head.left + 1, headHeight = head.bottom - head.top + 1;
    const windowFill = head.count / (headWidth * headHeight);
    const clipped = head.left <= 0 || head.top <= 0 || head.right >= width - 1 || head.bottom >= height - 1;
    if (head.count < area * .5 || head.count > area * 1.8 || windowFill < .43 || clipped) { rejected.size++; continue; }
    if (head.maxX - head.minX + 1 < headWidth * .85 || head.maxY - head.minY + 1 < headHeight * .85) {
      rejected.shape++;
      continue;
    }
    const headCenter = { x: left + head.cx, y: top + head.cy };
    const predictionError = Math.hypot(headCenter.x - predicted.x, headCenter.y - predicted.y);
    if (predictionError > radius * .9) { rejected.distance++; continue; }
    // Raw circular blobs cannot replace squares: the filled ratio over the best-fitting orientation
    // has to reach 0.84, which a disc (pi/4 = 0.785) never does.
    let squareFill = 0;
    for (let degrees = 0; degrees < 90; degrees += 2) {
      const angle = degrees * Math.PI / 180, cosine = Math.cos(angle), sine = Math.sin(angle);
      let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
      for (let index = 0; index < count; index++) {
        const at = queue[index]!, x = at % width, y = Math.floor(at / width);
        if (x < head.left || x > head.right || y < head.top || y > head.bottom) continue;
        const dx = x - head.cx, dy = y - head.cy;
        const u = dx * cosine + dy * sine, v = dy * cosine - dx * sine;
        minU = Math.min(minU, u); maxU = Math.max(maxU, u);
        minV = Math.min(minV, v); maxV = Math.max(maxV, v);
      }
      const pixel = Math.abs(cosine) + Math.abs(sine);
      squareFill = Math.max(squareFill, head.count / ((maxU - minU + pixel) * (maxV - minV + pixel)));
    }
    if (squareFill < .84) { rejected.square++; continue; }
    let solid = 0, checked = 0;
    for (let sy = -2; sy <= 2; sy++) for (let sx = -2; sx <= 2; sx++) {
      const probe = mapPoint(prediction, { x: mmCenter.x + sx * mark.width * .1, y: mmCenter.y + sy * mark.height * .1 });
      const x = Math.round(headCenter.x + probe.x - predicted.x), y = Math.round(headCenter.y + probe.y - predicted.y);
      if (x >= 0 && y >= 0 && x < image.width && y < image.height && image.data[y * image.width + x]! <= threshold) solid++;
      checked++;
    }
    if (solid / checked < .92) { rejected.solid++; continue; }
    // The frame just outside the square is expected to be paper. Ink there means the candidate is
    // part of something larger: a shadow band, a rule line, a torn edge. Such a candidate is only
    // kept when it is unmistakably the printed square itself (square-shaped, one square's worth of
    // ink, sitting on the prediction), so a shadow can never enlarge or shift a page anchor.
    if (marginInkFraction(image, left, top, width, height, head, threshold) > MARGIN_INK_LIMIT) {
      // "One square's worth of ink" is measured on the whole component, not on the square window.
      // A handheld photo stretches the sheet along one axis (measured on the reference set: the
      // printed square arrives ~1.2x taller than wide), so the square window has to truncate the
      // longer axis of a perfectly solid mark. The mark's own truncated edge rows then land in the
      // margin frame that exists to detect *foreign* ink, and measuring the same truncated window
      // again made the rescue unable to fire for a mark that is beyond doubt the printed square.
      // The component's own ink is the honest measure: for a clean mark it is one square, while a
      // square merged with a shadow or a rule line exceeds 1.3 squares and is still refused.
      const isPrintedSquare = predictionError <= radius * TOUCHING_PREDICTION_RATIO &&
        squareFill >= TOUCHING_SQUARE_FILL && count >= area * .8 && count <= area * 1.3;
      if (!isPrintedSquare) { rejected.unstable++; continue; }
    }
    candidates.push({ id: mark.id, center: headCenter, area: head.count, fill: windowFill, predictionError,
      cost: predictionError / radius + Math.abs(Math.log(head.count / area)) * .3 });
  }
  candidates.sort((a, b) => a.cost - b.cost);
  const best = candidates[0];
  if (!best) return { ok: false, reason: failReason(rejected) };
  if (candidates[1] && candidates[1].cost - best.cost < .12) {
    return { ok: false, reason: 'birden çok benzer koyu alan var, doğru kare ayırt edilemedi' };
  }
  const { cost: _cost, ...measurement } = best;
  return { ok: true, mark: measurement };
}

/**
 * Detects real dark connected components near predicted positions; never substitutes a prediction.
 * Predictions are tried in order because each is wrong in a different way: a projective fit to the
 * four QR corners tracks genuine perspective but amplifies sub-pixel noise on rotated sheets, while
 * a similarity fit is stable under rotation and drifts under strong perspective. A mark counts as
 * found only when one prediction passes every filter above.
 */
export function detectAlignmentMarks(image: GrayImage, marks: readonly AlignmentMark[],
  predictions: readonly Homography[], qrCenter: Point,
  onFailure?: (failure: AlignmentFailure) => void,
  salvage?: { mm: readonly Point[]; px: readonly Point[] }): DetectedAlignmentMark[] | null {
  if (marks.length !== 4 || predictions.length < 1) return null;
  const detected: DetectedAlignmentMark[] = [];
  const missing: { mark: AlignmentMark; reasons: string[]; lastError: unknown }[] = [];
  const accept = (candidate: DetectedAlignmentMark): string | null => {
    if (detected.some(previous => Math.hypot(previous.center.x - candidate.center.x, previous.center.y - candidate.center.y) < Math.sqrt(candidate.area))) {
      return 'başka bir kareyle aynı konumda görünüyor';
    }
    detected.push(candidate);
    return null;
  };
  for (const mark of marks) {
    let found: DetectedAlignmentMark | null = null, lastError: unknown;
    const reasons: string[] = [];
    for (const prediction of predictions) {
      try {
        const result = locateMark(image, mark, prediction, qrCenter);
        if (result.ok) { found = result.mark; break; }
        reasons.push(result.reason);
      } catch (error) { lastError = error; }
    }
    if (found) {
      const duplicate = accept(found);
      if (duplicate) { onFailure?.({ markId: mark.id, reason: duplicate }); return null; }
      continue;
    }
    if (lastError !== undefined && !reasons.length) throw lastError;
    missing.push({ mark, reasons, lastError });
  }
  // Salvage pass: strong perspective can throw the QR-only prediction of a far
  // corner hundreds of pixels off (the 26 mm symbol cannot constrain the
  // projective terms). Squares already found span the whole sheet, so a
  // projective refit over them plus the QR corners predicts the missing square
  // tightly. Missing squares still must pass every locateMark filter — a
  // prediction is never substituted for a measurement.
  if (missing.length && salvage && detected.length >= 2) {
    const physical = detected.map(found => {
      const def = marks.find(candidate => candidate.id === found.id)!;
      return { x: def.x + def.width / 2, y: def.y + def.height / 2 };
    });
    try {
      const refit = fitHomographyLeastSquares([...salvage.mm, ...physical],
        [...salvage.px, ...detected.map(found => ({ x: found.center.x, y: found.center.y }))]);
      const still: typeof missing = [];
      for (const entry of missing) {
        let found: DetectedAlignmentMark | null = null;
        try {
          const result = locateMark(image, entry.mark, refit, qrCenter);
          if (result.ok) found = result.mark;
          else entry.reasons.push(result.reason);
        } catch (error) { entry.lastError = error; }
        if (found && !accept(found)) continue;
        still.push(entry);
      }
      missing.length = 0;
      missing.push(...still);
    } catch { /* first-pass reasons stand */ }
  }
  if (missing.length) {
    for (const entry of missing) {
      if (entry.lastError !== undefined && !entry.reasons.length) throw entry.lastError;
      onFailure?.({ markId: entry.mark.id, reason: [...new Set(entry.reasons)].join(' · ') || 'bulunamadı' });
    }
    return null;
  }
  return marks.map(mark => detected.find(found => found.id === mark.id)!);
}

/** Turns detector failures into one actionable Turkish sentence. */
export function describeAlignmentFailures(failures: readonly AlignmentFailure[]): string {
  const base = 'Dört siyah hizalama karesi ayrı ayrı bulunamadı; sayfanın tamamı görünmeli.';
  if (!failures.length) return base;
  const labels: Record<string, string> = {
    'top-left': 'sol üst', 'top-right': 'sağ üst', 'bottom-left': 'sol alt', 'bottom-right': 'sağ alt',
  };
  const detail = failures.map(failure =>
    `${labels[failure.markId] ?? failure.markId} kare: ${failure.reason}`).join(' | ');
  return `${base} Bulunamayan ${failures.length} kare var — ${detail}. ` +
    'Kâğıdın dört köşesi de kadrajda olacak şekilde, gölgesiz ve sayfaya dik açıdan yeniden çekin.';
}

type Head = {
  count: number;
  cx: number;
  cy: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/**
 * Largest square window around the component's centroid that still holds the printed square.
 *
 * A marker can be connected to a shadow gradient, a rule line or the paper edge at the search
 * threshold; the whole component is then much larger than 5 mm, but the ink around the centroid is
 * still the mark. The window side comes from the component's *shorter* bounding-box side, so a
 * square merged with a line keeps a square window and a large shadow keeps a large one, which the
 * caller then rejects on ink density. The window is never smaller than 0.8 of a printed square, so
 * a speck of dust cannot be promoted to a page anchor, and the caller still applies the 0.84
 * square-fill test, so a rounded blob cannot replace a square.
 */
function squareWindow(component: Int32Array, count: number, width: number, cx: number, cy: number, area: number): Head | null {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let index = 0; index < count; index++) {
    const at = component[index]!, x = at % width, y = Math.floor(at / width);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const span = Math.sqrt(area);
  const box = Math.min(maxX - minX + 1, maxY - minY + 1);
  if (box < span * .5) return null;
  const side = Math.max(span * .8, Math.min(box, span * 2.2));
  let best: Head | null = null;
  for (let offsetY = -1; offsetY <= 1; offsetY++) for (let offsetX = -1; offsetX <= 1; offsetX++) {
    const centerX = cx + offsetX * side * .3, centerY = cy + offsetY * side * .3;
    const left = Math.round(centerX - side / 2), top = Math.round(centerY - side / 2);
    const right = left + Math.round(side) - 1, bottom = top + Math.round(side) - 1;
    let inside = 0, sumX = 0, sumY = 0;
    let headMinX = Infinity, headMaxX = -Infinity, headMinY = Infinity, headMaxY = -Infinity;
    for (let index = 0; index < count; index++) {
      const at = component[index]!, x = at % width, y = Math.floor(at / width);
      if (x < left || x > right || y < top || y > bottom) continue;
      inside++;
      sumX += x; sumY += y;
      headMinX = Math.min(headMinX, x); headMaxX = Math.max(headMaxX, x);
      headMinY = Math.min(headMinY, y); headMaxY = Math.max(headMaxY, y);
    }
    if (!inside || (best && inside <= best.count)) continue;
    best = { count: inside, cx: sumX / inside, cy: sumY / inside, left, top, right, bottom,
      minX: headMinX, minY: headMinY, maxX: headMaxX, maxY: headMaxY };
  }
  return best;
}

/** Fraction of dark pixels among the thin frame just outside the square. An ink-free frame means the
 * square is not merged with a shadow, a rule line or any other ink that reaches past its footprint. */
function marginInkFraction(
  image: GrayImage, left: number, top: number, width: number, height: number, head: Head, threshold: number,
): number {
  let ink = 0, total = 0;
  const margin = MARGIN_PX, limit = threshold * 1.25;
  const left0 = Math.max(head.minX - margin, 0), right0 = Math.min(head.maxX + margin, width - 1);
  const top0 = Math.max(head.minY - margin, 0), bottom0 = Math.min(head.maxY + margin, height - 1);
  const sample = (x: number, y: number) => {
    total++;
    if (image.data[(top + y) * image.width + left + x]! <= limit) ink++;
  };
  for (let x = left0; x <= right0; x += 2) { sample(x, top0); sample(x, bottom0); }
  for (let y = top0; y <= bottom0; y += 2) { sample(left0, y); sample(right0, y); }
  return total ? ink / total : 1;
}
