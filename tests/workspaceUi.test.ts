import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

test('workspace navigation and empty states render on the main routes', async () => {
  // Load through Vite so CSS imports are handled exactly as in the application.
  const storage = new Map<string, string>();
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  Object.assign(globalThis, {
    window: { location: { pathname: '/', search: '', hash: '' } },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    },
  });

  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { default: App } = await vite.ssrLoadModule('/src/App.tsx');
    const render = (path: string) => {
      window.location.pathname = path;
      return renderToString(createElement(App));
    };
    const home = render('/');
    assert.match(home, /Bugünün tahtası/);
    assert.match(home, /Çalışma alanı gezinmesi/);
    assert.match(home, /Her şey bir dosyayla başlar/);
    assert.match(home, /Henüz kayıtlı danışan yok/);
    assert.match(home, /href="\/danisanlar"/);
    assert.match(home, /href="\/takvim"/);
    assert.match(home, /aria-current="page"/);

    const clients = render('/danisanlar');
    assert.match(clients, /Danışan Dosyaları/);
    assert.match(clients, /Henüz danışan dosyası yok/);
    assert.match(clients, /Yeni danışan ekle/);

    const appointments = render('/takvim');
    assert.match(appointments, /Takvim henüz boş/);
    assert.match(appointments, /Önce danışan ekle/);

    const assessments = render('/testler');
    assert.match(assessments, /Psikolojik Değerlendirme Araçları/);
    assert.match(assessments, /Beck Depresyon testini başlat/);
    assert.match(assessments, /Henüz değerlendirme kaydı yok/);
    assert.match(assessments, /Puanlar tarama amaçlıdır/);

    const tasks = render('/gorevler');
    assert.match(tasks, /Henüz görev yok/);
    assert.match(tasks, /Görev ekle/);
  } finally {
    await vite.close();
    Object.assign(globalThis, { window: previousWindow, localStorage: previousStorage });
  }
});
