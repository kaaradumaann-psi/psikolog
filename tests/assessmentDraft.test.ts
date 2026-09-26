import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSESSMENT_DRAFT_SCHEMA,
  assessmentDraftIdentity,
  emptyAssessmentDraft,
  parseAssessmentDraft,
  readAssessmentDraft,
  removeAssessmentDraft,
  writeAssessmentDraft,
  type AssessmentDraftSpec,
} from '../src/clinical/assessmentDraft';

const session = new Map<string, string>();
const storage: Storage = {
  getItem: (key) => session.get(key) ?? null,
  setItem: (key, value) => { session.set(key, value); },
  removeItem: (key) => { session.delete(key); },
  clear: () => session.clear(),
  key: (index) => Array.from(session.keys())[index] ?? null,
  get length() { return session.size; },
};
(globalThis as typeof globalThis & { window: Window }).window = { sessionStorage: storage } as Window;

const bai: AssessmentDraftSpec = { instrumentVersion: 'BAI-v1', itemCount: 21, minScore: 0, maxScore: 3 };
const scl: AssessmentDraftSpec = { instrumentVersion: 'SCL-v1', itemCount: 90, minScore: 0, maxScore: 4 };

function encoded(spec = bai, identity = 'client:a') {
  return JSON.stringify({
    ...emptyAssessmentDraft(spec, identity, 'a', 'administration:one'),
    schema: ASSESSMENT_DRAFT_SCHEMA,
    instrumentVersion: spec.instrumentVersion,
    testDate: '2026-09-20',
    updatedAt: '2026-09-20T10:00:00.000Z',
  });
}

test('genel ölçek taslak kimliği manuel ve danışan bağlamını ayırır', () => {
  assert.equal(assessmentDraftIdentity(''), 'manual');
  assert.equal(assessmentDraftIdentity('a'), 'client:a');
  assert.notEqual(assessmentDraftIdentity('a'), assessmentDraftIdentity('b'));
});

test('taslak parser tam araç sürümü, danışan ve uygulama kimliği ister', () => {
  assert.ok(parseAssessmentDraft(encoded(), bai, 'client:a', 'administration:one'));
  assert.equal(parseAssessmentDraft(encoded(), bai, 'client:b'), null);
  assert.equal(parseAssessmentDraft(encoded(), { ...bai, instrumentVersion: 'BAI-v2' }, 'client:a'), null);
  assert.equal(parseAssessmentDraft(encoded(), bai, 'client:a', 'administration:two'), null);
});

test('taslak parser yanlış uzunluk, skor, tarih, yaş alanı ve işlevsellik kodunu reddeder', () => {
  const base = JSON.parse(encoded()) as Record<string, unknown>;
  assert.equal(parseAssessmentDraft(JSON.stringify({ ...base, answers: Array(20).fill(null) }), bai, 'client:a'), null);
  assert.equal(parseAssessmentDraft(JSON.stringify({ ...base, answers: [4, ...Array(20).fill(null)] }), bai, 'client:a'), null);
  assert.equal(parseAssessmentDraft(JSON.stringify({ ...base, testDate: '2026-02-31' }), bai, 'client:a'), null);
  assert.equal(parseAssessmentDraft(JSON.stringify({ ...base, manualGender: 'UNKNOWN' }), bai, 'client:a'), null);
  assert.equal(parseAssessmentDraft(JSON.stringify({ ...base, functionalDifficulty: 4 }), bai, 'client:a'), null);
  assert.equal(parseAssessmentDraft('{broken', bai, 'client:a'), null);
});

test('boş taslak araca özgü madde sayısını ve null durumunu korur', () => {
  const baiDraft = emptyAssessmentDraft(bai, 'client:a', 'a');
  const sclDraft = emptyAssessmentDraft(scl, 'client:a', 'a');
  assert.equal(baiDraft.answers.length, 21);
  assert.equal(sclDraft.answers.length, 90);
  assert.ok([...baiDraft.answers, ...sclDraft.answers].every((answer) => answer === null));
  assert.match(baiDraft.administrationId, /^administration:/);
});

test('yazma/okuma anahtarı araç + danışan + aktif uygulamaya bağlıdır', () => {
  storage.clear();
  const a = emptyAssessmentDraft(bai, 'client:a', 'a', 'administration:a');
  const b = emptyAssessmentDraft(bai, 'client:b', 'b', 'administration:b');
  a.answers[0] = 1;
  b.answers[0] = 3;
  writeAssessmentDraft(bai, { ...a, answers: a.answers });
  writeAssessmentDraft(bai, { ...b, answers: b.answers });
  assert.equal(readAssessmentDraft(bai, 'client:a')?.answers[0], 1);
  assert.equal(readAssessmentDraft(bai, 'client:b')?.answers[0], 3);
  assert.equal(readAssessmentDraft(scl, 'client:a'), null);
});

test('taslak silme yalnız tam araç/danışan/uygulama anahtarını kaldırır', () => {
  const beforeB = readAssessmentDraft(bai, 'client:b');
  removeAssessmentDraft(bai, 'client:a', 'administration:a');
  assert.equal(readAssessmentDraft(bai, 'client:a'), null);
  assert.deepEqual(readAssessmentDraft(bai, 'client:b'), beforeB);
});
