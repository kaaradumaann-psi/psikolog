import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Liberation Sans is metric-compatible with the Arial/Helvetica the printed sheet
 * asks for, and pdfjs-dist already ships it, so no extra download or system font
 * is needed. The path is resolved through the package itself rather than assumed.
 */
async function fontDirectory(): Promise<string> {
  const require = createRequire(import.meta.url);
  try {
    return join(dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts');
  } catch {
    return join(dirname(require.resolve('pdfjs-dist')), '..', 'standard_fonts');
  }
}

export async function readPrintFonts(): Promise<{ regular: Uint8Array; bold: Uint8Array }> {
  const directory = await fontDirectory();
  try {
    return {
      regular: new Uint8Array(await readFile(join(directory, 'LiberationSans-Regular.ttf'))),
      bold: new Uint8Array(await readFile(join(directory, 'LiberationSans-Bold.ttf'))),
    };
  } catch (error) {
    throw new Error('Liberation Sans yazı tipi bulunamadı (pdfjs-dist/standard_fonts). ' +
      'npm ci çalıştırın veya yazı tipini elle sağlayın: ' + String(error));
  }
}
