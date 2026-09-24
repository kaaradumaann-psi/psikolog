/**
 * MMPI Kaynak Denetimi — Batch 30: Pt (Psikasteni / 7) Bloğu Karşılaştırma Aracı
 *
 * Kitap s.137-142 (PDF p076_R - p079_L) ile kod tabanındaki (src/scoring/mmpiSourceCodes.ts)
 * Pt kod gövdeleri, yönlendirmeleri ve koşullu yorumlarının birebir mutabakatını denetler.
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
const PT_QUERIES = [
  'Pt:74', 'Pt:47', '74/47',
  'Pt:76', 'Pt:67', '76/67',
  '782', 'Pt:782',
  '872', 'Pt:872', 'Sc:872',
  '784', '874', 'Pt:784', 'Pt:874', 'Sc:874', 'Sc:784', 'Pd:784',
  '789', 'Pt:789', 'Sc:789', 'Ma:789',
  '794', 'Pt:794', 'Ma:974', 'Pd:794',
  '78', '87', '79', '97', '70', '07',
  '71', '72', '73', '75',
];

console.log('== BÖLÜM 5: Pt (7) KOD BLOĞU GÖÇ MUTABAKATI (batch 30) ==\n');

console.log('(1) KAPSAM — Pt bloğu kod gövdeleri çözümleniyor mu?');
for (const q of PT_QUERIES) {
  check(q, (r) => {
    const entry = resolveCodeInterpretation(q);
    if (!entry) {
      r.ok = false;
      r.notes.push(`Kod '${q}' çözümlenemedi (undefined)`);
    } else {
      r.notes.push(`Kod '${q}' -> '${entry.code}' başarıyla çözümlendi`);
    }
  });
}

// 2. Metin ve Tanı Mutabakatı
console.log('\n(2) METİN VE TANI MUTABAKATI');
check('Pt:74 Tanı (s.140)', (r) => {
  const e = resolveCodeInterpretation('Pt:74');
  if (!e?.diagnosis?.some(d => d.includes('Pasif-agresif kişilik bozukluğu'))) {
    r.ok = false;
    r.notes.push('Pt:74 pasif-agresif kişilik bozukluğu tanısı eksik veya uyuşmuyor');
  } else {
    r.notes.push("Pt:74 tanısı 'Pasif-agresif kişilik bozukluğu' doğrulandı");
  }
});

check('782 Tanı (s.141)', (r) => {
  const e = resolveCodeInterpretation('782');
  if (!e?.diagnosis?.some(d => d.includes('Depresif Bozukluk')) || !e?.diagnosis?.some(d => d.includes('Obsesif Kompulsif Bozukluk'))) {
    r.ok = false;
    r.notes.push('782 tanıları eksik');
  } else {
    r.notes.push("782 tanıları 'Depresif Bozukluk' ve 'Obsesif Kompulsif Bozukluk' doğrulandı");
  }
});

check('872 Tanı (s.141)', (r) => {
  const e = resolveCodeInterpretation('872');
  if (!e?.diagnosis?.some(d => d.includes('Şizofrenik Reaksiyon'))) {
    r.ok = false;
    r.notes.push('872 şizofrenik reaksiyon tanısı eksik');
  } else {
    r.notes.push("872 tanısı 'Şizofrenik Reaksiyon' doğrulandı");
  }
});

check('784/874 Tanı (s.141)', (r) => {
  const e = resolveCodeInterpretation('784');
  if (!e?.diagnosis?.some(d => d.includes('Şizofrenik Reaksiyon')) || !e?.diagnosis?.some(d => d.includes('Şizoid Kişilik Bozukluğu'))) {
    r.ok = false;
    r.notes.push('784 tanıları eksik');
  } else {
    r.notes.push("784 tanıları 'Şizofrenik Reaksiyon' ve 'Şizoid Kişilik Bozukluğu' doğrulandı");
  }
});

check('789 Metin Sadakati (s.141)', (r) => {
  const e = resolveCodeInterpretation('789');
  if (!e?.text.includes('Hostil, gergin, şüpheci, hiperaktif, huzursuz bireylerdir')) {
    r.ok = false;
    r.notes.push('789 metni eksik');
  } else {
    r.notes.push("789 metni 'Hostil, gergin, şüpheci, hiperaktif' doğrulandı");
  }
});

check('794 Metin Sadakati (s.142)', (r) => {
  const e = resolveCodeInterpretation('794');
  if (!e?.text.includes('Hastalar kronik olarak kaygılı ve gergindirler')) {
    r.ok = false;
    r.notes.push('794 metni eksik');
  } else {
    r.notes.push("794 metni 'kronik olarak kaygılı ve gergindirler' doğrulandı");
  }
});

// 3. Koşullu Yorumlar (Conditions)
console.log('\n(3) KOŞULLU YORUMLAR (CONDITIONS)');
const mockCtx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey, gender?: 'Erkek' | 'Kadın') => ({
  t: (id: CodeScaleKey) => over[id],
  third,
  gender,
});

check('Pt:74 Koşulu (s.140)', (r) => {
  const e = resolveCodeInterpretation('Pt:74')!;
  const c = activeCodeConditions(e, mockCtx({ D: 75 }));
  if (c.length === 0) {
    r.ok = false;
    r.notes.push('Pt:74 D >= 70 T koşulu tetiklenmedi');
  } else {
    r.notes.push('Pt:74 depresyon koşulu bağlandı (D >= 70 T)');
  }
});

check('78/87 Koşulları (s.140-141)', (r) => {
  const e = resolveCodeInterpretation('78')!;
  const c1 = activeCodeConditions(e, mockCtx({}, 'D'));
  const c2 = activeCodeConditions(e, mockCtx({ Sc: 75, Pt: 65 }));
  const c3 = activeCodeConditions(e, mockCtx({ Pt: 75, Sc: 65 }));
  const c4 = activeCodeConditions(e, mockCtx({ Pt: 78, Sc: 82 }));
  if (c1.length === 0 || c2.length === 0 || c3.length === 0 || c4.length === 0) {
    r.ok = false;
    r.notes.push('78/87 koşulları tetiklenmedi');
  } else {
    r.notes.push('78/87 koşulları bağlandı (3. test, Sc > Pt akut psikoz/intihar, 7>8 savaş, 7<8 şizofreni)');
  }
});

check('79/97 Koşulları (s.141-142)', (r) => {
  const e = resolveCodeInterpretation('79')!;
  const c1 = activeCodeConditions(e, mockCtx({}, 'Sc'));
  const c2 = activeCodeConditions(e, mockCtx({ D: 72 }));
  if (c1.length === 0 || c2.length === 0) {
    r.ok = false;
    r.notes.push('79/97 koşulları tetiklenmedi');
  } else {
    r.notes.push('79/97 koşulları bağlandı (3. test ve D >= 70 T)');
  }
});

check('70/07 Koşulları (s.142)', (r) => {
  const e = resolveCodeInterpretation('07')!;
  const c1 = activeCodeConditions(e, mockCtx({}, 'D'));
  const c2 = activeCodeConditions(e, mockCtx({ Mf: 35 }, undefined, 'Kadın'));
  if (c1.length === 0 || c2.length === 0) {
    r.ok = false;
    r.notes.push('70/07 koşulları tetiklenmedi');
  } else {
    r.notes.push('70/07 koşulları bağlandı (3. test ve Kadın Mf < 40 T)');
  }
});

let failed = 0;
for (const r of results) {
  if (!r.ok) {
    failed++;
    console.log(`  FAIL  · ${r.code}: ${r.notes.join('; ')}`);
  } else {
    console.log(`  ok    · ${r.notes.join('; ')}`);
  }
}

console.log(`\nSONUÇ: ${failed} FARK · ${failed === 0 ? 'Pt BLOĞU KOD GÖÇÜ TAMAMLANDI' : 'DÜZELTME GEREKİYOR'}`);
if (failed > 0) process.exit(1);
