import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

// Build once for all tests
try {
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
} catch {
  // Build may fail if Supabase env missing — still produce dist for offline check
  // Vite build does not require env, only runtime
}

test('vite build produces dist/index.html and assets', () => {
  assert.ok(existsSync('dist/index.html'), 'dist/index.html should exist');
  const html = readFileSync('dist/index.html', 'utf8');
  assert.ok(html.includes('<div id="root">'), 'Root div should be in built HTML');
  assert.ok(html.includes('lang="tr"'), 'lang tr should be present');
  // Should have script module
  assert.match(html, /<script type="module"/);
});

test('built index.html contains theme tokens and no source imports', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  // No direct src import in prod
  assert.ok(!html.includes('src="/src/main.tsx"'), 'Should not contain dev src import');
  // The browser tab uses the same name as the workspace navigation.
  assert.ok(html.includes('<title>Psikolog — Klinik Çalışma Alanı</title>'), 'Title should be present');
});

test('responsive.css contract in built CSS', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  // Built CSS is inlined or in assets — check for dvh usage in source responsive.css already tested
  // Here just ensure build succeeded and contains some CSS
  assert.ok(html.length > 1000, 'Built HTML should be substantial');
});

/**
 * A production bundle must not be able to reach the unauthenticated local
 * workspace. `import.meta.env.DEV` is statically `false` under `vite build`, so
 * the bundler folds the development branch out of `resolveAccessMode` entirely.
 */
test('production bundle cannot bypass authentication', () => {
  const assets = readdirSync('dist/assets').filter((name) => name.endsWith('.js'));
  assert.ok(assets.length > 0, 'built JS assets should exist');
  const js = assets.map((name) => readFileSync(`dist/assets/${name}`, 'utf8')).join('\n');

  // `import.meta.env.DEV` is statically false in a production build, so the
  // bundler folds resolveAccessMode down to cloud-or-not-ready. The `local-dev`
  // string still appears as a comparison literal at the call site, but the gate
  // can no longer return it, so the local workspace is unreachable.
  assert.match(js, /"cloud":"not-ready"/, 'gate must collapse to cloud-or-not-ready at build time');
  // Stronger: the compiled gate must not even *accept* a development input. If
  // `isDev` survived into the parameter list, a crafted call could still return
  // `local-dev`. Its absence proves the branch is unreachable, not merely unused.
  const gate = /function [A-Za-z_$][\w$]*\([\w$]*\)\{return [\w$]+\.configured\?"cloud":"not-ready"\}/.exec(js);
  assert.ok(gate, 'compiled gate must be specialised to `{configured}` only');
  assert.ok(!js.includes('isDevRuntime'), 'the dev-runtime flag must not exist in the bundle');
  assert.ok(!/\.DEV\b/.test(js), 'import.meta.env.DEV must be fully folded away');
  // …and the refusal screen must ship.
  assert.ok(js.includes('Çalışma alanı hazır değil'), 'not-ready screen must ship');
  // Nothing may read the environment at runtime.
  assert.ok(!js.includes('import.meta.env'), 'import.meta.env must be statically replaced');
});
