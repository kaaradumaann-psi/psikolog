import type { GrayImage, Point } from './omrTypes';

/**
 * Quarter-turn orientation normalisation for phone photos taken in landscape or
 * upside-down. The QR symbol is the only orientation authority on the sheet:
 * jsQR reports its corners in the symbol's own frame (topLeft → topRight runs
 * along the symbol's top edge), so the angle of that edge in image space tells
 * us which multiple of 90° the sheet is rotated by. Downstream stages (paper
 * isolation, alignment-square search windows, warp fitting) are built for small
 * tilts around the upright pose; a 90°/180° sheet must be turned upright first.
 *
 * `turns` everywhere means clockwise quarter turns applied to the stored image.
 */

/** Rotates a grayscale image by `turns` clockwise quarter turns (0..3). */
export function rotateGray90(image: GrayImage, turns: number): GrayImage {
  const t = ((turns % 4) + 4) % 4;
  if (t === 0) return image;
  const { width, height, data } = image;
  if (t === 2) {
    const out = new Uint8Array(data.length);
    for (let y = 0; y < height; y++) {
      const srcRow = y * width, dstRow = (height - 1 - y) * width;
      for (let x = 0; x < width; x++) out[dstRow + (width - 1 - x)] = data[srcRow + x]!;
    }
    return { width, height, data: out };
  }
  const out = new Uint8Array(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = data[y * width + x]!;
      if (t === 1) out[x * height + (height - 1 - y)] = value; // (x,y) -> (H-1-y, x)
      else out[(width - 1 - x) * height + y] = value;          // (x,y) -> (y, W-1-x)
    }
  }
  return { width: height, height: width, data: out };
}

/**
 * Additional clockwise quarter turns needed so the QR symbol's top edge points
 * to the right (+x) in image space, i.e. the sheet is upright. Corners are in
 * jsQR order: [topLeft, topRight, bottomRight, bottomLeft].
 */
export function quarterTurnsToUpright(corners: readonly Point[]): number {
  const [topLeft, topRight] = corners;
  if (!topLeft || !topRight) return 0;
  const angle = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x);
  // Rotating the image one quarter turn clockwise adds +90° to every vector
  // angle in y-down coordinates; pick the k that brings the edge angle to 0.
  const k = Math.round(-angle / (Math.PI / 2));
  return ((k % 4) + 4) % 4;
}

/** Maps a point expressed in the `turns`-rotated image back to original coordinates. */
export function unrotatePoint(point: Point, turns: number, originalWidth: number, originalHeight: number): Point {
  const t = ((turns % 4) + 4) % 4;
  if (t === 0) return point;
  if (t === 2) return { x: originalWidth - 1 - point.x, y: originalHeight - 1 - point.y };
  // Rotated dims: W' = originalHeight, H' = originalWidth.
  if (t === 1) return { x: point.y, y: originalHeight - 1 - point.x };
  return { x: originalWidth - 1 - point.y, y: point.x };
}
