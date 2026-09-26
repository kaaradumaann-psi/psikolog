-- Production assessment identity + immutable revision lineage for all active tools.
-- Completed administrations/results are append-only. A correction is a new
-- administration linked through amendment_of; no score or response is overwritten.

update public.test_definitions set
  name = 'Beck Anksiyete Envanteri (BAI)',
  description = 'BAI-1988 / Ulusoy ve ark. 1998 Türkçe bağlamı; lisanslı formdan 21 × 0–3 sayısal aktarım, yalnız toplam puan; yetkili dijital kullanım ayrıca doğrulanır'
where id = '00000000-0000-4000-8000-000000000001' and is_system = true;

update public.test_definitions set
  name = 'SCL-90-R®',
  description = 'SCL-90-R 1994 / Dağ 1991 üniversite öğrencisi bağlamı; lisanslı formdan 90 × 0–4 aktarım; ham boyut/GSI/PST/PSDI, norm veya klinik eşik yok'
where id = '00000000-0000-4000-8000-000000000003' and is_system = true;

update public.test_definitions set
  name = 'GAD-7',
  description = 'GAD-7 2006 / Konkan ve ark. 2013 Türkçe klinik örneklem; 7 × 0–3 toplam; Türkçe metin eşliği doğrulanana kadar sayısal aktarım; tarama tanı değildir'
where id = '00000000-0000-4000-8000-000000000004' and is_system = true;

update public.test_definitions set
  name = 'PHQ-9',
  description = 'PHQ-9 2001 / Sarı ve ark. 2016 Türkçe güvenirlik bağlamı; 9 × 0–3 toplam ve puanlanmayan işlevsellik kodu; madde 9 için nötr inceleme bayrağı'
where id = '00000000-0000-4000-8000-000000000005' and is_system = true;

alter table public.test_administrations
  add column if not exists instrument_version text check (instrument_version is null or char_length(instrument_version) <= 160),
  add column if not exists scoring_version text check (scoring_version is null or char_length(scoring_version) <= 160),
  add column if not exists revision integer not null default 1 check (revision >= 1),
  add column if not exists amendment_of uuid references public.test_administrations(id) on delete restrict;

create unique index if not exists test_administrations_one_successor_idx
  on public.test_administrations(amendment_of) where amendment_of is not null;
create index if not exists test_administrations_revision_idx
  on public.test_administrations(client_id, test_definition_id, administration_date desc, revision desc);

-- log_audit_change classifies an administration with amendment_of as
-- test_admin_revision; allow that explicit immutable-history event.
alter table public.audit_logs drop constraint if exists audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (action in (
  'client_insert', 'client_update', 'client_delete',
  'profile_insert', 'profile_update', 'profile_delete',
  'org_insert', 'org_update', 'org_delete',
  'anamnesis_insert', 'anamnesis_update', 'anamnesis_delete',
  'session_insert', 'session_update', 'session_delete', 'session_sign', 'session_lock', 'session_revision',
  'assessment_insert', 'assessment_update', 'assessment_delete',
  'test_admin_insert', 'test_admin_update', 'test_admin_delete', 'test_admin_revision',
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

create or replace function public.validate_test_administration_revision()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  source_row public.test_administrations%rowtype;
begin
  if new.amendment_of is null then
    if new.revision <> 1 then
      raise exception 'Kök test uygulaması revizyon 1 olmalıdır';
    end if;
    return new;
  end if;

  if new.amendment_of = new.id then
    raise exception 'Test uygulaması kendisinin revizyonu olamaz';
  end if;

  select * into source_row from public.test_administrations where id = new.amendment_of;
  if not found
    or source_row.client_id <> new.client_id
    or source_row.organization_id <> new.organization_id
    or source_row.test_definition_id <> new.test_definition_id
    or source_row.status <> 'completed'
    or new.revision <> source_row.revision + 1 then
    raise exception 'Test uygulaması revizyon zinciri geçersiz';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_test_administration_revision() from public;

drop trigger if exists test_admin_validate_revision on public.test_administrations;
create trigger test_admin_validate_revision
before insert or update on public.test_administrations
for each row execute function public.validate_test_administration_revision();

create or replace function public.protect_completed_test_administration()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'completed' then
      raise exception 'Tamamlanmış test uygulaması silinemez; yeni revizyon oluşturun';
    end if;
    return old;
  end if;

  if old.status = 'completed' and (
    new.client_id is distinct from old.client_id
    or new.test_definition_id is distinct from old.test_definition_id
    or new.organization_id is distinct from old.organization_id
    or new.administration_date is distinct from old.administration_date
    or new.status is distinct from old.status
    or new.external_source is distinct from old.external_source
    or new.external_assessment_id is distinct from old.external_assessment_id
    or new.notes is distinct from old.notes
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
    or new.instrument_version is distinct from old.instrument_version
    or new.scoring_version is distinct from old.scoring_version
    or new.revision is distinct from old.revision
    or new.amendment_of is distinct from old.amendment_of
  ) then
    raise exception 'Tamamlanmış test uygulaması değiştirilemez; yeni revizyon oluşturun';
  end if;
  if old.status = 'completed' then
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_completed_test_administration() from public;

-- The original updated_at trigger sorts after "protect" and would mutate a completed
-- row even for an idempotent retry. Run it first; the protection trigger below then
-- restores the immutable completion timestamp on a genuine no-op.
drop trigger if exists test_admin_set_updated_at on public.test_administrations;
drop trigger if exists test_admin_a_set_updated_at on public.test_administrations;
create trigger test_admin_a_set_updated_at
before update on public.test_administrations
for each row execute function public.set_updated_at();

drop trigger if exists test_admin_protect_completed on public.test_administrations;
create trigger test_admin_protect_completed
before update or delete on public.test_administrations
for each row execute function public.protect_completed_test_administration();

create or replace function public.protect_completed_test_result()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  completed boolean;
begin
  select (status = 'completed') into completed
  from public.test_administrations
  where id = coalesce(new.test_administration_id, old.test_administration_id);

  if tg_op = 'DELETE' then
    if completed then
      raise exception 'Tamamlanmış test sonucu silinemez; yeni revizyon oluşturun';
    end if;
    return old;
  end if;

  if completed and (
    new.test_administration_id is distinct from old.test_administration_id
    or new.organization_id is distinct from old.organization_id
    or new.result_data is distinct from old.result_data
    or new.summary is distinct from old.summary
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Tamamlanmış test sonucu değiştirilemez; yeni revizyon oluşturun';
  end if;
  if completed then
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_completed_test_result() from public;

drop trigger if exists test_results_set_updated_at on public.test_results;
drop trigger if exists test_results_a_set_updated_at on public.test_results;
create trigger test_results_a_set_updated_at
before update on public.test_results
for each row execute function public.set_updated_at();

drop trigger if exists test_results_protect_completed on public.test_results;
create trigger test_results_protect_completed
before update or delete on public.test_results
for each row execute function public.protect_completed_test_result();

comment on column public.test_administrations.instrument_version is 'Uygulanan ölçeğin açık sürüm/uyarlama kimliği';
comment on column public.test_administrations.scoring_version is 'Yanıtlardan sonucu üreten araca özgü algoritma sürümü';
comment on column public.test_administrations.revision is 'Aynı klinik uygulama düzeltme zincirindeki 1 tabanlı revizyon';
comment on column public.test_administrations.amendment_of is 'Değiştirilmeyen önceki tamamlanmış uygulama; düzeltme ayrı satırdır';
