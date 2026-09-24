import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBeckAnxiety, BECK_ANXIETY_SYMPTOMS } from '../src/clinical/beckAnxiety';

test('BAI: 21 belirti tanımlıdır ve 4 alt boyuta ayrılmıştır', () => {
  assert.equal(BECK_ANXIETY_SYMPTOMS.length, 21);
  const categories = new Set(BECK_ANXIETY_SYMPTOMS.map(s => s.category));
  assert.ok(categories.has('subjective'));
  assert.ok(categories.has('neurovegetative'));
  assert.ok(categories.has('autonomic'));
  assert.ok(categories.has('motor'));
});

test('BAI: Kesme değerleri doğru sınıflandırılır (Minimal, Hafif, Orta, Şiddetli)', () => {
  // 0 - Minimal
  const r0 = calculateBeckAnxiety(new Array(21).fill(0), { name: 'A', gender: 'KADIN' });
  assert.equal(r0.totalScore, 0);
  assert.equal(r0.severity, 'Minimal');

  // 10 - Hafif (8-15)
  const aHafif = new Array(21).fill(0);
  for (let i = 0; i < 10; i++) aHafif[i] = 1;
  const rHafif = calculateBeckAnxiety(aHafif, { name: 'B', gender: 'ERKEK' });
  assert.equal(rHafif.totalScore, 10);
  assert.equal(rHafif.severity, 'Hafif');

  // 20 - Orta (16-25)
  const aOrta = new Array(21).fill(0);
  for (let i = 0; i < 20; i++) aOrta[i] = 1;
  const rOrta = calculateBeckAnxiety(aOrta, { name: 'C', gender: 'KADIN' });
  assert.equal(rOrta.totalScore, 20);
  assert.equal(rOrta.severity, 'Orta');

  // 35 - Şiddetli (>=26)
  const aSiddetli = new Array(21).fill(2);
  const rSiddetli = calculateBeckAnxiety(aSiddetli, { name: 'D', gender: 'ERKEK' });
  assert.equal(rSiddetli.totalScore, 42);
  assert.equal(rSiddetli.severity, 'Şiddetli');
});

test('BAI: Alt boyut puanları toplamı ana toplama eşittir', () => {
  const answers = [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1];
  const res = calculateBeckAnxiety(answers, { name: 'E', gender: 'KADIN' });

  const subSum = res.subjectiveScore + res.neurovegetativeScore + res.autonomicScore + res.motorScore;
  assert.equal(subSum, res.totalScore);
});
