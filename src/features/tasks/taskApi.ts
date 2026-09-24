import { requireSupabase } from '../../auth/supabaseClient';
import { rowToTask, type Task, type TaskRow } from './taskTypes';

export async function listTasks(): Promise<Task[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: true }).limit(100);
  if (error) throw new Error('Görevler alınamadı: ' + error.message);
  return (data as TaskRow[]).map(rowToTask);
}

export async function listTasksByClient(clientId: string): Promise<Task[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('tasks').select('*').eq('client_id', clientId).order('due_date', { ascending: true });
  if (error) throw new Error('Görevler alınamadı: ' + error.message);
  return (data as TaskRow[]).map(rowToTask);
}

export async function createTask(input: {
  clientId?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status?: Task['status'];
  priority?: Task['priority'];
  assignedTo?: string | null;
}): Promise<Task> {
  const supabase = requireSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Oturum bulunamadı');

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', userId).maybeSingle();
  const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
  if (!orgId) throw new Error('Organizasyon bulunamadı');

  if (input.clientId) {
    const { data: clientRow } = await supabase.from('clients').select('organization_id').eq('id', input.clientId).maybeSingle();
    if (!clientRow || (clientRow as { organization_id: string }).organization_id !== orgId) throw new Error('Danışan organizasyonunuzda değil');
  }

  const payload = {
    client_id: input.clientId || null,
    organization_id: orgId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    due_date: input.dueDate || null,
    status: input.status || 'todo',
    priority: input.priority || 'medium',
    assigned_to: input.assignedTo || null,
    created_by: userId,
  };

  const { data, error } = await supabase.from('tasks').insert(payload).select('*').single();
  if (error) throw new Error('Görev oluşturulamadı: ' + error.message);
  return rowToTask(data as TaskRow);
}

export async function updateTask(id: string, input: Partial<{ title: string; description: string | null; dueDate: string | null; status: Task['status']; priority: Task['priority']; assignedTo: string | null }>): Promise<Task> {
  const supabase = requireSupabase();
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() || null;
  if (input.dueDate !== undefined) payload.due_date = input.dueDate || null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.assignedTo !== undefined) payload.assigned_to = input.assignedTo || null;

  const { data, error } = await supabase.from('tasks').update(payload).eq('id', id).select('*').single();
  if (error) throw new Error('Görev güncellenemedi: ' + error.message);
  return rowToTask(data as TaskRow);
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw new Error('Görev silinemedi: ' + error.message);
}
