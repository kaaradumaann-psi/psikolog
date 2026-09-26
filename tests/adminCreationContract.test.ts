import assert from 'node:assert/strict';
import test from 'node:test';
import { adminCreateUser, createdProfileFromResponse } from '../src/features/admin/adminApi';

const org = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const profile = {
  id, organization_id: org, role: 'PSYCHOLOG', active: true,
  first_name: 'Ayşe', last_name: 'Deniz', email: 'test@example.com',
};

test('admin-users yanıtı {profile} zarfından açılır; kurum/rol/aktiflik sunucu tarafından doğrulanır', () => {
  const result = createdProfileFromResponse({ profile }, org, 'PSYCHOLOG');
  assert.equal(result.id, id);
  assert.equal(result.organization_id, org);
  assert.throws(() => createdProfileFromResponse(profile, org, 'PSYCHOLOG'), /doğrulanamadı/,
    'düz objeyi profile zarfı sanmamalı');
  assert.throws(() => createdProfileFromResponse({ profile }, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'PSYCHOLOG'), /doğrulanamadı/);
  assert.throws(() => createdProfileFromResponse({ profile: { ...profile, active: false } }, org, 'PSYCHOLOG'), /doğrulanamadı/);
  assert.throws(() => createdProfileFromResponse({ profile: { ...profile, role: 'ADMIN' } }, org, 'PSYCHOLOG'), /doğrulanamadı/);
  assert.throws(() => createdProfileFromResponse({ profile: { ...profile, role: 'ORG_ADMIN' } }, org, 'PSYCHOLOG'), /doğrulanamadı/);
});

test('kurum seçilmeden veya kısa parolayla Auth çağrısı başlatılmaz', async () => {
  await assert.rejects(
    adminCreateUser({ firstName: 'Ayşe', lastName: 'Deniz', email: 'test@example.com', password: 'uzunsifrelor', organizationId: '' }),
    /kurum seçin/i,
  );
  await assert.rejects(
    adminCreateUser({ firstName: 'Ayşe', lastName: 'Deniz', email: 'test@example.com', password: '12345678', organizationId: org }),
    /en az 10 karakter/i,
  );
});
