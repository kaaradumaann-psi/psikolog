import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import test from 'node:test';

execFileSync(process.execPath, ['scripts/build.mjs']);

test('standalone build contains one intact inline script and no source-file imports', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  const scripts = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.ok(scripts[0]?.[1]);
  assert.doesNotThrow(() => new Script(scripts[0]![1]!));
  assert.ok(!html.includes('src="/src/main.tsx"'));
  assert.ok(html.includes('@page'));
  assert.ok(html.includes('lang="tr"'));
  // The screen-only site footer and the document metadata travel with the single-file build
  // (the class name lives both in the CSS and as the React className string).
  assert.ok(html.includes('site-footer'), 'Site alt bilgisi derlemeye girmemiş');
  assert.ok(html.includes('name="author" content="Halil Karaduman"'), 'Yazar meta etiketi derlemeye girmemiş');
  assert.ok(html.includes('https://www.halilkaraduman.com.tr'), 'Yazar sitesi bağlantısı derlemeye girmemiş');
  assert.ok(html.includes('mailto:'), 'E-posta bağlantısı şeması derlemeye girmemiş');
  assert.ok(html.includes('contact@halilkaraduman.com.tr'), 'E-posta adresi derlemeye girmemiş');
});

test('standalone build hides the screen footer from print while the sheet footer keeps the copyright', () => {
  let html = readFileSync('dist/index.html', 'utf8');
  // The print rule survives minification in the @media print rule list.
  assert.ok(/\.site-footer[^{]*\{[^}]*display:\s*none\s*!important/.test(html),
    'Site alt bilgisi yazdırmada gizlenmeli');
  // esbuild encodes (C) and the middle dot as hex escapes inside the runtime template;
  // decode them so the printable footer line can be matched as authored.
  html = html.replace(/\\x[Aa]9/g, '©').replace(/\\x[Bb]7/g, '·');
  // The printable sheet's own footer line (rendered on every page) and its parts.
  assert.ok(html.includes('© 2026'), 'Basılı formun telif satırı başlangıcı derlemeye girmemiş');
  assert.ok(html.includes('Halil Karaduman'), 'Telif sahibi derlemeye girmemiş');
  assert.ok(html.includes('www.halilkaraduman.com.tr'), 'Yazar sitesi telif satırında yok');
  assert.ok(html.includes('contact@halilkaraduman.com.tr'), 'E-posta telif satırında yok');
});

test('standalone build is offline and locked down by a script-hash CSP', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  // The deliverable must never call out to a CDN or font service at runtime.
  assert.ok(!html.includes('fonts.googleapis.com'));
  assert.ok(!html.includes('fonts.gstatic.com'));
  const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
  assert.ok(csp, 'CSP meta etiketi eksik');
  assert.ok(csp![1].includes("default-src 'none'"));
  assert.ok(csp![1].includes("font-src 'none'"));
  // The hash must match the exact script body in the document, otherwise the page would not run.
  const script = /<script type="module">([\s\S]*?)<\/script>/.exec(html)?.[1];
  assert.ok(script, 'Satır içi betik bulunamadı');
  const hash = createHash('sha256').update(script!).digest('base64');
  assert.ok(csp![1].includes(`script-src 'sha256-${hash}'`), 'CSP script hashi belgedeki betikle eslesmiyor');
  // B5: Supabase yapılandırılmamış build tamamen çevrimdışıdır (connect-src yok);
  // yapılandırılmışsa yalnızca o origin'e izin verilir (script bunu build'de üretir).
  const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? '').trim();
  if (supabaseUrl === '') {
    assert.ok(!csp![1].includes('connect-src'), 'Supabase yapılandırılmamışken connect-src olmamalı');
  } else {
    const origin = new URL(supabaseUrl).origin;
    assert.ok(csp![1].includes(`connect-src ${origin}`), 'CSP connect-src Supabase origin ile sınırlı olmalı');
  }
});

test('standalone build ships no catch-all _redirects rule (Workers code 100324)', () => {
  // Workers API'si `/*  /index.html  200` kuralını sonsuz döngü sayıp version
  // oluşturmayı reddeder (code 100324). SPA fallback'i `wrangler.jsonc`
  // içindeki assets.not_found_handling sağlar; kural yalnızca Pages/Netlify
  // için PAGES_REDIRECTS=1 ile üretilir.
  assert.equal(existsSync('dist/_redirects'), false,
    'dist/_redirects Workers yayınını code 100324 ile bozar; gerekiyorsa PAGES_REDIRECTS=1 kullanın');
});

test('standalone build writes HTTP security headers for the deployment', () => {
  // <meta> CSP frame-ancestors'ı uygulamaz; clickjacking/nosniff/referrer/
  // permissions/HSTS sertleştirmeleri yalnız HTTP başlığıyla gelir. Build,
  // Workers/Pages/Netlify'nin ortak anladığı dist/_headers dosyasını üretir.
  const lines = readFileSync('dist/_headers', 'utf8').trim().split('\n');
  assert.equal(lines[0], '/*', 'Başlıklar tüm rotalara uygulanmalı');
  const directives = lines.slice(1).map(line => line.trim());
  assert.ok(directives.includes('X-Content-Type-Options: nosniff'));
  assert.ok(directives.includes('X-Frame-Options: DENY'));
  assert.ok(directives.includes("Content-Security-Policy: frame-ancestors 'none'"),
    'Tıklama kaçırma koruması frame-ancestors ile başlıkta olmalı');
  assert.ok(directives.includes('Referrer-Policy: strict-origin-when-cross-origin'));
  assert.ok(directives.some(d => /^Strict-Transport-Security: max-age=\d+$/.test(d)));
  assert.ok(directives.some(d => d.startsWith('Permissions-Policy: camera=(self),')),
    'Kamera tarama özelliği için yalnız kendi origin\'de açık olmalı');
  assert.ok(directives.includes('Cross-Origin-Opener-Policy: same-origin'));
  assert.ok(directives.includes('Cross-Origin-Resource-Policy: same-origin'));
});

test('standalone build embeds the verified form PDF byte for byte', () => {
  // The site offers this file for download, so a drift between the committed PDF and the embedded
  // copy would hand out a form the reader was never verified against.
  const html = readFileSync('dist/index.html', 'utf8');
  const match = /data:application\/pdf;base64,([A-Za-z0-9+/=]+)/.exec(html);
  assert.ok(match, 'PDF veri URI olarak gomulmemis');
  const embedded = Buffer.from(match![1]!, 'base64');
  const committed = readFileSync('MMPI-566-optik-cevap-formu.pdf');
  assert.equal(embedded.subarray(0, 8).toString('latin1'), '%PDF-1.7');
  assert.equal(embedded.length, committed.length);
  assert.deepEqual(embedded, committed);
  assert.ok(html.includes('download-button'), 'indirme dugmesi derlemeye girmemis');
});
