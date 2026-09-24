import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRoute } from '../src/app/router.ts';

test('parseRoute handles dashboard', () => {
  assert.deepEqual(parseRoute('/'), { page: 'dashboard' });
  assert.deepEqual(parseRoute('/dashboard'), { page: 'dashboard' });
});

test('parseRoute handles clients', () => {
  assert.deepEqual(parseRoute('/clients'), { page: 'clients' });
  assert.deepEqual(parseRoute('/clients/new'), { page: 'client_new' });
});

test('parseRoute handles client file with tab', () => {
  const r = parseRoute('/clients/123', '?tab=anamnez');
  assert.deepEqual(r, { page: 'client', id: '123', tab: 'anamnez' });
});

test('parseRoute handles trailing slash', () => {
  assert.deepEqual(parseRoute('/clients/'), { page: 'clients' });
  assert.deepEqual(parseRoute('/clients/123/'), { page: 'client', id: '123', tab: undefined });
});

test('parseRoute handles appointments and tasks', () => {
  assert.deepEqual(parseRoute('/appointments'), { page: 'appointments' });
  assert.deepEqual(parseRoute('/tasks'), { page: 'tasks' });
  assert.deepEqual(parseRoute('/settings'), { page: 'settings' });
  assert.deepEqual(parseRoute('/admin'), { page: 'admin' });
  assert.deepEqual(parseRoute('/audit'), { page: 'audit' });
});

test('parseRoute returns not_found for unknown', () => {
  assert.deepEqual(parseRoute('/unknown/path'), { page: 'not_found' });
  assert.deepEqual(parseRoute('/clients/123/extra'), { page: 'not_found' });
});
