import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { adminLeadService, type ProviderOutreachRow } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { LanguageProvider, translateForLanguage } from "@/i18n/LanguageContext";
import { LeadInfoRequest } from "@/components/admin/leads/LeadInfoRequest";

/**
 * The ops half of "a provider cannot quote this yet".
 *
 * The outreach row already carried the FACT — its status is `needsinfo` — and a
 * status word on its own is unactionable: the operator sees that somebody is
 * blocked and not what would unblock them, which is exactly the position the
 * shared ops inbox was in before any of this shipped.
 *
 * What these pin: the question is legible (reasons as words, not slugs; the
 * provider's note with the line breaks they typed), it is rendered as TEXT
 * because a provider typed it, one button closes it, and the list refetches
 * afterwards so the panel goes away on the server's verdict rather than on an
 * optimistic guess.
 *
 * Rendered with createRoot rather than @testing-library/react: its
 * @testing-library/dom peer is not installed in this repo.
 */

const en = (key: string) => translateForLanguage("en", key);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LEAD_ID = "0e1d2c3b-4a59-4687-9a0b-1c2d3e4f5a6b";

const row = (infoRequest: ProviderOutreachRow["infoRequest"]): ProviderOutreachRow => ({
  id: "8f7e6d5c-4b3a-4291-8071-6f5e4d3c2b1a",
  demandLeadId: LEAD_ID,
  supplierId: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  supplierName: "Adduco OÜ",
  sentTo: "info@adduco.ee",
  sentAt: new Date("2026-08-17T09:00:00Z").toISOString(),
  status: "needsinfo",
  note: null,
  infoRequest,
});

const ask = (over: Partial<NonNullable<ProviderOutreachRow["infoRequest"]>> = {}) => ({
  id: "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f",
  reasons: ["address", "photos"],
  note: "Kas peale- ja mahalaadimine on samal aadressil?",
  askedAt: new Date("2026-08-17T11:30:00Z").toISOString(),
  ...over,
}) as NonNullable<ProviderOutreachRow["infoRequest"]>;

const mounted: { root: Root; container: HTMLElement }[] = [];

function mount(outreach: ProviderOutreachRow) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted.push({ root, container });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  act(() => {
    root.render(
      <MemoryRouter initialEntries={["/en/admin"]}>
        <LanguageProvider>
          <QueryClientProvider client={client}>
            <LeadInfoRequest row={outreach} />
          </QueryClientProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );
  });

  return { container, client };
}

/** Lets the mutation promise and its react-query callbacks land. */
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

const resolveButton = (container: HTMLElement) =>
  [...container.querySelectorAll("button")]
    .find((button) => button.textContent?.includes(en("admin.leads.infoRequestResolve")));

afterEach(() => {
  mounted.splice(0).forEach(({ root, container }) => {
    act(() => root.unmount());
    container.remove();
  });
  vi.restoreAllMocks();
});

describe("blocked provider — info request panel", () => {
  it("renders nothing for an outreach nobody is blocked on", () => {
    const { container } = mount(row(null));
    expect(container.textContent).toBe("");
  });

  it("shows the reasons as words, not the stored slugs", () => {
    const { container } = mount(row(ask()));

    const chips = [...container.querySelectorAll("li")].map((li) => li.textContent);
    // Compared against the same table the component reads, so a copy edit cannot
    // turn this into a false pass — and in the stored order, because the provider
    // ticked these boxes in the order the form offers them.
    expect(chips).toEqual([
      en("admin.leads.infoReason.address"),
      en("admin.leads.infoReason.photos"),
    ]);
    // The slugs are a storage detail. A chip that IS the bare slug means the
    // label table and the backend catalogue have drifted apart.
    expect(chips).not.toContain("address");
    expect(chips).not.toContain("photos");
  });

  it("keeps the provider's note as typed, line breaks and all", () => {
    const note = "Kas peale- ja mahalaadimine on samal aadressil?\n\nJa mis korrus?";
    const { container } = mount(row(ask({ note })));

    const rendered = [...container.querySelectorAll("p")]
      .find((p) => p.textContent === note);
    expect(rendered, "the note is rendered verbatim").toBeTruthy();
    // Line breaks survive through CSS, not through <br> injection — the text is
    // a React child, so it is escaped, and the whitespace is what preserves shape.
    expect(rendered!.className).toContain("whitespace-pre-wrap");
  });

  it("renders a note containing markup as text, never as HTML", () => {
    // The backend rejects angle brackets on this field, but that guard lives in
    // another service and another repo's deploy cadence. A provider-authored
    // string reaching innerHTML is the kind of thing that must be false here too.
    const note = "<img src=x onerror=alert(1)> call me";
    const { container } = mount(row(ask({ note })));

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain(note);
  });

  it("says so when they ticked nothing but wrote the question out", () => {
    const { container } = mount(row(ask({ reasons: [], note: "Kas klaver on esimesel korrusel?" })));

    expect(container.querySelector("ul")).toBeNull();
    expect(container.textContent).toContain(en("admin.leads.infoRequestNoReasons"));
    expect(container.textContent).toContain("Kas klaver on esimesel korrusel?");
  });

  it("resolves the ask by id and refetches the outreach list", async () => {
    const resolve = vi.spyOn(adminLeadService, "resolveInfoRequest").mockResolvedValue({
      id: ask().id,
      providerOutreachId: row(null).id,
      resolvedAt: new Date().toISOString(),
      outreachStatus: "sent",
    });
    const { container, client } = mount(row(ask()));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const button = resolveButton(container)!;
    expect(button, "one clear action").toBeTruthy();

    await act(async () => { button.click(); });
    await settle();

    expect(resolve).toHaveBeenCalledWith(ask().id);
    // The panel disappears because the server says the ask is closed, not
    // because the button optimistically hid it.
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.adminLeads.outreach(LEAD_ID),
    });
  });

  it("does not refetch when resolving fails", async () => {
    vi.spyOn(adminLeadService, "resolveInfoRequest").mockRejectedValue(new Error("boom"));
    const { container, client } = mount(row(ask()));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    await act(async () => { resolveButton(container)!.click(); });
    await settle();

    expect(invalidate).not.toHaveBeenCalled();
    expect(resolveButton(container), "the action stays available to retry").toBeTruthy();
  });
});
