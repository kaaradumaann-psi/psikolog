import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ADMIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PSY_A = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PSY_B = '11111111-1111-4111-8111-111111111111';
const CLIENT_A = '22222222-2222-4222-8222-222222222222';
const CLIENT_B = '33333333-3333-4333-8333-333333333333';
const ANAM_A = '44444444-4444-4444-8444-444444444444';
const SESSION_A = '55555555-5555-4555-8555-555555555555';
const DOC_A = '66666666-6666-4666-8666-666666666666';
const NOTE_A = '77777777-7777-4777-8777-777777777777';
const APPT_A = '88888888-8888-4888-8888-888888888888';
const TASK_A = '99999999-9999-4999-8999-999999999999';

test('security: PHASE-06/07 tables IDOR and tenant isolation', { timeout: 120000 }, async (t) => {
  const db = new PGlite();
  try {
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
      const sql = readFileSync(`supabase/migrations/${f}`, 'utf8').replace('create extension if not exists pgcrypto;', '');
      try {
        await db.exec(sql);
      } catch (e) {
        // Ignore storage bucket insert errors in PGlite if any
        const msg = String((e as Error).message);
        if (!msg.includes('already exists') && !msg.includes('storage')) throw e;
      }
    }

    await db.query(`insert into public.organizations(id, name) values ($1, 'Org A'), ($2, 'Org B') on conflict (id) do nothing`, [ORG_A, ORG_B]);
    await db.query(`insert into auth.users(id,email) values ($1,'admin@test'), ($2,'psy-a@test'), ($3,'psy-b@test') on conflict (id) do nothing`, [ADMIN, PSY_A, PSY_B]);
    await db.query(`update public.profiles set role='ADMIN', active=true where id=$1`, [ADMIN]);
    await db.query(`update public.profiles set role='PSYCHOLOG', organization_id=$2, active=true where id=$1`, [PSY_A, ORG_A]);
    await db.query(`update public.profiles set role='PSYCHOLOG', organization_id=$2, active=true where id=$1`, [PSY_B, ORG_B]);

    await db.query(`insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by) values ($1,$2,'F-001','Ali','Veli',$3) on conflict (id) do nothing`, [CLIENT_A, ORG_A, PSY_A]);
    await db.query(`insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by) values ($1,$2,'F-001','Ayse','Fatma',$3) on conflict (id) do nothing`, [CLIENT_B, ORG_B, PSY_B]);

    // Seed PHASE-06/07 data for ORG_A
    await db.query(`insert into public.anamneses(id, client_id, organization_id, created_by) values ($1,$2,$3,$4) on conflict (id) do nothing`, [ANAM_A, CLIENT_A, ORG_A, PSY_A]);
    await db.query(`insert into public.sessions(id, client_id, organization_id, date, type, created_by) values ($1,$2,$3,'2024-01-01','Takip',$4) on conflict (id) do nothing`, [SESSION_A, CLIENT_A, ORG_A, PSY_A]);
    await db.query(`insert into public.documents(id, client_id, organization_id, file_path, file_name, mime_type, size_bytes, created_by) values ($1,$2,$3,$4,'test.pdf','application/pdf',100,$5) on conflict (id) do nothing`, [DOC_A, CLIENT_A, ORG_A, `${ORG_A}/${CLIENT_A}/test.pdf`, PSY_A]);
    await db.query(`insert into public.notes(id, client_id, organization_id, content, created_by) values ($1,$2,$3,'secret note',$4) on conflict (id) do nothing`, [NOTE_A, CLIENT_A, ORG_A, PSY_A]);
    await db.query(`insert into public.appointments(id, organization_id, title, start_at, end_at, created_by) values ($1,$2,'Randevu', now(), now() + interval '1 hour',$3) on conflict (id) do nothing`, [APPT_A, ORG_A, PSY_A]);
    await db.query(`insert into public.tasks(id, organization_id, title, created_by) values ($1,$2,'Görev',$3) on conflict (id) do nothing`, [TASK_A, ORG_A, PSY_A]);

    async function asUser(id: string) {
      await db.exec('reset role');
      await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
      await db.exec('set role authenticated');
    }

    await t.test('PSY_A can read own org anamnesis', async () => {
      await asUser(PSY_A);
      const rows = await db.query(`select id from public.anamneses where client_id=$1`, [CLIENT_A]);
      assert.equal(rows.rows.length, 1);
    });

    await t.test('PSY_B cannot read ORG_A anamnesis (IDOR)', async () => {
      await asUser(PSY_B);
      const rows = await db.query(`select id from public.anamneses where client_id=$1`, [CLIENT_A]);
      assert.equal(rows.rows.length, 0);
    });

    await t.test('PSY_B cannot read ORG_A sessions', async () => {
      await asUser(PSY_B);
      const rows = await db.query(`select id from public.sessions where client_id=$1`, [CLIENT_A]);
      assert.equal(rows.rows.length, 0);
    });

    await t.test('PSY_B cannot read ORG_A documents', async () => {
      await asUser(PSY_B);
      const rows = await db.query(`select id from public.documents where client_id=$1`, [CLIENT_A]);
      assert.equal(rows.rows.length, 0);
    });

    await t.test('PSY_B cannot read ORG_A notes', async () => {
      await asUser(PSY_B);
      const rows = await db.query(`select id from public.notes where client_id=$1`, [CLIENT_A]);
      assert.equal(rows.rows.length, 0);
    });

    await t.test('PSY_B cannot read ORG_A appointments', async () => {
      await asUser(PSY_B);
      const rows = await db.query(`select id from public.appointments where organization_id=$1`, [ORG_A]);
      assert.equal(rows.rows.length, 0);
    });

    await t.test('PSY_B cannot read ORG_A tasks', async () => {
      await asUser(PSY_B);
      const rows = await db.query(`select id from public.tasks where organization_id=$1`, [ORG_A]);
      assert.equal(rows.rows.length, 0);
    });

    await t.test('Anon cannot read documents', async () => {
      await db.exec('reset role');
      await db.exec('set role anon');
      try {
        const rows = await db.query(`select id from public.documents`);
        assert.equal(rows.rows.length, 0);
      } catch (e) {
        const msg = String((e as { message?: string }).message ?? '');
        assert.ok(/permission denied|42501/i.test(msg));
      }
    });

    await t.test('Storage bucket is private', async () => {
      const rows = await db.query(`select public from storage.buckets where id='client-documents'`);
      assert.equal(rows.rows[0]?.public, false);
    });

    await t.test('Admin can read all', async () => {
      await asUser(ADMIN);
      const docs = await db.query(`select id from public.documents`);
      assert.ok(docs.rows.length >= 1);
      const notes = await db.query(`select id from public.notes`);
      assert.ok(notes.rows.length >= 1);
    });

    await t.test('Reports RLS: PSY_B cannot read ORG_A report', async () => {
      // Create report for ORG_A
      await asUser(PSY_A);
      const reportId = crypto.randomUUID();
      await db.query(`insert into public.reports(id, client_id, organization_id, created_by, title, content, source_snapshot) values ($1,$2,$3,$4,'Test','{\"schemaVersion\":1,\"blocks\":[]}'::jsonb,'{}'::jsonb)`, [reportId, CLIENT_A, ORG_A, PSY_A]);
      await asUser(PSY_B);
      const rows = await db.query(`select id from public.reports where id=$1`, [reportId]);
      assert.equal(rows.rows.length, 0);
    });

  } finally {
    await db.close();
  }
});
