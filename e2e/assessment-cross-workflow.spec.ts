/** Cross-instrument responsive and consumer workflows. */
import { test, expect, type Page } from '@playwright/test';

const cloudEnv = Boolean(process.env.VITE_SUPABASE_URL?.trim() && process.env.VITE_SUPABASE_ANON_KEY?.trim());
test.skip(cloudEnv, 'Local cross-instrument workflow is isolated from configured Supabase environments.');

const CLIENT = {
  id: 'client-a', fileNumber: 'HK-2026-001', firstName: 'Ayşe', lastName: 'Yılmaz',
  birthDate: '1990-09-20', age: 36, gender: 'KADIN', phone: '', email: '', occupation: '', education: '', maritalStatus: '',
  emergencyContact: { name: '', phone: '', relation: '' }, presentingComplaint: '', medicalHistory: '', psychiatricHistory: '',
  medications: '', familyHistory: '', allergiesNotes: '', diagnoses: [], status: 'active',
  createdAt: '2026-09-20T08:00:00.000Z', updatedAt: '2026-09-20T08:00:00.000Z',
};

async function seed(page: Page) {
  await page.addInitScript(({ client }) => {
    if (!sessionStorage.getItem('__assessment_cross_ready')) {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('__assessment_cross_ready', '1');
      localStorage.setItem('psikolog_clients_v2', JSON.stringify([client]));
    }
  }, { client: CLIENT });
}

async function answerVisible(page: Page, score = 0) {
  await page.locator(`.bdi-item-row input[value="${score}"]`).evaluateAll((inputs) => {
    for (const input of inputs) (input as HTMLInputElement).click();
  });
}

async function answerScl(page: Page) {
  for (let index = 0; index < 9; index += 1) {
    await answerVisible(page);
    if (index < 8) await page.getByRole('button', { name: 'Sonraki 10 madde' }).click();
  }
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '90');
}

async function chooseClientAndSave(page: Page, kind: 'bai' | 'scl' | 'gad' | 'phq') {
  await page.getByLabel('Kayıtlı danışan').selectOption('client-a');
  if (kind === 'scl') await answerScl(page);
  else {
    await answerVisible(page);
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', kind === 'gad' ? '7' : kind === 'phq' ? '9' : '21');
  }
  await page.getByRole('button', { name: 'Sonucu kaydet' }).click();
  await expect(page.getByRole('status')).toContainText(/ayrı kayıt olarak kaydedildi/);
}

test('tablet: hub and every active assessment route retain chrome and avoid horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await seed(page);
  const routes: Array<[string, string]> = [
    ['/testler', 'Psikolojik Değerlendirme Araçları'],
    ['/testler/beck-depresyon', 'Depresyon değerlendirme uygulaması'],
    ['/testler/beck-anksiyete', 'Anksiyete belirti puanı aktarımı'],
    ['/testler/scl90', 'Belirti profili yanıt aktarımı'],
    ['/testler/tarama', 'Kısa tarama puanı aktarımı'],
  ];
  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.locator('.workspace-sidebar')).toBeAttached();
    await expect(page.locator('.app-header')).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole('tab', { name: /PHQ-9/ }).click();
  await expect(page.locator('.bdi-item-row')).toHaveCount(9);
});

test('source page exposes instrument-specific authority and explicit license/provenance unknowns', async ({ page }) => {
  await page.goto('/kaynaklar');
  await expect(page.getByRole('heading', { name: 'Ölçek kaynakçası' })).toBeVisible();
  await expect(page.getByText(/UNKNOWN \/ VERIFY LICENSE/)).toHaveCount(3);
  await expect(page.getByRole('link', { name: /Pearson SCL-90-R ürün/ })).toHaveAttribute('href', /pearsonassessments\.com/);
  await expect(page.getByRole('link', { name: /PHQ Screeners resmî erişim/ })).toHaveAttribute('href', 'https://www.phqscreeners.com/select-screener');
  await expect(page.locator('a[href*="wikipedia"], a[href*="blog"], a[href*="forum"]')).toHaveCount(0);
});

test('client history and comprehensive report consume BAI, SCL-90-R, GAD-7 and PHQ-9 records', async ({ page }) => {
  test.setTimeout(90_000);
  await seed(page);

  await page.goto('/testler/beck-anksiyete');
  await chooseClientAndSave(page, 'bai');

  await page.goto('/testler/scl90');
  await chooseClientAndSave(page, 'scl');

  await page.goto('/testler/tarama');
  await chooseClientAndSave(page, 'gad');
  await page.getByRole('tab', { name: /PHQ-9/ }).click();
  await chooseClientAndSave(page, 'phq');

  await page.goto('/danisanlar/client-a');
  await page.locator('.file-section-toggle').click();
  await page.getByRole('menuitem', { name: /Ölçekler 4/ }).click();
  await expect(page.getByText('Beck Anksiyete Envanteri (BAI)')).toBeVisible();
  await expect(page.getByText('SCL-90-R Belirti Tarama Listesi')).toBeVisible();
  await expect(page.getByText('GAD-7 Kısa Tarama')).toBeVisible();
  await expect(page.getByText('PHQ-9 Kısa Tarama')).toBeVisible();
  await expect(page.getByText(/Revizyon 1/)).toHaveCount(4);

  await page.goto('/raporlar');
  await page.getByLabel('Raporun danışanı').selectOption('client-a');
  await page.getByRole('button', { name: 'Psikiyatrik Sevk Raporu' }).click();
  const report = page.locator('.print-report-sheet');
  await expect(report).toContainText('BAI 0');
  await expect(report).toContainText('GSI 0');
  await expect(report).toContainText('GAD-7 0');
  await expect(report).toContainText('PHQ-9 0');
  await expect(report).toContainText('tanı koymaz');
});
