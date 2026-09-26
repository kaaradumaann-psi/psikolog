# Admin girişi ve kurum ataması — olay denetimi (2026-09-26)

Bu bölüm kod değiştirilmeden önceki repository bulgularını kaydeder. `admin@gmail.com` hesabının **canlı `auth.users`/`profiles` satırları bu ortamdan okunamadı**; e-posta adresi tek başına ADMIN rolünü veya doğru Supabase projesini kanıtlamaz. Gerçek hasta verisi silinmeyecek, RLS gevşetilmeyecek. Canlı/paket/Chromium sonuçları yerel testlerden ayrı tutulacak.

| Alan | Kod kanıtı / mevcut durum | Sorun | Etki | En küçük düzeltme |
| --- | --- | --- | --- | --- |
| Kurumun anlamı | `organizations.id` tenant UUID; `profiles.organization_id` nullable FK; klinik satırlar kurum ID taşır; `repository.loadSnapshot` yalnız o org'u okur. | İlk Auth hesabı trigger/backfill ile `PSYCHOLOG`, `organization_id=NULL` başlar; başlangıçta hiçbir otomatik kurum oluşmaz. | Kişi giriş yapabilir, ama klinik dosya açılmaz. | Rol/org kurulumu için kontrollü admin akışı + doğru projede read-only tanılama; e-postadan otomatik yetki verme YOK. |
| Platform ADMIN + null org | `activateCloud` her rol için org zorunlu kılar (`sync.ts:471`), `WorkspaceShell` Settings'e klinik hidrasyon kapısı arkasından gider. | `ADMIN` profili DB'de kurum olmadan geçerli/yetkili olsa da kendi yönetim paneline erişemiyor. | İlk yönetici kurumu/uzmanı açamıyor; döngüsel bootstrap. | Kimliği DB'den `ADMIN` doğrulanmış kullanıcıya **yalnız yönetim kurulumu**, klinik snapshot olmadan; kurumu seçip atadıktan sonra klinik workspace. |
| ADMIN rolü gerçekten atanmış mı? | `handle_new_auth_user` varsayılan PSYCHOLOG/null, README ilk admin için manuel SQL diyor; profil yoksa `profileForUser` yalnız düşük yetkili self-heal yapar. | `admin@gmail.com` e-posta olarak admin görünse de rol PSYCHOLOG olabilir. | UI veya Edge Function kendi kendine ADMIN yetkisi veremez; ‘kurum yok’ çözülmeden kalır. | SQL Editor'da auth ID / profil / rol / org / aktif durumunu yalnız okuyarak doğrula; yetkili operatörle ilk ADMIN bootstrap. Canlı rolü kodla yükseltme YOK. |
| Psikolog hesabı oluşturma | `CloudAdminPanel` hiç kurum seçtirmez; `adminCreateUser` `organizationId:null` gönderir; Edge ADMIN için bunu kabul eder. | Yeni hesap kurumsuz oluşur; `admin-users` yanıtı `{profile: ...}` iken frontend düz `AdminProfile` sanır. | Oluşturuldu görünen kullanıcı girişte kurumsuz; listede boş/hatalı nesne. | Kurumu zorunlu seçtir; Edge'de kurum varlığını ve org zorunluluğunu doğrula; yanıt zarfını doğru açıp kontrol et; UI şifre sınırını backend'le eşleştir. |
| Kurum oluşturma/atama | ADMIN için `admin_list_organizations`, `admin_create_organization`, `admin_update_profile` RPC var ama UI'de kullanılmıyor; Edge `set_org` ADMIN hedefi reddeder. | İlk kurumu ve kurumsuz mevcut kişileri yönetme ekrandan mümkün değil. | Yetkili kullanıcı SQL'e mahkûm; hatalı atama veya LIVE-TEST seed'ini gerçek admin'e uygulama riski. | Var olan ADMIN RPC'leriyle kurum yarat/kurumsuz kullanıcıya tek seferlik ata; kuruma sahip admin için ayrı açık klinik kapsam seçimi. |
| ORG_ADMIN akışı | `canAdmin` true; panel `admin_list_profiles` RPC'sini çağırıyor, ancak fonksiyon yalnız `is_admin()` istiyor; Edge ORG_ADMIN'in kendi kurumunda PSYCHOLOG yaratmasına izin veriyor. | Kurum yöneticisinin liste ekranı hata verir ve hata metni ham SQL olabilir. | Var olan yetkili işlev erişilemez. | ORG_ADMIN yalnız RLS kontrollü kendi org profillerini/kurumunu okusun; ADMIN global RPC'ler aynı kalsın. |
| Genel hata kartı | `ClinicErrorBoundary` her render hatasına “Kayıtlar bu cihazda duruyor ... Ayarlar'dan yedek” yazıyor. | Bulutta kaynak sunucu, cihazda sadece cache/outbox; ayrıca bu kart org hatası değil bağımsız React hatası olabilir. | Klinik verinin yerini yanlış anlatarak tarayıcı verisinin silinmesine veya gereksiz yenilemeye yönlendirir. | Bulut/yerel mesajını ayır, bekleyen kuyruğu silmeme uyarısı ver; render hatasının güvenli teşhisine izin ver. Kök nedeni canlı console olmadan org hatasıyla özdeşleştirme. |
| Profil erişimi | `20260924000006_fix_profiles_rls.sql` `profiles_select` içinde `is_org_member(organization_id)` koşuluyla org'daki tüm üyelerin profilini görmesine izin verir. | Sıradan psikolog, meslektaşının e-posta/profil alanlarını okuyabilir (kanıtı PGlite negatif testle ölçülecek). | Klinik satırlar korunsa da hesap metadata gizliliği zedelenebilir. | Own+ADMIN+ORG_ADMIN-own-org SELECT olarak **daralt**, canlı policy'yi doğrula. |
| Uygulanan sürüm / canlı veri | Bu sandbox'ta `.env` yok, Supabase client canlıya bağlanamıyor. | `admin@gmail.com` satırı, Edge deploy sürümü, ALLOWED_ORIGINS, preview bundle'ı görünmüyor. | LOCAL PASS üretimde çözüm kanıtı değildir. | Salt-okunur SQL sonucu (sır/parola olmadan) + yetkili cihazda production preview + gerçek Auth/Edge/RLS doğrulaması. |

## Araştırma sınırı

İki belirti ayrı değerlendirilir: **“Hesabınıza kurum atanmamış”** `activateCloud()` kontrolünden gelir; **“Çalışma alanı açılamadı”** `ClinicErrorBoundary` ile yakalanan bir render istisnasıdır. İkincisinin canlıdaki stack'i ölçülmeden birincisinin doğrudan sonucu olduğu iddia edilemez. Admin e-postası görünmesi `profiles.role='ADMIN'` ispatı değildir.

---

## Kurum tam olarak nedir?

Bu uygulamadaki **kurum**, gerçek hayattaki klinik/ekip için veritabanında `public.organizations(id UUID, name)` satırıdır. Dosyanın/raporun/seansın/belgenin `organization_id` değeri bu satırın **ID'sine** bağlanır. `public.profiles(id = auth.users.id, role, active, organization_id)` hesabın rolünü ve tek bir kuruma üyeliğini belirtir. E-posta alanındaki “admin” ifadesi bir yetki/kurum ilişkisi değildir; Supabase Auth girişi (`auth.users`) ile veritabanı profili (`profiles`) ayrı adımlardır. Klinik snapshot aynı anda yalnız seçili **bir** kurumun verisini yükler. `ADMIN` rolü DB/RLS'de global yetki alabilir ama UI klinik ekranı bir kurum seçilmeden açmamalıdır. `ORG_ADMIN` yalnız kendi kurumunda personel yönetebilir; `PSYCHOLOG` kendi dosyalarına erişir. Uygulama **otomatik olarak** kurum kurmaz veya varsayılan kullanıcıyı bir kuruma bağlamaz; yetkili ADMIN kurumu açıkça oluşturabilir.

| Gerçek profil | Yönetim | Klinik alan | Atama usulü |
| --- | --- | --- | --- |
| `ADMIN`, `organization_id=NULL`, aktif | **Yeni sürümde evet**, yalnız güvenli kurulum ekranı | **Hayır**; klinik snapshot açılmaz | Var olan/yeni kurumu **açıkça seçip** kendi profiline admin RPC ile bağla. |
| `ADMIN`, org atanmış, aktif | Bütün kurumları yönetebilir | UI yalnız profilindeki kurumun klinik snapshot'ını yükler; DB global admin rolü ayrıca yetkili | Farklı klinik kurumuna geçiş ayrı doğrulama/operasyon gerektirir; otomatik org değiştirme yok. |
| `ORG_ADMIN`, org atanmış, aktif | Kendi kurumundaki profilleri okur/psikolog açar | Kendi kurumunun klinik kapsamı | İlk ADMIN tarafından kuruma bağlı oluşturulur veya mevcut kurumsuz profile id-kontrollü atama yapılır. |
| `PSYCHOLOG`, org atanmış, aktif | Yönetim yok | Kendi yetkili danışan dosyaları | Kuruma bağlı oluşturulur; başka meslektaşın dosyası yalnız aynı kurum diye açılmaz. |
| `ORG_ADMIN` / `PSYCHOLOG`, org **yok** | **Hayır** | **Hayır**; anlamlı hata | Yetkili ADMIN'in doğru kurumu seçip ataması gerekir; kullanıcı kendine kurum/ADMIN rolü veremez. |
| Profil yok / `active=false` | Hayır | Hayır | Auth kullanıcı ID'si ve migration/trigger durumu incelenmeli; otomatik admin yükseltmesi YOK. |

## `admin@gmail.com` için güvenli, salt-okunur teşhis

Bu ortamda canlı Supabase bağlantısı, o hesabın parolası veya profilinin mevcut hali **yok**. E-posta adresi kullanıcının bildirdiği girdidir; aşağıdaki sorgu Supabase Dashboard → SQL Editor'da **doğru projede yetkili bir operatör** tarafından yürütülür. Parola, JWT, service-role anahtarı, klinik satır veya tüm kullanıcı listesi paylaşılmamalıdır. Uygun görülürse yalnız `rol / aktif / org var mı / kurum adı` gibi **kimlikten arındırılmış** sonucuyla teşhisi güncelleyin.

```sql
-- Salt-okunur: herhangi bir kayıt oluşturmaz, değiştirmez veya silmez.
select u.id as auth_user_id,
       u.email as auth_email,
       p.id is not null as profile_exists,
       p.role, p.active,
       p.organization_id,
       o.name as organization_name
from auth.users u
left join public.profiles p on p.id = u.id
left join public.organizations o on o.id = p.organization_id
where lower(u.email) = lower('admin@gmail.com');

select id, name from public.organizations order by name;
```

- `auth.users` satırı **yoksa**: yanlış Supabase projesi, farklı e-posta veya hesap henüz yok; DB'ye kör SQL/seed uygulamayın.
- Auth satırı var, `profile_exists=false` ise: `handle_new_auth_user` trigger/migration/backfill ve sunucu şema durumu incelenecek; rol/org tahmini yapılmaz.
- `role='PSYCHOLOG'` ise e-postadaki *admin* sözcüğüne rağmen hesap sistem yöneticisi değildir. İlk admin yetkisini aşağıdaki kontrollü bootstrap dışında tarayıcıdan vermeyin.
- `role='ADMIN'`, `organization_id=NULL` ise **kesin kod kusuru** önceki `activateCloud` kontrolünün yönetim ekranını da bloke etmesidir; yeni sürüm bu profili **sadece yönetim kurulumu** ekranına alır. Klinik alana erişim için bilinçli kurum seçimi gerekir.
- `role='ADMIN'` ve kurum doluysa fakat yine **“Çalışma alanı açılamadı”** görünüyorsa bu başka bir React render hatasıdır; yeni error boundary konsolda yalnız hata tipi/bileşen zincirini yazar. Kurum atamasıyla çözüldüğünü varsaymayın.
- `active=false` ise oturum/Edge fonksiyonunda yönetim kapalıdır; yalnız yetkili yönetici kontrol etmelidir.

**İlk sistem yöneticisinin tek seferlik bootstrap'ı** (yalnız hesap/proje sahipliği ve doğru `auth_user_id` doğrulandıktan sonra; örnekteki e-postayı yetkili hesapla değiştirin):

```sql
-- SQL Editor / yetkili DB operatörü. Sadece var olan, tek Auth kimliğinin profilini günceller.
do $$
declare admin_id uuid;
begin
  select id into strict admin_id
  from auth.users
  where lower(email) = lower('first-admin@example.com');

  if not exists (select 1 from public.profiles where id = admin_id) then
    raise exception 'Bu Auth ID için profil yok: önce migration/trigger durumunu inceleyin.';
  end if;

  update public.profiles set role = 'ADMIN', active = true where id = admin_id;
  if not found then raise exception 'Admin profil güncellemesi doğrulanamadı.'; end if;
end $$;
```

Bu SQL, girilen e-posta/proje yanlışsa uygulanmaz; `organization_id` değerini otomatik değiştirmez. İlk ADMIN zaten atanmışsa tekrar rol yükseltmesi gereksizdir. Kalıcı kurumu varsa **rastgele yeni org atamak doğru değildir**: mevcut danışan kayıtları, kullanıcı/kapsam ve yedek politikası incelenmeden kurum taşıma yapılmaz. Özellikle `scripts/live-validation/seed-live-test-orgs.sql` **sadece ayrılmış LIVE-TEST hesapları/kurumları için** tasarlanmıştır; gerçek `admin@gmail.com` hesabı veya üretim klinik verisi için kullanılmamalıdır.

## Kurum ve psikolog oluşturma: güncellenen uygulama akışı

1. Yetkili ADMIN hesabıyla giriş → org olmasa bile **Sistem yöneticisi kurulumu** açılır, klinik ekran kapalı kalır.
2. **Kurumlar** listelenir. Gerekli/gerçek kurum zaten varsa onu seçin; yoksa mevcut ADMIN RPC `admin_create_organization` ile yalnız **bir kez** kurum oluşturun. Kurum oluşturmak, kişiyi kendiliğinden o kuruma bağlamaz.
3. Seçili kurumu kendi klinik alanına atamak istiyorsa ADMIN, mevcut yetkili `admin_update_profile` RPC'siyle yalnız kendi `ADMIN/active=true` profilinin kurum ID'sini günceller; sunucu yanıtı org/rol/aktiflik için doğrulanır. Sadece yönetim için buna gerek yoktur.
4. **Yeni hesap** formunda kurum zorunludur. ADMIN `PSYCHOLOG` veya `ORG_ADMIN` seçebilir. ORG_ADMIN yalnız kendi mevcut kurumuna `PSYCHOLOG` ekleyebilir. UI minimum **10 karakter** parola ister. `admin-users` Edge Function canlı org ID'sini doğrular, Auth kullanıcısı oluşturur, `handle_new_auth_user` tarafından açılan düşük yetkili profili seçilen rol+org'a günceller, geri okuyup `{ profile: … }` gönderir; frontend bu zarfı doğrular. Başarısızsa “oluşturuldu” gösterilmez; kullanıcı tekrar yaratmadan önce listeden kontrol eder.
5. **Kurumsuz mevcut psikolog** listesi yalnız `organization_id=NULL` olan, ADMIN olmayan profilleri içerir. Yetkili ADMIN doğru kurumu seçerek tek hesabı atar; başka bir kuruma **önceden atanmış** hesabı ekran taşımaya izin vermez. Böyle bir taşıma varsa klinik dosyalarının sahipliği/retention için ayrıca bakım kararı gerekir.
6. Edge Function güncel sürümü ve `ALLOWED_ORIGINS` (çalıştırılan uygulamanın gerçek origin'i) dağıtılmış olmalıdır. Repo dosyasının güncellenmesi **canlı fonksiyonun** güncellendiği anlamına gelmez.

**Mevcut ama ekrana konmayan yıkıcı işlemler:** `admin-users` fonksiyonunda `set_active`, `set_org` ve `delete` yolları vardır. `set_org` ADMIN hedefi reddeder; bu nedenle ilk ADMIN kendi kurumu için ADMIN RPC kullanır. `delete` Auth kullanıcısını siler ve FK cascade klinik kayıtları etkileyebilir; bu olayın çözümü için **asla hesap/kurum silmeyin**. Yönetici profili/kurumu üretimden topluca silinmez; RLS gevşetilmez ve service-role anahtarı browser'a konmaz.

## Doğrulama ve kalan engeller

Yerel sözleşme/PGlite testleri: kurumsuz ADMIN'in mevcut RPC'lerle org açıp kendine ataması, sıradan psikoloğun meslektaş profilini **okuyamaması**, ORG_ADMIN'in yalnız kendi org profilini görmesi, Edge Function'ın orgsuz/geçersiz org hesap yaratmaması ve `{profile}` yanıtının açılması. `20260926100000_scope_profile_read.sql` SELECT policy'sini daraltır. Bu sonuçlar **gerçek Supabase veya production browser PASS değildir**.

Canlıda ayrıca şunlar ölçülmeli: doğru `auth_user_id`/profil durumu, migration ve policy deploy'u, admin-users Edge Function sürümü/origin, ADMIN null-org ekranı, kendi org ataması sonrası sayfa yenilemede veri kapsamı, ORG_ADMIN ve PSYCHOLOG girişleri, A/B/admin/anon/expired-session RLS retleri, yeni psikolog hesabının server profilinde gerçek org ID'si ve iki kullanıcıyla kapalı dosya erişimi. Önceki production preview problemi yalnız `npm run dev` PASS ile kapanmış sayılmaz.

**Genel hata kartı:** `ClinicErrorBoundary` sadece render hatası yakalar, org doğrulamasındaki Promise hatası `bootstrap`/`cloudGateStatus` tarafından ayrıca gösterilir. Canlıda bu kart sürerse, hasta verisi/anahtar/token paylaşmadan tarayıcı konsolundaki *hata tipi + bileşen zinciri* ve gerçek build/origin teşhisi gerekir; tarayıcı depolamasını temizlemeyin. Kaydedilmemiş formlar/cihaza yazılmış outbox, Supabase yedeği değildir.
