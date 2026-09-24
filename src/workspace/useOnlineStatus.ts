import { useEffect, useState } from 'react';

/** Tarayıcının çevrimiçi/çevrimdışı sinyalini dinler. SSR/testte varsayılan çevrimiçi. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') return navigator.onLine;
    } catch {
      /* yoksay */
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
