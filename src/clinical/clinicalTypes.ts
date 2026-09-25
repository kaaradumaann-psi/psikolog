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

export interface SoapSession {
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
  /** Set when this note was created from an appointment, so the link survives. */
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
   Beck Depresyon Envanteri (BDI / BDO)
   ========================================================================== */
export type BeckDepressionSeverity = 'Minimal' | 'Hafif' | 'Orta' | 'Şiddetli';

export interface BeckDepressionResult {
  id: string;
  clientId?: string;
  clientName: string;
  clientGender: Gender;
  clientAge?: number;
  testDate: string; // YYYY-MM-DD
  answers: number[]; // 21 madde, her biri 0-3
  totalScore: number; // 0-63
  severity: BeckDepressionSeverity;
  cognitiveAffectiveScore: number; // Maddeler 1-13 (0-39)
  somaticPerformanceScore: number; // Maddeler 14-21 (0-24)
  suicideRisk: boolean; // Madde 9 > 0 ise true
  suicideItemScore: number; // Madde 9 puanı (0-3)
  clinicalInterpretation: string;
  notes?: string;
  createdAt: string;
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
  testDate: string; // YYYY-MM-DD
  answers: number[]; // 21 madde, her biri 0-3
  totalScore: number; // 0-63
  severity: BeckAnxietySeverity;
  subjectiveScore: number; // Öznel anksiyete
  neurovegetativeScore: number; // Nörovejetatif
  autonomicScore: number; // Otonomik
  motorScore: number; // Motor
  clinicalInterpretation: string;
  notes?: string;
  createdAt: string;
}

/* ==========================================================================
   SCL-90-R (Belirti Tarama Listesi)
   ========================================================================== */
export interface Scl90DimensionScores {
  somatization: number; // SOM: Somatizasyon
  obsessiveCompulsive: number; // O-C: Obsesif-Kompulsif
  interpersonalSensitivity: number; // I-S: Kişilerarası Duyarlık
  depression: number; // DEP: Depresyon
  anxiety: number; // ANX: Anksiyete
  hostility: number; // HOS: Öfke ve Düşmanlık
  phobicAnxiety: number; // PHOB: Fobik Anksiyete
  paranoidIdeation: number; // PAR: Paranoid Düşünce
  psychoticism: number; // PSY: Psikotizm
  additional: number; // Ek Maddeler (uyku, iştah vb.)
}

export interface Scl90Result {
  id: string;
  clientId?: string;
  clientName: string;
  clientGender: Gender;
  clientAge?: number;
  testDate: string; // YYYY-MM-DD
  answers: number[]; // 90 madde, her biri 0-4
  dimensionScores: Scl90DimensionScores;
  gsi: number; // Genel Semptom İndeksi (General Severity Index)
  pst: number; // Pozitif Semptom Toplamı (Positive Symptom Total)
  psdi: number; // Pozitif Semptom Düzeyi İndeksi (Positive Symptom Distress Index)
  clinicalInterpretation: string;
  notes?: string;
  createdAt: string;
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
