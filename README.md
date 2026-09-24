# Psikolog Platformu

Uzman psikoloğun günü için çalışma alanı: bugünkü seans hazırlığı, danışan dosyası, formülasyon, güvenlik planı, SOAP, ölçüm izlemi ve rapor.

## Günlük akış

1. Ana sayfa bugünkü randevuyu son seans, ev ödevi, ölçek değişimi ve güvenlik uyarısıyla açar.
2. Dosyada 4P formülasyon, tedavi hedefi ve güvenlik planı durur.
3. Seans SOAP notu olarak yazılır.
4. BDI, BAI, SCL-90-R, GAD-7 ve PHQ-9 sonuçları aynı dosyada karşılaştırılır.
5. İlerleme raporu bu kayıtlardan doldurulur. Metin tanı koymaz.

Randevu, görev, not, belge, antet ve JSON yedek aynı alanda. Supabase yoksa uygulama boş yerel çalışma alanı olarak açılır. Örnek danışan yüklenmez.

## Marka

Logo danışanı anımsatır: koyu zemin üzerinde tek renkli baş + omuz figürü. İşaret `src/components/BrandMark.tsx` içinde tek kaynaktan gelir; favicon, iOS simgesi ve rapor antedi aynı geometriden türetilir. Kaynak dosya `public/favicon.svg`'dir.

## Ücret ve ödeme

Randevu formunda seans ücreti ve ödeme durumu girilir. Randevu tablosu/kartları bir **Ödeme** alanı gösterir.

Ödeme durumu varsayılan olarak “henüz ödenmedi” açılır; bu, **henüz yapılmamış** bir görüşme için uyarı üretmez. Ücret takibi yalnızca görüşme **tamamlandığında** veya danışan **gelmediğinde** (gelmeyen seans da ücrete tabidir) ve ödeme hâlâ beklemedeyse doğar: gün tahtasındaki kartta “Ödeme bekliyor” rozeti, ana sayfadaki “takip gerekiyor” panelinde tek satır.

Arayüz değerlendirmesi, tasarım kararları ve dar ekran kontrol listesi: [Tasarım değerlendirmesi](docs/TASARIM.md).

## Çalıştırma

Node 22+.

```sh
npm install
npm run dev
```

```sh
npm run typecheck
npm test
npm run build
```

Tarayıcı uçtan uca testleri için ilk kurulumda `npx playwright install` çalıştırın; ardından `npm run test:e2e` dört tarayıcı projesini test eder (yalnızca Chromium için `npm run test:e2e -- --project=chromium`).

Bulut kurulumu: `.env.example` dosyasını `.env` yapın. Yalnızca publishable/anon anahtarı yazın.

## Üretim

Kayıtlar tarayıcıda kalır ve şifrelenmez. Sayfa üçüncü taraf yazı tipi sunucusuna istek atmaz. Üretim başlıkları `public/_headers` içindedir: çerçeveleme kapalı, betik yalnızca kendi kaynaktan, bağlantı kendi kaynak ve Supabase. Supabase yoksa giriş duvarı yoktur; cihazı paylaşmayın. Bulut hesabı yalnızca `.env` ile açılır, service role anahtarı tarayıcıya konmaz.

## Sınır

Ölçek bantları taramadır. BDI ve PHQ-9 madde 9, SCL-90-R madde 15 bir güvenlik uyarısıdır; risk görüşmesinin yerine geçmez. Klinik karar uygulayıcıya aittir.
