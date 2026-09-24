import { useEffect, useId, useRef, useState } from 'react';
import type { GrayImage, PixelImage, Point } from '../omr/omrTypes';
import { applyManualCorners } from '../scanner/manualWarp';
import { Icon } from './Icon';

export type ManualCornerEditorProps = {
  /** Source size of the underlying image (pixel coordinates). */
  imageWidth: number;
  imageHeight: number;
  /**
   * The original camera capture. Rendered as the background of the SVG so the user sees the
   * real photo under their dragged corners. Required: without it, manual selection is blind.
   */
  imageUrl: string;
  /** Initial corner positions in image pixels, TL / TR / BR / BL. */
  corners: readonly Point[];
  /** Canonical A4 size in millimetres — comes from the form definition. */
  pageWidthMm: number;
  pageHeightMm: number;
  onChange: (corners: [Point, Point, Point, Point]) => void;
  onCancel: () => void;
  /** Prevents confirming while the failed auto-read job is still unwinding. */
  disabled?: boolean;
  /** Receives the warped grayscale page ready to be passed back to OMR. */
  onConfirm: (warped: GrayImage) => void;
  onAuto: () => void;
};

/**
 * Drag-the-corners editor with a live warped preview. Used as the fallback when the auto
 * alignment detector cannot find all four squares. The preview canvas shows what `analyzePage`
 * will see when the user confirms, so they can verify the result before it is fed into the
 * existing OMR pipeline (no parallel OMR path — the warped image is just `page.normalized`).
 *
 * Touch and mouse are unified through Pointer Events; `touch-action: none` on the SVG keeps
 * the page from scrolling while the user drags a corner on a phone.
 */
export function ManualCornerEditor({
  imageWidth, imageHeight, imageUrl, corners, pageWidthMm, pageHeightMm,
  onChange, onCancel, disabled = false, onConfirm, onAuto,
}: ManualCornerEditorProps) {
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const [activeCorner, setActiveCorner] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  // The image source as RGBA, fetched once and reused for every warp preview.
  const [sourceImage, setSourceImage] = useState<PixelImage | null>(null);
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageUrl;
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, 0, 0);
      try {
        const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        setSourceImage({ width: canvas.width, height: canvas.height, data });
      } catch { /* CORS taint on the source; preview disabled gracefully. */ }
    };
    return () => { cancelled = true; };
  }, [imageUrl]);

  function pointerToImage(event: React.PointerEvent<SVGSVGElement>) {
    const element = svgRef.current;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = ((event.clientX - rect.left) / rect.width) * imageWidth;
    const y = ((event.clientY - rect.top) / rect.height) * imageHeight;
    return { x: Math.max(0, Math.min(imageWidth, x)), y: Math.max(0, Math.min(imageHeight, y)) };
  }

  function onPointerDown(index: number, event: React.PointerEvent<SVGCircleElement>) {
    if (disabled) return;
    event.preventDefault();
    try { (event.target as Element).setPointerCapture(event.pointerId); } catch { /* releasePointerCapture below handles the failure case */ }
    drag.current = index;
    setActiveCorner(index);
    setError('');
  }

  function onCornerKeyDown(index: number, event: React.KeyboardEvent<SVGCircleElement>) {
    if (disabled) return;
    const directions: Record<string, Point> = {
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const step = Math.max(1, Math.round(Math.min(imageWidth, imageHeight) / (event.shiftKey ? 50 : 250)));
    const next = [...corners] as [Point, Point, Point, Point];
    next[index] = {
      x: Math.max(0, Math.min(imageWidth, next[index]!.x + direction.x * step)),
      y: Math.max(0, Math.min(imageHeight, next[index]!.y + direction.y * step)),
    };
    setActiveCorner(index);
    setError('');
    onChange(next);
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (drag.current === null) return;
    const point = pointerToImage(event);
    if (!point) return;
    const next = [...corners] as [Point, Point, Point, Point];
    next[drag.current] = point;
    onChange(next);
  }

  function onPointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (drag.current !== null && (event.target as Element).hasPointerCapture?.(event.pointerId)) {
      try { (event.target as Element).releasePointerCapture(event.pointerId); } catch { /* ignore */ }
    }
    drag.current = null;
    setActiveCorner(null);
  }

  // Live warped preview. We try a low-resolution version of the production warp on every corner
  // change so dragging stays responsive; confirmation reruns the exact OMR resolution. If the
  // warp throws (because the polygon is degenerate), we surface the Turkish error inline.
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  // A live drag must not run the full 8 px/mm OMR warp on every pointer event. The preview is
  // visual guidance only; confirmation below reruns the exact production-resolution warp.
  const previewPixelsPerMm = 2;
  useEffect(() => {
    const element = previewCanvasRef.current;
    if (!element || !sourceImage) return;
    setError('');
    try {
      const result = applyManualCorners({
        source: sourceImage, corners: corners as [Point, Point, Point, Point],
        pageWidthMm, pageHeightMm, pixelsPerMm: previewPixelsPerMm,
      });
      element.width = result.normalized.width;
      element.height = result.normalized.height;
      const context = element.getContext('2d');
      if (!context) return;
      const pixels = context.createImageData(result.normalized.width, result.normalized.height);
      for (let i = 0; i < result.normalized.data.length; i++) {
        const value = result.normalized.data[i]!;
        pixels.data[i * 4] = value;
        pixels.data[i * 4 + 1] = value;
        pixels.data[i * 4 + 2] = value;
        pixels.data[i * 4 + 3] = 255;
      }
      context.putImageData(pixels, 0, 0);
    } catch (failure) {
      // Reset canvas so the user sees a clean state when the error clears.
      element.width = 0; element.height = 0;
      setError(failure instanceof Error ? failure.message : 'Geçersiz köşe seçimi.');
    }
  }, [sourceImage, corners, pageWidthMm, pageHeightMm]);

  function handleConfirm() {
    if (!sourceImage) return;
    setError('');
    setConfirming(true);
    try {
      const result = applyManualCorners({
        source: sourceImage, corners: corners as [Point, Point, Point, Point],
        pageWidthMm, pageHeightMm,
      });
      onConfirm(result.normalized);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Geçersiz köşe seçimi.');
    } finally {
      setConfirming(false);
    }
  }

  return <section className="manual-corner-editor" aria-labelledby={`${id}-title`}>
    <div className="manual-corner-editor-header">
      <div>
        <span className="section-badge badge-primary">Manuel Köşe</span>
        <h4 id={`${id}-title`} className="section-heading-sm">Köşeleri elle ayarlayın</h4>
        <p className="scan-enhancer-hint">Kağıdın dört köşesini sırayla (sol üst, sağ üst, sağ alt, sol alt) sürükleyin. Sağdaki önizleme, mevcut OMR hattına gönderilecek düzeltilmiş görüntüdür.</p>
      </div>
      <div className="manual-corner-actions">
        <button type="button" className="btn-secondary btn-sm" onClick={onAuto} disabled={disabled}>
          <Icon name="sparkles" size={14} />
          <span>Otomatik Algıla</span>
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={onCancel} disabled={disabled}>Vazgeç</button>
        <button type="button" className="btn-primary btn-sm"
          disabled={disabled || !sourceImage || confirming || error.length > 0}
          onClick={handleConfirm}>
          <Icon name="check" size={14} />
          <span>Bu Köşeleri Kullan</span>
        </button>
      </div>
    </div>
    <div className="manual-corner-grid">
      <svg
        ref={svgRef}
        className="manual-corner-canvas"
        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        role="group"
        aria-label="Kağıt köşelerini seçin"
      >
        <image href={imageUrl} x={0} y={0} width={imageWidth} height={imageHeight} preserveAspectRatio="none" aria-hidden="true" />
        <polygon
          points={corners.map(corner => `${corner.x},${corner.y}`).join(' ')}
          className={`manual-corner-polygon ${activeCorner !== null ? 'is-active' : ''}`}
          aria-hidden="true"
        />
        {corners.map((corner, index) => (
          <circle
            key={index}
            cx={corner.x}
            cy={corner.y}
            r={Math.max(14, imageWidth * 0.018)}
            className={`manual-corner-handle ${activeCorner === index ? 'is-active' : ''}`}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`${LABELS[index]} köşe`}
            aria-disabled={disabled}
            onFocus={() => setActiveCorner(index)}
            onBlur={() => setActiveCorner(null)}
            onKeyDown={event => onCornerKeyDown(index, event)}
            onPointerDown={event => onPointerDown(index, event as unknown as React.PointerEvent<SVGCircleElement>)}
          >
            <title>{LABELS[index]} köşe. Ok tuşlarıyla taşıyın.</title>
          </circle>
        ))}
      </svg>
      <aside className="manual-corner-preview">
        <div className="manual-corner-preview-header">OMR önizlemesi</div>
        <canvas ref={previewCanvasRef} className="manual-corner-preview-canvas" />
        {error && <p className="status-banner warning-banner" role="alert">{error}</p>}
      </aside>
    </div>
  </section>;
}

const LABELS = ['Sol üst', 'Sağ üst', 'Sağ alt', 'Sol alt'];
