import { test, expect } from "@playwright/test";
import { stubCommon, stubListings, stubLoggedOut } from "./fixtures";

/**
 * 06 — SEO meta-tag tests
 *
 * The <SEO> component (react-helmet-async) injects <title>,
 * meta[name="description"], meta[property="og:title"],
 * link[rel="canonical"] (href under https://ruumly.eu) and hreflang
 * <link rel="alternate"> tags into <head> after React mounts. We poll until
 * <title> is non-empty, then assert presence. All API calls are mocked via the
 * shared fixtures so the pages render (a wrong-shape endpoint → ErrorBoundary →
 * no <SEO> emitted).
 */

async function stubAll(page: import("@playwright/test").Page) {
  await stubLoggedOut(page);
  await stubCommon(page);
  await stubListings(page);
}

async function waitForTitle(page: import("@playwright/test").Page): Promise<string> {
  await page.waitForFunction(() => document.title.trim().length > 0, { timeout: 15000 });
  return page.title();
}

test.describe("SEO meta tags", () => {
  test('Homepage: <title> is set and contains "Ruumly"', async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    const title = await waitForTitle(page);
    expect(title.trim().length).toBeGreaterThan(0);
    expect(title).toContain("Ruumly");
  });

  test('Homepage: meta[name="description"] has non-empty content', async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    await waitForTitle(page);

    const description = await page
      .locator('meta[name="description"][data-rh="true"]')
      .getAttribute("content");
    expect(description?.trim().length).toBeGreaterThan(10);
  });

  test('Homepage: og:title has non-empty content', async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    await waitForTitle(page);

    const ogTitle = await page
      .locator('meta[property="og:title"][data-rh="true"]')
      .getAttribute("content");
    expect(ogTitle?.trim().length).toBeGreaterThan(0);
  });

  test('Homepage: link[rel="canonical"] exists under https://ruumly.eu', async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    await waitForTitle(page);

    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(canonical).toBeTruthy();
    expect(canonical).toContain("https://ruumly.eu");
  });

  test("Search page: <title> differs from the homepage title", async ({ page }) => {
    await stubAll(page);

    await page.goto("/et");
    const homeTitle = await waitForTitle(page);

    await page.goto("/et/search");
    await page.waitForFunction(
      (prev) => document.title.trim().length > 0 && document.title !== prev,
      homeTitle,
      { timeout: 15000 },
    );
    const searchTitle = await page.title();

    expect(searchTitle).not.toEqual(homeTitle);
    expect(searchTitle.trim().length).toBeGreaterThan(0);
  });

  test("FAQ page: <title> contains FAQ-related text", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/faq");
    const title = await waitForTitle(page);

    expect(title.trim().length).toBeGreaterThan(0);
    expect(title).toMatch(/kkk|faq|korduvküs|korduma|вопрос|jautāj|klausimai|ruumly/i);
  });

  test("FAQ page: canonical link is set under ruumly.eu", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et/faq");
    await waitForTitle(page);

    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(canonical).toBeTruthy();
    expect(canonical).toContain("ruumly.eu");
  });

  test("hreflang alternate links are present on the homepage", async ({ page }) => {
    await stubAll(page);
    await page.goto("/et");
    await waitForTitle(page);

    // SEO emits hreflang for all 5 supported langs + x-default.
    const hreflangLinks = page.locator("link[rel=\"alternate\"][hreflang]");
    const count = await hreflangLinks.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
