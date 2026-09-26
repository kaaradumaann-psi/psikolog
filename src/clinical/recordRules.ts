/** Gerçek kayıt kuralları. Örnek kişi üretmez. */

export const MAX_BACKUP_BYTES = 8_000_000;
export const MAX_CLIENTS = 2_000;
export const MAX_SESSIONS = 20_000;
export const MAX_TEXT = 8_000;

const SAFE_DOCUMENT_URL = /^data:(application\/pdf|image\/jpeg|image\/png|image\/webp|text\/plain)(;charset=[^;,]+)?(;base64)?,/i;
const SAFE_IMAGE_URL = /^data:image\/(png|jpeg|webp);base64,/i;

export function clinicToday(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function ageFromBirthDate(birthDate: string, today = clinicToday()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate > today) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  if (!year || !month || !day || month > 12 || day > 31) return null;
  let age = (ty ?? 0) - year;
  if ((tm ?? 0) < month || ((tm ?? 0) === month && (td ?? 0) < day)) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

export function nextFileNumber(existing: string[], today = clinicToday()): string {
  const year = today.slice(0, 4);
  const pattern = new RegExp(`^HK-${year}-(\\d+)$`);
  let max = 0;
  for (const fileNumber of existing) {
    const match = pattern.exec(fileNumber);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `HK-${year}-${String(max + 1).padStart(3, '0')}`;
}

export function normalizeTc(value: string): string {
  return value.replace(/\s+/g, '');
}

export function isValidTc(value: string): boolean {
  return value === '' || /^\d{11}$/.test(value);
}

export function maskTc(value: string | undefined): string {
  const digits = normalizeTc(value || '');
  if (!digits) return '—';
  if (digits.length < 4) return '••••';
  return `${'•'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function isSafeDocumentUrl(value: string | undefined): boolean {
  return Boolean(value && value.length < 2_200_000 && SAFE_DOCUMENT_URL.test(value));
}

export function isSafeImageUrl(value: string | undefined): boolean {
  return Boolean(value && value.length < 1_500_000 && SAFE_IMAGE_URL.test(value));
}

export function clipText(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);
}

export function requireString(value: unknown, label: string, max = 180): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} eksik.`);
  }
  return clipText(value, max);
}

export function reportStorageError(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('psikolog:storage-error', {
    detail: 'Kayıt bu cihaza yazılamadı. Depo dolu olabilir. Önce yedek indirin, sonra yer açın.',
  }));
}

/**
 * Türkçe eşleme: `toLowerCase()` "İ" → "i̇" (birleşik nokta) üretir; aramaya
 * ASCII "i" yazan hekim kayıt bulamaz. Türkçe yerele göre küçültme "İ"→"i",
 * "I"→"ı" yapar; hem alan hem sorgu aynı yoldan geçirilmelidir.
 */
export function trLower(value: string): string {
  return value.toLocaleLowerCase('tr-TR');
}

/** Türkçe duyarlı `includes`: ikisi de normalize edilir. */
export function trIncludes(haystack: string | undefined, needle: string): boolean {
  if (!haystack) return false;
  return trLower(haystack).includes(trLower(needle));
}
