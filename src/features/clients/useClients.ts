import { useEffect, useState, useCallback } from 'react';
import { listClients, type ClientQuery, type ClientListResult } from './clientApi';
import { showToast } from '../../components/ui/Toast';

export function useClients(initialQuery: ClientQuery = {}) {
  const [query, setQuery] = useState<ClientQuery>(initialQuery);
  const [result, setResult] = useState<ClientListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (q: ClientQuery) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listClients(q);
      setResult(res);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(query);
  }, [query, fetch]);

  const updateQuery = (patch: Partial<ClientQuery>) => {
    setQuery((prev) => ({ ...prev, ...patch, page: patch.page ?? 0 }));
  };

  const nextPage = () => {
    if (!result?.hasMore) return;
    setQuery((prev) => ({ ...prev, page: (prev.page ?? 0) + 1 }));
  };

  const prevPage = () => {
    setQuery((prev) => ({ ...prev, page: Math.max(0, (prev.page ?? 0) - 1) }));
  };

  return { query, result, loading, error, updateQuery, nextPage, prevPage, refresh: () => fetch(query) };
}
