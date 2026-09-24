import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { INFO_ROUTES } from './SiteFooter';
import { SITE_URL } from '../form/attribution';
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
  /** Çalışma alanı sekmeleri (İşlem / Form / Kayıtlar / Yönetim). */
  items: MobileNavItem[];
  user: AuthenticatedUser;
  onLogout: () => void;
};

/**
 * Mobil tam ekran gezinme katmanı (full-screen navigation overlay).
 *
 * ≤900px'te başlıktaki sekme şeridi, kullanıcı özeti ve dış site bağlantısı
 * başlıkta yer kaplamak yerine sağ üstteki tek bir düğmeden açılan tam ekran
 * menüye taşınır. Masaüstünde (≥901px) bileşen yalnızca gizli düğmeyi üretir;
 * görünürlük tamamen CSS medya sorgularına bırakılmıştır.
 *
 * Erişilebilirlik: `role="dialog"` + `aria-modal`, Escape ile kapanma, açılışta
 * odak kapatma düğmesine gider, kapanışta odak tetikleyiciye döner; menü
 * açıkken arka plan kaydırması kilitlenir. Her rota değişiminde kendiliğinden
 * kapanır (SPA gezinmesinde açık kalan menü bırakılmaz).
 */
export function MobileNav({ items, user, onLogout }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const route = useRoute();

  // Rota değiştiğinde menüyü kapat (SPA navigasyonu dahil).
  useEffect(() => {
    setOpen(false);
  }, [route]);

  // Arka plan kaydırma kilidi + Escape + odak yönetimi.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
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
        aria-controls="mobile-nav-overlay"
        aria-label="Menüyü aç"
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" size={22} />
      </button>

      {open &&
        createPortal(
          <div
            className="mobile-nav-overlay"
            id="mobile-nav-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Gezinme menüsü"
          >
          <div className="mobile-nav-head">
            <span className="mobile-nav-brand">
              <span className="brand-mark" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                  <path d="M9 3H3v6M17 3h6v6M23 17v6h-6M9 23H3v-6" stroke="currentColor" strokeWidth="2.2" />
                  <circle cx="10" cy="10" r="1.8" fill="currentColor" />
                  <circle cx="16" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="10" cy="16" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="16" cy="16" r="1.8" fill="currentColor" />
                </svg>
              </span>
              <span className="mobile-nav-brand-text">
                <strong>MMPI-566</strong>
                <small>Çalışma alanı</small>
              </span>
            </span>
            <button
              type="button"
              ref={closeRef}
              className="nav-close"
              aria-label="Menüyü kapat"
              onClick={() => setOpen(false)}
            >
              <Icon name="close" size={22} />
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
                className="mobile-nav-link"
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
                <span className={`user-role-badge ${user.role === 'ADMIN' ? 'badge-admin' : 'badge-psy'}`}>
                  {user.role === 'ADMIN' ? 'Yönetici' : 'Psikolog'}
                </span>
              </div>
            </div>
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
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
