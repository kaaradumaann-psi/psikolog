import { requireSupabase } from '../../auth/supabaseClient';
import type { Letterhead } from '../reports/templateEngine';
import { EMPTY_LETTERHEAD } from '../reports/templateEngine';

export async function getPsychologistSettings(): Promise<Letterhead> {
  const supabase = requireSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Oturum bulunamadı');

  const { data, error } = await supabase.from('psychologist_settings').select('*').eq('created_by', userId).maybeSingle();
  if (error) throw new Error('Ayarlar alınamadı: ' + error.message);
  if (!data) return EMPTY_LETTERHEAD;
  const lh = (data as { letterhead: Letterhead }).letterhead;
  return { ...EMPTY_LETTERHEAD, ...lh };
}

export async function upsertPsychologistSettings(letterhead: Letterhead): Promise<Letterhead> {
  const supabase = requireSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Oturum bulunamadı');

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', userId).maybeSingle();
  const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
  if (!orgId) throw new Error('Organizasyon bulunamadı');

  // Validate data URL size <= 1MB each
  const checkDataUrl = (url: string, max: number) => {
    if (!url) return true;
    if (!url.startsWith('data:')) return false;
    return url.length <= max;
  };
  if (!checkDataUrl(letterhead.logo, 1024 * 1024)) throw new Error('Logo çok büyük veya geçersiz (max 1MB data URL)');
  if (!checkDataUrl(letterhead.signature, 1024 * 1024)) throw new Error('İmza çok büyük veya geçersiz (max 1MB data URL)');

  const payload = {
    created_by: userId,
    organization_id: orgId,
    letterhead,
  };

  const { data, error } = await supabase.from('psychologist_settings').upsert(payload, { onConflict: 'created_by' }).select('*').single();
  if (error) throw new Error('Ayarlar kaydedilemedi: ' + error.message);
  return (data as { letterhead: Letterhead }).letterhead;
}
