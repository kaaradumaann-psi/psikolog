-- A client DELETE cascades public.documents, but cannot cascade Supabase
-- Storage objects. Storage RLS requires a live client: deleting the client
-- first would strand private clinical files with no usable owner path.
-- Fail closed until the objects have been removed through the Storage API.
-- Does not delete existing clinical rows or loosen any RLS policy.
create or replace function public.prevent_client_storage_orphans()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from storage.objects
    where bucket_id = 'client-documents'
      and name like old.organization_id::text || '/' || old.id::text || '/%'
  ) then
    raise exception 'Danışana ait belgeler sunucuda duruyor. Önce belgeleri silin ve eşitlemeyi bekleyin.'
      using errcode = '23503';
  end if;
  return old;
end;
$$;

-- Trigger execution does not require clients to invoke the function directly.
revoke all on function public.prevent_client_storage_orphans() from public, anon, authenticated;
drop trigger if exists clients_prevent_storage_orphans on public.clients;
create trigger clients_prevent_storage_orphans
before delete on public.clients
for each row execute function public.prevent_client_storage_orphans();
