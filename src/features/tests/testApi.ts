import { requireSupabase } from '../../auth/supabaseClient';
import {
  rowToTestDefinition,
  rowToTestAdmin,
  rowToTestResult,
  type TestDefinition,
  type TestAdministration,
  type TestResult,
  type TestDefinitionRow,
  type TestAdminRow,
  type TestResultRow,
} from './testTypes';

export async function listTestDefinitions(): Promise<TestDefinition[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('test_definitions').select('*').order('name');
  if (error) throw new Error('Test tanımları alınamadı: ' + error.message);
  return (data as TestDefinitionRow[]).map(rowToTestDefinition);
}

export async function listTestAdministrationsByClient(clientId: string): Promise<TestAdministration[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('test_administrations')
    .select('*, test_definitions!inner(*)')
    .eq('client_id', clientId)
    .order('administration_date', { ascending: false });
  if (error) throw new Error('Test uygulamaları alınamadı: ' + error.message);
  return (data as (TestAdminRow & { test_definitions: TestDefinitionRow })[]).map((row) => ({
    ...rowToTestAdmin(row),
    definition: rowToTestDefinition(row.test_definitions),
  }));
}

export async function createTestAdministration(
  clientId: string,
  input: {
    testDefinitionId: string;
    assessmentId?: string | null;
    administrationDate: string;
    status?: string;
    externalSource?: string | null;
    externalAssessmentId?: string | null;
    notes?: string | null;
  },
): Promise<TestAdministration> {
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
    assessment_id: input.assessmentId || null,
    test_definition_id: input.testDefinitionId,
    organization_id: orgId,
    administration_date: input.administrationDate,
    status: input.status || 'completed',
    external_source: input.externalSource || null,
    external_assessment_id: input.externalAssessmentId || null,
    notes: input.notes || null,
    created_by: userId,
  };

  const { data, error } = await supabase.from('test_administrations').insert(payload).select('*').single();
  if (error) throw new Error('Test uygulaması oluşturulamadı: ' + error.message);
  return rowToTestAdmin(data as TestAdminRow);
}

export async function createTestResult(
  testAdministrationId: string,
  input: { resultData: Record<string, unknown>; summary?: string | null },
): Promise<TestResult> {
  const supabase = requireSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Oturum bulunamadı');

  // Get org from administration
  const { data: adminRow } = await supabase
    .from('test_administrations')
    .select('organization_id')
    .eq('id', testAdministrationId)
    .maybeSingle();
  const orgId = (adminRow as { organization_id: string } | null)?.organization_id;
  if (!orgId) throw new Error('Test uygulaması bulunamadı');

  const payload = {
    test_administration_id: testAdministrationId,
    organization_id: orgId,
    result_data: input.resultData,
    summary: input.summary || null,
  };

  const { data, error } = await supabase.from('test_results').insert(payload).select('*').single();
  if (error) throw new Error('Test sonucu oluşturulamadı: ' + error.message);
  return rowToTestResult(data as TestResultRow);
}

export async function listTestResultsByAdministration(adminId: string): Promise<TestResult[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('test_administration_id', adminId)
    .order('created_at', { ascending: false });
  if (error) throw new Error('Test sonuçları alınamadı: ' + error.message);
  return (data as TestResultRow[]).map(rowToTestResult);
}
