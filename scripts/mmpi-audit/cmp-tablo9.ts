import { SCORING_KEYS } from '../../src/scoring/mmpiKeys';
const d = SCORING_KEYS.D as unknown as { trueItems: number[]; falseItems: number[] };
// Kaynak Tablo 9 (s.80) — GÖRSEL doğrulanmış listeler
const kaynakDogru = [5,13,23,32,41,43,52,67,86,104,130,138,142,158,159,182,189,193,236,259];
const kaynakYanlis = [2,8,9,18,30,36,39,46,51,57,58,64,80,88,89,95,98,107,122,131,145,152,153,154,155,160,178,191,207,208,233,241,242,248,263,270,271,272,285,296];
function cmp(ad: string, kaynak: number[], kod: number[]) {
  const K = new Set(kaynak), C = new Set(kod);
  const koddaFazla = kod.filter(x => !K.has(x));
  const koddaEksik = kaynak.filter(x => !C.has(x));
  console.log(`${ad}: kaynak ${kaynak.length} madde, kod ${kod.length} madde`);
  console.log(`  kodda FAZLA: ${koddaFazla.join(', ') || 'yok'}`);
  console.log(`  kodda EKSİK: ${koddaEksik.join(', ') || 'yok'}`);
  console.log(`  SONUÇ: ${koddaFazla.length === 0 && koddaEksik.length === 0 ? 'BİREBİR MATCH ✅' : 'FARK VAR ❌'}`);
}
cmp('Doğru  ', kaynakDogru, d.trueItems);
cmp('Yanlış ', kaynakYanlis, d.falseItems);
console.log(`Toplam: kaynak ${kaynakDogru.length + kaynakYanlis.length} (kitap "Madde Sayısı: 60") / kod ${d.trueItems.length + d.falseItems.length}`);
