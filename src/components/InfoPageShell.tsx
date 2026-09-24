import type { MouseEvent, ReactNode } from 'react';
import { BrandMark } from './BrandMark';
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
      <a className="skip-link" href="#main">Ana içeriğe atla</a>
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
              <BrandMark size={22} />
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
