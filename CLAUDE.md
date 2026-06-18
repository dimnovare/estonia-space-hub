# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

React 18 + Vite + TypeScript + TanStack Query + shadcn/ui + Tailwind CSS. Deployed on Vercel
behind Cloudflare. The backend (ASP.NET Core) lives in the parent directory `../Ruumly.Backend/`.
The Cloudflare social-preview Worker lives in `../workers/social-preview/`.

## Commands

```bash
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # production build
npx tsc --noEmit     # type-check (run before declaring any edit done)
npm run lint         # eslint
npm run test         # vitest run (single pass)
npm run test:watch   # vitest watch mode
```

Single test file: `npx vitest run src/path/to/file.test.tsx`

## Current focus

**Free partner-acquisition marketplace** — all three verticals public: Storage,
Moving, Trailers. `showMovingService` / `showTrailerService` default **visible**
and are admin-toggleable (no longer "hidden launch" flags). Always use
`usePlatformSettings()` for service-type-dependent UI; never hardcode visibility.
Listing is **free**; monetization = optional paid features/boosts
(`PaidFeature` / `ProviderBoosts`) — **never** mandatory plans/commission in any
public or partner-facing UI. Booking/payment/contract infra stays, enabled
optionally per partner/listing. Design system per the redesign handoff
(navy `#173B8D` / green `#0A9881` / teal `#51CDD4`; Plus Jakarta Sans headings).

## Routing — language-prefixed URLs

Every public route is prefixed with a language segment: `/{lang}/…` (et/en/ru/lv/lt).
`src/i18n/routing.tsx` re-exports drop-in replacements for react-router-dom:

```ts
// Always import from here, never from react-router-dom directly:
import { Link, NavLink, Navigate, useNavigate, useParams, useSearchParams,
         useLocation, Routes, Route, BrowserRouter, Outlet } from "@/i18n/routing";
```

The wrappers automatically prepend the active language to any absolute path.
`LangRedirect` handles bare `/` → `/{lang}/`. `LangParamGuard` rejects invalid lang params.

## i18n

All user-facing strings live in `src/i18n/translations.ts`. Every key **must** exist in all
5 language blocks (et, en, ru, lv, lt) or the TypeScript union type will catch it.
Geography differs by language: et=Estonia, en/ru=Baltics, lv=Latvia, lt=Lithuania.

## API client and service layer

`src/services/apiClient.ts` — single `ApiClient` class used by everything:
- Access token: in-memory only (`tokenStore`). Refresh token: HttpOnly cookie.
- On 401 with an access token, auto-calls `POST /auth/refresh` then retries once.
- Sends `Accept-Language: {lang}` on every request (reads `localStorage["ruumly-lang"]`).
- `VITE_API_URL` env var sets the base URL (empty in dev → relative paths / Vite proxy).

`src/services/index.ts` — typed service objects (`userService`, `supplierService`,
`listingService`, `bookingService`, etc.) that call `apiClient` and normalise responses.

`src/services/unwrapPaginated.ts` — use this for any list endpoint; handles both raw
arrays and `{ data: [...] }` envelope shapes.

## Data fetching (TanStack Query)

Custom hooks in `src/hooks/queries.ts` (e.g. `useListings`, `useLocations`, `useListing`).
Cache keys come from `src/services/queryKeys.ts` — always use these for consistency.
`usePlatformSettings()` in `src/hooks/usePlatformSettings.ts` fetches `/settings/public`
and exposes feature flags; defaults (`FALLBACK`) preserve current behaviour when offline.

## Authentication

`AuthContext` (`src/contexts/AuthContext.tsx`) provides `user`, `login`, `logout`.
Email verification is enforced via `EmailVerificationGate` component.
Provider/supplier impersonation for admin: `useImpersonatedSupplierId()` +
`withSupplier(endpoint, supplierId)` helper (`src/lib/withSupplier.ts`).

## Conventions

- `npx tsc --noEmit` must pass with zero errors before any edit is complete.
- All 5 language blocks in `translations.ts` must stay in sync (equal key count).
- Admin UI is in `src/components/admin/` and `src/pages/Admin*.tsx`.
- Provider portal UI is in `src/components/provider/` and `src/pages/Provider*.tsx`.
- Shared UI primitives come from shadcn/ui (Radix + Tailwind); add via `npx shadcn-ui@latest add <component>`.
- `PlatformSettings` keys are strings from `/settings/public`; boolean flags default to `true` in `FALLBACK`.
