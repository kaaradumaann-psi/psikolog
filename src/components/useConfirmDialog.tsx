import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

export type ConfirmRequest = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'danger' | 'neutral';
  /** Onaylanan işlem. Hata fırlatırsa mesaj diyalogun altında görünür. */
  run: () => void | Promise<void>;
};

/**
 * `window.confirm` yerine geçen satır içi doğrulama.
 *
 * Doğal diyaloglar odak tuzağı, Escape davranışı ve mobil ekran boyutu
 * açısından tarayıcıya bırakılır; klinik üründe silme gibi geri alınamaz
 * işlemlar uygulama içinde, erişilebilir bir onay ile yapılır.
 * `run` hata verirse diyalog kapanmaz ve kısa nedeni gösterilir.
 */
export function useConfirmDialog(): {
  ask: (request: ConfirmRequest) => void;
  dialog: ReactNode;
} {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback((next: ConfirmRequest) => {
    setError(null);
    setBusy(false);
    setRequest(next);
  }, []);

  const close = useCallback(() => {
    if (busy) return;
    setRequest(null);
    setError(null);
  }, [busy]);

  const confirm = useCallback(() => {
    if (!request) return;
    setError(null);
    try {
      const result = request.run();
      if (result instanceof Promise) {
        setBusy(true);
        void result
          .then(() => setRequest(null))
          .catch((reason: unknown) => {
            setError(reason instanceof Error ? reason.message : 'İşlem tamamlanamadı.');
          })
          .finally(() => setBusy(false));
        return;
      }
      setRequest(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'İşlem tamamlanamadı.');
    }
  }, [request]);

  const dialog = useMemo(() => {
    if (!request) return null;
    return (
      <>
        <ConfirmDialog
          title={request.title}
          description={request.description}
          confirmLabel={request.confirmLabel}
          tone={request.tone ?? 'danger'}
          busy={busy}
          error={error}
          onConfirm={confirm}
          onCancel={close}
        />
      </>
    );
  }, [busy, close, confirm, error, request]);

  return { ask, dialog };
}
