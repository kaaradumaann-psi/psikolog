import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRoute } from '../src/router';

test('pathname router maps landing aliases to the clean home route', () => {
  for (const pathname of ['/', '/index.html', '/optik-form.html', '////', '/dashboard']) {
    assert.deepEqual(parseRoute(pathname), { page: 'home' });
  }
});

test('pathname router recognizes workspace and public information routes', () => {
  assert.deepEqual(parseRoute('/islem/'), { page: 'islem' });
  assert.deepEqual(parseRoute('/mmpi'), { page: 'islem' });
  assert.deepEqual(parseRoute('/form'), { page: 'form' });
  assert.deepEqual(parseRoute('/kayitlar'), { page: 'kayitlar' });
  assert.deepEqual(parseRoute('/danisanlar'), { page: 'danisanlar' });
  assert.deepEqual(parseRoute('/seanslar'), { page: 'seanslar' });
  assert.deepEqual(parseRoute('/takvim'), { page: 'takvim' });
  assert.deepEqual(parseRoute('/testler'), { page: 'testler' });
  assert.deepEqual(parseRoute('/testler/beck-depresyon'), { page: 'beck_depresyon' });
  assert.deepEqual(parseRoute('/testler/beck-anksiyete'), { page: 'beck_anksiyete' });
  assert.deepEqual(parseRoute('/testler/scl90'), { page: 'scl90' });
  assert.deepEqual(parseRoute('/raporlar'), { page: 'raporlar' });
  assert.deepEqual(parseRoute('/yonetim/'), { page: 'yonetim' });
  assert.deepEqual(parseRoute('/sss'), { page: 'sss' });
  assert.deepEqual(parseRoute('/gizlilik/'), { page: 'gizlilik' });
  assert.deepEqual(parseRoute('/kullanim'), { page: 'kullanim' });
  assert.deepEqual(parseRoute('/kaynaklar/'), { page: 'kaynaklar' });
  assert.deepEqual(parseRoute('/onizleme'), { page: 'onizleme' });
});

test('pathname router recognizes client dossier route', () => {
  assert.deepEqual(parseRoute('/danisanlar/cli_12345'), {
    page: 'danisan',
    id: 'cli_12345',
  });
});

test('pathname router preserves a record identifier and rejects extra path segments', () => {
  assert.deepEqual(parseRoute('/kayitlar/4f8c2c2e-7b5d-4c2a-9f3b-0f1a2b3c4d5e'), {
    page: 'kayit',
    id: '4f8c2c2e-7b5d-4c2a-9f3b-0f1a2b3c4d5e',
  });
  assert.deepEqual(parseRoute('/kayitlar/one/two'), { page: 'bulunamadi' });
  assert.deepEqual(parseRoute('/not-a-route'), { page: 'bulunamadi' });
});

test('report list and editor routes preserve existing record routes and reject extra segments', () => {
  assert.deepEqual(parseRoute('/kayitlar/one/raporlar'), { page: 'raporlar', id: 'one' });
  assert.deepEqual(parseRoute('/kayitlar/one/raporlar/two/'), { page: 'raporlar', id: 'one', reportId: 'two' });
  assert.deepEqual(parseRoute('/kayitlar/one/raporlar/two/extra'), { page: 'bulunamadi' });
  assert.deepEqual(parseRoute('/kayitlar/one/two'), { page: 'bulunamadi' });
});
