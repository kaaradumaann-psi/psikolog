import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { AuthGate } from './components/AuthGate';
import type { AuthFlowOrigin } from './components/AuthGate';
import { DesignPreviewPage } from './components/DesignPreviewPage';
import { AdminPanel } from './components/AdminPanel';
import { CaseWorkspace } from './components/CaseWorkspace';
import { Dashboard } from './components/Dashboard';
import { ConnectivityBanner } from './components/ConnectivityBanner';
import { FaqPage } from './components/FaqPage';
import { FormKit } from './components/FormKit';
import { InfoPageShell } from './components/InfoPageShell';
import { MyRecordsPanel } from './components/MyRecordsPanel';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { ReportsPage } from './reports/ReportsPage';
import { RecordDetailPage } from './components/RecordDetailPage';
import { SourcesPage } from './components/SourcesPage';
import { SiteFooter } from './components/SiteFooter';
import { MobileNav } from './components/MobileNav';
import { TermsPage } from './components/TermsPage';
import { Icon } from './components/Icon';
import type { IconName } from './components/Icon';
import { formDefinition } from './form/layout';
import { SITE_URL } from './form/attribution';
import type { AuthenticatedUser } from './auth/authTypes';
import { supabaseConfig } from './auth/supabaseClient';
import { displayName } from './auth/userDisplay';
import { navigate, useRoute } from './router';
import type { AppRoute } from './router';

// Klinik Modül Bileşenleri
import { ClientListPage } from './components/clinical/ClientListPage';
import { ClientDetailPage } from './components/clinical/ClientDetailPage';
import { SoapSessionsPage } from './components/clinical/SoapSessionsPage';
import { AppointmentsPage } from './components/clinical/AppointmentsPage';
import { AssessmentHubPage } from './components/clinical/AssessmentHubPage';
import { BeckDepressionPage } from './components/clinical/BeckDepressionPage';
import { BeckAnxietyPage } from './components/clinical/BeckAnxietyPage';
import { Scl90Page } from './components/clinical/Scl90Page';
import { RapidScreeningPage } from './components/clinical/RapidScreeningPage';
import { ClinicalReportsPage } from './components/clinical/ClinicalReportsPage';

type Workspace =
  | 'home'
  | 'danisanlar'
  | 'seanslar'
  | 'testler'
  | 'case'
  | 'takvim'
  | 'raporlar'
  | 'form'
  | 'records'
  | 'admin';

type SignedInAppProps = { user: AuthenticatedUser; onLogout: () => void; flowOrigin: AuthFlowOrigin };

const TAB_PATH: Record<Workspace, string> = {
  home: '/',
  danisanlar: '/danisanlar',
  seanslar: '/seanslar',
  testler: '/testler',
  case: '/islem',
  takvim: '/takvim',
  raporlar: '/raporlar',
  form: '/form',
  records: '/kayitlar',
  admin: '/yonetim',
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
    case 'islem':
      return 'case';
    case 'takvim':
      return 'takvim';
    case 'raporlar':
      return 'raporlar';
    case 'form':
      return 'form';
    case 'kayitlar':
    case 'kayit':
      return 'records';
    case 'yonetim':
      return 'admin';
    default:
      return null;
  }
}

export default function App() {
  const route = useRoute();

  // Bilgi sayfaları (SSS, Gizlilik & KVKK, Kullanım Koşulları, Kaynakça):
  if (route.page === 'sss') {
    return (
      <InfoPageShell kicker="Yardım" title="Sıkça Sorulan Sorular" onBack={() => navigate('/')}>
        <FaqPage />
      </InfoPageShell>
    );
  }
  if (route.page === 'gizlilik') {
    return (
      <InfoPageShell kicker="Yasal" title="Gizlilik & KVKK Politikası" onBack={() => navigate('/')}>
        <PrivacyPolicyPage />
      </InfoPageShell>
    );
  }
  if (route.page === 'kullanim') {
    return (
      <InfoPageShell kicker="Yasal" title="Kullanım Koşulları" onBack={() => navigate('/')}>
        <TermsPage />
      </InfoPageShell>
    );
  }
  if (route.page === 'kaynaklar') {
    return (
      <InfoPageShell kicker="Kaynaklar" title="Kaynakça" onBack={() => navigate('/')}>
        <SourcesPage />
      </InfoPageShell>
    );
  }

  // Önizleme rotası
  if (!supabaseConfig.configured && route.page === 'onizleme') {
    return <DesignPreviewPage onExit={() => navigate('/')} />;
  }

  // 404 — bilinmeyen rotalar
  if (route.page === 'bulunamadi') {
    return (
      <div className="auth-page">
        <main className="auth-shell">
          <div className="empty-state-card">
            <div className="empty-state-icon">
              <Icon name="alert" size={32} />
            </div>
            <h4>Sayfa Bulunamadı</h4>
            <p>Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
            <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/')}>
              Ana Sayfaya Dön
            </button>
          </div>
        </main>
        <SiteFooter compact />
      </div>
    );
  }

  return (
    <AuthGate>
      {(user, onLogout, flowOrigin) => <SignedInApp user={user} onLogout={onLogout} flowOrigin={flowOrigin} />}
    </AuthGate>
  );
}

function SignedInApp({ user, onLogout, flowOrigin }: SignedInAppProps) {
  const route = useRoute();

  // Rol bazlı rota koruması
  useEffect(() => {
    if (route.page === 'yonetim' && user.role !== 'ADMIN') {
      navigate('/', { replace: true });
    }
    if (route.page === 'kayitlar' && user.role === 'ADMIN') {
      navigate('/yonetim', { replace: true });
    }
  }, [route.page, user.role]);

  const workspace = resolveWorkspace(route);
  const [recordsTick, setRecordsTick] = useState(0);

  const tabs: Workspace[] =
    user.role === 'ADMIN'
      ? ['home', 'danisanlar', 'seanslar', 'testler', 'case', 'takvim', 'raporlar', 'form', 'admin']
      : ['home', 'danisanlar', 'seanslar', 'testler', 'case', 'takvim', 'raporlar', 'form', 'records'];

  const tabRefs = useRef<Partial<Record<Workspace, HTMLButtonElement | null>>>({});

  function activateTab(next: Workspace) {
    navigate(TAB_PATH[next]);
    tabRefs.current[next]?.focus();
  }

  function onTablistKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = Math.max(0, tabs.indexOf(workspace ?? 'home'));
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : event.key === 'ArrowRight' || event.key === 'ArrowDown'
            ? (current + 1) % tabs.length
            : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
              ? (current - 1 + tabs.length) % tabs.length
              : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    activateTab(tabs[nextIndex]!);
  }

  const tabLabel: Record<Workspace, string> = {
    home: 'Genel Bakış',
    danisanlar: 'Danışanlar',
    seanslar: 'Seanslar',
    testler: 'Testler',
    case: 'MMPI OMR',
    takvim: 'Takvim',
    raporlar: 'Raporlar',
    form: 'Form',
    records: 'Kayıtlar',
    admin: 'Yönetim',
  };

  const tabIcon: Record<Workspace, IconName> = {
    home: 'pulse',
    danisanlar: 'users',
    seanslar: 'clipboard',
    testler: 'activity',
    case: 'scan',
    takvim: 'calendar',
    raporlar: 'fileText',
    form: 'sheet',
    records: 'file',
    admin: 'shield',
  };

  const activeWorkspace = workspace;

  return (
    <div className="portal-layout">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-left">
            <a className="brand" href="/" aria-label="Psikolog Klinik Sistemi — Ana Sayfa">
              <span className="brand-mark">
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                  <path d="M9 3H3v6M17 3h6v6M23 17v6h-6M9 23H3v-6" stroke="currentColor" strokeWidth="2.2" />
                  <circle cx="10" cy="10" r="1.8" fill="currentColor" />
                  <circle cx="16" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="10" cy="16" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="16" cy="16" r="1.8" fill="currentColor" />
                </svg>
              </span>
              <div className="brand-text">
                <strong className="brand-title">Psikolog</strong>
                <span className="brand-subtitle">Klinik Değerlendirme</span>
              </div>
            </a>

            <nav className="workspace-tabs" role="tablist" aria-label="Çalışma alanı" onKeyDown={onTablistKeyDown}>
              {tabs.map(tab => (
                <button
                  type="button"
                  role="tab"
                  key={tab}
                  id={`tab-${tab}`}
                  ref={element => {
                    tabRefs.current[tab] = element;
                  }}
                  aria-selected={activeWorkspace === tab}
                  aria-controls={`panel-${tab}`}
                  tabIndex={activeWorkspace === tab ? 0 : -1}
                  onClick={() => activateTab(tab)}
                  className={`portal-tab ${activeWorkspace === tab ? 'active' : ''}`}
                >
                  <Icon name={tabIcon[tab]} size={16} />
                  <span>{tabLabel[tab]}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="header-user">
            <a
              className="home-site-link"
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Ana site: halilkaraduman.com.tr"
            >
              <span>halilkaraduman.com.tr</span>
              <Icon name="external" size={13} />
            </a>
            <div className="user-profile-summary">
              <div className="user-avatar-circle">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </div>
              <div className="user-info-text">
                <strong className="user-full-name">{displayName(user)}</strong>
                <span className={`user-role-badge ${user.role === 'ADMIN' ? 'badge-admin' : 'badge-psy'}`}>
                  {user.role === 'ADMIN' ? 'Yönetici' : 'Uzman Psikolog'}
                </span>
              </div>
            </div>
            <button type="button" className="btn-logout" onClick={onLogout} title="Oturumu Kapat">
              <span>Çıkış</span>
            </button>
          </div>

          {/* Mobil Menü */}
          <MobileNav
            items={tabs.map(tab => ({
              id: tab,
              label: tabLabel[tab],
              icon: tabIcon[tab],
              active: activeWorkspace === tab,
              onSelect: () => activateTab(tab),
            }))}
            user={user}
            onLogout={onLogout}
          />
        </div>
      </header>

      <ConnectivityBanner />

      <main className="app-main" id="main">
        {/* Danışan Detay Sayfası */}
        {route.page === 'danisan' && <ClientDetailPage clientId={route.id} />}

        {/* Danışan Listesi */}
        {route.page === 'danisanlar' && <ClientListPage />}

        {/* SOAP Seans Notları Sayfası */}
        {route.page === 'seanslar' && <SoapSessionsPage />}

        {/* Randevu & Takvim Sayfası */}
        {route.page === 'takvim' && <AppointmentsPage />}

        {/* Test Bataryası Merkezi */}
        {route.page === 'testler' && <AssessmentHubPage />}

        {/* Beck Depresyon Envanteri */}
        {route.page === 'beck_depresyon' && <BeckDepressionPage />}

        {/* Beck Anksiyete Envanteri */}
        {route.page === 'beck_anksiyete' && <BeckAnxietyPage />}

        {/* SCL-90-R */}
        {route.page === 'scl90' && <Scl90Page />}

        {/* Hızlı Tarama (GAD-7 & PHQ-9) */}
        {route.page === 'tarama' && <RapidScreeningPage />}

        {/* Klinik Raporlar */}
        {route.page === 'raporlar' && (
          route.id ? (
            <ReportsPage key={`${route.id}/${route.reportId || ''}`} recordId={route.id} reportId={route.reportId} viewer={user} />
          ) : (
            <ClinicalReportsPage />
          )
        )}

        {/* MMPI Kayıt Detayı */}
        {route.page === 'kayit' && (
          <RecordDetailPage
            recordId={route.id}
            viewer={user}
            onBack={() => navigate(user.role === 'ADMIN' ? '/yonetim' : '/kayitlar')}
          />
        )}

        {/* Ana Dashboard */}
        {route.page === 'home' && (
          <div className="dashboard-wrapper">
            <Dashboard user={user} />
          </div>
        )}

        {/* MMPI İşlem & OMR */}
        {route.page === 'islem' && (
          <div role="tabpanel" id="panel-case" aria-labelledby="tab-case" className="tab-content-active">
            <CaseWorkspace
              key="case-workspace"
              definition={formDefinition}
              actor={user}
              flowOrigin={flowOrigin}
              landing={false}
              onSaved={() => setRecordsTick(tick => tick + 1)}
            />
          </div>
        )}

        {/* Form Kit */}
        {route.page === 'form' && (
          <div role="tabpanel" id="panel-form" aria-labelledby="tab-form" className="tab-content-active">
            <FormKit />
          </div>
        )}

        {/* MMPI Kayıtlarım */}
        {route.page === 'kayitlar' && user.role === 'PSYCHOLOG' && (
          <div role="tabpanel" id="panel-records" aria-labelledby="tab-records" className="tab-content-active">
            <MyRecordsPanel key={recordsTick} />
          </div>
        )}

        {/* Yönetim Paneli */}
        {route.page === 'yonetim' && user.role === 'ADMIN' && (
          <div role="tabpanel" id="panel-admin" aria-labelledby="tab-admin" className="tab-content-active">
            <AdminPanel admin={user} />
          </div>
        )}
      </main>

      <SiteFooter
        onNewEntry={() => {
          navigate('/islem');
        }}
      />
    </div>
  );
}
