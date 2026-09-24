import type { GrayImage } from '../omr/omrTypes';

/**
 * Optional pre-processing step: flattens large-area illumination gradients (phone shadows,
 * overhead lamp bias) by subtracting a heavily blurred estimate of the background, then
 * clipping to [0, 255]. The blurred estimate is produced with a separable 2D box filter whose
 * kernel size grows with the longest image side so the same code handles both a 240-px camera
 * preview and a 4000-px scan. It is intentionally conservative — only large gradients are
 * removed, so the answer marks themselves are untouched.
 */
export type ShadowNormalizeOptions = {
  /** Force enablement regardless of caller heuristics. */
  force?: boolean;
  /** Minimum longest side that warrants background estimation. */
  minLongSide?: number;
  /** Kernel radius as a fraction of the longest side. */
  radiusFraction?: number;
  /** Minimum background variance (0..255 levels) above which the correction is applied. */
  minBackgroundContrast?: number;
};

const DEFAULTS = {
  minLongSide: 320,
  radiusFraction: 0.06,
  minBackgroundContrast: 12,
} as const;

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Horizontal box blur (sliding window). */
function blurHorizontal(input: Float32Array, width: number, height: number, radius: number): Float32Array {
  const output = new Float32Array(input.length);
  const window = 2 * radius + 1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      sum += input[row + Math.max(0, Math.min(width - 1, i))]!;
    }
    for (let x = 0; x < width; x++) {
      output[row + x] = sum / window;
      const remove = input[row + Math.max(0, x - radius)]!;
      const add = input[row + Math.min(width - 1, x + radius + 1)]!;
      sum += add - remove;
    }
  }
  return output;
}

/** Vertical box blur (sliding window). */
function blurVertical(input: Float32Array, width: number, height: number, radius: number): Float32Array {
  const output = new Float32Array(input.length);
  const window = 2 * radius + 1;
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const row = Math.max(0, Math.min(height - 1, i));
      sum += input[row * width + x]!;
    }
    for (let y = 0; y < height; y++) {
      output[y * width + x] = sum / window;
      const removeRow = Math.max(0, y - radius);
      const addRow = Math.min(height - 1, y + radius + 1);
      sum += input[addRow * width + x]! - input[removeRow * width + x]!;
    }
  }
  return output;
}

/** Separable box blur — two 1D passes. O(N) with two scratch buffers. */
function boxBlur(image: GrayImage, radius: number): Float32Array {
  if (radius < 1) return Float32Array.from(image.data, value => value);
  const scratch = Float32Array.from(image.data, value => value);
  const horizontal = blurHorizontal(scratch, image.width, image.height, radius);
  return blurVertical(horizontal, image.width, image.height, radius);
}

/**
 * Flattens large-area illumination gradients. Returns the input unchanged when the background
 * estimate does not show enough variation, the image is too small, or `force` is not set and
 * the caller did not opt in. The intent is to normalise the page without ever erasing marks:
 * the blur radius is always many times larger than the printed features, so answer marks,
 * alignment squares and the QR symbol pass through untouched.
 */
export function normalizeShadows(image: GrayImage, options: ShadowNormalizeOptions = {}): GrayImage {
  const { force = false, minLongSide = DEFAULTS.minLongSide, radiusFraction = DEFAULTS.radiusFraction,
    minBackgroundContrast = DEFAULTS.minBackgroundContrast } = options;
  const longSide = Math.max(image.width, image.height);
  if (!force && longSide < minLongSide) return image;
  const radius = Math.max(3, Math.round(longSide * radiusFraction));
  const blurred = boxBlur(image, radius);
  let minVal = Infinity, maxVal = -Infinity;
  for (let i = 0; i < blurred.length; i++) {
    const v = blurred[i]!;
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  }
  if (!force && maxVal - minVal < minBackgroundContrast) return image;
  // Reference level: the median of the blurred estimate. Shadows lower than this lift, hot
  // spots higher than this lower. Difference is clipped to keep marks intact.
  const sorted = Float32Array.from(blurred);
  sorted.sort();
  const reference = sorted[Math.floor(sorted.length / 2)] ?? 255;
  const data = new Uint8Array(image.width * image.height);
  for (let i = 0; i < data.length; i++) {
    data[i] = clamp(Math.round(image.data[i]! + (reference - blurred[i]!)), 0, 255);
  }
  return { width: image.width, height: image.height, data };
}
