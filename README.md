# Ruumly — estonia-space-hub

Estonia's marketplace platform for storage, moving, and logistics services.

## Product
Ruumly connects customers with storage providers, moving companies, and trailer rentals across Estonia.
Three user roles: customer, provider (partner), admin.
Frontend built with React 18 + TypeScript + Vite. No backend yet — all data is mock.

## Quick Start
```bash
npm install
cp .env.example .env
npm run dev
```

## Demo Credentials (DevRoleSwitcher — dev only)
- Customer: andres@email.com
- Provider: maria@laopind.ee
- Admin: peeter@ruumly.eu

## Tech Stack
React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, TanStack Query, RHF + Zod, React Router v6, React Leaflet, Recharts

## Folder Structure
```
src/components/       — Shared + admin/ + provider/ sub-components
src/contexts/         — AuthContext (user session)
src/data/             — Mock data arrays
src/hooks/            — TanStack Query custom hooks
src/i18n/             — ET/EN/RU translations + LanguageContext
src/lib/              — apiClient.ts, pricing.ts, queryKeys.ts, schemas.ts
src/pages/            — Route-level pages
src/services/         — types.ts (canonical domain types) + index.ts (service layer)
```

## Backend Integration
See `src/services/index.ts` — each method has `@backend` JSDoc with expected endpoint.
To connect: replace mock `delay()` implementations with `apiClient` calls.
See `src/services/apiClient.ts` for the HTTP client (ready, not yet used).
See `.env.example` for required environment variables.

## Roles
| Role | Access |
|------|--------|
| guest | Browse listings |
| customer | Book + manage bookings |
| provider | Manage listings + orders |
| admin | Full platform access |
