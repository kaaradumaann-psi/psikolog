import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  codeInterpretation,
  resolveCodeInterpretation,
  activeCodeConditions,
  CodeScaleKey,
} from '../src/scoring/mmpiSourceCodes';

describe('DECISION-031/A — D (Depresyon / 2) Bloğu Kod Yorumları ve Koşulları (s.82-94)', () => {
  const ctx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey, gender?: 'Erkek' | 'Kadın') => ({
    t: (id: CodeScaleKey) => over[id],
    third,
    gender,
  });

  describe('D Bloğu Kod Gövdeleri Çözümleme ve Sadakat', () => {
    it('213/231 kodları D bloğundan çözümlenir ve tanıları tamdır (s.83-84)', () => {
      const e = codeInterpretation('213')!;
      assert.ok(e, '213 tanımlı olmalı');
      assert.equal(e.code, '213/231');
      assert.equal(e.block, 'D');
      assert.match(e.text, /Yorumu 21 koduna benzerdir/);
      assert.match(e.text, /gülümseyen bir depresyon olabilir/);
      assert.ok(e.diagnosis?.includes('Depresif reaksiyon ya da somatoform bozukluk'));

      // 231 kodu da aynı gövdeye çözümlenir
      const e231 = codeInterpretation('231')!;
      assert.equal(e231.code, '213/231');
      assert.equal(e231.text, e.text);
    });

    it('243/432 ve 247/427/472/742 kodları çözümlenir (s.85-86)', () => {
      const e243 = codeInterpretation('243')!;
      assert.equal(e243.code, '243/432');
      assert.match(e243.text, /kızgınlığı bastırma ve inkar yoluyla duygusal kontrol/);

      const e247 = codeInterpretation('247')!;
      assert.equal(e247.code, '247/427/472/742');
      assert.ok(e247.diagnosis?.includes('Pasif-agresif kişilik bozukluğu'));
      assert.ok(e247.diagnosis?.includes('Depresif semptomlar'));
      assert.ok(e247.diagnosis?.includes('Anksiyete bozukluğu'));
    });

    it('248 ve 248 / Yüksek F kodları çözümlenir (s.86)', () => {
      const e248 = codeInterpretation('248')!;
      assert.equal(e248.code, '248');
      assert.match(e248.text, /kızgınlık içeren fanteziler kurarlar/);

      const e248F = codeInterpretation('248/F')!;
      assert.equal(e248F.code, '248 / Yüksek F');
      assert.match(e248F.text, /Temel şizofrenik konfigürasyon/);
      assert.ok(e248F.diagnosis?.includes('Temel şizofrenik konfigürasyon'));
    });

    it('273, 274, 275, 278 ve 270 kodları çözümlenir (s.88-90)', () => {
      const e273 = codeInterpretation('273')!;
      assert.equal(e273.code, '273/723');
      assert.match(e273.text, /Bu hastalar pasiftir/);

      const e274 = codeInterpretation('274')!;
      assert.equal(e274.code, '274/724');
      assert.ok(e274.diagnosis?.includes('Depresif reaksiyon'));

      const e275 = codeInterpretation('275')!;
      assert.equal(e275.code, '275/725');
      assert.match(e275.text, /aynı şeyler üzerinde durmaya ek olarak, çekingenlik görülür/);

      const e278 = codeInterpretation('278')!;
      assert.equal(e278.code, '278/728');
      assert.match(e278.text, /intihar düşüncesi ya da girişimi olasılığı yüksektir/);

      const e270 = codeInterpretation('270')!;
      assert.equal(e270.code, '270');
      assert.ok(e270.diagnosis?.includes('Şizoid kişilik bozukluğu'));
    });

    it('281, 284, 287 ve 207 kodları çözümlenir (s.90-92)', () => {
      const e281 = codeInterpretation('281')!;
      assert.equal(e281.code, '281/821');
      assert.match(e281.text, /çok çeşitli somatik yakınmaları vardır/);

      const e284 = codeInterpretation('284')!;
      assert.equal(e284.code, '284/824');
      assert.match(e284.text, /kızgınlık, isyankarlık ve düşmanlık duyguları ön plandadır/);

      const e287 = codeInterpretation('287')!;
      assert.equal(e287.code, '287/827');
      assert.match(e287.text, /anksiyete, ajitasyon ve panik benzeri belirtiler/);

      const e207 = codeInterpretation('207')!;
      assert.equal(e207.code, '207');
      assert.match(e207.text, /gergin, kaygılı, ürkek kişilerdir/);
    });
  });

  describe('D Bloğu Koşullu Yorumları (Conditions)', () => {
    it('23 kodu koşulları: düşük Mf/Ma apati uyarısı (s.83)', () => {
      const e23 = resolveCodeInterpretation('23')!;
      const actMa = activeCodeConditions(e23, ctx({ Ma: 40 }));
      assert.ok(actMa.some(c => c.quote.includes('düşük Mf ya da düşük Ma')));
      assert.ok(actMa.some(c => c.quote.includes('özellikle düşük 9')));
    });

    it('24/42 koşulu: 3, 7 veya 8 üçüncü yükselen test (s.84)', () => {
      const e24 = resolveCodeInterpretation('24')!;
      assert.equal(activeCodeConditions(e24, ctx({}, 'Pt')).length, 1);
      assert.equal(activeCodeConditions(e24, ctx({}, 'Ma')).length, 0);
    });

    it('27/72 koşulu: Hs >= 70 T somatik yakınma uyarısı (s.87)', () => {
      const e27 = resolveCodeInterpretation('27')!;
      const actHs = activeCodeConditions(e27, ctx({ Hs: 75 }));
      assert.ok(actHs.some(c => c.quote.includes('Hs alt testi de yükselmişse')));
    });

    it('20/02 koşulu: 7 veya 4 üçüncü yükselen test (s.92)', () => {
      const e02 = resolveCodeInterpretation('02')!;
      assert.equal(activeCodeConditions(e02, ctx({}, 'Pt')).length, 1);
      assert.equal(activeCodeConditions(e02, ctx({}, 'Ma')).length, 0);
    });

    it('213/231 koşulu: Pt >= 70 T endişe uyarısı (s.84)', () => {
      const e213 = resolveCodeInterpretation('213')!;
      assert.equal(activeCodeConditions(e213, ctx({ Pt: 75 })).length, 1);
      assert.equal(activeCodeConditions(e213, ctx({ Pt: 60 })).length, 0);
    });

    it('247/427 koşulları: Erkek Mf >= 70 ve Kadın Mf < 50 cinsiyet ayrımı (s.85-86)', () => {
      const e247 = resolveCodeInterpretation('247')!;
      const actErkek = activeCodeConditions(e247, ctx({ Mf: 75 }, undefined, 'Erkek'));
      assert.equal(actErkek.length, 1);
      assert.ok(actErkek[0].quote.includes('erkekler, genellikle bağımlı'));

      const actKadin = activeCodeConditions(e247, ctx({ Mf: 40 }, undefined, 'Kadın'));
      assert.equal(actKadin.length, 1);
      assert.ok(actKadin[0].quote.includes('Kadınlar (özellikle Mf alt testi düşükse)'));
    });

    it('274/724 koşulları: Hy >= 70 kronik alkolizm (s.88)', () => {
      const e274 = resolveCodeInterpretation('274')!;
      const actHy = activeCodeConditions(e274, ctx({ Hy: 75 }));
      assert.ok(actHy.some(c => c.quote.includes('kronik alkolizm')));
    });

    it('275/725 koşulu: Pd < 50 T yetersizlik (s.89)', () => {
      const e275 = resolveCodeInterpretation('275')!;
      assert.equal(activeCodeConditions(e275, ctx({ Pd: 42 })).length, 1);
      assert.equal(activeCodeConditions(e275, ctx({ Pd: 60 })).length, 0);
    });

    it('278/728 kritik intihar koşulları: K & Hs < 50 veya Ma >= 70 (s.89)', () => {
      const e278 = resolveCodeInterpretation('278')!;
      // K ve Hs düşük
      const actSuicide1 = activeCodeConditions(e278, ctx({ K: 42, Hs: 45 }));
      assert.ok(actSuicide1.some(c => c.quote.includes('intihar olasılığı dikkatle değerlendirilmelidir')));

      // Ma yüksek
      const actSuicide2 = activeCodeConditions(e278, ctx({ Ma: 75 }));
      assert.ok(actSuicide2.some(c => c.quote.includes('intihar olasılığı dikkatle değerlendirilmelidir')));

      // Si yüksek kronik depresyon
      const actSi = activeCodeConditions(e278, ctx({ Si: 75 }));
      assert.ok(actSi.some(c => c.quote.includes('Si alt testi yükselmişse')));
    });

    it('284/824 koşulu: Pd > 80 T kontrol kaybı korkusu (s.91)', () => {
      const e284 = resolveCodeInterpretation('284')!;
      assert.equal(activeCodeConditions(e284, ctx({ Pd: 85 })).length, 1);
      assert.equal(activeCodeConditions(e284, ctx({ Pd: 75 })).length, 0);
    });

    it('287/827 koşulu: K < 50 ve Ma >= 70 kritik intihar riski (s.91)', () => {
      const e287 = resolveCodeInterpretation('287')!;
      assert.equal(activeCodeConditions(e287, ctx({ K: 45, Ma: 75 })).length, 1);
      assert.equal(activeCodeConditions(e287, ctx({ K: 55, Ma: 75 })).length, 0);
    });
  });
});
