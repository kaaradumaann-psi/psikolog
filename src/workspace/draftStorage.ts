/**
 * Taslak ve çevrimdışı kuyruk deposu.
 *
 * Kodlama mantığı (özet):
 * - React state tek doğruluk kaynağıdır; bu modül onun `localStorage` aynasıdır.
 * - `localStorage` seçildi çünkü taslak küçük JSON'dur (<1 MB), eşzamanlıdır ve
 *   sekme kapatılıp açılsa bile yaşar (`sessionStorage` sekme ile ölür).
 *   F5, tarayıcı çökmesi ve internet kesintisi bu sayede veri kaybettirmez.
 * - OMR ham görselleri (`normalized`, `previewUrl`) saklanmaz: bunlar türetilmiş
 *   artefaktlardır (aynı kâğıt yeniden okutulabilir) ve MB'larca yer tutar.
 *   Buna karşılık kullanıcının girdiği her şey (danışan, hızlı giriş, ham puan,
 *   OMR madde sonuçları + manuel düzeltmeler) eksiksiz korunur ve kayıt için
 *   yeterlidir. Görsel olmadan kör düzeltmeye izin verilmez (uyarı gösterilir).
 * - Kayıt denemesi ağ hatasıyla düşerse aynı `idempotencyKey` ile outbox
 *   kuyruğuna alınır; bağlantı gelince otomatik tekrar denenir. Sunucu aynı
 *   anahtarla `upsert` yaptığı için çift kayıt oluşmaz.
 * - Hızlı giriş cevapları tek string olarak kodlanır: JSON `undefined` ile
 *   `null`'u ayırt edemediği için 'D'/'Y'/'B'(bilinçli boş)/'-'(henüz girilmedi)
 *   alfabesi kullanılır.
 */
import { isOmrPage, ITEM_COUNT, todayIsoDate } from './caseTypes';
import type { CaseStep, ClientIntake, EntryMethod, ItemAnswer, RawScores } from './caseTypes';
import { isValidDateOnly, isValidReviewTimestamp } from '../validation/dateGuards';
import type { ScanSet } from '../scanner/pageSequence';
import type { StoredScanPage } from '../results/scanResultTypes';

export const DRAFT_VERSION = 1 as const;
/** Taslak bu süreden eskiyse çöpe atılır (30 gün). */
export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const DRAFT_KEY_PREFIX = 'mmpi566:case-draft:v1:';
export const OUTBOX_KEY_PREFIX = 'mmpi566:case-outbox:v1:';

export function draftKey(userId: string): string {
  return `${DRAFT_KEY_PREFIX}${userId}`;
}

export function outboxKey(userId: string): string {
  return `${OUTBOX_KEY_PREFIX}${userId}`;
}

/** `localStorage` benzeri en küçük arayüz; testlerde bellek deposu verilir. */
export type KeyValueStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function defaultStore(): KeyValueStore | null {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as { localStorage?: KeyValueStore }).localStorage) {
      const store = (globalThis as { localStorage: KeyValueStore }).localStorage;
      // Erişim denemesi: gizli mod / kota engeli burada patlar.
      store.getItem('__mmpi_probe__');
      return store;
    }
  } catch {
    /* desteksiz ortam: kalıcı taslak yok, uygulama yine çalışır */
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Hızlı giriş kodlaması                                               */
/* ------------------------------------------------------------------ */

export function encodeAnswers(answers: readonly ItemAnswer[]): string {
  let out = '';
  for (let i = 0; i < ITEM_COUNT; i++) {
    const answer = answers[i];
    out += answer === 'D' ? 'D' : answer === 'Y' ? 'Y' : answer === null ? 'B' : '-';
  }
  return out;
}

export function decodeAnswers(encoded: unknown): ItemAnswer[] | null {
  if (typeof encoded !== 'string' || encoded.length !== ITEM_COUNT) return null;
  const answers: ItemAnswer[] = new Array<ItemAnswer>(ITEM_COUNT);
  for (let i = 0; i < ITEM_COUNT; i++) {
    const char = encoded.charAt(i);
    if (char === 'D') answers[i] = 'D';
    else if (char === 'Y') answers[i] = 'Y';
    else if (char === 'B') answers[i] = null;
    else if (char === '-') answers[i] = undefined;
    else return null;
  }
  return answers;
}

/* ------------------------------------------------------------------ */
/* OMR serileştirme (görsel hariç, veri dahil)                         */
/* ------------------------------------------------------------------ */

/** Blob URL + ham piksel hariç saklanan sayfa. Kayıt için yeterlidir. */
export type SerializedScanPage = Omit<StoredScanPage, 'normalized' | 'previewUrl' | 'originalImageUrl'> & {
  previewUrl: '';
  normalized: null;
};

export type SerializedScanSet = {
  batchId: string | null;
  reviewerId: string;
  pages: Record<string, SerializedScanPage>;
  clinicalTransferAllowed: false;
};

export function serializeScan(scan: ScanSet): SerializedScanSet {
  const pages: Record<string, SerializedScanPage> = {};
  for (const [key, page] of Object.entries(scan.pages)) {
    const { normalized: _stripped, previewUrl: _url, originalImageUrl: _originalUrl, ...rest } = page;
    void _stripped;
    void _url;
    void _originalUrl;
    // Derin kopya: sonradan state mutasyonu taslağı bozmasın.
    pages[key] = JSON.parse(JSON.stringify({ ...rest, previewUrl: '', normalized: null })) as SerializedScanPage;
  }
  return {
    batchId: scan.batchId,
    reviewerId: scan.reviewerId,
    pages,
    clinicalTransferAllowed: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function deserializeScan(data: unknown): ScanSet | null {
  if (!isRecord(data)) return null;
  const { batchId, reviewerId, pages } = data as {
    batchId?: unknown;
    reviewerId?: unknown;
    pages?: unknown;
  };
  if (batchId !== null && (typeof batchId !== 'string' || !/^[A-F0-9]{24}$/.test(batchId))) return null;
  if (typeof reviewerId !== 'string' || !reviewerId || reviewerId.length > 160) return null;
  if (!isRecord(pages) || Object.keys(pages).length > 4) return null;
  const restored: Record<number, StoredScanPage> = {};
  for (const [key, raw] of Object.entries(pages)) {
    const pageNumber = Number(key);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 4 || String(pageNumber) !== key) return null;
    if (!isRecord(raw)) return null;
    const page = raw as Record<string, unknown>;
    if (page.ok !== true) return null;
    if (typeof page.pageId !== 'string' || !page.pageId || typeof page.batchId !== 'string' ||
      !/^[A-F0-9]{24}$/.test(page.batchId)) return null;
    if (typeof page.pageNumber !== 'number' || page.pageNumber !== pageNumber ||
      typeof page.fingerprint !== 'string' || !page.fingerprint || page.fingerprint.length > 160) return null;
    if (!Array.isArray(page.items) || !isRecord(page.quality)) return null;
    if (!Array.isArray(page.sourceCorners) || !Array.isArray(page.warnings)) return null;
    if (typeof page.sourceName !== 'string') return null;
    if (!isRecord(page.reviews) || !isOmrPage(page)) return null;
    // Görsel yok: boş önizleme + 0 boyutlu normalize. Kayıt etkilenmez;
    // görsel inceleme arayüzü bu durumu algılar ve kör düzeltmeyi kilitler.
    const { originalImageUrl: _discardedOriginalUrl, ...serializedPage } = raw as unknown as Record<string, unknown>;
    void _discardedOriginalUrl;
    restored[pageNumber] = {
      ...(serializedPage as Omit<StoredScanPage, 'normalized' | 'previewUrl' | 'originalImageUrl'>),
      previewUrl: '',
      normalized: { width: 0, height: 0, data: new Uint8Array(0) },
      reviewHistory: Array.isArray(page.reviewHistory) ? (page.reviewHistory as StoredScanPage['reviewHistory']) : [],
    };
  }
  const pageBatches = new Set(Object.values(restored).map(page => page.batchId));
  if (pageBatches.size > 1 || (Object.keys(restored).length > 0 && (batchId === null || pageBatches.has(batchId) === false))) return null;
  return { batchId: batchId as string | null, reviewerId, pages: restored, clinicalTransferAllowed: false };
}

/** Görseliyle mi yoksa taslaktan görselsiz mi geri geldi? */
export function scanPageHasImage(page: Pick<StoredScanPage, 'normalized' | 'previewUrl'>): boolean {
  return (
    !!page.previewUrl &&
    !!page.normalized &&
    page.normalized.width > 0 &&
    page.normalized.height > 0 &&
    page.normalized.data.length > 0
  );
}

/* ------------------------------------------------------------------ */
/* Taslak                                                              */
/* ------------------------------------------------------------------ */

export type CaseDraftV1 = {
  version: typeof DRAFT_VERSION;
  userId: string;
  updatedAt: string;
  step: CaseStep;
  client: ClientIntake;
  method: EntryMethod | null;
  answersEncoded: string;
  currentItem: number;
  raw: RawScores;
  scan: SerializedScanSet | null;
  submissionKey: string;
  savedId: string | null;
  savedAt: string | null;
  /** "Düzenle" ile açılan çalışmanın orijinal kayıt id'si (yoksa null/absent). */
  revisionOf?: string | null;
  /** Revizyonun kısa nedeni. */
  revisionReason?: string | null;
};

export type DraftSaveResult = { ok: true } | { ok: false; reason: string };

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function draftText(value: unknown, max: number, allowLineBreaks = false): value is string {
  return typeof value === 'string' && value.length <= max &&
    (allowLineBreaks
      ? !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
      : !/[\u0000-\u001f\u007f]/.test(value));
}

function isClientIntake(value: unknown): value is ClientIntake {
  if (!isRecord(value)) return false;
  const client = value as Record<string, unknown>;
  return (
    draftText(client.firstName, 80) &&
    draftText(client.lastName, 80) &&
    (client.gender === '' || client.gender === 'Erkek' || client.gender === 'Kadın') &&
    typeof client.age === 'number' && Number.isInteger(client.age) && client.age >= 0 && client.age <= 120 &&
    isValidDateOnly(client.testDate) && client.testDate <= todayIsoDate() &&
    draftText(client.testDuration, 20) &&
    draftText(client.occupation, 120) &&
    (client.followUp === '' || client.followUp === 'Ayaktan' || client.followUp === 'Yatış') &&
    (client.education === '' ||
      client.education === 'İlkokul' ||
      client.education === 'Ortaokul' ||
      client.education === 'Lise' ||
      client.education === 'Lisans' ||
      client.education === 'Lisansüstü') &&
    (client.maritalStatus === '' ||
      client.maritalStatus === 'Bekar' ||
      client.maritalStatus === 'Evli' ||
      client.maritalStatus === 'Boşanmış' ||
      client.maritalStatus === 'Dul') &&
    draftText(client.applicationReason, 500) &&
    draftText(client.clinicalContext, 2000, true)
  );
}

const RAW_KEYS = [
  'blank', 'L', 'F', 'K', 'Hs', 'D', 'Hy', 'Pd', 'Mf', 'Pa', 'Pt', 'Sc', 'Ma', 'Si',
] as const;

function isRawScores(value: unknown): value is RawScores {
  if (!isRecord(value)) return false;
  return RAW_KEYS.every(key => {
    const entry = (value as Record<string, unknown>)[key];
    return entry === '' || (typeof entry === 'number' && Number.isInteger(entry) && entry >= 0 && entry <= 566);
  });
}

export function isDraftNonEmpty(draft: Pick<CaseDraftV1, 'client' | 'method' | 'answersEncoded' | 'raw' | 'scan'>): boolean {
  const client = draft.client;
  const hasIntake =
    client.firstName.trim() !== '' ||
    client.lastName.trim() !== '' ||
    client.gender !== '' ||
    client.age > 0 ||
    client.testDuration.trim() !== '' ||
    client.occupation.trim() !== '' ||
    client.followUp !== '' ||
    client.education !== '' ||
    client.maritalStatus !== '' ||
    client.applicationReason.trim() !== '' ||
    client.clinicalContext.trim() !== '';
  if (hasIntake || draft.method !== null) return true;
  if (draft.answersEncoded && /[DYB]/.test(draft.answersEncoded)) return true;
  if (draft.raw && Object.values(draft.raw).some(value => value !== '')) return true;
  if (draft.scan && Object.keys(draft.scan.pages).length > 0) return true;
  return false;
}

export function saveDraft(
  userId: string,
  draft: Omit<CaseDraftV1, 'version' | 'userId' | 'updatedAt'> & { updatedAt?: string },
  store?: KeyValueStore | null,
): DraftSaveResult {
  const target = store ?? defaultStore();
  if (!target) return { ok: false, reason: 'Bu tarayıcıda kalıcı depolama yok; taslak yalnızca bellek yaşıyor.' };
  const payload: CaseDraftV1 = {
    version: DRAFT_VERSION,
    userId,
    updatedAt: draft.updatedAt ?? new Date().toISOString(),
    step: draft.step,
    client: draft.client,
    method: draft.method,
    answersEncoded: draft.answersEncoded,
    currentItem: draft.currentItem,
    raw: draft.raw,
    scan: draft.scan,
    submissionKey: draft.submissionKey,
    savedId: draft.savedId,
    savedAt: draft.savedAt,
    revisionOf: draft.revisionOf ?? null,
    revisionReason: draft.revisionReason ?? null,
  };
  try {
    target.setItem(draftKey(userId), JSON.stringify(payload));
    return { ok: true };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (/quota|exceeded|storage/i.test(message)) {
      return { ok: false, reason: 'Cihaz depolaması dolu; taslak bu kez kaydedilemedi. Eski kayıtları temizleyin.' };
    }
    return { ok: false, reason: 'Taslak kaydedilemedi; girdiğiniz veriler bu ekranda korunuyor.' };
  }
}

export function loadDraft(userId: string, store?: KeyValueStore | null): CaseDraftV1 | null {
  const target = store ?? defaultStore();
  if (!target) return null;
  let text: string | null = null;
  try {
    text = target.getItem(draftKey(userId));
  } catch {
    return null;
  }
  if (!text) return null;
  // Do not parse attacker-controlled multi-megabyte JSON from localStorage. A valid draft is
  // comfortably below this ceiling even when it contains all four OMR pages and review history.
  if (text.length > 8 * 1024 * 1024) {
    try { target.removeItem(draftKey(userId)); } catch { /* yoksay */ }
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Bozuk taslak: sessizce at, uygulamayı kilitleme.
    try {
      target.removeItem(draftKey(userId));
    } catch {
      /* yoksay */
    }
    return null;
  }
  if (!isRecord(parsed)) return null;
  const candidate = parsed as Record<string, unknown>;
  if (candidate.version !== DRAFT_VERSION) return null;
  if (candidate.userId !== userId) return null;
  if (!isValidReviewTimestamp(candidate.updatedAt)) return null;
  if (Date.now() - Date.parse(candidate.updatedAt) > DRAFT_TTL_MS) {
    try {
      target.removeItem(draftKey(userId));
    } catch {
      /* yoksay */
    }
    return null;
  }
  const step = candidate.step as CaseStep;
  if (step !== 'home' && step !== 'intake' && step !== 'method' && step !== 'entry' && step !== 'review') return null;
  if (!isClientIntake(candidate.client)) return null;
  const method = candidate.method as EntryMethod | null;
  if (method !== null && method !== 'quick' && method !== 'raw' && method !== 'omr') return null;
  if (decodeAnswers(candidate.answersEncoded) === null) return null;
  if (typeof candidate.currentItem !== 'number' || candidate.currentItem < 0 || candidate.currentItem >= ITEM_COUNT) {
    return null;
  }
  if (!isRawScores(candidate.raw)) return null;
  if (candidate.scan !== null && deserializeScan(candidate.scan) === null) return null;
  if (typeof candidate.submissionKey !== 'string' || !UUID_V4.test(candidate.submissionKey)) return null;
  if (candidate.savedId !== null && typeof candidate.savedId !== 'string') return null;
  if (candidate.savedAt !== null && !isValidReviewTimestamp(candidate.savedAt)) {
    return null;
  }
  // Revizyon alanları opsiyoneldir (eski taslaklarda yoktur); mevcutlarsa
  // UUID/kenarlı metin olmalıdır.
  if (candidate.revisionOf !== undefined && candidate.revisionOf !== null &&
    (typeof candidate.revisionOf !== 'string' || !UUID_V4.test(candidate.revisionOf))) return null;
  if (candidate.revisionReason !== undefined && candidate.revisionReason !== null &&
    (typeof candidate.revisionReason !== 'string' || candidate.revisionReason.length > 200)) return null;
  return candidate as unknown as CaseDraftV1;
}

export function clearDraft(userId: string, store?: KeyValueStore | null): void {
  const target = store ?? defaultStore();
  if (!target) return;
  try {
    target.removeItem(draftKey(userId));
  } catch {
    /* yoksay */
  }
}

/* ------------------------------------------------------------------ */
/* Çevrimdışı kayıt kuyruğu (outbox)                                   */
/* ------------------------------------------------------------------ */

export type OutboxEntry = {
  /** Sunucudaki upsert anahtarıyla aynı: tekrar deneme çift kayıt yapmaz. */
  idempotencyKey: string;
  method: EntryMethod;
  client: ClientIntake;
  answersEncoded: string | null;
  raw: RawScores | null;
  scan: SerializedScanSet | null;
  /** "Düzenle" çalışmaları: revizyon bağlantısı kuyrukta da korunur. */
  revisionOf?: string | null;
  revisionReason?: string | null;
  createdAt: string;
  attempts: number;
  lastError: string;
};

function isOutboxEntry(value: unknown): value is OutboxEntry {
  if (!isRecord(value)) return false;
  const entry = value as Record<string, unknown>;
  const method = entry.method;
  const answersValid = entry.answersEncoded === null || decodeAnswers(entry.answersEncoded) !== null;
  const rawValid = entry.raw === null || isRawScores(entry.raw);
  const scanValid = entry.scan === null || deserializeScan(entry.scan) !== null;
  const methodShapeValid = method === 'quick'
    ? entry.answersEncoded !== null && entry.raw === null && entry.scan === null
    : method === 'raw'
      ? entry.answersEncoded === null && entry.raw !== null && entry.scan === null
      : method === 'omr' && entry.answersEncoded === null && entry.raw === null && entry.scan !== null;
  const revisionOfValid = entry.revisionOf === undefined || entry.revisionOf === null ||
    (typeof entry.revisionOf === 'string' && UUID_V4.test(entry.revisionOf));
  const revisionReasonValid = entry.revisionReason === undefined || entry.revisionReason === null ||
    (typeof entry.revisionReason === 'string' && entry.revisionReason.length <= 200);
  return (
    typeof entry.idempotencyKey === 'string' &&
    UUID_V4.test(entry.idempotencyKey) &&
    (method === 'quick' || method === 'raw' || method === 'omr') &&
    isClientIntake(entry.client) && answersValid && rawValid && scanValid && methodShapeValid &&
    revisionOfValid && revisionReasonValid &&
    typeof entry.createdAt === 'string' && isValidReviewTimestamp(entry.createdAt) &&
    typeof entry.attempts === 'number' && Number.isInteger(entry.attempts) && entry.attempts >= 0 && entry.attempts <= 100 &&
    typeof entry.lastError === 'string' && entry.lastError.length <= 2000 && !/[\u0000-\u001f\u007f]/.test(entry.lastError)
  );
}

export function loadOutbox(userId: string, store?: KeyValueStore | null): OutboxEntry[] {
  const target = store ?? defaultStore();
  if (!target) return [];
  let text: string | null = null;
  try {
    text = target.getItem(outboxKey(userId));
  } catch {
    return [];
  }
  if (!text) return [];
  // Outbox entries can contain four pages of measured results; still reject an unbounded
  // attacker-controlled localStorage value before JSON.parse allocates it.
  if (text.length > 8 * 1024 * 1024) {
    try { target.removeItem(outboxKey(userId)); } catch { /* yoksay */ }
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isOutboxEntry).slice(-10);
  } catch {
    return [];
  }
}

function persistOutbox(userId: string, entries: OutboxEntry[], store: KeyValueStore | null): boolean {
  if (!store) return false;
  try {
    store.setItem(outboxKey(userId), JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

export function enqueueOutbox(userId: string, entry: OutboxEntry, store?: KeyValueStore | null): boolean {
  const target = store ?? defaultStore();
  if (!target) return false;
  const current = loadOutbox(userId, target).filter(item => item.idempotencyKey !== entry.idempotencyKey);
  current.push(entry);
  return persistOutbox(userId, current.slice(-10), target);
}

export function updateOutboxEntry(
  userId: string,
  idempotencyKey: string,
  patch: Partial<Pick<OutboxEntry, 'attempts' | 'lastError'>>,
  store?: KeyValueStore | null,
): void {
  const target = store ?? defaultStore();
  if (!target) return;
  const current = loadOutbox(userId, target).map(item =>
    item.idempotencyKey === idempotencyKey ? { ...item, ...patch } : item,
  );
  persistOutbox(userId, current, target);
}

export function removeOutboxEntry(userId: string, idempotencyKey: string, store?: KeyValueStore | null): void {
  const target = store ?? defaultStore();
  if (!target) return;
  persistOutbox(
    userId,
    loadOutbox(userId, target).filter(item => item.idempotencyKey !== idempotencyKey),
    target,
  );
}

/* ------------------------------------------------------------------ */
/* Ağ hatası sezme                                                     */
/* ------------------------------------------------------------------ */

const NETWORK_HINTS = [
  'failed to fetch',
  'networkerror',
  'network request failed',
  'fetch failed',
  'load failed',
  'network',
  'offline',
  'econn',
  'enotfound',
  'etimedout',
  'timeout',
  'bağlantı',
  'çevrimdışı',
  'cevrimdisi',
];

export function isOfflineNow(): boolean {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') return !navigator.onLine;
  } catch {
    /* yoksay */
  }
  return false;
}

/** Doğrulama hatalarıyla ağ hatalarını ayırt eder; yalnızca ağda kuyruğa alınır. */
export function isNetworkError(error: unknown): boolean {
  if (isOfflineNow()) return true;
  const chain: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    if (current instanceof Error) {
      chain.push(current.name, current.message);
      const cause = (current as { cause?: unknown }).cause;
      current = cause ?? null;
    } else if (typeof current === 'string') {
      chain.push(current);
      current = null;
    } else if (typeof current === 'object' && current !== null) {
      const record = current as Record<string, unknown>;
      if (typeof record.message === 'string') chain.push(record.message);
      if (typeof record.code === 'string') chain.push(record.code);
      current = (record.cause as unknown) ?? null;
    } else {
      current = null;
    }
  }
  const haystack = chain.join(' ').toLowerCase();
  if (!haystack.trim()) return false;
  return NETWORK_HINTS.some(hint => haystack.includes(hint));
}

export function formatDraftTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('tr-TR', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
