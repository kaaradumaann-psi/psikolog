# PHASE 7 / P0-8 — LIVE VALIDATION Raporu

Tarih: 2026-09-25 · Dal: `arena/01a0d937-psikolog` · Durum: **BLOCKED**

Bu belge yalnızca **canlı doğrulama** (P0-8) katmanını raporlar ve diğer katmanlardan
kesin olarak ayrılır:

| Katman | Sonuç | Kanıt |
|---|---|---|
| **LOCAL / PGlite** | **PASS** | `npm test` 137/137, `phase7RlsMatrix` 14/14, `phase7LockChain` 11/11 |
| **LIVE SUPABASE** | **BLOCKED** | Ağ erişimi yok (aşağıdaki ölçümler) |
| **REAL BROWSER** | **BLOCKED** | Playwright Chromium ikilisi yok |
| **PRODUCTION** | **NOT VERIFIED** | Dağıtım ortamına çıkılmadı |

> `PGlite PASS — Production NOT VERIFIED` **ile** `LIVE SUPABASE VERIFIED` aynı şey değildir.
> PHASE 7 bu nedenle **COMPLETE değildir**.

---

## 1. Ortam tespiti (bu turda yapılanlar)

| Kontrol | Sonuç |
|---|---|
| Supabase CLI sürümü | `supabase@2.118.0` (npx ile çalışıyor) |
| CLI oturumu (`~/.supabase`, `SUPABASE_ACCESS_TOKEN`) | **Oturum YOK** — `SUPABASE_ACCESS_TOKEN` tanımlı değil |
| Repo link durumu (`supabase/.temp/project-ref`) | **Link YOK** — dosya mevcut değil |
| `supabase/config.toml` içindeki `project_id` | Hâlâ şablon yorumu (`# Fill project_id after supabase link …`) |
| Yerel `.env` / `.env.local` | **Yok** (yalnız `.env.example`) |
| Ortamda `SUPABASE_DB_PASSWORD` / `DATABASE_URL` | Tanımlı değil |
| Cloudflare deployment secret'ları | Bu sandbox'tan erişilemez (Wrangler oturumu yok) |

### 1.1 Ağ ölçümleri (canlı doğrulamanın neden koşulamadığı)

| Hedef | TCP 443/5432 | HTTPS/TLS | Sonuç |
|---|---|---|---|
| `afvqznjqlrcoxoalkczd.supabase.co` (psikolog projesi) | TCP 443 açık | `SSL_ERROR_SYSCALL` → HTTP 000 | **Engelli** |
| `lgtahyruhyfozhueawft.supabase.co` (mmpi projesi) | — | HTTP 000 | **Engelli** |
| `api.supabase.com` (CLI login/link/management) | TCP 443 açık | HTTP 000 | **Engelli** |
| `db.afvqznjqlrcoxoalkczd.supabase.co:5432` (db push) | **Kapalı** | — | **Engelli** |
| `aws-0-eu-central-1.pooler.supabase.com` | TCP 443 açık | TLS denemesi gerekli | Port açık, ancak sır yok |
| `api.github.com`, `registry.npmjs.org`, `pypi.org` | açık | HTTP 200 | Çalışıyor (allowlist) |
| `google.com`, `raw.githubusercontent.com` | açık | HTTP 000 | Engelli |
| `psikolog.halilkaraduman.com.tr` (production site) | DNS çözülemedi | — | Erişilemez |

**Yorum:** Sandbox'ta SNI/destination tabanlı bir egress filtresi var; `*.supabase.co` ve
`api.supabase.com` TLS el sıkışması düşürülüyor, doğrudan veritabanı portu kapalı. Bu bir
kod hatası değil, **ortam kısıtıdır** — bu nedenle canlı doğrulama bu turda koşulamadı.

### 1.2 Tarayıcı durumu

- `playwright --version` → 1.63.0 (paket var)
- `~/.cache/ms-playwright` → **yok**; sistemde `chromium`, `google-chrome` → **yok**
- Sonuç: **REAL BROWSER: BLOCKED** (bu turda da değişmedi)

---

## 2. Canlı doğrulama için gereken bilgiler

### 2.1 Gerekli project ref

| Amaç | Project ref | Durum |
|---|---|---|
| **psikolog (PHASE 7 hedefi)** | `afvqznjqlrcoxoalkczd` | Link **yok** → bağlanmalı |
| mmpi projesi | `lgtahyruhyfozhueawft` | **Kapsam dışı** — PHASE 7'de MMPI işi yasak |

### 2.2 Çalıştırılması gereken komutlar

```bash
# 1) CLI oturumu (tarayıcıda onaylanan cihaz akışı; sır paylaşımı gerekmez)
npx supabase login

# 2) Projeyi bağla (DB parolası istenir; parola sohbete YAZILMAZ, CLI kendi saklar)
npx supabase link --project-ref afvqznjqlrcoxoalkczd

# 3) Uygulanacak migration'ları önce raporla
npx supabase migration list

# 4) Migration'ları uygula (4 dosya; tamamı non-destructive)
npx supabase db push --include-all
```

Yukarıdaki komutların **bu sandbox içinde çalışması için** önce platform düzeyinde
`*.supabase.co` + `api.supabase.com` egress izni gerekir (§1.1).
Alternatif: kit, ağı açık herhangi bir makinede (geliştirici makinesi/CI) çalıştırılabilir.

### 2.3 Paylaşılmasına gerek olmayan bilgiler

- `service_role` anahtarı **gerekmez**; kit yalnızca anon/publishable anahtar + test kullanıcıları kullanır.
- DB parolası yalnızca `supabase link` isteminde kullanılır (CLI saklar), sohbete yazılmaz.
- anon/publishable anahtar bu dokümana **yazılmadı**; hiçbir dosyaya da kaydedilmedi.

---

## 3. Uygulanacak migration listesi (ön rapor)

| # | Dosya | Etkilenen tablolar | Yıkıcı? |
|---|---|---|---|
| 1 | `20260925100000_phase07_ownership_rls.sql` | clients, appointments, sessions, anamneses, assessments, test_administrations, test_results, reports, report_versions, documents, notes, tasks, psychologist_settings, profiles, storage.objects | **Hayır** |
| 2 | `20260925110000_phase07_formulations_safety_plans.sql` | formulations (yeni), safety_plans (yeni), audit_logs | **Hayır** |
| 3 | `20260925120000_phase07_session_chain_lock.sql` | sessions, reports | **Hayır** |
| 4 | `20260925130000_phase07_anamnesis_fields.sql` | clients, appointments, anamneses | **Hayır** |

- Hiçbir tablo/kolon **silinmiyor**, veri **silinmiyor**; tümü `ADD COLUMN` / `CREATE TABLE` /
  `CREATE INDEX` / politika ve trigger yenilemesi.
- Uygulama sonrası nesne kontrolü: `scripts/live-validation/verify-migrations.sql` (read-only).

---

## 4. Doğrulama kiti (bu turda hazırlandı)

| Dosya | Amaç |
|---|---|
| `scripts/live-validation/run.mjs` | AUTH + RLS + klinik zincir + kalıcılık + imza/kilit/revizyon + Storage + çıkış izolasyonu koşucusu |
| `scripts/live-validation/README.md` | Adım adım çalıştırma talimatı (proje ref, komutlar, ortam değişken adları) |
| `scripts/live-validation/seed-live-test-orgs.sql` | Test kurumları + A/B/admin rol ataması (idempotent, yıkıcı değil) |
| `scripts/live-validation/verify-migrations.sql` | Migration nesne kontrolü (read-only) |

Doğrulanan davranış (bu sandbox'ta):

- `node --check scripts/live-validation/run.mjs` → **sözdizimi OK**
- `node scripts/live-validation/run.mjs --dry-run` → **ortam kontrolü çalışıyor**, eksik değişkenleri listeliyor,
  ağ çağrısı yapmıyor (çıkış kodu 0)
- Kit **sır yazmaz**: yalnızca ortam değişkeni/`.env.live` okur; anahtarları ekrana basmaz;
  ürettiği `live-validation-result.json` yalnızca durum ve kimlik bilgisi içerir.

Kitin kapsadığı ölçümler (istenen liste ile birebir):

- **AUTH:** psikolog A, psikolog B, admin, anon
- **RLS:** A→A SELECT/INSERT/UPDATE/DELETE PASS; A→B ve B→A DENY; Admin yetkili kapsam PASS; anon DENY
- **CLINICAL DATA:** Client → Appointment → Session → Note → Anamnesis → Formulation → Safety Plan → Test Result → Report
- **PERSISTENCE:** yeni istemci oturumu ile sunucudan geri okuma (istemci önbelleği sıfırlanmış senaryo;
  **tarayıcı testi değildir**)
- **SIGN/LOCK:** DRAFT update PASS, SIGN PASS, LOCK PASS, locked UPDATE/DELETE DENY, amendment/revision PASS
- **STORAGE:** A upload/read PASS; B read/update/delete A DENY
- **LOGOUT:** A çıkış → B girişinde A verisi yok → A yeniden girişte veri var

---

## 5. Sonuç ve sonraki adım

1. Ağ erişimi (veya ağı açık bir makine) sağlanır,
2. `supabase login` + `supabase link --project-ref afvqznjqlrcoxoalkczd` + `supabase db push --include-all` çalıştırılır,
3. test kullanıcıları ve `seed-live-test-orgs.sql` uygulanır,
4. `node scripts/live-validation/run.mjs` koşulur,

sonrasında bu belge ve `docs/PHASE-7-REPORT.md` gerçek sonuçlarla güncellenecektir.

**Bu adımlar tamamlanana kadar:** `LIVE SUPABASE: BLOCKED`, `REAL BROWSER: BLOCKED`,
`PRODUCTION: NOT VERIFIED` ve **PHASE 7 COMPLETE DEĞİLDİR**.

---

## 6. Sır saklama beyanı

- Bu turda hiçbir anahtar/parola **dosyaya yazılmadı** (ne repoda ne `/home/user` altında).
- Sağlanan anon/publishable anahtarlar hiçbir rapora, koda, `.env` dosyasına veya çıktıya **basılmadı**.
- Kit yalnızca ortam değişkenlerini okur; kalıcı kayıt oluşturmaz.
