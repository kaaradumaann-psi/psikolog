-- ===========================================================================
-- PHASE 7 / P0-8 — Canlı doğrulama artıklarını temizleme (opsiyonel bakım)
--
-- NEDEN: koşu #4'te CLEANUP adımı, koşucunun oturumu kapattıktan SONRA silme
-- denemesi yapması nedeniyle reddedildi (istek `anon` rolüne düştü → 42501).
-- Bu yüzden o koşuda oluşturulan sentetik zincir canlıda KALDI.
-- Koşucu düzeltildi; bundan sonraki koşular kendi zincirini siler. Bu betik,
-- ESKİ koşulardan kalan sentetik kayıtları temizlemek için vardır.
--
-- Nerede çalıştırılır: Supabase Dashboard → SQL Editor.
-- Yıkıcı mı? EVET — ama YALNIZCA bu doğrulama kitinin ürettiği sentetik kayıtlar:
--   * public.clients.file_number LIKE 'LIVE-%'  (koşucu `LIVE-...` öneki kullanır)
--   * storage.objects.name LIKE '%-live-check.txt' (koşucunun yüklediği test nesnesi)
-- Gerçek danışan/klinik verisine DOKUNMAZ. Yine de önce 1. ve 2. adımı çalıştırıp
-- çıktıyı GÖZDEN GEÇİRİN; silme adımlarını ancak liste beklendiği gibiyse çalıştırın.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) ÖNİZLEME — silinecek danışanlar (sentetik zincirin kökü)
-- ---------------------------------------------------------------------------
select c.id,
       c.file_number,
       c.first_name,
       c.last_name,
       c.status,
       c.created_at,
       (select count(*) from public.sessions s where s.client_id = c.id) as seans,
       (select count(*) from public.appointments a where a.client_id = c.id) as randevu,
       (select count(*) from public.notes n where n.client_id = c.id) as not_sayisi,
       (select count(*) from public.anamneses an where an.client_id = c.id) as anamnez,
       (select count(*) from public.formulations f where f.client_id = c.id) as formulasyon,
       (select count(*) from public.safety_plans sp where sp.client_id = c.id) as guvenlik_plani,
       (select count(*) from public.test_administrations t where t.client_id = c.id) as test,
       (select count(*) from public.reports r where r.client_id = c.id) as rapor
from public.clients c
where c.file_number like 'LIVE-%'
order by c.created_at;

-- ---------------------------------------------------------------------------
-- 2) ÖNİZLEME — silinecek storage nesneleri
-- ---------------------------------------------------------------------------
select o.bucket_id, o.name, o.created_at
from storage.objects o
where o.bucket_id = 'client-documents'
  and o.name like '%-live-check.txt'
order by o.created_at;

-- ===========================================================================
-- AŞAĞIDAKİ SİLME ADIMLARINI ANCAK YUKARIDAKİ LİSTELERİ DOĞRULADIKTAN SONRA ÇALIŞTIRIN
-- ===========================================================================

-- 3) Storage artıklarını sil (test nesnesi)
-- delete from storage.objects
--  where bucket_id = 'client-documents' and name like '%-live-check.txt';

-- 4) Sentetik zinciri sil (alt kayıtlar FK ON DELETE CASCADE ile gider)
-- delete from public.clients where file_number like 'LIVE-%';

-- 5) Doğrulama: artık kalmadı mı? (iki sorgu da 0 satır dönmeli)
-- select count(*) as kalan_sentetik_danisan from public.clients where file_number like 'LIVE-%';
-- select count(*) as kalan_test_nesnesi
--   from storage.objects where bucket_id = 'client-documents' and name like '%-live-check.txt';
