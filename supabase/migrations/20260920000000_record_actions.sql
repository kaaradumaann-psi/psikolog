-- Repair the record action surface used by the browser client.
--
-- The previous migrations intentionally made the clinical payload immutable, but
-- they left UPDATE restricted to the record owner. That is incompatible with the
-- review workflow: an Admin must be able to append a specialist note, and both
-- roles must be able to remove a record from the management screens. The trigger
-- from 20260919020000 still prevents either role from changing the clinical
-- intake/raw answers; this policy only opens the two explicitly supported actions.

-- Keep this migration safe when an installation skipped the notes migration. The
-- detail reader is tolerant of old rows, but a real note cannot be saved without
-- these columns.
alter table public.mmpi_records
  add column if not exists expert_notes text not null default '',
  add column if not exists notes_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.mmpi_records'::regclass
      and conname = 'mmpi_records_expert_notes_length'
  ) then
    alter table public.mmpi_records
      add constraint mmpi_records_expert_notes_length
      check (char_length(expert_notes) <= 4000);
  end if;
end
$$;

-- Admins may update notes on every visible record. Active psychologists may
-- update notes only on records they created. The immutable-field trigger makes
-- this a notes-only capability even for Admins.
drop policy if exists mmpi_records_update on public.mmpi_records;
create policy mmpi_records_update on public.mmpi_records
for update to authenticated
using (
  public.is_admin() or
  (created_by = auth.uid() and public.is_psychologist())
)
with check (
  public.is_admin() or
  (created_by = auth.uid() and public.is_psychologist())
);

-- Keep deletion available to the same two roles. Admins can remove any record;
-- an active psychologist can remove only their own record.
drop policy if exists mmpi_records_delete on public.mmpi_records;
create policy mmpi_records_delete on public.mmpi_records
for delete to authenticated
using (
  public.is_admin() or
  (created_by = auth.uid() and public.is_psychologist())
);

grant select, update, delete on public.mmpi_records to authenticated;
grant update (expert_notes, notes_updated_at) on public.mmpi_records to authenticated;
