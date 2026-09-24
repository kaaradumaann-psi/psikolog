import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildProfileFromAnswers, buildProfileFromRawScoresObject } from '../src/scoring/mmpiScoring';
import type { ItemAnswer } from '../src/workspace/caseTypes';
import { buildCaseMeta, emptyClientIntake, parseRecordPayload } from '../src/workspace/caseTypes';
import { answersFromOmrPages, profileFromRecord, type PageLike } from '../src/results/recordProfile';

function answersFromPattern(period: number): ItemAnswer[] {
  const out: ItemAnswer[] = new Array(566).fill(undefined);
  for (let i = 0; i < 566; i++) out[i] = i % period === 0 ? 'D' : 'Y';
  return out;
}

function omrPage(pageNumber: number, firstItem: number, lastItem: number, choice: 'D' | 'Y' | null): PageLike {
  const items: PageLike['items'] = [];
  for (let n = firstItem; n <= lastItem; n++) {
    items.push({ itemId: `item-${n}`, itemNumber: n, choiceId: choice });
  }
  return { pageNumber, items };
}

describe('recordProfile - kayıttan profil hesaplama', () => {
  it('hızlı giriş yükünden profil üretir (doğru skorlama ile aynı sonuç)', () => {
    const answers = answersFromPattern(3);
    const raw = [
      { kind: 'case-meta', version: 1, method: 'quick', client: { gender: 'Erkek' } },
      { kind: 'quick-entry', version: 1, answers: answers as Array<'D' | 'Y' | null> },
    ];
    const parsed = parseRecordPayload(raw as unknown[]);
    const profile = profileFromRecord({ gender: 'Erkek' }, parsed);
    assert.ok(profile);
    const expected = buildProfileFromAnswers(answers, 'Erkek');
    assert.deepEqual(
      profile.scales.map(s => [s.id, s.tScore]),
      expected.scales.map(s => [s.id, s.tScore]),
    );
  });

  it('ham puan yükünden profil üretir', () => {
    const scales = {
      blank: 3, L: 5, F: 9, K: 12, Hs: 14, D: 21, Hy: 19, Pd: 22, Mf: 30, Pa: 11, Pt: 28, Sc: 30, Ma: 20, Si: 24,
    };
    const raw = [
      { kind: 'case-meta', version: 1, method: 'raw', client: { gender: 'Kadın' } },
      { kind: 'raw-scores', version: 1, scales },
    ];
    const parsed = parseRecordPayload(raw as unknown[]);
    const profile = profileFromRecord({ gender: 'Kadın' }, parsed);
    assert.ok(profile);
    const expected = buildProfileFromRawScoresObject(scales, 'Kadın');
    assert.equal(profile.clinical.find(s => s.id === 'Pt')?.tScore, expected.clinical.find(s => s.id === 'Pt')?.tScore);
  });

  it('OMR sayfalarından cevap çıkarır ve manuel düzeltmeyi önceliklendirir', () => {
    const pages: PageLike[] = [
      omrPage(1, 1, 3, 'D'),
      omrPage(2, 4, 6, 'Y'),
    ];
    pages[1].manualReviews = { 'item-5': { choiceId: 'D' } };
    const answers = answersFromOmrPages(pages, 6);
    assert.deepEqual(answers, ['D', 'D', 'D', 'Y', 'D', 'Y']);
  });

  it('a manual review can resolve a missing raw item without inventing other blanks', () => {
    const pages: PageLike[] = [omrPage(1, 1, 3, 'D')];
    pages[0].manualReviews = { 'item-4': { choiceId: null } };
    assert.deepEqual(answersFromOmrPages(pages, 4), ['D', 'D', 'D', null]);
  });

  it('OMR sayfalarından profil üretir (boş madde null döner)', () => {
    const pages: PageLike[] = [omrPage(1, 1, 566, 'Y')];
    const parsed = parseRecordPayload([{ kind: 'case-meta', version: 1, method: 'omr', client: { gender: 'Erkek' } }, ...pages] as unknown[]);
    const profile = profileFromRecord({ gender: 'Erkek' }, parsed);
    assert.ok(profile);
    assert.equal(profile.cannotSayScale.rawScore, 0);
  });

  it('DB cinsiyeti ile payload metadatası çelişirse profil üretmez', () => {
    const client = emptyClientIntake();
    client.firstName = 'A'; client.lastName = 'B'; client.gender = 'Kadın'; client.age = 28; client.testDate = '2026-09-17';
    const parsed = parseRecordPayload([
      buildCaseMeta('quick', client),
      { kind: 'quick-entry', version: 1, answers: new Array(566).fill('Y') },
    ] as unknown[]);
    assert.equal(profileFromRecord({ gender: 'Erkek' }, parsed), null);
  });

  it('skorlamaya uygun olmayan cinsiyette null döner', () => {
    const parsed = parseRecordPayload([
      { kind: 'quick-entry', version: 1, answers: new Array(566).fill('Y') },
    ] as unknown[]);
    const profile = profileFromRecord({ gender: 'Diğer' }, parsed);
    assert.equal(profile, null);
  });

  it('verisi olmayan kayıtta null döner', () => {
    const parsed = parseRecordPayload([]);
    const profile = profileFromRecord({ gender: 'Erkek' }, parsed);
    assert.equal(profile, null);
  });
});
