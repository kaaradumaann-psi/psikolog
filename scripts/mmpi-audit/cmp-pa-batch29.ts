/**
 * MMPI Kaynak Denetimi — Batch 29: Pa (Paranoya / 6) Bloğu Karşılaştırma Aracı
 *
 * Kitap s.127-135 (PDF p071_R - p075_R) ile kod tabanındaki (src/scoring/mmpiSourceCodes.ts)
 * Pa kod gövdeleri, yönlendirmeleri ve koşullu yorumlarının birebir mutabakatını denetler.
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
const PA_QUERIES = [
  '678', '876', 'Pa:678', 'Sc:678', 'Sc:876',
  '679', 'Pa:679',
  '680', '860', 'Pa:680', 'Sc:680', 'Sc:860', 'Si:068', 'Si:086',
  '694', '964', 'Pa:694', 'Ma:694', 'Ma:964',
  '698', '968', 'Pa:698', 'Ma:698', 'Ma:968',
  'Scarlett O\'Hara Vadisi', 'Pa:456_scarlett',
  '67', '76', '68', '86', '69', '96', '60', '06',
  '61', '62', '63', '64', '65',
];

console.log('== BÖLÜM 5: Pa (6) KOD BLOĞU GÖÇ MUTABAKATI (batch 29) ==\n');

console.log('(1) KAPSAM — Pa bloğu kod gövdeleri çözümleniyor mu?');
for (const q of PA_QUERIES) {
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
check('678 Tanı', (r) => {
  const e = resolveCodeInterpretation('678');
  if (!e?.diagnosis?.some(d => d.includes('Paranoid tip şizofreni') || d.includes('şizofreni'))) {
    r.ok = false;
    r.notes.push('678 tanısı eksik veya eşleşmiyor');
  } else {
    r.notes.push("678 tanısı 'Paranoid tip şizofreni' doğrulandı");
  }
  if (!e?.seeAlso?.includes('Psikotik V')) {
    r.ok = false;
    r.notes.push('678 Psikotik V atfı eksik');
  } else {
    r.notes.push("678 'Psikotik V' atfı doğrulandı");
  }
});

check('680 Tanı', (r) => {
  const e = resolveCodeInterpretation('680');
  if (!e?.diagnosis?.some(d => d.includes('Paranoid şizofreni'))) {
    r.ok = false;
    r.notes.push('680 tanısı eksik veya eşleşmiyor');
  } else {
    r.notes.push("680 tanısı 'Paranoid şizofreni' doğrulandı");
  }
});

check('694 Cinayet Uyarısı', (r) => {
  const e = resolveCodeInterpretation('694');
  if (!e?.text.includes('cinayet potansiyeli')) {
    r.ok = false;
    r.notes.push('694 metni cinayet potansiyeli uyarısını içermiyor');
  } else {
    r.notes.push("694 metni 'cinayet potansiyeli' uyarısını taşıyor");
  }
});

check('698 Tanı ve Yönlendirme', (r) => {
  const e = resolveCodeInterpretation('698');
  if (!e?.diagnosis?.some(d => d.includes('Şizofreni paranoid tip'))) {
    r.ok = false;
    r.notes.push('698 tanısı eksik veya eşleşmiyor');
  } else {
    r.notes.push("698 tanısı 'Şizofreni paranoid tip' doğrulandı");
  }
});

check('456 Scarlett O\'Hara Vadisi Tanım', (r) => {
  const e = resolveCodeInterpretation('Scarlett O\'Hara Vadisi');
  if (!e?.text.includes('Scarlett O\'Hara') && !e?.code.includes('Scarlett')) {
    r.ok = false;
    r.notes.push('Scarlett O\'Hara vadisi tanımı eksik');
  } else {
    r.notes.push("Scarlett O'Hara vadisi örüntüsü doğrulandı");
  }
});

// 3. Koşullu Yorumlar (Conditions)
console.log('\n(3) KOŞULLU YORUMLAR (CONDITIONS)');
const mockCtx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey, gender?: 'Erkek' | 'Kadın') => ({
  t: (id: CodeScaleKey) => over[id],
  third,
  gender,
});

check('67/76 Koşulları (s.131)', (r) => {
  const e = resolveCodeInterpretation('67')!;
  const c1 = activeCodeConditions(e, mockCtx({}, 'D'));
  const c2 = activeCodeConditions(e, mockCtx({ Pa: 75, Pt: 65 }));
  if (c1.length === 0 || c2.length === 0) {
    r.ok = false;
    r.notes.push('67 koşulları tetiklenmedi');
  } else {
    r.notes.push('67/76 koşulları bağlandı (3. test ve Pa >= Pt geçiş uyarısı)');
  }
});

check('678/876 Koşulu (s.131)', (r) => {
  const e = resolveCodeInterpretation('678')!;
  const c = activeCodeConditions(e, mockCtx({ Pa: 75, Sc: 80, Pt: 60 }));
  if (c.length === 0) {
    r.ok = false;
    r.notes.push('678 psikotik vadi koşulu tetiklenmedi');
  } else {
    r.notes.push('678 psikotik vadi koşulu bağlandı (6 ve 8 > 7)');
  }
});

check('68/86 Koşulları (s.132-133)', (r) => {
  const e = resolveCodeInterpretation('68')!;
  const c1 = activeCodeConditions(e, mockCtx({}, 'Pd'));
  const c2 = activeCodeConditions(e, mockCtx({ Pa: 72, Sc: 74, Pt: 60 }));
  const c3 = activeCodeConditions(e, mockCtx({ K: 42 }));
  const c4 = activeCodeConditions(e, mockCtx({ Pa: 78, Sc: 76 }));
  if (c1.length === 0 || c2.length === 0 || c3.length === 0 || c4.length === 0) {
    r.ok = false;
    r.notes.push('68 koşulları tetiklenmedi');
  } else {
    r.notes.push('68/86 koşulları bağlandı (3. test, paranoid vadi, K < 50 saldırganlık, 75+ T paranoid şizofreni)');
  }
});

check('69/96 Koşulları (s.133)', (r) => {
  const e = resolveCodeInterpretation('69')!;
  const c1 = activeCodeConditions(e, mockCtx({}, 'Pd'));
  const c2 = activeCodeConditions(e, mockCtx({ F: 75, Sc: 75 }));
  const c3 = activeCodeConditions(e, mockCtx({}, undefined, 'Kadın'));
  if (c1.length === 0 || c2.length === 0 || c3.length === 0) {
    r.ok = false;
    r.notes.push('69 koşulları tetiklenmedi');
  } else {
    r.notes.push('69/96 koşulları bağlandı (3. test, F ve Sc yüksekliği, kadın gerginliği)');
  }
});

check('698/968 Koşulu (s.134)', (r) => {
  const e = resolveCodeInterpretation('698')!;
  const c = activeCodeConditions(e, mockCtx({ Pa: 75, Sc: 68 }));
  if (c.length === 0) {
    r.ok = false;
    r.notes.push('698 koşulu tetiklenmedi');
  } else {
    r.notes.push('698/968 koşulu bağlandı (8 alt testi 6\'dan 5 T aşağıda)');
  }
});

check('60/06 Koşulları (s.134)', (r) => {
  const e = resolveCodeInterpretation('60')!;
  const c1 = activeCodeConditions(e, mockCtx({}, undefined, 'Kadın'));
  const c2 = activeCodeConditions(e, mockCtx({}, 'D'));
  if (c1.length === 0 || c2.length === 0) {
    r.ok = false;
    r.notes.push('60 koşulları tetiklenmedi');
  } else {
    r.notes.push('60/06 koşulları bağlandı (kadın ve 3. test D/Pd/Hy)');
  }
});

check('Pa:456_scarlett Koşulu (s.134)', (r) => {
  const e = resolveCodeInterpretation('Pa:456_scarlett')!;
  const c = activeCodeConditions(e, mockCtx({ Hy: 75 }));
  if (c.length === 0) {
    r.ok = false;
    r.notes.push('Scarlett O\'Hara vadisi Hy >= 70 T koşulu tetiklenmedi');
  } else {
    r.notes.push('Scarlett O\'Hara vadisi koşulu bağlandı (Hy >= 70 T manipulasyon)');
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

console.log(`\nSONUÇ: ${failed} FARK · ${failed === 0 ? 'Pa BLOĞU KOD GÖÇÜ TAMAMLANDI' : 'DÜZELTME GEREKİYOR'}`);
if (failed > 0) process.exit(1);
