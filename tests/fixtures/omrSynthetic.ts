import QRCode from 'qrcode';
import { formDefinition } from '../../src/omr/formDefinition';
import { createPageQr } from '../../src/form/pageIdentity';
import type { FormDefinition, PixelImage, Point } from '../../src/omr/omrTypes';
import { fitHomography, mapPoint } from '../../src/omr/perspectiveCorrection';

/** SYNTHETIC raster fixtures only. No real-camera, photocopy, handwriting or print accuracy claim. */
export const SYNTHETIC_BATCH = '0123456789ABCDEF01234567';
export const SYNTHETIC_MARGIN = 32;
export type SyntheticMark = { itemNumber: number; choiceId: string; kind: 'strong' | 'single' | 'faint' | 'erased' };
export type SyntheticOptions = {
  definition?: FormDefinition; pageNumber?: number; pixelsPerMm?: number; qrText?: string | null;
  marks?: SyntheticMark[]; missingMarkers?: string[]; hollowMarkers?: string[];
};

export function renderSyntheticPage(options: SyntheticOptions = {}): PixelImage {
  const definition = options.definition ?? formDefinition, pageNumber = options.pageNumber ?? 1;
  const page = definition.pages.find(p => p.pageNumber === pageNumber)!;
  const ppm = options.pixelsPerMm ?? 6, margin = SYNTHETIC_MARGIN;
  const width = Math.round(definition.pageWidthMm * ppm) + margin * 2, height = Math.round(definition.pageHeightMm * ppm) + margin * 2;
  const image: PixelImage = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  for (let at = 0; at < image.data.length; at += 4) {
    image.data[at] = image.data[at + 1] = image.data[at + 2] = 248;
    image.data[at + 3] = 255;
  }
  const paint = (x: number, y: number, value: number, coverage = 1) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const at = (y * width + x) * 4;
    const blended = Math.round(image.data[at]! * (1 - coverage) + value * coverage);
    image.data[at] = image.data[at + 1] = image.data[at + 2] = blended;
  };
  const rectangle = (xMm: number, yMm: number, wMm: number, hMm: number, value: number) => {
    const left = margin + xMm * ppm, top = margin + yMm * ppm, right = left + wMm * ppm, bottom = top + hMm * ppm;
    for (let y = Math.floor(top); y < Math.ceil(bottom); y++) for (let x = Math.floor(left); x < Math.ceil(right); x++) {
      const coverage = Math.max(0, Math.min(x + 1, right) - Math.max(x, left)) * Math.max(0, Math.min(y + 1, bottom) - Math.max(y, top));
      paint(x, y, value, coverage);
    }
  };
  const disk = (cxMm: number, cyMm: number, radiusMm: number, value: number, ring = false) => {
    const cx = margin + cxMm * ppm, cy = margin + cyMm * ppm, radius = radiusMm * ppm;
    for (let y = Math.floor(cy - radius - 2); y <= Math.ceil(cy + radius + 2); y++) {
      for (let x = Math.floor(cx - radius - 2); x <= Math.ceil(cx + radius + 2); x++) {
        const distance = Math.hypot(x + .5 - cx, y + .5 - cy);
        const coverage = Math.max(0, Math.min(1, ring ? .125 * ppm + .5 - Math.abs(distance - radius) : radius + .5 - distance));
        if (coverage) paint(x, y, value, coverage);
      }
    }
  };
  for (const marker of page.alignmentMarks) {
    if (options.missingMarkers?.includes(marker.id)) continue;
    rectangle(marker.x, marker.y, marker.width, marker.height, 12);
    if (options.hollowMarkers?.includes(marker.id)) rectangle(marker.x + .7, marker.y + .7, marker.width - 1.4, marker.height - 1.4, 248);
  }
  for (const item of page.items) for (const area of item.responseAreas) {
    const cx = area.x + area.width / 2, cy = area.y + area.height / 2;
    disk(cx, cy, area.width / 2, 30, true);
    const mark = options.marks?.find(candidate => candidate.itemNumber === item.itemNumber && candidate.choiceId === area.choiceId);
    if (!mark) continue;
    disk(cx, cy, 1.22, { strong: 20, single: 135, faint: 205, erased: 225 }[mark.kind]);
    if (mark.kind === 'erased') {
      disk(cx - .32, cy + .12, .34, 172);
      disk(cx + .32, cy - .23, .24, 196);
    }
  }
  if (options.qrText !== null) {
    const expected = createPageQr(definition, SYNTHETIC_BATCH, pageNumber);
    const code = options.qrText === undefined ? { size: expected.size, data: expected.data }
      : QRCode.create(options.qrText, { errorCorrectionLevel: 'M' }).modules;
    const area = page.qrArea, moduleMm = area.width / (code.size + expected.quiet * 2);
    const left = margin + area.x * ppm, top = margin + area.y * ppm;
    for (let y = Math.floor(top); y < Math.ceil(top + area.height * ppm); y++) {
      for (let x = Math.floor(left); x < Math.ceil(left + area.width * ppm); x++) {
        const col = Math.floor((x + .5 - left) / (moduleMm * ppm)) - expected.quiet;
        const row = Math.floor((y + .5 - top) / (moduleMm * ppm)) - expected.quiet;
        if (col >= 0 && row >= 0 && col < code.size && row < code.size && code.data[row * code.size + col]) paint(x, y, 0);
      }
    }
  }
  return image;
}

/**
 * Paints an axis-aligned band of uniform grey over the sheet, in millimetres from the sheet's
 * top-left corner. Used to reproduce a shadow reaching a printed alignment square: at a low enough
 * value the band and the square become one connected component at the search threshold.
 */
export function shadowBandSynthetic(image: PixelImage, band: {
  xMm: number; yMm: number; widthMm: number; heightMm: number; value: number;
}, margin = SYNTHETIC_MARGIN, ppm = 6): PixelImage {
  const data = new Uint8ClampedArray(image.data);
  const left = margin + band.xMm * ppm, top = margin + band.yMm * ppm;
  const right = left + band.widthMm * ppm, bottom = top + band.heightMm * ppm;
  for (let y = Math.max(0, Math.floor(top)); y < Math.min(image.height, Math.ceil(bottom)); y++) {
    for (let x = Math.max(0, Math.floor(left)); x < Math.min(image.width, Math.ceil(right)); x++) {
      const at = (y * image.width + x) * 4;
      if (data[at]! <= band.value) continue;
      data[at] = data[at + 1] = data[at + 2] = band.value;
    }
  }
  return { ...image, data };
}

export function illuminateSynthetic(image: PixelImage, factor: (x: number, y: number) => number): PixelImage {
  const data = new Uint8ClampedArray(image.data);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const at = (y * image.width + x) * 4, illumination = factor(x / image.width, y / image.height);
    for (let channel = 0; channel < 3; channel++) data[at + channel] = Math.round(data[at + channel]! * illumination);
  }
  return { ...image, data };
}

export function blurSynthetic(image: PixelImage, radius: number): PixelImage {
  const { width, height } = image, horizontal = new Float32Array(width * height), data = new Uint8ClampedArray(image.data.length);
  const window = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let dx = -radius; dx <= radius; dx++) sum += image.data[(y * width + Math.max(0, Math.min(width - 1, dx))) * 4]!;
    for (let x = 0; x < width; x++) {
      horizontal[y * width + x] = sum / window;
      sum += image.data[(y * width + Math.min(width - 1, x + radius + 1)) * 4]! - image.data[(y * width + Math.max(0, x - radius)) * 4]!;
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let dy = -radius; dy <= radius; dy++) sum += horizontal[Math.max(0, Math.min(height - 1, dy)) * width + x]!;
    for (let y = 0; y < height; y++) {
      const at = (y * width + x) * 4, value = Math.round(sum / window);
      data[at] = data[at + 1] = data[at + 2] = value; data[at + 3] = 255;
      sum += horizontal[Math.min(height - 1, y + radius + 1) * width + x]! - horizontal[Math.max(0, y - radius) * width + x]!;
    }
  }
  return { width, height, data };
}

export function rotateSynthetic(image: PixelImage, quarterTurns: number): PixelImage {
  const turns = ((quarterTurns % 4) + 4) % 4;
  const width = turns % 2 ? image.height : image.width, height = turns % 2 ? image.width : image.height;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const dx = turns === 1 ? image.height - 1 - y : turns === 2 ? image.width - 1 - x : turns === 3 ? y : x;
    const dy = turns === 1 ? x : turns === 2 ? image.height - 1 - y : turns === 3 ? image.width - 1 - x : y;
    data.set(image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4), (dy * width + dx) * 4);
  }
  return { width, height, data };
}

/** Forward scene transform; fixture resampling is independent of the production warp routine. */
export function projectSynthetic(image: PixelImage, width: number, height: number, corners: Point[]) {
  const original = [{ x: 0, y: 0 }, { x: image.width, y: 0 }, { x: image.width, y: image.height }, { x: 0, y: image.height }];
  const transform = fitHomography(original, corners), inverse = fitHomography(corners, original);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const source = mapPoint(inverse, { x: x + .5, y: y + .5 }), sx = source.x - .5, sy = source.y - .5;
    const x0 = Math.floor(sx), y0 = Math.floor(sy), dx = sx - x0, dy = sy - y0;
    let value = 210;
    if (x0 >= 0 && y0 >= 0 && x0 + 1 < image.width && y0 + 1 < image.height) {
      value = image.data[(y0 * image.width + x0) * 4]! * (1 - dx) * (1 - dy)
        + image.data[(y0 * image.width + x0 + 1) * 4]! * dx * (1 - dy)
        + image.data[((y0 + 1) * image.width + x0) * 4]! * (1 - dx) * dy
        + image.data[((y0 + 1) * image.width + x0 + 1) * 4]! * dx * dy;
    }
    const at = (y * width + x) * 4;
    data[at] = data[at + 1] = data[at + 2] = Math.round(value); data[at + 3] = 255;
  }
  return { image: { width, height, data }, transform };
}

export function cropSynthetic(image: PixelImage, left: number, top: number, right: number, bottom: number): PixelImage {
  const width = image.width - left - right, height = image.height - top - bottom, data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) data.set(image.data.subarray(((top + y) * image.width + left) * 4, ((top + y) * image.width + left + width) * 4), y * width * 4);
  return { width, height, data };
}
