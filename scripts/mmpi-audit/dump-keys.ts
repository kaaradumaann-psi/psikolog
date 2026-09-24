/**
 * Denetim yardımcısı: kod içindeki MMPI madde anahtarlarını JSON olarak dışa verir.
 * Kaynak Ek 9 (kitap s.244-256) ile programatik karşılaştırma için kullanılır.
 *
 * Kullanım: npx tsx scripts/mmpi-audit/dump-keys.ts > .audit/code-keys.json
 */
import { SCORING_KEYS, isGendered } from '../../src/scoring/mmpiKeys';
import { PERSONALITY_KEYS, ADDICTION_KEYS, WIGGINS_KEYS, SPECIAL_KEYS } from '../../src/scoring/mmpiDerived';

type Out = { dogru: number[]; yanlis: number[] };

const out: Record<string, any> = {};

for (const [id, rule] of Object.entries(SCORING_KEYS)) {
  if (isGendered(rule)) {
    out[`${id}_M`] = { dogru: [...rule.male.trueItems].sort((a, b) => a - b), yanlis: [...rule.male.falseItems].sort((a, b) => a - b) };
    out[`${id}_F`] = { dogru: [...rule.female.trueItems].sort((a, b) => a - b), yanlis: [...rule.female.falseItems].sort((a, b) => a - b) };
  } else {
    out[id] = { dogru: [...rule.trueItems].sort((a, b) => a - b), yanlis: [...rule.falseItems].sort((a, b) => a - b) };
  }
}

const emit = (prefix: string, keys: Record<string, { dogru: number[]; yanlis: number[] }>) => {
  for (const [id, k] of Object.entries(keys)) {
    out[`${prefix}${id}`] = { dogru: [...k.dogru].sort((a, b) => a - b), yanlis: [...k.yanlis].sort((a, b) => a - b) };
  }
};

emit('P_', PERSONALITY_KEYS as any);
emit('A_', ADDICTION_KEYS as any);
emit('W_', WIGGINS_KEYS as any);
emit('S_', SPECIAL_KEYS as any);

// Özet: her anahtar için madde sayıları
console.log(JSON.stringify(out, null, 1));
console.error('--- COUNTS ---');
for (const [id, k] of Object.entries(out)) {
  console.error(`${id.padEnd(12)} dogru=${String((k as Out).dogru.length).padStart(3)} yanlis=${String((k as Out).yanlis.length).padStart(3)} total=${(k as Out).dogru.length + (k as Out).yanlis.length}`);
}
