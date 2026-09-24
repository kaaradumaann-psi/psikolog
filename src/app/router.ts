import { useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Route type                                                         */
/* ------------------------------------------------------------------ */

export type AppRoute =
  | { page: 'login' }
  | { page: 'dashboard' }
  | { page: 'clients' }
  | { page: 'client'; id: string; tab?: string }
  | { page: 'client_new' }
  | { page: 'settings' }
  | { page: 'admin' }
  | { page: 'audit' }
  | { page: 'not_found' };

/* ------------------------------------------------------------------ */
/*  Pathname → route                                                   */
/* ------------------------------------------------------------------ */

export function parseRoute(pathname: string, search: string = ''): AppRoute {
  const raw = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const path = raw || '/';
  const params = new URLSearchParams(search);
  const tab = params.get('tab') || undefined;

  if (path === '/' || path === '/dashboard') return { page: 'dashboard' };
  if (path === '/login') return { page: 'login' };
  if (path === '/clients') return { page: 'clients' };
  if (path === '/clients/new') return { page: 'client_new' };
  if (path === '/settings') return { page: 'settings' };
  if (path === '/admin') return { page: 'admin' };
  if (path === '/audit') return { page: 'audit' };

  const clientMatch = /^\/clients\/([^/]+)$/.exec(path);
  if (clientMatch) return { page: 'client', id: clientMatch[1]!, tab };

  return { page: 'not_found' };
}

/* ------------------------------------------------------------------ */
/*  History API navigation                                             */
/* ------------------------------------------------------------------ */

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const fn of listeners) fn();
}

const navigationGuards = new Set<() => boolean>();
/** Only active editors register a guard; all other routes keep existing behavior */
export function registerNavigationGuard(guard: () => boolean): () => void {
  navigationGuards.add(guard);
  return () => {
    navigationGuards.delete(guard);
  };
}

export function navigate(to: string, options?: { replace?: boolean }): void {
  if ([...navigationGuards].some((guard) => !guard())) return;
  if (options?.replace) {
    window.history.replaceState(null, '', to);
  } else {
    window.history.pushState(null, '', to);
  }
  notify();
}

/* ------------------------------------------------------------------ */
/*  useRoute — re-renders on every navigation                          */
/* ------------------------------------------------------------------ */

export function useRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseRoute(window.location.pathname, window.location.search),
  );
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.pathname, window.location.search));
    listeners.add(update);
    window.addEventListener('popstate', update);
    return () => {
      listeners.delete(update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return route;
}

/* ------------------------------------------------------------------ */
/*  Global <a> click interceptor — MMPI pattern                        */
/* ------------------------------------------------------------------ */

/**
 * Intercepts same-origin <a> clicks and uses History API.
 * Skipped: hash anchors, mailto/tel/blob/data, download, target=_blank,
 * cross-origin, /api/*, modifier keys.
 */
export function installLinkInterceptor(): void {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const anchor = (e.target as HTMLElement | null)?.closest?.('a') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (href.startsWith('blob:') || href.startsWith('data:')) return;
    if (anchor.hasAttribute('download')) return;
    if (anchor.target === '_blank') return;
    if (anchor.origin !== window.location.origin) return;
    if (href.startsWith('/api/')) return;

    e.preventDefault();
    navigate(anchor.pathname + anchor.search + anchor.hash);
  });
}
