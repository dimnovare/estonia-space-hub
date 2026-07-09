import { test, expect } from "@playwright/test";
import { stubCommon, stubListings, stubLoggedOut } from "./fixtures";

/**
 * 01 — Homepage smoke tests (/et)
 *
 * Concierge-first hero (conciergeFirst=true in stubCommon): the hero leads with
 * a single CTA into the /request funnel ("Küsi pakkumist" = et request.hero.cta)
 * plus a subtle browse link to /search. The legacy marketplace hero (search
 * card) renders only when the conciergeFirst platform setting is "false" —
 * covered by a dedicated test with an overridden settings stub. All API calls
 * are mocked via the shared fixtures (correct real shapes).
 */

async function stubAll(page: import("@playwright/test").Page, settings?: Record<string, unknown>) {
  await stubLoggedOut(page);
  await stubCommon(page, settings ? { settings } : {});
  await stubListings(page);
}

test.describe("Homepage (concierge-first hero)", () => {
  test("h1 heading is visible and non-empty", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 15000 });
    const text = await h1.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test("concierge CTA link is visible in the hero", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    const cta = page.getByRole("link", { name: /küsi pakkumist/i }).first();
    await expect(cta).toBeVisible({ timeout: 15000 });
  });

  test("clicking the concierge CTA navigates to /et/request", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    const cta = page.getByRole("link", { name: /küsi pakkumist/i }).first();
    await expect(cta).toBeVisible({ timeout: 15000 });
    await cta.click();
    await page.waitForURL(/\/et\/request/, { timeout: 10000 });
    expect(page.url()).toContain("/et/request");
  });

  test("browse escape hatch links to /et/search", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    const browse = page.getByRole("link", { name: /sirvi pakkumisi ise/i }).first();
    await expect(browse).toBeVisible({ timeout: 15000 });
    await browse.click();
    await page.waitForURL(/\/et\/search/, { timeout: 10000 });
    expect(page.url()).toContain("/et/search");
  });

  test("Navbar header is visible", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    await expect(page.locator("header").first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Homepage (marketplace hero, conciergeFirst=false)", () => {
  test("search card renders and search navigates to /et/search", async ({ page }) => {
    await stubAll(page, { conciergeFirst: "false" });
    await page.goto("/et");
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });
    const searchBtn = page.getByRole("button", { name: /otsi/i }).first();
    await expect(searchBtn).toBeVisible({ timeout: 15000 });
    await searchBtn.click();
    await page.waitForURL(/\/et\/search/, { timeout: 10000 });
    expect(page.url()).toContain("/et/search");
  });
});
