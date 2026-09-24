import { pdfWidth } from './ttfFont';
import type { TtfFont } from './ttfFont';

type Body = { dict: string; stream?: Uint8Array };

export const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

/**
 * Small PDF 1.7 writer: numbered objects, an xref table and Flate streams.
 * Only the features the answer sheet needs are implemented.
 */
export class PdfDocument {
  readonly #bodies = new Map<number, Body>();
  #next = 1;

  allocate(): number {
    return this.#next++;
  }

  set(reference: number, body: Body): void {
    if (this.#bodies.has(reference)) throw new Error(`PDF nesnesi ${reference} iki kez yazıldı.`);
    this.#bodies.set(reference, body);
  }

  add(body: Body): number {
    const reference = this.allocate();
    this.set(reference, body);
    return reference;
  }

  async finish(catalog: number): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const offsets = new Map<number, number>();
    let length = 0;
    const push = (bytes: Uint8Array) => { chunks.push(bytes); length += bytes.length; };

    push(encoder.encode('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n'));
    for (const reference of [...this.#bodies.keys()].sort((a, b) => a - b)) {
      const body = this.#bodies.get(reference)!;
      offsets.set(reference, length);
      push(encoder.encode(`${reference} 0 obj\n${body.dict}\n`));
      if (body.stream) {
        push(encoder.encode('stream\n'));
        push(body.stream);
        push(encoder.encode('\nendstream\n'));
      }
      push(encoder.encode('endobj\n'));
    }
    const startxref = length;
    const highest = Math.max(...offsets.keys());
    const lines = ['xref\n', `0 ${highest + 1}\n`, '0000000000 65535 f \n'];
    for (let reference = 1; reference <= highest; reference++) {
      const offset = offsets.get(reference);
      lines.push(offset === undefined ? '0000000000 65535 f \n' : `${String(offset).padStart(10, '0')} 00000 n \n`);
    }
    push(encoder.encode(lines.join('')));
    push(encoder.encode(`trailer\n<< /Size ${highest + 1} /Root ${catalog} 0 R >>\nstartxref\n${startxref}\n%%EOF\n`));

    const output = new Uint8Array(length);
    let at = 0;
    for (const chunk of chunks) { output.set(chunk, at); at += chunk.length; }
    return output;
  }
}

/** zlib (RFC 1950) output, which is what /FlateDecode expects. */
export async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const compression = new CompressionStream('deflate');
  // Start draining before writing: awaiting write() first deadlocks on inputs
  // larger than the internal queue, because backpressure never clears.
  const drained = new Response(compression.readable).arrayBuffer();
  const writer = compression.writable.getWriter();
  // Copy into an ArrayBuffer-backed view: Buffer's backing store is ArrayBufferLike.
  await writer.write(new Uint8Array(bytes));
  await writer.close();
  return new Uint8Array(await drained);
}

async function writeStream(doc: PdfDocument, reference: number, entries: string, bytes: Uint8Array): Promise<void> {
  const packed = await deflate(bytes);
  // Compression must never enlarge the object; PDF viewers accept either form.
  doc.set(reference, packed.length < bytes.length
    ? { dict: `<< ${entries} /Filter /FlateDecode /Length ${packed.length} >>`, stream: packed }
    : { dict: `<< ${entries} /Length ${bytes.length} >>`, stream: bytes });
}

export async function addStream(doc: PdfDocument, entries: string, bytes: Uint8Array): Promise<number> {
  const reference = doc.allocate();
  await writeStream(doc, reference, entries, bytes);
  return reference;
}

function utf16beHex(codePoint: number): string {
  if (codePoint <= 0xffff) return codePoint.toString(16).padStart(4, '0');
  const offset = codePoint - 0x10000;
  const high = 0xd800 + (offset >> 10), low = 0xdc00 + (offset & 0x3ff);
  return high.toString(16).padStart(4, '0') + low.toString(16).padStart(4, '0');
}

/** A ToUnicode CMap so a PDF reader can extract the sheet's labels as text. */
function toUnicodeCmap(used: ReadonlyMap<number, number>): Uint8Array {
  const entries = [...used.entries()].sort((a, b) => a[0] - b[0]);
  const blocks: string[] = [];
  for (let at = 0; at < entries.length; at += 100) {
    const chunk = entries.slice(at, at + 100);
    blocks.push(`${chunk.length} beginbfchar\n${chunk.map(([glyph, codePoint]) =>
      `<${glyph.toString(16).padStart(4, '0')}> <${utf16beHex(codePoint)}>`).join('\n')}\nendbfchar`);
  }
  return new TextEncoder().encode(`/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
${blocks.join('\n')}
endcmap
CMapName currentdict /CMap defineresource pop
end
end
`);
}

export type EmbeddedFont = {
  reference: number;
  /** Encodes a string as a hexadecimal operand and records its glyphs. */
  text(value: string): string;
  /** Total advance in 1/1000 em, so width = advance / 1000 * fontSize. */
  advance(value: string): number;
  readonly missing: readonly string[];
  /** Call once, after every label has been encoded; fills /W and ToUnicode. */
  finalize(): Promise<void>;
};

/**
 * Embeds one TrueType face as a Type0/Identity-H font. Text is written as two
 * byte glyph ids, so the printed sheet can be verified by extracting its text.
 */
export async function embedTrueType(doc: PdfDocument, font: TtfFont, baseFont: string): Promise<EmbeddedFont> {
  const scale = 1000 / font.unitsPerEm;
  const used = new Map<number, number>();
  const missing = new Set<string>();
  const fileReference = await addStream(doc, `/Length1 ${font.program.length}`, font.program);
  const descriptor = doc.add({
    dict: `<< /Type /FontDescriptor /FontName /${baseFont} /Flags 4 ` +
      `/FontBBox [${font.bbox.map(value => Math.round(value * scale)).join(' ')}] ` +
      `/ItalicAngle ${Math.round(font.italicAngle * 100) / 100} /Ascent ${Math.round(font.ascent * scale)} ` +
      `/Descent ${Math.round(font.descent * scale)} /CapHeight ${Math.round(font.capHeight * scale)} ` +
      `/StemV ${font.stemV} /FontFile2 ${fileReference} 0 R >>`,
  });
  // Widths and ToUnicode depend on which glyphs are used, so their object numbers
  // are reserved first and their bodies written by finalize().
  const cidReference = doc.allocate();
  const unicodeReference = doc.allocate();
  const reference = doc.add({
    dict: `<< /Type /Font /Subtype /Type0 /BaseFont /${baseFont} /Encoding /Identity-H ` +
      `/DescendantFonts [${cidReference} 0 R] /ToUnicode ${unicodeReference} 0 R >>`,
  });
  return {
    reference,
    get missing() { return [...missing]; },
    advance(value: string) {
      let total = 0;
      for (const character of value) total += pdfWidth(font, font.glyphIdOf(character.codePointAt(0)!));
      return total;
    },
    text(value: string) {
      let hex = '';
      for (const character of value) {
        const glyph = font.glyphIdOf(character.codePointAt(0)!);
        if (glyph === 0) { missing.add(character); hex += '0000'; continue; }
        used.set(glyph, character.codePointAt(0)!);
        hex += glyph.toString(16).padStart(4, '0');
      }
      return `<${hex}>`;
    },
    async finalize() {
      const widths = [...used.keys()].sort((a, b) => a - b).map(glyph => `${glyph} [${pdfWidth(font, glyph)}]`).join(' ');
      doc.set(cidReference, {
        dict: `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${baseFont} ` +
          `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> ` +
          `/FontDescriptor ${descriptor} 0 R /DW 1000 /W [${widths}] /CIDToGIDMap /Identity >>`,
      });
      await writeStream(doc, unicodeReference, '', toUnicodeCmap(used));
    },
  };
}
