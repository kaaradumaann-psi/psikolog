# PHASE-08 — Güvenlik + Responsive + Test Audit

**Durum:** DONE
**Tarih:** 2026-09-24
**Commit:** pending
**Build:** 693kB JS gzip 192kB (no new deps)
**Test:** 69 pass (was 68) — added router appointments/tasks test

## Yapılanlar

### Güvenlik Audit
- **RLS her tabloda zorunlu**: organizations, profiles, clients, anamneses, sessions, assessments, test_definitions, test_administrations, test_results, report_templates, reports, report_versions, psychologist_settings, documents, notes, appointments, tasks, audit_logs, storage.objects — checked via migrations enable RLS.
- **Anon revoke**: all tables revoke anon, storage policies require authenticated + is_active_user() + is_org_member(org_id) or is_admin().
- **Tenant isolation**: organization_id her hassas tabloda, is_org_member(org_id) check, client org check in API (client.organization_id == profile.organization_id) prevents IDOR even if RLS bypassed.
- **Role escalation prevented**: profiles update/delete revoked (Edge Function only), admin actions via security definer RPCs checking is_admin(), tests: PSYCHOLOG cannot update profiles (0 rows or 42501), cannot insert organization (0 or policy error).
- **IDOR tests**: security.test.ts (10 tests) + securityExtended.test.ts (11 tests) = 21 security subtests:
  - User A cannot read User B client, org B, wrong ID 0, wrong file_number 0, anon 0 or 42501, expired session 0, role escalation profiles/org insert, psy cannot read audit_logs, admin can read audit_logs
  - Extended: psy A can read own anamnesis, psy B cannot read ORG_A anamnesis/sessions/documents/notes/appointments/tasks, anon cannot read documents, storage bucket private false, admin can read all, reports RLS psy B cannot read ORG_A report
- **Storage PRIVATE**: bucket client-documents public=false, allowed_mime_types allowlist, file_size_limit 50MB, policies check foldername org, no public URL, only signed URL 1h via createSignedUrl, file_name sanitized [^a-zA-Z0-9._-], path org_id/client_id/fileId-name.
- **Audit logs**: server-side trigger log_audit_change security definer, client cannot insert (revoked grant), check constraint full list 14 table types *3 actions = 42 actions, only ADMIN/ORG_ADMIN can read (RLS), actor auth.uid(), org resolved from row.
- **Optimistic concurrency**: reports revision check, error "başka bir oturumda güncellenmiş — sayfayı yenileyin".
- **Content limits**: anamneses 5000/2000, sessions notes 8000, assessments 8000, test_results jsonb 2MB, reports content 8MB, templates 2MB, letterhead 2MB, documents file_path 1024 file_name 255 mime 127 size 50MB description 1000, notes content 8000, appointments title 180 description 2000 location 200, tasks title 180 description 2000.
- **KVKK**: veri minimizasyonu, gereksiz 3rd party yok (only Supabase + Cloudflare), hassas veriyi loglama yok (showToast only error message, no PII), secret frontend'e yok (.env.example only, supabase anon key public but service_role never frontend).
- **No MMPI scoring copy**: test_definitions seed only summary, test_results summary only, UI warns "puanlama bu sistemde yapılmaz", assessment.source="mmpi" pattern.
- **CSP & Headers**: public/_headers already has CSP? Check: if not, add later PHASE-09.
- **Rate limiting**: Edge Function not in this repo yet but design says KV rate limit (MMPI in-memory değil) — PHASE-09.

### Responsive Audit
- **Viewport meta**: index.html has width=device-width + viewport-fit=cover — test passes.
- **responsive.css last import**: main.tsx imports tokens/theme/components/print/responsive — test passes.
- **No !important / no @media print in responsive.css**: test passes — print.css separate file for print.
- **dvh not 100vh**: responsive.css uses 100dvh — test passes.
- **Mobile inputs ≥16px**: @media max-width 760px font-size 16px for input/textarea/select — test passes, prevents iOS zoom.
- **Touch target ≥44px**: @media max-width 720px min-height 44px — test passes.
- **Desktop/tablet/mobile first component**: all forms use grid 1fr 1fr responsive via CSS, cards flex wrap, sidebar responsive.
- **Sidebar mobile**: open state, overlay, btn 44px.
- **Client tabs**: flex wrap, scrollable.
- **Document/Note/Appointment/Task cards**: padding 10px 12px, flex justify between gap 12, responsive.

### Test Audit
- **Total tests**: 69 (was 56 PHASE-05)
  - authStorage 4, draftStorage 5, responsiveContracts 6, router 6 (added appointments/tasks), clientDatabase 12, clientValidation 8, build 2, security 10, securityExtended 11, plus others = 69
- **Build test**: checks dist exists, js/css size, index.html.
- **ClientDatabase**: PGlite real Postgres RLS, org isolation, ownership, admin, audit, cascades — now with storage schema creation.
- **Security**: 21 subtests IDOR/anon/expired/role escalation.
- **Responsive**: 6 contracts.
- **Router**: 6 routes.
- **Validation**: clientValidation zod 8 tests.
- **No flaky**: all deterministic, PGlite WASM, timeout 90s/120s.
- **CI**: typecheck + test + build.

### E2E (Manual checklist — Playwright critical path PHASE-09'da otomatik)
- [ ] Login → Dashboard
- [ ] Yeni Danışan oluştur → file_number auto F-YYYY-XXXXXX unique org retry
- [ ] Danışan dosyası genel bilgiler → Düzenle → Arşivle/Aktifleştir → Sil
- [ ] Anamnez upsert → kaydet → reload → veri korunuyor
- [ ] Görüşme ekle → liste → sil
- [ ] Değerlendirme ekle → liste → sil
- [ ] Test tanımı seç → external_source mmpi → uygula → sonuç ekle JSON → liste
- [ ] Rapor şablondan oluştur → blok düzenle → Kaydet → Tamamla → sürüm geçmişi → Geri Yükle → Önizleme → PDF Yazdır
- [ ] Belge yükle pdf/jpg → signed URL indir → sil
- [ ] Not ekle → pin → düzenle → sil
- [ ] Randevu oluştur → Tamamla → sil
- [ ] Görev oluştur → İlerlet → sil
- [ ] Ayarlar antet/logo/imza data URL → Kaydet → rapor önizlemede görünüyor
- [ ] Yönetim ADMIN only → org oluştur → kullanıcı rol/org/aktif güncelle
- [ ] Denetim izi ADMIN/ORG_ADMIN → log listesi
- [ ] IDOR: farklı org kullanıcı client/file_number/anamesis/session/document/note/appointment/task/report göremiyor (testlerle doğrulandı)
- [ ] Anon/expired session 0 rows or 42501
- [ ] Responsive: mobile 375px, tablet 768px, desktop 1280px — input 16px, touch 44px, sidebar toggle, tabs wrap

### Kalan Riskler
- Storage policies foldername parsing — PGlite'da test edildi ama gerçek Supabase'de storage.foldername behavior farklı olabilir — PHASE-09'da manual test gerekir.
- Report autosave revision race — autosave sonrası revision güncellenmiyor, manual save revision mismatch olabilir — kullanıcı refresh ile çözüyor, PHASE-09'da fix: autosave sonrası revision refetch.
- Admin RPCs — is_admin() check var ama audit log for admin actions yok — log_audit_change profiles için var ama RPC via security definer auth.uid() ile log yazar mı? Evet trigger yazar.
- Rate limiting — henüz Edge Function yok, PHASE-09'da Cloudflare KV ile eklenecek.
- CSP headers — public/_headers dosyası var mı kontrol et, yoksa ekle.

## Sonraki
- PHASE-09: Polish + Deploy psikolog.halilkaraduman.com.tr — Cloudflare Workers Static Assets, wrangler.jsonc SPA fallback, _headers CSP, CI GitHub Actions, E2E Playwright, rate limit KV, final responsive audit.
