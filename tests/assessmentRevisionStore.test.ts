import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deleteBeckAnxietyTest,
  deleteScl90Test,
  getBeckAnxietyTests,
  getScl90Tests,
  saveBeckAnxietyTest,
  saveScl90Test,
} from '../src/clinical/clinicalStore';
import { deleteScreening, getScreenings, saveScreening } from '../src/clinical/practiceStore';
import { createBeckAnxietyResult, scoreBeckAnxiety } from '../src/clinical/beckAnxiety';
import { createScl90Result, scoreScl90 } from '../src/clinical/scl90';
import { createRapidScreeningResult, scoreGad7, scorePhq9 } from '../src/clinical/rapidScreening';

if (!globalThis.localStorage) {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  };
}

const responses = (count: number, score: number) => Array.from({ length: count }, (_, index) => ({ itemId: index + 1, score }));
const createdAt = '2026-09-26T12:00:00.000Z';

function bai(id: string, score: number, revision = 1, revisionOf?: string) {
  return createBeckAnxietyResult(scoreBeckAnxiety(responses(21, score)), {
    id, name: 'A', gender: 'KADIN', testDate: '2026-09-26', createdAt, revision, revisionOf,
  });
}

function scl(id: string, score: number, revision = 1, revisionOf?: string) {
  return createScl90Result(scoreScl90(responses(90, score)), {
    id, name: 'A', gender: 'ERKEK', testDate: '2026-09-26', createdAt, revision, revisionOf,
  });
}

function gad(id: string, score: number, revision = 1, revisionOf?: string) {
  return createRapidScreeningResult(scoreGad7(responses(7, score)), {
    id, name: 'A', testDate: '2026-09-26', createdAt, revision, revisionOf,
  });
}

function phq(id: string, score: number, revision = 1, revisionOf?: string) {
  return createRapidScreeningResult(scorePhq9(responses(9, score)), {
    id, name: 'A', testDate: '2026-09-26', createdAt, revision, revisionOf,
  });
}

test('BAI tamamlanmış kayıt aynı ID ile değiştirilemez; aynı nesnenin yeniden denemesi idempotenttir', () => {
  localStorage.clear();
  const first = bai('bai-root', 0);
  saveBeckAnxietyTest(first);
  assert.doesNotThrow(() => saveBeckAnxietyTest(first));
  assert.throws(() => saveBeckAnxietyTest(bai('bai-root', 1)), /değiştirilemez/i);
  assert.equal(getBeckAnxietyTests().length, 1);
});

test('BAI düzeltmesi eski sonucu koruyan ardışık bağlı revizyondur', () => {
  localStorage.clear();
  saveBeckAnxietyTest(bai('bai-r1', 0));
  saveBeckAnxietyTest(bai('bai-r2', 1, 2, 'bai-r1'));
  assert.equal(getBeckAnxietyTests().length, 2);
  assert.equal(getBeckAnxietyTests().find((item) => item.id === 'bai-r1')?.totalScore, 0);
  assert.throws(() => saveBeckAnxietyTest(bai('bai-bad', 2, 4, 'bai-r2')), /revizyon zinciri/i);
});

test('SCL-90-R tamamlanmış kayıt değişmez ve doğru revizyon ayrı satırdır', () => {
  localStorage.clear();
  saveScl90Test(scl('scl-r1', 0));
  assert.throws(() => saveScl90Test(scl('scl-r1', 1)), /değiştirilemez/i);
  saveScl90Test(scl('scl-r2', 1, 2, 'scl-r1'));
  assert.equal(getScl90Tests().length, 2);
});

test('GAD-7 ve PHQ-9 aynı araç ve danışan zincirinde ardışık revizyon ister', () => {
  localStorage.clear();
  saveScreening(gad('gad-r1', 0));
  saveScreening(gad('gad-r2', 1, 2, 'gad-r1'));
  saveScreening(phq('phq-r1', 0));
  assert.throws(() => saveScreening(phq('phq-bad', 1, 2, 'gad-r1')), /revizyon zinciri/i);
  assert.equal(getScreenings().length, 3);
});

test('tarama tamamlanmış aynı ID sonucu geçerli başka yanıtla overwrite edilemez', () => {
  localStorage.clear();
  saveScreening(phq('phq-root', 0));
  assert.throws(() => saveScreening(phq('phq-root', 1)), /değiştirilemez/i);
  assert.equal(getScreenings()[0]?.totalScore, 0);
});

test('güncel tamamlanmış BAI, SCL-90-R, GAD-7 ve PHQ-9 sonuçları silinemez', () => {
  localStorage.clear();
  saveBeckAnxietyTest(bai('bai-lock', 0));
  saveScl90Test(scl('scl-lock', 0));
  saveScreening(gad('gad-lock', 0));
  saveScreening(phq('phq-lock', 0));
  assert.throws(() => deleteBeckAnxietyTest('bai-lock'), /silinemez/i);
  assert.throws(() => deleteScl90Test('scl-lock'), /silinemez/i);
  assert.throws(() => deleteScreening('gad-lock'), /silinemez/i);
  assert.throws(() => deleteScreening('phq-lock'), /silinemez/i);
});
