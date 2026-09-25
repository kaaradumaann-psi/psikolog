# PHASE 7 — Uygulama Planı (P0 Klinik Veri Mimarisi + İzolasyon + RLS + Klinik Zincir + İmza/Kilit)

Başlangıç kabulü: `MASTER_SYSTEM_AUDIT.md` (PHASE 0–6). Bu plan yalnızca auditte **P0/P1** olarak ölçülen sorunları kapatır; yeni klinik özellik eklemez.

## Kesin mimari kararlar (kullanıcı talimatı)

| Karar | Uygulama |
|---|---|
| İzolasyon | `owner psychologist → own clinical data`. A, A'nın verisini görür/yazar; B'nin verisine SELECT/INSERT/UPDATE/DELETE edemez. `ADMIN` platform geneli, `ORG_ADMIN` kendi kurumu (mevcut rol modeli korunur). Kurum içi paylaşım bu fazda **yok**. |
| Formülasyon / Güvenlik planı | Ayrı tablolar: `formulations`, `safety_plans` (FK + ownership + RLS + audit + created_by/updated_by + version). |
| İmza/Kilit | `draft → signed → locked`. Zorunlu değil, kullanıcı "İmzala ve Kilitle" der. Kilitli kayıt DB seviyesinde korunur; düzeltme = yeni revizyon (amendment). |

## Alt fazlar

| Alt faz | Kapsam | Çıktı |
|---|---|---|
| P0-2 | Ownership + RLS (7 boşluk) | `20260925100000_phase07_ownership_rls.sql`, RLS matris testleri |
| P0-3 | Klinik veri kalıcılığı (Supabase source of truth) | `src/clinical/cloud/*` (row map + port + sync), store entegrasyonu |
| P0-4 | Appointment → Session → Note | `sessions.appointment_id`, UI "Randevudan görüşme oluştur" |
| P0-5 | Audit + imza/kilit/revizyon | `sessions`/`formulations`/`safety_plans`/`reports` durum kolonları + DB trigger + audit action'ları |
| P0-6 | localStorage migration + cache izolasyonu | `psikolog:{org}:{user}:*` cache anahtarları, logout temizliği, tek yönlü içe aktarma |
| P0-7 | Storage / belgeler | `client-documents` kovası + client bazlı storage RLS + metadata tablosu kullanımı |
| P0-8 | Regresyon + güvenlik + doğrulama | `docs/PHASE-7-REPORT.md` |

## Migration listesi (hepsi non-destructive)

| Migration | Amaç | Tablolar | Destructive? |
|---|---|---|---|
| `20260925100000_phase07_ownership_rls.sql` | Sahiplik kolonu + 7 RLS boşluğu + storage ownership | clients, appointments, sessions, anamneses, assessments, test_administrations, test_results, reports, report_versions, documents, notes, tasks, psychologist_settings, profiles, storage.objects | Hayır (ADD COLUMN + backfill + policy) |
| `20260925110000_phase07_formulations_safety_plans.sql` | Yeni klinik tablolar | formulations, safety_plans | Hayır (CREATE TABLE) |
| `20260925120000_phase07_session_chain_lock.sql` | Randevu→seans bağı + imza/kilit/revizyon | sessions, appointments, reports, formulations, safety_plans | Hayır (ADD COLUMN + index + trigger) |

## Veri akışı (hedef)

```
UI → store (in-memory + namespaced cache) → repository (row map) → port → Supabase (RLS)
                                         ↘ başarısızsa outbox (retry), UI'da "kaydedilemedi"
```

- `localStorage` = cache/draft/outbox; kalıcı klinik gerçeklik **Supabase**.
- Yazma başarısızsa kullanıcıya "Kaydedildi" gösterilmez.
- Oturum kapanınca kullanıcıya ait klinik cache temizlenir.

## Test stratejisi

| Katman | Araç | PASS iddiası |
|---|---|---|
| RLS/IDOR matrisi | PGlite (gerçek PostgreSQL) | `LOCAL/PGlite PASS` |
| Repository + kalıcılık | PGlite (SQL seviyesinde Supabase yerine) | `LOCAL/PGlite PASS` |
| Kilit/revizyon | PGlite trigger | `LOCAL/PGlite PASS` |
| Cache izolasyonu/logout | node:test (bellek localStorage) | `UNIT PASS` |
| Live Supabase | erişim yok → | `BLOCKED` |
| Gerçek tarayıcı | Chromium indirilemiyor → | `BLOCKED` |

Mock ile production PASS iddia edilmez; her rapor satırı hangi katmana ait olduğunu yazar.
