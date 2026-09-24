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
