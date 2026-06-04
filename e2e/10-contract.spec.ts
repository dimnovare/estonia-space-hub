import { test, expect } from "@playwright/test";
import {
  apiListing,
  stubCommon,
  stubListings,
  stubBookingCreate,
  seedAuth,
  customerUser,
} from "./fixtures";

/**
 * 10 — Contract signing.
 * Reconciled with the real app. The ContractSigningModal (src/components/
 * ContractSigningModal.tsx) is mounted from BookingPage *after* a booking is
 * created, and the "sign" CTA (ContractCta) only renders when
 * GET /contracts/templates?bookingId= returns a NON-EMPTY array.
 *
 * Scope (kept realistic per the brief): we drive the real 3-step booking flow to
 * completion (logged-in customer), assert the ContractCta appears, open the
 * modal, and assert its step-1 contents (review title, agree checkbox, continue
 * button). We use the canvas fallback (signing-method all-false) and do not
 * exercise the full canvas / Dokobit / Smart-ID signing flow.
 */

const LISTING = apiListing({ id: "wh-001", title: "Leping Ladu", priceFrom: 39 });
const BOOK_URL = "/et/book?listing=wh-001&type=warehouse";

async function stubContractEndpoints(page: import("@playwright/test").Page) {
  const json = (body: unknown, status = 200) => ({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
  // Non-empty templates → ContractCta renders + modal step-1 has a template.
  await page.route(/\/contracts\/templates/, (r) =>
    r.fulfill(json([{ id: "tpl-1", name: "Rental contract" }])),
  );
  // Contract HTML preview for the modal iframe.
  await page.route(/\/contracts\/preview/, (r) => r.fulfill(json({ html: "<p>Contract</p>" })));
  // Canvas fallback path (no Dokobit, no Smart-ID/Mobile-ID).
  await page.route(/\/contracts\/signing-method/, (r) =>
    r.fulfill(json({ dokobitEnabled: false, smartIdEnabled: false, mobileIdEnabled: false })),
  );
}

async function stubAll(page: import("@playwright/test").Page) {
  await seedAuth(page, customerUser);
  await stubCommon(page);
  await stubListings(page, { items: [LISTING] });
  await stubBookingCreate(page); // POST /bookings → { id: 'booking-001', status: 'pending' }
  await stubContractEndpoints(page);
}

/** Drive the 3-step wizard to the success screen; returns once phase=done renders. */
async function completeBooking(page: import("@playwright/test").Page) {
  await page.goto(BOOK_URL);
  await expect(page.getByText("Leping Ladu").first()).toBeVisible({ timeout: 15000 });

  // Step 0 → 1 (dates are pre-filled to today→tomorrow).
  await page.getByRole("button", { name: /järgmine/i }).first().click();

  // Step 1 — contact form. Name/email come from the seeded user; phone is required.
  await expect(page.locator('input[type="tel"]').first()).toBeVisible({ timeout: 10000 });
  await page.locator('input[type="tel"]').first().fill("+37255500000");
  await page.getByRole("button", { name: /järgmine/i }).first().click();

  // Step 2 — review + payment. Confirm the booking.
  await expect(page.getByRole("button", { name: /kinnita/i }).first()).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: /kinnita/i }).first().click();

  // Success screen progresses through timed phases to "done".
  await expect(page.getByText("Allkirjasta leping").first()).toBeVisible({ timeout: 15000 });
}

test.describe("Contract signing", () => {
  test("ContractCta sign button appears after a booking with a template", async ({ page }) => {
    await stubAll(page);
    await completeBooking(page);
    const cta = page.getByRole("button", { name: /allkirjasta leping/i }).first();
    await expect(cta).toBeVisible();
  });

  test("opening the contract modal shows step 1 (review + agree + continue)", async ({ page }) => {
    await stubAll(page);
    await completeBooking(page);

    await page.getByRole("button", { name: /allkirjasta leping/i }).first().click();

    // Modal (Radix dialog) opens with the review step.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText("Tutvu lepinguga")).toBeVisible({ timeout: 10000 });
    // The agree checkbox and the (initially disabled) continue-to-sign button.
    await expect(dialog.getByRole("checkbox")).toBeVisible();
    await expect(dialog.getByRole("button", { name: /edasi allkirjastama/i })).toBeVisible();
  });

  test("checking agree enables continue to the signing step", async ({ page }) => {
    await stubAll(page);
    await completeBooking(page);

    await page.getByRole("button", { name: /allkirjasta leping/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Tutvu lepinguga")).toBeVisible({ timeout: 10000 });

    const continueBtn = dialog.getByRole("button", { name: /edasi allkirjastama/i });
    await expect(continueBtn).toBeDisabled();

    await dialog.getByRole("checkbox").click();
    await expect(continueBtn).toBeEnabled();
  });
});
