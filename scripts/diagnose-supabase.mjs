#!/usr/bin/env node
/**
 * Supabase canlı ortam teşhis betiği — harici bağımlılık YOK (Node 22 global fetch).
 *     npm run diagnose:supabase -- [--allow-destructive]
 *
 *   npm run diagnose:supabase
 *
 * Ortam değişkenleri (komut satırı bayrakları da geçerli):
 *   SUPABASE_URL         https://<proje-ref>.supabase.co
 *   SUPABASE_SERVICE_KEY service_role / sb_secret_... anahtarı (tam teşhis için şart)
 *   SITE_ORIGIN          uygulamanın yayın adresi (ALLOWED_ORIGINS testi için)
 *   ADMIN_JWT            (ops.) gerçek Admin oturumunun access_token'ı → Edge Function
 *                        delete akışını uçtan uca test eder
 *
 * Doğrulanan katmanlar:
 *   (1) migration geçmişi, şema/kolonlar, RLS politikaları, grant'lar, trigger'lar,
 *   (2) Edge Function erişilebilirliği + ALLOWED_ORIGINS (CORS) — admin-users ve
 *       ai-interpretation,
 *   (3) isteğe bağlı (--allow-destructive) uçtan uca yazma/silme akışı.
 *
 * Bayraklar:
 *   --url= --service-key= --anon-key= --origin= --admin-jwt=
 *   --allow-destructive   canlı yazma/silme testini çalıştırır: geçici bir
 *                         "diagnostik" kullanıcısı + kaydı oluşturur ve sonunda siler.
 *                         Gerçek danışan verisine dokunmaz.
 *
 * Betik iki katmanı ayırt eder:
 *   (1) veritabanı şeması / RLS / grant / trigger  → supabase db push
 *   (2) Edge Function + ALLOWED_ORIGINS (CORS)     → functions deploy / secrets set
 */

const RED = '\u001b[31m', GREEN = '\u001b[32m', YELLOW = '\u001b[33m', CYAN = '\u001b[36m', DIM = '\u001b[2m', BOLD = '\u001b[1m', RESET = '\u001b[0m';

const args = (() => {
  const out = { flags: new Set() };
  for (const raw of process.argv.slice(2)) {
    if (!raw.startsWith('--')) continue;
    const eq = raw.indexOf('=');
    if (eq === -1) out.flags.add(raw.slice(2));
    else out[raw.slice(2, eq)] = raw.slice(eq + 1);
  }
  return out;
})();
const env = process.env;

const SUPABASE_URL = (args.url || env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = args['service-key'] || env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = args['anon-key'] || env.SUPABASE_ANON_KEY || '';
const SITE_ORIGIN = (args.origin || env.SITE_ORIGIN || env.APP_ORIGIN || '').replace(/\/+$/, '');
const ADMIN_JWT = args['admin-jwt'] || env.ADMIN_JWT || '';
const DESTRUCTIVE = args.flags.has('allow-destructive');
const KEY = SERVICE_KEY || ANON_KEY;
const KEY_LABEL = SERVICE_KEY ? 'service' : 'anon (kısıtlı teşhis)';

/**
 * Depodaki `supabase/migrations/` dosyalarının ön ekleri. Betik bu listeyi
 * canlı `supabase_migrations.schema_migrations` kaydıyla karşılaştırır;
 * `tests/diagnostics.test.ts` listenin depoyla aynı kaldığını doğrular.
 */
const EXPECTED_MIGRATIONS = [
  '20260915000000',
  '20260919000000',
  '20260919010000',
  '20260919020000',
  '20260920000000',
  '20260923000000',
];

const findings = [];
function record(level, area, message, fix) {
  findings.push({ level, area, message, fix });
  const tag = level === 'fail' ? `${RED}[SORUN]${RESET}` : level === 'warn' ? `${YELLOW}[UYARI]${RESET}` : `${GREEN}[TAMAM]${RESET}`;
  console.log(`${tag} ${BOLD}${area}${RESET}: ${message}`);
  if (fix && level !== 'ok') console.log(`        ${DIM}→ ${fix}${RESET}`);
}
function section(title) {
  console.log(`\n${CYAN}${BOLD}── ${title} ${'─'.repeat(Math.max(0, 70 - title.length))}${RESET}`);
}
function die(message) {
  console.error(`\n${RED}${message}${RESET}`);
  process.exit(1);
}

/** Ağ isteği hiçbir koşulda betiği kilitlemesin (VPN/proxy/güvenlik duvarı). */
const FETCH_TIMEOUT_MS = 15_000;
const timeoutSignal = () => AbortSignal.timeout(FETCH_TIMEOUT_MS);

/**
 * Bir teşhis adımını ağ/proxy hatası yüzünden düşse bile raporlanabilir kılar:
 * yığın izi yerine "ulaşılamadı" bulgusu yazılır ve betik diğer adımlara devam eder.
 */
async function safe(label, step) {
  try {
    return await step();
  } catch (error) {
    const code = error?.cause?.code ?? error?.code ?? '';
    const detail = error?.name === 'TimeoutError'
      ? `${FETCH_TIMEOUT_MS / 1000} sn içinde yanıt gelmedi`
      : (error?.message ?? String(error));
    record('fail', label, `${detail}${code ? ` (${code})` : ''} → ${SUPABASE_URL} adresine ulaşılamadı`,
      'Ağ/proxy erişimini ve SUPABASE_URL proje ref’ini doğrulayın; kurumsal ağda giden HTTPS izni gerekir');
    return null;
  }
}

function decodeJwt(key) {
  try {
    const part = String(key).split('.')[1];
    return part ? JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) : null;
  } catch { return null; }
}

async function rest(path, { method = 'GET', key = KEY, body, prefer, headers = {} } = {}) {
  const h = { apikey: key, Authorization: `Bearer ${key}`, ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (prefer) h.Prefer = prefer;
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method, headers: h, signal: timeoutSignal(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* JSON değil */ }
  return { status: response.status, headers: response.headers, text, json };
}

function errLine(res) {
  if (res.json && typeof res.json.message === 'string') {
    const j = res.json;
    return `HTTP ${res.status} · code=${j.code ?? '-'} · ${j.message}${j.details ? ` · details=${j.details}` : ''}${j.hint ? ` · hint=${j.hint}` : ''}`;
  }
  return `HTTP ${res.status} · ${res.text.slice(0, 220)}`;
}

function todayIstanbul() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = type => parts.find(part => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Migration'ların kabul ettiği geçerli "quick" veri yükü (566 cevap). */
function quickPayload() {
  return [
    { kind: 'case-meta', version: '1', method: 'quick' },
    { kind: 'quick-entry', answers: Array.from({ length: 566 }, () => 'Y') },
  ];
}

// ---------------------------------------------------------------------------
// 1. Şema (PostgREST OpenAPI) — anonim anahtarla bile çalışır
// ---------------------------------------------------------------------------
async function checkSchema() {
  section('1) Şema: tablolar ve kolonlar');
  const res = await rest('/rest/v1/');
  if (res.status !== 200) {
    record('fail', 'REST kökü', `şema okunamadı (${errLine(res)})`, 'SUPABASE_URL / apikey doğru mu?');
    return false;
  }
  const defs = res.json?.definitions ?? {};
  const names = new Set(Object.keys(defs));
  for (const table of ['profiles', 'mmpi_records', 'audit_logs']) {
    if (names.has(table)) record('ok', `tablo ${table}`, 'REST şemasında görünüyor');
    else record('fail', `tablo ${table}`, 'REST şemasında YOK', 'supabase db push');
  }

  const recordColumns = defs.mmpi_records?.properties ?? {};
  for (const column of ['expert_notes', 'notes_updated_at']) {
    if (recordColumns[column]) record('ok', `mmpi_records.${column}`, 'kolon mevcut');
    else record('fail', `mmpi_records.${column}`,
      'KOLON YOK → uygulama “Kayıt işlemleri için veritabanı güncellemesi gerekiyor” der ve rest/v1/mmpi_records?id=eq... isteği 400 (42703) döner',
      'supabase db push');
  }
  for (const column of ['role', 'active']) {
    if (!(defs.profiles?.properties ?? {})[column]) record('fail', `profiles.${column}`, 'kolon YOK → Admin paneli hiç çalışmaz', 'supabase db push');
  }
  return true;
}

// ---------------------------------------------------------------------------
// 2. Katalog teşhisi: policy / grant / trigger / audit_logs.actor / migration'lar
//    Supabase SQL endpoint'i üzerinden geçici bir security-definer fonksiyon kurar.
// ---------------------------------------------------------------------------
const DIAG_SQL = `
create or replace function public.diag_report()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $diag$
declare
  report jsonb;
begin
  select jsonb_build_object(
    'tables', (
      select jsonb_object_agg(c.relname, c.relrowsecurity)
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and c.relname in ('profiles', 'mmpi_records', 'audit_logs')
    ),
    'record_columns', (
      select coalesce(jsonb_agg(a.attname order by a.attname), '[]'::jsonb)
      from pg_attribute a
      where a.attrelid = 'public.mmpi_records'::regclass and a.attnum > 0 and not a.attisdropped
    ),
    'audit_actor_nullable', (
      select case
        when to_regclass('public.audit_logs') is null then null
        else (select a.attnotnull = false from pg_attribute a
              where a.attrelid = 'public.audit_logs'::regclass and a.attname = 'actor')
      end
    ),
    'audit_columns', (
      select case when to_regclass('public.audit_logs') is null then null else (
        select coalesce(jsonb_agg(a.attname order by a.attnum), '[]'::jsonb)
        from pg_attribute a
        where a.attrelid = 'public.audit_logs'::regclass and a.attnum > 0 and not a.attisdropped
      ) end
    ),
    'policies', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', c.relname, 'name', p.polname,
        'cmd', case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT'
               when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end,
        'roles', (select coalesce(array_agg(r.rolname), '{}') from unnest(p.polroles) as role_oid
                  join pg_roles r on r.oid = role_oid)
      ) order by c.relname, p.polname), '[]'::jsonb)
      from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname in ('profiles', 'mmpi_records', 'audit_logs')
    ),
    'grants', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', c.relname, 'role', r.rolname, 'privileges', (
          select array_agg(p order by p) from unnest(array['SELECT','INSERT','UPDATE','DELETE']) as p
          where has_table_privilege(r.oid, c.oid, p)
        )
      ) order by c.relname, r.rolname), '[]'::jsonb)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join pg_roles r
      where n.nspname = 'public' and c.relkind = 'r'
        and c.relname in ('profiles', 'mmpi_records', 'audit_logs')
        and r.rolname in ('authenticated', 'anon')
    ),
    'triggers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', c.relname, 'trigger', t.tgname,
        'timing', case when (t.tgtype & 2) > 0 then 'BEFORE' else 'AFTER' end,
        'events', trim(both ',' from
          case when (t.tgtype & 4) > 0 then 'INSERT,' else '' end ||
          case when (t.tgtype & 8) > 0 then 'DELETE,' else '' end ||
          case when (t.tgtype & 16) > 0 then 'UPDATE,' else '' end),
        'function', pg_get_triggerdef(t.oid)
      ) order by c.relname, t.tgname), '[]'::jsonb)
      from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and not t.tgisinternal
        and c.relname in ('profiles', 'mmpi_records', 'audit_logs')
    ),
    'helper_functions', (
      select coalesce(jsonb_agg(p.proname order by p.proname), '[]'::jsonb)
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('is_admin', 'is_psychologist', 'is_active_user', 'log_mmpi_record_change',
                          'protect_mmpi_record_fields', 'validate_mmpi_record_intake', 'handle_new_auth_user')
    ),
    'migrations', (
      select case when to_regclass('supabase_migrations.schema_migrations') is null then null else (
        select coalesce(jsonb_agg(version order by version), '[]'::jsonb) from supabase_migrations.schema_migrations
      ) end
    )
  ) into report;
  return report;
exception when others then
  return jsonb_build_object('error', sqlerrm, 'state', sqlstate);
end;
$diag$;
revoke all on function public.diag_report() from public, anon, authenticated;
grant execute on function public.diag_report() to service_role;
`;

async function catalogReport() {
  section('2) Veritabanı kataloğu: migration, politika, grant, trigger');
  if (!SERVICE_KEY) {
    record('warn', 'katalog teşhisi atlandı', 'Service anahtarı olmadan SQL endpoint kullanılamaz', 'SUPABASE_SERVICE_KEY=... ile yeniden çalıştırın');
    return null;
  }
  const install = await rest('/pg/query', { method: 'POST', body: { query: DIAG_SQL } });
  if (install.status !== 200 && install.status !== 201 && install.status !== 204) {
    record('warn', 'diag_report() kurulamadı', `${errLine(install)} — SQL endpoint kapalı olabilir`,
      'supabase db push (SQL endpoint kapalıysa: supabase/migrations/*.sql dosyalarını SQL Editor’da sırayla çalıştırın)');
    return null;
  }
  const res = await rest('/rest/v1/rpc/diag_report', { method: 'POST', body: {} });
  if (res.status !== 200 || !res.json || typeof res.json !== 'object') {
    record('warn', 'diag_report()', errLine(res), 'supabase db push');
    return null;
  }
  const report = res.json;
  if (report.error) {
    record('warn', 'diag_report()', `fonksiyon hata döndürdü: ${report.error} (${report.state})`, 'supabase db push');
    return null;
  }

  console.log(`${DIM}  migration kayıtları: ${JSON.stringify(report.migrations)}${RESET}`);
  if (Array.isArray(report.migrations)) {
    const applied = report.migrations.map(String);
    const missing = EXPECTED_MIGRATIONS.filter(prefix => !applied.some(version => version.startsWith(prefix)));
    if (missing.length === 0) {
      record('ok', 'migration geçmişi',
        `${EXPECTED_MIGRATIONS.length} migration da uygulanmış (uygulanan: ${applied.join(', ') || 'yok'})`);
    }
    else record('fail', 'migration geçmişi', `EKSİK: ${missing.join(', ')} (uygulanan: ${applied.join(', ') || 'yok'})`, 'supabase db push');
  } else {
    record('warn', 'migration geçmişi', 'supabase_migrations.schema_migrations okunamadı; migration’lar elle (SQL Editor) uygulanmış olabilir', 'supabase db push');
  }

  const columns = report.record_columns ?? [];
  console.log(`${DIM}  mmpi_records kolonları: ${columns.join(', ')}${RESET}`);

  if (report.audit_actor_nullable === true) {
    record('ok', 'audit_logs.actor', 'NULL kabul ediyor → service-role CASCADE silmesi çökmez');
  } else if (report.audit_actor_nullable === false) {
    record('fail', 'audit_logs.actor',
      'NOT NULL! Edge Function psikologu silerken mmpi_records CASCADE ile silinir, AFTER DELETE trigger’ı auth.uid()=NULL ile audit_logs’a yazar ve silme geri alınır → “Kullanıcı hesabı silinemedi”',
      'supabase db push (audit_logs.actor nullable olmalı)');
  } else {
    record('fail', 'audit_logs', 'tablo yok', 'supabase db push');
  }

  const policies = report.policies ?? [];
  console.log(`${DIM}  politikalar: ${policies.map(p => `${p.table}/${p.cmd}:${p.name}`).join(', ') || '(yok)'}${RESET}`);
  const required = [
    ['mmpi_records', 'SELECT', 'mmpi_records_select'],
    ['mmpi_records', 'INSERT', 'mmpi_records_insert'],
    ['mmpi_records', 'UPDATE', 'mmpi_records_update'],
    ['mmpi_records', 'DELETE', 'mmpi_records_delete'],
    ['profiles', 'SELECT', 'profiles_select'],
    ['audit_logs', 'SELECT', 'audit_logs_select'],
  ];
  for (const [table, cmd, name] of required) {
    const found = policies.find(p => p.table === table && p.cmd === cmd);
    if (found) record('ok', `policy ${table} ${cmd}`, `${found.name} mevcut, roller: ${(found.roles ?? []).join('/')}`);
    else record('fail', `policy ${table} ${cmd}`, 'politik yok → bu işlem 0 satır etkiler ya da 42501 verir', 'supabase db push');
  }
  const forbidden = policies.filter(p => p.table === 'profiles' && ['INSERT', 'UPDATE', 'DELETE', 'ALL'].includes(p.cmd));
  if (forbidden.length > 0) {
    record('fail', 'profiles yazma politikası', `${forbidden.map(p => p.cmd).join('/')} politikası var; hesap yaşam döngüsü yalnız Edge Function’da olmalı`, 'supabase db push');
  } else {
    record('ok', 'profiles yazma politikası', 'yok (doğru: silme/aktiflik Edge Function üzerinden)');
  }

  const grants = report.grants ?? [];
  console.log(`${DIM}  grant’lar: ${grants.map(g => `${g.table}/${g.role}=${(g.privileges ?? []).join('+')}`).join(' | ') || '(yok)'}${RESET}`);
  const recordGrant = grants.find(g => g.table === 'mmpi_records' && g.role === 'authenticated');
  for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
    if (!(recordGrant?.privileges ?? []).includes(privilege)) {
      record('fail', `grant mmpi_records.${privilege}`, 'authenticated rolüne verilmemiş → PostgREST 42501 döner', 'supabase db push');
    }
  }
  if ((recordGrant?.privileges ?? []).length === 4) record('ok', 'grant mmpi_records', 'authenticated: SELECT+INSERT+UPDATE+DELETE');

  const triggers = report.triggers ?? [];
  console.log(`${DIM}  trigger’lar: ${triggers.map(t => `${t.table}/${t.trigger}(${t.timing} ${t.events})`).join(', ') || '(yok)'}${RESET}`);
  const auditTrigger = triggers.find(t => t.table === 'mmpi_records' && /audit/i.test(t.trigger));
  if (auditTrigger) record('ok', 'audit trigger', `${auditTrigger.trigger}: ${auditTrigger.timing} ${auditTrigger.events}`);
  else record('warn', 'audit trigger', 'mmpi_records üzerinde denetim trigger’ı yok', 'supabase db push');
  // on_auth_user_created trigger'ı auth.users üzerinde olduğundan bu listede görünmez;
  // gerçekten çalışıp çalışmadığını 4. adımdaki uçtan uca test (profil oluştu mu) doğrular.

  const helpers = report.helper_functions ?? [];
  for (const fn of ['is_admin', 'is_psychologist', 'is_active_user', 'log_mmpi_record_change']) {
    if (helpers.includes(fn)) record('ok', `fonksiyon ${fn}()`, 'mevcut');
    else record('fail', `fonksiyon ${fn}()`, 'YOK → kayıt işlemleri (insert/update/delete) veya RLS politikaları hata verir', 'supabase db push');
  }
  return report;
}

// ---------------------------------------------------------------------------
// 3. Edge Function: erişilebilirlik + ALLOWED_ORIGINS (CORS)
// ---------------------------------------------------------------------------
async function checkEdgeFunction() {
  section('3) Edge Function: admin-users');
  const base = `${SUPABASE_URL}/functions/v1/admin-users`;
  const fakeId = '00000000-0000-4000-8000-000000000000';

  const probe = await fetch(base, {
    method: 'POST',
    signal: timeoutSignal(),
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', userId: fakeId }),
  });
  const probeText = await probe.text();
  if (probe.status === 404) {
    record('fail', 'deploy', 'Function 404 → admin-users deploy edilmemiş', 'supabase functions deploy admin-users');
    return;
  }
  if (probe.status === 500 && /configuration is incomplete/i.test(probeText)) {
    record('fail', 'function env', '“Function configuration is incomplete” → SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fonksiyona ulaşmıyor', 'supabase functions deploy admin-users (güncel kodla)');
  } else if (probe.status === 403 && /origin not allowed/i.test(probeText)) {
    record('fail', 'ALLOWED_ORIGINS',
      `function origin allowlist'i dar: Origin başlığı gönderilmeyen istek bile reddedildi (403 Origin not allowed)`,
      `supabase secrets set ALLOWED_ORIGINS=${SITE_ORIGIN || 'https://UYGULAMA-ADRESINIZ'}`);
  } else {
    record('ok', 'erişilebilirlik', `function yanıt verdi: HTTP ${probe.status} ${probeText.slice(0, 100)}`);
  }

  if (SITE_ORIGIN) {
    const preflight = await fetch(base, {
      method: 'OPTIONS',
      signal: timeoutSignal(),
      headers: { Origin: SITE_ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type,apikey,x-client-info', apikey: KEY },
    });
    await preflight.text().catch(() => '');
    const allow = preflight.headers.get('access-control-allow-origin');
    if (allow === SITE_ORIGIN || allow === '*') {
      record('ok', 'CORS preflight', `${SITE_ORIGIN} izinli (Access-Control-Allow-Origin: ${allow})`);
    } else {
      record('fail', 'CORS preflight',
        `${SITE_ORIGIN} için Access-Control-Allow-Origin YOK → tarayıcı isteği keser; uygulama “Kullanıcı hesabı silinemedi. Edge Function bağlantısını kontrol edin.” der`,
        `supabase secrets set ALLOWED_ORIGINS=${SITE_ORIGIN}`);
    }
    const withOrigin = await fetch(base, {
      method: 'POST',
      signal: timeoutSignal(),
      headers: { Origin: SITE_ORIGIN, apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', userId: fakeId }),
    });
    const bodyText = await withOrigin.text();
    const acaoHeader = withOrigin.headers.get('access-control-allow-origin');
    if (withOrigin.status === 403 && /origin not allowed/i.test(bodyText)) {
      record('fail', 'ALLOWED_ORIGINS', `function ${SITE_ORIGIN} origin’ini reddediyor (403 Origin not allowed)`, `supabase secrets set ALLOWED_ORIGINS=${SITE_ORIGIN}`);
    } else if (!acaoHeader) {
      record('warn', 'ALLOWED_ORIGINS',
        `yanıtta Access-Control-Allow-Origin yok (HTTP ${withOrigin.status}) → tarayıcı gövdeyi okuyamaz. ` +
        'İki olası neden: (a) allowlist boş/bu origin listede değil, (b) verify_jwt isteği function’a ulaşmadan gateway’de reddetti',
        `supabase secrets set ALLOWED_ORIGINS=${SITE_ORIGIN}  ·  gerekirse: supabase functions deploy admin-users`);
    } else {
      record('ok', 'ALLOWED_ORIGINS', `${SITE_ORIGIN} allowlist'te (HTTP ${withOrigin.status}, ACAO: ${acaoHeader})`);
    }
  } else {
    record('warn', 'CORS testi atlandı',
      'SITE_ORIGIN verilmedi. Boş ALLOWED_ORIGINS yalnızca http://localhost’a izin verir; yayın adresiniz sessizce engellenir',
      'SITE_ORIGIN=https://uygulama-adresiniz npm run diagnose:supabase');
  }

  if (ADMIN_JWT) {
    const asAdmin = await fetch(base, {
      method: 'POST',
      signal: timeoutSignal(),
      headers: { apikey: KEY, Authorization: `Bearer ${ADMIN_JWT}`, 'Content-Type': 'application/json', ...(SITE_ORIGIN ? { Origin: SITE_ORIGIN } : {}) },
      body: JSON.stringify({ action: 'delete', userId: fakeId }),
    });
    const adminText = await asAdmin.text();
    if (asAdmin.status === 404 && /not found/i.test(adminText)) {
      record('ok', 'Admin delete akışı', `token kabul edildi, Admin doğrulandı, hedef kullanıcı yok (404) → silme yolu açık`);
    } else if (asAdmin.status === 403 && /admin role required/i.test(adminText)) {
      record('fail', 'Admin delete akışı', 'token geçerli ama çağıran profilinde role=ADMIN / active=true değil',
        `SQL Editor: update public.profiles set role='ADMIN', active=true where id='<admin uuid>';`);
    } else if (asAdmin.status === 403 && /origin not allowed/i.test(adminText)) {
      record('fail', 'Admin delete akışı', `origin reddedildi`, `supabase secrets set ALLOWED_ORIGINS=${SITE_ORIGIN || 'https://uygulama-adresiniz'}`);
    } else {
      record('warn', 'Admin delete akışı', `HTTP ${asAdmin.status}: ${adminText.slice(0, 160)}`, 'supabase db push + functions deploy');
    }
  } else {
    record('warn', 'Admin delete testi atlandı', 'ADMIN_JWT verilmedi; function’ın Admin doğrulaması test edilmedi',
      'Tarayıcı konsolundan Admin oturumunun access_token’ını alıp ADMIN_JWT=... ile çalıştırın');
  }
}

// ---------------------------------------------------------------------------
// 3b. Edge Function: ai-interpretation (karar desteği) — deploy + CORS + secret
// ---------------------------------------------------------------------------
async function checkAiFunction() {
  section('3b) Edge Function: ai-interpretation (yapay zekâ kararı desteği)');
  const base = `${SUPABASE_URL}/functions/v1/ai-interpretation`;

  // Gövde bilinçli olarak boş bırakılır: bu çağrı yalnızca "fonksiyon ayakta mı,
  // JWT kapısı ve origin allowlist'i çalışıyor mu" sorusunu yanıtlar. Geçerli
  // bir istek yapılmadığı için LLM çağrısı ve token harcaması olmaz.
  const probe = await fetch(base, { method: 'POST', signal: timeoutSignal(), headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const probeText = (await probe.text()).slice(0, 200);

  if (probe.status === 404) {
    record('warn', 'ai-interpretation deploy', 'Function 404 → deploy edilmemiş; arayüzdeki AI bölümü çalışmaz',
      'supabase functions deploy ai-interpretation');
  } else if (probe.status === 401) {
    record('ok', 'ai-interpretation deploy', 'deploy edilmiş ve JWT kapısı (verify_jwt) isteği reddetti');
  } else if (probe.status === 503) {
    record('warn', 'AI_API_KEY', 'AI_API_KEY secret’ı tanımlı değil; bölüm arayüzde sessizce kapanır',
      'supabase secrets set AI_API_KEY=... AI_MODEL=gemini-2.5-flash (Gemini) veya AI_API_KEY=... AI_PROVIDER=openai AI_MODEL=gpt-4o-mini');
  } else if (probe.status === 403 && /origin not allowed/i.test(probeText)) {
    record('warn', 'ai-interpretation CORS', 'Origin başlığı olmayan istek reddedildi (403 Origin not allowed)',
      `supabase secrets set ALLOWED_ORIGINS=${SITE_ORIGIN || 'https://UYGULAMA-ADRESINIZ'} (admin-users ile aynı değer)`);
  } else {
    record('ok', 'ai-interpretation deploy', `function yanıt verdi: HTTP ${probe.status}`);
  }

  if (SITE_ORIGIN) {
    const preflight = await fetch(base, {
      method: 'OPTIONS',
      signal: timeoutSignal(),
      headers: { Origin: SITE_ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type,apikey,x-client-info', apikey: KEY },
    });
    await preflight.text().catch(() => '');
    const allow = preflight.headers.get('access-control-allow-origin');
    if (allow === SITE_ORIGIN || allow === '*') {
      record('ok', 'ai-interpretation CORS preflight', `${SITE_ORIGIN} izinli`);
    } else if (probe.status === 404) {
      record('warn', 'ai-interpretation CORS preflight', 'Function deploy edilmediği için CORS ölçülemedi', 'supabase functions deploy ai-interpretation');
    } else {
      record('warn', 'ai-interpretation CORS preflight',
        `${SITE_ORIGIN} için Access-Control-Allow-Origin YOK → tarayıcı AI isteğini keser (mmpi566:ai önbelleği devre dışı kalır)`,
        `supabase secrets set ALLOWED_ORIGINS=${SITE_ORIGIN}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Canlı uçtan uca test: geçici kullanıcı → kayıt → not → sil → cascade
// ---------------------------------------------------------------------------
async function destructiveFlow() {
  section('4) Canlı uçtan uca test (geçici diagnostik kullanıcısı)');
  if (!SERVICE_KEY) { record('warn', 'atlandı', 'Service anahtarı gerekiyor', 'SUPABASE_SERVICE_KEY verin'); return; }

  const stamp = Date.now().toString(36);
  const email = `diagnostik-${stamp}@example.invalid`;
  const password = `Diagnostik-${stamp}-Aa1`;

  const created = await rest('/auth/v1/admin/users', {
    method: 'POST',
    body: { email, password, email_confirm: true, user_metadata: { first_name: 'Diagnostik', last_name: 'Kullanici' } },
  });
  const userId = created.json?.id;
  if (created.status < 200 || created.status >= 300 || !userId) {
    record('fail', 'auth.admin.createUser', errLine(created), 'Service anahtarı geçerli mi?');
    return;
  }
  record('ok', 'auth.admin.createUser', `geçici kullanıcı ${userId}`);

  const profile = await rest(`/rest/v1/profiles?id=eq.${userId}&select=id,role,active`);
  if (profile.status === 200 && profile.json?.length === 1) {
    record('ok', 'handle_new_auth_user', `profil oluştu (role=${profile.json[0].role}, active=${profile.json[0].active})`);
  } else {
    record('fail', 'handle_new_auth_user', `profil OLUŞMADI (${errLine(profile)}) → Edge Function create akışı “Kullanıcı profili oluşturulamadı” der`, 'supabase db push');
  }

  const inserted = await rest('/rest/v1/mmpi_records', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      idempotency_key: crypto.randomUUID(),
      client_first_name: 'Diagnostik',
      client_last_name: 'Kayit',
      gender: 'Diğer',
      age: 30,
      occupation: 'Diagnostik',
      education: 'Diagnostik',
      application_date: todayIstanbul(),
      requested_by: 'diagnostik',
      raw_omr_answers: quickPayload(),
      created_by: userId,
    },
  });
  const recordId = inserted.json?.[0]?.id;
  if (inserted.status === 201 && recordId) {
    record('ok', 'INSERT mmpi_records', `test kaydı ${recordId}`);
  } else {
    record('fail', 'INSERT mmpi_records', errLine(inserted), 'supabase db push');
  }

  if (recordId) {
    const updated = await rest(`/rest/v1/mmpi_records?id=eq.${recordId}`, {
      method: 'PATCH',
      prefer: 'return=minimal, count=exact',
      body: { expert_notes: 'diagnostik not', notes_updated_at: new Date().toISOString() },
    });
    if (updated.status >= 200 && updated.status < 300) {
      record('ok', 'UPDATE expert_notes (count=exact)', `başarılı, Content-Range: ${updated.headers.get('content-range') ?? '-'}`);
    } else {
      record('fail', 'UPDATE expert_notes (count=exact)', errLine(updated), 'supabase db push (kolon veya UPDATE politikası eksik)');
    }

    const deleted = await rest(`/rest/v1/mmpi_records?id=eq.${recordId}`, { method: 'DELETE', prefer: 'return=minimal, count=exact' });
    if (deleted.status >= 200 && deleted.status < 300) {
      record('ok', 'DELETE mmpi_records (count=exact)', `başarılı, Content-Range: ${deleted.headers.get('content-range') ?? '-'} → tarayıcıdaki deleteRecord() de çalışır`);
    } else {
      record('fail', 'DELETE mmpi_records (count=exact)', errLine(deleted),
        'code=42703/PGRST204 → migration eksik · code=P0001 → trigger exception · code=23502 → audit_logs.actor NOT NULL · code=42501 → grant/RLS');
      const plain = await rest(`/rest/v1/mmpi_records?id=eq.${recordId}`, { method: 'DELETE' });
      if (plain.status >= 200 && plain.status < 300) {
        record('warn', 'DELETE (count olmadan)', 'count=exact olmadan silme BAŞARILI → sorun Prefer: count=exact başlığında', 'deleteRecord() içindeki count seçeneğini kaldırın');
      } else {
        record('fail', 'DELETE (count olmadan)', errLine(plain), 'supabase db push');
      }
    }
  }

  if (recordId) {
    // CASCADE testi: ikinci bir kayıt bırakıp Auth kullanıcısını siliyoruz.
    const second = await rest('/rest/v1/mmpi_records', {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        idempotency_key: crypto.randomUUID(),
        client_first_name: 'Diagnostik',
        client_last_name: 'Cascade',
        gender: 'Diğer',
        age: 31,
        occupation: 'Diagnostik',
        education: 'Diagnostik',
        application_date: todayIstanbul(),
        requested_by: 'diagnostik',
        raw_omr_answers: quickPayload(),
        created_by: userId,
      },
    });
    if (second.status !== 201) record('warn', 'cascade hazırlığı', `ikinci kayıt yazılamadı: ${errLine(second)}`, 'supabase db push');
  }

  const cascade = await rest(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' });
  if (cascade.status >= 200 && cascade.status < 300) {
    record('ok', 'auth.admin.deleteUser (CASCADE)', 'kullanıcı + ilişkili kayıtlar silindi → Admin panelindeki “hesabı sil” akışı çalışır');
  } else {
    record('fail', 'auth.admin.deleteUser (CASCADE)', errLine(cascade),
      'En olası neden: audit_logs.actor NOT NULL + AFTER DELETE trigger. supabase db push ile onarım migration’ını uygulayın');
  }

  const leftOver = await rest(`/rest/v1/profiles?id=eq.${userId}&select=id`);
  if (leftOver.status === 200 && (leftOver.json?.length ?? 0) > 0) {
    record('warn', 'temizlik', `geçici profil hâlâ duruyor (${userId}); Dashboard → Authentication → Users’tan silin`, 'elle temizlik');
  } else {
    record('ok', 'temizlik', 'geçici diagnostik verisi tamamen kaldırıldı');
  }
}

// ---------------------------------------------------------------------------
// Özet
// ---------------------------------------------------------------------------
function summary() {
  section('ÖZET VE ÇÖZÜM');
  const fails = findings.filter(f => f.level === 'fail');
  const warns = findings.filter(f => f.level === 'warn');
  const jwt = decodeJwt(KEY);
  console.log(`Proje       : ${SUPABASE_URL}`);
  console.log(`Anahtar     : ${KEY_LABEL}${jwt?.role ? ` (role=${jwt.role}, exp=${jwt.exp ? new Date(jwt.exp * 1000).toISOString() : '-'})` : ''}`);
  console.log(`Site origin : ${SITE_ORIGIN || '(verilmedi)'}`);
  console.log(`Sonuç       : ${RED}${fails.length} sorun${RESET}, ${YELLOW}${warns.length} uyarı${RESET}, ${GREEN}${findings.length - fails.length - warns.length} tamam${RESET}`);

  if (fails.length === 0) {
    console.log(`\n${GREEN}${BOLD}Canlı proje tarafında engel bulunamadı.${RESET} Hata sürüyorsa:`);
    console.log('  • Yayınlanan dosya güncel mi? (npm run build → optik-form.html / dist yeniden deploy)');
    console.log('  • Tarayıcı önbelleği/service worker temizlendi mi? (hard refresh)');
    console.log('  • Oturum gerçekten ADMIN ve aktif mi? (bu betiği ADMIN_JWT ile çalıştırın)');
    if (warns.length > 0) console.log(`  • ${warns.length} uyarı yukarıda listelendi; atlanan testleri service anahtarıyla yeniden koşun.`);
    return;
  }

  const has = pattern => fails.some(f => pattern.test(`${f.fix ?? ''} ${f.message ?? ''}`));
  const steps = [];
  if (has(/db push/i)) {
    steps.push('supabase link --project-ref <proje-ref>   # bir kez');
    steps.push(`supabase db push                          # ${EXPECTED_MIGRATIONS.length} migration'ın tamamı canlıya gider`);
  }
  if (has(/ALLOWED_ORIGINS/i)) steps.push(`supabase secrets set ALLOWED_ORIGINS=${SITE_ORIGIN || 'https://UYGULAMA-ADRESINIZ'}   # virgülle birden çok origin`);
  if (has(/functions deploy/i)) steps.push('supabase functions deploy admin-users');
  if (fails.some(f => /role='ADMIN'/i.test(`${f.fix ?? ''}`))) steps.push(`SQL Editor: update public.profiles set role = 'ADMIN', active = true where email = '<admin e-postası>';`);
  if (steps.length === 0) fails.forEach(f => steps.push(`${f.area}: ${f.fix ?? f.message}`));

  console.log(`\n${BOLD}Sırayla çalıştırın:${RESET}`);
  steps.forEach((step, index) => console.log(`  ${index + 1}. ${step}`));
  console.log(`\n  Doğrulama: ${DIM}npm run diagnose:supabase -- --allow-destructive${RESET}`);
  console.log(`  Uygulama tarafı: ${DIM}npm run build → optik-form.html / dist çıktısını yeniden yayınlayın${RESET}`);
}

async function main() {
  console.log(`${BOLD}MMPI-566 · Supabase canlı ortam teşhisi${RESET} ${DIM}(${new Date().toISOString()})${RESET}`);
  if (!SUPABASE_URL) {
    die('SUPABASE_URL tanımlı değil. Örnek:\n  SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=sb_secret_... \\\n  SITE_ORIGIN=https://app.example.com npm run diagnose:supabase -- --allow-destructive');
  }
  if (!KEY) die('Anahtar yok: SUPABASE_SERVICE_KEY (önerilen) veya SUPABASE_ANON_KEY tanımlayın.');
  if (!SERVICE_KEY) console.log(`${YELLOW}Service anahtarı yok: katalog + uçtan uca testler atlanacak, yalnızca şema ve Edge Function CORS kontrolü yapılacak.${RESET}`);
  if (!DESTRUCTIVE) console.log(`${DIM}Uçtan uca canlı test için: --allow-destructive (geçici bir diagnostik kullanıcısı oluşturur ve siler).${RESET}`);

  const schemaOk = await safe('şema teşhisi', checkSchema);
  if (schemaOk) await safe('katalog teşhisi', catalogReport);
  await safe('admin-users teşhisi', checkEdgeFunction);
  await safe('ai-interpretation teşhisi', checkAiFunction);
  if (DESTRUCTIVE) await safe('uçtan uca yazma/silme testi', destructiveFlow);
  summary();
  process.exit(findings.some(f => f.level === 'fail') ? 1 : 0);
}

main().catch(error => {
  console.error(`${RED}Beklenmeyen hata:${RESET}`, error?.stack ?? error?.message ?? error);
  process.exit(2);
});
