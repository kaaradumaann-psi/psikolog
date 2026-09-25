-- ===========================================================================
-- PHASE 7 / P0-8 — Canlı doğrulama için test kurumları + rol ataması (SEED)
--
-- NEREDE ÇALIŞTIRILIR (ikisinden biri):
--   1) Supabase Dashboard → SQL Editor  (önerilen; tablo sahibi bağlamında çalışır,
--      bu yüzden RLS engellemez)
--   2) psql "$DATABASE_URL" -f scripts/live-validation/seed-live-test-orgs.sql
--      (DATABASE_URL yalnızca kendi makinenizde tutulur; bu repoya/rapora YAZILMAZ)
--
-- Parola/anahtar istemez, sır içermez. service_role anahtarı GEREKMEZ.
-- Yıkıcı mı? HAYIR: yalnızca INSERT + UPDATE (auth.users ve klinik tablolara dokunmaz).
-- Idempotent mi? EVET: aynı betik tekrar çalıştırılabilir.
--
-- DÜZENLENECEK TEK YER: aşağıdaki live_test_slots INSERT'i (üç test e-postası).
-- Eşleşme bulunamazsa betik sessizce geçmez; hangi e-postanın bulunamadığını ve
-- mevcut auth kullanıcılarını RAISE EXCEPTION ile bildirir.
--
-- Neden gerekli: PSYCHOLOG/ADMIN kullanıcıları kayıt sırasında kurumsuz
-- (organization_id = null) ve varsayılan rol PSYCHOLOG ile oluşur; RLS
-- politikaları sahiplik + kurum kapsamına dayandığı için canlı RLS matrisi
-- ancak bu atama yapıldıktan sonra koşulabilir.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 0) Düzenleme noktası: beklenen test kullanıcıları (Dashboard → Authentication → Users)
-- ---------------------------------------------------------------------------
create temp table if not exists live_test_slots (
  slot text primary key,
  email text not null,
  beklenen_rol text not null
);

delete from live_test_slots;

insert into live_test_slots (slot, email, beklenen_rol) values
  ('A',     'test-psikolog-a@example.com', 'PSYCHOLOG'),   -- <-- DÜZENLE
  ('B',     'test-psikolog-b@example.com', 'PSYCHOLOG'),   -- <-- DÜZENLE
  ('ADMIN', 'test-admin@example.com',      'ADMIN');       -- <-- DÜZENLE

select slot, email, beklenen_rol from live_test_slots order by slot;

-- ---------------------------------------------------------------------------
-- 1) Kurum oluştur + profillere rol/kurum ata
-- ---------------------------------------------------------------------------
do $$
declare
  email_a text := (select email from live_test_slots where slot = 'A');
  email_b text := (select email from live_test_slots where slot = 'B');
  email_admin text := (select email from live_test_slots where slot = 'ADMIN');

  org_a uuid;
  org_b uuid;
  user_a uuid;
  user_b uuid;
  user_admin uuid;

  existing_users text;
begin
  select id into user_a from auth.users where lower(email) = lower(email_a) limit 1;
  select id into user_b from auth.users where lower(email) = lower(email_b) limit 1;
  select id into user_admin from auth.users where lower(email) = lower(email_admin) limit 1;

  -- Teşhis: mevcut auth kullanıcıları (kendi projeniz, kendi oturumunuz)
  -- Not: created_at'e bağımlı değiliz (test/PGlite şeması ile uyum için).
  select string_agg(coalesce(email, '(e-posta yok)'), ', ' order by email)
    into existing_users
  from (select email from auth.users order by email limit 10) u;

  raise notice 'auth.users içinde % kullanıcı var. İlk 10: %',
    (select count(*) from auth.users), coalesce(existing_users, '(yok)');

  if user_a is null then
    raise exception 'Test kullanıcısı bulunamadı: % — live_test_slots içindeki A satırını Authentication → Users listesindeki e-posta ile değiştirin.', email_a;
  end if;
  if user_b is null then
    raise exception 'Test kullanıcısı bulunamadı: % — live_test_slots içindeki B satırını Authentication → Users listesindeki e-posta ile değiştirin.', email_b;
  end if;
  if user_admin is null then
    raise notice 'Admin kullanıcısı bulunamadı (%). Admin kapsam testi SKIP olarak raporlanır.', email_admin;
  end if;

  -- 1a) Kurumlar (idempotent: aynı ad birden fazla oluşturulmaz)
  select id into org_a from public.organizations where name = 'LIVE-TEST A' order by created_at limit 1;
  if org_a is null then
    insert into public.organizations (name) values ('LIVE-TEST A') returning id into org_a;
  end if;

  select id into org_b from public.organizations where name = 'LIVE-TEST B' order by created_at limit 1;
  if org_b is null then
    insert into public.organizations (name) values ('LIVE-TEST B') returning id into org_b;
  end if;

  -- 1b) Profiller (yoksa oluştur; varsa yalnız kurum/rol/aktif güncellenir)
  insert into public.profiles (id, email, first_name, last_name, role, active, organization_id)
  values (user_a, email_a, 'Test', 'Psikolog A', 'PSYCHOLOG', true, org_a)
  on conflict (id) do update
    set organization_id = excluded.organization_id,
        role = 'PSYCHOLOG',
        active = true;

  insert into public.profiles (id, email, first_name, last_name, role, active, organization_id)
  values (user_b, email_b, 'Test', 'Psikolog B', 'PSYCHOLOG', true, org_b)
  on conflict (id) do update
    set organization_id = excluded.organization_id,
        role = 'PSYCHOLOG',
        active = true;

  if user_admin is not null then
    if user_admin = user_a or user_admin = user_b then
      raise notice 'UYARI: admin e-postası A veya B ile aynı; bu kullanıcının rolü ADMIN yapıldı.';
    end if;
    insert into public.profiles (id, email, first_name, last_name, role, active, organization_id)
    values (user_admin, email_admin, 'Test', 'Admin', 'ADMIN', true, org_a)
    on conflict (id) do update
      set role = 'ADMIN',
          active = true,
          organization_id = coalesce(profiles.organization_id, excluded.organization_id);
  end if;

  raise notice 'SEED TAMAM. A: % (org %), B: % (org %)', user_a, org_a, user_b, org_b;
end $$;

-- ---------------------------------------------------------------------------
-- 2) DOĞRULAMA — beklenen satırlar (eşleşmeyen e-posta 'KULLANICI YOK' görünür)
-- ---------------------------------------------------------------------------
select s.slot,
       s.email,
       case when u.id is null then 'KULLANICI YOK' else 'var' end as auth_kullanici,
       case when p.id is null then 'PROFİL YOK' else 'var' end as profil,
       p.role::text as rol,
       p.active as aktif,
       o.name as kurum,
       case
         when u.id is null then 'E-postayı live_test_slots içinde düzeltin'
         when p.organization_id is null then 'KURUM ATANMAMIŞ — seed tekrar çalıştırılmalı'
         when s.slot = 'ADMIN' and p.role::text <> 'ADMIN' then 'ROL ADMIN DEĞİL — seed tekrar çalıştırılmalı'
         else 'HAZIR'
       end as durum
from live_test_slots s
left join auth.users u on lower(u.email) = lower(s.email)
left join public.profiles p on p.id = u.id
left join public.organizations o on o.id = p.organization_id
order by s.slot;

-- ---------------------------------------------------------------------------
-- 3) DOĞRULAMA — özet (0 eşleşme sessizce geçmesin)
-- ---------------------------------------------------------------------------
select
  (select count(*) from live_test_slots s
     join auth.users u on lower(u.email) = lower(s.email)
     join public.profiles p on p.id = u.id
    where p.organization_id is not null) as kurumlu_test_profili,
  (select count(*) from live_test_slots) as beklenen_kayit,
  case
    when (select count(*) from live_test_slots s
            join auth.users u on lower(u.email) = lower(s.email)
            join public.profiles p on p.id = u.id
           where s.slot in ('A', 'B') and p.organization_id is not null) = 2
    then 'A ve B kurum ataması TAMAM → sıradaki adım: node scripts/live-validation/run.mjs'
    else 'EKSİK: A/B kurum ataması yapılmadı — e-postaları düzeltip betiği tekrar çalıştırın'
  end as sonuc;

-- Not: SQL Editor "temp table" oluşturmayı reddederse, alternatif olarak betiği
-- psql ile çalıştırın veya yukarıdaki üç e-postayı ilgili tüm bölümlerde elle
-- aynı şekilde güncelleyin. Doğrulama bölümleri aynı e-postaları kullanmalıdır.
