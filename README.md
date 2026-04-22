# Ruumly Frontend

React SPA for the Baltic marketplace — warehouse storage, moving services, and trailer rental across Estonia, Latvia, and Lithuania.

- **Live site:** https://ruumly.eu
- **Backend repo:** https://github.com/dimnovare/Ruumly
- **Live API:** https://api.ruumly.eu

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 (SWC) |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| Data | TanStack Query v5 |
| Routing | React Router v6 (code-split routes via `React.lazy`) |
| Forms | React Hook Form + Zod |
| Maps | Leaflet + react-leaflet (lazy chunk, OpenStreetMap tiles) |
| Auth | JWT in HttpOnly cookie + Google OAuth (`@react-oauth/google`) |
| i18n | 5 languages (ET / EN / RU / LV / LT), browser auto-detect |
| Analytics | Google Analytics 4, gated by cookie consent |
| Testing | Vitest + Testing Library, Playwright (e2e) |
| Hosting | Vercel behind Cloudflare (DNS/CDN) |

## Project Structure

```
src/
├── App.tsx                  # Router, providers, route definitions
├── main.tsx                 # Entry, GA init, service worker registration
├── pages/                   # 27 route components
│   ├── HomePage, SearchPage, DetailPages, BookingPage, PaymentReturnPage
│   ├── LoginPage, VerifyEmailPage, AccountPage
│   ├── ProviderPage, ProviderOnboardingPage, ProviderDashboardPage
│   ├── AdminPage
│   ├── CityPage, LocationDetailPage, BlogIndexPage, BlogPostPage
│   └── About / Contact / FAQ / HowItWorks / Terms / Privacy / Cookie / 404
├── components/
│   ├── admin/               # 18 admin panel tabs (Dashboard, Suppliers, Listings,
│   │                        #   Locations, Orders, Payouts, Rebates, Routing, Users,
│   │                        #   Settings, Integrations, Inquiries, Audit, …)
│   ├── provider/            # 14 provider dashboard modules (Overview, Listings,
│   │                        #   IncomingOrders, Calendar, Billing, Analytics,
│   │                        #   Profile, Team, Reviews, Leads, …)
│   ├── ui/                  # shadcn/ui primitives (button, dialog, form, …)
│   └── Navbar, Footer, InteractiveMap, ListingCard, SEO, TrustBar,
│       ErrorBoundary, ProtectedRoute, CookieConsent, …
├── hooks/                   # queries.ts + useBookings, useOrders, useUsers,
│                            #   useSuppliers, useMessages, useNotifications,
│                            #   useFavorites, usePlatformSettings, useDebounce, …
├── services/
│   ├── apiClient.ts         # fetch wrapper, cookie auth, timeouts, error mapping
│   ├── index.ts             # 20 service modules (auth, user, supplier, listing,
│   │                        #   location, order, booking, payment, invoice,
│   │                        #   message, notification, audit, bank, security,
│   │                        #   rebate, routing, integrationSettings,
│   │                        #   listingExtras, publicSettings, provider)
│   └── types.ts             # Shared API types
├── contexts/AuthContext.tsx
├── i18n/
│   ├── LanguageContext.tsx  # Detects, persists, and broadcasts locale
│   └── translations.ts      # All 5 locales (single source of truth)
├── lib/                     # analytics, blog, constants, pricing, schemas,
│                            #   queryKeys, dateUtils, utils
├── content/blog/            # Markdown blog posts
└── test/                    # Vitest setup + unit tests
```

## Quick Start

**Prerequisites:** Node 20+, npm (the repo pins `legacy-peer-deps=true` via `.npmrc`).

```bash
git clone https://github.com/dimnovare/Ruumly.git frontend   # if not already cloned
cd estonia-space-hub
npm install
cp .env.example .env                                         # edit values (see below)
npm run dev                                                  # http://localhost:8080
```

The backend must be running at `VITE_API_URL` (default `http://localhost:3000/api`). See the [backend repo](https://github.com/dimnovare/Ruumly) for its setup.

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server on port 8080 |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Build with dev-mode source maps |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest (one-shot) |
| `npm run test:watch` | Vitest (watch mode) |

## Environment Variables

All variables are Vite-exposed and must start with `VITE_`.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `VITE_API_URL` | yes | `http://localhost:3000/api` | Backend base URL |
| `VITE_GOOGLE_CLIENT_ID` | yes | — | Google OAuth client ID |
| `VITE_APP_URL` | yes | `https://ruumly.eu` | Canonical site URL (SEO/OG tags) |
| `VITE_APP_NAME` | no | `Ruumly` | App name used in SEO |
| `VITE_API_TIMEOUT` | no | `10000` | fetch timeout in ms |
| `VITE_MAP_TILE_URL` | no | OSM tiles | Leaflet tile URL template |
| `VITE_GA_ID` | no | — | GA4 measurement ID (e.g. `G-XXXXXXXXX`) — only loaded after cookie consent |
| `VITE_ENABLE_PAYMENTS` | no | `false` | Feature flag for live Montonio flow |

## Features

**Customer:** location search with filter chips, result cards with rating and availability, map view (Leaflet, lazy-loaded), 3-step booking wizard with inline auth, Montonio-backed payment, booking history and messaging from the account page, review submission after completion, 5-language UI with browser auto-detect, SEO-friendly city landing pages (`/storage/:slug`) and blog (`/blog`, `/blog/:slug`).

**Provider:** dashboard overview, listing CRUD with image upload, incoming order triage with lead notes/status, accept/confirm flow, calendar with iCal export, monthly analytics, team management, IBAN and billing settings, onboarding wizard.

**Admin:** revenue dashboard with per-supplier margin, listings/locations/orders/users/suppliers management, payouts and rebates, order routing rules, per-supplier integration settings, feature-definition and extras editor, platform settings, audit log, inquiry inbox, About/CMS content editor.

## Routing

Public routes render inside a `<WithFooter>` layout; full-bleed routes (search, admin, account, provider dashboard/onboarding) render inside `<NoFooter>`. Role-gated routes use `<ProtectedRoute allowedRoles={…}>`.

See `src/App.tsx` for the complete route table.

## Auth & Roles

JWT is issued by the backend in an HttpOnly cookie; `apiClient` sends `credentials: "include"` on every request. Google OAuth is handled via `@react-oauth/google` and exchanged at the backend for the same session cookie.

| Role | Access |
|------|--------|
| Guest | Public pages, search, listings, city pages, blog |
| Customer | + bookings, account, messages, reviews |
| Provider | + provider dashboard, listings, orders, calendar, billing |
| Admin | + admin panel (all management tabs) |

In development, `<DevRoleSwitcher />` is mounted for quick role switching against seeded data.

## Dev Credentials (local seed)

| Role | Email | Password |
|------|-------|----------|
| Customer | `andres@email.com` | `demo1234` |
| Provider | `maria@laopind.ee` | `demo1234` |
| Admin | `peeter@ruumly.eu` | `demo1234` |

## i18n

`src/i18n/translations.ts` holds all copy across ET, EN, RU, LV, LT. `LanguageContext` detects the browser locale on first visit, persists the choice, and re-renders consumers on change. Zod schemas read translated messages via a factory so form errors stay localised.

## SEO

Each page sets `<title>` / `<meta>` / Open Graph tags via `react-helmet-async` (`<SEO />` component). Googlebot executes JS directly, so the SPA renders fine without SSR; city and blog pages are pre-structured with canonical URLs. `sitemap.xml` and `robots.txt` are served by the backend at `api.ruumly.eu` and transparently rewritten to the canonical origin (`ruumly.eu/sitemap.xml`) by `vercel.json` — search engines get a clean 200, no 308.

## Deployment

- **Vercel** builds `npm run build` and serves `dist/`.
- **`vercel.json`** defines: asset caching headers (immutable for `/assets/*`, no-cache elsewhere), rewrites for `/sitemap.xml` and `/robots.txt` to the API, and a SPA fallback to `/index.html`.
- **Cloudflare** sits in front for DNS and CDN.
- The service worker (`public/sw.js`) is registered on load.
- Chunk-load failures auto-reload once per session to recover from stale deployments.

Push to `main` → Vercel deploys in ~2 minutes.

## License

Proprietary. Copyright © 2026 Ruumly. All rights reserved.
