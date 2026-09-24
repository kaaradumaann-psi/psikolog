import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { installLinkInterceptor } from './app/router';

import './styles/tokens.css';
import './styles/theme.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/print.css';
import './styles/responsive.css';

installLinkInterceptor();

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
