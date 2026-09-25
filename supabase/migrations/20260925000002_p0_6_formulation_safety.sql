-- ===========================================================================
-- P0.6 — Vaka formülasyonu ve güvenlik planı kalıcılığı
--
-- P0.5 bulgusu: FormulationPanel.tsx saveFormulation()/saveSafetyPlan()
-- çağırıyordu ve bu iki kayıt için tablo yoktu. Tek kalıcı kopya
-- psikolog_formulations_v2 / psikolog_safety_v2 localStorage anahtarlarıydı;
-- cihaz değişimi veya tarayıcı temizliğinde kayboluyordu. Güvenlik planı risk
-- altındaki danışan için başvurulan belge olduğu için bulgu P0 sayıldı.
--
-- Bu migration iki tabloyu mevcut convention ile ekler:
--   * id / client_id / organization_id / created_by / created_at / updated_at
--   * clients(id) ON DELETE CASCADE — diğer tüm klinik tablolarla aynı
--   * set_updated_at() + log_audit_change() trigger'ları
--   * P0 §6'daki SELECT şekli: is_admin()
--       OR (is_org_admin() AND is_org_member(organization_id))
--       OR (is_org_member(organization_id) AND created_by = auth.uid())
--     yani aynı kurumdaki başka psikolog okuyamaz; gevşek is_org_member() yok.
--   * preserve_created_by() — sahiplik upsert ile devredilemez
--
-- Hiçbir mevcut tablo, politika veya veri değiştirilmez. 20260925000001
-- (storage object isolation) dosyasına dokunulmaz.
--
-- Model notu: uygulama tarafında formülasyon ve güvenlik planı danışan başına
-- TEK kayıt (clientId ile anahtarlı). Bu yüzden her iki tabloda da
-- unique (client_id) var; satır id'si uygulama tarafında
-- deriveUuid('formulation'|'safety_plan', client_id) ile deterministik
-- üretilir, böylece tekrar gönderim yeni satır yaratmaz (VERİ KAYBI YOK /
-- duplicate yok).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Tablolar
-- ---------------------------------------------------------------------------
create table if not exists public.formulations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  modality text check (char_length(modality) <= 200),
  predisposing text check (char_length(predisposing) <= 4000),
  precipitating text check (char_length(precipitating) <= 4000),
  perpetuating text check (char_length(perpetuating) <= 4000),
  protective text check (char_length(protective) <= 4000),
  goals jsonb not null default '[]'::jsonb
    check (jsonb_typeof(goals) = 'array' and octet_length(goals::text) <= 262144),
  review_date date,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  -- Danışan başına tek formülasyon: tekrar gönderim duplicate üretmez.
  constraint formulations_client_key unique (client_id)
);

create index if not exists formulations_org_idx on public.formulations (organization_id);
create index if not exists formulations_org_created_by_idx on public.formulations (organization_id, created_by);

create table if not exists public.safety_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  warning_signs text check (char_length(warning_signs) <= 4000),
  coping text check (char_length(coping) <= 4000),
  people text check (char_length(people) <= 4000),
  professionals text check (char_length(professionals) <= 4000),
  environment text check (char_length(environment) <= 4000),
  reasons text check (char_length(reasons) <= 4000),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint safety_plans_client_key unique (client_id)
);

create index if not exists safety_plans_org_idx on public.safety_plans (organization_id);
create index if not exists safety_plans_org_created_by_idx on public.safety_plans (organization_id, created_by);

-- ---------------------------------------------------------------------------
-- 2. updated_at trigger'ları (mevcut set_updated_at ile aynı convention)
-- ---------------------------------------------------------------------------
drop trigger if exists formulations_set_updated_at on public.formulations;
create trigger formulations_set_updated_at
before update on public.formulations
for each row execute function public.set_updated_at();

drop trigger if exists safety_plans_set_updated_at on public.safety_plans;
create trigger safety_plans_set_updated_at
before update on public.safety_plans
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Audit log — action listesi genişletilir, append-only kalır.
--    log_audit_change() action'ı "<tablo>_<op>" olarak üretir.
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
  'template_insert', 'template_update', 'template_delete',
  'document_insert', 'document_update', 'document_delete',
  'note_insert', 'note_update', 'note_delete',
  'appointment_insert', 'appointment_update', 'appointment_delete',
  'task_insert', 'task_update', 'task_delete',
  'formulations_insert', 'formulations_update', 'formulations_delete',
  'safety_plans_insert', 'safety_plans_update', 'safety_plans_delete'
));

drop trigger if exists formulations_audit on public.formulations;
create trigger formulations_audit
after insert or update or delete on public.formulations
for each row execute function public.log_audit_change();

drop trigger if exists safety_plans_audit on public.safety_plans;
create trigger safety_plans_audit
after insert or update or delete on public.safety_plans
for each row execute function public.log_audit_change();

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
alter table public.formulations enable row level security;
alter table public.safety_plans enable row level security;

-- SELECT: P0 §6 ile birebir aynı şekil. Aynı kurumdaki başka psikolog okuyamaz.
drop policy if exists formulations_select on public.formulations;
create policy formulations_select on public.formulations
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_admin() and public.is_org_member(organization_id))
  or (public.is_org_member(organization_id) and created_by = auth.uid())
);

drop policy if exists safety_plans_select on public.safety_plans;
create policy safety_plans_select on public.safety_plans
for select to authenticated
using (
  public.is_admin()
  or (public.is_org_admin() and public.is_org_member(organization_id))
  or (public.is_org_member(organization_id) and created_by = auth.uid())
);

-- INSERT: notes/documents ile aynı — sahibi çağıran olmalı, kurum üyesi olmalı
-- ve danışan aynı kuruma ait olmalı.
drop policy if exists formulations_insert on public.formulations;
create policy formulations_insert on public.formulations
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id) and
  (public.is_psychologist() or public.is_org_admin() or public.is_admin()) and
  exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
);

drop policy if exists safety_plans_insert on public.safety_plans;
create policy safety_plans_insert on public.safety_plans
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id) and
  (public.is_psychologist() or public.is_org_admin() or public.is_admin()) and
  exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
);

-- UPDATE / DELETE: sahip (veya admin / kendi kurumunun org_admin'i).
drop policy if exists formulations_update on public.formulations;
create policy formulations_update on public.formulations
for update to authenticated
using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())))
with check (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

drop policy if exists safety_plans_update on public.safety_plans;
create policy safety_plans_update on public.safety_plans
for update to authenticated
using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())))
with check (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

drop policy if exists formulations_delete on public.formulations;
create policy formulations_delete on public.formulations
for delete to authenticated
using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

drop policy if exists safety_plans_delete on public.safety_plans;
create policy safety_plans_delete on public.safety_plans
for delete to authenticated
using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

-- ---------------------------------------------------------------------------
-- 5. preserve_created_by — sahiplik upsert ile devredilemez (P0 §7 ile aynı)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['formulations','safety_plans']
  loop
    execute format('drop trigger if exists %1$s_preserve_created_by on public.%1$I', t);
    execute format('create trigger %1$s_preserve_created_by before update on public.%1$I
                    for each row execute function public.preserve_created_by()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. İstemci yetkileri — mevcut klinik tablolarla aynı, service_role yok.
-- ---------------------------------------------------------------------------
revoke all on public.formulations from anon;
revoke all on public.safety_plans from anon;
grant select, insert, update, delete on public.formulations to authenticated;
grant select, insert, update, delete on public.safety_plans to authenticated;
