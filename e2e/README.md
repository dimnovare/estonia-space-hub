# Ruumly E2E Smoke Suite

Playwright tests covering the critical customer and partner paths of the Ruumly
storage-rental marketplace frontend.

## Running locally

**Terminal 1 — start the dev server:**
```bash
npm run dev
# Vite starts at http://localhost:8080
```

**Terminal 2 — run tests:**
```bash
npm run test:e2e
```

Interactive UI mode (recommended for debugging):
```bash
npm run test:e2e:ui
```

Single spec:
```bash
npx playwright test e2e/07-critical-paths.spec.ts
```

## Pointing at staging or production

```bash
PLAYWRIGHT_BASE_URL=https://ruumly.eu npx playwright test
```

The `PLAYWRIGHT_BASE_URL` env var overrides the default `http://localhost:8080`.
Note: when running against production, the API-mock routes (`page.route()`) in
07-critical-paths still intercept — tests remain deterministic regardless of live
data. Tests that navigate to real pages (05-navigation, 06-seo-meta) will hit
real HTML/CSS.

## Spec inventory

| File | What it covers |
|------|---------------|
| `01-homepage.spec.ts` | h1 visible, search input, CTA button, Navbar |
| `02-search.spec.ts` | Page loads without crash, filter row, sort dropdown, empty state, URL-driven type param |
| `03-auth.spec.ts` | Login form inputs, submit validation error, register toggle, forgot password |
| `04-provider-onboarding.spec.ts` | Stepper renders, business type selection, Next disabled until required fields filled |
| `05-navigation.spec.ts` | All 6 main routes load without uncaught JS errors or error boundary fallback |
| `06-seo-meta.spec.ts` | `<title>`, `meta[name="description"]`, `og:title`, canonical, hreflang links |
| `07-critical-paths.spec.ts` | Full flow: search with mocked API → listing card → detail → Book button triggers auth/booking |

## Design decisions

- All specs stub `/settings/public` and `/auth/me` via `page.route()` so tests
  run without a live backend.
- `page.waitForTimeout()` is avoided; all waits use `waitForURL`, `waitForSelector`,
  or `expect(...).toBeVisible({ timeout })`.
- No test credentials are required — auth tests only verify form UI.
- Tests run sequentially (`workers: 1`) to avoid state conflicts from shared
  localStorage / session state.
