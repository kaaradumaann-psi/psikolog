import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { AuthenticatedUser } from '../../auth/authTypes';
import { Icon } from '../Icon';
import {
  adminCreateOrganization,
  adminCreateUser,
  adminListOrganizations,
  adminListProfiles,
  adminUpdateProfile,
  type AdminOrg,
  type AdminProfile,
} from '../../features/admin/adminApi';

type Props = { user: AuthenticatedUser; onOwnOrganizationAssigned?: (organizationId: string) => void };

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Sistem yöneticisi',
  ORG_ADMIN: 'Kurum yöneticisi',
  PSYCHOLOG: 'Psikolog',
};

/** The platform ADMIN can bootstrap tenants without a clinical org. Only an
 * explicitly selected org enables the clinical workspace or a new staff user. */
export function CloudAdminPanel({ user, onOwnOrganizationAssigned }: Props) {
  const platformAdmin = user.role === 'ADMIN';
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [organizations, setOrganizations] = useState<AdminOrg[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState(user.organizationId ?? '');
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'PSYCHOLOG' as 'PSYCHOLOG' | 'ORG_ADMIN' });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([adminListProfiles(user), adminListOrganizations(user)])
      .then(([accounts, orgs]) => {
        if (cancelled) return;
        setProfiles(accounts);
        setOrganizations(orgs);
        setSelectedOrgId((selected) => {
          if (selected && orgs.some((org) => org.id === selected)) return selected;
          if (user.organizationId && orgs.some((org) => org.id === user.organizationId)) return user.organizationId;
          return '';
        });
        setLoadFailed(false);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setLoadFailed(true);
          setError(reason instanceof Error ? reason.message : 'Yönetim verileri alınamadı.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user.id, user.role, user.organizationId, reloadKey]);

  const organizationId = platformAdmin ? selectedOrgId : user.organizationId ?? '';
  const organizationName = (id: string | null) => !id ? 'Kurum atanmamış'
    : organizations.find((org) => org.id === id)?.name ?? (loading ? 'Kurum adı yükleniyor…' : 'Kurum adı doğrulanamadı');
  const unassigned = platformAdmin ? profiles.filter((profile) => profile.role !== 'ADMIN' && !profile.organization_id) : [];

  async function createOrganization(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const org = await adminCreateOrganization(newOrgName);
      setOrganizations((previous) => [...previous, org]);
      setSelectedOrgId('');
      setNewOrgName('');
      setNotice('Kurum oluşturuldu. İşleme devam etmek için kurum listesinden kurumu açıkça seçin.');
    } catch (reason) {
      setError(`${reason instanceof Error ? reason.message : 'Kurum oluşturulamadı.'} Yeniden oluşturmadan önce kurum listesini yenileyin.`);
    } finally {
      setBusy(false);
    }
  }

  async function assignOwnOrganization() {
    if (!platformAdmin || user.organizationId || !organizationId) return;
    setBusy(true);
    setError(null);
    try {
      await adminUpdateProfile({ id: user.id, role: 'ADMIN', active: true, organizationId });
      onOwnOrganizationAssigned?.(organizationId);
      setNotice('Kurum atandı. Klinik çalışma alanı hazırlanıyor.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kurum ataması tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function assignUnassigned(profile: AdminProfile) {
    if (!platformAdmin || profile.organization_id || profile.role === 'ADMIN' || !organizationId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await adminUpdateProfile({
        id: profile.id, role: profile.role, active: profile.active, organizationId,
      });
      setProfiles((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      setNotice('Hesap seçilen kuruma atandı. Kullanıcı yeniden giriş yaparak klinik alanını açabilir.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Hesaba kurum atanamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await adminCreateUser({ ...form, role: platformAdmin ? form.role : 'PSYCHOLOG', organizationId });
      setProfiles((previous) => [created, ...previous]);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'PSYCHOLOG' });
      setNotice('Kullanıcı seçilen kuruma bağlı olarak oluşturuldu.');
    } catch (reason) {
      setError(`${reason instanceof Error ? reason.message : 'Hesap oluşturulamadı.'} Yeniden oluşturmadan önce hesap listesini yenileyin.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="modern-table-card cloud-admin-panel" aria-label="Kurum ve hesap yönetimi">
      <h2>Kurum ve hesap yönetimi</h2>
      <p className="section-hint">
        Kurum, danışan kayıtlarının ve belge kasasının ayrı güvenlik alanıdır. Bir kuruma üye olmak yalnız isim ve
        rol görünürlüğü sağlar — hiçbir hesaba başka bir psikoloğun danışan dosyasına otomatik erişim vermez.
        E-posta adresi kurum atamaz; hesap yetkileri sunucudaki profil ve RLS ile belirlenir. Halka açık kayıt kapalıdır.
      </p>

      {loading && <p role="status" className="section-hint">Kurumlar ve hesaplar yükleniyor…</p>}
      {error && <p role="alert" className="record-lock-error">{error}</p>}
      {notice && <p role="status" className="cloud-admin-notice">{notice}</p>}

      <button type="button" className="btn-secondary btn-sm" disabled={busy || loading} onClick={() => setReloadKey((previous) => previous + 1)}>
        <Icon name="refresh" size={14} /> Kurum ve hesap listesini yenile
      </button>

      {platformAdmin && (
        <>
          <div className="cloud-admin-block">
            <h3>Kurumlar</h3>
            <form onSubmit={(event) => { void createOrganization(event); }} className="form-row-2">
              <label className="form-group">Yeni kurum adı
                <input value={newOrgName} onChange={(event) => setNewOrgName(event.target.value)} required minLength={2} maxLength={180} />
              </label>
              <button type="submit" className="btn-secondary btn-sm" disabled={busy || loading || loadFailed}>Kurum oluştur</button>
            </form>
            <label className="form-group">İşlem yapılacak kurum
              <select value={selectedOrgId} onChange={(event) => setSelectedOrgId(event.target.value)} disabled={busy || loading || loadFailed}>
                <option value="">Kurum seçin</option>
                {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select>
            </label>
            {!user.organizationId && (
              <div className="cloud-admin-callout">
                <p className="section-hint">Sistem yöneticisi kurumsuz olarak hesapları yönetebilir; klinik çalışma alanı için kendi kapsamınıza bir kurum atayın.</p>
                <button type="button" className="btn-primary btn-sm" disabled={!organizationId || busy || loading || loadFailed} onClick={() => { void assignOwnOrganization(); }}>
                  Seçili kurumu kendi klinik alanıma ata
                </button>
              </div>
            )}
          </div>

          {!!unassigned.length && (
            <div className="cloud-admin-block">
              <h3>Kurumu olmayan mevcut hesaplar</h3>
              <p className="section-hint">Yalnız henüz kurum atanmamış kullanıcılar burada atanır; mevcut kurumu olan hesabı klinik geçmişi incelemeden taşımayın.</p>
              <ul className="cloud-admin-unassigned-list">
                {unassigned.map((profile) => (
                  <li key={profile.id}>
                    <span>{profile.first_name} {profile.last_name} · {profile.email || '—'} · {ROLE_LABEL[profile.role] ?? profile.role}</span>
                    <button type="button" className="btn-secondary btn-sm" disabled={!organizationId || busy || loading || loadFailed} onClick={() => { void assignUnassigned(profile); }}>
                      Seçili kuruma ata
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {!platformAdmin && (
        <p className="section-hint">
          Yönettiğiniz kurum: <strong>{organizationName(user.organizationId)}</strong>. Yalnız bu kuruma psikolog ekleyebilirsiniz.
        </p>
      )}

      <div className="cloud-admin-block">
        <h3>Yeni hesap oluştur</h3>
        <p className="section-hint">Önce kurum seçin. Şifre en az 10 karakter olmalıdır. Hesap oluşturma Supabase Edge Function üzerinden yapılır.</p>
        <form onSubmit={(event) => { void onSubmit(event); }} className="form-row-2">
          <label className="form-group">Ad<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required minLength={2} maxLength={80} /></label>
          <label className="form-group">Soyad<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required minLength={2} maxLength={80} /></label>
          <label className="form-group">E-posta<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label className="form-group">Geçici parola<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={10} maxLength={128} /></label>
          {platformAdmin && (
            <label className="form-group">Yetki
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value === 'ORG_ADMIN' ? 'ORG_ADMIN' : 'PSYCHOLOG' })}>
                <option value="PSYCHOLOG">Psikolog</option>
                <option value="ORG_ADMIN">Kurum yöneticisi</option>
              </select>
            </label>
          )}
          <button type="submit" className="btn-primary btn-sm" disabled={!organizationId || busy || loading || loadFailed}>Seçili kurumda hesap oluştur</button>
        </form>
        {!organizationId && !loading && <p role="status" className="section-hint">Hesap oluşturmak için önce geçerli bir kurum seçin veya oluşturun.</p>}
      </div>

      <div className="cloud-admin-block">
        <h3>Hesaplar</h3>
        {profiles.length === 0 && !loading ? (
          <div className="empty-state-card">
            <Icon name="users" size={30} />
            <h4>Bu kapsamda hesap bulunamadı</h4>
            <p>Seçili kurum kapsamında henüz hiç hesap yok.</p>
          </div>
        ) : (
          <div className="client-table-wrap mobile-card-table">
            <table className="client-table" data-mobile-cards>
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>E-posta</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>Kurum</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td data-label="Ad Soyad">{profile.first_name} {profile.last_name}</td>
                    <td data-label="E-posta">{profile.email || '—'}</td>
                    <td data-label="Rol">{ROLE_LABEL[profile.role] ?? profile.role}</td>
                    <td data-label="Durum">
                      <span className={`badge ${profile.active ? 'badge-active' : 'badge-archived'}`}>
                        {profile.active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td data-label="Kurum">{organizationName(profile.organization_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
