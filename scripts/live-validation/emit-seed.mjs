#!/usr/bin/env node
/**
 * PHASE 7 / P0-8 — seed SQL'ini test kullanıcı e-postalarıyla doldurur.
 *
 * Neden: `seed-live-test-orgs.sql` içindeki üç e-posta elle düzenlenmesi gereken
 * tek yerdir; canlı koşularda bu adım atlandığında RLS matrisi koşulamıyor
 * ("kurum ataması → FAIL"). Bu betik, `.env.live` içindeki test e-postalarını
 * şablona yerleştirip SQL Editor'a yapıştırılmaya hazır bir dosya üretir.
 *
 * KULLANIM
 *   node scripts/live-validation/emit-seed.mjs
 *   node scripts/live-validation/emit-seed.mjs --out /tmp/seed.sql
 *
 * ÇIKTI: `live-seed.local.sql` (gitignore'da). Parola/anahtar OKUNMAZ ve YAZILMAZ;
 * yalnızca e-posta adresleri yerleştirilir.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const TEMPLATE = 'scripts/live-validation/seed-live-test-orgs.sql';
const DEFAULT_OUT = 'live-seed.local.sql';

const PLACEHOLDERS = {
  A: 'test-psikolog-a@example.com',
  B: 'test-psikolog-b@example.com',
  ADMIN: 'test-admin@example.com',
};

/** E-postayı ekranda göstermek için maskeler (parola asla okunmaz). */
export function maskEmail(email) {
  const [user = '', domain = ''] = String(email ?? '').split('@');
  if (!domain) return '(geçersiz)';
  const head = user.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(user.length - 1, 1))}@${domain}`;
}

/** Şablondaki üç placeholder e-postayı verilenlerle değiştirir. */
export function renderSeed(template, emails) {
  let sql = template;
  const applied = {};
  for (const [slot, placeholder] of Object.entries(PLACEHOLDERS)) {
    const value = emails[slot];
    if (!value) throw new Error(`${slot} için e-posta verilmedi (LIVE_PSY_${slot}_EMAIL / LIVE_ADMIN_EMAIL)`);
    if (!sql.includes(placeholder)) throw new Error(`Şablonda ${slot} placeholder'ı bulunamadı: ${placeholder}`);
    sql = sql.split(placeholder).join(value);
    applied[slot] = value;
  }
  return { sql, applied };
}

function loadEnvFile(path = '.env.live') {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

function envValue(name, envFile) {
  if (process.env[name]) return process.env[name];
  for (const line of envFile.split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (match && match[1] === name) return match[2].replace(/^["']|["']$/g, '');
  }
  return undefined;
}

function main() {
  const envFile = loadEnvFile();
  const outIndex = process.argv.indexOf('--out');
  const out = outIndex >= 0 ? process.argv[outIndex + 1] : DEFAULT_OUT;
  if (!out) {
    console.error('✘ --out parametresinden sonra bir dosya yolu verin.');
    process.exit(2);
  }

  const emails = {
    A: envValue('LIVE_PSY_A_EMAIL', envFile),
    B: envValue('LIVE_PSY_B_EMAIL', envFile),
    ADMIN: envValue('LIVE_ADMIN_EMAIL', envFile),
  };
  const missing = Object.entries(emails)
    .filter(([, value]) => !value)
    .map(([slot]) => (slot === 'ADMIN' ? 'LIVE_ADMIN_EMAIL' : `LIVE_PSY_${slot}_EMAIL`));
  if (missing.length) {
    console.error(`✘ Eksik ortam değişkenleri: ${missing.join(', ')}`);
    console.error('  Değerleri `.env.live` dosyasına yazın (repoya girmez) veya ortam değişkeni olarak verin.');
    process.exit(2);
  }

  let template;
  try {
    template = readFileSync(TEMPLATE, 'utf8');
  } catch {
    console.error(`✘ Şablon bulunamadı: ${TEMPLATE} (repo kökünden çalıştırın)`);
    process.exit(2);
  }

  let rendered;
  try {
    rendered = renderSeed(template, emails);
  } catch (error) {
    console.error(`✘ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  writeFileSync(out, rendered.sql, 'utf8');

  console.log('\n=== PHASE 7 / P0-8 — seed SQL hazırlandı ===');
  console.log(`  Şablon : ${TEMPLATE}`);
  console.log(`  Çıktı  : ${out}  (gitignore'da — repoya girmez)`);
  for (const [slot, email] of Object.entries(rendered.applied)) {
    console.log(`  ${slot.padEnd(5)}  : ${maskEmail(email)}`);
  }
  console.log('\nSonraki adım:');
  console.log('  1) Supabase Dashboard → SQL Editor → dosya içeriğini yapıştırıp çalıştırın');
  console.log('  2) Beklenen çıktı: A/B/ADMIN satırlarında durum = HAZIR');
  console.log('     ve sonuç satırı: "A ve B kurum ataması TAMAM → ..."');
  console.log('  3) node scripts/live-validation/run.mjs\n');
}

// Doğrudan çalıştırıldığında main(); test için import edildiğinde yalnız fonksiyonlar yüklenir.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
