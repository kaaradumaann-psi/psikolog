/**
 * BATCH 20 KANIT ARACI — kitap s.151-156 (PDF p83 R - p86 L)
 *
 *  (1) P0  : Tablo 17 (Si anahtari, s.156)  -> SCORING_KEYS.Si  (34 Dogru + 36 Yanlis = 70)
 *            -> PHASE 5'in SON klinik anahtari
 *  (2) P0  : Tablo 17 norm dipnotu (s.156) + "(K Eklemeli)" YOK -> Tablo 30 kiyasi
 *  (3) P1  : Ma T bantlari (s.151-152) metin kapsam + kaynaktaki "60- 75 T" sapmasi
 *  (4) P1  : Ma kod blogu (s.152-153) - K kodlari, 91/19, 90/09 + "Eyleme vuruk" notu
 *
 * KURALLAR (OCR_ISSUES.md):
 *  - TABLO-NUMBERS : Tablo 17 numaralari 500 dpi kadrajdan elle okundu, buraya gomuldu.
 *                    200 dpi OCR yalniz KADRAJ SINIRLARI icin kullanildi (asagida sayilir).
 *  - cmp-*.ts coverage kontrolleri toLowerCase() ile yapilir.
 *  - BAND-HEAD-DROP: bant/kod basliklari OCR'dan SAYILMADI, gorselden sayildi.
 *
 * Calistir: npx tsx scripts/mmpi-audit/cmp-ma-si-batch20.ts
 */
import { SCORING_KEYS, K_CORRECTION, TURKISH_NORMS } from '../../src/scoring/mmpiKeys.ts';
import { MA_T_BANDS } from '../../src/scoring/mmpiSource.ts';
import { KNOWN_CODES, codeInterpretation, type CodeInterpretation } from '../../src/scoring/mmpiSourceCodes.ts';

const norm = (t: string) =>
  t.toLowerCase().replace(/\s+/g, ' ').replace(/[,;:.!?]/g, '').trim();
const has = (code: string, frag: string) => norm(code).includes(norm(frag));

let fail = 0;
const ok = (c: boolean, label: string, extra = '') => {
  console.log(`${c ? '  OK   ' : '  FARK '} ${label}${extra ? ' :: ' + extra : ''}`);
  if (!c) fail++;
};

/* ------------------------------------------------------------------ */
/* (1) P0 — Tablo 17 (s.156): kitap 500 dpi iki bindirmeli kadrajdan  */
/* ------------------------------------------------------------------ */
const T17_DOGRU = [32, 67, 82, 111, 117, 124, 138, 147, 171, 172, 180, 201, 236, 267, 278, 292, 304, 316, 321, 332, 336, 342, 357, 377, 383, 398, 411, 427, 436, 455, 473, 487, 549, 564];
const T17_YANLIS = [25, 33, 57, 91, 99, 119, 126, 143, 193, 208, 229, 231, 254, 262, 281, 296, 309, 353, 359, 371, 391, 400, 415, 440, 446, 449, 450, 451, 462, 469, 479, 481, 482, 505, 521, 547];

console.log('(1) P0 — TABLO 17 (Si anahtari, s.156) — "Madde Sayisi: 70"');
const si = SCORING_KEYS.Si as { trueItems: number[]; falseItems: number[] };
ok(T17_DOGRU.length === 34 && T17_YANLIS.length === 36, 'Tablo 17 basligi: Madde Sayisi 70', `34 + 36 = ${T17_DOGRU.length + T17_YANLIS.length}`);
ok(
  JSON.stringify([...T17_DOGRU].sort((a, b) => a - b)) === JSON.stringify([...si.trueItems].sort((a, b) => a - b)),
  'Dogru listesi BIREBIR',
  `${si.trueItems.length} madde`,
);
ok(
  JSON.stringify([...T17_YANLIS].sort((a, b) => a - b)) === JSON.stringify([...si.falseItems].sort((a, b) => a - b)),
  'Yanlis listesi BIREBIR',
  `${si.falseItems.length} madde`,
);
const t17union = new Set([...si.trueItems, ...si.falseItems]);
ok(t17union.size === 70, '70 benzersiz madde numarasi (1-566 icinde)', String(t17union.size));
ok(
  [...t17union].every((n) => n >= 1 && n <= 566),
  'tum numaralar 1-566 araliginda',
);
// kadraj siniri kontrolu: 124/304/427 ve 119/309/451 sutunu yirtik cizgi ustunde
ok([124, 304, 427, 119, 309, 451].every((n) => t17union.has(n)), 'yirtik hattindaki 6 numara kadrajda dogrulandi');

/* ------------------------------------------------------------------ */
/* (2) P0 — norm dipnotu (s.156) + "(K Eklemeli)" YOK                 */
/* ------------------------------------------------------------------ */
console.log('\n(2) P0 — Tablo 17 norm dipnotu ve K eklemesi');
ok(TURKISH_NORMS.Kadın.Si.mean === 29.88, 'Kadın X = 29.88 — MATCH', String(TURKISH_Kadin()));
function TURKISH_Kadin() {
  return TURKISH_NORMS.Kadın.Si.mean;
}
// Erkek: Tablo 17 dipnotu 26.86, Tablo 30 (s.195, 250 dpi gorselden yeniden okundu) 23.86
ok(TURKISH_NORMS.Erkek.Si.mean === 23.86, 'Erkek X = 23.86 — kod TABLO 30 u izler', 'Tablo 17 dipnotu 26.86 → KAYNAK İÇİ ÇELİŞKİ (CONFLICT-037 emsali)');
ok(TURKISH_NORMS.Erkek.Si.sd === 7.97 && TURKISH_NORMS.Kadın.Si.sd === 7.52, 'SD 7.97 / 7.52 — Tablo 30 MATCH');
ok(!('Si' in K_CORRECTION), 'Tablo 17 de "(K Eklemeli)" YOK → K_CORRECTION.Si de YOK');

/* ------------------------------------------------------------------ */
/* (3) P1 — Ma T bantlari (s.151-152)                                 */
/* ------------------------------------------------------------------ */
console.log('\n(3) P1 — MA_T_BANDS vs s.151-152');
const band = (label: string) => MA_T_BANDS.find((b) => b.rangeLabel === label)?.text ?? '';
ok(MA_T_BANDS.length === 5, 'bant sayisi 5 (kaynak: 85 / 70-84 / 60-69 / 45-59 / 21-44)', MA_T_BANDS.map((b) => b.rangeLabel).join(' · '));
const bandFrags: [string, string, string[]][] = [
  ['T ≥ 85', '85 T puanı ve üstü', ['Ajitasyon ya da manik dönem olabilir', 'Birey hiperaktif', 'fikir uçuşmaları vardır', 'Kendilik değer']],
  ['T 70-84', '70-84 T puanı', ['Enerjik, konuşkan, eylemi düşünceye tercih', 'projelerini tamamlayamazlar', 'öfkelerini kontrol edemezler', 'büyüklük sanrıları ve hiperaktivite gibi', 'Ergenlerde bu yükselme', 'suça eğilim']],
  ['T 60-69', '60-75 + 60-69 (iki paragraf)', ['enerjik, dışadönük ve aktif bireyleri gösterir', 'lise mezunu öğrencilerde çok sıktır', 'onay ve statü kazanmak için çaba harcarlar', 'Hoş, enerjik, meraklı, sosyal, kolay ilişki kuran', 'İyimserlik, bağımsızlık ve kendine güven']],
  ['T 45-59', '45-59 T puanı', ['Normal aralık', 'maniye, giderek hipomaniye işaret eder', 'daha çok ortalarda puan alan hastaların teşhisinde']],
  ['T 21-44', '21-44 T puanı', ['Düşük enerji düzeyi', 'apatiyi gösterir', 'genellikle amaçları yoktur', 'Özellikle 2 alt testinin yükselmediği durumlarda depresyon düşünülmelidir', '45 yaşın altında düşük']],
];
for (const [label, srcLabel, frags] of bandFrags) {
  const text = band(label);
  const missing = frags.filter((f) => !has(text, f));
  ok(missing.length === 0, `${label} — ${srcLabel} (${frags.length - missing.length}/${frags.length})`, missing.join(' | '));
}
// Kaynak sapmasi: "60- 75 T puanı" başlığı kitabin kendi hatası; kod 60-69 bandina birlestirdi
ok(!MA_T_BANDS.some((b) => b.min === 60 && b.max === 75), 'kodda "60-75" bandi yok (kaynaktaki 70-84 ile çakisan etiket) → içerik 60-69 a taşındı, metin korundu');
// s.152 "ilişki" paragrafi
const rel = ['Yalnızca alt test 9 u kullanarak bir yoruma gitmek güçtür', 'Diğer klinik alt testlerdeki yükselmelerle bu enerji artışının nedeni araştırılmalıdır', 'Hipomani alt testiyle birlikte alt test 4 ü yükselen bir hastanın yorumu, alt test 8 ile 9 u birlikte yükseltmiş hastadan farklıdır', 'beyin hasarı olan bir hasta, hiperaktivite ve tepkisel davranışlar gösterebilir', 'duygusal tepkiler depresyon şeklinde ortaya çıkabilir'];
const allBandText = MA_T_BANDS.map((b) => b.text).join(' ');
const relMissing = rel.filter((f) => !has(allBandText, f));
ok(relMissing.length === 0, `s.152 "Ma alt testinin diğer alt testlerle ilişkisi" paragrafı (${rel.length - relMissing.length}/${rel.length})`, relMissing.length ? `YOK: ${relMissing.length} cümle → CONFLICT-026` : '');

/* ------------------------------------------------------------------ */
/* (4) P1 — Ma kod blogu (s.152-153)                                  */
/* ------------------------------------------------------------------ */
console.log('\n(4) P1 — Ma kod bloğu (s.152-153)');
// 91/19 — kitabin Ma blogundaki govde, kodun '19' kaydi Hs blogunun 19/91 govdesi
const rec = (c: string): CodeInterpretation => codeInterpretation(c)!;
const c19 = rec('91'); // kanonik: '19' -> 19/91 kaydi
const ma9119 = ['Ender görülmektedir', 'Hastalar hipomanik durumdadırlar, ancak gergindirler', 'İhtiraslıdırlar', 'Başarısızlıkla engellenmişlerdir', 'Hipokondriak sorunlarıyla karşılaştıkları durumsal güçlükler arasındaki ilişkiyi ispatlamak kolaydır'];
const m9119 = ma9119.filter((f) => !has(c19.text, f));
ok(m9119.length === 0, `91/19 gövdesi (s.153) — ${5 - m9119.length}/5 bulundu${m9119.length ? ' (kalan YOK)' : ''}`, m9119.length ? `kodun '19' kaydı s.77'deki 19/91 (Hs bloğu) metnini taşıyor → CONFLICT-031 kanıtı` : '');
ok(c19.code === '19/91', "'19' kaydının etiketi (kanonikleştirme) — 91/19 ve 19/91 AYNI kayda düşüyor", `code=${c19.code}`);
// 90/09
const c09 = rec('90'); // kanonik: '09' -> 90/09 kaydi
const ma9009 = ['Kod oldukça nadirdir, özellikle erkeklerde çok az görülür', 'enerjik ve olasılıkla ajitedirler', 'Genellikle yalnız kişilerdir', 'Si alt testinin yükselmesi bırakılarak yorum', 'Daha sonra eğer gerekliyse Si alt testi yorumlanmalıdır'];
const m9009 = ma9009.filter((f) => !has(c09.text, f));
ok(m9009.length === 0, `90/09 gövdesi (s.153) — ${5 - m9009.length}/5 bulundu`, m9009.join(' | '));
// 49/94 notu + K kodlari + "Bakınız" listesi
const allCodes = KNOWN_CODES.map((k) => { const c = codeInterpretation(k)!; return c.text + ' ' + (c.seeAlso ?? ''); }).join(' ');
ok(has(allCodes, 'Eyleme vuruk davranış ile ilgilidir'), 's.153 "Eyleme vuruk davranış ile ilgilidir" (94/49 notu)');
ok(has(allCodes, 'Narsisistik kişilerdir. Kadınlar, eksibisyonist bir biçimde'), 's.153 "Yüksek 9/Düşük K Kodu" gövdesi');
ok(has(allCodes, 'Eğer 9 ve K alt testlerinde puanlar 70 T puanında'), 's.152 "Yüksek 9/Yüksek K Kodu" (70 T + T:50 koşulu)');
ok(has(allCodes, 'K alt testi 70 T puanının üzerine çıkarsa'), 's.152 "K alt testi 70 T puanının üzerine çıkarsa"');
ok(has(allCodes, '5 alt testinde T:40'), 's.152 "(eğer 5 alt testinde T:40 ın altında ise)"');

console.log(`\nSONUÇ: ${fail === 0 ? 'TÜM KONTROLLER GEÇTİ' : fail + ' FARK (yukarıda listelendi — yorum katmanı, kayıt; kod değişikliği DECISION bekler)'}`);
