import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

/**
 * PHASE-13 sıkılaştırma kanıtı (20260924000007).
 *
 * Bunlar "iyi çalışan" testler değil, "kötünün mümkün olmadığını" gösteren testlerdir:
 * aynı kurumdaki başka bir psikolog, kurum yöneticisi olmayan biri, bir başkasının
 * klinik içeriğini okuyamaz/değiştiremez/silemez; tamamlanmış raporu sahibi de
 * değiştiremez. Bu dosya göçlerin tamamını PGlite'ta kurar — canlı Supabase'e bağlanmaz.
 */

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ADMIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PSY_OWNER = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PSY_COLLEAGUE = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PSY_OTHER_ORG = '11111111-1111-4111-8111-111111111111';
const ORG_ADMIN_A = 'a2a2a2a2-a2a2-4a2a-8a2a-a2a2a2a2a2a2';
const CLIENT_OWNER = '22222222-2222-4222-8222-222222222222';
const SESSION_ID = '55555555-5555-4555-8555-555555555555';
const NOTE_ID = '77777777-7777-4777-8777-777777777777';
const ADMINISTRATION_ID = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1';
const TEST_DEF_ID = 'f5f5f5f5-f5f5-4f5f-8f5f-f5f5f5f5f5f5';
const RESULT_ID = 'c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2';
const REPORT_ID = 'd3d3d3d3-d3d3-4d3d-8d3d-d3d3d3d3d3d3';

async function buildDb() {
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
  for (const file of readdirSync('supabase/migrations').sort()) {
    const sql = readFileSync(`supabase/migrations/${file}`, 'utf8').replace('create extension if not exists pgcrypto;', '');
    try {
      await db.exec(sql);
    } catch (error) {
      const message = String((error as Error).message);
      if (!/already exists|storage/i.test(message)) throw error;
    }
  }
  await db.query(`insert into public.organizations(id, name) values ($1, 'Org A'), ($2, 'Org B') on conflict (id) do nothing`, [ORG_A, ORG_B]);
  await db.query(
    `insert into auth.users(id, email) values ($1,'admin@test'), ($2,'owner@test'), ($3,'colleague@test'), ($4,'other@test'), ($5,'orgadmin@test') on conflict (id) do nothing`,
    [ADMIN, PSY_OWNER, PSY_COLLEAGUE, PSY_OTHER_ORG, ORG_ADMIN_A]
  );
  await db.query(`update public.profiles set role = 'ADMIN', active = true where id = $1`, [ADMIN]);
  await db.query(`update public.profiles set role = 'PSYCHOLOG', organization_id = $2, active = true where id = $1`, [PSY_OWNER, ORG_A]);
  await db.query(`update public.profiles set role = 'PSYCHOLOG', organization_id = $2, active = true where id = $1`, [PSY_COLLEAGUE, ORG_A]);
  await db.query(`update public.profiles set role = 'PSYCHOLOG', organization_id = $2, active = true where id = $1`, [PSY_OTHER_ORG, ORG_B]);
  await db.query(`update public.profiles set role = 'ORG_ADMIN', organization_id = $2, active = true where id = $1`, [ORG_ADMIN_A, ORG_A]);

  await db.query(
    `insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by) values ($1, $2, 'HK-2026-001', 'Sahip', 'Olusan', $3) on conflict (id) do nothing`,
    [CLIENT_OWNER, ORG_A, PSY_OWNER]
  );
  await db.query(
    `insert into public.sessions(id, client_id, organization_id, date, type, created_by) values ($1, $2, $3, '2026-01-05', 'Takip', $4) on conflict (id) do nothing`,
    [SESSION_ID, CLIENT_OWNER, ORG_A, PSY_OWNER]
  );
  await db.query(
    `insert into public.notes(id, client_id, organization_id, content, created_by) values ($1, $2, $3, 'gizli klinik not', $4) on conflict (id) do nothing`,
    [NOTE_ID, CLIENT_OWNER, ORG_A, PSY_OWNER]
  );
  await db.query(
    `insert into public.test_definitions(id, name, source, is_system) values ($1, 'Beck Depresyon Envanteri', 'beck', true) on conflict (id) do nothing`,
    [TEST_DEF_ID]
  );
  await db.query(
    `insert into public.test_administrations(id, client_id, test_definition_id, organization_id, administration_date, status, created_by)
     values ($1, $2, $3, $4, '2026-01-06', 'completed', $5) on conflict (id) do nothing`,
    [ADMINISTRATION_ID, CLIENT_OWNER, TEST_DEF_ID, ORG_A, PSY_OWNER]
  );
  await db.query(
    `insert into public.test_results(id, test_administration_id, organization_id, result_data) values ($1, $2, $3, '{"total":12}'::jsonb) on conflict (id) do nothing`,
    [RESULT_ID, ADMINISTRATION_ID, ORG_A]
  );

  return db;
}

async function asUser(db: PGlite, id: string) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id]);
  await db.exec('set role authenticated');
}

test('clinical isolation: same-org colleague cannot read another clinician content', { timeout: 180000 }, async (t) => {
  const db = await buildDb();
  try {
    await asUser(db, PSY_COLLEAGUE);
    const sessions = await db.query(`select id from public.sessions where id = $1`, [SESSION_ID]);
    assert.equal(sessions.rows.length, 0, 'aynı kurumdaki meslektaş seans notunu okuyabildi');
    const notes = await db.query(`select id from public.notes where id = $1`, [NOTE_ID]);
    assert.equal(notes.rows.length, 0, 'aynı kurumdaki meslektaş klinik notu okuyabildi');
    const results = await db.query(`select id from public.test_results where id = $1`, [RESULT_ID]);
    assert.equal(results.rows.length, 0, 'aynı kurumdaki meslektaş test sonucunu okuyabildi');

    // Registry kimliği görünür kalır (kasıtlı tasarım): randevu/görev akışları buna dayanır.
    const client = await db.query(`select id from public.clients where id = $1`, [CLIENT_OWNER]);
    assert.equal(client.rows.length, 1, 'danışan kimliği kurum içinde görünmez oldu — UX bozan sıkılaştırma');

    const written = await db.query(`update public.notes set content = 'çalıntı' where id = $1 returning id`, [NOTE_ID]);
    assert.equal(written.rows.length, 0, 'meslektaş başkasının notunu güncelleyebildi');
    const removed = await db.query(`delete from public.sessions where id = $1 returning id`, [SESSION_ID]);
    assert.equal(removed.rows.length, 0, 'meslektaş başkasının seansını silebildi');
  } finally {
    await db.close();
  }
});

test('clinical isolation: owner and org admin keep access', { timeout: 180000 }, async (t) => {
  const db = await buildDb();
  try {
    await asUser(db, PSY_OWNER);
    const own = await db.query(`select id from public.sessions where id = $1`, [SESSION_ID]);
    assert.equal(own.rows.length, 1, 'kendi kaydını okuyamadı — sıkılaştırma ürünü kilitledi');
    const ownNotes = await db.query(`select id from public.notes where id = $1`, [NOTE_ID]);
    assert.equal(ownNotes.rows.length, 1);

    await asUser(db, ORG_ADMIN_A);
    const supervised = await db.query(`select id from public.sessions where id = $1`, [SESSION_ID]);
    assert.equal(supervised.rows.length, 1, 'kurum yöneticisi denetim erişimini kaybetti');

    await asUser(db, ADMIN);
    const everything = await db.query(`select id from public.notes`);
    assert.ok(everything.rows.length >= 1, 'platform yöneticisi erişimi kaybetti');
  } finally {
    await db.close();
  }
});

test('clinical isolation: completed report is immutable for its author', { timeout: 180000 }, async (t) => {
  const db = await buildDb();
  try {
    await asUser(db, PSY_OWNER);
    await db.query(
      `insert into public.reports(id, client_id, organization_id, created_by, title, content, source_snapshot, status)
       values ($1, $2, $3, $4, 'Klinik Rapor', '{"schemaVersion":1,"blocks":[]}'::jsonb, '{}'::jsonb, 'completed')`,
      [REPORT_ID, CLIENT_OWNER, ORG_A, PSY_OWNER]
    );
    await t.test('tamamlanmış raporu sahibi güncelleyemez', async () => {
      await assert.rejects(
        () => db.query(`update public.reports set title = 'sessizce degistirildi' where id = $1`, [REPORT_ID]),
        /tamamlandı|42501|permission/i
      );
    });
    await t.test('tamamlanmış raporu sahibi silemez', async () => {
      await assert.rejects(() => db.query(`delete from public.reports where id = $1`, [REPORT_ID]), /tamamlandı|42501|permission/i);
    });
    await t.test('rapor taslaktayken sahibi yazabilir', async () => {
      const draftId = 'e4e4e4e4-e4e4-4e4e-8e4e-e4e4e4e4e4e4';
      await db.query(
        `insert into public.reports(id, client_id, organization_id, created_by, title, content, source_snapshot, status)
         values ($1, $2, $3, $4, 'Taslak', '{"schemaVersion":1,"blocks":[]}'::jsonb, '{}'::jsonb, 'draft')`,
        [draftId, CLIENT_OWNER, ORG_A, PSY_OWNER]
      );
      const updated = await db.query(`update public.reports set title = 'güncel başlık' where id = $1 returning id`, [draftId]);
      assert.equal(updated.rows.length, 1);
    });
    await t.test('platform yöneticisi düzeltme yapabilir', async () => {
      await asUser(db, ADMIN);
      const fixed = await db.query(`update public.reports set title = 'yönetici düzeltmesi' where id = $1 returning id`, [REPORT_ID]);
      assert.equal(fixed.rows.length, 1);
    });
  } finally {
    await db.close();
  }
});

test('storage objects are scoped to the client folder, not just the org folder', { timeout: 180000 }, async (t) => {
  const db = await buildDb();
  try {
    await db.query(
      `insert into storage.objects(bucket_id, name, owner) values ('client-documents', $1, $2), ('client-documents', $3, $2)`,
      [`${ORG_A}/${CLIENT_OWNER}/rapor.pdf`, PSY_OWNER, `${ORG_B}/33333333-3333-4333-8333-333333333333/komsu.pdf`]
    );
    await asUser(db, PSY_OWNER);
    const mine = await db.query(`select name from storage.objects where bucket_id = 'client-documents'`);
    assert.equal(mine.rows.length, 1, 'kendi danışan klasörü dışındaki nesne göründü');
    assert.match(String(mine.rows[0].name), new RegExp(CLIENT_OWNER));

    // Aynı kurum meslektaşı: klasör adı org'u doğrulasa da danışan sahibi olmadığı için okuyamaz.
    await asUser(db, PSY_COLLEAGUE);
    const colleague = await db.query(`select name from storage.objects where bucket_id = 'client-documents'`);
    assert.equal(colleague.rows.length, 0, 'meslektaş başkasının danışan klasörünü okuyabildi');
  } finally {
    await db.close();
  }
});
