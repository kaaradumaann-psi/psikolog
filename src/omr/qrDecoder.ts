import jsQR from 'jsqr';
import type { GrayImage, Point } from './omrTypes';

export const MAX_QR_PIXELS = 4_000_000;

function decodeAtScale(image: GrayImage, scale: number, invert: boolean): { text: string; corners: Point[] } | null {
  const width = Math.max(1, Math.floor(image.width * scale));
  const height = Math.max(1, Math.floor(image.height * scale));
  if (width * height > MAX_QR_PIXELS || width < 32 || height < 32) return null;
  const scaleX = image.width / width, scaleY = image.height / height;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.min(image.width - 1, Math.round((x + .5) * scaleX - .5));
    const sy = Math.min(image.height - 1, Math.round((y + .5) * scaleY - .5));
    let value = image.data[sy * image.width + sx]!;
    if (invert) value = 255 - value;
    const at = (y * width + x) * 4;
    data[at] = value; data[at + 1] = value; data[at + 2] = value; data[at + 3] = 255;
  }
  const decoded = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
  if (!decoded) return null;
  const location = decoded.location;
  const corners = [location.topLeftCorner, location.topRightCorner, location.bottomRightCorner, location.bottomLeftCorner]
    .map(p => ({ x: (p.x + .5) * scaleX - .5, y: (p.y + .5) * scaleY - .5 }));
  return { text: decoded.data, corners };
}

function uniqueScales(image: GrayImage): number[] {
  const full = Math.min(1, Math.sqrt(MAX_QR_PIXELS / (image.width * image.height)));
  const scales = [full];
  if (full > 0.55) scales.push(full * 0.62);
  const small = Math.min(full, 900 / Math.max(image.width, image.height));
  if (small > 0.12 && Math.abs(small - full) > 0.08) scales.push(small);
  return [...new Set(scales.map(value => Math.round(value * 1000) / 1000))].filter(value => value > 0.08);
}

/** Bounded decode buffer. Corners are always returned in original source pixel coordinates. */
export function decodePageQr(image: GrayImage): { text: string; corners: Point[] } | null {
  for (const scale of uniqueScales(image)) {
    const decoded = decodeAtScale(image, scale, false);
    if (decoded) return decoded;
  }
  for (const scale of uniqueScales(image).slice(0, 2)) {
    const decoded = decodeAtScale(image, scale, true);
    if (decoded) return decoded;
  }
  return null;
}
