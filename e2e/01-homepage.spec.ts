import { test, expect } from "@playwright/test";
import { stubCommon, stubListings, stubLoggedOut } from "./fixtures";

/**
 * 01 — Homepage smoke tests (/et)
 *
 * Verifies the hero heading, search input, search CTA button, and Navbar
 * render without tripping the ErrorBoundary. All API calls are mocked via the
 * shared fixtures (correct real shapes). The hero search button label is the
 * Estonian translation of `hero.search` → "Otsi".
 */

async function stubAll(page: import("@playwright/test").Page) {
  await stubLoggedOut(page);
  await stubCommon(page);
  await stubListings(page);
}

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await stubAll(page);
  });

  test("h1 heading is visible and non-empty", async ({ page }) => {
    await page.goto("/et");
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 15000 });
    const text = await h1.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test("search input is present in the hero card", async ({ page }) => {
    await page.goto("/et");
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });
  });

  test("search CTA button is present and clickable", async ({ page }) => {
    await page.goto("/et");
    const searchBtn = page.getByRole("button", { name: /otsi/i }).first();
    await expect(searchBtn).toBeVisible({ timeout: 15000 });
    await expect(searchBtn).toBeEnabled();
  });

  test("clicking search navigates to /et/search", async ({ page }) => {
    await page.goto("/et");
    const searchBtn = page.getByRole("button", { name: /otsi/i }).first();
    await expect(searchBtn).toBeVisible({ timeout: 15000 });
    await searchBtn.click();
    await page.waitForURL(/\/et\/search/, { timeout: 10000 });
    expect(page.url()).toContain("/et/search");
  });

  test("Navbar header is visible", async ({ page }) => {
    await page.goto("/et");
    await expect(page.locator("header").first()).toBeVisible({ timeout: 15000 });
  });
});
