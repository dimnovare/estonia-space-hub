import { test, expect } from "@playwright/test";
import { apiListing, stubCommon, stubListings, stubLoggedOut } from "./fixtures";

/**
 * 08 — Listing detail page (/et/warehouse/:id).
 * Reconciled with the real app using the shared fixtures (correct API shapes).
 * The WarehouseDetail component renders an <h1> with the title, a price block
 * "al. {priceFrom}€", and a Book CTA linking to /book?listing=...&type=warehouse.
 */

const LISTING = apiListing({ id: "wh-001", title: "My Unit", priceFrom: 49 });

async function stubAll(page: import("@playwright/test").Page) {
  await stubLoggedOut(page);
  await stubCommon(page);
  await stubListings(page, { items: [LISTING] });
}

test.describe("Listing detail page", () => {
  test("renders the listing title in an h1", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/warehouse/wh-001");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("My Unit", {
      timeout: 15000,
    });
  });

  test("shows the price (al. 49€)", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/warehouse/wh-001");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("My Unit", {
      timeout: 15000,
    });
    await expect(page.getByText(/49\s*€/).first()).toBeVisible({ timeout: 10000 });
  });

  test("shows a photos / image section", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/warehouse/wh-001");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("My Unit", {
      timeout: 15000,
    });
    // No images on the fixture → a striped placeholder tile renders instead of <img>.
    const placeholder = page.locator('[class*="h-[280px]"]').first();
    await expect(placeholder).toBeVisible({ timeout: 10000 });
  });

  test("has a Book button linking to the booking flow", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/warehouse/wh-001");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("My Unit", {
      timeout: 15000,
    });
    const bookLink = page.locator('a[href*="/book"]').first();
    await expect(bookLink).toBeVisible({ timeout: 10000 });
    await expect(bookLink).toHaveAttribute("href", /listing=wh-001/);
    await expect(bookLink).toHaveAttribute("href", /type=warehouse/);
  });

  test("clicking Book navigates to the booking page", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/warehouse/wh-001");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("My Unit", {
      timeout: 15000,
    });
    const bookLink = page.locator('a[href*="/book"]').first();
    await bookLink.click();
    await page.waitForURL("**/book**", { timeout: 10000 });
    expect(page.url()).toContain("/book");
    expect(page.url()).toContain("listing=wh-001");
  });

  test("unknown listing id returning 404 renders the not-found state", async ({ page }) => {
    await stubLoggedOut(page);
    await stubCommon(page);
    await stubListings(page, { items: [LISTING] });
    // Override the single-listing route for a missing id with a 404.
    await page.route(/\/listings\/missing-id($|\?)/, (route) =>
      route.fulfill({ status: 404, contentType: "application/json", body: '{"message":"Not found"}' }),
    );
    await page.goto("/et/warehouse/missing-id");
    // NotFoundDetail renders an h1 with the not-found heading (no listing title).
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("My Unit")).toHaveCount(0);
  });
});
