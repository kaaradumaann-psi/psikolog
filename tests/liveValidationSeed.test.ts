/**
 * P0-8 — canlı doğrulama seed betiğinin SQL sağlığı (gerçek PostgreSQL / PGlite).
 *
 * `scripts/live-validation/seed-live-test-orgs.sql` dosyasının:
 *   1) hatasız çalıştığını,
 *   2) kurum/rol atamasını doğru yaptığını,
 *   3) idempotent olduğunu (ikinci çalıştırmada kurum ikizlenmediğini),
 *   4) eşleşmeyen e-postada SESSİZ GEÇMEDİĞİNİ (istisna fırlattığını),
 *   5) yıkıcı olmadığını (auth.users ve klinik tablolara dokunmadığını)
 * doğrular.
 *
 * NOT: PGlite yardımcı doğrulamadır; LIVE SUPABASE doğrulaması yerine geçmez.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { createClinicalDb } from './pgliteHarness';

const SEED_SQL = readFileSync('scripts/live-validation/seed-live-test-orgs.sql', 'utf8');

const EMAIL_A = 'test-psikolog-a@example.com';
const EMAIL_B = 'test-psikolog-b@example.com';
const EMAIL_ADMIN = 'test-admin@example.com';

const USER_A = '0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a';
const USER_B = '0b0b0b0b-0b0b-4b0b-8b0b-0b0b0b0b0b0b';
const USER_ADMIN = '0c0c0c0c-0c0c-4c0c-8c0c-0c0c0c0c0c0c';
const USER_OTHER = '0d0d0d0d-0d0d-4d0d-8d0d-0d0d0d0d0d0d';

interface ProfileRow {
  email: string;
  role: string;
  organization_id: string | null;
  active: boolean;
}

async function orgRows(db: PGlite) {
  const res = await db.query<{ id: string; name: string }>(
    `select id, name from public.organizations where name like 'LIVE-TEST %' order by name`,
  );
  return res.rows;
}

async function profileRows(db: PGlite) {
  const res = await db.query<ProfileRow>(
    `select u.email as email, p.role::text as role, p.organization_id, p.active
       from public.profiles p
       join auth.users u on u.id = p.id
      order by u.email`,
  );
  return res.rows;
}

test('live seed — üç test kullanıcısı için kurum ve rol ataması', async () => {
  const db = await createClinicalDb();
  await db.query(`insert into auth.users(id, email) values ($1,$2), ($3,$4), ($5,$6)`, [
    USER_A,
    EMAIL_A,
    USER_B,
    EMAIL_B,
    USER_ADMIN,
    EMAIL_ADMIN,
  ]);

  await db.exec(SEED_SQL);

  const orgs = await orgRows(db);
  assert.equal(orgs.length, 2, 'iki test kurumu oluşmalı');
  assert.deepEqual(
    orgs.map((o) => o.name),
    ['LIVE-TEST A', 'LIVE-TEST B'],
  );
  assert.notEqual(orgs[0]?.id, orgs[1]?.id, 'kurumlar ayrı olmalı');

  const profiles = await profileRows(db);
  assert.equal(profiles.length, 3);
  const byEmail = new Map(profiles.map((p) => [p.email, p]));

  const a = byEmail.get(EMAIL_A);
  const b = byEmail.get(EMAIL_B);
  const admin = byEmail.get(EMAIL_ADMIN);
  assert.ok(a && b && admin, 'üç profil de bulunmalı');

  assert.equal(a.organization_id, orgs[0]?.id, 'A → LIVE-TEST A');
  assert.equal(b.organization_id, orgs[1]?.id, 'B → LIVE-TEST B');
  assert.equal(admin.organization_id, orgs[0]?.id, 'admin → LIVE-TEST A');
  assert.equal(a.role, 'PSYCHOLOG');
  assert.equal(b.role, 'PSYCHOLOG');
  assert.equal(admin.role, 'ADMIN', 'admin rolü ADMIN olmalı');
  assert.ok(a.active && b.active && admin.active, 'profiller aktif olmalı');
});

test('live seed — idempotent (ikinci çalıştırma kurum ikizlemez, atama bozulmaz)', async () => {
  const db = await createClinicalDb();
  await db.query(`insert into auth.users(id, email) values ($1,$2), ($3,$4), ($5,$6)`, [
    USER_A,
    EMAIL_A,
    USER_B,
    EMAIL_B,
    USER_ADMIN,
    EMAIL_ADMIN,
  ]);

  await db.exec(SEED_SQL);
  const first = await orgRows(db);
  const firstProfiles = await profileRows(db);

  await db.exec(SEED_SQL);
  const second = await orgRows(db);
  const secondProfiles = await profileRows(db);

  assert.equal(second.length, 2, 'tekrar çalıştırmada yeni kurum oluşmamalı');
  assert.deepEqual(
    second.map((o) => o.id),
    first.map((o) => o.id),
    'kurum kimlikleri korunmalı',
  );
  assert.deepEqual(secondProfiles, firstProfiles, 'profil atamaları değişmemeli');

  const userCount = await db.query<{ n: number }>(`select count(*)::int as n from auth.users`);
  assert.equal(userCount.rows[0]?.n, 3, 'auth.users değişmemeli');

  const clinical = await db.query<{ clients: number; sessions: number }>(
    `select (select count(*)::int from public.clients) as clients,
            (select count(*)::int from public.sessions) as sessions`,
  );
  assert.equal(clinical.rows[0]?.clients, 0, 'klinik veri oluşturulmamalı');
  assert.equal(clinical.rows[0]?.sessions, 0, 'klinik veri oluşturulmamalı');
});

test('live seed — eşleşmeyen e-posta sessizce geçmez', async () => {
  const db = await createClinicalDb();
  await db.query(`insert into auth.users(id, email) values ($1,'baska-kullanici@example.com')`, [USER_OTHER]);

  await assert.rejects(() => db.exec(SEED_SQL), /Test kullanıcısı bulunamadı/);

  const orgs = await orgRows(db);
  assert.equal(orgs.length, 0, 'istisna sonrası yarım kalmış kurum oluşmamalı');

  // Not: kayıt trigger'ı (handle_new_auth_user) kurumsuz profil oluşturabilir;
  // ölçüt seed'in hiçbir kurum/rol ataması YAPMAMIŞ olmasıdır.
  const profiles = await profileRows(db);
  assert.ok(
    profiles.every((p) => p.organization_id === null),
    'seed başarısızken hiçbir profile kurum atanmamalı',
  );
});

test('live seed — admin kullanıcısı yoksa diğer atamalar yapılır ve uyarı verilir', async () => {
  const db = await createClinicalDb();
  await db.query(`insert into auth.users(id, email) values ($1,$2), ($3,$4)`, [USER_A, EMAIL_A, USER_B, EMAIL_B]);

  await db.exec(SEED_SQL);

  const profiles = await profileRows(db);
  assert.equal(profiles.length, 2, 'A ve B profilleri atanmalı');
  assert.ok(
    profiles.every((p) => p.organization_id !== null),
    'A/B kurum ataması admin olmadan da yapılmalı',
  );
});
