/**
 * BATCH 21 KANIT ARACI — kitap s.157-158 (PDF p86 R – p87 L)
 *
 *  (1) P1 : Si T bantları (s.157) — 4 bandın ETİKETİ + metin kapsamı
 *           (kaynak: "70 T puanı ve üstü" · "60-69 T puanı" · "45-59 T puanı" · "25-44 T puanı")
 *           + 70+ bandının EKSİK KUYRUĞU ("Nevrotik üçlüde yükselme görülebilir")
 *  (2) P2 : "Si alt testinin diğer alt testlerle ilişkisi:" (s.157) — 9 Bakınız çifti
 *           `01/10` … `09/90` → hedef kayıtlar CODES'ta var mı (ref uyumu; gövde beklenmez)
 *  (3) P1 : `049 Kodu` (s.157) — gövde YOK mu + codeInterpretation('049') NEYE düşüyor
 *  (4) P1 : `027(8) Kodu` (s.157) — gövde YOK mu + codeInterpretation('027(8)') NEYE düşüyor
 *  (5) P2 : s.157 giriş paragrafı (s.156'dan süzülen Si yorumu) — kodda izi var mı
 *  (6) —  : s.158 = BOŞ SAYFA (sayfa eşleme teyidi; karşılaştırma yok)
 *
 * Bu turda P0 ANAHTAR YOK: Tablo 17 (Si) batch 20'de kilitlendi (34 + 36 = 70).
 *
 * KURALLAR (docs/mmpi-audit/OCR_ISSUES.md):
 *  - BAND-HEAD-DROP : bant/kod başlıkları OCR'dan SAYILMADI, 150 dpi görselden okundu.
 *  - TABLO-NUMBERS  : sayı listeleri görselden; OCR yalnız sayfa yapısı için.
 *  - ASCII-FOLD     : coverage kontrolü küçük harfe indirgenip noktalama atılarak yapılır
 *                     (kodda cümleler "; " ile birleştiği için büyük harfli arama sahte YOK üretir).
 *  - BLANK-PAGE     : 0-1 satır OCR = araç hatası değil, boş sayfa olabilir (s.158).
 *
 * Çalıştır: npx tsx scripts/mmpi-audit/cmp-si-batch21.ts
 */
import { SI_T_BANDS } from '../../src/scoring/mmpiSource.ts';
import {
  KNOWN_CODES,
  canonicalCode,
  codeInterpretation,
  type CodeInterpretation,
} from '../../src/scoring/mmpiSourceCodes.ts';

const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[,;:.!?«»“”‘’()]/g, '')
    .trim();
const has = (haystack: string, frag: string) => norm(haystack).includes(norm(frag));

let fail = 0;
const ok = (c: boolean, label: string, extra = '') => {
  console.log(`${c ? '  OK   ' : '  FARK '} ${label}${extra ? ' :: ' + extra : ''}`);
  if (!c) fail++;
};

/* ------------------------------------------------------------------ */
/* (1) P1 — Si T bantları (s.157)                                     */
/* ------------------------------------------------------------------ */
console.log('\n(1) P1 — Si T bantları (kitap s.157, PDF p86 R)');

// Kaynak metinler: 150 dpi tam sayfa görselinden KELİMESİ KELİMESINE okundu.
const SRC: Record<string, { label: string; text: string }> = {
  hi: {
    label: '70 T puanı ve üstü',
    text:
      'Sosyal açıdan beceriksiz olan kişilerdir. Sosyal ilişkilerde anksiyete yaşar ve ilişki kurmaktan ' +
      'kaçınırlar. Nevrotik üçlüde yükselme görülebilir. (Ayrıca bakınız, 2, 7 ve 8 alt testlerinin yükselmesi.)',
  },
  mid: {
    label: '60-69 T puanı',
    text:
      'Bu kendini ortaya koymak istemeyen, yakın aile çevresinde rahat olan bireylerin profilidir. ' +
      'Çekingen, utangaç kişilerdir.',
  },
  low: {
    label: '45-59 T puanı',
    text: 'Sosyal ilişki kurmada başarılı olan bireylere işaret etmektedir.',
  },
  verylow: {
    label: '25-44 T puanı',
    text:
      'İyimser, manipülatif, yüzeysel ve hatta biraz uçuk bireylerdir. Dürtü kontrol sorunları vardır. ' +
      'Diğerleri ile olmak isteyen, yalnız kalamayan bireyleri gösterir. Çoğu kolay ilişki kurar, arkadaş ' +
      'canlısı ve meraklıdırlar, sosyal açıdan kabul görme, onaylanma konusunda gereksinimleri çok fazla ' +
      'olan bireylerdir.',
  },
};

const bandOf = (n: number) => SI_T_BANDS.find((b) => b.min <= n && n <= b.max)!;
const byLabel = (frag: string) => SI_T_BANDS.find((b) => has(b.rangeLabel, frag))!;

// (1a) Bant sayımı ve eşikleri — BAND-HEAD-DROP kuralı gereği görselden sayıldı: 4 bant.
ok(SI_T_BANDS.length === 4, `bant sayısı 4 (kaynak: ${Object.keys(SRC).length} bant etiketi)`, SI_T_BANDS.map((b) => b.rangeLabel).join(' · '));
ok(bandOf(70) === byLabel('70') && bandOf(69) === byLabel('60-69'), 'eşikler: 70 üst bant, 69 orta bant', `70→${bandOf(70).rangeLabel} · 69→${bandOf(69).rangeLabel}`);
ok(bandOf(45) === byLabel('45-59') && bandOf(44) === byLabel('25-44'), 'eşikler: 45 normal, 44 düşük bant', `45→${bandOf(45).rangeLabel} · 44→${bandOf(44).rangeLabel}`);

// (1b) Bant METİNLERİ — kaynak cümleleri tek tek.
const cümleParça = (t: string) =>
  t
    .split('.')
    .map((x) => x.replace(/^[^(A-Za-zÇĞİÖŞÜçğıöşü]+/, '').trim())
    .filter((x) => x.length > 12);

for (const key of Object.keys(SRC)) {
  const band = byLabel(SRC[key].label.split(' ')[0]);
  const frags = cümleParça(SRC[key].text);
  const missing = frags.filter((f) => !has(band.text, f));
  ok(
    missing.length === 0,
    `bant "${SRC[key].label}" metni (${frags.length - missing.length}/${frags.length} kaynak cümlesi)`,
    missing.length ? `KODDA YOK → ${missing.join(' | ')}` : '',
  );
}

// (1c) 70+ bandının kuyruğu: nevrotik üçlü atfı — kasıtlı olarak ayrıca raporlanır.
const hiBand = byLabel('70');
const kuyruk = ['Nevrotik üçlüde yükselme görülebilir', 'Ayrıca bakınız 2, 7 ve 8 alt testlerinin yükselmesi'];
const kuyrukYok = kuyruk.filter((f) => !has(hiBand.text, f));
ok(kuyrukYok.length === 0, `70+ bandı kuyruğu (${kuyruk.length - kuyrukYok.length}/${kuyruk.length})`, kuyrukYok.length ? `YOK → CONFLICT-025 +1 · CONFLICT-033 (nevrotik üçlü kapsamı) · CONFLICT-034 +1` : '');

// (1d) Bilgilendirme: kod alt bandı 0'dan başlatıyor (kaynak etiketi 25-44).
console.log(`  BİLGİ  25-44 bandının alt sınırı: kod min=${SI_T_BANDS[3].min} (kaynak etiketi "25-44 T puanı") → uç değerlerde bandın korunduğu, alt aralığın genişletildiği not edilsin`);

/* ------------------------------------------------------------------ */
/* (2) P2 — s.157 "Si alt testinin diğer alt testlerle ilişkisi:"     */
/* ------------------------------------------------------------------ */
console.log('\n(2) P2 — 9 Bakınız çifti (s.157) — hedef kayıtlar CODES\'ta var mı');
const pairs = ['01/10', '02/20', '03/30', '04/40', '05/50', '06/60', '07/70', '08/80', '09/90'];
let refHit = 0;
for (const p of pairs) {
  const rec = codeInterpretation(p);
  const canon = canonicalCode(p.replace('/', ''));
  const expected = p.split('/').reverse().join('/'); // kitap "01/10 (Bakınız 10/01)" → kayıt etiketi 10/01
  if (rec) refHit++;
  ok(
    !!rec,
    `${p} → kanonik '${canon}' kaydı`,
    rec ? `code='${rec.code}'${rec.code === expected ? ' (etiket BİREBİR)' : ` (beklenen ${expected})`}` : 'KAYIT YOK',
  );
}
ok(refHit === 9, `Bakınız hedeflerinin tamamı mevcut (${refHit}/9) → çapraz ref UYUMLU`, '');

/* ------------------------------------------------------------------ */
/* (3) P1 — `049 Kodu` (s.157)                                        */
/* ------------------------------------------------------------------ */
console.log('\n(3) P1 — `049 Kodu` (s.157)');
const allCodeText = KNOWN_CODES.map((k) => {
  const c = codeInterpretation(k)!;
  return c.text + ' ' + (c.seeAlso ?? '') + ' ' + (c.diagnosis ?? []).join(' ');
}).join(' \u0001 ');
const body049 = ['Psikiyatrik olgularda eyleme vurukluğun bastırılması'];
const m049 = body049.filter((f) => !has(allCodeText, f));
ok(m049.length === 0, '049 gövdesi CODES\'ta ara', m049.length ? 'YOK → CONFLICT-024 kapsamına başlık olarak eklendi (1 YOK)' : '');
const wrong049 = codeInterpretation('049')!;
console.log('  BULGU  049 sorgusunun çözüldüğü kayıt (CONFLICT-030 somut vakası): ' + `codeInterpretation('049') → '${wrong049.code}' — 49 DEĞİL, 40/04 metni döndürülüyor`);
console.log(`        döndürülen metnin ilk cümlesi: "${wrong049.text.split('.')[0]}."`);

/* ------------------------------------------------------------------ */
/* (4) P1 — `027(8) Kodu` (s.157)                                     */
/* ------------------------------------------------------------------ */
console.log('\n(4) P1 — `027(8) Kodu` (s.157)');
const body027 = ['Bireyde güçlü ruminatif davranışlar görülebilir'];
const m027 = body027.filter((f) => !has(allCodeText, f));
ok(m027.length === 0, '027(8) gövdesi CODES\'ta ara', m027.length ? 'YOK → CONFLICT-024 kapsamına başlık olarak eklendi (2. YOK)' : '');
const wrong027 = codeInterpretation('027(8)')!;
console.log('  BULGU  027(8) sorgusunun çözüldüğü kayıt (CONFLICT-030 somut vakası): ' + `codeInterpretation('027(8)') → '${wrong027.code}' — 027 DEĞİL, 20/02 metni döndürülüyor`);
console.log(`        döndürülen metnin ilk cümlesi: "${wrong027.text.split('.')[0]}."`);
// Kaynağın 027(8) notunun 27/72 kaydına taşınıp taşınmadığı (en olası "yakın" kayıt).
const rec27 = codeInterpretation('27')!;
ok(has(rec27.text, 'ruminatif'), `'27' kaydının (27/72) metninde "ruminatif" vurgusu var mı`, has(rec27.text, 'ruminatif') ? 'var — ama kaynak cümlesi ("güçlü ruminatif davranışlar") değil' : 'YOK');

/* ------------------------------------------------------------------ */
/* (5) P2 — s.157 giriş paragrafı (s.156'dan süzülen Si yorumu)       */
/* ------------------------------------------------------------------ */
console.log('\n(5) P2 — s.157 giriş paragrafı (Si yorum katmanı)');
const giri = [
  'Alt test Si\'de 20 puanlık bir farklılık olan çiftlerin, sosyal ilişkiler açısından evlilik çatışmalarına düşmeleri olasıdır',
  'Alt test Si\'deki yükselmeye, alt test 4 ve 9\'daki yükselmeler de eşlik ediyorsa, eyleme vurukluğun bastırıldığı düşünülmelidir',
  'Alt test 2 ya da 7 özellikle alt test 8\'in eşlik ettiği durumlarda, ruminatif davranışların kuvvetlendiği görülür',
];
const bandTextAll = SI_T_BANDS.map((b) => b.text).join(' ');
const giriYok = giri.filter((f) => !has(bandTextAll, f) && !has(allCodeText, f));
ok(giriYok.length === 0, `giriş paragrafı (${giri.length - giriYok.length}/${giri.length})`, giriYok.length ? `KODDA YOK → CONFLICT-025 +${giriYok.length} (eşik/koşul cümleleri) · CONFLICT-027 +2` : '');

/* ------------------------------------------------------------------ */
/* (6) s.158 = boş sayfa                                              */
/* ------------------------------------------------------------------ */
console.log('\n(6) — s.158 (PDF p87 L): BOŞ SAYFA — OCR 1 satır ("la <LOWCONF>"), koyu piksel %0.62');
console.log('        (kıyas: s.157 p086_R %4.36 · s.159 p087_R %5.45 → BLANK-PAGE kuralının 2. ölçümü)');
console.log("        → Bölüm 5 FİİLEN s.157'de biter; s.159 (p87 R) = BÖLÜM 6 girişi (OCR: \"BOLUM 6 / … ENVANTERINI YORUMLAMA YAKLASIMI\", 25 satır).");

console.log(`\nSONUÇ: ${fail === 0 ? 'TÜM KONTROLLER GEÇTİ' : fail + ' FARK (yukarıda listelendi — yorum katmanı kaydı; kod değişikliği DECISION bekler)'}`);
