-- PHASE-05: Reports + Templates + Versions + Settings

-- ---------------------------------------------------------------------------
-- Report Templates — system + org
-- ---------------------------------------------------------------------------
create table if not exists public.report_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 180),
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 2097152),
  is_system boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((is_system and created_by is null and organization_id is null) or (not is_system and created_by is not null))
);

insert into public.report_templates(id, name, content, is_system)
values
  ('00000000-0000-4000-8000-000000000001', 'Standart Psikolojik Değerlendirme Raporu', '{"schemaVersion":1,"blocks":[{"id":"b1","type":"heading1","runs":[{"text":"Psikolojik Değerlendirme Raporu"}]},{"id":"b2","type":"dataField","path":"patient.fullName","label":"Danışan"},{"id":"b3","type":"dataField","path":"test.date","label":"Değerlendirme Tarihi"},{"id":"b4","type":"paragraph","runs":[{"text":"Bu rapor {{patient.fullName}} için hazırlanmıştır."}]}]}', true),
  ('00000000-0000-4000-8000-000000000002', 'Özet Bilgi Notu', '{"schemaVersion":1,"blocks":[{"id":"b1","type":"heading1","runs":[{"text":"Özet Bilgi Notu"}]},{"id":"b2","type":"paragraph","runs":[{"text":"Danışan: {{patient.fullName}}"}]}]}', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete set null,
  test_administration_id uuid references public.test_administrations(id) on delete set null,
  template_id uuid references public.report_templates(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 8388608),
  status text not null default 'draft' check (status in ('draft', 'completed')),
  source_snapshot jsonb not null check (jsonb_typeof(source_snapshot) = 'object'),
  source_version text not null default 'v1',
  revision integer not null default 1,
  version_number integer not null default 1,
  last_version_at timestamptz not null default timezone('utc', now()),
  save_reason text not null default 'create' check (save_reason in ('create','autosave','manual','complete','refresh','restore')),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((status = 'draft' and completed_at is null) or (status = 'completed' and completed_at is not null))
);

create index if not exists reports_client_idx on public.reports (client_id, updated_at desc);
create index if not exists reports_org_idx on public.reports (organization_id);
create index if not exists reports_created_by_idx on public.reports (created_by);

-- ---------------------------------------------------------------------------
-- Report Versions — immutable history
-- ---------------------------------------------------------------------------
create table if not exists public.report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  version_number integer not null,
  content jsonb not null,
  snapshot jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  reason text not null,
  unique (report_id, version_number)
);

-- ---------------------------------------------------------------------------
-- Psychologist Settings — antet/logo/imza data URL
-- ---------------------------------------------------------------------------
create table if not exists public.psychologist_settings (
  created_by uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  letterhead jsonb not null default '{}' check (jsonb_typeof(letterhead) = 'object' and octet_length(letterhead::text) <= 2097152),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Triggers — prepare + versioning
-- ---------------------------------------------------------------------------
create or replace function public.prepare_report()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    new.revision := 1;
    new.version_number := 1;
    new.last_version_at := now();
    new.created_at := now();
  else
    if new.created_by is distinct from old.created_by or new.organization_id is distinct from old.organization_id or new.client_id is distinct from old.client_id or new.id is distinct from old.id then
      raise exception 'Rapor sahipliği ve kaynak değiştirilemez';
    end if;
    new.created_at := old.created_at;
    new.revision := old.revision + 1;
    new.version_number := old.version_number;
    new.last_version_at := old.last_version_at;
    if new.save_reason <> 'autosave' or old.last_version_at <= now() - interval '10 minutes' then
      new.version_number := old.version_number + 1;
      new.last_version_at := now();
    end if;
  end if;
  new.updated_at := now();
  if new.status = 'draft' then new.completed_at := null;
  elsif TG_OP = 'INSERT' then new.completed_at := now();
  elsif old.status <> 'completed' then new.completed_at := now();
  else new.completed_at := old.completed_at;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_prepare on public.reports;
create trigger reports_prepare
before insert or update on public.reports
for each row execute function public.prepare_report();

create or replace function public.version_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.report_versions(report_id, version_number, content, snapshot, created_by, reason)
    values (new.id, new.version_number, new.content, to_jsonb(new), auth.uid(), new.save_reason);
  elsif new.version_number <> old.version_number then
    insert into public.report_versions(report_id, version_number, content, snapshot, created_by, reason)
    values (new.id, new.version_number, new.content, to_jsonb(new), auth.uid(), new.save_reason);
  end if;
  return new;
end;
$$;

revoke all on function public.version_report() from public, anon, authenticated;

drop trigger if exists reports_version on public.reports;
create trigger reports_version
after insert or update on public.reports
for each row execute function public.version_report();

-- Updated at for templates/settings
drop trigger if exists report_templates_updated on public.report_templates;
create trigger report_templates_updated
before update on public.report_templates
for each row execute function public.set_updated_at();

drop trigger if exists psychologist_settings_updated on public.psychologist_settings;
create trigger psychologist_settings_updated
before update on public.psychologist_settings
for each row execute function public.set_updated_at();

-- Audit
drop trigger if exists reports_audit on public.reports;
create trigger reports_audit
after insert or update or delete on public.reports
for each row execute function public.log_audit_change();

drop trigger if exists templates_audit on public.report_templates;
create trigger templates_audit
after insert or update or delete on public.report_templates
for each row execute function public.log_audit_change();

-- RLS
alter table public.report_templates enable row level security;
alter table public.reports enable row level security;
alter table public.report_versions enable row level security;
alter table public.psychologist_settings enable row level security;

-- Templates
drop policy if exists templates_select on public.report_templates;
create policy templates_select on public.report_templates
for select to authenticated using (
  public.is_active_user() and (is_system or public.is_org_member(organization_id) or public.is_admin())
);

drop policy if exists templates_insert on public.report_templates;
create policy templates_insert on public.report_templates
for insert to authenticated with check (
  not is_system and created_by = auth.uid() and public.is_org_member(organization_id) and
  (public.is_psychologist() or public.is_org_admin() or public.is_admin())
);

drop policy if exists templates_update on public.report_templates;
create policy templates_update on public.report_templates
for update to authenticated using (
  not is_system and (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())))
)
with check (
  not is_system and (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())))
);

drop policy if exists templates_delete on public.report_templates;
create policy templates_delete on public.report_templates
for delete to authenticated using (
  not is_system and (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())))
);

-- Reports
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
for select to authenticated using (
  public.is_admin() or (public.is_org_member(organization_id) and created_by = auth.uid()) or
  (public.is_org_admin() and public.is_org_member(organization_id))
);

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id) and
  (public.is_admin() or public.is_org_member(organization_id)) and
  exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id) and
  (template_id is null or exists (select 1 from public.report_templates t where t.id = template_id and (t.is_system or t.organization_id = organization_id)))
);

drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports
for update to authenticated using (
  public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin()))
)
with check (
  public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin()))
);

drop policy if exists reports_delete on public.reports;
create policy reports_delete on public.reports
for delete to authenticated using (
  public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin()))
);

-- Versions: select via report exists
drop policy if exists versions_select on public.report_versions;
create policy versions_select on public.report_versions
for select to authenticated using (
  exists (select 1 from public.reports r where r.id = report_id and (public.is_admin() or public.is_org_member(r.organization_id)))
);

-- Settings
drop policy if exists settings_select on public.psychologist_settings;
create policy settings_select on public.psychologist_settings
for select to authenticated using (public.is_admin() or public.is_org_member(organization_id));

drop policy if exists settings_write on public.psychologist_settings;
create policy settings_write on public.psychologist_settings
for all to authenticated using (public.is_admin() or public.is_org_member(organization_id))
with check (public.is_admin() or public.is_org_member(organization_id));

revoke all on public.report_templates from anon;
revoke all on public.reports from anon;
revoke all on public.report_versions from anon;
revoke all on public.psychologist_settings from anon;

grant select, insert, update, delete on public.report_templates to authenticated;
grant select, insert, update, delete on public.reports to authenticated;
grant select on public.report_versions to authenticated;
grant select, insert, update, delete on public.psychologist_settings to authenticated;

revoke all on public.report_versions from authenticated;
grant select on public.report_versions to authenticated;
