import QRCode from 'qrcode';
import type { FormDefinition, PageIdentity, Point } from '../omr/omrTypes';

export function createBatchId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function encodePageIdentity(definition: FormDefinition, batchId: string, pageNumber: number): string {
  if (!/^[A-F0-9]{24}$/.test(batchId) || !definition.pages.some(page => page.pageNumber === pageNumber)) {
    throw new Error('Form seti veya sayfa numarası geçersiz.');
  }
  return ['M566', definition.version, definition.fingerprint, batchId, pageNumber, definition.totalPages].join(':');
}

export function parsePageIdentity(text: string, definition: FormDefinition): PageIdentity {
  const parts = text.split(':');
  if (parts.length !== 6 || parts[0] !== 'M566' || parts[1] !== definition.version ||
    parts[2] !== definition.fingerprint || !/^[A-F0-9]{24}$/.test(parts[3] ?? '') ||
    !/^[1-9]\d*$/.test(parts[4] ?? '') || !/^[1-9]\d*$/.test(parts[5] ?? '')) {
    throw new Error('QR kimliği, form sürümü veya yerleşim özeti eşleşmiyor.');
  }
  const pageNumber = Number(parts[4]);
  if (Number(parts[5]) !== definition.totalPages || !definition.pages.some(page => page.pageNumber === pageNumber)) {
    throw new Error('Sayfa numarası veya toplam sayfa sayısı geçersiz.');
  }
  return { version: parts[1]!, fingerprint: parts[2]!, batchId: parts[3]!, pageNumber, totalPages: definition.totalPages };
}

export function createPageQr(definition: FormDefinition, batchId: string, pageNumber: number) {
  const text = encodePageIdentity(definition, batchId, pageNumber);
  const code = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const quiet = 4;
  const { size, data } = code.modules;
  const area = definition.pages.find(page => page.pageNumber === pageNumber)!.qrArea;
  const moduleMm = area.width / (size + quiet * 2);
  // jsQR returns the corners of the symbol, excluding its quiet zone.
  const x = area.x + quiet * moduleMm;
  const y = area.y + quiet * moduleMm;
  const side = size * moduleMm;
  const innerCorners: Point[] = [{ x, y }, { x: x + side, y }, { x: x + side, y: y + side }, { x, y: y + side }];
  return { text, size, data, quiet, moduleMm, innerCorners, area };
}
