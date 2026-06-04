import { test, expect, Page } from '@playwright/test';
import { stubCommon, seedAuth, stubLoggedOut, adminUser } from './fixtures';

/**
 * 11 — Admin panel smoke tests
 *
 * /et/admin is a ProtectedRoute allowedRoles={["admin"]}: we must seedAuth(adminUser)
 * BEFORE goto, otherwise it redirects to /et/login. Tabs are selected via ?tab=...
 *
 * Real app facts:
 *  - AdminPage tabs: dashboard | suppliers | locations | orders | ... (src/pages/AdminPage.tsx)
 *  - AdminSidebar renders <aside><nav>...</nav></aside> with section links.
 *  - supplierService.getAll → GET /admin/suppliers (unwrapPaginated: array OR {data}).
 *    A supplier with isActive:false appears in a "Pending applications" table with an
 *    Approve button (t("admin.approve") = "Kinnita").
 *  - AdminLocations → GET /locations (SupplierLocation[]).
 *  - AdminOrders (useOrders) → GET /orders?... (Order[]); h1 = t("admin.orders") = "Tellimused".
 *  - AdminDashboard → GET /admin/dashboard/stats and /admin/dashboard/revenue.
 */

const FAKE_SUPPLIER = {
  id: 'sup-admin-01',
  name: 'Admin Test Partner OÜ',
  registryCode: '12345678',
  contactName: 'Kontakt Isik',
  contactEmail: 'partner@example.com',
  contactPhone: '+37255000000',
  integrationType: 'manual',
  isActive: false, // pending approval → shows Approve button
  country: 'EE',
  listingCount: 0,
  ordersTotal: 0,
  revenue: 0,
  integrationHealth: 'offline',
  createdAt: '2024-06-01T00:00:00Z',
  partnerDiscountRate: 0,
  clientDiscountRate: 0,
  tier: 'starter',
  billingModel: 'marketplace',
};

const FAKE_LOCATION = {
  id: 'loc-admin-01',
  supplierId: 'sup-admin-01',
  supplierName: 'Admin Test Partner OÜ',
  name: 'Tallinna Ladu',
  address: 'Lao tee 1',
  city: 'Tallinn',
  lat: 59.437,
  lng: 24.7536,
  images: [],
  description: 'Testladu',
  isActive: false,
  unitCount: 0,
  availableUnits: 0,
  fullyBooked: false,
};

const FAKE_ORDER = {
  id: 'ord-admin-01',
  bookingId: 'bk-001',
  listingId: 'wh-001',
  listingTitle: 'Test Ladu',
  listingType: 'warehouse',
  supplierId: 'sup-admin-01',
  supplierName: 'Admin Test Partner OÜ',
  integrationType: 'manual',
  customerName: 'Klient Nimi',
  customerEmail: 'klient@example.com',
  customerPhone: '+37255000001',
  city: 'Tallinn',
  startDate: '2026-07-01',
  duration: '1 kuu',
  extras: [],
  basePrice: 49,
  platformPrice: 49,
  supplierPrice: 40,
  extrasTotal: 0,
  total: 49,
  margin: 9,
  status: 'created',
  createdAt: '2026-06-01T00:00:00Z',
  timeline: [],
  notes: '',
};

const json = (route: import('@playwright/test').Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** Admin-specific endpoints layered on top of stubCommon (which handles /locations & /suppliers). */
async function stubAdmin(page: Page): Promise<void> {
  // GET /admin/suppliers — supplierService.getAll() (unwrapPaginated handles a bare array).
  await page.route(/\/admin\/suppliers(\b|\?|$)/, (r) => json(r, [FAKE_SUPPLIER]));

  // Dashboard widgets.
  await page.route(/\/admin\/dashboard\/stats/, (r) =>
    json(r, { totalListings: 1, totalOrders: 1, totalUsers: 3, totalRevenue: 49, recentInquiries: [] }),
  );
  await page.route(/\/admin\/dashboard\/revenue/, (r) =>
    json(r, { period: '2026-06', totalBookings: 1, totalGmv: 49, subscriptionMrr: 0, supplierBreakdown: [] }),
  );

  // Misc admin list endpoints — must NOT be bare arrays where the UI expects {data,total}.
  await page.route(/\/admin\/users/, (r) => json(r, { data: [], total: 0 }));
  await page.route(/\/admin\/audit-log/, (r) => json(r, { data: [], total: 0 }));
  await page.route(/\/admin\/audit/, (r) => json(r, { data: [], total: 0 }));

  // Orders list (AdminOrders / useOrders).
  await page.route(/\/orders(\b|\?|$)/, (r) => json(r, [FAKE_ORDER]));

  // Locations list — override stubCommon's empty array with our fake location.
  await page.route(/\/locations(\b|\?|$)/, (r) => {
    const path = new URL(r.request().url()).pathname;
    if (/\/locations\/cities/.test(path)) return json(r, [{ city: 'Tallinn', country: 'EE' }]);
    return json(r, [FAKE_LOCATION]);
  });
}

test.describe('Admin panel', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress the fixed cookie-consent banner so it can't intercept clicks.
    await page.addInitScript(() => localStorage.setItem('ruumly-cookie-consent', 'true'));
    await stubCommon(page);
    await stubAdmin(page);
  });

  test('admin user reaches /et/admin without being redirected to login', async ({ page }) => {
    await seedAuth(page, adminUser);
    await page.goto('/et/admin');

    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).not.toContain('/login');
  });

  test('admin sidebar / navigation is visible', async ({ page }) => {
    await seedAuth(page, adminUser);
    await page.goto('/et/admin');

    // AdminSidebar renders <aside> (desktop) wrapping a <nav> of section links.
    const sidebarNav = page.locator('aside nav, nav').first();
    await expect(sidebarNav).toBeVisible({ timeout: 8000 });
  });

  test('suppliers tab lists the pending partner with an approve action', async ({ page }) => {
    await seedAuth(page, adminUser);
    await page.goto('/et/admin?tab=suppliers');

    // The partner name renders in several layouts (mobile card + desktop table +
    // pending-applications table); assert a VISIBLE occurrence, not the first DOM node.
    await expect(
      page.locator('text=Admin Test Partner OÜ').locator('visible=true').first(),
    ).toBeVisible({ timeout: 8000 });

    // The pending (isActive:false) partner shows an Approve/Kinnita button.
    const approveBtn = page
      .locator('button')
      .filter({ hasText: /kinnita|approve|одобрить|apstiprināt|patvirtinti/i })
      .first();
    await expect(approveBtn).toBeVisible({ timeout: 8000 });
  });

  test('locations tab renders the location list', async ({ page }) => {
    await seedAuth(page, adminUser);
    await page.goto('/et/admin?tab=locations');

    await expect(
      page.locator('text=Tallinna Ladu').locator('visible=true').first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test('orders tab renders the orders header and the fake order', async ({ page }) => {
    await seedAuth(page, adminUser);
    await page.goto('/et/admin?tab=orders');

    const heading = page
      .locator('h1')
      .filter({ hasText: /tellimused|orders|заказы|pasūtījumi|užsakymai/i })
      .first();
    await expect(heading).toBeVisible({ timeout: 8000 });

    // customerName appears in both the mobile cards and desktop table; assert a visible one.
    await expect(
      page.locator('text=Klient Nimi').locator('visible=true').first(),
    ).toBeVisible({ timeout: 6000 });
  });

  test('non-admin (logged-out) user is redirected from /et/admin to login', async ({ page }) => {
    await stubLoggedOut(page);
    await page.goto('/et/admin');

    await expect.poll(() => page.url(), { timeout: 8000 }).toContain('/login');
  });
});
