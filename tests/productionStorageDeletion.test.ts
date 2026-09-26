import assert from 'node:assert/strict';
import test from 'node:test';
import {
  asService, asUser, CLIENT_A2, createClinicalDb, ORG_A, PSY_A1, seedPhase7Scenario,
} from './pgliteHarness';

// LOCAL PGlite regression only. Real Supabase Storage API + RLS must also be
// exercised on a disposable test client; this is not a live bucket test.
test('danışan silme: metadata cascade özel Storage nesnesini sahipsiz bırakamaz', { timeout: 120000 }, async () => {
  const db = await createClinicalDb();
  try {
    await seedPhase7Scenario(db);
    const path = `${ORG_A}/${CLIENT_A2}/consent.pdf`;
    await asService(db);
    await db.query(
      `insert into public.documents(client_id, organization_id, file_path, file_name, mime_type, size_bytes, created_by)
       values ($1,$2,$3,'consent.pdf','application/pdf',1024,$4)`,
      [CLIENT_A2, ORG_A, path, PSY_A1],
    );
    await db.query(
      `insert into storage.objects(bucket_id, name, owner) values ('client-documents',$1,$2)`,
      [path, PSY_A1],
    );
    await asUser(db, PSY_A1);
    await assert.rejects(
      () => db.query('delete from public.clients where id=$1 returning id', [CLIENT_A2]),
      /Danışana ait belgeler|23503/i,
    );
    const row = await db.query('select id from public.clients where id=$1', [CLIENT_A2]);
    assert.equal(row.rows.length, 1, 'hatalı cascade danışanı silmemeli');
    const metadata = await db.query('select id from public.documents where client_id=$1', [CLIENT_A2]);
    assert.equal(metadata.rows.length, 1, 'hatalı cascade metadata satırını silmemeli');

    // Even if metadata was removed first, the object alone must still block.
    await db.query('delete from public.documents where client_id=$1', [CLIENT_A2]);
    await assert.rejects(
      () => db.query('delete from public.clients where id=$1 returning id', [CLIENT_A2]),
      /Danışana ait belgeler|23503/i,
    );
    await db.query(`delete from storage.objects where bucket_id='client-documents' and name=$1`, [path]);
    const removed = await db.query('delete from public.clients where id=$1 returning id', [CLIENT_A2]);
    assert.equal(removed.rows.length, 1, 'nesne kalktıktan sonra silme yapılabilmeli');
  } finally {
    await db.close();
  }
});
