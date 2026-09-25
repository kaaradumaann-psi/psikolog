/**
 * Production data-access adapter: Supabase.
 *
 * Only the publishable/anon key is used, so every statement below is filtered by
 * the RLS policies in `supabase/migrations/`. The service role key never reaches
 * the browser.
 *
 * The project has no generated Database types, so the client is loosely typed at
 * this boundary; row shapes are enforced by `cloud/types.ts` on the way out.
 */

import { requireSupabase } from '../../auth/supabaseClient';
import { DOCUMENT_BUCKET } from './ports';
import type { DbPort, Filter, Row, StoragePort } from './ports';
import type { CloudTable } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any -- untyped client boundary */
type AnyQuery = any;

function table(name: CloudTable): AnyQuery {
  return requireSupabase().from(name as string);
}

function applyFilters(query: AnyQuery, filters: Filter[]): AnyQuery {
  let current = query;
  for (const filter of filters) {
    current = filter.op === 'eq' ? current.eq(filter.column, filter.value) : current.in(filter.column, filter.value);
  }
  return current;
}

export const supabaseDbPort: DbPort = {
  async list<T>(name: CloudTable, filters: Filter[] = []): Promise<T[]> {
    const { data, error } = await applyFilters(table(name).select('*'), filters);
    if (error) throw new Error(`${name} okunamadı: ${error.message}`);
    return (data ?? []) as T[];
  },

  async upsert<T>(name: CloudTable, row: Row): Promise<T> {
    const { data, error } = await table(name).upsert(row, { onConflict: 'id' }).select('*').single();
    if (error) throw new Error(`${name} yazılamadı: ${error.message}`);
    return data as T;
  },

  async remove(name: CloudTable, id: string): Promise<void> {
    const { error } = await table(name).delete().eq('id', id);
    if (error) throw new Error(`${name} silinemedi: ${error.message}`);
  },

  async rpc<T>(fn: string, args: Row = {}): Promise<T> {
    const { data, error } = await requireSupabase().rpc(fn, args);
    if (error) throw new Error(`${fn} çalıştırılamadı: ${error.message}`);
    return data as T;
  },
};

export const supabaseStoragePort: StoragePort = {
  async upload(path: string, bytes: Uint8Array, mimeType: string): Promise<void> {
    const { error } = await requireSupabase().storage
      .from(DOCUMENT_BUCKET)
      .upload(path, new Blob([bytes as BlobPart], { type: mimeType }), {
        contentType: mimeType,
        upsert: true,
      });
    if (error) throw new Error(`Belge yüklenemedi: ${error.message}`);
  },

  async signedUrl(path: string, expiresInSeconds: number): Promise<string> {
    const { data, error } = await requireSupabase().storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) throw new Error(`Belge bağlantısı alınamadı: ${error?.message ?? '—'}`);
    return data.signedUrl;
  },

  async remove(path: string): Promise<void> {
    const { error } = await requireSupabase().storage.from(DOCUMENT_BUCKET).remove([path]);
    if (error) throw new Error(`Belge silinemedi: ${error.message}`);
  },
};
