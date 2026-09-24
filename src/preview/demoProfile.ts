/**
 * Tasarım önizlemesi için üretilen ÖRNEK VERİ.
 *
 * Gerçek bir danışana ait değildir. Amaç, arayüz bölümlerinin gerçek kayıtla
 * birebir aynı biçimde görülebilmesidir: cevap dizileri burada üretilir ve
 * profil, uygulamanın kendi puanlama hattıyla (buildProfileFromAnswers)
 * hesaplanır. Böylece ekranlar hiçbir zaman taklit veri kullanmaz.
 */

import { CARELESS_PAIRS, TR_PAIRS } from '../scoring/mmpiConsistency';
import { SCORING_KEYS, isGendered, type Gender, type ScaleId } from '../scoring/mmpiKeys';
import { buildProfileFromAnswers, type MMPIProfile } from '../scoring/mmpiScoring';
import type { ItemAnswer } from '../workspace/caseTypes';

const ITEM_COUNT = 566;
const GENDER: Gender = 'Erkek';

type Rule = { trueItems: number[]; falseItems: number[] };

/** Ölçek anahtarını cinsiyete göre çözer (Mf gibi cinsiyetli ölçekler dahil). */
function ruleFor(id: Exclude<ScaleId, '?'>, gender: Gender): Rule {
  const rule = SCORING_KEYS[id];
  return isGendered(rule) ? (gender === 'Erkek' ? rule.male : rule.female) : rule;
}

/** Ölçeğin ham puanını hedefe çeker: ilk `target` madde puan getiren yanıtı alır. */
function setScale(answers: ItemAnswer[], id: Exclude<ScaleId, '?'>, target: number, gender: Gender): void {
  const rule = ruleFor(id, gender);
  const items = [
    ...rule.trueItems.map(itemNumber => ({ index: itemNumber - 1, value: 'D' as ItemAnswer })),
    ...rule.falseItems.map(itemNumber => ({ index: itemNumber - 1, value: 'Y' as ItemAnswer })),
  ];
  items.forEach((item, order) => {
    if (isOutOfRange(item.index)) return;
    answers[item.index] = order < target ? item.value : item.value === 'D' ? 'Y' : 'D';
  });
}

function isOutOfRange(index: number): boolean {
  return index < 0 || index >= ITEM_COUNT;
}

/** Şüpheli/geçersiz profil örneği: yüksek F, düşük K ve belirgin klinik yükselmeler. */
function suspiciousAnswers(): ItemAnswer[] {
  const answers: ItemAnswer[] = new Array(ITEM_COUNT).fill('Y');
  const targets: Array<[Exclude<ScaleId, '?'>, number]> = [
    ['Hs', 20],
    ['D', 30],
    ['Hy', 24],
    ['Pd', 24],
    ['Mf', 26],
    ['Pa', 26],
    ['Pt', 32],
    ['Sc', 34],
    ['Ma', 20],
    ['Si', 30],
  ];
  for (const [id, target] of targets) setScale(answers, id, target, GENDER);
  setScale(answers, 'F', 44, GENDER);
  setScale(answers, 'K', 8, GENDER);
  setScale(answers, 'L', 0, GENDER);
  return answers;
}

/**
 * Olağan profil örneği: geçerlik ölçekleri normal aralıkta, klinik ölçeklerde
 * hafif yükselmeler (T 50-63) ve tutarlı yanıt örüntüsü.
 */
function ordinaryAnswers(): ItemAnswer[] {
  const answers: ItemAnswer[] = new Array(ITEM_COUNT).fill('Y');
  const targets: Array<[Exclude<ScaleId, '?'>, number]> = [
    ['Hs', 9],
    ['D', 19],
    ['Hy', 13],
    ['Pd', 21],
    ['Mf', 33],
    ['Pa', 15],
    ['Pt', 27],
    ['Sc', 31],
    ['Ma', 18],
    ['Si', 30],
  ];
  for (const [id, target] of targets) setScale(answers, id, target, GENDER);
  setScale(answers, 'F', 6, GENDER);
  setScale(answers, 'K', 12, GENDER);
  setScale(answers, 'L', 4, GENDER);
  enforceConsistency(answers);
  return answers;
}

/**
 * Tutarlılık göstergelerini normal aralığa çeker: tekrar çiftleri eşitlenir,
 * dikkatsizlik çiftleri beklenen örüntüye (aynı içerik → farklı, karşıt içerik
 * → aynı yanıt) getirilir.
 */
function enforceConsistency(answers: ItemAnswer[]): void {
  for (const [a, b] of TR_PAIRS) answers[b - 1] = answers[a - 1];
  for (const { pair, condition } of CARELESS_PAIRS) {
    const [a, b] = pair;
    const value = answers[a - 1];
    answers[b - 1] = condition === 'same' ? (value === 'D' ? 'Y' : 'D') : value;
  }
}

export type DemoCase = {
  id: 'supheli' | 'olagan';
  label: string;
  summary: string;
  profile: MMPIProfile;
  answers: ItemAnswer[];
};

function makeCase(id: DemoCase['id']): DemoCase {
  const answers = id === 'supheli' ? suspiciousAnswers() : ordinaryAnswers();
  return {
    id,
    label: id === 'supheli' ? 'Şüpheli / geçersiz profil' : 'Geçerli profil',
    summary:
      id === 'supheli'
        ? 'Yüksek F ve düşük K ile geçersiz profil; kritik ve türetilmiş bölümler dolu gelir.'
        : 'Geçerlik ölçekleri normal aralıkta, tutarlı yanıt örüntüsü.',
    profile: buildProfileFromAnswers(answers, GENDER),
    answers,
  };
}

export const DEMO_CASES: readonly DemoCase[] = [makeCase('supheli'), makeCase('olagan')];
