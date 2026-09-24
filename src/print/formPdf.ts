/**
 * The verified, generator-produced form, embedded so the self-contained build stays a single file.
 * Both bundlers resolve `?inline` to a base64 data URI: Vite natively, esbuild through the plugin
 * in scripts/build.mjs. It is offered as a direct download because the browser's own print dialog
 * can silently rescale, re-margin or clip the sheet, while this exact byte stream is checked by
 * tests/pdfForm.test.ts (geometry read back out of the file) and tests/pdfScanPipeline.test.ts
 * (rasterised and read by the real OMR pipeline).
 */
import { FORM_PDF_FILE_NAME } from '../form/formSet';
import dataUrl from '../../MMPI-566-optik-cevap-formu.pdf?inline';

export { FORM_PDF_FILE_NAME };



/**
 * How long the embedded PDF viewer is given to mount inside the hidden frame before printing.
 * Calling `print()` before the plugin has laid the document out prints a blank sheet — the
 * reported "first print is empty, the second one is correct" behaviour.
 */
export const PRINT_VIEWER_TIMEOUT_MS = 8_000;
export const PRINT_SETTLE_MS = 400;
/** Repeat of the sheet's own print guide, for the manual path when the dialog cannot be raised. */
export const PRINT_SETTINGS_HINT = 'A4, %100 (gerçek boyut), kenar boşluğu "yok", tek yüz, "sayfaya sığdır" kapalı';

export type PrintOutcome = 'printed' | 'viewer-timeout';

/**
 * The production build inlines the file as a data URI; the Vite dev server instead serves it as a
 * same-origin asset URL. Both have to work, because the dev server is what the preview shows.
 */
async function formPdfBytes(): Promise<Uint8Array<ArrayBuffer>> {
  if (dataUrl.startsWith('data:')) {
    const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  }
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error(`PDF alınamadı (HTTP ${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

function pdfBlob(bytes: Uint8Array): Blob {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new Blob([copy], { type: 'application/pdf' });
}

const delay = (milliseconds: number) => new Promise<void>(resolve => { window.setTimeout(resolve, milliseconds); });

/** Downloads through a Blob URL: a top-level navigation to a data URI is blocked by some browsers. */
export async function downloadFormPdf(): Promise<void> {
  const bytes = await formPdfBytes();
  const url = URL.createObjectURL(pdfBlob(bytes));
  const link = document.createElement('a');
  link.href = url;
  link.download = FORM_PDF_FILE_NAME;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Opens the same verified bytes in a new tab. This is the manual path when a browser refuses to
 * raise the print dialog from a script: the user prints from that tab with the settings in
 * `PRINT_ARGS`. Called from a click handler so the popup is not blocked.
 */
export async function openFormPdf(): Promise<void> {
  const bytes = await formPdfBytes();
  const url = URL.createObjectURL(pdfBlob(bytes));
  window.open(url, '_blank', 'noopener');
  // Long enough for the reader to print from the tab; revoked afterwards so nothing leaks.
  window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
}

/**
 * Mount state of the embedded PDF reader. Chrome inserts an `<embed type="application/pdf">`,
 * Firefox renders pdf.js into viewer markup; an empty same-origin document means the reader has
 * not mounted yet and printing now produces the blank first sheet. A cross-origin reader gives no
 * signal at all, so it is reported as `unreachable` and printed after a fixed settle delay.
 */
export function viewerState(frame: HTMLIFrameElement): 'mounted' | 'pending' | 'unreachable' {
  let doc: Document | null = null;
  try { doc = frame.contentDocument; } catch { return 'unreachable'; }
  if (!doc) return 'unreachable';
  try {
    if (doc.contentType === 'application/pdf') return 'mounted';
    if (doc.readyState === 'loading') return 'pending';
    return doc.querySelector('embed[type="application/pdf"], object[type="application/pdf"], #viewerContainer, .pdfViewer, pdf-viewer')
      ? 'mounted' : 'pending';
  } catch { return 'unreachable'; }
}

/**
 * Prints the verified 4-page A4 PDF, never the HTML portal.
 *
 * The frame is off-screen rather than zero-sized: a `width: 0` frame is not laid out, the reader
 * mounts late or not at all, and `print()` on it yields the blank first page. Printing only starts
 * once the reader reports a document, plus a short settle delay, so the first attempt is already
 * the correct one. Returns `viewer-timeout` when nothing could be confirmed, and the caller then
 * offers `openFormPdf()` instead of leaving the user with a dead button.
 */
export async function printFormPdf(): Promise<PrintOutcome> {
  const bytes = await formPdfBytes();
  const url = URL.createObjectURL(pdfBlob(bytes));
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.title = 'MMPI-566 yazdırma';
  Object.assign(frame.style, {
    position: 'fixed', left: '-10000px', top: '0', width: '794px', height: '1123px',
    border: '0', opacity: '0', pointerEvents: 'none',
  });
  const cleanup = () => {
    window.setTimeout(() => {
      frame.remove();
      URL.revokeObjectURL(url);
    }, 120_000);
  };
  let outcome: PrintOutcome = 'viewer-timeout';
  try {
    const loaded = new Promise<void>(resolve => {
      frame.addEventListener('load', () => resolve(), { once: true });
    });
    document.body.append(frame);
    frame.src = url;
    await Promise.race([loaded, delay(PRINT_VIEWER_TIMEOUT_MS)]);
    let state = viewerState(frame);
    const deadline = Date.now() + PRINT_VIEWER_TIMEOUT_MS;
    while (state === 'pending' && Date.now() < deadline) {
      await delay(100);
      state = viewerState(frame);
    }
    if (state === 'mounted') {
      await delay(PRINT_SETTLE_MS);
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      outcome = 'printed';
    } else if (state === 'unreachable') {
      // The reader is a black box here; a document load plus one settle delay is the best that
      // can be verified without reaching into another origin.
      await delay(PRINT_SETTLE_MS * 3);
      frame.contentWindow?.print();
      outcome = 'printed';
    }
  } catch {
    outcome = 'viewer-timeout';
  } finally {
    cleanup();
  }
  return outcome;
}
