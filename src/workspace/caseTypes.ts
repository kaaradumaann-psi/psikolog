import { FORM } from '../form/layout';
import { NORM_SOURCE_LABEL, SCORING_ENGINE_VERSION } from '../scoring/version';
import { isValidDateOnly, isValidReviewTimestamp } from '../validation/dateGuards';
import type { Gender, RecordInput, SavedAnswerPage } from '../records/supabaseRecords';

export const ITEM_COUNT = FORM.totalItems;

export type IntakeGender = Extract<Gender, 'Erkek' | 'Kadın'>;
export type EducationLevel = 'İlkokul' | 'Ortaokul' | 'Lise' | 'Lisans' | 'Lisansüstü';
export type MaritalStatus = 'Bekar' | 'Evli' | 'Boşanmış' | 'Dul';
export type FollowUpStatus = 'Ayaktan' | 'Yatış';
export type EntryMethod = 'quick' | 'raw' | 'omr';
export type CaseStep = 'home' | 'intake' | 'method' | 'entry' | 'review';

/** `undefined` = henüz girilmedi, `null` = bilinçli boş, D/Y = cevap. */
export type ItemAnswer = 'D' | 'Y' | null | undefined;

export type ClientIntake = {
  firstName: string;
  lastName: string;
  gender: IntakeGender | '';
  age: number;
  testDate: string;
  testDuration: string;
  occupation: string;
  followUp: FollowUpStatus | '';
  education: EducationLevel | '';
  maritalStatus: MaritalStatus | '';
  applicationReason: string;
  clinicalContext: string;
};

export type RawScoreKey =
  | 'blank' | 'L' | 'F' | 'K'
  | 'Hs' | 'D' | 'Hy' | 'Pd' | 'Mf' | 'Pa' | 'Pt' | 'Sc' | 'Ma' | 'Si';

export type RawScores = Record<RawScoreKey, number | ''>;

export const EDUCATION_OPTIONS: EducationLevel[] = ['İlkokul', 'Ortaokul', 'Lise', 'Lisans', 'Lisansüstü'];
export const MARITAL_OPTIONS: MaritalStatus[] = ['Bekar', 'Evli', 'Boşanmış', 'Dul'];
export const FOLLOW_UP_OPTIONS: FollowUpStatus[] = ['Ayaktan', 'Yatış'];

export const RAW_SCORE_FIELDS: {
  key: RawScoreKey;
  label: string;
  max: number;
  group: 'validity' | 'clinical';
  kRaw?: boolean;
}[] = [
  { key: 'blank', label: 'Boş', max: ITEM_COUNT, group: 'validity' },
  { key: 'L', label: 'L', max: 15, group: 'validity' },
  { key: 'F', label: 'F', max: 64, group: 'validity' },
  { key: 'K', label: 'K', max: 30, group: 'validity' },
  { key: 'Hs', label: 'Hs', max: 33, group: 'clinical', kRaw: true },
  { key: 'D', label: 'D', max: 60, group: 'clinical' },
  { key: 'Hy', label: 'Hy', max: 60, group: 'clinical' },
  { key: 'Pd', label: 'Pd', max: 50, group: 'clinical', kRaw: true },
  { key: 'Mf', label: 'Mf', max: 60, group: 'clinical' },
  { key: 'Pa', label: 'Pa', max: 40, group: 'clinical' },
  { key: 'Pt', label: 'Pt', max: 48, group: 'clinical', kRaw: true },
  { key: 'Sc', label: 'Sc', max: 78, group: 'clinical', kRaw: true },
  { key: 'Ma', label: 'Ma', max: 46, group: 'clinical', kRaw: true },
  { key: 'Si', label: 'Si', max: 70, group: 'clinical' },
];

export const RAW_SCORE_MAX: Record<RawScoreKey, number> = Object.fromEntries(
  RAW_SCORE_FIELDS.map(field => [field.key, field.max]),
) as Record<RawScoreKey, number>;

export type CaseMeta = {
  kind: 'case-meta';
  version: 1;
  /**
   * Kaydı üreten puanlama motoru sürümü (veri bütünlüğü). Eski kayıtlarda
   * bulunmayabilir; okuma tarafı (parseRecordPayload) alanı opsiyonel sayar.
   */
  scoringVersion?: string;
  /** T dönüşümünde kullanılan norm kaynağının kısa etiketi. */
  normSource?: string;
  /**
   * Revizyon zinciri: bu kayıt başka bir kayda "Düzenle" ile oluşturulduysa
   * orijinal kaydın id'si. Orijinal kayıt değişmez (immutability trigger'ı)
   * kalır; revizyonlar hafif payload taşır (OMR revizyonu optik yerine
   * sonuç cevaplarını kullanır) böylece "tüm optik kayıtlarını tutmak"
   * depolama sorunu oluşturmaz.
   */
  revisionOf?: string;
  /** Revizyonun kısa nedeni (ör. "Cevap düzeltmesi"). */
  revisionReason?: string;
  method: EntryMethod;
  client: {
    firstName: string;
    lastName: string;
    gender: IntakeGender;
    age: number;
    testDate: string;
    testDuration: string;
    occupation: string;
    followUp: FollowUpStatus | '';
    education: EducationLevel | '';
    maritalStatus: MaritalStatus | '';
    applicationReason: string;
    clinicalContext: string;
  };
};

export type QuickEntryPayload = {
  kind: 'quick-entry';
  version: 1;
  answers: Array<'D' | 'Y' | null>;
};

export type RawScoresPayload = {
  kind: 'raw-scores';
  version: 1;
  scales: Record<RawScoreKey, number>;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function boundedString(value: unknown, max: number, required = false): value is string {
  return typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0) &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

function boundedNarrative(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
}

function validItemChoice(value: unknown): value is 'D' | 'Y' | null {
  return value === null || value === 'D' || value === 'Y';
}

export function isValidCaseMeta(value: unknown): value is CaseMeta {
  if (!isRecord(value) || value.kind !== 'case-meta' || value.version !== 1 ||
    (value.method !== 'quick' && value.method !== 'raw' && value.method !== 'omr') || !isRecord(value.client)) return false;
  const client = value.client;
  const age = client.age;
  const testDate = client.testDate;
  const validEducation = client.education === '' || EDUCATION_OPTIONS.includes(client.education as EducationLevel);
  const validMarital = client.maritalStatus === '' || MARITAL_OPTIONS.includes(client.maritalStatus as MaritalStatus);
  const validFollowUp = client.followUp === '' || FOLLOW_UP_OPTIONS.includes(client.followUp as FollowUpStatus);
  const validDuration = client.testDuration === '' || parseDurationMinutes(String(client.testDuration)) !== null;
  return boundedString(client.firstName, 80, true) && boundedString(client.lastName, 80, true) &&
    (client.gender === 'Erkek' || client.gender === 'Kadın') && typeof age === 'number' && Number.isInteger(age) &&
    age >= MMPI_AGE_MIN && age <= MMPI_AGE_MAX && boundedString(testDate, 10, true) &&
    isValidDateOnly(testDate) && testDate <= todayIsoDate() && validDuration &&
    boundedString(client.testDuration, 20) && boundedString(client.occupation, 120) && validFollowUp &&
    validEducation && validMarital && boundedNarrative(client.applicationReason, 500) &&
    boundedNarrative(client.clinicalContext, 2000) &&
    (value.scoringVersion === undefined || boundedString(value.scoringVersion, 100, true)) &&
    (value.normSource === undefined || boundedString(value.normSource, 200, true)) &&
    (value.revisionOf === undefined || (typeof value.revisionOf === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.revisionOf))) &&
    (value.revisionReason === undefined || boundedString(value.revisionReason, 200));
}

export function isValidQuickEntryPayload(value: unknown): value is QuickEntryPayload {
  return isRecord(value) && value.kind === 'quick-entry' && value.version === 1 && Array.isArray(value.answers) &&
    value.answers.length === ITEM_COUNT && value.answers.every(validItemChoice);
}

export function isValidRawScoresPayload(value: unknown): value is RawScoresPayload {
  if (!isRecord(value) || value.kind !== 'raw-scores' || value.version !== 1 || !isRecord(value.scales)) return false;
  const scales = value.scales;
  return RAW_SCORE_FIELDS.every(field => {
    const valueForField = scales[field.key];
    return typeof valueForField === 'number' && Number.isInteger(valueForField) && valueForField >= 0 && valueForField <= field.max;
  });
}

function isValidMeasurement(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return boundedString(value.responseId, 160, true) && (value.choiceId === 'D' || value.choiceId === 'Y') &&
    typeof value.darkness === 'number' && Number.isFinite(value.darkness) && value.darkness >= 0 && value.darkness <= 1 &&
    typeof value.coverage === 'number' && Number.isFinite(value.coverage) && value.coverage >= 0 && value.coverage <= 1;
}

function isValidStoredItem(value: unknown): value is UnknownRecord {
  if (!isRecord(value) || !boundedString(value.itemId, 160, true) || !Number.isInteger(value.itemNumber) ||
    !validItemChoice(value.choiceId)) return false;
  const itemNumber = value.itemNumber;
  if (typeof itemNumber !== 'number' || itemNumber < 1 || itemNumber > ITEM_COUNT) return false;
  // Rows written before status/measurement retention are still readable as legacy OMR data,
  // but a payload may not mix the legacy shape with unvalidated current-result fields.
  if (value.status === undefined) {
    return value.confidence === undefined && value.measurements === undefined && value.reason === undefined;
  }
  const statuses = new Set(['unread', 'blank', 'single', 'multiple', 'ambiguous', 'reliable', 'invalid']);
  const measurements = value.measurements;
  if (typeof value.status !== 'string' || !statuses.has(value.status) ||
    typeof value.confidence !== 'number' || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1 ||
    !boundedString(value.reason, 1000) || !Array.isArray(measurements) || measurements.length > 4 ||
    !measurements.every(isValidMeasurement)) return false;
  const measurementIds = new Set((measurements as UnknownRecord[]).map(measurement => measurement.responseId as string));
  if (measurementIds.size !== measurements.length) return false;
  if ((value.status === 'reliable' || value.status === 'single') && value.choiceId === null) return false;
  if (value.status === 'blank' && value.choiceId !== null) return false;
  if (['unread', 'invalid', 'multiple', 'ambiguous'].includes(value.status) && value.choiceId !== null) return false;
  return ['unread', 'invalid'].includes(value.status) || measurements.length > 0;
}

function isValidQuality(value: unknown): boolean {
  if (!isRecord(value) || typeof value.ok !== 'boolean' ||
    (value.fatal !== undefined && typeof value.fatal !== 'boolean') || !Array.isArray(value.reasons) ||
    !value.reasons.every(item => boundedString(item, 1000)) || typeof value.score !== 'number' ||
    !Number.isFinite(value.score) || value.score < 0 || value.score > 1 || !isRecord(value.metrics)) return false;
  const metrics = value.metrics;
  return ['brightness', 'shadowSpread', 'laplacianVariance', 'borderContrast', 'pixelsPerMm'].every(key => {
    const metric = metrics[key];
    return typeof metric === 'number' && Number.isFinite(metric) && metric >= 0;
  });
}

function isValidReviewSnapshot(value: unknown): boolean {
  return isRecord(value) && validItemChoice(value.choiceId) &&
    boundedString(value.reviewedAt, 80, true) && isValidReviewTimestamp(value.reviewedAt);
}

function isOmrReviewHistory(value: unknown): boolean {
  return Array.isArray(value) && value.length <= ITEM_COUNT * 4 && value.every(event => {
    if (!isRecord(event) || !boundedString(event.itemId, 160, true) ||
      (event.action !== 'review' && event.action !== 'undo') || !boundedString(event.reviewerId, 160, true) ||
      !boundedString(event.recordedAt, 80, true) || !isValidReviewTimestamp(event.recordedAt)) return false;
    return (event.previous === null || isValidReviewSnapshot(event.previous)) &&
      (event.next === null || isValidReviewSnapshot(event.next));
  });
}

export function isOmrPage(value: unknown): value is SavedAnswerPage {
  if (!isRecord(value) || kindOf(value)) return false;
  const pageNumber = value.pageNumber;
  const items = value.items;
  if (typeof pageNumber !== 'number' || !Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 4 ||
    !Array.isArray(items) || items.length > ITEM_COUNT || !items.every(isValidStoredItem)) return false;
  const seenItems = new Set<number>();
  const seenIds = new Set<string>();
  for (const item of value.items as UnknownRecord[]) {
    if (seenItems.has(item.itemNumber as number) || seenIds.has(item.itemId as string)) return false;
    seenItems.add(item.itemNumber as number); seenIds.add(item.itemId as string);
  }
  if (value.pageId !== undefined && !boundedString(value.pageId, 160, true)) return false;
  if (value.batchId !== undefined && (typeof value.batchId !== 'string' || !/^[A-F0-9]{24}$/.test(value.batchId))) return false;
  if (value.fingerprint !== undefined && !boundedString(value.fingerprint, 160, true)) return false;
  if (value.sourceName !== undefined && !boundedString(value.sourceName, 500)) return false;
  for (const key of ['manualReviews', 'reviews'] as const) {
    if (value[key] === undefined) continue;
    if (!isRecord(value[key])) return false;
    for (const [itemId, review] of Object.entries(value[key])) {
      if (!boundedString(itemId, 160, true) || !isRecord(review) || !validItemChoice(review.choiceId) ||
        (review.reviewedAt !== undefined && (!boundedString(review.reviewedAt, 80, true) || !isValidReviewTimestamp(review.reviewedAt)))) return false;
    }
  }
  if (value.quality !== undefined && !isValidQuality(value.quality)) return false;
  if (value.warnings !== undefined && (!Array.isArray(value.warnings) || !value.warnings.every(item => boundedString(item, 1000)))) return false;
  if (value.sourceCorners !== undefined && (!Array.isArray(value.sourceCorners) || value.sourceCorners.length !== 4 ||
    !value.sourceCorners.every(point => isRecord(point) && typeof point.x === 'number' && Number.isFinite(point.x) &&
      typeof point.y === 'number' && Number.isFinite(point.y)))) return false;
  if (value.reviewHistory !== undefined && !isOmrReviewHistory(value.reviewHistory)) return false;
  return true;
}

export function isValidRecordPayload(value: unknown): value is unknown[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 600) return false;
  const meta = value.filter(isValidCaseMeta);
  if (meta.length !== 1) return false;
  const method = meta[0]!.method;
  const quick = value.filter(isValidQuickEntryPayload);
  const raw = value.filter(isValidRawScoresPayload);
  const pages = value.filter(isOmrPage);
  if (value.some(item => !isValidCaseMeta(item) && !isValidQuickEntryPayload(item) && !isValidRawScoresPayload(item) && !isOmrPage(item))) return false;
  if (method === 'quick') return quick.length === 1 && raw.length === 0 && pages.length === 0;
  if (method === 'raw') return raw.length === 1 && quick.length === 0 && pages.length === 0;
  if (quick.length !== 0 || raw.length !== 0 || pages.length !== 4) return false;
  const pageNumbers = new Set(pages.map(page => page.pageNumber));
  if (pageNumbers.size !== 4 || [...pageNumbers].some(pageNumber => pageNumber < 1 || pageNumber > 4)) return false;
  const itemNumbers = new Set<number>();
  const itemIds = new Set<string>();
  const reviewedMissingNumbers = new Set<number>();
  for (const page of pages) {
    for (const item of page.items) {
      if (itemNumbers.has(item.itemNumber) || itemIds.has(item.itemId)) return false;
      itemNumbers.add(item.itemNumber);
      itemIds.add(item.itemId);
    }
  }
  if ([...itemNumbers].some(itemNumber => itemNumber < 1 || itemNumber > ITEM_COUNT)) return false;
  const rememberReviewedItem = (itemId: string, coversMissing: boolean): boolean => {
    if (itemIds.has(itemId)) return true;
    const match = /^item-(\d+)$/.exec(itemId);
    if (!match) return false;
    const itemNumber = Number(match[1]);
    if (!Number.isInteger(itemNumber) || itemNumber < 1 || itemNumber > ITEM_COUNT) return false;
    if (coversMissing) reviewedMissingNumbers.add(itemNumber);
    return true;
  };
  for (const page of pages) {
    for (const key of Object.keys(page.manualReviews ?? {})) if (!rememberReviewedItem(key, true)) return false;
    for (const event of page.reviewHistory ?? []) if (!rememberReviewedItem(event.itemId, false)) return false;
  }
  const coveredNumbers = new Set([...itemNumbers, ...reviewedMissingNumbers]);
  return coveredNumbers.size === ITEM_COUNT && [...coveredNumbers].every(itemNumber => itemNumber >= 1 && itemNumber <= ITEM_COUNT);
}

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function emptyClientIntake(): ClientIntake {
  return {
    firstName: '',
    lastName: '',
    gender: '',
    age: 0,
    testDate: todayIsoDate(),
    testDuration: '',
    occupation: '',
    followUp: '',
    education: '',
    maritalStatus: '',
    applicationReason: '',
    clinicalContext: '',
  };
}

export function emptyRawScores(): RawScores {
  return {
    blank: '', L: '', F: '', K: '',
    Hs: '', D: '', Hy: '', Pd: '', Mf: '', Pa: '', Pt: '', Sc: '', Ma: '', Si: '',
  };
}

export function emptyAnswers(): ItemAnswer[] {
  return Array.from({ length: ITEM_COUNT }, () => undefined);
}

export function mapQuickKey(key: string): ItemAnswer | 'ignore' {
  if (key === '1') return 'D';
  if (key === '2') return 'Y';
  if (key === '0') return null;
  return 'ignore';
}

export function answerLabel(answer: ItemAnswer): string {
  if (answer === 'D') return 'D';
  if (answer === 'Y') return 'Y';
  if (answer === null) return 'Boş';
  return '—';
}

export function countAnswers(answers: readonly ItemAnswer[]) {
  let entered = 0, correct = 0, wrong = 0, blank = 0, pending = 0;
  for (const answer of answers) {
    if (answer === undefined) pending++;
    else {
      entered++;
      if (answer === 'D') correct++;
      else if (answer === 'Y') wrong++;
      else blank++;
    }
  }
  return { entered, correct, wrong, blank, pending, total: answers.length };
}

export function parseRawScore(value: string, max: number): number | null {
  if (value.trim() === '') return null;
  if (!/^\d+$/.test(value.trim())) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > max) return null;
  return number;
}

export function rawScoresComplete(scores: RawScores): boolean {
  return RAW_SCORE_FIELDS.every(field => {
    const value = scores[field.key];
    if (value === '') return false;
    return Number.isInteger(value) && value >= 0 && value <= field.max;
  });
}

/**
 * MMPI (566 maddelik klasik form, Türkiye uyarlaması) uygulama koşulları.
 * Türkiye'de 566 soruluk klasik MMPI formu kullanılır (MMPI-2 değil).
 * Kriterler, Türkiye norm/standardizasyon çalışmalarına dayanan resmi
 * uygulama kılavuzlarından alınır:
 *
 * - Yaş: test 16 yaş ve üzerine uygulanır; 16 yaş altındaki bireylerde
 *   Türkiye örnekleminde sonuçlar geçerli kabul edilmez (örn. 13 yaş reddedilir).
 * - Eğitim: maddelerin doğru analiz edilebilmesi için okuryazarlık şartıdır;
 *   Türkiye klinik pratiğinde en düşük kabul edilen düzey ortaokul
 *   (6–8 yıllık resmi eğitim) olduğu için "İlkokul" seçimi kabul edilmez.
 * - Süre: test hız testi değildir; Türkiye uygulamalarında ortalama 60–120
 *   dakika (1–2 saat) içinde tamamlanması beklenir. Alan kaydı engellemez;
 *   gerçekçi olmayan değerler "çok kısa / kısa / uzun" olarak işaretlenir —
 *   566 madde 20 dakikada cevaplanamaz.
 * - Boş yanıt: boş bırakılan (Cannot Say / ?) madde sayısı 30'u geçmemelidir;
 *   aşılması testin geçerlilik profilini düşürür ve testi geçersiz sayabilir.
 */
export const MMPI_AGE_MIN = 16;
/** Sağılabilirlik üst sınırı yalnızca giriş sağlamlığı içindir; norm koşulu alt sınırdır. */
export const MMPI_AGE_MAX = 120;
export const MMPI_AGE_MESSAGE = 'MMPI 16 yaş ve üzerine uygulanır; 16 yaş altı danışanlarda sonuçlar Türkiye normları için geçerli kabul edilmez.';
export const MMPI_EDUCATION_MESSAGE = 'MMPI Türkiye uygulamasında en az ortaokul (6–8 yıllık eğitim) düzeyine uygulanır; ilkokul düzeyi kabul edilmez.';
export const MMPI_DURATION_RANGE = { min: 60, max: 120 } as const;
export const MMPI_DURATION_REFERENCE = `MMPI, 566 madde için Türkiye uygulamalarında ortalama ${MMPI_DURATION_RANGE.min}–${MMPI_DURATION_RANGE.max} dakika (1–2 saat) sürer.`;
export const MMPI_MAX_BLANK = 30;
export const MMPI_BLANK_MESSAGE = `Boş bırakılan (?) madde sayısı ${MMPI_MAX_BLANK}'u aşıyor; bu durum testi geçersiz sayabilir.`;

export type DurationLevel = 'empty' | 'invalid' | 'very-short' | 'short' | 'ok' | 'long';

export type DurationAssessment = {
  minutes: number | null;
  level: DurationLevel;
  message: string;
};

/** "75", "90 dk", "90 dakika" biçimlerini dakikaya çevirir; okunamayan girdide null. */
export function parseDurationMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,3})\s*(dk|dakika)?$/i);
  if (!match) return null;
  const minutes = Number(match[1]);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) return null;
  return minutes;
}

export function assessDuration(value: string): DurationAssessment {
  if (value.trim() === '') return { minutes: null, level: 'empty', message: '' };
  const minutes = parseDurationMinutes(value);
  if (minutes === null) {
    return { minutes: null, level: 'invalid', message: 'Süreyi dakika olarak rakam girin (örn. 90).' };
  }
  if (minutes < 45) {
    return {
      minutes,
      level: 'very-short',
      message: `${minutes} dk çok kısa — 566 madde bu sürede cevaplanamaz. ${MMPI_DURATION_REFERENCE}`,
    };
  }
  if (minutes < MMPI_DURATION_RANGE.min) {
    return {
      minutes,
      level: 'short',
      message: `${minutes} dk tipik aralığın (${MMPI_DURATION_RANGE.min}–${MMPI_DURATION_RANGE.max} dk) altında; girdiğiniz süreyi doğrulayın.`,
    };
  }
  if (minutes > 180) {
    return {
      minutes,
      level: 'long',
      message: `${minutes} dk tipik aralığın (${MMPI_DURATION_RANGE.min}–${MMPI_DURATION_RANGE.max} dk) belirgin üzerinde; girdiğiniz süreyi doğrulayın.`,
    };
  }
  return { minutes, level: 'ok', message: '' };
}

/** Girilen IQ değeri formda istenmez (kullanıcı kararı); bu modül IQ verisi tutmaz. */
function hasForbiddenControls(value: string, allowLineBreaks = false): boolean {
  return allowLineBreaks ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) : /[\u0000-\u001f\u007f]/.test(value);
}

export function validateIntake(client: ClientIntake): string | null {
  if (!client.firstName.trim() || !client.lastName.trim()) return 'Ad ve soyad zorunludur.';
  if (client.gender !== 'Erkek' && client.gender !== 'Kadın') return 'Cinsiyet seçiniz.';
  if (!Number.isInteger(client.age) || client.age < MMPI_AGE_MIN) {
    return MMPI_AGE_MESSAGE;
  }
  if (client.age > MMPI_AGE_MAX) return 'Yaş doğrulanamadı; lütfen kontrol edin.';
  if (!isValidDateOnly(client.testDate)) {
    return 'Test tarihi geçersiz.';
  }
  if (client.testDate > todayIsoDate()) {
    return 'Test tarihi bugünden ileri olamaz; testi uyguladığınız günü seçin.';
  }
  if (client.education === 'İlkokul') return MMPI_EDUCATION_MESSAGE;
  if (client.occupation.length > 120 || client.applicationReason.length > 500 || client.clinicalContext.length > 2000) {
    return 'İsteğe bağlı metin alanlarından biri izin verilen uzunluğu aşıyor.';
  }
  if ([client.firstName, client.lastName, client.occupation, client.applicationReason].some(value => hasForbiddenControls(value)) ||
    hasForbiddenControls(client.clinicalContext, true)) {
    return 'Metin alanlarında geçersiz kontrol karakterleri kullanılamaz.';
  }
  if (assessDuration(client.testDuration).level === 'invalid') return 'Test süresi dakika olarak rakam girilmelidir (örn. 90).';
  return null;
}

/** Sütunlar: ad/soyad/cinsiyet/yaş/tarih + isteğe bağlı meslek/eğitim/başvuru (boş string, sahte tire yok). */
function requireGender(client: ClientIntake): IntakeGender {
  if (client.gender !== 'Erkek' && client.gender !== 'Kadın') throw new Error('Cinsiyet seçiniz.');
  return client.gender;
}

export function recordInputFromIntake(client: ClientIntake): RecordInput {
  const error = validateIntake(client);
  if (error) throw new Error(error);
  return {
    client: {
      firstName: client.firstName.trim(),
      lastName: client.lastName.trim(),
      gender: requireGender(client),
      age: client.age,
      occupation: client.occupation.trim(),
      education: client.education.trim(),
      applicationDate: client.testDate,
      requestedBy: client.applicationReason.trim(),
    },
  };
}

export type CaseMetaRevision = {
  /** "Düzenle" ile oluşturulan revizyonun orijinal kayıt id'si. */
  revisionOf?: string;
  /** Revizyonun kısa nedeni. */
  revisionReason?: string;
};

export function buildCaseMeta(method: EntryMethod, client: ClientIntake, revision: CaseMetaRevision = {}): CaseMeta {
  const error = validateIntake(client);
  if (error) throw new Error(error);
  const revisionOf = revision.revisionOf?.trim();
  const revisionReason = revision.revisionReason?.trim() ?? '';
  if (revisionOf && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(revisionOf)) {
    throw new Error('Revizyon kaynağı kimliği geçersiz.');
  }
  if (revisionReason.length > 200) throw new Error('Revizyon nedeni çok uzun.');
  return {
    kind: 'case-meta',
    version: 1,
    scoringVersion: SCORING_ENGINE_VERSION,
    normSource: NORM_SOURCE_LABEL,
    ...(revisionOf ? { revisionOf } : {}),
    ...(revisionReason ? { revisionReason } : {}),
    method,
    client: {
      firstName: client.firstName.trim(),
      lastName: client.lastName.trim(),
      gender: requireGender(client),
      age: client.age,
      testDate: client.testDate,
      testDuration: client.testDuration.trim(),
      occupation: client.occupation.trim(),
      followUp: client.followUp,
      education: client.education,
      maritalStatus: client.maritalStatus,
      applicationReason: client.applicationReason.trim(),
      clinicalContext: client.clinicalContext.trim(),
    },
  };
}

export function buildQuickPayload(answers: readonly ItemAnswer[]): QuickEntryPayload {
  if (answers.length !== ITEM_COUNT) throw new Error('Madde sayısı 566 olmalıdır.');
  return {
    kind: 'quick-entry',
    version: 1,
    answers: answers.map(answer => (answer === undefined ? null : answer)),
  };
}

export function buildRawPayload(scores: RawScores): RawScoresPayload {
  if (!rawScoresComplete(scores)) throw new Error('Ham puan alanları eksik veya sınır dışında.');
  const scales = {} as Record<RawScoreKey, number>;
  for (const field of RAW_SCORE_FIELDS) scales[field.key] = scores[field.key] as number;
  return { kind: 'raw-scores', version: 1, scales };
}

function kindOf(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const kind = (value as { kind?: unknown }).kind;
  return typeof kind === 'string' ? kind : null;
}

export function parseRecordPayload(raw: unknown[]) {
  const items = Array.isArray(raw) ? raw : [];
  const metaCandidate = items.find(item => kindOf(item) === 'case-meta');
  const meta = isValidCaseMeta(metaCandidate) ? metaCandidate : undefined;
  const legacyContext = items.find(item => kindOf(item) === 'client-context') as
    | {
        kind: 'client-context';
        followUp?: string | null;
        maritalStatus?: string | null;
        testDuration?: string | null;
        applicationReason?: string | null;
        clinicalContext?: string | null;
      }
    | undefined;
  const legacyMethodCandidate = items.find(item => kindOf(item) === 'entry-method');
  const legacyMethod = isRecord(legacyMethodCandidate) &&
    (legacyMethodCandidate.method === 'quick' || legacyMethodCandidate.method === 'raw' || legacyMethodCandidate.method === 'omr')
    ? legacyMethodCandidate as { kind: 'entry-method'; method: EntryMethod }
    : undefined;
  const quickCandidate = items.find(item => kindOf(item) === 'quick-entry');
  const quick = isValidQuickEntryPayload(quickCandidate) ? quickCandidate : undefined;
  const rawScoresCandidate = items.find(item => kindOf(item) === 'raw-scores');
  const rawScores = isValidRawScoresPayload(rawScoresCandidate) ? rawScoresCandidate : undefined;
  const omrPages = items.filter(isOmrPage);
  const method: EntryMethod | undefined =
    meta?.method ??
    legacyMethod?.method ??
    (quick ? 'quick' : rawScores ? 'raw' : omrPages.length ? 'omr' : undefined);
  const payloadMethods = [quick ? 'quick' : null, rawScores ? 'raw' : null, omrPages.length > 0 ? 'omr' : null]
    .filter((value): value is EntryMethod => value !== null);
  const payloadConsistent = payloadMethods.length <= 1 &&
    (!method || payloadMethods.length === 0 || payloadMethods[0] === method);
  const client = meta?.client;
  return {
    method,
    client,
    /** Kaydı üreten motor sürümü; eski kayıtlarda bulunmaz (undefined). */
    scoringVersion: typeof meta?.scoringVersion === 'string' ? meta.scoringVersion : undefined,
    normSource: typeof meta?.normSource === 'string' ? meta.normSource : undefined,
    /** Revizyon zinciri; eski kayıtlarda bulunmaz (undefined). */
    revisionOf: typeof meta?.revisionOf === 'string' ? meta.revisionOf : undefined,
    revisionReason: typeof meta?.revisionReason === 'string' ? meta.revisionReason : undefined,
    followUp: client?.followUp || legacyContext?.followUp || '',
    maritalStatus: client?.maritalStatus || legacyContext?.maritalStatus || '',
    testDuration: client?.testDuration || legacyContext?.testDuration || '',
    applicationReason: client?.applicationReason || legacyContext?.applicationReason || '',
    clinicalContext: client?.clinicalContext || legacyContext?.clinicalContext || '',
    quickAnswers: payloadConsistent && method === 'quick' ? quick?.answers : undefined,
    rawScales: payloadConsistent && method === 'raw' ? rawScores?.scales : undefined,
    omrPages: payloadConsistent && method === 'omr' ? omrPages : [],
  };
}

export function methodLabel(method: EntryMethod): string {
  return method === 'quick' ? 'Hızlı veri girişi' : method === 'raw' ? 'Ham puan' : 'OMR / Kamera';
}

export type ParsedRecordPayload = ReturnType<typeof parseRecordPayload>;
