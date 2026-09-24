import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';

/**
 * Marka sözleşmesi.
 *
 * İşaret tek bir geometriden gelir: danışan figürü (baş + omuz) ve iç dünyayı
 * temsil eden tek vurgu çekirdeği. Bu test, işaretin kaynak dosyadan
 * kopyalanıp dağılmasını ve favicon'un tasarım paletinden kopmasını engeller.
 */

const FAVICON = 'public/favicon.svg';
const BRAND_MARK = 'src/components/BrandMark.tsx';
const INDEX_HTML = 'index.html';

/** Palet: screen.css :root ile aynı olmalı. */
const INK = '#0d0d0d';
const PAPER = '#f6f6f4';
const ACCENT = '#0a84ff';

test('favicon danışan figürünü ve tek vurgu rengini taşır', () => {
  const svg = readFileSync(FAVICON, 'utf8');
  // Baş ve omuz gövdeleri ayrı iki dolgu yoludur.
  assert.equal((svg.match(/<path/g) ?? []).length, 3, 'iki figür yolu + zemin çizgisi');
  assert.ok(svg.includes(`fill="${PAPER}"`), 'figür palet rengiyle çizilmeli');
  assert.equal(
    (svg.match(new RegExp(`fill="${ACCENT}"`, 'g')) ?? []).length,
    1,
    'tek vurgu rengi yalnızca iç çekirdekte kullanılmalı',
  );
  assert.ok(svg.includes(`fill="${INK}"`), 'zemin mürekkep renginde olmalı');
  // viewBox kare olmalı: tarayıcı sekmesi simgeyi kare çerçevede kırpar.
  assert.match(svg, /viewBox="0 0 32 32"/);
});

test('favicon eski yeşil paletten arınmıştır', () => {
  const svg = readFileSync(FAVICON, 'utf8').toLowerCase();
  for (const stale of ['#205c48', '#f1f7f0', '#1a3028', '#66796e', '#f5f7f3']) {
    assert.ok(!svg.includes(stale), `eski palet rengi kaldı: ${stale}`);
  }
});

test('marka işareti tek kaynaktan gelir, sayfalara kopyalanmaz', () => {
  assert.ok(existsSync(BRAND_MARK), 'BrandMark bileşeni bulunmalı');
  const mark = readFileSync(BRAND_MARK, 'utf8');
  assert.match(mark, /viewBox="0 0 32 32"/);
  assert.match(mark, /currentColor/);
  assert.match(mark, /--primary/);

  // Eski "HK" monogramının tarama köşeleri hiçbir bileşende kalmamalı.
  const legacy = 'M9 3H3v6M17 3h6v6M23 17v6h-6M9 23H3v-6';
  for (const file of [
    'src/App.tsx',
    'src/components/InfoPageShell.tsx',
    'src/components/SiteFooter.tsx',
    'src/components/BrandMark.tsx',
  ]) {
    assert.ok(!readFileSync(file, 'utf8').includes(legacy), `eski işaret kaldı: ${file}`);
  }

  // Bileşenler işareti ortak kaynaktan içe aktarmalı.
  for (const file of ['src/App.tsx', 'src/components/InfoPageShell.tsx', 'src/components/SiteFooter.tsx']) {
    assert.match(readFileSync(file, 'utf8'), /from '\.(\/components)?\/BrandMark'/, `${file} BrandMark kullanmalı`);
  }
});

test('index.html simge bağlantıları ve tema rengi tasarımla uyumlu', () => {
  const html = readFileSync(INDEX_HTML, 'utf8');
  assert.match(html, /rel="icon"[^>]*href="\/favicon\.svg"/);
  assert.match(html, /rel="apple-touch-icon"[^>]*href="\/apple-touch-icon\.png"/);
  // theme-color, uygulamanın gerçek zemin rengiyle aynı olmalı (eski yeşil tint değil).
  assert.match(html, /name="theme-color" content="#ffffff"/);
});

test('marka dosyaları yayınlanan public dizininde tamdır', () => {
  for (const file of [
    'public/favicon.svg',
    'public/apple-touch-icon.png',
    'public/logo-mark.png',
    'public/logo-full.png',
    'public/logo-full.svg',
  ]) {
    assert.ok(existsSync(file), `eksik marka dosyası: ${file}`);
  }
});
