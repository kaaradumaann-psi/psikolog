import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';

/**
 * Marka sözleşmesi.
 *
 * İşaret tek bir geometriden ve **tek renkten** gelir: danışan figürü
 * (baş + omuz) koyu zemin üzerinde açık tonda çizilir. İç çekirdek/vurgu
 * noktası kaldırılmıştır. Bu test, işaretin kaynak dosyadan kopyalanıp
 * dağılmasını, çekirdeğin geri gelmesini ve favicon'un tasarım paletinden
 * kopmasını engeller.
 */

const FAVICON = 'public/favicon.svg';
const BRAND_MARK = 'src/components/BrandMark.tsx';
const INDEX_HTML = 'index.html';

/** Palet: screen.css :root ile aynı olmalı. */
const INK = '#0d0d0d';
const PAPER = '#f6f6f4';
/** Markada kullanılmaması gereken vurgu rengi. */
const ACCENT = '#0a84ff';

const MARK_FILES = [
  'src/App.tsx',
  'src/components/InfoPageShell.tsx',
  'src/components/SiteFooter.tsx',
  'src/components/BrandMark.tsx',
];

test('favicon tek renkli danışan figürüdür', () => {
  const svg = readFileSync(FAVICON, 'utf8');
  // Baş ve omuz gövdeleri iki dolgu yolu; üçüncüsü zemin çizgisi.
  assert.equal((svg.match(/<path/g) ?? []).length, 3, 'iki figür yolu + zemin çizgisi');
  assert.ok(svg.includes(`fill="${PAPER}"`), 'figür palet rengiyle çizilmeli');
  assert.ok(svg.includes(`fill="${INK}"`), 'zemin mürekkep renginde olmalı');
  // viewBox kare olmalı: tarayıcı sekmesi simgeyi kare çerçevede kırpar.
  assert.match(svg, /viewBox="0 0 32 32"/);
});

test('markada vurgu çekirdeği yoktur', () => {
  const svg = readFileSync(FAVICON, 'utf8').toLowerCase();
  assert.ok(!svg.includes(ACCENT), `favicon içinde vurgu rengi kaldı: ${ACCENT}`);
  // Çekirdek bir daireydi; figür yalnızca yol ve zemin çizgisinden oluşur.
  assert.ok(!svg.includes('<circle'), 'favicon yalnızca figür yolları içermeli');
  assert.ok(!svg.includes('r="2.05"'), 'eski iç çekirdek yarıçapı kaldı');

  for (const file of ['public/logo-full.svg', BRAND_MARK]) {
    const text = readFileSync(file, 'utf8').toLowerCase();
    assert.ok(!text.includes(ACCENT), `${file} içinde vurgu rengi kaldı`);
    assert.ok(!text.includes('<circle'), `${file} içinde daire kaldı`);
  }
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
  // İşaret dışarıdan renk almaz; vurgu rengi ve boyuta bağlı sadeleştirme yok.
  assert.match(mark, /currentColor/);
  assert.doesNotMatch(mark, /--primary/, 'işaret tek renkli olmalı, marka vurgusu kullanmamalı');
  assert.doesNotMatch(mark, /\bsimplified\b/, 'çekirdek kalktığı için sadeleştirme seçeneği gereksiz');

  // Eski "HK" monogramının tarama köşeleri hiçbir bileşende kalmamalı.
  const legacy = 'M9 3H3v6M17 3h6v6M23 17v6h-6M9 23H3v-6';
  for (const file of MARK_FILES) {
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
    'public/apple-touch-icon.svg',
    'public/logo-mark.png',
    'public/logo-full.png',
    'public/logo-full.svg',
  ]) {
    assert.ok(existsSync(file), `eksik marka dosyası: ${file}`);
  }
});
