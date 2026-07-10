import { defineConfig, devices } from "@playwright/test";

/**
 * Production-build Playwright config — the head-in-DOM SEO gate.
 *
 * WHY A SEPARATE CONFIG: the default config (playwright.config.ts) runs specs
 * against the Vite DEV server (`npm run dev`). The react-helmet-async → @unhead
 * migration exists because head tags flushed fine in DEV but emitted NOTHING in
 * the PRODUCTION build (minified, React 18 createRoot). A dev-server test can't
 * catch that class of defect, so this config builds the real bundle and serves
 * it with `vite preview`, then asserts the per-page title/description/canonical/
 * hreflang/JSON-LD actually reach document.head. testDir is ./e2e-prod so the
 * default `./e2e` run never picks these up (and vice-versa).
 */
const PORT = 4173;

export default defineConfig({
  testDir: "./e2e-prod",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Build then preview. The specs mock every API call via page.route(), and the
    // base URL is pinned to a DIFFERENT origin so those stubs intercept (same as
    // the dev config). VITE_API_URL is set for the BUILD step so it is baked in.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      VITE_API_URL: "http://localhost:3000/api",
    },
  },
});
