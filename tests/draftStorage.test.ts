import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearDraft,
  decodeAnswers,
  deserializeScan,
  encodeAnswers,
  enqueueOutbox,
  isDraftNonEmpty,
  isNetworkError,
  loadDraft,
  loadOutbox,
  outboxKey,
  removeOutboxEntry,
  saveDraft,
  serializeScan,
  updateOutboxEntry,
} from '../src/workspace/draftStorage';
import {
  ITEM_COUNT,
  emptyAnswers,
  emptyClientIntake,
  emptyRawScores,
} from '../src/workspace/caseTypes';
import type { ScanSet } from '../src/scanner/pageSequence';

function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

const UUID = '123e4567-e89b-42d3-a456-426614174000';

test('answers encode distinguishes blank(null) from pending(undefined) across F5', () => {
  const answers = emptyAnswers();
  answers[0] = 'D';
  answers[1] = 'Y';
  answers[2] = null;
  const encoded = encodeAnswers(answers);
  assert.equal(encoded.length, ITEM_COUNT);
  assert.equal(encoded.slice(0, 4), 'DYB-');
  const decoded = decodeAnswers(encoded);
  assert.ok(decoded);
  assert.equal(decoded![0], 'D');
  assert.equal(decoded![1], 'Y');
  assert.equal(decoded![2], null);
  assert.equal(decoded![3], undefined);
  assert.equal(decoded![ITEM_COUNT - 1], undefined);
});

test('decodeAnswers rejects corrupt payloads instead of inventing data', () => {
  assert.equal(decodeAnswers('too-short'), null);
  assert.equal(decodeAnswers('X'.repeat(ITEM_COUNT)), null);
  assert.equal(decodeAnswers(null), null);
  assert.equal(decodeAnswers(42), null);
});

function fakeScan(): ScanSet {
  return {
    batchId: 'ABCDEF1234567890ABCDEF12',
    reviewerId: 'session-test',
    clinicalTransferAllowed: false,
    pages: {
      1: {
        ok: true,
        pageId: 'p1',
        pageNumber: 1,
        batchId: 'ABCDEF1234567890ABCDEF12',
        fingerprint: 'fp',
        items: [
          {
            itemId: 'i1',
            itemNumber: 1,
            status: 'reliable',
            choiceId: 'D',
            confidence: 0.9,
            measurements: [{ responseId: 'r1', choiceId: 'D', darkness: 1, coverage: 1 }],
            reason: 'ok',
          },
        ],
        quality: {
          ok: true,
          reasons: [],
          score: 0.9,
          metrics: { brightness: 1, shadowSpread: 1, laplacianVariance: 1, borderContrast: 1, pixelsPerMm: 1 },
        },
        normalized: { width: 10, height: 10, data: new Uint8Array(100) },
        sourceCorners: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
        warnings: [],
        sourceName: 'test.jpg',
        previewUrl: 'blob:fake',
        reviews: { i1: { choiceId: 'Y', reviewedAt: new Date().toISOString() } },
        reviewHistory: [],
      },
    },
  };
}

test('scan serialize strips images but keeps data and manual reviews', () => {
  const scan = fakeScan();
  const serialized = serializeScan(scan);
  assert.equal(serialized.pages['1']!.previewUrl, '');
  assert.equal(serialized.pages['1']!.normalized, null);
  assert.equal(serialized.pages['1']!.items.length, 1);
  assert.equal(serialized.pages['1']!.reviews.i1?.choiceId, 'Y');
  // Orijinal state'e dokunulmadı.
  assert.equal(scan.pages[1]!.previewUrl, 'blob:fake');

  const restored = deserializeScan(serialized);
  assert.ok(restored);
  assert.equal(restored!.pages[1]!.previewUrl, '');
  assert.equal(restored!.pages[1]!.normalized.width, 0);
  assert.equal(restored!.pages[1]!.items[0]!.choiceId, 'D');
  assert.equal(restored!.pages[1]!.reviews.i1?.choiceId, 'Y');
});

test('deserializeScan rejects corrupt pages', () => {
  assert.equal(deserializeScan(null), null);
  assert.equal(deserializeScan({}), null);
  assert.equal(deserializeScan({ batchId: null, reviewerId: '', pages: {} }), null);
  const valid = serializeScan(fakeScan());
  const rollover = structuredClone(valid) as typeof valid;
  rollover.pages['1']!.reviews.i1!.reviewedAt = '2026-02-30T10:00:00.000Z';
  assert.equal(deserializeScan(rollover), null);
});

test('draft round-trips through storage and isolates users', () => {
  const store = memoryStore();
  const client = emptyClientIntake();
  client.firstName = 'Ayşe';
  client.lastName = 'Yılmaz';
  client.gender = 'Kadın';
  client.age = 28;
  const answers = emptyAnswers();
  answers[0] = 'D';
  const raw = emptyRawScores();
  raw.L = 5;

  const saved = saveDraft(
    'user-1',
    {
      step: 'entry',
      client,
      method: 'quick',
      answersEncoded: encodeAnswers(answers),
      currentItem: 1,
      raw,
      scan: null,
      submissionKey: UUID,
      savedId: null,
      savedAt: null,
    },
    store,
  );
  assert.equal(saved.ok, true);

  const loaded = loadDraft('user-1', store);
  assert.ok(loaded);
  assert.equal(loaded!.step, 'entry');
  assert.equal(loaded!.client.firstName, 'Ayşe');
  assert.equal(loaded!.method, 'quick');
  assert.equal(loaded!.currentItem, 1);
  assert.equal(decodeAnswers(loaded!.answersEncoded)![0], 'D');
  assert.equal(loaded!.raw.L, 5);
  assert.ok(isDraftNonEmpty(loaded!));

  // Başka kullanıcı göremez.
  assert.equal(loadDraft('user-2', store), null);

  clearDraft('user-1', store);
  assert.equal(loadDraft('user-1', store), null);
});

test('draft with scan data round-trips (F5 sonrası kayıt için yeterli)', () => {
  const store = memoryStore();
  const client = emptyClientIntake();
  client.firstName = 'A';
  client.lastName = 'B';
  client.gender = 'Erkek';
  client.age = 30;
  const result = saveDraft(
    'u',
    {
      step: 'review',
      client,
      method: 'omr',
      answersEncoded: encodeAnswers(emptyAnswers()),
      currentItem: 0,
      raw: emptyRawScores(),
      scan: serializeScan(fakeScan()),
      submissionKey: UUID,
      savedId: null,
      savedAt: null,
    },
    store,
  );
  assert.equal(result.ok, true);
  const loaded = loadDraft('u', store);
  assert.ok(loaded?.scan);
  const scan = deserializeScan(loaded!.scan);
  assert.ok(scan);
  assert.equal(scan!.pages[1]!.reviews.i1?.choiceId, 'Y');
});

test('corrupt and expired drafts are discarded, never crash', () => {
  const store = memoryStore();
  store.setItem('mmpi566:case-draft:v1:u', '{not-json');
  assert.equal(loadDraft('u', store), null);
  // Bozuk girdi temizlenir.
  assert.equal(store.getItem('mmpi566:case-draft:v1:u'), null);

  store.setItem(
    'mmpi566:case-draft:v1:u',
    JSON.stringify({ version: 999, userId: 'u', updatedAt: new Date().toISOString() }),
  );
  assert.equal(loadDraft('u', store), null);

  const old = new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString();
  const client = emptyClientIntake();
  store.setItem(
    'mmpi566:case-draft:v1:u',
    JSON.stringify({
      version: 1,
      userId: 'u',
      updatedAt: old,
      step: 'intake',
      client,
      method: null,
      answersEncoded: encodeAnswers(emptyAnswers()),
      currentItem: 0,
      raw: emptyRawScores(),
      scan: null,
      submissionKey: UUID,
      savedId: null,
      savedAt: null,
    }),
  );
  assert.equal(loadDraft('u', store), null);
});

test('empty draft is recognised as empty; saved-only draft still loads', () => {
  const empty = {
    client: emptyClientIntake(),
    method: null,
    answersEncoded: encodeAnswers(emptyAnswers()),
    raw: emptyRawScores(),
    scan: null,
  } as const;
  assert.equal(isDraftNonEmpty(empty), false);
  assert.equal(isDraftNonEmpty({ ...empty, method: 'quick' }), true);
});

test('outbox queues, updates and removes entries per user', () => {
  const store = memoryStore();
  const client = emptyClientIntake();
  client.firstName = 'A';
  client.lastName = 'B';
  client.gender = 'Kadın';
  client.age = 25;
  assert.equal(
    enqueueOutbox(
      'u1',
      {
        idempotencyKey: UUID,
        method: 'raw',
        client,
        answersEncoded: null,
        raw: emptyRawScores(),
        scan: null,
        createdAt: new Date().toISOString(),
        attempts: 0,
        lastError: 'offline',
      },
      store,
    ),
    true,
  );
  assert.equal(loadOutbox('u1', store).length, 1);
  assert.equal(loadOutbox('u2', store).length, 0);
  // Aynı anahtar tekrar eklenirse üzerine yazılır (çift kayıt yok).
  assert.equal(
    enqueueOutbox(
      'u1',
      {
        idempotencyKey: UUID,
        method: 'raw',
        client,
        answersEncoded: null,
        raw: emptyRawScores(),
        scan: null,
        createdAt: new Date().toISOString(),
        attempts: 0,
        lastError: 'offline-2',
      },
      store,
    ),
    true,
  );
  assert.equal(loadOutbox('u1', store).length, 1);
  assert.equal(loadOutbox('u1', store)[0]!.lastError, 'offline-2');

  updateOutboxEntry('u1', UUID, { attempts: 2, lastError: 'x' }, store);
  assert.equal(loadOutbox('u1', store)[0]!.attempts, 2);

  removeOutboxEntry('u1', UUID, store);
  assert.equal(loadOutbox('u1', store).length, 0);
});

test('outbox restore rejects mismatched method shapes and oversized storage values', () => {
  const store = memoryStore();
  const client = emptyClientIntake();
  store.setItem(outboxKey('u1'), JSON.stringify([{
    idempotencyKey: UUID,
    method: 'raw',
    client,
    answersEncoded: encodeAnswers(emptyAnswers()),
    raw: null,
    scan: null,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: '',
  }]));
  assert.deepEqual(loadOutbox('u1', store), []);
  store.setItem(outboxKey('u1'), 'x'.repeat(8 * 1024 * 1024 + 1));
  assert.deepEqual(loadOutbox('u1', store), []);
  assert.equal(store.getItem(outboxKey('u1')), null);
});

test('isNetworkError separates network failures from validation errors', () => {
  assert.equal(isNetworkError(new TypeError('Failed to fetch')), true);
  assert.equal(isNetworkError(new Error('Network request failed')), true);
  assert.equal(isNetworkError(new Error('Kayıt oluşturulamadı.', { cause: new TypeError('Failed to fetch') })), true);
  assert.equal(isNetworkError(new Error('Ad ve soyad zorunludur.')), false);
  assert.equal(isNetworkError(new Error('Ham puan alanları eksik veya sınır dışında.')), false);
  assert.equal(isNetworkError(null), false);
});
