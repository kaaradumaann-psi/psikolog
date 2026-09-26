/** Shared structural validation for numbered assessment responses.
 *
 * This module validates only IDs, completeness and value ranges. Every
 * instrument keeps its own scoring algorithm in its own clinical module.
 */

export type NumberedAssessmentResponse = {
  itemId: number;
  score: number;
};

export type NumberedAssessmentValidationError = {
  code: 'not-an-array' | 'invalid-entry' | 'invalid-item-id' | 'duplicate-item-id' | 'invalid-score' | 'missing-item';
  itemId?: number;
  index?: number;
};

export type NumberedAssessmentValidation = {
  valid: boolean;
  complete: boolean;
  answeredCount: number;
  missingItemIds: number[];
  errors: NumberedAssessmentValidationError[];
  responses: NumberedAssessmentResponse[];
};

export type NumberedAssessmentSpec = {
  itemCount: number;
  minScore: number;
  maxScore: number;
};

/** Missing, duplicate, out-of-range and non-integer values are never repaired. */
export function validateNumberedAssessmentResponses(
  input: unknown,
  spec: NumberedAssessmentSpec,
): NumberedAssessmentValidation {
  const allItemIds = Array.from({ length: spec.itemCount }, (_, index) => index + 1);
  if (!Array.isArray(input)) {
    return {
      valid: false,
      complete: false,
      answeredCount: 0,
      missingItemIds: allItemIds,
      errors: [{ code: 'not-an-array' }],
      responses: [],
    };
  }

  const errors: NumberedAssessmentValidationError[] = [];
  const byId = new Map<number, NumberedAssessmentResponse>();
  input.forEach((entry: unknown, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push({ code: 'invalid-entry', index });
      return;
    }
    const candidate = entry as { itemId?: unknown; score?: unknown };
    if (!Number.isInteger(candidate.itemId)
      || (candidate.itemId as number) < 1
      || (candidate.itemId as number) > spec.itemCount) {
      errors.push({ code: 'invalid-item-id', index });
      return;
    }
    const itemId = candidate.itemId as number;
    if (byId.has(itemId)) {
      errors.push({ code: 'duplicate-item-id', itemId, index });
      return;
    }
    if (!Number.isInteger(candidate.score)
      || (candidate.score as number) < spec.minScore
      || (candidate.score as number) > spec.maxScore) {
      errors.push({ code: 'invalid-score', itemId, index });
      return;
    }
    byId.set(itemId, { itemId, score: candidate.score as number });
  });

  const missingItemIds = allItemIds.filter((itemId) => !byId.has(itemId));
  for (const itemId of missingItemIds) errors.push({ code: 'missing-item', itemId });
  const structuralErrors = errors.filter((error) => error.code !== 'missing-item');
  const responses = [...byId.values()].sort((a, b) => a.itemId - b.itemId);

  return {
    valid: structuralErrors.length === 0,
    complete: structuralErrors.length === 0 && missingItemIds.length === 0 && responses.length === spec.itemCount,
    answeredCount: responses.length,
    missingItemIds,
    errors,
    responses,
  };
}

export function responsesFromAnswerSlots(
  answers: readonly (number | null | undefined)[],
): NumberedAssessmentResponse[] {
  return answers.flatMap((score, index) => Number.isInteger(score)
    ? [{ itemId: index + 1, score: score as number }]
    : []);
}

export function answersFromResponses(
  responses: readonly NumberedAssessmentResponse[],
  itemCount: number,
): Array<number | null> {
  const answers: Array<number | null> = Array.from({ length: itemCount }, () => null);
  for (const response of responses) {
    if (Number.isInteger(response.itemId) && response.itemId >= 1 && response.itemId <= itemCount) {
      answers[response.itemId - 1] = response.score;
    }
  }
  return answers;
}
