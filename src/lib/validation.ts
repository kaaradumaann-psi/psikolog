// Validation helpers — MMPI pattern: length + control char + regex

const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f]/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FILE_NUMBER_RE = /^[A-Z0-9-]{3,32}$/;

export function hasControlChar(value: string): boolean {
  return CONTROL_CHAR_RE.test(value);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim()) && value.length <= 254;
}

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isValidFileNumber(value: string): boolean {
  return FILE_NUMBER_RE.test(value);
}

export function sanitizeText(value: unknown, min: number, max: number): string {
  if (typeof value !== 'string') throw new Error('Geçersiz metin');
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length < min || normalized.length > max || hasControlChar(normalized)) {
    throw new Error('Geçersiz metin');
  }
  return normalized;
}

export function sanitizeIlike(value: string): string {
  return value.replace(/[%_,]/g, '').trim().slice(0, 80);
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function isNetworkError(error: unknown): boolean {
  const msg = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('timeout')
  );
}
