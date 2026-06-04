import { test, expect } from "@playwright/test";
import { apiListing, stubCommon, stubListings, stubLoggedOut } from "./fixtures";
import type { ListingsOpts } from "./fixtures";

/**
 * 02 — Search page smoke tests (/et/search)
 *
 * Verifies the sort dropdown, results-count paragraph, a rendered listing card,
 * and URL-driven type filter state. All API calls are mocked via the shared
 * fixtures (correct real shapes).
 */

async function stubAll(page: import("@playwright/test").Page, items: ListingsOpts = {}) {
  await stubLoggedOut(page);
  await stubCommon(page);
  await stubListings(page, items);
}

test.describe("Search page", () => {
  test("loads without crashing into the ErrorBoundary", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/search");
    await expect(page.locator("header").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/something went wrong|midagi läks valesti/i)).toHaveCount(0);
  });

  test("sort dropdown is present with at least 3 options", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/search");

    const sortSelect = page.locator("select[aria-label]").first();
    await expect(sortSelect).toBeVisible({ timeout: 15000 });

    const options = await sortSelect.locator("option").count();
    expect(options).toBeGreaterThanOrEqual(3);
  });

  test("results-count paragraph shows the number of results", async ({ page }) => {
    // One listing → "1 pakkumist leitud"
    await stubAll(page, { items: [apiListing({ title: "Test Warehouse" })] });
    await page.goto("/et/search");

    const resultsParagraph = page.locator("p").filter({ hasText: /\d/ }).first();
    await expect(resultsParagraph).toBeVisible({ timeout: 15000 });
  });

  test("a listing card with the stubbed title renders", async ({ page }) => {
    await stubAll(page, { items: [apiListing({ title: "Unikaalne Ladu XYZ" })] });
    await page.goto("/et/search");

    await expect(page.getByRole("heading", { name: "Unikaalne Ladu XYZ" }).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("?type=warehouse keeps the type param in the URL", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/search?type=warehouse");

    // Let the page settle; the param must persist.
    await expect(page.locator("select[aria-label]").first()).toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain("type=warehouse");
  });
});
