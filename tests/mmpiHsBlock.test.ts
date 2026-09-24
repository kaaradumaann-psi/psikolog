import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  codeInterpretation,
  resolveCodeInterpretation,
  activeCodeConditions,
  CodeScaleKey,
} from '../src/scoring/mmpiSourceCodes';

describe('DECISION-031/A — Hs (Hipokondriasis / 1) Bloğu Kod Yorumları ve Koşulları (s.67-78)', () => {
  const ctx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey) => ({
    t: (id: CodeScaleKey) => over[id],
    third,
  });

  describe('Hs Bloğu Kod Gövdeleri Çözümleme ve Sadakat', () => {
    it('123/213 kodu Hs bloğundan çözümlenir ve tanıları tamdır (s.68-69)', () => {
      const e = codeInterpretation('123')!;
      assert.ok(e, '123 tanımlı olmalı');
      assert.equal(e.code, '123/213');
      assert.equal(e.block, 'Hs');
      assert.match(e.text, /belirgin bir somatizasyon bozukluğu/);
      assert.match(e.text, /içgörüleri oldukça sınırlıdır/);
      assert.ok(e.diagnosis?.includes('Belirgin somatizasyon bozukluğu ve hipokondriyak uğraşlar'));
      assert.ok(e.diagnosis?.includes('Pasif-bağımlı kişilik bozukluğu'));
      assert.ok(e.diagnosis?.includes('Depresive bozukluk') || e.diagnosis?.includes('Depresif bozukluk'));
    });

    it('123 ile 132 çakışmaz — digit sıralaması 3 haneli kodlarda bozulmaz', () => {
      const e123 = codeInterpretation('123')!;
      const e132 = codeInterpretation('132')!;
      assert.equal(e123.code, '123/213');
      assert.equal(e132.code, '132/312');
      assert.notEqual(e123.text, e132.text);
      assert.match(e132.text, /klasik "nevrotik triad" yükselmesidir/);
    });

    it('1234, 1236, 1237, 1270 ve 12378 kodları doğru çözümlenir (s.69-70)', () => {
      const e1234 = codeInterpretation('1234')!;
      assert.equal(e1234.code, '1234');
      assert.ok(e1234.diagnosis?.includes('Pasif-agresif kişilik'));

      const e1236 = codeInterpretation('1236')!;
      assert.equal(e1236.code, '1236');
      assert.match(e1236.text, /kuşkuculuk, alınganlık ve paranoid eğilimler/);

      const e1237 = codeInterpretation('1237')!;
      assert.equal(e1237.code, '1237');
      assert.ok(e1237.diagnosis?.includes('Pasif bağımlı kişilik yapısında anksiyete ve psikofizyolojik reaksiyon'));

      const e1270 = codeInterpretation('1270')!;
      assert.equal(e1270.code, '1270');
      assert.match(e1270.text, /sosyal olarak son derece içe çekilmiş/);

      const e12378 = codeInterpretation('12378')!;
      assert.equal(e12378.code, '12378');
      assert.match(e12378.text, /ağır bir psikopatolojiye işaret eder/);
    });

    it('128, 129 ve 120 kodları çözümlenir (s.70)', () => {
      const e128 = codeInterpretation('128')!;
      assert.equal(e128.code, '128/218');
      assert.match(e128.text, /bizar somatik düşünceler/);

      const e129 = codeInterpretation('129')!;
      assert.equal(e129.code, '129/219');
      assert.match(e129.text, /organik beyin sendromu/);

      const e120 = codeInterpretation('120')!;
      assert.equal(e120.code, '120/210');
      assert.match(e120.text, /sosyal ilişkilerden tamamen elini eteğini çekmiş/);
    });

    it('134, 1342, 136, 137, 138, 1382 ve 139 kodları çözümlenir (s.73-76)', () => {
      const e134 = codeInterpretation('134')!;
      assert.equal(e134.code, '134/314');
      assert.match(e134.text, /öfke, düşmanlık ve isyan/);

      const e1342 = codeInterpretation('1342')!;
      assert.equal(e1342.code, '1342');
      assert.match(e1342.text, /dürtüsel eğilimlerle birlikte belirgin depresyon/);

      const e136 = codeInterpretation('136')!;
      assert.equal(e136.code, '136/316');
      assert.match(e136.text, /paranoid eğilimler, alınganlık ve kuşkuculuk/);

      const e137 = codeInterpretation('137')!;
      assert.equal(e137.code, '137');
      assert.match(e137.text, /panik, endişe ve felaket beklentisi/);

      const e138 = codeInterpretation('138')!;
      assert.equal(e138.code, '138/318');
      assert.ok(e138.diagnosis?.includes('Borderline kişilik bozukluğu'));

      const e1382 = codeInterpretation('1382')!;
      assert.equal(e1382.code, '1382');
      assert.match(e1382.text, /nihilistik hezeyanlar/);

      const e139 = codeInterpretation('139')!;
      assert.equal(e139.code, '139');
      assert.ok(e139.diagnosis?.some(d => d.includes('Somatoform bozukluk')));
    });

    it('Yüksek 1 / Düşük 4, 146 ve 1469 kodları çözümlenir (s.76)', () => {
      const e14low4 = codeInterpretation('Yüksek 1 / Düşük 4')!;
      assert.equal(e14low4.code, 'Yüksek 1 / Düşük 4');
      assert.match(e14low4.text, /Yüksek 1\/Düşük 4 örüntüsü/);

      const e146 = codeInterpretation('146')!;
      assert.equal(e146.code, '146');
      assert.match(e146.text, /somatik yakınmalar, dürtüsellik ve belirgin paranoid kuşkuculuk/);

      const e1469 = codeInterpretation('1469')!;
      assert.equal(e1469.code, '1469');
      assert.match(e1469.text, /somatik meşguliyetler, antisosyal dürtüler, paranoid kuşkuculuk ve aşırı psikomotor/);
    });
  });

  describe('Hs Bloğu Koşullu Yorumları (Conditions)', () => {
    it('12/21 koşulları: Hy 5 T farkı ve Pd+Ma yüksekliği tetiklenir (s.68)', () => {
      const e12 = resolveCodeInterpretation('12')!;
      // 1) 3 alt testi 1'in 5 T puanı alanı içinde
      const c1 = activeCodeConditions(e12, ctx({ Hs: 72, Hy: 70 }));
      assert.ok(c1.some(c => c.quote.includes('123/213 kodlarına da bakınız')));

      // 2) Pd ve Ma yüksekliği
      const c2 = activeCodeConditions(e12, ctx({ Pd: 75, Ma: 72 }));
      assert.ok(c2.some(c => c.quote.includes('Pd, Ma ve Mf alt testleri')));
    });

    it('13/31 koşulları: Düşük 2 ve 2,7,8,9 yüksekliği tetiklenir (s.72)', () => {
      const e13 = resolveCodeInterpretation('13')!;
      // Düşük 2
      const cLow2 = activeCodeConditions(e13, ctx({ D: 45 }));
      assert.ok(cLow2.some(c => c.quote.includes('Düşük 2')));

      // 2, 7, 8, 9 yüksek + K düşük
      const cHighAll = activeCodeConditions(e13, ctx({ D: 75, Pt: 72, Sc: 74, Ma: 71, K: 42 }));
      assert.ok(cHighAll.some(c => c.quote.includes('2, 7, 8 ve 9 alt testleri 70 T puanının üzerinde')));

      // L ve K yüksek
      const cLK = activeCodeConditions(e13, ctx({ L: 72, K: 75 }));
      assert.ok(cLK.some(c => c.quote.includes('L ve K alt testleri 70 T puanının üzerinde')));
    });

    it('14/41 koşulu: Hy >= 70 aile ve evlilik sorunları uyarısı (s.76)', () => {
      const e14 = resolveCodeInterpretation('14')!;
      assert.equal(activeCodeConditions(e14, ctx({ Hy: 75 })).length, 1);
      assert.equal(activeCodeConditions(e14, ctx({ Hy: 60 })).length, 0);
    });

    it('16/61 koşulları: Sc >= 70 ve Pd < 70 Paranoid Şizofreni (s.77)', () => {
      const e16 = resolveCodeInterpretation('16')!;
      const act = activeCodeConditions(e16, ctx({ Sc: 75, Pd: 62 }));
      assert.equal(act.length, 2);
      assert.ok(act.some(c => c.quote.includes('somatik delüzyonların')));
      assert.ok(act.some(c => c.quote.includes('Paranoid Şizofreni')));
    });

    it('18/81 koşulu: F >= 70 şizofreni riski (s.77)', () => {
      const e18 = resolveCodeInterpretation('18')!;
      assert.equal(activeCodeConditions(e18, ctx({ F: 75 })).length, 1);
      assert.equal(activeCodeConditions(e18, ctx({ F: 62 })).length, 0);
    });

    it('19/91 koşulu: 2 ve 3 < 50 T (s.78)', () => {
      const e19 = resolveCodeInterpretation('19')!;
      assert.equal(activeCodeConditions(e19, ctx({ D: 45, Hy: 48 })).length, 1);
      assert.equal(activeCodeConditions(e19, ctx({ D: 55, Hy: 48 })).length, 0);
    });

    it('10/01 koşulları: üçüncü test 8 veya 2 ve 3 > 70 T (s.78)', () => {
      const e01 = resolveCodeInterpretation('01')!;
      const actThird = activeCodeConditions(e01, ctx({}, 'Sc'));
      assert.ok(actThird.some(c => c.quote.includes('Üçüncü yükselen alt test 8')));

      const actMasked = activeCodeConditions(e01, ctx({ D: 74, Hy: 72 }));
      assert.ok(actMasked.some(c => c.quote.includes('maskeli depresyon')));
    });

    it('136/316 koşulları: Pa - Hy >= 10 ve Hy - Pa >= 10 farkları (s.74)', () => {
      const e136 = resolveCodeInterpretation('136')!;
      const actPa = activeCodeConditions(e136, ctx({ Pa: 75, Hy: 60 }));
      assert.equal(actPa.length, 1);
      assert.ok(actPa[0].quote.includes('Pa alt testi Hy alt testinden 10 T'));

      const actHy = activeCodeConditions(e136, ctx({ Pa: 58, Hy: 70 }));
      assert.equal(actHy.length, 1);
      assert.ok(actHy[0].quote.includes('Hy alt testi Pa alt testinden 10 T'));
    });

    it('137 koşulu: Ma yüksek veya K < 50 intihar riski (s.75)', () => {
      const e137 = resolveCodeInterpretation('137')!;
      assert.equal(activeCodeConditions(e137, ctx({ Ma: 75 })).length, 1);
      assert.equal(activeCodeConditions(e137, ctx({ K: 42 })).length, 1);
      assert.equal(activeCodeConditions(e137, ctx({ Ma: 50, K: 60 })).length, 0);
    });

    it('139 koşulu: Pd yüksek ve K < 50 eyleme vurukluk (s.76)', () => {
      const e139 = resolveCodeInterpretation('139')!;
      assert.equal(activeCodeConditions(e139, ctx({ Pd: 75, K: 45 })).length, 1);
      assert.equal(activeCodeConditions(e139, ctx({ Pd: 75, K: 55 })).length, 0);
    });
  });
});
