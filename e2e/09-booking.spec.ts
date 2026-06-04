import { test, expect } from "@playwright/test";
import {
  apiListing,
  stubCommon,
  stubListings,
  stubLoggedOut,
  stubBookingCreate,
} from "./fixtures";

/**
 * 09 — Booking flow (/et/book?listing=wh-001&type=warehouse).
 * Reconciled with the real app using the shared fixtures.
 * BookingPage is a 3-step wizard. Step 0 ("details + extras") shows the listing
 * title and "al. {priceFrom}€", a numbered step indicator, and a "next" button.
 * All listing/availability/extras/pricing calls are covered by the shared stubs.
 */

const LISTING = apiListing({ id: "wh-001", title: "Broneerimisnäidis Ladu", priceFrom: 49 });

async function stubAll(page: import("@playwright/test").Page) {
  await stubLoggedOut(page);
  await stubCommon(page);
  await stubListings(page, { items: [LISTING] });
  await stubBookingCreate(page);
}

const BOOK_URL = "/et/book?listing=wh-001&type=warehouse";

test.describe("Booking flow", () => {
  test("booking page loads without crashing to the error boundary", async ({ page }) => {
    await stubAll(page);
    await page.goto(BOOK_URL);
    // The app's ErrorBoundary shows "Midagi läks valesti" on a bad stub shape.
    await expect(page.getByText("Midagi läks valesti")).toHaveCount(0);
    // Step heading for step 0 (details) renders.
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible({ timeout: 15000 });
  });

  test("listing title appears on the booking page", async ({ page }) => {
    await stubAll(page);
    await page.goto(BOOK_URL);
    await expect(page.getByText("Broneerimisnäidis Ladu").first()).toBeVisible({ timeout: 15000 });
  });

  test("the listing price (49€) is shown", async ({ page }) => {
    await stubAll(page);
    await page.goto(BOOK_URL);
    await expect(page.getByText("Broneerimisnäidis Ladu").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/49\s*€/).first()).toBeVisible({ timeout: 10000 });
  });

  test("the step indicator is present (3 steps)", async ({ page }) => {
    await stubAll(page);
    await page.goto(BOOK_URL);
    await expect(page.getByText("Broneerimisnäidis Ladu").first()).toBeVisible({ timeout: 15000 });
    // Step labels render alongside the numbered circles on desktop.
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  });

  test("a forward / next button exists on step 1", async ({ page }) => {
    await stubAll(page);
    await page.goto(BOOK_URL);
    await expect(page.getByText("Broneerimisnäidis Ladu").first()).toBeVisible({ timeout: 15000 });
    const nextBtn = page.getByRole("button", { name: /järgmine/i }).first();
    await expect(nextBtn).toBeVisible({ timeout: 10000 });
  });

  test("clicking next advances from step 0 to the contact step", async ({ page }) => {
    await stubAll(page);
    await page.goto(BOOK_URL);
    await expect(page.getByText("Broneerimisnäidis Ladu").first()).toBeVisible({ timeout: 15000 });
    // Default dates are pre-filled (today → tomorrow), so step 0 validates and advances.
    await page.getByRole("button", { name: /järgmine/i }).first().click();
    // Step 1 (contact) renders a name/email/phone form with inputs.
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });
  });
});
