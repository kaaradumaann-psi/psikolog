import type { GrayImage, Point } from './omrTypes';

/** Row-major matrix mapping physical millimetres to source pixel centres. */
export type Homography = [number, number, number, number, number, number, number, number, number];
export const CANONICAL_PIXELS_PER_MM = 8;
export const MAX_WARP_PIXELS = 8_000_000;

function multiply(a: Homography, b: Homography): Homography {
  return Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3), col = i % 3;
    return a[row * 3]! * b[col]! + a[row * 3 + 1]! * b[col + 3]! + a[row * 3 + 2]! * b[col + 6]!;
  }) as Homography;
}

function normalize(points: readonly Point[]) {
  if (points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error('Non-finite point');
  const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const rms = Math.sqrt(points.reduce((sum, p) => sum + (p.x - x) ** 2 + (p.y - y) ** 2, 0) / points.length);
  if (rms < 1e-8) throw new Error('Degenerate points');
  const scale = Math.SQRT2 / rms;
  return {
    points: points.map(p => ({ x: (p.x - x) * scale, y: (p.y - y) * scale })),
    matrix: [scale, 0, -x * scale, 0, scale, -y * scale, 0, 0, 1] as Homography,
    inverse: [1 / scale, 0, x, 0, 1 / scale, y, 0, 0, 1] as Homography,
  };
}

/** Four correspondences, normalized coordinates and partial-pivot elimination. Throws on degeneracy. */
export function fitHomography(from: readonly Point[], to: readonly Point[]): Homography {
  if (from.length !== 4 || to.length !== 4) throw new Error('Four correspondences required');
  const source = normalize(from), target = normalize(to);
  const rows: number[][] = [];
  source.points.forEach(({ x, y }, i) => {
    const { x: u, y: v } = target.points[i]!;
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let row = col + 1; row < 8; row++) if (Math.abs(rows[row]![col]!) > Math.abs(rows[pivot]![col]!)) pivot = row;
    if (Math.abs(rows[pivot]![col]!) < 1e-9) throw new Error('Singular homography');
    [rows[col], rows[pivot]] = [rows[pivot]!, rows[col]!];
    const divisor = rows[col]![col]!;
    for (let j = col; j <= 8; j++) rows[col]![j] = rows[col]![j]! / divisor;
    for (let row = 0; row < 8; row++) {
      if (row === col) continue;
      const factor = rows[row]![col]!;
      for (let j = col; j <= 8; j++) rows[row]![j] = rows[row]![j]! - factor * rows[col]![j]!;
    }
  }
  const fitted = [...rows.map(row => row[8]!), 1] as Homography;
  const result = multiply(multiply(target.inverse, fitted), source.matrix);
  if (Math.abs(result[8]) < 1e-10) throw new Error('Projective horizon at origin');
  return result.map(value => value / result[8]) as Homography;
}

/**
 * Least-squares projective fit from N >= 4 correspondences (normalized DLT).
 * Used to *predict* the remaining alignment squares once some are detected:
 * the detected 5 mm squares span the whole sheet, so unlike a QR-only fit they
 * constrain the projective terms, and the QR corners still anchor the far end.
 * Never used as the page transform itself — that stays fitted from the four
 * detected centres. Throws on fewer than four, mismatched or degenerate points.
 */
export function fitHomographyLeastSquares(from: readonly Point[], to: readonly Point[]): Homography {
  if (from.length !== to.length || from.length < 4) throw new Error('At least four correspondences required');
  const source = normalize(from), target = normalize(to);
  const rows: number[][] = [];
  source.points.forEach(({ x, y }, i) => {
    const { x: u, y: v } = target.points[i]!;
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  const n = 8;
  const normal = Array.from({ length: n }, () => new Array<number>(n + 1).fill(0));
  for (const row of rows) {
    for (let a = 0; a < n; a++) {
      const ra = row[a]!;
      if (!ra) continue;
      const line = normal[a]!;
      for (let b = 0; b < n; b++) line[b] = line[b]! + ra * row[b]!;
      line[n] = line[n]! + ra * row[n]!;
    }
  }
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(normal[row]![col]!) > Math.abs(normal[pivot]![col]!)) pivot = row;
    if (Math.abs(normal[pivot]![col]!) < 1e-9) throw new Error('Singular homography');
    [normal[col], normal[pivot]] = [normal[pivot]!, normal[col]!];
    const divisor = normal[col]![col]!;
    for (let j = col; j <= n; j++) normal[col]![j] = normal[col]![j]! / divisor;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = normal[row]![col]!;
      for (let j = col; j <= n; j++) normal[row]![j] = normal[row]![j]! - factor * normal[col]![j]!;
    }
  }
  const fitted = [...normal.map(row => row[n]!), 1] as Homography;
  const result = multiply(multiply(target.inverse, fitted), source.matrix);
  if (Math.abs(result[8]) < 1e-10) throw new Error('Projective horizon at origin');
  return result.map(value => value / result[8]) as Homography;
}

/**
 * Least-squares similarity (uniform scale + rotation + translation) from N >= 2 correspondences.
 * A full 8-DOF homography fitted to four corners confined to a 26 mm symbol cannot constrain its
 * projective terms: sub-pixel corner noise is amplified into hundreds of pixels when extrapolated
 * across the sheet. This bounded 4-DOF estimate is an alternative *prediction* for locating the
 * printed squares, never the page transform itself, which stays fitted from the four detected
 * centres. Throws on fewer than two, mismatched or degenerate correspondences.
 */
export function fitSimilarity(from: readonly Point[], to: readonly Point[]): Homography {
  if (from.length !== to.length || from.length < 2) throw new Error('At least two matched correspondences required');
  if (from.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y)) ||
    to.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error('Non-finite point');
  const count = from.length;
  const meanX = from.reduce((sum, p) => sum + p.x, 0) / count, meanY = from.reduce((sum, p) => sum + p.y, 0) / count;
  const meanU = to.reduce((sum, p) => sum + p.x, 0) / count, meanV = to.reduce((sum, p) => sum + p.y, 0) / count;
  let spread = 0, real = 0, imaginary = 0;
  for (let index = 0; index < count; index++) {
    const dx = from[index]!.x - meanX, dy = from[index]!.y - meanY;
    const du = to[index]!.x - meanU, dv = to[index]!.y - meanV;
    spread += dx * dx + dy * dy;
    real += dx * du + dy * dv;
    imaginary += dx * dv - dy * du;
  }
  if (spread < 1e-8) throw new Error('Degenerate points');
  const a = real / spread, b = imaginary / spread;
  return [a, -b, meanU - a * meanX + b * meanY, b, a, meanV - b * meanX - a * meanY, 0, 0, 1];
}

export function mapPoint(matrix: Homography, point: Point): Point {
  const [a, b, c, d, e, f, g, h, i] = matrix;
  const denominator = g * point.x + h * point.y + i;
  if (Math.abs(denominator) < 1e-10) throw new Error('Point on projective horizon');
  const mapped = { x: (a * point.x + b * point.y + c) / denominator, y: (d * point.x + e * point.y + f) / denominator };
  if (!Number.isFinite(mapped.x) || !Number.isFinite(mapped.y)) throw new Error('Non-finite projection');
  return mapped;
}

export function pageCorners(widthMm: number, heightMm: number): Point[] {
  return [{ x: 0, y: 0 }, { x: widthMm, y: 0 }, { x: widthMm, y: heightMm }, { x: 0, y: heightMm }];
}

/** Page edge loss below this is raster rounding, not a missing strip of paper. A caller that knows
 * the layout may widen it, but never past MAX_CROP_TOLERANCE_MM nor past half the distance from
 * the page edge to the nearest printed feature. */
export const CROP_TOLERANCE_MM = 2;
export const MAX_CROP_TOLERANCE_MM = 6;

/** Conservative provisional limits; rotations are allowed, reflections and strong foreshortening are not. */
export function inspectPageGeometry(matrix: Homography, widthMm: number, heightMm: number, image: { width: number; height: number },
  cropToleranceMm: number = CROP_TOLERANCE_MM) {
  const sourceCorners = pageCorners(widthMm, heightMm).map(p => mapPoint(matrix, p));
  let minScale = Infinity, maxScale = 0, minDenominator = Infinity, maxDenominator = 0;
  for (let row = 0; row <= 4; row++) for (let col = 0; col <= 4; col++) {
    const x = col * widthMm / 4, y = row * heightMm / 4;
    const w = matrix[6] * x + matrix[7] * y + matrix[8];
    if (w <= 0) throw new Error('Projective horizon or reflection');
    minDenominator = Math.min(minDenominator, w);
    maxDenominator = Math.max(maxDenominator, w);
    const p = mapPoint(matrix, { x, y });
    const a = (matrix[0] - p.x * matrix[6]) / w, b = (matrix[1] - p.x * matrix[7]) / w;
    const c = (matrix[3] - p.y * matrix[6]) / w, d = (matrix[4] - p.y * matrix[7]) / w;
    const determinant = a * d - b * c;
    const trace = a * a + b * b + c * c + d * d;
    const discriminant = Math.sqrt(Math.max(0, trace * trace - 4 * determinant * determinant));
    const small = Math.sqrt(Math.max(0, (trace - discriminant) / 2));
    const large = Math.sqrt((trace + discriminant) / 2);
    if (determinant <= 0 || small < .01 || large / small > 2.1) throw new Error('Extreme perspective or reflection');
    minScale = Math.min(minScale, small);
    maxScale = Math.max(maxScale, large);
  }
  if (maxScale / minScale > 2.5 || minDenominator / maxDenominator < .45) throw new Error('Extreme perspective');
  // The tolerance is physical, not a subpixel fudge. A full-bleed digital page - a rendered PDF or
  // a borderless scan - puts the sheet edge exactly on the image border, so the fitted corner lands
  // a fraction of a pixel outside it and a fixed 1.5 px margin left under 2 px of headroom: every
  // such page was reported as cropped although nothing readable was missing. The tolerance is meant
  // to stay below the distance to the nearest printed feature, so a loss inside it cannot remove
  // anything readable, while genuinely cut sheets exceed it by a wide margin.
  if (!Number.isFinite(cropToleranceMm) || cropToleranceMm < 0) throw new Error('Invalid crop tolerance');
  // Measured against the true image border, so the reported loss is the real one; the tolerance only
  // decides whether that loss is rounding or a strip of paper that is actually missing.
  const overshoot = Math.max(0, ...sourceCorners.flatMap(p =>
    [-p.x, -p.y, p.x - image.width, p.y - image.height]));
  return { sourceCorners, pixelsPerMm: minScale, maxPixelsPerMm: maxScale,
    cropped: overshoot > minScale * cropToleranceMm, cropOvershootMm: overshoot / minScale };
}

/** Bilinear inverse sampling: each canonical pixel centre is mapped into the source. No canvas. */
export function warpPerspective(source: GrayImage, physicalToSource: Homography, widthMm: number, heightMm: number,
  pixelsPerMm = CANONICAL_PIXELS_PER_MM): GrayImage {
  const width = Math.round(widthMm * pixelsPerMm), height = Math.round(heightMm * pixelsPerMm);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width * height > MAX_WARP_PIXELS ||
    !Number.isFinite(pixelsPerMm) || pixelsPerMm <= 0 || source.width < 1 || source.height < 1 ||
    !Number.isInteger(source.width) || !Number.isInteger(source.height) || source.data.length !== source.width * source.height ||
    physicalToSource.some(value => !Number.isFinite(value))) throw new Error('Invalid or oversized warp');
  const data = new Uint8Array(width * height);
  const [a, b, c, d, e, f, g, h, i] = physicalToSource;
  for (let y = 0; y < height; y++) {
    const mmY = (y + .5) / pixelsPerMm;
    for (let x = 0; x < width; x++) {
      const mmX = (x + .5) / pixelsPerMm, w = g * mmX + h * mmY + i;
      const sx = (a * mmX + b * mmY + c) / w, sy = (d * mmX + e * mmY + f) / w;
      if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx < -.5 || sy < -.5 || sx > source.width - .5 || sy > source.height - .5) {
        data[y * width + x] = 255;
        continue;
      }
      const xx = Math.max(0, Math.min(source.width - 1, sx)), yy = Math.max(0, Math.min(source.height - 1, sy));
      const x0 = Math.floor(xx), y0 = Math.floor(yy), x1 = Math.min(x0 + 1, source.width - 1), y1 = Math.min(y0 + 1, source.height - 1);
      const dx = xx - x0, dy = yy - y0;
      const top = source.data[y0 * source.width + x0]! * (1 - dx) + source.data[y0 * source.width + x1]! * dx;
      const bottom = source.data[y1 * source.width + x0]! * (1 - dx) + source.data[y1 * source.width + x1]! * dx;
      data[y * width + x] = Math.round(top * (1 - dy) + bottom * dy);
    }
  }
  return { width, height, data };
}

/** A printed feature (mark, QR symbol or answer bubble) and its identity, for containment checks. */
export type PrintedFeature = { id: string; x: number; y: number; width: number; height: number };

export type FeatureContainment = {
  /** Smallest distance from any printed feature to the image border, in millimetres. Negative when
   * a printed feature reaches outside the capture, which is the only way page content can be lost. */
  minMarginMm: number;
  minMarginPx: number;
  /** The feature closest to (or outside) the border, or null when there are no features. */
  featureId: string | null;
  /** `left`, `right`, `top` or `bottom`, in image coordinates. */
  side: string | null;
};

/**
 * Whether every printed feature is inside the capture.
 *
 * This replaces "the sheet outline must fit in the frame" as the cropping test. A printed sheet can
 * legitimately lose a strip of *blank* margin — a borderless scan, a rendered PDF, a printer that
 * scales by 3% — and every item, bubble, corner square and QR code is still where the page frame
 * says it is, because the frame is fitted from those very squares. What must never happen is a
 * printed feature leaving the frame, so that is what is measured here, in millimetres so the result
 * does not depend on the capture resolution.
 */
export function inspectFeatureContainment(matrix: Homography, features: readonly PrintedFeature[],
  image: { width: number; height: number }, pixelsPerMm: number): FeatureContainment {
  const scale = Number.isFinite(pixelsPerMm) && pixelsPerMm > 0 ? pixelsPerMm : 1;
  let minMarginPx = Infinity, featureId: string | null = null, side: string | null = null;
  for (const feature of features) {
    const corners = [
      { x: feature.x, y: feature.y }, { x: feature.x + feature.width, y: feature.y },
      { x: feature.x + feature.width, y: feature.y + feature.height }, { x: feature.x, y: feature.y + feature.height },
    ].map(point => mapPoint(matrix, point));
    for (const corner of corners) {
      const distances: [string, number][] = [['left', corner.x], ['top', corner.y],
        ['right', image.width - corner.x], ['bottom', image.height - corner.y]];
      for (const [name, distance] of distances) {
        if (distance >= minMarginPx) continue;
        minMarginPx = distance; featureId = feature.id; side = name;
      }
    }
  }
  if (!Number.isFinite(minMarginPx)) return { minMarginMm: Infinity, minMarginPx: Infinity, featureId: null, side: null };
  return { minMarginMm: minMarginPx / scale, minMarginPx, featureId, side };
}
