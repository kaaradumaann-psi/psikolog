import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ClinicErrorBoundary } from './components/ClinicErrorBoundary';
import { installLinkInterceptor } from './router';
import { supabaseConfig } from './auth/supabaseClient';
import { configureStorageScope } from './clinical/storageScope';

import './styles/screen.css';
import './styles/auth.css';
import './styles/clinical.css';
import './styles/dashboard.css';
import './styles/site.css';
import './styles/mobile.css';
import './styles/theme.css';
import './styles/coherence.css';
import './styles/workspace.css';
import './styles/responsive.css';

installLinkInterceptor();
// Bulut hesabı yoksa cihaz-yerel çalışma alanı kendi kapsamını kullanır.
// Supabase bağlıysa kapsam oturum çözüldükten sonra App içinde bağlanır;
// böylece oturum açılmadan hiçbir klinik kasa okunmaz.
if (!supabaseConfig.configured) configureStorageScope('local');

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found.');

createRoot(root).render(
  <StrictMode>
    <ClinicErrorBoundary>
      <App />
    </ClinicErrorBoundary>
  </StrictMode>,
);
