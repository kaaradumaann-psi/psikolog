import { codeInterpretation } from '../../src/scoring/mmpiSourceCodes';
for (const id of ['29/92','20/02','27/72']) {
  const e = codeInterpretation(id)!;
  console.log(`===== ${id} =====`);
  e.text.split(/(?<=\.)\s+/).forEach((s,i) => console.log(`  ${i+1}. ${s.slice(0,190)}`));
  console.log(`  seeAlso: ${e.seeAlso ?? '-'}`);
  console.log(`  tanı: ${e.diagnosis?.join(' | ') ?? '-'}\n`);
}
// DIKKAT: seeAlso dongusu kanit
const e274 = codeInterpretation('274/724')!;
console.log('DONGU TESTI: codeInterpretation("274/724") -> kayit', e274.code);
console.log('  bu kaydin seeAlso metni 274/724 iceriyor mu? ->', /274\/724/.test(e274.seeAlso ?? ''));
