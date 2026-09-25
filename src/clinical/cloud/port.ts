/**
 * PHASE-07 — Bulut veri katmanı: taşıma (port) arayüzü.
 *
 * UI → store → repository → port → Supabase. Component'ler doğrudan
 * `supabase.from(...)` çağırmaz; port değiştirilebilir (Supabase / test).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type CloudFilter = Record<string, string | number | boolean | null>;
export type CloudRow = Record<string, unknown>;
export type CloudPatch = Record<string, unknown>;

export type CloudPort = {
  select(table: string, filter?: CloudFilter): Promise<CloudRow[]>;
  insert(table: string, rows: CloudRow[]): Promise<CloudRow[]>;
  update(table: string, patch: CloudPatch, filter: CloudFilter): Promise<CloudRow[]>;
  remove(table: string, filter: CloudFilter): Promise<void>;
  upload?(bucket: string, path: string, file: Blob, contentType: string): Promise<void>;
  downloadUrl?(bucket: string, path: string, expiresIn: number): Promise<string>;
  removeObject?(bucket: string, path: string): Promise<void>;
};

function fail(message: string, code?: string): Error {
  return new Error(code ? `${message} (kod: ${code})` : message);
}

export function createSupabasePort(client: SupabaseClient): CloudPort {
  return {
    async select(table, filter) {
      let query = client.from(table).select('*');
      for (const [column, value] of Object.entries(filter ?? {})) {
        query = value === null ? query.is(column, null) : query.eq(column, value);
      }
      const { data, error } = await query;
      if (error) throw fail(error.message, error.code);
      return (data ?? []) as CloudRow[];
    },

    async insert(table, rows) {
      const { data, error } = await client.from(table).insert(rows).select('*');
      if (error) throw fail(error.message, error.code);
      return (data ?? []) as CloudRow[];
    },

    async update(table, patch, filter) {
      let query = client.from(table).update(patch);
      for (const [column, value] of Object.entries(filter)) {
        query = value === null ? query.is(column, null) : query.eq(column, value);
      }
      const { data, error } = await query.select('*');
      if (error) throw fail(error.message, error.code);
      return (data ?? []) as CloudRow[];
    },

    async remove(table, filter) {
      let query = client.from(table).delete();
      for (const [column, value] of Object.entries(filter)) {
        query = value === null ? query.is(column, null) : query.eq(column, value);
      }
      const { error } = await query;
      if (error) throw fail(error.message, error.code);
    },

    async upload(bucket, path, file, contentType) {
      const { error } = await client.storage
        .from(bucket)
        .upload(path, file, { contentType, upsert: false });
      if (error) throw fail(error.message);
    },

    async downloadUrl(bucket, path, expiresIn) {
      const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresIn);
      if (error || !data?.signedUrl) throw fail(error?.message ?? 'İmzalı bağlantı alınamadı');
      return data.signedUrl;
    },

    async removeObject(bucket, path) {
      const { error } = await client.storage.from(bucket).remove([path]);
      if (error) throw fail(error.message);
    },
  };
}

export const DOCUMENT_BUCKET = 'client-documents';
