-- PHASE 1 MMPI: identity link + SSO consume bookkeeping. Does not alter mmpi_records.

alter table public.profiles
  add column if not exists global_user_id uuid;

create unique index if not exists profiles_global_user_id_idx
  on public.profiles (global_user_id)
  where global_user_id is not null;

create table if not exists public.identity_links (
  mmpi_user_id uuid primary key references public.profiles(id) on delete cascade,
  psychology_user_id uuid not null,
  email text not null check (char_length(email) between 5 and 254),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sso_replay_nonces (
  nonce_hash text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.identity_links enable row level security;
alter table public.sso_replay_nonces enable row level security;

revoke all on public.sso_replay_nonces from anon, authenticated, public;
revoke all on public.identity_links from anon, public;
grant select on public.identity_links to authenticated;

drop policy if exists identity_links_select_own on public.identity_links;
create policy identity_links_select_own on public.identity_links
for select to authenticated
using (mmpi_user_id = auth.uid() or public.is_admin());
