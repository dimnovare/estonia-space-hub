import { test, expect } from "@playwright/test";
import { stubCommon, stubListings, stubLoggedOut } from "./fixtures";

/**
 * 05 — Navigation smoke tests
 *
 * For each main route: assert the Navbar <header> renders and the app does NOT
 * fall back to the ErrorBoundary ("Something went wrong" / "Midagi läks valesti").
 * All routes are verified to exist in src/App.tsx. Every route gets the shared
 * fixtures so required endpoints return correct shapes (otherwise the app
 * crashes into the ErrorBoundary and renders nothing).
 */

const routes = [
  { path: "/et", label: "Home" },
  { path: "/et/search", label: "Search" },
  { path: "/et/provider", label: "Provider landing" },
  { path: "/et/about", label: "About" },
  { path: "/et/faq", label: "FAQ" },
  { path: "/et/contact", label: "Contact" },
];

async function stubAll(page: import("@playwright/test").Page) {
  await stubLoggedOut(page);
  await stubCommon(page);
  await stubListings(page);
}

for (const { path, label } of routes) {
  test(`${label} (${path}) has a visible <header> (Navbar)`, async ({ page }) => {
    await stubAll(page);
    await page.goto(path);
    await expect(page.locator("header").first()).toBeVisible({ timeout: 15000 });
  });

  test(`${label} (${path}) does not show the ErrorBoundary fallback`, async ({ page }) => {
    await stubAll(page);
    await page.goto(path);
    // Wait for the page to render its header first.
    await expect(page.locator("header").first()).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(/something went wrong|midagi läks valesti/i),
    ).toHaveCount(0);
  });
}
