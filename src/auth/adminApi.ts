import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { requireSupabase } from './supabaseClient';
import type { AuthenticatedUser } from './authTypes';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function rowToUser(row: unknown): AuthenticatedUser {
  const value = row as Partial<AuthenticatedUser> & { first_name?: string; last_name?: string };
  if (
    typeof value.id !== 'string' || !UUID_PATTERN.test(value.id) ||
    typeof value.email !== 'string' || value.email.length > 254 || !value.email.trim() || /[\u0000-\u001f\u007f]/.test(value.email) ||
    typeof value.first_name !== 'string' || value.first_name.trim().length < 2 || value.first_name.length > 80 || /[\u0000-\u001f\u007f]/.test(value.first_name) ||
    typeof value.last_name !== 'string' || value.last_name.trim().length < 2 || value.last_name.length > 80 || /[\u0000-\u001f\u007f]/.test(value.last_name) ||
    (value.role !== 'ADMIN' && value.role !== 'PSYCHOLOG') ||
    typeof value.active !== 'boolean'
  ) {
    throw new Error('Kullanıcı kaydı geçersiz.');
  }
  return {
    id: value.id,
    email: value.email,
    firstName: value.first_name,
    lastName: value.last_name,
    role: value.role,
    active: value.active,
  };
}

export async function listPsychologists(): Promise<AuthenticatedUser[]> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id,email,first_name,last_name,role,active')
    .eq('role', 'PSYCHOLOG')
    .order('created_at', { ascending: true });
  if (error) throw new Error('Psikolog listesi alınamadı.');
  return (data ?? []).map(rowToUser);
}

/** supabase-js `functions.invoke` çıktısının hata tarafında kullandığımız alanları. */
export type EdgeFunctionInvocation = {
  error: unknown;
  /** invoke sonucundaki Response; HTTP durum kodu ve sunucu mesajının kaynağı. */
  response?: Response;
};

function originHint(): string {
  if (typeof window === 'undefined' || !window.location?.origin) return '';
  return ` (bu uygulamanın origin'i: ${window.location.origin})`;
}

/**
 * Edge Function'ın kendi `{ error: string }` gövdesini okur. Yalnız sunucunun
 * (bizim fonksiyonumuzun) ürettiği kısa mesaj gösterilir: ham yığın izi, SQL
 * ayrıntısı veya gövdenin tamamı istemciye taşınmaz. Okunamayan gövde (boş,
 * JSON değil, zaten tüketilmiş, CORS ile gizlenmiş) sessizce boş kabul edilir.
 */
async function serverMessage(response: Response | undefined): Promise<string> {
  if (!response) return '';
  try {
    const text = await response.text();
    if (!text || text.length > 4096) return '';
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return '';
    const value = (parsed as { error?: unknown }).error;
    if (typeof value !== 'string') return '';
    const cleaned = value.trim().replace(/[\u0000-\u001f\u007f]/g, ' ');
    return cleaned.slice(0, 200);
  } catch {
    return '';
  }
}

/** HTTP durumu: invoke'un döndürdüğü Response, yoksa hata sınıfının taşıdığı Response. */
function statusOf(error: unknown, response?: Response): number | null {
  if (response && Number.isInteger(response.status) && response.status > 0) return response.status;
  if (error instanceof FunctionsHttpError || error instanceof FunctionsRelayError) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response && Number.isInteger(context.status) && context.status > 0) return context.status;
  }
  return null;
}

/**
 * Edge Function çağrısı başarısız olduğunda **gerçek nedene** göre eyleme
 * dönüştürülebilir bir mesaj üretir. Önceki davranış her başarısızlığı tek
 * cümlede ("Edge Function bağlantısını kontrol edin") eziyordu; bu yüzden
 * origin allowlist'i (403), süresi dolmuş oturum (401), bulunamayan hedef
 * (404) ve veritabanı/şema hatası (500) ayırt edilemiyordu.
 *
 * supabase-js üç farklı hata sınıfı döndürür:
 *   - FunctionsHttpError   → fonksiyon yanıt verdi (context = Response)
 *   - FunctionsRelayError  → Supabase relay fonksiyona ulaşamadı (context = Response)
 *   - FunctionsFetchError  → tarayıcı isteği hiç tamamlayamadı (context = TypeError):
 *                            pratikte ağ ya da CORS (`ALLOWED_ORIGINS`) demektir
 */
export async function explainEdgeFunctionError(
  { error, response }: EdgeFunctionInvocation,
  fallback: string,
): Promise<string> {
  const detail = await serverMessage(response);
  const suffix = detail ? detail.endsWith('.') ? detail : `${detail}.` : '';

  if (error instanceof FunctionsFetchError) {
    return `Edge Function isteği tarayıcıdan tamamlanamadı${originHint()}. ` +
      'En olası neden: ALLOWED_ORIGINS secret\'ında bu sitenin adresi yok (CORS) ya da fonksiyon deploy edilmemiş. ' +
      'Yönetici: supabase functions deploy admin-users && supabase secrets set ALLOWED_ORIGINS=<uygulama adresi>';
  }
  if (error instanceof FunctionsRelayError) {
    return 'Supabase relay Edge Function\'a ulaşamadı (fonksiyon yanıt vermedi). ' +
      'Yönetici: fonksiyonun deploy edildiğini ve Edge Functions sekmesinde son sürümün aktif olduğunu kontrol edin.';
  }

  const status = statusOf(error, response);
  if (status === 401) {
    return `Oturumunuz doğrulanamadı veya süresi doldu; çıkış yapıp yeniden giriş yapın.${suffix ? ` ${suffix}` : ''}`;
  }
  if (status === 403) {
    if (/origin|allowlist|allowed_origins/i.test(detail)) {
      return `Bu site adresi sunucuda izinli değil (403).${originHint()} ` +
        'Yönetici: supabase secrets set ALLOWED_ORIGINS=<uygulama adresi>';
    }
    return `Bu işlem için yetkiniz yok (403).${suffix ? ` ${suffix}` : ''} ` +
      'Yalnızca aktif Admin hesabı psikolog oluşturabilir, durum değiştirebilir ve silebilir.';
  }
  if (status === 404) {
    return `Hedef kayıt bulunamadı (404).${suffix ? ` ${suffix}` : ''} Liste güncel değilse yenileyip tekrar deneyin.`;
  }
  if (status === 413) {
    return 'İstek sunucunun sınırından büyük (413); daha kısa bir girdiyle tekrar deneyin.';
  }
  if (status === 429) {
    return `Çok fazla istek gönderildi (429).${suffix ? ` ${suffix}` : ''} Kısa bir süre bekleyip tekrar deneyin.`;
  }
  if (status === 500) {
    return `Sunucu tarafı yapılandırma hatası (500).${suffix ? ` ${suffix}` : ''} ` +
      'Yönetici: `supabase functions deploy admin-users` ve `supabase db push` komutlarını çalıştırıp durumu doğrulasın ' +
      '(ayrıntılı kontrol: npm run diagnose:supabase).';
  }
  if (status !== null && detail) return `${suffix} (HTTP ${status})`;
  if (status !== null) return `${fallback} (HTTP ${status}).`;
  if (error instanceof Error && error.message && error.message !== 'Edge Function returned a non-2xx status code') {
    return `${fallback} (${error.message.slice(0, 200)}).`;
  }
  return fallback;
}

export async function createPsychologist(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<AuthenticatedUser> {
  const { data, error, response } = await requireSupabase().functions.invoke('admin-users', {
    body: {
      action: 'create',
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: input.password,
    },
  });
  if (error || !data?.profile) {
    throw new Error(await explainEdgeFunctionError({ error, response }, 'Psikolog hesabı oluşturulamadı.'));
  }
  return rowToUser(data.profile);
}

export async function setPsychologistActive(userId: string, active: boolean): Promise<AuthenticatedUser> {
  const { data, error, response } = await requireSupabase().functions.invoke('admin-users', {
    body: { action: 'set_active', userId, active },
  });
  if (error || !data?.profile) {
    throw new Error(await explainEdgeFunctionError({ error, response }, 'Hesap durumu değiştirilemedi.'));
  }
  return rowToUser(data.profile);
}

export async function deletePsychologist(userId: string): Promise<void> {
  // Account deletion is deliberately Edge-Function-only. A direct profile DELETE would leave an
  // orphaned Auth user (or cascade data without deleting the credentials) when the function is
  // unavailable, which is worse than showing an actionable deployment error.
  const { data, error, response } = await requireSupabase().functions.invoke('admin-users', {
    body: { action: 'delete', userId },
  });
  if (error || !data?.ok) {
    throw new Error(await explainEdgeFunctionError({ error, response }, 'Kullanıcı hesabı silinemedi.'));
  }
}
