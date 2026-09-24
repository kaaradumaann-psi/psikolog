/**
 * AI yorum istemcisi — Supabase Edge Function `ai-interpretation` ile konuşur.
 *
 * Güvenlik notları:
 *  - İstek, oturum Bearer token'ıyla (session) imzalanır; fonksiyon tarafında JWT,
 *    profil rolü ve (kayıt modunda) kayıt sahipliği yeniden doğrulanır.
 *  - LLM'e yalnız sayısal olarak doğrulanmış, İSİMSİZ profil özeti gönderilir
 *    (KVKK m.4/3-d sahte isimlendirme: danışan adı/soyadı cihazdan asla
 *    ayrılmaz; yalnız yaş + cinsiyet bağlamı taşınır). Serbest metin yok.
 *  - Sonuç, 24 saat boyunca cihazda (localStorage) önbelleğe alınır; profil değişirse
 *    önbellek geçersiz sayılır (özet hash'i karşılaştırılır). Önbellek anahtarı
 *    kullanıcıya özgüdür — aynı cihazı paylaşan iki hesap birbirinin yorumunu
 *    göremez.
 *  - Görüntü/piksel verisi hiçbir zaman gönderilmez.
 */
import { supabase, supabaseConfig } from '../auth/supabaseClient';
import type { MMPIProfile } from '../scoring/mmpiScoring';

export type AiProfileSummary = {
  gender: 'Erkek' | 'Kadın';
  method: 'quick' | 'raw' | 'omr';
  /** Kimlik bağlamı: yalnız yaş. Ad/soyad LLM istemine KATILMAZ. */
  client: { age: number } | null;
  scales: { id: string; raw: number; k: number | null; t: number; level: string }[];
  validity: {
    cannotSay: number;
    l: number;
    f: number;
    k: number;
    fMinusK: number;
    status: 'GECERLI' | 'SUPHELI' | 'GECERSIZ';
    config: string | null;
  };
  profileCode: string | null;
  maxT: number;
  minT: number;
};

export type AiInterpretationResult = {
  text: string;
  model: string;
  generatedAt: string;
};

export type AiInterpretationError = Error & { code?: number };

const REQUEST_TIMEOUT_MS = 120_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TRANSIENT_RETRY_DELAY_MS = 1_200;

/**
 * Eski istem sürümleri, modelin çıktısının sonuna bir sorumluluk notu ekletiyordu;
 * bu not kaldırıldı (arayüzde ayrıca gösterilmiyor, tekrar bilgilendirme yaratıyor).
 * 24 saatlik önbellekteki eski sonuçlarda not hâlâ bulunabildiğinden, okuma ve
 * üretim anında sıyrılır.
 */
const LEGACY_DISCLAIMER_NOTE =
  'Bu yorum yapay zekâ destekli bir karar destek çıktısıdır; tanı koyamaz ve klinik kararın yerine geçmez. Nihai değerlendirme uygulayıcı uzmana aittir.';

function stripLegacyDisclaimerNote(text: string): string {
  const trimmed = text.trimEnd();
  return trimmed.endsWith(LEGACY_DISCLAIMER_NOTE)
    ? trimmed.slice(0, trimmed.length - LEGACY_DISCLAIMER_NOTE.length).trimEnd()
    : trimmed;
}

/**
 * MMPIProfile'dan LLM'e gidecek sayısal özeti üretir (tüm alanlar doğrulanmış
 * sayıdır). Danışanın adı/soyadı özetin hiçbir alanına yazılmaz: yorum yalnız
 * sayısal profil + yaş/cinsiyet bağlamından üretilir, dolayısıyla LLM sağlayıcısına
 * kişiyi doğrudan tanımlayan veri gönderilmez.
 */
export function buildAiProfileSummary(
  profile: MMPIProfile,
  method: 'quick' | 'raw' | 'omr',
  client: { age: number } | null,
): AiProfileSummary {
  const scaleEntry = (id: string) => profile.scales.find(scale => scale.id === id);
  return {
    gender: profile.gender,
    method,
    client: client && client.age >= 16 && client.age <= 120 ? { age: client.age } : null,
    scales: profile.scales
      .filter(scale => scale.id !== '?')
      .map(scale => ({
        id: scale.id,
        raw: scale.rawScore,
        k: scale.kAdded !== undefined ? scale.kAdded : null,
        t: scale.tScore,
        level: scale.level,
      })),
    validity: {
      cannotSay: profile.cannotSayScale.rawScore,
      l: scaleEntry('L')?.rawScore ?? 0,
      f: scaleEntry('F')?.rawScore ?? 0,
      k: scaleEntry('K')?.rawScore ?? 0,
      fMinusK: profile.validityAnalysis.fMinusK,
      status: profile.validityAnalysis.status,
      config: profile.validityAnalysis.validityConfig?.name ?? null,
    },
    profileCode: profile.profileCode ?? null,
    maxT: profile.maxT,
    minT: profile.minT,
  };
}

/** Özetin önbellek anahtarı için kısa hash'i (djb2). */
function summarizeHash(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

type CacheEntry = { hash: string; result: AiInterpretationResult };

function cacheKey(scope: { recordId?: string; userId?: string | null }): string {
  const userSuffix = scope.userId ? `:${scope.userId.slice(0, 8)}` : '';
  return scope.recordId ? `mmpi566:ai:record:${scope.recordId}${userSuffix}` : `mmpi566:ai:draft${userSuffix}`;
}

function readCache(key: string, hash: string): AiInterpretationResult | null {
  try {
    // localStorage bazı gizli pencerelerde erişilemez; hız kesiciye düşmeden çık.
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || parsed.hash !== hash || !parsed.result || typeof parsed.result.text !== 'string' ||
      !parsed.result.text || typeof parsed.result.generatedAt !== 'string') return null;
    const age = Date.now() - Date.parse(parsed.result.generatedAt);
    if (!Number.isFinite(age) || age > CACHE_TTL_MS) return null;
    return parsed.result;
  } catch {
    return null;
  }
}

function writeCache(key: string, hash: string, result: AiInterpretationResult): void {
  try {
    // GÜVENLİK: yalnızca anonim özet + model metni saklanır; PII yok.
    window.localStorage.setItem(key, JSON.stringify({ hash, result } satisfies CacheEntry));
  } catch {
    /* depolama dolu/erişilemez: önbellek isteğe bağlı */
  }
}

export type AiInterpretationRequest = {
  summary: AiProfileSummary;
  /** Kayıt modu: recordId verilirse Edge Function kayıt sahipliğini doğrular. */
  recordId?: string;
  /** true = "Yeniden Oluştur": cihaz önbelleği atlanır, ağa zorla çıkılır. */
  ignoreCache?: boolean;
};

function isTransientCode(code: number | undefined): boolean {
  return code === 502 || code === 504 || code === 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

/**
 * AI yorumunu ister. Önbellekte taze bir sonuç varsa (ve ignoreCache verilmediyse)
 * ağa çıkmadan onu döner. Hata durumunda `AiInterpretationError` fırlatır
 * (code: 401/403/404/413/429/502/503/504).
 *
 * Dayanıklılık: soğuk başlatma / geçici ağ kesintisinde (502/504/0) tek seferlik
 * kısa bir yeniden deneme yapılır; kalıcı hatalarda (401/403/404) doğrudan döner.
 */
export async function requestAiInterpretation(request: AiInterpretationRequest): Promise<AiInterpretationResult> {
  if (!supabase || !supabaseConfig.configured) {
    throw Object.assign(new Error('Yapay zekâ yorum özelliği bu kurulumda etkin değil.'), { code: 503 } as AiInterpretationError);
  }

  // Oturum önce alınır: hem Bearer hem de kullanıcıya özgü önbellek anahtarı için.
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const userId = sessionData.session?.user?.id ?? null;
  if (!token) {
    throw Object.assign(new Error('Oturum doğrulanamadı; lütfen yeniden giriş yapın.'), { code: 401 } as AiInterpretationError);
  }

  const key = cacheKey({ recordId: request.recordId, userId });
  const hash = summarizeHash(JSON.stringify(request.summary));
  if (!request.ignoreCache) {
    const cached = readCache(key, hash);
    if (cached) return cached;
  }

  let lastTransient: AiInterpretationError | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const upstream = await fetch(`${supabaseConfig.url}/functions/v1/ai-interpretation`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: supabaseConfig.anonKey,
        },
        body: JSON.stringify({
          mode: request.recordId ? 'record' : 'draft',
          ...(request.recordId ? { recordId: request.recordId } : {}),
          profile: request.summary,
        }),
      });
      let payload: { error?: string; ok?: boolean; text?: string; model?: string; generatedAt?: string };
      try {
        payload = await upstream.json();
      } catch {
        payload = {};
      }
      if (!upstream.ok || !payload.ok || typeof payload.text !== 'string' || !payload.text) {
        const message = typeof payload.error === 'string' && payload.error
          ? payload.error
          : 'Yapay zekâ yorumu üretilmedi; lütfen tekrar deneyin.';
        const code = upstream.status || 0;
        const err = Object.assign(new Error(message), { code } as AiInterpretationError);
        if (isTransientCode(code) && attempt === 0) {
          lastTransient = err as AiInterpretationError;
          // Kısa bekleme ardından tek seferlik yeniden dene
          window.clearTimeout(timer);
          await sleep(TRANSIENT_RETRY_DELAY_MS);
          continue;
        }
        throw err;
      }
      const result: AiInterpretationResult = {
        text: stripLegacyDisclaimerNote(payload.text),
        model: typeof payload.model === 'string' ? payload.model : 'yapay zekâ',
        generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : new Date().toISOString(),
      };
      writeCache(key, hash, result);
      return result;
    } catch (error) {
      if (error instanceof Error && (error as AiInterpretationError).code !== undefined) {
        const code = (error as AiInterpretationError).code;
        if (isTransientCode(code) && attempt === 0) {
          lastTransient = error as AiInterpretationError;
          window.clearTimeout(timer);
          await sleep(TRANSIENT_RETRY_DELAY_MS);
          continue;
        }
        throw error;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        const err = Object.assign(new Error('Yapay zekâ yanıtı zamanında gelmedi; lütfen tekrar deneyin.'), { code: 504 } as AiInterpretationError);
        if (attempt === 0) {
          lastTransient = err as AiInterpretationError;
          window.clearTimeout(timer);
          await sleep(TRANSIENT_RETRY_DELAY_MS);
          continue;
        }
        throw err;
      }
      // Ağ hatası (fetch TypeError) → geçici say, bir kez dene
      if (attempt === 0) {
        lastTransient = Object.assign(new Error('Bağlantı kurulamadı; lütfen tekrar deneyin.'), { code: 0 } as AiInterpretationError);
        window.clearTimeout(timer);
        await sleep(TRANSIENT_RETRY_DELAY_MS);
        continue;
      }
      throw Object.assign(new Error('Bağlantı kurulamadı; lütfen tekrar deneyin.'), { code: 0 } as AiInterpretationError);
    } finally {
      window.clearTimeout(timer);
    }
  }

  // Döngüden buraya yalnızca ilk deneme geçici hatayla bitti ve ikinci deneme de
  // aynı sınıfta bir hata verdiyse ulaşılır; son hatayı taşı.
  if (lastTransient) throw lastTransient;
  throw Object.assign(new Error('Yapay zekâ yorumu üretilemedi; lütfen tekrar deneyin.'), { code: 0 } as AiInterpretationError);
}
