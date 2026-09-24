import { codeInterpretation } from '../../src/scoring/mmpiSourceCodes';
const hedef = ['31','13/31','32','321','34/43','345/435','346/436','36/63','35/53','34','43','23'];
const gorulen = new Set<string>();
for (const id of hedef) {
  const e = codeInterpretation(id);
  if (!e) { console.log(`${id.padEnd(9)} -> YOK`); continue; }
  const yeni = !gorulen.has(e.code);
  gorulen.add(e.code);
  console.log(`${id.padEnd(9)} -> ${e.code}${yeni ? '  [ILK KEZ]' : ''}`);
}
console.log('');
for (const h of ['13/31','23','34/43','36/63','35/53','34/43']) {
  const e = codeInterpretation(h); if (!e) continue;
  const c = e.text.split(/(?<=\.)\s+/);
  console.log(`===== ${h} -> ${e.code} | ${c.length} cumle | ${e.text.length} karakter =====`);
  console.log('ILK CUMLE:', c[0].slice(0,200));
}
