import assert from 'node:assert/strict';
import test from 'node:test';
import { sniffBytes } from '../src/scanner/imageIO';

test('sniffBytes accepts JPEG, PNG, WEBP, AVIF, HEIC and PDF signatures', () => {
  assert.deepEqual(sniffBytes(Uint8Array.of(0xff, 0xd8, 0xff, 0xe0)), { kind: 'image', codec: 'jpeg' });
  const png = new Uint8Array(8);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual(sniffBytes(png), { kind: 'image', codec: 'png' });
  const webp = new Uint8Array(12);
  webp.set(Buffer.from('RIFF....WEBP'));
  assert.deepEqual(sniffBytes(webp), { kind: 'image', codec: 'webp' });
  const heic = new Uint8Array(16);
  heic.set(Buffer.from('....ftypheic', 'latin1'));
  assert.deepEqual(sniffBytes(heic), { kind: 'image', codec: 'heic' });
  const avif = new Uint8Array(16);
  avif.set(Buffer.from('....ftypavif', 'latin1'));
  assert.deepEqual(sniffBytes(avif), { kind: 'image', codec: 'avif' });
  const pdf = new Uint8Array(8);
  pdf.set(Buffer.from('%PDF-1.7'));
  assert.deepEqual(sniffBytes(pdf), { kind: 'pdf' });
});

test('sniffBytes requires complete image signatures and does not trust MIME-like bytes', () => {
  assert.deepEqual(sniffBytes(Uint8Array.of(0xff, 0xd8, 0x00)), { kind: 'unknown' });
  assert.deepEqual(sniffBytes(Uint8Array.from(Buffer.from('GIF87a', 'latin1'))), { kind: 'image', codec: 'gif' });
  assert.deepEqual(sniffBytes(Uint8Array.from(Buffer.from('GIF', 'latin1'))), { kind: 'unknown' });
  assert.deepEqual(sniffBytes(Uint8Array.from(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">', 'utf8'))), { kind: 'unknown' });
});

test('sniffBytes rejects unknown bytes instead of guessing an image', () => {
  assert.deepEqual(sniffBytes(Uint8Array.of(0, 1, 2, 3, 4, 5, 6, 7)), { kind: 'unknown' });
  const tiffLe = new Uint8Array(8);
  tiffLe.set(Buffer.from('II*\0', 'latin1'));
  assert.deepEqual(sniffBytes(tiffLe), { kind: 'unknown' });
  const bmp = new Uint8Array(8);
  bmp.set(Buffer.from('BM', 'latin1'));
  assert.deepEqual(sniffBytes(bmp), { kind: 'unknown' });
});
