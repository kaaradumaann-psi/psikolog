import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
let adminClient: ReturnType<typeof createClient> | null = null;
try {
  if (supabaseUrl && serviceRoleKey) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
} catch {
  adminClient = null;
}

type ActionBody =
  | {
      action: 'create';
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      role?: 'PSYCHOLOG' | 'ORG_ADMIN';
      organizationId?: string;
    }
  | { action: 'set_active'; userId: string; active: boolean }
  | { action: 'set_org'; userId: string; organizationId: string | null }
  | { action: 'delete'; userId: string };

type Profile = {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'ORG_ADMIN' | 'PSYCHOLOG';
  active: boolean;
  organization_id: string | null;
};

function configuredOrigins(): string[] {
  return (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .flatMap((value) => {
      try {
        const parsed = new URL(value);
        const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
        if (
          (!local && parsed.protocol !== 'https:') ||
          (local && !['http:', 'https:'].includes(parsed.protocol)) ||
          parsed.pathname !== '/' ||
          parsed.username ||
          parsed.password ||
          parsed.search ||
          parsed.hash
        )
          return [];
        return [parsed.origin];
      } catch {
        return [];
      }
    });
}

function isAllowedOrigin(origin: string): boolean {
  const configured = configuredOrigins();
  if (configured.length > 0) return configured.includes(origin);
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

function headers(request: Request): HeadersInit {
  const origin = request.headers.get('origin');
  const result: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
  if (origin && isAllowedOrigin(origin)) result['Access-Control-Allow-Origin'] = origin;
  return result;
}

function response(request: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: headers(request) });
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function isDatabaseSideError(error: unknown): boolean {
  const record = (typeof error === 'object' && error !== null ? error : {}) as {
    message?: unknown;
    code?: unknown;
    status?: unknown;
  };
  const message = String(record.message ?? error ?? '');
  const status = typeof record.status === 'number' ? record.status : Number(record.code);
  const dbSignature =
    /23502|23503|23505|23514|42501|42703|42P01|PGRST|null value|audit_logs|trigger|row-level security|permission denied|database error|unexpected_failure|error creating new user|error saving new user/i;
  if (dbSignature.test(message)) return true;
  return (
    Number.isFinite(status) &&
    status >= 500 &&
    /database|schema|relation|column|constraint|trigger|policy|audit/i.test(message)
  );
}

function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new ValidationError(`${label} geçersiz.`);
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (
    normalized.length < min ||
    normalized.length > max ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  )
    throw new ValidationError(`${label} geçersiz.`);
  return normalized;
}

function email(value: unknown): string {
  const normalized = text(value, 'E-posta', 5, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new ValidationError('E-posta geçersiz.');
  return normalized;
}

function password(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length < 10 ||
    value.length > 128 ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    throw new ValidationError('Şifre geçersiz.');
  return value;
}

function uuid(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new ValidationError('Kimlik geçersiz.');
  }
  return value;
}

function safeProfile(value: unknown): Profile {
  const row = value as Partial<Profile>;
  if (
    typeof row.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.id) ||
    (typeof row.email !== 'string' && row.email !== null) ||
    (typeof row.email === 'string' && !row.email.trim()) ||
    typeof row.first_name !== 'string' ||
    row.first_name.trim().length < 2 ||
    row.first_name.length > 80 ||
    typeof row.last_name !== 'string' ||
    row.last_name.trim().length < 2 ||
    row.last_name.length > 80 ||
    (row.role !== 'ADMIN' && row.role !== 'ORG_ADMIN' && row.role !== 'PSYCHOLOG') ||
    typeof row.active !== 'boolean'
  ) {
    throw new Error('Profil yanıtı geçersiz.');
  }
  return row as Profile;
}

Deno.serve(async (request) => {
  try {
    const origin = request.headers.get('origin');
    if (origin && !isAllowedOrigin(origin))
      return response(request, 403, { error: 'Origin not allowed' });
    if (request.method === 'OPTIONS') return new Response('ok', { headers: headers(request) });
    if (request.method !== 'POST') return response(request, 405, { error: 'Method not allowed' });
    if (!supabaseUrl || !serviceRoleKey || !adminClient)
      return response(request, 500, { error: 'Function configuration is incomplete' });

    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer '))
      return response(request, 401, { error: 'Authentication required' });
    const token = authorization.slice('Bearer '.length);
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authData.user)
      return response(request, 401, { error: 'Authentication required' });

    const { data: callerRow, error: callerError } = await adminClient
      .from('profiles')
      .select('id,email,first_name,last_name,role,active,organization_id')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (
      callerError ||
      !callerRow ||
      (callerRow.role !== 'ADMIN' && callerRow.role !== 'ORG_ADMIN') ||
      !callerRow.active
    )
      return response(request, 403, { error: 'Admin role required' });

    const declaredLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > 32 * 1024) {
      return response(request, 413, { error: 'Request too large' });
    }
    let body: ActionBody;
    try {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > 32 * 1024)
        return response(request, 413, { error: 'Request too large' });
      body = JSON.parse(rawBody) as ActionBody;
    } catch {
      return response(request, 400, { error: 'Invalid request' });
    }

    try {
      if (body.action === 'create') {
        const firstName = text(body.firstName, 'Ad', 2, 80);
        const lastName = text(body.lastName, 'Soyad', 2, 80);
        const userEmail = email(body.email);
        const passwordValue = password(body.password);
        const role = body.role === 'ORG_ADMIN' ? 'ORG_ADMIN' : 'PSYCHOLOG';
        let orgId: string | null = null;
        if (body.organizationId) orgId = uuid(body.organizationId);
        else if (callerRow.role === 'ORG_ADMIN') orgId = callerRow.organization_id;

        // ORG_ADMIN can only create PSYCHOLOG in own org
        if (callerRow.role === 'ORG_ADMIN') {
          if (role !== 'PSYCHOLOG')
            return response(request, 403, { error: 'ORG_ADMIN can only create PSYCHOLOG' });
          if (orgId !== callerRow.organization_id)
            return response(request, 403, { error: 'Organization mismatch' });
        }

        const { data, error } = await adminClient.auth.admin.createUser({
          email: userEmail,
          password: passwordValue,
          email_confirm: true,
          user_metadata: { first_name: firstName, last_name: lastName },
        });
        if (error || !data.user) {
          console.error('Admin user creation failed', error);
          const message = String((error as { message?: unknown })?.message ?? '');
          if (/already been registered|already exists|user already/i.test(message)) {
            return response(request, 409, { error: 'Bu e-posta ile kayıtlı bir hesap var.' });
          }
          if (/length|at least|password/i.test(message)) {
            return response(request, 400, { error: 'Parola sunucu güvenlik kurallarını karşılamıyor.' });
          }
          if (isDatabaseSideError(error)) {
            return response(request, 500, {
              error:
                'Kullanıcı hesabı oluşturulamadı: canlı veritabanı şeması güncel değil. Yönetici supabase db push çalıştırmalı.',
            });
          }
          return response(request, 400, { error: 'Kullanıcı hesabı oluşturulamadı' });
        }

        // Update profile with role and org
        const { error: profileUpdateError } = await adminClient
          .from('profiles')
          .update({ first_name: firstName, last_name: lastName, role, organization_id: orgId })
          .eq('id', data.user.id);
        if (profileUpdateError) {
          console.error('Profile update after creation failed', profileUpdateError);
          await adminClient.auth.admin.deleteUser(data.user.id);
          return response(request, 500, { error: 'Kullanıcı profili oluşturulamadı' });
        }

        const { data: profileRow, error: profileError } = await adminClient
          .from('profiles')
          .select('id,email,first_name,last_name,role,active,organization_id')
          .eq('id', data.user.id)
          .single();
        if (profileError || !profileRow) {
          console.error('Profile read after creation failed', profileError);
          await adminClient.auth.admin.deleteUser(data.user.id);
          return response(request, 500, { error: 'Kullanıcı profili oluşturulamadı' });
        }
        try {
          return response(request, 200, { profile: safeProfile(profileRow) });
        } catch {
          await adminClient.auth.admin.deleteUser(data.user.id);
          return response(request, 500, { error: 'Kullanıcı profili oluşturulamadı' });
        }
      }

      if (body.action === 'set_active') {
        if (typeof body.active !== 'boolean')
          return response(request, 400, { error: 'Invalid account state' });
        const userId = uuid(body.userId);
        const { data: target, error: targetError } = await adminClient
          .from('profiles')
          .select('id,email,first_name,last_name,role,active,organization_id')
          .eq('id', userId)
          .maybeSingle();
        if (targetError || !target || target.role === 'ADMIN')
          return response(request, 404, { error: 'User not found' });

        // ORG_ADMIN can only manage own org
        if (
          callerRow.role === 'ORG_ADMIN' &&
          target.organization_id !== callerRow.organization_id
        ) {
          return response(request, 403, { error: 'Organization mismatch' });
        }

        const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: body.active ? 'none' : '876000h',
        });
        if (authUpdateError) {
          console.error('Auth ban update failed', authUpdateError);
          if (isDatabaseSideError(authUpdateError)) {
            return response(request, 500, {
              error:
                'Hesap durumu güncellenemedi: canlı veritabanı şeması güncel değil. Yönetici supabase db push çalıştırmalı.',
            });
          }
          return response(request, 400, { error: 'Auth hesabı durumu güncellenemedi' });
        }
        const { data: profileRow, error: profileError } = await adminClient
          .from('profiles')
          .update({ active: body.active })
          .eq('id', userId)
          .select('id,email,first_name,last_name,role,active,organization_id')
          .single();
        if (profileError || !profileRow) {
          await adminClient.auth.admin.updateUserById(userId, {
            ban_duration: target.active ? 'none' : '876000h',
          });
          console.error('Profile activation update failed', profileError);
          return response(request, 500, {
            error: isDatabaseSideError(profileError)
              ? 'Hesap durumu güncellenemedi: canlı veritabanı şeması güncel değil. Yönetici supabase db push çalıştırmalı.'
              : 'Profil durumu güncellenemedi',
          });
        }
        return response(request, 200, { profile: safeProfile(profileRow) });
      }

      if (body.action === 'set_org') {
        const userId = uuid(body.userId);
        const orgId = body.organizationId ? uuid(body.organizationId) : null;

        if (callerRow.role !== 'ADMIN')
          return response(request, 403, { error: 'Only ADMIN can set organization' });

        const { data: target, error: targetError } = await adminClient
          .from('profiles')
          .select('id,role')
          .eq('id', userId)
          .maybeSingle();
        if (targetError || !target || target.role === 'ADMIN')
          return response(request, 404, { error: 'User not found' });

        const { data: profileRow, error: profileError } = await adminClient
          .from('profiles')
          .update({ organization_id: orgId })
          .eq('id', userId)
          .select('id,email,first_name,last_name,role,active,organization_id')
          .single();
        if (profileError || !profileRow) {
          console.error('Profile org update failed', profileError);
          return response(request, 500, { error: 'Organizasyon güncellenemedi' });
        }
        return response(request, 200, { profile: safeProfile(profileRow) });
      }

      if (body.action === 'delete') {
        const userId = uuid(body.userId);
        const { data: target, error: targetError } = await adminClient
          .from('profiles')
          .select('id,role,organization_id')
          .eq('id', userId)
          .maybeSingle();
        if (targetError || !target || target.role === 'ADMIN')
          return response(request, 404, { error: 'User not found' });

        if (
          callerRow.role === 'ORG_ADMIN' &&
          target.organization_id !== callerRow.organization_id
        ) {
          return response(request, 403, { error: 'Organization mismatch' });
        }

        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
        if (deleteAuthError) {
          console.error('Admin user deletion failed', deleteAuthError);
          if (isDatabaseSideError(deleteAuthError)) {
            return response(request, 500, {
              error:
                'Kullanıcı silinemedi: canlı veritabanı şeması güncel değil. Yönetici supabase db push çalıştırmalı (denetim izi/RLS sözleşmesi).',
            });
          }
          return response(request, 400, { error: 'Kullanıcı silinirken hata oluştu' });
        }
        return response(request, 200, { ok: true });
      }

      return response(request, 400, { error: 'Unknown action' });
    } catch (error) {
      if (error instanceof ValidationError)
        return response(request, 400, { error: error.message });
      console.error('admin-users action failed', error);
      if (isDatabaseSideError(error)) {
        return response(request, 500, {
          error:
            'İşlem tamamlanamadı: canlı veritabanı şeması güncel değil. Yönetici supabase db push çalıştırmalı.',
        });
      }
      return response(request, 500, {
        error:
          'İşlem tamamlanamadı; yönetici supabase functions logs admin-users çıktısını kontrol etmeli.',
      });
    }
  } catch (error) {
    console.error('admin-users handler failed', error);
    return response(request, 500, {
      error:
        'İstek işlenemedi; yönetici supabase functions logs admin-users çıktısını kontrol etmeli.',
    });
  }
});
