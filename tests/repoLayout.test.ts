import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import test from 'node:test';

/**
 * Kök teslim yüzeyi, kaynaklar ve tarihsel raporlar birbirine karışmasın.
 * Taşıma bu yolları kırarsa derleme, indirme veya denetim varlığı da kırılır.
 */

const ROOT_MARKDOWN = ['README.md', 'SYSTEM.md', 'TROUBLESHOOTING.md'];

const SOURCE_PDFS = [
  'docs/sources/mmpi-kitap.pdf',
  'docs/sources/mmpi-kaynak-1.pdf',
  'docs/sources/mmpi-kaynak-2.pdf',
  'docs/sources/mmpi-kaynak-2-ocr.pdf',
  'docs/sources/rapor-sablonu-1.pdf',
];

const REPORTS = [
  'docs/reports/KAPSAMLI_DEGERLENDIRME_2026-09-23.md',
  'docs/reports/SONUC_RAPORU_2026-09-23_A-J.md',
  'docs/reports/RESPONSIVE_AUDIT_PHASE_0.md',
];

test('kök yalnızca giriş ve teslim dosyalarını tutar', () => {
  const markdown = readdirSync('.').filter(name => name.endsWith('.md')).sort();
  assert.deepEqual(markdown, ROOT_MARKDOWN);
  assert.equal(existsSync('optik-form.html'), true);
  assert.equal(existsSync('MMPI-566-optik-cevap-formu.pdf'), true);
  assert.equal(existsSync('docs/yeni'), false);
  assert.equal(existsSync('docs/MMPI Kitap (1) (1).pdf'), false);
});

test('kaynak PDF’leri ve tarihsel raporlar kendi klasöründedir', () => {
  for (const path of [...SOURCE_PDFS, ...REPORTS, 'docs/README.md', 'docs/sources/README.md']) {
    assert.equal(existsSync(path), true, path);
  }
});
