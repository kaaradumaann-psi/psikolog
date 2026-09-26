import type { AuthenticatedUser } from '../../auth/authTypes';
import { CloudAdminPanel } from './CloudAdminPanel';
import { SiteFooter } from '../SiteFooter';

/** An authenticated platform ADMIN without a clinical org can manage tenants,
 * but must not enter the clinical workspace or be assigned one implicitly. */
export function AdminSetupPage({
  user, onLogout, onOwnOrganizationAssigned, logoutError,
}: {
  user: AuthenticatedUser;
  onLogout: () => void;
  onOwnOrganizationAssigned: (organizationId: string) => void;
  logoutError: string | null;
}) {
  return (
    <div className="auth-page">
      <main className="auth-shell" style={{ maxWidth: 940, width: '100%' }}>
        <div className="modern-table-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 23, margin: '0 0 8px' }}>Sistem yöneticisi kurulumu</h1>
              <p style={{ margin: 0 }}>Hesabınız ADMIN rolünde, ancak klinik çalışma alanı için kurum seçilmemiş.</p>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={onLogout}>Çıkış</button>
          </div>
          {logoutError && <p role="alert" style={{ color: 'var(--danger-ink)' }}>{logoutError}</p>}
          <p style={{ fontSize: 13, color: 'var(--soft)' }}>
            Bu ekranda kurum ve hesapları yönetebilirsiniz. Danışan kayıtları açılmaz;
            klinik alana geçmek isterseniz yalnızca seçtiğiniz kurumu kendi profilinize atayın.
          </p>
        </div>
        <CloudAdminPanel user={user} onOwnOrganizationAssigned={onOwnOrganizationAssigned} />
      </main>
      <SiteFooter compact />
    </div>
  );
}
