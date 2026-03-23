# Ruumly — Frontend

Estonia's marketplace for storage, moving services,
and trailer rental.

**Live:** https://app.ruumly.eu
**API:** https://api.ruumly.eu
**Backend repo:** https://github.com/dimnovare/Ruumly

## Stack
React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui
· TanStack Query v5 · React Hook Form + Zod · React Router v6
· React Leaflet · Recharts · @react-oauth/google

## Quick Start
```bash
npm install
cp .env.example .env
# Fill in VITE_API_URL and VITE_GOOGLE_CLIENT_ID
npm run dev
```

## Environment Variables
| Variable | Description |
|---|---|
| VITE_API_URL | Backend API base URL (e.g. http://localhost:3000/api) |
| VITE_GOOGLE_CLIENT_ID | Google OAuth Client ID from console.cloud.google.com |

## Roles
| Role | Access |
|---|---|
| guest | Browse listings, search, view details |
| customer | Book services, manage bookings, messages, invoices |
| provider | Manage listings, incoming orders, calendar |
| admin | Full platform: users, suppliers, routing, settings, audit |

## Dev Credentials (requires backend running)
- Customer: andres@email.com / demo1234
- Provider: maria@laopind.ee / demo1234
- Admin: peeter@ruumly.eu / demo1234

## Backend Setup
See https://github.com/dimnovare/Ruumly for backend
prerequisites (PostgreSQL, .NET 8 SDK).
