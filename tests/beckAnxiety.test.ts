import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAI_INSTRUMENT_ID,
  BAI_INSTRUMENT_VERSION,
  BAI_ITEMS,
  BAI_MAX_TOTAL,
  BAI_SCORING_VERSION,
  assertBeckAnxietyResultIntegrity,
  beckAnxietyResponsesFromSlots,
  beckAnxietyScoreBand,
  createBeckAnxietyResult,
  scoreBeckAnxiety,
  validateBeckAnxietyResponses,
} from '../src/clinical/beckAnxiety';

const complete = (score = 0) => Array.from({ length: 21 }, (_, index) => ({ itemId: index + 1, score }));

function resultFor(scores = complete(0)) {
  const scoring = scoreBeckAnxiety(scores);
  assert.equal(scoring.status, 'complete');
  return createBeckAnxietyResult(scoring, {
    id: 'bai_test_1', name: 'Danışan', gender: 'KADIN', age: 32,
    testDate: '2026-09-26', expertNote: 'Uzman notu', createdAt: '2026-09-26T09:00:00.000Z',
  });
}

test('BAI: kimlik sabittir ve korunan madde metni katalogda tutulmaz', () => {
  assert.equal(BAI_ITEMS.length, 21);
  assert.deepEqual(BAI_ITEMS.map((item) => item.id), Array.from({ length: 21 }, (_, index) => index + 1));
  assert.ok(BAI_ITEMS.every((item) => !('text' in item) && !('title' in item) && !('category' in item)));
  assert.equal(BAI_INSTRUMENT_VERSION, 'BAI-1988-TR-Ulusoy-1998');
});

test('BAI: 21 tam 0 yanıtı toplam 0 üretir', () => {
  const scoring = scoreBeckAnxiety(complete(0));
  assert.equal(scoring.status, 'complete');
  if (scoring.status !== 'complete') return;
  assert.equal(scoring.totalScore, 0);
  assert.equal(scoring.maxScore, BAI_MAX_TOTAL);
  assert.equal(scoring.scoreBand, '0–7 · minimal düzey (el kitabı)');
});

test('BAI: bütün 3 yanıtları üst sınır 63 üretir', () => {
  const scoring = scoreBeckAnxiety(complete(3));
  assert.equal(scoring.status, 'complete');
  if (scoring.status === 'complete') assert.equal(scoring.totalScore, 63);
});

test('BAI: el kitabı bant sınırları ayrı ayrı korunur', () => {
  const expected = new Map<number, string>([
    [0, '0–7 · minimal düzey (el kitabı)'], [7, '0–7 · minimal düzey (el kitabı)'],
    [8, '8–15 · hafif düzey (el kitabı)'], [15, '8–15 · hafif düzey (el kitabı)'],
    [16, '16–25 · orta düzey (el kitabı)'], [25, '16–25 · orta düzey (el kitabı)'],
    [26, '26–63 · yüksek düzey (el kitabı)'], [63, '26–63 · yüksek düzey (el kitabı)'],
  ]);
  for (const [score, band] of expected) assert.equal(beckAnxietyScoreBand(score), band);
});

test('BAI: eksik yanıt sıfır sayılmaz ve sonuç üretilmez', () => {
  const scoring = scoreBeckAnxiety(complete(0).slice(0, 20));
  assert.equal(scoring.status, 'incomplete');
  assert.deepEqual(scoring.validation.missingItemIds, [21]);
  assert.equal('totalScore' in scoring, false);
});

test('BAI: dizi olmayan giriş reddedilir', () => {
  const checked = validateBeckAnxietyResponses(null);
  assert.equal(checked.valid, false);
  assert.equal(checked.errors[0]?.code, 'not-an-array');
});

test('BAI: yinelenen ve eksik ID birlikte raporlanır', () => {
  const input = complete(0);
  input[20] = { itemId: 1, score: 2 };
  const checked = validateBeckAnxietyResponses(input);
  assert.equal(checked.valid, false);
  assert.ok(checked.errors.some((error) => error.code === 'duplicate-item-id' && error.itemId === 1));
  assert.ok(checked.missingItemIds.includes(21));
});

test('BAI: sınır dışı, kesirli, NaN ve metin skorları asla clamp edilmez', () => {
  for (const bad of [-1, 4, 1.5, Number.NaN, '2', null, undefined]) {
    const input = complete(0) as Array<{ itemId: number; score: unknown }>;
    input[4] = { itemId: 5, score: bad };
    const scoring = scoreBeckAnxiety(input);
    assert.equal(scoring.status, 'invalid', `bad=${String(bad)}`);
    assert.equal('totalScore' in scoring, false);
  }
});

test('BAI: geçersiz ID 0 ve 22 reddedilir', () => {
  for (const itemId of [0, 22]) {
    const input = complete(0);
    input[0] = { itemId, score: 0 };
    assert.equal(scoreBeckAnxiety(input).status, 'invalid');
  }
});

test('BAI: giriş sırası skoru değiştirmez, kayıt yanıtları ID sırasındadır', () => {
  const reversed = complete(1).reverse();
  const scoring = scoreBeckAnxiety(reversed);
  assert.equal(scoring.status, 'complete');
  if (scoring.status !== 'complete') return;
  assert.equal(scoring.totalScore, 21);
  assert.deepEqual(scoring.responses.map((response) => response.itemId), Array.from({ length: 21 }, (_, index) => index + 1));
});

test('BAI: slot dönüştürücü null/undefined yanıtı sessizce eklemez', () => {
  const slots = Array.from({ length: 21 }, () => 0 as number | null | undefined);
  slots[2] = null;
  slots[4] = undefined;
  const responses = beckAnxietyResponsesFromSlots(slots);
  assert.equal(responses.length, 19);
  assert.equal(scoreBeckAnxiety(responses).status, 'incomplete');
});

test('BAI: yeni kayıt tam kimlik, puanlama ve revizyon metadatası taşır; alt skor üretmez', () => {
  const result = resultFor(complete(1));
  assert.equal(result.instrumentId, BAI_INSTRUMENT_ID);
  assert.equal(result.instrumentVersion, BAI_INSTRUMENT_VERSION);
  assert.equal(result.scoringVersion, BAI_SCORING_VERSION);
  assert.equal(result.completionStatus, 'complete');
  assert.equal(result.totalScore, 21);
  assert.equal(result.maximumScore, 63);
  assert.equal(result.revision, 1);
  assert.equal(result.notes, 'Uzman notu');
  assert.equal(result.severity, undefined);
  assert.equal(result.subjectiveScore, undefined);
  assert.equal(result.neurovegetativeScore, undefined);
  assert.equal(result.autonomicScore, undefined);
  assert.equal(result.motorScore, undefined);
  assert.match(result.clinicalInterpretation, /tek başına.*tanı/i);
  assert.doesNotMatch(result.clinicalInterpretation, /tedavi.*önerilir/i);
});

test('BAI: bütünlük kontrolü tutarlı kaydı kabul eder', () => {
  assert.doesNotThrow(() => assertBeckAnxietyResultIntegrity(resultFor(complete(2))));
});

test('BAI: bütünlük kontrolü değiştirilmiş toplam, yanıt ve eski alt skoru reddeder', () => {
  const result = resultFor(complete(1));
  assert.throws(() => assertBeckAnxietyResultIntegrity({ ...result, totalScore: 22 }), /tutarlı değil/i);
  assert.throws(() => assertBeckAnxietyResultIntegrity({ ...result, answers: [...result.answers.slice(0, 20), 2] }), /tutarlı değil/i);
  assert.throws(() => assertBeckAnxietyResultIntegrity({ ...result, subjectiveScore: 4 }), /tutarlı değil/i);
});

test('BAI: kayıt oluşturucu eksik puanlama ve geçersiz tarih/revizyon metadatasını kabul etmez', () => {
  assert.throws(() => createBeckAnxietyResult(scoreBeckAnxiety(complete(0).slice(0, 20)), {
    id: 'x', name: 'A', gender: 'KADIN', testDate: '2026-09-26',
  }), /Tamamlanmamış/i);
  const result = resultFor();
  assert.throws(() => assertBeckAnxietyResultIntegrity({ ...result, testDate: '2026-02-30' }), /metadata/i);
  assert.throws(() => assertBeckAnxietyResultIntegrity({ ...result, revision: 0 }), /metadata/i);
  assert.throws(() => assertBeckAnxietyResultIntegrity({ ...result, revisionOf: result.id }), /metadata/i);
});
