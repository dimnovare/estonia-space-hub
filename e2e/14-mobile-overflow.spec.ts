import { test, expect, type Page } from "@playwright/test";
import {
  stubCommon, stubListings, stubLoggedOut, stubLocations, stubPartner,
  apiLocation, directoryLocation, partnerProfile,
} from "./fixtures";

/**
 * 14 — Mobile horizontal-overflow guard (375px)
 *
 * A real-device report showed /en/search scrolling right into a white dead
 * area. The page (html/body) must never scroll horizontally on a phone:
 * horizontally scrollable rows (filter chips etc.) must clip inside their own
 * overflow-x-auto container. This spec renders the main public pages with
 * prod-shaped stubbed data at 375px and fails on any unclipped offender.
 */

test.use({ viewport: { width: 375, height: 812 } });

async function assertNoPageOverflow(page: Page) {
  const res = await page.evaluate(() => {
    const doc = document.documentElement;
    const offenders: string[] = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > doc.clientWidth + 1) {
        // Walk up: an ancestor that clips/scrolls horizontally makes this fine.
        let p = el.parentElement;
        let clipped = false;
        while (p && p !== document.body) {
          const o = getComputedStyle(p).overflowX;
          if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") { clipped = true; break; }
          p = p.parentElement;
        }
        if (!clipped) {
          const cls = (el.className || "").toString().slice(0, 90);
          offenders.push(`${el.tagName}[${cls}] right=${Math.round(r.right)}px`);
        }
      }
    });
    return {
      htmlScrollW: doc.scrollWidth,
      clientW: doc.clientWidth,
      bodyScrollW: document.body.scrollWidth,
      offenders: offenders.slice(0, 10),
    };
  });
  expect(res.offenders, `unclipped elements wider than the viewport`).toEqual([]);
  expect(res.htmlScrollW, "html must not scroll horizontally").toBeLessThanOrEqual(res.clientW + 1);
  expect(res.bodyScrollW, "body must not scroll horizontally").toBeLessThanOrEqual(res.clientW + 1);
}

async function stubAll(page: Page) {
  await stubLoggedOut(page);
  await stubCommon(page);
  await stubListings(page);
  await stubLocations(page, [directoryLocation(), apiLocation()]);
}

test.describe("No horizontal page overflow at 375px", () => {
  test("search results page", async ({ page }) => {
    await stubAll(page);
    await page.goto("/en/search");
    await expect(page.getByTestId("directory-card")).toBeVisible({ timeout: 15000 });
    await assertNoPageOverflow(page);
  });

  test("search results page (directory-only category chip)", async ({ page }) => {
    await stubAll(page);
    await page.goto("/en/search?type=cleaning");
    await expect(page.getByTestId("directory-card")).toBeVisible({ timeout: 15000 });
    await assertNoPageOverflow(page);
  });

  test("homepage", async ({ page }) => {
    await stubAll(page);
    await page.goto("/en/");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });
    await assertNoPageOverflow(page);
  });

  test("partner page", async ({ page }) => {
    await stubAll(page);
    await stubPartner(page, partnerProfile());
    await page.goto("/en/partner/kolimisfirma");
    await expect(page.getByRole("heading", { name: "Kolimisfirma OÜ" })).toBeVisible({ timeout: 15000 });
    await assertNoPageOverflow(page);
  });

  test("request funnel", async ({ page }) => {
    await stubAll(page);
    await page.goto("/en/request");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });
    await assertNoPageOverflow(page);
  });
});
