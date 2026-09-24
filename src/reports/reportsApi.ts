import { requireSupabase } from '../auth/supabaseClient';
import { describeMutationError } from '../records/supabaseRecords';
import type { ReportSourceData } from './reportDataAdapter';
import { EMPTY_LETTERHEAD, type Letterhead, type ReportDocument } from './templateEngine';
export type ReportStatus = 'draft' | 'completed';
export type SaveReason = 'autosave' | 'manual' | 'complete' | 'refresh' | 'restore';
export type SavedReport = {
  id: string;
  mmpi_record_id: string;
  created_by: string;
  template_id: string | null;
  template_name: string;
  title: string;
  content: ReportDocument;
  status: ReportStatus;
  source_data_snapshot: ReportSourceData;
  source_data_version: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  revision: number;
  version_number: number;
};
export type ReportSummary = Pick<
  SavedReport,
  'id' | 'title' | 'template_name' | 'status' | 'created_at' | 'updated_at'
>;
export type ReportTemplate = {
  id: string;
  name: string;
  content: ReportDocument;
  is_system: boolean;
  created_by: string | null;
};
export type ReportVersion = {
  id: string;
  version_number: number;
  content: ReportDocument;
  snapshot: SavedReport;
  created_at: string;
  reason: string;
};
export function reportUuid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new Error('Geçersiz rapor/kayıt kimliği.');
  return value;
}
function fail(
  error: unknown,
  fallback = 'Rapor işlemi tamamlanamadı. Bağlantıyı ve rapor migration kurulumunu kontrol edin.',
): never {
  throw new Error(describeMutationError(error, fallback));
}
function assertMutation(error: unknown, count: number | null) {
  if (error) fail(error);
  if (count !== 1)
    throw new Error(
      'Kayıt değişmiş, silinmiş veya erişim yetkiniz yok. Sayfayı yenilemeden önce metninizi kopyalayın.',
    );
}
export async function listReports(recordId: string): Promise<ReportSummary[]> {
  const { data, error } = await requireSupabase()
    .from('mmpi_reports')
    .select('id,title,template_name,status,created_at,updated_at')
    .eq('mmpi_record_id', reportUuid(recordId))
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) fail(error);
  return data as ReportSummary[];
}
export async function getReport(id: string, recordId: string): Promise<SavedReport> {
  const { data, error } = await requireSupabase()
    .from('mmpi_reports')
    .select('*')
    .eq('id', reportUuid(id))
    .eq('mmpi_record_id', reportUuid(recordId))
    .single();
  if (error || !data) fail(error);
  return data as SavedReport;
}
export async function createReport(
  input: Pick<
    SavedReport,
    | 'mmpi_record_id'
    | 'created_by'
    | 'template_id'
    | 'template_name'
    | 'title'
    | 'content'
    | 'source_data_snapshot'
  >,
): Promise<string> {
  reportUuid(input.mmpi_record_id);
  reportUuid(input.created_by);
  if (input.template_id) reportUuid(input.template_id);
  const id = crypto.randomUUID();
  const { error, count } = await requireSupabase()
    .from('mmpi_reports')
    .insert(
      { ...input, id, status: 'draft', source_data_version: input.source_data_snapshot.source_data_version },
      { count: 'exact' },
    );
  assertMutation(error, count);
  return id;
}
export type ReportChange = Pick<
  SavedReport,
  'title' | 'content' | 'status' | 'source_data_snapshot' | 'source_data_version' | 'generated_at'
>;
export async function saveReport(
  report: SavedReport,
  change: ReportChange,
  reason: SaveReason,
): Promise<SavedReport> {
  const { error, count } = await requireSupabase()
    .from('mmpi_reports')
    .update({ ...change, save_reason: reason }, { count: 'exact' })
    .eq('id', reportUuid(report.id))
    .eq('revision', report.revision);
  assertMutation(error, count);
  // A separate read, never a returning/select chained onto a mutation (RLS).
  const latest = await getReport(report.id, report.mmpi_record_id);
  if (latest.revision !== report.revision + 1)
    throw new Error('Rapor başka bir oturumda değişti. Metninizi kopyalayıp sayfayı yenileyin.');
  return latest;
}
export async function deleteReport(id: string): Promise<void> {
  const { error, count } = await requireSupabase()
    .from('mmpi_reports')
    .delete({ count: 'exact' })
    .eq('id', reportUuid(id));
  assertMutation(error, count);
}
export async function listVersions(id: string): Promise<ReportVersion[]> {
  const { data, error } = await requireSupabase()
    .from('mmpi_report_versions')
    .select('*')
    .eq('report_id', reportUuid(id))
    .order('version_number', { ascending: false })
    .limit(100);
  if (error) fail(error);
  return data as ReportVersion[];
}
export async function listTemplates(): Promise<ReportTemplate[]> {
  const { data, error } = await requireSupabase()
    .from('mmpi_report_templates')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name');
  if (error) fail(error);
  return data as ReportTemplate[];
}
export async function createTemplate(name: string, content: ReportDocument, userId: string): Promise<string> {
  const id = crypto.randomUUID();
  const { error, count } = await requireSupabase()
    .from('mmpi_report_templates')
    .insert({ id, name, content, created_by: reportUuid(userId), is_system: false }, { count: 'exact' });
  assertMutation(error, count);
  return id;
}
export async function getSettings(userId: string): Promise<Letterhead> {
  const { data, error } = await requireSupabase()
    .from('psychologist_report_settings')
    .select('letterhead')
    .eq('created_by', reportUuid(userId))
    .maybeSingle();
  if (error) fail(error);
  return { ...EMPTY_LETTERHEAD, ...data?.letterhead } as Letterhead;
}
export async function saveSettings(userId: string, letterhead: Letterhead): Promise<void> {
  const { error, count } = await requireSupabase()
    .from('psychologist_report_settings')
    .upsert({ created_by: reportUuid(userId), letterhead }, { count: 'exact' });
  assertMutation(error, count);
}
