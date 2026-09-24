import { BrandMark } from './BrandMark';
import { Icon } from './Icon';
import { APP_NAME, CONTACT_EMAIL, COPYRIGHT_HOLDER, COPYRIGHT_YEAR, SITE_LABEL, SITE_URL } from '../site';

export const INFO_ROUTES = {
  sss: '/sss',
  gizlilik: '/gizlilik',
  kullanim: '/kullanim',
  kaynaklar: '/kaynaklar',
} as const;

type SiteFooterProps = {
  onNewEntry?: () => void;
  compact?: boolean;
};

export function SiteFooter({ onNewEntry, compact }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-left">
          <span className="site-footer-mark" aria-hidden="true">
            <BrandMark size={14} simplified />
          </span>
          <span className="site-footer-copyright">
            © {COPYRIGHT_YEAR} <b>{COPYRIGHT_HOLDER}</b>
          </span>
          {!compact && (
            <>
              <span className="site-footer-sep" aria-hidden="true">·</span>
              <span className="site-footer-meta">{APP_NAME} klinik çalışma alanı</span>
            </>
          )}
        </div>

        <nav className="site-footer-nav" aria-label="Site sayfaları">
          {onNewEntry ? (
            <button type="button" className="site-footer-link" onClick={onNewEntry}>
              Yeni seans
            </button>
          ) : (
            <a className="site-footer-link" href="/seanslar">
              Yeni seans
            </a>
          )}
          <a className="site-footer-link" href={INFO_ROUTES.sss}>SSS</a>
          <a className="site-footer-link" href={INFO_ROUTES.gizlilik}>Gizlilik</a>
          <a className="site-footer-link" href={INFO_ROUTES.kullanim}>Kullanım</a>
          <a className="site-footer-link" href={INFO_ROUTES.kaynaklar}>Kaynakça</a>
          <span className="site-footer-sep" aria-hidden="true">·</span>
          <a className="site-footer-link site-footer-link-external" href={SITE_URL} target="_blank" rel="noopener noreferrer">
            <span>{SITE_LABEL}</span>
            <Icon name="external" size={10} />
          </a>
          <a className="site-footer-link site-footer-link-muted" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </nav>
      </div>
      {!compact && (
        <div className="site-footer-legal">
          <div className="site-footer-legal-inner">
            <p className="site-footer-disclaimer">
              Bu yazılım tek başına tanı aracı değildir. Klinik karar uygulayıcı uzmana aittir.
            </p>
          </div>
        </div>
      )}
    </footer>
  );
}
