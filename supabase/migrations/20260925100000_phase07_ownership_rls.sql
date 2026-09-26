-- ===========================================================================
-- PHASE-07 / P0-2 — Tek psikolog sahipliği + RLS boşluklarının kapatılması
--
-- Amaç (MASTER_SYSTEM_AUDIT §4, §9, §12):
--   1. clients.owner_user_id ile "kendi danışanı" sahipliği
--   2. Kurum içi geniş okuma yerine  owner psychologist → own clinical data
--   3. sessions/anamneses INSERT'te client-org + client-ownership doğrulaması
--   4. profiles_insert_self ile keyfî organization_id atanmasının engellenmesi
--   5. psychologist_settings sahiplik daraltması
--   6. test_results / report_versions ownership
--   7. Storage: yalnız org öneki değil, client ownership kontrolü
--
-- Non-destructive: yalnızca ADD COLUMN, backfill, CREATE OR REPLACE FUNCTION,
-- DROP POLICY + CREATE POLICY. Tablo/kolon silinmez, veri kaybı yok.
-- Rollback: policy'ler eski hallerine döndürülebilir; eklenen kolonlar zararsız
-- (nullable) kalır. Yeni kolonların varsayılanı trigger ile doldurulur.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 0. Sahiplik kolonları (önce eklenir: yardımcı fonksiyonlar bu kolona atıf yapar)
-- ---------------------------------------------------------------------------

alter table public.clients
  add column if not exists owner_user_id uuid references public.profiles(id) on delete cascade;

alter table public.appointments
  add column if not exists owner_user_id uuid references public.profiles(id) on delete cascade;

alter table public.sessions
  add column if not exists owner_user_id uuid references public.profiles(id) on delete cascade;

-- Mevcut kayıtlar için geri doldurma (veri kaybı yok, yalnız okuma + yazma)
update public.clients set owner_user_id = created_by where owner_user_id is null;
update public.appointments set owner_user_id = created_by where owner_user_id is null;
update public.sessions set owner_user_id = created_by where owner_user_id is null;

create index if not exists clients_owner_idx on public.clients (owner_user_id, status);
create index if not exists appointments_owner_idx on public.appointments (owner_user_id, start_at desc);
create index if not exists sessions_owner_idx on public.sessions (owner_user_id, date desc);

-- ---------------------------------------------------------------------------
-- 1. Yardımcılar
-- ---------------------------------------------------------------------------

-- Storage yol bileşenlerinde bozuk uuid cast'lerini güvenli hale getirir.
create or replace function public.safe_uuid(value text)
returns uuid
language sql
immutable
as $$
  select case
    when value is null then null
    when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then value::uuid
    else null
  end;
$$;

revoke all on function public.safe_uuid(text) from public, anon;
grant execute on function public.safe_uuid(text) to authenticated;

-- Bir danışana erişim: admin (platform) veya sahibi (owner_user_id/created_by) veya
-- kendi kurumunun ORG_ADMIN'i. Kurum içi meslektaş erişimi YOKTUR.
create or replace function public.can_access_client(target_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = target_client
      and (
        public.is_admin()
        or (
          public.is_active_user()
          and (
            coalesce(c.owner_user_id, c.created_by) = auth.uid()
            or (public.is_org_admin() and c.organization_id = public.my_organization_id())
          )
        )
      )
  );
$$;

revoke all on function public.can_access_client(uuid) from public, anon;
grant execute on function public.can_access_client(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Sahiplik trigger'ları (istemciye güvenmeden doldurma)
-- ---------------------------------------------------------------------------

-- Yeni kayıtlarda sahibi otomatik doldur (istemciye güvenmeden)
create or replace function public.set_row_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_user_id is null then
    new.owner_user_id := coalesce(new.created_by, auth.uid());
  end if;
  return new;
end;
$$;

revoke all on function public.set_row_owner() from public, anon;
grant execute on function public.set_row_owner() to authenticated;

drop trigger if exists clients_set_owner on public.clients;
create trigger clients_set_owner
before insert on public.clients
for each row execute function public.set_row_owner();

drop trigger if exists appointments_set_owner on public.appointments;
create trigger appointments_set_owner
before insert on public.appointments
for each row execute function public.set_row_owner();

drop trigger if exists sessions_set_owner on public.sessions;
create trigger sessions_set_owner
before insert on public.sessions
for each row execute function public.set_row_owner();

-- ---------------------------------------------------------------------------
-- 2. Clients — kendi danışanı
-- ---------------------------------------------------------------------------

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
for select to authenticated
using (
  public.is_admin()
  or (
    public.is_active_user()
    and (
      coalesce(owner_user_id, created_by) = auth.uid()
      or (public.is_org_admin() and public.is_org_member(organization_id))
    )
  )
);

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
for insert to authenticated
with check (
  created_by = auth.uid()
  and public.is_active_user()
  and public.is_org_member(organization_id)
  and (public.is_psychologist() or public.is_org_admin() or public.is_admin())
  and coalesce(owner_user_id, created_by) = auth.uid()
);

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
for update to authenticated
using (
  public.is_admin()
  or (
    public.is_active_user()
    and (
      coalesce(owner_user_id, created_by) = auth.uid()
      or (public.is_org_admin() and public.is_org_member(organization_id))
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_active_user()
    and public.is_org_member(organization_id)
    and (
      coalesce(owner_user_id, created_by) = auth.uid()
      or (public.is_org_admin() and public.is_org_member(organization_id))
    )
  )
);

drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
for delete to authenticated
using (
  public.is_admin()
  or (
    public.is_active_user()
    and (
      coalesce(owner_user_id, created_by) = auth.uid()
      or (public.is_org_admin() and public.is_org_member(organization_id))
    )
  )
);

-- ---------------------------------------------------------------------------
-- 3. Anamnesis — client ownership + client-org
-- ---------------------------------------------------------------------------

drop policy if exists anamneses_select on public.anamneses;
create policy anamneses_select on public.anamneses
for select to authenticated
using (public.can_access_client(client_id));

drop policy if exists anamneses_insert on public.anamneses;
create policy anamneses_insert on public.anamneses
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
);

drop policy if exists anamneses_update on public.anamneses;
create policy anamneses_update on public.anamneses
for update to authenticated
using (public.can_access_client(client_id))
with check (
  public.can_access_client(client_id)
  and exists (
    select 1 from public.clients c
    where c.id = client_id and c.organization_id = organization_id
  )
);

drop policy if exists anamneses_delete on public.anamneses;
create policy anamneses_delete on public.anamneses
for delete to authenticated
using (public.can_access_client(client_id));

-- ---------------------------------------------------------------------------
-- 4. Sessions — client ownership + client-org
-- ---------------------------------------------------------------------------

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
for select to authenticated
using (public.can_access_client(client_id));

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
);

drop policy if exists sessions_update on public.sessions;
create policy sessions_update on public.sessions
for update to authenticated
using (public.can_access_client(client_id))
with check (
  public.can_access_client(client_id)
  and exists (
    select 1 from public.clients c
    where c.id = client_id and c.organization_id = organization_id
  )
);

drop policy if exists sessions_delete on public.sessions;
create policy sessions_delete on public.sessions
for delete to authenticated
using (public.can_access_client(client_id));

-- ---------------------------------------------------------------------------
-- 5. Assessments + Test administrations — client ownership
-- ---------------------------------------------------------------------------

drop policy if exists assessments_select on public.assessments;
create policy assessments_select on public.assessments
for select to authenticated using (public.can_access_client(client_id));

drop policy if exists assessments_insert on public.assessments;
create policy assessments_insert on public.assessments
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id)
  and (public.is_psychologist() or public.is_org_admin() or public.is_admin())
  and exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
  and public.can_access_client(client_id)
);

drop policy if exists assessments_update on public.assessments;
create policy assessments_update on public.assessments
for update to authenticated
using (public.can_access_client(client_id))
with check (
  public.can_access_client(client_id)
  and exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
);

drop policy if exists assessments_delete on public.assessments;
create policy assessments_delete on public.assessments
for delete to authenticated using (public.can_access_client(client_id));

drop policy if exists test_admin_select on public.test_administrations;
create policy test_admin_select on public.test_administrations
for select to authenticated using (public.can_access_client(client_id));

drop policy if exists test_admin_insert on public.test_administrations;
create policy test_admin_insert on public.test_administrations
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id)
  and (public.is_psychologist() or public.is_org_admin() or public.is_admin())
  and exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
  and public.can_access_client(client_id)
);

drop policy if exists test_admin_update on public.test_administrations;
create policy test_admin_update on public.test_administrations
for update to authenticated
using (public.can_access_client(client_id))
with check (
  public.can_access_client(client_id)
  and exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
);

drop policy if exists test_admin_delete on public.test_administrations;
create policy test_admin_delete on public.test_administrations
for delete to authenticated using (public.can_access_client(client_id));

-- ---------------------------------------------------------------------------
-- 6. Test results — parent administration üzerinden sahiplik
-- ---------------------------------------------------------------------------

drop policy if exists test_results_select on public.test_results;
create policy test_results_select on public.test_results
for select to authenticated
using (
  exists (
    select 1 from public.test_administrations ta
    where ta.id = test_administration_id
      and ta.organization_id = organization_id
      and public.can_access_client(ta.client_id)
  )
);

drop policy if exists test_results_insert on public.test_results;
create policy test_results_insert on public.test_results
for insert to authenticated with check (
  public.is_active_user()
  and public.is_org_member(organization_id)
  and (public.is_psychologist() or public.is_org_admin() or public.is_admin())
  and exists (
    select 1 from public.test_administrations ta
    where ta.id = test_administration_id
      and ta.organization_id = organization_id
      and public.can_access_client(ta.client_id)
  )
);

drop policy if exists test_results_update on public.test_results;
create policy test_results_update on public.test_results
for update to authenticated
using (
  exists (
    select 1 from public.test_administrations ta
    where ta.id = test_administration_id
      and ta.organization_id = organization_id
      and public.can_access_client(ta.client_id)
  )
)
with check (
  exists (
    select 1 from public.test_administrations ta
    where ta.id = test_administration_id
      and ta.organization_id = organization_id
      and public.can_access_client(ta.client_id)
  )
);

drop policy if exists test_results_delete on public.test_results;
create policy test_results_delete on public.test_results
for delete to authenticated
using (
  exists (
    select 1 from public.test_administrations ta
    where ta.id = test_administration_id
      and ta.organization_id = organization_id
      and public.can_access_client(ta.client_id)
  )
);

-- ---------------------------------------------------------------------------
-- 7. Reports + report_versions — sahiplik
-- ---------------------------------------------------------------------------

drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
for select to authenticated using (public.can_access_client(client_id));

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id)
  and (public.is_psychologist() or public.is_org_admin() or public.is_admin())
  and exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
  and public.can_access_client(client_id)
  and (
    template_id is null
    or exists (
      select 1 from public.report_templates t
      where t.id = template_id and (t.is_system or t.organization_id = organization_id)
    )
  )
);

drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports
for update to authenticated
using (public.can_access_client(client_id))
with check (
  public.can_access_client(client_id)
  and exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
);

drop policy if exists reports_delete on public.reports;
create policy reports_delete on public.reports
for delete to authenticated using (public.can_access_client(client_id));

drop policy if exists versions_select on public.report_versions;
create policy versions_select on public.report_versions
for select to authenticated
using (
  exists (
    select 1 from public.reports r
    where r.id = report_id and public.can_access_client(r.client_id)
  )
);

-- ---------------------------------------------------------------------------
-- 8. Documents + Notes — sahiplik
-- ---------------------------------------------------------------------------

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
for select to authenticated using (public.can_access_client(client_id));

drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id)
  and (public.is_psychologist() or public.is_org_admin() or public.is_admin())
  and exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
  and public.can_access_client(client_id)
);

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
for update to authenticated
using (public.can_access_client(client_id))
with check (
  public.can_access_client(client_id)
  and exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
);

drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents
for delete to authenticated using (public.can_access_client(client_id));

drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes
for select to authenticated using (public.can_access_client(client_id));

drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id)
  and (public.is_psychologist() or public.is_org_admin() or public.is_admin())
  and exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
  and public.can_access_client(client_id)
);

drop policy if exists notes_update on public.notes;
create policy notes_update on public.notes
for update to authenticated
using (public.can_access_client(client_id))
with check (
  public.can_access_client(client_id)
  and exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
);

drop policy if exists notes_delete on public.notes;
create policy notes_delete on public.notes
for delete to authenticated using (public.can_access_client(client_id));

-- ---------------------------------------------------------------------------
-- 9. Appointments + Tasks — client bağlıysa sahiplik, bağlı değilse kişisel
-- ---------------------------------------------------------------------------

drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments
for select to authenticated
using (
  public.is_admin()
  or (
    public.is_active_user()
    and public.is_org_member(organization_id)
    and (
      (client_id is not null and public.can_access_client(client_id))
      or coalesce(owner_user_id, created_by) = auth.uid()
      or public.is_org_admin()
    )
  )
);

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id)
  and (public.is_psychologist() or public.is_org_admin() or public.is_admin())
  and (client_id is null or exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id))
  and (client_id is null or public.can_access_client(client_id))
);

drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments
for update to authenticated
using (
  public.is_admin()
  or (
    public.is_active_user()
    and public.is_org_member(organization_id)
    and (
      (client_id is not null and public.can_access_client(client_id))
      or coalesce(owner_user_id, created_by) = auth.uid()
      or public.is_org_admin()
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_active_user()
    and public.is_org_member(organization_id)
    and (client_id is null or exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id))
    and (
      (client_id is not null and public.can_access_client(client_id))
      or coalesce(owner_user_id, created_by) = auth.uid()
      or public.is_org_admin()
    )
  )
);

drop policy if exists appointments_delete on public.appointments;
create policy appointments_delete on public.appointments
for delete to authenticated
using (
  public.is_admin()
  or (
    public.is_active_user()
    and public.is_org_member(organization_id)
    and (
      (client_id is not null and public.can_access_client(client_id))
      or coalesce(owner_user_id, created_by) = auth.uid()
      or public.is_org_admin()
    )
  )
);

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
for select to authenticated
using (
  public.is_admin()
  or (
    public.is_active_user()
    and public.is_org_member(organization_id)
    and (
      (client_id is not null and public.can_access_client(client_id))
      or created_by = auth.uid()
      or assigned_to = auth.uid()
      or public.is_org_admin()
    )
  )
);

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id)
  and (public.is_psychologist() or public.is_org_admin() or public.is_admin())
  and (client_id is null or exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id))
  and (client_id is null or public.can_access_client(client_id))
);

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
for update to authenticated
using (
  public.is_admin()
  or (
    public.is_active_user()
    and public.is_org_member(organization_id)
    and (
      (client_id is not null and public.can_access_client(client_id))
      or created_by = auth.uid()
      or assigned_to = auth.uid()
      or public.is_org_admin()
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_active_user()
    and public.is_org_member(organization_id)
    and (client_id is null or exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id))
  )
);

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
for delete to authenticated
using (
  public.is_admin()
  or (
    public.is_active_user()
    and public.is_org_member(organization_id)
    and (
      (client_id is not null and public.can_access_client(client_id))
      or created_by = auth.uid()
      or public.is_org_admin()
    )
  )
);

-- ---------------------------------------------------------------------------
-- 10. psychologist_settings — yalnız kendi kaydı (admin istisnası)
-- ---------------------------------------------------------------------------

drop policy if exists settings_select on public.psychologist_settings;
create policy settings_select on public.psychologist_settings
for select to authenticated
using (created_by = auth.uid() or public.is_admin());

drop policy if exists settings_write on public.psychologist_settings;
create policy settings_write on public.psychologist_settings
for all to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (
  (created_by = auth.uid() or public.is_admin())
  and public.is_active_user()
);

-- ---------------------------------------------------------------------------
-- 11. profiles_insert_self — keyfî organization_id atanamaz
-- ---------------------------------------------------------------------------

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (
  id = auth.uid()
  and role = 'PSYCHOLOG'
  and active = true
  and organization_id is null
);

-- ---------------------------------------------------------------------------
-- 12. Storage — org öneki + client ownership
-- ---------------------------------------------------------------------------

drop policy if exists "client_docs_select" on storage.objects;
create policy "client_docs_select" on storage.objects
for select to authenticated using (
  bucket_id = 'client-documents' and
  public.is_active_user() and (
    public.is_admin() or (
      public.is_org_member(public.safe_uuid((storage.foldername(name))[1]))
      and public.can_access_client(public.safe_uuid((storage.foldername(name))[2]))
    )
  )
);

drop policy if exists "client_docs_insert" on storage.objects;
create policy "client_docs_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'client-documents' and
  public.is_active_user() and
  (storage.foldername(name))[2] is not null and
  (
    public.is_admin() or (
      public.is_org_member(public.safe_uuid((storage.foldername(name))[1]))
      and public.can_access_client(public.safe_uuid((storage.foldername(name))[2]))
    )
  )
);

drop policy if exists "client_docs_update" on storage.objects;
create policy "client_docs_update" on storage.objects
for update to authenticated using (
  bucket_id = 'client-documents' and public.is_active_user() and (
    public.is_admin() or (
      public.is_org_member(public.safe_uuid((storage.foldername(name))[1]))
      and public.can_access_client(public.safe_uuid((storage.foldername(name))[2]))
    )
  )
) with check (
  bucket_id = 'client-documents' and public.is_active_user() and (
    public.is_admin() or (
      public.is_org_member(public.safe_uuid((storage.foldername(name))[1]))
      and public.can_access_client(public.safe_uuid((storage.foldername(name))[2]))
    )
  )
);

drop policy if exists "client_docs_delete" on storage.objects;
create policy "client_docs_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'client-documents' and public.is_active_user() and (
    public.is_admin() or (
      public.is_org_member(public.safe_uuid((storage.foldername(name))[1]))
      and public.can_access_client(public.safe_uuid((storage.foldername(name))[2]))
    )
  )
);
