/**
 * BDI uçtan uca denetim senaryoları (13).
 * Yalnız çevrimdışı çalışma alanında koşar; yetkili madde metni beklemez veya üretmez.
 */
import { test, expect, type Page } from '@playwright/test';

const cloudEnv = Boolean(
  process.env.VITE_SUPABASE_URL?.trim() && process.env.VITE_SUPABASE_ANON_KEY?.trim(),
);

test.skip(cloudEnv, 'BDI yerel iş akışı senaryoları Supabase ortam değişkenleri olmadan koşar.');

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

async function openBdi(page: Page, withClients = false) {
  await page.addInitScript(({ clients }) => {
    localStorage.clear();
    sessionStorage.clear();
    if (clients.length) localStorage.setItem('psikolog_clients_v2', JSON.stringify(clients));
  }, { clients: withClients ? CLIENTS : [] });
  await page.goto('/testler/beck-depresyon');
  await expect(page.getByRole('heading', { name: 'Depresyon değerlendirme uygulaması' })).toBeVisible();
}

async function fillManualIdentity(page: Page) {
  await page.getByLabel('Danışan adı soyadı').fill('Test Danışan');
  await page.getByLabel('Kayıt modelindeki cinsiyet').selectOption('KADIN');
}

async function answerAll(page: Page, scores: number | number[]) {
  const values = Array.isArray(scores) ? scores : Array.from({ length: 21 }, () => scores);
  for (let index = 0; index < 21; index += 1) {
    await page.locator('.bdi-item-row').nth(index).getByRole('radio', { name: `${values[index]} Puan` }).check();
  }
}

async function setTotal(page: Page, total: number) {
  const scores = Array.from({ length: 21 }, () => 0);
  let remainder = total;
  for (let index = 0; index < scores.length && remainder > 0; index += 1) {
    scores[index] = Math.min(3, remainder);
    remainder -= scores[index]!;
  }
  await answerAll(page, scores);
}

test('1 — kimlik ve hak bildirimi özgün BDI/Hisli bağlamını gösterir, BDI-II iddiası yapmaz', async ({ page }) => {
  await openBdi(page);
  await expect(page.getByText('BDI · HİSLİ TÜRKÇE FORMU · BDI-II DEĞİLDİR')).toBeVisible();
  await expect(page.getByText(/yetkili Türkçe madde metnini içermediğinden/)).toBeVisible();
  await expect(page.locator('.bdi-item-row')).toHaveCount(21);
  await expect(page.locator('.bdi-item-row .question-text, .bdi-item-row [data-licensed-item-text]')).toHaveCount(0);
});

test('2 — boş form sonuç üretmez, boşları sıfır saymaz ve kaydı kapalı tutar', async ({ page }) => {
  await openBdi(page);
  await expect(page.getByText('Henüz klinik sonuç üretilmedi')).toBeVisible();
  await expect(page.getByText(/0 madde tamamlandı/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sonucu kaydet' })).toBeDisabled();
  await expect(page.getByText('BDI toplam puanı')).toHaveCount(0);
});

test('3 — 21 sıfır yanıt yalnız tamamlandıktan sonra 0/63 üretir', async ({ page }) => {
  await openBdi(page);
  await answerAll(page, 0);
  await expect(page.getByText('21 / 21')).toBeVisible();
  await expect(page.locator('.bdi-total-score')).toContainText('0 / 63');
  await expect(page.locator('.bdi-total-score')).toContainText('Tarama eşiğinin altında');
});

test('4 — 16 puan eşik altı olarak kalır', async ({ page }) => {
  await openBdi(page);
  await setTotal(page, 16);
  await expect(page.locator('.bdi-total-score')).toContainText('16 / 63');
  await expect(page.locator('.bdi-total-score')).toContainText('Tarama eşiğinin altında');
});

test('5 — 17 puan yalnız tarama referansına ulaşıldığını söyler, tanı üretmez', async ({ page }) => {
  await openBdi(page);
  await setTotal(page, 17);
  await expect(page.locator('.bdi-total-score')).toContainText('17 / 63');
  await expect(page.locator('.bdi-total-score')).toContainText('Tarama eşiğinde veya üzerinde');
  await expect(page.locator('.bdi-result-content')).not.toContainText(/orta depresyon|tanı konmuştur/i);
});

test('6 — tüm maddeler 3 olduğunda üst sınır tam 63/63 olur', async ({ page }) => {
  await openBdi(page);
  await answerAll(page, 3);
  await expect(page.locator('.bdi-total-score')).toContainText('63 / 63');
});

test('7 — madde 9 işaretlemesi nötr klinik değerlendirme uyarısıdır', async ({ page }) => {
  await openBdi(page);
  const scores = Array.from({ length: 21 }, () => 0);
  scores[8] = 1;
  await answerAll(page, scores);
  const notice = page.getByRole('alert').filter({ hasText: 'Kritik madde işaretlendi' });
  await expect(notice).toContainText('klinik değerlendirme gerektirebilir');
  await expect(notice).toContainText('risk yüzdesi, risk düzeyi veya tanı üretmez');
});

test('8 — gerçek radio semantiği klavye ile işler ve dar ekranda yatay taşma yapmaz', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBdi(page);
  const first = page.locator('.bdi-item-row').first();
  const zero = first.getByRole('radio', { name: '0 Puan' });
  await zero.focus();
  await page.keyboard.press('ArrowRight');
  await expect(first.getByRole('radio', { name: '1 Puan' })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('9 — danışan A ve B taslakları birbirine taşınmaz ve A taslağı kendi uygulama kimliğiyle geri gelir', async ({ page }) => {
  await openBdi(page, true);
  const clientSelect = page.getByLabel('Kayıtlı danışan');
  await clientSelect.selectOption('client-a');
  await page.locator('.bdi-item-row').first().getByRole('radio', { name: '2 Puan' }).check();
  await page.waitForTimeout(350);
  await clientSelect.selectOption('client-b');
  await expect(page.getByLabel('Danışan adı soyadı')).toHaveValue('Mehmet Kaya');
  await expect(page.locator('.bdi-item-row').first().getByRole('radio', { checked: true })).toHaveCount(0);
  await clientSelect.selectOption('client-a');
  await expect(page.getByLabel('Danışan adı soyadı')).toHaveValue('Ayşe Yılmaz');
  await expect(page.locator('.bdi-item-row').first().getByRole('radio', { name: '2 Puan' })).toBeChecked();
});

test('10 — kayıtlı ve manuel kimlik alanları çatışmaz; kayıtlı demografi dosyadan gelir', async ({ page }) => {
  await openBdi(page, true);
  await fillManualIdentity(page);
  await page.getByLabel('Kayıtlı danışan').selectOption('client-a');
  await expect(page.getByLabel('Danışan adı soyadı')).toHaveValue('Ayşe Yılmaz');
  await expect(page.getByLabel('Danışan adı soyadı')).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('Kayıt modelindeki cinsiyet')).toBeDisabled();
  await page.getByLabel('Kayıtlı danışan').selectOption('');
  await expect(page.getByLabel('Danışan adı soyadı')).toHaveValue('Test Danışan');
});

test('11 — imkânsız/gelecek uygulama tarihi kaydı engeller ve tarih kaydırılmaz', async ({ page }) => {
  await openBdi(page);
  await fillManualIdentity(page);
  await answerAll(page, 0);
  const administrationDate = page.locator('input[type="date"]');
  await administrationDate.fill('2099-01-01');
  await page.getByRole('button', { name: 'Sonucu kaydet' }).click();
  await expect(page.getByRole('alert')).toContainText('gelecekte olmamalıdır');
  await expect(administrationDate).toHaveValue('2099-01-01');
});

test('12 — aynı kayıt yinelenmez; değişiklik ayrı ve bağlı revizyon olarak saklanır', async ({ page }) => {
  await openBdi(page);
  await fillManualIdentity(page);
  await answerAll(page, 0);
  const save = page.getByRole('button', { name: 'Sonucu kaydet' });
  await save.click();
  await save.click();
  await expect(page.getByRole('status')).toContainText('yinelenen kayıt oluşturulmadı');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('psikolog_bdi_tests_v2') ?? '[]').length)).toBe(1);
  await page.locator('.bdi-item-row').first().getByRole('radio', { name: '1 Puan' }).check();
  await save.click();
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('psikolog_bdi_tests_v2') ?? '[]'));
  expect(records).toHaveLength(2);
  const revisionOne = records.find((record: { revision?: number }) => record.revision === 1);
  const revisionTwo = records.find((record: { revision?: number }) => record.revision === 2);
  expect(revisionOne).toBeTruthy();
  expect(revisionTwo.revisionOf).toBe(revisionOne.id);
  expect(revisionTwo.id).not.toBe(revisionOne.id);
});

test('13 — sonuç PDF aynı sonuç nesnesindeki kimlik, toplam, 21 yanıt ve uzman notunu kullanır', async ({ page }) => {
  await openBdi(page);
  await fillManualIdentity(page);
  await answerAll(page, 1);
  await page.getByLabel('Uzman notu').fill('Klinik görüşmede ayrıca değerlendirildi.');
  await page.evaluate(() => {
    (window as Window & { __printCapture?: string }).__printCapture = '';
    window.print = () => {
      const root = document.documentElement;
      const result = document.querySelector('.bdi-result-section')?.textContent ?? '';
      const header = document.querySelector('.assessment-result-print-header')?.textContent ?? '';
      (window as Window & { __printCapture?: string }).__printCapture = `${root.dataset.assessmentPrint}|${header}|${result}`;
    };
  });
  await page.getByRole('button', { name: 'Sonuç özeti / PDF' }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __printCapture?: string }).__printCapture ?? '')).not.toBe('');
  const capture = await page.evaluate(() => (window as Window & { __printCapture?: string }).__printCapture ?? '');
  expect(capture).toContain('result');
  expect(capture).toContain('Test Danışan');
  expect(capture).toContain('BDI-original-1961-TR-Hisli-1988/1989');
  expect(capture).toContain('21 / 63');
  expect(capture).toContain('Klinik görüşmede ayrıca değerlendirildi.');
  await expect(page.locator('.bdi-response-summary span')).toHaveCount(21);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.assessment-result-print-header')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sonucu kaydet' })).toBeHidden();
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.byteLength).toBeGreaterThan(8_000);
});
