import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getClients,
  saveClient,
  deleteClient,
  getSoapSessions,
  saveSoapSession,
  getAppointments,
  saveAppointment,
  exportClinicalBackup,
  importClinicalBackup,
  clearAllClinicalData,
} from '../src/clinical/clinicalStore';
import { getNotes, saveNote } from '../src/clinical/practiceStore';
import type { Client, SoapSession, Appointment } from '../src/clinical/clinicalTypes';
import { configureStorageScope } from '../src/clinical/storageScope';

if (!globalThis.localStorage) {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  };
}

function client(id: string): Client {
  const now = new Date().toISOString();
  return {
    id,
    fileNumber: 'HK-2026-001',
    firstName: 'Ayşe',
    lastName: 'Kaya',
    birthDate: '1990-01-01',
    age: 36,
    gender: 'KADIN',
    phone: '',
    email: '',
    occupation: '',
    education: '',
    maritalStatus: 'Bekar',
    emergencyContact: { name: '', phone: '', relation: '' },
    presentingComplaint: '',
    medicalHistory: '',
    psychiatricHistory: '',
    medications: '',
    familyHistory: '',
    allergiesNotes: '',
    diagnoses: [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

configureStorageScope('test-hesap');

test('boş klinik örnek danışan yüklemez', () => {
  localStorage.clear();
  clearAllClinicalData();
  assert.equal(getClients().length, 0);
  assert.equal(getSoapSessions().length, 0);
});

test('danışan silinince bağlı seans, randevu ve not da silinir', () => {
  clearAllClinicalData();
  saveClient(client('cli_real_1'));
  const now = new Date().toISOString();
  const session: SoapSession = {
    id: 'sess_real_1',
    clientId: 'cli_real_1',
    clientName: 'Ayşe Kaya',
    sessionNumber: 1,
    date: '2026-09-24',
    startTime: '10:00',
    durationMinutes: 50,
    sessionType: 'Bireysel Terapi',
    subjective: 'S',
    objective: 'O',
    assessment: 'A',
    plan: 'P',
    riskLevel: 'none',
    paymentStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  const appointment: Appointment = {
    id: 'app_real_1',
    clientId: 'cli_real_1',
    clientName: 'Ayşe Kaya',
    date: '2026-09-24',
    time: '10:00',
    durationMinutes: 50,
    sessionType: 'Bireysel Terapi',
    location: 'Klinik (Yüz Yüze)',
    status: 'scheduled',
    paymentStatus: 'pending',
    createdAt: now,
  };
  saveSoapSession(session);
  saveAppointment(appointment);
  saveNote({ id: 'note_real_1', clientId: 'cli_real_1', content: 'özel not', pinned: false, createdAt: now, updatedAt: now });
  deleteClient('cli_real_1');
  assert.equal(getClients().some((item) => item.id === 'cli_real_1'), false);
  assert.equal(getSoapSessions().some((item) => item.clientId === 'cli_real_1'), false);
  assert.equal(getAppointments().some((item) => item.clientId === 'cli_real_1'), false);
  assert.equal(getNotes().some((item) => item.clientId === 'cli_real_1'), false);
});

test('yedek gidiş dönüş çalışır, bozuk yedek reddedilir', () => {
  clearAllClinicalData();
  saveClient(client('cli_real_2'));
  const backup = exportClinicalBackup();
  assert.equal(backup.version, '2.0');
  clearAllClinicalData();
  importClinicalBackup(backup);
  assert.equal(getClients().length, 1);
  assert.throws(() => importClinicalBackup({ version: '1.0' } as never));
});
