/**
 * Klinik Psikoloji ve Değerlendirme Sistemi — Veri Modelleri & Tipler
 * Halil Karaduman · Uzman Psikolog & Geliştirici
 */

export type Gender = 'ERKEK' | 'KADIN';

export type ClientStatus = 'active' | 'followup' | 'completed' | 'archived';

export type MaritalStatus = '' | 'Bekar' | 'Evli' | 'Bosanmis' | 'Birlikte' | 'Diger';

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface Client {
  id: string;
  fileNumber: string; // örn: "HK-2026-001"
  firstName: string;
  lastName: string;
  tcNumber?: string;
  birthDate: string; // YYYY-MM-DD
  age: number;
  gender: Gender;
  phone: string;
  email: string;
  occupation: string;
  education: string;
  maritalStatus: MaritalStatus;
  emergencyContact: EmergencyContact;
  presentingComplaint: string; // Başvuru Şikayeti / Nedeni
  medicalHistory: string; // Tıbbi Özgeçmiş / Kronik Hastalıklar
  psychiatricHistory: string; // Psikiyatrik Geçmiş / Önceki Terapi Deneyimleri
  medications: string; // Düzenli Kullanılan İlaçlar
  familyHistory: string; // Aile Öyküsü
  allergiesNotes: string; // Önemli Notlar / Alerjiler
  diagnoses: string[]; // DSM-5 / ICD-10 Tanı & Ön Tanıları
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export type SessionType =
  | 'Bireysel Terapi'
  | 'Çift / Aile Terapisi'
  | 'İlk Görüşme / Anamnez'
  | 'Psikolojik Değerlendirme'
  | 'Kriz Müdahalesi'
  | 'Online Terapi'
  | 'Takip Seansı';

export type RiskLevel = 'none' | 'low' | 'moderate' | 'high';

export type PaymentStatus = 'paid' | 'pending' | 'waived';

export type RecordStatus = 'draft' | 'signed' | 'locked';

export interface ClinicalRecordMeta {
  /** draft → signed → locked. Kilitli kayıt DB'de de değiştirilemez. */
  status?: RecordStatus;
  revision?: number;
  amendmentOf?: string;
  amendmentReason?: string;
  signedAt?: string;
  lockedAt?: string;
  /** Revizyon zinciri: bu kaydı geçersiz kılan yeni sürümün kimliği. */
  supersededBy?: string;
}

export interface SoapSession extends ClinicalRecordMeta {
  id: string;
  clientId: string;
  clientName: string;
  sessionNumber: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  sessionType: SessionType;
  subjective: string; // S: Danışanın aktarımları, duygu durumu, haftalık gelişmeler
  objective: string; // O: Klinisyenin gözlemleri, duygulanım, beden dili, test bulguları
  assessment: string; // A: Klinik formülasyon, bilişsel şemalar, savunmalar, risk
  plan: string; // P: Gelecek seans hedefleri, CBT ev ödevleri, müdahaleler
  riskLevel: RiskLevel;
  riskNotes?: string;
  homework?: string;
  fee?: number;
  paymentStatus: PaymentStatus;
  /** Randevu → seans zinciri (P0-4) */
  appointmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'noshow';

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  sessionType: SessionType;
  location: 'Klinik (Yüz Yüze)' | 'Online (Görüntülü)' | 'Dış Görüşme';
  status: AppointmentStatus;
  notes?: string;
  fee?: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

/* ==========================================================================
   Beck Depresyon Envanteri — BDI (Hisli Türkçe formu; BDI-II değildir)
   ========================================================================== */
export type BeckDepressionScoreBand = 'Tarama eşiğinin altında' | 'Tarama eşiğinde veya üzerinde';

export interface BeckDepressionResult {
  id: string;
  clientId?: string;
  clientName: string;
  clientGender: Gender;
  clientAge?: number;
  testDate: string; // YYYY-MM-DD, Europe/Istanbul klinik tarihi
  instrumentId?: string; // Eski kayıtlarda açık kimlik metadatası bulunmayabilir.
  instrumentVersion?: string;
  scoringVersion?: string;
  completionStatus?: 'complete';
  responses?: Array<{ itemId: number; score: number }>;
  answers: number[]; // Eski okuyucular için 21 × 0-3 anlık görüntüsü.
  totalScore: number; // 0-63
  maximumScore?: number;
  screeningThreshold?: number;
  screeningThresholdReached?: boolean;
  scoreBand?: BeckDepressionScoreBand;
  /** @deprecated Yeni BDI kayıtları şiddet sınıfı üretmez; yalnız eski kayıt uyumluluğu. */
  severity?: 'Minimal' | 'Hafif' | 'Orta' | 'Şiddetli';
  criticalItemEndorsed?: boolean;
  criticalItemScore?: number;
  criticalItemFlags?: string[];
  /** @deprecated Eski kayıt uyumluluğu; yeni kayıtlarda criticalItemEndorsed kullanılır. */
  suicideRisk?: boolean;
  /** @deprecated Eski kayıt uyumluluğu; yeni kayıtlarda criticalItemScore kullanılır. */
  suicideItemScore?: number;
  /** @deprecated Doğrulanmamış tarihsel alt skor; yeni kayıtlarda üretilmez. */
  cognitiveAffectiveScore?: number;
  /** @deprecated Doğrulanmamış tarihsel alt skor; yeni kayıtlarda üretilmez. */
  somaticPerformanceScore?: number;
  clinicalInterpretation: string;
  notes?: string;
  revision?: number;
  revisionOf?: string;
  createdAt: string;
  updatedAt?: string;
}

/* ==========================================================================
   Beck Anksiyete Envanteri (BAI / BAO)
   ========================================================================== */
export type BeckAnxietySeverity = 'Minimal' | 'Hafif' | 'Orta' | 'Şiddetli';

export interface BeckAnxietyResult {
  id: string;
  clientId?: string;
  clientName: string;
  clientGender: Gender;
  clientAge?: number;
  testDate: string; // YYYY-MM-DD, Europe/Istanbul klinik tarihi
  instrumentId?: string;
  instrumentVersion?: string;
  scoringVersion?: string;
  completionStatus?: 'complete';
  responses?: Array<{ itemId: number; score: number }>;
  answers: number[]; // Eski okuyucular için 21 × 0-3 anlık görüntüsü
  totalScore: number; // 0-63
  maximumScore?: number;
  scoreBand?: string;
  /** @deprecated Eski kayıt uyumluluğu; yeni kayıtlar scoreBand kullanır. */
  severity?: BeckAnxietySeverity;
  /** @deprecated Doğrulanmamış eski geliştirici alt skorları; yeni kayıtlarda üretilmez. */
  subjectiveScore?: number;
  /** @deprecated Doğrulanmamış eski geliştirici alt skorları; yeni kayıtlarda üretilmez. */
  neurovegetativeScore?: number;
  /** @deprecated Doğrulanmamış eski geliştirici alt skorları; yeni kayıtlarda üretilmez. */
  autonomicScore?: number;
  /** @deprecated Doğrulanmamış eski geliştirici alt skorları; yeni kayıtlarda üretilmez. */
  motorScore?: number;
  clinicalInterpretation: string;
  notes?: string;
  revision?: number;
  revisionOf?: string;
  createdAt: string;
  updatedAt?: string;
}

/* ==========================================================================
   SCL-90-R (Belirti Tarama Listesi)
   ========================================================================== */
export interface Scl90DimensionScores {
  somatization: number; // SOM: Somatizasyon ham ortalaması
  obsessiveCompulsive: number; // O-C: Obsesif-Kompulsif ham ortalaması
  interpersonalSensitivity: number; // I-S: Kişilerarası Duyarlık ham ortalaması
  depression: number; // DEP: Depresyon ham ortalaması
  anxiety: number; // ANX: Anksiyete ham ortalaması
  hostility: number; // HOS: Öfke ve Düşmanlık ham ortalaması
  phobicAnxiety: number; // PHOB: Fobik Anksiyete ham ortalaması
  paranoidIdeation: number; // PAR: Paranoid Düşünce ham ortalaması
  psychoticism: number; // PSY: Psikotizm ham ortalaması
}

export interface Scl90Result {
  id: string;
  clientId?: string;
  clientName: string;
  clientGender: Gender;
  clientAge?: number;
  testDate: string; // YYYY-MM-DD, Europe/Istanbul klinik tarihi
  instrumentId?: string;
  instrumentVersion?: string;
  scoringVersion?: string;
  completionStatus?: 'complete';
  responses?: Array<{ itemId: number; score: number }>;
  answers: number[]; // Eski okuyucular için 90 × 0-4 anlık görüntüsü
  totalScore?: number;
  dimensionScores: Scl90DimensionScores;
  gsi: number; // Ham Genel Semptom İndeksi
  pst: number; // Pozitif Semptom Toplamı
  psdi: number; // Pozitif Semptom Düzeyi İndeksi
  normReference?: 'none';
  criticalItemFlags?: string[];
  clinicalInterpretation: string;
  notes?: string;
  revision?: number;
  revisionOf?: string;
  createdAt: string;
  updatedAt?: string;
}

/* ==========================================================================
   Klinik Raporlar
   ========================================================================== */
export type ClinicalReportType =
  | 'comprehensive'
  | 'beck'
  | 'scl90'
  | 'session_progress'
  | 'referral';

export interface ReportSection {
  id: string;
  title: string;
  content: string;
}

export interface ClinicalReport {
  id: string;
  status?: 'draft' | 'final';
  revision?: number;
  amendmentOf?: string;
  amendmentReason?: string;
  supersededBy?: string;
  signedAt?: string;
  lockedAt?: string;
  clientId?: string;
  clientName: string;
  clientGender: Gender;
  clientAge?: number;
  reportType: ClinicalReportType;
  reportTitle: string;
  reportDate: string;
  evaluator: string; // örn: "Uzm. Psk. Halil Karaduman"
  sections: ReportSection[];
  recommendations: string[];
  formalDiagnosis?: string;
  createdAt: string;
  updatedAt: string;
}
