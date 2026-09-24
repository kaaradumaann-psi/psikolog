import { useCallback, useEffect, useRef, useState } from 'react';
import { registerNavigationGuard } from '../router';
import { saveReport, type ReportChange, type SavedReport, type SaveReason } from './reportsApi';
/** Serial saves + revision predicate prevent slow requests/multiple tabs from overwriting newer work. */
export function useReportAutosave(initial: SavedReport, change: ReportChange) {
  const saved = useRef(initial);
  const current = useRef(change);
  current.current = change;
  const persisted = useRef(JSON.stringify(pickChange(initial)));
  const saving = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Kaydedildi');
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const dirty = JSON.stringify(change) !== persisted.current;
  const save = useCallback(async (reason: SaveReason = 'manual'): Promise<boolean> => {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setError('');
    setMessage('Kaydediliyor…');
    const payload = current.current;
    try {
      const result = await saveReport(saved.current, payload, reason);
      saved.current = result;
      persisted.current = JSON.stringify(payload);
      if (mounted.current) {
        setMessage(
          `Kaydedildi · ${new Date(result.updated_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`,
        );
        setTick((t) => t + 1);
      }
      return true;
    } catch (e) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
        setMessage('Kaydedilemedi — değişiklikler yalnız bu ekranda');
      }
      return false;
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty || busy || error || !change.title.trim()) return;
    const timer = window.setTimeout(() => {
      void save('autosave');
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [change, dirty, busy, error, save, tick]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(current.current) !== persisted.current || saving.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const isPending = () => JSON.stringify(current.current) !== persisted.current || saving.current;
    const mayLeave = () =>
      !isPending() || window.confirm('Kaydedilmemiş değişiklikler var. Yine de ayrılmak istiyor musunuz?');
    const unregister = registerNavigationGuard(mayLeave);
    const editorUrl = window.location.href;
    const onPop = (e: PopStateEvent) => {
      if (!mayLeave()) {
        window.history.pushState(null, '', editorUrl);
        e.stopImmediatePropagation();
      }
    };
    const linkGuard = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
      if (anchor && (anchor.origin !== window.location.origin || anchor.target === '_blank') && !mayLeave()) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', warn);
    window.addEventListener('popstate', onPop, true);
    document.addEventListener('click', linkGuard, true);
    return () => {
      unregister();
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('popstate', onPop, true);
      document.removeEventListener('click', linkGuard, true);
    };
  }, []);
  return { save, busy, dirty, message, error, saved };
}
export function pickChange(r: SavedReport): ReportChange {
  return {
    title: r.title,
    content: r.content,
    status: r.status,
    source_data_snapshot: r.source_data_snapshot,
    source_data_version: r.source_data_version,
    generated_at: r.generated_at,
  };
}
