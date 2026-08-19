import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createHead, UnheadProvider } from "@unhead/react/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import translations, { type Language } from "@/i18n/translations";
import OfferPage from "@/pages/OfferPage";
import { offerService, type PublicOffer, type PublicOfferOption } from "@/services";

/**
 * The public offer page — the last screen before revenue.
 *
 * The assertions are about what a PERSON can see and what happens when they
 * press the one button on the page, not about props. Two things are being
 * pinned down here:
 *
 *  1. Choosing an option is a stated preference. POST /choose flips the offer
 *     to Chosen and emails the ops inbox; the lead does not move, the provider
 *     is not contacted, no payment happens and an admin has to confirm by hand
 *     afterwards. If this page ever tells the customer their job is booked, it
 *     is lying to them at exactly the moment they stop chasing it.
 *  2. Two or three prices only compare if they are on the same footing. The
 *     unit column is free text written by five different provider languages
 *     and by an admin's keyboard, so the page has to normalise what it can and
 *     admit what it cannot.
 *
 * Copy that has NOT landed yet renders as its raw key, so assertions on new
 * strings go through structure (data-testid) or through the translation table
 * itself — never through a hardcoded English sentence.
 */
const TOKEN = "offer-tok-abc123";

// The confirm dialog is a Radix portal with presence animations, which React
// otherwise reports as un-acted state updates on every open/close.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const option = (over: Partial<PublicOfferOption> = {}): PublicOfferOption => ({
  id: "opt-1",
  title: "Miniladu 10 m² kesklinnas",
  priceAmount: 89,
  priceUnit: "€/kuu",
  notes: "24/7 ligipääs",
  supplierName: "Acme Storage",
  ...over,
});

const offer = (over: Partial<PublicOffer> = {}): PublicOffer => ({
  status: "sent",
  language: "et",
  customerNote: "Mõlemad partnerid saavad su soovitud ajal.",
  sentAt: "2026-08-10T09:00:00Z",
  chosenOptionId: null,
  lead: {
    category: "warehouse",
    city: "Tallinn",
    toCity: null,
    needDate: "2026-09-01T00:00:00Z",
    details: "u 20 m2 mööblit",
  },
  options: [option(), option({ id: "opt-2", title: "Laopind 20 m² Lasnamäel", priceAmount: 129, supplierName: null })],
  ...over,
});

const settle = () => new Promise((r) => setTimeout(r, 0));

/**
 * Every string the page must NEVER show, in every language: the retired copy
 * that framed the customer's pick as a done deal — "Choice confirmed!", "We'll
 * confirm with the provider and get back to you shortly", "Choose this
 * option", "Yes, choose it". They still sit in translations.ts as dead keys
 * that nothing renders, one careless `t()` away from shipping again.
 *
 * `offer.chosenBadge` is deliberately NOT in this list even though it is just
 * as dead: its Estonian text ("Sinu valik") is a prefix of the page's own
 * heading ("Sinu valikud: …"), so a substring check on it tests nothing.
 */
const OVERCLAIM_KEYS = [
  "offer.successTitle", "offer.successBody", "offer.choose", "offer.confirmCta",
] as const;

describe("public concierge offer page", () => {
  let container: HTMLDivElement;
  let root: Root;

  const render = (lang: Language = "en") => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 0 }, mutations: { retry: false } },
    });
    root.render(
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/${lang}/offer/${TOKEN}`]}>
            <LanguageProvider>
              <AuthProvider>
                <Routes>
                  <Route path="/:lang/offer/:token" element={<OfferPage />} />
                </Routes>
              </AuthProvider>
            </LanguageProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </UnheadProvider>,
    );
  };

  const show = async (value: PublicOffer, lang: Language = "en") => {
    vi.spyOn(offerService, "get").mockResolvedValue(value);
    await act(async () => { render(lang); await settle(); });
    await act(async () => { await settle(); });
  };

  const text = () => container.textContent ?? "";
  const buttons = () => Array.from(container.querySelectorAll("button"));
  const requestButtons = () =>
    Array.from(container.querySelectorAll<HTMLButtonElement>("article button"));
  const click = async (el: Element) => {
    await act(async () => {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await settle();
    });
    await act(async () => { await settle(); });
  };
  /** The alert dialog is portalled to document.body, not into `container`. */
  const dialog = () => document.querySelector("[role=alertdialog]");

  beforeEach(() => {
    // Nothing here may reach the network on its own; usePlatformSettings falls
    // back cleanly when it cannot.
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

  // ── The line that must never move ───────────────────────────────────────────

  it("never tells the customer the job is booked — before, during or after the choice", async () => {
    for (const lang of ["et", "en", "ru", "lv", "lt"] as const) {
      const banned = OVERCLAIM_KEYS.map((k) => translations[lang][k]).filter(Boolean);

      // Before: options on screen, nothing chosen.
      await show(offer(), lang);
      banned.forEach((phrase) => expect(text(), `${lang} / pre-choice`).not.toContain(phrase));

      // After: the customer has requested an option.
      await act(async () => { root.unmount(); });
      container.remove();
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);

      await show(offer({ status: "chosen", chosenOptionId: "opt-1" }), lang);
      banned.forEach((phrase) => expect(text(), `${lang} / post-choice`).not.toContain(phrase));
      // …and the approved pending-request wording IS what shows instead.
      expect(text(), `${lang} / post-choice`).toContain(translations[lang]["offer.requestSent"]);
      expect(text(), `${lang} / post-choice`).toContain(translations[lang]["offer.requestSentBody"]);

      await act(async () => { root.unmount(); });
      container.remove();
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
    }
  });

  it("spells out that requesting is not a booking BEFORE the decision, not only in the dialog", async () => {
    await show(offer());
    // The confirm dialog carries the approved sentence; the page must carry its
    // own note too, since the dialog only opens after the customer has decided.
    // Until the orchestrator lands the copy, `t` renders the raw key — which is
    // exactly what is on screen, so assert on whichever of the two it is.
    const note = translations.en["offer.noBookingNote"] ?? "offer.noBookingNote";
    expect(text()).toContain(note);

    await click(requestButtons()[0]);
    expect(dialog()?.textContent ?? "").toContain(translations.en["offer.requestConfirmBody"]);
  });

  it("does not submit the choice until the customer confirms in the dialog", async () => {
    const choose = vi.spyOn(offerService, "choose");
    await show(offer());

    await click(requestButtons()[0]);
    // Dialog open, nothing sent — pressing a card must not be an instant commit.
    expect(dialog()).not.toBeNull();
    expect(choose).not.toHaveBeenCalled();

    const cancel = Array.from(document.querySelectorAll<HTMLButtonElement>("[role=alertdialog] button"))
      .find((b) => b.textContent === translations.en["offer.confirmCancel"]);
    await click(cancel!);
    expect(choose).not.toHaveBeenCalled();
  });

  it("sends the chosen option id and lands on the pending-request state", async () => {
    const choose = vi.spyOn(offerService, "choose")
      .mockResolvedValue({ ok: true, chosenOptionId: "opt-2", chosenAt: "2026-08-19T10:00:00Z" });
    await show(offer());

    await click(requestButtons()[1]);
    const confirm = Array.from(document.querySelectorAll<HTMLButtonElement>("[role=alertdialog] button"))
      .find((b) => b.textContent === translations.en["offer.requestConfirmAction"]);
    await click(confirm!);

    expect(choose).toHaveBeenCalledWith(TOKEN, "opt-2");
    expect(container.querySelector("[data-testid=offer-requested-banner]")).not.toBeNull();
    // No request buttons survive a settled offer.
    expect(requestButtons()).toHaveLength(0);
  });

  it("moves focus to the confirmation so the answer is not announced off-screen", async () => {
    vi.spyOn(offerService, "choose")
      .mockResolvedValue({ ok: true, chosenOptionId: "opt-1", chosenAt: "2026-08-19T10:00:00Z" });
    await show(offer());

    await click(requestButtons()[0]);
    const confirm = Array.from(document.querySelectorAll<HTMLButtonElement>("[role=alertdialog] button"))
      .find((b) => b.textContent === translations.en["offer.requestConfirmAction"]);
    await click(confirm!);

    const banner = container.querySelector("[data-testid=offer-requested-banner]");
    expect(banner).not.toBeNull();
    expect(document.activeElement).toBe(banner);
  });

  it("does not steal focus when an already-requested offer is re-opened", async () => {
    await show(offer({ status: "chosen", chosenOptionId: "opt-1" }));
    expect(container.querySelector("[data-testid=offer-requested-banner]")).not.toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  // ── One page, one language ──────────────────────────────────────────────────

  it("renders our own words in the reader's language, not half in the offer's", async () => {
    // Reachable in production: RequestStatusPage's "View your offers" link is
    // built in the language the customer is BROWSING in, so a Russian reader
    // can land on an offer composed in Estonian.
    await show(offer({ language: "et" }), "ru");
    const label = requestButtons()[0]?.textContent ?? "";
    expect(label).toContain(translations.ru["offer.requestThis"]);
    expect(label).not.toContain(translations.et["offer.requestThis"]);
    expect(text()).toContain(translations.ru["offer.subtitle"]);
    expect(text()).not.toContain(translations.et["offer.subtitle"]);
  });

  // ── Comparing two or three prices ───────────────────────────────────────────

  it("prints one unit vocabulary even when providers quoted in different languages", async () => {
    // The quote form stores the LOCALIZED literal, so the same monthly rate
    // arrives as "/kuu" from an Estonian provider and "/mo" from an English one.
    await show(offer({
      options: [
        option({ id: "a", priceAmount: 89, priceUnit: "€/kuu" }),
        option({ id: "b", priceAmount: 129, priceUnit: "/mo" }),
      ],
    }), "en");

    const prices = Array.from(container.querySelectorAll("[data-testid=offer-price]"))
      .map((n) => n.textContent ?? "");
    expect(prices).toEqual([`€89 / mo`, `€129 / mo`]);
    // Same footing → no warning, and the cheaper one is marked.
    expect(container.querySelector("[data-testid=offer-mixed-terms]")).toBeNull();
    expect(container.querySelectorAll("[data-testid=offer-lowest]")).toHaveLength(1);
  });

  it("warns instead of implying parity when the options are priced on different terms", async () => {
    // €50/day vs €60/month is not a €10 difference.
    await show(offer({
      options: [
        option({ id: "a", priceAmount: 50, priceUnit: "/päev" }),
        option({ id: "b", priceAmount: 60, priceUnit: "/kuu" }),
      ],
    }), "en");

    expect(container.querySelector("[data-testid=offer-mixed-terms]")).not.toBeNull();
    // No "lowest price" marker on numbers that cannot be ranked.
    expect(container.querySelectorAll("[data-testid=offer-lowest]")).toHaveLength(0);
  });

  it("passes an unrecognised unit through instead of inventing a billing period", async () => {
    await show(offer({
      options: [option({ id: "a", priceAmount: 40, priceUnit: "per m³" })],
    }), "en");
    expect(container.querySelector("[data-testid=offer-price]")?.textContent).toBe("€40 / per m³");
  });

  it("says an option has no price yet rather than showing a card with none", async () => {
    // Most requests never get a provider quote, and the admin editor allows an
    // option with no price — a silent card reads as "free".
    await show(offer({
      options: [option({ id: "a", priceAmount: 89 }), option({ id: "b", priceAmount: null, priceUnit: null })],
    }), "en");

    expect(container.querySelectorAll("[data-testid=offer-price]")).toHaveLength(1);
    expect(container.querySelectorAll("[data-testid=offer-price-tbc]")).toHaveLength(1);
    // One priced option is not a comparison.
    expect(container.querySelectorAll("[data-testid=offer-lowest]")).toHaveLength(0);
  });

  // ── Reading it back, asking about it, and not leaking the token ─────────────

  it("reads the request back so the customer can check the options answer it", async () => {
    await show(offer({
      lead: { category: "moving", city: "Tallinn", toCity: "Tartu", needDate: "2026-09-01T00:00:00Z", details: "Piano, third floor, no lift" },
    }));
    expect(text()).toContain("Tallinn");
    expect(text()).toContain("Tartu");
    expect(text()).toContain("Piano, third floor, no lift");
  });

  it("renders no date chip at all for an unparseable need date", async () => {
    await show(offer({
      lead: { category: "warehouse", city: "Tallinn", toCity: null, needDate: "soon", details: null },
    }));
    expect(text()).not.toContain("Invalid Date");
  });

  it("offers a way to ask a question, and never puts the offer token in it", async () => {
    await show(offer());
    const mailtos = Array.from(container.querySelectorAll<HTMLAnchorElement>("a[href^='mailto:']"))
      .map((a) => a.getAttribute("href") ?? "");
    expect(mailtos.length).toBeGreaterThan(0);
    // The token is a bearer credential — anyone holding it can choose on this
    // customer's behalf. It must not travel into mail archives.
    Array.from(container.querySelectorAll("a")).forEach((a) => {
      expect(a.getAttribute("href") ?? "").not.toContain(TOKEN);
    });
  });

  // ── Accessibility of the one control on the page ────────────────────────────

  it("gives every request button an accessible name that says WHICH option", async () => {
    await show(offer());
    const names = requestButtons().map((b) => b.getAttribute("aria-label") ?? "");
    expect(names).toHaveLength(2);
    expect(names[0]).toContain("Miniladu 10 m² kesklinnas");
    expect(names[1]).toContain("Laopind 20 m² Lasnamäel");
    expect(new Set(names).size).toBe(2);
  });

  it("keeps the options readable after a choice instead of fading them out", async () => {
    // The unchosen cards used to be dimmed to 60% opacity, which drops muted
    // body text below the 4.5:1 contrast floor.
    await show(offer({ status: "chosen", chosenOptionId: "opt-1" }));
    const faded = Array.from(container.querySelectorAll("article"))
      .filter((a) => /\bopacity-(?!100)\d+\b/.test(a.className));
    expect(faded).toHaveLength(0);
  });

  // ── The states that already worked, kept working ────────────────────────────

  it("shows a skeleton before the first answer arrives", async () => {
    vi.spyOn(offerService, "get").mockReturnValue(new Promise<PublicOffer>(() => {}));
    await act(async () => { render(); await settle(); });
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("treats a 404 as the dead-end and offers a fresh request", async () => {
    vi.spyOn(offerService, "get")
      .mockRejectedValue(Object.assign(new Error("API error: 404"), { status: 404 }));
    await act(async () => { render(); await settle(); });
    await act(async () => { await settle(); });
    expect(Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href")))
      .toContain("/en/request");
  });

  it("treats a 500 as retryable rather than as a dead link", async () => {
    vi.spyOn(offerService, "get")
      .mockRejectedValue(Object.assign(new Error("API error: 500"), { status: 500 }));
    await act(async () => { render(); await settle(); });
    // A 5xx on a token that might be VALID is retried twice before the page
    // gives up, so this state only appears after those attempts drain.
    for (let i = 0; i < 6; i++) await act(async () => { await settle(); });
    expect(text()).toContain(translations.en["offer.errorTitle"]);
    expect(text()).not.toContain(translations.en["offer.invalidTitle"]);
    expect(buttons().some((b) => (b.textContent ?? "").includes(translations.en["offer.retry"]))).toBe(true);
  });

  it("does not white-screen when the API omits the lead", async () => {
    // PublicOfferDto emits null for `lead` when the navigation property is
    // missing; the generated type claims it never is.
    await show(offer({ lead: null as unknown as PublicOffer["lead"] }));
    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.querySelectorAll("article")).toHaveLength(2);
  });
});
