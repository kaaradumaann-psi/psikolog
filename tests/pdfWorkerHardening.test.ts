import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createSafePdfWorkerSource } from '../src/scanner/pdfIO';

const workerPath = fileURLToPath(new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url));
const workerSource = readFileSync(workerPath, 'utf8');

test('the bundled worker exposes every symbol the hardening patch references', () => {
  const requiredSymbols = [
    'class Parser', 'class DecodeStream',
    'makeFilter(', 'ensureBuffer(', 'minBufferLength',
  ];
  for (const symbol of requiredSymbols) {
    assert.ok(workerSource.includes(symbol), `pdf.worker.mjs no longer contains "${symbol}"`);
  }
});

test('the bundled pdf.js is exactly the audited version', () => {
  const require = createRequire(import.meta.url);
  const { version } = require('pdfjs-dist/package.json') as { version: string };
  assert.doesNotThrow(() => createSafePdfWorkerSource('// worker', version));
});

test('any other pdf.js version is refused instead of running unhardened', () => {
  assert.throws(() => createSafePdfWorkerSource('// worker', '9.9.9'), /sürüm/);
});

test('the worker patch allows JPEG/CCITT image filters and still blocks JPX/JBIG2', () => {
  const require = createRequire(import.meta.url);
  const { version } = require('pdfjs-dist/package.json') as { version: string };
  const patched = createSafePdfWorkerSource('// worker', version);
  assert.match(patched, /DCTDecode/);
  assert.match(patched, /CCITTFaxDecode/);
  assert.match(patched, /JPXDecode/);
  assert.match(patched, /JBIG2Decode/);
  assert.doesNotMatch(patched, /Gömülü görüntü içeren PDF güvenli biçimde desteklenmiyor/);
});
