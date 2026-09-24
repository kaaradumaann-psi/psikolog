/** Real PostgreSQL (WASM) RLS/policies/triggers — MMPI reportDatabase.test.ts pattern */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ADMIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ORG_ADMIN_A = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PSY_A1 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PSY_A2 = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const PSY_B1 = '11111111-1111-4111-8111-111111111111';
const CLIENT_A1 = '22222222-2222-4222-8222-222222222222';
const CLIENT_B1 = '33333333-3333-4333-8333-333333333333';

test(
  'client database: migrations, org isolation, ownership, admin, audit, cascades',
  { timeout: 90000 },
  async (t) => {
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
      `);

      for (const f of readdirSync('supabase/migrations').sort()) {
        await db.exec(
          readFileSync(`supabase/migrations/${f}`, 'utf8').replace(
            'create extension if not exists pgcrypto;',
            '',
          ),
        );
      }

      // Create orgs
      await db.query(`insert into public.organizations(id, name) values ($1, 'Org A'), ($2, 'Org B')`, [
        ORG_A,
        ORG_B,
      ]);

      // Create auth users
      await db.query(
        `insert into auth.users(id,email) values 
          ($1,'admin@example.test'),
          ($2,'orgadmin-a@example.test'),
          ($3,'psy-a1@example.test'),
          ($4,'psy-a2@example.test'),
          ($5,'psy-b1@example.test')`,
        [ADMIN, ORG_ADMIN_A, PSY_A1, PSY_A2, PSY_B1],
      );

      // Update profiles to have org and roles
      await db.query(`update public.profiles set role='ADMIN', active=true where id=$1`, [ADMIN]);
      await db.query(`update public.profiles set role='ORG_ADMIN', organization_id=$2, active=true where id=$1`, [
        ORG_ADMIN_A,
        ORG_A,
      ]);
      await db.query(`update public.profiles set role='PSYCHOLOG', organization_id=$2, active=true where id=$1`, [
        PSY_A1,
        ORG_A,
      ]);
      await db.query(`update public.profiles set role='PSYCHOLOG', organization_id=$2, active=true where id=$1`, [
        PSY_A2,
        ORG_A,
      ]);
      await db.query(`update public.profiles set role='PSYCHOLOG', organization_id=$2, active=true where id=$1`, [
        PSY_B1,
        ORG_B,
      ]);

      async function asUser(id: string) {
        await db.exec('reset role');
        await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
        await db.exec('set role authenticated');
      }

      // Insert clients
      await db.query(
        `insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by) values ($1,$2,'F-001','Ali','Veli',$3)`,
        [CLIENT_A1, ORG_A, PSY_A1],
      );
      await db.query(
        `insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by) values ($1,$2,'F-001','Ayse','Fatma',$3)`,
        [CLIENT_B1, ORG_B, PSY_B1],
      );

      await t.test('org isolation: psy A cannot see org B clients', async () => {
        await asUser(PSY_A1);
        const rows = await db.query(`select id from public.clients`);
        assert.equal(rows.rows.length, 1);
        assert.equal((rows.rows[0] as { id: string }).id, CLIENT_A1);
      });

      await t.test('org isolation: psy B cannot see org A', async () => {
        await asUser(PSY_B1);
        const rows = await db.query(`select id from public.clients`);
        assert.equal(rows.rows.length, 1);
        assert.equal((rows.rows[0] as { id: string }).id, CLIENT_B1);
      });

      await t.test('admin sees all', async () => {
        await asUser(ADMIN);
        const rows = await db.query(`select id from public.clients order by id`);
        assert.equal(rows.rows.length, 2);
      });

      await t.test('org_admin sees own org only', async () => {
        await asUser(ORG_ADMIN_A);
        const rows = await db.query(`select id from public.clients`);
        assert.equal(rows.rows.length, 1);
        assert.equal((rows.rows[0] as { id: string }).id, CLIENT_A1);
      });

      await t.test('owner can update own client, other psy in same org cannot', async () => {
        await asUser(PSY_A1);
        const upd = await db.query(`update public.clients set first_name='Ali Güncel' where id=$1`, [
          CLIENT_A1,
        ]);
        assert.equal(upd.affectedRows, 1);

        await asUser(PSY_A2);
        const upd2 = await db.query(`update public.clients set first_name='Hack' where id=$1`, [CLIENT_A1]);
        assert.equal(upd2.affectedRows, 0);
      });

      await t.test('org_admin can update any client in own org', async () => {
        await asUser(ORG_ADMIN_A);
        const upd = await db.query(`update public.clients set first_name='OrgAdmin Güncel' where id=$1`, [
          CLIENT_A1,
        ]);
        assert.equal(upd.affectedRows, 1);
      });

      await t.test('IDOR: psy A cannot delete client B', async () => {
        await asUser(PSY_A1);
        const del = await db.query(`delete from public.clients where id=$1`, [CLIENT_B1]);
        assert.equal(del.affectedRows, 0);
      });

      await t.test('IDOR: anon cannot read (0 rows or permission denied)', async () => {
        await db.exec('reset role');
        await db.exec('set role anon');
        try {
          const rows = await db.query(`select id from public.clients`);
          // If grant allows but RLS denies, should be 0
          assert.equal(rows.rows.length, 0);
        } catch (e) {
          // PGlite throws 42501 if no table grant — also secure, treat as 0
          const msg = String((e as { message?: string }).message ?? '');
          assert.ok(
            /permission denied|42501/i.test(msg),
            `Expected permission denied or 0 rows, got: ${msg}`,
          );
        }
      });

      await t.test('file_number unique per org, not globally', async () => {
        await asUser(PSY_A1);
        await assert.rejects(
          db.query(
            `insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by) values (gen_random_uuid(), $1, 'F-001', 'Test', 'Test', $2)`,
            [ORG_A, PSY_A1],
          ),
          /duplicate|unique/,
        );
        await db.query(
          `insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by) values (gen_random_uuid(), $1, 'F-002', 'Test', 'Test', $2)`,
          [ORG_A, PSY_A1],
        );
      });

      await t.test('audit_logs written by trigger, admin can read', async () => {
        // Audit logs should be readable by admin and org_admin, not by psychologist
        await asUser(ADMIN);
        const logsAdmin = await db.query(`select * from public.audit_logs order by created_at desc`);
        assert.ok(logsAdmin.rows.length >= 1, 'Admin should see audit logs');

        await asUser(ORG_ADMIN_A);
        const logsOrgAdmin = await db.query(
          `select * from public.audit_logs where organization_id=$1`,
          [ORG_A],
        );
        assert.ok(logsOrgAdmin.rows.length >= 1, 'Org admin should see own org audit logs');

        await asUser(PSY_A1);
        const logsPsy = await db.query(`select * from public.audit_logs where organization_id=$1`, [ORG_A]);
        // Psy should not see audit logs (policy: admin or org_admin)
        assert.equal(logsPsy.rows.length, 0);

        // Client cannot insert audit_logs (revoked)
        await assert.rejects(
          db.query(
            `insert into public.audit_logs(organization_id, action, target_table) values ($1, 'client_insert', 'clients')`,
            [ORG_A],
          ),
          /permission|policy|not allowed|revoke|42501/i,
        );
      });

      await t.test('profiles cannot be updated directly (Edge Function only)', async () => {
        await asUser(PSY_A1);
        try {
          const upd = await db.query(`update public.profiles set first_name='Hacked' where id=$1`, [PSY_A1]);
          // No update policy → affectedRows 0
          assert.equal(upd.affectedRows, 0);
        } catch (e) {
          // Or permission denied (revoked) — also secure
          const msg = String((e as { message?: string }).message ?? '');
          assert.ok(/permission denied|42501|policy/i.test(msg), `Expected 0 or permission denied, got ${msg}`);
        }
      });

      await t.test('profiles org isolation: org_admin sees own org profiles', async () => {
        await asUser(ORG_ADMIN_A);
        const rows = await db.query(`select id from public.profiles where organization_id=$1`, [ORG_A]);
        // Should see org_admin + psy A1 + A2 (3) — admin not in org
        assert.ok(rows.rows.length >= 3);
      });
    } finally {
      await db.close();
    }
  },
);
