import { SCORING_KEYS } from '../../src/scoring/mmpiKeys';
const pd = SCORING_KEYS.Pd as unknown as { trueItems: number[]; falseItems: number[] };
// Kaynak Tablo 11 (s.108) — 400 dpi GÖRSEL okuma
const kaynakDogru = [16,21,24,32,33,35,38,42,61,67,84,94,
  102,106,110,118,127,215,216,224,239,244,245,284];
const kaynakYanlis = [8,20,37,82,91,96,107,134,137,141,155,170,
  171,173,180,183,201,231,235,237,248,267,287,289,294,296];
console.log(`KAYNAK: Dogru ${kaynakDogru.length} + Yanlis ${kaynakYanlis.length} = ${kaynakDogru.length+kaynakYanlis.length}  (kitap basligi: 50)`);
console.log(`KOD   : Dogru ${pd.trueItems.length} + Yanlis ${pd.falseItems.length} = ${pd.trueItems.length+pd.falseItems.length}`);
function cmp(ad: string, kaynak: number[], kod: number[]) {
  const K = new Set(kaynak), C = new Set(kod);
  const fazla = kod.filter(x => !K.has(x));
  const eksik = kaynak.filter(x => !C.has(x));
  console.log(`\n${ad}: kodda FAZLA [${fazla.join(', ')}] | kodda EKSIK [${eksik.join(', ')}]`);
  console.log(`  -> ${fazla.length === 0 && eksik.length === 0 ? 'BIREBIR MATCH ✅' : 'FARK VAR ❌'}`);
}
cmp('Dogru', kaynakDogru, pd.trueItems);
cmp('Yanlis', kaynakYanlis, pd.falseItems);
