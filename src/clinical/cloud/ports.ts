/**
 * Data-access ports.
 *
 * The repository only ever talks to these two interfaces. Production binds them
 * to Supabase (`supabasePort.ts`); tests bind them to a real PostgreSQL
 * instance running the real migrations (`tests/helpers/pglitePort.ts`), so RLS
 * is exercised for real rather than mocked.
 */

import type { CloudTable } from './types';

export type Row = Record<string, unknown>;

export type Filter =
  | { column: string; op: 'eq'; value: string | number | boolean | null }
  | { column: string; op: 'in'; value: string[] };

export interface DbPort {
  /** `select * from <table> where <filters>` — RLS applies. */
  list<T>(table: CloudTable, filters?: Filter[]): Promise<T[]>;
  /** `insert … on conflict (id) do update` — returns the stored row. */
  upsert<T>(table: CloudTable, row: Row): Promise<T>;
  /** `delete from <table> where id = …` — RLS applies. */
  remove(table: CloudTable, id: string): Promise<void>;
  /** `select <fn>(…)` — security definer RPC. */
  rpc<T>(fn: string, args?: Row): Promise<T>;
}

export interface StoragePort {
  upload(path: string, bytes: Uint8Array, mimeType: string): Promise<void>;
  signedUrl(path: string, expiresInSeconds: number): Promise<string>;
  remove(path: string): Promise<void>;
}

export const DOCUMENT_BUCKET = 'client-documents';

/** Decode a `data:` URL into raw bytes for upload. Returns null for unsafe input. */
export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mimeType: string } | null {
  const match = /^data:([a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+)(;[a-z0-9-]+=[^;,]+)?(;base64)?,/i.exec(dataUrl);
  if (!match) return null;
  const mimeType = match[1]!;
  const payload = dataUrl.slice(match[0].length);
  if (!match[3]) {
    // Plain-text data URL.
    const bytes = new TextEncoder().encode(decodeURIComponent(payload));
    return { bytes, mimeType };
  }
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { bytes, mimeType };
}
