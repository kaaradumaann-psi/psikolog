/**
 * PHASE-07 — Repository: klinik nesneler ile bulut satırları arasındaki köprü.
 * Supabase'e özel kod burada yoktur; yalnızca `CloudPort` sözleşmesi kullanılır.
 */
import type { Appointment, BeckAnxietyResult, BeckDepressionResult, Client, ClinicalReport, Scl90Result, SoapSession } from '../clinicalTypes';
import type { CaseFormulation, SafetyPlan } from '../casework';
import type { PracticeDocument, PracticeNote, PracticeSettings, PracticeTask } from '../practiceStore';
import type { RapidScreeningResult } from '../rapidScreening';
import type { CloudPort, CloudRow } from './port';
import { DOCUMENT_BUCKET } from './port';
import {
  anamnesisToRow,
  appointmentToRow,
  clientToRow,
  decodeTestRow,
  documentToRow,
  formulationToRow,
  noteToRow,
  reportToRow,
  rowToAppointment,
  rowToClient,
  rowToDocument,
  rowToFormulation,
  rowToNote,
  rowToReport,
  rowToSafetyPlan,
  rowToSession,
  rowToSettings,
  rowToTask,
  resolve,
  safetyPlanToRow,
  sessionToRow,
  settingsToRow,
  taskToRow,
  testToRows,
  type CloudContext,
  type Row,
  type TestKind,
} from './rows';

export const TABLES = {
  clients: 'clients',
  anamneses: 'anamneses',
  appointments: 'appointments',
  sessions: 'sessions',
  testAdministrations: 'test_administrations',
  testResults: 'test_results',
  reports: 'reports',
  notes: 'notes',
  tasks: 'tasks',
  documents: 'documents',
  formulations: 'formulations',
  safetyPlans: 'safety_plans',
  settings: 'psychologist_settings',
} as const;

export type ClinicalSnapshot = {
  clients: Client[];
  appointments: Appointment[];
  sessions: SoapSession[];
  bdi: BeckDepressionResult[];
  bai: BeckAnxietyResult[];
  scl90: Scl90Result[];
  screenings: RapidScreeningResult[];
  reports: ClinicalReport[];
  notes: PracticeNote[];
  tasks: PracticeTask[];
  documents: PracticeDocument[];
  formulations: CaseFormulation[];
  safetyPlans: SafetyPlan[];
  settings: Partial<PracticeSettings> | null;
};

function isUniqueViolation(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error ?? '');
  return /23505|duplicate key|unique constraint/i.test(message);
}

/** Kimliğe göre günceller, kayıt yoksa ekler. */
export async function upsertRow(port: CloudPort, table: string, row: Row, match?: Record<string, unknown>): Promise<CloudRow> {
  try {
    const inserted = await port.insert(table, [row]);
    return inserted[0] ?? row;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const filter = match ?? { id: String(row.id ?? '') };
    const updated = await port.update(table, row, filter as Record<string, string>);
    return updated[0] ?? row;
  }
}

/* ------------------------------------------------------------------ okuma */

export async function loadSnapshot(port: CloudPort, ctx: CloudContext): Promise<ClinicalSnapshot> {
  const [clientRows, anamnesisRows, appointmentRows, sessionRows, administrations, results, reportRows, noteRows, taskRows, documentRows, formulationRows, safetyRows, settingsRows] =
    await Promise.all([
      port.select(TABLES.clients, { organization_id: ctx.organizationId }),
      port.select(TABLES.anamneses, { organization_id: ctx.organizationId }),
      port.select(TABLES.appointments, { organization_id: ctx.organizationId }),
      port.select(TABLES.sessions, { organization_id: ctx.organizationId }),
      port.select(TABLES.testAdministrations, { organization_id: ctx.organizationId }),
      port.select(TABLES.testResults, { organization_id: ctx.organizationId }),
      port.select(TABLES.reports, { organization_id: ctx.organizationId }),
      port.select(TABLES.notes, { organization_id: ctx.organizationId }),
      port.select(TABLES.tasks, { organization_id: ctx.organizationId }),
      port.select(TABLES.documents, { organization_id: ctx.organizationId }),
      port.select(TABLES.formulations, { organization_id: ctx.organizationId }),
      port.select(TABLES.safetyPlans, { organization_id: ctx.organizationId }),
      port.select(TABLES.settings, { created_by: ctx.userId }),
    ]);

  const anamnesisByClient = new Map<string, Row>();
  for (const row of anamnesisRows) anamnesisByClient.set(String(row.client_id), row);

  const clients = clientRows.map((row) => rowToClient(row, anamnesisByClient.get(String(row.id))));
  const clientNames = new Map(clients.map((client) => [client.id, `${client.firstName} ${client.lastName}`]));

  const resultByAdministration = new Map<string, Row>();
  for (const row of results) resultByAdministration.set(String(row.test_administration_id), row);

  const bdi: BeckDepressionResult[] = [];
  const bai: BeckAnxietyResult[] = [];
  const scl90: Scl90Result[] = [];
  const screenings: RapidScreeningResult[] = [];
  for (const administration of administrations) {
    const resultRow = resultByAdministration.get(String(administration.id));
    if (!resultRow) continue;
    const decoded = decodeTestRow(
      { ...resultRow, test_administration_id: administration.id },
      clientNames.get(String(administration.client_id)) ?? '',
    );
    if (!decoded) continue;
    if (decoded.kind === 'bdi') bdi.push(decoded.value);
    else if (decoded.kind === 'bai') bai.push(decoded.value);
    else if (decoded.kind === 'scl90') scl90.push(decoded.value);
    else screenings.push(decoded.value);
  }

  return {
    clients,
    appointments: appointmentRows.map(rowToAppointment),
    sessions: sessionRows.map((row) =>
      rowToSession({ ...row, client_name: clientNames.get(String(row.client_id)) ?? '' }),
    ),
    bdi,
    bai,
    scl90,
    screenings,
    reports: reportRows.map(rowToReport),
    notes: noteRows.map(rowToNote),
    tasks: taskRows.map(rowToTask),
    documents: documentRows.map(rowToDocument),
    formulations: formulationRows.map(rowToFormulation),
    safetyPlans: safetyRows.map(rowToSafetyPlan),
    settings: settingsRows[0] ? rowToSettings(settingsRows[0]) : null,
  };
}

/* ------------------------------------------------------------------ yazma */

export async function pushClient(port: CloudPort, ctx: CloudContext, client: Client): Promise<void> {
  await upsertRow(port, TABLES.clients, clientToRow(client, ctx));
  // Eşleşme bulut kimliğiyle yapılmalı; yerel kimlik bulut satırını bulmaz.
  await upsertRow(port, TABLES.anamneses, anamnesisToRow(client, ctx), { client_id: resolve(ctx, client.id) });
}

export async function removeClient(port: CloudPort, id: string): Promise<void> {
  await port.remove(TABLES.clients, { id });
}

export async function pushAppointment(port: CloudPort, ctx: CloudContext, appointment: Appointment): Promise<void> {
  await upsertRow(port, TABLES.appointments, appointmentToRow(appointment, ctx));
}

export async function removeAppointment(port: CloudPort, id: string): Promise<void> {
  await port.remove(TABLES.appointments, { id });
}

export async function pushSession(port: CloudPort, ctx: CloudContext, session: SoapSession): Promise<void> {
  await upsertRow(port, TABLES.sessions, sessionToRow(session, ctx));
}

export async function removeSession(port: CloudPort, id: string): Promise<void> {
  await port.remove(TABLES.sessions, { id });
}

export async function pushTest(
  port: CloudPort,
  ctx: CloudContext,
  kind: TestKind,
  result: BeckDepressionResult | BeckAnxietyResult | Scl90Result | RapidScreeningResult,
): Promise<void> {
  const { administration, result: resultRow } = testToRows(kind, result, ctx);
  await upsertRow(port, TABLES.testAdministrations, administration);
  await upsertRow(port, TABLES.testResults, resultRow, { test_administration_id: String(administration.id) });
}

export async function removeTest(port: CloudPort, id: string): Promise<void> {
  await port.remove(TABLES.testAdministrations, { id });
}

export async function pushReport(port: CloudPort, ctx: CloudContext, report: ClinicalReport): Promise<void> {
  await upsertRow(port, TABLES.reports, reportToRow(report, ctx));
}

export async function removeReport(port: CloudPort, id: string): Promise<void> {
  await port.remove(TABLES.reports, { id });
}

export async function pushNote(port: CloudPort, ctx: CloudContext, note: PracticeNote): Promise<void> {
  await upsertRow(port, TABLES.notes, noteToRow(note, ctx));
}

export async function removeNote(port: CloudPort, id: string): Promise<void> {
  await port.remove(TABLES.notes, { id });
}

export async function pushTask(port: CloudPort, ctx: CloudContext, task: PracticeTask): Promise<void> {
  await upsertRow(port, TABLES.tasks, taskToRow(task, ctx));
}

export async function removeTask(port: CloudPort, id: string): Promise<void> {
  await port.remove(TABLES.tasks, { id });
}

export function documentStoragePath(ctx: CloudContext, document: PracticeDocument): string {
  const safeName = document.fileName.replace(/[^\w.\-]+/g, '_').slice(0, 120) || 'belge';
  // Storage RLS klasörleri bulut (UUID) kimlikleriyle doğrular; yerel kimlikler eşlenir.
  const clientId = resolve(ctx, document.clientId);
  const documentId = resolve(ctx, document.id);
  return `${ctx.organizationId}/${clientId}/${documentId}-${safeName}`;
}

export async function pushDocument(port: CloudPort, ctx: CloudContext, document: PracticeDocument): Promise<void> {
  const storagePath = document.storagePath ?? documentStoragePath(ctx, document);
  if (document.dataUrl && port.upload && !document.storagePath) {
    const blob = await (await fetch(document.dataUrl)).blob();
    await port.upload(DOCUMENT_BUCKET, storagePath, blob, document.mimeType);
  }
  await upsertRow(port, TABLES.documents, documentToRow(document, ctx, storagePath));
}

export async function removeDocument(port: CloudPort, ctx: CloudContext, document: PracticeDocument): Promise<void> {
  await port.remove(TABLES.documents, { id: resolve(ctx, document.id) });
  const storagePath = document.storagePath ?? documentStoragePath(ctx, document);
  if (port.removeObject) {
    try {
      await port.removeObject(DOCUMENT_BUCKET, storagePath);
    } catch {
      /* nesne zaten yoksa metadata silinmiş sayılır */
    }
  }
}

export async function pushFormulation(port: CloudPort, ctx: CloudContext, item: CaseFormulation): Promise<void> {
  await upsertRow(port, TABLES.formulations, formulationToRow(item, ctx), { client_id: item.clientId });
}

export async function removeFormulation(port: CloudPort, id: string): Promise<void> {
  await port.remove(TABLES.formulations, { id });
}

export async function pushSafetyPlan(port: CloudPort, ctx: CloudContext, item: SafetyPlan): Promise<void> {
  await upsertRow(port, TABLES.safetyPlans, safetyPlanToRow(item, ctx), { client_id: item.clientId });
}

export async function removeSafetyPlan(port: CloudPort, id: string): Promise<void> {
  await port.remove(TABLES.safetyPlans, { id });
}

export async function pushSettings(port: CloudPort, ctx: CloudContext, settings: PracticeSettings): Promise<void> {
  await upsertRow(port, TABLES.settings, settingsToRow(settings, ctx), { created_by: ctx.userId });
}

/** İmzala / kilitle — idempotent, yalnız durum kolonlarını yazar. */
export async function markRecordStatus(
  port: CloudPort,
  table: string,
  id: string,
  status: 'signed' | 'locked',
  userId: string,
  signedAt?: string,
): Promise<CloudRow> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> =
    status === 'signed'
      ? { status, signed_at: now, signed_by: userId }
      : {
          status,
          // İmza anı korunur; kilit anı ayrı damgalanır (klinik kayıt bütünlüğü).
          signed_at: signedAt ?? now,
          signed_by: userId,
          locked_at: now,
          locked_by: userId,
        };
  const rows = await port.update(table, patch, { id });
  const updated = rows[0];
  if (!updated) throw new Error('Kayıt bulunamadı veya bu işlem için yetkiniz yok.');
  return updated;
}

/** Revizyon: mevcut kaydı değiştirmez, yeni sürüm ekler (eski içerik korunur). */
export async function pushRevision(
  port: CloudPort,
  table: string,
  row: Row,
): Promise<CloudRow> {
  const inserted = await port.insert(table, [row]);
  return inserted[0] ?? row;
}
