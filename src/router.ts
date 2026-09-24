import { useEffect, useState } from 'react';

export type AppRoute =
  | { page: 'home' }
  | { page: 'danisanlar' }
  | { page: 'danisan'; id: string }
  | { page: 'seanslar' }
  | { page: 'testler' }
  | { page: 'beck_depresyon' }
  | { page: 'beck_anksiyete' }
  | { page: 'scl90' }
  | { page: 'tarama' }
  | { page: 'takvim' }
  | { page: 'raporlar' }
  | { page: 'gorevler' }
  | { page: 'ayarlar' }
  | { page: 'denetim' }
  | { page: 'sss' }
  | { page: 'gizlilik' }
  | { page: 'kullanim' }
  | { page: 'kaynaklar' }
  | { page: 'bulunamadi' };

export function parseRoute(pathname: string): AppRoute {
  const raw = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const path = raw || '/';

  if (path === '/' || path === '/index.html' || path === '/dashboard' || path === '/login') return { page: 'home' };
  if (path === '/danisanlar' || path === '/clients') return { page: 'danisanlar' };
  if (path === '/seanslar') return { page: 'seanslar' };
  if (path === '/testler') return { page: 'testler' };
  if (path === '/testler/beck-depresyon') return { page: 'beck_depresyon' };
  if (path === '/testler/beck-anksiyete') return { page: 'beck_anksiyete' };
  if (path === '/testler/scl90') return { page: 'scl90' };
  if (path === '/testler/tarama') return { page: 'tarama' };
  if (path === '/takvim' || path === '/appointments') return { page: 'takvim' };
  if (path === '/raporlar') return { page: 'raporlar' };
  if (path === '/gorevler' || path === '/tasks') return { page: 'gorevler' };
  if (path === '/ayarlar' || path === '/settings') return { page: 'ayarlar' };
  if (path === '/denetim' || path === '/audit') return { page: 'denetim' };
  if (path === '/sss') return { page: 'sss' };
  if (path === '/gizlilik') return { page: 'gizlilik' };
  if (path === '/kullanim') return { page: 'kullanim' };
  if (path === '/kaynaklar') return { page: 'kaynaklar' };

  if (path === '/islem' || path === '/form' || path === '/optik-form.html') {
    return { page: 'bulunamadi' };
  }
  if (path === '/kayitlar') return { page: 'danisanlar' };

  const danisanMatch = /^\/danisanlar\/([^/]+)$/.exec(path) || /^\/clients\/([^/]+)$/.exec(path);
  if (danisanMatch && danisanMatch[1] !== 'new') return { page: 'danisan', id: decodeURIComponent(danisanMatch[1]!) };

  return { page: 'bulunamadi' };
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const fn of listeners) fn();
}

const navigationGuards = new Set<() => boolean>();

export function registerNavigationGuard(guard: () => boolean): () => void {
  navigationGuards.add(guard);
  return () => {
    navigationGuards.delete(guard);
  };
}

export function navigate(to: string, options?: { replace?: boolean }): void {
  if ([...navigationGuards].some((guard) => !guard())) return;
  if (options?.replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  notify();
}

export function useRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.pathname));
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.pathname));
    listeners.add(update);
    window.addEventListener('popstate', update);
    return () => {
      listeners.delete(update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return route;
}

export function installLinkInterceptor(): void {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as HTMLElement | null)?.closest?.('a') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (href.startsWith('blob:') || href.startsWith('data:')) return;
    if (anchor.hasAttribute('download') || anchor.target === '_blank') return;
    if (anchor.origin !== window.location.origin) return;
    if (href.startsWith('/api/')) return;
    event.preventDefault();
    navigate(anchor.pathname + anchor.search + anchor.hash);
  });
}
