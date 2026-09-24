import type { FormDefinition, ItemDefinition } from '../omr/omrTypes';
import type { ItemReadResult, ManualReview, StoredScanPage } from './scanResultTypes';
import { hasSuccessfulMeasurements } from './resultValidator';
import { isValidReviewTimestamp } from '../validation/dateGuards';

export function resolveItem(item: ItemDefinition, page: StoredScanPage) {
  const original = page.items.find(result => result.itemId === item.itemId);
  const candidateReview: ManualReview | undefined = Object.hasOwn(page.reviews, item.itemId) ? page.reviews[item.itemId] : undefined;
  const review = candidateReview &&
    isValidReviewTimestamp(candidateReview.reviewedAt) &&
    (candidateReview.choiceId === null || item.responseAreas.some(area => area.choiceId === candidateReview.choiceId))
    ? candidateReview
    : undefined;
  const reliable = original?.status === 'reliable' && hasSuccessfulMeasurements(original, item) &&
    original.choiceId !== null && item.responseAreas.some(area => area.choiceId === original.choiceId);
  return {
    original,
    review,
    reliable,
    choiceId: review ? review.choiceId : reliable ? original.choiceId : null,
    provenance: review ? 'manual' as const : original ? 'algorithm' as const : 'missing' as const,
    unresolved: !review && !reliable,
  };
}

/** A page is clinically complete only when every item is a measured reliable answer, a measured
 * explicit blank, or an explicitly reviewed D/Y/blank override. Missing/ambiguous evidence is not
 * silently converted to a blank response. */
export function isEffectiveItem(item: ItemDefinition, page: StoredScanPage): boolean {
  const resolved = resolveItem(item, page);
  if (resolved.review || resolved.reliable) return true;
  return resolved.original?.status === 'blank' && hasSuccessfulMeasurements(resolved.original, item);
}

export function summarizeResults(definition: FormDefinition, pages: readonly StoredScanPage[]) {
  let readItems = 0, reliableAnswers = 0, ambiguous = 0, multiple = 0, blank = 0, manuallyReviewed = 0;
  for (const expectedPage of definition.pages) {
    const page = pages.find(p => p.pageNumber === expectedPage.pageNumber);
    if (!page) continue;
    for (const item of expectedPage.items) {
      const { original, review } = resolveItem(item, page);
      if (review) {
        // An explicit D/Y/blank override is resolved clinical input even when the raw OMR
        // reading was missing. Do not continue to display its old ambiguous/multiple status.
        manuallyReviewed++;
        readItems++;
        if (review.choiceId === null) blank++;
        continue;
      }
      if (!hasSuccessfulMeasurements(original, item)) continue;
      readItems++;
      if (original!.status === 'reliable') reliableAnswers++;
      if (original!.status === 'ambiguous' || original!.status === 'single') ambiguous++;
      if (original!.status === 'multiple') multiple++;
      if (original!.status === 'blank') blank++;
    }
  }
  const expectedItems = definition.pages.reduce((count, page) => count + page.items.length, 0);
  return {
    expectedPages: definition.pages.length, acceptedPages: pages.length, expectedItems,
    readItems, reliableAnswers, ambiguous, multiple, blank, manuallyReviewed,
    missingItems: expectedItems - readItems,
    clinicalTransferAllowed: false as const,
  };
}

export function readStatusLabel(result: ItemReadResult | undefined): string {
  if (!result) return 'Sonuç eksik';
  return ({ unread: 'Okunamadı', invalid: 'Geçersiz', blank: 'Boş', single: 'Tek işaret / inceleyin',
    reliable: 'Güvenilir işaret', multiple: 'Çoklu işaret', ambiguous: 'Belirsiz' })[result.status];
}
