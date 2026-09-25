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
  phase: SyncPhase;
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

let idMap: Record<string, string> | null = null;

/**
 * Yerel (prefix'li) kimlikleri kalıcı UUID'ye çevirir. Böylece aynı kayıt
 * tekrar tekrar yazılsa da sunucuda ikinci bir satır oluşmaz (idempotent).
 */
export function toCloudId(localId: string): string {
  if (!localId || UUID_RE.test(localId)) return localId;
  if (!idMap) {
    try {
      const raw = localStorage.getItem(cacheKey(ID_MAP_SUFFIX));
      idMap = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      idMap = {};
    }
  }
  const existing = idMap[localId];
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  idMap[localId] = fresh;
  try {
    localStorage.setItem(cacheKey(ID_MAP_SUFFIX), JSON.stringify(idMap));
  } catch {
    /* kota doluysa eşleme bellekte kalır */
  }
  return fresh;
}
const CACHE_PREFIX = 'psikolog:';

let context: CloudContext | null = null;
let port: CloudPort | null = null;
/**
 * Bu oturumda bulut bekleniyor mu? (yapılandırma ya da daha önce bağlanmış
 * bulut oturumu). Aktivasyon tamamlanmadan yapılan yazımların sessizce
 * düşürülmemesi için kullanılır; yerel (bulutsuz) kurulumda false kalır.
 */
let cloudExpected = isCloudConfigured();
let state: SyncState = { cloud: false, phase: 'inactive', pending: 0 };
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
  if (!cloudId) return cloudId;
  if (!idMap) {
    try {
      const raw = localStorage.getItem(cacheKey(ID_MAP_SUFFIX));
      idMap = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      idMap = {};
    }
  }
  for (const [local, cloud] of Object.entries(idMap)) {
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
 * Oturum kapanışında kullanıcıya ait klinik cache/outbox temizlenir.
 * (Aynı tarayıcıda başka kullanıcı giriş yaptığında önceki veri görünmez.)
 */
export function purgeScopedCache(): void {
  if (typeof localStorage === 'undefined') return;
  const prefix = scopePrefix();
  if (!prefix) return;
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(prefix)) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
}

/* ------------------------------------------------------------------ outbox */

type OutboxItem = { id: string; at: number; intent: WriteIntent };

function readOutbox(): OutboxItem[] {
  try {
    const raw = localStorage.getItem(cacheKey(OUTBOX_SUFFIX));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOutbox(items: OutboxItem[]): void {
  try {
    localStorage.setItem(cacheKey(OUTBOX_SUFFIX), JSON.stringify(items.slice(-200)));
  } catch {
    /* kota doluysa kuyruk bellekte kalır */
  }
  setState({ pending: items.length });
}

async function execute(intent: WriteIntent): Promise<void> {
  if (!port || !context) return;
  switch (intent.entity) {
    case 'client':
      if (intent.op === 'upsert') await repo.pushClient(port, context, intent.value);
      else await repo.removeClient(port, toCloudId(intent.value));
      return;
    case 'appointment':
      if (intent.op === 'upsert') await repo.pushAppointment(port, context, intent.value);
      else await repo.removeAppointment(port, toCloudId(intent.value));
      return;
    case 'session':
      if (intent.op === 'upsert') await repo.pushSession(port, context, intent.value);
      else await repo.removeSession(port, toCloudId(intent.value));
      return;
    case 'bdi':
    case 'bai':
    case 'scl90':
    case 'screening':
      if (intent.op === 'upsert') await repo.pushTest(port, context, intent.entity, intent.value);
      else await repo.removeTest(port, toCloudId(intent.value));
      return;
    case 'report':
      if (intent.op === 'upsert') await repo.pushReport(port, context, intent.value);
      else await repo.removeReport(port, toCloudId(intent.value));
      return;
    case 'note':
      if (intent.op === 'upsert') await repo.pushNote(port, context, intent.value);
      else await repo.removeNote(port, toCloudId(intent.value));
      return;
    case 'task':
      if (intent.op === 'upsert') await repo.pushTask(port, context, intent.value);
      else await repo.removeTask(port, toCloudId(intent.value));
      return;
    case 'document':
      if (intent.op === 'upsert') await repo.pushDocument(port, context, intent.value);
      else await repo.removeDocument(port, context, intent.value);
      return;
    case 'settings':
      await repo.pushSettings(port, context, intent.value);
      return;
    case 'formulation':
      await repo.pushFormulation(port, context, intent.value);
      return;
    case 'safety':
      await repo.pushSafetyPlan(port, context, intent.value);
      return;
    case 'sign':
    case 'lock':
      await repo.markRecordStatus(
        port,
        intent.value.table,
        toCloudId(intent.value.id),
        intent.op === 'sign' ? 'signed' : 'locked',
        context.userId,
        intent.op === 'lock' ? intent.value.signedAt : undefined,
      );
      return;
    default:
      return;
  }
}

/**
 * Yazma isteği: bulut aktifse hemen gönderilir; ağ hatasında kuyruğa alınır.
 * Bulut yazımı başarısızsa UI'a "kaydedildi" bildirilmez (phase: error/offline).
 */
const inFlight = new Set<Promise<void>>();

/** Test ve akış geçişleri için: bekleyen bulut yazımları bitene kadar bekler. */
export async function whenIdle(): Promise<void> {
  while (inFlight.size) {
    await Promise.allSettled([...inFlight]);
  }
}

export function queueWrite(intent: WriteIntent): Promise<void> {
  if (!port || !context) {
    // Bulut bağlamı henüz hazır değil (aktivasyon sürüyor ya da oturum yeni
    // kuruldu). Yazımı sessizce düşürmek veri kaybı olurdu: kuyruğa alınır ve
    // aktivasyon tamamlanınca `adoptBaseOutbox()` ile kapsamlı kuyruğa taşınır.
    if (!cloudWritesExpected()) return Promise.resolve();
    const items = readOutbox();
    items.push({ id: crypto.randomUUID(), at: Date.now(), intent });
    writeOutbox(items);
    setState({ phase: 'saving', lastError: undefined });
    return Promise.resolve();
  }
  setState({ phase: 'saving', lastError: undefined });
  const task = execute(intent)
    .then(() => {
      setState({ phase: 'saved', lastSavedAt: new Date().toISOString(), pending: readOutbox().length });
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Bulut kaydı başarısız';
      if (isNetworkError(error)) {
        const items = readOutbox();
        items.push({ id: crypto.randomUUID(), at: Date.now(), intent });
        writeOutbox(items);
        setState({ phase: 'offline', lastError: 'Bağlantı yok — kayıt kuyruğa alındı.' });
      } else {
        setState({ phase: 'error', lastError: message });
      }
    })
    .finally(() => {
      inFlight.delete(task);
    });
  inFlight.add(task);
  return task;
}

/**
 * Bağlam kurulmadan (aktivasyon sürerken) kuyruğa alınan yazımları kapsamlı
 * kuyruğa taşır. `cacheKey` bağlama göre değiştiği için bu adım olmadan o
 * kayıtlar hiçbir zaman gönderilmez (sessiz veri kaybı).
 */
export function adoptBaseOutbox(): number {
  if (typeof localStorage === 'undefined' || !context) return 0;
  let base: OutboxItem[] = [];
  try {
    const raw = localStorage.getItem(OUTBOX_SUFFIX);
    const parsed = raw ? (JSON.parse(raw) as OutboxItem[]) : [];
    base = Array.isArray(parsed) ? parsed : [];
  } catch {
    base = [];
  }
  if (!base.length) return 0;
  writeOutbox([...readOutbox(), ...base]);
  try {
    localStorage.removeItem(OUTBOX_SUFFIX);
  } catch {
    /* kota doluysa kapsamsız kuyruk kalır; sonraki aktivasyonda yeniden denenir */
  }
  return base.length;
}

export async function flushOutbox(): Promise<number> {
  const items = readOutbox();
  if (!items.length) return 0;
  let sent = 0;
  const remaining: OutboxItem[] = [];
  for (const item of items) {
    try {
      await execute(item.intent);
      sent += 1;
    } catch (error) {
      remaining.push(item);
      if (isNetworkError(error)) break;
    }
  }
  writeOutbox(remaining);
  setState({ phase: remaining.length ? 'offline' : 'saved', lastSavedAt: new Date().toISOString() });
  return sent;
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
  if (!user.organizationId) {
    setState({ cloud: true, phase: 'error', lastError: 'Hesabınıza kurum atanmamış. Yöneticinizle iletişime geçin.' });
    throw new Error('Hesabınıza kurum atanmamış.');
  }
  if (!isCloudConfigured() || !client) {
    setState({ cloud: false, phase: 'inactive' });
    throw new Error('Bulut yapılandırılmamış.');
  }
  idMap = null;
  cloudExpected = true;
  context = { userId: user.id, organizationId: user.organizationId, resolveId: toCloudId };
  port = createSupabasePort(client as never);
  setState({ cloud: true, phase: 'loading', lastError: undefined, pending: readOutbox().length });
  try {
    const snapshot = remapSnapshotIds(await repo.loadSnapshot(port, context));
    setState({ phase: 'ready' });
    return snapshot;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Klinik veri yüklenemedi';
    setState({ phase: 'error', lastError: message });
    throw error;
  }
}

export function deactivateCloud(): void {
  purgeScopedCache();
  idMap = null;
  context = null;
  port = null;
  state = { cloud: false, phase: 'inactive', pending: 0 };
  emit();
}

/** Test/ileri düzey kullanım: port ve bağlamı doğrudan bağlar. */
export function bindCloud(nextContext: CloudContext, nextPort: CloudPort): void {
  cloudExpected = true;
  context = nextContext;
  port = nextPort;
  setState({ cloud: true, phase: 'ready' });
}

export function unbindCloud(): void {
  context = null;
  port = null;
  setState({ cloud: false, phase: 'inactive' });
}
