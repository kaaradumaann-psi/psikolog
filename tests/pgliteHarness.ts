/**
 * PHASE-07 test harness — gerçek PostgreSQL (PGlite) üzerinde Supabase şeması.
 * Migration'lar sırayla uygulanır; auth/storage şemaları Supabase davranışına
 * yakın biçimde taklit edilir (auth.uid(), storage.foldername, RLS açık).
 *
 * NOT: PGlite yardımcı doğrulamadır; Live Supabase/PRODUCTION yerine geçmez.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

export const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const ADMIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
export const PSY_A1 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
export const PSY_A2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
export const PSY_A3 = 'e5e5e5e5-e5e5-45e5-85e5-e5e5e5e5e5e5';
export const PSY_B = '11111111-1111-4111-8111-111111111111';
export const NO_PROFILE = '12121212-1212-4212-8212-121212121212';

export const CLIENT_A1 = '22222222-2222-4222-8222-222222222222';
export const CLIENT_A2 = '23232323-2323-4232-8232-232323232323';
export const CLIENT_B = '33333333-3333-4333-8333-333333333333';

export const ANAM_A1 = '44444444-4444-4444-8444-444444444444';
export const SESSION_A1 = '55555555-5555-4555-8555-555555555555';
export const APPT_A1 = '88888888-8888-4888-8888-888888888888';
export const FORM_A1 = '61616161-6161-4161-8161-616161616161';
export const SAFETY_A1 = '71717171-7171-4171-8171-717171717171';
export const REPORT_A1 = '91919191-9191-4191-8191-919191919191';
export const ASSESSMENT_A1 = 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1';
export const TEST_ADMIN_A1 = 'b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2';
export const TEST_RESULT_A1 = 'c3c3c3c3-c3c3-43c3-83c3-c3c3c3c3c3c3';
export const DOC_A1 = '66666666-6666-4666-8666-666666666666';
export const NOTE_A1 = '77777777-7777-4777-8777-777777777777';
export const TASK_A1 = '99999999-9999-4999-8999-999999999999';
export const GRADED_ADMIN = 'd4d4d4d4-d4d4-44d4-84d4-d4d4d4d4d4d4';

/** İstanbul saatiyle bugün — validate_session_date ileri tarihi reddeder. */
export function istanbulToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
}

export async function createClinicalDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema if not exists auth;
    create table if not exists auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    create schema if not exists storage;
    create table if not exists storage.buckets(id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
    create table if not exists storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, created_at timestamptz default now(), updated_at timestamptz default now(), last_accessed_at timestamptz default now(), metadata jsonb, path_tokens text[]);
    create or replace function storage.foldername(name text) returns text[] language plpgsql as $$ begin return string_to_array(name, '/'); end; $$;
    grant usage on schema storage to authenticated, anon;
    grant all on storage.buckets to authenticated, anon;
    grant all on storage.objects to authenticated, anon;
    grant execute on function storage.foldername(text) to authenticated, anon;
  `);

  for (const f of readdirSync('supabase/migrations').sort()) {
    const sql = readFileSync(`supabase/migrations/${f}`, 'utf8').replace(
      'create extension if not exists pgcrypto;',
      '',
    );
    await db.exec(sql);
  }

  // Supabase storage.objects RLS'i varsayılan olarak açıktır.
  await db.exec('alter table storage.objects enable row level security;');
  return db;
}

/** PHASE-07 senaryosunun ortak veri kurulumu: 2 kurum, 4 kullanıcı, 3 danışan. */
export async function seedPhase7Scenario(db: PGlite): Promise<void> {
  await db.query(
    `insert into public.organizations(id, name) values ($1, 'Org A'), ($2, 'Org B') on conflict (id) do nothing`,
    [ORG_A, ORG_B],
  );
  await db.query(
    `insert into auth.users(id,email) values ($1,'admin@test'), ($2,'psy-a1@test'), ($3,'psy-a2@test'), ($4,'psy-b@test'), ($5,'no-profile@test'), ($6,'psy-a3@test') on conflict (id) do nothing`,
    [ADMIN, PSY_A1, PSY_A2, PSY_B, NO_PROFILE, PSY_A3],
  );
  await db.query(`update public.profiles set role='ADMIN', active=true, organization_id=null where id=$1`, [ADMIN]);
  await db.query(`update public.profiles set role='ORG_ADMIN', active=true, organization_id=$2 where id=$1`, [PSY_A1, ORG_A]);
  await db.query(`update public.profiles set role='PSYCHOLOG', active=true, organization_id=$2 where id=$1`, [PSY_A2, ORG_A]);
  await db.query(`update public.profiles set role='PSYCHOLOG', active=true, organization_id=$2 where id=$1`, [PSY_A3, ORG_A]);
  await db.query(`update public.profiles set role='PSYCHOLOG', active=true, organization_id=$2 where id=$1`, [PSY_B, ORG_B]);
  await db.query(`delete from public.profiles where id=$1`, [NO_PROFILE]);

  await db.query(
    `insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by, owner_user_id) values ($1,$2,'HK-001','Ayşe','Kaya',$3,$3) on conflict (id) do nothing`,
    [CLIENT_A1, ORG_A, PSY_A2],
  );
  await db.query(
    `insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by, owner_user_id) values ($1,$2,'HK-002','Mert','Demir',$3,$3) on conflict (id) do nothing`,
    [CLIENT_A2, ORG_A, PSY_A1],
  );
  await db.query(
    `insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by, owner_user_id) values ($1,$2,'HK-003','Zeynep','Ak',$3,$3) on conflict (id) do nothing`,
    [CLIENT_B, ORG_B, PSY_B],
  );

  // ORG_A / PSY_A2 sahipli klinik veri
  await db.query(
    `insert into public.anamneses(id, client_id, organization_id, reason, created_by) values ($1,$2,$3,'uyku sorunu',$4) on conflict (id) do nothing`,
    [ANAM_A1, CLIENT_A1, ORG_A, PSY_A2],
  );
  await db.query(
    `insert into public.sessions(id, client_id, organization_id, date, type, notes, created_by) values ($1,$2,$3,$4,'Bireysel Terapi','S: uyku',$5) on conflict (id) do nothing`,
    [SESSION_A1, CLIENT_A1, ORG_A, istanbulToday(), PSY_A2],
  );
  await db.query(
    `insert into public.appointments(id, client_id, organization_id, title, start_at, end_at, created_by) values ($1,$2,$3,'Randevu', now(), now() + interval '1 hour',$4) on conflict (id) do nothing`,
    [APPT_A1, CLIENT_A1, ORG_A, PSY_A2],
  );
  await db.query(
    `insert into public.assessments(id, client_id, organization_id, assessment_date, created_by) values ($1,$2,$3,$4,$5) on conflict (id) do nothing`,
    [ASSESSMENT_A1, CLIENT_A1, ORG_A, istanbulToday(), PSY_A2],
  );
  await db.query(
    `insert into public.test_administrations(id, client_id, assessment_id, test_definition_id, organization_id, administration_date, created_by) values ($1,$2,$3,'00000000-0000-4000-8000-000000000002',$4,$5,$6) on conflict (id) do nothing`,
    [TEST_ADMIN_A1, CLIENT_A1, ASSESSMENT_A1, ORG_A, istanbulToday(), PSY_A2],
  );
  await db.query(
    `insert into public.test_results(id, test_administration_id, organization_id, result_data, summary) values ($1,$2,$3,'{"totalScore":12}'::jsonb,'BDI 12') on conflict (id) do nothing`,
    [TEST_RESULT_A1, TEST_ADMIN_A1, ORG_A],
  );
  await db.query(
    `insert into public.documents(id, client_id, organization_id, file_path, file_name, mime_type, size_bytes, created_by) values ($1,$2,$3,$4,'onam.pdf','application/pdf',1024,$5) on conflict (id) do nothing`,
    [DOC_A1, CLIENT_A1, ORG_A, `${ORG_A}/${CLIENT_A1}/onam.pdf`, PSY_A2],
  );
  await db.query(
    `insert into public.notes(id, client_id, organization_id, content, created_by) values ($1,$2,$3,'gizli not',$4) on conflict (id) do nothing`,
    [NOTE_A1, CLIENT_A1, ORG_A, PSY_A2],
  );
  await db.query(
    `insert into public.tasks(id, client_id, organization_id, title, created_by) values ($1,$2,$3,'kontrol',$4) on conflict (id) do nothing`,
    [TASK_A1, CLIENT_A1, ORG_A, PSY_A2],
  );
  await db.query(
    `insert into public.reports(id, client_id, organization_id, created_by, title, content, source_snapshot, status) values ($1,$2,$3,$4,'Rapor','{"schemaVersion":1,"blocks":[]}'::jsonb,'{}'::jsonb,'draft') on conflict (id) do nothing`,
    [REPORT_A1, CLIENT_A1, ORG_A, PSY_A2],
  );

  try {
    await db.query(
      `insert into storage.objects(id, bucket_id, name, owner) values ($1,'client-documents',$2,$3) on conflict (id) do nothing`,
      [GRADED_ADMIN, `${ORG_A}/${CLIENT_A1}/onam.pdf`, PSY_A2],
    );
  } catch {
    /* storage nesnesi opsiyonel */
  }
}

/** Belirtilen kullanıcı olarak RLS'li oturum açar. */
export async function asUser(db: PGlite, userId: string): Promise<void> {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [userId]);
  await db.exec('set role authenticated');
}

export async function asAnon(db: PGlite): Promise<void> {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub','',false)`);
  await db.exec('set role anon');
}

/** RLS'siz (migration/servis) bağlam. */
export async function asService(db: PGlite): Promise<void> {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub','',false)`);
}

/** etkilenen satır sayısı: PGlite affectedRows verir */
export async function count(db: PGlite, sql: string, params: unknown[] = []): Promise<number> {
  const result = await db.query(sql, params);
  return result.rows.length;
}
