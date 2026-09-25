/**
 * Pure mappers between the application's local records and the existing
 * Supabase rows. Nothing here performs I/O, so every mapping is unit-testable
 * without a database.
 *
 * Round-trip rule: a record pushed and then pulled back must be equal to the
 * original for every field the application reads.
 */

import type {
  AnamnesisRow,
  AppointmentRow,
  ClientRow,
  DocumentRow,
  NoteRow,
  ReportRow,
  ScaleKey,
  SessionRow,
  TaskRow,
  TestAdministrationRow,
  TestResultRow,
} from './types';
import { SYSTEM_TEST_DEFINITIONS } from './types';
import { deriveUuid } from './ids';
import type { Row } from './ports';
import type {
  Appointment,
  BeckAnxietyResult,
  BeckDepressionResult,
  ClinicalReport,
  Client,
  Scl90Result,
  SoapSession,
} from '../clinicalTypes';
import type { PracticeDocument, PracticeNote, PracticeTask } from '../practiceStore';
import type { RapidScreeningResult } from '../rapidScreening';

/** Turkey is UTC+3 year-round (no DST since 2016). */
const ISTANBUL_OFFSET = '+03:00';

export type Owner = { organizationId: string; userId: string };

function text(value: string | undefined | null, max: number): string | null {
  const clean = (value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (!clean) return null;
  return clean.slice(0, max);
}

function numberOrNull(value: number | undefined | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Date-only columns arrive as `YYYY-MM-DD` over PostgREST but as a `Date` from
 * node-postgres drivers. Accept both so a row means the same thing either way.
 */
export function toDateOnly(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return '';
}

export function istanbulToInstant(date: string, time: string): string {
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : '00:00';
  return `${date}T${safeTime}:00${ISTANBUL_OFFSET}`;
}

export function instantToIstanbul(instant: string): { date: string; time: string } {
  const parsed = new Date(instant);
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '' };
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(parsed);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${pick('year')}-${pick('month')}-${pick('day')}`,
    time: `${pick('hour')}:${pick('minute')}`,
  };
}

export function addMinutes(instant: string, minutes: number): string {
  const parsed = new Date(instant);
  if (Number.isNaN(parsed.getTime())) return instant;
  return new Date(parsed.getTime() + minutes * 60_000).toISOString();
}

/* ------------------------------------------------------------------ clients */

const CLIENT_STATUS = new Set(['active', 'followup', 'completed', 'archived']);

export function clientToRow(client: Client, owner: Owner): Row {
  return {
    id: client.id,
    organization_id: owner.organizationId,
    file_number: client.fileNumber.trim().slice(0, 80),
    first_name: client.firstName.trim().slice(0, 80),
    last_name: client.lastName.trim().slice(0, 80),
    birth_date: /^\d{4}-\d{2}-\d{2}$/.test(client.birthDate) ? client.birthDate : null,
    phone: text(client.phone, 32),
    email: text(client.email, 254),
    profession: text(client.occupation, 120),
    education: text(client.education, 120),
    status: CLIENT_STATUS.has(client.status) ? client.status : 'active',
    created_by: owner.userId,
    // T.C. kimlik numarası bilinçli olarak taşınmaz (veri minimizasyonu).
    profile_extra: {
      gender: client.gender,
      maritalStatus: client.maritalStatus,
      emergencyContact: client.emergencyContact,
      diagnoses: client.diagnoses,
    },
  };
}

export function rowToClient(row: ClientRow, local: Client | undefined): Client {
  const extra = (row.profile_extra ?? {}) as Partial<{
    gender: Client['gender'];
    maritalStatus: Client['maritalStatus'];
    emergencyContact: Client['emergencyContact'];
    diagnoses: string[];
  }>;
  const base: Client = local ?? {
    id: row.id,
    fileNumber: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    age: 0,
    gender: 'KADIN',
    phone: '',
    email: '',
    occupation: '',
    education: '',
    maritalStatus: '',
    emergencyContact: { name: '', phone: '', relation: '' },
    presentingComplaint: '',
    medicalHistory: '',
    psychiatricHistory: '',
    medications: '',
    familyHistory: '',
    allergiesNotes: '',
    diagnoses: [],
    status: 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return {
    ...base,
    id: row.id,
    fileNumber: row.file_number,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: toDateOnly(row.birth_date),
    phone: row.phone ?? '',
    email: row.email ?? '',
    occupation: row.profession ?? '',
    education: row.education ?? '',
    status: (CLIENT_STATUS.has(row.status) ? row.status : 'active') as Client['status'],
    gender: extra.gender ?? base.gender,
    maritalStatus: extra.maritalStatus ?? base.maritalStatus,
    emergencyContact: extra.emergencyContact ?? base.emergencyContact,
    diagnoses: Array.isArray(extra.diagnoses) ? extra.diagnoses : base.diagnoses,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* --------------------------------------------------------------- anamneses */

export function clientToAnamnesisRow(client: Client, owner: Owner): Row {
  const medications = text(client.medications, 2000);
  const medical = text(client.medicalHistory, 4000);
  return {
    id: deriveUuid('anamnesis', client.id),
    client_id: client.id,
    organization_id: owner.organizationId,
    created_by: owner.userId,
    reason: text(client.presentingComplaint, 5000),
    personal_history: [medical, medications ? `Düzenli ilaçlar: ${medications}` : '']
      .filter(Boolean)
      .join('\n')
      .slice(0, 5000) || null,
    family_history: text(client.familyHistory, 5000),
    education: text(client.education, 2000),
    profession: text(client.occupation, 2000),
    previous_assessments: text(client.psychiatricHistory, 5000),
    expert_notes: text(client.allergiesNotes, 5000),
  };
}

export function anamnesisRowToClientPatch(row: AnamnesisRow): Partial<Client> {
  const personal = row.personal_history ?? '';
  const medsMatch = /Düzenli ilaçlar:\s*([\s\S]*)$/m.exec(personal);
  const medical = personal.replace(/\n?Düzenli ilaçlar:\s*[\s\S]*$/m, '').trim();
  return {
    presentingComplaint: row.reason ?? '',
    medicalHistory: medical,
    medications: medsMatch?.[1]?.trim() ?? '',
    familyHistory: row.family_history ?? '',
    psychiatricHistory: row.previous_assessments ?? '',
    allergiesNotes: row.expert_notes ?? '',
  };
}

/* ------------------------------------------------------------- appointments */

const APPOINTMENT_STATUS_TO_ROW: Record<Appointment['status'], string> = {
  scheduled: 'scheduled',
  completed: 'completed',
  cancelled: 'cancelled',
  noshow: 'no_show',
};

export function appointmentStatusFromRow(value: string): Appointment['status'] {
  if (value === 'no_show') return 'noshow';
  if (value === 'completed' || value === 'cancelled') return value;
  return 'scheduled';
}

const APPOINTMENT_LOCATIONS = new Set(['Klinik (Yüz Yüze)', 'Online (Görüntülü)', 'Dış Görüşme']);

export function appointmentToRow(appointment: Appointment, owner: Owner): Row {
  const startAt = istanbulToInstant(appointment.date, appointment.time);
  return {
    id: appointment.id,
    client_id: appointment.clientId || null,
    organization_id: owner.organizationId,
    created_by: owner.userId,
    title: (appointment.sessionType || 'Görüşme').slice(0, 180),
    description: text(appointment.notes, 2000),
    start_at: startAt,
    end_at: addMinutes(startAt, appointment.durationMinutes || 50),
    status: APPOINTMENT_STATUS_TO_ROW[appointment.status] ?? 'scheduled',
    location: APPOINTMENT_LOCATIONS.has(appointment.location) ? appointment.location : text(appointment.location, 200),
    fee: numberOrNull(appointment.fee),
    payment_status: appointment.paymentStatus || 'pending',
  };
}

export function rowToAppointment(row: AppointmentRow, local: Appointment | undefined): Appointment {
  const { date, time } = instantToIstanbul(row.start_at);
  const duration =
    Math.max(5, Math.round((new Date(row.end_at).getTime() - new Date(row.start_at).getTime()) / 60_000)) || 50;
  return {
    id: row.id,
    clientId: row.client_id ?? local?.clientId ?? '',
    clientName: local?.clientName ?? '',
    date: toDateOnly(row.start_at ? date : '') || (local?.date ?? ''),
    time: time || (local?.time ?? ''),
    durationMinutes: Number.isFinite(duration) ? duration : 50,
    sessionType: (row.title || local?.sessionType || 'Bireysel Terapi') as Appointment['sessionType'],
    location: (APPOINTMENT_LOCATIONS.has(row.location ?? '')
      ? row.location
      : (local?.location ?? 'Klinik (Yüz Yüze)')) as Appointment['location'],
    status: appointmentStatusFromRow(row.status),
    notes: row.description ?? undefined,
    fee: row.fee ?? undefined,
    paymentStatus: (row.payment_status || 'pending') as Appointment['paymentStatus'],
    createdAt: row.created_at,
  };
}

/* ----------------------------------------------------------------- sessions */

export function sessionToRow(session: SoapSession, owner: Owner): Row {
  return {
    id: session.id,
    client_id: session.clientId,
    organization_id: owner.organizationId,
    created_by: owner.userId,
    date: session.date,
    type: (session.sessionType || 'Bireysel Terapi').slice(0, 80),
    duration: numberOrNull(session.durationMinutes),
    plan: text(session.plan, 5000),
    appointment_id: session.appointmentId || null,
    session_number: numberOrNull(session.sessionNumber),
    start_time: /^\d{2}:\d{2}$/.test(session.startTime) ? `${session.startTime}:00` : null,
    subjective: text(session.subjective, 8000),
    objective: text(session.objective, 8000),
    assessment: text(session.assessment, 8000),
    risk_level: session.riskLevel || 'none',
    risk_notes: text(session.riskNotes, 5000),
    homework: text(session.homework, 5000),
    fee: numberOrNull(session.fee),
    payment_status: session.paymentStatus || 'pending',
  };
}

export function rowToSession(row: SessionRow, local: SoapSession | undefined): SoapSession {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: local?.clientName ?? '',
    sessionNumber: row.session_number ?? local?.sessionNumber ?? 1,
    date: toDateOnly(row.date),
    startTime: row.start_time ? row.start_time.slice(0, 5) : (local?.startTime ?? ''),
    durationMinutes: row.duration ?? local?.durationMinutes ?? 50,
    sessionType: (row.type || local?.sessionType || 'Bireysel Terapi') as SoapSession['sessionType'],
    subjective: row.subjective ?? '',
    objective: row.objective ?? '',
    assessment: row.assessment ?? '',
    plan: row.plan ?? '',
    riskLevel: (row.risk_level || 'none') as SoapSession['riskLevel'],
    riskNotes: row.risk_notes ?? undefined,
    homework: row.homework ?? undefined,
    fee: row.fee ?? undefined,
    paymentStatus: (row.payment_status || 'pending') as SoapSession['paymentStatus'],
    appointmentId: row.appointment_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

/* ------------------------------------------------------- tests and results */

export type LocalTestRecord =
  | ({ kind: 'bdi' } & BeckDepressionResult)
  | ({ kind: 'bai' } & BeckAnxietyResult)
  | ({ kind: 'scl90' } & Scl90Result)
  | ({ kind: 'gad7' | 'phq9' } & RapidScreeningResult);

export function scaleKeyOf(record: LocalTestRecord): ScaleKey {
  if (record.kind === 'bdi') return 'beck';
  if (record.kind === 'bai') return 'bai';
  if (record.kind === 'scl90') return 'scl90';
  return record.type === 'phq9' ? 'phq9' : 'gad7';
}

/** Raw answers plus the scores the existing engines already computed. No new scoring. */
export function testResultData(record: LocalTestRecord): Record<string, unknown> {
  // The whole local record, including which scale it belongs to, so a pull can
  // route it back to the right collection. No score is recomputed here.
  return { ...(record as unknown as Record<string, unknown>) };
}

export function testAdministrationId(record: LocalTestRecord): string {
  return record.id;
}

export function testResultRowId(record: LocalTestRecord): string {
  return deriveUuid('test_result', record.id);
}

export function testSummary(record: LocalTestRecord): string {
  const severity = 'severity' in record ? String(record.severity) : '';
  const total = 'totalScore' in record ? record.totalScore : ('gsi' in record ? record.gsi : '');
  const label = record.kind === 'bdi' ? 'BDI' : record.kind === 'bai' ? 'BAI' : record.kind === 'scl90' ? 'SCL-90-R' : record.type.toUpperCase();
  return `${label} ${total} · ${severity}`.slice(0, 500);
}

export function testToAdministrationRow(record: LocalTestRecord, owner: Owner): Row {
  return {
    id: testAdministrationId(record),
    client_id: record.clientId ?? '',
    assessment_id: null,
    created_by: owner.userId,
    test_definition_id: SYSTEM_TEST_DEFINITIONS[scaleKeyOf(record)],
    organization_id: owner.organizationId,
    administration_date: record.testDate,
    status: 'completed',
    notes: text('notes' in record ? record.notes : undefined, 5000),
  };
}

export function testToResultRow(record: LocalTestRecord, owner: Owner): Row {
  return {
    id: testResultRowId(record),
    test_administration_id: testAdministrationId(record),
    organization_id: owner.organizationId,
    result_data: testResultData(record),
    summary: testSummary(record),
  };
}

/** Rebuild the local record from `result_data` (lossless: it stores the whole object). */
export function rowToTestRecord<T extends { id: string }>(row: TestResultRow, administration: TestAdministrationRow): T {
  const data = (row.result_data ?? {}) as Record<string, unknown>;
  return {
    ...data,
    id: administration.id,
    clientId: administration.client_id,
    testDate: administration.administration_date,
  } as unknown as T;
}

/* ------------------------------------------------------------------ reports */

export function reportToRow(report: ClinicalReport, owner: Owner, snapshot: Record<string, unknown>): Row {
  return {
    id: report.id,
    client_id: report.clientId ?? '',
    organization_id: owner.organizationId,
    created_by: owner.userId,
    title: (report.reportTitle || 'Klinik rapor').slice(0, 180),
    content: { ...(report as unknown as Record<string, unknown>) },
    status: 'completed',
    source_snapshot: snapshot,
    source_version: 'v1',
    save_reason: 'manual',
  };
}

export function rowToReport(row: ReportRow): ClinicalReport | null {
  const content = (row.content ?? {}) as unknown as ClinicalReport;
  if (!content || typeof content !== 'object' || !content.id) return null;
  return { ...content, id: row.id, clientId: row.client_id, updatedAt: row.updated_at };
}

/** Snapshot of the records a report was generated from — evidence, not invention. */
export function reportSourceSnapshot(input: {
  sessionCount: number;
  lastSessionDate?: string;
  scaleReadings: { scale: string; date: string; score: number; band: string }[];
}): Record<string, unknown> {
  return { schema: 1, ...input };
}

/* ---------------------------------------------------------------- documents */

export function documentStoragePath(owner: Owner, doc: PracticeDocument): string {
  const safeName = doc.fileName.replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(0, 120) || 'belge';
  return `${owner.organizationId}/${doc.clientId}/${doc.id}_${safeName}`;
}

export function documentToRow(doc: PracticeDocument, owner: Owner, filePath: string): Row {
  return {
    id: doc.id,
    client_id: doc.clientId,
    organization_id: owner.organizationId,
    created_by: owner.userId,
    file_path: filePath,
    file_name: doc.fileName.slice(0, 255),
    mime_type: doc.mimeType.slice(0, 127),
    size_bytes: doc.sizeBytes,
    description: text(doc.description, 1000),
  };
}

export function rowToDocument(row: DocumentRow, local: PracticeDocument | undefined): PracticeDocument {
  return {
    id: row.id,
    clientId: row.client_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    description: row.description ?? undefined,
    dataUrl: local?.dataUrl,
    createdAt: row.created_at,
    filePath: row.file_path,
  };
}

/* -------------------------------------------------------------------- notes */

export function noteToRow(note: PracticeNote, owner: Owner): Row {
  return {
    id: note.id,
    client_id: note.clientId,
    organization_id: owner.organizationId,
    created_by: owner.userId,
    content: note.content.slice(0, 8000),
    is_pinned: Boolean(note.pinned),
  };
}

export function rowToNote(row: NoteRow): PracticeNote {
  return {
    id: row.id,
    clientId: row.client_id,
    content: row.content,
    pinned: Boolean(row.is_pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

/* -------------------------------------------------------------------- tasks */

export function taskToRow(task: PracticeTask, owner: Owner): Row {
  return {
    id: task.id,
    client_id: task.clientId || null,
    organization_id: owner.organizationId,
    created_by: owner.userId,
    title: (task.title || 'Görev').slice(0, 180),
    description: text(task.description, 2000),
    due_date: task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : null,
    status: task.status,
    priority: task.priority,
    assigned_to: null,
  };
}

export function rowToTask(row: TaskRow, local: PracticeTask | undefined): PracticeTask {
  return {
    id: row.id,
    clientId: row.client_id ?? undefined,
    clientName: local?.clientName,
    title: row.title,
    description: row.description ?? undefined,
    dueDate: toDateOnly(row.due_date) || undefined,
    status: (row.status || 'todo') as PracticeTask['status'],
    priority: (row.priority || 'medium') as PracticeTask['priority'],
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}
