import { test, expect } from '@playwright/test';

/**
 * 01 — Homepage smoke tests
 *
 * Verifies that the hero section, search input, CTA button, and Navbar
 * all render without crashing on the Estonian home route.
 */
test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Stub the public settings and listing endpoints so the page renders
    // without needing a live backend. The stubs return minimal valid shapes.
    await page.route('**/settings/public', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          showMovingService: false,
          showTrailerService: false,
          showHowItWorks: true,
          showFeaturedListings: true,
          showProviderCta: true,
          showFaq: true,
          showMap: false,
          heroSubtitle: '',
          sitePhone: '',
          siteEmail: '',
          openHours: '',
          maintenanceMode: false,
        }),
      })
    );

    await page.route('**/listings*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 }),
      })
    );

    await page.route('**/locations/cities', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    );

    await page.route('**/auth/me', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) })
    );
  });

  test('h1 heading is visible and non-empty', async ({ page }) => {
    await page.goto('/et');
    await page.waitForLoadState('domcontentloaded');

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('search input is present in the hero card', async ({ page }) => {
    await page.goto('/et');
    await page.waitForLoadState('domcontentloaded');

    // The hero search input has a MapPin icon and a text placeholder
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('search CTA button is present and clickable', async ({ page }) => {
    await page.goto('/et');
    await page.waitForLoadState('domcontentloaded');

    // The hero search button contains a Search icon; find the button in the hero card
    const heroSection = page.locator('section').first();
    const searchBtn = heroSection.locator('button').filter({ hasText: /leia|search|найти|meklēt|ieškoti/i }).first();
    await expect(searchBtn).toBeVisible();
    await expect(searchBtn).toBeEnabled();
  });

  test('clicking search navigates to /et/search', async ({ page }) => {
    await page.goto('/et');
    await page.waitForLoadState('domcontentloaded');

    const heroSection = page.locator('section').first();
    const searchBtn = heroSection.locator('button').filter({ hasText: /leia|search|найти|meklēt|ieškoti/i }).first();
    await searchBtn.click();

    await page.waitForURL(/\/et\/search/);
    expect(page.url()).toContain('/et/search');
  });

  test('Navbar header is visible', async ({ page }) => {
    await page.goto('/et');
    await page.waitForLoadState('domcontentloaded');

    const navbar = page.locator('header').first();
    await expect(navbar).toBeVisible();
  });
});
