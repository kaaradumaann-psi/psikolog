import type { GrayImage, Point } from '../omr/omrTypes';

/**
 * Automatic document (sheet) detection — the *outer* four corners of the paper in a raw phone
 * photo, not the four printed MMPI alignment squares. This is the main path of the capture
 * pipeline; the manual corner editor stays as the fallback when this returns `null`.
 *
 * Why a quadrilateral and not a bounding box: `omr/pageIsolation.ts` and
 * `scanner/cameraAdvisor.ts` both produce an axis-aligned `{x,y,width,height}` box. A box cannot
 * describe a sheet photographed at an angle, so it can neither crop tightly nor drive a
 * perspective correction. Here we extract the real convex quadrilateral so the existing
 * `fitHomography` / `warpPerspective` pair can flatten the page.
 *
 * Why brightness alone is not enough (measured on real desk photos during development):
 * the sheets are photographed on a *white desk*. A pure "largest bright blob" — which is what the
 * two existing bounding-box detectors do — merges paper and desk into one component and returns
 * the whole frame. So the mask here is grown under two simultaneous constraints:
 *
 *   • brightness — the pixel must plausibly be paper, and
 *   • an edge barrier — growth may not cross a strong Sobel gradient.
 *
 * The paper/desk boundary always carries a gradient (the sheet's own drop shadow or the tonal
 * step), so the barrier keeps the region on the sheet even when the desk is equally bright.
 * Candidates are then scored on how much of the page's printed ink they enclose and how well
 * real image gradients support the four quad edges, which rejects "half the desk" outright.
 */

export type DocumentQuad = {
  /** Outer paper corners in SOURCE pixel coordinates, ordered TL, TR, BR, BL. */
  corners: [Point, Point, Point, Point];
  /** Quad area / image area (0..1). */
  coverage: number;
  /** Quad area / area of its own convex hull — how well four corners explain the blob. */
  rectangularity: number;
  /** Long-edge / short-edge ratio of the detected quad. A4 seen flat is ≈1.414. */
  aspect: number;
  /** Fraction of the page's printed ink that falls inside the quad (0..1). */
  inkCoverage: number;
  /** Fraction of quad-edge samples backed by a real image gradient (0..1). */
  edgeSupport: number;
  /** Combined confidence used to rank candidates (0..1). */
  score: number;
  /** True when the quad reaches the frame border — the photo may clip the sheet. */
  touchesBorder: boolean;
};

export type DocumentDetectionOptions = {
  /** Long side of the internal working raster. */
  workingLongSide?: number;
  /** Minimum fraction of the frame the sheet must cover to be accepted. */
  minCoverage?: number;
  /** Minimum combined score for a detection to be returned. */
  minScore?: number;
};

const DEFAULTS = { workingLongSide: 480, minCoverage: 0.1, minScore: 0.55 } as const;

type Raster = { image: GrayImage; scale: number };

/** Area-average downscale — detection is threshold driven, so JPEG noise must be averaged out. */
function downscale(image: GrayImage, longSide: number): Raster {
  const source = Math.max(image.width, image.height);
  if (source <= longSide) return { image, scale: 1 };
  const scale = longSide / source;
  const width = Math.max(8, Math.round(image.width * scale));
  const height = Math.max(8, Math.round(image.height * scale));
  const data = new Uint8Array(width * height);
  const stepX = image.width / width, stepY = image.height / height;
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * stepY), y1 = Math.max(y0 + 1, Math.min(image.height, Math.floor((y + 1) * stepY)));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * stepX), x1 = Math.max(x0 + 1, Math.min(image.width, Math.floor((x + 1) * stepX)));
      let sum = 0, count = 0;
      for (let sy = y0; sy < y1; sy++) for (let sx = x0; sx < x1; sx++) { sum += image.data[sy * image.width + sx]!; count++; }
      data[y * width + x] = count ? Math.round(sum / count) : 0;
    }
  }
  return { image: { width, height, data }, scale: width / image.width };
}

/** Otsu's between-class variance threshold. */
export function otsuThreshold(data: Uint8Array | Uint16Array): number {
  let maxValue = 0;
  for (let i = 0; i < data.length; i++) if (data[i]! > maxValue) maxValue = data[i]!;
  const bins = 256, span = Math.max(1, maxValue);
  const histogram = new Uint32Array(bins);
  for (let i = 0; i < data.length; i++) histogram[Math.min(bins - 1, Math.round((data[i]! / span) * (bins - 1)))]!++;
  const total = data.length;
  let sum = 0;
  for (let v = 0; v < bins; v++) sum += v * histogram[v]!;
  let sumB = 0, weightB = 0, best = -1, threshold = 0;
  for (let v = 0; v < bins; v++) {
    weightB += histogram[v]!;
    if (!weightB) continue;
    const weightF = total - weightB;
    if (!weightF) break;
    sumB += v * histogram[v]!;
    const meanB = sumB / weightB, meanF = (sum - sumB) / weightF;
    const between = weightB * weightF * (meanB - meanF) ** 2;
    if (between > best) { best = between; threshold = v; }
  }
  return (threshold / (bins - 1)) * span;
}

/** 3×3 Sobel gradient magnitude (|gx| + |gy|, cheap L1 form). */
function sobelMagnitude(image: GrayImage): Uint16Array {
  const { width, height, data } = image;
  const out = new Uint16Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const tl = data[i - width - 1]!, t = data[i - width]!, tr = data[i - width + 1]!;
      const l = data[i - 1]!, r = data[i + 1]!;
      const bl = data[i + width - 1]!, b = data[i + width]!, br = data[i + width + 1]!;
      const gx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const gy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      out[i] = Math.min(65535, Math.abs(gx) + Math.abs(gy));
    }
  }
  return out;
}

/** Separable box blur on a gray raster (small radius, used to stabilise thresholds). */
function blur(image: GrayImage, radius: number): GrayImage {
  if (radius < 1) return image;
  const { width, height, data } = image;
  const horizontal = new Float32Array(data.length);
  const window = 2 * radius + 1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let i = -radius; i <= radius; i++) sum += data[row + Math.max(0, Math.min(width - 1, i))]!;
    for (let x = 0; x < width; x++) {
      horizontal[row + x] = sum / window;
      sum += data[row + Math.min(width - 1, x + radius + 1)]! - data[row + Math.max(0, x - radius)]!;
    }
  }
  const out = new Uint8Array(data.length);
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let i = -radius; i <= radius; i++) sum += horizontal[Math.max(0, Math.min(height - 1, i)) * width + x]!;
    for (let y = 0; y < height; y++) {
      out[y * width + x] = Math.round(sum / window);
      sum += horizontal[Math.min(height - 1, y + radius + 1) * width + x]! - horizontal[Math.max(0, y - radius) * width + x]!;
    }
  }
  return { width, height, data: out };
}

/** Percentile of a typed array (0..1 fraction), via a 1024-bin histogram. */
function percentileOf(values: Uint16Array, fraction: number): number {
  let maxValue = 0;
  for (let i = 0; i < values.length; i++) if (values[i]! > maxValue) maxValue = values[i]!;
  if (!maxValue) return 0;
  const bins = 1024, histogram = new Uint32Array(bins);
  for (let i = 0; i < values.length; i++) histogram[Math.min(bins - 1, Math.round((values[i]! / maxValue) * (bins - 1)))]!++;
  const target = values.length * fraction;
  let cumulative = 0;
  for (let b = 0; b < bins; b++) {
    cumulative += histogram[b]!;
    if (cumulative >= target) return (b / (bins - 1)) * maxValue;
  }
  return maxValue;
}

/**
 * The page's printed ink: pixels clearly darker than the local paper background. Used both to
 * seed the region growing and to score candidates — the sheet is the thing the print is on.
 */
function inkMask(image: GrayImage): { mask: Uint8Array; count: number } {
  const background = blur(image, Math.max(2, Math.round(Math.max(image.width, image.height) * 0.035)));
  // Paper level: the bright end of the blurred background. Dark *surroundings* — a black laptop,
  // the desk edge, a shadowed floor — are not paper, and the dark pixels inside them are not this
  // page's print. Requiring a bright local background is what separates "text on the sheet" from
  // "a dark object in the scene"; without it the off-sheet clutter counts as ink, and the edge
  // refinement below can never slide inwards because it would "lose" that clutter.
  const sorted = Uint8Array.from(background.data).sort();
  const paperLevel = sorted[Math.floor(sorted.length * 0.8)] ?? 255;
  const minBackground = Math.max(90, paperLevel * 0.72);
  const mask = new Uint8Array(image.data.length);
  let count = 0;
  for (let i = 0; i < image.data.length; i++) {
    if (background.data[i]! < minBackground) continue;
    // 18 levels below the local background is well above JPEG ringing but below printed text.
    if (image.data[i]! + 18 < background.data[i]!) { mask[i] = 1; count++; }
  }
  return { mask, count };
}

type Component = { mask: Uint8Array; count: number; touchesBorder: boolean };

/**
 * Grow bright regions that never cross a strong gradient. `bright` is the brightness floor and
 * `wall` the gradient ceiling; a pixel is passable when it is bright enough AND not an edge.
 * Returns the components sorted large-first, capped to the few biggest (candidates only).
 */
function passableComponents(image: GrayImage, gradient: Uint16Array, bright: number, wall: number,
  limit: number): Component[] {
  const { width, height, data } = image;
  const total = width * height;
  const passable = new Uint8Array(total);
  for (let i = 0; i < total; i++) passable[i] = data[i]! >= bright && gradient[i]! <= wall ? 1 : 0;
  const seen = new Uint8Array(total);
  const queue = new Int32Array(total);
  const found: Component[] = [];
  for (let start = 0; start < total; start++) {
    if (seen[start] || !passable[start]) continue;
    let read = 0, count = 1, touchesBorder = false;
    const members: number[] = [];
    seen[start] = 1;
    queue[0] = start;
    while (read < count) {
      const at = queue[read++]!;
      members.push(at);
      const x = at % width, y = (at - x) / width;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;
      // 4-neighbour growth: diagonals would leak through single-pixel gaps in a faint edge.
      if (x > 0 && !seen[at - 1] && passable[at - 1]) { seen[at - 1] = 1; queue[count++] = at - 1; }
      if (x < width - 1 && !seen[at + 1] && passable[at + 1]) { seen[at + 1] = 1; queue[count++] = at + 1; }
      if (y > 0 && !seen[at - width] && passable[at - width]) { seen[at - width] = 1; queue[count++] = at - width; }
      if (y < height - 1 && !seen[at + width] && passable[at + width]) { seen[at + width] = 1; queue[count++] = at + width; }
    }
    if (count < total * 0.04) continue;
    const mask = new Uint8Array(total);
    for (const index of members) mask[index] = 1;
    found.push({ mask, count, touchesBorder });
  }
  found.sort((a, b) => b.count - a.count);
  return found.slice(0, limit);
}

/** Morphological closing (dilate then erode) so print and edge walls do not pit the sheet mask. */
function close(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const dilate = (input: Uint8Array) => {
    const out = new Uint8Array(input.length);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let hit = 0;
      for (let dy = -radius; dy <= radius && !hit; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          if (input[ny * width + nx]) { hit = 1; break; }
        }
      }
      out[y * width + x] = hit;
    }
    return out;
  };
  const erode = (input: Uint8Array) => {
    const out = new Uint8Array(input.length);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let all = 1;
      for (let dy = -radius; dy <= radius && all; dy++) {
        const ny = Math.max(0, Math.min(height - 1, y + dy));
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          if (!input[ny * width + nx]) { all = 0; break; }
        }
      }
      out[y * width + x] = all;
    }
    return out;
  };
  return erode(dilate(mask));
}

/** Fill interior holes (printed text, dark marks) so the sheet is one solid blob. */
function fillHoles(mask: Uint8Array, width: number, height: number): Uint8Array {
  const outside = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let count = 0;
  const push = (index: number) => {
    if (outside[index] || mask[index]) return;
    outside[index] = 1;
    queue[count++] = index;
  };
  for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1); }
  for (let read = 0; read < count; read++) {
    const at = queue[read]!;
    const x = at % width, y = (at - x) / width;
    if (x > 0) push(at - 1);
    if (x < width - 1) push(at + 1);
    if (y > 0) push(at - width);
    if (y < height - 1) push(at + width);
  }
  const filled = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) filled[i] = mask[i] || !outside[i] ? 1 : 0;
  return filled;
}

/** Boundary pixels of a filled mask. */
function boundaryPoints(mask: Uint8Array, width: number, height: number): Point[] {
  const points: Point[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = y * width + x;
      if (!mask[at]) continue;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
        !mask[at - 1] || !mask[at + 1] || !mask[at - width] || !mask[at + width]) {
        points.push({ x, y });
      }
    }
  }
  return points;
}

/** Andrew's monotone chain convex hull. */
export function convexHull(points: readonly Point[]): Point[] {
  if (points.length < 3) return [...points];
  const sorted = [...points].sort((a, b) => (a.x - b.x) || (a.y - b.y));
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const build = (input: readonly Point[]) => {
    const chain: Point[] = [];
    for (const point of input) {
      while (chain.length >= 2 && cross(chain[chain.length - 2]!, chain[chain.length - 1]!, point) <= 0) chain.pop();
      chain.push(point);
    }
    chain.pop();
    return chain;
  };
  return [...build(sorted), ...build([...sorted].reverse())];
}

function polygonArea(points: readonly Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!, b = points[(i + 1) % points.length]!;
    area += a.x * b.y - a.y * b.x;
  }
  return Math.abs(area) / 2;
}

/** Keep at most `limit` hull vertices, dropping the ones that contribute least area. */
function simplifyHull(hull: readonly Point[], limit: number): Point[] {
  const points = [...hull];
  while (points.length > limit) {
    let worst = 0, worstArea = Infinity;
    for (let i = 0; i < points.length; i++) {
      const a = points[(i - 1 + points.length) % points.length]!, b = points[i]!, c = points[(i + 1) % points.length]!;
      const area = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
      if (area < worstArea) { worstArea = area; worst = i; }
    }
    points.splice(worst, 1);
  }
  return points;
}

/** Maximum-area quadrilateral over hull vertices (hull is convex and simplified → O(n⁴) is fine). */
function maxAreaQuad(hull: readonly Point[]): [Point, Point, Point, Point] | null {
  const n = hull.length;
  if (n < 4) return null;
  let best: [Point, Point, Point, Point] | null = null, bestArea = 0;
  for (let a = 0; a < n - 3; a++) for (let b = a + 1; b < n - 2; b++) {
    for (let c = b + 1; c < n - 1; c++) for (let d = c + 1; d < n; d++) {
      const quad = [hull[a]!, hull[b]!, hull[c]!, hull[d]!] as [Point, Point, Point, Point];
      const area = polygonArea(quad);
      if (area > bestArea) { bestArea = area; best = quad; }
    }
  }
  return best;
}

/**
 * Order four convex points as TL, TR, BR, BL with a positive signed area — exactly the order
 * `manualWarp.validateCorners` accepts, so a detected quad can be fed to the existing manual
 * warp path with no translation layer.
 */
export function orderCorners(quad: readonly Point[]): [Point, Point, Point, Point] {
  const cx = quad.reduce((sum, p) => sum + p.x, 0) / quad.length;
  const cy = quad.reduce((sum, p) => sum + p.y, 0) / quad.length;
  const sorted = [...quad].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  let startIndex = 0, bestScore = Infinity;
  for (let i = 0; i < sorted.length; i++) {
    const score = sorted[i]!.x + sorted[i]!.y;
    if (score < bestScore) { bestScore = score; startIndex = i; }
  }
  const ordered = [0, 1, 2, 3].map(offset => sorted[(startIndex + offset) % 4]!);
  const signed = ordered.reduce((sum, point, index) => {
    const next = ordered[(index + 1) % 4]!;
    return sum + point.x * next.y - point.y * next.x;
  }, 0);
  return (signed > 0 ? ordered : [ordered[0]!, ordered[3]!, ordered[2]!, ordered[1]!]) as [Point, Point, Point, Point];
}

/** Is the point inside the (convex) quad? Winding test with a small outward tolerance. */
function insideQuad(quad: readonly Point[], x: number, y: number, tolerance = 0): boolean {
  let positive = 0, negative = 0;
  for (let i = 0; i < quad.length; i++) {
    const a = quad[i]!, b = quad[(i + 1) % quad.length]!;
    const edge = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const cross = ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x)) / edge;
    if (cross > -tolerance) positive++;
    if (cross < tolerance) negative++;
  }
  return positive === quad.length || negative === quad.length;
}

/**
 * How much real image gradient sits under the four quad edges. A quad drawn across an empty desk
 * scores near zero; the true paper outline scores high because the sheet's border (or its drop
 * shadow) is an edge everywhere along its length.
 */
function edgeSupport(quad: readonly Point[], gradient: Uint16Array, width: number, height: number,
  strong: number): number {
  let hits = 0, samples = 0;
  for (let i = 0; i < quad.length; i++) {
    const a = quad[i]!, b = quad[(i + 1) % quad.length]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(8, Math.round(length));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
      // The frame border is not evidence of a paper edge — a sheet running out of frame has no
      // gradient there. Those samples are skipped rather than counted as misses.
      if (px < 2 || py < 2 || px > width - 3 || py > height - 3) continue;
      samples++;
      // Search a small band normal to the edge: the mask boundary is a pixel or two off the
      // true edge after closing/hole filling.
      let best = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = Math.round(px) + dx, ny = Math.round(py) + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const value = gradient[ny * width + nx]!;
        if (value > best) best = value;
      }
      if (best >= strong) hits++;
    }
  }
  // No interior samples at all means the quad is the frame itself — treat as fully supported,
  // since a full-bleed scan legitimately has its page edge on the border.
  return samples < 8 ? 1 : hits / samples;
}

type Line = { nx: number; ny: number; c: number };

/** Line through two points in normal form: nx·x + ny·y = c, with (nx,ny) a unit vector. */
function lineThrough(a: Point, b: Point): Line {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length, ny = dx / length;
  return { nx, ny, c: nx * a.x + ny * a.y };
}

/** Intersection of two lines; null when they are (near) parallel. */
function intersect(p: Line, q: Line): Point | null {
  const determinant = p.nx * q.ny - p.ny * q.nx;
  if (Math.abs(determinant) < 1e-6) return null;
  return { x: (p.c * q.ny - p.ny * q.c) / determinant, y: (p.nx * q.c - p.c * q.nx) / determinant };
}

/**
 * Score a candidate paper edge: walk the line across the span covered by the original edge and
 * measure how often a strong gradient sits under it. Samples outside the raster are skipped, so
 * an edge running out of frame is neither rewarded nor punished.
 */
function lineSupport(line: Line, from: Point, to: Point, gradient: Uint16Array, width: number,
  height: number, strong: number, raster?: GrayImage): number {
  // Project the original endpoints onto the candidate line so the sampled span matches the edge.
  const project = (point: Point): Point => {
    const distance = line.nx * point.x + line.ny * point.y - line.c;
    return { x: point.x - distance * line.nx, y: point.y - distance * line.ny };
  };
  const a = project(from), b = project(to);
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (length < 8) return 0;
  const steps = Math.max(16, Math.round(length));
  let hits = 0, samples = 0;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
    if (px < 2 || py < 2 || px > width - 3 || py > height - 3) continue;
    samples++;
    let best = 0;
    // A 1-px band normal to the candidate: the line is already the hypothesis, so the tolerance
    // is much tighter than the exploratory search in `edgeSupport`.
    for (let d = -1; d <= 1; d++) {
      const nx = Math.round(px + line.nx * d), ny = Math.round(py + line.ny * d);
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const value = gradient[ny * width + nx]!;
      if (value > best) best = value;
    }
    if (best >= strong) { hits++; continue; }
    // Gradient alone misses the paper-on-white-desk case: the tonal step is real but spread over
    // several pixels, so no single Sobel response clears the strong-edge percentile. Fall back to
    // comparing the mean brightness a few pixels inside vs. outside the line — a genuine sheet
    // boundary is consistently brighter on the paper side (or darker, where the sheet casts a
    // shadow), while a line drawn across bare desk shows no step at all.
    if (!raster) continue;
    const sample = (distance: number): number | null => {
      const nx = Math.round(px + line.nx * distance), ny = Math.round(py + line.ny * distance);
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return null;
      return raster.data[ny * width + nx]!;
    };
    let innerSum = 0, innerCount = 0, outerSum = 0, outerCount = 0;
    for (let d = 2; d <= 5; d++) {
      const inner = sample(-d), outer = sample(d);
      if (inner !== null) { innerSum += inner; innerCount++; }
      if (outer !== null) { outerSum += outer; outerCount++; }
    }
    if (!innerCount || !outerCount) continue;
    // Signed, not absolute: on a real sheet boundary the paper side is brighter than the
    // background (or the sheet's drop shadow makes the outside darker) — both give a positive
    // step. An unsigned test would also fire on a line drawn across printed text, which is how
    // an earlier revision ate the margins of already-cropped scans.
    if (innerSum / innerCount - outerSum / outerCount >= 12) hits++;
  }
  return samples < 8 ? 0 : hits / samples;
}

/**
 * Pull each quad edge onto the strongest straight gradient near it, without ever crossing the
 * printed page.
 *
 * The region-growing mask is deliberately over-inclusive on a white desk: the paper/desk step is
 * too faint to always stop the flood, so the blob swallows some desk. Refinement fixes that from
 * the other side — each edge is slid inwards and rotated over a small range, and the candidate
 * that keeps all the printed ink inside while sitting on the most gradient wins. Sliding inwards
 * is preferred at equal support, which is what trims the leaked desk. The page's own border is
 * always a gradient (print edge or drop shadow), so the true outline is the natural optimum.
 */
function refineQuadEdges(quad: [Point, Point, Point, Point], gradient: Uint16Array,
  ink: { mask: Uint8Array; count: number }, width: number, height: number,
  strong: number, raster: GrayImage): [Point, Point, Point, Point] | null {
  const diagonal = Math.hypot(width, height);
  const slideRange = Math.max(6, Math.round(diagonal * 0.2));
  // Ink points, subsampled — the containment test runs for every perturbation.
  const inkPoints: Point[] = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (ink.mask[y * width + x]) inkPoints.push({ x, y });
  }
  const sampleStep = Math.max(1, Math.floor(inkPoints.length / 1500));
  const probes: Point[] = [];
  for (let i = 0; i < inkPoints.length; i += sampleStep) probes.push(inkPoints[i]!);

  const centre = {
    x: quad.reduce((sum, p) => sum + p.x, 0) / 4,
    y: quad.reduce((sum, p) => sum + p.y, 0) / 4,
  };
  const lines: Line[] = [];
  for (let i = 0; i < 4; i++) {
    const a = quad[i]!, b = quad[(i + 1) % 4]!;
    const base = lineThrough(a, b);
    // Orient the normal to point away from the quad centre, so positive slide = inwards.
    const sign = (base.nx * centre.x + base.ny * centre.y - base.c) > 0 ? -1 : 1;
    const oriented: Line = { nx: base.nx * sign, ny: base.ny * sign, c: base.c * sign };
    const angle = Math.atan2(oriented.ny, oriented.nx);
    // The coarse mask edge is the incumbent. A refined line replaces it only when it is clearly
    // better supported by real gradients — otherwise a full-bleed page (whose true edge is the
    // frame border and therefore carries no gradient) would be eaten from every side.
    const coarseSupport = lineSupport(oriented, a, b, gradient, width, height, strong, raster);
    let best = oriented, bestScore = -1, bestSupport = coarseSupport;
    for (let rotation = -6; rotation <= 6; rotation++) {
      const theta = angle + (rotation * Math.PI) / 180;
      const nx = Math.cos(theta), ny = Math.sin(theta);
      // Re-anchor the offset so rotation pivots about the edge midpoint, not the origin.
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const baseOffset = nx * midpoint.x + ny * midpoint.y;
      for (let slide = -4; slide <= slideRange; slide++) {
        // The normal points outwards, so `c` grows as the line moves away from the centre:
        // subtracting `slide` moves the edge inwards by that many pixels.
        const candidate: Line = { nx, ny, c: baseOffset - slide };
        // Reject immediately if any printed ink would end up outside this edge.
        let violates = false;
        for (const probe of probes) {
          if (candidate.nx * probe.x + candidate.ny * probe.y - candidate.c > 1.5) { violates = true; break; }
        }
        if (violates) continue;
        const support = lineSupport(candidate, a, b, gradient, width, height, strong, raster);
        // Tie-break towards the inner line: a tiny bonus per pixel of inward travel removes the
        // leaked desk without ever beating a genuinely better-supported outline.
        const score = support + slide * 0.0012;
        if (score > bestScore) { bestScore = score; best = candidate; bestSupport = support; }
      }
    }
    // Adopt the refinement only on a decisive improvement (and on a real, not marginal, edge).
    lines.push(bestSupport >= Math.max(0.3, coarseSupport + 0.15) ? best : oriented);
  }
  const corners: Point[] = [];
  for (let i = 0; i < 4; i++) {
    const point = intersect(lines[(i + 3) % 4]!, lines[i]!);
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
    // A refined corner must stay in the neighbourhood of the frame; a near-parallel pair can
    // otherwise project a corner to infinity.
    if (point.x < -width || point.y < -height || point.x > 2 * width || point.y > 2 * height) return null;
    corners.push(point);
  }
  const ordered = orderCorners(corners);
  if (polygonArea(ordered) < polygonArea(quad) * 0.35) return null;
  return ordered;
}

function buildCandidate(component: Component, raster: GrayImage, gradient: Uint16Array,
  ink: { mask: Uint8Array; count: number }, strongGradient: number, sourceWidth: number,
  sourceHeight: number, scale: number, minCoverage: number): DocumentQuad | null {
  const { width, height } = raster;
  const closed = close(component.mask, width, height, 1);
  const filled = fillHoles(closed, width, height);
  const boundary = boundaryPoints(filled, width, height);
  if (boundary.length < 12) return null;
  const hull = convexHull(boundary);
  if (hull.length < 4) return null;
  const quad = maxAreaQuad(simplifyHull(hull, 20));
  if (!quad) return null;
  const coarse = orderCorners(quad);
  // Snap the coarse mask quad onto real straight paper edges. Refinement may fail (parallel
  // edges, degenerate intersection) — the coarse quad then stands, which is still usable.
  const ordered = refineQuadEdges(coarse, gradient, ink, width, height, strongGradient, raster) ?? coarse;
  const area = polygonArea(ordered);
  const hullArea = polygonArea(hull) || 1;
  const coverage = area / (width * height);
  if (coverage < minCoverage) return null;
  const rectangularity = Math.min(1, area / hullArea);
  const edges = ordered.map((point, index) => {
    const next = ordered[(index + 1) % 4]!;
    return Math.hypot(next.x - point.x, next.y - point.y);
  });
  const shortEdge = Math.min(...edges);
  if (shortEdge < 8) return null;
  const aspect = Math.max(...edges) / shortEdge;
  if (aspect > 3.4) return null;
  // Ink containment: how much of the printed page this quad actually holds.
  let inside = 0;
  if (ink.count) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (!ink.mask[y * width + x]) continue;
      if (insideQuad(ordered, x, y, 1)) inside++;
    }
  }
  const inkCoverage = ink.count ? inside / ink.count : 1;
  const support = edgeSupport(ordered, gradient, width, height, strongGradient);
  // A4 is 1.414; perspective stretches it, so the penalty is gentle and only punishes shapes
  // that no plausible camera angle can produce from a rectangle.
  const aspectFit = Math.max(0, 1 - Math.abs(aspect - 1.414) / 1.6);
  const score = 0.34 * inkCoverage + 0.28 * support + 0.22 * rectangularity + 0.1 * aspectFit +
    0.06 * Math.min(1, coverage / 0.6);
  const inverse = 1 / scale;
  const corners = ordered.map(point => ({
    x: Math.min(sourceWidth, Math.max(0, (point.x + 0.5) * inverse)),
    y: Math.min(sourceHeight, Math.max(0, (point.y + 0.5) * inverse)),
  })) as [Point, Point, Point, Point];
  return {
    corners, coverage, rectangularity, aspect, inkCoverage, edgeSupport: support, score,
    touchesBorder: component.touchesBorder,
  };
}

/**
 * Detect the outer sheet quadrilateral. Returns `null` when no plausible sheet is present, which
 * is the caller's signal to keep the raw frame (already-cropped scans) or to open the manual
 * corner editor.
 */
export function detectDocumentQuad(image: GrayImage, options: DocumentDetectionOptions = {}): DocumentQuad | null {
  const workingLongSide = options.workingLongSide ?? DEFAULTS.workingLongSide;
  const minCoverage = options.minCoverage ?? DEFAULTS.minCoverage;
  const minScore = options.minScore ?? DEFAULTS.minScore;
  if (!image || image.width < 32 || image.height < 32 || image.data.length !== image.width * image.height) return null;
  const { image: raster, scale } = downscale(image, workingLongSide);
  const smooth = blur(raster, 1);
  const gradient = sobelMagnitude(smooth);
  const ink = inkMask(smooth);
  const strongGradient = Math.max(24, percentileOf(gradient, 0.9));
  // Wall levels: a high wall only blocks the most obvious borders; a low wall also stops faint
  // paper/desk steps but risks fragmenting the sheet. Both are tried.
  const walls = [percentileOf(gradient, 0.97), percentileOf(gradient, 0.93), percentileOf(gradient, 0.88)];
  // Paper floors, from "anything not dark" to a strict paper white.
  const histogramPeak = otsuThreshold(raster.data);
  const brights = [Math.max(60, histogramPeak * 0.75), Math.max(80, histogramPeak), Math.max(100, histogramPeak * 1.12)];
  let best: DocumentQuad | null = null;
  for (const wall of walls) {
    for (const bright of brights) {
      for (const component of passableComponents(raster, gradient, bright, Math.max(12, wall), 3)) {
        const candidate = buildCandidate(component, raster, gradient, ink, strongGradient,
          image.width, image.height, scale, minCoverage);
        if (!candidate) continue;
        if (!best || candidate.score > best.score) best = candidate;
      }
    }
  }
  return best && best.score >= minScore ? best : null;
}
