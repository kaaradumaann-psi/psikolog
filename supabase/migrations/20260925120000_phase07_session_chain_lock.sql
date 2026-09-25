-- ===========================================================================
-- PHASE-07 / P0-4 + P0-5 — Appointment → Session bağı + imza/kilit/revizyon
--
-- 1. sessions: appointment_id, SOAP alanlarının DB karşılıkları, sahiplik
-- 2. sessions + reports: draft → signed → locked durumu, signed_at/by,
--    locked_at/by, revision/version, amendment (revizyon) zinciri
-- 3. Kilitli kayıt DB seviyesinde korunur (trigger); düzeltme yeni revizyonla
-- 4. Audit: session_sign / session_lock / session_revision eylemleri
--
-- Non-destructive: ADD COLUMN (nullable / default'lu) + index + trigger.
-- Rollback: yeni kolonlar boş bırakılabilir; trigger/policy geri alınabilir.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. sessions — randevu bağı + SOAP ek alanları
-- ---------------------------------------------------------------------------
alter table public.sessions
  add column if not exists appointment_id uuid references public.appointments(id) on delete set null,
  add column if not exists session_number integer check (session_number is null or session_number >= 1),
  add column if not exists start_time time,
  add column if not exists session_type text check (session_type is null or char_length(session_type) <= 80),
  add column if not exists duration_minutes integer check (duration_minutes is null or duration_minutes between 5 and 600),
  add column if not exists risk_level text check (risk_level is null or risk_level in ('none', 'low', 'moderate', 'high')),
  add column if not exists risk_notes text check (risk_notes is null or char_length(risk_notes) <= 2000),
  add column if not exists homework text check (homework is null or char_length(homework) <= 4000),
  add column if not exists fee numeric(10, 2) check (fee is null or fee >= 0),
  add column if not exists payment_status text check (payment_status is null or payment_status in ('paid', 'pending', 'waived')),
  add column if not exists status text not null default 'draft' check (status in ('draft', 'signed', 'locked')),
  add column if not exists signed_at timestamptz,
  add column if not exists signed_by uuid references public.profiles(id) on delete set null,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by uuid references public.profiles(id) on delete set null,
  add column if not exists revision integer not null default 1 check (revision >= 1),
  add column if not exists version_number integer not null default 1 check (version_number >= 1),
  add column if not exists amendment_of uuid references public.sessions(id) on delete set null,
  add column if not exists amendment_reason text check (amendment_reason is null or char_length(btrim(amendment_reason)) between 3 and 1000),
  add column if not exists superseded_by uuid references public.sessions(id) on delete set null;

alter table public.sessions drop constraint if exists sessions_amendment_reason_check;
alter table public.sessions add constraint sessions_amendment_reason_check
  check (amendment_of is null or amendment_reason is not null);

create index if not exists sessions_appointment_idx on public.sessions (appointment_id);
create index if not exists sessions_status_idx on public.sessions (organization_id, status, date desc);
create unique index if not exists sessions_appointment_unique_idx
  on public.sessions (appointment_id)
  where appointment_id is not null and superseded_by is null;
create unique index if not exists sessions_live_client_number_idx
  on public.sessions (client_id, session_number)
  where session_number is not null and superseded_by is null and amendment_of is null;

-- ---------------------------------------------------------------------------
-- 2. reports — kilit/revizyon kolonları ve durum genişletmesi
-- ---------------------------------------------------------------------------
alter table public.reports
  add column if not exists signed_at timestamptz,
  add column if not exists signed_by uuid references public.profiles(id) on delete set null,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by uuid references public.profiles(id) on delete set null,
  add column if not exists amendment_of uuid references public.reports(id) on delete set null,
  add column if not exists amendment_reason text check (amendment_reason is null or char_length(btrim(amendment_reason)) between 3 and 1000),
  add column if not exists superseded_by uuid references public.reports(id) on delete set null;

-- Durum: draft → completed(imzalı sayılır) → signed/locked desteklenir
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check
  check (status in ('draft', 'completed', 'signed', 'locked'));

alter table public.reports drop constraint if exists reports_check;
alter table public.reports add constraint reports_check
  check ((status = 'draft' and completed_at is null) or (status <> 'draft' and completed_at is not null));

-- ---------------------------------------------------------------------------
-- 3. sessions için hazırlık trigger'ı (created_by korunur, revision artar)
-- ---------------------------------------------------------------------------
create or replace function public.prepare_session_record()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  previous_revision integer;
  previous_version integer;
  ignored_columns text[] := array['status','signed_at','signed_by','locked_at','locked_by','updated_at','updated_by','revision','version_number','superseded_by','created_at'];
begin
  if tg_op = 'INSERT' then
    if new.amendment_of is not null then
      select revision, version_number into previous_revision, previous_version
      from public.sessions where id = new.amendment_of;
      new.revision := coalesce(previous_revision, 1) + 1;
      new.version_number := coalesce(previous_version, 1) + 1;
      new.status := coalesce(new.status, 'draft');
    end if;
    new.updated_at := timezone('utc', now());
    return new;
  end if;

  new.created_at := old.created_at;
  new.created_by := old.created_by;
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

revoke all on function public.prepare_session_record() from public, anon;
grant execute on function public.prepare_session_record() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Trigger'lar (isim sırası: enforce → prepare)
-- ---------------------------------------------------------------------------
drop trigger if exists sessions_enforce_lock on public.sessions;
create trigger sessions_enforce_lock
before update or delete on public.sessions
for each row execute function public.enforce_locked_record();

drop trigger if exists sessions_prepare on public.sessions;
create trigger sessions_prepare
before insert or update on public.sessions
for each row execute function public.prepare_session_record();

drop trigger if exists sessions_mark_superseded on public.sessions;
create trigger sessions_mark_superseded
after insert on public.sessions
for each row execute function public.mark_superseded();

drop trigger if exists reports_enforce_lock on public.reports;
create trigger reports_enforce_lock
before update or delete on public.reports
for each row execute function public.enforce_locked_record();

drop trigger if exists reports_mark_superseded on public.reports;
create trigger reports_mark_superseded
after insert on public.reports
for each row execute function public.mark_superseded();

-- ---------------------------------------------------------------------------
-- 5. sessions INSERT policy — randevu tutarlılığı
-- ---------------------------------------------------------------------------
drop policy if exists sessions_insert on public.sessions;
create policy sessions_insert on public.sessions
for insert to authenticated
with check (
  created_by = auth.uid()
  and public.is_active_user()
  and public.is_org_member(organization_id)
  and (public.is_psychologist() or public.is_org_admin() or public.is_admin())
  and exists (
    select 1 from public.clients c
    where c.id = client_id and c.organization_id = organization_id
  )
  and public.can_access_client(client_id)
  and (
    appointment_id is null
    or exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and a.client_id = client_id
        and a.organization_id = organization_id
        and public.can_access_client(a.client_id)
    )
  )
);
