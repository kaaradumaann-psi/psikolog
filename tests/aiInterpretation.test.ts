import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = fileURLToPath(new URL('.', import.meta.url));
import { buildProfileFromAnswers } from '../src/scoring/mmpiScoring';
import { buildAiProfileSummary, type AiProfileSummary } from '../src/ai/aiInterpretation';
import type { ItemAnswer } from '../src/workspace/caseTypes';

/**
 * PHASE 11: Yapay zekâ yorum katmanı denetim testleri.
 *
 * Denetlenen kural ve ilkeler:
 *  - §39: AI hesaplama yapmaz; yalnızca önceden doğrulanmış sayısal profil özeti alır.
 *  - §39: Ham cevap dizisi (1-566) isteme asla katılmaz.
 *  - KVKK / Gizlilik: Danışan adı/soyadı cihaza özeldir, LLM'e taşınmaz (yalnız yaş/cinsiyet).
 *  - Klinik karar destek sınırları: Sistem isteminde tanı/tedavi yasağı ve geçerlik önceliği bulunur.
 */

function makeTestProfile(gender: 'Erkek' | 'Kadın' = 'Erkek') {
  const answers: ItemAnswer[] = Array.from({ length: 566 }, (_, i) => (i % 3 === 0 ? 'D' : 'Y'));
  return buildProfileFromAnswers(answers, gender);
}

test('PHASE 11 · buildAiProfileSummary: 13 ölçeği doğru haritalar, ? ölçeğini ana listeden çıkarır', () => {
  const profile = makeTestProfile('Erkek');
  const summary: AiProfileSummary = buildAiProfileSummary(profile, 'quick', { age: 28 });

  // 13 klinik/geçerlik ölçeği (L, F, K, Hs..Si); ? ölçeği cannotSay alanına ayrılmıştır
  assert.equal(summary.scales.length, 13);
  assert.ok(!summary.scales.some(s => s.id === '?'), '? ölçeği scales dizisinde olmamalı');

  // Her ölçeğin id, raw, t, level alanları geçerli olmalı
  for (const s of summary.scales) {
    assert.ok(typeof s.id === 'string' && s.id.length > 0);
    assert.ok(Number.isInteger(s.raw) && s.raw >= 0);
    assert.ok(Number.isFinite(s.t) && s.t >= 20 && s.t <= 120);
    assert.ok(typeof s.level === 'string' && s.level.length > 0);
    assert.ok(s.k === null || Number.isInteger(s.k));
  }

  // Geçerlik bloğu
  assert.equal(typeof summary.validity.cannotSay, 'number');
  assert.equal(summary.validity.cannotSay, profile.cannotSayScale.rawScore);
  assert.ok(['GECERLI', 'SUPHELI', 'GECERSIZ'].includes(summary.validity.status));
  assert.equal(summary.validity.fMinusK, profile.validityAnalysis.fMinusK);
  assert.equal(summary.gender, 'Erkek');
  assert.equal(summary.method, 'quick');
});

test('PHASE 11 · KVKK yaş filtreleme sınırları: 16-120 yaş aralığı korunur, dışındakiler null yapılır', () => {
  const profile = makeTestProfile('Kadın');

  assert.deepEqual(buildAiProfileSummary(profile, 'raw', { age: 16 }).client, { age: 16 });
  assert.deepEqual(buildAiProfileSummary(profile, 'raw', { age: 120 }).client, { age: 120 });
  assert.deepEqual(buildAiProfileSummary(profile, 'raw', { age: 45 }).client, { age: 45 });

  // Sınır dışı yaşlar
  assert.equal(buildAiProfileSummary(profile, 'raw', { age: 15 }).client, null);
  assert.equal(buildAiProfileSummary(profile, 'raw', { age: 121 }).client, null);
  assert.equal(buildAiProfileSummary(profile, 'raw', { age: -5 }).client, null);
});

test('PHASE 11 · §39: Yapay zekâya ham cevap matrisi (1-566) kesinlikle taşınmaz', () => {
  const profile = makeTestProfile('Erkek');
  const summary = buildAiProfileSummary(profile, 'omr', { age: 30 });
  const serialized = JSON.stringify(summary);

  assert.ok(!serialized.includes('answers'), 'özet answers dizisi içeremez');
  assert.ok(!serialized.includes('itemAnswers'), 'özet itemAnswers içeremez');
  assert.ok(!serialized.includes('rawAnswers'), 'özet rawAnswers içeremez');
  assert.ok(!serialized.includes('items'), 'özet items dizisi içeremez');
});

test('PHASE 11 · Edge Function sistem istemi: klinik güvenlik sınırları ve MMPI Türkiye standardizasyonu', () => {
  const functionSourcePath = resolve(testDir, '../supabase/functions/ai-interpretation/index.ts');
  const functionSource = readFileSync(functionSourcePath, 'utf-8');

  // 1. MMPI-566 Türkiye standardizasyonuna açık atıf
  assert.ok(
    functionSource.includes('MMPI-566 (Türkiye standardizasyonu'),
    'Sistem isteminde Türkiye standardizasyonu atfı bulunmalı',
  );

  // 2. Klinik karar destek kısıtlamaları (§39)
  assert.ok(functionSource.includes('Tanı KOYMA'), 'İstem tanı koyma yasağı içermeli');
  assert.ok(functionSource.includes('Tedavi/ilaç önerme'), 'İstem tedavi önerme yasağı içermeli');
  assert.ok(functionSource.includes('Kesin klinik karar verme'), 'İstem kesin klinik karar yasağı içermeli');

  // 3. Geçerlik değerlendirmesi klinik yorumdan önce gelmeli
  assert.ok(
    functionSource.includes('Geçerlik bulguları (boş, L, F, K, F-K) klinik yorumdan ÖNCE ele alınsın'),
    'Geçerlik bulgularının klinik yorumdan önce gelmesi zorunlu olmalı',
  );

  // 4. 4 başlıklı yapı
  assert.ok(
    functionSource.includes('1) Geçerlik değerlendirmesi 2) Klinik profil özeti'),
    'Dört başlıklı klinik karar destek yapısı korunmalı',
  );
});

test('PHASE 11 · Edge Function kullanıcı istemi: AI hesaplama yapmaz (§39), doğrulanmış T skorları aktarılır', () => {
  const functionSourcePath = resolve(testDir, '../supabase/functions/ai-interpretation/index.ts');
  const functionSource = readFileSync(functionSourcePath, 'utf-8');

  // userPrompt işlevinde ham cevaplar değil, doğrulanmış T skorları ve düzeyleri iletilmeli
  assert.ok(functionSource.includes('scale.t.toFixed(1)'), 'Kullanıcı istemi T skorunu hazır aktarır');
  assert.ok(functionSource.includes('scale.level'), 'Kullanıcı istemi ölçek düzeyini hazır aktarır');
  assert.ok(functionSource.includes('summary.validity.status'), 'Kullanıcı istemi geçerlik durumunu hazır aktarır');
});
