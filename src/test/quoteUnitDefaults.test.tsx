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

const TOKEN = "tok123";

const quote = (over: Partial<PublicQuote["lead"]> = {}, rest: Partial<PublicQuote> = {}): PublicQuote => ({
  provider: { name: "Acme" },
  lead: { category: "warehouse", city: "Tallinn", ...over },
  currency: "EUR",
  alreadySubmitted: false,
  ...rest,
});

const settle = () => new Promise((r) => setTimeout(r, 0));

async function waitFor<T>(what: string, read: () => T | null | undefined, attempts = 80): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    const v = read();
    if (v) return v;
    await settle();
  }
  throw new Error(`timed out waiting for ${what}`);
}

describe("quote page verification", () => {
  let container: HTMLDivElement;
  let root: Root;

  const render = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 0 }, mutations: { retry: false } },
    });
    root.render(
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/en/quote/${TOKEN}`]}>
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

  /** Wait for the form, then let the seeding passive effect flush before reading. */
  const seededUnit = async () => {
    await waitFor("select", () => container.querySelector("select"));
    await act(async () => { await settle(); });
    await act(async () => { await settle(); });
    return container.querySelector("select")?.value;
  };
  const unitValue = () => container.querySelector("select")?.value;
  const thumbs = () => Array.from(container.querySelectorAll("ul button img")) as HTMLImageElement[];

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
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

  it("defaults a moving lead to one-time, not month", async () => {
    vi.spyOn(quoteService, "get").mockResolvedValue(quote({ category: "moving" }));
    await act(async () => { render(); await settle(); });
    expect(await seededUnit()).toBe("one-time");
  });

  it("defaults warehouse to month, trailer/vanrental to day, cleaning to one-time, any to month", async () => {
    const cases: Array<[string, string]> = [
      ["warehouse", "/mo"], ["trailer", "/day"], ["vanrental", "/day"],
      ["cleaning", "one-time"], ["any", "/mo"], ["packing", "/mo"],
    ];
    for (const [category, expected] of cases) {
      vi.spyOn(quoteService, "get").mockResolvedValue(quote({ category }));
      await act(async () => { render(); await settle(); });
      expect(await seededUnit(), category).toBe(expected);
      await act(async () => { root.unmount(); });
      container.remove();
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
    }
  });

  it("never overrides a unit the provider already chose", async () => {
    vi.spyOn(quoteService, "get").mockResolvedValue(quote({ category: "moving" }, {
      alreadySubmitted: true,
      existing: { amount: 350, unit: "/wk", availability: null, note: null },
    }));
    await act(async () => { render(); await settle(); });
    expect(await seededUnit()).toBe("/wk");
  });

  it("renders one thumbnail per photo, addressed by index", async () => {
    vi.spyOn(quoteService, "get").mockResolvedValue(quote({ category: "moving", photoCount: 3 }));
    await act(async () => { render(); await settle(); });
    await waitFor("thumbs", () => thumbs().length || null);
    // Suffix, not the whole URL: the base comes from VITE_API_URL, which
    // differs between a dev machine and CI.
    expect(thumbs().map((i) => i.getAttribute("src")?.replace(/^.*(?=\/quote\/)/, ""))).toEqual([
      `/quote/${TOKEN}/photos/0`,
      `/quote/${TOKEN}/photos/1`,
      `/quote/${TOKEN}/photos/2`,
    ]);
    // No download affordance, no storage key anywhere in the markup.
    expect(container.innerHTML).not.toMatch(/download|lead-photos/i);
    expect(thumbs().every((i) => i.draggable === false)).toBe(true);
  });

  it("renders nothing when there are no photos", async () => {
    vi.spyOn(quoteService, "get").mockResolvedValue(quote({ category: "moving" }));
    await act(async () => { render(); await settle(); });
    await seededUnit();
    expect(thumbs().length).toBe(0);
    expect(container.textContent).not.toContain("quote.photos");
  });

  it("drops a photo that fails to load and says so", async () => {
    vi.spyOn(quoteService, "get").mockResolvedValue(quote({ category: "moving", photoCount: 2 }));
    await act(async () => { render(); await settle(); });
    await waitFor("thumbs", () => thumbs().length || null);
    await act(async () => { thumbs()[0].dispatchEvent(new Event("error")); await settle(); });
    expect(thumbs().length).toBe(1);
    expect(thumbs()[0].getAttribute("src")).toContain("/photos/1");
  });

  it("opens a larger view from a thumbnail with a labelled image", async () => {
    vi.spyOn(quoteService, "get").mockResolvedValue(quote({ category: "moving", photoCount: 2 }));
    await act(async () => { render(); await settle(); });
    await waitFor("thumbs", () => thumbs().length || null);
    const trigger = container.querySelector("ul button") as HTMLButtonElement;
    expect(trigger.getAttribute("aria-label")).toBeTruthy();
    await act(async () => { trigger.click(); await settle(); });
    const dialog = await waitFor("dialog", () => document.querySelector("[role='dialog']"));
    const big = dialog.querySelector("img") as HTMLImageElement;
    expect(big.getAttribute("src")).toContain("/photos/0");
    expect(big.getAttribute("alt")).toBeTruthy();
    expect(dialog.textContent).toContain("1 / 2");
  });
});
