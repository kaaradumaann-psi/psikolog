import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ITEM_COUNT,
  MMPI_AGE_MIN,
  RAW_SCORE_MAX,
  assessDuration,
  buildCaseMeta,
  buildQuickPayload,
  buildRawPayload,
  countAnswers,
  isValidRecordPayload,
  isValidQuickEntryPayload,
  isValidRawScoresPayload,
  emptyAnswers,
  emptyClientIntake,
  emptyRawScores,
  mapQuickKey,
  parseDurationMinutes,
  parseRawScore,
  parseRecordPayload,
  rawScoresComplete,
  recordInputFromIntake,
  validateIntake,
} from '../src/workspace/caseTypes';

test('quick keys map 1/2/0 without inventing other answers', () => {
  assert.equal(mapQuickKey('1'), 'D');
  assert.equal(mapQuickKey('2'), 'Y');
  assert.equal(mapQuickKey('0'), null);
  assert.equal(mapQuickKey('3'), 'ignore');
  assert.equal(mapQuickKey('d'), 'ignore');
});

test('answer map starts unentered, not blank, and counts 566 slots', () => {
  const answers = emptyAnswers();
  assert.equal(answers.length, ITEM_COUNT);
  assert.equal(ITEM_COUNT, 566);
  assert.equal(countAnswers(answers).pending, 566);
  assert.equal(countAnswers(answers).entered, 0);
  answers[0] = null;
  answers[1] = 'D';
  answers[2] = 'Y';
  const counts = countAnswers(answers);
  assert.equal(counts.blank, 1);
  assert.equal(counts.correct, 1);
  assert.equal(counts.wrong, 1);
  assert.equal(counts.entered, 3);
});

test('raw score maxima match the requested validity and clinical caps', () => {
  assert.equal(RAW_SCORE_MAX.L, 15);
  assert.equal(RAW_SCORE_MAX.F, 64);
  assert.equal(RAW_SCORE_MAX.K, 30);
  assert.equal(RAW_SCORE_MAX.Hs, 33);
  assert.equal(RAW_SCORE_MAX.D, 60);
  assert.equal(RAW_SCORE_MAX.Hy, 60);
  assert.equal(RAW_SCORE_MAX.Pd, 50);
  assert.equal(RAW_SCORE_MAX.Mf, 60);
  assert.equal(RAW_SCORE_MAX.Pa, 40);
  assert.equal(RAW_SCORE_MAX.Pt, 48);
  assert.equal(RAW_SCORE_MAX.Sc, 78);
  assert.equal(RAW_SCORE_MAX.Ma, 46);
  assert.equal(RAW_SCORE_MAX.Si, 70);
  assert.equal(parseRawScore('16', 15), null);
  assert.equal(parseRawScore('15', 15), 15);
  assert.equal(rawScoresComplete(emptyRawScores()), false);
});

test('intake requires gender, age and test date; optional fields stay empty strings', () => {
  const client = emptyClientIntake();
  assert.equal(client.gender, '');
  client.firstName = 'Ayşe';
  client.lastName = 'Yılmaz';
  client.gender = 'Kadın';
  client.age = 28;
  client.testDate = '2026-09-17';
  assert.equal(validateIntake(client), null);
  const input = recordInputFromIntake(client);
  assert.equal(input.client.occupation, '');
  assert.equal(input.client.education, '');
  assert.equal(input.client.requestedBy, '');
  assert.equal(input.client.gender, 'Kadın');
  assert.equal(input.client.applicationDate, '2026-09-17');
  client.age = 0;
  assert.match(validateIntake(client) ?? '', new RegExp(`${MMPI_AGE_MIN} yaş ve üzerine uygulanır`));
});

test('intake enforces the Turkish MMPI application conditions (age 16+, at least middle school)', () => {
  const client = emptyClientIntake();
  client.firstName = 'Deniz';
  client.lastName = 'Kaya';
  client.gender = 'Kadın';
  client.testDate = '2026-09-17';

  // 13 yaş: Türkiye normlarında 16 yaş altı sonuçlar geçerli kabul edilmez → reddedilir.
  client.age = 13;
  assert.match(validateIntake(client) ?? '', /16 yaş ve üzerine uygulanır/);

  // Alt sınır kabul edilir; yaşın üst sınırı norm koşulu olarak kısıtlanmaz.
  client.age = 16;
  assert.equal(validateIntake(client), null);
  client.age = 71;
  assert.equal(validateIntake(client), null);

  // Girdi sağlamlığı: aşırı değer doğrulanamaz.
  client.age = 121;
  assert.match(validateIntake(client) ?? '', /doğrulanamadı/);

  // İlkokul düzeyi kabul edilmez; en az ortaokul gerekir.
  client.age = 28;
  client.education = 'İlkokul';
  assert.match(validateIntake(client) ?? '', /ortaokul/i);
  client.education = 'Ortaokul';
  assert.equal(validateIntake(client), null);
  client.education = 'Lisansüstü';
  assert.equal(validateIntake(client), null);
});

test('intake rejects calendar rollover dates and future dates', () => {
  const client = emptyClientIntake();
  client.firstName = 'Deniz';
  client.lastName = 'Kaya';
  client.gender = 'Kadın';
  client.age = 28;
  client.testDate = '2026-02-30';
  assert.match(validateIntake(client) ?? '', /tarihi geçersiz/i);
  client.testDate = '2099-01-01';
  assert.match(validateIntake(client) ?? '', /ileri olamaz/i);
});

test('persisted payload guards reject malformed quick/raw data', () => {
  const client = emptyClientIntake();
  client.firstName = 'Ayşe';
  client.lastName = 'Yılmaz';
  client.gender = 'Kadın';
  client.age = 28;
  client.testDate = '2026-09-17';
  const meta = buildCaseMeta('quick', client);
  const answers = emptyAnswers();
  answers.fill('D');
  const quick = buildQuickPayload(answers);
  assert.equal(isValidQuickEntryPayload(quick), true);
  assert.equal(isValidQuickEntryPayload({ ...quick, answers: [...quick.answers.slice(0, -1), 'maybe'] }), false);
  assert.equal(isValidRecordPayload([meta, quick]), true);
  assert.equal(isValidRecordPayload([meta, { ...quick, answers: quick.answers.slice(0, -1) }]), false);

  const scores = emptyRawScores();
  for (const key of Object.keys(scores) as Array<keyof typeof scores>) scores[key] = 1;
  const raw = buildRawPayload(scores);
  assert.equal(isValidRawScoresPayload(raw), true);
  assert.equal(isValidRecordPayload([buildCaseMeta('raw', client), raw]), true);
  assert.equal(isValidRecordPayload([buildCaseMeta('raw', client), { ...raw, scales: { ...raw.scales, F: 999 } }]), false);

  const conflicting = parseRecordPayload([meta, quick, raw]);
  assert.equal(conflicting.method, 'quick');
  assert.equal(conflicting.quickAnswers, undefined);
  assert.equal(conflicting.rawScales, undefined);
  assert.equal(isValidRecordPayload([meta, quick, raw]), false);
});

test('duration is parsed as minutes and judged against the Turkish sample (60–120 dk)', () => {
  assert.equal(parseDurationMinutes('75'), 75);
  assert.equal(parseDurationMinutes('90 dk'), 90);
  assert.equal(parseDurationMinutes('60 dakika'), 60);
  assert.equal(parseDurationMinutes(''), null);
  assert.equal(parseDurationMinutes('abc'), null);
  assert.equal(parseDurationMinutes('0'), null);
  assert.equal(parseDurationMinutes('999'), null);

  assert.equal(assessDuration('').level, 'empty');
  assert.equal(assessDuration('abc').level, 'invalid');

  // 566 madde 20 dakikada cevaplanamaz.
  const veryShort = assessDuration('20');
  assert.equal(veryShort.level, 'very-short');
  assert.match(veryShort.message, /çok kısa/);

  const short = assessDuration('50');
  assert.equal(short.level, 'short');
  assert.match(short.message, /60–120/);

  assert.equal(assessDuration('60').level, 'ok');
  assert.equal(assessDuration('90 dk').level, 'ok');
  assert.equal(assessDuration('120').level, 'ok');

  const long = assessDuration('240');
  assert.equal(long.level, 'long');
  assert.match(long.message, /üzerinde/);
});

test('saved payload round-trips client fields, quick answers and raw scores', () => {
  const client = emptyClientIntake();
  client.firstName = 'Ayşe';
  client.lastName = 'Yılmaz';
  client.gender = 'Erkek';
  client.age = 41;
  client.testDate = '2026-09-17';
  client.testDuration = '90 dk';
  client.occupation = 'Öğretmen';
  client.followUp = 'Ayaktan';
  client.education = 'Lisans';
  client.maritalStatus = 'Evli';
  client.applicationReason = 'Değerlendirme';
  client.clinicalContext = 'Kısa öykü';

  const answers = emptyAnswers();
  answers.fill('D');
  const scores = emptyRawScores();
  for (const key of Object.keys(scores) as Array<keyof typeof scores>) scores[key] = 1;

  const meta = buildCaseMeta('quick', client);
  // Veri bütünlüğü: kayıt meta'sı motor sürümünü ve norm etiketini taşır.
  assert.equal(typeof meta.scoringVersion, 'string');
  assert.ok(meta.scoringVersion!.length > 0);
  assert.equal(typeof meta.normSource, 'string');
  const quick = buildQuickPayload(answers);
  const parsedQuick = parseRecordPayload([meta, quick]);
  assert.equal(parsedQuick.method, 'quick');
  assert.equal(parsedQuick.client?.firstName, 'Ayşe');
  assert.equal(parsedQuick.scoringVersion, meta.scoringVersion);
  // Eski kayıt (scoringVersion alanı yok) kırılmadan okunur.
  const legacyMeta = { ...meta } as Record<string, unknown>;
  delete legacyMeta.scoringVersion;
  delete legacyMeta.normSource;
  const parsedLegacy = parseRecordPayload([legacyMeta, quick]);
  assert.equal(parsedLegacy.scoringVersion, undefined);
  assert.equal(parsedLegacy.method, 'quick');
  assert.equal(parsedQuick.followUp, 'Ayaktan');
  assert.equal(parsedQuick.maritalStatus, 'Evli');
  assert.equal(parsedQuick.testDuration, '90 dk');
  assert.equal(parsedQuick.applicationReason, 'Değerlendirme');
  assert.equal(parsedQuick.clinicalContext, 'Kısa öykü');
  assert.equal(parsedQuick.quickAnswers?.length, ITEM_COUNT);
  assert.equal(parsedQuick.quickAnswers?.[0], 'D');

  const rawMeta = buildCaseMeta('raw', client);
  const raw = buildRawPayload(scores);
  const parsedRaw = parseRecordPayload([rawMeta, raw]);
  assert.equal(parsedRaw.method, 'raw');
  assert.equal(parsedRaw.rawScales?.Hs, 1);
  assert.equal(parsedRaw.omrPages.length, 0);

  const legacy = parseRecordPayload([
    { kind: 'client-context', followUp: 'Yatış', maritalStatus: 'Bekar', testDuration: '60', applicationReason: 'x', clinicalContext: 'y' },
    { kind: 'entry-method', method: 'omr' },
    { pageNumber: 1, items: [] },
  ]);
  assert.equal(legacy.method, 'omr');
  assert.equal(legacy.followUp, 'Yatış');
  assert.equal(legacy.omrPages.length, 1);
});
