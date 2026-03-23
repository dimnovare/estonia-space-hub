# Ruumly — Frontend

Estonia's marketplace for storage, moving services,
and trailer rental.

**Live:** https://app.ruumly.eu
**Backend:** https://github.com/dimnovare/Ruumly

## Stack
React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui
TanStack Query v5 · React Hook Form + Zod
React Router v6 · React Leaflet · @react-oauth/google

## Quick Start
```bash
npm install
cp .env.example .env
# Set VITE_API_URL and VITE_GOOGLE_CLIENT_ID in .env
npm run dev
```

## Environment Variables
| Variable | Required | Description |
|---|---|---|
| VITE_API_URL | Yes | Backend URL e.g. http://localhost:3000/api |
| VITE_GOOGLE_CLIENT_ID | Yes | From console.cloud.google.com |

## Roles
| Role | Access |
|---|---|
| guest | Browse, search, view listings |
| customer | Book, messages, invoices, account |
| provider | Listings, incoming orders, calendar |
| admin | Users, suppliers, routing, settings, audit |

## Dev Credentials (backend required)
- Customer: andres@email.com / demo1234
- Provider: maria@laopind.ee / demo1234
- Admin: peeter@ruumly.eu / demo1234
