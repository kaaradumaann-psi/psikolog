import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildProfileFromAnswers, buildProfileFromRawScoresObject } from '../src/scoring/mmpiScoring';
import { SCORING_KEYS, TURKISH_NORMS, K_CORRECTION } from '../src/scoring/mmpiKeys';
import type { ItemAnswer } from '../src/workspace/caseTypes';

describe('MMPI scoring - keys and norms', () => {
  it('L scale keys match reference', () => {
    const l = SCORING_KEYS.L as any;
    assert.deepEqual(l.falseItems, [15,30,45,60,75,90,105,120,135,150,165,195,225,255,285]);
    assert.deepEqual(l.trueItems, []);
  });
  it('F scale keys length', () => {
    const f = SCORING_KEYS.F as any;
    assert.equal(f.trueItems.length, 44);
    assert.equal(f.falseItems.length, 20);
  });
  it('K correction ratios', () => {
    assert.equal(K_CORRECTION.Hs, 0.5);
    assert.equal(K_CORRECTION.Pd, 0.4);
    assert.equal(K_CORRECTION.Pt, 1);
    assert.equal(K_CORRECTION.Sc, 1);
    assert.equal(K_CORRECTION.Ma, 0.2);
  });
  it('Turkish norms exist', () => {
    assert.ok(TURKISH_NORMS.Erkek.L.mean === 6.45);
    assert.ok(TURKISH_NORMS.Kadın.L.mean === 6);
    assert.ok(TURKISH_NORMS.Erkek.Hs.mean === 13.19);
  });
});

describe('raw scoring from answers', () => {
  it('all D answers produce expected raw counts', () => {
    const answers: ItemAnswer[] = Array.from({ length: 566 }, () => 'D');
    const profile = buildProfileFromAnswers(answers, 'Erkek');
    // For L, all D => raw 0 because L only scores Y
    const l = profile.scales.find(s => s.id === 'L')!;
    assert.equal(l.rawScore, 0);
    // For F, all D => count trueItems = 44
    const f = profile.scales.find(s => s.id === 'F')!;
    assert.equal(f.rawScore, 44);
    // For K, all D => trueItems [96] => 1
    const k = profile.scales.find(s => s.id === 'K')!;
    assert.equal(k.rawScore, 1);
  });
  it('all Y answers produce expected raw', () => {
    const answers: ItemAnswer[] = Array.from({ length: 566 }, () => 'Y');
    const profile = buildProfileFromAnswers(answers, 'Erkek');
    const l = profile.scales.find(s => s.id === 'L')!;
    assert.equal(l.rawScore, 15);
    const f = profile.scales.find(s => s.id === 'F')!;
    assert.equal(f.rawScore, 20);
    const k = profile.scales.find(s => s.id === 'K')!;
    // K falseItems = 29, all Y => 29
    assert.equal(k.rawScore, 29);
  });
  it('blank counting', () => {
    const answers: ItemAnswer[] = Array.from({ length: 566 }, (_, i) => (i < 10 ? null : 'D'));
    const profile = buildProfileFromAnswers(answers, 'Erkek');
    assert.equal(profile.validityAnalysis.cannotSay, 10);
    assert.equal(profile.cannotSayScale.rawScore, 10);
  });
  it('K correction applied', () => {
    const answers: ItemAnswer[] = Array.from({ length: 566 }, () => 'Y');
    const profile = buildProfileFromAnswers(answers, 'Erkek');
    const kRaw = profile.scales.find(s => s.id === 'K')!.rawScore; // 29
    const hs = profile.scales.find(s => s.id === 'Hs')!;
    // Hs raw for all Y: falseItems 22? Let's compute: Hs falseItems list length 22, true 11. All Y => falseItems count = 22
    // So raw Hs = 22
    assert.equal(hs.rawScore, 22);
    // K added = round(29*0.5)=15, corrected = 37
    assert.equal(hs.kAdded, 15);
    assert.equal(hs.kCorrectedRaw, 37);
  });
  it('T score calculation matches reference formula', () => {
    // Use known raw: Erkek Hs M=13.19 SD=4.07, raw 13 => T ~50
    const rawAll: any = { '?':0, L:6, F:8, K:14, Hs:13, D:21, Hy:19, Pd:22, Mf:29, Pa:11, Pt:28, Sc:30, Ma:20, Si:24 };
    const profile = buildProfileFromRawScoresObject({
      blank:0, L:6, F:8, K:14, Hs:13, D:21, Hy:19, Pd:22, Mf:29, Pa:11, Pt:28, Sc:30, Ma:20, Si:24
    } as any, 'Erkek');
    const hs = profile.scales.find(s=>s.id==='Hs')!;
    // corrected Hs = 13 + round(14*0.5)=20
    // T = 50+10*(20-13.19)/4.07 = 50+10*6.81/4.07=50+16.73=66.7
    assert.ok(Math.abs(hs.tScore - 66.7) < 0.2, `Hs T ${hs.tScore} expected ~66.7`);
  });
  it('Mf female inverted', () => {
    // Female Mf: mean 32.98, sd 3.67, raw 29 => T = 50+10*(32.98-29)/3.67 = 50+10*3.98/3.67=60.8
    const profile = buildProfileFromRawScoresObject({
      blank:0, L:6, F:9, K:12, Hs:16, D:24, Hy:18, Pd:23, Mf:29, Pa:12, Pt:29, Sc:31, Ma:20, Si:30
    } as any, 'Kadın');
    const mf = profile.scales.find(s=>s.id==='Mf')!;
    assert.ok(mf.tScore > 55 && mf.tScore < 65, `Mf female T ${mf.tScore} should be ~60.8`);
    const profileMale = buildProfileFromRawScoresObject({
      blank:0, L:6, F:9, K:12, Hs:16, D:24, Hy:18, Pd:23, Mf:29, Pa:12, Pt:29, Sc:31, Ma:20, Si:30
    } as any, 'Erkek');
    const mfMale = profileMale.scales.find(s=>s.id==='Mf')!;
    // Male: 50+10*(29-29.21)/3.82 = 49.4
    assert.ok(mfMale.tScore < 55, `Mf male T ${mfMale.tScore} should be ~49.4`);
  });
  it('profile code generated', () => {
    const answers: ItemAnswer[] = Array.from({ length: 566 }, () => 'Y');
    const profile = buildProfileFromAnswers(answers, 'Erkek');
    assert.ok(typeof profile.profileCode === 'string');
    assert.ok(profile.profileCode.length >= 1);
  });
});
