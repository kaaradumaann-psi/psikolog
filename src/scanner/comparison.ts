import type { GrayImage, PixelImage } from '../omr/omrTypes';
import { applyEnhancement } from './enhancement';
import type { EnhancementMode } from './enhancement';

export type ComparisonLayout = 'side' | 'stacked';

export type ComparisonRender = {
  /** The processed left-hand (or top) image. */
  processed: PixelImage;
  /** The original right-hand (or bottom) image, when available. */
  original?: PixelImage;
  /** Which enhancement mode produced the processed image. */
  mode: EnhancementMode;
};

/**
 * Builds a side-by-side or stacked comparison PNG data URL from a normalised grayscale page
 * and the optional original photo. The output is always RGBA, sized so that the longer side
 * never exceeds `maxSide` (default 1200) — this keeps the preview memory footprint bounded.
 *
 * No DOM is touched — the function uses the standard `ImageData` + an `OffscreenCanvas` (with a
 * HTMLCanvasElement fallback) so it works inside the OMR pipeline as well as in the UI.
 */
export function buildComparison(normalized: GrayImage, original?: PixelImage,
  mode: EnhancementMode = 'omr', _layout: ComparisonLayout = 'side', maxSide = 1200): ComparisonRender {
  const processed = grayscaleToRgba(applyEnhancement(normalized, mode), maxSide);
  const originalScaled = original ? scaleRgba(original, maxSide) : undefined;
  return { processed, original: originalScaled, mode };
}

function scaledSize(width: number, height: number, maxSide: number): { width: number; height: number; scale: number } {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
    !Number.isFinite(maxSide) || maxSide <= 0) {
    throw new Error('Karşılaştırma görüntüsü boyutları geçersiz.');
  }
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const scaledWidth = Math.max(1, Math.round(width * scale));
  const scaledHeight = Math.max(1, Math.round(height * scale));
  if (scaledWidth * scaledHeight > 8_000_000) throw new Error('Karşılaştırma görüntüsü çok büyük.');
  return { width: scaledWidth, height: scaledHeight, scale };
}

export function grayscaleToRgba(image: GrayImage, maxSide = 1200): PixelImage {
  if (!(image.data instanceof Uint8Array) || image.data.length !== image.width * image.height) {
    throw new Error('Gri görüntü verisi geçersiz.');
  }
  const { width, height, scale } = scaledSize(image.width, image.height, maxSide);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.min(image.width - 1, Math.floor(x / scale));
    const sy = Math.min(image.height - 1, Math.floor(y / scale));
    const value = image.data[sy * image.width + sx]!;
    const at = (y * width + x) * 4;
    data[at] = value; data[at + 1] = value; data[at + 2] = value; data[at + 3] = 255;
  }
  return { width, height, data };
}

function scaleRgba(image: PixelImage, maxSide: number): PixelImage {
  if (!(image.data instanceof Uint8ClampedArray) || image.data.length !== image.width * image.height * 4) {
    throw new Error('RGBA karşılaştırma görüntüsü geçersiz.');
  }
  const { width, height, scale } = scaledSize(image.width, image.height, maxSide);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.min(image.width - 1, Math.floor(x / scale));
    const sy = Math.min(image.height - 1, Math.floor(y / scale));
    const sourceAt = (sy * image.width + sx) * 4;
    const targetAt = (y * width + x) * 4;
    data[targetAt] = image.data[sourceAt]!;
    data[targetAt + 1] = image.data[sourceAt + 1]!;
    data[targetAt + 2] = image.data[sourceAt + 2]!;
    data[targetAt + 3] = image.data[sourceAt + 3]!;
  }
  return { width, height, data };
}

/** Returns a short, action-oriented Turkish tip describing how to recover from a quality issue. */
export function qualityRecoveryTip(reason: string): string {
  const lower = reason.toLowerCase();
  if (lower.includes('bulan') || lower.includes('netlik') || lower.includes('focus')) {
    return 'Telefonu sabit tutun ve otomatik odaklamayı bekleyin, sonra yeniden çekin.';
  }
  if (lower.includes('aydınlat') || lower.includes('parlak') || lower.includes('karanlık') || lower.includes('ışık')) {
    return 'Daha aydınlık bir ortamda, kağıdın üzerine doğrudan ışık gelmeyecek şekilde yeniden çekin.';
  }
  if (lower.includes('gölge') || lower.includes('shadow')) {
    return 'Telefonun ve elinizin gölgesi sayfaya düşmesin; daha dik açıdan çekin.';
  }
  if (lower.includes('kırp') || lower.includes('köşe') || lower.includes('çerçeve')) {
    return 'Kağıdın dört köşesi de kadrajda olacak şekilde yeniden çekin.';
  }
  if (lower.includes('kontrast') || lower.includes('çözünürlük') || lower.includes('çözün')) {
    return 'Yaklaşın veya daha yüksek çözünürlüklü kamerayla çekin.';
  }
  return 'Sayfayı daha düz ve dik açıdan yeniden çekin.';
}
