/**
 * PHASE 7 / P0-8 — REAL BROWSER: canlı Supabase üzerinde çok kullanıcılı oturum testi.
 *
 * Ne ölçer (istenen matris):
 *   1) A girişi → arayüzden danışan oluşturulur (uygulama kaydı sonrası DETAY sayfasına gider)
 *   2) Kayıt GERÇEKTEN sunucuya yazıldı mı? (POST /rest/v1/clients → 2xx; ağ kanıtı)
 *   3) Tarayıcı yerel verisi (localStorage) temizlenip sayfa yenilendiğinde kayıt YİNE görünür
 *      — verinin localStorage'dan değil Supabase'den geldiğinin tarayıcı kanıtı
 *   4) A çıkışı → B girişi → A'nın kaydı GÖRÜNMEZ
 *   5) B çıkışı → A girişi → kayıt geri gelir
 *   6) Test kaydı arayüzden silinir; önceki başarısız koşulardan kalan `E2E-` artıkları da temizlenir
 *
 * Çalıştırma (gerçek Chromium gerekir):
 *   npx playwright install chromium
 *   VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… \
 *   LIVE_PSY_A_EMAIL=… LIVE_PSY_A_PASSWORD=… \
 *   LIVE_PSY_B_EMAIL=… LIVE_PSY_B_PASSWORD=… \
 *   npx playwright test e2e/live-multi-user.spec.ts --project=chromium
 *
 * Kimlik bilgileri verilmezse test **SKIP** olur (asla PASS sayılmaz).
 * Sonuç etiketi: REAL BROWSER — LOCAL/PGlite ve LIVE SUPABASE koşucularından AYRIDIR.
 *
 * ---------------------------------------------------------------------------
 * KOŞU GEÇMİŞİ (spec tarafındaki düzeltmeler — uygulama DAVRANIŞI değiştirilmedi)
 * ---------------------------------------------------------------------------
 * koşu #1 FAILED — kayıt sonrası liste satırı bekleniyordu; `ClientListPage.handleSave` yeni
 *          danışanda `navigate('/danisanlar/<id>')` yapar → spec önce DETAY sayfasını doğrular.
 * koşu #2 FAILED — kayıt detay sayfasında görünüyor, 33 sn sonra listede YOK (`element(s) not
 *          found`). Kök neden uygulama tarafında ve yerelde birebir yeniden üretildi: bulut
 *          aktivasyonu tamamlanmadan yapılan yazım `queueWrite` içinde sessizce düşürülüyordu
 *          (sunucuya gitmiyor, kuyruğa da girmiyor) ve hidrasyon yerel önbelleği sunucu anlık
 *          görüntüsüyle değiştirince kayıt arayüzden siliniyordu → veri kaybı.
 *          Uygulama düzeltmesi: (a) sunucu anlık görüntüsü yüklenene kadar klinik içerik render
 *          edilmez (`[data-cloud-gate="loading"]`), (b) aktivasyon öncesi yazımlar kuyruğa alınır
 *          ve aktivasyonda kapsamlı kuyruğa taşınıp gönderilir.
 * koşu #4 PASSED (13,5 sn) — tam matris uçtan uca: kayıt → detay → liste → localStorage temizliği +
 *          yenileme (kayıt sunucudan geri geldi) → B göremedi → A yeniden gördü → arayüzden silme.
 *          Ağ özeti: POST /rest/v1/clients → 201 (kayıt sunucuya yazıldı), başarısız istek yok.
 *          Koşuda ölçüm kusuru görüldü: artık temizliğinden uçuşta kalan DELETE'ler "ilk 2xx yazım"
 *          sanıldı. Bu yüzden kanıt artık **yalnız POST** ile ve yanıt gövdesinde dosya numarası
 *          aranarak ölçülür; kaydetmeden önce bekleyen isteklerin bitmesi beklenir.
 * koşu #3 FAILED — kayıt bu kez listede GÖRÜNDÜ, ama satır 3 düğme ile eşleştiği için Playwright
 *          "strict mode violation" verdi (ad düğmesi + "… bilgilerini düzenle" + "… kaydını sil").
 *          Spec düzeltmesi: satır artık benzersiz protokol numarasıyla (`ownRow`), ad doğrulaması
 *          `nameButton` (`exact: true`) ile yapılır. Bu koşu aynı zamanda kaydın düşmesinin
 *          deterministik değil **yarış (race)** olduğunu gösterdi: #2'de kaybolan kayıt #3'te
 *          (aynı spec, aynı hız) yerindeydi. Sunucu kalıcılığı #2'de de #3'te de kanıtlanmadı;
 *          bu yüzden spec artık 2xx yazım yanıtını ZORUNLU kanıt olarak arar.
 */

import { test, expect, type Page, type Request } from '@playwright/test';

const LIVE = {
  url: process.env.VITE_SUPABASE_URL ?? '',
  anonKey: process.env.VITE_SUPABASE_ANON_KEY ?? '',
  aEmail: process.env.LIVE_PSY_A_EMAIL ?? '',
  aPassword: process.env.LIVE_PSY_A_PASSWORD ?? '',
  bEmail: process.env.LIVE_PSY_B_EMAIL ?? '',
  bPassword: process.env.LIVE_PSY_B_PASSWORD ?? '',
};

const liveReady = Object.values(LIVE).every((value) => value.trim() !== '');
const stamp = Date.now().toString(36);
const FILE_PREFIX = 'E2E-';
const FILE_NUMBER = `${FILE_PREFIX}${stamp.toUpperCase()}`;
const FULL_NAME = `E2E Tarayici ${stamp}`;

test.describe.configure({ mode: 'serial' });

/** Sahnede açılan tarayıcı diyaloglarını yakalar; alert metinleri testi bilgilendirir. */
function watchDialogs(page: Page) {
  const alerts: string[] = [];
  page.on('dialog', async (dialog) => {
    if (dialog.type() === 'alert') alerts.push(dialog.message());
    await dialog.accept();
  });
  return alerts;
}

type RestCall = { method: string; url: string; status: number; ok: boolean; body: string };

/**
 * REST/konsol kanıtı: kaydın sunucuya gidip gitmediğini ve düşen isteğin nedenini gösterir.
 * Yalnız `/rest/v1/clients` çağrıları izlenir (GET = hidrasyon okuması, POST/PATCH/DELETE = yazım).
 */
function watchBackend(page: Page) {
  const calls: RestCall[] = [];
  const inFlight = new Map<Request, RestCall>();
  const pending = new Set<Request>();
  const failed: string[] = [];
  const consoleErrors: string[] = [];

  const settle = (request: Request) => {
    pending.delete(request);
  };

  page.on('request', (request) => {
    const url = request.url();
    if (!url.includes('/rest/v1/')) return;
    pending.add(request);
    if (!url.includes('/rest/v1/clients')) return;
    inFlight.set(request, { method: request.method(), url, status: 0, ok: false, body: '' });
  });
  page.on('response', (response) => {
    settle(response.request());
    const call = inFlight.get(response.request());
    if (!call) return;
    call.status = response.status();
    call.ok = response.ok();
    inFlight.delete(response.request());
    calls.push(call);
    void response
      .text()
      .then((text) => {
        call.body = text.replace(/\s+/g, ' ').slice(0, 300);
      })
      .catch(() => {
        call.body = '(gövde okunamadı)';
      });
  });
  page.on('requestfailed', (request) => {
    settle(request);
    if (!request.url().includes('/rest/v1/')) return;
    failed.push(`${request.method()} ${request.url()} → ${request.failure()?.errorText ?? 'bilinmeyen hata'}`);
  });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`console: ${message.text().slice(0, 300)}`);
  });

  const writes = () => calls.filter((call) => call.method !== 'GET');
  /** Yalnız yeni kayıt yazımı — temizlik DELETE'leri veya güncellemeler kanıt yerine geçmez. */
  const posts = () => calls.filter((call) => call.method === 'POST');
  return {
    calls,
    writes,
    posts,
    failed,
    consoleErrors,
    pendingCount: () => pending.size,
    hydrations: () => calls.filter((call) => call.method === 'GET').length,
    summary: () =>
      `REST(clients): ${calls.map((call) => `${call.method}→${call.status}`).join(', ') || 'istek yok'}` +
      ` | hidrasyon okuması: ${calls.filter((call) => call.method === 'GET').length}` +
      ` | POST→${calls.filter((call) => call.method === 'POST').map((call) => call.status).join(',') || 'yok'}` +
      ` | bekleyen istek: ${pending.size}` +
      ` | başarısız istek: ${failed.join(' | ') || '—'}`,
  };
}

/**
 * Bekleyen `/rest/v1` istekleri bitene kadar bekler.
 * Koşu #4 dersi: artık temizliğinden kalan DELETE'ler uçuşta kalırsa, kaydetme
 * sonrası "ilk 2xx yazım" yanlışlıkla bir DELETE olabilir; kanıt ölçümü kayar.
 */
async function awaitBackendIdle(backend: { pendingCount: () => number }) {
  await expect
    .poll(() => backend.pendingCount(), {
      timeout: 20_000,
      message: 'bekleyen /rest/v1 istekleri bitmedi (ağ kanıtı ölçülemez)',
    })
    .toBe(0);
}

/** Uygulamanın kendi "bulut hazır" kapısı: sunucu anlık görüntüsü gelene kadar içerik render edilmez. */
async function waitForCloudReady(page: Page) {
  await expect(
    page.locator('[data-cloud-gate="loading"]'),
    'bulut verisi yüklenemedi (kapı açılmadı) — CloudSyncBanner/şerit metnine bakın',
  ).toHaveCount(0, { timeout: 45_000 });
}

/** Senkronizasyon şeridinin ekrandaki gerçek metni (hata varsa burada görünür). */
async function syncBannerText(page: Page): Promise<string> {
  const banner = page.locator('.cloud-sync-banner');
  if ((await banner.count()) === 0) return '(şerit görünmüyor / bulut modu dışı)';
  return (await banner.first().innerText()).trim();
}

/** Yerel deponun ad alanları: kayıt kapsamlı (`psikolog:org:user:…`) mı, kapsamsız mı yazıldı? */
async function storageReport(page: Page) {
  return page.evaluate(() => {
    const keys = Object.keys(window.localStorage);
    return {
      toplam: keys.length,
      kapsamli: keys.filter((key) => key.startsWith('psikolog:')).length,
      kapsamsiz: keys.filter((key) => !key.startsWith('psikolog:')).length,
      kuyruk: keys.some((key) => key.endsWith('outbox')),
    };
  });
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  const emailInput = page.locator('#email');
  await expect(emailInput).toBeVisible({ timeout: 30_000 });
  await emailInput.fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  // Oturum açıldığında çıkış düğmesi (yalnız bulut modunda) görünür.
  await expect(page.getByRole('button', { name: 'Çıkış' })).toBeVisible({ timeout: 30_000 });
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Çıkış' }).click();
  await expect(page.locator('#email')).toBeVisible({ timeout: 30_000 });
}

async function openClients(page: Page) {
  await page.goto('/danisanlar');
  await waitForCloudReady(page);
  await expect(page.getByRole('heading', { name: 'Danışan Dosyaları' })).toBeVisible({ timeout: 30_000 });
}

/** Bu testin ürettiği satır(lar) — `E2E-` protokol numarasıyla bulunur. */
function testRows(page: Page) {
  return page.locator('.client-table tbody tr').filter({ hasText: FILE_PREFIX });
}

/**
 * Bu koşunun kaydı — benzersiz protokol numarasıyla bulunur.
 * DİKKAT (koşu #3): `getByRole('button', { name: … })` satırda 3 düğmeyle eşleşir
 * (ad düğmesi + düzenle/sil aria-label'ları) ve strict mode ihlali verir.
 */
function ownRow(page: Page) {
  return page.locator('.client-table tbody tr').filter({ hasText: FILE_NUMBER });
}

/** Danışan adı düğmesi — `exact: true` sayesinde düzenle/sil düğmeleriyle karışmaz. */
function nameButton(page: Page) {
  return page.getByRole('button', { name: FULL_NAME, exact: true });
}

/** Önceki başarısız koşulardan kalan `E2E-` artıklarını arayüzden temizler (self-healing). */
async function deleteLeftovers(page: Page) {
  for (let i = 0; i < 10; i += 1) {
    const rows = testRows(page);
    const count = await rows.count();
    if (count === 0) return;
    await rows.first().getByTitle('Danışanı sil').click();
    await expect(page.locator('.client-table tbody tr').filter({ hasText: FILE_PREFIX })).toHaveCount(
      Math.max(0, count - 1),
      { timeout: 20_000 },
    );
  }
}

test.describe('REAL BROWSER — canlı Supabase çok kullanıcılı oturum', () => {
  test.skip(
    !liveReady,
    'LIVE_PSY_A/B_EMAIL + VITE_SUPABASE_URL/ANON_KEY verilmedi → REAL BROWSER: NOT RUN (asla PASS sayılmaz)',
  );

  test('A ekler → sunucuya yazılır → yerel depo temizlenince sunucudan geri gelir → çıkış → B göremez → A yeniden görür', async ({
    page,
  }) => {
    test.slow();

    const alerts = watchDialogs(page);
    const backend = watchBackend(page);

    // ---------------------------------------------------------------- 1) A girişi
    await login(page, LIVE.aEmail, LIVE.aPassword);

    // ---------------------------------------------------------------- 2) hazırlık + eski artıklar
    await openClients(page);
    test.info().annotations.push({ type: 'hidrasyon', description: backend.summary() });
    await deleteLeftovers(page);
    // Artık silmelerinin yanıtları otursun: kaydetme kanıtı yalnız POST ile ölçülecek.
    await awaitBackendIdle(backend);

    // ---------------------------------------------------------------- 3) A kayıt oluşturur
    await page.getByRole('button', { name: 'Yeni Danışan Kaydı' }).click();
    const dialog = page.getByRole('dialog', { name: 'Yeni Danışan Kaydı' });
    await expect(dialog).toBeVisible();
    await page.locator('#client-file-number').fill(FILE_NUMBER);
    await page.locator('#client-first-name').fill('E2E');
    await page.locator('#client-last-name').fill(`Tarayici ${stamp}`);
    await page.locator('#client-gender').selectOption('KADIN');

    // Zorunlu alanlar dolu mu? (tarayıcı doğrulaması submit'i engelliyorsa burada net görürüz)
    const invalidFields = await page.evaluate(() =>
      Array.from(document.querySelectorAll('form input, form select, form textarea'))
        .filter((element) => !(element as HTMLInputElement).checkValidity())
        .map((element) => (element as HTMLInputElement).id || (element as HTMLInputElement).name),
    );
    expect(invalidFields, `formda geçersiz zorunlu alanlar: ${invalidFields.join(', ')}`).toEqual([]);

    const postCursor = backend.posts().length;
    await page.getByRole('button', { name: 'Danışanı Kaydet' }).click();

    // Kaydetme başarısızsa uygulama native alert verir; sessizce beklemek yerine burada düşelim.
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });
    expect(alerts, `kaydet sırasında uyarı çıktı: ${alerts.join(' | ')}`).toEqual([]);

    // ★ Kritik kanıt: kayıt GERÇEKTEN sunucuya yazıldı mı? (yerel önbellekte görünmesi yetmez)
    // Yalnız **POST /rest/v1/clients** kanıt sayılır: temizlikten kalan DELETE'ler 2xx olsa da
    // yeni kaydın oluştuğunu göstermez (koşu #4'te ölçüm bu yüzden kaymıştı).
    const bannerSnapshot = await syncBannerText(page);
    const storageSnapshot = await storageReport(page);
    const newPosts = () => backend.posts().slice(postCursor);
    await expect
      .poll(() => newPosts().filter((call) => call.status >= 200 && call.status < 300).length, {
        timeout: 20_000,
        message:
          'kayıt sunucuya yazılmadı (POST /rest/v1/clients → 2xx yok). ' +
          `Şerit: ${bannerSnapshot} | ${backend.summary()} | yerel depo: ${JSON.stringify(storageSnapshot)}`,
      })
      .toBeGreaterThan(0);

    const post = newPosts().find((call) => call.status >= 200 && call.status < 300)!;
    expect(
      post.body,
      `sunucu yanıtı oluşturulan kaydı içermiyor (file_number=${FILE_NUMBER}): ${post.body}`,
    ).toContain(FILE_NUMBER);
    const failedAfterSave = newPosts().filter((call) => call.status >= 400);
    test.info().annotations.push({
      type: 'bulut kaydı',
      description: `POST /rest/v1/clients → ${post.status} · gövde: ${post.body}`,
    });
    test.info().annotations.push({ type: 'senkronizasyon şeridi', description: bannerSnapshot });
    test.info().annotations.push({ type: 'yerel depo', description: JSON.stringify(storageSnapshot) });
    test.info().annotations.push({
      type: 'çağrı özeti',
      description:
        `kaydetten sonra clients çağrıları: ${backend.writes().slice(postCursor).map((call) => `${call.method}→${call.status}`).join(', ') || 'yok'}` +
        ` | POST: ${newPosts().map((call) => call.status).join(',') || 'yok'}`,
    });
    if (failedAfterSave.length) {
      test.info().annotations.push({
        type: 'başarısız yazımlar',
        description: failedAfterSave.map((call) => `${call.method}→${call.status} ${call.body}`).join(' | '),
      });
    }

    // Uygulama davranışı: yeni danışan kaydında DETAY sayfasına yönlendirir.
    await expect(page).toHaveURL(/\/danisanlar\/[^/]+$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: FULL_NAME, exact: true })).toBeVisible({ timeout: 30_000 });

    // ---------------------------------------------------------------- 4) listede görünür
    await openClients(page);
    await expect(ownRow(page), `liste satırı yok — ${backend.summary()}`).toBeVisible({ timeout: 30_000 });
    await expect(nameButton(page)).toBeVisible();

    // ---------------------------------------------------------------- 5) yerel depo temizliği
    // Klinik veri localStorage'dan DEĞİL sunucudan gelmeli: yerel depo silinip sayfa
    // yenilendiğinde kaydın yine görünmesi gerekir (bulut kalıcılığı kanıtı).
    await page.goto('/danisanlar');
    const localBefore = await page.evaluate(() => window.localStorage.length);
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await waitForCloudReady(page);
    await expect(
      ownRow(page),
      'yerel depo temizlendikten sonra kayıt sunucudan geri gelmedi',
    ).toBeVisible({ timeout: 30_000 });
    const localAfter = await page.evaluate(() => window.localStorage.length);
    test.info().annotations.push({
      type: 'localStorage',
      description: `silinen anahtar sayısı: ${localBefore} (yenileme sonrası yeniden oluşan: ${localAfter})`,
    });

    // ---------------------------------------------------------------- 6) çıkış → B
    await logout(page);
    await login(page, LIVE.bEmail, LIVE.bPassword);
    await openClients(page);
    await expect(ownRow(page)).toHaveCount(0);

    // ---------------------------------------------------------------- 7) B çıkış → A yeniden
    await logout(page);
    await login(page, LIVE.aEmail, LIVE.aPassword);
    await openClients(page);
    await expect(ownRow(page)).toBeVisible({ timeout: 30_000 });

    // ---------------------------------------------------------------- 8) temizlik (arayüzden)
    await ownRow(page).getByTitle('Danışanı sil').click();
    await expect(ownRow(page)).toHaveCount(0, { timeout: 30_000 });

    await logout(page);

    test.info().annotations.push({ type: 'ağ özeti', description: backend.summary() });
    if (backend.failed.length) {
      test.info().annotations.push({ type: 'başarısız istekler', description: backend.failed.join(' | ') });
    }
    if (backend.consoleErrors.length) {
      test.info().annotations.push({ type: 'konsol hataları', description: backend.consoleErrors.slice(0, 5).join(' | ') });
    }
  });
});
