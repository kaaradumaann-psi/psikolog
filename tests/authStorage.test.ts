import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_STORAGE_KEY, createAuthStorage } from '../src/auth/authStorage.ts';

test('authStorage uses sessionStorage when available', () => {
  const mock = {
    getItem: (k: string) => (k === AUTH_STORAGE_KEY ? 'value' : null),
    setItem: (_k: string, _v: string) => {},
    removeItem: (_k: string) => {},
  } as unknown as Storage;

  // Mock window.sessionStorage
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  (globalThis as unknown as { window: { sessionStorage: Storage } }).window = {
    sessionStorage: mock,
  };

  const storage = createAuthStorage();
  assert.equal(storage.getItem(AUTH_STORAGE_KEY), 'value');

  (globalThis as unknown as { window?: unknown }).window = originalWindow as never;
});

test('authStorage falls back to memory when sessionStorage throws', () => {
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  (globalThis as unknown as { window: { sessionStorage: Storage } }).window = {
    get sessionStorage(): Storage {
      throw new Error('private mode');
    },
  } as unknown as { sessionStorage: Storage };

  const storage = createAuthStorage();
  assert.equal(storage.getItem('any'), null);
  assert.doesNotThrow(() => storage.setItem('k', 'v'));
  assert.doesNotThrow(() => storage.removeItem('k'));

  (globalThis as unknown as { window?: unknown }).window = originalWindow as never;
});

test('authStorage respects injected store', () => {
  const injected = {
    getItem: () => 'injected',
    setItem: () => {},
    removeItem: () => {},
  };
  const storage = createAuthStorage(injected);
  assert.equal(storage.getItem('x'), 'injected');
});
