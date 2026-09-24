/**
 * Yanıt tutarlılığı göstergeleri — madde düzeyinde cevap verisiyle hesaplanır.
 *
 * - TR Endeksi: 566 maddelik formda 16 çift tekrarlanmış madde vardır; çiftler
 *   arasındaki tutarsız (farklı) yanıtlar sayılır. Kaynak kitap (s.59):
 *   "TR endeksi üzerinde 3 puan ya da daha fazla bir puanın, geçersiz profil
 *   olasılığını arttırdığı ileri sürülmüştür (Dahlstrom 1972)." → 3 ve üzeri
 *   puan geçersizlik riski taşır; yalnızca 0-2 tutarlı sayılır.
 * - Dikkatsizlik Endeksi: benzer/karşıt içerikli 12 madde çifti üzerinde
 *   beklenen yanıt örüntüsünden sapmalar sayılır; 4 ve üzeri dikkatsizlik /
 *   rastgele işaretleme kuşkusu doğurur (Greene 1980).
 * - F-K Endeksi (Gough): F ham − K ham. 0-9 geçerli, 10-16 sahte-kötülük
 *   kuşkusu, 16 üstü kritik abartma; negatif değerler sahte-iyilik yönünde
 *   değerlendirilir.
 *
 * Sayısal değerler (madde çiftleri ve kesme puanları) olgusal veridir.
 */

import type { ResponseMap } from './mmpiScoring';

export type ConsistencyLevel = 'ok' | 'watch' | 'alert';

/* ------------------------------------------------------------------ */
/* TR Endeksi — 16 tekrarlanmış madde çifti                           */
/* ------------------------------------------------------------------ */

export const TR_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [8, 318], [13, 290], [15, 314], [16, 315], [20, 310], [21, 308],
  [22, 326], [23, 288], [24, 333], [32, 328], [33, 323], [35, 331],
  [37, 302], [38, 311], [305, 366], [317, 362],
];

export type TrIndexResult = {
  /** Tutarsız yanıtlanan çift sayısı. */
  score: number;
  /** Değerlendirilebilen (her ikisi de dolu) çift sayısı. */
  evaluated: number;
  level: string;
  interpretation: string;
  isWarning: boolean;
  tone: ConsistencyLevel;
  /** Tutarsız çıkan çiftlerin madde numaraları. */
  mismatches: Array<[number, number]>;
};

/** TR endeksi: tekrarlanmış 16 çiftte birbirinden farklı yanıtların sayısı. */
export function trIndex(responses: ResponseMap): TrIndexResult {
  let score = 0;
  let evaluated = 0;
  const mismatches: Array<[number, number]> = [];
  for (const [a, b] of TR_PAIRS) {
    const va = responses[a];
    const vb = responses[b];
    if (va === undefined || vb === undefined || va === -1 || vb === -1) continue;
    evaluated++;
    if (va !== vb) {
      score++;
      mismatches.push([a, b]);
    }
  }
  // Kaynak kitap s.59: "3 puan ya da daha fazla bir puanın, geçersiz profil
  // olasılığını arttırdığı ileri sürülmüştür (Dahlstrom 1972)."
  // → 3 puan DAHİL geçersizlik riski; tutarlılık yalnızca 0-2 için geçerlidir.
  const consistent = score <= 2;
  return {
    score,
    evaluated,
    level: consistent ? 'Tutarlı Yanıt Örüntüsü' : 'Tutarsız Yanıt Örüntüsü',
    interpretation: consistent
      ? 'TR endeksi 3 puanın altındadır; yanıtlar tutarlı kabul edilir. Bu seviyedeki düşük tutarsızlıklar genellikle dikkatsizlik kaynaklıdır.'
      : 'TR endeksi 3 puan ya da daha fazladır. Kaynak kitaba göre bu düzey, geçersiz profil olasılığını artırır (Dahlstrom 1972). Bireyin işbirliği içinde olmadığını, test almaya karşı dirençli olduğunu veya maddeleri okumadan/rastgele işaretlediğini gösterebilir.',
    isWarning: !consistent,
    tone: consistent ? 'ok' : 'alert',
    mismatches,
  };
}

/* ------------------------------------------------------------------ */
/* Dikkatsizlik Endeksi — 12 kritik madde çifti                       */
/* ------------------------------------------------------------------ */

type CarelessPair = {
  pair: readonly [number, number];
  /** Bu çiftte puana yol açan (kuşku doğuran) yanıt örüntüsü. */
  condition: 'same' | 'different';
};

export const CARELESS_PAIRS: readonly CarelessPair[] = [
  { pair: [10, 405], condition: 'same' },
  { pair: [17, 65], condition: 'different' },
  { pair: [18, 63], condition: 'different' },
  { pair: [49, 113], condition: 'same' },
  { pair: [76, 107], condition: 'same' },
  { pair: [88, 526], condition: 'same' },
  { pair: [137, 216], condition: 'same' },
  { pair: [177, 220], condition: 'different' },
  { pair: [178, 342], condition: 'same' },
  { pair: [286, 312], condition: 'different' },
  { pair: [329, 425], condition: 'same' },
  { pair: [388, 480], condition: 'different' },
];

export type CarelessnessResult = {
  score: number;
  evaluated: number;
  level: string;
  interpretation: string;
  isWarning: boolean;
  tone: ConsistencyLevel;
};

/** Dikkatsizlik endeksi: 12 çift üzerinde beklenmeyen örüntülerin sayısı. */
export function carelessnessIndex(responses: ResponseMap): CarelessnessResult {
  let score = 0;
  let evaluated = 0;
  for (const { pair: [a, b], condition } of CARELESS_PAIRS) {
    const va = responses[a];
    const vb = responses[b];
    if (va === undefined || vb === undefined || va === -1 || vb === -1) continue;
    evaluated++;
    if ((condition === 'same' && va === vb) || (condition === 'different' && va !== vb)) {
      score++;
    }
  }
  const normal = score < 4;
  return {
    score,
    evaluated,
    level: normal ? 'Normal / Dikkatli' : 'Yüksek / Tutarsız',
    interpretation: normal
      ? "Dikkatsizlik endeksi puanı 4'ün altındadır; bu da bireyin maddeleri dikkatle ve içeriklerini anlayarak cevapladığını gösterir."
      : "Dikkatsizlik puanının 4 veya üzerinde olması, saptırılmış test davranışının ortaya çıkarılmasını mümkün kılar. Bu durum; bireyin testi tamamlamaya karşı isteksizliğini, beceri eksikliğini veya konfüzyon (zihinsel karışıklık) durumunu yansıtıyor olabilir. Bu seviyedeki bir puan, test bulgularının değerlendirilmesinde dikkatli olunması gerektiğini gösterir.",
    isWarning: !normal,
    tone: normal ? 'ok' : 'alert',
  };
}

/* ------------------------------------------------------------------ */
/* F-K Endeksi (Gough)                                                */
/* ------------------------------------------------------------------ */

export type FkAnalysis = {
  value: number;
  level: string;
  interpretation: string;
  isWarning: boolean;
  tone: ConsistencyLevel;
};

/**
 * F-K endeksi için ayrıntılı bant değerlendirmesi.
 * kaynak: F-K > 16 için dikkatli değerlendirme uyarısı verir; klinik
 * pratikte 9 üstü sahte-kötülük kuşkusu, negatif değerler sahte-iyilik
 * yönünde ele alınır.
 */
export function fkIndexAnalysis(fRaw: number, kRaw: number): FkAnalysis {
  const value = fRaw - kRaw;

  if (value > 16) {
    return {
      value,
      level: 'Kritik Derecede Yüksek Abartma',
      interpretation:
        "F-K endeksi 16'nın üzerindedir. Bu durum, test bulgularının değerlendirilmesinde son derece dikkatli olmayı gerektirir; standart değerlendirme bireyin gerçek durumunu yansıtmayabilir. Olası iki açıklama vardır: (1) Birey akut bir psikotik konfüzyon/bozukluk yaşamaktadır ve testi içinde bulunduğu kafa karışıklığına bağlı olarak sağlıklı tamamlayamamıştır; klinik düzelme gerçekleştikten sonra test yinelenmelidir. (2) Birey bilinçli olarak durumunu aşırı şekilde abartmaktadır (simülasyon).",
      isWarning: true,
      tone: 'alert',
    };
  }

  if (value > 9) {
    let text =
      "F-K endeksi, Türkiye klinik pratiklerinde güncel sınır kabul edilen 9 puanın üzerindedir. Bireyin psikopatolojisini abartma veya kendini bilerek olduğundan daha kötü gösterme (sahte-kötülük) eğiliminde olduğunu düşündürür; test alma tutumunda yardım çağrısı veya semptomları dramatize etme çabası olabilir.";
    if (value >= 10 && value <= 11) {
      text +=
        ' F-K endeksinin 8-11 aralığında yer alması, bireyin gerçek sorunları olduğunu gösterse de sorunlarını abarttığına işaret eder; ancak bu durum, bireyin psikolojik müdahaleye ve yardım almaya açık olduğunu da göstermektedir.';
    }
    text +=
      " Klinik olgularda F-K endeksinin 9'dan büyük olduğu durumlarda bireyin psikopatolojisini inkâr etme eğilimi de araştırılmalıdır.";
    return { value, level: 'Sahte-Kötülük (Faking Bad) Eğilimi', interpretation: text, isWarning: true, tone: 'alert' };
  }

  if (value > 0) {
    let text =
      'F-K puanı 0 ile 9 arasındadır; bu aralık geçerli kabul edilir. Birey test maddelerine karşı dürüst, dengeli ve gerçekçi bir tutum sergilemiştir; kendini aşırı derecede savunma veya olduğundan kötü gösterme çabası saptanmamıştır.';
    if (value >= 8) {
      text +=
        ' Bununla birlikte 8-11 aralığı, bireyin gerçek sorunları olmakla birlikte sorunlarını bir miktar abarttığını ve yardım almaya açık olduğunu düşündürebilir.';
    }
    return { value, level: 'Normal / Geçerli', interpretation: text, isWarning: false, tone: 'ok' };
  }

  if (value >= -8) {
    return {
      value,
      level: value === 0 ? 'Hafif Savunuculuk (Geçerli)' : 'Hafif Negatif (Geçerli)',
      interpretation:
        value === 0
          ? 'F-K endeksi 0 çıkmıştır. Bireyin kendisini sosyal açıdan daha kabul edilebilir ve sorunsuz gösterme eğilimi (savunuculuk) hafif düzeydedir; profil geçerli kabul edilir.'
          : "F-K endeksi hafif negatiftir (K ham puanı F'den biraz büyüktür). Bu düzeydeki küçük farklar normal sınırlarda kabul edilir; bireyin kendini sosyal açıdan kabul edilebilir gösterme eğilimi belirgin değildir. Profil geçerli kabul edilir.",
      isWarning: false,
      tone: 'ok',
    };
  }

  return {
    value,
    level: 'Sahte-İyilik (Faking Good) Eğilimi',
    interpretation:
      "F-K endeksi belirgin biçimde negatiftir (K ham puanı F'den 9 ve üzeri puan büyüktür). Bireyin sorunlarını inkâr etme, kendini daha iyi ve uyumlu gösterme eğiliminde olduğunu düşündürür. Yüksek eğitim ve sosyo-ekonomik düzeye sahip bireylerde bu görünüm sahte bir çaba olmaksızın doğal olarak da ortaya çıkabileceğinden sonuç tek başına profili geçersiz kılmaz; klinik görüşme ile desteklenmelidir.",
    isWarning: true,
    tone: 'watch',
  };
}
