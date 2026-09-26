import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

/**
 * Kaynak-kodu korumaları: bu testler davranışı değil, geri gelmemesi gereken
 * yapısal gerçekleri doğrular. Her biri daha önce bu depoda ihlal edilmişti,
 * bu yüzden "temiz görünüm" yerine statik kanıtla sabitlenir.
 */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const sources = walk('src');
const tsx = sources.filter((file) => file.endsWith('.tsx'));

test('UI never uses native alert/confirm/prompt', () => {
  const offenders: string[] = [];
  for (const file of tsx) {
    const text = readFileSync(file, 'utf8');
    // role="alert" / aria-live gibi bildirimler hariç: yalnız fonksiyon çağrıları aranır.
    for (const match of text.matchAll(/(?:^|[^.\w])(alert|confirm|prompt)\s*\(/g)) {
      offenders.push(`${relative('..', file)} → ${match[1]}()`);
    }
  }
  assert.deepEqual(offenders, [], 'Yerel tarayıcı diyalogları klinik üründe kullanılamaz: useConfirmDialog kullanın.');
});

test('clinical stores do not touch localStorage outside the account scope', () => {
  const offenders: string[] = [];
  for (const file of sources) {
    if (file.endsWith('storageScope.ts') || file.endsWith('authStorage.ts')) continue;
    const text = readFileSync(file, 'utf8');
    if (/localStorage/.test(text)) offenders.push(relative('..', file));
  }
  assert.deepEqual(offenders, [], 'Hesap kapsamsız localStorage erişimi iki kullanıcının verisini karıştırır.');
});

test('browser code never references the service role key', () => {
  const offenders: string[] = [];
  for (const file of sources) {
    const text = readFileSync(file, 'utf8');
    if (/service_role|SERVICE_ROLE/.test(text)) offenders.push(relative('..', file));
  }
  assert.deepEqual(offenders, [], 'service_role anahtarı tarayıcı koduna giremez.');
});

test('no clinical write path is missing the audit trail', () => {
  const store = readFileSync('src/clinical/clinicalStore.ts', 'utf8');
  const practice = readFileSync('src/clinical/practiceStore.ts', 'utf8');
  for (const fn of ['saveSoapSession', 'deleteSoapSession', 'saveAppointment', 'deleteAppointment', 'saveClinicalReport', 'deleteClinicalReport', 'saveBeckDepressionTest', 'saveBeckAnxietyTest', 'saveScl90Test']) {
    const body = store.slice(store.indexOf(`export function ${fn}`));
    const chunk = body.slice(0, body.indexOf('\n}\n') + 3);
    assert.match(chunk, /audit\(|recordAudit\(/, `${fn} denetim izi bırakmıyor`);
  }
  for (const fn of ['saveScreening', 'deleteScreening']) {
    const body = practice.slice(practice.indexOf(`export function ${fn}`));
    assert.match(body.slice(0, body.indexOf('\n}\n') + 3), /recordAudit\(/, `${fn} denetim izi bırakmıyor`);
  }
});

test('newest migration replaces every policy it drops (tighten only, never remove)', () => {
  const files = readdirSync('supabase/migrations').sort();
  const latest = files[files.length - 1];
  assert.equal(latest, '20260924000007_clinical_record_isolation.sql');
  const sql = readFileSync(join('supabase/migrations', latest), 'utf8');
  const dropped = [...sql.matchAll(/drop policy if exists "?([a-z_]+)"? on ([a-z_.]+)/g)].map((m) => `${m[1]}@${m[2]}`);
  const created = new Set([...sql.matchAll(/create policy "?([a-z_]+)"? on ([a-z_.]+)/g)].map((m) => `${m[1]}@${m[2]}`));
  for (const key of dropped) assert.ok(created.has(key), `${key} silindi ama yerine politika yazılmadı`);
  assert.ok(dropped.length >= 8, `beklenen sıkılaştırma sayısı düştü: ${dropped.length}`);
  assert.doesNotMatch(sql, /force row level security/, 'force RLS platform erişimini kırabilir; bu göçün işi değil');
  assert.doesNotMatch(sql, /drop policy if exists "?client_docs_select"? on storage\.objects;\s*\n\s*--\s*yok/, 'storage select politikası sahipsiz bırakılamaz');
});

test('print stylesheet keeps clinical output usable on paper', () => {
  const css = readFileSync('src/styles/clinical.css', 'utf8');
  assert.match(css, /@page\s*\{[\s\S]*?margin/, 'sayfa kenar boşluğu tanımlı değil');
  assert.match(css, /@media print[\s\S]*\.btn-print-hide[\s\S]*display:\s*none/, 'aksiyon düğmeleri yazdırmada gizlenmiyor');
  const caption = css.match(/\.print-section-caption/);
  assert.ok(caption, 'yazdırma başlığı (kim + bölüm) yok');
});
