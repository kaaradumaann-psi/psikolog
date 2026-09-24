import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installLinkInterceptor } from './router';
import './styles/screen.css';
import './styles/form.css';
import './styles/print.css';
import './styles/auth.css';
import './styles/workspace.css';
import './styles/clinical.css';
// Author design layer (www.halilkaraduman.com.tr) — imported last so it can refine the files above.
import './styles/theme.css';
// Site chrome (footer + info pages: SSS, Gizlilik & KVKK, Kullanım Koşulları, Kaynakça).
import './styles/site.css';
// Mobile overrides (≤720px) — imported last so they win at narrow widths; desktop is untouched.
import './styles/mobile.css';
import './styles/reports.css';
// Responsive foundation (viewport height units, safe areas, ≥44px touch targets,
// 16px form controls, ≤430px small-phone tier) — imported LAST so it refines every
// layer above without touching the printable A4 sheet (all rules are @media screen).
import './styles/responsive.css';

// Intercept same-origin <a> clicks for SPA navigation.
installLinkInterceptor();

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found.');
createRoot(root).render(<StrictMode><App /></StrictMode>);
