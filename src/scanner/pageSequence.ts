import type { FormDefinition, ItemDefinition } from '../omr/omrTypes';
import type { ManualReview, ManualReviewEvent, StoredScanPage } from '../results/scanResultTypes';
import { validatePageResult } from '../results/resultValidator';
import { isValidReviewTimestamp } from '../validation/dateGuards';
import { resolveItem } from '../results/resultNormalizer';

export type ScanSet = {
  batchId: string | null;
  reviewerId: string;
  pages: Record<number, StoredScanPage>;
  clinicalTransferAllowed: false;
};
export type PageAcceptance = { ok: true; state: ScanSet } | { ok: false; message: string };

export function createScanSet(): ScanSet {
  const reviewerId = `session-${Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')}`;
  return { batchId: null, reviewerId, pages: {}, clinicalTransferAllowed: false };
}

export function sortedPages(state: ScanSet): StoredScanPage[] {
  return Object.values(state.pages).sort((a, b) => a.pageNumber - b.pageNumber);
}

export function missingPageNumbers(state: ScanSet, definition: FormDefinition): number[] {
  return definition.pages.filter(page => !state.pages[page.pageNumber]).map(page => page.pageNumber).sort((a, b) => a - b);
}

export function acceptPage(state: ScanSet, result: unknown, definition: FormDefinition,
  source: { sourceName: string; previewUrl: string; originalImageUrl?: string }): PageAcceptance {
  const valid = validatePageResult(result, definition);
  if (!valid.ok) return valid;
  const page = valid.result;
  if (state.batchId !== null && state.batchId !== page.batchId) {
    return { ok: false, message: 'Bu sayfa başka bir form setine ait. Mevcut set değişmedi. ' +
      'Aynı 4 sayfayı birlikte yükleyin; yeni bir set taranacaksa “Yeni Set / Sıfırla” düğmesini kullanın.' };
  }
  if (state.pages[page.pageNumber]) {
    return { ok: false, message: `${page.pageNumber}. sayfa zaten eklendi; üzerine yazılmadı. Yeniden taramak için önce bu sayfayı silin.` };
  }
  return { ok: true, state: { ...state, batchId: state.batchId ?? page.batchId, clinicalTransferAllowed: false,
    pages: { ...state.pages, [page.pageNumber]: { ...page, ...source, reviews: {}, reviewHistory: [] } } } };
}

/** Removing even the last page does not unlock the batch; only an explicit reset does. */
export function removePage(state: ScanSet, pageNumber: number): ScanSet {
  const pages = { ...state.pages };
  delete pages[pageNumber];
  return { ...state, pages, clinicalTransferAllowed: false };
}

export function setManualReview(state: ScanSet, definition: FormDefinition, pageNumber: number,
  itemId: string, review: ManualReview | undefined): ScanSet {
  const page = state.pages[pageNumber];
  const item = definition.pages.find(p => p.pageNumber === pageNumber)?.items.find(i => i.itemId === itemId);
  if (!page || !item) throw new Error('İncelenecek madde veya sayfa bulunamadı.');
  if (review && (review.choiceId !== null && !item.responseAreas.some(a => a.choiceId === review.choiceId) ||
    !isValidReviewTimestamp(review.reviewedAt))) throw new Error('İnceleme seçeneği veya zamanı geçersiz.');
  const previous = Object.hasOwn(page.reviews, itemId) ? page.reviews[itemId] : undefined;
  if (review === undefined && !previous) return state;
  const reviews = { ...page.reviews };
  if (review === undefined) delete reviews[itemId];
  else reviews[itemId] = { ...review };
  // Snapshot both sides; undo removes only the active override, never its history.
  const event: ManualReviewEvent = { itemId, action: review === undefined ? 'undo' : 'review',
    reviewerId: state.reviewerId, recordedAt: new Date().toISOString(),
    previous: previous ? { ...previous } : null, next: review ? { ...review } : null };
  return { ...state, clinicalTransferAllowed: false, pages: { ...state.pages,
    [pageNumber]: { ...page, reviews, reviewHistory: [...page.reviewHistory, event] } } };
}

export type UnresolvedItem = {
  pageNumber: number;
  item: ItemDefinition;
  /** OMR motorunun ürettiği orijinal durum (single/multiple/ambiguous/unread/invalid). */
  status: string | undefined;
  /** OMR motorunun gördüğü işaret (single için D/Y; diğerlerinde null). */
  choiceId: string | null;
};

/**
 * Kayıt kapısına takılan (inceleme bekleyen) maddelerin listesi: ölçülmüş güvenilir
 * cevap, ölçülmüş gerçek boş veya açık manuel inceleme taşımayan her madde.
 */
export function listUnresolvedItems(state: ScanSet, definition: FormDefinition): UnresolvedItem[] {
  const out: UnresolvedItem[] = [];
  for (const expected of definition.pages) {
    const page = state.pages[expected.pageNumber];
    if (!page) continue;
    for (const item of expected.items) {
      const resolved = resolveItem(item, page);
      if (!resolved.unresolved) continue;
      out.push({
        pageNumber: page.pageNumber,
        item,
        status: resolved.original?.status,
        choiceId: resolved.original?.choiceId ?? null,
      });
    }
  }
  return out.sort((a, b) => a.pageNumber - b.pageNumber || a.item.itemNumber - b.item.itemNumber);
}

export type AutoResolveReport = {
  state: ScanSet;
  /** Toplam çözülen madde. */
  resolved: number;
  /** Algılanan tek işaret kabul edilerek çözülenler. */
  asDetectedAnswer: number;
  /** Boş (?) olarak çözülenler (çoklu/belirsiz/okunamadı/geçersiz). */
  asBlank: number;
};

/**
 * Kullanıcı tek tek uğraşamayacağı inceleme kuyruğunu tek adımda çözer:
 *
 *  - `single` (tek işaret görüldü, güvenilirlik eşiğinin altında): OMR'ın gördüğü
 *    işaret kabul edilir — formda zaten o baloncuk işaretli demektir.
 *  - `multiple` / `ambiguous` / `unread` / `invalid`: Boş (?) olarak onaylanır.
 *    İki işaretten klinik cevap çıkarılamaz; boş, dürüst ve denetlenebilir seçenektir.
 *
 * Her çözüm bir manuel inceleme olayı olarak denetim izine (reviewHistory) yazılır;
 * kim/otomatik kim, önceki ve sonraki değer, zaman damgasıyla kalıcıdır. Otomatik
 * çözümler `auto:` ön ekli oturum kimliğiyle işaretlenir. Boş sayısı 30'u aşarsa
 * mevcut MMPI_MAX_BLANK kapısı kayıt anında yine uyarır/engeller.
 */
export function autoResolveUnresolvedItems(state: ScanSet, definition: FormDefinition): AutoResolveReport {
  const unresolved = listUnresolvedItems(state, definition);
  if (unresolved.length === 0) return { state, resolved: 0, asDetectedAnswer: 0, asBlank: 0 };
  const autoReviewerId = `auto:${state.reviewerId}`.slice(0, 160);
  let next: ScanSet = state;
  let asDetectedAnswer = 0;
  let asBlank = 0;
  const reviewedAt = new Date().toISOString();
  for (const entry of unresolved) {
    const original = next.pages[entry.pageNumber]?.items.find(item => item.itemId === entry.item.itemId);
    const validChoice = original?.choiceId !== null && original?.choiceId !== undefined &&
      entry.item.responseAreas.some(area => area.choiceId === original.choiceId);
    // Yalnız `single` maddelerde görülen işaret güvenilir bir varsayılandır;
    // multiple/ambiguous'da choiceId bir işaretin kendisi değildir (null olmalıdır).
    const useDetected = original?.status === 'single' && validChoice;
    const choiceId = useDetected ? original.choiceId : null;
    const page = next.pages[entry.pageNumber]!;
    const previous = Object.hasOwn(page.reviews, entry.item.itemId) ? page.reviews[entry.item.itemId] : undefined;
    const review: ManualReview = { choiceId, reviewedAt };
    const event: ManualReviewEvent = {
      itemId: entry.item.itemId, action: 'review', reviewerId: autoReviewerId, recordedAt: reviewedAt,
      previous: previous ? { ...previous } : null, next: { ...review },
    };
    next = {
      ...next, clinicalTransferAllowed: false,
      pages: { ...next.pages, [entry.pageNumber]: {
        ...page,
        reviews: { ...page.reviews, [entry.item.itemId]: review },
        reviewHistory: [...page.reviewHistory, event],
      } },
    };
    if (useDetected) asDetectedAnswer++;
    else asBlank++;
  }
  return { state: next, resolved: unresolved.length, asDetectedAnswer, asBlank };
}
