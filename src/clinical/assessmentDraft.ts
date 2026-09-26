import type { Gender } from './clinicalTypes';
import { clinicToday, isValidClinicDate } from './recordRules';

export const ASSESSMENT_DRAFT_SCHEMA = 1;
const DRAFT_PREFIX = 'psikolog:assessment-draft:v1:';
const POINTER_PREFIX = 'psikolog:assessment-draft-pointer:v1:';

export type AssessmentDraft = {
  schema: typeof ASSESSMENT_DRAFT_SCHEMA;
  instrumentVersion: string;
  identityKey: string;
  administrationId: string;
  clientId?: string;
  manualName: string;
  manualGender: Gender | '';
  manualAge: string;
  testDate: string;
  answers: Array<number | null>;
  expertNote: string;
  functionalDifficulty: number | null;
  updatedAt: string;
};

export type AssessmentDraftSpec = {
  instrumentVersion: string;
  itemCount: number;
  minScore: number;
  maxScore: number;
};

export function assessmentDraftIdentity(clientId: string): string {
  return clientId ? `client:${clientId}` : 'manual';
}

export function newAssessmentDraftAdministrationId(): string {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return `administration:${token}`;
}

function storageKey(spec: AssessmentDraftSpec, identityKey: string, administrationId: string): string {
  return `${DRAFT_PREFIX}${encodeURIComponent(spec.instrumentVersion)}:${encodeURIComponent(identityKey)}:${encodeURIComponent(administrationId)}`;
}

function pointerKey(spec: AssessmentDraftSpec, identityKey: string): string {
  return `${POINTER_PREFIX}${encodeURIComponent(spec.instrumentVersion)}:${encodeURIComponent(identityKey)}`;
}

function sessionStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function parseAssessmentDraft(
  value: string | null,
  spec: AssessmentDraftSpec,
  expectedIdentity: string,
  expectedAdministrationId?: string,
): AssessmentDraft | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<AssessmentDraft>;
    const validAnswer = (answer: unknown) => answer === null
      || (Number.isInteger(answer) && Number(answer) >= spec.minScore && Number(answer) <= spec.maxScore);
    if (
      candidate.schema !== ASSESSMENT_DRAFT_SCHEMA
      || candidate.instrumentVersion !== spec.instrumentVersion
      || candidate.identityKey !== expectedIdentity
      || typeof candidate.administrationId !== 'string'
      || !candidate.administrationId.startsWith('administration:')
      || (expectedAdministrationId !== undefined && candidate.administrationId !== expectedAdministrationId)
      || !Array.isArray(candidate.answers)
      || candidate.answers.length !== spec.itemCount
      || !candidate.answers.every(validAnswer)
      || typeof candidate.manualName !== 'string'
      || typeof candidate.manualAge !== 'string'
      || typeof candidate.expertNote !== 'string'
      || (candidate.manualGender !== '' && candidate.manualGender !== 'KADIN' && candidate.manualGender !== 'ERKEK')
      || typeof candidate.testDate !== 'string'
      || !isValidClinicDate(candidate.testDate)
      || (candidate.functionalDifficulty !== null
        && candidate.functionalDifficulty !== undefined
        && (!Number.isInteger(candidate.functionalDifficulty)
          || candidate.functionalDifficulty < 0
          || candidate.functionalDifficulty > 3))
      || typeof candidate.updatedAt !== 'string'
    ) return null;
    return { ...candidate, functionalDifficulty: candidate.functionalDifficulty ?? null } as AssessmentDraft;
  } catch {
    return null;
  }
}

export function readAssessmentDraft(spec: AssessmentDraftSpec, identityKey: string): AssessmentDraft | null {
  const store = sessionStore();
  if (!store) return null;
  const administrationId = store.getItem(pointerKey(spec, identityKey));
  if (!administrationId) return null;
  return parseAssessmentDraft(
    store.getItem(storageKey(spec, identityKey, administrationId)),
    spec,
    identityKey,
    administrationId,
  );
}

export function writeAssessmentDraft(
  spec: AssessmentDraftSpec,
  draft: Omit<AssessmentDraft, 'schema' | 'instrumentVersion' | 'updatedAt'>,
): void {
  const store = sessionStore();
  if (!store) return;
  const value: AssessmentDraft = {
    ...draft,
    schema: ASSESSMENT_DRAFT_SCHEMA,
    instrumentVersion: spec.instrumentVersion,
    updatedAt: new Date().toISOString(),
  };
  try {
    store.setItem(storageKey(spec, draft.identityKey, draft.administrationId), JSON.stringify(value));
    store.setItem(pointerKey(spec, draft.identityKey), draft.administrationId);
  } catch {
    // Best effort only. Explicit clinical save remains the durable workflow.
  }
}

export function removeAssessmentDraft(
  spec: AssessmentDraftSpec,
  identityKey: string,
  administrationId: string,
): void {
  const store = sessionStore();
  if (!store) return;
  try {
    store.removeItem(storageKey(spec, identityKey, administrationId));
    if (store.getItem(pointerKey(spec, identityKey)) === administrationId) {
      store.removeItem(pointerKey(spec, identityKey));
    }
  } catch {
    // A draft failure must not alter any clinical record.
  }
}

export function emptyAssessmentDraft(
  spec: AssessmentDraftSpec,
  identityKey: string,
  clientId?: string,
  administrationId = newAssessmentDraftAdministrationId(),
): AssessmentDraft {
  return {
    schema: ASSESSMENT_DRAFT_SCHEMA,
    instrumentVersion: spec.instrumentVersion,
    identityKey,
    administrationId,
    clientId,
    manualName: '',
    manualGender: '',
    manualAge: '',
    testDate: clinicToday(),
    answers: Array.from({ length: spec.itemCount }, () => null),
    expertNote: '',
    functionalDifficulty: null,
    updatedAt: new Date(0).toISOString(),
  };
}
