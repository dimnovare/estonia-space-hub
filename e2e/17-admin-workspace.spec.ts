import { test, expect } from "@playwright/test";
import {
  stubCommon, stubListings, seedAuth, adminUser,
  stubAdminLeads, stubOfferLoop, adminLead, adminMatch, tartuProviderCandidates,
  draftOfferWithOption, chosenOffer, quotedOutreachRow, quoteSeededDraftOffer,
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

// Open the English workspace with a pre-seeded offer (draft or chosen). Shares
// the SAME lead-items array with the offer loop so confirm-booking can flip the
// mocked lead to Converted in place.
async function openWorkspaceWithOffer(
  page: import("@playwright/test").Page,
  offer: Record<string, unknown>,
  leadOver: Record<string, unknown>,
  loopOpts: Parameters<typeof stubOfferLoop>[1] = {},
) {
  const leadItems = [adminLead({ city: "Tartu", language: "en", ...leadOver })];
  await seedAuth(page, adminUser);
  await stubCommon(page);
  await stubListings(page);
  await stubAdminLeads(page, { items: leadItems, matches: [adminMatch()], candidates: tartuProviderCandidates() });
  await stubOfferLoop(page, { offers: [offer], leadItems, ...loopOpts });
  await page.goto("/en/admin?tab=leads");
  const acceptCookies = page.getByRole("button", { name: "Accept" });
  if (await acceptCookies.isVisible()) await acceptCookies.click();
  const details = page.getByRole("button", { name: /details/i }).first();
  await expect(details).toBeVisible({ timeout: 15000 });
  await details.click();
}

const openWorkspaceWithDraft = (page: import("@playwright/test").Page, loopOpts: Parameters<typeof stubOfferLoop>[1] = {}) =>
  openWorkspaceWithOffer(page, draftOfferWithOption(), {}, loopOpts);

const openWorkspaceWithChosenOffer = (page: import("@playwright/test").Page, loopOpts: Parameters<typeof stubOfferLoop>[1] = {}) =>
  openWorkspaceWithOffer(page, chosenOffer(), { status: "quoted" }, loopOpts);

test.describe("Admin lead workspace", () => {
  // ── Feature A: instant alert deep link + 1-click quick-send (human-gated) ──

  test("?lead={id} deep-links straight into the lead workspace", async ({ page }) => {
    // The instant-alert email links here; the workspace must already be open.
    await seedAuth(page, adminUser);
    await stubCommon(page);
    await stubListings(page);
    await stubAdminLeads(page, {
      items: [adminLead({ city: "Tartu", language: "en" })],
      matches: [adminMatch()],
      candidates: tartuProviderCandidates(),
    });
    await stubOfferLoop(page);
    await page.goto("/en/admin?tab=leads&lead=lead-1");

    // Expanded with NO Details click.
    await expect(page.getByText(/find and contact providers/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /details/i }).first()).toHaveAttribute("aria-expanded", "true");
  });

  test("quick-send pre-selects the emailable nearby providers and opens the review sheet", async ({ page }) => {
    await openEnglishWorkspace(page);

    // Quick-send is a shortcut over the multi-select — never an auto-send.
    let sendCalls = 0;
    page.on("request", (req) => {
      if (req.method() === "POST" && /\/admin\/leads\/[^/]+\/outreach$/.test(new URL(req.url()).pathname)) sendCalls += 1;
    });

    // 5 of the 7 candidates qualify: no-email and already-contacted are excluded.
    const quick = page.getByRole("button", { name: /send outreach to 5 matched providers/i });
    await expect(quick).toBeVisible();
    await quick.click();

    const review = page.getByRole("dialog");
    await expect(review).toContainText("sales@panicom.ee");
    await expect(review).toContainText("hello@rare.ee");
    await expect(review).not.toContainText("Emajõe Laod");        // no email
    await expect(review).not.toContainText("contact@tartuladu.ee"); // already contacted
    // Human gate intact: nothing sent by opening the sheet.
    expect(sendCalls).toBe(0);

    // Backing out leaves the pre-selection on the manual multi-select, so the
    // operator can adjust it rather than start over. (The dialog hides the page
    // from the a11y tree, so this is asserted once it is closed.)
    await review.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("checkbox", { name: "Rare Minilaod" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Tartu Ladu" })).not.toBeChecked();
  });

  test("the outreach review warns that the previewed quote link is a per-recipient sample", async ({ page }) => {
    // Tokens are minted at SEND time, so the previewed body carries a throwaway
    // sample link that would 404 — it must be plain text with an explicit note.
    await openEnglishWorkspace(page);
    await page.getByRole("checkbox", { name: "Panicom Miniladu" }).check();
    await page.getByRole("button", { name: /review message to 1 provider/i }).click();

    const review = page.getByRole("dialog");
    await expect(review).toContainText(/each provider gets their own unique link/i);
    // The previewed body must never be a clickable link.
    await expect(review.locator("pre a")).toHaveCount(0);
  });

  test("quick-send is offered only on a new / uncontacted lead", async ({ page }) => {
    await openWorkspaceWithOffer(page, draftOfferWithOption(), { status: "contacted" });
    await expect(page.getByRole("button", { name: /send outreach to/i })).toHaveCount(0);
  });

  // ── Feature B: provider quote surfacing ──

  test("outreach history shows the price the provider submitted via their quote link", async ({ page }) => {
    await openEnglishWorkspace(page, { outreach: [quotedOutreachRow()] });
    await expect(page.getByText(/quoted 89 kuu/i)).toBeVisible();
  });

  test("an auto-seeded offer option is badged as coming from a provider quote", async ({ page }) => {
    await openWorkspaceWithOffer(page, quoteSeededDraftOffer(), {});
    await expect(page.getByText(/from provider quote/i)).toBeVisible();
  });

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

    // The stateful stub records the row; the stage refetches and lists it with
    // status Sent. Assert the row's own status control: a loose getByText("Sent")
    // races the refetch — before the row lands it settles on the send toast, and
    // after it lands the only match is the closed select's hidden <option>.
    const sentRow = page.getByRole("combobox", { name: /rare minilaod/i });
    await expect(sentRow).toBeVisible({ timeout: 10000 });
    await expect(sentRow).toHaveValue("sent");
    await expect(page.getByText("hello@rare.ee").last()).toBeVisible();
    // Timeline picks up the outreach event.
    await expect(page.getByText(/saadavuspäring → rare minilaod/i)).toBeVisible();
  });

  test("offer builder: create → add option → save → review delivery → sent badge", async ({ page }) => {
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

    // Send is available ONLY through Stage 3 "Review delivery", which states the
    // exact effects (recipient, page, side-effects) before dispatch — there is no
    // count-only quick-send that bypasses the review.
    await page.getByRole("button", { name: /vaata saatmine üle/i }).click();
    const review = page.getByRole("dialog");
    await expect(review).toContainText("mari@example.com"); // exact recipient shown
    await expect(review).toContainText(/muuda päringu staatuseks hinnastatud/i); // effect bullet
    await review.getByRole("button", { name: /saada kliendile/i }).click();

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

  test("draft is reused, has no public link, and can be deleted", async ({ page }) => {
    await openEnglishWorkspace(page);
    await page.getByRole("button", { name: /create offer/i }).click();
    await page.getByRole("button", { name: /create offer/i }).click();
    await expect(page.getByText(/one active draft/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /open offer page/i })).toHaveCount(0);
    await page.getByRole("button", { name: /delete draft/i }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: /delete draft/i }).click();
    await expect(page.getByText(/draft deleted/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create offer/i })).toBeVisible();
  });

  test("sent offers remain in compact history while a new draft is edited", async ({ page }) => {
    await openEnglishWorkspace(page, {
      offers: [{
        id: "offer-sent", demandLeadId: "lead-1", token: "tok-sent", status: "sent", language: "en",
        customerNote: "Existing note", createdAt: "2026-07-10T09:40:00Z", sentAt: "2026-07-10T10:00:00Z",
        viewedAt: null, chosenAt: null, chosenOptionId: null, createdBy: "admin@ruumly.eu", options: [],
      }],
    });
    await page.getByRole("button", { name: /new draft/i }).click();
    await expect(page.getByText(/previous offers/i)).toBeVisible();
    await expect(page.getByText(/sent/i).last()).toBeVisible();
    await expect(page.getByLabel(/customer note|note to the customer/i)).toHaveValue("");
  });

  test("save conflict keeps the unsaved draft buffer visible", async ({ page }) => {
    await openEnglishWorkspace(page, { offerUpdateStatus: 409 });
    await page.getByRole("button", { name: /create offer/i }).click();
    await page.getByRole("button", { name: /add option/i }).click();
    const title = page.getByLabel("Title").first();
    await title.fill("Telephone quote");
    await page.getByRole("button", { name: /save draft/i }).click();
    await expect(page.getByText("Offer is no longer a draft.")).toBeVisible();
    await expect(title).toHaveValue("Telephone quote");
  });

  test("delete conflict keeps the unsaved draft buffer visible", async ({ page }) => {
    await openEnglishWorkspace(page, { offerDeleteStatus: 409 });
    await page.getByRole("button", { name: /create offer/i }).click();
    const note = page.getByLabel(/customer note|note to the customer/i);
    await note.fill("Keep this draft");
    await page.getByRole("button", { name: /delete draft/i }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: /delete draft/i }).click();
    await expect(page.getByText("Offer is no longer a draft.")).toBeVisible();
    await expect(note).toHaveValue("Keep this draft");
  });

  test("delete 404 clears the editor and refetches offers", async ({ page }) => {
    await openEnglishWorkspace(page, { offerDeleteStatus: 404 });
    await page.getByRole("button", { name: /create offer/i }).click();
    await page.getByRole("button", { name: /delete draft/i }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: /delete draft/i }).click();
    await expect(page.getByText(/draft deleted/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create offer/i })).toBeVisible();
    await expect(page.getByLabel(/customer note|note to the customer/i)).toHaveCount(0);
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

    // Sync on the PATCH round-trips, not on the toast: two saves land well inside
    // the toast's dwell time, so both "Pakkumine salvestatud" toasts are on screen
    // at once and a plain getByText would be a strict-mode violation.
    const offerPatch = () => page.waitForRequest((req) =>
      req.method() === "PATCH" && /\/admin\/offers\/[^/]+$/.test(new URL(req.url()).pathname));
    const save = page.getByRole("button", { name: /salvesta mustand/i });

    // Write a note, save → PATCH carries the text.
    const firstPatch = offerPatch();
    await noteField.fill("Mõlemad partnerid saavad su ajal.");
    await save.click();
    await firstPatch;
    await expect(page.getByText("Pakkumine salvestatud").first()).toBeVisible({ timeout: 10000 });

    // Clear it, save again → PATCH must carry "" (backend Clamp("") → null clears).
    const secondPatch = offerPatch();
    await noteField.fill("");
    await save.click();
    await secondPatch;

    expect(patchNotes.length).toBeGreaterThanOrEqual(2);
    expect(patchNotes.at(-1)).toBe(""); // empty string, NOT null / undefined
    // The cleared note must not resurrect in the field after the save round-trip.
    await expect(noteField).toHaveValue("");
  });

  // ── Task 8: stage 3 delivery review + booking confirmation ──

  test("review delivery shows exact email and page before sending", async ({ page }) => {
    await openWorkspaceWithDraft(page);

    // The offer must NOT be sent until the explicit final action.
    let sendCalls = 0;
    page.on("request", (req) => {
      if (req.method() === "POST" && /\/admin\/offers\/[^/]+\/send$/.test(new URL(req.url()).pathname)) sendCalls += 1;
    });

    await page.getByRole("button", { name: /review delivery/i }).click();
    const dialog = page.getByRole("dialog");
    // Exact email: recipient + exact subject from the backend preview.
    await expect(dialog).toContainText("mari@example.com");
    await expect(dialog).toContainText("Your Ruumly options");
    // Effect bullets state the exact consequences before sending.
    await expect(dialog).toContainText(/move the lead to quoted/i);
    await expect(dialog).toContainText(/not take payment or create a confirmed booking/i);
    // Previewing is side-effect-free — no send fired.
    expect(sendCalls).toBe(0);

    // Customer-page tab renders the same sanitized public component with the option.
    await dialog.getByRole("tab", { name: /customer page/i }).click();
    await expect(dialog.getByText("Miniladu 10 m² kesklinnas")).toBeVisible();

    await dialog.getByRole("button", { name: /send to customer/i }).click();
    await expect(page.getByText("Offer sent", { exact: true })).toBeVisible();
    expect(sendCalls).toBe(1);
  });

  test("preview failure keeps the draft and offers an in-dialog retry", async ({ page }) => {
    await openWorkspaceWithDraft(page, { deliveryPreviewStatus: 500 });

    await page.getByRole("button", { name: /review delivery/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: /retry/i })).toBeVisible();
    // Draft untouched: the send action is not available while the preview failed.
    await expect(dialog.getByRole("button", { name: /send to customer/i })).toBeDisabled();
  });

  test("chosen preference needs explicit provider confirmation", async ({ page }) => {
    await openWorkspaceWithChosenOffer(page);

    let confirmCalls = 0;
    page.on("request", (req) => {
      if (req.method() === "POST" && /\/admin\/offers\/[^/]+\/confirm-booking$/.test(new URL(req.url()).pathname)) confirmCalls += 1;
    });

    await expect(page.getByText(/customer requested/i).first()).toBeVisible();
    // No booking is confirmed just by opening the workspace.
    expect(confirmCalls).toBe(0);

    await page.getByRole("button", { name: /confirm with provider and mark booked/i }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toContainText(/only after the provider confirms availability/i);
    await confirm.getByRole("button", { name: /mark booked/i }).click();

    await expect(page.getByText("Booking outcome confirmed")).toBeVisible();
    expect(confirmCalls).toBe(1);
  });

  test("confirm conflict keeps the lead quoted without a success toast", async ({ page }) => {
    await openWorkspaceWithChosenOffer(page, { confirmStatus: 409 });

    await page.getByRole("button", { name: /confirm with provider and mark booked/i }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: /mark booked/i }).click();

    await expect(page.getByText("The chosen option no longer exists.")).toBeVisible();
    await expect(page.getByText("Booking outcome confirmed")).toHaveCount(0);
  });

  for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
    test(`guided workspace fits ${viewport.width}px without clipped actions`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openWorkspaceWithDraft(page);

      await expect(page.getByText(/find and contact providers/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /review delivery/i })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/lead-workspace-${viewport.width}.png`, fullPage: true });
    });
  }
});
