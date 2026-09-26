import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ClinicErrorBoundary } from './components/ClinicErrorBoundary';
import { installLinkInterceptor } from './router';
import { getClients } from './clinical/clinicalStore';

import './styles/screen.css';
import './styles/auth.css';
import './styles/clinical.css';
import './styles/dashboard.css';
import './styles/site.css';
import './styles/mobile.css';
import './styles/theme.css';
import './styles/coherence.css';
import './styles/workspace.css';
import './styles/content-system.css';
import './styles/assessment-print.css';
import './styles/bdi-workspace.css';
import './styles/admin-workspace.css';
import './styles/responsive.css';

installLinkInterceptor();
getClients();

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found.');

createRoot(root).render(
  <StrictMode>
    <ClinicErrorBoundary>
      <App />
    </ClinicErrorBoundary>
  </StrictMode>,
);
