import { test, expect } from "@playwright/test";
import et from "../src/i18n/locales/et";
import { stubCommon, stubListings, stubLoggedOut } from "./fixtures";

/**
 * 15 — Navbar Services mega-menu (overhaul spec §2)
 *
 * Desktop top level: Services ▾ · How it works · [lang/auth] · CTA "Get offers".
 * The panel lists the browse catalogue (5 with all verticals on; stubCommon
 * defaults hide moving/trailer → 3) linking to /search?type={slug}, plus a CTA
 * row into /request. Packing and insurance left every public surface on
 * 2026-08-08. A11y: aria-expanded/aria-controls, Escape closes and returns
 * focus to the trigger.
 */

async function stubAll(page: import("@playwright/test").Page, settings?: Record<string, unknown>) {
  await stubLoggedOut(page);
  await stubCommon(page, settings ? { settings } : {});
  await stubListings(page);
}

test.describe("Services mega-menu (desktop)", () => {
  test("opens on click with correct aria state and lists category links", async ({ page }) => {
    await stubAll(page, { showMovingService: true, showTrailerService: true });
    await page.goto("/et");
    const trigger = page.getByRole("button", { name: "Teenused" });
    await expect(trigger).toBeVisible({ timeout: 15000 });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    const panel = page.locator("#services-mega-menu");
    await expect(panel).toBeVisible();
    // Every browsable category when both toggled verticals are on.
    for (const slug of ["warehouse", "moving", "trailer", "cleaning", "vanrental"]) {
      await expect(panel.getByRole("link", { name: new RegExp(et[`serviceType.${slug}`], "i") })).toBeVisible();
    }
    // Retired 2026-08-08: still labels old leads, never offered in the nav.
    for (const slug of ["packing", "insurance"]) {
      await expect(panel.getByRole("link", { name: new RegExp(et[`serviceType.${slug}`], "i") })).toHaveCount(0);
    }
  });

  test("hides admin-disabled verticals (moving/trailer off)", async ({ page }) => {
    await stubAll(page); // stubCommon defaults: showMovingService/TrailerService false
    await page.goto("/et");
    await page.getByRole("button", { name: "Teenused" }).click();
    const panel = page.locator("#services-mega-menu");
    await expect(panel.getByRole("link", { name: /hoiustamine/i })).toBeVisible();
    await expect(panel.getByRole("link", { name: /haagise rent/i })).toHaveCount(0);
  });

  test("category link navigates to the typed search", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    await page.getByRole("button", { name: "Teenused" }).click();
    await page.locator("#services-mega-menu").getByRole("link", { name: /hoiustamine/i }).click();
    await page.waitForURL(/\/et\/search\?type=warehouse/, { timeout: 10000 });
    expect(page.url()).toContain("type=warehouse");
  });

  test("panel CTA row navigates to /et/request", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    await page.getByRole("button", { name: "Teenused" }).click();
    await page.locator("#services-mega-menu").getByRole("link", { name: /pole kindel/i }).click();
    await page.waitForURL(/\/et\/request/, { timeout: 10000 });
  });

  test("Escape closes the panel and returns focus to the trigger", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    const trigger = page.getByRole("button", { name: "Teenused" });
    await trigger.click();
    await expect(page.locator("#services-mega-menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#services-mega-menu")).toHaveCount(0);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
  });

  test('navbar primary CTA "Küsi pakkumist" links to /et/request', async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    // Scope to the header — the homepage hero carries the same CTA label.
    const cta = page.locator("header").getByRole("link", { name: /küsi pakkumist/i }).first();
    await expect(cta).toBeVisible({ timeout: 15000 });
    await cta.click();
    await page.waitForURL(/\/et\/request/, { timeout: 10000 });
  });

  test("old per-vertical top-level links are gone", async ({ page }) => {
    await stubAll(page, { showMovingService: true, showTrailerService: true });
    await page.goto("/et");
    const nav = page.locator("header nav");
    await expect(nav.getByRole("link", { name: "Laopinnad" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Kolimine" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Haagise rent" })).toHaveCount(0);
  });
});

test.describe("Services accordion (mobile drawer)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("drawer accordion lists categories and navigates", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    await page.getByRole("button", { name: /ava menüü/i }).click();
    const accordion = page.getByRole("button", { name: "Teenused" });
    await expect(accordion).toBeVisible();
    await expect(accordion).toHaveAttribute("aria-expanded", "false");
    await accordion.click();
    await expect(accordion).toHaveAttribute("aria-expanded", "true");
    const list = page.locator("#mobile-services-list");
    await list.getByRole("link", { name: /hoiustamine/i }).click();
    await page.waitForURL(/\/et\/search\?type=warehouse/, { timeout: 10000 });
  });
});
