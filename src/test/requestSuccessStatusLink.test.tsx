import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createHead, UnheadProvider } from "@unhead/react/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider, translateForLanguage } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import RequestPage from "@/pages/RequestPage";
import {
  conciergeRequestService, type ConciergeRequestResult,
} from "@/services/conciergeRequest";

/**
 * The success screen has to hand the customer the link to their own request.
 *
 * /{lang}/request-status/{token} shipped, worked, and was unreachable: nothing
 * linked to it. A customer submitted a request and then heard nothing until an
 * offer arrived days later — the exact silence the page was built to end. This
 * screen is the one moment they are certainly looking, so a link they can
 * bookmark is worth more here than in an email they may never open.
 *
 * The other half of the contract is that it must degrade, not break: a cached
 * bundle talking to a backend that still answers a bare `{ ok: true }` has to
 * show the screen that shipped before this, never a button pointing at
 * /request-status/undefined.
 */
const TOKEN = "wKqZtRfBmXcLdNpVsHgJyEuAoIbTnMrQwZxCvBnMlKj";

const en = (key: string) => translateForLanguage("en", key);
const settle = () => new Promise((r) => setTimeout(r, 0));

describe("request success screen — link to the customer's own status page", () => {
  let container: HTMLDivElement;
  let root: Root;

  const render = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 0 }, mutations: { retry: false } },
    });
    root.render(
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={queryClient}>
          {/* step=3 is the contact step. Deep-linking to it is a real entry
              point (the funnel pushes ?step= onto history), and it keeps this
              test about the success screen rather than about re-driving three
              steps of a form that has its own coverage. */}
          <MemoryRouter initialEntries={["/en/request?step=3&category=warehouse"]}>
            <LanguageProvider>
              <AuthProvider>
                <Routes>
                  <Route path="/:lang/request" element={<RequestPage />} />
                </Routes>
              </AuthProvider>
            </LanguageProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>,
    );
  };

  /** React owns the input's value, so a bare `el.value = …` is invisible to it. */
  const type = (selector: string, value: string) => {
    const input = container.querySelector<HTMLInputElement>(selector)!;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const buttonNamed = (label: string) =>
    Array.from(container.querySelectorAll("button"))
      .find((b) => b.textContent?.trim() === label) ?? null;

  const hrefs = () =>
    Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "");

  /** Fill the one required field and submit, with the API answering `result`. */
  const submitWith = async (result: ConciergeRequestResult) => {
    vi.spyOn(conciergeRequestService, "submit").mockResolvedValue(result);

    await act(async () => { render(); await settle(); });
    await act(async () => { type("#req-email", "customer@example.ee"); });
    await act(async () => { buttonNamed(en("request.submit"))!.click(); await settle(); });
    await act(async () => { await settle(); });
  };

  beforeEach(() => {
    // usePlatformSettings falls back cleanly when it cannot reach the network,
    // and nothing on this screen may depend on a live backend.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    container = document.createElement("div");
    document.body.appendChild(container);
    act(() => { root = createRoot(container); });
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
    localStorage.clear();
  });

  it("links to the request-status page for the token the API returned", async () => {
    await submitWith({ ok: true, statusToken: TOKEN });

    // The language segment is the one the visitor is in — a link that opened
    // the page in the wrong language would be a worse kind of silence.
    expect(hrefs()).toContain(`/en/request-status/${TOKEN}`);
  });

  it("renders nothing extra when the API returns no token", async () => {
    await submitWith({ ok: true });

    expect(hrefs().some((href) => href.includes("request-status"))).toBe(false);
    // Nothing half-built: no dangling path, no "undefined" in a URL.
    expect(container.innerHTML).not.toContain("request-status");
    expect(container.innerHTML).not.toContain("undefined");
  });

  it("still shows the rest of the success screen when there is no token", async () => {
    await submitWith({ ok: true, statusToken: null });

    // The receipt confirmation and the browse escape hatch are what shipped
    // before the status link existed, and they must survive its absence.
    expect(container.textContent).toContain("customer@example.ee");
    expect(hrefs()).toContain("/en/search");
  });

  it("does not send the token to analytics", async () => {
    const gtag = vi.fn();
    vi.stubGlobal("gtag", gtag);
    (window as unknown as { gtag: unknown }).gtag = gtag;

    await submitWith({ ok: true, statusToken: TOKEN });

    // The submit event reports only THAT a link was offered. The token is a
    // bearer credential: whoever holds it sees what this customer is moving and
    // when their home will be empty.
    const submitted = gtag.mock.calls.find(
      ([kind, name]) => kind === "event" && name === "request_submitted");
    expect(submitted).toBeDefined();
    expect(submitted![2]).toMatchObject({ has_status_link: true });
    expect(JSON.stringify(gtag.mock.calls)).not.toContain(TOKEN);
  });
});
