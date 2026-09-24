import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildProfileFromAnswers } from '../src/scoring/mmpiScoring';
import type { ResponseMap } from '../src/scoring/mmpiScoring';
import { trIndex, carelessnessIndex, fkIndexAnalysis, TR_PAIRS, CARELESS_PAIRS } from '../src/scoring/mmpiConsistency';
import { detectValidityConfig, VALIDITY_CONFIGS } from '../src/scoring/mmpiValidityConfigs';
import { computeDerivedScales, computeDerivedIndexes } from '../src/scoring/mmpiDerived';
import { findCriticalItems, clinicalImpressions } from '../src/scoring/mmpiCritical';
import { kAddition, K_ADDITION_TABLE } from '../src/scoring/mmpiKeys';
import type { ItemAnswer } from '../src/workspace/caseTypes';

function responseMap(patch: Record<number, 1 | 0 | -1> = {}): ResponseMap {
  const map: ResponseMap = {};
  for (let i = 1; i <= 566; i++) map[i] = 1; // hepsi D
  Object.assign(map, patch);
  return map;
}

describe('TR endeksi (16 tekrarlanmış madde çifti)', () => {
  it('tutarlı yanıtlarda 0 puan verir ve uyarı vermez', () => {
    const result = trIndex(responseMap());
    assert.equal(result.score, 0);
    assert.equal(result.evaluated, 16);
    assert.equal(result.isWarning, false);
    assert.equal(result.mismatches.length, 0);
  });

  it('tek çift tutarsızsa 1 puan verir; 4+ uyarıdır', () => {
    const [a, b] = TR_PAIRS[0]!;
    const one = trIndex(responseMap({ [a]: 1, [b]: 0 }));
    assert.equal(one.score, 1);
    assert.equal(one.isWarning, false);

    const patch: Record<number, 1 | 0> = {};
    TR_PAIRS.slice(0, 4).forEach(([x, y]) => {
      patch[x] = 1;
      patch[y] = 0;
    });
    const four = trIndex(responseMap(patch));
    assert.equal(four.score, 4);
    assert.equal(four.isWarning, true);
    assert.match(four.interpretation, /geçersiz profil olasılığını artırır/);
  });

  it('boş bırakılan çiftler değerlendirilmez', () => {
    const [a, b] = TR_PAIRS[0]!;
    const result = trIndex(responseMap({ [a]: -1, [b]: 1 }));
    assert.equal(result.evaluated, 15);
    assert.equal(result.score, 0);
  });
});

describe('Dikkatsizlik endeksi (12 çift)', () => {
  it('çift sayısı 12dir ve beklenen örüntüler sayılır', () => {
    assert.equal(CARELESS_PAIRS.length, 12);
    // hepsi-D: yalnızca condition=same çiftleri sayılır
    const allD = carelessnessIndex(responseMap());
    const sameCount = CARELESS_PAIRS.filter(p => p.condition === 'same').length;
    assert.equal(allD.score, sameCount);
  });

  it('4 ve üzeri uyarı üretir (kesme puanı 4)', () => {
    // hepsi-D tabanında 7 'same' çifti sayılır; dördünü farklılaştır → 3 (uyarı yok)
    const low = carelessnessIndex(responseMap({ 10: 1, 405: 0, 49: 1, 113: 0, 76: 1, 107: 0, 88: 1, 526: 0 }));
    assert.equal(low.score, 3);
    assert.equal(low.isWarning, false);
    // üçünü farklılaştır → 4 (uyarı)
    const high = carelessnessIndex(responseMap({ 10: 1, 405: 0, 49: 1, 113: 0, 76: 1, 107: 0 }));
    assert.equal(high.score, 4);
    assert.equal(high.isWarning, true);
    assert.match(high.interpretation, /dikkatli olunması gerektiğini gösterir/);
  });
});

describe('F-K endeksi bantları (Gough)', () => {
  it('0-9 aralığı geçerli kabul edilir', () => {
    const r = fkIndexAnalysis(14, 8); // +6
    assert.equal(r.value, 6);
    assert.equal(r.isWarning, false);
    assert.match(r.level, /Geçerli/);
  });
  it('10-16 sahte-kötülük kuşkusudur', () => {
    const r = fkIndexAnalysis(24, 12); // +12
    assert.equal(r.value, 12);
    assert.equal(r.isWarning, true);
    assert.match(r.level, /Sahte-Kötülük/);
  });
  it('16 üstü kritik abartmadır', () => {
    const r = fkIndexAnalysis(36, 8); // +28
    assert.equal(r.isWarning, true);
    assert.match(r.level, /Abartma/);
    assert.match(r.interpretation, /simülasyon/i);
  });
  it('hafif negatif değerler geçerlidir, belirgin negatif sahte-iyiliktir', () => {
    const mild = fkIndexAnalysis(6, 12); // -6
    assert.equal(mild.isWarning, false);
    const strong = fkIndexAnalysis(4, 16); // -12
    assert.equal(strong.isWarning, true);
    assert.match(strong.level, /Sahte-İyilik/);
  });
});

describe('geçerlik konfigürasyonları', () => {
  it('15 konfigürasyon tanımlıdır', () => {
    assert.equal(VALIDITY_CONFIGS.length, 15);
  });
  it('V şekli: L,K >= 60 ve F <= 55 (F 50 üstündeyse Çok Kapalı değil)', () => {
    const config = detectValidityConfig(62, 54, 62);
    assert.ok(config);
    assert.match(config!.name, /V Şekli/);
  });
  it('tümüne yanlış: L,F,K hepsi 75+ (uygulamadaki pratik eşik)', () => {
    // Kaynak s.50 "L, F ve K tümü 80 T puanının üzerindedir" der; ANCAK kitabın
    // kendi anahtarı ve Tablo 30 normlarıyla gerçek bir "tümüne yanlış"
    // yanıtlayıcı F = 75.3 T üretir → kaynağın F>80 koşulu ulaşılamazdır
    // (kaynak içi tutarsızlık). Bu yüzden pratik eşik 75 korunmuştur.
    // Kanıt: DECISION-020 · CONFLICT-018 · SOURCE-CONFIG-008
    const config = detectValidityConfig(81, 76, 82);
    assert.ok(config);
    assert.match(config!.name, /Yanlış/);
  });
  it('tersine V: L,K 50-60 ve F > 70', () => {
    const config = detectValidityConfig(55, 80, 55);
    assert.ok(config);
    assert.match(config!.name, /Tersine V/);
  });
  it('hiçbiri uymazsa null döner', () => {
    assert.equal(detectValidityConfig(50, 55, 40), null);
  });
});

describe('türetilmiş ölçekler ve endeksler', () => {
  it('33 türetilmiş ölçek hesaplanır (11 kişilik + 3 bağımlılık + 13 Wiggins + 6 özel)', () => {
    const scales = computeDerivedScales(responseMap());
    assert.equal(scales.length, 33);
    assert.equal(scales.filter(s => s.category === 'personality').length, 11);
    assert.equal(scales.filter(s => s.category === 'addiction').length, 3);
    assert.equal(scales.filter(s => s.category === 'wiggins').length, 13);
    assert.equal(scales.filter(s => s.category === 'special').length, 6);
  });

  it('Welsh A ve R ölçekleri T puanı üretir', () => {
    const scales = computeDerivedScales(responseMap());
    const a = scales.find(s => s.scaleId === 'A')!;
    const r = scales.find(s => s.scaleId === 'R')!;
    assert.equal(typeof a.tScore, 'number');
    assert.equal(typeof r.tScore, 'number');
  });

  it('Goldberg endeksi (L+Pa+Sc)-(Hy+Pt) formülüyle hesaplanır', () => {
    const indexes = computeDerivedIndexes({ L: 60, F: 50, K: 50, Hs: 50, D: 50, Hy: 40, Pd: 50, Mf: 50, Pa: 70, Pt: 45, Sc: 75, Ma: 50, Si: 50 });
    const goldberg = indexes.find(i => i.scaleId === 'GOLDBERG')!;
    assert.equal(goldberg.value, 60 + 70 + 75 - (40 + 45)); // 120
    assert.match(goldberg.levelLabel, /Psikotik/);
  });

  it('Taulbee: 13+ nevrotik, 6- psikotik', () => {
    const indexes = computeDerivedIndexes({ Hs: 80, D: 75, Hy: 78, Pd: 40, Mf: 40, Pa: 45, Pt: 42, Sc: 41, Ma: 43, Si: 50 });
    const taulbee = indexes.find(i => i.scaleId === 'TAULBEE')!;
    assert.ok(taulbee.value >= 13);
    assert.match(taulbee.levelLabel, /Nevrotik/);
  });

  it('Peterson: 6 kuralın kaçı karşılanıyorsa o puan verilir', () => {
    const indexes = computeDerivedIndexes({ F: 50, K: 55, Hs: 70, D: 72, Hy: 71, Pd: 70, Mf: 50, Pa: 71, Pt: 60, Sc: 74, Ma: 50, Si: 50 });
    const peterson = indexes.find(i => i.scaleId === 'PETERSON')!;
    assert.ok(peterson.value >= 3);
    assert.match(peterson.levelLabel, /Psikotik/);
  });
});

describe('kritik maddeler ve klinik izlenimler', () => {
  it('cinsiyete göre 37 ortak + 1 cinsiyetli madde tanımlıdır', () => {
    assert.equal(findCriticalItems(responseMap(), 'Erkek').length >= 1, true);
    const male = findCriticalItems(responseMap({ 74: 1 }), 'Erkek');
    const female = findCriticalItems(responseMap({ 74: 1 }), 'Kadın');
    assert.ok(male.some(h => h.id === 74));
    assert.ok(!female.some(h => h.id === 74));
    const femaleHit = findCriticalItems(responseMap({ 74: 0 }), 'Kadın');
    assert.ok(femaleHit.some(h => h.id === 74));
  });

  it('intihar maddeleri (202/339) izlenim üretir', () => {
    const impressions = clinicalImpressions({
      t: { D: 55, Pt: 50, Hs: 50, Hy: 50, Pd: 50, Pa: 50, Sc: 50, Ma: 50, L: 50, F: 50, K: 50 },
      lRaw: 5,
      kRaw: 12,
      responses: responseMap({ 202: 1 }),
      gender: 'Erkek',
    });
    assert.ok(impressions.some(i => i.title.includes('İntihar') && i.text.includes('Madde 202')));
  });

  it('D ve Pt birlikte 70+ ise intihar riski uyarısı verilir', () => {
    const impressions = clinicalImpressions({
      t: { D: 75, Pt: 72, Hs: 50, Hy: 50, Pd: 50, Pa: 50, Sc: 50, Ma: 50, L: 50, F: 50, K: 50 },
      lRaw: 5,
      kRaw: 12,
      gender: 'Erkek',
    });
    assert.ok(impressions.some(i => i.tone === 'alert' && i.title.includes('İntihar')));
  });

  it('K ham <= 15 tedaviye olumlu yanıt notu üretir', () => {
    const low = clinicalImpressions({
      t: {}, lRaw: 5, kRaw: 12, gender: 'Kadın',
    });
    assert.ok(low.some(i => i.title.includes('Tedaviye Yanıt Notu') && i.tone === 'ok'));
    const high = clinicalImpressions({
      t: {}, lRaw: 5, kRaw: 22, gender: 'Kadın',
    });
    assert.ok(high.some(i => i.title.includes('Tedaviye Yanıt Notu') && i.tone === 'watch'));
  });
});

describe('K düzeltme standart ekleme tablosu', () => {
  it('tablo 0-30 K değerlerini kapsar', () => {
    assert.equal(K_ADDITION_TABLE.ratio5.length, 31);
    assert.equal(K_ADDITION_TABLE.ratio4.length, 31);
    assert.equal(K_ADDITION_TABLE.ratio2.length, 31);
    assert.equal(K_ADDITION_TABLE.ratio10.length, 31);
  });
  it('klasik tablo değerleri kullanılır', () => {
    assert.equal(kAddition(1, 0.4), 1);
    assert.equal(kAddition(3, 0.4), 2);
    assert.equal(kAddition(4, 0.4), 1);
    assert.equal(kAddition(29, 0.5), 15);
    assert.equal(kAddition(14, 1), 14);
    assert.equal(kAddition(16, 0.2), 3);
  });
});

describe('uçtan uca profil: madde düzeyi analiz katmanı', () => {
  it('buildProfileFromAnswers itemLevel üretir ve geçerlik uyarılarına TR/Dikkatsizlik ekler', () => {
    const answers: ItemAnswer[] = new Array(566).fill('Y');
    const profile = buildProfileFromAnswers(answers, 'Erkek');
    assert.ok(profile.itemLevel);
    assert.equal(profile.itemLevel!.derivedScales.length, 33);
    assert.equal(profile.itemLevel!.derivedIndexes.length, 3);
    assert.ok(profile.itemLevel!.criticalItems.length > 0);
    assert.ok(profile.itemLevel!.impressions.some(i => i.title.includes('Tedaviye Yanıt Notu')));
    // hepsi-Y: tümüne yanlış konfigürasyonu ve TR tutarlı (hepsi aynı)
    assert.ok(profile.validityAnalysis.validityConfig);
    assert.equal(profile.itemLevel!.trIndex.score, 0);
    // hepsi-Y: tüm çiftlerde yanıtlar eşit olduğundan 'same' çiftleri sayılır
    const sameCount = CARELESS_PAIRS.filter(p => p.condition === 'same').length;
    assert.equal(profile.itemLevel!.carelessness.score, sameCount);
    // kaynak.pdf adı hiçbir yerde görünmez
    const serialized = JSON.stringify(profile.itemLevel!.impressions);
    assert.doesNotMatch(serialized, /kaynak\.pdf/);
  });
});
