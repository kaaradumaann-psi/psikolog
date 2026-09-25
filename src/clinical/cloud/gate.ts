import type { SyncState } from './sync';

export type CloudGateStatus = 'local' | 'loading' | 'error' | 'ready';

/** A snapshot from a previous user (or a failed load) never unlocks this workspace. */
export function cloudGateStatus(
  userId: string,
  localMode: boolean,
  state: Pick<SyncState, 'userId' | 'hydrated' | 'phase'>,
): CloudGateStatus {
  if (localMode) return 'local';
  if (state.userId !== userId) return 'loading';
  if (state.hydrated) return 'ready';
  return state.phase === 'error' ? 'error' : 'loading';
}
