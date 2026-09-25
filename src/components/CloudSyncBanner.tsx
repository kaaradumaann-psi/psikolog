import { useEffect, useState } from 'react';
import { getSyncState, subscribeSync, type SyncState } from '../clinical/cloud/sync';

/**
 * Bulut kaydının gerçek durumunu gösterir. "Kaydedildi" yalnızca sunucu
 * yazımı başarılıysa görünür; hata/çevrimdışı durumunda açıkça uyarır.
 */
export function CloudSyncBanner() {
  const [state, setState] = useState<SyncState>(getSyncState());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSync((next) => {
      setState(next);
      setVisible(next.phase !== 'ready' && next.phase !== 'inactive');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (state.phase !== 'saved') return;
    const timer = window.setTimeout(() => setVisible(false), 2500);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.lastSavedAt]);

  if (!state.cloud || !visible) return null;

  const tone =
    state.phase === 'error' ? 'is-error'
      : state.phase === 'offline' ? 'is-warning'
        : state.phase === 'saved' ? 'is-success'
          : 'is-info';

  const text =
    state.phase === 'loading' ? 'Klinik veriler sunucudan yükleniyor…'
      : state.phase === 'saving' ? 'Sunucuya kaydediliyor…'
        : state.phase === 'saved' ? 'Sunucuya kaydedildi.'
          : state.phase === 'offline'
            ? `Bağlantı yok — ${state.pending} kayıt kuyrukta bekliyor.`
            : state.lastError ?? 'Bulut kaydı başarısız.';

  return (
    <p className={`cloud-sync-banner ${tone}`} role="status">
      {text}
    </p>
  );
}
