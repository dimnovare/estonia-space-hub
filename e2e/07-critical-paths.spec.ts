import { test, expect } from "@playwright/test";
import {
  apiListing,
  stubCommon,
  stubListings,
  stubLoggedOut,
  stubBookingCreate,
} from "./fixtures";

/**
 * 07 — Critical customer path: search → listing card → detail → Book.
 * All API calls are mocked via the shared fixtures (correct real shapes).
 */

const LISTING = apiListing({ id: "wh-001", title: "Testkeskuse Ladu", priceFrom: 49 });

async function stubAll(page: import("@playwright/test").Page) {
  await stubLoggedOut(page);
  await stubCommon(page);
  await stubListings(page, { items: [LISTING] });
  await stubBookingCreate(page);
}

test.describe("Critical customer path: search → detail → book", () => {
  test("listing card appears on the search page", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/search");
    await expect(page.getByText("Testkeskuse Ladu").first()).toBeVisible({ timeout: 15000 });
  });

  test("clicking the listing card navigates to the detail page", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/search");
    const card = page.getByText("Testkeskuse Ladu").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForURL("**/et/warehouse/wh-001", { timeout: 10000 });
    expect(page.url()).toContain("/et/warehouse/wh-001");
  });

  test("detail page renders the title and price", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/warehouse/wh-001");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Testkeskuse Ladu", {
      timeout: 15000,
    });
    await expect(page.getByText(/€\s*49/).first()).toBeVisible({ timeout: 10000 });
  });

  test("detail page has a Book online CTA button", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/warehouse/wh-001");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Testkeskuse Ladu", {
      timeout: 15000,
    });
    const bookBtn = page.getByRole("button", { name: /broneeri|book online/i }).first();
    await expect(bookBtn).toBeVisible({ timeout: 10000 });
  });

  test("full flow: search → card → detail → Book routes to the /book funnel", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/search");
    // Wait for the card to be stable before clicking — an early click can be
    // intercepted by the still-rendering search map, leaving us on /search where
    // the "Broneeritav veebis" filter chip ALSO matches the book-button selector
    // below (it contains "broneeri"). Mirrors the dedicated nav test above.
    const card = page.getByText("Testkeskuse Ladu").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForURL("**/et/warehouse/wh-001", { timeout: 10000 });
    // Confirm the detail page actually rendered before locating the Book button,
    // so the selector resolves against the detail CTA, not a search-page chip.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Testkeskuse Ladu", { timeout: 15000 });
    const bookBtn = page.getByRole("button", { name: /broneeri|book online/i }).first();
    await expect(bookBtn).toBeVisible({ timeout: 10000 });
    await bookBtn.click();
    // Detail-page "Book online" now enters the real booking funnel, not a fake modal.
    await expect(page).toHaveURL(/\/book(\?|$)/, { timeout: 10000 });
  });
});
