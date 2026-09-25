import { test, expect, type Page } from '@playwright/test';
import { PASSWORD, PSY_UNMATCHED, PSY_USER, startLiveSso, type LiveSso } from './ssoLiveServer';

let live: LiveSso;

test.beforeAll(async () => {
  live = await startLiveSso();
});

test.afterAll(async () => {
  await live?.stop();
});

async function signInPsychology(page: Page, email: string) {
  await page.goto(`${live.psychologyOrigin}/`);
  await expect(page.getByRole('heading', { name: 'Hoş geldiniz.' })).toBeVisible();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await expect(page.getByRole('link', { name: 'Ayarlar', exact: true })).toBeVisible();
}

async function clickSsoAndCaptureUrl(page: Page): Promise<URL> {
  const pending = new Promise<URL>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SSO navigation not seen')), 20_000);
    void page.route(`${live.mmpiOrigin}/sso**`, async (route) => {
      const url = new URL(route.request().url());
      clearTimeout(timer);
      resolve(url);
      await route.continue();
    });
  });
  await page.getByRole('button', { name: 'MMPI’ye git' }).click();
  return pending;
}

test('browser SSO: Psychology session exchanges a one-time code and MMPI AuthGate hydrates', async ({ page }) => {
  await signInPsychology(page, PSY_USER.email);
  await page.goto(`${live.psychologyOrigin}/ayarlar`);
  await expect(page.getByText(`Hedef: ${live.mmpiOrigin}`)).toBeVisible();
  await page.getByRole('button', { name: 'MMPI’ye git' }).click();
  await page.waitForURL((url) => url.origin === live.mmpiOrigin && url.pathname.replace(/\/+$/, '') === '', {
    timeout: 20_000,
  });
  expect(page.url()).not.toMatch(/access_token|refresh_token/);
  expect(new URL(page.url()).search).toBe('');
  await expect(page.getByRole('link', { name: 'İşlem', exact: true })).toBeVisible();
});

test('browser SSO: URL may contain only code and state, then the query is stripped', async ({ page }) => {
  await signInPsychology(page, PSY_USER.email);
  await page.goto(`${live.psychologyOrigin}/ayarlar`);
  const target = await clickSsoAndCaptureUrl(page);
  expect([...target.searchParams.keys()].sort()).toEqual(['code', 'state']);
  expect(target.searchParams.get('code')).toBeTruthy();
  expect(target.searchParams.get('code')).not.toMatch(/access_token|refresh_token|\./);
  await page.waitForURL((url) => url.origin === live.mmpiOrigin && url.pathname.replace(/\/+$/, '') === '', {
    timeout: 20_000,
  });
  expect(page.url()).not.toMatch(/access_token|refresh_token/);
});

test('browser SSO: replay of the same code is rejected', async ({ page, context }) => {
  await signInPsychology(page, PSY_USER.email);
  await page.goto(`${live.psychologyOrigin}/ayarlar`);
  const target = await clickSsoAndCaptureUrl(page);
  await page.waitForURL((url) => url.origin === live.mmpiOrigin && url.pathname.replace(/\/+$/, '') === '', {
    timeout: 20_000,
  });
  const second = await context.newPage();
  await second.goto(target.toString());
  await expect(second.getByRole('alert')).toBeVisible();
  await expect(second.getByText(/MMPI oturumu kurulamadı|SSO kodu/)).toBeVisible();
  expect(second.url()).not.toMatch(/access_token|refresh_token/);
});

test('browser SSO: unmatched MMPI user is 403 and AuthGate is not bypassed', async ({ page }) => {
  await signInPsychology(page, PSY_UNMATCHED.email);
  await page.goto(`${live.psychologyOrigin}/ayarlar`);
  await page.getByRole('button', { name: 'MMPI’ye git' }).click();
  await page.waitForURL((url) => url.origin === live.mmpiOrigin && url.pathname === '/sso', { timeout: 20_000 });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Giriş ekranı' })).toBeVisible();
  await page.goto(`${live.mmpiOrigin}/`);
  await expect(page.getByRole('heading', { name: /Hoş geldiniz|Bağlantı gerekli/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'İşlem' })).toHaveCount(0);
});

test('browser SSO: missing code stays on /sso without a session', async ({ page }) => {
  await page.goto(`${live.mmpiOrigin}/sso`);
  await expect(page.getByText('SSO kodu eksik veya süresi doldu.')).toBeVisible();
  expect(page.url()).not.toMatch(/access_token|refresh_token/);
});
