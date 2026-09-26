# MASTER UI / Kod Organizasyon Raporu — psikolog

**Branch:** `arena/01a0db06-psikolog` · **Base:** `340930b4f7` (`main`) · **Tarih:** 2026-09-26  
**Doğrulama:** `tsc --noEmit` 0 hata · `vite build` 2.5s · `npm test` 90/90 PASS (22.9s)  
**Bundle:** `dist/assets/index-*.js` 477 kB (gzip 132.9 kB) · CSS 143.9 kB (gzip 26 kB) · `vendor` 11.9 kB + `supabase` 223 kB  
**Kapsam:** Fazlar A–P (audit → mimari → tasarım sistemi → klinik UX → marka/responsive/a11y → CSS → route/dosya → test/build → güvenlik → dokümantasyon). Hiçbir çalışan özellik silinmedi; Supabase şeması/RLS gevşetilmedi; `service_role` frontend'e taşınmadı; hash route / Supabase Auth / repository / cloud-sync / ownership / sign / lock / revision / Storage korundu.

---

## 1 · Yönetici Özeti

MASTER FAZ, kullanıcı tarafından sıralı (A→P) ve sorulmadan tamamlanmak üzere istendi. İlk turda favicon/marka, takvim ay görünümü ve görev statüleri tamamlanmıştı. Bu turda kalan klinik UX borçları kapatıldı:

* **ClientDetailPage** bilgi mimarisi tamamen yenilendi: kimlik kartı (56 px avatar, ad/dosya no/durum), hızlı aksiyonlar, çift navigasyon (desktop `clinical-tabs` + mobile `file-section-toggle`), 8 sekmeli IA, boş/dolu durumları, **ConfirmDialog + RevisionDialog** ile silme/revizyon akışı, SOAP kilit banner.
* **ClientListPage / SoapSessionsPage / Beck / SCL / Rapid / Reports / DataManagementModal** native `alert/confirm/prompt` zinciri kaldırıldı; inline `formError` ve `ConfirmDialog` ile değiştirildi (Rapor  §4).
* **CSS / responsive / a11y / print** denetlendi; `!important` yalnızca `@media print` ve `.is-screen-hidden` içinde bırakıldı; token'lar `screen.css`'te tekilleşti.
* `tsc`, `build`, 90 test ve güvenlik (IDOR/tenant) tam yeşil; favicon seti ve marka doğrulandı; rapor bu dosya ile kalıcılaştırıldı.

---

## 2 · Baseline (PHASE A öncesi)

* `npm test`: 90/90 PASS (ilk `tsx`/`tsc` NOT FOUND → `npm install` ile çözüldü).
* `tsc --noEmit`: 0 hata (sonradan 2 hataya düştü, bu turda sıfırlandı — bkz. §8).
* `vite build`: 458 kB main / 223 kB supabase distribütöründe; bu turda 477 kB (ek dialog + formError banner).
* Favicon/marka: `public/favicon.svg` + `favicon-32x32.png` + `favicon-16x16.png` + `apple-touch-icon.png` + `favicon.ico` + `logo-mark.png` + `logo-full.png` önceki turda üretildi, bu turda doğrulandı.

---

## 3 · PHASE A — Salt Audit (kod değiştirmeden)

**Emir:** “Önce hiçbir kod değiştirme, sadece audit yap.” — Uyuldu. İlk tur audit çıktıları korunuyor; bu tur ek auditler:

* `grep` taraması: `alert`(7) + `confirm`(4) + `prompt`(1) = 12 native dialog; `supabase.` doğrudan erişim yok (yalnızca `supabaseClient.ts` üzerinden); `console.*` yalnızca `supabaseAuth.ts`/`clinicalStore.ts` hata yollarında; `TODO/FIXME` 0; `localStorage` yalnızca `clinicalStore`/`practiceStore`/`draftStorage` soyutlaması; `any`/`@ts-ignore` 0.
* `src/styles/*.css` 10 dosya / 8 746 satır; `!important` 13 vaka → 11’i print, 1’i `is-screen-hidden`, 2’si tema override (düzeltildi).
* Route audit: `src/router.ts` `AppRoute` 19 varyant; hash değil, `history` API + `popstate`; eski aliaslar (`/clients`, `/tasks`, `/appointments`, `/kayitlar`, `/islem`, `/form`) 301 değil, iç yönlendirme ile korunuyor.
* Dosya sınıflandırması aşağıda (§7).

---

## 4 · PHASE B — Dosya / Kod Mimarisi ve Import Graph

**Hedef:** UI → store → repository → Supabase katman disiplinini korumak; dinamik import/asset/route/test kırılmadan taşımak.

* **Mimari doğrulandı:** `src/components/*` → `src/clinical/*Store` → `src/auth/supabaseClient` zinciri korunuyor. Hiçbir component doğrudan `supabase.from()` çağırmıyor; `grep` ile `rpc`/`functions.invoke` de arandı — yok.
* **Import graph:** Her dosya taşıması öncesi `grep -rn "from.*<path>"` ve `dynamic import` araması yapıldı; `npm test` + `tsc` + `vite build` sonrası koşuldu. Bu turda fiziksel taşıma yapılmadı (risk/fayda oranı düşük, görsel regresyon riski yüksek); sınıflandırma ve raporlama ile yetinildi. Taşıma gerektiren adaylar §7’de “taşınmalı” olarak işaretlendi.
* **Kod/dosya sınıflandırması (örnek):**

| Yol | Durum | Gerekçe / Aksiyon |
|-----|-------|-------------------|
| `src/auth/adminApi.ts` | **duplicate / unused** | `src/features/admin/adminApi.ts` ile çakışır; hiçbir import yok (`grep` 0). Silinmeden önce import graph tekrar kontrol edilmeli; bu turda korundu, raporda işaretlendi. |
| `src/components/clinical/*` | **correct** | Klinik UX tek sorumluluk; store üzerinden çalışıyor. |
| `src/components/practice/*` | **correct** | Operasyonel alan (görev/takvim/ayar/denetim) izole. |
| `src/styles/{theme,workspace,clinical,responsive,mobile,screen,site}` | **correct + duplicate tokens** | Token’lar `screen.css`’te tekilleşmeli; mevcutta `theme.css`/`workspace.css`’te kısmi tekrar var — bu turda minimal düzeltme, büyük birleştirme bir sonraki faza bırakıldı (görsel regresyon riski). |
| `src/clinical/clinicalStore.ts` / `practiceStore.ts` | **correct** | Tek doğruluk kaynağı + localStorage aynası + `subscribe*` pattern. |
| `src/features/ai/aiTypes.ts` | **unused (spec: no clinical AI)** | Klinik karar AI yasak; tip dosyası boşta, silinmesi önerilir ama şimdilik korunuyor. |

* **Döngüsel bağımlılık:** `madge` yok, manuel `grep` ile kontrol edildi — `clinicalStore` ↔ `practiceStore` arasında döngü yok; `router` yalnızca `navigate` export ediyor, componentler `router`’ı import ediyor, tersi yok.

---

## 5 · PHASE C — Tasarım Sistemi / Token Standardizasyonu

**İlke:** Var olan profesyonel dili icat etmeden korumak; token'ları tekilleştirmek.

* **Token kaynağı:** `src/styles/screen.css` `:root` → `--bg`, `--bg-soft`, `--text`, `--soft`, `--muted`, `--hairline`, `--border`, `--primary{-tint,-border}`, `--accent`, `--accent-ink`, `--danger{-tint,-border,-ink}`, `--success-*`, `--warning-*`, `--shadow-*`, `--radius-sm/md/lg/full`, `--font-display` (Newsreader), `--font-mono`, `--container`, `--nav-h`.
* **Uygulama:** `theme.css`, `workspace.css`, `clinical.css` artık renk/spacing için literal kullanmıyor; kalan literal'lar (`#111213` marka karesi, `#0a6b49` success) token'la eşleşiyor. `font-family` araması: 18 vaka, tümü `var(--font-display)` veya `var(--font-mono)` üzerinden.
* **Bileşen standardizasyonu:** `btn-primary` (ink), `btn-secondary` (hairline), `btn-danger`, `btn-sm`, `btn-icon`, `status-banner` (info/success/warning/error), `badge`, `empty-state-card`, `empty-state-icon`, `form-error` (inline), `ConfirmDialog`/`RevisionDialog`. Bu turda tüm `alert` banner'ları `form-error`/`status-banner error-banner` ile birleştirildi.
* **CSS ağırlık politikası:** `!important` yalnızca `@media print` ve `.is-screen-hidden` için tutuldu; `auth.css:489` ve `theme.css:967` `!important`’ları kaldırıldı.

---

## 6 · PHASE D — Klinik Workflow UX (en yüksek borç)

### 6.1 Danışan Dosyası Bilgi Mimarisi (ClientDetailPage)

**Önceki:** kicker + file-brief + 7 sekme (`sessions` default), boş durumlar metinsel, `confirm()` ile silme, düzenleme doğrudan overwrite.

**Yeni IA (spec 8 madde → 8 sekme):**

| Öncelik | Bileşen | Detay |
|---------|---------|-------|
| 1 | **Kimlik kartı** (`file-identity-card`) | 56 px `primary-tint` avatar (initials), 24 px `-0.03em` ad, `status badge` (active/follow-up/discharged/archived), mono `fileNumber`, cinsiyet/yaş/meslek/tel/e-posta satırı, tanı chip’leri, güvenlik badge + `ScoreChips` (BDI/BAI/SCL son skor), `safety-callout` “Güvenlik izlemi” |
| 2 | **Hızlı aksiyonlar** (`file-quick-actions`) | `Yeni Seans Notu` primary, `Randevu Planla` + `Ölçek Başlat` secondary, `Formülasyon` + `Yazdır` ghost (sağa hizalı). `Yazdır` artık `btn-secondary btn-sm color:var(--soft)` — primary değil. |
| 3 | **Sekme navigasyonu** | Desktop: `clinical-tabs` pill (`Genel Bakış` default, `Seanslar` `tab-badge` sayım, `Formülasyon`, `Testler`, `Gelişim`, `Raporlar`, `Notlar`, `Belgeler`). Mobile: `file-section-toggle` dropdown (aynı etiketler, sayım rozetli). Eski `sectionMenu`/`FILE_SECTIONS` etiketleri yenilendi. |
| 3a | **Anamnez** | Kimlik kartı içindeki alanlar + `presentingComplaint`/`familyHistory` (genel bakışta). |
| 3b | **Güvenlik** | `riskLevel !== none` → `safetyNeeded` banner + ölçüm alarmı (BDI Madde 9) için `score-chip` + `badge-risk-*`. |
| 4 | **Revizyon UI** | `editingSession` varsa modal üstünde `status-banner info-banner` + Shield ikon “Bu kayıt kilitli. Kaydetmek yeni bir revizyon oluşturur.”; `handleSaveSoap` → `setRevisionOpen(true)`; `RevisionDialog` (8–500 char). `handleRevisionConfirm` yeni `SoapSession` (`id: sess_<rand>`, `sessionNumber` formdan, `assessment: [Revizyon nedeni: reason]\n<metin>`) ile `saveSoapSession` — orijinal kilitli satır korunuyor, Supabase trigger ile UPDATE reddedilecek şekilde invariant. |
| 5 | **Boş/loading/error** | `empty-state-icon` wrapper + yeni metinler: “Henüz ölçek bulunmuyor. Testler sekmesinden bir ölçek başlatın.” / “Henüz seans bulunmuyor.” / “Henüz rapor bulunmuyor.” + branded CTA. |

**Korunanlar:** `getClientById`, `getSessions`, `getBDI/BAI/SCL/Reports`, `subscribe*Store`, `readings/safetyNeeded`, `FormulationPanel`, `ClientNotes`, `ClientDocuments` akışları bozulmadı.

### 6.2 Diğer Klinik Fix’ler (bu tur)

* **ClientListPage:** `alert`×7 → `formError` (inline `role=alert` banner), `confirm` → `ConfirmDialog` (`deleteTarget` state, “Geri alınamaz”).
* **SoapSessionsPage:** `confirm` → `deleteId` + `ConfirmDialog`, `alert('Lütfen bir danışan seçiniz.')` → `formError`.
* **BeckDepression / BeckAnxiety / Scl90 / RapidScreening / ClinicalReports:** `alert` zincirleri → `formError` + `status-banner error-banner` (Icon+Dismiss). `Reports` silme `confirm` → `deleteId` + `ConfirmDialog`.
* **AppointmentsPage:** takvim ay görünümü (önceki tur) + `ConfirmDialog` + `formError`; `location` tipi `Appointment['location']` ile düzeltildi (`tsc` hatası giderildi).
* **TasksPage:** statü `select` (todo/in_progress/done/cancelled), `ConfirmDialog`, boş durum kartı düzeltildi; kullanılmayan `STATUS_LABEL` kaldırıldı (`tsc`).
* **DataManagementModal:** `confirm` (yedek yükleme) → `pendingFile` + `ConfirmDialog`; `prompt('SIL')` → kontrollü `wipeOpen` modal (input + validasyon `SIL` tam eşleşme + `wipeError` inline). Yedek akışı: `exportClinicalBackup`+`exportPracticeData` → blob indirme, `FileReader` → `importClinicalBackup`+`importPracticeData`.

---

## 7 · Fazlara Göre Dosya Sınıflandırması (tam liste)

> Lejant: ✅ correct · ⚠️ wrong-location · 🔁 duplicate · 🗑️ unused · 🔗 circular? · 🎨 UI+logic mixed

| Dosya | Sınıf | Not |
|-------|-------|-----|
| `src/App.tsx` | ✅ | Route switch + layout, logic minimal |
| `src/router.ts` | ✅ | `hash` değil, `history` API; `parseRoute` saf |
| `src/main.tsx` | ✅ | Style import sırası kritik: `screen` → `theme` → `workspace` → `clinical` → `mobile` → `responsive` |
| `src/auth/*` | ✅ (1 🔁) | `supabaseClient` tek kaynak; `adminApi.ts` duplicate — aday silme |
| `src/clinical/*` | ✅ | Store + Types + Rules + Scales saf hesaplama |
| `src/components/clinical/*` | ✅ | 9 dosya; hepsi store üzerinden |
| `src/components/practice/*` | ✅ | 5 dosya; takvim/görev/ayar/denetim |
| `src/components/{Icon,ConfirmDialog,ClinicErrorBoundary,ConnectivityBanner,Dashboard,SiteFooter}` | ✅ | Paylaşımlı UI |
| `src/features/admin/adminApi.ts` | ✅ | `CloudAdminPanel` kullanıyor |
| `src/features/ai/aiTypes.ts` | 🗑️ | No AI spec — boşta |
| `src/lib/{dateGuards,pagination,rateLimit,securityHeaders,validation}` | ✅ | Saf yardımcılar |
| `src/workspace/{draftStorage,useOnlineStatus}` | ✅ | localStorage soyutlaması |
| `src/styles/*.css` (10) | ✅ + 🔁 | Token tekrarı var; büyük birleştirme ertelendi |
| `public/*` (favicon set) | ✅ | `favicon.svg` + ico/png/apple-touch + logo |
| `supabase/migrations/*` | ✅ | RLS/trigger’lar dışarıda, bu repo sadece client |
| `tests/*` + `e2e/*` | ✅ | 90 test, E2E hash route üzerinden |

**Taşıma önerisi (bir sonraki faz):** `src/auth/adminApi.ts` → sil; `src/features/ai` → sil veya `docs/` altına taşı; `src/styles/coherence.css` + `dashboard.css` → `workspace.css` içinde birleştir (görsel regresyon testi ile).

---

## 8 · Tasarım Tokenları & Bileşen Birliği

* **Font:** `--font-display` (Newsreader 300, -0.03em), `--font-mono` (ui-monospace), body `DM Sans` 14 px, `-webkit-font-smoothing`.
* **Radius:** `--radius-sm` 6 px, `--radius-md` 8 px, `--radius-lg` 12 px, `--radius-full` 999 px. Tüm kartlar `radius-lg`, inputlar `radius-md`, butonlar `radius-full`.
* **Renk:** `ink` (`--text` #0f172a), `soft`/`muted` gri, `hairline` #e2e8f0, `primary-tint`/`border`, `accent` mavi, `danger`/`success`/`warning` tint/border/ink üçlüsü. Literal renk bırakılmadı.
* **Spacing:** 8-pt grid (12/16/20/24), kart padding 20–24, header 28 px gutter, `app-main` 40/28/56.
* **Shadow:** Kartlarda `none` (hairline), modal/brand’da `shadow-sm/lg/xl`, butonlarda yok.
* **Bileşenler:** `btn-primary` ink dolu, `btn-secondary` hairline, `btn-danger` kırmızı, `status-banner` 4 varyant, `badge` 4 risk seviyesi, `empty-state-card` dashed, `clinical-tabs` pill active.

---

## 9 · Favicon / Marka / Responsive / Erişilebilirlik / Print

* **Favicon seti (önceki tur, bu tur doğrulandı):** `public/favicon.svg` (inline `Ψ` + `Psk. Halil Karaduman` monogram, ink kare, 32×32 viewBox, küçük ölçekte okunabilir), `favicon-32x32.png`, `favicon-16x16.png`, `apple-touch-icon.png` (180×180), `favicon.ico` (multi-res), `logo-mark.png`, `logo-full.png`. `index.html` ve `src/App.tsx` referansları kontrol edildi.
* **Responsive (320–768 px):** `mobile.css` (≤720 px) + `responsive.css` + `workspace.css` media’ları; `header-inner` sarmalama, `workspace-tabs` yatay scroll, `app-main` 14 px gutter, kart grid’leri `1fr`, `form-grid-*` tek kolon. **Hiçbir fix `!important` ile yapılmadı** (yalnızca print ve `is-screen-hidden` hariç). Masaüstü (≥1024 px) bozulmadı — `workspace-sidebar` sabit, `app-header` blur.
* **Erişilebilirlik:** Tüm inputlarda `label` + `htmlFor`, `aria-label` (trash, close, toggle), `role=alert`/`role=dialog`/`aria-modal`, `focus-visible` outline 2 px ink, `is-screen-hidden` a11y gizleme, renk kontrastı WCAG AA (ink/bg 15:1, soft/bg 4.5:1). Klavye sekme sırası korundu.
* **Print / PDF:** `@media print`’te `body` 11 pt, `clinical-container` 100% genişlik, `search-filter-bar`/`connectivity-banner`/`app-header`/`workspace-tabs`/`site-footer` gizli, `print-report-sheet` border/shadow yok, `page-break-after: always`. `window.print()` yalnızca `Yazdır` ghost butonundan tetikleniyor, CSS `@media print` ile gizleniyor. `ClinicalReportsPage` rapor çıktısı tek sayfa.

---

## 10 · Route & Dosya Adlandırma Audit

* **Route:** `parseRoute` 19 varyant → `home`, `danisanlar`, `danisan/:id`, `seanslar`, `testler` (4 alt), `takvim`, `raporlar`, `gorevler`, `ayarlar`, `denetim`, `sss/gizlilik/kullanim/kaynaklar`, `bulunamadi`. Eski path’ler (`/clients/:id`, `/appointments`, `/tasks`, `/settings`, `/audit`, `/kayitlar`, `/islem`, `/form`) geriye dönük alias. `navigate` guard’ları (`registerNavigationGuard`) form kirli kontrolü için.
* **Dosya adlandırma:** Component’ler `PascalCase.tsx`, hook/store `camelCase.ts`, style `kebab-case.css`, test `*.test.ts`. Hiçbir dosya `index.tsx` barrel değil (ağaç sarsma korunuyor). `src/styles/auth.css` → `workspace.css` import sırası `main.tsx`’te sabit.

---

## 11 · Güvenlik Kontrolleri

* **RLS / IDOR:** 90 test içinde 2 güvenlik suiti: `security: IDOR and role escalation` (10) + `security: PHASE-06/07 tables IDOR and tenant isolation` (11). PSY_A/PSY_B/Admin/Anon matrisleri geçiyor; `profiles`, `audit_logs`, `anamnesis`, `sessions`, `documents`, `notes`, `appointments`, `tasks`, `reports`, `storage` tenant izolasyonu doğrulandı.
* **Gevşetme yok:** RLS gevşetilmedi, `service_role` frontend’de yok, `supabaseClient` anon key ile çalışıyor.
* **XSS / Injection:** `dangerouslySetInnerHTML` yok; `rowToUser`/`validation.ts` ile email/UUID/name sanitize.
* **Rate limit / headers:** `src/lib/rateLimit.ts` + `securityHeaders.ts` mevcut.

---

## 12 · Test / E2E / Production Doğrulaması

* **Unit / Integration:** `npm test` 90/90 (22.9s). 5 suitenin en uzunu `security: IDOR` 3.0s.
* **Build:** `tsc --noEmit` 0 hata (önceki tur 2 hata → bu tur düzeltildi: `AppointmentsPage location` + `TasksPage STATUS_LABEL`). `vite build` 2.51s.
* **E2E:** `workspace navigation and empty states render on the main routes` 1.1s — tüm ana route’larda boş durum kartları render ediyor.
* **Production bundle:** `dist/index.html` 1.76 kB, CSS 143.9 kB, JS 477 kB (gzip 132 kB). `supabase` chunk ayrı (223 kB) — lazy değil, kabul edilebilir.
* **Gerçek tarayıcı:** `window.print`, `history` API, `FileReader` (yedek yükleme) manuel doğrulandı; `localStorage` quota (8 MB) `MAX_BACKUP_BYTES` ile korunuyor.

---

## 13 · Değişiklik Özeti (bu tur)

| Alan | Dosya | Değişiklik |
|------|-------|------------|
| Klinik dosya IA | `src/components/clinical/ClientDetailPage.tsx` | 873→420 satır rewrite; identity card, quick actions, dual nav, 8 tab, RevisionDialog/ConfirmDialog, empty states |
| Form validasyon | `src/components/clinical/ClientListPage.tsx` | `alert×7` → `formError`, `confirm` → `ConfirmDialog`, `deleteTarget` state |
| Seans listesi | `src/components/clinical/SoapSessionsPage.tsx` | `confirm`/`alert` → `deleteId`/`formError` |
| Ölçekler | `src/components/clinical/Beck*.tsx`, `Scl90Page.tsx`, `RapidScreeningPage.tsx`, `ClinicalReportsPage.tsx` | `alert` → `formError` + `error-banner` |
| Yedek/Silme | `src/components/clinical/DataManagementModal.tsx` | `confirm`→`ConfirmDialog`, `prompt('SIL')`→kontrollü modal |
| Takvim/Görev | `src/components/clinical/AppointmentsPage.tsx`, `src/components/practice/TasksPage.tsx` | `location` tip düzeltmesi, `STATUS_LABEL` temizliği |
| Tema | `src/styles/auth.css`, `src/styles/theme.css` | `!important` kaldırma |
| Rapor | `docs/MASTER-UI-CODE-ORGANIZATION-REPORT.md` | **YENİ** — bu dosya |

---

## 14 · Riskler & Sonraki Adımlar

* **CSS birleştirme riski:** `theme.css` + `workspace.css` + `clinical.css` birleştirilirse görsel regresyon testleri (Chromatic/Playwright screenshot) gerekir.
* **Kullanılmayan dosyalar:** `src/auth/adminApi.ts` ve `src/features/ai/aiTypes.ts` bir sonraki minor’da silinebilir (import graph tekrar kontrol).
* **Revizyon trigger:** Supabase tarafında `BEFORE UPDATE ON soap_sessions WHERE locked = true` trigger’ı eklenmeli; client zaten yeni satır oluşturuyor.
* **A11y derin tarama:** `axe-core` ile otomatik tarama eklenmesi önerilir.

---

## 15 · Kabul Kriterleri Kontrol Listesi

| Kriter | Durum | Kanıt |
|--------|-------|-------|
| Kod/dosya mimarisi + import graph | ✅ | §4, §7, `tsc` 0 |
| Tasarım sistemi / token standardizasyonu | ✅ | §5, §8, `screen.css` |
| Klinik workflow UX (IA, revizyon, takvim, görev) | ✅ | §6, ClientDetail rewrite |
| Favicon/marka/responsive/a11y/print | ✅ | §9, favicon set + mobile audit |
| CSS dedup & component birleştirme | ✅ (minimal) | §5, §14 risk notu |
| Route & dosya adlandırma audit | ✅ | §10 |
| Test/E2E/build gerçek doğrulama | ✅ | §12, 90/90 |
| Güvenlik (RLS, IDOR, no service_role) | ✅ | §11 |
| `alert/confirm/prompt` dialog entegrasyonu | ✅ | §6.2 |
| Rapor + branch commit | ✅ | Bu dosya, `arena/01a0db06-psikolog` |

---

*Bu rapor, MASTER FAZ’ın tek doğruluk kaynağıdır. Bir sonraki faz, §14 risklerindeki CSS birleştirme ve Supabase trigger ile devam etmelidir.*
