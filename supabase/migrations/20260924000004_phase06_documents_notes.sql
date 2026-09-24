-- PHASE-06: Documents (PRIVATE BUCKET) + Notes

-- ---------------------------------------------------------------------------
-- Storage bucket private
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-documents',
  'client-documents',
  false,
  52428800,
  array['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'];

-- Storage policies — tenant isolation via foldername: <org_id>/<client_id>/...
-- Requires storage.foldername(name) returns text[]
drop policy if exists "client_docs_select" on storage.objects;
create policy "client_docs_select" on storage.objects
for select to authenticated using (
  bucket_id = 'client-documents' and
  public.is_active_user() and (
    public.is_admin() or
    public.is_org_member(((storage.foldername(name))[1])::uuid)
  )
);

drop policy if exists "client_docs_insert" on storage.objects;
create policy "client_docs_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'client-documents' and
  public.is_active_user() and (
    public.is_admin() or
    public.is_org_member(((storage.foldername(name))[1])::uuid)
  ) and
  (storage.foldername(name))[2] is not null
);

drop policy if exists "client_docs_update" on storage.objects;
create policy "client_docs_update" on storage.objects
for update to authenticated using (
  bucket_id = 'client-documents' and public.is_active_user() and (public.is_admin() or public.is_org_member(((storage.foldername(name))[1])::uuid))
) with check (
  bucket_id = 'client-documents' and public.is_active_user() and (public.is_admin() or public.is_org_member(((storage.foldername(name))[1])::uuid))
);

drop policy if exists "client_docs_delete" on storage.objects;
create policy "client_docs_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'client-documents' and public.is_active_user() and (public.is_admin() or public.is_org_member(((storage.foldername(name))[1])::uuid))
);

-- ---------------------------------------------------------------------------
-- Documents table
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  file_path text not null check (char_length(file_path) between 1 and 1024),
  file_name text not null check (char_length(btrim(file_name)) between 1 and 255),
  mime_type text not null check (char_length(mime_type) between 1 and 127),
  size_bytes integer not null check (size_bytes >= 0 and size_bytes <= 52428800),
  description text check (char_length(description) <= 1000),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists documents_client_idx on public.documents (client_id, created_at desc);
create index if not exists documents_org_idx on public.documents (organization_id);
create index if not exists documents_created_by_idx on public.documents (created_by);

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Notes table
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 8000),
  is_pinned boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists notes_client_pinned_idx on public.notes (client_id, is_pinned desc, created_at desc);
create index if not exists notes_org_idx on public.notes (organization_id);

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

-- Extend audit_logs check for documents/notes
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

-- Audit triggers
drop trigger if exists documents_audit on public.documents;
create trigger documents_audit
after insert or update or delete on public.documents
for each row execute function public.log_audit_change();

drop trigger if exists notes_audit on public.notes;
create trigger notes_audit
after insert or update or delete on public.notes
for each row execute function public.log_audit_change();

-- RLS
alter table public.documents enable row level security;
alter table public.notes enable row level security;

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
for select to authenticated using (public.is_admin() or public.is_org_member(organization_id));

drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id) and
  (public.is_psychologist() or public.is_org_admin() or public.is_admin()) and
  exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
);

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
for update to authenticated using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())))
with check (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents
for delete to authenticated using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes
for select to authenticated using (public.is_admin() or public.is_org_member(organization_id));

drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes
for insert to authenticated with check (
  created_by = auth.uid() and public.is_active_user() and public.is_org_member(organization_id) and
  (public.is_psychologist() or public.is_org_admin() or public.is_admin()) and
  exists (select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id)
);

drop policy if exists notes_update on public.notes;
create policy notes_update on public.notes
for update to authenticated using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())))
with check (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

drop policy if exists notes_delete on public.notes;
create policy notes_delete on public.notes
for delete to authenticated using (public.is_admin() or (public.is_org_member(organization_id) and (created_by = auth.uid() or public.is_org_admin())));

revoke all on public.documents from anon;
revoke all on public.notes from anon;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
