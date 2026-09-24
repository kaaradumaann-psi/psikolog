# PHASE-09 — Polish + Deploy

**Durum:** DONE
**Tarih:** 2026-09-24
**Build:** ~700kB JS split vendor/supabase/zod/rhf, gzip ~195kB
**Test:** 69 pass

## Yapılanlar
- `vite.config.ts`: manualChunks vendor/react-dom, supabase, zod, rhf, chunkSizeWarning 600, appType spa.
- `index.html`: SEO og:title/description/type/locale, twitter card, color-scheme light, robots noindex nofollow (private platform), theme-color, skip-link `<a href="#main-content">`.
- `public/_headers`: hardened CSP default-src self, base-uri self, connect-src self https://*.supabase.co wss://*.supabase.co fonts, font-src self https://fonts.gstatic.com, form-action self, frame-ancestors none, img-src self data blob, object-src none, script-src self, style-src self unsafe-inline https fonts, worker-src self blob, HSTS max-age 31536000 includeSubDomains preload, COOP same-origin, COEP credentialless, CORP same-origin, X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera/geolocation/microphone/payment/usb none, Cache-Control immutable for /assets/*, svg/js/css.
- `wrangler.jsonc`: assets directory dist, not_found_handling SPA, html_handling auto-trailing-slash, routes pattern psikolog.halilkaraduman.com.tr/* custom_domain true, observability enabled.
- `tokens.css`: skip-link accessibility — absolute left -9999px, focus left 16px top 16px padding 8px 12px bg border accent radius, z-index 9999.
- `App.tsx`: lazy routes React.lazy for all pages (Login, Dashboard, Clients, ClientNew, ClientFile, Admin, Settings, Audit, NotFound, Appointments, Tasks), Suspense fallback PageLoader, main id="main-content" tabIndex -1 for skip-link, aria-label menü aç/kapat.
- Performance: manualChunks reduces main bundle, vendor caching, lazy loading reduces initial JS.
- Accessibility: skip-link, main-content id, aria-label, semantic header/main, color-scheme light.
- Deployment: CI already exists .github/workflows/ci.yml typecheck+test+build, wrangler deploy ready, _headers CSP, SPA fallback.
- SEO: description KVKK odaklı, og tags, noindex private, author Halil Karaduman.

## Güvenlik
- CSP hardened, no inline script except unsafe-inline for style (fonts), no object-src, frame-ancestors none.
- HSTS preload, COOP/COEP/CORP.
- No public registration, robots noindex.

## Sonraki
- PHASE-10 E2E Playwright + rate limiting.
