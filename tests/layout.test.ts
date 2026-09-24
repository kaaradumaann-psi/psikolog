import assert from 'node:assert/strict';
import test from 'node:test';
import { FORM, FORM_PAGES, PAGE_COUNT, COLUMN_WIDTH_MM, getBubbleGeometry } from '../src/form/layout';

test('566 unique item numbers, in column-first order, across four pages', () => {
  const numbers = FORM_PAGES.flatMap(page => page.columns.flatMap(column => column.map(item => item.itemNumber)));
  assert.deepEqual(numbers, Array.from({ length: 566 }, (_, i) => i + 1));
  assert.equal(new Set(numbers).size, 566);
  assert.equal(PAGE_COUNT, 4);
  assert.deepEqual(FORM_PAGES.map(page => [page.firstItem, page.lastItem]),
    [[1, 144], [145, 288], [289, 432], [433, 566]]);
});

test('all pages share the same three-column, 48-row grid', () => {
  for (const page of FORM_PAGES) {
    assert.equal(page.columns.length, 3);
    for (const column of page.columns) assert.ok(column.length <= 48);
  }
  assert.deepEqual(FORM_PAGES[3]?.columns.map(column => column.length), [48, 48, 38]);
});

test('all 1,132 bubble centers are unique and inside the printable safe area', () => {
  const centers = new Set<string>();
  for (let item = 1; item <= FORM.totalItems; item++) {
    for (const choice of FORM.choices) {
      const geometry = getBubbleGeometry(item, choice.code);
      const radius = geometry.diameterMm / 2;
      assert.ok(geometry.xMm - radius >= FORM.contentLeftMm);
      assert.ok(geometry.xMm + radius <= FORM.contentLeftMm + FORM.contentWidthMm);
      assert.ok(geometry.yMm - radius >= FORM.gridTopMm + FORM.gridHeaderMm);
      assert.ok(geometry.yMm + radius < 277);
      centers.add(`${geometry.page}:${geometry.xMm}:${geometry.yMm}`);
    }
  }
  assert.equal(centers.size, 1132);
  assert.ok(FORM.rowPitchMm - FORM.bubbleDiameterMm >= .75);
  assert.ok(FORM.choices[1].centerInColumnMm + FORM.bubbleDiameterMm / 2 < COLUMN_WIDTH_MM);
});

test('page and column transitions do not shift template coordinates', () => {
  assert.deepEqual(getBubbleGeometry(1, 'D'), { page: 1, xMm: 47, yMm: 69.125, diameterMm: 3.5 });
  assert.deepEqual(getBubbleGeometry(145, 'D'), { ...getBubbleGeometry(1, 'D'), page: 2 });
  assert.deepEqual(getBubbleGeometry(433, 'D'), { ...getBubbleGeometry(1, 'D'), page: 4 });
  assert.equal(getBubbleGeometry(49, 'Y').yMm, getBubbleGeometry(1, 'Y').yMm);
  assert.equal(getBubbleGeometry(48, 'D').yMm, 268.875);
  assert.equal(getBubbleGeometry(566, 'Y').page, 4);
});

test('QR identity block is identical on every page and sits above the answer grid', () => {
  assert.equal(FORM.gridTopMm, 60);
  for (const page of FORM_PAGES) {
    assert.deepEqual(page.qrArea, FORM.qrArea);
    assert.equal(page.alignmentMarks.length, 4);
    assert.ok(page.qrArea.y + page.qrArea.height < FORM.gridTopMm);
    assert.ok(page.qrArea.x + page.qrArea.width <= FORM.pageWidthMm - FORM.markerInsetMm);
  }
});

test('invalid item numbers are rejected rather than creating phantom fields', () => {
  for (const item of [0, -1, 567, 1.5, NaN, Infinity]) {
    assert.throws(() => getBubbleGeometry(item, 'D'), RangeError);
  }
});
