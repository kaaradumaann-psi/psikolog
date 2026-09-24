import { SCORING_KEYS, TURKISH_NORMS } from '../../src/scoring/mmpiKeys';
import { clinicalBands } from '../../src/scoring/mmpiSource';

// Kaynak Tablo 13 (s.128) — 125 dpi tam sayfa GÖRSEL okuma
const kaynakDogru = [15,16,22,24,27,35,110,121,123,127,151,
  157,158,202,275,284,291,293,299,305,317,338,341,364,365];
const kaynakYanlis = [93,107,109,111,117,124,268,281,294,313,316,319,327,347,348];

console.log(`KAYNAK: Dogru ${kaynakDogru.length} + Yanlis ${kaynakYanlis.length} = ${kaynakDogru.length+kaynakYanlis.length}  (kitap basligi: 40)`);
const pa = SCORING_KEYS.Pa as unknown as { trueItems: number[]; falseItems: number[] };
console.log(`KOD   : Dogru ${pa.trueItems.length} + Yanlis ${pa.falseItems.length} = ${pa.trueItems.length+pa.falseItems.length}`);

function cmp(ad: string, kaynak: number[], kod: number[]) {
  const K = new Set(kaynak), C = new Set(kod);
  const fazla = kod.filter(x => !K.has(x)).sort((a,b)=>a-b);
  const eksik = kaynak.filter(x => !C.has(x)).sort((a,b)=>a-b);
  console.log(`${ad}: FAZLA [${fazla.join(', ')}] | EKSIK [${eksik.join(', ')}] -> ${fazla.length===0&&eksik.length===0?'BIREBIR MATCH ✅':'FARK ❌'}`);
}
cmp('Dogru', kaynakDogru, pa.trueItems);
cmp('Yanlis', kaynakYanlis, pa.falseItems);

const n = (TURKISH_NORMS as any);
console.log(`\nNorm KAYNAK: erkek 11.12 / kadin 11.93 | KOD: erkek ${n.Erkek.Pa.mean} / kadin ${n.Kadın.Pa.mean}`);

console.log('\nKOD Pa T bantlari:');
for (const b of clinicalBands('Pa', 'Erkek')) console.log(`  ${b.rangeLabel} (min ${b.min}-max ${b.max})`);
