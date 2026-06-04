import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // booking tests must run sequentially to avoid state conflicts
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // In CI, Playwright starts the Vite dev server itself (port 8080, matching baseURL
  // and vite.config.ts). The specs mock all API calls via page.route(), so no backend
  // is needed. Locally, reuseExistingServer lets a developer keep `npm run dev` running.
  webServer: {
    command: 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // E2E mocks every API call via page.route(). The stubs are path-based, so the
      // base URL must be ABSOLUTE and a DIFFERENT origin than the dev server — otherwise
      // requests are same-origin to Vite and bypass the route stubs. CI has no .env
      // (it's gitignored; only .env.example is committed, which Vite does not load), so
      // VITE_API_URL would be empty → same-origin → data never loads. Pin it here so CI
      // matches local. Nothing actually runs on :3000 during tests; stubs intercept first.
      VITE_API_URL: 'http://localhost:3000/api',
    },
  },
});
