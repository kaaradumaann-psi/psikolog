import { test, expect } from '@playwright/test';

const cloudEnv = Boolean(process.env.VITE_SUPABASE_URL?.trim() && process.env.VITE_SUPABASE_ANON_KEY?.trim());
test.skip(cloudEnv, 'This fail-closed audit applies only when the production bundle has no Supabase credentials.');

test('production bundle without Supabase configuration blocks every assessment route instead of storing clinical data locally', async ({ page }) => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => failed.push(`${request.method()} ${request.url()}`));
  const routes = [
    '/testler',
    '/testler/beck-depresyon',
    '/testler/beck-anksiyete',
    '/testler/scl90',
    '/testler/tarama',
  ];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.getByRole('alert')).toContainText('Klinik çalışma alanı açılamadı');
    await expect(page.getByRole('alert')).toContainText('Sunucu bağlantısı yapılandırılmamış');
    await expect(page.getByRole('button', { name: 'Sonucu kaydet' })).toHaveCount(0);
  }
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => /tests|screenings|draft/i.test(key)))).toEqual([]);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});
