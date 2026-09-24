import { formDefinition } from '../omr/formDefinition';

/**
 * The form set code stamped on every printed sheet of this template.
 *
 * One value is used by every path that produces paper: the committed PDF (each page's QR code and
 * the footer line), the in-app print button, the download, and the HTML preview. The previous code
 * gave the HTML preview a fresh code per browser session, so pages printed on different days — or
 * through different buttons — refused each other in the scanner with "this page belongs to another
 * form set". A new participant is started with "Yeni Set / Sıfırla", not by re-printing the form.
 *
 * It lives in its own module so a Node test can import it without pulling in the embedded PDF asset.
 */
export const FORM_SET_CODE: string = formDefinition.fingerprint.slice(0, 24);

/** File name offered by the download button and read back by the PDF tests. */
export const FORM_PDF_FILE_NAME = 'MMPI-566-optik-cevap-formu.pdf';
