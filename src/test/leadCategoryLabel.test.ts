import { describe, expect, it } from "vitest";
import { leadCategoryLabel } from "@/lib/serviceTypes";
import translations from "@/i18n/translations";

// A lead's category is not a directory tag: when a concierge request names
// several services the backend cannot fit them in its single Category column and
// sends the wildcard "any". serviceTypeLabel echoes unknown slugs, so the offer
// page — the one page a customer opens expecting to feel looked after — greeted
// them with "Your options for any in Tallinn".
describe("leadCategoryLabel", () => {
  const t = (key: string) => `t:${key}`;

  it("uses the caller's wildcard copy instead of echoing the raw slug", () => {
    expect(leadCategoryLabel(t, "any", "Several services")).toBe("Several services");
    expect(leadCategoryLabel(t, "ANY", "Several services")).toBe("Several services");
  });

  it("still labels a real service normally", () => {
    expect(leadCategoryLabel(t, "moving", "Several services")).toBe("t:serviceType.moving");
    // Retired-but-still-stored slugs must keep rendering a name, not a slug.
    expect(leadCategoryLabel(t, "packing", "Several services")).toBe("t:serviceType.packing");
  });

  it("falls back to the wildcard copy when the category is missing", () => {
    // Older leads and defensive API shapes: better a truthful "several services"
    // than "undefined" in the customer's headline.
    expect(leadCategoryLabel(t, null, "Several services")).toBe("Several services");
    expect(leadCategoryLabel(t, undefined, "Several services")).toBe("Several services");
    expect(leadCategoryLabel(t, "", "Several services")).toBe("Several services");
  });

  it("has customer-facing wildcard copy in every language", () => {
    for (const lang of ["et", "en", "ru", "lv", "lt"] as const) {
      const copy = translations[lang]["offer.categoryAny"];
      expect(copy, `offer.categoryAny missing for ${lang}`).toBeTruthy();
      expect(copy.toLowerCase()).not.toBe("any");
    }
  });
});
