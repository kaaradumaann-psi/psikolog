-- P0: Klinik iş akışı sütunları + psikolog düzeyinde okuma izolasyonu
--
-- Kurallar:
--   * Hiçbir tablo drop edilmez, hiçbir sütun silinmez, RLS kapatılmaz.
--   * SELECT politikaları daraltılır (genişletilmez): PSYCHOLOG artık yalnızca
--     kendi kayıtlarını okur, ORG_ADMIN kendi kurumunu, ADMIN her yeri görür.
--   * Yeni sütunlar nullable veya varsayılanlıdır; mevcut satırlar bozulmaz.

-- ---------------------------------------------------------------------------
-- 1. clients.status — uygulamanın kullandığı dört durumu kabul et
--    (yerel model: active | followup | completed | archived)
-- ---------------------------------------------------------------------------
alter table public.clients drop constraint if exists clients_status_check;
alter table public.clients
  add constraint clients_status_check
  check (status in ('active', 'followup', 'completed', 'archived'));

-- Uygulamanın kullandığı, şemada ayrı sütunu olmayan alanlar (cinsiyet, medeni
-- durum, acil iletişim, tanı listesi) tek jsonb alanında taşınır.
-- T.C. kimlik numarası BİLEREK senkronize edilmez: en hassas kimlik alanıdır,
-- cihazda kalır ve veri minimizasyonu gereği buluta yazılmaz.
alter table public.clients
  add column if not exists profile_extra jsonb not null default '{}'
    check (jsonb_typeof(profile_extra) = 'object' and octet_length(profile_extra::text) <= 65536);

-- ---------------------------------------------------------------------------
-- 2. appointments — ücret ve ödeme durumu
-- ---------------------------------------------------------------------------
alter table public.appointments
  add column if not exists fee numeric(10,2) check (fee is null or fee >= 0),
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('paid', 'pending', 'waived'));

-- ---------------------------------------------------------------------------
-- 3. sessions — SOAP alanları, randevu ilişkisi, risk, ücret
--    Mevcut notes/observation/key_points/plan/follow_up sütunlarına dokunulmaz.
-- ---------------------------------------------------------------------------
alter table public.sessions
  add column if not exists appointment_id uuid references public.appointments(id) on delete set null,
  add column if not exists session_number integer check (session_number is null or session_number > 0),
  add column if not exists start_time time,
  add column if not exists subjective text check (char_length(subjective) <= 8000),
  add column if not exists objective text check (char_length(objective) <= 8000),
  add column if not exists assessment text check (char_length(assessment) <= 8000),
  add column if not exists risk_level text not null default 'none'
    check (risk_level in ('none', 'low', 'moderate', 'high')),
  add column if not exists risk_notes text check (char_length(risk_notes) <= 5000),
  add column if not exists homework text check (char_length(homework) <= 5000),
  add column if not exists fee numeric(10,2) check (fee is null or fee >= 0),
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('paid', 'pending', 'waived'));

create index if not exists sessions_appointment_idx on public.sessions (appointment_id);

-- Randevu ve seans aynı kuruma ait olmalıdır.
drop trigger if exists sessions_validate_appointment on public.sessions;
create or replace function public.validate_session_appointment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.appointment_id is not null then
    if not exists (
      select 1 from public.appointments a
      where a.id = new.appointment_id
        and a.organization_id = new.organization_id
        and (a.client_id is null or a.client_id = new.client_id)
    ) then
      raise exception 'Seans başka bir randevuya veya danışana bağlanamaz';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_session_appointment() from public;

create trigger sessions_validate_appointment
before insert or update on public.sessions
for each row execute function public.validate_session_appointment();

-- ---------------------------------------------------------------------------
-- 4. Kişisel kurum — tek uzmanlı pratikte bulut yolu açılsın
--    profiles.organization_id null ise is_org_member(null) false döner ve
--    kullanıcı hiçbir klinik kayıt yazamaz. Bu RPC yalnızca çağıranın kendi
--    profilini bağlar; rol yükseltmez, public signup açmaz.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_personal_organization()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
  uname text;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı';
  end if;
  if not public.is_active_user() then
    raise exception 'Hesap aktif değil';
  end if;

  -- Aynı oturumdan eşzamanlı çağrılarda iki kurum oluşmasın.
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  select organization_id into org from public.profiles where id = auth.uid();
  if org is not null then
    return org;
  end if;

  select left(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), 180)
    into uname
  from public.profiles where id = auth.uid();

  if uname is null or char_length(uname) < 2 then
    uname := 'Bireysel çalışma alanı';
  end if;

  insert into public.organizations(name) values (uname) returning id into org;
  update public.profiles set organization_id = org where id = auth.uid();
  return org;
end;
$$;

revoke all on function public.ensure_personal_organization() from public, anon;
grant execute on function public.ensure_personal_organization() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Okuma izolasyonu — PSYCHOLOG yalnızca kendi kaydı
--    ADMIN: tümü · ORG_ADMIN: kendi kurumu · PSYCHOLOG: created_by = auth.uid()
-- ---------------------------------------------------------------------------

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_admin() and public.is_org_member(organization_id))
  or (public.is_org_member(organization_id) and created_by = auth.uid())
);

drop policy if exists anamneses_select on public.anamneses;
create policy anamneses_select on public.anamneses
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_admin() and public.is_org_member(organization_id))
  or (public.is_org_member(organization_id) and created_by = auth.uid())
);

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_admin() and public.is_org_member(organization_id))
  or (public.is_org_member(organization_id) and created_by = auth.uid())
);

drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_admin() and public.is_org_member(organization_id))
  or (public.is_org_member(organization_id) and created_by = auth.uid())
);

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_admin() and public.is_org_member(organization_id))
  or (public.is_org_member(organization_id) and (created_by = auth.uid() or assigned_to = auth.uid()))
);

drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_admin() and public.is_org_member(organization_id))
  or (public.is_org_member(organization_id) and created_by = auth.uid())
);

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_admin() and public.is_org_member(organization_id))
  or (public.is_org_member(organization_id) and created_by = auth.uid())
);

drop policy if exists assessments_select on public.assessments;
create policy assessments_select on public.assessments
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_admin() and public.is_org_member(organization_id))
  or (public.is_org_member(organization_id) and created_by = auth.uid())
);

drop policy if exists test_admin_select on public.test_administrations;
create policy test_admin_select on public.test_administrations
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_admin() and public.is_org_member(organization_id))
  or (public.is_org_member(organization_id) and created_by = auth.uid())
);

-- test_results satırında created_by yok; sahiplik üst kayıttan çözülür.
drop policy if exists test_results_select on public.test_results;
create policy test_results_select on public.test_results
for select to authenticated
using (
  public.is_admin()
  or (
    public.is_org_member(organization_id)
    and exists (
      select 1 from public.test_administrations ta
      where ta.id = test_administration_id
        and (public.is_org_admin() or ta.created_by = auth.uid())
    )
  )
);

-- Rapor sürümleri raporun görünürlüğünü takip eder (rapor zaten sahip kapsamlı).
drop policy if exists versions_select on public.report_versions;
create policy versions_select on public.report_versions
for select to authenticated
using (
  exists (
    select 1 from public.reports r
    where r.id = report_id
      and (
        public.is_admin()
        or (public.is_org_admin() and public.is_org_member(r.organization_id))
        or (public.is_org_member(r.organization_id) and r.created_by = auth.uid())
      )
  )
);

-- ---------------------------------------------------------------------------
-- 6. created_by korunur — bir upsert kayıt sahipliğini devredemez
--    Okuma politikası sahibe bağlı olduğu için sahipliğin değişmesi kaydı
--    asıl uzmanın görüşünden çıkarırdı.
-- ---------------------------------------------------------------------------
create or replace function public.preserve_created_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;
revoke all on function public.preserve_created_by() from public;

do $$
declare
  t text;
begin
  foreach t in array array['clients','anamneses','appointments','sessions',
                           'test_administrations','documents','notes','tasks']
  loop
    execute format('drop trigger if exists %1$s_preserve_created_by on public.%1$I', t);
    execute format('create trigger %1$s_preserve_created_by before update on public.%1$I
                    for each row execute function public.preserve_created_by()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Audit log — append-only olduğunu açıkça sabitle
--    İstemci zaten yalnız SELECT yetkisine sahip; INSERT/UPDATE/DELETE yok.
-- ---------------------------------------------------------------------------
revoke insert, update, delete, truncate, references, trigger
  on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;
