import { defineConfig } from 'vite';

/**
 * The preview host of a hosted sandbox is `{port}-{id}.e2b.app`, so the suffix is
 * allowed explicitly instead of disabling the host check. `host: '0.0.0.0'` makes
 * the server reachable from outside the container; Vite proxies nothing because
 * this app has no backend and never calls a remote API.
 */
export default defineConfig({
  appType: 'spa',
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  preview: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
});
