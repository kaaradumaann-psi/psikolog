/**
 * Minimal TrueType reader, only what PDF embedding needs: metrics, a Unicode to
 * glyph map and the raw font program. No shaping and no subsetting.
 */
export type TtfFont = {
  unitsPerEm: number;
  /** Font units, as in the head table. */
  bbox: [number, number, number, number];
  ascent: number;
  descent: number;
  capHeight: number;
  italicAngle: number;
  stemV: number;
  /** The complete font file, embedded as FontFile2. */
  program: Uint8Array;
  glyphIdOf(codePoint: number): number;
  /** Advance width in font units. */
  advanceOf(glyphId: number): number;
};

function tables(buffer: Uint8Array) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const count = view.getUint16(4);
  const found = new Map<string, { offset: number; length: number }>();
  for (let index = 0; index < count; index++) {
    const at = 12 + index * 16;
    const tag = String.fromCharCode(buffer[at]!, buffer[at + 1]!, buffer[at + 2]!, buffer[at + 3]!);
    found.set(tag, { offset: view.getUint32(at + 8), length: view.getUint32(at + 12) });
  }
  return { view, found };
}

function required(found: Map<string, { offset: number; length: number }>, tag: string): { offset: number; length: number } {
  const entry = found.get(tag);
  if (!entry) throw new Error(`TrueType '${tag}' tablosu bulunamadı; yazı tipi PDF'e gömülemez.`);
  return entry;
}

/** cmap subtable lookup for platform 3 (Windows) encodings 1 and 10, formats 4 and 12. */
function unicodeMap(view: DataView, cmapOffset: number): (codePoint: number) => number {
  const groups = view.getUint16(cmapOffset + 2);
  let chosen: { offset: number; format: number } | null = null;
  for (let index = 0; index < groups; index++) {
    const at = cmapOffset + 4 + index * 8;
    const platform = view.getUint16(at), encoding = view.getUint16(at + 2);
    const offset = cmapOffset + view.getUint32(at + 4);
    const format = view.getUint16(offset);
    if (platform !== 3 || ![1, 10].includes(encoding)) continue;
    if (format === 12 || (format === 4 && !chosen)) chosen = { offset, format };
  }
  if (!chosen) throw new Error('TrueType cmap alt tablosu (3,1/4 veya 3,10/12) bulunamadı.');
  if (chosen.format === 12) {
    const { offset } = chosen, count = view.getUint32(offset + 12);
    return codePoint => {
      for (let index = 0; index < count; index++) {
        const at = offset + 16 + index * 12;
        if (codePoint >= view.getUint32(at) && codePoint <= view.getUint32(at + 4)) {
          return view.getUint32(at + 8) + (codePoint - view.getUint32(at));
        }
      }
      return 0;
    };
  }
  const { offset } = chosen;
  const segmentCount = view.getUint16(offset + 6) / 2;
  const endOffset = offset + 14, startOffset = endOffset + segmentCount * 2 + 2;
  const deltaOffset = startOffset + segmentCount * 2, rangeOffset = deltaOffset + segmentCount * 2;
  return codePoint => {
    if (codePoint > 0xffff) return 0;
    for (let segment = 0; segment < segmentCount; segment++) {
      const end = view.getUint16(endOffset + segment * 2);
      if (codePoint > end) continue;
      const start = view.getUint16(startOffset + segment * 2);
      if (codePoint < start) return 0;
      const delta = view.getInt16(deltaOffset + segment * 2);
      const range = view.getUint16(rangeOffset + segment * 2);
      if (range === 0) return (codePoint + delta) & 0xffff;
      const at = rangeOffset + segment * 2 + range + (codePoint - start) * 2;
      const glyph = view.getUint16(at);
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
}

export function parseTtf(program: Uint8Array): TtfFont {
  if (program.length < 12) throw new Error('Yazı tipi dosyası okunamayacak kadar küçük.');
  const { view, found } = tables(program);
  const head = required(found, 'head').offset;
  const hhea = required(found, 'hhea').offset;
  const maxp = required(found, 'maxp').offset;
  const hmtx = required(found, 'hmtx');
  const cmap = required(found, 'cmap');
  const unitsPerEm = view.getUint16(head + 18);
  if (unitsPerEm < 16 || unitsPerEm > 16384) throw new Error('TrueType unitsPerEm değeri geçersiz.');
  const numberOfHMetrics = view.getUint16(hhea + 34);
  const numGlyphs = view.getUint16(maxp + 4);
  if (numberOfHMetrics < 1 || numberOfHMetrics > numGlyphs) throw new Error('TrueType hmtx ölçüleri tutarsız.');
  const glyphOf = unicodeMap(view, cmap.offset);
  // OS/2 is optional in the spec; fall back to the hhea ascent for the cap height.
  const os2 = found.get('OS/2');
  const capHeight = os2 && view.getUint16(os2.offset) >= 2 ? view.getInt16(os2.offset + 88) : view.getInt16(hhea + 4);
  const post = found.get('post');
  const italicAngle = post ? view.getInt32(post.offset + 4) + view.getUint32(post.offset + 8) / 65536 : 0;
  return {
    unitsPerEm,
    bbox: [view.getInt16(head + 36), view.getInt16(head + 38), view.getInt16(head + 40), view.getInt16(head + 42)],
    ascent: view.getInt16(hhea + 4),
    descent: view.getInt16(hhea + 6),
    capHeight,
    italicAngle,
    stemV: 80,
    program,
    glyphIdOf: glyphOf,
    advanceOf: glyphId => view.getUint16(hmtx.offset + Math.min(glyphId, numberOfHMetrics - 1) * 4),
  };
}

/** Width in PDF text-space units, where 1000 equals one em. */
export function pdfWidth(font: TtfFont, glyphId: number): number {
  return Math.round(font.advanceOf(glyphId) / font.unitsPerEm * 1000);
}
