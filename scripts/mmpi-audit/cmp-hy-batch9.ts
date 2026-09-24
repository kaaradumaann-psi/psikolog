import { codeInterpretation } from '../../src/scoring/mmpiSourceCodes';
const hedef = ['37/73','38/83','39/93','30/03','394/934','934','39','30','03'];
for (const id of hedef) {
  const e = codeInterpretation(id);
  console.log(`${id.padEnd(9)} -> ${e ? e.code : 'YOK'}`);
}
console.log('');
for (const h of ['37/73','38/83','39/93','30/03']) {
  const e = codeInterpretation(h); if (!e) continue;
  const c = e.text.split(/(?<=\.)\s+/);
  console.log(`===== ${h} -> ${e.code} | ${c.length} cumle =====`);
  console.log('  1:', c[0].slice(0,170));
  console.log('  2:', (c[1]??'-').slice(0,130));
  console.log('  tanı:', e.diagnosis?.join(' | ') ?? '-', '| seeAlso:', e.seeAlso?.slice(0,100) ?? '-');
}
