/** Real PostgreSQL (WASM) policies/triggers. No network or production database required. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  ADMIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const RA = '11111111-1111-4111-8111-111111111111',
  RB = '22222222-2222-4222-8222-222222222222';
const REPORT = '33333333-3333-4333-8333-333333333333';
const SYSTEM = '00000000-0000-4000-8000-000000000001';
test(
  'report database: migrations, ownership, admin, immutable history, atomic versioning and cascades',
  { timeout: 90000 },
  async (t) => {
    const db = new PGlite();
    try {
      await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;`);
      for (const f of readdirSync('supabase/migrations').sort()) {
        // gen_random_uuid is built into PostgreSQL; only unavailable optional extension declaration is removed.
        await db.exec(
          readFileSync(`supabase/migrations/${f}`, 'utf8').replace(
            'create extension if not exists pgcrypto;',
            '',
          ),
        );
      }
      await db.query(
        `insert into auth.users(id,email) values ($1,'a@example.test'),($2,'b@example.test'),($3,'admin@example.test')`,
        [A, B, ADMIN],
      );
      await db.query(`update public.profiles set role='ADMIN' where id=$1`, [ADMIN]);
      const payload = JSON.stringify([
        { kind: 'case-meta', version: 1, method: 'raw' },
        { kind: 'raw-scores', version: 1, scales: {} },
      ]);
      for (const [id, owner] of [
        [RA, A],
        [RB, B],
      ])
        await db.query(
          `insert into public.mmpi_records(id,idempotency_key,client_first_name,client_last_name,gender,age,occupation,education,application_date,requested_by,raw_omr_answers,created_by) values ($1,gen_random_uuid(),'Test','Danışan','Kadın',32,'Meslek','Lisans','2020-01-01','Test',$2,$3)`,
          [id, payload, owner],
        );
      async function asUser(id: string) {
        await db.exec('reset role');
        await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
        await db.exec('set role authenticated');
      }
      const insertReport = (id: string, recordId: string, owner: string) =>
        db.query(
          `insert into public.mmpi_reports(id,mmpi_record_id,created_by,template_id,template_name,title,content,source_data_snapshot,source_data_version) values ($1,$2,$3,$4,'Standard','Rapor','{"schemaVersion":1,"blocks":[]}','{"fields":{},"tables":{}}','test:1')`,
          [id, recordId, owner, SYSTEM],
        );
      await t.test('owner creates own report; creation also writes V1', async () => {
        await asUser(A);
        await insertReport(REPORT, RA, A);
        const r = await db.query(
          `select revision,version_number,status from public.mmpi_reports where id=$1`,
          [REPORT],
        );
        assert.deepEqual(r.rows[0], { revision: 1, version_number: 1, status: 'draft' });
        assert.equal((await db.query('select * from public.mmpi_report_versions')).rows.length, 1);
      });
      await t.test(
        'another psychologist cannot read, update, delete, link or impersonate owner',
        async () => {
          await asUser(B);
          assert.equal((await db.query('select * from public.mmpi_reports')).rows.length, 0);
          assert.equal((await db.query('select * from public.mmpi_report_versions')).rows.length, 0);
          assert.equal(
            (await db.query(`update public.mmpi_reports set title='attack' where id=$1`, [REPORT]))
              .affectedRows,
            0,
          );
          assert.equal(
            (await db.query(`delete from public.mmpi_reports where id=$1`, [REPORT])).affectedRows,
            0,
          );
          await assert.rejects(insertReport(crypto.randomUUID(), RA, B), /row-level security/);
          await assert.rejects(insertReport(crypto.randomUUID(), RB, A), /row-level security/);
        },
      );
      await t.test(
        'autosave revisions are sequential; stale revision does not overwrite; manual save makes V2',
        async () => {
          await asUser(A);
          await db.query(
            `update public.mmpi_reports set title='Edit',save_reason='autosave' where id=$1 and revision=1`,
            [REPORT],
          );
          assert.equal(
            (
              await db.query(`update public.mmpi_reports set title='Stale' where id=$1 and revision=1`, [
                REPORT,
              ])
            ).affectedRows,
            0,
          );
          assert.equal(
            (await db.query('select count(*)::int n from public.mmpi_report_versions')).rows[0].n,
            1,
          );
          await db.query(
            `update public.mmpi_reports set title='Manual',save_reason='manual' where id=$1 and revision=2`,
            [REPORT],
          );
          assert.deepEqual(
            (await db.query('select revision,version_number from public.mmpi_reports')).rows[0],
            { revision: 3, version_number: 2 },
          );
          assert.equal(
            (
              await db.query(
                `select snapshot->>'title' title from public.mmpi_report_versions where version_number=2`,
              )
            ).rows[0].title,
            'Manual',
          );
        },
      );
      await t.test('autosave after ten-minute gap creates a version; a fresh autosave does not', async () => {
        // Advance only the fixture timestamp as database owner, not an application capability.
        await db.exec('reset role; alter table public.mmpi_reports disable trigger prepare_mmpi_report;');
        await db.query(
          "update public.mmpi_reports set last_version_at=now()-interval '11 minutes' where id=$1",
          [REPORT],
        );
        await db.exec('alter table public.mmpi_reports enable trigger prepare_mmpi_report');
        await asUser(A);
        const before = (await db.query('select version_number from public.mmpi_reports')).rows[0]
          .version_number;
        await db.query("update public.mmpi_reports set save_reason='autosave' where id=$1", [REPORT]);
        assert.equal(
          (await db.query('select version_number from public.mmpi_reports')).rows[0].version_number,
          before + 1,
        );
        await db.query("update public.mmpi_reports set save_reason='autosave' where id=$1", [REPORT]);
        assert.equal(
          (await db.query('select version_number from public.mmpi_reports')).rows[0].version_number,
          before + 1,
        );
      });
      await t.test(
        'source record notes never change report snapshots; explicit refresh has historical provenance',
        async () => {
          await db.query("update public.mmpi_records set expert_notes='Yeni not' where id=$1", [RA]);
          assert.equal(
            (await db.query('select source_data_version from public.mmpi_reports')).rows[0]
              .source_data_version,
            'test:1',
          );
          await db.query(
            `update public.mmpi_reports set source_data_snapshot='{"fields":{"expertNotes":"Yeni not"},"tables":{}}',source_data_version='test:2',save_reason='refresh' where id=$1`,
            [REPORT],
          );
          const versions = await db.query(
            "select snapshot->>'source_data_version' version from public.mmpi_report_versions order by version_number",
          );
          assert.equal(versions.rows[0].version, 'test:1');
          assert.equal(versions.rows.at(-1).version, 'test:2');
        },
      );
      await t.test(
        'completion timestamps are server assigned; completed documents remain editable',
        async () => {
          await db.query(
            `update public.mmpi_reports set status='completed',save_reason='complete' where id=$1`,
            [REPORT],
          );
          const before = (await db.query('select completed_at from public.mmpi_reports')).rows[0]
            .completed_at;
          assert.ok(before);
          await db.query(
            `update public.mmpi_reports set title='Completed edit',save_reason='autosave' where id=$1`,
            [REPORT],
          );
          assert.deepEqual(
            (await db.query('select completed_at from public.mmpi_reports')).rows[0].completed_at,
            before,
          );
          await db.query(`update public.mmpi_reports set status='draft',save_reason='manual' where id=$1`, [
            REPORT,
          ]);
          assert.equal(
            (await db.query('select completed_at from public.mmpi_reports')).rows[0].completed_at,
            null,
          );
        },
      );
      await t.test(
        'history cannot be forged, rewritten or deleted and report ownership is immutable',
        async () => {
          await assert.rejects(
            db.query(`delete from public.mmpi_report_versions where report_id=$1`, [REPORT]),
            /permission denied/,
          );
          await assert.rejects(
            db.query(`update public.mmpi_report_versions set content='{}'`),
            /permission denied/,
          );
          await assert.rejects(
            db.query(
              `insert into public.mmpi_report_versions(report_id,version_number,content,snapshot,reason) values ($1,999,'{}','{}','attack')`,
              [REPORT],
            ),
            /permission denied/,
          );
          await assert.rejects(
            db.query(`update public.mmpi_reports set created_by=$1 where id=$2`, [B, REPORT]),
            /sahipliği/,
          );
          await assert.rejects(
            db.query(`update public.mmpi_reports set mmpi_record_id=$1 where id=$2`, [RB, REPORT]),
            /sahipliği/,
          );
        },
      );
      await t.test(
        'system template cannot be modified, even by admin; user templates/settings are private',
        async () => {
          assert.equal(
            (await db.query(`update public.mmpi_report_templates set name='attack' where id=$1`, [SYSTEM]))
              .affectedRows,
            0,
          );
          const tpl = crypto.randomUUID();
          await db.query(
            `insert into public.mmpi_report_templates(id,created_by,name,content) values($1,$2,'Mine','{}')`,
            [tpl, A],
          );
          await db.query(
            `insert into public.psychologist_report_settings(created_by,letterhead) values($1,'{"name":"Test Uzman"}')`,
            [A],
          );
          await asUser(B);
          assert.equal(
            (await db.query(`select * from public.mmpi_report_templates where id=$1`, [tpl])).rows.length,
            0,
          );
          assert.equal((await db.query('select * from public.psychologist_report_settings')).rows.length, 0);
          await assert.rejects(
            db.query(
              `insert into public.mmpi_report_templates(created_by,name,content,is_system) values(null,'Fake System','{}',true)`,
            ),
            /row-level security/,
          );
          await asUser(ADMIN);
          assert.equal(
            (await db.query(`delete from public.mmpi_report_templates where id=$1`, [SYSTEM])).affectedRows,
            0,
          );
          assert.equal(
            (
              await db.query(
                `update public.mmpi_report_templates set is_system=false,created_by=$1 where id=$2`,
                [ADMIN, SYSTEM],
              )
            ).affectedRows,
            0,
          );
        },
      );
      await t.test(
        'admin can review/update any report without changing clinical record payload',
        async () => {
          assert.equal((await db.query('select * from public.mmpi_reports')).rows.length, 1);
          assert.ok((await db.query('select * from public.mmpi_report_versions')).rows.length >= 3);
          assert.equal(
            (
              await db.query(
                `update public.mmpi_reports set title='Admin review',save_reason='manual' where id=$1`,
                [REPORT],
              )
            ).affectedRows,
            1,
          );
          assert.deepEqual(
            (await db.query(`select raw_omr_answers from public.mmpi_records where id=$1`, [RA])).rows[0]
              .raw_omr_answers,
            JSON.parse(payload),
          );
        },
      );
      await t.test('inactive users and anonymous callers cannot access reports', async () => {
        await db.exec('reset role');
        await db.query('update public.profiles set active=false where id=$1', [A]);
        await asUser(A);
        assert.equal((await db.query('select * from public.mmpi_reports')).rows.length, 0);
        await assert.rejects(insertReport(crypto.randomUUID(), RA, A), /row-level security/);
        await db.exec('reset role; set role anon');
        await assert.rejects(db.query('select * from public.mmpi_reports'), /permission denied/);
        await assert.rejects(db.query('select * from public.mmpi_report_versions'), /permission denied/);
      });
      await t.test('deletion cascades history but not the MMPI record', async () => {
        await asUser(ADMIN);
        await db.query('delete from public.mmpi_reports where id=$1', [REPORT]);
        assert.equal((await db.query('select * from public.mmpi_report_versions')).rows.length, 0);
        assert.equal((await db.query('select * from public.mmpi_records')).rows.length, 2);
      });
    } finally {
      await db.close();
    }
  },
);
