import { requireSupabase } from '../../auth/supabaseClient';

export type AuditLog = {
  id: string;
  organizationId: string | null;
  actor: string | null;
  action: string;
  targetTable: string;
  targetId: string | null;
  createdAt: string;
};

export async function listAuditLogs(limit = 100): Promise<AuditLog[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error('Audit log alınamadı: ' + error.message);
  return (data as { id: string; organization_id: string | null; actor: string | null; action: string; target_table: string; target_id: string | null; created_at: string }[]).map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    actor: r.actor,
    action: r.action,
    targetTable: r.target_table,
    targetId: r.target_id,
    createdAt: r.created_at,
  }));
}

export async function listAuditLogsByClient(clientId: string): Promise<AuditLog[]> {
  const supabase = requireSupabase();
  // audit logs where target_id = clientId or related via other tables? For now filter target_table=clients and target_id=clientId OR target_table in docs/notes/sessions etc and we need to join via client? Simplify: fetch all where target_id = clientId, plus client related via organization? For MVP, fetch where target_id = clientId
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('target_id', clientId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error('Audit log alınamadı: ' + error.message);
  return (data as { id: string; organization_id: string | null; actor: string | null; action: string; target_table: string; target_id: string | null; created_at: string }[]).map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    actor: r.actor,
    action: r.action,
    targetTable: r.target_table,
    targetId: r.target_id,
    createdAt: r.created_at,
  }));
}
