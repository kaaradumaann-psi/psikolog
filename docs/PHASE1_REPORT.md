# PHASE 1 — Psychology ↔ MMPI kimlik, danışan UUID, SSO

Kapsam: yalnızca PHASE 1. Kuyruk, tamamlanma callback’i, rapor senkronu ve MMPI dashboard kuyruğu **yok**.

## PHASE 1 STATUS: BLOCKED

Kod bu depoda ve `integration/mmpi/` paketinde duruyor; birim testleri, RLS PGlite, MMPI skor motoru ve gerçek tarayıcı SSO (yerel protokol sunucusu + gerçek frontend’ler) geçti. **PASS değil.** 2026-09-25 üretim doğrulaması:

| Kontrol | Sonuç | Kanıt |
| --- | --- | --- |
| `psikolog.halilkaraduman.com.tr` DNS | **yok (NXDOMAIN)** | A/AAAA/CNAME kaydı yok; Cloudflare NS zone’u var |
| Psychology `project_id` | **eksik** | `supabase/config.toml` doldurulmamış |
| `SUPABASE_ACCESS_TOKEN` / DB şifresi | **eksik** | sandbox env’de yok; `supabase login` yapılamadı |
| `sso-issue` / `sso-redeem` Psychology | **deploy edilemedi** | hedef proje bilinmiyor + token yok |
| MMPI proje | `lgtahyruhyfozhueawft` | `admin-users` canlı (JWT bekliyor) |
| `sso-consume` MMPI production | **NOT_FOUND** | `https://lgtahyruhyfozhueawft.supabase.co/functions/v1/sso-consume` |
| HMAC / Edge secrets | **eksik** | `SSO_HMAC_SECRET`, `MMPI_SSO_ORIGIN`, `PSYCHOLOGY_SSO_REDEEM_URL` yok |
| Repo123 push | **403** | `arena-ai-coding-agent[bot]` yazamaz |
| Wrangler / Cloudflare | **unauthenticated** | frontend deploy yok |
| Test hesapları | **eksik** | production e-posta/şifre yok |

Mock ile PASS gösterilmedi. `db push` / `functions deploy` / `secrets set` çalıştırılmadı.

## Dosyalar (Psychology)

| Alan | Dosya |
| --- | --- |
| Migration | `supabase/migrations/20260925100000_phase1_sso_identity_clients.sql` |
| SSO protokol | `supabase/functions/_shared/ssoProtocol.ts`, `ssoPolicy.ts`, `edgeCors.ts` |
| Edge | `supabase/functions/sso-issue/index.ts`, `sso-redeem/index.ts` |
| Config | `supabase/config.toml` (`sso-issue` JWT on, `sso-redeem` JWT off) |
| Danışan | `src/clinical/clientIds.ts`, `clientCloud.ts`, `clinicalStore.ts`, `practiceStore.ts` |
| MMPI kaydı | `src/clinical/mmpiAdministration.ts` (`test_administrations`, `test_type=MMPI`) |
| SSO UI | `src/auth/sso.ts`, `src/lib/ssoRedirect.ts`, `src/lib/mmpiOrigin.ts`, `SettingsPage` |
| Test | `tests/ssoPolicy.test.ts`, `clientMapping.test.ts`, `phase1Rls.test.ts`, `edgeSso.test.ts`, `secretsGuard.test.ts` |
| E2E | `e2e/sso.spec.ts` (yerel kip), `e2e/sso-live.spec.ts` + `e2e/ssoLiveServer.ts` |

## MMPI paketi (Repo123’e uygulanacak)

`integration/mmpi/` — migration, `sso-consume`, `SsoConsumePage`, `ssoConsume.ts`, `_shared` kopyası, `PATCHES.md` (`/sso` rota, AuthGate dışı, `verify_jwt=false`, diagnose listesi).

Bu oturumda `/tmp/mmpi` üzerine uygulandı; **GitHub Repo123 güncellenmedi**.

## Migration / RLS

Eklenenler (mevcut migration’lar dokunulmadı):

- `clients.legacy_client_id`, `clients.gender`
- `profiles.global_user_id` (teknik bağ; yeni IdP değil)
- `identity_links` (email + psychology/mmpi user id)
- `sso_authorization_codes` (hash, tek kullanımlık, 60s)
- `sso_replay_nonces`
- `test_definitions` MMPI satırı (`00000000-0000-4000-8000-000000000006`)
- `test_administrations` kısmi unique: açık MMPI satırı (planned/in_progress)

CRM SELECT org seviyesinde kaldı (owner-only’ye çevrilmedi). `test_administrations` insert `created_by = auth.uid()`.

## SSO akışı

1. Psychology JWT → `sso-issue` (`getUser`, body `userId` yok sayılır)
2. 60s hashed tek kullanımlık kod
3. URL yalnızca `code` + `state` → `https://mmpi…/sso`
4. `sso-consume` HMAC → Psychology `sso-redeem`
5. Eşleşen MMPI kullanıcısı yoksa **403**, `createUser` yok
6. `generateLink` + `verifyOtp` POST gövdesinde; access/refresh URL’de yok
7. Mevcut AuthGate / roller; SSO tek başına yetki vermez

Sırlar: `SSO_HMAC_SECRET`, `MMPI_SSO_ORIGIN`, `PSYCHOLOGY_SSO_REDEEM_URL` — Edge only. Frontend: `VITE_MMPI_ORIGIN`, anon key.

## Kimlik ve danışan

- Eşleşme: email + `identity_links`; `global_user_id` isteğe bağlı teknik bağ
- Canonical danışan: `public.clients.id` UUID (`newClientId()` bulut varken)
- `cli_*` silinmez; map + SOAP/test/randevu/rapor + practice remap
- Dual-write çekirdek alanlar; ekstra UI alanları localStorage’da kalır

## Güvenlik testleri

Birim (`ssoPolicy`): issue/redeem, expired, replay, yanlış kullanıcı, yanlış audience, bozulmuş HMAC, HMAC replay/expired, yasak redirect, URL’de token yok.

Tarayıcı (`sso-live`, Chromium): mutlu yol (AuthGate hydrate), URL yalnızca code/state, replay, MMPI’siz kullanıcı 403, süresi dolmuş kod, bozulmuş kod, eksik kod.

`secretsGuard`: frontend kaynak/bundle’da `SSO_HMAC_SECRET=` ve `SERVICE_ROLE_KEY` yok.

## Regresyon

| Sürü | Sonuç |
| --- | --- |
| Psychology `tsc --noEmit` | geçti |
| Psychology `npm test` | 120/120 |
| Psychology `playwright` chromium (critical + yerel SSO) | 8/8 |
| Psychology SSO live browser | 7/7 |
| MMPI `tsc --noEmit` (yamalı `/tmp/mmpi`) | geçti |
| MMPI `npm test` | 722/722 (skor/OMR dahil) |

## Kalan (üretim — tam liste)

1. Cloudflare DNS: `psikolog.halilkaraduman.com.tr` A/CNAME (şu an NXDOMAIN)
2. Psychology Supabase `project_id` + `SUPABASE_ACCESS_TOKEN` (veya `supabase login`)
3. `supabase db push` (migration `20260925100000_phase1_sso_identity_clients.sql`)
4. `supabase functions deploy sso-issue` ve `sso-redeem`
5. Secrets (asla `VITE_` değil): `SSO_HMAC_SECRET` (≥32), `MMPI_SSO_ORIGIN=https://mmpi.halilkaraduman.com.tr`, `ALLOWED_ORIGINS=https://psikolog.halilkaraduman.com.tr`
6. Repo123 yazma izni; `integration/mmpi` + `phase1-repo123.patch`
7. MMPI `sso-consume` deploy + aynı HMAC + `PSYCHOLOGY_SSO_REDEEM_URL` + `ALLOWED_ORIGINS=https://mmpi.halilkaraduman.com.tr`
8. Wrangler token: Psychology frontend (SSO butonu) ve MMPI frontend (`/sso`) production build
9. Her iki Auth’ta eşleşen test kullanıcısı (aynı e-posta) + MMPI’siz yetkisiz hesap
10. Canlı tarayıcı turu: login → kod → MMPI session; replay; expired; 403; URL’de token yok

PHASE 2 başlatılmadı.
