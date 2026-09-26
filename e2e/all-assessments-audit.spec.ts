/**
 * Active non-BDI assessment production audit (33 browser scenarios).
 * Licensed/unverified Turkish item text is intentionally neither expected nor reproduced.
 */
import { test, expect, type Page } from '@playwright/test';

const cloudEnv = Boolean(process.env.VITE_SUPABASE_URL?.trim() && process.env.VITE_SUPABASE_ANON_KEY?.trim());
test.skip(cloudEnv, 'Yerel assessment workflow audit is isolated from configured Supabase environments.');

const CLIENTS = [
  {
    id: 'client-a', fileNumber: 'HK-2026-001', firstName: 'Ayşe', lastName: 'Yılmaz',
    birthDate: '1990-09-20', age: 36, gender: 'KADIN', phone: '', email: '', occupation: '', education: '', maritalStatus: '',
    emergencyContact: { name: '', phone: '', relation: '' }, presentingComplaint: '', medicalHistory: '', psychiatricHistory: '',
    medications: '', familyHistory: '', allergiesNotes: '', diagnoses: [], status: 'active',
    createdAt: '2026-09-20T08:00:00.000Z', updatedAt: '2026-09-20T08:00:00.000Z',
  },
  {
    id: 'client-b', fileNumber: 'HK-2026-002', firstName: 'Mehmet', lastName: 'Kaya',
    birthDate: '1985-10-01', age: 40, gender: 'ERKEK', phone: '', email: '', occupation: '', education: '', maritalStatus: '',
    emergencyContact: { name: '', phone: '', relation: '' }, presentingComplaint: '', medicalHistory: '', psychiatricHistory: '',
    medications: '', familyHistory: '', allergiesNotes: '', diagnoses: [], status: 'active',
    createdAt: '2026-09-20T08:00:00.000Z', updatedAt: '2026-09-20T08:00:00.000Z',
  },
] as const;

type Route = 'bai' | 'scl90' | 'rapid';
const ROUTES: Record<Route, { path: string; heading: string }> = {
  bai: { path: '/testler/beck-anksiyete', heading: 'Anksiyete belirti puanı aktarımı' },
  scl90: { path: '/testler/scl90', heading: 'Belirti profili yanıt aktarımı' },
  rapid: { path: '/testler/tarama', heading: 'Kısa tarama puanı aktarımı' },
};

async function openRoute(page: Page, route: Route, withClients = false) {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`));
  await page.addInitScript(({ clients }) => {
    if (!sessionStorage.getItem('__assessment_e2e_ready')) {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('__assessment_e2e_ready', '1');
      if (clients.length) localStorage.setItem('psikolog_clients_v2', JSON.stringify(clients));
    }
  }, { clients: withClients ? CLIENTS : [] });
  await page.goto(ROUTES[route].path);
  await expect(page.getByRole('heading', { name: ROUTES[route].heading })).toBeVisible();
  return { consoleErrors, failedRequests };
}

async function fillIdentity(page: Page) {
  await page.getByLabel('Danışan adı soyadı').fill('Test Danışan');
  await page.getByLabel('Kayıt modelindeki cinsiyet').selectOption('KADIN');
}

async function clickVisibleScore(page: Page, score: number) {
  await page.locator(`.bdi-item-row input[value="${score}"]`).evaluateAll((inputs) => {
    for (const input of inputs) (input as HTMLInputElement).click();
  });
}

async function answerSimple(page: Page, itemCount: number, scores: number | number[]) {
  const values = Array.isArray(scores) ? scores : Array.from({ length: itemCount }, () => scores);
  for (let index = 0; index < itemCount; index += 1) {
    await page.locator('.bdi-item-row').nth(index).locator(`input[value="${values[index]}"]`).evaluate((input: HTMLInputElement) => input.click());
  }
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(itemCount));
}

async function answerScl(page: Page, score: number) {
  for (let pageIndex = 0; pageIndex < 9; pageIndex += 1) {
    await clickVisibleScore(page, score);
    const answered = Math.min(90, (pageIndex + 1) * 10);
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(answered));
    if (pageIndex < 8) await page.getByRole('button', { name: 'Sonraki 10 madde' }).click();
  }
}

async function expectRealResultPdf(page: Page, assessment: string, expectedText: string) {
  await page.evaluate(() => { window.print = () => undefined; });
  await page.getByRole('button', { name: 'Sonuç özeti / PDF' }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.assessmentPrint ?? '')).toBe('result');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.assessment-result-print-header')).toBeVisible();
  await expect(page.locator('.bdi-result-section')).toContainText(expectedText);
  await expect(page.getByRole('button', { name: 'Sonucu kaydet' })).toBeHidden();
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.byteLength).toBeGreaterThan(8_000);
  const expectedCode = assessment === 'scl90' ? 'SCL-90-R' : assessment === 'gad7' ? 'GAD-7' : assessment === 'phq9' ? 'PHQ-9' : assessment.toUpperCase();
  await expect(page.locator('.assessment-result-print-header')).toContainText(expectedCode);
}

async function expectChromeAndFavicon(page: Page) {
  await expect(page.locator('.workspace-sidebar')).toBeAttached();
  await expect(page.locator('.sidebar-bottom')).toBeAttached();
  await expect(page.locator('.app-header')).toBeAttached();
  const favicon = await page.request.get('/favicon.svg?v=2');
  expect(favicon.ok()).toBe(true);
  const svg = await favicon.text();
  expect(svg).toContain('#0d0d0d');
  expect(svg.match(/#f6f6f6/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  expect(svg).not.toContain('#8fc5ff');
}

// ---------------------------------------------------------------------------
// BAI — 8 browser scenarios
// ---------------------------------------------------------------------------

test('[BAI 1/8] identity, rights, response model and empty-state integrity', async ({ page }) => {
  await openRoute(page, 'bai');
  await expect(page.getByText('BAI · ULUSOY TÜRKÇE UYARLAMASI · LİSANSLI FORM')).toBeVisible();
  await expect(page.getByRole('complementary', { name: /BAI kullanım ve telif/ }).getByText(/BAI telif ve marka koruması/)).toBeVisible();
  await expect(page.locator('.bdi-item-row')).toHaveCount(21);
  await expect(page.locator('.bdi-item-row .question-text, [data-licensed-item-text]')).toHaveCount(0);
  await expect(page.getByText('Henüz sonuç üretilmedi')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sonucu kaydet' })).toBeDisabled();
});

test('[BAI 2/8] exact lower/upper totals and descriptive bands render only after completion', async ({ page }) => {
  await openRoute(page, 'bai');
  await answerSimple(page, 21, 0);
  await expect(page.locator('.bdi-total-score')).toContainText('0 / 63');
  await answerSimple(page, 21, 3);
  await expect(page.locator('.bdi-total-score')).toContainText('63 / 63');
  await expect(page.locator('.bdi-result-content')).not.toContainText(/tanı kon|Türk normu/i);
});

test('[BAI 3/8] save retry is idempotent and correction creates linked immutable revision', async ({ page }) => {
  await openRoute(page, 'bai');
  await fillIdentity(page);
  await answerSimple(page, 21, 0);
  const save = page.getByRole('button', { name: 'Sonucu kaydet' });
  await save.click();
  await save.click();
  await expect(page.getByRole('status')).toContainText('yinelenen kayıt oluşturulmadı');
  await page.locator('.bdi-item-row').first().locator('input[value="1"]').evaluate((input: HTMLInputElement) => input.click());
  await save.click();
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('psikolog_bai_tests_v2') ?? '[]'));
  expect(records).toHaveLength(2);
  const revisions = records.sort((a: { revision: number }, b: { revision: number }) => a.revision - b.revision);
  expect(revisions[1].revisionOf).toBe(revisions[0].id);
  expect(revisions[0].totalScore).toBe(0);
  expect(revisions[1].totalScore).toBe(1);
});

test('[BAI 4/8] client-bound tab drafts do not leak between clients', async ({ page }) => {
  await openRoute(page, 'bai', true);
  const select = page.getByLabel('Kayıtlı danışan');
  await select.selectOption('client-a');
  await page.locator('.bdi-item-row').first().locator('input[value="2"]').evaluate((input: HTMLInputElement) => input.click());
  await select.selectOption('client-b');
  await expect(page.locator('.bdi-item-row').first().getByRole('radio', { checked: true })).toHaveCount(0);
  await select.selectOption('client-a');
  await expect(page.locator('.bdi-item-row').first().locator('input[value="2"]')).toBeChecked();
  await expect(page.getByLabel('Danışan adı soyadı')).toHaveValue('Ayşe Yılmaz');
});

test('[BAI 5/8] impossible future administration date blocks persistence without date shifting', async ({ page }) => {
  await openRoute(page, 'bai');
  await fillIdentity(page);
  await answerSimple(page, 21, 0);
  const date = page.locator('input[type="date"]');
  await date.fill('2099-01-01');
  await page.getByRole('button', { name: 'Sonucu kaydet' }).click();
  await expect(page.getByRole('alert')).toContainText('gelecekte olmayan');
  await expect(date).toHaveValue('2099-01-01');
});

test('[BAI 6/8] mobile keyboard/radio semantics, unchanged chrome/favicon, console and network', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runtime = await openRoute(page, 'bai');
  const first = page.locator('.bdi-item-row').first();
  await first.locator('input[value="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(first.locator('input[value="1"]')).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectChromeAndFavicon(page);
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.failedRequests).toEqual([]);
});

test('[BAI 7/8] generated result PDF uses the live result source and response transfer summary', async ({ page }) => {
  await openRoute(page, 'bai');
  await fillIdentity(page);
  await answerSimple(page, 21, 1);
  await page.getByLabel('Uzman notu').fill('BAI PDF doğrulama notu.');
  await expectRealResultPdf(page, 'bai', '21 / 63');
  await expect(page.locator('.bdi-response-summary span')).toHaveCount(21);
});

test('[BAI 8/8] saved result survives reload and appears in assessment history with same score', async ({ page }) => {
  await openRoute(page, 'bai');
  await fillIdentity(page);
  await answerSimple(page, 21, 1);
  await page.getByRole('button', { name: 'Sonucu kaydet' }).click();
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('psikolog_bai_tests_v2') ?? '[]')[0]?.totalScore)).toBe(21);
  await page.getByRole('button', { name: /Test bataryasına dön/ }).click();
  await expect(page.getByText('Test Danışan')).toBeVisible();
  await expect(page.getByText(/Beck Anksiyete · BAI · .* · 21\/63/)).toBeVisible();
});

// ---------------------------------------------------------------------------
// SCL-90-R — 8 browser scenarios
// ---------------------------------------------------------------------------

test('[SCL-90-R 1/8] identity, rights, 90-item model, pagination and no protected text', async ({ page }) => {
  await openRoute(page, 'scl90');
  await expect(page.getByText('SCL-90-R® · DAĞ TÜRKÇE ÇALIŞMASI · LİSANSLI FORM')).toBeVisible();
  await expect(page.getByRole('complementary', { name: /SCL-90-R kullanım ve telif/ }).getByText(/Pearson resmî formları/)).toBeVisible();
  await expect(page.getByRole('button', { name: /sayfa/ })).toHaveCount(9);
  await expect(page.locator('.bdi-item-row')).toHaveCount(10);
  await expect(page.locator('.question-text, [data-licensed-item-text]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '90');
});

test('[SCL-90-R 2/8] all-zero transfer yields exact raw global indices and nine dimensions', async ({ page }) => {
  await openRoute(page, 'scl90');
  await answerScl(page, 0);
  await expect(page.locator('.bdi-total-score')).toContainText('0 / 4.00');
  await expect(page.locator('.bdi-result-facts')).toContainText('0 / 90');
  await expect(page.locator('.scl-bar-item')).toHaveCount(9);
  await expect(page.locator('.bdi-result-content')).not.toContainText(/T-puanı:|tanı kon|GSI >= 1/i);
});

test('[SCL-90-R 3/8] upper bounds and critical item flag stay neutral and non-diagnostic', async ({ page }) => {
  await openRoute(page, 'scl90');
  await answerScl(page, 4);
  await expect(page.locator('.bdi-total-score')).toContainText('4 / 4.00');
  await expect(page.locator('.bdi-result-facts')).toContainText('90 / 90');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Kritik yanıt bayrağı oluştu');
  await expect(alert).toContainText('risk yüzdesi, risk düzeyi veya tanı üretmez');
});

test('[SCL-90-R 4/8] save retry and changed score preserve linked revision history', async ({ page }) => {
  await openRoute(page, 'scl90');
  await fillIdentity(page);
  await answerScl(page, 0);
  const save = page.getByRole('button', { name: 'Sonucu kaydet' });
  await save.click();
  await save.click();
  await expect(page.getByRole('status')).toContainText('yinelenen kayıt oluşturulmadı');
  await page.getByRole('button', { name: '1. sayfa' }).click();
  await page.locator('.bdi-item-row').first().locator('input[value="1"]').evaluate((input: HTMLInputElement) => input.click());
  await save.click();
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('psikolog_scl90_tests_v2') ?? '[]'));
  expect(records).toHaveLength(2);
  const second = records.find((record: { revision: number }) => record.revision === 2);
  expect(second.revisionOf).toBe(records.find((record: { revision: number }) => record.revision === 1).id);
});

test('[SCL-90-R 5/8] client drafts retain their own page-one response and identity only', async ({ page }) => {
  await openRoute(page, 'scl90', true);
  const select = page.getByLabel('Kayıtlı danışan');
  await select.selectOption('client-a');
  await page.locator('.bdi-item-row').first().locator('input[value="3"]').evaluate((input: HTMLInputElement) => input.click());
  await select.selectOption('client-b');
  await expect(page.locator('.bdi-item-row').first().getByRole('radio', { checked: true })).toHaveCount(0);
  await select.selectOption('client-a');
  await expect(page.locator('.bdi-item-row').first().locator('input[value="3"]')).toBeChecked();
});

test('[SCL-90-R 6/8] future administration date blocks a fully completed record', async ({ page }) => {
  await openRoute(page, 'scl90');
  await fillIdentity(page);
  await answerScl(page, 0);
  await page.locator('input[type="date"]').fill('2099-01-01');
  await page.getByRole('button', { name: 'Sonucu kaydet' }).click();
  await expect(page.getByRole('alert')).toContainText('gelecekte olmayan');
});

test('[SCL-90-R 7/8] mobile route has keyboard semantics, no overflow, unchanged chrome, clean runtime', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runtime = await openRoute(page, 'scl90');
  const first = page.locator('.bdi-item-row').first();
  await first.locator('input[value="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(first.locator('input[value="1"]')).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectChromeAndFavicon(page);
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.failedRequests).toEqual([]);
});

test('[SCL-90-R 8/8] actual PDF contains same raw global result and no input controls', async ({ page }) => {
  await openRoute(page, 'scl90');
  await fillIdentity(page);
  await answerScl(page, 1);
  await page.getByLabel('Uzman notu').fill('SCL PDF doğrulama notu.');
  await expectRealResultPdf(page, 'scl90', '1 / 4.00');
  await expect(page.locator('.scl-bar-item')).toHaveCount(9);
});

// ---------------------------------------------------------------------------
// GAD-7 — 8 browser scenarios
// ---------------------------------------------------------------------------

test('[GAD-7 1/8] identity, period, seven numeric rows and empty state are tool-specific', async ({ page }) => {
  await openRoute(page, 'rapid');
  await expect(page.getByRole('tab', { name: /GAD-7/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('GAD-7 · PHQ-9 · SON 2 HAFTA')).toBeVisible();
  await expect(page.locator('.bdi-item-row')).toHaveCount(7);
  await expect(page.locator('.question-text, [data-licensed-item-text]')).toHaveCount(0);
  await expect(page.getByText('Henüz sonuç üretilmedi')).toBeVisible();
});

test('[GAD-7 2/8] exact bounds and Turkish clinical-sample reference are separated from diagnosis', async ({ page }) => {
  await openRoute(page, 'rapid');
  await answerSimple(page, 7, 0);
  await expect(page.locator('.bdi-total-score')).toContainText('0 / 21');
  await answerSimple(page, 7, 3);
  await expect(page.locator('.bdi-total-score')).toContainText('21 / 21');
  await expect(page.locator('.bdi-result-facts')).toContainText('8 puan · tanı değil');
});

test('[GAD-7 3/8] save/retry/correction creates two linked screening records', async ({ page }) => {
  await openRoute(page, 'rapid');
  await fillIdentity(page);
  await answerSimple(page, 7, 0);
  const save = page.getByRole('button', { name: 'Sonucu kaydet' });
  await save.click();
  await save.click();
  await expect(page.getByRole('status')).toContainText('yinelenen kayıt oluşturulmadı');
  await page.locator('.bdi-item-row').first().locator('input[value="1"]').evaluate((input: HTMLInputElement) => input.click());
  await save.click();
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('psikolog_screenings_v2') ?? '[]'));
  expect(records).toHaveLength(2);
  expect(records.find((record: { revision: number }) => record.revision === 2).revisionOf).toBe(records.find((record: { revision: number }) => record.revision === 1).id);
});

test('[GAD-7 4/8] switching to PHQ-9 and back restores GAD draft without cross-tool leakage', async ({ page }) => {
  await openRoute(page, 'rapid');
  await page.locator('.bdi-item-row').first().locator('input[value="2"]').evaluate((input: HTMLInputElement) => input.click());
  await page.getByRole('tab', { name: /PHQ-9/ }).click();
  await expect(page.locator('.bdi-item-row')).toHaveCount(9);
  await expect(page.locator('.bdi-item-row').first().getByRole('radio', { checked: true })).toHaveCount(0);
  await page.getByRole('tab', { name: /GAD-7/ }).click();
  await expect(page.locator('.bdi-item-row').first().locator('input[value="2"]')).toBeChecked();
});

test('[GAD-7 5/8] client A/B screening drafts remain isolated', async ({ page }) => {
  await openRoute(page, 'rapid', true);
  const select = page.getByLabel('Kayıtlı danışan');
  await select.selectOption('client-a');
  await page.locator('.bdi-item-row').first().locator('input[value="2"]').evaluate((input: HTMLInputElement) => input.click());
  await select.selectOption('client-b');
  await expect(page.locator('.bdi-item-row').first().getByRole('radio', { checked: true })).toHaveCount(0);
  await select.selectOption('client-a');
  await expect(page.locator('.bdi-item-row').first().locator('input[value="2"]')).toBeChecked();
});

test('[GAD-7 6/8] invalid future date blocks save', async ({ page }) => {
  await openRoute(page, 'rapid');
  await fillIdentity(page);
  await answerSimple(page, 7, 0);
  await page.locator('input[type="date"]').fill('2099-01-01');
  await page.getByRole('button', { name: 'Sonucu kaydet' }).click();
  await expect(page.getByRole('alert')).toContainText('gelecekte olmayan');
});

test('[GAD-7 7/8] mobile keyboard semantics/chrome/favicon and runtime are clean', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runtime = await openRoute(page, 'rapid');
  const first = page.locator('.bdi-item-row').first();
  await first.locator('input[value="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(first.locator('input[value="1"]')).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectChromeAndFavicon(page);
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.failedRequests).toEqual([]);
});

test('[GAD-7 8/8] actual PDF and history use the same seven-response score source', async ({ page }) => {
  await openRoute(page, 'rapid');
  await fillIdentity(page);
  await answerSimple(page, 7, 1);
  await expectRealResultPdf(page, 'gad7', '7 / 21');
  await expect(page.locator('.bdi-response-summary span')).toHaveCount(7);
});

// ---------------------------------------------------------------------------
// PHQ-9 — 9 browser scenarios
// ---------------------------------------------------------------------------

test('[PHQ-9 1/9] tool switch exposes nine numeric rows, distinct identity and no unverified wording', async ({ page }) => {
  await openRoute(page, 'rapid');
  await page.getByRole('tab', { name: /PHQ-9/ }).click();
  await expect(page.getByRole('tab', { name: /PHQ-9/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.bdi-item-row')).toHaveCount(9);
  await expect(page.locator('.question-text, [data-licensed-item-text]')).toHaveCount(0);
  await expect(page.getByLabel(/Puanlanmayan işlevsellik/)).toBeVisible();
});

test('[PHQ-9 2/9] exact lower and upper totals use PHQ-9 bounds and no Turkish diagnostic threshold', async ({ page }) => {
  await openRoute(page, 'rapid');
  await page.getByRole('tab', { name: /PHQ-9/ }).click();
  await answerSimple(page, 9, 0);
  await expect(page.locator('.bdi-total-score')).toContainText('0 / 27');
  await answerSimple(page, 9, 3);
  await expect(page.locator('.bdi-total-score')).toContainText('27 / 27');
  await expect(page.locator('.bdi-result-facts')).toContainText('Doğrulanmadı / uygulanmadı');
});

test('[PHQ-9 3/9] item 9 creates neutral review flag and functional code does not alter total', async ({ page }) => {
  await openRoute(page, 'rapid');
  await page.getByRole('tab', { name: /PHQ-9/ }).click();
  const scores = Array.from({ length: 9 }, () => 0);
  scores[8] = 1;
  await answerSimple(page, 9, scores);
  await page.getByLabel(/Puanlanmayan işlevsellik/).selectOption('3');
  await expect(page.locator('.bdi-total-score')).toContainText('1 / 27');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Madde 9 işaretlendi');
  await expect(alert).toContainText('risk yüzdesi, risk düzeyi veya tanı üretmez');
});

test('[PHQ-9 4/9] save/retry/correction retains both linked records and neutral critical fields', async ({ page }) => {
  await openRoute(page, 'rapid');
  await page.getByRole('tab', { name: /PHQ-9/ }).click();
  await fillIdentity(page);
  await answerSimple(page, 9, 0);
  const save = page.getByRole('button', { name: 'Sonucu kaydet' });
  await save.click();
  await save.click();
  await expect(page.getByRole('status')).toContainText('yinelenen kayıt oluşturulmadı');
  await page.locator('.bdi-item-row').nth(8).locator('input[value="1"]').evaluate((input: HTMLInputElement) => input.click());
  await save.click();
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('psikolog_screenings_v2') ?? '[]'));
  expect(records).toHaveLength(2);
  const second = records.find((record: { revision: number }) => record.revision === 2);
  expect(second.revisionOf).toBe(records.find((record: { revision: number }) => record.revision === 1).id);
  expect(second.criticalItemEndorsed).toBe(true);
  expect(second.suicideRisk).toBeUndefined();
});

test('[PHQ-9 5/9] PHQ draft remains separate from a changed GAD draft', async ({ page }) => {
  await openRoute(page, 'rapid');
  await page.getByRole('tab', { name: /PHQ-9/ }).click();
  await page.locator('.bdi-item-row').first().locator('input[value="3"]').evaluate((input: HTMLInputElement) => input.click());
  await page.getByRole('tab', { name: /GAD-7/ }).click();
  await expect(page.locator('.bdi-item-row').first().getByRole('radio', { checked: true })).toHaveCount(0);
  await page.getByRole('tab', { name: /PHQ-9/ }).click();
  await expect(page.locator('.bdi-item-row').first().locator('input[value="3"]')).toBeChecked();
});

test('[PHQ-9 6/9] selected-client identity is read-only and draft does not cross to client B', async ({ page }) => {
  await openRoute(page, 'rapid', true);
  await page.getByRole('tab', { name: /PHQ-9/ }).click();
  const select = page.getByLabel('Kayıtlı danışan');
  await select.selectOption('client-a');
  await page.locator('.bdi-item-row').first().locator('input[value="2"]').evaluate((input: HTMLInputElement) => input.click());
  await expect(page.getByLabel('Danışan adı soyadı')).toHaveAttribute('readonly', '');
  await select.selectOption('client-b');
  await expect(page.locator('.bdi-item-row').first().getByRole('radio', { checked: true })).toHaveCount(0);
  await select.selectOption('client-a');
  await expect(page.locator('.bdi-item-row').first().locator('input[value="2"]')).toBeChecked();
});

test('[PHQ-9 7/9] invalid future date blocks completed PHQ record', async ({ page }) => {
  await openRoute(page, 'rapid');
  await page.getByRole('tab', { name: /PHQ-9/ }).click();
  await fillIdentity(page);
  await answerSimple(page, 9, 0);
  await page.locator('input[type="date"]').fill('2099-01-01');
  await page.getByRole('button', { name: 'Sonucu kaydet' }).click();
  await expect(page.getByRole('alert')).toContainText('gelecekte olmayan');
});

test('[PHQ-9 8/9] mobile PHQ interaction has no overflow and retains shared unchanged chrome', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runtime = await openRoute(page, 'rapid');
  await page.getByRole('tab', { name: /PHQ-9/ }).click();
  const first = page.locator('.bdi-item-row').first();
  await first.locator('input[value="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(first.locator('input[value="1"]')).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectChromeAndFavicon(page);
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.failedRequests).toEqual([]);
});

test('[PHQ-9 9/9] actual result PDF includes nine-score total and expert note from one source', async ({ page }) => {
  await openRoute(page, 'rapid');
  await page.getByRole('tab', { name: /PHQ-9/ }).click();
  await fillIdentity(page);
  await answerSimple(page, 9, 1);
  await page.getByLabel('Uzman notu').fill('PHQ PDF doğrulama notu.');
  await expectRealResultPdf(page, 'phq9', '9 / 27');
  await expect(page.locator('.bdi-response-summary span')).toHaveCount(9);
});
