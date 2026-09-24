import type { GrayImage, PixelImage, Point } from '../omr/omrTypes';
import { fitHomography, warpPerspective as omrWarpPerspective } from '../omr/perspectiveCorrection';

/**
 * Apply a four-corner manual perspective correction on top of the unaligned camera capture.
 *
 * The flow is intentionally kept separate from `analyzePage`: the user picks the four corners,
 * we map them onto the canonical A4 in physical millimetres, and we re-use the same
 * `fitHomography` + `warpPerspective` math that OMR already uses — no duplicated code, no new
 * dependency. The result is a perspective-corrected page that is *physically aligned with the
 * MMPI form*, so the existing `analyzePage` pipeline can run on it without any special path:
 * the QR + alignment squares fall inside the new frame and the downstream code is unchanged.
 *
 * Returns the warped GrayImage ready to be passed back into `analyzePage`, plus the fitted
 * homography so the caller can run geometry/containment checks if it wants to.
 */
export type ManualWarpInput = {
  /** The original, unprocessed camera capture — still RGBA. */
  source: PixelImage;
  /** Four corners in source pixel coordinates, ordered TL, TR, BR, BL. */
  corners: readonly [Point, Point, Point, Point];
  /** Canonical A4 size in millimetres. The MMPI form is exactly 210 × 297. */
  pageWidthMm: number;
  pageHeightMm: number;
  /** Output resolution; defaults to 8 px/mm, matching the rest of the pipeline. */
  pixelsPerMm?: number;
};

export type ManualWarpResult = {
  normalized: GrayImage;
  homography: ReturnType<typeof fitHomography>;
  /** Bounding box of the projected A4 corners inside the source, useful for diagnostics. */
  sourceBounds: { minX: number; minY: number; maxX: number; maxY: number };
};

/**
 * Build the four destination points on the canonical page. We honour the order the user picked
 * (TL/TR/BR/BL) so the warped page is consistent with the user's mental model: their TL goes
 * to the canonical TL, their BR goes to the canonical BR, etc. Reverse-order pairs produce a
 * mirrored page and are rejected up front — the caller should also reject them in the UI.
 */
function physicalDestinations(pageWidthMm: number, pageHeightMm: number): [Point, Point, Point, Point] {
  return [
    { x: 0, y: 0 },
    { x: pageWidthMm, y: 0 },
    { x: pageWidthMm, y: pageHeightMm },
    { x: 0, y: pageHeightMm },
  ];
}

/**
 * Project the four destination corners back into the source frame through the fitted homography,
 * and return their bounding box. Used only to surface a containment-style diagnostic to the
 * user — actual "did the warped page leave the source" check is done by `analyzePage`.
 */
function projectCornerBounds(homography: ReturnType<typeof fitHomography>,
  pageWidthMm: number, pageHeightMm: number): { minX: number; minY: number; maxX: number; maxY: number } {
  const dest = physicalDestinations(pageWidthMm, pageHeightMm);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const point of dest) {
    const a = homography[0]! * point.x + homography[1]! * point.y + homography[2]!;
    const b = homography[3]! * point.x + homography[4]! * point.y + homography[5]!;
    const w = homography[6]! * point.x + homography[7]! * point.y + homography[8]!;
    if (Math.abs(w) < 1e-10) throw new Error('Köşe projeksiyonu tanımsız.');
    const x = a / w, y = b / w;
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Köşe projeksiyonu sonlu değil.');
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/** Reject the most obvious malformed user input: coincident or non-finite corners. */
function validateCorners(corners: readonly Point[]): asserts corners is [Point, Point, Point, Point] {
  if (corners.length !== 4) throw new Error('Dört köşe gerekli.');
  for (const [index, corner] of corners.entries()) {
    if (!Number.isFinite(corner.x) || !Number.isFinite(corner.y)) {
      throw new Error(`${index + 1}. köşe sonlu bir konum içermiyor.`);
    }
  }
  // No two corners within 4 source pixels — too close to be a real corner.
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
    const dx = corners[a]!.x - corners[b]!.x, dy = corners[a]!.y - corners[b]!.y;
    if (dx * dx + dy * dy < 16) {
      throw new Error('Köşeler birbirine çok yakın; geçerli bir dörtgen oluşturulamıyor.');
    }
  }
  // Self-intersection guard: the polygon must be convex (or at least non-crossing). We test by
  // checking that the cross products of successive edges all have the same sign — a classic
  // sign-change indicates a bowtie/self-intersecting polygon.
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = corners[i]!, b = corners[(i + 1) % 4]!, c = corners[(i + 2) % 4]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross !== 0) {
      const current = cross > 0 ? 1 : -1;
      if (sign === 0) sign = current;
      else if (sign !== current) {
        throw new Error('Köşeler kendini kesen bir dörtgen oluşturuyor; sırayı kontrol edin.');
      }
    }
  }
  // In image coordinates TL → TR → BR → BL is counter-clockwise (positive signed area).
  // A consistently clockwise polygon is convex too, but mapping it to the canonical order would
  // mirror the page and silently swap D/Y columns. Reject the reflection explicitly.
  const signedArea = corners.reduce((sum, point, index) => {
    const next = corners[(index + 1) % 4]!;
    return sum + point.x * next.y - point.y * next.x;
  }, 0) / 2;
  if (signedArea <= 1e-6) throw new Error('Köşeler yansıtılmış veya ters sırada; TL/TR/BR/BL sırasını kullanın.');
}

/**
 * Normalise the corner order so the short adjacent edge lands on the canonical short edge.
 *
 * Phones are usually held in portrait while the A4 sheet lies in landscape: the user's visual
 * TL→TR then runs along the paper's LONG edge, and mapping it onto the canonical 210 mm edge
 * squeezes the page anamorphically — the alignment squares come out rectangular and the OMR
 * re-read fails with ALIGNMENT_MISSING even though the picks were accurate (reproduced on real
 * photos: same corners, one order reads, the long-edge-first order fails). Rotating the order
 * by one position swaps which adjacent edge is "top"; it preserves the counter-clockwise
 * orientation that `validateCorners` already enforced, so the homography direction is
 * unchanged. Pages picked upright are left untouched (their left edge is already the long one).
 * Only applied for portrait pages; a landscape form keeps the user's order.
 */
export function normalizeCornerOrder(
  corners: readonly [Point, Point, Point, Point],
  pageWidthMm: number,
  pageHeightMm: number,
): [Point, Point, Point, Point] {
  if (pageHeightMm <= pageWidthMm) return [corners[0], corners[1], corners[2], corners[3]];
  const [tl, tr, , bl] = corners;
  const topEdge = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const leftEdge = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  if (leftEdge >= topEdge) return [corners[0], corners[1], corners[2], corners[3]];
  return [corners[1], corners[2], corners[3], corners[0]];
}

/** Convert RGBA `PixelImage` to grayscale `GrayImage`. */
function rgbaToGray(image: PixelImage): GrayImage {
  if (image.data.length !== image.width * image.height * 4) {
    throw new Error('Kamera görüntüsü RGBA bekliyordu; biçim bozuk.');
  }
  const data = new Uint8Array(image.width * image.height);
  for (let i = 0; i < data.length; i++) {
    const at = i * 4;
    const alpha = image.data[at + 3]! / 255;
    data[i] = Math.round(image.data[at]! * 0.299 + image.data[at + 1]! * 0.587 + image.data[at + 2]! * 0.114) * alpha + 255 * (1 - alpha);
  }
  return { width: image.width, height: image.height, data };
}

/**
 * Run the user's four-corner correction end-to-end: validate, fit homography, warp, and return
 * a grayscale page ready for `analyzePage`. Throws (with a Turkish message) on every malformed
 * input the caller can produce.
 */
export function applyManualCorners(input: ManualWarpInput): ManualWarpResult {
  if (!input.source || !Number.isInteger(input.source.width) || !Number.isInteger(input.source.height) ||
    input.source.width < 1 || input.source.height < 1 ||
    !(input.source.data instanceof Uint8ClampedArray) ||
    input.source.data.length !== input.source.width * input.source.height * 4) {
    throw new Error('Kamera görüntüsü RGBA bekliyordu; biçim bozuk.');
  }
  if (!Number.isFinite(input.pageWidthMm) || !Number.isFinite(input.pageHeightMm) ||
    input.pageWidthMm <= 0 || input.pageHeightMm <= 0 || input.pageWidthMm > 1_000 || input.pageHeightMm > 1_000) {
    throw new Error('Sayfa boyutları geçersiz.');
  }
  if (input.pixelsPerMm !== undefined && (!Number.isFinite(input.pixelsPerMm) || input.pixelsPerMm <= 0)) {
    throw new Error('Çıktı çözünürlüğü geçersiz.');
  }
  validateCorners(input.corners);
  const corners = normalizeCornerOrder(input.corners, input.pageWidthMm, input.pageHeightMm);
  const dest = physicalDestinations(input.pageWidthMm, input.pageHeightMm);
  // `fitHomography(from, to)` returns a matrix that maps `from` → `to`. We want the matrix the
  // OMR warp consumes: physical millimetres → source pixels. So we fit mm → pixel.
  const physicalToSource = fitHomography(dest, corners);
  const sourceBounds = projectCornerBounds(physicalToSource, input.pageWidthMm, input.pageHeightMm);
  // A small (≤ 1e-6 px) negative projection is floating-point noise from the homography solve
  // — a perfect A4 corner lands at exactly (0, 0), not a hair outside it. Anything below that is
  // still inside the capture. Anything above it means the user really did drag a corner off the
  // sheet.
  const EPS = 1e-6;
  if (sourceBounds.minX < -EPS || sourceBounds.minY < -EPS ||
    sourceBounds.maxX > input.source.width + EPS || sourceBounds.maxY > input.source.height + EPS) {
    throw new Error('Seçilen köşeler kamera görüntüsünün dışına taşıyor; kağıdın tamamı kadrajda olmalı.');
  }
  const gray = rgbaToGray(input.source);
  const normalized = omrWarpPerspective(gray, physicalToSource, input.pageWidthMm, input.pageHeightMm, input.pixelsPerMm);
  return { normalized, homography: physicalToSource, sourceBounds };
}
