import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormPage } from '../src/components/FormPage';
import { FORM_PAGES, formDefinition } from '../src/form/layout';
import { FORM_COPYRIGHT_LINE } from '../src/form/attribution';
import { createBatchId } from '../src/form/pageIdentity';

// The identity block is handwriting-only metadata. It must exist on the cover and nowhere else,
// otherwise continuation pages invite duplicate or conflicting entries during a scan session.
const IDENTITY_LABELS = ['FORM KİMLİĞİ', 'KATILIMCI KODU', 'TARİH'];

function renderPage(index: number) {
  return renderToStaticMarkup(createElement(FormPage, {
    page: FORM_PAGES[index]!, definition: formDefinition, batchId: createBatchId(), active: index === 0,
  }));
}

test('identity, participant code and date fields are rendered on the first page only', () => {
  const pages = FORM_PAGES.map((_, index) => renderPage(index));
  assert.equal(pages.length, 4);
  pages.forEach((html, index) => {
    const identityBlocks = ['identity-form', 'identity-participant', 'identity-date']
      .filter(id => html.includes(`data-line="${id}"`)).length ? 1 : 0;
    const labels = IDENTITY_LABELS.filter(label => html.includes(label));
    if (index === 0) {
      assert.equal(identityBlocks, 1, 'The cover must carry exactly one identity block.');
      assert.deepEqual(labels, IDENTITY_LABELS, 'The cover must carry all three identity labels.');
      assert.ok(html.includes('data-identity="cover"'));
      assert.equal(html.split('data-line="date-slash-').length - 1, 2,
        'The date field must expose day/month/year separators.');
      assert.ok(!html.includes('data-line="marking-example"'), 'The marking example was removed (was shifted) — no page should carry it.');
      assert.ok(html.includes('data-line="rule-order"') && html.includes('data-line="rule-session"') &&
        html.includes('data-line="rule-qr"'),
        'Cover instructions must keep the column-order reminder, the single-session note and the QR note.');
    } else {
      assert.equal(identityBlocks, 0, `Page ${index + 1} must not repeat the identity fields.`);
      assert.deepEqual(labels, [], `Page ${index + 1} must not repeat any identity label.`);
      assert.ok(html.includes('data-identity="continuation"'));
      assert.ok(!html.includes('marking-example'));
      assert.ok(!html.includes('data-line="rule-order"') && !html.includes('data-line="rule-session"') &&
        !html.includes('data-line="rule-qr"'),
        'Continuation pages must not repeat the cover-only column-order reminder.');
    }
  });
});

test('every page keeps its own machine identity and item range while the cover keeps the handwriting', () => {
  const pages = FORM_PAGES.map((_, index) => renderPage(index));
  pages.forEach((html, index) => {
    const page = FORM_PAGES[index]!;
    assert.ok(html.includes(`>${String(page.pageNumber).padStart(2, '0')}</span>`),
      `Page ${page.pageNumber} must print its own page number.`);
    assert.ok(html.includes(` / ${String(formDefinition.totalPages).padStart(2, '0')}</span>`),
      `Page ${page.pageNumber} must print the total page count beside it.`);
    assert.ok(html.includes(`${page.firstItem}–${page.lastItem}. maddeler`));
    assert.ok(html.includes('page-qr'), `Page ${page.pageNumber} must keep its machine-readable QR identity.`);
    assert.ok(html.includes(FORM_COPYRIGHT_LINE),
      `Page ${page.pageNumber} must carry the copyright line under the template id.`);
    assert.equal(html.split('width="5" height="5"').length - 1, 4,
      'All four 5 mm registration squares must survive on every page.');
    assert.equal(html.split('answer-row').length - 1,  page.items.length, 'Every item row must be present.');
  });
  // The cover carries the marking key; every continuation page carries the short reminder instead.
  assert.ok(pages[0]!.includes('data-line="marking-key"') && !pages[0]!.includes('data-line="continuation-rule"'));
  for (const html of pages.slice(1)) {
    assert.ok(html.includes('data-line="continuation-rule"') && !html.includes('data-line="marking-key"'));
  }
  assert.equal(FORM_PAGES.every(page => page.qrArea.x === 164 && page.qrArea.y === 18), true);
});
