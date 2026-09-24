/**
 * SCL-90-R (Belirti Tarama Listesi) — 90 Madde & 9 Boyut Değerlendirme Motoru
 * Derogatis (1977); Dağ (1991) Türk Standardizasyonu
 * Halil Karaduman · Uzman Psikolog & Geliştirici
 */

import type { Gender, Scl90DimensionScores, Scl90Result } from './clinicalTypes';

export interface Scl90Item {
  id: number;
  text: string;
}

export const SCL90_ITEMS: Scl90Item[] = [
  { id: 1, text: 'Baş ağrıları' },
  { id: 2, text: 'Sinirlilik veya içinizin titremesi' },
  { id: 3, text: 'Zihninizden atamadığınız, tekrarlayan ve hoşa gitmeyen düşünceler' },
  { id: 4, text: 'Baygınlık veya baş dönmesi hissi' },
  { id: 5, text: 'Cinsel ilgi veya arzunun kaybı' },
  { id: 6, text: 'Başkaları tarafından eleştirilme konusunda aşırı duyarlılık' },
  { id: 7, text: 'Başka birinin düşüncelerinizi kontrol edebileceği hissi' },
  { id: 8, text: 'Başınıza gelen dertlerden çoğunlukla başkalarının sorumlu olduğu hissi' },
  { id: 9, text: 'Olayları hatırlamakta güçlük çekme' },
  { id: 10, text: 'Dikkatsizlik ve savsaklama konusunda endişelenme' },
  { id: 11, text: 'Kolayca öfkelenme, sinirlenme veya canınızın sıkılması' },
  { id: 12, text: 'Göğüs veya kalp bölgesinde ağrılar' },
  { id: 13, text: 'Açık alanlardan veya sokaklardan korkma' },
  { id: 14, text: 'Düşük enerji veya halsizlik hissi' },
  { id: 15, text: 'Yaşamınıza son verme (intihar) düşünceleri' },
  { id: 16, text: 'Başkalarının duymadığı sesleri duyma' },
  { id: 17, text: 'Titreme' },
  { id: 18, text: 'Çoğu insana güvenilemeyeceği hissi' },
  { id: 19, text: 'İştahsızlık' },
  { id: 20, text: 'Kolayca ağlama' },
  { id: 21, text: 'Karşı cinsle ilişkilerde çekingenlik veya rahatsızlık hissi' },
  { id: 22, text: 'Tuzak kurulduğu veya yakalanmış gibi hissetme' },
  { id: 23, text: 'Belirgin bir neden yokken aniden korkuya kapılma' },
  { id: 24, text: 'Kontrol edemediğiniz öfke patlamaları' },
  { id: 25, text: 'Evden yalnız çıkmaktan korkma' },
  { id: 26, text: 'Olan her şey için kendini suçlama' },
  { id: 27, text: 'Bel ağrıları' },
  { id: 28, text: 'İşleri tamamlamada güçlük çekme ve tıkanma hissi' },
  { id: 29, text: 'Kendini yalnız hissetme' },
  { id: 30, text: 'Kendini kederli ve çökkün hissetme' },
  { id: 31, text: 'Her şey hakkında aşırı endişelenme' },
  { id: 32, text: 'Her şeye karşı ilgisizlik' },
  { id: 33, text: 'Korku hissi' },
  { id: 34, text: 'Duygularınızın kolayca incinmesi' },
  { id: 35, text: 'Başkalarının sizin gizli düşüncelerinizi bildiği hissi' },
  { id: 36, text: 'Başkalarının sizi anlamadığı veya anlayışsız davrandığı hissi' },
  { id: 37, text: 'İnsanların sizi sevmediği veya dostça davranmadığı hissi' },
  { id: 38, text: 'İşleri doğru yaptıklarından emin olmak için çok yavaş davranmak zorunda kalma' },
  { id: 39, text: 'Kalbin hızlı çarpması veya çarpıntı' },
  { id: 40, text: 'Mide bulantısı veya midede rahatsızlık' },
  { id: 41, text: 'Kendini diğer insanlardan daha aşağı hissetme' },
  { id: 42, text: 'Kas ağrıları' },
  { id: 43, text: 'Başkalarının sizi izlediği veya hakkınızda konuştuğu hissi' },
  { id: 44, text: 'Uykuya dalmakta güçlük çekme' },
  { id: 45, text: 'Yaptığınız işleri bir veya birkaç kez tekrar kontrol etme ihtiyacı' },
  { id: 46, text: 'Karar vermede güçlük çekme' },
  { id: 47, text: 'Otobüs, tren veya metroya binmekten korkma' },
  { id: 48, text: 'Nefes almakta güçlük çekme' },
  { id: 49, text: 'Sıcak veya soğuk basmaları' },
  { id: 50, text: 'Sizi korkutan belirli yer, durum veya nesnelerden kaçınma' },
  { id: 51, text: 'Zihnin bomboş kalması hissi' },
  { id: 52, text: 'Bedeninizin bazı bölümlerinde uyuşma veya karıncalanma' },
  { id: 53, text: 'Boğazda bir düğüm veya tıkanıklık hissi' },
  { id: 54, text: 'Gelecek hakkında umutsuzluk hissi' },
  { id: 55, text: 'Dikkati toplamakta güçlük çekme' },
  { id: 56, text: 'Bedeninizin bazı kısımlarında zayıflık veya kuvvetsizlik hissi' },
  { id: 57, text: 'Gergin veya aşırı uyarılmış hissetme' },
  { id: 58, text: 'Kollarda veya bacaklarda ağırlık hissi' },
  { id: 59, text: 'Ölüm veya ölenler hakkında düşünceler' },
  { id: 60, text: 'Aşırı yemek yeme' },
  { id: 61, text: 'İnsanlar size baktığında veya sizin hakkınızda konuştuğunda rahatsız olma' },
  { id: 62, text: 'Size ait olmayan düşüncelere sahip olma' },
  { id: 63, text: 'Birine vurma, zarar verme veya yaralama dürtüsü' },
  { id: 64, text: 'Sabahın çok erken saatlerinde uyanma' },
  { id: 65, text: 'Dokunma, sayma veya yıkama gibi hareketleri tekrarlamak zorunda kalma' },
  { id: 66, text: 'Huzursuz veya bölünmüş bir uyku uyuma' },
  { id: 67, text: 'Eşyaları kırma veya dökme isteği' },
  { id: 68, text: 'Başkalarının paylaşmadığı inanç ve düşüncelere sahip olma' },
  { id: 69, text: 'Başkalarının yanında kendini çok çekingen ve tutuk hissetme' },
  { id: 70, text: 'Kalabalık yerlerde rahatsızlık ve huzursuzluk hissetme' },
  { id: 71, text: 'Her şeyin büyük bir çaba gerektirdiği hissi' },
  { id: 72, text: 'Dehşet veya panik nöbetleri' },
  { id: 73, text: 'Toplum içinde yerken veya içerken rahatsız olma' },
  { id: 74, text: 'Sık sık tartışmaya girme' },
  { id: 75, text: 'Yalnız kaldığınızda gergin ve huzursuz hissetme' },
  { id: 76, text: 'Başkalarının başarılarınızı yeterince takdir etmediği hissi' },
  { id: 77, text: 'Başkalarıyla birlikteyken bile kendini yalnız hissetme' },
  { id: 78, text: 'Oldukça huzursuz olma ve bir yerde oturamama' },
  { id: 79, text: 'Değersizlik duyguları' },
  { id: 80, text: 'Kötü bir şey olacağı hissi' },
  { id: 81, text: 'Bağırma veya eşyaları fırlatma' },
  { id: 82, text: 'Topluluk içinde bayılmaktan korkma' },
  { id: 83, text: 'Fırsatını bulurlarsa insanların sizden yararlanacağı hissi' },
  { id: 84, text: 'Cinsellikle ilgili çok rahatsız edici düşünceler' },
  { id: 85, text: 'Günahlarınız için cezalandırılmanız gerektiği hissi' },
  { id: 86, text: 'İşlerin yolunda gitmeyeceği korkusu ve dehşet hissi' },
  { id: 87, text: 'Bedeninizde ciddi bir sorun olduğu hissi' },
  { id: 88, text: 'Başka insanlara hiçbir zaman yakın hissetmeme' },
  { id: 89, text: 'Suçluluk duygusu' },
  { id: 90, text: 'Aklınızda bir bozukluk olduğu hissi' },
];

export const SCL90_SCALE_OPTIONS = [
  { score: 0, label: '0 - Hiç', desc: 'Hiç yok' },
  { score: 1, label: '1 - Biraz', desc: 'Çok az var' },
  { score: 2, label: '2 - Orta', desc: 'Orta derecede' },
  { score: 3, label: '3 - Oldukça', desc: 'Oldukça fazla' },
  { score: 4, label: '4 - İleri Derecede', desc: 'Çok aşırı derecede' },
];

// Madde indeksleri (1 tabanlı)
const DIMENSION_MAP = {
  somatization: [1, 4, 12, 27, 40, 42, 48, 49, 52, 53, 56, 58],
  obsessiveCompulsive: [3, 9, 10, 28, 38, 45, 46, 51, 55, 65],
  interpersonalSensitivity: [6, 21, 34, 36, 37, 41, 61, 69, 73],
  depression: [5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79],
  anxiety: [2, 17, 23, 33, 39, 57, 72, 78, 80, 86],
  hostility: [11, 24, 63, 67, 74, 81],
  phobicAnxiety: [13, 25, 47, 50, 70, 75, 82],
  paranoidIdeation: [8, 18, 43, 68, 76, 83],
  psychoticism: [7, 16, 35, 62, 77, 84, 85, 87, 88, 90],
  additional: [19, 44, 59, 60, 64, 66, 89],
};

export const SCL90_DIMENSION_NAMES: Record<keyof Scl90DimensionScores, { tr: string; abbr: string }> = {
  somatization: { tr: 'Somatizasyon', abbr: 'SOM' },
  obsessiveCompulsive: { tr: 'Obsesif-Kompulsif', abbr: 'O-C' },
  interpersonalSensitivity: { tr: 'Kişilerarası Duyarlık', abbr: 'I-S' },
  depression: { tr: 'Depresyon', abbr: 'DEP' },
  anxiety: { tr: 'Anksiyete', abbr: 'ANX' },
  hostility: { tr: 'Öfke ve Düşmanlık', abbr: 'HOS' },
  phobicAnxiety: { tr: 'Fobik Anksiyete', abbr: 'PHOB' },
  paranoidIdeation: { tr: 'Paranoid Düşünce', abbr: 'PAR' },
  psychoticism: { tr: 'Psikotizm', abbr: 'PSY' },
  additional: { tr: 'Ek Maddeler (Uyku, İştah vb.)', abbr: 'ADD' },
};

export function calculateScl90(
  answers: number[],
  clientInfo: { name: string; gender: Gender; age?: number; clientId?: string; testDate?: string }
): Scl90Result {
  const safeAnswers = answers.slice(0, 90);
  while (safeAnswers.length < 90) safeAnswers.push(0);

  const getMean = (itemIndices: number[]): number => {
    let sum = 0;
    itemIndices.forEach(idx => {
      const score = Math.max(0, Math.min(4, safeAnswers[idx - 1] || 0));
      sum += score;
    });
    return Number((sum / itemIndices.length).toFixed(2));
  };

  const dimensionScores: Scl90DimensionScores = {
    somatization: getMean(DIMENSION_MAP.somatization),
    obsessiveCompulsive: getMean(DIMENSION_MAP.obsessiveCompulsive),
    interpersonalSensitivity: getMean(DIMENSION_MAP.interpersonalSensitivity),
    depression: getMean(DIMENSION_MAP.depression),
    anxiety: getMean(DIMENSION_MAP.anxiety),
    hostility: getMean(DIMENSION_MAP.hostility),
    phobicAnxiety: getMean(DIMENSION_MAP.phobicAnxiety),
    paranoidIdeation: getMean(DIMENSION_MAP.paranoidIdeation),
    psychoticism: getMean(DIMENSION_MAP.psychoticism),
    additional: getMean(DIMENSION_MAP.additional),
  };

  // Global İndeksler
  let totalScoreSum = 0;
  let positiveItemCount = 0;

  safeAnswers.forEach(score => {
    const val = Math.max(0, Math.min(4, score || 0));
    totalScoreSum += val;
    if (val > 0) positiveItemCount++;
  });

  const gsi = Number((totalScoreSum / 90).toFixed(2)); // Genel Semptom İndeksi (0.00 - 4.00)
  const pst = positiveItemCount; // 0 - 90
  const psdi = positiveItemCount > 0 ? Number((totalScoreSum / positiveItemCount).toFixed(2)) : 0; // 0.00 - 4.00

  // Klinik Yorum (GSI > 1.00 Türkiye normlarında klinik eşik olarak kabul edilir; Dağ 1991)
  const highDimensions: string[] = [];
  (Object.keys(dimensionScores) as (keyof Scl90DimensionScores)[]).forEach(k => {
    if (k !== 'additional' && dimensionScores[k] >= 1.5) {
      highDimensions.push(`${SCL90_DIMENSION_NAMES[k].tr} (${dimensionScores[k]})`);
    }
  });

  let interpretation = '';
  if (gsi < 0.6) {
    interpretation = `Genel Semptom İndeksi (GSI: ${gsi}) normal popülasyon sınırları içerisindedir. Danışan genel olarak psikolojik rahatsızlık belirtilerini düşük düzeyde bildirmektedir.`;
  } else if (gsi < 1.0) {
    interpretation = `Genel Semptom İndeksi (GSI: ${gsi}) hafif-orta düzeyde psikolojik sıkıntıya işaret etmektedir. Günlük stres faktörleri ile ilişkili hafif semptom yükü gözlenmektedir.`;
  } else if (gsi < 1.8) {
    interpretation = `Genel Semptom İndeksi (GSI: ${gsi}) klinik eşik değerin (1.00) üzerindedir ve belirgin psikopatolojik sıkıntıya işaret etmektedir.`;
    if (highDimensions.length > 0) {
      interpretation += ` Özellikle belirginleşen alt boyutlar: ${highDimensions.join(', ')}.`;
    }
  } else {
    interpretation = `Genel Semptom İndeksi (GSI: ${gsi}) oldukça yüksek düzeyde yaygın psikolojik belirti yüküne ve ciddi psikopatolojiye işaret etmektedir.`;
    if (highDimensions.length > 0) {
      interpretation += ` Klinik olarak kritik yükselen boyutlar: ${highDimensions.join(', ')}.`;
    }
    interpretation += ` Çok yönlü klinik değerlendirme ve yakın takip önerilir.`;
  }

  // Kritik Madde 15 (İntihar) kontrolü
  const suicideItemScore = safeAnswers[14] || 0; // Madde 15 (0-indexed 14)
  if (suicideItemScore > 0) {
    interpretation += ` [DİKKAT: Madde 15 (İntihar düşünceleri) için danışan ${suicideItemScore} puan bildirmiştir. İntihar riski öncelikli olarak ele alınmalıdır!]`;
  }

  return {
    id: 'scl90_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
    clientId: clientInfo.clientId,
    clientName: clientInfo.name,
    clientGender: clientInfo.gender,
    clientAge: clientInfo.age,
    testDate: clientInfo.testDate || new Date().toISOString().split('T')[0]!,
    answers: safeAnswers,
    dimensionScores,
    gsi,
    pst,
    psdi,
    clinicalInterpretation: interpretation,
    createdAt: new Date().toISOString(),
  };
}
