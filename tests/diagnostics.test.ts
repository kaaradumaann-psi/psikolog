import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

/**
 * Canlı teşhis betiği (`scripts/diagnose-supabase.mjs`) sözleşmesi.
 *
 * Betik, canlı Supabase projesinin migration geçmişini depodaki dosyalarla
 * karşılaştırır. Listeyi elle tutmak kolayca sürüklenir (yeni migration eklenir,
 * betik eskisini bekler ve sağlıklı kurulumu "eksik" diye raporlar). Bu test
 * iki listeyi aynı kalmaya zorlar.
 */

const script = readFileSync('scripts/diagnose-supabase.mjs', 'utf8');

test('teşhis betiği sözdizimsel olarak geçerli bir Node betiğidir', () => {
  execFileSync(process.execPath, ['--check', 'scripts/diagnose-supabase.mjs'], { stdio: 'pipe' });
});

test('betikteki beklenen migration listesi supabase/migrations ile birebir aynı', () => {
  const match = /const EXPECTED_MIGRATIONS = \[([\s\S]*?)\];/.exec(script);
  assert.ok(match, 'EXPECTED_MIGRATIONS listesi bulunamadı');
  const expected = [...match[1]!.matchAll(/'(\d{14})'/g)].map(entry => entry[1]!);
  const onDisk = readdirSync('supabase/migrations')
    .filter(name => name.endsWith('.sql'))
    .map(name => name.slice(0, 14))
    .sort();
  assert.deepEqual(expected.slice().sort(), onDisk,
    'yeni bir migration eklendiğinde/silindiğinde scripts/diagnose-supabase.mjs listesi güncellenmelidir');
});

test('betik iki Edge Function’ı ve ALLOWED_ORIGINS sözleşmesini de denetler', () => {
  for (const needle of ['admin-users', 'ai-interpretation', 'ALLOWED_ORIGINS', 'audit_logs', '--allow-destructive']) {
    assert.ok(script.includes(needle), `teşhis betiği ${needle} denetimini içermiyor`);
  }
});

test('betik yazma testini yalnızca açık bayrakla çalıştırır (varsayılan salt-okunur)', () => {
  assert.match(script, /const DESTRUCTIVE = args\.flags\.has\('allow-destructive'\);/);
  assert.match(script, /if \(DESTRUCTIVE\)/);
  // Teşhis kullanıcısı ve kayıtları gerçek danışan verisine dokunmamalıdır.
  assert.match(script, /@example\.invalid/, 'diagnostik kullanıcı örnek alan adı kullanmalı');
});

test('package.json teşhis komutunu tanımlar ve komut doğru dosyaya bağlıdır', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts['diagnose:supabase'], 'node scripts/diagnose-supabase.mjs');
});

test('TROUBLESHOOTING.md mevcut çözüm sırasını ve teşhis komutunu belgeler', () => {
  const doc = readFileSync('TROUBLESHOOTING.md', 'utf8');
  for (const needle of ['supabase db push', 'supabase functions deploy admin-users', 'ALLOWED_ORIGINS', 'npm run diagnose:supabase']) {
    assert.ok(doc.includes(needle), `TROUBLESHOOTING.md ${needle} adımını içermiyor`);
  }
});
