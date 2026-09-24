import type { QualityReport } from '../results/scanResultTypes';
import { qualityRecoveryTip } from './comparison';

export type QualityVerdict = {
  ok: boolean;
  fatal: boolean;
  headline: string;
  tips: string[];
};

/**
 * Translates the structured quality report that comes out of `assessImageQuality` into a
 * single, user-facing verdict with a short headline and a list of concrete recovery actions.
 * The strings here are what the scanner workspace shows next to a rejected scan; the rest of
 * the pipeline stays in the technical English/Turkish terms that are already documented.
 */
export function verdictFromQuality(quality: QualityReport): QualityVerdict {
  if (quality.fatal) {
    const fatalHeadline = quality.reasons[0] ?? 'Görüntü kalitesi yetersiz.';
    return {
      ok: false, fatal: true, headline: fatalHeadline,
      tips: ['Yeniden çekmeden önce sayfayı düzeltin.', 'Işıklandırmayı kontrol edin.', 'Telefonu sabit tutun.'],
    };
  }
  if (quality.ok) {
    return { ok: true, fatal: false, headline: 'Görüntü kalitesi uygun.', tips: [] };
  }
  // Review-needed: page may still be readable but the user should consider a re-take.
  const tips = Array.from(new Set(quality.reasons.map(qualityRecoveryTip)));
  return { ok: false, fatal: false,
    headline: 'Otomatik güvenilir cevap üretilmedi; sayfayı yeniden çekmeniz önerilir.',
    tips: tips.length ? tips : ['Sayfayı düz ve dik açıdan yeniden çekin.'],
  };
}
