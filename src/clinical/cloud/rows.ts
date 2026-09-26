/**
 * PHASE-07 — Satır ↔ klinik nesne eşlemesi (saf fonksiyonlar).
 * Burada Supabase/ağ yoktur; yalnız dönüşüm ve doğrulama.
 *
 * Not: T.C. kimlik numarası bilinçli olarak buluta yazılmaz (veri minimizasyonu).
 * Yaş, doğum tarihinden türetilir; türev veri saklanmaz.
 */
import type {
  Appointment,
  AppointmentStatus,
  BeckAnxietyResult,
  BeckDepressionResult,
  Client,
  ClientStatus,
  ClinicalReport,
  ClinicalReportType,
  PaymentStatus,
  ReportSection,
  RiskLevel,
  Scl90DimensionScores,
  Scl90Result,
  SessionType,
  SoapSession,
} from '../clinicalTypes';
import type { CaseFormulation, SafetyPlan } from '../casework';
import type { PracticeDocument, PracticeNote, PracticeSettings, PracticeTask, TaskPriority, TaskStatus } from '../practiceStore';
import { assertRapidScreeningResultIntegrity, rapidScoreContext, type RapidScreeningResult } from '../rapidScreening';
import { assertBeckAnxietyResultIntegrity, beckAnxietyScoreContext } from '../beckAnxiety';
import { assertBeckDepressionResultIntegrity, beckDepressionScoreContext } from '../beckDepression';
import { assertScl90ResultIntegrity } from '../scl90';
import { ageFromBirthDate, clinicToday } from '../recordRules';

export type Row = Record<string, unknown>;
export type CloudContext = {
  userId: string;
  organizationId: string;
  /** Yerel (prefix'li) kimlikleri kalıcı UUID'ye çevirir; kurulmamışsa kimlik aynen kullanılır. */
  resolveId?: (id: string) => string;
};

export function resolve(ctx: CloudContext, id: string): string {
  if (!id) return id;
  return ctx.resolveId ? ctx.resolveId(id) : id;
}

function optionalResolve(ctx: CloudContext, id?: string): string | null {
  return id ? resolve(ctx, id) : null;
}

export const SYSTEM_TEST_DEFINITIONS = {
  bai: '00000000-0000-4000-8000-000000000001',
  bdi: '00000000-0000-4000-8000-000000000002',
  scl90: '00000000-0000-4000-8000-000000000003',
  gad7: '00000000-0000-4000-8000-000000000004',
  phq9: '00000000-0000-4000-8000-000000000005',
} as const;

export const TEST_DEFINITION_SOURCE: Record<keyof typeof SYSTEM_TEST_DEFINITIONS, string> = {
  bai: 'bai',
  bdi: 'beck',
  scl90: 'scl90',
  gad7: 'gad7',
  phq9: 'phq9',
};

/* ------------------------------------------------------------------ yardımcılar */

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionalNum(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function jsonObject(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}

function jsonArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/* ------------------------------------------------------------------ clients */

export function clientToRow(client: Client, ctx: CloudContext): Row {
  return {
    id: resolve(ctx, client.id),
    organization_id: ctx.organizationId,
    owner_user_id: ctx.userId,
    created_by: ctx.userId,
    file_number: client.fileNumber,
    first_name: client.firstName,
    last_name: client.lastName,
    birth_date: /^\d{4}-\d{2}-\d{2}$/.test(client.birthDate) ? client.birthDate : null,
    phone: nullableText(client.phone),
    email: nullableText(client.email),
    profession: nullableText(client.occupation),
    education: nullableText(client.education),
    status: client.status,
    gender: client.gender,
    marital_status: nullableText(client.maritalStatus),
    emergency_contact: client.emergencyContact ?? {},
  };
}

/** Anamnez satırı: danışan kaydındaki klinik alanlar 1-1 satıra yazılır. */
export function anamnesisToRow(client: Client, ctx: CloudContext): Row {
  return {
    client_id: resolve(ctx, client.id),
    organization_id: ctx.organizationId,
    created_by: ctx.userId,
    reason: nullableText(client.presentingComplaint),
    medical_history: nullableText(client.medicalHistory),
    previous_applications: nullableText(client.psychiatricHistory),
    medications: nullableText(client.medications),
    family_history: nullableText(client.familyHistory),
    allergies_notes: nullableText(client.allergiesNotes),
    diagnoses: client.diagnoses ?? [],
    education: nullableText(client.education),
    profession: nullableText(client.occupation),
  };
}

export function rowToClient(row: Row, anamnesis?: Row): Client {
  const birthDate = text(row.birth_date);
  return {
    id: text(row.id),
    fileNumber: text(row.file_number),
    firstName: text(row.first_name),
    lastName: text(row.last_name),
    birthDate,
    age: ageFromBirthDate(birthDate, clinicToday()) ?? 0,
    gender: text(row.gender) === 'ERKEK' ? 'ERKEK' : 'KADIN',
    phone: text(row.phone),
    email: text(row.email),
    occupation: text(row.profession),
    education: text(anamnesis?.education) || text(row.education),
    maritalStatus: (text(row.marital_status) as Client['maritalStatus']) || '',
    emergencyContact: {
      name: text(jsonObject(row.emergency_contact).name),
      phone: text(jsonObject(row.emergency_contact).phone),
      relation: text(jsonObject(row.emergency_contact).relation),
    },
    presentingComplaint: text(anamnesis?.reason),
    medicalHistory: text(anamnesis?.medical_history),
    psychiatricHistory: text(anamnesis?.previous_applications),
    medications: text(anamnesis?.medications),
    familyHistory: text(anamnesis?.family_history),
    allergiesNotes: text(anamnesis?.allergies_notes),
    diagnoses: jsonArray(anamnesis?.diagnoses),
    status: normalizeClientStatus(text(row.status)),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function normalizeClientStatus(value: string): ClientStatus {
  return value === 'followup' || value === 'completed' || value === 'archived' ? value : 'active';
}

/* ------------------------------------------------------------------ appointments */

/** Europe/Istanbul sabit +03:00 (2016'dan beri yaz saati uygulanmıyor). */
function istanbulToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${date}T${time}:00+03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isoToIstanbul(iso: string): { date: string; time: string } {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return { date: clinicToday(), time: '09:00' };
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(parsed);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

export function appointmentToRow(appointment: Appointment, ctx: CloudContext): Row {
  const startAt = istanbulToIso(appointment.date, appointment.time) ?? new Date().toISOString();
  const endAt = new Date(new Date(startAt).getTime() + Math.max(5, appointment.durationMinutes) * 60_000).toISOString();
  return {
    id: resolve(ctx, appointment.id),
    client_id: resolve(ctx, appointment.clientId),
    organization_id: ctx.organizationId,
    owner_user_id: ctx.userId,
    created_by: ctx.userId,
    title: `${appointment.clientName} · ${appointment.sessionType}`.slice(0, 180),
    start_at: startAt,
    end_at: endAt,
    status: appointment.status === 'noshow' ? 'no_show' : appointment.status,
    location: appointment.location,
    description: nullableText(appointment.notes),
    fee: appointment.fee ?? null,
    payment_status: appointment.paymentStatus,
  };
}

export function rowToAppointment(row: Row): Appointment {
  const { date, time } = isoToIstanbul(text(row.start_at));
  const start = new Date(text(row.start_at)).getTime();
  const end = new Date(text(row.end_at)).getTime();
  const duration = Number.isFinite(start) && Number.isFinite(end) ? Math.round((end - start) / 60_000) : 50;
  const title = text(row.title);
  const [clientName, sessionType] = title.includes(' · ') ? title.split(' · ') : [title, 'Bireysel Terapi'];
  return {
    id: text(row.id),
    clientId: text(row.client_id),
    clientName: clientName ?? '',
    date,
    time,
    durationMinutes: duration,
    sessionType: (sessionType as SessionType) || 'Bireysel Terapi',
    location: (text(row.location) as Appointment['location']) || 'Klinik (Yüz Yüze)',
    status: (text(row.status) === 'no_show' ? 'noshow' : (text(row.status) as AppointmentStatus)) || 'scheduled',
    notes: text(row.description) || undefined,
    fee: optionalNum(row.fee),
    paymentStatus: (text(row.payment_status) as PaymentStatus) || 'pending',
    createdAt: text(row.created_at),
  };
}

/* ------------------------------------------------------------------ sessions */

export function sessionToRow(session: SoapSession, ctx: CloudContext): Row {
  return {
    id: resolve(ctx, session.id),
    client_id: resolve(ctx, session.clientId),
    organization_id: ctx.organizationId,
    owner_user_id: ctx.userId,
    created_by: ctx.userId,
    appointment_id: optionalResolve(ctx, session.appointmentId),
    session_number: session.sessionNumber,
    date: session.date,
    start_time: /^\d{2}:\d{2}$/.test(session.startTime) ? `${session.startTime}:00` : null,
    duration_minutes: session.durationMinutes,
    type: session.sessionType,
    session_type: session.sessionType,
    notes: session.subjective,
    observation: session.objective,
    key_points: session.assessment,
    plan: session.plan,
    follow_up: session.homework ?? null,
    homework: session.homework ?? null,
    risk_level: session.riskLevel,
    risk_notes: session.riskNotes ?? null,
    fee: session.fee ?? null,
    payment_status: session.paymentStatus,
    // P0-5 — imza/kilit/revizyon alanları (kilitli satırı DB trigger'ı korur)
    status: session.lockedAt ? 'locked' : session.status ?? 'draft',
    revision: session.revision ?? 1,
    signed_at: session.signedAt ?? null,
    locked_at: session.lockedAt ?? null,
    amendment_of: optionalResolve(ctx, session.amendmentOf),
    amendment_reason: session.amendmentReason ?? null,
  };
}

export function rowToSession(row: Row): SoapSession {
  const startTime = text(row.start_time).slice(0, 5);
  return {
    id: text(row.id),
    clientId: text(row.client_id),
    clientName: text(row.client_name),
    sessionNumber: num(row.session_number, 1),
    date: text(row.date),
    startTime: startTime || '09:00',
    durationMinutes: num(row.duration_minutes, num(row.duration, 50)),
    sessionType: (text(row.session_type) || text(row.type)) as SessionType,
    subjective: text(row.notes),
    objective: text(row.observation),
    assessment: text(row.key_points),
    plan: text(row.plan),
    riskLevel: (text(row.risk_level) as RiskLevel) || 'none',
    riskNotes: text(row.risk_notes) || undefined,
    homework: text(row.homework) || text(row.follow_up) || undefined,
    fee: optionalNum(row.fee),
    paymentStatus: (text(row.payment_status) as PaymentStatus) || 'pending',
    appointmentId: text(row.appointment_id) || undefined,
    status: (text(row.status) as SoapSession['status']) || 'draft',
    revision: optionalNum(row.revision),
    amendmentOf: text(row.amendment_of) || undefined,
    amendmentReason: text(row.amendment_reason) || undefined,
    supersededBy: text(row.superseded_by) || undefined,
    signedAt: text(row.signed_at) || undefined,
    lockedAt: text(row.locked_at) || undefined,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

/* ------------------------------------------------------------------ tests */

export type TestKind = 'bdi' | 'bai' | 'scl90' | 'screening';

export function testToRows(
  kind: TestKind,
  result: BeckDepressionResult | BeckAnxietyResult | Scl90Result | RapidScreeningResult,
  ctx: CloudContext,
): { administration: Row; result: Row } {
  const clientId = 'clientId' in result ? result.clientId : undefined;
  if (!clientId) throw new Error('Buluta kaydetmek için kayıtlı danışan dosyası seçin.');
  const date =
    kind === 'screening'
      ? (result as RapidScreeningResult).testDate
      : (result as BeckDepressionResult).testDate;
  const definitionKey: keyof typeof SYSTEM_TEST_DEFINITIONS =
    kind === 'bdi' ? 'bdi'
      : kind === 'bai' ? 'bai'
        : kind === 'scl90' ? 'scl90'
          : (result as RapidScreeningResult).type === 'gad7' ? 'gad7' : 'phq9';

  return {
    administration: {
      id: resolve(ctx, result.id),
      client_id: optionalResolve(ctx, clientId),
      organization_id: ctx.organizationId,
      test_definition_id: SYSTEM_TEST_DEFINITIONS[definitionKey],
      administration_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : clinicToday(),
      status: 'completed',
      instrument_version: nullableText((result as { instrumentVersion?: string }).instrumentVersion),
      scoring_version: nullableText((result as { scoringVersion?: string }).scoringVersion),
      revision: (result as { revision?: number }).revision ?? 1,
      amendment_of: optionalResolve(ctx, (result as { revisionOf?: string }).revisionOf),
      notes: nullableText((result as { notes?: string }).notes),
      created_by: ctx.userId,
    },
    result: {
      // test_results has a separate UUID primary key but no unique constraint
      // on test_administration_id. Give retries the same durable result ID.
      id: resolve(ctx, `test_result_${result.id}`),
      test_administration_id: resolve(ctx, result.id),
      organization_id: ctx.organizationId,
      result_data: { kind, scale: definitionKey, ...result },
      summary: summarizeTest(kind, result),
    },
  };
}

function summarizeTest(
  kind: TestKind,
  result: BeckDepressionResult | BeckAnxietyResult | Scl90Result | RapidScreeningResult,
): string {
  if (kind === 'scl90') {
    const scl = result as Scl90Result;
    return `SCL-90-R · GSI ${scl.gsi} · PST ${scl.pst}`.slice(0, 500);
  }
  if (kind === 'screening') {
    const screening = result as RapidScreeningResult;
    return `${screening.type.toUpperCase()} · ${screening.totalScore} · ${rapidScoreContext(screening)}`.slice(0, 500);
  }
  if (kind === 'bdi') {
    const bdi = result as BeckDepressionResult;
    return `BDI · ${bdi.totalScore} · ${beckDepressionScoreContext(bdi)}`.slice(0, 500);
  }
  const bai = result as BeckAnxietyResult;
  return `BAI · ${bai.totalScore} · ${beckAnxietyScoreContext(bai)}`.slice(0, 500);
}

export type DecodedTest =
  | { kind: 'bdi'; value: BeckDepressionResult }
  | { kind: 'bai'; value: BeckAnxietyResult }
  | { kind: 'scl90'; value: Scl90Result }
  | { kind: 'screening'; value: RapidScreeningResult };

/** result_data içindeki tam nesne geri okunur; bozuksa null. */
export function decodeTestRow(row: Row, clientName: string): DecodedTest | null {
  const data = jsonObject(row.result_data);
  const kind = text(data.kind) as TestKind | '';
  if (!kind) return null;
  // The JSON payload may contain a device-local client ID. The parent row is
  // authoritative: another browser must attach this result to the cloud UUID.
  const value = {
    ...data,
    id: text(row.test_administration_id) || text(row.id),
    clientId: text(row.client_id) || undefined,
    clientName,
  } as Row;
  delete value.kind;
  try {
    if (kind === 'bdi') {
      const decoded = value as unknown as BeckDepressionResult;
      assertBeckDepressionResultIntegrity(decoded);
      return { kind, value: decoded };
    }
    if (kind === 'bai') {
      const decoded = value as unknown as BeckAnxietyResult;
      assertBeckAnxietyResultIntegrity(decoded);
      return { kind, value: decoded };
    }
    if (kind === 'scl90') {
      const decoded = value as unknown as Scl90Result;
      assertScl90ResultIntegrity(decoded);
      return { kind, value: decoded };
    }
    if (kind === 'screening') {
      const decoded = value as unknown as RapidScreeningResult;
      assertRapidScreeningResultIntegrity(decoded);
      return { kind, value: decoded };
    }
  } catch {
    // A current-version cloud payload with inconsistent derived fields must not
    // enter histories or reports. Historical versions remain readable through
    // each instrument's explicit compatibility policy.
    return null;
  }
  return null;
}

/* ------------------------------------------------------------------ reports */

export function reportToRow(report: ClinicalReport, ctx: CloudContext): Row {
  return {
    id: resolve(ctx, report.id),
    client_id: optionalResolve(ctx, report.clientId),
    organization_id: ctx.organizationId,
    created_by: ctx.userId,
    title: report.reportTitle.slice(0, 180),
    content: {
      version: 1,
      reportType: report.reportType,
      reportDate: report.reportDate,
      evaluator: report.evaluator,
      clientName: report.clientName,
      clientGender: report.clientGender,
      clientAge: report.clientAge ?? null,
      sections: report.sections,
      recommendations: report.recommendations,
      formalDiagnosis: report.formalDiagnosis ?? null,
    },
    status: report.lockedAt ? 'locked' : report.status === 'final' ? 'completed' : 'draft',
    completed_at: report.status === 'final' || report.lockedAt ? report.signedAt ?? report.updatedAt : null,
    revision: report.revision ?? 1,
    signed_at: report.signedAt ?? null,
    locked_at: report.lockedAt ?? null,
    amendment_of: optionalResolve(ctx, report.amendmentOf),
    amendment_reason: report.amendmentReason ?? null,
    source_snapshot: { version: 1, source: 'clinical-store' },
  };
}

export function rowToReport(row: Row): ClinicalReport {
  const content = jsonObject(row.content);
  const sections = Array.isArray(content.sections) ? (content.sections as ReportSection[]) : [];
  return {
    id: text(row.id),
    clientId: text(row.client_id) || undefined,
    clientName: text(content.clientName),
    clientGender: text(content.clientGender) === 'ERKEK' ? 'ERKEK' : 'KADIN',
    clientAge: optionalNum(content.clientAge),
    reportType: (text(content.reportType) as ClinicalReportType) || 'comprehensive',
    reportTitle: text(row.title),
    reportDate: text(content.reportDate) || clinicToday(),
    evaluator: text(content.evaluator),
    sections,
    recommendations: jsonArray(content.recommendations),
    formalDiagnosis: text(content.formalDiagnosis) || undefined,
    status: text(row.status) === 'draft' ? 'draft' : 'final',
    revision: optionalNum(row.revision),
    amendmentOf: text(row.amendment_of) || undefined,
    amendmentReason: text(row.amendment_reason) || undefined,
    supersededBy: text(row.superseded_by) || undefined,
    signedAt: text(row.signed_at) || undefined,
    lockedAt: text(row.locked_at) || undefined,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

/* ------------------------------------------------------------------ practice */

export function noteToRow(note: PracticeNote, ctx: CloudContext): Row {
  return {
    id: resolve(ctx, note.id),
    client_id: resolve(ctx, note.clientId),
    organization_id: ctx.organizationId,
    created_by: ctx.userId,
    content: note.content,
    is_pinned: note.pinned,
  };
}

export function rowToNote(row: Row): PracticeNote {
  return {
    id: text(row.id),
    clientId: text(row.client_id),
    content: text(row.content),
    pinned: row.is_pinned === true,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function taskToRow(task: PracticeTask, ctx: CloudContext): Row {
  return {
    id: resolve(ctx, task.id),
    client_id: optionalResolve(ctx, task.clientId),
    organization_id: ctx.organizationId,
    created_by: ctx.userId,
    assigned_to: ctx.userId,
    title: task.title.slice(0, 180),
    description: nullableText(task.description),
    due_date: task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : null,
    status: task.status,
    priority: task.priority,
  };
}

export function rowToTask(row: Row): PracticeTask {
  return {
    id: text(row.id),
    clientId: text(row.client_id) || undefined,
    title: text(row.title),
    description: text(row.description) || undefined,
    dueDate: text(row.due_date) || undefined,
    status: (text(row.status) as TaskStatus) || 'todo',
    priority: (text(row.priority) as TaskPriority) || 'medium',
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function documentToRow(doc: PracticeDocument, ctx: CloudContext, storagePath?: string): Row {
  return {
    id: resolve(ctx, doc.id),
    client_id: resolve(ctx, doc.clientId),
    organization_id: ctx.organizationId,
    created_by: ctx.userId,
    file_path: storagePath ?? doc.storagePath ?? `local/${doc.id}`,
    file_name: doc.fileName,
    mime_type: doc.mimeType,
    size_bytes: Math.max(0, Math.round(doc.sizeBytes)),
    description: nullableText(doc.description),
  };
}

export function rowToDocument(row: Row): PracticeDocument {
  return {
    id: text(row.id),
    clientId: text(row.client_id),
    fileName: text(row.file_name),
    mimeType: text(row.mime_type),
    sizeBytes: num(row.size_bytes),
    description: text(row.description) || undefined,
    storagePath: text(row.file_path) || undefined,
    createdAt: text(row.created_at),
  };
}

export function settingsToRow(settings: PracticeSettings, ctx: CloudContext): Row {
  return {
    created_by: ctx.userId,
    organization_id: ctx.organizationId,
    letterhead: { ...settings, logoDataUrl: undefined, signatureDataUrl: undefined },
  };
}

export function rowToSettings(row: Row): Partial<PracticeSettings> {
  const letterhead = jsonObject(row.letterhead);
  const pick = (key: keyof PracticeSettings) => {
    const value = letterhead[key];
    return typeof value === 'string' ? value : undefined;
  };
  const fee = letterhead.defaultFee;
  return {
    evaluatorName: pick('evaluatorName'),
    title: pick('title'),
    clinicName: pick('clinicName'),
    phone: pick('phone'),
    email: pick('email'),
    address: pick('address'),
    letterhead: pick('letterhead'),
    defaultFee: typeof fee === 'number' ? fee : undefined,
  };
}

/* ------------------------------------------------------------------ formulation / safety plan */

export function formulationToRow(item: CaseFormulation, ctx: CloudContext): Row {
  return {
    // Old local forms may have no ID. Use the durable per-client mapping so
    // migration retries do not create a second record for the same file.
    id: resolve(ctx, item.id ?? `form_${item.clientId}`),
    client_id: resolve(ctx, item.clientId),
    organization_id: ctx.organizationId,
    created_by: ctx.userId,
    updated_by: ctx.userId,
    content: { ...item, id: undefined, updatedAt: undefined },
    summary: item.modality ? `Formülasyon · ${item.modality}`.slice(0, 500) : null,
    status: item.status ?? 'draft',
    amendment_of: item.amendmentOf ?? null,
    amendment_reason: item.amendmentReason ?? null,
  };
}

export function rowToFormulation(row: Row): CaseFormulation {
  const content = jsonObject(row.content);
  return {
    clientId: text(row.client_id),
    id: text(row.id),
    modality: text(content.modality),
    predisposing: text(content.predisposing),
    precipitating: text(content.precipitating),
    perpetuating: text(content.perpetuating),
    protective: text(content.protective),
    goals: Array.isArray(content.goals) ? (content.goals as CaseFormulation['goals']) : [],
    reviewDate: text(content.reviewDate),
    updatedAt: text(row.updated_at),
    status: (text(row.status) as CaseFormulation['status']) || 'draft',
    revision: optionalNum(row.revision),
    amendmentOf: text(row.amendment_of) || undefined,
    amendmentReason: text(row.amendment_reason) || undefined,
    supersededBy: text(row.superseded_by) || undefined,
    signedAt: text(row.signed_at) || undefined,
    lockedAt: text(row.locked_at) || undefined,
  };
}

export function safetyPlanToRow(item: SafetyPlan, ctx: CloudContext): Row {
  return {
    id: resolve(ctx, item.id ?? `safe_${item.clientId}`),
    client_id: resolve(ctx, item.clientId),
    organization_id: ctx.organizationId,
    created_by: ctx.userId,
    updated_by: ctx.userId,
    content: { ...item, id: undefined, updatedAt: undefined },
    summary: item.warningSigns ? `Güvenlik planı · ${item.warningSigns.slice(0, 120)}` : null,
    status: item.status ?? 'draft',
    amendment_of: item.amendmentOf ?? null,
    amendment_reason: item.amendmentReason ?? null,
  };
}

export function rowToSafetyPlan(row: Row): SafetyPlan {
  const content = jsonObject(row.content);
  return {
    clientId: text(row.client_id),
    id: text(row.id),
    warningSigns: text(content.warningSigns),
    coping: text(content.coping),
    people: text(content.people),
    professionals: text(content.professionals),
    environment: text(content.environment),
    reasons: text(content.reasons),
    updatedAt: text(row.updated_at),
    status: (text(row.status) as SafetyPlan['status']) || 'draft',
    revision: optionalNum(row.revision),
    amendmentOf: text(row.amendment_of) || undefined,
    amendmentReason: text(row.amendment_reason) || undefined,
    supersededBy: text(row.superseded_by) || undefined,
    signedAt: text(row.signed_at) || undefined,
    lockedAt: text(row.locked_at) || undefined,
  };
}

export type DecodedScl90Dimensions = Scl90DimensionScores;
