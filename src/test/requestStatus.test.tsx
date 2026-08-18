import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createHead, UnheadProvider } from "@unhead/react/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import RequestStatusPage from "@/pages/RequestStatusPage";
import { requestStatusService, type RequestStatus } from "@/services/requestStatus";

/**
 * Smoke coverage for the concierge status page: every state a real request can
 * be in must render something a waiting customer can act on, and no state may
 * render a provider, a price, or an internal status word.
 *
 * The page is what a customer opens from an email when they have heard nothing
 * for days. A state that renders blank, or that quietly says "in progress" on a
 * request nobody could match, is the failure this whole feature exists to fix —
 * so the assertions are about what a person can SEE, not about props.
 */
const TOKEN = "status-tok-123";

const status = (over: Partial<RequestStatus> = {}): RequestStatus => ({
  state: "received",
  request: {
    service: "warehouse",
    city: "Viljandi",
    toCity: null,
    needDate: "2026-09-01T00:00:00Z",
    details: "10 m2 of furniture",
    photoCount: 0,
    submittedAt: "2026-08-15T09:00:00Z",
  },
  providersContacted: 0,
  providersContactedAt: null,
  offerSent: false,
  offerSentAt: null,
  offerToken: null,
  closed: false,
  ...over,
});

const settle = () => new Promise((r) => setTimeout(r, 0));

describe("concierge request-status page", () => {
  let container: HTMLDivElement;
  let root: Root;

  const render = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 0 }, mutations: { retry: false } },
    });
    root.render(
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/en/request-status/${TOKEN}`]}>
            <LanguageProvider>
              <AuthProvider>
                <Routes>
                  <Route path="/:lang/request-status/:token" element={<RequestStatusPage />} />
                </Routes>
              </AuthProvider>
            </LanguageProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>,
    );
  };

  const show = async (value: RequestStatus) => {
    vi.spyOn(requestStatusService, "get").mockResolvedValue(value);
    await act(async () => { render(); await settle(); });
    await act(async () => { await settle(); });
  };

  const text = () => container.textContent ?? "";
  const links = () =>
    Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "");
  /** The contacted-count figure. Read from its own node rather than from the
   *  page text: until the copy lands, `t` renders raw keys and the number ends
   *  up glued between two of them, so a word-boundary match on the whole string
   *  would be testing the translations rather than the count. */
  const countFigure = () => container.querySelector(".tabular-nums")?.textContent ?? "";

  beforeEach(() => {
    // Nothing on this page may reach the network on its own; usePlatformSettings
    // falls back cleanly when it cannot.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("shows a skeleton before the first answer arrives", async () => {
    // Never resolves — the loading branch is the one a slow phone connection sees.
    vi.spyOn(requestStatusService, "get").mockReturnValue(new Promise<RequestStatus>(() => {}));
    await act(async () => { render(); await settle(); });
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("offers a way forward on an unknown token instead of a bare 404", async () => {
    const notFound = Object.assign(new Error("API error: 404"), { status: 404 });
    vi.spyOn(requestStatusService, "get").mockRejectedValue(notFound);
    await act(async () => { render(); await settle(); });
    await act(async () => { await settle(); });

    // Deliberately asserts on the WAY OUT rather than on the copy: `t` falls
    // back to returning the key, so the visible string here is either the
    // translation or the raw key depending on whether the orchestrator's copy
    // has landed. The link is the part that must be true either way.
    expect(links()).toContain("/en/request");
    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.querySelector("ol")).toBeNull();
  });

  it("a brand-new request says so, and shows zero providers honestly", async () => {
    await show(status({ state: "received" }));
    expect(container.querySelector("ol")).not.toBeNull();
    expect(countFigure()).toBe("0");
    expect(text()).toContain("Viljandi");
  });

  it("reports the real contacted count once outreach has gone out", async () => {
    await show(status({
      state: "contacted",
      providersContacted: 18,
      providersContactedAt: "2026-08-16T10:00:00Z",
    }));
    expect(countFigure()).toBe("18");
    // The count is the fact; nothing about WHO may appear.
    expect(text()).not.toMatch(/OÜ|SIA|UAB/);
  });

  it("links to the existing offer page, language-prefixed, when an offer is out", async () => {
    await show(status({
      state: "offer_sent",
      providersContacted: 4,
      providersContactedAt: "2026-08-16T10:00:00Z",
      offerSent: true,
      offerSentAt: "2026-08-17T08:00:00Z",
      offerToken: "offer-tok-999",
    }));
    expect(links()).toContain("/en/offer/offer-tok-999");
  });

  it("renders no offer link when there is no offer", async () => {
    await show(status({ state: "collecting", providersContacted: 3, providersContactedAt: "2026-08-16T10:00:00Z" }));
    expect(links().some((h) => h.includes("/offer/"))).toBe(false);
  });

  it("an unmatched request ends the journey and offers a new one", async () => {
    await show(status({
      state: "no_match",
      closed: true,
      providersContacted: 18,
      providersContactedAt: "2026-08-16T10:00:00Z",
    }));
    // No progress rail on a request that has ended — it would imply someone is
    // still working on it.
    expect(container.querySelector("ol")).toBeNull();
    // What we actually did is still on the page.
    expect(countFigure()).toBe("18");
    expect(links()).toContain("/en/request");
  });

  it("a booked request reads as finished, not as in progress", async () => {
    await show(status({ state: "booked", closed: true, providersContacted: 5, providersContactedAt: "2026-08-16T10:00:00Z" }));
    expect(container.querySelector("ol")).toBeNull();
    expect(container.querySelector("[role=status]")).not.toBeNull();
  });

  it("reads the request back so a typo is catchable", async () => {
    await show(status({
      request: {
        service: "moving", city: "Tallinn", toCity: "Tartu",
        needDate: "2026-09-01T00:00:00Z", details: "Piano, third floor, no lift",
        photoCount: 2, submittedAt: "2026-08-15T09:00:00Z",
      },
    }));
    expect(text()).toContain("Tallinn");
    expect(text()).toContain("Tartu");
    expect(text()).toContain("Piano, third floor, no lift");
  });

  it("never renders an internal lead-status word in any state", async () => {
    for (const state of ["received", "contacted", "collecting", "offer_sent", "chosen", "booked", "no_match", "closed"] as const) {
      await show(status({ state, closed: state === "booked" || state === "no_match" || state === "closed" }));
      expect(text(), state).not.toMatch(/Unmatched|Dismissed|Converted/);
      // Something rendered — a state that falls through to blank is the bug.
      expect(container.querySelector("[role=status]"), state).not.toBeNull();

      await act(async () => { root.unmount(); });
      container.remove();
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
    }
  });
});
