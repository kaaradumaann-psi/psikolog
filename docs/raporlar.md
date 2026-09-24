# MMPI Raporlar sistemi

## Kullanım ve kurulum

1. `supabase db push` ile `20260923000000_psychologist_reports.sql` dahil migration'ları uygulayın.
2. Mevcut `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` ayarlarıyla `npm run build` çalıştırın.
3. Giriş yapın → Kayıtlarım / Yönetim → **Raporlar**. Test detayındaki özetten veya **Raporlar** sekmesinden de ulaşılır.
4. Şablon seçin → **Yeni Psikolog Raporu**. Oluşturulan rapor Supabase'e kaydedilip editörde açılır.

Bu geliştirme ortamında canlı Supabase bağlantısı bulunmadığından migration canlıya uygulanmadı.
Üretim veritabanına veya gerçek danışan verisine yazılmadı. PostgreSQL politikaları ve trigger'lar
PGlite üzerinde gerçek SQL çalıştırılarak test edilir; bu test canlı Supabase dağıtım kontrolünün yerine geçmez.

## Mimari ve dosyalar

`Mevcut kayıt/profil yolu → ReportDataAdapter → şablon → ReportDocument → baskı/PDF`

- `src/reports/loadReportContext.ts`: mevcut `getRecordDetail`, `parseRecordPayload`, `profileFromRecord` yolunu kullanır. Kaydı oluşturan kullanıcının profilinden uygulayan adını okur. Yeni klinik hesaplama yoktur.
- `reportDataAdapter.ts`: sadece mevcut çıktıların biçimlendirilmesi ve ayrık JSON anlık görüntüsü; puanlama yürütmez. Mevcut `clinicalBandFor` / `codeInterpretationForProfile` yorum seçicilerini kullanır.
- `templateEngine.ts`: blok/inline belge modeli, standart şablon, güvenli `{{path}}` çözümlemesi, gerçek alan kataloğu, koşullu bölümler. Skor içeren özel şablon alanları da kilitli bloğa dönüştürülür.
- `reportsApi.ts`: UUID doğrulamalı Supabase işlemleri, ayrı mutasyon sayımı ve okuma; çakışma kontrolü.
- `useReportAutosave.ts`: 1,4 saniye debounce, sıralı kaydetme, durum/hata, ayrılma uyarısı.
- `ReportEditor.tsx`: editör, geri al/yinele, veri ekleme, antet uygulama, AI metni ekleme, sürüm geçmişi ve geri yükleme.
- `ReportPreview.tsx`: React ile güvenli metin çıktısı; gerçek HTML metin/tablo, raster/screenshot değil.
- `ReportSettings.tsx`: antet/logo/imza yönetimi.
- `ReportsPage.tsx`: liste, oluşturma, kopyalama, silme, şablon örneği, Tam Rapor ve kayıt özeti.
- `src/styles/reports.css`: yalnız rapor bileşenlerine kapsamlı ekran/mobil ve A4 `psych-report` baskı kuralları.
- `tests/reports.test.ts`, `tests/reportDatabase.test.ts`, `tests/router.test.ts`: veri, şablon, güvenlik, gerçek PostgreSQL RLS/trigger ve rota testleri.

Entegrasyon değişiklikleri: `src/App.tsx`, `src/router.ts`, `src/main.tsx`,
`src/components/{RecordDetailPage,MyRecordsPanel,AdminPanel}.tsx`,
`src/components/results/MMPIResultsPanel.tsx`. AI sekmesi değiştirilmedi ve son sekme olmaya devam ediyor.
Ayrıca migration listesi `scripts/diagnose-supabase.mjs` içinde güncellendi;
`package.json` / lock dosyasına yalnız test amaçlı `@electric-sql/pglite` dev bağımlılığı eklendi.
`optik-form.html` üretim derlemesinin takip edilen çıktısıdır.

## Rotalar ve rapor türleri

- `/kayitlar/:id` korunur; kayıt özetinde rapor sayısı, başlık, durum ve tarih gösterilir.
- `/kayitlar/:id/raporlar`: rapor listesi ve iki ayrı işlem alanı.
- `/kayitlar/:id/raporlar/:reportId`: psikolog raporu editörü.
- `?gorunum=onizleme`: mobilde önizleme sekmesiyle açar; masaüstünde editör ve önizleme yan yanadır.
- Tanımsız ekstra yol parçaları hâlâ 404'tür.

**Tam Rapor:** liste ekranındaki Aç, Önizle ve Yazdır/PDF eylemleri; mevcut
`MMPIPrintReport` aynen kullanılır. Orijinal rapor bileşeni ve puanlama dosyaları değiştirilmez.

**Psikolog Raporu:** düzenlenebilir değerlendirme metinleri ve salt okunur MMPI alanları.
Paragraf/H1/H2, kalın/italik/altı çizili, madde/numaralı liste, satır/sütun eklenebilen tablo,
blok silme/taşıma, geri al/yinele ve `+ MMPI Verisi` vardır. Klavyeyle Ctrl/Cmd+Z ve Shift+Z desteklenir.
Dışarıdan HTML yapıştırılmaz; yalnız düz metin kabul edilir.

## Şablonlar ve gerçek veri

İlk sistem şablonu **Standart MMPI Psikolog Raporu**. Tanımı `standardTemplate()` içinde
sürümlenir; Supabase'deki sabit UUID'li sistem kaydı bunu temsil eder. Kullanıcı kopyalarının
JSON içerikleri `mmpi_report_templates.content` alanında saklanır. Yeni raporda seçilen şablon
bu kaydın verileriyle doldurulur. Örnek Raporlar alanı da gerçek kayıttan önizlemedir; örnek klinik metin uydurulmaz.

Alanlar: danışan adı, yaş/cinsiyet, meslek/eğitim/medeni durum; uygulama tarihi, uygulayan,
yöntem/süre, başvuru/izlem/klinik bağlam; L/F/K/? ham ve T değerleri, mevcut geçerlik durumu ve yorumlar,
F-K ve varsa TR/dikkatsizlik; Hs–Si ham/K+/T ve mevcut bant yorumları; profil kodu ve kaynak yorumları;
varsa kritik maddeler, klinik izlenimler, türetilmiş ölçekler/endeksler; kayıtlı uzman notları.

Doğum tarihi mevcut veri modelinde bulunmadığından katalogda **sunulmaz**. Eksik alanlar
`Veri mevcut değil` olur veya koşullu bölüm gizlenir. Boş Sonuç/Notlar başlıkları editörde
kalır, basılı çıktıda gizlenir. Sayısal veri hesaplanmaz; norm veya klinik yorum eklenmez.

Kullanıcı şablonu kaydederken, henüz elle düzenlenmemiş otomatik metinler tekrar yer tutucuya
dönüştürülür. Elle yazılan metinler aynen kalır: başka danışanlarda kullanmadan önce kişisel
bilgileri çıkarması için kullanıcıya açık uyarı gösterilir. Antet şablona aktarılmaz.

## Saklama, yetki ve sürümleme

- `mmpi_reports`: kayıt/şablon/sahip, başlık, JSON belge, `draft|completed`, `completed_at`,
  `source_data_snapshot`, `source_data_version`, `generated_at`, zamanlar, `revision`, `version_number`.
- `mmpi_report_versions`: içerik ve **tüm rapor/snapshot metadatası**, sürüm, aktör, neden ve tarih.
- `mmpi_report_templates`: sistem veya kullanıcıya ait şablon.
- `psychologist_report_settings`: isteğe bağlı antet JSON'u.

RLS: aktif psikolog yalnız kendi kaydına bağlı kendi raporlarını okur/yazar; aktif Admin tüm
raporları denetler. Oluşturma aktörü `auth.uid()` olmalıdır; rapor sahipliği ve kaynak kayıt
güncellemede değiştirilemez. Sürümler yalnız erişilebilen rapor üzerinden okunur, istemciden
insert/update/delete yapılamaz. Sistem şablonu Admin dahil değiştirilemez. Anonim erişim yoktur.

İlk kayıt V1; elle Kaydet, Tamamla, Verileri Güncelle, Geri Yükle ve önceki sürümden en az
10 dakika sonraki otomatik kayıtta yeni sürüm oluşur. SQL trigger'ı belgeyle aynı transaction
içinde sürümü yazar. Diğer otomatik kayıtlar yalnız belge/revizyonu günceller. En son 100 sürüm
listelenir. Geri yükleme öncesi mevcut hal kaydedilir; geri yükleme de yeni sürümdür.
`revision` eşleşmiyorsa sessiz üzerine yazma yapılmaz, kullanıcı uyarılır.

Taslak/Tamamlandı değiştirilebilir; tamamlanan rapor kilitlenmez. Tamamlanma tarihi sunucudan gelir.
Kopya yeni kimlikle taslak açılır. Silmede onay gerekir; raporun sürümleri de silinir, test kaydı silinmez.
Liste en son 200 raporu gösterir ve sınıra ulaşıldığında bunu belirtir.

## Anlık görüntü ve veri yenileme

Rapor kaydedilmiş anlık görüntüden çizilir; canlı kayıt değişikliği raporu kendiliğinden değiştirmez.
Veri sürümü puanlama motoru sürümü + değişiklik tespit hash'idir (kriptografik doğrulama imzası değildir).
Editör açılışında ve pencere odağı geri geldiğinde kaynak değişikliği kontrol edilir.

**Verileri Güncelle** önce mevcut halin sürümünü kaydeder, kaydı yeniden okur; kilitli alanları
ve henüz düzenlenmemiş otomatik yorumları yeniler. Elle yazılan/düzenlenen paragraflar korunur.
Yeni verilerle uyumlarını uzmanın kontrol etmesi gerektiği onay penceresinde açıklanır.
Kaynak alanı artık yoksa ona bağlı koşullu blok basılmaz. Önceden olmayan bloklar gerekiyorsa
`+ MMPI Verisi` ile eklenebilir veya yeni rapor oluşturulabilir.

## PDF ve antet

Tarayıcının yazdırma motoruyla A4, seçilebilir metin ve gerçek tablolar üretilir.
**PDF / Yazdır** önce kaydeder, sonra yazdırma penceresini açar. PDF dosyası için
“PDF olarak kaydet”, A4, %100 ölçek ve tarayıcı üst/alt bilgileri kapalı seçilir.
Bu, doğrudan dosya indiren ayrı bir PDF servisi değildir.

`@page psych-report`: 17/16/18 mm kenarlar, destekleyen tarayıcılarda sayfa sayacı;
tablo başlıkları devam sayfalarında yinelenir, başlıklar takip eden içerikle tutulur,
satır/dul/yetim kuralları uygulanır. Canlı ekran A4 oranlı sürekli önizlemedir;
kesin sayfa sonlarını tarayıcının baskı önizlemesi hesaplar.

Antet adı, unvan, kurum, iletişim, adres, logo ve imza isteğe bağlıdır. PNG/JPEG/WebP,
dosya başına 600 KB sınırı vardır; dış URL ve SVG kabul edilmez. Rapor oluşturulurken
antetin kopyası belgeye girer. Antet ayarını değiştirmek eski raporları değiştirmez;
editörde ayrıca **Kayıtlı anteti bu rapora uygula** eylemi bulunur.

AI sekmesine dokunulmadı. Editördeki isteğe bağlı **AI yorumunu rapora ekle**, mevcut
AI istemci/önbellek/yetkilendirme yolunu kullanır ve sonucu uzman kontrolü uyarısıyla
düzenlenebilir metin olarak ekler. AI hizmeti yapılandırılmamışsa hata gösterir; yorum uydurmaz.

## Doğrulama

- Başlangıç: 610/610 test başarılı.
- `npm test`: rapor unit testleri ve gerçek PostgreSQL RLS/trigger testleri dahil.
- `npm run typecheck`, `npm run build`, `npm run verify:pdf`.
- Chromium testinde oluşturma, otomatik/elle kayıt, biçimlendirme, kilitli alanlar,
  geri al/yinele, mobil önizleme ve yazdırma kontrol edildi. Bu tarayıcı testinde
  PostgREST yanıtları test verileriyle izole edildi; canlı Supabase testi değildir.
- Üretilen 3 sayfalık örnek PDF, pdfjs ile okunup A4 ölçüleri, seçilebilir Türkçe metin,
  sayfa sayacı, kenarlar ve editör kontrollerinin basılmaması doğrulandı.
- `git diff --exit-code HEAD -- src/scoring src/omr src/auth src/print src/components/results/MMPIPrintReport.tsx`
  ile klinik hesaplama, OMR, Auth ve orijinal basılı raporun değişmediği doğrulanır.

Test amacıyla üretilen tarayıcı ekran görüntüleri ve PDF dosyaları `.audit/` altındadır;
Git'e eklenmez ve gerçek danışan verisi içermez.
