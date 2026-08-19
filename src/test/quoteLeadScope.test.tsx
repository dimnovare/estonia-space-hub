import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { QuoteLeadScope } from "@/components/QuoteLeadScope";
import type { PublicQuote } from "@/services";

/**
 * The provider-facing scope block, which has two jobs that can each fail
 * silently.
 *
 * It must never print a translation KEY at a provider — `t` returns the key it
 * was handed when a string is missing, which is how the literal text
 * `quote.needInfo.cta` once reached production — so an unknown question or an
 * option outside the chip range has to disappear, not render.
 *
 * And it must not drop the customer's own words while stripping the duplicate
 * answer summary off the front of `details`. That sentence is often the reason
 * a job is quotable at all, so the stripping is only allowed to fire on the
 * exact shape the funnel writes.
 */

/** `scope` is not on the wire type yet (the service layer lands it separately),
 *  and half these cases are deliberately malformed anyway. */
const lead = (over: Record<string, unknown> = {}) =>
  ({ category: "moving", city: "Tallinn", ...over }) as unknown as PublicQuote["lead"];

describe("quote lead scope", () => {
  let container: HTMLDivElement;
  let root: Root;

  const render = async (props: { lead: PublicQuote["lead"] }) => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/en/quote/tok123"]}>
          <LanguageProvider>
            <QuoteLeadScope {...props} />
          </LanguageProvider>
        </MemoryRouter>,
      );
    });
  };

  const text = () => container.textContent ?? "";

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  it("words the answers in the provider's language, not the customer's", async () => {
    await render({
      lead: lead({
        scope: [
          { question: "movingSize", option: 3 },
          { question: "movingAccessFrom", option: 4 },
        ],
      }),
    });
    // Whatever language the request was filled in, the page renders English on
    // an /en/ URL because the wording is ours and the wire carries positions.
    expect(text()).toContain("What size is the home?");
    expect(text()).toContain("Floors and lift at the pickup address?");
    expect(text()).toContain("4th floor or higher, no lift");
    expect(container.querySelectorAll("dt").length).toBe(2);
  });

  it("still words the retired movingAccess question, which legacy leads carry", async () => {
    // The funnel split this into From/To, but leads submitted before the split
    // still send it and access is the biggest price driver a mover has.
    await render({ lead: lead({ scope: [{ question: "movingAccess", option: 3 }] }) });
    expect(text()).toContain("2nd–3rd floor, no lift");
  });

  it("skips anything it cannot put into words instead of printing the key", async () => {
    await render({
      lead: lead({
        scope: [
          { question: "movingSize", option: 2 },
          { question: "somethingAddedLater", option: 1 },   // unknown question
          { question: "movingSize", option: 99 },           // outside the chips
          { question: "movingSize", option: 1.5 },          // not a chip position
          { question: "", option: 1 },
          { question: "movingSize" },                       // no option at all
          null,
          "movingSize",
        ],
      }),
    });
    expect(text()).not.toContain("request.scope");
    expect(container.querySelectorAll("dt").length).toBe(1);
  });

  it("renders nothing at all when the lead carries neither answers nor details", async () => {
    await render({ lead: lead({ scope: [] }) });
    expect(container.innerHTML).toBe("");
  });

  it("survives a scope that is not a list", async () => {
    await render({ lead: lead({ scope: { movingSize: 2 } }) });
    expect(container.innerHTML).toBe("");
  });

  it("drops the duplicated summary from details and keeps the customer's words", async () => {
    await render({
      lead: lead({
        scope: [
          { question: "movingSize", option: 3 },
          { question: "movingHeavyItems", option: 2 },
        ],
        // Exactly what RequestPage composes: one line per answer, in the
        // customer's language, a blank line, then whatever they typed.
        details: "Какого размера жильё? 2-комнатная квартира\nЕсть что-то тяжёлое? Пианино\n\nЕсть ещё аквариум 200 л",
      }),
    });
    expect(text()).toContain("Есть ещё аквариум 200 л");
    expect(text()).not.toContain("2-комнатная квартира");
    // …and the same facts are there, in the reader's language.
    expect(text()).toContain("A piano");
  });

  it("keeps details whole when the head is not the summary we would have written", async () => {
    // Two answers but a three-line head: something other than the funnel wrote
    // this field, so none of it may be assumed to be a duplicate.
    const details = "Line one\nLine two\nLine three\n\nAnd the rest";
    await render({
      lead: lead({
        scope: [
          { question: "movingSize", option: 3 },
          { question: "movingHeavyItems", option: 2 },
        ],
        details,
      }),
    });
    expect(text()).toContain("Line one");
    expect(text()).toContain("And the rest");
  });

  it("keeps details whole when one answer could not be worded", async () => {
    // The unworded line in `details` is the last place that fact exists, so
    // nothing may be stripped — duplication is the cheaper mistake.
    await render({
      lead: lead({
        scope: [
          { question: "movingSize", option: 3 },
          { question: "aQuestionRetiredSinceThisLeadWasTaken", option: 2 },
        ],
        details: "Kui suur on kodu? 3-toaline korter\nMingi vana küsimus? Mingi vana vastus\n\nKlaver on ka",
      }),
    });
    expect(text()).toContain("Mingi vana vastus");
    expect(text()).toContain("Klaver on ka");
  });

  it("keeps details whole when there are no answers to have duplicated", async () => {
    await render({ lead: lead({ details: "Kolime 1. septembril\n\nKorter on 4. korrusel" }) });
    expect(text()).toContain("Kolime 1. septembril");
    expect(text()).toContain("Korter on 4. korrusel");
  });

  it("shows no empty own-words block when the customer typed nothing beyond the chips", async () => {
    await render({
      lead: lead({
        scope: [{ question: "movingSize", option: 3 }],
        details: "Kui suur on kodu? 3-toaline korter",
      }),
    });
    expect(text()).toContain("2-bedroom");
    expect(text()).not.toContain("3-toaline korter");
    expect(container.querySelectorAll("p").length).toBe(1); // just the block title
  });
});
