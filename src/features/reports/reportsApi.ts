import { requireSupabase } from '../../auth/supabaseClient';
import type { ReportDocument } from './templateEngine';
import { buildSourceData, type ReportContext } from './reportDataAdapter';

export type Report = {
  id: string;
  clientId: string;
  assessmentId: string | null;
  testAdministrationId: string | null;
  templateId: string | null;
  organizationId: string;
  createdBy: string;
  title: string;
  content: ReportDocument;
  status: 'draft' | 'completed';
  sourceSnapshot: Record<string, unknown>;
  sourceVersion: string;
  revision: number;
  versionNumber: number;
  lastVersionAt: string;
  saveReason: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReportRow = {
  id: string;
  client_id: string;
  assessment_id: string | null;
  test_administration_id: string | null;
  template_id: string | null;
  organization_id: string;
  created_by: string;
  title: string;
  content: ReportDocument;
  status: 'draft' | 'completed';
  source_snapshot: Record<string, unknown>;
  source_version: string;
  revision: number;
  version_number: number;
  last_version_at: string;
  save_reason: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportVersion = {
  id: string;
  reportId: string;
  versionNumber: number;
  content: ReportDocument;
  snapshot: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  reason: string;
};

function rowToReport(row: ReportRow): Report {
  return {
    id: row.id,
    clientId: row.client_id,
    assessmentId: row.assessment_id,
    testAdministrationId: row.test_administration_id,
    templateId: row.template_id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    title: row.title,
    content: row.content,
    status: row.status,
    sourceSnapshot: row.source_snapshot,
    sourceVersion: row.source_version,
    revision: row.revision,
    versionNumber: row.version_number,
    lastVersionAt: row.last_version_at,
    saveReason: row.save_reason,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listReportsByClient(clientId: string): Promise<Report[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error('Raporlar alınamadı: ' + error.message);
  return (data as ReportRow[]).map(rowToReport);
}

export async function getReport(id: string): Promise<Report> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('reports').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('Rapor alınamadı: ' + error.message);
  if (!data) throw new Error('Rapor bulunamadı');
  return rowToReport(data as ReportRow);
}

export async function createReport(input: {
  clientId: string;
  title: string;
  content: ReportDocument;
  templateId?: string | null;
  assessmentId?: string | null;
  testAdministrationId?: string | null;
  context: ReportContext;
}): Promise<Report> {
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

  const sourceData = buildSourceData(input.context);

  const payload = {
    client_id: input.clientId,
    assessment_id: input.assessmentId || null,
    test_administration_id: input.testAdministrationId || null,
    template_id: input.templateId || null,
    organization_id: orgId,
    created_by: userId,
    title: input.title.trim(),
    content: input.content,
    status: 'draft',
    source_snapshot: sourceData,
    source_version: 'v1',
    save_reason: 'create',
  };

  const { data, error } = await supabase.from('reports').insert(payload).select('*').single();
  if (error) throw new Error('Rapor oluşturulamadı: ' + error.message);
  return rowToReport(data as ReportRow);
}

export async function updateReport(
  id: string,
  input: { content?: ReportDocument; title?: string; status?: 'draft' | 'completed'; saveReason?: string },
  expectedRevision?: number,
): Promise<Report> {
  const supabase = requireSupabase();

  // Optimistic concurrency: check revision if provided
  if (expectedRevision !== undefined) {
    const { data: current } = await supabase.from('reports').select('revision').eq('id', id).maybeSingle();
    if (current && (current as { revision: number }).revision !== expectedRevision) {
      throw new Error('Rapor başka bir oturumda güncellenmiş — sayfayı yenileyin');
    }
  }

  const payload: Record<string, unknown> = {};
  if (input.content !== undefined) payload.content = input.content;
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.status !== undefined) payload.status = input.status;
  if (input.saveReason !== undefined) payload.save_reason = input.saveReason;

  const { data, error } = await supabase.from('reports').update(payload).eq('id', id).select('*').single();
  if (error) throw new Error('Rapor güncellenemedi: ' + error.message);
  return rowToReport(data as ReportRow);
}

export async function deleteReport(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('reports').delete().eq('id', id);
  if (error) throw new Error('Rapor silinemedi: ' + error.message);
}

export async function listReportVersions(reportId: string): Promise<ReportVersion[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('report_versions')
    .select('*')
    .eq('report_id', reportId)
    .order('version_number', { ascending: false });
  if (error) throw new Error('Sürüm geçmişi alınamadı: ' + error.message);
  return (data as {
    id: string;
    report_id: string;
    version_number: number;
    content: ReportDocument;
    snapshot: Record<string, unknown>;
    created_by: string | null;
    created_at: string;
    reason: string;
  }[]).map((r) => ({
    id: r.id,
    reportId: r.report_id,
    versionNumber: r.version_number,
    content: r.content,
    snapshot: r.snapshot,
    createdBy: r.created_by,
    createdAt: r.created_at,
    reason: r.reason,
  }));
}

export async function listTemplates(): Promise<{ id: string; name: string; content: ReportDocument; isSystem: boolean }[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('report_templates').select('*').order('name');
  if (error) throw new Error('Şablonlar alınamadı: ' + error.message);
  return (data as { id: string; name: string; content: ReportDocument; is_system: boolean }[]).map((t) => ({
    id: t.id,
    name: t.name,
    content: t.content,
    isSystem: t.is_system,
  }));
}
