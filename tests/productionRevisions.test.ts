import assert from 'node:assert/strict';
import test from 'node:test';
import { CLIENT_A1, CLIENT_A2, ORG_A, PSY_A1, PSY_A2, asUser, createClinicalDb, istanbulToday, seedPhase7Scenario } from './pgliteHarness';

/** PostgreSQL/PGlite proves the unique indexes and triggers together; it is NOT live Supabase. */
test('revizyon: kilitli formülasyon ve planın eski satırı korunurken yeni taslak eklenir', { timeout: 120000 }, async (t) => {
  const db = await createClinicalDb();
  try {
    await seedPhase7Scenario(db);
    await asUser(db, PSY_A2);
    for (const table of ['formulations', 'safety_plans'] as const) {
      await t.test(table, async () => {
        const old = await db.query<{ id: string }>(
          `insert into public.${table}(client_id, organization_id, content, created_by)
           values ($1,$2,'{"modality":"ilk sürüm"}'::jsonb,$3) returning id`,
          [CLIENT_A1, ORG_A, PSY_A2],
        );
        const oldId = old.rows[0]!.id;
        await db.query(`update public.${table} set status='signed', signed_at=now(), signed_by=$2 where id=$1`, [oldId, PSY_A2]);
        await db.query(`update public.${table} set status='locked', locked_at=now(), locked_by=$2 where id=$1`, [oldId, PSY_A2]);
        const added = await db.query<{ id: string; status: string }>(
          `insert into public.${table}(client_id, organization_id, content, created_by, amendment_of, amendment_reason)
           values ($1,$2,'{"modality":"yeni sürüm"}'::jsonb,$3,$4,'Klinik düzeltme') returning id, status`,
          [CLIENT_A1, ORG_A, PSY_A2, oldId],
        );
        assert.equal(added.rows[0]!.status, 'draft');
        const stored = await db.query<{ id: string; status: string; superseded_by: string | null }>(
          `select id, status, superseded_by from public.${table} where client_id=$1`, [CLIENT_A1],
        );
        assert.equal(stored.rows.length, 2);
        assert.equal(stored.rows.find((row) => row.id === oldId)!.status, 'locked');
        assert.equal(stored.rows.find((row) => row.id === oldId)!.superseded_by, added.rows[0]!.id);
        assert.equal(stored.rows.find((row) => row.id === added.rows[0]!.id)!.superseded_by, null);
      });
    }
  } finally {
    await db.close();
  }
});

test('randevuya bağlı seans revizyonu eski randevu bağını korur ve ikinci aktif bağ yaratmaz', { timeout: 120000 }, async () => {
  const db = await createClinicalDb();
  try {
    await seedPhase7Scenario(db);
    await asUser(db, PSY_A2);
    const appointment = await db.query<{ id: string }>(
      `insert into public.appointments(client_id, organization_id, title, start_at, end_at, created_by)
       values ($1,$2,'Seans', now(), now() + interval '50 minutes',$3) returning id`,
      [CLIENT_A1, ORG_A, PSY_A2],
    );
    const old = await db.query<{ id: string }>(
      `insert into public.sessions(client_id, organization_id, date, type, created_by, appointment_id, session_number)
       values ($1,$2,$3,'Bireysel Terapi',$4,$5,1) returning id`,
      [CLIENT_A1, ORG_A, istanbulToday(), PSY_A2, appointment.rows[0]!.id],
    );
    const oldId = old.rows[0]!.id;
    await db.query(`update public.sessions set status='signed', signed_at=now(), signed_by=$2 where id=$1`, [oldId, PSY_A2]);
    await db.query(`update public.sessions set status='locked', locked_at=now(), locked_by=$2 where id=$1`, [oldId, PSY_A2]);
    const added = await db.query<{ id: string; appointment_id: string | null }>(
      `insert into public.sessions(client_id, organization_id, date, type, notes, created_by, session_number, amendment_of, amendment_reason)
       values ($1,$2,$3,'Bireysel Terapi','düzeltilmiş',$4,1,$5,'Klinik düzeltme') returning id, appointment_id`,
      [CLIENT_A1, ORG_A, istanbulToday(), PSY_A2, oldId],
    );
    assert.equal(added.rows[0]!.appointment_id, null);
    const stored = await db.query<{ id: string; appointment_id: string | null; superseded_by: string | null }>(
      `select id, appointment_id, superseded_by from public.sessions where id=$1`, [oldId],
    );
    assert.equal(stored.rows[0]!.appointment_id, appointment.rows[0]!.id);
    assert.equal(stored.rows[0]!.superseded_by, added.rows[0]!.id);
  } finally {
    await db.close();
  }
});

test('revizyon: aynı kurumdaki başka danışanın üst kaydına bağlanma DB tarafından reddedilir', { timeout: 120000 }, async () => {
  const db = await createClinicalDb();
  try {
    await seedPhase7Scenario(db);
    // Org admin can access both files; the composite FK (not a frontend check)
    // must still prevent linking two different clients' clinical histories.
    await asUser(db, PSY_A1);
    const parent = await db.query<{ id: string }>(
      `insert into public.formulations(client_id, organization_id, content, created_by)
       values ($1,$2,'{}'::jsonb,$3) returning id`, [CLIENT_A2, ORG_A, PSY_A1],
    );
    await assert.rejects(
      () => db.query(
        `insert into public.formulations(client_id, organization_id, content, created_by, amendment_of, amendment_reason)
         values ($1,$2,'{}'::jsonb,$3,$4,'Yanlış dosya')`,
        [CLIENT_A1, ORG_A, PSY_A1, parent.rows[0]!.id],
      ), /foreign key|23503/i,
    );
    const session = await db.query<{ id: string }>(
      `insert into public.sessions(client_id, organization_id, date, type, created_by)
       values ($1,$2,$3,'Bireysel Terapi',$4) returning id`,
      [CLIENT_A2, ORG_A, istanbulToday(), PSY_A1],
    );
    await assert.rejects(
      () => db.query(
        `insert into public.sessions(client_id, organization_id, date, type, created_by, amendment_of, amendment_reason)
         values ($1,$2,$3,'Bireysel Terapi',$4,$5,'Yanlış dosya')`,
        [CLIENT_A1, ORG_A, istanbulToday(), PSY_A1, session.rows[0]!.id],
      ), /foreign key|23503/i,
    );
  } finally {
    await db.close();
  }
});
