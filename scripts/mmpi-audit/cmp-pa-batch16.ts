/**
 * PHASE 9/10 batch 16 — Pa (6) kod bloğu karşılaştırması (kitap s.130-135).
 *
 * Kaynak kod başlıkları OCR + envanter (inventory.py) ile çıkarıldı:
 *   s.130 (p73 L): 61/16 · 62/26 · 63/36 · 64/46
 *   s.131 (p73 R): 64/46 (devam) · 648 · 65/56 · 67/76 · 678/876
 *   s.132 (p74 L): 679 · 68/86
 *   s.133 (p74 R): 680/860 · 69/96 · 694/964
 *   s.134 (p75 L): 698/968 · 60/06  (+ "456 Alt Testlerinin Örüntüsü")
 *   s.135 (p75 R): Şekil 21 — Scarlett O'Hara vadisi
 *
 * Amaç: hangi kaynak kodu kodda VAR/YOK ve kod çağrısı HANGİ metne düşüyor
 * (CONFLICT-030 kırpma kanıtı + CONFLICT-031 blok-bazlı ayrım).
 */
import { codeInterpretation, KNOWN_CODES } from '../../src/scoring/mmpiSourceCodes';

const kaynakKodlar: Array<[string, string, string]> = [
  // [kod, sayfa, tür]
  ['61/16', 's.130', 'iki-ölçek (çapraz ref: 16/61)'],
  ['62/26', 's.130', 'iki-ölçek (çapraz ref: 26/62)'],
  ['63/36', 's.130', 'iki-ölçek (çapraz ref: 36/63)'],
  ['64/46', 's.130-131', 'iki-ölçek (çapraz ref: 46/64, 462/642, 463/643, 468/648)'],
  ['648', 's.131', 'ÜÇLÜ'],
  ['65/56', 's.131', 'iki-ölçek (çapraz ref: 56/65)'],
  ['67/76', 's.131', 'iki-ölçek'],
  ['678/876', 's.131', 'ÜÇLÜ'],
  ['679', 's.132', 'ÜÇLÜ'],
  ['68/86', 's.132', 'iki-ölçek (çapraz ref: 468/648, 486/846, 489/849)'],
  ['680/860', 's.133', 'ÜÇLÜ'],
  ['69/96', 's.133', 'iki-ölçek (çapraz ref: 698/968)'],
  ['694/964', 's.133', 'ÜÇLÜ'],
  ['698/968', 's.134', 'ÜÇLÜ'],
  ['60/06', 's.134', 'iki-ölçek'],
];

let varSayisi = 0;
let ucruYok = 0;

for (const [kod, sayfa, tur] of kaynakKodlar) {
  const anahtar = [...kod.slice(0, 2)].sort().join(''); // canonicalCode muadili
  const kayit = codeInterpretation(kod);
  const tamVar = (KNOWN_CODES as string[]).includes(anahtar);

  // iki-ölçek kodların gerçek anahtarı 2 hane; ÜÇLÜ kodların anahtarı yoktur
  if (tur.includes('ÜÇLÜ')) {
    const varMi = (KNOWN_CODES as string[]).includes(anahtar);
    if (!varMi) ucruYok++;
    console.log(
      `${sayfa}  ${kod.padEnd(9)} ${tur.padEnd(14)} → çağrı "${anahtar}" ` +
        `${varMi ? 'VAR (YANLIŞ EŞLEME)' : 'YOK'}`,
    );
  } else {
    if (tamVar) varSayisi++;
    console.log(
      `${sayfa}  ${kod.padEnd(9)} ${tur.padEnd(14)} → çağrı "${anahtar}" ` +
        `${tamVar ? 'VAR ✅' : 'YOK ❌'}`,
    );
  }
}

console.log(`\nİKİ-ÖLÇEK: ${varSayisi}/9 kodda VAR (hepsi 2 haneli anahtara düşüyor)`);
console.log(`ÜÇLÜ:      ${ucruYok}/6 kodda anahtar YOK → 2 haneli kayda düşüyor`);

console.log('\n--- "46" kaydının metni (Pd bloğu 46/64 ⇄ Pa bloğu 64/46 ayrımı) ---');
const c46 = codeInterpretation('46');
console.log(c46 ? `${c46.code}: ${c46.text.slice(0, 420)}…` : 'YOK');
console.log('\n--- "67" kaydının metni (679 · 67/76 · 678/876 buraya düşüyor) ---');
const c67 = codeInterpretation('67');
console.log(c67 ? `${c67.code}: ${c67.text.slice(0, 300)}…` : 'YOK');
