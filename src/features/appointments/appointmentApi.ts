import { requireSupabase } from '../../auth/supabaseClient';
import { rowToAppointment, type Appointment, type AppointmentRow } from './appointmentTypes';

export async function listAppointments(orgOnly = true): Promise<Appointment[]> {
  const supabase = requireSupabase();
  let query = supabase.from('appointments').select('*').order('start_at', { ascending: true }).limit(100);
  if (orgOnly) {
    // RLS will filter, but we can still order
  }
  const { data, error } = await query;
  if (error) throw new Error('Randevular alınamadı: ' + error.message);
  return (data as AppointmentRow[]).map(rowToAppointment);
}

export async function listAppointmentsByClient(clientId: string): Promise<Appointment[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('appointments').select('*').eq('client_id', clientId).order('start_at', { ascending: false });
  if (error) throw new Error('Randevular alınamadı: ' + error.message);
  return (data as AppointmentRow[]).map(rowToAppointment);
}

export async function createAppointment(input: {
  clientId?: string | null;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  location?: string | null;
  status?: Appointment['status'];
}): Promise<Appointment> {
  const supabase = requireSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Oturum bulunamadı');

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', userId).maybeSingle();
  const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
  if (!orgId) throw new Error('Organizasyon bulunamadı');

  if (input.clientId) {
    const { data: clientRow } = await supabase.from('clients').select('organization_id').eq('id', input.clientId).maybeSingle();
    if (!clientRow || (clientRow as { organization_id: string }).organization_id !== orgId) {
      throw new Error('Danışan organizasyonunuzda değil');
    }
  }

  if (new Date(input.endAt) <= new Date(input.startAt)) throw new Error('Bitiş başlangıçtan sonra olmalı');

  const payload = {
    client_id: input.clientId || null,
    organization_id: orgId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    start_at: input.startAt,
    end_at: input.endAt,
    location: input.location?.trim() || null,
    status: input.status || 'scheduled',
    created_by: userId,
  };

  const { data, error } = await supabase.from('appointments').insert(payload).select('*').single();
  if (error) throw new Error('Randevu oluşturulamadı: ' + error.message);
  return rowToAppointment(data as AppointmentRow);
}

export async function updateAppointment(id: string, input: Partial<{ title: string; description: string | null; startAt: string; endAt: string; status: Appointment['status']; location: string | null }>): Promise<Appointment> {
  const supabase = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() || null;
  if (input.startAt !== undefined) payload.start_at = input.startAt;
  if (input.endAt !== undefined) payload.end_at = input.endAt;
  if (input.status !== undefined) payload.status = input.status;
  if (input.location !== undefined) payload.location = input.location?.trim() || null;

  const { data, error } = await supabase.from('appointments').update(payload).eq('id', id).select('*').single();
  if (error) throw new Error('Randevu güncellenemedi: ' + error.message);
  return rowToAppointment(data as AppointmentRow);
}

export async function deleteAppointment(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw new Error('Randevu silinemedi: ' + error.message);
}
