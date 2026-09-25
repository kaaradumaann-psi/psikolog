import { useEffect, useState } from 'react';
import { consumeMmpiSso } from '../auth/ssoConsume';
import { navigate } from '../router';
import { Icon } from './Icon';
import { SiteFooter } from './SiteFooter';

export function SsoConsumePage() {
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') ?? '';
    const state = params.get('state') ?? '';
    if (window.location.search) {
      window.history.replaceState(null, '', '/sso');
    }
    if (!code || !state) {
      setError('SSO kodu eksik veya süresi doldu.');
      return;
    }
    void consumeMmpiSso(code, state)
      .then(() => navigate('/', { replace: true }))
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : 'MMPI oturumu kurulamadı.');
      });
  }, []);

  return (
    <div className="auth-page">
      <main className="auth-shell">
        <div className="auth-card auth-loading" role="status">
          <Icon name="scan" size={24} />
          {error ? <p role="alert">{error}</p> : <p>Oturum doğrulanıyor, lütfen bekleyin...</p>}
          {error && (
            <a className="btn-secondary btn-sm" href="/">
              Giriş ekranı
            </a>
          )}
        </div>
      </main>
      <SiteFooter compact />
    </div>
  );
}
