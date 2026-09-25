-- ===========================================================================
-- PHASE-07 / P0-3 (klinik kalıcılık) — formulations + safety_plans
--
-- Kullanıcı kararı: formülasyon ve güvenlik planı ayrı tablolarda tutulur;
-- mevcut client/session tablosuna jsonb olarak gömülmez.
-- Her iki tablo: FK + ownership + RLS + audit + created_by/updated_by +
-- created_at/updated_at + status (draft/signed/locked) + revision.
--
-- Non-destructive: yalnızca CREATE TABLE / INDEX / TRIGGER / POLICY.
-- Rollback: tablolar boşsa drop edilebilir; doluysa önce yedek alınmalıdır.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Formulations
-- ---------------------------------------------------------------------------
create table if not exists public.formulations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 2097152),
  summary text check (char_length(summary) <= 5000),
  status text not null default 'draft' check (status in ('draft', 'signed', 'locked')),
  revision integer not null default 1 check (revision >= 1),
  version_number integer not null default 1 check (version_number >= 1),
  amendment_of uuid references public.formulations(id) on delete set null,
  amendment_reason text check (char_length(btrim(amendment_reason)) between 3 and 1000),
  superseded_by uuid references public.formulations(id) on delete set null,
  signed_at timestamptz,
  signed_by uuid references public.profiles(id) on delete set null,
  locked_at timestamptz,
  locked_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (status = 'draft' and signed_at is null and locked_at is null)
    or (status = 'signed' and signed_at is not null and locked_at is null)
    or (status = 'locked' and signed_at is not null and locked_at is not null)
  ),
  check (amendment_of is null or amendment_reason is not null)
);

create index if not exists formulations_client_idx on public.formulations (client_id, updated_at desc);
create index if not exists formulations_org_idx on public.formulations (organization_id);
create unique index if not exists formulations_live_client_idx on public.formulations (client_id) where superseded_by is null;

-- ---------------------------------------------------------------------------
-- 2. Safety plans
-- ---------------------------------------------------------------------------
create table if not exists public.safety_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 2097152),
  summary text check (char_length(summary) <= 5000),
  status text not null default 'draft' check (status in ('draft', 'signed', 'locked')),
  revision integer not null default 1 check (revision >= 1),
  version_number integer not null default 1 check (version_number >= 1),
  amendment_of uuid references public.safety_plans(id) on delete set null,
  amendment_reason text check (char_length(btrim(amendment_reason)) between 3 and 1000),
  superseded_by uuid references public.safety_plans(id) on delete set null,
  signed_at timestamptz,
  signed_by uuid references public.profiles(id) on delete set null,
  locked_at timestamptz,
  locked_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (status = 'draft' and signed_at is null and locked_at is null)
    or (status = 'signed' and signed_at is not null and locked_at is null)
    or (status = 'locked' and signed_at is not null and locked_at is not null)
  ),
  check (amendment_of is null or amendment_reason is not null)
);

create index if not exists safety_plans_client_idx on public.safety_plans (client_id, updated_at desc);
create index if not exists safety_plans_org_idx on public.safety_plans (organization_id);
create unique index if not exists safety_plans_live_client_idx on public.safety_plans (client_id) where superseded_by is null;

-- ---------------------------------------------------------------------------
-- 3. Ortak trigger'lar: hazırlık + kilit koruması
-- ---------------------------------------------------------------------------

-- created_at/created_by korunur; durum değişince revision artar; amendment
-- eklendiğinde eski satır superseded_by ile işaretlenir.
create or replace function public.prepare_clinical_record()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  new_previous_revision integer;
  new_previous_version integer;
  -- İçerik sayılmayan kolonlar: revizyon bunlarda artmaz (imza/kilit sadece denetlenir)
  ignored_columns text[] := array['status','signed_at','signed_by','locked_at','locked_by','updated_at','updated_by','revision','version_number','superseded_by','created_at','completed_at','last_version_at','save_reason'];
begin
  if tg_op = 'INSERT' then
    new.updated_by := coalesce(new.updated_by, auth.uid());
    if new.amendment_of is not null then
      -- Revizyon numarası eski kayıttan türetilir (istemciye güvenilmez)
      execute format('select revision, version_number from public.%I where id = $1', tg_table_name)
        into new_previous_revision, new_previous_version
        using new.amendment_of;
      new.revision := coalesce(new_previous_revision, 1) + 1;
      new.version_number := coalesce(new_previous_version, 1) + 1;
      new.status := coalesce(new.status, 'draft');
    end if;
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
    new.updated_at := timezone('utc', now());
    return new;
  end if;

  new.created_at := old.created_at;
  new.created_by := old.created_by;
  new.updated_by := auth.uid();
  if (to_jsonb(new) - ignored_columns) is distinct from (to_jsonb(old) - ignored_columns) then
    new.revision := old.revision + 1;
    new.version_number := old.version_number + 1;
  else
    new.revision := old.revision;
    new.version_number := old.version_number;
  end if;
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

revoke all on function public.prepare_clinical_record() from public, anon;
grant execute on function public.prepare_clinical_record() to authenticated;

-- Kilitli kayıt: DELETE ve içerik UPDATE'i engellenir. Yalnızca
-- superseded_by (revizyon işareti) geçişine izin verilir.
create or replace function public.enforce_locked_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'locked' or old.locked_at is not null then
      raise exception 'Kilitli klinik kayıt silinemez. Düzeltme için yeni revizyon oluşturun.';
    end if;
    return old;
  end if;

  if old.status = 'locked' or old.locked_at is not null then
    if old.superseded_by is null
       and new.superseded_by is not null
       and (to_jsonb(new) - 'superseded_by' - 'updated_at') = (to_jsonb(old) - 'superseded_by' - 'updated_at')
    then
      return new;
    end if;
    raise exception 'Kilitli klinik kayıt değiştirilemez. Düzeltme için yeni revizyon oluşturun.';
  end if;

  if old.status = 'signed' and new.status = 'draft' then
    raise exception 'İmzalı kayıt taslağa çevrilemez.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_locked_record() from public, anon;
grant execute on function public.enforce_locked_record() to authenticated;

-- Amendment INSERT: eski (kilitli) satır superseded_by ile işaretlenir.
create or replace function public.mark_superseded()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.amendment_of is not null and new.superseded_by is null then
    execute format(
      'update %I set superseded_by = $1 where id = $2 and superseded_by is null',
      tg_table_name
    ) using new.id, new.amendment_of;
  end if;
  return new;
end;
$$;

revoke all on function public.mark_superseded() from public, anon;
grant execute on function public.mark_superseded() to authenticated;

-- Formulations trigger'ları
drop trigger if exists formulations_enforce_lock on public.formulations;
create trigger formulations_enforce_lock
before update or delete on public.formulations
for each row execute function public.enforce_locked_record();

drop trigger if exists formulations_prepare on public.formulations;
create trigger formulations_prepare
before insert or update on public.formulations
for each row execute function public.prepare_clinical_record();

drop trigger if exists formulations_audit on public.formulations;
create trigger formulations_audit
after insert or update or delete on public.formulations
for each row execute function public.log_audit_change();

drop trigger if exists formulations_mark_superseded on public.formulations;
create trigger formulations_mark_superseded
after insert on public.formulations
for each row execute function public.mark_superseded();

-- Safety plans trigger'ları
drop trigger if exists safety_plans_enforce_lock on public.safety_plans;
create trigger safety_plans_enforce_lock
before update or delete on public.safety_plans
for each row execute function public.enforce_locked_record();

drop trigger if exists safety_plans_prepare on public.safety_plans;
create trigger safety_plans_prepare
before insert or update on public.safety_plans
for each row execute function public.prepare_clinical_record();

drop trigger if exists safety_plans_audit on public.safety_plans;
create trigger safety_plans_audit
after insert or update or delete on public.safety_plans
for each row execute function public.log_audit_change();

drop trigger if exists safety_plans_mark_superseded on public.safety_plans;
create trigger safety_plans_mark_superseded
after insert on public.safety_plans
for each row execute function public.mark_superseded();

-- ---------------------------------------------------------------------------
-- 4. Audit action listesi genişletmesi
-- ---------------------------------------------------------------------------
alter table public.audit_logs drop constraint if exists audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (action in (
  'client_insert', 'client_update', 'client_delete',
  'profile_insert', 'profile_update', 'profile_delete',
  'org_insert', 'org_update', 'org_delete',
  'anamnesis_insert', 'anamnesis_update', 'anamnesis_delete',
  'session_insert', 'session_update', 'session_delete', 'session_sign', 'session_lock', 'session_revision',
  'assessment_insert', 'assessment_update', 'assessment_delete',
  'test_admin_insert', 'test_admin_update', 'test_admin_delete',
  'test_result_insert', 'test_result_update', 'test_result_delete',
  'report_insert', 'report_update', 'report_delete', 'report_sign', 'report_lock', 'report_revision',
  'template_insert', 'template_update', 'template_delete',
  'document_insert', 'document_update', 'document_delete',
  'note_insert', 'note_update', 'note_delete',
  'appointment_insert', 'appointment_update', 'appointment_delete',
  'task_insert', 'task_update', 'task_delete',
  'formulation_insert', 'formulation_update', 'formulation_delete', 'formulation_sign', 'formulation_lock', 'formulation_revision',
  'safety_plan_insert', 'safety_plan_update', 'safety_plan_delete', 'safety_plan_sign', 'safety_plan_lock', 'safety_plan_revision'
));

-- ---------------------------------------------------------------------------
-- 5. log_audit_change — yeni tablolar + imza/kilit/sürüm eylemleri
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
  root text;
begin
  if tg_table_name = 'clients' then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  elsif tg_table_name = 'organizations' then
    if tg_op = 'DELETE' then org := old.id; else org := new.id; end if;
  elsif tg_table_name = 'profiles' then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  elsif tg_table_name in (
    'anamneses','sessions','assessments','test_administrations','test_results','reports',
    'report_templates','documents','notes','appointments','tasks','psychologist_settings',
    'formulations','safety_plans'
  ) then
    if tg_op = 'DELETE' then org := old.organization_id; else org := new.organization_id; end if;
  else
    org := null;
  end if;

  root := case tg_table_name
    when 'clients' then 'client'
    when 'organizations' then 'org'
    when 'profiles' then 'profile'
    when 'anamneses' then 'anamnesis'
    when 'sessions' then 'session'
    when 'assessments' then 'assessment'
    when 'test_administrations' then 'test_admin'
    when 'test_results' then 'test_result'
    when 'reports' then 'report'
    when 'report_templates' then 'template'
    when 'documents' then 'document'
    when 'notes' then 'note'
    when 'appointments' then 'appointment'
    when 'tasks' then 'task'
    when 'formulations' then 'formulation'
    when 'safety_plans' then 'safety_plan'
    else tg_table_name
  end;

  if tg_op = 'INSERT' then
    -- amendment_of yalnız bazı tablolarda vardır; jsonb ile güvenli kontrol
    if (to_jsonb(new) ? 'amendment_of') and (to_jsonb(new) ->> 'amendment_of') is not null then
      act := root || '_revision';
    else
      act := root || '_insert';
    end if;
    insert into public.audit_logs (organization_id, actor, action, target_table, target_id)
    values (org, auth.uid(), act, tg_table_name, new.id);
    return new;
  elsif tg_op = 'UPDATE' then
    act := root || '_update';
    if (to_jsonb(new) ? 'status') and (to_jsonb(old) ? 'status') then
      if (to_jsonb(new) ->> 'status') = 'signed' and (to_jsonb(old) ->> 'status') = 'draft' then
        act := root || '_sign';
      elsif (to_jsonb(new) ->> 'status') = 'locked' and (to_jsonb(old) ->> 'status') <> 'locked' then
        act := root || '_lock';
      end if;
    end if;
    insert into public.audit_logs (organization_id, actor, action, target_table, target_id)
    values (org, auth.uid(), act, tg_table_name, new.id);
    return new;
  else
    act := root || '_delete';
    insert into public.audit_logs (organization_id, actor, action, target_table, target_id)
    values (org, auth.uid(), act, tg_table_name, old.id);
    return old;
  end if;
end;
$$;

revoke all on function public.log_audit_change() from public, anon;

-- ---------------------------------------------------------------------------
-- 6. RLS — formulations + safety_plans (client ownership)
-- ---------------------------------------------------------------------------
alter table public.formulations enable row level security;
alter table public.safety_plans enable row level security;

drop policy if exists formulations_select on public.formulations;
create policy formulations_select on public.formulations
for select to authenticated using (public.can_access_client(client_id));

drop policy if exists formulations_insert on public.formulations;
create policy formulations_insert on public.formulations
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id)
  and (public.is_psychologist() or public.is_org_admin() or public.is_admin())
  and exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
  and public.can_access_client(client_id)
  and (amendment_of is null or public.can_access_client(client_id))
);

drop policy if exists formulations_update on public.formulations;
create policy formulations_update on public.formulations
for update to authenticated
using (public.can_access_client(client_id))
with check (public.can_access_client(client_id));

drop policy if exists formulations_delete on public.formulations;
create policy formulations_delete on public.formulations
for delete to authenticated using (public.can_access_client(client_id));

drop policy if exists safety_plans_select on public.safety_plans;
create policy safety_plans_select on public.safety_plans
for select to authenticated using (public.can_access_client(client_id));

drop policy if exists safety_plans_insert on public.safety_plans;
create policy safety_plans_insert on public.safety_plans
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id)
  and (public.is_psychologist() or public.is_org_admin() or public.is_admin())
  and exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
  and public.can_access_client(client_id)
);

drop policy if exists safety_plans_update on public.safety_plans;
create policy safety_plans_update on public.safety_plans
for update to authenticated
using (public.can_access_client(client_id))
with check (public.can_access_client(client_id));

drop policy if exists safety_plans_delete on public.safety_plans;
create policy safety_plans_delete on public.safety_plans
for delete to authenticated using (public.can_access_client(client_id));

revoke all on public.formulations from anon;
revoke all on public.safety_plans from anon;
grant select, insert, update, delete on public.formulations to authenticated;
grant select, insert, update, delete on public.safety_plans to authenticated;
