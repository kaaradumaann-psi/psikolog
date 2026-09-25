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
  flushOutbox,
  isCloudConfigured,
  remapSnapshotIds,
  syncPort,
} from './sync';

let activeUserId: string | null = null;

/**
 * Oturum açan kullanıcı için klinik veriyi sunucudan yükler ve yerel cache'i
 * tazeler. Sunucu tek doğruluk kaynağıdır; localStorage yalnızca yansıdır.
 */
export async function startClinicalCloud(user: AuthenticatedUser): Promise<ClinicalSnapshot | null> {
  if (!isCloudConfigured()) return null;
  if (activeUserId === user.id) return null;
  activeUserId = user.id;
  try {
    const snapshot = await activateCloud(user);
    applyClinicalSnapshot(snapshot);
    applyPracticeSnapshot(snapshot);
    // Aktivasyon öncesi kuyruğa alınan yazımlar kapsamlı kuyruğa taşınır ve
    // gönderilir; gerçekten gönderildiyse anlık görüntü tazelenir ki kayıt
    // arayüzde hemen görünsün (sunucu tek doğruluk kaynağı).
    adoptBaseOutbox();
    const sent = await flushOutbox().catch(() => 0);
    if (sent > 0) {
      const activePort = syncPort();
      const activeContext = cloudContext();
      if (activePort && activeContext) {
        const refreshed = remapSnapshotIds(await loadSnapshot(activePort, activeContext));
        applyClinicalSnapshot(refreshed);
        applyPracticeSnapshot(refreshed);
        return refreshed;
      }
    }
    return snapshot;
  } catch (error) {
    activeUserId = null;
    throw error;
  }
}

/**
 * Bulut bağlamını kapatır. `purge` yalnızca gerçek çıkışta kullanılır;
 * React yeniden bağlanmalarında cache'i silmemek için varsayılan false'tur.
 */
export function stopClinicalCloud(options: { purge?: boolean } = {}): void {
  activeUserId = null;
  if (options.purge) {
    deactivateCloud();
    return;
  }
  deactivateCloud();
}

export function cloudSessionUserId(): string | null {
  return activeUserId;
}
