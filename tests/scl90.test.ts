import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCL90_DIMENSIONS,
  SCL90_INSTRUMENT_ID,
  SCL90_INSTRUMENT_VERSION,
  SCL90_ITEMS,
  SCL90_SCORING_VERSION,
  assertScl90ResultIntegrity,
  createScl90Result,
  scl90ResponsesFromSlots,
  scoreScl90,
  validateScl90Responses,
} from '../src/clinical/scl90';

const complete = (score = 0) => Array.from({ length: 90 }, (_, index) => ({ itemId: index + 1, score }));

function resultFor(responses = complete(0)) {
  const scoring = scoreScl90(responses);
  assert.equal(scoring.status, 'complete');
  return createScl90Result(scoring, {
    id: 'scl_test_1', name: 'Danışan', gender: 'ERKEK', age: 40,
    testDate: '2026-09-26', expertNote: 'Uzman notu', createdAt: '2026-09-26T10:00:00.000Z',
  });
}

test('SCL-90-R: 90 ardışık ID vardır; korunan madde metni yoktur', () => {
  assert.equal(SCL90_ITEMS.length, 90);
  assert.deepEqual(SCL90_ITEMS.map((item) => item.id), Array.from({ length: 90 }, (_, index) => index + 1));
  assert.ok(SCL90_ITEMS.every((item) => !('text' in item) && !('title' in item)));
});

test('SCL-90-R: dokuz boyut 83 benzersiz maddeyi, kalan yedi ek maddeyi dışarıda bırakır', () => {
  const ids = Object.values(SCL90_DIMENSIONS).flat();
  assert.equal(Object.keys(SCL90_DIMENSIONS).length, 9);
  assert.equal(ids.length, 83);
  assert.equal(new Set(ids).size, 83);
  assert.deepEqual(Array.from({ length: 90 }, (_, index) => index + 1).filter((id) => !ids.includes(id)), [19, 44, 59, 60, 64, 66, 89]);
});

test('SCL-90-R: tüm sıfırlar GSI/PST/PSDI ve tüm boyutlarda sıfırdır', () => {
  const scoring = scoreScl90(complete(0));
  assert.equal(scoring.status, 'complete');
  if (scoring.status !== 'complete') return;
  assert.equal(scoring.totalScore, 0);
  assert.equal(scoring.gsi, 0);
  assert.equal(scoring.pst, 0);
  assert.equal(scoring.psdi, 0);
  assert.ok(Object.values(scoring.dimensionScores).every((score) => score === 0));
});

test('SCL-90-R: tüm dörtlüler üst sınırları doğru üretir', () => {
  const scoring = scoreScl90(complete(4));
  assert.equal(scoring.status, 'complete');
  if (scoring.status !== 'complete') return;
  assert.equal(scoring.totalScore, 360);
  assert.equal(scoring.gsi, 4);
  assert.equal(scoring.pst, 90);
  assert.equal(scoring.psdi, 4);
  assert.ok(Object.values(scoring.dimensionScores).every((score) => score === 4));
});

test('SCL-90-R: tek SOM maddesi aritmetiği ve yuvarlama deterministiktir', () => {
  const responses = complete(0);
  responses[0] = { itemId: 1, score: 4 };
  const scoring = scoreScl90(responses);
  assert.equal(scoring.status, 'complete');
  if (scoring.status !== 'complete') return;
  assert.equal(scoring.totalScore, 4);
  assert.equal(scoring.gsi, 0.04);
  assert.equal(scoring.pst, 1);
  assert.equal(scoring.psdi, 4);
  assert.equal(scoring.dimensionScores.somatization, 0.33);
  assert.equal(scoring.dimensionScores.depression, 0);
});

test('SCL-90-R: ek madde global indeksleri etkiler fakat sahte onuncu boyut üretmez', () => {
  const responses = complete(0);
  responses[18] = { itemId: 19, score: 4 };
  const scoring = scoreScl90(responses);
  assert.equal(scoring.status, 'complete');
  if (scoring.status !== 'complete') return;
  assert.equal(scoring.gsi, 0.04);
  assert.equal(scoring.pst, 1);
  assert.ok(Object.values(scoring.dimensionScores).every((score) => score === 0));
  assert.equal('additional' in scoring.dimensionScores, false);
});

test('SCL-90-R: maddeler 15 ve 63 ayrı nötr kritik bayraklar üretir', () => {
  const responses = complete(0);
  responses[14] = { itemId: 15, score: 1 };
  responses[62] = { itemId: 63, score: 2 };
  const scoring = scoreScl90(responses);
  assert.equal(scoring.status, 'complete');
  if (scoring.status === 'complete') assert.deepEqual(scoring.criticalItemFlags, ['item-15-endorsed', 'item-63-endorsed']);
});

test('SCL-90-R: eksik madde 0 sayılmaz ve indeks üretilmez', () => {
  const scoring = scoreScl90(complete(0).slice(0, 89));
  assert.equal(scoring.status, 'incomplete');
  assert.deepEqual(scoring.validation.missingItemIds, [90]);
  assert.equal('gsi' in scoring, false);
});

test('SCL-90-R: dizi olmayan giriş reddedilir', () => {
  const checked = validateScl90Responses('not-an-array');
  assert.equal(checked.valid, false);
  assert.equal(checked.errors[0]?.code, 'not-an-array');
});

test('SCL-90-R: yinelenen ID ve eksik ID açıkça raporlanır', () => {
  const responses = complete(0);
  responses[89] = { itemId: 1, score: 0 };
  const checked = validateScl90Responses(responses);
  assert.equal(checked.valid, false);
  assert.ok(checked.errors.some((error) => error.code === 'duplicate-item-id'));
  assert.deepEqual(checked.missingItemIds, [90]);
});

test('SCL-90-R: geçersiz ID ve skorlar clamp veya truncate edilmez', () => {
  for (const badId of [0, 91]) {
    const input = complete(0); input[0] = { itemId: badId, score: 0 };
    assert.equal(scoreScl90(input).status, 'invalid');
  }
  for (const badScore of [-1, 5, 2.5, Number.NaN, '4', null, undefined]) {
    const input = complete(0) as Array<{ itemId: number; score: unknown }>;
    input[9] = { itemId: 10, score: badScore };
    assert.equal(scoreScl90(input).status, 'invalid', `bad=${String(badScore)}`);
  }
});

test('SCL-90-R: yanıt sırası sonucu değiştirmez ve kayıt sıralanır', () => {
  const scoring = scoreScl90(complete(1).reverse());
  assert.equal(scoring.status, 'complete');
  if (scoring.status !== 'complete') return;
  assert.equal(scoring.totalScore, 90);
  assert.equal(scoring.gsi, 1);
  assert.deepEqual(scoring.responses.map((response) => response.itemId), Array.from({ length: 90 }, (_, index) => index + 1));
});

test('SCL-90-R: slot dönüştürücü null ve undefined değerlerini cevap diye eklemez', () => {
  const slots = Array.from({ length: 90 }, () => 0 as number | null | undefined);
  slots[14] = null;
  slots[62] = undefined;
  const responses = scl90ResponsesFromSlots(slots);
  assert.equal(responses.length, 88);
  assert.equal(scoreScl90(responses).status, 'incomplete');
});

test('SCL-90-R: yeni kayıt sürüm, ham indeks, norm ve revizyon metadatası taşır', () => {
  const result = resultFor(complete(2));
  assert.equal(result.instrumentId, SCL90_INSTRUMENT_ID);
  assert.equal(result.instrumentVersion, SCL90_INSTRUMENT_VERSION);
  assert.equal(result.scoringVersion, SCL90_SCORING_VERSION);
  assert.equal(result.completionStatus, 'complete');
  assert.equal(result.totalScore, 180);
  assert.equal(result.gsi, 2);
  assert.equal(result.normReference, 'none');
  assert.equal(result.revision, 1);
  assert.equal(result.notes, 'Uzman notu');
  assert.equal('additional' in result.dimensionScores, false);
  assert.match(result.clinicalInterpretation, /T-puanı.*klinik eşik.*tanı üretmez/i);
});

test('SCL-90-R: bütünlük kontrolü doğru kaydı kabul eder, değiştirilmiş türevleri reddeder', () => {
  const result = resultFor(complete(1));
  assert.doesNotThrow(() => assertScl90ResultIntegrity(result));
  assert.throws(() => assertScl90ResultIntegrity({ ...result, gsi: 3 }), /tutarlı değil/i);
  assert.throws(() => assertScl90ResultIntegrity({ ...result, pst: 1 }), /tutarlı değil/i);
  assert.throws(() => assertScl90ResultIntegrity({ ...result, dimensionScores: { ...result.dimensionScores, anxiety: 2 } }), /tutarlı değil/i);
  assert.throws(() => assertScl90ResultIntegrity({ ...result, criticalItemFlags: ['invented'] }), /tutarlı değil/i);
});

test('SCL-90-R: kayıt oluşturucu eksik yanıtı ve bütünlük kontrolü geçersiz metadatayı reddeder', () => {
  assert.throws(() => createScl90Result(scoreScl90(complete(0).slice(0, 89)), {
    id: 'x', name: 'A', gender: 'KADIN', testDate: '2026-09-26',
  }), /Tamamlanmamış/i);
  const result = resultFor();
  assert.throws(() => assertScl90ResultIntegrity({ ...result, testDate: '2026-09-27' }), /metadata/i);
  assert.throws(() => assertScl90ResultIntegrity({ ...result, revision: 0 }), /metadata/i);
  assert.throws(() => assertScl90ResultIntegrity({ ...result, revisionOf: result.id }), /metadata/i);
});
