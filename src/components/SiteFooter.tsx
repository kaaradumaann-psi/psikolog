import { Icon } from './Icon';
import { CONTACT_EMAIL, COPYRIGHT_HOLDER, COPYRIGHT_YEAR, SITE_LABEL, SITE_URL } from '../form/attribution';

/** Bilgi sayfalarının rotaları — footer'daki bağlantılar ve App.tsx rotası bunu paylaşır. */
export const INFO_ROUTES = {
  sss: '/sss',
  gizlilik: '/gizlilik',
  kullanim: '/kullanim',
  kaynaklar: '/kaynaklar',
} as const;

type SiteFooterProps = {
  /**
   * "Yeni Veri Girişi" bağlantısı, oturum açıkken çalışma alanının İşlem
   * sekmesine döndürür. Verilmezse bağlantı yalnızca uygulama köküne (`/`)
   * gider; kurulum/önizleme ortamında bu doğru hedeftir.
   */
  onNewEntry?: () => void;
  /** Bilgi sayfası kabuğunda (InfoPageShell) yasal şerit gizlenir, sadece ana satır kalır. */
  compact?: boolean;
};

/**
 * Minimal site alt bilgisi — halilkaraduman.com.tr tasarım diliyle uyumlu:
 * tek satırda marka + telif, karşıda sayfa bağlantıları. İkinci satır
 * sadece yasal uyarı için, 10px muted, hairline üstü.
 * Eski büyük grid kaldırıldı, footer yüksekliği ~44px + 28px yasal şerit.
 */
export function SiteFooter({ onNewEntry, compact }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-left">
          <span className="site-footer-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 26 26" fill="none">
              <path d="M9 3H3v6M17 3h6v6M23 17v6h-6M9 23H3v-6" stroke="currentColor" strokeWidth="2.2" />
              <circle cx="10" cy="10" r="1.8" fill="currentColor" />
              <circle cx="16" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="10" cy="16" r="1.8" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="1.8" fill="currentColor" />
            </svg>
          </span>
          <span className="site-footer-copyright">
            © {COPYRIGHT_YEAR} <b>{COPYRIGHT_HOLDER}</b>
          </span>
          {!compact && (
            <>
              <span className="site-footer-sep" aria-hidden="true">
                ·
              </span>
              <span className="site-footer-meta">MMPI-566 Çalışma Alanı</span>
            </>
          )}
        </div>

        <nav className="site-footer-nav" aria-label="Site sayfaları">
          {onNewEntry ? (
            <button type="button" className="site-footer-link" onClick={onNewEntry}>
              Yeni Veri Girişi
            </button>
          ) : (
            <a className="site-footer-link" href="/islem">
              Yeni Veri Girişi
            </a>
          )}
          <a className="site-footer-link" href={INFO_ROUTES.sss}>
            SSS
          </a>
          <a className="site-footer-link" href={INFO_ROUTES.gizlilik}>
            Gizlilik
          </a>
          <a className="site-footer-link" href={INFO_ROUTES.kullanim}>
            Kullanım
          </a>
          <a className="site-footer-link" href={INFO_ROUTES.kaynaklar}>
            Kaynakça
          </a>
          <span className="site-footer-sep" aria-hidden="true">
            ·
          </span>
          <a
            className="site-footer-link site-footer-link-external"
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
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
              Bu yazılım tek başına tanı aracı değildir; tüm klinik kararlar ilgili uzman
              sorumluluğundadır.
            </p>
          </div>
        </div>
      )}
    </footer>
  );
}
