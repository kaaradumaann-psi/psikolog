import { requireSupabase } from '../../auth/supabaseClient';
import { rowToAssessment, type Assessment, type AssessmentInput, type AssessmentRow } from './assessmentTypes';

export async function listAssessmentsByClient(clientId: string): Promise<Assessment[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('client_id', clientId)
    .order('assessment_date', { ascending: false });
  if (error) throw new Error('Değerlendirmeler alınamadı: ' + error.message);
  return (data as AssessmentRow[]).map(rowToAssessment);
}

export async function createAssessment(clientId: string, input: AssessmentInput): Promise<Assessment> {
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
    assessment_date: input.assessmentDate,
    method: input.method || null,
    interview: input.interview || null,
    observation: input.observation || null,
    findings: input.findings || null,
    expert_evaluation: input.expertEvaluation || null,
    result: input.result || null,
    recommendations: input.recommendations || null,
    created_by: userId,
  };

  const { data, error } = await supabase.from('assessments').insert(payload).select('*').single();
  if (error) throw new Error('Değerlendirme oluşturulamadı: ' + error.message);
  return rowToAssessment(data as AssessmentRow);
}

export async function updateAssessment(id: string, input: Partial<AssessmentInput>): Promise<Assessment> {
  const supabase = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.reason !== undefined) payload.reason = input.reason || null;
  if (input.assessmentDate !== undefined) payload.assessment_date = input.assessmentDate;
  if (input.method !== undefined) payload.method = input.method || null;
  if (input.interview !== undefined) payload.interview = input.interview || null;
  if (input.observation !== undefined) payload.observation = input.observation || null;
  if (input.findings !== undefined) payload.findings = input.findings || null;
  if (input.expertEvaluation !== undefined) payload.expert_evaluation = input.expertEvaluation || null;
  if (input.result !== undefined) payload.result = input.result || null;
  if (input.recommendations !== undefined) payload.recommendations = input.recommendations || null;

  const { data, error } = await supabase.from('assessments').update(payload).eq('id', id).select('*').single();
  if (error) throw new Error('Değerlendirme güncellenemedi: ' + error.message);
  return rowToAssessment(data as AssessmentRow);
}

export async function deleteAssessment(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('assessments').delete().eq('id', id);
  if (error) throw new Error('Değerlendirme silinemedi: ' + error.message);
}
