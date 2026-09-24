import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCodeInterpretation,
  activeCodeConditions,
  CodeScaleKey,
} from '../src/scoring/mmpiSourceCodes';

describe('DECISION-031/A — Sc (Şizofreni / 8) Bloğu Kod Yorumları ve Koşulları (s.143-148)', () => {
  const ctx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey, gender?: 'Erkek' | 'Kadın') => ({
    t: (id: CodeScaleKey) => over[id],
    third,
    gender,
  });

  describe('Sc Bloğu Kod Gövdeleri Çözümleme ve Sadakat', () => {
    it('Sc:86 / 86/68 bloğa özel gövdesi ve tanıları çözümlenir (s.146)', () => {
      const eSc86 = resolveCodeInterpretation('Sc:86')!;
      assert.ok(eSc86, 'Sc:86 tanımlı olmalı');
      assert.equal(eSc86.code, '86/68');
      assert.equal(eSc86.block, 'Sc');
      assert.match(eSc86.text, /6 ve 8'in T puanı 80'nin üstünde, 7 de 70 T puanındadır/);
      assert.match(eSc86.text, /Paranoid vadi/);
      assert.ok(eSc86.diagnosis?.includes('Paranoid şizofreni'));
      assert.ok(eSc86.diagnosis?.includes('Paranoid durum'));
      assert.ok(eSc86.diagnosis?.includes('Şizoid kişilik'));

      const eSc68 = resolveCodeInterpretation('Sc:68')!;
      assert.equal(eSc68.text, eSc86.text);
      assert.equal(resolveCodeInterpretation('Pa:86')?.text, eSc86.text);
    });

    it('Sc:87 / 87/78 bloğa özel gövdesi çözümlenir (s.146)', () => {
      const eSc87 = resolveCodeInterpretation('Sc:87')!;
      assert.ok(eSc87, 'Sc:87 tanımlı olmalı');
      assert.equal(eSc87.code, '87/78');
      assert.equal(eSc87.block, 'Sc');
      assert.match(eSc87.text, /Endişeli, kendi kendini tetkik edebilen, derin düşünceye dalan kişilerdir/);
      assert.match(eSc87.text, /kişilik güçlükleri kroniktir/);
      assert.match(eSc87.text, /Cinsel sorunları vardır/);
      assert.match(eSc87.seeAlso ?? '', /78\/87/);

      const eSc78 = resolveCodeInterpretation('Sc:78')!;
      assert.equal(eSc78.text, eSc87.text);
    });

    it('8726 / Yüksek 9 kodu, tanısı ve takma adları çözümlenir (s.146)', () => {
      const e8726 = resolveCodeInterpretation('8726')!;
      assert.ok(e8726, '8726 tanımlı olmalı');
      assert.equal(e8726.code, '8726 / Yüksek 9');
      assert.equal(e8726.block, 'Sc');
      assert.match(e8726.text, /Ajite şizofren bir hastayı göstermektedir/);
      assert.ok(e8726.diagnosis?.some(d => d.toLowerCase().includes('ajite')));

      assert.equal(resolveCodeInterpretation('Sc:8726')?.text, e8726.text);
      assert.equal(resolveCodeInterpretation('Sc:8726_high9')?.text, e8726.text);
      assert.equal(resolveCodeInterpretation('Pt:8726')?.text, e8726.text);
      assert.equal(resolveCodeInterpretation('Ma:8726')?.text, e8726.text);
    });

    it('Paranoid Vadi (Şekil 22) örüntüsü, metni ve tanısı çözümlenir (s.147)', () => {
      const ePV = resolveCodeInterpretation('Paranoid Vadi')!;
      assert.ok(ePV, 'Paranoid Vadi tanımlı olmalı');
      assert.equal(ePV.code, 'Paranoid Vadi (Şekil 22)');
      assert.equal(ePV.block, 'Sc');
      assert.match(ePV.text, /Bu örüntüyü gösteren hastalar, duygusal olarak geri çekilmişlerdir/);
      assert.match(ePV.text, /sosyal izolasyon içindedirler, şüpheci/);
      assert.match(ePV.text, /hepsini doğru yanıtlama şeklinde de ortaya çıkar/);
      assert.ok(ePV.diagnosis?.includes('Paranoid şizofreni'));

      assert.equal(resolveCodeInterpretation('Sc:paranoid_valley')?.text, ePV.text);
      assert.equal(resolveCodeInterpretation('Pa:paranoid_valley')?.text, ePV.text);
      assert.equal(resolveCodeInterpretation('Psikotik V')?.text, ePV.text);
      assert.equal(resolveCodeInterpretation('Sc:psychotic_v')?.text, ePV.text);
      assert.equal(resolveCodeInterpretation('Pa:psychotic_v')?.text, ePV.text);
    });

    it('89/98 ve 80/08 kodları gövde sadakati ve tanıları çözümlenir (s.147-148)', () => {
      const e89 = resolveCodeInterpretation('89')!;
      assert.equal(e89.code, '89/98');
      assert.match(e89.text, /ergenlerde ve yetişkinlerde ciddi psikopatolojiyi gösterir/);
      assert.ok(e89.diagnosis?.includes('Şizofreni'));
      assert.ok(e89.diagnosis?.includes('Madde kullanımına bağlı psikoz'));

      const e08 = resolveCodeInterpretation('08')!;
      assert.equal(e08.code, '80/08');
      assert.match(e08.text, /Genellikle sosyal açıdan çekingen kişilerdir/);
      assert.ok(e08.diagnosis?.includes('Şizoid Kişilik'));
    });

    it('86 vs 68 ve 87 vs 78 blok ayrımı korunur (s.132, s.140, s.146)', () => {
      // 86 Sc bloğunun 86/68 metnini döndürür
      assert.equal(resolveCodeInterpretation('86')?.code, '86/68');
      assert.match(resolveCodeInterpretation('86')!.text, /6 ve 8'in T puanı 80'nin üstünde/);
      // 68 Pa bloğunun 68/86 metnini döndürür
      assert.equal(resolveCodeInterpretation('68')?.code, '68/86');
      assert.match(resolveCodeInterpretation('68')!.text, /yoğun aşağılık duyguları dikkati çeker/);

      // 87 Sc bloğunun 87/78 metnini döndürür
      assert.equal(resolveCodeInterpretation('87')?.code, '87/78');
      assert.match(resolveCodeInterpretation('87')!.text, /Endişeli, kendi kendini tetkik edebilen/);
      // 78 Pt bloğunun 78/87 metnini döndürür
      assert.equal(resolveCodeInterpretation('78')?.code, '78/87');
      assert.match(resolveCodeInterpretation('78')!.text, /Psikolojik yardım arayan kişilerde oldukça sık görülür/);
    });

    it('İki haneli Sc kodları ve Bakınız yönlendirmeleri çözümlenir (s.146-148)', () => {
      assert.equal(resolveCodeInterpretation('81')?.code, '18/81');
      assert.equal(resolveCodeInterpretation('82')?.code, '28/82');
      assert.equal(resolveCodeInterpretation('83')?.code, '38/83');
      assert.equal(resolveCodeInterpretation('84')?.code, '48/84');
      assert.equal(resolveCodeInterpretation('85')?.code, '58/85');
      assert.equal(resolveCodeInterpretation('89')?.code, '89/98');
      assert.equal(resolveCodeInterpretation('80')?.code, '80/08');
    });
  });

  describe('Sc Bloğu Koşullu Yorumları (Conditions)', () => {
    it('Sc:86 koşulu: Pa, Sc >= 80 T ve Pt 65-75 T (s.146)', () => {
      const e = resolveCodeInterpretation('Sc:86')!;
      assert.ok(activeCodeConditions(e, ctx({ Pa: 85, Sc: 85, Pt: 70 })).some(c => c.quote.includes("6 ve 8'in T puanı 80'nin üstünde, 7 de 70 T puanındadır")));
      assert.equal(activeCodeConditions(e, ctx({ Pa: 75, Sc: 85, Pt: 70 })).length, 0);
      assert.equal(activeCodeConditions(e, ctx({ Pa: 85, Sc: 85, Pt: 55 })).length, 0);
    });

    it('Sc:87 koşulu: Pt & Sc >= 75 T ve Sc > Pt (s.146)', () => {
      const e = resolveCodeInterpretation('Sc:87')!;
      assert.ok(activeCodeConditions(e, ctx({ Pt: 76, Sc: 82 })).some(c => c.quote.includes('Pt & Sc ≥ 75 ∧ Sc > Pt')));
      assert.equal(activeCodeConditions(e, ctx({ Pt: 82, Sc: 76 })).length, 0);
      assert.equal(activeCodeConditions(e, ctx({ Pt: 65, Sc: 70 })).length, 0);
    });

    it('8726 koşulu: Ma >= 70 T ajite hipomani (s.146)', () => {
      const e = resolveCodeInterpretation('8726')!;
      assert.ok(activeCodeConditions(e, ctx({ Ma: 75 })).some(c => c.quote.includes('9 (Ma) alt testinin yüksekliği eşlik eder')));
      assert.equal(activeCodeConditions(e, ctx({ Ma: 60 })).length, 0);
    });

    it('Paranoid Vadi koşulu: Pa, Sc >= 70 T ve Pt vadi dibi (s.147)', () => {
      const e = resolveCodeInterpretation('Paranoid Vadi')!;
      assert.ok(activeCodeConditions(e, ctx({ Pa: 80, Sc: 85, Pt: 68 })).some(c => c.quote.includes('Pa ve Sc yüksek, Pt daha düşük vadi görünümündedir')));
      assert.equal(activeCodeConditions(e, ctx({ Pa: 80, Sc: 85, Pt: 78 })).length, 0);
      assert.equal(activeCodeConditions(e, ctx({ Pa: 65, Sc: 85, Pt: 50 })).length, 0);
    });

    it('89/98 koşulları: Yaş < 27 manuel notu ve 3. test 4/7/6 (s.147-148)', () => {
      const e = resolveCodeInterpretation('89')!;
      assert.ok(activeCodeConditions(e, ctx({}, 'Pd')).some(c => c.quote.includes('üçüncü yükselen alt test 4, 7 ya da 6’dır')));
      assert.ok(activeCodeConditions(e, ctx({}, 'Pt')).some(c => c.quote.includes('üçüncü yükselen alt test 4, 7 ya da 6’dır')));
      assert.ok(activeCodeConditions(e, ctx({}, 'Pa')).some(c => c.quote.includes('üçüncü yükselen alt test 4, 7 ya da 6’dır')));
      assert.ok(activeCodeConditions(e, ctx({})).some(c => c.manual && c.quote.includes("Yaşı 27'den küçük")));
      assert.equal(activeCodeConditions(e, ctx({}, 'D')).filter(c => !c.manual).length, 0);
    });

    it('80/08 koşulu: 3. test 7 (Pt) veya 2 (D) (s.148)', () => {
      const e = resolveCodeInterpretation('08')!;
      assert.ok(activeCodeConditions(e, ctx({}, 'Pt')).some(c => c.quote.includes('7 ve 2 alt testleri en yüksek üçüncü testtir')));
      assert.ok(activeCodeConditions(e, ctx({}, 'D')).some(c => c.quote.includes('7 ve 2 alt testleri en yüksek üçüncü testtir')));
      assert.equal(activeCodeConditions(e, ctx({}, 'Hs')).length, 0);
      assert.equal(activeCodeConditions(e, ctx({}, 'Ma')).length, 0);
    });
  });
});
