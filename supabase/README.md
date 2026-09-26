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

## 3. İlk Admin ve kurum kurulumu

Public signup kapalı. İlk yetkili kişi Dashboard → Authentication → Users → Add user ile oluşturulur. Auth kullanıcısı **ADMIN değildir**: `handle_new_auth_user` başlangıçta `PSYCHOLOG`, `organization_id = NULL` profili açar. **E-posta adresinin `admin@…` olması rol vermez.**

Önce SQL Editor'da **salt-okunur** tanılama yapın (kendi gerçek e-postanızı kullanın):

```sql
select u.id as auth_user_id, u.email, p.role, p.active,
       p.organization_id, o.name as organization_name
from auth.users u
left join public.profiles p on p.id = u.id
left join public.organizations o on o.id = p.organization_id
where lower(u.email) = lower('first-admin@example.com');
```

Hesabın/projenin gerçekten size ait olduğunu ve `auth_user_id`'yi doğrulayın. İlk rol yükseltmesini **yalnız yetkili SQL Editor operatörü** yapar; web formu/anon anahtarından ADMIN rolü verilemez. Güvenli/id-kontrollü örnek ve eksik profil/migration senaryoları: [`docs/ADMIN-ORGANIZATION-INCIDENT.md`](../docs/ADMIN-ORGANIZATION-INCIDENT.md). Sonrasında ADMIN profili **kurumsuz da** kurum/hesap yönetimi ekranına girer; klinik dosyaya girmek için mevcut/yeni kurumu **açıkça seçerek** kendi profiline atar. Psikolog veya ORG_ADMIN hesabı yalnızca mevcut bir kuruma bağlı olarak oluşturulabilir. Gerçek admin'e `LIVE-TEST` seed dosyası uygulamayın.

Bu adımlar gerçek veriyi silmez; rol/kurum değişikliklerinin canlı etkisi yetkili operatörce doğrulanmalıdır.

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

## 6. Güvenlik

- RLS her tablo, anon revoke
- Security definer search_path=public
- Origin allowlist strict parsing
- Validation: email regex, UUID, control char, length
- Audit logs trigger server-side
- No service_role frontend
- KVKK: veri minimizasyonu, gereksiz 3rd party yok, hassas veri loglanmaz, public URL yok
