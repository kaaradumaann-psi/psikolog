/**
 * P0-8 — `scripts/live-validation/verify-migrations.sql` betiğinin SQL sağlığı (PGlite).
 *
 * Bu betik canlı Supabase SQL Editor'da çalıştırılan salt-okur kontrol dosyasıdır.
 * Burada gerçek PostgreSQL üzerinde (harness'ın uyguladığı migration'larla):
 *   1) hatasız çalıştığını,
 *   2) tüm nesne kontrollerinin OK döndüğünü,
 *   3) "semptom" satırının şemayı hazır bildirdiğini
 * doğrularız.
 *
 * NOT: PGlite yardımcı doğrulamadır; LIVE SUPABASE sonucu yerine geçmez.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createClinicalDb } from './pgliteHarness';

const VERIFY_SQL = readFileSync('scripts/live-validation/verify-migrations.sql', 'utf8');

const EXPECTED_VERSIONS = [
  '20260924000000',
  '20260924000001',
  '20260924000002',
  '20260924000003',
  '20260924000004',
  '20260924000005',
  '20260924000006',
  '20260925100000',
  '20260925110000',
  '20260925120000',
  '20260925130000',
];

test('verify-migrations.sql — canlı şema görünüyor, eksik nesne yok', async () => {
  const db = await createClinicalDb();

  // CLI migration geçmişi şeması canlıda vardır; harness'ta taklit edilir.
  await db.exec(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations(version text primary key, name text);
  `);
  await db.query(
    `insert into supabase_migrations.schema_migrations(version, name)
     select v, 'harness' from unnest($1::text[]) as v on conflict (version) do nothing`,
    [EXPECTED_VERSIONS],
  );

  const results = (await db.exec(VERIFY_SQL)) as Array<{ rows?: Array<Record<string, unknown>> }>;

  const allRows = results.flatMap((r) => r.rows ?? []);

  // 1) Nesne kontrol listesi: hiç "EKSİK" satırı olmamalı
  const objectRows = allRows.filter((row) => 'check_name' in row);
  assert.ok(objectRows.length > 25, `nesne kontrolü sayısı beklenenden az: ${objectRows.length}`);
  const missing = objectRows.filter((row) => row.status === 'EKSİK').map((row) => row.check_name);
  assert.deepEqual(missing, [], `canlı şemada eksik nesneler: ${missing.join(', ')}`);

  // 2) Semptom satırı şemayı hazır bildirmeli
  const verdict = allRows.find((row) => 'semptom' in row);
  assert.ok(verdict, 'semptom satırı üretilmeli');
  assert.match(String(verdict.semptom), /PHASE 7 ŞEMASI CANLIDA GÖRÜNÜYOR/);

  // 3) Migration geçmişi karşılaştırması: 11 sürümün tamamı uygulanmış olmalı
  const historyRows = allRows.filter((row) => 'uygulanmis' in row);
  assert.equal(historyRows.length, EXPECTED_VERSIONS.length);
  const notApplied = historyRows.filter((row) => row.uygulanmis !== true).map((row) => row.version);
  assert.deepEqual(notApplied, [], `uygulanmamış migration: ${notApplied.join(', ')}`);

  // 4) Bucket kontrolü (storage.buckets) listede olmalı
  assert.ok(
    objectRows.some((row) => String(row.check_name).includes('client-documents')),
    'bucket kontrolü eksik',
  );
});
