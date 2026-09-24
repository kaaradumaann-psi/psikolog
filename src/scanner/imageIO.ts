import type { GrayImage, PixelImage } from '../omr/omrTypes';

export const SCAN_LIMITS = {
  fileBytes: 24 * 1024 * 1024, batchBytes: 96 * 1024 * 1024, files: 12,
  sourcePixels: 40_000_000, sourceDimension: 16_000, longSide: 2800, pdfWidth: 1680, pdfPages: 12, batchPages: 24,
} as const;

/**
 * OMR motorunun kabul ettiği giriş bütçesi (omr/analyzePage ile aynı).
 * Telefon kamerasıyla çekilen yüksek çözünürlüklü fotoğraflar bu bütçeyi
 * aştığında kullanıcıya hata döndürmek yerine görüntü otomatik
 * küçültülüp optimize edilir (bkz. optimizeOmrInput).
 */
export const OMR_INPUT_BUDGET = { pixels: 12_000_000, dimension: 8_000 } as const;

/** Görüntünün OMR giriş bütçesini (piksel veya kenar uzunluğu) aşıp aşmadığını belirtir. */
export function exceedsOmrInputBudget(width: number, height: number): boolean {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) return false;
  return width * height > OMR_INPUT_BUDGET.pixels || width > OMR_INPUT_BUDGET.dimension || height > OMR_INPUT_BUDGET.dimension;
}

export type ImageCodec = 'jpeg' | 'png' | 'webp' | 'heic' | 'avif' | 'gif';
export type SniffResult =
  | { kind: 'image'; codec: ImageCodec }
  | { kind: 'pdf' }
  | { kind: 'unknown' };

export function checkAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('İşlem iptal edildi.', 'AbortError');
}

export async function yieldToScreen(signal: AbortSignal): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  checkAborted(signal);
}

export function boundedSize(width: number, height: number, longSide: number = SCAN_LIMITS.longSide) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Görüntü boyutları okunamadı.');
  }
  const scale = Math.min(1, longSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function capturePixels(source: CanvasImageSource, width: number, height: number): PixelImage {
  const size = boundedSize(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Tarayıcı görüntü işleme alanını açamadı. Başka bir güncel tarayıcı deneyin.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, size.width, size.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    // Yüksek çözünürlüklü telefon fotoğraflarında (ör. 48 MP → 2.800 px kenar)
    // tek seferde büyük oranda küçültmek ayrıntı kaybettirir; 2x'ten büyük
    // oranlarda adım adım yarılayarak iner (kalite korunur).
    const scale = size.width / width;
    if (Number.isFinite(scale) && scale > 0 && 1 / scale > 2) {
      let stage = document.createElement('canvas');
      stage.width = width;
      stage.height = height;
      const stageContext = stage.getContext('2d');
      if (!stageContext) {
        context.drawImage(source, 0, 0, size.width, size.height);
      } else {
        stageContext.imageSmoothingEnabled = true;
        stageContext.imageSmoothingQuality = 'high';
        stageContext.drawImage(source, 0, 0);
        while (stage.width > size.width * 1.5) {
          const next = document.createElement('canvas');
          next.width = Math.max(size.width, Math.floor(stage.width / 2));
          next.height = Math.max(size.height, Math.floor(stage.height / 2));
          const nextContext = next.getContext('2d');
          if (!nextContext) break;
          nextContext.imageSmoothingEnabled = true;
          nextContext.imageSmoothingQuality = 'high';
          nextContext.drawImage(stage, 0, 0, next.width, next.height);
          stage.width = 0;
          stage.height = 0;
          stage = next;
        }
        context.drawImage(stage, 0, 0, size.width, size.height);
        if (stage.width) { stage.width = 0; stage.height = 0; }
      }
    } else {
      context.drawImage(source, 0, 0, size.width, size.height);
    }
    return { ...size, data: context.getImageData(0, 0, size.width, size.height).data };
  } finally { canvas.width = canvas.height = 0; }
}

export type OmrOptimizationResult = {
  image: PixelImage;
  /** false = görüntü bütçe içindeydi ve olduğu gibi kullanıldı. */
  downscaled: boolean;
  fromPixels: number;
  toPixels: number;
};

/**
 * Çok yüksek çözünürlüklü kaynakları (ör. 48 MP ve üzeri telefon kamerası fotoğrafları)
 * OMR giriş bütçesine otomatik düşürür. Tek seferde büyük oranda küçültmek yerine
 * adım adım yarılamayla (yüksek kalite çift çizgilerle) iner: bu, OMR'ın ihtiyacı olan
 * baloncuk/QR detayını korurken `analyzePage`'in 12 MP / 8.000 px sınırına takılmayı
 * ortadan kaldırır. Bütçe içindeki görüntüler aynen döner (boşa yeniden örneklenmez,
 * yani gereksiz kalite kaybı yaratılmaz).
 */
type RgbaStage = { width: number; height: number; data: Uint8ClampedArray };

export function optimizeOmrInput(image: PixelImage, signal?: AbortSignal): OmrOptimizationResult {
  const fromPixels = image.width * image.height;
  if (!exceedsOmrInputBudget(image.width, image.height)) {
    return { image, downscaled: false, fromPixels, toPixels: fromPixels };
  }
  if (signal) checkAborted(signal);
  const canvas = document.createElement('canvas');
  let current: RgbaStage = { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
  try {
    while (exceedsOmrInputBudget(current.width, current.height)) {
      if (signal) checkAborted(signal);
      const width = Math.max(1, Math.floor(current.width / 2));
      const height = Math.max(1, Math.floor(current.height / 2));
      const off = document.createElement('canvas');
      off.width = current.width;
      off.height = current.height;
      const offContext = off.getContext('2d');
      if (!offContext) throw new Error('Görüntü optimize edilemedi; tarayıcı görüntü işleme alanını açamadı.');
      const toPut = offContext.createImageData(current.width, current.height);
      toPut.data.set(current.data);
      offContext.putImageData(toPut, 0, 0);
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Görüntü optimize edilemedi; tarayıcı görüntü işleme alanını açamadı.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(off, 0, 0, width, height);
      const next = context.getImageData(0, 0, width, height);
      current = { width: next.width, height: next.height, data: next.data };
      off.width = off.height = 0;
    }
    return {
      image: { width: current.width, height: current.height, data: current.data },
      downscaled: true,
      fromPixels,
      toPixels: current.width * current.height,
    };
  } finally {
    canvas.width = canvas.height = 0;
  }
}

/**
 * Encodes an in-memory RGBA capture as a real browser-decodable image URL. A raw RGBA buffer is
 * not a PNG, even when it is put in a Blob whose MIME type says image/png; doing that leaves
 * camera comparison and manual-corner previews as broken images in production. Keeping this
 * conversion here also gives every preview path the same dimension and memory checks.
 */
export async function pixelImageToBlobUrl(image: PixelImage, signal?: AbortSignal): Promise<string> {
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 ||
    image.width * image.height > SCAN_LIMITS.sourcePixels ||
    !(image.data instanceof Uint8ClampedArray) || image.data.length !== image.width * image.height * 4) {
    throw new Error('Önizleme görüntüsü geçersiz veya çok büyük.');
  }
  if (signal) checkAborted(signal);
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  let url: string | undefined;
  try {
    const context = canvas.getContext('2d', { willReadFrequently: false });
    if (!context) throw new Error('Görüntü önizleme alanı açılamadı.');
    const pixels = context.createImageData(image.width, image.height);
    pixels.data.set(image.data);
    context.putImageData(pixels, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('Görüntü önizlemesi oluşturulamadı.')), 'image/jpeg', .9);
    });
    if (signal) checkAborted(signal);
    url = URL.createObjectURL(blob);
    if (signal) checkAborted(signal);
    return url;
  } catch (error) {
    if (url) URL.revokeObjectURL(url);
    throw error;
  } finally {
    canvas.width = canvas.height = 0;
  }
}

export function checkFileSize(file: Pick<File, 'size'>): void {
  if (file.size === 0) throw new Error('Dosya boş. Başka bir JPG, PNG, WEBP, AVIF, HEIC veya PDF seçin.');
  if (file.size > SCAN_LIMITS.fileBytes) throw new Error('Dosya 24 MB sınırını aşıyor. Daha küçük bir dosya seçin.');
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, Math.min(bytes.length, start + length)));
}

/** Magic-byte sniff used by both the upload path and unit tests. */
export function sniffBytes(bytes: Uint8Array): SniffResult {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] !== 0x00) {
    return { kind: 'image', codec: 'jpeg' };
  }
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length >= pngSignature.length && pngSignature.every((value, index) => bytes[index] === value)) {
    return { kind: 'image', codec: 'png' };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return { kind: 'image', codec: 'webp' };
  }
  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a')) {
    return { kind: 'image', codec: 'gif' };
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp') {
    const brands = ascii(bytes, 8, Math.min(32, bytes.length - 8)).toLowerCase();
    if (['heic', 'heix', 'heif', 'hevc', 'heim', 'heis', 'mif1', 'msf1'].some(brand => brands.includes(brand))) {
      return { kind: 'image', codec: 'heic' };
    }
    if (['avif', 'avis'].some(brand => brands.includes(brand))) {
      return { kind: 'image', codec: 'avif' };
    }
  }
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d];
  for (let at = 0; at + signature.length <= Math.min(bytes.length, 1024); at++) {
    if (signature.every((value, index) => bytes[at + index] === value)) return { kind: 'pdf' };
  }
  return { kind: 'unknown' };
}

export async function identifyFile(file: File): Promise<'image' | 'pdf'> {
  checkFileSize(file);
  const bytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const sniffed = sniffBytes(bytes);
  if (sniffed.kind === 'image' || sniffed.kind === 'pdf') return sniffed.kind;
  // Do not trust the browser-provided MIME type as a content validator. In particular, accepting
  // `image/svg+xml` here would make an arbitrary XML document part of the image pipeline; every
  // supported upload format has a magic signature that can be checked before decoding.
  throw new Error('Dosya biçimi desteklenmiyor. JPG, PNG, WEBP, AVIF, HEIC veya PDF yükleyin.');
}

function codecMime(codec: ImageCodec | 'unknown'): string {
  return ({
    jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', avif: 'image/avif',
    gif: 'image/gif', unknown: 'application/octet-stream',
  })[codec];
}

function decodeFailureMessage(codec: ImageCodec, cause: unknown): string {
  const detail = cause instanceof Error && cause.message ? ` ${cause.message}` : '';
  if (codec === 'heic' || codec === 'avif') {
    return `Bu görüntü ${codec === 'avif' ? 'AVIF' : 'HEIC/HEIF'} biçiminde ve bu tarayıcı açamadı. iPhone’dan gönderirken “En Uyumlu” (JPG) seçin veya fotoğrafı JPG olarak kaydedin.`;
  }
  if (codec === 'webp') {
    return 'WEBP görüntüsü açılamadı. Dosyayı JPG veya PNG olarak kaydedip yeniden yükleyin.';
  }
  return `Görüntü açılamadı. Standart JPG, PNG, WEBP, AVIF veya HEIC kullanın.${detail}`;
}

/** Check encoded dimensions before allocating the decoded bitmap. */
export function encodedImageSize(bytes: Uint8Array): { width: number; height: number } {
  const sniffed = sniffBytes(bytes);
  if (sniffed.kind !== 'image') throw new Error('ENCODED_SIZE_UNKNOWN');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (sniffed.codec === 'png' && bytes.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (sniffed.codec === 'gif' && bytes.length >= 10) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  if (sniffed.codec === 'jpeg') {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) break;
      while (offset < bytes.length && bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === undefined || marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
        return { height: view.getUint16(offset + 3), width: view.getUint16(offset + 5) };
      }
      offset += length;
    }
  }
  if (sniffed.codec === 'webp' && bytes.length >= 20) {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const type = ascii(bytes, offset, 4);
      const chunkSize = view.getUint32(offset + 4, true);
      const data = offset + 8;
      if (!Number.isSafeInteger(chunkSize) || data + chunkSize > bytes.length) break;
      if (type === 'VP8X' && chunkSize >= 10) {
        const width = 1 + bytes[data + 4]! + (bytes[data + 5]! << 8) + (bytes[data + 6]! << 16);
        const height = 1 + bytes[data + 7]! + (bytes[data + 8]! << 8) + (bytes[data + 9]! << 16);
        return { width, height };
      }
      if (type === 'VP8L' && chunkSize >= 5 && bytes[data] === 0x2f) {
        const bits = bytes[data + 1]! | (bytes[data + 2]! << 8) | (bytes[data + 3]! << 16) | (bytes[data + 4]! << 24);
        return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
      }
      if (type === 'VP8 ' && chunkSize >= 10 && bytes[data + 3] === 0x9d && bytes[data + 4] === 0x01 && bytes[data + 5] === 0x2a) {
        return { width: view.getUint16(data + 6, true) & 0x3fff, height: view.getUint16(data + 8, true) & 0x3fff };
      }
      offset = data + chunkSize + (chunkSize & 1);
    }
  }
  if (sniffed.codec === 'heic') {
    // HEIF/AVIF stores a decoded canvas size in an `ispe` item property. It can occur after
    // the first box, so scan the already-loaded bounded file rather than trusting MIME metadata.
    for (let at = 4; at + 16 <= bytes.length; at++) {
      if (ascii(bytes, at, 4) !== 'ispe') continue;
      const width = view.getUint32(at + 8);
      const height = view.getUint32(at + 12);
      if (width > 0 && height > 0) return { width, height };
    }
  }
  throw new Error('ENCODED_SIZE_UNKNOWN');
}

function guardDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
    width * height > SCAN_LIMITS.sourcePixels || Math.max(width, height) > SCAN_LIMITS.sourceDimension) {
    throw new Error('Görüntü çok büyük veya boyutu geçersiz. En çok 40 megapiksel ve 16.000 piksel kenar uzunluğu desteklenir.');
  }
}

export async function readImageFile(file: File, signal: AbortSignal): Promise<PixelImage> {
  checkFileSize(file);
  checkAborted(signal);
  const bytes = new Uint8Array(await file.arrayBuffer());
  checkAborted(signal);
  const sniffed = sniffBytes(bytes);
  if (sniffed.kind !== 'image') throw new Error('Görüntü biçimi doğrulanamadı. JPG, PNG, WEBP, AVIF veya HEIC seçin.');
  const codec: ImageCodec = sniffed.codec;
  try {
    const size = encodedImageSize(bytes);
    guardDimensions(size.width, size.height);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'ENCODED_SIZE_UNKNOWN') throw error;
  }
  checkAborted(signal);
  const mime = codecMime(codec);
  const blob = new Blob([bytes], { type: mime === 'application/octet-stream' ? file.type || mime : mime });
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    checkAborted(signal);
    guardDimensions(bitmap.width, bitmap.height);
    return capturePixels(bitmap, bitmap.width, bitmap.height);
  } catch (error) {
    checkAborted(signal);
    if (error instanceof Error && error.message.includes('megapiksel')) throw error;
    throw new Error(decodeFailureMessage(codec, error));
  } finally { bitmap?.close(); }
}

export async function normalizedThumbnail(image: GrayImage, signal: AbortSignal): Promise<string> {
  checkAborted(signal);
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 ||
    !(image.data instanceof Uint8Array) || image.data.length !== image.width * image.height) {
    throw new Error('Sayfa önizlemesi için görüntü verisi geçersiz.');
  }
  const canvas = document.createElement('canvas');
  const size = boundedSize(image.width, image.height, 600);
  canvas.width = size.width;
  canvas.height = size.height;
  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Sayfa önizlemesi oluşturulamadı.');
    const pixels = context.createImageData(size.width, size.height);
    for (let y = 0; y < size.height; y++) for (let x = 0; x < size.width; x++) {
      const value = image.data[Math.floor(y * image.height / size.height) * image.width + Math.floor(x * image.width / size.width)]!;
      const index = (y * size.width + x) * 4;
      pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = value;
      pixels.data[index + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value)
      : reject(new Error('Sayfa önizlemesi oluşturulamadı.')), 'image/jpeg', 0.88));
    checkAborted(signal);
    return URL.createObjectURL(blob);
  } finally { canvas.width = canvas.height = 0; }
}
