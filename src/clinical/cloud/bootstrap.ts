/**
 * Session bootstrap for the cloud-backed workspace.
 *
 * Order matters:
 *   1. upgrade any legacy local ids to uuids (nothing is orphaned)
 *   2. bind the ports and make the cloud the write target
 *   3. make sure the psychologist has an organization, or every insert fails RLS
 *   4. push whatever the device holds that the cloud has not seen
 *   5. pull, and let the cloud rows win over the local cache
 *
 * Only after this resolves does the app render the workspace, so a refreshed or
 * re-authenticated session shows the database contents rather than stale cache.
 */

import type { AuthenticatedUser } from '../../auth/authTypes';
import { supabaseDbPort, supabaseStoragePort } from './supabasePort';
import { configureCloudSync, disableCloudSync, ensureOrganization, pullSnapshot } from './sync';
import { clearOutbox, reportSyncError } from './status';
import { applyClinicalCloudSnapshot, ensureCloudIds, pushLocalRecordsToCloud } from '../clinicalStore';
import { applyCloudPracticeSnapshot, pushLocalPracticeRecordsToCloud } from '../practiceStore';

export type BootstrapResult = { ok: boolean; error?: string };

export async function bootstrapCloudSession(user: AuthenticatedUser): Promise<BootstrapResult> {
  ensureCloudIds();
  configureCloudSync({
    db: supabaseDbPort,
    storage: supabaseStoragePort,
    owner: { organizationId: user.organizationId ?? '', userId: user.id },
  });

  try {
    await ensureOrganization();
    await pushLocalRecordsToCloud();
    await pushLocalPracticeRecordsToCloud();

    const snapshot = await pullSnapshot();
    applyClinicalCloudSnapshot(snapshot);
    applyCloudPracticeSnapshot({
      documents: snapshot.documents,
      notes: snapshot.notes,
      tasks: snapshot.tasks,
      screenings: snapshot.tests.filter((entry) => {
        const kind = (entry.result.result_data as { kind?: string } | null)?.kind;
        return kind === 'gad7' || kind === 'phq9';
      }),
    });

    clearOutbox();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportSyncError(message);
    return { ok: false, error: message };
  }
}

export function endCloudSession(): void {
  disableCloudSync();
}
