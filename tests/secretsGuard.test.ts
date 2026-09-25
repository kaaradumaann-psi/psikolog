import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, acc);
    else if (/\.(ts|tsx|js|mjs|jsonc|example)$/.test(entry.name)) acc.push(path);
  }
  return acc;
}

test('no VITE_ HMAC or service role in frontend sources', () => {
  const files = walk('src');
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.equal(/VITE_SSO_HMAC|VITE_.*SERVICE_ROLE|SSO_HMAC_SECRET\s*=/.test(text), false, file);
  }
});

test('.env.example does not contain service role values', () => {
  const text = readFileSync('.env.example', 'utf8');
  assert.equal(text.includes('VITE_SUPABASE_SERVICE'), false);
  assert.equal(/eyJ/.test(text), false);
});

test('built bundle does not embed HMAC secret name assignments', () => {
  if (!existsSync('dist')) return;
  const files = walk('dist');
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.equal(text.includes('SSO_HMAC_SECRET='), false, file);
    assert.equal(/SERVICE_ROLE_KEY/.test(text), false, file);
  }
});
