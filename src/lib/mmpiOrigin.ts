function safeOrigin(value: string | undefined, fallback: string): string {
  const raw = value?.trim() || fallback;
  try {
    const parsed = new URL(raw);
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (
      (!local && parsed.protocol !== 'https:') ||
      (local && !['http:', 'https:'].includes(parsed.protocol)) ||
      parsed.pathname !== '/' ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      return fallback;
    }
    return parsed.origin;
  } catch {
    return fallback;
  }
}

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const MMPI_ORIGIN = safeOrigin(viteEnv.VITE_MMPI_ORIGIN, 'https://mmpi.halilkaraduman.com.tr');
