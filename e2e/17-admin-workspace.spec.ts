import { test, expect } from "@playwright/test";
import {
  stubCommon, stubListings, seedAuth, adminUser,
  stubAdminLeads, stubOfferLoop, adminLead, adminMatch,
} from "./fixtures";

/**
 * 17 — Admin lead workspace smoke (overhaul spec §5 Admin UI)
 *
 * /et/admin?tab=leads with a seeded admin session; ALL API calls mocked.
 * The expanded lead row is the workspace: status pipeline chips, contact
 * shortcuts, outreach panel (matches → "Ask availability" → sent rows),
 * offer builder (create → edit → save → send with confirm → timestamps)
 * and the derived activity timeline. Endpoint shapes per spec §5.1
 * (stubOfferLoop is stateful, so the loop behaves like the real backend).
 */

async function openWorkspace(page: import("@playwright/test").Page) {
  await seedAuth(page, adminUser);
  await stubCommon(page);
  await stubListings(page);
  await stubAdminLeads(page, { items: [adminLead()], matches: [adminMatch()] });
  await stubOfferLoop(page); // AFTER stubAdminLeads — wins the overlapping paths
  await page.goto("/et/admin?tab=leads");
  const details = page.getByRole("button", { name: /detailid|details/i }).first();
  await expect(details).toBeVisible({ timeout: 15000 });
  await details.click();
}

test.describe("Admin lead workspace", () => {
  test("workspace renders pipeline, facts, outreach panel, offer panel and timeline", async ({ page }) => {
    await openWorkspace(page);

    // Status pipeline chips (aria-pressed marks the current stage).
    await expect(page.locator('button[aria-pressed="true"]').first()).toBeVisible();
    // Contact shortcuts.
    await expect(page.locator('a[href="mailto:mari@example.com"]')).toBeVisible();
    await expect(page.locator('a[href="tel:+37255555555"]')).toBeVisible();
    // Outreach + offer panels.
    await expect(page.getByText("Partnerite saadavuspäring")).toBeVisible();
    await expect(page.getByText("Pakkumine kliendile")).toBeVisible();
    await expect(page.getByText("Acme Storage").first()).toBeVisible();
    // Derived timeline starts with the request itself.
    await expect(page.getByText("Päring saabus")).toBeVisible();
  });

  test("outreach: select a match and ask availability → sent row with status dropdown", async ({ page }) => {
    await openWorkspace(page);

    await expect(page.getByText(/saadavuspäringuid pole veel saadetud/i)).toBeVisible();
    await page.getByRole("checkbox", { name: "Acme Storage" }).check();
    await page.getByRole("button", { name: /küsi saadavust/i }).click();

    // The stateful stub records the row; the panel refetches and lists it.
    await expect(page.getByText("acme@example.com").last()).toBeVisible({ timeout: 10000 });
    const statusSelect = page.locator("select").filter({ hasText: "Saadetud" }).last();
    await expect(statusSelect).toBeVisible();
    // Timeline picks up the outreach event.
    await expect(page.getByText(/saadavuspäring → acme storage/i)).toBeVisible();
  });

  test("offer builder: create → add option → save → send with confirm → sent badge", async ({ page }) => {
    await openWorkspace(page);

    // Create the draft.
    await page.getByRole("button", { name: /koosta pakkumine/i }).click();
    await expect(page.getByRole("button", { name: /lisa valik/i })).toBeVisible({ timeout: 10000 });

    // Add a blank option and fill it in.
    await page.getByRole("button", { name: /lisa valik/i }).click();
    await page.getByPlaceholder("Pealkiri").first().fill("Miniladu 10 m² kesklinnas");
    await page.getByPlaceholder("Hind (€)").first().fill("89");
    await page.getByPlaceholder("Ühik (nt €/kuu)").first().fill("€/kuu");

    // Save the draft.
    await page.getByRole("button", { name: /salvesta mustand/i }).click();
    await expect(page.getByText("Pakkumine salvestatud")).toBeVisible({ timeout: 10000 });

    // Send with confirm.
    await page.getByRole("button", { name: /saada kliendile/i }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: /saada kliendile/i }).click();

    // Sent: toast + status badge + timestamp + copy-link (NOT a navigating
    // anchor — Finding 7) + timeline event. The draft "open page" link is gone.
    await expect(page.getByText("Pakkumine saadetud", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /kopeeri pakkumise link/i })).toBeVisible();
    await expect(page.getByText(/ava pakkumise leht/i)).toHaveCount(0);
    await expect(page.getByText("Pakkumine saadetud kliendile")).toBeVisible();
  });

  test("offer builder seeds from a match via the + button", async ({ page }) => {
    await openWorkspace(page);

    // "+ To offer" on a match creates the draft pre-filled with the supplier.
    await page.getByRole("button", { name: /pakkumisse/i }).click();
    await expect(page.getByRole("button", { name: /lisa valik/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("Pealkiri").first()).toHaveValue("Miniladu 10 m²");
  });

  test("draft offer keeps a real 'open page' link (safe: draft 404s publicly)", async ({ page }) => {
    // Finding 7: the read-receipt hazard only exists once SENT — draft may link.
    await openWorkspace(page);
    await page.getByRole("button", { name: /pakkumisse/i }).click();
    await expect(page.getByRole("link", { name: /ava pakkumise leht/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /kopeeri pakkumise link/i })).toHaveCount(0);
  });

  test("clearing the customer note sends an empty string, not null (Finding 4)", async ({ page }) => {
    await openWorkspace(page);

    // Record every PATCH body to /admin/offers/{id}.
    const patchNotes: unknown[] = [];
    page.on("request", (req) => {
      if (req.method() === "PATCH" && /\/admin\/offers\/[^/]+$/.test(new URL(req.url()).pathname)) {
        patchNotes.push((req.postDataJSON() ?? {}).customerNote);
      }
    });

    await page.getByRole("button", { name: /koosta pakkumine/i }).click();
    const noteField = page.getByLabel(/üldine märkus kliendile/i);
    await expect(noteField).toBeVisible({ timeout: 10000 });

    // Write a note, save → PATCH carries the text.
    await noteField.fill("Mõlemad partnerid saavad su ajal.");
    await page.getByRole("button", { name: /salvesta mustand/i }).click();
    await expect(page.getByText("Pakkumine salvestatud")).toBeVisible({ timeout: 10000 });

    // Clear it, save again → PATCH must carry "" (backend Clamp("") → null clears).
    await noteField.fill("");
    await page.getByRole("button", { name: /salvesta mustand/i }).click();
    await expect(page.getByText("Pakkumine salvestatud")).toBeVisible({ timeout: 10000 });

    expect(patchNotes.length).toBeGreaterThanOrEqual(2);
    expect(patchNotes.at(-1)).toBe(""); // empty string, NOT null / undefined
    // The cleared note must not resurrect in the field after the save round-trip.
    await expect(noteField).toHaveValue("");
  });
});
