/**
 * Beck Anksiyete Envanteri (BAI / BAO) — 21 Belirti Değerlendirme & Yorumlama Motoru
 * Beck, Epstein, Brown & Steer (1988); Ulusoy, Şahin & Erkmen (1998) Türk Uyarlaması
 * Halil Karaduman · Uzman Psikolog & Geliştirici
 */

import type { BeckAnxietyResult, BeckAnxietySeverity, Gender } from './clinicalTypes';
import { clinicToday } from './recordRules';

export interface BeckAnxietySymptom {
  id: number;
  title: string;
  category: 'subjective' | 'neurovegetative' | 'autonomic' | 'motor';
}

export const BECK_ANXIETY_SYMPTOMS: BeckAnxietySymptom[] = [
  { id: 1, title: 'Bedenin herhangi bir yerinde uyuşma veya karıncalanma', category: 'neurovegetative' },
  { id: 2, title: 'Sıcak / alev basmaları', category: 'autonomic' },
  { id: 3, title: 'Bacaklarda halsizlik, titreme veya dermansızlık', category: 'motor' },
  { id: 4, title: 'Gevşeyememe, rahatlayamama', category: 'subjective' },
  { id: 5, title: 'Çok kötü şeyler olacak korkusu', category: 'subjective' },
  { id: 6, title: 'Baş dönmesi veya sersemlik hissi', category: 'neurovegetative' },
  { id: 7, title: 'Kalp çarpıntısı veya kalbin hızla çarpması', category: 'autonomic' },
  { id: 8, title: 'Dengeyi kaybetme veya düşecek gibi olma', category: 'motor' },
  { id: 9, title: 'Dehşete kapılma, panik hissi', category: 'subjective' },
  { id: 10, title: 'Sinirlilik, gerginlik veya tedirginlik', category: 'subjective' },
  { id: 11, title: 'Boğuluyormuş gibi hissetme / nefes darlığı', category: 'neurovegetative' },
  { id: 12, title: 'Ellerde titreme', category: 'motor' },
  { id: 13, title: 'Titreklik veya sarsıntı hissi', category: 'motor' },
  { id: 14, title: 'Kontrolü kaybetme korkusu', category: 'subjective' },
  { id: 15, title: 'Nefes almada güçlük çekme', category: 'neurovegetative' },
  { id: 16, title: 'Ölüm korkusu', category: 'subjective' },
  { id: 17, title: 'Korkuya kapılma', category: 'subjective' },
  { id: 18, title: 'Midede hazımsızlık, rahatsızlık veya bulantı', category: 'autonomic' },
  { id: 19, title: 'Baygınlık hissi / bayılacak gibi olma', category: 'neurovegetative' },
  { id: 20, title: 'Yüzün kızarması', category: 'autonomic' },
  { id: 21, title: 'Soğuk veya sıcak terlemeler', category: 'autonomic' },
];

export const BAI_SEVERITY_OPTIONS = [
  { score: 0, label: '0 - Hiç', desc: 'Beni hiç rahatsız etmedi' },
  { score: 1, label: '1 - Hafif', desc: 'Beni pek fazla rahatsız etmedi' },
  { score: 2, label: '2 - Orta', desc: 'Beni oldukça rahatsız etti ama katlanabildim' },
  { score: 3, label: '3 - Ciddi', desc: 'Beni çok fazla rahatsız etti; neredeyse dayanamadım' },
];

export function calculateBeckAnxiety(
  answers: number[],
  clientInfo: { name: string; gender: Gender; age?: number; clientId?: string; testDate?: string }
): BeckAnxietyResult {
  const safeAnswers = answers.slice(0, 21);
  while (safeAnswers.length < 21) safeAnswers.push(0);

  let totalScore = 0;
  let subjectiveScore = 0;
  let neurovegetativeScore = 0;
  let autonomicScore = 0;
  let motorScore = 0;

  safeAnswers.forEach((score, index) => {
    const val = Math.max(0, Math.min(3, score || 0));
    totalScore += val;
    const cat = BECK_ANXIETY_SYMPTOMS[index]?.category || 'subjective';
    if (cat === 'subjective') subjectiveScore += val;
    else if (cat === 'neurovegetative') neurovegetativeScore += val;
    else if (cat === 'autonomic') autonomicScore += val;
    else if (cat === 'motor') motorScore += val;
  });

  let severity: BeckAnxietySeverity = 'Minimal';
  if (totalScore >= 26) severity = 'Şiddetli';
  else if (totalScore >= 16) severity = 'Orta';
  else if (totalScore >= 8) severity = 'Hafif';
  else severity = 'Minimal';

  let interpretation = '';
  if (severity === 'Minimal') {
    interpretation =
      'Danışanın BAI toplam puanı (' +
      totalScore +
      '/63) normal / minimal düzeydedir. Klinik düzeyde anksiyete tablosu saptanmamıştır. Somatik ve otonomik uyarılma olağan seviyededir.';
  } else if (severity === 'Hafif') {
    interpretation =
      'Danışanın BAI toplam puanı (' +
      totalScore +
      '/63) hafif düzeyde anksiyeteye işaret etmektedir. Zaman zaman ortaya çıkan bedensel gerginlik ve endişe durumları mevcuttur. Gevşeme egzersizleri ve BDT temelli kaygı yönetimi önerilir.';
  } else if (severity === 'Orta') {
    interpretation =
      'Danışanın BAI toplam puanı (' +
      totalScore +
      '/63) klinik olarak anlamlı orta düzeyde anksiyete düzeyine işaret etmektedir. Çarpıntı, nefes darlığı, kontrol kaybı korkusu gibi otonomik ve bilişsel semptomlar gün içinde yoğunlaşabilmektedir. Yapılandırılmış anksiyete terapisi protokolleri (maruz bırakma, bilişsel yeniden yapılandırma) uygulanmalıdır.';
  } else {
    interpretation =
      'Danışanın BAI toplam puanı (' +
      totalScore +
      '/63) şiddetli anksiyete ve panik uyarılması düzeyindedir. Yüksek otonomik reaktivite, yoğun dehşet ve ölüm/kontrol kaybı korkuları günlük yaşamı ciddi derecede kısıtlamaktadır. Psikiyatrik farmakoterapi konsültasyonu ile eş zamanlı acil psikoterapi desteği gereklidir.';
  }

  return {
    id: 'bai_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
    clientId: clientInfo.clientId,
    clientName: clientInfo.name,
    clientGender: clientInfo.gender,
    clientAge: clientInfo.age,
    testDate: clientInfo.testDate || clinicToday(),
    answers: safeAnswers,
    totalScore,
    severity,
    subjectiveScore,
    neurovegetativeScore,
    autonomicScore,
    motorScore,
    clinicalInterpretation: interpretation,
    createdAt: new Date().toISOString(),
  };
}
