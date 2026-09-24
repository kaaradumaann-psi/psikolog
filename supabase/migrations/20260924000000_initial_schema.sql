-- Psikolog Platformu — Initial Schema
-- New Supabase project, separate from MMPI
-- Run: supabase db push

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Roles
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.user_role as enum ('ADMIN', 'ORG_ADMIN', 'PSYCHOLOG');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Organizations — multi-tenancy
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 180),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- 3. Profiles — Auth user profile, least privilege
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  email text,
  first_name text not null,
  last_name text not null,
  role public.user_role not null default 'PSYCHOLOG',
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_name_length check (char_length(first_name) between 2 and 80 and char_length(last_name) between 2 and 80)
);

create index if not exists profiles_org_role_active_idx on public.profiles (organization_id, role, active);
create index if not exists profiles_email_idx on public.profiles (email);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- New Auth users get least-privilege profile (PSYCHOLOG, no org)
-- Public sign-up must be disabled; Edge Function is only app path for psychologist creation
-- First Admin bootstrapped once via SQL: update profiles set role='ADMIN'
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role, active)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), 'Yeni'),
    coalesce(nullif(new.raw_user_meta_data ->> 'last_name', ''), 'Kullanıcı'),
    'PSYCHOLOG',
    true
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill existing Auth users as least privilege
insert into public.profiles (id, email, first_name, last_name, role, active)
select u.id, u.email,
  coalesce(nullif(u.raw_user_meta_data ->> 'first_name', ''), 'Yeni'),
  coalesce(nullif(u.raw_user_meta_data ->> 'last_name', ''), 'Kullanıcı'),
  'PSYCHOLOG', true
from auth.users as u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Clients — danışanlar
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  file_number text not null,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  birth_date date,
  phone text check (char_length(phone) <= 32),
  email text check (char_length(email) <= 254),
  profession text check (char_length(profession) <= 120),
  education text check (char_length(education) <= 120),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, file_number)
);

create index if not exists clients_org_status_created_idx on public.clients (organization_id, status, created_at desc);
create index if not exists clients_org_created_by_idx on public.clients (organization_id, created_by);
create index if not exists clients_search_idx on public.clients (organization_id, first_name, last_name);

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Audit logs — server-side, client cannot write
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor uuid,
  action text not null check (action in (
    'client_insert', 'client_update', 'client_delete',
    'profile_insert', 'profile_update', 'profile_delete',
    'org_insert', 'org_update', 'org_delete'
  )),
  target_table text not null,
  target_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index if not exists audit_logs_target_idx on public.audit_logs (target_table, target_id);

-- ---------------------------------------------------------------------------
-- 6. Helpers — RLS functions (security definer, search_path=public)
-- ---------------------------------------------------------------------------
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true
  );
$$;

create or replace function public.is_psychologist()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'PSYCHOLOG' and active = true
  );
$$;

create or replace function public.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ORG_ADMIN' and active = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN' and active = true
  );
$$;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and organization_id = org_id and active = true
  );
$$;

create or replace function public.my_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 7. Audit trigger
-- ---------------------------------------------------------------------------
create or replace function public.log_audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
  act text;
begin
  -- Resolve organization_id from row
  if tg_table_name = 'clients' then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  elsif tg_table_name = 'organizations' then
    if tg_op = 'DELETE' then org := old.id; else org := new.id; end if;
  elsif tg_table_name = 'profiles' then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  else
    org := null;
  end if;

  if tg_op = 'INSERT' then
    act := tg_table_name || '_insert';
    if tg_table_name = 'clients' then act := 'client_insert';
    elsif tg_table_name = 'profiles' then act := 'profile_insert';
    elsif tg_table_name = 'organizations' then act := 'org_insert';
    end if;
    insert into public.audit_logs (organization_id, actor, action, target_table, target_id)
    values (org, auth.uid(), act, tg_table_name, new.id);
    return new;
  elsif tg_op = 'UPDATE' then
    act := tg_table_name || '_update';
    if tg_table_name = 'clients' then act := 'client_update';
    elsif tg_table_name = 'profiles' then act := 'profile_update';
    elsif tg_table_name = 'organizations' then act := 'org_update';
    end if;
    insert into public.audit_logs (organization_id, actor, action, target_table, target_id)
    values (org, auth.uid(), act, tg_table_name, new.id);
    return new;
  else
    act := tg_table_name || '_delete';
    if tg_table_name = 'clients' then act := 'client_delete';
    elsif tg_table_name = 'profiles' then act := 'profile_delete';
    elsif tg_table_name = 'organizations' then act := 'org_delete';
    end if;
    insert into public.audit_logs (organization_id, actor, action, target_table, target_id)
    values (org, auth.uid(), act, tg_table_name, old.id);
    return old;
  end if;
end;
$$;

revoke all on function public.log_audit_change() from public;

drop trigger if exists organizations_audit on public.organizations;
create trigger organizations_audit
after insert or update or delete on public.organizations
for each row execute function public.log_audit_change();

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit
after insert or update or delete on public.profiles
for each row execute function public.log_audit_change();

drop trigger if exists clients_audit on public.clients;
create trigger clients_audit
after insert or update or delete on public.clients
for each row execute function public.log_audit_change();

-- ---------------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.audit_logs enable row level security;

-- Organizations: admin sees all, org_admin/member sees own org
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
for select to authenticated
using (
  public.is_admin() or
  public.is_org_member(id)
);

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
for insert to authenticated
with check (public.is_admin());

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
for update to authenticated
using (public.is_admin() or public.is_org_admin())
with check (public.is_admin() or public.is_org_admin());

drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations
for delete to authenticated
using (public.is_admin());

-- Profiles: user sees own, admin sees all, org_admin sees same org
-- Uses my_organization_id() security definer to avoid infinite recursion (MMPI pattern)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  auth.uid() = id or
  public.is_admin() or
  (public.is_org_admin() and organization_id = public.my_organization_id())
);

-- Profile mutations via Edge Function only — no direct browser update/delete
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;

-- Clients: admin sees all, org_admin/member sees own org clients
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
for select to authenticated
using (
  public.is_admin() or
  public.is_org_member(organization_id)
);

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
for insert to authenticated
with check (
  created_by = auth.uid() and
  public.is_active_user() and
  (public.is_admin() or public.is_org_member(organization_id)) and
  (public.is_psychologist() or public.is_org_admin() or public.is_admin())
);

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
for update to authenticated
using (
  public.is_admin() or
  (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin()))
)
with check (
  public.is_admin() or
  (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin()))
);

drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
for delete to authenticated
using (
  public.is_admin() or
  (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin()))
);

-- Audit logs: admin sees all, org_admin sees own org
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
for select to authenticated
using (
  public.is_admin() or
  (public.is_org_admin() and public.is_org_member(organization_id))
);

-- No client insert/update/delete on audit_logs
revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Grants
-- ---------------------------------------------------------------------------
revoke all on public.organizations from anon;
revoke all on public.profiles from anon;
revoke all on public.clients from anon;

grant select on public.organizations to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;

grant select on public.profiles to authenticated;

grant select, insert, update, delete on public.clients to authenticated;

revoke all on function public.is_active_user() from public;
revoke all on function public.is_psychologist() from public;
revoke all on function public.is_org_admin() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.my_organization_id() from public;

grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_psychologist() to authenticated;
grant execute on function public.is_org_admin() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.my_organization_id() to authenticated;

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_auth_user() from public;
