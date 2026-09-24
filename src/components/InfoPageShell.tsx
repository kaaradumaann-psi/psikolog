import type { MouseEvent, ReactNode } from 'react';
import { Icon } from './Icon';
import { SiteFooter } from './SiteFooter';
import { navigate } from '../router';

type InfoPageShellProps = {
  /** Üst şeritteki sayfa etiketi (kicker). */
  kicker: string;
  title: string;
  /** "Geri dön" eylemi — oturum açıkken çalışma alanına, değilse kurulum ekranına döner. */
  onBack: () => void;
  children: ReactNode;
};

/**
 * Bilgi sayfası kabuğu (SSS, Gizlilik & KVKK, Kullanım Koşulları, Kaynakça):
 * üst şerit + tam sayfa içerik + sitenin tam alt bilgisi. Oturumdan bağımsız
 * açılır; giriş ekranı, kurulum ekranı ve çalışma alanından aynı görünür.
 */
export function InfoPageShell({ kicker, title, onBack, children }: InfoPageShellProps) {
  return (
    <div className="info-shell">
      <header className="info-topbar">
        <div className="info-topbar-inner">
          <a
            className="info-brand"
            href="/"
            aria-label="Psikolog çalışma alanına dön"
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              event.preventDefault();
              navigate('/');
            }}
          >
            <span className="info-brand-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                <path d="M9 3H3v6M17 3h6v6M23 17v6h-6M9 23H3v-6" stroke="currentColor" strokeWidth="2.2" />
                <circle cx="10" cy="10" r="1.8" fill="currentColor" />
                <circle cx="16" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="10" cy="16" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="16" cy="16" r="1.8" fill="currentColor" />
              </svg>
            </span>
            <span className="info-brand-text">
              <strong>Psikolog</strong>
              <small>Klinik çalışma alanı</small>
            </span>
          </a>
          <button type="button" className="btn-secondary btn-sm" onClick={onBack}>
            <Icon name="left" size={14} />
            <span>Geri dön</span>
          </button>
        </div>
      </header>

      <main className="info-main" id="main">
        <div className="info-container">
          <header className="info-page-head">
            <span className="info-kicker">{kicker}</span>
            <h1 className="info-title">{title}</h1>
          </header>
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
