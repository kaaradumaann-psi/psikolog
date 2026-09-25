-- Production audit: legacy/admin-created links must never expose another
-- psychologist's client metadata through appointment/task owner shortcuts.
-- Non-destructive policy tightening only. Existing rows are not changed.
-- RLS on clients also restricts UPDATE's FK existence check; we state the
-- ownership requirement explicitly for every read/write/delete path.

alter policy appointments_select on public.appointments using (
  public.is_admin()
  or (
    public.is_active_user() and public.is_org_member(organization_id)
    and (client_id is null or public.can_access_client(client_id))
    and (
      (client_id is not null and public.can_access_client(client_id))
      or coalesce(owner_user_id, created_by) = auth.uid()
      or public.is_org_admin()
    )
  )
);

alter policy appointments_update on public.appointments
using (
  public.is_admin()
  or (
    public.is_active_user() and public.is_org_member(organization_id)
    and (client_id is null or public.can_access_client(client_id))
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
    public.is_active_user() and public.is_org_member(organization_id)
    and (client_id is null or exists (
      select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id
    ))
    and (client_id is null or public.can_access_client(client_id))
    and (
      (client_id is not null and public.can_access_client(client_id))
      or coalesce(owner_user_id, created_by) = auth.uid()
      or public.is_org_admin()
    )
  )
);

alter policy appointments_delete on public.appointments using (
  public.is_admin()
  or (
    public.is_active_user() and public.is_org_member(organization_id)
    and (client_id is null or public.can_access_client(client_id))
    and (
      (client_id is not null and public.can_access_client(client_id))
      or coalesce(owner_user_id, created_by) = auth.uid()
      or public.is_org_admin()
    )
  )
);

alter policy tasks_select on public.tasks using (
  public.is_admin()
  or (
    public.is_active_user() and public.is_org_member(organization_id)
    and (client_id is null or public.can_access_client(client_id))
    and (
      (client_id is not null and public.can_access_client(client_id))
      or created_by = auth.uid()
      or assigned_to = auth.uid()
      or public.is_org_admin()
    )
  )
);

alter policy tasks_update on public.tasks
using (
  public.is_admin()
  or (
    public.is_active_user() and public.is_org_member(organization_id)
    and (client_id is null or public.can_access_client(client_id))
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
    public.is_active_user() and public.is_org_member(organization_id)
    and (client_id is null or exists (
      select 1 from public.clients c where c.id = client_id and c.organization_id = organization_id
    ))
    and (client_id is null or public.can_access_client(client_id))
  )
);

alter policy tasks_delete on public.tasks using (
  public.is_admin()
  or (
    public.is_active_user() and public.is_org_member(organization_id)
    and (client_id is null or public.can_access_client(client_id))
    and (
      (client_id is not null and public.can_access_client(client_id))
      or created_by = auth.uid()
      or public.is_org_admin()
    )
  )
);
