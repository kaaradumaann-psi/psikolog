import type { AuthenticatedUser } from '../../auth/authTypes';
import { explainEdgeFunctionError } from '../../auth/adminApi';
import { requireSupabase } from '../../auth/supabaseClient';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AdminProfile = {
  id: string;
  organization_id: string | null;
  email: string | null;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'ORG_ADMIN' | 'PSYCHOLOG';
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AdminOrg = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

/** Platform ADMIN uses a checked RPC. ORG_ADMIN can only see own org via RLS. */
export async function adminListProfiles(user: AuthenticatedUser): Promise<AdminProfile[]> {
  const supabase = requireSupabase();
  if (user.role === 'ADMIN') {
    const { data, error } = await supabase.rpc('admin_list_profiles');
    if (error) throw new Error('Hesaplar listelenemedi. Yönetici yetkisini ve sunucu bağlantısını kontrol edin.');
    return (data ?? []) as AdminProfile[];
  }
  if (user.role !== 'ORG_ADMIN' || !user.organizationId) throw new Error('Kurum yöneticisinin kurumu tanımlı değil.');
  const { data, error } = await supabase.from('profiles')
    .select('id,organization_id,email,first_name,last_name,role,active,created_at,updated_at')
    .eq('organization_id', user.organizationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error('Kurum hesapları listelenemedi. Yönetici yetkisini kontrol edin.');
  return (data ?? []) as AdminProfile[];
}

/** ADMIN-only RPC. Only call this for the signed-in ADMIN or an unassigned account. */
export async function adminUpdateProfile(input: { id: string; role: AdminProfile['role']; active: boolean; organizationId: string }): Promise<AdminProfile> {
  if (!UUID.test(input.id) || !UUID.test(input.organizationId)) throw new Error('Geçerli bir kurum seçin.');
  const { data, error } = await requireSupabase().rpc('admin_update_profile', {
    p_id: input.id,
    p_role: input.role,
    p_active: input.active,
    p_org_id: input.organizationId,
  });
  if (error) throw new Error('Kurum ataması yapılamadı. Yetki ve kurum kaydını kontrol edin.');
  const profile = data as AdminProfile | null;
  if (!profile || profile.id !== input.id || profile.organization_id !== input.organizationId ||
      profile.role !== input.role || profile.active !== input.active) {
    throw new Error('Kurum ataması sunucu tarafından doğrulanamadı.');
  }
  return profile;
}

export async function adminListOrganizations(user: AuthenticatedUser): Promise<AdminOrg[]> {
  const supabase = requireSupabase();
  if (user.role === 'ADMIN') {
    const { data, error } = await supabase.rpc('admin_list_organizations');
    if (error) throw new Error('Kurumlar listelenemedi. Yönetici yetkisini ve sunucu bağlantısını kontrol edin.');
    return (data ?? []) as AdminOrg[];
  }
  if (user.role !== 'ORG_ADMIN' || !user.organizationId) throw new Error('Kurum yöneticisinin kurumu tanımlı değil.');
  const { data, error } = await supabase.from('organizations')
    .select('id,name,created_at,updated_at')
    .eq('id', user.organizationId);
  if (error) throw new Error('Kurum kaydı okunamadı. Yönetici yetkisini kontrol edin.');
  return (data ?? []) as AdminOrg[];
}

export async function adminCreateOrganization(name: string): Promise<AdminOrg> {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 180) throw new Error('Kurum adı 2–180 karakter olmalı.');
  const { data, error } = await requireSupabase().rpc('admin_create_organization', { p_name: trimmed });
  if (error) throw new Error('Kurum oluşturulamadı. Yönetici yetkisini ve kurum adını kontrol edin.');
  const org = data as AdminOrg | null;
  if (!org || !UUID.test(org.id) || org.name !== trimmed) throw new Error('Kurum sunucuda doğrulanamadı.');
  return org;
}

/** The Edge Function returns { profile }, not a bare profile object. */
export function createdProfileFromResponse(data: unknown, expectedOrgId: string, expectedRole: 'PSYCHOLOG' | 'ORG_ADMIN'): AdminProfile {
  const profile = (data as { profile?: Partial<AdminProfile> } | null)?.profile;
  if (!profile || typeof profile.id !== 'string' || !UUID.test(profile.id) ||
      profile.organization_id !== expectedOrgId ||
      profile.role !== expectedRole ||
      typeof profile.first_name !== 'string' || typeof profile.last_name !== 'string' ||
      typeof profile.active !== 'boolean' || !profile.active) {
    throw new Error('Kullanıcı hesabı sunucu tarafından doğrulanamadı. Yinelemeden önce hesap listesini yenileyin.');
  }
  return profile as AdminProfile;
}

export async function adminCreateUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: 'PSYCHOLOG' | 'ORG_ADMIN';
  organizationId: string;
}): Promise<AdminProfile> {
  if (!UUID.test(input.organizationId)) throw new Error('Hesap oluşturmadan önce bir kurum seçin.');
  if (input.password.length < 10) throw new Error('Geçici parola en az 10 karakter olmalı.');
  const { data, error } = await requireSupabase().functions.invoke('admin-users', {
    body: {
      action: 'create',
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: input.role || 'PSYCHOLOG',
      organizationId: input.organizationId,
    },
  });
  if (error) throw new Error(await explainEdgeFunctionError({ error }, 'Kullanıcı oluşturulamadı. Kurum ve yetkilerinizi kontrol edin.'));
  if ((data as { error?: string } | null)?.error) throw new Error('Kullanıcı oluşturulamadı. Kurum ve yetkilerinizi kontrol edin.');
  return createdProfileFromResponse(data, input.organizationId, input.role ?? 'PSYCHOLOG');
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'delete', userId },
  });
  if (error || (data as { error?: string } | null)?.error) throw new Error('Kullanıcı silinemedi. Hesap durumunu yöneticiyle kontrol edin.');
}

export async function adminSetActive(userId: string, active: boolean): Promise<void> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'set_active', userId, active },
  });
  if (error || (data as { error?: string } | null)?.error) throw new Error('Aktiflik değiştirilemedi. Hesap durumunu kontrol edin.');
}
