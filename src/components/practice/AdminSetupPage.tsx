import type { AuthenticatedUser } from '../../auth/authTypes';
import { displayName } from '../../auth/userDisplay';
import { CloudAdminPanel } from './CloudAdminPanel';
import { Icon } from '../Icon';
import { SiteFooter } from '../SiteFooter';
import { WorkspaceSectionBoundary } from '../WorkspaceSectionBoundary';

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
    <div className="auth-page admin-setup-page">
      <main className="admin-setup-shell">
        <header className="admin-setup-account-bar">
          <div className="admin-setup-account">
            <span className="admin-setup-account-mark" aria-hidden="true"><Icon name="shield" size={18} /></span>
            <div>
              <strong>{displayName(user)}</strong>
              <span>Sistem yöneticisi · klinik kurum atanmamış</span>
            </div>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={onLogout}>Çıkış</button>
        </header>

        {logoutError && <p className="record-lock-error admin-setup-logout-error" role="alert">{logoutError}</p>}

        <section className="admin-setup-intro" aria-labelledby="admin-setup-title">
          <div>
            <span className="admin-setup-kicker">Sistem yöneticisi kurulumu</span>
            <h1 id="admin-setup-title">Önce çalışma alanınızın kurumunu belirleyin.</h1>
          </div>
          <p>
            Kurum; ekip adı olmanın ötesinde, klinik kayıtların sunucuda hangi güvenlik sınırı içinde tutulacağını
            belirler. Yönetim işlemleri için kurum üyeliği gerekmez. Danışan dosyalarını açmak istiyorsanız mevcut
            kurumlardan doğru olanı seçip kendi hesabınıza açıkça atayın.
          </p>
        </section>

        <div className="admin-setup-principles" aria-label="Kurum modelinin özeti">
          <div><strong>Kurum</strong><span>Klinik ve ekip için tek güvenlik kapsamı</span></div>
          <div><strong>Hesap</strong><span>Bir kuruma bağlı rol ve oturum kimliği</span></div>
          <div><strong>Dosya erişimi</strong><span>Kurum üyeliğinden ayrıca sunucu kurallarıyla sınırlandırılır</span></div>
        </div>

        <WorkspaceSectionBoundary
          title="Kurum yönetimi görüntülenemedi"
          description="Hesap oturumunuz açık kaldı. Bölümü yeniden deneyin; sorun sürerse çıkış yapıp yöneticinize başvurun."
        >
          <CloudAdminPanel user={user} onOwnOrganizationAssigned={onOwnOrganizationAssigned} />
        </WorkspaceSectionBoundary>
      </main>
      <SiteFooter compact />
    </div>
  );
}
