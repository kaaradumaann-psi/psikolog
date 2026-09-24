import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBeckDepression, BECK_DEPRESSION_QUESTIONS } from '../src/clinical/beckDepression';

test('BDI: 21 soru tam olarak tanımlıdır ve Madde 9 kritiktir', () => {
  assert.equal(BECK_DEPRESSION_QUESTIONS.length, 21);
  const q9 = BECK_DEPRESSION_QUESTIONS[8]!;
  assert.equal(q9.id, 9);
  assert.equal(q9.critical, true);
});

test('BDI: Tüm sorulara 0 verilirse toplam 0 ve Minimal Depresyon döner', () => {
  const answers = new Array(21).fill(0);
  const result = calculateBeckDepression(answers, {
    name: 'Test Danışan',
    gender: 'KADIN',
    age: 28,
  });

  assert.equal(result.totalScore, 0);
  assert.equal(result.severity, 'Minimal');
  assert.equal(result.suicideRisk, false);
  assert.equal(result.cognitiveAffectiveScore, 0);
  assert.equal(result.somaticPerformanceScore, 0);
  assert.ok(result.clinicalInterpretation.includes('normal / minimal'));
});

test('BDI: Kesme puanı aralıkları doğru hesaplanır', () => {
  // Hafif: 10-16
  const ansHafif = [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]; // 12
  const resHafif = calculateBeckDepression(ansHafif, { name: 'A', gender: 'ERKEK' });
  assert.equal(resHafif.totalScore, 12);
  assert.equal(resHafif.severity, 'Hafif');

  // Orta: 17-29
  const ansOrta = new Array(21).fill(1); // 21
  const resOrta = calculateBeckDepression(ansOrta, { name: 'B', gender: 'KADIN' });
  assert.equal(resOrta.totalScore, 21);
  assert.equal(resOrta.severity, 'Orta');

  // Şiddetli: 30-63
  const ansSiddetli = new Array(21).fill(2); // 42
  const resSiddetli = calculateBeckDepression(ansSiddetli, { name: 'C', gender: 'KADIN' });
  assert.equal(resSiddetli.totalScore, 42);
  assert.equal(resSiddetli.severity, 'Şiddetli');
});

test('BDI: Madde 9 intihar düşüncesi tetiklenince kritik risk bayrağı açılır', () => {
  const answers = new Array(21).fill(0);
  answers[8] = 2; // Madde 9 = 2
  const result = calculateBeckDepression(answers, { name: 'Riskli Danışan', gender: 'ERKEK' });

  assert.equal(result.suicideRisk, true);
  assert.equal(result.suicideItemScore, 2);
  assert.ok(result.clinicalInterpretation.includes('KRİTİK GÜVENLİK UYARISI'));
});
