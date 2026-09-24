import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { AuthenticatedUser } from '../auth/authTypes';
import { getSession, onAuthChange, signIn, signOut, userFromSession } from '../auth/supabaseAuth';
import { supabase, supabaseConfig } from '../auth/supabaseClient';
import { navigate } from '../router';
import { SITE_LABEL, SITE_URL } from '../form/attribution';
import { Icon } from './Icon';
import { SiteFooter } from './SiteFooter';

/**
 * Bu yüklemede kullanıcı oturumunun nasıl kurulduğunu ayırt eder:
 *  - 'session' — zaten var olan oturumun hydrate edilmesi (F5 / aynı sekme yenileme).
 *  - 'signin'  — bu sekmede kullanıcının açıkça giriş yapması.
 *
 * Bu ayrım, "yarım kalan iş" davranışını doğru kurmak için gereklidir:
 * aynı oturumda F5 kaldığın yeri koruyabilir; ama YENİ bir giriş her zaman
 * Landing'e düşmeli ve persisted taslak otomatik açılmamalıdır.
 */
export type AuthFlowOrigin = 'session' | 'signin';

export function AuthGate({ children }: { children: (user: AuthenticatedUser, onLogout: () => void, flowOrigin: AuthFlowOrigin) => ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [flowOrigin, setFlowOrigin] = useState<AuthFlowOrigin>('session');
  // Profile hydration is asynchronous. Invalidate older requests when logout, token
  // refresh, or a newer session event arrives so a late response cannot restore a
  // user after the UI has already signed out.
  const authRequest = useRef(0);
  const signInPending = useRef(false);

  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    let alive = true;
    async function hydrate() {
      const requestId = ++authRequest.current;
      try {
        const session = await getSession();
        const profile = await userFromSession(session);
        if (alive && requestId === authRequest.current) { setUser(profile); setError(''); }
      } catch (cause) {
        if (alive && requestId === authRequest.current) {
          setError(cause instanceof Error ? cause.message : 'Kullanıcı oturumu doğrulanamadı.');
        }
      } finally {
        if (alive && requestId === authRequest.current) setChecking(false);
      }
    }
    void hydrate();
    const { data } = onAuthChange((event, session) => {
      // A visible sign-in event can race with the signIn() promise below. Capture
      // its origin so the callback cannot turn a new login into a resumable session.
      const explicitSignIn = signInPending.current && event === 'SIGNED_IN';
      const requestId = ++authRequest.current;
      if (explicitSignIn && alive) setFlowOrigin('signin');
      if (!session) {
        if (alive) { setUser(null); setError(''); setChecking(false); }
        return;
      }
      window.setTimeout(() => {
        void userFromSession(session).then(profile => {
          if (alive && requestId === authRequest.current) {
            setUser(profile);
            setError('');
            setChecking(false);
            if (explicitSignIn && window.location.pathname.replace(/\/+$/, '') !== '') {
              navigate('/', { replace: true });
            }
          }
        }).catch(cause => {
          if (alive && requestId === authRequest.current) {
            setUser(null);
            setError(cause instanceof Error ? cause.message : 'Kullanıcı yetkisi doğrulanamadı.');
            setChecking(false);
          }
        });
      }, 0);
    });
    return () => { alive = false; authRequest.current++; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user || !supabase) return;
    let alive = true;
    const validate = async () => {
      try {
        const session = await getSession();
        const profile = await userFromSession(session);
        if (!profile && alive) setUser(null);
      } catch {
        if (alive) setUser(null);
      }
    };
    const interval = window.setInterval(() => { void validate(); }, 60_000);
    // Dinleyiciye async fonksiyon verilmez: reddedilen bir Promise "unhandled rejection"
    // üretir (setUser içinde bile hata olsa yakalanmaz). Sarmalayıp void'liyoruz.
    const onFocus = () => { void validate(); };
    window.addEventListener('focus', onFocus);
    return () => { alive = false; window.clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [user]);

  async function handleSignIn(email: string, password: string) {
    const requestId = ++authRequest.current;
    signInPending.current = true;
    try {
      const profile = await signIn(email, password);
      // A logout/session replacement may have happened while Supabase was resolving
      // the password sign-in. Do not let that late result repopulate the workspace.
      if (requestId !== authRequest.current) return;
      setUser(profile);
      setError('');
      // Yeni giriş = her zaman Landing. Olası eski bir rota/iç ekran URL'de kalmışsa
      // yerine yaz (replace) ki Back/Sıradaki çalışmalar Landing'den başlasın.
      setFlowOrigin('signin');
      if (window.location.pathname.replace(/\/+$/, '') !== '') {
        navigate('/', { replace: true });
      }
    } finally {
      signInPending.current = false;
    }
  }

  if (!supabaseConfig.configured) return <AuthPageShell><SystemSetupScreen /></AuthPageShell>;
  if (checking) {
    return (
      <AuthPageShell>
        <main className="auth-shell">
          <div className="auth-card auth-loading">
            <div className="spinner" />
            <p>Oturum doğrulanıyor, lütfen bekleyin...</p>
          </div>
        </main>
      </AuthPageShell>
    );
  }
  if (user) {
    return (
      <>
        {children(user, () => {
          authRequest.current++;
          signInPending.current = false;
          void signOut().catch(() => {});
          setUser(null);
        }, flowOrigin)}
      </>
    );
  }
  return (
    <AuthPageShell>
      <AuthScreen onSignIn={handleSignIn} error={error} />
    </AuthPageShell>
  );
}

/**
 * Giriş/kurulum ekranlarını sitenin tam alt bilgisiyle sarmalar: SSS, Gizlilik
 * & KVKK, Kullanım Koşulları ve Kaynakça sayfaları oturum açmadan da
 * okunabilir (sitenin her ekranında aynı alt bilgi görünür).
 */
function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      {children}
      <SiteFooter compact />
    </div>
  );
}

function SystemSetupScreen() {
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="config-title">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">
            <Icon name="scan" size={24} />
          </span>
          <div>
            <strong>MMPI-566</strong>
            <small>Uzman çalışma alanı</small>
          </div>
        </div>
          <div className="auth-heading">
            <p className="auth-eyebrow">Kurulum</p>
            <h1 id="config-title">Bağlantı gerekli</h1>
            <p>VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlayın.</p>
          </div>
        <div className="status-banner info-banner" role="alert">
          <Icon name="alert" size={18} />
          <span>Güvenlik gereği yalnızca yayınlanabilir erişim anahtarını yapılandırın.</span>
        </div>
        <div className="auth-setup-links">
          <p>Bağlantı kurulmadan da sonuç ekranlarının tasarımını örnek veriyle inceleyebilirsiniz.</p>
          <a className="btn-secondary btn-sm auth-setup-preview" href="/onizleme">
            <Icon name="scan" size={15} />
            <span>Tasarım önizlemesini aç</span>
          </a>
          <a
            className="auth-site-return"
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Ana siteye dön"
          >
            <Icon name="external" size={14} />
            <span>Ana siteye dön: {SITE_LABEL}</span>
          </a>
        </div>
      </section>
    </main>
  );
}

type AuthScreenProps = { onSignIn: (email: string, password: string) => Promise<void>; error: string };

function AuthScreen({ onSignIn, error: externalError }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSignIn(email, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Giriş yapılamadı. E-posta veya şifrenizi kontrol edin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card-wrapper">
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-brand">
            <span className="auth-brand-mark" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 26 26" fill="none">
                <path d="M9 3H3v6M17 3h6v6M23 17v6h-6M9 23H3v-6" stroke="currentColor" strokeWidth="2.2" />
                <circle cx="10" cy="10" r="1.8" fill="currentColor" />
                <circle cx="16" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="10" cy="16" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="16" cy="16" r="1.8" fill="currentColor" />
              </svg>
            </span>
            <div>
              <strong>MMPI-566</strong>
              <small>Uzman çalışma alanı</small>
            </div>
          </div>

          <div className="auth-heading">
            <h1 id="auth-title">Giriş</h1>
            <p>Yetkili uzman hesabı.</p>
          </div>

          {(error || externalError) && (
            <div className="status-banner error-banner" role="alert">
              <Icon name="alert" size={18} />
              <span>{error || externalError}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={submit}>
            <div className="form-group">
              <label>E-posta Adresi</label>
              <input
                required
                type="email"
                placeholder="uzman@kurum.com"
                value={email}
                onChange={event => setEmail(event.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label>Şifre</label>
              <input
                required
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button className="btn-primary auth-submit-btn" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <div className="spinner-inline" />
                  <span>Giriş Yapılıyor...</span>
                </>
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <Icon name="arrowRight" size={16} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer-help">
            <Icon name="shield" size={16} />
            <p>
              Hesabınız yoksa veya şifrenizi unuttuysanız lütfen kurum yöneticiniz (Admin) ile iletişime geçiniz.
            </p>
          </div>

          <a
            className="auth-site-return"
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Ana siteye dön"
          >
            <Icon name="external" size={14} />
            <span>Ana siteye dön: {SITE_LABEL}</span>
          </a>
        </section>
      </div>
    </main>
  );
}
