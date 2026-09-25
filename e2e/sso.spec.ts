import { test, expect } from '@playwright/test';

test('local mode does not start SSO and exposes no tokens in the URL', async ({ page }) => {
  await page.goto('/ayarlar');
  await expect(page.getByRole('heading', { name: 'Ayarlar' })).toBeVisible();
  await expect(page.getByText('MMPI’ye parolasız geçiş için bulut girişi gerekir.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'MMPI’ye git' })).toHaveCount(0);
  expect(page.url()).not.toMatch(/access_token|refresh_token/);
});

test('workspace has no public registration and no JWT in location', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Kayıt Ol')).toHaveCount(0);
  expect(page.url()).not.toMatch(/access_token|refresh_token/);
});
