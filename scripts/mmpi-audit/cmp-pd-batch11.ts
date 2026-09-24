import { codeInterpretation, KNOWN_CODES, canonicalCode } from '../../src/scoring/mmpiSourceCodes';

const kaynakKodlar = ['41/14', '42/24', '43/34', '45/54', '456', '46/64', '468/648', '463/643'];
console.log(`KODDA toplam kayit: ${KNOWN_CODES.length}`);
let v = 0, y = 0;
for (const k of kaynakKodlar) {
  const first = k.split('/')[0].trim().replace(/[^0-9]/g, '');
  const kayit = codeInterpretation(first);
  const ok = !!kayit;
  if (ok) v++; else y++;
  console.log(`  ${ok ? 'VAR ' : 'YOK '} ${k.padEnd(10)} ${kayit ? `-> kayit "${kayit.code}"` : ''}`);
}
console.log(`\nVAR: ${v} | YOK: ${y}`);
console.log('\n--- coklu kod kirpma testi ---');
for (const c of ['456', '468', '463748', '943']) {
  const e = codeInterpretation(c);
  console.log(`  '${c}' -> CODES[canonicalCode(slice(0,2))] = ${e ? `"${e.code}"` : 'YOK'}`);
}
