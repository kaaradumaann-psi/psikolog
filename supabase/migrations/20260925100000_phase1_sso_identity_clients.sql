-- PHASE 1: client UUID mapping, MMPI test definition, SSO identity.
-- Additive only. Does not rewrite existing CRM RLS (org-level SELECT stays).

-- ---------------------------------------------------------------------------
-- 1. Clients: legacy local id + optional gender for identity mapping
-- ---------------------------------------------------------------------------
alter table public.clients
  add column if not exists legacy_client_id text;

alter table public.clients
  drop constraint if exists clients_legacy_client_id_length;

alter table public.clients
  add constraint clients_legacy_client_id_length
  check (legacy_client_id is null or char_length(legacy_client_id) between 3 and 80);

create unique index if not exists clients_org_legacy_id_idx
  on public.clients (organization_id, legacy_client_id)
  where legacy_client_id is not null;

alter table public.clients
  drop constraint if exists clients_gender_check;

alter table public.clients
  add column if not exists gender text;

alter table public.clients
  drop constraint if exists clients_gender_check;

alter table public.clients
  add constraint clients_gender_check
  check (gender is null or gender in ('KADIN', 'ERKEK'));

-- ---------------------------------------------------------------------------
-- 2. Profiles: optional shared technical id (not a third IdP)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists global_user_id uuid;

create unique index if not exists profiles_global_user_id_idx
  on public.profiles (global_user_id)
  where global_user_id is not null;

-- ---------------------------------------------------------------------------
-- 3. MMPI system test definition — reuse test_administrations (no new request table)
-- ---------------------------------------------------------------------------
insert into public.test_definitions(id, name, description, source, is_system)
values (
  '00000000-0000-4000-8000-000000000006',
  'MMPI-566',
  'MMPI-566 — puanlama MMPI uygulamasında; bu platform yalnız talep/durum tutar',
  'other',
  true
)
on conflict (id) do nothing;

create unique index if not exists test_admin_open_mmpi_idx
  on public.test_administrations (client_id)
  where test_definition_id = '00000000-0000-4000-8000-000000000006'
    and status in ('planned', 'in_progress');

create unique index if not exists test_admin_external_id_idx
  on public.test_administrations (external_source, external_assessment_id)
  where external_assessment_id is not null;

-- ---------------------------------------------------------------------------
-- 4. SSO tables — service role only (no browser grants)
-- ---------------------------------------------------------------------------
create table if not exists public.sso_authorization_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  audience text not null check (audience in ('mmpi')),
  redirect_uri text not null check (char_length(redirect_uri) between 8 and 300),
  state_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists sso_codes_user_idx on public.sso_authorization_codes (user_id, created_at desc);

create table if not exists public.sso_replay_nonces (
  nonce_hash text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.identity_links (
  psychology_user_id uuid primary key references public.profiles(id) on delete cascade,
  mmpi_user_id uuid not null,
  email text not null check (char_length(email) between 5 and 254),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.sso_authorization_codes enable row level security;
alter table public.sso_replay_nonces enable row level security;
alter table public.identity_links enable row level security;

revoke all on public.sso_authorization_codes from anon, authenticated, public;
revoke all on public.sso_replay_nonces from anon, authenticated, public;

revoke all on public.identity_links from anon, public;
grant select on public.identity_links to authenticated;

drop policy if exists identity_links_select_own on public.identity_links;
create policy identity_links_select_own on public.identity_links
for select to authenticated
using (psychology_user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Audit action list — SSO events (no secrets / codes)
-- ---------------------------------------------------------------------------
alter table public.audit_logs drop constraint if exists audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (action in (
  'client_insert', 'client_update', 'client_delete',
  'profile_insert', 'profile_update', 'profile_delete',
  'org_insert', 'org_update', 'org_delete',
  'anamnesis_insert', 'anamnesis_update', 'anamnesis_delete',
  'session_insert', 'session_update', 'session_delete',
  'assessment_insert', 'assessment_update', 'assessment_delete',
  'test_admin_insert', 'test_admin_update', 'test_admin_delete',
  'test_result_insert', 'test_result_update', 'test_result_delete',
  'report_insert', 'report_update', 'report_delete',
  'template_insert', 'template_update', 'template_delete',
  'document_insert', 'document_update', 'document_delete',
  'note_insert', 'note_update', 'note_delete',
  'appointment_insert', 'appointment_update', 'appointment_delete',
  'task_insert', 'task_update', 'task_delete',
  'sso_issue', 'sso_redeem', 'identity_link'
));
