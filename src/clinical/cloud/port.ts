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
      // PostgREST limits every response (often 1000 rows). One unpaged select
      // silently truncates a clinical file and hydration then replaces its cache.
      // Use the *actual* number returned as the next offset: deployments can set
      // a lower max_rows than the requested page size.
      const orderColumn = table === 'psychologist_settings' ? 'created_by' : 'id';
      const rows: CloudRow[] = [];
      let total: number | null = null;
      while (true) {
        let query = client.from(table).select('*', { count: 'exact' });
        for (const [column, value] of Object.entries(filter ?? {})) {
          query = value === null ? query.is(column, null) : query.eq(column, value);
        }
        const { data, count, error } = await query
          .order(orderColumn, { ascending: true })
          .range(rows.length, rows.length + 499);
        if (error) throw fail(error.message, error.code);
        if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0 || (total !== null && count !== total)) {
          throw fail('Klinik kayıtların tamamı doğrulanamadı. Lütfen yeniden deneyin.');
        }
        total = count;
        const page = (data ?? []) as CloudRow[];
        rows.push(...page);
        if (rows.length === total) {
          // A concurrent insertion/deletion during pagination must not silently
          // turn duplicate/missing records into an apparently complete snapshot.
          const ids = rows.map((row) => row[orderColumn]);
          if (ids.some((id) => typeof id !== 'string') || new Set(ids).size !== rows.length) {
            throw fail('Klinik kayıtların tamamı doğrulanamadı. Lütfen yeniden deneyin.');
          }
          return rows;
        }
        if (page.length === 0 || rows.length > total) {
          throw fail('Klinik kayıtların tamamı doğrulanamadı. Lütfen yeniden deneyin.');
        }
      }
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
      // RLS can silently turn DELETE into zero affected rows. Do not report a
      // successful deletion if the server did not actually remove the record.
      const { data, error } = await query.select('id');
      if (error) throw fail(error.message, error.code);
      if (!data?.length) throw fail('Kayıt bulunamadı veya silme yetkiniz yok.');
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
