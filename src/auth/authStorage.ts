export const AUTH_STORAGE_KEY = 'mmpi-566-auth';

export type AuthStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const memoryOnlyStorage: AuthStorage = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

/**
 * Session lives in sessionStorage: F5 in the same tab keeps the user signed in,
 * closing the tab signs them out. Roles and record access still come from RLS.
 */
export function createAuthStorage(store?: AuthStorage | null): AuthStorage {
  if (store) return store;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.getItem(AUTH_STORAGE_KEY);
      return window.sessionStorage;
    }
  } catch {
    /* Private mode can throw on sessionStorage access. */
  }
  return memoryOnlyStorage;
}
