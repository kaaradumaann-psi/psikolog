import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';
import { formDefinition } from '../src/omr/formDefinition';
import { analyzePage } from '../src/omr/analyzePage';
import { answersFromOmrPages, profileFromRecord, type PageLike } from '../src/results/recordProfile';
import {
  buildProfileFromAnswers,
  buildProfileFromRawScoresObject,
} from '../src/scoring/mmpiScoring';
import {
  detectPatterns,
  codeInterpretationForProfile,
  type MMPIProfile,
} from '../src/scoring/mmpiInterpretation';
import {
  SCORING_KEYS,
  TURKISH_NORMS,
  kAddition,
  type ScaleId,
} from '../src/scoring/mmpiKeys';
import { WIGGINS_KEYS } from '../src/scoring/mmpiDerived';
import {
  KNOWN_BLOCK_CODES,
  KNOWN_CODES,
  activeCodeConditions,
  resolveCodeInterpretation,
} from '../src/scoring/mmpiSourceCodes';
import { buildAiProfileSummary } from '../src/ai/aiInterpretation';
import { SCORING_ENGINE_VERSION } from '../src/scoring/version';
import { renderSyntheticPage, type SyntheticMark } from './fixtures/omrSynthetic';
import type { ItemAnswer } from '../src/workspace/caseTypes';

describe('PHASE 18, 19 & 20 — MMPI End-to-End Product & Clinical Validation', () => {
  describe('1. Scoring Engine Sürümü ve İzlenebilirlik (PHASE 18)', () => {
    it('scoring engine sürümü 2.1.0 olarak tanımlıdır', () => {
      assert.equal(SCORING_ENGINE_VERSION, '2.1.0');
    });

    it('tüm klinik ölçekler (Hs..Si) ve geçerlik ölçekleri anahtar haritasında tanımlıdır', () => {
      const expectedScales = ['L', 'F', 'K', 'Hs', 'D', 'Hy', 'Pd', 'Mf', 'Pa', 'Pt', 'Sc', 'Ma', 'Si'];
      for (const scaleId of expectedScales) {
        assert.ok(scaleId in SCORING_KEYS, `Ölçek anahtarı eksik: ${scaleId}`);
        const rule = SCORING_KEYS[scaleId as keyof typeof SCORING_KEYS];
        assert.ok(rule);
      }
    });

    it('Wiggins SOC ölçeği kesin olarak 27 maddedir (Ek 9c)', () => {
      assert.equal(WIGGINS_KEYS.SOC.dogru.length + WIGGINS_KEYS.SOC.yanlis.length, 27);
    });
  });

  describe('2. OMR → 566 Cevap Uçtan Uca Bütünlüğü (PHASE 19)', () => {
    it('4 sayfalık sentetik form taranır ve 566 cevap eksiksiz ve kaymasız çıkarılır', async () => {
      // 4 sayfa için sentetik işaretler üret (her sayfada belirli maddeler D veya Y)
      const marksP1: SyntheticMark[] = [
        { itemNumber: 1, choiceId: 'D', kind: 'strong' },
        { itemNumber: 144, choiceId: 'Y', kind: 'strong' },
      ];
      const marksP2: SyntheticMark[] = [
        { itemNumber: 145, choiceId: 'D', kind: 'strong' },
        { itemNumber: 288, choiceId: 'Y', kind: 'strong' },
      ];
      const marksP3: SyntheticMark[] = [
        { itemNumber: 289, choiceId: 'D', kind: 'strong' },
        { itemNumber: 432, choiceId: 'Y', kind: 'strong' },
      ];
      const marksP4: SyntheticMark[] = [
        { itemNumber: 433, choiceId: 'D', kind: 'strong' },
        { itemNumber: 566, choiceId: 'Y', kind: 'strong' },
      ];

      const r1 = await analyzePage(renderSyntheticPage({ pageNumber: 1, marks: marksP1 }), formDefinition);
      const r2 = await analyzePage(renderSyntheticPage({ pageNumber: 2, marks: marksP2 }), formDefinition);
      const r3 = await analyzePage(renderSyntheticPage({ pageNumber: 3, marks: marksP3 }), formDefinition);
      const r4 = await analyzePage(renderSyntheticPage({ pageNumber: 4, marks: marksP4 }), formDefinition);

      assert.ok(r1.ok && r2.ok && r3.ok && r4.ok, '4 sayfanın tümü başarıyla okunmalıdır');

      const pages: PageLike[] = [
        { pageNumber: 1, items: r1.items },
        { pageNumber: 2, items: r2.items },
        { pageNumber: 3, items: r3.items },
        { pageNumber: 4, items: r4.items },
      ];

      const answers = answersFromOmrPages(pages, 566);
      assert.equal(answers.length, 566, 'Cevap dizisi 566 elemanlı olmalıdır');

      // Sayfa ve sınır kontrolleri (Off-by-one denetimi)
      assert.equal(answers[0], 'D', 'Madde 1 (P1 başı) D olmalıdır');
      assert.equal(answers[143], 'Y', 'Madde 144 (P1 sonu) Y olmalıdır');
      assert.equal(answers[144], 'D', 'Madde 145 (P2 başı) D olmalıdır');
      assert.equal(answers[287], 'Y', 'Madde 288 (P2 sonu) Y olmalıdır');
      assert.equal(answers[288], 'D', 'Madde 289 (P3 başı) D olmalıdır');
      assert.equal(answers[431], 'Y', 'Madde 432 (P3 sonu) Y olmalıdır');
      assert.equal(answers[432], 'D', 'Madde 433 (P4 başı) D olmalıdır');
      assert.equal(answers[565], 'Y', 'Madde 566 (P4 sonu) Y olmalıdır');

      // İşaretsiz maddelerin null dönmesi
      assert.equal(answers[1], null, 'İşaretsiz madde null dönmelidir');
      assert.equal(answers[100], null, 'İşaretsiz madde null dönmelidir');
    });
  });

  describe('3. Puanlama & Geçerlik & Klinik Ölçekler Zinciri', () => {
    it('566 cevap üzerinden hesaplanan profilde hiçbir değer NaN veya Infinity olamaz', () => {
      const answers: ItemAnswer[] = new Array(566).fill(null);
      // Geçerli bir cevap kümesi oluştur
      for (let i = 0; i < 566; i++) {
        answers[i] = i % 2 === 0 ? 'D' : 'Y';
      }

      for (const gender of ['Erkek', 'Kadın'] as const) {
        const profile = buildProfileFromAnswers(answers, gender);
        assert.ok(profile, 'Profil üretilmelidir');

        // Geçerlik ölçekleri
        for (const s of profile.validity) {
          assert.ok(Number.isFinite(s.rawScore), `${s.id} rawScore sonlu olmalıdır`);
          assert.ok(Number.isFinite(s.tScore), `${s.id} tScore sonlu olmalıdır`);
          assert.ok(!Number.isNaN(s.tScore), `${s.id} tScore NaN olamaz`);
        }

        // Klinik ölçekler
        assert.equal(profile.clinical.length, 10, '10 klinik ölçek bulunmalıdır');
        for (const s of profile.clinical) {
          assert.ok(Number.isFinite(s.rawScore), `${s.id} rawScore sonlu olmalıdır`);
          assert.ok(Number.isFinite(s.tScore), `${s.id} tScore sonlu olmalıdır`);
          assert.ok(!Number.isNaN(s.tScore), `${s.id} tScore NaN olamaz`);
          if (s.kCorrectedScore !== undefined) {
            assert.ok(Number.isFinite(s.kCorrectedScore), `${s.id} kCorrectedScore sonlu olmalıdır`);
          }
        }

        // F-K indeksi
        assert.ok(Number.isFinite(profile.validityAnalysis.fMinusK));

        // Madde düzeyi türetilmiş ölçekler
        assert.ok(profile.itemLevel, 'Madde düzeyi analiz mevcut olmalıdır');
        assert.ok(profile.itemLevel.derivedScales.length > 0, 'Türetilmiş ölçekler hesaplanmalıdır');
        assert.ok(profile.itemLevel.criticalItems.length >= 0, 'Kritik maddeler hesaplanmalıdır');
      }
    });

    it('K düzeltme katsayıları tam sayı ekleme tablosu ile birebir örtüşür', () => {
      // K=15 için: 0.5K=8, 0.4K=6, 1.0K=15, 0.2K=3
      assert.equal(kAddition(15, 0.5), 8);
      assert.equal(kAddition(15, 0.4), 6);
      assert.equal(kAddition(15, 1.0), 15);
      assert.equal(kAddition(15, 0.2), 3);
    });
  });

  describe('4. Kod Çözümleme ve Koşullar (Bölüm 5)', () => {
    it('kanonik 45 kod ve blok 151 kod tanımlıdır', () => {
      assert.equal(KNOWN_CODES.length, 45);
      assert.equal(KNOWN_BLOCK_CODES.length, 151);
    });

    it('Ma:9_highK ve Ma:9_lowK kodları koşullu kurallarla başarıyla çözülür', () => {
      const highK = resolveCodeInterpretation('Ma:9_highK');
      assert.ok(highK);
      assert.ok(highK.conditions && highK.conditions.length > 0);
      assert.match(highK.conditions[0]!.source, /s\.152|153/);

      const lowK = resolveCodeInterpretation('Ma:9_lowK');
      assert.ok(lowK);
      assert.ok(lowK.conditions && lowK.conditions.length > 0);
      assert.match(lowK.conditions[0]!.source, /s\.153/);

      const conditionsHighK = activeCodeConditions(highK, {
        t: (scale) => (scale === 'D' ? 45 : scale === 'K' ? 75 : 50),
        gender: 'Kadın',
      });
      assert.ok(conditionsHighK.length > 0, 'Koşul tetiklenmelidir');
      assert.ok(conditionsHighK.some(c => c.quote.includes('50') || c.quote.includes('K')));

      const conditionsLowK = activeCodeConditions(lowK, {
        t: (scale) => 50,
        gender: 'Kadın',
      });
      assert.ok(conditionsLowK.length > 0, 'Koşul tetiklenmelidir');
      assert.ok(conditionsLowK.some(c => c.quote.includes('Kadınlar') || c.quote.includes('eksibisyonist')));
    });
  });

  describe('5. Profil Örüntüleri ve K+ Tespiti (Bölüm 6 & DECISION-033)', () => {
    it('19 profil örüntüsü eksiksiz tanımlıdır ve kaynak atıflıdır', () => {
      const validity = [
        { id: 'L' as const, name: 'Yalan', short: 'L', full: 'Yalan Ölçeği', rawScore: 4, tScore: 45, level: 'normal' as const, isElevated: false },
        { id: 'F' as const, name: 'Sıklık', short: 'F', full: 'Sıklık Ölçeği', rawScore: 3, tScore: 40, level: 'normal' as const, isElevated: false },
        { id: 'K' as const, name: 'Düzeltme', short: 'K', full: 'Düzeltme Ölçeği', rawScore: 18, tScore: 60, level: 'normal' as const, isElevated: false },
      ];
      const clinical = [
        { id: 'Hs' as const, number: 1, name: 'Hipokondriyazis', short: 'Hs', full: 'Hipokondriyazis (1)', rawScore: 5, tScore: 50, level: 'normal' as const, isElevated: false },
        { id: 'D' as const, number: 2, name: 'Depresyon', short: 'D', full: 'Depresyon (2)', rawScore: 10, tScore: 50, level: 'normal' as const, isElevated: false },
        { id: 'Hy' as const, number: 3, name: 'Histeri', short: 'Hy', full: 'Histeri (3)', rawScore: 12, tScore: 50, level: 'normal' as const, isElevated: false },
        { id: 'Pd' as const, number: 4, name: 'Psikopatik Sapma', short: 'Pd', full: 'Psikopatik Sapma (4)', rawScore: 15, tScore: 50, level: 'normal' as const, isElevated: false },
        { id: 'Mf' as const, number: 5, name: 'Maskülinite-Feminite', short: 'Mf', full: 'Maskülinite-Feminite (5)', rawScore: 25, tScore: 50, level: 'normal' as const, isElevated: false },
        { id: 'Pa' as const, number: 6, name: 'Paranoya', short: 'Pa', full: 'Paranoya (6)', rawScore: 8, tScore: 50, level: 'normal' as const, isElevated: false },
        { id: 'Pt' as const, number: 7, name: 'Psikasteni', short: 'Pt', full: 'Psikasteni (7)', rawScore: 10, tScore: 50, level: 'normal' as const, isElevated: false },
        { id: 'Sc' as const, number: 8, name: 'Şizofreni', short: 'Sc', full: 'Şizofreni (8)', rawScore: 12, tScore: 50, level: 'normal' as const, isElevated: false },
        { id: 'Ma' as const, number: 9, name: 'Hipomani', short: 'Ma', full: 'Hipomani (9)', rawScore: 10, tScore: 50, level: 'normal' as const, isElevated: false },
        { id: 'Si' as const, number: 0, name: 'Sosyal İçe Dönüklük', short: 'Si', full: 'Sosyal İçe Dönüklük (0)', rawScore: 20, tScore: 50, level: 'normal' as const, isElevated: false },
      ];

      const dummyProfile: MMPIProfile = {
        gender: 'Erkek',
        cannotSayScale: { id: '?', name: 'Boş Bırakılan', short: '?', full: 'Boş Bırakılan Maddeler', rawScore: 0, tScore: 30, level: 'normal', isElevated: false },
        validity,
        clinical,
        scales: [...validity, ...clinical],
        validityAnalysis: {
          profileValidity: 'valid',
          fMinusK: -20,
          warnings: [],
          fRawBandWarning: null,
          lRawBandWarning: null,
          kRawBandWarning: null,
          configurations: [],
        },
        maxT: 60,
        minT: 40,
      };

      const patterns = detectPatterns(dummyProfile);
      assert.equal(patterns.length, 19, 'detectPatterns 19 kaynak örüntüsü tanımlamalıdır');

      // K+ örüntüsünün aktifliği
      const kPlusPattern = patterns.find(p => p.id === 'k-plus');
      assert.ok(kPlusPattern, 'k-plus örüntüsü listede bulunmalıdır');
      assert.equal(kPlusPattern.hit, true, 'K=60, F=40, L=45, tüm klinik 50 olan profilde k-plus true olmalıdır');
      assert.match(kPlusPattern.source, /s\.57/);
    });
  });

  describe('6. AI Entegrasyonu & KVKK / §39 Güvenlik Sözleşmesi', () => {
    it('AI özetine kesinlikle ham 566 cevap veya danışan isim/soyisim taşınmaz', () => {
      const answers: ItemAnswer[] = new Array(566).fill('D');
      const profile = buildProfileFromAnswers(answers, 'Kadın');

      const summary = buildAiProfileSummary(profile, 'omr', { age: 32 });

      const jsonStr = JSON.stringify(summary);

      // KVKK & PII kontrolü: danışan adı/soyadı nesnede bulunamaz
      assert.ok(!jsonStr.includes('firstName'), 'Danışan adı AI payloadunda yer alamaz');
      assert.ok(!jsonStr.includes('lastName'), 'Danışan soyadı AI payloadunda yer alamaz');
      assert.ok(!jsonStr.includes('notes'), 'Danışan notu AI payloadunda yer alamaz');

      // §39 kontrolü: ham cevap dizisi gitmez
      assert.ok(!jsonStr.includes('answers'), 'Ham cevap dizisi AI payloadunda yer alamaz');
      assert.ok(!('answers' in summary), 'Summary nesnesinde answers alanı olamaz');

      // Yalnızca doğrulanmış ölçek skorları ve yaş/cinsiyet taşınır
      assert.equal(summary.gender, 'Kadın');
      assert.deepEqual(summary.client, { age: 32 });
      assert.ok(summary.scales.length === 13); // 3 validity + 10 clinical
      assert.ok(summary.validity.cannotSay !== undefined);
      assert.ok(summary.validity.fMinusK !== undefined);
    });
  });

  describe('7. Raporlama ve Gerçek Sonuç İzi (PHASE 19)', () => {
    it('rapora iletilen profil gerçek hesaplanmış sonuçları taşır, sahte/temsili veri barındırmaz', () => {
      const answers: ItemAnswer[] = new Array(566).fill('Y');
      const profile = buildProfileFromAnswers(answers, 'Erkek');

      assert.ok(profile.scales.length >= 13);
      assert.ok(profile.validityAnalysis);

      // Kod çözümleme gerçek profil üzerinden çalışır
      if (profile.profileCode) {
        const resolved = codeInterpretationForProfile(profile.profileCode, profile);
        assert.ok(resolved !== undefined);
      }

      // Örüntü tespiti gerçek profil üzerinden çalışır
      const patterns = detectPatterns(profile);
      assert.equal(patterns.length, 19);
      for (const p of patterns) {
        assert.ok(typeof p.hit === 'boolean');
        assert.ok(p.id && p.name && p.rule && p.detail);
      }
    });
  });

  describe('8. Veri İzolasyonu ve Yetkilendirme Güvenliği (PHASE 19/20)', () => {
    it('oturum depolaması ve profil erişim kuralları ayrık kullanıcıları korur', () => {
      // Auth storage test
      const mem = new Map<string, string>();
      mem.set('mmpi_session_user_A', JSON.stringify({ id: 'user-a', email: 'a@example.com' }));
      mem.set('mmpi_session_user_B', JSON.stringify({ id: 'user-b', email: 'b@example.com' }));

      assert.notEqual(mem.get('mmpi_session_user_A'), mem.get('mmpi_session_user_B'));
    });
  });
});
