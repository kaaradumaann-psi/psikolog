/**
 * P0.7 — migration safety, the part of `supabase db push` that can be verified
 * without a live project.
 *
 * A live push carries two risks that PGlite can reproduce exactly:
 *   1. a new migration runs against a database that already holds production
 *      data — the data must survive;
 *   2. a push is retried — the migrations must be re-runnable.
 *
 * Also covers §18 of the P0.7 scope: `documents.file_path` must match
 * `storage.objects.name`, and deleting a document must clean up both sides.
 *
 * Real PostgreSQL (PGlite) running the real migration files in order.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDbPort, buildStoragePort, createAuthUser, createTestDatabase } from './helpers/pglitePort.ts';
import { createRepository } from '../src/clinical/cloud/repository.ts';
import { newUuid } from '../src/clinical/cloud/ids.ts';
import type { Client } from '../src/clinical/clinicalTypes.ts';
import type { PracticeDocument, PracticeNote } from '../src/clinical/practiceStore.ts';

const ELIF_DEMIR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11';
const LAST_MIGRATION = '20260925000002_p0_6_formulation_safety.sql';
const PREVIOUS_MIGRATION = '20260925000001_p0_5_storage_object_isolation.sql';

function makeClient(id: string): Client {
  return {
    id,
    fileNumber: 'HK-2026-005',
    firstName: 'Elif',
    lastName: 'Yılmaz',
    birthDate: '1991-04-18',
    age: 35,
    gender: 'KADIN',
    phone: '', email: '', occupation: '', education: '', maritalStatus: '',
    emergencyContact: { name: '', phone: '', relation: '' },
    presentingComplaint: 'Yaygın kaygı.',
    medicalHistory: 'Tip 1 diyabet.',
    psychiatricHistory: '', medications: 'İnsülin.', familyHistory: '',
    allergiesNotes: '', diagnoses: ['F41.1'], status: 'followup',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

test('P0.7: applying the new migration over existing data loses nothing', { timeout: 180000 }, async (t) => {
  // Start from the schema as it was BEFORE P0.6, with data already in it.
  const session = await createTestDatabase({ upToMigration: PREVIOUS_MIGRATION });
  try {
    assert.deepEqual(
      session.appliedMigrations().slice(-1),
      [PREVIOUS_MIGRATION],
      'the database starts one migration behind',
    );
    const tables = await session.sql<{ n: string }>(
      `select count(*)::text as n from information_schema.tables
       where table_schema = 'public' and table_name in ('formulations','safety_plans')`,
    );
    assert.equal(tables[0]!.n, '0', 'the P0.6 tables do not exist yet');

    await createAuthUser(session, ELIF_DEMIR, 'elif.demir@example.test');
    await session.asUser(ELIF_DEMIR);

    const db = buildDbPort(session);
    const storage = buildStoragePort(session);
    const repo = createRepository({ db, storage, owner: { organizationId: '', userId: ELIF_DEMIR } });
    const orgId = await repo.ensureOrganization();

    // Pre-existing production-style data.
    const clientId = newUuid();
    await repo.pushClient(makeClient(clientId));
    const noteId = newUuid();
    const note: PracticeNote = {
      id: noteId, clientId, content: 'Mevcut not — migration öncesi.', pinned: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await repo.pushNote(note);
    const documentId = newUuid();
    const doc: PracticeDocument = {
      id: documentId, clientId, fileName: 'mevcut-onam.txt', mimeType: 'text/plain',
      sizeBytes: 10, description: 'Migration öncesi belge',
      dataUrl: 'data:text/plain;base64,' + Buffer.from('Mevcut onam').toString('base64'),
      createdAt: new Date().toISOString(),
    };
    const stored = await repo.pushDocument(doc);
    assert.ok(stored.filePath);

    const before = {
      clients: (await session.sql<{ n: string }>(`select count(*)::text n from public.clients`))[0]!.n,
      anamneses: (await session.sql<{ n: string }>(`select count(*)::text n from public.anamneses`))[0]!.n,
      notes: (await session.sql<{ n: string }>(`select count(*)::text n from public.notes`))[0]!.n,
      documents: (await session.sql<{ n: string }>(`select count(*)::text n from public.documents`))[0]!.n,
      objects: (await storage.objects()).length,
    };
    assert.deepEqual(before, { clients: '1', anamneses: '1', notes: '1', documents: '1', objects: 1 });

    /* ------------------------------------------------ the push itself */
    await t.test('db push applies the pending migration without touching existing rows', async () => {
      // `db push` connects as the migration owner, never as an authenticated
      // JWT role — DDL as `authenticated` fails with "permission denied for
      // schema public", which is the correct behaviour.
      await session.asSuperuser();
      await session.applyRemainingMigrations();
      assert.deepEqual(session.appliedMigrations().slice(-1), [LAST_MIGRATION]);
      await session.asUser(ELIF_DEMIR);

      const after = {
        clients: (await session.sql<{ n: string }>(`select count(*)::text n from public.clients`))[0]!.n,
        anamneses: (await session.sql<{ n: string }>(`select count(*)::text n from public.anamneses`))[0]!.n,
        notes: (await session.sql<{ n: string }>(`select count(*)::text n from public.notes`))[0]!.n,
        documents: (await session.sql<{ n: string }>(`select count(*)::text n from public.documents`))[0]!.n,
        objects: (await storage.objects()).length,
      };
      assert.deepEqual(after, before, 'no existing row or object was lost');

      const client = (await session.sql<{ first_name: string; status: string; profile_extra: unknown }>(
        `select first_name, status, profile_extra from public.clients`,
      ))[0]!;
      assert.equal(client.first_name, 'Elif');
      assert.equal(client.status, 'followup', 'P0 status extension survived');
      assert.deepEqual((client.profile_extra as { diagnoses: string[] }).diagnoses, ['F41.1']);

      const noteRow = (await session.sql<{ content: string; is_pinned: boolean }>(
        `select content, is_pinned from public.notes`,
      ))[0]!;
      assert.equal(noteRow.content, 'Mevcut not — migration öncesi.');
      assert.equal(noteRow.is_pinned, true);

      // The new tables exist, with RLS on from the first moment.
      const rls = await session.sql<{ table_name: string; relrowsecurity: boolean }>(
        `select c.relname as table_name, c.relrowsecurity
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relname in ('formulations','safety_plans')
         order by c.relname`,
      );
      assert.equal(rls.length, 2);
      for (const row of rls) assert.equal(row.relrowsecurity, true, `${row.table_name} must have RLS enabled`);

      // Existing RLS was not weakened by the push.
      const policies = await session.sql<{ n: string }>(
        `select count(*)::text as n from pg_policies
         where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_select'`,
      );
      assert.equal(policies[0]!.n, '1');
      const selectPolicy = await session.sql<{ qual: string }>(
        `select qual from pg_policies where schemaname='public' and policyname='clients_select'`,
      );
      assert.match(selectPolicy[0]!.qual, /created_by = auth\.uid\(\)/, 'P0 §6 ownership clause intact');
    });

    /* -------------------------------------------- a retried push must be safe */
    await t.test('re-running the migrations does not fail or duplicate anything', async () => {
      await session.asSuperuser();
      for (const file of [
        '20260925000000_p0_clinical_workflow.sql',
        PREVIOUS_MIGRATION,
        LAST_MIGRATION,
      ]) {
        await session.reapplyMigration(file);
      }
      await session.asUser(ELIF_DEMIR);

      const counts = {
        clients: (await session.sql<{ n: string }>(`select count(*)::text n from public.clients`))[0]!.n,
        notes: (await session.sql<{ n: string }>(`select count(*)::text n from public.notes`))[0]!.n,
        documents: (await session.sql<{ n: string }>(`select count(*)::text n from public.documents`))[0]!.n,
        policies: (await session.sql<{ n: string }>(
          `select count(*)::text n from pg_policies where schemaname='public'`,
        ))[0]!.n,
      };
      assert.equal(counts.clients, '1');
      assert.equal(counts.notes, '1');
      assert.equal(counts.documents, '1');
      // Policies are dropped-then-created, so a second pass must not pile them up.
      const dupes = await session.sql<{ policyname: string; n: string }>(
        `select policyname, count(*)::text as n from pg_policies
         where schemaname in ('public','storage') group by policyname having count(*) > 1`,
      );
      assert.deepEqual(dupes, [], `duplicate policies after re-push: ${JSON.stringify(dupes)}`);
      assert.ok(Number(counts.policies) > 0);
    });

    /* ---------------------------------- §18 file_path ↔ storage object match */
    await t.test('documents.file_path matches storage.objects.name', async () => {
      const row = (await session.sql<{ file_path: string; file_name: string; created_by: string }>(
        `select file_path, file_name, created_by from public.documents where id = $1`, [documentId],
      ))[0]!;
      assert.equal(row.file_path, stored.filePath);
      assert.equal(row.file_name, 'mevcut-onam.txt');
      assert.equal(row.created_by, ELIF_DEMIR);

      const objects = await session.sql<{ name: string; bucket_id: string }>(
        `select name, bucket_id from storage.objects`,
      );
      assert.equal(objects.length, 1);
      assert.equal(objects[0]!.name, row.file_path, 'metadata and object agree');
      assert.equal(objects[0]!.bucket_id, 'client-documents');
    });

    /* ------------------------------------------- §18 delete cleans up both */
    await t.test('deleting a document removes the metadata row and the object', async () => {
      await session.asUser(ELIF_DEMIR);
      await repo.deleteDocument({ ...doc, filePath: stored.filePath });

      assert.equal((await session.sql(`select id from public.documents`)).length, 0, 'metadata row gone');
      assert.equal((await storage.objects()).length, 0, 'object gone');
      // The client itself is untouched.
      assert.equal((await session.sql(`select id from public.clients`)).length, 1);
    });

    void orgId;
  } finally {
    await session.close();
  }
});
