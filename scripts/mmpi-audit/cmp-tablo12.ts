import { SCORING_KEYS, isGendered } from '../../src/scoring/mmpiKeys';

/**
 * Tablo 12 (s.122) — Mf (5) anahtarının kaynakla karşılaştırması.
 * 450 dpi GÖRSEL okuma (satır satır kadraj doğrulaması).
 *
 * Mf CİNSİYETE ÖZEL bir anahtardır (`{ male, female }`): kitap Tablo 12'de tek
 * bir liste basar ve (*) işaretli 5 maddenin (69, 179, 231, 297, 133)
 * kadınlarda TERS yönde puan aldığını dipnotta belirtir. Bu yüzden erkek
 * anahtarı Tablo 12 ile birebir, kadın anahtarı ise bu 5 maddede yönü çevrilmiş
 * hâliyle doğrulanır.
 *
 * Not: bu araç bir denetim betiğidir; regresyon kilidi `tests/mmpiKeyIntegrity`
 * içindeki "Mf cinsiyete özel anahtar çiftidir…" testidir.
 */

const kaynakDogru = [4, 25, 69, 70, 74, 77, 78, 87, 92, 126, 132,
  134, 140, 149, 179, 187, 203, 204, 217, 226, 231, 239,
  261, 278, 282, 295, 297, 299];
const kaynakYanlis = [1, 19, 26, 28, 79, 80, 81, 89, 99, 112, 115,
  116, 117, 120, 133, 144, 176, 198, 213, 214, 219, 221,
  223, 229, 249, 254, 260, 262, 264, 280, 283, 300];

/** (*) işaretli maddeler — kaynak dipnotu: kadınlarda ters yön. */
const YILDIZ = [69, 179, 231, 297, 133];

console.log(
  `KAYNAK (Tablo 12): Dogru ${kaynakDogru.length} + Yanlis ${kaynakYanlis.length} = ` +
    `${kaynakDogru.length + kaynakYanlis.length}  (kitap basligi: Madde Sayisi 60)`,
);

const rule = SCORING_KEYS.Mf;
if (!isGendered(rule)) {
  console.error('HATA: SCORING_KEYS.Mf cinsiyete özel bir anahtar değil — yapı değişmiş.');
  process.exit(1);
}
const { male, female } = rule;

function cmp(ad: string, kaynak: number[], kod: number[]): boolean {
  const K = new Set(kaynak);
  const C = new Set(kod);
  const fazla = kod.filter(x => !K.has(x)).sort((a, b) => a - b);
  const eksik = kaynak.filter(x => !C.has(x)).sort((a, b) => a - b);
  console.log(`\n${ad}: kodda FAZLA [${fazla.join(', ')}] | kodda EKSIK [${eksik.join(', ')}]`);
  const ok = fazla.length === 0 && eksik.length === 0;
  console.log(`  -> ${ok ? 'BIREBIR MATCH ✅' : 'FARK VAR ❌'}`);
  return ok;
}

/** Kaynak listesini kadınlar için (*) maddelerinde çevirir. */
function tersine(liste: number[], from: number[], to: number[]): number[] {
  const flipped = new Set(YILDIZ.filter(x => from.includes(x)));
  const kept = liste.filter(x => !flipped.has(x));
  return [...kept, ...YILDIZ.filter(x => to.includes(x))].sort((a, b) => a - b);
}

const beklenenKadinDogru = tersine(kaynakDogru, kaynakDogru, kaynakYanlis);
const beklenenKadinYanlis = tersine(kaynakYanlis, kaynakYanlis, kaynakDogru);

let ok = true;
console.log(`\n--- ERKEK ANAHTARI (Tablo 12 birebir) ---`);
console.log(`KOD (erkek): Dogru ${male.trueItems.length} + Yanlis ${male.falseItems.length} = ${male.trueItems.length + male.falseItems.length}`);
ok = cmp('Erkek Dogru', kaynakDogru, male.trueItems) && ok;
ok = cmp('Erkek Yanlis', kaynakYanlis, male.falseItems) && ok;

console.log(`\n--- KADIN ANAHTARI ((*) maddeleri ters yönde) ---`);
console.log(`KOD (kadin): Dogru ${female.trueItems.length} + Yanlis ${female.falseItems.length} = ${female.trueItems.length + female.falseItems.length}`);
console.log(`BEKLENEN  : Dogru ${beklenenKadinDogru.length} + Yanlis ${beklenenKadinYanlis.length}`);
ok = cmp('Kadin Dogru', beklenenKadinDogru, female.trueItems) && ok;
ok = cmp('Kadin Yanlis', beklenenKadinYanlis, female.falseItems) && ok;

console.log('\n--- (*) yildizli maddeler (kaynak dipnotu: kadinlarda ters yon) ---');
console.log('Kaynak (*):', YILDIZ.join(', '), `(${YILDIZ.length} madde)`);
for (const y of YILDIZ) {
  const erkekYon = male.trueItems.includes(y) ? 'DOGRU' : male.falseItems.includes(y) ? 'YANLIS' : 'YOK';
  const kadinYon = female.trueItems.includes(y) ? 'DOGRU' : female.falseItems.includes(y) ? 'YANLIS' : 'YOK';
  const ters = erkekYon !== kadinYon && erkekYon !== 'YOK' && kadinYon !== 'YOK';
  console.log(`  ${y}: erkek ${erkekYon} -> kadin ${kadinYon}  ${ters ? '(TERS ✅)' : '(TERS DEGIL ❌)'}`);
  if (!ters) ok = false;
}

const erkekToplam = male.trueItems.length + male.falseItems.length;
const kadinToplam = female.trueItems.length + female.falseItems.length;
console.log(`\nMadde kumesi ayni mi: ${erkekToplam === 60 && kadinToplam === 60 ? 'EVET (60/60) ✅' : 'HAYIR ❌'}`);
if (erkekToplam !== 60 || kadinToplam !== 60) ok = false;

console.log(`\nSONUC: ${ok ? '0 FARK · Tablo 12 (Mf) BIREBIR MATCH ✅' : 'FARK VAR ❌'}`);
process.exit(ok ? 0 : 1);
