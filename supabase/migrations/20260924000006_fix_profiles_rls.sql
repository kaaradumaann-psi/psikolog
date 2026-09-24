-- PHASE-09/12 fix: profiles RLS 400 error, backfill missing profiles
-- NOTE: storage schema creation removed for Supabase Cloud (permission denied) — storage.buckets already exists via 20260924000004

-- Backfill missing profiles from auth.users (handles trigger failure or pre-trigger users)
insert into public.profiles (id, email, first_name, last_name, role, active)
select
  u.id,
  u.email,
  coalesce(nullif(u.raw_user_meta_data ->> 'first_name', ''), 'Yeni'),
  coalesce(nullif(u.raw_user_meta_data ->> 'last_name', ''), 'Kullanıcı'),
  'PSYCHOLOG',
  true
from auth.users as u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Fix profiles_select: simplify, avoid my_organization_id() recursion edge, allow own row always
-- Handle null organization_id safely
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  auth.uid() = id
  or public.is_admin()
  or (organization_id is not null and public.is_org_member(organization_id))
  or (public.is_org_admin() and organization_id is not null and organization_id = public.my_organization_id())
);

-- Allow authenticated users to insert their own profile if missing (self-healing)
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (
  id = auth.uid()
  and role = 'PSYCHOLOG'
  and active = true
);

-- Ensure grants
grant select, insert on public.profiles to authenticated;

-- Ensure audit_logs check includes all actions
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
