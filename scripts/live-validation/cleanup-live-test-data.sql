-- ===========================================================================
-- PHASE 7 / P0-8 — Canlı doğrulama artıklarını temizleme (opsiyonel bakım)
--
-- NEDEN VAR: koşucu sentetik danışan zincirini kendi silmeyi dener. Zincirde
-- **kilitli (LOCKED)** bir klinik kayıt varsa, DB trigger'ı silmeyi reddeder —
-- bu, imza/kilit tasarımının İSTENEN sonucudur (kilitli kayıt cascade ile bile
-- silinemez). Bu durumda koşucu "DENY + SKIP" yazar ve sentetik zincir canlıda
-- KALIR. Bu betik o artığı temizlemek (veya görünmez kılmak) için vardır.
--
-- Kapsam (sert sınır): YALNIZCA bu kitin ürettiği sentetik kayıtlar
--   * public.clients.file_number LIKE 'LIVE-%'   (API koşucusunun öneki)
--   * public.clients.file_number LIKE 'E2E-%'    (tarayıcı testinin öneki)
--   * storage.objects.name LIKE '%-live-check.txt'
-- Gerçek danışan/klinik verisine DOKUNMAZ.
--
-- Nerede çalıştırılır: Supabase Dashboard → SQL Editor.
-- Sıra: 1–2 önizleme → 3 (arşivle, ÖNERİLEN) veya 4 (tam silme, uyarılı).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) ÖNİZLEME — sentetik danışanlar ve bağlı kayıtlar (kilitli olanlar işaretli)
-- ---------------------------------------------------------------------------
select c.id,
       c.file_number,
       c.first_name,
       c.last_name,
       c.status,
       c.created_at,
       (select count(*) from public.sessions s where s.client_id = c.id) as seans,
       (select count(*) from public.sessions s where s.client_id = c.id and s.status = 'locked') as kilitli_seans,
       (select count(*) from public.appointments a where a.client_id = c.id) as randevu,
       (select count(*) from public.notes n where n.client_id = c.id) as not_sayisi,
       (select count(*) from public.formulations f where f.client_id = c.id and f.status = 'locked') as kilitli_formulasyon,
       (select count(*) from public.safety_plans sp where sp.client_id = c.id and sp.status = 'locked') as kilitli_guvenlik_plani,
       (select count(*) from public.reports r where r.client_id = c.id and r.status = 'locked') as kilitli_rapor
from public.clients c
where c.file_number like 'LIVE-%' or c.file_number like 'E2E-%'
order by c.created_at;

-- ---------------------------------------------------------------------------
-- 2) ÖNİZLEME — sentetik storage nesneleri
-- ---------------------------------------------------------------------------
select o.bucket_id, o.name, o.created_at
from storage.objects o
where o.bucket_id = 'client-documents'
  and o.name like '%-live-check.txt'
order by o.created_at;

-- ===========================================================================
-- 3) ÖNERİLEN: arşivle (veri silinmez, kilitli kayıtlar korunur)
--    Danışan kaydı arşive alınır; oturum açan psikologun aktif listesinde görünmez.
--    Kilitli klinik kayıtlar yerinde kalır (immutability bozulmaz).
-- ===========================================================================
-- update public.clients
--    set status = 'archived'
--  where file_number like 'LIVE-%' or file_number like 'E2E-%';
--
-- -- storage artıklarını sil (nesneler klinik kayıt değildir)
-- delete from storage.objects
--  where bucket_id = 'client-documents' and name like '%-live-check.txt';

-- ===========================================================================
-- 4) TAM SİLME (uyarılı) — yalnız sentetik test verisi için
--    Kilitli kayıt varsa önce ilgili trigger'lar geçici olarak devre dışı bırakılır;
--    silme YALNIZCA file_number LIKE 'LIVE-%' satırlarını hedefler; işlem sonunda
--    trigger'lar yeniden AÇILIR. Bu bloğu GERÇEK klinik veride ASLA çalıştırmayın.
--    (SQL Editor tablo sahibi bağlamında çalışır; service_role anahtarı gerekmez.)
-- ===========================================================================
-- do $$
-- declare
--   hedef uuid[];
-- begin
--   select array_agg(id) into hedef from public.clients
--    where file_number like 'LIVE-%' or file_number like 'E2E-%';
--   if hedef is null then
--     raise notice 'Sentetik danışan bulunamadı — yapılacak iş yok.';
--     return;
--   end if;
--   raise notice 'Silinecek sentetik danışan sayısı: %', array_length(hedef, 1);
--
--   alter table public.sessions disable trigger sessions_enforce_lock;
--   alter table public.formulations disable trigger formulations_enforce_lock;
--   alter table public.safety_plans disable trigger safety_plans_enforce_lock;
--
--   begin
--     delete from public.clients where id = any(hedef);
--   exception when others then
--     alter table public.sessions enable trigger sessions_enforce_lock;
--     alter table public.formulations enable trigger formulations_enforce_lock;
--     alter table public.safety_plans enable trigger safety_plans_enforce_lock;
--     raise;
--   end;
--
--   alter table public.sessions enable trigger sessions_enforce_lock;
--   alter table public.formulations enable trigger formulations_enforce_lock;
--   alter table public.safety_plans enable trigger safety_plans_enforce_lock;
--
--   delete from storage.objects
--    where bucket_id = 'client-documents' and name like '%-live-check.txt';
--
--   raise notice 'Temizlik tamam. Kalan sentetik danışan: %',
--     (select count(*) from public.clients where file_number like 'LIVE-%' or file_number like 'E2E-%');
-- end $$;

-- ===========================================================================
-- 5) DOĞRULAMA — trigger'lar açık mı ve artık kaldı mı?
-- ===========================================================================
select tgname as trigger_adi, tgenabled as durum
from pg_trigger
where tgname in ('sessions_enforce_lock', 'formulations_enforce_lock', 'safety_plans_enforce_lock')
  and not tgisinternal
order by tgname;
-- (durum 'O' = açık/enabled olmalı)

select count(*) as kalan_sentetik_danisan
  from public.clients where file_number like 'LIVE-%' or file_number like 'E2E-%';
select count(*) as kalan_test_nesnesi
  from storage.objects where bucket_id = 'client-documents' and name like '%-live-check.txt';
