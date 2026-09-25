/**
 * Sync orchestrator.
 *
 * The store API is synchronous (every screen reads it in a `useState`
 * initializer), so cloud writes are dispatched from here and cannot block the
 * UI. A write that fails is queued in the outbox and retried on the next
 * bootstrap; the failure is surfaced through `psikolog:sync-error`.
 *
 * This module deliberately does not import the stores, so the stores can import
 * it without creating a cycle.
 */

import { createRepository } from './repository';
import type { Repository, CloudSnapshot } from './repository';
import type { Owner } from './mapping';
import type { LocalTestRecord } from './mapping';
import type { DbPort, StoragePort } from './ports';
import {
  beginWrite,
  endWrite,
  getSyncState,
  isRetryable,
  markSynced,
  queueRetry,
  readOutbox,
  reportSyncError,
  setSyncActive,
  subscribeSyncState,
} from './status';
import type { OutboxEntry, SyncEntity, SyncState } from './status';
import type { Appointment, ClinicalReport, Client, SoapSession } from '../clinicalTypes';
import type { PracticeDocument, PracticeNote, PracticeTask } from '../practiceStore';
import type { CaseFormulation, SafetyPlan } from '../casework';

let repository: Repository | null = null;
let owner: Owner | null = null;

export type SyncRecord =
  | { entity: 'client'; record: Client }
  | { entity: 'appointment'; record: Appointment }
  | { entity: 'session'; record: SoapSession }
  | { entity: 'test'; record: LocalTestRecord }
  | { entity: 'report'; record: ClinicalReport; snapshot: Record<string, unknown> }
  | { entity: 'document'; record: PracticeDocument }
  | { entity: 'note'; record: PracticeNote }
  | { entity: 'task'; record: PracticeTask }
  | { entity: 'formulation'; record: CaseFormulation }
  | { entity: 'safety'; record: SafetyPlan };

export function configureCloudSync(deps: { db: DbPort; storage: StoragePort; owner: Owner }): Repository {
  owner = { ...deps.owner };
  repository = createRepository({ db: deps.db, storage: deps.storage, owner });
  setSyncActive(true);
  return repository;
}

export function disableCloudSync(): void {
  repository = null;
  owner = null;
  setSyncActive(false);
}

export function isCloudActive(): boolean {
  return repository !== null;
}

export function currentOwner(): Owner | null {
  return owner;
}

function activeRepository(): Repository {
  if (!repository) throw new Error('Bulut senkronizasyonu yapılandırılmamış.');
  return repository;
}

/**
 * Ensure the signed-in psychologist has an organization before anything is
 * written. Without one, every RLS insert policy fails.
 */
export async function ensureOrganization(): Promise<string> {
  return activeRepository().ensureOrganization();
}

export async function pullSnapshot(): Promise<CloudSnapshot> {
  const snapshot = await activeRepository().pullAll();
  markSynced();
  return snapshot;
}

/**
 * Writes are serialized in dispatch order. A psychologist who saves a client and
 * then a session in the same breath must not have the session insert race the
 * client insert and fail on the foreign key.
 */
let tail: Promise<void> = Promise.resolve();
const inFlight = new Set<Promise<void>>();

function enqueue(task: () => Promise<void>): void {
  const run = tail.then(task, task);
  const tracked = run.catch(() => undefined);
  inFlight.add(tracked);
  void tracked.finally(() => inFlight.delete(tracked));
  tail = tracked;
}

async function runWrite(entry: Omit<OutboxEntry, 'queuedAt'>, write: () => Promise<unknown>): Promise<void> {
  beginWrite();
  try {
    await write();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportSyncError(message);
    if (isRetryable(error)) {
      queueRetry({ ...entry, queuedAt: new Date().toISOString() });
    }
  } finally {
    endWrite();
  }
}

/** Wait for every dispatched write to settle. Used by tests and by the bootstrap. */
export async function flushWrites(): Promise<void> {
  while (inFlight.size > 0) {
    await Promise.allSettled([...inFlight]);
  }
  await tail;
}

/** Dispatch a write without blocking the caller. */
export function push(entry: SyncRecord): void {
  if (!repository) return;
  const repo = repository;
  // Formulation and safety plan are one-per-client and have no id of their own;
  // the client id is their outbox key (the repository derives the row id).
  const id = 'id' in entry.record ? entry.record.id : entry.record.clientId;
  enqueue(() => runWrite({ entity: entry.entity, id, op: 'upsert' }, () => {
    switch (entry.entity) {
      case 'client':
        return repo.pushClient(entry.record);
      case 'appointment':
        return repo.pushAppointment(entry.record);
      case 'session':
        return repo.pushSession(entry.record);
      case 'test':
        return repo.pushTest(entry.record);
      case 'report':
        return repo.pushReport(entry.record, entry.snapshot);
      case 'document':
        return repo.pushDocument(entry.record).then(() => undefined);
      case 'note':
        return repo.pushNote(entry.record);
      case 'task':
        return repo.pushTask(entry.record);
      case 'formulation':
        return repo.pushFormulation(entry.record);
      case 'safety':
        return repo.pushSafetyPlan(entry.record);
    }
  }));
}

/** Awaitable variant, used by the bootstrap retry pass and by tests. */
export function pushNow(entry: SyncRecord): Promise<void> {
  if (!repository) return Promise.resolve();
  const repo = repository;
  switch (entry.entity) {
    case 'client':
      return repo.pushClient(entry.record);
    case 'appointment':
      return repo.pushAppointment(entry.record);
    case 'session':
      return repo.pushSession(entry.record);
    case 'test':
      return repo.pushTest(entry.record);
    case 'report':
      return repo.pushReport(entry.record, entry.snapshot);
    case 'document':
      return repo.pushDocument(entry.record).then(() => undefined);
    case 'note':
      return repo.pushNote(entry.record);
    case 'task':
      return repo.pushTask(entry.record);
    case 'formulation':
      return repo.pushFormulation(entry.record);
    case 'safety':
      return repo.pushSafetyPlan(entry.record);
  }
}

/** `record` is only needed for documents, whose storage object must be removed too. */
export function remove(entity: SyncEntity, id: string, record?: unknown): void {
  if (!repository) return;
  const repo = repository;
  enqueue(() => runWrite({ entity, id, op: 'delete' }, () => {
    switch (entity) {
      case 'client':
        return repo.deleteClient(id);
      case 'appointment':
        return repo.deleteAppointment(id);
      case 'session':
        return repo.deleteSession(id);
      case 'test':
        return repo.deleteTest((record ?? { id }) as LocalTestRecord);
      case 'report':
        return repo.deleteReport(id);
      case 'document':
        return repo.deleteDocument((record ?? { id }) as PracticeDocument);
      case 'note':
        return repo.deleteNote(id);
      case 'task':
        return repo.deleteTask(id);
      case 'formulation':
        return repo.deleteFormulation(id);
      case 'safety':
        return repo.deleteSafetyPlan(id);
    }
  }));
}

/** Awaitable delete for tests and the bootstrap. */
export function removeNow(entity: SyncEntity, id: string, record?: unknown): Promise<void> {
  if (!repository) return Promise.resolve();
  const repo = repository;
  switch (entity) {
    case 'client':
      return repo.deleteClient(id);
    case 'appointment':
      return repo.deleteAppointment(id);
    case 'session':
      return repo.deleteSession(id);
    case 'test':
      return repo.deleteTest((record ?? { id }) as LocalTestRecord);
    case 'report':
      return repo.deleteReport(id);
    case 'document':
      return repo.deleteDocument((record ?? { id }) as PracticeDocument);
    case 'note':
      return repo.deleteNote(id);
    case 'task':
      return repo.deleteTask(id);
    case 'formulation':
      return repo.deleteFormulation(id);
    case 'safety':
      return repo.deleteSafetyPlan(id);
  }
}

export { getSyncState, subscribeSyncState, readOutbox };
export type { SyncState, OutboxEntry, SyncEntity };
