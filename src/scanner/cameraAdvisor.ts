import type { GrayImage, Point } from '../omr/omrTypes';

export type CameraAdvice = {
  /** 0..255 average luminance of the preview. */
  brightness: number;
  /** 0..255 Laplacian variance — a proxy for focus quality. */
  sharpness: number;
  /** 0..1 dynamic range (0 = flat, 1 = extreme contrast). */
  contrast: number;
  /** Whether the page is plausibly framed in the centre of the preview. */
  pageDetected: boolean;
  /** Bounding box of the detected paper in source-pixel coordinates. */
  pageBox?: { x: number; y: number; width: number; height: number };
  /** Hint string for the UI. */
  hint: CameraHint;
};

export type CameraHint =
  | 'ok'
  | 'too-dark'
  | 'too-bright'
  | 'too-blurry'
  | 'flat'
  | 'no-page'
  | 'page-detected';

/**
 * Single-frame analyser that produces UI guidance for the live camera preview. Designed to run
 * inside the existing 240-px preview loop, so every operation is bounded to ~60k pixels. The
 * page detection here is purely heuristic — it never replaces the OMR alignment step — and is
 * only used to give the user a "page detected" indicator and a centre overlay rectangle.
 */
export function adviseCameraFrame(image: GrayImage): CameraAdvice {
  if (!image.data.length || image.width < 60 || image.height < 60) {
    return { brightness: 0, sharpness: 0, contrast: 0, pageDetected: false, hint: 'no-page' };
  }
  let light = 0;
  for (let i = 0; i < image.data.length; i++) light += image.data[i]!;
  const brightness = light / image.data.length;
  let min = 255, max = 0;
  for (let i = 0; i < image.data.length; i++) {
    const v = image.data[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const contrast = Math.min(1, (max - min) / 255);
  // Laplacian variance on a 4-px stride to keep the cost tiny.
  let sum = 0, squared = 0, count = 0;
  const stride = 4;
  for (let y = stride; y < image.height - stride; y += stride) {
    for (let x = stride; x < image.width - stride; x += stride) {
      const i = y * image.width + x;
      const lap = 4 * image.data[i]! - image.data[i - stride]! - image.data[i + stride]! -
        image.data[i - stride * image.width]! - image.data[i + stride * image.width]!;
      sum += lap; squared += lap * lap; count++;
    }
  }
  const sharpness = count ? Math.max(0, squared / count - (sum / count) ** 2) : 0;
  const box = detectPageBox(image);
  const pageDetected = !!box;
  let hint: CameraHint = 'ok';
  if (brightness < 70) hint = 'too-dark';
  else if (brightness > 240) hint = 'too-bright';
  else if (sharpness < 30) hint = 'too-blurry';
  else if (contrast < 0.05) hint = 'flat';
  else if (!pageDetected) hint = 'no-page';
  else hint = 'page-detected';
  return { brightness, sharpness, contrast, pageDetected, pageBox: box ?? undefined, hint };
}

const PAGE_HINT_LABEL: Record<CameraHint, string> = {
  ok: 'Işık ve netlik uygun görünüyor.',
  'too-dark': 'Görüntü çok karanlık; daha aydınlık bir yere geçin veya flaş kullanın.',
  'too-bright': 'Görüntü çok parlak; yansımayı kontrol edin ve gölgeye geçin.',
  'too-blurry': 'Görüntü bulanık görünüyor; sabit tutun ve yeniden odaklayın.',
  flat: 'Kontrast çok düşük; kağıdı farklı bir zemine koyun.',
  'no-page': 'Sayfa çerçeveye alınmamış; kağıdı kadrajın ortasına yerleştirin.',
  'page-detected': 'Sayfa algılandı; çekime hazır.',
};

export function hintLabel(hint: CameraHint): string {
  return PAGE_HINT_LABEL[hint];
}

/**
 * Heuristic page detection for the camera preview only. The mask is "the largest cluster of
 * bright pixels whose bounding box has an A4-ish aspect ratio (either portrait or landscape)".
 * The same algorithm already exists in `omr/pageIsolation.ts` for the OMR pipeline; this copy
 * is intentionally simplified (no paper-threshold percentile) because the preview is small and
 * a mis-detection here is harmless — it only toggles a UI label.
 */
export function detectPageBox(image: GrayImage): { x: number; y: number; width: number; height: number } | null {
  const stride = 2;
  const width = Math.floor(image.width / stride);
  const height = Math.floor(image.height / stride);
  if (width < 24 || height < 24) return null;
  // Histogram percentile to set a paper-level threshold.
  const histogram = new Uint32Array(256);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    histogram[image.data[(y * stride) * image.width + x * stride]!]!++;
  }
  const total = width * height;
  let cumulative = 0, paperLevel = 200;
  for (let value = 255; value >= 0; value--) {
    cumulative += histogram[value]!;
    if (cumulative >= total * 0.3) { paperLevel = value; break; }
  }
  const threshold = Math.max(110, Math.min(210, paperLevel - 25));
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let bestCount = 0, bestMinX = 0, bestMinY = 0, bestMaxX = 0, bestMaxY = 0;
  for (let start = 0; start < visited.length; start++) {
    if (visited[start]) continue;
    const sx = start % width, sy = Math.floor(start / width);
    if (image.data[(sy * stride) * image.width + sx * stride]! < threshold) {
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
        if (image.data[(ny * stride) * image.width + nx * stride]! < threshold) continue;
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
  if (bestCount < width * height * 0.18) return null;
  // If the brightest cluster covers almost the entire frame, no sheet was framed — the preview
  // is uniformly bright (e.g. flat field). Skip the box in that case so the UI does not show
  // a page overlay when nothing is actually framed.
  if (bestCount > width * height * 0.92) return null;
  const boxW = (bestMaxX - bestMinX + 1) * stride;
  const boxH = (bestMaxY - bestMinY + 1) * stride;
  const aspect = boxW / boxH;
  // A4 is 210 × 297 mm ≈ 0.707. Real-world photos are rarely 0.707 exactly — fingers at the
  // edge crop the sheet to ~0.50. We accept both the true A4 ratio and a slightly tighter box.
  const portrait = aspect >= 0.5 && aspect <= 0.92;
  const landscape = aspect >= 1.09 && aspect <= 2.0;
  if (!portrait && !landscape) return null;
  return { x: bestMinX * stride, y: bestMinY * stride, width: boxW, height: boxH };
}

/** Translate the page-box rectangle (in preview coordinates) into the four corners for the UI overlay. */
export function pageBoxCorners(box: { x: number; y: number; width: number; height: number }): Point[] {
  return [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height },
  ];
}
