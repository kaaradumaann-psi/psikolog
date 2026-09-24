import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DRAFT_VERSION,
  DRAFT_TTL_MS,
  draftKey,
  outboxKey,
  createDraft,
  isExpired,
  saveDraft,
  loadDraft,
  clearDraft,
  isNetworkError,
} from '../src/workspace/draftStorage.ts';

function mockStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as unknown as Storage;
}

test('draftKey and outboxKey include userId', () => {
  assert.ok(draftKey('user-123').includes('user-123'));
  assert.ok(outboxKey('user-123').includes('user-123'));
  assert.notEqual(draftKey('a'), outboxKey('a'));
});

test('createDraft generates idempotencyKey and defaults', () => {
  const draft = createDraft('u1');
  assert.equal(draft.version, DRAFT_VERSION);
  assert.ok(draft.idempotencyKey);
  assert.equal(draft.firstName, '');
  assert.ok(draft.updatedAt);
});

test('isExpired respects TTL', () => {
  const now = Date.now();
  const fresh = createDraft('u1', { updatedAt: now } as never);
  // Override updatedAt manually
  (fresh as { updatedAt: number }).updatedAt = now;
  assert.equal(isExpired(fresh), false);

  const old = createDraft('u1');
  (old as { updatedAt: number }).updatedAt = now - DRAFT_TTL_MS - 1000;
  assert.equal(isExpired(old), true);
});

test('saveDraft and loadDraft round-trip', () => {
  const storage = mockStorage();
  const draft = createDraft('user-1', { firstName: 'Ali', lastName: 'Veli' });
  saveDraft('user-1', draft, storage);
  const loaded = loadDraft('user-1', storage);
  assert.ok(loaded);
  assert.equal(loaded!.firstName, 'Ali');
  assert.equal(loaded!.lastName, 'Veli');
  assert.equal(loaded!.version, DRAFT_VERSION);
});

test('loadDraft returns null for expired', () => {
  const storage = mockStorage();
  const draft = createDraft('user-1');
  (draft as { updatedAt: number }).updatedAt = Date.now() - DRAFT_TTL_MS - 1000;
  // Manually put expired
  storage.setItem(draftKey('user-1'), JSON.stringify(draft));
  const loaded = loadDraft('user-1', storage);
  assert.equal(loaded, null);
  // Should be removed
  assert.equal(storage.getItem(draftKey('user-1')), null);
});

test('clearDraft removes', () => {
  const storage = mockStorage();
  const draft = createDraft('user-1');
  saveDraft('user-1', draft, storage);
  assert.ok(storage.getItem(draftKey('user-1')));
  clearDraft('user-1', storage);
  assert.equal(storage.getItem(draftKey('user-1')), null);
});

test('isNetworkError detects network errors', () => {
  assert.equal(isNetworkError(new Error('Network error')), true);
  assert.equal(isNetworkError(new Error('Failed to fetch')), true);
  assert.equal(isNetworkError(new Error('Load failed')), true);
  assert.equal(isNetworkError(new Error('timeout')), true);
  assert.equal(isNetworkError(new Error('Validation failed')), false);
});
