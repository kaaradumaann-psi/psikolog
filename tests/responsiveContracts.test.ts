import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const INDEX_HTML = 'index.html';
const RESPONSIVE = 'src/styles/responsive.css';
const MAIN_TSX = 'src/main.tsx';

function cssWithoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

test('index.html has viewport meta with device-width and viewport-fit', () => {
  const html = readFileSync(INDEX_HTML, 'utf8');
  assert.match(html, /name="viewport"/);
  assert.match(html, /width=device-width/);
  assert.match(html, /viewport-fit=cover/);
});

test('responsive.css is last in main.tsx import order', () => {
  const main = readFileSync(MAIN_TSX, 'utf8');
  const imports = [...main.matchAll(/import\s+['"]\.\/styles\/([^'"]+)['"]/g)].map((match) => match[1]);
  assert.ok(imports.length >= 2);
  assert.equal(imports[imports.length - 1], 'responsive.css');
});

test('responsive.css rules contain no !important and no print media', () => {
  const css = cssWithoutComments(readFileSync(RESPONSIVE, 'utf8'));
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(css, /@media\s+print/);
});

test('responsive.css uses dvh for full-height', () => {
  const css = readFileSync(RESPONSIVE, 'utf8');
  assert.match(css, /100dvh/);
});

test('mobile inputs are at least 16px', () => {
  const css = readFileSync(RESPONSIVE, 'utf8');
  assert.match(css, /max-width:\s*720px/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /input,/);
});

test('compact controls have a 44px touch target', () => {
  const css = readFileSync(RESPONSIVE, 'utf8');
  assert.match(css, /min-height:\s*44px/);
});
