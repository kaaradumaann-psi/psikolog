import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRoute } from '../src/router.ts';

test('clinical router maps home aliases', () => {
  assert.deepEqual(parseRoute('/'), { page: 'home' });
  assert.deepEqual(parseRoute('/dashboard'), { page: 'home' });
  assert.deepEqual(parseRoute('/login'), { page: 'home' });
});

test('clinical router maps workspace pages', () => {
  assert.deepEqual(parseRoute('/danisanlar'), { page: 'danisanlar' });
  assert.deepEqual(parseRoute('/clients'), { page: 'danisanlar' });
  assert.deepEqual(parseRoute('/seanslar'), { page: 'seanslar' });
  assert.deepEqual(parseRoute('/testler/beck-depresyon'), { page: 'beck_depresyon' });
  assert.deepEqual(parseRoute('/testler/scl90'), { page: 'scl90' });
  assert.deepEqual(parseRoute('/gorevler'), { page: 'gorevler' });
  assert.deepEqual(parseRoute('/ayarlar'), { page: 'ayarlar' });
  assert.deepEqual(parseRoute('/denetim'), { page: 'denetim' });
});

test('retired instrument paths are not a workspace', () => {
  assert.equal(parseRoute('/mmpi').page, 'bulunamadi');
  assert.equal(parseRoute('/islem').page, 'bulunamadi');
  assert.equal(parseRoute('/form').page, 'bulunamadi');
  assert.equal(parseRoute('/optik-form.html').page, 'bulunamadi');
  assert.equal(parseRoute('/kayitlar').page, 'danisanlar');
});

test('client file route keeps the id', () => {
  assert.deepEqual(parseRoute('/danisanlar/cli_candan_01'), { page: 'danisan', id: 'cli_candan_01' });
});
