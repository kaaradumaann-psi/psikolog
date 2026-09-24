/**
 * Bubble ring centre refinement — TypeScript port of the geometric idea discussed
 * in “Madde 21” and of OMRChecker’s `auto_align` / `CropOnMarkers` philosophy.
 *
 * OMRChecker (Python/OpenCV) does three things that this file mirrors in
 * TypeScript without OpenCV:
 *
 * 1. **CropPage / page isolation** — find the sheet contour (Canny → convexHull
 *    → approxPolyDP → four_point_transform).  Here: `pageIsolation.ts`.
 * 2. **CropOnMarkers / feature alignment** — locate the four 5 mm squares by
 *    multi-scale template matching (TM_CCOEFF_NORMED over eroded image) then
 *    `four_point_transform`; fallback is ORB + RANSAC homography
 *    (`FeatureBasedAlignment.py`).  Here: `alignmentDetector.ts` (multi-threshold
 *    connected components, squareFill ≥ 0.84) + QR homography
 *    (`perspectiveCorrection.ts` → `fitHomography` / `fitSimilarity`).
 * 3. **Per-block “auto_align”** — after global warp, OMRChecker runs a
 *    morphology → vertical Open(2×10) → threshold → iterative horizontal shift
 *    search per `FieldBlock` (`core.py:read_omr_response` → `shift` loop).
 *    That corrects a small systematic translation of a whole field block
 *    caused by perspective / scanner skew.
 *
 * The problem described in Madde 21 is the bubble-level analogue: the **same
 * bubble’s own printed ring** appears inside the bubble after `fitHomography`
 * from the four corner squares, so its dark arc falls into the measurement
 * bands and a blank is counted as evidence (`ambiguous`).
 * Phone photos of a slightly curled sheet make this much worse than Madde 21:
 * a *planar* homography fitted on the four corner squares leaves **local**
 * residuals of 1 mm and more in the middle of the page (the paper is not a
 * plane), so whole column stretches show the printed ring displaced far beyond
 * the old 0.55 mm budget and blank bubbles flood to `ambiguous`/`multiple`.
 *
 * This module therefore relocates every bubble onto its **own printed ring**
 * with a two-stage estimator:
 *
 *   1. **Translation search** (the OMRChecker block-shift idea at bubble
 *      granularity): candidate offsets over a 2.5 mm disk are scored by how
 *      well the dark pixels around the candidate form a circle of the printed
 *      ring radius (per-sector radial argmax, |r−1.60| ≤ 0.30).  A separator
 *      rule line only darkens a few sectors; a pen blob sits at the centre,
 *      not on the ring band; a neighbour ring is 4.25 mm away — none of them
 *      can fake a complete circle, so the search locks on the printed ring.
 *      Neighbour-disc pixels stay excluded; a winner whose centre falls inside
 *      a neighbour ellipse is rejected.  2.5 mm is the measured C-series
 *      residual (mean unconstrained offset 2.13 mm, 146/147 NOT_FOUND rings
 *      recovered with exclusion still on and zero neighbour chases).
 *   2. **Huber IRLS sub-pixel fit** of r(θ)=R+dx·cosθ+dy·sinθ initialised at
 *      the search winner, with the same safety interlocks as before (radius
 *      plausibility, RMS residual, angular completeness) — so a real pencil
 *      mark never pulls the centre toward the ink.
 *
 * References:
 * - `OMRChecker-master/src/core.py` — ImageInstanceOps.auto_align block shift
 * - `OMRChecker-master/src/processors/CropOnMarkers.py` — iterative scale
 *   search + four_point_transform
 * - `OMRChecker-master/src/processors/FeatureBasedAlignment.py` — ORB + homography
 * - `OMRChecker-master/src/utils/image.py` — ImageUtils.four_point_transform,
 *   normalize_util, CLAHE, morphology helpers
 */

import type { GrayImage, ResponseArea } from './omrTypes';
import { percentile } from './imageQuality';
import { CANONICAL_PIXELS_PER_MM } from './perspectiveCorrection';

// ---------------------------------------------------------------------------
// Tunables — provisional and test-visible.
// ---------------------------------------------------------------------------

export const RING_REFINE = Object.freeze({
  /** Annulus that straddles the printed border (bubble radius 1.75 mm, mean 1.60). */
  innerMm: 1.05,
  outerMm: 2.05,
  /** Pixels darker than this (normalised against local paper) count as ring. */
  darknessThreshold: 0.28,
  /**
   * Translation-search budget.  C-series phone photos of a curled sheet leave
   * a measured local residual of 1.75–2.50 mm (mean 2.13).  The previous 1.6
   * mm cap sat below that residual, so the search never saw a complete 1.60 mm
   * circle and reported "halka bulunamadı".  2.5 mm covers the measured band.
   * Neighbour exclusion stays on; a winner inside a neighbour ellipse is
   * rejected.  Completeness ≥ 0.7, not a darkness argmax, is still what stops
   * the search chasing a pen mark or an adjacent-row ring.
   */
  maxOffsetMm: 2.5,
  /**
   * RMS residual of the fitted circle. 0.28 mm still rejects a thick annular
   * scribble *as a translation* (that case is already defused earlier: the
   * search sees the printed ring at the nominal centre and reports “kayma çok
   * küçük”), while tolerating the 1–2 px ring blur of low-resolution phone
   * captures, whose radius jitter alone reaches ~0.25 mm.
   */
  maxResidualMm: 0.28,
  /** Search candidates lie on these radii (mm) around the nominal centre. */
  searchRadiiMm: [0, 0.25, 0.5, 0.75, 1, 1.3, 1.6, 1.9, 2.2, 2.5],
  /** Radial probe band for the per-sector ring argmax (mm). */
  searchBandInnerMm: 1.2,
  searchBandOuterMm: 2.05,
  /** Angular sectors used by the translation search. */
  searchSectors: 24,
  /** A sector counts as “ring found” when its argmax radius is within this of 1.60 mm. */
  searchRadiusToleranceMm: 0.3,
  /** Minimum fraction of sectors with a ring hit before a correction is trusted. */
  minSearchCompleteness: 0.7,
  /** Minimum angular coverage (16 sectors → 9.6 sectors). */
  minCompleteness: 0.60,
  /** Minimum number of dark ring pixels to attempt a fit. */
  minDarkPixels: 24,
  /** Plausible bubble radius band — mean printed ring ≈1.60 mm ± this. */
  maxRadiusDeviationMm: 0.32,
  /** Huber knee for robust reweighting. */
  huberKmm: 0.18,
  /** Number of IRLS iterations. */
  iterations: 3,
  /** Minimum translation that justifies a correction; smaller jitter is kept nominal. */
  minOffsetMm: 0.09,
});

export type RingFit = {
  ok: boolean;
  dx: number;
  dy: number;
  radius: number;
  residual: number;
  completeness: number;
  darkPixelCount: number;
  reason?: string;
};

const NOMINAL_RADIUS_MM = 1.60; // mean printed ring (1.45–1.75), not outer 1.75

function centreMm(area: ResponseArea) {
  return { x: area.x + area.width / 2, y: area.y + area.height / 2 };
}
function radiusMm(area: ResponseArea) {
  return Math.min(area.width, area.height) / 2;
}
function insideBubble(area: ResponseArea, xMm: number, yMm: number, insetMm = 0) {
  const rx = Math.max(0.05, area.width / 2 - insetMm);
  const ry = Math.max(0.05, area.height / 2 - insetMm);
  const c = centreMm(area);
  return ((xMm - c.x) / rx) ** 2 + ((yMm - c.y) / ry) ** 2 <= 1;
}
function nearbyResponseAreas(area: ResponseArea, allAreas: readonly ResponseArea[]) {
  // Same heuristic as markDetector.ts — only neighbours that can contribute pixels.
  const c = centreMm(area);
  const samplingRadius = radiusMm(area) + 0.45;
  const referenceRadius = radiusMm(area) + 1.85;
  return allAreas.filter(candidate => {
    if (candidate.responseId === area.responseId) return false;
    const o = centreMm(candidate);
    return Math.hypot(o.x - c.x, o.y - c.y) <= samplingRadius + referenceRadius + radiusMm(candidate);
  });
}
function isCoveredByNeighbour(xMm: number, yMm: number, neighbours: readonly ResponseArea[]) {
  return neighbours.some(nb => insideBubble(nb, xMm, yMm));
}
function normalizedDarkness(value: number, reference: number) {
  return Math.max(0, Math.min(1, (reference - value) / Math.max(1, reference)));
}

// Collect reference (paper) levels exactly like markDetector for consistency.
function collectReferenceLevels(
  image: GrayImage,
  area: ResponseArea,
  allAreas: readonly ResponseArea[],
): { reference: number; backgroundLevel: number; paperLevel: number } {
  const ppm = CANONICAL_PIXELS_PER_MM;
  const c = centreMm(area);
  const r = radiusMm(area);
  const cx = c.x * ppm;
  const cy = c.y * ppm;
  const neighbours = nearbyResponseAreas(area, allAreas);
  const collectRing = (inner: number, outer: number): number[] => {
    const vals: number[] = [];
    for (let y = Math.max(0, Math.floor(cy - outer * ppm)); y <= Math.min(image.height - 1, Math.ceil(cy + outer * ppm)); y++) {
      for (let x = Math.max(0, Math.floor(cx - outer * ppm)); x <= Math.min(image.width - 1, Math.ceil(cx + outer * ppm)); x++) {
        const xMm = (x + 0.5) / ppm;
        const yMm = (y + 0.5) / ppm;
        const d = Math.hypot(xMm - c.x, yMm - c.y);
        if (d < inner || d > outer) continue;
        if (isCoveredByNeighbour(xMm, yMm, neighbours)) continue;
        vals.push(image.data[y * image.width + x]!);
      }
    }
    return vals;
  };
  const background = collectRing(r + 0.35, r + 0.95);
  const paper = collectRing(r + 1.25, r + 1.85);
  const backgroundLevel = percentile(background, 0.8);
  const paperLevel = percentile(paper, 0.8);
  const reference = Math.max(backgroundLevel, paperLevel, 120);
  return { reference, backgroundLevel, paperLevel };
}

// Solve 3×3 linear system via Gaussian elimination with partial pivot.
function solve3x3(A: number[][], b: number[]): number[] | null {
  const n = 3;
  const M = A.map(row => [...row]);
  const v = [...b];
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(M[row]![col]!) > Math.abs(M[pivot]![col]!)) pivot = row;
    if (Math.abs(M[pivot]![col]!) < 1e-9) return null;
    if (pivot !== col) {
      [M[col], M[pivot]] = [M[pivot]!, M[col]!];
      [v[col], v[pivot]] = [v[pivot]!, v[col]!];
    }
    const div = M[col]![col]!;
    for (let j = col; j < n; j++) M[col]![j]! /= div;
    v[col]! /= div;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row]![col]!;
      for (let j = col; j < n; j++) M[row]![j]! -= factor * M[col]![j]!;
      v[row]! -= factor * v[col]!;
    }
  }
  return v;
}

type Sample = { theta: number; rObs: number; cos: number; sin: number };
type SearchHit = { dx: number; dy: number; completeness: number; rms: number; offset: number };

/**
 * Translation search over a disk of candidate offsets.  For every candidate
 * centre the radial darkness profile of each angular sector is examined: the
 * printed ring shows up as a narrow dark peak near radius 1.60 mm.  The score
 * is the fraction of sectors whose dark peak sits at the printed radius —
 * a circle test, not a darkness test.  Straight rule lines, shadows, pen ink
 * and neighbour rings cannot compose a full circle at the printed radius.
 */
function searchRingOffset(
  image: GrayImage,
  cx: number,
  cy: number,
  reference: number,
  neighbours: readonly ResponseArea[],
): SearchHit {
  const ppm = CANONICAL_PIXELS_PER_MM;
  const cfg = RING_REFINE;
  const sectors = cfg.searchSectors;
  const radialStepMm = 0.1;
  const candidates: { dx: number; dy: number }[] = [{ dx: 0, dy: 0 }];
  for (const radius of cfg.searchRadiiMm) {
    if (radius === 0) continue;
    const count = Math.max(8, Math.round(radius * 18));
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      candidates.push({ dx: radius * Math.cos(angle), dy: radius * Math.sin(angle) });
    }
  }
  let best: SearchHit | null = null;
  for (const candidate of candidates) {
    let hits = 0, sumSq = 0;
    for (let sector = 0; sector < sectors; sector++) {
      const angle = ((sector + 0.5) / sectors) * 2 * Math.PI;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      let bestDarkness = -1, bestRadius = NaN;
      for (let r = cfg.searchBandInnerMm; r <= cfg.searchBandOuterMm + 1e-9; r += radialStepMm) {
        const px = Math.round(cx + candidate.dx * ppm + cos * r * ppm - 0.5);
        const py = Math.round(cy + candidate.dy * ppm + sin * r * ppm - 0.5);
        if (px < 0 || py < 0 || px >= image.width || py >= image.height) continue;
        const xMm = (px + 0.5) / ppm, yMm = (py + 0.5) / ppm;
        if (isCoveredByNeighbour(xMm, yMm, neighbours)) continue;
        const darkness = normalizedDarkness(image.data[py * image.width + px]!, reference);
        if (darkness > bestDarkness) { bestDarkness = darkness; bestRadius = r; }
      }
      if (bestDarkness >= cfg.darknessThreshold && Math.abs(bestRadius - NOMINAL_RADIUS_MM) <= cfg.searchRadiusToleranceMm) {
        hits++;
        sumSq += (bestRadius - NOMINAL_RADIUS_MM) ** 2;
      } else {
        sumSq += cfg.searchRadiusToleranceMm ** 2;
      }
    }
    const completeness = hits / sectors;
    const rms = Math.sqrt(sumSq / sectors);
    const offset = Math.hypot(candidate.dx, candidate.dy);
    const better = !best ||
      completeness > best.completeness + 1e-9 ||
      (Math.abs(completeness - best.completeness) <= 1e-9 && rms < best.rms - 1e-9) ||
      (Math.abs(completeness - best.completeness) <= 1e-9 && Math.abs(rms - best.rms) <= 1e-9 && offset < best.offset - 1e-9);
    if (better) best = { dx: candidate.dx, dy: candidate.dy, completeness, rms, offset };
  }
  return best!;
}

/**
 * Fit a translated circle r(θ)=R+dx·cosθ+dy·sinθ to dark ring pixels.
 * Returns a validated offset; `ok:false` means “keep the nominal centre”.
 * The fit never follows the darkest pixel — it fits the *ring geometry*.
 */
export function fitRingCenter(
  image: GrayImage,
  area: ResponseArea,
  allAreas: readonly ResponseArea[] = [area],
): RingFit {
  const ppm = CANONICAL_PIXELS_PER_MM;
  const c = centreMm(area);
  const cx = c.x * ppm;
  const cy = c.y * ppm;
  const cfg = RING_REFINE;
  const { reference } = collectReferenceLevels(image, area, allAreas);
  const neighbours = nearbyResponseAreas(area, allAreas);

  // Stage 1 — translation search: where is the printed ring, if displaced?
  const hit = searchRingOffset(image, cx, cy, reference, neighbours);
  if (hit.completeness < cfg.minSearchCompleteness) {
    return {
      ok: false,
      dx: 0,
      dy: 0,
      radius: NOMINAL_RADIUS_MM,
      residual: Infinity,
      completeness: hit.completeness,
      darkPixelCount: 0,
      reason: `halka bulunamadı (tamamlık ${(hit.completeness * 100).toFixed(0)}% < ${(cfg.minSearchCompleteness * 100).toFixed(0)}%)`,
    };
  }
  const searchOffset = hit.offset;
  if (searchOffset < cfg.minOffsetMm - 1e-9) {
    return {
      ok: false,
      dx: hit.dx,
      dy: hit.dy,
      radius: NOMINAL_RADIUS_MM,
      residual: hit.rms,
      completeness: hit.completeness,
      darkPixelCount: 0,
      reason: `kayma çok küçük (${searchOffset.toFixed(3)} mm < ${cfg.minOffsetMm} mm) — nominal yeterli`,
    };
  }
  if (searchOffset > cfg.maxOffsetMm + 1e-9) {
    return {
      ok: false,
      dx: hit.dx,
      dy: hit.dy,
      radius: NOMINAL_RADIUS_MM,
      residual: hit.rms,
      completeness: hit.completeness,
      darkPixelCount: 0,
      reason: `kayma çok büyük (${searchOffset.toFixed(2)} mm > ${cfg.maxOffsetMm} mm)`,
    };
  }
  if (isCoveredByNeighbour(c.x + hit.dx, c.y + hit.dy, neighbours)) {
    return {
      ok: false,
      dx: hit.dx,
      dy: hit.dy,
      radius: NOMINAL_RADIUS_MM,
      residual: hit.rms,
      completeness: hit.completeness,
      darkPixelCount: 0,
      reason: 'komşu balonun içine kilitlenme',
    };
  }

  // Stage 2 — gather dark ring candidates in the annulus around the *found* centre.
  const scx = cx + hit.dx * ppm;
  const scy = cy + hit.dy * ppm;
  const samples: Sample[] = [];
  const inner = cfg.innerMm * ppm;
  const outer = cfg.outerMm * ppm;
  const y0 = Math.max(0, Math.floor(scy - outer));
  const y1 = Math.min(image.height - 1, Math.ceil(scy + outer));
  const x0 = Math.max(0, Math.floor(scx - outer));
  const x1 = Math.min(image.width - 1, Math.ceil(scx + outer));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const xMm = (x + 0.5) / ppm;
      const yMm = (y + 0.5) / ppm;
      if (isCoveredByNeighbour(xMm, yMm, neighbours)) continue;
      const dx = x + 0.5 - scx;
      const dy = y + 0.5 - scy;
      const distPx = Math.hypot(dx, dy);
      if (distPx < inner || distPx > outer) continue;
      const value = image.data[y * image.width + x]!;
      const darkness = normalizedDarkness(value, reference);
      if (darkness < cfg.darknessThreshold) continue;
      const theta = Math.atan2(dy, dx);
      samples.push({ theta, rObs: distPx / ppm, cos: Math.cos(theta), sin: Math.sin(theta) });
    }
  }

  if (samples.length < cfg.minDarkPixels) {
    return {
      ok: false,
      dx: hit.dx,
      dy: hit.dy,
      radius: NOMINAL_RADIUS_MM,
      residual: Infinity,
      completeness: hit.completeness,
      darkPixelCount: samples.length,
      reason: `yetersiz koyu halka pikseli (${samples.length} < ${cfg.minDarkPixels})`,
    };
  }

  // IRLS with Huber weights, initialised at the search winner.  The sample
  // radii are measured from the search centre, so the fitted ux/uy are relative
  // to it and the final offset is hit + (ux, uy).
  let weights = samples.map(() => 1);
  let R = NOMINAL_RADIUS_MM;
  let dx = hit.dx;
  let dy = hit.dy;

  for (let iter = 0; iter <= cfg.iterations; iter++) {
    // Build weighted normal equations for (R, ux, uy)
    let S1 = 0, Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, Sr = 0, Srx = 0, Sry = 0;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]!;
      const w = weights[i]!;
      S1 += w;
      Sx += w * s.cos;
      Sy += w * s.sin;
      Sxx += w * s.cos * s.cos;
      Syy += w * s.sin * s.sin;
      Sxy += w * s.cos * s.sin;
      Sr += w * s.rObs;
      Srx += w * s.rObs * s.cos;
      Sry += w * s.rObs * s.sin;
    }
    const A = [
      [S1, Sx, Sy],
      [Sx, Sxx, Sxy],
      [Sy, Sxy, Syy],
    ];
    const b = [Sr, Srx, Sry];
    const sol = solve3x3(A, b);
    if (!sol) break;
    R = sol[0]!;
    dx = hit.dx + sol[1]!;
    dy = hit.dy + sol[2]!;
    // Update Huber weights for next iter (skip last)
    if (iter === cfg.iterations) break;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]!;
      const pred = R + sol[1]! * s.cos + sol[2]! * s.sin;
      const resid = Math.abs(s.rObs - pred);
      weights[i] = resid <= cfg.huberKmm ? 1 : cfg.huberKmm / Math.max(1e-9, resid);
    }
  }

  // The sub-pixel fit may not wander away from the search winner.
  if (Math.hypot(dx - hit.dx, dy - hit.dy) > 0.35) {
    R = NOMINAL_RADIUS_MM;
    dx = hit.dx;
    dy = hit.dy;
  }

  const offset = Math.hypot(dx, dy);
  if (offset < cfg.minOffsetMm - 1e-9) {
    return {
      ok: false,
      dx,
      dy,
      radius: R,
      residual: Infinity,
      completeness: 0,
      darkPixelCount: samples.length,
      reason: `kayma çok küçük (${offset.toFixed(3)} mm < ${cfg.minOffsetMm} mm) — nominal yeterli`,
    };
  }
  if (offset > cfg.maxOffsetMm + 1e-9) {
    return {
      ok: false,
      dx,
      dy,
      radius: R,
      residual: Infinity,
      completeness: hit.completeness,
      darkPixelCount: samples.length,
      reason: `kayma çok büyük (${offset.toFixed(2)} mm > ${cfg.maxOffsetMm} mm)`,
    };
  }
  if (isCoveredByNeighbour(c.x + dx, c.y + dy, neighbours)) {
    return {
      ok: false,
      dx,
      dy,
      radius: R,
      residual: Infinity,
      completeness: hit.completeness,
      darkPixelCount: samples.length,
      reason: 'komşu balonun içine kilitlenme',
    };
  }
  if (Math.abs(R - NOMINAL_RADIUS_MM) > cfg.maxRadiusDeviationMm + 1e-9) {
    return {
      ok: false,
      dx,
      dy,
      radius: R,
      residual: Infinity,
      completeness: hit.completeness,
      darkPixelCount: samples.length,
      reason: `yarıçap mantıksız (R=${R.toFixed(2)} mm, beklenen ~${NOMINAL_RADIUS_MM} mm)`,
    };
  }

  // Residual and completeness around the fitted centre.
  let sumSq = 0;
  const sectorHasInlier = new Array(16).fill(false);
  const inlierThr = cfg.huberKmm * 1.5; // ~0.27 mm
  for (const s of samples) {
    const pred = R + (dx - hit.dx) * s.cos + (dy - hit.dy) * s.sin;
    const resid = s.rObs - pred;
    sumSq += resid * resid;
    const absResid = Math.abs(resid);
    const sector = Math.floor(((s.theta + Math.PI) / (2 * Math.PI)) * 16);
    if (absResid <= inlierThr) sectorHasInlier[Math.max(0, Math.min(15, sector))] = true;
  }
  const rms = Math.sqrt(sumSq / samples.length);
  const completeness = sectorHasInlier.filter(Boolean).length / 16;

  if (rms > cfg.maxResidualMm + 1e-9) {
    return {
      ok: false,
      dx,
      dy,
      radius: R,
      residual: rms,
      completeness,
      darkPixelCount: samples.length,
      reason: `halka uyumu zayıf (RMS ${rms.toFixed(3)} mm > ${cfg.maxResidualMm} mm)`,
    };
  }
  if (completeness < cfg.minCompleteness - 1e-9) {
    return {
      ok: false,
      dx,
      dy,
      radius: R,
      residual: rms,
      completeness,
      darkPixelCount: samples.length,
      reason: `halka çok eksik (${(completeness * 100).toFixed(0)}% < ${(cfg.minCompleteness * 100).toFixed(0)}%)`,
    };
  }

  // Additional guard: require that fit actually improves over nominal.
  // Compute nominal completeness/residual for comparison.
  let nominalSumSq = 0;
  const nominalSector = new Array(16).fill(false);
  for (const s of samples) {
    const resid = s.rObs - NOMINAL_RADIUS_MM;
    nominalSumSq += resid * resid;
    const sector = Math.floor(((s.theta + Math.PI) / (2 * Math.PI)) * 16);
    if (Math.abs(resid) <= inlierThr) nominalSector[Math.max(0, Math.min(15, sector))] = true;
  }
  const nominalCompleteness = nominalSector.filter(Boolean).length / 16;
  const nominalRms = Math.sqrt(nominalSumSq / samples.length);
  // If nominal already explains the ring almost as well and offset is tiny,
  // prefer nominal to avoid unnecessary jitter.  Offset must be >0.08 mm or
  // improve completeness by ≥1 sector.
  const completenessGain = completeness - nominalCompleteness;
  if (offset < 0.08 && completenessGain < 0.07 && rms >= nominalRms - 0.02) {
    return {
      ok: false,
      dx,
      dy,
      radius: R,
      residual: rms,
      completeness,
      darkPixelCount: samples.length,
      reason: 'nominal dairesel uyum yeterli — düzeltme gereksiz',
    };
  }

  return { ok: true, dx, dy, radius: R, residual: rms, completeness, darkPixelCount: samples.length };
}

/**
 * Convenience: try to refine a whole page’s bubbles.  Returns a map from
 * responseId to offset for every bubble where the fit is confident.
 * The caller may then call `inspectResponse` / `detectItemMarks` with the
 * shifted centre.
 */
export function refinePageCentres(
  image: GrayImage,
  areas: readonly ResponseArea[],
): Map<string, { dx: number; dy: number }> {
  const out = new Map<string, { dx: number; dy: number }>();
  for (const area of areas) {
    const fit = fitRingCenter(image, area, areas);
    if (fit.ok) out.set(area.responseId, { dx: fit.dx, dy: fit.dy });
  }
  return out;
}
