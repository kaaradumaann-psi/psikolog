import type { GrayImage, PixelImage } from '../omr/omrTypes';

/**
 * Visual-only post-processing applied to a normalised page for the preview pane.
 *
 * These modes do NOT feed back into OMR: the actual mark detection keeps using the unmodified
 * `normalized` gray image from `analyzePage`, which is the one OMR has always been calibrated
 * against. Each mode returns the **same dimensions** so the preview pane can swap them in place
 * without re-layouting.
 *
 * Each mode is a single, well-defined operation:
 *  - `original`     — identity (the unprocessed normalized page).
 *  - `enhanced`     — local contrast lift (CLAHE-lite) without losing the answer marks.
 *  - `gray`         — already grayscale; this is just a tag for the UI.
 *  - `bw`           — Sauvola-style binarisation that adapts to local background.
 *  - `contrast`     — global linear stretch to the 1st/99th percentile.
 *  - `omr`          — shadow-flattened, slightly sharpened, gamma-corrected — the variant a
 *                     human reviewer would normally pick when OMR quality is borderline.
 */
export type EnhancementMode = 'original' | 'enhanced' | 'gray' | 'bw' | 'contrast' | 'omr';

export const ENHANCEMENT_MODES: readonly EnhancementMode[] = ['original', 'enhanced', 'gray', 'bw', 'contrast', 'omr'];

export const ENHANCEMENT_LABELS: Record<EnhancementMode, string> = {
  original: 'Orijinal',
  enhanced: 'Geliştirilmiş',
  gray: 'Gri tonlama',
  bw: 'Siyah-beyaz',
  contrast: 'Yüksek kontrast',
  omr: 'OMR için optimize',
};

export const ENHANCEMENT_DESCRIPTIONS: Record<EnhancementMode, string> = {
  original: 'Tarayıcının hizalanmış çıktısı; başka işlem uygulanmaz.',
  enhanced: 'Yerel kontrast artışı ile soluk işaretleri öne çıkarır.',
  gray: 'Gri tonlama (zaten gri; sadece önizleme etiketi).',
  bw: 'Sauvola eşikleme ile net siyah-beyaz görüntü.',
  contrast: '1–99. yüzdelik germe ile genel kontrast artışı.',
  omr: 'Gölge flattening + hafif keskinleştirme + gamma düzeltmesi; OMR için en okunaklı varyant.',
};

function clone(image: GrayImage): GrayImage {
  return { width: image.width, height: image.height, data: new Uint8Array(image.data) };
}

/** Simple global histogram stretch using two percentile anchors. */
export function stretchContrast(image: GrayImage, lowPercent = 0.01, highPercent = 0.99): GrayImage {
  const histogram = new Uint32Array(256);
  for (let i = 0; i < image.data.length; i++) histogram[image.data[i]!]!++;
  const total = image.data.length;
  const lowTarget = Math.max(1, Math.floor(total * lowPercent));
  const highTarget = Math.max(lowTarget + 1, Math.floor(total * highPercent));
  let cumulative = 0, low = 0, high = 255;
  for (let value = 0; value < 256; value++) {
    cumulative += histogram[value]!;
    if (cumulative >= lowTarget) { low = value; break; }
  }
  cumulative = 0;
  for (let value = 0; value < 256; value++) {
    cumulative += histogram[value]!;
    if (cumulative >= highTarget) { high = value; break; }
  }
  if (high <= low) return clone(image);
  const scale = 255 / (high - low);
  const result = clone(image);
  for (let i = 0; i < result.data.length; i++) {
    const value = result.data[i]!;
    const stretched = Math.round((value - low) * scale);
    result.data[i] = stretched < 0 ? 0 : stretched > 255 ? 255 : stretched;
  }
  return result;
}

/**
 * Local contrast lift via a coarse tile histogram equalisation (CLAHE). Tiles are stitched with
 * bilinear blending so no visible grid artefacts appear at typical preview sizes.
 *
 * Each tile histogram is clipped before the CDF is built — without a limit, a nearly flat tile
 * (blank paper with camera or JPEG noise) gets a near-vertical CDF and the "enhancement"
 * amplifies that noise ×8 on real phone captures and banded shadow gradients into visible
 * streaks (measured on real photos during validation). The clipped mass is redistributed
 * uniformly over all bins, which preserves the local contrast lift on actual content while
 * capping noise gain at roughly `clipFactor`.
 */
export function enhanceLocal(image: GrayImage, tileSize = 64, clipFactor = 3): GrayImage {
  const tilesX = Math.max(1, Math.ceil(image.width / tileSize));
  const tilesY = Math.max(1, Math.ceil(image.height / tileSize));
  const maps: Uint8Array[] = [];
  for (let ty = 0; ty < tilesY; ty++) for (let tx = 0; tx < tilesX; tx++) {
    const left = tx * tileSize, top = ty * tileSize;
    const right = Math.min(image.width, left + tileSize);
    const bottom = Math.min(image.height, top + tileSize);
    const histogram = new Uint32Array(256);
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) histogram[image.data[y * image.width + x]!]!++;
    const total = (right - left) * (bottom - top);
    // CLAHE clip: cap every bin at `clipFactor` × the flat-histogram bin mass, then spread the
    // clipped mass evenly. Keeps the CDF monotone and ≤255 without ever boosting a flat tile
    // beyond the clip ratio.
    const clipLimit = Math.max(1, Math.round((total / 256) * clipFactor));
    let excess = 0;
    for (let v = 0; v < 256; v++) {
      const extra = histogram[v]! - clipLimit;
      if (extra > 0) { histogram[v] = clipLimit; excess += extra; }
    }
    const bonus = excess / 256;
    const map = new Uint8Array(256);
    let cumulative = 0;
    for (let v = 0; v < 256; v++) {
      cumulative += histogram[v]!;
      map[v] = Math.min(255, Math.round(((cumulative + bonus * (v + 1)) * 255) / total));
    }
    maps.push(map);
  }
  const result = clone(image);
  for (let y = 0; y < image.height; y++) {
    const gy = Math.min(tilesY - 1, y / tileSize);
    const ty0 = Math.floor(gy), ty1 = Math.min(tilesY - 1, ty0 + 1);
    const fy = gy - ty0;
    for (let x = 0; x < image.width; x++) {
      const gx = Math.min(tilesX - 1, x / tileSize);
      const tx0 = Math.floor(gx), tx1 = Math.min(tilesX - 1, tx0 + 1);
      const fx = gx - tx0;
      const value = image.data[y * image.width + x]!;
      const tl = maps[ty0 * tilesX + tx0]![value]!;
      const tr = maps[ty0 * tilesX + tx1]![value]!;
      const bl = maps[ty1 * tilesX + tx0]![value]!;
      const br = maps[ty1 * tilesX + tx1]![value]!;
      const top = tl * (1 - fx) + tr * fx;
      const bottom = bl * (1 - fx) + br * fx;
      result.data[y * image.width + x] = Math.round(top * (1 - fy) + bottom * fy);
    }
  }
  return result;
}

/** Sauvola-style adaptive binarisation. */
export function binarize(image: GrayImage, window = 31, k = 0.2, fallback = 200): GrayImage {
  if (window % 2 === 0) window += 1;
  const half = (window - 1) >> 1;
  // Integral image of values and squared values → O(1) mean/std per pixel.
  const integral = new Float64Array((image.width + 1) * (image.height + 1));
  const integralSq = new Float64Array((image.width + 1) * (image.height + 1));
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const value = image.data[y * image.width + x]!;
      const index = (y + 1) * (image.width + 1) + (x + 1);
      integral[index] = value + (integral[index - 1] ?? 0) + (integral[index - image.width - 1] ?? 0) - (integral[index - image.width - 2] ?? 0);
      integralSq[index] = value * value + (integralSq[index - 1] ?? 0) + (integralSq[index - image.width - 1] ?? 0) - (integralSq[index - image.width - 2] ?? 0);
    }
  }
  const result = clone(image);
  for (let y = 0; y < image.height; y++) {
    const y0 = Math.max(0, y - half), y1 = Math.min(image.height - 1, y + half);
    for (let x = 0; x < image.width; x++) {
      const x0 = Math.max(0, x - half), x1 = Math.min(image.width - 1, x + half);
      const a = (y0) * (image.width + 1) + x0;
      const b = (y0) * (image.width + 1) + (x1 + 1);
      const c = (y1 + 1) * (image.width + 1) + x0;
      const d = (y1 + 1) * (image.width + 1) + (x1 + 1);
      const count = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum = integral[d]! - integral[b]! - integral[c]! + integral[a]!;
      const sumSq = integralSq[d]! - integralSq[b]! - integralSq[c]! + integralSq[a]!;
      const mean = sum / count;
      const variance = Math.max(0, sumSq / count - mean * mean);
      const std = Math.sqrt(variance);
      const threshold = mean * (1 + k * ((std / 128) - 1));
      result.data[y * image.width + x] = image.data[y * image.width + x]! < threshold ? 0 : fallback;
    }
  }
  return result;
}

/** Apply gamma correction. */
function applyGamma(image: GrayImage, gamma: number): GrayImage {
  if (Math.abs(gamma - 1) < 1e-3) return clone(image);
  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) lut[v] = Math.round(Math.pow(v / 255, 1 / gamma) * 255);
  const result = clone(image);
  for (let i = 0; i < result.data.length; i++) result.data[i] = lut[result.data[i]!]!;
  return result;
}

/** Lightweight 3x3 unsharp mask using a separable box blur. */
function unsharp(image: GrayImage, amount = 0.3): GrayImage {
  const blurred = boxBlurFast(image, 1);
  const result = clone(image);
  for (let i = 0; i < result.data.length; i++) {
    const value = image.data[i]! + (image.data[i]! - blurred[i]!) * amount;
    result.data[i] = value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
  }
  return result;
}

function boxBlurFast(image: GrayImage, radius: number): Uint8Array {
  if (radius < 1) return Uint8Array.from(image.data);
  const horizontal = new Float32Array(image.data.length);
  for (let y = 0; y < image.height; y++) {
    const row = y * image.width;
    let sum = 0;
    for (let i = -radius; i <= radius; i++) sum += image.data[row + Math.max(0, Math.min(image.width - 1, i))]!;
    for (let x = 0; x < image.width; x++) {
      horizontal[row + x] = sum / (2 * radius + 1);
      sum += image.data[row + Math.min(image.width - 1, x + radius + 1)]! - image.data[row + Math.max(0, x - radius)]!;
    }
  }
  const output = new Float32Array(image.data.length);
  for (let x = 0; x < image.width; x++) {
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const row = Math.max(0, Math.min(image.height - 1, i));
      sum += horizontal[row * image.width + x]!;
    }
    for (let y = 0; y < image.height; y++) {
      output[y * image.width + x] = sum / (2 * radius + 1);
      sum += horizontal[Math.min(image.height - 1, y + radius + 1) * image.width + x]! -
             horizontal[Math.max(0, y - radius) * image.width + x]!;
    }
  }
  return Uint8Array.from(output, value => Math.round(value));
}

/** Strip unused channels — keep only the red channel of a RGBA pixel. */
export function toGrayFromRgba(image: PixelImage): GrayImage {
  const data = new Uint8Array(image.width * image.height);
  for (let i = 0; i < data.length; i++) {
    const at = i * 4;
    const alpha = image.data[at + 3]! / 255;
    data[i] = Math.round(image.data[at]! * alpha + 255 * (1 - alpha));
  }
  return { width: image.width, height: image.height, data };
}

/**
 * Apply the named enhancement mode to a normalised grayscale page. The `original` mode returns
 * a defensive clone; everything else operates on a fresh buffer. The result keeps the same
 * dimensions as the input so it can be swapped into the preview without re-layout.
 */
export function applyEnhancement(image: GrayImage, mode: EnhancementMode): GrayImage {
  switch (mode) {
    case 'original': return clone(image);
    case 'enhanced': return enhanceLocal(image);
    case 'gray': return clone(image);
    case 'bw': return binarize(image);
    case 'contrast': return stretchContrast(image);
    case 'omr': {
      const shadow = flattenShadowsFast(image);
      const gamma = applyGamma(shadow, 0.85);
      return unsharp(gamma, 0.4);
    }
  }
}

/** Re-uses the heavy shadow algorithm at a single pass for the OMR mode. */
function flattenShadowsFast(image: GrayImage): GrayImage {
  const radius = Math.max(3, Math.round(Math.max(image.width, image.height) * 0.06));
  if (radius < 1) return clone(image);
  const blurred = boxBlurFast(image, radius);
  let sum = 0;
  for (let i = 0; i < blurred.length; i++) sum += blurred[i]!;
  const reference = sum / blurred.length;
  const result = new Uint8Array(image.data.length);
  for (let i = 0; i < result.length; i++) {
    const v = image.data[i]! + (reference - blurred[i]!);
    result[i] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
  }
  return { width: image.width, height: image.height, data: result };
}
