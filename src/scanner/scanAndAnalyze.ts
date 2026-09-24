import type { FormDefinition, PixelImage, Point } from '../omr/omrTypes';
import { analyzePage, MAX_INPUT_PIXELS } from '../omr/analyzePage';
import type { PageReadResult } from '../results/scanResultTypes';
import { autoScanDocument, expandQuadOutward, grayToPixelImage, isotropicUpscale } from './documentScan';
import type { DocumentScanResult } from './documentScan';
import { optimizeOmrInput } from './imageIO';
import { toGrayscale } from '../omr/imageQuality';
import { normalizeShadows } from './shadowNormalization';

/**
 * Automatic capture → OMR orchestration.
 *
 * `autoScanDocument` rectifies the photo into a flatbed-looking page, but one setting does not
 * fit every capture: a 960×1280 Messenger photo needs a *controlled* upscale to ~8 px/mm so the
 * QR code becomes decodable, while the heavy photographic cleanup that helps bubble reading can
 * slightly damage the QR modules of an upscaled capture. Instead of picking one compromise, we
 * try a short ladder of (resolution × cleanup) strategies and keep the first one the existing
 * OMR engine accepts. Detection runs once; the later strategies reuse the detected corners so
 * they only pay for the warp + cleanup.
 *
 * The OMR engine itself is untouched: every strategy still ends in the same `analyzePage`, so
 * MMPI scoring, page identity and the QR consistency check behave exactly as before.
 */
export type ScanStrategy = {
  /** Output resolution override in px/mm; omitted = adaptive native-driven value. */
  pixelsPerMm?: number;
  /**
   * Geometry-preserving isotropic upscale of the *raw* capture (no quad warp, no detection).
   * For low-resolution captures whose raw geometry is internally consistent — a quad warp would
   * inject projective distortion, a plain resample only adds sampling density. The factor is
   * derived from the pixel budget, not a blind constant.
   */
  upscale?: boolean;
  clean: 'full' | 'shadow' | 'none';
};

export const SCAN_STRATEGIES: ScanStrategy[] = [
  // Native-driven resolution with the full photographic cleanup — best bubble reading, and the
  // only setting the already-good A/C captures ever need.
  { clean: 'full' },
  // Controlled upscale to the OMR canonical raster with gentle cleanup — the QR-friendly setting
  // for low-resolution phone captures.
  { pixelsPerMm: 8, clean: 'shadow' },
  // Same upscale, raw warped grayscale — last resort when any cleanup blurs the QR modules.
  { pixelsPerMm: 8, clean: 'none' },
  // Warp-free isotropic upscale of the raw capture: reached only when every warped strategy
  // failed, i.e. when the detected quad is too noisy to trust but the capture's own geometry is
  // consistent (validation showed raw QR-agreement error ≤ 2.7 px on 522/525/526 while their
  // 8 ppm warps tripped the extreme-perspective guard).
  { upscale: true, clean: 'shadow' },
  { upscale: true, clean: 'none' },
];

export type StrategyAttempt = {
  strategy: ScanStrategy;
  ok: boolean;
  code?: string;
};

export type AutoScanAnalysis = {
  /** The rectified page that produced the returned result. */
  scan: DocumentScanResult;
  /** `analyzePage` result for `scan.image` (ok on success, last attempt otherwise). */
  result: PageReadResult;
  /** Index into the strategy list of the returned pair. */
  strategyIndex: number;
  /** Per-strategy outcome, for diagnostics/UI. */
  attempts: StrategyAttempt[];
};

/**
 * Run the automatic scan ladder and return the first strategy the OMR engine accepts. When no
 * strategy succeeds, the last attempt is returned so callers keep their existing failure
 * handling (manual-corner fallback, retry hints) unchanged.
 */
export async function autoScanAndAnalyze(source: PixelImage, definition: FormDefinition,
  strategies: ScanStrategy[] = SCAN_STRATEGIES): Promise<AutoScanAnalysis> {
  // Son güvenlik ağı: her yoldan (dosya, kamera, PDF, manuel warp) gelen görüntü,
  // OMR giriş bütçesini aşıyorsa otomatik küçültülür; kullanıcı asla "12 megapiksel
  // sınırını aşıyor" hatasıyla karşı karşıya kalmaz. Bütçe içindeki görüntüler
  // aynen kullanılır (gereksiz yeniden örneklenmez).
  const prepared = optimizeOmrInput(source);
  const workSource = prepared.image;
  const attempts: StrategyAttempt[] = [];
  let firstScan: DocumentScanResult | null = null;
  let last: AutoScanAnalysis | null = null;
  for (let index = 0; index < strategies.length; index++) {
    const strategy = strategies[index]!;
    let scan!: DocumentScanResult;
    if (strategy.upscale) {
      // Warp-free path: plain resample of the raw capture, no detection cost, no projective
      // distortion. Reached only after every warped strategy failed. The base factor is the
      // largest uniform scale that keeps the raster inside a 9M-pixel budget (analyzePage's own
      // input cap is 12M), clamped to ×3. jsQR's multi-scale sampling is sensitive to sub-percent
      // raster sizes at the decode boundary, so a short derived factor set (base rounded to one
      // decimal, plus the ×2 and ×3 steps) is tried; the first factor the OMR engine accepts wins.
      //
      // Her factor, `analyzePage`'in 12 MP giriş bütçesinin (MAX_INPUT_PIXELS) İÇİNDE KALACAK
      // şekilde kelepçelenir. Önceki sürümde sabit ×2/×3 adımları, 5-6 MP'lik telefon
      // yakalamalarında 24-53 MP üretip "12 megapiksel sınırını aşıyor" hatası döndürüyordu.
      const gray = toGrayscale(workSource);
      const sourcePixels = workSource.width * workSource.height;
      const hardMaxFactor = Math.sqrt(MAX_INPUT_PIXELS / sourcePixels);
      const base = Math.min(3, Math.sqrt(9_000_000 / sourcePixels));
      const factors = [...new Set([Math.round(base * 10) / 10, 2, 3])]
        .map(value => Math.min(3, hardMaxFactor, value))
        .filter(value => Number.isFinite(value) && value >= 1)
        .sort((a, b) => a - b);
      let result: PageReadResult | null = null;
      if (factors.length === 0) {
        // Kaynak zaten bütçenin üstünde: upscale yerine görüntüyü olduğu gibi dene.
        scan = {
          image: grayToPixelImage(gray), quad: null, warped: false, pixelsPerMm: 0,
          stages: [], note: 'Upscale bütçesi aşıldı; görüntü olduğu gibi işlendi.',
        };
        result = await analyzePage(scan.image, definition);
      } else {
        for (const factor of factors) {
          const up = isotropicUpscale(gray, factor);
          const cleaned = strategy.clean === 'shadow'
            ? normalizeShadows(up, { force: true, radiusFraction: 0.08 })
            : up;
          scan = {
            image: grayToPixelImage(cleaned), quad: null, warped: false, pixelsPerMm: 0,
            stages: strategy.clean === 'shadow' ? ['shadow'] : [],
            note: `Geometriyi koruyan izotropik upscale ×${factor.toFixed(1)} (warp yok).`,
          };
          result = await analyzePage(scan.image, definition);
          if (result.ok) break;
        }
      }
      attempts.push({ strategy, ok: result!.ok, code: result!.ok ? undefined : result!.code });
      last = { scan, result: result!, strategyIndex: index, attempts };
      if (result!.ok) return last;
      continue;
    }
    scan = index === 0 || !firstScan?.quad
      ? autoScanDocument(workSource, { pixelsPerMm: strategy.pixelsPerMm, clean: strategy.clean })
      // Detection already ran for this capture — reuse its corners, only re-warp/re-clean.
      : autoScanDocument(workSource, {
        corners: firstScan.quad.corners as [Point, Point, Point, Point],
        pixelsPerMm: strategy.pixelsPerMm, clean: strategy.clean,
      });
    if (index === 0) firstScan = scan;
    let result = await analyzePage(scan.image, definition);
    // Detection hugs the paper edge and can shave a sliver of the sheet, which `analyzePage`
    // rejects as PAGE_CROPPED. Over-including is safe (the OMR transform is re-fitted from the
    // printed squares), so on PAGE_CROPPED we retry once with a slightly widened quad — but only
    // then, because a needless desk margin degrades captures whose sheet fills the frame.
    if (!result.ok && result.code === 'PAGE_CROPPED' && scan.quad) {
      const widened = autoScanDocument(workSource, {
        corners: expandQuadOutward(scan.quad.corners as [Point, Point, Point, Point], workSource.width, workSource.height, 0.03),
        pixelsPerMm: strategy.pixelsPerMm, clean: strategy.clean,
      });
      const retry = await analyzePage(widened.image, definition);
      if (retry.ok) { scan = widened; result = retry; }
    }
    attempts.push({ strategy, ok: result.ok, code: result.ok ? undefined : result.code });
    last = { scan, result, strategyIndex: index, attempts };
    if (result.ok) return last;
  }
  return last!;
}
