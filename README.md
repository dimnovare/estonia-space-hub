# Ruumly — Frontend

React 18 single-page application for the Ruumly marketplace. Serves customers searching for storage, moving, and trailer services across Estonia, Latvia, and Lithuania, as well as the provider dashboard and full admin back-office.

- **Live site:** https://ruumly.eu
- **Backend repo / API:** https://github.com/dimnovare/Ruumly — `https://api.ruumly.eu`

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Routing](#routing)
6. [Authentication & Roles](#authentication--roles)
7. [Internationalisation](#internationalisation)
8. [State Management & Data Fetching](#state-management--data-fetching)
9. [Styling](#styling)
10. [Testing](#testing)
11. [Build & Deployment](#build--deployment)
12. [Development Notes](#development-notes)

---

## Technology Stack

| Category | Technology | Version |
|---|---|---|
| Framework | React | 18.3 |
| Build tool | Vite + SWC | 5.4 |
| Language | TypeScript | 5.8 |
| Routing | React Router DOM | 6.30 |
| Data fetching | TanStack React Query | 5.83 |
| Forms | React Hook Form + Zod | 7.x / 3.x |
| UI primitives | Radix UI (full suite) | latest |
| Styling | Tailwind CSS | 3.4 |
| Icons | Lucide React | 0.462 |
| Maps | Leaflet + React Leaflet | 1.9 / 5.0 |
| Charts | Recharts | 2.15 |
| Toasts | Sonner | 1.7 |
| Date utilities | date-fns | 3.6 |
| Google OAuth | @react-oauth/google | 0.12 |
| Analytics | Google Analytics 4 — gated by cookie consent | — |
| Testing | Vitest + Testing Library | 3.x |
| E2E testing | Playwright | 1.57 |
| Linting | ESLint 9 + typescript-eslint | — |
| Hosting | Vercel behind Cloudflare | — |

---

## Project Structure

```
estonia-space-hub/
├── public/
│   ├── manifest.json             # PWA manifest
│   └── ...                       # Favicons (48, 192, 512 px), apple-touch-icon
├── src/
│   ├── components/
│   │   ├── admin/                # 20 admin panel tab components
│   │   ├── provider/             # 15 provider dashboard modules
│   │   ├── search/               # SizeBucketFilter and related
│   │   └── ui/                   # 50 Radix-based design-system components
│   ├── contexts/
│   │   └── AuthContext.tsx       # JWT session, token refresh, role
│   ├── hooks/                    # 19 custom React hooks
│   ├── i18n/
│   │   ├── translations.ts       # All 5-language string dictionaries (single source)
│   │   ├── LanguageContext.tsx   # t() provider + language detection/persistence
│   │   └── routing.tsx           # Lang-prefix helpers
│   ├── lib/                      # Utility helpers (analytics, pricing, dates, schemas, …)
│   ├── pages/                    # 30 page-level components
│   ├── services/
│   │   ├── apiClient.ts          # Fetch wrapper: auth injection, refresh, error mapping
│   │   ├── index.ts              # Service layer: API calls + response normalisation
│   │   ├── queryKeys.ts          # Typed TanStack Query key factory (all keys here)
│   │   └── types.ts              # Shared TypeScript interfaces
│   ├── test/                     # Vitest setup + unit tests
│   ├── types/                    # Additional TS types
│   ├── content/blog/             # Markdown blog posts
│   ├── App.tsx                   # Router definition + QueryClient config
│   └── main.tsx                  # Entry point (GA init, providers)
├── .env.example
├── index.html                    # Static shell, SSR LCP hero, PWA meta
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

### Admin components (`src/components/admin/`)

`AdminDashboard`, `AdminSuppliers`, `AdminUsers`, `AdminListings`, `AdminLocations`, `AdminLocationsGeocode`, `AdminOrders`, `AdminPayouts`, `AdminRebates`, `AdminRouting`, `AdminIntegrations`, `AdminInquiries`, `AdminSettings`, `AdminAudit`, `AdminContent`, `AdminAboutPage`, `AdminExtrasOverrides`, `AdminSidebar`, `ImageUploader`

### Provider components (`src/components/provider/`)

`ProviderOverview`, `ProviderListings`, `ProviderIncomingOrders`, `ProviderCalendar`, `ProviderBilling`, `ProviderAnalytics`, `ProviderProfile`, `ProviderTeam`, `ProviderReviews`, `ProviderPartnerPage`, `ProviderBookings`, `ListingExtrasManager`, `LeadNotesEditor`, `LeadStatusChip`, `LeadSummaryStrip`

---

## Getting Started

### Prerequisites

- Node.js 20+
- The Ruumly backend running locally (see [`../Ruumly.Backend/README.md`](../Ruumly.Backend/README.md))

### Installation

```bash
git clone https://github.com/dimnovare/estonia-space-hub.git
cd estonia-space-hub

npm install

# Copy and populate environment variables
cp .env.example .env.local

npm run dev
# → http://localhost:8080
```

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 8080, HMR enabled |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Production build with dev-mode source maps |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint 9 across all TypeScript files |
| `npm test` | Vitest one-shot run |
| `npm run test:watch` | Vitest in watch mode |

### Dev credentials (local seed)

| Role | Email | Password |
|---|---|---|
| Customer | `andres@email.com` | `demo1234` |
| Provider | `maria@laopind.ee` | `demo1234` |
| Admin | `peeter@ruumly.eu` | `demo1234` |

A `<DevRoleSwitcher />` component is mounted in Development for quick role switching without re-logging in.

---

## Environment Variables

All variables are `VITE_`-prefixed so Vite exposes them to the browser bundle. Copy `.env.example` and fill in values — never commit a `.env` file with real credentials.

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | **yes** | `http://localhost:3000/api` | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | **yes** | — | Google OAuth client ID |
| `VITE_APP_URL` | **yes** | `https://ruumly.eu` | Canonical public URL (SEO / OG tags) |
| `VITE_APP_NAME` | no | `Ruumly` | App name used in page titles |
| `VITE_API_TIMEOUT` | no | `10000` | Fetch timeout in milliseconds |
| `VITE_MAP_TILE_URL` | no | OpenStreetMap tiles | Leaflet tile URL template |
| `VITE_GA_ID` | no | — | GA4 measurement ID — only injected after cookie consent |
| `VITE_ENABLE_PAYMENTS` | no | `false` | Feature flag to enable live Montonio payment flow |
| `VITE_LEGAL_ENTITY_NAME` | no | `Ruumly` | Legal entity name shown in footer/terms |

---

## Routing

All routes are prefixed with `/:lang` (e.g. `/et/search`, `/en/about`). A `LangParamGuard` component enforces the prefix; requests without a recognised prefix are redirected to the browser's detected language. `ScrollToTop` fires on navigation but is a no-op when only the language prefix changes.

### Public routes

| Path | Page |
|---|---|
| `/:lang/` | Home |
| `/:lang/search` | Search results |
| `/:lang/warehouse/:id` | Warehouse listing detail |
| `/:lang/moving/:id` | Moving service detail |
| `/:lang/trailer/:id` | Trailer rental detail |
| `/:lang/location/:id` | Supplier location detail |
| `/:lang/book` | Booking checkout |
| `/:lang/payment/return` | Montonio payment return handler |
| `/:lang/partner/:slug` | Public supplier partner page |
| `/:lang/storage/:slug` | City SEO landing page |
| `/:lang/provider` | Provider marketing page |
| `/:lang/about` | About |
| `/:lang/how-it-works` | How it works |
| `/:lang/faq` | FAQ |
| `/:lang/blog` | Blog index |
| `/:lang/blog/:slug` | Blog post |
| `/:lang/contact` | Contact |
| `/:lang/login` | Login / register |
| `/:lang/verify` | Email verification |
| `/:lang/terms` | Terms of service |
| `/:lang/privacy` | Privacy policy |
| `/:lang/cookies` | Cookie policy |

### Authenticated routes

| Path | Page | Minimum role |
|---|---|---|
| `/:lang/account` | Customer account | Any |
| `/:lang/account/request/:id` | Booking request detail | Any |
| `/:lang/bookings/:id` | Booking redirect / deep-link | Any |
| `/:lang/provider/onboarding` | Provider onboarding | Any |
| `/:lang/provider/dashboard` | Provider dashboard | Provider / Admin |

### Admin routes

| Path | Page |
|---|---|
| `/:lang/admin` | Admin panel |
| `/:lang/admin/*` | Admin panel (nested tab) |
| `/:lang/admin/partners` | Partner list |
| `/:lang/admin/partners/:partnerId` | Partner detail |

Public routes render in a `<WithFooter>` layout; search, account, provider, and admin routes render in a `<NoFooter>` layout. All heavy page components are code-split via `React.lazy` + `Suspense`.

---

## Authentication & Roles

JWT is issued by the backend in an HttpOnly cookie. `apiClient` sends `credentials: "include"` on every request. A 401 response triggers a silent token refresh; if that also fails the user is redirected to login.

Google OAuth is handled via `@react-oauth/google`. The Google ID token is exchanged at `POST /api/auth/google` for the same session cookie.

| Role | Access |
|---|---|
| Guest | Public pages, search, listings, blog, city pages |
| Customer | + bookings, account, messages, reviews, notifications |
| Provider | + provider dashboard, listings, locations, orders, calendar, billing, team |
| Admin | + full admin panel |

---

## Internationalisation

The app supports **5 languages**: Estonian (`et`, default), English (`en`), Russian (`ru`), Latvian (`lv`), and Lithuanian (`lt`).

### How it works

- `src/i18n/translations.ts` is the single source of truth — one large object keyed by language code, each containing a flat dictionary of `"dotted.key"` → string.
- `LanguageContext.tsx` provides `t(key)` and the active `lang` string via React context. The language is persisted in `localStorage` under `ruumly-lang` and kept in sync with the `/:lang` URL prefix.
- `index.html` contains a static inline hero section with all 5 language strings rendered before React mounts — this is intentional for Lighthouse LCP scores.
- Zod validation schemas accept a language parameter so form error messages are fully localised.

### Adding a translation key

1. Add the key and all 5 translations to each language object in `src/i18n/translations.ts`.
2. Use `t("your.new.key")` in any component.
3. The test in `src/test/translations.test.ts` validates that every key has a value in all 5 language dictionaries — run `npm test` to verify coverage.

---

## State Management & Data Fetching

All server state is managed by **TanStack React Query**. There is no Redux, Zustand, or other global store.

### QueryClient defaults

| Setting | Value |
|---|---|
| `staleTime` | 30 seconds |
| `retry` | 4xx responses are not retried |
| `placeholderData` | Previous data shown during refetch (`keepPreviousData` equivalent) |
| Mutation `onError` | Shows a localised toast via Sonner |

### Query key factory

All query keys are defined as typed factory functions in `src/services/queryKeys.ts`. Raw string arrays are not used anywhere else in the codebase. This ensures correct cache invalidation and prevents typo-related cache misses.

```ts
// Examples
queryKey: queryKeys.listings.all({ city: "Tallinn" })
queryKey: queryKeys.adminLocations.all(supplierId)
queryKey: queryKeys.rebateInvoices.byPeriod("2026-05")
queryKey: queryKeys.supplierProfile.byId(supplierId)
```

### Service layer

`src/services/index.ts` exports typed service objects (`listingService`, `bookingService`, `userService`, etc.). Each method wraps `apiClient` and normalises the response into the types defined in `types.ts`.

`apiClient.ts` responsibilities:
- Base URL from `VITE_API_URL`, timeout from `VITE_API_TIMEOUT`
- `Authorization: Bearer <token>` injection on every request
- Automatic silent token refresh on 401, then retry
- Structured error normalisation

---

## Styling

The design system is built on **Tailwind CSS** with a full CSS-variable token set, enabling light/dark mode switching via the `class` strategy (`next-themes`).

### Design tokens

All colours, radii, and spacing are CSS variables in `src/index.css`. The palette includes: `background`, `foreground`, `primary`, `secondary`, `accent`, `muted`, `destructive`, `success`, `warning`, `info`, `card`, `popover`, `border`, `input`, `ring`, and a complete `sidebar` token set (8 sub-tokens).

### Typography

- **Body:** DM Sans (400, 500, 600, 700) — `font-sans`
- **Display / headings:** Manrope (400–800) — `font-display`

Both loaded from Google Fonts with `<link rel="preload">` in `index.html`.

### Component library

`src/components/ui/` contains **50 components** built on Radix UI primitives and styled with `class-variance-authority` (CVA). These are the canonical wrapper components — all other components import from `ui/` rather than Radix directly.

### Bundle chunks

Vite splits the output into named vendor chunks to improve parallel loading and long-term caching:

| Chunk | Contents |
|---|---|
| `vendor-react` | react, react-dom |
| `vendor-routing` | react-router-dom, @tanstack/react-query |
| `vendor-maps` | leaflet, react-leaflet |
| `vendor-charts` | recharts |
| `vendor-ui` | Core Radix UI dialog, dropdown, select, tabs, toast |

Chunk size warning threshold: **600 KB**.

---

## Testing

```bash
# Unit tests (Vitest)
npm test

# Watch mode
npm run test:watch

# End-to-end tests (Playwright)
npx playwright test
```

Test files live in `src/test/`:

| File | Description |
|---|---|
| `booking.test.ts` | Booking flow unit tests |
| `translations.test.ts` | Validates every translation key exists in all 5 language dicts |
| `example.test.ts` | Component smoke tests |
| `setup.ts` | `@testing-library/jest-dom` matcher setup |

---

## Build & Deployment

```bash
npm run build      # Output → dist/
npm run preview    # Serve dist/ locally
```

### Vercel

The app deploys to **Vercel** on every push to `main` (~2 min build time). `vercel.json` configures:
- **Asset caching:** immutable `Cache-Control` for `/assets/*`; `no-store` for everything else.
- **Rewrites:** `/sitemap.xml` and `/robots.txt` proxy to the backend API so search engines receive a clean 200 on the canonical origin.
- **SPA fallback:** all unmatched paths rewrite to `/index.html`.

Preview deployments are named `estonia-space-hub-*.vercel.app` and are explicitly allowed by the backend CORS policy.

### Cloudflare

Cloudflare sits in front of Vercel as DNS and CDN. The backend API (`api.ruumly.eu`) is a separate origin on Railway behind the same Cloudflare zone.

### PWA

`manifest.json` ships icons at 48, 192, and 512 px. `theme-color` is `#00897B`. `apple-mobile-web-app-capable` is set for iOS standalone mode. A service worker (`public/sw.js`) is registered on load; chunk-load failures auto-reload once per session to recover from stale cached assets after a new deploy.

### SEO

- Per-route `<title>` and `<meta>` tags via `@unhead/react` (`<SEO />` component).
- Open Graph (`og:url`, `og:locale`, `og:image`) and Twitter Card tags in `index.html`.
- Google site verification meta tag present.
- `sitemap.xml` and `robots.txt` served dynamically by the backend `SitemapController`.

---

## Development Notes

### Maintenance mode

`usePlatformSettings` reads a `maintenanceMode` flag from the backend. When enabled, all routes except `/login` show `MaintenancePage` for non-admin users — no code deploy required.

### Admin panel

`AdminPage.tsx` is a single tabbed shell hosting all 20 admin sub-components. Each component manages its own query/mutation lifecycle independently. Tab state is synchronised with the URL hash for deep-linking.

### Provider dashboard

`ProviderDashboardPage.tsx` is a tabbed shell for the 15 provider components. The active supplier is resolved via `useImpersonatedSupplierId` — admins can impersonate any supplier without re-authenticating.

### Feature flags

`usePlatformSettings` and `useFeatureDefinitions` expose runtime flags set by admins in the platform settings panel. Components gate features behind these hooks rather than build-time constants, so features can be toggled without a deploy.

### Map

`InteractiveMap` uses `react-leaflet` with configurable tile URL (`VITE_MAP_TILE_URL`). Leaflet is isolated in the `vendor-maps` chunk and lazily loaded only on pages that render a map, keeping the initial bundle small.
