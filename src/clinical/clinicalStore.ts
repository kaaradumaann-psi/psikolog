/**
 * Klinik Psikoloji ve Değerlendirme Sistemi — Merkezi Veri Deposu (Clinical Store)
 * Yerel Depolama (LocalStorage), Reaktif Olay Sistemi, Örnek Klinik Veri Seti & JSON Yedekleme
 * Halil Karaduman · Uzman Psikolog & Geliştirici
 */

import type {
  Client,
  SoapSession,
  Appointment,
  BeckDepressionResult,
  BeckAnxietyResult,
  Scl90Result,
  ClinicalReport,
} from './clinicalTypes';
import { calculateBeckDepression } from './beckDepression';
import { calculateBeckAnxiety } from './beckAnxiety';
import { calculateScl90 } from './scl90';

const CLIENTS_KEY = 'psikolog_clients_v2';
const SESSIONS_KEY = 'psikolog_sessions_v2';
const APPOINTMENTS_KEY = 'psikolog_appointments_v2';
const BDI_KEY = 'psikolog_bdi_tests_v2';
const BAI_KEY = 'psikolog_bai_tests_v2';
const SCL90_KEY = 'psikolog_scl90_tests_v2';
const REPORTS_KEY = 'psikolog_reports_v2';

type StoreListener = () => void;
const listeners = new Set<StoreListener>();

function notify() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Store listener error:', e);
    }
  });
}

export function subscribeClinicalStore(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* ==========================================================================
   Örnek Gerçekçi Klinik Veri Seti (Demo Seed Data)
   ========================================================================== */

function generateInitialDemoData() {
  const c1Id = 'cli_candan_01';
  const c2Id = 'cli_mert_02';
  const c3Id = 'cli_elif_03';
  const c4Id = 'cli_burak_04';

  const demoClients: Client[] = [
    {
      id: c1Id,
      fileNumber: 'HK-2026-001',
      firstName: 'Candan',
      lastName: 'Yılmaz',
      tcNumber: '28472910482',
      birthDate: '1994-05-14',
      age: 32,
      gender: 'KADIN',
      phone: '0532 555 12 34',
      email: 'candan.yilmaz@example.com',
      occupation: 'Yazılım Mühendisi',
      education: 'Lisans',
      maritalStatus: 'Bekar',
      emergencyContact: {
        name: 'Ayşe Yılmaz',
        phone: '0533 222 33 44',
        relation: 'Anne',
      },
      presentingComplaint: 'Son 6 aydır artan performans kaygısı, panik atak benzeri çarpıntılar, uykusuzluk ve iş yerinde tükenmişlik hissi.',
      medicalHistory: 'Bilinen kronik fiziksel hastalık yok. Kardiyolojik tetkikler normal çıktı (organik etiyoloji dışlandı).',
      psychiatricHistory: 'Daha önce düzenli psikoterapi geçmişi yok. İlk kez başvuruyor.',
      medications: 'Kullanmıyor.',
      familyHistory: 'Ailede anksiyete öyküsü mevcut (anne).',
      allergiesNotes: 'Penisilin alerjisi.',
      diagnoses: ['F41.1 Yaygın Anksiyete Bozukluğu', 'F43.8 İş İlişkili Uyum Sorunları'],
      status: 'active',
      createdAt: '2026-08-10T09:00:00.000Z',
      updatedAt: '2026-09-20T14:30:00.000Z',
    },
    {
      id: c2Id,
      fileNumber: 'HK-2026-002',
      firstName: 'Mert',
      lastName: 'Demir',
      tcNumber: '19482710394',
      birthDate: '1989-11-20',
      age: 36,
      gender: 'ERKEK',
      phone: '0544 444 88 99',
      email: 'mert.demir@example.com',
      occupation: 'Finans Analisti',
      education: 'Yüksek Lisans',
      maritalStatus: 'Evli',
      emergencyContact: {
        name: 'Selin Demir',
        phone: '0544 111 22 33',
        relation: 'Eş',
      },
      presentingComplaint: 'Kronik isteksizlik, çökkün duygu durum, sabah erken uyanma, anhedoni ve ilişkisel çatışmalar.',
      medicalHistory: 'Hafif gastrit.',
      psychiatricHistory: '2 yıl önce 6 ay süreyle SSRI kullanımı mevcut.',
      medications: 'Şu an ilaç kullanmıyor.',
      familyHistory: 'Özellik yok.',
      allergiesNotes: 'Yok.',
      diagnoses: ['F32.1 Majör Depresif Bozukluk (Orta Derece, Yineleyen)'],
      status: 'active',
      createdAt: '2026-07-15T11:00:00.000Z',
      updatedAt: '2026-09-22T16:00:00.000Z',
    },
    {
      id: c3Id,
      fileNumber: 'HK-2026-003',
      firstName: 'Elif',
      lastName: 'Kaya',
      tcNumber: '38192837461',
      birthDate: '1999-03-08',
      age: 27,
      gender: 'KADIN',
      phone: '0555 777 66 55',
      email: 'elif.kaya@example.com',
      occupation: 'Grafik Tasarımcı',
      education: 'Lisans',
      maritalStatus: 'Bekar',
      emergencyContact: {
        name: 'Kemal Kaya',
        phone: '0555 333 44 55',
        relation: 'Baba',
      },
      presentingComplaint: 'Sosyal ortamlarda yoğun kızarma, titreme, rezil olma korkusu ve kaçınma davranışları.',
      medicalHistory: 'Yok.',
      psychiatricHistory: 'Lise yıllarında rehberlik görüşmeleri.',
      medications: 'Yok.',
      familyHistory: 'Özellik yok.',
      allergiesNotes: 'Yok.',
      diagnoses: ['F40.1 Sosyal Anksiyete Bozukluğu (Sosyal Fobi)'],
      status: 'active',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-23T11:00:00.000Z',
    },
    {
      id: c4Id,
      fileNumber: 'HK-2026-004',
      firstName: 'Burak',
      lastName: 'Aksoy',
      birthDate: '1985-09-12',
      age: 41,
      gender: 'ERKEK',
      phone: '0530 123 98 76',
      email: 'burak.aksoy@example.com',
      occupation: 'Mimar',
      education: 'Lisans',
      maritalStatus: 'Evli',
      emergencyContact: {
        name: 'Deniz Aksoy',
        phone: '0530 987 65 43',
        relation: 'Eş',
      },
      presentingComplaint: 'Öfke kontrolü, mükemmeliyetçilik, takıntılı kontrol döngüleri ve ilişkisel mesafe.',
      medicalHistory: 'Hipertansiyon.',
      psychiatricHistory: 'Yok.',
      medications: 'Antihipertansif.',
      familyHistory: 'Özellik yok.',
      allergiesNotes: 'Yok.',
      diagnoses: ['F42 Obsesif-Kompulsif Bozukluk', 'F60.5 Obsesif-Kompulsif Kişilik Özellikleri'],
      status: 'completed',
      createdAt: '2026-05-10T14:00:00.000Z',
      updatedAt: '2026-08-30T17:00:00.000Z',
    },
  ];

  const demoSessions: SoapSession[] = [
    {
      id: 'sess_01',
      clientId: c1Id,
      clientName: 'Candan Yılmaz',
      sessionNumber: 1,
      date: '2026-08-15',
      startTime: '14:00',
      durationMinutes: 50,
      sessionType: 'İlk Görüşme / Anamnez',
      subjective: 'Danışan iş yerindeki terfi sonrası artan sorumluluklarla baş etmekte zorlandığını, toplantılarda söz alırken göğsünde sıkışma hissettiğini belirtti.',
      objective: 'Görüşme boyunca gergin ve tetikte duruş, hafif ayak sallama. Konuşma hızı artmış ancak hedefe yönelik. İçgörü tam, iş birliği yüksek.',
      assessment: 'Mükemmeliyetçi bilişsel şemalar, hata yapma eşittir yetersizlik algısı. Otonomik anksiyete uyarılması belirgin.',
      plan: 'Psikoeğitim: Anksiyetenin fizyolojisi ve savaş-kaç tepkisi aktarıldı. Diyafram nefesi ve ilerleyici kas gevşetme egzersizi verildi.',
      riskLevel: 'none',
      homework: 'Günde 2 kez 5 dakikalık diyafram nefesi ve kaygı tetikleyici durum günlüğü tutulması.',
      fee: 2500,
      paymentStatus: 'paid',
      createdAt: '2026-08-15T15:00:00.000Z',
      updatedAt: '2026-08-15T15:00:00.000Z',
    },
    {
      id: 'sess_02',
      clientId: c1Id,
      clientName: 'Candan Yılmaz',
      sessionNumber: 2,
      date: '2026-08-22',
      startTime: '14:00',
      durationMinutes: 50,
      sessionType: 'Bireysel Terapi',
      subjective: 'Geçtiğimiz hafta nefes egzersizlerini düzenli uyguladığını ve toplantı öncesi çarpıntıyı daha çabuk yatıştırabildiğini ifade etti.',
      objective: 'Daha rahat postür, göz teması sürdürüldü. Duygulanım uyumlu ve esnek.',
      assessment: 'Bilişsel yeniden yapılandırma sürecine geçiş için uygun zemin. Otomatik olumsuz düşünceler (Ya rezil olursam) tanımlandı.',
      plan: 'Düşünce kaydı formu (Olay-Düşünce-Duygu-Alternatif Düşünce) çalışıldı. MMPI ve Beck Anksiyete ölçekleri planlandı.',
      riskLevel: 'none',
      homework: 'Günde en az bir kez otomatik olumsuz düşünceyi kanıt inceleme tablosuna yazma.',
      fee: 2500,
      paymentStatus: 'paid',
      createdAt: '2026-08-22T15:00:00.000Z',
      updatedAt: '2026-08-22T15:00:00.000Z',
    },
    {
      id: 'sess_03',
      clientId: c2Id,
      clientName: 'Mert Demir',
      sessionNumber: 3,
      date: '2026-09-18',
      startTime: '16:00',
      durationMinutes: 50,
      sessionType: 'Bireysel Terapi',
      subjective: 'Hafta sonu yataktan çıkmak istemediğini, eşiyle iletişim kurmakta zorlandığını, hiçbir şeyin eski neşesini vermediğini aktardı.',
      objective: 'Düzleşmiş duygulanım, kısık ses tonu, psikomotor yavaşlama. Göz teması aralıklı.',
      assessment: 'Majör depresyon semptomları aktif. Davranışsal aktivasyon eksikliği depresif döngüyü besliyor.',
      plan: 'Davranışsal aktivasyon tablosu oluşturuldu. Küçük adımlar prensibiyle yürüyüş ve hobi hedefleri kondu.',
      riskLevel: 'low',
      riskNotes: 'Aktif intihar planı veya niyeti yok, pasif yaşam isteksizliği mevcut.',
      homework: 'Haftada 3 gün 20 dakika açık hava yürüyüşü ve gün sonu keyif/ustalık derecelendirmesi.',
      fee: 2500,
      paymentStatus: 'paid',
      createdAt: '2026-09-18T17:00:00.000Z',
      updatedAt: '2026-09-18T17:00:00.000Z',
    },
  ];

  const demoAppointments: Appointment[] = [
    {
      id: 'app_01',
      clientId: c1Id,
      clientName: 'Candan Yılmaz',
      date: '2026-09-24',
      time: '14:00',
      durationMinutes: 50,
      sessionType: 'Bireysel Terapi',
      location: 'Klinik (Yüz Yüze)',
      status: 'scheduled',
      notes: '3. seans — Bilişsel çarpıtmalar ve davranışsal deneyler.',
      fee: 2500,
      paymentStatus: 'pending',
      createdAt: '2026-09-20T10:00:00.000Z',
    },
    {
      id: 'app_02',
      clientId: c2Id,
      clientName: 'Mert Demir',
      date: '2026-09-24',
      time: '16:00',
      durationMinutes: 50,
      sessionType: 'Bireysel Terapi',
      location: 'Klinik (Yüz Yüze)',
      status: 'scheduled',
      notes: '4. seans — Davranışsal aktivasyon takip ve Beck Depresyon tekrar testi.',
      fee: 2500,
      paymentStatus: 'pending',
      createdAt: '2026-09-20T10:00:00.000Z',
    },
    {
      id: 'app_03',
      clientId: c3Id,
      clientName: 'Elif Kaya',
      date: '2026-09-25',
      time: '11:00',
      durationMinutes: 50,
      sessionType: 'Online Terapi',
      location: 'Online (Görüntülü)',
      status: 'scheduled',
      notes: '2. seans — Sosyal kaygı tetikleyicileri hiyerarşisi oluşturma.',
      fee: 2500,
      paymentStatus: 'paid',
      createdAt: '2026-09-21T11:00:00.000Z',
    },
  ];

  // Demo Beck Depresyon sonuçları
  const bdiAnswersC2 = [2, 2, 1, 2, 1, 1, 1, 1, 0, 1, 1, 2, 2, 1, 2, 2, 2, 1, 1, 1, 1]; // Toplam: 28 (Orta)
  const demoBdiC2 = calculateBeckDepression(bdiAnswersC2, {
    clientId: c2Id,
    name: 'Mert Demir',
    gender: 'ERKEK',
    age: 36,
    testDate: '2026-09-18',
  });

  const bdiAnswersC1 = [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0]; // Toplam: 8 (Minimal)
  const demoBdiC1 = calculateBeckDepression(bdiAnswersC1, {
    clientId: c1Id,
    name: 'Candan Yılmaz',
    gender: 'KADIN',
    age: 32,
    testDate: '2026-08-22',
  });

  // Demo Beck Anksiyete sonuçları
  const baiAnswersC1 = [2, 1, 1, 2, 2, 1, 3, 1, 2, 2, 2, 1, 1, 2, 2, 1, 2, 1, 0, 1, 1]; // Toplam: 31 (Şiddetli)
  const demoBaiC1 = calculateBeckAnxiety(baiAnswersC1, {
    clientId: c1Id,
    name: 'Candan Yılmaz',
    gender: 'KADIN',
    age: 32,
    testDate: '2026-08-22',
  });

  // Demo SCL-90 sonuçları
  const scl90Answers = new Array(90).fill(1);
  scl90Answers[0] = 3; // Somatization
  scl90Answers[1] = 3; // Anxiety
  scl90Answers[3] = 2;
  scl90Answers[6] = 0;
  scl90Answers[11] = 3;
  scl90Answers[22] = 3;
  scl90Answers[32] = 2;
  scl90Answers[38] = 3;
  scl90Answers[47] = 2;
  scl90Answers[56] = 3;
  const demoScl90C1 = calculateScl90(scl90Answers, {
    clientId: c1Id,
    name: 'Candan Yılmaz',
    gender: 'KADIN',
    age: 32,
    testDate: '2026-08-22',
  });

  const demoReports: ClinicalReport[] = [
    {
      id: 'rep_01',
      clientId: c1Id,
      clientName: 'Candan Yılmaz',
      clientGender: 'KADIN',
      clientAge: 32,
      reportType: 'comprehensive',
      reportTitle: 'Kapsamlı Psikolojik Değerlendirme & Klinik İnceleme Raporu',
      reportDate: '2026-08-25',
      evaluator: 'Uzm. Psk. Halil Karaduman',
      sections: [
        {
          id: 's1',
          title: '1. Başvuru Nedeni ve Klinik Anamnez',
          content: 'Danışan iş yaşamındaki terfi ve artan iş yükü sonrası ortaya çıkan yoğun nefes darlığı, göğüste sıkışma hissi, kontrolü kaybetme korkusu ve sürekli endişe şikayetleri ile başvurmuştur. Tıbbi tetkiklerde organik patoloji bulunmamıştır.',
        },
        {
          id: 's2',
          title: '2. Davranışsal Gözlemler ve Ruhsal Durum Muayenesi',
          content: 'Danışanın bilinci açık, yönelimi tamdır. Görüşme esnasında motor gerginlik ve otonomik aşırı uyarılma belirtileri (çarpıntı hissi, gergin postür) gözlenmiştir. Düşünce içeriğinde hata yapma ve yetersiz bulunma temaları belirgindir. İntihar veya kendine zarar düşüncesi yoktur.',
        },
        {
          id: 's3',
          title: '3. Psikolojik Test Bulguları ve Değerlendirme',
          content: 'Beck Anksiyete Envanteri (BAI): 31 Puan (Şiddetli Anksiyete). Özellikle otonomik ve subjektif anksiyete alt boyutlarında yüksek uyarılma saptanmıştır. Beck Depresyon Envanteri (BDI): 8 Puan (Normal sınırlar içinde). SCL-90-R profilinde Anksiyete (ANX) ve Somatizasyon (SOM) boyutları klinik eşiğin üzerindedir.',
        },
        {
          id: 's4',
          title: '4. Klinik Formülasyon ve Teşhis',
          content: 'DSM-5 kriterlerine göre F41.1 Yaygın Anksiyete Bozukluğu ve ilişkili durumsal panik uyarılması tablosu mevcuttur. Mükemmeliyetçi ve felaketleştirici bilişsel çarpıtmalar anksiyetenin idamesinde anahtar rol oynamaktadır.',
        },
        {
          id: 's5',
          title: '5. Sonuç ve Psikoterapötik Öneriler',
          content: 'Haftada bir seans sıklığında yapılandırılmış Bilişsel Davranışçı Terapi (BDT), solunum ve gevşeme egzersizleri ile kademeli maruz bırakma müdahalelerinin sürdürülmesi önerilmektedir.',
        },
      ],
      recommendations: [
        'Haftada 1 seans BDT yönelimli bireysel psikoterapi protokolünün sürdürülmesi',
        'Günlük 10-15 dakikalık diyafram nefesi ve ilerleyici kas gevşeme pratiği',
        'İş yerinde görev sınırlarının belirlenmesi ve mükemmeliyetçi hedeflerin esnetilmesi',
      ],
      formalDiagnosis: 'F41.1 Yaygın Anksiyete Bozukluğu',
      createdAt: '2026-08-25T11:00:00.000Z',
      updatedAt: '2026-08-25T11:00:00.000Z',
    },
  ];

  return {
    clients: demoClients,
    sessions: demoSessions,
    appointments: demoAppointments,
    bdiTests: [demoBdiC2, demoBdiC1],
    baiTests: [demoBaiC1],
    scl90Tests: [demoScl90C1],
    reports: demoReports,
  };
}

/* ==========================================================================
   Store Okuma / Yazma Metodları
   ========================================================================== */

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`LocalStorage read error for ${key}:`, e);
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notify();
  } catch (e) {
    console.error(`LocalStorage write error for ${key}:`, e);
  }
}

// Depo boş ise otomatik demo veri yükle
export function initClinicalStore(): void {
  if (typeof window === 'undefined') return;
  const existing = localStorage.getItem(CLIENTS_KEY);
  if (!existing) {
    const seed = generateInitialDemoData();
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(seed.clients));
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(seed.sessions));
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(seed.appointments));
    localStorage.setItem(BDI_KEY, JSON.stringify(seed.bdiTests));
    localStorage.setItem(BAI_KEY, JSON.stringify(seed.baiTests));
    localStorage.setItem(SCL90_KEY, JSON.stringify(seed.scl90Tests));
    localStorage.setItem(REPORTS_KEY, JSON.stringify(seed.reports));
  }
}

/* ------------------------------------------------------------------ */
/*  DANIŞANLAR (Clients)                                              */
/* ------------------------------------------------------------------ */

export function getClients(): Client[] {
  initClinicalStore();
  return getLocal<Client[]>(CLIENTS_KEY, []);
}

export function getClientById(id: string): Client | undefined {
  return getClients().find(c => c.id === id);
}

export function saveClient(client: Client): void {
  const list = getClients();
  const idx = list.findIndex(c => c.id === client.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    list[idx] = { ...client, updatedAt: now };
  } else {
    list.unshift({ ...client, createdAt: now, updatedAt: now });
  }
  setLocal(CLIENTS_KEY, list);
}

export function deleteClient(id: string): void {
  const list = getClients().filter(c => c.id !== id);
  setLocal(CLIENTS_KEY, list);
}

/* ------------------------------------------------------------------ */
/*  SEANS NOTLARI (SOAP Sessions)                                     */
/* ------------------------------------------------------------------ */

export function getSoapSessions(): SoapSession[] {
  initClinicalStore();
  return getLocal<SoapSession[]>(SESSIONS_KEY, []);
}

export function getSessionsByClientId(clientId: string): SoapSession[] {
  return getSoapSessions()
    .filter(s => s.clientId === clientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function saveSoapSession(session: SoapSession): void {
  const list = getSoapSessions();
  const idx = list.findIndex(s => s.id === session.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    list[idx] = { ...session, updatedAt: now };
  } else {
    list.unshift({ ...session, createdAt: now, updatedAt: now });
  }
  setLocal(SESSIONS_KEY, list);
}

export function deleteSoapSession(id: string): void {
  const list = getSoapSessions().filter(s => s.id !== id);
  setLocal(SESSIONS_KEY, list);
}

/* ------------------------------------------------------------------ */
/*  RANDEVULAR (Appointments)                                         */
/* ------------------------------------------------------------------ */

export function getAppointments(): Appointment[] {
  initClinicalStore();
  return getLocal<Appointment[]>(APPOINTMENTS_KEY, []);
}

export function saveAppointment(appointment: Appointment): void {
  const list = getAppointments();
  const idx = list.findIndex(a => a.id === appointment.id);
  if (idx >= 0) {
    list[idx] = appointment;
  } else {
    list.push(appointment);
  }
  setLocal(APPOINTMENTS_KEY, list);
}

export function deleteAppointment(id: string): void {
  const list = getAppointments().filter(a => a.id !== id);
  setLocal(APPOINTMENTS_KEY, list);
}

/* ------------------------------------------------------------------ */
/*  BECK DEPRESYON (BDI)                                              */
/* ------------------------------------------------------------------ */

export function getBeckDepressionTests(): BeckDepressionResult[] {
  initClinicalStore();
  return getLocal<BeckDepressionResult[]>(BDI_KEY, []);
}

export function saveBeckDepressionTest(test: BeckDepressionResult): void {
  const list = getBeckDepressionTests();
  const idx = list.findIndex(t => t.id === test.id);
  if (idx >= 0) {
    list[idx] = test;
  } else {
    list.unshift(test);
  }
  setLocal(BDI_KEY, list);
}

export function deleteBeckDepressionTest(id: string): void {
  const list = getBeckDepressionTests().filter(t => t.id !== id);
  setLocal(BDI_KEY, list);
}

/* ------------------------------------------------------------------ */
/*  BECK ANKSİYETE (BAI)                                              */
/* ------------------------------------------------------------------ */

export function getBeckAnxietyTests(): BeckAnxietyResult[] {
  initClinicalStore();
  return getLocal<BeckAnxietyResult[]>(BAI_KEY, []);
}

export function saveBeckAnxietyTest(test: BeckAnxietyResult): void {
  const list = getBeckAnxietyTests();
  const idx = list.findIndex(t => t.id === test.id);
  if (idx >= 0) {
    list[idx] = test;
  } else {
    list.unshift(test);
  }
  setLocal(BAI_KEY, list);
}

export function deleteBeckAnxietyTest(id: string): void {
  const list = getBeckAnxietyTests().filter(t => t.id !== id);
  setLocal(BAI_KEY, list);
}

/* ------------------------------------------------------------------ */
/*  SCL-90-R TESTLERİ                                                 */
/* ------------------------------------------------------------------ */

export function getScl90Tests(): Scl90Result[] {
  initClinicalStore();
  return getLocal<Scl90Result[]>(SCL90_KEY, []);
}

export function saveScl90Test(test: Scl90Result): void {
  const list = getScl90Tests();
  const idx = list.findIndex(t => t.id === test.id);
  if (idx >= 0) {
    list[idx] = test;
  } else {
    list.unshift(test);
  }
  setLocal(SCL90_KEY, list);
}

export function deleteScl90Test(id: string): void {
  const list = getScl90Tests().filter(t => t.id !== id);
  setLocal(SCL90_KEY, list);
}

/* ------------------------------------------------------------------ */
/*  KLİNİK RAPORLAR (Clinical Reports)                                */
/* ------------------------------------------------------------------ */

export function getClinicalReports(): ClinicalReport[] {
  initClinicalStore();
  return getLocal<ClinicalReport[]>(REPORTS_KEY, []);
}

export function saveClinicalReport(report: ClinicalReport): void {
  const list = getClinicalReports();
  const idx = list.findIndex(r => r.id === report.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    list[idx] = { ...report, updatedAt: now };
  } else {
    list.unshift({ ...report, createdAt: now, updatedAt: now });
  }
  setLocal(REPORTS_KEY, list);
}

export function deleteClinicalReport(id: string): void {
  const list = getClinicalReports().filter(r => r.id !== id);
  setLocal(REPORTS_KEY, list);
}

/* ------------------------------------------------------------------ */
/*  YEDEKLEME / DIŞA VE İÇE AKTARMA (Backup & Restore)               */
/* ------------------------------------------------------------------ */

export interface ClinicalBackupBundle {
  version: '2.0';
  exportedAt: string;
  clients: Client[];
  sessions: SoapSession[];
  appointments: Appointment[];
  bdiTests: BeckDepressionResult[];
  baiTests: BeckAnxietyResult[];
  scl90Tests: Scl90Result[];
  reports: ClinicalReport[];
}

export function exportClinicalBackup(): ClinicalBackupBundle {
  return {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    clients: getClients(),
    sessions: getSoapSessions(),
    appointments: getAppointments(),
    bdiTests: getBeckDepressionTests(),
    baiTests: getBeckAnxietyTests(),
    scl90Tests: getScl90Tests(),
    reports: getClinicalReports(),
  };
}

export function importClinicalBackup(bundle: ClinicalBackupBundle): void {
  if (!bundle || !bundle.clients) {
    throw new Error('Geçersiz yedek dosyası formatı.');
  }
  setLocal(CLIENTS_KEY, bundle.clients || []);
  setLocal(SESSIONS_KEY, bundle.sessions || []);
  setLocal(APPOINTMENTS_KEY, bundle.appointments || []);
  setLocal(BDI_KEY, bundle.bdiTests || []);
  setLocal(BAI_KEY, bundle.baiTests || []);
  setLocal(SCL90_KEY, bundle.scl90Tests || []);
  setLocal(REPORTS_KEY, bundle.reports || []);
}

export function resetToDemoData(): void {
  const seed = generateInitialDemoData();
  setLocal(CLIENTS_KEY, seed.clients);
  setLocal(SESSIONS_KEY, seed.sessions);
  setLocal(APPOINTMENTS_KEY, seed.appointments);
  setLocal(BDI_KEY, seed.bdiTests);
  setLocal(BAI_KEY, seed.baiTests);
  setLocal(SCL90_KEY, seed.scl90Tests);
  setLocal(REPORTS_KEY, seed.reports);
}
