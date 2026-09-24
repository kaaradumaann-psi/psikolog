import type { FormDefinition, ItemDefinition } from '../omr/omrTypes';
import type { ItemReadResult, PageReadSuccess } from './scanResultTypes';

export type ResultValidation = { ok: true; result: PageReadSuccess } | { ok: false; message: string };
const statuses = new Set(['unread', 'blank', 'single', 'multiple', 'ambiguous', 'reliable', 'invalid']);
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const unit = (value: unknown): value is number => finite(value) && value >= 0 && value <= 1;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string');

export function hasSuccessfulMeasurements(item: ItemReadResult | undefined, definition: ItemDefinition): boolean {
  return !!item && item.status !== 'unread' && item.status !== 'invalid' && definition.responseAreas.length > 0 &&
    item.measurements.length === definition.responseAreas.length && definition.responseAreas.every(area =>
      item.measurements.some(m => m.responseId === area.responseId && m.choiceId === area.choiceId &&
        unit(m.darkness) && unit(m.coverage)));
}

/** Treat the OMR boundary as untrusted; missing items remain missing, never fabricated blanks. */
export function validatePageResult(value: unknown, definition: FormDefinition): ResultValidation {
  const reject = (detail: string): ResultValidation => ({ ok: false, message: `Sayfa kabul edilmedi: ${detail}` });
  if (!record(value) || value.ok !== true) {
    return reject(record(value) && typeof value.message === 'string'
      ? value.message : 'Optik okuma geçerli bir sonuç üretmedi. Görüntüyü yeniden çekin.');
  }
  const page = definition.pages.find(p => p.pageNumber === value.pageNumber);
  if (!page || value.pageId !== page.pageId || value.fingerprint !== definition.fingerprint) {
    return reject('Sayfa kimliği veya form sürümü bu şablonla eşleşmiyor. Doğru formu kullanın.');
  }
  if (typeof value.batchId !== 'string' || !/^[A-F0-9]{24}$/.test(value.batchId)) {
    return reject('Form seti kimliği geçersiz. QR kodunu ve tüm köşe işaretlerini görüntüye alın.');
  }
  const quality = value.quality;
  if (!record(quality) || typeof quality.ok !== 'boolean' || quality.fatal === true || !unit(quality.score) || !strings(quality.reasons) ||
    !record(quality.metrics) || !['brightness', 'shadowSpread', 'laplacianVariance', 'borderContrast', 'pixelsPerMm']
      .every(key => finite(quality.metrics && (quality.metrics as Record<string, unknown>)[key]) &&
        ((quality.metrics as Record<string, number>)[key] ?? -1) >= 0)) {
    return reject('Görüntü kalite kontrolünü geçmedi veya kalite ölçümleri geçersiz. Daha net ve eşit aydınlatılmış çekim yapın.');
  }
  const image = value.normalized;
  if (!record(image) || !Number.isInteger(image.width) || !Number.isInteger(image.height) ||
    !finite(image.width) || !finite(image.height) || image.width < 1 || image.height < 1 ||
    image.width > 6000 || image.height > 6000 || image.width * image.height > 16_000_000 ||
    !(image.data instanceof Uint8Array) || image.data.length !== image.width * image.height) {
    return reject('Düzeltilmiş sayfa görüntüsü eksik veya geçersiz. Sayfayı yeniden tarayın.');
  }
  if (!Array.isArray(value.sourceCorners) || value.sourceCorners.length !== 4 ||
    !value.sourceCorners.every(p => record(p) && finite(p.x) && finite(p.y)) || !strings(value.warnings)) {
    return reject('Köşe konumları veya uyarı bilgileri geçersiz.');
  }
  if (!Array.isArray(value.items) || value.items.length > page.items.length) return reject('Madde listesi geçersiz.');
  const seen = new Set<string>();
  for (const item of value.items) {
    if (!record(item) || typeof item.itemId !== 'string') return reject('Madde kimliği eksik.');
    const expected = page.items.find(i => i.itemId === item.itemId);
    if (!expected || seen.has(item.itemId) || item.itemNumber !== expected.itemNumber ||
      typeof item.status !== 'string' || !statuses.has(item.status) || !unit(item.confidence) || typeof item.reason !== 'string' ||
      (item.choiceId !== null && !expected.responseAreas.some(a => a.choiceId === item.choiceId))) {
      return reject('Yinelenen, tanımsız veya geçersiz bir madde sonucu bulundu.');
    }
    seen.add(item.itemId);
    if (!Array.isArray(item.measurements) || item.measurements.length > expected.responseAreas.length) {
      return reject(`${expected.itemNumber}. maddenin ölçümleri geçersiz.`);
    }
    const responseIds = new Set<string>();
    for (const measurement of item.measurements) {
      if (!record(measurement) || typeof measurement.responseId !== 'string' || responseIds.has(measurement.responseId) ||
        !expected.responseAreas.some(a => a.responseId === measurement.responseId && a.choiceId === measurement.choiceId) ||
        !unit(measurement.darkness) || !unit(measurement.coverage)) {
        return reject(`${expected.itemNumber}. maddenin seçenek ölçümleri geçersiz.`);
      }
      responseIds.add(measurement.responseId);
    }
    if ((item.status === 'reliable' || item.status === 'single') && item.choiceId === null ||
      item.status === 'blank' && item.choiceId !== null ||
      !['unread', 'invalid'].includes(item.status) && responseIds.size !== expected.responseAreas.length) {
      return reject(`${expected.itemNumber}. maddenin durumu ve ölçümleri tutarsız.`);
    }
  }
  return { ok: true, result: value as PageReadSuccess };
}
