/**
 * Türetilmiş ölçekler ve endeksler — 566 maddelik cevap verisinden hesaplanır.
 *
 * - Kişilik bozukluğu eğilimleri (DSM yönelimli ham puan ölçekleri)
 * - Alkol/madde kullanım göstergeleri (MAC, ICAS, SAP)
 * - Wiggins içerik ölçekleri (T puanı ile)
 * - Özel ölçekler: O-H (Aşırı Kontrol Edilmiş Düşmanlık), Es (Barron Ego Gücü),
 *   A ve R (Welsh Anksiyete/Represyon), Do (Dominans), Dy (Bağımlılık)
 * - Endeksler: Goldberg (nevrotik/psikotik ayrımı), Taulbee, Peterson
 *
 * Madde anahtarları ve kesme puanları sayısal/olgusal veridir; yorum metinleri
 * bu depoya özgü kısa özetlerdir ve tanı koymaz.
 */

import type { ResponseMap } from './mmpiScoring';
import type { ScaleId } from './mmpiKeys';

export type ScaleKey = { dogru: number[]; yanlis: number[] };

function countKey(key: ScaleKey, responses: ResponseMap): number {
  let raw = 0;
  for (const n of key.dogru) if (responses[n] === 1) raw++;
  for (const n of key.yanlis) if (responses[n] === 0) raw++;
  return raw;
}

/* ------------------------------------------------------------------ */
/* Kişilik bozukluğu eğilimleri (ham puan)                            */
/* ------------------------------------------------------------------ */

export type PersonalityScaleId =
  | 'HST' | 'NAR' | 'ANT' | 'BDL' | 'DEP' | 'CPS' | 'PAG' | 'PAR' | 'STY' | 'AVD' | 'SZD';

export const PERSONALITY_KEYS: Record<PersonalityScaleId, ScaleKey> = {
  HST: {
    dogru: [99, 126, 181, 353, 381, 391, 445, 449, 450, 451, 482, 521, 547],
    yanlis: [111, 171, 180, 240, 286, 304, 312],
  },
  NAR: {
    dogru: [19, 73, 122, 124, 126, 165, 218, 250, 257, 264, 271, 280, 319, 353, 394, 400, 415, 450, 469, 520, 521, 547],
    yanlis: [86, 91, 142, 171, 180, 267, 304, 321, 517],
  },
  ANT: {
    dogru: [21, 38, 45, 49, 56, 93, 118, 124, 135, 145, 146, 205, 215, 235, 316, 419, 437, 456, 465, 471, 475],
    yanlis: [37, 294, 460, 466],
  },
  BDL: {
    dogru: [39, 74, 75, 99, 129, 139, 145, 158, 181, 208, 215, 234, 236, 299, 381, 450, 451, 468, 555],
    yanlis: [37, 379, 399],
  },
  DEP: {
    dogru: [82, 86, 141, 357, 394, 411, 418, 443, 517, 531, 549, 564],
    yanlis: [112, 122, 170, 235, 257, 264, 371, 501],
  },
  CPS: { dogru: [64, 90, 100, 112, 147, 148, 217, 322, 343, 346, 402, 408, 461, 493, 499], yanlis: [] },
  PAG: { dogru: [32, 41, 64, 109, 147, 233, 235, 259, 342, 356, 438, 447, 536, 560], yanlis: [] },
  PAR: {
    dogru: [19, 35, 110, 112, 123, 124, 136, 138, 157, 162, 197, 200, 218, 244, 247, 265, 278, 284, 317, 447, 448],
    yanlis: [347],
  },
  STY: {
    dogru: [27, 33, 35, 50, 110, 121, 123, 136, 138, 151, 157, 180, 197, 265, 267, 278, 284, 292, 317, 345, 348, 349, 377, 420, 473, 551],
    yanlis: [57, 79, 91, 309, 391, 449, 450, 479, 482, 547],
  },
  AVD: {
    dogru: [52, 86, 138, 142, 171, 180, 201, 267, 278, 292, 304, 305, 317, 321, 344, 357, 368, 377, 418, 473, 509],
    yanlis: [54, 57, 79, 91, 99, 122, 170, 309, 353, 371, 391, 449, 450, 479, 482, 521, 547],
  },
  SZD: {
    dogru: [52, 91, 170, 218, 286, 292, 312, 324, 377, 407, 453, 454, 473],
    yanlis: [54, 57, 99, 309, 391, 449, 450, 482, 547],
  },
};

export const PERSONALITY_META: Record<PersonalityScaleId, { name: string; description: string }> = {
  HST: { name: 'Histrionik Kişilik Özellikleri', description: 'İlgi odağı olma ihtiyacı ve duygu abartısı eğilimi' },
  NAR: { name: 'Narsisistik Kişilik Özellikleri', description: 'Kendini aşırı önemseme ve empati eksikliği eğilimi' },
  ANT: { name: 'Antisosyal Kişilik Özellikleri', description: 'Normlara uyumda güçlük ve dürtüsellik eğilimi' },
  BDL: { name: 'Sınır (Borderline) Kişilik Özellikleri', description: 'İlişkilerde dengesizlik ve kimlik karmaşası eğilimi' },
  DEP: { name: 'Bağımlı Kişilik Özellikleri', description: 'Karar ve destek için başkalarına aşırı yönelme eğilimi' },
  CPS: { name: 'Obsesif-Kompulsif Kişilik Özellikleri', description: 'Düzenlilik, mükemmeliyetçilik ve katılık eğilimi' },
  PAG: { name: 'Pasif-Agresif Kişilik Özellikleri', description: 'Taleplere dolaylı direnç, erteleme ve inatçılık eğilimi' },
  PAR: { name: 'Paranoid Kişilik Özellikleri', description: 'Güvensizlik, kuşkuculuk ve kin tutma eğilimi' },
  STY: { name: 'Şizotipal Kişilik Özellikleri', description: 'Alışılmadık düşünceler ve sosyal kaygı eğilimi' },
  AVD: { name: 'Çekingen (Avoidant) Kişilik Özellikleri', description: 'Sosyal ketlenme ve eleştirilme duyarlılığı eğilimi' },
  SZD: { name: 'Şizoid Kişilik Özellikleri', description: 'Sosyal ilişkilerden kopma ve duygusal küntlük eğilimi' },
};

type PdCutoff = { marked: number; mild: number };

const PERSONALITY_CUTOFFS: Record<PersonalityScaleId, PdCutoff> = {
  HST: { marked: 10, mild: 7 },
  NAR: { marked: 10, mild: 7 },
  ANT: { marked: 11, mild: 8 },
  BDL: { marked: 10, mild: 7 },
  DEP: { marked: 9, mild: 7 },
  CPS: { marked: 11, mild: 8 },
  PAG: { marked: 9, mild: 7 },
  PAR: { marked: 8, mild: 6 },
  STY: { marked: 9, mild: 6 },
  AVD: { marked: 9, mild: 7 },
  SZD: { marked: 7, mild: 5 },
};

/** UI'da eşik çipleri için dışa açılmıştır; değerler değişmeden yalnızca okunur. */
export const PERSONALITY_CUTOFFS_READ_ONLY: Record<PersonalityScaleId, PdCutoff> = PERSONALITY_CUTOFFS;

const PERSONALITY_MARKED_TEXT: Record<PersonalityScaleId, string> = {
  HST: 'Belirgin histrionik özellikler: ilgi odağı olma ihtiyacı, duygusal abartı, yüzeysel ilişkiler ve manipülatif davranışlar gözlenebilir.',
  NAR: 'Belirgin narsisistik özellikler: kendini aşırı önemseme, empati eksikliği, sınırsız başarı hayalleri ve başkalarını kullanma eğilimi.',
  ANT: 'Belirgin antisosyal özellikler: sosyal normlara uyumda güçlük, dürtüsellik, dürüst olmama, pişmanlık eksikliği ve saldırganlık eğilimi.',
  BDL: 'Belirgin borderline (sınır) özellikler: ilişkilerde ve duygularda dengesizlik, kimlik karmaşası, terk edilme korkusu ve dürtüsel davranışlar.',
  DEP: 'Belirgin bağımlı kişilik özellikleri: karar vermede başkalarına aşırı ihtiyaç duyma, terk edilme korkusu ve boyun eğici tutumlar.',
  CPS: 'Belirgin obsesif-kompulsif özellikler: aşırı düzenlilik, mükemmeliyetçilik, esneklik eksikliği ve detaylara aşırı odaklanma.',
  PAG: 'Belirgin pasif-agresif özellikler: taleplere karşı dolaylı direnç gösterme, surat asma, erteleme ve inatçılık.',
  PAR: 'Belirgin paranoid özellikler: başkalarına karşı aşırı güvensizlik, kuşkuculuk, olayları kötü niyetli yorumlama ve kin tutma.',
  STY: 'Belirgin şizotipal özellikler: tuhaf düşünceler, sosyal kaygı, alışılmadık algısal yaşantılar ve garip davranışlar.',
  AVD: 'Belirgin çekingen özellikler: sosyal ketlenme, yetersizlik hisleri ve olumsuz değerlendirilmeye karşı aşırı duyarlılık.',
  SZD: 'Belirgin şizoid özellikler: sosyal ilişkilerden kopma, duygusal küntlük ve yalnız kalmayı tercih etme.',
};

const PERSONALITY_MILD_TEXT: Record<PersonalityScaleId, string> = {
  HST: 'Hafif histrionik eğilimler: sosyal ortamlarda dikkat çekme isteği ve dışadönük tutumlar.',
  NAR: 'Hafif narsisistik eğilimler: kendine güvenin yüksekliği ve takdir görme ihtiyacı.',
  ANT: 'Hafif antisosyal eğilimler: kurallara karşı esnek tutum ve otorite çatışması olasılığı.',
  BDL: 'Hafif borderline eğilimler: duygusal dalgalanmalar ve hassas kişilik yapısı.',
  DEP: 'Bağımlı eğilimler: desteklenme ihtiyacı ve yalnız kalma kaygısı.',
  CPS: 'Hafif obsesif eğilimler: titizlik ve sorumluluk bilincinin yüksekliği.',
  PAG: 'Pasif-agresif eğilimler: eleştiriye hassasiyet ve sitemkâr tutumlar.',
  PAR: 'Paranoid eğilimler: tedbirli tutum ve eleştirilme kaygısı.',
  STY: 'Hafif şizotipal eğilimler: eksantrik ilgi alanları ve içedönüklük.',
  AVD: 'Çekingen eğilimler: utangaçlık ve yeni durumlardan kaçınma.',
  SZD: 'Şizoid eğilimler: sosyal mesafe koyma ve düşük duygusal dışavurum.',
};

/* ------------------------------------------------------------------ */
/* Alkol/madde kullanım göstergeleri                                  */
/* ------------------------------------------------------------------ */

export type AddictionScaleId = 'MAC' | 'ICAS' | 'SAP';

export const ADDICTION_KEYS: Record<AddictionScaleId, ScaleKey> = {
  MAC: {
    dogru: [6, 27, 34, 50, 56, 57, 58, 61, 81, 94, 116, 118, 127, 128, 140, 156, 186, 224, 235, 243, 251, 263, 283, 309, 413, 419, 426, 445, 446, 477, 482, 483, 488, 500, 507, 529, 562],
    yanlis: [86, 120, 130, 149, 173, 179, 278, 294, 320, 335, 356, 378],
  },
  ICAS: { dogru: [61, 215, 298, 529, 542, 559], yanlis: [130, 460] },
  SAP: {
    dogru: [20, 56, 57, 61, 98, 99, 118, 127, 143, 157, 202, 208, 219, 224, 250, 331, 338, 347, 365, 419, 423, 469, 471, 484, 494, 507, 543],
    yanlis: [137, 173, 179, 294, 376, 377, 378, 464, 532],
  },
};

export const ADDICTION_META: Record<AddictionScaleId, { name: string; description: string }> = {
  MAC: { name: 'MacAndrew Alkolizm Ölçeği (MAC)', description: 'Alkol ve madde bağımlılığı potansiyeli' },
  ICAS: { name: 'ICAS Alkolizm Ölçeği', description: 'Spesifik kronik alkolizm belirti göstergesi' },
  SAP: { name: 'Madde Kullanım Eğilimi Ölçeği (SAP)', description: 'Madde kötüye kullanımı ve risk alma eğilimi' },
};

/* ------------------------------------------------------------------ */
/* Wiggins içerik ölçekleri (T puanı ile)                             */
/* ------------------------------------------------------------------ */

export type WigginsScaleId =
  | 'SOC' | 'DEP_W' | 'FEM' | 'MOR' | 'REL' | 'AUT' | 'PSY'
  | 'ORG' | 'FAM' | 'HOS' | 'PHO' | 'HYP' | 'HEA';

export const WIGGINS_KEYS: Record<WigginsScaleId, ScaleKey> = {
  SOC: {
    dogru: [52, 171, 172, 180, 201, 267, 292, 304, 377, 384, 453, 455, 509],
    yanlis: [57, 91, 99, 309, 371, 391, 449, 450, 479, 482, 502, 520, 521, 547],
  },
  DEP_W: {
    dogru: [41, 61, 67, 76, 94, 104, 106, 158, 202, 209, 210, 217, 259, 305, 337, 338, 339, 374, 390, 396, 413, 414, 487, 517, 518, 526, 543],
    yanlis: [8, 79, 88, 207, 379, 407],
  },
  FEM: {
    dogru: [70, 74, 77, 78, 87, 92, 126, 132, 140, 149, 203, 261, 295, 463, 538, 554, 557, 562],
    yanlis: [1, 81, 219, 221, 223, 283, 300, 423, 434, 537, 552, 563],
  },
  MOR: {
    dogru: [84, 86, 138, 142, 244, 321, 357, 361, 375, 382, 389, 395, 397, 398, 411, 416, 418, 431, 531, 549, 555],
    yanlis: [122, 264],
  },
  REL: { dogru: [58, 95, 98, 115, 206, 249, 258, 373, 491], yanlis: [483, 488, 490] },
  AUT: {
    dogru: [59, 71, 93, 116, 117, 118, 124, 250, 265, 277, 280, 298, 313, 316, 319, 406, 436, 437, 446],
    yanlis: [294],
  },
  PSY: {
    dogru: [16, 22, 24, 27, 33, 35, 40, 48, 50, 66, 73, 110, 121, 123, 127, 136, 151, 168, 184, 194, 197, 200, 232, 275, 278, 284, 291, 293, 299, 312, 317, 334, 341, 345, 348, 349, 350, 364, 400, 420, 433, 448, 476, 511, 551],
    yanlis: [198, 347, 464],
  },
  ORG: {
    dogru: [23, 44, 108, 114, 156, 159, 161, 186, 189, 251, 273, 332, 335, 541, 560],
    yanlis: [46, 68, 103, 119, 154, 174, 175, 178, 185, 187, 188, 190, 192, 243, 274, 281, 330, 405, 496, 508, 540],
  },
  FAM: { dogru: [21, 212, 216, 224, 226, 239, 245, 325, 327, 421, 516], yanlis: [65, 96, 137, 220, 527] },
  HOS: { dogru: [28, 39, 80, 89, 109, 129, 139, 145, 162, 218, 269, 282, 336, 355, 363, 368, 393, 410, 417, 426, 438, 447, 452, 468, 469, 495, 536], yanlis: [] },
  PHO: {
    dogru: [166, 182, 351, 352, 360, 365, 385, 388, 392, 473, 480, 492, 494, 499, 525, 553],
    yanlis: [128, 131, 169, 176, 287, 353, 367, 401, 412, 522, 539],
  },
  HYP: { dogru: [13, 134, 146, 181, 196, 228, 234, 238, 248, 266, 268, 272, 296, 340, 342, 372, 381, 386, 409, 439, 445, 465, 500, 505, 506], yanlis: [] },
  HEA: {
    dogru: [10, 14, 29, 34, 72, 125, 279, 424, 519, 544],
    yanlis: [2, 18, 36, 51, 55, 63, 130, 153, 155, 163, 193, 214, 230, 462, 474, 486, 533, 542],
  },
};

/** Türk örneklemi için ortalama/standart sapma değerleri. */
export const WIGGINS_NORMS: Record<WigginsScaleId, { M: number; SD: number }> = {
  SOC: { M: 10.52, SD: 4.36 },
  DEP_W: { M: 11.75, SD: 5.13 },
  FEM: { M: 14.77, SD: 3.87 },
  MOR: { M: 8.97, SD: 4.28 },
  REL: { M: 7.37, SD: 4.87 },
  AUT: { M: 11.04, SD: 3.36 },
  PSY: { M: 14.8, SD: 7.04 },
  ORG: { M: 10.4, SD: 5.31 },
  FAM: { M: 5.31, SD: 3.44 },
  HOS: { M: 11.35, SD: 3.67 },
  PHO: { M: 11.37, SD: 4.52 },
  HYP: { M: 13.32, SD: 3.9 },
  HEA: { M: 7.71, SD: 4.19 },
};

export const WIGGINS_META: Record<WigginsScaleId, { name: string; description: string }> = {
  SOC: { name: 'Wiggins Sosyal Uyumsuzluk', description: 'Sosyal ortamlarda ketlenmişlik ve utangaçlık' },
  DEP_W: { name: 'Wiggins Depresyon Ölçeği', description: 'Mutsuzluk, suçluluk ve yaşamın anlamını yitirme hissi' },
  FEM: { name: 'Wiggins Kadınsı İlgiler Ölçeği', description: 'Estetik konulara ve sanata karşı ilgi' },
  MOR: { name: 'Wiggins Moral Bozukluğu Ölçeği', description: 'Kendini başarısız hissetme ve düşük kendilik değeri' },
  REL: { name: 'Wiggins Dinsel Tutuculuk Ölçeği', description: 'Gelenekselci, dinsel tutucu tutumlar ve değer yargıları' },
  AUT: { name: 'Wiggins Otorite Çatışması Ölçeği', description: 'Otoriteye güvensizlik ve kullanılma kaygısı' },
  PSY: { name: 'Wiggins Psikotizm Ölçeği', description: 'Gerçekten kopma, kontrol kaybı ve halüsinasyon belirtileri' },
  ORG: { name: 'Wiggins Organik Semptomlar Ölçeği', description: 'Fiziksel güçsüzlük ve bedenselleştirilmiş yakınmalar' },
  FAM: { name: 'Wiggins Aile Sorunları Ölçeği', description: 'Aile içi çatışma, gerginlik ve uyumsuzluk' },
  HOS: { name: 'Wiggins Dışa Vuran Düşmanlık', description: 'Agresif tutumlar, kavgacılık ve kişilerarası düşmanlık' },
  PHO: { name: 'Wiggins Fobiler Ölçeği', description: 'Karanlık, kapalı alanlar, yükseklik vb. spesifik korkular' },
  HYP: { name: 'Wiggins Hipomani Ölçeği', description: 'Aşırı hareketlilik, huzursuzluk ve yüksek enerji' },
  HEA: { name: 'Wiggins Sağlıksızlık Ölçeği', description: 'Sağlık durumuyla aşırı meşguliyet ve somatik kaygılar' },
};

const WIGGINS_HIGH_TEXT: Record<WigginsScaleId, string> = {
  SOC: 'Sosyal ortamlarda ketlenmişlik, utangaçlık ve içedönüklük; insanlarla iletişim kurmakta ve sürdürmekte güçlük çekilebilir.',
  DEP_W: 'Belirgin suçluluk, mutsuzluk, ümitsizlik ve yaşamın anlamını yitirme hissi; öz-yıkım düşünceleri açısından dikkatli olunmalıdır.',
  FEM: 'Estetik konulara, sanata ve çeşitli hobilerle ilgili faaliyetlere karşı yüksek duyarlılık ve ilgi.',
  MOR: 'Kendini başarısız ve işe yaramaz hissetme; yanlış anlaşıldığına dair aşırı duyarlılık ve düşük kendilik değeri.',
  REL: 'Katı dini inançlar ve değer yargılarının doğruluğuna sarsılmaz inanç; ahlak konularında gelenekselci tutumlar.',
  AUT: 'Diğer insanlara güvensizlik, yaşamı karmaşık algılama ve başkalarının kendisini kullandığına dair inançlar.',
  PSY: 'Klasik psikotik semptomlar: halüsinasyonlar, kontrol kaybı hissi, gerçekle bağın kopması ve paranoid düşünceler.',
  ORG: 'Fiziksel güçsüzlük, somatik yakınmalar (baş ve sırt ağrıları vb.) ve psikolojik sorunların bedenselleştirilmesi.',
  FAM: 'Aile içinde sevgi ve ilgi eksikliği, ebeveynlerle çatışma ve ev ortamında gerginlik/kavga vurgusu.',
  HOS: 'Agresif tutumlar, kavgaya hazır olma ve kişilerarası ilişkilerde sert/tartışmacı yapı.',
  PHO: 'Çeşitli spesifik korkular (karanlık, kapalı alanlar, yükseklik vb.) ve bunlara bağlı anksiyete belirtileri.',
  HYP: 'Huzursuzluk, gerginlik, aşırı hareketlilik ve yüksek enerji; sürekli yenilik arayışı.',
  HEA: 'Kendi sağlığı ile aşırı derecede meşgul olma, gastrointestinal yakınmalar ve genel bir hastalık hali algısı.',
};

/* ------------------------------------------------------------------ */
/* Özel ölçekler: O-H, Es, Welsh A/R, Do, Dy                          */
/* ------------------------------------------------------------------ */

export type SpecialScaleId = 'OH' | 'Es' | 'A' | 'R' | 'Do' | 'Dy';

export const SPECIAL_KEYS: Record<SpecialScaleId, ScaleKey> = {
  OH: {
    dogru: [78, 91, 229, 319, 338, 373, 394, 425, 488, 559],
    yanlis: [1, 30, 81, 90, 102, 109, 129, 130, 141, 165, 181, 183, 290, 329, 382, 396, 439, 446, 475, 501, 534],
  },
  Es: {
    dogru: [2, 36, 51, 95, 109, 153, 174, 181, 187, 192, 208, 221, 231, 234, 253, 270, 355, 367, 380, 410, 421, 430, 458, 513, 515],
    yanlis: [14, 22, 32, 33, 34, 43, 48, 58, 62, 82, 94, 100, 132, 140, 189, 209, 217, 236, 241, 244, 251, 261, 341, 344, 349, 359, 378, 384, 389, 420, 483, 488, 489, 494, 510, 525, 541, 544, 548, 554, 555, 559, 561],
  },
  A: {
    dogru: [32, 41, 67, 76, 94, 138, 147, 236, 259, 267, 278, 301, 305, 321, 337, 343, 344, 345, 356, 359, 374, 382, 383, 384, 389, 396, 397, 411, 414, 418, 431, 443, 465, 499, 511, 518, 544, 555],
    yanlis: [379],
  },
  R: {
    dogru: [],
    yanlis: [1, 6, 9, 12, 39, 51, 81, 112, 126, 131, 140, 145, 154, 156, 191, 208, 219, 221, 271, 272, 281, 282, 327, 406, 415, 429, 440, 445, 447, 449, 450, 451, 462, 468, 472, 502, 516, 529, 550, 556],
  },
  Do: {
    dogru: [64, 229, 255, 270, 368, 432, 523],
    yanlis: [32, 61, 82, 86, 94, 186, 223, 224, 240, 249, 250, 267, 268, 304, 343, 356, 395, 419, 483, 558, 562],
  },
  Dy: {
    dogru: [19, 21, 24, 41, 63, 67, 70, 82, 86, 98, 100, 138, 141, 158, 165, 180, 189, 201, 212, 236, 239, 259, 267, 304, 305, 321, 337, 338, 343, 357, 361, 362, 375, 382, 383, 390, 394, 397, 398, 408, 443, 487, 488, 489, 509, 531, 549, 554, 564],
    yanlis: [9, 79, 107, 163, 170, 193, 264, 369],
  },
};

export const SPECIAL_META: Record<SpecialScaleId, { name: string; description: string }> = {
  OH: { name: 'Aşırı Kontrol Edilmiş Düşmanlık (O-H)', description: 'Öfkenin aşırı bastırılması ve ani patlama riski' },
  Es: { name: 'Barron Ego Gücü Ölçeği (Es)', description: 'Psikolojik dayanıklılık ve terapiye yanıt verme potansiyeli' },
  A: { name: 'Welsh Anksiyete Ölçeği (A)', description: 'Açık anksiyete, kötümserlik ve duygusal gerilim' },
  R: { name: 'Welsh Represyon Ölçeği (R)', description: 'Sorunları inkâr etme, duyguları bastırma eğilimi' },
  Do: { name: 'Üstünlük (Dominans) Ölçeği (Do)', description: 'Liderlik, kendine güven ve sorumluluk taşıma gücü' },
  Dy: { name: 'Bağımlılık Ölçeği (Dy)', description: 'Pasiflik, destek arayışı ve bağımlı tutumlar' },
};

/* ------------------------------------------------------------------ */
/* Sonuç tipi ve hesaplama                                            */
/* ------------------------------------------------------------------ */

export type DerivedCategory = 'personality' | 'addiction' | 'wiggins' | 'special' | 'index';

export type DerivedScaleResult = {
  scaleId: string;
  scaleName: string;
  category: DerivedCategory;
  /** Ham puan (endekslerde kullanılmaz). */
  rawScore: number;
  /** Wiggins ve Welsh A/R için T puanı; diğerlerinde null. */
  tScore: number | null;
  /** Düzey etiketi (Normal sınırlar / Belirgin özellikler / ...). */
  levelLabel: string;
  interpretation: string;
  tone: 'ok' | 'watch' | 'alert';
  /** Kısa açıklama (ölçek neyi ölçüyor). */
  description: string;
};

function tFromNorm(raw: number, norm: { M: number; SD: number }): number {
  if (norm.SD === 0) return 50;
  const t = 50 + (10 * (raw - norm.M)) / norm.SD;
  return Math.round(Math.max(20, Math.min(120, t)) * 10) / 10;
}

function personalityInterpretation(id: PersonalityScaleId, raw: number): { text: string; tone: 'ok' | 'watch' | 'alert'; level: string } {
  const cutoff = PERSONALITY_CUTOFFS[id];
  if (raw >= cutoff.marked) return { text: PERSONALITY_MARKED_TEXT[id], tone: 'alert', level: 'Belirgin Özellikler' };
  if (raw >= cutoff.mild) return { text: PERSONALITY_MILD_TEXT[id], tone: 'watch', level: 'Hafif Eğilimler' };
  return { text: 'Normal sınırlar.', tone: 'ok', level: 'Normal Sınırlar' };
}

function addictionInterpretation(id: AddictionScaleId, raw: number): { text: string; tone: 'ok' | 'watch' | 'alert'; level: string } {
  if (id === 'MAC') {
    if (raw >= 28) return { text: 'Ciddi bağımlılık riski: ham puan 28 ve üzerindedir; alkol/madde kullanımı açısından ayrıntılı klinik değerlendirme yapılması önerilir.', tone: 'alert', level: 'Ciddi Bağımlılık Riski' };
    if (raw >= 22) return { text: 'Belirgin alkolizm riski (ham puan ≥ 22): Türkiye normlarına göre (Ceyhun ve Palabıyıkoğlu, 1989) kesme puanının üzerindedir. Alkol kullanımı veya madde kötüye kullanımı potansiyeli açısından klinik değerlendirme önerilir; impulsif, dışadönük ve risk alma eğilimi eşlik edebilir.', tone: 'alert', level: 'Kritik Risk Seviyesi' };
    return { text: 'Normal sınırlar.', tone: 'ok', level: 'Normal Sınırlar' };
  }
  if (id === 'ICAS') {
    if (raw >= 5) return { text: 'Kronik alkolizm göstergesi: spesifik alkolizm maddelerinde belirgin yükselme. ICAS ölçeği alkol bağımlılığını saptamada yüksek doğruluğa sahiptir.', tone: 'alert', level: 'Kronik Alkolizm Göstergesi' };
    return { text: 'Normal sınırlar.', tone: 'ok', level: 'Normal Sınırlar' };
  }
  if (raw >= 16) return { text: 'Madde kullanım eğilimi (pozitif): Türkiye örnekleminde yüksek doğruluk veren kesme puanının üzerindedir. Madde kullanma eğilimi, dürtüsellik ve risk alma davranışları açısından anlamlı risk taşır.', tone: 'alert', level: 'Madde Kullanım Eğilimi' };
  return { text: 'Normal sınırlar.', tone: 'ok', level: 'Normal Sınırlar' };
}

function specialInterpretation(id: SpecialScaleId, raw: number, t: number | null): { text: string; tone: 'ok' | 'watch' | 'alert'; level: string } {
  switch (id) {
    case 'OH':
      return raw >= 19
        ? { text: 'Agresif dürtülerin aşırı baskılanması: bu bireyler genellikle nazik görünür ancak birikmiş öfkenin aniden ve şiddetli biçimde patlaması riski vardır.', tone: 'alert', level: 'Aşırı Kontrol (Riskli)' }
        : { text: 'Normal sınırlar.', tone: 'ok', level: 'Normal Sınırlar' };
    case 'Es':
      if (raw >= 45) return { text: 'Yüksek ego gücü: psikolojik dayanıklılık, stresle başa çıkma kapasitesi ve psikoterapiden yararlanma potansiyeli yüksektir. Barron’a göre bu ölçek kişiliğin gelişmesi için genel bir kapasiteyi gösterir; klinik profil görece normal çıkabilir, ancak savunma ve dirençler terapi başlangıcında güçlük yaratabilir.', tone: 'ok', level: 'Yüksek Ego Gücü' };
      if (raw <= 35) return { text: 'Düşük ego gücü: psikolojik kaynakların yetersizliği, düşük özgüven ve duygusal zorluklarla başa çıkmada güçlük. Sorunlar uzun süredir kronik olarak devam ediyor olabilir; psikoterapi prognozu zayıftır.', tone: 'alert', level: 'Düşük Ego Gücü' };
      return { text: 'Ortalama ego gücü: kişisel baş etme kaynakları ve psikolojik dayanıklılık dengeli, ortalama düzeydedir.', tone: 'watch', level: 'Ortalama Ego Gücü' };
    case 'A': {
      const tt = t ?? 50;
      if (tt >= 60) return { text: `Belirgin anksiyete (T ${tt.toFixed(0)}): duygusal sıkıntı, olumsuz duygusallık, enerji eksikliği, kötümserlik ve genel bir rahatsızlık hissi; birey psikolojik acısını açıkça dile getirmektedir.`, tone: 'alert', level: 'Belirgin Anksiyete' };
      if (tt >= 45) return { text: `Normal anksiyete (T ${tt.toFixed(0)}): birey davranışlarını, duygularını ve sorunlarını tartışmak için uygun düzeyde istek ve içgörü gösterir.`, tone: 'ok', level: 'Normal Anksiyete' };
      return { text: `Düşük anksiyete (T ${tt.toFixed(0)}): belirgin bir psikolojik sıkıntı yoktur ya da var olan sorunlar bastırılıp tartışılmaktan kaçınılıyordur.`, tone: 'watch', level: 'Düşük Anksiyete' };
    }
    case 'R': {
      const tt = t ?? 50;
      if (tt >= 60) return { text: `Yüksek represyon (T ${tt.toFixed(0)}): sorunları inkâr etme, duyguları bastırma ve savunmacı bir yaşam tarzı; birey sorunlarını tartışmaya son derece isteksizdir, içgörüsü kısıtlı olabilir.`, tone: 'alert', level: 'Belirgin Represyon' };
      if (tt >= 45) return { text: `Normal represyon (T ${tt.toFixed(0)}): sorunlara ve duygulara karşı dengeli yaklaşım; ortalama düzeyde savunma ve bastırma mekanizmaları devrededir.`, tone: 'ok', level: 'Normal Represyon' };
      return { text: `Düşük represyon (T ${tt.toFixed(0)}): duygusal açıklık, içsel yaşantıları paylaşma istekliliği ve sorunları doğrudan ifade etme eğilimi.`, tone: 'watch', level: 'Düşük Represyon' };
    }
    case 'Do':
      if (raw >= 20) return { text: 'Yüksek dominans: yaşamın sorumluluk ve yüklerini taşıyabilen, dengeli, liderlik özellikleri belirgin birey.', tone: 'ok', level: 'Yüksek Üstünlük / Dominans' };
      if (raw >= 14) return { text: 'Orta düzey dominans: sorumluluk alma ve kendine güven ortalama düzeydedir.', tone: 'watch', level: 'Orta Üstünlük' };
      return { text: 'Düşük dominans: karar alma ve sorumluluk üstlenmede çekingenlik; yönlendirilmeye açık tutum.', tone: 'alert', level: 'Düşük Üstünlük' };
    case 'Dy':
      if (raw >= 35) return { text: 'Yüksek bağımlılık: pasif tutumlar, destek arayışı ve kararlar için başkalarına yönelme belirgindir.', tone: 'alert', level: 'Yüksek Bağımlılık' };
      if (raw >= 20) return { text: 'Orta düzey bağımlılık: destek ihtiyacı ve bağımsızlık arasında denge vardır.', tone: 'watch', level: 'Orta Bağımlılık' };
      return { text: 'Düşük bağımlılık: bağımsız, kendi kararlarını alan tutum.', tone: 'ok', level: 'Düşük Bağımlılık' };
    default:
      return { text: '', tone: 'ok', level: '' };
  }
}

/** T skorlarından hesaplanan ayrım endeksleri. */
export type DerivedIndexResult = {
  scaleId: 'GOLDBERG' | 'TAULBEE' | 'PETERSON';
  scaleName: string;
  value: number;
  levelLabel: string;
  interpretation: string;
  tone: 'ok' | 'watch' | 'alert';
  description: string;
};

export function computeDerivedIndexes(t: Record<string, number>): DerivedIndexResult[] {
  const get = (id: string) => t[id] ?? 50;
  const out: DerivedIndexResult[] = [];

  const goldberg = get('L') + get('Pa') + get('Sc') - (get('Hy') + get('Pt'));
  out.push({
    scaleId: 'GOLDBERG',
    scaleName: 'Goldberg Ayrım Endeksi',
    value: Math.round(goldberg * 100) / 100,
    levelLabel: goldberg > 45 ? 'Psikotik Profil Eğilimi' : 'Nevrotik Profil Eğilimi',
    interpretation: goldberg > 45
      ? 'Psikotik profil örüntüsü göstergesi (Goldberg Endeksi > 45). (L + Pa + Sc) − (Hy + Pt) formülüyle hesaplanır.'
      : 'Nevrotik profil örüntüsü göstergesi (Goldberg Endeksi ≤ 44). (L + Pa + Sc) − (Hy + Pt) formülüyle hesaplanır.',
    tone: goldberg > 45 ? 'alert' : 'ok',
    description: 'Nevrotik/psikotik profil ayrımı için (L + Pa + Sc) − (Hy + Pt) değeri',
  });

  let taulbee = 0;
  const rules: Array<[string, string]> = [
    ['Hs', 'Hy'], ['Hs', 'Pd'], ['Hs', 'Mf'], ['Hs', 'Pa'], ['Hs', 'Pt'], ['Hs', 'Sc'], ['Hs', 'Ma'],
    ['D', 'Pd'], ['D', 'Pa'],
    ['Hy', 'Pd'], ['Hy', 'Mf'], ['Hy', 'Pa'], ['Hy', 'Ma'],
    ['Pt', 'Mf'], ['Pt', 'Pa'], ['Pt', 'Sc'],
  ];
  for (const [a, b] of rules) if (get(a) > get(b)) taulbee++;
  out.push({
    scaleId: 'TAULBEE',
    scaleName: 'Taulbee İndeksi',
    value: taulbee,
    levelLabel: taulbee >= 13 ? 'Nevrotik Eğilim' : taulbee <= 6 ? 'Psikotik Eğilim' : 'Belirsiz Profil Eğilimi',
    interpretation: taulbee >= 13
      ? 'Nevrotik profil örüntüsü (Taulbee puanı ≥ 13): 16 karşılaştırmalı kuralın çoğu nevrotik örüntü yönünde.'
      : taulbee <= 6
        ? 'Şizofrenik/psikotik profil örüntüsü (Taulbee puanı ≤ 6): kuralların çoğu psikotik örüntü yönünde.'
        : 'Belirsiz profil örüntüsü: endeks nevrotik ve psikotik örüntüler arasında ayrım yapamıyor.',
    tone: taulbee <= 6 ? 'alert' : 'ok',
    description: '16 karşılaştırmalı kurala göre nevrotik/psikotik ayrımı',
  });

  let peterson = 0;
  const clinicalIds = ['Hs', 'D', 'Hy', 'Pd', 'Mf', 'Pa', 'Pt', 'Sc', 'Ma', 'Si'];
  if (clinicalIds.filter(id => (t[id] ?? 0) >= 70).length >= 4) peterson++;
  if (get('F') > 64) peterson++;
  if (Math.max(get('Pa'), get('Sc'), get('Ma')) > Math.max(get('Hs'), get('D'), get('Hy'))) peterson++;
  if (get('D') > get('Hs') && get('D') > get('Hy')) peterson++;
  if (get('Sc') > get('Pt')) peterson++;
  if (get('Pa') > 70 || get('Ma') > 70) peterson++;
  out.push({
    scaleId: 'PETERSON',
    scaleName: 'Peterson İndeksi',
    value: peterson,
    levelLabel: peterson >= 3 ? 'Psikotik Eğilim (Belirgin)' : 'Normal / Nevrotik',
    interpretation: peterson >= 3
      ? 'Psikotik profil örüntüsü göstergesi (Peterson belirtisi ≥ 3): altı klinik kuralın üç veya daha fazlası karşılanıyor.'
      : 'Normal/nevrotik profil örüntüsü: psikotik yük kriterlerinin çoğu karşılanmıyor.',
    tone: peterson >= 3 ? 'alert' : 'ok',
    description: '6 klinik kurala göre psikotik yük derecesi',
  });

  return out;
}

/**
 * Madde düzeyinde cevap verisinden tüm türetilmiş ölçekleri hesaplar.
 */
export function computeDerivedScales(responses: ResponseMap): DerivedScaleResult[] {
  const out: DerivedScaleResult[] = [];

  (Object.keys(PERSONALITY_KEYS) as PersonalityScaleId[]).forEach(id => {
    const raw = countKey(PERSONALITY_KEYS[id], responses);
    const interp = personalityInterpretation(id, raw);
    out.push({
      scaleId: id,
      scaleName: PERSONALITY_META[id].name,
      category: 'personality',
      rawScore: raw,
      tScore: null,
      levelLabel: interp.level,
      interpretation: interp.text,
      tone: interp.tone,
      description: PERSONALITY_META[id].description,
    });
  });

  (Object.keys(ADDICTION_KEYS) as AddictionScaleId[]).forEach(id => {
    const raw = countKey(ADDICTION_KEYS[id], responses);
    const interp = addictionInterpretation(id, raw);
    out.push({
      scaleId: id,
      scaleName: ADDICTION_META[id].name,
      category: 'addiction',
      rawScore: raw,
      tScore: null,
      levelLabel: interp.level,
      interpretation: interp.text,
      tone: interp.tone,
      description: ADDICTION_META[id].description,
    });
  });

  (Object.keys(WIGGINS_KEYS) as WigginsScaleId[]).forEach(id => {
    const raw = countKey(WIGGINS_KEYS[id], responses);
    const t = tFromNorm(raw, WIGGINS_NORMS[id]);
    const high = t >= 70;
    out.push({
      scaleId: id,
      scaleName: WIGGINS_META[id].name,
      category: 'wiggins',
      rawScore: raw,
      tScore: t,
      levelLabel: high ? 'Yüksek (Klinik)' : t >= 56 ? 'Orta Derece / Sınırda' : 'Normal / Ortalama',
      interpretation: high ? WIGGINS_HIGH_TEXT[id] : 'Normal sınırlarda veya hafif düzeyde içerik vurgusu.',
      tone: high ? 'alert' : t >= 56 ? 'watch' : 'ok',
      description: WIGGINS_META[id].description,
    });
  });

  (Object.keys(SPECIAL_KEYS) as SpecialScaleId[]).forEach(id => {
    const raw = countKey(SPECIAL_KEYS[id], responses);
    let t: number | null = null;
    if (id === 'A') t = Math.round(Math.max(20, Math.min(120, 50 + (10 * (raw - 15)) / 8)));
    if (id === 'R') t = Math.round(Math.max(20, Math.min(120, 50 + (10 * (raw - 16)) / 5)));
    const interp = specialInterpretation(id, raw, t);
    out.push({
      scaleId: id,
      scaleName: SPECIAL_META[id].name,
      category: 'special',
      rawScore: raw,
      tScore: t,
      levelLabel: interp.level,
      interpretation: interp.text,
      tone: interp.tone,
      description: SPECIAL_META[id].description,
    });
  });

  return out;
}

/** Endeksler için T haritası profili üzerinden kurar. */
export function tMapFromProfileScales(scales: ReadonlyArray<{ id: ScaleId | string; tScore: number }>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of scales) map[s.id] = Math.round(s.tScore);
  return map;
}
