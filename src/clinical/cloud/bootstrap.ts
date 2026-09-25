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
  adoptBaseOutbox,
  cloudContext,
  deactivateCloud,
  failCloudHydration,
  flushOutbox,
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
      applyClinicalSnapshot(snapshot);
      applyPracticeSnapshot(snapshot);
      // The UI can open only after *both* stores reflect the server snapshot.
      markCloudHydrated();

      // Aktivasyon öncesi kuyruğa alınan yazımlar kapsamlı kuyruğa taşınır ve
      // gönderilir; gerçekten gönderildiyse anlık görüntü tazelenir ki kayıt
      // arayüzde hemen görünsün (sunucu tek doğruluk kaynağı).
      adoptBaseOutbox();
      const sent = await flushOutbox().catch(() => 0);
      if (currentGeneration !== generation) return null;
      if (sent > 0) {
        const activePort = syncPort();
        const activeContext = cloudContext();
        if (activePort && activeContext) {
          const refreshed = remapSnapshotIds(await loadSnapshot(activePort, activeContext));
          if (currentGeneration !== generation) return null;
          applyClinicalSnapshot(refreshed);
          applyPracticeSnapshot(refreshed);
          return refreshed;
        }
      }
      return snapshot;
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
