/**
 * Kritik maddeler ve klinik izlenimler.
 *
 * KAYNAK DURUMU (denetim kaydı): Kaynak kitapta "kritik madde" listesi YOKTUR
 * (Ek 1 madde metni, Ek 9 ölçek anahtarı, Ek 10 norm tabloları içerir).
 * Bu liste **kaynak dışı bir klinik derlemedir**; madde numaraları ve yönleri
 * doğrulanmış, etiketleri kaynak madde metinleriyle uyumlu hâle getirilmiştir
 * (bkz. docs/mmpi-audit/CONFLICTS.md → CONFLICT-023, DECISION-026).
 * Etiketler tanı değil, uygulayıcı için kontrol listesi niteliğindedir.
 *
 * Kritik maddeler: klinik açıdan acil anlam taşıyan, yanıtı doğrudan
 * değerlendirilmesi gereken maddelerdir (intihar, kendine/başkasına zarar,
 * sanrısal yaşantılar vb.). Madde metinleri telifli olduğundan gösterilmez;
 * madde numarası, verilen yanıt ve klinik kategori raporlanır.
 *
 * Klinik izlenimler: profil ve kritik maddelerden türetilen yapılandırılmış
 * bulgulardır (intihar riski uyarıları, yardım çağrısı, tedaviye yanıt notu
 * gibi). Bunlar tanı değil, uygulayıcı uzman için kontrol listesi niteliğindedir.
 */

import type { ResponseMap } from './mmpiScoring';
import type { Gender } from './mmpiKeys';

export type CriticalItemDef = {
  id: number;
  /** Beklenen (kritik sayılan) yanıt: 1 = D, 0 = Y. */
  expected: 1 | 0;
  label: string;
  /** Cinsiyete göre değişen kritik maddeler için. */
  gender?: Gender;
};

export const CRITICAL_ITEMS: CriticalItemDef[] = [
  { id: 27, expected: 1, label: 'Etkilenme / Sanrısal Deneyim' },
  { id: 33, expected: 1, label: 'Tuhaf/Bizar Yaşantı' },
  { id: 44, expected: 1, label: 'Bedensel/Organik Yakınma' },
  { id: 48, expected: 1, label: 'Ruhsal Kontrol Kaybı' },
  { id: 66, expected: 1, label: 'Gerçek Dışılık / Sanrısal Düşünce' },
  { id: 69, expected: 1, label: 'Bedensel Ağrı' },
  { id: 85, expected: 1, label: 'Dürtü Kontrolü / Aşırma İsteği' },
  { id: 114, expected: 1, label: 'Bedensel/Organik Belirti' },
  { id: 121, expected: 1, label: 'Gerçek Dışılık / Sanrısal Düşünce' },
  { id: 123, expected: 1, label: 'Şüphecilik / Alınganlık' },
  { id: 139, expected: 1, label: 'Kendine/Başkasına Zarar Verme' },
  { id: 146, expected: 1, label: 'Sosyal Aktivite İhtiyacı' },
  { id: 151, expected: 1, label: 'Zehirlenme Sanrısı / Şüphecilik' },
  { id: 156, expected: 1, label: 'Bedensel/Organik Belirti' },
  { id: 168, expected: 1, label: 'Bilişsel Karmaşa' },
  { id: 179, expected: 1, label: 'Cinsel Sıkıntı' },
  { id: 182, expected: 1, label: 'Fobik Kaygı' },
  { id: 184, expected: 1, label: 'Ruhsal Kontrol Kaybı' },
  { id: 200, expected: 1, label: 'Gerçek Dışılık / Sanrısal Düşünce' },
  { id: 202, expected: 1, label: 'İntihar Riski / Depresyon' },
  { id: 205, expected: 1, label: 'Sosyal Uyumsuzluk' },
  { id: 209, expected: 1, label: 'Depresif Karamsarlık' },
  { id: 215, expected: 1, label: 'Alkol/Madde Sorunları' },
  { id: 251, expected: 1, label: 'Bedensel/Organik Belirti' },
  { id: 275, expected: 1, label: 'Ruhsal Kontrol Kaybı' },
  { id: 291, expected: 1, label: 'Ruhsal Kontrol Kaybı' },
  { id: 293, expected: 1, label: 'Şüphecilik / Sanrısal Düşünce' },
  { id: 334, expected: 1, label: 'Algı Bozukluğu (Koku)' },
  { id: 337, expected: 1, label: 'Huzursuzluk / Anksiyete' },
  { id: 339, expected: 1, label: 'İntihar Riski / Depresyon' },
  { id: 345, expected: 1, label: 'Sanrısal Düşünce / Ruhsal Kayıp' },
  { id: 349, expected: 1, label: 'Şüphecilik / Sanrısal Düşünce' },
  { id: 350, expected: 1, label: 'Sanrısal Düşünce / Ruhsal Kayıp' },
  { id: 354, expected: 1, label: 'Kesici Alet Korkusu (Fobi)' },
  { id: 20, expected: 0, label: 'Cinsel Doyumsuzluk' },
  { id: 37, expected: 0, label: 'Cinsel Sorunlar' },
  { id: 133, expected: 0, label: 'Cinsel Uyumsuzluk' },
  { id: 74, expected: 1, label: 'Cinsel Uyumsuzluk / Kimlik Kaygısı', gender: 'Erkek' },
  { id: 74, expected: 0, label: 'Cinsel Uyumsuzluk / Kimlik Kaygısı', gender: 'Kadın' },
];

export type CriticalItemHit = {
  id: number;
  /** Verilen yanıt: 1 = D, 0 = Y. */
  response: 1 | 0;
  label: string;
};

/** Kritik madde tanımlarından cinsiyete uyan listeyi döndürür. */
export function criticalItemsForGender(gender: Gender): CriticalItemDef[] {
  return CRITICAL_ITEMS.filter(item => item.gender === undefined || item.gender === gender);
}

/** Yanıt haritasında tetiklenen kritik maddeleri bulur. */
export function findCriticalItems(responses: ResponseMap, gender: Gender): CriticalItemHit[] {
  const hits: CriticalItemHit[] = [];
  for (const def of criticalItemsForGender(gender)) {
    const value = responses[def.id];
    if (value === def.expected) hits.push({ id: def.id, response: value as 1 | 0, label: def.label });
  }
  return hits.sort((a, b) => a.id - b.id);
}

/* ------------------------------------------------------------------ */
/* Klinik izlenimler                                                    */
/* ------------------------------------------------------------------ */

export type ImpressionTone = 'ok' | 'watch' | 'alert';

export type ClinicalImpression = {
  title: string;
  text: string;
  tone: ImpressionTone;
};

export type ImpressionInput = {
  /** Yuvarlanmış T puanları. */
  t: Record<string, number>;
  /** Ham L ve K (tedaviye yanıt notu için). */
  lRaw: number;
  kRaw: number;
  /** Madde düzeyinde yanıtlar (yoksa madde bazlı bulgular atlanır). */
  responses?: ResponseMap;
  gender: Gender;
};

/**
 * Profilden türetilen klinik bulgular/uyarılar. Kaynak: klasik MMPI yorum
 * rehberlerindeki risk göstergeleri (Dahlstrom 1972; Clopton & Baucom 1979;
 * Ries 1966 — bazı ikincil kaynaklarda "Reis" yazımıyla anılır; Ceyhun
 * çalışmaları). Tanı değil, uzman için uyarı listesidir.
 */
export function clinicalImpressions(input: ImpressionInput): ClinicalImpression[] {
  const { t, lRaw, kRaw, responses, gender } = input;
  const get = (id: string) => t[id] ?? 50;
  const out: ClinicalImpression[] = [];

  const D = get('D');
  const Pt = get('Pt');
  const Hs = get('Hs');
  const Hy = get('Hy');
  const Pd = get('Pd');
  const Pa = get('Pa');
  const Sc = get('Sc');
  const Ma = get('Ma');
  const L = get('L');
  const F = get('F');
  const K = get('K');

  /* --- İntihar riski göstergeleri --- */
  if (D >= 70 && Pt >= 70) {
    out.push({
      title: 'Klinik İntihar Riski Uyarısı (D & Pt Yükselmesi)',
      text: 'Depresyon (D) ve Psikasteni (Pt) ölçeklerinin ikisinde birden 70 T üzerindeki yükselme, belirgin içsel gerilim ve çaresizlik hissiyle birlikte intihar riskinin arttığına işaret edebilir (Dahlstrom 1972). İntihar girişiminde bulunmuş bireyler her zaman açık depresyon veya anksiyete sergilemeyebilir; benlik değerinde ciddi düşüklük ve kendini cezalandırma eğilimi aranmalıdır. Yakın takip ve güvenlik önlemleri önerilir.',
      tone: 'alert',
    });
  } else if (D >= 70) {
    out.push({
      title: 'Klinik İntihar Riski Uyarısı (Maskelenmiş Depresyon)',
      text: 'Depresyon (D) ölçeğinin tek başına 70 T üzerinde yükselmesi durumunda, birey sözel olarak depresif düşünceleri ve çökkün duyguları inkâr etse dahi intihar riskinin yüksek olabileceği dikkate alınmalıdır. Maskelenmiş veya ajite depresyon durumunun klinik görüşmeyle derinlemesine incelenmesi önerilir.',
      tone: 'alert',
    });
  }

  const clinicalOrder = ['Hs', 'D', 'Hy', 'Pd', 'Pa', 'Pt', 'Sc', 'Ma'] as const;
  const sorted = [...clinicalOrder].sort((a, b) => get(b) - get(a));
  const [first, second] = sorted;
  if (((first === 'Pt' && second === 'Sc') || (first === 'Sc' && second === 'Pt')) && Hs >= 60 && D >= 60) {
    out.push({
      title: 'Klinik İntihar Riski Uyarısı (78/87 Kod Tipi & Somatik Yükselme)',
      text: 'Profilde 7 (Pt) ve 8 (Sc) yükselmesine (78/87 kod tipi) 1 (Hs) ve 2 (D) ölçeklerinin de eşlik etmesi, intihar girişimi riskinin anlamlı düzeyde yüksek olduğunu gösterir (Clopton & Baucom 1979). Dürtüsel davranış potansiyeli ve kendine zarar verme riski yönünden yakın gözlem gereklidir.',
      tone: 'alert',
    });
  }

  /* --- Kritik madde bulguları --- */
  if (responses) {
    const suicideItem = responses[339] === 1 || responses[202] === 1;
    const harmItem = responses[139] === 1;
    if (suicideItem) {
      out.push({
        title: 'Kritik Madde Uyarısı (İntihar / Depresyon)',
        text: 'İntihar riski veya depresyon ile ilişkili kritik maddelerden biri veya ikisi birden (Madde 202 veya Madde 339) doğrulanmıştır. Klinik değerlendirme ve yakın takip önerilir.',
        tone: 'alert',
      });
    }
    if (harmItem) {
      out.push({
        title: 'Kritik Madde Uyarısı (Kendine/Başkasına Zarar)',
        text: 'Kendine veya başkasına zarar verme ile ilişkili kritik madde (Madde 139) doğrulanmıştır. Güvenlik önlemleri açısından klinik değerlendirme yapılması önerilir.',
        tone: 'alert',
      });
    }
  }

  /* --- Geçerlik ölçeklerine bağlı bulgular --- */
  if (lRaw >= 7) {
    out.push({
      title: 'L Ölçeği Bulgusu',
      text: 'L ölçeğinden alınan 7 ve üzeri ham puan, dürüst yanıt vermeyerek kendini olduğundan daha iyi gösterme çabasına veya savunucu davranış şüphesine işaret edebilir.',
      tone: 'watch',
    });
  }

  if (L >= 60 && Pa >= 60 && Pa >= Hs && Pa >= D && Pa >= Hy && Pa >= Pd && Pa >= Pt && Pa >= Sc && Pa >= Ma) {
    out.push({
      title: 'Geçerlik-Klinik İlişkisi (L + Pa)',
      text: 'L ölçeğinin yüksekliğine eşlik eden belirgin Pa (Paranoya) yüksekliği, bireyin bazı klinik gerçekleri ve paranoyak düşüncelerini inkâr/yadsıma eğiliminde olduğunu düşündürür.',
      tone: 'watch',
    });
  }

  if (L >= 70 && (Hs >= 60 || D >= 60 || Hy >= 60)) {
    out.push({
      title: 'L ve Nevrotik Ölçek İlişkisi',
      text: "L ölçeğindeki belirgin yükselmeye (T ≥ 70) nevrotik ölçeklerdeki yükselmenin eşlik etmesi, bireyin pasif, içe kapanık, kaygılı ve duruma özgü tepkilerinin yavaş olduğunu; sosyal kabul çabasıyla birlikte sorunlarını inkâr ettiğini yansıtabilir.",
      tone: 'watch',
    });
  }

  if (F >= 80 && D > Pa && D > Sc && D > Ma && Pt > Pa && Pt > Sc && Pt > Ma) {
    out.push({
      title: 'F Ölçeği Bulgusu (Yardım Çağrısı)',
      text: "F ölçeğinin 80 T puanını aşmasına eşlik eden belirgin D ve Pt yükseklikleri (Pa, Sc ve Ma'ya kıyasla), bireyin içsel sıkıntısını abartılı bir şekilde dile getirdiği bir 'yardım çağrısı' (cry for help) profiline işaret edebilir.",
      tone: 'watch',
    });
  }

  if (F >= 80 && (Pa >= 70 || Sc >= 70) && Hs < 70 && Pd < 70) {
    out.push({
      title: 'F Ölçeği Bulgusu (Ciddi Psikopatoloji)',
      text: 'F ölçeğindeki belirgin yükselmeyle (T ≥ 80) birlikte 6 (Pa) ve 8 (Sc) ölçeklerinin yükselmesi, bireyde düşünce bozukluğu, ego işlevselliğinde bozulma veya akut psikotik süreçlerin varlığına işaret edebilir.',
      tone: 'alert',
    });
  }

  if (K >= 70 && Math.max(Hs, D, Hy, Pd, Pa, Pt, Sc, Ma) < 60) {
    out.push({
      title: 'K Ölçeği Bulgusu (Maskelenmiş Psikopatoloji)',
      text: 'K ölçeğindeki belirgin yüksekliğe (T ≥ 70) karşın klinik ölçeklerin normal sınırlarda kalması, aşırı savunucu tutuma (sorunları inkâr/maskeleme) bağlı olarak altta yatan gizli bir sürecin maskelenmiş olabileceğini düşündürür. Klinik görüşme ile derinleştirilmesi önerilir.',
      tone: 'watch',
    });
  }

  /* --- Tedaviye yanıt notu --- */
  out.push(
    kRaw <= 15
      ? {
          title: 'Tedaviye Yanıt Notu',
          text: 'K ham puanının 15 ve altında olması, klinik olarak iyileşme oranının ve tedaviye/psikolojik müdahaleye olumlu yanıt verme olasılığının anlamlı derecede yüksek olduğuna işaret eder.',
          tone: 'ok',
        }
      : {
          title: 'Tedaviye Yanıt Notu',
          text: "K ham puanının 15'in üzerinde olması, bireyin psikolojik müdahalelere karşı savunmalarının daha katı olduğunu ve iyileşme sürecinin daha fazla zaman alabileceğini gösterir.",
          tone: 'watch',
        },
  );

  void gender;
  return out;
}
