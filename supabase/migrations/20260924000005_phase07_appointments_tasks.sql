-- PHASE-07: Appointments + Tasks + Admin RPCs

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  description text check (char_length(description) <= 2000),
  start_at timestamptz not null,
  end_at timestamptz not null check (end_at > start_at),
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  location text check (char_length(location) <= 200),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists appointments_client_start_idx on public.appointments (client_id, start_at desc);
create index if not exists appointments_org_start_idx on public.appointments (organization_id, start_at desc);
create index if not exists appointments_created_by_idx on public.appointments (created_by);

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  description text check (char_length(description) <= 2000),
  due_date date,
  status text not null default 'todo' check (status in ('todo','in_progress','done','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tasks_client_due_idx on public.tasks (client_id, due_date asc);
create index if not exists tasks_org_due_idx on public.tasks (organization_id, due_date asc);
create index if not exists tasks_assigned_idx on public.tasks (assigned_to, status);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- Extend audit_logs check (ensure all actions allowed)
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
  'task_insert', 'task_update', 'task_delete'
));

-- Audit
drop trigger if exists appointments_audit on public.appointments;
create trigger appointments_audit
after insert or update or delete on public.appointments
for each row execute function public.log_audit_change();

drop trigger if exists tasks_audit on public.tasks;
create trigger tasks_audit
after insert or update or delete on public.tasks
for each row execute function public.log_audit_change();

-- RLS
alter table public.appointments enable row level security;
alter table public.tasks enable row level security;

drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments
for select to authenticated using (public.is_admin() or public.is_org_member(organization_id));

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id) and
  (public.is_psychologist() or public.is_org_admin() or public.is_admin()) and
  (client_id is null or exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id))
);

drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments
for update to authenticated using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())))
with check (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

drop policy if exists appointments_delete on public.appointments;
create policy appointments_delete on public.appointments
for delete to authenticated using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
for select to authenticated using (public.is_admin() or public.is_org_member(organization_id));

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id) and
  (public.is_psychologist() or public.is_org_admin() or public.is_admin()) and
  (client_id is null or exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id))
);

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
for update to authenticated using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin() or assigned_to = auth.uid())))
with check (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin() or assigned_to = auth.uid())));

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
for delete to authenticated using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

revoke all on public.appointments from anon;
revoke all on public.tasks from anon;
grant select, insert, update, delete on public.appointments to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

-- ---------------------------------------------------------------------------
-- Admin RPCs — security definer, checks is_admin
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_profiles()
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return query select * from public.profiles order by created_at desc;
end;
$$;

create or replace function public.admin_update_profile(p_id uuid, p_role public.user_role, p_active boolean, p_org_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  update public.profiles set role = p_role, active = p_active, organization_id = p_org_id where id = p_id returning * into result;
  if not found then raise exception 'Profil bulunamadı'; end if;
  return result;
end;
$$;

create or replace function public.admin_list_organizations()
returns setof public.organizations
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  return query select * from public.organizations order by created_at desc;
end;
$$;

create or replace function public.admin_create_organization(p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.organizations;
begin
  if not public.is_admin() then raise exception 'Yetkisiz'; end if;
  if char_length(btrim(p_name)) < 2 or char_length(btrim(p_name)) > 180 then raise exception 'İsim 2-180 karakter'; end if;
  insert into public.organizations(name) values (btrim(p_name)) returning * into result;
  return result;
end;
$$;

revoke all on function public.admin_list_profiles() from public, anon;
revoke all on function public.admin_update_profile(uuid, public.user_role, boolean, uuid) from public, anon;
revoke all on function public.admin_list_organizations() from public, anon;
revoke all on function public.admin_create_organization(text) from public, anon;
grant execute on function public.admin_list_profiles() to authenticated;
grant execute on function public.admin_update_profile(uuid, public.user_role, boolean, uuid) to authenticated;
grant execute on function public.admin_list_organizations() to authenticated;
grant execute on function public.admin_create_organization(text) to authenticated;

-- Extend log_audit_change for new tables
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
  elsif tg_table_name in ('anamneses','sessions','assessments','test_administrations','test_results','reports','report_templates','documents','notes','appointments','tasks','psychologist_settings') then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  else
    org := null;
  end if;

  if tg_op = 'INSERT' then
    act := tg_table_name || '_insert';
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
    elsif tg_table_name = 'documents' then act := 'document_insert';
    elsif tg_table_name = 'notes' then act := 'note_insert';
    elsif tg_table_name = 'appointments' then act := 'appointment_insert';
    elsif tg_table_name = 'tasks' then act := 'task_insert';
    end if;
    insert into public.audit_logs (organization_id, actor, action, target_table, target_id)
    values (org, auth.uid(), act, tg_table_name, new.id);
    return new;
  elsif tg_op = 'UPDATE' then
    act := tg_table_name || '_update';
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
    elsif tg_table_name = 'documents' then act := 'document_update';
    elsif tg_table_name = 'notes' then act := 'note_update';
    elsif tg_table_name = 'appointments' then act := 'appointment_update';
    elsif tg_table_name = 'tasks' then act := 'task_update';
    end if;
    insert into public.audit_logs (organization_id, actor, action, target_table, target_id)
    values (org, auth.uid(), act, tg_table_name, new.id);
    return new;
  else
    act := tg_table_name || '_delete';
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
    elsif tg_table_name = 'documents' then act := 'document_delete';
    elsif tg_table_name = 'notes' then act := 'note_delete';
    elsif tg_table_name = 'appointments' then act := 'appointment_delete';
    elsif tg_table_name = 'tasks' then act := 'task_delete';
    end if;
    insert into public.audit_logs (organization_id, actor, action, target_table, target_id)
    values (org, auth.uid(), act, tg_table_name, old.id);
    return old;
  end if;
end;
$$;
