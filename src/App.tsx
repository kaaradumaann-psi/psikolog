import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
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
import { APP_NAME } from './site';

type Workspace = 'home' | 'danisanlar' | 'seanslar' | 'testler' | 'takvim' | 'raporlar' | 'gorevler' | 'ayarlar';

type NavItem = { id: Workspace; label: string; icon: IconName; path: string };
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Çalışma alanı',
    items: [
      { id: 'home', label: 'Genel bakış', icon: 'layers', path: '/' },
      { id: 'danisanlar', label: 'Danışanlar', icon: 'users', path: '/danisanlar' },
      { id: 'takvim', label: 'Takvim', icon: 'calendar', path: '/takvim' },
      { id: 'seanslar', label: 'Seanslar', icon: 'clipboard', path: '/seanslar' },
    ],
  },
  {
    label: 'Klinik araçlar',
    items: [
      { id: 'testler', label: 'Değerlendirmeler', icon: 'activity', path: '/testler' },
      { id: 'raporlar', label: 'Raporlar', icon: 'fileText', path: '/raporlar' },
      { id: 'gorevler', label: 'Görevler', icon: 'checkCircle', path: '/gorevler' },
      { id: 'ayarlar', label: 'Ayarlar', icon: 'shield', path: '/ayarlar' },
    ],
  },
];

function BrandMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <text x="50%" y="60%" dominantBaseline="middle" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize="22" fontWeight="400" fill="#ffffff">Ψ</text>
      <circle cx="25.2" cy="6.6" r="2.4" fill="#0a84ff" stroke="#ffffff" strokeWidth="0.7" />
    </svg>
  );
}

const LOCAL_USER: AuthenticatedUser = {
  id: 'local-psychologist',
  email: 'contact@halilkaraduman.com.tr',
  firstName: 'Halil',
  lastName: 'Karaduman',
  role: 'PSYCHOLOG',
  active: true,
  organizationId: null,
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
        <main className="auth-shell">
          <div className="auth-card auth-loading" role="status">
            <span className="auth-brand-mark"><BrandMark /></span>
            <p>Oturum doğrulanıyor…</p>
          </div>
        </main>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="auth-page">
        <main className="auth-shell">
          <div className="auth-layout">
            <div className="auth-intro">
              <span className="auth-intro-kicker">UZMANLAR İÇİN KLİNİK ALAN</span>
              <h2>Her görüşmeye<br /><em>hazır gelin.</em></h2>
              <p>Danışan dosyaları, seans notları ve ölçüm izlemi; günlük klinik akışınız için tek bir çalışma alanında.</p>
              <span className="auth-intro-foot"><Icon name="shield" size={17} /> Yalnızca yetkili hesaplarla erişim</span>
            </div>
            <form className="auth-card" onSubmit={onSubmit}>
              <div className="auth-brand">
                <span className="auth-brand-mark"><BrandMark /></span>
                <div>
                  <strong>{APP_NAME}</strong>
                  <small>Klinik çalışma alanı</small>
                </div>
              </div>
              <div className="auth-heading">
                <h1>Hoş geldiniz.</h1>
                <p>Çalışma alanınıza devam etmek için hesabınızla giriş yapın.</p>
              </div>
              <div className="form-group">
                <label htmlFor="email">E-posta</label>
                <input id="email" name="email" type="email" autoComplete="username" required />
              </div>
              <div className="form-group">
                <label htmlFor="password">Parola</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button type="submit" className="btn-primary auth-submit-btn">Giriş yap <Icon name="arrowRight" size={16} /></button>
              <p className="auth-card-note">Halka açık kayıt yoktur. Hesabınız yönetici tarafından açılır.</p>
            </form>
          </div>
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
  const activeItem = NAV_GROUPS.flatMap((group) => group.items).find((item) => item.id === workspace);
  const canAdmin = user.role === 'ADMIN' || user.role === 'ORG_ADMIN';
  const roleLabel = localMode ? 'Yerel çalışma alanı' : canAdmin ? 'Yönetici' : 'Uzman psikolog';

  return (
    <div className="portal-layout">
      <a className="skip-link" href="#main">Ana içeriğe atla</a>
      <aside className="workspace-sidebar" aria-label="Çalışma alanı gezinmesi">
        <a className="brand sidebar-brand" href="/" aria-label={`${APP_NAME} ana sayfa`}>
          <span className="brand-mark" aria-hidden="true"><BrandMark /></span>
          <span className="brand-text">
            <strong className="brand-title">{APP_NAME}</strong>
            <span className="brand-subtitle">Klinik çalışma alanı</span>
          </span>
        </a>
        <div className="sidebar-nav-wrap">
          {NAV_GROUPS.map((group) => (
            <nav className="sidebar-nav" aria-label={group.label} key={group.label}>
              <span className="sidebar-label">{group.label}</span>
              {group.items.map((item) => (
                <a
                  key={item.id}
                  href={item.path}
                  className={`sidebar-link${workspace === item.id ? ' is-current' : ''}`}
                  aria-current={workspace === item.id ? 'page' : undefined}
                >
                  <Icon name={item.icon} size={19} />
                  <span>{item.label}</span>
                  {workspace === item.id && <span className="sidebar-current-dot" aria-hidden="true" />}
                </a>
              ))}
            </nav>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-privacy">
            <span className="sidebar-privacy-icon"><Icon name="shield" size={18} /></span>
            <strong>{localMode ? 'Yerel çalışma alanı' : 'Bulut hesabı açık'}</strong>
            <p>{localMode ? 'Kayıtlar bu tarayıcıda tutulur ve şifrelenmez. Düzenli yedek alın.' : 'Yerel klinik kayıtlar bu cihazda tutulur. Hesap ayarlarınızı kontrol edin.'}</p>
            <a href="/ayarlar">Ayarları aç <Icon name="arrowRight" size={14} /></a>
          </div>
          <span className="sidebar-version">PSİKOLOG · KLİNİK ÇALIŞMA ALANI</span>
        </div>
      </aside>

      <div className="workspace-content">
        <header className="app-header">
          <div className="header-inner">
            <a className="brand header-brand" href="/" aria-label={`${APP_NAME} ana sayfa`}>
              <span className="brand-mark" aria-hidden="true"><BrandMark /></span>
              <span className="brand-text">
                <strong className="brand-title">{APP_NAME}</strong>
                <span className="brand-subtitle">Klinik çalışma alanı</span>
              </span>
            </a>
            <div className="header-current">
              <span>Çalışma alanı <Icon name="right" size={13} /></span>
              <strong>{activeItem?.label}</strong>
            </div>
            <div className="header-user">
              <div className="user-profile-summary">
                <div className="user-avatar-circle" aria-hidden="true">{user.firstName.charAt(0)}{user.lastName.charAt(0)}</div>
                <div className="user-info-text">
                  <strong className="user-full-name">{displayName(user)}</strong>
                  <span className={`user-role-badge ${canAdmin ? 'badge-admin' : 'badge-psy'}`}>{roleLabel}</span>
                </div>
              </div>
              {!localMode && <button type="button" className="btn-logout" onClick={onLogout}>Çıkış</button>}
            </div>
            <MobileNav
              items={NAV_GROUPS.flatMap((group) => group.items).map((item) => ({
                id: item.id,
                label: item.label,
                icon: item.icon,
                active: workspace === item.id,
                onSelect: () => navigate(item.path),
              }))}
              user={user}
              onLogout={onLogout}
              showLogout={!localMode}
            />
          </div>
        </header>
        <ConnectivityBanner />
        {storageError && <p className="shell-alert" role="alert">{storageError}</p>}
        <main className="app-main" id="main" tabIndex={-1}>
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
          {route.page === 'home' && <Dashboard user={user} />}
        </main>
        <SiteFooter onNewEntry={() => navigate('/seanslar')} />
      </div>
    </div>
  );
}
