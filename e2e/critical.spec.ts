import { test, expect } from '@playwright/test';

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
