import type { AuthenticatedUser } from '../../auth/authTypes';
import type { SyncState } from './sync';

/** Only an authenticated platform ADMIN may manage orgs without a clinical
 * tenant. Everyone else continues through the fail-closed clinical gate. */
export function cloudWorkspaceEntry(user: Pick<AuthenticatedUser, 'role' | 'active' | 'organizationId'>): 'admin-setup' | 'clinical' {
  return user.role === 'ADMIN' && user.active && !user.organizationId ? 'admin-setup' : 'clinical';
}

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
