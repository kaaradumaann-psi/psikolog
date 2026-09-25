import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { requireSupabase } from './supabaseClient';
import type { AuthenticatedUser, UserRole } from './authTypes';

type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  role: UserRole;
  active: boolean;
  organization_id: string | null;
};

function profileFromRow(row: ProfileRow): AuthenticatedUser {
  if (
    typeof row.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.id) ||
    typeof row.email !== 'string' ||
    row.email.length > 254 ||
    !row.email.trim() ||
    /[\u0000-\u001f\u007f]/.test(row.email) ||
    typeof row.first_name !== 'string' ||
    row.first_name.trim().length < 2 ||
    row.first_name.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(row.first_name) ||
    typeof row.last_name !== 'string' ||
    row.last_name.trim().length < 2 ||
    row.last_name.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(row.last_name) ||
    (row.role !== 'ADMIN' && row.role !== 'ORG_ADMIN' && row.role !== 'PSYCHOLOG') ||
    typeof row.active !== 'boolean' ||
    (row.organization_id !== null &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        row.organization_id,
      ))
  ) {
    throw new Error('Supabase kullanıcı profili eksik veya geçersiz.');
  }
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    active: row.active,
    organizationId: row.organization_id,
  };
}

export async function profileForUser(userId: string): Promise<AuthenticatedUser> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id,email,first_name,last_name,role,active,organization_id')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('[profileForUser] Supabase error:', {
      message: error.message,
      code: error.code,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
    if (error.code === '42501' || /permission denied/i.test(error.message)) {
      throw new Error('Bu hesapla profil okunamadı. Lütfen yöneticinizle iletişime geçin.');
    }
    if (error.code === 'PGRST116' || /406/i.test(error.message)) {
      throw new Error('Kullanıcı profili bulunamadı. Lütfen yöneticinizle iletişime geçin.');
    }
    throw new Error('Kullanıcı profili doğrulanamadı. Bağlantınızı kontrol edip tekrar deneyin.');
  }
  if (!data) {
    console.warn('[profileForUser] No profile row for userId:', userId, '— attempting self-heal insert');
    // Self-heal: try to create own profile if missing (requires profiles_insert_self policy)
    try {
      const { data: sessionData } = await client.auth.getSession();
      const email = sessionData.session?.user.email || '';
      const meta = sessionData.session?.user.user_metadata as { first_name?: string; last_name?: string } | undefined;
      const { data: inserted, error: insertError } = await client
        .from('profiles')
        .insert({
          id: userId,
          email: email || null,
          first_name: meta?.first_name?.trim() || 'Yeni',
          last_name: meta?.last_name?.trim() || 'Kullanıcı',
          role: 'PSYCHOLOG',
          active: true,
        })
        .select('id,email,first_name,last_name,role,active,organization_id')
        .maybeSingle();
      if (insertError) {
        console.error('[profileForUser] self-heal insert failed:', insertError);
        throw new Error('Kullanıcı profili bulunamadı. Lütfen yöneticinizle iletişime geçin.');
      }
      if (!inserted) throw new Error('Kullanıcı profili oluşturulamadı (insert null).');
      return profileFromRow(inserted as ProfileRow);
    } catch (e) {
      console.error('[profileForUser] self-heal failed:', e);
      throw new Error('Kullanıcı profili bulunamadı. Lütfen yöneticinizle iletişime geçin.');
    }
  }
  return profileFromRow(data as ProfileRow);
}

export async function signIn(email: string, password: string): Promise<AuthenticatedUser> {
  const client = requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) throw new Error('E-posta ve şifre zorunludur.');
  const { data, error } = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (error || !data.user) throw new Error('Giriş bilgileri geçersiz.');
  try {
    const profile = await profileForUser(data.user.id);
    if (!profile.active) {
      await client.auth.signOut({ scope: 'local' });
      throw new Error('Bu hesap pasif durumda. Admin ile iletişime geçin.');
    }
    return profile;
  } catch (cause) {
    await client.auth.signOut({ scope: 'local' });
    throw cause;
  }
}

export async function userFromSession(session: Session | null): Promise<AuthenticatedUser | null> {
  if (!session?.user) return null;
  const profile = await profileForUser(session.user.id);
  if (!profile.active) {
    await requireSupabase().auth.signOut({ scope: 'local' });
    throw new Error('Bu hesap pasif durumda.');
  }
  return profile;
}

export function onAuthChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  const client = requireSupabase();
  return client.auth.onAuthStateChange(callback);
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw new Error('Supabase oturumu alınamadı.');
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
  if (error) throw new Error('Oturum kapatılamadı.');
}
