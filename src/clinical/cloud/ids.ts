/**
 * Identifier helpers.
 *
 * Local records were keyed by short string ids (`cli_…`, `sess_…`) while every
 * cloud table uses uuid primary keys. Records are upgraded in place once, and
 * every reference to them is rewritten in the same pass, so nothing is orphaned.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function newUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for runtimes without randomUUID; still a v4-shaped id.
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** FNV-1a, 32-bit. Used only to expand a namespace+key into 128 bits below. */
function fnv1a(input: string, seed: number): number {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Deterministic uuid for a (namespace, key) pair, so a child row that has no id
 * of its own can be re-pushed without creating duplicates. Version/variant
 * nibbles are fixed so the result is a well-formed uuid.
 */
export function deriveUuid(namespace: string, key: string): string {
  const words: number[] = [];
  for (let block = 0; block < 4; block += 1) {
    words.push(fnv1a(`${namespace}\u0000${key}\u0000${block}`, 0x811c9dc5 ^ block));
  }
  const hex = words.map((w) => w.toString(16).padStart(8, '0')).join('');
  const version = `4${hex.slice(13, 16)}`;
  const variantByte = (parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80;
  const variant = variantByte.toString(16).padStart(2, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${version}-${variant}${hex.slice(18, 20)}-${hex.slice(20)}`;
}

/** Build old-id → uuid map for every row whose id is not already a uuid. */
export function buildIdMap<T extends { id: string }>(rows: T[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (typeof row.id === 'string' && row.id && !isUuid(row.id)) {
      map.set(row.id, newUuid());
    }
  }
  return map;
}

/** Rewrite `id` and any listed reference fields through the map. */
export function applyIdMap<T extends { id: string }>(
  rows: T[],
  map: Map<string, string>,
  referenceFields: (keyof T & string)[],
): T[] {
  if (map.size === 0) return rows;
  const resolve = (value: unknown) => (typeof value === 'string' ? map.get(value) ?? value : value);
  return rows.map((row) => {
    const next: Record<string, unknown> = { ...row, id: resolve(row.id) };
    for (const field of referenceFields) next[field] = resolve(row[field]);
    return next as T;
  });
}
