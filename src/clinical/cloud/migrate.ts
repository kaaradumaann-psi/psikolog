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
import { resolve } from './rows';
import { flushOutbox, queueWrite, syncPort, cloudContext, whenIdle, getSyncState } from './sync';

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
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as T[];
  } catch {
    // A damaged legacy record is not an empty list. Never mark it verified
    // and remove the only copy on the device.
  }
  throw new Error(`Yerel ${key} verisi okunamadı. Silmeyin; önce verileri kurtarın.`);
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

  // Parse every collection before sending anything; if one is corrupt, stop
  // without treating it as an empty set or offering to clear legacy storage.
  let legacy;
  try {
    legacy = {
      clients: readLegacy<Client>(LEGACY_KEYS.clients),
      sessions: readLegacy<SoapSession>(LEGACY_KEYS.sessions),
      appointments: readLegacy<Appointment>(LEGACY_KEYS.appointments),
      bdi: readLegacy<BeckDepressionResult>(LEGACY_KEYS.bdi),
      bai: readLegacy<BeckAnxietyResult>(LEGACY_KEYS.bai),
      scl90: readLegacy<Scl90Result>(LEGACY_KEYS.scl90),
      reports: readLegacy<ClinicalReport>(LEGACY_KEYS.reports),
      notes: readLegacy<PracticeNote>(LEGACY_KEYS.notes),
      tasks: readLegacy<PracticeTask>(LEGACY_KEYS.tasks),
      documents: readLegacy<PracticeDocument>(LEGACY_KEYS.documents),
      screenings: readLegacy<RapidScreeningResult>(LEGACY_KEYS.screenings),
      formulations: readLegacy<CaseFormulation>(LEGACY_KEYS.formulations),
      safetyPlans: readLegacy<SafetyPlan>(LEGACY_KEYS.safetyPlans),
    };
  } catch (error) {
    return { ok: false, pushed, verified: [], missing: [], errors: [error instanceof Error ? error.message : 'Yerel veri okunamadı. Silmeyin.'] };
  }
  const { clients, sessions, appointments, bdi, bai, scl90, reports, notes, tasks,
    documents, screenings, formulations, safetyPlans } = legacy;

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
  if (getSyncState().pending > 0) {
    errors.push(`${getSyncState().pending} klinik kayıt hâlâ sunucuda doğrulanamadı; yerel veriyi silmeyin.`);
  }

  // 2) Doğrulama: yalnız toplam sayısı değil, her yerel kimliğin karşılığı
  // sunucudaki yeniden okunan anlık görüntüde bulunmalı. Başka kayıtların
  // varlığı eksik bir yerel klinik kaydı maskeleyemez.
  const localRecords: Record<Entity, Array<{ id?: string; clientId?: string }>> = legacy;
  let cloudCounts: Record<string, number> = {};
  let cloudIds: Partial<Record<Entity, Set<string>>> = {};
  try {
    const snapshot = await loadSnapshot(syncPort()!, ctx);
    const cloudRecords: Record<Entity, Array<{ id?: string }>> = {
      clients: snapshot.clients,
      sessions: snapshot.sessions,
      appointments: snapshot.appointments,
      bdi: snapshot.bdi,
      bai: snapshot.bai,
      scl90: snapshot.scl90,
      reports: snapshot.reports,
      notes: snapshot.notes,
      tasks: snapshot.tasks,
      documents: snapshot.documents,
      screenings: snapshot.screenings,
      formulations: snapshot.formulations,
      safetyPlans: snapshot.safetyPlans,
    };
    cloudCounts = Object.fromEntries(Object.entries(cloudRecords).map(([entity, rows]) => [entity, rows.length]));
    cloudIds = Object.fromEntries(Object.entries(cloudRecords).map(([entity, rows]) => [
      entity, new Set(rows.map((row) => row.id).filter((id): id is string => !!id)),
    ]));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Doğrulama okuması başarısız.');
  }

  const verified = (Object.keys(localRecords) as Entity[]).map((entity) => ({
    entity,
    local: localRecords[entity].length,
    cloud: cloudCounts[entity] ?? 0,
  }));
  const missing = verified.filter((item) => {
    const ids = cloudIds[item.entity];
    if (!ids) return item.local > 0;
    return localRecords[item.entity].some((row) => {
      const localId = row.id ?? (item.entity === 'formulations' ? `form_${row.clientId}`
        : item.entity === 'safetyPlans' ? `safe_${row.clientId}` : '');
      return !localId || !ids.has(resolve(ctx, localId));
    });
  }).map((item) => item.entity);

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
