import { test, expect } from "@playwright/test";
import { stubCommon, stubListings, stubLoggedOut, stubLocations } from "./fixtures";

/**
 * 18 — Concierge CTA flips (direction alignment)
 *
 * The demand-first pivot makes /request the primary CTA on the ranking pages.
 * These specs pin the flipped primary targets so a regression to /search is caught:
 *  (a) City hub /storage/{city}: hero + closing primary → /request?city={city}
 *      ("Küsi pakkumist" = et nav.getOffers), search demoted to a secondary link.
 *  (b) How-it-works: hero primary → /request, search demoted to secondary.
 */

test.describe("Concierge CTAs", () => {
  test("city hub primary CTA points to the concierge /request funnel", async ({ page }) => {
    await stubLoggedOut(page);
    await stubCommon(page);
    await stubListings(page, { items: [] });
    await stubLocations(page, []);

    await page.goto("/et/storage/tallinn");

    // Primary concierge CTA — scoped to the city so it can't match the navbar's
    // bare /et/request link. Hero + closing CTA both use this exact href.
    const concierge = page.locator('a[href="/et/request?city=Tallinn"]').first();
    await expect(concierge).toBeVisible({ timeout: 15000 });
    await expect(concierge).toContainText(/Küsi pakkumist/i);

    // Search is still reachable, but only as the secondary (browse) action.
    await expect(page.locator('a[href="/et/search?city=Tallinn"]').first()).toBeVisible();
  });

  test("how-it-works hero primary CTA points to /request, search demoted", async ({ page }) => {
    await stubLoggedOut(page);
    await stubCommon(page);
    await stubListings(page);

    await page.goto("/et/how-it-works");

    // Scope to the hero section (the one carrying the h1) so the navbar CTA
    // doesn't interfere.
    const hero = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { level: 1 }) })
      .first();

    const primary = hero.getByRole("link", { name: /Küsi pakkumist/i });
    await expect(primary).toBeVisible({ timeout: 15000 });
    await expect(primary).toHaveAttribute("href", "/et/request");

    // Search is demoted to the secondary button inside the hero.
    await expect(hero.locator('a[href="/et/search"]')).toBeVisible();
  });
});
