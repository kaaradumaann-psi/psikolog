/**
 * PHASE-07 — Bulut katmanının uygulamaya bağlanması.
 * UI → store → repository → Supabase akışının yaşam döngüsü burada yönetilir.
 */
import type { AuthenticatedUser } from '../../auth/authTypes';
import { applyClinicalSnapshot } from '../clinicalStore';
import { applyPracticeSnapshot } from '../practiceStore';
import type { ClinicalSnapshot } from './repository';
import { activateCloud, deactivateCloud, flushOutbox, isCloudConfigured } from './sync';

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
    await flushOutbox().catch(() => 0);
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
