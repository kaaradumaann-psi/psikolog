/**
 * ÇEVRİMDIŞI (YEREL) MOD — UI SÖZLEŞMESİ (6 test).
 *
 * ÖN KOŞUL: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` **verilmemelidir**.
 * Yerel modda uygulama doğrudan çalışma alanını açar; tüm testler bu varsayımla yazılmıştır
 * (tahta, kenar çubuğu, boş durumlar: "Henüz danışan dosyası yok", "İlk danışanı ekle").
 *
 * Supabase env'i verilirse uygulama **bulut moduna** geçer ve tasarım gereği **giriş kapısı**
 * gösterir (`src/App.tsx` → `CloudGate`); çalışma alanı yalnız oturum açıldıktan sonra
 * render edilir. Bu durumda bu suite anlamsızdır → **SKIP** (asla PASS/FAIL sayılmaz).
 * Gerçek tarayıcı koşusu #5'te bu karışıklık yaşandı: env dolu olduğu için 5 test
 * "element not found" ile düştü; oysa uygulama doğru davranıyordu (mod uyuşmazlığı).
 *
 * Doğru koşular (katmanlar karıştırılmaz):
 *   yerel mod :  npm run test:e2e:local   (VITE_SUPABASE_* OLMADAN)
 *   bulut/live:  npm run test:e2e:live    (env + LIVE_PSY_A/B kimlikleri)
 *
 * Not: Playwright `webServer`'ı (`npm run dev`) kabuk ortamını devralır; `VITE_SUPABASE_*`
 * env'i verildiği sürece uygulama bulut modundadır.
 */
import { test, expect } from '@playwright/test';

const cloudEnv = Boolean(
  process.env.VITE_SUPABASE_URL?.trim() && process.env.VITE_SUPABASE_ANON_KEY?.trim(),
);

test.skip(
  cloudEnv,
  'Bu suite ÇEVRİMDIŞI (yerel) mod sözleşmesidir. Supabase env verildiği için uygulama bulut ' +
    'modunda açılır ve tasarım gereği giriş kapısı gösterir (auth gate) → çalışma alanı render edilmez. ' +
    'Yerel modda koşun: npm run test:e2e:local (VITE_SUPABASE_* env değişkenleri olmadan); ' +
    'bulut/live katmanı için: npm run test:e2e:live.',
);

test('workspace opens without a public registration form', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bugünün tahtası' })).toBeVisible();
  await expect(page.getByText('Kayıt Ol')).toHaveCount(0);
});

test('assessment hub does not offer an optical form', async ({ page }) => {
  await page.goto('/testler');
  await expect(page.getByRole('heading', { name: 'Psikolojik Değerlendirme Araçları' })).toBeVisible();
  await expect(page.getByText('OMR')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Beck Depresyon/ })).toBeVisible();
});

test('client file and tasks routes render', async ({ page }) => {
  await page.goto('/danisanlar');
  await expect(page.getByRole('heading', { name: 'Danışan Dosyaları' })).toBeVisible();
  await page.goto('/gorevler');
  await expect(page.getByRole('heading', { name: 'Görevler' })).toBeVisible();
});

test('SCL-90-R does not display unanswered items as zero on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/testler/scl90');
  const firstItem = page.locator('.question-item-card').first();
  await expect(firstItem.locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(firstItem).not.toHaveClass(/answered/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await firstItem.locator('.option-label').first().click();
  await expect(firstItem.locator('input[type="radio"]:checked')).toHaveCount(1);
  await expect(firstItem).toHaveClass(/answered/);
  await page.locator('.scl-page-buttons button').nth(1).click();
  await expect(page.getByText('Maddeler (11 - 20 / 90)')).toBeVisible();
});

test('desktop sidebar and dashboard intake action work', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const sidebar = page.getByRole('navigation', { name: 'Çalışma alanı' });
  await expect(sidebar.getByRole('link', { name: 'Genel bakış' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'İlk danışanı ekle' }).click();
  const dialog = page.getByRole('dialog', { name: 'Yeni Danışan Kaydı' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('navigation', { name: 'Klinik araçlar' }).getByRole('link', { name: 'Değerlendirmeler' }).click();
  await expect(page.getByRole('heading', { name: 'Psikolojik Değerlendirme Araçları' })).toBeVisible();
});

test('mobile navigation and empty screens fit without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menüyü aç' }).click();
  const menu = page.getByRole('dialog', { name: 'Gezinme menüsü' });
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: 'Danışanlar' }).click();
  await expect(page.getByRole('heading', { name: 'Danışan Dosyaları' })).toBeVisible();
  await expect(page.getByText('Henüz danışan dosyası yok')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Menüyü aç' }).click();
  await page.getByRole('dialog', { name: 'Gezinme menüsü' }).getByRole('link', { name: 'Kaynakça' }).click();
  await expect(page.getByRole('heading', { name: 'Ölçek kaynakçası' })).toBeVisible();
});
