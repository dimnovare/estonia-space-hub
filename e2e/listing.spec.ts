import { test, expect } from '@playwright/test';

/**
 * listing.spec.ts — Listing detail page renders title, photos section, price,
 * and the book / reserve button.
 */

const LISTING_ID = 'wh-detail-001';

const fakeWarehouse = {
  id: LISTING_ID,
  type: 'warehouse',
  title: 'Kesklinna Laohoone',
  description: 'Puhas, kuiv ja valvega ladu Tallinna kesklinnas.',
  city: 'Tallinn',
  address: 'Tartu mnt 12',
  priceFrom: 79,
  priceUnit: '/month',
  availableNow: true,
  image: 'https://placehold.co/800x400/png',
  images: ['https://placehold.co/800x400/png', 'https://placehold.co/800x400/png'],
  rating: 4.7,
  reviewCount: 11,
  provider: 'Laod OÜ',
  supplierId: 'sup-001',
  badge: 'best-value',
  features: {
    size: 18,
    sizeUnit: 'm²',
    heated: true,
    indoor: true,
    access24_7: true,
    security: true,
    loadingDock: false,
    forklift: false,
    shortTerm: true,
    longTerm: true,
  },
  size: 18,
  sizeUnit: 'm²',
  heated: true,
  indoor: true,
  access24_7: true,
  security: true,
  loadingDock: false,
  forklift: false,
  shortTerm: true,
  longTerm: true,
};

function stubAll(page: import('@playwright/test').Page) {
  page.route('**/settings/public', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        maintenanceMode: false,
        showMovingService: false,
        showTrailerService: false,
      }),
    })
  );

  page.route('**/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Unauthorized"}' })
  );

  page.route(`**/listings/${LISTING_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fakeWarehouse),
    })
  );

  // Extras — empty list
  page.route(`**/listings/${LISTING_ID}/extras`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );

  // Suppliers
  page.route('**/suppliers*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'sup-001', name: 'Laod OÜ', integrationType: 'manual',
          isActive: true, listingCount: 1, ordersTotal: 0, revenue: 0,
          integrationHealth: 'healthy', createdAt: '2024-01-01T00:00:00Z',
          partnerDiscountRate: 0, clientDiscountRate: 0,
          tier: 'standard', billingModel: 'marketplace',
        },
      ]),
    })
  );

  // Reviews — empty
  page.route('**/reviews*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[],"total":0}' })
  );

  // Pricing config
  page.route('**/pricing*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );

  // Locations
  page.route('**/locations*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );

  // Features
  page.route('**/features*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
}

test.describe('Listing detail page', () => {
  test('renders the listing title', async ({ page }) => {
    stubAll(page);
    await page.goto(`/et/warehouse/${LISTING_ID}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1')).toContainText('Kesklinna Laohoone', { timeout: 10000 });
  });

  test('shows the price', async ({ page }) => {
    stubAll(page);
    await page.goto(`/et/warehouse/${LISTING_ID}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=/79/')).toBeVisible({ timeout: 10000 });
  });

  test('photos section is present (img or placeholder)', async ({ page }) => {
    stubAll(page);
    await page.goto(`/et/warehouse/${LISTING_ID}`);
    await page.waitForLoadState('domcontentloaded');

    // Either a real img or the placeholder div renders
    await expect(page.locator('text=Kesklinna Laohoone')).toBeVisible({ timeout: 10000 });
    const img = page.locator('img').first();
    const placeholder = page.locator('div').filter({ has: page.locator('[class*="h-\\[300px\\]"]') }).first();
    const imgCount = await img.count();
    const phCount = await placeholder.count();
    expect(imgCount + phCount).toBeGreaterThan(0);
  });

  test('book / reserve button is present', async ({ page }) => {
    stubAll(page);
    await page.goto(`/et/warehouse/${LISTING_ID}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=Kesklinna Laohoone')).toBeVisible({ timeout: 10000 });

    const bookBtn = page.locator('a[href*="book"], button').filter({
      hasText: /bron|book|reserv|резервир|užsak/i,
    }).first();
    await expect(bookBtn).toBeVisible({ timeout: 8000 });
  });

  test('clicking book navigates to booking page or triggers auth', async ({ page }) => {
    stubAll(page);
    await page.goto(`/et/warehouse/${LISTING_ID}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=Kesklinna Laohoone')).toBeVisible({ timeout: 10000 });

    const bookBtn = page.locator('a[href*="book"], button').filter({
      hasText: /bron|book|reserv|резервир|užsak/i,
    }).first();
    await bookBtn.click();
    await page.waitForTimeout(500);

    const url = page.url();
    const emailInput = await page.locator('input[type="email"]').isVisible().catch(() => false);
    expect(url.includes('/book') || url.includes('/login') || emailInput).toBe(true);
  });
});
