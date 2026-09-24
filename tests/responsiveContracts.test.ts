import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * Responsive sözleşme testleri — MMPI pattern
 * 1. viewport meta cihaz genişliği ve çentik güvenli alanı
 * 2. responsive.css son sırada ve !important / @media print içermez
 * 3. 100vh yerine dvh
 * 4. Mobilde (≤760px) input ≥16px iOS zoom engel
 * 5. Kompakt kontroller ≥44px dokunma hedefi
 */

const INDEX_HTML = 'index.html';
const RESPONSIVE = 'src/styles/responsive.css';
const MAIN_TSX = 'src/main.tsx';

test('index.html has viewport meta with device-width and viewport-fit', () => {
  const html = readFileSync(INDEX_HTML, 'utf8');
  assert.match(html, /name="viewport"/);
  assert.match(html, /width=device-width/);
  assert.match(html, /viewport-fit=cover/);
});

test('responsive.css is last in main.tsx import order', () => {
  const main = readFileSync(MAIN_TSX, 'utf8');
  const imports = [...main.matchAll(/import\s+['"]\.\/styles\/([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(imports.length >= 2, 'Expected style imports');
  assert.equal(imports[imports.length - 1], 'responsive.css', 'responsive.css should be last');
});

test('responsive.css contains no !important and no @media print', () => {
  const css = readFileSync(RESPONSIVE, 'utf8');
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(css, /@media\s+print/);
});

test('responsive.css uses dvh not 100vh for full-height', () => {
  const css = readFileSync(RESPONSIVE, 'utf8');
  assert.match(css, /100dvh/);
  assert.ok(css.includes('dvh'));
});

test('mobile inputs are ≥16px to prevent iOS zoom', () => {
  const css = readFileSync(RESPONSIVE, 'utf8');
  // Check that inside @media max-width 760px there is font-size 16px for input/textarea/select
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  // Simple check: css contains "font-size: 16px" and appears after 760px media
  const idxMedia = css.indexOf('@media (max-width: 760px)');
  const idxFont = css.indexOf('font-size: 16px', idxMedia);
  assert.ok(idxMedia >= 0 && idxFont > idxMedia, 'Expected font-size 16px inside 760px media');
  assert.ok(css.includes('input,') && css.includes('textarea,') && css.includes('select'), 'Should target input/textarea/select');
});

test('compact controls have ≥44px touch target on mobile', () => {
  const css = readFileSync(RESPONSIVE, 'utf8');
  assert.match(css, /@media\s*\(max-width:\s*720px\)/);
  const idxMedia = css.indexOf('@media (max-width: 720px)');
  const idxMinHeight = css.indexOf('min-height: 44px', idxMedia);
  assert.ok(idxMedia >= 0 && idxMinHeight > idxMedia, 'Expected min-height 44px inside 720px media');
});
