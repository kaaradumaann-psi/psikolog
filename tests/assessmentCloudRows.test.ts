import test from 'node:test';
import assert from 'node:assert/strict';
import { createBeckDepressionResult, scoreBeckDepression } from '../src/clinical/beckDepression';
import { createBeckAnxietyResult, scoreBeckAnxiety } from '../src/clinical/beckAnxiety';
import { createScl90Result, scoreScl90 } from '../src/clinical/scl90';
import { createRapidScreeningResult, scoreGad7, scorePhq9 } from '../src/clinical/rapidScreening';
import { decodeTestRow, SYSTEM_TEST_DEFINITIONS, testToRows, type TestKind } from '../src/clinical/cloud/rows';

const responses = (count: number, score: number) => Array.from({ length: count }, (_, index) => ({ itemId: index + 1, score }));
const metadata = { id: 'record-1', clientId: 'client-1', name: 'Ayşe Yılmaz', gender: 'KADIN' as const, testDate: '2026-09-26', createdAt: '2026-09-26T12:00:00.000Z' };
const ctx = { userId: 'user-1', organizationId: 'org-1' };

const records: Array<{ kind: TestKind; definition: string; value: ReturnType<typeof createBeckDepressionResult> | ReturnType<typeof createBeckAnxietyResult> | ReturnType<typeof createScl90Result> | ReturnType<typeof createRapidScreeningResult> }> = [
  { kind: 'bdi', definition: SYSTEM_TEST_DEFINITIONS.bdi, value: createBeckDepressionResult(scoreBeckDepression(responses(21, 0)), metadata) },
  { kind: 'bai', definition: SYSTEM_TEST_DEFINITIONS.bai, value: createBeckAnxietyResult(scoreBeckAnxiety(responses(21, 1)), metadata) },
  { kind: 'scl90', definition: SYSTEM_TEST_DEFINITIONS.scl90, value: createScl90Result(scoreScl90(responses(90, 0)), metadata) },
  { kind: 'screening', definition: SYSTEM_TEST_DEFINITIONS.gad7, value: createRapidScreeningResult(scoreGad7(responses(7, 1)), metadata) },
  { kind: 'screening', definition: SYSTEM_TEST_DEFINITIONS.phq9, value: createRapidScreeningResult(scorePhq9(responses(9, 1)), metadata) },
];

test('beş araç bulut satırında doğru sistem tanımı, sürümler, tam sonuç ve kalıcı sonuç ID taşır', () => {
  for (const record of records) {
    const rows = testToRows(record.kind, record.value, ctx);
    assert.equal(rows.administration.test_definition_id, record.definition);
    assert.equal(rows.administration.instrument_version, record.value.instrumentVersion);
    assert.equal(rows.administration.scoring_version, record.value.scoringVersion);
    assert.equal(rows.administration.revision, 1);
    assert.equal(rows.administration.amendment_of, null);
    assert.equal(rows.administration.status, 'completed');
    assert.equal(rows.result.id, `test_result_${record.value.id}`);
    assert.deepEqual((rows.result.result_data as Record<string, unknown>).responses, record.value.responses);
    assert.equal(typeof rows.result.summary, 'string');
  }
});

test('bulut revizyonu önceki uygulamaya bağlanır; eski satırın ID veya verisi yeniden kullanılmaz', () => {
  const source = records[1]!.value;
  const revision = { ...source, id: 'record-2', revision: 2, revisionOf: source.id };
  const rows = testToRows('bai', revision, ctx);
  assert.equal(rows.administration.id, 'record-2');
  assert.equal(rows.administration.amendment_of, 'record-1');
  assert.equal(rows.administration.revision, 2);
  assert.equal(rows.result.test_administration_id, 'record-2');
  assert.equal(rows.result.id, 'test_result_record-2');
});

test('özetler araca özgüdür ve eski ortak BAI/SCL/PHQ risk iddialarını üretmez', () => {
  const summaries = records.map((record) => String(testToRows(record.kind, record.value, ctx).result.summary));
  assert.match(summaries[0]!, /^BDI · 0 ·/);
  assert.match(summaries[1]!, /^BAI · 21 ·/);
  assert.match(summaries[2]!, /^SCL-90-R · GSI 0 · PST 0$/);
  assert.match(summaries[3]!, /^GAD7 · 7 ·/);
  assert.match(summaries[4]!, /^PHQ9 · 9 ·/);
  for (const summary of summaries) assert.doesNotMatch(summary, /intihar riski|risk yüzdesi|GSI >=|tanı kondu/i);
});

test('cloud decode üst satırdaki danışan/uygulama kimliğini kullanır ve tutarlı güncel sonucu kabul eder', () => {
  for (const record of records) {
    const rows = testToRows(record.kind, record.value, ctx);
    const decoded = decodeTestRow({
      ...rows.result,
      test_administration_id: 'cloud-administration-id',
      client_id: 'cloud-client-id',
    }, 'Bulut Danışan');
    assert.ok(decoded);
    assert.equal(decoded.value.id, 'cloud-administration-id');
    assert.equal(decoded.value.clientId, 'cloud-client-id');
    assert.equal(decoded.value.clientName, 'Bulut Danışan');
  }
});

test('değiştirilmiş güncel bulut skorları history/report cache içine alınmaz', () => {
  for (const record of records) {
    const rows = testToRows(record.kind, record.value, ctx);
    const data = rows.result.result_data as Record<string, unknown>;
    const tampered = record.kind === 'scl90'
      ? { ...data, gsi: 3.14 }
      : { ...data, totalScore: 999 };
    assert.equal(decodeTestRow({
      ...rows.result,
      result_data: tampered,
      test_administration_id: record.value.id,
      client_id: record.value.clientId,
    }, record.value.clientName), null);
  }
});

test('danışan dosyası olmayan sonuç buluta anonim/manüel kayıt olarak gönderilmez', () => {
  const manual = { ...records[1]!.value, clientId: undefined };
  assert.throws(() => testToRows('bai', manual, ctx), /kayıtlı danışan dosyası/i);
});
