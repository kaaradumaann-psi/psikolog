import { navigate, useRoute } from '../../app/router';
import type { AuthenticatedUser } from '../../auth/authTypes';

type Props = {
  user: AuthenticatedUser;
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ user, open, onClose }: Props) {
  const route = useRoute();

  const isActive = (page: string) => {
    if (route.page === 'client' && page === 'clients') return true;
    if (route.page === 'client_new' && page === 'clients') return true;
    return route.page === page;
  };

  const link = (to: string, label: string, page: string) => (
    <a
      href={to}
      className={`sidebar-link ${isActive(page) ? 'active' : ''}`}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
        onClose();
      }}
    >
      {label}
    </a>
  );

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-inner">
        <div className="sidebar-section">
          <div className="sidebar-label">Çalışma</div>
          {link('/dashboard', 'Dashboard', 'dashboard')}
          {link('/clients', 'Danışanlar', 'clients')}
          {link('/appointments', 'Randevular', 'appointments')}
          {link('/tasks', 'Görevler', 'tasks')}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Sistem</div>
          {link('/settings', 'Ayarlar', 'settings')}
          {(user.role === 'ADMIN' || user.role === 'ORG_ADMIN') && (
            <>
              {link('/admin', 'Yönetim', 'admin')}
              {link('/audit', 'Denetim İzi', 'audit')}
            </>
          )}
        </div>

        <div style={{ marginTop: 'auto', padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
            psikolog.halilkaraduman.com.tr
            <br />
            Profesyonel çalışma platformu
            <br />
            KVKK odaklı • RLS korumalı
          </div>
        </div>
      </div>
    </aside>
  );
}
