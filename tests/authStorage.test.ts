import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_STORAGE_KEY, createAuthStorage } from '../src/auth/authStorage';

test('auth storage writes to the provided session-like store and survives a get after set', () => {
  const data = new Map<string, string>();
  const storage = createAuthStorage({
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
  });
  assert.equal(storage.getItem(AUTH_STORAGE_KEY), null);
  storage.setItem(AUTH_STORAGE_KEY, '{"access_token":"test"}');
  assert.equal(storage.getItem(AUTH_STORAGE_KEY), '{"access_token":"test"}');
  storage.removeItem(AUTH_STORAGE_KEY);
  assert.equal(storage.getItem(AUTH_STORAGE_KEY), null);
});

test('createAuthStorage falls back to a no-op store when window is missing', () => {
  const storage = createAuthStorage();
  storage.setItem(AUTH_STORAGE_KEY, 'x');
  assert.equal(storage.getItem(AUTH_STORAGE_KEY), null);
});
