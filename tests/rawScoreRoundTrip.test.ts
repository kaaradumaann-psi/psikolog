import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProfileFromRawScoresObject } from '../src/scoring/mmpiScoring';
import { K_CORRECTION, kAddition, TURKISH_NORMS, type ScaleId } from '../src/scoring/mmpiKeys';
import {
  buildRawPayload,
  RAW_SCORE_FIELDS,
  RAW_SCORE_MAX,
  rawScoresComplete,
} from '../src/workspace/caseTypes';
import type { RawScores } from '../src/workspace/caseTypes';

/**
 * "Ham puan" (raw score) yöntemi uçtan uca regresyon testi.
 *
 * Kullanıcı raporundaki sorun 4: "Yöntem bölümünde ham puan hesabının
 * gerçekten çalıştığını kontrol et ve test et."
 *
 * Bu test referans T puanlarını test içi formülle (bağımsız yol) değil,
 * YAYINLANMIŞ Türk norm değerlerinden elle hesaplanmış sabitlerle doğrular:
 *   T = 50 + 10·(düzeltilmiş ham − ortalama) / SD   (Kadın Mf: işaret ters)
 * K düzeltmeleri standardizasyon tablosundan (0.5K/0.4K/1K/0.2K → tam sayı
 * ek) hesaplanır. Böylece manuel giriş → ham haritası → K düzeltmesi →
 * T dönüşümü → düzey/geçerlik/profil kodu zincirinin tamamı tek başına
 * tutarlılıkla kanıtlanmış olur (aşağıdaki sabitler bu zincirin parçalarının
 * herhangi birinde hata olursa çelişir).
 */

const MALE_PROTOCOL: RawScores = {
  blank: 5, L: 4, F: 8, K: 3,
  Hs: 5, D: 11, Hy: 10, Pd: 13, Mf: 8, Pa: 9, Pt: 7, Sc: 12, Ma: 6, Si: 8,
};

// Elle hesaplanan referans (Erkek normları + K=3 düzeltme tablosu):
//   Hs: 5 + kAdd(3,0.5)=2 → 7      T = 50 + 10·(7−13.19)/4.07   = 34.8
//   D:  11 (K yok)             T = 50 + 10·(11−20.63)/4.76     = 29.8
//   Hy: 10 (K yok)             T = 50 + 10·(10−19.31)/4.71     = 30.2
//   Pd: 13 + kAdd(3,0.4)=2 → 15   T = 50 + 10·(15−22.22)/4.45   = 33.8
//   Mf: 8                       T = 50 + 10·(8−29.21)/3.82     = −5.5 → 20 (sıkışma)
//   Pa: 9                       T = 50 + 10·(9−11.12)/4.03     = 44.7
//   Pt: 7 + kAdd(3,1.0)=3 → 10    T = 50 + 10·(10−27.9)/6.3     = 21.6
//   Sc: 12 + 3 → 15              T = 50 + 10·(15−29.82)/9.05    = 33.6
//   Ma: 6 + kAdd(3,0.2)=1 → 7     T = 50 + 10·(7−19.96)/4.4     = 20.5
//   Si: 8                       T = 50 + 10·(8−23.86)/7.97     = 30.1
//   L:  4                       T = 50 + 10·(4−6.45)/2.74      = 41.1
//   F:  8                       T = 50 + 10·(8−8.3)/4.62       = 49.4
//   K:  3                       T = 50 + 10·(3−13.98)/4.65     = 26.4
//   ?:  5 → T(boş) = 30 + 5·2   = 40
const MALE_EXPECTED_T: Record<string, number> = {
  '?': 40, L: 41.1, F: 49.4, K: 26.4,
  Hs: 34.8, D: 29.8, Hy: 30.2, Pd: 33.8, Mf: 20, Pa: 44.7, Pt: 21.6, Sc: 33.6, Ma: 20.5, Si: 30.1,
};
const MALE_EXPECTED_K_ADDED: Record<string, number | undefined> = {
  Hs: 2, Pd: 2, Pt: 3, Sc: 3, Ma: 1,
};

function profileScale(profile: ReturnType<typeof buildProfileFromRawScoresObject>, id: string) {
  const found = profile.scales.find(s => s.id === id);
  assert.ok(found, `ölçek eksik: ${id}`);
  return found;
}

test('ham puan: erkek protokolü K düzeltmesi ve T dönüşümüyle uçtan uca doğru hesaplanır', () => {
  const profile = buildProfileFromRawScoresObject(MALE_PROTOCOL, 'Erkek');

  for (const [id, expectedT] of Object.entries(MALE_EXPECTED_T)) {
    const scale = profileScale(profile, id as ScaleId);
    assert.equal(scale.tScore, expectedT, `${id} T puanı (beklenen ${expectedT}, bulunan ${scale.tScore})`);
  }
  for (const [id, added] of Object.entries(MALE_EXPECTED_K_ADDED)) {
    const scale = profileScale(profile, id as ScaleId);
    assert.equal(scale.kAdded, added, `${id} K eklemesi`);
    assert.equal(scale.kCorrectedRaw, (scale.rawScore as number) + (added as number), `${id} düzeltilmiş ham`);
  }
  // K eklemesi olmayan ölçeklerde düzeltme sahası boş kalmalı.
  for (const id of ['D', 'Hy', 'Mf', 'Pa', 'Si', 'L', 'F', 'K'] as ScaleId[]) {
    assert.equal(profileScale(profile, id).kAdded, undefined, `${id} K eklemesi olmamalı`);
  }

  assert.equal(profile.cannotSayScale.rawScore, 5);
  assert.equal(profile.rawScores['?'], 5);
  assert.equal(profile.validityAnalysis.isValid, true);
  assert.equal(profile.validityAnalysis.status, 'GECERLI');
  assert.equal(profile.validityAnalysis.fMinusK, 5);

  // Profil kodu: Mf/Si hariç en yüksek iki klinik ölçek → Pa(44.7)="6", Hs(34.8)="1".
  assert.equal(profile.profileCode, '61');
  assert.equal(profile.maxT, 49.4);
  assert.equal(profile.minT, 20);
});

test('ham puan: T formülü cinsiyet normlarına göre bağımsız olarak da tutarlı (Kadın Mf ters işaret)', () => {
  const female: RawScores = {
    blank: 3, L: 5, F: 10, K: 0,
    Hs: 8, D: 12, Hy: 9, Pd: 14, Mf: 30, Pa: 8, Pt: 9, Sc: 13, Ma: 7, Si: 20,
  };
  const profile = buildProfileFromRawScoresObject(female, 'Kadın');

  // Kadın Mf: T = 50 + 10·(32.98 − 30)/3.67 = 58.1 (ters formül)
  assert.equal(profileScale(profile, 'Mf').tScore, 58.1);
  // Erkek aynı ham Mf=30 ile: 50 + 10·(30 − 29.21)/3.82 = 52.1 (normal formül)
  const maleSame = buildProfileFromRawScoresObject({ ...female }, 'Erkek');
  assert.equal(profileScale(maleSame, 'Mf').tScore, 52.1);

  // Her ölçekte: test içi formül (yayın normlarından) profil çıktısını doğrular.
  for (const id of ['L', 'F', 'K', 'Hs', 'D', 'Hy', 'Pd', 'Mf', 'Pa', 'Pt', 'Sc', 'Ma', 'Si'] as ScaleId[]) {
    const norm = TURKISH_NORMS['Kadın'][id];
    const raw = female[id as keyof RawScores] as number;
    const added = id in K_CORRECTION ? kAddition(0, K_CORRECTION[id]!) : 0;
    const corrected = raw + added;
    const expected =
      id === 'Mf'
        ? 50 + (10 * (norm.mean - corrected)) / norm.sd
        : 50 + (10 * (corrected - norm.mean)) / norm.sd;
    const clamped = Math.max(20, Math.min(120, expected));
    assert.equal(profileScale(profile, id).tScore, Math.round(clamped * 10) / 10, `Kadın ${id} T`);
  }
});

test('ham puan: T aralığı 20–120 arasında sıkıştırılır (uç ham değerler)', () => {
  const zeroSc: RawScores = { ...MALE_PROTOCOL, Sc: 0, K: 0 };
  const highSc: RawScores = { ...MALE_PROTOCOL, Sc: 78, K: 30 };

  const low = buildProfileFromRawScoresObject(zeroSc, 'Erkek');
  // K=0 → Sc düzeltilmiş 0 → 50 − 32.95 = 17.05 → 20'ye sıkışır.
  assert.equal(profileScale(low, 'Sc').tScore, 20);

  const high = buildProfileFromRawScoresObject(highSc, 'Erkek');
  // K=30 → Sc: 78+30=108 → 50 + 10·(108−29.82)/9.05 = 136.4 → 120'ye sıkışır.
  assert.equal(profileScale(high, 'Sc').tScore, 120);
  assert.equal(profileScale(high, 'Sc').kAdded, 30);
});

test('ham puan: alan sınırı (RAW_SCORE_MAX) giriş ve payload birlikte doğrulanır', () => {
  // Alan tanımları ile sınır haritası aynı kaynaktan gelir.
  for (const field of RAW_SCORE_FIELDS) {
    assert.equal(RAW_SCORE_MAX[field.key], field.max);
  }

  const incomplete: RawScores = { ...MALE_PROTOCOL, K: '' };
  assert.equal(rawScoresComplete(incomplete), false);
  assert.equal(rawScoresComplete(MALE_PROTOCOL), true);

  const outOfRange: RawScores = { ...MALE_PROTOCOL, K: 31 };
  assert.equal(rawScoresComplete(outOfRange), false);
  assert.throws(() => buildRawPayload(outOfRange), /sınır dışında|eksik/);

  // Sınır değeri kabul edilir (K=30 tam sınır).
  const atMax: RawScores = { ...MALE_PROTOCOL, K: 30 };
  assert.equal(rawScoresComplete(atMax), true);
  const payload = buildRawPayload(atMax);
  assert.equal(payload.kind, 'raw-scores');
  assert.equal(payload.version, 1);
  assert.equal(payload.scales.K, 30);
});
