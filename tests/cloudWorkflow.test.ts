/**
 * P0 end-to-end clinical workflow against real PostgreSQL + real migrations.
 *
 * Scenario from the specification:
 *   PSİKOLOG A: Elif Demir
 *   PSİKOLOG B: Mehmet Kaya
 *   DANIŞAN:    Elif Yılmaz
 *
 * Elif Demir creates the full chain (client → anamnesis → appointment → session
 * → test result → report → note → task → document), then "logs out and back in"
 * and everything must come back from the database. Then Mehmet Kaya tries to
 * reach the same records, including direct IDOR by id. Nothing here is mocked:
 * statements run through PostgreSQL and the actual RLS policies.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDbPort, buildStoragePort, createAuthUser, createTestDatabase } from './helpers/pglitePort.ts';
import { createRepository } from '../src/clinical/cloud/repository.ts';
import type { Owner } from '../src/clinical/cloud/mapping.ts';
import type { Appointment, BeckDepressionResult, ClinicalReport, Client, SoapSession } from '../src/clinical/clinicalTypes.ts';
import type { PracticeDocument, PracticeNote, PracticeTask } from '../src/clinical/practiceStore.ts';
import { newUuid } from '../src/clinical/cloud/ids.ts';
import { rowToClient, rowToSession, rowToAppointment, toDateOnly } from '../src/clinical/cloud/mapping.ts';

const ELIF_DEMIR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';
const MEHMET_KAYA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02';

function makeClient(id: string): Client {
  return {
    id,
    fileNumber: 'HK-2026-001',
    firstName: 'Elif',
    lastName: 'Yılmaz',
    tcNumber: '12345678901',
    birthDate: '1991-04-18',
    age: 35,
    gender: 'KADIN',
    phone: '0532 000 00 00',
    email: 'elif.yilmaz@example.test',
    occupation: 'Öğretmen',
    education: 'Lisans',
    maritalStatus: 'Evli',
    emergencyContact: { name: 'Kerem Yılmaz', phone: '0533 000 00 00', relation: 'Eş' },
    presentingComplaint: 'Son üç aydır süren yaygın kaygı, uykuya dalmakta güçlük ve iş performansında düşüş.',
    medicalHistory: 'Tip 1 diyabet öyküsü, düzenli endokrinoloji takibi.',
    psychiatricHistory: '2019 yılında altı ay süreyle bireysel psikoterapi süreci.',
    medications: 'İnsülin analogu; psikiyatrik ilaç kullanmıyor.',
    familyHistory: 'Annede yaygın anksiyete bozukluğu tanısı.',
    allergiesNotes: 'Penisilin alerjisi.',
    diagnoses: ['F41.1 Yaygın Anksiyete Bozukluğu (ön tanı)'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

test('P0: clinical workflow persists to Postgres and survives re-login; cross-psychologist access is blocked', { timeout: 120000 }, async (t) => {
  const session = await createTestDatabase();
  const db = buildDbPort(session);
  const storage = buildStoragePort(session);

  try {
    await createAuthUser(session, ELIF_DEMIR, 'elif.demir@example.test');
    await createAuthUser(session, MEHMET_KAYA, 'mehmet.kaya@example.test');

    /* ---------------------------------------------------- 1 · Elif Demir */
    await session.asUser(ELIF_DEMIR);
    const elifOwner: Owner = { organizationId: '', userId: ELIF_DEMIR };
    const elif = createRepository({ db, storage, owner: elifOwner });

    const orgId = await elif.ensureOrganization();
    assert.ok(orgId, 'ensure_personal_organization should return a uuid');
    assert.equal(elifOwner.organizationId, orgId, 'owner should be updated in place');

    // Calling it again must not create a second organization.
    assert.equal(await elif.ensureOrganization(), orgId, 'organization must be idempotent');

    const clientId = newUuid();
    const client = makeClient(clientId);
    await elif.pushClient(client);

    const appointmentId = newUuid();
    const appointment: Appointment = {
      id: appointmentId,
      clientId,
      clientName: 'Elif Yılmaz',
      date: '2026-09-21',
      time: '14:00',
      durationMinutes: 50,
      sessionType: 'İlk Görüşme / Anamnez',
      location: 'Klinik (Yüz Yüze)',
      status: 'completed',
      notes: 'İlk görüşme; anamnez alındı.',
      fee: 1500,
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
    };
    await elif.pushAppointment(appointment);

    // Randevudan seans: appointment_id bağı korunmalı.
    const sessionId = newUuid();
    const soap: SoapSession = {
      id: sessionId,
      clientId,
      clientName: 'Elif Yılmaz',
      sessionNumber: 1,
      date: '2026-09-21',
      startTime: '14:00',
      durationMinutes: 50,
      sessionType: 'İlk Görüşme / Anamnez',
      subjective: 'Kaygısının iş görüşmeleri öncesi arttığını, geceleri zihnini durduramadığını aktardı.',
      objective: 'Göz teması kuruyor, konuşma hızı yer yer artıyor, duygulanım kaygılı.',
      assessment: 'Yaygın anksiyete belirtileri baskın; işlevsellik kısmen etkilenmiş. Risk yok.',
      plan: 'Bir sonraki seansta nefes ve gevşeme egzersizi; haftalık kaygı kaydı tutulacak.',
      riskLevel: 'low',
      riskNotes: 'Kendine zarar verme düşüncesi yok.',
      homework: 'Gün içinde kaygı anlarını not etmek.',
      fee: 1500,
      paymentStatus: 'paid',
      appointmentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await elif.pushSession(soap);

    const bdi: BeckDepressionResult & { kind: 'bdi' } = {
      kind: 'bdi',
      id: newUuid(),
      clientId,
      clientName: 'Elif Yılmaz',
      clientGender: 'KADIN',
      clientAge: 35,
      testDate: '2026-09-21',
      answers: Array.from({ length: 21 }, (_, index) => (index % 3)),
      totalScore: 21,
      severity: 'Hafif',
      cognitiveAffectiveScore: 13,
      somaticPerformanceScore: 8,
      suicideRisk: false,
      suicideItemScore: 0,
      clinicalInterpretation: 'Hafif düzeyde depresif belirti; tarama bandıdır, tanı değildir.',
      createdAt: new Date().toISOString(),
    };
    await elif.pushTest(bdi);

    const reportId = newUuid();
    const report: ClinicalReport = {
      id: reportId,
      clientId,
      clientName: 'Elif Yılmaz',
      clientGender: 'KADIN',
      clientAge: 35,
      reportType: 'comprehensive',
      reportTitle: 'Kapsamlı Psikolojik Değerlendirme Raporu',
      reportDate: '2026-09-21',
      evaluator: 'Uzm. Psk. Elif Demir',
      sections: [
        { id: 's1', title: '1. Başvuru nedeni', content: 'Yaygın kaygı ve uyku güçlüğü.' },
        { id: 's2', title: '2. Ölçek bulguları', content: 'BDI 21/63 (Hafif).' },
      ],
      recommendations: ['Haftalık bireysel psikoterapi', 'Gevşeme egzersizi'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await elif.pushReport(report, { schema: 1, origin: 'test', sessionCount: 1 });

    const noteId = newUuid();
    const note: PracticeNote = {
      id: noteId,
      clientId,
      content: 'Seans öncesi diyabet takibini hatırlat.',
      pinned: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await elif.pushNote(note);

    const taskId = newUuid();
    const task: PracticeTask = {
      id: taskId,
      clientId,
      clientName: 'Elif Yılmaz',
      title: 'GAD-7 uygula',
      description: 'İkinci seansta kısa tarama tekrarı.',
      dueDate: '2026-09-28',
      status: 'todo',
      priority: 'high',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await elif.pushTask(task);

    const documentId = newUuid();
    const document: PracticeDocument = {
      id: documentId,
      clientId,
      fileName: 'onam-formu.txt',
      mimeType: 'text/plain',
      sizeBytes: 24,
      description: 'Bilgilendirilmiş onam',
      dataUrl: 'data:text/plain;base64,' + Buffer.from('Bilgilendirilmiş onam').toString('base64'),
      createdAt: new Date().toISOString(),
    };
    const storedDocument = await elif.pushDocument(document);
    assert.ok(storedDocument.filePath?.startsWith(`${orgId}/${clientId}/`), 'storage path must be tenant scoped');

    /* ------------------------------------- 2 · Çıkış / giriş: veriler döner */
    await t.test('re-login returns every record from the database', async () => {
      await session.asSuperuser();
      await session.asUser(ELIF_DEMIR);
      const reopened = createRepository({ db, storage, owner: { organizationId: orgId, userId: ELIF_DEMIR } });
      const snapshot = await reopened.pullAll();

      assert.equal(snapshot.clients.length, 1);
      const pulled = snapshot.clients[0]!;
      assert.equal(pulled.first_name, 'Elif');
      assert.equal(pulled.last_name, 'Yılmaz');
      assert.equal(toDateOnly(pulled.birth_date), '1991-04-18');
      assert.equal(pulled.status, 'active');
      assert.deepEqual(pulled.profile_extra.diagnoses, client.diagnoses);

      // The mapped record must equal what the app had, field for field.
      const mapped = rowToClient(pulled, client);
      for (const field of [
        'fileNumber', 'firstName', 'lastName', 'birthDate', 'gender', 'phone', 'email',
        'occupation', 'education', 'maritalStatus', 'status', 'presentingComplaint',
        'medicalHistory', 'psychiatricHistory', 'medications', 'familyHistory',
        'allergiesNotes',
      ] as const) {
        assert.deepEqual(mapped[field], client[field], `clients.${field} round-trip`);
      }
      assert.deepEqual(mapped.diagnoses, client.diagnoses);
      assert.deepEqual(mapped.emergencyContact, client.emergencyContact);
      // T.C. kimlik numarası bilinçli olarak senkronize edilmez.
      assert.equal('tcNumber' in pulled, false, 'tcNumber must not be stored in the database');

      // Anamnez ayrı bir kayıt olarak dönmeli ve alanları korunmalı.
      assert.equal(snapshot.anamneses.length, 1);
      const anamnesis = snapshot.anamneses[0]!;
      assert.equal(anamnesis.client_id, clientId);
      assert.equal(anamnesis.reason, client.presentingComplaint);
      assert.equal(anamnesis.family_history, client.familyHistory);
      assert.equal(anamnesis.previous_assessments, client.psychiatricHistory);
      assert.match(anamnesis.personal_history ?? '', /Düzenli ilaçlar: İnsülin analogu/);

      assert.equal(snapshot.appointments.length, 1);
      const pulledAppointment = snapshot.appointments[0]!;
      assert.equal(pulledAppointment.status, 'completed');
      assert.equal(Number(pulledAppointment.fee), 1500);
      assert.equal(pulledAppointment.payment_status, 'paid');
      const mappedAppointment = rowToAppointment(pulledAppointment, appointment);
      assert.equal(mappedAppointment.date, '2026-09-21');
      assert.equal(mappedAppointment.time, '14:00');
      assert.equal(mappedAppointment.durationMinutes, 50);
      assert.equal(mappedAppointment.status, 'completed');
      assert.equal(mappedAppointment.paymentStatus, 'paid');

      assert.equal(snapshot.sessions.length, 1);
      const pulledSession = snapshot.sessions[0]!;
      assert.equal(pulledSession.appointment_id, appointmentId, 'appointment → session link must survive');
      assert.equal(pulledSession.session_number, 1);
      assert.equal(pulledSession.subjective, soap.subjective);
      assert.equal(pulledSession.assessment, soap.assessment);
      assert.equal(pulledSession.risk_level, 'low');
      assert.equal(pulledSession.homework, soap.homework);
      const mappedSession = rowToSession(pulledSession, soap);
      assert.equal(mappedSession.date, '2026-09-21');
      assert.equal(mappedSession.startTime, '14:00');
      assert.equal(mappedSession.appointmentId, appointmentId);
      assert.equal(mappedSession.riskLevel, 'low');

      assert.equal(snapshot.tests.length, 1);
      const { administration, result } = snapshot.tests[0]!;
      assert.equal(administration.client_id, clientId);
      assert.equal(administration.status, 'completed');
      assert.equal((result.result_data as { totalScore: number }).totalScore, 21);
      assert.deepEqual((result.result_data as { answers: number[] }).answers, bdi.answers);
      assert.equal((result.result_data as { severity: string }).severity, 'Hafif');

      assert.equal(snapshot.reports.length, 1);
      assert.equal(snapshot.reports[0]!.title, report.reportTitle);
      assert.equal(snapshot.reports[0]!.status, 'completed');
      assert.ok(snapshot.reports[0]!.completed_at, 'completed report must be timestamped');

      assert.equal(snapshot.notes.length, 1);
      assert.equal(snapshot.notes[0]!.is_pinned, true);
      assert.equal(snapshot.tasks.length, 1);
      assert.equal(toDateOnly(snapshot.tasks[0]!.due_date), '2026-09-28');
      assert.equal(snapshot.documents.length, 1);
      assert.equal(snapshot.documents[0]!.file_name, 'onam-formu.txt');
    });

    /* ---------------------------------------- 3 · Mehmet Kaya erişememeli */
    await t.test('another psychologist cannot see or reach the records', async () => {
      await session.asUser(MEHMET_KAYA);
      const mehmetOwner: Owner = { organizationId: '', userId: MEHMET_KAYA };
      const mehmet = createRepository({ db, storage, owner: mehmetOwner });
      const mehmetOrg = await mehmet.ensureOrganization();
      assert.notEqual(mehmetOrg, orgId, 'each psychologist gets their own organization');

      const snapshot = await mehmet.pullAll();
      assert.equal(snapshot.clients.length, 0);
      assert.equal(snapshot.anamneses.length, 0);
      assert.equal(snapshot.appointments.length, 0);
      assert.equal(snapshot.sessions.length, 0);
      assert.equal(snapshot.tests.length, 0);
      assert.equal(snapshot.reports.length, 0);
      assert.equal(snapshot.notes.length, 0);
      assert.equal(snapshot.tasks.length, 0);
      assert.equal(snapshot.documents.length, 0);
    });

    await t.test('IDOR: direct access by foreign id is refused', async () => {
      await session.asUser(MEHMET_KAYA);

      const byId = async (table: string, id: string) =>
        session.sql(`select id from public.${table} where id = $1`, [id]);

      assert.equal((await byId('clients', clientId)).length, 0, 'client_id IDOR');
      assert.equal((await byId('sessions', sessionId)).length, 0, 'session_id IDOR');
      assert.equal((await byId('appointments', appointmentId)).length, 0, 'appointment_id IDOR');
      assert.equal((await byId('reports', reportId)).length, 0, 'report_id IDOR');
      assert.equal((await byId('notes', noteId)).length, 0, 'note_id IDOR');
      assert.equal((await byId('tasks', taskId)).length, 0, 'task_id IDOR');
      assert.equal((await byId('documents', documentId)).length, 0, 'document_id IDOR');

      const anamnesisId = await session.asSuperuser().then(() =>
        session.sql<{ id: string }>(`select id from public.anamneses where client_id = $1`, [clientId]),
      );
      assert.equal(anamnesisId.length, 1);
      await session.asUser(MEHMET_KAYA);
      assert.equal((await byId('anamneses', anamnesisId[0]!.id)).length, 0, 'anamnesis_id IDOR');

      // Writes and deletes must not silently succeed either.
      const updated = await session.sql(`update public.clients set first_name = 'Sızma' where id = $1 returning id`, [clientId]);
      assert.equal(updated.length, 0, 'cross-tenant update must affect 0 rows');
      const deleted = await session.sql(`delete from public.clients where id = $1 returning id`, [clientId]);
      assert.equal(deleted.length, 0, 'cross-tenant delete must affect 0 rows');

      // Storage object is not readable through the bucket policy either.
      const objects = await session.sql(
        `select name from storage.objects where bucket_id = 'client-documents'`,
      );
      assert.equal(objects.length, 0, 'private bucket must be tenant isolated');
    });

    /* -------------------------------------------- 4 · Anon ve audit log */
    await t.test('anonymous access returns nothing', async () => {
      await session.asAnon();
      // anon has no table grant at all, so the read is refused outright.
      await assert.rejects(() => session.sql(`select id from public.clients`), /permission denied/i);
    });

    await t.test('audit log is append-only for clients of the API', async () => {
      await session.asSuperuser();
      const logRows = await session.sql<{ action: string }>(`select action from public.audit_logs order by created_at`);
      assert.ok(logRows.length > 0, 'triggers should have written audit rows');
      assert.ok(logRows.some((row) => row.action === 'client_insert'), 'client insert audited');
      assert.ok(logRows.some((row) => row.action === 'session_insert'), 'session insert audited');

      await session.asUser(ELIF_DEMIR);
      await assert.rejects(
        () => session.sql(`update public.audit_logs set action = 'client_update'`),
        /permission denied/i,
        'authenticated users must not update the audit log',
      );
      await assert.rejects(
        () => session.sql(`delete from public.audit_logs`),
        /permission denied/i,
        'authenticated users must not delete the audit log',
      );
    });
  } finally {
    await session.asSuperuser();
    await session.close();
  }
});
