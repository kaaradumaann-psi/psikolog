/**
 * Uzman psikoloğun günlük karar katmanı.
 * Puan üretmez, tanı koymaz. Kayıtlı seans, ölçek ve görevden okunacak kontrol listesini çıkarır.
 */

import type {
  Appointment,
  BeckAnxietyResult,
  BeckDepressionResult,
  RiskLevel,
  Scl90Result,
  SoapSession,
} from './clinicalTypes';
import type { RapidScreeningResult } from './rapidScreening';

export type GoalStatus = 'active' | 'met' | 'paused';

export type TreatmentGoal = {
  id: string;
  text: string;
  measure: string;
  status: GoalStatus;
};

export type CaseFormulation = {
  clientId: string;
  /** Bulut kaydının kimliği ve imza/kilit durumu (P0-5) */
  id?: string;
  status?: 'draft' | 'signed' | 'locked';
  revision?: number;
  amendmentOf?: string;
  amendmentReason?: string;
  supersededBy?: string;
  signedAt?: string;
  lockedAt?: string;
  modality: string;
  predisposing: string;
  precipitating: string;
  perpetuating: string;
  protective: string;
  goals: TreatmentGoal[];
  reviewDate: string;
  updatedAt: string;
};

export type SafetyPlan = {
  clientId: string;
  id?: string;
  status?: 'draft' | 'signed' | 'locked';
  revision?: number;
  amendmentOf?: string;
  amendmentReason?: string;
  supersededBy?: string;
  signedAt?: string;
  lockedAt?: string;
  warningSigns: string;
  coping: string;
  people: string;
  professionals: string;
  environment: string;
  reasons: string;
  updatedAt: string;
};

export type ScoreScale = 'BDI' | 'BAI' | 'GAD-7' | 'PHQ-9' | 'GSI';
export type ScoreDirection = 'up' | 'down' | 'flat' | 'single';

export type ScoreReading = {
  scale: ScoreScale;
  date: string;
  score: number;
  max: number;
  band: string;
  previous?: number;
  delta?: number;
  direction: ScoreDirection;
  flag?: string;
};

export type TaskCue = {
  id: string;
  clientId?: string;
  clientName?: string;
  title: string;
  dueDate?: string;
  status: string;
  priority: string;
};

export type AttentionItem = {
  id: string;
  clientId: string;
  clientName: string;
  severity: 'danger' | 'warning';
  title: string;
  detail: string;
};

export type SessionPrep = {
  appointmentId: string;
  clientId: string;
  clientName: string;
  time: string;
  durationMinutes: number;
  sessionType: string;
  location: string;
  status: Appointment['status'];
  feePending: boolean;
  lastSessionNumber?: number;
  lastSessionDate?: string;
  lastAssessment?: string;
  homework?: string;
  riskLevel: RiskLevel;
  checks: string[];
  scores: ScoreReading[];
};

export type CaseSnapshot = {
  clients: { id: string; firstName: string; lastName: string }[];
  sessions: SoapSession[];
  appointments: Appointment[];
  bdi: BeckDepressionResult[];
  bai: BeckAnxietyResult[];
  scl: Scl90Result[];
  screenings: RapidScreeningResult[];
  tasks: TaskCue[];
  formulations: CaseFormulation[];
  safetyPlans: SafetyPlan[];
  today: string;
};

const SCALE_MAX: Record<ScoreScale, number> = {
  BDI: 63,
  BAI: 63,
  'GAD-7': 21,
  'PHQ-9': 27,
  GSI: 4,
};

export function localDateISO(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function emptyFormulation(clientId: string): CaseFormulation {
  return {
    clientId,
    modality: '',
    predisposing: '',
    precipitating: '',
    perpetuating: '',
    protective: '',
    goals: [],
    reviewDate: '',
    updatedAt: new Date().toISOString(),
  };
}

export function emptySafety(clientId: string): SafetyPlan {
  return {
    clientId,
    warningSigns: '',
    coping: '',
    people: '',
    professionals: '',
    environment: '',
    reasons: '',
    updatedAt: new Date().toISOString(),
  };
}

export function safetyPlanIsEmpty(plan: SafetyPlan | undefined): boolean {
  if (!plan) return true;
  return [plan.warningSigns, plan.coping, plan.people, plan.professionals, plan.environment, plan.reasons]
    .every((field) => !field.trim());
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function directionOf(current: number, previous: number | undefined, epsilon: number): ScoreDirection {
  if (previous === undefined) return 'single';
  if (current > previous + epsilon) return 'up';
  if (current < previous - epsilon) return 'down';
  return 'flat';
}

export function readScale(
  scale: ScoreScale,
  points: { date: string; score: number; band: string; flag?: string }[],
): ScoreReading | null {
  const sorted = points
    .filter((point) => point.date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.score - b.score);
  const last = sorted[sorted.length - 1];
  if (!last) return null;
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : undefined;
  const digits = scale === 'GSI' ? 2 : 0;
  const epsilon = scale === 'GSI' ? 0.05 : 0;
  const delta = previous ? round(last.score - previous.score, digits) : undefined;
  return {
    scale,
    date: last.date,
    score: round(last.score, digits),
    max: SCALE_MAX[scale],
    band: last.band,
    previous: previous ? round(previous.score, digits) : undefined,
    delta,
    direction: directionOf(last.score, previous?.score, epsilon),
    flag: last.flag,
  };
}

export function readingsForClient(
  clientId: string,
  snapshot: Pick<CaseSnapshot, 'bdi' | 'bai' | 'scl' | 'screenings'>,
): ScoreReading[] {
  const readings: Array<ScoreReading | null> = [
    readScale(
      'BDI',
      snapshot.bdi
        .filter((item) => item.clientId === clientId)
        .map((item) => ({
          date: item.testDate,
          score: item.totalScore,
          band: item.severity,
          flag: item.suicideRisk ? `Madde 9: ${item.suicideItemScore}` : undefined,
        })),
    ),
    readScale(
      'BAI',
      snapshot.bai
        .filter((item) => item.clientId === clientId)
        .map((item) => ({ date: item.testDate, score: item.totalScore, band: item.severity })),
    ),
    readScale(
      'GAD-7',
      snapshot.screenings
        .filter((item) => item.clientId === clientId && item.type === 'gad7')
        .map((item) => ({ date: item.testDate, score: item.totalScore, band: item.severity })),
    ),
    readScale(
      'PHQ-9',
      snapshot.screenings
        .filter((item) => item.clientId === clientId && item.type === 'phq9')
        .map((item) => ({
          date: item.testDate,
          score: item.totalScore,
          band: item.severity,
          flag: item.suicideRisk ? 'Madde 9 pozitif' : undefined,
        })),
    ),
    readScale(
      'GSI',
      snapshot.scl
        .filter((item) => item.clientId === clientId)
        .map((item) => ({
          date: item.testDate,
          score: item.gsi,
          band: item.gsi >= 1 ? 'Klinik eşik' : 'Eşik altı',
          flag: (item.answers?.[14] ?? 0) > 0 ? `Madde 15: ${item.answers[14]}` : undefined,
        })),
    ),
  ];
  return readings.filter((item): item is ScoreReading => item !== null);
}

function clientName(snapshot: CaseSnapshot, clientId: string, fallback = 'Danışan'): string {
  const client = snapshot.clients.find((item) => item.id === clientId);
  return client ? `${client.firstName} ${client.lastName}` : fallback;
}

function latestSession(sessions: SoapSession[], clientId: string): SoapSession | undefined {
  return sessions
    .filter((session) => session.clientId === clientId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.sessionNumber - a.sessionNumber)[0];
}

function clip(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function meaningfulRise(reading: ScoreReading): boolean {
  if (reading.direction !== 'up' || reading.delta === undefined) return false;
  if (reading.scale === 'GSI') return reading.delta >= 0.3;
  return reading.delta >= 5;
}

export function buildSessionPreps(snapshot: CaseSnapshot, date = snapshot.today): SessionPrep[] {
  return snapshot.appointments
    .filter((appointment) => appointment.date === date)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((appointment) => {
      const session = latestSession(snapshot.sessions, appointment.clientId);
      const scores = readingsForClient(appointment.clientId, snapshot);
      const formulation = snapshot.formulations.find((item) => item.clientId === appointment.clientId && !item.supersededBy);
      const safety = snapshot.safetyPlans.find((item) => item.clientId === appointment.clientId && !item.supersededBy);
      const riskLevel = session?.riskLevel ?? 'none';
      const flags = scores.filter((score) => score.flag);
      const rising = scores.filter(meaningfulRise);
      const checks: string[] = [];
      if (session?.homework) checks.push(`Ödevi sor: ${clip(session.homework, 110)}`);
      if (flags.length || riskLevel === 'high' || riskLevel === 'moderate') {
        checks.push('Seansa güvenlik değerlendirmesiyle başla. Ölçek uyarısı tanı değildir.');
      }
      if (flags.length && safetyPlanIsEmpty(safety)) checks.push('Güvenlik planı boş.');
      if (rising.length) {
        checks.push(`${rising.map((score) => score.scale).join(', ')} son ölçüme göre yükselmiş.`);
      }
      if (formulation?.reviewDate && formulation.reviewDate <= date) {
        checks.push('Formülasyon gözden geçirme tarihi geldi.');
      }
      // Ücret takibi yalnızca görüşme fiilen gerçekleştiğinde (tamamlandı veya
      // danışan gelmedi — gelmeyen seans da ücrete tabidir) anlamlıdır. Henüz
      // gerçekleşmemiş (planlanmış) bir görüşme için "Ücret bekliyor" uyarısı
      // yanıltıcıdır; ödeme zaten normal şekilde beklemededir.
      const feeIsOutstanding = appointment.paymentStatus === 'pending'
        && (appointment.status === 'completed' || appointment.status === 'noshow');
      if (feeIsOutstanding) {
        checks.push('Ücret bekliyor.');
      }
      return {
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        clientName: appointment.clientName || clientName(snapshot, appointment.clientId),
        time: appointment.time,
        durationMinutes: appointment.durationMinutes,
        sessionType: appointment.sessionType,
        location: appointment.location,
        status: appointment.status,
        feePending: feeIsOutstanding,
        lastSessionNumber: session?.sessionNumber,
        lastSessionDate: session?.date,
        lastAssessment: session?.assessment ? clip(session.assessment) : undefined,
        homework: session?.homework ? clip(session.homework, 180) : undefined,
        riskLevel,
        checks,
        scores,
      };
    });
}

export function buildAttention(snapshot: CaseSnapshot): AttentionItem[] {
  const items: AttentionItem[] = [];
  const seenSafety = new Set<string>();

  for (const client of snapshot.clients) {
    const name = `${client.firstName} ${client.lastName}`;
    const scores = readingsForClient(client.id, snapshot);
    const flags = scores.filter((score) => score.flag);
    const session = latestSession(snapshot.sessions, client.id);
    const safetyBits = [
      ...flags.map((score) => `${score.scale} ${score.flag} (${score.date})`),
      session?.riskLevel === 'high' ? `Son seansta yüksek risk: ${session.riskNotes || 'not yok'}` : '',
      session?.riskLevel === 'moderate' ? `Son seansta orta risk: ${session.riskNotes || 'not yok'}` : '',
    ].filter(Boolean);
    if (safetyBits.length && !seenSafety.has(client.id)) {
      seenSafety.add(client.id);
      const severe = flags.length > 0 || session?.riskLevel === 'high';
      items.push({
        id: `safety:${client.id}`,
        clientId: client.id,
        clientName: name,
        severity: severe ? 'danger' : 'warning',
        title: severe ? 'Güvenlik değerlendirmesi gerekli' : 'Risk notu açık',
        detail: safetyBits.join(' · '),
      });
    }
    const rising = scores.filter(meaningfulRise);
    if (rising.length) {
      items.push({
        id: `score:${client.id}`,
        clientId: client.id,
        clientName: name,
        severity: 'warning',
        title: 'Ölçek puanı yükseldi',
        detail: rising
          .map((score) => `${score.scale} ${score.previous} → ${score.score} (${score.delta && score.delta > 0 ? '+' : ''}${score.delta})`)
          .join(' · ') + '. Tarama bandı, tanı değil.',
      });
    }
  }

  const horizon = addDays(snapshot.today, -21);
  for (const appointment of snapshot.appointments) {
    if (appointment.status === 'noshow' && appointment.date >= horizon && appointment.date <= snapshot.today) {
      items.push({
        id: `noshow:${appointment.id}`,
        clientId: appointment.clientId,
        clientName: appointment.clientName,
        severity: 'warning',
        title: 'Gelmedi',
        detail: `${appointment.date} ${appointment.time} randevusuna gelinmedi. Takip mesajı veya yeni saat netleşmeli.`,
      });
    }
  }

  for (const task of snapshot.tasks) {
    if (!task.clientId) continue;
    if (task.status === 'done' || task.status === 'cancelled') continue;
    if (task.priority !== 'high') continue;
    if (task.dueDate && task.dueDate > snapshot.today) continue;
    items.push({
      id: `task:${task.id}`,
      clientId: task.clientId,
      clientName: task.clientName || clientName(snapshot, task.clientId),
      severity: 'warning',
      title: task.dueDate && task.dueDate < snapshot.today ? 'Geciken görev' : 'Bugünkü görev',
      detail: task.title,
    });
  }

  const rank = { danger: 0, warning: 1 };
  return items.sort((a, b) => rank[a.severity] - rank[b.severity] || a.clientName.localeCompare(b.clientName, 'tr'));
}

export function formatScore(reading: ScoreReading): string {
  const score = reading.scale === 'GSI' ? reading.score.toFixed(2) : String(reading.score);
  const max = reading.scale === 'GSI' ? reading.max.toFixed(2) : String(reading.max);
  return `${score}/${max} ${reading.band}`;
}

export function measurementNote(readings: ScoreReading[]): string {
  if (!readings.length) return 'Bu dosyada henüz karşılaştırılabilir ölçek kaydı yok.';
  return readings
    .map((reading) => {
      const move =
        reading.direction === 'single'
          ? 'tek ölçüm'
          : reading.direction === 'up'
            ? `önceki ${reading.previous}, fark +${reading.delta}`
            : reading.direction === 'down'
              ? `önceki ${reading.previous}, fark ${reading.delta}`
              : `önceki ${reading.previous}, belirgin fark yok`;
      const flag = reading.flag ? ` Uyarı: ${reading.flag}.` : '';
      return `${reading.scale} ${formatScore(reading)} (${reading.date}, ${move}).${flag}`;
    })
    .join(' ') + ' Puanlar tarama bandıdır; tanı koymaz ve klinik görüşmenin yerine geçmez.';
}

export function progressSections(input: {
  clientName: string;
  sessions: SoapSession[];
  readings: ScoreReading[];
  formulation?: CaseFormulation;
}): { id: string; title: string; content: string }[] {
  const sessions = [...input.sessions].sort((a, b) => a.date.localeCompare(b.date) || a.sessionNumber - b.sessionNumber);
  const last = sessions[sessions.length - 1];
  const themes = sessions
    .slice(-4)
    .map((session) => `#${session.sessionNumber} (${session.date}): ${clip(session.assessment || session.plan || session.subjective, 140)}`)
    .join('\n');
  const goals = input.formulation?.goals.filter((goal) => goal.text.trim()) ?? [];
  const goalText = goals.length
    ? goals.map((goal) => `- ${goal.text}${goal.measure ? ` (ölçüt: ${goal.measure})` : ''} — ${goal.status === 'met' ? 'karşılandı' : goal.status === 'paused' ? 'ara verildi' : 'sürüyor'}`).join('\n')
    : 'Hedef yazılmadı.';
  const formulationText = input.formulation
    ? [
        input.formulation.modality && `Yaklaşım: ${input.formulation.modality}`,
        input.formulation.precipitating && `Tetikleyen: ${input.formulation.precipitating}`,
        input.formulation.perpetuating && `Sürdüren: ${input.formulation.perpetuating}`,
        input.formulation.protective && `Koruyucu: ${input.formulation.protective}`,
      ].filter(Boolean).join('\n')
    : 'Formülasyon henüz kaydedilmedi.';

  return [
    {
      id: 's1',
      title: '1. Süreç',
      content: sessions.length
        ? `${input.clientName} için ${sessions.length} seans kaydı var. Son seans #${last?.sessionNumber} (${last?.date}).\n${themes}`
        : `${input.clientName} için seans kaydı yok.`,
    },
    {
      id: 's2',
      title: '2. Ölçüm',
      content: measurementNote(input.readings),
    },
    {
      id: 's3',
      title: '3. Formülasyon ve hedefler',
      content: `${formulationText}\n\nHedefler:\n${goalText}`,
    },
    {
      id: 's4',
      title: '4. Son plan',
      content: last?.plan
        ? clip(last.plan, 500)
        : 'Bir sonraki adım seans planından yazılacak. Bu metin otomatik tanı veya tedavi kararı değildir.',
    },
  ];
}
