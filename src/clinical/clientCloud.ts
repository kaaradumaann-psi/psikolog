import type { AuthenticatedUser } from '../auth/authTypes';
import { getSessionUser } from '../auth/sessionUser';
import { requireSupabase, supabaseConfig } from '../auth/supabaseClient';
import type { Client, ClientStatus, Gender } from './clinicalTypes';
import { isCanonicalClientId, isLegacyClientId, rememberClientIdMapping } from './clientIds';

type ClientRow = {
  id: string;
  organization_id: string;
  file_number: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  profession: string | null;
  education: string | null;
  status: 'active' | 'archived';
  created_by: string;
  legacy_client_id: string | null;
  gender: 'KADIN' | 'ERKEK' | null;
  created_at: string;
  updated_at: string;
};

function cloudStatus(status: ClientStatus): 'active' | 'archived' {
  return status === 'archived' ? 'archived' : 'active';
}

function toRow(client: Client, user: AuthenticatedUser): Omit<ClientRow, 'created_at' | 'updated_at'> {
  if (!user.organizationId) throw new Error('Kurum atanmamış');
  const id = isCanonicalClientId(client.id) ? client.id : crypto.randomUUID();
  return {
    id,
    organization_id: user.organizationId,
    file_number: client.fileNumber.trim(),
    first_name: client.firstName.trim(),
    last_name: client.lastName.trim(),
    birth_date: client.birthDate?.trim() || null,
    phone: client.phone?.trim() || null,
    email: client.email?.trim() || null,
    profession: client.occupation?.trim() || null,
    education: client.education?.trim() || null,
    status: cloudStatus(client.status),
    created_by: user.id,
    legacy_client_id: isLegacyClientId(client.id) ? client.id : null,
    gender: client.gender,
  };
}

function fromRow(row: ClientRow, existing?: Client): Client {
  const gender: Gender = row.gender === 'ERKEK' || existing?.gender === 'ERKEK' ? 'ERKEK' : existing?.gender === 'KADIN' || row.gender === 'KADIN' ? 'KADIN' : existing?.gender ?? 'KADIN';
  return {
    id: row.id,
    fileNumber: row.file_number,
    firstName: row.first_name,
    lastName: row.last_name,
    tcNumber: existing?.tcNumber ?? '',
    birthDate: row.birth_date ?? existing?.birthDate ?? '',
    age: existing?.age ?? 0,
    gender,
    phone: row.phone ?? existing?.phone ?? '',
    email: row.email ?? existing?.email ?? '',
    occupation: row.profession ?? existing?.occupation ?? '',
    education: row.education ?? existing?.education ?? '',
    maritalStatus: existing?.maritalStatus ?? '',
    emergencyContact: existing?.emergencyContact ?? { name: '', phone: '', relation: '' },
    presentingComplaint: existing?.presentingComplaint ?? '',
    medicalHistory: existing?.medicalHistory ?? '',
    psychiatricHistory: existing?.psychiatricHistory ?? '',
    medications: existing?.medications ?? '',
    familyHistory: existing?.familyHistory ?? '',
    allergiesNotes: existing?.allergiesNotes ?? '',
    diagnoses: existing?.diagnoses ?? [],
    status: row.status === 'archived' ? 'archived' : existing?.status && existing.status !== 'archived' ? existing.status : 'active',
    createdAt: existing?.createdAt ?? row.created_at,
    updatedAt: row.updated_at,
  };
}

async function applyRemap(from: string, to: string): Promise<void> {
  rememberClientIdMapping(from, to);
  const { remapClinicalClientId } = await import('./clinicalStore');
  const { remapPracticeClientId } = await import('./practiceStore');
  remapClinicalClientId(from, to);
  remapPracticeClientId(from, to);
}

export async function upsertClientToCloud(
  client: Client,
  user: AuthenticatedUser,
): Promise<{ id: string; remappedFrom?: string } | { error: string }> {
  if (!supabaseConfig.configured) return { error: 'Supabase yok' };
  if (!user.organizationId) return { error: 'Kurum atanmamış' };
  if (!user.active) return { error: 'Hesap pasif' };
  const db = requireSupabase();
  if (isLegacyClientId(client.id)) {
    const { data: existing } = await db.from('clients').select('id').eq('legacy_client_id', client.id).maybeSingle();
    if (existing && typeof existing.id === 'string' && isCanonicalClientId(existing.id)) {
      await applyRemap(client.id, existing.id);
      return { id: existing.id, remappedFrom: client.id };
    }
  }
  const payload = toRow(client, user);
  const { data, error } = await db
    .from('clients')
    .upsert(
      {
        id: payload.id,
        organization_id: payload.organization_id,
        file_number: payload.file_number,
        first_name: payload.first_name,
        last_name: payload.last_name,
        birth_date: payload.birth_date,
        phone: payload.phone,
        email: payload.email,
        profession: payload.profession,
        education: payload.education,
        status: payload.status,
        created_by: user.id,
        legacy_client_id: payload.legacy_client_id,
        gender: payload.gender,
      },
      { onConflict: 'id' },
    )
    .select('id')
    .maybeSingle();
  if (error || !data?.id) {
    return { error: 'Danışan buluta yazılamadı' };
  }
  const remappedFrom = payload.id !== client.id ? client.id : undefined;
  if (remappedFrom) await applyRemap(remappedFrom, payload.id);
  return remappedFrom ? { id: payload.id, remappedFrom } : { id: payload.id };
}

export async function deleteClientFromCloud(id: string): Promise<void> {
  if (!supabaseConfig.configured || !isCanonicalClientId(id)) return;
  await requireSupabase().from('clients').delete().eq('id', id);
}

export async function hydrateClientsFromCloud(user: AuthenticatedUser): Promise<void> {
  if (!supabaseConfig.configured || !user.organizationId) return;
  const { getClients, saveClientQuiet } = await import('./clinicalStore');
  const db = requireSupabase();
  const { data, error } = await db
    .from('clients')
    .select(
      'id,organization_id,file_number,first_name,last_name,birth_date,phone,email,profession,education,status,created_by,legacy_client_id,gender,created_at,updated_at',
    )
    .order('created_at', { ascending: false });
  if (error || !data) return;
  const local = getClients();
  const byId = new Map(local.map((item) => [item.id, item]));
  const byLegacy = new Map(local.filter((item) => isLegacyClientId(item.id)).map((item) => [item.id, item]));

  for (const raw of data as ClientRow[]) {
    const existing = byId.get(raw.id) ?? (raw.legacy_client_id ? byLegacy.get(raw.legacy_client_id) : undefined);
    if (existing && existing.id !== raw.id) await applyRemap(existing.id, raw.id);
    const merged = fromRow(raw, existing && existing.id === raw.id ? existing : existing ? { ...existing, id: raw.id } : undefined);
    saveClientQuiet(merged);
  }

  for (const localClient of getClients()) {
    if (!isLegacyClientId(localClient.id)) continue;
    await upsertClientToCloud(localClient, user);
  }
}

export function scheduleClientCloudSync(client: Client): void {
  const user = getSessionUser();
  if (!supabaseConfig.configured || !user?.organizationId) return;
  void upsertClientToCloud(client, user);
}

export function scheduleClientCloudDelete(id: string): void {
  if (!supabaseConfig.configured) return;
  void deleteClientFromCloud(id);
}
