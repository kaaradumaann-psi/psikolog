import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  codeInterpretation,
  resolveCodeInterpretation,
  activeCodeConditions,
  CodeScaleKey,
} from '../src/scoring/mmpiSourceCodes';

describe('DECISION-031/A — Hy (Histeri / 3) Bloğu Kod Yorumları ve Koşulları (s.95-103)', () => {
  const ctx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey, gender?: 'Erkek' | 'Kadın') => ({
    t: (id: CodeScaleKey) => over[id],
    third,
    gender,
  });

  describe('Hy Bloğu Kod Gövdeleri Çözümleme ve Sadakat', () => {
    it('Yüksek 3 / Yüksek K çözümlenir ve F/Sc düşük kuralı vardır (s.96)', () => {
      const e = resolveCodeInterpretation('Yüksek 3 / Yüksek K')!;
      assert.ok(e, 'Yüksek 3 / Yüksek K tanımlı olmalı');
      assert.equal(e.code, 'Yüksek 3 / Yüksek K');
      assert.equal(e.block, 'Hy');
      assert.match(e.text, /sevilme, kabul edilme ve kendisini yaşamı üzerinde kontrol sağlıyor gibi gösterme/);
      assert.match(e.text, /çok katı bir optimizm gösterirler/);

      // Hy:3_highK da aynı nesneye gider
      const eAlias = resolveCodeInterpretation('Hy:3_highK')!;
      assert.equal(eAlias.text, e.text);
    });

    it('Hy:32 çözümlenir ve 23 kodunun aksine özellikler taşır (s.96-97)', () => {
      const e = resolveCodeInterpretation('Hy:32')!;
      assert.ok(e, 'Hy:32 tanımlı olmalı');
      assert.equal(e.code, '32');
      assert.equal(e.block, 'Hy');
      assert.match(e.text, /23 kod tiplerinin aksine/);
      assert.match(e.text, /sağlıkları ve bir ölçüde de belirgin olmayan depresyonları ile fazlaca ilgilenirler/);
      assert.match(e.text, /32 kodlu kadınların sıklıkla sorunlu evlilik öyküsü/);
    });

    it('321 kodu çözümlenir ve somatik semptomları taşır (s.97)', () => {
      const e = resolveCodeInterpretation('321')!;
      assert.ok(e, '321 tanımlı olmalı');
      assert.equal(e.code, '321');
      assert.equal(e.block, 'Hy');
      assert.match(e.text, /32 kodlu bireylerin özelliklerine ek olarak/);
      assert.match(e.text, /kabızlık, ishal, anoreksiya, uykusuzluk, kas gerginliği/);
    });

    it('Yüksek 3 / Düşük 4 kodu çözümlenir ve pasif-agresif kişilik tanısı taşır (s.98-99)', () => {
      const e = resolveCodeInterpretation('Yüksek 3 / Düşük 4')!;
      assert.ok(e, 'Yüksek 3 / Düşük 4 tanımlı olmalı');
      assert.equal(e.code, 'Yüksek 3 / Düşük 4');
      assert.equal(e.block, 'Hy');
      assert.match(e.text, /kızgınlık duygularını dolaylı olarak gösterir/);
      assert.ok(e.diagnosis?.includes('Pasif-agresif kişilik bozukluğu'));

      const eAlias = resolveCodeInterpretation('Hy:34_low4')!;
      assert.equal(eAlias.text, e.text);
    });

    it('345/435/534 ve 346/436 kodları çözümlenir (s.99)', () => {
      const e345 = resolveCodeInterpretation('345')!;
      assert.equal(e345.code, '345/435/534');
      assert.match(e345.text, /cinsel yönden yetersizdirler/);

      // aliaslar
      assert.equal(resolveCodeInterpretation('Hy:435')?.text, e345.text);
      assert.equal(resolveCodeInterpretation('Hy:534')?.text, e345.text);

      const e346 = resolveCodeInterpretation('346')!;
      assert.equal(e346.code, '346/436');
      assert.match(e346.text, /dönemsel aşırı eyleme vuruk davranış öyküleri olabilir/);
      assert.equal(resolveCodeInterpretation('Hy:436')?.text, e346.text);
    });

    it('34, 35, 36, 37, 38, 39, 03 kodları ve tanıları çözümlenir (s.97-101)', () => {
      const e34 = resolveCodeInterpretation('34')!;
      assert.equal(e34.code, '34/43');
      assert.ok(e34.diagnosis?.includes('Pasif-agresif kişilik bozukluğu, agresif tip'));

      const e38 = resolveCodeInterpretation('38')!;
      assert.equal(e38.code, '38/83');
      assert.ok(e38.diagnosis?.includes('Şizofreni'));
      assert.ok(e38.diagnosis?.includes('Bazı durumlarda histerik nevroz'));
    });
  });

  describe('Hy Bloğu Koşullu Yorumları (Conditions)', () => {
    it('Hy:3_highK koşulu: Hy ve K >= 70 T, F ve Sc < 50 T (s.96)', () => {
      const e = resolveCodeInterpretation('Hy:3_highK')!;
      const actOk = activeCodeConditions(e, ctx({ Hy: 75, K: 72, F: 45, Sc: 42 }));
      assert.equal(actOk.length, 1);

      const actFailF = activeCodeConditions(e, ctx({ Hy: 75, K: 72, F: 65, Sc: 42 }));
      assert.equal(actFailF.length, 0);
    });

    it('Hy:32 koşulları: 5 T farkı, erkek üçüncü 1/8/9, kadın Mf < 50, kadın üçüncü 1/4/8 (s.96-97)', () => {
      const e = resolveCodeInterpretation('Hy:32')!;
      // D ile Hy farkı <= 5
      assert.ok(activeCodeConditions(e, ctx({ D: 72, Hy: 70 })).some(c => c.quote.includes('23 koduna da bakınız')));
      // erkek üçüncü test Hs
      assert.ok(activeCodeConditions(e, ctx({}, 'Hs', 'Erkek')).some(c => c.quote.includes('Erkekler için test 1, 8 ve 9')));
      // kadın düşük Mf
      assert.ok(activeCodeConditions(e, ctx({ Mf: 42 }, undefined, 'Kadın')).some(c => c.quote.includes('özellikle eğer test 5 düşük ise')));
      // kadın üçüncü test Pd
      assert.ok(activeCodeConditions(e, ctx({}, 'Pd', 'Kadın')).some(c => c.quote.includes('Kadınlar için çoğunlukla 1, 4 ve 8')));
    });

    it('34/43 koşulları: cinsiyet üçüncü testler ve 3 vs 4 göreceli yükseklik (s.98)', () => {
      const e = resolveCodeInterpretation('34')!;
      // erkek üçüncü test Mf
      assert.ok(activeCodeConditions(e, ctx({}, 'Mf', 'Erkek')).some(c => c.quote.includes('Erkekler için test 2, 5 ve 6')));
      // kadın üçüncü test Sc
      assert.ok(activeCodeConditions(e, ctx({}, 'Sc', 'Kadın')).some(c => c.quote.includes('Kadınlar için üçüncü en yüksek testler')));
      // 3 > 4
      assert.ok(activeCodeConditions(e, ctx({ Hy: 75, Pd: 65 })).some(c => c.quote.includes('3 yüksekse kızgınlık ve dürtüler ketlenir')));
      // 4 > 3
      assert.ok(activeCodeConditions(e, ctx({ Hy: 65, Pd: 75 })).some(c => c.quote.includes('4 yüksekse öfke daha fazla ifade edilir')));
    });

    it('345/435/534 koşulu: Hy > Pd ve K > 50 (s.99)', () => {
      const e = resolveCodeInterpretation('345')!;
      assert.equal(activeCodeConditions(e, ctx({ Hy: 75, Pd: 68, K: 55 })).length, 1);
      assert.equal(activeCodeConditions(e, ctx({ Hy: 68, Pd: 75, K: 55 })).length, 0);
    });

    it('346/436 koşulu: Pa ve Hy farkı <= 5 T (s.99)', () => {
      const e = resolveCodeInterpretation('346')!;
      assert.equal(activeCodeConditions(e, ctx({ Pa: 72, Hy: 70 })).length, 1);
      assert.equal(activeCodeConditions(e, ctx({ Pa: 80, Hy: 70 })).length, 0);
    });

    it('35/53 koşulu: üçüncü test Pd veya Pa (s.99)', () => {
      const e = resolveCodeInterpretation('35')!;
      assert.equal(activeCodeConditions(e, ctx({}, 'Pd')).length, 1);
      assert.equal(activeCodeConditions(e, ctx({}, 'Ma')).length, 0);
    });

    it('36/63 koşulları: üçüncü Si/Sc, Pa - Hy >= 5, Hy > Pa (s.100)', () => {
      const e = resolveCodeInterpretation('36')!;
      assert.ok(activeCodeConditions(e, ctx({}, 'Si')).some(c => c.quote.includes('üçüncü yükselen test Si ya da Sc')));
      assert.ok(activeCodeConditions(e, ctx({ Pa: 75, Hy: 68 })).some(c => c.quote.includes('Alt test 6, 3\'ten 5 ya da daha fazla')));
      assert.ok(activeCodeConditions(e, ctx({ Pa: 68, Hy: 75 })).some(c => c.quote.includes('Alt test 3, 6\'dan yüksekse')));
    });

    it('37/73 koşulu: üçüncü test Hs, D veya Pd (s.100)', () => {
      const e = resolveCodeInterpretation('37')!;
      assert.equal(activeCodeConditions(e, ctx({}, 'D')).length, 1);
      assert.equal(activeCodeConditions(e, ctx({}, 'Ma')).length, 0);
    });

    it('39/93 koşulları: Si < 40 ve üçüncü Pd (s.101)', () => {
      const e = resolveCodeInterpretation('39')!;
      assert.ok(activeCodeConditions(e, ctx({ Si: 38 })).some(c => c.quote.includes('Si 40 T puanının altında')));
      assert.ok(activeCodeConditions(e, ctx({}, 'Pd')).some(c => c.quote.includes('En sık görülen üçlü kod tipi 394/934')));
    });

    it('30/03 koşulu: üçüncü test Hs veya D (s.101)', () => {
      const e = resolveCodeInterpretation('03')!;
      assert.equal(activeCodeConditions(e, ctx({}, 'Hs')).length, 1);
      assert.equal(activeCodeConditions(e, ctx({}, 'Ma')).length, 0);
    });
  });
});
