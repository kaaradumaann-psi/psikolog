import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScanResultPreview } from '../src/components/ScanResultPreview';
import type { FormDefinition } from '../src/omr/omrTypes';
import type { ManualReview, PageReadSuccess, ReadStatus } from '../src/results/scanResultTypes';
import { resolveItem, summarizeResults } from '../src/results/resultNormalizer';
import { canCreateRecord } from '../src/records/supabaseRecords';
import { scanToAnswers } from '../src/scoring/omrAnswers';
import { validatePageResult } from '../src/results/resultValidator';
import { acceptPage, createScanSet, missingPageNumbers, removePage, setManualReview, sortedPages } from '../src/scanner/pageSequence';

// Independent result fixtures: these tests do not invoke or change the OMR engine.
function fixture(count = 1, status: ReadStatus = 'reliable') {
  const pages = [1, 2].map(pageNumber => {
    const items = Array.from({ length: count }, (_, index) => {
      const itemNumber = (pageNumber - 1) * count + index + 1;
      return { itemId: `item-${itemNumber}`, itemNumber, pageNumber, columnIndex: 0, rowIndex: index,
        responseAreas: ['D', 'Y'].map((choiceId, choiceIndex) => ({
          responseId: `response-${itemNumber}-${choiceId}`, choiceId, label: choiceId,
          x: 60 + choiceIndex * 7, y: 30 + index * 5, width: 3, height: 3,
        })) };
    });
    return { pageNumber, pageId: `page-${pageNumber}`, firstItem: items[0]!.itemNumber,
      lastItem: items.at(-1)!.itemNumber, items, columns: [items], alignmentMarks: [],
      qrArea: { x: 10, y: 10, width: 10, height: 10 } };
  });
  const definition: FormDefinition = { formId: 'safety-fixture', title: 'Safety fixture', version: '1',
    source: 'unverified-template', fingerprint: 'safety-fingerprint', pageWidthMm: 210, pageHeightMm: 297,
    totalPages: 2, totalItems: count * 2, pages };
  const raw: PageReadSuccess = { ok: true, pageId: pages[0]!.pageId, pageNumber: 1,
    batchId: 'A'.repeat(24), fingerprint: definition.fingerprint,
    items: pages[0]!.items.map(item => ({ itemId: item.itemId, itemNumber: item.itemNumber, status,
      choiceId: status === 'blank' ? null : 'D', confidence: 0.9, reason: 'Original reading',
      measurements: ['unread', 'invalid'].includes(status) ? [] : item.responseAreas.map(area => ({
        responseId: area.responseId, choiceId: area.choiceId, darkness: 0.5, coverage: 0.5,
      })) })),
    quality: { ok: true, score: 0.9, reasons: [], metrics: { brightness: 220, shadowSpread: 2,
      laplacianVariance: 100, borderContrast: 0.8, pixelsPerMm: 2 } },
    normalized: { width: 420, height: 594, data: new Uint8Array(420 * 594).fill(255) },
    sourceCorners: [{ x: 0, y: 0 }, { x: 420, y: 0 }, { x: 420, y: 594 }, { x: 0, y: 594 }], warnings: [] };
  const accepted = acceptPage(createScanSet(), raw, definition, { sourceName: 'fixture.png', previewUrl: 'blob:fixture' });
  assert.ok(accepted.ok);
  return { definition, raw, state: accepted.state, page: accepted.state.pages[1]!, item: pages[0]!.items[0]! };
}

const review = (choiceId: string | null): ManualReview => ({ choiceId, reviewedAt: '2026-09-14T10:00:00.000Z' });

test('advisory quality (ok false, not fatal) remains a valid page result', () => {
  const { raw, definition } = fixture();
  const candidate = {
    ...raw,
    quality: { ...raw.quality, ok: false, reasons: ['Aydınlatma yetersiz; daha aydınlık bir görüntü gerekli.'] },
    warnings: ['Aydınlatma yetersiz; daha aydınlık bir görüntü gerekli.'],
  };
  assert.ok(validatePageResult(candidate, definition).ok);
});

test('fatal quality is rejected at the result boundary', () => {
  const { raw, definition } = fixture();
  const candidate = { ...raw, quality: { ...raw.quality, ok: false, fatal: true, reasons: ['Sayfa okunamadı.'] } };
  assert.equal(validatePageResult(candidate, definition).ok, false);
});

test('all primitive read statuses retain their valid boundary contracts', () => {
  for (const status of ['unread', 'blank', 'single', 'multiple', 'ambiguous', 'reliable', 'invalid'] as const) {
    const { raw, definition } = fixture(1, status);
    assert.ok(validatePageResult(raw, definition).ok, status);
  }
});

test('coercible statuses are rejected without calling their conversion hooks', () => {
  const { raw, definition } = fixture();
  for (const status of [['reliable'], ['blank'], new String('reliable'), null, undefined, 1, Symbol('reliable'),
    { toString() { throw new Error('Status must not be coerced'); } }]) {
    const candidate = { ...raw, items: [{ ...raw.items[0]!, status, choiceId: null }] };
    assert.equal(validatePageResult(candidate, definition).ok, false);
  }
});

test('primitive statuses still reject inconsistent choices and incomplete measurements', () => {
  const { raw, definition } = fixture();
  for (const [status, choiceId] of [['reliable', null], ['single', null], ['blank', 'D']] as const) {
    assert.equal(validatePageResult({ ...raw, items: [{ ...raw.items[0]!, status, choiceId }] }, definition).ok, false);
  }
  assert.equal(validatePageResult({ ...raw, items: [{ ...raw.items[0]!, measurements: [] }] }, definition).ok, false);
});

test('unresolved algorithm candidates remain raw evidence, never effective answers', () => {
  for (const status of ['invalid', 'unread', 'single', 'multiple', 'ambiguous', 'blank'] as const) {
    const { item, page } = fixture(1, status);
    const original = page.items[0]!;
    const before = structuredClone(original);
    const resolved = resolveItem(item, page);
    assert.equal(resolved.choiceId, null, status);
    assert.equal(resolved.unresolved, true, status);
    assert.equal(resolved.provenance, 'algorithm');
    assert.strictEqual(resolved.original, original);
    assert.deepEqual(original, before);
  }
});

test('only a measured reliable in-definition choice is an effective algorithm answer', () => {
  const { item, page } = fixture();
  assert.equal(resolveItem(item, page).choiceId, 'D');
  assert.equal(resolveItem(item, page).unresolved, false);
  for (const patch of [{ measurements: [] }, { choiceId: null }, { choiceId: 'foreign' }]) {
    const broken = { ...page, items: [{ ...page.items[0]!, ...patch }] };
    assert.equal(resolveItem(item, broken).choiceId, null);
    assert.equal(resolveItem(item, broken).unresolved, true);
  }
});

test('a missing reading is not fabricated; explicit manual blank and undo remain distinct', () => {
  const { raw, definition, item } = fixture();
  const accepted = acceptPage(createScanSet(), { ...raw, items: [] }, definition, { sourceName: 'missing', previewUrl: '' });
  assert.ok(accepted.ok);
  const initial = accepted.state;
  assert.equal(resolveItem(item, initial.pages[1]!).provenance, 'missing');
  const reviewed = setManualReview(initial, definition, 1, item.itemId, review(null));
  const manual = resolveItem(item, reviewed.pages[1]!);
  assert.equal(manual.choiceId, null);
  assert.equal(manual.unresolved, false);
  assert.equal(manual.provenance, 'manual');
  assert.equal(manual.original, undefined);
  const undone = setManualReview(reviewed, definition, 1, item.itemId, undefined);
  assert.equal(resolveItem(item, undone.pages[1]!).unresolved, true);
  assert.equal(resolveItem(item, undone.pages[1]!).provenance, 'missing');
  assert.deepEqual(undone.pages[1]!.items, []);
  assert.equal(undone.pages[1]!.reviewHistory[0]!.next!.choiceId, null);
  assert.equal(undone.pages[1]!.reviewHistory[1]!.next, null);
});

test('review, replacement, blank approval and undo append snapshots without changing raw readings', () => {
  const { state: initial, definition, item, raw } = fixture(1, 'invalid');
  const rawSnapshot = structuredClone(raw);
  const input = review('D');
  const first = setManualReview(initial, definition, 1, item.itemId, input);
  input.choiceId = 'Y';
  const second = setManualReview(first, definition, 1, item.itemId, review('Y'));
  const blank = setManualReview(second, definition, 1, item.itemId, review(null));
  const undone = setManualReview(blank, definition, 1, item.itemId, undefined);
  const history = undone.pages[1]!.reviewHistory;
  assert.deepEqual(history.map(event => event.action), ['review', 'review', 'review', 'undo']);
  assert.deepEqual(history.map(event => event.previous?.choiceId), [undefined, 'D', 'Y', null]);
  assert.deepEqual(history.map(event => event.next?.choiceId), ['D', 'Y', null, undefined]);
  assert.equal(history[0]!.previous, null);
  assert.equal(history[3]!.next, null);
  assert.ok(history.every(event => event.itemId === item.itemId && event.reviewerId === initial.reviewerId &&
    Number.isFinite(Date.parse(event.recordedAt))));
  assert.deepEqual([initial, first, second, blank, undone].map(state => state.pages[1]!.reviewHistory.length), [0, 1, 2, 3, 4]);
  assert.strictEqual(first.pages[1]!.reviewHistory[0], history[0]);
  assert.equal(first.pages[1]!.reviews[item.itemId]!.choiceId, 'D');
  assert.notStrictEqual(first.pages[1]!.reviews[item.itemId], history[0]!.next);
  assert.deepEqual(undone.pages[1]!.reviews, {});
  assert.strictEqual(undone.pages[1]!.items, raw.items);
  assert.strictEqual(undone.pages[1]!.normalized, raw.normalized);
  assert.deepEqual(raw, rawSnapshot);
  assert.equal(resolveItem(item, second.pages[1]!).choiceId, 'Y');
  assert.equal(resolveItem(item, undone.pages[1]!).choiceId, null);
  assert.ok([initial, first, second, blank, undone].every(state => state.clinicalTransferAllowed === false));
});

test('review histories are item-specific and an undo without an override is a no-op', () => {
  const { state, definition, item } = fixture(2);
  assert.strictEqual(setManualReview(state, definition, 1, item.itemId, undefined), state);
  const first = setManualReview(state, definition, 1, item.itemId, review('Y'));
  const otherId = definition.pages[0]!.items[1]!.itemId;
  const second = setManualReview(first, definition, 1, otherId, review(null));
  const undone = setManualReview(second, definition, 1, item.itemId, undefined);
  assert.equal(undone.pages[1]!.reviews[otherId]!.choiceId, null);
  assert.deepEqual(undone.pages[1]!.reviewHistory.map(event => event.itemId), [item.itemId, otherId, item.itemId]);
});

test('invalid manual choices, timestamps and targets cannot append history', () => {
  const { state, definition, item } = fixture();
  for (const candidate of [review('foreign'), { ...review('D'), reviewedAt: 'not-a-date' },
    { ...review('D'), reviewedAt: '2026-02-30T10:00:00.000Z' },
    { ...review('D'), reviewedAt: '2099-01-01T10:00:00.000Z' }, { ...review('D'), reviewedAt: 0 },
    { ...review('D'), reviewedAt: new String(review('D').reviewedAt) }]) {
    assert.throws(() => setManualReview(state, definition, 1, item.itemId, candidate as ManualReview));
  }
  assert.throws(() => setManualReview(state, definition, 1, 'foreign-item', review('D')));
  assert.throws(() => setManualReview(state, definition, 2, item.itemId, review('D')));
  assert.deepEqual(state.pages[1]!.reviews, {});
  assert.deepEqual(state.pages[1]!.reviewHistory, []);
});

test('record gate and answer conversion distinguish measured blank, unresolved, and review override', () => {
  const reliable = fixture(1, 'reliable');
  const secondReliable = {
    ...reliable.raw,
    pageId: 'page-2',
    pageNumber: 2,
    items: reliable.raw.items.map(item => ({ ...item, itemId: 'item-2', itemNumber: 2,
      measurements: item.measurements.map(measurement => ({ ...measurement, responseId: measurement.responseId.replace('1-', '2-') })) })),

  };
  const complete = acceptPage(reliable.state, secondReliable, reliable.definition, { sourceName: 'page-2', previewUrl: '' });
  assert.ok(complete.ok, complete.ok ? '' : complete.message);
  assert.equal(canCreateRecord(sortedPages(complete.state), reliable.definition), true);
  assert.deepEqual(scanToAnswers(reliable.definition, complete.state), ['D', 'D']);

  const unresolved = fixture(1, 'ambiguous');
  const secondUnresolved = {
    ...unresolved.raw,
    pageId: 'page-2',
    pageNumber: 2,
    items: unresolved.raw.items.map(item => ({ ...item, itemId: 'item-2', itemNumber: 2,
      measurements: item.measurements.map(measurement => ({ ...measurement, responseId: measurement.responseId.replace('1-', '2-') })) })),

  };
  const unresolvedComplete = acceptPage(unresolved.state, secondUnresolved, unresolved.definition, { sourceName: 'page-2', previewUrl: '' });
  assert.ok(unresolvedComplete.ok);
  assert.equal(canCreateRecord(sortedPages(unresolvedComplete.state), unresolved.definition), false);
  assert.deepEqual(scanToAnswers(unresolved.definition, unresolvedComplete.state), [undefined, undefined]);

  const reviewed = setManualReview(unresolvedComplete.state, unresolved.definition, 1, 'item-1', review(null));
  const reviewedAgain = setManualReview(reviewed, unresolved.definition, 2, 'item-2', review(null));
  assert.equal(canCreateRecord(sortedPages(reviewedAgain), unresolved.definition), true);
  assert.deepEqual(scanToAnswers(unresolved.definition, reviewedAgain), [null, null]);

  const blank = fixture(1, 'blank');
  const secondBlank = {
    ...blank.raw,
    pageId: 'page-2',
    pageNumber: 2,
    items: blank.raw.items.map(item => ({ ...item, itemId: 'item-2', itemNumber: 2,
      measurements: item.measurements.map(measurement => ({ ...measurement, responseId: measurement.responseId.replace('1-', '2-') })) })),

  };
  const blankComplete = acceptPage(blank.state, secondBlank, blank.definition, { sourceName: 'page-2', previewUrl: '' });
  assert.ok(blankComplete.ok);
  assert.equal(canCreateRecord(sortedPages(blankComplete.state), blank.definition), true);
  assert.deepEqual(scanToAnswers(blank.definition, blankComplete.state), [null, null]);
});

test('summaries preserve original measurements and never grant clinical transfer after review or undo', () => {
  const { state, definition, item } = fixture();
  const before = summarizeResults(definition, sortedPages(state));
  const reviewed = setManualReview(state, definition, 1, item.itemId, review(null));
  const after = summarizeResults(definition, sortedPages(reviewed));
  assert.deepEqual(after, { ...before, reliableAnswers: 0, blank: 1, manuallyReviewed: 1 });
  assert.equal(after.clinicalTransferAllowed, false);
  const undone = setManualReview(reviewed, definition, 1, item.itemId, undefined);
  assert.deepEqual(summarizeResults(definition, sortedPages(undone)), before);
});

test('page acceptance retains the session reviewer, batch lock, duplicate and foreign-page protections', () => {
  const { state, definition, raw } = fixture();
  const source = { sourceName: 'fixture', previewUrl: '' };
  assert.match(state.reviewerId, /^session-[a-f0-9]{32}$/);
  const second = { ...raw, pageId: 'page-2', pageNumber: 2, items: [] };
  const accepted = acceptPage(state, second, definition, source);
  assert.ok(accepted.ok);
  assert.equal(accepted.state.reviewerId, state.reviewerId);
  assert.deepEqual(sortedPages(accepted.state).map(page => page.pageNumber), [1, 2]);
  assert.deepEqual(missingPageNumbers(accepted.state, definition), []);
  assert.equal(acceptPage(accepted.state, raw, definition, source).ok, false);
  for (const patch of [{ batchId: 'B'.repeat(24) }, { fingerprint: 'foreign' }, { pageId: 'foreign' }]) {
    assert.equal(acceptPage(state, { ...second, ...patch }, definition, source).ok, false);
  }
  const removed = removePage(state, 1);
  assert.equal(removed.batchId, raw.batchId);
  assert.equal(removed.reviewerId, state.reviewerId);
  assert.equal(removed.clinicalTransferAllowed, false);
  assert.equal(acceptPage(removed, { ...raw, batchId: 'B'.repeat(24) }, definition, source).ok, false);
  const reset = createScanSet();
  assert.notEqual(reset.reviewerId, state.reviewerId);
  assert.equal(reset.batchId, null);
  assert.equal(reset.clinicalTransferAllowed, false);
});

test('server rendering cannot enable manual answers before the current crop paints', () => {
  const { definition, page } = fixture(40, 'invalid');
  let calls = 0;
  for (const current of [page, { ...page, normalized: { ...page.normalized, data: page.normalized.data.slice() } }]) {
    const html = renderToStaticMarkup(createElement(ScanResultPreview, { definition, page: current,
      onReview: () => { calls++; }, onRemove: () => {} }));
    assert.match(html, /<fieldset class="scan-review-controls" disabled=""/);
    assert.match(html, /Madde 1 /);
    assert.match(html, /Sonraki maddeler/);
    assert.match(html, /D · Original reading/);
  }
  assert.equal(calls, 0);
});

test('rendered undo provenance exposes retained events and the session reviewer without enabling review', () => {
  const { state, definition, item } = fixture(1, 'invalid');
  const first = setManualReview(state, definition, 1, item.itemId, review('Y'));
  const undone = setManualReview(first, definition, 1, item.itemId, undefined);
  const html = renderToStaticMarkup(createElement(ScanResultPreview, { definition, page: undone.pages[1]!,
    onReview: () => {}, onRemove: () => {} }));
  assert.match(html, /Manuel inceleme geçmişi \(2\)/);
  assert.match(html, /İncelendi: Y/);
  assert.match(html, /Geri alındı/);
  assert.ok(html.includes(state.reviewerId));
  assert.match(html, /<fieldset class="scan-review-controls" disabled=""/);
  assert.match(html, /D · Original reading/);
});
