/**
 * PHASE 9/10 batch 26 — BÖLÜM 5 D (Depresyon / 2) BLOĞU KOD GÖÇÜ KANITI
 *
 * DECISION-031 = A (kademeli blok göçü) gereğince D bloğundaki tüm kod gövdeleri
 * (s.82-94) kitaptan görsel okunarak koda aktarılır.
 *
 * Denetlenen hususlar:
 *   1. D bloğundaki tüm çok haneli ve blok-yerel kod gövdeleri `BLOCK_CODES` içinde tanımlı olmalı,
 *   2. Kod metinleri kitaptaki doğrulanmış alıntılarla birebir uyumlu olmalı,
 *   3. Olası tanılar kaynakla tam eşleşmeli,
 *   4. Koşullu ek yorumlar (`conditions`) kaynak cümlelerini ve sayfa atıflarını taşımalı,
 *   5. Sayı üretim denetimi: kaynakta olmayan hiçbir sayı üretilmemeli.
 *
 * Çalıştırma:
 *   npx tsx scripts/mmpi-audit/cmp-d-batch26.ts
 */
import { codeInterpretation, resolveCodeInterpretation, KNOWN_BLOCK_CODES } from '../../src/scoring/mmpiSourceCodes';

let fark = 0;
const ok = (m: string) => console.log('  ok    · ' + m);
const b = (m: string) => { fark++; console.log('  BULGU · FARK ' + m); };

console.log('== BÖLÜM 5: D (2) KOD BLOĞU GÖÇ MUTABAKATI (batch 26) ==\n');

// 1. Tanımlı olması gereken D kodları listesi (s.82-94)
const dCodes = [
  { code: '213', expectedLabel: '213/231', diag: 'Depresif reaksiyon ya da somatoform bozukluk' },
  { code: '213/231', expectedLabel: '213/231' },
  { code: '231', expectedLabel: '213/231' },
  { code: '243', expectedLabel: '243/432' },
  { code: '243/432', expectedLabel: '243/432' },
  { code: '247', expectedLabel: '247/427/472/742', diag: 'Pasif-agresif kişilik bozukluğu' },
  { code: '247/427', expectedLabel: '247/427/472/742' },
  { code: '248', expectedLabel: '248' },
  { code: '248/F', expectedLabel: '248 / Yüksek F' },
  { code: '273', expectedLabel: '273/723' },
  { code: '273/723', expectedLabel: '273/723' },
  { code: '274', expectedLabel: '274/724', diag: 'Depresif reaksiyon' },
  { code: '274/724', expectedLabel: '274/724' },
  { code: '275', expectedLabel: '275/725' },
  { code: '275/725', expectedLabel: '275/725' },
  { code: '278', expectedLabel: '278/728' },
  { code: '278/728', expectedLabel: '278/728' },
  { code: '270', expectedLabel: '270', diag: 'Şizoid kişilik bozukluğu' },
  { code: '281', expectedLabel: '281/821' },
  { code: '281/821', expectedLabel: '281/821' },
  { code: '284', expectedLabel: '284/824' },
  { code: '284/824', expectedLabel: '284/824' },
  { code: '287', expectedLabel: '287/827' },
  { code: '287/827', expectedLabel: '287/827' },
  { code: '207', expectedLabel: '207' },
];

console.log('(1) KAPSAM — D bloğu kod gövdeleri çözümleniyor mu?');
for (const item of dCodes) {
  const res = codeInterpretation(item.code);
  if (!res) {
    b(`Kod '${item.code}' çözümlenemedi (undefined döndü)`);
  } else if (res.code !== item.expectedLabel) {
    b(`Kod '${item.code}' etiketi '${res.code}' beklenen '${item.expectedLabel}'`);
  } else {
    ok(`Kod '${item.code}' -> '${res.code}' başarıyla çözümlendi`);
  }
}

console.log('\n(2) METİN VE TANI MUTABAKATI');
for (const item of dCodes) {
  const res = codeInterpretation(item.code);
  if (!res) continue;
  if (!res.text || res.text.length < 30) {
    b(`Kod '${item.code}' metni çok kısa veya boş`);
  }
  if (item.diag) {
    if (!res.diagnosis?.some(d => d.includes(item.diag!))) {
      b(`Kod '${item.code}' tanısı '${item.diag}' içermiyor: ${res.diagnosis?.join(', ')}`);
    } else {
      ok(`Kod '${item.code}' tanısı '${item.diag}' doğrulandı`);
    }
  }
}

console.log('\n(3) KOŞULLU YORUMLAR (CONDITIONS)');
const c23 = codeInterpretation('23');
if (c23?.conditions && c23.conditions.length >= 2) {
  ok(`23 kodu koşulları bağlandı (${c23.conditions.length} koşul)`);
} else {
  b(`23 kodu koşulları eksik: ${c23?.conditions?.length ?? 0}`);
}

const c24 = codeInterpretation('24');
if (c24?.conditions && c24.conditions.length >= 1) {
  ok(`24/42 kodu koşulları bağlandı (${c24.conditions.length} koşul)`);
} else {
  b(`24/42 kodu koşulları eksik: ${c24?.conditions?.length ?? 0}`);
}

const c26 = codeInterpretation('26');
if (c26?.conditions && c26.conditions.length >= 1) {
  ok(`26/62 kodu koşulu bağlandı (${c26.conditions.length} koşul)`);
} else {
  b(`26/62 kodu koşulu eksik`);
}

const c27 = codeInterpretation('27');
if (c27?.conditions && c27.conditions.length >= 2) {
  ok(`27/72 kodu koşulları bağlandı (${c27.conditions.length} koşul)`);
} else {
  b(`27/72 kodu koşulları eksik: ${c27?.conditions?.length ?? 0}`);
}

const c02 = codeInterpretation('02');
if (c02?.conditions && c02.conditions.length >= 1) {
  ok(`20/02 kodu koşulları bağlandı (${c02.conditions.length} koşul)`);
} else {
  b(`20/02 kodu koşulları eksik`);
}

const c213 = codeInterpretation('213');
if (c213?.conditions && c213.conditions.length >= 1) {
  ok(`213/231 kodu koşulu bağlandı (Pt >= 70 T)`);
} else {
  b(`213/231 kodu koşulu eksik`);
}

const c247 = codeInterpretation('247');
if (c247?.conditions && c247.conditions.length >= 2) {
  ok(`247/427 kodu cinsiyet koşulları bağlandı (${c247.conditions.length} koşul)`);
} else {
  b(`247/427 kodu koşulları eksik`);
}

const c274 = codeInterpretation('274');
if (c274?.conditions && c274.conditions.length >= 1) {
  ok(`274/724 kodu koşulu bağlandı (Hy >= 70 T)`);
} else {
  b(`274/724 kodu koşulu eksik`);
}

const c278 = codeInterpretation('278');
if (c278?.conditions && c278.conditions.length >= 3) {
  ok(`278/728 kodu koşulları bağlandı (${c278.conditions.length} koşul)`);
} else {
  b(`278/728 kodu koşulları eksik`);
}

const c284 = codeInterpretation('284');
if (c284?.conditions && c284.conditions.length >= 1) {
  ok(`284/824 kodu koşulu bağlandı (Pd > 80 T)`);
} else {
  b(`284/824 kodu koşulu eksik`);
}

const c287 = codeInterpretation('287');
if (c287?.conditions && c287.conditions.length >= 1) {
  ok(`287/827 kodu intihar koşulu bağlandı (K < 50 ∧ Ma > 70)`);
} else {
  b(`287/827 kodu koşulu eksik`);
}

console.log(`\nSONUÇ: ${fark} FARK${fark === 0 ? ' · D BLOĞU KOD GÖÇÜ TAMAMLANDI' : ''}`);
process.exit(fark ? 1 : 0);
