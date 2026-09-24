import { useState } from 'react';
import { navigate } from '../../app/router';
import type { AuthenticatedUser } from '../../auth/authTypes';
import { ROLE_LABEL } from '../../auth/authTypes';

type Props = {
  user: AuthenticatedUser;
  onLogout: () => void;
};

export function Header({ user, onLogout }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="nav">
      <div className="nav-inner">
        <a
          href="/dashboard"
          className="logo"
          onClick={(e) => {
            e.preventDefault();
            navigate('/dashboard');
          }}
        >
          psikolog<span>.platform</span>
        </a>

        <button
          className="mobile-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-label="menü"
          aria-expanded={open}
          aria-controls="nav-links"
        >
          <div className="hamburger">
            <span style={{ transform: open ? 'translateY(5px) rotate(45deg)' : 'none' }} />
            <span style={{ opacity: open ? 0 : 1 }} />
            <span style={{ transform: open ? 'translateY(-5px) rotate(-45deg)' : 'none' }} />
          </div>
        </button>

        <div id="nav-links" className={`nav-links ${open ? 'open' : ''}`}>
          <a
            href="/dashboard"
            className="nav-link"
            onClick={(e) => {
              e.preventDefault();
              navigate('/dashboard');
              setOpen(false);
            }}
          >
            Dashboard
          </a>
          <a
            href="/clients"
            className="nav-link"
            onClick={(e) => {
              e.preventDefault();
              navigate('/clients');
              setOpen(false);
            }}
          >
            Danışanlar
          </a>
          {(user.role === 'ADMIN' || user.role === 'ORG_ADMIN') && (
            <a
              href="/admin"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin');
                setOpen(false);
              }}
            >
              Yönetim
            </a>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8 }}>
            <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {user.firstName} {user.lastName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ROLE_LABEL[user.role]}</div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>
              Çıkış
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
