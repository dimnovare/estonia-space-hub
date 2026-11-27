import { test, expect } from "@playwright/test";
import et from "../src/i18n/locales/et";
import {
  stubCommon, stubListings, stubLoggedOut, stubConciergeLead, completeRequestDetailsStep,
} from "./fixtures";

/**
 * 12 — Concierge request funnel (/et/request)
 *
 * Walks the 3-step funnel: pick storage → city + the storage scoping questions
 * → email → submit. POST /leads/request is stubbed (200 { ok: true }); asserts
 * the success screen. Also covers the required-field guards and the 429
 * rate-limit error path. Copy is read from the et locale, so a wording change
 * does not turn this red; a missing control does.
 */

async function stubAll(page: import("@playwright/test").Page) {
  await stubLoggedOut(page);
  await stubCommon(page);
  await stubListings(page);
}

/** Step 1: pick storage, then Next. */
async function chooseStorage(page: import("@playwright/test").Page) {
  const storageCard = page.getByRole("button", { name: new RegExp(et["serviceType.warehouse"], "i") }).first();
  await expect(storageCard).toBeVisible({ timeout: 15000 });
  await storageCard.click();
  await page.getByRole("button", { name: et["request.next"] }).click();
}

const submit = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: et["request.submit"] }).click();

test.describe("Request funnel", () => {
  test("completes all 3 steps and shows the success screen", async ({ page }) => {
    await stubAll(page);
    await stubConciergeLead(page, 200);
    await page.goto("/et/request");

    await chooseStorage(page);
    await completeRequestDetailsStep(page, "Tallinn");

    await page.locator("#req-email").fill("test@example.com");
    await submit(page);

    // Success screen
    await expect(page.getByRole("heading", { name: et["request.success.title"] })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: et["request.success.browse"] })).toBeVisible();
  });

  test("step 1 requires at least one service", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/request");
    await expect(page.getByRole("button", { name: new RegExp(et["serviceType.warehouse"], "i") }).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: et["request.next"] }).click();
    await expect(page.getByText(et["request.errors.category"])).toBeVisible();
  });

  test("step 2 requires the storage scoping questions", async ({ page }) => {
    // A city alone is not a request a provider can price — Next stays on step 2.
    await stubAll(page);
    await page.goto("/et/request");
    await chooseStorage(page);
    await page.locator("#req-city").fill("Tallinn");
    await page.getByRole("button", { name: et["request.next"] }).click();
    await expect(page.getByText(et["request.errors.scope"])).toBeVisible();
    await expect(page.locator("#req-email")).toHaveCount(0);
  });

  test("invalid email shows a validation error", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/request");
    await chooseStorage(page);
    await completeRequestDetailsStep(page, "Tallinn");
    await page.locator("#req-email").fill("not-an-email");
    await submit(page);
    await expect(page.getByText(et["request.errors.email"])).toBeVisible();
  });

  test("429 rate limit shows the friendly inline error", async ({ page }) => {
    await stubAll(page);
    await stubConciergeLead(page, 429);
    await page.goto("/et/request");
    await chooseStorage(page);
    await completeRequestDetailsStep(page, "Tallinn");
    await page.locator("#req-email").fill("test@example.com");
    await submit(page);
    await expect(page.getByText(et["request.errors.rateLimited"])).toBeVisible({ timeout: 10000 });
  });
});
