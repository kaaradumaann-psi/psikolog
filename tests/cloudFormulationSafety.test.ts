/**
 * P0.6 — formulation and safety plan persistence.
 *
 * Closes the P0.5 finding: `FormulationPanel` saved both records and the only
 * durable copy was localStorage. They now travel the same chain as every other
 * clinical entity — store → sync → repository → Postgres → RLS.
 *
 * The write path exercised here is the one the UI actually calls
 * (`saveFormulation`, `saveSafetyPlan`), not the repository directly, so a
 * regression in the store wiring fails these tests too.
 *
 * Real PostgreSQL (PGlite) running the real migrations; role switching mirrors
 * PostgREST. Nothing is mocked.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDbPort, buildStoragePort, createAuthUser, createTestDatabase } from './helpers/pglitePort.ts';
import {
  configureCloudSync,
  disableCloudSync,
  ensureOrganization,
  flushWrites,
  pullSnapshot,
} from '../src/clinical/cloud/sync.ts';
import { newUuid } from '../src/clinical/cloud/ids.ts';
import { formulationRowId, safetyPlanRowId } from '../src/clinical/cloud/mapping.ts';
import {
  applyClinicalCloudSnapshot,
  getClients,
  saveClient,
} from '../src/clinical/clinicalStore.ts';
import {
  applyCloudPracticeSnapshot,
  getFormulation,
  getFormulations,
  getSafetyPlan,
  getSafetyPlans,
  saveFormulation,
  saveSafetyPlan,
} from '../src/clinical/practiceStore.ts';
import type { CaseFormulation, SafetyPlan } from '../src/clinical/casework.ts';

const ELIF_DEMIR = 'ffffffff-ffff-4fff-8fff-ffffffffff01';
const MEHMET_KAYA = 'ffffffff-ffff-4fff-8fff-ffffffffff02';

function makeClient(id: string): Parameters<typeof saveClient>[0] {
  return {
    id,
    fileNumber: 'HK-2026-004',
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

function makeFormulation(clientId: string): CaseFormulation {
  return {
    clientId,
    modality: 'Haftalık bireysel BDT',
    predisposing: 'Çocuklukta kaygılı bağlanma.',
    precipitating: 'İş değişikliği.',
    perpetuating: 'Kaçınma davranışı.',
    protective: 'Destekleyici eş, düzenli uyku.',
    goals: [
      { id: 'goal_1', text: 'Kaygı atağı süresini kısaltmak', measure: 'Haftalık kayıt', status: 'active' },
      { id: 'goal_2', text: 'Sunum yapmak', measure: 'İki sunum tamamlandı', status: 'met' },
    ],
    reviewDate: '2026-10-15',
    updatedAt: new Date().toISOString(),
  };
}

function makeSafety(clientId: string): SafetyPlan {
  return {
    clientId,
    warningSigns: 'Uykusuzluk, sürekli felaket senaryosu.',
    coping: 'Nefes egzersizi, 5-4-3-2-1 topraklama.',
    people: 'Eşi Kerem, ablası Deniz.',
    professionals: 'Uzm. Psk. Halil Karaduman — 0532 000 00 00.',
    environment: 'İlaçlar kilitli dolapta.',
    reasons: 'Çocukları ve devam eden tedavi süreci.',
    updatedAt: new Date().toISOString(),
  };
}

test('P0.6: formulation and safety plan persist to Postgres and stay isolated', { timeout: 180000 }, async (t) => {
  const storageMap = new Map<string, string>();
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  Object.assign(globalThis, {
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
    await createAuthUser(session, MEHMET_KAYA, 'mehmet.kaya@example.test');
    await session.asUser(ELIF_DEMIR);

    const db = buildDbPort(session);
    const storage = buildStoragePort(session);
    configureCloudSync({ db, storage, owner: { organizationId: '', userId: ELIF_DEMIR } });
    const elifOrg = await ensureOrganization();
    assert.ok(elifOrg);

    /* ------------------------------------------------- 1 · create + sync */
    const clientId = newUuid();
    saveClient(makeClient(clientId));
    await flushWrites();

    // 1. formulation create
    saveFormulation(makeFormulation(clientId));
    await flushWrites();

    await t.test('formulation: create reaches the database', async () => {
      const rows = await session.sql<{
        id: string; client_id: string; organization_id: string; created_by: string;
        modality: string; goals: unknown[]; review_date: unknown;
      }>(`select * from public.formulations`);
      assert.equal(rows.length, 1, 'one row per client');
      assert.equal(rows[0]!.id, formulationRowId(clientId), 'row id is derived from the client id');
      assert.equal(rows[0]!.client_id, clientId);
      assert.equal(rows[0]!.organization_id, elifOrg);
      assert.equal(rows[0]!.created_by, ELIF_DEMIR);
      assert.equal(rows[0]!.modality, 'Haftalık bireysel BDT');
      assert.equal(rows[0]!.goals.length, 2, 'treatment goals travel with the record');
    });

    // safety plan create
    saveSafetyPlan(makeSafety(clientId));
    await flushWrites();

    await t.test('safety plan: create reaches the database', async () => {
      const rows = await session.sql<{
        id: string; client_id: string; created_by: string;
        warning_signs: string; environment: string; reasons: string;
      }>(`select * from public.safety_plans`);
      assert.equal(rows.length, 1);
      assert.equal(rows[0]!.id, safetyPlanRowId(clientId));
      assert.equal(rows[0]!.client_id, clientId);
      assert.equal(rows[0]!.created_by, ELIF_DEMIR);
      assert.equal(rows[0]!.warning_signs, 'Uykusuzluk, sürekli felaket senaryosu.');
      assert.equal(rows[0]!.environment, 'İlaçlar kilitli dolapta.');
      assert.equal(rows[0]!.reasons, 'Çocukları ve devam eden tedavi süreci.');
    });

    /* ------------------------------------------------------- 2 · update */
    await t.test('formulation: update re-pushes the same row (no duplicate)', async () => {
      saveFormulation({
        ...makeFormulation(clientId),
        modality: 'İki haftalık BDT + EMDR yönlendirmesi',
        goals: [{ id: 'goal_1', text: 'Kaygı atağı süresini kısaltmak', measure: 'Haftalık kayıt', status: 'met' }],
      });
      await flushWrites();

      const rows = await session.sql<{ modality: string; goals: { status: string }[] }>(
        `select modality, goals from public.formulations`,
      );
      assert.equal(rows.length, 1, 'update must not create a second row');
      assert.equal(rows[0]!.modality, 'İki haftalık BDT + EMDR yönlendirmesi');
      assert.equal(rows[0]!.goals.length, 1);
      assert.equal(rows[0]!.goals[0]!.status, 'met');
    });

    await t.test('safety plan: update re-pushes the same row (no duplicate)', async () => {
      saveSafetyPlan({ ...makeSafety(clientId), coping: 'Yürüyüş ve nefes egzersizi.' });
      await flushWrites();

      const rows = await session.sql<{ coping: string }>(`select coping from public.safety_plans`);
      assert.equal(rows.length, 1);
      assert.equal(rows[0]!.coping, 'Yürüyüş ve nefes egzersizi.');
    });

    /* -------------------------- 3 · cache cleared, everything comes back */
    await t.test('cleared device is restored from the database', async () => {
      storageMap.clear();
      assert.equal(getFormulations().length, 0, 'device cache really is empty');
      assert.equal(getSafetyPlans().length, 0, 'device cache really is empty');
      assert.equal(getClients().length, 0);

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

      assert.equal(getClients().length, 1);

      const formulation = getFormulation(clientId);
      assert.ok(formulation, 'formulation must come back from the database');
      assert.equal(formulation.clientId, clientId);
      assert.equal(formulation.modality, 'İki haftalık BDT + EMDR yönlendirmesi');
      assert.equal(formulation.predisposing, 'Çocuklukta kaygılı bağlanma.');
      assert.equal(formulation.precipitating, 'İş değişikliği.');
      assert.equal(formulation.perpetuating, 'Kaçınma davranışı.');
      assert.equal(formulation.protective, 'Destekleyici eş, düzenli uyku.');
      assert.equal(formulation.goals.length, 1);
      assert.equal(formulation.goals[0]!.id, 'goal_1');
      assert.equal(formulation.goals[0]!.measure, 'Haftalık kayıt');
      assert.equal(formulation.goals[0]!.status, 'met');
      assert.equal(formulation.reviewDate, '2026-10-15');

      const safety = getSafetyPlan(clientId);
      assert.ok(safety, 'safety plan must come back from the database');
      assert.equal(safety.warningSigns, 'Uykusuzluk, sürekli felaket senaryosu.');
      assert.equal(safety.coping, 'Yürüyüş ve nefes egzersizi.');
      assert.equal(safety.people, 'Eşi Kerem, ablası Deniz.');
      assert.equal(safety.professionals, 'Uzm. Psk. Halil Karaduman — 0532 000 00 00.');
      assert.equal(safety.environment, 'İlaçlar kilitli dolapta.');
      assert.equal(safety.reasons, 'Çocukları ve devam eden tedavi süreci.');
    });

    /* ------------------------------------------------- 4 · IDOR / isolation */
    await t.test('another psychologist cannot SELECT, UPDATE or DELETE either record', async () => {
      await session.asUser(MEHMET_KAYA);
      const mehmetOrg = await (async () => {
        const repo = (await import('../src/clinical/cloud/repository.ts')).createRepository({
          db, storage, owner: { organizationId: '', userId: MEHMET_KAYA },
        });
        return repo.ensureOrganization();
      })();
      assert.notEqual(mehmetOrg, elifOrg);

      // SELECT by id, and a blanket read.
      const fById = await session.sql(
        `select id from public.formulations where id = $1`, [formulationRowId(clientId)],
      );
      assert.equal(fById.length, 0, 'formulation IDOR SELECT');
      const sById = await session.sql(
        `select id from public.safety_plans where id = $1`, [safetyPlanRowId(clientId)],
      );
      assert.equal(sById.length, 0, 'safety plan IDOR SELECT');
      assert.equal((await session.sql(`select id from public.formulations`)).length, 0);
      assert.equal((await session.sql(`select id from public.safety_plans`)).length, 0);

      // UPDATE / DELETE must not touch a row. `returning` matters: without it a
      // blocked statement and a successful one both report zero rows.
      assert.equal(
        (await session.sql(
          `update public.formulations set protective = 'ele geçirildi' where id = $1 returning id`,
          [formulationRowId(clientId)],
        )).length,
        0,
        'formulation IDOR UPDATE',
      );
      assert.equal(
        (await session.sql(
          `delete from public.formulations where id = $1 returning id`, [formulationRowId(clientId)],
        )).length,
        0,
        'formulation IDOR DELETE',
      );
      assert.equal(
        (await session.sql(
          `update public.safety_plans set warning_signs = 'ele geçirildi' where id = $1 returning id`,
          [safetyPlanRowId(clientId)],
        )).length,
        0,
        'safety plan IDOR UPDATE',
      );
      assert.equal(
        (await session.sql(
          `delete from public.safety_plans where id = $1 returning id`, [safetyPlanRowId(clientId)],
        )).length,
        0,
        'safety plan IDOR DELETE',
      );

      // INSERT into someone else's client must be refused too.
      await assert.rejects(
        () =>
          session.sql(
            `insert into public.formulations
               (id, client_id, organization_id, created_by, modality)
             values ($1,$2,$3,$4,'yerleştirildi')`,
            [formulationRowId(clientId), clientId, mehmetOrg, MEHMET_KAYA],
          ),
        /row-level security|permission denied/i,
        'another psychologist must not write a formulation onto Elif\'s client',
      );

      await session.asSuperuser();
      const survivors = await session.sql<{ protective: string }>(
        `select protective from public.formulations`,
      );
      assert.equal(survivors.length, 1, 'the row still exists');
      assert.equal(survivors[0]!.protective, 'Destekleyici eş, düzenli uyku.', 'content untouched');
      assert.equal(
        (await session.sql(`select count(*)::text as n from public.safety_plans`))[0]!.n,
        '1',
      );
      await session.asUser(ELIF_DEMIR);
    });

    /* ------------------- 5 · isolation also holds inside a SHARED organization */
    await t.test('a fellow member of the same organization still cannot reach either record', async () => {
      await session.asSuperuser();
      await session.sql(`update public.profiles set organization_id = $1 where id = $2`, [elifOrg, MEHMET_KAYA]);

      await session.asUser(MEHMET_KAYA);
      assert.equal((await session.sql(`select id from public.formulations`)).length, 0);
      assert.equal((await session.sql(`select id from public.safety_plans`)).length, 0);
      assert.equal(
        (await session.sql(
          `delete from public.safety_plans where client_id = $1 returning id`, [clientId],
        )).length,
        0,
        'safety plan must survive a fellow org member',
      );

      await session.asSuperuser();
      await session.sql(`update public.profiles set organization_id = null where id = $1`, [MEHMET_KAYA]);
      await session.asUser(ELIF_DEMIR);
    });

    /* --------------------------------------------- 6 · ownership is pinned */
    await t.test('created_by cannot be reassigned by an update', async () => {
      await session.sql(
        `update public.formulations set created_by = $1 where id = $2`,
        [MEHMET_KAYA, formulationRowId(clientId)],
      );
      await session.sql(
        `update public.safety_plans set created_by = $1 where id = $2`,
        [MEHMET_KAYA, safetyPlanRowId(clientId)],
      );
      const rows = await session.sql<{ f: string; s: string }>(
        `select (select created_by::text from public.formulations) as f,
                (select created_by::text from public.safety_plans) as s`,
      );
      assert.equal(rows[0]!.f, ELIF_DEMIR, 'formulation owner is pinned');
      assert.equal(rows[0]!.s, ELIF_DEMIR, 'safety plan owner is pinned');
    });

    /* ------------------------------------- 7 · cascade with the client file */
    await t.test('deleting the client removes both records in the database', async () => {
      await session.sql(`delete from public.clients where id = $1`, [clientId]);
      assert.equal((await session.sql(`select id from public.formulations`)).length, 0);
      assert.equal((await session.sql(`select id from public.safety_plans`)).length, 0);

      // audit_logs SELECT is admin/org_admin only (P0 §8), so a PSYCHOLOG
      // session reads zero rows from it. Read as superuser.
      await session.asSuperuser();
      const audited = await session.sql<{ action: string }>(
        `select action from public.audit_logs where target_table in ('formulations','safety_plans')`,
      );
      assert.ok(
        audited.some((row) => row.action === 'formulations_insert'),
        'formulation writes are audited',
      );
      assert.ok(
        audited.some((row) => row.action === 'safety_plans_insert'),
        'safety plan writes are audited',
      );
    });
  } finally {
    disableCloudSync();
    await session.close();
    Object.assign(globalThis, { window: previousWindow, localStorage: previousStorage });
  }
});

/**
 * §6 — VERİ KAYBI YOK. A psychologist who already has formulations and safety
 * plans in localStorage from before this migration must not lose them: the
 * bootstrap pushes the device backlog to the cloud, and re-pushing the same
 * record must not create a duplicate.
 */
test('P0.6: pre-existing localStorage records are migrated to the cloud without duplicates', { timeout: 180000 }, async (t) => {
  const storageMap = new Map<string, string>();
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  Object.assign(globalThis, {
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

    // 1 · The device already holds data from before the cloud path existed.
    const clientId = newUuid();
    const legacyFormulation = makeFormulation(clientId);
    const legacySafety = makeSafety(clientId);
    saveClient(makeClient(clientId));
    // Written straight into the device store, as an older build would have.
    storageMap.set('psikolog_formulations_v2', JSON.stringify([legacyFormulation]));
    storageMap.set('psikolog_safety_v2', JSON.stringify([legacySafety]));
    assert.equal(getFormulations().length, 1);
    assert.equal(getSafetyPlans().length, 1);

    // 2 · Bootstrap pushes the backlog, twice — the second pass must be a no-op.
    const { pushLocalPracticeRecordsToCloud } = await import('../src/clinical/practiceStore.ts');
    await pushLocalPracticeRecordsToCloud();
    await pushLocalPracticeRecordsToCloud();
    await flushWrites();

    await t.test('legacy records reach the cloud exactly once', async () => {
      const formulations = await session.sql<{ id: string; modality: string; organization_id: string }>(
        `select id, modality, organization_id from public.formulations`,
      );
      assert.equal(formulations.length, 1, 'no duplicate from re-pushing the backlog');
      assert.equal(formulations[0]!.modality, legacyFormulation.modality);
      assert.equal(formulations[0]!.organization_id, orgId);

      const plans = await session.sql<{ id: string; warning_signs: string }>(
        `select id, warning_signs from public.safety_plans`,
      );
      assert.equal(plans.length, 1, 'no duplicate from re-pushing the backlog');
      assert.equal(plans[0]!.warning_signs, legacySafety.warningSigns);
    });

    // 3 · A cleared device gets the same content back.
    await t.test('a cleared device is restored from the migrated cloud rows', async () => {
      storageMap.clear();
      assert.equal(getFormulations().length, 0);
      assert.equal(getSafetyPlans().length, 0);

      const snapshot = await pullSnapshot();
      applyClinicalCloudSnapshot(snapshot);
      applyCloudPracticeSnapshot({
        documents: snapshot.documents,
        notes: snapshot.notes,
        tasks: snapshot.tasks,
        screenings: [],
        formulations: snapshot.formulations,
        safetyPlans: snapshot.safetyPlans,
      });

      const formulation = getFormulation(clientId);
      assert.ok(formulation);
      assert.equal(formulation.modality, legacyFormulation.modality);
      assert.equal(formulation.goals.length, legacyFormulation.goals.length);
      const safety = getSafetyPlan(clientId);
      assert.ok(safety);
      assert.equal(safety.professionals, legacySafety.professionals);
    });
  } finally {
    disableCloudSync();
    await session.close();
    Object.assign(globalThis, { window: previousWindow, localStorage: previousStorage });
  }
});
