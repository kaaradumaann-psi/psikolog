import type { GrayImage, PageDefinition, PixelImage } from './omrTypes';
import type { QualityReport } from '../results/scanResultTypes';
import { CANONICAL_PIXELS_PER_MM } from './perspectiveCorrection';

/** Ideal-capture gates (`ok`) vs unreadable-page gates (`fatal`). Phone/scanner photos
 * typically miss `ok` and must still be accepted for human review. */
export const QUALITY_THRESHOLDS = Object.freeze({
  minPixelsPerMm: 4, minBrightness: 175, minTileBrightness: 130,
  maxShadowSpread: 65, minLaplacianVariance: 100, minBorderContrast: .4,
  cleanScore: .8,
  fatalBrightness: 80, fatalTileBrightness: 50, fatalLaplacianVariance: 15,
});

export function toGrayscale(image: PixelImage): GrayImage {
  const data = new Uint8Array(image.width * image.height);
  for (let i = 0; i < data.length; i++) {
    const at = i * 4, alpha = image.data[at + 3]! / 255;
    data[i] = Math.round((image.data[at]! * .299 + image.data[at + 1]! * .587 + image.data[at + 2]! * .114) * alpha + 255 * (1 - alpha));
  }
  return { width: image.width, height: image.height, data };
}

export function percentile(values: readonly number[], fraction: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * fraction)))]!;
}

/** Coordinates and radii are canonical pixels; values represent centres of raster cells. */
export function sampleRing(image: GrayImage, cx: number, cy: number, inner: number, outer: number): number[] {
  const values: number[] = [];
  for (let y = Math.max(0, Math.floor(cy - outer)); y <= Math.min(image.height - 1, Math.ceil(cy + outer)); y++) {
    for (let x = Math.max(0, Math.floor(cx - outer)); x <= Math.min(image.width - 1, Math.ceil(cx + outer)); x++) {
      const distanceSquared = (x + .5 - cx) ** 2 + (y + .5 - cy) ** 2;
      if (distanceSquared >= inner * inner && distanceSquared <= outer * outer) values.push(image.data[y * image.width + x]!);
    }
  }
  return values;
}

/** Brightness/spread use 0..255 levels; contrast uses 0..1; Laplacian variance is level squared at 8 px/mm.
 * `centreOffsets` (per-bubble ring refinement) keeps the per-bubble outline
 * checks honest on curled phone photos where the planar warp leaves local
 * residuals of about a millimetre. */
export function assessImageQuality(image: GrayImage, page: PageDefinition, pixelsPerMm: number,
  centreOffsets?: ReadonlyMap<string, { dx: number; dy: number }>): QualityReport {
  const backgrounds: number[] = [];
  for (let row = 0; row < 9; row++) for (let col = 0; col < 6; col++) {
    const values: number[] = [];
    const left = Math.floor(col * image.width / 6), right = Math.floor((col + 1) * image.width / 6);
    const top = Math.floor(row * image.height / 9), bottom = Math.floor((row + 1) * image.height / 9);
    for (let y = top + 4; y < bottom - 4; y += 8) for (let x = left + 4; x < right - 4; x += 8) values.push(image.data[y * image.width + x]!);
    backgrounds.push(percentile(values, .85));
  }
  const brightness = percentile(backgrounds, .5), shadowSpread = Math.max(...backgrounds) - Math.min(...backgrounds);
  const minimumBackground = Math.min(...backgrounds), contrasts: number[] = [], sharpness: number[] = [];
  const areas = page.items.flatMap(item => item.responseAreas);
  const ppm = CANONICAL_PIXELS_PER_MM;
  let damagedOutlines = 0;
  for (const area of areas) {
    const offset = centreOffsets?.get(area.responseId);
    const cx = (area.x + area.width / 2 + (offset?.dx ?? 0)) * ppm, cy = (area.y + area.height / 2 + (offset?.dy ?? 0)) * ppm;
    const radius = Math.min(area.width, area.height) * ppm / 2;
    const background = percentile(sampleRing(image, cx, cy, radius + 3, radius + 7), .8);
    const border = percentile(sampleRing(image, cx, cy, radius - 3, radius + 2), .15);
    contrasts.push(Math.max(0, (background - border) / Math.max(1, background)));
    // Check every outline around its expected centre; never snap a repeated row to a neighbour.
    let supported = 0;
    for (let sector = 0; sector < 16; sector++) {
      const angle = sector * Math.PI / 8;
      let darkest = 255;
      for (let r = Math.max(0, radius - 3); r <= radius + 2; r += .5) {
        const x = Math.round(cx + Math.cos(angle) * r - .5), y = Math.round(cy + Math.sin(angle) * r - .5);
        if (x >= 0 && y >= 0 && x < image.width && y < image.height) darkest = Math.min(darkest, image.data[y * image.width + x]!);
      }
      if ((background - darkest) / Math.max(1, background) >= .3) supported++;
    }
    if (background < QUALITY_THRESHOLDS.minTileBrightness || supported !== 16) damagedOutlines++;
    let sum = 0, squared = 0, count = 0;
    for (let y = Math.max(1, Math.floor(cy - radius - 3)); y <= Math.min(image.height - 2, Math.ceil(cy + radius + 3)); y++) {
      for (let x = Math.max(1, Math.floor(cx - radius - 3)); x <= Math.min(image.width - 2, Math.ceil(cx + radius + 3)); x++) {
        const distance = Math.hypot(x + .5 - cx, y + .5 - cy);
        if (distance < radius - 3 || distance > radius + 3) continue;
        const at = y * image.width + x;
        const laplacian = image.data[at - 1]! + image.data[at + 1]! + image.data[at - image.width]! + image.data[at + image.width]! - 4 * image.data[at]!;
        sum += laplacian; squared += laplacian * laplacian; count++;
      }
    }
    sharpness.push(count ? squared / count - (sum / count) ** 2 : 0);
  }
  // Quartiles summarize quality only. Every ROI must separately pass the acceptance checks.
  const borderContrast = percentile(contrasts, .25), laplacianVariance = percentile(sharpness, .25);
  const metrics = { brightness, shadowSpread, laplacianVariance, borderContrast, pixelsPerMm };
  const reasons: string[] = [], limits = QUALITY_THRESHOLDS;
  if (pixelsPerMm < limits.minPixelsPerMm) reasons.push('Kaynak \u00e7\u00f6z\u00fcn\u00fcrl\u00fc\u011f\u00fc yetersiz.');
  if (brightness < limits.minBrightness || minimumBackground < limits.minTileBrightness) reasons.push('Ayd\u0131nlatma yetersiz; daha ayd\u0131nl\u0131k bir g\u00f6r\u00fcnt\u00fc gerekli.');
  if (shadowSpread > limits.maxShadowSpread) reasons.push('Sayfada kuvvetli g\u00f6lge veya dengesiz ayd\u0131nlatma var.');
  if (!sharpness.length || sharpness.some(value => value < limits.minLaplacianVariance)) reasons.push('Yan\u0131t halkalar\u0131 bulan\u0131k; yeniden odaklay\u0131n.');
  if (!contrasts.length || contrasts.some(value => value < limits.minBorderContrast)) reasons.push('Bas\u0131l\u0131 yan\u0131t halkalar\u0131n\u0131n kontrast\u0131 yetersiz.');
  if (damagedOutlines) reasons.push(`${damagedOutlines} yan\u0131t halkas\u0131 eksik, hasarl\u0131 veya beklenen konumdan sapm\u0131\u015f; sayfay\u0131 yeniden \u00e7ekin.`);
  const medianSharpness = percentile(sharpness, .5);
  const fatal = brightness < limits.fatalBrightness || minimumBackground < limits.fatalTileBrightness
    || !sharpness.length || medianSharpness < limits.fatalLaplacianVariance;
  const fatalReasons: string[] = [];
  if (brightness < limits.fatalBrightness || minimumBackground < limits.fatalTileBrightness) {
    fatalReasons.push('Aydınlatma yetersiz; sayfa okunamadı. Daha aydınlık çekin.');
  }
  if (!sharpness.length || medianSharpness < limits.fatalLaplacianVariance) {
    fatalReasons.push('Görüntü tamamen bulanık; yeniden odaklayıp çekin.');
  }
  const score = Math.max(0, Math.min(1, brightness / 220, minimumBackground / 200, 1 - shadowSpread / 150,
    laplacianVariance / 300, borderContrast / .8, pixelsPerMm / 6));
  return { ok: reasons.length === 0, fatal, reasons: fatal ? fatalReasons : reasons, score, metrics };
}
