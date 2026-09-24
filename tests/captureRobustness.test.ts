import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePage } from '../src/omr/analyzePage';
import { formDefinition } from '../src/omr/formDefinition';
import { isolatePaper } from '../src/omr/pageIsolation';
import { toGrayscale } from '../src/omr/imageQuality';
import { decodePageQr } from '../src/omr/qrDecoder';
import type { PixelImage } from '../src/omr/omrTypes';
import { acceptPage, createScanSet } from '../src/scanner/pageSequence';
import { renderSyntheticPage, SYNTHETIC_MARGIN } from './fixtures/omrSynthetic';

function padDark(image: PixelImage, pad: number): PixelImage {
  const width = image.width + pad * 2, height = image.height + pad * 2;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = 28;
    data[i + 3] = 255;
  }
  for (let y = 0; y < image.height; y++) {
    data.set(image.data.subarray(y * image.width * 4, (y + 1) * image.width * 4), ((y + pad) * width + pad) * 4);
  }
  return { width, height, data };
}

test('isolatePaper leaves a full-bleed sheet unchanged and never invents corners', () => {
  const image = toGrayscale(renderSyntheticPage());
  const isolated = isolatePaper(image);
  assert.equal(isolated.originX, 0);
  assert.equal(isolated.originY, 0);
  assert.equal(isolated.image.width, image.width);
  assert.equal(isolated.image.height, image.height);
  assert.equal(isolated.image.data.length, image.data.length);
});

test('isolatePaper crops a dark desk around a synthetic sheet', () => {
  const pad = 420;
  const scene = padDark(renderSyntheticPage(), pad);
  const isolated = isolatePaper(toGrayscale(scene));
  assert.ok(isolated.image.width < scene.width);
  assert.ok(isolated.image.height < scene.height);
  assert.ok(isolated.originX > 0);
  assert.ok(isolated.originY > 0);
  assert.ok(isolated.image.width * isolated.image.height < scene.width * scene.height * 0.85);
});

test('a sheet photographed on a dark desk keeps identity and maps corners into the original frame', async () => {
  const pad = 420;
  const scene = padDark(renderSyntheticPage({ marks: [{ itemNumber: 1, choiceId: 'D', kind: 'strong' }] }), pad);
  const result = await analyzePage(scene, formDefinition);
  assert.equal(result.ok, true, result.ok ? '' : `${result.code}: ${result.message}`);
  if (!result.ok) return;
  assert.equal(result.pageNumber, 1);
  assert.equal(result.items[0]!.choiceId, 'D');
  assert.ok(['reliable', 'single'].includes(result.items[0]!.status));
  assert.ok(result.items.slice(1).every(item => item.status === 'blank' && item.choiceId === null));
  assert.ok(Math.abs(result.sourceCorners[0]!.x - (pad + SYNTHETIC_MARGIN - 0.5)) < 4);
  assert.ok(Math.abs(result.sourceCorners[0]!.y - (pad + SYNTHETIC_MARGIN - 0.5)) < 4);
  const accepted = acceptPage(createScanSet(), result, formDefinition, { sourceName: 'desk.png', previewUrl: '' });
  assert.equal(accepted.ok, true, accepted.ok ? '' : accepted.message);
});

test('QR decode on an isolated desk crop still returns the page identity', () => {
  const pad = 420;
  const isolated = isolatePaper(toGrayscale(padDark(renderSyntheticPage(), pad)));
  const decoded = decodePageQr(isolated.image);
  assert.ok(decoded);
  assert.match(decoded!.text, /^M566:/);
});
