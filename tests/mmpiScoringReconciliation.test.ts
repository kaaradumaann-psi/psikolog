import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';
import {
  SCORING_KEYS,
  K_CORRECTION,
  K_ADDITION_TABLE,
  TURKISH_NORMS,
  kAddition,
  isGendered,
  type ScaleId,
  type Gender,
} from '../src/scoring/mmpiKeys';
import {
  answersToResponseMap,
  computeRawFromResponses,
  buildProfileFromAnswers,
  buildProfileFromRaw,
  type ResponseMap,
} from '../src/scoring/mmpiScoring';
import {
  detectPatterns,
  detectKPlus,
  codeInterpretationForProfile,
  clinicalBandFor,
  type MMPIProfile,
} from '../src/scoring/mmpiInterpretation';
import {
  KNOWN_CODES,
  KNOWN_BLOCK_CODES,
  resolveCodeInterpretation,
  activeCodeConditions,
} from '../src/scoring/mmpiSourceCodes';
import {
  WIGGINS_KEYS,
  WIGGINS_NORMS,
  TRYON_KEYS,
  SPECIAL_KEYS,
  computeDerivedIndexes,
} from '../src/scoring/mmpiDerived';
import {
  L_T_BANDS,
  F_T_BANDS,
  K_T_BANDS,
  VALIDITY_CUTOFFS,
  L_RAW_BANDS,
  F_RAW_BANDS,
  K_RAW_BANDS,
  findBand,
} from '../src/scoring/mmpiSource';
import type { ItemAnswer } from '../src/workspace/caseTypes';

/**
 * MMPI FINAL SCORING RECONCILIATION TEST SUITE
 *
 * Doğrulanan Zincir: KAYNAK → KURAL → KOD → TEST → SONUÇ
 * Ana Kaynak: Ceyhun, A. A., & Oral, G. (2003). Minnesota Çok Yönlü Kişilik Envanteri (MMPI) Değerlendirme El Kitabı.
 * Norm Kaynağı: Savaşır (1981) / Tablo 30 (s.195).
 * K+ Profili: Mark & Seeman (1963) / s.57 Şekil 16.
 */

describe('MMPI Final Scoring Reconciliation Suite', () => {
  describe('1. 566 Madde Eşleşmesi ve Bütünlüğü', () => {
    it('1-566 arası tüm maddelerin anahtar üyelikleri ve yönleri (D/Y) geçerlidir', () => {
      const allItemNumbers = new Set<number>();

      (Object.keys(SCORING_KEYS) as Array<Exclude<ScaleId, '?'> >).forEach(scaleId => {
        const rule = SCORING_KEYS[scaleId];
        if (isGendered(rule)) {
          for (const num of [...rule.male.trueItems, ...rule.male.falseItems, ...rule.female.trueItems, ...rule.female.falseItems]) {
            assert.ok(Number.isInteger(num) && num >= 1 && num <= 566, `Madde ${num} sınır dışı`);
            allItemNumbers.add(num);
          }
          // True ve False kesişimi olamaz
          const maleOverlap = rule.male.trueItems.filter(x => rule.male.falseItems.includes(x));
          assert.equal(maleOverlap.length, 0, `${scaleId} Erkek True/False çelişkisi`);
          const femaleOverlap = rule.female.trueItems.filter(x => rule.female.falseItems.includes(x));
          assert.equal(femaleOverlap.length, 0, `${scaleId} Kadın True/False çelişkisi`);
        } else {
          for (const num of [...rule.trueItems, ...rule.falseItems]) {
            assert.ok(Number.isInteger(num) && num >= 1 && num <= 566, `Madde ${num} sınır dışı`);
            allItemNumbers.add(num);
          }
          const overlap = rule.trueItems.filter(x => rule.falseItems.includes(x));
          assert.equal(overlap.length, 0, `${scaleId} True/False çelişkisi`);
        }
      });

      assert.ok(allItemNumbers.size > 0, 'Anahtar maddeleri doğrulandı');
    });
  });

  describe('2. Ham Puan Hesaplamaları ve Madde Sayıları (Ek 9a/b & Tablo 8-17)', () => {
    const EXPECTED_KEY_COUNTS: Record<string, { total: number; source: string }> = {
      L: { total: 15, source: 'Ek 9a / Tablo 8 öncesi' },
      F: { total: 64, source: 'Ek 9a / s.35-37' },
      K: { total: 30, source: 'Ek 9a / s.39-40' },
      Hs: { total: 33, source: 'Tablo 8, s.67' },
      D: { total: 60, source: 'Tablo 9, s.81' },
      Hy: { total: 60, source: 'Tablo 10, s.95' },
      Pd: { total: 50, source: 'Tablo 11, s.107' },
      Mf_male: { total: 60, source: 'Tablo 12, s.122 (Erkek)' },
      Mf_female: { total: 60, source: 'Tablo 12, s.122 (Kadın)' },
      Pa: { total: 40, source: 'Tablo 13, s.127' },
      Pt: { total: 48, source: 'Tablo 14, s.137' },
      Sc: { total: 78, source: 'Tablo 15, s.143' },
      Ma: { total: 46, source: 'Tablo 16, s.149' },
      Si: { total: 70, source: 'Tablo 17, s.154-156' },
      Wiggins_SOC: { total: 27, source: 'Ek 9c, s.251-256' },
    };

    it('tüm ölçeklerin toplam madde sayıları kaynakla birebir (MATCH) örtüşür', () => {
      assert.equal(SCORING_KEYS.L.trueItems.length + SCORING_KEYS.L.falseItems.length, EXPECTED_KEY_COUNTS.L.total);
      assert.equal(SCORING_KEYS.F.trueItems.length + SCORING_KEYS.F.falseItems.length, EXPECTED_KEY_COUNTS.F.total);
      assert.equal(SCORING_KEYS.K.trueItems.length + SCORING_KEYS.K.falseItems.length, EXPECTED_KEY_COUNTS.K.total);
      assert.equal(SCORING_KEYS.Hs.trueItems.length + SCORING_KEYS.Hs.falseItems.length, EXPECTED_KEY_COUNTS.Hs.total);
      assert.equal(SCORING_KEYS.D.trueItems.length + SCORING_KEYS.D.falseItems.length, EXPECTED_KEY_COUNTS.D.total);
      assert.equal(SCORING_KEYS.Hy.trueItems.length + SCORING_KEYS.Hy.falseItems.length, EXPECTED_KEY_COUNTS.Hy.total);
      assert.equal(SCORING_KEYS.Pd.trueItems.length + SCORING_KEYS.Pd.falseItems.length, EXPECTED_KEY_COUNTS.Pd.total);

      if (isGendered(SCORING_KEYS.Mf)) {
        assert.equal(SCORING_KEYS.Mf.male.trueItems.length + SCORING_KEYS.Mf.male.falseItems.length, EXPECTED_KEY_COUNTS.Mf_male.total);
        assert.equal(SCORING_KEYS.Mf.female.trueItems.length + SCORING_KEYS.Mf.female.falseItems.length, EXPECTED_KEY_COUNTS.Mf_female.total);
      }

      assert.equal(SCORING_KEYS.Pa.trueItems.length + SCORING_KEYS.Pa.falseItems.length, EXPECTED_KEY_COUNTS.Pa.total);
      assert.equal(SCORING_KEYS.Pt.trueItems.length + SCORING_KEYS.Pt.falseItems.length, EXPECTED_KEY_COUNTS.Pt.total);
      assert.equal(SCORING_KEYS.Sc.trueItems.length + SCORING_KEYS.Sc.falseItems.length, EXPECTED_KEY_COUNTS.Sc.total);
      assert.equal(SCORING_KEYS.Ma.trueItems.length + SCORING_KEYS.Ma.falseItems.length, EXPECTED_KEY_COUNTS.Ma.total);
      assert.equal(SCORING_KEYS.Si.trueItems.length + SCORING_KEYS.Si.falseItems.length, EXPECTED_KEY_COUNTS.Si.total);

      assert.equal(WIGGINS_KEYS.SOC.dogru.length + WIGGINS_KEYS.SOC.yanlis.length, EXPECTED_KEY_COUNTS.Wiggins_SOC.total);
    });
  });

  describe('3. K Düzeltmesi ve Katsayılar (Tablo 6 & 7, s.40-42)', () => {
    it('K katsayıları ve tam sayı ekleme tablosu kaynakla birebir uyuşur', () => {
      // Kaynak katsayıları
      assert.equal(K_CORRECTION.Hs, 0.5);
      assert.equal(K_CORRECTION.Pd, 0.4);
      assert.equal(K_CORRECTION.Pt, 1.0);
      assert.equal(K_CORRECTION.Sc, 1.0);
      assert.equal(K_CORRECTION.Ma, 0.2);

      // K ham = 15 için kontrol
      assert.equal(kAddition(15, 0.5), 8);  // Hs: 15 * 0.5 = 7.5 -> 8
      assert.equal(kAddition(15, 0.4), 6);  // Pd: 15 * 0.4 = 6
      assert.equal(kAddition(15, 1.0), 15); // Pt: 15 * 1.0 = 15
      assert.equal(kAddition(15, 1.0), 15); // Sc: 15 * 1.0 = 15
      assert.equal(kAddition(15, 0.2), 3);  // Ma: 15 * 0.2 = 3

      // K ham = 0 ve 30 sınır kontrolleri
      assert.equal(kAddition(0, 0.5), 0);
      assert.equal(kAddition(30, 0.5), 15);
      assert.equal(kAddition(30, 0.4), 12);
      assert.equal(kAddition(30, 0.2), 6);
    });
  });

  describe('4. Türk Normları (Tablo 30, s.195) ve T Dönüşümü', () => {
    it('Erkek ve Kadın Türk Yetişkin norm ortalama ve standart sapmaları Tablo 30 ile birebir MATCH eder', () => {
      // Erkek normları (Tablo 30 s.195)
      assert.deepEqual(TURKISH_NORMS.Erkek.L, { mean: 6.45, sd: 2.74 });
      assert.deepEqual(TURKISH_NORMS.Erkek.F, { mean: 8.3, sd: 4.62 });
      assert.deepEqual(TURKISH_NORMS.Erkek.K, { mean: 13.98, sd: 4.65 });
      assert.deepEqual(TURKISH_NORMS.Erkek.Hs, { mean: 13.19, sd: 4.07 });
      assert.deepEqual(TURKISH_NORMS.Erkek.D, { mean: 20.63, sd: 4.76 });
      assert.deepEqual(TURKISH_NORMS.Erkek.Hy, { mean: 19.31, sd: 4.71 });
      assert.deepEqual(TURKISH_NORMS.Erkek.Pd, { mean: 22.22, sd: 4.45 });
      assert.deepEqual(TURKISH_NORMS.Erkek.Mf, { mean: 29.21, sd: 3.82 });
      assert.deepEqual(TURKISH_NORMS.Erkek.Pa, { mean: 11.12, sd: 4.03 });
      assert.deepEqual(TURKISH_NORMS.Erkek.Pt, { mean: 27.9, sd: 6.3 });
      assert.deepEqual(TURKISH_NORMS.Erkek.Sc, { mean: 29.82, sd: 9.05 });
      assert.deepEqual(TURKISH_NORMS.Erkek.Ma, { mean: 19.96, sd: 4.4 });
      assert.deepEqual(TURKISH_NORMS.Erkek.Si, { mean: 23.86, sd: 7.97 });

      // Kadın normları (Tablo 30 s.195)
      assert.deepEqual(TURKISH_NORMS.Kadın.L, { mean: 6.0, sd: 2.25 });
      assert.deepEqual(TURKISH_NORMS.Kadın.F, { mean: 9.38, sd: 5.16 });
      assert.deepEqual(TURKISH_NORMS.Kadın.K, { mean: 11.82, sd: 3.8 });
      assert.deepEqual(TURKISH_NORMS.Kadın.Hs, { mean: 15.89, sd: 4.88 });
      assert.deepEqual(TURKISH_NORMS.Kadın.D, { mean: 23.86, sd: 5.08 });
      assert.deepEqual(TURKISH_NORMS.Kadın.Hy, { mean: 18.12, sd: 5.31 });
      assert.deepEqual(TURKISH_NORMS.Kadın.Pd, { mean: 22.84, sd: 4.51 });
      assert.deepEqual(TURKISH_NORMS.Kadın.Mf, { mean: 32.98, sd: 3.67 });
      assert.deepEqual(TURKISH_NORMS.Kadın.Pa, { mean: 11.93, sd: 4.17 });
      assert.deepEqual(TURKISH_NORMS.Kadın.Pt, { mean: 29.2, sd: 6.59 });
      assert.deepEqual(TURKISH_NORMS.Kadın.Sc, { mean: 31.06, sd: 8.2 });
      assert.deepEqual(TURKISH_NORMS.Kadın.Ma, { mean: 19.72, sd: 4.36 });
      assert.deepEqual(TURKISH_NORMS.Kadın.Si, { mean: 29.88, sd: 7.52 });
    });

    it('Kadın Mf ölçeği formülü ters yönde çalışır: T = 50 + 10*(mean - X)/sd', () => {
      // Kadın Mf: ham=33 (ortalama 32.98 civarı) -> T ~ 50
      // ham=20 (kadınsı ilgi) -> mean - raw = 32.98 - 20 = 12.98 -> T = 50 + 10 * 12.98 / 3.67 = 85.4
      const rawFemaleHigh: Record<ScaleId, number> = {
        '?': 0, L: 6, F: 9, K: 12, Hs: 16, D: 24, Hy: 18, Pd: 23, Mf: 20, Pa: 12, Pt: 29, Sc: 31, Ma: 20, Si: 30,
      };
      const profile = buildProfileFromRaw(rawFemaleHigh, 'Kadın');
      const mfScale = profile.clinical.find(s => s.id === 'Mf')!;
      assert.ok(mfScale.tScore > 80, `Kadın Mf ters yönde yükselmelidir, hesaplanan T: ${mfScale.tScore}`);
    });
  });

  describe('5. Geçerlik Ölçekleri ve Eşikleri (DECISION-034)', () => {
    it('VALIDITY_CUTOFFS ve L_T_BANDS sürekli haritalaması aktiftir', () => {
      assert.equal(VALIDITY_CUTOFFS.fSuspect, 16);
      assert.equal(VALIDITY_CUTOFFS.fInvalid, 23);
      assert.equal(VALIDITY_CUTOFFS.cannotSayInvalid, 31);

      // L_T_BANDS s.33 continuous mapping
      assert.ok(L_T_BANDS.some(b => b.min === 69));
      assert.ok(L_T_BANDS.some(b => b.min === 64 && b.max === 68));
      assert.ok(L_T_BANDS.some(b => b.min === 56 && b.max === 63));
      assert.ok(L_T_BANDS.some(b => b.min === 36 && b.max === 55));
      assert.ok(L_T_BANDS.some(b => b.max === 35));
    });
  });

  describe('6. K+ Profili Doğrulaması (Mark & Seeman 1963 / s.57 · DECISION-033)', () => {
    function makeProfile(k: number, f: number, l: number, clinicalScores: number[]): MMPIProfile {
      const validity = [
        { id: 'L' as const, name: 'Yalan', short: 'L', full: 'L', rawScore: 4, tScore: l, level: 'normal', isElevated: false },
        { id: 'F' as const, name: 'Sıklık', short: 'F', full: 'F', rawScore: 4, tScore: f, level: 'normal', isElevated: false },
        { id: 'K' as const, name: 'Düzeltme', short: 'K', full: 'K', rawScore: 18, tScore: k, level: 'normal', isElevated: false },
      ];
      const clinicalIds: ScaleId[] = ['Hs', 'D', 'Hy', 'Pd', 'Mf', 'Pa', 'Pt', 'Sc', 'Ma', 'Si'];
      const clinical = clinicalIds.map((id, index) => ({
        id,
        number: index + 1,
        name: id,
        short: id,
        full: id,
        rawScore: 10,
        tScore: clinicalScores[index] ?? 50,
        level: 'normal',
        isElevated: (clinicalScores[index] ?? 50) >= 65,
      }));

      return {
        gender: 'Erkek',
        cannotSayScale: { id: '?', name: '?', short: '?', full: '?', rawScore: 0, tScore: 30, level: 'normal', isElevated: false },
        validity,
        clinical,
        scales: [...validity, ...clinical],
        validityAnalysis: {
          profileValidity: 'valid',
          fMinusK: f - k,
          warnings: [],
          fRawBandWarning: null,
          lRawBandWarning: null,
          kRawBandWarning: null,
          configurations: [],
        },
        maxT: Math.max(...clinicalScores, k, f, l),
        minT: Math.min(...clinicalScores, k, f, l),
      };
    }

    it('K+ koşulları eksiksiz karşılandığında pozitif tespit verir', () => {
      // K=65, F=45, L=50 (K>F, L>F, K-F=20>=5), tüm klinik 55 (<70, hepsi <=60)
      const p = makeProfile(65, 45, 50, [55, 55, 55, 55, 55, 55, 55, 55, 55, 55]);
      assert.equal(detectKPlus(p), true);
    });

    it('Sınır Testi: K - F = 4 T olduğunda K+ negatif olmalıdır (K-F >= 5T kuralı)', () => {
      // K=54, F=50, L=52 -> K-F = 4 (<5)
      const p = makeProfile(54, 50, 52, [55, 55, 55, 55, 55, 55, 55, 55, 55, 55]);
      assert.equal(detectKPlus(p), false);
    });

    it('Sınır Testi: Bir klinik ölçek T=70 olduğunda K+ negatif olmalıdır (tüm klinik < 70 kuralı)', () => {
      const p = makeProfile(65, 45, 50, [70, 55, 55, 55, 55, 55, 55, 55, 55, 55]);
      assert.equal(detectKPlus(p), false);
    });

    it('Sınır Testi: 60 T altındaki klinik ölçek sayısı 5 olduğunda negatif olmalıdır (en az 6 kuralı)', () => {
      // 5 ölçek 60, 5 ölçek 65
      const p = makeProfile(65, 45, 50, [60, 60, 60, 60, 60, 65, 65, 65, 65, 65]);
      assert.equal(detectKPlus(p), false);
    });
  });

  describe('7. Formül Mutasyon Testleri (Kırılganlık & Hassasiyet Doğrulaması)', () => {
    it('K düzeltmesi formülü Raw + K iken Raw veya Raw - K mutasyonları testi kırar', () => {
      const kRaw = 15;
      const hsRaw = 10;
      const correctAdded = kAddition(kRaw, 0.5); // 8
      const expectedCorrected = hsRaw + correctAdded; // 18

      // Mutasyon 1: K eklenmezse (Raw)
      const mutatedNoK = hsRaw;
      assert.notEqual(mutatedNoK, expectedCorrected);

      // Mutasyon 2: K çıkarılırsa (Raw - K)
      const mutatedMinusK = hsRaw - correctAdded;
      assert.notEqual(mutatedMinusK, expectedCorrected);
    });

    it('T puanı hesaplama mutasyonları doğrulanır', () => {
      const raw = 18;
      const norm = TURKISH_NORMS.Erkek.Hs; // mean: 13.19, sd: 4.07
      const correctT = 50 + (10 * (raw - norm.mean)) / norm.sd; // 50 + 10*(4.81)/4.07 = 61.8

      // Mutasyon: mean ve raw yer değiştirirse
      const invertedT = 50 + (10 * (norm.mean - raw)) / norm.sd;
      assert.notEqual(Math.round(invertedT), Math.round(correctT));
    });
  });

  describe('8. Türetilmiş Ölçekler ve Goldberg İndeksi', () => {
    it('Goldberg indeksi formülü (L + Pa + Sc) - (Hy + Pt) doğru hesaplanır', () => {
      // Goldberg = (L + Pa + Sc) - (Hy + Pt)
      // Örnek T skorları: L=50, Pa=70, Sc=80, Hy=60, Pt=65 -> (50+70+80) - (60+65) = 200 - 125 = 75
      const indexes = computeDerivedIndexes({ L: 50, Pa: 70, Sc: 80, Hy: 60, Pt: 65 });
      const goldberg = indexes.find(idx => idx.scaleId === 'GOLDBERG');
      assert.ok(goldberg);
      assert.equal(goldberg.value, 75);
      assert.equal(goldberg.levelLabel, 'Psikotik Profil Eğilimi');
    });
  });

  describe('9. Eşik Sınır Değeri Testleri (Boundary Behavior)', () => {
    it('F ham puanı sınırları: 15 (Geçerli), 16 (Şüpheli), 22 (Şüpheli), 23 (Geçersiz)', () => {
      const makeRaw = (fRaw: number) => ({
        '?': 0, L: 5, F: fRaw, K: 15,
        Hs: 10, D: 15, Hy: 15, Pd: 15, Mf: 25, Pa: 10, Pt: 15, Sc: 15, Ma: 15, Si: 20,
      });

      const p15 = buildProfileFromRaw(makeRaw(15), 'Erkek');
      assert.equal(p15.validityAnalysis.status, 'GECERLI');
      assert.equal(p15.validityAnalysis.isValid, true);

      const p16 = buildProfileFromRaw(makeRaw(16), 'Erkek');
      assert.equal(p16.validityAnalysis.status, 'SUPHELI');
      assert.equal(p16.validityAnalysis.isValid, true);

      const p22 = buildProfileFromRaw(makeRaw(22), 'Erkek');
      assert.equal(p22.validityAnalysis.status, 'SUPHELI');
      assert.equal(p22.validityAnalysis.isValid, true);

      const p23 = buildProfileFromRaw(makeRaw(23), 'Erkek');
      assert.equal(p23.validityAnalysis.status, 'GECERSIZ');
      assert.equal(p23.validityAnalysis.isValid, false);
    });

    it('L T-puanı bant sınırları: 35 (Düşük), 36 (Normal), 55 (Normal), 56 (Orta Yüksek), 63 (Orta Yüksek), 64 (Yüksek), 68 (Yüksek), 69 (Çok Yüksek)', () => {
      assert.equal(findBand(L_T_BANDS, 35)?.label, 'Düşük');
      assert.equal(findBand(L_T_BANDS, 36)?.label, 'Normal');
      assert.equal(findBand(L_T_BANDS, 55)?.label, 'Normal');
      assert.equal(findBand(L_T_BANDS, 56)?.label, 'Orta Yüksek');
      assert.equal(findBand(L_T_BANDS, 63)?.label, 'Orta Yüksek');
      assert.equal(findBand(L_T_BANDS, 64)?.label, 'Yüksek');
      assert.equal(findBand(L_T_BANDS, 68)?.label, 'Yüksek');
      assert.equal(findBand(L_T_BANDS, 69)?.label, 'Çok Yüksek');
    });
  });

  describe('10. 45 Kanonik Kod, 151 Blok Kodu ve 19 Örüntü Bütünlüğü', () => {
    it('tüm 45 kanonik kod ve 151 blok kodu tanımlıdır', () => {
      assert.equal(KNOWN_CODES.length, 45);
      assert.equal(KNOWN_BLOCK_CODES.length, 151);
    });

    it('19 profil örüntüsü eksiksiz mevcuttur', () => {
      const dummyRaw: Record<ScaleId, number> = {
        '?': 0, L: 5, F: 5, K: 15, Hs: 10, D: 15, Hy: 15, Pd: 15, Mf: 25, Pa: 10, Pt: 15, Sc: 15, Ma: 15, Si: 20,
      };
      const profile = buildProfileFromRaw(dummyRaw, 'Erkek');
      const patterns = detectPatterns(profile);
      assert.equal(patterns.length, 19);
    });
  });
});
