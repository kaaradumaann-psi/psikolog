import type { GrayImage, PixelImage, Point } from '../omr/omrTypes';
import { toGrayscale } from '../omr/imageQuality';
import { fitHomography, warpPerspective } from '../omr/perspectiveCorrection';
import { normalizeShadows } from './shadowNormalization';
import { stretchContrast } from './enhancement';
import { detectDocumentQuad } from './documentDetection';
import type { DocumentQuad } from './documentDetection';

/**
 * CamScanner-style automatic capture pipeline, run *before* the existing OMR engine.
 *
 *   RAW PHOTO → DOCUMENT DETECTION → 4 OUTER CORNERS → CROP → PERSPECTIVE CORRECTION
 *   → A4 GEOMETRY → SHADOW NORMALIZATION → WHITE DOCUMENT FILTER → CONTRAST → SHARPEN
 *   → CLEAN FORM → existing `analyzePage`
 *
 * Design rules this module follows:
 *
 *  • It never replaces or duplicates OMR geometry. The quadrilateral here is the *paper outline*;
 *    the four printed MMPI alignment squares are still found by `omr/alignmentDetector` on the
 *    cleaned image, and the final page transform is still fitted from those squares. This stage
 *    only has to hand OMR an image that looks like a flatbed scan.
 *  • It reuses the existing `fitHomography` + `warpPerspective` pair (the same maths the manual
 *    corner editor uses) rather than introducing a second warp implementation.
 *  • It reuses `normalizeShadows` (previously written but never called from production) and
 *    `stretchContrast` from `scanner/enhancement`.
 *  • The automatic path degrades to "return the input unchanged" rather than failing, so an
 *    already-cropped scan or a flat PDF render is passed straight through to OMR as before.
 *
 * Automatic detection is the main path; the manual four-corner editor stays as the fallback for
 * the cases where `detectDocumentQuad` returns null or the OMR re-read still fails.
 */

export type DocumentScanStage =
  | 'detect' | 'warp' | 'shadow' | 'white' | 'contrast' | 'sharpen';

export type DocumentScanResult = {
  /** Cleaned, rectified page as RGBA, ready to hand to `analyzePage`. */
  image: PixelImage;
  /** The detected paper quadrilateral in source pixels, or null when detection did not fire. */
  quad: DocumentQuad | null;
  /** True when a perspective correction was actually applied. */
  warped: boolean;
  /** Output resolution in pixels per millimetre of the canonical page. */
  pixelsPerMm: number;
  /** Stages that ran, in order. */
  stages: DocumentScanStage[];
  /** Human-readable Turkish note for the UI/diagnostics. */
  note: string;
};

export type DocumentScanOptions = {
  /** Canonical page size. Defaults to A4. */
  pageWidthMm?: number;
  pageHeightMm?: number;
  /**
   * Output resolution. Defaults to an adaptive value: enough to clear the OMR quality gate
   * (4 px/mm) with headroom, without inventing detail a 960×1280 phone photo does not have.
   */
  pixelsPerMm?: number;
  /** Skip detection and use these corners instead (TL, TR, BR, BL) — used by the manual path. */
  corners?: readonly [Point, Point, Point, Point];
  /** Disable the photographic cleanup (debugging / stage inspection). */
  enhance?: boolean;
  /**
   * Photographic cleanup level. 'full' = shadow → white filter → contrast → sharpen (best for
   * OMR bubble reading), 'shadow' = shadow normalisation only (keeps the QR code decodable on
   * upscaled low-resolution captures), 'none' = raw warped grayscale (QR last resort).
   * `enhance: false` is equivalent to 'none'.
   */
  clean?: 'full' | 'shadow' | 'none';
};

/** Hard ceiling shared with the OMR warp so an oversized request cannot allocate wildly. */
const MAX_OUTPUT_PIXELS = 8_000_000;

/**
 * Choose the output resolution.
 *
 * Upscaling does not create information, so the target is driven by how many source pixels the
 * sheet actually occupies: we keep roughly the sheet's own sampling density, clamped into a band
 * where the OMR engine is known to work. The lower clamp matters because `analyzePage` rejects
 * anything under 4 px/mm outright — a 960×1280 capture of a sheet is ~4.3 px/mm across the short
 * edge *once the desk is cropped away*, which is exactly the information the raw-frame path threw
 * away by measuring density over the whole frame instead of over the page.
 */
export function chooseOutputResolution(quad: DocumentQuad | null, source: { width: number; height: number },
  pageWidthMm: number, pageHeightMm: number): number {
  const corners = quad?.corners;
  let shortSidePx: number, longSidePx: number;
  if (corners) {
    const edges = corners.map((point, index) => {
      const next = corners[(index + 1) % 4]!;
      return Math.hypot(next.x - point.x, next.y - point.y);
    });
    // Opposite edges average out perspective foreshortening.
    const a = (edges[0]! + edges[2]!) / 2, b = (edges[1]! + edges[3]!) / 2;
    shortSidePx = Math.min(a, b); longSidePx = Math.max(a, b);
  } else {
    shortSidePx = Math.min(source.width, source.height);
    longSidePx = Math.max(source.width, source.height);
  }
  const shortMm = Math.min(pageWidthMm, pageHeightMm), longMm = Math.max(pageWidthMm, pageHeightMm);
  const native = Math.min(shortSidePx / shortMm, longSidePx / longMm);
  // Below ~4.6 px/mm the bubble rings get too soft for the ring refinement, so we upsample a
  // little; above 8 px/mm there is nothing to gain because the OMR canonical raster is 8 px/mm.
  const target = Math.max(4.6, Math.min(8, native * 1.15));
  const pixels = pageWidthMm * pageHeightMm * target * target;
  return pixels > MAX_OUTPUT_PIXELS ? Math.sqrt(MAX_OUTPUT_PIXELS / (pageWidthMm * pageHeightMm)) : target;
}

/**
 * Rotate the corner order so the sheet's long edge maps onto the canonical long edge.
 *
 * A phone held in portrait over a landscape sheet yields corners whose TL→TR runs along the
 * paper's *long* edge; mapping that onto the 210 mm canonical width squeezes the page
 * anamorphically and the alignment squares come out rectangular. `scanner/manualWarp` already
 * solves this for user-picked corners; the same rule applies to automatically detected ones.
 */
export function orientToPage(corners: readonly [Point, Point, Point, Point],
  pageWidthMm: number, pageHeightMm: number): [Point, Point, Point, Point] {
  const top = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
  const left = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
  const pageIsPortrait = pageHeightMm >= pageWidthMm;
  const quadIsPortrait = left >= top;
  if (pageIsPortrait === quadIsPortrait) return [corners[0], corners[1], corners[2], corners[3]];
  // Rotating by one position swaps which adjacent edge is "top" while preserving the winding
  // direction, so the homography stays un-mirrored.
  return [corners[1], corners[2], corners[3], corners[0]];
}

/**
 * Push the detected quad a couple of percent outward from its centroid (clamped to the frame).
 *
 * Detection hugs the paper edge, sometimes shaving a sliver of the sheet; `analyzePage` treats a
 * printed feature falling outside the capture as fatal (PAGE_CROPPED) while a thin extra margin
 * is harmless — the OMR page transform is re-fitted from the printed alignment squares, not from
 * this quad. Over-including is therefore strictly safer than under-including.
 */
export function expandQuadOutward(corners: [Point, Point, Point, Point], width: number, height: number, fraction = 0.02): [Point, Point, Point, Point] {
  const cx = corners.reduce((sum, p) => sum + p.x, 0) / 4;
  const cy = corners.reduce((sum, p) => sum + p.y, 0) / 4;
  return corners.map(point => ({
    x: Math.max(0, Math.min(width - 1, point.x + (point.x - cx) * fraction)),
    y: Math.max(0, Math.min(height - 1, point.y + (point.y - cy) * fraction)),
  })) as [Point, Point, Point, Point];
}

/**
 * True when the capture already is a rectified flat scan rather than a sheet photographed on a
 * background: either every corner sits at a frame corner (full-bleed output of another scanner
 * app), or the quad is axis-aligned and covers essentially the whole frame (a scan whose margins
 * another app trimmed, so forcing it through the A4 warp would anamorphically stretch it).
 * Warping or re-cleaning such images would only resample and alter what the OMR engine reads.
 */
function isFullBleed(corners: readonly [Point, Point, Point, Point], width: number, height: number): boolean {
  const mx = width * 0.05, my = height * 0.05;
  const atCorners = corners.every(point => {
    const nearX = point.x <= mx || point.x >= width - 1 - mx;
    const nearY = point.y <= my || point.y >= height - 1 - my;
    return nearX && nearY;
  });
  if (atCorners) return true;
  let area = 0, maxTilt = 0;
  for (let i = 0; i < 4; i++) {
    const a = corners[i]!, b = corners[(i + 1) % 4]!;
    area += a.x * b.y - b.x * a.y;
    const degrees = Math.abs(Math.atan2(b.y - a.y, b.x - a.x)) * 180 / Math.PI;
    maxTilt = Math.max(maxTilt, Math.min(degrees % 90, 90 - (degrees % 90)));
  }
  const ratio = Math.abs(area) / 2 / (width * height);
  return ratio >= 0.88 && maxTilt <= 1.5;
}

/**
 * WHITE DOCUMENT FILTER — the "scanned paper" look.
 *
 * Maps the local paper background to pure white while keeping ink dark, using a division-based
 * (rather than subtraction-based) illumination model: reflectance = pixel / illumination. A
 * subtraction — which is what `normalizeShadows` does — corrects the additive offset but leaves
 * grey paper grey; division renormalises every region to the same white point, which is what
 * makes a shadowed corner read as clean paper instead of grey paper.
 *
 * The white point is a high percentile of the local background rather than its mean, so text does
 * not drag the paper level down. `floor` keeps deep ink from being bleached: values below it are
 * compressed, not clipped, so a filled bubble stays a filled bubble.
 */
export function whiteDocumentFilter(image: GrayImage, strength = 1): GrayImage {
  const longSide = Math.max(image.width, image.height);
  const radius = Math.max(4, Math.round(longSide * 0.04));
  const background = localMaximumBackground(image, radius);
  const data = new Uint8Array(image.data.length);
  for (let i = 0; i < data.length; i++) {
    const illumination = Math.max(1, background[i]!);
    const reflectance = (image.data[i]! / illumination) * 255;
    // Blend with the original so the filter can be softened rather than being all-or-nothing.
    const value = image.data[i]! * (1 - strength) + reflectance * strength;
    data[i] = value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
  }
  return { width: image.width, height: image.height, data };
}

/**
 * Estimate the illumination field as a blurred *local high percentile* of the image — i.e. what
 * the paper would look like with the print removed. A plain blur would be pulled down by dense
 * bubble grids and read them as shadow.
 */
function localMaximumBackground(image: GrayImage, radius: number): Uint8Array {
  const { width, height, data } = image;
  // Downsample to a coarse grid, take a high percentile per cell, then bilinearly upsample. This
  // is O(N) and immune to the print, unlike a true sliding-window percentile.
  const cell = Math.max(4, Math.round(radius / 2));
  const gridW = Math.max(1, Math.ceil(width / cell)), gridH = Math.max(1, Math.ceil(height / cell));
  const coarse = new Float32Array(gridW * gridH);
  const bucket: number[] = [];
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const x0 = gx * cell, x1 = Math.min(width, x0 + cell);
      const y0 = gy * cell, y1 = Math.min(height, y0 + cell);
      bucket.length = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) bucket.push(data[y * width + x]!);
      if (!bucket.length) { coarse[gy * gridW + gx] = 255; continue; }
      bucket.sort((a, b) => a - b);
      // 80th percentile: above the print, below specular highlights.
      coarse[gy * gridW + gx] = bucket[Math.min(bucket.length - 1, Math.floor(bucket.length * 0.8))]!;
    }
  }
  // Smooth the coarse field so the correction has no cell-sized steps.
  const smoothRadius = Math.max(1, Math.round(radius / cell));
  const smoothed = blurFloat(coarse, gridW, gridH, smoothRadius);
  const out = new Uint8Array(data.length);
  for (let y = 0; y < height; y++) {
    const fy = Math.min(gridH - 1, Math.max(0, (y + 0.5) / cell - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(gridH - 1, y0 + 1), wy = fy - y0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(gridW - 1, Math.max(0, (x + 0.5) / cell - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(gridW - 1, x0 + 1), wx = fx - x0;
      const top = smoothed[y0 * gridW + x0]! * (1 - wx) + smoothed[y0 * gridW + x1]! * wx;
      const bottom = smoothed[y1 * gridW + x0]! * (1 - wx) + smoothed[y1 * gridW + x1]! * wx;
      const value = top * (1 - wy) + bottom * wy;
      out[y * width + x] = value < 1 ? 1 : value > 255 ? 255 : Math.round(value);
    }
  }
  return out;
}

function blurFloat(input: Float32Array, width: number, height: number, radius: number): Float32Array {
  if (radius < 1) return input;
  const window = 2 * radius + 1;
  const horizontal = new Float32Array(input.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let i = -radius; i <= radius; i++) sum += input[row + Math.max(0, Math.min(width - 1, i))]!;
    for (let x = 0; x < width; x++) {
      horizontal[row + x] = sum / window;
      sum += input[row + Math.min(width - 1, x + radius + 1)]! - input[row + Math.max(0, x - radius)]!;
    }
  }
  const out = new Float32Array(input.length);
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let i = -radius; i <= radius; i++) sum += horizontal[Math.max(0, Math.min(height - 1, i)) * width + x]!;
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / window;
      sum += horizontal[Math.min(height - 1, y + radius + 1) * width + x]! - horizontal[Math.max(0, y - radius) * width + x]!;
    }
  }
  return out;
}

/**
 * Unsharp mask with a radius tied to the image size (rather than a fixed 3×3), so the bubble
 * outlines of an upscaled low-resolution capture actually get crisper. `threshold` suppresses
 * amplification of flat-paper JPEG noise, which is what made the old fixed-amount sharpen add
 * grain on real photos.
 */
export function sharpen(image: GrayImage, amount = 0.6, radius = 1, threshold = 4): GrayImage {
  const blurred = blurGray(image, radius);
  const data = new Uint8Array(image.data.length);
  for (let i = 0; i < data.length; i++) {
    const original = image.data[i]!;
    const difference = original - blurred[i]!;
    const value = Math.abs(difference) < threshold ? original : original + difference * amount;
    data[i] = value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
  }
  return { width: image.width, height: image.height, data };
}

function blurGray(image: GrayImage, radius: number): Uint8Array {
  const asFloat = Float32Array.from(image.data);
  const blurred = blurFloat(asFloat, image.width, image.height, radius);
  return Uint8Array.from(blurred, value => Math.round(value));
}

/**
 * Geometry-preserving isotropic resample (bilinear). Unlike a quad warp this injects no
 * projective distortion: a nearly-flat capture keeps the exact geometry its printed features
 * already agree on, and only gains sampling density so the OMR quality gate (4 px/mm) can be
 * cleared. Used as the last-resort strategy for low-resolution captures whose raw geometry is
 * consistent but whose detected quad is too noisy to warp with.
 */
export function isotropicUpscale(image: GrayImage, scale: number): GrayImage {
  if (scale <= 1) return image;
  const width = Math.round(image.width * scale), height = Math.round(image.height * scale);
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(image.height - 1, (y + 0.5) / scale - 0.5);
    const y0 = Math.floor(sy), y1 = Math.min(image.height - 1, y0 + 1), dy = sy - y0;
    for (let x = 0; x < width; x++) {
      const sx = Math.min(image.width - 1, (x + 0.5) / scale - 0.5);
      const x0 = Math.floor(sx), x1 = Math.min(image.width - 1, x0 + 1), dx = sx - x0;
      const top = image.data[y0 * image.width + x0]! * (1 - dx) + image.data[y0 * image.width + x1]! * dx;
      const bottom = image.data[y1 * image.width + x0]! * (1 - dx) + image.data[y1 * image.width + x1]! * dx;
      data[y * width + x] = Math.round(top * (1 - dy) + bottom * dy);
    }
  }
  return { width, height, data };
}

/** Wrap a grayscale page as RGBA so it can go straight into `analyzePage`. */
export function grayToPixelImage(image: GrayImage): PixelImage {
  const data = new Uint8ClampedArray(image.width * image.height * 4);
  for (let i = 0; i < image.data.length; i++) {
    const value = image.data[i]!;
    data[i * 4] = value; data[i * 4 + 1] = value; data[i * 4 + 2] = value; data[i * 4 + 3] = 255;
  }
  return { width: image.width, height: image.height, data };
}

/**
 * The photographic cleanup half of the pipeline: shadow normalisation → white document filter →
 * contrast → sharpen, applied to an already-rectified page.
 */
export function cleanDocument(image: GrayImage, level: 'full' | 'shadow' | 'none' = 'full'): { image: GrayImage; stages: DocumentScanStage[] } {
  if (level === 'none') return { image, stages: [] };
  const stages: DocumentScanStage[] = [];
  // 1. SHADOW NORMALIZATION — remove the additive illumination gradient (reuses the existing,
  //    previously-uncalled `normalizeShadows`).
  const flattened = normalizeShadows(image, { force: true, radiusFraction: 0.08 });
  stages.push('shadow');
  if (level === 'shadow') return { image: flattened, stages };
  // 2. WHITE DOCUMENT FILTER — renormalise the paper to white multiplicatively.
  const whitened = whiteDocumentFilter(flattened, 1);
  stages.push('white');
  // 3. CONTRAST — global percentile stretch (existing `stretchContrast`). The high anchor is
  //    pushed out to 0.995 so the paper does not clip before the ink does.
  const contrasted = stretchContrast(whitened, 0.02, 0.995);
  stages.push('contrast');
  // 4. SHARPEN — recover bubble outlines softened by the warp's bilinear resampling.
  const sharpened = sharpen(contrasted, 0.6, 1, 4);
  stages.push('sharpen');
  return { image: sharpened, stages };
}

/**
 * Run the full automatic scan. Always returns an image: when no sheet can be found the original
 * capture is passed through (grayscale) so the existing OMR behaviour on flat scans and PDF
 * renders is preserved exactly.
 */
export function autoScanDocument(source: PixelImage, options: DocumentScanOptions = {}): DocumentScanResult {
  const pageWidthMm = options.pageWidthMm ?? 210;
  const pageHeightMm = options.pageHeightMm ?? 297;
  const cleanLevel = options.clean ?? (options.enhance === false ? 'none' : 'full');
  const gray = toGrayscale(source);
  const stages: DocumentScanStage[] = [];
  let quad: DocumentQuad | null = null;
  let corners = options.corners ? [...options.corners] as [Point, Point, Point, Point] : null;
  if (!corners) {
    quad = detectDocumentQuad(gray);
    stages.push('detect');
    if (quad) corners = [...quad.corners] as [Point, Point, Point, Point];
  }
  if (!corners) {
    // No sheet found — hand the untouched capture to OMR, exactly as before this stage existed.
    const cleaned = cleanDocument(gray, cleanLevel);
    return {
      image: grayToPixelImage(cleaned.image), quad: null, warped: false,
      pixelsPerMm: 0, stages: [...stages, ...cleaned.stages],
      note: 'Belge sınırı otomatik bulunamadı; görüntü olduğu gibi işlendi.',
    };
  }
  if (isFullBleed(corners, source.width, source.height) && options.pixelsPerMm === undefined && cleanLevel === 'full') {
    // Already a rectified full-bleed scan at the default setting: warping or re-cleaning would
    // only resample and alter an image the OMR engine already reads, so it is handed over exactly
    // as captured. This also preserves the existing results of scans produced by other apps
    // bit-for-bit. Explicit resolution/cleanup overrides (the strategy ladder) still warp, so a
    // full-frame *photo* keeps its upscale rescue on the later strategies.
    return {
      image: grayToPixelImage(gray), quad, warped: false, pixelsPerMm: 0,
      stages, note: 'Belge zaten tam sayfa taranmış; dönüştürme uygulanmadı.',
    };
  }
  const pixelsPerMm = options.pixelsPerMm ?? chooseOutputResolution(quad, source, pageWidthMm, pageHeightMm);
  const oriented = orientToPage(corners, pageWidthMm, pageHeightMm);
  const destination: Point[] = [
    { x: 0, y: 0 }, { x: pageWidthMm, y: 0 },
    { x: pageWidthMm, y: pageHeightMm }, { x: 0, y: pageHeightMm },
  ];
  let warpedGray: GrayImage;
  try {
    // CROP + PERSPECTIVE CORRECTION in one step: the homography maps canonical millimetres to
    // source pixels, and `warpPerspective` inverse-samples only inside the quad — so everything
    // outside the sheet is cropped away by construction. Same `fitHomography`/`warpPerspective`
    // pair the OMR engine and the manual editor already use.
    const physicalToSource = fitHomography(destination, oriented);
    warpedGray = warpPerspective(gray, physicalToSource, pageWidthMm, pageHeightMm, pixelsPerMm);
    stages.push('warp');
  } catch {
    const cleaned = cleanDocument(gray, cleanLevel);
    return {
      image: grayToPixelImage(cleaned.image), quad, warped: false, pixelsPerMm: 0,
      stages: [...stages, ...cleaned.stages],
      note: 'Perspektif düzeltmesi uygulanamadı; görüntü olduğu gibi işlendi.',
    };
  }
  const cleaned = cleanDocument(warpedGray, cleanLevel);
  return {
    image: grayToPixelImage(cleaned.image), quad, warped: true, pixelsPerMm,
    stages: [...stages, ...cleaned.stages],
    note: `Belge otomatik bulundu ve düzleştirildi (${pixelsPerMm.toFixed(1)} px/mm).`,
  };
}
