import { useEffect, useState } from 'react';
import { useRoute, navigate } from './router';
import type { AuthenticatedUser } from '../auth/authTypes';
import { getSession, onAuthChange, signOut, userFromSession } from '../auth/supabaseAuth';
import { supabaseConfig } from '../auth/supabaseClient';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { ConnectivityBanner } from '../components/layout/ConnectivityBanner';
import { ToastStack } from '../components/ui/Toast';
import { LoginPage } from './routes/Login';
import { DashboardPage } from './routes/Dashboard';
import { ClientsPage, ClientNewPage, ClientFilePage } from './routes/Clients';
import { AdminPage, SettingsPage, AuditPage, NotFoundPage } from './routes/Admin';

type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'signed_in'; user: AuthenticatedUser };

export default function App() {
  const route = useRoute();
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Session hydration — MMPI AuthGate pattern: race protection
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!supabaseConfig.configured) {
        setAuth({ status: 'signed_out' });
        return;
      }
      try {
        const session = await getSession();
        if (cancelled) return;
        if (!session) {
          setAuth({ status: 'signed_out' });
          return;
        }
        const user = await userFromSession(session);
        if (cancelled) return;
        if (!user) {
          setAuth({ status: 'signed_out' });
        } else {
          setAuth({ status: 'signed_in', user });
        }
      } catch {
        if (!cancelled) setAuth({ status: 'signed_out' });
      }
    }

    hydrate();

    if (!supabaseConfig.configured) return;

    // onAuthChange — new login vs existing session
    const { data: sub } = onAuthChange(async (_event, session) => {
      if (cancelled) return;
      try {
        const user = await userFromSession(session);
        if (cancelled) return;
        if (!user) setAuth({ status: 'signed_out' });
        else setAuth({ status: 'signed_in', user });
      } catch {
        if (!cancelled) setAuth({ status: 'signed_out' });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      setAuth({ status: 'signed_out' });
      navigate('/login', { replace: true });
    }
  };

  // Loading
  if (auth.status === 'loading') {
    return (
      <div className="auth-page">
        <main className="auth-shell">
          <div className="kicker">
            <span className="kicker-dot" /> Psikolog Platformu
          </div>
          <h1 style={{ marginTop: 16 }}>Yükleniyor…</h1>
          <p className="auth-sub">Oturum doğrulanıyor</p>
        </main>
        <ToastStack />
      </div>
    );
  }

  // Signed out → login (except not_found)
  if (auth.status === 'signed_out') {
    if (route.page === 'not_found') return <NotFoundPage />;
    return (
      <>
        <LoginPage
          onSuccess={() => {
            navigate('/dashboard', { replace: true });
          }}
        />
        <ToastStack />
      </>
    );
  }

  // Signed in
  const user = auth.user;

  // Role-based redirect: login page → dashboard
  if (route.page === 'login') {
    navigate('/dashboard', { replace: true });
  }

  // Admin only pages
  if (
    (route.page === 'admin' || route.page === 'audit') &&
    user.role !== 'ADMIN' &&
    user.role !== 'ORG_ADMIN'
  ) {
    return (
      <div className="auth-page">
        <main className="auth-shell">
          <div className="empty-state-card">
            <div className="empty-state-icon">!</div>
            <h4>Erişim Reddedildi</h4>
            <p>Bu sayfaya sadece Admin erişebilir.</p>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/dashboard')}>
              Dashboard'a Dön
            </button>
          </div>
        </main>
        <ToastStack />
      </div>
    );
  }

  let content: React.ReactNode;
  switch (route.page) {
    case 'dashboard':
      content = <DashboardPage user={user} />;
      break;
    case 'clients':
      content = <ClientsPage />;
      break;
    case 'client_new':
      content = <ClientNewPage />;
      break;
    case 'client':
      content = <ClientFilePage id={route.id} tab={route.tab} />;
      break;
    case 'settings':
      content = <SettingsPage />;
      break;
    case 'admin':
      content = <AdminPage />;
      break;
    case 'audit':
      content = <AuditPage />;
      break;
    case 'login':
      content = <DashboardPage user={user} />;
      break;
    default:
      content = <NotFoundPage />;
  }

  return (
    <div>
      <Header user={user} onLogout={handleLogout} />
      <ConnectivityBanner />
      <div className="app-shell">
        <Sidebar user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main">
          <div className="main-inner">{content}</div>
        </main>
      </div>

      {/* Mobile sidebar toggle — visible ≤1024px via responsive.css */}
      <button
        type="button"
        className="btn btn--ghost"
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 19,
          borderRadius: 'var(--radius-pill)',
          boxShadow: 'var(--shadow-md)',
          display: 'none', // will be shown via CSS if needed, but keep for now
        }}
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Menü"
      >
        ☰
      </button>

      <ToastStack />
    </div>
  );
}
