/**
 * Görev, not, belge, ayar, denetim, tarama, formülasyon ve güvenlik planı.
 * Klinik store ile aynı cihaz-içi katman.
 */
import type { CaseFormulation, SafetyPlan } from './casework';
import type { RapidScreeningResult } from './rapidScreening';
import { isSafeDocumentUrl, isSafeImageUrl, reportStorageError } from './recordRules';
import { cacheKey, cloudContext, queueWrite, syncPort } from './cloud/sync';
import { signedDocumentUrl, type ClinicalSnapshot } from './cloud/repository';
import { supabaseConfig } from '../auth/supabaseClient';

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
  /** Yerel önizleme (cloud modunda yalnız küçük dosyalar/kapak) */
  dataUrl?: string;
  /** Supabase Storage yolu: <org>/<client>/<dosya> */
  storagePath?: string;
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
    const raw = localStorage.getItem(cacheKey(key));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(cacheKey(key), JSON.stringify(value));
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
  queueWrite({ entity: 'note', op: 'upsert', value: note });
  write(NOTES_KEY, [note, ...list]);
  recordAudit({ action: 'save', entity: 'note', entityId: note.id, summary: 'Klinik not kaydedildi' });
}

export function deleteNote(id: string): void {
  queueWrite({ entity: 'note', op: 'delete', value: id });
  write(NOTES_KEY, getNotes().filter((note) => note.id !== id));
  recordAudit({ action: 'delete', entity: 'note', entityId: id, summary: 'Klinik not silindi' });
}

export function getTasks(): PracticeTask[] {
  return read<PracticeTask[]>(TASKS_KEY, []);
}

export function saveTask(task: PracticeTask): void {
  const list = getTasks().filter((item) => item.id !== task.id);
  queueWrite({ entity: 'task', op: 'upsert', value: task });
  write(TASKS_KEY, [task, ...list]);
  recordAudit({ action: 'save', entity: 'task', entityId: task.id, summary: task.title });
}

export function deleteTask(id: string): void {
  queueWrite({ entity: 'task', op: 'delete', value: id });
  write(TASKS_KEY, getTasks().filter((task) => task.id !== id));
  recordAudit({ action: 'delete', entity: 'task', entityId: id, summary: 'Görev silindi' });
}

export function getDocuments(): PracticeDocument[] {
  return read<PracticeDocument[]>(DOCS_KEY, []);
}

export function getDocumentsByClient(clientId: string): PracticeDocument[] {
  return getDocuments().filter((doc) => doc.clientId === clientId);
}

/** Private Storage link is requested only on click; never cached as a clinical record. */
export async function documentDownloadUrl(doc: PracticeDocument): Promise<string> {
  if (isSafeDocumentUrl(doc.dataUrl)) return doc.dataUrl!;
  const ctx = cloudContext();
  const port = syncPort();
  if (!ctx || !port || !supabaseConfig.configured) throw new Error('Belge bu cihazda bulunamadı.');
  const url = await signedDocumentUrl(port, ctx, doc);
  const parsed = new URL(url);
  if (parsed.origin !== new URL(supabaseConfig.url).origin ||
      !parsed.pathname.startsWith('/storage/v1/object/sign/client-documents/') ||
      !parsed.searchParams.has('token')) {
    throw new Error('Güvenli belge bağlantısı doğrulanamadı.');
  }
  return url;
}

export function saveDocument(doc: PracticeDocument): void {
  const list = getDocuments().filter((item) => item.id !== doc.id);
  queueWrite({ entity: 'document', op: 'upsert', value: doc });
  write(DOCS_KEY, [doc, ...list]);
  recordAudit({ action: 'save', entity: 'document', entityId: doc.id, summary: doc.fileName });
}

export function deleteDocument(id: string): void {
  const removed = getDocuments().find((doc) => doc.id === id);
  if (removed) queueWrite({ entity: 'document', op: 'delete', value: removed });
  write(DOCS_KEY, getDocuments().filter((doc) => doc.id !== id));
  recordAudit({ action: 'delete', entity: 'document', entityId: id, summary: 'Belge silindi' });
}

export function getSettings(): PracticeSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<PracticeSettings>>(SETTINGS_KEY, {}) };
}

export function saveSettings(settings: PracticeSettings): void {
  queueWrite({ entity: 'settings', op: 'upsert', value: settings });
  write(SETTINGS_KEY, settings);
  recordAudit({ action: 'save', entity: 'settings', entityId: 'practice', summary: 'Antet ve uygulama ayarları güncellendi' });
}

export function getScreenings(): RapidScreeningResult[] {
  return read<RapidScreeningResult[]>(SCREEN_KEY, []);
}

export function saveScreening(result: RapidScreeningResult): void {
  if (cloudContext() && !result.clientId) {
    throw new Error('Buluta kaydetmek için kayıtlı danışan dosyası seçin.');
  }
  const list = getScreenings().filter((item) => item.id !== result.id);
  queueWrite({ entity: 'screening', op: 'upsert', value: result });
  write(SCREEN_KEY, [result, ...list]);
  recordAudit({
    action: 'save',
    entity: 'screening',
    entityId: result.id,
    summary: `${result.type.toUpperCase()} ${result.totalScore} · ${result.clientName}`,
  });
}

export function deleteScreening(id: string): void {
  queueWrite({ entity: 'screening', op: 'delete', value: id });
  write(SCREEN_KEY, getScreenings().filter((item) => item.id !== id));
}

export function getFormulations(): CaseFormulation[] {
  return read<CaseFormulation[]>(FORM_KEY, []);
}

export function getFormulation(clientId: string): CaseFormulation | undefined {
  return getFormulations().find((item) => item.clientId === clientId && !item.supersededBy);
}

export function saveFormulation(item: CaseFormulation): void {
  const records = getFormulations();
  const existing = records.find((row) => row.clientId === item.clientId && !row.supersededBy);
  if (existing?.status === 'locked') {
    throw new Error('Kilitli formülasyon değiştirilemez. Düzeltme için yeni revizyon oluşturun.');
  }
  if (existing?.status === 'signed' && item.status !== 'signed') throw new Error('İmzalı kayıt taslağa çevrilemez.');
  if (existing?.id && item.id && existing.id !== item.id) throw new Error('Eski formülasyon sürümü düzenlenemez.');
  if (item.id && records.some((row) => row.id === item.id && row.clientId !== item.clientId)) {
    throw new Error('Formülasyonun danışan dosyası değiştirilemez.');
  }
  const list = records.filter((row) => row.clientId !== item.clientId || row.supersededBy);
  const next = {
    ...item,
    id: item.id ?? existing?.id ?? newId('form'),
    amendmentOf: existing?.amendmentOf ?? item.amendmentOf,
    amendmentReason: existing?.amendmentReason ?? item.amendmentReason,
    signedAt: existing?.signedAt ?? item.signedAt,
    updatedAt: new Date().toISOString(),
  };
  queueWrite({ entity: 'formulation', op: 'upsert', value: next });
  write(FORM_KEY, [next, ...list]);
  recordAudit({ action: 'save', entity: 'formulation', entityId: item.clientId, summary: 'Formülasyon güncellendi' });
}

export function getSafetyPlans(): SafetyPlan[] {
  return read<SafetyPlan[]>(SAFETY_KEY, []);
}

export function getSafetyPlan(clientId: string): SafetyPlan | undefined {
  return getSafetyPlans().find((item) => item.clientId === clientId && !item.supersededBy);
}

export function saveSafetyPlan(item: SafetyPlan): void {
  const records = getSafetyPlans();
  const existing = records.find((row) => row.clientId === item.clientId && !row.supersededBy);
  if (existing?.status === 'locked') {
    throw new Error('Kilitli güvenlik planı değiştirilemez. Düzeltme için yeni revizyon oluşturun.');
  }
  if (existing?.status === 'signed' && item.status !== 'signed') throw new Error('İmzalı kayıt taslağa çevrilemez.');
  if (existing?.id && item.id && existing.id !== item.id) throw new Error('Eski güvenlik planı sürümü düzenlenemez.');
  if (item.id && records.some((row) => row.id === item.id && row.clientId !== item.clientId)) {
    throw new Error('Güvenlik planının danışan dosyası değiştirilemez.');
  }
  const list = records.filter((row) => row.clientId !== item.clientId || row.supersededBy);
  const next = {
    ...item,
    id: item.id ?? existing?.id ?? newId('safe'),
    amendmentOf: existing?.amendmentOf ?? item.amendmentOf,
    amendmentReason: existing?.amendmentReason ?? item.amendmentReason,
    signedAt: existing?.signedAt ?? item.signedAt,
    updatedAt: new Date().toISOString(),
  };
  queueWrite({ entity: 'safety', op: 'upsert', value: next });
  write(SAFETY_KEY, [next, ...list]);
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
  if (cloudContext()) {
    throw new Error('Bulut modunda yedek geri yükleme kapalıdır: klinik kayıtlar sunucudan okunur.');
  }
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
   PHASE-07 — İmza / kilit (formülasyon ve güvenlik planı)
   ========================================================================== */

type RecordWithStatus = {
  clientId: string;
  id?: string;
  status?: 'draft' | 'signed' | 'locked';
  revision?: number;
  amendmentOf?: string;
  amendmentReason?: string;
  supersededBy?: string;
  signedAt?: string;
  lockedAt?: string;
};

function setRecordStatus<T extends RecordWithStatus>(
  key: string,
  items: T[],
  clientId: string,
  status: 'signed' | 'locked',
  table: string,
  auditEntity: string,
): T | null {
  const index = items.findIndex((item) => item.clientId === clientId && !item.supersededBy);
  const current = items[index];
  if (!current) return null;
  if (current.status === 'locked' && status === 'signed') throw new Error('Kilitli kayıt yeniden imzalanamaz.');
  if (current.status === status) return current;
  const now = new Date().toISOString();
  const next: T = {
    ...current,
    id: current.id ?? newId(key === SAFETY_KEY ? 'safe' : 'form'),
    status,
    revision: current.revision ?? 1,
    signedAt: current.signedAt ?? now,
    lockedAt: status === 'locked' ? now : current.lockedAt,
  };
  items[index] = next;
  const recordId = next.id ?? current.clientId;
  queueWrite(
    status === 'signed'
      ? { entity: 'sign', op: 'sign', value: { table, id: recordId } }
      : { entity: 'lock', op: 'lock', value: { table, id: recordId, signedAt: next.signedAt } },
  );
  write(key, items);
  recordAudit({
    action: 'save',
    entity: auditEntity,
    entityId: current.clientId,
    summary: status === 'signed' ? 'İmzalandı' : 'İmzalandı ve kilitlendi',
  });
  return next;
}

export function signFormulation(clientId: string): CaseFormulation | null {
  return setRecordStatus(FORM_KEY, getFormulations(), clientId, 'signed', 'formulations', 'formulation');
}

export function lockFormulation(clientId: string): CaseFormulation | null {
  return setRecordStatus(FORM_KEY, getFormulations(), clientId, 'locked', 'formulations', 'formulation');
}

export function signSafetyPlan(clientId: string): SafetyPlan | null {
  return setRecordStatus(SAFETY_KEY, getSafetyPlans(), clientId, 'signed', 'safety_plans', 'safety');
}

export function lockSafetyPlan(clientId: string): SafetyPlan | null {
  return setRecordStatus(SAFETY_KEY, getSafetyPlans(), clientId, 'locked', 'safety_plans', 'safety');
}

/* ==========================================================================
   PHASE-07 — Bulut anlık görüntüsünü yerel cache'e uygulama
   ========================================================================== */
/* --------------------------------------------------------------------------
   PHASE-07 — Revizyon: kilitli kaydın içeriği değiştirilmez; yeni sürüm açılır.
   -------------------------------------------------------------------------- */

function createRecordRevision<T extends RecordWithStatus>(
  key: string,
  entity: 'formulation' | 'safety',
  clientId: string,
  reason: string,
): T | null {
  const items = (JSON.parse(localStorage.getItem(cacheKey(key)) ?? 'null') as T[] | null) ?? [];
  const current = items.find((item) => item.clientId === clientId && !item.supersededBy);
  if (!current) return null;
  if (current.status !== 'locked') throw new Error('Revizyon yalnızca kilitli kayıtlar için oluşturulur.');
  if (!current.id) throw new Error('Klinik kayıt kimliği eksik. Verileri silmeyin; yöneticinizle görüşün.');
  const trimmed = reason.trim();
  if (trimmed.length < 3) throw new Error('Revizyon nedeni en az 3 karakter olmalıdır.');
  const next: T = {
    ...current,
    id: newId(entity === 'safety' ? 'safe' : 'form'),
    status: 'draft',
    revision: (current.revision ?? 1) + 1,
    amendmentOf: current.id,
    amendmentReason: trimmed,
    supersededBy: undefined,
    signedAt: undefined,
    lockedAt: undefined,
  };
  const index = items.findIndex((item) => item.clientId === clientId && !item.supersededBy);
  items[index] = { ...current, supersededBy: next.id };
  queueWrite(
    entity === 'safety'
      ? { entity: 'safety', op: 'upsert', value: next as unknown as SafetyPlan }
      : { entity: 'formulation', op: 'upsert', value: next as unknown as CaseFormulation },
  );
  write(key, [next, ...items]);
  recordAudit({
    action: 'save',
    entity: entity === 'safety' ? 'safety' : 'formulation',
    entityId: clientId,
    summary: `Revizyon oluşturuldu (${trimmed.slice(0, 80)})`,
  });
  return next;
}

export function createFormulationRevision(clientId: string, reason: string): CaseFormulation | null {
  return createRecordRevision<CaseFormulation>(FORM_KEY, 'formulation', clientId, reason);
}

export function createSafetyPlanRevision(clientId: string, reason: string): SafetyPlan | null {
  return createRecordRevision<SafetyPlan>(SAFETY_KEY, 'safety', clientId, reason);
}

export function applyPracticeSnapshot(snapshot: ClinicalSnapshot): void {
  write(NOTES_KEY, snapshot.notes);
  write(TASKS_KEY, snapshot.tasks);
  write(DOCS_KEY, snapshot.documents);
  write(SCREEN_KEY, snapshot.screenings);
  write(FORM_KEY, snapshot.formulations);
  write(SAFETY_KEY, snapshot.safetyPlans);
  if (snapshot.settings) write(SETTINGS_KEY, { ...DEFAULT_SETTINGS, ...getSettings(), ...snapshot.settings });
}
