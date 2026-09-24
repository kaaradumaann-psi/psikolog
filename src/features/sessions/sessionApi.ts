import { requireSupabase } from '../../auth/supabaseClient';
import { rowToSession, type Session, type SessionInput, type SessionRow } from './sessionTypes';

export async function listSessionsByClient(clientId: string): Promise<Session[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false });
  if (error) throw new Error('Görüşmeler alınamadı: ' + error.message);
  return (data as SessionRow[]).map(rowToSession);
}

export async function createSession(clientId: string, input: SessionInput): Promise<Session> {
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
    date: input.date,
    type: input.type,
    duration: input.duration ?? null,
    notes: input.notes || null,
    observation: input.observation || null,
    key_points: input.keyPoints || null,
    plan: input.plan || null,
    follow_up: input.followUp || null,
    created_by: userId,
  };

  const { data, error } = await supabase.from('sessions').insert(payload).select('*').single();
  if (error) throw new Error('Görüşme oluşturulamadı: ' + error.message);
  return rowToSession(data as SessionRow);
}

export async function updateSession(id: string, input: Partial<SessionInput>): Promise<Session> {
  const supabase = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.date !== undefined) payload.date = input.date;
  if (input.type !== undefined) payload.type = input.type;
  if (input.duration !== undefined) payload.duration = input.duration ?? null;
  if (input.notes !== undefined) payload.notes = input.notes || null;
  if (input.observation !== undefined) payload.observation = input.observation || null;
  if (input.keyPoints !== undefined) payload.key_points = input.keyPoints || null;
  if (input.plan !== undefined) payload.plan = input.plan || null;
  if (input.followUp !== undefined) payload.follow_up = input.followUp || null;

  const { data, error } = await supabase.from('sessions').update(payload).eq('id', id).select('*').single();
  if (error) throw new Error('Görüşme güncellenemedi: ' + error.message);
  return rowToSession(data as SessionRow);
}

export async function deleteSession(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) throw new Error('Görüşme silinemedi: ' + error.message);
}
