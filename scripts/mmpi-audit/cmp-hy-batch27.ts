/**
 * scripts/mmpi-audit/cmp-hy-batch27.ts
 *
 * MMPI Bölüm 5 Hy (3) bloğu (kitap s.95-103) kod göçü mutabakat scripti (batch 27).
 * DECISION-031 Plan A doğrultusunda Hy bloğuna ait kod gövdelerini ve koşulları denetler.
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

console.log('== BÖLÜM 5: Hy (3) KOD BLOĞU GÖÇ MUTABAKATI (batch 27) ==\n');

// 1. Kapsam Denetimi
console.log('(1) KAPSAM — Hy bloğu kod gövdeleri çözümleniyor mu?');
const codesToTest: Array<{ query: string; expectedCode: string }> = [
  { query: 'Yüksek 3 / Yüksek K', expectedCode: 'Yüksek 3 / Yüksek K' },
  { query: 'Hy:3_highK', expectedCode: 'Yüksek 3 / Yüksek K' },
  { query: 'Hy:32', expectedCode: '32' },
  { query: '321', expectedCode: '321' },
  { query: 'Yüksek 3 / Düşük 4', expectedCode: 'Yüksek 3 / Düşük 4' },
  { query: 'Hy:34_low4', expectedCode: 'Yüksek 3 / Düşük 4' },
  { query: '345', expectedCode: '345/435/534' },
  { query: '346', expectedCode: '346/436' },
  { query: '34', expectedCode: '34/43' },
  { query: '35', expectedCode: '35/53' },
  { query: '36', expectedCode: '36/63' },
  { query: '37', expectedCode: '37/73' },
  { query: '38', expectedCode: '38/83' },
  { query: '39', expectedCode: '39/93' },
  { query: '03', expectedCode: '30/03' },
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
const e34 = resolveCodeInterpretation('34');
if (e34?.diagnosis?.includes('Pasif-agresif kişilik bozukluğu, agresif tip')) {
  ok("Kod '34' tanısı 'Pasif-agresif kişilik bozukluğu, agresif tip' doğrulandı");
} else {
  fail("Kod '34' tanısı", 'tanı eksik veya uyuşmuyor');
}

const e38 = resolveCodeInterpretation('38');
if (e38?.diagnosis?.includes('Şizofreni') && e38?.diagnosis?.includes('Bazı durumlarda histerik nevroz')) {
  ok("Kod '38' tanıları 'Şizofreni' ve 'Bazı durumlarda histerik nevroz' doğrulandı");
} else {
  fail("Kod '38' tanıları", 'tanılar eksik');
}

const e32 = resolveCodeInterpretation('Hy:32');
if (e32?.text.includes('23 kod tiplerinin aksine')) {
  ok("Hy:32 gövdesi s.96 kaynağıyla uyumlu ('23 kod tiplerinin aksine')");
} else {
  fail('Hy:32 gövdesi', 's.96 kaynak metnini taşımıyor');
}

const e321 = resolveCodeInterpretation('321');
if (e321?.text.includes('32 kodlu bireylerin özelliklerine ek olarak')) {
  ok("321 gövdesi s.97 kaynağıyla uyumlu ('32 kodlu bireylerin özelliklerine ek olarak')");
} else {
  fail('321 gövdesi', 's.97 kaynak metnini taşımıyor');
}

// 3. Koşullu Yorumlar (Conditions)
console.log('\n(3) KOŞULLU YORUMLAR (CONDITIONS)');
// Hy:3_highK
const e3highK = resolveCodeInterpretation('Hy:3_highK');
if (e3highK?.conditions && e3highK.conditions.length >= 1) {
  ok('Hy:3_highK koşulu bağlandı (Hy/K yüksek, F/Sc düşük)');
} else {
  fail('Hy:3_highK koşulu', 'koşul bulunamadı');
}

// Hy:32 koşulları
if (e32?.conditions && e32.conditions.length >= 4) {
  ok(`Hy:32 koşulları bağlandı (${e32.conditions.length} koşul)`);
} else {
  fail('Hy:32 koşulları', `beklenen >= 4 koşul, bulunan: ${e32?.conditions?.length ?? 0}`);
}

// 34/43 koşulları
if (e34?.conditions && e34.conditions.length >= 4) {
  ok(`34/43 koşulları bağlandı (${e34.conditions.length} koşul)`);
} else {
  fail('34/43 koşulları', `beklenen >= 4 koşul, bulunan: ${e34?.conditions?.length ?? 0}`);
}

// 345/435/534 koşulu
const e345 = resolveCodeInterpretation('345');
if (e345?.conditions && e345.conditions.length >= 1) {
  ok('345/435/534 koşulu bağlandı (Hy > Pd ∧ K > 50)');
} else {
  fail('345 koşulu', 'koşul bulunamadı');
}

// 346/436 koşulu
const e346 = resolveCodeInterpretation('346');
if (e346?.conditions && e346.conditions.length >= 1) {
  ok('346/436 koşulu bağlandı (Pa ile Hy 5 T farkı)');
} else {
  fail('346 koşulu', 'koşul bulunamadı');
}

// 35/53 koşulu
const e35 = resolveCodeInterpretation('35');
if (e35?.conditions && e35.conditions.length >= 1) {
  ok('35/53 koşulu bağlandı (üçüncü Pd veya Pa)');
} else {
  fail('35 koşulu', 'koşul bulunamadı');
}

// 36/63 koşulları
const e36 = resolveCodeInterpretation('36');
if (e36?.conditions && e36.conditions.length >= 3) {
  ok(`36/63 koşulları bağlandı (${e36.conditions.length} koşul)`);
} else {
  fail('36 koşulları', `beklenen >= 3 koşul, bulunan: ${e36?.conditions?.length ?? 0}`);
}

// 37/73 koşulu
const e37 = resolveCodeInterpretation('37');
if (e37?.conditions && e37.conditions.length >= 1) {
  ok('37/73 koşulu bağlandı (üçüncü Hs/D/Pd)');
} else {
  fail('37 koşulu', 'koşul bulunamadı');
}

// 39/93 koşulları
const e39 = resolveCodeInterpretation('39');
if (e39?.conditions && e39.conditions.length >= 2) {
  ok(`39/93 koşulları bağlandı (${e39.conditions.length} koşul)`);
} else {
  fail('39 koşulları', `beklenen >= 2 koşul, bulunan: ${e39?.conditions?.length ?? 0}`);
}

// 30/03 koşulu
const e03 = resolveCodeInterpretation('03');
if (e03?.conditions && e03.conditions.length >= 1) {
  ok('30/03 koşulu bağlandı (üçüncü Hs veya D)');
} else {
  fail('03 koşulu', 'koşul bulunamadı');
}

console.log(`\nSONUÇ: ${diffCount} FARK · ${diffCount === 0 ? 'Hy BLOĞU KOD GÖÇÜ TAMAMLANDI' : 'FARKLAR BULUNDU'}`);
process.exit(diffCount === 0 ? 0 : 1);
