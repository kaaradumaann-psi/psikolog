import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

/**
 * `npm run dev` (no `.env` present) must still open the workspace directly —
 * that is the contract `e2e/critical.spec.ts` asserts in a real browser. This
 * runs the same assertion through the real `App` under a dev-mode Vite server,
 * where `import.meta.env.DEV` is statically `true`, so the `local-dev` branch of
 * the access gate is genuinely exercised.
 */
test('geliştirme sunucusunda Supabase olmadan çalışma alanı doğrudan açılır', async () => {
  const storage = new Map<string, string>();
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  const previousSession = globalThis.sessionStorage;
  Object.assign(globalThis, {
    window: Object.assign(Object.create(globalThis), {
      location: { pathname: '/', search: '', hash: '' },
      addEventListener: () => {},
      removeEventListener: () => {},
      matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    }),
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
      clear: () => storage.clear(),
    },
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
      clear: () => storage.clear(),
    },
  });

  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { supabaseConfig, isDevRuntime } = await vite.ssrLoadModule('/src/auth/supabaseClient.ts');
    assert.equal(isDevRuntime, true, 'dev sunucusunda import.meta.env.DEV true olmalı');
    assert.equal(supabaseConfig.configured, false, 'bu depoda .env yok, Supabase yapılandırılmamış sayılmalı');

    const appModule = await vite.ssrLoadModule('/src/App.tsx');
    const App = appModule.default;
    const html = renderToString(createElement(App, null));

    // local-dev: workspace opens, no login gate.
    assert.match(html, /Bugünün tahtası/);
    assert.doesNotMatch(html, /Çalışma alanı hazır değil/);
    assert.doesNotMatch(html, /Hoş geldiniz/);
    // Public registration stays closed.
    assert.doesNotMatch(html, /Kayıt Ol/);
  } finally {
    await vite.close();
    Object.assign(globalThis, {
      window: previousWindow,
      localStorage: previousStorage,
      sessionStorage: previousSession,
    });
  }
});
