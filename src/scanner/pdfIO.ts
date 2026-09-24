import type { PixelImage } from '../omr/omrTypes';
import type { RenderTask } from 'pdfjs-dist';
import { checkAborted, checkFileSize, SCAN_LIMITS, yieldToScreen } from './imageIO';

export type SourcePage = { image: PixelImage; sourceName: string; originalImage?: PixelImage };

const PDFJS_VERSION = '6.3.289';
const PDF_OPERATION_MS = 30_000;
const PDF_DESTROY_MS = 250;
const PDF_BUDGET_ERROR = 'Bir işlemde 24 sayfa sınırına ulaşıldı. Kalan PDF sayfaları işlenmedi; kalanları ayrı seçin.';

/**
 * Hardens the bundled pdf.js worker: whitelist stream filters, cap decoded buffers,
 * and refuse JPEG2000/JBIG2/encryption. Embedded JPEG/Flate/CCITT images (phone and
 * scanner PDFs) are accepted within SCAN_LIMITS; vector form PDFs keep working.
 */
export function createSafePdfWorkerSource(source: string, version: string): string {
  if (version !== PDFJS_VERSION) throw new Error('PDF güvenlik denetimi bu okuyucu sürümünü desteklemiyor. JPG/PNG seçin.');
  return `${source}\n;(() => {
    const fail = message => {
      self.postMessage({ scannerPdfError: message });
      throw new Error(message);
    };
    const allowed = ['Fl', 'FlateDecode', 'DCT', 'DCTDecode', 'CCF', 'CCITTFaxDecode',
      'RL', 'RunLengthDecode', 'AHx', 'ASCIIHexDecode', 'A85', 'ASCII85Decode'];
    const blocked = ['JPXDecode', 'JPX', 'JBIG2Decode', 'JBIG2', 'Crypt'];
    const makeFilter = Parser.prototype.makeFilter;
    Parser.prototype.makeFilter = function(stream, name, length, params, ...args) {
      if (blocked.includes(name)) {
        fail('PDF görüntü kodlaması (' + name + ') bu tarayıcıda desteklenmiyor. Sayfayı JPG veya PNG olarak kaydedip yükleyin.');
      }
      if (name && !allowed.includes(name)) {
        fail('PDF sıkıştırma biçimi (' + name + ') güvenli biçimde desteklenmiyor. Sayfayı JPG veya PNG olarak kaydedip yükleyin.');
      }
      return makeFilter.call(this, stream, name, length, params, ...args);
    };
    const ensureBuffer = DecodeStream.prototype.ensureBuffer;
    let allocated = 0;
    DecodeStream.prototype.ensureBuffer = function(requested) {
      if (!Number.isSafeInteger(requested) || requested < 0 || requested > 16 * 1024 * 1024 ||
          this.minBufferLength > 16 * 1024 * 1024) fail('PDF açılmış içerik sınırını aşıyor. JPG/PNG seçin.');
      let size = this.minBufferLength;
      while (size < requested) size *= 2;
      const growth = Math.max(0, size - this.buffer.byteLength);
      if (allocated + growth > ${SCAN_LIMITS.batchBytes}) fail('PDF açılmış içerik sınırını aşıyor. JPG/PNG seçin.');
      allocated += growth;
      return ensureBuffer.call(this, requested);
    };
    self.addEventListener('unhandledrejection', () => fail('PDF çalışanı işlemi tamamlayamadı. JPG/PNG seçin.'));
  })();\n`;
}

/**
 * pdfjs-dist 6.3.289 emits `constructor({ name, port, verbosity }?: { name?: null; port?: null; ... })`
 * in api.d.ts, while the same package documents `PDFWorkerParameters.port?: Worker` and its shipped
 * runtime reads `params?.port`. The documented shape is asserted at this one call site so a real
 * Worker port stays type-checked everywhere else.
 */
type PdfWorkerConstructor = new (params: {
  name?: string; port?: Worker; verbosity?: number;
}) => import('pdfjs-dist').PDFWorker;

/** A dedicated, bundled worker per document: no CDN, upload or remote PDF fetch. */
export async function* readPdfPages(file: File, signal: AbortSignal, remainingPages: number): AsyncGenerator<SourcePage> {
  checkFileSize(file);
  checkAborted(signal);
  if (!Number.isInteger(remainingPages) || remainingPages < 1 || remainingPages > SCAN_LIMITS.batchPages) {
    throw new Error(PDF_BUDGET_ERROR);
  }
  let workerUrl: string | undefined;
  let port: Worker | undefined;
  let worker: import('pdfjs-dist').PDFWorker | undefined;
  let loading: import('pdfjs-dist').PDFDocumentLoadingTask | undefined;
  let render: RenderTask | undefined;
  let failure: Error | undefined;
  let rejectFailure: (error: Error) => void = () => {};
  const failed = new Promise<never>((_, reject) => { rejectFailure = reject; });
  void failed.catch(() => {});
  let terminated = false;
  const hardStop = () => {
    try { if (!terminated && port) { terminated = true; port.terminate(); } }
    finally { if (workerUrl) { URL.revokeObjectURL(workerUrl); workerUrl = undefined; } }
  };
  const fail = (error: Error) => {
    if (failure) return;
    failure = error;
    rejectFailure(error);
    try { render?.cancel(); } catch { /* Hard termination still runs if cancellation fails. */ }
    hardStop();
  };
  const abort = () => fail(new DOMException('İşlem iptal edildi.', 'AbortError'));
  const workerError = () => fail(new Error('PDF çalışanı başlatılamadı veya beklenmedik biçimde durdu. JPG/PNG seçin.'));
  const workerMessage = (event: MessageEvent) => {
    if (typeof event.data?.scannerPdfError === 'string') fail(new Error(event.data.scannerPdfError));
  };
  const check = () => {
    checkAborted(signal);
    if (failure) throw failure;
  };
  const wait = async <T,>(operation: () => T | PromiseLike<T>): Promise<T> => {
    check();
    const timer = setTimeout(() => fail(new Error('PDF işlemi 30 saniyede tamamlanamadı. Dosyayı bölün veya JPG/PNG seçin.')), PDF_OPERATION_MS);
    try {
      return await Promise.race([Promise.resolve().then(() => { check(); return operation(); }), failed]);
    } finally { clearTimeout(timer); }
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const [pdfjs, { default: workerCode }] = await wait(() => Promise.all([
      import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.mjs?raw'),
    ]));
    const data = new Uint8Array(await wait(() => file.arrayBuffer()));
    check();
    workerUrl = URL.createObjectURL(new Blob([createSafePdfWorkerSource(workerCode, pdfjs.version)], { type: 'text/javascript' }));
    port = new Worker(workerUrl, { type: 'module' });
    port.addEventListener('error', workerError);
    port.addEventListener('messageerror', workerError);
    port.addEventListener('message', workerMessage);
    worker = new (pdfjs.PDFWorker as unknown as PdfWorkerConstructor)({ port });
    loading = pdfjs.getDocument({ data, worker, useWasm: false,
      useWorkerFetch: false, useSystemFonts: true, disableAutoFetch: true, stopAtErrors: true,
      isOffscreenCanvasSupported: false, isImageDecoderSupported: false, maxImageSize: SCAN_LIMITS.sourcePixels });
    const document = await wait(() => loading!.promise);
    check();
    if (document.numPages > SCAN_LIMITS.pdfPages) {
      throw new Error(`PDF ${document.numPages} sayfa içeriyor. Dosya başına en çok ${SCAN_LIMITS.pdfPages} sayfa desteklenir; PDF'yi bölün.`);
    }
    for (let number = 1; number <= document.numPages; number++) {
      if (number > remainingPages) throw new Error(PDF_BUDGET_ERROR);
      await wait(() => yieldToScreen(signal));
      const page = await wait(() => document.getPage(number));
      let canvas: HTMLCanvasElement | undefined;
      try {
        await wait(() => page.getOperatorList());
        check();
        const base = page.getViewport({ scale: 1 });
        if (!Number.isFinite(base.width) || !Number.isFinite(base.height) || base.width <= 0 || base.height <= 0) {
          throw new Error('PDF sayfa boyutları geçersiz.');
        }
        const scale = Math.min(SCAN_LIMITS.pdfWidth / base.width, SCAN_LIMITS.longSide / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale });
        canvas = window.document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('PDF için görüntü alanı açılamadı.');
        render = page.render({ canvas, canvasContext: context, viewport, background: '#ffffff' });
        await wait(() => render!.promise);
        render = undefined;
        check();
        const image = { width: canvas.width, height: canvas.height,
          data: context.getImageData(0, 0, canvas.width, canvas.height).data };
        canvas.width = canvas.height = 0;
        yield { image, sourceName: `${file.name} · PDF ${number}/${document.numPages}` };
      } finally {
        try { render?.cancel(); } catch { /* Do not mask the upload error. */ }
        render = undefined;
        if (canvas) canvas.width = canvas.height = 0;
        try { page.cleanup(); } catch { /* Document teardown remains mandatory. */ }
      }
    }
  } catch (error) {
    checkAborted(signal);
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new Error('PDF şifreli. Şifresiz bir kopya veya sayfa görüntüleri seçin.');
    }
    throw new Error(`PDF açılamadı: ${error instanceof Error ? error.message : 'Dosya bozuk veya desteklenmiyor.'}`);
  } finally {
    try { render?.cancel(); } catch { /* A broken worker must not prevent teardown. */ }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.resolve().then(() => loading?.destroy()).catch(() => {}),
        new Promise<void>(resolve => { timer = setTimeout(resolve, PDF_DESTROY_MS); }),
      ]);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      port?.removeEventListener('error', workerError);
      port?.removeEventListener('messageerror', workerError);
      port?.removeEventListener('message', workerMessage);
      try { worker?.destroy(); } catch { /* The native worker is terminated below regardless. */ }
      finally { hardStop(); }
    }
  }
}
