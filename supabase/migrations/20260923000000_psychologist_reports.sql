-- Report storage consumes snapshots only; no changes to clinical records/scoring.
create table public.mmpi_report_templates (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_system and created_by is null) or (not is_system and created_by is not null))
);
insert into public.mmpi_report_templates(id, name, content, is_system)
values ('00000000-0000-4000-8000-000000000001', 'Standart MMPI Psikolog Raporu', '{"schemaVersion":1,"blocks":[]}', true);

create table public.mmpi_reports (
  id uuid primary key default gen_random_uuid(),
  mmpi_record_id uuid not null references public.mmpi_records(id) on delete cascade,
  template_id uuid references public.mmpi_report_templates(id) on delete set null,
  template_name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 8000000),
  status text not null default 'draft' check (status in ('draft', 'completed')),
  source_data_snapshot jsonb not null check (jsonb_typeof(source_data_snapshot) = 'object'),
  source_data_version text not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  revision integer not null default 1,
  version_number integer not null default 1,
  last_version_at timestamptz not null default now(),
  save_reason text not null default 'create' check (save_reason in ('create','autosave','manual','complete','refresh','restore')),
  check ((status = 'draft' and completed_at is null) or (status = 'completed' and completed_at is not null))
);
create index mmpi_reports_record_idx on public.mmpi_reports(mmpi_record_id, updated_at desc);
create index mmpi_reports_owner_idx on public.mmpi_reports(created_by);
create table public.mmpi_report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.mmpi_reports(id) on delete cascade,
  version_number integer not null,
  content jsonb not null,
  snapshot jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  reason text not null,
  unique (report_id, version_number)
);
create table public.psychologist_report_settings (
  created_by uuid primary key references public.profiles(id) on delete cascade,
  letterhead jsonb not null default '{}' check (jsonb_typeof(letterhead) = 'object' and octet_length(letterhead::text) <= 2000000),
  updated_at timestamptz not null default now()
);

-- Server-side optimistic revision and atomic history: no client can forge/delete a version.
create function public.prepare_mmpi_report() returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    new.revision := 1; new.version_number := 1; new.last_version_at := now();
    new.created_at := now();
  else
    if new.created_by is distinct from old.created_by or new.mmpi_record_id is distinct from old.mmpi_record_id or new.id is distinct from old.id then
      raise exception 'Rapor sahipliği ve kaynak kayıt değiştirilemez';
    end if;
    new.created_at := old.created_at;
    new.revision := old.revision + 1;
    new.version_number := old.version_number;
    new.last_version_at := old.last_version_at;
    if new.save_reason <> 'autosave' or old.last_version_at <= now() - interval '10 minutes' then
      new.version_number := old.version_number + 1; new.last_version_at := now();
    end if;
  end if;
  new.updated_at := now();
  if new.status = 'draft' then new.completed_at := null;
  elsif TG_OP = 'INSERT' then new.completed_at := now();
  elsif old.status <> 'completed' then new.completed_at := now();
  else new.completed_at := old.completed_at;
  end if;
  return new;
end $$;
create trigger prepare_mmpi_report before insert or update on public.mmpi_reports
for each row execute function public.prepare_mmpi_report();
create function public.version_mmpi_report() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.mmpi_report_versions(report_id, version_number, content, snapshot, created_by, reason)
    values(new.id, new.version_number, new.content, to_jsonb(new), auth.uid(), new.save_reason);
  elsif new.version_number <> old.version_number then
    insert into public.mmpi_report_versions(report_id, version_number, content, snapshot, created_by, reason)
    values(new.id, new.version_number, new.content, to_jsonb(new), auth.uid(), new.save_reason);
  end if;
  return new;
end $$;
revoke all on function public.version_mmpi_report() from public, anon, authenticated;
create trigger version_mmpi_report after insert or update on public.mmpi_reports
for each row execute function public.version_mmpi_report();

alter table public.mmpi_reports enable row level security;
alter table public.mmpi_report_versions enable row level security;
alter table public.mmpi_report_templates enable row level security;
alter table public.psychologist_report_settings enable row level security;
create policy reports_read on public.mmpi_reports for select to authenticated
using (public.is_admin() or (created_by = auth.uid() and public.is_psychologist() and exists(select 1 from public.mmpi_records r where r.id = mmpi_record_id and r.created_by = auth.uid())));
create policy reports_insert on public.mmpi_reports for insert to authenticated
with check (created_by = auth.uid() and public.is_active_user() and
  (public.is_admin() or (public.is_psychologist() and exists(select 1 from public.mmpi_records r where r.id = mmpi_record_id and r.created_by = auth.uid())))
  and (template_id is null or exists(select 1 from public.mmpi_report_templates t where t.id = template_id and (t.is_system or t.created_by = auth.uid()))));
create policy reports_update on public.mmpi_reports for update to authenticated
using (public.is_admin() or (created_by = auth.uid() and public.is_psychologist() and exists(select 1 from public.mmpi_records r where r.id = mmpi_record_id and r.created_by = auth.uid())))
with check (public.is_admin() or (created_by = auth.uid() and public.is_psychologist() and exists(select 1 from public.mmpi_records r where r.id = mmpi_record_id and r.created_by = auth.uid())));
create policy reports_delete on public.mmpi_reports for delete to authenticated
using (public.is_admin() or (created_by = auth.uid() and public.is_psychologist() and exists(select 1 from public.mmpi_records r where r.id = mmpi_record_id and r.created_by = auth.uid())));
create policy versions_read on public.mmpi_report_versions for select to authenticated
using (exists(select 1 from public.mmpi_reports r where r.id = report_id));
create policy templates_read on public.mmpi_report_templates for select to authenticated
using (public.is_active_user() and (is_system or created_by = auth.uid() or public.is_admin()));
create policy templates_insert on public.mmpi_report_templates for insert to authenticated
with check (not is_system and created_by = auth.uid() and (public.is_psychologist() or public.is_admin()));
create policy templates_update on public.mmpi_report_templates for update to authenticated
using (not is_system and (public.is_admin() or (created_by = auth.uid() and public.is_psychologist())))
with check (not is_system and (public.is_admin() or (created_by = auth.uid() and public.is_psychologist())));
create policy templates_delete on public.mmpi_report_templates for delete to authenticated
using (not is_system and (public.is_admin() or (created_by = auth.uid() and public.is_psychologist())));
create policy settings_read on public.psychologist_report_settings for select to authenticated
using (public.is_admin() or (created_by = auth.uid() and public.is_psychologist()));
create policy settings_write on public.psychologist_report_settings for all to authenticated
using (public.is_admin() or (created_by = auth.uid() and public.is_psychologist()))
with check (public.is_admin() or (created_by = auth.uid() and public.is_psychologist()));
create trigger report_templates_updated before update on public.mmpi_report_templates for each row execute function public.set_updated_at();
create trigger report_settings_updated before update on public.psychologist_report_settings for each row execute function public.set_updated_at();
revoke all on public.mmpi_reports, public.mmpi_report_versions, public.mmpi_report_templates, public.psychologist_report_settings from anon;
grant select, insert, update, delete on public.mmpi_reports, public.mmpi_report_templates, public.psychologist_report_settings to authenticated;
revoke all on public.mmpi_report_versions from authenticated;
grant select on public.mmpi_report_versions to authenticated;
