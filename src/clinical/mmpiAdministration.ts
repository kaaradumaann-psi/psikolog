import { getSessionUser } from '../auth/sessionUser';
import { requireSupabase, supabaseConfig } from '../auth/supabaseClient';
import { isCanonicalClientId } from './clientIds';
import { clinicToday } from './recordRules';

/** System test_definitions row inserted in 20260925100000. */
export const MMPI_TEST_DEFINITION_ID = '00000000-0000-4000-8000-000000000006';

export type MmpiAdministration = {
  id: string;
  clientId: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  externalSource: string | null;
  externalAssessmentId: string | null;
  createdBy: string;
  administrationDate: string;
};

export function canCreateMmpiAdministration(clientId: string): boolean {
  const user = getSessionUser();
  return Boolean(
    supabaseConfig.configured &&
      user &&
      user.active &&
      (user.role === 'PSYCHOLOG' || user.role === 'ORG_ADMIN' || user.role === 'ADMIN') &&
      user.organizationId &&
      isCanonicalClientId(clientId),
  );
}

export async function listMmpiAdministrations(clientId: string): Promise<MmpiAdministration[]> {
  if (!canCreateMmpiAdministration(clientId) && !(supabaseConfig.configured && isCanonicalClientId(clientId))) {
    return [];
  }
  const { data, error } = await requireSupabase()
    .from('test_administrations')
    .select('id,client_id,status,external_source,external_assessment_id,created_by,administration_date')
    .eq('client_id', clientId)
    .eq('test_definition_id', MMPI_TEST_DEFINITION_ID)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    clientId: row.client_id as string,
    status: row.status as MmpiAdministration['status'],
    externalSource: (row.external_source as string | null) ?? null,
    externalAssessmentId: (row.external_assessment_id as string | null) ?? null,
    createdBy: row.created_by as string,
    administrationDate: row.administration_date as string,
  }));
}

/**
 * Psychology-side MMPI request row. Does not call MMPI.
 * created_by is always the authenticated user (never a form field).
 */
export async function createPlannedMmpiAdministration(clientId: string): Promise<MmpiAdministration> {
  const user = getSessionUser();
  if (!user?.organizationId) throw new Error('Kurum atanmamış');
  if (!isCanonicalClientId(clientId)) throw new Error('Danışan kimliği UUID olmalıdır');
  if (!canCreateMmpiAdministration(clientId)) throw new Error('MMPI talebi için yetki yok');
  const { data, error } = await requireSupabase()
    .from('test_administrations')
    .insert({
      client_id: clientId,
      test_definition_id: MMPI_TEST_DEFINITION_ID,
      organization_id: user.organizationId,
      administration_date: clinicToday(),
      status: 'planned',
      external_source: 'mmpi',
      created_by: user.id,
    })
    .select('id,client_id,status,external_source,external_assessment_id,created_by,administration_date')
    .maybeSingle();
  if (error) {
    if (error.code === '23505') {
      const existing = await listMmpiAdministrations(clientId);
      const open = existing.find((item) => item.status === 'planned' || item.status === 'in_progress');
      if (open) return open;
    }
    throw new Error('MMPI talebi oluşturulamadı');
  }
  if (!data) throw new Error('MMPI talebi oluşturulamadı');
  return {
    id: data.id as string,
    clientId: data.client_id as string,
    status: data.status as MmpiAdministration['status'],
    externalSource: (data.external_source as string | null) ?? null,
    externalAssessmentId: (data.external_assessment_id as string | null) ?? null,
    createdBy: data.created_by as string,
    administrationDate: data.administration_date as string,
  };
}
