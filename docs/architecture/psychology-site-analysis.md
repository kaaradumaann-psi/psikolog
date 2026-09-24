# Psikolog Web Sitesi Analizi — halilkaraduman.com.tr

Tarih: 2026-09-24
Repo: `kaaradumaann-psi/halilkaraduman.com.tr` — public, 17 commit
Stack: React 19.2.8 + Vite 8.3.0 + Cloudflare Workers Static Assets

---

## 1. Frontend

- **package.json:** React 19, Vite 8, @vitejs/plugin-react 6, eslint 10, wrangler 4. Scripts: dev (vite --host 0.0.0.0 --port 5173), build, preview, worker:dev (build+wrangler dev), deploy (build+wrangler deploy), lint, check
- **Entry:** `index.html` → `src/main.jsx` → `App.jsx` + `index.css`
- **App.jsx 385 satır:** Tek dosyada tüm site — SOCIALS array (GitHub/LinkedIn/YouTube/Instagram svg path), CERTS placeholder (3 boş), PHOTO_SOURCES fallback (/foto.jpg|png|webp), state: open (mobile menu), toast, form {ad,email,mesaj,website honeypot}, sending, photoIdx/photoFailed, go(id) scroll with nav height offset + history.replaceState, goHome, IntersectionObserver reveal, toast auto dismiss 3.2s, hash scroll on mount, onSubmit validation (required + email regex) → fetch /api/contact POST JSON → success toast + reset, network error → mailto fallback + toast
- **No TypeScript:** .jsx, no tsconfig, eslint only
- **No router:** Hash scroll, not SPA router. `window.scrollTo` + `history.replaceState`
- **No state management:** useState/useEffect only

## 2. UI / Design System

### Design tokens (index.css :root)

```css
--bg:#FFFFFF
--bg-soft:#F6F6F6
--text:#0D0D0D
--muted:#8E8E93
--soft:#6E6E73
--border:#E9E9EB
--accent:#0A84FF
--radius:14px
--max:780px
--nav-h:64px
```

- **Typography:** DM Sans (sans) + Newsreader (serif) via Google Fonts preconnect, weights 300/400/500/600, serif italic for emphasis, letter-spacing -0.04em hero, -0.03em section title, -0.02em about statement. Line-height 1.6 body, 0.98 hero, 1.1 section title, 1.35 about statement
- **Spacing:** container `width:min(var(--max), 100% - 40px)` → 32px on ≤600px, section padding 40px 0, border-top 1px solid var(--border), scroll-margin-top calc(var(--nav-h)+16px), hero padding 48px 0 36px
- **Button sistemi:** .btn-primary black bg white text border black pill 999px padding 11px 18px font 14px weight 500 hover #1a1a1a translateY -1px + svg arrow; .btn-ghost white bg black text border var(--border) pill same padding hover border black; .btn-full width 100% same; .btn-submit same full width
- **Card sistemi:** max-width 520px margin auto, white bg border var(--border) radius var(--radius) padding 22px text-left, card-top flex space-between, card-icon 32px black bg white symbol, card-badge pill 10px uppercase muted border bg-soft, --new red #e11d48 pulse animation 2.4s infinite, @keyframes new-badge-pulse opacity+shadow, reduced-motion disable
- **Avatar:** 120px circle border 1px padding 3px white bg, fallback .avatar--fallback grid place-items center bg-soft, img 54px opacity .85 (HK monogram)
- **Kicker:** inline-flex gap 7px font 11px letter-spacing .1em uppercase muted border bg-soft padding 6px 10px radius 999px margin-bottom 18px, dot 6px accent circle
- **Section:** head text-center max-width 520px margin auto 24px, num 11px .12em uppercase muted, title Newsreader 28px weight 300 -0.03em, desc soft 14px
- **About:** statement Newsreader clamp(23px,3vw,29px) weight 300 line-height 1.35 -0.02em max-width 640px text-center, body max-width 640px p soft 14.5px line-height 1.75 text-center, facts list max-width 520px border-top, li flex space-between padding 11px 0 border-bottom, span muted 10.5px .1em uppercase, b weight 600
- **Resume:** grid 1fr 1fr gap 16px align stretch, col flex column gap 16px, block white border radius padding 6px 20px 18px, label padding 12px 0 7px 10px .12em uppercase muted weight 600, item grid 140px 1fr gap 16px padding 15px 0, list item+item border-top, period muted 11px, content h3 15px weight 600, place soft 13px, location muted 10px .08em uppercase, education variant grid 34px 1fr gap 12px padding 14px 13px bg-soft border radius 10px, mark 30px white border grid center, empty mark muted, empty-line muted weight 400 .08em, certs flex:1 column, cert-list flex column gap 8px, cert-item flex gap 12px bg-soft border radius 10px padding 8px 12px, cert-mark 26px white border, h3 13px weight 600, year margin-left auto muted 11px, empty variant same
- **Contact:** grid 1fr 1.1fr gap 40px align start, mail-card flex column gap 3px margin-top 18px white border radius 12px padding 14px 18px hover border black translateY -1px, label 10px .12em uppercase muted, addr 14.5px weight 600 -0.01em, note muted 12px, form-wrap white border radius padding 22px, field flex column gap 6px margin-top 14px, label 11px .08em uppercase muted weight 600, input/textarea width 100% padding 11px 13px radius 10px border bg white text 14px focus border black, textarea resize vertical min-height 100px, submit full width
- **Footer:** border-top padding 30px 0 text-center muted 12.5px, inner flex column gap 16px, socials footer-socials margin-top 0, b text Newsreader weight 400, line-height 1.6
- **Socials:** flex gap 10px margin-top 24px justify center, btn 38px circle border bg white grid center soft hover text black border black translateY -2px
- **Reveal:** opacity 0 translateY 8px transition .5s ease, .in opacity 1 transform none, IntersectionObserver threshold .1
- **Toast:** fixed left 50% bottom 18px translateX -50% bg text white padding 12px 14px radius 12px flex gap 10px font 13px z-index 30 shadow 0 10px 30px rgba(0,0,0,.15)

### Navigation

- nav sticky top 0 z-index 20 bg rgba(255,255,255,.86) backdrop-filter blur 10px border-bottom
- inner height var(--nav-h) flex space-between gap 16px
- logo inline-flex img height 42px width auto (logo-mark.png HK monogram)
- links flex gap 22px, link font 13px soft hover text
- mobile-toggle display none background none border none cursor pointer padding 6px, hamburger 18x12 flex column space-between span height 1.5px bg text radius 999px transition .2s
- @media ≤760px: links display none, open display flex position absolute left 0 right 0 top var(--nav-h) bg white border-bottom column stretch padding 16px 20px gap 0, link padding 14px 0 border-bottom, toggle display block

### Responsive yaklaşım

- Mobile first değil, desktop first ama responsive from start
- Breakpoints: 600px container, 760px nav/resume/contact grid, 520px resume item single column + form padding
- No heavy framework, pure CSS media queries
- Images max-width 100% display block
- Button font inherit

## 3. Routing

- No React Router. `go(id)` → querySelector + getBoundingClientRect + scrollY - navHeight -16 → scrollTo smooth + history.replaceState null '' id + setOpen false
- goHome → scroll top 0 smooth + replaceState pathname+search (hash temiz)
- useEffect hash varsa requestAnimationFrame go(hash)
- Link interceptor yok (MMPI'de var)
- SPA değil, single page with sections: hero, #hakkimda (01), #calismalar (02), #ozgecmis (03), #iletisim (04)

## 4. Cloudflare

- **Wrangler:** wrangler.jsonc name psikolog, main ./worker/index.js, compatibility_date 2026-09-16, workers_dev true, preview_urls true, assets directory ./dist binding ASSETS not_found_handling single-page-application run_worker_first /api/*, vars CONTACT_FROM Halil Karaduman <website@halilkaraduman.com.tr>, CONTACT_TO contact@halilkaraduman.com.tr
- **Worker:** worker/index.js 171 satır — defaultRecipient, defaultSender, emailPattern, MAX_BODY_BYTES 32KB, RATE_LIMIT_MAX 5, RATE_LIMIT_WINDOW_MS 10min, rateBuckets Map, isRateLimited(ip) → now>resetAt → clean if size>5000, json() helper Content-Type json no-store, text() trim, escapeHtml &<>"' replace, handleContact: OPTIONS 204 Allow POST OPTIONS, method POST only else 405, content-length >MAX →413, rate limit IP via CF-Connecting-IP header →429, content-type must application/json else 415, rawBody text + byteLength check →413, JSON.parse →400, honeypot website field →200 ok silent, name/email/message trim, required else 400, length name>120 email>254 message>5000 →400, email regex →400, env RESEND_API_KEY, CONTACT_TO, CONTACT_FROM, if !apiKey →503 log error, subject `halilkaraduman.com.tr — ${name} iletişim formu`, html h2 + p strong + escapeHtml + \n→<br>, fetch https://api.resend.com/emails POST Authorization Bearer apikey Content-Type json body from/to array/reply_to/email/subject/html, if !ok → log details slice 500 →502, catch →502, export default fetch: url pathname /api/contact or /api/contact/ → handleContact, /api/* →404, else ASSETS.fetch
- **Static Assets:** dist/ from Vite build, _headers file for security headers, assets immutable cache
- **Domain:** halilkaraduman.com.tr (custom domain via Cloudflare), www redirect? Not in wrangler but via Cloudflare dashboard
- **Env:** .dev.vars.example RESEND_API_KEY="re_xxx", .dev.vars gitignore, production via `wrangler secret put RESEND_API_KEY`

## 5. Deployment

- **Vite config:** plugin react(), server host 0.0.0.0 port 5173 strictPort false allowedHosts true, preview host 0.0.0.0 port 4173 allowedHosts true — arena preview uyumlu
- **Build:** vite build → dist/, then wrangler deploy (via npm script deploy)
- **Local:** npm run worker:dev → build + wrangler dev (usually localhost:8787)
- **Headers:** public/_headers — /* X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera/geolocation/microphone=(), CSP default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self' https://fonts.gstatic.com; form-action 'self' mailto:; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com, /assets/* Cache-Control public max-age 31536000 immutable
- **SEO:** index.html meta charset viewport title "Halil Karaduman | Psikolog & Geliştirici", description "Psikoloji bilimini daha sade ve güvenilir kılan dijital araçlar ve MMPI değerlendirme platformu.", author, robots index follow, theme-color #ffffff, canonical https://halilkaraduman.com.tr/, preconnect fonts.googleapis.com + gstatic, og:type website, og:site_name, og:title/description/url/image logo-full.png, og:locale tr_TR, twitter card summary
- **No CI:** No .github/workflows in this repo (only in MMPI repo)

## 6. API / Contact

- Only POST /api/contact
- Request: {name,email,message,website?} — website honeypot invisible input display:none tabIndex -1 autocomplete off
- Response: {ok:true} or {ok:false,message}
- Frontend validation + backend validation double
- Resend API: from website@halilkaraduman.com.tr, to contact@halilkaraduman.com.tr, reply_to user email, subject + html
- No database, no storage, no auth
- Rate limiting best-effort Map, not persistent
- No CSRF token (JSON + no cookie auth, not needed)

## 7. Environment variables

- CONTACT_FROM, CONTACT_TO via wrangler.jsonc vars (non-secret)
- RESEND_API_KEY via .dev.vars (local) + wrangler secret (prod) — never frontend, never Git
- No VITE_ vars in this repo

## 8. Security

- CSP strict, no remote scripts, only self + fonts.gstatic.com
- X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy
- Content-Length + body byteLength double check
- Honeypot + rate limit + email regex + length checks + escapeHtml
- No secret in frontend, Resend key only Worker runtime
- No SQL, no DB, no XSS via innerHTML (React escapes, html built server-side with escape)
- No file upload
- No auth, public site

## 9. Strengths

1. **Ultra sade tasarım dili:** 780px max, beyaz palet, 14px radius, pill butonlar, serif+sans kombinasyonu, Newsreader italic vurgu — profesyonel, klinik, güvenilir. Yeni platform için ilham: sade, okunaklı, az renk.
2. **Tipografi sistemi:** DM Sans + Newsreader, 300/400/500/600, letter-spacing negatif başlıklarda, line-height özenli. Yeni platform rapor/PDF için aynı dil kullanılabilir.
3. **Responsive from start:** 760px breakpoint, mobile menu, grid collapse, 40px→32px container — sonradan eklenmemiş, baştan var.
4. **Cloudflare Workers Static Assets + run_worker_first:** /api/* Worker'a, diğerleri ASSETS — secret frontend'e gitmez. Yeni platform da aynı pattern kullanabilir (Supabase key publishable ama service_role asla frontend'e gitmemeli, Edge Function ile benzer).
5. **Security headers + CSP:** _headers dosyası + Worker json no-store, best practice.
6. **Minimal dependencies:** React + Vite + Wrangler sadece, no heavy UI lib. Hızlı, bakımı kolay.
7. **SEO + a11y:** meta, og, canonical, focus-visible, aria-label, role, semantic HTML.
8. **Honeypot + rate limit + fallback mailto:** Bot koruması + ağ hatasında UX (mail uygulaması açılır).
9. **Fotoğraf fallback mantığı:** PHOTO_SOURCES array + onError next + fallback HK monogram — stok foto yerine marka.
10. **Reveal animation:** IntersectionObserver, performanslı, reduced-motion desteği.

## 10. Weaknesses

1. **Monolitik App.jsx:** 385 satır tek dosya, component ayrışması yok, test yok, TypeScript yok. Yeni platformda feature-based split gerekli.
2. **No TypeScript:** Prop validation yok, refactor zor.
3. **No tests:** Unit/E2E yok.
4. **Rate limiting in-memory:** Isolate restart sıfırlanır, persistent değil. Yeni platformda KV/DO veya Supabase rate limit tablosu gerekir.
5. **No CMS:** İçerik kod içinde, sertifikalar placeholder.
6. **Hardcoded social links:** Config dosyası yok.
7. **No i18n:** Sadece Türkçe.
8. **No CI:** Deploy manuel `npm run deploy`.
9. **Google Fonts external:** CSP'de izin var ama offline build değil, privacy için self-host edilebilir.

## 11. Reusable lessons

- ✅ Design tokens :root, --max 780px, --radius 14px, --nav-h 64px — yeni platformda benzer ama daha geniş (dashboard için 1200-1400px) kullanılabilir
- ✅ Typography: DM Sans + Newsreader, 300 weight statement, italic emphasis — rapor başlıklarında kullanılabilir
- ✅ Pill buttons 999px, black primary, ghost secondary — yeni platformda da sade buton sistemi
- ✅ Card: white border radius padding, max-width 520px → yeni platformda danışan kartları için benzer ama daha işlevsel
- ✅ Kicker pill with dot — yeni platformda status badge olarak kullanılabilir
- ✅ Sticky nav + backdrop-filter blur — yeni platform header için
- ✅ Container min() pattern — responsive için
- ✅ _headers security + CSP — yeni platformda da gerekli
- ✅ Worker + Static Assets run_worker_first — yeni platform API için benzer (ama Supabase direkt, Worker sadece gerekirse)
- ✅ Honeypot + rate limit + escapeHtml — form güvenliği için
- ✅ Photo fallback — yeni platformda avatar fallback
- ✅ Reveal + reduced-motion — a11y

## 12. What should NOT be copied

- ❌ Monolitik App.jsx — yeni platformda component split, TypeScript, feature folders
- ❌ No router → hash scroll — yeni platformda History API router (MMPI'deki gibi) + protected routes
- ❌ Single page with sections — yeni platform multi-page dashboard
- ❌ No auth — yeni platformda Supabase Auth zorunlu
- ❌ In-memory rate limit — persistent olmalı
- ❌ No tests — yeni platformda test zorunlu
- ❌ Google Fonts CDN — self-host veya system font tercih edilebilir (KVKK)
