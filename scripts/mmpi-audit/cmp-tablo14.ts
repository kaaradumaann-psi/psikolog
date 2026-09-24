/**
 * PHASE 9/10 batch 17 — Pt (7) anahtarı + bantlar + norm (kitap s.138-139).
 *
 * Kaynak Tablo 14 (s.138) — 125 dpi tam sayfa GÖRSEL okuma:
 *   Başlık: "Tablo 14. Psikasteni alt testi: Madde numaraları ve puanlama yönü
 *           (Madde Sayısı: 48)"
 *   Doğru : 4 satır (11+11+11+6 = 39)
 *   Yanlış: 3, 8, 36, 122, 152, 164, 178, 329, 353 = 9
 *   Norm  : "Erkeklerde ortalama: 27.90, kadınlarda ortalama: 29.90 (Savaşır, 1981)"
 */
import { SCORING_KEYS, TURKISH_NORMS } from '../../src/scoring/mmpiKeys';
import { clinicalBands } from '../../src/scoring/mmpiSource';
import { SINGLE_PT } from '../../src/scoring/mmpiSource';

const kaynakDogru = [
  10, 15, 22, 32, 41, 67, 76, 86, 94, 102, 106,
  142, 159, 182, 189, 217, 238, 266, 301, 304, 305, 317,
  321, 336, 337, 340, 342, 343, 344, 346, 349, 351, 352,
  356, 357, 358, 359, 360, 361,
];
const kaynakYanlis = [3, 8, 36, 122, 152, 164, 178, 329, 353];

console.log(`KAYNAK: Dogru ${kaynakDogru.length} + Yanlis ${kaynakYanlis.length} = ${kaynakDogru.length + kaynakYanlis.length}  (kitap basligi: 48)`);
const pt = SCORING_KEYS.Pt as unknown as { trueItems: number[]; falseItems: number[] };
console.log(`KOD   : Dogru ${pt.trueItems.length} + Yanlis ${pt.falseItems.length} = ${pt.trueItems.length + pt.falseItems.length}`);

function cmp(ad: string, kaynak: number[], kod: number[]) {
  const K = new Set(kaynak), C = new Set(kod);
  const fazla = kod.filter(x => !K.has(x)).sort((a, b) => a - b);
  const eksik = kaynak.filter(x => !C.has(x)).sort((a, b) => a - b);
  console.log(
    `${ad}: FAZLA [${fazla.join(', ')}] | EKSIK [${eksik.join(', ')}] -> ` +
      `${fazla.length === 0 && eksik.length === 0 ? 'BIREBIR MATCH ✅' : 'FARK ❌'}`,
  );
}
cmp('Dogru ', kaynakDogru, pt.trueItems);
cmp('Yanlis', kaynakYanlis, pt.falseItems);

const n = TURKISH_NORMS as any;
console.log(
  `\nNorm KAYNAK: erkek 27.90 / kadin 29.90 (Savasir 1981) | ` +
    `KOD: erkek ${n.Erkek.Pt.mean} (sd ${n.Erkek.Pt.sd}) / kadin ${n.Kadın.Pt.mean} (sd ${n.Kadın.Pt.sd})`,
);

console.log('\nKOD Pt T bantlari (Erkek):');
for (const b of clinicalBands('Pt', 'Erkek')) console.log(`  ${b.rangeLabel.padEnd(10)} (min ${b.min}-max ${b.max}) ${b.label ?? ''}`);
console.log('KAYNAK Pt T bantlari (s.139): 84 T ve üstü · 75-84 T · 60-74 T · 45-59 T · 20-44 T');

console.log('\n"Sadece Pt alt testinin yükselmesi":');
console.log('  KOD:', SINGLE_PT ? 'VAR ✅' : 'YOK ❌');
console.log('  KOD metni (ilk 90):', SINGLE_PT.text.slice(0, 90) + '…');
