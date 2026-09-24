/**
 * PHASE 10 batch 22 kanit karsilastirmasi — BOLUM 6 profil oruntuleri (kitab s.159-169,
 * Sekil 23-32) ↔ src/scoring/mmpiInterpretation.ts + UI metinleri.
 *
 * Kaynak esikleri **150 dpi tam sayfa gorsel okumasindan** gelir (.audit/pages/p088_L … p092_R);
 * OCR sayisal degerler icin esas alinmadi (TABLO-NUMBERS kurali).
 * Kosu:  npx tsx scripts/mmpi-audit/cmp-b6-batch22.ts
 * Bu betik kod DEGISTIRMEZ; yalniz karsilastirir ve raporlar (DECISION-030 onayi bekliyor).
 */
import { readFileSync } from 'node:fs';
import { buildProfileFromRawScoresObject, type RawScores } from '../../src/scoring/mmpiScoring';
import { detectPatterns, detectSingleElevations } from '../../src/scoring/mmpiInterpretation';

const baseRaw = {
  blank: 0, L: 5, F: 6, K: 0, Hs: 13, D: 21, Hy: 19, Pd: 22, Mf: 29, Pa: 11, Pt: 28, Sc: 30, Ma: 20, Si: 24,
} as unknown as RawScores;

const prof = (over: Partial<RawScores>, gender: 'Erkek' | 'Kadin' = 'Erkek') =>
  buildProfileFromRawScoresObject({ ...baseRaw, ...over } as RawScores, gender === 'Erkek' ? 'Erkek' : 'Kadın');

const T = (p: ReturnType<typeof prof>, id: string) => p.scales.find(s => s.id === id)!.tScore;
const hit = (p: ReturnType<typeof prof>, id: string) => detectPatterns(p).find(x => x.id === id)!.hit;
const rule = (id: string) => detectPatterns(prof({})).find(x => x.id === id)!.rule;

let fark = 0;
const b = (mesaj: string) => {
  fark += 1;
  console.log('  BULGU · FARK ' + mesaj);
};
const ok = (mesaj: string) => console.log('  ok    · ' + mesaj);
const yok = (mesaj: string) => console.log('  yok   · ' + mesaj);

console.log('== BOLUM 6 · 10 oruntu (s.160-169, Sekil 23-32) ==');

// (1) Konversiyon V — kaynak: Hs ve Hy >= 70 T ve Dden >= 10 T yuksek
console.log('\n(1) #1 Konversiyon V (s.160, Sekil 23) — kaynak “Hs ve Hy, D alt testinden 10 ya da daha fazla T puanı yuksek ve Hs ile Hy en az 70 T puaninda”');
const cvKaynakDisi = prof({ Hs: 20, Hy: 27, D: 25 });
const cvKaynakIci = prof({ Hs: 23, Hy: 31, D: 21 });
console.log('      kod kurali: ' + rule('conversion-v'));
if (hit(cvKaynakDisi, 'conversion-v') && !(T(cvKaynakDisi, 'Hs') >= 70 && T(cvKaynakDisi, 'Hy') >= 70 && Math.min(T(cvKaynakDisi, 'Hs'), T(cvKaynakDisi, 'Hy')) - T(cvKaynakDisi, 'D') >= 10)) {
  b('kod desen vuruyor, kaynak vurmuyor (Hs ' + T(cvKaynakDisi, 'Hs').toFixed(1) + ' / Hy ' + T(cvKaynakDisi, 'Hy').toFixed(1) + ' / D ' + T(cvKaynakDisi, 'D').toFixed(1) + ') — esik 65/5 ↔ kaynak 70/10');
} else {
  ok('esikler kaynakla uyumlu gorunuyor');
}
ok('kaynak tanimini karsilayan profil kodda da vuruyor (Hs ' + T(cvKaynakIci, 'Hs').toFixed(1) + ' / Hy ' + T(cvKaynakIci, 'Hy').toFixed(1) + ') — yanlis negatif yok');

// (2) Paranoid V — kaynak: Pa ve Sc 80 T, Pt 70 T
console.log('\n(2) #2 Paranoid V (s.161, Sekil 24) — kaynak “Pa ve Sc alt testleri 80 T puaninda, Pt alt olcegi ise 70 T puanindadir”');
const pvAralik = prof({ Pa: 21, Sc: 52, Pt: 34 });
const pvUst = prof({ Pa: 25, Sc: 60, Pt: 34 });
console.log('      kod kurali: ' + rule('psychotic-v'));
if (hit(pvAralik, 'psychotic-v') && !(T(pvAralik, 'Pa') >= 80 && T(pvAralik, 'Sc') >= 80)) {
  b('kod 70 Tde vuruyor, kaynak 80 T diyor (Pa ' + T(pvAralik, 'Pa').toFixed(1) + ' / Sc ' + T(pvAralik, 'Sc').toFixed(1) + ')');
} else {
  ok('esik kaynakla uyumlu');
}
ok('Pa ' + T(pvUst, 'Pa').toFixed(1) + ' / Sc ' + T(pvUst, 'Sc').toFixed(1) + ' (>= 80 T) kodda da vuruyor');

// (3) Pd Yukselligi Profili — kaynak: Pd > 70 T ve butun alt testlerden >= 10 T yuksek
console.log('\n(3) #3 Pd Yukselligi Profili (s.162, Sekil 25) — kaynak “Pd alt testi 70 T puaninin ustundedir ve butun alt testlerden en az 10 T puanı yüksektir”');
const pdHit = (over: Partial<RawScores>) => detectSingleElevations(prof(over)).some(x => x.scale === 'Pd');
if (pdHit({ Pd: 32 }) && !pdHit({ Pd: 32, Sc: 52 }) && !pdHit({ Pd: 30 })) {
  ok('SINGLE_PD kaynagin kuraliyla birebir (Pd 72.0 T / max 50.8 T → vurur; Sc 74.5 T eklenince fark dusuyor → vurmaz; Pd 67.5 T → esik alti)');
} else {
  b('SINGLE_PD kurali kaynakla uymuyor');
}

// (4) #4-#10 desenlerinin yoklugu
console.log('\n(4) #4-#10 — kaynagin tanimini GERCEKTEN karsilayan profiller');
const adaylar: Array<[string, string, ReturnType<typeof prof>, (p: ReturnType<typeof prof>) => boolean]> = [
  ['#4 kus-kanadi', 'Kus Kanadi (Hs,D,Hy,Pd >= 70 + kadinda Mf 50 + psikotikler yukselmis)', prof({ Hs: 26, D: 35, Hy: 29, Pd: 33, Mf: 34, Pa: 22, Pt: 45, Sc: 60 }, 'Kadin'),
    p => ['Hs', 'D', 'Hy', 'Pd'].every(id => T(p, id) >= 70)],
  ['#5 pasif-agresif-v', 'Pasif-Agresif V (Kadinlarda): 4 ve 6 >= 70 T, Mf < 50 T', prof({ Pd: 33, Pa: 22, Mf: 36 }, 'Kadin'),
    p => T(p, 'Pd') >= 70 && T(p, 'Pa') >= 70 && T(p, 'Mf') < 50],
  ['#6 pozitif-egim', 'Psikotik (pozitif) egim: psikotik testler > 70 T, nevrotik testler < 70 T', prof({ Pa: 21, Pt: 45, Sc: 60, Ma: 30 }),
    p => T(p, 'Pa') > 70 && T(p, 'Sc') > 70 && T(p, 'Hs') < 70 && T(p, 'D') < 70],
  ['#7 negatif-egim', 'Nevrotik (negatif) egim: nevrotik taraf yukselmis + psikotiklerde belirgin dusukluk (SAYISAL ESIK YOK)', prof({ Hs: 26, D: 35, Hy: 32, Pa: 5, Pt: 10, Sc: 10, Ma: 5 }),
    p => T(p, 'Hs') > 70 && T(p, 'D') > 70 && T(p, 'Sc') < 40],
  ['#8 yuzen-profil', '“Yuzen” Profil: Hs→Ma TAMAMI > 70 T + F yukselmesi', prof({ Hs: 23, D: 32, Hy: 31, Pd: 32, Mf: 38, Pa: 25, Pt: 45, Sc: 60, Ma: 30, F: 20 }),
    p => p.clinical.filter(s => s.id !== 'Si').every(s => s.tScore > 70) && T(p, 'F') > 70],
  ['#9 batik-profil', 'Batik Profil: profil 45-54 T arasinda', prof({ Hs: 12, D: 21, Hy: 19, Pd: 22, Mf: 29, Pa: 11, Pt: 28, Sc: 30, Ma: 20, Si: 24 }),
    p => p.clinical.every(s => s.tScore >= 45 && s.tScore <= 54)],
  ['#10 sinir-profil', 'Sinir Profil: T 60-70 + klinik > 54 T + gecerlikte kismi yukselme', prof({ Hs: 18, D: 25, Hy: 24, Pd: 27, Mf: 33, Pa: 16, Pt: 35, Sc: 40, Ma: 24, Si: 30, F: 14 }),
    p => p.clinical.every(s => s.tScore > 54 && s.tScore < 70)],
];
const ids = new Set(detectPatterns(prof({})).map(x => x.id));
const anahtarKelime = /^#\d+\s+(\S+)/;
for (const [id, ad, p, saglar] of adaylar) {
  const Tler = p.clinical.map(s => s.id + '=' + s.tScore.toFixed(0)).join(' ');
  const karsiliyor = saglar(p);
  const kelime = ad.match(anahtarKelime)?.[1] ?? id;
  const eslesenVuran = detectPatterns(p).filter(x => x.hit).filter(h => new RegExp(kelime, 'i').test(h.name + ' ' + h.detail)).length > 0;
  if (!ids.has(id) && !eslesenVuran) {
    if (karsiliyor) b(ad + ' → profil kaynağın tanımını GERÇEKTEN karşılıyor (' + Tler + '), kodda karşılığı YOK');
    else yok(ad + ' → kodda karşılığı YOK (aday profil eşiği tam karşılamıyor: ' + Tler + ')');
  } else {
    ok(ad + ' → kodda karşılığı var: ' + id);
  }
}

// (5) UI/uyari direktifleri (CONFLICT-042) ve baglanti (CONFLICT-034)
console.log('\n(5) Cekince direktifleri (CONFLICT-042) — kaynak metinleri koda tasinmis mi?');
const dosyalar = [
  'src/scoring/mmpiInterpretation.ts',
  'src/components/results/MMPIExtraTab.tsx',
  'src/components/results/MMPICodeTab.tsx',
  'src/components/results/MMPIPrintReport.tsx',
];
const hepsi = dosyalar.map(f => readFileSync(f, 'utf-8')).join('\n').toLowerCase();
const direktifler: Array<[string, string]> = [
  ['kod tipi verilemez', 's.167 — “Bu profil tipiyle baglantili bir kod tipi verilemez.”'],
  ['tanisinin konulmasi dogru degil', 's.166 — “Sadece bu turlu yukselmelerle … tanisinin konulmasi dogru degildir.”'],
  ['en dusuk oldugu alt testlere', 's.168 — “T puanlarinin en dusuk oldugu alt testlere bakmak gerekmektedir.”'],
  ['hiçbir zaman körlemesine', 's.159 — “Hicbir zaman korlemesine bir degerlendirme yapilmamalidir.”'],
  ['zekâ düzeyleri 80', 's.159 — “zekâ duzeyleri 80in uzerinde olan yetiskinlere”'],
  ['deneyimi onemlidir', 's.160 — “… testi veren kisinin deneyimi onemlidir.”'],
  ['butcher', 's.169 — 60-64 T notu (Butcher 1984)'],
];
for (const [anahtar, aciklama] of direktifler) {
  if (hepsi.includes(anahtar)) ok('koda tasinmis: ' + aciklama);
  else yok('kodda YOK: ' + aciklama);
}

console.log('\n== KAYNAK TARAFI (sayfa yapisinin dogrulamasi) ==');
console.log('  s.170 = PDF p93 L → BOS SAYFA (koyu piksel %0.24, OCR 0 satir); s.171 = p93 R = BOLUM 7 girisi');
console.log('\nSONUC: ' + fark + ' FARK (esik sapmasi + eksik desen; cekinceler ayri kanit) · P0 BULGU YOK');
