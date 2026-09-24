import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCodeInterpretation,
  activeCodeConditions,
  CodeScaleKey,
} from '../src/scoring/mmpiSourceCodes';

describe('DECISION-031/A — Si (Sosyal İçe Dönüklük / 0) Bloğu Kod Yorumları ve Koşulları (s.154-158)', () => {
  const ctx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey, gender?: 'Erkek' | 'Kadın') => ({
    t: (id: CodeScaleKey) => over[id],
    third,
    gender,
  });

  describe('Si Bloğu Kod Gövdeleri Çözümleme ve Sadakat', () => {
    it('049 kodu gövdesi, bloğu ve takma adları çözümlenir (s.157)', () => {
      const e = resolveCodeInterpretation('049')!;
      assert.ok(e, '049 tanımlı olmalı');
      assert.equal(e.code, '049');
      assert.equal(e.block, 'Si');
      assert.match(e.text, /Psikiyatrik olgularda eyleme vurukluğun bastırılması/);
      assert.match(e.seeAlso ?? '', /s\.157/);

      // Çapraz takma adlar
      assert.equal(resolveCodeInterpretation('Si:049')?.code, '049');
      assert.equal(resolveCodeInterpretation('Pd:049')?.code, '049');
      assert.equal(resolveCodeInterpretation('Ma:049')?.code, '049');
    });

    it('027(8) kodu gövdesi, bloğu ve takma adları çözümlenir (s.158)', () => {
      const e = resolveCodeInterpretation('027(8)')!;
      assert.ok(e, '027(8) tanımlı olmalı');
      assert.equal(e.code, '027(8)');
      assert.equal(e.block, 'Si');
      assert.match(e.text, /Bireyde güçlü ruminatif davranışlar görülebilir\./);
      assert.match(e.seeAlso ?? '', /s\.157-158/);

      // Takma adlar ve niteliksiz sorgu (027)
      assert.equal(resolveCodeInterpretation('027')?.code, '027(8)');
      assert.equal(resolveCodeInterpretation('Si:027')?.code, '027(8)');
      assert.equal(resolveCodeInterpretation('Si:0278')?.code, '027(8)');
      assert.equal(resolveCodeInterpretation('D:027')?.code, '027(8)');
      assert.equal(resolveCodeInterpretation('Pt:027')?.code, '027(8)');
      assert.equal(resolveCodeInterpretation('Sc:027')?.code, '027(8)');
    });

    it('İki haneli Si kodları ve Bakınız yönlendirmeleri çözümlenir (s.157)', () => {
      assert.equal(resolveCodeInterpretation('01')?.code, '10/01');
      assert.equal(resolveCodeInterpretation('02')?.code, '20/02');
      assert.equal(resolveCodeInterpretation('03')?.code, '30/03');
      assert.equal(resolveCodeInterpretation('04')?.code, '40/04');
      assert.equal(resolveCodeInterpretation('05')?.code, '50/05');
      assert.equal(resolveCodeInterpretation('06')?.code, '60/06');
      assert.equal(resolveCodeInterpretation('07')?.code, '70/07');
      assert.equal(resolveCodeInterpretation('08')?.code, '80/08');
      assert.equal(resolveCodeInterpretation('09')?.code, '90/09');

      assert.equal(resolveCodeInterpretation('10')?.code, '10/01');
      assert.equal(resolveCodeInterpretation('20')?.code, '20/02');
      assert.equal(resolveCodeInterpretation('30')?.code, '30/03');
      assert.equal(resolveCodeInterpretation('40')?.code, '40/04');
      assert.equal(resolveCodeInterpretation('50')?.code, '50/05');
      assert.equal(resolveCodeInterpretation('60')?.code, '60/06');
      assert.equal(resolveCodeInterpretation('70')?.code, '70/07');
      assert.equal(resolveCodeInterpretation('80')?.code, '80/08');
      assert.equal(resolveCodeInterpretation('90')?.code, '90/09');
    });

    it('068 ve 086 kodları Pa:680/860 hedefine yönlendirilir (s.158)', () => {
      assert.equal(resolveCodeInterpretation('Si:068')?.code, '680/860');
      assert.equal(resolveCodeInterpretation('Si:086')?.code, '680/860');
    });
  });

  describe('Si Bloğu Koşullu Yorumları (Conditions)', () => {
    it('049 koşulu: Si, Pd ve Ma >= 70 T eyleme vurukluğun bastırılması (s.157)', () => {
      const e = resolveCodeInterpretation('049')!;
      assert.equal(e.conditions?.length, 1);
      const c = e.conditions![0];
      assert.match(c.quote, /eyleme vurukluğun bastırıldığı düşünülmelidir/);

      // Üçü de >= 70 T iken tetiklenir:
      assert.equal(c.test?.(ctx({ Si: 75, Pd: 72, Ma: 70 })), true);
      // Herhangi biri eksikse tetiklenmez:
      assert.equal(c.test?.(ctx({ Si: 75, Pd: 65, Ma: 70 })), false);
      assert.equal(c.test?.(ctx({ Si: 65, Pd: 75, Ma: 70 })), false);
      assert.equal(c.test?.(ctx({ Si: 75, Pd: 75, Ma: 65 })), false);
    });

    it('027(8) koşulu: D/Pt >= 70 T ve Sc >= 70 T ruminatif davranışlar (s.157-158)', () => {
      const e = resolveCodeInterpretation('027(8)')!;
      assert.equal(e.conditions?.length, 1);
      const c = e.conditions![0];
      assert.match(c.quote, /ruminatif davranışların kuvvetlendiği görülür/);

      // D + Sc >= 70 T:
      assert.equal(c.test?.(ctx({ D: 75, Sc: 72 })), true);
      // Pt + Sc >= 70 T:
      assert.equal(c.test?.(ctx({ Pt: 75, Sc: 72 })), true);
      // Yalnızca D veya Pt var, Sc yok:
      assert.equal(c.test?.(ctx({ D: 75, Sc: 60 })), false);
      assert.equal(c.test?.(ctx({ Pt: 75, Sc: 60 })), false);
    });
  });
});
