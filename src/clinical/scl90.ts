/**
 * SCL-90-R® — strict numeric transfer and raw-index scoring.
 *
 * SCL-90-R is commercial test material. Protected item/anchor wording is not
 * stored here. A qualified user transfers 90 numeric responses from an
 * authorised form. No T-score or population norm is produced because the
 * repository has no licensed normative tables.
 */

import type { Gender, Scl90DimensionScores, Scl90Result } from './clinicalTypes';
import {
  responsesFromAnswerSlots,
  validateNumberedAssessmentResponses,
  type NumberedAssessmentResponse,
  type NumberedAssessmentValidation,
} from './assessmentResponses';
import { clinicToday, isValidClinicDate } from './recordRules';

export const SCL90_INSTRUMENT_ID = 'scl-90-r';
export const SCL90_INSTRUMENT_VERSION = 'SCL-90-R-1994-TR-Dag-1991';
export const SCL90_SCORING_VERSION = 'scl90r-raw-indices-v2';
export const SCL90_ITEM_COUNT = 90;
export const SCL90_ITEM_MIN = 0;
export const SCL90_ITEM_MAX = 4;
export const SCL90_MAX_TOTAL = 360;

/** IDs only: protected item wording is intentionally absent. */
export const SCL90_ITEMS = Array.from({ length: SCL90_ITEM_COUNT }, (_, index) => ({ id: index + 1 }));
export const SCL90_SCORE_OPTIONS = [0, 1, 2, 3, 4] as const;

export type Scl90DimensionKey = keyof Scl90DimensionScores;

/** Item allocation from the SCL-90-R scoring model. These produce raw means, not norms. */
export const SCL90_DIMENSIONS: Record<Scl90DimensionKey, readonly number[]> = {
  somatization: [1, 4, 12, 27, 40, 42, 48, 49, 52, 53, 56, 58],
  obsessiveCompulsive: [3, 9, 10, 28, 38, 45, 46, 51, 55, 65],
  interpersonalSensitivity: [6, 21, 34, 36, 37, 41, 61, 69, 73],
  depression: [5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79],
  anxiety: [2, 17, 23, 33, 39, 57, 72, 78, 80, 86],
  hostility: [11, 24, 63, 67, 74, 81],
  phobicAnxiety: [13, 25, 47, 50, 70, 75, 82],
  paranoidIdeation: [8, 18, 43, 68, 76, 83],
  psychoticism: [7, 16, 35, 62, 77, 84, 85, 87, 88, 90],
};

export const SCL90_DIMENSION_NAMES: Record<Scl90DimensionKey, { tr: string; abbr: string }> = {
  somatization: { tr: 'Somatizasyon', abbr: 'SOM' },
  obsessiveCompulsive: { tr: 'Obsesif-Kompulsif', abbr: 'O-C' },
  interpersonalSensitivity: { tr: 'Kişilerarası Duyarlılık', abbr: 'I-S' },
  depression: { tr: 'Depresyon', abbr: 'DEP' },
  anxiety: { tr: 'Anksiyete', abbr: 'ANX' },
  hostility: { tr: 'Öfke-Düşmanlık', abbr: 'HOS' },
  phobicAnxiety: { tr: 'Fobik Anksiyete', abbr: 'PHOB' },
  paranoidIdeation: { tr: 'Paranoid Düşünce', abbr: 'PAR' },
  psychoticism: { tr: 'Psikotizm', abbr: 'PSY' },
};

export const SCL90_CRITICAL_ITEM_IDS = [15, 63] as const;

export type Scl90Scoring =
  | { status: 'invalid' | 'incomplete'; validation: NumberedAssessmentValidation }
  | {
      status: 'complete';
      validation: NumberedAssessmentValidation;
      responses: NumberedAssessmentResponse[];
      totalScore: number;
      dimensionScores: Scl90DimensionScores;
      gsi: number;
      pst: number;
      psdi: number;
      criticalItemFlags: string[];
    };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function validateScl90Responses(input: unknown): NumberedAssessmentValidation {
  return validateNumberedAssessmentResponses(input, {
    itemCount: SCL90_ITEM_COUNT,
    minScore: SCL90_ITEM_MIN,
    maxScore: SCL90_ITEM_MAX,
  });
}

export function scoreScl90(input: unknown): Scl90Scoring {
  const validation = validateScl90Responses(input);
  if (!validation.valid) return { status: 'invalid', validation };
  if (!validation.complete) return { status: 'incomplete', validation };

  const scoreById = new Map(validation.responses.map((response) => [response.itemId, response.score]));
  const totalScore = validation.responses.reduce((sum, response) => sum + response.score, 0);
  const dimensionScores = {} as Scl90DimensionScores;
  for (const key of Object.keys(SCL90_DIMENSIONS) as Scl90DimensionKey[]) {
    const ids = SCL90_DIMENSIONS[key];
    dimensionScores[key] = round2(ids.reduce((sum, itemId) => sum + (scoreById.get(itemId) ?? 0), 0) / ids.length);
  }
  const pst = validation.responses.filter((response) => response.score > 0).length;
  const criticalItemFlags = SCL90_CRITICAL_ITEM_IDS
    .filter((itemId) => (scoreById.get(itemId) ?? 0) > 0)
    .map((itemId) => `item-${itemId}-endorsed`);

  return {
    status: 'complete',
    validation,
    responses: validation.responses,
    totalScore,
    dimensionScores,
    gsi: round2(totalScore / SCL90_ITEM_COUNT),
    pst,
    psdi: pst > 0 ? round2(totalScore / pst) : 0,
    criticalItemFlags,
  };
}

export const scl90ResponsesFromSlots = responsesFromAnswerSlots;

export type Scl90RecordInput = {
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

export function createScl90Result(scoring: Scl90Scoring, input: Scl90RecordInput): Scl90Result {
  if (scoring.status !== 'complete') {
    throw new Error('Tamamlanmamış veya geçersiz SCL-90-R yanıtlarından sonuç kaydı oluşturulamaz.');
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  const criticalText = scoring.criticalItemFlags.length
    ? ` Nötr kritik yanıt bayrakları: ${scoring.criticalItemFlags.join(', ')}. Bu bayraklar risk düzeyi veya tanı değildir ve klinik görüşmenin yerine geçmez.`
    : ' Kritik yanıt bayrağı oluşmaması bağımsız güvenlik değerlendirmesinin yerine geçmez.';
  return {
    id: input.id,
    clientId: input.clientId,
    clientName: input.name,
    clientGender: input.gender,
    clientAge: input.age,
    testDate: input.testDate ?? clinicToday(),
    instrumentId: SCL90_INSTRUMENT_ID,
    instrumentVersion: SCL90_INSTRUMENT_VERSION,
    scoringVersion: SCL90_SCORING_VERSION,
    completionStatus: 'complete',
    responses: scoring.responses,
    answers: scoring.responses.map((response) => response.score),
    totalScore: scoring.totalScore,
    dimensionScores: scoring.dimensionScores,
    gsi: scoring.gsi,
    pst: scoring.pst,
    psdi: scoring.psdi,
    normReference: 'none',
    criticalItemFlags: scoring.criticalItemFlags,
    clinicalInterpretation: `SCL-90-R ham indeksleri: GSI ${scoring.gsi}, PST ${scoring.pst}, PSDI ${scoring.psdi}. Bu kayıt T-puanı, Türkçe norm karşılaştırması, klinik eşik veya tanı üretmez.${criticalText}`,
    notes: input.expertNote?.trim() || undefined,
    revision: input.revision ?? 1,
    revisionOf: input.revisionOf,
    createdAt,
    updatedAt: createdAt,
  };
}

/** Backward-compatible entry point; unlike the retired implementation it throws on partial/invalid input. */
export function calculateScl90(
  answers: number[],
  clientInfo: { name: string; gender: Gender; age?: number; clientId?: string; testDate?: string },
): Scl90Result {
  const scoring = scoreScl90(responsesFromAnswerSlots(answers));
  return createScl90Result(scoring, {
    id: `scl90_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    clientId: clientInfo.clientId,
    name: clientInfo.name,
    gender: clientInfo.gender,
    age: clientInfo.age,
    testDate: clientInfo.testDate,
  });
}

export function assertScl90ResultIntegrity(result: Scl90Result): void {
  if (result.scoringVersion !== SCL90_SCORING_VERSION) return;
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
  ) throw new Error('SCL-90-R bütünlük kontrolü başarısız: kayıt metadatası geçersiz.');

  const scoring = scoreScl90(result.responses);
  if (scoring.status !== 'complete') {
    throw new Error('SCL-90-R bütünlük kontrolü başarısız: yanıt kümesi tamamlanmış ve geçerli değil.');
  }
  const answersMatch = Array.isArray(result.answers)
    && result.answers.length === SCL90_ITEM_COUNT
    && result.answers.every((answer, index) => answer === scoring.responses[index]?.score);
  const dimensionsMatch = (Object.keys(SCL90_DIMENSIONS) as Scl90DimensionKey[])
    .every((key) => result.dimensionScores?.[key] === scoring.dimensionScores[key]);
  const flagsMatch = Array.isArray(result.criticalItemFlags)
    && result.criticalItemFlags.length === scoring.criticalItemFlags.length
    && result.criticalItemFlags.every((flag, index) => flag === scoring.criticalItemFlags[index]);
  if (
    result.instrumentId !== SCL90_INSTRUMENT_ID
    || result.instrumentVersion !== SCL90_INSTRUMENT_VERSION
    || result.completionStatus !== 'complete'
    || result.totalScore !== scoring.totalScore
    || result.gsi !== scoring.gsi
    || result.pst !== scoring.pst
    || result.psdi !== scoring.psdi
    || result.normReference !== 'none'
    || !answersMatch
    || !dimensionsMatch
    || !flagsMatch
  ) throw new Error('SCL-90-R bütünlük kontrolü başarısız: sonuç yanıtlarla tutarlı değil; kayıt oluşturulmadı.');
}

export function scl90CriticalItemFlags(result: Scl90Result): string[] {
  if (Array.isArray(result.criticalItemFlags)) return result.criticalItemFlags;
  const flags: string[] = [];
  if ((result.answers?.[14] ?? 0) > 0) flags.push('item-15-endorsed');
  if ((result.answers?.[62] ?? 0) > 0) flags.push('item-63-endorsed');
  return flags;
}
