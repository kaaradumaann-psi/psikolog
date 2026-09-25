/**
 * PHASE 7 / P0-8 — REAL BROWSER: canlı Supabase üzerinde çok kullanıcılı oturum testi.
 *
 * Ne ölçer (istenen matris):
 *   1) A girişi → A'nın verisi görünür
 *   2) Tarayıcı yerel deposu temizlenip sayfa yenilendiğinde veri YİNE görünür
 *      (verinin localStorage'dan değil sunucudan geldiğinin tarayıcı kanıtı)
 *   3) A çıkışı → B girişi → A'nın verisi GÖRÜNMEZ
 *   4) B çıkışı → A girişi → A'nın verisi geri gelir
 *   5) Test kaydı arayüzden silinir (temizlik)
 *
 * Çalıştırma (gerçek Chromium gerekir):
 *   npx playwright install chromium
 *   VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… \
 *   LIVE_PSY_A_EMAIL=… LIVE_PSY_A_PASSWORD=… \
 *   LIVE_PSY_B_EMAIL=… LIVE_PSY_B_PASSWORD=… \
 *   npx playwright test e2e/live-multi-user.spec.ts --project=chromium
 *
 * Bu dosya, kimlik bilgileri verilmediğinde **SKIP** olur (asla PASS sayılmaz).
 * Sonuç etiketi: REAL BROWSER — LOCAL/PGlite ve LIVE SUPABASE koşucularından AYRIDIR.
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
const CLIENTS = 'E2E-' + stamp.toUpperCase();
const FIRST_NAME = 'E2E';
const LAST_NAME = `Tarayici ${stamp}`;

test.describe.configure({ mode: 'serial' });

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

test.describe('REAL BROWSER — canlı Supabase çok kullanıcılı oturum', () => {
  test.skip(
    !liveReady,
    'LIVE_PSY_A/B_EMAIL + VITE_SUPABASE_URL/ANON_KEY verilmedi → REAL BROWSER: NOT RUN (asla PASS sayılmaz)',
  );

  test('A ekler → yerel depo temizlenince sunucudan geri gelir → çıkış → B göremez → A yeniden görür', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    // ---------------------------------------------------------------- 1) A girişi
    await login(page, LIVE.aEmail, LIVE.aPassword);

    // ---------------------------------------------------------------- 2) A kayıt oluşturur
    await openClients(page);
    await page.getByRole('button', { name: 'Yeni Danışan Kaydı' }).click();
    const dialog = page.getByRole('dialog', { name: 'Yeni Danışan Kaydı' });
    await expect(dialog).toBeVisible();
    await page.locator('#client-file-number').fill(CLIENTS);
    await page.locator('#client-first-name').fill(FIRST_NAME);
    await page.locator('#client-last-name').fill(LAST_NAME);
    await page.locator('#client-gender').selectOption('KADIN');
    await page.getByRole('button', { name: 'Danışanı Kaydet' }).click();
    const clientRow = page.getByRole('button', { name: `${FIRST_NAME} ${LAST_NAME}` });
    await expect(clientRow).toBeVisible({ timeout: 30_000 });

    // ---------------------------------------------------------------- 3) yerel depo temizliği
    // Klinik veri localStorage'dan DEĞİL sunucudan gelmeli: yerel depo silinip
    // sayfa yenilendiğinde kaydın yine görünmesi gerekir (bulut kalıcılığı kanıtı).
    const localBefore = await page.evaluate(() => window.localStorage.length);
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: `${FIRST_NAME} ${LAST_NAME}` })).toBeVisible({
      timeout: 30_000,
    });
    const localAfter = await page.evaluate(() => window.localStorage.length);
    test.info().annotations.push({
      type: 'localStorage',
      description: `silinen anahtar sayısı: ${localBefore} (yenileme sonrası yeniden oluşan: ${localAfter})`,
    });

    // ---------------------------------------------------------------- 4) çıkış → B
    await logout(page);
    await login(page, LIVE.bEmail, LIVE.bPassword);
    await openClients(page);
    await expect(page.getByRole('button', { name: `${FIRST_NAME} ${LAST_NAME}` })).toHaveCount(0);

    // ---------------------------------------------------------------- 5) B çıkış → A yeniden
    await logout(page);
    await login(page, LIVE.aEmail, LIVE.aPassword);
    await openClients(page);
    await expect(page.getByRole('button', { name: `${FIRST_NAME} ${LAST_NAME}` })).toBeVisible({
      timeout: 30_000,
    });

    // ---------------------------------------------------------------- 6) temizlik (arayüzden)
    page.on('dialog', (dialog) => void dialog.accept());
    const row = page.locator('tr', { hasText: LAST_NAME });
    await row.getByTitle('Danışanı sil').click();
    await expect(page.getByRole('button', { name: `${FIRST_NAME} ${LAST_NAME}` })).toHaveCount(0, {
      timeout: 30_000,
    });

    await logout(page);
  });
});
