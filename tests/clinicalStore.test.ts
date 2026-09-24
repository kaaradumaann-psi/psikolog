import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getClients,
  saveClient,
  deleteClient,
  getSoapSessions,
  saveSoapSession,
  deleteSoapSession,
  getAppointments,
  saveAppointment,
  deleteAppointment,
  getBeckDepressionTests,
  saveBeckDepressionTest,
  getBeckAnxietyTests,
  saveBeckAnxietyTest,
  getScl90Tests,
  saveScl90Test,
  getClinicalReports,
  saveClinicalReport,
  exportClinicalBackup,
  importClinicalBackup,
  resetToDemoData,
} from '../src/clinical/clinicalStore';
import type { Client, SoapSession, Appointment, ClinicalReport } from '../src/clinical/clinicalTypes';
import { calculateBeckDepression } from '../src/clinical/beckDepression';
import { calculateBeckAnxiety } from '../src/clinical/beckAnxiety';
import { calculateScl90 } from '../src/clinical/scl90';

// Mock localStorage if in node environment
if (typeof window === 'undefined' || !globalThis.localStorage) {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
}

test('ClinicalStore: resetToDemoData populates realistic clients and sessions', () => {
  resetToDemoData();
  const clients = getClients();
  const sessions = getSoapSessions();
  const appointments = getAppointments();

  assert.ok(clients.length >= 4);
  assert.ok(sessions.length >= 3);
  assert.ok(appointments.length >= 3);

  const c1 = clients.find(c => c.firstName === 'Candan');
  assert.ok(c1);
  assert.equal(c1.fileNumber, 'HK-2026-001');
  assert.equal(c1.gender, 'KADIN');
});

test('ClinicalStore: CRUD operations on Client', () => {
  const testClient: Client = {
    id: 'cli_test_999',
    fileNumber: 'HK-2026-999',
    firstName: 'Deneme',
    lastName: 'Kullanici',
    birthDate: '1990-01-01',
    age: 36,
    gender: 'ERKEK',
    phone: '0500 000 00 00',
    email: 'deneme@example.com',
    occupation: 'Test Uzmanı',
    education: 'Doktora',
    maritalStatus: 'Evli',
    emergencyContact: { name: 'Veli', phone: '0500 111 22 33', relation: 'Eş' },
    presentingComplaint: 'Test şikayeti',
    medicalHistory: 'Yok',
    psychiatricHistory: 'Yok',
    medications: 'Yok',
    familyHistory: 'Yok',
    allergiesNotes: 'Yok',
    diagnoses: ['F41.1'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveClient(testClient);
  let list = getClients();
  assert.ok(list.some(c => c.id === 'cli_test_999'));

  deleteClient('cli_test_999');
  list = getClients();
  assert.ok(!list.some(c => c.id === 'cli_test_999'));
});

test('ClinicalStore: SOAP session save and delete', () => {
  const sess: SoapSession = {
    id: 'sess_test_1',
    clientId: 'cli_candan_01',
    clientName: 'Candan Yılmaz',
    sessionNumber: 10,
    date: '2026-09-24',
    startTime: '10:00',
    durationMinutes: 50,
    sessionType: 'Bireysel Terapi',
    subjective: 'Test S',
    objective: 'Test O',
    assessment: 'Test A',
    plan: 'Test P',
    riskLevel: 'low',
    fee: 2500,
    paymentStatus: 'paid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveSoapSession(sess);
  let sessions = getSoapSessions();
  assert.ok(sessions.some(s => s.id === 'sess_test_1'));

  deleteSoapSession('sess_test_1');
  sessions = getSoapSessions();
  assert.ok(!sessions.some(s => s.id === 'sess_test_1'));
});

test('ClinicalStore: Backup Export and Import roundtrip', () => {
  resetToDemoData();
  const backup = exportClinicalBackup();
  assert.equal(backup.version, '2.0');
  assert.ok(backup.clients.length > 0);

  // Modify and restore
  globalThis.localStorage.clear();
  importClinicalBackup(backup);

  const restoredClients = getClients();
  assert.equal(restoredClients.length, backup.clients.length);
});
