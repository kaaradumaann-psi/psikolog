-- ===========================================================================
-- PHASE 7 / P0-8 — Canlı veritabanında migration nesne kontrolü
--
-- Nerede çalıştırılır: Supabase Dashboard → SQL Editor (db push sonrası).
-- Yalnızca OKUR (read-only). Hiçbir veriyi değiştirmez.
--
-- Çıktı: her satır bir kontrol; `status` kolonu OK / EKSİK gösterir.
-- ===========================================================================

with checks as (
  -- 1) Yeni tablolar (M2)
  select 'tablo: formulations' as check_name,
         to_regclass('public.formulations') is not null as present
  union all select 'tablo: safety_plans',
         to_regclass('public.safety_plans') is not null

  -- 2) P0-2 sahiplik kolonları (M1)
  union all select 'kolon: clients.owner_user_id',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='clients' and column_name='owner_user_id')
  union all select 'kolon: appointments.owner_user_id',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='appointments' and column_name='owner_user_id')
  union all select 'kolon: sessions.owner_user_id',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='sessions' and column_name='owner_user_id')

  -- 3) Randevu → seans zinciri ve imza/kilit kolonları (M3)
  union all select 'kolon: sessions.appointment_id',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='sessions' and column_name='appointment_id')
  union all select 'kolon: sessions.status',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='sessions' and column_name='status')
  union all select 'kolon: sessions.locked_at',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='sessions' and column_name='locked_at')
  union all select 'kolon: sessions.amendment_of',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='sessions' and column_name='amendment_of')
  union all select 'kolon: reports.locked_at',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='reports' and column_name='locked_at')

  -- 4) Anamnez/danışan/randevu alanları (M4)
  union all select 'kolon: clients.gender',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='clients' and column_name='gender')
  union all select 'kolon: clients.emergency_contact',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='clients' and column_name='emergency_contact')
  union all select 'kolon: anamneses.medical_history',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='anamneses' and column_name='medical_history')
  union all select 'kolon: appointments.fee',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='appointments' and column_name='fee')

  -- 5) Fonksiyonlar
  union all select 'fonksiyon: can_access_client',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='public' and p.proname='can_access_client')
  union all select 'fonksiyon: enforce_locked_record',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='public' and p.proname='enforce_locked_record')
  union all select 'fonksiyon: mark_superseded',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='public' and p.proname='mark_superseded')
  union all select 'fonksiyon: safe_uuid',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='public' and p.proname='safe_uuid')

  -- 6) Kısmi unique index (randevu başına tek canlı seans)
  union all select 'index: sessions_appointment_unique_idx',
         exists (select 1 from pg_indexes
                 where schemaname='public' and indexname='sessions_appointment_unique_idx')

  -- 7) Kilit trigger'ları
  union all select 'trigger: sessions_enforce_lock',
         exists (select 1 from pg_trigger where tgname='sessions_enforce_lock' and not tgisinternal)
  union all select 'trigger: formulations_enforce_lock',
         exists (select 1 from pg_trigger where tgname='formulations_enforce_lock' and not tgisinternal)
  union all select 'trigger: safety_plans_enforce_lock',
         exists (select 1 from pg_trigger where tgname='safety_plans_enforce_lock' and not tgisinternal)

  -- 8) RLS politikaları (sahiplik tabanlı)
  union all select 'policy: clients_select',
         exists (select 1 from pg_policies where schemaname='public' and tablename='clients' and policyname='clients_select')
  union all select 'policy: sessions_select',
         exists (select 1 from pg_policies where schemaname='public' and tablename='sessions' and policyname='sessions_select')
  union all select 'policy: formulations_select',
         exists (select 1 from pg_policies where schemaname='public' and tablename='formulations' and policyname='formulations_select')
  union all select 'policy: safety_plans_select',
         exists (select 1 from pg_policies where schemaname='public' and tablename='safety_plans' and policyname='safety_plans_select')
  -- Not: politika gövdesi metinsel karşılaştırma ile değil, varlık + ayrı test ile doğrulanır.
  union all select 'policy: profiles_insert_self',
         exists (select 1 from pg_policies
                 where schemaname='public' and tablename='profiles' and policyname='profiles_insert_self')

  -- 9) Storage politikaları
  union all select 'storage policy: client_docs_select',
         exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='client_docs_select')
  union all select 'storage policy: client_docs_insert',
         exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='client_docs_insert')
  union all select 'storage policy: client_docs_update',
         exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='client_docs_update')
  union all select 'storage policy: client_docs_delete',
         exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='client_docs_delete')

  -- 10) Storage bucket
  union all select 'bucket: client-documents',
         exists (select 1 from storage.buckets where id='client-documents')
)
select check_name,
       case when present then 'OK' else 'EKSİK' end as status
from checks
order by status desc, check_name;

-- Özet: kaç kontrol geçti?
select count(*) filter (where present) as gecen,
       count(*) filter (where not present) as eksik,
       count(*) as toplam
from (
  select to_regclass('public.formulations') is not null as present
  union all select exists (select 1 from information_schema.columns where table_schema='public' and table_name='sessions' and column_name='appointment_id')
  union all select exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='can_access_client')
  union all select exists (select 1 from pg_trigger where tgname='sessions_enforce_lock' and not tgisinternal)
) t;

-- ===========================================================================
-- 11) SEMPTOM — şema hazır mı? (tek satır karar)
-- ===========================================================================
select case
  when to_regclass('public.formulations') is not null
   and to_regclass('public.safety_plans') is not null
   and exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'sessions' and column_name = 'appointment_id')
   and exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'clients' and column_name = 'owner_user_id')
   and exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.proname = 'can_access_client')
  then 'PHASE 7 ŞEMASI CANLIDA GÖRÜNÜYOR → RLS matrisi koşulabilir (node scripts/live-validation/run.mjs)'
  else 'PHASE 7 ŞEMASI EKSİK → önce: npx supabase link --project-ref <ref> && npx supabase db push --include-all'
end as semptom;

-- ===========================================================================
-- 12) MIGRATION GEÇMİŞİ (CLI kaydı) — BİLEREK EN SONDA
--     Bu bölüm supabase_migrations.schema_migrations tablosunu okur.
--     Tablo yoksa/hata verirse: bu projeye CLI ile hiç `db push` yapılmamış
--     ya da migration'lar başka bir araçla uygulanmış demektir (üstteki nesne
--     kontrolleri yine de geçerlidir; bu bölüm hata verirse üstteki çıktıyı
--     kaybetmemek için en sonda duruyor).
-- ===========================================================================
with expected(version, label) as (
  values
    ('20260924000000', 'initial_schema'),
    ('20260924000001', 'phase03_anamnesis_sessions'),
    ('20260924000002', 'phase04_assessments_tests'),
    ('20260924000003', 'phase05_reports'),
    ('20260924000004', 'phase06_documents_notes'),
    ('20260924000005', 'phase07_appointments_tasks'),
    ('20260924000006', 'fix_profiles_rls'),
    ('20260925100000', 'phase07_ownership_rls'),
    ('20260925110000', 'phase07_formulations_safety_plans'),
    ('20260925120000', 'phase07_session_chain_lock'),
    ('20260925130000', 'phase07_anamnesis_fields')
)
select e.version,
       e.label,
       (m.version is not null) as uygulanmis,
       case
         when m.version is not null then 'OK'
         when e.version like '2026092510%' or e.version like '2026092511%'
           or e.version like '2026092512%' or e.version like '2026092513%' then 'EKSİK (PHASE 7)'
         else 'EKSİK (baz şema)'
       end as durum
from expected e
left join supabase_migrations.schema_migrations m on m.version = e.version
order by e.version;
