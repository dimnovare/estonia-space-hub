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

  test("retryable error (500) shows the error state with Retry, NOT the invalid state", async ({ page }) => {
    // Finding 2: a transient 5xx on a valid offer must not read as a dead 404.
    await stubAll(page);
    await stubPublicOffer(page, { getStatus: 500 });
    await page.goto("/et/offer/tok-abc123");
    await expect(page.getByText("Midagi läks valesti")).toBeVisible({ timeout: 15000 });
    // The invalid-link dead-end must NOT appear for a non-404.
    await expect(page.getByText("Seda pakkumist ei leitud")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /proovi uuesti/i })).toBeVisible();
  });

  test("choose failure (stale option 400) shows a visible banner, not a silent close", async ({ page }) => {
    // Finding 1: non-409 choose errors used to close the dialog with zero feedback.
    await stubAll(page);
    await stubPublicOffer(page, { chooseStatus: 400 });
    await page.goto("/et/offer/tok-abc123");
    await page.getByRole("button", { name: /vali see pakkumine/i }).first().click();
    await page.getByRole("button", { name: /jah, valin selle/i }).click();
    // Dialog closes AND an alert banner appears (offer.staleOption for 400).
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/pakkumist värskendati/i)).toBeVisible();
    // The offer is still choosable (refetched fresh option ids).
    await expect(page.getByRole("button", { name: /vali see pakkumine/i }).first()).toBeVisible();
  });

  test("choose failure (server 500) shows the generic retryable choose error", async ({ page }) => {
    await stubAll(page);
    await stubPublicOffer(page, { chooseStatus: 500 });
    await page.goto("/et/offer/tok-abc123");
    await page.getByRole("button", { name: /vali see pakkumine/i }).first().click();
    await page.getByRole("button", { name: /jah, valin selle/i }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/valikut ei õnnestunud salvestada/i)).toBeVisible();
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
