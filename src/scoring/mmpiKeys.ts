/**
 * MMPI-566 Türk Standardizasyonu - Puanlama anahtarları ve normlar
 * Kaynak: Savaşır (1981) Türkiye standardizasyonu, Hathaway & McKinley orijinali
 * Bu dosya referans klasördeki scoring mantığından ilhamla yeniden yazılmıştır;
 * telifli metin içermez, yalnızca sayısal anahtarlar ve norm değerleri içerir.
 * Sayısal değerler olgusal veridir.
 */

export type Gender = 'Erkek' | 'Kadın';
export type ScaleId = '?' | 'L' | 'F' | 'K' | 'Hs' | 'D' | 'Hy' | 'Pd' | 'Mf' | 'Pa' | 'Pt' | 'Sc' | 'Ma' | 'Si';

export type ScoringRule = {
  trueItems: number[];   // D (Doğru) yanıtı puan kazandırır
  falseItems: number[];  // Y (Yanlış) yanıtı puan kazandırır
};

export type GenderedRule = {
  male: ScoringRule;
  female: ScoringRule;
};

export type ScaleRule = ScoringRule | GenderedRule;

export function isGendered(rule: ScaleRule): rule is GenderedRule {
  return 'male' in rule && 'female' in rule;
}

// Ham puan anahtarları - D = 1, Y = 0
// L, F, K geçerlik; Hs..Si klinik
export const SCORING_KEYS: Record<Exclude<ScaleId, '?'>, ScaleRule> = {
  L: {
    trueItems: [],
    falseItems: [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 195, 225, 255, 285],
  },
  F: {
    trueItems: [
      14, 23, 27, 31, 34, 35, 40, 42, 48, 49, 50, 53, 56, 66, 85, 121, 123, 139, 146, 151, 156, 168, 184, 197,
      200, 202, 205, 206, 209, 210, 211, 215, 218, 227, 245, 246, 247, 252, 256, 269, 275, 286, 291, 293,
    ],
    falseItems: [17, 20, 54, 65, 75, 83, 112, 113, 115, 164, 169, 177, 185, 196, 199, 220, 257, 258, 272, 276],
  },
  K: {
    trueItems: [96],
    falseItems: [
      30, 39, 71, 89, 124, 129, 134, 138, 142, 148, 160, 170, 171, 180, 183, 217, 234, 267, 272, 296, 316, 322,
      374, 383, 397, 398, 406, 461, 502,
    ],
  },
  Hs: {
    trueItems: [23, 29, 43, 62, 72, 108, 114, 125, 161, 189, 273],
    falseItems: [2, 3, 7, 9, 18, 51, 55, 63, 68, 103, 130, 153, 155, 163, 175, 188, 190, 192, 230, 243, 274, 281],
  },
  D: {
    trueItems: [5, 13, 23, 32, 41, 43, 52, 67, 86, 104, 130, 138, 142, 158, 159, 182, 189, 193, 236, 259],
    falseItems: [
      2, 8, 9, 18, 30, 36, 39, 46, 51, 57, 58, 64, 80, 88, 89, 95, 98, 107, 122, 131, 145, 152, 153, 154, 155,
      160, 178, 191, 207, 208, 233, 241, 242, 248, 263, 270, 271, 272, 285, 296,
    ],
  },
  Hy: {
    trueItems: [10, 23, 32, 43, 44, 47, 76, 114, 179, 186, 189, 238, 253],
    falseItems: [
      2, 3, 6, 7, 8, 9, 12, 26, 30, 51, 55, 71, 89, 93, 103, 107, 109, 124, 128, 129, 136, 137, 141, 147, 153,
      160, 162, 163, 170, 172, 174, 175, 180, 188, 190, 192, 201, 213, 230, 234, 243, 265, 267, 274, 279, 289,
      292,
    ],
  },
  Pd: {
    trueItems: [16, 21, 24, 32, 33, 35, 38, 42, 61, 67, 84, 94, 102, 106, 110, 118, 127, 215, 216, 224, 239, 244, 245, 284],
    falseItems: [
      8, 20, 37, 82, 91, 96, 107, 134, 137, 141, 155, 170, 171, 173, 180, 183, 201, 231, 235, 237, 248, 267, 287,
      289, 294, 296,
    ],
  },
  Mf: {
    male: {
      trueItems: [
        4, 25, 69, 70, 74, 77, 78, 87, 92, 126, 132, 134, 140, 149, 179, 187, 203, 204, 217, 226, 231, 239, 261,
        278, 282, 295, 297, 299,
      ],
      falseItems: [
        1, 19, 26, 28, 79, 80, 81, 89, 99, 112, 115, 116, 117, 120, 133, 144, 176, 198, 213, 214, 219, 221, 223,
        229, 249, 254, 260, 262, 264, 280, 283, 300,
      ],
    },
    female: {
      trueItems: [4, 25, 70, 74, 77, 78, 87, 92, 126, 132, 133, 134, 140, 149, 187, 203, 204, 217, 226, 239, 261, 278, 282, 295, 299],
      falseItems: [
        1, 19, 26, 28, 69, 79, 80, 81, 89, 99, 112, 115, 116, 117, 120, 144, 176, 179, 198, 213, 214, 219, 221,
        223, 229, 231, 249, 254, 260, 262, 264, 280, 283, 297, 300,
      ],
    },
  },
  Pa: {
    trueItems: [
      15, 16, 22, 24, 27, 35, 110, 121, 123, 127, 151, 157, 158, 202, 275, 284, 291, 293, 299, 305, 317, 338, 341,
      364, 365,
    ],
    falseItems: [93, 107, 109, 111, 117, 124, 268, 281, 294, 313, 316, 319, 327, 347, 348],
  },
  Pt: {
    trueItems: [
      10, 15, 22, 32, 41, 67, 76, 86, 94, 102, 106, 142, 159, 182, 189, 217, 238, 266, 301, 304, 305, 317, 321,
      336, 337, 340, 342, 343, 344, 346, 349, 351, 352, 356, 357, 358, 359, 360, 361,
    ],
    falseItems: [3, 8, 36, 122, 152, 164, 178, 329, 353],
  },
  Sc: {
    trueItems: [
      15, 16, 21, 22, 24, 32, 33, 35, 38, 40, 41, 47, 52, 76, 97, 104, 121, 156, 157, 159, 168, 179, 182, 194,
      202, 210, 212, 238, 241, 251, 259, 266, 273, 282, 291, 297, 301, 303, 305, 307, 312, 320, 324, 325, 332,
      334, 335, 339, 341, 345, 349, 350, 352, 354, 355, 356, 360, 363, 364,
    ],
    falseItems: [8, 17, 20, 37, 65, 103, 119, 177, 178, 187, 192, 196, 220, 276, 281, 306, 309, 322, 330],
  },
  Ma: {
    trueItems: [
      11, 13, 21, 22, 59, 64, 73, 97, 100, 109, 127, 134, 143, 156, 157, 167, 181, 194, 212, 222, 226, 228, 232,
      233, 238, 240, 250, 251, 263, 266, 268, 271, 277, 279, 298,
    ],
    falseItems: [101, 105, 111, 119, 120, 148, 166, 171, 180, 267, 289],
  },
  Si: {
    trueItems: [
      32, 67, 82, 111, 117, 124, 138, 147, 171, 172, 180, 201, 236, 267, 278, 292, 304, 316, 321, 332, 336, 342,
      357, 377, 383, 398, 411, 427, 436, 455, 473, 487, 549, 564,
    ],
    falseItems: [
      25, 33, 57, 91, 99, 119, 126, 143, 193, 208, 229, 231, 254, 262, 281, 296, 309, 353, 359, 371, 391, 400,
      415, 440, 446, 449, 450, 451, 462, 469, 479, 481, 482, 505, 521, 547,
    ],
  },
};

export const K_CORRECTION: Partial<Record<Exclude<ScaleId, '?' | 'L' | 'F' | 'K' | 'Mf' | 'Pa' | 'Si' | 'D' | 'Hy'>, number>> & Record<string, number> = {
  Hs: 0.5,
  Pd: 0.4,
  Pt: 1.0,
  Sc: 1.0,
  Ma: 0.2,
};

/**
 * Klasik MMPI K düzeltmesi ekleme tablosu (K ham puanı 0-30).
 * Oranlar (Hs .5K, Pd .4K, Pt 1K, Sc 1K, Ma .2K) bu tablodan okunur;
 * basit yuvarlama yerine standardizasyonun öngördüğü değerler kullanılır.
 * 30'un üzerindeki K değerleri için oran yuvarlaması geri çekilme değeridir.
 */
export const K_ADDITION_TABLE: Record<'ratio5' | 'ratio4' | 'ratio2' | 'ratio10', number[]> = {
  ratio5: [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  ratio4: [0, 1, 1, 2, 1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 8, 9, 9, 10, 10, 10, 11, 11, 12, 12],
  ratio2: [0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6],
  ratio10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
};

/** K ham puanı ve orana göre eklenecek puanı tablodan verir. */
export function kAddition(kRaw: number, ratio: number): number {
  const key = ratio === 0.5 ? 'ratio5' : ratio === 0.4 ? 'ratio4' : ratio === 0.2 ? 'ratio2' : 'ratio10';
  const clamped = Math.max(0, Math.min(30, Math.round(kRaw)));
  return K_ADDITION_TABLE[key][clamped] ?? Math.round(kRaw * ratio);
}

export type Norm = { mean: number; sd: number };

export const TURKISH_NORMS: Record<'Erkek' | 'Kadın', Record<Exclude<ScaleId, '?'>, Norm>> = {
  Erkek: {
    L: { mean: 6.45, sd: 2.74 },
    F: { mean: 8.3, sd: 4.62 },
    K: { mean: 13.98, sd: 4.65 },
    Hs: { mean: 13.19, sd: 4.07 },
    D: { mean: 20.63, sd: 4.76 },
    Hy: { mean: 19.31, sd: 4.71 },
    Pd: { mean: 22.22, sd: 4.45 },
    Mf: { mean: 29.21, sd: 3.82 },
    Pa: { mean: 11.12, sd: 4.03 },
    Pt: { mean: 27.9, sd: 6.3 },
    Sc: { mean: 29.82, sd: 9.05 },
    Ma: { mean: 19.96, sd: 4.4 },
    Si: { mean: 23.86, sd: 7.97 },
  },
  Kadın: {
    L: { mean: 6.0, sd: 2.25 },
    F: { mean: 9.38, sd: 5.16 },
    K: { mean: 11.82, sd: 3.8 },
    Hs: { mean: 15.89, sd: 4.88 },
    D: { mean: 23.86, sd: 5.08 },
    Hy: { mean: 18.12, sd: 5.31 },
    Pd: { mean: 22.84, sd: 4.51 },
    Mf: { mean: 32.98, sd: 3.67 },
    Pa: { mean: 11.93, sd: 4.17 },
    Pt: { mean: 29.2, sd: 6.59 },
    Sc: { mean: 31.06, sd: 8.2 },
    Ma: { mean: 19.72, sd: 4.36 },
    Si: { mean: 29.88, sd: 7.52 },
  },
};

export const SCALE_META: Record<ScaleId, { name: string; short: string; full: string; group: 'validity' | 'clinical' | 'cannot' }> = {
  '?': { name: 'Soru (?)', short: '?', full: 'Bir Şey Diyemem (?)', group: 'cannot' },
  L: { name: 'Yalan', short: 'L', full: 'Yalan (Lie)', group: 'validity' },
  F: { name: 'Sıklık', short: 'F', full: 'Sıklık (Frequency)', group: 'validity' },
  K: { name: 'Düzeltme', short: 'K', full: 'Düzeltme (Defensiveness)', group: 'validity' },
  Hs: { name: 'Hipokondriazis', short: 'Hs', full: 'Hipokondriazis (1)', group: 'clinical' },
  D: { name: 'Depresyon', short: 'D', full: 'Depresyon (2)', group: 'clinical' },
  Hy: { name: 'Histeri', short: 'Hy', full: 'Histeri (3)', group: 'clinical' },
  Pd: { name: 'Psikopatik Sapma', short: 'Pd', full: 'Psikopatik Sapma (4)', group: 'clinical' },
  Mf: { name: 'Kadınlık-Erkeklik', short: 'Mf', full: 'Kadınlık-Erkeklik (5)', group: 'clinical' },
  Pa: { name: 'Paranoya', short: 'Pa', full: 'Paranoya (6)', group: 'clinical' },
  Pt: { name: 'Psikasteni', short: 'Pt', full: 'Psikasteni (7)', group: 'clinical' },
  Sc: { name: 'Şizofreni', short: 'Sc', full: 'Şizofreni (8)', group: 'clinical' },
  Ma: { name: 'Hipomani', short: 'Ma', full: 'Hipomani (9)', group: 'clinical' },
  Si: { name: 'Sosyal İçedönüklük', short: 'Si', full: 'Sosyal İçedönüklük (0)', group: 'clinical' },
};

export const T_INTERPRETATION: { min: number; max: number; level: 'veryLow' | 'low' | 'average' | 'moderate' | 'high' | 'veryHigh'; label: string; color: string }[] = [
  { min: 0, max: 35, level: 'veryLow', label: 'Çok Düşük', color: '#8e8e93' },
  { min: 35, max: 45, level: 'low', label: 'Düşük', color: '#0e9e6a' },
  { min: 45, max: 56, level: 'average', label: 'Normal', color: '#0d0d0d' },
  { min: 56, max: 70, level: 'moderate', label: 'Orta Yüksek', color: '#b4770b' },
  { min: 70, max: 80, level: 'high', label: 'Yüksek (Klinik)', color: '#d2453a' },
  { min: 80, max: 200, level: 'veryHigh', label: 'Çok Yüksek', color: '#b93b31' },
];
