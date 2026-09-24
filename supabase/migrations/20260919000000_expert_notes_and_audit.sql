-- B4: Kayıt sonrası uzman notu (rapora aktarılır).
-- B8: Sunucu taraflı denetim izi (audit_logs) — istemci atlayamaz, trigger yazar.

-- ---------------------------------------------------------------------------
-- 1. Uzman notu kolonu
-- ---------------------------------------------------------------------------
-- Not Admin tarafından tüm görünür kayıtlarda, kaydı oluşturan aktif
-- psikolog tarafından ise kendi kaydında güncellenebilir. Son yetki politikası
-- 20260920000000 migration'ında bu iş akışına göre kesinleştirilir.
alter table public.mmpi_records
  add column if not exists expert_notes text not null default '',
  add column if not exists notes_updated_at timestamptz;

alter table public.mmpi_records
  drop constraint if exists mmpi_records_expert_notes_length;
alter table public.mmpi_records
  add constraint mmpi_records_expert_notes_length check (char_length(expert_notes) <= 4000);

-- ---------------------------------------------------------------------------
-- 2. Denetim izi tablosu
-- ---------------------------------------------------------------------------
-- Kişisel veri taşımaz: yalnızca aktör, eylem, hedef tablo/satır ve zaman.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor uuid,
  action text not null check (action in ('record_insert', 'record_update', 'record_delete')),
  target_table text not null,
  target_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_target_idx on public.audit_logs (target_table, target_id);

alter table public.audit_logs enable row level security;

-- Yalnızca Admin okuyabilir; kimse istemciden yazamaz/silemez (trigger yazar).
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
for select to authenticated
using (public.is_admin());

revoke all on public.audit_logs from anon;
revoke all on public.audit_logs from authenticated;
grant select on public.audit_logs to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Trigger: mmpi_records insert/update/delete → audit_logs
-- ---------------------------------------------------------------------------
create or replace function public.log_mmpi_record_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor, action, target_table, target_id)
    values (auth.uid(), 'record_insert', 'mmpi_records', new.id);
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (actor, action, target_table, target_id)
    values (auth.uid(), 'record_update', 'mmpi_records', new.id);
    return new;
  else
    insert into public.audit_logs (actor, action, target_table, target_id)
    values (auth.uid(), 'record_delete', 'mmpi_records', old.id);
    return old;
  end if;
end;
$$;

revoke all on function public.log_mmpi_record_change() from public;

drop trigger if exists mmpi_records_audit on public.mmpi_records;
create trigger mmpi_records_audit
after insert or update or delete on public.mmpi_records
for each row execute function public.log_mmpi_record_change();
