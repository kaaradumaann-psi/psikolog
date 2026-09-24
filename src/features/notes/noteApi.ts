import { requireSupabase } from '../../auth/supabaseClient';
import { rowToNote, type Note, type NoteRow } from './noteTypes';

export async function listNotesByClient(clientId: string): Promise<Note[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('client_id', clientId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error('Notlar alınamadı: ' + error.message);
  return (data as NoteRow[]).map(rowToNote);
}

export async function createNote(clientId: string, content: string, isPinned = false): Promise<Note> {
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
    content: content.trim(),
    is_pinned: isPinned,
    created_by: userId,
  };

  const { data, error } = await supabase.from('notes').insert(payload).select('*').single();
  if (error) throw new Error('Not oluşturulamadı: ' + error.message);
  return rowToNote(data as NoteRow);
}

export async function updateNote(id: string, input: { content?: string; isPinned?: boolean }): Promise<Note> {
  const supabase = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.content !== undefined) payload.content = input.content.trim();
  if (input.isPinned !== undefined) payload.is_pinned = input.isPinned;

  const { data, error } = await supabase.from('notes').update(payload).eq('id', id).select('*').single();
  if (error) throw new Error('Not güncellenemedi: ' + error.message);
  return rowToNote(data as NoteRow);
}

export async function deleteNote(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw new Error('Not silinemedi: ' + error.message);
}
