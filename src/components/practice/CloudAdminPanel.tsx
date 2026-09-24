import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { adminCreateUser, adminListProfiles, type AdminProfile } from '../../features/admin/adminApi';

export function CloudAdminPanel() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });

  useEffect(() => {
    adminListProfiles().then(setProfiles).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Listelenemedi'));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const created = await adminCreateUser({ ...form, role: 'PSYCHOLOG' });
      setProfiles((prev) => [created, ...prev]);
      setForm({ firstName: '', lastName: '', email: '', password: '' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Oluşturulamadı');
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 15 }}>Psikolog hesabı</h3>
      <p style={{ fontSize: 13, color: 'var(--soft)' }}>Halka açık kayıt kapalıdır. Hesap yalnızca bu yönetim formundan, Edge Function ile açılır.</p>
      <form onSubmit={onSubmit} className="form-row-2" style={{ alignItems: 'end' }}>
        <label className="form-group">Ad<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required minLength={2} /></label>
        <label className="form-group">Soyad<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required minLength={2} /></label>
        <label className="form-group">E-posta<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <label className="form-group">Geçici parola<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={8} /></label>
        <button type="submit" className="btn-primary btn-sm">Hesap oluştur</button>
      </form>
      {error && <p style={{ color: 'var(--danger-ink)' }}>{error}</p>}
      <ul style={{ paddingLeft: 18, fontSize: 13 }}>
        {profiles.map((profile) => (
          <li key={profile.id}>{profile.first_name} {profile.last_name} · {profile.email || '—'} · {profile.role} · {profile.active ? 'aktif' : 'pasif'}</li>
        ))}
      </ul>
    </div>
  );
}
