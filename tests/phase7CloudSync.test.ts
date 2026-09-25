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
import { applyClinicalSnapshot, deleteClient, getClients, getSoapSessions, saveClient, saveSoapSession, signSoapSession, lockSoapSession, getAppointments, saveAppointment, completeAppointmentWithSession, saveBeckDepressionTest, getBeckDepressionTests } from '../src/clinical/clinicalStore';
import { applyPracticeSnapshot, getFormulations, getTasks, saveFormulation, saveTask, saveScreening, getScreenings, saveDocument } from '../src/clinical/practiceStore';
import { emptyFormulation, emptySafety } from '../src/clinical/casework';
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
  assert.match(getSyncState().lastError ?? '', /Sunucu işlemi tamamlanamadı/);
  assert.doesNotMatch(getSyncState().lastError ?? '', /PGRST|42501/);
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

  signSoapSession('sess_1');
  await whenIdle();
  const signed = getSoapSessions()[0]!;
  assert.throws(() => saveSoapSession({ ...signed, status: 'draft' }), /taslağa çevrilemez/);
  saveSoapSession({ ...signed, subjective: 'imzalı düzeltme' });
  await whenIdle();
  assert.equal((await port.select('sessions'))[0]!.status, 'signed');
  assert.equal((await port.select('sessions'))[0]!.signed_at, signed.signedAt);
  assert.equal(getSoapSessions()[0]!.status, 'signed');

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
/* P0: kimliği bilinmeyen bir intent başka kullanıcının hesabına taşınmaz       */
/* -------------------------------------------------------------------------- */

test('bulut kimliği bilinmeden yazma fail-closed: genel outbox başka kişiye devredilmez', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  deactivateCloud();
  assert.equal(getSyncState().cloud, false);
  assert.throws(() => saveClient(makeClient('cli_pre_activation', 'HK-PRE-1')), /Bulut oturumu hazır değil/);
  assert.equal((await port.select('clients')).length, 0);
  assert.equal(localStorage.getItem('outbox'), null);
  assert.equal(getSyncState().phase, 'error');

  const oldUnscoped = JSON.stringify([{ id: crypto.randomUUID(), at: Date.now(), intent: {
    entity: 'client', op: 'upsert', value: makeClient('cli_orphan'),
  } }]);
  localStorage.setItem('outbox', oldUnscoped);
  bindCloud({ userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', organizationId: ORG }, port);
  assert.equal(adoptBaseOutbox(), 0, 'kimlik doğrulanmadan yazılan eski intentin sahibi bilinemez');
  assert.equal(await flushOutbox(), 0);
  assert.equal((await port.select('clients')).length, 0);
  assert.equal(localStorage.getItem('outbox'), oldUnscoped, 'eski intent de sessizce silinmez');
  deactivateCloud();
});

test('kapsamlı outbox + UUID haritası çıkışta kalır, yalnız aynı hesap girince gönderilir', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  port.offline = true;
  saveClient(makeClient('cli_pending', 'HK-PENDING-1'));
  await whenIdle();
  const outboxKey = cacheKey('outbox');
  const mapKey = cacheKey('id-map');
  const cacheClientKey = cacheKey('psikolog_clients_v2');
  assert.equal(getSyncState().pending, 1);
  assert.ok(localStorage.getItem(outboxKey));
  assert.ok(localStorage.getItem(mapKey));
  deactivateCloud();
  assert.ok(localStorage.getItem(outboxKey), 'offline kayıt logout sırasında kaybolmamalı');
  assert.ok(localStorage.getItem(mapKey), 'UUID eşlemesi de yeniden denemeye kalmalı');
  assert.equal(localStorage.getItem(cacheClientKey), null, 'görünen klinik cache kapatılmalı');

  // B başka hesap/aynı kurum: A'nın outbox anahtarına erişmez.
  port.offline = false;
  bindCloud({ userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', organizationId: ORG }, port);
  assert.equal(getSyncState().pending, 0);
  assert.equal(await flushOutbox(), 0);
  assert.equal((await port.select('clients')).length, 0);
  deactivateCloud();

  // A aynı hesap: idempotent UUID ile geri gönderilir.
  bind(port);
  assert.equal(getSyncState().pending, 1);
  assert.equal(await flushOutbox(), 1);
  assert.equal(getSyncState().pending, 0);
  assert.equal((await port.select('clients')).length, 1);
  assert.equal((await port.select('clients'))[0]!.owner_user_id, USER);
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

test('outbox: ikinci istek sırasında ağ koparsa kalan tüm intentler sırayla korunur', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  port.offline = true;
  for (const id of ['one', 'two', 'three']) {
    queueWrite({ entity: 'task', op: 'upsert', value: {
      id: `task_${id}`, title: id, clientId: undefined, status: 'todo',
      priority: 'medium', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } });
  }
  await whenIdle();
  assert.equal(getSyncState().pending, 3);
  const outboxKey = cacheKey('outbox');

  port.offline = false;
  const originalInsert = port.insert.bind(port);
  let attempt = 0;
  port.insert = async (table, rows) => {
    if (++attempt === 2) throw new Error('Failed to fetch');
    return originalInsert(table, rows);
  };
  assert.equal(await flushOutbox(), 1);
  assert.equal(getSyncState().phase, 'offline');
  assert.equal(getSyncState().pending, 2);
  assert.equal((JSON.parse(localStorage.getItem(outboxKey)!) as unknown[]).length, 2);

  port.insert = originalInsert;
  assert.equal(await flushOutbox(), 2);
  assert.equal(getSyncState().phase, 'saved');
  assert.equal((await port.select('tasks')).length, 3);
  assert.equal(localStorage.getItem(outboxKey), null);
  deactivateCloud();
});

test('outbox: RLS/hata kuyruktaki çocuğu geçirmez; hata ve tüm intentler görünür kalır', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  const realInsert = port.insert.bind(port);
  port.insert = async () => { throw new Error('42501 row-level security'); };
  queueWrite({ entity: 'client', op: 'upsert', value: makeClient('cli_parent') });
  queueWrite({ entity: 'note', op: 'upsert', value: {
    id: 'note_child', clientId: 'cli_parent', content: 'takip', pinned: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  } });
  await whenIdle();
  assert.equal(getSyncState().phase, 'error');
  assert.equal(getSyncState().pending, 2);
  assert.doesNotMatch(getSyncState().lastError ?? '', /42501|row-level/i);
  assert.equal((await port.select('notes')).length, 0);
  port.insert = realInsert;
  assert.equal(await flushOutbox(), 2);
  assert.equal((await port.select('notes')).length, 1);
  deactivateCloud();
});

test('outbox: kota hatası gönderimden önce başarısız olur, mevcut kayıtlar kırpılmaz', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  const outboxKey = cacheKey('outbox');
  const previousSet = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key, value) => {
    if (key === outboxKey) throw new DOMException('Quota exceeded', 'QuotaExceededError');
    previousSet(key, value);
  };
  try {
    assert.throws(() => queueWrite({ entity: 'client', op: 'upsert', value: makeClient('cli_quota') }), /bu cihaza yazılamadı/i);
    assert.equal((await port.select('clients')).length, 0);
    assert.equal(getSyncState().phase, 'error');
  } finally {
    localStorage.setItem = previousSet;
    deactivateCloud();
  }
});

test('outbox: yavaş A isteği B oturumuna geçse de B portu/UUID haritasına yazılmaz', async () => {
  localStorage.clear();
  const portA = new MemoryPort();
  const portB = new MemoryPort();
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  const originalInsert = portA.insert.bind(portA);
  portA.insert = async (table, rows) => {
    await waiting;
    return originalInsert(table, rows);
  };
  bind(portA);
  const aPromise = queueWrite({ entity: 'client', op: 'upsert', value: makeClient('cli_slow_A', 'HK-SLOW-A') });
  const aOutbox = cacheKey('outbox');
  deactivateCloud();
  bindCloud({ userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', organizationId: ORG }, portB);
  const bPromise = queueWrite({ entity: 'client', op: 'upsert', value: makeClient('cli_fast_B', 'HK-FAST-B') });
  release();
  await Promise.all([aPromise, bPromise, whenIdle()]);
  assert.equal((await portA.select('clients'))[0]!.file_number, 'HK-SLOW-A');
  assert.equal((await portB.select('clients'))[0]!.file_number, 'HK-FAST-B');
  assert.equal((await portA.select('clients'))[0]!.owner_user_id, USER);
  assert.equal((await portB.select('clients'))[0]!.owner_user_id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  assert.equal(localStorage.getItem(aOutbox), null, 'yalnız sunucu onayından sonra A kuyruğu boşalmalı');
  deactivateCloud();
});

test('yazım sırası: danışan → seans → kilit, ebeveyn sunucudayken ilerler', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  const originalInsert = port.insert.bind(port);
  const order: string[] = [];
  port.insert = async (table, rows) => {
    if (table === 'clients') await new Promise((resolve) => setTimeout(resolve, 30));
    if (table === 'sessions') {
      const parent = await port.select('clients', { id: String(rows[0]?.client_id) });
      if (parent.length === 0) throw new Error('23503 parent client missing');
    }
    order.push(table);
    return originalInsert(table, rows);
  };
  const originalUpdate = port.update.bind(port);
  port.update = async (table, patch, filter) => {
    order.push(`update:${table}`);
    return originalUpdate(table, patch, filter);
  };
  bind(port);
  const now = new Date().toISOString();
  saveClient(makeClient('cli_chain'));
  saveSoapSession({
    id: 'sess_chain', clientId: 'cli_chain', clientName: 'Ayşe Kaya', sessionNumber: 1,
    date: '2026-09-25', startTime: '14:00', durationMinutes: 50,
    sessionType: 'Bireysel Terapi', subjective: 'S', objective: 'O', assessment: 'A', plan: 'P',
    riskLevel: 'none', riskNotes: '', homework: '', fee: 0, paymentStatus: 'pending',
    createdAt: now, updatedAt: now,
  });
  lockSoapSession('sess_chain');
  await whenIdle();
  assert.equal(getSyncState().pending, 0, getSyncState().lastError);
  assert.deepEqual(order.slice(0, 4), ['clients', 'anamneses', 'sessions', 'update:sessions']);
  assert.equal((await port.select('sessions'))[0]!.status, 'locked');
  deactivateCloud();
});

test('bulut ölçek/tarama: kayıtlı danışan olmadan yerel sonuç veya outbox oluşturulmaz', () => {
  localStorage.clear();
  bind(new MemoryPort());
  assert.throws(
    () => saveBeckDepressionTest({ id: 'bdi_orphan', clientId: undefined } as never),
    /danışan dosyası seçin/,
  );
  assert.throws(
    () => saveScreening({ id: 'screen_orphan', clientId: undefined } as never),
    /danışan dosyası seçin/,
  );
  assert.equal(getBeckDepressionTests().length, 0);
  assert.equal(getScreenings().length, 0);
  assert.equal(getSyncState().pending, 0);
  deactivateCloud();
});

test('migration: bozuk yerel koleksiyon boş sayılıp silinmez', async () => {
  localStorage.clear();
  const broken = '{bozuk klinik veri';
  localStorage.setItem(LEGACY_KEYS.clients, broken);
  bind(new MemoryPort());
  const report = await migrateLocalDataToCloud();
  assert.equal(report.ok, false);
  assert.match(report.errors.join(' '), /okunamadı/);
  assert.equal(report.pushed.clients, 0);
  assert.equal(purgeLegacyKeysAfterVerifiedImport(report), false);
  assert.equal(localStorage.getItem(LEGACY_KEYS.clients), broken);
  deactivateCloud();
});

test('migration: aynı sayıdaki farklı sunucu kaydı eksik legacy dosyayı maskelemez', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  saveClient(makeClient('cli_unrelated', 'HK-EXISTING'));
  await whenIdle();

  localStorage.setItem(LEGACY_KEYS.clients, JSON.stringify([makeClient('cli_missing', 'HK-MISSING')]));
  const originalInsert = port.insert.bind(port);
  // This broken port ACKs the import but does not persist its clients row.
  port.insert = async (table, rows) => table === 'clients' ? rows : originalInsert(table, rows);
  const report = await migrateLocalDataToCloud();
  assert.equal(report.ok, false, JSON.stringify(report));
  assert.equal(report.verified.find((row) => row.entity === 'clients')?.cloud, 1);
  assert.ok(report.missing.includes('clients'));
  assert.equal(purgeLegacyKeysAfterVerifiedImport(report), false);
  assert.ok(localStorage.getItem(LEGACY_KEYS.clients));
  deactivateCloud();
});

test('migration: ID taşımayan eski formülasyon ve güvenlik planı tekrar aktarımda kopyalanmaz', async () => {
  localStorage.clear();
  localStorage.setItem(LEGACY_KEYS.clients, JSON.stringify([makeClient('cli_old', 'HK-OLD')]));
  localStorage.setItem(LEGACY_KEYS.formulations, JSON.stringify([{ ...emptyFormulation('cli_old'), modality: 'BDT' }]));
  localStorage.setItem(LEGACY_KEYS.safetyPlans, JSON.stringify([{ ...emptySafety('cli_old'), warningSigns: 'uykusuzluk' }]));
  const port = new MemoryPort();
  bind(port);
  const first = await migrateLocalDataToCloud();
  assert.equal(first.ok, true, JSON.stringify(first));
  const formulationId = (await port.select('formulations'))[0]?.id;
  const safetyId = (await port.select('safety_plans'))[0]?.id;
  const second = await migrateLocalDataToCloud();
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.deepEqual((await port.select('formulations')).map((row) => row.id), [formulationId]);
  assert.deepEqual((await port.select('safety_plans')).map((row) => row.id), [safetyId]);
  assert.equal(purgeLegacyKeysAfterVerifiedImport(second), true);
  deactivateCloud();
});

test('ölçek sonucu: tekrar kaydetme ve eski rastgele PK tek sonuçta birleşir (LOCAL port)', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  saveClient(makeClient('cli_scale', 'HK-SCALE'));
  const result = {
    id: 'bdi_1', clientId: 'cli_scale', clientName: 'Ayşe Kaya',
    testDate: '2026-09-26', totalScore: 9, severity: 'minimal',
  } as never;
  saveBeckDepressionTest(result);
  await whenIdle();
  const first = (await port.select('test_results'))[0]!;
  assert.ok(first.id);
  saveBeckDepressionTest({ ...result, totalScore: 10 });
  await whenIdle();
  assert.equal((await port.select('test_results')).length, 1);
  assert.equal((await port.select('test_results'))[0]!.id, first.id);
  assert.equal(((await port.select('test_results'))[0]!.result_data as { totalScore: number }).totalScore, 10);

  // A legacy database already has a result for this administration but its PK
  // predates deterministic IDs. A retry updates that row, not a second row.
  await port.remove('test_results', { id: String(first.id) });
  const legacyId = crypto.randomUUID();
  await port.insert('test_results', [{ ...first, id: legacyId }]);
  saveBeckDepressionTest({ ...result, totalScore: 11 });
  await whenIdle();
  const rows = await port.select('test_results');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.id, legacyId);
  assert.equal((rows[0]!.result_data as { totalScore: number }).totalScore, 11);
  deactivateCloud();
});

test('ölçek sonucu: eski yinelenen satırlar varsa belirsiz sonucu otomatik seçmez', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  saveClient(makeClient('cli_scale_dup', 'HK-SCALE-DUP'));
  const result = { id: 'bdi_dup', clientId: 'cli_scale_dup', clientName: 'Ayşe Kaya',
    testDate: '2026-09-26', totalScore: 9, severity: 'minimal' } as never;
  saveBeckDepressionTest(result);
  await whenIdle();
  const first = (await port.select('test_results'))[0]!;
  await port.insert('test_results', [{ ...first, id: crypto.randomUUID() }]);
  saveBeckDepressionTest({ ...result, totalScore: 14 });
  await whenIdle();
  assert.equal(getSyncState().pending, 1, 'belirsiz yazım outbox’ta kalmalı');
  assert.equal(getSyncState().phase, 'error');
  assert.match(getSyncState().lastError ?? '', /birden fazla sonuç/i);
  assert.equal((await port.select('test_results')).length, 2);
  await assert.rejects(() => loadSnapshot(port, cloudContext()!), /birden fazla sonuç/i,
    'belirsiz sonuç hidrasyon sırasında keyfî satıra dönüşmemeli');
  deactivateCloud();
});

test('kota: outbox kalıcı yazılamazsa kullanıcıya görünen danışan önbelleği değişmez', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  const original = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    if (key.endsWith(':outbox')) throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    original(key, value);
  };
  try {
    assert.throws(() => saveClient(makeClient('cli_quota_store')), /bu cihaza yazılamadı/i);
    assert.equal(getClients().length, 0, 'outbox başarısızken iyimser kaydı gösterme');
    assert.equal(getSyncState().pending, 0);
    assert.equal((await port.select('clients')).length, 0);
  } finally {
    localStorage.setItem = original;
    deactivateCloud();
  }
});

test('kota: imza kuyruğa yazılamazsa klinik taslak imzalanmış gibi görünmez', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  saveClient(makeClient('cli_sign_quota', 'HK-SIGN-QUOTA'));
  saveSoapSession({
    id: 'sess_sign_quota', clientId: 'cli_sign_quota', clientName: 'Ayşe Kaya', sessionNumber: 1,
    date: '2026-09-26', startTime: '14:00', durationMinutes: 50, sessionType: 'Bireysel Terapi',
    subjective: '', objective: '', assessment: '', plan: '', riskLevel: 'none',
    paymentStatus: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  await whenIdle();
  const original = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    if (key.endsWith(':outbox')) throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    original(key, value);
  };
  try {
    assert.throws(() => signSoapSession('sess_sign_quota'), /bu cihaza yazılamadı/i);
    assert.equal(getSoapSessions()[0]!.status, undefined);
    assert.equal((await port.select('sessions'))[0]!.status, 'draft');
  } finally {
    localStorage.setItem = original;
    deactivateCloud();
  }
});

test('belge bütünlüğü: bulut modunda belge varken danışanı yerelde dahi silemez', async () => {
  localStorage.clear();
  const port = new MemoryPort();
  bind(port);
  saveClient(makeClient('cli_with_document', 'HK-DOC'));
  saveDocument({
    id: 'doc_with_document', clientId: 'cli_with_document', fileName: 'onam.pdf',
    mimeType: 'application/pdf', sizeBytes: 8, storagePath: `${ORG}/cli_with_document/onam.pdf`,
    createdAt: new Date().toISOString(),
  });
  assert.throws(() => deleteClient('cli_with_document'), /belgeleri varken dosya silinemez/i);
  assert.equal(getClients().length, 1);
  await whenIdle();
  assert.equal((await port.select('clients')).length, 1);
  deactivateCloud();
});
