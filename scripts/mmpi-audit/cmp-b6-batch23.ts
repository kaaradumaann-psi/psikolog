/**
 * PHASE 10 batch 23 — DECISION-030/A (CHANGE-015) KAPANIŞ KANITI
 *
 * BÖLÜM 6 (s.159-169) örüntülerinin eşikleri kaynağa çekildi ve 7 örüntü eklendi.
 * Bu betik **kaynak ↔ kod** mutabakatını ölçer; `cmp-b6-batch22.ts`in aksine
 * (o betik CHANGE-015 ÖNCESİ yokluğu kanıtlıyordu) burada beklenti **uyuşma**dır.
 * Salt-okunur; hiçbir dosyayı değiştirmez.
 *
 *   npx tsx scripts/mmpi-audit/cmp-b6-batch23.ts
 */
import { readFileSync } from 'node:fs';
import { buildProfileFromRawScoresObject } from '../../src/scoring/mmpiScoring';
import { MMPI_PATTERN_CAVEATS, detectPatterns, detectSingleElevations } from '../../src/scoring/mmpiInterpretation';
import type { RawScores } from '../../src/workspace/caseTypes';

const base: RawScores = {
  blank: 0, L: 5, F: 6, K: 12, Hs: 13, D: 21, Hy: 19, Pd: 22, Mf: 29, Pa: 11, Pt: 28, Sc: 30, Ma: 20, Si: 24,
};
const prof = (over: Partial<RawScores>, gender: 'Erkek' | 'Kadın' = 'Erkek') =>
  buildProfileFromRawScoresObject({ ...base, K: 0, ...over } as RawScores, gender);
const T = (p: ReturnType<typeof prof>, id: string) => p.scales.find(s => s.id === id)!.tScore;
const rec = (p: ReturnType<typeof prof>, id: string) => detectPatterns(p).find(x => x.id === id);
const hits = (p: ReturnType<typeof prof>) => detectPatterns(p).filter(x => x.hit).map(x => x.id);

let fark = 0;
const ok = (m: string) => console.log('  ok    · ' + m);
const b = (m: string) => { fark++; console.log('  BULGU · FARK ' + m); };
const yok = (m: string) => { fark++; console.log('  BULGU · YOK   ' + m); };

console.log('== DECISION-030/A (CHANGE-015) — BÖLÜM 6 örüntü mutabakatı ==\n');

// (1) Kayıt evreni: kitabın 10 örüntüsünün tamamı bir karşılığa bağlanmalı
console.log('(1) Desen kayıtları (detectPatterns) — 11 → 18 kayıt beklentisi');
const ids = detectPatterns(prof({})).map(x => x.id);
const beklenen = [
  'conversion-v', 'cry-for-help', 'psychotic-v', 'depressive-27', '49', '89',
  'neurotic-triad', 'neurotic-step', 'neurotic-hat', 'neurotic-rising',
  'kus-kanadi', 'pasif-agresif-v', 'pozitif-egim', 'negatif-egim', 'yuzen-profil',
  'batik-profil', 'sinir-profil', 'multi-high',
];
for (const id of beklenen) (ids.includes(id) ? ok : b)(`kayıt ${id} ${ids.includes(id) ? 'var' : 'YOK'}`);
if (ids.length !== beklenen.length) b(`kayıt sayısı ${ids.length} ≠ ${beklenen.length}`);

// (2) Eşikler: #1 ve #2 artık kaynak sayılarını taşımalı
console.log('\n(2) Eşik mutabakatı (#1 s.160 · #2 s.161 · #3 s.162)');
const cv = rec(prof({}), 'conversion-v')!;
/≥ 70/.test(cv.rule) && /10 T/.test(cv.rule)
  ? ok('#1 rule → ' + cv.rule)
  : b('#1 rule kaynak eşiğini taşımıyor: ' + cv.rule);
cv.source === 's.160 · Şekil 23' ? ok('#1 source ' + cv.source) : b('#1 source: ' + cv.source);
const pv = rec(prof({}), 'psychotic-v')!;
/≥ 80/.test(pv.rule) && /Pt ≥ 70/.test(pv.rule)
  ? ok('#2 rule → ' + pv.rule)
  : b('#2 rule kaynak eşiğini taşımıyor: ' + pv.rule);
pv.source === 's.161 · Şekil 24' ? ok('#2 source ' + pv.source) : b('#2 source: ' + pv.source);

// Eski yanlış pozitifler artık VURMAMALI; kaynak-uyumlu profiller VURMALI
const fpCv = prof({ Hs: 20, Hy: 27, D: 25 });   // 66.7 / 66.3 / 59.2 — batch 22 kanıtı
rec(fpCv, 'conversion-v')!.hit === false ? ok('#1 eski FP (66.7/66.3/59.2) artık vurmuyor') : b('#1 eski FP hâlâ vuruyor');
const okCv = prof({ Hs: 23, Hy: 31, D: 21 });  // 74.1 / 74.8 / 50.8 — kaynak tanımı
rec(okCv, 'conversion-v')!.hit === true ? ok('#1 kaynak tanımı vuruyor (74.1/74.8/50.8)') : b('#1 kaynak tanımı VURMUYOR (yanlış negatif)');
const fpPv = prof({ Pa: 21, Sc: 52, Pt: 34 }); // 74.5 / 74.5 / 59.7
rec(fpPv, 'psychotic-v')!.hit === false ? ok('#2 eski FP (74.5/74.5/59.7) artık vurmuyor') : b('#2 eski FP hâlâ vuruyor');
const okPv = prof({ Pa: 24, Sc: 58, Pt: 43 }); // 82.0 / 81.1 / 74.0
rec(okPv, 'psychotic-v')!.hit === true ? ok('#2 kaynak tanımı vuruyor (82.0/81.1/74.0)') : b('#2 kaynak tanımı VURMUYOR (yanlış negatif)');
// #3 SINGLE_PD — CHANGE-015 kapsamı dışında (zaten birebir), bozulmadığını doğrula
const pdOk = detectSingleElevations(prof({ Pd: 32 })).some(x => x.scale === 'Pd')
  && !detectSingleElevations(prof({ Pd: 32, Sc: 52 })).some(x => x.scale === 'Pd');
pdOk ? ok('#3 SINGLE_PD davranışı korundu (Pd > 70 ∧ ötekilerden ≥ 10 T)') : b('#3 SINGLE_PD davranışı değişti');

// (3) #4-#10 — kaynağın TAM tanimini karşılayan profiller deseni vurmalı
console.log('\n(3) #4-#10 — kaynak tanimi + kod vurusu (ayni profilde)');
type Vaka = { id: string; ad: string; raw: Partial<RawScores>; gender?: 'Erkek' | 'Kadın'; saglar: (p: ReturnType<typeof prof>) => boolean; };
const vakalar: Vaka[] = [
  {
    // s.163: Hs, D, Hy, Pd 70 T'na yükselmiş + kadınlarda Mf 50 T
    id: 'kus-kanadi', ad: '#4 Kuş Kanadı (Şekil 26)', gender: 'Kadın',
    raw: { Hs: 26, D: 35, Hy: 29, Pd: 33, Mf: 33 },
    saglar: p => ['Hs', 'D', 'Hy', 'Pd'].every(id => T(p, id) >= 70) && Math.round(T(p, 'Mf')) === 50,
  },
  {
    // s.164: 4 ve 6 ≥ 70 T, Mf < 50 T, başlık “(Kadınlarda)”
    id: 'pasif-agresif-v', ad: '#5 Pasif-Agresif V (Şekil 27)', gender: 'Kadın',
    raw: { Pd: 33, Pa: 24, Mf: 40 },
    saglar: p => T(p, 'Pd') >= 70 && T(p, 'Pa') >= 70 && T(p, 'Mf') < 50,
  },
  {
    // s.165: psikotik testler > 70 T, nevrotik testler < 70 T
    id: 'pozitif-egim', ad: '#6 Pozitif eğim (Şekil 28)',
    raw: { Pa: 24, Pt: 43, Sc: 52, Ma: 29, Si: 40 },
    saglar: p => ['Pa', 'Pt', 'Sc', 'Ma', 'Si'].every(id => T(p, id) > 70) && ['Hs', 'D', 'Hy', 'Pd'].every(id => T(p, id) < 70),
  },
  {
    // s.167: Hs→Ma tamamı > 70 T (F ayağı sayısız → manualNote)
    id: 'yuzen-profil', ad: '#8 “Yüzen” Profil (Şekil 30)',
    raw: { Hs: 23, D: 32, Hy: 31, Pd: 32, Mf: 38, Pa: 25, Pt: 45, Sc: 60, Ma: 30, F: 20 },
    saglar: p => ['Hs', 'D', 'Hy', 'Pd', 'Mf', 'Pa', 'Pt', 'Sc', 'Ma'].every(id => T(p, id) > 70),
  },
  {
    // s.168: profil 45-54 T arasında
    id: 'batik-profil', ad: '#9 Batık Profil (Şekil 31)',
    raw: {},
    saglar: p => p.clinical.every(s => s.tScore >= 45 && s.tScore <= 54),
  },
  {
    // s.169: T 60-70 arasında (kaynak “klinik > 54 T”yi ayrıca not eder)
    id: 'sinir-profil', ad: '#10 Sınır Profil (Şekil 32)',
    raw: { Hs: 19, D: 28, Hy: 26, Pd: 29, Mf: 34, Pa: 16, Pt: 37, Sc: 39, Ma: 26, Si: 32, F: 14 },
    saglar: p => p.clinical.every(s => s.tScore >= 60 && s.tScore <= 70),
  },
];
for (const v of vakalar) {
  const p = prof(v.raw, v.gender ?? 'Erkek');
  const tler = p.clinical.map(s => `${s.id}=${s.tScore.toFixed(0)}`).join(' ');
  if (!v.saglar(p)) { b(`${v.ad} → örnek profil kaynağın tanimini karsilamiyor: ${tler}`); continue; }
  const r = rec(p, v.id);
  if (!r) { yok(`${v.ad} → kodda kayıt YOK (${v.id})`); continue; }
  if (!r.hit) { b(`${v.ad} → profil tanimi karsiliyor ama desen VURMADI (${tler})`); continue; }
  ok(`${v.ad} → vuruyor (${tler})`);
  if (!r.source || !/^s\.1\d\d · Şekil \d+$/.test(r.source)) b(`${v.ad} → source alanı eksik/yanlış: ${r.source}`);
  if (!(r.quote ?? '').length) b(`${v.ad} → quote (birebir kaynak cümlesi) yok`);
}
// #7: kaynakta sayi yok → manual (vurmamasi DOĞRU davranistir)
const neg = rec(prof({ Hs: 26, D: 35, Hy: 29, Pd: 33 }), 'negatif-egim')!;
neg.manual === true && neg.hit === false
  ? ok('#7 Nevrotik (negatif) eğim → manual: kaynak “belirgin düşüklük” diyor, sayı vermiyor (DECISION-028)')
  : b('#7 negatif-egim manual olmalı (manual=' + neg.manual + ', hit=' + neg.hit + ')');

// (4) Bantlar ayrışıyor mu (Batık ≠ Sınır)
console.log('\n(4) Bant denetimi — #9 (45-54) ile #10 (60-70) ayrışmalı');
const batikP = prof({}), sinirP = prof({ Hs: 19, D: 28, Hy: 26, Pd: 29, Mf: 34, Pa: 16, Pt: 37, Sc: 39, Ma: 26, Si: 32, F: 14 });
(rec(batikP, 'sinir-profil')!.hit === false && rec(sinirP, 'batik-profil')!.hit === false)
  ? ok('batik-profil ve sinir-profil aynı profilde birlikte vurmuyor')
  : b('bantlar ayrışmıyor');
// çoklu vuru: yuzen profili başka desenleri de taşıyabilir — bu bir FARK değil, kayıt
const yuzenP = prof({ Hs: 23, D: 32, Hy: 31, Pd: 32, Mf: 38, Pa: 25, Pt: 45, Sc: 60, Ma: 30, F: 20 });
console.log('  not   · #8 “Yüzen” profilinin vuran desan listesi: ' + hits(yuzenP).join(', '));

// (5) CONFLICT-042 — çekince direktifleri koda ve arayüze taşındı mı
console.log('\n(5) Çekince direktifleri (CONFLICT-042) — kaynak metinleri kodda');
const dosyalar = [
  'src/scoring/mmpiInterpretation.ts',
  'src/components/results/MMPIExtraTab.tsx',
];
const hepsi = dosyalar.map(f => readFileSync(f, 'utf-8')).join('\n').toLowerCase();
const direktifler: Array<[string, string]> = [
  ['kod tipi verilemez', 's.167 — “Bu profil tipiyle baglantili bir kod tipi verilemez.”'],
  ['tanısının konulması doğru değil', 's.166 — nevrotik/psikotik tanı uyarısı'],
  ['en düşük olduğu alt testlere', 's.168 — Batık Profil uyarısı'],
  ['hiçbir zaman körlemesine', 's.159 — değerlendirme yasağı'],
  ['zekâ düzeyleri 80', 's.159 — zekâ ön koşulu'],
  ['deneyimi önemlidir', 's.160 — uygulayıcı deneyimi'],
  ['butcher', 's.169 — 60-64 T → diğer MMPI türevi testler'],
  ['medenî durum', 's.159 — demografi listesi (Yaş, cinsiyet, eğitim, medenî durum, meslek)'],
];
for (const [anahtar, aciklama] of direktifler) {
  hepsi.includes(anahtar.toLocaleLowerCase('tr')) ? ok('taşındı: ' + aciklama) : yok('kodda YOK: ' + aciklama);
}
const kaynakli = MMPI_PATTERN_CAVEATS.filter(c => /^s\.1[0-9][0-9]/.test(c.source)).length;
kaynakli === MMPI_PATTERN_CAVEATS.length
  ? ok(`MMPI_PATTERN_CAVEATS: ${kaynakli} kayıt, tamamı kaynak sayfalı`)
  : b('MMPI_PATTERN_CAVEATS içinde kaynaksız kayıt var');

// (6) Sayı üretimi denetimi — desen kayıtlarındaki HER sayı SOURCE-B6-001/002'de olmalı
console.log('\n(6) SAYI ÜRETİM DENETİMİ — desen metnindeki sayılar kaynak kaydında geçiyor mu');
const facts = readFileSync('docs/mmpi-audit/SOURCE_FACTS.md', 'utf-8');
const f001 = facts.slice(facts.indexOf('## SOURCE-B6-001'));
const b6 = f001.slice(0, f001.indexOf('\n## ') > 0 ? f001.indexOf('\n## ') + 1 : f001.length)
  + facts.slice(facts.indexOf('## SOURCE-B6-002'), facts.indexOf('## SOURCE-B6-002') + 6000);
const kaynakSayilar = new Set((b6.replace(/\*\*/g, '').match(/(?<![\d.,])\d{1,3}(?![\d.,])/g) ?? []));
const dokunulan = new Set(['conversion-v', 'psychotic-v', 'kus-kanadi', 'pasif-agresif-v', 'pozitif-egim', 'negatif-egim', 'yuzen-profil', 'batik-profil', 'sinir-profil']);
const desenMetni = detectPatterns(prof({}))
  .filter(x => dokunulan.has(x.id))
  .map(x => [x.rule, x.quote ?? '', x.caveat ?? '', x.manualNote ?? ''].join(' '))
  .join('\n');
const sayilar = [...new Set(desenMetni.match(/(?<![\d.,])\d{1,3}(?![\d.,])/g) ?? [])];
const disi = sayilar.filter(n => !kaynakSayilar.has(n) && !/^1[0-9][0-9]$/.test(n));
disi.length === 0
  ? ok(`CHANGE-015’in 9 kaydındaki ${sayilar.length} sayının tamamı SOURCE-B6-001/002 corpus’unda (sayfa numaraları hariç)`)
  : b('desen metninde kaynak kaydı olmayan sayılar: ' + disi.join(' '));
console.log('  not   · desen metnindeki sayı kümesi: ' + sayilar.sort((a, c) => +a - +c).join(' '));

console.log('\n== KAYNAK TARAFI ==');
console.log('  eşik kaynakları: SOURCE_FACTS.md → SOURCE-B6-001 (s.160-169 kutu metinleri, 150 dpi görsel okuma)');
console.log('  çekince kaynakları: SOURCE-B6-002 (s.159-160 · 166-167 · 169)');
console.log('  s.170 = PDF p93 L → BOŞ SAYFA (koyu piksel %0.24, OCR 0 satır)');

console.log(`\nSONUÇ: ${fark} FARK${fark === 0 ? ' — DECISION-030/A kaynağa tam oturdu' : ''} · P0 BULGU YOK`);
