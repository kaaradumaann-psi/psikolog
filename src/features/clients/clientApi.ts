import { requireSupabase } from '../../auth/supabaseClient';
import { sanitizeIlike } from '../../lib/validation';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type PagedResult } from '../../lib/pagination';
import { generateFileNumber, rowToClient, type Client, type ClientInput, type ClientRow, type ClientStatus } from './clientTypes';

export type ClientQuery = {
  search?: string;
  status?: ClientStatus | '';
  page?: number;
  pageSize?: number;
};

export type ClientListResult = PagedResult<Client>;

function toPagedRange(query: ClientQuery) {
  const page = Math.max(0, Math.floor(query.page ?? 0));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(query.pageSize ?? DEFAULT_PAGE_SIZE)));
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const search = query.search ? sanitizeIlike(query.search) : '';
  const status = query.status || '';
  return { page, pageSize, from, to, search, status };
}

export async function listClients(query: ClientQuery): Promise<ClientListResult> {
  const client = requireSupabase();
  const { page, pageSize, from, to, search, status } = toPagedRange(query);

  let q = client.from('clients').select('*', { count: 'exact' }).order('created_at', { ascending: false });

  if (search) {
    q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,file_number.ilike.%${search}%`);
  }
  if (status) {
    q = q.eq('status', status);
  }

  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) throw new Error('Danışan listesi alınamadı: ' + error.message);

  const rows = (data ?? []) as ClientRow[];
  const hasMore = count !== null ? from + rows.length < count : rows.length === pageSize;

  return {
    data: rows.map(rowToClient),
    count,
    hasMore,
    page,
    pageSize,
  };
}

export async function getClient(id: string): Promise<Client> {
  const client = requireSupabase();
  const { data, error } = await client.from('clients').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('Danışan alınamadı: ' + error.message);
  if (!data) throw new Error('Danışan bulunamadı');
  return rowToClient(data as ClientRow);
}

export async function createClient(input: ClientInput): Promise<Client> {
  const supabase = requireSupabase();

  // Get current user profile for org
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Oturum bulunamadı');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw new Error('Profil alınamadı');
  const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
  if (!orgId) throw new Error('Organizasyon bulunamadı — admin ile iletişime geçin');

  const fileNumber = input.fileNumber?.trim() ? input.fileNumber.trim() : generateFileNumber();

  // Try with retry for unique violation
  let attempts = 0;
  while (attempts < 3) {
    const payload = {
      organization_id: orgId,
      file_number: attempts === 0 ? fileNumber : generateFileNumber(),
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      birth_date: input.birthDate || null,
      phone: input.phone || null,
      email: input.email || null,
      profession: input.profession || null,
      education: input.education || null,
      status: input.status || 'active',
      created_by: userId,
    };

    const { data, error } = await supabase.from('clients').insert(payload).select('*').single();
    if (!error && data) {
      return rowToClient(data as ClientRow);
    }

    // If unique violation on file_number, retry
    const msg = String(error?.message ?? '').toLowerCase();
    if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('file_number')) {
      attempts++;
      continue;
    }

    throw new Error('Danışan oluşturulamadı: ' + (error?.message ?? 'Bilinmeyen hata'));
  }

  throw new Error('Dosya numarası çakışması — lütfen tekrar deneyin');
}

export async function updateClient(id: string, input: Partial<ClientInput>): Promise<Client> {
  const supabase = requireSupabase();

  const payload: Record<string, unknown> = {};
  if (input.firstName !== undefined) payload.first_name = input.firstName.trim();
  if (input.lastName !== undefined) payload.last_name = input.lastName.trim();
  if (input.birthDate !== undefined) payload.birth_date = input.birthDate || null;
  if (input.phone !== undefined) payload.phone = input.phone || null;
  if (input.email !== undefined) payload.email = input.email || null;
  if (input.profession !== undefined) payload.profession = input.profession || null;
  if (input.education !== undefined) payload.education = input.education || null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.fileNumber !== undefined) payload.file_number = input.fileNumber.trim();

  const { data, error } = await supabase.from('clients').update(payload).eq('id', id).select('*').single();
  if (error) throw new Error('Danışan güncellenemedi: ' + error.message);
  if (!data) throw new Error('Danışan bulunamadı');
  return rowToClient(data as ClientRow);
}

export async function archiveClient(id: string): Promise<Client> {
  return updateClient(id, { status: 'archived' });
}

export async function activateClient(id: string): Promise<Client> {
  return updateClient(id, { status: 'active' });
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw new Error('Danışan silinemedi: ' + error.message);
}
