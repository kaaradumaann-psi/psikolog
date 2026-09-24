/** Strict calendar/date-time guards for values crossing UI, storage, or review boundaries. */
export function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidReviewTimestamp(value: unknown): value is string {
  if (isValidDateOnly(value)) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return value <= today;
  }
  if (typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  const parsed = Date.parse(value);
  // Review/audit times are generated locally at action time; accepting a far-future value would
  // let a tampered draft rewrite chronology. Allow a small clock-skew window for browser/server drift.
  return isValidDateOnly(value.slice(0, 10)) && Number.isFinite(parsed) && parsed <= Date.now() + 60_000;
}
