import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN, ORG_A, ORG_B, PSY_A1, PSY_A2, PSY_A3, PSY_B,
  asUser, createClinicalDb, seedPhase7Scenario,
} from './pgliteHarness';

// LOCAL PostgreSQL/RLS test: no real user, org or clinical row is changed.
test('kurumsuz ADMIN: yalnız yetkili RPC ile kurum oluşturabilir ve profiline bağlayabilir', { timeout: 120000 }, async () => {
  const db = await createClinicalDb();
  try {
    await seedPhase7Scenario(db);
    await asUser(db, ADMIN);
    const before = await db.query<{ role: string; organization_id: string | null }>(
      'select role, organization_id from public.profiles where id=$1', [ADMIN],
    );
    assert.equal(before.rows[0]?.role, 'ADMIN');
    assert.equal(before.rows[0]?.organization_id, null);
    const organizations = await db.query('select id from public.admin_list_organizations()');
    assert.equal(organizations.rows.length, 2);
    const created = await db.query<{ id: string }>(
      'select id from public.admin_create_organization($1)', ['Yeni Test Kurumu'],
    );
    const own = await db.query<{ role: string; organization_id: string }>(
      `select role, organization_id from public.admin_update_profile(
        $1, 'ADMIN'::public.user_role, true, $2
      )`, [ADMIN, created.rows[0]!.id],
    );
    assert.equal(own.rows[0]?.role, 'ADMIN');
    assert.equal(own.rows[0]?.organization_id, created.rows[0]!.id);

    await asUser(db, PSY_A2);
    await assert.rejects(() => db.query('select id from public.admin_list_organizations()'), /Yetkisiz/i);
    await assert.rejects(() => db.query('select id from public.admin_create_organization($1)', ['Sahte Kurum']), /Yetkisiz/i);
    await assert.rejects(
      () => db.query(
        `select id from public.admin_update_profile($1, 'ADMIN'::public.user_role, true, $2)`,
        [PSY_A2, ORG_B],
      ), /Yetkisiz/i,
    );
    const unchanged = await db.query<{ role: string; organization_id: string }>(
      'select role, organization_id from public.profiles where id=$1', [PSY_A2],
    );
    assert.equal(unchanged.rows[0]?.role, 'PSYCHOLOG');
    assert.equal(unchanged.rows[0]?.organization_id, ORG_A);
  } finally {
    await db.close();
  }
});

test('kurum profil izolasyonu: psikolog yalnız kendisini, kurum yöneticisi kendi kurumunu, sistem admini tümünü görür', { timeout: 120000 }, async () => {
  const db = await createClinicalDb();
  try {
    await seedPhase7Scenario(db);
    await asUser(db, PSY_A2);
    assert.equal((await db.query('select id from public.profiles where id=$1', [PSY_A2])).rows.length, 1);
    assert.equal((await db.query('select id from public.profiles where id=$1', [PSY_A3])).rows.length, 0,
      'aynı kurumdaki meslektaş profili/epostası görünmemeli');
    assert.equal((await db.query('select id from public.profiles where id=$1', [PSY_B])).rows.length, 0);
    await asUser(db, PSY_A1);
    assert.equal((await db.query('select id from public.profiles where id=$1', [PSY_A3])).rows.length, 1);
    assert.equal((await db.query('select id from public.profiles where id=$1', [PSY_B])).rows.length, 0);
    await asUser(db, ADMIN);
    assert.equal((await db.query('select id from public.profiles where id=$1', [PSY_B])).rows.length, 1);
  } finally {
    await db.close();
  }
});

test('kurum RLS: kurum yöneticisi başka kurumun adını değiştiremez, kendi kurumunu değiştirebilir', { timeout: 120000 }, async () => {
  const db = await createClinicalDb();
  try {
    await seedPhase7Scenario(db);
    await asUser(db, PSY_A1);
    await db.query(
      `update public.organizations set name='Yanlış güncelleme' where id=$1`, [ORG_B],
    );
    await asUser(db, ADMIN);
    const other = await db.query<{ name: string }>(
      `select name from public.organizations where id=$1`, [ORG_B],
    );
    assert.equal(other.rows[0]?.name, 'Org B', 'ORG_ADMIN başka kurumun kaydını güncelleyememeli');
    await asUser(db, PSY_A1);
    const own = await db.query(
      `update public.organizations set name='Doğru Kurum' where id=$1 returning id`, [ORG_A],
    );
    assert.equal(own.rows.length, 1);
  } finally {
    await db.close();
  }
});
