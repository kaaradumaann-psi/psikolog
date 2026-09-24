/**
 * MMPI Kaynak Denetimi — Batch 33: Si (Sosyal İçe Dönüklük / 0) Bloğu Karşılaştırma Aracı
 *
 * Kitap s.154-158 (PDF p084_L - p086_L) ile kod tabanındaki (src/scoring/mmpiSourceCodes.ts)
 * Si kod gövdeleri, yönlendirmeleri ve koşullu yorumlarının birebir mutabakatını denetler.
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
const SI_QUERIES = [
  '049', 'Si:049', 'Pd:049', 'Ma:049',
  '027(8)', '027', 'Si:027', 'Si:0278', 'D:027', 'Pt:027', 'Sc:027',
  'Si:068', 'Si:086',
  '01', '10', '02', '20', '03', '30', '04', '40', '05', '50',
  '06', '60', '07', '70', '08', '80', '09', '90',
];

console.log('== BÖLÜM 5: Si (0) KOD BLOĞU GÖÇ MUTABAKATI (batch 33) ==\n');

console.log('(1) KAPSAM — Si bloğu kod gövdeleri çözümleniyor mu?\n');

for (const q of SI_QUERIES) {
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

check('049 Metni ve Sadakati', (r) => {
  const entry = resolveCodeInterpretation('049')!;
  if (!entry.text.includes('Psikiyatrik olgularda eyleme vurukluğun bastırılması')) {
    r.ok = false;
    r.notes.push('049 metni beklenen içeriği taşımıyor');
  }
  r.notes.push('049 metni doğrulandı');
});

check('027(8) Metni ve Sadakati', (r) => {
  const entry = resolveCodeInterpretation('027(8)')!;
  if (!entry.text.includes('Bireyde güçlü ruminatif davranışlar görülebilir.')) {
    r.ok = false;
    r.notes.push('027(8) metni beklenen içeriği taşımıyor');
  }
  r.notes.push('027(8) metni doğrulandı');
});

// 3. Koşullu Yorumlar (Conditions)
console.log('(3) KOŞULLU YORUMLAR (CONDITIONS)\n');

const mockProfile = (scores: Partial<Record<string, number>>, gender: 'Erkek' | 'Kadın' = 'Erkek') => ({
  t: (scale: string) => scores[scale] ?? 50,
  raw: () => 0,
  gender,
  third: undefined as CodeScaleKey | undefined,
});

check('049 Koşulu (Si, Pd, Ma >= 70)', (r) => {
  const entry = resolveCodeInterpretation('049')!;
  if (!entry.conditions || entry.conditions.length === 0) {
    r.ok = false;
    r.notes.push('049 koşul taşımıyor');
    return;
  }
  const act = activeCodeConditions(entry, mockProfile({ Si: 75, Pd: 72, Ma: 70 }));
  if (act.length !== 1 || !act[0].quote.includes('eyleme vurukluğun bastırıldığı')) {
    r.ok = false;
    r.notes.push('049 eyleme vurukluğun bastırılması koşulu tetiklenmedi');
  }
  const inact = activeCodeConditions(entry, mockProfile({ Si: 75, Pd: 65, Ma: 70 }));
  if (inact.length !== 0) {
    r.ok = false;
    r.notes.push('049 Pd < 70 iken koşul tetiklenmemeli');
  }
  r.notes.push('049 eyleme vurukluğun bastırılması koşulu doğrulandı');
});

check('027(8) Koşulu (D/Pt >= 70 && Sc >= 70)', (r) => {
  const entry = resolveCodeInterpretation('027(8)')!;
  if (!entry.conditions || entry.conditions.length === 0) {
    r.ok = false;
    r.notes.push('027(8) koşul taşımıyor');
    return;
  }
  const actD = activeCodeConditions(entry, mockProfile({ D: 75, Sc: 72 }));
  if (actD.length !== 1 || !actD[0].quote.includes('ruminatif')) {
    r.ok = false;
    r.notes.push('027(8) D+Sc ruminatif koşulu tetiklenmedi');
  }
  const actPt = activeCodeConditions(entry, mockProfile({ Pt: 75, Sc: 72 }));
  if (actPt.length !== 1) {
    r.ok = false;
    r.notes.push('027(8) Pt+Sc ruminatif koşulu tetiklenmedi');
  }
  const inact = activeCodeConditions(entry, mockProfile({ D: 75, Sc: 60 }));
  if (inact.length !== 0) {
    r.ok = false;
    r.notes.push('027(8) Sc < 70 iken koşul tetiklenmemeli');
  }
  r.notes.push('027(8) ruminatif davranışlar koşulu doğrulandı');
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
  console.error('\nBAŞARISIZ: Si kod bloğunda mutabakat farkları var!');
  process.exit(1);
} else {
  console.log('\nSONUÇ: 0 FARK · Si BLOĞU KOD GÖÇÜ TAMAMLANDI');
}
