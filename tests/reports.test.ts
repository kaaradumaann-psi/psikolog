import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { parseRecordPayload } from '../src/workspace/caseTypes';
import { buildProfileFromAnswers, buildProfileFromRawScoresObject } from '../src/scoring/mmpiScoring';
import { clinicalBandFor, codeInterpretationForProfile } from '../src/scoring/mmpiInterpretation';
import { reportDataAdapter, displayValue, MISSING } from '../src/reports/reportDataAdapter';
import {
  blockText,
  dataCatalog,
  fieldValue,
  instantiateTemplate,
  inlineLines,
  refreshDocumentData,
  resolvePlaceholders,
  standardTemplate,
  templateFromDocument,
} from '../src/reports/templateEngine';
import { ReportPreview, safeReportImage } from '../src/reports/ReportPreview';
import type { FullRecordDetail } from '../src/records/supabaseRecords';

const record: FullRecordDetail = {
  id: '11111111-1111-4111-8111-111111111111',
  firstName: 'Test',
  lastName: 'Danışan',
  applicationDate: '2026-09-20',
  createdAt: '2026-09-20T12:00:00Z',
  gender: 'Kadın',
  age: 32,
  psychologistName: 'Test Uzman',
  rawOmrAnswers: [],
  expertNotes: 'Uzmanın mevcut notu',
};
const parsed = parseRecordPayload([]);
const profile = buildProfileFromRawScoresObject(
  {
    blank: 3,
    L: 5,
    F: 9,
    K: 12,
    Hs: 14,
    D: 21,
    Hy: 19,
    Pd: 22,
    Mf: 30,
    Pa: 11,
    Pt: 28,
    Sc: 30,
    Ma: 20,
    Si: 24,
  },
  'Kadın',
);
const source = reportDataAdapter(record, parsed, profile);
test('adapter copies every clinical score and verified interpretation without modifying input', () => {
  const before = JSON.stringify({ record, parsed, profile });
  const result = reportDataAdapter(record, parsed, profile);
  for (const s of profile.clinical) {
    assert.equal(fieldValue(result, `clinical.${s.id}.T`), s.tScore);
    assert.equal(fieldValue(result, `clinical.${s.id}.raw`), s.rawScore);
    assert.equal(fieldValue(result, `clinical.${s.id}.kAdded`), s.kAdded ?? null);
    assert.equal(
      fieldValue(result, `clinical.${s.id}.comment`),
      clinicalBandFor(s.id, profile.gender, s.tScore)?.text ?? null,
    );
  }
  for (const f of profile.validityAnalysis.findings)
    assert.equal(fieldValue(result, `validity.${f.id}.T`), f.t);
  assert.equal(
    fieldValue(result, 'code.interpretation'),
    codeInterpretationForProfile(profile.profileCode, profile)?.entry.text ?? null,
  );
  assert.equal(JSON.stringify({ record, parsed, profile }), before);
});
test('raw-only reports hide missing critical and derived sections, never pretend item data exists', () => {
  const doc = instantiateTemplate(standardTemplate(), source);
  assert.ok(!source.tables.derived);
  assert.ok(!dataCatalog(source).some((c) => /birth|TR|critical|derived/.test(c.path)));
  assert.ok(!doc.blocks.some((b) => /Kritik Bulgular|Türetilmiş Ölçekler/.test(blockText(b, source))));
});
test('item-level results are copied, including consistency, critical and derived results', () => {
  const p = buildProfileFromAnswers(
    Array.from({ length: 566 }, (_, i) => (i % 3 === 0 ? 'D' : 'Y')),
    'Kadın',
  );
  const s = reportDataAdapter(record, parsed, p);
  assert.equal(fieldValue(s, 'validity.TR.score'), p.itemLevel!.trIndex.score);
  assert.equal(fieldValue(s, 'validity.carelessness.score'), p.itemLevel!.carelessness.score);
  assert.equal(s.tables.derived!.rows.length, p.itemLevel!.derivedScales.length);
  assert.equal(s.tables.indexes!.rows.length, p.itemLevel!.derivedIndexes.length);
  if (p.itemLevel!.criticalItems.length)
    assert.match(String(fieldValue(s, 'critical')), new RegExp(String(p.itemLevel!.criticalItems[0]!.id)));
});
test('missing placeholders are safe, zero is present, prototype paths are denied', () => {
  const s = { ...source, fields: { ...source.fields, zero: 0, invalid: NaN } };
  assert.equal(
    resolvePlaceholders('{{patient.fullName}} / {{zero}} / {{absent}}', s),
    `Test Danışan / 0 / ${MISSING}`,
  );
  assert.equal(resolvePlaceholders('{{invalid}}', s), MISSING);
  assert.equal(fieldValue(s, '__proto__.constructor'), undefined);
  assert.equal(fieldValue(s, 'patient.constructor'), undefined);
  for (const value of [undefined, null, '', NaN, Infinity, {}]) assert.equal(displayValue(value), MISSING);
  assert.equal(displayValue(0), '0');
});
test('snapshots are detached and change fingerprint only when source data changes', () => {
  assert.deepEqual(reportDataAdapter(record, parsed, profile), source);
  const updated = reportDataAdapter({ ...record, expertNotes: 'Yeni not' }, parsed, profile);
  assert.notEqual(updated.source_data_version, source.source_data_version);
  assert.equal(source.fields.expertNotes, 'Uzmanın mevcut notu');
  updated.tables.clinical!.rows[0]![0] = 'changed';
  assert.notEqual(updated.tables.clinical!.rows[0]![0], source.tables.clinical!.rows[0]![0]);
});
test('templates produce new block ids; locked score bindings remain bindings', () => {
  const template = standardTemplate();
  const doc = instantiateTemplate(template, source);
  assert.ok(doc.blocks.every((b) => !template.blocks.some((t) => t.id === b.id)));
  assert.ok(doc.blocks.some((b) => b.type === 'dataTable' && b.path === 'clinical'));
  const exported = templateFromDocument(doc);
  assert.ok(exported.blocks.some((b) => b.runs?.some((r) => r.text === '{{expertNotes}}')));
  assert.equal(exported.letterhead, undefined);
});
test('null profile produces only real intake fields; rendered document has no fabricated clinical section', () => {
  const s = reportDataAdapter(record, parsed, null);
  const doc = instantiateTemplate(standardTemplate(), s);
  const html = renderToStaticMarkup(
    createElement(ReportPreview, {
      content: doc,
      source: s,
      title: 'Test',
      date: record.createdAt,
      status: 'draft',
    }),
  );
  assert.match(html, /Test Danışan/);
  assert.doesNotMatch(html, /undefined|NaN|>null<|Klinik Ölçekler|Geçerlik Değerlendirmesi/);
});
test('print view escapes text and rejects active image data URLs', () => {
  const doc = instantiateTemplate(standardTemplate(), source);
  doc.blocks.push({ id: 'x', type: 'paragraph', runs: [{ text: '<script>alert(1)</script>', bold: true }] });
  const html = renderToStaticMarkup(
    createElement(ReportPreview, {
      content: doc,
      source,
      title: 'Test',
      date: record.createdAt,
      status: 'completed',
    }),
  );
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script/);
  assert.match(html, /<thead>/);
  assert.equal(safeReportImage('data:image/svg+xml;base64,abcd'), undefined);
  assert.equal(safeReportImage('https://external.example/track.png'), undefined);
  assert.equal(safeReportImage('data:image/png;base64,YWJjZA=='), 'data:image/png;base64,YWJjZA==');
});
test('report adapter has no scoring execution imports and storage never writes mmpi_records', () => {
  const adapter = readFileSync('src/reports/reportDataAdapter.ts', 'utf8');
  assert.doesNotMatch(
    adapter,
    /buildProfileFrom|computeRaw|computeT|kAddition|findCriticalItems|computeDerived/,
  );
  const api = readFileSync('src/reports/reportsApi.ts', 'utf8');
  assert.doesNotMatch(api, /from\(['"]mmpi_records['"]\)/);
  assert.match(api, /eq\('revision', report.revision\)/);
  assert.match(readFileSync('src/styles/reports.css', 'utf8'), /@page psych-report/);
});
test('custom score placeholders compile into locked fields and locked tables', () => {
  const doc = instantiateTemplate(
    {
      schemaVersion: 1,
      blocks: [
        { id: 'one', type: 'paragraph', runs: [{ text: 'Hs T: {{clinical.Hs.T}}' }] },
        {
          id: 'two',
          type: 'table',
          rows: [
            ['Ölçek', 'T'],
            ['Hs', '{{clinical.Hs.T}}'],
          ],
        },
      ],
    },
    source,
  );
  assert.equal(doc.blocks[0]?.type, 'dataField');
  assert.equal(doc.blocks[1]?.type, 'dataTable');
  assert.equal(
    blockText(doc.blocks[0]!, source),
    `Hs T: ${profile.clinical.find((x) => x.id === 'Hs')!.tScore}`,
  );
});
test('empty evaluation/result sections stay in editor but have no orphan heading in PDF', () => {
  const doc = instantiateTemplate(standardTemplate(), source);
  assert.ok(doc.blocks.some((b) => blockText(b, source) === '9. Sonuç'));
  const html = renderToStaticMarkup(
    createElement(ReportPreview, {
      content: doc,
      source,
      title: 'Test',
      date: record.createdAt,
      status: 'draft',
    }),
  );
  assert.doesNotMatch(html, /9\. Sonuç|10\. Notlar/);
});

test('explicit refresh updates untouched generated prose and preserves manual edits and score bindings', () => {
  const doc = instantiateTemplate(standardTemplate(), source);
  doc.blocks.push({ id: 'manual', type: 'paragraph', runs: [{ text: 'Manuel değerlendirme' }] });
  const nextSource = { ...source, fields: { ...source.fields, expertNotes: 'Yeni uzman notu' } };
  const refreshed = refreshDocumentData(doc, nextSource);
  assert.ok(refreshed.blocks.some((b) => blockText(b, nextSource) === 'Yeni uzman notu'));
  assert.equal(refreshed.blocks.at(-1)?.runs?.[0]?.text, 'Manuel değerlendirme');
  assert.ok(doc.blocks.some((b) => blockText(b, source) === 'Uzmanın mevcut notu'));
  assert.ok(refreshed.blocks.some((b) => b.type === 'dataTable' && b.path === 'clinical'));
});
test('list layout preserves bold, italic and underline marks across line breaks', () => {
  assert.deepEqual(
    inlineLines([
      { text: 'bir\niki', bold: true },
      { text: ' üç', italic: true, underline: true },
    ]),
    [
      [{ text: 'bir', bold: true }],
      [
        { text: 'iki', bold: true },
        { text: ' üç', italic: true, underline: true },
      ],
    ],
  );
});
