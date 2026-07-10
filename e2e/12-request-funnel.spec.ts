import { test, expect } from "@playwright/test";
import { stubCommon, stubListings, stubLoggedOut, stubConciergeLead } from "./fixtures";

/**
 * 12 — Concierge request funnel (/et/request)
 *
 * Walks the 3-step funnel: pick storage → fill city → fill email → submit.
 * POST /leads/request is stubbed (200 { ok: true }); asserts the success
 * screen ("Saime kätte!" = et request.success.title). Also covers the
 * required-field guards and the 429 rate-limit error path.
 */

async function stubAll(page: import("@playwright/test").Page) {
  await stubLoggedOut(page);
  await stubCommon(page);
  await stubListings(page);
}

test.describe("Request funnel", () => {
  test("completes all 3 steps and shows the success screen", async ({ page }) => {
    await stubAll(page);
    await stubConciergeLead(page, 200);
    await page.goto("/et/request");

    // Step 1 — select storage ("Hoiustamine" — canonical serviceType.warehouse)
    const storageCard = page.getByRole("button", { name: /hoiustamine/i }).first();
    await expect(storageCard).toBeVisible({ timeout: 15000 });
    await storageCard.click();
    await page.getByRole("button", { name: /edasi/i }).click();

    // Step 2 — city
    const cityInput = page.locator("#req-city");
    await expect(cityInput).toBeVisible({ timeout: 10000 });
    await cityInput.fill("Tallinn");
    await page.getByRole("button", { name: /edasi/i }).click();

    // Step 3 — email + submit
    const emailInput = page.locator("#req-email");
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill("test@example.com");
    await page.getByRole("button", { name: /saada päring/i }).click();

    // Success screen
    await expect(page.getByText("Saime kätte!")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: /sirvi vahepeal ise/i })).toBeVisible();
  });

  test("step 1 requires at least one service", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/request");
    await expect(page.getByRole("button", { name: /hoiustamine/i }).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /edasi/i }).click();
    await expect(page.getByText(/vali vähemalt üks teenus/i)).toBeVisible();
  });

  test("invalid email shows a validation error", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/request");
    await page.getByRole("button", { name: /hoiustamine/i }).first().click();
    await page.getByRole("button", { name: /edasi/i }).click();
    await page.locator("#req-city").fill("Tallinn");
    await page.getByRole("button", { name: /edasi/i }).click();
    await page.locator("#req-email").fill("not-an-email");
    await page.getByRole("button", { name: /saada päring/i }).click();
    await expect(page.getByText(/korrektne e-posti aadress/i)).toBeVisible();
  });

  test("429 rate limit shows the friendly inline error", async ({ page }) => {
    await stubAll(page);
    await stubConciergeLead(page, 429);
    await page.goto("/et/request");
    await page.getByRole("button", { name: /hoiustamine/i }).first().click();
    await page.getByRole("button", { name: /edasi/i }).click();
    await page.locator("#req-city").fill("Tallinn");
    await page.getByRole("button", { name: /edasi/i }).click();
    await page.locator("#req-email").fill("test@example.com");
    await page.getByRole("button", { name: /saada päring/i }).click();
    await expect(page.getByText(/liiga palju päringuid/i)).toBeVisible({ timeout: 10000 });
  });
});
