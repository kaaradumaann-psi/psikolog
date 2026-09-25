# PHASE 1 — Psychology ↔ MMPI kimlik, danışan UUID, SSO

Kapsam: yalnızca PHASE 1. Kuyruk, tamamlanma callback’i, rapor senkronu ve MMPI dashboard kuyruğu **yok**.

## PHASE 1 STATUS: BLOCKED

Kod bu depoda ve `integration/mmpi/` paketinde duruyor; birim testleri, RLS PGlite, MMPI skor motoru ve gerçek tarayıcı SSO (yerel protokol sunucusu + gerçek frontend’ler) geçti. **PASS değil:** canlı Edge Function / `generateLink` / HMAC sırları bu ortamda yok; Repo123 GitHub’a uygulanmadı; üretim `psikolog.halilkaraduman.com.tr` → `mmpi.halilkaraduman.com.tr` turu çalıştırılmadı.

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

Tarayıcı (`sso-live`, Chromium): mutlu yol (AuthGate hydrate), URL yalnızca code/state, replay, MMPI’siz kullanıcı 403, eksik kod. Expired tarayıcıda birim testine bırakıldı.

`secretsGuard`: frontend kaynak/bundle’da `SSO_HMAC_SECRET=` ve `SERVICE_ROLE_KEY` yok.

## Regresyon

| Sürü | Sonuç |
| --- | --- |
| Psychology `tsc --noEmit` | geçti |
| Psychology `npm test` | 119/119 |
| Psychology `playwright` chromium (critical + yerel SSO) | 8/8 |
| Psychology SSO live browser | 5/5 |
| MMPI `tsc --noEmit` (yamalı `/tmp/mmpi`) | geçti |
| MMPI `npm test` | 722/722 (skor/OMR dahil) |

## Kalan

1. Psychology: `db push` + `sso-issue`/`sso-redeem` deploy + `SSO_HMAC_SECRET` / `MMPI_SSO_ORIGIN`
2. Repo123: `integration/mmpi` + PATCHES, `sso-consume` deploy, aynı HMAC, `PSYCHOLOGY_SSO_REDEEM_URL`
3. Üretim tarayıcı turu (GoTrue `generateLink` dahil)
4. ClientDetail “MMPI İste” ve kuyruk — PHASE 2
5. Bu sandbox’ta resmi Playwright tarayıcısı indirilemedi; E2E `/tmp/chromium` + `CHROMIUM_PATH` ile koştu

PHASE 2 başlatılmadı.
