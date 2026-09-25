/**
 * Görev, not, belge, ayar, denetim, tarama, formülasyon ve güvenlik planı.
 * Klinik store ile aynı cihaz-içi katman.
 */
import type { CaseFormulation, SafetyPlan } from './casework';
import type { RapidScreeningResult } from './rapidScreening';
import { isSafeDocumentUrl, isSafeImageUrl, reportStorageError } from './recordRules';
import { push as pushCloud, pushNow, remove as removeCloud } from './cloud/sync';
import {
  rowToDocument,
  rowToFormulation,
  rowToNote,
  rowToSafetyPlan,
  rowToTask,
  rowToTestRecord,
} from './cloud/mapping';
import type {
  DocumentRow,
  FormulationRow,
  NoteRow,
  SafetyPlanRow,
  TaskRow,
  TestAdministrationRow,
  TestResultRow,
} from './cloud/types';

export type PracticeNote = {
  id: string;
  clientId: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export type PracticeTask = {
  id: string;
  clientId?: string;
  clientName?: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
};

export type PracticeDocument = {
  id: string;
  clientId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  description?: string;
  /** Device copy, used when the cloud bucket is not configured. */
  dataUrl?: string;
  /** Object path inside the private `client-documents` bucket, when synced. */
  filePath?: string;
  createdAt: string;
};

export type PracticeSettings = {
  evaluatorName: string;
  title: string;
  clinicName: string;
  phone: string;
  email: string;
  address: string;
  letterhead: string;
  defaultFee: number;
  logoDataUrl?: string;
  signatureDataUrl?: string;
};

export type AuditEvent = {
  id: string;
  at: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
};

export type PracticeBundle = {
  notes: PracticeNote[];
  tasks: PracticeTask[];
  documents: PracticeDocument[];
  screenings: RapidScreeningResult[];
  formulations: CaseFormulation[];
  safetyPlans: SafetyPlan[];
  settings: PracticeSettings;
  audit: AuditEvent[];
};

export const ALLOWED_DOCUMENT_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
] as const;

/** Yerel kasa sınırı. Bulut kovası (50MB, imzalı URL) supabase migration'ındadır. */
export const MAX_LOCAL_DOCUMENT_BYTES = 1_500_000;
export const MAX_BRAND_ASSET_BYTES = 1_000_000;

const NOTES_KEY = 'psikolog_notes_v2';
const TASKS_KEY = 'psikolog_tasks_v2';
const DOCS_KEY = 'psikolog_documents_v2';
const SETTINGS_KEY = 'psikolog_settings_v2';
const AUDIT_KEY = 'psikolog_audit_v2';
const SCREEN_KEY = 'psikolog_screenings_v2';
const FORM_KEY = 'psikolog_formulations_v2';
const SAFETY_KEY = 'psikolog_safety_v2';

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const fn of listeners) {
    try {
      fn();
    } catch (error) {
      console.error('Practice listener error:', error);
    }
  }
}

export function subscribePracticeStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notify();
  } catch (error) {
    reportStorageError();
    throw new Error('Kayıt bu cihaza yazılamadı. Depo dolu olabilir. Önce yedek indirin.');
  }
}

export const DEFAULT_SETTINGS: PracticeSettings = {
  evaluatorName: 'Uzm. Psk. Halil Karaduman',
  title: 'Uzman Klinik Psikolog',
  clinicName: 'Halil Karaduman Psikoloji',
  phone: '',
  email: 'contact@halilkaraduman.com.tr',
  address: '',
  letterhead: 'Klinik psikolojik değerlendirme ve psikoterapi süreç kaydı. Bu belge tanı koymaz; klinik karar uygulayıcı uzmana aittir.',
  defaultFee: 0,
};

const AUDIT_ACTIONS: Record<string, string> = {
  save: 'Kaydetme',
  delete: 'Silme',
  import: 'Geri yükleme',
  kaydetme: 'Kaydetme',
  silme: 'Silme',
};

const AUDIT_ENTITIES: Record<string, string> = {
  client: 'Danışan',
  note: 'Not',
  task: 'Görev',
  document: 'Belge',
  settings: 'Ayar',
  screening: 'Tarama',
  formulation: 'Formülasyon',
  safety: 'Güvenlik planı',
  backup: 'Yedek',
  danışan: 'Danışan',
};

export function auditActionLabel(value: string): string {
  return AUDIT_ACTIONS[value] ?? value;
}

export function auditEntityLabel(value: string): string {
  return AUDIT_ENTITIES[value] ?? value;
}

export function recordAudit(input: { action: string; entity: string; entityId: string; summary: string }): void {
  const list = read<AuditEvent[]>(AUDIT_KEY, []);
  const event: AuditEvent = {
    id: newId('aud'),
    at: new Date().toISOString(),
    action: auditActionLabel(input.action).slice(0, 40),
    entity: auditEntityLabel(input.entity).slice(0, 40),
    entityId: input.entityId.slice(0, 80),
    summary: input.summary.slice(0, 240),
  };
  write(AUDIT_KEY, [event, ...list].slice(0, 200));
}

export function getAuditLog(): AuditEvent[] {
  return read<AuditEvent[]>(AUDIT_KEY, []);
}

export function getNotes(): PracticeNote[] {
  return read<PracticeNote[]>(NOTES_KEY, []);
}

export function getNotesByClient(clientId: string): PracticeNote[] {
  return getNotes()
    .filter((note) => note.clientId === clientId)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
}

export function saveNote(note: PracticeNote): void {
  const list = getNotes().filter((item) => item.id !== note.id);
  write(NOTES_KEY, [note, ...list]);
  recordAudit({ action: 'save', entity: 'note', entityId: note.id, summary: 'Klinik not kaydedildi' });
  if (note.clientId) pushCloud({ entity: 'note', record: note });
}

export function deleteNote(id: string): void {
  write(NOTES_KEY, getNotes().filter((note) => note.id !== id));
  recordAudit({ action: 'delete', entity: 'note', entityId: id, summary: 'Klinik not silindi' });
  removeCloud('note', id);
}

export function getTasks(): PracticeTask[] {
  return read<PracticeTask[]>(TASKS_KEY, []);
}

export function saveTask(task: PracticeTask): void {
  const list = getTasks().filter((item) => item.id !== task.id);
  write(TASKS_KEY, [task, ...list]);
  recordAudit({ action: 'save', entity: 'task', entityId: task.id, summary: task.title });
  pushCloud({ entity: 'task', record: task });
}

export function deleteTask(id: string): void {
  write(TASKS_KEY, getTasks().filter((task) => task.id !== id));
  recordAudit({ action: 'delete', entity: 'task', entityId: id, summary: 'Görev silindi' });
  removeCloud('task', id);
}

export function getDocuments(): PracticeDocument[] {
  return read<PracticeDocument[]>(DOCS_KEY, []);
}

export function getDocumentsByClient(clientId: string): PracticeDocument[] {
  return getDocuments().filter((doc) => doc.clientId === clientId);
}

export function saveDocument(doc: PracticeDocument): void {
  const list = getDocuments().filter((item) => item.id !== doc.id);
  write(DOCS_KEY, [doc, ...list]);
  recordAudit({ action: 'save', entity: 'document', entityId: doc.id, summary: doc.fileName });
  if (doc.clientId) pushCloud({ entity: 'document', record: doc });
}

export function deleteDocument(id: string): void {
  const target = getDocuments().find((doc) => doc.id === id);
  write(DOCS_KEY, getDocuments().filter((doc) => doc.id !== id));
  recordAudit({ action: 'delete', entity: 'document', entityId: id, summary: 'Belge silindi' });
  if (target) removeCloud('document', id, target);
}

export function getSettings(): PracticeSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<PracticeSettings>>(SETTINGS_KEY, {}) };
}

export function saveSettings(settings: PracticeSettings): void {
  write(SETTINGS_KEY, settings);
  recordAudit({ action: 'save', entity: 'settings', entityId: 'practice', summary: 'Antet ve uygulama ayarları güncellendi' });
}

export function getScreenings(): RapidScreeningResult[] {
  return read<RapidScreeningResult[]>(SCREEN_KEY, []);
}

export function saveScreening(result: RapidScreeningResult): void {
  const list = getScreenings().filter((item) => item.id !== result.id);
  write(SCREEN_KEY, [result, ...list]);
  if (result.clientId) {
    pushCloud({ entity: 'test', record: { kind: result.type, ...result } });
  }
  recordAudit({
    action: 'save',
    entity: 'screening',
    entityId: result.id,
    summary: `${result.type.toUpperCase()} ${result.totalScore} · ${result.clientName}`,
  });
}

export function deleteScreening(id: string): void {
  write(SCREEN_KEY, getScreenings().filter((item) => item.id !== id));
  removeCloud('test', id);
}

export function getFormulations(): CaseFormulation[] {
  return read<CaseFormulation[]>(FORM_KEY, []);
}

export function getFormulation(clientId: string): CaseFormulation | undefined {
  return getFormulations().find((item) => item.clientId === clientId);
}

export function saveFormulation(item: CaseFormulation): void {
  const list = getFormulations().filter((row) => row.clientId !== item.clientId);
  const saved: CaseFormulation = { ...item, updatedAt: new Date().toISOString() };
  write(FORM_KEY, [saved, ...list]);
  // localStorage is the cache; the database is the source of truth.
  if (saved.clientId) pushCloud({ entity: 'formulation', record: saved });
  recordAudit({ action: 'save', entity: 'formulation', entityId: item.clientId, summary: 'Formülasyon güncellendi' });
}

export function getSafetyPlans(): SafetyPlan[] {
  return read<SafetyPlan[]>(SAFETY_KEY, []);
}

export function getSafetyPlan(clientId: string): SafetyPlan | undefined {
  return getSafetyPlans().find((item) => item.clientId === clientId);
}

export function saveSafetyPlan(item: SafetyPlan): void {
  const list = getSafetyPlans().filter((row) => row.clientId !== item.clientId);
  const saved: SafetyPlan = { ...item, updatedAt: new Date().toISOString() };
  write(SAFETY_KEY, [saved, ...list]);
  // A safety plan must not live only on this device.
  if (saved.clientId) pushCloud({ entity: 'safety', record: saved });
  recordAudit({ action: 'save', entity: 'safety', entityId: item.clientId, summary: 'Güvenlik planı güncellendi' });
}

export function exportPracticeData(): PracticeBundle {
  return {
    notes: getNotes(),
    tasks: getTasks(),
    documents: getDocuments().map((doc) => ({ ...doc, dataUrl: doc.dataUrl })),
    screenings: getScreenings(),
    formulations: getFormulations(),
    safetyPlans: getSafetyPlans(),
    settings: getSettings(),
    audit: getAuditLog(),
  };
}

export function purgeClientPractice(clientId: string): void {
  const all = clientId === '*';
  const keep = (id: string | undefined) => !all && id !== clientId;
  write(NOTES_KEY, getNotes().filter((item) => keep(item.clientId)));
  write(TASKS_KEY, getTasks().filter((item) => keep(item.clientId)));
  write(DOCS_KEY, getDocuments().filter((item) => keep(item.clientId)));
  write(SCREEN_KEY, getScreenings().filter((item) => keep(item.clientId)));
  write(FORM_KEY, getFormulations().filter((item) => keep(item.clientId)));
  write(SAFETY_KEY, getSafetyPlans().filter((item) => keep(item.clientId)));
}

export function importPracticeData(bundle: Partial<PracticeBundle> | null | undefined): void {
  if (!bundle || typeof bundle !== 'object') return;
  if (Array.isArray(bundle.notes)) {
    if (bundle.notes.length > 5000) throw new Error('Not listesi çok büyük.');
    write(NOTES_KEY, bundle.notes);
  }
  if (Array.isArray(bundle.tasks)) {
    if (bundle.tasks.length > 5000) throw new Error('Görev listesi çok büyük.');
    write(TASKS_KEY, bundle.tasks);
  }
  if (Array.isArray(bundle.documents)) {
    if (bundle.documents.length > 500) throw new Error('Belge listesi çok büyük.');
    for (const doc of bundle.documents) {
      if (doc.dataUrl && !isSafeDocumentUrl(doc.dataUrl)) throw new Error('Yedekte güvenli olmayan belge bağlantısı var.');
    }
    write(DOCS_KEY, bundle.documents);
  }
  if (Array.isArray(bundle.screenings)) write(SCREEN_KEY, bundle.screenings.slice(0, 5000));
  if (Array.isArray(bundle.formulations)) write(FORM_KEY, bundle.formulations.slice(0, 2000));
  if (Array.isArray(bundle.safetyPlans)) write(SAFETY_KEY, bundle.safetyPlans.slice(0, 2000));
  if (bundle.settings && typeof bundle.settings === 'object') {
    const { logoDataUrl, signatureDataUrl, ...rest } = bundle.settings;
    write(SETTINGS_KEY, {
      ...DEFAULT_SETTINGS,
      ...rest,
      logoDataUrl: isSafeImageUrl(logoDataUrl) ? logoDataUrl : undefined,
      signatureDataUrl: isSafeImageUrl(signatureDataUrl) ? signatureDataUrl : undefined,
    });
  }
  if (Array.isArray(bundle.audit)) write(AUDIT_KEY, bundle.audit.slice(0, 200));
  recordAudit({ action: 'import', entity: 'backup', entityId: 'practice', summary: 'Uygulama verisi yedekten yüklendi' });
}

/* ==========================================================================
   Cloud id upgrade — yerel kısa id'leri uuid'ye çevirirken referansları koru
   ========================================================================== */

/**
 * Rewrite every `clientId` reference (and each record's own id) through the
 * supplied maps. Called once, before the first cloud write, so no local record
 * is orphaned when client ids become uuids.
 */
export function upgradePracticeIds(maps: {
  clients: Map<string, string>;
  notes: Map<string, string>;
  tasks: Map<string, string>;
  documents: Map<string, string>;
  screenings: Map<string, string>;
}): void {
  const resolve = (map: Map<string, string>, value: string | undefined) =>
    typeof value === 'string' ? map.get(value) ?? value : value;

  const touched =
    maps.clients.size + maps.notes.size + maps.tasks.size + maps.documents.size + maps.screenings.size;
  if (touched === 0) return;

  write(
    NOTES_KEY,
    getNotes().map((note) => ({
      ...note,
      id: resolve(maps.notes, note.id),
      clientId: resolve(maps.clients, note.clientId),
    })),
  );
  write(
    TASKS_KEY,
    getTasks().map((task) => ({
      ...task,
      id: resolve(maps.tasks, task.id),
      clientId: task.clientId ? resolve(maps.clients, task.clientId) : undefined,
    })),
  );
  write(
    DOCS_KEY,
    getDocuments().map((doc) => ({
      ...doc,
      id: resolve(maps.documents, doc.id),
      clientId: resolve(maps.clients, doc.clientId),
    })),
  );
  write(
    SCREEN_KEY,
    getScreenings().map((item) => ({
      ...item,
      id: resolve(maps.screenings, item.id),
      clientId: item.clientId ? resolve(maps.clients, item.clientId) : undefined,
    })),
  );
  write(
    FORM_KEY,
    getFormulations().map((item) => ({ ...item, clientId: resolve(maps.clients, item.clientId) })),
  );
  write(
    SAFETY_KEY,
    getSafetyPlans().map((item) => ({ ...item, clientId: resolve(maps.clients, item.clientId) })),
  );
}

/* ==========================================================================
   BULUT ANLIK GÖRÜNTÜSÜ — notlar, görevler, belgeler, kısa taramalar
   ========================================================================== */

function mergeById<T extends { id: string }>(local: T[], incoming: T[]): T[] {
  const byId = new Map(local.map((row) => [row.id, row]));
  for (const row of incoming) byId.set(row.id, { ...byId.get(row.id), ...row } as T);
  return [...byId.values()];
}

export type PracticeCloudSnapshot = {
  documents: DocumentRow[];
  notes: NoteRow[];
  tasks: TaskRow[];
  screenings: { administration: TestAdministrationRow; result: TestResultRow }[];
  formulations: FormulationRow[];
  safetyPlans: SafetyPlanRow[];
};

/**
 * Formulation and safety plan are keyed by client, not by an id of their own,
 * so they merge on `clientId` — same union semantics as `mergeById`.
 */
function mergeByClientId<T extends { clientId: string }>(local: T[], incoming: T[]): T[] {
  const byClient = new Map(local.map((row) => [row.clientId, row]));
  for (const row of incoming) byClient.set(row.clientId, { ...byClient.get(row.clientId), ...row } as T);
  return [...byClient.values()];
}

export function applyCloudPracticeSnapshot(snapshot: PracticeCloudSnapshot): void {
  const localDocs = getDocuments();
  write(
    DOCS_KEY,
    mergeById(
      localDocs,
      // The device copy (dataUrl) is kept; the bucket path comes from the row.
      snapshot.documents.map((row) => rowToDocument(row, localDocs.find((item) => item.id === row.id))),
    ),
  );
  write(NOTES_KEY, mergeById(getNotes(), snapshot.notes.map((row) => rowToNote(row))));
  write(
    TASKS_KEY,
    mergeById(
      getTasks(),
      snapshot.tasks.map((row) => rowToTask(row, getTasks().find((item) => item.id === row.id))),
    ),
  );
  write(
    SCREEN_KEY,
    mergeById(
      getScreenings(),
      snapshot.screenings.map(({ administration, result }) =>
        rowToTestRecord<RapidScreeningResult>(result, administration),
      ),
    ),
  );
  write(
    FORM_KEY,
    mergeByClientId(getFormulations(), snapshot.formulations.map((row) => rowToFormulation(row))),
  );
  write(
    SAFETY_KEY,
    mergeByClientId(getSafetyPlans(), snapshot.safetyPlans.map((row) => rowToSafetyPlan(row))),
  );
}

/** Push local practice records the cloud has not seen yet (offline backlog). */
/** Awaited on purpose: the bootstrap must finish writing before it pulls. */
export async function pushLocalPracticeRecordsToCloud(): Promise<void> {
  for (const note of getNotes()) {
    if (note.clientId) await pushNow({ entity: 'note', record: note });
  }
  for (const task of getTasks()) await pushNow({ entity: 'task', record: task });
  for (const doc of getDocuments()) {
    if (doc.clientId) await pushNow({ entity: 'document', record: doc });
  }
  for (const screening of getScreenings()) {
    if (screening.clientId) await pushNow({ entity: 'test', record: { kind: screening.type, ...screening } });
  }
  for (const formulation of getFormulations()) {
    if (formulation.clientId) await pushNow({ entity: 'formulation', record: formulation });
  }
  for (const plan of getSafetyPlans()) {
    if (plan.clientId) await pushNow({ entity: 'safety', record: plan });
  }
}
