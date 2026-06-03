import { test, expect } from '@playwright/test';

/**
 * 05 — Navigation smoke tests
 *
 * For each main route: assert navigation does not result in an uncaught JS
 * error and the page renders meaningful content (not a blank screen or
 * an error boundary fallback).
 */

const routes = [
  { path: '/et', label: 'Home' },
  { path: '/et/search', label: 'Search' },
  { path: '/et/provider', label: 'Provider landing' },
  { path: '/et/about', label: 'About' },
  { path: '/et/faq', label: 'FAQ' },
  { path: '/et/contact', label: 'Contact' },
];

function stubSharedAPIs(page: import('@playwright/test').Page) {
  page.route('**/settings/public', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        maintenanceMode: false,
        showMovingService: false,
        showTrailerService: false,
        showHowItWorks: true,
        showFeaturedListings: false,
        showProviderCta: true,
        showFaq: true,
        showMap: false,
      }),
    })
  );

  page.route('**/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) })
  );

  page.route('**/listings*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], total: 0 }),
    })
  );

  page.route('**/locations*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  );

  page.route('**/pricing*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  );

  page.route('**/features*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  );
}

for (const { path, label } of routes) {
  test(`${label} (${path}) renders without uncaught JS errors`, async ({ page }) => {
    stubSharedAPIs(page);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');

    const appErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error promise rejection') &&
        !e.includes('401') &&
        !e.includes('Failed to fetch')
    );
    expect(appErrors, `Uncaught JS errors on ${path}: ${appErrors.join('; ')}`).toHaveLength(0);
  });

  test(`${label} (${path}) has a visible <header> (Navbar)`, async ({ page }) => {
    stubSharedAPIs(page);

    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('header').first()).toBeVisible();
  });

  test(`${label} (${path}) does not show error boundary fallback`, async ({ page }) => {
    stubSharedAPIs(page);

    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');

    // ErrorBoundary in the app renders "Something went wrong" — assert it's absent
    const errorBoundary = page.locator('text=/something went wrong/i').first();
    await expect(errorBoundary).not.toBeVisible();
  });
}
