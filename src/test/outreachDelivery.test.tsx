import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { LanguageProvider, translateForLanguage } from "@/i18n/LanguageContext";
import {
  deliveryState, wasOpened, DeliveryMark, type OutreachDeliveryFacts,
} from "@/components/admin/leads/outreachDelivery";
import { LeadDeliveryPanel } from "@/components/admin/leads/LeadDeliveryPanel";
import { LeadOutreachSummary } from "@/components/admin/leads/LeadOutreachSummary";
import type { LeadOutreachSummary as Summary, OutreachDeliveryMetrics } from "@/components/admin/leads/leadOpsApi";

/**
 * The honesty contract for delivery telemetry.
 *
 * `deliveredAt` and `openedAt` landed on 2026-08-18 and are nullable in the most
 * dangerous way: null means WE DO NOT KNOW. Rows sent before the Resend webhook
 * existed have both null, and open tracking is switched off at the account
 * level, so `openedAt` is null for every row in production — including ones a
 * provider certainly read.
 *
 * Rendering any of that as "not delivered" or as "0% opened" would answer the
 * question that started this work — did those 18 Viljandi providers get the
 * mail? — wrongly and with confidence, and would point the fix at
 * deliverability when the problem might be the ask itself. These tests exist so
 * that a future edit cannot quietly reintroduce that.
 *
 * Rendered with createRoot rather than @testing-library/react: its
 * @testing-library/dom peer is not installed in this repo.
 */

const en = (key: string) => translateForLanguage("en", key);
const t = en;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const facts = (over: Partial<OutreachDeliveryFacts> = {}): OutreachDeliveryFacts => ({
  status: "sent",
  sentAt: "2026-08-19T09:00:00.000Z",
  deliveredAt: null,
  openedAt: null,
  ...over,
});

const mounted: { root: Root; container: HTMLElement }[] = [];

function mount(node: React.ReactNode) {
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
          <QueryClientProvider client={client}>{node}</QueryClientProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );
  });

  return { container };
}

/** Lets the panel's query promise and its react-query callbacks land. */
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

afterEach(() => {
  mounted.splice(0).forEach(({ root, container }) => {
    act(() => root.unmount());
    container.remove();
  });
  vi.restoreAllMocks();
});

describe("delivery state — a missing receipt is never a failed delivery", () => {
  it("reads a receipt as delivered", () => {
    expect(deliveryState(facts({ deliveredAt: "2026-08-19T09:00:05.000Z" }))).toBe("delivered");
  });

  it("calls a receipt-less row unknown, never failed", () => {
    // The single most important assertion in this file. Silence from Resend is
    // silence from Resend — it says nothing about whether the provider got it.
    expect(deliveryState(facts())).toBe("unknown");
    expect(deliveryState(facts())).not.toBe("failed");
  });

  it("only a bounce or a complaint is a real non-delivery", () => {
    expect(deliveryState(facts({ status: "bounced" }))).toBe("failed");
    expect(deliveryState(facts({ status: "complained" }))).toBe("failed");
    // These come from the same webhook that would have reported success, which
    // is exactly why they are allowed to assert something a null cannot.
    expect(deliveryState(facts({ status: "noanswer" }))).toBe("unknown");
    expect(deliveryState(facts({ status: "replied" }))).toBe("unknown");
  });

  it("separates 'sent before we tracked' from 'no receipt arrived'", () => {
    const measuredFrom = "2026-08-18T00:00:00.000Z";
    expect(deliveryState(facts({ sentAt: "2026-08-01T10:00:00.000Z" }), measuredFrom)).toBe("untracked");
    expect(deliveryState(facts({ sentAt: "2026-08-19T10:00:00.000Z" }), measuredFrom)).toBe("unknown");
    // Neither is a failure, and both must survive a missing measuredFrom by
    // claiming LESS rather than more.
    expect(deliveryState(facts({ sentAt: "2026-08-01T10:00:00.000Z" }))).toBe("unknown");
  });

  it("a delivered row stays delivered whatever the status says", () => {
    // A provider can bounce a later message from the same address; the receipt
    // on THIS row is still a fact about THIS row.
    expect(deliveryState(facts({ deliveredAt: "2026-08-19T09:00:05.000Z", status: "bounced" })))
      .toBe("delivered");
  });

  it("treats an open as evidence only when there is one", () => {
    // Tracking is off account-wide, so a null open is not evidence of anything
    // and there is deliberately no "not opened" state to render.
    expect(wasOpened(facts())).toBe(false);
    expect(wasOpened(facts({ openedAt: "2026-08-19T11:00:00.000Z" }))).toBe(true);
  });
});

describe("DeliveryMark", () => {
  it("labels a null deliveredAt as unknown and never as undelivered", () => {
    const { container } = mount(<DeliveryMark row={facts()} t={t} />);

    expect(container.textContent).toContain(en("admin.leads.deliveryUnknown"));
    expect(container.textContent).not.toContain(en("admin.leads.deliveryFailed"));
    expect(container.textContent).not.toContain(en("admin.leads.deliveryDelivered"));
  });

  it("never claims a provider did not open the mail", () => {
    const { container } = mount(<DeliveryMark row={facts({ deliveredAt: "2026-08-19T09:00:05.000Z" })} t={t} />);

    expect(container.textContent).toContain(en("admin.leads.deliveryDelivered"));
    // The open marker is upward-only: it appears when somebody opened it and is
    // simply absent otherwise. There is no key for "not opened" to leak in.
    expect(container.textContent).not.toContain(en("admin.leads.deliveryOpened"));
  });

  it("shows the open when there actually is one", () => {
    const { container } = mount(
      <DeliveryMark row={facts({ deliveredAt: "2026-08-19T09:00:05.000Z", openedAt: "2026-08-19T12:00:00.000Z" })} t={t} />,
    );
    expect(container.textContent).toContain(en("admin.leads.deliveryOpened"));
  });
});

describe("per-lead outreach summary", () => {
  const summary = (over: Partial<Summary> = {}): Summary => ({
    asked: 0, answered: 0, failed: 0, silent: 0,
    delivered: 0, deliveryUnknown: 0, blocked: 0,
    lastSentAt: null, stalled: false, ...over,
  });

  it("says nothing at all when the API did not send a summary", () => {
    // An older API, or a page that outran its payload. Drawing zeros here would
    // read as "nobody was asked", which is a claim we have no basis for.
    const { container } = mount(<LeadOutreachSummary summary={undefined} stalledAfterDays={3} t={t} />);
    expect(container.textContent).toBe("—");
  });

  it("distinguishes nobody-asked from asked-and-silent", () => {
    const { container } = mount(<LeadOutreachSummary summary={summary()} stalledAfterDays={3} t={t} />);
    expect(container.textContent).toContain(en("admin.leads.outreachNobodyAsked"));
    // No silence line: there is nothing to be silent about yet.
    expect(container.textContent).not.toContain(en("admin.leads.outreachSilentFor"));
  });

  it("counts unknown delivery separately from failed delivery", () => {
    const { container } = mount(
      <LeadOutreachSummary
        summary={summary({ asked: 3, silent: 3, deliveryUnknown: 3, lastSentAt: "2026-08-12T09:00:00.000Z" })}
        stalledAfterDays={3}
        t={t}
      />,
    );

    expect(container.textContent).toContain(en("admin.leads.outreachDeliveryUnknown").replace("{count}", "3"));
    // Three rows we know nothing about must not be reported as three bounces.
    expect(container.textContent).not.toContain(en("admin.leads.outreachFailed").replace("{count}", "3"));
  });
});

describe("delivery aggregate — no confident zero over an empty base", () => {
  const metrics = (over: Partial<OutreachDeliveryMetrics> = {}): OutreachDeliveryMetrics => ({
    measuredFrom: null, sent: 0, delivered: 0, opened: 0,
    deliveredRate: null, openRate: null, unknownSent: 0, ...over,
  });

  const silenceResponse = {
    providersContacted: 0, providersSilent: 0, asksUnanswered: 0, items: [],
  };

  it("reports 'not measured yet' rather than 0% when no receipt has ever arrived", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(silenceResponse);
    // The Viljandi window exactly: 18 messages went out, none of them measurable.
    const { container } = mount(<LeadDeliveryPanel delivery={metrics({ unknownSent: 18 })} />);
    await settle();

    expect(container.textContent).toContain(en("admin.leads.deliveryNoMeasurement"));
    expect(container.textContent).toContain("—");
    // "0%" here would read as a delivery collapse. It is our telemetry that is
    // missing, not their mail.
    expect(container.textContent).not.toContain("0%");
    expect(container.textContent).toContain(
      en("admin.leads.deliveryUntrackedCount").replace("{count}", "18"));
  });

  it("says nothing at all when the API version has no delivery block", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(silenceResponse);
    const { container } = mount(<LeadDeliveryPanel delivery={undefined} />);
    await settle();

    expect(container.textContent).toContain(en("admin.leads.deliveryUnavailable"));
    expect(container.textContent).not.toContain("0%");
  });

  it("shows a rate only once there is a base to divide by", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(silenceResponse);
    const { container } = mount(<LeadDeliveryPanel delivery={metrics({
      measuredFrom: "2026-08-18T00:00:00.000Z", sent: 14, delivered: 12,
      deliveredRate: 12 / 14, openRate: 0, unknownSent: 6,
    })} />);
    await settle();

    expect(container.textContent).toContain("86%");
    // Opens are off at the account level: zero opens is a missing measurement,
    // never a statement that nobody looked.
    expect(container.textContent).toContain(en("admin.leads.deliveryOpensUnavailable"));
    expect(container.textContent).not.toContain("0%");
  });

  it("never blames providers before anyone has been emailed", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(silenceResponse);
    const { container } = mount(<LeadDeliveryPanel delivery={metrics()} />);
    await settle();

    expect(container.textContent).toContain(en("admin.leads.silenceEmpty"));
    expect(container.textContent).not.toContain(en("admin.leads.silenceSummary").replace("{asks}", "0"));
  });

  it("names the never-answering providers once there are some", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({
      providersContacted: 15,
      providersSilent: 12,
      asksUnanswered: 31,
      items: [{
        supplierId: "0e1d2c3b-4a59-4687-9a0b-1c2d3e4f5a6b",
        supplierName: "Viljandi Ladu OÜ",
        city: "Viljandi",
        contactEmail: "info@ladu.ee",
        contactEmailUnusable: false,
        asked: 4,
        lastAskedAt: "2026-08-07T09:00:00.000Z",
        delivered: 4,
        deliveryFailed: 0,
        deliveryUnknown: 0,
      }],
    });
    const { container } = mount(<LeadDeliveryPanel delivery={metrics()} />);
    await settle();

    expect(container.textContent).toContain("Viljandi Ladu OÜ");
    expect(container.textContent).toContain("12");
    // Four asks that we KNOW arrived and produced nothing: a verdict about the
    // ask, not about the mail server. That distinction is the whole panel.
    expect(container.textContent).toContain(en("admin.leads.silenceIgnored"));
    expect(container.textContent).not.toContain(en("admin.leads.silenceUnreachable"));
  });
});
