import { codeInterpretation } from '../../src/scoring/mmpiSourceCodes';
for (const id of ['01','16','17']) {
  const e = codeInterpretation(id)!;
  console.log(`===== ${id} [${e.code}] =====`);
  console.log(e.text);
  console.log(`seeAlso: ${e.seeAlso ?? '-'}`);
  console.log();
}
