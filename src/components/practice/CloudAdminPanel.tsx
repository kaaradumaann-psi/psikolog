import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { adminCreateUser, adminListProfiles, type AdminProfile } from '../../features/admin/adminApi';

export function CloudAdminPanel() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });

  useEffect(() => {
    adminListProfiles()
      .then(setProfiles)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Hesap listesi alınamadı.'))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    if (form.password.length < 10) {
      setError('Geçici parola en az 10 karakter olmalı (sunucu kuralı).');
      return;
    }
    setSaving(true);
    try {
      const created = await adminCreateUser({ ...form, role: 'PSYCHOLOG' });
      setProfiles((prev) => [created, ...prev]);
      setForm({ firstName: '', lastName: '', email: '', password: '' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Hesap oluşturulamadı.');
    } finally {
      setSaving(false);
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
        <label className="form-group">Geçici parola<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={10} /></label>
        <button type="submit" className="btn-primary btn-sm" disabled={saving} aria-busy={saving}>{saving ? 'Oluşturuluyor…' : 'Hesap oluştur'}</button>
      </form>
      {error && <p style={{ color: 'var(--danger-ink)' }}>{error}</p>}
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--soft)' }} role="status">Hesaplar yükleniyor…</p>
      ) : profiles.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--soft)' }}>Kayıtlı hesap listesi boş. İlk psikolog hesabını yukarıdan açın.</p>
      ) : (
        <ul style={{ paddingLeft: 18, fontSize: 13 }}>
          {profiles.map((profile) => (
            <li key={profile.id}>{profile.first_name} {profile.last_name} · {profile.email || '—'} · {profile.role} · {profile.active ? 'aktif' : 'pasif'}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
