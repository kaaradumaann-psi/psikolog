import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { AuthenticatedUser } from './auth/authTypes';
import { displayName } from './auth/userDisplay';
import { supabaseConfig } from './auth/supabaseClient';
import { getSession, onAuthChange, signIn, signOut, userFromSession } from './auth/supabaseAuth';
import { AppointmentsPage } from './components/clinical/AppointmentsPage';
import { AssessmentHubPage } from './components/clinical/AssessmentHubPage';
import { BeckAnxietyPage } from './components/clinical/BeckAnxietyPage';
import { BeckDepressionPage } from './components/clinical/BeckDepressionPage';
import { ClientDetailPage } from './components/clinical/ClientDetailPage';
import { ClientListPage } from './components/clinical/ClientListPage';
import { ClinicalReportsPage } from './components/clinical/ClinicalReportsPage';
import { RapidScreeningPage } from './components/clinical/RapidScreeningPage';
import { Scl90Page } from './components/clinical/Scl90Page';
import { SoapSessionsPage } from './components/clinical/SoapSessionsPage';
import { ConnectivityBanner } from './components/ConnectivityBanner';
import { Dashboard } from './components/Dashboard';
import { FaqPage } from './components/FaqPage';
import { Icon } from './components/Icon';
import type { IconName } from './components/Icon';
import { InfoPageShell } from './components/InfoPageShell';
import { MobileNav } from './components/MobileNav';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { AuditPage } from './components/practice/AuditPage';
import { SettingsPage } from './components/practice/SettingsPage';
import { TasksPage } from './components/practice/TasksPage';
import { SiteFooter } from './components/SiteFooter';
import { SourcesPage } from './components/SourcesPage';
import { TermsPage } from './components/TermsPage';
import { navigate, useRoute } from './router';
import type { AppRoute } from './router';
import { APP_NAME, SITE_URL } from './site';

type Workspace = 'home' | 'danisanlar' | 'seanslar' | 'testler' | 'takvim' | 'raporlar' | 'gorevler' | 'ayarlar';

const LOCAL_USER: AuthenticatedUser = {
  id: 'local-psychologist',
  email: 'contact@halilkaraduman.com.tr',
  firstName: 'Halil',
  lastName: 'Karaduman',
  role: 'PSYCHOLOG',
  active: true,
  organizationId: null,
};

const TAB_PATH: Record<Workspace, string> = {
  home: '/',
  danisanlar: '/danisanlar',
  seanslar: '/seanslar',
  testler: '/testler',
  takvim: '/takvim',
  raporlar: '/raporlar',
  gorevler: '/gorevler',
  ayarlar: '/ayarlar',
};

function resolveWorkspace(route: AppRoute): Workspace | null {
  switch (route.page) {
    case 'home':
      return 'home';
    case 'danisanlar':
    case 'danisan':
      return 'danisanlar';
    case 'seanslar':
      return 'seanslar';
    case 'testler':
    case 'beck_depresyon':
    case 'beck_anksiyete':
    case 'scl90':
    case 'tarama':
      return 'testler';
    case 'takvim':
      return 'takvim';
    case 'raporlar':
      return 'raporlar';
    case 'gorevler':
      return 'gorevler';
    case 'ayarlar':
    case 'denetim':
      return 'ayarlar';
    default:
      return null;
  }
}

export default function App() {
  const route = useRoute();
  if (route.page === 'sss') {
    return <InfoPageShell kicker="Yardım" title="Sıkça sorulan sorular" onBack={() => navigate('/')}><FaqPage /></InfoPageShell>;
  }
  if (route.page === 'gizlilik') {
    return <InfoPageShell kicker="Yasal" title="Gizlilik ve KVKK" onBack={() => navigate('/')}><PrivacyPolicyPage /></InfoPageShell>;
  }
  if (route.page === 'kullanim') {
    return <InfoPageShell kicker="Yasal" title="Kullanım koşulları" onBack={() => navigate('/')}><TermsPage /></InfoPageShell>;
  }
  if (route.page === 'kaynaklar') {
    return <InfoPageShell kicker="Kaynaklar" title="Ölçek kaynakçası" onBack={() => navigate('/')}><SourcesPage /></InfoPageShell>;
  }
  if (route.page === 'bulunamadi') {
    return (
      <div className="auth-page">
        <main className="auth-shell">
          <div className="empty-state-card">
            <Icon name="alert" size={28} />
            <h4>Sayfa bulunamadı</h4>
            <p>Adres bu çalışma alanında yok.</p>
            <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/')}>Ana sayfa</button>
          </div>
        </main>
        <SiteFooter compact />
      </div>
    );
  }
  if (!supabaseConfig.configured) {
    return <WorkspaceShell user={LOCAL_USER} localMode onLogout={() => navigate('/')} />;
  }
  return <CloudGate />;
}

function CloudGate() {
  const [user, setUser] = useState<AuthenticatedUser | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSession()
      .then((session) => userFromSession(session))
      .then((next) => {
        if (!cancelled) setUser(next);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    const { data } = onAuthChange((_event, session) => {
      void userFromSession(session).then((next) => {
        if (!cancelled) setUser(next);
      });
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    try {
      const next = await signIn(String(data.get('email') || ''), String(data.get('password') || ''));
      setUser(next);
      navigate('/', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Giriş yapılamadı');
    }
  }

  if (user === undefined) {
    return (
      <div className="auth-page">
        <main className="auth-shell"><p>Oturum doğrulanıyor…</p></main>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="auth-page">
        <main className="auth-shell">
          <form className="auth-card" onSubmit={onSubmit}>
            <div className="auth-heading">
              <span className="auth-eyebrow">{APP_NAME}</span>
              <h1>Klinik çalışma alanı</h1>
              <p>Halka açık kayıt yoktur. Hesabınız yönetici tarafından açılır.</p>
            </div>
            <div className="form-group">
              <label htmlFor="email">E-posta</label>
              <input id="email" name="email" type="email" autoComplete="username" required />
            </div>
            <div className="form-group">
              <label htmlFor="password">Parola</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {error && <p style={{ color: 'var(--danger-ink)' }}>{error}</p>}
            <button type="submit" className="btn-primary auth-submit-btn">Giriş yap</button>
          </form>
        </main>
        <SiteFooter compact />
      </div>
    );
  }
  return (
    <WorkspaceShell
      user={user}
      localMode={false}
      onLogout={() => {
        void signOut().finally(() => navigate('/', { replace: true }));
      }}
    />
  );
}

function WorkspaceShell({ user, onLogout, localMode }: { user: AuthenticatedUser; onLogout: () => void; localMode: boolean }) {
  const route = useRoute();
  const [storageError, setStorageError] = useState<string | null>(null);
  useEffect(() => {
    const onError = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setStorageError(detail || 'Kayıt yazılamadı.');
    };
    window.addEventListener('psikolog:storage-error', onError);
    return () => window.removeEventListener('psikolog:storage-error', onError);
  }, []);
  const workspace = resolveWorkspace(route) ?? 'home';
  const tabs: Workspace[] = ['home', 'danisanlar', 'seanslar', 'testler', 'takvim', 'raporlar', 'gorevler', 'ayarlar'];
  const tabRefs = useRef<Partial<Record<Workspace, HTMLButtonElement | null>>>({});
  const tabLabel: Record<Workspace, string> = {
    home: 'Genel Bakış',
    danisanlar: 'Danışanlar',
    seanslar: 'Seanslar',
    testler: 'Testler',
    takvim: 'Takvim',
    raporlar: 'Raporlar',
    gorevler: 'Görevler',
    ayarlar: 'Ayarlar',
  };
  const tabIcon: Record<Workspace, IconName> = {
    home: 'pulse',
    danisanlar: 'users',
    seanslar: 'clipboard',
    testler: 'activity',
    takvim: 'calendar',
    raporlar: 'fileText',
    gorevler: 'list',
    ayarlar: 'shield',
  };

  function activateTab(next: Workspace) {
    navigate(TAB_PATH[next]);
    tabRefs.current[next]?.focus();
  }

  function onTablistKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = Math.max(0, tabs.indexOf(workspace));
    const nextIndex =
      event.key === 'Home' ? 0
      : event.key === 'End' ? tabs.length - 1
      : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (current + 1) % tabs.length
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (current - 1 + tabs.length) % tabs.length
      : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    activateTab(tabs[nextIndex]!);
  }

  const canAdmin = user.role === 'ADMIN' || user.role === 'ORG_ADMIN';

  return (
    <div className="portal-layout">
      <a className="skip-link" href="#main">Ana içeriğe atla</a>
      <header className="app-header">
        <div className="header-inner">
          <div className="header-left">
            <a className="brand" href="/" aria-label={`${APP_NAME} ana sayfa`}>
              <span className="brand-mark" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <path d="M9 3H3v6M17 3h6v6M23 17v6h-6M9 23H3v-6" stroke="currentColor" strokeWidth="2.2" />
                  <circle cx="10" cy="10" r="1.8" fill="currentColor" />
                  <circle cx="16" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="10" cy="16" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="16" cy="16" r="1.8" fill="currentColor" />
                </svg>
              </span>
              <div className="brand-text">
                <strong className="brand-title">{APP_NAME}</strong>
                <span className="brand-subtitle">Klinik çalışma alanı</span>
              </div>
            </a>
            <nav className="workspace-tabs" role="tablist" aria-label="Çalışma alanı" onKeyDown={onTablistKeyDown}>
              {tabs.map((tab) => (
                <button
                  type="button"
                  role="tab"
                  key={tab}
                  ref={(element) => { tabRefs.current[tab] = element; }}
                  aria-selected={workspace === tab}
                  tabIndex={workspace === tab ? 0 : -1}
                  className={`portal-tab ${workspace === tab ? 'active' : ''}`}
                  onClick={() => activateTab(tab)}
                >
                  <Icon name={tabIcon[tab]} size={16} />
                  <span>{tabLabel[tab]}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="header-user">
            <a className="home-site-link" href={SITE_URL} target="_blank" rel="noopener noreferrer">
              <span>halilkaraduman.com.tr</span>
              <Icon name="external" size={13} />
            </a>
            <div className="user-profile-summary">
              <div className="user-avatar-circle">{user.firstName.charAt(0)}{user.lastName.charAt(0)}</div>
              <div className="user-info-text">
                <strong className="user-full-name">{displayName(user)}</strong>
                <span className={`user-role-badge ${canAdmin ? 'badge-admin' : 'badge-psy'}`}>
                  {localMode ? 'Yerel çalışma alanı' : canAdmin ? 'Yönetici' : 'Uzman Psikolog'}
                </span>
              </div>
            </div>
            {!localMode && (
              <button type="button" className="btn-logout" onClick={onLogout}>Çıkış</button>
            )}
          </div>
          <MobileNav
            items={tabs.map((tab) => ({
              id: tab,
              label: tabLabel[tab],
              icon: tabIcon[tab],
              active: workspace === tab,
              onSelect: () => activateTab(tab),
            }))}
            user={user}
            onLogout={onLogout}
            showLogout={!localMode}
          />
        </div>
      </header>
      <ConnectivityBanner />
      {storageError && <p role="alert" style={{ margin: '12px 16px 0', color: 'var(--danger-ink)' }}>{storageError}</p>}
      <main className="app-main" id="main">
        {route.page === 'danisan' && <ClientDetailPage clientId={route.id} />}
        {route.page === 'danisanlar' && <ClientListPage />}
        {route.page === 'seanslar' && <SoapSessionsPage />}
        {route.page === 'takvim' && <AppointmentsPage />}
        {route.page === 'testler' && <AssessmentHubPage />}
        {route.page === 'beck_depresyon' && <BeckDepressionPage />}
        {route.page === 'beck_anksiyete' && <BeckAnxietyPage />}
        {route.page === 'scl90' && <Scl90Page />}
        {route.page === 'tarama' && <RapidScreeningPage />}
        {route.page === 'raporlar' && <ClinicalReportsPage />}
        {route.page === 'gorevler' && <TasksPage />}
        {route.page === 'ayarlar' && <SettingsPage canAdmin={canAdmin} />}
        {route.page === 'denetim' && <AuditPage />}
        {route.page === 'home' && (
          <div className="dashboard-wrapper">
            <Dashboard user={user} />
          </div>
        )}
      </main>
      <SiteFooter onNewEntry={() => navigate('/seanslar')} />
    </div>
  );
}
