import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIENT_A1,
  CLIENT_A2,
  ORG_A,
  PSY_A2,
  TEST_ADMIN_A1,
  TEST_RESULT_A1,
  createClinicalDb,
  istanbulToday,
  seedPhase7Scenario,
} from './pgliteHarness';

const REVISION_2 = '10101010-1010-4010-8010-101010101010';
const REVISION_2_RESULT = '20202020-2020-4020-8020-202020202020';
const INVALID_REVISION = '30303030-3030-4030-8030-303030303030';

test('tamamlanmış bulut testleri append-only kalır ve revizyon zinciri veritabanında doğrulanır', async (t) => {
  const db = await createClinicalDb();
  t.after(async () => db.close());
  await seedPhase7Scenario(db);

  await t.test('tamamlanmış uygulama ve sonuç no-op retry sırasında zaman damgasını değiştirmez', async () => {
    const beforeAdmin = await db.query<{ updated_at: string }>('select updated_at from public.test_administrations where id=$1', [TEST_ADMIN_A1]);
    const beforeResult = await db.query<{ updated_at: string }>('select updated_at from public.test_results where id=$1', [TEST_RESULT_A1]);
    await db.query('update public.test_administrations set notes=notes where id=$1', [TEST_ADMIN_A1]);
    await db.query('update public.test_results set result_data=result_data, summary=summary where id=$1', [TEST_RESULT_A1]);
    const afterAdmin = await db.query<{ updated_at: string }>('select updated_at from public.test_administrations where id=$1', [TEST_ADMIN_A1]);
    const afterResult = await db.query<{ updated_at: string }>('select updated_at from public.test_results where id=$1', [TEST_RESULT_A1]);
    assert.equal(String(afterAdmin.rows[0]?.updated_at), String(beforeAdmin.rows[0]?.updated_at));
    assert.equal(String(afterResult.rows[0]?.updated_at), String(beforeResult.rows[0]?.updated_at));
  });

  await t.test('tamamlanmış uygulama ve sonuçta esaslı update reddedilir', async () => {
    await assert.rejects(
      db.query("update public.test_administrations set notes='değişti' where id=$1", [TEST_ADMIN_A1]),
      /değiştirilemez/i,
    );
    await assert.rejects(
      db.query("update public.test_results set result_data='{\"totalScore\":13}'::jsonb where id=$1", [TEST_RESULT_A1]),
      /değiştirilemez/i,
    );
  });

  await t.test('tamamlanmış uygulama ve sonuç silinemez', async () => {
    await assert.rejects(db.query('delete from public.test_results where id=$1', [TEST_RESULT_A1]), /silinemez/i);
    await assert.rejects(db.query('delete from public.test_administrations where id=$1', [TEST_ADMIN_A1]), /silinemez/i);
  });

  await t.test('aynı danışan ve araç için ardışık revizyon ayrı uygulama ve sonuç olarak eklenir', async () => {
    await db.query(
      `insert into public.test_administrations
       (id, client_id, test_definition_id, organization_id, administration_date, status, created_by,
        instrument_version, scoring_version, revision, amendment_of)
       values ($1,$2,'00000000-0000-4000-8000-000000000002',$3,$4,'completed',$5,'BDI-1996','BDI-scoring-v1',2,$6)`,
      [REVISION_2, CLIENT_A1, ORG_A, istanbulToday(), PSY_A2, TEST_ADMIN_A1],
    );
    await db.query(
      `insert into public.test_results(id,test_administration_id,organization_id,result_data,summary)
       values ($1,$2,$3,'{"totalScore":13,"revision":2}'::jsonb,'BDI ham toplam 13')`,
      [REVISION_2_RESULT, REVISION_2, ORG_A],
    );
    const rows = await db.query<{ revision: number; amendment_of: string }>(
      'select revision, amendment_of from public.test_administrations where id=$1',
      [REVISION_2],
    );
    assert.equal(rows.rows[0]?.revision, 2);
    assert.equal(rows.rows[0]?.amendment_of, TEST_ADMIN_A1);
    const audit = await db.query<{ action: string }>(
      'select action from public.audit_logs where target_id=$1 order by created_at desc limit 1',
      [REVISION_2],
    );
    assert.equal(audit.rows[0]?.action, 'test_admin_revision');
  });

  await t.test('dal oluşturan ikinci ardıl ve araç/danışan uyuşmazlığı reddedilir', async () => {
    await assert.rejects(
      db.query(
        `insert into public.test_administrations
         (id,client_id,test_definition_id,organization_id,administration_date,status,created_by,revision,amendment_of)
         values ($1,$2,'00000000-0000-4000-8000-000000000002',$3,$4,'completed',$5,2,$6)`,
        [INVALID_REVISION, CLIENT_A1, ORG_A, istanbulToday(), PSY_A2, TEST_ADMIN_A1],
      ),
      /unique|duplicate/i,
    );
    await assert.rejects(
      db.query(
        `insert into public.test_administrations
         (id,client_id,test_definition_id,organization_id,administration_date,status,created_by,revision,amendment_of)
         values ($1,$2,'00000000-0000-4000-8000-000000000002',$3,$4,'completed',$5,3,$6)`,
        [INVALID_REVISION, CLIENT_A2, ORG_A, istanbulToday(), PSY_A2, REVISION_2],
      ),
      /revizyon zinciri/i,
    );
  });
});
