import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCodeInterpretation,
  activeCodeConditions,
  CodeScaleKey,
} from '../src/scoring/mmpiSourceCodes';

describe('DECISION-031/A — Ma (Hipomani / 9) Bloğu Kod Yorumları ve Koşulları (s.149-153)', () => {
  const ctx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey, gender?: 'Erkek' | 'Kadın') => ({
    t: (id: CodeScaleKey) => over[id],
    third,
    gender,
  });

  describe('Ma Bloğu Kod Gövdeleri Çözümleme ve Sadakat', () => {
    it('Ma:9_highK / Yüksek 9 / Yüksek K gövdesi ve takma adları çözümlenir (s.152)', () => {
      const e = resolveCodeInterpretation('Ma:9_highK')!;
      assert.ok(e, 'Ma:9_highK tanımlı olmalı');
      assert.equal(e.code, 'Yüksek 9 / Yüksek K');
      assert.equal(e.block, 'Ma');
      assert.match(e.text, /enerjik, organize, diğerlerinin kendileri üzerinde otorite kurmasını istemeyen/);
      assert.match(e.text, /Genellikle çok iyi yöneticidirler/);
      assert.match(e.text, /Güç yönelimli bireylerdir/);
      assert.match(e.text, /K alt testi 70 T puanının üzerine çıkarsa, kendi yaşamlarını/);
      assert.match(e.text, /Kadınlar fiziksel çekicilik konusunda teşhircidirler/);
      assert.match(e.seeAlso ?? '', /s\.152/);

      // Takma adlar ve serbest metin sorguları
      assert.equal(resolveCodeInterpretation('Yüksek 9 / Yüksek K')?.code, 'Yüksek 9 / Yüksek K');
      assert.equal(resolveCodeInterpretation('Ma:high9_highK')?.code, 'Yüksek 9 / Yüksek K');
      assert.equal(resolveCodeInterpretation('Ma:9K')?.code, 'Yüksek 9 / Yüksek K');
    });

    it('Ma:9_lowK / Yüksek 9 / Düşük K gövdesi, tanısı ve takma adları çözümlenir (s.153)', () => {
      const e = resolveCodeInterpretation('Ma:9_lowK')!;
      assert.ok(e, 'Ma:9_lowK tanımlı olmalı');
      assert.equal(e.code, 'Yüksek 9 / Düşük K');
      assert.equal(e.block, 'Ma');
      assert.match(e.text, /Narsisistik kişilerdir/);
      assert.match(e.text, /Kadınlar, eksibisyonist bir biçimde kendilerini sergileyerek/);
      assert.ok(e.diagnosis?.includes('Narsisistik kişilik'));
      assert.match(e.seeAlso ?? '', /s\.153/);

      // Takma adlar
      assert.equal(resolveCodeInterpretation('Yüksek 9 / Düşük K')?.code, 'Yüksek 9 / Düşük K');
      assert.equal(resolveCodeInterpretation('Ma:high9_lowK')?.code, 'Yüksek 9 / Düşük K');
    });

    it('Ma:19 / 91/19 bloğa özel gövdesi ve 19/91 ayrımı çözümlenir (s.77 vs s.153)', () => {
      const eMa19 = resolveCodeInterpretation('Ma:19')!;
      assert.ok(eMa19, 'Ma:19 tanımlı olmalı');
      assert.equal(eMa19.code, '91/19');
      assert.equal(eMa19.block, 'Ma');
      assert.match(eMa19.text, /Ender görülmektedir\. Hastalar hipomanik durumdadırlar/);
      assert.match(eMa19.text, /Başarısızlıkla engellenmişlerdir/);
      assert.match(eMa19.seeAlso ?? '', /Ayrıca 19\/91 Koduna da Bakınız/);

      // 91 (Ma lider) Ma:19 gövdesini döndürürken, 19 (Hs lider) 19/91 Hs gövdesini döndürür:
      const e91 = resolveCodeInterpretation('91')!;
      assert.equal(e91.code, '91/19');
      assert.match(e91.text, /Ender görülmektedir\. Hastalar hipomanik durumdadırlar/);

      const e19 = resolveCodeInterpretation('19')!;
      assert.equal(e19.code, '19/91');
      assert.match(e19.text, /gergin ve kaygılı olarak tanımlanır/);
      assert.doesNotMatch(e19.text, /Ender görülmektedir\. Hastalar hipomanik durumdadırlar/);
    });

    it('90/09 kodu gövde sadakatiyle çözümlenir (s.153)', () => {
      const e90 = resolveCodeInterpretation('90')!;
      assert.equal(e90.code, '90/09');
      assert.match(e90.text, /özellikle erkeklerde çok az görülür/);
      assert.match(e90.text, /Si alt testinin yükselmesi bırakılarak yorum/);

      const e09 = resolveCodeInterpretation('09')!;
      assert.equal(e09.code, '90/09');
    });

    it('İki haneli Ma kodları ve Bakınız yönlendirmeleri çözümlenir (s.153)', () => {
      assert.equal(resolveCodeInterpretation('92')?.code, '29/92');
      assert.equal(resolveCodeInterpretation('93')?.code, '39/93');
      assert.equal(resolveCodeInterpretation('94')?.code, '49/94');
      assert.equal(resolveCodeInterpretation('95')?.code, '59/95');
      assert.equal(resolveCodeInterpretation('96')?.code, '69/96');
      assert.equal(resolveCodeInterpretation('97')?.code, '79/97');
      assert.equal(resolveCodeInterpretation('98')?.code, '89/98');
      assert.equal(resolveCodeInterpretation('90')?.code, '90/09');
    });
  });

  describe('Ma Bloğu Koşullu Yorumları (Conditions)', () => {
    it('Ma:9_highK koşulları: D < 50, K > 70 ve Kadın Mf < 40 (s.152)', () => {
      const e = resolveCodeInterpretation('Ma:9_highK')!;
      assert.equal(e.conditions?.length, 3, 'Ma:9_highK 3 koşul taşımalı');

      // 1. D < 50
      const cD = e.conditions![0];
      assert.equal(cD.test?.(ctx({ D: 45 })), true);
      assert.equal(cD.test?.(ctx({ D: 55 })), false);

      // 2. K > 70
      const cK = e.conditions![1];
      assert.equal(cK.test?.(ctx({ K: 75 })), true);
      assert.equal(cK.test?.(ctx({ K: 65 })), false);

      // 3. Kadın Mf < 40
      const cMf = e.conditions![2];
      assert.equal(cMf.test?.(ctx({ Mf: 35 }, undefined, 'Kadın')), true);
      assert.equal(cMf.test?.(ctx({ Mf: 45 }, undefined, 'Kadın')), false);
      assert.equal(cMf.test?.(ctx({ Mf: 35 }, undefined, 'Erkek')), false, 'Erkeklerde tetiklenmez');
    });

    it('Ma:9_lowK koşulu: Kadın eksibisyonizm (s.153)', () => {
      const e = resolveCodeInterpretation('Ma:9_lowK')!;
      assert.equal(e.conditions?.length, 1);
      const c = e.conditions![0];
      assert.equal(c.test?.(ctx({}, undefined, 'Kadın')), true);
      assert.equal(c.test?.(ctx({}, undefined, 'Erkek')), false);
    });

    it('90/09 koşulu: erkeklerde nadirlik uyarısı (s.153)', () => {
      const e = resolveCodeInterpretation('90')!;
      const actErkek = activeCodeConditions(e, ctx({}, undefined, 'Erkek'));
      assert.equal(actErkek.length, 1);
      assert.match(actErkek[0].quote, /özellikle erkeklerde çok az görülür/);

      const actKadin = activeCodeConditions(e, ctx({}, undefined, 'Kadın'));
      assert.equal(actKadin.length, 0);
    });

    it('49/94 s.153 eyleme vurukluk klinik notu (s.153)', () => {
      const e = resolveCodeInterpretation('49')!;
      assert.match(e.seeAlso ?? '', /Eyleme vuruk davranış ile ilgilidir/);
    });
  });
});
