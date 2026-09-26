import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAD7_INSTRUMENT_ID,
  GAD7_INSTRUMENT_VERSION,
  GAD7_ITEMS,
  GAD7_SCORING_VERSION,
  GAD7_TURKISH_SCREENING_THRESHOLD,
  PHQ9_INSTRUMENT_ID,
  PHQ9_INSTRUMENT_VERSION,
  PHQ9_ITEMS,
  PHQ9_SCORING_VERSION,
  assertRapidScreeningResultIntegrity,
  createRapidScreeningResult,
  gad7ScoreBand,
  phq9CriticalItemEndorsed,
  phq9ScoreBand,
  rapidResponsesFromSlots,
  scoreGad7,
  scorePhq9,
} from '../src/clinical/rapidScreening';

const complete = (count: number, score = 0) => Array.from({ length: count }, (_, index) => ({ itemId: index + 1, score }));

function gadResult(responses = complete(7, 0)) {
  const scoring = scoreGad7(responses);
  assert.equal(scoring.status, 'complete');
  return createRapidScreeningResult(scoring, {
    id: 'gad_test_1', name: 'Danışan', gender: 'KADIN', age: 30,
    testDate: '2026-09-26', expertNote: 'Not', createdAt: '2026-09-26T11:00:00.000Z',
  });
}

function phqResult(responses = complete(9, 0)) {
  const scoring = scorePhq9(responses);
  assert.equal(scoring.status, 'complete');
  return createRapidScreeningResult(scoring, {
    id: 'phq_test_1', name: 'Danışan', gender: 'ERKEK', age: 41,
    testDate: '2026-09-26', functionalDifficulty: 2, createdAt: '2026-09-26T11:30:00.000Z',
  });
}

test('GAD-7/PHQ-9: doğru sayıda ardışık ID vardır; doğrulanmamış Türkçe metin gömülü değildir', () => {
  assert.deepEqual(GAD7_ITEMS.map((item) => item.id), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(PHQ9_ITEMS.map((item) => item.id), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.ok([...GAD7_ITEMS, ...PHQ9_ITEMS].every((item) => !('text' in item) && !('title' in item)));
});

test('GAD-7: tüm sıfırlar 0/21 ve minimal belirti bandıdır', () => {
  const scoring = scoreGad7(complete(7, 0));
  assert.equal(scoring.status, 'complete');
  if (scoring.status !== 'complete') return;
  assert.equal(scoring.totalScore, 0);
  assert.equal(scoring.maximumScore, 21);
  assert.equal(scoring.scoreBand, '0–4 · minimal belirti düzeyi');
  assert.equal(scoring.screeningThresholdReached, false);
});

test('GAD-7: tüm üçler 21/21 üst sınırıdır', () => {
  const scoring = scoreGad7(complete(7, 3));
  assert.equal(scoring.status, 'complete');
  if (scoring.status === 'complete' && scoring.type === 'gad7') {
    assert.equal(scoring.totalScore, 21);
    assert.equal(scoring.screeningThresholdReached, true);
  }
});

test('GAD-7: özgün belirti bantlarının tüm sınırları korunur', () => {
  const expected = new Map<number, string>([
    [0, '0–4 · minimal belirti düzeyi'], [4, '0–4 · minimal belirti düzeyi'],
    [5, '5–9 · hafif belirti düzeyi'], [9, '5–9 · hafif belirti düzeyi'],
    [10, '10–14 · orta belirti düzeyi'], [14, '10–14 · orta belirti düzeyi'],
    [15, '15–21 · yüksek belirti düzeyi'], [21, '15–21 · yüksek belirti düzeyi'],
  ]);
  for (const [score, band] of expected) assert.equal(gad7ScoreBand(score), band);
});

test('GAD-7: Türkçe klinik örneklem tarama referansı 8 ayrı alan olarak izlenir', () => {
  const below = complete(7, 1); // 7
  const at = complete(7, 1); at[0] = { itemId: 1, score: 2 }; // 8
  const s7 = scoreGad7(below);
  const s8 = scoreGad7(at);
  assert.equal(GAD7_TURKISH_SCREENING_THRESHOLD, 8);
  assert.equal(s7.status === 'complete' && s7.type === 'gad7' && s7.screeningThresholdReached, false);
  assert.equal(s8.status === 'complete' && s8.type === 'gad7' && s8.screeningThresholdReached, true);
});

test('PHQ-9: tüm sıfırlar 0/27 ve tüm üçler 27/27 üretir', () => {
  const zero = scorePhq9(complete(9, 0));
  const max = scorePhq9(complete(9, 3));
  assert.equal(zero.status === 'complete' && zero.totalScore, 0);
  assert.equal(max.status === 'complete' && max.totalScore, 27);
});

test('PHQ-9: özgün belirti bantlarının tüm sınırları korunur', () => {
  const expected = new Map<number, string>([
    [0, '0–4 · minimal belirti düzeyi'], [4, '0–4 · minimal belirti düzeyi'],
    [5, '5–9 · hafif belirti düzeyi'], [9, '5–9 · hafif belirti düzeyi'],
    [10, '10–14 · orta belirti düzeyi'], [14, '10–14 · orta belirti düzeyi'],
    [15, '15–19 · orta-yüksek belirti düzeyi'], [19, '15–19 · orta-yüksek belirti düzeyi'],
    [20, '20–27 · yüksek belirti düzeyi'], [27, '20–27 · yüksek belirti düzeyi'],
  ]);
  for (const [score, band] of expected) assert.equal(phq9ScoreBand(score), band);
});

test('PHQ-9: madde 9 toplamdan bağımsız nötr bayrak ve puan üretir', () => {
  const responses = complete(9, 0);
  responses[8] = { itemId: 9, score: 2 };
  const scoring = scorePhq9(responses);
  assert.equal(scoring.status, 'complete');
  if (scoring.status !== 'complete' || scoring.type !== 'phq9') return;
  assert.equal(scoring.totalScore, 2);
  assert.equal(scoring.criticalItemEndorsed, true);
  assert.equal(scoring.criticalItemScore, 2);
  assert.deepEqual(scoring.criticalItemFlags, ['item-9-endorsed']);
});

test('GAD-7/PHQ-9: eksik yanıt sıfır sayılmaz ve toplam üretilmez', () => {
  const gad = scoreGad7(complete(6, 0));
  const phq = scorePhq9(complete(8, 0));
  assert.equal(gad.status, 'incomplete');
  assert.deepEqual(gad.validation.missingItemIds, [7]);
  assert.equal(phq.status, 'incomplete');
  assert.deepEqual(phq.validation.missingItemIds, [9]);
  assert.equal('totalScore' in gad, false);
  assert.equal('totalScore' in phq, false);
});

test('GAD-7/PHQ-9: dizi olmayan ve geçersiz girişler reddedilir', () => {
  assert.equal(scoreGad7(null).status, 'invalid');
  assert.equal(scorePhq9({}).status, 'invalid');
  const duplicate = complete(7, 0); duplicate[6] = { itemId: 1, score: 0 };
  assert.equal(scoreGad7(duplicate).status, 'invalid');
  const badId = complete(9, 0); badId[0] = { itemId: 10, score: 0 };
  assert.equal(scorePhq9(badId).status, 'invalid');
});

test('GAD-7/PHQ-9: skorlar clamp, coerce veya truncate edilmez', () => {
  for (const bad of [-1, 4, 1.2, Number.NaN, '3', null, undefined]) {
    const gad = complete(7, 0) as Array<{ itemId: number; score: unknown }>;
    gad[2] = { itemId: 3, score: bad };
    assert.equal(scoreGad7(gad).status, 'invalid', `gad=${String(bad)}`);
    const phq = complete(9, 0) as Array<{ itemId: number; score: unknown }>;
    phq[2] = { itemId: 3, score: bad };
    assert.equal(scorePhq9(phq).status, 'invalid', `phq=${String(bad)}`);
  }
});

test('GAD-7/PHQ-9: giriş sırası toplamı değiştirmez', () => {
  const gad = scoreGad7(complete(7, 2).reverse());
  const phq = scorePhq9(complete(9, 2).reverse());
  assert.equal(gad.status === 'complete' && gad.totalScore, 14);
  assert.equal(phq.status === 'complete' && phq.totalScore, 18);
  if (phq.status === 'complete') assert.deepEqual(phq.responses.map((response) => response.itemId), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('GAD-7/PHQ-9: slot dönüştürücü null/undefined yanıtı cevap diye eklemez', () => {
  const slots: Array<number | null | undefined> = [0, 1, null, 2, undefined, 3, 0];
  const responses = rapidResponsesFromSlots(slots);
  assert.deepEqual(responses.map((response) => response.itemId), [1, 2, 4, 6, 7]);
  assert.equal(scoreGad7(responses).status, 'incomplete');
});

test('GAD-7: yeni kayıt kimlik, puanlama, Türkçe referans ve revizyon metadatası taşır', () => {
  const result = gadResult(complete(7, 2));
  assert.equal(result.instrumentId, GAD7_INSTRUMENT_ID);
  assert.equal(result.instrumentVersion, GAD7_INSTRUMENT_VERSION);
  assert.equal(result.scoringVersion, GAD7_SCORING_VERSION);
  assert.equal(result.completionStatus, 'complete');
  assert.equal(result.totalScore, 14);
  assert.equal(result.screeningThreshold, 8);
  assert.equal(result.screeningThresholdReached, true);
  assert.equal(result.revision, 1);
  assert.equal(result.severity, undefined);
  assert.doesNotMatch(result.clinicalNote, /terapi protokolü|tedavi.*önerilir/i);
  assert.match(result.clinicalNote, /tanı değildir/i);
});

test('PHQ-9: yeni kayıt işlevsellik kodu ve nötr kritik alanları saklar; suicideRisk üretmez', () => {
  const responses = complete(9, 1);
  const result = phqResult(responses);
  assert.equal(result.instrumentId, PHQ9_INSTRUMENT_ID);
  assert.equal(result.instrumentVersion, PHQ9_INSTRUMENT_VERSION);
  assert.equal(result.scoringVersion, PHQ9_SCORING_VERSION);
  assert.equal(result.functionalDifficulty, 2);
  assert.equal(result.criticalItemEndorsed, true);
  assert.equal(result.criticalItemScore, 1);
  assert.equal(result.suicideRisk, undefined);
  assert.equal(phq9CriticalItemEndorsed(result), true);
  assert.match(result.clinicalNote, /risk sınıfı veya yüzdesi üretmez/i);
});

test('GAD-7/PHQ-9: bütünlük kontrolü tutarlı kayıtları kabul eder', () => {
  assert.doesNotThrow(() => assertRapidScreeningResultIntegrity(gadResult()));
  assert.doesNotThrow(() => assertRapidScreeningResultIntegrity(phqResult()));
});

test('GAD-7/PHQ-9: bütünlük kontrolü değiştirilmiş skor, bayrak ve işlevsellik kodunu reddeder', () => {
  const gad = gadResult();
  const phq = phqResult();
  assert.throws(() => assertRapidScreeningResultIntegrity({ ...gad, totalScore: 3 }), /tutarlı değil/i);
  assert.throws(() => assertRapidScreeningResultIntegrity({ ...phq, criticalItemScore: 3 }), /tutarlı değil/i);
  assert.throws(() => assertRapidScreeningResultIntegrity({ ...phq, functionalDifficulty: 4 }), /metadata/i);
  assert.throws(() => assertRapidScreeningResultIntegrity({ ...phq, suicideRisk: true }), /tutarlı değil/i);
});

test('GAD-7/PHQ-9: kayıt oluşturucu eksik yanıtı ve geçersiz revizyon metadatasını reddeder', () => {
  assert.throws(() => createRapidScreeningResult(scoreGad7(complete(6, 0)), { id: 'x', name: 'A' }), /Tamamlanmamış/i);
  const result = gadResult();
  assert.throws(() => assertRapidScreeningResultIntegrity({ ...result, revision: 0 }), /metadata/i);
  assert.throws(() => assertRapidScreeningResultIntegrity({ ...result, revisionOf: result.id }), /metadata/i);
});
