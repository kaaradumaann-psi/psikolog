import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  codeInterpretation,
  resolveCodeInterpretation,
  activeCodeConditions,
  CodeScaleKey,
} from '../src/scoring/mmpiSourceCodes';

describe('DECISION-031/A — Pd (Psikopatik Sapma / 4) Bloğu Kod Yorumları ve Koşulları (s.107-121)', () => {
  const ctx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey, gender?: 'Erkek' | 'Kadın') => ({
    t: (id: CodeScaleKey) => over[id],
    third,
    gender,
  });

  describe('Pd Bloğu Kod Gövdeleri Çözümleme ve Sadakat', () => {
    it('Yüksek 4 / Düşük 5 çözümlenir ve erkek/kadın ayrımı vardır (s.111-112)', () => {
      const e = resolveCodeInterpretation('Yüksek 4 / Düşük 5')!;
      assert.ok(e, 'Yüksek 4 / Düşük 5 tanımlı olmalı');
      assert.equal(e.code, 'Yüksek 4 / Düşük 5');
      assert.equal(e.block, 'Pd');
      assert.match(e.text, /Erkeklerde düşük 5, bireyin kendini erkeksi/);
      assert.match(e.text, /Bu örüntüdeki kadınlar kızgındırlar/);

      const eAlias = resolveCodeInterpretation('Pd:4_low5')!;
      assert.equal(eAlias.text, e.text);
    });

    it('456 kodu çözümlenir ve Scarlett O\'Hara Vadisi atfı taşır (s.113)', () => {
      const e = resolveCodeInterpretation('456')!;
      assert.ok(e, '456 tanımlı olmalı');
      assert.equal(e.code, '456');
      assert.equal(e.block, 'Pd');
      assert.match(e.text, /Talep edici, bağımlı ve duygusal kişilerdir/);
      assert.match(e.seeAlso ?? '', /Scarlett O'Hara Vadisi/);
    });

    it('462/642 ve 463/643 kodları çözümlenir (s.114-115)', () => {
      const e462 = resolveCodeInterpretation('462')!;
      assert.equal(e462.code, '462/642');
      assert.match(e462.text, /İntihar tehditleri görülür/);
      assert.equal(resolveCodeInterpretation('642')?.text, e462.text);

      const e463 = resolveCodeInterpretation('463')!;
      assert.equal(e463.code, '463/643');
      assert.match(e463.text, /aşırı sevgi isteklerinin doyurulması/);
      assert.equal(resolveCodeInterpretation('643')?.text, e463.text);
    });

    it('468/648 ve 469 kodları çözümlenir (s.115)', () => {
      const e468 = resolveCodeInterpretation('468')!;
      assert.equal(e468.code, '468/648');
      assert.ok(e468.diagnosis?.includes('Paranoid şizofreni'));
      assert.equal(resolveCodeInterpretation('648')?.text, e468.text);

      const e469 = resolveCodeInterpretation('469')!;
      assert.equal(e469.code, '469');
      assert.match(e469.text, /ani öfke patlamaları/);
    });

    it('48 / Yüksek F, 482/842/824 ve 489/849 kodları çözümlenir (s.117-118)', () => {
      const e48F = resolveCodeInterpretation('48 / Yüksek F')!;
      assert.equal(e48F.code, '48/84 (Yüksek F / Düşük 2)');
      assert.ok(e48F.diagnosis?.includes('Sosyopat kişilik'));

      const e482 = resolveCodeInterpretation('482')!;
      assert.equal(e482.code, '482/842/824');
      assert.match(e482.text, /İntihar girişimi göreceli olarak fazladır/);
      assert.equal(resolveCodeInterpretation('842')?.text, e482.text);
      assert.equal(resolveCodeInterpretation('824')?.text, e482.text);

      const e489 = resolveCodeInterpretation('489')!;
      assert.equal(e489.code, '489/849');
      assert.match(e489.text, /saldırma, savaşma ve hatta şiddet gösterme/);
      assert.equal(resolveCodeInterpretation('849')?.text, e489.text);
    });

    it('493/943, 495/945, 496/946 ve 498/948 kodları çözümlenir (s.119-120)', () => {
      const e493 = resolveCodeInterpretation('493')!;
      assert.equal(e493.code, '493/943');
      assert.equal(resolveCodeInterpretation('943')?.text, e493.text);

      const e495 = resolveCodeInterpretation('495')!;
      assert.equal(e495.code, '495/945');
      assert.match(e495.text, /sosyal hareketler/);
      assert.equal(resolveCodeInterpretation('945')?.text, e495.text);

      const e496 = resolveCodeInterpretation('496')!;
      assert.equal(e496.code, '496/946');
      assert.match(e496.text, /homisidal davranışı/);
      assert.equal(resolveCodeInterpretation('946')?.text, e496.text);

      const e498 = resolveCodeInterpretation('498')!;
      assert.equal(e498.code, '498/948');
      assert.match(e498.text, /ergenlik dönemi isyanı/);
      assert.equal(resolveCodeInterpretation('948')?.text, e498.text);
    });

    it('45, 46, 47, 48, 49 ve 04 iki-haneli kodları çözümlenir (s.112-120)', () => {
      const e45 = resolveCodeInterpretation('45')!;
      assert.equal(e45.code, '45/54');

      const e46 = resolveCodeInterpretation('46')!;
      assert.equal(e46.code, '46/64');
      assert.ok(e46.diagnosis?.includes('Pasif-agresif kişilik bozukluğu'));

      const e48 = resolveCodeInterpretation('48')!;
      assert.equal(e48.code, '48/84');
      assert.ok(e48.diagnosis?.includes('Psikiyatrik yatan hasta ise şizofreni (Paranoid tip)'));

      const e49 = resolveCodeInterpretation('49')!;
      assert.equal(e49.code, '49/94');
      assert.ok(e49.diagnosis?.includes('Antisosyal kişilikle birlikte bazı tip karakter bozuklukları'));
    });
  });

  describe('Pd Bloğu Koşullu Yorumları (Conditions)', () => {
    it('Yüksek 4 / Düşük 5 koşulları: erkek/kadın Mf < 50, kadın Pa ve Hy yüksekliği (s.111-112)', () => {
      const e = resolveCodeInterpretation('Pd:4_low5')!;
      assert.ok(activeCodeConditions(e, ctx({ Mf: 40 }, undefined, 'Erkek')).some(c => c.quote.includes('Erkeklerde düşük 5')));
      assert.ok(activeCodeConditions(e, ctx({ Mf: 40 }, undefined, 'Kadın')).some(c => c.quote.includes('Bu örüntüdeki kadınlar kızgındırlar')));
      assert.ok(activeCodeConditions(e, ctx({ Pa: 75 }, undefined, 'Kadın')).some(c => c.quote.includes('özellikle eğer test 6 da yüksekse')));
      assert.ok(activeCodeConditions(e, ctx({ Hy: 75 }, undefined, 'Kadın')).some(c => c.quote.includes('Alt test 3 de yükselmişse')));
    });

    it('45/54 koşulları: erkek 5 yüksek, kadın 5 düşük, 4 > 5 (s.112-113)', () => {
      const e = resolveCodeInterpretation('45')!;
      assert.ok(activeCodeConditions(e, ctx({ Mf: 75 }, undefined, 'Erkek')).some(c => c.quote.includes('Erkeklerde 5 yüksektir')));
      assert.ok(activeCodeConditions(e, ctx({ Mf: 40 }, undefined, 'Kadın')).some(c => c.quote.includes('Kadınlarda 5 düşüktür')));
      assert.ok(activeCodeConditions(e, ctx({ Pd: 75, Mf: 60 })).some(c => c.quote.includes('4 alt testi, 5 alt testinden yüksek')));
    });

    it('46/64 koşulları: 4 > 6, 6 > 4 ve kadın Sc yüksek + K düşük prepsikoz (s.114)', () => {
      const e = resolveCodeInterpretation('46')!;
      assert.ok(activeCodeConditions(e, ctx({ Pd: 75, Pa: 65 })).some(c => c.quote.includes('Alt test 4, test 6\'dan yüksek')));
      assert.ok(activeCodeConditions(e, ctx({ Pd: 65, Pa: 75 })).some(c => c.quote.includes('Alt test 6, 4\'ten yüksek')));
      assert.ok(activeCodeConditions(e, ctx({ Sc: 75, K: 42 }, undefined, 'Kadın')).some(c => c.quote.includes('Kadınlarda 46/64 kodu psikoz')));
    });

    it('468/648 koşulları: K < 50 T ve 5 T fark alanı (s.115)', () => {
      const e = resolveCodeInterpretation('468')!;
      assert.ok(activeCodeConditions(e, ctx({ K: 40 })).some(c => c.quote.includes('K testi 50 T puanının altında')));
      assert.ok(activeCodeConditions(e, ctx({ Mf: 72, Pd: 70, Pa: 80 })).some(c => c.quote.includes('test 5, 4 ve 6\'nın 5 T puanı alanı içinde')));
    });

    it('469 koşulu: Ma >= 70 T öfke patlaması (s.115)', () => {
      const e = resolveCodeInterpretation('469')!;
      assert.equal(activeCodeConditions(e, ctx({ Ma: 75 })).length, 1);
      assert.equal(activeCodeConditions(e, ctx({ Ma: 60 })).length, 0);
    });

    it('48 / Yüksek F koşulu: F >= 70 T ve D < 50 T, K >= 70 (s.117)', () => {
      const e = resolveCodeInterpretation('48 / Yüksek F')!;
      assert.ok(activeCodeConditions(e, ctx({ F: 75, D: 42 })).some(c => c.quote.includes('Yüksek F ve Düşük 2 örüntüsü')));
      assert.ok(activeCodeConditions(e, ctx({ K: 75 })).some(c => c.quote.includes('özellikle eğer K da yüksekse')));
    });

    it('489/849 koşulu: Ma >= 70 T şiddet riski (s.118)', () => {
      const e = resolveCodeInterpretation('489')!;
      assert.equal(activeCodeConditions(e, ctx({ Ma: 75 })).length, 1);
      assert.equal(activeCodeConditions(e, ctx({ Ma: 60 })).length, 0);
    });

    it('493/943 koşulu: Hy ve Pd farkı <= 5 T (s.119)', () => {
      const e = resolveCodeInterpretation('493')!;
      assert.equal(activeCodeConditions(e, ctx({ Hy: 72, Pd: 70 })).length, 1);
      assert.equal(activeCodeConditions(e, ctx({ Hy: 80, Pd: 70 })).length, 0);
    });

    it('495/945 koşulu: Pt >= 70 T (s.120)', () => {
      const e = resolveCodeInterpretation('495')!;
      assert.equal(activeCodeConditions(e, ctx({ Pt: 75 })).length, 1);
      assert.equal(activeCodeConditions(e, ctx({ Pt: 60 })).length, 0);
    });

    it('496/946 koşulları: Sc >= 70 T homisidal risk ve K < 50 T kontrol kaybı (s.120)', () => {
      const e = resolveCodeInterpretation('496')!;
      assert.ok(activeCodeConditions(e, ctx({ Sc: 75 })).some(c => c.quote.includes('homisidal davranışı')));
      assert.ok(activeCodeConditions(e, ctx({ K: 42 })).some(c => c.quote.includes('K alt testi 50\'nin altında ise')));
    });
  });
});
