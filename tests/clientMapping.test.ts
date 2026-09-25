import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCanonicalClientId,
  isLegacyClientId,
  loadClientIdMap,
  rememberClientIdMapping,
  resolveClientId,
} from '../src/clinical/clientIds';
import {
  clearAllClinicalData,
  getClientById,
  getSoapSessions,
  remapClinicalClientId,
  saveClient,
  saveSoapSession,
} from '../src/clinical/clinicalStore';
import { getNotes, remapPracticeClientId, saveNote } from '../src/clinical/practiceStore';
import type { Client, SoapSession } from '../src/clinical/clinicalTypes';

if (!globalThis.localStorage) {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

function client(id: string): Client {
  const now = new Date().toISOString();
  return {
    id,
    fileNumber: 'HK-2026-010',
    firstName: 'Ahmet',
    lastName: 'CE',
    birthDate: '1990-01-01',
    age: 36,
    gender: 'ERKEK',
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

test('legacy cli_* is not a canonical client id', () => {
  assert.equal(isLegacyClientId('cli_abc_1'), true);
  assert.equal(isCanonicalClientId('cli_abc_1'), false);
  assert.equal(isCanonicalClientId('22222222-2222-4222-8222-222222222222'), true);
});

test('remap keeps sessions and notes attached after UUID promotion', () => {
  localStorage.clear();
  clearAllClinicalData();
  saveClient(client('cli_ahmet_1'));
  const now = new Date().toISOString();
  const session: SoapSession = {
    id: 'sess_1',
    clientId: 'cli_ahmet_1',
    clientName: 'Ahmet CE',
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
  saveSoapSession(session);
  saveNote({
    id: 'note_1',
    clientId: 'cli_ahmet_1',
    content: 'Not',
    pinned: false,
    createdAt: now,
    updatedAt: now,
  });
  const uuid = '22222222-2222-4222-8222-222222222222';
  remapClinicalClientId('cli_ahmet_1', uuid);
  remapPracticeClientId('cli_ahmet_1', uuid);
  rememberClientIdMapping('cli_ahmet_1', uuid);
  assert.equal(getClientById(uuid)?.firstName, 'Ahmet');
  assert.equal(getClientById('cli_ahmet_1')?.id, uuid);
  assert.equal(getSoapSessions()[0]?.clientId, uuid);
  assert.equal(getNotes()[0]?.clientId, uuid);
  assert.equal(resolveClientId('cli_ahmet_1'), uuid);
  assert.equal(loadClientIdMap()['cli_ahmet_1'], uuid);
});
