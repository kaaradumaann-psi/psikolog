import { requireSupabase } from '../../auth/supabaseClient';

export type AdminProfile = {
  id: string;
  organization_id: string | null;
  email: string | null;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'ORG_ADMIN' | 'PSYCHOLOG';
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminOrg = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export async function adminListProfiles(): Promise<AdminProfile[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('admin_list_profiles');
  if (error) throw new Error('Profiller alınamadı: ' + error.message);
  return data as AdminProfile[];
}

export async function adminUpdateProfile(input: { id: string; role: AdminProfile['role']; active: boolean; organizationId: string | null }): Promise<AdminProfile> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('admin_update_profile', {
    p_id: input.id,
    p_role: input.role,
    p_active: input.active,
    p_org_id: input.organizationId,
  });
  if (error) throw new Error('Profil güncellenemedi: ' + error.message);
  return data as AdminProfile;
}

export async function adminListOrganizations(): Promise<AdminOrg[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('admin_list_organizations');
  if (error) throw new Error('Organizasyonlar alınamadı: ' + error.message);
  return data as AdminOrg[];
}

export async function adminCreateOrganization(name: string): Promise<AdminOrg> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('admin_create_organization', { p_name: name });
  if (error) throw new Error('Organizasyon oluşturulamadı: ' + error.message);
  return data as AdminOrg;
}

export async function adminCreateUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: 'PSYCHOLOG' | 'ORG_ADMIN';
  organizationId?: string | null;
}): Promise<AdminProfile> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: {
      action: 'create',
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: input.role || 'PSYCHOLOG',
      organizationId: input.organizationId || null,
    },
  });
  if (error) throw new Error('Kullanıcı oluşturulamadı: ' + error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  // Edge Function { profile: ... } döndürür; ham gövde profil değildir.
  const profile = (data as { profile?: AdminProfile })?.profile;
  if (!profile || typeof profile.id !== 'string') throw new Error('Kullanıcı oluşturuldu ama profil doğrulanamadı.');
  return profile;
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'delete', userId },
  });
  if (error) throw new Error('Kullanıcı silinemedi: ' + error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
}

export async function adminSetActive(userId: string, active: boolean): Promise<void> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'set_active', userId, active },
  });
  if (error) throw new Error('Aktiflik değiştirilemedi: ' + error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
}

