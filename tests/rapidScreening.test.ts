import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGad7,
  calculatePhq9,
  GAD7_QUESTIONS,
  PHQ9_QUESTIONS,
} from '../src/clinical/rapidScreening';

test('GAD-7: 7 soru tanımlıdır ve puanlama aralıkları doğrudur', () => {
  assert.equal(GAD7_QUESTIONS.length, 7);

  // 0 - Minimal
  const r0 = calculateGad7(new Array(7).fill(0), { name: 'A' });
  assert.equal(r0.totalScore, 0);
  assert.equal(r0.severity, 'Minimal Anksiyete');

  // 10 - Orta (10-14)
  const r10 = calculateGad7([2, 2, 2, 2, 2, 0, 0], { name: 'B' });
  assert.equal(r10.totalScore, 10);
  assert.equal(r10.severity, 'Orta Düzey Anksiyete');

  // 18 - Şiddetli (>=15)
  const r18 = calculateGad7(new Array(7).fill(3), { name: 'C' });
  assert.equal(r18.totalScore, 21);
  assert.equal(r18.severity, 'Şiddetli Anksiyete');
});

test('PHQ-9: 9 soru tanımlıdır ve Madde 9 intihar uyarısı yakalanır', () => {
  assert.equal(PHQ9_QUESTIONS.length, 9);

  const answers = new Array(9).fill(0);
  answers[8] = 2; // Madde 9
  const res = calculatePhq9(answers, { name: 'D' });

  assert.equal(res.totalScore, 2);
  assert.equal(res.suicideRisk, true);
  assert.ok(res.clinicalNote.includes('İntihar risk protokolü'));
});
