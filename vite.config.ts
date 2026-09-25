import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Arena preview host is {port}-{id}.e2b.app, suffix allowed explicitly.
 * host 0.0.0.0 makes server reachable from outside container.
 * No backend proxy — Supabase is accessed directly via publishable key,
 * service_role never in frontend.
 * PHASE-09: manualChunks for performance, chunkSizeWarning 500kB
 */
export default defineConfig({
  appType: 'spa',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Playwright targets :5173; silently falling back to :5174 would test a stale server.
    strictPort: true,
    allowedHosts: ['.e2b.app'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    // Fail if :4173 is already used instead of serving the new bundle on :4174.
    strictPort: true,
    allowedHosts: ['.e2b.app'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
