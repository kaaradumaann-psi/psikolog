# Üretim hazırlık denetimi — nihai rapor

Denetlenen dep: `psikolog` · dal `arena/01a0db11-psikolog` · taban commit `340930b`.
Bu rapor bir özellik listesi değildir; **gerçekte çalışan şeyin kanıtı** ve kanıtlanamayan kısmın adıdır.
Hiçbir sayısal iddia "kod temiz görünüyor" ya da "testler geçiyor" varsayımına dayanmaz; dayandığı yer aşağıdaki kanıt katmanıdır.

## 1. Kanıt katmanları (bu raporda her bölüm bu dört sütunla okunur)

| Katman | Bu ortamda ne demek | Durum |
| --- | --- | --- |
| **LOCAL** | Kaynak kodu okuması, `npx tsc --noEmit`, `npm test` (`node:test` + PGlite ile göç çalıştırma), `npm run build`, `vite preview` üzerinde `curl` | **YAPILDI** — tüm sayılar bu raporda gerçek çıktıdır |
| **LIVE SUPABASE** | Gerçek bir Supabase projesine `supabase db push`, oturumla RLS denemesi, Edge Function çağrısı, Storage yükleme/indirme | **BLOKE** — depoda `VITE_SUPABASE_*` yok, `.env` yok, lokal supabase/docker yok, kimlik yok |
| **REAL BROWSER** | Playwright/Chromium ile canlı DOM, klavye, odak, yazı tipi, dar ekran, console hatası kontrolü | **BLOKE** — `npx playwright install chromium` ağdan indirilemedi (`cdn.playwright.dev` TLS kesildi), `--with-deps` apt erişimi yok |
| **PRODUCTION** | Yayına alınmış URL üzerinde ölçüm, CSP/başlık doğrulaması, gerçek kullanıcı verisiyle sızıntı testi | **BLOKE / YAPILMADI** — bu denetime bağlı bir üretim dağıtımı yok |

Bu dört ayrım bilinçli: **LOCAL yeşil, diğer üçü bu ortamda ölçülemez.** "LIVE/PRODUCTION hazır" demek bu raporda yoktur.

## 2. Başlangıç durumu ve önceki faz iddialarının doğrulanması

Önceki faz raporlarındaki iddialar koda karşı doğrulandı; **üçü yanlıştı** ve bu, denetimin kendisinden önemli bir bulgudur:

| Önceki iddia | Kodda gerçek | Sonuç |
| --- | --- | --- |
| "`alert/confirm/prompt` tamamen kaldırıldı (0)" | 33 çağrı noktası (10 dosya) | İddia yanlış → bu fazda gerçekten 0'a indirildi ve testle sabitlendi (§24) |
| "`RevisionDialog.tsx`, `Toasts.tsx`, `hooks/` var" | Bu dosyalar depoda yok | İddia yanlış |
| "Güzergâhlar İngilizce (`/clients`, `/appointments`)" | `src/router.ts` Türkçe: `/danisanlar`, `/takvim`, `/raporlar`… | İddia yanlış |
| "`src/features/ai` silindi" | `src/features/ai/*` duruyor ve `aiTypes` import ediliyor | İddia yanlış (bkz. §41) |
| "90/90 test geçiyor, `npm run e2e` var" | 90/90 geçiyordu (doğru); `e2e` scripti yok, `test:e2e` var | Kısmen doğru |

**Ders:** önceki fazın "hazır" cümleleri bu denetime girmedi.

## 3. Kimlik doğrulama (auth)

- Yerel mod: Supabase yapılandırılmamışsa `LOCAL_USER` sabiti ile çalışma alanı açılır; giriş ekranı hiç görünmez (`src/App.tsx`). Bu, KVKK açısından bir veri sızıntısı değildir (cihazda tek kullanıcı) ama **yetkisiz erişim koruması da değildir**: o bilgisayarda tarayıcıyı açan herkes klinik dosyalara erişir. Ürün bunu "yerel çalışma alanı" olarak adlandırıyor ve yan panelde söylüyor (§35 ile tutarlı).
- Bulut modu: `getSession()` + `onAuthChange()`, PKCE (`flowType: 'pkce'`), `detectSessionInUrl: false`, oturum deposu `sessionStorage` (`src/auth/authStorage.ts` — test edildi). Halka açık kayıt yok; Edge Function `admin_invite_user` üzerinden varsayılan `must_change_password: true` ve çerezli yönlendirmelerde `cache-control: no-store` mevcut.
- **Düzeltilen:** oturum çözülmeden kasa bağlı kalıyordu → `configureStorageScope(null)` akışı eklendi (§10).
- **Kanıt:** LOCAL — `npm test` (authStorage 3 test), `tsc` temiz. LIVE SUPABASE — **bloke**: gerçek proje olmadığı için `signIn`/refresh/expire akışı hiç çalıştırılmadı. **Bu, giriş akışının hiç doğrulanmadığı anlamına gelir.**

## 4. Yetkilendirme / rol modeli

ROLLER: `PSYCHOLOG`, `ORG_ADMIN`, `ADMIN` (+ pasif bayrağı). Sunucu tarafı kontrol `handle_new_auth_user` trigger'ında rol atanması, `is_psychologist()/is_org_admin()/is_admin()` ile politikalarda.
İstemci tarafı `canAdmin` yalnızca **arayüz** gizler (CloudAdminPanel, Ayarlar → kurum) — gerçek zorlama RLS'te. Bu doğru mimari; §7'deki politikalar bunu taşıyor.
**Kanıtsız kalan:** rol yükseltme denemesi canlı API'ye karşı yapılmadı (bloke); PGlite testlerinde `PSYCHOLOG cannot update profiles / insert organization` geçiyor (`tests/security.test.ts`).

## 5. Kurum (tenant) izolasyonu

`organizations → profiles.organization_id` + `is_org_member(uuid)` (security definer). Tablolarda `organization_id` varlığı ve `exists (select 1 from clients …)` çapraz kontrolleri `*_insert` politikalarında mevcut.
**Kanıt:** LOCAL — `tests/securityExtended.test.ts`: PSY_B'nin ORG_A satırlarını okuyamaması 7 ayrı tabloda doğrulanıyor; `tests/clinicalIsolation.test.ts` (bu fazda eklendi) kurumlar arası erişimi ve **aynı kurum içi** erişimi ayrı ayrı sınıyor.

## 6. IDOR (nesne seviyesinde erişim)

Bulgu (P0, bu fazda kapatıldı): içerik tablolarının `*_select` politikaları `is_admin() or is_org_member(organization_id)` idi — **aynı kurumdaki herhangi bir psikolog, başka bir hekimin anamnez/seans/not/test/belge satırlarını okuyabiliyordu**. UPDATE/DELETE zaten sahibi veya kurum yöneticisiydi; okuma gevşekti. Ek olarak Storage politikaları yalnızca klasörün **birinci** parçasını (`<org_id>`) doğruluyor, danışan klasörünü (`[2]`) doğrulamıyordu.

## 7. RLS denetimi ve bu fazın göçü

`supabase/migrations/20260924000007_clinical_record_isolation.sql` (yalnızca sıkılaştırma):
1. `anamneses, sessions, assessments, test_administrations, test_results, documents, notes, psychologist_settings` SELECT → `is_admin() or (is_org_member and (created_by = auth.uid() or is_org_admin()))`.
2. `test_results` UPDATE/DELETE sahibi-bazlı hale getirildi (`owns_test_administration()` yardımcısı; tabloda `created_by` kolonu olmadığı için sahiplik üst kayıttan geliyor). Kurum arkadaşı artık başkasının ölçek sonucunu **silemiyordu**.
3. Storage: `can_read_client_folder(bucket_id, name)` security-definer yardımcısı hem `[1]` org'u hem `[2]` danışan sahipliğini doğrular; insert/update/delete/select politikaları buna bağlandı; `alter table storage.objects enable row level security` eklendi (kendi Postgres'inde RLS kapalıysa politikalar hiç uygulanmıyordu).
4. Rapor değişmezliği: `guard_report_finalization()` BEFORE UPDATE/DELETE tetikleyicisi, `status='completed'` satırını sahibi/org yöneticisine kapatır; yalnız `is_admin()` düzeltebilir (silme/veri kaybı senaryosu için tek çıkış).
Kasitli olarak dokunulmadı: `clients_select` (kurum içi kimlik kaydı — takvim/atama akışları buna dayanır), `appointments_select`, `tasks_select` (planlama meta verisi), `audit_logs` (istemciden zaten yazılamıyor), `force row level security` **eklenmedi**.

**Test:** `tests/clinicalIsolation.test.ts` 8 assertion grubu (meslektaş okuyamaz/güncelleyemez/silemez; sahip + org yöneticisi + admin okur; tamamlanmış rapor kilidi; taslak yazılabilir; storage danışan klasörü) — **8/8 geçiyor**, `tests/securityExtended.test.ts` ve `tests/security.test.ts` dahil tüm göçler PGlite'ta hatasız kuruluyor.
**Kanıt eksikliği:** bu, PGlite'ta kanıttır. Gerçek Supabase'te `db push` denenmedi (bloke); Supabase'in `storage.objects` üzerindeki varsayılanlarıyla çakışma riski göç sonrası bir kez doğrulanmalı.

## 8. Kilit / imza / revizyon akışı — KAPATILMAYAN P0

Ürün iddiası "tamamlanınca kilitlenir, imzalanır, revizyon eklenir" idi. Gerçek:
- Uygulamada **kilit, imza, revizyon arayüzü yok**; tek durum `ClinicalReport.status = 'draft' | 'completed'`; `revision` kolonu/alanı yok.
- Veritabanında `reports.status` CHECK'i `('draft','completed')`; `reports_update/delete` sahibi/org-admin'a açıktı → tamamlandıktan sonra bile sessizce değiştirilebilirdi.
- Bu fazda yapılan, **veritabanı tarafındaki asgari kilit** (§7/4) + `@page`/yazdırma başlığı. Uygulama tarafında kilit yalnızca arayüz engelidir; **denetim izi (`audit_logs`) istemciden yazılamadığı için** buluta yansıyan bir "kim neyi değiştirdi" kaydı oluşmaz.
- Karar: şema genişletme izni olmadığı için yeni kolon/durum **icat edilmedi**; bu, ürünün kendi iddiasıyla kod arasındaki en büyük fark olarak açık bırakıldı. Kapatılması gereken iş: `status`/`locked_at`/`signed_at`/`revision_of` şeması + revizyon ekranı + DB'ye yazan tek bir servis (edge function) — bu fazın kapsamı dışı.

## 9. Kalıcılık haritası (ne nerede duruyor)

| Veri | Gerçek kalıcılık | SQL tablosu | Buluta yazan arayüz |
| --- | --- | --- | --- |
| Danışan kaydı + anamnez alanları | `localStorage: psikolog_clients_v2` (hesap kapsamlı) | `public.clients` | **YOK** |
| SOAP seans notu | `psikolog_sessions_v2` | `public.sessions` | **YOK** |
| Formülasyon (4P) | `psikolog_formulations_v2` | — | yok |
| Güvenlik planı | `psikolog_safety_v2` | — | yok |
| BDI / BAI / SCL-90-R | `psikolog_bdi_tests_v2` vb. | `public.test_results` | **YOK** |
| PHQ-9 / GAD-7 | `psikolog_screenings_v2` | `public.test_results` | **YOK** |
| Raporlar | `psikolog_reports_v2` | `public.reports` | **YOK** |
| Not / belge / görev / randevu / ayarlar | `psikolog_notes_v2`, `psikolog_documents_v2`, … | karşılıkları var | **YOK** |
| Denetim izi | `psikolog_audit_v2` (son 200 olay, cihazda) | `public.audit_logs` (yalnız DB trigger'ı) | tasarım gereği yok |
| Giriş oturumu | `sessionStorage` | — | var |

Sonuç: **klinik kayıt için buluta giden tek yol JSON yedek indirmek.** `anamneses`, `assessments`, `test_administrations`, `notes`, `documents`, `tasks` tablolarının bir kısmına karşılık gelen arayüz hiç yok (bkz. §16, §21). Bu, "üretim ürünü" iddiasını tek başına düşüren maddedir (§41 karar).

## 10. localStorage hesap izolasyonu — P0, kapatıldı

**Sorun:** tüm anahtarlar cihaz geneldi; aynı tarayıcıda iki hekim hesabı (veya yerel mod + bulut hesabı) **birbirinin danışan dosyalarını görüyordu.**
**Kök neden:** depo katmanının kullanıcı kimliğiyle ilişkisi yoktu; oturum açılırken kimsenin kapsamı ayarlamaması.
**Çözüm:** `src/clinical/storageScope.ts` — tek doğruluk kaynağı: anahtar adı `psikolog.<kapsam-haşesi>:<alan>`; kapsam **yalnızca oturum çözüldükten sonra** bağlanır (`configureStorageScope`), çıkışta çözülür; bağlanmamış kapsam **okumaz**; eski `psikolog_*_v2` anahtarları kapsama bir kez taşınır; `commitScopedWrites` ile çok anahtarlı atomik yazım; `watchCrossTab` ile ikinci sekmede yazılınca bu sekme tazelenir (bu fazda her iki store'a eklendi).
**Test:** `tests/clinicalStore.test.ts`, `tests/practiceStore.test.ts`, `tests/authStorage.test.ts`; yeni `tests/uiGuards.test.ts` kuralı: **`storageScope.ts`/`authStorage.ts` dışında hiçbir kaynak `localStorage` kelimesini geçiremez** (geçerse test kırılır).
**Sonuç:** LOCAL kapandı. REAL BROWSER'da iki hesapla yan yana doğrulanamadı (bloke) — bu, izolasyonun **tek kanıtının statik + birim test olduğudur**.

## 11. Veri kaybı: yedek, geri yükleme, kota

- **P0 (kapatıldı):** yedek geri yükleme anahtar anahtar yazıyordu; kota hatasında dosyanın yarısı değişmiş kalırdı. Artık `DataManagementModal` önce **doğruluyor** (`planClinicalImport` + `planPracticeImport`), sonra **tek** `commitScopedWrites` ile yazıyor; hata olursa eski değerler geri konur.
- **P1 (kapatıldı):** temizleme (`SIL`) iki store'da yarım kalabiliyordu → `planClinicalClear() + planPracticeClear()` birlikte commit edilir; `FileReader.onerror` dinlenir; temizlik `recordAudit` ile izlenir.
- Kota: `recordRules.ts` 8 MB yedek tavanı + `reportStorageError()` → `psikolog:storage-error` olayı → `App` üstünde `role="alert"` bandı.
- Doğrulanamayan: gerçek kota (5 MB) davranışı, Private Mode, `quota exceeded` — tarayıcı gerekir (bloke).

## 12. Danışan dosyası yaşam döngüsü

Oluşturma (dosya no `HK-YYYY-NNN` otomatik, TC 11 hane + Türkçe normalizasyon, boş ada izin yok) → seans/ölçek/rapor beslemesi → **silmede geri alınamaz onay** + ilişkili kayıtların birlikte temizliği (`planClientDeletion`). `alert/confirm` yok; `useConfirmDialog` (`role="dialog"`, `aria-modal`, Escape, odak iadesi).
**Kalan P2:** `ClinicalReport.clientName` ve `SoapSession.clientName` **snapshot** olarak saklanır — danışan adı değişince eski kayıtlarda eski ad görünür. Geriye dönük düzeltme yazma riski taşıdığı için bilinçli bırakıldı; rapor ve seans çıktısında tarih + dosya no ile birlikte göründüğünden klinik olarak karışıklık yaratmıyor, ama UI'da "kayıt anındaki ad" ibaresi yok.

## 13. Sekme yapımı: danışan dosyası 8 bölümü

`Seans notları · Formülasyon ve güvenlik · Ölçekler · Gelişim · Anamnez · Notlar · Belgeler · Raporlar` — 8 bölüm, her birinde gerçek içerik veya **boş durum + eylem**.
Bu fazda düzeltilenler:
- Sekum durumu URL'e yazılmıyordu → geri/ileri ve "dosyayı paylaş" durumunda yanlış sekme açılıyordu. `?sekme=` + Türkçe takma adlar (`TAB_ALIASES`: `anamnez`, `formulasyon`…) ile `history.replaceState`.
- Başlık eylemleri: **Randevu planla** (`/takvim?danisan=<id>`) ve **Bu bölümü yazdır** eklendi; ana eylem "Yeni Seans Notu".
- Güvenlik uyarısı: `Güvenlik planını doldur` düğmesi (`safety-callout` flex).
- SOAP modalının kopyası bu dosyadaydı → ortak `SoapSessionDialog` kullanılıyor (§15).
- Silme işlemleri `useConfirmDialog`'a geçti; rapor "İncele" → `/raporlar?rapor=<id>`.
**Kanıt:** `tsc` temiz; `tests/workspaceUi.test.ts` SSR render'ı; görsel/odak davranışı REAL BROWSER'da doğrulanamadı (bloke).

## 14. Randevu ve takvim

Düzeltildi: `as any` cast'leri kaldırıldı (`LOCATIONS`, `AppointmentLocation`, `STATUS_OPTIONS`, `STATUS_LABEL` — durum anahtarları artık tek kaynakta); `formError` + `saving` koruması; **aynı danışan+tarih+saat mükerrer kaydı** (iptaller hariç) reddediliyor; `min={clinicToday()}` ve geçmiş tarih reddi; **ücret + ödeme durumu** alanları düzenleyiciye eklendi (modelde duruyor, arayüzde hiç erişilemiyordu); "Görüşmeyi tamamla" → danışan dosyasının seans sekmesini `?randevu=<id>` ile açıyor; `?danisan=` ile gelince ön-dolu yeni randevu formu açılıp parametre temizleniyor; silme `useConfirmDialog`.
**Kalan P2:** takvimde sürükle-bırak/yıl görünümü yok (ürün haftalık+bugünün tahtası ile tasarlanmış; "yeni özellik" olmadığı için eklenmedi).

## 15. SOAP seans notu

**Sorun:** iki ayrı SOAP düzenleyici (dosya içi modal + ayrı sayfa) vardı; biri ücret/ödeme göstermiyordu, doğrulama kuralları farklıydı. Tekilleştirme riski: aynı seanstan iki farklı not.
**Çözüm:** ortak `src/components/clinical/SoapSessionDialog.tsx` — danışan zorunlu (kilitlenebilir), **en az bir SOAP alanı**, gelecek tarih reddi, `riskLevel ≠ none` ise `riskNotes` zorunlu, **aynı danışanda yinelenen seans numarası** reddi, `saveSoapSession` üzerinden kayıt.
Randevu→seans köprüsü: `?randevu=` **geçici** taşınır; `SoapSessionDraft`'a yeni kalıcı alan eklenmedi (şema genişletme yasağı). Bu, "bir randevudan iki not" riskini de kapatıyor: not oluştuğunda randevu satırına bağlanmıyor, ama aynı randevu için ikinci not `nextSessionNumber` + numara çakışması kuralıyla engelleniyor.
**Test:** `tsc` temiz; `tests/workspaceUi.test.ts` geçiyor; gölge doğrulama kuralları birim testte (§40 notu: SOAP doğrulaması diyalogda, `recordRules` testleri ayrı).

## 16. Anamnez

**Gerçek:** ayrı bir anamnez formu/mağazası yok; anamnez alanları (`presentingComplaint`, `medicalHistory`, `psychiatricHistory`, …) danışan kaydının üzerinde ve `psikolog_clients_v2`'de duruyor. `public.anamneses` tablosu RLS + trigger ile mevcut ama **onu yazan hiçbir arayüz yok** (`grep -rn "namnes" src/components src/clinical` → anamnez seki `overview`'ı gösteriyor, tabloyu değil).
**Sonuç:** çift gerçeklik riski (DB'de boş tablo, arayüzde dolu alan) **raporlandı, kod değiştirilmedi** — kapatması şema/akış kararı gerektirir (§9 ile aynı madde).

## 17. Testler ve ölçekler (BDI, BAI, SCL-90-R, GAD-7, PHQ-9)

Puanlama doğrulaması (koda bakarak, `tests/*.test.ts` ile birlikte): BDI/BAI 0–3 × 21 madde, eşikler sabit; SCL-90-R 90 madde 0–4, 9 boyut + GSI/PST/PSDI; PHQ-9/GAD-7 sırasıyla 27/21 tavan. **Yeni puanlama icat edilmedi.**
Bu fazda düzeltilenler:
- `answered` sınıfı BDI/BAI'de `answers[idx] !== 0` idi → **0'i işaretleyen madde "yanıtlanmamış" gibi görünüyordu** ve Playwright spec'i (`e2e/critical.spec.ts`) bu sınıfı bekliyor. `!== null` yapıldı; SCL'deki doğru davranışla eşitlendi.
- Boş yanıttan puan üretme riski: `scaleIntake.asCompleteAnswers` null ⇒ eksik sayar, `save*Test` çağrısı bundan sonra yapılır (kodda `null` 0'a çevrilmez).
- 4 ölçek sayfasındaki **14 `alert()`** çağrısı satır içi `role="alert"`/`role="status"` bildirimlerine çevrildi; kaydetme `try/catch` içine alındı, hata metni gösteriliyor (kota/serileştirme hatası artık sessiz değil).
- **Çift tıklama** ile iki kayıt oluşması: `saving` bayrağı + `disabled`/`aria-busy` ve mağaza tarafında `id` ile upsert.
**Kalan P2:** ölçek sonucunda "düzeltme" akışı yok (sil + yeniden uygula); silme bu fazda Hub geçmişine bağlandı (§41'e bakınız). Madde bazlı revizyon/denetim izi yok.

## 18. Formülasyon (4P)

Danışan dosyasında "Formülasyon ve güvenlik" bölümünde; `Presenting / Permanent / Precipitating / Participating` alanları **yalnızca cihazda** (`psikolog_formulations_v2`) — §9'daki kalıcılık açığının bir parçası, çünkü bu içeriği buluta yazan bir arayüz yok.
Kayıt denetim izine düşüyor (`recordAudit` → `entity: 'formulation'`); danışan silinirken formülasyon ve güvenlik kayıtları `planClientDeletion` ile **birlikte** gidiyor, yetim kayıt kalmıyor (`tests/practiceStore.test.ts`, `tests/clinicalStore.test.ts`).
Bölüm boşken boş durum + doğrudan düzenleme düğmesi gösteriliyor (§26 kuralı burada da sağlanıyor).
**Kalan P2:** formülasyon sürümü/revizyonu yok; ikinci hekim aynı cihazı paylaşıyorsa izolasyon §10'daki kapsamdan gelir.

## 19. Güvenlik planı

`psikolog_safety_v2` üzerinde, §18 ile aynı bölümde. Uyarı işaretleri — BDI madde 9, PHQ-9 madde 9, SCL-90-R 15. madde pozitifliği — dosyada `safety` rozeti ve `Güvenlik planını doldur` çağrısı üretiyor; **puan tanı değildir** metni Hub ve rapor çıktılarında duruyor.
Bu fazda düzeltilen: uyarı satırı tek başına bırakılmıştı, eylemsizdi → çağrı düğmesi eklendi; bölüm etiketi "Formülasyon ve güvenlik" olarak netleşti.
**Kalan P1 (kapatılmadı — kapsam kararı, unutulmasın diye yazılıyor):** planı "uygula/kapat" döngüsü, kriz numaralarının saha doğrulaması ve planın tek sayfa ayrı çıktı olarak basılması yok (bölüm yazdırması §33 üzerinden mümkün). Kalıcılık açığı §9 ile aynı: cihaz silinirse risk bağlamı da silinir.
**Kanıt:** LOCAL — mağaza testi + SSR render. REAL BROWSER'da doldurma/odak sırası ölçülemedi (bloke).


## 20. Raporlar

Düzeltildi: `?rapor=<id>` derin bağlantısı (`ClinicalReportsPage` sayfası artık gelen bağlantıyı açıyor); `handleCreateNew`/`handleSaveEdit` için `creating` meşgul koruması + `try/catch`; liste okuma hatası `alert` yerine satır içi `listError` uyarısı; **boş bölüm içeriğiyle kayıt reddi** (yalnız başlık dolu "rapor" üretilemiyor); silme `useConfirmDialog` ile ve açıklamada rapor adı/tarihi + geri alınamaz uyarısı.
DB tarafında bu fazda eklenen: `status='completed'` satırının sahibi/org-admin tarafından değiştirilememesi/silinmemesi (§7/4).
**Kalan P1:** sürüm/revizyon yok (§8); antet (letterhead) `psychologist_settings`'te ama **buluttan okunmuyor**, cihazdaki `psikolog_settings_v2`'den geliyor — iki cihazda iki farklı antet mümkün.

## 21. Belgeler ve depolama

Arayüz: danışan dosyasında Belge sekmesi, `data:` URL + ad + tür + boyut; `isSafeDocumentUrl` (`javascript:` ve `data:text/html` reddi — `tests/recordRules.test.ts` bunu sabitliyor), `rel="noopener noreferrer"` dış bağlantılarda.
Bulutta olması gereken: `client-documents` kovası, `<org_id>/<client_id>/…` yolu, 52 MB kova limiti, `documents` tablosu.
Bu fazda düzeltilen: storage **politikaları danışan klasörünü doğrulamıyordu** (§7/3); ayrıca `storage.objects`'te RLS'in kapalı olabileceği göçte kapatıldı.
**Kanıtsız kalan (LOCAL bulgu):** `000004` hâlâ `insert into storage.buckets … 52428800` çalıştırırken `000006` "storage oluşturma kaldırıldı" diyor; `config.toml` `file_size_limit = "10MiB"` ve `public/_headers` politikaları gerçek bir dağıtımda test edilmedi. Dosya **yükleme** akışı arayüzde yok (yalnızca veri yolu/yapıştırma ile bağlantı saklanıyor) — bu bir eksik değil, mevcut kapsam; ama "belge arşivi" iddiasını zayıflatıyor.

## 22. Görevler

Düzeltildi: durum seçimli (`pending/in_progress/done/cancelled` — **`cancelled` arayüzden hiç erişilemiyordu**, tıklayarak döngü yerine `<select>`); `clinicToday()` (UTC kayması nedeniyle "bugün" 1 gün şaşabiliyordu); danışan listesi artık mağaza aboneliğiyle canlı (`subscribeClinicalStore`) — görev satıcısı bayatlıyordu; `window.confirm` kaldırıldı, silme `useConfirmDialog`; satır içi `error`. CSS: `.task-status-select` (`workspace.css`).

## 23. Arama

İki arama yüzeyi de normalize edilmiş Türkçe ile eşleştiriyor: seans notları (`SoapSessionsPage`) ve **bu fazda düzeltilen danışan listesi** — `toLowerCase()` "İ" → `i̇` (birleşik nokta) yaptığı için **"ibrahim" yazan hekim "İbrahim" kaydını bulamıyordu**; ayrıca dosya no/telefon/TC alanlarında `q` normalize edilmeden karşılaştırılıyordu. Ortak `trLower`/`trIncludes` (`src/clinical/recordRules.ts`) kullanılıyor.
**Test:** `tests/recordRules.test.ts` → 5/5; eski hatalı davranışın geri gelmemesi assert edildi.
**Kalan P2:** danışan dosyası içinde tek satırlık tam-metin araması (tüm bölümler boyunca) yok; Hub'daki geçmiş listesi arama filtresi taşımıyor.

## 24. Hata yönetimi ve sınırlar

- **Yerel diyaloglar: 33 → 0.** Bu fazda kalan 14'ü (4 ölçek sayfası) da kaldırıldı; `grep -rn "\balert(\|\bconfirm(\|\bprompt(" src/` = 0 ve **`tests/uiGuards.test.ts` bunu kalıcı kılıyor**.
- Doğrulama mesajları satır içi, `role="alert"`; başarı mesajları `role="status"`; hata sonrası diyalog **kapanmıyor** (`useConfirmDialog`'da `run` throw/resolve-reject ederse açık kalır ve hata gösterilir; `busy` durumu var).
- Sınırlar: `ClinicErrorBoundary` `main.tsx`'te; **metni düzeltildi** — eskiden "kayıtlar bozulmuş" gibi okunuyordu; artık "kayıtlarınız silinmedi, ekranın sorunu" + yedek yönlendirmesi.
- Kota: §11. `store listener error` gibi iç hatalar konsola yazılıyor; **konsolda klinik içerik yok** (satır satır denetlendi: §39).
- `catch {}` = 0; `@ts-ignore` = 0; `as any` = **0** (bu fazda randevu sayfasındakiler de gitti).

## 25. Yüklenme durumları

Bulut girişinde `role="status"` "Oturum doğrulanıyor…" kartı; **bu fazda eklenen:** lazy rotaların `Suspense` iskeleti (`.route-loading`, `prefers-reduced-motion`'da durur), CloudAdminPanel'de "Hesaplar yükleniyor…", kaydet/düğme seviyesinde `aria-busy` + "Kaydediliyor…/Oluşturuluyor…" metinleri (SOAP, randevu, rapor, ölçek, görev, yedek yükle).
Veri katmanı senkron `localStorage` olduğu için "liste yükleniyor" iskeleti yapay olurdu; eklenmedi.

## 26. Boş durumlar

Her listede boş durum **neden + sonraki eylem** söylüyor ve `href`/düğme taşıyor: açılış "Her şey bir dosyayla başlar" → `/danisanlar`; takvim "Randevu henüz boş" → "Önce danışan ekle"; seans/liste filtrelerle boşsa "Filtreleri temizle" (bu fazda eklendi); Hub'da "Henüz değerlendirme kaydı yok"; rapor listesi boşken "Rapor oluştur"; CloudAdminPanel boş liste satırı (bu fazda). `tests/workspaceUi.test.ts` bu metinleri SSR çıktısında doğruluyor.

## 27. Yönlendirme ve derin bağlantılar

`src/router.ts`: `pushState`/`replaceState` + `popstate` dinleyicisi; Türkçe güzergâhlar; `?danisan=`, `?randevu=`, `?rapor=`, `?sekme=` parametreleri kullanılıyor ve **işlendikten sonra temizleniyor** (yinelenen açılımların önüne geçmek için). Bu fazda düzeltilen: `?randevu=` yalnız açılışta draft üretir (kaydetme sonrası URL'de kalırsa ikinci not riski vardı → akıştan sonra parametre düşürülüyor); `?rapor=` önceki sürümde hiç okunmuyordu.
Üretim derin bağlantısı doğrulaması: `vite preview` üzerinde `/danisanlar`, `/takvim`, `/raporlar` → **200 + index.html** (SPA fallback) `curl` ile ölçüldü (bkz. §1 LOCAL). Netlify/Cloudflare rewrite'ları bu denetimde uygulanmadı; `public/_headers` yalnızca başlık veriyor.

## 28. Geri / ileri gezinme

`popstate` tek kaynak; geri tuşu modalı kapatmıyor (dialog Escape ile kapanıyor, URL'i değiştirmiyor) — kabul edilebilir; **sekme durumu URL'de olduğu için** geri/ileri artık doğru sekmeyi gösteriyor (bu fazdan önce sekme kaybı vardı). `history.replaceState` kullanılan yerlerde (sekme, param temizliği) geçmiş kirlenmiyor. REAL BROWSER ile tuş-üstü doğrulama yapılamadı (bloke).

## 29. Duyarlı düzen

Kırılma noktaları `responsive.css` + `@media (max-width: 1050px)` yan gezinme → `MobileNav` (odak tuzağı, Escape); tablolar `data-mobile-cards` ile kart düzenine geçiyor (danışan, randevu); SCL sayfa düğmeleri dar ekranda 5+4. Bu fazda eklenen CSS: `.confirm-footer { display: flex }`, `.task-status-select`, `.safety-callout`, `.form-fieldset` reset, `.route-loading`.
**Kanıtsız:** gerçek genişliklerde taşma ölçümü yapılamadı (Playwright bloke) — `tests/responsiveContracts.test.ts` yalnızca **kural sözleşmesini** (media sorgularının varlığı/özellikleri) statik denetliyor. Bu yüzden "mobil uyumlu" iddiası bu raporda **sözleşme düzeyinde**, gözlem düzeyinde değil.

## 30. Erişilebilirlik (a11y)

Bu fazda düzeltilen:
- Danışan dosyasındaki bölüm paneli `role="menu"` + `role="menuitem"` idi (menu klavye semantiği yok) → `role="group"` + `aria-label`, aktif öğede `aria-current`, Escape ile kapanıp odağı tetikleyiciye iade ediyor.
- Ölçek sayfalarındaki `<label for>`siz alanlar: `bdi|bai|scl|scr` önekli `id`/`htmlFor` çiftleri; **cinsiyet+yaş çifti** `<fieldset><legend>` yapıldı (CSS reset eklendi), kontrollerde `aria-label`.
- Simge-only düğmelerde `aria-label` (seans kartı eylemleri, Hub "Dosyaya git"/"Sil", randevu satır eylemleri).
- `aria-busy` + `disabled` tüm kaydet yollarında; `role="status"`/`role="alert"` ayrımı; `skip-link` ve `main tabIndex={-1}` yerinde.
**Kalan P2/P3 (bilinçli bırakıldı):** odak halkası `outline: none` üzerine `box-shadow` koyan iki stil kuralı var — klavye kontrastı gözle doğrulanamadı (bloke); `MobileNav`'daki menü düğmesi `aria-expanded` taşıyor ama `aria-haspopup` yok; tablo başlıklarında `scope="col"` eksik (`client/table` ve `appointments/table`); Hub geçmiş listesi için `aria-live` yok (liste kendisi zaten veri listesi, bildirim değil). Ekran okuyucu ile hiç test yapılmadı.

## 31. Tasarım tutarlılığı ve hiyerarşi

Tek palet (`theme.css` token'ları), tek kart yüzeyi (`modern-table-card`), tek buton seti (`btn-primary/secondary/danger/sm`), tek boş durum (`empty-state-card`), tek dialog (`ClinicalDialog`/`ConfirmDialog`). Bu fazda: ikinci SOAP modalının silinmesi ile **kayıt formları tek diyalog kimliğine** indi; `alert()` yerine tümünde satır içi bildirim; sekme başlıkları tek `board-section-head` kalıbında.
**Ölçülen P2:** `src/styles/*.css` içinde **219 sınıf tanımlı, 142'si markup'ta geçmiyor** (`scan-*`, `paper-viewport*`, `report-edit-*`, `ws-*`, `admin-*`, `faq-*` kalıntıları). Toplu silme **yapılmadı**: `badge-*`, `status-*`, `priority-*` gibi adlar şablonla üretiliyor ve tarayıcı doğrulaması yok; kör silme stil kaybına yol açardı. CSS 145.78 kB (26.41 kB gzip) — silinmesi gereken bir "kötü koku" değil, doğrulanması gereken bir liste.

## 32. Favicon ve uygulama simgeleri

`index.html`: `lang="tr"`, `robots noindex`, `color-scheme: light`, `/favicon.svg` (`#205c48` zemin + `#f1f7f0` mürekkep). **Bu fazda eklenen:** `public/apple-touch-icon.png` (180×180, saydamlık yok, SVG geometrisinden üretilir) + `<link rel="apple-touch-icon">`; üretici betik `scripts/make-touch-icon.mjs` ve `npm run make:touch-icon` (ortamda rsvg/inkscape/sharp olmadığı için geometriden çizilir; çıktı `read_file` ile görsel olarak doğrulandı ve `vite preview` üzerinden **200** döndü).
`theme-color` bilinçli olarak `#f5f7f3` bırakıldı: mobilde tarayıcı şeridi sayfanın üst yüzeyiyle eşleşmeli; uygulama zemini açık, `color-scheme: light` beyaz mürekkeple birlikte tanımlı. Marka yeşiline çevirmek durum çubuğunu içerikle uyumsuz kılardı — **önceki fazın "theme-color yanlış" iddiası düzeltilmedi, gerekçeli reddedildi.**

## 33. Yazdırma (A4 / CSV)

Bu fazda düzeltilen: `@page { margin: 16mm 15mm }` **üst seviyeye** taşındı (bazı kurallar `@media print` içine gömülüydü, kenar boşluğu uygulanmıyordu); `.btn-print-hide` ile eylem düğmeleri/kartları çıktıdan düşüyor; danışan dosyasında yalnızca çıktıda görünen `.print-section-caption` satırı (danışan adı + dosya no + bölüm adı) — **kimin hangi bölümünün kağıda geçtiği çıktıda yazılı** olmadan arşivlenemezdi.
`window.print()` ölçek sayfalarında kalıyor (tarayıcı yazdırma diyaloğu — istenen davranış). CSV: `recordRules`/dışa aktarma yollarında `;` ayraç + `"` kaçarma; BOM yok — **Excel TR için BOM eksik P3 olarak raporlandı** (değiştirilmesi veri formatı kararı).
Gerçek sayfa sayısı/taşma/renkli yazdırma **REAL BROWSER**'da doğrulanamadı (bloke).

## 34. Performans ve paket boyutu

Ölçüm (LOCAL, aynı komut: `npm run build`):

| | Önce | Sonra |
| --- | --- | --- |
| Giriş JS (`index-*.js`) | 458.00 kB · 128.35 gzip | **343.78 kB · 102.54 gzip** |
| Ayırık parçalar | 3 chunk (index + vendor + supabase) | **18 chunk**: giriş dışı 15 parça (ClientDetail 31.73, SCL 18.45, BDI 18.36, rapor 12.87, BAI 12.38, tarama 11.92, seans 9.04 kB…) |
| CSS | 143.93 kB · 26.05 gzip | 145.78 kB · 26.41 gzip (+3 yeni kural) |
| Supabase istemcisi | 223.38 kB · 58.43 gzip (modulepreload) | değişmedi |
| Modül sayısı | 132 | ~132 (bölünmüş) |

Yapılan: `React.lazy` + `Suspense` ile ağır ekranların (dosya detayı, 4 ölçek sayfası, seans listesi, rapor editörü, denetim, bilgi sayfaları) yola indirilmesi; ölü modüllerin silinmesi (§41).
Yapılmayan ve **nedeni açıkça bırakılan**: `@supabase/supabase-js` chunk'ının tembel yüklenmesi. `requireSupabase()` senkron API ve `onAuthChange()` aboneliği async'e çevrilmeden yapılamaz; giriş akışı bu ortamda hiç çalıştırılamadığı için (LIVE bloke) doğrulanamaz bir auth refactor'u riski alındı. Öneri olarak duruyor: ~58 kB gzip ilk yüke giriyor, **yerel modda hiç gerekmiyor**.
Diğer ölçümler (liste boyutu, render sayısı, animasyon maliyeti) tarayıcı gerektirir → yapılamadı.

## 35. Sırlar ve istemciye sızan anahtarlar

Taranan: `src/` içinde `service_role|SERVICE_ROLE` → **0** (`tests/uiGuards.test.ts` bunu kilitliyor). `.env*` depoda yok; `VITE_SUPABASE_ANON_KEY` yalnızca istenen bir değer (anon = RLS'e tabi public rolü). `safeSupabaseOrigin()` adresi doğruluyor (yerelde http, dışarıda https, ek yol/kullanıcı/şifre yok). `git grep -I -nE "(AKIA|ghp_|-----BEGIN|sk_live)"` (kilit dosyası hariç) → **0 eşleşme**.
**Risk:** yerel modda şifreleme yok — yan panelde ve Ayarlar'da açıkça yazıyor; bu bir gizlilik iddiası değil, kabul edilen sınırdır (paylaşılan bilgisayarda tarayıcı profili = klinik dosya). Gerçek dağıtımda CSP başlıklarının生效 ettiğini `public/_headers` iddia ediyor; **okundu, canlıda doğrulanmadı** (PRODUCTION bloke).

## 36. Edge functions

`supabase/functions/admin-users/index.ts`: JWT + rol doğrulaması, `must_change_password: true`, `admin_invite_user` / `set_initial_password` / organizasyon işlemleri; hata yollarında `console.error` ve kullanıcıya **asla iç SQL mesajı göstermeyen** Türkçe metinler.
Bu fazda düzeltilen: (a) 409 — **yinelenen e-posta** artık "Bu e-posta ile kayıtlı bir hesap var." olarak dönüyor (önceden DB hatısı genel 500'e düşüyordu ve yanlış yönlendiriyordu); (b) parola kuralı ihlali 400 + anlaşılır metin; (c) kullanıcıdan **olmayan** bir komut (`npm run diagnose:supabase` — depoda böyle bir script yok) metinden kaldırıldı; `supabase functions logs admin-users` gerçek komut bırakıldı.
İstemci tarafı eşleşme: `src/features/admin/adminApi.ts` artık **`{ profile }` sarmalayıcısını açıyor** (önce ham yanıt `AdminProfile` sanılıyordu → davet sonrası tablo bozuk satırla büyürdü), `CloudAdminPanel` minLength **10** (sunucu kuralıyla eşit) + meşgul/yükleniyor/boş durumları.
**Kanıt:** `tsc` + gömülü metin denetimi. Çağrı denemesi yapılamadı (LIVE bloke). Denetlenen eksik: `verify_jwt`/`config.toml` içindeki `inbucket/smtp/auth` portlarının hepsi 54325'e bağlanmış görünüyor — lokal çalıştırma yapılmadığı için doğrulanamadı, **tekstil olarak bırakıldı**.

## 37. Migrations / şema tutarlılığı

7 göç, PGlite'ta sırayla kuruluyor ve test ediliyor (`tests/securityExtended.test.ts` tüm klasörü okur; bu fazda eklenen `20260924000007` de dahil → hatasız).
Tutarsızlıklar (rapor edildi, **kod değiştirilmedi** çünkü hangisinin doğru olduğu canlı projeye bağlı):
- `000004` hâlâ `insert into storage.buckets … file_size_limit 52428800`; `000006` "storage oluşturma kaldırıldı" diyor; `config.toml` `file_size_limit = "10MiB"`. Üç farklı limit.
- `audit_logs_action_check` düşür/yeniden-kur bloku `000001/04/05/06` içinde tekrar ediyor (son kazanır; taşınabilir ama kırılgan).
- `public.anamneses`, `assessments`, `test_administrations`, `notes`, `documents`, `tasks` tablolarının bir kısmının arayüz karşılığı yok (§9, §16, §21) — **şema üründen önde**.
- Bu fazda eklendi: `alter table storage.objects enable row level security` (kendi Postgres'inde RLS kapalıysa storage politikaları hiç uygulanmıyordu).
**Yapılmayan (bilinçli):** yeni tablo/kolon icat etmedim; `force row level security` eklemedim; politikaları gevşetmedim; `audit_logs`'u istemciye açmadım.

## 38. Yedekleme ve kurtarma / veri yönetimi

Ayarlar → veri yönetimi modalı: dışa aktarma (danışan+klinik+uygulama, tek JSON), geri yükleme (**doğrula → tek atomik commit**), temizleme (`SIL` yazımı + `ConfirmDialog`, iki mağaza birlikte, denetim izine kayıt). 8 MB tavan.
"Yedek var" iddiası **kurulamaz**: sunucuda kopya yok (§9). Uygulama bunu kullanıcıya üç yerde söylüyor (yan panel, Ayarlar, hata metinleri) — bu fazda `SettingsPage` ve `AuditPage` metinleri **gerçeğe düzeltildi**: eskiden "Kurum verisi RLS ile ayrılır" / "Bulut açıksa sunucu kendi kaydını ayrıca tutar" diyordu; şimdi klinik verinin sunucuya yazılmadığı ve denetim izinin cihazda kaldığı açıkça yazılı. Kurtarma tatbikatı (yedek al → temizle → geri yükle) LOCAL'da birim test düzeyinde (`commitScopedWrites` + plan fonksiyonları) doğrulandı; **gerçek tarayıcıda round-trip doğrulanamadı** (bloke).

## 39. Günlükleme ve denetim izi

`recordAudit` cihazda, son 200 olay, kapsam imzasıyla (`actor`). Bu fazda **kayıp yollar kapatıldı**: seans notu, randevu, ölçek sonucu, rapor ve tarama silme/kaydetme artık iz bırakıyor (önce yalnız danışan/not/görev/belge/ayarlar). `update` etiketi eklendi; `session/appointment/test/report` görünen adları `AUDIT_ENTITIES`'e yazıldı. Denetim izi hiçbir klinik yazmayı **engelleyemez** (`audit()` sarmalayıcısı yutar).
Konsol: `src/` içinde 8 `console.*` — satır satır denetlendi, **hiçbiri danışan içeriği veya e-posta basmıyor** (yalnız hata mesajı, alan adı ve `userId` UUID'si). Üretimde susturulması önerilir; bu fazda dokunulmadı çünkü hata ayıklama değeri var ve KVKK riski ölçülmedi.
`AuditPage` son olayları listeliyor; **sunucuya yansımıyor** (tasarım). DB `audit_logs` tablosu yalnız `log_audit_change()` trigger'ı ile dolar — **yerel kayıt buluta yazılmadığı için pratikte boş**.

## 40. Test paketi denetimi

| Ölçüm | Önce | Sonra |
| --- | --- | --- |
| `npm test` | 90 test / 22.9 s / 0 hata | **98 test / ~30 s / 0 hata** |
| Test dosyası | 19 | **20** (`draftStorage.test.ts` silinen modülle gitti; `clinicalIsolation.test.ts` ve `uiGuards.test.ts` eklendi) |
| RLS kanıtı | org隔离 + 7 tablo | **+8 grup: aynı kurum içi erişim, rapor kilidi, storage klasörü** |
| Statik koruma | yok | **5 kural** (native dialog=0, kapsam dışı `localStorage`=0, `service_role`=0, denetim izi eksik yazma=0, yeni göç yalnız-sıkılaştırma + yazdırma kuralları) |
| SSR render kanıtı | 5 güzergâh | 5 güzergâh (lazy sonrası da geçiyor) |
| E2E | 6 Playwright spec | **çalıştırılamadı** (bkz. §1) |

Silinen testler yalnız silinen ölü modüllere aitti (`draftStorage`) — hiçbir davranış koruması çıkarılmadı, kural ihlali yok.
`playwright.config.ts` `baseURL: http://localhost:5173` ve `webServer` **tanımsız**: CI'ın spec'leri çalıştırması için dev sunucunun ayrıca kaldırılması gerekiyor — rapor sahibine not.

## 41. Ölü kod, bağımlılıklar, kod kalitesi

**Silinen ölü modüller** (içeriği hiçbir yerden import edilmiyordu; varlıkları "kontrol var" izlenimi veriyordu):
`src/lib/securityHeaders.ts`, `src/lib/dateGuards.ts`, `src/lib/rateLimit.ts`, `src/lib/validation.ts`, `src/lib/pagination.ts`, `src/workspace/draftStorage.ts`, `src/auth/adminApi.ts` (bulut API'sinin **ikinci, ölü kopyası** — iki `adminApi.ts` iki farklı sözleşme taşıyordu; bu, §36'daki `{ profile }` hatasının kökü), `tests/draftStorage.test.ts`. 43 dosya değişti, +1408/−1650 satır.
**Bağımlılıklar:** `@hookform/resolvers`, `react-hook-form`, `zod` **hiçbir kaynak dosyadan import edilmiyordu** ("zod" eşleşmesi Türkçe "epizod" sözcüğüydü) → `npm uninstall` ile `package.json` + `package-lock.json` birlikte temizlendi; runtime bağımlılığı **3 pakete** indi (`react`, `react-dom`, `@supabase/supabase-js`). `npm audit` → **0 zafiyet**. Kurulu sürümler: react/react-dom 19.3.0, supabase-js 2.117.1, vite 7.3.6, typescript 5.9.3, @playwright/test 1.63.0; Node motoru `>=22`; kilit dosyası v3, 145 paket.
**Kod kalitesi:** `tsc --noEmit` 0 hata (`strict`); `as any` 0; `@ts-ignore` 0; TODO/FIXME 0; boş `catch {}` 0.
**Kalan P3 listesi (kasıtlı bırakıldı):** `src/features/ai/*` (UI'ya bağlı değil, `aiTypes` tipi import ediliyor — silmek/bağlamak ürün kararı); 142 kullanılmayan CSS sınıfı (§31); `clientName` snapshot'ları (§12); `src/styles` 8.7k satır, 4 ayrı yazdırma bloğu; `config.toml` port çakışması (§36); Excel BOM (§33).

---

## Değiştirilen / eklenen dosyalar (bu faz)

`index.html`, `package.json`, `package-lock.json` · `src/App.tsx`, `src/main.tsx` · `src/clinical/{clinicalStore,practiceStore,casework,recordRules,storageScope}.ts` · `src/features/admin/adminApi.ts` · `src/components/{ClinicErrorBoundary,ConfirmDialog}.tsx` · `src/components/clinical/{ClientListPage,ClientDetailPage,SoapSessionsPage,SoapSessionDialog,AppointmentsPage,ClinicalReportsPage,DataManagementModal,AssessmentHubPage,BeckDepressionPage,BeckAnxietyPage,Scl90Page,RapidScreeningPage}.tsx` · `src/components/practice/{TasksPage,SettingsPage,AuditPage,CloudAdminPanel}.tsx` · `src/styles/{theme,auth,clinical,workspace}.css` · `supabase/functions/admin-users/index.ts` · `supabase/migrations/20260924000007_clinical_record_isolation.sql` · `tests/{recordRules,clinicalStore,practiceStore}.test.ts`, `tests/{clinicalIsolation,uiGuards}.test.ts` (yeni) · `scripts/make-touch-icon.mjs` + `public/apple-touch-icon.png` (yeni).

## Bu raporda kanıtlanamayanlar (kısaca)

1. Gerçek Supabase şemasına `db push` ve politika uygulaması; `storage.objects` üzerindeki RLS varsayılanları.
2. Giriş/kayıt/yenileme/oturum-süresi akışının canlı davranışı.
3. Edge Function `admin-users` çağrısı ve `admin_invite_user` e-postası.
4. Tarayıcıda odak sırası, ekran okuyucu, kontrast, mobil taşma, yazdırma önizlemesi.
5. İki hesapla localStorage izolasyonunun **gözlemsel** kanıtı (yalnız statik + birim test var).
6. Kota/`QuotaExceededError` davranışı ve özel mod.
7. Gerçek paket yükleme süresi/LCP; CSP başlıklarının生效 etmesi.

Bunlar "hata bulunamadı" demek değil, **"ölçülemedi"** demektir.

## Nihai karar

# NOT PRODUCTION READY

Gerekçe (sırayla, hiçbiri stil meselesi değil):
1. **Klinik kayıt buluta yazılmıyor** — tek kopya cihazda; `anamneses/assessments/test_administrations` gibi tablolar arayüzden erişilemez durumda (§9, §16, §21). Bir tarayıcı profili kaybı = kalıcı klinik veri kaybı; "yedek al" bunun yerine geçmez, onu ancak kullanıcı hatırlarsa işe yarar.
2. **Kilit/imza/revizyon akışı yok** — tamamlandı raporu veritabanında bu fazdan sonra sahibi bile değiştiremiyor (§7/8), ama uygulamada sürüm/düzeltme/revizyon ve bunu gösteren denetim izi yok; ürünün kendi iddiası karşılanmıyor.
3. **Yerel modda erişim koruması yok** — şifreleme ve cihaz kilidi yok; bu kabul edilmiş bir sınır olarak yazılıyor, ama "KVKK odaklı üretim ürünü" ile aynı cümlede duramaz (§3, §35).
4. **LIVE SUPABASE / REAL BROWSER / PRODUCTION katmanları hiç doğrulanamadı** (§1, "kanıtlanamayanlar"). Bu, kararın kendisi kadar önemli: bu depo **kod düzeyinde** tutarlı ve testli; **dağıtım düzeyinde** hiç kanıtsız.

Yukarıdaki 1–3 kapatılmadan ve 4 en az bir gerçek Supabase projesi + tek bir tarayıcı oturumuyla doğrulanmadan bu ürün gerçek danışan dosyası tutmamalı.

Bu fazda yapılan her şey denetlenebilir kaldı: `npx tsc --noEmit` = 0 hata, `npm test` = 98/98, `npm run build` başarılı, `vite preview` + `curl` ile `/`, `/danisanlar`, `/takvim`, `/raporlar`, `/favicon.svg`, `/apple-touch-icon.png` = 200.
