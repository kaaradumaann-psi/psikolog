import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeTestRow } from '../src/clinical/cloud/rows';

test('ölçek satırı başka cihazda JSON içindeki yerel ID yerine sunucu client_id ile eşlenir', () => {
  const decoded = decodeTestRow({
    id: 'result-1', test_administration_id: 'test-1', client_id: 'server-client-uuid',
    result_data: { kind: 'bdi', id: 'device-test-id', clientId: 'device-client-id', totalScore: 9 },
  }, 'Ayşe Kaya');
  assert.equal(decoded?.value.id, 'test-1');
  assert.equal(decoded?.value.clientId, 'server-client-uuid');
  assert.equal(decoded?.value.clientName, 'Ayşe Kaya');
});

test('sunucu anlık görüntüsü arşiv işaretini ve revizyon bağını kaybetmez', async () => {
  const { rowToFormulation, rowToSafetyPlan, rowToReport } = await import('../src/clinical/cloud/rows');
  const row = {
    id: 'old-uuid', client_id: 'client-uuid', status: 'locked',
    superseded_by: 'new-uuid', amendment_of: 'parent-uuid',
    amendment_reason: 'Klinik düzeltme', content: {},
  };
  for (const value of [rowToFormulation(row), rowToSafetyPlan(row), rowToReport(row)]) {
    assert.equal(value.supersededBy, 'new-uuid');
    assert.equal(value.amendmentOf, 'parent-uuid');
    assert.equal(value.amendmentReason, 'Klinik düzeltme');
  }
});
