import { test, expect } from "@playwright/test";
import { stubCommon, stubLoggedOut, stubPublicOffer, publicOffer } from "./fixtures";

/**
 * 16 — Public offer page /et/offer/{token} (overhaul spec §5)
 *
 * All API calls mocked (contract per spec §5.1): GET /offers/{token} returns
 * the sanitized offer; POST /offers/{token}/choose confirms an option.
 * Unknown/draft/expired tokens 404 identically → one invalid state.
 */

async function stubAll(page: import("@playwright/test").Page) {
  await stubLoggedOut(page);
  await stubCommon(page);
}

test.describe("Public offer page", () => {
  test("happy path: renders options, choose → confirm → success state", async ({ page }) => {
    await stubAll(page);
    await stubPublicOffer(page);
    await page.goto("/et/offer/tok-abc123");

    // Title carries the localized category + city.
    await expect(page.getByRole("heading", { name: /sinu valikud: hoiustamine — tallinn/i }))
      .toBeVisible({ timeout: 15000 });
    // Option cards with title, provider name and price.
    await expect(page.getByText("Miniladu 10 m² kesklinnas")).toBeVisible();
    await expect(page.getByText("Acme Storage")).toBeVisible();
    await expect(page.getByText("€89")).toBeVisible();
    // Concierge note renders.
    await expect(page.getByText(/mõlemad partnerid saavad/i)).toBeVisible();

    // Choose the first option → confirm dialog → confirm.
    await page.getByRole("button", { name: /vali see pakkumine/i }).first().click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByText(/valid pakkumise/i)).toBeVisible();
    await page.getByRole("button", { name: /jah, valin selle/i }).click();

    // Success state: banner + chosen badge; other options lose their buttons.
    await expect(page.getByText("Valik kinnitatud!")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Sinu valik", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /vali see pakkumine/i })).toHaveCount(0);
  });

  test("already-chosen offer renders the chosen state (no choose buttons)", async ({ page }) => {
    await stubAll(page);
    await stubPublicOffer(page, {
      offer: publicOffer({ status: "chosen", chosenOptionId: "opt-2" }),
    });
    await page.goto("/et/offer/tok-abc123");
    await expect(page.getByText(/oled valiku juba teinud/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Sinu valik", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /vali see pakkumine/i })).toHaveCount(0);
  });

  test("invalid/expired token shows the invalid state with a request CTA", async ({ page }) => {
    await stubAll(page);
    await stubPublicOffer(page, { getStatus: 404 });
    await page.goto("/et/offer/expired-token");
    await expect(page.getByText("Seda pakkumist ei leitud")).toBeVisible({ timeout: 15000 });
    const cta = page.getByRole("link", { name: /küsi pakkumist/i });
    await expect(cta).toBeVisible();
    await cta.click();
    await page.waitForURL(/\/et\/request/, { timeout: 10000 });
  });

  test("minimal chrome: full navbar is suppressed, slim logo header instead", async ({ page }) => {
    await stubAll(page);
    await stubPublicOffer(page);
    await page.goto("/et/offer/tok-abc123");
    await expect(page.getByRole("heading", { name: /sinu valikud/i })).toBeVisible({ timeout: 15000 });
    // No Services mega-menu trigger and no primary nav on this page.
    await expect(page.getByRole("button", { name: "Teenused" })).toHaveCount(0);
    await expect(page.locator("header nav")).toHaveCount(0);
    // The slim header still links home via the brand mark.
    await expect(page.locator("header").getByRole("link", { name: "Ruumly" })).toBeVisible();
  });
});
