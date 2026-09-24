import assert from 'node:assert/strict';
import test from 'node:test';
import { asCompleteAnswers, emptyAnswers, parseOptionalAge } from '../src/clinical/scaleIntake.ts';

test('işaretlenmeyen ölçek maddesi tamamlanmış sayılmaz', () => {
  const answers = emptyAnswers(3);
  assert.equal(asCompleteAnswers(answers), null);
  answers[0] = 0;
  answers[1] = 0;
  assert.equal(asCompleteAnswers(answers), null);
  answers[2] = 0;
  assert.deepEqual(asCompleteAnswers(answers), [0, 0, 0]);
});

test('yaş boş kalabilir, uydurma sayı kabul edilmez', () => {
  assert.equal(parseOptionalAge(''), undefined);
  assert.equal(parseOptionalAge('  '), undefined);
  assert.equal(parseOptionalAge('30'), 30);
  assert.equal(parseOptionalAge('0'), 0);
  assert.equal(parseOptionalAge('30.5'), null);
  assert.equal(parseOptionalAge('-1'), null);
  assert.equal(parseOptionalAge('121'), null);
});
