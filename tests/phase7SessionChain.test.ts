/**
 * PHASE-07 / P0-4 — Randevu → Seans → Not zinciri testleri.
 *
 * PGlite/Supabase gerektirmez: yerel store davranışını ve bulut satır
 * dönüşümünü doğrular. (Canlı Supabase kanıtı DEĞİLDİR.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  completeAppointmentWithSession,
  createClinicalReportRevision,
  createSessionRevision,
  deleteClinicalReport,
  deleteSoapSession,
  getClinicalReports,
  lockClinicalReport,
  saveClinicalReport,
  signClinicalReport,
  findSessionByAppointmentId,
  getAppointments,
  getSoapSessions,
  getSessionsByClientId,
  lockSoapSession,
  saveAppointment,
  saveClient,
  saveSoapSession,
  signSoapSession,
} from '../src/clinical/clinicalStore';
import { sessionToRow } from '../src/clinical/cloud/rows';
import {
  createFormulationRevision,
  createSafetyPlanRevision,
  getFormulation,
  getSafetyPlan,
  lockFormulation,
  lockSafetyPlan,
  saveFormulation,
  saveSafetyPlan,
  signFormulation,
  signSafetyPlan,
} from '../src/clinical/practiceStore';
import { emptyFormulation, emptySafety } from '../src/clinical/casework';
import type { Appointment, Client, ClinicalReport, SoapSession } from '../src/clinical/clinicalTypes';

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

function makeClient(id: string, fileNumber: string): Client {
  const now = new Date().toISOString();
  return {
    id,
    fileNumber,
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

function makeAppointment(id: string, clientId: string, clientName: string, date: string): Appointment {
  return {
    id,
    clientId,
    clientName,
    date,
    time: '14:00',
    durationMinutes: 50,
    sessionType: 'Bireysel Terapi',
    location: 'Klinik (Yüz Yüze)',
    status: 'scheduled',
    notes: '',
    fee: 1500,
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
  };
}

test('P0-4: görüşmeyi tamamla randevudan taslak seans oluşturur ve alanları otomatik doldurur', () => {
  localStorage.clear();
  saveClient(makeClient('cli_1', 'HK-2026-001'));
  saveAppointment(makeAppointment('app_1', 'cli_1', 'Ayşe Kaya', '2026-09-25'));

  const session = completeAppointmentWithSession(getAppointments()[0]!);

  assert.equal(session.appointmentId, 'app_1');
  assert.equal(session.clientId, 'cli_1');
  assert.equal(session.clientName, 'Ayşe Kaya');
  assert.equal(session.sessionNumber, 1);
  assert.equal(session.date, '2026-09-25');
  assert.equal(session.startTime, '14:00');
  assert.equal(session.durationMinutes, 50);
  assert.equal(session.sessionType, 'Bireysel Terapi');
  assert.equal(session.fee, 1500);
  assert.equal(session.status, 'draft');
  assert.equal(session.subjective, '');
  assert.equal(session.createdAt.length > 0, true);

  // Randevu tamamlandı olarak işaretlenir.
  assert.equal(getAppointments()[0]!.status, 'completed');
  // Seans yerel listede tek kayıt olarak görünür.
  assert.equal(getSoapSessions().length, 1);
  assert.equal(findSessionByAppointmentId('app_1')?.id, session.id);
});

test('P0-4: aynı randevu ikinci kez tamamlanınca kopya seans oluşmaz', () => {
  localStorage.clear();
  saveClient(makeClient('cli_1', 'HK-2026-001'));
  saveAppointment(makeAppointment('app_1', 'cli_1', 'Ayşe Kaya', '2026-09-25'));

  const first = completeAppointmentWithSession(getAppointments()[0]!);
  const second = completeAppointmentWithSession(getAppointments()[0]!);

  assert.equal(first.id, second.id);
  assert.equal(getSoapSessions().length, 1);
  assert.equal(getSessionsByClientId('cli_1').length, 1);
});

test('P0-4: aynı danışanda yeni randevu sonraki seans numarasını alır', () => {
  localStorage.clear();
  saveClient(makeClient('cli_1', 'HK-2026-001'));
  saveAppointment(makeAppointment('app_1', 'cli_1', 'Ayşe Kaya', '2026-09-25'));
  saveAppointment(makeAppointment('app_2', 'cli_1', 'Ayşe Kaya', '2026-10-02'));

  completeAppointmentWithSession(getAppointments().find(a => a.id === 'app_1')!);
  const second = completeAppointmentWithSession(getAppointments().find(a => a.id === 'app_2')!);

  assert.equal(second.sessionNumber, 2);
  assert.equal(getSoapSessions().length, 2);
});

test('P0-4: not yeniden kaydedilince yeni kayıt oluşmaz, mevcut seans güncellenir', () => {
  localStorage.clear();
  saveClient(makeClient('cli_1', 'HK-2026-001'));
  saveAppointment(makeAppointment('app_1', 'cli_1', 'Ayşe Kaya', '2026-09-25'));
  const session = completeAppointmentWithSession(getAppointments()[0]!);

  saveSoapSession({ ...session, subjective: 'Danışan haftanın iyi geçtiğini belirtti.' });
  saveSoapSession({ ...session, subjective: 'Güncellenmiş not.', plan: 'Ev ödevi verildi.' });

  const stored = getSoapSessions();
  assert.equal(stored.length, 1);
  assert.equal(stored[0]!.id, session.id);
  assert.equal(stored[0]!.subjective, 'Güncellenmiş not.');
  assert.equal(stored[0]!.plan, 'Ev ödevi verildi.');
  assert.equal(stored[0]!.appointmentId, 'app_1');
});

test('P0-4: seans satırı randevu bağını ve taslak durumunu korur', () => {
  localStorage.clear();
  saveClient(makeClient('cli_1', 'HK-2026-001'));
  saveAppointment(makeAppointment('app_1', 'cli_1', 'Ayşe Kaya', '2026-09-25'));
  const session = completeAppointmentWithSession(getAppointments()[0]!);

  const row = sessionToRow(session, { userId: '11111111-1111-4111-8111-111111111111', organizationId: '22222222-2222-4222-8222-222222222222' });

  assert.equal(row.appointment_id, 'app_1');
  assert.equal(row.status, 'draft');
  assert.equal(row.session_number, 1);
  assert.equal(row.notes, '');
  assert.equal(row.organization_id, '22222222-2222-4222-8222-222222222222');
});

test('P0-5 (hazırlık): imza ve kilit yerel durumu doğru ilerletir, kilitli kayıt yeniden imzalanmaz', () => {
  localStorage.clear();
  saveClient(makeClient('cli_1', 'HK-2026-001'));
  saveAppointment(makeAppointment('app_1', 'cli_1', 'Ayşe Kaya', '2026-09-25'));
  const session = completeAppointmentWithSession(getAppointments()[0]!);

  const signed = signSoapSession(session.id);
  assert.equal(signed?.status, 'signed');
  assert.ok(signed?.signedAt);

  const locked = lockSoapSession(session.id);
  assert.equal(locked?.status, 'locked');
  assert.ok(locked?.lockedAt);
  assert.equal(locked?.signedAt, signed?.signedAt);

  assert.throws(() => signSoapSession(session.id), /Kilitli seans notu imzalanamaz/);
});

test('P0-5 (hazırlık): imzalı seans satırı locked_at alanını buluta taşır', () => {
  localStorage.clear();
  saveClient(makeClient('cli_1', 'HK-2026-001'));
  saveAppointment(makeAppointment('app_1', 'cli_1', 'Ayşe Kaya', '2026-09-25'));
  const session = completeAppointmentWithSession(getAppointments()[0]!);
  const locked: SoapSession = lockSoapSession(session.id)!;

  const row = sessionToRow(locked, { userId: '11111111-1111-4111-8111-111111111111', organizationId: '22222222-2222-4222-8222-222222222222' });
  assert.equal(row.status, 'locked');
  assert.ok(row.locked_at);
});


test('P0-5: kilitli seans notu düzenlenemez, revizyon yeni taslak açar ve eskisini superseded işaretler', () => {
  localStorage.clear();
  saveClient(makeClient('cli_1', 'HK-2026-001'));
  saveAppointment(makeAppointment('app_1', 'cli_1', 'Ayşe Kaya', '2026-09-25'));
  const session = completeAppointmentWithSession(getAppointments()[0]!);
  lockSoapSession(session.id);

  assert.throws(() => saveSoapSession({ ...session, plan: 'değişiklik' }), /Kilitli seans notu değiştirilemez/);
  assert.throws(() => createSessionRevision(session.id, 'ab'), /en az 3 karakter/);

  const revision = createSessionRevision(session.id, 'Seans saatinde düzeltme')!;
  assert.equal(revision.status, 'draft');
  assert.equal(revision.amendmentOf, session.id);
  assert.equal(revision.amendmentReason, 'Seans saatinde düzeltme');
  assert.equal(revision.revision, (session.revision ?? 1) + 1);
  assert.equal(revision.lockedAt, undefined);

  const stored = getSoapSessions().find(item => item.id === session.id)!;
  assert.equal(stored.supersededBy, revision.id);
  assert.equal(stored.status, 'locked');
  // Kilitli sürüm hem kilit hem superseded korumasına girer; kilit mesajı önceliklidir.
  assert.throws(() => saveSoapSession({ ...stored, plan: 'x' }), /Kilitli seans notu değiştirilemez/);
  assert.throws(() => deleteSoapSession(stored.id), /Kilitli seans notu silinemez/);
});

test('P0-5: rapor imza/kilit/revizyon akışı ve kilitli rapor koruması', () => {
  localStorage.clear();
  const now = new Date().toISOString();
  const report: ClinicalReport = {
    id: 'rep_1',
    clientName: 'Ayşe Kaya',
    clientGender: 'KADIN',
    reportType: 'comprehensive',
    reportTitle: 'Kapsamlı Psikolojik Değerlendirme Raporu',
    reportDate: '2026-09-25',
    evaluator: 'Uzm. Psk. Test',
    sections: [],
    recommendations: [],
    createdAt: now,
    updatedAt: now,
  };
  saveClinicalReport(report);
  assert.equal(getClinicalReports()[0]!.status, undefined);

  const signed = signClinicalReport('rep_1')!;
  assert.equal(signed.status, 'final');
  assert.ok(signed.signedAt);

  const locked = lockClinicalReport('rep_1')!;
  assert.ok(locked.lockedAt);

  assert.throws(() => saveClinicalReport({ ...locked, reportTitle: 'değişti' }), /Kilitli rapor değiştirilemez/);
  assert.throws(() => deleteClinicalReport('rep_1'), /Kilitli rapor silinemez/);
  assert.throws(() => createClinicalReportRevision('rep_1', 'ab'), /en az 3 karakter/);

  const revision = createClinicalReportRevision('rep_1', 'Başlık düzeltmesi')!;
  assert.equal(revision.status, 'draft');
  assert.equal(revision.amendmentOf, 'rep_1');
  assert.equal(revision.revision, 2);
  assert.equal(revision.lockedAt, undefined);
  // Kilitli sürüm arşivde korunur.
  assert.equal(getClinicalReports().find(item => item.id === 'rep_1')!.lockedAt, locked.lockedAt);
});

test('P0-5: formülasyon ve güvenlik planı imza/kilit/revizyon akışı', () => {
  localStorage.clear();
  saveFormulation({ ...emptyFormulation('cli_1'), modality: 'BDT' });
  saveSafetyPlan({ ...emptySafety('cli_1'), warningSigns: 'uykusuzluk' });

  assert.equal(getFormulation('cli_1')!.status, undefined);

  const signedFormulation = signFormulation('cli_1')!;
  assert.equal(signedFormulation.status, 'signed');
  const lockedFormulation = lockFormulation('cli_1')!;
  assert.equal(lockedFormulation.status, 'locked');
  assert.throws(() => saveFormulation({ ...lockedFormulation, modality: 'şema' }), /Kilitli formülasyon değiştirilemez/);

  const formulationRevision = createFormulationRevision('cli_1', 'Yaklaşım güncellendi')!;
  assert.equal(formulationRevision.status, 'draft');
  assert.equal(formulationRevision.amendmentOf, lockedFormulation.id);
  assert.equal(formulationRevision.revision, (lockedFormulation.revision ?? 1) + 1);

  const signedSafety = signSafetyPlan('cli_1')!;
  assert.equal(signedSafety.status, 'signed');
  const lockedSafety = lockSafetyPlan('cli_1')!;
  assert.equal(lockedSafety.status, 'locked');
  assert.throws(() => saveSafetyPlan({ ...lockedSafety, coping: 'x' }), /Kilitli güvenlik planı değiştirilemez/);

  const safetyRevision = createSafetyPlanRevision('cli_1', 'Kriz hattı güncellendi')!;
  assert.equal(safetyRevision.amendmentOf, lockedSafety.id);
  assert.equal(getSafetyPlan('cli_1')!.id, safetyRevision.id);
});
