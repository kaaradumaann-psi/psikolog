// Date guards — MMPI Istanbul timezone pattern

export function todayIsoDate(): string {
  // Turkey local calendar date, same as MMPI: Europe/Istanbul
  const now = new Date();
  const tr = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  const y = tr.getFullYear();
  const m = String(tr.getMonth() + 1).padStart(2, '0');
  const d = String(tr.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return false;
  const [y, m, day] = value.split('-').map(Number) as [number, number, number];
  return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
}

export function isFutureDateIstanbul(value: string): boolean {
  if (!isValidDateOnly(value)) return true;
  return value > todayIsoDate();
}

export function isValidBirthDate(value: string): boolean {
  if (!isValidDateOnly(value)) return false;
  const today = todayIsoDate();
  if (value > today) return false;
  // 0-120 yaş
  const birth = new Date(value + 'T00:00:00Z');
  const now = new Date(today + 'T00:00:00Z');
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
  return age >= 0 && age <= 120;
}

export function formatDateTR(value: string): string {
  if (!isValidDateOnly(value)) return value;
  const [y, m, d] = value.split('-') as [string, string, string];
  return `${d}.${m}.${y}`;
}
