/**
 * P0.5 — isolation gaps that the P0 suite did not cover.
 *
 * `tests/cloudWorkflow.test.ts` already proves cross-psychologist SELECT/IDOR
 * for clients, anamneses, appointments, sessions, reports, notes, tasks and
 * documents. This file closes what was left open:
 *
 *   1. `test_results` IDOR by id (the P0 suite only listed administrations).
 *   2. `preserve_created_by()` — ownership cannot be reassigned by an upsert.
 *   3. `validate_session_appointment()` — a session cannot be linked to an
 *      appointment belonging to another organization or another client.
 *   4. Storage object isolation on INSERT / UPDATE / DELETE, not just SELECT.
 *   5. Storage isolation inside a SHARED organization. This phase found the
 *      object policies were still per-organization while table policies are
 *      per-psychologist, so a fellow org member could delete another
 *      psychologist's document binary; fixed by 20260925000001.
 *   6. `documents.created_by` (the schema has no `uploaded_by` column) really
 *      carries the owning psychologist.
 *
 * Real PostgreSQL (PGlite) + the real migrations; role switching mirrors
 * PostgREST. Nothing here is mocked.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDbPort, buildStoragePort, createAuthUser, createTestDatabase } from './helpers/pglitePort.ts';
import { createRepository } from '../src/clinical/cloud/repository.ts';
import type { Owner } from '../src/clinical/cloud/mapping.ts';
import type { Client, Appointment, BeckDepressionResult } from '../src/clinical/clinicalTypes.ts';
import type { PracticeDocument } from '../src/clinical/practiceStore.ts';
import { newUuid } from '../src/clinical/cloud/ids.ts';

const ELIF_DEMIR = 'dddddddd-dddd-4ddd-8ddd-dddddddddd01';
const MEHMET_KAYA = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee02';

function makeClient(id: string): Client {
  return {
    id,
    fileNumber: 'HK-2026-003',
    firstName: 'Elif',
    lastName: 'Yılmaz',
    birthDate: '1991-04-18',
    age: 35,
    gender: 'KADIN',
    phone: '', email: '', occupation: '', education: '', maritalStatus: '',
    emergencyContact: { name: '', phone: '', relation: '' },
    presentingComplaint: 'Yaygın kaygı.',
    medicalHistory: '', psychiatricHistory: '', medications: '', familyHistory: '',
    allergiesNotes: '', diagnoses: [], status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

test('P0.5: ownership, appointment link and storage objects resist tampering', { timeout: 120000 }, async (t) => {
  const session = await createTestDatabase();
  const db = buildDbPort(session);
  const storage = buildStoragePort(session);

  try {
    await createAuthUser(session, ELIF_DEMIR, 'elif.demir@example.test');
    await createAuthUser(session, MEHMET_KAYA, 'mehmet.kaya@example.test');

    /* ------------------------------------------------ Elif Demir's records */
    await session.asUser(ELIF_DEMIR);
    const elifOwner: Owner = { organizationId: '', userId: ELIF_DEMIR };
    const elif = createRepository({ db, storage, owner: elifOwner });
    const elifOrg = await elif.ensureOrganization();
    assert.ok(elifOrg);

    const clientId = newUuid();
    await elif.pushClient(makeClient(clientId));

    const appointmentId = newUuid();
    const appointment: Appointment = {
      id: appointmentId, clientId, clientName: 'Elif Yılmaz', date: '2026-09-21',
      time: '14:00', durationMinutes: 50, sessionType: 'İlk Görüşme',
      location: 'Klinik (Yüz Yüze)', status: 'scheduled', notes: '',
      fee: 1500, paymentStatus: 'pending', createdAt: new Date().toISOString(),
    };
    await elif.pushAppointment(appointment);

    const testId = newUuid();
    const bdi: BeckDepressionResult & { kind: 'bdi' } = {
      kind: 'bdi',
      id: testId,
      clientId,
      clientName: 'Elif Yılmaz',
      clientGender: 'KADIN',
      clientAge: 35,
      testDate: '2026-09-21',
      answers: Array.from({ length: 21 }, () => 1),
      totalScore: 21,
      severity: 'Hafif',
      cognitiveAffectiveScore: 12,
      somaticPerformanceScore: 9,
      suicideRisk: false,
      suicideItemScore: 0,
      clinicalInterpretation: 'Hafif düzey.',
      createdAt: new Date().toISOString(),
    };
    await elif.pushTest(bdi);

    const documentId = newUuid();
    const storedDoc: PracticeDocument = await elif.pushDocument({
      id: documentId,
      clientId,
      fileName: 'e2e-test-document.txt',
      mimeType: 'text/plain',
      sizeBytes: 10,
      description: 'P0.5 storage doğrulaması',
      dataUrl: 'data:text/plain;base64,' + Buffer.from('test dosya').toString('base64'),
      createdAt: new Date().toISOString(),
    });

    const testResultRowId = (await session.asSuperuser().then(() =>
      session.sql<{ id: string }>(
        `select id from public.test_results where test_administration_id = $1`, [testId],
      ),
    ))[0]!.id;
    await session.asUser(ELIF_DEMIR);

    /* ---------------------------------- 1 · test_results IDOR by id (§9) */
    await t.test('IDOR: test_results and test_administrations by id are refused', async () => {
      await session.asUser(MEHMET_KAYA);
      const byId = async (table: string, id: string) =>
        session.sql(`select id from public.${table} where id = $1`, [id]);

      assert.equal((await byId('test_administrations', testId)).length, 0, 'test_administration_id IDOR');
      assert.equal((await byId('test_results', testResultRowId)).length, 0, 'test_result_id IDOR');
      // A blanket read must be empty too, not just the targeted lookup.
      assert.equal((await session.sql(`select id from public.test_results`)).length, 0);
      assert.equal((await session.sql(`select id from public.test_administrations`)).length, 0);
      await session.asUser(ELIF_DEMIR);
    });

    /* ------------------------------- 2 · created_by cannot be reassigned */
    await t.test('preserve_created_by: ownership survives an update attempt', async () => {
      // Elif tries to hand her own client to Mehmet. The trigger restores the
      // original owner, so the record cannot be moved out of her view or into
      // someone else's.
      await session.sql(
        `update public.clients set created_by = $1, first_name = 'Devralındı' where id = $2`,
        [MEHMET_KAYA, clientId],
      );
      const row = (await session.sql<{ created_by: string; first_name: string }>(
        `select created_by, first_name from public.clients where id = $1`, [clientId],
      ))[0]!;
      assert.equal(row.created_by, ELIF_DEMIR, 'created_by must be pinned to the original owner');
      assert.equal(row.first_name, 'Devralındı', 'ordinary columns still update');

      // Mehmet must still not see it after the attempted transfer.
      await session.asUser(MEHMET_KAYA);
      assert.equal(
        (await session.sql(`select id from public.clients where id = $1`, [clientId])).length,
        0,
        'transferred record must not become visible to Mehmet',
      );
      await session.asUser(ELIF_DEMIR);
      // Restore for the later assertions.
      await session.sql(`update public.clients set first_name = 'Elif' where id = $1`, [clientId]);
    });

    /* ---------------- 3 · a session cannot borrow a foreign appointment */
    await t.test('validate_session_appointment rejects a cross-organization link', async () => {
      await session.asUser(MEHMET_KAYA);
      const mehmetOwner: Owner = { organizationId: '', userId: MEHMET_KAYA };
      const mehmet = createRepository({ db, storage, owner: mehmetOwner });
      const mehmetOrg = await mehmet.ensureOrganization();
      assert.notEqual(mehmetOrg, elifOrg, 'each psychologist gets their own organization');

      const foreignClientId = newUuid();
      await mehmet.pushClient(makeClient(foreignClientId));

      await assert.rejects(
        () =>
          session.sql(
            `insert into public.sessions
               (id, organization_id, created_by, client_id, appointment_id, session_number,
                date, start_time, duration, type, subjective)
             values ($1,$2,$3,$4,$5,1,$6,'14:00',50,'İlk Görüşme','x')`,
            [newUuid(), mehmetOrg, MEHMET_KAYA, foreignClientId, appointmentId, '2026-09-21'],
          ),
        /başka bir randevuya|row-level security|permission denied/i,
        'seans başka kurumun randevusuna bağlanamamalı',
      );
      await session.asUser(ELIF_DEMIR);
    });

    /* --------------------- 4 · storage objects: write side is isolated */
    await t.test('storage objects cannot be read, written or removed by another psychologist', async () => {
      assert.equal((await storage.objects()).length, 1, 'Elif has one object in her tenant path');
      assert.ok(storedDoc.filePath?.startsWith(`${elifOrg}/${clientId}/`), 'path is tenant scoped');
      assert.ok(storedDoc.filePath?.endsWith('e2e-test-document.txt'));

      await session.asUser(MEHMET_KAYA);

      // SELECT
      assert.equal(
        (await session.sql(`select name from storage.objects where bucket_id = 'client-documents'`)).length,
        0,
        'another psychologist must not list the object',
      );

      // INSERT into Elif's tenant path
      await assert.rejects(
        () =>
          session.sql(
            `insert into storage.objects(bucket_id, name, owner, metadata)
             values ('client-documents', $1, auth.uid(), '{}'::jsonb)`,
            [`${elifOrg}/${clientId}/plant.txt`],
          ),
        /row-level security|permission denied/i,
        'another psychologist must not write into Elif\'s tenant path',
      );

      // UPDATE / DELETE must not touch the row. `returning` is essential here:
      // without it a blocked statement and a successful one both report zero
      // rows, so the assertion would prove nothing.
      const updated = await session.sql(
        `update storage.objects set metadata = '{"tampered":true}'::jsonb
         where bucket_id = 'client-documents' and name = $1 returning name`,
        [storedDoc.filePath!],
      );
      assert.equal(updated.length, 0, 'cross-tenant object update must affect 0 rows');
      const deleted = await session.sql(
        `delete from storage.objects where bucket_id = 'client-documents' and name = $1 returning name`,
        [storedDoc.filePath!],
      );
      assert.equal(deleted.length, 0, 'cross-tenant object delete must affect 0 rows');

      await session.asSuperuser();
      const survivor = await session.sql<{ metadata: Record<string, unknown> }>(
        `select metadata from storage.objects where name = $1`, [storedDoc.filePath!],
      );
      assert.equal(survivor.length, 1, 'object still exists');
      assert.equal(survivor[0]!.metadata.tampered, undefined, 'object metadata untouched');
      await session.asUser(ELIF_DEMIR);
    });

    /* ---- 5 · storage isolation also holds inside a SHARED organization */
    await t.test('storage objects stay isolated even when two psychologists share an organization', async () => {
      // Table policies have been per-psychologist since P0 §6. Before
      // 20260925000001 the storage object policies were still per-ORGANIZATION,
      // so a fellow org member could read, tamper with and DELETE another
      // psychologist's document binary while the metadata row stayed hidden.
      // Measured before the fix: select -> 1 object visible, delete -> 1 row.
      await session.asSuperuser();
      await session.sql(`update public.profiles set organization_id = $1 where id = $2`, [elifOrg, MEHMET_KAYA]);

      await session.asUser(MEHMET_KAYA);
      assert.equal((await session.sql(`select id from public.clients`)).length, 0, 'client rows stay hidden');
      assert.equal((await session.sql(`select id from public.documents`)).length, 0, 'document rows stay hidden');
      assert.equal(
        (await session.sql(`select name from storage.objects where bucket_id = 'client-documents'`)).length,
        0,
        'object row must not be visible to a fellow org member',
      );
      assert.equal(
        (await session.sql(
          `update storage.objects set metadata = '{"tampered":true}'::jsonb
           where bucket_id = 'client-documents' and name = $1 returning name`,
          [storedDoc.filePath!],
        )).length,
        0,
        'fellow org member must not tamper with the object',
      );
      assert.equal(
        (await session.sql(
          `delete from storage.objects where bucket_id = 'client-documents' and name = $1 returning name`,
          [storedDoc.filePath!],
        )).length,
        0,
        'fellow org member must not delete the object',
      );

      // No regression for the owner: Elif must still see her own object.
      await session.asUser(ELIF_DEMIR);
      assert.equal(
        (await session.sql(`select name from storage.objects where bucket_id = 'client-documents'`)).length,
        1,
        'the owner must still be able to reach her own document',
      );
      assert.equal((await storage.objects()).length, 1);

      await session.asSuperuser();
      await session.sql(`update public.profiles set organization_id = null where id = $1`, [MEHMET_KAYA]);
      await session.asUser(ELIF_DEMIR);
    });

    /* ---------------------------- 6 · documents.created_by is the owner */
    await t.test('document metadata records who uploaded it', async () => {
      await session.asSuperuser();
      // NOTE: the schema has no `uploaded_by` column; the owning psychologist is
      // recorded in `created_by` (see 20260924000004_phase06_documents_notes.sql).
      const row = (await session.sql<{ created_by: string; client_id: string; file_name: string; file_path: string }>(
        `select created_by, client_id, file_name, file_path from public.documents where id = $1`,
        [documentId],
      ))[0]!;
      assert.equal(row.created_by, ELIF_DEMIR, 'uploaded_by equivalent is created_by');
      assert.equal(row.client_id, clientId);
      assert.equal(row.file_name, 'e2e-test-document.txt');
      assert.equal(row.file_path, storedDoc.filePath);
      await session.asUser(ELIF_DEMIR);
    });
  } finally {
    await session.close();
  }
});
