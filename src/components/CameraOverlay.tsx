import type { CameraAdvice } from '../scanner/cameraAdvisor';
import { hintLabel, pageBoxCorners } from '../scanner/cameraAdvisor';

export type CameraOverlayProps = {
  advice: CameraAdvice | null;
  /** Source size of the underlying `<video>` element. */
  videoWidth: number;
  videoHeight: number;
};

/**
 * Live HUD drawn on top of the camera preview. Pure SVG so it scales crisply on any phone.
 * The page-detection rectangle is best-effort guidance for the user; the actual page alignment
 * is still decided by the OMR pipeline's alignment squares — this overlay exists so the user
 * gets immediate feedback that the sheet is in the frame.
 */
export function CameraOverlay({ advice, videoWidth, videoHeight }: CameraOverlayProps) {
  if (!videoWidth || !videoHeight) return null;
  const hint = advice?.hint ?? 'no-page';
  const tone = HINT_TONE[hint];
  const corners = advice?.pageBox ? pageBoxCorners(advice.pageBox) : null;
  const points = corners ? corners.map(corner => `${(corner.x / videoWidth) * 100},${(corner.y / videoHeight) * 100}`).join(' ') : '';
  return <div className="scan-camera-hud" aria-live="polite">
    <svg className="scan-camera-hud-frame" viewBox={`0 0 ${videoWidth} ${videoHeight}`} preserveAspectRatio="none" aria-hidden="true">
      {points ? <polygon data-testid="page-detected-polygon" points={points} className={`page-frame ${tone}`} /> : null}
    </svg>
    <div className={`scan-camera-hud-tag ${tone}`} role="status">
      <span className="dot" />
      <span>{hintLabel(hint)}</span>
    </div>
  </div>;
}

const HINT_TONE: Record<string, string> = {
  ok: 'is-ok',
  'page-detected': 'is-ok',
  'too-dark': 'is-warn',
  'too-bright': 'is-warn',
  'too-blurry': 'is-warn',
  flat: 'is-warn',
  'no-page': 'is-info',
};
