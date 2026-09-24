/**
 * Beck Depresyon Envanteri (BDI / BDO) — 21 Madde Değerlendirme & Yorumlama Motoru
 * Beck, Ward, Mendelson, Mock & Erbaugh (1961); Hisli (1988, 1989) Türk Uyarlaması
 * Halil Karaduman · Uzman Psikolog & Geliştirici
 */

import type { BeckDepressionResult, BeckDepressionSeverity, Gender } from './clinicalTypes';

export interface BeckQuestionOption {
  score: number;
  text: string;
}

export interface BeckQuestion {
  id: number;
  title: string;
  options: BeckQuestionOption[];
  category: 'cognitive_affective' | 'somatic_performance';
  critical?: boolean;
}

export const BECK_DEPRESSION_QUESTIONS: BeckQuestion[] = [
  {
    id: 1,
    title: 'Hüzün / Üzüntü',
    category: 'cognitive_affective',
    options: [
      { score: 0, text: 'Kendimi üzüntülü ve kederli hissetmiyorum.' },
      { score: 1, text: 'Kendimi üzüntülü ve kederli hissediyorum.' },
      { score: 2, text: 'Her zaman üzüntülü ve kederliyim; bundan kurtulamıyorum.' },
      { score: 3, text: 'O kadar üzgün ve kederliyim ki artık dayanamıyorum.' },
    ],
  },
  {
    id: 2,
    title: 'Geleceğe Bakış / Karamsarlık',
    category: 'cognitive_affective',
    options: [
      { score: 0, text: 'Gelecek hakkında umutsuz ve karamsar değilim.' },
      { score: 1, text: 'Gelecek hakkında karamsarım.' },
      { score: 2, text: 'Gelecekten beklediğim hiçbir şey yok.' },
      { score: 3, text: 'Geleceğim hakkında hiçbir umudum yok ve durumumun düzeleceğine inanmıyorum.' },
    ],
  },
  {
    id: 3,
    title: 'Başarısızlık Duygusu',
    category: 'cognitive_affective',
    options: [
      { score: 0, text: 'Kendimi başarısız bir insan olarak görmüyorum.' },
      { score: 1, text: 'Çevremdeki insanlardan daha çok başarısızlıklarım olmuş gibi hissediyorum.' },
      { score: 2, text: 'Geçmişe baktığımda başarısızlıklarla dolu olduğunu görüyorum.' },
      { score: 3, text: 'Kendimi tamamen başarısız bir insan olarak görüyorum.' },
    ],
  },
  {
    id: 4,
    title: 'Doyumsuzluk / Zevk Alamama',
    category: 'cognitive_affective',
    options: [
      { score: 0, text: 'Her şeyden eskisi kadar zevk alabiliyorum.' },
      { score: 1, text: 'Eskiden olduğu gibi her şeyden zevk alamıyorum.' },
      { score: 2, text: 'Artık hiçbir şeyden gerçek bir doyum ve zevk alamıyorum.' },
      { score: 3, text: 'Her şeyden sıkılıyorum ve hiçbir şey bana zevk vermiyor.' },
    ],
  },
  {
    id: 5,
    title: 'Suçluluk Duygusu',
    category: 'cognitive_affective',
    options: [
      { score: 0, text: 'Kendimi herhangi bir biçimde suçlu hissetmiyorum.' },
      { score: 1, text: 'Kendimi zaman zaman suçlu hissediyorum.' },
      { score: 2, text: 'Kendimi çoğu zaman oldukça suçlu hissediyorum.' },
      { score: 3, text: 'Kendimi her zaman çok suçlu hissediyorum.' },
    ],
  },
  {
    id: 6,
    title: 'Cezalandırılma Beklentisi',
    category: 'cognitive_affective',
    options: [
      { score: 0, text: 'Cezalandırılacağımı düşünmüyorum.' },
      { score: 1, text: 'Sanki cezalandırılacakmışım gibi geliyor.' },
      { score: 2, text: 'Cezalandırılmayı bekliyorum.' },
      { score: 3, text: 'Cezalandırıldığımı hissediyorum.' },
    ],
  },
  {
    id: 7,
    title: 'Kendinden Nefret / Hayal Kırıklığı',
    category: 'cognitive_affective',
    options: [
      { score: 0, text: 'Kendimden hoşnutum ve kendimi beğeniyorum.' },
      { score: 1, text: 'Kendimden pek hoşnut değilim / hayal kırıklığına uğramış durumdayım.' },
      { score: 2, text: 'Kendime çok kızıyorum / kendimden nefret ediyorum.' },
      { score: 3, text: 'Kendimden tamamen nefret ediyorum.' },
    ],
  },
  {
    id: 8,
    title: 'Kendini Suçlama',
    category: 'cognitive_affective',
    options: [
      { score: 0, text: 'Kötü giden şeylerde kendimi diğer insanlardan daha çok suçlamıyorum.' },
      { score: 1, text: 'Zayıflıklarım veya hatalarım için kendimi suçluyorum.' },
      { score: 2, text: 'Hatalarım için her zaman kendimi suçlarım.' },
      { score: 3, text: 'Olan her kötü şey için kendimi suçluyorum.' },
    ],
  },
  {
    id: 9,
    title: 'İntihar Düşünceleri (Kritik Madde)',
    category: 'cognitive_affective',
    critical: true,
    options: [
      { score: 0, text: 'Kendimi öldürmek gibi bir düşüncem yok.' },
      { score: 1, text: 'Zaman zaman kendimi öldürmeyi düşündüğüm oluyor ama bunu yapmam.' },
      { score: 2, text: 'Kendimi öldürmek isterdim.' },
      { score: 3, text: 'Fırsatını bulursam kendimi öldürürüm.' },
    ],
  },
  {
    id: 10,
    title: 'Ağlama Nöbetleri',
    category: 'cognitive_affective',
    options: [
      { score: 0, text: 'Her zamankinden fazla ağlamıyorum.' },
      { score: 1, text: 'Şimdi eskisinden daha çok ağlıyorum.' },
      { score: 2, text: 'Şu sıralarda her an ağlayabilirim / sürekli ağlıyorum.' },
      { score: 3, text: 'Eskiden ağlayabilirdim ama şimdi istesem de ağlayamıyorum.' },
    ],
  },
  {
    id: 11,
    title: 'Huzursuzluk / Ajitasyon',
    category: 'cognitive_affective',
    options: [
      { score: 0, text: 'Her zamankinden daha sinirli ve huzursuz değilim.' },
      { score: 1, text: 'Eskisine kıyasla daha kolay sinirleniyor ve kızıyorum.' },
      { score: 2, text: 'Çoğu zaman kendimi çok sinirli ve huzursuz hissediyorum.' },
      { score: 3, text: 'Beni sinirlendiren şeylere artık hiç tepki veremiyorum / donup kalıyorum.' },
    ],
  },
  {
    id: 12,
    title: 'Sosyal İlgi / İçe Çekilme',
    category: 'cognitive_affective',
    options: [
      { score: 0, text: 'Diğer insanlarla görüşme isteğimi kaybetmedim.' },
      { score: 1, text: 'İnsanlarla eskisi kadar görüşmek istemiyorum.' },
      { score: 2, text: 'İnsanlarla olan ilişkilerimi büyük ölçüde kaybettim.' },
      { score: 3, text: 'İnsanlarla görüşmek hiç istemiyorum; kimseyle konuşmak istemiyorum.' },
    ],
  },
  {
    id: 13,
    title: 'Karar Verme Güçlüğü',
    category: 'cognitive_affective',
    options: [
      { score: 0, text: 'Eskiden olduğu kadar kolay karar verebiliyorum.' },
      { score: 1, text: 'Eskiden olduğu gibi kolay karar veremiyorum; erteliyorum.' },
      { score: 2, text: 'Karar verirken eskisine göre çok büyük güçlük çekiyorum.' },
      { score: 3, text: 'Artık hiçbir konuda karar veremiyorum.' },
    ],
  },
  {
    id: 14,
    title: 'Beden Algısı / Görünüm',
    category: 'somatic_performance',
    options: [
      { score: 0, text: 'Görünüşümün eskisinden daha kötü olduğunu düşünmüyorum.' },
      { score: 1, text: 'Yaşlandığımı ve çekici görünmediğimi düşünüp endişeleniyorum.' },
      { score: 2, text: 'Görünüşümde çekiciliğimi yok eden kalıcı değişiklikler olduğunu hissediyorum.' },
      { score: 3, text: 'Kendimi çok çirkin buluyorum.' },
    ],
  },
  {
    id: 15,
    title: 'Çalışma Gücü / Verimlilik',
    category: 'somatic_performance',
    options: [
      { score: 0, text: 'Eskisi kadar iyi çalışabiliyorum.' },
      { score: 1, text: 'Bir şeyler yapabilmek için fazladan gayret göstermem gerekiyor.' },
      { score: 2, text: 'Herhangi bir işi yapabilmek için kendimi çok zorlamam gerekiyor.' },
      { score: 3, text: 'Hiçbir iş yapamıyorum.' },
    ],
  },
  {
    id: 16,
    title: 'Uyku Düzeni',
    category: 'somatic_performance',
    options: [
      { score: 0, text: 'Her zamanki gibi rahat uyuyabiliyorum.' },
      { score: 1, text: 'Eskisi kadar rahat uyuyamıyorum.' },
      { score: 2, text: 'Her zamankinden 1-2 saat erken uyanıyorum ve tekrar uyuyamıyorum.' },
      { score: 3, text: 'Her zamankinden çok erken uyanıyorum ve artık hiç uyuyamıyorum.' },
    ],
  },
  {
    id: 17,
    title: 'Yorgunluk / Enerji Kaybı',
    category: 'somatic_performance',
    options: [
      { score: 0, text: 'Her zamankinden daha çabuk yorulmuyorum.' },
      { score: 1, text: 'Eskisinden daha çabuk ve kolay yoruluyorum.' },
      { score: 2, text: 'Neredeyse her şey beni çok çabuk yoruyor.' },
      { score: 3, text: 'Kendimi hiçbir şey yapamayacak kadar yorgun hissediyorum.' },
    ],
  },
  {
    id: 18,
    title: 'İştah Değişimi',
    category: 'somatic_performance',
    options: [
      { score: 0, text: 'İştahım her zamanki gibi.' },
      { score: 1, text: 'İştahım eskisi kadar iyi değil.' },
      { score: 2, text: 'İştahım çok azaldı / çok kötü.' },
      { score: 3, text: 'Artık hiç iştahım yok / hiçbir şey yiyemiyorum.' },
    ],
  },
  {
    id: 19,
    title: 'Kilo Kaybı',
    category: 'somatic_performance',
    options: [
      { score: 0, text: 'Son zamanlarda pek kilo kaybetmedim.' },
      { score: 1, text: 'İki kilodan fazla kilo verdim.' },
      { score: 2, text: 'Dört kilodan fazla kilo verdim.' },
      { score: 3, text: 'Altı kilodan fazla kilo verdim (diyet yapmaksızın).' },
    ],
  },
  {
    id: 20,
    title: 'Somatik Kaygı / Sağlık Endişesi',
    category: 'somatic_performance',
    options: [
      { score: 0, text: 'Sağlığım hakkında eskisinden daha fazla endişelenmiyorum.' },
      { score: 1, text: 'Ağrı, sancı, mide bozukluğu veya kabızlık gibi belirtiler beni endişelendiriyor.' },
      { score: 2, text: 'Sağlığım beni çok endişelendiriyor; başka şeyleri düşünmekte zorlanıyorum.' },
      { score: 3, text: 'Sağlığım hakkında o kadar çok endişeleniyorum ki başka hiçbir şey düşünemiyorum.' },
    ],
  },
  {
    id: 21,
    title: 'Cinsel İstek / Libido',
    category: 'somatic_performance',
    options: [
      { score: 0, text: 'Cinsel ilgimde son zamanlarda bir değişiklik olmadı.' },
      { score: 1, text: 'Cinsel konularla eskisinden daha az ilgileniyorum.' },
      { score: 2, text: 'Cinsel ilgim oldukça azaldı.' },
      { score: 3, text: 'Cinsel ilgimi tamamen kaybettim.' },
    ],
  },
];

export function calculateBeckDepression(
  answers: number[],
  clientInfo: { name: string; gender: Gender; age?: number; clientId?: string; testDate?: string }
): BeckDepressionResult {
  const safeAnswers = answers.slice(0, 21);
  while (safeAnswers.length < 21) safeAnswers.push(0);

  let totalScore = 0;
  let cognitiveAffectiveScore = 0;
  let somaticPerformanceScore = 0;

  safeAnswers.forEach((score, index) => {
    const val = Math.max(0, Math.min(3, score || 0));
    totalScore += val;
    if (index < 13) {
      cognitiveAffectiveScore += val;
    } else {
      somaticPerformanceScore += val;
    }
  });

  const suicideItemScore = safeAnswers[8] || 0; // Item 9 (0-indexed 8)
  const suicideRisk = suicideItemScore > 0;

  let severity: BeckDepressionSeverity = 'Minimal';
  if (totalScore >= 30) severity = 'Şiddetli';
  else if (totalScore >= 17) severity = 'Orta';
  else if (totalScore >= 10) severity = 'Hafif';
  else severity = 'Minimal';

  let interpretation = '';
  if (severity === 'Minimal') {
    interpretation =
      'Danışanın BDI toplam puanı (' +
      totalScore +
      '/63) normal / minimal düzeydedir. Klinik düzeyde belirgin bir depresif tablo saptanmamıştır. Günlük işlevsellik olağan sınırlardadır.';
  } else if (severity === 'Hafif') {
    interpretation =
      'Danışanın BDI toplam puanı (' +
      totalScore +
      '/63) hafif düzeyde depresif belirtilere işaret etmektedir. Karamsarlık, motivasyon kaybı veya uyku/yorgunluk dalgalanmaları görülebilir. Koruyucu psikoterapi ve psikoeğitim önerilir.';
  } else if (severity === 'Orta') {
    interpretation =
      'Danışanın BDI toplam puanı (' +
      totalScore +
      '/63) klinik olarak anlamlı orta düzeyde depresyona işaret etmektedir. Anhedoni, suçluluk duyguları, karamsarlık ve somatik belirtiler belirgindir. Yapılandırılmış Bilişsel Davranışçı Terapi (BDT) ve gerektiğinde psikiyatrik değerlendirme düşünülmelidir.';
  } else {
    interpretation =
      'Danışanın BDI toplam puanı (' +
      totalScore +
      '/63) şiddetli depresif epizod göstergeleri taşımaktadır. Çökkün duygu durum, derin umutsuzluk, psikomotor yavaşlama ve enerji kaybı yoğun düzeydedir. Acil psikiyatrik konsültasyon ve farmakoterapi desteği ile birlikte yakın psikoterapötik takip gereklidir.';
  }

  if (suicideRisk) {
    interpretation +=
      ' [KRİTİK GÜVENLİK UYARISI: Danışan Madde 9 (İntihar Düşünceleri) maddesinde ' +
      suicideItemScore +
      ' puan vermiştir. İntihar risk değerlendirmesi yapılmalı ve güvenlik protokolü işletilmelidir!]';
  }

  return {
    id: 'bdi_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
    clientId: clientInfo.clientId,
    clientName: clientInfo.name,
    clientGender: clientInfo.gender,
    clientAge: clientInfo.age,
    testDate: clientInfo.testDate || new Date().toISOString().split('T')[0]!,
    answers: safeAnswers,
    totalScore,
    severity,
    cognitiveAffectiveScore,
    somaticPerformanceScore,
    suicideRisk,
    suicideItemScore,
    clinicalInterpretation: interpretation,
    createdAt: new Date().toISOString(),
  };
}
