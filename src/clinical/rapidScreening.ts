/**
 * Hızlı Klinik Tarama Araçları: GAD-7 (Yaygın Anksiyete) & PHQ-9 (Hasta Sağlık Anketi)
 * Spitzer, Kroenke, Williams et al. (2006); Konkan et al. (2013) / Sarı et al. (2016) Türk Uyarlamaları
 * Halil Karaduman · Uzman Psikolog & Geliştirici
 */

import { clinicToday } from './recordRules';

export interface RapidQuestion {
  id: number;
  text: string;
}

export const GAD7_QUESTIONS: RapidQuestion[] = [
  { id: 1, text: 'Sinirli, endişeli veya tedirgin hissetme' },
  { id: 2, text: 'Endişelenmeyi durduramama veya kontrol edememe' },
  { id: 3, text: 'Farklı konular hakkında aşırı endişelenme' },
  { id: 4, text: 'Rahatlamakta / gevşemekte güçlük çekme' },
  { id: 5, text: 'O kadar huzursuz olma ki yerinde oturamama' },
  { id: 6, text: 'Kolayca sinirlenme veya canının sıkılması' },
  { id: 7, text: 'Sanki kötü bir şey olacakmış gibi korku hissetme' },
];

export const PHQ9_QUESTIONS: RapidQuestion[] = [
  { id: 1, text: 'İş yapmaya karşı azalan ilgi veya zevk alamama' },
  { id: 2, text: 'Kendini çökkün, moralsiz veya umutsuz hissetme' },
  { id: 3, text: 'Uykuya dalmada güçlük, uykuyu sürdürememe veya aşırı uyuma' },
  { id: 4, text: 'Kendini yorgun veya enerjisiz hissetme' },
  { id: 5, text: 'İştahsızlık veya aşırı yeme' },
  { id: 6, text: 'Kendini kötü hissetme; başarısız biri olduğunu veya aileyi hayal kırıklığına uğrattığını düşünme' },
  { id: 7, text: 'Gazete okuma veya televizyon izleme gibi şeylere odaklanmada güçlük çekme' },
  { id: 8, text: 'Başkalarının fark edebileceği kadar yavaş hareket etme / konuşma veya yerinde duramayacak kadar kıpır kıpır olma' },
  { id: 9, text: 'Ölmenin daha iyi olacağı veya kendine bir şekilde zarar verme düşünceleri' },
];

export const RAPID_SCALE_OPTIONS = [
  { score: 0, label: '0 - Hiç', desc: 'Son 2 haftada hiç' },
  { score: 1, label: '1 - Birkaç gün', desc: 'Birkaç gün oldu' },
  { score: 2, label: '2 - Günlerin yarısından fazla', desc: 'Günlerin yarısından fazlasında' },
  { score: 3, label: '3 - Neredeyse her gün', desc: 'Hemen hemen her gün' },
];

export interface RapidScreeningResult {
  id: string;
  type: 'gad7' | 'phq9';
  clientId?: string;
  clientName: string;
  testDate: string;
  answers: number[];
  totalScore: number;
  severity: string;
  suicideRisk?: boolean;
  clinicalNote: string;
  createdAt: string;
}

export function calculateGad7(
  answers: number[],
  clientInfo: { name: string; clientId?: string; testDate?: string }
): RapidScreeningResult {
  const safe = answers.slice(0, 7);
  while (safe.length < 7) safe.push(0);

  const totalScore = safe.reduce((a, b) => a + (Math.max(0, Math.min(3, b || 0))), 0);

  let severity = 'Minimal';
  if (totalScore >= 15) severity = 'Şiddetli Anksiyete';
  else if (totalScore >= 10) severity = 'Orta Düzey Anksiyete';
  else if (totalScore >= 5) severity = 'Hafif Anksiyete';
  else severity = 'Minimal Anksiyete';

  let note = `GAD-7 Toplam Puanı: ${totalScore}/21 (${severity}).`;
  if (totalScore >= 10) {
    note += ' Yaygın Anksiyete Bozukluğu için klinik değerlendirme ve yapılandırılmış terapi protokolü önerilir.';
  }

  return {
    id: 'gad7_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
    type: 'gad7',
    clientId: clientInfo.clientId,
    clientName: clientInfo.name,
    testDate: clientInfo.testDate || clinicToday(),
    answers: safe,
    totalScore,
    severity,
    clinicalNote: note,
    createdAt: new Date().toISOString(),
  };
}

export function calculatePhq9(
  answers: number[],
  clientInfo: { name: string; clientId?: string; testDate?: string }
): RapidScreeningResult {
  const safe = answers.slice(0, 9);
  while (safe.length < 9) safe.push(0);

  const totalScore = safe.reduce((a, b) => a + (Math.max(0, Math.min(3, b || 0))), 0);
  const suicideItemScore = safe[8] || 0;
  const suicideRisk = suicideItemScore > 0;

  let severity = 'Minimal';
  if (totalScore >= 20) severity = 'Şiddetli Depresyon';
  else if (totalScore >= 15) severity = 'Belirgin / Orta-İleri Depresyon';
  else if (totalScore >= 10) severity = 'Orta Düzey Depresyon';
  else if (totalScore >= 5) severity = 'Hafif Depresyon';
  else severity = 'Minimal / Normal';

  let note = `PHQ-9 Toplam Puanı: ${totalScore}/27 (${severity}).`;
  if (totalScore >= 10) {
    note += ' Majör depresif semptom yükü mevcuttur; klinik değerlendirme ve BDT süreci önerilir.';
  }
  if (suicideRisk) {
    note += ` [DİKKAT: Madde 9 için ${suicideItemScore} puan bildirildi. İntihar risk protokolü işletilmelidir!]`;
  }

  return {
    id: 'phq9_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
    type: 'phq9',
    clientId: clientInfo.clientId,
    clientName: clientInfo.name,
    testDate: clientInfo.testDate || clinicToday(),
    answers: safe,
    totalScore,
    severity,
    suicideRisk,
    clinicalNote: note,
    createdAt: new Date().toISOString(),
  };
}
