import { test, expect, type Page } from "@playwright/test";
import {
  stubCommon, stubListings, stubLocations, seedAuth, adminUser,
  stubAdminSuppliersPaged, locationsAcrossPartners,
} from "./fixtures";

/**
 * 20 — Admin Partners count + Locations partner filter (founder-reported)
 *
 * Two regressions from the directory growing to 163 partners:
 *  1. The Partners page read "50 / 50" because supplierService.getAll fetched a
 *     single unpaged /admin/suppliers and the endpoint paginates (limit caps at
 *     100). It must now page through and show every partner.
 *  2. The Locations tab rendered one filter chip PER partner — 163 chips ahead
 *     of the content. It must now be a single searchable dropdown.
 */

async function stubAll(page: Page) {
  // stubCommon also blocks the Leaflet basemap tiles this tab's map would fetch.
  await stubCommon(page);
  await stubListings(page);
}


test.describe("Admin partners list", () => {
  test("lists every partner across pages, not just the first page", async ({ page }) => {
    await seedAuth(page, adminUser);
    await stubAll(page);
    await stubAdminSuppliersPaged(page, 163); // 2 pages at the server's 100 cap

    const pagesRequested: string[] = [];
    page.on("request", (req) => {
      const url = new URL(req.url());
      if (url.pathname.endsWith("/admin/suppliers")) pagesRequested.push(url.searchParams.get("page") ?? "?");
    });

    await page.goto("/en/admin/partners");

    // The header count is the bug's symptom: it read "50 / 50" with 163 partners.
    await expect(page.getByText("163 / 163")).toBeVisible({ timeout: 15000 });
    // It got there by paging, not by asking for an impossible limit.
    expect(pagesRequested).toEqual(["1", "2"]);
  });

  test("search filters the full set, including partners beyond the first page", async ({ page }) => {
    await seedAuth(page, adminUser);
    await stubAll(page);
    await stubAdminSuppliersPaged(page, 163);
    await page.goto("/en/admin/partners");
    await expect(page.getByText("163 / 163")).toBeVisible({ timeout: 15000 });

    // "Partner 150" only exists on page 2 — unreachable before the fix.
    await page.getByPlaceholder(/search partners/i).fill("Partner 150");
    await expect(page.getByText("1 / 163")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Partner 150" })).toBeVisible();
  });
});

test.describe("Admin locations partner filter", () => {
  test("filters partners through a searchable dropdown instead of a wall of chips", async ({ page }) => {
    await seedAuth(page, adminUser);
    await stubAll(page);
    await stubLocations(page, locationsAcrossPartners(60));
    await page.goto("/en/admin?tab=locations");

    const trigger = page.getByRole("combobox", { name: /filter locations by partner/i });
    await expect(trigger).toBeVisible({ timeout: 15000 });
    await expect(trigger).toContainText(/all partners/i);
    // The chip wall is gone: no per-partner buttons sitting in the toolbar.
    await expect(page.getByRole("button", { name: "Partner 7", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Partner 42", exact: true })).toHaveCount(0);

    // Type-to-filter, then pick a partner.
    await trigger.click();
    await page.getByPlaceholder(/search partners/i).fill("Partner 42");
    await page.getByRole("option", { name: "Partner 42", exact: true }).click();

    await expect(trigger).toContainText("Partner 42");
    await expect(page.getByText("Ladu 42", { exact: true })).toBeVisible();
    await expect(page.getByText("Ladu 7", { exact: true })).toHaveCount(0);
  });

  test("the partner filter is clearable back to all partners", async ({ page }) => {
    await seedAuth(page, adminUser);
    await stubAll(page);
    await stubLocations(page, locationsAcrossPartners(60));
    await page.goto("/en/admin?tab=locations");

    const trigger = page.getByRole("combobox", { name: /filter locations by partner/i });
    await expect(trigger).toBeVisible({ timeout: 15000 });
    await trigger.click();
    await page.getByRole("option", { name: "Partner 3", exact: true }).click();
    await expect(page.getByText("Ladu 3", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /clear partner filter/i }).click();
    await expect(trigger).toContainText(/all partners/i);
    await expect(page.getByText("Ladu 0", { exact: true })).toBeVisible();
  });

  test("the location list caps rendered cards and extends on demand", async ({ page }) => {
    await seedAuth(page, adminUser);
    await stubAll(page);
    await stubLocations(page, locationsAcrossPartners(60));
    await page.goto("/en/admin?tab=locations");

    // 50 of 60 mounted, the rest behind an explicit action.
    const showMore = page.getByRole("button", { name: /show more \(10\)/i });
    await expect(showMore).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Ladu 55", { exact: true })).toHaveCount(0);

    // This click also proves the consent banner is not covering the end of the
    // list: the button sits ~6400px down, exactly where the fixed banner used to
    // intercept it.
    await showMore.click();
    await expect(page.getByText("Ladu 55", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /show more/i })).toHaveCount(0);
  });

  test("the tab has exactly one partner filter — the searchable one", async ({ page }) => {
    // AdminPage renders its own plain "Filter by partner" select for the
    // orders/payouts/rebates tabs; on locations it must stand down so there is
    // not a second, near-identical "All partners" control.
    await seedAuth(page, adminUser);
    await stubAll(page);
    await stubLocations(page, locationsAcrossPartners(60));
    await page.goto("/en/admin?tab=locations");

    await expect(page.getByRole("combobox", { name: /filter locations by partner/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#admin-partner-filter")).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(1);
  });
});

test.describe("Admin chrome", () => {
  test("the cookie consent banner never overlays admin content", async ({ page }) => {
    // It is fixed to the viewport bottom, so on admin it just covers the end of
    // every long list until accepted. Admin is authenticated internal tooling.
    await seedAuth(page, adminUser);
    await stubAll(page);
    await stubLocations(page, locationsAcrossPartners(60));
    await page.goto("/en/admin?tab=locations");

    await expect(page.getByRole("combobox", { name: /filter locations by partner/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Accept" })).toHaveCount(0);
  });

  test("the cookie consent banner still appears on public routes", async ({ page }) => {
    // Suppressing it on admin must not suppress it where consent actually matters.
    await stubAll(page);
    await page.goto("/en/");
    await expect(page.getByRole("button", { name: "Accept" })).toBeVisible({ timeout: 15000 });
  });
});
