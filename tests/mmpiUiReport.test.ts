import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { buildProfileFromRawScoresObject } from '../src/scoring/mmpiScoring';
import { MMPICodeTab } from '../src/components/results/MMPICodeTab';
import { MMPIPrintReport } from '../src/components/results/MMPIPrintReport';
import { SourcesPage } from '../src/components/SourcesPage';

describe('PHASE 12 & 13 — UI ve Yazdırma Raporu (MMPIPrintReport & MMPICodeTab) Denetimi', () => {
  /** 123 üçlü kodunu tetikleyen profil: Hs=25 (T ~98), D=40 (T ~90), Hy=30 (T ~73) */
  const triad123Profile = () =>
    buildProfileFromRawScoresObject(
      {
        blank: 0, L: 4, F: 5, K: 15,
        Hs: 25,
        D: 40,
        Hy: 30,
        Pd: 15, Mf: 25, Pa: 10, Pt: 15, Sc: 15, Ma: 15, Si: 20,
      } as never,
      'Erkek',
    );

  /** 278 üçlü intihar riski kodunu tetikleyen profil: D=45 (T ~101), Pt=40 (T ~93), Sc=40 (T ~78) */
  const triad278Profile = () =>
    buildProfileFromRawScoresObject(
      {
        blank: 0, L: 4, F: 5, K: 15,
        Hs: 10,
        D: 45,
        Hy: 15,
        Pd: 15, Mf: 25, Pa: 10,
        Pt: 40,
        Sc: 40,
        Ma: 15, Si: 20,
      } as never,
      'Erkek',
    );

  it('MMPICodeTab: 123 üçlü kodu eşleştiğinde hem 12/21 ana kodunu hem 123 genişletilmiş analizini gösterir', () => {
    const p = triad123Profile();
    const html = renderToStaticMarkup(createElement(MMPICodeTab, { profile: p }));

    // Ana 2 noktalı kod
    assert.match(html, /12\/21/);
    // Üçüncü yükselen ölçek (Hy)
    assert.match(html, /3\. yükselen: Histeri/);
    // Genişletilmiş çok noktalı analiz kartı (123)
    assert.match(html, /Genişletilmiş Çok Noktalı Kod Analizi: 123\/213/);
    assert.match(html, /belirgin bir somatizasyon bozukluğu ve hipokondriyak uğraşlar görülür/);
  });

  it('MMPICodeTab: 278 intihar riski üçlü kodu eşleştiğinde 278 gövdesi basılır', () => {
    const p = triad278Profile();
    const html = renderToStaticMarkup(createElement(MMPICodeTab, { profile: p }));

    // Ana 2 noktalı kod 27/72
    assert.match(html, /27\/72/);
    // Genişletilmiş çok noktalı analiz kartı (278)
    assert.match(html, /278\/728/);
    assert.match(html, /intihar düşüncesi ya da girişimi olasılığı yüksektir/);
  });

  it('MMPIPrintReport: Çok noktalı kod analizi ve Bölüm 6 profil örüntüleri basılı rapora aktarılır', () => {
    const p = triad278Profile();
    const html = renderToStaticMarkup(
      createElement(MMPIPrintReport, {
        profile: p,
        meta: {
          fullName: 'Test Danışan',
          testDate: '2026-09-22',
          reportDate: '2026-09-22',
          psychologist: 'Uzm. Psk.',
          gender: 'Erkek',
          age: '30',
          occupation: '', education: '', method: '', duration: '', reason: '', followUp: '', marital: '',
        },
      }),
    );

    // Başlık ve meta
    assert.match(html, /MMPI Klinik Raporu/);
    // Kod analizi
    assert.match(html, /Kod Analizi/);
    assert.match(html, /Çok Noktalı Kod Analizi \(278\/728\)/);
    assert.match(html, /intihar düşüncesi ya da girişimi olasılığı yüksektir/);

    // Bölüm 6 örüntüleri (D=101, Pt=93 -> Depresif Kod (2-7 / 7-2))
    assert.match(html, /Profil Örüntüleri &amp; Konfigürasyonları \(Bölüm 6\)/);
    assert.match(html, /Depresif Kod \(2-7 \/ 7-2\)/);
  });

  it('SourcesPage: Ceyhun & Oral (2003) Status A olarak künyelenmiştir ve docs/kaynak-denetimi.md atfı vardır', () => {
    const html = renderToStaticMarkup(createElement(SourcesPage));
    assert.match(html, /Ceyhun, A\. A\., &amp; Oral, G\. \(2003\)/);
    assert.match(html, /MMPI profillerini yorumlama el kitabı/);
    assert.match(html, /docs\/kaynak-denetimi\.md/);
    assert.match(html, /docs\/mmpi-audit\//);
  });

  it('CONFLICT-007: docs/kaynak-denetimi.md dosyası depoda mevcuttur ve temel eşleştirme tablosunu içerir', () => {
    const filePath = path.join(process.cwd(), 'docs/kaynak-denetimi.md');
    assert.ok(fs.existsSync(filePath), 'docs/kaynak-denetimi.md depoda bulunmalıdır');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.match(content, /MMPI Kaynak Denetimi ve Künye–Bileşen Eşleştirme Raporu/);
    assert.match(content, /Ceyhun, A\. A\., & Oral, G\. \(2003\)/);
    assert.match(content, /Savaşır, I\. \(1981\)/);
    assert.match(content, /docs\/mmpi-audit\//);
  });
});
