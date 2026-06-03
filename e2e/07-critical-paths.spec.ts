import { test, expect } from '@playwright/test';

/**
 * 07 — Critical customer path
 *
 * Uses page.route() to mock all API calls with deterministic fixtures.
 * Flow: search page → listing card → detail page → Book button
 *
 * API shape follows src/services/types.ts (Listing, etc.)
 */

const FAKE_ID = 'test-warehouse-001';

const fakeWarehouseListing = {
  id: FAKE_ID,
  type: 'warehouse',
  title: 'Testkeskluse Ladu',
  description: 'Puhas ja turvaline laoruumi.',
  city: 'Tallinn',
  address: 'Tartu mnt 1',
  priceFrom: 49,
  area: 12,
  rating: 4.8,
  reviewCount: 7,
  availableNow: true,
  image: 'https://placehold.co/600x400/png',
  images: ['https://placehold.co/600x400/png'],
  provider: 'Test Laod OÜ',
  supplierId: 'supplier-001',
  featured: true,
  verified: true,
  foundingPartner: false,
  features: {},
  sizeCategory: 'S',
};

const fakeListingDetail = {
  ...fakeWarehouseListing,
  units: [],
  extras: [],
  supplier: { id: 'supplier-001', name: 'Test Laod OÜ', rating: 4.8, reviewCount: 7 },
};

function stubAllAPIs(page: import('@playwright/test').Page) {
  // Platform settings
  page.route('**/settings/public', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        maintenanceMode: false,
        showMovingService: false,
        showTrailerService: false,
        showHowItWorks: false,
        showFeaturedListings: true,
        showProviderCta: false,
        showFaq: false,
        showMap: false,
        heroSubtitle: '',
      }),
    })
  );

  // Auth — unauthenticated
  page.route('**/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) })
  );

  // Listings list — returns 1 fake warehouse
  page.route(`**/listings*`, (route) => {
    const url = route.request().url();
    // Detail endpoint: /listings/{id}
    if (url.includes(`/listings/${FAKE_ID}`)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeListingDetail),
      });
    }
    // List endpoint
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [fakeWarehouseListing], total: 1 }),
    });
  });

  // Locations
  page.route('**/locations*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  );

  // Cities
  page.route('**/locations/cities', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ city: 'Tallinn', country: 'EE' }]),
    })
  );

  // Suppliers
  page.route('**/suppliers*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'supplier-001', name: 'Test Laod OÜ', rating: 4.8, reviewCount: 7 }]),
    })
  );

  // Reviews
  page.route('**/reviews*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], total: 0 }),
    })
  );

  // Pricing config
  page.route('**/pricing*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  );

  // Feature definitions
  page.route('**/features*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  );

  // Contract templates (empty — skip contract step)
  page.route('**/contracts/templates*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );

  // Booking creation
  page.route('**/bookings', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'booking-001', status: 'pending' }),
      });
    }
    return route.continue();
  });

  // Notifications
  page.route('**/notifications*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
}

test.describe('Critical customer path: search → detail → book', () => {
  test('listing card appears on search page after API stub', async ({ page }) => {
    stubAllAPIs(page);

    await page.goto('/et/search');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the fake listing card to appear (loading skeleton should vanish)
    await expect(page.locator('text=Testkeskluse Ladu')).toBeVisible({ timeout: 10000 });
  });

  test('clicking the listing card navigates to the detail page', async ({ page }) => {
    stubAllAPIs(page);

    await page.goto('/et/search');
    await page.waitForLoadState('domcontentloaded');

    // Wait for listing card
    const listingCard = page.locator('text=Testkeskluse Ladu').first();
    await expect(listingCard).toBeVisible({ timeout: 10000 });

    // Click the card (it's wrapped in an <a> via ListingCard → Link)
    await listingCard.click();

    // URL should change to /et/warehouse/{id}
    await page.waitForURL(`**/et/warehouse/${FAKE_ID}`, { timeout: 8000 });
    expect(page.url()).toContain(`/et/warehouse/${FAKE_ID}`);
  });

  test('detail page renders title and price', async ({ page }) => {
    stubAllAPIs(page);

    // Navigate directly to detail page (simulates clicking in from search)
    await page.goto(`/et/warehouse/${FAKE_ID}`);
    await page.waitForLoadState('domcontentloaded');

    // Title should be visible
    await expect(page.locator('text=Testkeskluse Ladu')).toBeVisible({ timeout: 10000 });

    // Price (priceFrom: 49)
    await expect(page.locator('text=/49/').first()).toBeVisible({ timeout: 8000 });
  });

  test('detail page has a Book / Reserve button', async ({ page }) => {
    stubAllAPIs(page);

    await page.goto(`/et/warehouse/${FAKE_ID}`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for listing to load
    await expect(page.locator('text=Testkeskluse Ladu')).toBeVisible({ timeout: 10000 });

    // Book button — various translated labels or "Broneeri"
    const bookBtn = page.locator('button, a[href*="book"]').filter({
      hasText: /bron|book|резервир|reserv|užsak/i,
    }).first();
    await expect(bookBtn).toBeVisible({ timeout: 8000 });
  });

  test('clicking Book navigates to booking flow or prompts auth', async ({ page }) => {
    stubAllAPIs(page);

    await page.goto(`/et/warehouse/${FAKE_ID}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=Testkeskluse Ladu')).toBeVisible({ timeout: 10000 });

    const bookBtn = page.locator('button, a[href*="book"]').filter({
      hasText: /bron|book|резервир|reserv|užsak/i,
    }).first();
    await expect(bookBtn).toBeVisible({ timeout: 8000 });
    await bookBtn.click();

    // After clicking: either URL changes to /et/book?listingId=... or an inline auth
    // form appears (BookingInlineAuth) or user is redirected to /et/login
    await page.waitForTimeout(500); // Allow any navigation/animation to settle

    const currentUrl = page.url();
    const onBookingPage = currentUrl.includes('/book') || currentUrl.includes('/login');
    const inlineAuthVisible = await page.locator('input[type="email"]').isVisible().catch(() => false);

    expect(onBookingPage || inlineAuthVisible).toBe(true);
  });

  test('full flow: search → click card → detail → Book triggers auth or booking', async ({ page }) => {
    stubAllAPIs(page);

    // 1. Start at search
    await page.goto('/et/search');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=Testkeskluse Ladu')).toBeVisible({ timeout: 10000 });

    // 2. Click listing card
    await page.locator('text=Testkeskluse Ladu').first().click();
    await page.waitForURL(`**/et/warehouse/${FAKE_ID}`, { timeout: 8000 });

    // 3. Verify detail page
    await expect(page.locator('text=Testkeskluse Ladu')).toBeVisible({ timeout: 10000 });

    // 4. Click book
    const bookBtn = page.locator('button, a[href*="book"]').filter({
      hasText: /bron|book|резервир|reserv|užsak/i,
    }).first();
    await expect(bookBtn).toBeVisible({ timeout: 8000 });
    await bookBtn.click();

    await page.waitForTimeout(500);

    const url = page.url();
    const inlineEmail = await page.locator('input[type="email"]').isVisible().catch(() => false);
    expect(url.includes('/book') || url.includes('/login') || inlineEmail).toBe(true);
  });
});
