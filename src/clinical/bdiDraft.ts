import { BDI_INSTRUMENT_VERSION, BDI_ITEM_COUNT } from './beckDepression';
import type { Gender } from './clinicalTypes';
import { clinicToday, isValidClinicDate } from './recordRules';

export const BDI_DRAFT_SCHEMA = 2;
const BDI_DRAFT_PREFIX = 'psikolog:bdi-draft:v2:';
const BDI_DRAFT_POINTER_PREFIX = 'psikolog:bdi-draft-pointer:v2:';

export type BdiDraft = {
  schema: typeof BDI_DRAFT_SCHEMA;
  instrumentVersion: typeof BDI_INSTRUMENT_VERSION;
  identityKey: string;
  administrationId: string;
  clientId?: string;
  manualName: string;
  manualGender: Gender | '';
  manualAge: string;
  testDate: string;
  answers: Array<number | null>;
  expertNote: string;
  updatedAt: string;
};

export function bdiDraftIdentity(clientId: string): string {
  return clientId ? `client:${clientId}` : 'manual';
}

export function newBdiDraftAdministrationId(): string {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return `administration:${token}`;
}

export function bdiDraftStorageKey(identityKey: string, administrationId: string): string {
  return `${BDI_DRAFT_PREFIX}${encodeURIComponent(BDI_INSTRUMENT_VERSION)}:${encodeURIComponent(identityKey)}:${encodeURIComponent(administrationId)}`;
}

function pointerKey(identityKey: string): string {
  return `${BDI_DRAFT_POINTER_PREFIX}${encodeURIComponent(BDI_INSTRUMENT_VERSION)}:${encodeURIComponent(identityKey)}`;
}

function validAnswer(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 3);
}

export function parseBdiDraft(value: string | null, expectedIdentity: string, expectedAdministrationId?: string): BdiDraft | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<BdiDraft>;
    if (
      candidate.schema !== BDI_DRAFT_SCHEMA
      || candidate.instrumentVersion !== BDI_INSTRUMENT_VERSION
      || candidate.identityKey !== expectedIdentity
      || typeof candidate.administrationId !== 'string'
      || !candidate.administrationId.startsWith('administration:')
      || (expectedAdministrationId !== undefined && candidate.administrationId !== expectedAdministrationId)
      || !Array.isArray(candidate.answers)
      || candidate.answers.length !== BDI_ITEM_COUNT
      || !candidate.answers.every(validAnswer)
      || typeof candidate.manualName !== 'string'
      || typeof candidate.manualAge !== 'string'
      || typeof candidate.expertNote !== 'string'
      || (candidate.manualGender !== '' && candidate.manualGender !== 'KADIN' && candidate.manualGender !== 'ERKEK')
      || typeof candidate.testDate !== 'string'
      || !isValidClinicDate(candidate.testDate)
      || typeof candidate.updatedAt !== 'string'
    ) return null;
    return candidate as BdiDraft;
  } catch {
    return null;
  }
}

function sessionStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Resolves only the active administration pointer for this exact entity and instrument. */
export function readBdiDraft(identityKey: string): BdiDraft | null {
  const store = sessionStore();
  if (!store) return null;
  const administrationId = store.getItem(pointerKey(identityKey));
  if (!administrationId) return null;
  return parseBdiDraft(
    store.getItem(bdiDraftStorageKey(identityKey, administrationId)),
    identityKey,
    administrationId,
  );
}

export function writeBdiDraft(draft: Omit<BdiDraft, 'schema' | 'instrumentVersion' | 'updatedAt'>): void {
  const store = sessionStore();
  if (!store) return;
  const value: BdiDraft = {
    ...draft,
    schema: BDI_DRAFT_SCHEMA,
    instrumentVersion: BDI_INSTRUMENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  try {
    store.setItem(bdiDraftStorageKey(draft.identityKey, draft.administrationId), JSON.stringify(value));
    store.setItem(pointerKey(draft.identityKey), draft.administrationId);
  } catch {
    // Draft persistence is best-effort; the clinical save path remains explicit.
  }
}

export function removeBdiDraft(identityKey: string, administrationId: string): void {
  const store = sessionStore();
  if (!store) return;
  try {
    store.removeItem(bdiDraftStorageKey(identityKey, administrationId));
    if (store.getItem(pointerKey(identityKey)) === administrationId) store.removeItem(pointerKey(identityKey));
  } catch {
    // No clinical record is removed; only an unavailable tab draft is ignored.
  }
}

export function emptyBdiDraft(
  identityKey: string,
  clientId?: string,
  administrationId = newBdiDraftAdministrationId(),
): BdiDraft {
  return {
    schema: BDI_DRAFT_SCHEMA,
    instrumentVersion: BDI_INSTRUMENT_VERSION,
    identityKey,
    administrationId,
    clientId,
    manualName: '',
    manualGender: '',
    manualAge: '',
    testDate: clinicToday(),
    answers: Array.from({ length: BDI_ITEM_COUNT }, () => null),
    expertNote: '',
    updatedAt: new Date(0).toISOString(),
  };
}
