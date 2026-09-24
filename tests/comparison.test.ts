import assert from 'node:assert/strict';
import test from 'node:test';
import { grayscaleToRgba } from '../src/scanner/comparison';

test('grayscale comparison output is a real opaque RGBA image, not an empty buffer', () => {
  const result = grayscaleToRgba({ width: 2, height: 1, data: Uint8Array.of(12, 240) });
  assert.deepEqual([...result.data], [12, 12, 12, 255, 240, 240, 240, 255]);
});

test('grayscale comparison rejects malformed data and unsafe dimensions', () => {
  assert.throws(() => grayscaleToRgba({ width: 2, height: 1, data: Uint8Array.of(12) }), /verisi geçersiz/);
  assert.throws(() => grayscaleToRgba({ width: 0, height: 1, data: new Uint8Array() }), /boyutları geçersiz/);
  assert.throws(() => grayscaleToRgba({ width: 2, height: 1, data: Uint8Array.of(12, 240) }, 0), /boyutları geçersiz/);
});
