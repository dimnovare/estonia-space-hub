import { test, expect } from "@playwright/test";
import {
  stubCommon, stubListings, stubLoggedOut, stubLocations, stubPartner,
  directoryLocation, partnerProfile,
} from "./fixtures";

/**
 * 13 — Provider directory (unclaimed company profiles)
 *
 * Directory suppliers are real companies imported as FREE "existing on Ruumly"
 * profiles: public partner page + map pin, NO listings/units/pricing/booking.
 *  (a) /et/search renders a directory location card (name, city, service chips,
 *      "Vaata profiili") linking to the partner page — no price/availability.
 *  (b) /et/partner/{slug} with isDirectory shows the claim banner, the website
 *      button and the directory note instead of the empty-listings state.
 *  (c) /et/request funnel: the new "Koristus" (cleaning) category card submits
 *      categories containing the exact API slug "cleaning".
 */

test.describe("Directory (search card)", () => {
  test("directory location renders a directory card linking to the partner page", async ({ page }) => {
    await stubLoggedOut(page);
    await stubCommon(page);
    await stubListings(page, { items: [] });
    await stubLocations(page, [directoryLocation()]);

    await page.goto("/et/search");

    const card = page.getByTestId("directory-card");
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card).toContainText("Kolimisfirma OÜ");
    await expect(card).toContainText("Tallinn");
    // Localized serviceTypes chips (et): moving → "Kolimine", cleaning → "Koristus"
    await expect(card).toContainText("Kolimine");
    await expect(card).toContainText("Koristus");
    await expect(card).toContainText("Vaata profiili");
    // Links to the partner page (lang-prefixed), not /location/{id}
    await expect(card).toHaveAttribute("href", "/et/partner/kolimisfirma");
    // NO price / NO availability text on directory cards
    await expect(card).not.toContainText("€");
    await expect(card).not.toContainText(/saadaval/i);
  });

  test("directory-only chip + text query still shows directory cards", async ({ page }) => {
    // Regression: listings-only filters (q, price, availability) used to blank
    // the location cards via hasRestrictiveFilter even when a directory-only
    // category was active — a guaranteed-false "0 results".
    await stubLoggedOut(page);
    await stubCommon(page);
    await stubListings(page, { items: [] });
    await stubLocations(page, [directoryLocation()]);

    await page.goto("/et/search?type=cleaning&q=kolimine");
    await expect(page.getByTestId("directory-card")).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Directory (partner page)", () => {
  test("isDirectory profile shows claim banner + website button + directory note", async ({ page }) => {
    await stubLoggedOut(page);
    await stubCommon(page);
    await stubListings(page, { items: [] });
    await stubPartner(page, partnerProfile());

    await page.goto("/et/partner/kolimisfirma");

    // Header: company name + outbound website button (noopener/noreferrer)
    await expect(page.getByRole("heading", { name: "Kolimisfirma OÜ" })).toBeVisible({ timeout: 15000 });
    const website = page.getByRole("link", { name: /koduleht/i });
    await expect(website).toBeVisible();
    await expect(website).toHaveAttribute("href", "https://kolimisfirma.ee");
    await expect(website).toHaveAttribute("rel", /noopener/);
    await expect(website).toHaveAttribute("rel", /noreferrer/);

    // Directory note replaces the empty-listings block
    await expect(page.getByText(/see ettevõte on ruumly kataloogis/i)).toBeVisible();
    await expect(page.getByText(/avalikke kuulutusi veel pole/i)).not.toBeVisible();

    // Claim banner at the bottom with mailto CTA carrying the slug
    await expect(page.getByText("See on sinu ettevõte?")).toBeVisible();
    const claimCta = page.getByRole("link", { name: /võta profiil üle/i });
    await expect(claimCta).toBeVisible();
    const href = await claimCta.getAttribute("href");
    expect(href).toContain("mailto:info@ruumly.eu");
    expect(decodeURIComponent(href ?? "")).toContain("Profiili ülevõtmine: kolimisfirma");
  });
});

test.describe("Directory (funnel categories)", () => {
  test("selecting the cleaning card submits categories containing 'cleaning'", async ({ page }) => {
    await stubLoggedOut(page);
    await stubCommon(page);
    await stubListings(page);

    // Capture the POST /leads/request body (registered last → wins over stubs).
    let postedBody: { categories?: string[] } | null = null;
    await page.route(/\/leads\/request/, (route) => {
      if (route.request().method() !== "POST") return route.continue();
      postedBody = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });

    await page.goto("/et/request");

    // Step 1 — select the new cleaning card ("Koristus")
    const cleaningCard = page.getByRole("button", { name: /koristus/i }).first();
    await expect(cleaningCard).toBeVisible({ timeout: 15000 });
    await cleaningCard.click();
    await expect(cleaningCard).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /edasi/i }).click();

    // Step 2 — city
    const cityInput = page.locator("#req-city");
    await expect(cityInput).toBeVisible({ timeout: 10000 });
    await cityInput.fill("Tallinn");
    await page.getByRole("button", { name: /edasi/i }).click();

    // Step 3 — email + submit
    const emailInput = page.locator("#req-email");
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill("test@example.com");
    await page.getByRole("button", { name: /saada päring/i }).click();

    // Success screen + exact API slug in the POST body
    await expect(page.getByText("Saime kätte!")).toBeVisible({ timeout: 10000 });
    expect(postedBody).not.toBeNull();
    expect(postedBody!.categories).toContain("cleaning");
  });
});
