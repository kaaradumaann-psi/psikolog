/**
 * Depo kapsamı (storage scope).
 *
 * Neden var: klinik kayıtlar bu cihazda tutulur. Kapsam olmasaydı aynı
 * tarayıcıda iki ayrı hesap (veya hesaptan çıkan bir uzman) birbirinin
 * danışan dosyasını görürdü. Buradaki tek doğruluk kaynağı, o an oturum
 * açmış hesaptır; kapsam hesap id'si ile bağlanır.
 *
 * Kurallar:
 * - Bağlı kapsam yoksa (henüz oturum yok / çıkış yapıldı) gerçek kasa okunmaz
 *   ve yazılmaz; boş küme döner.
 * - Kapsam değişince aboneler uyarılır, böylece ekrandaki eski veri tutulmaz.
 * - Eski (kapsamsız) anahtarlar yalnızca bir kez, ilk kapsam bağlandığında
 *   taşınır; kullanıcı yedeğini kaybetmez.
 */

export const UNBOUND_SCOPE = null;

const SCOPE_PREFIX = 'psikolog:u';
const LEGACY_KEYS: Record<string, string> = {
  clients: 'psikolog_clients_v2',
  sessions: 'psikolog_sessions_v2',
  appointments: 'psikolog_appointments_v2',
  bdi: 'psikolog_bdi_tests_v2',
  bai: 'psikolog_bai_tests_v2',
  scl90: 'psikolog_scl90_tests_v2',
  reports: 'psikolog_reports_v2',
  notes: 'psikolog_notes_v2',
  tasks: 'psikolog_tasks_v2',
  documents: 'psikolog_documents_v2',
  settings: 'psikolog_settings_v2',
  audit: 'psikolog_audit_v2',
  screenings: 'psikolog_screenings_v2',
  formulations: 'psikolog_formulations_v2',
  safety: 'psikolog_safety_v2',
};

export type PlannedWrite = [name: string, value: string];

let scope: string | null = UNBOUND_SCOPE;
const listeners = new Set<() => void>();

function safeStorage(): Storage | null {
  try {
    const candidate = (globalThis as { localStorage?: Storage }).localStorage;
    if (candidate && typeof candidate.getItem === 'function' && typeof candidate.setItem === 'function') return candidate;
  } catch {
    /* private mode'da erişim throw edebilir */
  }
  return null;
}

function scopeTag(value: string): string {
  // Kapsam etiketi dosya adı gibi davranır: anahtar ayracı olamaz.
  return value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'local';
}

export function currentScope(): string | null {
  return scope;
}

export function isStorageBound(): boolean {
  return scope !== UNBOUND_SCOPE;
}

export function scopedKey(name: keyof typeof LEGACY_KEYS | string): string {
  if (scope === UNBOUND_SCOPE) return `${SCOPE_PREFIX}:__unbound__:${name}`;
  return `${SCOPE_PREFIX}:${scopeTag(scope)}:${name}`;
}

/** Eski kapsam-sız veri yalnızca ilk bağlanan kapsama taşınır. */
function migratedFlag(): string {
  return `${SCOPE_PREFIX}:${scopeTag(scope ?? 'unbound')}:migrated`;
}

function migrateLegacyKeys(storage: Storage): void {
  if (scope === UNBOUND_SCOPE) return;
  if (storage.getItem(migratedFlag())) return;
  for (const [name, legacyKey] of Object.entries(LEGACY_KEYS)) {
    const nextKey = scopedKey(name);
    if (storage.getItem(nextKey) !== null) continue;
    const legacy = storage.getItem(legacyKey);
    if (legacy === null) continue;
    try {
      storage.setItem(nextKey, legacy);
    } catch {
      /* kota doluysa eski kayıt yerinde kalır, kopyalanmaz */
    }
  }
  try {
    storage.setItem(migratedFlag(), '1');
  } catch {
    /* bayrak yazılamazsa bir sonraki açılışta tekrar denenir */
  }
}

export function configureStorageScope(nextScope: string | null): void {
  const normalized = nextScope ? scopeTag(nextScope) : UNBOUND_SCOPE;
  if (normalized === scope) return;
  scope = normalized;
  const storage = safeStorage();
  if (storage && scope !== UNBOUND_SCOPE) migrateLegacyKeys(storage);
  notifyScopeListeners();
}

export function onScopeChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyScopeListeners(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.error('Storage scope listener error:', error);
    }
  }
}

export function readScopedRaw(name: string): string | null {
  if (scope === UNBOUND_SCOPE) return null;
  const storage = safeStorage();
  return storage ? storage.getItem(scopedKey(name)) : null;
}

export function writeScopedRaw(name: string, value: string): void {
  if (scope === UNBOUND_SCOPE) {
    throw new Error('Oturum bağlı değil; kayıt yazılamaz.');
  }
  const storage = safeStorage();
  if (!storage) throw new Error('Bu cihazda kayıt alanı kullanılamıyor.');
  storage.setItem(scopedKey(name), value);
}

/**
 * Birden çok sekme aynı kasayı paylaşır. Bir sekmede yapılan kayıt diğer
 * sekmelerde bayat veri göstermesin diye `storage` olayı aboneye bildirilir.
 */
export function watchCrossTab(onExternalWrite: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return () => {};
  const handler = (event: StorageEvent) => {
    if (!event.key) return; // clear()
    if (!event.key.startsWith(`${SCOPE_PREFIX}:`)) return;
    if (scope !== UNBOUND_SCOPE && !event.key.startsWith(`${SCOPE_PREFIX}:${scopeTag(scope)}:`)) return;
    onExternalWrite();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

/**
 * Birden çok anahtarı ya hepsi ya hiçbiri yazılır.
 *
 * Yedek geri yüklemede anahtar anahtar yazmak, kota hatasında dosyanın
 * yarısını değişmiş bırakırdı. Bu fonksiyon önce eski değerleri alır,
 * hepsini yazar, hata olursa hepsini geri koyar.
 */
export function commitScopedWrites(entries: [name: string, value: string][]): void {
  const storage = safeStorage();
  if (!storage) throw new Error('Bu cihazda kayıt alanı kullanılamıyor.');
  if (scope === UNBOUND_SCOPE) throw new Error('Oturum bağlı değil; kayıt yazılamaz.');
  const written: { key: string; previous: string | null }[] = [];
  try {
    for (const [name, value] of entries) {
      const key = scopedKey(name);
      written.push({ key, previous: storage.getItem(key) });
      storage.setItem(key, value);
    }
  } catch (error) {
    for (const { key, previous } of written) {
      try {
        if (previous === null) storage.removeItem(key);
        else storage.setItem(key, previous);
      } catch {
        /* geri alma da başarısızsa mevcut değer bırakılır */
      }
    }
    throw error;
  }
}

export const LEGACY_KEY_NAMES = Object.keys(LEGACY_KEYS);
