import { useEffect, useId, useRef, useState } from 'react';
import type { PixelImage } from '../omr/omrTypes';
import { capturePixels } from '../scanner/imageIO';
import { adviseCameraFrame } from '../scanner/cameraAdvisor';
import type { CameraAdvice } from '../scanner/cameraAdvisor';
import { CameraOverlay } from './CameraOverlay';

export type CameraCaptureProps = {
  onCapture: (image: PixelImage, sourceName: string, originalImage: PixelImage) => void | Promise<void>;
  disabled?: boolean;
};

function cameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Kamera izni verilmedi. Tarayıcının site izinlerinden kameraya izin verin veya JPG, PNG, WEBP, AVIF, HEIC ya da PDF yükleyin.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'Kamera bulunamadı. Bir kamera bağlayın veya görüntü/PDF yükleyin.';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'Kamera başka bir uygulamada açık olabilir. Diğer uygulamayı kapatıp yeniden deneyin.';
  if (name === 'SecurityError') return 'Tarayıcı kamera erişimini engelliyor. HTTPS bağlantısı ve site izinlerini kontrol edin.';
  return 'Kamera başlatılamadı. Site izinlerini kontrol edin, tekrar deneyin veya dosya yükleyin.';
}

function frameToGray(source: CanvasImageSource, width: number, height: number) {
  const stride = 2;
  const w = Math.max(60, Math.floor(width / stride));
  const h = Math.max(60, Math.floor(height / stride));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, 0, 0, w, h);
  const data = context.getImageData(0, 0, w, h).data;
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    const at = i * 4;
    gray[i] = Math.round(0.299 * data[at]! + 0.587 * data[at + 1]! + 0.114 * data[at + 2]!);
  }
  return { width: w, height: h, data: gray };
}

export function CameraCapture({ onCapture, disabled = false }: CameraCaptureProps) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const attempt = useRef(0);
  const alive = useRef(true);
  const capturing = useRef(false);
  const [active, setActive] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [ready, setReady] = useState(false);
  const [aspect, setAspect] = useState(3 / 4);
  const [error, setError] = useState('');
  const [advice, setAdvice] = useState<CameraAdvice | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const labelId = useId();

  function stop() {
    attempt.current++;
    stream.current?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    stream.current = null;
    if (video.current) { video.current.pause(); video.current.srcObject = null; }
    if (alive.current) {
      setActive(false); setRequesting(false); setReady(false); setAdvice(null);
      setVideoSize({ width: 0, height: 0 });
    }
  }

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; stop(); };
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      const element = video.current;
      if (!element || element.readyState < 2 || !element.videoWidth) return;
      const gray = frameToGray(element, element.videoWidth, element.videoHeight);
      if (!gray) return;
      const next = adviseCameraFrame(gray);
      if (!cancelled) setAdvice(next);
    }, 700);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active]);

  async function start() {
    if (disabled || requesting || active) return;
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(window.isSecureContext
        ? 'Bu tarayıcı kamera erişimini desteklemiyor. Güncel bir tarayıcı veya dosya yükleme kullanın.'
        : 'Tarayıcı kamerayı yalnızca HTTPS veya localhost üzerinde açar; bu kural tarayıcıya aittir, ' +
          'uygulama aşamaz. Siteyi HTTPS ile yayınlayın ya da http://localhost üzerinden açın. ' +
          'Şimdilik dosya yükleme ile devam edebilirsiniz.');
      return;
    }
    const ticket = ++attempt.current;
    setRequesting(true);
    try {
      const next = await navigator.mediaDevices.getUserMedia({ audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 } } });
      if (!alive.current || ticket !== attempt.current) { next.getTracks().forEach(track => track.stop()); return; }
      stream.current = next;
      next.getVideoTracks().forEach(track => {
        track.onended = () => {
          if (alive.current && ticket === attempt.current) { stop(); setError('Kamera bağlantısı kesildi. Yeniden başlatın veya dosya yükleyin.'); }
        };
      });
      if (!video.current) { stop(); return; }
      video.current.srcObject = next;
      setActive(true);
      await video.current.play();
      if (!alive.current || ticket !== attempt.current) return;
      setReady(video.current.readyState >= 2 && video.current.videoWidth > 0);
      setRequesting(false);
    } catch (failure) {
      if (!alive.current || ticket !== attempt.current) return;
      stop();
      setError(cameraError(failure));
    }
  }

  async function capture() {
    if (!video.current || disabled || !ready || capturing.current) return;
    capturing.current = true;
    setError('');
    try {
      const fullWidth = video.current.videoWidth, fullHeight = video.current.videoHeight;
      // `capturePixels` already bounds the frame to the OMR input size. The same immutable pixel
      // buffer can safely serve both analysis and the human-reference preview; taking a second
      // full RGBA snapshot would needlessly double peak camera memory.
      const capture = capturePixels(video.current, fullWidth, fullHeight);
      stop();
      await onCapture(capture, `Kamera · ${new Date().toLocaleString('tr-TR')}`, capture);
    } catch (failure) {
      if (alive.current) setError(failure instanceof Error ? failure.message : 'Çekim alınamadı. Lütfen yeniden deneyin.');
    } finally { capturing.current = false; }
  }

  return <section className="scan-camera" aria-labelledby={labelId}>
    <h3 id={labelId}>Kamerayla sayfa ekle</h3>
    <p>Kağıdı düz tutun; dört köşe işareti ve QR kodu görünür olsun. Çerçeve yalnızca rehberdir; görüntü kırpılmaz.</p>
    <div className="scan-camera-stage" hidden={!active && !requesting} style={{ aspectRatio: aspect }}>
      <video ref={video} playsInline muted autoPlay aria-label="Canlı kamera görüntüsü"
        onLoadedData={() => {
          if (stream.current && video.current?.videoWidth && video.current.videoHeight) {
            setReady(true);
            setAspect(video.current.videoWidth / video.current.videoHeight);
            setVideoSize({ width: video.current.videoWidth, height: video.current.videoHeight });
          }
        }} />
      <CameraOverlay advice={advice} videoWidth={videoSize.width} videoHeight={videoSize.height} />
      <div className="scan-camera-overlay" aria-hidden="true"><span>A4 · tüm sayfa</span></div>
      {requesting && <span className="scan-camera-wait">Kamera izni / görüntü bekleniyor…</span>}
    </div>
    <div className="scan-actions">
      {!active && !requesting && <button type="button" className="btn-primary" onClick={() => void start()} disabled={disabled}>Kamerayı başlat</button>}
      {(active || requesting) && <button type="button" className="btn-secondary" onClick={stop}>Kamerayı durdur</button>}
      {active && <button type="button" className="btn-primary" disabled={!ready || disabled || requesting} onClick={() => void capture()}>Sayfayı çek ve oku</button>}
    </div>
    {error && <p className="scan-alert" role="alert">{error}</p>}
  </section>;
}
