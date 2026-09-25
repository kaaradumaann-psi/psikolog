/**
 * PHASE-07 — Bulut katmanının uygulamaya bağlanması.
 * UI → store → repository → Supabase akışının yaşam döngüsü burada yönetilir.
 */
import type { AuthenticatedUser } from '../../auth/authTypes';
import { applyClinicalSnapshot } from '../clinicalStore';
import { applyPracticeSnapshot } from '../practiceStore';
import { loadSnapshot, type ClinicalSnapshot } from './repository';
import {
  activateCloud,
  cloudContext,
  deactivateCloud,
  failCloudHydration,
  flushOutbox,
  getSyncState,
  isCloudConfigured,
  markCloudHydrated,
  remapSnapshotIds,
  syncPort,
} from './sync';

let activeUserId: string | null = null;
let activation: Promise<ClinicalSnapshot | null> | null = null;
let generation = 0;

/**
 * Oturum açan kullanıcı için klinik veriyi sunucudan yükler ve yerel cache'i
 * tazeler. Sunucu tek doğruluk kaynağıdır; localStorage yalnızca yansıdır.
 * Aynı kullanıcı için eşzamanlı çağrılar (React StrictMode dahil) aynı yüklemeyi bekler.
 */
export function startClinicalCloud(user: AuthenticatedUser): Promise<ClinicalSnapshot | null> {
  if (!isCloudConfigured()) return Promise.resolve(null);
  if (activeUserId === user.id) return activation ?? Promise.resolve(null);

  const currentGeneration = ++generation;
  activeUserId = user.id;
  const task = (async () => {
    try {
      const snapshot = await activateCloud(user);
      if (currentGeneration !== generation) return null;

      // Replay this user's durable queue *before* replacing the local cache
      // with a server snapshot. If even one intent remains, opening the
      // workspace would hide an unsent clinical record behind an empty list.
      const sent = await flushOutbox();
      if (currentGeneration !== generation) return null;
      if (getSyncState().pending > 0) {
        throw new Error('Bekleyen klinik kayıtlar sunucuya gönderilemedi. Bu cihazdaki verileri silmeyin; yeniden deneyin veya yöneticinizle görüşün.');
      }
      const activePort = syncPort();
      const activeContext = cloudContext();
      const complete = sent > 0 && activePort && activeContext
        ? remapSnapshotIds(await loadSnapshot(activePort, activeContext))
        : snapshot;
      if (currentGeneration !== generation) return null;
      applyClinicalSnapshot(complete);
      applyPracticeSnapshot(complete);
      // The UI can open only after *both* stores reflect the complete server snapshot.
      markCloudHydrated();
      return complete;
    } catch (error) {
      if (currentGeneration === generation) {
        activeUserId = null;
        failCloudHydration(error);
      }
      throw error;
    } finally {
      if (currentGeneration === generation) activation = null;
    }
  })();
  activation = task;
  return task;
}

/**
 * Bulut bağlamını kapatır. `purge` yalnızca gerçek çıkışta kullanılır;
 * React yeniden bağlanmalarında cache'i silmemek için varsayılan false'tur.
 */
export function stopClinicalCloud(options: { purge?: boolean } = {}): void {
  ++generation;
  activeUserId = null;
  activation = null;
  if (options.purge) {
    deactivateCloud();
    return;
  }
  deactivateCloud();
}

export function cloudSessionUserId(): string | null {
  return activeUserId;
}
