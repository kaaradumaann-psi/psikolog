import { useEffect, useId, useRef, useState } from 'react';
import type { FormDefinition, PixelImage, Point } from '../omr/omrTypes';
import type { AuthenticatedUser } from '../auth/authTypes';
import { autoScanAndAnalyze } from '../scanner/scanAndAnalyze';
import { summarizeResults } from '../results/resultNormalizer';
import { acceptPage, autoResolveUnresolvedItems, createScanSet, listUnresolvedItems, missingPageNumbers, removePage, setManualReview, sortedPages } from '../scanner/pageSequence';
import type { ScanSet } from '../scanner/pageSequence';
import { checkAborted, identifyFile, normalizedThumbnail, pixelImageToBlobUrl, readImageFile, SCAN_LIMITS, yieldToScreen } from '../scanner/imageIO';
import { readPdfPages } from '../scanner/pdfIO';
import type { SourcePage } from '../scanner/pdfIO';
import { CameraCapture } from './CameraCapture';
import { ConfirmDialog } from './ConfirmDialog';
import { ScanResultPreview } from './ScanResultPreview';
import { RecordCapture } from './RecordCapture';
import { MyRecordsPanel } from './MyRecordsPanel';
import { ManualCornerEditor } from './ManualCornerEditor';
import { Icon } from './Icon';
import { MMPI_MAX_BLANK } from '../workspace/caseTypes';
import { verdictFromQuality } from '../scanner/qualityGate';
import '../styles/scanner.css';
import '../styles/scanner-enhancements.css';

export type ScannerWorkspaceProps = {
  definition: FormDefinition;
  actor: AuthenticatedUser;
  embedded?: boolean;
  onScanChange?: (scan: ScanSet) => void;
  /** F5 sonrası taslaktan geri yüklenen tarama (görseller hariç, veriler dahil). */
  initialScan?: ScanSet | null;
};

export function ScannerWorkspace({ definition, actor, embedded = false, onScanChange, initialScan = null }: ScannerWorkspaceProps) {
  return (
    <ScannerSession
      key={definition.fingerprint}
      definition={definition}
      actor={actor}
      embedded={embedded}
      onScanChange={onScanChange}
      initialScan={initialScan}
    />
  );
}

function ScannerSession({
  definition,
  actor,
  embedded,
  onScanChange,
  initialScan,
}: {
  definition: FormDefinition;
  actor: AuthenticatedUser;
  embedded: boolean;
  onScanChange?: (scan: ScanSet) => void;
  initialScan: ScanSet | null;
}) {
  const [scan, setScan] = useState<ScanSet>(() => initialScan ?? createScanSet());
  const current = useRef(scan);
  const alive = useRef(true);
  const job = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(() =>
    initialScan && Object.keys(initialScan.pages).length > 0
      ? `Taslak geri yüklendi: ${Object.keys(initialScan.pages).length} sayfanın verisi ve düzeltmeleri korundu. Önizleme görselleri yeniden okutmadıkça gösterilemez.`
      : 'İlk yüklenen sayfa, bu oturumun form set kodunu belirler.',
  );
  const [alerts, setAlerts] = useState<{ id: number; message: string }[]>([]);
  const alertId = useRef(0);
  const [source, setSource] = useState<'files' | 'camera'>('files');
  const [cameraKey, setCameraKey] = useState(0);
  const [retryHint, setRetryHint] = useState<{ message: string; tips: string[] } | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(() => {
    const numbers = initialScan ? Object.keys(initialScan.pages).map(Number).sort((a, b) => a - b) : [];
    return numbers[0] ?? null;
  });
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmAutoResolve, setConfirmAutoResolve] = useState(false);
  const [recordsRefresh, setRecordsRefresh] = useState(0);
  const [manualCorners, setManualCorners] = useState<{
    image: PixelImage; corners: [Point, Point, Point, Point]; previewUrl: string; sourceName: string;
  } | null>(null);
  const manualCornersRef = useRef(manualCorners);
  manualCornersRef.current = manualCorners;
  const id = useId();
  const sourceTabs = useRef<Record<'files' | 'camera', HTMLButtonElement | null>>({ files: null, camera: null });
  const pages = sortedPages(scan);
  const missingPages = missingPageNumbers(scan, definition);
  const summary = summarizeResults(definition, pages);
  const selected = pages.find(page => page.pageNumber === selectedNumber) ?? pages[0];

  function commit(next: ScanSet) {
    current.current = next;
    if (alive.current) setScan(next);
    onScanChange?.(next);
  }

  function notify(message: string) {
    if (alive.current) setAlerts(previous => [...previous, { id: ++alertId.current, message }]);
  }

  function releaseImages(state: ScanSet) {
    sortedPages(state).forEach(page => {
      // Taslaktan dönen sayfalarda blob yok; geçersiz URL'yi çözmeye kalkışma.
      for (const url of [page.previewUrl, page.originalImageUrl]) {
        if (!url?.startsWith('blob:')) continue;
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* yoksay */
        }
      }
    });
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      job.current?.abort('unmount');
      // Blob önizlemeler burada çözülmez: gömülü modda tarama üst bileşende (ve taslakta)
      // yaşar; yöntem değiştirip dönünce aynı sayfalar ve görseller aynen geri gelir.
      // Açık sıfırlama ve sayfa silme kendi çözümlerini yapar; sekme kapanınca
      // tarayıcı kalan blob'ları zaten temizler.
      // However, the manual-corner editor's source-image blob is a one-shot URL created only
      // for the editor and must be revoked when the workspace itself unmounts, otherwise
      // closing the page mid-editing would leak the image buffer until tab close.
      const editor = manualCornersRef.current;
      if (editor?.previewUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(editor.previewUrl); } catch { /* ignore */ }
      }
      current.current = createScanSet();
    };
  }, []);

  async function run(files: File[], capture?: SourcePage) {
    if (job.current) {
      notify('Bir okuma işlemi devam ediyor. Lütfen tamamlanmasını bekleyin.');
      return;
    }
    if (!capture && !files.length) return;
    if (files.length > SCAN_LIMITS.files || files.reduce((total, file) => total + file.size, 0) > SCAN_LIMITS.batchBytes) {
      notify('Bir seçimde en çok 12 dosya ve toplam 96 MB desteklenir. Lütfen daha küçük bir grup seçin.');
      return;
    }
    const controller = new AbortController();
    job.current = controller;
    const { signal } = controller;
    setBusy(true);
    let processed = 0,
      accepted = 0,
      rejected = 0;
    // A manual editor can only show one source at a time. Stop a multi-file batch at the first
    // alignment failure instead of silently replacing that editor with the next failed page.
    let manualPending = false;
    const process = async ({ image, sourceName, originalImage }: SourcePage) => {
      checkAborted(signal);
      processed++;
      setStatus(`${sourceName}: köşe işaretleri, QR kimliği ve optik cevaplar taranıyor…`);
      await yieldToScreen(signal);
      let previewUrl: string | undefined;
      let originalImageUrl: string | undefined;
      let manualPreviewUrl: string | undefined;
      let manualPreviewTransferred = false;
      try {
        // Automatic scan ladder: the raw capture is rectified into a flatbed-looking page and
        // handed to the untouched OMR engine; the first strategy it accepts wins
        // (see scanner/scanAndAnalyze). Failures keep the exact same codes, so the manual
        // corner fallback below behaves as before.
        const { result } = await autoScanAndAnalyze(image, definition);
        checkAborted(signal);
        // Manual-corner rescue opens on ALIGNMENT_MISSING and on LOW_RESOLUTION: in both cases
        // the automatic read is rejected, but the user can still continue with the verified
        // ManualCornerEditor → manualWarp → analyzePage path (proven to read 960–1280 px phone
        // captures during real-photo validation). LOW_RESOLUTION stays a failure for automatic
        // OMR — only the manual option is offered.
        if (!result.ok && (result.code === 'ALIGNMENT_MISSING' || result.code === 'LOW_RESOLUTION')) {
          // Auto-detection failed — give the user a manual fallback so the page is not silently
          // rejected. The original capture goes to ManualCornerEditor which lets the user pick
          // the four alignment-square centres in image-pixel coordinates.
          manualPending = true;
          const editorImage = originalImage ?? image;
          manualPreviewUrl = await pixelImageToBlobUrl(editorImage, signal);
          checkAborted(signal);
          if (alive.current) {
            const width = editorImage.width, height = editorImage.height;
            const pad = Math.round(Math.min(width, height) * 0.06);
            const corners: [Point, Point, Point, Point] = [
              { x: pad, y: pad },
              { x: width - pad, y: pad },
              { x: width - pad, y: height - pad },
              { x: pad, y: height - pad },
            ];
            manualPreviewTransferred = true;
            const nextEditor = {
              image: editorImage,
              corners,
              previewUrl: manualPreviewUrl!,
              sourceName: `${sourceName} · manuel köşe`,
            };
            // Keep the ref in sync before React paints. If the parent unmounts during this
            // async continuation, cleanup can still revoke the newly transferred blob URL.
            manualCornersRef.current = nextEditor;
            setManualCorners(previous => {
              if (previous?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(previous.previewUrl);
              return nextEditor;
            });
          }
          rejected++;
          // Reason sentence differs by failure code; the rest of the flow is unchanged.
          const reason = result.code === 'LOW_RESOLUTION'
            ? 'Çözünürlük otomatik okuma için yetersiz.'
            : 'Hizalama kareleri otomatik bulunamadı.';
          setRetryHint({
            message: `${sourceName}: ${reason}`,
            tips: ['Sayfayı daha düz ve dik açıdan çekin.', 'Yukarıdaki "Manuel Köşe" düzenleyici ile dört köşeyi elle seçin.'],
          });
          notify(`${sourceName}: ${reason} Manuel köşe seçimi açıldı — dört köşeyi ayarlayıp tekrar deneyin.`);
          return;
        }
        const candidate = acceptPage(current.current, result, definition, { sourceName, previewUrl: '' });
        if (!candidate.ok) {
          rejected++;
          notify(`${sourceName}: ${candidate.message}`);
          return;
        }
        if (!result.ok) return;
        previewUrl = await normalizedThumbnail(result.normalized, signal);
        checkAborted(signal);
        if (originalImage) {
          try {
            originalImageUrl = await pixelImageToBlobUrl(originalImage, signal);
          } catch (error) {
            checkAborted(signal);
            originalImageUrl = undefined;
            notify(`${sourceName}: orijinal kamera önizlemesi oluşturulamadı; tarama sonucu yine de kullanılabilir.`);
            void error;
          }
        }
        const decision = acceptPage(current.current, result, definition,
          { sourceName, previewUrl, ...(originalImageUrl ? { originalImageUrl } : {}) });
        if (!decision.ok) {
          rejected++;
          notify(`${sourceName}: ${decision.message}`);
          return;
        }
        commit(decision.state);
        previewUrl = undefined;
        if (originalImageUrl) originalImageUrl = undefined;
        accepted++;
        setSelectedNumber(result.pageNumber);
        // Quality verdict drives the recovery message: the user sees a concrete next step.
        const verdict = verdictFromQuality(result.quality);
        if (verdict.fatal) {
          // The pipeline returned ok=true but `quality.fatal` means no items were produced —
          // tell the user the page was read structurally but rejected on quality. Avoid the
          // contradiction with the success message below by surfacing only the verdict.
          setRetryHint({ message: `${sourceName}: ${verdict.headline}`, tips: verdict.tips });
          notify(`${sourceName}: ${result.pageNumber}. sayfa — ${verdict.headline} Yeniden çekmek için aşağıdaki düğmeyi kullanın.`);
          setStatus(`${sourceName}: ${result.pageNumber}. sayfa okundu ancak kalite yetersiz; yeniden çekin.`);
        } else if (!verdict.ok) {
          notify(`${sourceName}: ${result.pageNumber}. sayfa kabul edildi; ${verdict.headline}`);
          setStatus(result.warnings.length
            ? `${sourceName}: ${result.pageNumber}. sayfa kabul edildi; otomatik güvenilir cevap yok. ${result.warnings[0]}`
            : `${sourceName}: ${result.pageNumber}. sayfa başarıyla okundu ve kabul edildi.`);
        } else {
          setStatus(result.warnings.length
            ? `${sourceName}: ${result.pageNumber}. sayfa kabul edildi; otomatik güvenilir cevap yok. ${result.warnings[0]}`
            : `${sourceName}: ${result.pageNumber}. sayfa başarıyla okundu ve kabul edildi.`);
        }
      } catch (error) {
        checkAborted(signal);
        rejected++;
        notify(`${sourceName}: Okuma tamamlanamadı. ${error instanceof Error ? error.message : 'Lütfen görseli tekrar deneyin.'}`);
      } finally {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
        if (manualPreviewUrl && !manualPreviewTransferred) URL.revokeObjectURL(manualPreviewUrl);
      }
      await yieldToScreen(signal);
    };
    try {
      if (capture) await process(capture);
      for (const file of files) {
        checkAborted(signal);
        if (manualPending) break;
        if (processed >= SCAN_LIMITS.batchPages) {
          notify('Bir işlemde 24 sayfa sınırına ulaşıldı. Kalan dosyalar işlenmedi.');
          return;
        }
        setStatus(`${file.name}: dosya hazırlanıyor…`);
        try {
          const kind = await identifyFile(file);
          checkAborted(signal);
          if (kind === 'pdf') {
            for await (const page of readPdfPages(file, signal, SCAN_LIMITS.batchPages - processed)) {
              await process(page);
              if (manualPending) break;
            }
          } else {
            await process({ image: await readImageFile(file, signal), sourceName: file.name });
          }
        } catch (error) {
          checkAborted(signal);
          rejected++;
          notify(`${file.name}: ${error instanceof Error ? error.message : 'Dosya açılamadı.'}`);
        }
      }
    } catch (error) {
      if (!signal.aborted) notify(`İşlem duraklatıldı: ${error instanceof Error ? error.message : 'Beklenmeyen hata.'}`);
    } finally {
      if (job.current === controller) {
        job.current = null;
        if (alive.current) {
          setBusy(false);
          if (!signal.aborted) {
            setStatus(`Tarama tamamlandı: ${accepted} sayfa onaylandı${rejected > 0 ? `, ${rejected} sayfa reddedildi` : ''}.`);
          } else if (signal.reason !== 'reset') {
            setStatus('İşlem iptal edildi.');
          }
        }
      }
    }
  }

  function reset() {
    job.current?.abort('reset');
    releaseImages(current.current);
    const editor = manualCornersRef.current;
    if (editor?.previewUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(editor.previewUrl); } catch { /* ignore */ }
    }
    setManualCorners(null);
    setRetryHint(null);
    commit(createScanSet());
    setSelectedNumber(null);
    setAlerts([]);
    setCameraKey(previous => previous + 1);
    setConfirmReset(false);
    setStatus('Tarama oturumu sıfırlandı. Yeni form setinin ilk sayfasını yükleyebilirsiniz.');
  }

  function moveSourceTab(event: React.KeyboardEvent<HTMLButtonElement>, current: 'files' | 'camera') {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const order: ('files' | 'camera')[] = ['files', 'camera'];
    const index = order.indexOf(current);
    const next: 'files' | 'camera' = event.key === 'Home' ? order[0]!
      : event.key === 'End' ? order[order.length - 1]!
        : order[(index + (event.key === 'ArrowRight' ? 1 : -1) + order.length) % order.length]!;
    setSource(next);
    sourceTabs.current[next]?.focus();
  }

  return (
    <div className={`scanner-layout-container${embedded ? ' is-embedded' : ''}`} aria-labelledby={`${id}-title`} data-clinical-transfer-allowed="false">
      <div className="scanner-hero-header">
        <div>
          {embedded ? null : <span className="section-badge badge-primary">OMR</span>}
          <h2 id={`${id}-title`}>{embedded ? 'OMR / Kamera' : 'Optik form tarama'}</h2>
          {embedded ? null : (
            <p className="scanner-hero-sub">Kamera veya dosya ile 4 sayfayı okutun.</p>
          )}
        </div>
        <div className="hero-actions">
          {pages.length > 0 && (
            <button type="button" className="btn-secondary btn-danger-soft" onClick={() => setConfirmReset(true)}>
              <Icon name="refresh" size={15} />
              <span>Yeni Set / Sıfırla</span>
            </button>
          )}
        </div>
      </div>

      {confirmReset && (
        <div className="reset-confirm-box" role="dialog" aria-label="Sıfırlama Onayı">
          <Icon name="alert" size={20} className="text-danger" />
          <div className="confirm-text">
            <strong>Mevcut tarama oturumu sıfırlansın mı?</strong>
            <p>Okunmuş tüm sayfalar ve manuel düzeltmeler temizlenecektir.</p>
          </div>
          <div className="confirm-btn-group">
            <button type="button" className="btn-danger btn-sm" onClick={reset}>
              Evet, Sıfırla
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirmReset(false)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* Tarama Paneli: Yükleme & Kamera */}
      <div className="scanner-input-card card-elevated">
        <div className="scan-mode-tabs" role="tablist" aria-label="Tarama kaynağı">
          <button
            ref={element => { sourceTabs.current.files = element; }}
            id={`${id}-files-tab`}
            type="button"
            role="tab"
            aria-selected={source === 'files'}
            aria-controls={`${id}-scan-panel`}
            tabIndex={source === 'files' ? 0 : -1}
            className={`mode-tab ${source === 'files' ? 'active' : ''}`}
            onClick={() => setSource('files')}
            onKeyDown={event => moveSourceTab(event, 'files')}
          >
            <Icon name="file" size={16} />
            <span>Dosya Yükle (PDF / görüntü)</span>
          </button>
          <button
            ref={element => { sourceTabs.current.camera = element; }}
            id={`${id}-camera-tab`}
            type="button"
            role="tab"
            aria-selected={source === 'camera'}
            aria-controls={`${id}-scan-panel`}
            tabIndex={source === 'camera' ? 0 : -1}
            className={`mode-tab ${source === 'camera' ? 'active' : ''}`}
            onClick={() => setSource('camera')}
            onKeyDown={event => moveSourceTab(event, 'camera')}
          >
            <Icon name="camera" size={16} />
            <span>Kamera ile Canlı Çekim</span>
          </button>
        </div>

        <div
          id={`${id}-scan-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-${source}-tab`}
          tabIndex={0}
        >
        {source === 'files' ? (
          <div className="dropzone-area">
            <label htmlFor={`${id}-files`} className="dropzone-label">
              <div className="dropzone-icon">
                <Icon name="download" size={28} />
              </div>
              <strong className="dropzone-title">Taranmış Formları Buraya Yükleyin</strong>
              <span className="dropzone-desc">JPG, PNG, WEBP, AVIF, HEIC veya PDF formatında tekil veya çoklu dosya seçebilirsiniz.</span>
              <span className="btn-primary dropzone-btn">Dosya Seç</span>
            </label>
            <input
              id={`${id}-files`}
              type="file"
              accept="image/*,application/pdf,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif,.pdf"
              multiple
              disabled={busy || !!manualCorners}
              className="file-input-hidden"
              onChange={event => {
                const files = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = '';
                void run(files);
              }}
            />
            <p className="dropzone-hint">
              En iyi sonuç için düz taranmış, dört köşe karesi ve QR kodu net görünen A4 sayfalarını kullanın.
            </p>
          </div>
        ) : (
          <CameraCapture key={cameraKey} disabled={busy || !!manualCorners}
            onCapture={(image, sourceName, originalImage) => run([], { image, sourceName, originalImage })} />
        )}
        </div>

        {/* Canlı Durum ve İptal */}
        <div className="scanner-status-strip">
          <div className="status-live-indicator">
            {busy ? <div className="spinner-sm" /> : <div className="live-dot" />}
            <span role="status" aria-live="polite" className="status-live-text" title={status}>
              {status}
            </span>
          </div>
          {busy && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                job.current?.abort('cancel');
                setStatus('İşlem durduruluyor...');
              }}
            >
              Okumayı Durdur
            </button>
          )}
        </div>
      </div>

      {/* Uyarılar */}
      {alerts.length > 0 && (
        <div className="scanner-alerts-list">
          {alerts.map(alert => (
            <div className="status-banner warning-banner" key={alert.id} role="alert">
              <Icon name="alert" size={18} />
              <span style={{ flex: 1 }}>{alert.message}</span>
              <button
                type="button"
                className="close-banner-btn"
                onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Yeniden Çek Önerisi: kalite fatal veya hizalama başarısız olduğunda kullanıcıya
          net bir eylem sunar. Kamera sekmesini açar ve eski hata state'ini temizler. */}
      {retryHint && !manualCorners && (
        <div className="status-banner warning-banner" role="alert">
          <Icon name="alert" size={18} />
          <div style={{ flex: 1 }}>
            <strong>{retryHint.message}</strong>
            {retryHint.tips.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                {retryHint.tips.map(tip => <li key={tip}>{tip}</li>)}
              </ul>
            )}
          </div>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => {
              setRetryHint(null);
              setSource('camera');
              setCameraKey(previous => previous + 1);
            }}
          >
            <Icon name="camera" size={14} />
            <span>Yeniden Çek</span>
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setRetryHint(null)}
            aria-label="Öneriyi kapat"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* Manuel Köşe Editörü: otomatik hizalama başarısız olduğunda kullanıcıya fallback sunar */}
      {manualCorners && (
        <ManualCornerEditor
          imageWidth={manualCorners.image.width}
          imageHeight={manualCorners.image.height}
          imageUrl={manualCorners.previewUrl}
          corners={manualCorners.corners}
          pageWidthMm={definition.pageWidthMm}
          pageHeightMm={definition.pageHeightMm}
          disabled={busy}
          onChange={corners => setManualCorners({ ...manualCorners, corners })}
          onCancel={() => {
            if (manualCorners.previewUrl.startsWith('blob:')) {
              try { URL.revokeObjectURL(manualCorners.previewUrl); } catch { /* ignore */ }
            }
            setManualCorners(null);
            notify('Manuel köşe seçimi iptal edildi.');
          }}
          onConfirm={warped => {
            const sourceName = manualCorners.sourceName;
            if (manualCorners.previewUrl.startsWith('blob:')) {
              try { URL.revokeObjectURL(manualCorners.previewUrl); } catch { /* ignore */ }
            }
            setManualCorners(null);
            notify('Manuel köşeler uygulandı; sayfa OMR hattına gönderiliyor…');
            // Feed the already-warped grayscale page back into the existing pipeline as a
            // RGBA PixelImage. `analyzePage` calls `toGrayscale` itself, so this is loss-free:
            // the warped image is the same physical page the auto pipeline would have produced,
            // only the homography came from the user instead of the alignment detector.
            const rgba = grayToRgba(warped);
            void run([], { image: rgba, sourceName });
          }}
          onAuto={() => {
            if (manualCorners.previewUrl.startsWith('blob:')) {
              try { URL.revokeObjectURL(manualCorners.previewUrl); } catch { /* ignore */ }
            }
            setManualCorners(null);
            notify('Otomatik algılama yeniden denenecek; sayfayı daha düz ve dik açıdan çekin.');
          }}
        />
      )}

      {/* İlerleme ve Sayfa Durumu */}
      <div className="scanner-progress-card card-elevated">
        <div className="progress-top-row">
          <div>
            <h3 className="section-heading-sm">Set Tamamlanma Durumu</h3>
            <p className="section-subtext">
              {pages.length === 4 ? (
                <span className="text-success font-semibold">Tüm 4 sayfa başarıyla okundu. Danışan bilgilerini kaydedebilirsiniz.</span>
              ) : (
                <span>Eksik sayfalar: {missingPages.length ? missingPages.map(p => `${p}. sayfa`).join(', ') : 'Yok'}.</span>
              )}
            </p>
          </div>
          <div className="batch-badge">
            <span className="batch-label">Set Kodu</span>
            <code className="batch-code">{scan.batchId ?? '—'}</code>
          </div>
        </div>

        {/* 4 Sayfa Önizleme Kartları */}
        <div className="scan-pages-grid">
          {[...definition.pages]
            .sort((a, b) => a.pageNumber - b.pageNumber)
            .map(expected => {
              const page = scan.pages[expected.pageNumber];
              const isSelected = selected?.pageNumber === expected.pageNumber;

              return (
                <button
                  type="button"
                  key={expected.pageNumber}
                  disabled={!page}
                  className={`page-card-box ${page ? 'is-ready' : 'is-missing'} ${isSelected ? 'is-active' : ''}`}
                  onClick={() => setSelectedNumber(expected.pageNumber)}
                >
                  <div className="page-card-thumb">
                    {page ? (
                      page.previewUrl ? (
                        <img src={page.previewUrl} alt={`${expected.pageNumber}. sayfa önizleme`} />
                      ) : (
                        <div className="missing-page-placeholder is-restored" role="img" aria-label={`${expected.pageNumber}. sayfa verisi korundu, önizleme görseli yok`}>
                          <Icon name="checkCircle" size={24} />
                          <span>Veri korundu</span>
                          <small>Önizleme için yeniden okutun</small>
                        </div>
                      )
                    ) : (
                      <div className="missing-page-placeholder">
                        <Icon name="file" size={24} />
                        <span>Eksik</span>
                      </div>
                    )}
                  </div>
                  <div className="page-card-meta">
                    <strong>{expected.pageNumber}. Sayfa</strong>
                    <small>
                      {page
                        ? Object.keys(page.reviews).length
                          ? `${Object.keys(page.reviews).length} manuel düzeltme`
                          : page.quality.ok ? 'Sorunsuz okundu' : 'İnceleme gerekli'
                        : 'Görsel bekleniyor'}
                    </small>
                  </div>
                  {page && <div className="card-check-pill"><Icon name="check" size={12} /></div>}
                </button>
              );
            })}
        </div>
      </div>

      {/* İstatistikler */}
      {pages.length > 0 && (
        <div className="scanner-metrics-strip">
          <div className="stat-item">
            <span className="stat-label">Okunan Madde</span>
            <strong className="stat-val">{summary.readItems} / {summary.expectedItems}</strong>
          </div>
          <div className="stat-item">
            <span className="stat-label">Güvenilir Cevap</span>
            <strong className="stat-val text-success">{summary.reliableAnswers}</strong>
          </div>
          <div className="stat-item">
            <span className="stat-label">İnceleme Bekleyen</span>
            <strong className="stat-val text-warning">{summary.ambiguous + summary.multiple}</strong>
          </div>
          <div className="stat-item">
            <span className="stat-label">
              Boş Bırakılan{summary.blank > MMPI_MAX_BLANK ? ` · ${MMPI_MAX_BLANK} sınırı aşıldı` : ''}
            </span>
            <strong className={`stat-val ${summary.blank > MMPI_MAX_BLANK ? 'text-danger' : ''}`}>
              {summary.blank}
            </strong>
          </div>
          <div className="stat-item">
            <span className="stat-label">Manuel Düzeltilen</span>
            <strong className="stat-val text-primary">{summary.manuallyReviewed}</strong>
          </div>
        </div>
      )}

      {/* İnceleme bekleyen cevap kuyruğu: kullanıcı tek tek uğraşmak istemezse tek
          adımda güvenli varsayılanlarla çözülür (bkz. pageSequence.autoResolveUnresolvedItems).
          Sorunlu maddeler artık kaydı fiilen kilitleyen bir ölü uç değildir. */}
      {pages.length > 0 && (() => {
        const unresolved = listUnresolvedItems(scan, definition);
        if (unresolved.length === 0) return null;
        return (
          <div className="status-banner warning-banner auto-resolve-banner" role="region" aria-label="İnceleme bekleyen cevaplar">
            <Icon name="alert" size={18} />
            <div className="auto-resolve-body">
              <strong>{unresolved.length} cevap inceleme bekliyor.</strong>
              <span>
                {' '}Herbirini tek tek inceleyebilir ya da otomatik çözebilirsiniz: tek işaret görülen maddeler
                algılanan cevabını, çoklu/belirsiz/okunamayanlar <strong>Boş (?)</strong> olarak işaretleme
                alınır; her çözüm denetim izine yazılır.
              </span>
            </div>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => setConfirmAutoResolve(true)}
            >
              <Icon name="checkCircle" size={14} />
              <span>Otomatik Çöz</span>
            </button>
          </div>
        );
      })()}

      {confirmAutoResolve && (
        <ConfirmDialog
          title="İnceleme bekleyen cevaplar otomatik çözülsün mü?"
          description="Tek işaret görülen maddeler OMR'ın algıladığı cevabını; çoklu işaretli, belirsiz, okunamayan ve geçersiz maddeler Boş (?) olarak işaretlenir. İşlem geri alınamaz ama denetim izinde kalır ve her madde daha sonra elden yeniden incelenebilir."
          confirmLabel="Evet, otomatik çöz"
          tone="neutral"
          onConfirm={() => {
            const report = autoResolveUnresolvedItems(current.current, definition);
            setConfirmAutoResolve(false);
            if (report.resolved === 0) return;
            commit(report.state);
            setStatus(
              `${report.resolved} cevap otomatik çözüldü: ${report.asDetectedAnswer} algılanan işaret olarak, ` +
              `${report.asBlank} Boş (?) olarak. Kayıt için artık inceleme kuyruğu yok.`,
            );
            notify(`Otomatik çözüm tamamlandı (${report.resolved} madde). Kontrol adımına dönebilirsiniz.`);
          }}
          onCancel={() => setConfirmAutoResolve(false)}
        />
      )}

      {/* Sayfa İnceleme ve Düzeltme Alanı */}
      {selected ? (
        <ScanResultPreview
          key={selected.pageNumber}
          page={selected}
          definition={definition}
          onReview={(itemId, review) => {
            try {
              commit(setManualReview(current.current, definition, selected.pageNumber, itemId, review));
            } catch (error) {
              notify(error instanceof Error ? error.message : 'İnceleme kaydedilemedi.');
            }
          }}
          onRemove={() => {
            const page = current.current.pages[selected.pageNumber];
            for (const url of [page?.previewUrl, page?.originalImageUrl]) {
              if (!url?.startsWith('blob:')) continue;
              try {
                URL.revokeObjectURL(url);
              } catch {
                /* yoksay */
              }
            }
            commit(removePage(current.current, selected.pageNumber));
            setStatus(`${selected.pageNumber}. sayfa kaldırıldı. Yeniden tarayabilirsiniz.`);
          }}
        />
      ) : null}

      {/* Danışan bilgisi ve arşiv, gömülü modda İşlem akışının kendi adımlarında
          (Danışan formu + Kontrol/Kayıt + Kayıtlar sekmesi) yaşar; burada ikinci
          bir danışan formu ve ikinci kayıt yolu açılmaz. */}
      {!embedded && (
        <RecordCapture
          key={`${scan.batchId ?? 'empty'}:${Object.keys(scan.pages).sort((a, b) => Number(a) - Number(b)).join('-')}`}
          definition={definition}
          scan={scan}
          actor={actor}
          onSaved={() => setRecordsRefresh(prev => prev + 1)}
        />
      )}

      {/* Psikolog Arşivi */}
      {!embedded && actor.role === 'PSYCHOLOG' && <MyRecordsPanel key={recordsRefresh} />}
    </div>
  );
}

/** Wrap a grayscale `GrayImage` into the RGBA `PixelImage` shape that `analyzePage` accepts. */
function grayToRgba(image: { width: number; height: number; data: Uint8Array }): PixelImage {
  const data = new Uint8ClampedArray(image.width * image.height * 4);
  for (let i = 0; i < image.data.length; i++) {
    const value = image.data[i]!;
    data[i * 4] = value; data[i * 4 + 1] = value; data[i * 4 + 2] = value; data[i * 4 + 3] = 255;
  }
  return { width: image.width, height: image.height, data };
}
