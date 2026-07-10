import { test, expect } from "@playwright/test";
import { stubCommon, stubListings, stubLoggedOut, stubLocations, directoryLocation } from "./fixtures";

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

  test("directory location pins render on the homepage map", async ({ page }) => {
    // stubCommon defaults showMap to false — the map section is flag-gated.
    await stubAll(page, { showMap: true });
    // Register AFTER stubCommon so this /locations handler wins. Prod-shaped
    // scenario: supply lives in locations (directory profiles), not listings.
    await stubLocations(page, [directoryLocation()]);
    await page.goto("/et");
    // The map bundle is lazy and deferred until scrolled near the viewport.
    // Directory profiles render as per-category pins (clustered; a single pin
    // is shown as-is, not as a count bubble).
    const pin = page.locator(".ruumly-category-pin");
    for (let i = 0; i < 12 && (await pin.count()) === 0; i++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(250);
    }
    await expect(pin.first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Homepage sections (concierge redesign, spec §3)", () => {
  test("renders the section stack: grid, steps, trust strip, FAQ, closing CTA", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    // 2 — 7-service grid (5 categories with moving/trailer off in stubCommon)
    await expect(page.getByRole("heading", { name: /kõik kolimiseks vajalik/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Hoiustamine", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Koristus", exact: true })).toBeVisible();
    // 4 — concierge how-it-works steps (exact: the hero h1 contains the same phrase)
    await expect(page.getByRole("heading", { name: "Ütle, mida vajad", exact: true })).toBeVisible();
    // 5 — trust strip fixed promises
    await expect(page.getByText("Kliendile tasuta").first()).toBeVisible();
    await expect(page.getByText(/pakkumised tavaliselt 24 tunniga/i).first()).toBeVisible();
    // 6 — FAQ + closing CTA
    await expect(page.getByRole("heading", { name: /valmis alustama/i })).toBeVisible();
  });

  test("service-grid category card deep-links browse + get offers", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    const grid = page.getByRole("heading", { name: /kõik kolimiseks vajalik/i }).locator("xpath=ancestor::section");
    await expect(grid.getByRole("link", { name: "Sirvi" }).first()).toHaveAttribute("href", /\/et\/search\?type=warehouse/);
    await grid.getByRole("link", { name: /küsi pakkumist/i }).first().click();
    await page.waitForURL(/\/et\/request\?category=warehouse/, { timeout: 10000 });
  });

  test("popular-need chip prefills the request funnel category", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    await page.getByRole("link", { name: /hoiuruum remondi ajaks/i }).click();
    await page.waitForURL(/\/et\/request\?category=warehouse/, { timeout: 10000 });
    // Step-1 card arrives preselected (aria-pressed=true).
    await expect(page.locator('button[aria-pressed="true"]').first()).toBeVisible({ timeout: 15000 });
  });

  test("moving-gated need chips hidden when moving service is off", async ({ page }) => {
    await stubAll(page); // stubCommon: showMovingService=false
    await page.goto("/et");
    await expect(page.getByRole("link", { name: /hoiuruum remondi ajaks/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("link", { name: /kolin uude koju/i })).toHaveCount(0);
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
