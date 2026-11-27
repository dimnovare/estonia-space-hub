import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createHead, UnheadProvider } from "@unhead/react/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import QuotePage from "@/pages/QuotePage";
import { quoteService, type PublicQuote } from "@/services";

/**
 * The standing-price provider email (2026-11-27) carries an "I can't take this
 * one" button that links to the quote page with `?answer=decline`. Landing
 * there must open the decline panel straight away; without the parameter the
 * page keeps it closed beneath the price form, as before.
 */
const TOKEN = "tok123";
const quote: PublicQuote = {
  provider: { name: "Acme" },
  lead: { category: "vanrental", city: "Pärnu" },
  currency: "EUR",
  alreadySubmitted: false,
};

const settle = () => new Promise((r) => setTimeout(r, 0));

describe("quote page decline deep link", () => {
  let container: HTMLDivElement;
  let root: Root;

  const render = (search: string) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 0 }, mutations: { retry: false } },
    });
    root.render(
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/en/quote/${TOKEN}${search}`]}>
            <LanguageProvider>
              <AuthProvider>
                <Routes>
                  <Route path="/:lang/quote/:token" element={<QuotePage />} />
                </Routes>
              </AuthProvider>
            </LanguageProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>,
    );
  };

  const declineTrigger = async () => {
    for (let i = 0; i < 80; i++) {
      const button = Array.from(container.querySelectorAll("button[aria-expanded]"))
        .find((b) => b.textContent?.includes("I can't take this one"));
      if (button) return button;
      await act(async () => { await settle(); });
    }
    throw new Error("decline trigger never rendered");
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    vi.spyOn(quoteService, "get").mockResolvedValue(quote);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("opens the decline panel when the email's decline button brought the provider here", async () => {
    await act(async () => { render("?answer=decline"); await settle(); });
    const trigger = await declineTrigger();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(`#${CSS.escape(trigger.getAttribute("aria-controls")!)}`)).not.toBeNull();
  });

  it("keeps the decline panel closed on an ordinary visit", async () => {
    await act(async () => { render(""); await settle(); });
    const trigger = await declineTrigger();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
