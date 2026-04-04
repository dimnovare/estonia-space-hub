# Ruumly — Frontend

Baltic marketplace for warehouse storage, moving services, and trailer rental. Compare prices, book in minutes.

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
| State | TanStack Query v5, React Context (auth, language) |
| Forms | React Hook Form + Zod (translated factory schemas) |
| Routing | React Router v6 |
| Maps | Leaflet (lazy-loaded, language-aware center) |
| Auth | JWT (HttpOnly cookie) + Google OAuth |
| i18n | 5 languages (ET/EN/RU/LV/LT), 1,551 keys, browser auto-detect |
| Analytics | Google Analytics 4 with conversion events |
| Deployment | Vercel + Cloudflare (DNS/CDN) |

## Project Structure

src/
├── pages/                 # 25 route pages
├── components/
│   ├── admin/             # 17 admin panel components
│   ├── provider/          # 11 provider dashboard components
│   ├── ui/                # shadcn/ui primitives
│   └── ...                # Navbar, Footer, Map, TrustBar, SEO, etc.
├── services/              # API client, service layer, types
├── hooks/                 # React Query hooks, features, notifications
├── contexts/              # AuthContext, LanguageContext
├── i18n/                  # 1,551 keys × 5 languages
└── lib/                   # Constants, pricing, Zod schemas, analytics

## Quick Start

npm install
cp .env.example .env
npm run dev

Environment: VITE_API_URL (required), VITE_GOOGLE_CLIENT_ID (required), VITE_GA_ID (optional)

## Key Features

Customer: Search with dynamic filters, urgency badges, review ratings on cards. 3-step booking wizard with inline auth, real-time pricing, Montonio payment. 5-language support with browser auto-detect. SEO city landing pages. Mobile-first with 44px touch targets.

Provider: Overview with tier warning banner. Unit management with image upload. Order approve/confirm flow. Calendar with iCal export. Monthly analytics charts. Plan change and IBAN management.

Admin: Revenue dashboard with per-supplier margin breakdown. 17 management tabs. Custom payload templates per supplier. Feature definition editor. Tier configuration.

## Roles

Guest → Homepage, search, listings, city pages
Customer → + Booking, account, messages, reviews
Provider → + Dashboard, listings, orders, calendar, billing
Admin → + All 17 admin management tabs

## Dev Credentials (local + seed data)

Customer: andres@email.com / demo1234
Provider: maria@laopind.ee / demo1234
Admin: peeter@ruumly.eu / demo1234

## Deployment

Vercel behind Cloudflare. Page Rules redirect /sitemap.xml and /robots.txt to backend API.

## License

Proprietary. All rights reserved.
