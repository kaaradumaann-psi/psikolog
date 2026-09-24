import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ageFromBirthDate,
  isSafeDocumentUrl,
  isValidTc,
  nextFileNumber,
} from '../src/clinical/recordRules.ts';

test('yaş doğum tarihinden hesaplanır, gelecek tarih reddedilir', () => {
  assert.equal(ageFromBirthDate('1990-09-24', '2026-09-24'), 36);
  assert.equal(ageFromBirthDate('1990-09-25', '2026-09-24'), 35);
  assert.equal(ageFromBirthDate('2027-01-01', '2026-09-24'), null);
});

test('dosya numarası silinen kayıttan sonra çakışmaz', () => {
  assert.equal(nextFileNumber(['HK-2026-001', 'HK-2026-004'], '2026-09-24'), 'HK-2026-005');
});

test('kimlik numarası ya boştur ya 11 rakamdır', () => {
  assert.equal(isValidTc(''), true);
  assert.equal(isValidTc('12345678901'), true);
  assert.equal(isValidTc('123'), false);
});

test('belge bağlantısı yalnızca izinli veri adresidir', () => {
  assert.equal(isSafeDocumentUrl('data:application/pdf;base64,QQ=='), true);
  assert.equal(isSafeDocumentUrl('javascript:alert(1)'), false);
  assert.equal(isSafeDocumentUrl('data:text/html,<script>'), false);
});
