/**
 * scripts/mmpi-audit/cmp-pd-batch28.ts
 *
 * MMPI Bölüm 5 Pd (4) bloğu (kitap s.107-121) kod göçü mutabakat scripti (batch 28).
 * DECISION-031 Plan A doğrultusunda Pd bloğuna ait kod gövdelerini ve koşulları denetler.
 */
import {
  codeInterpretation,
  resolveCodeInterpretation,
  activeCodeConditions,
  CodeScaleKey,
} from '../../src/scoring/mmpiSourceCodes';

let diffCount = 0;

function ok(label: string, detail?: string) {
  console.log(`  ok    · ${label}${detail ? ` (${detail})` : ''}`);
}

function fail(label: string, reason: string) {
  diffCount++;
  console.error(`  FAIL  · ${label}: ${reason}`);
}

const mockCtx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey, gender?: 'Erkek' | 'Kadın') => ({
  t: (id: CodeScaleKey) => over[id],
  third,
  gender,
});

console.log('== BÖLÜM 5: Pd (4) KOD BLOĞU GÖÇ MUTABAKATI (batch 28) ==\n');

// 1. Kapsam Denetimi
console.log('(1) KAPSAM — Pd bloğu kod gövdeleri çözümleniyor mu?');
const codesToTest: Array<{ query: string; expectedCode: string }> = [
  { query: 'Yüksek 4 / Düşük 5', expectedCode: 'Yüksek 4 / Düşük 5' },
  { query: 'Pd:4_low5', expectedCode: 'Yüksek 4 / Düşük 5' },
  { query: '456', expectedCode: '456' },
  { query: '462', expectedCode: '462/642' },
  { query: '642', expectedCode: '462/642' },
  { query: '463', expectedCode: '463/643' },
  { query: '643', expectedCode: '463/643' },
  { query: '468', expectedCode: '468/648' },
  { query: '648', expectedCode: '468/648' },
  { query: '469', expectedCode: '469' },
  { query: '48 / Yüksek F', expectedCode: '48/84 (Yüksek F / Düşük 2)' },
  { query: '482', expectedCode: '482/842/824' },
  { query: '842', expectedCode: '482/842/824' },
  { query: '824', expectedCode: '482/842/824' },
  { query: '489', expectedCode: '489/849' },
  { query: '849', expectedCode: '489/849' },
  { query: '493', expectedCode: '493/943' },
  { query: '943', expectedCode: '493/943' },
  { query: '495', expectedCode: '495/945' },
  { query: '945', expectedCode: '495/945' },
  { query: '496', expectedCode: '496/946' },
  { query: '946', expectedCode: '496/946' },
  { query: '498', expectedCode: '498/948' },
  { query: '948', expectedCode: '498/948' },
  { query: '45', expectedCode: '45/54' },
  { query: '46', expectedCode: '46/64' },
  { query: '47', expectedCode: '47/74' },
  { query: '48', expectedCode: '48/84' },
  { query: '49', expectedCode: '49/94' },
  { query: '04', expectedCode: '40/04' },
];

for (const { query, expectedCode } of codesToTest) {
  const entry = resolveCodeInterpretation(query);
  if (!entry) {
    fail(`Kod '${query}'`, 'çözümlenemedi (undefined)');
  } else if (entry.code !== expectedCode) {
    fail(`Kod '${query}'`, `beklenen '${expectedCode}', alınan '${entry.code}'`);
  } else {
    ok(`Kod '${query}' -> '${entry.code}' başarıyla çözümlendi`);
  }
}

// 2. Metin ve Tanı Mutabakatı
console.log('\n(2) METİN VE TANI MUTABAKATI');
const e45 = resolveCodeInterpretation('45');
if (e45?.diagnosis?.some(d => d.includes('Pasif') && d.includes('pasif tip'))) {
  ok("Kod '45' tanısı 'Pasif-agresif kişilik bozukluğu, pasif tip' doğrulandı");
} else {
  fail("Kod '45' tanısı", 'tanı eksik');
}

const e46 = resolveCodeInterpretation('46');
if (e46?.diagnosis?.includes('Pasif-agresif kişilik bozukluğu')) {
  ok("Kod '46' tanısı 'Pasif-agresif kişilik bozukluğu' doğrulandı");
} else {
  fail("Kod '46' tanısı", 'tanı eksik');
}

const e48 = resolveCodeInterpretation('48');
if (e48?.diagnosis?.includes('Psikiyatrik yatan hasta ise şizofreni (Paranoid tip)')) {
  ok("Kod '48' tanısı 'Psikiyatrik yatan hasta ise şizofreni (Paranoid tip)' doğrulandı");
} else {
  fail("Kod '48' tanısı", 'tanı eksik');
}

const e49 = resolveCodeInterpretation('49');
if (e49?.diagnosis?.includes('Antisosyal kişilikle birlikte bazı tip karakter bozuklukları')) {
  ok("Kod '49' tanısı 'Antisosyal kişilikle birlikte bazı tip karakter bozuklukları' doğrulandı");
} else {
  fail("Kod '49' tanısı", 'tanı eksik');
}

const e48F = resolveCodeInterpretation('48 / Yüksek F');
if (e48F?.diagnosis?.includes('Sosyopat kişilik')) {
  ok("Kod '48 / Yüksek F' tanısı 'Sosyopat kişilik' doğrulandı");
} else {
  fail("Kod '48 / Yüksek F' tanısı", 'tanı eksik');
}

// 3. Koşullu Yorumlar (Conditions)
console.log('\n(3) KOŞULLU YORUMLAR (CONDITIONS)');
const e4low5 = resolveCodeInterpretation('Pd:4_low5');
if (e4low5?.conditions && e4low5.conditions.length >= 4) {
  ok(`Yüksek 4 / Düşük 5 koşulları bağlandı (${e4low5.conditions.length} koşul)`);
} else {
  fail('Yüksek 4 / Düşük 5 koşulları', `beklenen >= 4 koşul, bulunan: ${e4low5?.conditions?.length ?? 0}`);
}

if (e45?.conditions && e45.conditions.length >= 3) {
  ok(`45/54 koşulları bağlandı (${e45.conditions.length} koşul)`);
} else {
  fail('45/54 koşulları', `beklenen >= 3 koşul, bulunan: ${e45?.conditions?.length ?? 0}`);
}

if (e46?.conditions && e46.conditions.length >= 3) {
  ok(`46/64 koşulları bağlandı (${e46.conditions.length} koşul)`);
} else {
  fail('46/64 koşulları', `beklenen >= 3 koşul, bulunan: ${e46?.conditions?.length ?? 0}`);
}

const e468 = resolveCodeInterpretation('468');
if (e468?.conditions && e468.conditions.length >= 2) {
  ok(`468/648 koşulları bağlandı (${e468.conditions.length} koşul)`);
} else {
  fail('468/648 koşulları', `beklenen >= 2 koşul, bulunan: ${e468?.conditions?.length ?? 0}`);
}

const e469 = resolveCodeInterpretation('469');
if (e469?.conditions && e469.conditions.length >= 1) {
  ok('469 koşulu bağlandı (Ma >= 70 T öfke patlaması)');
} else {
  fail('469 koşulu', 'koşul bulunamadı');
}

const e482 = resolveCodeInterpretation('482');
if (e482?.text.includes('İntihar girişimi göreceli olarak fazladır')) {
  ok('482/842/824 intihar riski uyarısı doğrulandı');
} else {
  fail('482 intihar uyarısı', 'metin eksik');
}

const e489 = resolveCodeInterpretation('489');
if (e489?.conditions && e489.conditions.length >= 1) {
  ok('489/849 koşulu bağlandı (Ma yüksek şiddet riski)');
} else {
  fail('489 koşulu', 'koşul bulunamadı');
}

const e493 = resolveCodeInterpretation('493');
if (e493?.conditions && e493.conditions.length >= 1) {
  ok('493/943 koşulu bağlandı (Hy ile Pd 5 T farkı)');
} else {
  fail('493 koşulu', 'koşul bulunamadı');
}

const e495 = resolveCodeInterpretation('495');
if (e495?.conditions && e495.conditions.length >= 1) {
  ok('495/945 koşulu bağlandı (Pt >= 70 T)');
} else {
  fail('495 koşulu', 'koşul bulunamadı');
}

const e496 = resolveCodeInterpretation('496');
if (e496?.conditions && e496.conditions.length >= 2) {
  ok(`496/946 koşulları bağlandı (${e496.conditions.length} koşul)`);
} else {
  fail('496 koşulları', `beklenen >= 2 koşul, bulunan: ${e496?.conditions?.length ?? 0}`);
}

console.log(`\nSONUÇ: ${diffCount} FARK · ${diffCount === 0 ? 'Pd BLOĞU KOD GÖÇÜ TAMAMLANDI' : 'FARKLAR BULUNDU'}`);
process.exit(diffCount === 0 ? 0 : 1);
