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
  await stubCommon(page);
  await stubListings(page);
  // The Locations tab mounts a Leaflet map. Cut its tile fetches off: an e2e run
  // must not depend on openstreetmap.org being reachable. Leaflet simply leaves
  // unfetched tiles blank, which is all these assertions need.
  await page.route(/tile\.openstreetmap\.org/, (route) => route.abort());
}

/**
 * The consent banner is fixed to the bottom of the viewport. The "show more"
 * control lives at the end of a very long list, so scrolling it into view lands
 * it directly under the banner and the click is intercepted. Dismiss it first.
 */
async function dismissCookies(page: Page) {
  const accept = page.getByRole("button", { name: "Accept" });
  if (await accept.isVisible().catch(() => false)) await accept.click();
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
    await dismissCookies(page);

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
    await dismissCookies(page);

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
    await dismissCookies(page);

    // 50 of 60 mounted, the rest behind an explicit action.
    const showMore = page.getByRole("button", { name: /show more \(10\)/i });
    await expect(showMore).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Ladu 55", { exact: true })).toHaveCount(0);

    await showMore.click();
    await expect(page.getByText("Ladu 55", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /show more/i })).toHaveCount(0);
  });
});
