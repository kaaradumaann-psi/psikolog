import assert from 'node:assert/strict';
import test from 'node:test';
import { clinicalAccessAllowed, resolveAccessMode } from '../src/auth/accessMode.ts';

test('access mode: configured Supabase always requires real login', () => {
  assert.equal(resolveAccessMode({ configured: true, isDev: false }), 'cloud');
  assert.equal(resolveAccessMode({ configured: true, isDev: true }), 'cloud');
});

test('access mode: local workspace is reachable only in a development build', () => {
  assert.equal(resolveAccessMode({ configured: false, isDev: true }), 'local-dev');
});

test('access mode: production build without backend serves nothing clinical', () => {
  assert.equal(resolveAccessMode({ configured: false, isDev: false }), 'not-ready');
  assert.equal(clinicalAccessAllowed('not-ready'), false);
  assert.equal(clinicalAccessAllowed('cloud'), true);
  assert.equal(clinicalAccessAllowed('local-dev'), true);
});
