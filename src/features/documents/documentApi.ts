import { requireSupabase } from '../../auth/supabaseClient';
import { rowToDocument, type Document, type DocumentRow, ALLOWED_MIMES, MAX_SIZE } from './documentTypes';

export async function listDocumentsByClient(clientId: string): Promise<Document[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw new Error('Belgeler alınamadı: ' + error.message);
  return (data as DocumentRow[]).map(rowToDocument);
}

export async function uploadDocument(
  clientId: string,
  file: File,
  description?: string,
): Promise<Document> {
  const supabase = requireSupabase();
  if (!ALLOWED_MIMES.includes(file.type)) {
    throw new Error('İzin verilmeyen dosya türü: ' + file.type);
  }
  if (file.size > MAX_SIZE) {
    throw new Error('Dosya çok büyük (max 50MB)');
  }

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

  const fileId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  const filePath = `${orgId}/${clientId}/${fileId}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('client-documents')
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error('Dosya yüklenemedi: ' + uploadError.message);

  const payload = {
    client_id: clientId,
    organization_id: orgId,
    file_path: filePath,
    file_name: file.name.slice(0, 255),
    mime_type: file.type,
    size_bytes: file.size,
    description: description?.slice(0, 1000) || null,
    created_by: userId,
  };

  const { data, error } = await supabase.from('documents').insert(payload).select('*').single();
  if (error) {
    // cleanup storage
    await supabase.storage.from('client-documents').remove([filePath]);
    throw new Error('Belge kaydı oluşturulamadı: ' + error.message);
  }

  return rowToDocument(data as DocumentRow);
}

export async function deleteDocument(id: string, filePath: string): Promise<void> {
  const supabase = requireSupabase();
  const { error: dbError } = await supabase.from('documents').delete().eq('id', id);
  if (dbError) throw new Error('Belge silinemedi: ' + dbError.message);
  const { error: storageError } = await supabase.storage.from('client-documents').remove([filePath]);
  if (storageError) {
    // log but not fail
    console.warn('Storage silinemedi:', storageError.message);
  }
}

export async function getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.storage.from('client-documents').createSignedUrl(filePath, expiresIn);
  if (error) throw new Error('İmzalı URL oluşturulamadı: ' + error.message);
  return data.signedUrl;
}
