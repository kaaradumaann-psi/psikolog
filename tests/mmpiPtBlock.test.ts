import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCodeInterpretation,
  activeCodeConditions,
  CodeScaleKey,
} from '../src/scoring/mmpiSourceCodes';

describe('DECISION-031/A — Pt (Psikasteni / 7) Bloğu Kod Yorumları ve Koşulları (s.137-142)', () => {
  const ctx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey, gender?: 'Erkek' | 'Kadın') => ({
    t: (id: CodeScaleKey) => over[id],
    third,
    gender,
  });

  describe('Pt Bloğu Kod Gövdeleri Çözümleme ve Sadakat', () => {
    it('Pt:74 / 74/47 bloğa özel gövdesi ve tanısı çözümlenir (s.140)', () => {
      const ePt = resolveCodeInterpretation('Pt:74')!;
      assert.ok(ePt, 'Pt:74 tanımlı olmalı');
      assert.equal(ePt.code, '74/47');
      assert.equal(ePt.block, 'Pt');
      assert.match(ePt.text, /Psikiyatrik hasta grubunda pasif agresif kişilik bozukluğu tanısı konulabilir/);
      assert.match(ePt.text, /Kararsız, güvensiz kişilerdir/);
      assert.ok(ePt.diagnosis?.includes('Pasif-agresif kişilik bozukluğu'));
      assert.match(ePt.seeAlso ?? '', /47\/74/);

      const ePt47 = resolveCodeInterpretation('Pt:47')!;
      assert.equal(ePt47.text, ePt.text);
    });

    it('Pt:76 / 76/67 bloğa özel gövdesi çözümlenir (s.140)', () => {
      const ePt76 = resolveCodeInterpretation('Pt:76')!;
      assert.ok(ePt76, 'Pt:76 tanımlı olmalı');
      assert.equal(ePt76.code, '76/67');
      assert.equal(ePt76.block, 'Pt');
      assert.match(ePt76.text, /kaygılı, endişeli, kuşkucudurlar/);
      assert.match(ePt76.text, /Gerçek paranoid değillerdir/);
      assert.match(ePt76.seeAlso ?? '', /67\/76/);

      const ePt67 = resolveCodeInterpretation('Pt:67')!;
      assert.equal(ePt67.text, ePt76.text);
    });

    it('782 ve 872 kodları ve tanıları çözümlenir (s.141)', () => {
      const e782 = resolveCodeInterpretation('782')!;
      assert.ok(e782, '782 tanımlı olmalı');
      assert.equal(e782.code, '782');
      assert.equal(e782.block, 'Pt');
      assert.ok(e782.diagnosis?.includes('Depresif Bozukluk'));
      assert.ok(e782.diagnosis?.includes('Obsesif Kompulsif Bozukluk'));
      assert.match(e782.text, /78\/87 koduna 2 alt testinin eşlik ettiği durumdur/);

      const e872 = resolveCodeInterpretation('872')!;
      assert.ok(e872, '872 tanımlı olmalı');
      assert.equal(e872.code, '872');
      assert.equal(e872.block, 'Pt');
      assert.ok(e872.diagnosis?.includes('Şizofrenik Reaksiyon'));
      assert.match(e872.text, /8 alt testinin 7'den yüksek olduğu/);

      assert.equal(resolveCodeInterpretation('Pt:872')?.text, e872.text);
      assert.equal(resolveCodeInterpretation('Sc:872')?.text, e872.text);
    });

    it('784/874 kodu, tanıları ve çapraz takma adları çözümlenir (s.141)', () => {
      const e784 = resolveCodeInterpretation('784')!;
      assert.ok(e784, '784 tanımlı olmalı');
      assert.equal(e784.code, '784/874');
      assert.equal(e784.block, 'Pt');
      assert.ok(e784.diagnosis?.includes('Şizofrenik Reaksiyon'));
      assert.ok(e784.diagnosis?.includes('Şizoid Kişilik Bozukluğu'));

      assert.equal(resolveCodeInterpretation('874')?.text, e784.text);
      assert.equal(resolveCodeInterpretation('Pt:784')?.text, e784.text);
      assert.equal(resolveCodeInterpretation('Pt:874')?.text, e784.text);
      assert.equal(resolveCodeInterpretation('Sc:784')?.text, e784.text);
      assert.equal(resolveCodeInterpretation('Sc:874')?.text, e784.text);
      assert.equal(resolveCodeInterpretation('Pd:784')?.text, e784.text);
      assert.equal(resolveCodeInterpretation('Pd:874')?.text, e784.text);
    });

    it('789 kodu ve takma adları metin sadakatiyle çözümlenir (s.141)', () => {
      const e789 = resolveCodeInterpretation('789')!;
      assert.ok(e789, '789 tanımlı olmalı');
      assert.equal(e789.code, '789');
      assert.equal(e789.block, 'Pt');
      assert.match(e789.text, /Hostil, gergin, şüpheci, hiperaktif, huzursuz bireylerdir/);
      assert.match(e789.text, /Kendilerine ilişkin grandioziteleri vardır/);

      assert.equal(resolveCodeInterpretation('Pt:789')?.text, e789.text);
      assert.equal(resolveCodeInterpretation('Sc:789')?.text, e789.text);
      assert.equal(resolveCodeInterpretation('Ma:789')?.text, e789.text);
      assert.equal(resolveCodeInterpretation('Pt:879')?.text, e789.text);
      assert.equal(resolveCodeInterpretation('Sc:879')?.text, e789.text);
      assert.equal(resolveCodeInterpretation('Ma:879')?.text, e789.text);
    });

    it('794 kodu ve takma adları metin sadakatiyle çözümlenir (s.142)', () => {
      const e794 = resolveCodeInterpretation('794')!;
      assert.ok(e794, '794 tanımlı olmalı');
      assert.equal(e794.code, '794');
      assert.equal(e794.block, 'Pt');
      assert.match(e794.text, /Hastalar kronik olarak kaygılı ve gergindirler/);
      assert.match(e794.text, /İmpulsif dışa vurma dönemleri/);

      assert.equal(resolveCodeInterpretation('Pt:794')?.text, e794.text);
      assert.equal(resolveCodeInterpretation('Ma:974')?.text, e794.text);
      assert.equal(resolveCodeInterpretation('Pd:794')?.text, e794.text);
      assert.equal(resolveCodeInterpretation('Ma:794')?.text, e794.text);
    });

    it('İki haneli Pt kodları ve Bakınız yönlendirmeleri çözümlenir (s.137-142)', () => {
      assert.equal(resolveCodeInterpretation('78')?.code, '78/87');
      assert.equal(resolveCodeInterpretation('Pt:87')?.code, '78/87');
      assert.equal(resolveCodeInterpretation('79')?.code, '79/97');
      assert.equal(resolveCodeInterpretation('97')?.code, '79/97');
      assert.equal(resolveCodeInterpretation('70')?.code, '70/07');
      assert.equal(resolveCodeInterpretation('07')?.code, '70/07');
      assert.equal(resolveCodeInterpretation('71')?.code, '17/71');
      assert.equal(resolveCodeInterpretation('72')?.code, '27/72');
      assert.equal(resolveCodeInterpretation('73')?.code, '37/73');
      assert.equal(resolveCodeInterpretation('75')?.code, '57/75');
    });
  });

  describe('Pt Bloğu Koşullu Yorumları (Conditions)', () => {
    it('Pt:74 koşulu: D >= 70 T içe çevrilen saldırganlık / depresyon (s.140)', () => {
      const e = resolveCodeInterpretation('Pt:74')!;
      assert.ok(activeCodeConditions(e, ctx({ D: 75 })).some(c => c.quote.includes('Saldırganlıklarını kendilerine çevirdiklerinde depresyon görülür')));
      assert.equal(activeCodeConditions(e, ctx({ D: 60 })).length, 0);
    });

    it('78/87 koşulları: 3. test D/Pd, Sc > Pt akut psikoz/intihar, 7>8 savaş, 7<8 şizofreni (s.140-141)', () => {
      const e = resolveCodeInterpretation('78')!;
      assert.ok(activeCodeConditions(e, ctx({}, 'D')).some(c => c.quote.includes('2 ve 4 diğer yükselen alt testlerdir')));
      assert.ok(activeCodeConditions(e, ctx({}, 'Pd')).some(c => c.quote.includes('2 ve 4 diğer yükselen alt testlerdir')));
      assert.ok(activeCodeConditions(e, ctx({ Sc: 80, Pt: 70 })).some(c => c.quote.includes('akut psikotik durum vardır')));
      assert.ok(activeCodeConditions(e, ctx({ Sc: 80, Pt: 70 })).some(c => c.quote.includes('intihar girişimi tuhaftır')));
      assert.ok(activeCodeConditions(e, ctx({ Pt: 80, Sc: 70 })).some(c => c.quote.includes('7 > 8: Birey düşünce ve davranış bozukluğu')));
      assert.ok(activeCodeConditions(e, ctx({ Pt: 78, Sc: 82 })).some(c => c.quote.includes('7 < 8: Her iki yükselmede 75 T puanının üstünde')));
      assert.equal(activeCodeConditions(e, ctx({ Pt: 65, Sc: 70 })).filter(c => c.quote.includes('7 < 8: Her iki')).length, 0);
    });

    it('79/97 koşulları: 3. test Sc/Pd ve D >= 70 T depresyon (s.141-142)', () => {
      const e = resolveCodeInterpretation('79')!;
      assert.ok(activeCodeConditions(e, ctx({}, 'Sc')).some(c => c.quote.includes('8 ve 4, üçüncü yükselen')));
      assert.ok(activeCodeConditions(e, ctx({}, 'Pd')).some(c => c.quote.includes('8 ve 4, üçüncü yükselen')));
      assert.ok(activeCodeConditions(e, ctx({ D: 75 })).some(c => c.quote.includes('Eğer 2 alt testi de yükselmişse depresyon görülür')));
      assert.equal(activeCodeConditions(e, ctx({ D: 55 })).length, 0);
    });

    it('70/07 koşulları: 3. test D/Sc ve Kadın Mf < 40 T (s.142)', () => {
      const e = resolveCodeInterpretation('70')!;
      assert.ok(activeCodeConditions(e, ctx({}, 'D')).some(c => c.quote.includes('2 ve 8 alt testleri')));
      assert.ok(activeCodeConditions(e, ctx({}, 'Sc')).some(c => c.quote.includes('2 ve 8 alt testleri')));
      assert.ok(activeCodeConditions(e, ctx({ Mf: 35 }, undefined, 'Kadın')).some(c => c.quote.includes('Kadınlarda eğer 5 alt testi')));
      assert.equal(activeCodeConditions(e, ctx({ Mf: 50 }, undefined, 'Kadın')).length, 0);
      assert.equal(activeCodeConditions(e, ctx({ Mf: 35 }, undefined, 'Erkek')).length, 0);
    });
  });
});
