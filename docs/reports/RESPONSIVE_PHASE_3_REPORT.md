# RESPONSIVE — PHASE 3 RAPORU (Formlar / Girdiler / Etkileşimler)

**Tarih:** 2026‑09‑23
**Branch:** `arena/01a0d039-repo123`
**Önceki commit:** `6bea7b3` (`docs: phase 2 report`)

---

## Changed

| Dosya | Değişiklik |
| --- | --- |
| `src/styles/responsive.css` | ≤720 px: modal iç yerleşimi (`.modal-header/.modal-body/.modal-footer`), durum/boş/yükleme kartları, rapor editörü araç çubuğu + tablo hücresi alanları; yeni **≤560px** bölümü: `.form-grid-2col`/`.form-grid-3col` tek kolon, aksiyon satırları sarma |
| `tests/responsiveContracts.test.ts` | +3 test (toplam 14): modal mobil ölçüleri, form ızgarası daralması, editör araç çubuğu/hücre alanları |

---

## Fixed

### P1‑5 — Modal mobil geometrisi
*Önceki davranış (kanıt: `auth.css:495–570`):* `.modal-backdrop { padding: 24px }`,
`.modal-container { max-height: 90vh }`, `.modal-header { padding: 20px 24px }`,
`.modal-body { padding: 24px }`, `.modal-footer { padding: 16px 24px; display:flex; justify-content:flex-end }`.
320 px ekranda içerik genişliği **272 px**'e düşüyordu; `90vh` mobil tarayıcı URL çubuğu yüzünden görünür
alanı aşabiliyor ve alt aksiyon düğmesi ekran dışına taşabiliyordu.
*Yeni:* ≤720 px → başlık `16px 16px 14px`, gövde `16px` + 18 px boşluk, altlık `12px 16px` + `flex-wrap`
ve düğmeler `flex: 1 1 auto` (yanlış düğmeye basma riski azalır); ≤430 px → backdrop dolgusu 12 px.
`90dvh` sınırı Phase 1'de eklendi; Esc/backdrop-dışı-tıklama, odak yönetimi ve `aria-modal` **değişmedi**
(`ConfirmDialog.tsx` aynen çalışır).

### Form ızgaraları
*Önceki (kanıt: `auth.css:361`,`auth.css:367`):* `.form-grid-2col` ve `.form-grid-3col` için yalnızca
`.form-grid-3col` 900 px'te tek kolona iniyordu; **`.form-grid-2col` hiç daralmıyordu** →
Yönetim → "Yeni Psikolog" formu 320 px'te iki dar kolona sıkışıyordu.
*Yeni:* ≤560 px'te her iki ızgara da tek kolon; `.form-col-span-2` tek kolona yayılır.

### Aksiyon satırları (yanlış dokunma riski)
*Önceki:* `.form-actions-bar`, `.section-header-actions`, `.report-settings-actions` vb. sarmıyordu;
44 px hedefler yan yana geldiğinde 320 px'te iki ~100 px'lik düğme kalıyordu.
*Yeni:* ≤560 px'te bu satırlar `flex-wrap: wrap` + tam genişlik; rapor ayarları düğmeleri eşit paylaşır.

### Rapor editörü — sabit araç çubuğu
*Önceki (kanıt: `reports.css:250`):* `.report-toolbar { position: sticky; top: 0 }` ve ~14 düğme.
Phase 1'de düğmeler 44 px'e çıkınca 320–430 px'te araç çubuğu ~4 satıra yayılıp **ekranın yarısını
kalıcı olarak kaplıyordu** (yazarken içerik görünmez hâle geliyordu).
*Yeni:* ≤720 px'te `position: static` — araç çubuğu belgeyle birlikte kaydırılır, 44 px hedefler korunur.

### Editör tablo hücreleri
*Önceki:* `.report-edit-table textarea { min-height: 36px }` (`reports.css:411`) — mobilde dokunması zor.
*Yeni:* ≤720 px'te `min-height: 44px`.

### Diğer (Phase 1'den devralınan, bu phase'te doğrulanan davranışlar)
16 px form kontrolleri (iOS focus zoom), 44 px dokunma hedefleri (`.btn-sm`, `.icon-close-btn`, `.mmpi-tab`,
`.portal-tab`, `.subnav-tab`, `.site-footer-link`, `.btn-logout`, `.quicknav-chip`, alt sekmeler…),
checkbox/radio 20 px, `line-height: 1.35` ile platform farkı kapatma, `.expert-notes-input` 16 px.

**Değişmeyen sözleşmeler:** `type="submit"`/`<form>` akışları, doğrulama mantığı, hata mesajları
(`.ws-hint.is-error`, `role="alert"`), `auth-form` gönderimi, dosya yükleme inputları (`file-input-hidden`)
ve `accept` filtreleri. Hiçbir bileşen dosyası bu phase'te değiştirilmedi.

---

## Tested

| Kontrol | Komut | Sonuç |
| --- | --- | --- |
| Sözleşme testleri | `npx tsx --test tests/responsiveContracts.test.ts` | ✅ 14/14 |
| Tüm test paketi | `npm test` | ✅ **658 test / 0 hata** (phase 2: 655 → +3), 136 sn |
| Yazdırma/form regresyonu | `printLayout`, `pdfForm`, `formIdentity`, `mmpiClinicalReportUi` | ✅ |
| Build | `npm run build` (test paketi `build.test.ts` içinde ayrıca çalıştırır) | ✅ |

**Yeni testler:** ⑫ `.modal-header/.modal-body/.modal-footer` ≤720 px ölçüleri + `.modal-backdrop` ≤430 px;
⑬ `.form-grid-2col/.form-grid-3col` ≤560 px'te tek kolon; ⑭ `.report-toolbar` ≤720 px'te `position: static`
ve `.report-edit-table textarea` `min-height: 44px`.

---

## Remaining

* `.date-filter-field` içindeki inline `style={{ width: 70 }}` (yaş filtreleri, `MyRecordsPanel.tsx:199/203`)
  **bilinçli olarak korundu**: satır içi stil CSS'i ezdiği için genişlik ancak bileşen değiştirilerek
  düzeltilebilir. 16 px fontla "120" + dolgu 70 px'e sığdığı ve alanlar `flex: 1 1 auto` ile büyüdüğü için
  mobilde kullanılabilir; gereksiz risk almamak adına bileşene dokunulmadı.
* `button` öğelerinde `type` özniteliği eksik olan ~40 yer (çoğu `ReportEditor.tsx`) — hepsi `<form>`
  dışında olduğu için bugün davranışsal risk yok; tutarlılık işi Phase 7'ye bırakıldı.
* Kameranın izin/önizleme ekranı ve OMR inceleme akışı → Phase 6.

## Known Issues

1. Araç çubuğu mobilde artık sabit değil: uzun bir raporu düzenlerken biçimlendirme düğmelerine ulaşmak
   için yukarı kaydırmak gerekir. Alternatif (sabit) seçenek mobilde ekranın yarısını kapladığı için
   bilinçli tercih yapıldı; masaüstünde `position: sticky` **aynen korunur**.
2. Checkbox/radio 20 px'e çıkarıldı; `.ws-choice-row` gibi pill etiketler içinde zaten 44 px satır
   yüksekliği vardır, dolayısıyla görsel denge korunur (görsel doğrulama yapılamadı).
3. ≤560 px'te aksiyon satırları tam genişliğe yayılır; masaüstünde satır içi kalır.

---

## Commit

```
87f1225  responsive: optimize forms and interactive components
```
(kod + testler + `optik-form.html` tek dosya çıktısı bu commit'te; bu rapor
`docs: phase 3 report` commit'i ile eklenir.)

**Doğrulama:** `git show --stat 87f1225` ile dosya listesi ve satır sayısı kontrol edildi;
`git status` temiz (rapor hariç).
