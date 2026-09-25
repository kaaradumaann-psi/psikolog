# Supabase Kurulumu — Psikolog Platformu

Bu klasör yeni platformun şemasını, RLS politikalarını ve kullanıcı yönetimi Edge Function'ını içerir.

**ÖNEMLİ:** Bu çalışma alanının kendi Supabase projesidir. Başka bir uygulamanın veritabanı kullanılmaz.

## 1. Proje Değişkenleri

Kök dizinde `.env` oluşturun:

```sh
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Frontend'e yalnızca publishable/anon key. `service_role` asla frontend'e, `VITE_` önekiyle veya Git'e konmaz.

## 2. Şema ve RLS

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Migration'lar:

- `organizations` — kurumlar, multi-tenancy
- `profiles` — Auth profil, ADMIN/ORG_ADMIN/PSYCHOLOG, active, organization_id FK, least privilege trigger
- `clients` — danışanlar, organization_id, file_number unique org içinde, created_by FK profiles cascade, status active/archived
- `audit_logs` — sunucu taraflı denetim izi, trigger yazar, client yazamaz, admin/org_admin okur

RLS: her tabloda, anon revoke, security definer helpers `is_active_user()`, `is_psychologist()`, `is_admin()`, `is_org_admin()`, `is_org_member(org_id)`, org isolation.

Storage: private bucket `client-documents` — faz 2'de aktif, RLS + storage policies, no public URL.

## 3. İlk Admin

Public signup kapalı. İlk Admin Dashboard → Authentication → Users → Add user ile oluşturun. Trigger önce PSYCHOLOG olarak ekler. SQL Editor'da bir kez:

```sql
update public.profiles
set role = 'ADMIN', active = true
where email = 'ilk-admin@example.com';
```

Sonra psikolog hesapları Admin paneli Edge Function üzerinden.

## 4. Edge Function — admin-users

Service role yalnızca Supabase sunucusunda:

```sh
supabase functions deploy admin-users
supabase secrets set ALLOWED_ORIGINS=https://psikolog.halilkaraduman.com.tr,https://psikolog-platform.pages.dev
```

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` Edge ortamında otomatik. Production'da `ALLOWED_ORIGINS` boş bırakılmamalı, virgülle ayrılır. Boş allowlist yalnız localhost dev origin'lere izin verir.

Hesap silme Auth kullanıcısını siler; `profiles` ve `clients` ON DELETE CASCADE ile temizlenir.

## 5. Storage

Private bucket `client-documents` — migration ile oluşturulmaz, Supabase Dashboard → Storage → New bucket → private, veya SQL:

```sql
insert into storage.buckets (id, name, public) values ('client-documents', 'client-documents', false);
```

Policies: org_member read/write, owner delete, no anon. File size 10MiB, mime whitelist pdf/jpg/png/webp/docx.

## 6. PHASE 1 SSO secrets

Deploy after `db push`:

```sh
supabase functions deploy sso-issue
supabase functions deploy sso-redeem
supabase secrets set SSO_HMAC_SECRET='<32+ char random>' \
  MMPI_SSO_ORIGIN=https://mmpi.halilkaraduman.com.tr \
  ALLOWED_ORIGINS=https://psikolog.halilkaraduman.com.tr
```

`SSO_HMAC_SECRET` is never a `VITE_` variable. MMPI `sso-consume` uses the same HMAC secret and `PSYCHOLOGY_SSO_REDEEM_URL`.

## 7. Güvenlik

- RLS her tablo, anon revoke
- Security definer search_path=public
- Origin allowlist strict parsing
- Validation: email regex, UUID, control char, length
- Audit logs trigger server-side
- No service_role frontend
- KVKK: veri minimizasyonu, gereksiz 3rd party yok, hassas veri loglanmaz, public URL yok
