-- PHASE-13: klinik içerik tablolarında hekim-kapsamı izolasyon (yalnızca sıkılaştırma)
--
-- Gerekçe: 000001-000005'de *_select politikaları "organizasyon üyesi her hesap" biçimindeydi.
-- Yani aynı kurumdaki bir psikolog, başka bir hekime ait anamnez / seans notu / test sonucu /
-- not / belge satırlarını okuyabiliyordu. Ürün modeli tek hekimli muayenehanedir: seans notu
-- yazarı "bu dosya yalnızca bana ait" der. Bu göç yalnızca erişimi DARALTIR; hiçbir politikayı
-- gevşetmez ve RLS'i kapatmaz.
--
-- KASITLI OLARAK DEĞİŞTİRİLMEDİ:
--  * clients_select: kurumsal kimlik kaydı (dosya no, ad, doğum tarihi) org içinde görünür kalır —
--    resepsiyon/takvim/atanmış görev akışları buna dayanır. İçerik tabloları kilitlenir.
--  * appointments_select / tasks_select: planlama meta verisi org içinde paylaşılır (mesai takvimi).
--  * audit_logs: tasarım gereği istemciden yazılamaz ve yalnızca yönetici/org-admin okur.

-- ---------------------------------------------------------------------------
-- 1) İçerik okuma politikaları: satırı yazan hekim veya kurum yöneticisi (yaşı platform yöneticisi)
-- ---------------------------------------------------------------------------

drop policy if exists anamneses_select on public.anamneses;
create policy anamneses_select on public.anamneses
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin()))
);

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin()))
);

drop policy if exists assessments_select on public.assessments;
create policy assessments_select on public.assessments
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin()))
);

drop policy if exists test_admin_select on public.test_administrations;
create policy test_admin_select on public.test_administrations
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin()))
);

-- test_results'ta created_by kolonu yoktur; sahiplik üst kaydından (test_administrations) gelir.
create or replace function public.owns_test_administration(p_administration_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.test_administrations as ta
    where ta.id = p_administration_id
      and (ta.created_by = auth.uid() or public.is_org_admin())
  );
$$;

revoke all on function public.owns_test_administration(uuid) from public;
grant execute on function public.owns_test_administration(uuid) to authenticated;

drop policy if exists test_results_select on public.test_results;
create policy test_results_select on public.test_results
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_member(organization_id) and public.owns_test_administration(test_administration_id))
);

-- Ölçek sonucu kurum arkadaşı tarafından silinememeli/değiştirilememeli.
drop policy if exists test_results_update on public.test_results;
create policy test_results_update on public.test_results
for update to authenticated
using (
  public.is_admin()
  or (public.is_org_member(organization_id) and public.owns_test_administration(test_administration_id))
)
with check (
  public.is_admin()
  or (public.is_org_member(organization_id) and public.owns_test_administration(test_administration_id))
);

drop policy if exists test_results_delete on public.test_results;
create policy test_results_delete on public.test_results
for delete to authenticated
using (
  public.is_admin()
  or (public.is_org_member(organization_id) and public.owns_test_administration(test_administration_id))
);

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin()))
);

drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin()))
);

-- Psikolog ayarları (ücret, randevu varsayılanları, imza metni) kişiseldir.
drop policy if exists settings_select on public.psychologist_settings;
create policy settings_select on public.psychologist_settings
for select to authenticated
using (
  public.is_admin()
  or created_by = auth.uid()
  or (public.is_org_member(organization_id) and public.is_org_admin())
);

-- ---------------------------------------------------------------------------
-- 2) Depolama kovusu: klasörün İKİNCİ parçası (danışan) de doğrulanmalı.
--    Eskiden yalnızca <org_id> kontrol ediliyordu; kurum üyesi herhangi bir hesap
--    <org>/<baska_danisan>/dosya.pdf yolunu okuyabiliyordu.
-- ---------------------------------------------------------------------------

create or replace function public.can_read_client_folder(p_bucket text, p_path text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_bucket = 'client-documents'
    and public.is_active_user()
    and (
      public.is_admin()
      or exists (
        select 1
        from public.clients as c
        where c.id = nullif((string_to_array(p_path, '/'))[2], '')::uuid
          and public.is_org_member(c.organization_id)
          and (c.created_by = auth.uid() or public.is_org_admin())
      )
    );
$$;

revoke all on function public.can_read_client_folder(text, text) from public;
grant execute on function public.can_read_client_folder(text, text) to authenticated;

-- storage.objects'de RLS'i göç içinde de açık ilan et (Supabase bunu varsayılan olarak açar;
-- kendi Postgres'inde kapalıysa yukarıdaki/şağıdaki politikalar hiç uygulanmazdı).
alter table storage.objects enable row level security;

drop policy if exists "client_docs_insert" on storage.objects;
create policy "client_docs_insert" on storage.objects
for insert to authenticated
with check (
  public.can_read_client_folder(bucket_id, name)
  and (storage.foldername(name))[2] is not null
);

drop policy if exists "client_docs_select" on storage.objects;
create policy "client_docs_select" on storage.objects
for select to authenticated
using (public.can_read_client_folder(bucket_id, name));

drop policy if exists "client_docs_update" on storage.objects;
create policy "client_docs_update" on storage.objects
for update to authenticated
using (public.can_read_client_folder(bucket_id, name))
with check (public.can_read_client_folder(bucket_id, name));

drop policy if exists "client_docs_delete" on storage.objects;
create policy "client_docs_delete" on storage.objects
for delete to authenticated
using (public.can_read_client_folder(bucket_id, name));

-- ---------------------------------------------------------------------------
-- 3) Tamamlanmış rapor değişmezliği: status = 'completed' olan raporu ne yazan
--    ne kurum yöneticisi tarafından sessizce değiştiremez/silemez. Yalnız platform
--    yöneticisi (is_admin) düzeltme yapabilir; o da önce sürümü loga yazar.
--    Bu, eksik olan "kilit/imza/revizyon" akışının veritabanındaki asgari korumasıdır.
-- ---------------------------------------------------------------------------

create or replace function public.guard_report_finalization()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return coalesce(new, old);
  end if;
  if old.status = 'completed' then
    raise exception 'Rapor "tamamlandı" olarak işaretlenmiş; içeriği yalnızca platform yöneticisi değiştirebilir veya silebilir.'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists reports_finalization_guard on public.reports;
create trigger reports_finalization_guard
before update or delete on public.reports
for each row execute function public.guard_report_finalization();

grant usage on schema public to authenticated;
