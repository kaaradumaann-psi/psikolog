import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * `wrangler deploy` bu depoda Vite ile derleme yapmaz; `dist/` klasörünü statik
 * varlık olarak yayınlar. Yapılandırma dosyası silinirse wrangler Vite
 * otomatik kurulumuna girer (`@cloudflare/vite-plugin` eklemek ister),
 * `vite.config.ts`'te `plugins` dizisi bulamaz ve deploy
 * "Cannot modify Vite config: could not find a valid plugins array" hatasıyla
 * durur. Bu testler o dosyanın ve yayın komutunun yerinde kalmasını sağlar.
 *
 * Ayrıca `dist/_redirects` içindeki catch-all kural Workers API'si tarafından
 * code 100324 ile reddedilir; SPA fallback'i assets.not_found_handling sağlar
 * ve routes/workers_dev ayarları paneldeki production durumunu yansıtmalıdır
 * (aksi halde deploy uzak yapılandırmayı custom domain aleyhine ezer).
 */

/** wrangler.jsonc yorum içerebilir (JSONC): dizge dışındaki yorumları at. */
function stripJsonComments(source: string): string {
  let out = '';
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    const next = source[index + 1];
    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        out += char;
      }
      continue;
    }
    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }
    if (inString) {
      out += char;
      if (char === '\\') {
        out += next ?? '';
        index += 1;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }
    if (char === '/' && next === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }
    out += char;
  }
  // JSONC sondaki virgüllere izin verir; JSON.parse vermez.
  return out.replace(/,(\s*[}\]])/g, '$1');
}

const config = JSON.parse(stripJsonComments(readFileSync('wrangler.jsonc', 'utf8'))) as {
  name?: string;
  main?: string;
  compatibility_date?: string;
  workers_dev?: boolean;
  preview_urls?: boolean;
  observability?: { enabled?: boolean };
  routes?: { pattern?: string; custom_domain?: boolean }[];
  assets?: { directory?: string; not_found_handling?: string };
};

test('wrangler.jsonc statik varlık yayınına ayarlı ve depoda duruyor', () => {
  assert.equal(config.name, 'mmpi', 'Worker adı Cloudflare proje adıyla aynı olmalı');
  assert.equal(config.assets?.directory, './dist', 'Yayınlanan klasör dist/ olmalı');
  assert.equal(config.assets?.not_found_handling, 'single-page-application',
    'History API router için SPA fallback gerekir');
  assert.equal(config.main, undefined, 'Statik varlık yayınında Worker giriş noktası olmamalı');
  assert.match(config.compatibility_date ?? '', /^\d{4}-\d{2}-\d{2}$/);
});

test('wrangler.jsonc production domain ve workers_dev durumunu yansıtıyor', () => {
  // Bu ayarlar eksikse `wrangler deploy` uzak yapılandırmayı yerel dosyayla
  // ezer: workers.dev adresi açılır ve custom domain düşer.
  const customDomains = (config.routes ?? []).filter(route => route.custom_domain === true);
  assert.deepEqual(customDomains.map(route => route.pattern), ['mmpi.halilkaraduman.com.tr'],
    'Custom domain yapılandırmada açıkça tanımlı olmalı');
  assert.equal(config.workers_dev, false, 'workers.dev adresi production durumuna uygun kapatılmalı');
  assert.equal(config.preview_urls, false, 'preview URL durumu production ile aynı olmalı');
});

test('build, catch-all _redirects kuralını yalnızca opt-in olarak üretiyor', () => {
  // Kural koşulsuz yazılırsa Workers yayını code 100324 ile durur; bu yüzden
  // hem PAGES_REDIRECTS kapısı hem de eski dosyayı temizleme adımı olmalı.
  // (Derleme sonrası dosyanın yokluğu tests/build.test.ts içinde doğrulanır.)
  const buildScript = readFileSync('scripts/build.mjs', 'utf8');
  assert.match(buildScript, /PAGES_REDIRECTS\s*===\s*'1'/, 'Pages/Netlify kuralı yalnızca opt-in olmalı');
  assert.match(buildScript, /rm\(redirects,\s*\{\s*force:\s*true\s*\}\)/,
    'Önceki derlemeden kalan dist/_redirects temizlenmeli');
  assert.match(buildScript, /not_found_handling|single-page-application|wrangler\.jsonc/i,
    'SPA fallback kaynağı (wrangler.jsonc) build betiğinde anılmalı');
});

test('deploy komutu önce derler, sonra wrangler ile yayınlar', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const deploy = pkg.scripts?.deploy ?? '';
  assert.match(deploy, /npm run build/, 'deploy öncesi tek dosya derlemesi çalışmalı');
  assert.match(deploy, /wrangler deploy/, 'deploy wrangler ile yayınlamalı');
});
