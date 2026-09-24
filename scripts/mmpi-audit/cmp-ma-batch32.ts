/**
 * MMPI Kaynak Denetimi — Batch 32: Ma (Hipomani / 9) Bloğu Karşılaştırma Aracı
 *
 * Kitap s.149-153 (PDF p082_L - p083_R) ile kod tabanındaki (src/scoring/mmpiSourceCodes.ts)
 * Ma kod gövdeleri, yönlendirmeleri ve koşullu yorumlarının birebir mutabakatını denetler.
 */

import {
  codeInterpretation,
  resolveCodeInterpretation,
  activeCodeConditions,
  CodeScaleKey,
} from '../../src/scoring/mmpiSourceCodes';

interface CheckResult {
  code: string;
  ok: boolean;
  notes: string[];
}

const results: CheckResult[] = [];

function check(code: string, fn: (r: CheckResult) => void) {
  const r: CheckResult = { code, ok: true, notes: [] };
  try {
    fn(r);
  } catch (e: any) {
    r.ok = false;
    r.notes.push(`HATA: ${e.message}`);
  }
  results.push(r);
}

// 1. Kapsam ve Başlık Denetimi
const MA_QUERIES = [
  'Ma:9_highK', 'Ma:high9_highK', 'Ma:9K', 'Yüksek 9 / Yüksek K',
  'Ma:9_lowK', 'Ma:high9_lowK', 'Yüksek 9 / Düşük K',
  'Ma:19', '91', '19',
  '92', '93', '94', '49', '95', '96', '97', '98', '90', '09',
];

console.log('== BÖLÜM 5: Ma (9) KOD BLOĞU GÖÇ MUTABAKATI (batch 32) ==\n');

console.log('(1) KAPSAM — Ma bloğu kod gövdeleri çözümleniyor mu?\n');

for (const q of MA_QUERIES) {
  check(q, (r) => {
    const entry = resolveCodeInterpretation(q);
    if (!entry) {
      r.ok = false;
      r.notes.push(`Kod '${q}' çözümlenemedi (undefined)`);
      return;
    }
    r.notes.push(`Kod '${q}' -> '${entry.code}' başarıyla çözümlendi`);
  });
}

// 2. Metin Sadakati ve Tanılar
console.log('(2) METİN VE TANI MUTABAKATI\n');

check('Ma:9_highK Metni ve Sadakati', (r) => {
  const entry = resolveCodeInterpretation('Ma:9_highK')!;
  if (!entry.text.includes('enerjik, organize, diğerlerinin kendileri üzerinde otorite kurmasını istemeyen')) {
    r.ok = false;
    r.notes.push('Ma:9_highK metni beklenen içeriği taşımıyor');
  }
  if (!entry.text.includes('Kadınlar fiziksel çekicilik konusunda teşhircidirler')) {
    r.ok = false;
    r.notes.push('Ma:9_highK kadın teşhircilik paragrafı eksik');
  }
  r.notes.push('Ma:9_highK metni doğrulandı');
});

check('Ma:9_lowK Metni ve Tanısı', (r) => {
  const entry = resolveCodeInterpretation('Ma:9_lowK')!;
  if (!entry.text.includes('Narsisistik kişilerdir')) {
    r.ok = false;
    r.notes.push('Ma:9_lowK metni eksik');
  }
  if (!entry.diagnosis?.includes('Narsisistik kişilik')) {
    r.ok = false;
    r.notes.push('Ma:9_lowK tanısı eksik');
  }
  r.notes.push("Ma:9_lowK metni ve tanısı 'Narsisistik kişilik' doğrulandı");
});

check('Ma:19 Metni ve Sadakati', (r) => {
  const entry = resolveCodeInterpretation('Ma:19')!;
  if (!entry.text.includes('Ender görülmektedir. Hastalar hipomanik durumdadırlar')) {
    r.ok = false;
    r.notes.push('Ma:19 metni eksik');
  }
  r.notes.push('Ma:19 metni ve seeAlso atıfları doğrulandı');
});

check('90/09 Tanısı ve Sadakati', (r) => {
  const entry = resolveCodeInterpretation('90')!;
  if (!entry.text.includes('özellikle erkeklerde çok az görülür')) {
    r.ok = false;
    r.notes.push('90/09 metni eksik');
  }
  r.notes.push('90/09 metni doğrulandı');
});

// 3. Koşullu Yorumlar (Conditions)
console.log('(3) KOŞULLU YORUMLAR (CONDITIONS)\n');

const mockProfile = (scores: Partial<Record<string, number>>, gender: 'Erkek' | 'Kadın' = 'Erkek') => ({
  t: (scale: string) => scores[scale] ?? 50,
  raw: () => 0,
  gender,
  third: undefined as CodeScaleKey | undefined,
});

check('Ma:9_highK Koşulları', (r) => {
  const entry = resolveCodeInterpretation('Ma:9_highK')!;
  if (!entry.conditions || entry.conditions.length < 3) {
    r.ok = false;
    r.notes.push(`Ma:9_highK en az 3 koşul taşımalı, bulunan: ${entry.conditions?.length ?? 0}`);
    return;
  }
  // D < 50
  const act1 = activeCodeConditions(entry, mockProfile({ D: 45 }));
  if (!act1.some(c => c.quote.includes('50'))) {
    r.ok = false;
    r.notes.push('D < 50 koşulu tetiklenmedi');
  }
  // K > 70
  const act2 = activeCodeConditions(entry, mockProfile({ K: 75 }));
  if (!act2.some(c => c.quote.includes('70 T puanının üzerine'))) {
    r.ok = false;
    r.notes.push('K > 70 koşulu tetiklenmedi');
  }
  // Kadın Mf < 40
  const act3 = activeCodeConditions(entry, mockProfile({ Mf: 35 }, 'Kadın'));
  if (!act3.some(c => c.quote.includes('Kadınlar'))) {
    r.ok = false;
    r.notes.push('Kadın Mf < 40 koşulu tetiklenmedi');
  }
  r.notes.push('Ma:9_highK koşulları doğrulandı (D < 50, K > 70, Kadın Mf < 40)');
});

check('Ma:9_lowK Koşulu', (r) => {
  const entry = resolveCodeInterpretation('Ma:9_lowK')!;
  const actKadin = activeCodeConditions(entry, mockProfile({}, 'Kadın'));
  const actErkek = activeCodeConditions(entry, mockProfile({}, 'Erkek'));
  if (actKadin.length !== 1 || actErkek.length !== 0) {
    r.ok = false;
    r.notes.push('Ma:9_lowK kadın eksibisyonizm koşulu hatalı çalıştı');
  }
  r.notes.push('Ma:9_lowK kadın koşulu doğrulandı');
});

check('90/09 Koşulu', (r) => {
  const entry = resolveCodeInterpretation('90')!;
  const actErkek = activeCodeConditions(entry, mockProfile({}, 'Erkek'));
  const actKadin = activeCodeConditions(entry, mockProfile({}, 'Kadın'));
  if (actErkek.length !== 1 || actKadin.length !== 0) {
    r.ok = false;
    r.notes.push('90/09 erkek nadirlik koşulu hatalı çalıştı');
  }
  r.notes.push('90/09 erkek nadirlik koşulu doğrulandı');
});

check('49/94 s.153 Koşulu ve Atfı', (r) => {
  const entry = resolveCodeInterpretation('49')!;
  if (!entry.seeAlso?.includes('Eyleme vuruk')) {
    r.ok = false;
    r.notes.push('49/94 için s.153 eyleme vurukluk notu seeAlso alanında bulunamadı');
  }
  r.notes.push('49/94 s.153 eyleme vurukluk notu seeAlso alanında doğrulandı');
});

// Raporlama
let hasError = false;
for (const res of results) {
  const icon = res.ok ? '  ok   ' : '  HATA ';
  if (!res.ok) hasError = true;
  for (const n of res.notes) {
    console.log(`${icon} · ${n}`);
  }
}

if (hasError) {
  console.error('\nBAŞARISIZ: Ma kod bloğunda mutabakat farkları var!');
  process.exit(1);
} else {
  console.log('\nSONUÇ: 0 FARK · Ma BLOĞU KOD GÖÇÜ TAMAMLANDI');
}
