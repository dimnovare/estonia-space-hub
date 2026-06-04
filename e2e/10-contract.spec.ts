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
 * 10 — Contract signing (sign-then-pay order).
 * Reconciled with the real app. The booking flow was reordered to
 * book → SIGN → pay. On step-2 Confirm, BookingPage creates the booking
 * (Pending) and immediately opens a MANDATORY signing gate: it renders the
 * "sign your rental agreement" screen (booking.sign.gateTitle) and mounts the
 * ContractSigningModal (a Radix dialog) right away — controlled by `showSignGate`.
 * The old post-payment ContractCta on the success screen was REMOVED; the modal
 * now opens DIRECTLY after Confirm (no CTA click needed). Only after a successful
 * sign does payment initiate.
 *
 * Scope (kept realistic per the brief): we drive the real 3-step booking flow
 * (logged-in customer), click Confirm, and assert the signing gate dialog opens
 * directly with its step-1 contents (review title, agree checkbox, continue
 * button). We use the canvas fallback (signing-method all-false) and do NOT
 * complete the actual sign or assert a Montonio redirect.
 */

const LISTING = apiListing({ id: "wh-001", title: "Leping Ladu", priceFrom: 39 });
const BOOK_URL = "/et/book?listing=wh-001&type=warehouse";

async function stubContractEndpoints(page: import("@playwright/test").Page) {
  const json = (body: unknown, status = 200) => ({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
  // Non-empty templates → modal step-1 has a template (continue is enabled once agreed).
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

/**
 * Drive the 3-step wizard through Confirm; returns once the signing gate dialog
 * (ContractSigningModal) is visible. In the new sign-then-pay order the modal
 * opens directly after Confirm — there is no intermediate CTA.
 */
async function confirmBookingToSignGate(page: import("@playwright/test").Page) {
  await page.goto(BOOK_URL);
  await expect(page.getByText("Leping Ladu").first()).toBeVisible({ timeout: 15000 });

  // Step 0 → 1 (dates are pre-filled to today→tomorrow).
  await page.getByRole("button", { name: /järgmine/i }).first().click();

  // Step 1 — contact form. Name/email come from the seeded user; phone is required.
  await expect(page.locator('input[type="tel"]').first()).toBeVisible({ timeout: 10000 });
  await page.locator('input[type="tel"]').first().fill("+37255500000");
  await page.getByRole("button", { name: /järgmine/i }).first().click();

  // Step 2 — review + payment. Confirm the booking ("Kinnita broneering").
  await expect(page.getByRole("button", { name: /kinnita/i }).first()).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: /kinnita/i }).first().click();

  // The mandatory signing gate opens directly: the ContractSigningModal (Radix dialog).
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15000 });
  return dialog;
}

test.describe("Contract signing", () => {
  test("the signing gate opens after confirming the booking", async ({ page }) => {
    await stubAll(page);
    const dialog = await confirmBookingToSignGate(page);
    await expect(dialog).toBeVisible();
    // The gate screen heading (booking.sign.gateTitle) renders behind the modal.
    await expect(page.getByText("Allkirjasta oma rendileping").first()).toBeVisible({ timeout: 10000 });
  });

  test("the signing modal shows step 1 (review + agree + continue)", async ({ page }) => {
    await stubAll(page);
    const dialog = await confirmBookingToSignGate(page);

    // Step 1 — review the contract, agree, continue.
    await expect(dialog.getByText("Tutvu lepinguga")).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole("checkbox")).toBeVisible();
    await expect(dialog.getByRole("button", { name: /edasi allkirjastama/i })).toBeVisible();
  });

  test("checking agree enables continue to the signing step", async ({ page }) => {
    await stubAll(page);
    const dialog = await confirmBookingToSignGate(page);
    await expect(dialog.getByText("Tutvu lepinguga")).toBeVisible({ timeout: 10000 });

    const continueBtn = dialog.getByRole("button", { name: /edasi allkirjastama/i });
    await expect(continueBtn).toBeDisabled();

    await dialog.getByRole("checkbox").click();
    await expect(continueBtn).toBeEnabled();
  });
});
