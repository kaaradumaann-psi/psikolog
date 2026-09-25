/**
 * Sync status, failure signalling and the offline outbox.
 *
 * Writes from the UI are synchronous by design (the existing store API is), so
 * a failed cloud write cannot throw into the caller. Instead it is recorded
 * here, surfaced through a DOM event, and retried on the next sync.
 */

import { isNetworkError } from '../../workspace/draftStorage';

export type SyncEntity =
  | 'client'
  | 'appointment'
  | 'session'
  | 'test'
  | 'report'
  | 'document'
  | 'note'
  | 'task'
  | 'formulation'
  | 'safety';

export type SyncState = {
  active: boolean;
  pending: number;
  failed: number;
  lastSyncAt: string | null;
  lastError: string | null;
};

export type OutboxEntry = {
  entity: SyncEntity;
  id: string;
  op: 'upsert' | 'delete';
  queuedAt: string;
};

const OUTBOX_KEY = 'psikolog_cloud_outbox_v1';
const MAX_OUTBOX = 500;

const state: SyncState = {
  active: false,
  pending: 0,
  failed: 0,
  lastSyncAt: null,
  lastError: null,
};

const listeners = new Set<(state: SyncState) => void>();

export function getSyncState(): SyncState {
  return { ...state };
}

export function subscribeSyncState(listener: (state: SyncState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  const snapshot = getSyncState();
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch {
      /* a broken listener must not break syncing */
    }
  }
}

export function setSyncActive(active: boolean): void {
  state.active = active;
  emit();
}

export function markSynced(): void {
  state.lastSyncAt = new Date().toISOString();
  state.lastError = null;
  state.failed = 0;
  emit();
}

export function beginWrite(): void {
  state.pending += 1;
  emit();
}

export function endWrite(): void {
  state.pending = Math.max(0, state.pending - 1);
  emit();
}

export function reportSyncError(message: string): void {
  state.lastError = message;
  state.failed += 1;
  emit();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('psikolog:sync-error', { detail: message }));
  }
}

/* ------------------------------------------------------------------ outbox */

export function readOutbox(): OutboxEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutboxEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeOutbox(entries: OutboxEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries.slice(0, MAX_OUTBOX)));
  } catch {
    /* quota — the in-memory retry still covers this session */
  }
}

export function queueRetry(entry: OutboxEntry): void {
  const entries = readOutbox().filter((item) => !(item.entity === entry.entity && item.id === entry.id));
  writeOutbox([entry, ...entries]);
}

/** A transient failure is worth retrying; a policy/validation error is not. */
export function isRetryable(error: unknown): boolean {
  if (isNetworkError(error)) return true;
  const message = String((error as Error)?.message ?? error ?? '').toLowerCase();
  return message.includes('timeout') || message.includes('503') || message.includes('502');
}

export function clearOutbox(): void {
  writeOutbox([]);
}
