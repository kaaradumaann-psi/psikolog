import { useEffect, useMemo, useState } from 'react';
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
type AccountScope = 'context' | 'all' | 'unassigned';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Sistem yöneticisi',
  ORG_ADMIN: 'Kurum yöneticisi',
  PSYCHOLOG: 'Psikolog',
};

function initials(profile: AdminProfile): string {
  return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toLocaleUpperCase('tr-TR');
}

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
  const [accountQuery, setAccountQuery] = useState('');
  const [accountScope, setAccountScope] = useState<AccountScope>('context');
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
  const selectedOrganization = organizations.find((org) => org.id === organizationId);
  const organizationName = (id: string | null) => !id ? 'Kurum atanmamış'
    : organizations.find((org) => org.id === id)?.name ?? (loading ? 'Kurum adı yükleniyor…' : 'Kurum adı doğrulanamadı');
  const unassigned = platformAdmin ? profiles.filter((profile) => profile.role !== 'ADMIN' && !profile.organization_id) : [];
  const activeCount = profiles.filter((profile) => profile.active).length;
  const contextCount = organizationId ? profiles.filter((profile) => profile.organization_id === organizationId).length : 0;

  const visibleProfiles = useMemo(() => {
    const normalizedQuery = accountQuery.trim().toLocaleLowerCase('tr-TR');
    return profiles.filter((profile) => {
      const scopeMatches = accountScope === 'all'
        || (accountScope === 'unassigned' && !profile.organization_id)
        || (accountScope === 'context' && (!organizationId || profile.organization_id === organizationId));
      if (!scopeMatches) return false;
      if (!normalizedQuery) return true;
      const searchable = `${profile.first_name} ${profile.last_name} ${profile.email ?? ''} ${ROLE_LABEL[profile.role] ?? profile.role} ${organizationName(profile.organization_id)}`
        .toLocaleLowerCase('tr-TR');
      return searchable.includes(normalizedQuery);
    });
  }, [accountQuery, accountScope, organizationId, organizations, profiles]);

  async function createOrganization(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const org = await adminCreateOrganization(newOrgName);
      setOrganizations((previous) => [...previous, org]);
      setSelectedOrgId(org.id);
      setAccountScope('context');
      setNewOrgName('');
      setNotice(`“${org.name}” oluşturuldu ve işlem kapsamı olarak seçildi. Kurum oluşturmak hesabınızı otomatik olarak bu kuruma bağlamaz.`);
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
    setNotice(null);
    try {
      await adminUpdateProfile({ id: user.id, role: 'ADMIN', active: true, organizationId });
      setNotice('Kurum hesabınıza atandı. Klinik çalışma alanı hazırlanıyor.');
      onOwnOrganizationAssigned?.(organizationId);
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
      setNotice(`${profile.first_name} ${profile.last_name}, ${organizationName(organizationId)} kurumuna atandı. Kullanıcı yeniden giriş yaparak çalışma alanını açabilir.`);
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
      setAccountScope('context');
      setNotice(`${created.first_name} ${created.last_name} hesabı ${organizationName(organizationId)} kurumunda oluşturuldu.`);
    } catch (reason) {
      setError(`${reason instanceof Error ? reason.message : 'Hesap oluşturulamadı.'} Yeniden oluşturmadan önce hesap listesini yenileyin.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cloud-admin-panel" aria-label="Kurum ve hesap yönetimi">
      <div className="cloud-admin-heading">
        <div>
          <span className="cloud-admin-eyebrow">YÖNETİM</span>
          <h2>Kurum ve hesap yönetimi</h2>
          <p>
            Önce işlem yapılacak kurumu belirleyin. Ardından mevcut hesabı atayabilir veya o kurum için yeni ekip
            hesabı oluşturabilirsiniz. Kurum üyeliği, başka bir uzmanın danışan dosyalarına kendiliğinden erişim vermez.
          </p>
        </div>
        {!loading && !loadFailed && (
          <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => setReloadKey((previous) => previous + 1)}>
            <Icon name="refresh" size={14} /> Listeleri yenile
          </button>
        )}
      </div>

      <div className="cloud-admin-summary" aria-label="Yönetim özeti">
        <div><strong>{organizations.length}</strong><span>Kurum</span></div>
        <div><strong>{profiles.length}</strong><span>Toplam hesap</span></div>
        <div><strong>{activeCount}</strong><span>Aktif hesap</span></div>
        <div><strong>{unassigned.length}</strong><span>Kurum bekleyen</span></div>
      </div>

      {loading && (
        <div className="cloud-admin-feedback is-loading" role="status">
          <span className="spinner-sm" aria-hidden="true" /> Kurumlar ve hesaplar sunucudan alınıyor…
        </div>
      )}
      {error && (
        <div className="cloud-admin-feedback is-error" role="alert">
          <div><strong>{loadFailed ? 'Yönetim verileri alınamadı' : 'İşlem tamamlanamadı'}</strong><span>{error}</span></div>
          {loadFailed && (
            <button type="button" className="btn-secondary btn-sm" disabled={busy || loading} onClick={() => setReloadKey((previous) => previous + 1)}>
              <Icon name="refresh" size={14} /> Yeniden dene
            </button>
          )}
        </div>
      )}
      {notice && <p role="status" className="cloud-admin-notice"><Icon name="checkCircle" size={16} /> {notice}</p>}

      <section className="cloud-admin-step" aria-labelledby="organization-step-title">
        <div className="cloud-admin-step-index" aria-hidden="true">01</div>
        <div className="cloud-admin-step-body">
          <div className="cloud-admin-step-head">
            <div>
              <h3 id="organization-step-title">İşlem kapsamını seçin</h3>
              <p>Bu seçim yalnız aşağıdaki yönetim işlemlerinin hangi kurum için yapılacağını belirler.</p>
            </div>
            {organizationId && <span className="cloud-admin-context-state">Kurum seçildi</span>}
          </div>

          {platformAdmin ? (
            <div className="cloud-admin-context-grid">
              <label className="form-group">İşlem yapılacak kurum
                <select value={selectedOrgId} onChange={(event) => { setSelectedOrgId(event.target.value); setAccountScope('context'); }} disabled={busy || loading || loadFailed}>
                  <option value="">Kurum seçin</option>
                  {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                </select>
              </label>
              <div className={`cloud-admin-selection${selectedOrganization ? ' has-selection' : ''}`}>
                {selectedOrganization ? (
                  <>
                    <span>SEÇİLİ KURUM</span>
                    <strong>{selectedOrganization.name}</strong>
                    <small>{contextCount} bağlı hesap</small>
                  </>
                ) : (
                  <>
                    <span>SEÇİM BEKLENİYOR</span>
                    <strong>Henüz kurum seçilmedi</strong>
                    <small>Atama ve hesap oluşturma seçim yapılana kadar kapalıdır.</small>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="cloud-admin-owned-context">
              Yönettiğiniz kurum: <strong>{organizationName(user.organizationId)}</strong>. Yalnız bu kuruma psikolog ekleyebilirsiniz.
            </p>
          )}

          {platformAdmin && (
            <details className="cloud-admin-create-org">
              <summary><Icon name="plus" size={15} /> Listede yoksa yeni kurum oluştur</summary>
              <form onSubmit={(event) => { void createOrganization(event); }}>
                <label className="form-group">Yeni kurum adı
                  <input value={newOrgName} onChange={(event) => setNewOrgName(event.target.value)} placeholder="Örn. Klinik adı" required minLength={2} maxLength={180} />
                </label>
                <button type="submit" className="btn-secondary btn-sm" disabled={busy || loading || loadFailed}>Kurum oluştur ve seç</button>
              </form>
              <p>Kurum oluşturmak klinik kayıt açmaz ve hesabınızı otomatik bağlamaz.</p>
            </details>
          )}

          {platformAdmin && !user.organizationId && (
            <div className="cloud-admin-own-scope">
              <div>
                <strong>Kendi klinik çalışma alanınızı açmak istiyor musunuz?</strong>
                <p>Yalnız kurum ve hesap yönetimi yapacaksanız bu adım zorunlu değildir. Danışan dosyalarını açmak için doğru kurumu hesabınıza bir kez atayın.</p>
              </div>
              <button type="button" className="btn-primary btn-sm" disabled={!organizationId || busy || loading || loadFailed} onClick={() => { void assignOwnOrganization(); }}>
                Seçili kurumu kendi klinik alanıma ata
              </button>
            </div>
          )}
        </div>
      </section>

      {platformAdmin && unassigned.length > 0 && (
        <section className="cloud-admin-step" aria-labelledby="unassigned-step-title">
          <div className="cloud-admin-step-index" aria-hidden="true">02</div>
          <div className="cloud-admin-step-body">
            <div className="cloud-admin-step-head">
              <div>
                <h3 id="unassigned-step-title">Kurumu olmayan hesapları tamamlayın</h3>
                <p>Yalnız henüz kurum atanmamış kullanıcılar gösterilir. Kuruma sahip hesaplar bu ekrandan taşınmaz.</p>
              </div>
              <span className="cloud-admin-count">{unassigned.length}</span>
            </div>
            <ul className="cloud-admin-unassigned-list">
              {unassigned.map((profile) => (
                <li key={profile.id}>
                  <span className="cloud-admin-avatar" aria-hidden="true">{initials(profile)}</span>
                  <span className="cloud-admin-unassigned-identity">
                    <strong>{profile.first_name} {profile.last_name}</strong>
                    <small>{profile.email || 'E-posta yok'} · {ROLE_LABEL[profile.role] ?? profile.role}</small>
                  </span>
                  <button type="button" className="btn-secondary btn-sm" disabled={!organizationId || busy || loading || loadFailed} onClick={() => { void assignUnassigned(profile); }}>
                    {organizationId ? 'Seçili kuruma ata' : 'Önce kurum seçin'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="cloud-admin-step" aria-labelledby="new-account-step-title">
        <div className="cloud-admin-step-index" aria-hidden="true">{platformAdmin && unassigned.length ? '03' : '02'}</div>
        <div className="cloud-admin-step-body">
          <div className="cloud-admin-step-head">
            <div>
              <h3 id="new-account-step-title">Yeni ekip hesabı oluşturun</h3>
              <p>Hesap doğrudan seçili kuruma bağlanır. Geçici parola en az 10 karakter olmalıdır.</p>
            </div>
          </div>
          {!organizationId && !loading && (
            <p role="status" className="cloud-admin-inline-guidance"><Icon name="info" size={16} /> Formu açmak için önce yukarıdan geçerli bir kurum seçin veya oluşturun.</p>
          )}
          <form onSubmit={(event) => { void onSubmit(event); }} className="cloud-admin-account-form">
            <label className="form-group">Ad<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} autoComplete="off" required minLength={2} maxLength={80} disabled={!organizationId || busy || loadFailed} /></label>
            <label className="form-group">Soyad<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} autoComplete="off" required minLength={2} maxLength={80} disabled={!organizationId || busy || loadFailed} /></label>
            <label className="form-group">E-posta<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="off" required disabled={!organizationId || busy || loadFailed} /></label>
            <label className="form-group">Geçici parola<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" required minLength={10} maxLength={128} disabled={!organizationId || busy || loadFailed} /></label>
            {platformAdmin && (
              <label className="form-group">Yetki
                <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value === 'ORG_ADMIN' ? 'ORG_ADMIN' : 'PSYCHOLOG' })} disabled={!organizationId || busy || loadFailed}>
                  <option value="PSYCHOLOG">Psikolog</option>
                  <option value="ORG_ADMIN">Kurum yöneticisi</option>
                </select>
              </label>
            )}
            <div className="cloud-admin-form-action">
              <span>{selectedOrganization?.name ?? (platformAdmin ? 'Kurum seçilmedi' : organizationName(user.organizationId))}</span>
              <button type="submit" className="btn-primary" disabled={!organizationId || busy || loading || loadFailed}>
                {busy ? 'İşlem sürüyor…' : 'Hesabı oluştur'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="cloud-admin-step" aria-labelledby="accounts-step-title">
        <div className="cloud-admin-step-index" aria-hidden="true">{platformAdmin && unassigned.length ? '04' : '03'}</div>
        <div className="cloud-admin-step-body">
          <div className="cloud-admin-step-head">
            <div>
              <h3 id="accounts-step-title">Hesapları inceleyin</h3>
              <p>Rol, aktiflik ve kurum bilgisini tek listede kontrol edin.</p>
            </div>
            <span className="cloud-admin-count">{visibleProfiles.length}</span>
          </div>

          <div className="cloud-admin-account-tools">
            <label className="cloud-admin-search">
              <span className="sr-only">Hesap ara</span>
              <Icon name="search" size={16} />
              <input value={accountQuery} onChange={(event) => setAccountQuery(event.target.value)} placeholder="Ad, e-posta veya kurum ara" />
            </label>
            {platformAdmin && (
              <label className="form-group cloud-admin-scope-filter">
                <span className="sr-only">Hesap kapsamı</span>
                <select value={accountScope} onChange={(event) => setAccountScope(event.target.value as AccountScope)}>
                  <option value="context">{organizationId ? 'Seçili kurum' : 'Kurum seçilene kadar tümü'}</option>
                  <option value="all">Tüm hesaplar</option>
                  <option value="unassigned">Kurumu olmayanlar</option>
                </select>
              </label>
            )}
          </div>

          {profiles.length === 0 && !loading ? (
            <div className="empty-state-card cloud-admin-empty">
              <Icon name="users" size={28} />
              <h4>Bu kapsamda hesap bulunamadı</h4>
              <p>Yukarıdaki formdan ilk ekip hesabını oluşturabilirsiniz.</p>
            </div>
          ) : visibleProfiles.length === 0 && !loading ? (
            <div className="cloud-admin-no-results">
              <strong>Eşleşen hesap yok</strong>
              <span>Arama sözcüğünü veya kapsam filtresini değiştirin.</span>
            </div>
          ) : (
            <div className="client-table-wrap mobile-card-table cloud-admin-table-wrap">
              <table className="client-table" data-mobile-cards>
                <thead>
                  <tr>
                    <th>Hesap</th>
                    <th>Rol</th>
                    <th>Durum</th>
                    <th>Kurum</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProfiles.map((profile) => (
                    <tr key={profile.id}>
                      <td data-label="Hesap">
                        <span className="cloud-admin-account-cell">
                          <span className="cloud-admin-avatar" aria-hidden="true">{initials(profile)}</span>
                          <span><strong>{profile.first_name} {profile.last_name}</strong><small>{profile.email || 'E-posta yok'}</small></span>
                        </span>
                      </td>
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
    </section>
  );
}
