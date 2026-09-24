/**
 * Taslak ve çevrimdışı kuyruk — MMPI pattern, client için
 * React state tek doğruluk kaynağı, bu modül localStorage aynası
 * localStorage: küçük JSON <1MB, eşzamanlı, sekme kapanıp açılsa yaşar
 * OMR ham görselleri gibi türetilmiş artefakt yok, sadece danışan formu
 * Kayıt ağ hatasıyla düşerse aynı idempotencyKey ile outbox'a alınır, bağlantı gelince retry
 */

export const DRAFT_VERSION = 1 as const;
export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün

export const DRAFT_KEY_PREFIX = 'psikolog:client-draft:v1:';
export const OUTBOX_KEY_PREFIX = 'psikolog:client-outbox:v1:';

export function draftKey(userId: string): string {
  return `${DRAFT_KEY_PREFIX}${userId}`;
}

export function outboxKey(userId: string): string {
  return `${OUTBOX_KEY_PREFIX}${userId}`;
}

export type ClientDraft = {
  version: typeof DRAFT_VERSION;
  idempotencyKey: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  email: string;
  profession: string;
  education: string;
  updatedAt: number;
};

export type OutboxItem = {
  idempotencyKey: string;
  payload: Omit<ClientDraft, 'version' | 'updatedAt'>;
  attempts: number;
  lastAttempt: number;
};

export function isExpired(draft: ClientDraft): boolean {
  return Date.now() - draft.updatedAt > DRAFT_TTL_MS;
}

export function createDraft(_userId: string, data: Partial<ClientDraft> = {}): ClientDraft {
  return {
    version: DRAFT_VERSION,
    idempotencyKey: data.idempotencyKey || crypto.randomUUID(),
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    birthDate: data.birthDate || '',
    phone: data.phone || '',
    email: data.email || '',
    profession: data.profession || '',
    education: data.education || '',
    updatedAt: Date.now(),
  };
}

export function saveDraft(userId: string, draft: ClientDraft, storage: Storage = localStorage): void {
  try {
    storage.setItem(draftKey(userId), JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch {
    // Quota exceeded or private mode — ignore, state still in memory
  }
}

export function loadDraft(userId: string, storage: Storage = localStorage): ClientDraft | null {
  try {
    const raw = storage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientDraft;
    if (parsed.version !== DRAFT_VERSION) return null;
    if (isExpired(parsed)) {
      storage.removeItem(draftKey(userId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(userId: string, storage: Storage = localStorage): void {
  try {
    storage.removeItem(draftKey(userId));
  } catch {
    // ignore
  }
}

export function isNetworkError(error: unknown): boolean {
  const msg = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('timeout')
  );
}
