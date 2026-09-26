// public/apple-touch-icon.png üretici — favicon.svg geometrisinin bağımsız render'ı.
// Amaç: iOS "ana ekrana ekle" karo olarak sayfa ekran görüntüsü değil marka simgesi
// gösterilsin. SVG rasterizer (rsvg/inkscape/sharp) bu ortamda yok; çizim geometridan
// üretilir: 180x180, tam dolu #205c48 zemin (iOS saydamlığı siyah bastırır) + #f1f7f0 ink.
// 4x süper-örnekleme ile kenar yumuşatması yapılır.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const N = 180;
const SS = 4; // süper-örnek başına kenar
const S = N / 32;
const INK = [241, 247, 240];
const BG = [32, 92, 72];

/* favicon.svg geometrisi, group translate(3 3) uygulanmış hâliyle (32 birimlik kutu). */
const POLYLINES = [
  [[12, 6], [6, 6], [6, 12]],
  [[20, 6], [26, 6], [26, 12]],
  [[26, 20], [26, 26], [20, 26]],
  [[12, 26], [6, 26], [6, 20]],
];
const STROKE_W = 2.2 / 2;
const DISCS = [
  { c: [13, 13], r: 1.8, fill: true },
  { c: [19, 13], r: 1.8, fill: false, w: 1.5 / 2 },
  { c: [13, 19], r: 1.8, fill: false, w: 1.5 / 2 },
  { c: [19, 19], r: 1.8, fill: true },
];

function distToSegment(x, y, [ax, ay], [bx, by]) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = x - ax;
  const wy = y - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
  return Math.hypot(x - (ax + t * vx), y - (ay + t * vy));
}

function coverageAt(x, y) {
  let hit = false;
  for (const line of POLYLINES) {
    for (let i = 0; i + 1 < line.length && !hit; i++) {
      if (distToSegment(x, y, line[i], line[i + 1]) <= STROKE_W) hit = true;
    }
    if (hit) break;
  }
  if (!hit) {
    for (const disc of DISCS) {
      const d = Math.hypot(x - disc.c[0], y - disc.c[1]);
      if (disc.fill ? d <= disc.r : Math.abs(d - disc.r) <= disc.w) {
        hit = true;
        break;
      }
    }
  }
  return hit;
}

const px = new Uint8Array(N * N * 4);
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    let hits = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const gx = (x + (sx + 0.5) / SS) / S;
        const gy = (y + (sy + 0.5) / SS) / S;
        if (coverageAt(gx, gy)) hits++;
      }
    }
    const a = hits / (SS * SS);
    const i = (y * N + x) * 4;
    px[i] = Math.round(BG[0] + (INK[0] - BG[0]) * a);
    px[i + 1] = Math.round(BG[1] + (INK[1] - BG[1]) * a);
    px[i + 2] = Math.round(BG[2] + (INK[2] - BG[2]) * a);
    px[i + 3] = 255;
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}
let table = null;
function crc32(buf) {
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c;
}

const raw = Buffer.alloc(N * (N * 4 + 1));
for (let y = 0; y < N; y++) {
  raw[y * (N * 4 + 1)] = 0;
  Buffer.from(px.buffer, y * N * 4, N * 4).copy(raw, y * (N * 4 + 1) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(N, 0);
ihdr.writeUInt32BE(N, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync('public/apple-touch-icon.png', png);
console.log('public/apple-touch-icon.png', png.length, 'bytes');
