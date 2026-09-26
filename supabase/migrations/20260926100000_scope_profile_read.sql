-- An ordinary psychologist needs only their own profile. The previous
-- profiles_select policy also allowed every member to list their co-workers'
-- emails and account metadata. Org admins still need their own organization's
-- accounts to create/manage staff; platform ADMIN remains global.
-- Tightens SELECT only; no clinical row is deleted or rewritten.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or (
    public.is_org_admin()
    and organization_id is not null
    and organization_id = public.my_organization_id()
  )
);
