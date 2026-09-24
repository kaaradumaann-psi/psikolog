# Psikolog — Uzman Klinik Psikoloji ve Değerlendirme Sistemi

Uzman ve klinik psikologların günlük klinik pratiklerinde danışan takibi, seans notları, psikometrik test değerlendirmeleri (MMPI-566, Beck Depresyon, Beck Anksiyete, SCL-90-R), randevu planlaması ve resmi klinik rapor üretimi için tasarlanmış kapsamlı, güvenli ve çevrimdışı öncelikli (Offline-First) klinik çalışma alanı.

Tasarım dili, tipografi ve estetik standartları [halilkaraduman.com.tr](https://www.halilkaraduman.com.tr) ekosistemiyle birebir uyumludur: Kâğıt-beyaz yüzeyler, hairline kenarlıklar, Newsreader display serif ve DM Sans arayüz tipografisi, Apple-blue vurgusu ve whisper-quiet minimalizm.

---

## 🌟 Temel Modüller ve Yetenekler

### 1. 📊 Klinik Dashboard (Merkezi Kontrol Paneli)
- **Klinik Metrikler:** Aktif danışan sayısı, bugünkü randevular, tamamlanan seanslar ve bekleyen testler.
- **Kritik Güvenlik Alarmları:** MMPI kritik maddeleri, Beck Depresyon Madde 9 intihar düşüncesi uyarısı ve SCL-90-R klinik eşik aşımı bildirimleri.
- **Hızlı Başlatma Çubuğu:** Tek tıkla yeni danışan kaydı, SOAP seans notu, MMPI OMR okuma, Beck veya SCL-90 testi başlatma.
- **Zaman Çizelgesi:** Günün randevu akışı ve son tamamlanan seans geçmişi.

### 2. 🗂️ Danışan & Vaka Yönetimi (Klinik CRM & Dosya)
- **Danışan Kartları:** Ad, Soyad, TC/Protokol No, Yaş, Cinsiyet, İletişim, Meslek, Eğitim, Medeni Durum, Acil Durum İletişimi.
- **Klinik Anamnez:** Başvuru şikayetleri, tıbbi ve psikiyatrik özgeçmiş, kullanılan ilaçlar, alerjiler ve DSM-5 / ICD-10 ön tanıları.
- **Kapsamlı Dosya Görünümü:** Danışana ait tüm seans notları, uygulanan test sonuçları ve üretilen raporların tek merkezde kronolojik olarak görüntülenmesi.
- **Durum Yönetimi:** Aktif Terapi, Takip / İzlem, Tamamlandı ve Arşiv statüleri.

### 3. 📝 SOAP Seans Notları Sistemi
- **Standart Klinik Format:**
  - **S (Subjektif):** Danışanın aktardığı duygu, düşünce ve haftalık yaşantılar.
  - **O (Objektif):** Psikoloğun seans içi gözlemleri, duygulanım, bilişsel tempo, beden dili ve test bulguları.
  - **A (Analiz / Değerlendirme):** BDT / Dinamik klinik formülasyon, bilişsel şemalar, savunma mekanizmaları ve risk analizi.
  - **P (Plan):** Gelecek seans hedefleri, CBT ev ödevleri, müdahaleler ve sevk/konsültasyon kararları.
- **Seans Türleri:** Bireysel Terapi, Çift/Aile Terapisi, İlk Görüşme/Anamnez, MMPI/Değerlendirme, Kriz Müdahalesi, Online Terapi, Takip Seansı.
- **Klinik Risk Barometresi:** Güvenli / Düşük / Orta / Yüksek Risk (Güvenlik protokolü entegrasyonu).

### 4. 🧠 Psikometrik Test Bataryası & Değerlendirme Motoru
- **MMPI-566 (Minnesota Çok Yönlü Kişilik Envanteri):**
  - 4 Sayfalık A4 OMR Optik Okuma (Kamera, dosya yükleme, perspektif düzeltme).
  - Hızlı 566 madde klavye girişi ve doğrudan Ham Puan girişi.
  - Savaşır (1981) Türk Standardizasyon Normları ve K-düzeltmeli T-skorları.
  - 4 Geçerlik + 10 Klinik Ölçek profili ve etkileşimli grafik.
  - 2-Noktalı Kod Analizleri (45 kanonik kod, 151 blok kodu), Harris-Lingoes, Wiggins İçerik, PDI-IV Kişilik Bozuklukları, MAC-R/AAS Bağımlılık ve 38 Kritik Patolojik Madde Taraması.
  - Yapay Zekâ / Otomatik Klinik Yorum Taslağı.
- **Beck Depresyon Envanteri (BDI):**
  - 21 Madde interaktif değerlendirme.
  - Bilişsel-Duygusal ve Somatik-Performans alt boyutları.
  - Madde 9 İntihar Güvenlik Alarmı.
  - Kesme noktaları: Minimal (0-9), Hafif (10-16), Orta (17-29), Şiddetli (30-63).
- **Beck Anksiyete Envanteri (BAI):**
  - 21 Somatik ve bilişsel kaygı belirtisi.
  - Subjektif kaygı, nörovejetatif, otonomik ve motor alt bileşenler.
  - Kesme noktaları: Minimal (0-7), Hafif (8-15), Orta (16-25), Şiddetli (26-63).
- **SCL-90-R (Belirti Tarama Listesi):**
  - 90 Madde psikopatoloji taraması.
  - 9 Boyut (Somatizasyon, O-C, Duyarlık, Depresyon, Anksiyete, Öfke, Fobi, Paranoya, Psikotizm).
  - 3 Global İndeks (GSI, PST, PSDI) ve etkileşimli çubuk profili.

### 5. 📅 Randevu & Seans Takvimi
- Günlük, haftalık, aylık ve liste takvim görünümleri.
- Randevu oluşturma, danışan seçimi, seans süresi, ücreti ve ödeme takibi.
- Randevu durumları: Planlandı, Tamamlandı, İptal Edildi, Danışan Gelmedi (No-show).
- **“Seansı Başlat”** butonu ile tek tıkla randevudan otomatik SOAP seans notu açma.

### 6. 📄 Resmi Klinik Raporlama Sistemi (A4 Print Engine)
- **Şablonlar:**
  1. Kapsamlı Psikolojik Değerlendirme Raporu (Resmi kurum/mahkeme/danışan formatı).
  2. MMPI-566 Uzman Klinik Değerlendirme Raporu.
  3. Beck Envanterleri Duygu-Durum & Anksiyete Raporu.
  4. SCL-90-R Semptom Profili Raporu.
  5. Psikoterapi Süreç & İlerleme Raporu.
  6. Psikiyatrik Konsültasyon & Sevk (Epikriz) Raporu.
- Kurumsal antet, otomatik danışan/test verisi çekme, düzenlenebilir metin blokları, Uzm. Psk. Halil Karaduman kaşe/imza alanı ve yüksek çözünürlüklü A4 PDF baskı düzeni.

### 7. 🔒 KVKK Uyumlu Güvenlik & Offline-First Depolama
- Danışan verileri ve test sonuçları tarayıcının yerel güvenli depolama katmanında (LocalStorage) tutulur.
- **Tam JSON Yedekleme:** Tek tıkla tüm klinik veritabanını indirme ve geri yükleme.
- **Örnek Demo Verisi:** Tek tıkla sistemi zengin klinik vaka profilleriyle test edebilme.
- **Opsiyonel Supabase Entegrasyonu:** Supabase yapılandırıldığında Auth ve RLS ile bulut senkronizasyonu devreye girer.

---

## 🚀 Hızlı Başlangıç

Node.js 22 veya üzeri gereklidir.

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın (http://localhost:5173)
npm run dev

# Tip kontrolü ve testleri çalıştırın
npm run typecheck
npm test

# Üretim (Production) derlemesi
npm run build
```

---

## 🎨 Tasarım Standartları

- **Font Ailesi:** `Newsreader` (Display Serif) & `DM Sans` (UI Sans-serif).
- **Renk Paleti:**
  - Kâğıt Beyaz: `#ffffff` & `#f6f6f6`
  - Slate Metin: `#0d0d0d` & `#6e6e73`
  - Vurgu: `#0a84ff` (Apple Blue)
  - Durum Renkleri: Başarı `#0e9e6a`, Uyarı `#b4770b`, Tehlike/Risk `#d2453a`.
- **Baskı Uyumluluğu:** `@media print` kuralları ile tüm resmi raporlar ve optik formlar kusursuz A4 kâğıt çıktısı verir.

---

## ⚖️ Yasal Uyarı ve Telif

Bu yazılım klinik karar destek amacıyla ruh sağlığı profesyonelleri için geliştirilmiştir. Tanı ve tedavi süreçlerindeki nihai sorumluluk uygulayıcı uzmana aittir.

© 2026 **Halil Karaduman** · Psikolog & Geliştirici · [www.halilkaraduman.com.tr](https://www.halilkaraduman.com.tr) · contact@halilkaraduman.com.tr
