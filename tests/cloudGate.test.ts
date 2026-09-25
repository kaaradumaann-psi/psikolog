import assert from 'node:assert/strict';
import test from 'node:test';
import { cloudGateStatus } from '../src/clinical/cloud/gate';

test('bulut kapısı yalnız ilgili kullanıcının sunucu anlık görüntüsü uygulandıysa açılır', () => {
  const a = 'user-A';
  const b = 'user-B';
  assert.equal(cloudGateStatus(a, true, { phase: 'inactive', hydrated: false }), 'local');
  assert.equal(cloudGateStatus(a, false, { phase: 'inactive', hydrated: false }), 'loading');
  assert.equal(cloudGateStatus(a, false, { userId: a, phase: 'loading', hydrated: false }), 'loading');
  assert.equal(cloudGateStatus(a, false, { userId: a, phase: 'ready', hydrated: false }), 'loading', 'okuma bitse bile cache uygulanana dek kilitli');
  assert.equal(cloudGateStatus(a, false, { userId: a, phase: 'error', hydrated: false }), 'error', 'başarısız okuma boş dosya açmaz');
  assert.equal(cloudGateStatus(a, false, { userId: a, phase: 'ready', hydrated: true }), 'ready');
  assert.equal(cloudGateStatus(a, false, { userId: a, phase: 'offline', hydrated: true }), 'ready', 'yazma hatası anlık görüntüyü silmez');
  assert.equal(cloudGateStatus(b, false, { userId: a, phase: 'ready', hydrated: true }), 'loading', 'A verisi B hesabında görünmez');
  assert.equal(cloudGateStatus(b, false, { userId: a, phase: 'error', hydrated: false }), 'loading', 'A hatası B hesabına ait değildir');
});
