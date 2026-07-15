import { test, expect } from "@playwright/test";
import {
  stubCommon, stubListings, seedAuth, adminUser,
  stubAdminLeads, stubOfferLoop, adminLead, adminMatch, tartuProviderCandidates,
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
  await stubAdminLeads(page, { items: [adminLead()], matches: [adminMatch()], candidates: tartuProviderCandidates() });
  await stubOfferLoop(page); // AFTER stubAdminLeads — wins the overlapping paths
  await page.goto("/et/admin?tab=leads");
  const details = page.getByRole("button", { name: /detailid|details/i }).first();
  await expect(details).toBeVisible({ timeout: 15000 });
  await details.click();
}

async function openEnglishWorkspace(
  page: import("@playwright/test").Page,
  options: NonNullable<Parameters<typeof stubOfferLoop>[1]> & { candidateStatus?: number } = {},
) {
  await seedAuth(page, adminUser);
  await stubCommon(page);
  await stubListings(page);
  await stubAdminLeads(page, {
    items: [adminLead({ city: "Tartu", language: "en" })],
    matches: [adminMatch()],
    candidates: tartuProviderCandidates(),
    candidateStatus: options.candidateStatus,
  });
  await stubOfferLoop(page, options);
  await page.goto("/en/admin?tab=leads");
  const acceptCookies = page.getByRole("button", { name: "Accept" });
  if (await acceptCookies.isVisible()) await acceptCookies.click();
  const details = page.getByRole("button", { name: /details/i }).first();
  await expect(details).toBeVisible({ timeout: 15000 });
  await details.click();
}

test.describe("Admin lead workspace", () => {
  test("nearby provider discovery filters and reviews outreach before send", async ({ page }) => {
    await openEnglishWorkspace(page);

    await expect(page.getByText("Rare Minilaod")).toBeVisible();
    await expect(page.getByText("Kapsel Minilaod")).toBeVisible();
    await expect(page.getByText("8.4 km")).toBeVisible();
    await page.getByPlaceholder(/search providers/i).fill("Panicom");
    await expect(page.getByText("Panicom Miniladu")).toBeVisible();
    await expect(page.getByText("Rare Minilaod")).toHaveCount(0);
    await page.getByRole("button", { name: /all estonia/i }).click();
    await page.getByRole("button", { name: /all services/i }).click();
    await page.getByRole("checkbox", { name: "Panicom Miniladu" }).check();
    await page.getByRole("button", { name: /review message to 1 provider/i }).click();
    await expect(page.getByRole("dialog")).toContainText("sales@panicom.ee");
    await expect(page.getByRole("dialog")).toContainText("Ruumly");
  });

  test("candidate failure remains retryable without showing the empty state", async ({ page }) => {
    await openEnglishWorkspace(page, { candidateStatus: 500 });

    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByText("Rare Minilaod")).toHaveCount(0);
  });

  test("preview failure preserves the selected provider", async ({ page }) => {
    await openEnglishWorkspace(page, { previewStatus: 500 });

    await page.getByRole("checkbox", { name: "Panicom Miniladu" }).check();
    await page.getByRole("button", { name: /review message to 1 provider/i }).click();
    await expect(page.getByRole("checkbox", { name: "Panicom Miniladu" })).toBeChecked();
    await expect(page.getByRole("button", { name: /review message to 1 provider/i })).toBeEnabled();
  });

  test("send failure keeps outreach review open", async ({ page }) => {
    await openEnglishWorkspace(page, { outreachStatus: 500 });

    await page.getByRole("checkbox", { name: "Panicom Miniladu" }).check();
    await page.getByRole("button", { name: /review message to 1 provider/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Send availability request" }).click();
    await expect(page.getByRole("dialog")).toContainText("sales@panicom.ee");
  });

  test("outreach sends the immutable reviewed provider snapshot", async ({ page }) => {
    await openEnglishWorkspace(page, { previewDelayMs: 400 });

    await page.getByRole("checkbox", { name: "Panicom Miniladu" }).check();
    await page.getByRole("button", { name: /review message to 1 provider/i }).click();
    await page.getByRole("checkbox", { name: "Rare Minilaod" }).check();
    await expect(page.getByRole("dialog")).toContainText("sales@panicom.ee");
    await expect(page.getByRole("dialog")).not.toContainText("hello@rare.ee");

    const sendRequest = page.waitForRequest((request) =>
      request.method() === "POST" && new URL(request.url()).pathname.endsWith("/admin/leads/lead-1/outreach"));
    await page.getByRole("dialog").getByRole("button", { name: "Send availability request" }).click();
    expect((await sendRequest).postDataJSON()).toEqual({ supplierIds: ["sup-panicom"], resend: false });
  });

  test("already-contacted provider shows exact message and requires explicit resend", async ({ page }) => {
    await openEnglishWorkspace(page);

    await page.getByRole("checkbox", { name: "Tartu Ladu" }).check();
    await page.getByRole("button", { name: /review message to 1 provider/i }).click();
    const review = page.getByRole("dialog");
    await expect(review).toContainText("contact@tartuladu.ee");
    await expect(review).toContainText("Ruumly availability request for Tartu Ladu");
    await expect(review).toContainText("Exact reviewed outreach body for Tartu Ladu in Tartu.");
    await expect(review).toContainText("already_contacted");
    await review.getByRole("button", { name: "Resend availability request" }).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation).toContainText(/explicitly resends/i);

    const resendRequest = page.waitForRequest((request) =>
      request.method() === "POST" && new URL(request.url()).pathname.endsWith("/admin/leads/lead-1/outreach"));
    await confirmation.getByRole("button", { name: "Resend availability request" }).click();
    expect((await resendRequest).postDataJSON()).toEqual({ supplierIds: ["sup-contacted"], resend: true });
    await expect(page.getByText("contact@tartuladu.ee").last()).toBeVisible();
  });

  test("partial outreach keeps every successful skip reason visible", async ({ page }) => {
    await openEnglishWorkspace(page, {
      sendSkipReasons: {
        "sup-rare": "no_email",
        "sup-kapsel": "not_found",
        "sup-north": "already_contacted",
      },
    });

    for (const provider of ["Panicom Miniladu", "Rare Minilaod", "Kapsel Minilaod", "North Storage"]) {
      await page.getByRole("checkbox", { name: provider }).check();
    }
    await page.getByRole("button", { name: /review message to 4 providers/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Send availability request" }).click();

    await expect(page.getByText("no_email", { exact: true })).toBeVisible();
    await expect(page.getByText("not_found", { exact: true })).toBeVisible();
    await expect(page.getByText("already_contacted", { exact: true })).toBeVisible();
    await expect(page.getByText("sales@panicom.ee").last()).toBeVisible();
  });

  test("provider category control toggles both ways with pressed state", async ({ page }) => {
    await openEnglishWorkspace(page);
    const candidateUrls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("provider-candidates")) candidateUrls.push(request.url());
    });

    const nearby = page.getByRole("button", { name: "Nearby", exact: true });
    const allEstonia = page.getByRole("button", { name: "All Estonia", exact: true });
    await expect(nearby).toHaveAttribute("aria-pressed", "true");
    await expect(allEstonia).toHaveAttribute("aria-pressed", "false");
    await allEstonia.click();
    await expect(allEstonia).toHaveAttribute("aria-pressed", "true");

    const allServices = page.getByRole("button", { name: "All services", exact: true });
    const leadService = page.getByRole("button", { name: "Storage", exact: true });
    const anyRequest = page.waitForRequest((request) => request.url().includes("provider-candidates") && request.url().includes("category=any"));
    await allServices.click();
    await anyRequest;
    await expect(allServices).toHaveAttribute("aria-pressed", "true");
    await expect(leadService).toHaveAttribute("aria-pressed", "false");

    await leadService.click();
    await expect(leadService).toHaveAttribute("aria-pressed", "true");
    await expect(allServices).toHaveAttribute("aria-pressed", "false");
    expect(candidateUrls.some((url) => url.includes("scope=all") && url.includes("category=lead"))).toBe(true);
    expect(candidateUrls.some((url) => url.includes("scope=all") && url.includes("category=any"))).toBe(true);
  });

  test("provider stage fits mobile without clipped primary action", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openEnglishWorkspace(page);

    await page.getByRole("checkbox", { name: "Panicom Miniladu" }).check();
    const reviewButton = page.getByRole("button", { name: /review message to 1 provider/i });
    await expect(reviewButton).toBeVisible();
    const bounds = await reviewButton.boundingBox();
    expect(bounds).not.toBeNull();
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(375);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: "test-results/provider-stage-375.png", fullPage: true });
  });

  test("workspace renders pipeline, provider stage, offer panel and timeline", async ({ page }) => {
    await openWorkspace(page);

    // Status pipeline chips (aria-pressed marks the current stage).
    await expect(page.locator('button[aria-pressed="true"]').first()).toBeVisible();
    // Contact shortcuts.
    await expect(page.locator('a[href="mailto:mari@example.com"]')).toBeVisible();
    await expect(page.locator('a[href="tel:+37255555555"]')).toBeVisible();
    // Provider discovery + offer panels.
    await expect(page.getByText("Leia ja võta partneritega ühendust")).toBeVisible();
    await expect(page.getByText("Pakkumine kliendile")).toBeVisible();
    await expect(page.getByText("Rare Minilaod")).toBeVisible();
    // Derived timeline starts with the request itself.
    await expect(page.getByText("Päring saabus")).toBeVisible();
  });

  test("outreach: selected provider is reviewed before availability request is sent", async ({ page }) => {
    await openWorkspace(page);

    await expect(page.getByText(/saadavuspäringuid pole veel saadetud/i)).toBeVisible();
    await page.getByRole("checkbox", { name: "Rare Minilaod" }).check();
    await page.getByRole("button", { name: /vaata üle sõnum 1 partnerile/i }).click();
    await expect(page.getByRole("dialog")).toContainText("hello@rare.ee");
    await page.getByRole("dialog").getByRole("button", { name: /saada saadavuspäring/i }).click();

    // The stateful stub records the row; the stage refetches and lists it.
    await expect(page.getByText("hello@rare.ee").last()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Saadetud").last()).toBeVisible();
    // Timeline picks up the outreach event.
    await expect(page.getByText(/saadavuspäring → rare minilaod/i)).toBeVisible();
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

  test("offer builder seeds from a provider candidate via the + button", async ({ page }) => {
    await openWorkspace(page);

    // "+ To offer" on a provider candidate creates the draft pre-filled with the supplier.
    await page.getByRole("listitem").filter({ hasText: "Rare Minilaod" }).getByRole("button", { name: /pakkumisse/i }).click();
    await expect(page.getByRole("button", { name: /lisa valik/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("Pealkiri").first()).toHaveValue("Miniladu 5 m²");
  });

  test("draft offer keeps a real 'open page' link (safe: draft 404s publicly)", async ({ page }) => {
    // Finding 7: the read-receipt hazard only exists once SENT — draft may link.
    await openWorkspace(page);
    await page.getByRole("listitem").filter({ hasText: "Rare Minilaod" }).getByRole("button", { name: /pakkumisse/i }).click();
    await expect(page.getByRole("link", { name: /ava pakkumise leht/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /kopeeri pakkumise link/i })).toHaveCount(0);
  });

  test("edit request: opens the form, changes fields, and PATCHes only the diff", async ({ page }) => {
    await openWorkspace(page);

    // Capture every PATCH body to /admin/leads/{id} (NOT the offer/outreach paths).
    const patchBodies: Record<string, unknown>[] = [];
    page.on("request", (req) => {
      if (req.method() === "PATCH" && /\/admin\/leads\/[^/]+$/.test(new URL(req.url()).pathname)) {
        patchBodies.push((req.postDataJSON() ?? {}) as Record<string, unknown>);
      }
    });

    // Toggle the inline edit form open.
    await page.getByRole("button", { name: /muuda päringut/i }).first().click();

    // Change the city and destination; leave everything else untouched.
    const cityField = page.getByLabel("Linn", { exact: true });
    await expect(cityField).toBeVisible({ timeout: 10000 });
    await expect(cityField).toHaveValue("Tallinn");
    await cityField.fill("Tartu");
    await page.getByLabel("Sihtkoht", { exact: true }).fill("Pärnu");

    // Save → PATCH fires with ONLY the two changed fields.
    await page.getByRole("button", { name: /salvesta muudatused/i }).click();
    await expect(page.getByText("Päring uuendatud")).toBeVisible({ timeout: 10000 });

    const editPatch = patchBodies.at(-1)!;
    expect(editPatch).toEqual({ city: "Tartu", toCity: "Pärnu" });
    // Unchanged fields must NOT be sent (partial update).
    expect(editPatch).not.toHaveProperty("email");
    expect(editPatch).not.toHaveProperty("category");
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
