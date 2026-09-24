import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/** Masaüstü kâğıt genişliği (px): .pr-report / .psych-paper max-width değeriyle birebir. */
const PAPER_WIDTH = 760;

type PaperViewportProps = {
  children: ReactNode;
  /** Kâğıdın içinde yüzdüğü gri çerçeveye ek sınıf (örn. report-full-preview-body). */
  frameClassName?: string;
  /** Çerçeve için erişilebilir ad. */
  label?: string;
};

type Mode = 'fit' | 'full';

/**
 * A4 belge görüntüleyici: kâğıt her ekranda MASAÜSTÜ tasarımıyla (760px) dizilir,
 * dar ekranlarda ise bir belge görüntüleyici gibi ölçeklenir.
 *
 *   • `fit`  — kâğıt, çerçevenin genişliğine orantılı küçültülür (transform: scale);
 *              düzen, tipografi ve tablolar masaüstüyle birebir aynı kalır, sayfa
 *              yatay kaymaz. Ölçek 1'e eşitse (geniş ekran) düğme çubuğu gizlenir.
 *   • `full` — %100 ölçek: kâğıt gerçek boyutunda, çerçeve içinde yatay kaydırma
 *              ile incelenir (PDF görüntüleyici davranışı). Kaydırma çerçevede
 *              kalır; sayfa gövdesi asla yatay kaymaz.
 *
 * Dönüşüm yalnızca ekrandadır: baskı/PDF hattı `.print-only` kopyalarından
 * üretildiği için bu bileşen yazdırma çıktısını etkilemez.
 */
export function PaperViewport({ children, frameClassName = '', label }: PaperViewportProps) {
  const [mode, setMode] = useState<Mode>('fit');
  const [scale, setScale] = useState(1);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef<Mode>('fit');
  modeRef.current = mode;

  const apply = useCallback(() => {
    const frame = frameRef.current;
    const sheet = sheetRef.current;
    const box = boxRef.current;
    if (!frame || !sheet || !box) return;
    const cs = getComputedStyle(frame);
    const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const available = frame.clientWidth - pad;
    if (available <= 0) return;
    const next = Math.min(1, Math.max(0.2, available / PAPER_WIDTH));
    setScale(next);
    if (modeRef.current === 'fit') {
      box.style.width = `${Math.round(PAPER_WIDTH * next)}px`;
      box.style.height = `${Math.round(sheet.offsetHeight * next)}px`;
      sheet.style.transform = `scale(${next})`;
    } else {
      box.style.width = '';
      box.style.height = '';
      sheet.style.transform = '';
    }
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const sheet = sheetRef.current;
    if (!frame || !sheet) return;
    const observer = new ResizeObserver(() => apply());
    observer.observe(frame);
    observer.observe(sheet);
    apply();
    return () => observer.disconnect();
  }, [apply]);

  useEffect(() => {
    apply();
  }, [mode, apply]);

  const showBar = scale < 0.999;

  return (
    <div className={`paper-viewport ${mode === 'fit' ? 'is-fit' : 'is-full'}`}>
      {showBar && (
        <div className="paper-viewport-bar screen-only">
          <span className="paper-viewport-hint" role="status">
            {mode === 'fit'
              ? 'Belge masaüstü düzeniyle ekrana sığdırıldı.'
              : 'Gerçek boyut: incelemek için belgeyi yana kaydırın.'}
          </span>
          <div className="paper-viewport-modes" role="group" aria-label="Belge yakınlaştırma">
            <button type="button" aria-pressed={mode === 'fit'} onClick={() => setMode('fit')}>
              Sığdır
            </button>
            <button type="button" aria-pressed={mode === 'full'} onClick={() => setMode('full')}>
              %100
            </button>
          </div>
        </div>
      )}
      <div
        className={`paper-viewport-scroll ${frameClassName}`}
        ref={frameRef}
        aria-label={label}
        data-paper-mode={mode}
      >
        <div className="paper-viewport-scale" ref={boxRef}>
          <div className="paper-viewport-sheet" ref={sheetRef}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
