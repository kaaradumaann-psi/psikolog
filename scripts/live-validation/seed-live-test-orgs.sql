-- ===========================================================================
-- PHASE 7 / P0-8 — Canlı doğrulama için test kurumları + rol ataması (SEED)
--
-- NEREDE ÇALIŞTIRILIR: Supabase Dashboard → SQL Editor  (önerilen; tablo sahibi
-- bağlamında çalışır, bu yüzden RLS/GRANT engellemez).
--   Alternatif: psql "$DATABASE_URL" -f scripts/live-validation/seed-live-test-orgs.sql
--
-- Parola/anahtar istemez, sır içermez. service_role anahtarı GEREKMEZ.
-- Yıkıcı mı? HAYIR: yalnızca INSERT + UPDATE. Hiçbir satır silinmez.
-- Idempotent mi? EVET: aynı betik istendiği kadar tekrar çalıştırılabilir.
--
-- DÜZENLENECEK TEK YER: aşağıdaki üç e-posta sabiti (email_a / email_b / email_admin).
--   E-posta otomatik doldurulsun istiyorsanız elle düzenlemeyin; bunun yerine:
--     node scripts/live-validation/emit-seed.mjs
--   komutu bu dosyadan `live-seed.local.sql` üretir (e-postalar .env.live'dan gelir;
--   parola okunmaz/yazılmaz, ekranda e-postalar maskelenir).
--
-- Neden gerekli: PSYCHOLOG/ADMIN kullanıcıları kayıt sırasında kurumsuz
-- (organization_id = null) ve varsayılan rol PSYCHOLOG ile oluşur. RLS politikaları
-- sahiplik + kurum kapsamına dayanır; canlı RLS matrisi ancak bu atama yapıldıktan
-- sonra koşulabilir. Atama bilinçli olarak istemciden YAPILAMAZ:
--   - profiles_insert_self politikası INSERT'te organization_id is null şartı arar,
--   - authenticated rolünün public.profiles üzerinde update yetkisi yoktur.
-- ===========================================================================

do $$
declare
  email_a text := 'test-psikolog-a@example.com';   -- <-- DÜZENLE
  email_b text := 'test-psikolog-b@example.com';   -- <-- DÜZENLE
  email_admin text := 'test-admin@example.com';    -- <-- DÜZENLE

  org_a uuid;
  org_b uuid;
  user_a uuid;
  user_b uuid;
  user_admin uuid;

  profil_a uuid;
  profil_b uuid;
  existing_users text;
begin
  select id into user_a from auth.users where lower(email) = lower(email_a) limit 1;
  select id into user_b from auth.users where lower(email) = lower(email_b) limit 1;
  select id into user_admin from auth.users where lower(email) = lower(email_admin) limit 1;

  -- Teşhis: eşleşme olmazsa hangi e-postaların mevcut olduğunu göster
  select string_agg(coalesce(email, '(e-posta yok)'), ', ' order by email)
    into existing_users
  from (select email from auth.users order by email limit 15) u;

  raise notice 'auth.users içinde % kullanıcı var. İlk 15: %',
    (select count(*) from auth.users), coalesce(existing_users, '(yok)');

  if user_a is null or user_b is null then
    raise exception 'EŞLEŞME YOK → A: % (%), B: % (%). Yukarıdaki NOTICE listesindeki gerçek e-postalarla üç sabiti güncelleyin.',
      email_a, coalesce(user_a::text, 'bulunamadı'), email_b, coalesce(user_b::text, 'bulunamadı');
  end if;

  -- 1) Kurumlar (idempotent: aynı ad ikinci kez oluşturulmaz)
  select id into org_a from public.organizations where name = 'LIVE-TEST A' order by created_at limit 1;
  if org_a is null then
    insert into public.organizations (name) values ('LIVE-TEST A') returning id into org_a;
  end if;

  select id into org_b from public.organizations where name = 'LIVE-TEST B' order by created_at limit 1;
  if org_b is null then
    insert into public.organizations (name) values ('LIVE-TEST B') returning id into org_b;
  end if;

  -- 2) Profiller: yoksa oluştur, varsa kurum/rol/aktif alanlarını ata.
  --    (profiles satırının auth kullanıcı kimliğiyle birebir eşleşmesi garanti edilir.)
  insert into public.profiles (id, email, first_name, last_name, role, active, organization_id)
  values (user_a, email_a, 'Test', 'Psikolog A', 'PSYCHOLOG', true, org_a)
  on conflict (id) do update
    set organization_id = excluded.organization_id,
        role = 'PSYCHOLOG',
        active = true;
  select id into profil_a from public.profiles where id = user_a;
  if profil_a is null then
    raise exception 'A profili yazılamadı (auth user %) — profiles tablosunun FK/trigger durumunu kontrol edin.', user_a;
  end if;

  insert into public.profiles (id, email, first_name, last_name, role, active, organization_id)
  values (user_b, email_b, 'Test', 'Psikolog B', 'PSYCHOLOG', true, org_b)
  on conflict (id) do update
    set organization_id = excluded.organization_id,
        role = 'PSYCHOLOG',
        active = true;
  select id into profil_b from public.profiles where id = user_b;
  if profil_b is null then
    raise exception 'B profili yazılamadı (auth user %) — profiles tablosunun FK/trigger durumunu kontrol edin.', user_b;
  end if;

  -- 3) Admin: rol ADMIN + A kurumu (admin kapsam testi bu kurum üzerinde koşar).
  if user_admin is null then
    raise notice 'Admin kullanıcısı bulunamadı (%). Admin kapsam testi SKIP olarak raporlanır.', email_admin;
  else
    insert into public.profiles (id, email, first_name, last_name, role, active, organization_id)
    values (user_admin, email_admin, 'Test', 'Admin', 'ADMIN', true, org_a)
    on conflict (id) do update
      set role = 'ADMIN',
          active = true,
          organization_id = coalesce(public.profiles.organization_id, excluded.organization_id);
  end if;

  -- 4) Canlı doğrulama için kurumların gerçekten atandığını doğrula (yoksa hata ver)
  if not exists (
    select 1 from public.profiles where id = user_a and organization_id = org_a
  ) or not exists (
    select 1 from public.profiles where id = user_b and organization_id = org_b
  ) then
    raise exception 'Atama doğrulanamadı: A/B profillerinde organization_id beklenen kuruma eşit değil.';
  end if;

  raise notice 'SEED TAMAM → A: % (org %), B: % (org %)', user_a, org_a, user_b, org_b;
  raise notice 'Beklenen: A/B kurum sahibi (PSYCHOLOG), admin rol=ADMIN ve bir kuruma bağlı.';
end $$;

-- ===========================================================================
-- DOĞRULAMA 1 — beklenen üç e-posta için atama durumu
-- (seed ile aynı üç e-postayı kullanır; e-posta otomatik doldurulmuşsa burada da günceldir)
-- ===========================================================================
with expected(slot, email, beklenen_rol) as (
  values
    ('A',     'test-psikolog-a@example.com', 'PSYCHOLOG'),
    ('B',     'test-psikolog-b@example.com', 'PSYCHOLOG'),
    ('ADMIN', 'test-admin@example.com',      'ADMIN')
)
select e.slot,
       e.email,
       case when u.id is null then 'KULLANICI YOK' else 'var' end as auth_kullanici,
       case when p.id is null then 'PROFİL YOK' else 'var' end as profil,
       p.role::text as rol,
       p.active as aktif,
       o.name as kurum,
       case
         when u.id is null then 'E-postayı bu dosyada (veya emit-seed ile) düzeltin'
         when p.organization_id is null then 'KURUM ATANMAMIŞ — seed tekrar çalıştırılmalı'
         when e.slot = 'ADMIN' and p.role::text <> 'ADMIN' then 'ROL ADMIN DEĞİL — seed tekrar çalıştırılmalı'
         else 'HAZIR'
       end as durum
from expected e
left join auth.users u on lower(u.email) = lower(e.email)
left join public.profiles p on p.id = u.id
left join public.organizations o on o.id = p.organization_id
order by e.slot;

-- ===========================================================================
-- DOĞRULAMA 2 — özet karar (A ve B kurum ataması yapıldı mı?)
-- ===========================================================================
select
  (select count(*) from public.profiles p
    where p.id in (
      select u.id from auth.users u
       where lower(u.email) in (
         select lower(v.email) from (values
           ('test-psikolog-a@example.com'), ('test-psikolog-b@example.com'), ('test-admin@example.com')
         ) as v(email)
       )
    )
      and p.organization_id is not null) as kurumlu_test_profili,
  (select count(*) from public.profiles p
    join auth.users u on u.id = p.id
   where lower(u.email) in (
           select lower(v.email) from (values
             ('test-psikolog-a@example.com'), ('test-psikolog-b@example.com')
           ) as v(email)
         )
     and p.organization_id is not null) as atanmis_a_b,
  case
    when (select count(*) from public.profiles p
            join auth.users u on u.id = p.id
           where lower(u.email) in (
                   select lower(v.email) from (values
                     ('test-psikolog-a@example.com'), ('test-psikolog-b@example.com')
                   ) as v(email)
                 )
             and p.organization_id is not null) = 2
    then 'A ve B kurum ataması TAMAM → sıradaki adım: node scripts/live-validation/run.mjs'
    else 'EKSİK: A/B kurum ataması yapılmadı — yukarıdaki NOTICE/exception çıktısını okuyup e-postaları düzeltin'
  end as sonuc;
