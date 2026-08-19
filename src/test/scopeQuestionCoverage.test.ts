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
 * `PACKING_ADDON`) and both renderers build the keys with a template literal —
 * t(`request.scope.${q.id}.label`) and t(`request.scope.${q.id}.opt${n}`). A
 * scanner looking for quoted literals cannot see those, so ~45 keys could go
 * missing with typecheck clean, lint clean and every test green, and the funnel
 * would render the raw string `request.scope.trailerTow.opt1` on a chip.
 *
 * `t` returns the key when a translation is absent — there is no type error and
 * no runtime error to catch it — so the only place this can fail is here.
 *
 * The catalogue is read out of the SOURCE rather than imported because
 * `SCOPE_QUESTIONS` and `PACKING_ADDON` are module-private and the page is not
 * this test's to change. Reading the file also means a question added to the
 * funnel is picked up with no second list to update — forgetting the second
 * list is the same failure mode this guard exists to prevent.
 *
 * Mirrors the backend's EveryLanguage_HasALabelAndEveryOption_ForEveryQuestion
 * (Ruumly.Backend.Tests/LeadScopeTests.cs), which does the same for the
 * provider-facing wording of the same catalogue.
 */
const SRC = join(process.cwd(), "src");
const REQUEST_PAGE = join(SRC, "pages", "RequestPage.tsx");
const SCOPE_SECTIONS = join(SRC, "components", "RequestScopeSections.tsx");
const LANGS = ["et", "en", "ru", "lv", "lt"] as const;

interface Question { id: string; options: number }

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
function questionCatalogue(): Question[] {
  const text = readFileSync(REQUEST_PAGE, "utf8");
  const found = new Map<string, number>();
  for (const m of text.matchAll(/\{\s*id:\s*"([a-zA-Z0-9_]+)"\s*,\s*options:\s*(\d+)\s*[,}]/g)) {
    found.set(m[1], Number(m[2]));
  }
  return [...found].map(([id, options]) => ({ id, options }));
}

describe("scope question translation coverage", () => {
  const questions = questionCatalogue();

  it("reads the funnel's question catalogue (guards against the regex matching nothing)", () => {
    // Every service asks at least three, plus the packing add-on. A refactor
    // that changes the literal's shape must fail here rather than quietly
    // reduce this guard to checking nothing.
    expect(questions.length).toBeGreaterThanOrEqual(15);
    expect(questions.map((q) => q.id)).toContain("packingHelp");
    // The two tick-all-that-apply questions specifically: they are the ones
    // whose literal now has fields after `options`, so they are the ones a
    // brace-anchored pattern would drop.
    expect(questions.map((q) => q.id)).toContain("movingHeavyItems");
    expect(questions.map((q) => q.id)).toContain("cleaningExtras");
    for (const q of questions) expect(q.options).toBeGreaterThan(0);
  });

  it("both renderers still build the keys as request.scope.{id}.label / .opt{n}", () => {
    // If the key shape is renamed, the loop below would keep passing against
    // keys nobody renders any more. Pin the shape the pages actually build.
    for (const file of [REQUEST_PAGE, SCOPE_SECTIONS]) {
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
