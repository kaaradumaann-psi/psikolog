#!/usr/bin/env node
/**
 * PHASE 7 / P0-8 — LIVE SUPABASE doğrulama koşucusu.
 *
 * Amaç: gerçek Supabase projesi üzerinde AUTH, RLS (A/B/admin/anon), klinik veri
 * zinciri, imza/kilit/revizyon, Storage ve çıkış izolasyonunu ölçmek.
 *
 * GÜVENLİK
 *  - Hiçbir anahtar/parola ekrana basılmaz, hiçbir dosyaya yazılmaz.
 *  - Değerler yalnızca ortam değişkenlerinden (veya yerel `.env.live` dosyasından) okunur.
 *  - `service_role` GEREKMEZ. Yalnızca anon/publishable anahtar + test kullanıcıları.
 *
 * KULLANIM
 *   node scripts/live-validation/run.mjs            # tam koşu
 *   node scripts/live-validation/run.mjs --dry-run  # yalnız ortam kontrolü (ağ yok)
 *
 * GEREKLİ ORTAM DEĞİŞKENLERİ (adlar; değerler paylaşılmaz):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
 *   LIVE_PSY_A_EMAIL, LIVE_PSY_A_PASSWORD,
 *   LIVE_PSY_B_EMAIL, LIVE_PSY_B_PASSWORD,
 *   LIVE_ADMIN_EMAIL, LIVE_ADMIN_PASSWORD
 *
 * Bu koşucu PRODUCTION bundle doğrulaması DEĞİLDİR ve tarayıcı çalıştırmaz.
 * Sonuç etiketleri: LIVE SUPABASE / REAL BROWSER / PRODUCTION ayrı raporlanır.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'client-documents';
const RESULTS = [];
const DRY_RUN = process.argv.includes('--dry-run');

/* ------------------------------------------------------------------ ortam */

function loadEnvFile(path = '.env.live') {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const key = match[1];
    let value = match[2].replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const REQUIRED = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'LIVE_PSY_A_EMAIL',
  'LIVE_PSY_A_PASSWORD',
  'LIVE_PSY_B_EMAIL',
  'LIVE_PSY_B_PASSWORD',
  'LIVE_ADMIN_EMAIL',
  'LIVE_ADMIN_PASSWORD',
];

function missingEnv() {
  return REQUIRED.filter((name) => !process.env[name]);
}

/* ------------------------------------------------------------------ sonuç */

function record(group, name, status, detail = '') {
  RESULTS.push({ group, name, status, detail: detail ? String(detail).slice(0, 300) : '' });
  const icon = status === 'PASS' ? '✅' : status === 'DENY' ? '🚫' : status === 'SKIP' ? '⏭️' : '❌';
  console.log(`${icon} [${group}] ${name} → ${status}${detail ? ` · ${String(detail).slice(0, 160)}` : ''}`);
}

async function probe(group, name, fn, expect) {
  try {
    const value = await fn();
    const denied = value === false || value === null || (Array.isArray(value) && value.length === 0);
    const status =
      expect === 'PASS' ? (denied ? 'FAIL' : 'PASS') : denied ? 'DENY' : 'FAIL';
    record(group, name, status, Array.isArray(value) ? `${value.length} satır` : '');
    return { denied, value };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const looksDenied = /row-level security|permission denied|not authorized|JWT|401|403|violates/i.test(message);
    const status = expect === 'PASS' ? 'FAIL' : looksDenied ? 'DENY' : 'FAIL';
    record(group, name, status, message);
    return { denied: looksDenied, error };
  }
}

/* ------------------------------------------------------------------ auth */

function makeClient() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function signIn(email, password, label) {
  const client = makeClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    record('AUTH', `${label} giriş`, 'FAIL', error?.message ?? 'kullanıcı dönmedi');
    return null;
  }
  record('AUTH', `${label} giriş`, 'PASS', data.user.id.slice(0, 8) + '…');
  return { client, user: data.user };
}

async function profileContext(ctx, label) {
  const { data, error } = await ctx.client
    .from('profiles')
    .select('id, role, active, organization_id, email')
    .eq('id', ctx.user.id)
    .maybeSingle();
  if (error || !data) {
    record('AUTH', `${label} profil`, 'FAIL', error?.message ?? 'profil yok — seed-live-test-orgs.sql çalıştırılmalı');
    return null;
  }
  record('AUTH', `${label} profil`, 'PASS', `rol=${data.role} org=${data.organization_id ? 'var' : 'YOK'}`);
  return data;
}

/* --------------------------------------------------------- klinik zincir */

const today = () => new Date().toISOString().slice(0, 10);
const stamp = () => Date.now().toString(36);

async function buildClinicalChain(a, orgId, clientId, label) {
  const sb = a.client;
  const group = 'CLINICAL DATA';
  const created = {};

  async function insert(table, row, name) {
    const { data, error } = await sb.from(table).insert(row).select('*').single();
    if (error) {
      record(group, name, 'FAIL', error.message);
      return null;
    }
    record(group, name, 'PASS', `${table} · ${String(data.id).slice(0, 8)}…`);
    return data;
  }

  // 1) Client
  created.client = clientId
    ? { id: clientId }
    : await insert(
        'clients',
        {
          organization_id: orgId,
          file_number: `LIVE-${stamp()}`,
          first_name: 'Test',
          last_name: label,
          status: 'active',
          created_by: a.user.id,
          owner_user_id: a.user.id,
        },
        'Client oluştur',
      );
  if (!created.client) return null;
  const cid = created.client.id;

  // 2) Appointment
  const start = new Date();
  const end = new Date(start.getTime() + 50 * 60 * 1000);
  created.appointment = await insert(
    'appointments',
    {
      client_id: cid,
      organization_id: orgId,
      title: 'LIVE-VALIDATION görüşmesi',
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: 'completed',
      created_by: a.user.id,
      owner_user_id: a.user.id,
    },
    'Appointment oluştur',
  );

  // 3) Session (appointment bağlı)
  created.session = await insert(
    'sessions',
    {
      client_id: cid,
      organization_id: orgId,
      appointment_id: created.appointment?.id ?? null,
      date: today(),
      type: 'Bireysel Terapi',
      session_number: 1,
      start_time: '14:00',
      duration: 50,
      duration_minutes: 50,
      session_type: 'Bireysel Terapi',
      notes: 'S: sentetik veri',
      observation: 'O: sentetik gözlem',
      key_points: 'A: sentetik değerlendirme',
      plan: 'P: sentetik plan',
      status: 'draft',
      created_by: a.user.id,
    },
    'Session oluştur',
  );
  if (created.session && created.appointment) {
    record(
      'CLINICAL DATA',
      'Session → appointment_id zinciri',
      created.session.appointment_id === created.appointment.id ? 'PASS' : 'FAIL',
    );
  }

  // 4) Note
  created.note = await insert(
    'notes',
    { client_id: cid, organization_id: orgId, content: 'Sentetik not (LIVE-VALIDATION)', created_by: a.user.id },
    'Note oluştur',
  );

  // 5) Anamnesis
  created.anamnesis = await insert(
    'anamneses',
    {
      client_id: cid,
      organization_id: orgId,
      reason: 'Sentetik başvuru nedeni',
      medical_history: 'Sentetik tıbbi geçmiş',
      created_by: a.user.id,
    },
    'Anamnesis oluştur',
  );

  // 6) Formulation
  created.formulation = await insert(
    'formulations',
    {
      client_id: cid,
      organization_id: orgId,
      content: { version: 1, modality: 'BDT', predisposing: 'sentetik' },
      status: 'draft',
      created_by: a.user.id,
      updated_by: a.user.id,
    },
    'Formulation oluştur',
  );

  // 7) Safety plan
  created.safetyPlan = await insert(
    'safety_plans',
    {
      client_id: cid,
      organization_id: orgId,
      content: { version: 1, warningSigns: 'sentetik', coping: 'sentetik' },
      status: 'draft',
      created_by: a.user.id,
      updated_by: a.user.id,
    },
    'Safety Plan oluştur',
  );

  // 8) Test administration + result (sistem BDI tanımı)
  const administration = await insert(
    'test_administrations',
    {
      client_id: cid,
      organization_id: orgId,
      test_definition_id: '00000000-0000-4000-8000-000000000002',
      administration_date: today(),
      status: 'completed',
      created_by: a.user.id,
    },
    'Test administration oluştur',
  );
  created.testAdministration = administration;
  if (administration) {
    created.testResult = await insert(
      'test_results',
      {
        test_administration_id: administration.id,
        organization_id: orgId,
        result_data: { version: 1, kind: 'bdi', totalScore: 7, severity: 'Minimal' },
        summary: 'Sentetik BDI sonucu',
      },
      'Test result oluştur',
    );
  }

  // 9) Report
  created.report = await insert(
    'reports',
    {
      client_id: cid,
      organization_id: orgId,
      title: 'LIVE-VALIDATION sentetik rapor',
      content: { version: 1, sections: [], recommendations: [] },
      source_snapshot: { version: 1, source: 'live-validation' },
      status: 'draft',
      created_by: a.user.id,
    },
    'Report oluştur',
  );

  return { clientId: cid, ...created };
}

async function readChain(ctx, chain, label) {
  const sb = ctx.client;
  const group = 'CLINICAL DATA';
  const reads = [
    ['clients', chain.clientId],
    ['appointments', chain.appointment?.id],
    ['sessions', chain.session?.id],
    ['notes', chain.note?.id],
    ['anamneses', chain.anamnesis?.id],
    ['formulations', chain.formulation?.id],
    ['safety_plans', chain.safetyPlan?.id],
    ['test_results', chain.testResult?.id],
    ['reports', chain.report?.id],
  ];
  let ok = 0;
  for (const [table, id] of reads) {
    if (!id) continue;
    const { data, error } = await sb.from(table).select('id').eq('id', id);
    const found = !error && (data ?? []).length === 1;
    if (found) ok += 1;
    record(group, `${label}: ${table} okunabilir`, found ? 'PASS' : 'FAIL', error?.message ?? '');
  }
  return ok;
}

/* ------------------------------------------------------------------ main */

async function main() {
  loadEnvFile();
  const missing = missingEnv();

  if (DRY_RUN || missing.length) {
    console.log('\n=== PHASE 7 / P0-8 LIVE VALIDATION — ortam kontrolü ===');
    for (const name of REQUIRED) {
      console.log(`  ${process.env[name] ? '✔' : '✘'} ${name}${process.env[name] ? '' : ' (eksik)'}`);
    }
    console.log(`\nSupabase URL: ${process.env.VITE_SUPABASE_URL ? new URL(process.env.VITE_SUPABASE_URL).host : '(yok)'}`);
    if (missing.length) {
      console.log(`\nEksik ortam değişkenleri: ${missing.join(', ')}`);
      console.log('Değerleri sohbete yazmayın; yerel `.env.live` dosyasına veya ortam değişkeni olarak verin.');
      process.exit(DRY_RUN ? 0 : 2);
    }
    console.log('\nOrtam hazır. (--dry-run: ağ çağrısı yapılmadı)');
    process.exit(0);
  }

  console.log('\n=== PHASE 7 / P0-8 LIVE VALIDATION ===');
  console.log(`Proje: ${new URL(process.env.VITE_SUPABASE_URL).host}\n`);

  // --- anon (oturumsuz)
  const anon = makeClient();
  await probe('RLS', 'anon → clients SELECT', async () => {
    const { data, error } = await anon.from('clients').select('id').limit(1);
    if (error) throw error;
    return data;
  }, 'DENY');
  await probe('RLS', 'anon → clients INSERT', async () => {
    const { data, error } = await anon
      .from('clients')
      .insert({ first_name: 'Anon', last_name: 'Deneme', created_by: crypto.randomUUID() })
      .select('id');
    if (error) throw error;
    return data;
  }, 'DENY');

  // --- girişler
  const a = await signIn(process.env.LIVE_PSY_A_EMAIL, process.env.LIVE_PSY_A_PASSWORD, 'psikolog A');
  const b = await signIn(process.env.LIVE_PSY_B_EMAIL, process.env.LIVE_PSY_B_PASSWORD, 'psikolog B');
  const admin = await signIn(process.env.LIVE_ADMIN_EMAIL, process.env.LIVE_ADMIN_PASSWORD, 'admin');
  if (!a || !b) {
    record('AUTH', 'A/B girişi zorunlu', 'FAIL', 'test kullanıcıları olmadan RLS matrisi koşulamaz');
    return finish();
  }

  const profileA = await profileContext(a, 'psikolog A');
  const profileB = await profileContext(b, 'psikolog B');
  if (admin) await profileContext(admin, 'admin');

  if (!profileA?.organization_id || !profileB?.organization_id) {
    record('RLS', 'kurum ataması', 'FAIL', 'A/B profillerinde organization_id yok — seed-live-test-orgs.sql çalıştırın');
    return finish();
  }

  // --- klinik zincir (A)
  const chainA = await buildClinicalChain(a, profileA.organization_id, null, 'A');
  if (!chainA) return finish();

  // --- RLS matrisi
  await probe('RLS', 'A → A clients SELECT', async () => {
    const { data, error } = await a.client.from('clients').select('id').eq('id', chainA.clientId);
    if (error) throw error;
    return data;
  }, 'PASS');
  await probe('RLS', 'A → A clients UPDATE', async () => {
    const { data, error } = await a.client
      .from('clients')
      .update({ phone: '05550000000' })
      .eq('id', chainA.clientId)
      .select('id');
    if (error) throw error;
    return data;
  }, 'PASS');
  await probe('RLS', 'B → A clients SELECT', async () => {
    const { data, error } = await b.client.from('clients').select('id').eq('id', chainA.clientId);
    if (error) throw error;
    return data;
  }, 'DENY');
  await probe('RLS', 'B → A clients UPDATE', async () => {
    const { data, error } = await b.client
      .from('clients')
      .update({ phone: '05551111111' })
      .eq('id', chainA.clientId)
      .select('id');
    if (error) throw error;
    return data;
  }, 'DENY');
  await probe('RLS', 'B → A clients DELETE', async () => {
    const { data, error } = await b.client.from('clients').delete().eq('id', chainA.clientId).select('id');
    if (error) throw error;
    return data;
  }, 'DENY');
  await probe('RLS', 'B → A sessions SELECT', async () => {
    const { data, error } = await b.client.from('sessions').select('id').eq('id', chainA.session?.id ?? '');
    if (error) throw error;
    return data;
  }, 'DENY');
  await probe('RLS', "B → A org'a clients INSERT", async () => {
    const { data, error } = await b.client
      .from('clients')
      .insert({
        organization_id: profileA.organization_id,
        file_number: `LIVE-X-${stamp()}`,
        first_name: 'Sizma',
        last_name: 'Denemesi',
        created_by: b.user.id,
      })
      .select('id');
    if (error) throw error;
    return data;
  }, 'DENY');
  if (admin) {
    await probe('RLS', 'Admin → A clients SELECT (yetkili kapsam)', async () => {
      const { data, error } = await admin.client.from('clients').select('id').eq('id', chainA.clientId);
      if (error) throw error;
      return data;
    }, 'PASS');
  } else {
    record('RLS', 'Admin → A clients SELECT (yetkili kapsam)', 'SKIP', 'admin girişi yapılamadı');
  }

  // --- A kendi zincirini okur
  await readChain(a, chainA, 'A');

  // --- kalıcılık: istemci önbelleği sıfırlanmış gibi yeni oturumla oku
  const fresh = await signIn(process.env.LIVE_PSY_A_EMAIL, process.env.LIVE_PSY_A_PASSWORD, 'psikolog A (yeni istemci)');
  if (fresh) {
    const ok = await readChain(fresh, chainA, 'A/yeni istemci');
    record(
      'PERSISTENCE',
      'Sunucu kalıcılığı (istemci önbelleği sıfırlandı)',
      ok >= 8 ? 'PASS' : 'FAIL',
      `${ok} kayıt okundu — NOT: bu bir tarayıcı/localStorage testi DEĞİLDİR`,
    );
    await fresh.client.auth.signOut();
  }

  // --- SIGN / LOCK / REVISION (gerçek DB trigger'ları)
  const sessionId = chainA.session?.id;
  if (sessionId) {
    await probe('SIGN/LOCK', 'DRAFT UPDATE', async () => {
      const { data, error } = await a.client
        .from('sessions')
        .update({ plan: 'P: güncellenmiş sentetik plan' })
        .eq('id', sessionId)
        .select('id, status, revision');
      if (error) throw error;
      return data;
    }, 'PASS');

    await probe('SIGN/LOCK', 'SIGN (draft → signed)', async () => {
      const { data, error } = await a.client
        .from('sessions')
        .update({ status: 'signed', signed_at: new Date().toISOString(), signed_by: a.user.id })
        .eq('id', sessionId)
        .select('id, status');
      if (error) throw error;
      return data;
    }, 'PASS');

    await probe('SIGN/LOCK', 'LOCK (signed → locked)', async () => {
      const { data, error } = await a.client
        .from('sessions')
        .update({ status: 'locked', locked_at: new Date().toISOString(), locked_by: a.user.id })
        .eq('id', sessionId)
        .select('id, status');
      if (error) throw error;
      return data;
    }, 'PASS');

    await probe('SIGN/LOCK', 'locked UPDATE (reddedilmeli)', async () => {
      const { data, error } = await a.client
        .from('sessions')
        .update({ plan: 'P: kilitli kayıt değiştirilemez' })
        .eq('id', sessionId)
        .select('id');
      if (error) throw error;
      return data;
    }, 'DENY');

    await probe('SIGN/LOCK', 'locked DELETE (reddedilmeli)', async () => {
      const { data, error } = await a.client.from('sessions').delete().eq('id', sessionId).select('id');
      if (error) throw error;
      return data;
    }, 'DENY');

    await probe('SIGN/LOCK', 'Amendment/Revision (yeni sürüm)', async () => {
      const { data, error } = await a.client
        .from('sessions')
        .insert({
          client_id: chainA.clientId,
          organization_id: profileA.organization_id,
          date: today(),
          type: 'Bireysel Terapi',
          notes: 'Revizyon içeriği',
          status: 'draft',
          amendment_of: sessionId,
          amendment_reason: 'LIVE-VALIDATION düzeltme gerekçesi',
          created_by: a.user.id,
        })
        .select('id, revision, amendment_of');
      if (error) throw error;
      return data;
    }, 'PASS');

    const { data: superseded } = await a.client
      .from('sessions')
      .select('superseded_by, revision, status')
      .eq('id', sessionId)
      .maybeSingle();
    record(
      'SIGN/LOCK',
      'Eski sürüm superseded_by işaretlendi',
      superseded?.superseded_by ? 'PASS' : 'FAIL',
      superseded?.superseded_by ? `rev=${superseded.revision}` : 'işaretlenmemiş',
    );
  }

  // --- STORAGE
  const path = `${profileA.organization_id}/${chainA.clientId}/${crypto.randomUUID()}-live-check.txt`;
  const payload = new Blob(['PHASE7 LIVE VALIDATION'], { type: 'text/plain' });

  await probe('STORAGE', 'A upload', async () => {
    const { data, error } = await a.client.storage.from(BUCKET).upload(path, payload, { contentType: 'text/plain' });
    if (error) throw error;
    return data;
  }, 'PASS');
  await probe('STORAGE', 'A read', async () => {
    const { data, error } = await a.client.storage.from(BUCKET).download(path);
    if (error) throw error;
    return data ? [data] : [];
  }, 'PASS');
  await probe('STORAGE', 'B read A', async () => {
    const { data, error } = await b.client.storage.from(BUCKET).download(path);
    if (error) throw error;
    return data ? [data] : [];
  }, 'DENY');
  await probe('STORAGE', 'B update A', async () => {
    const { data, error } = await b.client.storage
      .from(BUCKET)
      .upload(path, new Blob(['B yazdi'], { type: 'text/plain' }), { upsert: true, contentType: 'text/plain' });
    if (error) throw error;
    return data;
  }, 'DENY');
  await probe('STORAGE', 'B delete A', async () => {
    const { data, error } = await b.client.storage.from(BUCKET).remove([path]);
    if (error) throw error;
    return Array.isArray(data) && data.length === 0 ? [] : data;
  }, 'DENY');
  await probe('STORAGE', 'A delete (temizlik)', async () => {
    const { data, error } = await a.client.storage.from(BUCKET).remove([path]);
    if (error) throw error;
    return data;
  }, 'PASS');

  // --- LOGOUT ISOLATION
  await a.client.auth.signOut();
  const bAfterA = await signIn(process.env.LIVE_PSY_B_EMAIL, process.env.LIVE_PSY_B_PASSWORD, 'psikolog B (A çıkışı sonrası)');
  if (bAfterA) {
    await probe('LOGOUT', 'B oturumunda A verisi görünmemeli', async () => {
      const { data, error } = await bAfterA.client.from('clients').select('id').eq('id', chainA.clientId);
      if (error) throw error;
      return data;
    }, 'DENY');
    await bAfterA.client.auth.signOut();
  }

  const aAgain = await signIn(process.env.LIVE_PSY_A_EMAIL, process.env.LIVE_PSY_A_PASSWORD, 'psikolog A (yeniden giriş)');
  if (aAgain) {
    await probe('LOGOUT', 'A yeniden girişte verisi geri gelmeli', async () => {
      const { data, error } = await aAgain.client.from('clients').select('id').eq('id', chainA.clientId);
      if (error) throw error;
      return data;
    }, 'PASS');
    if (chainA.note?.id) {
      await probe('LOGOUT', 'A yeniden girişte notu da görünür', async () => {
        const { data, error } = await aAgain.client.from('notes').select('id').eq('id', chainA.note.id);
        if (error) throw error;
        return data;
      }, 'PASS');
    }
    await aAgain.client.auth.signOut();
  }

  // --- temizlik: sentetik zincir silinir (yalnız A kendi verisini silebilir)
  if (aAgain) {
    await probe('CLEANUP', 'A sentetik danışanı siler (cascade)', async () => {
      const { data, error } = await aAgain.client.from('clients').delete().eq('id', chainA.clientId).select('id');
      if (error) throw error;
      return data;
    }, 'PASS');
  }

  return finish();
}

function finish() {
  const counts = (status) => RESULTS.filter((item) => item.status === status).length;
  const fails = RESULTS.filter((item) => item.status === 'FAIL');
  const groups = [...new Set(RESULTS.map((item) => item.group))];

  console.log('\n--- grup özeti ---');
  for (const group of groups) {
    const items = RESULTS.filter((item) => item.group === group);
    console.log(
      `  ${group.padEnd(14)} PASS ${items.filter(i => i.status === 'PASS').length} · DENY ${items.filter(i => i.status === 'DENY').length} · FAIL ${items.filter(i => i.status === 'FAIL').length} · SKIP ${items.filter(i => i.status === 'SKIP').length}`,
    );
  }

  console.log('\n--- sonuç etiketleri ---');
  console.log(`  LOCAL/PGlite        : bu koşucunun kapsamı dışında (ayrı: npm test — PGlite PASS, Production NOT VERIFIED)`);
  console.log(`  LIVE SUPABASE       : ${fails.length === 0 ? 'VERIFIED (REST/Auth/Storage düzeyinde)' : `FAILED (${fails.length} başarısız kontrol)`}`);
  console.log('  REAL BROWSER        : NOT RUN — bu koşucu tarayıcı çalıştırmaz (Playwright ayrı koşulmalı)');
  console.log('  PRODUCTION          : NOT VERIFIED — bu koşucu production bundle üzerinden test yapmaz');

  writeFileSync(
    'live-validation-result.json',
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        project: process.env.VITE_SUPABASE_URL ? new URL(process.env.VITE_SUPABASE_URL).host : null,
        counts: { pass: counts('PASS'), deny: counts('DENY'), fail: counts('FAIL'), skip: counts('SKIP') },
        labels: {
          localPglite: 'out-of-scope (npm test)',
          liveSupabase: fails.length === 0 ? 'VERIFIED' : 'FAILED',
          realBrowser: 'NOT RUN',
          production: 'NOT VERIFIED',
        },
        results: RESULTS,
      },
      null,
      2,
    ),
  );
  console.log('\nAyrıntılı sonuç: live-validation-result.json');
  process.exit(fails.length === 0 ? 0 : 1);
}

main().catch((error) => {
  record('RUNTIME', 'koşucu', 'FAIL', error instanceof Error ? error.message : String(error));
  finish();
});
