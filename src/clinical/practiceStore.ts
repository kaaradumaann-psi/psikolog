/**
 * Görev, not, belge, ayar, denetim, tarama, formülasyon ve güvenlik planı.
 * Klinik store ile aynı cihaz-içi katman.
 */
import type { CaseFormulation, SafetyPlan } from './casework';
import type { RapidScreeningResult } from './rapidScreening';
import {
  commitScopedWrites,
  currentScope,
  onScopeChange,
  readScopedRaw,
  watchCrossTab,
  writeScopedRaw,
  type PlannedWrite,
} from './storageScope';
import { isSafeDocumentUrl, isSafeImageUrl, reportStorageError } from './recordRules';

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
  dataUrl?: string;
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
  /** Kaydı açan hesabın kapsamı. Cihazda kalır, dışarı gönderilmez. */
  actor?: string;
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

const NOTES_KEY = 'notes';
const TASKS_KEY = 'tasks';
const DOCS_KEY = 'documents';
const SETTINGS_KEY = 'settings';
const AUDIT_KEY = 'audit';
const SCREEN_KEY = 'screenings';
const FORM_KEY = 'formulations';
const SAFETY_KEY = 'safety';

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
    const raw = readScopedRaw(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    writeScopedRaw(key, JSON.stringify(value));
    notify();
  } catch {
    reportStorageError();
    throw new Error('Kayıt bu cihaza yazılamadı. Depo dolu olabilir. Önce yedek indirin.');
  }
}

export function notifyPracticeStore(): void {
  notify();
}

onScopeChange(() => notify());
watchCrossTab(() => notify());

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
  update: 'Güncelleme',
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
  session: 'Seans notu',
  appointment: 'Randevu',
  test: 'Ölçek sonucu',
  report: 'Rapor',
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
    actor: currentScope() ?? undefined,
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
}

export function deleteNote(id: string): void {
  write(NOTES_KEY, getNotes().filter((note) => note.id !== id));
  recordAudit({ action: 'delete', entity: 'note', entityId: id, summary: 'Klinik not silindi' });
}

export function getTasks(): PracticeTask[] {
  return read<PracticeTask[]>(TASKS_KEY, []);
}

export function saveTask(task: PracticeTask): void {
  const list = getTasks().filter((item) => item.id !== task.id);
  write(TASKS_KEY, [task, ...list]);
  recordAudit({ action: 'save', entity: 'task', entityId: task.id, summary: task.title });
}

export function deleteTask(id: string): void {
  write(TASKS_KEY, getTasks().filter((task) => task.id !== id));
  recordAudit({ action: 'delete', entity: 'task', entityId: id, summary: 'Görev silindi' });
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
}

export function deleteDocument(id: string): void {
  write(DOCS_KEY, getDocuments().filter((doc) => doc.id !== id));
  recordAudit({ action: 'delete', entity: 'document', entityId: id, summary: 'Belge silindi' });
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
  recordAudit({
    action: 'save',
    entity: 'screening',
    entityId: result.id,
    summary: `${result.type.toUpperCase()} ${result.totalScore} · ${result.clientName}`,
  });
}

export function deleteScreening(id: string): void {
  write(SCREEN_KEY, getScreenings().filter((item) => item.id !== id));
  recordAudit({ action: 'delete', entity: 'screening', entityId: id, summary: 'Tarama sonucu silindi' });
}

export function getFormulations(): CaseFormulation[] {
  return read<CaseFormulation[]>(FORM_KEY, []);
}

export function getFormulation(clientId: string): CaseFormulation | undefined {
  return getFormulations().find((item) => item.clientId === clientId);
}

export function saveFormulation(item: CaseFormulation): void {
  const list = getFormulations().filter((row) => row.clientId !== item.clientId);
  write(FORM_KEY, [{ ...item, updatedAt: new Date().toISOString() }, ...list]);
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
  write(SAFETY_KEY, [{ ...item, updatedAt: new Date().toISOString() }, ...list]);
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

/** Bir veya birkaç danışanın bağlı kayıtlarını tek yazım planına çevirir. */
export function planPracticePurge(clientIds: string | string[]): PlannedWrite[] {
  const ids = new Set(Array.isArray(clientIds) ? clientIds : [clientIds]);
  const all = ids.has('*');
  const keep = (id: string | undefined) => !all && !(id && ids.has(id));
  return [
    [NOTES_KEY, JSON.stringify(getNotes().filter((item) => keep(item.clientId)))],
    [TASKS_KEY, JSON.stringify(getTasks().filter((item) => keep(item.clientId)))],
    [DOCS_KEY, JSON.stringify(getDocuments().filter((item) => keep(item.clientId)))],
    [SCREEN_KEY, JSON.stringify(getScreenings().filter((item) => keep(item.clientId)))],
    [FORM_KEY, JSON.stringify(getFormulations().filter((item) => keep(item.clientId)))],
    [SAFETY_KEY, JSON.stringify(getSafetyPlans().filter((item) => keep(item.clientId)))],
  ];
}

/** Klinik kayıt temizliğiyle birlikte tek yazımda uygulanacak plan. */
export function planPracticeClear(): PlannedWrite[] {
  return [
    [NOTES_KEY, '[]'],
    [TASKS_KEY, '[]'],
    [DOCS_KEY, '[]'],
    [SCREEN_KEY, '[]'],
    [FORM_KEY, '[]'],
    [SAFETY_KEY, '[]'],
  ];
}

export function purgeClientPractice(clientIds: string | string[]): void {
  try {
    commitScopedWrites(planPracticePurge(clientIds));
  } catch {
    // Kasa yazılamıyorsa danışan silme yine de tamamlanır; uyarı store katmanında verilir.
    reportStorageError();
  }
  notify();
}

export function planPracticeImport(bundle: Partial<PracticeBundle> | null | undefined): PlannedWrite[] {
  const plan: PlannedWrite[] = [];
  if (!bundle || typeof bundle !== 'object') return plan;
  if (Array.isArray(bundle.notes)) {
    if (bundle.notes.length > 5000) throw new Error('Not listesi çok büyük.');
    for (const note of bundle.notes) {
      if (!note || typeof note.clientId !== 'string' || typeof note.content !== 'string') throw new Error('Not kaydı bozuk.');
    }
    plan.push([NOTES_KEY, JSON.stringify(bundle.notes)]);
  }
  if (Array.isArray(bundle.tasks)) {
    if (bundle.tasks.length > 5000) throw new Error('Görev listesi çok büyük.');
    for (const task of bundle.tasks) {
      if (!task || typeof task.title !== 'string' || !task.title.trim()) throw new Error('Görev kaydı bozuk.');
    }
    plan.push([TASKS_KEY, JSON.stringify(bundle.tasks)]);
  }
  if (Array.isArray(bundle.documents)) {
    if (bundle.documents.length > 500) throw new Error('Belge listesi çok büyük.');
    for (const doc of bundle.documents) {
      if (doc.dataUrl && !isSafeDocumentUrl(doc.dataUrl)) throw new Error('Yedekte güvenli olmayan belge bağlantısı var.');
    }
    plan.push([DOCS_KEY, JSON.stringify(bundle.documents)]);
  }
  if (Array.isArray(bundle.screenings)) plan.push([SCREEN_KEY, JSON.stringify(bundle.screenings.slice(0, 5000))]);
  if (Array.isArray(bundle.formulations)) plan.push([FORM_KEY, JSON.stringify(bundle.formulations.slice(0, 2000))]);
  if (Array.isArray(bundle.safetyPlans)) plan.push([SAFETY_KEY, JSON.stringify(bundle.safetyPlans.slice(0, 2000))]);
  if (bundle.settings && typeof bundle.settings === 'object') {
    const { logoDataUrl, signatureDataUrl, ...rest } = bundle.settings;
    plan.push([
      SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        ...rest,
        logoDataUrl: isSafeImageUrl(logoDataUrl) ? logoDataUrl : undefined,
        signatureDataUrl: isSafeImageUrl(signatureDataUrl) ? signatureDataUrl : undefined,
      }),
    ]);
  }
  if (Array.isArray(bundle.audit)) plan.push([AUDIT_KEY, JSON.stringify(bundle.audit.slice(0, 200))]);
  return plan;
}

export function importPracticeData(bundle: Partial<PracticeBundle> | null | undefined): void {
  const plan = planPracticeImport(bundle);
  if (!plan.length) return;
  commitScopedWrites(plan);
  notify();
  recordAudit({ action: 'import', entity: 'backup', entityId: 'practice', summary: 'Uygulama verisi yedekten yüklendi' });
}
