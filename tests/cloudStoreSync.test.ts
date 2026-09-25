/**
 * Store ↔ cloud integration.
 *
 * Proves the path a psychologist actually walks: the same store functions the
 * screens call (`saveClient`, `saveSoapSession`, …) write through to PostgreSQL,
 * and that clearing the device and pulling again restores the data. This is the
 * "sayfayı yeniledikten sonra veri hâlâ görünmeli" requirement.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDbPort, buildStoragePort, createAuthUser, createTestDatabase } from './helpers/pglitePort.ts';
import { configureCloudSync, disableCloudSync, ensureOrganization, flushWrites, pullSnapshot } from '../src/clinical/cloud/sync.ts';
import { newUuid } from '../src/clinical/cloud/ids.ts';
import {
  applyClinicalCloudSnapshot,
  deleteClient,
  getAppointments,
  getBeckDepressionTests,
  getClients,
  getSoapSessions,
  saveAppointment,
  saveBeckDepressionTest,
  saveClient,
  saveSoapSession,
} from '../src/clinical/clinicalStore.ts';
import {
  applyCloudPracticeSnapshot,
  getDocuments,
  getNotes,
  getTasks,
  getScreenings,
  saveDocument,
  saveNote,
  saveScreening,
  saveTask,
} from '../src/clinical/practiceStore.ts';

const ELIF_DEMIR = 'cccccccc-cccc-4ccc-8ccc-cccccccccc03';

test('P0: store writes reach Postgres and a cleared device is restored by pulling', { timeout: 120000 }, async (t) => {
  const storageMap = new Map<string, string>();
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  Object.assign(globalThis, {
    // Prototype-chained to globalThis so libraries reading `window.<global>`
    // (encodeURIComponent, TextEncoder, …) keep working inside the stub.
    window: Object.assign(Object.create(globalThis) as Record<string, unknown>, {
      location: { pathname: '/', search: '', hash: '' },
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
    localStorage: {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, value: string) => { storageMap.set(key, value); },
      removeItem: (key: string) => { storageMap.delete(key); },
    },
  });

  const session = await createTestDatabase();
  try {
    await createAuthUser(session, ELIF_DEMIR, 'elif.demir@example.test');
    await session.asUser(ELIF_DEMIR);

    const db = buildDbPort(session);
    const storage = buildStoragePort(session);
    configureCloudSync({ db, storage, owner: { organizationId: '', userId: ELIF_DEMIR } });
    const orgId = await ensureOrganization();
    assert.ok(orgId);

    /* ------------------------------------------- 1 · UI çağrıları buluta yazar */
    const clientId = newUuid();
    saveClient({
      id: clientId,
      fileNumber: 'HK-2026-002',
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
      presentingComplaint: 'Yaygın kaygı ve uyku güçlüğü.',
      medicalHistory: 'Tip 1 diyabet.',
      psychiatricHistory: '2019 yılında bireysel psikoterapi.',
      medications: 'İnsülin analogu.',
      familyHistory: 'Annede anksiyete bozukluğu.',
      allergiesNotes: 'Penisilin alerjisi.',
      diagnoses: ['F41.1'],
      status: 'followup',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const appointmentId = newUuid();
    saveAppointment({
      id: appointmentId,
      clientId,
      clientName: 'Elif Yılmaz',
      date: '2026-09-22',
      time: '15:00',
      durationMinutes: 50,
      sessionType: 'Takip Seansı',
      location: 'Online (Görüntülü)',
      status: 'scheduled',
      notes: 'Online takip.',
      fee: 1500,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
    });

    const sessionId = newUuid();
    saveSoapSession({
      id: sessionId,
      clientId,
      clientName: 'Elif Yılmaz',
      sessionNumber: 2,
      date: '2026-09-22',
      startTime: '15:00',
      durationMinutes: 50,
      sessionType: 'Takip Seansı',
      subjective: 'Kaygısında kısmi azalma bildirdi.',
      objective: 'Duygulanım daha dengeli.',
      assessment: 'Belirti şiddeti azalıyor.',
      plan: 'Gevşeme egzersizine devam.',
      riskLevel: 'none',
      homework: 'Nefes egzersizi',
      fee: 1500,
      paymentStatus: 'paid',
      appointmentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    saveBeckDepressionTest({
      id: newUuid(),
      clientId,
      clientName: 'Elif Yılmaz',
      clientGender: 'KADIN',
      clientAge: 35,
      testDate: '2026-09-22',
      answers: Array.from({ length: 21 }, () => 0),
      totalScore: 0,
      severity: 'Minimal',
      cognitiveAffectiveScore: 0,
      somaticPerformanceScore: 0,
      suicideRisk: false,
      suicideItemScore: 0,
      clinicalInterpretation: 'Minimal düzey; tarama bandıdır.',
      createdAt: new Date().toISOString(),
    });

    const noteId = newUuid();
    saveNote({
      id: noteId,
      clientId,
      content: 'Seans öncesi diyabet takibini sor.',
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const taskId = newUuid();
    saveTask({
      id: taskId,
      clientId,
      clientName: 'Elif Yılmaz',
      title: 'GAD-7 tekrarı',
      description: 'Üçüncü seansta',
      dueDate: '2026-10-05',
      status: 'todo',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const documentId = newUuid();
    saveDocument({
      id: documentId,
      clientId,
      fileName: 'onam.txt',
      mimeType: 'text/plain',
      sizeBytes: 12,
      description: 'Onam',
      dataUrl: 'data:text/plain;base64,' + Buffer.from('Onam formu').toString('base64'),
      createdAt: new Date().toISOString(),
    });

    // Rapid screenings (GAD-7 / PHQ-9) travel the same two-row path as the
    // long instruments: one administration plus one result.
    const gad7Id = newUuid();
    saveScreening({
      id: gad7Id,
      type: 'gad7',
      clientId,
      clientName: 'Elif Yılmaz',
      testDate: '2026-09-22',
      answers: [1, 1, 0, 1, 0, 0, 0],
      totalScore: 3,
      severity: 'Minimal',
      suicideRisk: false,
      clinicalNote: 'Tarama bandı; izlem.',
      createdAt: new Date().toISOString(),
    });

    await flushWrites();

    await t.test('every store write landed in the database', async () => {
      const count = async (table: string) =>
        (await session.sql<{ n: string }>(`select count(*)::text as n from public.${table}`))[0]!.n;

      assert.equal(await count('clients'), '1');
      assert.equal(await count('anamneses'), '1');
      assert.equal(await count('appointments'), '1');
      assert.equal(await count('sessions'), '1');
      assert.equal(await count('test_administrations'), '2', 'BDI + GAD-7');
      assert.equal(await count('test_results'), '2', 'BDI + GAD-7');
      assert.equal(await count('notes'), '1');
      assert.equal(await count('tasks'), '1');
      assert.equal(await count('documents'), '1');
      assert.equal((await storage.objects()).length, 1, 'binary must be in the private bucket');

      const clientRow = (await session.sql<{ status: string; profile_extra: Record<string, unknown> }>(
        `select status, profile_extra from public.clients`,
      ))[0]!;
      assert.equal(clientRow.status, 'followup', 'the extended status must be accepted');
      assert.deepEqual(clientRow.profile_extra.diagnoses, ['F41.1']);
    });

    /* ------------------------------- 2 · Cihazı sıfırla, çek, veriler geri gelsin */
    await t.test('a cleared device is restored from the database', async () => {
      storageMap.clear();
      assert.equal(getClients().length, 0, 'device cache really is empty');

      const snapshot = await pullSnapshot();
      applyClinicalCloudSnapshot(snapshot);
      applyCloudPracticeSnapshot({
        documents: snapshot.documents,
        notes: snapshot.notes,
        tasks: snapshot.tasks,
        screenings: snapshot.tests.filter((entry) => {
          const kind = (entry.result.result_data as { kind?: string } | null)?.kind;
          return kind === 'gad7' || kind === 'phq9';
        }),
        formulations: snapshot.formulations,
        safetyPlans: snapshot.safetyPlans,
      });

      const clients = getClients();
      assert.equal(clients.length, 1);
      assert.equal(clients[0]!.firstName, 'Elif');
      assert.equal(clients[0]!.lastName, 'Yılmaz');
      assert.equal(clients[0]!.birthDate, '1991-04-18');
      assert.equal(clients[0]!.status, 'followup');
      assert.deepEqual(clients[0]!.diagnoses, ['F41.1']);
      // Anamnez kendi tablosundan dosyaya geri yazıldı.
      assert.equal(clients[0]!.presentingComplaint, 'Yaygın kaygı ve uyku güçlüğü.');
      assert.equal(clients[0]!.medications, 'İnsülin analogu.');
      assert.equal(clients[0]!.familyHistory, 'Annede anksiyete bozukluğu.');
      // T.C. kimlik numarası bulutta tutulmadığı için yeni cihazda boş gelir.
      assert.equal(clients[0]!.tcNumber, undefined);

      const appointments = getAppointments();
      assert.equal(appointments.length, 1);
      assert.equal(appointments[0]!.date, '2026-09-22');
      assert.equal(appointments[0]!.time, '15:00');
      assert.equal(appointments[0]!.paymentStatus, 'pending');

      const sessions = getSoapSessions();
      assert.equal(sessions.length, 1);
      assert.equal(sessions[0]!.appointmentId, appointmentId, 'randevu → seans bağı korunur');
      assert.equal(sessions[0]!.sessionNumber, 2);
      assert.equal(sessions[0]!.homework, 'Nefes egzersizi');

      const tests = getBeckDepressionTests();
      assert.equal(tests.length, 1);
      assert.equal(tests[0]!.totalScore, 0);
      assert.equal(tests[0]!.severity, 'Minimal');

      const screenings = getScreenings();
      assert.equal(screenings.length, 1, 'GAD-7 taraması buluttan geri gelmeli');
      assert.equal(screenings[0]!.id, gad7Id);
      assert.equal(screenings[0]!.type, 'gad7');
      assert.equal(screenings[0]!.totalScore, 3);
      assert.deepEqual(screenings[0]!.answers, [1, 1, 0, 1, 0, 0, 0]);
      assert.equal(screenings[0]!.clinicalNote, 'Tarama bandı; izlem.');

      assert.equal(getNotes().length, 1);
      assert.equal(getTasks().length, 1);
      assert.equal(getDocuments().length, 1);
      assert.ok(getDocuments()[0]!.filePath, 'belge kova yolu ile döner');
    });

    /* --------------------------------------------------- 3 · Silme de yansır */
    await t.test('deleting the client cascades in the database', async () => {
      deleteClient(clientId);
      await flushWrites();
      const count = async (table: string) =>
        (await session.sql<{ n: string }>(`select count(*)::text as n from public.${table}`))[0]!.n;
      assert.equal(await count('clients'), '0');
      assert.equal(await count('anamneses'), '0');
      assert.equal(await count('sessions'), '0');
      assert.equal(await count('appointments'), '0');
      assert.equal(await count('test_administrations'), '0');
      assert.equal(await count('test_results'), '0');
      assert.equal(await count('notes'), '0');
      assert.equal(await count('tasks'), '0');
      assert.equal(await count('documents'), '0');
    });

    disableCloudSync();
  } finally {
    disableCloudSync();
    await session.asSuperuser();
    await session.close();
    Object.assign(globalThis, { window: previousWindow, localStorage: previousStorage });
  }
});
