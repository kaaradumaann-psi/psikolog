-- A record owner may add expert notes, but the clinical intake and raw OMR payload are
-- immutable after insertion. This prevents a client with a valid session from bypassing
-- the application and rewriting a saved assessment through the generic UPDATE grant.

create or replace function public.validate_mmpi_record_intake()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  method text;
  page jsonb;
  page_number integer;
  page_numbers integer[] := '{}';
  page_index integer;
begin
  -- The UI and printed MMPI workflow use Turkey local calendar dates. Keep the
  -- database boundary on the same day so the first hours after local midnight
  -- are not incorrectly rejected as a future test date.
  if new.application_date > (timezone('Europe/Istanbul', now()))::date then
    raise exception 'Uygulama tarihi ileri tarih olamaz';
  end if;

  -- Legacy rows remain readable and can still receive an expert note. Their immutable
  -- clinical payload is not re-shaped during a notes-only UPDATE; any attempted payload
  -- change is rejected by the immutable-field trigger below.
  if tg_op = 'UPDATE' and new.raw_omr_answers is not distinct from old.raw_omr_answers then
    return new;
  end if;

  if jsonb_typeof(new.raw_omr_answers) <> 'array' then
    raise exception 'Kayıt veri yükü dizi olmalıdır';
  end if;
  if jsonb_array_length(new.raw_omr_answers) not in (2, 5) then
    raise exception 'Kayıt veri yükü biçimi geçersiz';
  end if;
  if exists (
    select 1 from jsonb_array_elements(new.raw_omr_answers) as payload(value)
    where jsonb_typeof(payload.value) <> 'object'
  ) then
    raise exception 'Kayıt veri yükü nesnelerden oluşmalıdır';
  end if;
  if coalesce(new.raw_omr_answers -> 0 ->> 'kind', '') <> 'case-meta'
    or coalesce(new.raw_omr_answers -> 0 ->> 'version', '') <> '1' then
    raise exception 'Kayıt üst verisi geçersiz';
  end if;

  method := new.raw_omr_answers -> 0 ->> 'method';
  if method = 'quick' then
    if jsonb_array_length(new.raw_omr_answers) <> 2
      or coalesce(new.raw_omr_answers -> 1 ->> 'kind', '') <> 'quick-entry'
      or coalesce(jsonb_array_length(new.raw_omr_answers -> 1 -> 'answers'), -1) <> 566 then
      raise exception 'Hızlı giriş veri yükü geçersiz';
    end if;
  elsif method = 'raw' then
    if jsonb_array_length(new.raw_omr_answers) <> 2
      or coalesce(new.raw_omr_answers -> 1 ->> 'kind', '') <> 'raw-scores'
      or coalesce(jsonb_typeof(new.raw_omr_answers -> 1 -> 'scales'), '') <> 'object' then
      raise exception 'Ham puan veri yükü geçersiz';
    end if;
  elsif method = 'omr' then
    if jsonb_array_length(new.raw_omr_answers) <> 5 then
      raise exception 'OMR veri yükü dört sayfa içermelidir';
    end if;
    for page_index in 1..4 loop
      page := new.raw_omr_answers -> page_index;
      if coalesce(page ->> 'pageNumber', '') !~ '^[1-4]$'
        or coalesce(page ->> 'batchId', '') !~ '^[A-F0-9]{24}$'
        or coalesce(jsonb_typeof(page -> 'items'), '') <> 'array' then
        raise exception 'OMR sayfa veri yükü geçersiz';
      end if;
      page_number := (page ->> 'pageNumber')::integer;
      page_numbers := array_append(page_numbers, page_number);
    end loop;
    if (select count(distinct number) from unnest(page_numbers) as number) <> 4 then
      raise exception 'OMR sayfa numaraları tekrarlı';
    end if;
  else
    raise exception 'Kayıt yöntemi geçersiz';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_mmpi_record_intake() from public;

drop trigger if exists mmpi_records_validate_intake on public.mmpi_records;
create trigger mmpi_records_validate_intake
before insert or update on public.mmpi_records
for each row execute function public.validate_mmpi_record_intake();

create or replace function public.protect_mmpi_record_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.idempotency_key is distinct from old.idempotency_key
    or new.client_first_name is distinct from old.client_first_name
    or new.client_last_name is distinct from old.client_last_name
    or new.gender is distinct from old.gender
    or new.age is distinct from old.age
    or new.occupation is distinct from old.occupation
    or new.education is distinct from old.education
    or new.application_date is distinct from old.application_date
    or new.requested_by is distinct from old.requested_by
    or new.raw_omr_answers is distinct from old.raw_omr_answers
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'Klinik kayıt alanları oluşturulduktan sonra değiştirilemez';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_mmpi_record_fields() from public;

drop trigger if exists mmpi_records_protect_fields on public.mmpi_records;
create trigger mmpi_records_protect_fields
before update on public.mmpi_records
for each row execute function public.protect_mmpi_record_fields();
