/**
 * Klinik Psikoloji ve Değerlendirme Sistemi — Merkezi Veri Deposu (Clinical Store)
 * Yerel depolama, yedek ve dosya silme. Örnek danışan yüklemez.
 * Halil Karaduman · Uzman Psikolog & Geliştirici
 */

import type {
  Client,
  SoapSession,
  Appointment,
  BeckDepressionResult,
  BeckAnxietyResult,
  Scl90Result,
  ClinicalReport,
} from './clinicalTypes';
import { getScreenings, purgeClientPractice, recordAudit, upgradePracticeIds } from './practiceStore';
import { applyIdMap, buildIdMap, isUuid } from './cloud/ids';
import { push as pushCloud, pushNow, remove as removeCloud } from './cloud/sync';
import { anamnesisRowToClientPatch, rowToAppointment, rowToClient, rowToReport, rowToSession, rowToTestRecord } from './cloud/mapping';
import type { AnamnesisRow, AppointmentRow, ClientRow, ReportRow, SessionRow, TestAdministrationRow, TestResultRow } from './cloud/types';
import { MAX_CLIENTS, MAX_SESSIONS, reportStorageError } from './recordRules';

const CLIENTS_KEY = 'psikolog_clients_v2';
const SESSIONS_KEY = 'psikolog_sessions_v2';
const APPOINTMENTS_KEY = 'psikolog_appointments_v2';
const BDI_KEY = 'psikolog_bdi_tests_v2';
const BAI_KEY = 'psikolog_bai_tests_v2';
const SCL90_KEY = 'psikolog_scl90_tests_v2';
const REPORTS_KEY = 'psikolog_reports_v2';

type StoreListener = () => void;
const listeners = new Set<StoreListener>();

function notify() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Store listener error:', e);
    }
  });
}

export function subscribeClinicalStore(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* ==========================================================================
   Store Okuma / Yazma Metodları
   ========================================================================== */

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`LocalStorage read error for ${key}:`, e);
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notify();
  } catch (error) {
    reportStorageError();
    throw new Error('Kayıt bu cihaza yazılamadı. Depo dolu olabilir. Önce yedek indirin.');
  }
}

const LEGACY_DEMO_IDS = ['cli_candan_01', 'cli_mert_02', 'cli_elif_03', 'cli_burak_04'];
const PURGE_FLAG = 'psikolog_legacy_demo_purged_v1';
let initialized = false;

export function initClinicalStore(): void {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;
  if (localStorage.getItem(PURGE_FLAG)) return;
  const clients = getLocal<Client[]>(CLIENTS_KEY, []);
  const demoIds = new Set(clients.filter((client) => LEGACY_DEMO_IDS.includes(client.id)).map((client) => client.id));
  if (demoIds.size) {
    const keep = (clientId: string | undefined) => !clientId || !demoIds.has(clientId);
    setLocal(CLIENTS_KEY, clients.filter((client) => !demoIds.has(client.id)));
    setLocal(SESSIONS_KEY, getLocal<SoapSession[]>(SESSIONS_KEY, []).filter((item) => keep(item.clientId)));
    setLocal(APPOINTMENTS_KEY, getLocal<Appointment[]>(APPOINTMENTS_KEY, []).filter((item) => keep(item.clientId)));
    setLocal(BDI_KEY, getLocal<BeckDepressionResult[]>(BDI_KEY, []).filter((item) => keep(item.clientId)));
    setLocal(BAI_KEY, getLocal<BeckAnxietyResult[]>(BAI_KEY, []).filter((item) => keep(item.clientId)));
    setLocal(SCL90_KEY, getLocal<Scl90Result[]>(SCL90_KEY, []).filter((item) => keep(item.clientId)));
    setLocal(REPORTS_KEY, getLocal<ClinicalReport[]>(REPORTS_KEY, []).filter((item) => keep(item.clientId)));
    for (const id of demoIds) purgeClientPractice(id);
  }
  localStorage.setItem(PURGE_FLAG, '1');
}

/* ------------------------------------------------------------------ */
/*  DANIŞANLAR (Clients)                                              */
/* ------------------------------------------------------------------ */

export function getClients(): Client[] {
  initClinicalStore();
  return getLocal<Client[]>(CLIENTS_KEY, []);
}

export function getClientById(id: string): Client | undefined {
  return getClients().find(c => c.id === id);
}

export function saveClient(client: Client): void {
  const list = getClients();
  const fileNumber = client.fileNumber.trim();
  if (!fileNumber) throw new Error('Dosya numarası eksik.');
  if (list.some((item) => item.fileNumber === fileNumber && item.id !== client.id)) {
    throw new Error('Bu dosya numarası başka bir danışanda kayıtlı.');
  }
  const email = client.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('E-posta geçersiz. Bilinmiyorsa boş bırakın.');
  }
  const idx = list.findIndex(c => c.id === client.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    list[idx] = { ...client, fileNumber, email, updatedAt: now };
  } else {
    list.unshift({ ...client, fileNumber, email, createdAt: now, updatedAt: now });
  }
  setLocal(CLIENTS_KEY, list);
  recordAudit({ action: 'save', entity: 'client', entityId: client.id, summary: `${client.firstName} ${client.lastName}` });
  const saved = list.find((item) => item.id === client.id);
  if (saved) pushCloud({ entity: 'client', record: saved });
}

export function deleteClient(id: string): void {
  setLocal(CLIENTS_KEY, getClients().filter(c => c.id !== id));
  setLocal(SESSIONS_KEY, getSoapSessions().filter(s => s.clientId !== id));
  setLocal(APPOINTMENTS_KEY, getAppointments().filter(a => a.clientId !== id));
  setLocal(BDI_KEY, getBeckDepressionTests().filter(t => t.clientId !== id));
  setLocal(BAI_KEY, getBeckAnxietyTests().filter(t => t.clientId !== id));
  setLocal(SCL90_KEY, getScl90Tests().filter(t => t.clientId !== id));
  setLocal(REPORTS_KEY, getClinicalReports().filter(r => r.clientId !== id));
  purgeClientPractice(id);
  recordAudit({ action: 'delete', entity: 'client', entityId: id, summary: 'Danışan dosyası ve bağlı kayıtlar silindi' });
  removeCloud('client', id);
}

/* ------------------------------------------------------------------ */
/*  SEANS NOTLARI (SOAP Sessions)                                     */
/* ------------------------------------------------------------------ */

export function getSoapSessions(): SoapSession[] {
  initClinicalStore();
  return getLocal<SoapSession[]>(SESSIONS_KEY, []);
}

export function getSessionsByClientId(clientId: string): SoapSession[] {
  return getSoapSessions()
    .filter(s => s.clientId === clientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function saveSoapSession(session: SoapSession): void {
  const list = getSoapSessions();
  const idx = list.findIndex(s => s.id === session.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    list[idx] = { ...session, updatedAt: now };
  } else {
    list.unshift({ ...session, createdAt: now, updatedAt: now });
  }
  setLocal(SESSIONS_KEY, list);
  const saved = list.find((item) => item.id === session.id);
  if (saved) pushCloud({ entity: 'session', record: saved });
}

export function deleteSoapSession(id: string): void {
  const list = getSoapSessions().filter(s => s.id !== id);
  setLocal(SESSIONS_KEY, list);
  removeCloud('session', id);
}

/* ------------------------------------------------------------------ */
/*  RANDEVULAR (Appointments)                                         */
/* ------------------------------------------------------------------ */

export function getAppointments(): Appointment[] {
  initClinicalStore();
  return getLocal<Appointment[]>(APPOINTMENTS_KEY, []);
}

export function saveAppointment(appointment: Appointment): void {
  const list = getAppointments();
  const idx = list.findIndex(a => a.id === appointment.id);
  if (idx >= 0) {
    list[idx] = appointment;
  } else {
    list.push(appointment);
  }
  setLocal(APPOINTMENTS_KEY, list);
  const saved = list.find((item) => item.id === appointment.id);
  if (saved) pushCloud({ entity: 'appointment', record: saved });
}

export function deleteAppointment(id: string): void {
  const list = getAppointments().filter(a => a.id !== id);
  setLocal(APPOINTMENTS_KEY, list);
  removeCloud('appointment', id);
}

/* ------------------------------------------------------------------ */
/*  BECK DEPRESYON (BDI)                                              */
/* ------------------------------------------------------------------ */

export function getBeckDepressionTests(): BeckDepressionResult[] {
  initClinicalStore();
  return getLocal<BeckDepressionResult[]>(BDI_KEY, []);
}

export function saveBeckDepressionTest(test: BeckDepressionResult): void {
  const list = getBeckDepressionTests();
  const idx = list.findIndex(t => t.id === test.id);
  if (idx >= 0) {
    list[idx] = test;
  } else {
    list.unshift(test);
  }
  setLocal(BDI_KEY, list);
  const saved = list.find((item) => item.id === test.id);
  if (saved && saved.clientId) pushCloud({ entity: 'test', record: { kind: 'bdi', ...saved } });
}

export function deleteBeckDepressionTest(id: string): void {
  const list = getBeckDepressionTests().filter(t => t.id !== id);
  setLocal(BDI_KEY, list);
  removeCloud('test', id);
}

/* ------------------------------------------------------------------ */
/*  BECK ANKSİYETE (BAI)                                              */
/* ------------------------------------------------------------------ */

export function getBeckAnxietyTests(): BeckAnxietyResult[] {
  initClinicalStore();
  return getLocal<BeckAnxietyResult[]>(BAI_KEY, []);
}

export function saveBeckAnxietyTest(test: BeckAnxietyResult): void {
  const list = getBeckAnxietyTests();
  const idx = list.findIndex(t => t.id === test.id);
  if (idx >= 0) {
    list[idx] = test;
  } else {
    list.unshift(test);
  }
  setLocal(BAI_KEY, list);
  const saved = list.find((item) => item.id === test.id);
  if (saved && saved.clientId) pushCloud({ entity: 'test', record: { kind: 'bai', ...saved } });
}

export function deleteBeckAnxietyTest(id: string): void {
  const list = getBeckAnxietyTests().filter(t => t.id !== id);
  setLocal(BAI_KEY, list);
  removeCloud('test', id);
}

/* ------------------------------------------------------------------ */
/*  SCL-90-R TESTLERİ                                                 */
/* ------------------------------------------------------------------ */

export function getScl90Tests(): Scl90Result[] {
  initClinicalStore();
  return getLocal<Scl90Result[]>(SCL90_KEY, []);
}

export function saveScl90Test(test: Scl90Result): void {
  const list = getScl90Tests();
  const idx = list.findIndex(t => t.id === test.id);
  if (idx >= 0) {
    list[idx] = test;
  } else {
    list.unshift(test);
  }
  setLocal(SCL90_KEY, list);
  const saved = list.find((item) => item.id === test.id);
  if (saved && saved.clientId) pushCloud({ entity: 'test', record: { kind: 'scl90', ...saved } });
}

export function deleteScl90Test(id: string): void {
  const list = getScl90Tests().filter(t => t.id !== id);
  setLocal(SCL90_KEY, list);
  removeCloud('test', id);
}

/* ------------------------------------------------------------------ */
/*  KLİNİK RAPORLAR (Clinical Reports)                                */
/* ------------------------------------------------------------------ */

export function getClinicalReports(): ClinicalReport[] {
  initClinicalStore();
  return getLocal<ClinicalReport[]>(REPORTS_KEY, []);
}

export function saveClinicalReport(report: ClinicalReport): void {
  const list = getClinicalReports();
  const idx = list.findIndex(r => r.id === report.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    list[idx] = { ...report, updatedAt: now };
  } else {
    list.unshift({ ...report, createdAt: now, updatedAt: now });
  }
  setLocal(REPORTS_KEY, list);
  const saved = list.find((item) => item.id === report.id);
  // Provenance only — the report body already carries the clinical content.
  if (saved && saved.clientId) {
    pushCloud({
      entity: 'report',
      record: saved,
      snapshot: {
        schema: 1,
        origin: 'clinical-store',
        reportType: saved.reportType,
        sectionCount: saved.sections.length,
        recommendationCount: saved.recommendations.length,
        sessionCount: getSessionsByClientId(saved.clientId).length,
      },
    });
  }
}

export function deleteClinicalReport(id: string): void {
  const list = getClinicalReports().filter(r => r.id !== id);
  setLocal(REPORTS_KEY, list);
  removeCloud('report', id);
}

/* ------------------------------------------------------------------ */
/*  YEDEKLEME / DIŞA VE İÇE AKTARMA (Backup & Restore)               */
/* ------------------------------------------------------------------ */

export interface ClinicalBackupBundle {
  version: '2.0';
  exportedAt: string;
  clients: Client[];
  sessions: SoapSession[];
  appointments: Appointment[];
  bdiTests: BeckDepressionResult[];
  baiTests: BeckAnxietyResult[];
  scl90Tests: Scl90Result[];
  reports: ClinicalReport[];
}

export function exportClinicalBackup(): ClinicalBackupBundle {
  return {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    clients: getClients(),
    sessions: getSoapSessions(),
    appointments: getAppointments(),
    bdiTests: getBeckDepressionTests(),
    baiTests: getBeckAnxietyTests(),
    scl90Tests: getScl90Tests(),
    reports: getClinicalReports(),
  };
}

function backupArray<T extends { id?: string }>(value: unknown, label: string, max: number): T[] {
  if (!Array.isArray(value)) throw new Error(`${label} listesi yok.`);
  if (value.length > max) throw new Error(`${label} listesi çok büyük.`);
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string') {
      throw new Error(`${label} kaydı bozuk.`);
    }
  }
  return value as T[];
}

export function importClinicalBackup(bundle: ClinicalBackupBundle): void {
  if (!bundle || bundle.version !== '2.0' || !Array.isArray(bundle.clients)) {
    throw new Error('Geçersiz yedek. Yalnızca bu uygulamanın 2.0 dosyası yüklenir.');
  }
  const clients = backupArray<Client>(bundle.clients, 'Danışan', MAX_CLIENTS);
  for (const client of clients) {
    if (typeof client.firstName !== 'string' || typeof client.lastName !== 'string' || !client.firstName.trim()) {
      throw new Error('Yedekte adı olmayan danışan var.');
    }
    const tc = typeof client.tcNumber === 'string' ? client.tcNumber.replace(/\s+/g, '') : '';
    if (tc && !/^\d{11}$/.test(tc)) throw new Error('Yedekte geçersiz kimlik numarası var.');
  }
  const fileNumbers = new Set<string>();
  for (const client of clients) {
    const fileNumber = typeof client.fileNumber === 'string' ? client.fileNumber.trim() : '';
    if (!fileNumber || fileNumbers.has(fileNumber)) throw new Error('Yedekte çakışan veya boş dosya numarası var.');
    fileNumbers.add(fileNumber);
  }
  setLocal(CLIENTS_KEY, clients);
  setLocal(SESSIONS_KEY, backupArray<SoapSession>(bundle.sessions || [], 'Seans', MAX_SESSIONS));
  setLocal(APPOINTMENTS_KEY, backupArray<Appointment>(bundle.appointments || [], 'Randevu', MAX_SESSIONS));
  setLocal(BDI_KEY, backupArray<BeckDepressionResult>(bundle.bdiTests || [], 'Beck Depresyon', MAX_SESSIONS));
  setLocal(BAI_KEY, backupArray<BeckAnxietyResult>(bundle.baiTests || [], 'Beck Anksiyete', MAX_SESSIONS));
  setLocal(SCL90_KEY, backupArray<Scl90Result>(bundle.scl90Tests || [], 'SCL-90-R', MAX_SESSIONS));
  setLocal(REPORTS_KEY, backupArray<ClinicalReport>(bundle.reports || [], 'Rapor', MAX_CLIENTS));
  recordAudit({ action: 'import', entity: 'backup', entityId: 'clinical', summary: 'Klinik yedek geri yüklendi' });
}

export function clearAllClinicalData(): void {
  setLocal(CLIENTS_KEY, []);
  setLocal(SESSIONS_KEY, []);
  setLocal(APPOINTMENTS_KEY, []);
  setLocal(BDI_KEY, []);
  setLocal(BAI_KEY, []);
  setLocal(SCL90_KEY, []);
  setLocal(REPORTS_KEY, []);
  purgeClientPractice('*');
  localStorage.setItem(PURGE_FLAG, '1');
  recordAudit({ action: 'delete', entity: 'backup', entityId: 'clinical', summary: 'Yerel klinik kayıt temizlendi' });
}

/* ==========================================================================
   BULUT ID YÜKSELTME
   --------------------------------------------------------------------------
   Yerel kayıtlar kısa id'lerle (cli_…, sess_…) tutuluyordu; bulut tabloları
   uuid birincil anahtar kullanıyor. İlk bulut yazımından ÖNCE bir kez
   çalıştırılır: uuid olmayan her kayda uuid atanır ve ona işaret eden tüm
   alanlar aynı geçişte yeniden yazılır. Böylece hiçbir kayıt yetim kalmaz.
   ========================================================================== */

export function ensureCloudIds(): boolean {
  initClinicalStore();

  const clients = getClients();
  const sessions = getSoapSessions();
  const appointments = getAppointments();
  const bdi = getBeckDepressionTests();
  const bai = getBeckAnxietyTests();
  const scl = getScl90Tests();
  const reports = getClinicalReports();
  const screenings = getScreenings();

  const clientMap = buildIdMap(clients);
  const sessionMap = buildIdMap(sessions);
  const appointmentMap = buildIdMap(appointments);
  const bdiMap = buildIdMap(bdi);
  const baiMap = buildIdMap(bai);
  const sclMap = buildIdMap(scl);
  const reportMap = buildIdMap(reports);
  const screeningMap = buildIdMap(screenings);

  const changed =
    clientMap.size + sessionMap.size + appointmentMap.size + bdiMap.size +
    baiMap.size + sclMap.size + reportMap.size + screeningMap.size;
  if (changed === 0) return false;

  setLocal(CLIENTS_KEY, applyIdMap(clients, clientMap, []));
  setLocal(SESSIONS_KEY, applyIdMap(sessions, sessionMap, ['clientId', 'appointmentId']));
  setLocal(APPOINTMENTS_KEY, applyIdMap(appointments, appointmentMap, ['clientId']));
  setLocal(BDI_KEY, applyIdMap(bdi, bdiMap, ['clientId']));
  setLocal(BAI_KEY, applyIdMap(bai, baiMap, ['clientId']));
  setLocal(SCL90_KEY, applyIdMap(scl, sclMap, ['clientId']));
  setLocal(REPORTS_KEY, applyIdMap(reports, reportMap, ['clientId']));

  upgradePracticeIds({
    clients: clientMap,
    notes: new Map<string, string>(),
    tasks: new Map<string, string>(),
    documents: new Map<string, string>(),
    screenings: screeningMap,
  });

  return true;
}

/** True when any local record still uses a non-uuid id. */
export function hasLegacyIds(): boolean {
  return [...getClients(), ...getSoapSessions(), ...getAppointments()].some((row) => !isUuid(row.id));
}

/* ==========================================================================
   BULUT ANLIK GÖRÜNTÜSÜNÜ YEREL ÖNBELLEĞE UYGULA
   --------------------------------------------------------------------------
   Bulut ana kaynaktır. Aynı id'li yerel kayıt bulut satırıyla birleştirilir
   (yalnızca cihazda tutulan alanlar korunur), bulutta olmayan yerel kayıtlar
   ise silinmez — henüz senkronize olmamış olabilirler.
   ========================================================================== */

export type ClinicalCloudSnapshot = {
  clients: ClientRow[];
  anamneses: AnamnesisRow[];
  appointments: AppointmentRow[];
  sessions: SessionRow[];
  tests: { administration: TestAdministrationRow; result: TestResultRow }[];
  reports: ReportRow[];
};

function mergeById<T extends { id: string }>(local: T[], incoming: T[]): T[] {
  const byId = new Map(local.map((row) => [row.id, row]));
  for (const row of incoming) byId.set(row.id, { ...byId.get(row.id), ...row } as T);
  return [...byId.values()];
}

export function applyClinicalCloudSnapshot(snapshot: ClinicalCloudSnapshot): void {
  initClinicalStore();

  const localClients = getClients();
  const anamnesisByClient = new Map(snapshot.anamneses.map((row) => [row.client_id, row]));
  const incomingClients = snapshot.clients.map((row) => {
    const merged = rowToClient(row, localClients.find((item) => item.id === row.id));
    const patch = anamnesisByClient.get(row.id);
    return patch ? { ...merged, ...anamnesisRowToClientPatch(patch) } : merged;
  });
  setLocal(CLIENTS_KEY, mergeById(localClients, incomingClients));

  const localAppointments = getAppointments();
  setLocal(
    APPOINTMENTS_KEY,
    mergeById(
      localAppointments,
      snapshot.appointments.map((row) =>
        rowToAppointment(row, localAppointments.find((item) => item.id === row.id)),
      ),
    ),
  );

  const localSessions = getSoapSessions();
  setLocal(
    SESSIONS_KEY,
    mergeById(
      localSessions,
      snapshot.sessions.map((row) => rowToSession(row, localSessions.find((item) => item.id === row.id))),
    ),
  );

  const bdi: BeckDepressionResult[] = getBeckDepressionTests();
  const bai: BeckAnxietyResult[] = getBeckAnxietyTests();
  const scl: Scl90Result[] = getScl90Tests();
  const incoming = { bdi, bai, scl };
  for (const { administration, result } of snapshot.tests) {
    const data = (result.result_data ?? {}) as { kind?: string };
    if (data.kind === 'bdi') {
      incoming.bdi = mergeById(incoming.bdi, [rowToTestRecord<BeckDepressionResult>(result, administration)]);
    } else if (data.kind === 'bai') {
      incoming.bai = mergeById(incoming.bai, [rowToTestRecord<BeckAnxietyResult>(result, administration)]);
    } else if (data.kind === 'scl90') {
      incoming.scl = mergeById(incoming.scl, [rowToTestRecord<Scl90Result>(result, administration)]);
    }
  }
  setLocal(BDI_KEY, incoming.bdi);
  setLocal(BAI_KEY, incoming.bai);
  setLocal(SCL90_KEY, incoming.scl);

  setLocal(
    REPORTS_KEY,
    mergeById(
      getClinicalReports(),
      snapshot.reports.map((row) => rowToReport(row)).filter((row): row is ClinicalReport => row !== null),
    ),
  );
}

/** Push every local record that the cloud has not seen yet (offline backlog). */
/** Awaited on purpose: the bootstrap must finish writing before it pulls. */
export async function pushLocalRecordsToCloud(): Promise<void> {
  for (const client of getClients()) await pushNow({ entity: 'client', record: client });
  for (const appointment of getAppointments()) await pushNow({ entity: 'appointment', record: appointment });
  for (const session of getSoapSessions()) await pushNow({ entity: 'session', record: session });
  for (const row of getBeckDepressionTests()) {
    if (row.clientId) await pushNow({ entity: 'test', record: { kind: 'bdi', ...row } });
  }
  for (const row of getBeckAnxietyTests()) {
    if (row.clientId) await pushNow({ entity: 'test', record: { kind: 'bai', ...row } });
  }
  for (const row of getScl90Tests()) {
    if (row.clientId) await pushNow({ entity: 'test', record: { kind: 'scl90', ...row } });
  }
  for (const report of getClinicalReports()) {
    if (!report.clientId) continue;
    await pushNow({
      entity: 'report',
      record: report,
      snapshot: {
        schema: 1,
        origin: 'backlog',
        reportType: report.reportType,
        sectionCount: report.sections.length,
        recommendationCount: report.recommendations.length,
      },
    });
  }
}
