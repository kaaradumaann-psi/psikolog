import { requireSupabase } from '../auth/supabaseClient';
import { getRecordDetail } from '../records/supabaseRecords';
import { parseRecordPayload } from '../workspace/caseTypes';
import { profileFromRecord } from '../results/recordProfile';
import { reportDataAdapter } from './reportDataAdapter';
/** Orchestration outside the adapter: reuses the existing verified record → profile path. */
export async function loadReportContext(recordId: string) {
  const record = await getRecordDetail(recordId);
  if (record.createdBy) {
    const { data, error } = await requireSupabase()
      .from('profiles')
      .select('first_name,last_name')
      .eq('id', record.createdBy)
      .maybeSingle();
    if (error) throw new Error('Uygulayan uzman bilgisi alınamadı; lütfen yeniden deneyin.');
    if (data) record.psychologistName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
  }
  const parsed = parseRecordPayload(record.rawOmrAnswers);
  const profile = profileFromRecord(record, parsed);
  return { record, parsed, profile, source: reportDataAdapter(record, parsed, profile) };
}
