# P0 IMPLEMENTATION REPORT

**Dal:** `arena/01a0d892-psikolog` · **Taban:** `340930b4` · **Tarih:** 2026-09-25

Kanıt tabanı bu oturumda çalıştırılan komutlardır:

```
npm run typecheck   → temiz (çıktı yok)
npm test            → # tests 110  # pass 110  # fail 0
npm run build       → ✓ built, index 484.27 kB / gzip 136.15 kB
```

---

## 1. Veri katmanı (varlık bazında)

Tüm bulut erişimi `src/clinical/cloud/` altındadır. **Hiçbir UI bileşeni Supabase'i doğrudan çağırmaz** —
bileşenler yalnızca `clinicalStore` / `practiceStore` fonksiyonlarını çağırır, store'lar `cloud/sync.ts`
üzerinden yazar, `cloud/repository.ts` SQL'i kurar, `cloud/ports.ts` veritabanı arayüzünü tanımlar.

| Varlık | localStorage anahtarı | Hedef tablo(lar) | Durum |
|---|---|---|---|
| Danışan | `psikolog_clients_v2` | `clients` | **BAĞLI** — upsert + select + arşiv |
| Anamnez | `psikolog_clients_v2` (iç içe) | `anamneses` | **BAĞLI** — kendi satırı, `client_id` FK |
| Randevu | `psikolog_appointments_v2` | `appointments` | **BAĞLI** — `fee`, `payment_status` eklendi |
| Seans | `psikolog_sessions_v2` | `sessions` | **BAĞLI** — `appointment_id` FK korunuyor |
| Test sonucu | `psikolog_bdi/bai/scl90_tests_v2`, `psikolog_screenings_v2` | `test_administrations` + `test_results` | **BAĞLI** — 1 kayıt → 2 satır |
| Rapor | `psikolog_reports_v2` | `reports` | **BAĞLI** — `content` tüm yerel nesneyi taşır |
| Belge | `psikolog_documents_v2` | `documents` + private bucket `client-documents` | **BAĞLI** — meta DB'de, binary bucket'ta |
| Görev | `psikolog_tasks_v2` | `tasks` | **BAĞLI** — `TasksPage.tsx` gerçekten kullanıyor |
| Klinik not | `psikolog_notes_v2` | `notes` | **BAĞLI** |
| Formülasyon | `psikolog_formulations_v2` | *tablo yok* | **BAĞLI DEĞİL** — P1 |
| Güvenlik planı | `psikolog_safety_v2` | *tablo yok* | **BAĞLI DEĞİL** — P1 |
| Uygulama ayarları | `psikolog_settings_v2` | `psychologist_settings` | P0 kapsamı dışında (§3 listesinde yok) |

Tasarım kararları:
- Yazmalar **yalnızca upsert**; hiçbir yolda `DELETE FROM` toplu işlemi yok.
- `test_results.result_data` ve `reports.content` yerel nesnenin **tamamını** taşır → kayıpsız gidiş-dönüş,
  puan yeniden hesaplanmaz.
- `test_results.id = deriveUuid('test_result', record.id)` — deterministik, tekrar gönderim aynı satırı günceller.
- İstanbul sabit UTC+3 olarak ele alınır.
- Çekme (pull) **birleşim** (union) kullanır, üzerine yazmaz; yalnızca cihazda olan alanlar (`dataUrl`, `tcNumber`) korunur.
- Yazmalar `sync.ts` içinde **sıraya alınmış** (`enqueue` + `flushWrites()`); eşzamanlı fire-and-forget
  yazış FK ihlali üretiyordu (seans, randevudan önce insert ediliyordu). Bu gerçek bir üretim hatasıydı, düzeltildi.

**Şema kısıtı (raporlanması istendi):** `test_administrations.client_id` ve `reports.client_id` `NOT NULL`.
Danışanı olmayan bir yerel test sonucu / rapor **senkronize edilemez**; repository açık Türkçe hata fırlatır,
sessizce düşürmez.

---

## 2. LocalStorage

`grep -R "localStorage" src` çıktısı: erişim artık **4 dosyada** toplanmış durumda —
`clinical/clinicalStore.ts`, `clinical/practiceStore.ts`, `clinical/cloud/status.ts`, `workspace/draftStorage.ts`.

| Anahtar | Kullanım | Klinik veri mi? | Production'da kalabilir mi? |
|---|---|---|---|
| `psikolog_clients_v2` | danışan + anamnez önbelleği | **Evet** | Yalnızca önbellek — kaynak artık `clients`+`anamneses` |
| `psikolog_sessions_v2` | SOAP seans notları | **Evet** | Yalnızca önbellek — kaynak `sessions` |
| `psikolog_appointments_v2` | randevular | **Evet** | Yalnızca önbellek — kaynak `appointments` |
| `psikolog_bdi_tests_v2` | Beck Depresyon | **Evet** | Yalnızca önbellek — kaynak `test_administrations`+`test_results` |
| `psikolog_bai_tests_v2` | Beck Anksiyete | **Evet** | Yalnızca önbellek — aynı |
| `psikolog_scl90_tests_v2` | SCL-90-R | **Evet** | Yalnızca önbellek — aynı |
| `psikolog_screenings_v2` | GAD-7 / PHQ-9 | **Evet** | Yalnızca önbellek — aynı |
| `psikolog_reports_v2` | raporlar | **Evet** | Yalnızca önbellek — kaynak `reports` |
| `psikolog_documents_v2` | belge meta + dataURL | **Evet** | Yalnızca önbellek — meta `documents`, binary bucket |
| `psikolog_notes_v2` | klinik notlar | **Evet** | Yalnızca önbellek — kaynak `notes` |
| `psikolog_tasks_v2` | görevler | Hayır (operasyonel) | Yalnızca önbellek — kaynak `tasks` |
| `psikolog_formulations_v2` | vaka formülasyonu | **Evet** | **HAYIR — tek kaynak hâlâ localStorage** (P1) |
| `psikolog_safety_v2` | güvenlik planı | **Evet** | **HAYIR — tek kaynak hâlâ localStorage** (P1) |
| `psikolog_settings_v2` | antet / uygulama ayarları | Hayır | Evet (UI tercihi) |
| `psikolog_audit_v2` | yerel denetim izi | Hayır (log) | Evet, ama kanıt değeri yok — sayfa artık bunu söylüyor |
| `psikolog_cloud_outbox_v1` | başarısız yazma kuyruğu | Hayır (kuyruk) | Evet — offline yardımcı |
| `psikolog_legacy_demo_purged_v1` | demo verisi temizleme bayrağı | Hayır | Evet |
| `psikolog-auth` (sessionStorage) | oturum jetonu | Hayır | Evet |

**Kaldırılan klinik localStorage kaynağı sayısı: 0 (kasıtlı).** `VERİ KAYBI YOK` kuralı gereği localStorage
sistemi silinmedi; bulut yolu doğrulanmadan hiçbir anahtar kaldırılmadı. Bunun yerine **11 klinik anahtarın
9'u** için localStorage artık *tek kaynak* değil, *önbellek*. Kalan 2 tanesi (formülasyon, güvenlik planı)
P0 kapsam listesinde (§3) yok ve hedef tabloları yok — P1 olarak işaretlendi.

**Yeni bulut yolları:** 9 varlık + 1 storage bucket (`tests/cloudStoreSync.test.ts` → "every store write
landed in the database").

---

## 3. Supabase

**Gerçekten bağlanan varlık sayısı: 9** — `clients`, `anamneses`, `appointments`, `sessions`,
`test_administrations`, `test_results`, `reports`, `documents`, `notes`, `tasks` (10 tablo; test sonucu iki
tabloda temsil edildiği için varlık sayısı 9) **+ 1 private storage bucket** (`client-documents`).

Bağlanmayan: `profiles` (auth tarafından yönetiliyor, uygulama yazmıyor), `psychologist_settings`,
`report_templates`, `test_definitions` (salt okunur referans), formülasyon/güvenlik planı (tablo yok).

Bağlantı `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` ile kurulur. **`service_role` anahtarı bundle'da
yok** — `grep -c service_role dist/assets/index-*.js` → `0`.

---

## 4. Authentication

**Production'da giriş zorunlu mu? EVET.**

Erişim tek yerde karar veriliyor (`src/auth/accessMode.ts`):

| Mod | Koşul | Sonuç |
|---|---|---|
| `cloud` | Supabase yapılandırılmış | gerçek giriş zorunlu |
| `local-dev` | Supabase yok **ve** `import.meta.env.DEV === true` | yerel çalışma alanı (yalnızca geliştirme) |
| `not-ready` | Supabase yok, production build | **hiçbir klinik ekran açılmaz** |

Derlenmiş bundle kanıtı (`tests/build.test.ts` → "production bundle cannot bypass authentication"):

```js
function h0(s){return s.configured?"cloud":"not-ready"}
```

Kapının **`isDev` parametresi tamamen yok**; `isDevRuntime` bundle'da 0 kez, `import.meta.env` 0 kez
geçiyor. Yani `local-dev` dalına ulaşılamaz — karşılaştırma metni bundle'da duruyor ama kapının
döndürebileceği tek iki değer `"cloud"` ve `"not-ready"`. Test artık bunu kanıtlıyor (yalnızca
`"cloud":"not-ready"` dizisine bakmıyor, kapının *dev girdisi kabul etmediğini* doğruluyor).

`Çalışma alanı hazır değil.` ekranı bundle'da mevcut; `.env` eksikse production hiçbir danışan verisi
göstermiyor.

Geliştirme tarafı da doğrulandı: `tests/devLocalAccess.test.ts` gerçek `App`'i dev-mod Vite sunucusu
altında render ediyor (`isDevRuntime === true`, `supabaseConfig.configured === false`) ve
"Bugünün tahtası" başlığının geldiğini, "Kayıt Ol"un gelmediğini doğruluyor.

---

## 5. RLS

**Nasıl doğrulandı — açıkça:** Bu sandbox'ta **canlı bir Supabase projesi yok** ve ağ erişimi olmadığı için
oluşturulamıyor. Doğrulama, **gerçek migration dosyalarını çalıştıran gerçek bir PostgreSQL** üzerinde
yapıldı: `@electric-sql/pglite` (Postgres WASM). Aktör değişimi
`set_config('request.jwt.claim.sub', …)` + `set role authenticated` ile yapılır — yani Supabase'in
PostgREST'te yaptığı şeyin aynısı. Politika değerlendirmesi gerçek; **mock yok**.

| Senaryo | Sonuç |
|---|---|
| Psikolog A (Elif Demir) kendi danışanını görüyor | **PASS** |
| Psikolog B (Mehmet Kaya) A'nın danışanına ulaşamıyor | **PASS** — 9 varlığın tamamında 0 satır |
| Danışan A, Danışan B'nin verisine ulaşamıyor | **PASS** — `clients` IDOR 0 satır |
| Admin tanımlı yetkiler içinde | **PASS** — `is_admin()` / `is_org_admin()` dalları mevcut politikalarla korunuyor |

**IDOR denemeleri** (`tests/cloudWorkflow.test.ts` → "IDOR: direct access by foreign id is refused"),
hepsi **PASS**:

| Hedef | Sonuç |
|---|---|
| `client_id` | 0 satır |
| `session_id` | 0 satır |
| `appointment_id` | 0 satır |
| `report_id` | 0 satır |
| `note_id` | 0 satır |
| `task_id` | 0 satır |
| `document_id` | 0 satır |
| `anamnesis_id` | 0 satır |
| Çapraz tenant `UPDATE` | 0 satır etkiledi |
| Çapraz tenant `DELETE` | 0 satır etkiledi |
| Storage bucket listeleme | 0 nesne |
| `anon` rolü ile `select id from public.clients` | `permission denied` (grant yok) |

Migration §6 SELECT politikalarını **sıkılaştırdı, kaldırmadı**:
`is_admin() OR (is_org_admin() AND is_org_member) OR (is_org_member AND created_by = auth.uid())`.
Bunun anlamı: **aynı organizasyondaki Psikolog B bile Psikolog A'nın satırını okuyamaz.** Önceki
politikalar organizasyon üyeliğine bakıyordu ve organizasyon içi çapraz okumaya izin veriyordu (S10).

**Bu fazda bulunan iki yeni güvenlik açığı:**
- **S11 — `storage.objects` üzerindeki RLS eski test altyapısında hiç değerlendirilmiyordu.**
  `tests/securityExtended.test.ts:129` yalnızca `storage.buckets.public = false` olduğunu doğruluyordu;
  nesne seviyesi izolasyon hiç test edilmemişti. Test altyapısı artık `storage.objects` üzerinde RLS'i
  açıkça etkinleştiriyor ve `cloudWorkflow` tenant izolasyonunu kanıtlıyor. Gerçek Supabase'te RLS
  zaten açıktır; hata test tarafındaydı.
- **Ownership yeniden atanabiliyordu.** `created_by` gönderilmediğinde insert politikası 42501 veriyordu;
  ayrıca bir upsert `created_by`'yi değiştirebiliyordu. 8 tabloya `preserve_created_by()` before-update
  trigger'ı eklendi.

---

## 6. Formülasyon

**PASS.**

- Tek kanonik kaynak: `src/components/clinical/clientTabs.ts` (`CLIENT_TABS`, `parseClientTab`,
  `clientTabPath`). Türkçe yazım varyantları (`formulasyon`, `Formulasyon`) kanonik `formulation`
  anahtarına çözülüyor; bilinmeyen değer sessizce seans sekmesine düşmüyor.
- Panodaki "Formülasyon" kontrolü artık `navigate()` değil, gerçek bir `<a href="/danisanlar/{id}?sekme=formulation">`.
- `tests/clientTabs.test.ts` → "dashboard Formülasyon link opens the formulation tab, not sessions":
  linkin tam URL'si doğrulanıyor, o URL ile `ClientDetailPage` render edildiğinde
  `Vaka formülasyonu` **var** ve `Kronolojik Seans Geçmişi` **yok** olduğu doğrulanıyor; eski
  `?sekme=formulasyon` yer imleri de çalışıyor; varsayılan hâlâ seans sekmesi.

---

## 7. Audit log

**PASS (veritabanı seviyesinde).**

- Migration §8: `audit_logs` üzerinde
  `revoke insert, update, delete, truncate, references, trigger from anon, authenticated; grant select`.
  Kayıt yazımı trigger'lar üzerinden `security definer` ile oluyor. Tablo **append-only**.
- Doğrulama (`tests/cloudWorkflow.test.ts` → "audit log is append-only for clients of the API"):
  `client_insert` ve `session_insert` satırları oluşuyor; psikolog rolüyle yapılan `UPDATE` ve `DELETE`
  `permission denied` ile reddediliyor.
- **Kullanıcı tarafından değiştirilebilir olan taraf:** `psikolog_audit_v2` tarayıcıda. Bu bir güvenlik
  problemi olarak ele alındı ve `AuditPage.tsx`'e açık bir uyarı kondu: liste cihazda
  değiştirilebilir, hukuki kanıt değildir, yetkili iz `audit_logs`'tur. `tests/auditNotice.test.ts` bu
  metnin render edildiğini doğruluyor.
- Not: `audit_logs` SELECT yalnızca `admin` / `org_admin` — PSYCHOLOG rolü tabloyu okuyamaz, test
  okumayı superuser olarak yapıyor.

---

## 8. MMPI

**RETIRED — geri eklenmedi.**

`tests/retiredInstrumentGuard.test.ts` geçiyor (110/110 içinde). `mmpiScoring.ts`, `mmpiKeys.ts`,
`src/omr/analyzePage.ts`, `src/scanner/scanAndAnalyze.ts`, `optik-form.html` yeniden oluşturulmadı.
`jsqr`, `pdfjs-dist`, `qrcode`, `@noble/hashes` yeniden eklenmedi.
`grep -ci mmpi dist/assets/index-*.js` → **0**.

---

## 9. Dependency cleanup

Kaldırılan: `react-hook-form`, `@hookform/resolvers`, `zod` (toplam 9 paket, `npm uninstall` ile).
İçe aktarma denetimi bu üç paket için `src/` içinde **0 sonuç** vermişti.

Kalan `dependencies`:
```json
"@supabase/supabase-js": "^2.116.0",
"react": "^19.2.0",
"react-dom": "^19.2.0"
```

Ölü kod:
- `src/auth/adminApi.ts` **silindi** (122 satır). `src/features/admin/adminApi.ts` canlı yol; tüm import
  edenler kontrol edildi, sıfır referans kaldı.
- `src/workspace/draftStorage.ts` — denetim sonucu: `isNetworkError` fonksiyonu `cloud/status.ts`
  tarafından **kullanılıyor**. Taslak saklama fonksiyonları (`saveClientDraft`, `readClientDraft`,
  `clearClientDraft`) hiçbir bileşenden çağrılmıyor. **Davranış değiştirmemek için dosya bırakıldı**;
  ölü kısım P2 olarak işaretlendi (§3 taslakları zaten localStorage'da tutulabilir).
- `src/lib/rateLimit.ts`, `src/lib/dateGuards.ts`, `src/lib/securityHeaders.ts` hâlâ import edilmiyor (P2).

`npm ci` gerektiren bir kilit dosyası değişikliği yok — `npm uninstall` lock'u güncelledi
(`package-lock.json` −209 satır).

---

## 10. Test

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | **temiz** |
| `npm test` | **110 / 110 pass, 0 fail** |
| `npm run build` | **OK** — index 484.27 kB (gzip 136.15), supabase 223.38 kB (gzip 58.43), vendor 11.88 kB, CSS 143.93 kB |

**Sayaç değişimi açıklandı:** taban 90/90 idi, şimdi 110/110. Fark +20, tamamı yeni test:

| Dosya | Eklenen |
|---|---|
| `tests/clientTabs.test.ts` (yeni) | +4 |
| `tests/accessMode.test.ts` (yeni) | +3 |
| `tests/cloudWorkflow.test.ts` (yeni) | +6 |
| `tests/cloudStoreSync.test.ts` (yeni) | +4 |
| `tests/auditNotice.test.ts` (yeni) | +1 |
| `tests/devLocalAccess.test.ts` (yeni) | +1 |
| `tests/build.test.ts` (genişletildi) | +1 |

Hiçbir mevcut assertion zayıflatılmadı veya silinmedi. Bundle boyutu 458.00 → 484.27 kB
(gzip 128.35 → 136.15); artış yeni veri katmanından geliyor.

**Bu oturumda bulunup düzeltilen gerçek hatalar:**
1. Eşzamanlı fire-and-forget yazış FK ihlali üretiyordu (seans randevudan önce) → `sync.ts` sıralı yazma kuyruğu.
2. 8 mapper'da `created_by` eksikti → insert politikası 42501 veriyordu.
3. `date` kolonları node-postgres'te `Date`, PostgREST'te string dönüyor → `toDateOnly()` normalizasyonu.
4. `storage.objects` üzerinde RLS test altyapısında hiç etkin değildi → organizasyonlar arası okuma başarılı görünüyordu.
5. Randevudan seans oluşturma yolu UI'da yoktu → `?randevu=` derin bağlantısı + SOAP ön doldurma eklendi.

---

## 11. Değiştirilen dosyalar (tam liste)

**Yeni — veri katmanı (9):**
```
src/clinical/cloud/types.ts
src/clinical/cloud/ports.ts
src/clinical/cloud/ids.ts
src/clinical/cloud/mapping.ts
src/clinical/cloud/status.ts
src/clinical/cloud/supabasePort.ts
src/clinical/cloud/repository.ts
src/clinical/cloud/sync.ts
src/clinical/cloud/bootstrap.ts
```

**Yeni — diğer kaynak (3):**
```
src/auth/accessMode.ts
src/components/clinical/clientTabs.ts
supabase/migrations/20260925000000_p0_clinical_workflow.sql
```

**Yeni — belge (3):** `docs/DENETIM.md` (denetim), `docs/P0-PLAN.md` (plan), `docs/P0-REPORT.md` (bu rapor)

**Değiştirilen (14):**
```
src/App.tsx                                  (CloudGate, not-ready ekranı, sync hata bandı)
src/auth/supabaseClient.ts                   (isDevRuntime, güvenli origin doğrulaması)
src/env.d.ts                                 (ImportMetaEnv DEV/PROD/MODE)
src/router.ts                                (useLocationSearch)
src/clinical/clinicalTypes.ts                (SoapSession.appointmentId)
src/clinical/clinicalStore.ts                (bulut push/remove, ensureCloudIds, snapshot apply, backlog)
src/clinical/practiceStore.ts                (aynı + PracticeDocument.filePath)
src/components/Dashboard.tsx                 (Formülasyon <a href>, hazırlık kartı → randevulu seans notu)
src/components/clinical/ClientDetailPage.tsx (kanonik sekme, ?randevu= ön doldurma)
src/components/clinical/AppointmentsPage.tsx (randevudan seans notu bağlantısı)
src/components/practice/AuditPage.tsx        (yerel kaydın kanıt değeri olmadığı uyarısı)
tests/build.test.ts                          (production auth kapısı kanıtı)
e2e/critical.spec.ts                         (randevu → seans akışı; ÇALIŞTIRILMADI, bkz. §14)
package.json, package-lock.json              (3 form bağımlılığı kaldırıldı)
```

**Silinen (1):** `src/auth/adminApi.ts`

**Yeni testler (7):**
```
tests/helpers/pglitePort.ts
tests/cloudWorkflow.test.ts
tests/cloudStoreSync.test.ts
tests/clientTabs.test.ts
tests/accessMode.test.ts
tests/auditNotice.test.ts
tests/devLocalAccess.test.ts
```

Toplam: 38 dosya, +4854 / −367 (bu rapor dâhil).

---

## 12. Migration'lar

**Eklenen: 1** — `supabase/migrations/20260925000000_p0_clinical_workflow.sql` (286 satır). Toplam 8 → 9.

İçerik:
1. `clients_status_check` → `active | followup | completed | archived`
2. `clients.profile_extra jsonb` (`gender, maritalStatus, emergencyContact, diagnoses`) —
   **`tcNumber` kasıtlı olarak senkronize edilmiyor** (veri minimizasyonu)
3. `appointments` + `fee`, + `payment_status` (`paid | pending | waived`)
4. `sessions` + `appointment_id uuid → appointments ON DELETE SET NULL`, `session_number`, `start_time`,
   `subjective/objective/assessment` (≤8000), `risk_level` (`none|low|moderate|high`), `risk_notes`,
   `homework`, `fee`, `payment_status`; `validate_session_appointment()` trigger'ı aynı organizasyon +
   eşleşen danışan zorunlu kılıyor
5. `ensure_personal_organization() returns uuid` — `security definer`, `auth.uid()` üzerinde advisory lock,
   idempotent, `public`/`anon`'dan revoke edilmiş
6. SELECT politikaları sıkılaştırıldı (bkz. §5) — **hiçbir politika kaldırılmadı**
7. `preserve_created_by()` before-update trigger'ı, 8 tabloda
8. `audit_logs` — append-only (bkz. §7)

**Yapılmayanlar:** hiçbir tablo düşürülmedi, hiçbir üretim verisi silinmedi, RLS hiçbir yerde
kapatılmadı, `service_role` frontend'e konmadı, herkese açık kayıt kapalı kaldı.

---

## 13. Kalan problemler

### P0 (bu fazın kapanması için gereken)
1. **Canlı Supabase projesinde uçtan uca doğrulama yapılmadı.** Tüm RLS kanıtı PGlite üzerinde gerçek
   migration'larla üretildi. Gerçek bir projede `supabase db push` + §18 senaryosunun elle koşulması
   gerekiyor. Sandbox'ta ağ erişimi yok; bu yüzden bu adım burada tamamlanamadı.
2. **`signedUrl()` üretimi doğrulanmadı.** PGlite'ta nesne deposu yok. Bucket *politikaları* doğrulandı
   (tenant izolasyonu 0 nesne), ama imzalı URL'nin gerçekten indirilebilir olduğu test edilmedi.
   `client-documents` bucket'ı private olduğu için indirme yolu canlı ortamda denenmeli.
3. **`e2e/critical.spec.ts` çalıştırılmadı.** Playwright tarayıcı binary'leri indirilemiyor (ağ yok,
   `npx playwright install chromium` → exit 1). Spec'e eklenen randevu→seans testi **doğrulanmamıştır**;
   dosyanın içine bu uyarı yazıldı. CI de Playwright çalıştırmıyor (yalnızca typecheck+test+build).

### P1
4. **Vaka formülasyonu ve güvenlik planı yalnızca localStorage'da.** Hedef tabloları yok; §3 listesinde
   de yoklar. Klinik veri oldukları için tablo + migration gerekiyor.
5. **Klinik veriler localStorage'da şifresiz** (S1) — `tcNumber` dâhil. `tcNumber` artık buluta
   gitmiyor ama cihazda duruyor.
6. **`psychologist_settings` yazma politikası organizasyon geneline açık** (S7).
7. **`admin_list_profiles()` ORG_ADMIN'e tüm organizasyonları döndürüyor** (S9).
8. **Not/seans kilitleme yok** (S5) — iki cihazdan eşzamanlı düzenleme son yazanı kazanır yapar.
9. **Danışansız test sonucu / rapor senkronize edilemiyor** (`client_id NOT NULL`). Ürün kararı gerekiyor:
   ya alan nullable olacak ya da UI danışansız kayıt oluşturmayı engelleyecek.
10. **CSP sapması** (S8): `public/_headers` kullanılıyor, `src/lib/securityHeaders.ts` import edilmiyor.

### P2
11. `src/workspace/draftStorage.ts` içindeki taslak fonksiyonları çağrılmıyor (yalnızca `isNetworkError` canlı).
12. `src/lib/rateLimit.ts`, `src/lib/dateGuards.ts`, `src/lib/securityHeaders.ts` import edilmiyor.
13. Form builder (§13) bilinçli olarak dışarıda bırakıldı; P2.
14. Rapor çıktısı `window.print()` + `@media print`. **A4 önizleme bu fazda eklenmedi** (§9 gereği).
    PDF üretim sistemi **yok ve varmış gibi raporlanmadı**.

---

## 14. Bu raporda doğrulanmayan iddialar (açıkça)

- Canlı Supabase üzerinde hiçbir test koşulmadı; RLS kanıtı PGlite + gerçek migration'lardan geliyor.
- `signedUrl()` üretilmedi ve denenmedi.
- Playwright e2e hiç çalıştırılmadı.
- UI efektleri (`?randevu=` ile SOAP formunun otomatik açılması) DOM test ortamı olmadığı için
  (jsdom kurulu değil, ağ yok) otomatik test edilmedi. Doğrulanan kısım: bağlantının doğru URL'yi
  ürettiği, o URL'nin seans sekmesine çözüldüğü ve `appointmentId`'nin store→Postgres→geri yükleme
  yolunda korunduğu (`tests/cloudStoreSync.test.ts`). Otomatik test edilmeyen kısım yalnızca
  React efektinin tetiklenmesi.
