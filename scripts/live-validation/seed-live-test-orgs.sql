-- ===========================================================================
-- PHASE 7 / P0-8 — Canlı doğrulama için test kurumları ve rol ataması
--
-- Nerede çalıştırılır: Supabase Dashboard → SQL Editor (service_role bağlamı).
-- Parola/anahtar istemez, sır içermez.
--
-- Yıkıcı mı? HAYIR: yalnızca INSERT + UPDATE. Hiçbir satır silinmez.
-- Idempotent mi? EVET: aynı betik tekrar çalıştırılabilir.
--
-- ÇALIŞTIRMADAN ÖNCE: aşağıdaki üç e-postayı kendi test kullanıcılarınızla
-- değiştirin (Dashboard → Authentication → Users).
-- ===========================================================================

do $$
declare
  email_a text := 'test-psikolog-a@example.com';
  email_b text := 'test-psikolog-b@example.com';
  email_admin text := 'test-admin@example.com';

  org_a uuid;
  org_b uuid;
  user_a uuid;
  user_b uuid;
  user_admin uuid;
begin
  select id into user_a from auth.users where email = email_a;
  select id into user_b from auth.users where email = email_b;
  select id into user_admin from auth.users where email = email_admin;

  if user_a is null then
    raise exception 'Test kullanıcısı bulunamadı: %', email_a;
  end if;
  if user_b is null then
    raise exception 'Test kullanıcısı bulunamadı: %', email_b;
  end if;

  -- 1) Kurumlar (idempotent)
  select id into org_a from public.organizations where name = 'LIVE-TEST A' limit 1;
  if org_a is null then
    insert into public.organizations (name) values ('LIVE-TEST A') returning id into org_a;
  end if;

  select id into org_b from public.organizations where name = 'LIVE-TEST B' limit 1;
  if org_b is null then
    insert into public.organizations (name) values ('LIVE-TEST B') returning id into org_b;
  end if;

  -- 2) Profilleri oluştur (yoksa) ve kurum/rol ata
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
    insert into public.profiles (id, email, first_name, last_name, role, active, organization_id)
    values (user_admin, email_admin, 'Test', 'Admin', 'ADMIN', true, org_a)
    on conflict (id) do update
      set role = 'ADMIN',
          active = true;
  else
    raise notice 'Admin kullanıcısı bulunamadı (%). Admin kapsam testi DENY/SKIP olarak raporlanır.', email_admin;
  end if;

  raise notice 'Hazır. A: % (org %), B: % (org %)', user_a, org_a, user_b, org_b;
end $$;

-- Doğrulama: kurum ve rol atamaları
select p.email, p.role, p.active, o.name as organization
from public.profiles p
left join public.organizations o on o.id = p.organization_id
where p.email in ('test-psikolog-a@example.com', 'test-psikolog-b@example.com', 'test-admin@example.com')
order by p.email;
