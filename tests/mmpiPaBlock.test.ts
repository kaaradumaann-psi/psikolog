import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  codeInterpretation,
  resolveCodeInterpretation,
  activeCodeConditions,
  CodeScaleKey,
} from '../src/scoring/mmpiSourceCodes';

describe('DECISION-031/A — Pa (Paranoya / 6) Bloğu Kod Yorumları ve Koşulları (s.127-135)', () => {
  const ctx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey, gender?: 'Erkek' | 'Kadın') => ({
    t: (id: CodeScaleKey) => over[id],
    third,
    gender,
  });

  describe('Pa Bloğu Kod Gövdeleri Çözümleme ve Sadakat', () => {
    it('678/876 kodu çözümlenir, tanı ve Psikotik V atfı taşır (s.131-132)', () => {
      const e678 = resolveCodeInterpretation('678')!;
      assert.ok(e678, '678 tanımlı olmalı');
      assert.equal(e678.code, '678/876');
      assert.equal(e678.block, 'Pa');
      assert.match(e678.text, /6 ve 8, 7'den yüksek ise bu psikotik vadiyi oluşturur/);
      assert.ok(e678.diagnosis?.includes('Paranoid tip şizofreni'));
      assert.match(e678.seeAlso ?? '', /Psikotik V/);

      const e876 = resolveCodeInterpretation('876')!;
      assert.equal(e876.text, e678.text);

      const eSc = resolveCodeInterpretation('Sc:678')!;
      assert.equal(eSc.text, e678.text);
    });

    it('679 kodu çözümlenir ve metin sadakatini korur (s.132)', () => {
      const e = resolveCodeInterpretation('679')!;
      assert.ok(e, '679 tanımlı olmalı');
      assert.equal(e.code, '679');
      assert.equal(e.block, 'Pa');
      assert.match(e.text, /Aşırı duyarlı ve katıdırlar/);
      assert.match(e.text, /öfke patlamaları vardır/);
    });

    it('680/860 kodu çözümlenir ve çapraz takma adlar çalışır (s.133)', () => {
      const e680 = resolveCodeInterpretation('680')!;
      assert.equal(e680.code, '680/860');
      assert.ok(e680.diagnosis?.includes('Paranoid şizofreni'));
      assert.match(e680.text, /Sistemli hezeyanlar görülebilir/);

      assert.equal(resolveCodeInterpretation('860')?.text, e680.text);
      assert.equal(resolveCodeInterpretation('Sc:680')?.text, e680.text);
      assert.equal(resolveCodeInterpretation('Si:068')?.text, e680.text);
      assert.equal(resolveCodeInterpretation('Si:086')?.text, e680.text);
    });

    it('694/964 kodu çözümlenir ve cinayet potansiyeli uyarısı taşır (s.133-134)', () => {
      const e694 = resolveCodeInterpretation('694')!;
      assert.equal(e694.code, '694/964');
      assert.match(e694.text, /cinayet potansiyeli değerlendirilmelidir/);

      assert.equal(resolveCodeInterpretation('964')?.text, e694.text);
      assert.equal(resolveCodeInterpretation('Ma:694')?.text, e694.text);
      assert.equal(resolveCodeInterpretation('Ma:964')?.text, e694.text);
    });

    it('698/968 kodu çözümlenir ve tanı ile yönlendirme taşır (s.134)', () => {
      const e698 = resolveCodeInterpretation('698')!;
      assert.equal(e698.code, '698/968');
      assert.ok(e698.diagnosis?.includes('Şizofreni paranoid tip'));
      assert.match(e698.seeAlso ?? '', /68\/86/);

      assert.equal(resolveCodeInterpretation('968')?.text, e698.text);
      assert.equal(resolveCodeInterpretation('Ma:698')?.text, e698.text);
      assert.equal(resolveCodeInterpretation('Sc:698')?.text, e698.text);
    });

    it('Scarlett O\'Hara Vadisi (456 örüntüsü) çözümlenir (s.134-135)', () => {
      const e = resolveCodeInterpretation('Scarlett O\'Hara Vadisi')!;
      assert.ok(e, 'Scarlett O\'Hara Vadisi tanımlı olmalı');
      assert.equal(e.block, 'Pa');
      assert.match(e.text, /Genellikle kadınlarda görülen bir örüntüdür/);
      assert.match(e.text, /terapisti kızdırarak/);

      const eAlias = resolveCodeInterpretation('Pa:456_scarlett')!;
      assert.equal(eAlias.text, e.text);
    });

    it('Var olan iki haneli kodlar çözümlenir (67, 68, 69, 60, 64)', () => {
      assert.equal(resolveCodeInterpretation('67')?.code, '67/76');
      assert.equal(resolveCodeInterpretation('68')?.code, '68/86');
      assert.equal(resolveCodeInterpretation('69')?.code, '69/96');
      assert.equal(resolveCodeInterpretation('60')?.code, '60/06');
      assert.equal(resolveCodeInterpretation('64')?.code, '64/46');
    });
  });

  describe('Pa Bloğu Koşullu Yorumları (Conditions)', () => {
    it('67/76 koşulları: 3. test D/Sc ve Pa >= Pt şizofreniye geçiş (s.131)', () => {
      const e = resolveCodeInterpretation('67')!;
      assert.ok(activeCodeConditions(e, ctx({}, 'D')).some(c => c.quote.includes('2 ya da 8 alt testleri')));
      assert.ok(activeCodeConditions(e, ctx({}, 'Sc')).some(c => c.quote.includes('2 ya da 8 alt testleri')));
      assert.ok(activeCodeConditions(e, ctx({ Pa: 75, Pt: 65 })).some(c => c.quote.includes('obsesif-kompulsif bozukluktan psikotik döneme')));
    });

    it('678/876 koşulu: 6 ve 8 > 7 psikotik vadi (s.131)', () => {
      const e = resolveCodeInterpretation('678')!;
      assert.ok(activeCodeConditions(e, ctx({ Pa: 75, Sc: 80, Pt: 65 })).some(c => c.quote.includes('6 ve 8, 7\'den yüksek ise')));
      assert.equal(activeCodeConditions(e, ctx({ Pa: 75, Sc: 80, Pt: 82 })).length, 0);
    });

    it('68/86 koşulları: 3. test Pd/Pt, paranoid vadi, K < 50 saldırganlık, 75+ T şizofreni (s.132-133)', () => {
      const e = resolveCodeInterpretation('68')!;
      assert.ok(activeCodeConditions(e, ctx({}, 'Pd')).some(c => c.quote.includes('Pd ve Pt alt testleri')));
      assert.ok(activeCodeConditions(e, ctx({ Pa: 72, Sc: 74, Pt: 60 })).some(c => c.quote.includes('Paranoid vadide')));
      assert.ok(activeCodeConditions(e, ctx({ K: 42 })).some(c => c.quote.includes('saldırganlık nöbetleri')));
      assert.ok(activeCodeConditions(e, ctx({ Pa: 78, Sc: 76 })).some(c => c.quote.includes('75 T puanının üstünde ise')));
    });

    it('69/96 koşulları: 3. test Pd/Sc, F ve Sc yüksekliği, kadın gerginliği (s.133)', () => {
      const e = resolveCodeInterpretation('69')!;
      assert.ok(activeCodeConditions(e, ctx({}, 'Pd')).some(c => c.quote.includes('4 ve 8 alt testi')));
      assert.ok(activeCodeConditions(e, ctx({ F: 75, Sc: 75 })).some(c => c.quote.includes('F ve Sc yüksekse')));
      assert.ok(activeCodeConditions(e, ctx({}, undefined, 'Kadın')).some(c => c.quote.includes('daldan dala atlayan')));
    });

    it('698/968 koşulu: 8 alt testi 6\'dan 5 T aşağıda (s.134)', () => {
      const e = resolveCodeInterpretation('698')!;
      assert.ok(activeCodeConditions(e, ctx({ Pa: 75, Sc: 68 })).some(c => c.quote.includes('8 alt testi, 6\'dan 5 T puanı aşağıda')));
      assert.equal(activeCodeConditions(e, ctx({ Pa: 75, Sc: 74 })).length, 0);
    });

    it('60/06 koşulları: kadın ve 3. test D/Pd/Hy (s.134)', () => {
      const e = resolveCodeInterpretation('60')!;
      assert.ok(activeCodeConditions(e, ctx({}, undefined, 'Kadın')).some(c => c.quote.includes('kadınlarda özellikle 30 yaşından sonra')));
      assert.ok(activeCodeConditions(e, ctx({}, 'D')).some(c => c.quote.includes('2, 4 ve 3 yükselen')));
    });

    it('Scarlett O\'Hara Vadisi koşulu: Hy >= 70 T manipülatif sosyallik (s.134)', () => {
      const e = resolveCodeInterpretation('Pa:456_scarlett')!;
      assert.ok(activeCodeConditions(e, ctx({ Hy: 75 })).some(c => c.quote.includes('alt test 3\'ün yükselmesi eşlik ediyorsa')));
      assert.equal(activeCodeConditions(e, ctx({ Hy: 60 })).length, 0);
    });
  });
});
