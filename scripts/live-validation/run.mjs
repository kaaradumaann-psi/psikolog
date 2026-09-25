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
 *   node scripts/live-validation/run.mjs             # tam koşu
 *   node scripts/live-validation/run.mjs --dry-run   # yalnız ortam kontrolü (ağ yok)
 *   node scripts/live-validation/run.mjs --selftest  # hata biçimlendirme öz-testi (ağ yok)
 *
 * HATA RAPORLAMA (P0-8 teşhis düzeltmesi)
 *   supabase-js, başarısız HTTP yanıtında `error` alanına PostgREST gövdesini
 *   DÜZ NESNE olarak koyar ({ code, message, details, hint }); HTTP kodu ise
 *   yanıtın `status` / `statusText` alanındadır. Bu yüzden `String(error)` veya
 *   `${error}` kullanmak "[object Object]" üretir. Bu koşucu artık hatayı
 *   `DbError` ile sarar ve HTTP status + code + message + details + hint
 *   alanlarını güvenli (sır ayıklanmış) biçimde raporlar.
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
import { renderSeed, maskEmail } from './emit-seed.mjs';

const BUCKET = 'client-documents';
const RESULTS = [];
const DRY_RUN = process.argv.includes('--dry-run');

/* ------------------------------------------------- hata teşhisi (güvenli) */

const SECRET_PATTERNS = [
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}/g, '[jwt-gizlendi]'],
  [/sb_[a-z]+_[A-Za-z0-9_-]{8,}/g, '[anahtar-gizlendi]'],
  [/(apikey|api_key|access_token|refresh_token|token|password|secret)=[^&\s"']+/gi, '$1=[gizlendi]'],
];

function redact(value) {
  let text = typeof value === 'string' ? value : '';
  for (const [pattern, replacement] of SECRET_PATTERNS) text = text.replace(pattern, replacement);
  return text;
}

const clip = (value, max = 200) =>
  value === null || value === undefined
    ? ''
    : redact(String(value)).replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * supabase-js'in düz nesne olarak döndürdüğü PostgREST hatasını, HTTP kodunu da
 * taşıyan bir Error'a sarar (status/statusText yanıt nesnesinden gelir).
 */
class DbError extends Error {
  constructor(error, status, statusText) {
    super(clip(error?.message ?? '', 300) || 'PostgREST hatası');
    this.name = 'DbError';
    this.code = error?.code ?? null;
    this.details = error?.details ?? null;
    this.hint = error?.hint ?? null;
    this.status = typeof status === 'number' ? status : null;
    this.statusText = statusText ?? '';
  }
}

function errorFacts(error) {
  const source = error ?? {};
  const asStatus = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
    return null;
  };
  const status = asStatus(source.status) ?? asStatus(source.statusCode);
  return {
    code: clip(source.code, 40) || null,
    message: clip(source.message, 240) || '(mesaj yok)',
    details: clip(source.details, 180) || null,
    hint: clip(source.hint, 180) || null,
    status,
    statusText: clip(source.statusText, 40) || null,
  };
}

const MISSING_OBJECT_CODES = new Set(['42P01', '3F000', 'PGRST202', 'PGRST205', 'PGRST106']);

/**
 * Kilit/immutability trigger'ının reddi: PostgREST bunu HTTP 400 + code=P0001
 * (raise_exception) ile döndürür — 0 satır DEĞİL, açık hata. DENY bekleyen
 * kontroller için bu en güçlü kanıttır.
 */
const LOCK_DENY_PATTERN =
  /kilitli|değiştirilemez|silinemez|immutable|cannot be (modified|deleted)|locked (record|clinical)/i;

/** Storage'da nesne sahibi olmayan kullanıcı için dönen yanıt: 400/404 + NoSuchKey. */
const STORAGE_MISSING_PATTERN = /NoSuchKey|Object not found|The resource was not found/i;

function classifyError(error) {
  const facts = errorFacts(error);
  const text = `${facts.message} ${facts.details ?? ''} ${facts.hint ?? ''}`;
  if (facts.code && MISSING_OBJECT_CODES.has(facts.code)) return { kind: 'missing-object', facts };
  if (/schema cache|could not find the table|does not exist|unknown relation/i.test(text)) {
    return { kind: 'missing-object', facts };
  }
  if (facts.code === 'P0001' || LOCK_DENY_PATTERN.test(text)) {
    if (LOCK_DENY_PATTERN.test(text)) return { kind: 'lock-deny', facts };
    return { kind: 'trigger-error', facts };
  }
  if (STORAGE_MISSING_PATTERN.test(text)) {
    return { kind: 'not-found-deny', facts };
  }
  if (/permission denied for (table|schema|relation|function|sequence)/i.test(text)) {
    // GRANT katmanı: rol (anon/authenticated) tabloda hiç yetkili değil → RLS politikasına ulaşılamaz.
    return { kind: 'grant-deny', facts };
  }
  if (facts.code === '42501' || /row-level security|permission denied/i.test(text)) {
    return { kind: 'rls-deny', facts };
  }
  if (facts.status === 401 || facts.status === 403 || /invalid api key|jwt|unauthorized|invalid claim/i.test(text)) {
    return { kind: 'auth', facts };
  }
  if (facts.status === 0 || /fetch failed|fetcherror|network|enotfound|econnrefused|tls|socket/i.test(text)) {
    return { kind: 'network', facts };
  }
  return { kind: 'other', facts };
}

/** Beklenen DENY sayılan hata sınıfları (hepsi gerçek kanıt taşır). */
const DENY_KINDS = new Set(['rls-deny', 'grant-deny', 'lock-deny', 'not-found-deny']);

const KIND_HINTS = {
  'missing-object': 'canlı şemada nesne bulunamadı → migration uygulanmamış ya da şema adı farklı',
  'grant-deny': 'GRANT katmanı reddi (rol tabloda yetkisiz) — DENY bekleyen kontroller için KANIT',
  'rls-deny': 'RLS politikası reddi — DENY bekleyen kontroller için KANIT',
  'lock-deny': 'imza/kilit trigger reddi (kayıt değiştirilemez) — DENY bekleyen kontroller için KANIT',
  'trigger-error': 'DB trigger hatası (beklenen reddetme değil) — incelemeli',
  'not-found-deny': 'kaynak sahibi olmayan kullanıcıya görünmüyor (storage/RLS) — DENY bekleyen kontroller için KANIT',
  auth: 'anahtar/oturum reddi',
  network: 'ağ hatası (DNS/TLS/proxy)',
};

function describeError(error) {
  const { kind, facts } = classifyError(error);
  const parts = [
    `HTTP ${facts.status === null ? '(yok)' : facts.status}${facts.statusText ? ` ${facts.statusText}` : ''}`,
    `code=${facts.code ?? '(yok)'}`,
    `message="${facts.message.replace(/"/g, "'")}"`,
  ];
  if (facts.details) parts.push(`details="${facts.details.replace(/"/g, "'")}"`);
  if (facts.hint) parts.push(`hint="${facts.hint.replace(/"/g, "'")}"`);
  const suffix = KIND_HINTS[kind] ? ` → ${KIND_HINTS[kind]}` : '';
  return { kind, facts, text: `${parts.join(' · ')}${suffix}` };
}

/**
 * CLEANUP sonucunu rapor planına çevirir (saf fonksiyon → ağsız test edilebilir).
 *
 * Kabul edilen sonuçlar:
 *   - silme başarılı            → PASS + "gerçekten silindi" PASS
 *   - kilitli kayıt engelledi   → DENY (immutability kanıtı) + PASS (kayıt yerinde) + SKIP (bakım)
 * Diğer her durum FAIL'dir.
 */
function cleanupPlan({ deleted, errorKind = null, remainingRows = 0 }) {
  const deleteName = 'A sentetik danışanı siler (cascade)';
  if (errorKind && !DENY_KINDS.has(errorKind)) {
    return [{ name: deleteName, status: 'FAIL' }];
  }
  if (deleted && remainingRows === 0) {
    return [
      { name: deleteName, status: 'PASS' },
      { name: 'Sentetik zincir gerçekten silindi', status: 'PASS' },
    ];
  }
  if (!deleted && errorKind && remainingRows === 1) {
    const isLock = errorKind === 'lock-deny';
    return [
      {
        name: isLock
          ? 'Kilitli klinik kayıt danışan silinmesini engelledi (DB düzeyinde immutability)'
          : `Danışan silme ${errorKind} ile engellendi`,
        status: 'DENY',
      },
      {
        name: isLock ? 'Kilitli kayıt hâlâ yerinde (immutability kanıtı)' : 'Danışan kaydı hâlâ yerinde (silme etkisiz)',
        status: 'PASS',
      },
      { name: 'Sentetik zincir temizliği', status: 'SKIP' },
    ];
  }
  return [
    {
      name: 'Sentetik zincir temizliği',
      status: 'FAIL',
      detail: `beklenmeyen durum: deleted=${deleted} · errorKind=${errorKind ?? '(yok)'} · kalan=${remainingRows} satır`,
    },
  ];
}

/** Sorguyu çalıştırır, hatayı gerçek HTTP koduyla birlikte fırlatır. */
async function unwrap(builder) {
  const { data, error, status, statusText } = await builder;
  if (error) throw new DbError(error, status, statusText);
  return data;
}

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

function record(group, name, status, detail = '', meta = {}) {
  const entry = { group, name, status, detail: detail ? clip(detail, 300) : '' };
  if (meta.httpStatus !== null && meta.httpStatus !== undefined) entry.httpStatus = meta.httpStatus;
  if (meta.code) entry.code = meta.code;
  if (meta.kind) entry.kind = meta.kind;
  RESULTS.push(entry);
  const icon = status === 'PASS' ? '✅' : status === 'DENY' ? '🚫' : status === 'SKIP' ? '⏭️' : '❌';
  console.log(`${icon} [${group}] ${name} → ${status}${detail ? ` · ${clip(detail, 200)}` : ''}`);
}

async function probe(group, name, fn, expect) {
  try {
    const value = await fn();
    const isEmpty =
      value === false || value === null || value === undefined || (Array.isArray(value) && value.length === 0);
    const rows = Array.isArray(value) ? value.length : isEmpty ? 0 : 1;

    if (expect === 'EXISTS') {
      record(group, name, 'PASS', `HTTP 200 · ${rows} satır — nesne erişilebilir`, { httpStatus: 200 });
      return { ok: true, value };
    }

    const denied = isEmpty;
    const status = expect === 'PASS' ? (denied ? 'FAIL' : 'PASS') : denied ? 'DENY' : 'FAIL';
    let detail;
    if (expect === 'PASS') {
      detail = denied
        ? 'HTTP 200 · 0 satır — beklenen PASS, ancak RLS filtreledi/reddetti'
        : `HTTP 200 · ${rows} satır`;
    } else {
      detail = denied
        ? 'HTTP 200 · 0 satır (RLS filtreledi — beklenen DENY)'
        : `HTTP 200 · ${rows} satır — beklenen DENY, ancak veri görünür/etkilendi (RLS SIZINTISI)`;
    }
    record(group, name, status, detail, { httpStatus: 200 });
    return { denied, value, ok: status !== 'FAIL' };
  } catch (error) {
    const { kind, facts, text } = describeError(error);
    const denied = DENY_KINDS.has(kind);
    const status = expect === 'PASS' ? 'FAIL' : denied ? 'DENY' : 'FAIL';
    record(group, name, status, text, { httpStatus: facts.status, code: facts.code, kind });
    return { denied, error, kind, ok: status !== 'FAIL' };
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
  const { data, error, status, statusText } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    record('AUTH', `${label} giriş`, 'FAIL', error?.message ?? 'kullanıcı dönmedi');
    return null;
  }
  record('AUTH', `${label} giriş`, 'PASS', data.user.id.slice(0, 8) + '…');
  return { client, user: data.user };
}

async function profileContext(ctx, label) {
  const { data, error, status, statusText } = await ctx.client
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

/* --------------------------------------------------------- canlı şema kontrolü */

/**
 * Salt-okur ön kontrol: PHASE 7 nesneleri canlı şemada var mı?
 * RLS satırları filtrelediği için "0 satır" normaldir; ölçüt "sorgu hatasız döndü mü".
 * Tablo/kolon yoksa gerçek PostgREST kodu (örn. PGRST205 / 42P01) raporlanır.
 */
async function schemaPreflight(client) {
  const checks = [
    ['tablo/kolon: clients.owner_user_id', () => unwrap(client.from('clients').select('id, owner_user_id').limit(1))],
    [
      'tablo/kolon: sessions(appointment_id, status, locked_at)',
      () => unwrap(client.from('sessions').select('id, appointment_id, status, locked_at').limit(1)),
    ],
    ['tablo/kolon: appointments.fee', () => unwrap(client.from('appointments').select('id, fee').limit(1))],
    [
      'tablo/kolon: formulations(status, content, revision, created_by)',
      () => unwrap(client.from('formulations').select('id, status, content, revision, created_by, updated_by').limit(1)),
    ],
    [
      'tablo/kolon: safety_plans(status, content, revision, created_by)',
      () => unwrap(client.from('safety_plans').select('id, status, content, revision, created_by, updated_by').limit(1)),
    ],
    ['kolon: reports.locked_at', () => unwrap(client.from('reports').select('id, locked_at').limit(1))],
    ['tablo: anamneses', () => unwrap(client.from('anamneses').select('id').limit(1))],
    ['tablo/kolon: documents.file_path', () => unwrap(client.from('documents').select('id, file_path').limit(1))],
    [`bucket: ${BUCKET}`, () => unwrap(client.storage.from(BUCKET).list('', { limit: 1 }))],
  ];
  for (const [name, run] of checks) await probe('SEMA', name, run, 'EXISTS');
}

/* --------------------------------------------------------- klinik zincir */

const today = () => new Date().toISOString().slice(0, 10);
const stamp = () => Date.now().toString(36);

/**
 * Kurum ataması yoksa SQL Editor'a yapıştırılmaya hazır seed dosyasını ÜRETİR.
 * E-postalar `.env.live`/ortam değişkenlerinden gelir; parola okunmaz/yazılmaz.
 * Çıktı: live-seed.local.sql (gitignore'da).
 */
function writeLocalSeed(profileA, profileB, profileAdmin) {
  const emails = {
    A: process.env.LIVE_PSY_A_EMAIL || profileA?.email,
    B: process.env.LIVE_PSY_B_EMAIL || profileB?.email,
    ADMIN: process.env.LIVE_ADMIN_EMAIL || profileAdmin?.email,
  };
  if (!emails.A || !emails.B || !emails.ADMIN) return null;

  const template = readFileSync('scripts/live-validation/seed-live-test-orgs.sql', 'utf8');
  const { sql, applied } = renderSeed(template, emails);
  const out = 'live-seed.local.sql';
  writeFileSync(out, sql, 'utf8');
  return { out, applied };
}

async function buildClinicalChain(a, orgId, clientId, label) {
  const sb = a.client;
  const group = 'CLINICAL DATA';
  const created = {};

  async function insert(table, row, name) {
    const { data, error, status, statusText } = await sb.from(table).insert(row).select('*').single();
    if (error) {
      const described = describeError(new DbError(error, status, statusText));
      record(group, name, 'FAIL', described.text, {
        httpStatus: described.facts.status,
        code: described.facts.code,
        kind: described.kind,
      });
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
    const { data, error, status, statusText } = await sb.from(table).select('id').eq('id', id);
    const found = !error && (data ?? []).length === 1;
    if (found) ok += 1;
    record(group, `${label}: ${table} okunabilir`, found ? 'PASS' : 'FAIL', error?.message ?? '');
  }
  return ok;
}

/* ------------------------------------------------------------------ main */

/**
 * Anon (oturumsuz) okuma/yazma matrisi — YIKICI OLMAYAN tasarım:
 * yalnızca bu blok için A tarafından oluşturulan GEÇİCİ danışan satırı hedeflenir;
 * beklenmeyen bir sızıntı ana test zincirini bozmaz.
 */
async function anonMatrix(anon, a, profileA, chainClientId) {
  let temp = null;
  try {
    temp = await unwrap(
      a.client
        .from('clients')
        .insert({
          organization_id: profileA.organization_id,
          file_number: `LIVE-ANON-${stamp()}`,
          first_name: 'Anon',
          last_name: 'Probe',
          status: 'active',
          created_by: a.user.id,
          owner_user_id: a.user.id,
        })
        .select('id')
        .single(),
    );
    record('RLS', 'geçici danışan (anon yazma testi için)', 'PASS', `clients · ${String(temp.id).slice(0, 8)}…`);
  } catch (error) {
    const described = describeError(error);
    record('RLS', 'geçici danışan (anon yazma testi için)', 'FAIL', described.text, {
      httpStatus: described.facts.status,
      code: described.facts.code,
      kind: described.kind,
    });
  }

  if (temp) {
    await probe(
      'RLS',
      'anon → geçici danışan SELECT (kayıt var, görünmemeli)',
      () => unwrap(anon.from('clients').select('id').eq('id', temp.id)),
      'DENY',
    );
    await probe(
      'RLS',
      'anon → geçici danışan UPDATE',
      () => unwrap(anon.from('clients').update({ phone: '05000000000' }).eq('id', temp.id).select('id')),
      'DENY',
    );
    await probe(
      'RLS',
      'anon → geçici danışan DELETE',
      () => unwrap(anon.from('clients').delete().eq('id', temp.id).select('id')),
      'DENY',
    );
    await probe(
      'RLS',
      'anon sonrası geçici danışan hâlâ mevcut',
      () => unwrap(a.client.from('clients').select('id').eq('id', temp.id)),
      'PASS',
    );
    await probe(
      'RLS',
      'geçici danışan silindi (temizlik)',
      () => unwrap(a.client.from('clients').delete().eq('id', temp.id).select('id')),
      'PASS',
    );
  }

  // Ana zincirdeki kayıt üzerinde salt-okur kanıt (kayıt A'da mevcut, anon'da görünmemeli)
  await probe(
    'RLS',
    'anon → ana zincir danışan SELECT',
    () => unwrap(anon.from('clients').select('id').eq('id', chainClientId)),
    'DENY',
  );
}

async function main() {
  if (process.argv.includes('--selftest')) return selfTest();

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
    const { data, error, status, statusText } = await anon.from('clients').select('id').limit(1);
    if (error) throw new DbError(error, status, statusText);
    return data;
  }, 'DENY');
  await probe('RLS', 'anon → clients INSERT', async () => {
    const { data, error, status, statusText } = await anon
      .from('clients')
      .insert({ first_name: 'Anon', last_name: 'Deneme', created_by: crypto.randomUUID() })
      .select('id');
    if (error) throw new DbError(error, status, statusText);
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

  // --- canlı şema ön kontrolü (seed'den ÖNCE de çalışır: gerçek migration durumunu gösterir)
  await schemaPreflight(a.client);

  if (!profileA?.organization_id || !profileB?.organization_id) {
    record(
      'RLS',
      'kurum ataması',
      'FAIL',
      'A/B profillerinde organization_id yok — seed uygulanmamış (aşağıdaki "SIRADAKİ ADIM" bloğuna bakın)',
    );

    // Kurum/rol ataması istemciden yapılamaz (profiles INSERT: organization_id is null şartı;
    // authenticated rolünde profiles UPDATE yetkisi yok). Bu yüzden koşucu, yönetici bağlamında
    // (SQL Editor) çalıştırılacak SQL'i hazırlar.
    try {
      const seed = writeLocalSeed(profileA, profileB, null);
      if (seed) {
        console.log(`\n  ↳ SQL Editor için hazır seed yazıldı: ${seed.out}`);
        console.log(`    A=${maskEmail(seed.applied.A)} · B=${maskEmail(seed.applied.B)} · ADMIN=${maskEmail(seed.applied.ADMIN)}`);
      } else {
        console.log('\n  ↳ Seed üretilemedi: LIVE_PSY_A/B/ADMIN_EMAIL değerleri okunamadı.');
      }
    } catch (error) {
      console.log(`\n  ↳ Seed üretilemedi: ${error instanceof Error ? error.message : String(error)}`);
    }

    return finish();
  }

  // --- klinik zincir (A)
  const chainA = await buildClinicalChain(a, profileA.organization_id, null, 'A');
  if (!chainA) return finish();

  // --- RLS matrisi
  await probe('RLS', 'A → A clients SELECT', async () => {
    const { data, error, status, statusText } = await a.client.from('clients').select('id').eq('id', chainA.clientId);
    if (error) throw new DbError(error, status, statusText);
    return data;
  }, 'PASS');
  await probe('RLS', 'A → A clients UPDATE', async () => {
    const { data, error, status, statusText } = await a.client
      .from('clients')
      .update({ phone: '05550000000' })
      .eq('id', chainA.clientId)
      .select('id');
    if (error) throw new DbError(error, status, statusText);
    return data;
  }, 'PASS');
  await probe('RLS', 'B → A clients SELECT', async () => {
    const { data, error, status, statusText } = await b.client.from('clients').select('id').eq('id', chainA.clientId);
    if (error) throw new DbError(error, status, statusText);
    return data;
  }, 'DENY');
  await probe('RLS', 'B → A clients UPDATE', async () => {
    const { data, error, status, statusText } = await b.client
      .from('clients')
      .update({ phone: '05551111111' })
      .eq('id', chainA.clientId)
      .select('id');
    if (error) throw new DbError(error, status, statusText);
    return data;
  }, 'DENY');
  await probe('RLS', 'B → A clients DELETE', async () => {
    const { data, error, status, statusText } = await b.client.from('clients').delete().eq('id', chainA.clientId).select('id');
    if (error) throw new DbError(error, status, statusText);
    return data;
  }, 'DENY');
  await probe('RLS', 'B → A sessions SELECT', async () => {
    const { data, error, status, statusText } = await b.client.from('sessions').select('id').eq('id', chainA.session?.id ?? '');
    if (error) throw new DbError(error, status, statusText);
    return data;
  }, 'DENY');
  await probe('RLS', "B → A org'a clients INSERT", async () => {
    const { data, error, status, statusText } = await b.client
      .from('clients')
      .insert({
        organization_id: profileA.organization_id,
        file_number: `LIVE-X-${stamp()}`,
        first_name: 'Sizma',
        last_name: 'Denemesi',
        created_by: b.user.id,
      })
      .select('id');
    if (error) throw new DbError(error, status, statusText);
    return data;
  }, 'DENY');
  if (admin) {
    await probe('RLS', 'Admin → A clients SELECT (yetkili kapsam)', async () => {
      const { data, error, status, statusText } = await admin.client.from('clients').select('id').eq('id', chainA.clientId);
      if (error) throw new DbError(error, status, statusText);
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
      const { data, error, status, statusText } = await a.client
        .from('sessions')
        .update({ plan: 'P: güncellenmiş sentetik plan' })
        .eq('id', sessionId)
        .select('id, status, revision');
      if (error) throw new DbError(error, status, statusText);
      return data;
    }, 'PASS');

    await probe('SIGN/LOCK', 'SIGN (draft → signed)', async () => {
      const { data, error, status, statusText } = await a.client
        .from('sessions')
        .update({ status: 'signed', signed_at: new Date().toISOString(), signed_by: a.user.id })
        .eq('id', sessionId)
        .select('id, status');
      if (error) throw new DbError(error, status, statusText);
      return data;
    }, 'PASS');

    await probe('SIGN/LOCK', 'LOCK (signed → locked)', async () => {
      const { data, error, status, statusText } = await a.client
        .from('sessions')
        .update({ status: 'locked', locked_at: new Date().toISOString(), locked_by: a.user.id })
        .eq('id', sessionId)
        .select('id, status');
      if (error) throw new DbError(error, status, statusText);
      return data;
    }, 'PASS');

    await probe('SIGN/LOCK', 'locked UPDATE (reddedilmeli)', async () => {
      const { data, error, status, statusText } = await a.client
        .from('sessions')
        .update({ plan: 'P: kilitli kayıt değiştirilemez' })
        .eq('id', sessionId)
        .select('id');
      if (error) throw new DbError(error, status, statusText);
      return data;
    }, 'DENY');

    await probe('SIGN/LOCK', 'locked DELETE (reddedilmeli)', async () => {
      const { data, error, status, statusText } = await a.client.from('sessions').delete().eq('id', sessionId).select('id');
      if (error) throw new DbError(error, status, statusText);
      return data;
    }, 'DENY');

    await probe('SIGN/LOCK', 'Amendment/Revision (yeni sürüm)', async () => {
      const { data, error, status, statusText } = await a.client
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
      if (error) throw new DbError(error, status, statusText);
      return data;
    }, 'PASS');

    const {
      data: superseded,
      error: supersededError,
      status: supersededStatus,
      statusText: supersededStatusText,
    } = await a.client.from('sessions').select('superseded_by, revision, status').eq('id', sessionId).maybeSingle();
    const supersededDetail = supersededError
      ? describeError(new DbError(supersededError, supersededStatus, supersededStatusText)).text
      : superseded?.superseded_by
        ? `rev=${superseded.revision}`
        : 'işaretlenmemiş';
    record(
      'SIGN/LOCK',
      'Eski sürüm superseded_by işaretlendi',
      superseded?.superseded_by ? 'PASS' : 'FAIL',
      supersededDetail,
    );
  }

  // --- STORAGE
  const path = `${profileA.organization_id}/${chainA.clientId}/${crypto.randomUUID()}-live-check.txt`;
  const payload = new Blob(['PHASE7 LIVE VALIDATION'], { type: 'text/plain' });

  await probe('STORAGE', 'A upload', async () => {
    const { data, error, status, statusText } = await a.client.storage.from(BUCKET).upload(path, payload, { contentType: 'text/plain' });
    if (error) throw new DbError(error, status, statusText);
    return data;
  }, 'PASS');
  await probe('STORAGE', 'A read', async () => {
    const { data, error, status, statusText } = await a.client.storage.from(BUCKET).download(path);
    if (error) throw new DbError(error, status, statusText);
    return data ? [data] : [];
  }, 'PASS');
  await probe('STORAGE', 'B read A', async () => {
    const { data, error, status, statusText } = await b.client.storage.from(BUCKET).download(path);
    if (error) throw new DbError(error, status, statusText);
    return data ? [data] : [];
  }, 'DENY');
  await probe('STORAGE', 'B update A', async () => {
    const { data, error, status, statusText } = await b.client.storage
      .from(BUCKET)
      .upload(path, new Blob(['B yazdi'], { type: 'text/plain' }), { upsert: true, contentType: 'text/plain' });
    if (error) throw new DbError(error, status, statusText);
    return data;
  }, 'DENY');
  await probe('STORAGE', 'B delete A', async () => {
    const { data, error, status, statusText } = await b.client.storage.from(BUCKET).remove([path]);
    if (error) throw new DbError(error, status, statusText);
    return Array.isArray(data) && data.length === 0 ? [] : data;
  }, 'DENY');
  await probe('STORAGE', 'A delete (temizlik)', async () => {
    const { data, error, status, statusText } = await a.client.storage.from(BUCKET).remove([path]);
    if (error) throw new DbError(error, status, statusText);
    return data;
  }, 'PASS');

  // --- anon (oturumsuz) yazma matrisi — geçici satır üzerinde, ana zincire dokunmaz
  await anonMatrix(anon, a, profileA, chainA.clientId);

  // --- LOGOUT ISOLATION
  await a.client.auth.signOut();
  const bAfterA = await signIn(process.env.LIVE_PSY_B_EMAIL, process.env.LIVE_PSY_B_PASSWORD, 'psikolog B (A çıkışı sonrası)');
  if (bAfterA) {
    await probe('LOGOUT', 'B oturumunda A verisi görünmemeli', async () => {
      const { data, error, status, statusText } = await bAfterA.client.from('clients').select('id').eq('id', chainA.clientId);
      if (error) throw new DbError(error, status, statusText);
      return data;
    }, 'DENY');
    await bAfterA.client.auth.signOut();
  }

  const aAgain = await signIn(process.env.LIVE_PSY_A_EMAIL, process.env.LIVE_PSY_A_PASSWORD, 'psikolog A (yeniden giriş)');
  if (aAgain) {
    await probe('LOGOUT', 'A yeniden girişte verisi geri gelmeli', async () => {
      const { data, error, status, statusText } = await aAgain.client.from('clients').select('id').eq('id', chainA.clientId);
      if (error) throw new DbError(error, status, statusText);
      return data;
    }, 'PASS');
    if (chainA.note?.id) {
      await probe('LOGOUT', 'A yeniden girişte notu da görünür', async () => {
        const { data, error, status, statusText } = await aAgain.client.from('notes').select('id').eq('id', chainA.note.id);
        if (error) throw new DbError(error, status, statusText);
        return data;
      }, 'PASS');
    }
    // --- temizlik: oturum AÇIKKEN (çıkış sonrası istek anon rolüne düşer ve reddedilir).
    //     Zincirde kilitli klinik kayıt varsa DB trigger'ı silmeyi (cascade dahil) reddeder;
    //     bu istenen immutability'dir → DENY + SKIP olarak raporlanır (cleanupPlan).
    let deleted = false;
    let cleanupErrorKind = null;
    let cleanupErrorText = '';
    let cleanupMeta = {};
    try {
      const data = await unwrap(
        aAgain.client.from('clients').delete().eq('id', chainA.clientId).select('id'),
      );
      deleted = Array.isArray(data) && data.length > 0;
    } catch (error) {
      const described = describeError(error);
      cleanupErrorKind = described.kind;
      cleanupErrorText = described.text;
      cleanupMeta = {
        httpStatus: described.facts.status,
        code: described.facts.code,
        kind: described.kind,
      };
    }

    const {
      data: afterCleanup,
      error: afterCleanupError,
      status: afterCleanupStatus,
      statusText: afterCleanupStatusText,
    } = await aAgain.client.from('clients').select('id').eq('id', chainA.clientId);

    if (afterCleanupError) {
      const described = describeError(new DbError(afterCleanupError, afterCleanupStatus, afterCleanupStatusText));
      record('CLEANUP', 'Sentetik zincir temizliği', 'FAIL', described.text, {
        httpStatus: described.facts.status,
        code: described.facts.code,
        kind: described.kind,
      });
    } else {
      const remainingRows = (afterCleanup ?? []).length;
      for (const step of cleanupPlan({ deleted, errorKind: cleanupErrorKind, remainingRows })) {
        const detail =
          step.detail ??
          (step.status === 'FAIL'
            ? cleanupErrorText
            : step.status === 'SKIP'
              ? 'kilitli klinik kayıt tasarım gereği silinemez — artık canlıda kalır (bkz. scripts/live-validation/cleanup-live-test-data.sql)'
              : '');
        record('CLEANUP', step.name, step.status, detail, step.status === 'FAIL' ? cleanupMeta : {});
      }
    }

    await aAgain.client.auth.signOut();
  }

  return finish();
}

async function selfTest() {
  console.log('\n=== hata biçimlendirme öz-testi (ağ yok) ===');
  const samples = [
    [
      'PostgREST RLS reddi',
      {
        message: 'new row violates row-level security policy for table "clients"',
        details: null,
        hint: null,
        code: '42501',
      },
      403,
      'Forbidden',
    ],
    [
      'GRANT katmanı reddi (anon)',
      {
        message: 'permission denied for table clients',
        details: null,
        hint: 'Grant the required privileges to the current role with: GRANT SELECT ON public.clients TO anon;',
        code: '42501',
      },
      401,
      'Unauthorized',
    ],
    [
      'Kilit trigger reddi (canlı koşu #4)',
      {
        message: 'Kilitli klinik kayıt değiştirilemez. Düzeltme için yeni revizyon oluşturun.',
        details: null,
        hint: null,
        code: 'P0001',
      },
      400,
      'Bad Request',
    ],
    [
      'Storage NoSuchKey (canlı koşu #4)',
      { message: 'Object not found', code: 'NoSuchKey', statusCode: '400' },
      undefined,
      '',
    ],
    [
      'PostgREST tablo yok',
      {
        message: "Could not find the table 'public.clients' in the schema cache",
        details: null,
        hint: null,
        code: 'PGRST205',
      },
      404,
      'Not Found',
    ],
    ['Ağ/TLS hatası', { message: 'TypeError: fetch failed', details: 'cause: ECONNRESET', hint: '', code: '' }, 0, ''],
    ['Auth hatası', { message: 'Invalid API key', details: '', hint: '', code: 'invalid_api_key', status: 401 }, undefined, ''],
    [
      'Sır ayıklama',
      // Not: jeton deseni çalışma anında kurulur; dosyada gerçek JWT benzeri dize tutulmaz.
      {
        message: `apikey=abc123&token=${['ey', 'JhbGciOiJIUzI1NiJ9', 'abcdefgh', 'ijklmnop'].join('.')}`,
        code: 'X',
      },
      400,
      'Bad Request',
    ],
  ];
  for (const [label, raw, status, statusText] of samples) {
    const described = describeError(status === undefined ? raw : new DbError(raw, status, statusText));
    console.log(`  ${label}: ${described.kind} → ${described.text}`);
  }
  console.log('\n  not: String(error) KULLANILMAZ — PostgREST hataları düz nesnedir ve "[object Object]" üretir.');

  console.log('\n=== probe() sınıflandırma simülasyonu (ağ yok) ===');
  const cases = [
    [
      'RLS reddi + DENY beklentisi',
      () => Promise.reject(new DbError({ code: '42501', message: 'new row violates row-level security policy' }, 403, 'Forbidden')),
      'DENY',
      'DENY',
    ],
    [
      'GRANT reddi (anon) + DENY beklentisi',
      () =>
        Promise.reject(
          new DbError({ code: '42501', message: 'permission denied for table clients' }, 401, 'Unauthorized'),
        ),
      'DENY',
      'DENY',
    ],
    ['RLS filtresi (0 satır) + DENY beklentisi', () => Promise.resolve([]), 'DENY', 'DENY'],
    ['Sızıntı (1 satır) + DENY beklentisi', () => Promise.resolve([{ id: 'x' }]), 'DENY', 'FAIL'],
    [
      'Tablo yok (PGRST205) + DENY beklentisi',
      () => Promise.reject(new DbError({ code: 'PGRST205', message: "Could not find the table 'public.clients' in the schema cache" }, 404, 'Not Found')),
      'DENY',
      'FAIL',
    ],
    ['Ağ hatası + DENY beklentisi', () => Promise.reject(new DbError({ message: 'TypeError: fetch failed' }, 0, '')), 'DENY', 'FAIL'],
    ['Auth reddi (401) + DENY beklentisi', () => Promise.reject(new DbError({ code: 'invalid_api_key', message: 'Invalid API key' }, 401, 'Unauthorized')), 'DENY', 'FAIL'],
    [
      'Kilit trigger reddi + DENY beklentisi (canlı koşu #4)',
      () =>
        Promise.reject(
          new DbError(
            {
              code: 'P0001',
              message: 'Kilitli klinik kayıt değiştirilemez. Düzeltme için yeni revizyon oluşturun.',
            },
            400,
            'Bad Request',
          ),
        ),
      'DENY',
      'DENY',
    ],
    [
      'Kilit trigger silme reddi + DENY beklentisi (canlı koşu #4)',
      () =>
        Promise.reject(
          new DbError(
            {
              code: 'P0001',
              message: 'Kilitli klinik kayıt silinemez. Düzeltme için yeni revizyon oluşturun.',
            },
            400,
            'Bad Request',
          ),
        ),
      'DENY',
      'DENY',
    ],
    [
      'Storage NoSuchKey + DENY beklentisi (canlı koşu #4)',
      () => Promise.reject(new DbError({ code: 'NoSuchKey', message: 'Object not found', statusCode: '400' }, null, '')),
      'DENY',
      'DENY',
    ],
    [
      'İlgisiz P0001 trigger hatası + DENY beklentisi',
      () => Promise.reject(new DbError({ code: 'P0001', message: 'Geçersiz seans tarihi' }, 400, 'Bad Request')),
      'DENY',
      'FAIL',
    ],
    ['PASS beklentisi karşılandı', () => Promise.resolve([{ id: 'y' }]), 'PASS', 'PASS'],
    [
      'PASS beklentisi RLS ile reddedildi',
      () => Promise.reject(new DbError({ code: '42501', message: 'permission denied for table clients' }, 403, 'Forbidden')),
      'PASS',
      'FAIL',
    ],
  ];

  let mismatches = 0;
  for (const [label, fn, expect, expectedStatus] of cases) {
    const before = RESULTS.length;
    await probe('SELFTEST', label, fn, expect);
    const actual = RESULTS[before]?.status;
    if (actual !== expectedStatus) mismatches += 1;
    console.log(`     ${actual === expectedStatus ? '✔ sınıflandırma doğru' : `✘ beklenen ${expectedStatus}, gelen ${actual}`}`);
  }

  console.log('\n=== CLEANUP rapor planı simülasyonu (ağ yok) ===');
  const cleanupCases = [
    [
      'silme başarılı',
      { deleted: true, errorKind: null, remainingRows: 0 },
      ['PASS', 'PASS'],
    ],
    [
      'kilitli kayıt engelledi',
      { deleted: false, errorKind: 'lock-deny', remainingRows: 1 },
      ['DENY', 'PASS', 'SKIP'],
    ],
    [
      'RLS engelledi (kilit dışı)',
      { deleted: false, errorKind: 'rls-deny', remainingRows: 1 },
      ['DENY', 'PASS', 'SKIP'],
    ],
    [
      'beklenmeyen hata',
      { deleted: false, errorKind: 'other', remainingRows: 1 },
      ['FAIL'],
    ],
    [
      'silindi ama kayıt hâlâ görünüyor',
      { deleted: true, errorKind: null, remainingRows: 1 },
      ['FAIL'],
    ],
  ];
  let cleanupMismatches = 0;
  for (const [label, input, expected] of cleanupCases) {
    const plan = cleanupPlan(input);
    const actual = plan.map((step) => step.status);
    const statusOk = actual.length === expected.length && actual.every((status, index) => status === expected[index]);
    // Kilit senaryosunda mesaj gerçekten "kilit" olduğunu söylemeli; diğer DENY'lerde jenerik olmalı.
    const nameOk =
      input.errorKind === null || input.errorKind === 'other'
        ? true
        : input.errorKind === 'lock-deny'
          ? /Kilitli klinik kayıt/.test(plan[0]?.name ?? '')
          : !/Kilitli/.test(plan[0]?.name ?? '');
    const ok = statusOk && nameOk;
    if (!ok) cleanupMismatches += 1;
    console.log(
      `  ${ok ? '✔' : '✘'} ${label}: ${actual.join(' + ')}${ok ? '' : ` (beklenen ${expected.join(' + ')}${nameOk ? '' : ' · mesaj adı'})`}`,
    );
  }

  console.log(`\n  sınıflandırma sonucu: ${cases.length - mismatches}/${cases.length} doğru`);
  console.log(`  CLEANUP planı: ${cleanupCases.length - cleanupMismatches}/${cleanupCases.length} doğru`);
  process.exit(mismatches === 0 && cleanupMismatches === 0 ? 0 : 1);
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

  const failuresWithMeta = RESULTS.filter((item) => item.status === 'FAIL' && (item.kind || item.code));
  if (failuresWithMeta.length) {
    const seen = new Map();
    for (const item of failuresWithMeta) {
      const key = `${item.kind ?? 'other'} · HTTP ${item.httpStatus ?? '?'} · code=${item.code ?? '(yok)'}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    console.log('\n--- FAIL nedenleri (gerçek HTTP durumu / PostgREST kodu) ---');
    for (const [key, count] of seen) console.log(`  ${count}x ${key}`);
  }

  if (RESULTS.some((item) => item.status === 'FAIL' && item.name === 'kurum ataması')) {
    console.log('\n--- SIRADAKİ ADIM (kurum ataması yok) ---');
    console.log('  1) Bu koşu, SQL Editor için hazır `live-seed.local.sql` dosyasını üretir');
    console.log('     (e-postalar .env.live içinden gelir; parola okunmaz/yazılmaz).');
    console.log('     Dosya üretilmediyse: node scripts/live-validation/emit-seed.mjs');
    console.log('  2) Supabase Dashboard → SQL Editor → `live-seed.local.sql` içeriğini yapıştırıp çalıştırın');
    console.log('     Beklenen çıktı: A/B/ADMIN satırları HAZIR + "A ve B kurum ataması TAMAM"');
    console.log('     (SQL Editor çıktısında NOTICE satırlarını da okuyun; eşleşme yoksa mevcut e-postaları listeler)');
    console.log('  3) node scripts/live-validation/run.mjs');
    console.log('  Not: kurum ataması istemciden YAPILAMAZ — profiles_insert_self politikası');
    console.log('       organization_id is null şartı ister ve authenticated rolünün profiles UPDATE');
    console.log('       yetkisi yoktur (P0-2 ile kapatılan yetki yükseltme açığı). Bu yüzden seed');
    console.log('       yönetici bağlamında (SQL Editor) çalıştırılır.');
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
