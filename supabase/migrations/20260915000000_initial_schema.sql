-- MMPI-566 application schema.
-- Run with Supabase CLI: supabase db push
-- Passwords never belong in these tables; Supabase Auth owns credentials.

create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('ADMIN', 'PSYCHOLOG');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text not null,
  last_name text not null,
  role public.user_role not null default 'PSYCHOLOG',
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_name_length check (char_length(first_name) between 2 and 80 and char_length(last_name) between 2 and 80)
);

create index if not exists profiles_role_active_idx on public.profiles (role, active);

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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- New Auth users receive a least-privilege profile. Public sign-up must be
-- disabled in Supabase Auth; the Edge Function is the only application path
-- that creates a psychologist user. The initial Admin is bootstrapped once
-- with the SQL instructions in supabase/README.md.
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

-- Backfill accounts that existed before this migration. They remain least
-- privilege until an operator explicitly promotes the first Admin.
insert into public.profiles (id, email, first_name, last_name, role, active)
select u.id, u.email,
  coalesce(nullif(u.raw_user_meta_data ->> 'first_name', ''), 'Yeni'),
  coalesce(nullif(u.raw_user_meta_data ->> 'last_name', ''), 'Kullanıcı'),
  'PSYCHOLOG', true
from auth.users as u
on conflict (id) do nothing;

create table if not exists public.mmpi_records (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  client_first_name text not null,
  client_last_name text not null,
  gender text not null check (gender in ('Kadın', 'Erkek', 'Belirtmek istemiyor', 'Diğer')),
  age integer not null check (age between 16 and 120),
  occupation text not null,
  education text not null,
  application_date date not null,
  requested_by text not null,
  raw_omr_answers jsonb not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mmpi_records_name_length check (char_length(client_first_name) between 1 and 80 and char_length(client_last_name) between 1 and 80),
  constraint mmpi_records_answers_object check (jsonb_typeof(raw_omr_answers) = 'array')
);

create index if not exists mmpi_records_created_by_created_at_idx on public.mmpi_records (created_by, created_at desc);

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

alter table public.profiles enable row level security;
alter table public.mmpi_records enable row level security;

-- A user can see their own profile. Admins can see profiles for management.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (auth.uid() = id or public.is_admin());

-- Profile mutations are Edge-Function-only. Keeping UPDATE/DELETE out of the browser RLS
-- surface prevents a direct profile delete from orphaning Auth credentials or cascading records.
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;

-- Psychologists can only read their own records; admins can read all records.
drop policy if exists mmpi_records_select on public.mmpi_records;
create policy mmpi_records_select on public.mmpi_records
for select to authenticated
using (
  public.is_admin() or
  (created_by = auth.uid() and public.is_active_user())
);

-- The creator is always taken from the authenticated user, never from a form field.
drop policy if exists mmpi_records_insert on public.mmpi_records;
create policy mmpi_records_insert on public.mmpi_records
for insert to authenticated
with check (
  created_by = auth.uid() and public.is_psychologist()
);

-- Upsert is used only for the client idempotency key. It cannot cross user boundaries.
drop policy if exists mmpi_records_update on public.mmpi_records;
create policy mmpi_records_update on public.mmpi_records
for update to authenticated
using (created_by = auth.uid() and public.is_psychologist())
with check (created_by = auth.uid() and public.is_psychologist());

-- Admin or owner can delete records
drop policy if exists mmpi_records_delete on public.mmpi_records;
create policy mmpi_records_delete on public.mmpi_records
for delete to authenticated
using (
  public.is_admin() or
  (created_by = auth.uid() and public.is_psychologist())
);

revoke all on public.profiles from anon;
revoke all on public.mmpi_records from anon;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.mmpi_records to authenticated;
revoke all on function public.is_active_user() from public;
revoke all on function public.is_psychologist() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_psychologist() to authenticated;
grant execute on function public.is_admin() to authenticated;
