-- PHASE-03: Anamnesis + Sessions

-- ---------------------------------------------------------------------------
-- Anamneses — 1-1 per client (but allow history via updated_at, MVP 1-1)
-- ---------------------------------------------------------------------------
create table if not exists public.anamneses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reason text check (char_length(reason) <= 5000),
  current_status text check (char_length(current_status) <= 5000),
  personal_history text check (char_length(personal_history) <= 5000),
  family_history text check (char_length(family_history) <= 5000),
  education text check (char_length(education) <= 2000),
  profession text check (char_length(profession) <= 2000),
  social_life text check (char_length(social_life) <= 5000),
  relationships text check (char_length(relationships) <= 5000),
  previous_applications text check (char_length(previous_applications) <= 5000),
  previous_assessments text check (char_length(previous_assessments) <= 5000),
  expert_notes text check (char_length(expert_notes) <= 5000),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (client_id)
);

create index if not exists anamneses_client_idx on public.anamneses (client_id);
create index if not exists anamneses_org_idx on public.anamneses (organization_id);

drop trigger if exists anamneses_set_updated_at on public.anamneses;
create trigger anamneses_set_updated_at
before update on public.anamneses
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Sessions — görüşmeler 1-N per client
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  date date not null,
  type text not null check (char_length(type) between 1 and 80),
  duration integer check (duration is null or (duration between 5 and 600)),
  notes text check (char_length(notes) <= 8000),
  observation text check (char_length(observation) <= 8000),
  key_points text check (char_length(key_points) <= 5000),
  plan text check (char_length(plan) <= 5000),
  follow_up text check (char_length(follow_up) <= 5000),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists sessions_client_date_idx on public.sessions (client_id, date desc);
create index if not exists sessions_org_idx on public.sessions (organization_id);

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();

-- Date validation: not future Istanbul
create or replace function public.validate_session_date()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.date > (timezone('Europe/Istanbul', now()))::date then
    raise exception 'Görüşme tarihi ileri tarih olamaz';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_session_date() from public;

drop trigger if exists sessions_validate_date on public.sessions;
create trigger sessions_validate_date
before insert or update on public.sessions
for each row execute function public.validate_session_date();

-- ---------------------------------------------------------------------------
-- Audit extension for new tables
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
  'template_insert', 'template_update', 'template_delete'
));

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
  if tg_table_name = 'clients' then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  elsif tg_table_name = 'organizations' then
    if tg_op = 'DELETE' then org := old.id; else org := new.id; end if;
  elsif tg_table_name = 'profiles' then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  elsif tg_table_name = 'anamneses' then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  elsif tg_table_name = 'sessions' then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  elsif tg_table_name = 'assessments' then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  elsif tg_table_name = 'test_administrations' then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  elsif tg_table_name = 'test_results' then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  elsif tg_table_name = 'reports' then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  elsif tg_table_name = 'report_templates' then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  else
    org := null;
  end if;

  if tg_op = 'INSERT' then
    if tg_table_name = 'clients' then act := 'client_insert';
    elsif tg_table_name = 'profiles' then act := 'profile_insert';
    elsif tg_table_name = 'organizations' then act := 'org_insert';
    elsif tg_table_name = 'anamneses' then act := 'anamnesis_insert';
    elsif tg_table_name = 'sessions' then act := 'session_insert';
    elsif tg_table_name = 'assessments' then act := 'assessment_insert';
    elsif tg_table_name = 'test_administrations' then act := 'test_admin_insert';
    elsif tg_table_name = 'test_results' then act := 'test_result_insert';
    elsif tg_table_name = 'reports' then act := 'report_insert';
    elsif tg_table_name = 'report_templates' then act := 'template_insert';
    else act := tg_table_name || '_insert';
    end if;
    insert into public.audit_logs (organization_id, actor, action, target_table, target_id)
    values (org, auth.uid(), act, tg_table_name, new.id);
    return new;
  elsif tg_op = 'UPDATE' then
    if tg_table_name = 'clients' then act := 'client_update';
    elsif tg_table_name = 'profiles' then act := 'profile_update';
    elsif tg_table_name = 'organizations' then act := 'org_update';
    elsif tg_table_name = 'anamneses' then act := 'anamnesis_update';
    elsif tg_table_name = 'sessions' then act := 'session_update';
    elsif tg_table_name = 'assessments' then act := 'assessment_update';
    elsif tg_table_name = 'test_administrations' then act := 'test_admin_update';
    elsif tg_table_name = 'test_results' then act := 'test_result_update';
    elsif tg_table_name = 'reports' then act := 'report_update';
    elsif tg_table_name = 'report_templates' then act := 'template_update';
    else act := tg_table_name || '_update';
    end if;
    insert into public.audit_logs (organization_id, actor, action, target_table, target_id)
    values (org, auth.uid(), act, tg_table_name, new.id);
    return new;
  else
    if tg_table_name = 'clients' then act := 'client_delete';
    elsif tg_table_name = 'profiles' then act := 'profile_delete';
    elsif tg_table_name = 'organizations' then act := 'org_delete';
    elsif tg_table_name = 'anamneses' then act := 'anamnesis_delete';
    elsif tg_table_name = 'sessions' then act := 'session_delete';
    elsif tg_table_name = 'assessments' then act := 'assessment_delete';
    elsif tg_table_name = 'test_administrations' then act := 'test_admin_delete';
    elsif tg_table_name = 'test_results' then act := 'test_result_delete';
    elsif tg_table_name = 'reports' then act := 'report_delete';
    elsif tg_table_name = 'report_templates' then act := 'template_delete';
    else act := tg_table_name || '_delete';
    end if;
    insert into public.audit_logs (organization_id, actor, action, target_table, target_id)
    values (org, auth.uid(), act, tg_table_name, old.id);
    return old;
  end if;
end;
$$;

drop trigger if exists anamneses_audit on public.anamneses;
create trigger anamneses_audit
after insert or update or delete on public.anamneses
for each row execute function public.log_audit_change();

drop trigger if exists sessions_audit on public.sessions;
create trigger sessions_audit
after insert or update or delete on public.sessions
for each row execute function public.log_audit_change();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.anamneses enable row level security;
alter table public.sessions enable row level security;

drop policy if exists anamneses_select on public.anamneses;
create policy anamneses_select on public.anamneses
for select to authenticated
using (public.is_admin() or public.is_org_member(organization_id));

drop policy if exists anamneses_insert on public.anamneses;
create policy anamneses_insert on public.anamneses
for insert to authenticated
with check (
  created_by = auth.uid() and
  public.is_active_user() and
  public.is_org_member(organization_id) and
  (public.is_psychologist() or public.is_org_admin() or public.is_admin())
);

drop policy if exists anamneses_update on public.anamneses;
create policy anamneses_update on public.anamneses
for update to authenticated
using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())))
with check (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

drop policy if exists anamneses_delete on public.anamneses;
create policy anamneses_delete on public.anamneses
for delete to authenticated
using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
for select to authenticated
using (public.is_admin() or public.is_org_member(organization_id));

drop policy if exists sessions_insert on public.sessions;
create policy sessions_insert on public.sessions
for insert to authenticated
with check (
  created_by = auth.uid() and
  public.is_active_user() and
  public.is_org_member(organization_id) and
  (public.is_psychologist() or public.is_org_admin() or public.is_admin())
);

drop policy if exists sessions_update on public.sessions;
create policy sessions_update on public.sessions
for update to authenticated
using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())))
with check (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

drop policy if exists sessions_delete on public.sessions;
create policy sessions_delete on public.sessions
for delete to authenticated
using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

revoke all on public.anamneses from anon;
revoke all on public.sessions from anon;
grant select, insert, update, delete on public.anamneses to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
