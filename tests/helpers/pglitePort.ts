/**
 * Test data-access adapter: real PostgreSQL (PGlite/WASM) running the real
 * migrations.
 *
 * This is not a mock. Every statement goes through PostgreSQL's query planner
 * and the actual RLS policies defined in `supabase/migrations/`, with the role
 * switched via `set role authenticated` + `request.jwt.claim.sub`, exactly as
 * PostgREST does. The only thing that cannot be exercised here is Supabase
 * Storage's object store, so `signedUrl` returns a synthetic link and says so.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { DbPort, Filter, Row, StoragePort } from '../../src/clinical/cloud/ports.ts';
import type { CloudTable } from '../../src/clinical/cloud/types.ts';

const TABLES = new Set<CloudTable>([
  'clients',
  'anamneses',
  'appointments',
  'sessions',
  'test_administrations',
  'test_results',
  'reports',
  'documents',
  'notes',
  'tasks',
  'formulations',
  'safety_plans',
]);

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function assertTable(name: string): void {
  if (!TABLES.has(name as CloudTable)) throw new Error(`Bilinmeyen tablo: ${name}`);
}

function assertColumn(name: string): void {
  if (!IDENTIFIER.test(name)) throw new Error(`Geçersiz sütun adı: ${name}`);
}

export type TestSession = {
  db: PGlite;
  asUser(userId: string | null): Promise<void>;
  asAnon(): Promise<void>;
  asSuperuser(): Promise<void>;
  sql<T = Record<string, unknown>>(query: string, params?: unknown[]): Promise<T[]>;
  /** Migration files applied so far, in filename order. */
  appliedMigrations(): string[];
  /**
   * Apply the migration files that have not been applied yet, in filename order.
   * This is what `supabase db push` does against a project that is behind.
   */
  applyRemainingMigrations(): Promise<void>;
  /** Re-apply one migration file, simulating a repeated push. */
  reapplyMigration(file: string): Promise<void>;
  close(): Promise<void>;
};

function migrationFiles(): string[] {
  return readdirSync('supabase/migrations').sort();
}

function readMigration(file: string): string {
  return readFileSync(`supabase/migrations/${file}`, 'utf8').replace(
    'create extension if not exists pgcrypto;',
    '',
  );
}

/**
 * Boot PostgreSQL, install the Supabase shims the migrations expect, run them.
 *
 * `upToMigration` stops after applying the named file (inclusive), so a test can
 * put data into a database that only knows the older schema and then apply the
 * newer migrations on top — the situation `supabase db push` creates.
 */
export async function createTestDatabase(options: { upToMigration?: string } = {}): Promise<TestSession> {
  const db = new PGlite();

  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    create schema if not exists storage;
    create table if not exists storage.buckets(
      id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
    create table if not exists storage.objects(
      id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid,
      created_at timestamptz default now(), updated_at timestamptz default now(),
      last_accessed_at timestamptz default now(), metadata jsonb, path_tokens text[]);
    create or replace function storage.foldername(name text) returns text[] language plpgsql
      as $$ begin return string_to_array(name, '/'); end; $$;
    grant usage on schema storage to authenticated, anon;
    grant all on storage.buckets to authenticated, anon;
    grant all on storage.objects to authenticated, anon;
    grant execute on function storage.foldername(text) to authenticated, anon;
    -- Real Supabase ships storage.objects with RLS on; without this the object
    -- policies from migration 004 would be created but never evaluated.
    alter table storage.objects enable row level security;
  `);

  const applied: string[] = [];
  const limit = options.upToMigration;
  if (limit && !migrationFiles().includes(limit)) {
    throw new Error(`Bilinmeyen migration: ${limit}`);
  }
  for (const file of migrationFiles()) {
    await db.exec(readMigration(file));
    applied.push(file);
    if (file === limit) break;
  }

  return {
    db,
    appliedMigrations: () => [...applied],
    async applyRemainingMigrations() {
      for (const file of migrationFiles()) {
        if (applied.includes(file)) continue;
        await db.exec(readMigration(file));
        applied.push(file);
      }
    },
    async reapplyMigration(file: string) {
      if (!migrationFiles().includes(file)) throw new Error(`Bilinmeyen migration: ${file}`);
      await db.exec(readMigration(file));
      if (!applied.includes(file)) applied.push(file);
    },
    async asUser(userId: string | null) {
      await db.exec('reset role');
      await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
      await db.exec('set role authenticated');
    },
    async asAnon() {
      await db.exec('reset role');
      await db.exec(`select set_config('request.jwt.claim.sub', '', false)`);
      await db.exec('set role anon');
    },
    async asSuperuser() {
      await db.exec('reset role');
    },
    async sql<T>(query: string, params: unknown[] = []) {
      const result = await db.query<T>(query, params);
      return result.rows as T[];
    },
    async close() {
      await db.close();
    },
  };
}

/** Create an auth user; the migration trigger gives them a least-privilege profile. */
export async function createAuthUser(session: TestSession, id: string, email: string): Promise<void> {
  await session.asSuperuser();
  await session.sql(`insert into auth.users(id, email) values ($1, $2) on conflict (id) do nothing`, [id, email]);
  await session.sql(
    `update public.profiles set first_name = $2, last_name = $3 where id = $1`,
    [id, email.split('@')[0] ?? 'Test', 'Kullanıcı'],
  );
}

export function buildDbPort(session: TestSession): DbPort {
  return {
    async list<T>(table: CloudTable, filters: Filter[] = []): Promise<T[]> {
      assertTable(table);
      const clauses: string[] = [];
      const params: unknown[] = [];
      for (const filter of filters) {
        assertColumn(filter.column);
        if (filter.op === 'eq') {
          params.push(filter.value);
          clauses.push(`${filter.column} = $${params.length}`);
        } else {
          params.push(filter.value);
          clauses.push(`${filter.column} = any($${params.length})`);
        }
      }
      const where = clauses.length ? ` where ${clauses.join(' and ')}` : '';
      return session.sql<T>(`select * from public.${table}${where}`, params);
    },

    async upsert<T>(table: CloudTable, row: Row): Promise<T> {
      assertTable(table);
      const columns = Object.keys(row);
      if (!columns.length) throw new Error('Boş satır yazılamaz.');
      columns.forEach(assertColumn);
      const values = columns.map((_, index) => `$${index + 1}`);
      const updates = columns
        .filter((column) => column !== 'id')
        .map((column) => `${column} = excluded.${column}`);
      const statement =
        `insert into public.${table} (${columns.join(', ')}) values (${values.join(', ')})` +
        (updates.length ? ` on conflict (id) do update set ${updates.join(', ')}` : ' on conflict (id) do nothing') +
        ' returning *';
      const rows = await session.sql<T>(statement, columns.map((column) => row[column]));
      if (!rows.length) throw new Error(`${table} yazılamadı (RLS reddetmiş olabilir).`);
      return rows[0] as T;
    },

    async remove(table: CloudTable, id: string): Promise<void> {
      assertTable(table);
      await session.sql(`delete from public.${table} where id = $1`, [id]);
    },

    async rpc<T>(fn: string, args: Row = {}): Promise<T> {
      if (!IDENTIFIER.test(fn)) throw new Error(`Geçersiz fonksiyon adı: ${fn}`);
      const names = Object.keys(args);
      names.forEach(assertColumn);
      const params = names.map((_, index) => `$${index + 1}`);
      const call = names.length
        ? names.map((name, index) => `${name} => $${index + 1}`).join(', ')
        : '';
      const rows = await session.sql<T>(`select public.${fn}(${call}) as result`, names.map((n) => args[n]));
      return (rows[0] as { result: T } | undefined)?.result as T;
    },
  };
}

/**
 * In-database storage stub. Objects are written to `storage.objects`, so the
 * bucket policies in migration 004 are genuinely evaluated; only signed-URL
 * generation is synthetic because there is no object store inside PGlite.
 */
export function buildStoragePort(session: TestSession): StoragePort & { objects(): Promise<{ name: string }[]> } {
  return {
    async upload(path: string, bytes: Uint8Array, mimeType: string): Promise<void> {
      await session.sql(
        `insert into storage.objects(bucket_id, name, owner, metadata)
         values ('client-documents', $1, auth.uid(), $2::jsonb)`,
        [path, JSON.stringify({ mimeType, size: bytes.byteLength })],
      );
    },
    async signedUrl(path: string): Promise<string> {
      return `https://signed.invalid/client-documents/${path}`;
    },
    async remove(path: string): Promise<void> {
      await session.sql(`delete from storage.objects where bucket_id = 'client-documents' and name = $1`, [path]);
    },
    async objects() {
      return session.sql<{ name: string }>(
        `select name from storage.objects where bucket_id = 'client-documents' order by name`,
      );
    },
  };
}
