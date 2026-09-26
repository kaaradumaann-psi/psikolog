/**
 * Beck Depresyon Envanteri (BDI; BDI-II değildir) — katı puanlama çekirdeği.
 *
 * Kimlik dayanağı: Beck, Ward, Mendelson, Mock & Erbaugh (1961) ve
 * Hisli'nin 1988/1989 Türkçe uyarlama çalışmaları. Depodaki önceki metinler
 * yetkili Türkçe formdan doğrulanamadığı için telifli madde/yanıt metinleri bu
 * modülde tutulmaz. Uygulama yalnız resmî form yanında puan aktarımı yapar.
 */

import type { BeckDepressionResult, BeckDepressionScoreBand, Gender } from './clinicalTypes';
import { clinicToday, isValidClinicDate } from './recordRules';

export const BDI_INSTRUMENT_ID = 'bdi-original-tr-hisli';
export const BDI_INSTRUMENT_VERSION = 'BDI-original-1961-TR-Hisli-1988/1989';
export const BDI_SCORING_VERSION = 'bdi-original-total-v1';
export const BDI_ITEM_COUNT = 21;
export const BDI_ITEM_MIN = 0;
export const BDI_ITEM_MAX = 3;
export const BDI_MAX_TOTAL = BDI_ITEM_COUNT * BDI_ITEM_MAX;
/** Hisli Türkçe BDI literatüründe tarama amacıyla kullanılan eşik; tanı değildir. */
export const BDI_TURKISH_SCREENING_THRESHOLD = 17;
export const BDI_CRITICAL_ITEM_ID = 9;

export type BeckDepressionResponse = {
  itemId: number;
  score: number;
};

export type BeckDepressionValidationError = {
  code: 'not-an-array' | 'invalid-entry' | 'invalid-item-id' | 'duplicate-item-id' | 'invalid-score' | 'missing-item';
  itemId?: number;
  index?: number;
};

export type BeckDepressionValidation = {
  valid: boolean;
  complete: boolean;
  answeredCount: number;
  missingItemIds: number[];
  errors: BeckDepressionValidationError[];
  responses: BeckDepressionResponse[];
};

export type BeckDepressionScoring =
  | {
      status: 'invalid' | 'incomplete';
      validation: BeckDepressionValidation;
    }
  | {
      status: 'complete';
      validation: BeckDepressionValidation;
      responses: BeckDepressionResponse[];
      totalScore: number;
      maxScore: typeof BDI_MAX_TOTAL;
      screeningThreshold: typeof BDI_TURKISH_SCREENING_THRESHOLD;
      screeningThresholdReached: boolean;
      scoreBand: BeckDepressionScoreBand;
      criticalItemEndorsed: boolean;
      criticalItemScore: number;
    };

/**
 * IDs and values are validated before summing. Missing/invalid entries are
 * never clamped, padded or silently converted to zero.
 */
export function validateBeckDepressionResponses(input: unknown): BeckDepressionValidation {
  if (!Array.isArray(input)) {
    return {
      valid: false,
      complete: false,
      answeredCount: 0,
      missingItemIds: Array.from({ length: BDI_ITEM_COUNT }, (_, index) => index + 1),
      errors: [{ code: 'not-an-array' }],
      responses: [],
    };
  }

  const errors: BeckDepressionValidationError[] = [];
  const byId = new Map<number, BeckDepressionResponse>();

  input.forEach((entry: unknown, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push({ code: 'invalid-entry', index });
      return;
    }
    const candidate = entry as { itemId?: unknown; score?: unknown };
    const itemId = candidate.itemId;
    if (!Number.isInteger(itemId) || (itemId as number) < 1 || (itemId as number) > BDI_ITEM_COUNT) {
      errors.push({ code: 'invalid-item-id', index });
      return;
    }
    const numericItemId = itemId as number;
    if (byId.has(numericItemId)) {
      errors.push({ code: 'duplicate-item-id', itemId: numericItemId, index });
      return;
    }
    if (!Number.isInteger(candidate.score) || (candidate.score as number) < BDI_ITEM_MIN || (candidate.score as number) > BDI_ITEM_MAX) {
      errors.push({ code: 'invalid-score', itemId: numericItemId, index });
      return;
    }
    byId.set(numericItemId, { itemId: numericItemId, score: candidate.score as number });
  });

  const missingItemIds = Array.from({ length: BDI_ITEM_COUNT }, (_, index) => index + 1)
    .filter((itemId) => !byId.has(itemId));
  for (const itemId of missingItemIds) errors.push({ code: 'missing-item', itemId });

  const structuralErrors = errors.filter((error) => error.code !== 'missing-item');
  const responses = [...byId.values()].sort((a, b) => a.itemId - b.itemId);
  return {
    valid: structuralErrors.length === 0,
    complete: structuralErrors.length === 0 && missingItemIds.length === 0 && responses.length === BDI_ITEM_COUNT,
    answeredCount: responses.length,
    missingItemIds,
    errors,
    responses,
  };
}

export function scoreBeckDepression(input: unknown): BeckDepressionScoring {
  const validation = validateBeckDepressionResponses(input);
  if (!validation.valid) return { status: 'invalid', validation };
  if (!validation.complete) return { status: 'incomplete', validation };

  const totalScore = validation.responses.reduce((sum, response) => sum + response.score, 0);
  const criticalItemScore = validation.responses.find((response) => response.itemId === BDI_CRITICAL_ITEM_ID)?.score ?? 0;
  const screeningThresholdReached = totalScore >= BDI_TURKISH_SCREENING_THRESHOLD;

  return {
    status: 'complete',
    validation,
    responses: validation.responses,
    totalScore,
    maxScore: BDI_MAX_TOTAL,
    screeningThreshold: BDI_TURKISH_SCREENING_THRESHOLD,
    screeningThresholdReached,
    scoreBand: screeningThresholdReached ? 'Tarama eşiğinde veya üzerinde' : 'Tarama eşiğinin altında',
    criticalItemEndorsed: criticalItemScore > 0,
    criticalItemScore,
  };
}

export function responsesFromAnswerSlots(answers: readonly (number | null | undefined)[]): BeckDepressionResponse[] {
  return answers.flatMap((score, index) => Number.isInteger(score)
    ? [{ itemId: index + 1, score: score as number }]
    : []);
}

export type BeckDepressionRecordInput = {
  id: string;
  clientId?: string;
  name: string;
  gender: Gender;
  age?: number;
  testDate?: string;
  expertNote?: string;
  revision?: number;
  revisionOf?: string;
  createdAt?: string;
};

/** Builds persistence/report metadata from one already validated score result. */
export function createBeckDepressionResult(
  scoring: BeckDepressionScoring,
  input: BeckDepressionRecordInput,
): BeckDepressionResult {
  if (scoring.status !== 'complete') {
    throw new Error('Tamamlanmamış veya geçersiz BDI yanıtlarından sonuç kaydı oluşturulamaz.');
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  const thresholdText = scoring.screeningThresholdReached
    ? `Türkçe uyarlama literatüründe tarama amacıyla kullanılan ${BDI_TURKISH_SCREENING_THRESHOLD} puan eşiğinde veya üzerindedir.`
    : `Türkçe uyarlama literatüründe tarama amacıyla kullanılan ${BDI_TURKISH_SCREENING_THRESHOLD} puan eşiğinin altındadır.`;
  const criticalText = scoring.criticalItemEndorsed
    ? ' Madde 9 yanıtı işaretlenmiştir. Bu yanıt toplam puandan bağımsız klinik değerlendirme gerektirebilir; sistem risk düzeyi veya tanı üretmez.'
    : ' Madde 9 için ayrıca bir işaretleme yoktur; bu durum bağımsız güvenlik değerlendirmesinin yerine geçmez.';

  return {
    id: input.id,
    clientId: input.clientId,
    clientName: input.name,
    clientGender: input.gender,
    clientAge: input.age,
    testDate: input.testDate || clinicToday(),
    instrumentId: BDI_INSTRUMENT_ID,
    instrumentVersion: BDI_INSTRUMENT_VERSION,
    scoringVersion: BDI_SCORING_VERSION,
    completionStatus: 'complete',
    responses: scoring.responses,
    // Kept for backward-compatible history/backup readers; never used as the scoring source.
    answers: scoring.responses.map((response) => response.score),
    totalScore: scoring.totalScore,
    maximumScore: BDI_MAX_TOTAL,
    screeningThreshold: BDI_TURKISH_SCREENING_THRESHOLD,
    screeningThresholdReached: scoring.screeningThresholdReached,
    scoreBand: scoring.scoreBand,
    criticalItemEndorsed: scoring.criticalItemEndorsed,
    criticalItemScore: scoring.criticalItemScore,
    criticalItemFlags: scoring.criticalItemEndorsed ? ['item-9-endorsed'] : [],
    clinicalInterpretation: `BDI toplam puanı ${scoring.totalScore}/${BDI_MAX_TOTAL}. ${thresholdText}${criticalText} Sonuç tek başına depresyon tanısı değildir.`,
    notes: input.expertNote?.trim() || undefined,
    revision: input.revision ?? 1,
    revisionOf: input.revisionOf,
    createdAt,
    updatedAt: createdAt,
  };
}

/** Recomputes every derived field before a current-version result is stored. */
export function assertBeckDepressionResultIntegrity(result: BeckDepressionResult): void {
  if (result.scoringVersion !== BDI_SCORING_VERSION) return; // historical payload compatibility
  if (
    typeof result.id !== 'string'
    || !result.id.trim()
    || typeof result.clientName !== 'string'
    || !result.clientName.trim()
    || (result.clientAge !== undefined && (!Number.isInteger(result.clientAge) || result.clientAge < 0 || result.clientAge > 120))
    || typeof result.testDate !== 'string'
    || !isValidClinicDate(result.testDate)
    || !Number.isInteger(result.revision)
    || (result.revision ?? 0) < 1
    || result.revisionOf === result.id
    || typeof result.createdAt !== 'string'
    || !Number.isFinite(Date.parse(result.createdAt))
    || typeof result.updatedAt !== 'string'
    || !Number.isFinite(Date.parse(result.updatedAt))
  ) {
    throw new Error('BDI bütünlük kontrolü başarısız: kayıt metadatası geçersiz.');
  }
  const scoring = scoreBeckDepression(result.responses);
  if (scoring.status !== 'complete') throw new Error('BDI bütünlük kontrolü başarısız: yanıt kümesi tamamlanmış ve geçerli değil.');

  const expectedAnswers = scoring.responses.map((response) => response.score);
  const expectedFlags = scoring.criticalItemEndorsed ? ['item-9-endorsed'] : [];
  const answersMatch = Array.isArray(result.answers)
    && result.answers.length === expectedAnswers.length
    && result.answers.every((answer, index) => answer === expectedAnswers[index]);
  const flagsMatch = Array.isArray(result.criticalItemFlags)
    && result.criticalItemFlags.length === expectedFlags.length
    && result.criticalItemFlags.every((flag, index) => flag === expectedFlags[index]);

  if (
    result.instrumentId !== BDI_INSTRUMENT_ID
    || result.instrumentVersion !== BDI_INSTRUMENT_VERSION
    || result.completionStatus !== 'complete'
    || result.totalScore !== scoring.totalScore
    || result.maximumScore !== scoring.maxScore
    || result.screeningThreshold !== scoring.screeningThreshold
    || result.screeningThresholdReached !== scoring.screeningThresholdReached
    || result.scoreBand !== scoring.scoreBand
    || result.severity !== undefined
    || result.criticalItemEndorsed !== scoring.criticalItemEndorsed
    || result.criticalItemScore !== scoring.criticalItemScore
    || !answersMatch
    || !flagsMatch
  ) {
    throw new Error('BDI bütünlük kontrolü başarısız: sonuç yanıtlarla tutarlı değil; kayıt oluşturulmadı.');
  }
}

export function beckDepressionScoreContext(result: BeckDepressionResult): BeckDepressionScoreBand | string {
  return result.scoreBand
    ?? result.severity
    ?? (result.totalScore >= BDI_TURKISH_SCREENING_THRESHOLD
      ? 'Tarama eşiğinde veya üzerinde'
      : 'Tarama eşiğinin altında');
}

export function isBeckCriticalItemEndorsed(result: BeckDepressionResult): boolean {
  return result.criticalItemEndorsed ?? result.suicideRisk ?? false;
}

export function beckCriticalItemScore(result: BeckDepressionResult): number {
  return result.criticalItemScore ?? result.suicideItemScore ?? 0;
}
