/**
 * Klinik Psikoloji ve Değerlendirme Sistemi — Merkezi Veri Deposu (Clinical Store)
 * Yerel depolama hesap kapsamı ile çalışır: her oturum kendi kasasını görür.
 * Örnek danışan yüklemez. Yedek al/geri yükle destekler.
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
import { planPracticePurge, purgeClientPractice, recordAudit } from './practiceStore';
import {
  commitScopedWrites,
  onScopeChange,
  readScopedRaw,
  scopedKey,
  watchCrossTab,
  writeScopedRaw,
  type PlannedWrite,
} from './storageScope';
import { MAX_CLIENTS, MAX_SESSIONS, reportStorageError } from './recordRules';

/**
 * Denetim izi hiçbir klinik yazmayı engelleyemez: yazım hatası yutulur,
 * kayıt yine de tamamlanır (kayıt önceliği izden büyüktür).
 */
function audit(action: string, entity: string, entityId: string, summary: string): void {
  try {
    recordAudit({ action, entity, entityId, summary });
  } catch {
    /* yutulur — bilinçli */
  }
}

const CLIENTS_KEY = 'clients';
const SESSIONS_KEY = 'sessions';
const APPOINTMENTS_KEY = 'appointments';
const BDI_KEY = 'bdi';
const BAI_KEY = 'bai';
const SCL90_KEY = 'scl90';
const REPORTS_KEY = 'reports';

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

/**
 * Depo doğrudan yazıldığında (yedek geri yükleme / temizleme) ekranların
 * yeniden okuması için: store'un kendisi yazmadığı için aboneyi biz uyandırırız.
 */
export function notifyClinicalStore(): void {
  notify();
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
    const raw = readScopedRaw(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`Yerel kayıt okunamadı (${key}):`, e);
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    writeScopedRaw(key, JSON.stringify(value));
    notify();
  } catch {
    reportStorageError();
    throw new Error('Kayıt bu cihaza yazılamadı. Depo dolu olabilir. Önce yedek indirin.');
  }
}

const LEGACY_DEMO_IDS = ['cli_candan_01', 'cli_mert_02', 'cli_elif_03', 'cli_burak_04'];
const PURGE_FLAG = 'demo_purged';
const purgedScopes = new Set<string>();

function initClinicalStore(): void {
  if (typeof globalThis === 'undefined') return;
  const marker = scopedKey(PURGE_FLAG);
  if (purgedScopes.has(marker)) return;
  purgedScopes.add(marker);
  try {
    if (readScopedRaw(PURGE_FLAG)) return;
    const clients = getLocal<Client[]>(CLIENTS_KEY, []);
    const demoIds = new Set(clients.filter((client) => LEGACY_DEMO_IDS.includes(client.id)).map((client) => client.id));
    if (demoIds.size) {
      const keep = (clientId: string | undefined) => !clientId || !demoIds.has(clientId);
      setLocal(CLIENTS_KEY, clients.filter((client) => !demoIds.has(client.id)));
      setLocal(SESSIONS_KEY, getSoapSessions().filter((item) => keep(item.clientId)));
      setLocal(APPOINTMENTS_KEY, getLocal<Appointment[]>(APPOINTMENTS_KEY, []).filter((item) => keep(item.clientId)));
      setLocal(BDI_KEY, getLocal<BeckDepressionResult[]>(BDI_KEY, []).filter((item) => keep(item.clientId)));
      setLocal(BAI_KEY, getLocal<BeckAnxietyResult[]>(BAI_KEY, []).filter((item) => keep(item.clientId)));
      setLocal(SCL90_KEY, getLocal<Scl90Result[]>(SCL90_KEY, []).filter((item) => keep(item.clientId)));
      setLocal(REPORTS_KEY, getLocal<ClinicalReport[]>(REPORTS_KEY, []).filter((item) => keep(item.clientId)));
      purgeClientPractice([...demoIds]);
    }
    writeScopedRaw(PURGE_FLAG, '1');
  } catch {
    /* örnek kayıt temizliği yapılamazsa çalışma alanı yine de açılır */
  }
}

// Hesap kapsamı bağlandığında/degistiğinde bu modülün aboneleri yenilenir.
onScopeChange(() => {
  purgedScopes.clear();
  initClinicalStore();
  notify();
});

// İkinci sekmede yapılan kayıt, bu sekmede bayat veri olarak kalmasın.
watchCrossTab(() => notify());

export { initClinicalStore };

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

/** Dosya silmenin tamamı tek yazımda uygulanır; yarısı silinmiş dosya bırakılmaz. */
export function planClientDeletion(id: string): PlannedWrite[] {
  return [
    [CLIENTS_KEY, JSON.stringify(getClients().filter((item) => item.id !== id))],
    [SESSIONS_KEY, JSON.stringify(getSoapSessions().filter((item) => item.clientId !== id))],
    [APPOINTMENTS_KEY, JSON.stringify(getAppointments().filter((item) => item.clientId !== id))],
    [BDI_KEY, JSON.stringify(getBeckDepressionTests().filter((item) => item.clientId !== id))],
    [BAI_KEY, JSON.stringify(getBeckAnxietyTests().filter((item) => item.clientId !== id))],
    [SCL90_KEY, JSON.stringify(getScl90Tests().filter((item) => item.clientId !== id))],
    [REPORTS_KEY, JSON.stringify(getClinicalReports().filter((item) => item.clientId !== id))],
    ...planPracticePurge(id),
  ];
}

export function deleteClient(id: string): void {
  commitScopedWrites(planClientDeletion(id));
  notify();
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
  audit(idx >= 0 ? 'update' : 'save', 'session', session.id, `Seans notu ${session.sessionNumber ?? ''} · ${session.clientId}`.trim());
}

export function deleteSoapSession(id: string): void {
  const list = getSoapSessions().filter(s => s.id !== id);
  setLocal(SESSIONS_KEY, list);
  audit('delete', 'session', id, 'Seans notu silindi');
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
  audit(idx >= 0 ? 'update' : 'save', 'appointment', appointment.id, `Randevu ${appointment.date} ${appointment.time} · ${appointment.status}`);
}

export function deleteAppointment(id: string): void {
  const list = getAppointments().filter(a => a.id !== id);
  setLocal(APPOINTMENTS_KEY, list);
  audit('delete', 'appointment', id, 'Randevu silindi');
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
  audit(idx >= 0 ? 'update' : 'save', 'test', test.id, `BDI sonucu kaydedildi · ${test.totalScore}`);
}

export function deleteBeckDepressionTest(id: string): void {
  const list = getBeckDepressionTests().filter(t => t.id !== id);
  setLocal(BDI_KEY, list);
  audit('delete', 'test', id, 'BDI sonucu silindi');
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
  audit(idx >= 0 ? 'update' : 'save', 'test', test.id, `BAI sonucu kaydedildi · ${test.totalScore}`);
}

export function deleteBeckAnxietyTest(id: string): void {
  const list = getBeckAnxietyTests().filter(t => t.id !== id);
  setLocal(BAI_KEY, list);
  audit('delete', 'test', id, 'BAI sonucu silindi');
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
  audit(idx >= 0 ? 'update' : 'save', 'test', test.id, `SCL-90-R sonucu kaydedildi · GSI ${test.gsi.toFixed(2)}`);
}

export function deleteScl90Test(id: string): void {
  const list = getScl90Tests().filter(t => t.id !== id);
  setLocal(SCL90_KEY, list);
  audit('delete', 'test', id, 'SCL-90-R sonucu silindi');
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
  audit(idx >= 0 ? 'update' : 'save', 'report', report.id, `Rapor · ${report.clientName} · ${report.reportType}`);
}

export function deleteClinicalReport(id: string): void {
  const list = getClinicalReports().filter(r => r.id !== id);
  setLocal(REPORTS_KEY, list);
  audit('delete', 'report', id, 'Rapor silindi');
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

/**
 * Yedekten yüklemeyi hazırlar ama yazmaz. Veri Management modalı klinik ve
 * uygulama planlarını tek transaction'da commit eder; böylece kota hatasında
 * dosyanın yarısı değişmiş olmaz.
 */
export function planClinicalImport(bundle: ClinicalBackupBundle): PlannedWrite[] {
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
  return [
    [CLIENTS_KEY, JSON.stringify(clients)],
    [SESSIONS_KEY, JSON.stringify(backupArray<SoapSession>(bundle.sessions || [], 'Seans', MAX_SESSIONS))],
    [APPOINTMENTS_KEY, JSON.stringify(backupArray<Appointment>(bundle.appointments || [], 'Randevu', MAX_SESSIONS))],
    [BDI_KEY, JSON.stringify(backupArray<BeckDepressionResult>(bundle.bdiTests || [], 'Beck Depresyon', MAX_SESSIONS))],
    [BAI_KEY, JSON.stringify(backupArray<BeckAnxietyResult>(bundle.baiTests || [], 'Beck Anksiyete', MAX_SESSIONS))],
    [SCL90_KEY, JSON.stringify(backupArray<Scl90Result>(bundle.scl90Tests || [], 'SCL-90-R', MAX_SESSIONS))],
    [REPORTS_KEY, JSON.stringify(backupArray<ClinicalReport>(bundle.reports || [], 'Rapor', MAX_CLIENTS))],
  ];
}

export function importClinicalBackup(bundle: ClinicalBackupBundle): void {
  commitScopedWrites(planClinicalImport(bundle));
  notify();
  recordAudit({ action: 'import', entity: 'backup', entityId: 'clinical', summary: 'Klinik yedek geri yüklendi' });
}

export function planClinicalClear(): PlannedWrite[] {
  return [
    [CLIENTS_KEY, '[]'],
    [SESSIONS_KEY, '[]'],
    [APPOINTMENTS_KEY, '[]'],
    [BDI_KEY, '[]'],
    [BAI_KEY, '[]'],
    [SCL90_KEY, '[]'],
    [REPORTS_KEY, '[]'],
  ];
}

export function clearAllClinicalData(): void {
  commitScopedWrites(planClinicalClear());
  writeScopedRaw(PURGE_FLAG, '1');
  notify();
  recordAudit({ action: 'delete', entity: 'backup', entityId: 'clinical', summary: 'Yerel klinik kayıt temizlendi' });
}
