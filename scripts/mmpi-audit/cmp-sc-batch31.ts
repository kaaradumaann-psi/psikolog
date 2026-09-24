/**
 * MMPI Kaynak Denetimi — Batch 31: Sc (Şizofreni / 8) Bloğu Karşılaştırma Aracı
 *
 * Kitap s.143-148 (PDF p079_R - p082_L) ile kod tabanındaki (src/scoring/mmpiSourceCodes.ts)
 * Sc kod gövdeleri, yönlendirmeleri ve koşullu yorumlarının birebir mutabakatını denetler.
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
const SC_QUERIES = [
  'Sc:86', 'Sc:68', '86', '68', 'Pa:86',
  'Sc:87', 'Sc:78', '87', '78',
  '8726', 'Sc:8726', 'Pt:8726', 'Ma:8726', 'Sc:8726_high9',
  'Paranoid Vadi', 'Sc:paranoid_valley', 'Pa:paranoid_valley', 'Psikotik V', 'Sc:psychotic_v', 'Pa:psychotic_v',
  '89', '89/98',
  '80', '08', '80/08',
  '81', '82', '83', '84', '85',
];

console.log('== BÖLÜM 5: Sc (8) KOD BLOĞU GÖÇ MUTABAKATI (batch 31) ==\n');

console.log('(1) KAPSAM — Sc bloğu kod gövdeleri çözümleniyor mu?');
for (const q of SC_QUERIES) {
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
check('Sc:86 Tanı ve Metin (s.146)', (r) => {
  const e = resolveCodeInterpretation('Sc:86');
  if (!e?.text.includes("6 ve 8'in T puanı 80'nin üstünde, 7 de 70 T puanındadır")) {
    r.ok = false;
    r.notes.push('Sc:86 metni eksik veya uyuşmuyor');
  } else if (!e?.diagnosis?.some(d => d.includes('Paranoid şizofreni'))) {
    r.ok = false;
    r.notes.push('Sc:86 tanıları eksik');
  } else {
    r.notes.push("Sc:86 metni ve tanıları 'Paranoid şizofreni', 'Paranoid durum', 'Şizoid kişilik' doğrulandı");
  }
});

check('Sc:87 Metin Sadakati (s.146)', (r) => {
  const e = resolveCodeInterpretation('Sc:87');
  if (!e?.text.includes('Endişeli, kendi kendini tetkik edebilen, derin düşünceye dalan kişilerdir')) {
    r.ok = false;
    r.notes.push('Sc:87 metni eksik veya uyuşmuyor');
  } else {
    r.notes.push("Sc:87 metni 'Endişeli, kendi kendini tetkik edebilen' doğrulandı");
  }
});

check('8726 / Yüksek 9 Tanı ve Metin (s.146)', (r) => {
  const e = resolveCodeInterpretation('8726');
  if (!e?.text.includes('Ajite şizofren bir hastayı göstermektedir')) {
    r.ok = false;
    r.notes.push('8726 metni eksik');
  } else if (!e?.diagnosis?.some(d => d.toLowerCase().includes('ajite'))) {
    r.ok = false;
    r.notes.push('8726 tanısı eksik');
  } else {
    r.notes.push("8726 metni ve tanısı 'Ajite şizofreni' doğrulandı");
  }
});

check('Paranoid Vadi / Şekil 22 Metin ve Tanı (s.147)', (r) => {
  const e = resolveCodeInterpretation('Paranoid Vadi');
  if (!e?.text.includes('Bu örüntüyü gösteren hastalar, duygusal olarak geri çekilmişlerdir')) {
    r.ok = false;
    r.notes.push('Paranoid Vadi metni eksik');
  } else if (!e?.diagnosis?.some(d => d.includes('Paranoid şizofreni'))) {
    r.ok = false;
    r.notes.push('Paranoid Vadi tanısı eksik');
  } else {
    r.notes.push("Paranoid Vadi metni ve tanısı 'Paranoid şizofreni' doğrulandı");
  }
});

check('89/98 Metin ve Tanı Sadakati (s.147-148)', (r) => {
  const e = resolveCodeInterpretation('89');
  if (!e?.text.includes('ergenlerde ve yetişkinlerde ciddi psikopatolojiyi gösterir')) {
    r.ok = false;
    r.notes.push('89/98 metni eksik');
  } else if (!e?.diagnosis?.some(d => d.includes('Şizofreni')) || !e?.diagnosis?.some(d => d.includes('Madde kullanımına bağlı psikoz'))) {
    r.ok = false;
    r.notes.push('89/98 tanıları eksik');
  } else {
    r.notes.push("89/98 tanıları 'Şizofreni' ve 'Madde kullanımına bağlı psikoz' doğrulandı");
  }
});

check('80/08 Metin ve Tanı Sadakati (s.148)', (r) => {
  const e = resolveCodeInterpretation('08');
  if (!e?.text.includes('Genellikle sosyal açıdan çekingen kişilerdir')) {
    r.ok = false;
    r.notes.push('80/08 metni eksik');
  } else if (!e?.diagnosis?.some(d => d.includes('Şizoid Kişilik'))) {
    r.ok = false;
    r.notes.push('80/08 tanısı eksik');
  } else {
    r.notes.push("80/08 tanısı 'Şizoid Kişilik' doğrulandı");
  }
});

// 3. Koşullu Yorumlar (Conditions)
console.log('\n(3) KOŞULLU YORUMLAR (CONDITIONS)');
const mockCtx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey, gender?: 'Erkek' | 'Kadın') => ({
  t: (id: CodeScaleKey) => over[id],
  third,
  gender,
});

check('Sc:86 Koşulu (s.146)', (r) => {
  const e = resolveCodeInterpretation('Sc:86')!;
  const c = activeCodeConditions(e, mockCtx({ Pa: 85, Sc: 85, Pt: 70 }));
  if (c.length === 0) {
    r.ok = false;
    r.notes.push('Sc:86 6 ve 8 >= 80, 7 ≈ 70 T koşulu tetiklenmedi');
  } else {
    r.notes.push('Sc:86 koşulu bağlandı (Pa >= 80, Sc >= 80, Pt 65-75 T)');
  }
});

check('Sc:87 Koşulu (s.146)', (r) => {
  const e = resolveCodeInterpretation('Sc:87')!;
  const c = activeCodeConditions(e, mockCtx({ Pt: 76, Sc: 82 }));
  if (c.length === 0) {
    r.ok = false;
    r.notes.push('Sc:87 Pt & Sc >= 75 ∧ Sc > Pt koşulu tetiklenmedi');
  } else {
    r.notes.push('Sc:87 koşulu bağlandı (Pt & Sc >= 75 ∧ Sc > Pt)');
  }
});

check('8726 Koşulu (s.146)', (r) => {
  const e = resolveCodeInterpretation('8726')!;
  const c = activeCodeConditions(e, mockCtx({ Ma: 75 }));
  if (c.length === 0) {
    r.ok = false;
    r.notes.push('8726 Ma >= 70 T koşulu tetiklenmedi');
  } else {
    r.notes.push('8726 hipomani koşulu bağlandı (Ma >= 70 T)');
  }
});

check('Paranoid Vadi Koşulu (s.147)', (r) => {
  const e = resolveCodeInterpretation('Paranoid Vadi')!;
  const c = activeCodeConditions(e, mockCtx({ Pa: 80, Sc: 85, Pt: 68 }));
  if (c.length === 0) {
    r.ok = false;
    r.notes.push('Paranoid Vadi Pa, Sc >= 70, Pt <= Pa-10 & Sc-10 koşulu tetiklenmedi');
  } else {
    r.notes.push('Paranoid Vadi vadi dibi koşulu bağlandı (Pa,Sc >= 70, Pt 10 T aşağıda)');
  }
});

check('89/98 Koşulları (s.147-148)', (r) => {
  const e = resolveCodeInterpretation('89')!;
  const c1 = activeCodeConditions(e, mockCtx({}, 'Pd'));
  const c2 = activeCodeConditions(e, mockCtx({}, 'Pt'));
  const c3 = activeCodeConditions(e, mockCtx({}, 'Pa'));
  if (c1.length === 0 || c2.length === 0 || c3.length === 0) {
    r.ok = false;
    r.notes.push('89/98 3. test koşulları tetiklenmedi');
  } else {
    r.notes.push('89/98 3. test (Pd/Pt/Pa) ve yaş < 27 manuel notu bağlandı');
  }
});

check('80/08 Koşulu (s.148)', (r) => {
  const e = resolveCodeInterpretation('08')!;
  const c1 = activeCodeConditions(e, mockCtx({}, 'Pt'));
  const c2 = activeCodeConditions(e, mockCtx({}, 'D'));
  if (c1.length === 0 || c2.length === 0) {
    r.ok = false;
    r.notes.push('80/08 3. test Pt/D koşulları tetiklenmedi');
  } else {
    r.notes.push('80/08 3. test (Pt veya D) koşulu bağlandı');
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

console.log(`\nSONUÇ: ${failed} FARK · ${failed === 0 ? 'Sc BLOĞU KOD GÖÇÜ TAMAMLANDI' : 'DÜZELTME GEREKİYOR'}`);
if (failed > 0) process.exit(1);
