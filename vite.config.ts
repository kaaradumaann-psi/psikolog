import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Arena preview host is {port}-{id}.e2b.app, suffix allowed explicitly.
 * host 0.0.0.0 makes server reachable from outside container.
 * No backend proxy — Supabase is accessed directly via publishable key,
 * service_role never in frontend.
 */
export default defineConfig({
  appType: 'spa',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: ['.e2b.app'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['.e2b.app'],
  },
});
