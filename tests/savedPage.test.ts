import assert from 'node:assert/strict';
import test from 'node:test';
import { toSavedPage } from '../src/records/supabaseRecords';
import type { StoredScanPage } from '../src/results/scanResultTypes';

function storedPage(): StoredScanPage {
  return {
    ok: true,
    pageId: 'p1',
    pageNumber: 1,
    batchId: 'ABCDEF1234567890ABCDEF12',
    fingerprint: 'fp',
    items: [
      {
        itemId: 'i1',
        itemNumber: 1,
        status: 'reliable',
        choiceId: 'D',
        confidence: 0.9,
        measurements: [{ responseId: 'r1', choiceId: 'D', darkness: 1, coverage: 1 }],
        reason: 'ok',
      },
    ],
    quality: {
      ok: true,
      reasons: [],
      score: 0.9,
      metrics: { brightness: 1, shadowSpread: 1, laplacianVariance: 1, borderContrast: 1, pixelsPerMm: 1 },
    },
    normalized: { width: 4, height: 4, data: new Uint8Array(16) },
    sourceCorners: [{ x: 0, y: 0 }],
    warnings: ['uyari'],
    sourceName: 'sayfa1.jpg',
    previewUrl: 'blob:fake',
    reviews: { i1: { choiceId: 'Y', reviewedAt: '2026-09-19T10:00:00.000Z' } },
    reviewHistory: [
      {
        itemId: 'i1',
        action: 'review',
        reviewerId: 'session-abc',
        recordedAt: '2026-09-19T10:00:00.000Z',
        previous: null,
        next: { choiceId: 'Y', reviewedAt: '2026-09-19T10:00:00.000Z' },
      },
      {
        itemId: 'i1',
        action: 'undo',
        reviewerId: 'session-abc',
        recordedAt: '2026-09-19T10:05:00.000Z',
        previous: { choiceId: 'Y', reviewedAt: '2026-09-19T10:00:00.000Z' },
        next: null,
      },
    ],
  };
}

test('toSavedPage denetim izini (reviewHistory) kayda taşır ve derin kopyalar', () => {
  const page = storedPage();
  const saved = toSavedPage(page);

  // Denetim izi eksiksiz taşınır (B3): kim, ne zaman, önce/sonra.
  assert.equal(saved.reviewHistory?.length, 2);
  assert.deepEqual(saved.reviewHistory?.[0], page.reviewHistory[0]);
  assert.equal(saved.reviewHistory?.[1]?.action, 'undo');
  assert.equal(saved.reviewHistory?.[1]?.reviewerId, 'session-abc');

  // Derin kopya: kaynak nesneler kayıt yüküyle paylaşılmaz.
  assert.notStrictEqual(saved.reviewHistory?.[0], page.reviewHistory[0]);
  assert.notStrictEqual(saved.reviewHistory?.[0]?.next, page.reviewHistory[0]!.next);
  assert.notStrictEqual(saved.reviewHistory?.[1]?.previous, page.reviewHistory[1]!.previous);

  // Görüntü verisi kayda gitmez; manuel düzeltmeler korunur.
  assert.ok(!('normalized' in saved));
  assert.ok(!('previewUrl' in saved));
  assert.deepEqual(saved.manualReviews, page.reviews);
});

test('toSavedPage boş denetim iziyle de tutarlıdır (eski akış)', () => {
  const page = { ...storedPage(), reviewHistory: [] as StoredScanPage['reviewHistory'] };
  const saved = toSavedPage(page);
  assert.deepEqual(saved.reviewHistory, []);
});
