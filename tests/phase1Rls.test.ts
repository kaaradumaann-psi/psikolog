import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ADMIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PSY_A = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PSY_B = '11111111-1111-4111-8111-111111111111';
const CLIENT_A = '22222222-2222-4222-8222-222222222222';
const MMPI_DEF = '00000000-0000-4000-8000-000000000006';

test('phase1: SSO tables, MMPI definition, client UUID, administration uniqueness', { timeout: 90000 }, async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
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
      await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8').replace('create extension if not exists pgcrypto;', ''));
    }

    await db.query(`insert into public.organizations(id, name) values ($1, 'Org A')`, [ORG_A]);
    await db.query(`insert into auth.users(id,email) values ($1,'admin@test'), ($2,'psy-a@test'), ($3,'psy-b@test')`, [
      ADMIN,
      PSY_A,
      PSY_B,
    ]);
    await db.query(`update public.profiles set role='ADMIN', active=true where id=$1`, [ADMIN]);
    await db.query(`update public.profiles set role='PSYCHOLOG', organization_id=$2, active=true where id=$1`, [
      PSY_A,
      ORG_A,
    ]);
    await db.query(`update public.profiles set role='PSYCHOLOG', organization_id=$2, active=true where id=$1`, [
      PSY_B,
      ORG_A,
    ]);
    await db.query(
      `insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by, legacy_client_id, gender)
       values ($1,$2,'F-001','Ahmet','CE',$3,'cli_ahmet_1','ERKEK')`,
      [CLIENT_A, ORG_A, PSY_A],
    );

    async function asUser(id: string) {
      await db.exec('reset role');
      await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
      await db.exec('set role authenticated');
    }

    await t.test('MMPI system definition exists', async () => {
      await asUser(PSY_A);
      const rows = await db.query(`select name, is_system from public.test_definitions where id=$1`, [MMPI_DEF]);
      assert.equal(rows.rows.length, 1);
      assert.equal((rows.rows[0] as { is_system: boolean }).is_system, true);
    });

    await t.test('legacy_client_id unique per org', async () => {
      await asUser(PSY_A);
      await assert.rejects(
        db.query(
          `insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by, legacy_client_id)
           values (gen_random_uuid(), $1, 'F-002', 'X', 'Y', $2, 'cli_ahmet_1')`,
          [ORG_A, PSY_A],
        ),
      );
    });

    await t.test('authenticated cannot read SSO codes', async () => {
      await db.exec('reset role');
      await db.query(
        `insert into public.sso_authorization_codes(code_hash, user_id, audience, redirect_uri, state_hash, expires_at)
         values ('hash-1', $1, 'mmpi', 'https://mmpi.halilkaraduman.com.tr/sso', 'state-hash', timezone('utc', now()) + interval '1 minute')`,
        [PSY_A],
      );
      await asUser(PSY_A);
      try {
        const rows = await db.query(`select code_hash from public.sso_authorization_codes`);
        assert.equal(rows.rows.length, 0);
      } catch (error) {
        const msg = String((error as { message?: string }).message ?? '');
        assert.ok(/permission denied|42501/i.test(msg));
      }
    });

    await t.test('identity_links: user sees only own row', async () => {
      await db.exec('reset role');
      await db.query(
        `insert into public.identity_links(psychology_user_id, mmpi_user_id, email) values ($1, $2, 'psy-a@test')`,
        [PSY_A, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'],
      );
      await asUser(PSY_A);
      const own = await db.query(`select psychology_user_id from public.identity_links`);
      assert.equal(own.rows.length, 1);
      await asUser(PSY_B);
      const other = await db.query(`select psychology_user_id from public.identity_links`);
      assert.equal(other.rows.length, 0);
    });

    await t.test('open MMPI administration unique per client', async () => {
      await asUser(PSY_A);
      await db.query(
        `insert into public.test_administrations(client_id, test_definition_id, organization_id, administration_date, status, created_by)
         values ($1,$2,$3, current_date, 'planned', $4)`,
        [CLIENT_A, MMPI_DEF, ORG_A, PSY_A],
      );
      await assert.rejects(
        db.query(
          `insert into public.test_administrations(client_id, test_definition_id, organization_id, administration_date, status, created_by)
           values ($1,$2,$3, current_date, 'planned', $4)`,
          [CLIENT_A, MMPI_DEF, ORG_A, PSY_A],
        ),
      );
    });

    await t.test('test_administrations insert created_by must be auth uid', async () => {
      await asUser(PSY_B);
      await assert.rejects(
        db.query(
          `insert into public.test_administrations(client_id, test_definition_id, organization_id, administration_date, status, created_by)
           values ($1,$2,$3, current_date, 'planned', $4)`,
          [CLIENT_A, MMPI_DEF, ORG_A, PSY_A],
        ),
      );
    });
  } finally {
    await db.close();
  }
});
