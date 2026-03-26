# Ruumly — Frontend

Estonia's marketplace for warehouse storage, moving services, and trailer rental.

**Live:** https://ruumly.eu
**Backend repo:** [Ruumly](https://github.com/dimnovare/Ruumly)
**API:** https://api.ruumly.eu

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS + shadcn/ui |
| State | TanStack Query v5 (server state), React Context (auth) |
| Forms | React Hook Form + Zod validation |
| Routing | React Router v6 |
| Maps | React Leaflet (lazy-loaded) |
| Auth | JWT + Google OAuth (@react-oauth/google) |
| i18n | Custom context with ET/EN/RU (3,400+ translation strings) |
| Analytics | Google Analytics 4 (optional) |
| Deployment | Vercel |

## Project Structure

```
src/
├── pages/              # 24 route pages
│   ├── HomePage         # Hero, search, featured listings, trust bar, FAQ
│   ├── SearchPage       # Filters, listing grid, location cards
│   ├── BookingPage      # 3-step wizard (details → contact → payment)
│   ├── LoginPage        # Login, register, forgot password, verify-sent
│   ├── VerifyEmailPage  # Email verification token handler
│   ├── AdminPage        # Tabbed admin panel (users, suppliers, orders, settings)
│   ├── ProviderDashboardPage  # Provider analytics, bookings, listings, team
│   ├── ProviderOnboardingPage # 3-step supplier application
│   ├── AccountPage      # User profile, bookings, invoices, messages
│   └── ...              # About, FAQ, Contact, Terms, Privacy, Cookies, etc.
├── components/
│   ├── admin/           # 11 admin panel tab components
│   ├── provider/        # 9 provider dashboard components
│   ├── ui/              # shadcn/ui primitives
│   └── ...              # Navbar, Footer, ListingCard, TrustBar, SEO, etc.
├── services/
│   ├── apiClient.ts     # HTTP client with JWT refresh + retry
│   ├── index.ts         # Service layer (all API calls)
│   └── types.ts         # Shared TypeScript types
├── hooks/               # React Query hooks, notifications, favorites
├── contexts/            # AuthContext (JWT + Google OAuth)
├── i18n/                # Translations (ET, EN, RU)
├── lib/                 # Constants, pricing logic, Zod schemas, analytics
└── test/                # Vitest setup
```

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your API URL and Google Client ID
npm run dev              # http://localhost:5173
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| VITE_API_URL | Yes | Backend API URL (e.g. http://localhost:3000/api or https://api.ruumly.eu) |
| VITE_GOOGLE_CLIENT_ID | Yes | Google OAuth client ID from console.cloud.google.com |
| VITE_GA_ID | No | Google Analytics 4 measurement ID (G-XXXXXXXXX) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |
| `npm test` | Run Vitest tests |

## Key Features

- **Booking flow** — 3-step wizard with Zod validation, inline auth, real-time pricing sidebar, mobile sticky bar
- **Email verification** — post-registration "check your email" screen + /verify token handler page
- **Tier-aware pricing** — frontend pricing.ts accepts dynamic commission rates matching backend tiers
- **Multi-language** — Estonian, English, Russian with 3,400+ translation strings, language auto-detection
- **SEO** — per-page meta tags, canonical URLs, Schema.org structured data, dynamic sitemap via backend
- **Trust signals** — dynamic stats bar (hides zero values), testimonials, FAQ accordion, beta badge
- **Provider dashboard** — analytics, incoming orders, listings management, team invites, billing
- **Admin panel** — users, suppliers, listings, locations, orders, integrations, routing rules, settings, audit log
- **Responsive** — mobile-first design with sticky bottom bars, drawer navigation
- **PWA-ready** — manifest.json, service worker, app icons

## Roles & Access

| Role | Can Access |
|------|-----------|
| Guest | Homepage, search, listing details, about/FAQ/contact pages |
| Customer | + Booking, account, messages, invoices, reviews |
| Provider | + Provider dashboard, listings, orders, team management |
| Admin | + Admin panel with all management tabs |

## Dev Credentials (with local backend + seed data)

| Role | Email | Password |
|------|-------|----------|
| Customer | andres@email.com | demo1234 |
| Provider | maria@laopind.ee | demo1234 |
| Admin | peeter@ruumly.eu | demo1234 |

Note: Dev accounts are pre-verified. In production, new accounts require email verification before booking.

## Deployment

Deployed on **Vercel**. The `vercel.json` rewrites `/sitemap.xml` and `/robots.txt` to the backend API, and all other routes to `index.html` for SPA routing.

## License

Proprietary. All rights reserved.
