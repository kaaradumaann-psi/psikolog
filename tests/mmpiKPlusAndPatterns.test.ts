import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildProfileFromRawScoresObject } from '../src/scoring/mmpiScoring';
import {
  detectKPlus,
  detectPatterns,
} from '../src/scoring/mmpiInterpretation';
import {
  resolveCodeInterpretation,
  activeCodeConditions,
  BLOCK_CODES,
} from '../src/scoring/mmpiSourceCodes';
import {
  L_RAW_BANDS,
  K_RAW_BANDS,
  F_RAW_BANDS,
  L_T_BANDS,
  F_T_BANDS,
  VALIDITY_CUTOFFS,
} from '../src/scoring/mmpiSource';
import { WIGGINS_KEYS } from '../src/scoring/mmpiDerived';

describe('PHASE 16 & 17 — K+ Profili, K-İlişkili Örüntüler ve Eşik Doğrulama', () => {
  const mockProfile = (overrides: Record<string, number>, gender: 'Erkek' | 'Kadın' = 'Erkek') =>
    buildProfileFromRawScoresObject(
      {
        blank: 0,
        L: 4,
        F: 3,
        K: 15,
        Hs: 12,
        D: 18,
        Hy: 18,
        Pd: 14,
        Mf: 22,
        Pa: 8,
        Pt: 12,
        Sc: 14,
        Ma: 14,
        Si: 20,
        ...overrides,
      } as never,
      gender,
    );

  describe('PHASE 16 — K+ Profili (Mark & Seeman 1963 · s.57 · MISSING-KPLUS-001)', () => {
    it('pozitif örnek: K ve L > F, K - F ≥ 5 T, klinik < 70 T, ≥ 6 klinik ≤ 60 T → K+ vurur', () => {
      // L=8 (T ~55), F=3 (T ~42), K=18 (T ~58) -> K-F = 16 >= 5, K>F, L>F
      // Tüm klinik ölçekler < 70 T ve hepsi ≤ 60 T
      const p = mockProfile({ L: 8, F: 3, K: 18, Hs: 10, D: 16, Hy: 16, Pd: 12, Mf: 20, Pa: 7, Pt: 10, Sc: 12, Ma: 12, Si: 18 });
      assert.equal(detectKPlus(p), true);

      const patterns = detectPatterns(p);
      const kp = patterns.find(pt => pt.id === 'k-plus');
      assert.ok(kp, 'k-plus örüntüsü mevcut olmalıdır');
      assert.equal(kp.hit, true);
      assert.equal(kp.source, 's.57 · Şekil 16');
      assert.match(kp.quote ?? '', /Mark ve Seeman \(1963\) bu tür profilleri K\+ profili olarak adlandırmaktadır/);
    });

    it('negatif sınır 1: K - F < 5 T puanı ise K+ vurmaz (K=50 T, F=48 T, fark=2)', () => {
      // K ve F birbirine çok yakın (fark < 5)
      const p = mockProfile({ L: 8, F: 6, K: 12 });
      assert.equal(detectKPlus(p), false);
      const kp = detectPatterns(p).find(pt => pt.id === 'k-plus')!;
      assert.equal(kp.hit, false);
    });

    it('negatif sınır 2: L ≤ F ise K+ vurmaz', () => {
      // K > F (fark ≥ 5) fakat L ≤ F
      const p = mockProfile({ L: 2, F: 6, K: 20 });
      assert.equal(detectKPlus(p), false);
    });

    it('negatif sınır 3: Bir klinik ölçek ≥ 70 T ise K+ vurmaz (kaynak: hiçbir klinik ölçek 70 T üstü olamaz)', () => {
      // Hs raw 26 -> T ~100 >= 70
      const p = mockProfile({ L: 8, F: 3, K: 18, Hs: 26 });
      assert.equal(detectKPlus(p), false);
    });

    it('negatif sınır 4: 6 taneden az klinik ölçek ≤ 60 T ise K+ vurmaz (kaynak: 6 veya daha çok klinik ≤ 60 T olmalıdır)', () => {
      // 5 ölçek 61-69 T arasında tutulup yalnızca 5 ölçek ≤ 60 T bırakıldığında
      const p = mockProfile({
        L: 8, F: 3, K: 18,
        Hs: 18, // T ~65 (> 60)
        D: 28,  // T ~68 (> 60)
        Hy: 27, // T ~67 (> 60)
        Pd: 27, // T ~64 (> 60)
        Mf: 32, // T ~65 (> 60)
        Pa: 7,  // T ~45 (<= 60)
        Pt: 10, // T ~44 (<= 60)
        Sc: 12, // T ~43 (<= 60)
        Ma: 12, // T ~43 (<= 60)
        Si: 18, // T ~45 (<= 60)
      });
      assert.equal(detectKPlus(p), false);
    });
  });

  describe('PHASE 16 — K-İlişkili Örüntüler (CONFLICT-039 · s.152-153)', () => {
    it('Ma:9_highK (Yüksek 9 / Yüksek K) kod gövdesi ve çapraz takma adları çözümlenir', () => {
      const entry1 = resolveCodeInterpretation('9_highK');
      assert.ok(entry1);
      assert.equal(entry1.code, 'Yüksek 9 / Yüksek K');
      assert.equal(entry1.block, 'Ma');
      assert.match(entry1.text, /enerjik, organize/);

      const entry2 = resolveCodeInterpretation('Ma:high9_highK');
      assert.ok(entry2);
      assert.equal(entry2.code, 'Yüksek 9 / Yüksek K');

      const entry3 = resolveCodeInterpretation('Ma:9K');
      assert.ok(entry3);
      assert.equal(entry3.code, 'Yüksek 9 / Yüksek K');
    });

    it('Ma:9_highK koşulları profille tetiklenir (D < 50, K > 70, kadınlarda Mf < 40)', () => {
      const entry = resolveCodeInterpretation('9_highK');
      assert.ok(entry);

      // 1) D < 50 T koşulu
      const condsD = activeCodeConditions(entry, {
        t: (scale) => (scale === 'D' ? 45 : 60),
        gender: 'Erkek',
      });
      assert.ok(condsD.some(c => c.quote.includes('2 alt testi T: 50\'nin altında ise')));

      // 2) K > 70 T koşulu
      const condsK = activeCodeConditions(entry, {
        t: (scale) => (scale === 'K' ? 75 : 60),
        gender: 'Erkek',
      });
      assert.ok(condsK.some(c => c.quote.includes('K alt testi 70 T puanının üzerine çıkarsa')));

      // 3) Kadınlarda Mf < 40 T koşulu
      const condsMfKadın = activeCodeConditions(entry, {
        t: (scale) => (scale === 'Mf' ? 35 : 60),
        gender: 'Kadın',
      });
      assert.ok(condsMfKadın.some(c => c.quote.includes('Kadınlar fiziksel çekicilik konusunda teşhircidirler')));
    });

    it('Ma:9_lowK (Yüksek 9 / Düşük K) kod gövdesi çözümlenir ve kadın koşulunu içerir', () => {
      const entry = resolveCodeInterpretation('9_lowK');
      assert.ok(entry);
      assert.equal(entry.code, 'Yüksek 9 / Düşük K');
      assert.match(entry.text, /Narsisistik kişilerdir/);

      const condsKadın = activeCodeConditions(entry, {
        t: () => 50,
        gender: 'Kadın',
      });
      assert.ok(condsKadın.some(c => c.quote.includes('Kadınlar, eksibisyonist bir biçimde')));
    });
  });

  describe('PHASE 17 — Eşik ve Bant Doğrulamaları', () => {
    it('L T bantları (CONFLICT-003): 69+, 64-68, 56-63, 36-55, ≤35 sürekli aralık kapsar', () => {
      assert.equal(L_T_BANDS.length, 5);
      assert.equal(L_T_BANDS[0].min, 69);
      assert.equal(L_T_BANDS[1].min, 64);
      assert.equal(L_T_BANDS[2].max, 63);
      assert.equal(L_T_BANDS[3].min, 36);
      assert.equal(L_T_BANDS[4].max, 35);
    });

    it('F ham bantları ve geçerlik kesmeleri (CONFLICT-004): VALIDITY_CUTOFFS ile uyumludur', () => {
      assert.equal(VALIDITY_CUTOFFS.fSuspect, 16);
      assert.equal(VALIDITY_CUTOFFS.fInvalid, 23);
      assert.equal(VALIDITY_CUTOFFS.cannotSayInvalid, 31);
      assert.equal(F_RAW_BANDS.length, 5);
    });

    it('L_RAW_BANDS ve K_RAW_BANDS üretim skorlamasında ve uyarı üretiminde korunur', () => {
      assert.ok(L_RAW_BANDS.length >= 4);
      assert.ok(K_RAW_BANDS.length >= 5);

      // L ham ≥ 8 uyarısı
      const pLHigh = mockProfile({ L: 9 });
      assert.ok(pLHigh.validityAnalysis.warnings.some(w => w.includes('L ham 9')));

      // K ham ≥ 21 uyarısı
      const pKHigh = mockProfile({ K: 22 });
      assert.ok(pKHigh.validityAnalysis.warnings.some(w => w.includes('K ham 22')));
    });

    it('Wiggins SOC ölçeği (CONFLICT-021 · DECISION-024): Ek 9c ye göre 27 madde olarak doğrulanmıştır', () => {
      const socKey = WIGGINS_KEYS.SOC;
      const totalItems = socKey.dogru.length + socKey.yanlis.length;
      assert.equal(totalItems, 27);
      assert.equal(socKey.dogru.length, 13);
      assert.equal(socKey.yanlis.length, 14);
    });
  });
});
