/**
 * Ölçek Bazlı Detaylı Klinik Rapor (Graham 1987) dosya içerikleri — bütünlük denetimi.
 *
 * Kilitli gerçekler (görsel olarak PDF'ten teyit edilmiştir):
 *  - Graham (1987) yüksek/düşük liste madde sayıları
 *  - D düşük 17/18'in kitapta basılı hâli ("uyandırır" / "vardır")
 *  - Tablo 8-17 madde sayıları ve K-ekleme bilgisi
 *  - Kullanıcının örnek koşullu cümlesinin Hs ve Pd kartlarında görünmesi
 *  - Metin içinde sayfa referansı olmaması; kaynak yalnız kart altlığında
 */
import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CLINICAL_SCALE_ORDER,
  SCALE_DOSSIERS,
  dossierSourceLine,
  grahamListsFor,
  paListFor,
  tabloDetail,
  type ClinicalScaleId,
  type GrahamItem,
} from '../src/scoring/mmpiScaleDossiers';
import { buildProfileFromRawScoresObject } from '../src/scoring/mmpiScoring';
import { MMPIClinicalTab } from '../src/components/results/MMPIClinicalTab';

const countItems = (lists: { items: GrahamItem[] }[]): number =>
  lists.reduce((total, list) => total + list.items.length, 0);

describe('Graham (1987) listeleri — madde sayıları kaynakla birebir', () => {
  it('yüksek puan listeleri: Hs 23, D 27, Hy 29, Pd 43, Pt 41, Sc 38, Ma 42, Si 20', () => {
    assert.equal(countItems(SCALE_DOSSIERS.Hs.high), 23);
    assert.equal(countItems(SCALE_DOSSIERS.D.high), 27);
    assert.equal(countItems(SCALE_DOSSIERS.Hy.high), 29);
    assert.equal(countItems(SCALE_DOSSIERS.Pd.high), 43);
    assert.equal(countItems(SCALE_DOSSIERS.Pt.high), 41);
    assert.equal(countItems(SCALE_DOSSIERS.Sc.high), 38);
    assert.equal(countItems(SCALE_DOSSIERS.Ma.high), 42);
    assert.equal(countItems(SCALE_DOSSIERS.Si.high), 20);
  });

  it('Mf cinsiyete göre: erkek yüksek 17, kadın yüksek 12, erkek düşük 15', () => {
    const mf = SCALE_DOSSIERS.Mf;
    assert.equal(countItems([mf.high[0]!]), 17, 'Mf erkek yüksek');
    assert.equal(countItems([mf.high[1]!]), 12, 'Mf kadın yüksek');
    assert.equal(countItems([mf.low[0]!]), 15, 'Mf erkek düşük');
  });

  it('düşük puan listeleri: Hs 5, D 18, Hy 9, Pd 16, Pt 5, Sc 9, Ma 14, Si 14', () => {
    assert.equal(countItems(SCALE_DOSSIERS.Hs.low), 5);
    assert.equal(countItems(SCALE_DOSSIERS.D.low), 18);
    assert.equal(countItems(SCALE_DOSSIERS.Hy.low), 9);
    assert.equal(countItems(SCALE_DOSSIERS.Pd.low), 16);
    assert.equal(countItems(SCALE_DOSSIERS.Pt.low), 5);
    assert.equal(countItems(SCALE_DOSSIERS.Sc.low), 9);
    assert.equal(countItems(SCALE_DOSSIERS.Ma.low), 14);
    assert.equal(countItems(SCALE_DOSSIERS.Si.low), 14);
  });

  it('D düşük 17/18 kitapta basılı hâliyle yer alır ("uyandırır" / "vardır")', () => {
    const items = SCALE_DOSSIERS.D.low[0]!.items.map(i => (typeof i === 'string' ? i : i.text));
    assert.match(items[16]!, /kızgınlık ve düşmanlık uyandırır/);
    assert.match(items[17]!, /çatışması vardır/);
  });

  it('Hs ve Pd kartlarında kullanıcının örnek koşullu cümlesi koşullar arasında', () => {
    const sample = 'Alt test 3 de birlikte yükselmişse aile ve evlilik sorunları';
    for (const id of ['Hs', 'Pd'] as ClinicalScaleId[]) {
      const conds = SCALE_DOSSIERS[id].conditions ?? [];
      assert.ok(
        conds.some(c => c.sentence.includes(sample)),
        `${id} koşullu ek yorum örnek cümleyi içermeli`,
      );
    }
  });

  it('koşullu ek yorumlar dinamik eşik fonksiyonu taşır', () => {
    for (const id of CLINICAL_SCALE_ORDER) {
      for (const c of SCALE_DOSSIERS[id].conditions ?? []) {
        assert.ok(c.when.length > 5, `${id} · when etiketi`);
        assert.ok(c.sentence.length > 20, `${id} · sentence`);
        assert.equal(typeof c.match, 'function');
      }
    }
    // Örnek: Hy T ≥ 70 iken Hs/Pd koşulu aktifleşir
    const t = { Hs: 80, D: 50, Hy: 75, Pd: 70, Mf: 50, Pa: 50, Pt: 50, Sc: 50, Ma: 50, Si: 50 } as never;
    assert.equal(SCALE_DOSSIERS.Hs.conditions![0]!.match(t), true);
  });
});

describe('Pa T-koşullu listeleri (T: 65-70 orta, 55-64 hafif, 35-45 düşük, T<35 aşırı düşük)', () => {
  it('paListFor beş düzlemi doğru seçer', () => {
    assert.equal(paListFor(85).range, '');
    assert.equal(paListFor(68).range, 'T: 65-70');
    assert.equal(paListFor(60).range, 'T: 55-64');
    assert.equal(paListFor(38).range, 'T: 35-45');
    assert.equal(paListFor(30).range, 'T<35');
  });

  it('Pa orta liste 12, aşırı düşük liste 5 madde; düşük listede iki koşul grubu', () => {
    assert.equal(countItems([paListFor(68).list]), 12);
    assert.equal(countItems([paListFor(30).list]), 5);
    const dusuk = paListFor(38).list.items;
    assert.equal(dusk(dusuk), 2);
  });

  it('klinik kart eşikleriyle uyumlu: T ≤ 40 → düşük/T<35, T ≥ 70 → Graham yüksek', () => {
    const lowCard = grahamListsFor('Pa', 38, 'low');
    assert.equal(lowCard.range, 'T: 35-45');
    const veryLowCard = grahamListsFor('Pa', 32, 'low');
    assert.equal(veryLowCard.range, 'T<35');
    const highCard = grahamListsFor('Pa', 76, 'high');
    assert.equal(highCard.range, '');
  });
});

function dusk(items: GrahamItem[]): number {
  return items.filter(i => typeof i !== 'string').length;
}

describe('Tablo 8-17 blokları SCORING_KEYS ile birebir', () => {
  it('madde sayıları: Hs 33, D 60, Hy 60, Pd 50, Mf 60, Pa 40, Pt 48, Sc 78, Ma 46, Si 70', () => {
    const expected: Record<ClinicalScaleId, number> = {
      Hs: 33, D: 60, Hy: 60, Pd: 50, Mf: 60, Pa: 40, Pt: 48, Sc: 78, Ma: 46, Si: 70,
    };
    for (const id of CLINICAL_SCALE_ORDER) {
      const tab = tabloDetail(id, 'Erkek');
      assert.equal(tab.count, expected[id], `${id} madde sayısı`);
      assert.equal(tab.dogru.length + tab.yanlis.length, expected[id]);
    }
  });

  it('K Eklemeli: Hs, Pd, Pt, Sc, Ma — diğerleri değil', () => {
    const k: Record<ClinicalScaleId, boolean> = {
      Hs: true, D: false, Hy: false, Pd: true, Mf: false, Pa: false, Pt: true, Sc: true, Ma: true, Si: false,
    };
    for (const id of CLINICAL_SCALE_ORDER) {
      assert.equal(tabloDetail(id, 'Erkek').kEkleli, k[id], `${id} K-ekleme`);
    }
  });

  it('normlar Tablo 30 değerleridir (Savaşır dipnotları reddedildi)', () => {
    assert.equal(tabloDetail('Hy', 'Kadın').normFemale, 18.12);
    assert.equal(tabloDetail('Pt', 'Kadın').normFemale, 29.2);
    assert.equal(tabloDetail('Si', 'Erkek').normMale, 23.86);
    assert.equal(tabloDetail('D', 'Erkek').normMale, 20.63);
  });
});

describe('Kaynak gösterimi ve yasaklı kalıplar', () => {
  it('kart altlığı tek satırda künye + sayfa + Tablo + Savaşır taşır', () => {
    const line = dossierSourceLine('Hs');
    assert.match(line, /^Kaynak: Graham \(1987\)/);
    assert.match(line, /Ceyhun & Oral \(2003\), s\.64-67 \(Tablo 8\)/);
    assert.match(line, /Savaşır \(1981\)/);
    for (const id of CLINICAL_SCALE_ORDER) {
      assert.match(dossierSourceLine(id), /Tablo \d+/);
    }
  });

  it('gövde metinlerinde (liste/not/koşullu/giriş) sayfa referansı yoktur', () => {
    const pageRef = /\bs\.\d/;
    for (const id of CLINICAL_SCALE_ORDER) {
      const d = SCALE_DOSSIERS[id];
      const texts: string[] = [d.overview, d.pages === '' ? '' : ''];
      const collect = (items: GrahamItem[]) => {
        for (const item of items) {
          if (typeof item === 'string') texts.push(item);
          else {
            texts.push(item.text);
            texts.push(...item.sub);
          }
        }
      };
      for (const list of [...d.high, ...d.low, ...(d.scoreLists?.map(s => s.list) ?? [])]) collect(list.items);
      for (const note of d.notes ?? []) {
        texts.push(...(note.paragraphs ?? []), ...(note.list ?? []), note.title ?? '');
      }
      for (const c of d.conditions ?? []) texts.push(c.sentence, c.when);
      for (const text of texts) {
        assert.doesNotMatch(text, pageRef, `${id} gövdesinde sayfa referansı: ${text.slice(0, 60)}`);
      }
    }
  });

  it('"klinik karar uygulayıcı uzmana aittir" tarzı tekrar gövde metinlerinde yoktur', () => {
    const boiler = /klinik karar uygulayıcı|kesme puanları tanı koymaz/i;
    for (const id of CLINICAL_SCALE_ORDER) {
      const d = SCALE_DOSSIERS[id];
      const all = [
        d.overview,
        ...(d.conditions ?? []).map(c => c.sentence),
        ...(d.notes ?? []).flatMap(n => [...(n.paragraphs ?? []), ...(n.list ?? [])]),
      ].join(' ');
      assert.doesNotMatch(all, boiler, `${id} gövdesinde gereksiz uyarı`);
    }
  });
});

describe('MMPIClinicalTab — hem yüksek hem düşük kartlar render olur', () => {
  const mixedProfile = () =>
    buildProfileFromRawScoresObject(
      {
        blank: 0, L: 4, F: 5, K: 15,
        Hs: 25, D: 8, Hy: 30, Pd: 15, Mf: 25, Pa: 10, Pt: 15, Sc: 15, Ma: 2, Si: 20,
      } as never,
      'Erkek',
    );

  it('T ≥ 70 kartı "KLİNİK YÜKSEKLİK", T ≤ 40 kartı "KLİNİK DÜŞÜKLÜK" pilli ve iki bölüm başlığı taşır', () => {
    const p = mixedProfile();
    const html = renderToStaticMarkup(createElement(MMPIClinicalTab, { profile: p }));
    assert.match(html, /KLİNİK YÜKSEKLİK/);
    assert.match(html, /KLİNİK DÜŞÜKLÜK/);
    assert.match(html, /ALT TESTİNDE YÜKSEK PUAN ALAN BİREYİN/);
    assert.match(html, /ALT TESTİNDE DÜŞÜK PUAN ALAN BİREYİN/);
    assert.match(html, /Kategori: Klinik Ölçek/);
    assert.match(html, /Ham: \d+/);
  });
});
