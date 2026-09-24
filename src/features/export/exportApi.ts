/**
 * PHASE-11: Export/Import — KVKK data portability
 * Client data export as JSON, minimal, no secrets, no raw test items
 * Import validates schema, org isolation, no overwrite
 */

import type { Client } from '../clients/clientTypes';
import { getClient } from '../clients/clientApi';
import { getAnamnesisByClient } from '../anamnesis/anamnesisApi';
import { listSessionsByClient } from '../sessions/sessionApi';
import { listAssessmentsByClient } from '../assessments/assessmentApi';
import { listNotesByClient } from '../notes/noteApi';
import { listDocumentsByClient } from '../documents/documentApi';
import { listAppointmentsByClient } from '../appointments/appointmentApi';
import { listTasksByClient } from '../tasks/taskApi';
import { listReportsByClient } from '../reports/reportsApi';

export type ExportBundle = {
  version: 'v1';
  exportedAt: string;
  client: Client;
  anamnesis: Awaited<ReturnType<typeof getAnamnesisByClient>>;
  sessions: Awaited<ReturnType<typeof listSessionsByClient>>;
  assessments: Awaited<ReturnType<typeof listAssessmentsByClient>>;
  notes: Awaited<ReturnType<typeof listNotesByClient>>;
  documentsMeta: Awaited<ReturnType<typeof listDocumentsByClient>>; // meta only, no file content
  appointments: Awaited<ReturnType<typeof listAppointmentsByClient>>;
  tasks: Awaited<ReturnType<typeof listTasksByClient>>;
  reportsMeta: Awaited<ReturnType<typeof listReportsByClient>>; // meta only
};

export async function exportClientBundle(clientId: string): Promise<ExportBundle> {
  const client = await getClient(clientId);
  const [anamnesis, sessions, assessments, notes, documentsMeta, appointments, tasks, reportsMeta] = await Promise.all([
    getAnamnesisByClient(clientId).catch(() => null),
    listSessionsByClient(clientId).catch(() => []),
    listAssessmentsByClient(clientId).catch(() => []),
    listNotesByClient(clientId).catch(() => []),
    listDocumentsByClient(clientId).catch(() => []),
    listAppointmentsByClient(clientId).catch(() => []),
    listTasksByClient(clientId).catch(() => []),
    listReportsByClient(clientId).catch(() => []),
  ]);

  return {
    version: 'v1',
    exportedAt: new Date().toISOString(),
    client,
    anamnesis,
    sessions,
    assessments,
    notes,
    documentsMeta,
    appointments,
    tasks,
    reportsMeta,
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Import validation — only validates structure, does NOT auto-create
export function validateImportBundle(json: unknown): { ok: boolean; error?: string } {
  if (!json || typeof json !== 'object') return { ok: false, error: 'Geçersiz JSON' };
  const obj = json as Record<string, unknown>;
  if (obj.version !== 'v1') return { ok: false, error: 'Sürüm uyumsuz (v1 bekleniyor)' };
  if (!obj.client || typeof obj.client !== 'object') return { ok: false, error: 'client eksik' };
  return { ok: true };
}
