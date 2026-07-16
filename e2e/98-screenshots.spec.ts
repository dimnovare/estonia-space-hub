import { test, expect, Page, Route } from "@playwright/test";
import { stubCommon, seedAuth, adminUser, stubAdminLeads, adminLead } from "./fixtures";

/**
 * 98 — Design-review screenshots (control-room spec §7). NOT part of the
 * functional suite: set SCREENSHOTS=1 to capture. Writes 375px + 1440px
 * full-page captures of the shell/cockpit and the heaviest admin screens
 * into test-results/screens/.
 *
 *   $env:SCREENSHOTS="1"; npx playwright test e2e/98-screenshots.spec.ts
 */

const CAPTURE = !!process.env.SCREENSHOTS;

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

/** Full Supplier DTO shape — AdminSuppliers dereferences revenue/integration
 *  fields unconditionally, so partial fixtures crash the screen. */
function supplier(over: Record<string, unknown>) {
  return {
    id: "sup-x", name: "Partner", isActive: true, slug: null, tier: "starter",
    listingCount: 0, ordersTotal: 0, revenue: 0, registryCode: "10000001",
    contactName: "Kontakt Isik", contactEmail: "info@example.com",
    contactPhone: "+3725550000", integrationType: "manual",
    integrationHealth: "healthy", country: "EE", partnerDiscountRate: 0,
    clientDiscountRate: 0, billingModel: "marketplace", notes: "",
    isPartnerPagePublished: false, createdAt: "2026-06-01T00:00:00Z",
    ...over,
  };
}

const SUPPLIERS = [
  supplier({ id: "sup-1", name: "Acme Storage", slug: "acme", tier: "standard", listingCount: 4, ordersTotal: 12, revenue: 340, isPartnerPagePublished: true }),
  supplier({ id: "sup-2", name: "Kolimisfirma OÜ" }),
  supplier({ id: "sup-3", name: "Pending Partner OÜ", isActive: false, registryCode: "12345678", contactEmail: "p@example.com" }),
];

const ORDER = {
  id: "ord-01", bookingId: "bk-1", listingId: "wh-001", listingTitle: "Miniladu 10 m²",
  listingType: "warehouse", supplierId: "sup-1", supplierName: "Acme Storage",
  integrationType: "manual", customerName: "Klient Nimi", customerEmail: "k@example.com",
  customerPhone: "+37255000001", city: "Tallinn", startDate: "2026-08-01", duration: "1 kuu",
  extras: [], basePrice: 49, platformPrice: 49, supplierPrice: 40, extrasTotal: 0,
  total: 49, margin: 9, status: "created", createdAt: "2026-07-10T00:00:00Z", timeline: [], notes: "",
};

const LISTING = {
  id: "wh-001", type: "Warehouse", title: "Miniladu 10 m²", supplierName: "Acme Storage",
  supplierId: "sup-1", city: "Tallinn", priceFrom: 89, priceUnit: "€/kuu", isActive: true,
  availableNow: true, images: [], features: { sizeM2: 10 },
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

async function setup(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem("ruumly-cookie-consent", "true"));
  await seedAuth(page, adminUser);
  await stubCommon(page);
  await stubAdminLeads(page, {
    items: [
      adminLead({ id: "lead-1", createdAt: hoursAgo(3) }),
      adminLead({ id: "lead-2", name: "Jaan Tamm", email: "jaan@example.com", city: "Pärnu", category: "moving", createdAt: hoursAgo(28) }),
      adminLead({ id: "lead-3", name: "Kati Kask", email: "kati@example.com", city: "Tartu", category: "cleaning", status: "unmatched", createdAt: hoursAgo(55) }),
    ],
  });
  await page.route(/\/admin\/suppliers(\b|\/|\?|$)/, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (/\/admin\/suppliers\/[^/]+\/(poll-log|contracts)/.test(path)) return json(route, []);
    if (/\/admin\/suppliers\/[^/]+/.test(path)) return json(route, SUPPLIERS[0]);
    return json(route, SUPPLIERS);
  });
  await page.route(/\/admin\/dashboard\/stats/, (r) =>
    json(r, { totalListings: 12, totalOrders: 7, totalUsers: 41, totalRevenue: 940, recentInquiries: [] }),
  );
  await page.route(/\/admin\/dashboard\/revenue/, (r) =>
    json(r, { period: "2026-07", totalBookings: 4, totalGmv: 380, subscriptionMrr: 45, supplierBreakdown: [] }),
  );
  await page.route(/\/admin\/paid-features\/requests/, (r) => json(r, []));
  await page.route(/\/admin\/listings(\b|\?|$)/, (r) => json(r, [LISTING]));
  await page.route(/\/orders(\b|\?|$)/, (r) => json(r, [ORDER]));
  await page.route(/\/admin\/payouts(\b|\?|$)/, (r) => json(r, { data: [], total: 0 }));
  await page.route(/\/admin\/invoices(\b|\/|\?|$)/, (r) => json(r, { data: [], total: 0 }));
}

const TARGETS: { name: string; path: string; ready: (page: Page) => Promise<void> }[] = [
  {
    name: "cockpit",
    path: "/et/admin",
    ready: async (page) => { await expect(page.getByTestId("cockpit-north-star")).toBeVisible({ timeout: 15000 }); },
  },
  {
    name: "orders",
    path: "/et/admin?tab=orders",
    ready: async (page) => { await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 }); },
  },
  {
    name: "suppliers",
    path: "/et/admin?tab=suppliers",
    ready: async (page) => { await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 }); },
  },
  {
    name: "listings",
    path: "/et/admin?tab=listings",
    ready: async (page) => { await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 }); },
  },
  {
    name: "partner-detail",
    path: "/et/admin/partners/sup-1",
    ready: async (page) => { await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 }); },
  },
];

test.describe("design screenshots", () => {
  test.skip(!CAPTURE, "set SCREENSHOTS=1 to capture design-review screenshots");

  for (const target of TARGETS) {
    for (const [label, viewport] of [["1440", { width: 1440, height: 900 }], ["375", { width: 375, height: 812 }]] as const) {
      test(`${target.name} @ ${label}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await setup(page);
        await page.goto(target.path);
        await target.ready(page);
        // Let fonts/layout settle before the capture.
        await page.waitForTimeout(400);
        await page.screenshot({
          path: `test-results/screens/${target.name}-${label}.png`,
          fullPage: true,
        });
      });
    }
  }
});
