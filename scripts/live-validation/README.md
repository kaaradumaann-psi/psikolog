# PHASE 7 / P0-8 — Canlı Supabase doğrulama kiti

Bu kit, PHASE 7'nin **gerçek Supabase** üzerindeki doğrulamasını (AUTH, RLS, klinik zincir,
imza/kilit/revizyon, Storage, çıkış izolasyonu) tek komutla çalıştırır.

> Sonuç etiketleri birbirine karıştırılmaz:
> `LOCAL/PGlite` ≠ `LIVE SUPABASE` ≠ `REAL BROWSER` ≠ `PRODUCTION`.
> Bu kit **LIVE SUPABASE** katmanını ölçer; tarayıcı ve production bundle doğrulaması ayrıdır.

## 0) Gerekli bilgiler (paylaşılmasına gerek yok)

Bu kit **`service_role` anahtarı gerektirmez**; yalnızca:

| Değişken | Açıklama |
|---|---|
| `VITE_SUPABASE_URL` | Proje URL'i (ör. `https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | anon/publishable anahtar |
| `LIVE_PSY_A_EMAIL` / `LIVE_PSY_A_PASSWORD` | A test psikologu |
| `LIVE_PSY_B_EMAIL` / `LIVE_PSY_B_PASSWORD` | B test psikologu |
| `LIVE_ADMIN_EMAIL` / `LIVE_ADMIN_PASSWORD` | Admin test kullanıcısı |

Değerler **sohbete yazılmaz**; yerel `.env.live` dosyasına veya ortam değişkeni olarak verilir.
`.env.live` `.gitignore` dışına çıkmaz (komut: `echo ".env.live" >> .gitignore`).

## 1) Test kullanıcıları

Supabase Dashboard → Authentication → Users üzerinden üç kullanıcı oluşturun
(A psikolog, B psikolog, admin). Ardından **kurum ataması** için
`scripts/live-validation/seed-live-test-orgs.sql` dosyasını SQL Editor'da çalıştırın
(dosyanın başındaki üç e-posta değişkenini kendi test kullanıcılarınızla değiştirin).

Bu SQL:

- iki kurum oluşturur (`LIVE-TEST A`, `LIVE-TEST B`) — idempotent,
- A/B profillerini bu kurumlara bağlar (rol: `PSYCHOLOG`),
- admin profilini `ADMIN` yapar (platform yöneticisi),
- **hiçbir satırı silmez**, yıkıcı değildir.

## 2) Migration'ları uygula

```bash
# (bir kez) oturum açma — tarayıcıda onaylanır
npx supabase login

# projeyi bağla (DB parolası istenir; parola sohbete yazılmaz)
npx supabase link --project-ref <PROJECT_REF>

# uygulanacak migration'ları önce listele
npx supabase migration list

# PHASE 7 migration'larını uygula (4 dosya, tamamı non-destructive)
npx supabase db push --include-all
```

PHASE 7 migration listesi (uygulanacak sıra):

| # | Dosya | Etki | Yıkıcı? |
|---|---|---|---|
| 1 | `20260925100000_phase07_ownership_rls.sql` | `owner_user_id` kolonları, `can_access_client()`, politika yenileme, Storage politikaları | Hayır |
| 2 | `20260925110000_phase07_formulations_safety_plans.sql` | `formulations` + `safety_plans` tabloları, trigger/policy/audit | Hayır |
| 3 | `20260925120000_phase07_session_chain_lock.sql` | `sessions.appointment_id`, imza/kilit/revizyon kolonları, trigger'lar | Hayır |
| 4 | `20260925130000_phase07_anamnesis_fields.sql` | danışan/randevu/anamnez ek alanları + durum akışı | Hayır |

Uygulama sonrası nesne kontrolü:

```bash
# SQL Editor'da:
#   scripts/live-validation/verify-migrations.sql
```

## 3) Doğrulamayı koş

```bash
node scripts/live-validation/run.mjs --dry-run   # yalnız ortam kontrolü (ağ yok)
node scripts/live-validation/run.mjs             # tam canlı koşu
```

Koşucunun ürettiği kanıt: `live-validation-result.json` (yalnız durum/kimlik bilgisi, sır yok).

### Kapsam

- **AUTH:** A, B, admin girişi; anon oturumsuz erişim.
- **RLS:** A→A SELECT/INSERT/UPDATE/DELETE; A→B, B→A (okuma/yazma/silme) DENY; admin yetkili kapsam PASS; anon DENY.
- **CLINICAL DATA:** Client → Appointment → Session → Note → Anamnesis → Formulation → Safety Plan →
  Test Result → Report sentetik zinciri; `session.appointment_id` bağı.
- **PERSISTENCE:** istemci önbelleği sıfırlanmış gibi yeni oturumla tüm zincirin sunucudan okunması
  (**not:** bu bir tarayıcı/localStorage testi değildir).
- **SIGN/LOCK:** DRAFT update PASS → SIGN PASS → LOCK PASS → locked UPDATE/DELETE DENY →
  amendment/revision PASS + eski sürümün `superseded_by` işaretlenmesi.
- **STORAGE:** A upload/read PASS; B read/update/delete A DENY; A temizlik.
- **LOGOUT:** A çıkış → B girişinde A verisi görünmez → A yeniden girişte veri geri gelir.
- **CLEANUP:** sentetik zincir A tarafından silinir (cascade).

### Kapsam dışı (ayrı raporlanır)

- **REAL BROWSER:** Playwright/Chromium koşusu gerekir (`npm run test:e2e`).
- **PRODUCTION:** production bundle + dağıtım ortamı doğrulaması gerekir.
