-- ===========================================================================
-- P0.5 — Storage object isolation aligned with table-level isolation
--
-- Finding (measured in tests/cloudIsolation.test.ts against the real
-- migrations): after P0 tightened every clinical table's SELECT policy to
-- `created_by = auth.uid()`, `storage.objects` was the last surface still
-- scoped to ORGANIZATION membership only
-- (`is_org_member((storage.foldername(name))[1])`).
--
-- Consequence: if two psychologists ever share a `profiles.organization_id`,
-- the second one cannot read the first one's `documents` row but CAN read,
-- tamper with and DELETE the first one's document binary in the
-- `client-documents` bucket. Because the metadata row stays hidden, the loss
-- would be invisible in the UI, leaving a dangling `file_path`.
--
-- Not reachable through the app today — `ensure_personal_organization()` gives
-- every psychologist their own organization — but the schema fully supports
-- multi-member organizations and an ADMIN can assign `organization_id`.
--
-- Fix: the exact shape P0 §6 applied to the tables, with the organization taken
-- from the object path and `owner` in place of `created_by`:
--
--   is_admin()
--   OR (is_org_admin() AND is_org_member(path_org))
--   OR (is_org_member(path_org) AND owner = auth.uid())
--
-- `storage.objects.owner` is set by Supabase Storage to the authenticated user
-- on upload. Keeping `is_org_member(path_org)` on every branch — including
-- INSERT — matters: dropping it in favour of a bare `owner = auth.uid()` lets a
-- user plant an object inside someone else's tenant path (that regression was
-- caught by tests/cloudIsolation.test.ts while writing this migration).
--
-- Preserved: the bucket stays private, policies stay on `storage.objects`, no
-- policy is dropped without replacement, no table or data is touched.
-- ===========================================================================

drop policy if exists "client_docs_select" on storage.objects;
create policy "client_docs_select" on storage.objects
for select to authenticated using (
  bucket_id = 'client-documents' and
  public.is_active_user() and (
    public.is_admin() or
    (public.is_org_admin() and public.is_org_member(((storage.foldername(name))[1])::uuid)) or
    (public.is_org_member(((storage.foldername(name))[1])::uuid) and owner = auth.uid())
  )
);

drop policy if exists "client_docs_insert" on storage.objects;
create policy "client_docs_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'client-documents' and
  public.is_active_user() and (
    public.is_admin() or
    (public.is_org_admin() and public.is_org_member(((storage.foldername(name))[1])::uuid)) or
    (public.is_org_member(((storage.foldername(name))[1])::uuid) and owner = auth.uid())
  ) and
  (storage.foldername(name))[2] is not null
);

drop policy if exists "client_docs_update" on storage.objects;
create policy "client_docs_update" on storage.objects
for update to authenticated using (
  bucket_id = 'client-documents' and
  public.is_active_user() and (
    public.is_admin() or
    (public.is_org_admin() and public.is_org_member(((storage.foldername(name))[1])::uuid)) or
    (public.is_org_member(((storage.foldername(name))[1])::uuid) and owner = auth.uid())
  )
) with check (
  bucket_id = 'client-documents' and
  public.is_active_user() and (
    public.is_admin() or
    (public.is_org_admin() and public.is_org_member(((storage.foldername(name))[1])::uuid)) or
    (public.is_org_member(((storage.foldername(name))[1])::uuid) and owner = auth.uid())
  )
);

drop policy if exists "client_docs_delete" on storage.objects;
create policy "client_docs_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'client-documents' and
  public.is_active_user() and (
    public.is_admin() or
    (public.is_org_admin() and public.is_org_member(((storage.foldername(name))[1])::uuid)) or
    (public.is_org_member(((storage.foldername(name))[1])::uuid) and owner = auth.uid())
  )
);
