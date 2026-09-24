import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { INFO_ROUTES } from './SiteFooter';
import { SITE_URL } from '../site';
import { displayName } from '../auth/userDisplay';
import { useRoute } from '../router';
import type { AuthenticatedUser } from '../auth/authTypes';

export type MobileNavItem = {
  id: string;
  label: string;
  icon: IconName;
  active: boolean;
  onSelect: () => void;
};

type MobileNavProps = {
  items: MobileNavItem[];
  user: AuthenticatedUser;
  onLogout: () => void;
  showLogout?: boolean;
};

/**
 * Başlığın altında açılan kompakt gezinme paneli.
 *
 * Geniş ekranda kalıcı yan gezinme vardır. Dar ekranda sağ üstteki düğme
 * menüyü açar. Panel, ekranın tamamını kaplayan katmanın yerine geçti: başlığın
 * hemen altına yaslanan, kenarlarından sayfanın görünür kaldığı yüzen bir
 * menüdür. Yüksekliği ekranı asla aşmaz; uzun liste panel içinde kayar,
 * kullanıcı + çıkış şeridi panelin altında yapışık kalır.
 *
 * Erişilebilirlik: `role="dialog"` + `aria-modal`, Escape ve arka plana
 * tıklama ile kapanma, açılışta odak kapatma düğmesine gider, Tab panel
 * içinde döngüde kalır, kapanışta odak tetikleyiciye döner; menü açıkken
 * arka plan kaydırması kilitlenir. Her rota değişiminde kendiliğinden
 * kapanır (SPA gezinmesinde açık kalan menü bırakılmaz).
 */
export function MobileNav({ items, user, onLogout, showLogout = true }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const route = useRoute();

  // Rota değiştiğinde menüyü kapat (SPA navigasyonu dahil).
  useEffect(() => {
    setOpen(false);
  }, [route]);

  // Arka plan kaydırma kilidi + Escape + Tab döngüsü + odak yönetimi.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key === 'Tab') {
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>('button, a[href]');
        if (!focusables || focusables.length < 2) return;
        const first = focusables[0] as HTMLElement;
        const last = focusables[focusables.length - 1] as HTMLElement;
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !(active instanceof HTMLElement) || !panelRef.current?.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      toggleRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={toggleRef}
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label="Menüyü aç"
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" size={22} />
      </button>

      {open &&
        createPortal(
          <>
            <div
              className="mobile-nav-backdrop"
              aria-hidden="true"
              onClick={() => setOpen(false)}
            />
            <div
              ref={panelRef}
              className="mobile-nav-panel"
              id="mobile-nav-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Gezinme menüsü"
            >
              <div className="mobile-nav-head">
                <span className="mobile-nav-title">Menü</span>
                <button
                  type="button"
                  ref={closeRef}
                  className="nav-close"
                  aria-label="Menüyü kapat"
                  onClick={() => setOpen(false)}
                >
                  <Icon name="close" size={20} />
                </button>
              </div>

              <nav className="mobile-nav-body" aria-label="Çalışma alanı ve site sayfaları">
                <span className="mobile-nav-kicker" id="mobile-nav-group-workspace">
                  Çalışma alanı
                </span>
                <div className="mobile-nav-group" role="group" aria-labelledby="mobile-nav-group-workspace">
                  {items.map(item => (
                    <button
                      type="button"
                      key={item.id}
                      className={`mobile-nav-link ${item.active ? 'active' : ''}`}
                      aria-current={item.active ? 'page' : undefined}
                      onClick={() => {
                        setOpen(false);
                        item.onSelect();
                      }}
                    >
                      <Icon name={item.icon} size={18} />
                      <span>{item.label}</span>
                      {item.active && <span className="mobile-nav-current">Açık</span>}
                    </button>
                  ))}
                </div>

                <span className="mobile-nav-kicker" id="mobile-nav-group-site">
                  Site
                </span>
                <div className="mobile-nav-group" role="group" aria-labelledby="mobile-nav-group-site">
                  <a
                    className="mobile-nav-link mobile-nav-link-wide"
                    href={SITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                  >
                    <Icon name="external" size={18} />
                    <span>halilkaraduman.com.tr</span>
                  </a>
                  <a className="mobile-nav-link" href={INFO_ROUTES.sss} onClick={() => setOpen(false)}>
                    <Icon name="info" size={18} />
                    <span>SSS</span>
                  </a>
                  <a className="mobile-nav-link" href={INFO_ROUTES.gizlilik} onClick={() => setOpen(false)}>
                    <Icon name="shield" size={18} />
                    <span>Gizlilik &amp; KVKK</span>
                  </a>
                  <a className="mobile-nav-link" href={INFO_ROUTES.kullanim} onClick={() => setOpen(false)}>
                    <Icon name="file" size={18} />
                    <span>Kullanım Koşulları</span>
                  </a>
                  <a className="mobile-nav-link" href={INFO_ROUTES.kaynaklar} onClick={() => setOpen(false)}>
                    <Icon name="list" size={18} />
                    <span>Kaynakça</span>
                  </a>
                </div>
              </nav>

              <div className="mobile-nav-foot">
                <div className="user-profile-summary">
                  <div className="user-avatar-circle">
                    {user.firstName.charAt(0)}
                    {user.lastName.charAt(0)}
                  </div>
                  <div className="user-info-text">
                    <strong className="user-full-name">{displayName(user)}</strong>
                    <span className={`user-role-badge ${user.role === 'ADMIN' || user.role === 'ORG_ADMIN' ? 'badge-admin' : 'badge-psy'}`}>
                      {!showLogout ? 'Yerel çalışma alanı' : user.role === 'ADMIN' || user.role === 'ORG_ADMIN' ? 'Yönetici' : 'Uzman psikolog'}
                    </span>
                  </div>
                </div>
                {showLogout && (
                  <button
                    type="button"
                    className="btn-logout"
                    onClick={() => {
                      setOpen(false);
                      onLogout();
                    }}
                  >
                    <span>Çıkış</span>
                  </button>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
