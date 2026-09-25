import assert from 'node:assert/strict';
import test from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import {
  ADMIN,
  ANAM_A1,
  APPT_A1,
  CLIENT_A1,
  CLIENT_A2,
  CLIENT_B,
  DOC_A1,
  FORM_A1,
  NO_PROFILE,
  NOTE_A1,
  ORG_A,
  ORG_B,
  PSY_A1,
  PSY_A2,
  PSY_A3,
  PSY_B,
  REPORT_A1,
  SAFETY_A1,
  SESSION_A1,
  TASK_A1,
  TEST_ADMIN_A1,
  TEST_RESULT_A1,
  asAnon,
  asService,
  asUser,
  createClinicalDb,
  istanbulToday,
  seedPhase7Scenario,
} from './pgliteHarness';

/**
 * PHASE-07 / P0-2 — RLS matrisi (§13)
 * A → A PASS · A → B DENY · B → A DENY · Admin PASS
 *
 * Not: PGlite = gerçek PostgreSQL motoru; Live Supabase/PRODUCTION doğrulaması değildir.
 */
test('phase7 RLS: sahiplik matrisi ve tenant bütünlüğü', { timeout: 180000 }, async (t) => {
  const db: PGlite = await createClinicalDb();
  try {
    await seedPhase7Scenario(db);

    const denied = async (fn: () => Promise<unknown>): Promise<boolean> => {
      try {
        const result = (await fn()) as { affectedRows?: number; rows?: unknown[] };
        if (typeof result.affectedRows === 'number') return result.affectedRows === 0;
        return (result.rows?.length ?? 0) === 0;
      } catch (error) {
        const msg = String((error as Error).message ?? '');
        assert.ok(
          /permission denied|row-level security|42501|policy|violates/i.test(msg),
          `beklenmeyen hata: ${msg}`,
        );
        return true;
      }
    };

    /* ---------------------------------------------------------------- */
    await t.test('clients: A→A PASS, komşu psikolog ve diğer org DENY', async () => {
      await asUser(db, PSY_A2);
      assert.equal((await db.query(`select id from public.clients where id=$1`, [CLIENT_A1])).rows.length, 1);

      await asUser(db, PSY_A3); // aynı kurum, farklı psikolog
      assert.equal((await db.query(`select id from public.clients where id=$1`, [CLIENT_A1])).rows.length, 0);
      assert.equal((await db.query(`select id from public.clients where id=$1`, [CLIENT_A2])).rows.length, 0);

      await asUser(db, PSY_B);
      assert.equal((await db.query(`select id from public.clients where id=$1`, [CLIENT_A1])).rows.length, 0);
      assert.equal((await db.query(`select id from public.clients`)).rows.length, 1);

      await asUser(db, PSY_A1); // ORG_ADMIN — kendi kurumu
      assert.equal((await db.query(`select id from public.clients where id=$1`, [CLIENT_A1])).rows.length, 1);
      assert.equal((await db.query(`select id from public.clients where id=$1`, [CLIENT_B])).rows.length, 0);

      await asUser(db, ADMIN);
      assert.ok((await db.query(`select id from public.clients`)).rows.length >= 3);
    });

    await t.test('clients: komşu psikolog UPDATE/DELETE edemez', async () => {
      await asUser(db, PSY_A3);
      assert.equal(
        await denied(() => db.query(`update public.clients set first_name='Hack' where id=$1`, [CLIENT_A1])),
        true,
      );
      assert.equal(await denied(() => db.query(`delete from public.clients where id=$1`, [CLIENT_A1])), true);
      assert.equal(await denied(() => db.query(`update public.clients set first_name='Benim' where id=$1`, [CLIENT_A2])), true);
    });

    await t.test('clients: başkası adına veya başka org ile INSERT DENY', async () => {
      await asUser(db, PSY_A2);
      // created_by = başka kullanıcı
      assert.equal(
        await denied(() =>
          db.query(
            `insert into public.clients(organization_id, file_number, first_name, last_name, created_by) values ($1,'HK-X1','A','B',$2)`,
            [ORG_A, PSY_A3],
          ),
        ),
        true,
      );
      // başka kuruma kayıt
      assert.equal(
        await denied(() =>
          db.query(
            `insert into public.clients(organization_id, file_number, first_name, last_name, created_by) values ($1,'HK-X2','A','B',$2)`,
            [ORG_B, PSY_A2],
          ),
        ),
        true,
      );
      // sahibi kendisi → PASS
      const ok = await db.query(
        `insert into public.clients(organization_id, file_number, first_name, last_name, created_by, owner_user_id) values ($1,'HK-X3','A','B',$2,$2) returning id`,
        [ORG_A, PSY_A2],
      );
      assert.equal(ok.rows.length, 1);
    });

    await t.test('sessions/anamnesis: komşu psikolog DENY, sahip PASS', async () => {
      await asUser(db, PSY_A3);
      assert.equal((await db.query(`select id from public.sessions where id=$1`, [SESSION_A1])).rows.length, 0);
      assert.equal((await db.query(`select id from public.anamneses where id=$1`, [ANAM_A1])).rows.length, 0);
      assert.equal(await denied(() => db.query(`update public.sessions set notes='hack' where id=$1`, [SESSION_A1])), true);
      assert.equal(await denied(() => db.query(`delete from public.sessions where id=$1`, [SESSION_A1])), true);

      await asUser(db, PSY_A2);
      assert.equal((await db.query(`select id from public.sessions where id=$1`, [SESSION_A1])).rows.length, 1);
      assert.equal((await db.query(`select id from public.anamneses where id=$1`, [ANAM_A1])).rows.length, 1);
    });

    await t.test('kritik: başka org client_id ile session/anamnesis INSERT DENY', async () => {
      await asUser(db, PSY_A2);
      assert.equal(
        await denied(() =>
          db.query(
            `insert into public.sessions(client_id, organization_id, date, type, created_by) values ($1,$2,$3,'Takip',$4)`,
            [CLIENT_B, ORG_B, istanbulToday(), PSY_A2],
          ),
        ),
        true,
      );
      assert.equal(
        await denied(() =>
          db.query(
            `insert into public.sessions(client_id, organization_id, date, type, created_by) values ($1,$2,$3,'Takip',$4)`,
            [CLIENT_B, ORG_A, istanbulToday(), PSY_A2],
          ),
        ),
        true,
      );
      assert.equal(
        await denied(() =>
          db.query(
            `insert into public.anamneses(client_id, organization_id, created_by) values ($1,$2,$3)`,
            [CLIENT_B, ORG_A, PSY_A2],
          ),
        ),
        true,
      );
      // aynı org ama başkasının danışanı
      assert.equal(
        await denied(() =>
          db.query(
            `insert into public.sessions(client_id, organization_id, date, type, created_by) values ($1,$2,$3,'Takip',$4)`,
            [CLIENT_A2, ORG_A, istanbulToday(), PSY_A2],
          ),
        ),
        true,
      );
      // kendi danışanı → PASS
      const ok = await db.query(
        `insert into public.sessions(client_id, organization_id, date, type, created_by) values ($1,$2,$3,'Takip',$4) returning id`,
        [CLIENT_A1, ORG_A, istanbulToday(), PSY_A2],
      );
      assert.equal(ok.rows.length, 1);
    });

    await t.test('test_results: parent administration üzerinden sahiplik', async () => {
      await asUser(db, PSY_A3);
      assert.equal((await db.query(`select id from public.test_results where id=$1`, [TEST_RESULT_A1])).rows.length, 0);
      assert.equal(await denied(() => db.query(`update public.test_results set summary='hack' where id=$1`, [TEST_RESULT_A1])), true);
      assert.equal(await denied(() => db.query(`delete from public.test_results where id=$1`, [TEST_RESULT_A1])), true);

      await asUser(db, PSY_A2);
      assert.equal((await db.query(`select id from public.test_results where id=$1`, [TEST_RESULT_A1])).rows.length, 1);
    });

    await t.test('reports: komşu psikolog raporda ve sürümlerinde DENY', async () => {
      await asUser(db, PSY_A2);
      await db.query(`update public.reports set content='{"schemaVersion":1,"blocks":[]}'::jsonb where id=$1`, [REPORT_A1]);
      await asUser(db, PSY_A3);
      assert.equal((await db.query(`select id from public.reports where id=$1`, [REPORT_A1])).rows.length, 0);
      assert.equal(
        (await db.query(`select id from public.report_versions where report_id=$1`, [REPORT_A1])).rows.length,
        0,
      );
    });

    await t.test('psychologist_settings: başka kullanıcının anteti yazılamaz', async () => {
      await asUser(db, PSY_A2);
      await db.query(
        `insert into public.psychologist_settings(created_by, organization_id, letterhead) values ($1,$2,'{"clinicName":"A"}'::jsonb) on conflict (created_by) do nothing`,
        [PSY_A2, ORG_A],
      );
      await asUser(db, PSY_A3);
      assert.equal(
        (await db.query(`select created_by from public.psychologist_settings where created_by=$1`, [PSY_A2])).rows.length,
        0,
      );
      assert.equal(
        await denied(() =>
          db.query(`update public.psychologist_settings set letterhead='{"clinicName":"Hack"}'::jsonb where created_by=$1`, [PSY_A2]),
        ),
        true,
      );
      // kendi kaydı → PASS
      const own = await db.query(
        `insert into public.psychologist_settings(created_by, organization_id, letterhead) values ($1,$2,'{"clinicName":"C"}'::jsonb) returning created_by`,
        [PSY_A3, ORG_A],
      );
      assert.equal(own.rows.length, 1);
    });

    await t.test('documents/notes/tasks/appointments: komşu psikolog DENY', async () => {
      await asUser(db, PSY_A3);
      assert.equal((await db.query(`select id from public.documents where id=$1`, [DOC_A1])).rows.length, 0);
      assert.equal((await db.query(`select id from public.notes where id=$1`, [NOTE_A1])).rows.length, 0);
      assert.equal((await db.query(`select id from public.tasks where id=$1`, [TASK_A1])).rows.length, 0);
      assert.equal((await db.query(`select id from public.appointments where id=$1`, [APPT_A1])).rows.length, 0);
    });

    await t.test('randevu/görev UPDATE: sahiplik kolu başkasının danışanına bağlayamaz', async () => {
      await asUser(db, PSY_A2);
      // Her iki kayıt A2'ye aittir; A2 aynı kurumdan A3'ün CLIENT_A2
      // dosyasını sadece ID'sini bilerek ilişkilendirememelidir.
      assert.equal(await denied(() => db.query(
        `update public.appointments set client_id=$2 where id=$1 returning id`,
        [APPT_A1, CLIENT_A2],
      )), true, 'randevu başka psikoloğun danışanına taşınmamalı');
      assert.equal(await denied(() => db.query(
        `update public.tasks set client_id=$2 where id=$1 returning id`,
        [TASK_A1, CLIENT_A2],
      )), true, 'görev başka psikoloğun danışanına taşınmamalı');

      // Yetki kontrolü sıkılaşsa da kendi danışanına düzenleme çalışmalı.
      assert.equal((await db.query(
        `update public.appointments set client_id=$2 where id=$1 returning id`,
        [APPT_A1, CLIENT_A1],
      )).rows.length, 1);
      assert.equal((await db.query(
        `update public.tasks set client_id=$2 where id=$1 returning id`,
        [TASK_A1, CLIENT_A1],
      )).rows.length, 1);
    });

    await t.test('eski/bozuk çapraz bağ: sahibine klinik metadata okunmaz', async () => {
      await asService(db);
      // Var olan hatalı bağlar silinmez, fakat A2'ye A3 dosyası gösterilmez.
      await db.query(`update public.appointments set client_id=$2 where id=$1`, [APPT_A1, CLIENT_A2]);
      await db.query(`update public.tasks set client_id=$2 where id=$1`, [TASK_A1, CLIENT_A2]);
      await asUser(db, PSY_A2);
      assert.equal((await db.query(`select id from public.appointments where id=$1`, [APPT_A1])).rows.length, 0);
      assert.equal((await db.query(`select id from public.tasks where id=$1`, [TASK_A1])).rows.length, 0);
      assert.equal(await denied(() => db.query(`delete from public.appointments where id=$1 returning id`, [APPT_A1])), true);
      assert.equal(await denied(() => db.query(`delete from public.tasks where id=$1 returning id`, [TASK_A1])), true);
      await asService(db);
      await db.query(`update public.appointments set client_id=$2 where id=$1`, [APPT_A1, CLIENT_A1]);
      await db.query(`update public.tasks set client_id=$2 where id=$1`, [TASK_A1, CLIENT_A1]);
    });

    await t.test('profiles_insert_self: keyfî organization_id ile profil açılamaz', async () => {
      await asUser(db, NO_PROFILE);
      assert.equal(
        await denied(() =>
          db.query(
            `insert into public.profiles(id, email, first_name, last_name, role, active, organization_id) values ($1,'x@test','Test','Kullanici','PSYCHOLOG',true,$2)`,
            [NO_PROFILE, ORG_B],
          ),
        ),
        true,
      );
      const ok = await db.query(
        `insert into public.profiles(id, email, first_name, last_name, role, active) values ($1,'x@test','Test','Kullanici','PSYCHOLOG',true) returning id`,
        [NO_PROFILE],
      );
      assert.equal(ok.rows.length, 1);
      // org'suz kullanıcı hiçbir klinik veriyi göremez
      assert.equal((await db.query(`select id from public.clients`)).rows.length, 0);
      await asService(db);
      await db.query(`delete from public.profiles where id=$1`, [NO_PROFILE]);
    });

    await t.test('anon: klinik tablolara erişemez', async () => {
      await asAnon(db);
      try {
        const rows = await db.query(`select id from public.clients`);
        assert.equal(rows.rows.length, 0);
      } catch (error) {
        assert.ok(/permission denied|42501/i.test(String((error as Error).message)));
      }
    });

    await t.test('storage: yalnız org öneki değil, client sahipliği de gerekir', async () => {
      await asUser(db, PSY_A2);
      const own = await db.query(`select id, name from storage.objects where bucket_id='client-documents'`);
      assert.equal(own.rows.length, 1);
      const ownObjectName = String(own.rows[0]!.name);

      await asUser(db, PSY_A3); // aynı org, farklı psikolog
      assert.equal((await db.query(`select id from storage.objects where bucket_id='client-documents'`)).rows.length, 0);

      await asUser(db, PSY_B);
      assert.equal((await db.query(`select id from storage.objects where bucket_id='client-documents'`)).rows.length, 0);

      // A → B (başka psikologun danışanı) klasörüne YÜKLEME reddedilir (P0-7).
      await asUser(db, PSY_A3);
      let crossUploadBlocked = false;
      try {
        const denied = await db.query(
          `insert into storage.objects(bucket_id, name, owner) values ('client-documents',$1,$2) returning id`,
          [`${ORG_A}/${CLIENT_A2}/kotu-niyet.pdf`, PSY_A3],
        );
        crossUploadBlocked = denied.rows.length === 0;
      } catch {
        crossUploadBlocked = true;
      }
      assert.equal(crossUploadBlocked, true, 'A, B danışanının klasörüne yükleyemez');

      // A3 (aynı org, farklı psikolog) A2'nin nesnesini silemez / güncelleyemez.
      await asUser(db, PSY_A3);
      let crossDeleteBlocked = false;
      try {
        const deleted = await db.query(
          `delete from storage.objects where bucket_id='client-documents' and name=$1 returning id`,
          [ownObjectName],
        );
        crossDeleteBlocked = deleted.rows.length === 0;
      } catch {
        crossDeleteBlocked = true;
      }
      assert.equal(crossDeleteBlocked, true, 'A3, A2 danışanının nesnesini silemez');

      let crossUpdateBlocked = false;
      try {
        const updated = await db.query(
          `update storage.objects set owner=$1 where bucket_id='client-documents' and name=$2 returning id`,
          [PSY_A3, ownObjectName],
        );
        crossUpdateBlocked = updated.rows.length === 0;
      } catch {
        crossUpdateBlocked = true;
      }
      assert.equal(crossUpdateBlocked, true, 'A3, A2 danışanının nesnesini güncelleyemez');

      await asUser(db, PSY_A2);
      assert.equal(
        (await db.query(`select id from storage.objects where name=$1`, [ownObjectName])).rows.length,
        1,
        'sahibinin nesnesi yerinde kalmalı',
      );

      // bozuk klasör yolu hata fırlatmamalı
      await asUser(db, PSY_A3);
      let brokenBlocked = false;
      try {
        const broken = await db.query(
          `insert into storage.objects(bucket_id, name, owner) values ('client-documents','not-a-uuid/also-bad/x.pdf',$1) returning id`,
          [PSY_A3],
        );
        brokenBlocked = broken.rows.length === 0;
      } catch {
        brokenBlocked = true;
      }
      assert.equal(brokenBlocked, true);
    });
  } finally {
    await db.close();
  }
});

/** Formülasyon/güvenlik tabloları M2 migration'ı ile gelir; yoksa test atlanır. */
test('phase7 RLS: formulations/safety_plans sahipliği', { timeout: 120000 }, async (t) => {
  const db = await createClinicalDb();
  try {
    await seedPhase7Scenario(db);
    const hasTable = await db.query(
      `select 1 from information_schema.tables where table_schema='public' and table_name='formulations'`,
    );
    if (hasTable.rows.length === 0) {
      t.skip('formulations tablosu henüz yok (P0-3 migration bekleniyor)');
      return;
    }

    await asUser(db, PSY_A2);
    await db.query(
      `insert into public.formulations(id, client_id, organization_id, content, status, created_by) values ($1,$2,$3,'{"predisposing":"x"}'::jsonb,'draft',$4)`,
      [FORM_A1, CLIENT_A1, ORG_A, PSY_A2],
    );
    await db.query(
      `insert into public.safety_plans(id, client_id, organization_id, content, status, created_by) values ($1,$2,$3,'{"warningSigns":"x"}'::jsonb,'draft',$4)`,
      [SAFETY_A1, CLIENT_A1, ORG_A, PSY_A2],
    );

    await asUser(db, PSY_A3);
    assert.equal((await db.query(`select id from public.formulations where id=$1`, [FORM_A1])).rows.length, 0);
    assert.equal((await db.query(`select id from public.safety_plans where id=$1`, [SAFETY_A1])).rows.length, 0);
    assert.equal(
      await (async () => {
        try {
          const r = await db.query(`update public.formulations set content='{"hack":true}'::jsonb where id=$1`, [FORM_A1]);
          return r.affectedRows === 0;
        } catch {
          return true;
        }
      })(),
      true,
    );

    await asUser(db, PSY_A2);
    assert.equal((await db.query(`select id from public.formulations where id=$1`, [FORM_A1])).rows.length, 1);
    assert.equal((await db.query(`select id from public.safety_plans where id=$1`, [SAFETY_A1])).rows.length, 1);

    await asUser(db, PSY_A2);
    assert.equal(
      await (async () => {
        try {
          await db.query(
            `insert into public.formulations(client_id, organization_id, content, created_by) values ($1,$2,'{}'::jsonb,$3)`,
            [CLIENT_B, ORG_B, PSY_A2],
          );
          return false;
        } catch {
          return true;
        }
      })(),
      true,
    );
  } finally {
    await db.close();
  }
});
