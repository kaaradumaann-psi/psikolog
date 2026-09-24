/**
 * PHASE 10 batch 24 — CHANGE-016 KAPANIŞ KANITI (desen kartlarında kalan kaynak atıfları)
 *
 * DECISION-030/A’nın 5. maddesi (“profil kartlarına `source` bilgisi”) BÖLÜM 6 kartlarını
 * kapsamıştı (cmp-b6-batch23.ts → 0 FARK). Bu betik aynı ilkeyi BÖLÜM 5 kod gövdelerine
 * dayanan dört desene (cry-for-help, depressive-27, 49, 89) uygular:
 *   · `source` sayfa atfı denetim kaydındaki sayfayla aynı olmalı,
 *   · `quote` **yalnız** SOURCE_FACTS’taki birebir alıntı bloklarından gelmeli,
 *   · kartların sayıları kaynak corpus’unda yoksa “kod tarafındadır” notu zorunlu
 *     (kural: kaynakta olmayan hiçbir sayı üretilmez → sayı, notla korunur).
 * Salt-okunur; hiçbir dosyayı değiştirmez.
 *
 *   npx tsx scripts/mmpi-audit/cmp-b6-batch24.ts
 */
import { readFileSync } from 'node:fs';
import { buildProfileFromRawScoresObject } from '../../src/scoring/mmpiScoring';
import { MMPI_PATTERN_CAVEATS, detectPatterns } from '../../src/scoring/mmpiInterpretation';
import { resolveCodeInterpretation } from '../../src/scoring/mmpiSourceCodes';
import type { RawScores } from '../../src/workspace/caseTypes';

const base: RawScores = {
  blank: 0, L: 5, F: 6, K: 12, Hs: 13, D: 21, Hy: 19, Pd: 22, Mf: 29, Pa: 11, Pt: 28, Sc: 30, Ma: 20, Si: 24,
};
const prof = (over: Partial<RawScores>, gender: 'Erkek' | 'Kadın' = 'Erkek') =>
  buildProfileFromRawScoresObject({ ...base, K: 0, ...over } as RawScores, gender);
const rec = (id: string, p = prof({})) => detectPatterns(p).find(x => x.id === id);

let fark = 0;
const ok = (m: string) => console.log('  ok    · ' + m);
const b = (m: string) => { fark++; console.log('  BULGU · FARK ' + m); };

console.log('== CHANGE-016 — kalan desen kartlarının kaynak atfı mutabakatı ==\n');

// --- Denetim kaynağı: SOURCE_FACTS bölümleri (yalnız `>` alıntı satırları = kaynak corpus’u)
const sfRaw = readFileSync('docs/mmpi-audit/SOURCE_FACTS.md', 'utf8');
const clean = (t: string) => t.replace(/\*\*/g, '').replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();
const section = (head: string) => {
  const i = sfRaw.indexOf(head);
  if (i < 0) return undefined;
  const j = sfRaw.indexOf('\n## ', i + head.length);
  const k = sfRaw.indexOf('\n### ', i + head.length);
  const end = Math.min(...[j, k, sfRaw.length].filter(x => x > i));
  return sfRaw.slice(i, end);
};
// Bölümün **biçimsel** alıntı satırları: `>` blokları, numaralı liste maddeleri ve
// tablo satırları + başlık satırı (sayfa/kod numarası orada geçiyor). Yorum satırları
// (“Kod: …”, “Status: …”) bilinçli olarak corpus DIŞINDA — yoksa kendi yorumumuz
// sayı denetimini geçersiz kılardı.
const quoted = (head: string) => {
  const sec = section(head) ?? '';
  const lines = sec.split('\n');
  const keep = lines
    .filter(l => /^>\s/.test(l) || /^\d+\.\s/.test(l) || /^\|/.test(l))
    // blok alıntısı işaretini (“> ”) ve madde işaretlerini ayıkla; satır sarmaları tek
    // satıra birleştirilmezse birebir karşılaştırma yapılamaz
    .map(l => l.replace(/^>+\s?/, '').replace(/^\s*[-*]\s+/, ''));
  return clean([lines[0] ?? '', keep.join(' ')].join(' '));
};

const kartlar = [
  { id: 'cry-for-help', src: 's.36 · F yükselme nedenleri (4. madde)', kayit: 'SOURCE-VALIDITY-F-006', sayfa: 's.36', code: undefined as string | undefined, quoteZorunlu: true },
  { id: 'depressive-27', src: 's.87 · 27/72 + s.89 · 278/728 (CODE)', kayit: 'SOURCE-CODE-015', sayfa: 's.89', code: '27/72', quoteZorunlu: true },
  { id: '49', src: 's.118-119 · 49/94 Kodu (CODE)', kayit: 'SOURCE-CODE-PD-014', sayfa: 's.118', code: '49', quoteZorunlu: true },
  { id: '89', src: 's.147-148 · 89/98 Kodu (CODE)', kayit: 'SOURCE-SC-006', sayfa: 's.147', code: '89', quoteZorunlu: false },
];

// (1) Kapsam defteri: 18 kartın kaçı kaynaklı, hangileri bilerek kaynaksız
console.log('(1) KAPSAM — detectPatterns() 18 kayıt · source atfı');
const tum = detectPatterns(prof({}));
const kaynaksiz = tum.filter(x => !x.source).map(x => x.id);
const beklenenKaynaksiz = ['neurotic-triad', 'multi-high'];
JSON.stringify(kaynaksiz) === JSON.stringify(beklenenKaynaksiz)
  ? ok(`kaynaksız set bilinçli ve beklenenle aynı: ${kaynaksiz.join(', ')} (≥ 65 / ≥ 65 kod tarafı göstergeleri)`)
  : b(`kaynaksız set saptı: ${kaynaksiz.join(', ')} ≠ ${beklenenKaynaksiz.join(', ')}`);
for (const k of kartlar) {
  const r = rec(k.id)!;
  r.source === k.src ? ok(`${k.id} → source “${r.source}”`) : b(`${k.id} → source “${r.source}” beklenen “${k.src}”`);
}

// (2) Atıf ↔ denetim kaydı: sayfa, adı geçen SOURCE_* kaydında geçmeli
console.log('\n(2) SAYFA ATFI ↔ DENETİM KAYDI (SOURCE_FACTS bölümü)');
for (const k of kartlar) {
  const sec = section('## ' + k.kayit) ?? section(k.kayit) ?? '';
  if (!sec.length) { b(`${k.kayit} kaydı bulunamadı`); continue; }
  sec.includes(k.sayfa) || sec.includes(k.sayfa.replace('-119', ''))
    ? ok(`${k.id} → ${k.kayit} bölümünde ${k.sayfa} geçiyor (${sec.split('\n').length} satır)`)
    : b(`${k.id} → ${k.kayit} bölümünde ${k.sayfa} yok`);
}

// (3) Birebir alıntı denetimi: quote yalnız kaynak alıntı bloklarından gelmeli
console.log('\n(3) QUOTE — SOURCE_FACTS birebir alıntı satırlarıyla eşleşme');
for (const k of kartlar) {
  const r = rec(k.id)!;
  const corpus = [quoted('## ' + k.kayit) || quoted(k.kayit), k.code ? clean(resolveCodeInterpretation(k.code)?.text ?? '') : ''].join(' ');
  if (!r.quote) {
    k.quoteZorunlu ? b(`${k.id} → quote yok (bekleniyordu)`) : ok(`${k.id} → quote YOK (kaynak kaydı kısaltmalı “…”; birebir okuma ayrı tur) — bilerek taşınmadı`);
    continue;
  }
  const q = clean(r.quote);
  corpus.includes(q) ? ok(`${k.id} · quote (${q.length} kr) kaynak bloğunda birebir var`)
    : b(`${k.id} · quote kaynak bloğunda bulunamadı: ${q.slice(0, 60)}…`);
}
// 89 için kilit: uydurma alıntıya karşı
rec('89')!.quote === undefined ? ok('89 · alıntı uydurulmadı') : b('89 · quote var ama kaynak kaydı kısaltmalı');

// (4) Eşikler dokunulmadı (statik + davranışsal): sayı üretmeme kuralının kanıtı
console.log('\n(4) EŞİK KİLİDİ — bu turda hiçbir hit koşulu değişmedi');
const srcTxt = readFileSync('src/scoring/mmpiInterpretation.ts', 'utf8');
for (const [id, expr] of [
  ['cry-for-help', 'hit: F >= 70 && D > Pa && D > Sc && D > Ma && Pt > Pa && Pt > Sc && Pt > Ma'],
  ['depressive-27', 'hit: Pt >= 70 && D >= 60'],
  ['49', 'hit: Pd >= 70 && Ma >= 70'],
  ['89', 'hit: Sc >= 70 && Ma >= 70'],
] as const) {
  srcTxt.includes(expr) ? ok(`${id} · ${expr}`) : b(`${id} · hit ifadesi değişmiş: ${expr}`);
}
rec('cry-for-help', prof({ F: 17, K: 0, D: 31, Pt: 40, Pa: 5, Sc: 10, Ma: 5 }))!.hit === false
  ? ok('F 68,8 T → cry-for-help VURMUYOR (eşik 70 korundu; kaynak bant başlığı “80 ve üstü”)')
  : b('F 68,8 T vuruyor — eşik sessizce düşürülmüş');
rec('cry-for-help', prof({ F: 18, K: 0, D: 31, Pt: 40, Pa: 5, Sc: 10, Ma: 5 }))!.hit === true
  ? ok('F 71 T → vuruyor (mevcut davranış korundu)')
  : b('F 71 T vurmuyor — davranış bozuldu');

// (5) Sayı üretimi denetimi: rule/detail sayıları kaynak corpus’unda yoksa “kod tarafı” notu zorunlu
console.log('\n(5) SAYI ÜRETİMİ — kart sayıları kaynak corpus’unda ya da notlandırılmış');
const caveatCorpus = MMPI_PATTERN_CAVEATS.map(c => clean(c.text)).join(' ');
for (const k of kartlar) {
  const r = rec(k.id)!;
  const corpus = [quoted('## ' + k.kayit) || quoted(k.kayit), k.code ? clean(resolveCodeInterpretation(k.code)?.text ?? '') : '', caveatCorpus].join(' ');
  const nums = [...new Set((`${r.rule} ${r.detail}`).match(/\d+/g) ?? [])];
  const missing = nums.filter(n => !corpus.includes(n));
  if (!missing.length) { ok(`${k.id} · sayılar corpus’ta: ${nums.join(' ')}`); continue; }
  clean(r.manualNote ?? '').includes('kod tarafında')
    ? ok(`${k.id} · corpus’ta olmayan ${missing.join(' ')} → manualNote “eşik kod tarafındadır” diyor; sayı üretilmedi, taşındı`)
    : b(`${k.id} · corpus’ta olmayan sayı notsuz: ${missing.join(' ')} (kaynakta olmayan sayı üretilmez)`);
}

// (6) UI zinciri: kartta taşınan alanlar arayüzde de görünüyor (statik kontrol)
console.log('\n(6) UI zinciri — MMPIExtraTab bu alanların hepsini render ediyor');
const ui = readFileSync('src/components/results/MMPIExtraTab.tsx', 'utf8');
for (const [alan, desen] of [['source', /Kaynak:\s*\{|\{'Kaynak: '\}/], ['quote', /\.quote/], ['manualNote', /manualNote/], ['caveat', /caveat/]] as const) {
  desen.test(ui) ? ok(`UI · ${alan} render ediliyor`) : b(`UI · ${alan} render edilmiyor`);
}

console.log('\n== KAYNAK TARAFI ==');
console.log('  cry-for-help  : SOURCE_FACTS.md → SOURCE-VALIDITY-F-006 (kitap s.36 · 150 dpi tam sayfa + 225 dpi kadraj, bu turda açıldı)');
console.log('  depressive-27 : SOURCE-CODE-014/015 (s.87 · 27/72 + s.89 · 278/728, ⚠️ kritik koşul 300 dpi)');
console.log('  49            : SOURCE-CODE-PD-014 (s.118-119, 340 dpi `v_pd119_cond.png`)');
console.log('  89            : SOURCE-SC-006 (s.147-148 · Şekil 22 + 89/98, 300 dpi `b19_ma89_age.png`)');
console.log(`\nSONUÇ: ${fark} FARK${fark === 0 ? ' · CHANGE-016 kaynağa tam oturdu · P0 BULGU YOK' : ''}`);
process.exit(fark ? 1 : 0);
