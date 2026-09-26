/**
 * Beck Anxiety Inventory (BAI) — strict total-score implementation.
 *
 * The BAI is commercial test material. No symptom or response wording is kept
 * in this repository. A qualified user transfers 21 numeric responses from an
 * authorised form. The standard score is a single 0–63 total; historical
 * developer-defined subscales have been removed.
 */

import type { BeckAnxietyResult, Gender } from './clinicalTypes';
import {
  responsesFromAnswerSlots,
  validateNumberedAssessmentResponses,
  type NumberedAssessmentResponse,
  type NumberedAssessmentValidation,
} from './assessmentResponses';
import { clinicToday, isValidClinicDate } from './recordRules';

export const BAI_INSTRUMENT_ID = 'beck-anxiety-inventory';
export const BAI_INSTRUMENT_VERSION = 'BAI-1988-TR-Ulusoy-1998';
export const BAI_SCORING_VERSION = 'bai-total-21x0-3-v2';
export const BAI_ITEM_COUNT = 21;
export const BAI_ITEM_MIN = 0;
export const BAI_ITEM_MAX = 3;
export const BAI_MAX_TOTAL = 63;

/** IDs only: protected symptom wording is intentionally absent. */
export const BAI_ITEMS = Array.from({ length: BAI_ITEM_COUNT }, (_, index) => ({ id: index + 1 }));

/** Numeric transfer labels only: licensed response anchors are not republished. */
export const BAI_SCORE_OPTIONS = [0, 1, 2, 3] as const;

export type BeckAnxietyScoreBand =
  | '0–7 · minimal düzey (el kitabı)'
  | '8–15 · hafif düzey (el kitabı)'
  | '16–25 · orta düzey (el kitabı)'
  | '26–63 · yüksek düzey (el kitabı)';

export type BeckAnxietyScoring =
  | { status: 'invalid' | 'incomplete'; validation: NumberedAssessmentValidation }
  | {
      status: 'complete';
      validation: NumberedAssessmentValidation;
      responses: NumberedAssessmentResponse[];
      totalScore: number;
      maxScore: typeof BAI_MAX_TOTAL;
      scoreBand: BeckAnxietyScoreBand;
    };

export function validateBeckAnxietyResponses(input: unknown): NumberedAssessmentValidation {
  return validateNumberedAssessmentResponses(input, {
    itemCount: BAI_ITEM_COUNT,
    minScore: BAI_ITEM_MIN,
    maxScore: BAI_ITEM_MAX,
  });
}

export function beckAnxietyScoreBand(totalScore: number): BeckAnxietyScoreBand {
  if (totalScore >= 26) return '26–63 · yüksek düzey (el kitabı)';
  if (totalScore >= 16) return '16–25 · orta düzey (el kitabı)';
  if (totalScore >= 8) return '8–15 · hafif düzey (el kitabı)';
  return '0–7 · minimal düzey (el kitabı)';
}

export function scoreBeckAnxiety(input: unknown): BeckAnxietyScoring {
  const validation = validateBeckAnxietyResponses(input);
  if (!validation.valid) return { status: 'invalid', validation };
  if (!validation.complete) return { status: 'incomplete', validation };
  const totalScore = validation.responses.reduce((sum, response) => sum + response.score, 0);
  return {
    status: 'complete',
    validation,
    responses: validation.responses,
    totalScore,
    maxScore: BAI_MAX_TOTAL,
    scoreBand: beckAnxietyScoreBand(totalScore),
  };
}

export const beckAnxietyResponsesFromSlots = responsesFromAnswerSlots;

export type BeckAnxietyRecordInput = {
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

export function createBeckAnxietyResult(
  scoring: BeckAnxietyScoring,
  input: BeckAnxietyRecordInput,
): BeckAnxietyResult {
  if (scoring.status !== 'complete') {
    throw new Error('Tamamlanmamış veya geçersiz BAI yanıtlarından sonuç kaydı oluşturulamaz.');
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id: input.id,
    clientId: input.clientId,
    clientName: input.name,
    clientGender: input.gender,
    clientAge: input.age,
    testDate: input.testDate ?? clinicToday(),
    instrumentId: BAI_INSTRUMENT_ID,
    instrumentVersion: BAI_INSTRUMENT_VERSION,
    scoringVersion: BAI_SCORING_VERSION,
    completionStatus: 'complete',
    responses: scoring.responses,
    answers: scoring.responses.map((response) => response.score),
    totalScore: scoring.totalScore,
    maximumScore: BAI_MAX_TOTAL,
    scoreBand: scoring.scoreBand,
    clinicalInterpretation: `BAI toplam puanı ${scoring.totalScore}/${BAI_MAX_TOTAL}. ${scoring.scoreBand}. Bu el kitabı aralığı Türkçe bir tanı eşiği değildir; sonuç tek başına anksiyete bozukluğu tanısı veya tedavi kararı üretmez.`,
    notes: input.expertNote?.trim() || undefined,
    revision: input.revision ?? 1,
    revisionOf: input.revisionOf,
    createdAt,
    updatedAt: createdAt,
  };
}

/** Backward-compatible entry point; unlike the retired implementation it throws on partial/invalid input. */
export function calculateBeckAnxiety(
  answers: number[],
  clientInfo: { name: string; gender: Gender; age?: number; clientId?: string; testDate?: string },
): BeckAnxietyResult {
  const scoring = scoreBeckAnxiety(responsesFromAnswerSlots(answers));
  return createBeckAnxietyResult(scoring, {
    id: `bai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    clientId: clientInfo.clientId,
    name: clientInfo.name,
    gender: clientInfo.gender,
    age: clientInfo.age,
    testDate: clientInfo.testDate,
  });
}

export function assertBeckAnxietyResultIntegrity(result: BeckAnxietyResult): void {
  if (result.scoringVersion !== BAI_SCORING_VERSION) return;
  if (
    typeof result.id !== 'string' || !result.id.trim()
    || typeof result.clientName !== 'string' || !result.clientName.trim()
    || (result.clientGender !== 'KADIN' && result.clientGender !== 'ERKEK')
    || (result.clientAge !== undefined && (!Number.isInteger(result.clientAge) || result.clientAge < 0 || result.clientAge > 120))
    || !isValidClinicDate(result.testDate)
    || !Number.isInteger(result.revision) || (result.revision ?? 0) < 1
    || result.revisionOf === result.id
    || !Number.isFinite(Date.parse(result.createdAt))
    || typeof result.updatedAt !== 'string' || !Number.isFinite(Date.parse(result.updatedAt))
  ) throw new Error('BAI bütünlük kontrolü başarısız: kayıt metadatası geçersiz.');

  const scoring = scoreBeckAnxiety(result.responses);
  if (scoring.status !== 'complete') {
    throw new Error('BAI bütünlük kontrolü başarısız: yanıt kümesi tamamlanmış ve geçerli değil.');
  }
  const answersMatch = Array.isArray(result.answers)
    && result.answers.length === BAI_ITEM_COUNT
    && result.answers.every((answer, index) => answer === scoring.responses[index]?.score);
  if (
    result.instrumentId !== BAI_INSTRUMENT_ID
    || result.instrumentVersion !== BAI_INSTRUMENT_VERSION
    || result.completionStatus !== 'complete'
    || result.totalScore !== scoring.totalScore
    || result.maximumScore !== BAI_MAX_TOTAL
    || result.scoreBand !== scoring.scoreBand
    || result.severity !== undefined
    || result.subjectiveScore !== undefined
    || result.neurovegetativeScore !== undefined
    || result.autonomicScore !== undefined
    || result.motorScore !== undefined
    || !answersMatch
  ) throw new Error('BAI bütünlük kontrolü başarısız: sonuç yanıtlarla tutarlı değil; kayıt oluşturulmadı.');
}

export function beckAnxietyScoreContext(result: BeckAnxietyResult): string {
  return result.scoreBand ?? (result.severity ? `${result.severity} (eski kayıt)` : `${result.totalScore}/63`);
}
