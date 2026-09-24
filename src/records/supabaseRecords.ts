import type { FormDefinition, Point } from '../omr/omrTypes';
import type { ItemReadResult, ManualReview, ManualReviewEvent, QualityReport, StoredScanPage } from '../results/scanResultTypes';
import type { AuthenticatedUser } from '../auth/authTypes';
import { requireSupabase } from '../auth/supabaseClient';
import { isEffectiveItem } from '../results/resultNormalizer';
import { isValidRecordPayload, todayIsoDate } from '../workspace/caseTypes';
import { isNetworkError } from '../workspace/draftStorage';

export type SavedAnswerPage = {
  pageId: string;
  pageNumber: number;
  batchId: string;
  fingerprint: string;
  items: ItemReadResult[];
  quality: QualityReport;
  sourceCorners: Point[];
  warnings: string[];
  sourceName: string;
  manualReviews: Record<string, ManualReview>;
  /**
   * Manuel düzeltme denetim izi (kim, ne zaman, önceki/sonraki değer).
   * Eski kayıtlarda bulunmaz; okuma tarafı alanı opsiyonel saymalıdır.
   */
  reviewHistory?: ManualReviewEvent[];
};

export type MMPIRecord = { id: string; createdAt: string };

export type RecordSummary = {
  id: string;
  firstName: string;
  lastName: string;
  applicationDate: string;
  createdAt: string;
  gender?: Gender;
  age?: number;
  occupation?: string;
  education?: string;
  requestedBy?: string;
  createdBy?: string;
  psychologistName?: string;
  psychologistEmail?: string;
};

export type FullRecordDetail = RecordSummary & {
  rawOmrAnswers: unknown[];
  /** Kayıt sonrası uzman değerlendirme notu (migration öncesi kayıtlarda boş). */
  expertNotes: string;
  /** Not son güncelleme zamanı (hiç not girilmediyse undefined). */
  notesUpdatedAt?: string;
};

export type Gender = 'Kadın' | 'Erkek' | 'Belirtmek istemiyor' | 'Diğer';

export type RecordInput = {
  client: {
    firstName: string;
    lastName: string;
    gender: Gender;
    age: number;
    occupation: string;
    education: string;
    applicationDate: string;
    requestedBy: string;
  };
};

export const RAW_PAYLOAD_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Liste üst sınırları. Sunucu-taraflı sayfalama ile birlikte; arayüzler
 * `hasMore`/`count` ile sınırı görünür kılar — sessiz kırpma yok.
 * `OWN/ALL_LIMIT` hâlâ geriye dönük uyumluluk için korunur.
 */
export const OWN_RECORDS_LIMIT = 100;
export const ALL_RECORDS_LIMIT = 200;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export type RecordsQuery = {
  search?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  gender?: Gender | '';
  ageMin?: number;
  ageMax?: number;
  page?: number; // 0-indexed
  pageSize?: number;
};

export type PagedRecords = {
  records: RecordSummary[];
  count: number | null;
  hasMore: boolean;
  page: number;
  pageSize: number;
};

function sanitizeIlike(value: string): string {
  return value.replace(/[%_,]/g, '').trim().slice(0, 80);
}

function toPagedRange(query: RecordsQuery): { page: number; pageSize: number; from: number; to: number } {
  const page = Math.max(0, Math.floor(query.page ?? 0));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(query.pageSize ?? DEFAULT_PAGE_SIZE)));
  const from = page * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

function applyCommonFilters<T>(q: T, query: RecordsQuery): T {
  // PostgREST builder is chainable and returns the same type; cast via unknown for generic helper
  let builder = q as unknown as {
    or: (s: string) => unknown;
    gte: (c: string, v: string | number) => unknown;
    lte: (c: string, v: string | number) => unknown;
    eq: (c: string, v: string) => unknown;
  };
  const search = query.search ? sanitizeIlike(query.search) : '';
  if (search) builder = builder.or(`client_first_name.ilike.%${search}%,client_last_name.ilike.%${search}%`) as typeof builder;
  if (query.dateFrom && isValidDateOnly(query.dateFrom)) builder = builder.gte('application_date', query.dateFrom) as typeof builder;
  if (query.dateTo && isValidDateOnly(query.dateTo)) builder = builder.lte('application_date', query.dateTo) as typeof builder;
  if (query.gender) builder = builder.eq('gender', query.gender) as typeof builder;
  if (typeof query.ageMin === 'number' && Number.isFinite(query.ageMin)) builder = builder.gte('age', Math.floor(query.ageMin)) as typeof builder;
  if (typeof query.ageMax === 'number' && Number.isFinite(query.ageMax)) builder = builder.lte('age', Math.floor(query.ageMax)) as typeof builder;
  return builder as unknown as T;
}

function hasMoreFromCount(count: number | null, from: number, returned: number, pageSize: number): boolean {
  return count != null ? from + returned < count : returned === pageSize;
}

function text(value: string, label: string, max = 120): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error(`${label} zorunludur ve geçerli olmalıdır.`);
  }
  return normalized;
}

function optionalText(value: string, label: string, max = 500): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return '';
  if (normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error(`${label} geçerli olmalıdır.`);
  }
  return normalized;
}

function isValidDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) throw new Error(`${label} geçersiz.`);
  return value;
}

export function canCreateRecord(pages: readonly StoredScanPage[], definition: FormDefinition): boolean {
  if (pages.length !== definition.totalPages) return false;
  const batches = new Set(pages.map(page => page.batchId));
  return (
    batches.size === 1 &&
    definition.pages.every(expected => {
      const page = pages.find(candidate => candidate.pageNumber === expected.pageNumber);
      return !!page && page.fingerprint === definition.fingerprint && /^[A-F0-9]{24}$/.test(page.batchId) &&
        expected.items.every(item => isEffectiveItem(item, page));
    })
  );
}

/** Kaydedilecek sayfa yükü: görüntü içermez; manuel düzeltmeler ve denetim izi korunur. */
export function toSavedPage(page: StoredScanPage): SavedAnswerPage {
  return {
    pageId: page.pageId,
    pageNumber: page.pageNumber,
    batchId: page.batchId,
    fingerprint: page.fingerprint,
    items: page.items.map(item => ({ ...item, measurements: item.measurements.map(measurement => ({ ...measurement })) })),
    quality: { ...page.quality, metrics: { ...page.quality.metrics }, reasons: [...page.quality.reasons] },
    sourceCorners: page.sourceCorners.map(point => ({ ...point })),
    warnings: [...page.warnings],
    sourceName: page.sourceName,
    manualReviews: Object.fromEntries(Object.entries(page.reviews).map(([key, review]) => [key, { ...review }])),
    // Denetim izi kayda taşınır: her manuel düzeltme/geri alma olayı
    // (itemId, işlem, reviewer, zaman, önce/sonra) kalıcı olarak saklanır.
    reviewHistory: page.reviewHistory.map(event => ({
      ...event,
      previous: event.previous ? { ...event.previous } : null,
      next: event.next ? { ...event.next } : null,
    })),
  };
}

function normalizeClient(input: RecordInput['client']) {
  const client = {
    firstName: text(input.firstName, 'Ad', 80),
    lastName: text(input.lastName, 'Soyad', 80),
    gender: input.gender,
    age: input.age,
    occupation: optionalText(input.occupation, 'Meslek', 120),
    education: optionalText(input.education, 'Eğitim durumu', 120),
    applicationDate: text(input.applicationDate, 'Uygulama tarihi', 10),
    requestedBy: optionalText(input.requestedBy, 'Başvuru nedeni', 500),
  };
  if (!['Kadın', 'Erkek', 'Belirtmek istemiyor', 'Diğer'].includes(client.gender)) throw new Error('Cinsiyet seçimi geçersiz.');
  if (!Number.isInteger(client.age) || client.age < 16 || client.age > 120) throw new Error('MMPI için yaş 16–120 arasında olmalıdır.');
  if (!isValidDateOnly(client.applicationDate) || client.applicationDate > todayIsoDate()) {
    throw new Error('Uygulama tarihi geçersiz veya ileri tarih olamaz.');
  }
  return client;
}

async function upsertRecord(
  client: ReturnType<typeof normalizeClient>,
  actor: AuthenticatedUser,
  idempotencyKey: string,
  answers: unknown[],
): Promise<MMPIRecord> {
  if (actor.role !== 'PSYCHOLOG' || !actor.active) {
    throw new Error('Kayıt yalnızca aktif Psikolog hesabı ile oluşturulabilir.');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    throw new Error('Kayıt anahtarı geçersiz. Sayfayı yenileyip tekrar deneyin.');
  }
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new Error('Kayıt için veri yükü boş olamaz.');
  }
  try {
    const serialized = JSON.stringify(answers);
    if (new TextEncoder().encode(serialized).byteLength > RAW_PAYLOAD_MAX_BYTES) {
      throw new Error(`Kayıt veri yükü ${RAW_PAYLOAD_MAX_BYTES / (1024 * 1024)} MB sınırını aşıyor.`);
    }
  } catch (cause) {
    if (cause instanceof Error && cause.message.includes('sınırını aşıyor')) throw cause;
    throw new Error('Kayıt veri yükü serileştirilemedi.');
  }
  if (!isValidRecordPayload(answers)) {
    throw new Error('Kayıt veri yükü biçimi geçersiz veya eksik.');
  }
  const payload = {
    idempotency_key: idempotencyKey,
    client_first_name: client.firstName,
    client_last_name: client.lastName,
    gender: client.gender,
    age: client.age,
    occupation: client.occupation,
    education: client.education,
    application_date: client.applicationDate,
    requested_by: client.requestedBy,
    raw_omr_answers: answers,
    created_by: actor.id,
  };
  const genericWriteFailure = 'Kayıt oluşturulamadı. Bilgileriniz korundu, lütfen tekrar deneyin.';
  let data: { id?: unknown; created_at?: unknown } | null = null;
  let response: { data: unknown; error: unknown };
  try {
    response = await requireSupabase()
      .from('mmpi_records')
      .upsert(payload, { onConflict: 'idempotency_key' })
      .select('id,created_at')
      .single();
  } catch (cause) {
    // Ağ/istisna yolu: orijinal sebep `cause` ile taşınır, `isNetworkError` kuyruğa
    // alma kararını bu zincirden verir.
    throw new Error(genericWriteFailure, { cause });
  }
  if (response.error) {
    // Şema/RLS kaynaklı hatalar (42703, PGRST204, 42501, 42P01 …) kullanıcıya
    // eyleme dönüştürülebilir mesaj olarak döner; ağ hatası ise kuyruğa alınabilmesi
    // için genel mesajda kalır.
    const detail = isNetworkError(response.error) ? genericWriteFailure : describeMutationError(response.error, genericWriteFailure);
    // Sebep her durumda zincire bağlanır: çevrimdışı kuyruğu `isNetworkError` ile karar verir.
    throw new Error(detail, { cause: response.error });
  }
  data = response.data as { id?: unknown; created_at?: unknown } | null;
  if (!data) throw new Error(genericWriteFailure);
  const row = data as { id?: unknown; created_at?: unknown };
  if (typeof row.id !== 'string' || typeof row.created_at !== 'string') throw new Error('Kayıt yanıtı geçersiz.');
  return { id: row.id, createdAt: row.created_at };
}

export async function createRecord(
  input: RecordInput,
  pages: readonly StoredScanPage[],
  definition: FormDefinition,
  actor: AuthenticatedUser,
  idempotencyKey: string,
  extras: unknown[] = [],
): Promise<MMPIRecord> {
  if (!canCreateRecord(pages, definition)) {
    throw new Error('4 sayfanın tamamı ve taranmış cevaplar onaylanmadan kayıt tamamlanamaz.');
  }
  const omrPages = pages
    .slice()
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map(toSavedPage);
  return upsertRecord(normalizeClient(input.client), actor, idempotencyKey, [...extras, ...omrPages]);
}

export async function createDataRecord(
  input: RecordInput,
  actor: AuthenticatedUser,
  idempotencyKey: string,
  payload: unknown[],
): Promise<MMPIRecord> {
  return upsertRecord(normalizeClient(input.client), actor, idempotencyKey, payload);
}

function mapSummaryRow(row: unknown): RecordSummary {
  const value = row as {
    id?: unknown;
    client_first_name?: unknown;
    client_last_name?: unknown;
    application_date?: unknown;
    created_at?: unknown;
    gender?: unknown;
    age?: unknown;
    occupation?: unknown;
    education?: unknown;
    requested_by?: unknown;
  };
  if (
    typeof value.id !== 'string' ||
    typeof value.client_first_name !== 'string' ||
    typeof value.client_last_name !== 'string' ||
    typeof value.application_date !== 'string' ||
    typeof value.created_at !== 'string'
  ) {
    throw new Error('Kayıt listesi geçersiz.');
  }
  return {
    id: value.id,
    firstName: value.client_first_name,
    lastName: value.client_last_name,
    applicationDate: value.application_date,
    createdAt: value.created_at,
    gender: value.gender as Gender,
    age: typeof value.age === 'number' ? value.age : undefined,
    occupation: typeof value.occupation === 'string' ? value.occupation : undefined,
    education: typeof value.education === 'string' ? value.education : undefined,
    requestedBy: typeof value.requested_by === 'string' ? value.requested_by : undefined,
  };
}

export async function listOwnRecordsPaged(query: RecordsQuery = {}): Promise<PagedRecords> {
  const { page, pageSize, from, to } = toPagedRange(query);
  let q = requireSupabase()
    .from('mmpi_records')
    .select('id,client_first_name,client_last_name,application_date,created_at,gender,age,occupation,education,requested_by', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  q = applyCommonFilters(q, query);
  const { data, error, count } = await q;
  if (error) throw new Error(describeMutationError(error, 'Test kayıtlarınız alınamadı.'));
  const records = (data ?? []).map(mapSummaryRow);
  return { records, count: count ?? null, hasMore: hasMoreFromCount(count ?? null, from, records.length, pageSize), page, pageSize };
}

export async function listOwnRecords(): Promise<RecordSummary[]> {
  const { records } = await listOwnRecordsPaged({ page: 0, pageSize: OWN_RECORDS_LIMIT });
  return records;
}

export async function listAllRecordsPaged(query: RecordsQuery = {}): Promise<PagedRecords> {
  const { page, pageSize, from, to } = toPagedRange(query);
  let q = requireSupabase()
    .from('mmpi_records')
    .select('id,client_first_name,client_last_name,application_date,created_at,gender,age,occupation,education,requested_by,created_by', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  q = applyCommonFilters(q, query);
  const { data, error, count } = await q;
  if (error) throw new Error(describeMutationError(error, 'Tüm test kayıtları alınamadı.'));
  const records = (data ?? []).map(row => {
    const v = row as Record<string, unknown>;
    return {
      id: String(v.id),
      firstName: String(v.client_first_name),
      lastName: String(v.client_last_name),
      applicationDate: String(v.application_date),
      createdAt: String(v.created_at),
      gender: v.gender as Gender,
      age: typeof v.age === 'number' ? v.age : undefined,
      occupation: typeof v.occupation === 'string' ? v.occupation : undefined,
      education: typeof v.education === 'string' ? v.education : undefined,
      requestedBy: typeof v.requested_by === 'string' ? v.requested_by : undefined,
      createdBy: typeof v.created_by === 'string' ? v.created_by : undefined,
    } as RecordSummary;
  });
  return { records, count: count ?? null, hasMore: hasMoreFromCount(count ?? null, from, records.length, pageSize), page, pageSize };
}

export async function listAllRecords(): Promise<RecordSummary[]> {
  const { data, error } = await requireSupabase()
    .from('mmpi_records')
    .select(`
      id,
      client_first_name,
      client_last_name,
      application_date,
      created_at,
      gender,
      age,
      occupation,
      education,
      requested_by,
      created_by,
      profiles:created_by (
        first_name,
        last_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(ALL_RECORDS_LIMIT);

  if (error) {
    // If join fails due to relationship naming, fallback to basic select
    const fallback = await requireSupabase()
      .from('mmpi_records')
      .select('id,client_first_name,client_last_name,application_date,created_at,gender,age,occupation,education,requested_by,created_by')
      .order('created_at', { ascending: false })
      .limit(ALL_RECORDS_LIMIT);
    if (fallback.error) throw new Error(describeMutationError(fallback.error, 'Tüm test kayıtları alınamadı.'));
    return (fallback.data ?? []).map(row => {
      const v = row as Record<string, unknown>;
      return {
        id: String(v.id),
        firstName: String(v.client_first_name),
        lastName: String(v.client_last_name),
        applicationDate: String(v.application_date),
        createdAt: String(v.created_at),
        gender: v.gender as Gender,
        age: typeof v.age === 'number' ? v.age : undefined,
        occupation: typeof v.occupation === 'string' ? v.occupation : undefined,
        education: typeof v.education === 'string' ? v.education : undefined,
        requestedBy: typeof v.requested_by === 'string' ? v.requested_by : undefined,
        createdBy: typeof v.created_by === 'string' ? v.created_by : undefined,
      };
    });
  }

  return (data ?? []).map(row => {
    const v = row as Record<string, unknown>;
    const profile = v.profiles as { first_name?: string; last_name?: string; email?: string } | null;
    const psychologistName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : undefined;
    return {
      id: String(v.id),
      firstName: String(v.client_first_name),
      lastName: String(v.client_last_name),
      applicationDate: String(v.application_date),
      createdAt: String(v.created_at),
      gender: v.gender as Gender,
      age: typeof v.age === 'number' ? v.age : undefined,
      occupation: typeof v.occupation === 'string' ? v.occupation : undefined,
      education: typeof v.education === 'string' ? v.education : undefined,
      requestedBy: typeof v.requested_by === 'string' ? v.requested_by : undefined,
      createdBy: typeof v.created_by === 'string' ? v.created_by : undefined,
      psychologistName: psychologistName || undefined,
      psychologistEmail: profile?.email || undefined,
    };
  });
}

export async function getRecordDetail(recordId: string): Promise<FullRecordDetail> {
  const id = requireUuid(recordId, 'Kayıt kimliği');
  // Admin'in kayıt detayına erişimi bilinçli ürün kararıdır (denetim/silme görevi);
  // tüm yazma işlemleri sunucu tarafında audit_logs tablosuna kaydedilir (B8).
  // '*' seçimi bilinçlidir: expert_notes/notes_updated_at kolonları migration
  // uygulanmamış ortamlarda bulunmayabilir; okuma toleranslıdır.
  const { data, error } = await requireSupabase()
    .from('mmpi_records')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(describeMutationError(error, 'Test detayları alınamadı; lütfen tekrar deneyin.'));
  if (!data) throw new Error('Kayıt bulunamadı veya bu kayda erişim yetkiniz bulunmuyor.');

  const v = data as Record<string, unknown>;
  return {
    id: String(v.id),
    firstName: String(v.client_first_name),
    lastName: String(v.client_last_name),
    applicationDate: String(v.application_date),
    createdAt: String(v.created_at),
    gender: v.gender as Gender,
    age: typeof v.age === 'number' ? v.age : undefined,
    occupation: typeof v.occupation === 'string' ? v.occupation : undefined,
    education: typeof v.education === 'string' ? v.education : undefined,
    requestedBy: typeof v.requested_by === 'string' ? v.requested_by : undefined,
    createdBy: typeof v.created_by === 'string' ? v.created_by : undefined,
    rawOmrAnswers: Array.isArray(v.raw_omr_answers) ? (v.raw_omr_answers as unknown[]) : [],
    expertNotes: typeof v.expert_notes === 'string' ? v.expert_notes : '',
    notesUpdatedAt: typeof v.notes_updated_at === 'string' ? v.notes_updated_at : undefined,
  };
}

export const EXPERT_NOTES_MAX = 4000;

/**
 * PostgREST/veritabanı hatalarını kullanıcıya dürüst ama hassas detay
 * sızdırmayan bir kategoriye çevirir. PostgREST hata `code`ları:
 *   - 42501      → satır-düzeyi güvenlik (RLS) ihlali / grant eksik
 *   - 42703/PGRST204 → tanımsız kolon (şema/migration eksik — örn. expert_notes)
 *   - 42P01/PGRST205 → tanımsız tablo (migration hiç uygulanmamış)
 *   - PGRST30x       → JWT süresi dolmuş / geçersiz (PGRST300/301/302)
 *   - PGRST116       → `.single()` tek satır bekledi ama 0/multiple satır geldi
 *                      (kayıt yok ya da RLS görünürlüğü engelliyor)
 *   - 22P02          → geçersiz UUID gibi tip hatası (çağrı katmanı zaten korur)
 *   - 23502          → NOT NULL ihlali (denetim izi / şema uyumsuzluğu)
 *   - 23503/23505/23514 → FK, uniqueness veya check bütünlük ihlali
 *   - P0001          → trigger içinde `raise exception` (PostgREST bunu 400 yapar)
 * Ağ hataları tarayıcı kaynaklıdır (Failed to fetch vb.).
 *
 * Teşhis için hata `code`su ve kısa `message`ı konsola yazılır. Ham `details`
 * BİLİNÇLİ olarak yazılmaz: PostgreSQL, kısıt ihlallerinde `details` alanına
 * satırın tamamını ("Failing row contains (...)") koyabilir ve bu, danışan
 * verisini tarayıcı konsoluna/log toplayıcısına taşır (KVKK).
 */
export function describeMutationError(cause: unknown, fallback: string): string {
  if (isNetworkError(cause)) {
    return 'Bağlantı kurulamadı; veriniz korundu, lütfen tekrar deneyin.';
  }
  const row = typeof cause === 'object' && cause !== null
    ? (cause as { code?: unknown; message?: unknown })
    : {};
  const code = String(row.code ?? '');
  if (code) {
    try {
      const message = typeof row.message === 'string' ? row.message.slice(0, 160) : '';
      console.error('[supabase] kayıt işlemi hatası', { code, message });
    } catch {
      /* konsol yoksa yut */
    }
  }
  if (code === '42501') {
    return 'Bu işlem için yetkiniz bulunmuyor (veritabanı yetkisi/RLS). Yöneticiniz supabase db push ile güncel politikaları uygulamalı.';
  }
  if (code === '42703' || code === 'PGRST204') {
    return 'Kayıt işlemleri için veritabanı güncellemesi gerekiyor; yöneticiniz supabase db push çalıştırmalı.';
  }
  if (code === '42P01' || code === 'PGRST205') {
    return 'Veritabanı şeması eksik; yöneticiniz supabase db push çalıştırmalı.';
  }
  if (/^PGRST30[12]$/.test(code)) return 'Oturumunuzun süresi dolmuş olabilir; lütfen yeniden giriş yapın.';
  if (code === 'PGRST116') {
    // `.single()` tek satır bekler: 0 satır = kayıt yok ya da RLS görünürlüğü engelliyor.
    // Canlı şema eskiyse kayıt politikaları da eksik olabilir; bu yüzden db push ipucu verilir.
    return 'Kayıt bulunamadı veya bu kayda erişim yetkiniz bulunmuyor. Şema eksik olabilir; yöneticiniz supabase db push çalıştırmalı.';
  }
  if (code === '22P02') return 'İşlem hedefi geçersiz; sayfayı yenileyip tekrar deneyin.';
  if (code === '23502') {
    if (/audit_logs/i.test(String(row.message ?? ''))) {
      return 'Denetim izi (audit_logs) bu işlemi kaydedemedi. Yöneticiniz supabase db push ile şemayı güncellemeli.';
    }
    return 'Zorunlu bir alan eksik gönderildi; sayfayı yenileyip tekrar deneyin.';
  }
  if (code === '23503' || code === '23505' || code === '23514') return 'Kayıt bütünlüğü korunamadı; tekrar deneyin.';
  if (code === 'P0001') {
    const detail = typeof row.message === 'string' ? row.message.trim() : '';
    return detail ? `Veritabanı işlemi reddetti: ${detail.slice(0, 160)}` : fallback;
  }
  return fallback;
}

/**
 * Kayıt sonrası uzman notunu günceller. Admin tüm görünür kayıtlara, aktif
 * psikolog ise yalnızca kendi kaydına not yazabilir. Not, yazdırma raporuna
 * "Uzman Değerlendirme Notu" bölümü olarak aktarılır; sunucu tarafı 4000
 * karakter sınırını da zorlar.
 *
 * Mutasyondan sonra `.select()` zincirlenmez. Bazı PostgREST/Supabase
 * kurulumlarında UPDATE/DELETE + RETURNING (yani `?select=id`) RLS veya eski
 * API katmanı nedeniyle 400 dönebiliyor. `count: 'exact'` ile temsil gövdesi
 * istemeden etkilenen satırı doğruluyoruz; böylece hem 400 kalkıyor hem de RLS
 * tarafından sessizce filtrelenen 0 satır başarı gibi gösterilmiyor.
 */
export async function updateExpertNotes(recordId: string, notes: string): Promise<string> {
  const id = requireUuid(recordId, 'Kayıt kimliği');
  const normalized = notes.replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();
  if (normalized.length > EXPERT_NOTES_MAX) {
    throw new Error(`Uzman notu en fazla ${EXPERT_NOTES_MAX} karakter olabilir.`);
  }
  const client = requireSupabase();
  const requestedAt = new Date().toISOString();
  const { count, error } = await client
    .from('mmpi_records')
    .update({ expert_notes: normalized, notes_updated_at: requestedAt }, { count: 'exact' })
    .eq('id', id);
  if (error) throw new Error(describeMutationError(error, 'Uzman notu kaydedilemedi; lütfen tekrar deneyin.'));
  // RLS, yetkisiz UPDATE'i hata vermeden 0 satır olarak filtreleyebilir.
  if (count !== 1) throw new Error('Kayıt bulunamadı veya bu kayıt üzerinde not yazma yetkiniz bulunmuyor.');
  return requestedAt;
}

export async function deleteRecord(recordId: string): Promise<void> {
  const id = requireUuid(recordId, 'Kayıt kimliği');
  const client = requireSupabase();

  // DELETE + select=id, bazı PostgREST/RLS kombinasyonlarında gereksiz bir
  // 400 üretir. Temsil istemeden sil; exact count, RLS'nin satırı gerçekten
  // etkileyip etkilemediğini doğrular.
  const { count, error } = await client.from('mmpi_records').delete({ count: 'exact' }).eq('id', id);
  if (error) throw new Error(describeMutationError(error, 'Test kaydı silinemedi; lütfen tekrar deneyin.'));
  if (count !== 1) throw new Error('Kayıt bulunamadı veya bu kayıt üzerinde silme yetkiniz bulunmuyor.');
}
