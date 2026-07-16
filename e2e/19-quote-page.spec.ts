import { test, expect, type Page } from "@playwright/test";
import { stubCommon, stubLoggedOut, stubQuote, publicQuote } from "./fixtures";

/**
 * 19 — Public provider quote page /{lang}/quote/{token} (spec Feature B)
 *
 * All API calls mocked (contract per spec §B): GET /quote/{token} returns the
 * PII-free ask + provider name; POST /quote/{token} stores the price and marks
 * the outreach Replied. Unknown/expired tokens 404 → one clean invalid state.
 * stubQuote is stateful, so a submit flips the GET to already-submitted.
 */

async function stubAll(page: Page) {
  await stubLoggedOut(page);
  await stubCommon(page);
}

/** The consent banner is a bottom overlay — dismiss it before hitting the CTA. */
async function dismissCookies(page: Page) {
  const accept = page.getByRole("button", { name: "Accept" });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}

test.describe("Public provider quote page", () => {
  test("happy path: shows the PII-free ask, submits a price, then thanks the provider", async ({ page }) => {
    await stubAll(page);
    await stubQuote(page);
    await page.goto("/en/quote/tok-quote-1");

    await expect(page.getByRole("heading", { name: /submit your quote for ruumly/i }))
      .toBeVisible({ timeout: 15000 });
    // The provider knows who they are; the ask carries category / city / date / size.
    await expect(page.getByText("Panicom Miniladu")).toBeVisible();
    await expect(page.getByText("Storage", { exact: true })).toBeVisible();
    await expect(page.getByText("Tallinn", { exact: true })).toBeVisible();
    await expect(page.getByText("u 20 m2, augusti algusest")).toBeVisible();

    // NO customer PII may ever reach the provider.
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("mari@example.com");
    expect(body).not.toContain("Mari Maasikas");
    expect(body).not.toContain("+372 5555 5555");

    await dismissCookies(page);
    await page.getByLabel("Price").fill("89");
    await page.getByLabel("Unit").selectOption("/mo");
    await page.getByLabel(/availability/i).fill("From Aug 1");
    await page.getByLabel(/^note/i).fill("24/7 access included");

    const submit = page.waitForRequest((r) =>
      r.method() === "POST" && new URL(r.url()).pathname.endsWith("/quote/tok-quote-1"));
    await page.getByRole("button", { name: /send quote/i }).click();
    expect((await submit).postDataJSON()).toEqual({
      priceAmount: 89,
      priceUnit: "/mo",
      availability: "From Aug 1",
      note: "24/7 access included",
    });

    await expect(page.getByText(/thank you! your quote is in/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /send quote/i })).toHaveCount(0);
  });

  test("already-submitted quote prefills the form and offers an update", async ({ page }) => {
    await stubAll(page);
    await stubQuote(page, {
      quote: publicQuote({
        alreadySubmitted: true,
        existing: { amount: 75, unit: "/mo", availability: "From Sept 1", note: "Ground floor" },
      }),
    });
    await page.goto("/en/quote/tok-quote-1");

    await expect(page.getByText(/you've already submitted a quote/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel("Price")).toHaveValue("75");
    await expect(page.getByLabel("Unit")).toHaveValue("/mo");
    await expect(page.getByLabel(/availability/i)).toHaveValue("From Sept 1");
    await expect(page.getByLabel(/^note/i)).toHaveValue("Ground floor");
    // The CTA is an update, not a fresh submit.
    await expect(page.getByRole("button", { name: /update your quote/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^send quote$/i })).toHaveCount(0);
  });

  test("a stored unit we didn't mint is preserved, not blanked, on re-submit", async ({ page }) => {
    // The backend stores `unit` as an unconstrained clamped string, so a value
    // outside our canonical option set (here the backend's own example, and what
    // a quote submitted before this page shipped could hold) must survive a
    // re-save rather than silently round-trip to an empty unit.
    await stubAll(page);
    await stubQuote(page, {
      quote: publicQuote({
        alreadySubmitted: true,
        existing: { amount: 250, unit: "onetime", availability: "next week", note: "2 movers" },
      }),
    });
    await page.goto("/en/quote/tok-quote-1");
    await expect(page.getByLabel("Unit")).toHaveValue("onetime", { timeout: 15000 });

    await dismissCookies(page);
    const submit = page.waitForRequest((r) =>
      r.method() === "POST" && new URL(r.url()).pathname.endsWith("/quote/tok-quote-1"));
    await page.getByRole("button", { name: /update your quote/i }).click();
    expect((await submit).postDataJSON()).toMatchObject({ priceAmount: 250, priceUnit: "onetime" });
  });

  test("an Estonian grouped price submits at full value and is echoed back", async ({ page }) => {
    // Regression: parseFloat prefix-parsed "1 200,50" to 1. The provider saw the
    // green thank-you, €1 was stored and auto-seeded, and the customer was
    // quoted €1 — with no error and nothing echoed to notice it by.
    await stubAll(page);
    await stubQuote(page);
    await page.goto("/en/quote/tok-quote-1");
    await expect(page.getByLabel("Price")).toBeVisible({ timeout: 15000 });

    const submit = page.waitForRequest((r) =>
      r.method() === "POST" && new URL(r.url()).pathname.endsWith("/quote/tok-quote-1"));
    await page.getByLabel("Price").fill("1 200,50");
    await page.getByRole("button", { name: /send quote/i }).click();
    expect((await submit).postDataJSON().priceAmount).toBe(1200.5);

    // The thank-you now echoes the STORED amount — the provider's detection path.
    await expect(page.getByText(/your submitted price/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/1200\.5/)).toBeVisible();
  });

  test("an ambiguous grouped price is rejected rather than guessed at", async ({ page }) => {
    // "1,200" is 1200 to a US reader and 1.200 to an EU one — refuse to pick.
    await stubAll(page);
    await stubQuote(page);
    await page.goto("/en/quote/tok-quote-1");
    await expect(page.getByLabel("Price")).toBeVisible({ timeout: 15000 });

    let posts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && new URL(r.url()).pathname.endsWith("/quote/tok-quote-1")) posts += 1;
    });
    await page.getByLabel("Price").fill("1,200");
    await page.getByRole("button", { name: /send quote/i }).click();
    await expect(page.getByText(/please enter a valid price/i)).toBeVisible();
    expect(posts).toBe(0);
  });

  test("a closed lead shows the closed state upfront instead of the form", async ({ page }) => {
    await stubAll(page);
    await stubQuote(page, { quote: publicQuote({ closed: true }) });
    await page.goto("/en/quote/tok-quote-1");

    await expect(page.getByText(/this request is already closed/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /send quote/i })).toHaveCount(0);
    await expect(page.getByLabel("Price")).toHaveCount(0);
    // NOT the dead-link state: the link is fine, the job is gone.
    await expect(page.getByText(/this request wasn't found/i)).toHaveCount(0);
  });

  test("a lead that closes mid-visit shows the closed state, not a generic error", async ({ page }) => {
    await stubAll(page);
    await stubQuote(page, { closeOnSubmit: true }); // GET quotable, POST 409 lead_closed
    await page.goto("/en/quote/tok-quote-1");
    await expect(page.getByLabel("Price")).toBeVisible({ timeout: 15000 });

    await page.getByLabel("Price").fill("89");
    await page.getByRole("button", { name: /send quote/i }).click();

    await expect(page.getByText(/this request is already closed/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/couldn't send your quote/i)).toHaveCount(0);
    await expect(page.getByText(/this request wasn't found/i)).toHaveCount(0);
  });

  test("a 429 with Retry-After tells the provider how long to wait", async ({ page }) => {
    await stubAll(page);
    await stubQuote(page, { submitStatus: 429, retryAfterSeconds: 45 });
    await page.goto("/en/quote/tok-quote-1");
    await expect(page.getByLabel("Price")).toBeVisible({ timeout: 15000 });

    await page.getByLabel("Price").fill("89");
    await page.getByRole("button", { name: /send quote/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/try again in 45s/i)).toBeVisible();
  });

  test("invalid/expired token shows the clean invalid state", async ({ page }) => {
    await stubAll(page);
    await stubQuote(page, { getStatus: 404 });
    await page.goto("/en/quote/expired-token");

    await expect(page.getByText(/this request wasn't found/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /send quote/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /back to home/i })).toBeVisible();
  });

  test("retryable error (500) shows the error state with Retry, NOT the invalid state", async ({ page }) => {
    await stubAll(page);
    await stubQuote(page, { getStatus: 500 });
    await page.goto("/en/quote/tok-quote-1");

    await expect(page.getByText("Something went wrong")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/this request wasn't found/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
  });

  test("rate limited (429) shows the wait-and-retry state, NOT the invalid state", async ({ page }) => {
    // The endpoint is anonymous and capped at 5 requests / 10 min per IP — a
    // throttled provider must never be told their link is dead.
    await stubAll(page);
    await stubQuote(page, { getStatus: 429 });
    await page.goto("/en/quote/tok-quote-1");

    await expect(page.getByText(/too many attempts/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/this request wasn't found/i)).toHaveCount(0);
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
  });

  test("rate-limited submit (429) keeps the form and explains the wait", async ({ page }) => {
    await stubAll(page);
    await stubQuote(page, { submitStatus: 429 });
    await page.goto("/en/quote/tok-quote-1");
    await expect(page.getByLabel("Price")).toBeVisible({ timeout: 15000 });

    await dismissCookies(page);
    await page.getByLabel("Price").fill("99");
    await page.getByRole("button", { name: /send quote/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/too many attempts/i)).toBeVisible();
    await expect(page.getByLabel("Price")).toHaveValue("99");
  });

  test("submit failure keeps the form filled and shows an alert", async ({ page }) => {
    await stubAll(page);
    await stubQuote(page, { submitStatus: 500 });
    await page.goto("/en/quote/tok-quote-1");
    await expect(page.getByLabel("Price")).toBeVisible({ timeout: 15000 });

    await dismissCookies(page);
    await page.getByLabel("Price").fill("120");
    await page.getByRole("button", { name: /send quote/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/couldn't send your quote/i)).toBeVisible();
    // The provider must not lose their input on a transient failure.
    await expect(page.getByLabel("Price")).toHaveValue("120");
  });

  test("an invalid price is rejected client-side without firing a request", async ({ page }) => {
    await stubAll(page);
    await stubQuote(page);
    await page.goto("/en/quote/tok-quote-1");
    await expect(page.getByLabel("Price")).toBeVisible({ timeout: 15000 });

    let posts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && new URL(r.url()).pathname.endsWith("/quote/tok-quote-1")) posts += 1;
    });

    await dismissCookies(page);
    await page.getByLabel("Price").fill("abc");
    await page.getByRole("button", { name: /send quote/i }).click();
    await expect(page.getByText(/please enter a valid price/i)).toBeVisible();
    expect(posts).toBe(0);
  });

  test("minimal chrome: full navbar is suppressed, slim logo header instead", async ({ page }) => {
    await stubAll(page);
    await stubQuote(page);
    await page.goto("/en/quote/tok-quote-1");
    await expect(page.getByRole("heading", { name: /submit your quote/i })).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole("button", { name: "Services" })).toHaveCount(0);
    await expect(page.locator("header nav")).toHaveCount(0);
    await expect(page.locator("header").getByRole("link", { name: "Ruumly" })).toBeVisible();
  });

  test("is noindex — the tokenized page must never be indexed", async ({ page }) => {
    await stubAll(page);
    await stubQuote(page);
    await page.goto("/en/quote/tok-quote-1");
    await expect(page.getByRole("heading", { name: /submit your quote/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("renders without horizontal overflow at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await stubAll(page);
    await stubQuote(page, {
      quote: publicQuote({
        provider: { name: "Väga pika nimega partnerettevõte, kes vastutab pakkumise eest" },
        lead: {
          category: "warehouse", city: "Tallinn", toCity: "Tartu", needDate: "2026-08-01",
          details: "Pikk kirjeldus, mis peab murduma väiksel ekraanil ega tohi lehte horisontaalselt kerima panna.",
        },
      }),
    });
    await page.goto("/en/quote/tok-quote-1");
    await expect(page.getByRole("heading", { name: /submit your quote/i })).toBeVisible({ timeout: 15000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
