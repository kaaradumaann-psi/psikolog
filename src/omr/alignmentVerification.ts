import type { Homography } from './perspectiveCorrection';
import { mapPoint } from './perspectiveCorrection';
import type { Point } from './omrTypes';

/**
 * Agreement control for the page transform.
 *
 * The homography is always fitted from the four *observed* alignment squares — never from the QR
 * alone. The QR then has to agree with that transform, but with two important corrections over the
 * first version of this check:
 *
 * 1. **The reference is the printed QR symbol, not the regression rectangle.** The four detected
 *    squares already determine the page frame, so the whole QR area is predicted by the same
 *    transform. Comparing the decoded symbol's corners against that prediction is not circular: a
 *    wrong pairing of squares (or a marker matched to the wrong blob) moves the predicted symbol
 *    away from where the symbol actually is decoded.
 * 2. **The tolerance is a physical budget, not a fixed pixel count.** A 26 mm symbol decoded from a
 *    4 MP photo has ~0.5 px corner noise per module edge; demanding 4 px made real photos fail with
 *    "QR and real alignment square positions are inconsistent" although every square was found in
 *    the right place. The budget is expressed in millimetres and converted with the page's own
 *    scale, so it does not depend on the resolution of the capture.
 */

export const QR_AGREEMENT_MM = 3;
export const QR_AGREEMENT_MIN_PX = 4;
export const QR_AGREEMENT_MAX_PX = 24;

export type QrAgreement = {
  /** Largest distance between the predicted and the observed symbol corner, in pixels. */
  errorPx: number;
  errorMm: number;
  /** Distance budget actually applied, in pixels. */
  limitPx: number;
  consistent: boolean;
  /** Per-corner distances in pixels, in QR corner order (top-left, top-right, bottom-right, bottom-left). */
  perCornerPx: number[];
};

export type QrAgreementResult =
  | { ok: true; agreement: QrAgreement }
  | { ok: false; agreement: QrAgreement };

/** `pixelsPerMm` is the *smaller* singular value of the transform, so the budget is conservative. */
export function evaluateQrAgreement(transform: Homography, symbolCorners: readonly Point[],
  observed: readonly Point[], pixelsPerMm: number): QrAgreement {
  const perCornerPx = symbolCorners.map((corner, index) => {
    const mapped = mapPoint(transform, corner), seen = observed[index];
    if (!seen) return Infinity;
    return Math.hypot(mapped.x - seen.x, mapped.y - seen.y);
  });
  const errorPx = Math.max(0, ...perCornerPx.filter(Number.isFinite));
  const scale = Number.isFinite(pixelsPerMm) && pixelsPerMm > 0 ? pixelsPerMm : QR_AGREEMENT_MIN_PX / QR_AGREEMENT_MM;
  const limitPx = Math.max(QR_AGREEMENT_MIN_PX, Math.min(QR_AGREEMENT_MAX_PX, QR_AGREEMENT_MM * scale));
  const errorMm = errorPx / scale;
  return { errorPx, errorMm, limitPx, consistent: errorPx <= limitPx, perCornerPx };
}

export function evaluateQrConsistency(transform: Homography, symbolCorners: readonly Point[],
  observed: readonly Point[], pixelsPerMm: number): QrAgreementResult {
  const agreement = evaluateQrAgreement(transform, symbolCorners, observed, pixelsPerMm);
  return agreement.consistent ? { ok: true, agreement } : { ok: false, agreement };
}

/** Human-readable diagnostic; the message keeps the measured value so a capture can be corrected. */
export function describeQrDisagreement(agreement: QrAgreement): string {
  return `QR ve gerçek hizalama karelerinin konumları tutarsız ` +
    `(ölçülen sapma ${agreement.errorMm.toFixed(1)} mm ≈ ${agreement.errorPx.toFixed(1)} px, ` +
    `izin verilen ${agreement.limitPx.toFixed(1)} px). ` +
    'Kâğıdın dört köşe karesi ile QR kodunun ikisi de net görünecek şekilde, sayfaya dik açıdan yeniden çekin.';
}
