import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import translations from "@/i18n/translations";

/**
 * Every t("…") literal in the source must exist in all five language blocks.
 *
 * This test exists because the absence of it shipped a bug to production on
 * 2026-08-18. `t` is typed `(key: string) => string` and falls back to
 * RETURNING THE KEY, so a missing translation is not a type error, not a lint
 * error, and not a test failure — it is a provider seeing the literal string
 * `quote.needInfo.cta` on the page we ask them to quote from.
 *
 * That is exactly what happened: 23 keys were lost when a concurrent editor
 * restored a stale copy of translations.ts, typecheck stayed clean, 166 tests
 * stayed green, and the raw keys went live. The only reason it was caught was
 * grepping the deployed bundle by hand afterwards.
 *
 * Deliberately a source scan rather than a curated list: a curated list is one
 * more thing to forget to update, and forgetting is the whole failure mode.
 * Only static single-quoted/double-quoted literals are checked — a computed key
 * like t(`request.scope.${id}.label`) cannot be resolved here, and pretending
 * otherwise would produce false failures rather than coverage.
 */
// vitest roots cwd at the project directory; import.meta.url needs Windows
// drive-letter unmangling and is not worth the trouble.
const SRC = join(process.cwd(), "src");
const LANGS = ["et", "en", "ru", "lv", "lt"] as const;

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "node_modules") sourceFiles(full, found);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) && entry !== "translations.ts") {
      found.push(full);
    }
  }
  return found;
}

describe("translation coverage", () => {
  const used = new Set<string>();
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, "utf8");
    // t("a.b.c") / t('a.b.c') — static literals only, no template strings.
    for (const m of text.matchAll(/\bt\(\s*["']([a-zA-Z0-9_.]+)["']\s*[),]/g)) used.add(m[1]);
  }

  it("finds keys to check at all (guards against the regex silently matching nothing)", () => {
    expect(used.size).toBeGreaterThan(200);
  });

  for (const lang of LANGS) {
    it(`every key used in source exists in "${lang}"`, () => {
      const block = translations[lang] as Record<string, string>;
      const missing = [...used].filter((k) => !(k in block)).sort();
      expect(missing, `missing in ${lang}:\n  ${missing.join("\n  ")}`).toEqual([]);
    });
  }

  it("all five blocks carry identical key sets", () => {
    const base = Object.keys(translations.et).sort();
    for (const lang of LANGS.filter((l) => l !== "et")) {
      const other = Object.keys(translations[lang] as Record<string, string>).sort();
      const onlyInEt = base.filter((k) => !other.includes(k));
      const onlyInOther = other.filter((k) => !base.includes(k));
      expect({ lang, onlyInEt, onlyInOther }).toEqual({ lang, onlyInEt: [], onlyInOther: [] });
    }
  });
});
