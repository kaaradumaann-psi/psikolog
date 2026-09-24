import { SCORING_KEYS } from '../../src/scoring/mmpiKeys';
const hy = SCORING_KEYS.Hy as unknown as { trueItems: number[]; falseItems: number[] };
// Kaynak Tablo 10 (s.94) — 400 dpi GÖRSEL okuma (OCR satır kaydırması düzeltildi)
const kaynakDogru = [10,23,32,43,44,47,76,114,179,186,189,238,253];
const kaynakYanlis = [2,3,6,7,8,9,12,26,30,51,55,71,89,93,103,107,109,124,128,129,
  136,137,141,147,153,160,162,163,170,172,174,175,180,188,190,192,201,213,230,
  234,243,265,267,274,279,289,292];
console.log(`KAYNAK: Dogru ${kaynakDogru.length} + Yanlis ${kaynakYanlis.length} = ${kaynakDogru.length+kaynakYanlis.length}  (kitap basligi: 60)`);
console.log(`KOD   : Dogru ${hy.trueItems.length} + Yanlis ${hy.falseItems.length} = ${hy.trueItems.length+hy.falseItems.length}`);
function cmp(ad: string, kaynak: number[], kod: number[]) {
  const K = new Set(kaynak), C = new Set(kod);
  const fazla = kod.filter(x => !K.has(x));
  const eksik = kaynak.filter(x => !C.has(x));
  console.log(`\n${ad}: kodda FAZLA [${fazla.join(', ')}] | kodda EKSIK [${eksik.join(', ')}]`);
  console.log(`  -> ${fazla.length === 0 && eksik.length === 0 ? 'BIREBIR MATCH ✅' : 'FARK VAR ❌'}`);
}
cmp('Dogru', kaynakDogru, hy.trueItems);
cmp('Yanlis', kaynakYanlis, hy.falseItems);
