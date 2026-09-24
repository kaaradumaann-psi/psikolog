import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateScl90, SCL90_ITEMS } from '../src/clinical/scl90';

test('SCL-90-R: 90 madde tam olarak tanımlıdır', () => {
  assert.equal(SCL90_ITEMS.length, 90);
  assert.equal(SCL90_ITEMS[0]?.text, 'Baş ağrıları');
  assert.equal(SCL90_ITEMS[14]?.text, 'Yaşamınıza son verme (intihar) düşünceleri');
});

test('SCL-90-R: Tüm maddeler 0 olduğunda GSI=0, PST=0 ve normal sınırlar döner', () => {
  const answers = new Array(90).fill(0);
  const result = calculateScl90(answers, { name: 'Danışan 1', gender: 'KADIN' });

  assert.equal(result.gsi, 0);
  assert.equal(result.pst, 0);
  assert.equal(result.psdi, 0);
  assert.equal(result.dimensionScores.somatization, 0);
  assert.ok(result.clinicalInterpretation.includes('normal'));
});

test('SCL-90-R: GSI > 1.00 klinik eşik aşımında uyarı ve boyut vurgusu yapılır', () => {
  const answers = new Array(90).fill(2); // 90 * 2 = 180 total -> GSI = 2.00
  const result = calculateScl90(answers, { name: 'Danışan 2', gender: 'ERKEK' });

  assert.equal(result.gsi, 2.0);
  assert.equal(result.pst, 90);
  assert.equal(result.psdi, 2.0);
  assert.ok(result.gsi > 1.0);
  assert.ok(result.clinicalInterpretation.includes('kritik') || result.clinicalInterpretation.includes('klinik'));
});

test('SCL-90-R: Madde 15 intihar uyarısı tespit edilir', () => {
  const answers = new Array(90).fill(0);
  answers[14] = 3; // Madde 15
  const result = calculateScl90(answers, { name: 'Danışan 3', gender: 'KADIN' });

  assert.ok(result.clinicalInterpretation.includes('Madde 15 (İntihar düşünceleri)'));
});
