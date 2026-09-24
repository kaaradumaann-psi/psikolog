import type { ItemAnswer } from '../workspace/caseTypes';
import { RAW_SCORE_FIELDS, type ParsedRecordPayload, type RawScores } from '../workspace/caseTypes';
import { buildProfileFromAnswers, buildProfileFromRawScoresObject, type MMPIProfile } from '../scoring/mmpiScoring';
import type { FullRecordDetail } from '../records/supabaseRecords';

export type ScoringGender = 'Erkek' | 'Kadın';

type PageLike = {
  pageNumber: number;
  items: {
    itemId: string;
    itemNumber: number;
    choiceId: string | null;
    status?: string;
    measurements?: { responseId: string; choiceId: string; darkness: number; coverage: number }[];
  }[];
  manualReviews?: Record<string, { choiceId: string | null }>;
  reviews?: Record<string, { choiceId: string | null }>;
};

/**
 * OMR sayfalarından (ham okuma + manuel düzeltmeler) 566 maddelik cevap dizisi.
 * Hem kaydedilen `SavedAnswerPage` hem de canlı `StoredScanPage` bu biçime uyar.
 */
export function answersFromOmrPages(pages: readonly PageLike[], itemCount = 566): ItemAnswer[] {
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const out: ItemAnswer[] = new Array(itemCount).fill(undefined);
  const seenItems = new Set<number>();
  const seenItemIds = new Set<string>();
  const duplicateItems = new Set<number>();
  for (const page of sorted) {
    const reviews = { ...(page.reviews ?? {}), ...(page.manualReviews ?? {}) };
    for (const item of page.items) {
      if (item.itemNumber < 1 || item.itemNumber > itemCount) continue;
      if (seenItems.has(item.itemNumber)) {
        duplicateItems.add(item.itemNumber);
        continue;
      }
      seenItems.add(item.itemNumber);
      seenItemIds.add(item.itemId);
      const review = reviews[item.itemId];
      if (review) {
        if (review.choiceId === 'D' || review.choiceId === 'Y' || review.choiceId === null) {
          out[item.itemNumber - 1] = review.choiceId;
        }
        continue;
      }
      // Legacy payloads did not retain read status/measurements; preserve their explicit D/Y/null
      // values for backwards compatibility. Current payloads must have measured reliable or blank
      // evidence; unread/single/multiple/ambiguous values remain pending instead of being scored.
      if (item.status === undefined) {
        if (item.choiceId === 'D' || item.choiceId === 'Y' || item.choiceId === null) out[item.itemNumber - 1] = item.choiceId;
        continue;
      }
      const measured = Array.isArray(item.measurements) && item.measurements.length > 0 && item.measurements.every(measurement =>
        typeof measurement.responseId === 'string' && (measurement.choiceId === 'D' || measurement.choiceId === 'Y') &&
        Number.isFinite(measurement.darkness) && measurement.darkness >= 0 && measurement.darkness <= 1 &&
        Number.isFinite(measurement.coverage) && measurement.coverage >= 0 && measurement.coverage <= 1);
      if (measured && item.status === 'reliable' && (item.choiceId === 'D' || item.choiceId === 'Y')) {
        out[item.itemNumber - 1] = item.choiceId;
      } else if (measured && item.status === 'blank' && item.choiceId === null) {
        out[item.itemNumber - 1] = null;
      }
    }
  }
  // A validator may accept a missing raw item only when a manual review covers it. Current
  // form IDs are item-N; apply that explicit override even though no algorithm item exists.
  for (const page of sorted) {
    const reviews = { ...(page.reviews ?? {}), ...(page.manualReviews ?? {}) };
    for (const [itemId, review] of Object.entries(reviews)) {
      if (seenItemIds.has(itemId)) continue;
      const match = /^item-(\d+)$/.exec(itemId);
      if (!match) continue;
      const itemNumber = Number(match[1]);
      if (!Number.isInteger(itemNumber) || itemNumber < 1 || itemNumber > itemCount || seenItems.has(itemNumber)) {
        if (Number.isInteger(itemNumber) && itemNumber >= 1 && itemNumber <= itemCount) duplicateItems.add(itemNumber);
        continue;
      }
      seenItemIds.add(itemId);
      seenItems.add(itemNumber);
      if (review.choiceId === 'D' || review.choiceId === 'Y' || review.choiceId === null) out[itemNumber - 1] = review.choiceId;
    }
  }
  for (const itemNumber of duplicateItems) out[itemNumber - 1] = undefined;
  return out;
}

/** Kayıttaki her hangi veri kaynağından (hızlı giriş / OMR / ham puan) cevap dizisi. */
export function answersFromRecordPayload(parsed: ParsedRecordPayload): ItemAnswer[] | null {
  if (parsed.quickAnswers && parsed.quickAnswers.length === 566 && parsed.quickAnswers.every(answer =>
    answer === 'D' || answer === 'Y' || answer === null)) {
    return parsed.quickAnswers as ItemAnswer[];
  }
  if (parsed.omrPages.length > 0) {
    const answers = answersFromOmrPages(parsed.omrPages);
    // A stored OMR profile is only safe to calculate when every item has a resolved answer.
    // Pending readings must be reviewed in the scanner rather than silently counted as blanks.
    return answers.some(answer => answer === undefined) ? null : answers;
  }
  return null;
}

/**
 * Kayıtlı bir test kaydından MMPI profilini hesaplar.
 * Veri yetersizse (ör. cinsiyet skorlamaya uygun değil) null döner —
 * arayüz bunu kullanıcılara anlaşılır bir notla gösterir.
 */
export function profileFromRecord(
  record: Pick<FullRecordDetail, 'gender'>,
  parsed: ParsedRecordPayload,
): MMPIProfile | null {
  const recordGender: ScoringGender | undefined = record.gender === 'Erkek' || record.gender === 'Kadın' ? record.gender : undefined;
  const payloadGender: ScoringGender | undefined = parsed.client?.gender === 'Erkek' || parsed.client?.gender === 'Kadın'
    ? parsed.client.gender
    : undefined;
  // The relational record is authoritative. A forged or stale payload metadata gender must not
  // silently switch norms; a disagreement makes the profile unavailable until the record is fixed.
  if (recordGender && payloadGender && recordGender !== payloadGender) return null;
  const gender = recordGender ?? payloadGender;
  if (!gender) return null;

  const answers = answersFromRecordPayload(parsed);
  if (answers) return buildProfileFromAnswers(answers, gender);

  if (parsed.rawScales) {
    const scores = {} as RawScores;
    for (const field of RAW_SCORE_FIELDS) {
      const value = parsed.rawScales[field.key];
      if (typeof value !== 'number' || !Number.isFinite(value)) return null;
      scores[field.key] = value;
    }
    return buildProfileFromRawScoresObject(scores, gender);
  }

  return null;
}
