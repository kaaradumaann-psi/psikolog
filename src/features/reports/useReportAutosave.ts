import { useEffect, useRef, useState } from 'react';
import { updateReport } from './reportsApi';
import type { ReportDocument } from './templateEngine';

type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';

export function useReportAutosave(
  reportId: string,
  content: ReportDocument,
  revision: number,
  enabled: boolean = true,
) {
  const [state, setState] = useState<AutosaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const lastSavedContent = useRef<string>(JSON.stringify(content));
  const timeoutRef = useRef<number | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const current = JSON.stringify(content);
    if (current === lastSavedContent.current) return;

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    timeoutRef.current = window.setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      setState('saving');
      setError(null);
      try {
        await updateReport(reportId, { content, saveReason: 'autosave' }, revision);
        lastSavedContent.current = current;
        setState('saved');
        setTimeout(() => setState('idle'), 2000);
      } catch (e) {
        setState('error');
        setError((e as Error).message);
      } finally {
        savingRef.current = false;
      }
    }, 1400);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [content, reportId, revision, enabled]);

  // Warn on unload if unsaved
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const current = JSON.stringify(content);
      if (current !== lastSavedContent.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [content]);

  return { state, error };
}
