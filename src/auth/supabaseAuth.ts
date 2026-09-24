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
};

function profileFromRow(row: ProfileRow): AuthenticatedUser {
  if (typeof row.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.id) ||
    typeof row.email !== 'string' || row.email.length > 254 || !row.email.trim() || /[\u0000-\u001f\u007f]/.test(row.email) ||
    typeof row.first_name !== 'string' || row.first_name.trim().length < 2 || row.first_name.length > 80 || /[\u0000-\u001f\u007f]/.test(row.first_name) ||
    typeof row.last_name !== 'string' || row.last_name.trim().length < 2 || row.last_name.length > 80 || /[\u0000-\u001f\u007f]/.test(row.last_name) ||
    (row.role !== 'ADMIN' && row.role !== 'PSYCHOLOG') || typeof row.active !== 'boolean') {
    throw new Error('Supabase kullanıcı profili eksik veya geçersiz.');
  }
  return { id: row.id, email: row.email, firstName: row.first_name, lastName: row.last_name, role: row.role, active: row.active };
}

export async function profileForUser(userId: string): Promise<AuthenticatedUser> {
  const client = requireSupabase();
  const { data, error } = await client.from('profiles').select('id,email,first_name,last_name,role,active').eq('id', userId).maybeSingle();
  if (error) throw new Error('Kullanıcı profili alınamadı.');
  if (!data) throw new Error('Kullanıcı profili bulunamadı.');
  return profileFromRow(data as ProfileRow);
}

export async function signIn(email: string, password: string): Promise<AuthenticatedUser> {
  const client = requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) throw new Error('E-posta ve şifre zorunludur.');
  const { data, error } = await client.auth.signInWithPassword({ email: normalizedEmail, password });
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
