/**
 * PHASE 7 / P0-8 — REAL BROWSER: canlı Supabase üzerinde çok kullanıcılı oturum testi.
 *
 * Ne ölçer (istenen matris):
 *   1) A girişi → arayüzden danışan oluşturulur (uygulama kaydı sonrası DETAY sayfasına gider)
 *   2) Tarayıcı yerel verisi (localStorage) temizlenip sayfa yenilendiğinde kayıt YİNE görünür
 *      — verinin localStorage'dan değil Supabase'den geldiğinin tarayıcı kanıtı
 *   3) A çıkışı → B girişi → A'nın kaydı GÖRÜNMEZ
 *   4) B çıkışı → A girişi → kayıt geri gelir
 *   5) Test kaydı arayüzden silinir; önceki başarısız koşulardan kalan `E2E-` artıkları da temizlenir
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
 * NOT (koşu #1 düzeltmesi): `handleSave` yeni danışanda `navigate('/danisanlar/<id>')` yapar,
 * bu yüzden kayıt sonrası liste satırı hemen görünmez. Spec artık önce detay sayfasını doğrular,
 * sonra listeye dönüp satırı arar. Ayrıca kaydet sırasında çıkan `alert()` yakalanır ve
 * testi anında anlamlı bir mesajla düşürür (sessiz 30 sn beklemek yerine).
 */
import { test, expect, type Page } from '@playwright/test';

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

async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  const emailInput = page.locator('#email');
  await expect(emailInput).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Danışan Dosyaları' })).toBeVisible();
}

/** Bu testin ürettiği satır(lar) — `E2E-` protokol numarasıyla bulunur. */
function testRows(page: Page) {
  return page.locator('.client-table tbody tr').filter({ hasText: FILE_PREFIX });
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

  test('A ekler → yerel depo temizlenince sunucudan geri gelir → çıkış → B göremez → A yeniden görür', async ({
    page,
  }) => {
    test.slow();

    // ---------------------------------------------------------------- 1) A girişi
    const alerts = watchDialogs(page);
    await login(page, LIVE.aEmail, LIVE.aPassword);

    // ---------------------------------------------------------------- 2) eski artıkları temizle
    await openClients(page);
    await deleteLeftovers(page);

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

    await page.getByRole('button', { name: 'Danışanı Kaydet' }).click();

    // Kaydetme başarısızsa uygulama native alert verir; sessizce beklemek yerine burada düşelim.
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });
    expect(alerts, `kaydet sırasında uyarı çıktı: ${alerts.join(' | ')}`).toEqual([]);

    // Uygulama davranışı: yeni danışan kaydında DETAY sayfasına yönlendirir.
    await expect(page).toHaveURL(/\/danisanlar\/[^/]+$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: FULL_NAME })).toBeVisible({ timeout: 30_000 });

    // ---------------------------------------------------------------- 4) listede görünür
    await openClients(page);
    const clientRow = page.getByRole('button', { name: FULL_NAME });
    await expect(clientRow).toBeVisible({ timeout: 30_000 });

    // ---------------------------------------------------------------- 5) yerel depo temizliği
    // Klinik veri localStorage'dan DEĞİL sunucudan gelmeli: yerel depo silinip sayfa
    // yenilendiğinde kaydın yine görünmesi gerekir (bulut kalıcılığı kanıtı).
    await page.goto('/danisanlar');
    const localBefore = await page.evaluate(() => window.localStorage.length);
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: FULL_NAME })).toBeVisible({ timeout: 30_000 });
    const localAfter = await page.evaluate(() => window.localStorage.length);
    test.info().annotations.push({
      type: 'localStorage',
      description: `silinen anahtar sayısı: ${localBefore} (yenileme sonrası yeniden oluşan: ${localAfter})`,
    });

    // ---------------------------------------------------------------- 6) çıkış → B
    await logout(page);
    await login(page, LIVE.bEmail, LIVE.bPassword);
    await openClients(page);
    await expect(page.getByRole('button', { name: FULL_NAME })).toHaveCount(0);

    // ---------------------------------------------------------------- 7) B çıkış → A yeniden
    await logout(page);
    await login(page, LIVE.aEmail, LIVE.aPassword);
    await openClients(page);
    await expect(page.getByRole('button', { name: FULL_NAME })).toBeVisible({ timeout: 30_000 });

    // ---------------------------------------------------------------- 8) temizlik (arayüzden)
    const row = page.locator('.client-table tbody tr').filter({ hasText: FILE_NUMBER });
    await row.getByTitle('Danışanı sil').click();
    await expect(page.getByRole('button', { name: FULL_NAME })).toHaveCount(0, { timeout: 30_000 });

    await logout(page);
  });
});
