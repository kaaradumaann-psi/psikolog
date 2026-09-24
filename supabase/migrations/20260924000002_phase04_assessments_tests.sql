-- PHASE-04: Assessments + Tests (external source, no scoring copy)

-- ---------------------------------------------------------------------------
-- Assessments
-- ---------------------------------------------------------------------------
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reason text check (char_length(reason) <= 5000),
  assessment_date date not null,
  method text check (char_length(method) <= 2000),
  interview text check (char_length(interview) <= 8000),
  observation text check (char_length(observation) <= 8000),
  findings text check (char_length(findings) <= 8000),
  expert_evaluation text check (char_length(expert_evaluation) <= 8000),
  result text check (char_length(result) <= 8000),
  recommendations text check (char_length(recommendations) <= 8000),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists assessments_client_date_idx on public.assessments (client_id, assessment_date desc);
create index if not exists assessments_org_idx on public.assessments (organization_id);

drop trigger if exists assessments_set_updated_at on public.assessments;
create trigger assessments_set_updated_at
before update on public.assessments
for each row execute function public.set_updated_at();

create or replace function public.validate_assessment_date()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.assessment_date > (timezone('Europe/Istanbul', now()))::date then
    raise exception 'Değerlendirme tarihi ileri tarih olamaz';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_assessment_date() from public;
drop trigger if exists assessments_validate_date on public.assessments;
create trigger assessments_validate_date
before insert or update on public.assessments
for each row execute function public.validate_assessment_date();

-- ---------------------------------------------------------------------------
-- Test Definitions — system + org
-- ---------------------------------------------------------------------------
create table if not exists public.test_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 180),
  description text check (char_length(description) <= 2000),
  source text not null default 'other' check (source in ('other', 'beck', 'bai', 'scl90', 'gad7', 'phq9', 'custom')),
  is_system boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  check ((is_system and organization_id is null) or (not is_system))
);

insert into public.test_definitions(id, name, description, source, is_system)
values
  ('00000000-0000-4000-8000-000000000001', 'Beck Anksiyete Envanteri', 'BAI — 21 belirti, puanlama bu platformda yapılır', 'bai', true),
  ('00000000-0000-4000-8000-000000000002', 'Beck Depresyon Ölçeği', 'BDI — 21 madde, madde 9 güvenlik uyarısı', 'beck', true),
  ('00000000-0000-4000-8000-000000000003', 'SCL-90-R', 'Belirti tarama listesi — 9 boyut, GSI/PST/PSDI', 'scl90', true),
  ('00000000-0000-4000-8000-000000000004', 'GAD-7', 'Yaygın anksiyete taraması — 7 madde', 'gad7', true),
  ('00000000-0000-4000-8000-000000000005', 'PHQ-9', 'Depresyon taraması — 9 madde, madde 9 güvenlik uyarısı', 'phq9', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Test Administrations — uygulama
-- ---------------------------------------------------------------------------
create table if not exists public.test_administrations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete set null,
  test_definition_id uuid not null references public.test_definitions(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  administration_date date not null,
  status text not null default 'completed' check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  external_source text check (char_length(external_source) <= 32),
  external_assessment_id text check (char_length(external_assessment_id) <= 128),
  notes text check (char_length(notes) <= 5000),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists test_admin_client_date_idx on public.test_administrations (client_id, administration_date desc);
create index if not exists test_admin_org_idx on public.test_administrations (organization_id);
create index if not exists test_admin_assessment_idx on public.test_administrations (assessment_id);

drop trigger if exists test_admin_set_updated_at on public.test_administrations;
create trigger test_admin_set_updated_at
before update on public.test_administrations
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Test Results — özet, ham soru yok, sadece sonuç
-- ---------------------------------------------------------------------------
create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  test_administration_id uuid not null references public.test_administrations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  result_data jsonb not null check (jsonb_typeof(result_data) = 'object' and octet_length(result_data::text) <= 2097152),
  summary text check (char_length(summary) <= 5000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists test_results_admin_idx on public.test_results (test_administration_id);
create index if not exists test_results_org_idx on public.test_results (organization_id);

drop trigger if exists test_results_set_updated_at on public.test_results;
create trigger test_results_set_updated_at
before update on public.test_results
for each row execute function public.set_updated_at();

-- Audit triggers
drop trigger if exists assessments_audit on public.assessments;
create trigger assessments_audit
after insert or update or delete on public.assessments
for each row execute function public.log_audit_change();

drop trigger if exists test_admin_audit on public.test_administrations;
create trigger test_admin_audit
after insert or update or delete on public.test_administrations
for each row execute function public.log_audit_change();

drop trigger if exists test_results_audit on public.test_results;
create trigger test_results_audit
after insert or update or delete on public.test_results
for each row execute function public.log_audit_change();

-- RLS
alter table public.assessments enable row level security;
alter table public.test_definitions enable row level security;
alter table public.test_administrations enable row level security;
alter table public.test_results enable row level security;

-- Assessments
drop policy if exists assessments_select on public.assessments;
create policy assessments_select on public.assessments
for select to authenticated using (public.is_admin() or public.is_org_member(organization_id));

drop policy if exists assessments_insert on public.assessments;
create policy assessments_insert on public.assessments
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id) and
  (public.is_psychologist() or public.is_org_admin() or public.is_admin())
);

drop policy if exists assessments_update on public.assessments;
create policy assessments_update on public.assessments
for update to authenticated using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())))
with check (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

drop policy if exists assessments_delete on public.assessments;
create policy assessments_delete on public.assessments
for delete to authenticated using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

-- Test definitions: system or own org
drop policy if exists test_definitions_select on public.test_definitions;
create policy test_definitions_select on public.test_definitions
for select to authenticated using (public.is_active_user() and (is_system or public.is_org_member(organization_id) or public.is_admin()));

drop policy if exists test_definitions_insert on public.test_definitions;
create policy test_definitions_insert on public.test_definitions
for insert to authenticated with check (not is_system and public.is_org_member(organization_id) and (public.is_psychologist() or public.is_org_admin() or public.is_admin()));

drop policy if exists test_definitions_update on public.test_definitions;
create policy test_definitions_update on public.test_definitions
for update to authenticated using (not is_system and (public.is_admin() or (public.is_org_member(organization_id) and public.is_org_admin())))
with check (not is_system and (public.is_admin() or (public.is_org_member(organization_id) and public.is_org_admin())));

drop policy if exists test_definitions_delete on public.test_definitions;
create policy test_definitions_delete on public.test_definitions
for delete to authenticated using (not is_system and (public.is_admin() or (public.is_org_member(organization_id) and public.is_org_admin())));

-- Test administrations
drop policy if exists test_admin_select on public.test_administrations;
create policy test_admin_select on public.test_administrations
for select to authenticated using (public.is_admin() or public.is_org_member(organization_id));

drop policy if exists test_admin_insert on public.test_administrations;
create policy test_admin_insert on public.test_administrations
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id) and
  (public.is_psychologist() or public.is_org_admin() or public.is_admin()) and
  exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
);

drop policy if exists test_admin_update on public.test_administrations;
create policy test_admin_update on public.test_administrations
for update to authenticated using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())))
with check (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

drop policy if exists test_admin_delete on public.test_administrations;
create policy test_admin_delete on public.test_administrations
for delete to authenticated using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

-- Test results
drop policy if exists test_results_select on public.test_results;
create policy test_results_select on public.test_results
for select to authenticated using (public.is_admin() or public.is_org_member(organization_id));

drop policy if exists test_results_insert on public.test_results;
create policy test_results_insert on public.test_results
for insert to authenticated with check (
  public.is_active_user() and public.is_org_member(organization_id) and
  (public.is_psychologist() or public.is_org_admin() or public.is_admin()) and
  exists (select 1 from public.test_administrations ta where ta.id = test_administration_id and ta.organization_id = organization_id)
);

drop policy if exists test_results_update on public.test_results;
create policy test_results_update on public.test_results
for update to authenticated using (public.is_admin() or public.is_org_member(organization_id))
with check (public.is_admin() or public.is_org_member(organization_id));

drop policy if exists test_results_delete on public.test_results;
create policy test_results_delete on public.test_results
for delete to authenticated using (public.is_admin() or public.is_org_member(organization_id));

revoke all on public.assessments from anon;
revoke all on public.test_definitions from anon;
revoke all on public.test_administrations from anon;
revoke all on public.test_results from anon;

grant select, insert, update, delete on public.assessments to authenticated;
grant select, insert, update, delete on public.test_definitions to authenticated;
grant select, insert, update, delete on public.test_administrations to authenticated;
grant select, insert, update, delete on public.test_results to authenticated;
