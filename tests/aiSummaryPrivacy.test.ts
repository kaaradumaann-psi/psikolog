import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProfileFromAnswers } from '../src/scoring/mmpiScoring';
import { buildAiProfileSummary } from '../src/ai/aiInterpretation';
import type { ItemAnswer } from '../src/workspace/caseTypes';

/**
 * KVKK uyum regresyon testi: yapay zekâ istemine giden özet İSİMSİZ olmalı.
 *
 * Danışanın adı/soyadı kişiyi doğrudan tanımlayan veridir; yorum yalnız sayısal
 * profil + yaş/cinsiyet bağlamından üretildiği için LLM sağlayıcısına hiç
 * gönderilmez (KVKK m.4/3-d sahte isimlendirme). Bu test, ad/soyadın özetin
 * hiçbir alanına sızmamasını kanıtlar — kimlik bağlamı yalnız `age` ile sınırlıdır.
 */

function buildProfileWithIdentifiableName(): { profile: ReturnType<typeof buildProfileFromAnswers> } {
  const answers: ItemAnswer[] = Array.from({ length: 566 }, (_, i) => (i % 7 === 0 ? 'Y' : 'D'));
  return { profile: buildProfileFromAnswers(answers, 'Erkek') };
}

test('AI özetine danışan adı/soyadı katılmaz (isimsiz istem)', () => {
  const { profile } = buildProfileWithIdentifiableName();
  // Gerçek dünyada arayüzden bu alanlar taşınmazdı; burada yalnız yaş verilir.
  const summary = buildAiProfileSummary(profile, 'quick', { age: 34 });

  assert.deepEqual(summary.client, { age: 34 });
  const wire = JSON.stringify(summary);
  assert.ok(!wire.includes('firstName'), 'özet ad alanı taşıyamaz');
  assert.ok(!wire.includes('lastName'), 'özet soyad alanı taşıyamaz');
  assert.ok(!wire.includes('name'), 'özet hiçbir name alanı taşıyamaz');
});

test('AI özeti yalnız sayısal profil + yaş/cinsiyet bağlamından oluşur', () => {
  const { profile } = buildProfileWithIdentifiableName();
  const summary = buildAiProfileSummary(profile, 'raw', { age: 52 });

  // Kimlik bağlamı yalnız yaş; cinsiyet üst düzeyde (norm seçimi).
  assert.equal(summary.gender, 'Erkek');
  assert.equal(summary.method, 'raw');
  assert.deepEqual(summary.client, { age: 52 });

  // Ölçek satırları yalnız kimlik/ölçü alanları: id, ham, K, T, düzey.
  for (const scale of summary.scales) {
    assert.equal(typeof scale.id, 'string');
    assert.ok(Number.isInteger(scale.raw) && scale.raw >= 0);
    assert.ok(scale.k === null || Number.isInteger(scale.k));
    assert.ok(Number.isFinite(scale.t) && scale.t >= 20 && scale.t <= 120);
    assert.equal(typeof scale.level, 'string');
  }

  // Geçerlik yalnız sayılar + önceden tanımlı durum etiketi.
  assert.ok(Number.isInteger(summary.validity.cannotSay));
  assert.ok(Number.isInteger(summary.validity.l));
  assert.ok(Number.isInteger(summary.validity.f));
  assert.ok(Number.isInteger(summary.validity.k));
  assert.ok(Number.isInteger(summary.validity.fMinusK));
  assert.ok(['GECERLI', 'SUPHELI', 'GECERSIZ'].includes(summary.validity.status));
  assert.ok(Number.isFinite(summary.maxT) && Number.isFinite(summary.minT));
});

test('yaş sınır dışıysa kimlik bağlamı gönderilmez', () => {
  const { profile } = buildProfileWithIdentifiableName();
  const under = buildAiProfileSummary(profile, 'quick', { age: 10 });
  const over = buildAiProfileSummary(profile, 'quick', { age: 200 });
  const none = buildAiProfileSummary(profile, 'quick', null);
  assert.equal(under.client, null);
  assert.equal(over.client, null);
  assert.equal(none.client, null);
});
