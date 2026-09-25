import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

/**
 * §17 — the client-side audit trail lives in browser storage and is therefore
 * user-modifiable. It must never be presented as an authoritative log. The
 * authoritative log is the append-only server-side `audit_logs` table, and the
 * page has to say so out loud.
 */
test('denetim sayfası yerel kaydın değiştirilebilir olduğunu açıkça söyler', async () => {
  const storage = new Map<string, string>();
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  Object.assign(globalThis, {
    window: Object.assign(Object.create(globalThis), {
      location: { pathname: '/denetim', search: '', hash: '' },
      addEventListener: () => {},
      removeEventListener: () => {},
      encodeURIComponent,
    }),
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
    },
  });

  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { AuditPage } = await vite.ssrLoadModule('/src/components/practice/AuditPage.tsx');
    const html = renderToString(createElement(AuditPage, null));

    assert.match(html, /warning-banner/, 'uyarı kutusu render edilmeli');
    assert.match(html, /cihazda değiştirilebilir/);
    assert.match(html, /audit_logs/);
    assert.match(html, /hukuki bir\s*kanıt olarak kullanılamaz/);
    assert.ok(!/GDPR|HIPAA|uyumludur/.test(html), 'uygunluk iddiası eklenmemeli');
  } finally {
    await vite.close();
    Object.assign(globalThis, { window: previousWindow, localStorage: previousStorage });
  }
});
