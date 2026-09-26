import test from 'node:test';
import assert from 'node:assert/strict';
import type { BeckDepressionResult } from '../src/clinical/clinicalTypes';
import {
  BDI_INSTRUMENT_ID,
  BDI_INSTRUMENT_VERSION,
  BDI_ITEM_COUNT,
  BDI_MAX_TOTAL,
  BDI_SCORING_VERSION,
  BDI_TURKISH_SCREENING_THRESHOLD,
  assertBeckDepressionResultIntegrity,
  beckCriticalItemScore,
  beckDepressionScoreContext,
  createBeckDepressionResult,
  isBeckCriticalItemEndorsed,
  responsesFromAnswerSlots,
  scoreBeckDepression,
} from '../src/clinical/beckDepression';

const responseSet = (score: number) => Array.from({ length: BDI_ITEM_COUNT }, (_, index) => ({ itemId: index + 1, score }));

function expectInvalid(responses: unknown[], errorCode: string) {
  const result = scoreBeckDepression(responses as never);
  assert.equal(result.status, 'invalid');
  assert.equal(result.validation.complete, false);
  assert.ok(result.validation.errors.some((error) => error.code === errorCode));
  assert.equal('totalScore' in result, false, 'invalid/incomplete input must not expose a score');
}

test('BDI identity is original-1961/Hisli context and explicitly not BDI-II', () => {
  assert.equal(BDI_INSTRUMENT_ID, 'bdi-original-tr-hisli');
  assert.match(BDI_INSTRUMENT_VERSION, /1961/);
  assert.match(BDI_INSTRUMENT_VERSION, /Hisli/);
  assert.doesNotMatch(BDI_INSTRUMENT_VERSION, /BDI-II/);
  assert.equal(BDI_MAX_TOTAL, 63);
  assert.equal(BDI_TURKISH_SCREENING_THRESHOLD, 17);
});

test('21 zero scores produce a complete 0/63 result without a critical flag', () => {
  const result = scoreBeckDepression(responseSet(0));
  assert.equal(result.status, 'complete');
  assert.equal(result.totalScore, 0);
  assert.equal(result.scoreBand, 'Tarama eşiğinin altında');
  assert.equal(result.screeningThresholdReached, false);
  assert.equal(result.criticalItemScore, 0);
  assert.equal(result.criticalItemEndorsed, false);
});

test('21 maximum scores produce exactly 63/63', () => {
  const result = scoreBeckDepression(responseSet(3));
  assert.equal(result.status, 'complete');
  assert.equal(result.totalScore, BDI_MAX_TOTAL);
  assert.equal(result.scoreBand, 'Tarama eşiğinde veya üzerinde');
  assert.equal(result.screeningThresholdReached, true);
});

test('Turkish screening reference is applied only as below versus at/above 17', () => {
  const sixteen = responseSet(0);
  sixteen[0]!.score = 3;
  sixteen[1]!.score = 3;
  sixteen[2]!.score = 3;
  sixteen[3]!.score = 3;
  sixteen[4]!.score = 3;
  sixteen[5]!.score = 1;
  const seventeen = sixteen.map((response) => ({ ...response }));
  seventeen[5]!.score = 2;

  const below = scoreBeckDepression(sixteen);
  const at = scoreBeckDepression(seventeen);
  assert.equal(below.status, 'complete');
  assert.equal(at.status, 'complete');
  assert.equal(below.totalScore, 16);
  assert.equal(below.screeningThresholdReached, false);
  assert.equal(at.totalScore, 17);
  assert.equal(at.screeningThresholdReached, true);
  assert.equal('diagnosis' in at, false);
  assert.equal('cognitiveAffectiveScore' in at, false);
  assert.equal('somaticPerformanceScore' in at, false);
});

test('item 9 endorsement is a neutral flag and does not change the arithmetic', () => {
  const responses = responseSet(0);
  responses[8]!.score = 2;
  const result = scoreBeckDepression(responses);
  assert.equal(result.status, 'complete');
  assert.equal(result.totalScore, 2);
  assert.equal(result.criticalItemScore, 2);
  assert.equal(result.criticalItemEndorsed, true);
  assert.equal('suicideRisk' in result, false);
});

test('response order is irrelevant but canonical output is sorted 1–21', () => {
  const shuffled = responseSet(1).reverse();
  const result = scoreBeckDepression(shuffled);
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.responses.map((response) => response.itemId), Array.from({ length: 21 }, (_, index) => index + 1));
  assert.equal(result.totalScore, 21);
});

test('one missing response is incomplete and never silently converted to zero', () => {
  const result = scoreBeckDepression(responseSet(1).slice(0, 20));
  assert.equal(result.status, 'incomplete');
  assert.deepEqual(result.validation.missingItemIds, [21]);
  assert.equal(result.validation.answeredCount, 20);
  assert.equal('totalScore' in result, false);
});

test('empty response set reports all 21 IDs as missing and exposes no score', () => {
  const result = scoreBeckDepression([]);
  assert.equal(result.status, 'incomplete');
  assert.equal(result.validation.answeredCount, 0);
  assert.equal(result.validation.missingItemIds.length, 21);
  assert.equal('totalScore' in result, false);
});

test('duplicate item IDs are rejected even when 21 response objects are supplied', () => {
  const responses = responseSet(0);
  responses[20] = { itemId: 20, score: 0 };
  expectInvalid(responses, 'duplicate-item-id');
});

test('unknown, noninteger, nonnumeric and missing item IDs are rejected', () => {
  for (const badId of [0, 22, 1.5, '1', null, undefined, Number.NaN]) {
    const responses: unknown[] = responseSet(0);
    responses[0] = { itemId: badId, score: 0 };
    expectInvalid(responses, 'invalid-item-id');
  }
});

test('null, undefined, fractional, nonnumeric and out-of-range scores are rejected', () => {
  for (const badScore of [null, undefined, 0.5, 2.2, '0', '3', -1, 4, Number.NaN, Number.POSITIVE_INFINITY]) {
    const responses: unknown[] = responseSet(0);
    responses[0] = { itemId: 1, score: badScore };
    expectInvalid(responses, 'invalid-score');
  }
});

test('malformed response values are rejected without throwing', () => {
  for (const malformed of [null, undefined, 1, 'x', [], true]) {
    const responses: unknown[] = responseSet(0);
    responses[0] = malformed;
    expectInvalid(responses, 'invalid-entry');
  }
});

test('score transfer helper preserves blanks as absence instead of zero', () => {
  const answers = Array.from({ length: 21 }, () => null as number | null);
  answers[0] = 0;
  answers[8] = 3;
  assert.deepEqual(responsesFromAnswerSlots(answers), [
    { itemId: 1, score: 0 },
    { itemId: 9, score: 3 },
  ]);
  assert.equal(scoreBeckDepression(responsesFromAnswerSlots(answers)).status, 'incomplete');
});

test('result construction stores one scoring source, metadata, note and revision lineage', () => {
  const score = scoreBeckDepression(responseSet(1));
  assert.equal(score.status, 'complete');
  const result = createBeckDepressionResult(score, {
    id: 'bdi_revision_2',
    clientId: 'client_1',
    name: 'Danışan',
    gender: 'KADIN',
    age: 30,
    testDate: '2026-09-20',
    expertNote: 'Uzman notu',
    revision: 2,
    revisionOf: 'bdi_revision_1',
    createdAt: '2026-09-20T12:00:00.000Z',
  });

  assert.equal(result.instrumentId, BDI_INSTRUMENT_ID);
  assert.equal(result.instrumentVersion, BDI_INSTRUMENT_VERSION);
  assert.equal(result.scoringVersion, BDI_SCORING_VERSION);
  assert.equal(result.completionStatus, 'complete');
  assert.equal(result.responses.length, 21);
  assert.deepEqual(result.answers, Array.from({ length: 21 }, () => 1));
  assert.equal(result.totalScore, 21);
  assert.equal(result.maximumScore, 63);
  assert.equal(result.scoreBand, 'Tarama eşiğinde veya üzerinde');
  assert.equal(beckDepressionScoreContext(result), 'Tarama eşiğinde veya üzerinde');
  assert.equal('severity' in result, false);
  assert.equal(result.notes, 'Uzman notu');
  assert.equal(result.revision, 2);
  assert.equal(result.revisionOf, 'bdi_revision_1');
  assert.deepEqual(result.criticalItemFlags, ['item-9-endorsed']);
  assert.doesNotMatch(result.clinicalInterpretation, /tanı konmuştur|intihar riski yüzde/i);
  assert.equal('suicideRisk' in result, false);
});

test('result construction refuses an incomplete score object', () => {
  const incomplete = scoreBeckDepression(responseSet(0).slice(0, 20));
  assert.throws(() => createBeckDepressionResult(incomplete, {
    id: 'bad', name: 'Danışan', gender: 'ERKEK', testDate: '2026-09-20',
  }), /tamamlanmamış/i);
});

test('integrity assertion recomputes current-version persisted results', () => {
  const score = scoreBeckDepression(responseSet(1));
  assert.equal(score.status, 'complete');
  const valid = createBeckDepressionResult(score, {
    id: 'valid', name: 'Danışan', gender: 'ERKEK', testDate: '2026-09-20',
  });
  assert.doesNotThrow(() => assertBeckDepressionResultIntegrity(valid));
  assert.throws(() => assertBeckDepressionResultIntegrity({ ...valid, totalScore: 20 }), /bütünlük/i);
  assert.throws(() => assertBeckDepressionResultIntegrity({ ...valid, responses: valid.responses.slice(0, 20) }), /bütünlük/i);
  assert.throws(() => assertBeckDepressionResultIntegrity({ ...valid, testDate: '2026-02-31' }), /bütünlük/i);
  assert.throws(() => assertBeckDepressionResultIntegrity({ ...valid, testDate: '2099-01-01' }), /bütünlük/i);
  assert.throws(() => assertBeckDepressionResultIntegrity({ ...valid, revision: 0 }), /bütünlük/i);
  assert.throws(() => assertBeckDepressionResultIntegrity({ ...valid, revisionOf: valid.id }), /bütünlük/i);
});

test('legacy item-9 readers remain load-compatible without writing legacy risk fields', () => {
  const legacy = {
    id: 'legacy', clientName: 'Eski', clientGender: 'KADIN', testDate: '2020-01-01',
    answers: responseSet(0).map((response) => response.score), totalScore: 2,
    severity: 'Hafif', cognitiveAffectiveScore: 2, somaticPerformanceScore: 0,
    suicideRisk: true, suicideItemScore: 2, clinicalInterpretation: '', createdAt: '2020-01-01T00:00:00.000Z',
  } satisfies BeckDepressionResult;
  assert.equal(isBeckCriticalItemEndorsed(legacy), true);
  assert.equal(beckCriticalItemScore(legacy), 2);
  assert.equal(beckDepressionScoreContext(legacy), 'Hafif');
  assert.doesNotThrow(() => assertBeckDepressionResultIntegrity(legacy));
});
