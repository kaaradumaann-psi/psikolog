/**
 * PHASE-07 — Bulut senkronizasyonu.
 *
 * - `localStorage` yalnızca cache/draft/outbox'tır; kalıcı gerçeklik Supabase'dir.
 * - Her yazma önce yerel (hızlı UI), sonra buluta gider. Bulut yazımı başarısız
 *   olursa kullanıcıya "kaydedildi" denmez; iş kuyruğa (outbox) alınır.
 * - Anahtarlar kullanıcı/kurum ile ad alanına ayrılır: psikolog:{org}:{user}:*
 */
import type { AuthenticatedUser } from '../../auth/authTypes';
import { supabase, supabaseConfig } from '../../auth/supabaseClient';
import { isNetworkError } from '../../workspace/draftStorage';
import type { Appointment, BeckAnxietyResult, BeckDepressionResult, Client, ClinicalReport, Scl90Result, SoapSession } from '../clinicalTypes';
import type { CaseFormulation, SafetyPlan } from '../casework';
import type { PracticeDocument, PracticeNote, PracticeSettings, PracticeTask } from '../practiceStore';
import type { RapidScreeningResult } from '../rapidScreening';
import { createSupabasePort, type CloudPort } from './port';
import type { CloudContext } from './rows';
import * as repo from './repository';

export type SyncPhase = 'inactive' | 'loading' | 'ready' | 'saving' | 'saved' | 'error' | 'offline';

export type SyncState = {
  cloud: boolean;
  userId?: string;
  phase: SyncPhase;
  // True only after the server snapshot has been applied to both local stores.
  // A failed hydration must never be mistaken for an empty workspace.
  hydrated: boolean;
  pending: number;
  lastError?: string;
  lastSavedAt?: string;
};

export type WriteIntent =
  | { entity: 'client'; op: 'upsert'; value: Client }
  | { entity: 'client'; op: 'delete'; value: string }
  | { entity: 'appointment'; op: 'upsert'; value: Appointment }
  | { entity: 'appointment'; op: 'delete'; value: string }
  | { entity: 'session'; op: 'upsert'; value: SoapSession }
  | { entity: 'session'; op: 'delete'; value: string }
  | { entity: 'bdi'; op: 'upsert'; value: BeckDepressionResult }
  | { entity: 'bdi'; op: 'delete'; value: string }
  | { entity: 'bai'; op: 'upsert'; value: BeckAnxietyResult }
  | { entity: 'bai'; op: 'delete'; value: string }
  | { entity: 'scl90'; op: 'upsert'; value: Scl90Result }
  | { entity: 'scl90'; op: 'delete'; value: string }
  | { entity: 'screening'; op: 'upsert'; value: RapidScreeningResult }
  | { entity: 'screening'; op: 'delete'; value: string }
  | { entity: 'report'; op: 'upsert'; value: ClinicalReport }
  | { entity: 'report'; op: 'delete'; value: string }
  | { entity: 'note'; op: 'upsert'; value: PracticeNote }
  | { entity: 'note'; op: 'delete'; value: string }
  | { entity: 'task'; op: 'upsert'; value: PracticeTask }
  | { entity: 'task'; op: 'delete'; value: string }
  | { entity: 'document'; op: 'upsert'; value: PracticeDocument }
  | { entity: 'document'; op: 'delete'; value: PracticeDocument }
  | { entity: 'settings'; op: 'upsert'; value: PracticeSettings }
  | { entity: 'formulation'; op: 'upsert'; value: CaseFormulation }
  | { entity: 'safety'; op: 'upsert'; value: SafetyPlan }
  | { entity: 'sign'; op: 'sign'; value: { table: string; id: string } }
  | { entity: 'lock'; op: 'lock'; value: { table: string; id: string; signedAt?: string } };

const OUTBOX_SUFFIX = 'outbox';
const ID_MAP_SUFFIX = 'id-map';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CACHE_PREFIX = 'psikolog:';
let idMap: Record<string, string> | null = null;
let idMapScope: string | null = null;

function scopedKey(ctx: CloudContext, suffix: string): string {
  return `${CACHE_PREFIX}${ctx.organizationId}:${ctx.userId}:${suffix}`;
}

function mapFor(ctx: CloudContext): Record<string, string> {
  const key = scopedKey(ctx, ID_MAP_SUFFIX);
  if (ctx === context && idMap && idMapScope === key) return idMap;
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
        Object.values(parsed).some((id) => typeof id !== 'string' || !UUID_RE.test(id))) {
      throw new Error('invalid id map');
    }
    const map = parsed as Record<string, string>;
    if (ctx === context) { idMap = map; idMapScope = key; }
    return map;
  } catch {
    // Losing the map would create a second UUID on retry and orphan the first
    // cloud row. Keep the workspace closed rather than silently re-keying it.
    throw new Error('Klinik kimlik eşlemesi okunamadı. Tarayıcı verilerini silmeyin; yöneticinizle görüşün.');
  }
}

function toCloudIdFor(ctx: CloudContext, localId: string): string {
  if (!localId || UUID_RE.test(localId)) return localId;
  const previous = mapFor(ctx);
  if (previous[localId]) return previous[localId];
  const fresh = crypto.randomUUID();
  const next = { ...previous, [localId]: fresh };
  try {
    // Persist *before* sending a write. Without a durable mapping a retry can
    // duplicate clinical records or break client/appointment references.
    localStorage.setItem(scopedKey(ctx, ID_MAP_SUFFIX), JSON.stringify(next));
  } catch {
    throw new Error('Kimlik eşlemesi bu cihaza yazılamadı. Alan açın, kaydı yeniden deneyin.');
  }
  if (ctx === context) { idMap = next; idMapScope = scopedKey(ctx, ID_MAP_SUFFIX); }
  return fresh;
}

/** Cihaz kimliğini yalnızca aktif kullanıcının kalıcı UUID'sine eşler. */
export function toCloudId(localId: string): string {
  if (!context) throw new Error('Bulut oturumu hazır değil.');
  return toCloudIdFor(context, localId);
}

let context: CloudContext | null = null;
let port: CloudPort | null = null;
/**
 * Bu oturumda bulut bekleniyor mu? (yapılandırma ya da daha önce bağlanmış
 * bulut oturumu). Aktivasyon tamamlanmadan yapılan yazımların sessizce
 * düşürülmemesi için kullanılır; yerel (bulutsuz) kurulumda false kalır.
 */
let cloudExpected = isCloudConfigured();
let state: SyncState = { cloud: false, phase: 'inactive', hydrated: false, pending: 0 };
const listeners = new Set<(next: SyncState) => void>();

function emit(): void {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (error) {
      console.error('sync listener error:', error);
    }
  }
}

function setState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch };
  emit();
}

export function getSyncState(): SyncState {
  return state;
}

export function subscribeSync(listener: (next: SyncState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Called only after the complete snapshot has reached both UI stores. */
export function markCloudHydrated(): void {
  if (context && state.userId === context.userId) setState({ hydrated: true });
}

/** Keep the workspace closed if the snapshot cannot be applied. */
export function failCloudHydration(error: unknown): void {
  setState({ hydrated: false, phase: 'error', lastError: cloudErrorMessage(error) });
}

export function cloudContext(): CloudContext | null {
  return context;
}

/** Aktif taşıma katmanı (yalnız altyapı katmanı için; UI doğrudan kullanmaz). */
export function syncPort(): CloudPort | null {
  return port;
}

/**
 * Buluttan gelen kimliği (mümkünse) yerel kimliğe çevirir.
 * Böylece senkron sonrası UI'da kayıt kimlikleri değişmez.
 */
export function fromCloudId(cloudId: string): string {
  if (!cloudId || !context) return cloudId;
  for (const [local, cloud] of Object.entries(mapFor(context))) {
    if (cloud === cloudId) return local;
  }
  return cloudId;
}

/**
 * Sunucudan okunan anlık görüntüdeki bulut kimliklerini yerel kimliklerle
 * eşler. Yalnızca bilinen eşlemeler değiştirilir; yeni (bu cihazda hiç
 * oluşturulmamış) kayıtlar bulut kimliğiyle kalır.
 */
export function remapSnapshotIds(snapshot: repo.ClinicalSnapshot): repo.ClinicalSnapshot {
  function walk<T>(value: T): T {
    if (typeof value === 'string') return fromCloudId(value) as unknown as T;
    if (Array.isArray(value)) return value.map((item) => walk(item)) as unknown as T;
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        out[key] = walk(item);
      }
      return out as unknown as T;
    }
    return value;
  }
  return walk(snapshot);
}

/** Bulut aktif değilse eski (yerel) anahtar korunur — tek cihaz modu bozulmaz. */
export function cacheKey(base: string): string {
  if (!context) return base;
  const org = context.organizationId || 'no-org';
  return `${CACHE_PREFIX}${org}:${context.userId}:${base}`;
}

export function scopePrefix(): string | null {
  if (!context) return null;
  return `${CACHE_PREFIX}${context.organizationId || 'no-org'}:${context.userId}:`;
}

/**
 * Oturum kapanışında görünen klinik cache silinir. Bekleyen kullanıcı-kapsamlı
 * outbox ve UUID haritası saklanır: aynı kişi geri geldiğinde kayıp kayıtlar
 * sunucuya gönderilir; başka hesap bunları hiçbir zaman devralmaz.
 */
export function purgeScopedCache(): void {
  if (typeof localStorage === 'undefined') return;
  const prefix = scopePrefix();
  if (!prefix) return;
  const protectedKeys = new Set([`${prefix}${OUTBOX_SUFFIX}`, `${prefix}${ID_MAP_SUFFIX}`]);
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(prefix) && !protectedKeys.has(key)) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
}

/* ------------------------------------------------------------------ outbox */

type OutboxItem = { id: string; at: number; intent: WriteIntent };

function readOutboxFor(ctx: CloudContext): OutboxItem[] {
  try {
    const raw = localStorage.getItem(scopedKey(ctx, OUTBOX_SUFFIX));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((item) =>
      !item || typeof item.id !== 'string' || typeof item.at !== 'number' ||
      !item.intent || typeof item.intent.entity !== 'string' || typeof item.intent.op !== 'string'
    )) throw new Error('invalid outbox');
    return parsed as OutboxItem[];
  } catch {
    // Never overwrite a damaged queue with [] — it may be the only copy of an
    // unsynced clinical note. Preserve the raw value for recovery.
    throw new Error('Bekleyen klinik kayıtlar bu cihazda okunamadı. Tarayıcı verilerini silmeyin; yöneticinizle görüşün.');
  }
}

function writeOutboxFor(ctx: CloudContext, items: OutboxItem[]): void {
  try {
    const key = scopedKey(ctx, OUTBOX_SUFFIX);
    if (items.length) localStorage.setItem(key, JSON.stringify(items));
    else localStorage.removeItem(key);
  } catch {
    // In particular, do not silently truncate to 200 entries or claim a
    // non-persisted write is safely queued when localStorage is full.
    throw new Error('Bekleyen kayıt bu cihaza yazılamadı. Alan açın; tarayıcı verilerini silmeyin.');
  }
  if (context === ctx) setState({ pending: items.length });
}

async function execute(intent: WriteIntent, writePort: CloudPort, writeContext: CloudContext): Promise<void> {
  const id = (localId: string) => toCloudIdFor(writeContext, localId);
  switch (intent.entity) {
    case 'client':
      if (intent.op === 'upsert') await repo.pushClient(writePort, writeContext, intent.value);
      else await repo.removeClient(writePort, id(intent.value));
      return;
    case 'appointment':
      if (intent.op === 'upsert') await repo.pushAppointment(writePort, writeContext, intent.value);
      else await repo.removeAppointment(writePort, id(intent.value));
      return;
    case 'session':
      if (intent.op === 'upsert') await repo.pushSession(writePort, writeContext, intent.value);
      else await repo.removeSession(writePort, id(intent.value));
      return;
    case 'bdi':
    case 'bai':
    case 'scl90':
    case 'screening':
      if (intent.op === 'upsert') await repo.pushTest(writePort, writeContext, intent.entity, intent.value);
      else await repo.removeTest(writePort, id(intent.value));
      return;
    case 'report':
      if (intent.op === 'upsert') await repo.pushReport(writePort, writeContext, intent.value);
      else await repo.removeReport(writePort, id(intent.value));
      return;
    case 'note':
      if (intent.op === 'upsert') await repo.pushNote(writePort, writeContext, intent.value);
      else await repo.removeNote(writePort, id(intent.value));
      return;
    case 'task':
      if (intent.op === 'upsert') await repo.pushTask(writePort, writeContext, intent.value);
      else await repo.removeTask(writePort, id(intent.value));
      return;
    case 'document':
      if (intent.op === 'upsert') await repo.pushDocument(writePort, writeContext, intent.value);
      else await repo.removeDocument(writePort, writeContext, intent.value);
      return;
    case 'settings':
      await repo.pushSettings(writePort, writeContext, intent.value);
      return;
    case 'formulation':
      await repo.pushFormulation(writePort, writeContext, intent.value);
      return;
    case 'safety':
      await repo.pushSafetyPlan(writePort, writeContext, intent.value);
      return;
    case 'sign':
    case 'lock':
      await repo.markRecordStatus(
        writePort,
        intent.value.table,
        id(intent.value.id),
        intent.op === 'sign' ? 'signed' : 'locked',
        writeContext.userId,
        intent.op === 'lock' ? intent.value.signedAt : undefined,
      );
      return;
    default:
      return;
  }
}

/** Only known, user-actionable errors reach the UI; PostgREST codes/details stay internal. */
export function cloudErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (isNetworkError(error)) return 'Bağlantı yok. Bekleyen kayıtlar bu cihazda tutuluyor; tarayıcı verilerini silmeyin.';
  if (/Danışana ait belgeler sunucuda duruyor/i.test(message)) return 'Danışanın sunucuda belgeleri var. Önce belgeleri silin ve eşitlemeyi bekleyin; bekleyen istek korunuyor.';
  if (/23505|duplicate key|unique constraint/i.test(message)) return 'Bu dosya numarası veya kayıt başka bir kayıtla çakışıyor. Bekleyen veriler korunuyor.';
  if (/42501|permission denied|row-level security/i.test(message)) return 'Bu işlem için yetki yok. Bekleyen veriler korunuyor; yöneticinizle görüşün.';
  if (/kimlik eşlemesi|bekleyen klinik kayıtlar|bu cihaza yazılamadı|kurum atanmamış|bir ölçek uygulamasına ait/i.test(message)) return message;
  return 'Sunucu işlemi tamamlanamadı. Bekleyen kayıtlar korunuyor; yöneticinizle görüşün.';
}

// A write-ahead, *per-account* FIFO queue. Persist intent before sending: a
// tab closing during a POST must never erase the only copy of a clinical write.
const drains = new Map<string, Promise<number>>();
const drainOwners = new Map<string, CloudContext>();

/** Test ve akış geçişleri için: halen yürüyen istekler bitene kadar bekler. */
export async function whenIdle(): Promise<void> {
  while (drains.size) await Promise.allSettled([...drains.values()]);
}

export function queueWrite(intent: WriteIntent): Promise<void> {
  if (!context || !port) {
    if (!cloudWritesExpected()) return Promise.resolve(); // yerel geliştirme modu
    const error = new Error('Bulut oturumu hazır değil. Kayıt sunucuya gönderilmedi.');
    setState({ phase: 'error', lastError: error.message });
    // There is no authenticated owner for an unscoped outbox. Never assign it
    // to whichever user happens to log in next.
    throw error;
  }
  const writeContext = context;
  try {
    writeOutboxFor(writeContext, [
      ...readOutboxFor(writeContext),
      { id: crypto.randomUUID(), at: Date.now(), intent },
    ]);
  } catch (error) {
    setState({ phase: 'error', lastError: cloudErrorMessage(error) });
    throw error;
  }
  setState({ phase: 'saving', lastError: undefined });
  return flushOutbox().then(() => undefined).catch((error: unknown) => {
    if (context === writeContext) setState({ phase: 'error', lastError: cloudErrorMessage(error) });
  });
}

/**
 * A legacy unscoped queue has no authenticated owner. Leave it untouched for
 * manual recovery; importing it into the next login would leak A's records to B.
 */
export function adoptBaseOutbox(): number {
  return 0;
}

export function flushOutbox(): Promise<number> {
  const writeContext = context;
  const writePort = port;
  if (!writeContext || !writePort) return Promise.resolve(0);
  const key = scopedKey(writeContext, OUTBOX_SUFFIX);
  const running = drains.get(key);
  if (running) {
    // The same account may have logged out and back in while a request was
    // still finishing. Never use that old port/context for the new session.
    if (drainOwners.get(key) === writeContext) return running;
    return running.then(() => flushOutbox());
  }

  const task = (async () => {
    let sent = 0;
    while (context === writeContext && port === writePort) {
      const item = readOutboxFor(writeContext)[0];
      if (!item) return sent;
      try {
        await execute(item.intent, writePort, writeContext);
      } catch (error) {
        if (context === writeContext) {
          setState({
            phase: isNetworkError(error) ? 'offline' : 'error',
            pending: readOutboxFor(writeContext).length,
            lastError: cloudErrorMessage(error),
          });
        }
        // Stop on *any* failure. A later session/sign/lock must not run ahead
        // of its failed parent; all unprocessed items stay on disk in order.
        return sent;
      }
      // Re-read after await so a new user edit added during the request is
      // retained. Remove only the acknowledged item, never the whole batch.
      const remaining = readOutboxFor(writeContext).filter((next) => next.id !== item.id);
      writeOutboxFor(writeContext, remaining);
      sent += 1;
      if (context === writeContext) {
        setState({
          phase: remaining.length ? 'saving' : 'saved',
          lastSavedAt: new Date().toISOString(),
          lastError: undefined,
        });
      }
    }
    return sent;
  })();
  drains.set(key, task);
  drainOwners.set(key, writeContext);
  const onFinish = () => {
    if (drains.get(key) === task) {
      drains.delete(key);
      drainOwners.delete(key);
    }
    // A write could arrive just as the previous drain completed. Restart only
    // after a successful drain, never spin on a permanent RLS/network error.
    if (context === writeContext && port === writePort && state.phase === 'saving') {
      try {
        if (readOutboxFor(writeContext).length) void flushOutbox().catch(() => {});
      } catch (error) {
        setState({ phase: 'error', lastError: cloudErrorMessage(error) });
      }
    }
  };
  void task.then(onFinish, onFinish);
  return task;
}

/* ------------------------------------------------------------------ yaşam döngüsü */

export function isCloudConfigured(): boolean {
  return supabaseConfig.configured && supabase !== null;
}

/** Bulut yazımı bekleniyor mu? (yapılandırma ya da bu oturumda bağlanmış bulut) */
export function cloudWritesExpected(): boolean {
  return cloudExpected || isCloudConfigured();
}

export function canUseCloud(user: AuthenticatedUser | null): boolean {
  return Boolean(user && user.organizationId && isCloudConfigured());
}

export async function activateCloud(user: AuthenticatedUser): Promise<repo.ClinicalSnapshot> {
  const client = supabase;
  if (!user.organizationId || !isCloudConfigured() || !client) {
    // Even an invalid new login must invalidate the previous user's async hydration.
    context = null;
    port = null;
    idMap = null;
    if (!user.organizationId) {
      setState({ cloud: true, userId: user.id, hydrated: false, phase: 'error', lastError: 'Hesabınıza kurum atanmamış. Yöneticinizle iletişime geçin.' });
      throw new Error('Hesabınıza kurum atanmamış.');
    }
    setState({ cloud: false, userId: undefined, hydrated: false, phase: 'inactive' });
    throw new Error('Bulut yapılandırılmamış.');
  }
  idMap = null;
  idMapScope = null;
  cloudExpected = true;
  const nextContext: CloudContext = {
    userId: user.id,
    organizationId: user.organizationId,
    resolveId: (id) => toCloudIdFor(nextContext, id),
  };
  const nextPort = createSupabasePort(client);
  context = nextContext;
  port = nextPort;
  setState({ cloud: true, userId: user.id, hydrated: false, phase: 'loading', lastError: undefined, pending: readOutboxFor(nextContext).length });
  try {
    const loaded = await repo.loadSnapshot(nextPort, nextContext);
    // A logout or a different login may have invalidated this request while it was in flight.
    if (context !== nextContext) throw new Error('Bulut oturumu değişti.');
    const snapshot = remapSnapshotIds(loaded);
    setState({ phase: 'ready' });
    return snapshot;
  } catch (error) {
    if (context === nextContext) failCloudHydration(error);
    throw error;
  }
}

export function deactivateCloud(): void {
  purgeScopedCache();
  idMap = null;
  idMapScope = null;
  context = null;
  port = null;
  state = { cloud: false, phase: 'inactive', hydrated: false, pending: 0 };
  emit();
}

/** Test/ileri düzey kullanım: port ve bağlamı doğrudan bağlar. */
export function bindCloud(nextContext: CloudContext, nextPort: CloudPort): void {
  cloudExpected = true;
  // Capture the identity in the resolver. A late A request must never use B's
  // UUID map simply because B became the active user while the POST was in flight.
  const boundContext: CloudContext = {
    ...nextContext,
    resolveId: (id) => toCloudIdFor(boundContext, id),
  };
  idMap = null;
  idMapScope = null;
  context = boundContext;
  port = nextPort;
  setState({ cloud: true, userId: boundContext.userId, hydrated: true, phase: 'ready', pending: readOutboxFor(boundContext).length });
}

export function unbindCloud(): void {
  context = null;
  port = null;
  setState({ cloud: false, userId: undefined, hydrated: false, phase: 'inactive' });
}
