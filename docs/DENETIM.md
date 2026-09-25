# Uçtan Uca Klinik Workflow Denetimi (PHASE 0–5)

Denetim tarihi: 2026-09-25 · Dal: `arena/01a0d892-psikolog` · Taban: `340930b`
Bu aşamada **hiçbir kod değiştirilmedi.** Tüm bulgular bu depoda çalıştırılan komutların çıktısına dayanır.

## 0. Doğrulanan taban durum

| Komut | Sonuç |
| --- | --- |
| `npm ci` | 95 paket kuruldu |
| `npm run typecheck` | temiz, hata yok |
| `npm test` | **90/90 geçti** (57 üst düzey test, 26,8 sn) |
| `npm run build` | başarılı — `index` 458,00 kB (gzip 128,35), `supabase` 223,38 kB (gzip 58,43), `vendor` 11,88 kB, CSS 143,93 kB |

Depo 120 dosya. Yığın: Vite 7 + React 19 + TypeScript 5.9, elle yazılmış yönlendirici (`src/router.ts`),
durum yönetimi olarak iki adet `localStorage` deposu, isteğe bağlı Supabase Auth.

---

## 1. Architecture map

```
index.html
  └─ src/main.tsx ── 10 CSS dosyası (8.746 satır) + installLinkInterceptor() + getClients()
       └─ App.tsx ── supabaseConfig.configured ?
            ├─ HAYIR → WorkspaceShell(LOCAL_USER)   ← giriş duvarı YOK, tamamen yerel mod
            └─ EVET  → CloudGate (Supabase Auth) → WorkspaceShell(user)
                 └─ WorkspaceShell → router'a göre 14 sayfa bileşeni

Veri katmanı (gerçek):
  src/clinical/clinicalStore.ts  → 7 localStorage anahtarı (clients, sessions, appointments, bdi, bai, scl90, reports)
  src/clinical/practiceStore.ts  → 8 localStorage anahtarı (notes, tasks, documents, settings, audit, screenings, formulations, safety)

Veri katmanı (Supabase):
  src/auth/supabaseClient.ts     → createClient(url, anonKey)
  src/auth/supabaseAuth.ts       → yalnızca `profiles` tablosu
  src/features/admin/adminApi.ts → RPC + Edge Function `admin-users`

Sunucu:
  supabase/functions/admin-users/index.ts (423 satır, Deno) — kullanıcı yönetimi
  supabase/migrations/*.sql (2.147 satır, 18 tablo) — UYGULAMA TARAFINDAN HİÇ KULLANILMIYOR
```

**Mimarinin belirleyici bulgusu:** `grep -rn "\.from('" src/` çıktısı üç satır verir ve üçü de
`profiles` tablosunadır (`supabaseAuth.ts:54`, `supabaseAuth.ts:81`, `adminApi.ts:46`).
Migration'ların oluşturduğu **18 tablonun hiçbiri** uygulama tarafından okunmaz veya yazılmaz.
Şema ile çalışan uygulama birbirinden kopuktur.

## 2. Route map

`src/router.ts` içindeki `parseRoute` çıktısı (17 eşleme):

| Yol | Sayfa | Nav'da görünür mü |
| --- | --- | --- |
| `/`, `/dashboard`, `/login`, `/index.html` | home (Dashboard) | Evet |
| `/danisanlar`, `/clients`, `/kayitlar` | danisanlar | Evet |
| `/danisanlar/:id` | danisan (ClientDetailPage) | — |
| `/seanslar` | seanslar | Evet |
| `/takvim`, `/appointments` | takvim | Evet |
| `/testler` | testler | Evet |
| `/testler/beck-depresyon` `/beck-anksiyete` `/scl90` `/tarama` | ilgili ölçek | — |
| `/raporlar` | raporlar | Evet |
| `/gorevler`, `/tasks` | gorevler | Evet |
| `/ayarlar`, `/settings` | ayarlar | Evet |
| `/denetim`, `/audit` | denetim | **Hayır — yalnızca Ayarlar'daki düğmeden** |
| `/sss` `/gizlilik` `/kullanim` `/kaynaklar` | bilgi sayfaları | Mobil menü |
| `/islem` `/form` `/optik-form.html` `/mmpi` | bulunamadi | emekliye ayrılmış |

Danışan dosyası sekmeleri `?sekme=` parametresiyle açılır; izinli değerler:
`overview, sessions, formulation, tests, progress, reports, notes, documents`.

## 3. Database / schema map

Migration'ların oluşturduğu 18 tablo ve **uygulamadaki karşılığı**:

| Tablo | Uygulama karşılığı | Durum |
| --- | --- | --- |
| `organizations` | yok (yalnız admin RPC) | Şema var, uygulama kullanmıyor |
| `profiles` | `AuthenticatedUser` | **Bağlı — tek bağlı tablo** |
| `clients` | `psikolog_clients_v2` | Şema atıl |
| `anamneses` | Client formunun alanları | Şema atıl |
| `sessions` | `psikolog_sessions_v2` | Şema atıl |
| `assessments` | yok | Şema atıl |
| `test_definitions` | yok (araçlar kodda sabit) | Şema atıl |
| `test_administrations` | yok | Şema atıl |
| `test_results` | `psikolog_bdi/bai/scl90/screenings_v2` | Şema atıl |
| `reports` | `psikolog_reports_v2` | Şema atıl |
| `report_versions` | yok | Şema atıl |
| `report_templates` | yok (şablonlar kodda sabit) | Şema atıl |
| `documents` | `psikolog_documents_v2` (data URL) | Şema atıl |
| `notes` | `psikolog_notes_v2` | Şema atıl |
| `appointments` | `psikolog_appointments_v2` | Şema atıl |
| `tasks` | `psikolog_tasks_v2` | Şema atıl |
| `psychologist_settings` | `psikolog_settings_v2` | Şema atıl |
| `audit_logs` | `psikolog_audit_v2` | Şema atıl |

Olması gerekip **hiç olmayan** tablolar: `forms`, `messages`, `payments`, `treatment_plans`,
`timeline`/`events`, `consents`. (`grep` migration'larda bu adları bulamadı.)

Yerel katmanda şemada karşılığı olmayan iki yapı var: `formulations` (4P + hedefler) ve `safetyPlans`.

## 4. Auth / RLS map

**Kimlik doğrulama**
- `.env` yoksa → `supabaseConfig.configured === false` → `App.tsx:139` **giriş duvarını atlar** ve
  sabit `LOCAL_USER` (Halil Karaduman, PSYCHOLOG) ile tam erişimli çalışma alanı açar.
- `.env` varsa → `CloudGate`. Giriş: `signInWithPassword`. Oturum `sessionStorage`'da
  (`authStorage.ts`) — sekme kapanınca oturum düşer.
- Public signup kapalı; hesap yalnızca `admin-users` Edge Function ile açılır. Bu korunmalı.
- Profil yoksa kendini iyileştiren insert (`profiles_insert_self`, migration 006).

**Roller** — `user_role` enum: `ADMIN`, `ORG_ADMIN`, `PSYCHOLOG`. **Danışan rolü yok.**

**RLS deseni** (tüm tablolarda tutarlı):
- `is_active_user()`, `is_psychologist()`, `is_org_admin()`, `is_admin()`, `is_org_member(org_id)`,
  `my_organization_id()` — hepsi `security definer` + `search_path = public`.
- SELECT: `is_admin() OR is_org_member(organization_id)`.
- INSERT: `created_by = auth.uid()` + `is_active_user()` + org üyeliği + rol + çocuğun aynı org'da
  olduğunu doğrulayan `exists(...)` alt sorgusu.
- UPDATE/DELETE: `is_admin() OR (is_org_member(org) AND (created_by = auth.uid() OR is_org_admin()))`.
- `anon`'dan `revoke all`; `audit_logs`'a istemci yazamaz (`revoke all` + yalnız `grant select`).
- `profiles`'ta doğrudan UPDATE/DELETE politikası yok — yalnız Edge Function.

**Test kanıtı:** `tests/security.test.ts`, `securityExtended.test.ts`, `clientDatabase.test.ts`
migration'ları **gerçek PostgreSQL (PGlite/WASM)** üzerinde çalıştırıp IDOR, org izolasyonu,
anon erişimi, rol yükseltme, sahiplik ve cascade senaryolarını doğruluyor. Kapsanan tablolar:
`organizations, profiles, clients, anamneses, sessions, reports, notes, documents, appointments, tasks`.
Bu katman gerçekten sağlam — **ama uygulama bu tablolara hiç dokunmadığı için koruduğu veri yok.**

**Storage:** `client-documents` private bucket, `<org_id>/<client_id>/…` klasör deseniyle
`storage.foldername(name)[1]` üzerinden org izolasyonu. Uygulama bunu kullanmıyor; belgeler
`dataUrl` olarak `localStorage`'a yazılıyor (`ClientRecordsPanel.tsx`, sınır 1,5 MB).

## 5. Existing feature map

| Modül | Durum | Kanıt / not |
| --- | --- | --- |
| Dashboard | **Mevcut** | `Dashboard.tsx` — bugünkü hazırlık, dikkat listesi, yarın, kısayollar |
| Danışan listesi | **Mevcut** | arama, durum filtresi, mobil kart tablo |
| Danışan 360 | **Kısmi** | 8 sekme var; tek bakışta özet + zaman çizelgesi yok |
| Anamnez | **Kısmi** | Client formunun içinde alanlar; ayrı kayıt/taslak/tamamlanma durumu yok |
| Başvuru talebi (intake) | **Yok** | — |
| Randevu | **Mevcut** | liste + filtre; gün/hafta/ay görünümü yok |
| Takvim | **Kısmi** | "Takvim" adında ama takvim ızgarası yok, tarih listesi |
| Seans | **Mevcut** | SOAP, `sessionNumber`, risk, ödev, ücret |
| Seans notu şablonu | **Yok** | tek SOAP formu, türe göre şablon yok |
| Not imzalama / kilitleme | **Yok** | notlar serbestçe düzenlenip silinebiliyor |
| Formlar / form builder | **Yok** | tablo da yok, UI da |
| Belgeler | **Kısmi** | cihaz içi kasa, 1,5 MB, data URL |
| Testler / ölçekler | **Mevcut** | BDI, BAI, SCL-90-R, GAD-7, PHQ-9 — deterministik motorlar |
| MMPI | **Yok** | bkz. §12 |
| Raporlar | **Mevcut** | 5 tip, kayıtlardan otomatik dolar, `window.print()` |
| PDF | **Yok** | PDF kütüphanesi yok; yalnız tarayıcı yazdırma |
| Rapor önizleme | **Kısmi** | ekranda A4 görünümü var; sayfa taşması/sayfa no kontrolü yok |
| Mesajlaşma | **Yok** | — |
| Bildirim / hatırlatma | **Yok** | — |
| Ödeme | **Kısmi** | seans+randevuda `fee`/`paymentStatus`; ayrı kayıt yok |
| Kullanıcı yönetimi | **Mevcut** | `CloudAdminPanel` — yalnız hesap oluştur + listele |
| Admin | **Kısmi** | org oluşturma/rol/pasifleştirme RPC'leri var, UI'da yok |
| Rol sistemi | **Mevcut** | 3 rol |
| Audit log | **Kısmi** | yerel, 200 kayıt, silinebilir/yedekten değiştirilebilir |
| Danışan portalı | **Yok** | — |
| Psikolog portalı | **Mevcut** | tüm çalışma alanı |
| Görevler | **Mevcut** | `TasksPage` + dashboard'da dikkat listesi |
| Tedavi planı | **Kısmi** | `CaseFormulation.goals` (metin + ölçüt + durum); başlangıç/hedef puanı yok |
| İlerleme takibi | **Kısmi** | sayısal delta + yön var; grafik/y zaman serisi yok |
| 4P formülasyon | **Mevcut** | `FormulationPanel` |
| Güvenlik planı | **Mevcut** | `SafetyPlan`, 6 alan |
| Yedek/geri yükleme | **Mevcut** | JSON, doğrulamalı |

## 6. Client workflow map (danışanın gördüğü yol)

Danışanın sisteme erişimi **yoktur.** `user_role` enum'unda danışan rolü bulunmuyor,
`clients` tablosu bir kimliğe bağlanmıyor, portal rotası yok. Danışan yalnızca bir kayıt nesnesi.

## 7. Clinical workflow map (psikoloğun yürüdüğü yol)

```
Yeni danışan (/danisanlar → modal, anamnez alanları aynı formda)
   ↓
Randevu (/takvim) ─── dashboard'da "Bugünkü hazırlık" kartına düşer
   ↓                    └─ son seans, ödev, ölçek değişimi, güvenlik uyarısı, ücret
Seans notu (/seanslar veya danışan dosyası → SOAP)
   ↓
Ölçek (/testler → BDI/BAI/SCL-90-R/PHQ-9/GAD-7) → danışan dosyası "Ölçekler" + "Gelişim"
   ↓
Formülasyon + hedefler + güvenlik planı (danışan dosyası → Formülasyon)
   ↓
Rapor (/raporlar → kayıtlardan otomatik dolar → düzenle → A4 yazdır)
```

Zincirin çalışan kısmı gerçekten iyi: `buildSessionPreps` randevudan son seansı, ödevi, ölçek
deltasını, boş güvenlik planını ve bekleyen ücreti gerçek veriden üretiyor (`casework.ts`);
`progressSections` raporu seans + ölçüm + formülasyondan dolduruyor. Uydurma içerik üretmiyor.

**Kopukluklar:**
1. Randevu → seans notu bağı yok. Randevu `clientId` taşır ama "seansı başlat" eylemi yok;
   psikolog dosyayı açıp yeni SOAP formunu elle dolduruyor, `sessionNumber` ve tarih tekrar giriliyor.
2. Randevu `sessionType` taşır ama not şablonunu etkilemiyor.
3. Ölçek → danışan bağı isteğe bağlı (`clientId?: string`), danışansız ölçek kaydı mümkün.
4. Klinik zaman çizelgesi yok; süreç 8 ayrı sekmede duruyor.
5. Rapor tamamlandıktan sonra kilitlenmiyor; `status`/versiyon yalnız kullanılmayan şemada var.

## 8. Current UX problems

1. **Dashboard → "Formülasyon" düğmesi yanlış sekmeye götürüyor** (bkz. §12, kanıtlı hata).
2. Denetim kaydı navigasyonda yok; yalnızca Ayarlar'daki ikincil düğme.
3. Danışan dosyası 8 sekmeyi tek açılır menüde sunuyor; "danışanı 5 saniyede anla" özeti yok.
   Üstteki "Dosya özeti" kartı yalnız iki kısayol düğmesi.
4. Anamnez, yeni danışan modalının içinde ~15 alanlık tek bir form; taslak yok, tamamlanma
   göstergesi yok, seansa/rapora bağlanmıyor.
5. Takvim takvim değil — gün/hafta/ay yok, çakışma kontrolü yok.
6. Randevudan seansa geçiş iki ekran + elle veri tekrarı.
7. Rapor "A4 yazdır" doğrudan tarayıcı yazdırma diyaloğunu açıyor; sayfa taşması, boş sayfa,
   sayfa numarası önizlenemiyor.
8. `Admin` panelinde org oluşturma, rol değiştirme, pasifleştirme, silme yok — RPC'ler hazır ama UI yok.
9. Boş `localStorage`'da uygulama tam erişimle açılıyor; "kayıtlar şifrelenmez" uyarısı yalnız
   yan panelde küçük bir nottur.

## 9. Security problems

| # | Bulgu | Kanıt | Etki |
| --- | --- | --- | --- |
| S1 | **Tüm klinik veri şifresiz `localStorage`'da** | 15 anahtar, `clinicalStore.ts` / `practiceStore.ts` | Tarayıcıya erişen herkes tüm danışan kaydını okur. T.C. kimlik no dahil (`clients.tcNumber`) |
| S2 | **Supabase yoksa giriş duvarı yok** | `App.tsx:139` | `.env` eksikse kimlik doğrulamasız tam klinik erişim |
| S3 | **RLS sağlam ama koruduğu veri yok** | `\.from\('` yalnız `profiles` | "RLS ile korunuyor" algısı ile gerçek veri yolu örtüşmüyor |
| S4 | **Audit log istemci tarafında ve değiştirilebilir** | `write(AUDIT_KEY, …)`, yedekten `bundle.audit` yükleniyor | Kayıt izi silinebilir/geriye yazılabilir → klinik kayıt için güvenilir değil |
| S5 | **Not/seans kilidi yok** | `deleteSoapSession`, `deleteNote` serbest | İmzalı/tamamlanmış kayıt kavramı yok |
| S6 | **Belgeler data URL olarak localStorage'da** | `ClientRecordsPanel.tsx` | Private bucket + imzalı URL politikası yazılmış ama devre dışı |
| S7 | `psychologist_settings` RLS'i org üyesine yazma veriyor | migration 003 `settings_write … for all` | Bir psikolog başka psikoloğun antet/imza kaydını yazabilir (şema canlıya alınırsa) |
| S8 | **CSP kod ile `_headers` tutarsız** | `securityHeaders.ts` CSP'de `fonts.googleapis.com` var, `public/_headers`'ta yok; ayrıca `style-src 'unsafe-inline'` | Gerçek başlık `_headers`'tan gelir; `securityHeaders.ts` hiçbir yerde kullanılmıyor |
| S9 | `adminListProfiles` ORG_ADMIN'e tüm profilleri döndürüyor | `admin_list_profiles()` yalnız `is_admin()` kontrol ediyor, `select *` | Şema canlıya alınırsa ORG_ADMIN başka org'un kullanıcılarını görür |

Not: S7 ve S9 bugün sömürülebilir değil çünkü uygulama bu tablolara yazmıyor. Bunlar
**şema bulut veritabanına uygulandığı anda** geçerli olacak hatalardır.

## 10. Missing features (özellik yokluğu)

Başvuru talebi, form builder/gönderim, hasta portalı, mesajlaşma, bildirim, hatırlatma,
PDF üretimi, klinik zaman çizelgesi, randevu→seans otomasyonu, not şablonları, not kilitleme,
tedavi planı puan takibi, ilerleme grafiği, ödeme kaydı, takvim görünümleri, org/kullanıcı
yönetimi UI'ı, saklama politikası/silme süreci arayüzü.

## 11. Duplicate features

| # | Bulgu | Kanıt |
| --- | --- | --- |
| D1 | **İki ayrı admin API katmanı** | `src/auth/adminApi.ts` (122 satır) ve `src/features/admin/adminApi.ts`. **Canlı olan `features/…`; `auth/adminApi.ts`'yi hiçbir dosya içe aktarmıyor** (`grep -rn "adminApi" src/` tek sonuç veriyor: `CloudAdminPanel.tsx:3 → features/admin/adminApi`) |
| D2 | Ölü kod: hata çevirisi | `auth/adminApi.ts` içindeki `explainEdgeFunctionError` 401/403/404/413/429/5xx için Türkçe mesaj üretiyor. Canlı yol yalnız `error.message` atıyor → admin panelinde ham hata görülüyor |
| D3 | **Kullanılmayan bağımlılıklar** | `react-hook-form`, `@hookform/resolvers`, `zod` `package.json`'da `dependencies` altında; **`src/` içinde 0 içe aktarma.** Tüm formlar elle `useState` ile yazılmış |
| D4 | Ölü yardımcılar | `src/lib/rateLimit.ts`, `src/lib/dateGuards.ts`, `src/lib/securityHeaders.ts` — depo içinde 0 referans |
| D5 | **Ölü taslak/outbox katmanı** | `src/workspace/draftStorage.ts` (103 satır, idempotencyKey + outbox + retry) — `src/`'de 0 içe aktarma, yalnız `tests/draftStorage.test.ts` test ediyor. Test geçtiği için "taslak var" yanılsaması üretiyor |
| D6 | Emekli OMR/tarayıcı CSS'i | `responsive.css` içinde 16, `mobile.css` içinde 13 `scanner`/`omr` referansı; `.report-preview-paper`, `.report-workspace`, `paper-viewport` sınıflarını **hiçbir bileşen çizmiyor** (0 tsx eşleşmesi) |
| D7 | Çift denetim izi | Yerel `psikolog_audit_v2` + şemadaki `audit_logs` (trigger'lı) — ikisi de aynı işi iddia ediyor, yalnız biri çalışıyor |

## 12. Broken features

| # | Bulgu | Kanıt |
| --- | --- | --- |
| B1 | **Dashboard "Formülasyon" düğmesi yanlış sekmeyi açıyor** | `Dashboard.tsx:229` → `navigate('…?sekme=formulasyon')`. `ClientDetailPage.tsx:50` izinli liste `[… 'formulation' …]` (İngilizce). `formulasyon` listede yok → `'sessions'`'a düşüyor. **Hiçbir test kapsamıyor** (`grep -rn "sekme" tests/ e2e/` → boş) |
| B2 | **MMPI modülü bu depoda yok** | `tests/retiredInstrumentGuard.test.ts` şu yolların **var olmadığını** doğruluyor: `src/scoring/mmpiScoring.ts`, `src/scoring/mmpiKeys.ts`, `src/omr/analyzePage.ts`, `src/scanner/scanAndAnalyze.ts`, `optik-form.html`, `MMPI-566-optik-cevap-formu.pdf`; ayrıca `jsqr`, `pdfjs-dist`, `qrcode`, `@noble/hashes` bağımlılıklarını yasaklıyor. `parseRoute('/mmpi') → bulunamadi`. Depodaki tek iz: `screen.css:1` yorumunda geçen "Repo123 (MMPI)" palet referansı |
| B3 | **Rapor şablonu/versiyon sistemi çalışmıyor** | `report_templates`, `report_versions`, `prepare_report()`, `version_report()` şemada var; uygulamada karşılığı yok. `ClinicalReport` düz bir localStorage kaydı |
| B4 | Admin panelinde işlem yarım | `adminUpdateProfile`, `adminDeleteUser`, `adminSetActive`, `adminCreateOrganization`, `adminListOrganizations` hazır; `CloudAdminPanel` yalnız `adminListProfiles` + `adminCreateUser` çağırıyor |
| B5 | Belgelerde vaat edilen davranış yok | UI metni: "Bulut kurulursa belgeler özel kovada ve 1 saatlik imzalı URL ile okunur." Kodda imzalı URL üretimi yok |

> **B2 hakkında açık not:** Görev tanımındaki "mevcut MMPI sistemini bozma / scoring'i değiştirme"
> maddesi bu depo için geçerli değil — korunacak bir MMPI yok, aksine bir test onun **yokluğunu**
> zorunlu kılıyor. MMPI eklemek mevcut testi kırar. Bu, onayınıza sunulan bir karardır;
> tek taraflı geri eklenmemelidir.

---

# PRIORITIZED IMPLEMENTATION PLAN

Sınıflandırma mevcut kod görüldükten sonra yeniden yapıldı. Görev tanımındaki örnek
sınıflandırmadan iki yerde ayrılıyor: (a) RLS/Auth zaten güçlü olduğu için P0'da "RLS yaz" değil
"veri yolunu RLS'e bağla" var; (b) form builder P1'den P2'ye indirildi.

## P0 — ZORUNLU (klinik workflow ve veri güvenliği için gerekli)

**P0-1 · Veri yolunu şemaya bağla (local-first → cloud-sync)**
```
FEATURE:        localStorage katmanını koruyarak yazma yolunu Supabase tablolarına bağla
Neden gerekli:  2.147 satırlık RLS'li şema atıl; klinik veri şifresiz tarayıcıda duruyor (S1, S3)
Mevcut durum:   15 localStorage anahtarı; Supabase'e yalnız `profiles` yazılıyor
Önerilen çözüm: Mevcut store API'sini (getClients/saveClient/…) koru, altına yazma katmanı ekle.
                Supabase yoksa bugünkü davranış birebir sürer. Önce `clients` + `sessions`,
                sonra `appointments`, `notes`, `documents`. Yerel kasa önbellek olarak kalır.
Etkilenecek dosyalar: src/clinical/clinicalStore.ts, src/clinical/practiceStore.ts,
                      yeni src/clinical/cloudSync.ts
Etkilenecek tablolar: clients, sessions, appointments, notes, documents, test_*, reports
Migration gerekir mi: Hayır — şema zaten var
RLS etkisi:     Pozitif — mevcut politikalar ilk kez gerçek veriyi korur
UI etkisi:      Yok (aynı ekranlar); Ayarlar'da senkron durumu göstergesi
Mobil etkisi:   Yok
Test planı:     Mevcut 90 test + cloudSync birim testleri + PGlite'ta yazma/okuma + RLS reddi
Risk:           Orta — çift yazma tutarlılığı. Çevrimdışı kuyruk için mevcut draftStorage
                outbox deseni yeniden kullanılabilir (D5'i ölü kod olmaktan çıkarır)
```

**P0-2 · S2'yi kapat: yapılandırılmamış bulutta açık erişimi engelle**
```
FEATURE:        .env yoksa çalışma alanını salt-okunur/uyarı moduna al veya açık etiketle
Neden gerekli:  App.tsx:139 giriş duvarını atlıyor; klinik kayıt kimlik doğrulamasız açılıyor
Mevcut durum:   LOCAL_USER ile tam erişim
Önerilen çözüm: Mevcut yerel modu KALDIRMA (tek kullanıcı için meşru). Bunun yerine ilk açılışta
                açık onay + kalıcı "yerel mod" rozeti + veri girişi öncesi uyarı.
Etkilenecek dosyalar: src/App.tsx
Migration:      Yok · RLS etkisi: yok · Mobil: rozet için küçük düzen
Test planı:     App testi + Playwright ile yerel mod akışı
Risk:           Düşük
```

**P0-3 · Randevu → seans notu bağlantısı**
```
FEATURE:        Randevudan tek tıkla, randevu verisi dolu SOAP notu aç
Neden gerekli:  En sık yürünen yolda iki ekran + elle tekrar (sessionNumber, tarih, tür)
Mevcut durum:   Randevu clientId taşır, nota bağlanmaz
Önerilen çözüm: Appointment'a opsiyonel `session_id`; dashboard ve takvim kartına
                "Seans notunu aç" — yeni SOAP formu tarih/tür/süre/no ile önceden dolu
Etkilenecek dosyalar: casework.ts, Dashboard.tsx, AppointmentsPage.tsx, ClientDetailPage.tsx
Etkilenecek tablolar: appointments (yerel tipte ek alan)
Migration:      Yerel katman için yok; buluta taşınırken appointments'a nullable sütun
RLS etkisi:     Yok (mevcut politika yeter)
UI etkisi:      Kart başına 1 düğme · Mobil: mevcut prep-actions satırına eklenir
Test planı:     casework testi + Playwright uçtan uca randevu→not
Risk:           Düşük — mevcut form mantığı değişmiyor, sadece ön doldurma
```

**P0-4 · B1'i düzelt + sekme deep-link regresyon testi**
```
FEATURE:        ?sekme= değerini Türkçe/İngilizce ikisini de kabul edecek biçimde normalleştir
Neden gerekli:  Dashboard "Formülasyon" düğmesi Seans notları sekmesine düşüyor
Önerilen çözüm: tabFromLocation'a eşleme tablosu + hem `formulation` hem `formulasyon` kabul
Etkilenecek dosyalar: src/components/clinical/ClientDetailPage.tsx (+ test)
Migration: Yok · RLS: yok · UI: davranış düzeltmesi · Mobil: aynı
Test planı:     Yeni test — 8 sekmenin her biri için deep-link
Risk:           Çok düşük
```

**P0-5 · Audit log'u güvenilirden sayılamaz olarak dürüstçe işaretle**
```
FEATURE:        Yerel kayıt izinin değiştirilebilir olduğunu UI'da açıkça belirt;
                bulut açıkken sunucu audit_logs'u göster
Neden gerekli:  S4 — klinik kayıt izi silinebilir/yedekten değiştirilebilir
Önerilen çözüm: AuditPage'e kalıcı uyarı; P0-1 sonrası sunucu izini okuyan ikinci sekme
Etkilenecek dosyalar: src/components/practice/AuditPage.tsx
Migration: Yok · RLS: audit_logs_select zaten var
Test planı:     Bileşen testi + PGlite'ta trigger'lı yazım doğrulaması (mevcut test var)
Risk:           Düşük
```

## P1 — DEĞERLİ

**P1-1 · Danışan 360 özeti** — dosya başına tek ekran: son seans, son not, aktif hedefler,
son ölçekler, bekleyen işler, risk. Sekmeler kalır; özet üste gelir. Mevcut veriden üretilir,
yeni tablo yok. *(Dosyalar: ClientDetailPage.tsx, casework.ts)*

**P1-2 · Klinik zaman çizelgesi** — randevu + seans + ölçek + rapor + notu tek kronolojide
birleştiren salt-okunur görünüm; her satır ilgili sekmeye/kayda gider. Yeni tablo gerekmez,
verinin tamamı zaten var. *(Dosyalar: yeni ClientTimeline.tsx, casework.ts)*

**P1-3 · Anamnezi ayrı kayda çıkar** — `anamneses` şeması zaten var. Alanları modüler bölüme
ayır, taslak + tamamlanma yüzdesi ekle, `draftStorage`'ı gerçekten bağla (D5'i çözer).
Klinik içerik uydurulmaz; mevcut `Client` alanları taşınır. *(Dosyalar: yeni AnamnesisPanel.tsx,
practiceStore.ts, draftStorage.ts)*

**P1-4 · Rapor kilitleme + versiyon** — `status: draft|completed` yerel tipe eklenir;
tamamlanan rapor salt-okunur olur, düzenleme yeni versiyon açar. `report_versions` şeması hazır.
*(Dosyalar: clinicalTypes.ts, ClinicalReportsPage.tsx, clinicalStore.ts)*

**P1-5 · Takvim görünümleri** — gün/hafta/ay + çakışma uyarısı. Mevcut randevu modeli yeterli.
*(Dosyalar: AppointmentsPage.tsx)*

**P1-6 · Admin panelini tamamla** — hazır RPC'leri (`adminUpdateProfile`, `adminSetActive`,
`adminDeleteUser`, `adminCreateOrganization`, `adminListOrganizations`) UI'a bağla ve
D1'i çöz: `auth/adminApi.ts`'deki hata çevirisini canlı yola taşı, ölü kopyayı sil.
*(Dosyalar: CloudAdminPanel.tsx, features/admin/adminApi.ts, auth/adminApi.ts)*

**P1-7 · Tedavi planı puan takibi** — `TreatmentGoal`'a başlangıç/hedef/son ölçüm + ölçüm tipi;
seans notu yazılırken aktif hedefler görünür, psikolog isterse ilişkilendirir. **AI hedef üretmez.**
*(Dosyalar: casework.ts, FormulationPanel.tsx, ClientDetailPage.tsx)*

**P1-8 · İlerleme grafiği** — mevcut `readingsForClient` çıktısını zaman serisi olarak çizer.
Sıfır bağımlılık (SVG). Sistem veriyi görselleştirir, klinik sonuç üretmez. *(Dosyalar: yeni
TrendChart.tsx, ClientDetailPage.tsx)*

**P1-9 · Rapor önizleme sertleştirme** — A4 sayfa kırılması, taşma, boş sayfa, sayfa numarası,
Türkçe karakter kontrolü; yazdırmadan önce önizleme. *(Dosyalar: ClinicalReportsPage.tsx,
clinical.css)*

**P1-10 · S7 + S9 düzeltmesi** — şema canlıya alınmadan önce `psychologist_settings` yazma
politikasını `created_by = auth.uid()`'ye daralt; `admin_list_profiles()`'ı ORG_ADMIN için
kendi org'uyla sınırla. *(Dosyalar: yeni migration)*

**P1-11 · Ölü kod temizliği** — `lib/rateLimit.ts`, `lib/dateGuards.ts`, `lib/securityHeaders.ts`,
`auth/adminApi.ts` (P1-6 sonrası), OMR/tarayıcı CSS'i, `.report-preview-paper`/`.report-workspace`.
Kullanılmayan `react-hook-form`, `@hookform/resolvers`, `zod` bağımlılıkları: **ya kaldır ya da
formları gerçekten taşı** — karar sizin. *(Dosyalar: package.json, styles/*)*

## P2 — SONRA

| Özellik | Neden P2 |
| --- | --- |
| **MMPI modülü** | Depoda yok ve bir test yokluğunu zorunlu kılıyor (B2). Geri eklemek mevcut testi ve OMR bağımlılık yasağını kırar. Karar sizin; tek taraflı eklenmemeli |
| Form builder + danışana form gönderme | Danışan rolü/portalı yok; önce portal gerekir. Ayrıca "gereksiz Typeform klonu" riski yüksek |
| Danışan portalı | Yeni rol + yeni RLS yüzeyi + yeni kimlik akışı. Çekirdek workflow'u hızlandırmıyor |
| Mesajlaşma | "Başka üründe var" gerekçesiyle eklenmemeli. Türkiye'deki tek uzmanlı pratikte telefon/WhatsApp zaten baskın |
| AI Scribe / özet | `aiTypes.ts` zaten stub. Gerçek LLM KVKK açısından ayrı bir değerlendirme ister |
| Telehealth | Ayrı ürün yüzeyi |
| Ödeme sağlayıcı entegrasyonu | Türkiye için önce basit `fee/paymentStatus` kaydının düzgün raporlanması yeterli |
| SMS/e-posta hatırlatma | Harici servis + maliyet. Önce P1-5 takvim ve P0-3 bağlantısı |
| PDF üretimi (jsPDF vb.) | Yeni bağımlılık; mevcut `window.print()` + P1-9 önizleme daha ucuz |

---

## Onayınıza sunulan kararlar

1. **P0-1'in kapsamı:** tüm tablolar mı, yoksa önce `clients` + `sessions` ile mi başlayalım?
2. **MMPI (B2):** emekli durumda kalsın mı, yoksa geri mi eklensin? Geri eklemek
   `retiredInstrumentGuard.test.ts` ve bağımlılık yasağını değiştirmeyi gerektirir.
3. **Kullanılmayan form bağımlılıkları (D3):** kaldırılsın mı, formlar `react-hook-form`+`zod`'a mı taşınsın?
4. **Yerel mod (S2):** tek kullanıcı için meşru mu kalacak (yalnız uyarı eklenir), yoksa giriş zorunlu mu olsun?
