import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import translations from "@/i18n/translations";

/**
 * The blind spot in translationCoverage.test.ts, closed.
 *
 * That test scans the source for STATIC `t("…")` literals, which is the right
 * default and catches most of what can go missing. The scoping chips are the
 * exception: RequestPage declares them as data (`SCOPE_QUESTIONS` +
 * `PACKING_ADDON`) and every renderer builds the keys with a template literal —
 * t(`request.scope.${q.id}.label`) and t(`request.scope.${q.id}.opt${n}`). A
 * scanner looking for quoted literals cannot see those, so ~45 keys could go
 * missing with typecheck clean, lint clean and every test green, and the funnel
 * would render the raw string `request.scope.trailerTow.opt1` on a chip.
 *
 * `t` returns the key when a translation is absent — there is no type error and
 * no runtime error to catch it — so the only place this can fail is here.
 *
 * The funnel's catalogue is read out of the SOURCE rather than imported because
 * `SCOPE_QUESTIONS` and `PACKING_ADDON` are module-private and the page is not
 * this test's to change. Reading the file also means a question added to the
 * funnel is picked up with no second list to update — forgetting the second
 * list is the same failure mode this guard exists to prevent. The one thing a
 * scan of RequestPage cannot see is a question RequestPage no longer declares
 * but a provider-facing page still renders; those are listed in
 * RETAINED_QUESTIONS below and unioned in.
 *
 * Mirrors the backend's EveryLanguage_HasALabelAndEveryOption_ForEveryQuestion
 * (Ruumly.Backend.Tests/LeadScopeTests.cs), which does the same for the
 * provider-facing wording of the same catalogue.
 */
const SRC = join(process.cwd(), "src");
const REQUEST_PAGE = join(SRC, "pages", "RequestPage.tsx");
const SCOPE_SECTIONS = join(SRC, "components", "RequestScopeSections.tsx");
const QUOTE_LEAD_SCOPE = join(SRC, "components", "QuoteLeadScope.tsx");
const LANGS = ["et", "en", "ru", "lv", "lt"] as const;

interface Question { id: string; options: number }

/**
 * Questions the funnel has stopped ASKING whose wording is still rendered.
 *
 * Not to be confused with a question's `retired: [n]` field, which names chip
 * positions a live question no longer OFFERS — those ids are still in
 * RequestPage, so the scan below sees them and the loop already covers every
 * option. These are whole questions RequestPage has dropped, which is exactly
 * why they have to be written down: the scan cannot see what is not there, so
 * to every gate in this repo their strings look unused, and a cleanup that
 * reasons "this id is not in the funnel any more" deletes them.
 *
 * `movingAccess` was one "floor and lift" question about the move as a whole.
 * The funnel now asks it at both ends (`movingAccessFrom` / `movingAccessTo`),
 * because a ground-floor pickup into a 5th-floor walk-up is not the same price
 * as the reverse and one combined answer states neither. Leads submitted before
 * that split still carry the old answer: the backend keeps the question in
 * Ruumly.Backend/Constants/ScopeQuestions.cs (`All`, marked "legacy"),
 * GET /api/quote/{token} still emits it, and QuoteLeadScope words it from these
 * same `request.scope.*` strings. Lose them and a provider quoting a legacy
 * move silently stops seeing the access answer — the single biggest price
 * driver in a move — with every other gate green.
 *
 * An id belongs here only while the funnel does NOT ask it. If one comes back
 * to RequestPage, delete it from this list; the scan then covers it.
 */
const RETAINED_QUESTIONS: Question[] = [{ id: "movingAccess", options: 5 }];

/**
 * Every `{ id: "…", options: n … }` literal in RequestPage — that is the exact
 * shape of both `SCOPE_QUESTIONS` (the required per-service questions) and
 * `PACKING_ADDON` (the optional moving add-on), so one pattern collects both.
 *
 * The entry does not end after `options` any more: a tick-all-that-apply
 * question carries `multi`, `retired` and `exclusive` after it, so the pattern
 * stops at the delimiter rather than at the closing brace. Anchoring on `}` here
 * would not fail — it would quietly stop checking the two questions most likely
 * to have copy missing.
 */
function funnelCatalogue(): Question[] {
  const text = readFileSync(REQUEST_PAGE, "utf8");
  const found = new Map<string, number>();
  for (const m of text.matchAll(/\{\s*id:\s*"([a-zA-Z0-9_]+)"\s*,\s*options:\s*(\d+)\s*[,}]/g)) {
    found.set(m[1], Number(m[2]));
  }
  return [...found].map(([id, options]) => ({ id, options }));
}

/**
 * What the five language blocks have to cover: what the funnel asks today plus
 * what it used to ask and a provider-facing page still renders. The funnel wins
 * a collision, so a stale hand-written option count can never override the live
 * shape — the test below fails on that disagreement instead of hiding it.
 */
function questionCatalogue(funnel: Question[]): Question[] {
  const merged = new Map(funnel.map((q) => [q.id, q.options] as const));
  for (const q of RETAINED_QUESTIONS) if (!merged.has(q.id)) merged.set(q.id, q.options);
  return [...merged].map(([id, options]) => ({ id, options }));
}

describe("scope question translation coverage", () => {
  const funnel = funnelCatalogue();
  const questions = questionCatalogue(funnel);

  it("reads the funnel's question catalogue (guards against the regex matching nothing)", () => {
    // Every service asks at least three, plus the packing add-on. A refactor
    // that changes the literal's shape must fail here rather than quietly
    // reduce this guard to checking nothing. Asserted on the SCAN, never on the
    // union, so a hand-written entry cannot prop these numbers up.
    expect(funnel.length).toBeGreaterThanOrEqual(15);
    expect(funnel.map((q) => q.id)).toContain("packingHelp");
    // The two tick-all-that-apply questions specifically: they are the ones
    // whose literal now has fields after `options`, so they are the ones a
    // brace-anchored pattern would drop.
    expect(funnel.map((q) => q.id)).toContain("movingHeavyItems");
    expect(funnel.map((q) => q.id)).toContain("cleaningExtras");
    for (const q of funnel) expect(q.options).toBeGreaterThan(0);
  });

  it("also covers the retired questions only the quote page renders", () => {
    // Dropping an entry from RETAINED_QUESTIONS fails here, which is the whole
    // point: the strings it protects are reachable from no id this repo scans.
    expect(RETAINED_QUESTIONS.map((q) => q.id)).toContain("movingAccess");
    const covered = new Map(questions.map((q) => [q.id, q.options] as const));
    for (const q of RETAINED_QUESTIONS) {
      expect(
        covered.get(q.id),
        `${q.id} must stay in the checked catalogue with ${q.options} options; if RequestPage ` +
          `asks it again, delete it from RETAINED_QUESTIONS rather than editing the count here`,
      ).toBe(q.options);
    }
  });

  it("every renderer still builds the keys as request.scope.{id}.label / .opt{n}", () => {
    // If the key shape is renamed, the loop below would keep passing against
    // keys nobody renders any more. Pin the shape the pages actually build —
    // including the provider-facing one, which is the only thing still
    // rendering the retained questions above.
    for (const file of [REQUEST_PAGE, SCOPE_SECTIONS, QUOTE_LEAD_SCOPE]) {
      const text = readFileSync(file, "utf8");
      expect(text, `${file} no longer builds request.scope.\${…}.label`)
        .toMatch(/request\.scope\.\$\{[^}]*\}\.label/);
      expect(text, `${file} no longer builds request.scope.\${…}.opt\${…}`)
        .toMatch(/request\.scope\.\$\{[^}]*\}\.opt\$\{/);
    }
  });

  for (const lang of LANGS) {
    // EVERY option, including the two the funnel has stopped OFFERING
    // (movingHeavyItems.opt5 "several of these" and cleaningExtras.opt5 "all
    // three"). A chip position is the identity of a stored answer, so leads
    // taken before those questions became tick-all-that-apply still carry a 5
    // and still get rendered on the provider's quote page. Deleting the copy
    // would not tidy anything up — it would blank the answer.
    it(`every question has a label and every option in "${lang}"`, () => {
      const block = translations[lang] as Record<string, string>;
      const missing: string[] = [];
      for (const q of questions) {
        const label = `request.scope.${q.id}.label`;
        if (!block[label]?.trim()) missing.push(`${label} — no ${lang} wording`);
        for (let n = 1; n <= q.options; n++) {
          const option = `request.scope.${q.id}.opt${n}`;
          if (!block[option]?.trim()) missing.push(`${option} — no ${lang} wording`);
        }
      }
      expect(missing, `missing ${lang} scope copy:\n  ${missing.join("\n  ")}`).toEqual([]);
    });
  }
});
