-- Production data-integrity hardening for records created by the browser client.
-- The constraints are NOT VALID so an existing installation is not made unavailable by
-- legacy rows; every new INSERT/UPDATE is checked immediately. Existing data can be
-- cleaned and validated separately during deployment.

-- Browser clients must never mutate profiles directly. Account lifecycle changes go through
-- the service-role Edge Function, which deletes Auth first and lets the FK cascade cleanly.
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;

create or replace function public.is_psychologist()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'PSYCHOLOG' and active = true
  );
$$;
revoke all on function public.is_psychologist() from public;
grant execute on function public.is_psychologist() to authenticated;

-- Keep direct REST writes aligned with the browser business rule: only an active
-- psychologist may create records/update their own clinical record. The later
-- record-actions migration additionally permits Admin notes without permitting
-- clinical fields to change.
drop policy if exists mmpi_records_insert on public.mmpi_records;
create policy mmpi_records_insert on public.mmpi_records
for insert to authenticated
with check (created_by = auth.uid() and public.is_psychologist());

drop policy if exists mmpi_records_update on public.mmpi_records;
create policy mmpi_records_update on public.mmpi_records
for update to authenticated
using (created_by = auth.uid() and public.is_psychologist())
with check (created_by = auth.uid() and public.is_psychologist());

drop policy if exists mmpi_records_delete on public.mmpi_records;
create policy mmpi_records_delete on public.mmpi_records
for delete to authenticated
using (public.is_admin() or (created_by = auth.uid() and public.is_psychologist()));

alter table public.mmpi_records
  drop constraint if exists mmpi_records_age_check;
alter table public.mmpi_records
  add constraint mmpi_records_age_check
  check (age between 16 and 120) not valid;

alter table public.mmpi_records
  drop constraint if exists mmpi_records_raw_payload_size;
alter table public.mmpi_records
  add constraint mmpi_records_raw_payload_size
  check (octet_length(raw_omr_answers::text) <= 8388608) not valid;
