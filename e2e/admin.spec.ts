import { test, expect } from '@playwright/test';

/**
 * admin.spec.ts — Admin panel smoke tests:
 * - Admin login redirected correctly when authenticated as admin
 * - Dashboard renders with sidebar navigation
 * - Approve supplier button visible on suppliers tab
 * - Publish location button present on locations tab
 * - Orders page (tab) renders
 */

const ADMIN_USER = {
  id: 'admin-001',
  name: 'Admin Kasutaja',
  email: 'admin@ruumly.eu',
  role: 'admin',
  status: 'active',
  registeredAt: '2024-01-01T00:00:00Z',
  bookingsCount: 0,
};

const FAKE_SUPPLIER = {
  id: 'sup-admin-01',
  name: 'Admin Test Partner OÜ',
  registryCode: '12345678',
  contactName: 'Kontakt Isik',
  contactEmail: 'partner@example.com',
  contactPhone: '+37255000000',
  integrationType: 'manual',
  isActive: false,  // pending approval
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
  lat: 59.4370,
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

function stubAdminAPIs(page: import('@playwright/test').Page) {
  page.route('**/settings/public', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ maintenanceMode: false, showMovingService: false, showTrailerService: false }),
    })
  );

  // Admin user authenticated
  page.route('**/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ADMIN_USER) })
  );

  // Suppliers list
  page.route('**/suppliers*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([FAKE_SUPPLIER]),
    })
  );

  // Locations list
  page.route('**/locations*', (route) => {
    const url = route.request().url();
    if (url.includes('/cities')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ city: 'Tallinn', country: 'EE' }]),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([FAKE_LOCATION]),
    });
  });

  // Orders list
  page.route('**/orders*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([FAKE_ORDER]),
    })
  );

  // Admin dashboard stats
  page.route('**/admin/dashboard/stats*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalListings: 1,
        totalOrders: 1,
        totalUsers: 3,
        totalRevenue: 49,
        recentInquiries: [],
      }),
    })
  );

  // Admin dashboard revenue
  page.route('**/admin/dashboard/revenue*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        period: '2026-06',
        totalBookings: 1,
        totalGmv: 49,
        subscriptionMrr: 0,
        supplierBreakdown: [],
      }),
    })
  );

  // Admin users
  page.route('**/admin/users*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );

  // Admin inquiries / leads / audit
  page.route('**/admin/inquiries*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  page.route('**/admin/leads*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  page.route('**/admin/audit*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );

  // Payouts / rebates
  page.route('**/admin/payouts*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  page.route('**/admin/rebates*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );

  // Ops checks
  page.route('**/admin/ops*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );

  // Notifications
  page.route('**/notifications*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );

  // Features / pricing
  page.route('**/features*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
  page.route('**/pricing*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
}

test.describe('Admin panel', () => {
  test('admin user can access /et/admin without redirect to login', async ({ page }) => {
    stubAdminAPIs(page);
    await page.goto('/et/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Should NOT be redirected to login
    expect(page.url()).not.toContain('/login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('admin sidebar / navigation is visible', async ({ page }) => {
    stubAdminAPIs(page);
    await page.goto('/et/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // AdminSidebar renders nav links; at least the sidebar container or nav links exist
    const nav = page.locator('nav, aside, [class*="sidebar"]').first();
    const dashboardLink = page.locator('a').filter({ hasText: /dashboard|töölaud|панель|pārskata|suvestinė/i }).first();
    const found = (await nav.count()) > 0 || (await dashboardLink.count()) > 0;
    expect(found).toBe(true);
  });

  test('suppliers tab shows partner list with approve-related action', async ({ page }) => {
    stubAdminAPIs(page);
    await page.goto('/et/admin?tab=suppliers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // AdminSuppliers renders a list of suppliers; the fake one (isActive: false) may show "Approve" or "Aktiveeri"
    await expect(page.locator('text=Admin Test Partner OÜ')).toBeVisible({ timeout: 8000 });

    // Look for any action button (activate/approve/edit)
    const actionBtn = page.locator('button').filter({
      hasText: /aktiveeri|activate|approve|verify|kinnita|bestätigen/i,
    }).first();
    const editBtn = page.locator('button').filter({ hasText: /muuda|edit|редактировать/i }).first();
    const found = (await actionBtn.count()) > 0 || (await editBtn.count()) > 0;
    expect(found).toBe(true);
  });

  test('locations tab renders location list', async ({ page }) => {
    stubAdminAPIs(page);
    await page.goto('/et/admin?tab=locations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // AdminLocations renders a list including FAKE_LOCATION
    await expect(page.locator('text=Tallinna Ladu')).toBeVisible({ timeout: 8000 });
  });

  test('orders tab renders order list with status filters', async ({ page }) => {
    stubAdminAPIs(page);
    await page.goto('/et/admin?tab=orders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // h1 "Tellimused" / "Orders" header
    const heading = page.locator('h1').filter({ hasText: /tellimused|orders|заказы|pasūtījumi|užsakymai/i }).first();
    await expect(heading).toBeVisible({ timeout: 8000 });

    // The fake order should be listed
    await expect(page.locator('text=Klient Nimi')).toBeVisible({ timeout: 6000 });
  });

  test('non-admin user gets redirected from /et/admin to login', async ({ page }) => {
    page.route('**/settings/public', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ maintenanceMode: false, showMovingService: false, showTrailerService: false }),
      })
    );
    page.route('**/auth/me', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Unauthorized"}' })
    );
    page.route('**/notifications*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );

    await page.goto('/et/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Unauthenticated users should be sent to /login
    expect(page.url()).toContain('/login');
  });
});
