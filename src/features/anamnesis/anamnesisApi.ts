import { requireSupabase } from '../../auth/supabaseClient';
import { rowToAnamnesis, type Anamnesis, type AnamnesisInput, type AnamnesisRow } from './anamnesisTypes';

export async function getAnamnesisByClient(clientId: string): Promise<Anamnesis | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('anamneses')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throw new Error('Anamnez alınamadı: ' + error.message);
  if (!data) return null;
  return rowToAnamnesis(data as AnamnesisRow);
}

export async function upsertAnamnesis(clientId: string, input: AnamnesisInput): Promise<Anamnesis> {
  const supabase = requireSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Oturum bulunamadı');

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle();
  const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
  if (!orgId) throw new Error('Organizasyon bulunamadı');

  const { data: clientRow } = await supabase
    .from('clients')
    .select('organization_id')
    .eq('id', clientId)
    .maybeSingle();
  if (!clientRow || (clientRow as { organization_id: string }).organization_id !== orgId) {
    throw new Error('Danışan organizasyonunuzda değil');
  }

  const payload = {
    client_id: clientId,
    organization_id: orgId,
    reason: input.reason || null,
    current_status: input.currentStatus || null,
    personal_history: input.personalHistory || null,
    family_history: input.familyHistory || null,
    education: input.education || null,
    profession: input.profession || null,
    social_life: input.socialLife || null,
    relationships: input.relationships || null,
    previous_applications: input.previousApplications || null,
    previous_assessments: input.previousAssessments || null,
    expert_notes: input.expertNotes || null,
    created_by: userId,
  };

  // Upsert on client_id unique
  const { data, error } = await supabase
    .from('anamneses')
    .upsert(payload, { onConflict: 'client_id' })
    .select('*')
    .single();

  if (error) throw new Error('Anamnez kaydedilemedi: ' + error.message);
  return rowToAnamnesis(data as AnamnesisRow);
}
