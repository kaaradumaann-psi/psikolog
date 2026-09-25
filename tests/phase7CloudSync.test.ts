/**
 * PHASE-07 / P0-3 — Bulut kalıcılık katmanı sözleşme testleri.
 *
 * Bellek içi bir CloudPort kullanılır: Supabase'e giden sorgu şekli, kimlik
 * eşleme, ağ hatasında sahte "kaydedildi" üretmeme ve kuyruk (outbox) davranışı
 * doğrulanır. Bu test CANLI SUPABASE kanıtı değildir.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CloudFilter, CloudRow, CloudPort } from '../src/clinical/cloud/port';
import {
  activateCloud,
  adoptBaseOutbox,
  bindCloud,
  cacheKey,
  cloudContext,
  cloudWritesExpected,
  deactivateCloud,
  flushOutbox,
  getSyncState,
  failCloudHydration,
  markCloudHydrated,
  queueWrite,
  toCloudId,
  whenIdle,
} from '../src/clinical/cloud/sync';
import { loadSnapshot } from '../src/clinical/cloud/repository';
import { applyClinicalSnapshot, getClients, getSoapSessions, saveClient, saveSoapSession, lockSoapSession, getAppointments, saveAppointment, completeAppointmentWithSession } from '../src/clinical/clinicalStore';
import { applyPracticeSnapshot, getFormulations, getTasks, saveFormulation, saveTask } from '../src/clinical/practiceStore';
import { emptyFormulation } from '../src/clinical/casework';
import { LEGACY_KEYS, migrateLocalDataToCloud, purgeLegacyKeysAfterVerifiedImport } from '../src/clinical/cloud/migrate';
import type { Client, SoapSession } from '../src/clinical/clinicalTypes';

const ORG = '22222222-2222-4222-8222-222222222222';
const USER = '11111111-1111-4111-8111-111111111111';

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

/** Basit bellek içi Supabase taklidi (RLS yok; yalnız sorgu sözleşmesi). */
class MemoryPort implements CloudPort {
  tables = new Map<string, CloudRow[]>();
  offline = false;

  private rows(table: string): CloudRow[] {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table)!;
  }

  private static matches(row: CloudRow, filter: CloudFilter): boolean {
    return Object.entries(filter).every(([key, value]) => (row[key] ?? null) === (value ?? null));
  }

  async select(table: string, filter: CloudFilter = {}): Promise<CloudRow[]> {
    if (this.offline) throw new Error('Failed to fetch');
    return this.rows(table).filter(row => MemoryPort.matches(row, filter)).map(row => ({ ...row }));
  }

  async insert(table: string, rows: CloudRow[]): Promise<CloudRow[]> {
    if (this.offline) throw new Error('Failed to fetch');
    for (const row of rows) {
      const existing = this.rows(table).find(item => item.id === row.id);
      if (existing) {
        const error = new Error('duplicate key value violates unique constraint') as Error & { code?: string };
        error.code = '23505';
        throw error;
      }
      this.rows(table).push({ ...row });
    }
    return rows.map(row => ({ ...row }));
  }

  async update(table: string, patch: CloudRow, filter: CloudFilter): Promise<CloudRow[]> {
    if (this.offline) throw new Error('Failed to fetch');
    const updated: CloudRow[] = [];
    for (const row of this.rows(table)) {
      if (!MemoryPort.matches(row, filter)) continue;
      Object.assign(row, patch);
      updated.push({ ...row });
    }
    return updated;
  }

  async remove(table: string, filter: CloudFilter): Promise<void> {
    if (this.offline) throw new Error('Failed to fetch');
    this.tables.set(table, this.rows(table).filter(row => !MemoryPort.matches(row, filter)));
  }
}

function makeClient(id: string, fileNumber = 'HK-2026-001'): Client {
  const now = new Date().toISOString();
  return {
    id,
    fileNumber,
    firstName: 'Ayşe',
    lastName: 'Kaya',
    birthDate: '1990-01-01',
    age: 36,
    gender: 'KADIN',
    phone: '0555',
    email: 'ayse@example.com',
    occupation: '',
    education: '',
    maritalStatus: 'Bekar',
    emergencyContact: { name: '', phone: '', relation: '' },
    presentingComplaint: '',
    medicalHistory: '',
    psychiatricHistory: '',
    medications: '',
    familyHistory: '',
    allergiesNote: '',
    allergiesNotes: '',
    diagnoses: [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  } as Client;
}

function bind(port: CloudPort): void {
  bindCloud({ userId: USER, organizationId: ORG, resolveId: toCloudId }, port);
}

test('P0-2: yalnız uygulanmış sunucu anlık görüntüsü kapıyı açar; hata boş çalışma alanı açmaz', () => {
  localStorage.clear();
  bind(new MemoryPort());
  assert.equal(getSyncState().hydrated, true);
  assert.equal(getSyncState().userId, USER);
  markCloudHydrated();
  failCloudHydration(new Error('Sunucu yanıt vermedi'));
  assert.equal(getSyncState().phase, 'error');
  assert.equal(getSyncState().hydrated, false);
  assert.equal(getSyncState().lastError, 'Sunucu yanıt vermedi');
  deactivateCloud();
  assert.equal(getSyncState().hydrated, false);
  assert.equal(getSyncState().userId, undefined);
});

test('P0-3: yerel kayıt buluta tek satır olarak yazılır, kimlikler UUID eşlenir', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);

  saveClient(makeClient('cli_1'));
  await whenIdle();

  const rows = await port.select('clients');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.file_number, 'HK-2026-001');
  assert.equal(rows[0]!.organization_id, ORG);
  assert.equal(rows[0]!.owner_user_id, USER);
  assert.match(String(rows[0]!.id), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  // Aynı yerel kayıt ikinci kez yazılınca kopya oluşmaz.
  saveClient({ ...makeClient('cli_1'), phone: '0556' });
  await whenIdle();
  const after = await port.select('clients');
  assert.equal(after.length, 1);
  assert.equal(after[0]!.phone, '0556');
  assert.equal(after[0]!.id, rows[0]!.id);
  // Anamnez 1:1 kaydı da güncellenir (kopya oluşmaz).
  const anamneses = await port.select('anamneses');
  assert.equal(anamneses.length, 1);
  assert.equal(anamneses[0]!.client_id, rows[0]!.id);
  deactivateCloud();
});

test('P0-3: sunucudan okunan kayıtlar yerel önbelleğe aynı kimliklerle döner', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  await port.insert('clients', [{
    id: '33333333-3333-4333-8333-333333333333',
    organization_id: ORG,
    owner_user_id: USER,
    file_number: 'HK-2026-777',
    first_name: 'Mehmet',
    last_name: 'Demir',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }]);

  const snapshot = await loadSnapshot(port, cloudContext()!);
  applyClinicalSnapshot(snapshot);
  applyPracticeSnapshot(snapshot);

  const clients = getClients();
  assert.equal(clients.length, 1);
  assert.equal(clients[0]!.id, '33333333-3333-4333-8333-333333333333');
  assert.equal(clients[0]!.firstName, 'Mehmet');
  assert.equal(clients[0]!.fileNumber, 'HK-2026-777');
  deactivateCloud();
});

test('P0-3: randevu → seans zinciri buluta appointment_id ile yazılır', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);

  saveClient(makeClient('cli_1'));
  saveAppointment({
    id: 'app_1',
    clientId: 'cli_1',
    clientName: 'Ayşe Kaya',
    date: '2026-09-25',
    time: '14:00',
    durationMinutes: 50,
    sessionType: 'Bireysel Terapi',
    location: 'Klinik (Yüz Yüze)',
    status: 'scheduled',
    notes: '',
    fee: 1500,
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
  });
  await whenIdle();

  const session = completeAppointmentWithSession(getAppointments()[0]!);
  await whenIdle();

  const rows = await port.select('sessions');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.id, session.id.length === 36 ? session.id : rows[0]!.id);
  assert.equal(rows[0]!.appointment_id, (await port.select('appointments'))[0]!.id);
  assert.equal(rows[0]!.client_id, (await port.select('clients'))[0]!.id);
  assert.equal(rows[0]!.status, 'draft');
  deactivateCloud();
});

test('P0-3: imza/kilit buluta status ve zaman damgası olarak yazılır', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  saveClient(makeClient('cli_1'));
  const now = new Date().toISOString();
  const session: SoapSession = {
    id: 'sess_1',
    clientId: 'cli_1',
    clientName: 'Ayşe Kaya',
    sessionNumber: 1,
    date: '2026-09-25',
    startTime: '14:00',
    durationMinutes: 50,
    sessionType: 'Bireysel Terapi',
    subjective: 's',
    objective: 'o',
    assessment: 'a',
    plan: 'p',
    riskLevel: 'none',
    riskNotes: '',
    homework: '',
    fee: 1500,
    paymentStatus: 'paid',
    createdAt: now,
    updatedAt: now,
  };
  saveSoapSession(session);
  await whenIdle();
  saveSoapSession(session); // upsert yolu (23505 → update)
  await whenIdle();

  lockSoapSession('sess_1');
  await whenIdle();

  const rows = await port.select('sessions');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.status, 'locked');
  assert.ok(rows[0]!.locked_at);
  assert.ok(rows[0]!.signed_at);
  assert.equal(rows[0]!.signed_by, USER);
  assert.equal(rows[0]!.locked_by, USER);
  deactivateCloud();
});

test('P0-3: ağ hatasında "kaydedildi" denmez; kayıt kuyruğa alınır ve bağlantı dönünce gönderilir', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);

  port.offline = true;
  saveTask({
    id: 'task_1',
    title: 'Süpervizyon',
    notes: '',
    dueDate: '2026-10-01',
    status: 'open',
    priority: 'normal',
    clientId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as never);
  await whenIdle();

  const state = getSyncState();
  assert.equal(state.phase, 'offline');
  assert.equal(state.pending, 1);
  assert.equal((await port.select('tasks').catch(() => [])).length, 0);

  port.offline = false;
  const sent = await flushOutbox();
  assert.equal(sent, 1);
  assert.equal((await port.select('tasks')).length, 1);
  assert.equal(getSyncState().phase, 'saved');
  assert.equal(getSyncState().pending, 0);
  deactivateCloud();
});

test('P0-6: kullanıcı/kurum kapsamlı önbellek anahtarları ve çıkışta temizlik', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  saveClient(makeClient('cli_1'));
  saveFormulation({ ...emptyFormulation('cli_1'), modality: 'BDT' });
  await whenIdle();

  const scopedClientKey = cacheKey('psikolog_clients_v2');
  assert.match(scopedClientKey, new RegExp(`^psikolog:${ORG}:${USER}:`));
  assert.ok(localStorage.getItem(scopedClientKey));
  assert.equal(getClinicsAfterReload(), 1);

  deactivateCloud();

  assert.equal(cloudContext(), null);
  assert.equal(localStorage.getItem(scopedClientKey), null, 'çıkışta kullanıcı cache temizlenmeli');
  assert.equal(localStorage.getItem(cacheKey('psikolog_formulations_v2')), null);
  // İzole modda eski (prefixsiz) anahtar kullanılmaya devam eder.
  assert.equal(cacheKey('psikolog_clients_v2'), 'psikolog_clients_v2');
});

function getClinicsAfterReload(): number {
  return getClients().length;
}

test('P0-3: activateCloud kurum ataması yoksa açık hata verir', async () => {
  localStorage.clear();
  bind(new MemoryPort());
  deactivateCloud();
  await assert.rejects(
    () => activateCloud({ id: USER, organizationId: null } as never),
    /Kurum|kurum/,
  );
});

test('P0-3: formülasyon satırı jsonb içerik + sahiplik ile yazılır', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  saveFormulation({ ...emptyFormulation('cli_x'), modality: 'Şema terapi' });
  await whenIdle();

  const rows = await port.select('formulations');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.organization_id, ORG);
  assert.equal(rows[0]!.created_by, USER);
  assert.equal((rows[0]!.content as Record<string, unknown>).modality, 'Şema terapi');
  assert.equal(getFormulations().length, 1);
  deactivateCloud();
});


test('P0-6: yerel veri export→transform→import→verify ile aktarılır, kopya üretmez', async () => {
  localStorage.clear();
  const port = new MemoryPort();

  // Eski (prefixsiz) yerel veri: migrated edilecek kayıtlar.
  localStorage.setItem(LEGACY_KEYS.clients, JSON.stringify([makeClient('cli_legacy', 'HK-2025-900')]));
  localStorage.setItem(LEGACY_KEYS.sessions, JSON.stringify([{
    id: 'sess_legacy',
    clientId: 'cli_legacy',
    clientName: 'Ayşe Kaya',
    sessionNumber: 1,
    date: '2026-08-01',
    startTime: '10:00',
    durationMinutes: 50,
    sessionType: 'Bireysel Terapi',
    subjective: 's', objective: 'o', assessment: 'a', plan: 'p',
    riskLevel: 'none', riskNotes: '', homework: '',
    fee: 1000, paymentStatus: 'paid',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }]));

  bind(port);
  const report = await migrateLocalDataToCloud();
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(report.pushed.clients, 1);
  assert.equal(report.pushed.sessions, 1);
  assert.equal((await port.select('clients')).length, 1);
  assert.equal((await port.select('sessions')).length, 1);
  // Yerel veri doğrulama sonrası hâlâ duruyor (sessiz silme yok).
  assert.ok(localStorage.getItem(LEGACY_KEYS.clients));

  const second = await migrateLocalDataToCloud();
  assert.equal(second.ok, true);
  assert.equal((await port.select('clients')).length, 1, 'ikinci aktarım kopya oluşturmamalı');
  assert.equal((await port.select('sessions')).length, 1);

  // Temizlik yalnızca başarılı aktarım bildirimi ile yapılır.
  assert.equal(purgeLegacyKeysAfterVerifiedImport(report), true);
  assert.equal(localStorage.getItem(LEGACY_KEYS.clients), null);
  deactivateCloud();
});

test('P0-6: başarısız aktarımda yerel veri korunur ve temizlik reddedilir', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  localStorage.setItem(LEGACY_KEYS.clients, JSON.stringify([makeClient('cli_legacy', 'HK-2025-901')]));
  bind(port);
  port.offline = true;

  const report = await migrateLocalDataToCloud();
  assert.equal(report.ok, false);
  assert.ok(report.missing.includes('clients'));
  assert.equal(purgeLegacyKeysAfterVerifiedImport(report), false);
  assert.ok(localStorage.getItem(LEGACY_KEYS.clients), 'başarısız aktarımda yerel veri silinmemeli');
  port.offline = false;
  deactivateCloud();
});

test('P0-6: localStorage temizlense bile veri Supabase’den geri gelir (kaynak sunucu)', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  saveClient(makeClient('cli_1'));
  await whenIdle();

  // Cihaz önbelleği tamamen silinir (kullanıcı tarayıcı verisini temizledi).
  localStorage.clear();
  assert.equal(getClients().length, 0);

  // Yeniden açılışta sunucudan okunan anlık görüntü önbelleği doldurur.
  const snapshot = await loadSnapshot(port, cloudContext()!);
  applyClinicalSnapshot(snapshot);
  applyPracticeSnapshot(snapshot);
  assert.equal(getClients().length, 1);
  assert.equal(getClients()[0]!.fileNumber, 'HK-2026-001');
  deactivateCloud();
});

test('P0-7: belge yüklemesi Storage yolunu ve metadata satırını üretir; silme nesneyi de kaldırır', async () => {
  localStorage.clear();
  const uploaded: { bucket: string; path: string; size: number }[] = [];
  const removed: string[] = [];
  const port = new MemoryPort();
  port.upload = async (bucket, path, file) => {
    uploaded.push({ bucket, path, size: file.size });
  };
  port.removeObject = async (_bucket, path) => {
    removed.push(path);
  };
  bind(port);

  const document = {
    id: 'doc_1',
    clientId: 'cli_1',
    fileName: 'rapor.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 12,
    description: 'Sevk raporu',
    dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
    createdAt: new Date().toISOString(),
  };
  queueWrite({ entity: 'document', op: 'upsert', value: document });
  await whenIdle();
  await flushOutbox();

  const rows = await port.select('documents');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.mime_type, 'application/pdf');
  assert.equal(rows[0]!.size_bytes, 12);
  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0]!.bucket, 'client-documents');
  assert.match(uploaded[0]!.path, new RegExp(`^${ORG}/`));
  assert.equal(rows[0]!.file_path, uploaded[0]!.path);

  queueWrite({ entity: 'document', op: 'delete', value: document });
  await whenIdle();
  assert.equal(removed.length, 1);
  assert.equal((await port.select('documents')).length, 0);
  deactivateCloud();
});

/* -------------------------------------------------------------------------- */
/* P0-2/REAL BROWSER koşu #2 — aktivasyon öncesi yazım sessizce DÜŞMEMELİ        */
/* -------------------------------------------------------------------------- */

test('P0-2: bulut aktivasyonu tamamlanmadan yapılan kayıt kuyruğa alınır (sessiz veri kaybı yok)', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  // Sayfa yeni açıldı: bulut hesabı var ama aktivasyon (13 okuma) henüz bitmedi.
  bind(port);
  deactivateCloud();
  assert.equal(getSyncState().cloud, false);

  saveClient(makeClient('cli_pre_activation', 'HK-PRE-1'));

  // Sunucuya istek gitmedi ama kayıt kaybolmadı: kuyrukta bekliyor.
  assert.equal((await port.select('clients')).length, 0);
  assert.equal(getSyncState().pending, 1);
  assert.equal(getSyncState().phase, 'saving');
  const baseOutbox = JSON.parse(localStorage.getItem('outbox') ?? '[]') as unknown[];
  assert.equal(baseOutbox.length, 1, 'aktivasyon öncesi yazım kuyruğa alınmalı');
  // Yerel görünürlük korunur (kullanıcı kaydı hemen görür).
  assert.equal(getClients().length, 1);
  deactivateCloud();
});

test('P0-2: aktivasyon tamamlanınca kuyruktaki kayıt sunucuya gönderilir ve kapsamlı kuyruk boşalır', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  deactivateCloud();
  saveClient(makeClient('cli_pre_activation', 'HK-PRE-1'));
  assert.equal(getSyncState().pending, 1);

  // Aktivasyon tamamlandı: bağlam kuruldu, kuyruk kapsamlı ad alanına taşınır.
  bind(port);
  const adopted = adoptBaseOutbox();
  assert.equal(adopted, 1);
  assert.equal(localStorage.getItem('outbox'), null, 'kapsamsız kuyruk temizlenmeli');

  const sent = await flushOutbox();
  assert.equal(sent, 1);
  const rows = await port.select('clients');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.file_number, 'HK-PRE-1');
  assert.equal(rows[0]!.owner_user_id, USER);
  // Kuyruk boşaldı; ikinci aktarım kopya üretmez.
  assert.equal(getSyncState().pending, 0);
  assert.equal(adoptBaseOutbox(), 0);
  assert.equal(await flushOutbox(), 0);
  assert.equal((await port.select('clients')).length, 1);
  deactivateCloud();
});

test('P0-2: bulutsuz (yerel) kurulumda kuyruk oluşmaz — davranış değişmez', async () => {
  localStorage.clear();
  // Bu test dosyasında bulut bağlanmadıysa `cloudWritesExpected()` yalnız
  // yapılandırmaya bakar; yapılandırma yoksa yazım eskisi gibi yerelde kalır.
  if (cloudWritesExpected()) return;
  saveClient(makeClient('cli_local_only', 'HK-LOCAL-1'));
  assert.equal(localStorage.getItem('outbox'), null);
  assert.equal(getSyncState().pending, 0);
  assert.equal(getClients().length, 1);
});
