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
import { purgeClientPractice, recordAudit } from './practiceStore';
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
}

export function deleteSoapSession(id: string): void {
  const list = getSoapSessions().filter(s => s.id !== id);
  setLocal(SESSIONS_KEY, list);
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
}

export function deleteAppointment(id: string): void {
  const list = getAppointments().filter(a => a.id !== id);
  setLocal(APPOINTMENTS_KEY, list);
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
}

export function deleteBeckDepressionTest(id: string): void {
  const list = getBeckDepressionTests().filter(t => t.id !== id);
  setLocal(BDI_KEY, list);
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
}

export function deleteBeckAnxietyTest(id: string): void {
  const list = getBeckAnxietyTests().filter(t => t.id !== id);
  setLocal(BAI_KEY, list);
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
}

export function deleteScl90Test(id: string): void {
  const list = getScl90Tests().filter(t => t.id !== id);
  setLocal(SCL90_KEY, list);
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
}

export function deleteClinicalReport(id: string): void {
  const list = getClinicalReports().filter(r => r.id !== id);
  setLocal(REPORTS_KEY, list);
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
