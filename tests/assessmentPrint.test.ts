import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { ASSESSMENT_CATALOG } from '../src/clinical/assessmentCatalog';
import { AssessmentPaperSheet, AssessmentResultPrintHeader } from '../src/components/clinical/AssessmentPrint';

test('ölçek hakları araç bazında açık ve doğru baskı türüne bağlıdır', () => {
  assert.equal(ASSESSMENT_CATALOG.bdi.access, 'licensed');
  assert.equal(ASSESSMENT_CATALOG.bai.access, 'licensed');
  assert.equal(ASSESSMENT_CATALOG.scl90.access, 'licensed');
  assert.equal(ASSESSMENT_CATALOG.gad7.access, 'free-reproduction');
  assert.equal(ASSESSMENT_CATALOG.phq9.access, 'free-reproduction');
  assert.match(ASSESSMENT_CATALOG.bdi.printNotice, /test kitapçığı değildir/i);
  assert.match(ASSESSMENT_CATALOG.phq9.rightsNotice, /izin gerekmez/i);
});

test('lisanslı araç kağıt çıktısı madde metnini yeniden üretmez', () => {
  const html = renderToStaticMarkup(createElement(AssessmentPaperSheet, {
    assessment: 'bdi',
    respondentName: 'Test Danışan',
    date: '2026-09-26',
    items: [{ id: 1, text: 'TELIFLI_MADDE_METNI' }],
    options: [0, 1, 2, 3].map((score) => ({ score, label: 'Yanıt' })),
  }));
  assert.match(html, /LİSANSLI FORM İÇİN YANIT AKTARIM SAYFASI/);
  assert.match(html, /test kitapçığı değildir/i);
  assert.doesNotMatch(html, /TELIFLI_MADDE_METNI/);
});

test('çoğaltıma açık araç kağıt çıktısı danışanın işaretleyeceği maddeyi içerir', () => {
  const html = renderToStaticMarkup(createElement(AssessmentPaperSheet, {
    assessment: 'gad7',
    respondentName: '',
    date: '',
    items: [{ id: 1, text: 'SERBEST_MADDE_METNI' }],
    options: [{ score: 0, label: 'Hiç' }, { score: 1, label: 'Birkaç gün' }],
  }));
  assert.match(html, /DANIŞAN ÖZ BİLDİRİM FORMU/);
  assert.match(html, /SERBEST_MADDE_METNI/);
  assert.match(html, /izin gerekmez/i);
});

test('kağıt ve sonuç PDF çıktılarında hak/ürün telif bilgisi korunur', () => {
  const resultHtml = renderToStaticMarkup(createElement(AssessmentResultPrintHeader, {
    assessment: 'phq9',
    respondentName: 'Test Danışan',
    date: '2026-09-26',
  }));
  const css = readFileSync('src/styles/assessment-print.css', 'utf8');
  assert.match(resultHtml, /© 2026 Halil Karaduman/);
  assert.match(resultHtml, /izin gerekmez/i);
  assert.match(css, /data-assessment-print='paper'/);
  assert.match(css, /data-assessment-print='result'/);
  assert.match(css, /\.paper-assessment-table/);
  assert.match(css, /paper-assessment-product-copyright/);
  assert.match(css, /assessment-result-product-copyright/);
});
