import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  adminOfferService,
  type AdminLead,
  type AdminOffer,
  type ProviderOutreachRow,
} from "@/services";
import { LanguageProvider, translateForLanguage } from "@/i18n/LanguageContext";
import { editingDraftClosed } from "@/components/admin/leads/leadWorkspaceModels";
import { LeadOfferStage } from "@/components/admin/leads/LeadOfferStage";

/**
 * Sending an offer ends the draft, and the editor buffer has to end with it.
 * That buffer is two versions behind the moment the send lands (the send saves
 * first, then bumps again), so every later save is refused as stale — for good,
 * until the admin reloads the page. Worse than the dead Save button: the
 * "Add to offer" control branches on whether an editor is open, so the second
 * provider to answer a lead — the first time the fan-out works as designed —
 * would be appended to that orphaned buffer and the click would go nowhere.
 * Once the editor lets go, the same click opens a NEW draft, which is what the
 * server already does with a quote that arrives after a send.
 */

const lead: AdminLead = {
  id: "0e1d2c3b-4a59-4687-9a0b-1c2d3e4f5a6b",
  name: "Kadri",
  email: "kadri@example.ee",
  city: "Tallinn",
  category: "moving",
  language: "et",
  createdAt: "2026-08-10T09:00:00.000Z",
  status: "quoted",
};

const draft: AdminOffer = {
  id: "aaaa1111-2222-4333-8444-555566667777",
  demandLeadId: lead.id,
  token: "tok-first-round",
  status: "draft",
  language: "et",
  customerNote: null,
  createdAt: "2026-08-10T10:00:00.000Z",
  sentAt: null,
  viewedAt: null,
  chosenAt: null,
  chosenOptionId: null,
  createdBy: null,
  options: [{
    id: "opt-1111-2222-4333-8444-555566667777",
    supplierId: "5f6e7d8c-9b0a-4c1d-8e2f-3a4b5c6d7e8f",
    supplierName: "Big Movers OÜ",
    supplierLocationId: null,
    title: "Big Movers OÜ — Tallinn",
    priceAmount: 250,
    priceUnit: "onetime",
    notes: null,
    sortOrder: 0,
    fromProviderQuote: true,
  }],
  version: 3,
};

/** What the workspace refetches after a send: the same offer, two versions on. */
const sent: AdminOffer = {
  ...draft,
  status: "sent",
  sentAt: "2026-08-10T11:00:00.000Z",
  version: 5,
};

/** The second provider answers — after the first offer already went out. */
const repliedRow: ProviderOutreachRow = {
  id: "row-9999-8888-4777-8666-555544443333",
  demandLeadId: lead.id,
  supplierId: "bb22cc33-dd44-4e55-8f66-778899001122",
  supplierName: "Kiirkolimine OÜ",
  sentTo: "info@kiir.ee",
  sentAt: "2026-08-10T10:30:00.000Z",
  status: "replied",
  note: null,
  quotedAmount: 320,
  quotedUnit: "€ / onetime",
  quotedAt: "2026-08-10T12:00:00.000Z",
};

const secondRoundDraft: AdminOffer = {
  ...draft,
  id: "cccc1111-2222-4333-8444-555566667777",
  token: "tok-second-round",
  status: "draft",
  version: 0,
  options: [{
    id: "opt-2222-2222-4333-8444-555566667777",
    supplierId: repliedRow.supplierId,
    supplierName: repliedRow.supplierName,
    supplierLocationId: null,
    title: "Kiirkolimine OÜ",
    priceAmount: 320,
    priceUnit: "onetime",
    notes: null,
    sortOrder: 0,
    fromProviderQuote: false,
  }],
};

/** Labels come from the same table the component reads, so a copy edit in
 *  translations.ts cannot quietly turn these queries into false passes. */
const en = (key: string) => translateForLanguage("en", key);

// @testing-library/dom is not installed, so this mounts the way the other
// component test in this suite does: a real root, driven through act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: { root: Root; container: HTMLElement }[] = [];

function mountStage(offers: AdminOffer[], outreachRows: ProviderOutreachRow[] = []) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted.push({ root, container });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const tree = (nextOffers: AdminOffer[], nextRows: ProviderOutreachRow[]) => (
    <MemoryRouter initialEntries={["/en"]}>
      <LanguageProvider>
        <QueryClientProvider client={client}>
          <LeadOfferStage
            lead={lead}
            offers={nextOffers}
            outreachRows={nextRows}
            candidateToAdd={null}
            onCandidateConsumed={() => {}}
            onOffersChanged={() => {}}
          />
        </QueryClientProvider>
      </LanguageProvider>
    </MemoryRouter>
  );

  act(() => { root.render(tree(offers, outreachRows)); });

  return {
    container,
    /** What a background refetch does: same mounted component, new server truth. */
    refetched: async (nextOffers: AdminOffer[], nextRows: ProviderOutreachRow[] = outreachRows) => {
      await act(async () => { root.render(tree(nextOffers, nextRows)); });
    },
  };
}

/** Lets a mutation's promise and its react-query callbacks land. */
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

const buttonNamed = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === label) ?? null;

const optionTitleInputs = (container: HTMLElement) =>
  container.querySelectorAll(`input[aria-label="${en("admin.leads.offerOptionTitle")}"]`);

afterEach(async () => {
  for (const { root, container } of mounted.splice(0)) {
    await act(async () => { root.unmount(); });
    container.remove();
  }
  vi.restoreAllMocks();
});

describe("editingDraftClosed", () => {
  it("keeps the editor while the offer it holds is still a draft", () => {
    expect(editingDraftClosed([draft], draft.id)).toBe(false);
  });

  it("closes the editor once that offer has been sent", () => {
    expect(editingDraftClosed([sent], sent.id)).toBe(true);
  });

  it("closes on any status past draft, not only sent", () => {
    for (const status of ["viewed", "chosen", "expired"] as const) {
      expect(editingDraftClosed([{ ...draft, status }], draft.id)).toBe(true);
    }
  });

  it("holds its verdict on an id it cannot see — a just-created draft reaches the editor first", () => {
    expect(editingDraftClosed([sent], secondRoundDraft.id)).toBe(false);
    expect(editingDraftClosed([], draft.id)).toBe(false);
  });

  it("judges only the offer the editor holds, not last round's sent one", () => {
    expect(editingDraftClosed([sent, secondRoundDraft], secondRoundDraft.id)).toBe(false);
  });

  it("has nothing to close when no editor is open", () => {
    expect(editingDraftClosed([sent], null)).toBe(false);
  });
});

describe("LeadOfferStage once the offer is sent", () => {
  it("drops the editor instead of leaving a live Save over an offer the customer already has", async () => {
    const { container, refetched } = mountStage([draft]);
    expect(buttonNamed(container, en("admin.leads.offerSave"))).not.toBeNull();
    expect(optionTitleInputs(container)).toHaveLength(1);

    await refetched([sent]);

    expect(buttonNamed(container, en("admin.leads.offerSave"))).toBeNull();
    expect(optionTitleInputs(container)).toHaveLength(0);
    expect(container.textContent).toContain(en("admin.leads.offerEmpty"));
    // …and the stage now offers the only move the server will accept.
    expect(buttonNamed(container, en("admin.leads.newDraft"))).not.toBeNull();
  });

  it("turns a provider's later quote into a new draft rather than a click into nowhere", async () => {
    const create = vi.spyOn(adminOfferService, "create").mockResolvedValue(secondRoundDraft);
    const { container, refetched } = mountStage([draft], [repliedRow]);

    await refetched([sent]);

    await act(async () => { buttonNamed(container, en("admin.leads.addToOffer"))!.click(); });
    await settle();

    expect(create).toHaveBeenCalledTimes(1);
    const [leadId, body] = create.mock.calls[0];
    expect(leadId).toBe(lead.id);
    expect(body.options?.[0]).toMatchObject({ supplierId: repliedRow.supplierId });
    // The quote is on screen, in an editor that can actually be saved.
    expect(optionTitleInputs(container)).toHaveLength(1);
    expect(buttonNamed(container, en("admin.leads.offerSave"))).not.toBeNull();
  });

  it("still appends to an open draft — a second quote mid-build must not fork a new offer", async () => {
    const create = vi.spyOn(adminOfferService, "create").mockResolvedValue(secondRoundDraft);
    const { container } = mountStage([draft], [repliedRow]);

    await act(async () => { buttonNamed(container, en("admin.leads.addToOffer"))!.click(); });
    await settle();

    expect(optionTitleInputs(container)).toHaveLength(2);
    expect(create).not.toHaveBeenCalled();
  });
});
