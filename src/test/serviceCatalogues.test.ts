import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SERVICE_TYPE_SLUGS,
  RETIRED_SERVICE_TYPE_SLUGS,
  BROWSABLE_NOT_SOLD_SLUGS,
  BROWSABLE_SERVICE_TYPE_SLUGS,
  SELLABLE_SERVICE_TYPE_SLUGS,
  RETIRED_SLUG_HUB_ROUTE,
  RETIRED_SEARCH_TYPE,
  browsableServiceSlugs,
  sellableServiceSlugs,
} from "@/lib/serviceTypes";

/**
 * The frontend half of the three-state truth table. Mirrors the backend's
 * ServiceCategoriesTests — the two must not drift, because the backend decides
 * what a supplier may be tagged with and the frontend decides what a visitor is
 * shown, and a mismatch is invisible until a whole vertical quietly disappears.
 */
describe("service catalogues", () => {
  it("sellable is a subset of browsable, which is a subset of everything", () => {
    for (const s of SELLABLE_SERVICE_TYPE_SLUGS) {
      expect(BROWSABLE_SERVICE_TYPE_SLUGS).toContain(s);
    }
    for (const s of BROWSABLE_SERVICE_TYPE_SLUGS) {
      expect(SERVICE_TYPE_SLUGS).toContain(s);
    }
  });

  it("retired slugs are in neither catalogue", () => {
    for (const s of RETIRED_SERVICE_TYPE_SLUGS) {
      expect(BROWSABLE_SERVICE_TYPE_SLUGS).not.toContain(s);
      expect(SELLABLE_SERVICE_TYPE_SLUGS).not.toContain(s);
    }
  });

  it("a browsable-not-sold slug stays browsable and stops being sellable", () => {
    // Empty today; the assertion is the contract for whatever moves in.
    for (const s of BROWSABLE_NOT_SOLD_SLUGS) {
      expect(BROWSABLE_SERVICE_TYPE_SLUGS).toContain(s);
      expect(SELLABLE_SERVICE_TYPE_SLUGS).not.toContain(s);
    }
  });

  it("browse and sell agree until something is de-sold", () => {
    // When this fails, a slug left the sales catalogue — which is expected, and
    // is the prompt to check every caller for which surface it really is.
    expect([...SELLABLE_SERVICE_TYPE_SLUGS]).toEqual([...BROWSABLE_SERVICE_TYPE_SLUGS]);
    expect(BROWSABLE_NOT_SOLD_SLUGS).toHaveLength(0);
  });

  it("the flag-gated helpers still agree, and still honour the flags", () => {
    expect(sellableServiceSlugs(true, true)).toEqual(browsableServiceSlugs(true, true));
    expect(browsableServiceSlugs(false, true)).not.toContain("moving");
    expect(browsableServiceSlugs(true, false)).not.toContain("trailer");
    expect(browsableServiceSlugs(true, true)).toContain("trailer");
  });
});

/**
 * Irreversibility tripwire. Each of these is one edit away, and each surrenders
 * search positions that take an unpredictable re-crawl to win back. A slug that
 * stops being SOLD must not be treated as a slug that was RETIRED.
 */
describe("a not-sold slug is not a retired slug", () => {
  it("has no retired-hub redirect", () => {
    for (const s of BROWSABLE_NOT_SOLD_SLUGS) {
      expect(Object.keys(RETIRED_SLUG_HUB_ROUTE)).not.toContain(s);
      expect(Object.keys(RETIRED_SEARCH_TYPE)).not.toContain(s);
      expect(RETIRED_SERVICE_TYPE_SLUGS).not.toContain(s);
    }
  });

  it("has no 301 in vercel.json", () => {
    // The single most irreversible artifact in the repo: a permanent redirect
    // tells Google the destination replaced the source, for good.
    const vercel = JSON.parse(
      readFileSync(resolve(__dirname, "../../vercel.json"), "utf8"),
    ) as { redirects?: { source: string; permanent?: boolean }[] };

    for (const s of BROWSABLE_NOT_SOLD_SLUGS) {
      const hit = (vercel.redirects ?? []).find((r) => r.source.includes(`/${s}/`));
      expect(hit, `vercel.json 301s /${s}/ — that de-indexes a directory we keep`)
        .toBeUndefined();
    }
  });
});
