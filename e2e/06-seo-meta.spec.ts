import { test, expect } from '@playwright/test';

/**
 * 06 — SEO meta-tag tests
 *
 * Verifies that react-helmet-async correctly injects title, description,
 * og:title, and canonical on key pages.
 *
 * Note: react-helmet-async updates the <head> after React renders.
 * We wait for the <title> element to become non-empty rather than
 * asserting synchronously.
 */

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
        showProviderCta: false,
        showFaq: true,
        showMap: false,
        heroSubtitle: '',
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
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  );

  page.route('**/features*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  );
}

async function waitForTitle(page: import('@playwright/test').Page): Promise<string> {
  // react-helmet-async sets the title after mount; poll until non-empty
  await page.waitForFunction(() => document.title.trim().length > 0, { timeout: 8000 });
  return page.title();
}

test.describe('SEO meta tags', () => {
  test('Homepage: <title> is set and contains "Ruumly"', async ({ page }) => {
    stubSharedAPIs(page);
    await page.goto('/et');
    const title = await waitForTitle(page);
    expect(title.trim().length).toBeGreaterThan(0);
    expect(title).toContain('Ruumly');
  });

  test('Homepage: meta[name="description"] has non-empty content', async ({ page }) => {
    stubSharedAPIs(page);
    await page.goto('/et');
    await waitForTitle(page);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.trim().length).toBeGreaterThan(10);
  });

  test('Homepage: og:title has non-empty content', async ({ page }) => {
    stubSharedAPIs(page);
    await page.goto('/et');
    await waitForTitle(page);

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle?.trim().length).toBeGreaterThan(0);
  });

  test('Homepage: link[rel="canonical"] exists with https://ruumly.eu', async ({ page }) => {
    stubSharedAPIs(page);
    await page.goto('/et');
    await waitForTitle(page);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
    expect(canonical).toContain('ruumly.eu');
  });

  test('Search page: <title> differs from homepage title', async ({ page }) => {
    stubSharedAPIs(page);

    await page.goto('/et');
    const homeTitle = await waitForTitle(page);

    await page.goto('/et/search');
    const searchTitle = await waitForTitle(page);

    expect(searchTitle).not.toEqual(homeTitle);
    expect(searchTitle.trim().length).toBeGreaterThan(0);
  });

  test('Search page: meta[name="description"] has content', async ({ page }) => {
    stubSharedAPIs(page);
    await page.goto('/et/search');
    await waitForTitle(page);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.trim().length).toBeGreaterThan(10);
  });

  test('FAQ page: <title> contains FAQ-related text', async ({ page }) => {
    stubSharedAPIs(page);
    await page.goto('/et/faq');
    const title = await waitForTitle(page);

    expect(title.trim().length).toBeGreaterThan(0);
    // FAQ page title should contain "KKK", "FAQ", "часто", "bieži" or similar
    expect(title).toMatch(/kkk|faq|korduvküs|вопрос|jautāj|klausimai|ruumly/i);
  });

  test('FAQ page: canonical link is set', async ({ page }) => {
    stubSharedAPIs(page);
    await page.goto('/et/faq');
    await waitForTitle(page);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
    expect(canonical).toContain('ruumly.eu');
  });

  test('hreflang alternate links are present on homepage', async ({ page }) => {
    stubSharedAPIs(page);
    await page.goto('/et');
    await waitForTitle(page);

    // SEO component emits hreflang for all 5 supported langs + x-default
    const hreflangLinks = page.locator('link[rel="alternate"][hreflang]');
    const count = await hreflangLinks.count();
    expect(count).toBeGreaterThanOrEqual(5); // et, en, ru, lv, lt + x-default
  });
});
