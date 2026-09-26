import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { ASSESSMENT_CATALOG, type AssessmentKey } from '../src/clinical/assessmentCatalog';
import { AssessmentPaperSheet, AssessmentResultPrintHeader } from '../src/components/clinical/AssessmentPrint';

test('ölçek hakları, kimliği ve bu yapıdaki Türkçe içerik modu araç bazında açıktır', () => {
  assert.equal(ASSESSMENT_CATALOG.bdi.access, 'licensed');
  assert.equal(ASSESSMENT_CATALOG.bai.access, 'licensed');
  assert.equal(ASSESSMENT_CATALOG.scl90.access, 'licensed');
  assert.equal(ASSESSMENT_CATALOG.gad7.access, 'free-reproduction');
  assert.equal(ASSESSMENT_CATALOG.phq9.access, 'free-reproduction');
  for (const meta of Object.values(ASSESSMENT_CATALOG)) {
    assert.equal(meta.itemContent, 'transfer-only');
    assert.ok(meta.instrumentVersion.length > 5);
  }
  assert.match(ASSESSMENT_CATALOG.bdi.printNotice, /test kitapçığı değildir/i);
  assert.match(ASSESSMENT_CATALOG.phq9.rightsNotice, /izin almadan/i);
  assert.match(ASSESSMENT_CATALOG.phq9.rightsNotice, /birebir eşliği doğrulanamad/i);
});

test('yetkili form aktarım çıktısı korunan BDI madde metnini yeniden üretmez', () => {
  const html = renderToStaticMarkup(createElement(AssessmentPaperSheet, {
    assessment: 'bdi', respondentName: 'Test Danışan', date: '2026-09-26',
    items: [{ id: 1, text: 'TELIFLI_MADDE_METNI' }],
    options: [0, 1, 2, 3].map((score) => ({ score, label: 'Yanıt' })),
  }));
  assert.match(html, /YETKİLİ \/ DOĞRULANMIŞ FORM İÇİN YANIT AKTARIM SAYFASI/);
  assert.match(html, /test kitapçığı değildir/i);
  assert.doesNotMatch(html, /TELIFLI_MADDE_METNI/);
});

test('serbest çoğaltılabilen araçta doğrulanmamış Türkçe metin yerine sayısal aktarım basılır', () => {
  const html = renderToStaticMarkup(createElement(AssessmentPaperSheet, {
    assessment: 'gad7', respondentName: '', date: '',
    items: [{ id: 1, text: 'DOGRULANMAMIS_TURKCE_METIN' }],
    options: [{ score: 0, label: 'Puan' }, { score: 1, label: 'Puan' }],
  }));
  assert.match(html, /YANIT AKTARIM SAYFASI/);
  assert.doesNotMatch(html, /DOGRULANMAMIS_TURKCE_METIN/);
  assert.match(html, /birebir eşliği doğrulanamad/i);
});

test('beş aracın kağıt çıktısı aynı kaynak politikasına göre metin sızdırmaz', () => {
  for (const assessment of Object.keys(ASSESSMENT_CATALOG) as AssessmentKey[]) {
    const marker = `HIDDEN_${assessment.toUpperCase()}_ITEM`;
    const html = renderToStaticMarkup(createElement(AssessmentPaperSheet, {
      assessment, respondentName: 'A', date: '2026-09-26',
      items: [{ id: 1, text: marker }], options: [{ score: 0, label: 'Puan' }],
    }));
    assert.doesNotMatch(html, new RegExp(marker));
  }
});

test('kağıt ve sonuç PDF çıktılarında hak, sürüm ve ürün telif bilgisi korunur', () => {
  const resultHtml = renderToStaticMarkup(createElement(AssessmentResultPrintHeader, {
    assessment: 'phq9', respondentName: 'Test Danışan', date: '2026-09-26',
    instrumentVersion: 'PHQ-9-2001-TR-Sari-2016', demographics: 'Kadın · 30 yaş',
  }));
  const css = readFileSync('src/styles/assessment-print.css', 'utf8');
  assert.match(resultHtml, /© 2026 Halil Karaduman/);
  assert.match(resultHtml, /izin almadan/i);
  assert.match(resultHtml, /PHQ-9-2001-TR-Sari-2016/);
  assert.match(css, /data-assessment-print='paper'/);
  assert.match(css, /data-assessment-print='result'/);
  assert.match(css, /\.paper-assessment-table/);
  assert.match(css, /paper-assessment-product-copyright/);
  assert.match(css, /assessment-result-product-copyright/);
});
