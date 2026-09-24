import { useEffect, useState, lazy, Suspense } from 'react';
import { useRoute, navigate } from './router';
import type { AuthenticatedUser } from '../auth/authTypes';
import { getSession, onAuthChange, signOut, userFromSession } from '../auth/supabaseAuth';
import { supabaseConfig } from '../auth/supabaseClient';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { ConnectivityBanner } from '../components/layout/ConnectivityBanner';
import { ToastStack } from '../components/ui/Toast';

// PHASE-09: lazy routes for performance — manualChunks vendor/supabase/zod/rhf
const LoginPage = lazy(() => import('./routes/Login').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./routes/Dashboard').then((m) => ({ default: m.DashboardPage })));
const ClientsPage = lazy(() => import('./routes/Clients').then((m) => ({ default: m.ClientsPage })));
const ClientNewPage = lazy(() => import('./routes/Clients').then((m) => ({ default: m.ClientNewPage })));
const ClientFilePage = lazy(() => import('./routes/Clients').then((m) => ({ default: m.ClientFilePage })));
const AdminPage = lazy(() => import('./routes/Admin').then((m) => ({ default: m.AdminPage })));
const SettingsPage = lazy(() => import('./routes/Admin').then((m) => ({ default: m.SettingsPage })));
const AuditPage = lazy(() => import('./routes/Admin').then((m) => ({ default: m.AuditPage })));
const NotFoundPage = lazy(() => import('./routes/Admin').then((m) => ({ default: m.NotFoundPage })));
const AppointmentsPage = lazy(() => import('./routes/Appointments').then((m) => ({ default: m.AppointmentsPage })));
const TasksPage = lazy(() => import('./routes/Tasks').then((m) => ({ default: m.TasksPage })));

type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'signed_in'; user: AuthenticatedUser };

function PageLoader() {
  return (
    <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
      Yükleniyor…
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        if (!user) setAuth({ status: 'signed_out' });
        else setAuth({ status: 'signed_in', user });
      } catch {
        if (!cancelled) setAuth({ status: 'signed_out' });
      }
    }
    hydrate();
    if (!supabaseConfig.configured) return;
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

  if (auth.status === 'loading') {
    return (
      <div className="auth-page">
        <main className="auth-shell">
          <div className="kicker"><span className="kicker-dot" /> Psikolog Platformu</div>
          <h1 style={{ marginTop: 16 }}>Yükleniyor…</h1>
          <p className="auth-sub">Oturum doğrulanıyor</p>
        </main>
        <ToastStack />
      </div>
    );
  }

  if (auth.status === 'signed_out') {
    if (route.page === 'not_found') return <Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>;
    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <LoginPage onSuccess={() => navigate('/dashboard', { replace: true })} />
        </Suspense>
        <ToastStack />
      </>
    );
  }

  const user = auth.user;

  if (route.page === 'login') {
    navigate('/dashboard', { replace: true });
  }

  if ((route.page === 'admin' || route.page === 'audit') && user.role !== 'ADMIN' && user.role !== 'ORG_ADMIN') {
    return (
      <div className="auth-page">
        <main className="auth-shell">
          <div className="empty-state-card">
            <div className="empty-state-icon">!</div>
            <h4>Erişim Reddedildi</h4>
            <p>Bu sayfaya sadece Admin erişebilir.</p>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/dashboard')}>Dashboard'a Dön</button>
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
      content = <ClientNewPage user={user} />;
      break;
    case 'client':
      content = <ClientFilePage id={route.id} tab={route.tab} user={user} />;
      break;
    case 'appointments':
      content = <AppointmentsPage />;
      break;
    case 'tasks':
      content = <TasksPage />;
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
        <main className="main" id="main-content" tabIndex={-1}>
          <div className="main-inner">
            <Suspense fallback={<PageLoader />}>{content}</Suspense>
          </div>
        </main>
      </div>

      <button
        type="button"
        className="btn btn--ghost"
        style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 19, borderRadius: 'var(--radius-pill)', boxShadow: 'var(--shadow-md)', display: 'none' }}
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Menüyü aç/kapat"
      >
        ☰
      </button>

      <ToastStack />
    </div>
  );
}
