import type { GrayImage } from './omrTypes';

export type IsolatedPaper = { image: GrayImage; originX: number; originY: number };

/**
 * Crops a photographed sheet off a darker desk. Full-bleed scans and rendered PDFs
 * occupy the whole frame and are returned unchanged. Never invents page corners:
 * this only removes empty margin so QR and alignment search see a larger sheet.
 * `originX`/`originY` map cropped coordinates back to the original image.
 */
export function isolatePaper(image: GrayImage): IsolatedPaper {
  const longSide = Math.max(image.width, image.height);
  const unchanged = (): IsolatedPaper => ({ image, originX: 0, originY: 0 });
  if (longSide < 80 || image.width * image.height < 20_000) return unchanged();
  const step = Math.max(2, Math.round(longSide / 400));
  const width = Math.floor(image.width / step);
  const height = Math.floor(image.height / step);
  if (width < 24 || height < 24) return unchanged();

  const histogram = new Uint32Array(256);
  let samples = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = image.data[(y * step) * image.width + x * step]!;
      histogram[value] = histogram[value]! + 1;
      samples++;
    }
  }
  let cumulative = 0, paperLevel = 200;
  for (let value = 255; value >= 0; value--) {
    cumulative += histogram[value]!;
    if (cumulative >= samples * 0.35) { paperLevel = value; break; }
  }
  const threshold = Math.max(110, Math.min(210, paperLevel - 25));

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let bestCount = 0, bestMinX = 0, bestMinY = 0, bestMaxX = 0, bestMaxY = 0;

  for (let start = 0; start < visited.length; start++) {
    if (visited[start]) continue;
    const sx = start % width, sy = Math.floor(start / width);
    if (image.data[(sy * step) * image.width + sx * step]! < threshold) {
      visited[start] = 1;
      continue;
    }
    let read = 0, count = 1, minX = sx, minY = sy, maxX = sx, maxY = sy;
    visited[start] = 1;
    queue[0] = start;
    while (read < count) {
      const at = queue[read++]!;
      const x = at % width, y = Math.floor(at / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy, next = ny * width + nx;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || visited[next]) continue;
        visited[next] = 1;
        if (image.data[(ny * step) * image.width + nx * step]! < threshold) continue;
        queue[count++] = next;
        minX = Math.min(minX, nx); maxX = Math.max(maxX, nx);
        minY = Math.min(minY, ny); maxY = Math.max(maxY, ny);
      }
    }
    if (count > bestCount) {
      bestCount = count;
      bestMinX = minX; bestMinY = minY; bestMaxX = maxX; bestMaxY = maxY;
    }
  }

  const boxW = bestMaxX - bestMinX + 1, boxH = bestMaxY - bestMinY + 1;
  if (bestCount < width * height * 0.16 || boxW < 12 || boxH < 12) return unchanged();
  const aspect = boxW / boxH;
  const portrait = aspect >= 0.52 && aspect <= 0.88;
  const landscape = aspect >= 1.14 && aspect <= 1.92;
  if (!portrait && !landscape) return unchanged();

  const pad = Math.ceil(Math.max(boxW, boxH) * 0.03);
  const left = Math.max(0, (bestMinX - pad) * step);
  const top = Math.max(0, (bestMinY - pad) * step);
  const right = Math.min(image.width, (bestMaxX + 1 + pad) * step);
  const bottom = Math.min(image.height, (bestMaxY + 1 + pad) * step);
  const cropW = right - left, cropH = bottom - top;
  if (cropW < 600 || cropH < 600) return unchanged();
  if (cropW * cropH > image.width * image.height * 0.92) return unchanged();

  const data = new Uint8Array(cropW * cropH);
  for (let y = 0; y < cropH; y++) {
    data.set(image.data.subarray((top + y) * image.width + left, (top + y) * image.width + left + cropW), y * cropW);
  }
  return { image: { width: cropW, height: cropH, data }, originX: left, originY: top };
}
