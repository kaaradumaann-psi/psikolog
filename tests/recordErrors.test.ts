import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALL_RECORDS_LIMIT,
  EXPERT_NOTES_MAX,
  OWN_RECORDS_LIMIT,
  createRecord,
  deleteRecord,
  describeMutationError,
  updateExpertNotes,
} from '../src/records/supabaseRecords';
import { formDefinition } from '../src/omr/formDefinition';

/**
 * Kayıt katmanı hata çevirisi + doğrulama sözleşmesi.
 *
 * Canlıda görülen "400 / silme yetkisi yok / kayıt bulunamadı" kümesinin nedeni
 * çoğu zaman canlı şemanın geride kalmasıdır (eksik kolon/politika). Bu testler
 * (1) her PostgREST kodunun eyleme dönüştürülebilir bir mesaja çevrildiğini,
 * (2) istemciye/ konsola danışan verisi sızmadığını, (3) ağ çağrısından önce
 * doğrulama yapıldığını kanıtlar.
 */

function postgrestError(code: string, message = '', details = ''): unknown {
  return { code, message, details, hint: '' };
}

test('şema/politika kaynaklı kodlar db push veya yeniden giriş mesajına çevrilir', () => {
  assert.match(describeMutationError(postgrestError('42501'), 'yedek'), /db push/);
  assert.match(describeMutationError(postgrestError('42703'), 'yedek'), /db push/);
  assert.match(describeMutationError(postgrestError('PGRST204'), 'yedek'), /db push/);
  assert.match(describeMutationError(postgrestError('42P01'), 'yedek'), /db push/);
  assert.match(describeMutationError(postgrestError('PGRST205'), 'yedek'), /db push/);
  assert.match(describeMutationError(postgrestError('PGRST301'), 'yedek'), /yeniden giriş/);
  assert.match(describeMutationError(postgrestError('PGRST302'), 'yedek'), /yeniden giriş/);
  assert.match(describeMutationError(postgrestError('22P02'), 'yedek'), /geçersiz/);
});

test('`.single()` 0 satır döndürdüğünde (PGRST116) kayıt yok / erişim yok ayrımı yapılır', () => {
  const message = describeMutationError(postgrestError('PGRST116'), 'Test detayları alınamadı.');
  assert.match(message, /Kayıt bulunamadı/);
  assert.match(message, /db push/, 'şema geride kalmışsa politika eksikliği de bu belirtiyi verir');
  // Sessizce "tekrar deneyin" demek yanıltıcıdır: kullanıcı aynı kaydı aramaya devam eder.
  assert.ok(!message.includes('tekrar deneyin'), 'mesaj gerçek nedeni söylemeli');
});

test('NOT NULL ihlali audit_logs kaynaklıysa şema onarımını işaret eder', () => {
  const audit = describeMutationError(
    postgrestError('23502', 'null value in column "actor" of relation "audit_logs" violates not-null constraint'),
    'yedek',
  );
  assert.match(audit, /audit_logs/);
  assert.match(audit, /db push/);

  const other = describeMutationError(postgrestError('23502', 'null value in column "client_first_name"'), 'yedek');
  assert.match(other, /Zorunlu bir alan/);
});

test('bütünlük ihlalleri, trigger istisnası ve bilinmeyen kodlar doğru mesaja gider', () => {
  for (const code of ['23503', '23505', '23514']) {
    assert.match(describeMutationError(postgrestError(code), 'yedek'), /bütünlüğü/);
  }
  assert.match(describeMutationError(postgrestError('P0001', 'Uygulama tarihi ileri tarih olamaz'), 'yedek'),
    /Uygulama tarihi ileri tarih olamaz/);
  assert.equal(describeMutationError(postgrestError('P0001'), 'yedek mesaj'), 'yedek mesaj');
  assert.equal(describeMutationError(postgrestError(''), 'yedek mesaj'), 'yedek mesaj');
  assert.equal(describeMutationError(null, 'yedek mesaj'), 'yedek mesaj');
  assert.equal(describeMutationError({}, 'yedek mesaj'), 'yedek mesaj');
});

test('ağ hatası "veriniz korundu" mesajına çevrilir (kuyruğa alma kararı bu zincirden verilir)', () => {
  const network = describeMutationError(new TypeError('Failed to fetch'), 'yedek');
  assert.match(network, /Bağlantı kurulamadı/);
  assert.match(network, /korundu/);
});

test('danışan verisi içeren `details` alanı ne mesaja ne konsola taşınır (KVKK)', () => {
  const secret = 'Failing row contains (id, Ayse Yilmaz, 1985-04-02, tani notu)';
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { logged.push(args); };
  let message = '';
  try {
    message = describeMutationError(postgrestError('23514', 'check constraint violated', secret), 'yedek');
  } finally {
    console.error = original;
  }
  assert.ok(!message.includes('Ayse Yilmaz'), 'satır içeriği kullanıcı mesajına sızmamalı');
  const flat = JSON.stringify(logged);
  assert.ok(!flat.includes('Ayse Yilmaz'), 'satır içeriği konsola sızmamalı');
  assert.ok(flat.includes('23514'), 'teşhis için hata kodu loglanmalı');
});

test('kayıt kimliği ve not sınırı ağ çağrısından önce doğrulanır', async () => {
  await assert.rejects(() => deleteRecord('kayit-1'), /geçersiz/);
  await assert.rejects(() => updateExpertNotes('   ', 'not'), /geçersiz/);
  await assert.rejects(
    () => updateExpertNotes('11111111-1111-4111-8111-111111111111', 'a'.repeat(EXPERT_NOTES_MAX + 1)),
    new RegExp(`${EXPERT_NOTES_MAX}`),
  );
  await assert.rejects(
    () => createRecord(
      {
        client: {
          firstName: 'Ayşe', lastName: 'Yılmaz', gender: 'Kadın', age: 30,
          occupation: '', education: '', applicationDate: '2026-09-20', requestedBy: '',
        },
      },
      [],
      formDefinition,
      { id: '22222222-2222-4222-8222-222222222222', email: 'a@b.com', firstName: 'U', lastName: 'Z', role: 'PSYCHOLOG', active: true },
      '33333333-3333-4333-8333-333333333333',
    ),
    /4 sayfanın tamamı/,
  );
});

test('liste üst sınırları sabittir ve arayüzlerin bildirdiği değerlerle aynıdır', () => {
  // Arayüz bu sabitleri kullanarak "daha eski kayıtlar görünmüyor" bilgisini gösterir;
  // sayı sessizce değişirse bilgilendirme metni yanlış olur.
  assert.equal(OWN_RECORDS_LIMIT, 100);
  assert.equal(ALL_RECORDS_LIMIT, 200);
  assert.equal(EXPERT_NOTES_MAX, 4000);
});
