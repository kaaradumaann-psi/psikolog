/**
 * PHASE-07 / P0-6 — Yerel (localStorage) klinik verinin buluta aktarımı.
 *
 * Kural: export → transform → import → verify. Aktarım başarısız olursa yerel
 * veri ASLA silinmez; yalnızca doğrulama başarılı olduğunda ve kullanıcı açıkça
 * isterse yerel kopya temizlenir. Kimlikler deterministik UUID'ye eşlenir, bu
 * yüzden işlem tekrar çalıştırılsa bile kopya kayıt oluşmaz.
 */
import type { Appointment, BeckAnxietyResult, BeckDepressionResult, Client, ClinicalReport, Scl90Result, SoapSession } from '../clinicalTypes';
import type { PracticeDocument, PracticeNote, PracticeTask } from '../practiceStore';
import type { CaseFormulation, SafetyPlan } from '../casework';
import type { RapidScreeningResult } from '../rapidScreening';
import { loadSnapshot } from './repository';
import { flushOutbox, queueWrite, syncPort, cloudContext, whenIdle } from './sync';

export const LEGACY_KEYS = {
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
  screenings: 'psikolog_screenings_v2',
  formulations: 'psikolog_formulations_v2',
  safetyPlans: 'psikolog_safety_v2',
} as const;

type Entity = keyof typeof LEGACY_KEYS;

export type MigrationReport = {
  ok: boolean;
  pushed: Record<Entity, number>;
  verified: { entity: Entity; local: number; cloud: number }[];
  missing: Entity[];
  errors: string[];
};

function readLegacy<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * Yerel veriyi buluta aktarır ve doğrular. Yerel kayıtlar korunur
 * (temizlik için `purgeLocalAfterImport` ayrıca ve bilinçli olarak çağrılmalıdır).
 */
export async function migrateLocalDataToCloud(): Promise<MigrationReport> {
  const ctx = cloudContext();
  const pushed = Object.fromEntries(Object.keys(LEGACY_KEYS).map((key) => [key, 0])) as Record<Entity, number>;
  const errors: string[] = [];
  if (!ctx || !syncPort()) {
    return { ok: false, pushed, verified: [], missing: [], errors: ['Bulut bağlamı etkin değil.'] };
  }

  const clients = readLegacy<Client>(LEGACY_KEYS.clients);
  const sessions = readLegacy<SoapSession>(LEGACY_KEYS.sessions);
  const appointments = readLegacy<Appointment>(LEGACY_KEYS.appointments);
  const bdi = readLegacy<BeckDepressionResult>(LEGACY_KEYS.bdi);
  const bai = readLegacy<BeckAnxietyResult>(LEGACY_KEYS.bai);
  const scl90 = readLegacy<Scl90Result>(LEGACY_KEYS.scl90);
  const reports = readLegacy<ClinicalReport>(LEGACY_KEYS.reports);
  const notes = readLegacy<PracticeNote>(LEGACY_KEYS.notes);
  const tasks = readLegacy<PracticeTask>(LEGACY_KEYS.tasks);
  const documents = readLegacy<PracticeDocument>(LEGACY_KEYS.documents);
  const screenings = readLegacy<RapidScreeningResult>(LEGACY_KEYS.screenings);
  const formulations = readLegacy<CaseFormulation>(LEGACY_KEYS.formulations);
  const safetyPlans = readLegacy<SafetyPlan>(LEGACY_KEYS.safetyPlans);

  // 1) Ebeveynler önce: danışanlar → randevu/seans/ölçek/rapor → formülasyon/güvenlik.
  for (const client of clients) {
    queueWrite({ entity: 'client', op: 'upsert', value: client });
    pushed.clients += 1;
  }
  for (const appointment of appointments) {
    queueWrite({ entity: 'appointment', op: 'upsert', value: appointment });
    pushed.appointments += 1;
  }
  for (const session of sessions) {
    queueWrite({ entity: 'session', op: 'upsert', value: session });
    pushed.sessions += 1;
  }
  for (const result of bdi) {
    queueWrite({ entity: 'bdi', op: 'upsert', value: result });
    pushed.bdi += 1;
  }
  for (const result of bai) {
    queueWrite({ entity: 'bai', op: 'upsert', value: result });
    pushed.bai += 1;
  }
  for (const result of scl90) {
    queueWrite({ entity: 'scl90', op: 'upsert', value: result });
    pushed.scl90 += 1;
  }
  for (const result of screenings) {
    queueWrite({ entity: 'screening', op: 'upsert', value: result });
    pushed.screenings += 1;
  }
  for (const report of reports) {
    queueWrite({ entity: 'report', op: 'upsert', value: report });
    pushed.reports += 1;
  }
  for (const note of notes) {
    queueWrite({ entity: 'note', op: 'upsert', value: note });
    pushed.notes += 1;
  }
  for (const task of tasks) {
    queueWrite({ entity: 'task', op: 'upsert', value: task });
    pushed.tasks += 1;
  }
  for (const document of documents) {
    queueWrite({ entity: 'document', op: 'upsert', value: document });
    pushed.documents += 1;
  }
  for (const formulation of formulations) {
    queueWrite({ entity: 'formulation', op: 'upsert', value: formulation });
    pushed.formulations += 1;
  }
  for (const plan of safetyPlans) {
    queueWrite({ entity: 'safety', op: 'upsert', value: plan });
    pushed.safetyPlans += 1;
  }

  await whenIdle();
  await flushOutbox();
  await whenIdle();

  // 2) Doğrulama: sunucudaki satır sayısı yerel sayıdan az olamaz.
  let cloudCounts: Record<string, number> = {};
  try {
    const snapshot = await loadSnapshot(syncPort()!, ctx);
    cloudCounts = {
      clients: snapshot.clients.length,
      sessions: snapshot.sessions.length,
      appointments: snapshot.appointments.length,
      bdi: snapshot.bdi.length,
      bai: snapshot.bai.length,
      scl90: snapshot.scl90.length,
      reports: snapshot.reports.length,
      notes: snapshot.notes.length,
      tasks: snapshot.tasks.length,
      documents: snapshot.documents.length,
      screenings: snapshot.screenings.length,
      formulations: snapshot.formulations.length,
      safetyPlans: snapshot.safetyPlans.length,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Doğrulama okuması başarısız.');
  }

  const localCounts: Record<Entity, number> = {
    clients: clients.length,
    sessions: sessions.length,
    appointments: appointments.length,
    bdi: bdi.length,
    bai: bai.length,
    scl90: scl90.length,
    reports: reports.length,
    notes: notes.length,
    tasks: tasks.length,
    documents: documents.length,
    screenings: screenings.length,
    formulations: formulations.length,
    safetyPlans: safetyPlans.length,
  };

  const verified = (Object.keys(localCounts) as Entity[]).map((entity) => ({
    entity,
    local: localCounts[entity],
    cloud: cloudCounts[entity] ?? 0,
  }));
  const missing = verified.filter((item) => item.local > item.cloud).map((item) => item.entity);

  return {
    ok: errors.length === 0 && missing.length === 0,
    pushed,
    verified,
    missing,
    errors,
  };
}

/**
 * Yalnızca aktarım doğrulandıktan sonra ve kullanıcı onayıyla çağrılır.
 * Başarısız aktarımda yerel veri korunur (sessiz silme yoktur).
 */
export function purgeLegacyKeysAfterVerifiedImport(report: MigrationReport): boolean {
  if (!report.ok) return false;
  for (const key of Object.values(LEGACY_KEYS)) {
    localStorage.removeItem(key);
  }
  return true;
}
