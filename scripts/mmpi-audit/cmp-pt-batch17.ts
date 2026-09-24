/**
 * PHASE 9/10 batch 17 — Pt (7) kod bloğu karşılaştırması (kitap s.140-141).
 *
 * Kaynak kod başlıkları (OCR + inventory.py):
 *   s.140 (p78 L): 71/17 · 72/27 · 73/37 · 74/47 · 75/57 · 76/67 · 78/87
 *                  (çapraz ref: 278/728, 478/728, 478/748)
 *   s.141 (p78 R): 782 · 872 · 784/874 · 789 · 79/97
 *
 * Sayısal kurallar (kaynak):
 *   s.140: "Eğer 2 ve 4, 8 alt testinin 5 T puanı altındaysa 278/728 ve
 *           478/728 ve 478/748 kodlarına bakınız"
 *   s.141: "7<8: Her iki yükselmede 75 T puanının üstünde ve 8 alt testinde
 *           belirgin bir yükselme varsa tanı şizofrenidir."
 */
import { codeInterpretation, KNOWN_CODES } from '../../src/scoring/mmpiSourceCodes';

const kaynakKodlar: Array<[string, string, boolean]> = [
  // [kod, sayfa, üçlü mü]
  ['71/17', 's.140', false],
  ['72/27', 's.140', false],
  ['73/37', 's.140', false],
  ['74/47', 's.140', false],
  ['75/57', 's.140', false],
  ['76/67', 's.140', false],
  ['78/87', 's.140', false],
  ['782', 's.141', true],
  ['872', 's.141', true],
  ['784/874', 's.141', true],
  ['789', 's.141', true],
  ['79/97', 's.141', false],
  // çapraz referanslar
  ['278/728', 's.140', true],
  ['478/728', 's.140', true],
  ['478/748', 's.140', true],
];

let varSayisi = 0;
let yokSayisi = 0;

for (const [kod, sayfa, uclu] of kaynakKodlar) {
  const anahtar = [...kod.slice(0, 2)].sort().join('');
  const varMi = (KNOWN_CODES as string[]).includes(anahtar);
  if (varMi) varSayisi++; else yokSayisi++;
  const cagi = codeInterpretation(kod);
  console.log(
    `${sayfa}  ${kod.padEnd(9)} ${(uclu ? 'ÜÇLÜ' : 'iki-ölçek').padEnd(9)} → "${anahtar}" ` +
      `${varMi ? 'VAR ✅' : 'YOK ❌'}  [dönen kayıt: ${cagi ? cagi.code : '—'}]`,
  );
}

console.log(`\nPt bloğu: ${varSayisi} VAR / ${yokSayisi} YOK (toplam ${kaynakKodlar.length} başlık)`);

console.log('\n--- Çapraz metin kontrolü: "78" kaydı ---');
const c78 = codeInterpretation('78');
console.log(c78 ? c78.text.slice(0, 300) + '…' : 'YOK');

console.log('\n--- "79" kaydı (79/97 buraya düşüyor) ---');
const c79 = codeInterpretation('79');
console.log(c79 ? c79.text.slice(0, 200) + '…' : 'YOK');
