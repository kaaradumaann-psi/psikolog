import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { requireSupabase } from './supabaseClient';
import type { AuthenticatedUser } from './authTypes';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function rowToUser(row: unknown): AuthenticatedUser {
  const value = row as Partial<AuthenticatedUser> & {
    first_name?: string;
    last_name?: string;
    organization_id?: string | null;
  };
  if (
    typeof value.id !== 'string' ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.email !== 'string' ||
    value.email.length > 254 ||
    !value.email.trim() ||
    /[\u0000-\u001f\u007f]/.test(value.email) ||
    typeof value.first_name !== 'string' ||
    value.first_name.trim().length < 2 ||
    value.first_name.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(value.first_name) ||
    typeof value.last_name !== 'string' ||
    value.last_name.trim().length < 2 ||
    value.last_name.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(value.last_name) ||
    (value.role !== 'ADMIN' && value.role !== 'ORG_ADMIN' && value.role !== 'PSYCHOLOG') ||
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
    organizationId: value.organization_id ?? null,
  };
}

export async function listUsers(): Promise<AuthenticatedUser[]> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id,email,first_name,last_name,role,active,organization_id')
    .order('created_at', { ascending: true });
  if (error) throw new Error('Kullanıcı listesi alınamadı.');
  return (data ?? []).map(rowToUser);
}

export type EdgeFunctionInvocation = {
  error: unknown;
  response?: Response;
};

function originHint(): string {
  if (typeof window === 'undefined' || !window.location?.origin) return '';
  return ` (bu uygulamanın origin'i: ${window.location.origin})`;
}

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

function statusOf(error: unknown, response?: Response): number | null {
  if (response && Number.isInteger(response.status) && response.status > 0) return response.status;
  if (error instanceof FunctionsHttpError || error instanceof FunctionsRelayError) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response && Number.isInteger(context.status) && context.status > 0)
      return context.status;
  }
  return null;
}

export async function explainEdgeFunctionError(
  { error, response }: EdgeFunctionInvocation,
  fallback: string,
): Promise<string> {
  const detail = await serverMessage(response);
  const status = statusOf(error, response);

  if (error instanceof FunctionsFetchError) {
    if (detail) return detail;
    return `Edge Function bağlantısı kurulamadı. ALLOWED_ORIGINS ayarını kontrol edin${originHint()}.`;
  }

  if (status === 401) {
    return detail || 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.';
  }
  if (status === 403) {
    return detail || `Erişim reddedildi. Origin allowlist kontrolü${originHint()}.`;
  }
  if (status === 404) {
    return detail || 'Hedef kullanıcı bulunamadı.';
  }
  if (status === 413) {
    return 'İstek çok büyük.';
  }
  if (status === 429) {
    return 'Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.';
  }
  if (status && status >= 500) {
    return detail || 'İşlem tamamlanamadı: canlı veritabanı şeması güncel değil. Yönetici supabase db push çalıştırmalı.';
  }

  if (detail) return detail;
  return fallback;
}
