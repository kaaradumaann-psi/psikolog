import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

/**
 * Negative security tests — IDOR, anon, role escalation, wrong IDs
 * MMPI pattern: User A → User B patient, org B, anon, expired, wrong IDs
 */

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ADMIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PSY_A = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PSY_B = '11111111-1111-4111-8111-111111111111';
const CLIENT_A = '22222222-2222-4222-8222-222222222222';
const CLIENT_B = '33333333-3333-4333-8333-333333333333';
const WRONG_ID = '99999999-9999-4999-8999-999999999999';

test('security: IDOR and role escalation', { timeout: 90000 }, async (t) => {
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

    await db.query(`insert into public.organizations(id, name) values ($1, 'Org A'), ($2, 'Org B')`, [
      ORG_A,
      ORG_B,
    ]);
    await db.query(
      `insert into auth.users(id,email) values ($1,'admin@test'), ($2,'psy-a@test'), ($3,'psy-b@test')`,
      [ADMIN, PSY_A, PSY_B],
    );
    await db.query(`update public.profiles set role='ADMIN', active=true where id=$1`, [ADMIN]);
    await db.query(`update public.profiles set role='PSYCHOLOG', organization_id=$2, active=true where id=$1`, [
      PSY_A,
      ORG_A,
    ]);
    await db.query(`update public.profiles set role='PSYCHOLOG', organization_id=$2, active=true where id=$1`, [
      PSY_B,
      ORG_B,
    ]);

    await db.query(
      `insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by) values ($1,$2,'F-001','Ali','Veli',$3)`,
      [CLIENT_A, ORG_A, PSY_A],
    );
    await db.query(
      `insert into public.clients(id, organization_id, file_number, first_name, last_name, created_by) values ($1,$2,'F-001','Ayse','Fatma',$3)`,
      [CLIENT_B, ORG_B, PSY_B],
    );

    async function asUser(id: string) {
      await db.exec('reset role');
      await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
      await db.exec('set role authenticated');
    }

    await t.test('User A cannot read User B client (IDOR)', async () => {
      await asUser(PSY_A);
      const rows = await db.query(`select id from public.clients where id=$1`, [CLIENT_B]);
      assert.equal(rows.rows.length, 0);
    });

    await t.test('User A cannot read org B (tenant isolation)', async () => {
      await asUser(PSY_A);
      const rows = await db.query(`select id from public.clients where organization_id=$1`, [ORG_B]);
      assert.equal(rows.rows.length, 0);
    });

    await t.test('Wrong client ID returns 0 not error', async () => {
      await asUser(PSY_A);
      const rows = await db.query(`select id from public.clients where id=$1`, [WRONG_ID]);
      assert.equal(rows.rows.length, 0);
    });

    await t.test('Wrong file_number does not leak', async () => {
      await asUser(PSY_A);
      const rows = await db.query(`select id from public.clients where file_number=$1`, [
        'F-2099-XXXX',
      ]);
      assert.equal(rows.rows.length, 0);
    });

    await t.test('Anonymous cannot read private clients', async () => {
      await db.exec('reset role');
      await db.exec('set role anon');
      try {
        const rows = await db.query(`select id from public.clients`);
        assert.equal(rows.rows.length, 0);
      } catch (e) {
        const msg = String((e as { message?: string }).message ?? '');
        assert.ok(/permission denied|42501/i.test(msg));
      }
    });

    await t.test('Expired session (no jwt) cannot read', async () => {
      await db.exec('reset role');
      await db.exec(`select set_config('request.jwt.claim.sub','',false)`);
      await db.exec('set role authenticated');
      const rows = await db.query(`select id from public.clients`);
      // No uid → is_org_member false → 0 rows
      assert.equal(rows.rows.length, 0);
    });

    await t.test('Role escalation: PSYCHOLOG cannot update profiles', async () => {
      await asUser(PSY_A);
      try {
        const upd = await db.query(`update public.profiles set role='ADMIN' where id=$1`, [PSY_A]);
        assert.equal(upd.affectedRows, 0);
      } catch (e) {
        const msg = String((e as { message?: string }).message ?? '');
        assert.ok(/permission denied|42501|policy/i.test(msg));
      }
    });

    await t.test('Role escalation: PSYCHOLOG cannot insert organization', async () => {
      await asUser(PSY_A);
      // Org insert only admin — should be 0 or permission denied
      try {
        const ins = await db.query(
          `insert into public.organizations(id, name) values (gen_random_uuid(), 'Hack Org') returning id`,
        );
        // If RLS denies, affectedRows 0 or no rows
        assert.equal(ins.rows.length, 0);
      } catch (e) {
        const msg = String((e as { message?: string }).message ?? '');
        assert.ok(/permission|policy|42501|42501/i.test(msg) || msg.includes('row-level security'));
      }
    });

    await t.test('PSYCHOLOG cannot read audit_logs', async () => {
      await asUser(PSY_A);
      const rows = await db.query(`select id from public.audit_logs`);
      assert.equal(rows.rows.length, 0);
    });

    await t.test('Admin can read all audit_logs', async () => {
      await asUser(ADMIN);
      const rows = await db.query(`select id from public.audit_logs`);
      assert.ok(rows.rows.length >= 1);
    });
  } finally {
    await db.close();
  }
});
