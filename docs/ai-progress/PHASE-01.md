# PHASE 01 — Proje İskeleti + Auth + DB

Status: Completed
Date: 2026-09-24
Branch: arena/01a0d39c-psikolog
Depends on: PHASE-00

---

## Completed

### 1. Vite + React + TS init

- package.json: React 19.2.0 + TypeScript 5.9.3 + Vite 7.3.6 + Supabase JS 2.116.0 + PGlite 0.5.8 + tsx 4.20.6
- tsconfig.json: strict, noUncheckedIndexedAccess, noUnusedLocals/Params, verbatimModuleSyntax, isolatedModules, target ES2022, exclude tests/dist
- vite.config.ts: host 0.0.0.0 port 5173 allowedHosts .e2b.app (arena preview), preview 0.0.0.0 4173
- index.html: lang tr, viewport device-width viewport-fit cover, DM Sans + Newsreader fonts preconnect, meta description KVKK, favicon.svg
- Folder structure: src/app/router.ts + App.tsx + routes/*, src/auth/*, src/lib/*, src/components/ui/* + layout/*, src/styles/*, src/workspace/*, supabase/migrations + functions/admin-users, tests/*, public/_headers + favicon.svg, .github/workflows/ci.yml
- Design tokens: tokens.css :root --bg white --bg-soft #F6F6F6 --text #0D0D0D --muted #8E8E93 --border #E9E9EB --accent #0A84FF --radius 14px --max 780px --max-wide 1280px --nav-h 64px --sidebar-w 260px + shadows + ease, theme.css base + container min() + kicker pill dot + card + section-head + empty-state + reveal + toast + connectivity-banner + auth-page + dashboard-grid + stat-card, layout.css nav sticky blur backdrop-filter + nav-inner + logo serif + nav-links + mobile-toggle hamburger + app-shell flex + sidebar sticky top var(--nav-h) height calc(100dvh - nav-h) + sidebar-inner + sidebar-label + sidebar-link active black bg + main bg-soft + main-inner + client-tabs scroll + page-header Newsreader 28px, components.css btn pill 999px primary black ghost white danger red soft bg-soft + btn sm/lg/full + field label 11px uppercase muted + input/textarea/select 11px 13px radius 10px focus border black shadow-focus + modal overlay blur + badge, responsive.css last order no !important/print media — 600px container 40→32px, 1024px sidebar hidden open fixed 320px, 760px nav-links collapse absolute column + dashboard-grid 1fr + client-grid 1fr + auth-shell padding 22px + input 16px iOS zoom engel, 720px btn min-height 44px touch target, dvh auth-page/dashboard-shell 100dvh, 520px card 18px, print.css @media print no-print hidden print-only visible @page A4 20mm 18mm + psych-report serif + header border 2px + footer 9pt + table page-break
- UI primitives: Button (variant primary/ghost/danger/soft size sm/md/lg full), Card (soft/interactive), Input/Textarea/Select + Field label/hint/error, Badge kicker dot, Modal + ConfirmDialog, ToastStack showToast + useToasts (psikolog sitesi toast 3.2s + MMPI pattern)

### 2. Supabase new project

- supabase/config.toml: api port 54321, db 54322, studio 54323, storage 10MiB, auth enable_signup false, site_url localhost:5173 + additional_redirect_urls psikolog.halilkaraduman.com.tr, third_party_auth false
- .env.example: VITE_SUPABASE_URL + ANON_KEY
- supabase/README.md: new project separate from MMPI, env, db push, tables organizations/profiles/clients/audit_logs, RLS org isolation, storage private bucket client-documents, first admin SQL, Edge Function admin-users deploy + ALLOWED_ORIGINS, security
- Migration 20260924000000_initial_schema.sql: extension pgcrypto, user_role enum ADMIN/ORG_ADMIN/PSYCHOLOG, organizations id PK gen_random_uuid name 2-180 created_at/updated_at + set_updated_at trigger, profiles id PK FK auth.users cascade organization_id FK organizations set null email first_name/last_name 2-80 role default PSYCHOLOG active bool indexes org+role+active + email + handle_new_auth_user trigger least privilege PSYCHOLOG + backfill, clients id PK org FK cascade file_number not null first/last 1-80 birth_date phone ≤32 email ≤254 profession/education ≤120 status active/archived created_by FK profiles cascade unique org+file_number indexes org+status+created_at org+created_by org+first+last + set_updated_at trigger, audit_logs id PK org FK set null actor uuid action enum client_insert/update/delete profile_insert/update/delete org_insert/update/delete target_table/id created_at indexes org+created_at target, helpers is_active_user/is_psychologist/is_org_admin/is_admin/is_org_member(org_id)/my_organization_id() all security definer stable search_path public revoke public grant authenticated, audit trigger log_audit_change security definer resolve org from row + action mapping + insert audit_logs + revoke public, triggers organizations_audit/profiles_audit/clients_audit after insert/update/delete, RLS enable all, organizations policies select admin or org_member insert admin update admin or org_admin delete admin, profiles select own or admin or (org_admin and org = my_org_id) no update/delete (Edge only), clients select admin or org_member insert created_by=uid and active and (admin or org_member) and (psychologist or org_admin or admin) update admin or (org_member and (owner or org_admin)) delete same, audit_logs select admin or (org_admin and org_member) revoke anon+authenticated grant select authenticated only, grants revoke anon all + grant select/insert/update/delete authenticated organizations + select profiles + select/insert/update/delete clients + execute helpers
- Storage: private bucket client-documents via dashboard SQL insert into storage.buckets id name public false, policies org_member read/write owner delete no anon 10MiB mime whitelist pdf/jpg/png/webp/docx path org_id/client_id/uuid
- Edge Function admin-users/index.ts: Deno service_role, configuredOrigins strict parse https only pathname '/' no user/pass/search/hash, isAllowedOrigin configured includes or localhost http only, headers CORS Allow-Headers/Methods Vary Origin + Allow-Origin if allowed, response helper, ValidationError class, isDatabaseSideError GoTrue Database error creating new user + Postgres codes 23502/23503/23505/23514/42501/42703/42P01/PGRST + audit/trigger/RLS + 500+database/schema, text() trim replace \s+ min max control char, email() lower 5-254 regex, password() 10-128 control char, uuid() regex, safeProfile() id UUID email string first/last 2-80 role ADMIN/ORG_ADMIN/PSYCHOLOG active bool, Deno.serve: origin check 403, OPTIONS 204, POST only 405, config incomplete 500, Bearer JWT adminClient.auth.getUser 401, caller profile ADMIN/ORG_ADMIN active 403, content-length 32KB 413, body 32KB 413, JSON parse 400, actions: create firstName 2-80 lastName 2-80 email password role PSYCHOLOG default ORG_ADMIN optional orgId UUID else caller org if ORG_ADMIN, ORG_ADMIN can only create PSYCHOLOG own org 403, auth.admin.createUser email_confirm true user_metadata first/last, profile update role+org, read profile safeProfile, rollback deleteUser if fails, set_active active bool userId UUID target not ADMIN org mismatch 403 auth.admin.updateUserById ban_duration none/876000h rollback if profile fails, set_org userId orgId nullable only ADMIN, delete userId not ADMIN org mismatch 403 auth.admin.deleteUser first then cascade, unknown action 400, ValidationError 400, isDatabaseSideError 500+db push else 500 logs

### 3. Auth

- authTypes.ts: UserRole ADMIN/ORG_ADMIN/PSYCHOLOG, AuthenticatedUser id email firstName lastName role active organizationId nullable, ROLE_LABEL, ROLE_ORDER
- authStorage.ts: AUTH_STORAGE_KEY psikolog-auth, AuthStorage get/set/remove, memoryOnlyStorage, createAuthStorage sessionStorage + memory fallback private mode — MMPI pattern
- supabaseClient.ts: safeSupabaseOrigin https only localhost http/https pathname '/' no user/pass/search/hash, viteEnv import.meta.env safe, url+anonKey trimmed, supabaseConfig configured bool, supabase client createClient persistSession true storage sessionStorage storageKey AUTH_STORAGE_KEY autoRefreshToken true detectSessionInUrl false flowType pkce, requireSupabase throws if not configured
- supabaseAuth.ts: ProfileRow id email first_name last_name role active organization_id, profileFromRow runtime validation UUID email 254 first/last 2-80 control char role enum org_id UUID nullable, profileForUser from profiles select id/email/first/last/role/active/org_id maybeSingle, signIn email normalize lower active check signOut local, userFromSession, onAuthChange, getSession, signOut scope local — MMPI pattern
- adminApi.ts: UUID_PATTERN, rowToUser validation, listUsers from profiles order created_at, EdgeFunctionInvocation error+response, originHint, serverMessage read response text 4096 JSON {error:string} cleaned 200, statusOf response status or FunctionsHttpError/RelayError context, explainEdgeFunctionError FunctionsFetchError → ALLOWED_ORIGINS hint, 401 session expired, 403 origin allowlist, 404 not found, 413 too large, 429 rate limit, 500+ db push, detail else fallback — MMPI pattern
- LoginPage: supabaseConfig check offline build warning .env instructions, form email/password maxLength 254/128, validation required, onSubmit signIn + showToast success/error, loading state, error alert danger-soft, no public registration note admin only
- App.tsx: AuthState loading/signed_out/signed_in, hydrate getSession + userFromSession race cancelled bool, onAuthChange subscription, handleLogout signOut + navigate /login replace, loading auth-page kicker + Yükleniyor, signed_out → LoginPage except not_found, signed_in role-based redirect login→dashboard, admin pages admin/audit only ADMIN/ORG_ADMIN else empty-state 403, content switch dashboard/clients/client_new/client/settings/admin/audit/login/not_found, layout Header + ConnectivityBanner + app-shell Sidebar + main + ToastStack, mobile sidebar toggle fixed bottom right (responsive.css shows)

### 4. Layout + Router

- router.ts: AppRoute login/dashboard/clients/client id+tab?/client_new/settings/admin/audit/not_found, parseRoute pathname trimmed + search tab param, / and /dashboard → dashboard, /login, /clients, /clients/new, /settings, /admin, /audit, /^\/clients\/([^/]+)$/ → client id+tab, else not_found, navigationGuards Set only editor, navigate replace/push + guard check + notify listeners, useRoute useState parseRoute pathname+search + popstate + listeners, installLinkInterceptor document click button 0 no meta/ctrl/shift/alt closest a href hash/mailto/tel/blob/data/download/target _blank cross-origin /api/* skip else preventDefault navigate pathname+search+hash — MMPI pattern
- Header.tsx: user prop, open mobile menu state, logo psikolog.platform serif, nav-links dashboard/danışanlar + admin if ADMIN/ORG_ADMIN + user firstName lastName ROLE_LABEL + Çıkış btn ghost sm, hamburger transform open
- Sidebar.tsx: user, open, onClose, useRoute isActive client→clients, link helper navigate+onClose, sections Çalışma dashboard/danışanlar + Sistem settings/admin/audit + footer psikolog.halilkaraduman.com.tr KVKK RLS
- ConnectivityBanner + useOnlineStatus: navigator.onLine + online/offline events, sticky top var(--nav-h) warning-soft — MMPI pattern

### 5. CI + Tests

- .github/workflows/ci.yml: push main/arena/* + PR, ubuntu-latest node 22 npm ci typecheck test build
- Tests 37 pass 0 fail:
  - authStorage.test.ts 3 tests sessionStorage when available + fallback memory private mode + injected store
  - draftStorage.test.ts 7 tests draftKey/outboxKey includes userId not equal, createDraft idempotencyKey defaults, isExpired TTL, save/load round-trip, load expired null removed, clearDraft, isNetworkError
  - responsiveContracts.test.ts 5 tests viewport meta device-width viewport-fit cover, responsive.css last import main.tsx, no !important + no print media (fixed comment), dvh, mobile input 16px inside 760px media + input/textarea/select, touch 44px inside 720px media
  - build.test.ts 3 tests vite build dist/index.html assets root div lang tr script module, no src import title, substantial
  - clientDatabase.test.ts PGlite real Postgres 12 subtests org isolation A cannot see B, B cannot see A, admin sees all, org_admin own org only, owner update own other psy same org cannot, org_admin update any own org, IDOR delete B 0, anon 0 or permission denied secure, file_number unique per org not globally F-001 duplicate fail F-002 success, audit_logs admin sees org_admin own org psy 0 + client cannot insert revoked, profiles cannot update directly 0 or permission denied secure Edge only, profiles org isolation org_admin sees own org 3+
  - router.test.ts 5 tests dashboard / and /dashboard, clients /clients and /clients/new, client file with tab ?tab=anamnez, trailing slash, not_found unknown and extra

### 6. Docs

- README.md updated: quick start Node 22 npm install cp .env.example dev, architecture MVP flow stack design routing state security test, phases 00 DONE 01 DONE 02 NEXT etc., Supabase new project tables RLS storage first admin SQL, security RLS+storage+origin+audit+IDOR+CSP+KV+KVKK public registration closed secret, MMPI integration external_source+id no scoring copy, deployment Cloudflare Workers SPA fallback dist _headers CI, docs list
- PHASE-01.md this file

## Files changed

- package.json, package-lock.json, tsconfig.json, vite.config.ts, index.html, .gitignore, .env.example, wrangler.jsonc, public/_headers, public/favicon.svg, .github/workflows/ci.yml
- src/env.d.ts, src/main.tsx, src/app/router.ts, src/app/App.tsx, src/app/routes/Login.tsx, Dashboard.tsx, Clients.tsx, Admin.tsx
- src/auth/authTypes.ts, authStorage.ts, supabaseClient.ts, supabaseAuth.ts, adminApi.ts
- src/lib/validation.ts, dateGuards.ts, pagination.ts
- src/workspace/draftStorage.ts, useOnlineStatus.ts
- src/components/layout/Header.tsx, Sidebar.tsx, ConnectivityBanner.tsx
- src/components/ui/Button.tsx, Card.tsx, Input.tsx, Badge.tsx, Modal.tsx, Toast.tsx
- src/styles/tokens.css, theme.css, layout.css, components.css, print.css, responsive.css
- supabase/config.toml, supabase/README.md, supabase/migrations/20260924000000_initial_schema.sql, supabase/functions/admin-users/index.ts
- tests/authStorage.test.ts, draftStorage.test.ts, responsiveContracts.test.ts, build.test.ts, clientDatabase.test.ts, router.test.ts
- README.md, docs/ai-progress/PHASE-01.md
- docs/architecture/* unchanged from PHASE-00

## Database changes

- New migration 20260924000000_initial_schema.sql: organizations, profiles (org FK, role ADMIN/ORG_ADMIN/PSYCHOLOG, active, least privilege trigger), clients (org FK, file_number unique org, status active/archived, created_by cascade), audit_logs (org, actor, action enum, trigger), helpers is_active/is_psychologist/is_org_admin/is_admin/is_org_member/my_organization_id security definer, triggers set_updated_at + handle_new_auth_user + log_audit_change, RLS policies org isolation + anon revoke + profiles no update/delete + clients owner/org_admin + audit_logs admin/org_admin + grants

## Tests

- 37 tests, all pass, PGlite real RLS/IDOR, responsive contracts, router, authStorage, draftStorage, build
- No E2E yet (Playwright planned PHASE-08)
- Critical E2E path documented but not yet automated (will be PHASE-08)

## Build

- typecheck: OK (tsc --noEmit)
- build: OK (vite build 90 modules, dist/index.html 1.26kB, CSS 14kB, JS 468kB gzip 134kB)
- dist contains _headers + favicon.svg via public copy

## Security

- RLS everywhere, anon revoke, security definer search_path=public, revoke public, grant authenticated selective
- Origin allowlist strict parsing (admin-users), content-length double, control char rejection, escapeHtml, no service_role frontend, no VITE_ service_role
- Audit logs trigger server-side, client cannot write (revoked)
- IDOR tests: org isolation, owner vs other psy, org_admin vs other org, anon 0 or permission denied, file_number unique per org, audit_logs admin/org_admin only, profiles no direct update
- Profiles infinite recursion fixed via my_organization_id() security definer (MMPI lesson)
- Storage private bucket planned, no public URL, signed short-lived future
- KVKK: veri minimizasyonu, gereksiz 3rd party yok, hassas veri loglanmaz, public URL yok, sessionStorage auth F5 keeps tab close clears
- CSP via public/_headers: default-src self, base-uri self, connect-src self https://*.supabase.co wss://*.supabase.co, font-src self gstatic, form-action self, frame-ancestors none, img-src self data blob, object-src none, script-src self, style-src self unsafe-inline gstatic, X-Frame-Options DENY, immutable assets
- Public registration kapalı: supabase/config.toml enable_signup false + dashboard setting
- Secrets: .env.example only, .dev.vars gitignore, wrangler secret put

## Known issues

- Clients CRUD UI not yet (PHASE-02)
- Anamnesis/Sessions/Assessments/Tests/Reports/Documents/Appointments/Tasks not yet (PHASE-03+)
- E2E Playwright not yet (PHASE-08)
- Storage bucket creation manual via dashboard SQL (migration does not create bucket, only docs)
- Rate limiting persistent KV not yet (MMPI in-memory Map, new platform should use KV/DO)
- AI not yet (first version no AI, per prompt)
- No multi-org UI yet, only DB + RLS

## Next phase

### PHASE-02 — Danışanlar + Dosya

**Yapılacaklar:**

1. Clients API + types + hooks
   - src/features/clients/clientTypes.ts (Client, ClientInput, ClientStatus, file_number auto generate org içinde)
   - src/features/clients/clientApi.ts (list with search/sanitize + pagination hasMore+count visible + toPagedRange, get, create with idempotency_key uuid, update, archive)
   - src/features/clients/useClients.ts (Zustand or useState + draft + outbox)

2. Clients UI
   - ClientList: search input + filter status + pagination (DEFAULT_PAGE_SIZE 50 MAX 100) + Table + hasMore visible + empty state + loading
   - ClientForm: RHF+Zod first_name/last_name 1-80 required birth_date dateGuards not future Istanbul phone/email optional profession/education + file_number auto + draftKey + saveDraft + clearDraft + idempotency
   - ClientCard: soft/interactive + file_number + status badge + created_at
   - ClientNewPage: form + validation + supabase insert + audit log via trigger + toast success + navigate /clients/:id

3. ClientFile tabs
   - ClientFilePage: tabs genel/anamnez/görüşmeler/değerlendirmeler/testler/raporlar/belgeler/notlar/geçmiş, ?tab param, active tab from router, content placeholder for future phases
   - Genel: client details + edit + archive + audit history (audit_logs)

4. RLS + IDOR tests extension
   - Extend clientDatabase.test.ts with update/delete by org_admin, archive, file_number auto, etc.
   - Add negative tests: User A → User B client (already), org B, wrong client ID, anon private page, expired session, role escalation

5. Docs + Build
   - README update
   - PHASE-02.md

**Do not repeat:**
- MMPI scoring copy
- Single-file build
- Monolithic components
- In-memory rate limit
- No tests

**Success criteria:**
- Create client → list → open file → edit → archive works
- Search/filter/pagination hasMore+count visible
- Draft + outbox + TTL + idempotency prevents double
- RLS + IDOR tests green
- Responsive desktop/tablet/mobile
- Build + typecheck green
