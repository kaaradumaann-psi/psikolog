import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLIENT_A1,
  CLIENT_A2,
  ORG_A,
  PSY_A2,
  asService,
  asUser,
  createClinicalDb,
  istanbulToday,
  seedPhase7Scenario,
} from './pgliteHarness';

/**
 * PHASE-07 / P0-4 + P0-5 — Randevu → Seans → Not zinciri ve imza/kilit/revizyon.
 * PGlite = gerçek PostgreSQL; Live Supabase/PRODUCTION doğrulaması değildir.
 */
test('phase7: randevu → seans bağı ve tekillik', { timeout: 120000 }, async (t) => {
  const db = await createClinicalDb();
  try {
    await seedPhase7Scenario(db);
    await asUser(db, PSY_A2);

    const appointment = await db.query<{ id: string }>(
      `insert into public.appointments(client_id, organization_id, title, start_at, end_at, created_by)
       values ($1,$2,'Seans', now(), now() + interval '50 minutes',$3) returning id`,
      [CLIENT_A1, ORG_A, PSY_A2],
    );
    const appointmentId = appointment.rows[0]!.id;

    await t.test('randevudan oluşturulan seans appointment_id taşır', async () => {
      const session = await db.query<{ id: string; appointment_id: string }>(
        `insert into public.sessions(client_id, organization_id, date, type, created_by, appointment_id, session_number, status)
         values ($1,$2,$3,'Bireysel Terapi',$4,$5,1,'draft') returning id, appointment_id`,
        [CLIENT_A1, ORG_A, istanbulToday(), PSY_A2, appointmentId],
      );
      assert.equal(session.rows.length, 1);
      assert.equal(session.rows[0]!.appointment_id, appointmentId);
    });

    await t.test('aynı randevuya ikinci seans yazılamaz', async () => {
      await assert.rejects(
        () =>
          db.query(
            `insert into public.sessions(client_id, organization_id, date, type, created_by, appointment_id)
             values ($1,$2,$3,'Takip',$4,$5)`,
            [CLIENT_A1, ORG_A, istanbulToday(), PSY_A2, appointmentId],
          ),
        /duplicate key|unique/i,
      );
    });

    await t.test('başka danışanın randevusu seansa bağlanamaz', async () => {
      // PSY_A1'in danışanı CLIENT_A2 için randevu (servis rolüyle kurulur)
      await asService(db);
      const other = await db.query<{ id: string }>(
        `insert into public.appointments(client_id, organization_id, title, start_at, end_at, created_by)
         values ($1,$2,'Diğer', now(), now() + interval '50 minutes','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') returning id`,
        [CLIENT_A2, ORG_A],
      );
      await asUser(db, PSY_A2);
      let blocked = false;
      try {
        const r = await db.query(
          `insert into public.sessions(client_id, organization_id, date, type, created_by, appointment_id)
           values ($1,$2,$3,'Takip',$4,$5)`,
          [CLIENT_A1, ORG_A, istanbulToday(), PSY_A2, other.rows[0]!.id],
        );
        blocked = r.affectedRows === 0;
      } catch {
        blocked = true;
      }
      assert.equal(blocked, true);
    });
  } finally {
    await db.close();
  }
});

test('phase7: imza → kilit → revizyon ve denetim izi', { timeout: 120000 }, async (t) => {
  const db = await createClinicalDb();
  try {
    await seedPhase7Scenario(db);
    await asUser(db, PSY_A2);

    // audit_logs yalnız admin/org_admin tarafından okunur (RLS) → servis bağlamı
    const auditActions = async (targetId: string): Promise<string[]> => {
      await asService(db);
      const rows = await db.query<{ action: string }>(
        `select action from public.audit_logs where target_id=$1`,
        [targetId],
      );
      await asUser(db, PSY_A2);
      return rows.rows.map((row) => row.action);
    };

    const created = await db.query<{ id: string }>(
      `insert into public.sessions(client_id, organization_id, date, type, notes, created_by)
       values ($1,$2,$3,'Bireysel Terapi','S: ilk',$4) returning id`,
      [CLIENT_A1, ORG_A, istanbulToday(), PSY_A2],
    );
    const sessionId = created.rows[0]!.id;

    await t.test('taslak düzenlenebilir', async () => {
      const r = await db.query(`update public.sessions set notes='S: güncel' where id=$1`, [sessionId]);
      assert.equal(r.affectedRows, 1);
    });

    await t.test('imzalama audit izine yazılır', async () => {
      await db.query(
        `update public.sessions set status='signed', signed_at=now(), signed_by=$2 where id=$1`,
        [sessionId, PSY_A2],
      );
      assert.ok((await auditActions(sessionId)).includes('session_sign'));
    });

    await t.test('kilitli kayıt DB seviyesinde korunur', async () => {
      await db.query(
        `update public.sessions set status='locked', locked_at=now(), locked_by=$2 where id=$1`,
        [sessionId, PSY_A2],
      );
      await assert.rejects(
        () => db.query(`update public.sessions set notes='sessizce değiştir' where id=$1`, [sessionId]),
        /Kilitli klinik kayıt/i,
      );
      await assert.rejects(
        () => db.query(`delete from public.sessions where id=$1`, [sessionId]),
        /Kilitli klinik kayıt/i,
      );
      assert.ok((await auditActions(sessionId)).includes('session_lock'));
    });

    await t.test('revizyon: eski içerik kaybolmaz, zincir kurulur', async () => {
      const fresh = await db.query<{ id: string }>(
        `insert into public.sessions(client_id, organization_id, date, type, notes, created_by, amendment_of, amendment_reason)
         values ($1,$2,$3,'Bireysel Terapi','S: düzeltilmiş',$4,$5,'Dokümantasyon düzeltmesi') returning id`,
        [CLIENT_A1, ORG_A, istanbulToday(), PSY_A2, sessionId],
      );
      const newId = fresh.rows[0]!.id;

      const old = await db.query<{ superseded_by: string; notes: string; revision: number }>(
        `select superseded_by, notes, revision from public.sessions where id=$1`,
        [sessionId],
      );
      assert.equal(old.rows[0]!.superseded_by, newId);
      assert.equal(old.rows[0]!.notes, 'S: güncel');
      assert.equal(old.rows[0]!.revision, 2); // içerik revizyonu (imza/kilit revizyonu artırmaz)

      const next = await db.query<{ revision: number; amendment_of: string; status: string }>(
        `select revision, amendment_of, status from public.sessions where id=$1`,
        [newId],
      );
      assert.equal(next.rows[0]!.revision, 3); // eski içerik revizyonu 2 → yeni kayıt 3
      assert.equal(next.rows[0]!.amendment_of, sessionId);
      assert.equal(next.rows[0]!.status, 'draft');

      assert.ok((await auditActions(newId)).includes('session_revision'));
    });

    await t.test('gerekçesiz revizyon reddedilir', async () => {
      await assert.rejects(
        () =>
          db.query(
            `insert into public.sessions(client_id, organization_id, date, type, created_by, amendment_of)
             values ($1,$2,$3,'Takip',$4,$5)`,
            [CLIENT_A1, ORG_A, istanbulToday(), PSY_A2, sessionId],
          ),
      );
    });

    await t.test('formülasyon ve güvenlik planı da kilitlenir', async () => {
      const formulation = await db.query<{ id: string }>(
        `insert into public.formulations(client_id, organization_id, content, created_by)
         values ($1,$2,'{"predisposing":"x"}'::jsonb,$3) returning id`,
        [CLIENT_A1, ORG_A, PSY_A2],
      );
      const formulationId = formulation.rows[0]!.id;
      await db.query(
        `update public.formulations set status='signed', signed_at=now(), signed_by=$2 where id=$1`,
        [formulationId, PSY_A2],
      );
      await db.query(
        `update public.formulations set status='locked', locked_at=now(), locked_by=$2 where id=$1`,
        [formulationId, PSY_A2],
      );
      await assert.rejects(
        () => db.query(`update public.formulations set content='{"hack":true}'::jsonb where id=$1`, [formulationId]),
        /Kilitli klinik kayıt/i,
      );

      const plan = await db.query<{ id: string }>(
        `insert into public.safety_plans(client_id, organization_id, content, created_by)
         values ($1,$2,'{"warningSigns":"x"}'::jsonb,$3) returning id`,
        [CLIENT_A1, ORG_A, PSY_A2],
      );
      await db.query(
        `update public.safety_plans set status='signed', signed_at=now(), signed_by=$2 where id=$1`,
        [plan.rows[0]!.id, PSY_A2],
      );
      await asService(db);
      const audit = await db.query<{ action: string }>(
        `select action from public.audit_logs where target_table='safety_plans'`,
      );
      assert.ok(audit.rows.some((row) => row.action === 'safety_plan_sign'));
      await asUser(db, PSY_A2);
    });
  } finally {
    await db.close();
  }
});
