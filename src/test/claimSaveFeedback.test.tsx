import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createHead, UnheadProvider } from "@unhead/react/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ClaimPage from "@/pages/ClaimPage";
import { claimService, type ClaimEditableProfile } from "@/services";

/**
 * The claim page is where 754 cold-emailed providers land. Both behaviours
 * covered here are invisible in a desktop dev window and expensive in the
 * field: the save that looks like a no-op on a phone, and the verified session
 * thrown away by a backend blip.
 *
 * Rendered with createRoot rather than @testing-library/react: its
 * @testing-library/dom peer is not installed in this repo (see
 * dokobitSigning.test.tsx, which renders the same way).
 */

const SLUG = "acme-kolimine";

const editable: ClaimEditableProfile = {
  slug: SLUG,
  name: "Acme Kolimine OÜ",
  contactPhone: "+372 5555 1234",
  contactEmail: "info@acme.example",
  websiteUrl: null,
  address: null,
  city: "Tallinn",
  country: "EE",
  serviceTypes: ["moving"],
  description: null,
  priceFrom: null,
  priceUnit: null,
  priceNote: null,
};

const failure = (message: string, status?: number) => {
  const e = new Error(message) as Error & { status?: number };
  if (status !== undefined) e.status = status;
  return e;
};

/** Let pending promises settle and React flush the resulting render. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function waitFor<T>(what: string, read: () => T | null | undefined, attempts = 80): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    const value = read();
    if (value) return value;
    await settle();
  }
  throw new Error(`timed out waiting for ${what}`);
}

describe("claim page", () => {
  let container: HTMLDivElement;
  let root: Root;
  let scrollIntoView: ReturnType<typeof vi.fn>;

  const renderPage = () => {
    const queryClient = new QueryClient({
      // retry:false is the default for everything else on the page (the
      // platform-settings fetch); the claim queries carry their own policy,
      // which retryDelay:0 simply stops from sleeping through the test.
      defaultOptions: {
        queries: { retry: false, retryDelay: 0 },
        mutations: { retry: false },
      },
    });
    root.render(
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/en/claim/${SLUG}`]}>
            <LanguageProvider>
              <AuthProvider>
                <Routes>
                  <Route path="/:lang/claim/:slug" element={<ClaimPage />} />
                </Routes>
              </AuthProvider>
            </LanguageProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>,
    );
  };

  beforeEach(() => {
    // jsdom has no layout, so Element.scrollIntoView does not exist at all.
    scrollIntoView = vi.fn();
    (Element.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView = scrollIntoView;

    // Nothing here may reach the network: the platform-settings query and the
    // auth bootstrap both fail softly to their defaults.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    sessionStorage.setItem(
      `ruumly-claim:${SLUG}`,
      JSON.stringify({
        token: "session-token",
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      }),
    );

    vi.spyOn(claimService, "get").mockResolvedValue({
      slug: SLUG, name: editable.name, city: "Tallinn", country: "EE",
      serviceTypes: ["moving"], isClaimed: false,
    });
    vi.spyOn(claimService, "getProfile").mockResolvedValue(editable);
    vi.spyOn(claimService, "updateProfile").mockResolvedValue(editable);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /**
   * On a 390px screen the form is about a screen tall, so the confirmation and
   * the "create your account" offer render several hundred pixels above the
   * button that produced them. Errors render at the button, so the provider who
   * sees nothing happen is the one whose save WORKED — and the account offer is
   * what turns a claimed directory row into a returning provider.
   */
  it("brings the confirmation and the account offer into view after a save", async () => {
    renderPage();

    const form = await waitFor("the claim form", () => container.querySelector("form"));
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(scrollIntoView).not.toHaveBeenCalled();

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    const banner = await waitFor("the saved banner", () => container.querySelector('[role="status"]'));
    expect(claimService.updateProfile).toHaveBeenCalledTimes(1);

    // The success banner is what gets scrolled to; the account offer renders
    // immediately below it, so both land on screen together.
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.instances[0]).toBe(banner);
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "start" }));
  });

  /**
   * The backend redeploys several times a day and this read shares the "search"
   * rate limiter. Neither failure says anything about the session — and the
   * magic link that bought it is single-use, so discarding it means the
   * provider has to go and ask for a whole new email.
   */
  it.each([
    ["a backend restart", failure("Bad gateway", 502)],
    ["a rate limit", failure("Too many requests", 429)],
  ])("keeps the verified session through %s", async (_label, err) => {
    vi.spyOn(claimService, "getProfile").mockRejectedValue(err);
    renderPage();

    // The retry card: a button and, unlike the ask-for-a-link screen, no email
    // field — that screen asks for a credential they are still holding.
    await waitFor("the retry prompt", () =>
      container.querySelector("button") && !container.querySelector('input[type="email"]'));

    expect(sessionStorage.getItem(`ruumly-claim:${SLUG}`)).not.toBeNull();
  });

  // An anonymous 401 arrives with no status attached, only the message.
  it("drops the session when the server says it is finished", async () => {
    vi.spyOn(claimService, "getProfile").mockRejectedValue(new Error("Unauthorized"));
    renderPage();

    // The stored credential goes first, then the page settles on asking for a
    // fresh link. Waiting on the render alone would catch the frame in between.
    await waitFor("the session to be dropped", () => sessionStorage.getItem(`ruumly-claim:${SLUG}`) === null);
    await waitFor("the ask-for-a-link form", () => container.querySelector('input[type="email"]'));
  });
});
