/**
 * GAD-7 and PHQ-9 strict scoring.
 *
 * The instruments and translations may be reproduced without permission, but
 * the exact Turkish wording previously in this repository was not traceable to
 * an authoritative distributed form. Until wording parity is verified, this
 * module stores numbered scores only and the UI uses response transfer.
 */

import type { Gender } from './clinicalTypes';
import {
  responsesFromAnswerSlots,
  validateNumberedAssessmentResponses,
  type NumberedAssessmentResponse,
  type NumberedAssessmentValidation,
} from './assessmentResponses';
import { clinicToday, isValidClinicDate } from './recordRules';

export type RapidScreeningType = 'gad7' | 'phq9';

export const GAD7_INSTRUMENT_ID = 'gad-7';
export const GAD7_INSTRUMENT_VERSION = 'GAD-7-2006-TR-Konkan-2013';
export const GAD7_SCORING_VERSION = 'gad7-total-7x0-3-v2';
export const GAD7_ITEM_COUNT = 7;
export const GAD7_MAX_TOTAL = 21;
export const GAD7_TURKISH_SCREENING_THRESHOLD = 8;

export const PHQ9_INSTRUMENT_ID = 'phq-9';
export const PHQ9_INSTRUMENT_VERSION = 'PHQ-9-2001-TR-Sari-2016';
export const PHQ9_SCORING_VERSION = 'phq9-total-9x0-3-v2';
export const PHQ9_ITEM_COUNT = 9;
export const PHQ9_MAX_TOTAL = 27;
export const PHQ9_CRITICAL_ITEM_ID = 9;

/** IDs only. Exact Turkish form wording is intentionally not asserted here. */
export const GAD7_ITEMS = Array.from({ length: GAD7_ITEM_COUNT }, (_, index) => ({ id: index + 1 }));
export const PHQ9_ITEMS = Array.from({ length: PHQ9_ITEM_COUNT }, (_, index) => ({ id: index + 1 }));
/** Backward-compatible names without item text. */
export const GAD7_QUESTIONS = GAD7_ITEMS;
export const PHQ9_QUESTIONS = PHQ9_ITEMS;
export const RAPID_SCORE_OPTIONS = [0, 1, 2, 3] as const;

export type Gad7ScoreBand =
  | '0–4 · minimal belirti düzeyi'
  | '5–9 · hafif belirti düzeyi'
  | '10–14 · orta belirti düzeyi'
  | '15–21 · yüksek belirti düzeyi';

export type Phq9ScoreBand =
  | '0–4 · minimal belirti düzeyi'
  | '5–9 · hafif belirti düzeyi'
  | '10–14 · orta belirti düzeyi'
  | '15–19 · orta-yüksek belirti düzeyi'
  | '20–27 · yüksek belirti düzeyi';

export type RapidScreeningScoring =
  | { status: 'invalid' | 'incomplete'; type: RapidScreeningType; validation: NumberedAssessmentValidation }
  | {
      status: 'complete';
      type: 'gad7';
      validation: NumberedAssessmentValidation;
      responses: NumberedAssessmentResponse[];
      totalScore: number;
      maximumScore: typeof GAD7_MAX_TOTAL;
      scoreBand: Gad7ScoreBand;
      screeningThreshold: typeof GAD7_TURKISH_SCREENING_THRESHOLD;
      screeningThresholdReached: boolean;
      criticalItemFlags: [];
    }
  | {
      status: 'complete';
      type: 'phq9';
      validation: NumberedAssessmentValidation;
      responses: NumberedAssessmentResponse[];
      totalScore: number;
      maximumScore: typeof PHQ9_MAX_TOTAL;
      scoreBand: Phq9ScoreBand;
      criticalItemEndorsed: boolean;
      criticalItemScore: number;
      criticalItemFlags: string[];
    };

export interface RapidScreeningResult {
  id: string;
  type: RapidScreeningType;
  clientId?: string;
  clientName: string;
  clientGender?: Gender;
  clientAge?: number;
  testDate: string;
  instrumentId?: string;
  instrumentVersion?: string;
  scoringVersion?: string;
  completionStatus?: 'complete';
  responses?: NumberedAssessmentResponse[];
  answers: number[];
  totalScore: number;
  maximumScore?: number;
  scoreBand?: string;
  /** @deprecated Historical records only. */
  severity?: string;
  screeningThreshold?: number;
  screeningThresholdReached?: boolean;
  thresholdReference?: string;
  functionalDifficulty?: number;
  criticalItemEndorsed?: boolean;
  criticalItemScore?: number;
  criticalItemFlags?: string[];
  /** @deprecated Historical records only; new records use criticalItemEndorsed. */
  suicideRisk?: boolean;
  clinicalNote: string;
  notes?: string;
  revision?: number;
  revisionOf?: string;
  createdAt: string;
  updatedAt?: string;
}

function validation(type: RapidScreeningType, input: unknown): NumberedAssessmentValidation {
  return validateNumberedAssessmentResponses(input, {
    itemCount: type === 'gad7' ? GAD7_ITEM_COUNT : PHQ9_ITEM_COUNT,
    minScore: 0,
    maxScore: 3,
  });
}

export function gad7ScoreBand(score: number): Gad7ScoreBand {
  if (score >= 15) return '15–21 · yüksek belirti düzeyi';
  if (score >= 10) return '10–14 · orta belirti düzeyi';
  if (score >= 5) return '5–9 · hafif belirti düzeyi';
  return '0–4 · minimal belirti düzeyi';
}

export function phq9ScoreBand(score: number): Phq9ScoreBand {
  if (score >= 20) return '20–27 · yüksek belirti düzeyi';
  if (score >= 15) return '15–19 · orta-yüksek belirti düzeyi';
  if (score >= 10) return '10–14 · orta belirti düzeyi';
  if (score >= 5) return '5–9 · hafif belirti düzeyi';
  return '0–4 · minimal belirti düzeyi';
}

export function scoreGad7(input: unknown): RapidScreeningScoring {
  const checked = validation('gad7', input);
  if (!checked.valid) return { status: 'invalid', type: 'gad7', validation: checked };
  if (!checked.complete) return { status: 'incomplete', type: 'gad7', validation: checked };
  const totalScore = checked.responses.reduce((sum, response) => sum + response.score, 0);
  return {
    status: 'complete',
    type: 'gad7',
    validation: checked,
    responses: checked.responses,
    totalScore,
    maximumScore: GAD7_MAX_TOTAL,
    scoreBand: gad7ScoreBand(totalScore),
    screeningThreshold: GAD7_TURKISH_SCREENING_THRESHOLD,
    screeningThresholdReached: totalScore >= GAD7_TURKISH_SCREENING_THRESHOLD,
    criticalItemFlags: [],
  };
}

export function scorePhq9(input: unknown): RapidScreeningScoring {
  const checked = validation('phq9', input);
  if (!checked.valid) return { status: 'invalid', type: 'phq9', validation: checked };
  if (!checked.complete) return { status: 'incomplete', type: 'phq9', validation: checked };
  const totalScore = checked.responses.reduce((sum, response) => sum + response.score, 0);
  const criticalItemScore = checked.responses.find((response) => response.itemId === PHQ9_CRITICAL_ITEM_ID)?.score ?? 0;
  const criticalItemEndorsed = criticalItemScore > 0;
  return {
    status: 'complete',
    type: 'phq9',
    validation: checked,
    responses: checked.responses,
    totalScore,
    maximumScore: PHQ9_MAX_TOTAL,
    scoreBand: phq9ScoreBand(totalScore),
    criticalItemEndorsed,
    criticalItemScore,
    criticalItemFlags: criticalItemEndorsed ? ['item-9-endorsed'] : [],
  };
}

export const rapidResponsesFromSlots = responsesFromAnswerSlots;

export type RapidScreeningRecordInput = {
  id: string;
  clientId?: string;
  name: string;
  gender?: Gender;
  age?: number;
  testDate?: string;
  expertNote?: string;
  functionalDifficulty?: number;
  revision?: number;
  revisionOf?: string;
  createdAt?: string;
};

export function createRapidScreeningResult(
  scoring: RapidScreeningScoring,
  input: RapidScreeningRecordInput,
): RapidScreeningResult {
  if (scoring.status !== 'complete') {
    throw new Error('Tamamlanmamış veya geçersiz tarama yanıtlarından sonuç kaydı oluşturulamaz.');
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  const common = {
    id: input.id,
    type: scoring.type,
    clientId: input.clientId,
    clientName: input.name,
    clientGender: input.gender,
    clientAge: input.age,
    testDate: input.testDate ?? clinicToday(),
    completionStatus: 'complete' as const,
    responses: scoring.responses,
    answers: scoring.responses.map((response) => response.score),
    totalScore: scoring.totalScore,
    maximumScore: scoring.maximumScore,
    scoreBand: scoring.scoreBand,
    notes: input.expertNote?.trim() || undefined,
    revision: input.revision ?? 1,
    revisionOf: input.revisionOf,
    createdAt,
    updatedAt: createdAt,
  };

  if (scoring.type === 'gad7') {
    return {
      ...common,
      instrumentId: GAD7_INSTRUMENT_ID,
      instrumentVersion: GAD7_INSTRUMENT_VERSION,
      scoringVersion: GAD7_SCORING_VERSION,
      screeningThreshold: GAD7_TURKISH_SCREENING_THRESHOLD,
      screeningThresholdReached: scoring.screeningThresholdReached,
      thresholdReference: 'Konkan et al. (2013) Turkish clinical sample',
      criticalItemFlags: [],
      clinicalNote: `GAD-7 toplam puanı ${scoring.totalScore}/${GAD7_MAX_TOTAL}. ${scoring.scoreBand}. Türkçe klinik örneklem çalışmasındaki ${GAD7_TURKISH_SCREENING_THRESHOLD} puan tarama referansı tanı değildir; görüşme ile doğrulama gerekir.`,
    };
  }

  const criticalText = scoring.criticalItemEndorsed
    ? ` Madde 9 için ${scoring.criticalItemScore} puan aktarılmıştır; toplam puandan bağımsız klinik görüşme gerekir. Sistem risk sınıfı veya yüzdesi üretmez.`
    : ' Madde 9 işaretli değildir; bu durum bağımsız güvenlik değerlendirmesinin yerine geçmez.';
  return {
    ...common,
    instrumentId: PHQ9_INSTRUMENT_ID,
    instrumentVersion: PHQ9_INSTRUMENT_VERSION,
    scoringVersion: PHQ9_SCORING_VERSION,
    functionalDifficulty: input.functionalDifficulty,
    criticalItemEndorsed: scoring.criticalItemEndorsed,
    criticalItemScore: scoring.criticalItemScore,
    criticalItemFlags: scoring.criticalItemFlags,
    clinicalNote: `PHQ-9 toplam puanı ${scoring.totalScore}/${PHQ9_MAX_TOTAL}. ${scoring.scoreBand}. Türkçe çalışma bu uygulama için tanısal bir kesme değeri doğrulamamıştır; sonuç tek başına tanı veya tedavi kararı değildir.${criticalText}`,
  };
}

/** Backward-compatible strict entry points. */
export function calculateGad7(
  answers: number[],
  clientInfo: { name: string; clientId?: string; testDate?: string },
): RapidScreeningResult {
  return createRapidScreeningResult(scoreGad7(responsesFromAnswerSlots(answers)), {
    id: `gad7_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    clientId: clientInfo.clientId,
    name: clientInfo.name,
    testDate: clientInfo.testDate,
  });
}

export function calculatePhq9(
  answers: number[],
  clientInfo: { name: string; clientId?: string; testDate?: string },
): RapidScreeningResult {
  return createRapidScreeningResult(scorePhq9(responsesFromAnswerSlots(answers)), {
    id: `phq9_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    clientId: clientInfo.clientId,
    name: clientInfo.name,
    testDate: clientInfo.testDate,
  });
}

export function assertRapidScreeningResultIntegrity(result: RapidScreeningResult): void {
  const current = result.type === 'gad7'
    ? result.scoringVersion === GAD7_SCORING_VERSION
    : result.scoringVersion === PHQ9_SCORING_VERSION;
  if (!current) return;
  if (
    typeof result.id !== 'string' || !result.id.trim()
    || typeof result.clientName !== 'string' || !result.clientName.trim()
    || (result.clientAge !== undefined && (!Number.isInteger(result.clientAge) || result.clientAge < 0 || result.clientAge > 120))
    || !isValidClinicDate(result.testDate)
    || !Number.isInteger(result.revision) || (result.revision ?? 0) < 1
    || result.revisionOf === result.id
    || !Number.isFinite(Date.parse(result.createdAt))
    || typeof result.updatedAt !== 'string' || !Number.isFinite(Date.parse(result.updatedAt))
    || (result.functionalDifficulty !== undefined
      && (!Number.isInteger(result.functionalDifficulty) || result.functionalDifficulty < 0 || result.functionalDifficulty > 3))
  ) throw new Error('Tarama bütünlük kontrolü başarısız: kayıt metadatası geçersiz.');

  const scoring = result.type === 'gad7' ? scoreGad7(result.responses) : scorePhq9(result.responses);
  if (scoring.status !== 'complete') {
    throw new Error('Tarama bütünlük kontrolü başarısız: yanıt kümesi tamamlanmış ve geçerli değil.');
  }
  const expectedInstrumentId = result.type === 'gad7' ? GAD7_INSTRUMENT_ID : PHQ9_INSTRUMENT_ID;
  const expectedInstrumentVersion = result.type === 'gad7' ? GAD7_INSTRUMENT_VERSION : PHQ9_INSTRUMENT_VERSION;
  const answersMatch = Array.isArray(result.answers)
    && result.answers.length === scoring.responses.length
    && result.answers.every((answer, index) => answer === scoring.responses[index]?.score);
  const flagsMatch = Array.isArray(result.criticalItemFlags)
    && result.criticalItemFlags.length === scoring.criticalItemFlags.length
    && result.criticalItemFlags.every((flag, index) => flag === scoring.criticalItemFlags[index]);
  const gadFieldsMatch = result.type !== 'gad7'
    || (scoring.type === 'gad7'
      && result.screeningThreshold === GAD7_TURKISH_SCREENING_THRESHOLD
      && result.screeningThresholdReached === scoring.screeningThresholdReached);
  const phqFieldsMatch = result.type !== 'phq9'
    || (scoring.type === 'phq9'
      && result.criticalItemEndorsed === scoring.criticalItemEndorsed
      && result.criticalItemScore === scoring.criticalItemScore);
  if (
    result.instrumentId !== expectedInstrumentId
    || result.instrumentVersion !== expectedInstrumentVersion
    || result.completionStatus !== 'complete'
    || result.totalScore !== scoring.totalScore
    || result.maximumScore !== scoring.maximumScore
    || result.scoreBand !== scoring.scoreBand
    || result.severity !== undefined
    || result.suicideRisk !== undefined
    || !answersMatch
    || !flagsMatch
    || !gadFieldsMatch
    || !phqFieldsMatch
  ) throw new Error('Tarama bütünlük kontrolü başarısız: sonuç yanıtlarla tutarlı değil; kayıt oluşturulmadı.');
}

export function rapidScoreContext(result: RapidScreeningResult): string {
  return result.scoreBand ?? result.severity ?? `${result.totalScore}/${result.type === 'gad7' ? GAD7_MAX_TOTAL : PHQ9_MAX_TOTAL}`;
}

export function phq9CriticalItemEndorsed(result: RapidScreeningResult): boolean {
  return result.type === 'phq9' && (result.criticalItemEndorsed ?? result.suicideRisk ?? false);
}
