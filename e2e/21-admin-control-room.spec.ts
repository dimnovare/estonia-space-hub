import { test, expect, Page, Route } from "@playwright/test";
import { stubCommon, seedAuth, adminUser, stubAdminLeads, adminLead } from "./fixtures";

/**
 * 21 — Admin control-room shell (2026-07-16 redesign spec §2-3)
 *
 * Grouped ops-first sidebar (OPERATE/SUPPLY/COMMERCE/PLATFORM) with persisted
 * collapse + active-group auto-expand + needs-response badge; Cmd+K command
 * palette (nav + partner + lead search); the "Today" cockpit landing screen.
 * All API calls mocked. Estonian UI (seedAuth pins ruumly-lang=et).
 *
 * Label gotcha: admin.leads and admin.inquiries are BOTH "Päringud" in et —
 * sidebar links are therefore located by href, not by accessible name.
 */

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

const SUPPLIER = {
  id: "sup-1",
  name: "Acme Storage",
  isActive: true,
  slug: null,
  tier: "starter",
  listingCount: 1,
  ordersTotal: 0,
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

/** Three leads at 2h / 30h / 60h — exercises the amber>24h / red>48h age tiers. */
function cockpitLeads() {
  return [
    adminLead({ id: "lead-1", createdAt: hoursAgo(2) }),
    adminLead({
      id: "lead-2", name: "Jaan Tamm", email: "jaan@example.com",
      city: "Pärnu", category: "moving", createdAt: hoursAgo(30),
    }),
    adminLead({
      id: "lead-3", name: "Kati Kask", email: "kati@example.com",
      city: "Tartu", category: "cleaning", status: "unmatched", createdAt: hoursAgo(60),
    }),
  ];
}

async function setupAdmin(page: Page, leads = cockpitLeads()): Promise<void> {
  await page.addInitScript(() => localStorage.setItem("ruumly-cookie-consent", "true"));
  await seedAuth(page, adminUser);
  await stubCommon(page);
  await stubAdminLeads(page, { items: leads });
  // supplierService.getAll — the e2e convention stubs /admin/suppliers as a
  // bare array; the /{id} detail route returns the object.
  await page.route(/\/admin\/suppliers(\b|\/|\?|$)/, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (/\/admin\/suppliers\/[^/]+/.test(path)) return json(route, SUPPLIER);
    return json(route, [SUPPLIER]);
  });
  await page.route(/\/admin\/dashboard\/stats/, (r) =>
    json(r, { totalListings: 5, totalOrders: 7, totalUsers: 11, totalRevenue: 490, recentInquiries: [] }),
  );
  await page.route(/\/admin\/dashboard\/revenue/, (r) =>
    json(r, { period: "2026-07", totalBookings: 2, totalGmv: 180, subscriptionMrr: 0, supplierBreakdown: [] }),
  );
  await page.route(/\/admin\/paid-features\/requests/, (r) => json(r, []));
}

test.describe("Admin control room", () => {
  test("sidebar renders the four ops-first groups; COMMERCE is collapsed, expands and persists", async ({ page }) => {
    await setupAdmin(page);
    await page.goto("/et/admin");

    const rail = page.locator("aside");
    // OPERATE (always expanded): Overview + Leads links present.
    await expect(rail.locator('a[href$="/et/admin"]')).toBeVisible();
    await expect(rail.locator('a[href*="tab=leads"]')).toBeVisible();
    // All four group labels render.
    for (const label of [/igapäevatöö/i, /pakkumine/i, /tehingud/i, /platvorm/i]) {
      await expect(rail.getByText(label).first()).toBeVisible();
    }
    // COMMERCE + PLATFORM collapsed by default → their items hidden.
    await expect(rail.locator('a[href*="tab=orders"]')).toHaveCount(0);
    await expect(rail.locator('a[href*="tab=settings"]')).toHaveCount(0);

    // Expand COMMERCE via its group header button.
    await rail.getByRole("button", { name: /tehingud/i }).click();
    await expect(rail.locator('a[href*="tab=orders"]')).toBeVisible();

    // The explicit toggle persists across a reload (localStorage).
    await page.reload();
    await expect(rail.locator('a[href*="tab=orders"]')).toBeVisible({ timeout: 8000 });
  });

  test("landing on a COMMERCE tab auto-expands the group and marks the item current", async ({ page }) => {
    await setupAdmin(page);
    await page.route(/\/orders(\b|\?|$)/, (r) => json(r, []));
    await page.goto("/et/admin?tab=orders");

    const ordersLink = page.locator('aside a[href*="tab=orders"]');
    await expect(ordersLink).toBeVisible({ timeout: 8000 });
    await expect(ordersLink).toHaveAttribute("aria-current", "page");
    // PLATFORM stays collapsed — auto-expand is scoped to the active group.
    await expect(page.locator('aside a[href*="tab=settings"]')).toHaveCount(0);
  });

  test("Cmd+K palette opens from the shell trigger and the keyboard, finds a partner, and navigates", async ({ page }) => {
    await setupAdmin(page);
    await page.goto("/et/admin");

    // Visible trigger in the shell header.
    await page.getByTestId("admin-cmdk-trigger").click();
    const input = page.getByPlaceholder(/otsi lehte/i);
    await expect(input).toBeVisible();

    // Esc closes; Ctrl+K reopens (toggle).
    await page.keyboard.press("Escape");
    await expect(input).toHaveCount(0);
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder(/otsi lehte/i)).toBeVisible();

    // Partner search (client-side over supplierService.getAll).
    await page.getByPlaceholder(/otsi lehte/i).fill("acme");
    const partnerItem = page.locator("[cmdk-item]").filter({ hasText: "Acme Storage" });
    await expect(partnerItem).toBeVisible({ timeout: 8000 });
    await partnerItem.click();
    await expect.poll(() => page.url(), { timeout: 8000 }).toContain("/admin/partners/sup-1");
  });

  test("Cmd+K lead search navigates to the auto-expanding lead deep link", async ({ page }) => {
    await setupAdmin(page);
    await page.goto("/et/admin");

    // The Ctrl+K listener mounts with the shell — wait for the visible trigger
    // before pressing, or the keystroke can land pre-hydration.
    await expect(page.getByTestId("admin-cmdk-trigger")).toBeVisible({ timeout: 8000 });
    await page.keyboard.press("Control+k");
    const input = page.getByPlaceholder(/otsi lehte/i);
    await expect(input).toBeVisible();
    await input.fill("mari");

    const leadItem = page.locator("[cmdk-item]").filter({ hasText: "Mari Maasikas" });
    await expect(leadItem).toBeVisible({ timeout: 8000 });
    await leadItem.click();
    await expect.poll(() => page.url(), { timeout: 8000 }).toContain("tab=leads");
    expect(page.url()).toContain("lead=lead-1");
  });

  test("Today cockpit renders north-star metrics, the needs-response queue and the sidebar badge", async ({ page }) => {
    await setupAdmin(page);
    await page.goto("/et/admin");

    // Header: the cockpit landing title.
    await expect(page.getByRole("heading", { level: 1, name: /täna/i })).toBeVisible({ timeout: 8000 });

    // North-star row binds /admin/leads/metrics: matchRate30d.rate=0.75 and
    // medianFirstResponseMinutes=42 (fixtures defaults).
    const northStar = page.getByTestId("cockpit-north-star");
    await expect(northStar).toContainText("75%");
    await expect(northStar).toContainText("42");

    // Needs-response queue lists the stubbed leads, oldest cases colored.
    const queue = page.getByTestId("cockpit-queue");
    await expect(queue.getByText("Mari Maasikas")).toBeVisible();
    await expect(queue.getByText("Kati Kask")).toBeVisible();

    // Supply-gap chips derive from unmatched leads and deep-link to the
    // filtered leads view.
    const gaps = page.getByTestId("cockpit-gaps");
    await expect(gaps.locator('a[href*="status=unmatched"]').first()).toBeVisible();

    // Needs-response badge on the Leads nav item (stub total = 3).
    await expect(page.locator('aside [aria-label="Vastuseta: 3"]')).toBeVisible();
  });
});
